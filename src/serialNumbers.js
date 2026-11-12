// v315 (demandé : « gestion automatique des S/N pour les ORC : 20XX-YYY-ZZZ ; XX = année, YYY = n° de la machine fabriquée dans l'année,
// ZZZ = gamme (180, 020, 100…) ; le S/N est défini quand la machine arrive chez nous, le reste doit être pré-rempli d'après l'ordo ») :
//  · un S/N déjà saisi (meta.numSerie) est fixé et n'est jamais recalculé ;
//  · les autres machines reçoivent un S/N **prévu** : année de leur arrivée, n° qui suit le plus grand S/N déjà fixé de cette année,
//    dans l'ordre des arrivées du planning (puis du n° de PJ), gamme sur 3 chiffres ;
//  · une machine arrivée (date d'arrivée passée) sans S/N est « à attribuer » : un admin fixe ses S/N prévus en un clic.
// Le S/N prévu bouge avec l'ordo tant qu'il n'est pas fixé (une arrivée avancée prend un n° plus petit).
// Module pur (pas d'import de pjMeta : il reçoit metaOf) ; registre SN_PLAN lu par l'affichage (ProjectLabelCell, fiches).

const SN_RE = /^(20\d\d)-(\d{3})-(\d{2,3})$/; // code de gamme sur 2 chiffres accepté (anciens S/N)
const iso = v => { if (!v) return ""; const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const d = new Date(v); return isNaN(d) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const isEstimate = pj => /^PJ\d*X+/i.test(String(pj || "")); // PJXX, PJ4XX… (estimations, jamais numérotées)

// Gamme → 3 chiffres : « 180LTV3 » → 180, « 20LTV3 » → 020, « 100MT » → 100, « 40LTV2R » → 040. Sans chiffres (« CONTENEUR ») → null.
export function gammeCode(gamme) {
  const m = String(gamme || "").match(/^\s*(\d{1,3})/);
  return m ? m[1].padStart(3, "0") : null;
}
export function parseSn(sn) {
  const m = String(sn || "").trim().match(SN_RE);
  return m ? { year: Number(m[1]), seq: Number(m[2]), code: m[3] } : null;
}
export const formatSn = (year, seq, code) => year + "-" + String(seq).padStart(3, "0") + "-" + (code || "XXX");

// rows : lignes du planning ; metaOf(row) → meta (numSerie) ; today = « AAAA-MM-JJ ».
// → Map pj → { sn, fixed, planned, due, year, seq, code, missingCode }
export function planSerials(rows, metaOf, today) {
  const t = today || iso(new Date());
  const out = new Map(), maxSeq = {};
  const list = (rows || []).filter(r => r && r.pj && !isEstimate(r.pj) && r.etat !== "SLOT_LIBRE");
  const seen = new Set();
  list.forEach(r => {
    if (seen.has(r.pj)) return; seen.add(r.pj);
    const sn = String((metaOf ? metaOf(r) : {}).numSerie || "").trim();
    if (!sn) return;
    const p = parseSn(sn);
    out.set(r.pj, { sn, fixed: true, planned: false, due: false, ...(p || {}) });
    if (p) maxSeq[p.year] = Math.max(maxSeq[p.year] || 0, p.seq);
  });
  const todo = list.filter(r => !out.has(r.pj) && iso(r.arrivee))
    .filter((r, i, a) => a.findIndex(x => x.pj === r.pj) === i)
    .sort((a, b) => iso(a.arrivee).localeCompare(iso(b.arrivee)) || String(a.pj).localeCompare(String(b.pj), "fr", { numeric: true }));
  todo.forEach(r => {
    const a = iso(r.arrivee), year = Number(a.slice(0, 4)), code = gammeCode(r.gamme);
    const seq = (maxSeq[year] || 0) + 1; maxSeq[year] = seq;
    out.set(r.pj, { sn: formatSn(year, seq, code), fixed: false, planned: true, due: a <= t, year, seq, code, missingCode: !code, arrivee: a });
  });
  return out;
}
// Machines arrivées sans S/N, dans l'ordre d'attribution.
export const serialsDue = plan => [...plan.entries()].filter(([, v]) => v.planned && v.due).map(([pj, v]) => ({ pj, ...v }));

// Registre lu par l'affichage (rempli par App à chaque rendu).
export let SN_PLAN = new Map();
export function registerSerialPlan(m) { SN_PLAN = m || new Map(); }
export const plannedSnOf = pj => { const v = SN_PLAN.get(pj); return v && v.planned ? v : null; };
