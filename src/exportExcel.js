import { T, setThemeMode, isDarkMode, getThemeId, isPresentation } from "./theme";
import { ETAT_META, GAMME_COLORS } from "./pjMeta";
import { buildPlanningWorkbook } from "./exportExcelBuild";

// ── Export Excel de la liste (v128) : chargement d'ExcelJS à la demande + palette claire du site + téléchargement ──
// ExcelJS (et non SheetJS, qui ne sait ni colorer ni créer de tableau) est chargé depuis un CDN la première fois seulement.
const SOURCES = [
  "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js",
];
export const loadExcel = () => loadExcelJS(); // v423 : réutilisé par l'export de l'avancement
function loadExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  const tryLoad = i => new Promise((resolve, reject) => {
    if (i >= SOURCES.length) return reject(new Error("ExcelJS indisponible"));
    const s = document.createElement("script"); s.src = SOURCES[i]; s.async = true;
    s.onload = () => window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error("ExcelJS absent"));
    s.onerror = () => { s.remove(); tryLoad(i + 1).then(resolve, reject); };
    document.head.appendChild(s);
  });
  return tryLoad(0);
}
// Couleurs du site en version claire, même si l'écran est en mode sombre (un fichier Excel s'imprime et s'envoie sur fond blanc)
function sitePalette() {
  const wasDark = isDarkMode(), wasTheme = getThemeId(), wasPres = isPresentation(); setThemeMode(false, "marine", false); // charte Marine, quel que soit le thème affiché
  try {
    const etat = {}; Object.keys(ETAT_META).forEach(k => { etat[k] = { label: ETAT_META[k].label, bg: ETAT_META[k].bg, text: ETAT_META[k].text }; });
    return { header: T.navy700, line: T.line, ink: T.ink900, muted: T.ink500, red: T.red500, green: T.emerald600, bar: T.teal500, gamme: { ...GAMME_COLORS }, etat };
  } finally { setThemeMode(wasDark, wasTheme, wasPres); }
}
// v384 : extract des besoins turbines (ORC / SAV) pour le responsable des turbines — une feuille, en-têtes clairs, filtres, totaux par type
export async function exportTurbineNeedsXlsx(lines) {
  const ExcelJS = await loadExcelJS(), wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Besoins turbines", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [{ header: "Type de turbine", key: "type", width: 16 }, { header: "Nombre", key: "nombre", width: 10 }, { header: "Date du besoin", key: "date", width: 16 },
    { header: "SAV ou Prod ORC", key: "origine", width: 20 }, { header: "Roue", key: "roue", width: 18 }, { header: "Injecteur", key: "injecteur", width: 24 }];
  lines.forEach(l => ws.addRow({ ...l, date: l.date ? new Date(l.date + "T12:00:00") : "" }));
  ws.getColumn("date").numFmt = "dd/mm/yyyy"; ws.getColumn("nombre").alignment = { horizontal: "right" };
  const h = ws.getRow(1); h.font = { bold: true, color: { argb: "FF18202E" } }; h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9EDF2" } }; h.height = 22;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1 + lines.length, column: 6 } };
  const tot = {}; lines.forEach(l => { tot[l.type] = (tot[l.type] || 0) + (+l.nombre || 0); });
  ws.addRow([]); Object.keys(tot).sort().forEach(t => { const r = ws.addRow({ type: "Total " + t, nombre: tot[t] }); r.font = { bold: true }; });
  ws.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  const buf = await wb.xlsx.writeBuffer(), blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "Besoins_turbines_" + new Date().toLocaleDateString("fr-FR").replaceAll("/", "-") + ".xlsx";
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export async function exportPlanningXlsx(records) {
  const ExcelJS = await loadExcelJS();
  const wb = buildPlanningWorkbook(ExcelJS, records, sitePalette());
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "Planning_Enogia_" + new Date().toLocaleDateString("fr-FR").replaceAll("/", "-") + ".xlsx";
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
