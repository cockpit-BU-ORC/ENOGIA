// v412 (demandé : « je veux que ça fonctionne comme les autres cadres et pages du Cockpit ») : les compétences SAV deviennent une vraie
// page du site (SavSkillsPage.js). Calculs repris de la page d'origine (competences-sav.html), sans la base de l'artefact.
// Données (préfixe beta_ en bêta) :
//   planning/savSkills    { people: { id: { name, role, uid, order } }, assess: { id: { mgr: { compétence: 0|1|2 }, self } },
//                           objectives: { "id_période": { personId, period, targets: { catégorie: niveau } } },
//                           snapshots: { "id_période": { personId, period, scores: { catégorie: niveau }, source } } }   — responsable SAV
//   planning/savSkillsCat { categories: { id: { name, kind: "technique" | "transverse", order, levels: [{ label, skills: [{ id, text }] }] } } }
//   planning/savSkillsMe_<adresse> { view: { personId, name, role, mgr, objectives: { période: cibles }, snapshots: { période: scores } },
//                           selfeval: { uid, self, updatedAt }, email }                                         — la personne
export const STATE = ["Non acquis", "En cours ou avec aide", "Autonome"];
export const LVL_DEFAULT = ["Découverte", "Guidé", "Autonome", "Référent", "Expert"];
export const KINDS = [["technique", "Technique"], ["transverse", "Transverse"]];
export const STARTER = [["Fluidique", "technique"], ["Électricité", "technique"], ["Automatisme", "technique"], ["Produit", "technique"], ["Livrables", "transverse"], ["Rigueur", "transverse"], ["Relation client", "transverse"]];

export function quarterOf(d = new Date()) { return "Q" + (Math.floor(d.getMonth() / 3) + 1) + "-" + String(d.getFullYear()).slice(2); }
// six trimestres : le trimestre en cours en 2e position (un passé pour la courbe, quatre à venir pour les objectifs)
export function periodsAround(d = new Date()) {
  const out = []; let y = d.getFullYear(), q = Math.floor(d.getMonth() / 3) - 1; if (q < 0) { q = 3; y--; }
  for (let i = 0; i < 6; i++) { out.push("Q" + (q + 1) + "-" + String(y).slice(2)); q++; if (q > 3) { q = 0; y++; } }
  return out;
}
export const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
export const r2 = x => Math.round(x * 2) / 2;
export const fmt = v => (v == null ? "–" : (Number.isInteger(v) ? String(v) : v.toFixed(1)).replace(".", ","));
export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
export const listOf = m => Object.entries(m || {}).map(([id, v]) => ({ ...(v || {}), id })).sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.name || "").localeCompare(String(b.name || ""), "fr"));
export const catsOf = doc => listOf(doc && doc.categories).map(c => ({ ...c, kind: c.kind || "technique", levels: Array.isArray(c.levels) ? c.levels.map(l => ({ label: (l && l.label) || "", skills: Array.isArray(l && l.skills) ? l.skills : [] })) : [] }));

// état de lecture : S = { people, assess, objs: { "id|période": cibles }, snaps: { "id|période": scores }, selfBy: { uid: self } }
export function stateOf(adminDoc, selfDocs) {
  const d = adminDoc || {}, objs = {}, snaps = {};
  Object.values(d.objectives || {}).forEach(o => { if (o && o.personId && o.period) objs[o.personId + "|" + o.period] = o.targets || {}; });
  Object.values(d.snapshots || {}).forEach(o => { if (o && o.personId && o.period) snaps[o.personId + "|" + o.period] = o.scores || {}; });
  return { people: listOf(d.people), assess: d.assess || {}, objs, snaps, selfBy: selfDocs || {} };
}
// état d'une personne seule (sa fiche), d'après son miroir
export function stateOfView(view, selfeval, myUid) {
  if (!view) return null;
  const objs = {}, snaps = {};
  Object.entries(view.objectives || {}).forEach(([per, t]) => { objs["me|" + per] = t || {}; });
  Object.entries(view.snapshots || {}).forEach(([per, s]) => { snaps["me|" + per] = s || {}; });
  return { people: [{ id: "me", uid: myUid, name: view.name, role: view.role }], assess: { me: { mgr: view.mgr || {}, self: {} } }, objs, snaps, selfBy: selfeval ? { [myUid]: selfeval.self || {} } : {} };
}
export const mgrOf = (S, p) => ((S.assess[p] || {}).mgr) || {};
export function selfOf(S, p) { const pp = S.people.find(x => x.id === p); if (pp && pp.uid) return S.selfBy[String(pp.uid).toLowerCase()] || S.selfBy[pp.uid] || {}; return ((S.assess[p] || {}).self) || {}; }
// niveau d'une catégorie : niveaux pleins (toutes les compétences autonomes) + fraction du niveau en cours
export function rawScore(S, p, cat) {
  const a = mgrOf(S, p); let full = 0;
  for (const lv of cat.levels) { const sk = lv.skills || []; if (!sk.length) { full++; continue; }
    const pr = sk.reduce((s, k) => s + (a[k.id] || 0), 0) / (2 * sk.length); if (pr >= 1) { full++; continue; } return full + pr; }
  return full;
}
export const hasData = (S, p, cat) => { const a = mgrOf(S, p); return cat.levels.some(lv => (lv.skills || []).some(k => k.id in a)); };
export const snapVal = (S, p, per, catId) => { const s = S.snaps[p + "|" + per]; return s && s[catId] != null ? s[catId] : null; };
export function current(S, p, cat, cur) {
  if (hasData(S, p, cat)) return { v: r2(rawScore(S, p, cat)), src: "live" };
  const v = snapVal(S, p, cur, cat.id); return v != null ? { v, src: "import" } : { v: null, src: "none" };
}
export const target = (S, p, catId, per) => { const o = S.objs[p + "|" + per]; return o && o[catId] != null ? o[catId] : null; };
export function series(S, p, cat, periods, cur) { const ci = periods.indexOf(cur); return periods.map((per, i) => (i < ci ? snapVal(S, p, per, cat.id) : i === ci ? current(S, p, cat, cur).v : null)); }
export function avgSeries(S, p, cats, periods, cur) {
  const ci = periods.indexOf(cur);
  return periods.map((per, i) => { if (i > ci) return null; const vs = cats.map(c => (i < ci ? snapVal(S, p, per, c.id) : current(S, p, c, cur).v)).filter(v => v != null); return vs.length ? mean(vs) : null; });
}
// une compétence passe de non acquis → en cours → autonome → non acquis
export const cycle = v => ((v || 0) + 1) % 3;
// nouvel objectif d'une catégorie (pas de 0,5, borné entre 0 et 5 ; sous zéro = retiré)
export function stepTarget(curTarget, curLevel, d) {
  const base = curTarget != null ? curTarget : (curLevel || 0);
  if (curTarget == null) { if (d > 0) return Math.min(5, r2(base + 0.5)); return base === 0 ? null : Math.max(0, r2(base - 0.5)); }
  const nv = curTarget + d; if (nv < 0) return null; return Math.min(5, r2(nv));
}
// pré-remplir les compétences d'une catégorie depuis un score importé (niveaux pleins puis part du niveau suivant)
export function prefillMgr(mgr, cat, base) {
  const out = { ...(mgr || {}) }; let rem = base;
  cat.levels.forEach(lv => { const n = lv.skills.length, f = Math.max(0, Math.min(1, rem)), k = f >= 1 ? n : Math.floor(f * n); lv.skills.forEach((s, i) => { out[s.id] = i < k ? 2 : 0; }); rem -= 1; });
  return out;
}
// figer le trimestre : niveaux actuels de chacun → snapshots
export function freezeScores(S, cats, cur) { const out = {}; S.people.forEach(p => { const sc = {}; cats.forEach(c => { const v = current(S, p.id, c, cur).v; if (v != null) sc[c.id] = v; }); out[p.id] = sc; }); return out; }
// fiche visible par la personne (miroir)
export function mirrorOf(S, p, periods) {
  const doc = { personId: p.id, name: p.name || "", role: p.role || "", mgr: { ...mgrOf(S, p.id) }, objectives: {}, snapshots: {} };
  periods.forEach(per => { const o = S.objs[p.id + "|" + per]; if (o) doc.objectives[per] = { ...o }; const s = S.snaps[p.id + "|" + per]; if (s) doc.snapshots[per] = { ...s }; });
  return doc;
}
// nombre de compétences autonomes, écarts entre auto-évaluation et manager
export function personStats(S, p, cats) {
  let total = 0, mast = 0, gaps = 0; const m = mgrOf(S, p), s = selfOf(S, p);
  cats.forEach(c => c.levels.forEach(l => l.skills.forEach(k => { total++; if (m[k.id] === 2) mast++; if (m[k.id] != null && s[k.id] != null && m[k.id] !== s[k.id]) gaps++; })));
  return { total, mast, gaps };
}
