// Journal des versions du planning : à chaque nouveau planning (import MS Project),
// on garde l'écart entre l'ANCIENNE et la NOUVELLE version (PJ qui ont bougé, écarts en jours, heures, PJ ajoutés/retirés).
// Document Firestore planning/changeLog = { entries: [ … ] }, les 20 plus récents d'abord. Build bêta : planning/beta_changeLog.
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { summarizeChanges, cleanEntry, isEstimatePj } from "./changeDiff";

const PFX = process.env.REACT_APP_BETA === "1" ? "beta_" : "";
const REF = () => doc(db, "planning", PFX + "changeLog");
const plain = o => JSON.parse(JSON.stringify(o)); // retire les undefined (refusés par Firestore)
const MAX_ENTRIES = 20;

// Entrée compacte : pas les lignes complètes, seulement ce qui a changé.
export function buildEntry(oldRows, newRows, meta) {
  const s = summarizeChanges(oldRows, newRows);
  const inNew = new Set((newRows || []).map(r => r.pj));
  const removed = (oldRows || []).filter(r => !inNew.has(r.pj) && !isEstimatePj(r.pj)).map(r => ({ pj: r.pj, nomProjet: r.nomProjet || null, depart: r.depart || null }));
  const pjs = s.pjs.map(p => ({ pj: p.pj, nomProjet: p.nomProjet || null, isNew: !!p.isNew, d: p.d, hours: p.hours || null, departDelta: p.departDelta, maxShift: p.maxShift, group: p.group, row: { depart: (p.row && p.row.depart) || null } }));
  return plain({ at: new Date().toISOString(), ...meta, stats: s.stats, pjs, removed });
}

export async function loadChangeLog() {
  const snap = await getDoc(REF());
  return snap.exists() ? (snap.data().entries || []).map(cleanEntry) : [];
}

export async function appendChangeLog(entry) {
  let entries = [];
  try { entries = await loadChangeLog(); } catch (e) { console.warn(e); }
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  while (JSON.stringify(entries).length > 900000 && entries.length > 1) entries.pop(); // limite Firestore : 1 Mo par document
  await setDoc(REF(), { entries });
}

export function listenChangeLog(cb) {
  return onSnapshot(REF(), snap => cb(snap.exists() ? (snap.data().entries || []).map(cleanEntry) : []), err => { console.error("Erreur Firestore (changeLog):", err); cb([]); });
}
