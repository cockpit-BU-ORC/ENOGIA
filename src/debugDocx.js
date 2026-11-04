// v264 : export Word (.docx) de la checklist de debug, à la forme du modèle « PI105-047-XX0003-A-Check list debug » : A4 paysage,
// tableau d'en-tête (logo ENOGIA | Procédure mise en service / Checklist de Debug ORC | Version : A), N° Projet / Date / Nom et
// prénom, puis le tableau des contrôles (Calibri 9 pt, en-têtes de section sur fond gris BFBFBF, mêmes largeurs de colonnes) ; OK / NOK
// cochés d'une croix, S.O. pour une option sans objet. Ajout par rapport au modèle : le bloc « Validation » avec la signature du testeur.
import { DEBUG_DOC, DEBUG_SECTIONS } from "./debugChecklist";
import { DEBUG_LOGO_PNG, DEBUG_LOGO_EMU } from "./debugLogo";
import { zipStore } from "./zipStore";

const x = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const b64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const frD = iso => { if (!iso) return ""; const d = new Date(String(iso).length <= 10 ? iso + "T12:00:00" : iso); return isNaN(d) ? "" : d.toLocaleDateString("fr-FR"); };
const GREY = "BFBFBF", W = [1795, 574, 555, 1720, 1843, 2410, 992, 4333];
const BORDERS = '<w:tblBorders>' + ["top", "left", "bottom", "right", "insideH", "insideV"].map(k => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="auto"/>').join("") + '</w:tblBorders>';

// paragraphe : texte (sauts de ligne gardés), gras, alignement, taille en demi-points
const p = (text, o = {}) => '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>' + (o.center ? '<w:jc w:val="center"/>' : "") + '</w:pPr>'
  + String(text == null ? "" : text).split("\n").map((t, i) => (i ? '<w:r><w:br/></w:r>' : "") + '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>' + (o.bold ? "<w:b/>" : "") + '<w:sz w:val="' + (o.sz || 18) + '"/><w:szCs w:val="' + (o.sz || 18) + '"/></w:rPr><w:t xml:space="preserve">' + x(t) + '</w:t></w:r>').join("") + '</w:p>';
const tc = (w, content, o = {}) => '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (o.span ? '<w:gridSpan w:val="' + o.span + '"/>' : "") + (o.vMerge ? '<w:vMerge' + (o.vMerge === "restart" ? ' w:val="restart"' : "") + '/>' : "") + (o.fill ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.fill + '"/>' : "") + (o.vc ? '<w:vAlign w:val="center"/>' : "") + '</w:tcPr>' + (content || p("")) + '</w:tc>';
const tr = (cells, h) => '<w:tr>' + (h ? '<w:trPr><w:trHeight w:val="' + h + '"/></w:trPr>' : "") + cells.join("") + '</w:tr>';
const tbl = (widths, rows, o = {}) => '<w:tbl><w:tblPr><w:tblW w:w="' + widths.reduce((a, b) => a + b, 0) + '" w:type="dxa"/>' + (o.center ? '<w:jc w:val="center"/>' : "") + BORDERS + '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + widths.map(w => '<w:gridCol w:w="' + w + '"/>').join("") + '</w:tblGrid>' + rows.join("") + '</w:tbl>';
// image en ligne (logo, signature)
const img = (rId, id, cx, cy, name) => '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + id + '" name="' + name + '"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="' + name + '"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + rId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
const pngSize = u => (u.length > 24 && u[0] === 0x89 ? { w: (u[16] << 24) | (u[17] << 16) | (u[18] << 8) | u[19], h: (u[20] << 24) | (u[21] << 16) | (u[22] << 8) | u[23] } : null);

// pj, date (ISO), name ; debug = plans[PJ].debug ; sign = { name, fn, at, img (dataURL PNG) } ou null → Uint8Array (.docx)
export function buildDebugDocx({ pj, date, name, debug, sign }) {
  const rows = (debug && debug.rows) || {};
  const head = tbl([3952, 5928, 3958], [
    tr([tc(3952, img("rIdLogo", 1, DEBUG_LOGO_EMU.cx, DEBUG_LOGO_EMU.cy, "Logo ENOGIA"), { vMerge: "restart", vc: true }), tc(5928, p(DEBUG_DOC.title, { center: true, sz: 24 })), tc(3958, p("Version : " + DEBUG_DOC.version, { center: true, sz: 24 }), { vMerge: "restart" })]),
    tr([tc(3952, p(""), { vMerge: "cont" }), tc(5928, p(DEBUG_DOC.subtitle, { center: true, sz: 24 })), tc(3958, p(""), { vMerge: "cont" })]),
  ], { center: true });
  const info = tbl([6962, 6955], [
    tr([tc(6962, p("N° Projet : " + (pj || "PJ"), { sz: 20 })), tc(6955, p("Date : " + frD(date), { sz: 20 }))]),
    tr([tc(13917, p("Nom et prénom : " + (name || ""), { sz: 20 }), { span: 2 })]),
  ], { center: true });
  const mark = (r, v) => p(r === v ? "X" : r === "na" && v === "ok" ? "S.O." : "", { center: true, bold: true });
  const lines = [];
  DEBUG_SECTIONS.forEach((s, si) => {
    const labels = si === 0 ? [s.title, "OK", "NOK", "Problème rencontré", "Causalité", "Correctif", "Temps correctif", "Commentaires"] : [s.title, "OK", "NOK", "", "", "", "", "Commentaires"];
    lines.push(tr(labels.map((l, i) => tc(W[i], p(l, { bold: true, center: i > 0 }), { fill: GREY })), 200));
    s.items.forEach(it => { const v = rows[it.id] || {};
      lines.push(tr([tc(W[0], p(it.label)), tc(W[1], mark(v.r, "ok")), tc(W[2], mark(v.r, "nok")), tc(W[3], p(v.pb)), tc(W[4], p(v.cause)), tc(W[5], p(v.fix)), tc(W[6], p(v.temps)), tc(W[7], p(it.hint))], 200)); });
  });
  const main = tbl(W, lines);
  // bloc de validation (signature du testeur)
  let sigCell = p(""), sigPng = null;
  if (sign && sign.img && /^data:image\/png;base64,/.test(sign.img)) {
    sigPng = b64(sign.img.split(",")[1]); const sz = pngSize(sigPng) || { w: 360, h: 120 }, k = Math.min(1, 200 / sz.w, 60 / sz.h);
    sigCell = img("rIdSig", 2, Math.round(sz.w * k * 9525), Math.round(sz.h * k * 9525), "Signature");
  }
  const VW = [4000, 3200, 2200, 4822];
  const valid = tbl(VW, [
    tr(["Validation · Nom et prénom", "Fonction", "Date", "Signature"].map((l, i) => tc(VW[i], p(l, { bold: true }), { fill: GREY })), 200),
    tr([tc(VW[0], p(sign ? sign.name : name)), tc(VW[1], p(sign ? sign.fn : "")), tc(VW[2], p(sign ? frD(sign.at) : "")), tc(VW[3], sigCell, { vc: true })], 900),
  ]);
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>'
    + head + info + p("") + main + p("") + valid
    + '<w:sectPr><w:pgSz w:w="16840" w:h="11910" w:orient="landscape"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="477" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>'
    + (sigPng ? '<Relationship Id="rIdSig" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image2.png"/>' : "") + '</Relationships>';
  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
  const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
  const root = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + x(DEBUG_DOC.subtitle + " " + (pj || "")) + '</dc:title><dc:creator>' + x(name || "Cockpit BU ORC") + '</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified></cp:coreProperties>';
  const files = [{ name: "[Content_Types].xml", data: types }, { name: "_rels/.rels", data: root }, { name: "docProps/core.xml", data: core }, { name: "word/document.xml", data: doc }, { name: "word/styles.xml", data: styles }, { name: "word/_rels/document.xml.rels", data: rels }, { name: "word/media/image1.png", data: b64(DEBUG_LOGO_PNG) }];
  if (sigPng) files.push({ name: "word/media/image2.png", data: sigPng });
  return zipStore(files);
}
// Nom de fichier comme le modèle : PI105-047-XX0003-A-Check list debug - PJ461-1.docx
export const debugDocxName = pj => DEBUG_DOC.ref + "-" + DEBUG_DOC.version + "-Check list debug - " + (pj || "PJ") + ".docx";
export function downloadDocx(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
