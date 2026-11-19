// v294 : synchronisation Odoo → Achats / Appro — conversion pure (aucun appel réseau, aucune écriture), testée par test/convert.test.js.
// Contrat : en tête de src/components/Achats.js (« Synchronisation Odoo : contrat pour la fonction serveur »).
"use strict";

// Many2one Odoo : [id, "nom"] (JSON-RPC), parfois un nombre ou { id, display_name } (API JSON-2)
const m2oId = v => (Array.isArray(v) ? v[0] : typeof v === "number" ? v : v && typeof v === "object" ? v.id : null) || null;
const m2oName = v => (Array.isArray(v) ? v[1] : v && typeof v === "object" ? (v.display_name || v.name) : v);
// Valeur du champ projet : texte, many2one ou false
const projetOf = v => { if (v === false || v == null) return ""; const s = m2oName(v); return s == null || s === false ? "" : String(s).trim(); };
// Date Odoo « AAAA-MM-JJ » ou « AAAA-MM-JJ HH:MM:SS » → « AAAA-MM-JJ »
const dayOf = v => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : "");
const numOf = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// État de la commande Odoo → statut de la page (STATUTS de Achats.js)
function statutOf(orderState, qte, qteRecue) {
  if (qte > 0 && qteRecue >= qte) return "livre";
  if (orderState === "sent") return "envoyee";
  if (orderState === "purchase" || orderState === "done") return "attente";
  return "apasser"; // draft, to approve
}

/**
 * Construit les PO à partir des lectures Odoo.
 * orders : purchase.order [{ id, name, date_approve, date_order, state }]
 * lines : purchase.order.line [{ id, order_id, sequence, product_id, name, product_qty, qty_received, date_planned, [champProjet] }]
 * products : product.product [{ id, default_code }]
 * opts : { champProjet, projetsFiches (Set des n° de projet des fiches, ou null = pas de filtre), now (ISO) }
 * → { po: { ["o" + id]: {...} }, cancelled: Set des id "o…" de lignes de commandes annulées, outOfScope: Set des id hors fiches }
 */
function buildPo(orders, lines, products, opts) {
  const o = opts || {}, now = o.now || new Date().toISOString();
  const orderById = new Map(orders.map(x => [x.id, x]));
  const codeById = new Map(products.map(p => [p.id, p.default_code || ""]));
  // rang de la ligne dans sa commande : tri par sequence puis id
  const byOrder = new Map();
  lines.forEach(l => { const k = m2oId(l.order_id); if (!byOrder.has(k)) byOrder.set(k, []); byOrder.get(k).push(l); });
  const rank = new Map();
  byOrder.forEach(arr => arr.slice().sort((a, b) => (numOf(a.sequence) - numOf(b.sequence)) || (a.id - b.id)).forEach((l, i) => rank.set(l.id, i + 1)));
  const po = {}, cancelled = new Set(), outOfScope = new Set();
  lines.forEach(l => {
    const ord = orderById.get(m2oId(l.order_id)); if (!ord) return;
    const id = "o" + l.id;
    if (ord.state === "cancel") { cancelled.add(id); return; }
    const projet = o.champProjet ? projetOf(l[o.champProjet] !== undefined ? l[o.champProjet] : ord[o.champProjet]) : "";
    const qte = numOf(l.product_qty), qteRecue = numOf(l.qty_received);
    const rec = {
      numero: ord.name || "", ligne: String(rank.get(l.id) || ""),
      ref: codeById.get(m2oId(l.product_id)) || "", designation: String(l.name || "").split("\n")[0].trim(),
      qte, qteRecue, dateCommande: dayOf(ord.date_approve) || dayOf(ord.date_order), dateLivraison: dayOf(l.date_planned),
      statut: statutOf(ord.state, qte, qteRecue), projet, source: "odoo", odooId: l.id, annule: false, majOdoo: now,
    };
    if (o.projetsFiches && !o.projetsFiches.has(projet)) outOfScope.add(id);
    po[id] = rec;
  });
  return { po, cancelled, outOfScope };
}

/**
 * Compare avec le document Firestore et donne les écritures à faire.
 * doc : contenu de planning/achats ; built : résultat de buildPo ; depuis : « AAAA-MM-JJ » ou "" (fenêtre lue dans Odoo)
 * Règles : on ne touche jamais une PO saisie à la main (source vide) ni le poId des lignes de nomenclature ;
 * ligne annulée / disparue / hors fiches : annule = true si affectée à une ligne de nomenclature, sinon suppression.
 * → { set: { id: po }, del: [id], stats: { nb, ajoutees, maj, annulees } }
 */
function plan(doc, built, depuis) {
  const cur = (doc && doc.po) || {}, lignes = (doc && doc.lignes) || {};
  const assigned = new Set(Object.values(lignes).map(l => l && l.poId).filter(Boolean));
  const set = {}, del = [], stats = { nb: 0, ajoutees: 0, maj: 0, annulees: 0 };
  const ignored = (doc && doc.params && doc.params.poIgnores) || {}; // v413 : lignes de PO supprimées par un admin de la page, jamais remises
  const same = (a, b) => { const k = ["numero", "ligne", "ref", "designation", "qte", "qteRecue", "dateCommande", "dateLivraison", "statut", "projet", "annule"]; return k.every(x => (a[x] ?? "") === (b[x] ?? "")); };
  const retire = (id, old) => {
    if (!old || old.source !== "odoo") return;
    if (assigned.has(id)) { if (!old.annule) { set[id] = { ...old, annule: true }; stats.annulees++; } }
    else { del.push(id); stats.annulees++; }
  };
  Object.entries(built.po).forEach(([id, rec]) => {
    const old = cur[id];
    if (ignored[id]) return;
    if (old && old.source !== "odoo") return;                          // jamais une saisie manuelle
    if (built.outOfScope.has(id) && !assigned.has(id)) { if (old) retire(id, old); return; }
    stats.nb++;
    if (!old) { set[id] = rec; stats.ajoutees++; }
    else if (!same(old, rec)) { set[id] = { ...old, ...rec }; stats.maj++; }
  });
  built.cancelled.forEach(id => retire(id, cur[id]));
  // disparues d'Odoo : PO « odoo » de la fenêtre lue, ni renvoyées ni annulées
  Object.entries(cur).forEach(([id, old]) => {
    if (!old || old.source !== "odoo" || built.po[id] || built.cancelled.has(id)) return;
    if (depuis && old.dateCommande && old.dateCommande < depuis) return; // hors fenêtre : on n'y touche pas
    retire(id, old);
  });
  return { set, del, stats };
}

/**
 * v296 : compte rendu lisible (affiché dans la page) — ce qui a été lu et pourquoi des lignes ont été écartées.
 * d : { orders, lines } lus ; built : buildPo ; o : { depuis, fiches (Set ou null), champProjet }
 */
function summary(d, built, o) {
  const x = o || {}, ids = Object.keys(built.po), out = ids.filter(id => built.outOfScope.has(id));
  const sansProjet = ids.filter(id => !built.po[id].projet).length;
  const fmt = s => s.split("-").reverse().join("/");
  const parts = [d.orders.length + " commande(s) et " + d.lines.length + " ligne(s) lues dans Odoo" + (x.depuis ? " depuis le " + fmt(x.depuis) : "")];
  if (built.cancelled.size) parts.push(built.cancelled.size + " ligne(s) de commandes annulées");
  if (!x.champProjet) parts.push("champ projet non renseigné dans les réglages");
  else if (sansProjet) parts.push(sansProjet + " ligne(s) sans n° de projet dans « " + x.champProjet + " »");
  if (x.fiches) {
    if (!x.fiches.size) parts.push("aucune fiche machine dans l'onglet Projets : avec « Seulement les projets ayant une fiche machine », tout est écarté");
    else if (out.length) {
      const vals = [...new Set(out.map(id => built.po[id].projet).filter(Boolean))].slice(0, 5);
      parts.push(out.length + " ligne(s) écartée(s) car leur projet n'a pas de fiche machine" + (vals.length ? " (valeurs Odoo : " + vals.join(", ") + ")" : ""));
    }
  }
  return parts.join(" ; ") + ".";
}

module.exports = { buildPo, plan, summary, statutOf, m2oId, projetOf, dayOf };
