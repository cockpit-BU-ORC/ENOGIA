// V146.1 — Lien entre le Cash in (planning/cashin) et les jalons de paiement des fiches projet, des rapports CODIR / CDP
// et de l'avancement. Logique reprise de public/cashin.html (mêmes règles de statut et de dates), sans accès à Firebase :
// App.js pose ici le document lu (super admin uniquement), le reste du site le lit.
// Sans données Cash in pour un PJ (ou pour un compte qui n'y a pas accès), les jalons saisis à la main dans la fiche restent la référence.

let DOC = null, LINKS = {}, ORDO = [], NAMES = {}, VER = 0;
const subs = new Set();
const bump = () => { VER++; subs.forEach(f => f()); };
export const setCashinDoc = d => { DOC = d && Array.isArray(d.rows) ? d : null; bump(); };
export const getCashinDoc = () => DOC;
// Liaisons choisies à la main : { "PJ405-Y34": ["PJ405", "PJ406"] } — un PJ du Cash in réparti à parts égales entre les PJ de l'ordo listés.
// Absent = rapprochement automatique par le numéro ; liste vide = volontairement lié à aucun PJ.
export const setCashinLinks = l => { LINKS = l && typeof l === "object" && !Array.isArray(l) ? l : {}; bump(); };
export const getCashinLinks = () => LINKS;
export const setOrdoPjs = (list, names) => { NAMES = names || {}; const n = (list || []).filter(Boolean); if (n.length !== ORDO.length || n.some((x, i) => x !== ORDO[i])) { ORDO = n; bump(); } };
export const getOrdoPjs = () => ORDO;
export const getOrdoName = pj => NAMES[pj] || "";
// Pour React (useSyncExternalStore) : se réabonner à chaque changement du Cash in, des liaisons ou de la liste des PJ.
export const subscribeCashin = f => { subs.add(f); return () => subs.delete(f); };
export const cashinVersion = () => VER;

const toMs = iso => { const p = String(iso).slice(0, 10).split("-").map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); };
export const diffDays = (a, b) => Math.round((toMs(b) - toMs(a)) / 864e5);
export const addDays = (iso, n) => new Date(toMs(iso) + n * 864e5).toISOString().slice(0, 10);
export const todayISO = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };

// Date à laquelle la facture doit partir : prévue, sinon encaissement prévu − délai, sinon facture initiale.
export function billDue(r) {
  if (r.factPrevue) return r.factPrevue;
  if (r.encPrevue && r.delai != null) return addDays(r.encPrevue, -r.delai);
  if (r.factInit && !r.factReelle) return r.factInit;
  return null;
}
// paid · late (facture émise, paiement dépassé) · invoiced · tobill (facture à émettre) · future · epc
export function statusOf(r, today) {
  if (r.epc) return { k: "epc" };
  if (r.encReelle) return { k: "paid" };
  if (r.factReelle) return r.encPrevue && r.encPrevue < today ? { k: "late", days: diffDays(r.encPrevue, today) } : { k: "invoiced" };
  const bd = billDue(r);
  return bd && bd <= today ? { k: "tobill", days: bd < today ? diffDays(bd, today) : 0 } : { k: "future" };
}
export const SOON_DAYS = 15; // « échéance proche » (orange)
export const STATUS_LABEL = { paid: "Payé", invoiced: "Facture émise", tobill: "À facturer", warn: "À surveiller", late: "En retard", future: "À venir", epc: "EPC" };

// Prochaine échéance d'un jalon non payé : facture à émettre ou paiement attendu (la plus proche, déjà dépassée comprise).
export function nextDue(r, today) {
  if (r.epc || r.encReelle) return null;
  const c = [];
  if (!r.factReelle) { const bd = billDue(r); if (bd) c.push({ kind: "facture", date: bd }); }
  if (r.encPrevue) c.push({ kind: "paiement", date: r.encPrevue });
  if (!c.length) return null;
  c.sort((a, b) => a.date.localeCompare(b.date));
  return { ...c[0], days: diffDays(today, c[0].date) };
}
// Teinte du jalon : le statut, sauf « à facturer depuis plus d'un jour » et « échéance dans ≤ 15 j » qui passent en orange (warn) ; retard de paiement en rouge.
export function toneOf(st, due) {
  if (st.k === "tobill" && (st.days || 0) > 0) return "warn";
  if ((st.k === "future" || st.k === "invoiced") && due && due.days >= 0 && due.days <= SOON_DAYS) return "warn";
  return st.k;
}

export const normPj = s => String(s || "").toUpperCase().replace(/\s+/g, "");
// Rapprochement automatique : même numéro, ou numéro suivi d'un suffixe qui ne prolonge pas le nombre (PJ405 ↔ PJ405-Y34, PJ461 ↔ PJ461 Etude, mais pas PJ46 ↔ PJ460).
export const autoMatch = (key, pj) => { const p = normPj(pj), n = normPj(key); return !!p && (n === p || (n.startsWith(p) && !/\d/.test(n.charAt(p.length)))); };
// PJ de l'ordo auxquels un PJ du Cash in se rattache automatiquement (le numéro exact l'emporte sur les suffixes).
export function autoTargets(key, ordo = ORDO) {
  const m = (ordo || []).filter(p => autoMatch(key, p)), ex = m.filter(p => normPj(p) === normPj(key));
  return ex.length ? ex : m;
}
// Cibles réelles d'un PJ du Cash in : liaison choisie à la main si elle existe, sinon automatique. explicit = vrai si choisie à la main.
export function targetsOf(key, links = LINKS, ordo = ORDO) {
  const e = links && links[key];
  return Array.isArray(e) ? { list: e, explicit: true } : { list: autoTargets(key, ordo), explicit: false };
}
// Les PJ du Cash in (groupes de lignes) ; total = total saisi, sinon somme des jalons.
export function allCashGroups(doc = DOC) {
  if (!doc || !Array.isArray(doc.rows)) return [];
  const by = {}, order = [];
  doc.rows.forEach(r => { if (!by[r.pj]) { by[r.pj] = []; order.push(r.pj); } by[r.pj].push(r); });
  return order.map(k => {
    const rows = by[k], sum = rows.reduce((a, r) => a + (r.montant || 0), 0), t = doc.totals && doc.totals[k];
    return { pj: k, label: (doc.labels && doc.labels[k]) || "", rows, total: t > 0 ? t : sum };
  });
}
// Ajoute / retire un PJ de l'ordo dans la liaison d'un PJ du Cash in (part de la liaison automatique si elle n'a jamais été touchée).
export function toggleLink(links, key, pj, ordo = ORDO) {
  const cur = targetsOf(key, links, ordo).list.slice(), i = cur.findIndex(x => normPj(x) === normPj(pj));
  if (i >= 0) cur.splice(i, 1); else cur.push(pj);
  return { ...links, [key]: cur };
}
// v146.14 — Liaison jalon par jalon : un PJ du Cash in (ex. PJ461 : contrat général + 5 machines) a des jalons « globaux » (répartis comme le PJ du Cash in)
// et des jalons réservés à certaines machines. Stocké dans le même document de liaisons, sous la clé "row:<id du jalon>" : liste des PJ de l'ordo concernés.
// Absent = le jalon suit la liaison du PJ du Cash in (global).
export const rowKey = id => "row:" + id;
export const rowTargetsOf = (row, links = LINKS) => { const e = links && row && links[rowKey(row.id)]; return Array.isArray(e) ? e : null; };
// Les lignes du Cash in d'un PJ de l'ordo, avec la part qui lui revient : 1 / nombre de PJ entre lesquels le jalon est réparti
// (jalon « réparti » = suit la liaison du PJ du Cash in). Un jalon choisi à la main (« commun ») n'est JAMAIS divisé : chaque machine cochée
// le voit en entier (ex. l'acompte du contrat PJ461) — il est marqué _shared, et il ne faut pas l'additionner d'une machine à l'autre.
export function cashGroupsFor(pj, doc = DOC, links = LINKS, ordo = ORDO) {
  const p = normPj(pj);
  if (!p) return [];
  const out = [];
  allCashGroups(doc).forEach(g => {
    const e = links && links[g.pj];
    let hit, n = 1;
    if (Array.isArray(e)) { hit = e.some(x => normPj(x) === p); n = e.length || 1; }
    else hit = ordo && ordo.length ? autoTargets(g.pj, ordo).some(x => normPj(x) === p) : autoMatch(g.pj, pj);
    let custom = false;
    const rows = [];
    g.rows.forEach(r => {
      const rt = rowTargetsOf(r, links);
      if (rt) { custom = true; if (rt.some(x => normPj(x) === p)) rows.push({ ...r, _share: 1, _n: 1, _shared: (rt.length || 1) > 1, _sharedN: rt.length || 1 }); }
      else if (hit) rows.push({ ...r, _share: 1 / n, _n: n });
    });
    if (!rows.length) return;
    // Sans jalon particulier : comportement d'avant (total saisi ÷ n). Sinon : somme des parts des jalons retenus.
    const total = custom ? rows.reduce((a, r) => a + (r.montant || 0) * r._share, 0) : g.total / n;
    out.push({ ...g, rows, split: n, share: 1 / n, fullTotal: g.total, total, custom });
  });
  return out;
}

// Jalons de paiement d'un PJ vus par la fiche : { id, label, pct, montant, done, doneAt, linked:true, epc, k, tone, group, ref, dates…, retard, due }
export function linkedPayments(pj, doc = DOC, today = todayISO()) {
  const out = [];
  cashGroupsFor(pj, doc).forEach(g => g.rows.forEach(r => {
    const st = statusOf(r, today), due = nextDue(r, today);
    out.push({
      id: "cash:" + r.id, label: r.jalon || "Jalon sans nom", montant: (r.montant || 0) * (r._share != null ? r._share : g.share), split: r._n || g.split, shared: !!r._shared, sharedN: r._sharedN || 1,
      pct: r.montant && g.fullTotal ? Math.round(r.montant / g.fullTotal * 1000) / 10 : null,
      done: st.k === "paid", doneAt: r.encReelle || null, linked: true, epc: !!r.epc,
      k: st.k, tone: toneOf(st, due), group: g.pj, groupLabel: g.label, ref: r.ref || "", note: r.note || "",
      factPrevue: r.factPrevue || null, encPrevue: r.encPrevue || null, factReelle: r.factReelle || null, encReelle: r.encReelle || null,
      retard: st.k === "late" ? st.days : (st.k === "tobill" && st.days > 0 ? st.days : null), due,
    });
  }));
  return out;
}
// Synthèse d'un PJ : montants et prochaine échéance (pour la tuile « Prochain paiement »). null si rien n'est lié.
export function cashSummary(items) {
  const l = (items || []).filter(i => i.linked);
  if (!l.length) return null;
  const live = l.filter(i => !i.epc);
  const sum = f => live.filter(f).reduce((a, i) => a + i.montant, 0);
  const open = live.filter(i => !i.done && i.due).sort((a, b) => a.due.date.localeCompare(b.due.date));
  const lateItems = live.filter(i => i.k === "late");
  return {
    total: live.reduce((a, i) => a + i.montant, 0), paid: sum(i => i.done), invoiced: sum(i => i.k === "invoiced" || i.k === "late"),
    toBill: sum(i => i.k === "tobill"), late: lateItems.reduce((a, i) => a + i.montant, 0), lateN: lateItems.length,
    next: open[0] || null, allEpc: live.length === 0,
  };
}
