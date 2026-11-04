// v274 (demandé : « pour les KPI, pas assez d'information sur les mois passés : la liste des accomplissements du mois dernier et du mois
// d'avant, et les objectifs du mois en cours et du mois suivant ») : calcul pur, testé dans monthReview.test.js.
// Pour un mois (« 2026-10 ») : les jalons du planning qui tombent dans le mois — arrivées en atelier, début et fin des tests, fins de
// production, départs — avec, pour chacun, fait / à venir / en retard (date passée sans que l'état ait suivi, pour les départs) et l'écart
// avec le planning initial. PJXX (estimations) et slots libres exclus.
import { isEstimatePj } from "./changeDiff";

export const MONTH_EVENTS = [
  { k: "depart", l: "Départs", one: "Départ" },
  { k: "finProd", l: "Fins de production", one: "Fin de production" },
  { k: "testsFin", l: "Tests terminés", one: "Fin des tests" },
  { k: "tests", l: "Débuts de tests", one: "Début des tests" },
  { k: "arrivee", l: "Arrivées en atelier", one: "Arrivée" },
];
const iso = v => { if (!v) return ""; const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const d = new Date(s); return isNaN(d) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const days = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
export const monthKey = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
export const addMonths = (key, n) => { const [y, m] = key.split("-").map(Number), d = new Date(y, m - 1 + n, 1); return monthKey(d); };
export const monthLabel = key => { const [y, m] = key.split("-").map(Number); const s = new Date(y, m - 1, 15).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); return s.charAt(0).toUpperCase() + s.slice(1); };
// états qui prouvent que le jalon est franchi (sinon : date passée mais pas fait = en retard)
const DONE_ETATS = { depart: ["SHIPPED"], finProd: ["TESTS", "PACKAGING", "SHIPPED", "STOCKAGE_EXT"], testsFin: ["PACKAGING", "SHIPPED", "STOCKAGE_EXT"] };

// rows : planning actuel ; initialByPj : { PJ: ligne du planning initial } ; today : Date
export function monthReview(rows, initialByPj, key, today = new Date()) {
  const t0 = iso(today), out = MONTH_EVENTS.map(e => ({ ...e, items: [] }));
  (rows || []).forEach(r => {
    if (!r || !r.pj || isEstimatePj(r.pj) || r.etat === "SLOT_LIBRE") return;
    out.forEach(e => {
      const d = iso(r[e.k]); if (!d || d.slice(0, 7) !== key) return;
      const ini = initialByPj && initialByPj[r.pj] ? iso(initialByPj[r.pj][e.k]) : "";
      const past = d <= t0, etatDone = DONE_ETATS[e.k] ? DONE_ETATS[e.k].some(x => String(r.etat || "").toUpperCase().replace(/\s+/g, "_") === x.replace(/\s+/g, "_") || String(r.etat || "").toUpperCase() === x) : true;
      const st = !past ? "todo" : etatDone ? "done" : "late";
      e.items.push({ pj: r.pj, r, date: d, ini, drift: ini ? days(ini, d) : null, st });
    });
  });
  out.forEach(e => e.items.sort((a, b) => a.date.localeCompare(b.date) || a.pj.localeCompare(b.pj)));
  const n = k => (out.find(e => e.k === k) || { items: [] }).items;
  return { key, groups: out, done: out.reduce((s, e) => s + e.items.filter(i => i.st === "done").length, 0), todo: out.reduce((s, e) => s + e.items.filter(i => i.st === "todo").length, 0),
    late: out.reduce((s, e) => s + e.items.filter(i => i.st === "late").length, 0), departs: n("depart").length, shipped: n("depart").filter(i => i.st === "done").length };
}
