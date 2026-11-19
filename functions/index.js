// v294 : synchronisation Odoo → page Achats / Appro du Cockpit BU ORC (Cloud Functions Firebase, 2e génération).
// Lit les commandes d'achat dans Odoo (lecture seule) et écrit les PO dans planning/achats (production) et planning/beta_achats (bêta).
// La clé API est dans Secret Manager (secret ODOO_API_KEY) : jamais dans Firestore, dans la page ni dans le dépôt.
// Mode d'emploi : functions/LISEZMOI.md. Contrat des données : en tête de src/components/Achats.js.
"use strict";

const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { readPurchases, clean } = require("./odoo");
const { buildPo, plan, summary } = require("./convert");

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
    await fin("ok", { ...p.stats, message: summary(data, built, { depuis, fiches, champProjet: odoo.champProjet }) });
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

// ── v374 : fiche du lundi du Cash in ─────────────────────────────────────────────────────────────────────────
// Chaque lundi à 7 h (heure de Paris) si « Envoi automatique » est coché, et à la demande (« M'envoyer un test », « Envoyer maintenant »).
// Lit planning/cashin et planning/cashinWeekly (beta_ en bêta), calcule la fiche avec functions/shared/cashWeekly.mjs (copie de
// src/cashWeekly.js : mêmes chiffres que l'aperçu du site), envoie le mail (Google Workspace, SMTP) avec la courbe et le PDF de 3 pages.
// Secrets : MAIL_USER (adresse d'envoi @enogia.com) et MAIL_PASS (mot de passe d'application de ce compte) — jamais dans le dépôt.
const MAIL_USER = defineSecret("MAIL_USER"), MAIL_PASS = defineSecret("MAIL_PASS");
const APP_URL = "https://cockpit-bu-orc.github.io/ENOGIA";
const { buildPdf, curvePng, sendMail } = require("./weekly");
const parisToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
const hideSecrets = (m, ...keys) => keys.reduce((s, k) => (k ? s.split(k).join("•••") : s), String(m || "Erreur inconnue")).slice(0, 300);

async function sendWeekly(pfx, kind, ask) {
  const wref = db.collection("planning").doc(pfx + "cashinWeekly"), at = ask ? ask.at : new Date().toISOString(), debut = new Date().toISOString();
  const w = await db.runTransaction(async tx => {
    const s = await tx.get(wref); const d = s.exists ? s.data() : {}; const cur = d.sent || {};
    if (cur.etat === "en_cours" && cur.debut && Date.now() - Date.parse(cur.debut) < LOCK_MS) return null;
    tx.set(wref, { sent: { ask: at, etat: "en_cours", debut } }, { merge: true }); return d;
  });
  if (!w) { logger.info("Fiche du lundi : envoi déjà en cours", { pfx, kind }); return; }
  const user = MAIL_USER.value(), pass = MAIL_PASS.value(), test = kind === "test";
  const M = await import("./shared/cashWeekly.mjs");
  const to = M.cleanRecipients(test ? (ask && ask.to) : w.recipients);
  const finish = async (ok, message, extra = {}) => {
    const history = (Array.isArray(w.history) ? w.history : []).concat([{ at: new Date().toISOString(), kind, n: to.length, ok, ...(ok ? {} : { err: message }) }]).slice(-30);
    await wref.set({ sent: { ask: at, etat: ok ? "ok" : "erreur", debut, fin: new Date().toISOString(), message, n: to.length }, history, ...extra }, { merge: true });
  };
  try {
    if (!user || !pass) return await finish(false, "Secrets MAIL_USER / MAIL_PASS absents du serveur.");
    if (!to.length) return await finish(false, "Aucun destinataire @enogia.com.");
    const cs = await db.collection("planning").doc(pfx + "cashin").get();
    if (!cs.exists) return await finish(false, "Cash in introuvable.");
    const rep = M.weeklyReport(cs.data(), parisToday(), w.last);
    const html = M.mailHtml(rep, { img: "cid:courbe", appUrl: APP_URL + (pfx ? "/beta" : "") + "/?p=cashin", beta: !!pfx });
    const pdf = await buildPdf(rep, M), png = curvePng(rep, M);
    await sendMail({ user, pass, to, subject: (test ? "[Test] " : "") + (pfx ? "[Bêta] " : "") + M.subject(rep), html, text: M.mailText(rep), png, pdf, pdfName: "Cash-in_S" + rep.week.w + "_" + rep.year + ".pdf" });
    await finish(true, "Envoyé à " + to.length + " destinataire" + (to.length > 1 ? "s" : ""), test ? {} : { last: M.snapshotOf(rep) });
    logger.info("Fiche du lundi envoyée", { pfx, kind, n: to.length });
  } catch (e) {
    const message = hideSecrets(e && e.message, pass);
    logger.error("Fiche du lundi en erreur", { pfx, kind, message });
    await finish(false, message);
  }
}
// Lundi 7 h : production seulement (la bêta s'essaie avec « M'envoyer un test »)
exports.cashWeeklyLundi = onSchedule({ schedule: "0 7 * * 1", timeZone: "Europe/Paris", memory: "512MiB", secrets: [MAIL_USER, MAIL_PASS] }, async () => {
  const s = await db.collection("planning").doc("cashinWeekly").get();
  if (s.exists && s.data().on) await sendWeekly("", "auto", null);
});
// À la demande : la page écrit ask = { at, by, test, to } ; on envoie si la demande est nouvelle et pas encore traitée
const weeklyOnDemand = pfx => onDocumentWritten({ document: "planning/" + pfx + "cashinWeekly", memory: "512MiB", secrets: [MAIL_USER, MAIL_PASS] }, async ev => {
  const before = ev.data.before && ev.data.before.exists ? ev.data.before.data() : {}, after = ev.data.after && ev.data.after.exists ? ev.data.after.data() : null;
  const ask = after && after.ask; if (!ask || !ask.at) return;
  if (before.ask && before.ask.at === ask.at) return;
  if (after.sent && after.sent.ask === ask.at) return;
  await sendWeekly(pfx, ask.test ? "test" : "manuel", ask);
});
exports.cashWeeklyDemandeProd = weeklyOnDemand("");
exports.cashWeeklyDemandeBeta = weeklyOnDemand("beta_");

// ── v413 : demandes de transport ClickUp → planning/transports et planning/beta_transports (accueil du Cockpit), toutes les 15 minutes
// Secret à créer par Gabriel : firebase functions:secrets:set CLICKUP_TOKEN (jeton personnel ClickUp, lecture de la liste SCCM › LOGISTIQUE V2)
const CLICKUP_TOKEN = defineSecret("CLICKUP_TOKEN");
const { buildTransports, readTasks: readClickup, LIST_URL: CLICKUP_LIST_URL } = require("./clickup");
exports.clickupTransports = onSchedule({ schedule: "every 15 minutes", timeZone: "Europe/Paris", secrets: [CLICKUP_TOKEN] }, async () => {
  const at = new Date().toISOString(), token = CLICKUP_TOKEN.value();
  let out;
  try {
    if (!token) throw new Error("Jeton absent du serveur (secret CLICKUP_TOKEN)");
    const items = buildTransports(await readClickup(token, at), at);
    out = { items, at, etat: "ok", message: Object.keys(items).length + " demande(s) lue(s)", liste: CLICKUP_LIST_URL };
  } catch (e) {
    logger.error("ClickUp : lecture impossible", { message: e && e.message });
    out = { at, etat: "erreur", message: String((e && e.message) || e).slice(0, 200) };
  }
  // en cas d'erreur, on garde les demandes déjà connues (merge sans « items »)
  for (const id of ["transports", "beta_transports"]) await db.collection("planning").doc(id).set(out, { merge: out.etat === "erreur" });
});
