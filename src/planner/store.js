// Persistance Firestore du module de planification.
//   planning/plan         : le plan en cours d'édition (brouillon partagé, enregistré automatiquement)
//   planning/planHistory  : les 8 dernières publications (plan + lignes publiées avant, pour pouvoir annuler)
//   planning/current      : le planning « actuel » lu par tous les écrans (écrit uniquement à la publication)
// Build bêta : documents préfixés beta_ (voir App.js), la production n'est jamais touchée.
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { guessGamme } from "../parsers";
import { makeCalendar, schedule, planToRows, diffRows } from "./engine";
import { buildEntry, appendChangeLog } from "../changeLog";

const PFX = process.env.REACT_APP_BETA === "1" ? "beta_" : "";
const PLAN_REF = () => doc(db, "planning", PFX + "plan");
const HIST_REF = () => doc(db, "planning", PFX + "planHistory");
const CURRENT_REF = () => doc(db, "planning", PFX + "current");
const plain = o => JSON.parse(JSON.stringify(o)); // retire les undefined (refusés par Firestore)

export function listenPlan(cb) {
  return onSnapshot(PLAN_REF(), snap => cb(snap.exists() ? snap.data() : null), err => console.error("Erreur Firestore (plan):", err));
}
export async function savePlan(plan, by) {
  await setDoc(PLAN_REF(), { plan: plain(plan), updatedAt: new Date().toISOString(), updatedBy: by || "" });
}
export async function loadHistory() {
  const snap = await getDoc(HIST_REF());
  return snap.exists() ? (snap.data().entries || []) : [];
}

// Publie le plan dans le planning actuel. On relit « current » juste avant d'écrire (pas l'état local, qui peut être en retard),
// on garde les lignes d'avant dans l'historique, et on ne touche qu'aux PJ présents dans le plan.
export async function publishPlan({ plan, closurePeriods, by, note }) {
  const snap = await getDoc(CURRENT_REF());
  const cur = snap.exists() ? snap.data() : {};
  const curRows = cur.rows || [];
  const cal = makeCalendar({ closurePeriods, holidays: !(plan.cal && plan.cal.holidays === false) });
  const sched = schedule(plan, cal);
  if (sched.cycle) throw new Error("Le plan contient une boucle de liens : " + sched.cycle.slice(0, 4).join(", "));
  const rows = planToRows(plan, sched, curRows, guessGamme, cal);
  const changes = diffRows(curRows, rows);
  const at = new Date().toISOString();
  let entries = [];
  try { entries = await loadHistory(); } catch (e) { console.warn(e); }
  entries = [plain({ at, by: by || "", note: note || "", nChanges: changes.length, plan, prevRows: curRows }), ...entries].slice(0, 8);
  while (JSON.stringify(entries).length > 900000 && entries.length > 1) entries.pop(); // limite Firestore : 1 Mo par document
  await setDoc(HIST_REF(), { entries });
  await setDoc(CURRENT_REF(), { ...cur, rows: plain(rows), lastImport: new Date(at).toLocaleString("fr-FR"), lastPublish: { at, by: by || "" } });
  try { await appendChangeLog(buildEntry(curRows, rows, { source: "publication", by: by || "", note: note || "", label: new Date(at).toLocaleString("fr-FR"), prevLabel: cur.lastImport || "", prevIndice: cur.indice || "", indice: cur.indice || "" })); }
  catch (e) { console.warn("Journal des modifications non enregistré (la publication est bien faite) :", e); }
  return { nChanges: changes.length, rows };
}

// Annule une publication : remet dans « current » les lignes d'avant cette publication.
export async function restorePublication(at) {
  const entries = await loadHistory();
  const e = entries.find(x => x.at === at);
  if (!e || !e.prevRows) throw new Error("Version introuvable dans l'historique.");
  const snap = await getDoc(CURRENT_REF());
  const cur = snap.exists() ? snap.data() : {};
  await setDoc(CURRENT_REF(), { ...cur, rows: e.prevRows, lastImport: new Date().toLocaleString("fr-FR"), lastPublish: { at: new Date().toISOString(), by: "annulation de la publication du " + new Date(at).toLocaleString("fr-FR") } });
}
