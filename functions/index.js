// v294 : synchronisation Odoo → page Achats / Appro du Cockpit BU ORC (Cloud Functions Firebase, 2e génération).
// Lit les commandes d'achat dans Odoo (lecture seule) et écrit les PO dans planning/achats (production) et planning/beta_achats (bêta).
// La clé API est dans Secret Manager (secret ODOO_API_KEY) : jamais dans Firestore, dans la page ni dans le dépôt.
// Mode d'emploi : functions/LISEZMOI.md. Contrat des données : en tête de src/components/Achats.js.
"use strict";

const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { readPurchases, clean } = require("./odoo");
const { buildPo, plan } = require("./convert");

// Région : doit correspondre à l'emplacement de la base Firestore (eur3 → europe-west1). À changer ici si le déploiement le demande.
const REGION = "europe-west1";
const DOCS = ["achats", "beta_achats"];
const ODOO_KEY = defineSecret("ODOO_API_KEY");
const AUTHOR = "Synchronisation Odoo";
const LOCK_MS = 10 * 60 * 1000;      // une synchro « en cours » depuis moins de 10 min bloque la suivante
const MAX_DOC = 900 * 1024;          // Firestore : 1 Mio par document

setGlobalOptions({ region: REGION, maxInstances: 1, memory: "256MiB", timeoutSeconds: 300 });
initializeApp();
const db = getFirestore();

async function syncDoc(docId, why) {
  const ref = db.collection("planning").doc(docId), debut = new Date().toISOString();
  // verrou : pas deux synchronisations en même temps sur le même document
  const go = await db.runTransaction(async tx => {
    const s = await tx.get(ref); if (!s.exists) return null;
    const cur = (s.data() || {}).odooSync || {};
    if (cur.etat === "en_cours" && cur.debut && Date.now() - Date.parse(cur.debut) < LOCK_MS) return null;
    tx.update(ref, { odooSync: { ...cur, etat: "en_cours", debut, cle: !!ODOO_KEY.value() } });
    return s.data();
  });
  if (!go) { logger.info("Synchro ignorée (document absent ou déjà en cours)", { docId, why }); return; }
  const key = ODOO_KEY.value();
  const fin = (etat, extra) => ref.update({ odooSync: { etat, debut, fin: new Date().toISOString(), nb: 0, ajoutees: 0, maj: 0, annulees: 0, message: "", cle: !!key, ...extra } });
  try {
    const odoo = (go.params && go.params.odoo) || {};
    if (!key) return await fin("erreur", { message: "Clé API absente du serveur (secret ODOO_API_KEY)." });
    if (!odoo.domaine || !odoo.base || !odoo.login) return await fin("erreur", { message: "Connexion Odoo incomplète : renseigner le domaine, la base et l'identifiant dans Réglages." });
    const depuis = /^\d{4}-\d{2}-\d{2}$/.test(String(odoo.depuis || "")) ? odoo.depuis : "";
    const data = await readPurchases({ ...odoo, depuis, key });
    // lecture fraîche juste avant d'écrire (les achats ont pu affecter des PO pendant la lecture Odoo)
    const doc = (await ref.get()).data() || {};
    const fiches = odoo.seulementFiches ? new Set(Object.values(doc.projets || {}).map(f => String((f && f.projet) || "").trim()).filter(Boolean)) : null;
    const built = buildPo(data.orders, data.lines, data.products, { champProjet: odoo.champProjet, projetsFiches: fiches, now: new Date().toISOString() });
    const p = plan(doc, built, depuis);
    const after = { ...(doc.po || {}) }; Object.assign(after, p.set); p.del.forEach(id => delete after[id]);
    if (Buffer.byteLength(JSON.stringify({ ...doc, po: after }), "utf8") > MAX_DOC)
      return await fin("erreur", { message: "Trop de lignes de PO pour la page (limite de taille du document) : restreindre « Commandes depuis » ou cocher « Seulement les projets ayant une fiche machine »." });
    const writes = [...Object.entries(p.set).map(([id, v]) => ["po." + id, v]), ...p.del.map(id => ["po." + id, FieldValue.delete()])];
    for (let i = 0; i < writes.length; i += 400) await ref.update({ ...Object.fromEntries(writes.slice(i, i + 400)), updatedAt: new Date().toISOString(), updatedBy: AUTHOR });
    await fin("ok", { ...p.stats, message: data.orders.length + " commande(s) lue(s) dans Odoo" + (depuis ? " depuis le " + depuis.split("-").reverse().join("/") : "") + "." });
    logger.info("Synchro Odoo terminée", { docId, why, ...p.stats });
  } catch (e) {
    const message = clean(e && e.message, key);
    logger.error("Synchro Odoo en erreur", { docId, why, message });
    await fin("erreur", { message });
  }
}

// « Synchroniser maintenant » : la page écrit params.odooDemande ; on lance si la demande est nouvelle et plus récente que la dernière fin.
const onDemand = docId => onDocumentUpdated({ document: "planning/" + docId, secrets: [ODOO_KEY] }, async ev => {
  const before = (ev.data.before.data() || {}).params || {}, afterDoc = ev.data.after.data() || {}, after = afterDoc.params || {};
  const ask = after.odooDemande, last = (afterDoc.odooSync || {}).fin || "";
  if (!ask || ask === before.odooDemande || (last && String(last) >= String(ask))) return;
  await syncDoc(docId, "demande");
});
exports.odooSyncDemandeProd = onDemand("achats");
exports.odooSyncDemandeBeta = onDemand("beta_achats");

// Chaque nuit à 2 h (heure de Paris), pour chaque document dont « Synchronisation automatique chaque nuit » est cochée.
exports.odooSyncNuit = onSchedule({ schedule: "0 2 * * *", timeZone: "Europe/Paris", secrets: [ODOO_KEY] }, async () => {
  for (const id of DOCS) {
    const s = await db.collection("planning").doc(id).get();
    const odoo = s.exists && s.data().params && s.data().params.odoo;
    if (odoo && odoo.auto !== false && odoo.domaine) await syncDoc(id, "nuit");
  }
});
