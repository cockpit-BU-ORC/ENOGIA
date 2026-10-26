// ── Export Excel de la liste (v128) : un vrai tableau Excel, aux couleurs du site ───────────────────────────────
// Fonction pure (aucun import) : reçoit la bibliothèque ExcelJS, les lignes déjà filtrées / triées de la liste et la palette
// du site (version claire). Produit un classeur avec un objet « Tableau » Excel : boutons de filtre dans l'en-tête, lignes
// alternées, en-tête et colonne PJ figés, vraies dates (triables), avancement en pourcentage avec barre, dérive en jours.
export const XL_COLUMNS = [
  ["N° PJ", 12], ["N° de série", 22], ["Projet", 30], ["Pays", 14], ["Chef de projet", 22], ["Gamme", 12], ["État", 20],
  ["Arrivée", 12], ["Tests (début)", 13], ["Tests (fin)", 12], ["Fin de prod", 12], ["Départ", 12], ["Dérive du départ (j)", 14], ["Avancement", 14],
];
const argb = hex => "FF" + String(hex || "#000000").replace("#", "").toUpperCase();
// 'AAAA-MM-JJ…' → date Excel exacte (minuit UTC : ExcelJS convertit sans décalage de fuseau)
const day = v => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(typeof v === "string" ? v : v && v.toISOString ? v.toISOString() : ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };

export function buildPlanningWorkbook(ExcelJS, rows, pal) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Planning ENOGIA"; wb.created = new Date();
  const ws = wb.addWorksheet("Planning", { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }], properties: { tabColor: { argb: argb(pal.header) } } });
  const border = { style: "thin", color: { argb: argb(pal.line) } };
  const cell = { top: border, bottom: border, left: border, right: border };
  ws.addTable({
    name: "Planning", ref: "A1", headerRow: true, totalsRow: false,
    style: { theme: "TableStyleLight1", showRowStripes: true },
    columns: XL_COLUMNS.map(([name]) => ({ name, filterButton: true })),
    rows: rows.map(r => [r.pj, r.serie || "", r.projet || "", r.pays || "", r.chef || "", r.gamme || "", r.etatLabel || "",
      day(r.arrivee), day(r.testsDebut), day(r.testsFin), day(r.finProd), day(r.depart),
      r.drift == null ? null : r.drift, r.avancement == null ? null : Math.max(0, Math.min(1, r.avancement / 100))]),
  });
  XL_COLUMNS.forEach(([, w], i) => { ws.getColumn(i + 1).width = w; });
  const font = (color, bold) => ({ name: "Calibri", size: 11, bold: !!bold, color: { argb: argb(color) } });

  // En-tête : bleu marine du site, texte blanc, deux lignes de hauteur pour les libellés longs
  const head = ws.getRow(1); head.height = 32;
  head.eachCell(c => { c.font = font("#FFFFFF", true); c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(pal.header) } }; c.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; c.border = cell; });
  head.getCell(1).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

  rows.forEach((r, i) => {
    const row = ws.getRow(i + 2); row.height = 20;
    row.eachCell({ includeEmpty: true }, (c, col) => {
      if (col > XL_COLUMNS.length) return;
      c.border = cell; c.alignment = { vertical: "middle", horizontal: col >= 8 ? "center" : "left" }; c.font = font(pal.ink, false);
    });
    const set = (col, fnt, fill) => { const c = row.getCell(col); if (fnt) c.font = fnt; if (fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(fill) } }; return c; };
    set(1, font(pal.ink, true));
    const g = pal.gamme[r.gamme]; if (g) set(6, font(g, true));                       // gamme : couleur de la gamme
    const e = pal.etat[r.etat]; if (e) { const c = set(7, font(e.text, true), e.bg); c.alignment = { vertical: "middle", horizontal: "center" }; } // état : pastille du site
    [8, 9, 10, 11, 12].forEach(col => { row.getCell(col).numFmt = "dd/mm/yyyy"; });
    set(12, font(r.drift > 0 ? pal.red : pal.ink, true));                             // départ en gras, rouge s'il a glissé
    const d = row.getCell(13); d.numFmt = '+0;-0;0'; d.font = font(r.drift > 0 ? pal.red : r.drift < 0 ? pal.green : pal.muted, r.drift != null && r.drift !== 0);
    row.getCell(14).numFmt = "0%";
  });
  if (rows.length) ws.addConditionalFormatting({ ref: "N2:N" + (rows.length + 1), rules: [{ type: "dataBar", gradient: false, showValue: true, minLength: 0, maxLength: 100, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }], color: { argb: argb(pal.bar) } }] });
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  return wb;
}
