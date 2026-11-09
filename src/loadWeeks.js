// v289 (lot G « rapidité ») : calculs de charge atelier sortis de KpiPilotage.js, pour que l'accueil ne charge pas
// les graphiques du Manager au démarrage. KpiPilotage.js ré-exporte tout (imports existants inchangés).
import { toLocalISO, weekStartOf } from "./parsers";
import { workDaysBetween, isClosedDay } from "./workDays";
import { makeCalendar, schedule, loadModel, capWeek } from "./planner/engine";
// v282 (audit apple-design) : une seule capacité d'atelier pour tout le site — celle du planificateur (personnes × heures),
// 175 h par semaine seulement s'il n'y a pas de plan. Les semaines avec fermeture ou capacité spéciale gardent la leur.
export const CAPA_DEFAUT = 175;
export const atelierCap = plan => { try { if (plan && plan.v === 2) { const c = Math.round(capWeek(plan)); if (c > 0) return c; } } catch (e) {} return CAPA_DEFAUT; };
export const isoWeek = d => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - n); const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y) / 86400000 + 1) / 7); };
// v219 (demandé : « prendre la charge en fonction de l'onglet planificateur ») : si le plan du planificateur est disponible, la charge
// (heures planifiées et capacité, y compris les semaines à capacité spéciale) vient de lui ; sinon, du planning et de 175 h / semaine.
export function planWeeks(plan, closurePeriods, productionExclusions, n, from) {
  if (!plan || plan.v !== 2) return null;
  const cal = makeCalendar({ closurePeriods, holidays: !(plan.cal && plan.cal.holidays === false), pjOff: productionExclusions });
  const lm = loadModel(plan, schedule(plan, cal), cal), byWeek = {}; (lm.weeks || []).forEach(w => { byWeek[w.week] = w; });
  const out = []; for (let i = 0; i < n; i++) { const a = new Date(from); a.setDate(a.getDate() + 7 * i); const k = toLocalISO(a), w = byWeek[k];
    let cap = w ? w.cap : null; if (cap == null) { let days = 0; for (let j = 0; j < 5; j++) { const d = new Date(a); d.setDate(d.getDate() + j); if (cal.isWork(toLocalISO(d))) days++; } const ov = plan.capWeeks && plan.capWeeks[k]; cap = ov != null ? Number(ov) : lm.capDay * days; }
    out.push({ key: k, a, hours: Math.round(w ? w.hours : 0), cap }); }
  return out;
}
// v246 : charge atelier sur n semaines à partir du lundi `from` (planificateur si disponible, sinon planning + capacité hebdomadaire),
// partagée par la Synthèse et la sous-page Semaines.
export function loadWeeks(rows, closurePeriods, productionExclusions, capaWeek, plan, n, from) {
  const w0 = weekStartOf(from), out = [];
  for (let i = 0; i < n; i++) { const a = new Date(w0); a.setDate(a.getDate() + 7 * i); let days = 0; for (let k = 0; k < 5; k++) { const d = new Date(a); d.setDate(d.getDate() + k); if (!isClosedDay(closurePeriods, d)) days++; } out.push({ key: toLocalISO(a), a, hours: 0, cap: capaWeek * days / 5 }); }
  const idx = Object.fromEntries(out.map((w, i) => [w.key, i]));
  rows.forEach(r => {
    if (!r.arrivee || !r.finProd || !r.heuresAtelier || r.etat === "SHIPPED") return;
    const days = workDaysBetween(r.arrivee, r.finProd, closurePeriods, (productionExclusions || {})[r.pj]); if (!days.length) return;
    days.forEach(k => { const i = idx[toLocalISO(weekStartOf(new Date(k + "T12:00:00")))]; if (i != null) out[i].hours += r.heuresAtelier / days.length; });
  });
  return planWeeks(plan, closurePeriods, productionExclusions, n, w0) || out.map(w => ({ ...w, hours: Math.round(w.hours) }));
}
const SHORT_MONTHS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
export const weekLabel = a => "S" + isoWeek(a) + " · " + a.getDate() + " " + SHORT_MONTHS[a.getMonth()];
