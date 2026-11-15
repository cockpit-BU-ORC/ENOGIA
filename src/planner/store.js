// Persistance Firestore du module de planification.
//   planning/plan         : le plan en cours d'édition (brouillon partagé, enregistré automatiquement)
//   planning/planHistory  : les 8 dernières publications (plan + lignes publiées avant, pour pouvoir annuler)
//   planning/current      : le planning « actuel » lu par tous les écrans (écrit uniquement à la publication)
// Build bêta : documents préfixés beta_ (voir App.js), la production n'est jamais touchée.
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { guessGamme } from "../parsers";
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
// v258 : pjOff = jours sans production de chaque PJ (Calendrier) — le planificateur les compte ; sans eux ici, les dates publiées
// différaient de celles affichées et les mêmes changements revenaient après « Publier » (« ça ne se publie pas »).
// announce = ensemble « PJ|champ » des changements annoncés aux utilisateurs (journal des modifications, cloche, repères) ;
// tout est publié dans le planning, seuls les changements cochés sont annoncés. null = tout annoncer.
export async function publishPlan({ plan: plan0, closurePeriods, productionExclusions, by, note, announce }) {
  // v350 (audit de performance) : le moteur n'est chargé qu'à la publication (il n'est plus dans le paquet de départ)
  const { makeCalendar, schedule, planToRows, diffRows, applyPendingDeparts, ROW_FIELDS } = await import("./engine");
  const snap = await getDoc(CURRENT_REF());
  const cur = snap.exists() ? snap.data() : {};
  const curRows = cur.rows || [];
  const cal = makeCalendar({ closurePeriods, holidays: !(plan0.cal && plan0.cal.holidays === false), pjOff: productionExclusions || null });
  // v312 : départs changés entre-temps dans la Liste / le Gantt / le Calendrier → reportés dans le plan avant de publier
  const pend = cur.pendingDeparts && Object.keys(cur.pendingDeparts).length ? applyPendingDeparts(plan0, cal, cur.pendingDeparts) : null;
  const plan = pend ? pend.plan : plan0;
  if (pend) await savePlan(plan, by);
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
  const { pendingDeparts: _pd, ...curRest } = cur; // eslint-disable-line no-unused-vars -- v312 : reportés dans le plan
  await setDoc(CURRENT_REF(), { ...curRest, rows: plain(rows), lastImport: new Date(at).toLocaleString("fr-FR"), lastPublish: { at, by: by || "" } });
  const shown = announcedRows(curRows, rows, announce, { diffRows, ROW_FIELDS });
  if (shown) try { await appendChangeLog(buildEntry(curRows, shown, { source: "publication", by: by || "", note: note || "", label: new Date(at).toLocaleString("fr-FR"), prevLabel: cur.lastImport || "", prevIndice: cur.indice || "", indice: cur.indice || "" })); }
  catch (e) { console.warn("Journal des modifications non enregistré (la publication est bien faite) :", e); }
  return { nChanges: changes.length, rows, nAnnounced: shown ? diffRows(curRows, shown).length : 0 };
}
// Lignes « telles qu'annoncées » : l'état d'avant, avec seulement les changements cochés. null si rien n'est annoncé.
export function announcedRows(curRows, rows, announce, { diffRows, ROW_FIELDS }) {
  if (!announce) return rows;
  if (!announce.size) return null;
  const old = {}; (curRows || []).forEach(r => { old[r.pj] = r; });
  const out = (rows || []).map(r => {
    const o = old[r.pj]; if (!o) return announce.has(r.pj + "|new") ? r : null;
    const x = { ...o }; [...ROW_FIELDS, "heuresAtelier", "heuresAutom"].forEach(f => { if (announce.has(r.pj + "|" + f)) x[f] = r[f]; }); return x;
  }).filter(Boolean);
  return diffRows(curRows, out).length ? out : null;
}

// v312 (demandé : « changer les dates de départ directement sur Liste, Gantt ou Calendrier, accès aux admins ») : le départ est changé
// tout de suite dans le planning publié (tout le monde le voit), annoncé dans le journal des modifications, et noté dans
// pendingDeparts pour être reporté dans le plan du planificateur (à son ouverture, ou au plus tard à la publication).
export async function setDepartDate(pj, iso, by) {
  const snap = await getDoc(CURRENT_REF());
  const cur = snap.exists() ? snap.data() : {};
  const curRows = cur.rows || [];
  if (!curRows.some(r => r.pj === pj)) throw new Error(pj + " n'est pas dans le planning publié.");
  const rows = curRows.map(r => r.pj === pj ? { ...r, depart: iso } : r);
  const at = new Date().toISOString();
  const pendingDeparts = { ...(cur.pendingDeparts || {}), [pj]: { date: iso, by: by || "", at } };
  await setDoc(CURRENT_REF(), { ...cur, rows: plain(rows), pendingDeparts });
  try { await appendChangeLog(buildEntry(curRows, rows, { source: "modification", by: by || "", note: "Départ de " + pj + " changé hors planificateur", label: new Date(at).toLocaleString("fr-FR"), prevLabel: cur.lastImport || "", prevIndice: cur.indice || "", indice: cur.indice || "" })); }
  catch (e) { console.warn("Journal des modifications non enregistré :", e); }
}
// Retire des départs en attente ceux qui ont été reportés dans le plan.
export async function clearPendingDeparts(pjs) {
  const snap = await getDoc(CURRENT_REF());
  const cur = snap.exists() ? snap.data() : {};
  const p = { ...(cur.pendingDeparts || {}) }; (pjs || []).forEach(k => { delete p[k]; });
  await setDoc(CURRENT_REF(), { ...cur, pendingDeparts: p });
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
