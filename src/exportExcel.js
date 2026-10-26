import { T, setThemeMode, isDarkMode, getThemeId, isPresentation } from "./theme";
import { ETAT_META, GAMME_COLORS } from "./pjMeta";
import { buildPlanningWorkbook } from "./exportExcelBuild";

// ── Export Excel de la liste (v128) : chargement d'ExcelJS à la demande + palette claire du site + téléchargement ──
// ExcelJS (et non SheetJS, qui ne sait ni colorer ni créer de tableau) est chargé depuis un CDN la première fois seulement.
const SOURCES = [
  "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js",
];
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
export async function exportPlanningXlsx(records) {
  const ExcelJS = await loadExcelJS();
  const wb = buildPlanningWorkbook(ExcelJS, records, sitePalette());
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "Planning_Enogia_" + new Date().toLocaleDateString("fr-FR").replaceAll("/", "-") + ".xlsx";
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
