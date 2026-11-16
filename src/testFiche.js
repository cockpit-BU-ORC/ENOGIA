// v337 (évolutions D12, D13, D14 + « checklist de tests au format de la checklist de debug ») — logique pure de la fiche de tests.
// Données (planning/tests) :
//   bookModel = { title, sections: [{ id, title, items: [{ id, label, hint }] }] }  — livret de configuration commun (D13), réglé dans
//               Tests › Checklists ; item.hint = valeur attendue. Par PJ : plans[PJ].book = { rows: { id: { r: "ok"|"nok", note } }, page, at }
//   vibModel  = { rows: [{ id, label, freq, limit }] }  — D14 : fréquences turbines figées (affichées) et limite de vibrations ;
//               par PJ : plans[PJ].debug.vib = { id: "valeur saisie" }
//   plans[PJ].asks = [{ id, label, hint, by, at }]  — D12 : demandes spécifiques du client (FAT interne), saisies par le chef de projet
//   plans[PJ].tres = { section: { id: { pb, cause, fix, temps } } }  — détail des tests (problème, causalité, correctif, temps)
import { selectedIds, statusOf, setStatus } from "./testPlan";

export const nid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ── D13 : livret de configuration
export const BOOK_DOC = { title: "Configuration ORC", subtitle: "Livret de configuration de la machine" };
export function bookSections(model) {
  const m = model || {};
  return Array.isArray(m.sections) ? m.sections.map(s => ({ id: s.id, title: s.title || "Chapitre", items: (s.items || []).filter(i => i && i.label).map(i => ({ id: i.id, label: i.label, hint: i.hint || "" })) })) : [];
}
export function bookProgress(book, sections) {
  const rows = (book && book.rows) || {}, items = sections.flatMap(s => s.items);
  let done = 0, nok = 0; items.forEach(i => { const v = rows[i.id] && rows[i.id].r; if (v) done++; if (v === "nok") nok++; });
  return { done, total: items.length, nok, by: sections.map(s => { let d = 0, k = 0; s.items.forEach(i => { const v = rows[i.id] && rows[i.id].r; if (v) d++; if (v === "nok") k++; }); return { id: s.id, title: s.title, done: d, total: s.items.length, nok: k }; }) };
}
// une case recliquée se décoche ; note vide = retirée
export function setBookRow(book, id, patch, at = new Date().toISOString()) {
  const b = { ...(book || {}) }, rows = { ...(b.rows || {}) }, cur = { ...(rows[id] || {}) };
  Object.entries(patch).forEach(([k, v]) => { if (k === "r" && cur.r === v) delete cur.r; else if (v === "" || v == null) delete cur[k]; else cur[k] = v; });
  if (Object.keys(cur).length) rows[id] = cur; else delete rows[id];
  return { ...b, rows, at };
}

// ── D14 : fréquences turbines figées et vibrations
export const VIB_DEFAULT = [{ id: "ta", label: "Turbine A", freq: "", limit: "" }, { id: "tb", label: "Turbine B (option)", freq: "", limit: "" }];
export const vibRows = model => (model && Array.isArray(model.rows) && model.rows.length ? model.rows : VIB_DEFAULT).map(r => ({ id: r.id, label: r.label || "Point de mesure", freq: r.freq || "", limit: r.limit || "" }));
const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(",", ".").replace(/[^0-9.-]/g, "")); return isFinite(n) ? n : null; };
// vibration au-dessus de la limite (limite lue comme nombre, ex. « 4,5 mm/s ») → true ; inconnu → null
export const vibOver = (val, limit) => { const a = num(val), b = num(limit); return a == null || b == null ? null : a > b; };
export function vibProgress(debug, rows) { const v = (debug && debug.vib) || {}; const done = rows.filter(r => String(v[r.id] || "").trim()).length; return { done, total: rows.length, over: rows.filter(r => vibOver(v[r.id], r.limit)).length }; }

// ── v362 : vitesses de turbine — tableau turbines (lignes = points de mesure du modèle) × vitesses (colonnes), case = fréquence relevée.
// Réglage : vibModel.speeds = [{ id, label }], vibModel.ranges = { [id turbine]: { [id vitesse]: { min, max } } } (Hz).
// Saisie : plans[PJ].debug.spd = { [id turbine]: { [id vitesse]: "valeur" } } — objets seulement (Firestore refuse les tableaux de tableaux).
export const vibSpeeds = model => (model && Array.isArray(model.speeds) ? model.speeds : []).filter(sp => sp && sp.id).map(sp => ({ id: sp.id, label: sp.label || "Vitesse" }));
export const speedRange = (model, tid, sid) => { const r = model && model.ranges && model.ranges[tid] && model.ranges[tid][sid]; return { min: (r && r.min) || "", max: (r && r.max) || "" }; };
// statut d'une case : "empty" (rien saisi), "norange" (pas de plage réglée), "in" (dans la plage, bornes comprises), "out" (hors plage)
export function freqStatus(val, range) {
  const v = num(val); if (!String(val == null ? "" : val).trim() || v == null) return "empty";
  const lo = num(range && range.min), hi = num(range && range.max);
  if (lo == null && hi == null) return "norange";
  return (lo == null || v >= lo) && (hi == null || v <= hi) ? "in" : "out";
}
export function speedProgress(debug, model) {
  const rows = vibRows(model), sps = vibSpeeds(model), v = (debug && debug.spd) || {};
  let done = 0, out = 0;
  rows.forEach(r => sps.forEach(sp => { const st = freqStatus(v[r.id] && v[r.id][sp.id], speedRange(model, r.id, sp.id)); if (st !== "empty") done++; if (st === "out") out++; }));
  return { done, total: rows.length * sps.length, out };
}

// ── D12 : demandes spécifiques du client (FAT interne)
export function addAsk(plan, label, hint, by, at = new Date().toISOString()) { return { ...plan, asks: [...(plan.asks || []), { id: nid("q"), label: String(label).trim(), hint: String(hint || "").trim(), by: by || "", at }] }; }
export function delAsk(plan, id) { const st = { ...(plan.st || {}) }; if (st.interne) { st.interne = { ...st.interne }; delete st.interne[id]; } return { ...plan, asks: (plan.asks || []).filter(a => a.id !== id), st }; }

// ── checklist de tests au format de la checklist de debug : une ligne par test retenu (+ demandes du client dans le FAT interne)
export function testRows(plan, catalog, sections) {
  return sections.map(k => {
    const base = selectedIds(plan, catalog, k).map(id => { const t = (catalog[k] || []).find(x => x.id === id) || { id, name: id, obj: "" }; return { id, label: t.name, hint: t.obj || "" }; });
    const asks = k === "interne" ? (plan.asks || []).map(a => ({ id: a.id, label: a.label, hint: a.hint, ask: true, by: a.by, at: a.at, fiche: !!a.fiche })) : [];
    return { k, rows: base, asks };
  });
}
// OK = réussi, NOK = échec ; recliquer remet « à faire »
export function setTestMark(plan, k, id, mark, by) { const cur = statusOf(plan, k, id), v = mark === "ok" ? "ok" : "ko"; return setStatus(plan, k, id, cur === v ? "todo" : v, by); }
export function setTestDetail(plan, k, id, patch) {
  const tres = { ...(plan.tres || {}) }, sec = { ...(tres[k] || {}) }, cur = { ...(sec[id] || {}) };
  Object.entries(patch).forEach(([f, v]) => { if (v === "" || v == null) delete cur[f]; else cur[f] = v; });
  if (Object.keys(cur).length) sec[id] = cur; else delete sec[id];
  tres[k] = sec; return { ...plan, tres };
}

// ── les 6 étapes de la fiche et leur état (pour le fil de gauche)
export function ficheSteps({ plan, assignedN, kind, book, bookSecs, debugPr, vibPr, testPr, signsN }) {
  const bp = bookProgress(book, bookSecs);
  return [
    { id: "who", t: "Qui teste ?", s: assignedN ? assignedN + " testeur" + (assignedN > 1 ? "s" : "") : "à affecter", st: assignedN ? "done" : "todo" },
    { id: "pres", t: "Présence", s: kind === "both" ? "client et NOBO" : kind === "client" ? "client" : kind === "nobo" ? "NOBO" : "tests internes seuls", st: "done" },
    { id: "book", t: "Configuration ORC", s: bp.total ? bp.done + " / " + bp.total + (bp.nok ? " · " + bp.nok + " NOK" : "") : "livret à charger", st: bp.nok ? "bad" : bp.total && bp.done === bp.total ? "done" : "todo" },
    { id: "debug", t: "Checklist de debug", s: debugPr.done + " / " + debugPr.total + (debugPr.nok ? " · " + debugPr.nok + " NOK" : "") + (vibPr && vibPr.over ? " · vibrations hautes" : ""), st: debugPr.nok || (vibPr && vibPr.over) ? "bad" : debugPr.signed ? "done" : "todo" },
    { id: "tests", t: "Checklist de tests", s: testPr.done + " / " + testPr.total + (testPr.ko ? " · " + testPr.ko + " NOK" : ""), st: testPr.ko ? "bad" : testPr.total && testPr.done === testPr.total ? "done" : "todo" },
    { id: "sign", t: "Signature", s: signsN.done + " / " + signsN.total + " testeur" + (signsN.total > 1 ? "s" : ""), st: signsN.total && signsN.done === signsN.total ? "done" : "todo" },
  ];
}
