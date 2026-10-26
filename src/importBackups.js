// V145 — Sauvegarde automatique du planning avant chaque import (et avant chaque restauration).
// Chaque copie = un document Firestore planning/backup_<horodatage> (build bêta : planning/beta_backup_…), pour rester loin de la limite de
// 1 Mo par document ; la liste des copies (les 14 dernières) = planning/importIndex. MS Project reste la source de vérité : une copie sert
// uniquement à revenir en arrière si un mauvais fichier a été importé. Les saisies faites sur le site (états, avancement, commentaires…)
// vivent dans d'autres documents et ne sont jamais touchées par une restauration.
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { buildEntry, appendChangeLog } from "./changeLog";

const PFX = process.env.REACT_APP_BETA === "1" ? "beta_" : "";
export const BACKUPS_KEPT = 14;
const CUR = () => doc(db, "planning", PFX + "current");
const IDX = () => doc(db, "planning", PFX + "importIndex");
const BK = id => doc(db, "planning", PFX + "backup_" + id);
const plain = o => JSON.parse(JSON.stringify(o)); // Firestore refuse les undefined

export async function loadBackupIndex() {
  const snap = await getDoc(IDX());
  return snap.exists() ? (snap.data().entries || []) : [];
}

// Copie « before » (document planning/current tel qu'il était). Rien à copier si le planning était vide.
export async function saveBackup(before, { by = "", reason = "import" } = {}) {
  if (!before || !Array.isArray(before.rows) || !before.rows.length) return null;
  const now = new Date();
  const id = now.toISOString().replace(/\D/g, "").slice(0, 17); // aaaammjjhhmmssmmm
  const entry = { id, at: now.toISOString(), by, reason, count: before.rows.length, lastImport: before.lastImport || "", indice: before.indice || "" };
  await setDoc(BK(id), plain({ rows: before.rows, lastImport: entry.lastImport, indice: entry.indice, savedAt: entry.at, by, reason }));
  let entries = [];
  try { entries = await loadBackupIndex(); } catch (e) { console.warn("Index des copies illisible :", e); }
  entries = [entry, ...entries];
  const dropped = entries.slice(BACKUPS_KEPT);
  await setDoc(IDX(), { entries: entries.slice(0, BACKUPS_KEPT) });
  for (const d of dropped) { try { await deleteDoc(BK(d.id)); } catch (e) { console.warn("Ancienne copie non supprimée :", e); } }
  return entry;
}

// Remet le planning d'une copie. Le planning actuel est d'abord copié lui aussi : la restauration est elle-même réversible.
export async function restoreBackup(id, { by = "" } = {}) {
  const snap = await getDoc(BK(id));
  if (!snap.exists()) throw new Error("Cette copie n'existe plus.");
  const b = snap.data();
  if (!Array.isArray(b.rows) || !b.rows.length) throw new Error("Cette copie est vide.");
  const curSnap = await getDoc(CUR());
  const before = curSnap.exists() ? curSnap.data() : null;
  await saveBackup(before, { by, reason: "avant restauration" });
  await setDoc(CUR(), { rows: b.rows, lastImport: b.lastImport || "", indice: b.indice || "" });
  if (before && Array.isArray(before.rows) && before.rows.length) {
    try {
      await appendChangeLog(buildEntry(before.rows, b.rows, { source: "restauration", by, indice: b.indice || "", label: b.lastImport || "", prevLabel: before.lastImport || "", prevIndice: before.indice || "" }));
    } catch (e) { console.warn("Journal des modifications non enregistré (la restauration est bien faite) :", e); }
  }
  return { count: b.rows.length, lastImport: b.lastImport || "", indice: b.indice || "" };
}
