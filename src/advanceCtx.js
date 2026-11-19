// v423 : avancement global des machines (orcAdvance), calculé une fois par App et partagé (fiche projet, export Excel du DAF)
import { createContext } from "react";
import { ADV_PHASES } from "./orcAdvance";
// { map: { [PJ]: { pct, phases } }, rows: [{ pj, nom, ... }] }
export const AdvanceCtx = createContext(null);

// Export Excel : une ligne par machine — PJ, nom du projet, avancement global, puis le détail des 7 phases ; chargé à la demande
export async function exportAdvanceXlsx(rows) {
  const { loadExcel } = await import("./exportExcel");
  const ExcelJS = await loadExcel(), wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Avancement", { views: [{ state: "frozen", ySplit: 1, xSplit: 2 }] });
  ws.columns = [{ header: "PJ", key: "pj", width: 14 }, { header: "Nom du projet", key: "nom", width: 32 }, { header: "Avancement global", key: "pct", width: 18 },
    ...ADV_PHASES.map(([k, l, w]) => ({ header: l + " (" + w + " %)", key: k, width: Math.max(12, Math.min(26, l.length + 6)) })), { header: "État", key: "etat", width: 22 }];
  rows.forEach(x => ws.addRow({ pj: x.pj, nom: x.nom, pct: x.pct / 100, etat: x.etat, ...Object.fromEntries(x.phases.map(p => [p.k, p.done])) }));
  ws.getColumn("pct").numFmt = "0%"; ADV_PHASES.forEach(([k]) => { ws.getColumn(k).numFmt = "0%"; ws.getColumn(k).alignment = { horizontal: "right" }; });
  ws.getColumn("pct").font = { bold: true };
  const h = ws.getRow(1); h.font = { bold: true, color: { argb: "FF18202E" } }; h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9EDF2" } }; h.height = 30; h.alignment = { vertical: "middle", wrapText: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1 + rows.length, column: ws.columns.length } };
  ws.addRow([]); const note = ws.addRow({ pj: "Avancement global = KOM 5 % · Design 20 % · Achats et approvisionnements 20 % · Fabrication et assemblage atelier 25 % · FAT 10 % · Livraison et expédition 15 % · MES 5 % ; chaque phase de 0 à 100 %. Extrait du Cockpit BU ORC le " + new Date().toLocaleDateString("fr-FR") + "." });
  note.font = { italic: true, color: { argb: "FF52607A" } };
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  const buf = await wb.xlsx.writeBuffer(), blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "Avancement_projets_ORC_" + new Date().toLocaleDateString("fr-FR").replaceAll("/", "-") + ".xlsx";
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
