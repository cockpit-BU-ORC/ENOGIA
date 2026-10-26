// Écart entre deux versions du planning (lignes MS Project importées) : une entrée par PJ qui a bougé, avec l'écart en jours
// calendaires pour chaque date (positif = plus tard). Le départ est l'indicateur principal.
export const ROW_FIELDS = ["arrivee", "tests", "testsFin", "finProd", "depart"];
const dayNum = iso => { const [y, m, d] = iso.split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };

// Les lignes « PJXXX » du planning MS Project sont des estimations, pas des PJ vendus : jamais dans les modifications du planning.
export const isEstimatePj = pj => /^PJ[\s_-]*X{2,}/i.test(String(pj || ""));
// Entrée déjà enregistrée dans le journal : retire les PJXXX et recalcule les totaux.
export function cleanEntry(e) {
  if (!e || !Array.isArray(e.pjs)) return e;
  const pjs = e.pjs.filter(p => !isEstimatePj(p.pj)), removed = (e.removed || []).filter(p => !isEstimatePj(p.pj));
  if (pjs.length === e.pjs.length && removed.length === (e.removed || []).length) return e;
  const st = { ...(e.stats || {}), nPj: 0, nDates: 0, late: 0, early: 0, maxLate: 0, maxEarly: 0, nNew: 0, nRemoved: removed.length, nHours: 0 };
  pjs.forEach(p => {
    if (p.isNew) { st.nNew++; return; }
    st.nPj++; st.nDates += Object.keys(p.d || {}).length; if (p.hours) st.nHours++;
    const dd = p.departDelta;
    if (dd > 0) { st.late++; st.maxLate = Math.max(st.maxLate, dd); } else if (dd < 0) { st.early++; st.maxEarly = Math.max(st.maxEarly, -dd); }
  });
  return { ...e, pjs, removed, stats: st };
}

export function summarizeChanges(refRowsAll, nowRowsAll) {
  const refRows = (refRowsAll || []).filter(r => !isEstimatePj(r.pj)), nowRows = (nowRowsAll || []).filter(r => !isEstimatePj(r.pj));
  const ref = {}; (refRows || []).forEach(r => { ref[r.pj] = r; });
  const seen = new Set(); const pjs = [];
  const st = { nPj: 0, nDates: 0, late: 0, early: 0, maxLate: 0, maxEarly: 0, nNew: 0, nRemoved: 0, nHours: 0 };
  (nowRows || []).forEach(r => {
    seen.add(r.pj); const a = ref[r.pj];
    if (!a) { st.nNew++; pjs.push({ pj: r.pj, nomProjet: r.nomProjet || null, isNew: true, d: {}, hours: null, departDelta: null, maxShift: 0, group: 4, row: r }); return; }
    const d = {}; let maxShift = 0;
    ROW_FIELDS.forEach(f => { const x = a[f] || null, y = r[f] || null; if (x === y) return; const delta = x && y ? dayNum(y.slice(0, 10)) - dayNum(x.slice(0, 10)) : null; d[f] = { from: x, to: y, delta }; st.nDates++; if (delta !== null) maxShift = Math.max(maxShift, Math.abs(delta)); });
    const hours = {};
    [["heuresAtelier", "at"], ["heuresAutom", "au"]].forEach(([f, k]) => { const x = Number(a[f]) || 0, y = Number(r[f]) || 0; if (Math.round(x * 10) !== Math.round(y * 10)) hours[k] = { from: x, to: y }; });
    const hasH = Object.keys(hours).length > 0; if (hasH) st.nHours++;
    if (!Object.keys(d).length && !hasH) return;
    const dd = d.depart ? d.depart.delta : null;
    if (dd !== null && dd > 0) { st.late++; st.maxLate = Math.max(st.maxLate, dd); } else if (dd !== null && dd < 0) { st.early++; st.maxEarly = Math.max(st.maxEarly, -dd); }
    const group = dd !== null && dd > 0 ? 0 : dd !== null && dd < 0 ? 2 : Object.keys(d).length ? 1 : 3;
    pjs.push({ pj: r.pj, nomProjet: r.nomProjet || a.nomProjet || null, isNew: false, d, hours: hasH ? hours : null, departDelta: dd, maxShift, group, row: r });
  });
  (refRows || []).forEach(r => { if (!seen.has(r.pj)) st.nRemoved++; });
  pjs.sort((x, y) => x.group - y.group || (x.group === 0 ? y.departDelta - x.departDelta : x.group === 2 ? x.departDelta - y.departDelta : y.maxShift - x.maxShift) || (x.pj < y.pj ? -1 : 1));
  st.nPj = pjs.filter(x => !x.isNew).length;
  return { pjs, stats: st };
}
