// Lecture d'un fichier planning MS Project (.xlsx / .xls / .txt) vers les lignes de l'appli, SANS rien écrire en base.
// Même lecture que le bouton « Importer un planning » (parseMSProjectRows). Utilisé par la comparaison de deux fichiers.
import { parseMSProjectRows } from "./parsers";

export async function readPlanningFile(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    if (!window.XLSX) throw new Error("Librairie Excel en cours de chargement, réessayez dans 2 s.");
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });
    const aff = wb.SheetNames.find(n => n.toLowerCase().includes("affectation"));
    const affRows = aff ? window.XLSX.utils.sheet_to_json(wb.Sheets[aff], { header: 1, raw: false }) : null;
    const parsed = parseMSProjectRows(rows, affRows);
    if (!parsed || !parsed.length) throw new Error("Aucun PJ reconnu dans « " + file.name + " » (colonnes Nom / Début / Niveau hiérarchique).");
    return parsed;
  }
  const rows = (await file.text()).trim().split("\n").map(l => l.split("\t"));
  const parsed = parseMSProjectRows(rows);
  if (!parsed || !parsed.length) throw new Error("Aucun PJ reconnu dans « " + file.name + " ».");
  return parsed;
}
