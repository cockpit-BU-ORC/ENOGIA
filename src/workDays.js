// v213 (demandé : « le calendrier de production pour faire disparaître des jours de prod doit être dispo directement sur
// l'onglet Calendrier ; toute modification doit avoir un impact sur le Gantt en fractionnant les tâches et en enlevant la charge »).
// Jours non travaillés : fermetures de l'atelier (closurePeriods : périodes { start, end, label }) et jours sans production
// d'un PJ (productionExclusions : { PJ: [dateIso…] }).
import { toLocalISO } from "./parsers";
const iso = v => { if (!v) return ""; const d = v instanceof Date ? v : new Date(v); return isNaN(d) ? "" : toLocalISO(d); };
export const isClosedDay = (closurePeriods, d) => { const k = iso(d); return (closurePeriods || []).some(p => p && p.start && iso(p.start) <= k && k <= iso(p.end || p.start)); };
export const isWeekend = d => { const x = d instanceof Date ? d : new Date(iso(d) + "T12:00:00"); return x.getDay() === 0 || x.getDay() === 6; };
// Ferme un jour pour tout l'atelier (ajoute une période d'un jour) ou le rouvre (coupe la ou les périodes qui le couvrent).
export function toggleClosedDay(closurePeriods, d) {
  const k = iso(d), list = closurePeriods || [];
  if (!isClosedDay(list, k)) return [...list, { start: k, end: k, label: "Jour non travaillé" }];
  const prev = x => { const t = new Date(x + "T12:00:00"); t.setDate(t.getDate() - 1); return toLocalISO(t); }, next = x => { const t = new Date(x + "T12:00:00"); t.setDate(t.getDate() + 1); return toLocalISO(t); };
  const out = [];
  list.forEach(p => { const a = iso(p.start), b = iso(p.end || p.start); if (!(a <= k && k <= b)) { out.push(p); return; } if (a < k) out.push({ ...p, start: a, end: prev(k) }); if (k < b) out.push({ ...p, start: next(k), end: b }); });
  return out;
}
// Jours ouvrés d'une période (lundi → vendredi, hors fermetures et jours exclus du PJ).
export function workDaysBetween(start, end, closurePeriods, excluded) {
  const a = iso(start), b = iso(end); if (!a || !b || b < a) return [];
  const ex = new Set(excluded || []), out = []; const d = new Date(a + "T12:00:00");
  for (let i = 0; i < 800; i++) { const k = toLocalISO(d); if (k > b) break; if (!isWeekend(d) && !isClosedDay(closurePeriods, k) && !ex.has(k)) out.push(k); d.setDate(d.getDate() + 1); }
  return out;
}
// Plages (jours consécutifs) non travaillées d'un PJ entre deux dates, hors week-ends : [{ from, to, kind: "closed" | "excluded" }]
export function gapRanges(start, end, closurePeriods, excluded) {
  const a = iso(start), b = iso(end); if (!a || !b || b < a) return [];
  const ex = new Set(excluded || []), out = []; const d = new Date(a + "T12:00:00"); let cur = null;
  for (let i = 0; i < 800; i++) { const k = toLocalISO(d); if (k > b) break;
    const kind = isWeekend(d) ? null : isClosedDay(closurePeriods, k) ? "closed" : ex.has(k) ? "excluded" : null;
    if (kind && cur && cur.kind === kind) cur.to = k; else if (kind) { cur = { from: k, to: k, kind }; out.push(cur); } else if (!isWeekend(d)) cur = null;
    d.setDate(d.getDate() + 1); }
  return out;
}
