// ── Rapport « Chef de projet » en PowerPoint ───────────────────────────────────────────────────────────────
// Fonction pure : reçoit la classe PptxGenJS (chargée à la demande dans le navigateur) et des données déjà préparées
// (voir CdpReport.js). Une page de garde, une synthèse des projets, les modifications du dernier import, puis une
// diapositive par PJ (jalons, MaD ORC, avancements, gros composants, jalons de paiement, actions de la semaine, statut).
const C = { ink: "1F2A30", ink2: "404040", mute: "5F6B73", faint: "68757D", hair: "CFE3E1", wash: "F1F8F7", navy: "004659", navy2: "0B5C73", brass: "27A99E", red: "D64541", amber: "E3A008", green: "2A9D6F", white: "FFFFFF", orange: "F1963B", pale: "E6F3F2" };
const FEU = { red: C.red, yellow: C.amber, green: C.green };
const STEP_C = { des: "D79A2B", cmd: "4F6FC4", inst: "2F9E6E" };
const eur = v => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v)).replace(/[\u202f\u00a0]/g, " ") + " €";
const FEU_NAMES = [["planning", "Planning"], ["cash", "Cash in"], ["risques", "Risques"], ["com", "Client"]];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
// Gabarit ENOGIA (Template_slide.pptx) : titres en Abel, texte en Roboto (comme le rapport CODIR) ; couleurs du thème 004659 / 27A99E / E6F3F2 / F1963B.
const FONT = "Roboto", TFONT = "Abel";
// Images du gabarit (data-URI), fournies par CdpReport.js depuis public/report/ ; absentes → la diapositive reste lisible (fond uni).
let A = {};
const img = (s, k, o) => { if (A[k]) s.addImage({ data: A[k], ...o }); };
const W = 13.333, H = 7.5, MX = 0.5;

const fd = v => { if (!v) return "—"; const d = new Date(v); return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); };
const fdm = v => { if (!v) return "—"; const d = new Date(v); return d.getDate() + " " + MONTHS[d.getMonth()]; };
const sg = d => d == null ? "—" : d === 0 ? "=" : (d > 0 ? "+" : "−") + Math.abs(d) + " j";
const dcol = d => d == null || d === 0 ? C.mute : d > 0 ? C.red : C.green;
const clip = (t, n) => { t = (t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
// v146.12 : estimation du nombre de lignes d'un texte (Calibri ≈ 0,54 em par caractère, par prudence) pour dimensionner les zones de commentaire :
// PowerPoint ne réduit pas le texte à l'ouverture (« fit: shrink » n'agit qu'à la modification), donc la hauteur doit être juste dès la génération.
const CHW = size => size * 0.545 / 72, LHT = size => size * 1.22 / 72;
const estLines = (t, w, size) => String(t || "").split(/\n/).reduce((a, p) => a + Math.max(1, Math.ceil(p.trim().length * CHW(size) / w * 1.06)), 0);
// Texte et hauteur d'une zone : au plus `cap` lignes (le reste est remplacé par « … », le texte entier reste dans la fiche).
const fitNote = (text, w, size, cap) => {
  const t = (text || "").replace(/[ \t]+/g, " ").trim(); if (!t) return { text: "", lines: 0, h: 0 };
  const n = estLines(t, w, size), lines = Math.min(cap, n);
  const per = Math.floor(w / CHW(size) / 1.06);
  return { text: n > cap ? clip(t, Math.max(10, Math.floor(cap * per * 0.9))) : t, lines, h: lines * LHT(size) + 0.1 };
};
const FIELD_LABEL = { arrivee: "Arrivée", tests: "Tests", testsFin: "Fin tests", finProd: "Fin de prod.", depart: "Départ" };

// Bandeau du gabarit : photo sombre, plume ENOGIA, titre blanc en gras (Abel). `right` = texte à droite dans le bandeau.
const BANNER_H = 0.95;
function frame(s, { eyebrow, title, page, total, label, right }) {
  s.background = { color: C.white };
  if (A.banner) s.addImage({ data: A.banner, x: 0, y: 0, w: W, h: BANNER_H, sizing: { type: "cover", w: W, h: BANNER_H } });
  else s.addShape("rect", { x: 0, y: 0, w: W, h: BANNER_H, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
  img(s, "feather", { x: 0.37, y: 0.24, w: 0.46, h: 0.47 });
  if (title) s.addText(title, { x: 1.0, y: 0.2, w: eyebrow ? 8.6 : 11.3, h: 0.55, fontFace: TFONT, fontSize: 26, bold: true, color: C.white, fit: "shrink", margin: 0, valign: "middle" });
  if (eyebrow) s.addText(eyebrow, { x: W - MX - 3.6, y: 0.3, w: 3.6, h: 0.35, align: "right", fontFace: TFONT, fontSize: 15, color: "BFE6E2", margin: 0, valign: "middle", fit: "shrink" });
  if (right) s.addText(right, { x: W - MX - 4.4, y: 0.3, w: 4.4, h: 0.35, align: "right", fontFace: TFONT, fontSize: 15, color: "BFE6E2", margin: 0, valign: "middle", fit: "shrink" });
  s.addText("ENOGIA · " + (label || "Revue de projets") + " · Confidentiel", { x: MX, y: H - 0.38, w: 8, h: 0.25, fontFace: FONT, fontSize: 8, color: C.faint, margin: 0 });
  if (page) s.addText(String(page) + " / " + String(total), { x: W - MX - 1.5, y: H - 0.38, w: 1.5, h: 0.25, align: "right", fontFace: FONT, fontSize: 9, color: C.navy, margin: 0 });
}
const cap = (s, t, x, y, w) => s.addText(t.toUpperCase(), { x, y, w, h: 0.22, fontFace: FONT, fontSize: 8.5, bold: true, color: C.navy2, charSpacing: 3, margin: 0 });
const rule = (s, x, y, w) => s.addShape("line", { x, y, w, h: 0, line: { color: C.hair, width: 1 } });
const heading = (s, t, x, y, w) => { cap(s, t, x, y, w); rule(s, x, y + 0.26, w); };

const coverBg = s => { s.background = { color: "05323F" }; if (A.coverBg) s.addImage({ data: A.coverBg, x: 0, y: 0, w: W, h: H }); };
const badges = s => { img(s, "coq", { x: 10.74, y: 6.54, w: 0.66, h: 0.66 }); img(s, "bpi", { x: 11.49, y: 6.5, w: 0.75, h: 0.73 }); img(s, "aleno", { x: 12.4, y: 6.54, w: 0.65, h: 0.65 }); };
function coverSlide(pptx, { title, sub, stats, dateLabel }) {
  const s = pptx.addSlide(); coverBg(s);
  img(s, "wave", { x: 0, y: 2.45, w: W, h: 3.5 });
  s.addText("Revue de projets – BU ORC", { x: 1.96, y: 1.0, w: 9.41, h: 0.8, align: "center", fontFace: TFONT, fontSize: 36, bold: true, color: C.white, margin: 0, valign: "middle" });
  s.addText(title, { x: 1.96, y: 1.95, w: 9.41, h: 0.9, align: "center", fontFace: TFONT, fontSize: 32, bold: true, color: C.white, fit: "shrink", margin: 0, valign: "middle" });
  s.addText(sub + (dateLabel ? "  ·  " + dateLabel : ""), { x: 1.96, y: 2.9, w: 9.41, h: 0.35, align: "center", fontFace: FONT, fontSize: 14, bold: true, color: C.white, margin: 0, valign: "middle" });
  s.addText(stats.slice(1).map(([v, l], i) => ({ text: (i ? "   ·   " : "") + v + " " + l, options: {} })), { x: 1.0, y: 3.35, w: W - 2, h: 0.35, align: "center", fontFace: FONT, fontSize: 12, color: "CFEFEC", margin: 0, valign: "middle" });
  img(s, "logo", { x: 5.46, y: 5.85, w: 2.41, h: 0.83 });
  s.addText("Micro-turbomachinery for a more sustainable world", { x: 2.65, y: 6.75, w: 8.04, h: 0.4, align: "center", fontFace: FONT, fontSize: 14, italic: true, color: C.white, margin: 0, valign: "middle" });
  badges(s);
}

function dividerSlide(pptx, chef, n) {
  const s = pptx.addSlide(); coverBg(s);
  img(s, "wave", { x: 0, y: 3.2, w: W, h: 3.5, transparency: 40 });
  s.addText("CHEF DE PROJET", { x: 1.96, y: 1.9, w: 9.41, h: 0.35, align: "center", fontFace: FONT, fontSize: 13, bold: true, color: C.brass, charSpacing: 5, margin: 0 });
  s.addText(chef, { x: 1.96, y: 2.3, w: 9.41, h: 0.9, align: "center", fontFace: TFONT, fontSize: 38, bold: true, color: C.white, fit: "shrink", margin: 0, valign: "middle" });
  s.addText(n + " projet" + (n > 1 ? "s" : ""), { x: 1.96, y: 3.25, w: 9.41, h: 0.4, align: "center", fontFace: FONT, fontSize: 16, color: "CFEFEC", margin: 0 });
  img(s, "logo", { x: 5.46, y: 5.85, w: 2.41, h: 0.83 }); badges(s);
}

// Dernière diapositive : coordonnées (gabarit « contact »)
function contactSlide(pptx) {
  const s = pptx.addSlide(); coverBg(s);
  img(s, "logo", { x: 5.33, y: 1.9, w: 2.67, h: 0.92 });
  const L = (t, y, o = {}) => s.addText(t, { x: 3.33, y, w: 6.67, h: 0.36, align: "center", fontFace: FONT, fontSize: 15, color: C.white, margin: 0, valign: "middle", ...o });
  L("Gabriel VINCENT / Head of Operations & Projects", 3.2, { bold: true });
  L("gabriel.vincent@enogia.com", 3.58, { italic: true });
  L("+33 7 67 84 14 90", 3.94);
  L("43, avenue de Boisbaudran, 13015 Marseille, France", 4.6);
  L("+33(0)4 84 25 60 17 - info@enogia.com", 4.96);
  L("www.enogia.com", 5.32, { color: C.brass });
  badges(s);
}

function summarySlides(pptx, items, ctx) {
  const PER = 9; const pages = Math.max(1, Math.ceil(items.length / PER));
  for (let p = 0; p < pages; p++) {
    const s = pptx.addSlide(); const part = items.slice(p * PER, (p + 1) * PER);
    frame(s, { eyebrow: ctx.chef, title: "Synthèse des projets" + (pages > 1 ? " (" + (p + 1) + "/" + pages + ")" : ""), page: ctx.page(), total: ctx.total, label: ctx.label });
    const hdr = ["PJ", "Projet", "Pays", "État", "Montant", "Avanc. global", "Départ prévu", "Dérive initial", "Écart MaD ORC", "Statut", "Retard déclaré"].map(t => ({ text: t, options: { bold: true, color: C.white, fontSize: 9.5, fontFace: FONT, fill: { color: C.navy }, align: "left", valign: "middle" } }));
    const rows = [hdr];
    part.forEach((i, qi) => {
      const band = { color: C.white }; // v346 (audit taste) : plus de lignes zébrées, filets seuls
      const cell = (text, o = {}) => ({ text, options: { fontFace: FONT, fontSize: 10.5, color: C.ink, valign: "middle", fill: band, ...o } });
      rows.push([
        cell(i.pj, { bold: true, color: C.navy }), cell(clip(i.nom, 28)), cell(i.pays && i.pays !== "—" ? clip(i.pays, 14) : "—", { fontSize: 9.5 }), cell(i.etatLabel, { fontSize: 9.5, color: C.ink2 }),
        cell(i.montant ? eur(i.montant) : "—", { bold: true, align: "right" }),
        cell(i.global == null ? "—" : i.global + " %", { bold: true }), cell(fd(i.dep)), cell(sg(i.drift), { bold: true, color: dcol(i.drift) }), cell(sg(i.ecart), { bold: true, color: dcol(i.ecart) }),
        { text: FEU_NAMES.map(([k]) => ({ text: "●", options: { color: FEU[i.feux[k]] || C.hair, fontSize: 13, fontFace: FONT } })), options: { valign: "middle", fill: band } },
        cell(i.totalDelay > 0 ? i.totalDelay + " j" : "—", { color: i.totalDelay > 0 ? C.red : C.mute, bold: i.totalDelay > 0 }),
      ]);
    });
    s.addTable(rows, { x: MX, y: 1.3, w: W - 2 * MX, colW: [0.85, 2.35, 1.0, 1.35, 1.15, 0.85, 1.1, 0.85, 0.85, 0.85, 1.13], rowH: 0.5, border: { type: "solid", pt: 0.5, color: C.hair }, margin: [0.03, 0.08, 0.03, 0.08] });
    const sumM = part.reduce((a, i) => a + (i.montant || 0), 0);
    if (sumM) s.addText("Montant cumulé" + (pages > 1 ? " de cette page" : "") + " (" + part.filter(i => i.montant).length + " projet" + (part.filter(i => i.montant).length > 1 ? "s" : "") + ") : " + eur(sumM), { x: MX, y: 1.3 + 0.5 * (part.length + 1) + 0.08, w: W - 2 * MX, h: 0.28, align: "right", fontFace: FONT, bold: true, fontSize: 10.5, color: C.navy, margin: 0 });
    s.addText("Statut : ● Planning  ● Cash in  ● Risques  ● Client — vert bon · jaune vigilance · rouge à risque · gris non évalué. MaD ORC = fin contractuelle (hors transport vers le site client) ; écart = départ prévu − MaD ORC.", { x: MX, y: H - 0.75, w: W - 2 * MX, h: 0.3, fontFace: FONT, fontSize: 8.5, color: C.mute, margin: 0 });
  }
}

function changesSlide(pptx, items, ctx) {
  const ch = items.filter(i => i.change);
  const s = pptx.addSlide();
  frame(s, { eyebrow: ctx.chef, title: "Modifications depuis la dernière mise à jour", page: ctx.page(), total: ctx.total, label: ctx.label });
  s.addText("Import du " + ctx.lastChange.when + " comparé à la version précédente", { x: MX, y: 1.05, w: 10, h: 0.3, fontFace: FONT, fontSize: 12, color: C.mute, margin: 0 });
  if (!ch.length) { s.addText("Aucun changement sur vos projets lors de la dernière mise à jour.", { x: MX, y: 1.8, w: 10, h: 0.5, fontFace: FONT, fontSize: 18, color: C.green, bold: true, margin: 0 }); return; }
  const rows = [[{ text: "PJ", options: { bold: true, color: C.white, fontSize: 9.5, fontFace: FONT, fill: { color: C.navy } } }, { text: "Projet", options: { bold: true, color: C.white, fontSize: 9.5, fontFace: FONT, fill: { color: C.navy } } }, { text: "Ce qui a bougé", options: { bold: true, color: C.white, fontSize: 9.5, fontFace: FONT, fill: { color: C.navy } } }]];
  ch.slice(0, 11).forEach((i, qi) => {
    const c = i.change; const runs = []; const band = { color: C.white }; // v346 (audit taste) : plus de lignes zébrées, filets seuls
    if (c.isNew) runs.push({ text: "Nouveau PJ dans cette version", options: { color: C.amber, bold: true, fontSize: 10.5 } });
    Object.entries(c.d || {}).forEach(([f, v], k) => {
      runs.push({ text: (k ? "   ·   " : "") + FIELD_LABEL[f] + " " + (v.delta == null ? (v.to ? "défini" : "retiré") : sg(v.delta)), options: { color: v.delta == null ? C.amber : dcol(v.delta), bold: true, fontSize: 10.5 } });
      runs.push({ text: " (" + fdm(v.from) + " → " + fdm(v.to) + ")", options: { color: C.mute, fontSize: 9.5 } });
    });
    if (c.hours && c.hours.at) runs.push({ text: "   ·   Heures atelier " + c.hours.at.from + " → " + c.hours.at.to + " h", options: { color: C.ink2, fontSize: 10 } });
    rows.push([{ text: i.pj, options: { bold: true, color: C.navy, fontSize: 10.5, fill: band } }, { text: clip(i.nom, 28), options: { fontSize: 10.5, fill: band } }, { text: runs, options: { valign: "middle", fill: band } }]);
  });
  s.addTable(rows, { x: MX, y: 1.5, w: W - 2 * MX, colW: [1.1, 2.7, 8.53], rowH: 0.42, fontFace: FONT, color: C.ink, border: { type: "solid", pt: 0.5, color: C.hair }, margin: [0.03, 0.08, 0.03, 0.08], valign: "middle" });
  if (ch.length > 11) s.addText("… et " + (ch.length - 11) + " autre(s) PJ : voir l'onglet Modifications de l'application.", { x: MX, y: H - 0.8, w: 10, h: 0.3, fontFace: FONT, fontSize: 10, color: C.mute, margin: 0 });
}

// ══ Diapositives d'un PJ : reproduisent la fiche synthèse du site (mêmes sections, même ordre, mêmes codes couleur) ══
// 1/n : identité, commentaire général, statut global, indicateurs clés, jalons
// 2/n : contrat & roadmap, actions de la semaine, plans de mitigation | major components, jalons de paiement, dernier import
// 3/n : causes de retard | fil de commentaires (tous les commentaires non privés ; suite sur d'autres diapositives si besoin)
const TEAL = "27A99E", EMBER = "F1963B", BRASS_T = "E6F3F2", RED_T = "FBE6E5", GREEN_T = "E3F3EC", AMBER_T = "FCF1D6";
const LEVEL = { red: "À risque", yellow: "Vigilance", green: "Bon" };
const LEVEL_T = { red: RED_T, yellow: AMBER_T, green: GREEN_T };
const FEU_LABEL = { planning: "Planning", cash: "Cash in", risques: "Risques / Problèmes", com: "Communication client" };
const DELAY_PAL = ["D64541", "E3A008", "5068B0", "2A9D6F", "8A76B5", "B68A56", "4F8F96", "8A9199"];
const note = (i, k) => ((i.notes && i.notes[k]) || "").trim();
const hx = c => String(c || "").replace("#", "");
const rank = { red: 3, yellow: 2, green: 1 };
const worstOf = f => Object.values(f || {}).filter(Boolean).sort((a, b) => rank[b] - rank[a])[0] || null;
const dd = v => v ? new Date(v) : null;
const dayDiff = (a, b) => Math.round((b - a) / 86400000);

// Fil de commentaires : hauteur estimée de chaque carte, puis répartition en pages (la 1re page partage la diapositive avec les retards)
const cmH = c => 0.36 + Math.min(15, estLines(clip(c.text, 1000), 5.74, 10)) * 0.17;
export function commentPages(i) {
  const list = i.comments || []; if (!list.length) return [];
  const pages = []; let cur = [], h = 0, cap = 5.1;
  list.forEach(c => { const hh = cmH(c) + 0.08; if (h + hh > cap && cur.length) { pages.push(cur); cur = []; h = 0; cap = 11.6; } cur.push(c); h += hh; });
  pages.push(cur); return pages;   // pages[0] : colonne de droite de la diapositive 3 ; les suivantes : pleine largeur sur 2 colonnes (capacité 2 × 5,8)
}
const needsThird = i => (i.delayList || []).length > 0 || (i.comments || []).length > 0;
const needsFin = i => !!i.fin && (i.fin.base != null || !!i.fin.pen || !!i.fin.livrContr || !!i.fin.livrPrevue || i.fin.certs.length > 0);
export const slidesForPj = i => 2 + (needsFin(i) ? 1 : 0) + (needsThird(i) ? Math.max(1, commentPages(i).length) : 0);

const sec = (s, t, x, y, w, right, rcol) => { heading(s, t, x, y, w); if (right) s.addText(right, { x: x + w * 0.3, y, w: w * 0.7, h: 0.22, align: "right", fontFace: FONT, fontSize: 8.5, bold: !!rcol, color: rcol || C.faint, margin: 0 }); };
const noteBox = (s, x, y, w, h, text, o = {}) => {
  const col = o.color || C.brass;
  s.addShape("rect", { x, y, w, h, fill: { color: o.fill || BRASS_T }, line: { color: o.fill || BRASS_T, width: 0 } });
  s.addShape("rect", { x, y, w: 0.05, h, fill: { color: col }, line: { color: col, width: 0 } });
  s.addText(text, { x: x + 0.13, y, w: w - 0.2, h, fontFace: FONT, fontSize: o.size || 9.5, color: C.ink, margin: 0, valign: "middle", bold: !!o.bold });
};
const tile = (s, x, y, w, h) => s.addShape("roundRect", { x, y, w, h, fill: { color: C.wash }, line: { color: C.wash, width: 0 }, rectRadius: 0.08 });
const capT = (s, t, x, y, w) => s.addText(t.toUpperCase(), { x, y, w, h: 0.18, fontFace: FONT, fontSize: 7.5, bold: true, color: C.mute, charSpacing: 2, margin: 0 });
const ring = (pptx, s, x, y, d, pct, col, label) => {
  s.addShape(pptx.shapes.DONUT, { x, y, w: d, h: d, fill: { color: C.hair }, line: { color: C.hair, width: 0 } });
  if (pct > 0) s.addShape(pptx.shapes.BLOCK_ARC, { x, y, w: d, h: d, fill: { color: col }, line: { color: col, width: 0 }, angleRange: [270, (270 + Math.min(99.9, pct) * 3.6) % 360], arcThicknessRatio: 0.25 });
  if (label != null) s.addText(label, { x, y, w: d, h: d, align: "center", valign: "middle", fontFace: FONT, fontSize: Math.max(7, d * 17), bold: true, color: C.ink, margin: 0 });
};
const checkGlyph = (s, x, y, done, col) => {
  s.addShape("roundRect", { x, y, w: 0.16, h: 0.16, fill: { color: done ? C.green : C.white }, line: { color: done ? C.green : col, width: 1.25 }, rectRadius: 0.03 });
  if (done) s.addText("✓", { x, y, w: 0.16, h: 0.16, align: "center", valign: "middle", fontFace: FONT, fontSize: 8, bold: true, color: C.white, margin: 0 });
};

function pjHeader(s, i, ctx, k, n) {
  const gl = [i.gamme, i.sn ? "S/N " + i.sn : ""].filter(Boolean).join("   ·   ");
  frame(s, { title: i.pj + "  ·  " + clip(i.nom || "", 46), right: gl, page: ctx.page(), total: ctx.total, label: ctx.label });
  const ec = hx(i.etatColor || "8A9199");
  s.addShape("roundRect", { x: MX, y: 1.04, w: 1.75, h: 0.25, fill: { color: C.white }, line: { color: ec, width: 1 }, rectRadius: 0.12 });
  s.addShape("ellipse", { x: MX + 0.1, y: 1.11, w: 0.1, h: 0.1, fill: { color: ec }, line: { color: ec, width: 0 } });
  s.addText(i.etatLabel, { x: MX + 0.26, y: 1.04, w: 1.45, h: 0.25, fontFace: FONT, fontSize: 9.5, bold: true, color: C.navy, margin: 0, valign: "middle", fit: "shrink" });
  const hasChef = i.chef && i.chef !== "Sans chef de projet", hasPays = i.pays && i.pays !== "—";
  s.addText([{ text: hasChef ? i.chef : "", options: { color: C.navy, bold: true } }, { text: (hasChef && hasPays ? "     " : "") + (hasPays ? i.pays : ""), options: { color: C.ink2 } }, { text: "     " + (i.presence ? "Présence aux tests : " + i.presence : "Pas de présence aux tests"), options: { color: C.faint } }, ...(i.fin && i.fin.certs.length ? [{ text: "     Certification machine : " + i.fin.certs.map(c => c.name).join(", "), options: { color: C.navy2, bold: true } }] : [])], { x: MX + 1.95, y: 1.04, w: 7.4, h: 0.25, fontFace: FONT, fontSize: 10.5, margin: 0, valign: "middle", fit: "shrink" });
  const w = worstOf(i.feux);
  if (w) { s.addShape("roundRect", { x: W - MX - 2.3, y: 1.02, w: 2.3, h: 0.3, fill: { color: LEVEL_T[w] }, line: { color: LEVEL_T[w], width: 0 }, rectRadius: 0.15 }); s.addShape("ellipse", { x: W - MX - 2.2, y: 1.11, w: 0.12, h: 0.12, fill: { color: FEU[w] }, line: { color: FEU[w], width: 0 } }); s.addText("Statut global : " + LEVEL[w], { x: W - MX - 2.02, y: 1.02, w: 1.95, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: FEU[w], margin: 0, valign: "middle" }); }
  if (n > 1) s.addText("Fiche " + k + " / " + n, { x: W - MX - 4.6, y: 1.04, w: 2.2, h: 0.25, align: "right", fontFace: FONT, fontSize: 8.5, color: C.faint, margin: 0, valign: "middle" });
}

// ── 1 : identité, commentaire général, statut global, indicateurs clés, jalons ──
function pjSlide1(pptx, i, ctx) {
  const s = pptx.addSlide(); const n = slidesForPj(i); pjHeader(s, i, ctx, 1, n);
  let y = 1.42; const FW = 12.33;
  const cw = (FW - 3 * 0.15) / 4;
  // v146.12 : zones de commentaire dimensionnées sur le texte réel (jamais de débordement). On cherche le plus grand plafond de lignes
  // [commentaire général, feux, indicateurs] pour lequel la diapositive tient ; au-delà, le texte est abrégé par « … ».
  const NOTE_W = cw - 0.4, GEN_W = FW - 0.2, SZ_N = 8.5, SZ_G = 11, LIMIT = 5.62;
  const gen0 = note(i, "gen");
  let L = null;
  for (const [cg, cf, ck] of [[3, 5, 2], [3, 5, 1], [3, 4, 2], [3, 4, 1], [2, 5, 1], [2, 4, 1], [2, 3, 1], [1, 3, 1], [1, 2, 1]]) {
    const g = fitNote(gen0, GEN_W, SZ_G, cg);
    const f = FEU_NAMES.map(([k]) => fitNote(note(i, k), NOTE_W, SZ_N, cf)), nf = Math.max(0, ...f.map(x => x.h));
    const kk = ["gl", "av", "dr", "rt"].map(k => fitNote(note(i, k), NOTE_W, SZ_N, ck)), nk = Math.max(0, ...kk.map(x => x.h));
    const tf = nf ? 0.56 + nf + 0.06 : 0.64, tk = nk ? 0.84 + nk + 0.05 : 0.9;
    const yJ = 1.42 + (g.h ? 0.34 + g.h + 0.1 : 0) + 0.34 + tf + 0.12 + 0.34 + tk + 0.12;
    L = { g, f, nf, kk, nk, tf, tk };
    if (yJ <= LIMIT) break;
  }
  if (L.g.h) { sec(s, "Commentaire général", MX, y, FW); noteBox(s, MX, y + 0.34, FW, L.g.h, L.g.text, { size: SZ_G }); y += 0.34 + L.g.h + 0.1; }
  // Statut global
  sec(s, "Statut global", MX, y, FW, i.feuxAt ? "évalué le " + fd(i.feuxAt) : "non évalué");
  FEU_NAMES.forEach(([k], q) => {
    const x = MX + q * (cw + 0.15), ty = y + 0.34, lv = i.feux[k] || null;
    tile(s, x, ty, cw, L.tf); capT(s, FEU_LABEL[k], x + 0.12, ty + 0.08, cw - 0.2);
    s.addText(lv ? LEVEL[lv] : "Non évalué", { x: x + 0.12, y: ty + 0.26, w: cw - 1.0, h: 0.26, fontFace: FONT, fontSize: 13, bold: true, color: lv ? FEU[lv] : C.faint, margin: 0, valign: "middle" });
    ["red", "yellow", "green"].forEach((l, o) => { const ox = x + cw - 0.2 - (2 - o) * 0.22; s.addShape("ellipse", { x: ox - 0.15, y: ty + 0.31, w: 0.16, h: 0.16, fill: { color: lv === l ? FEU[l] : C.white }, line: { color: FEU[l], width: 1.25 } }); });
    if (L.f[q].h) noteBox(s, x + 0.1, ty + 0.56, cw - 0.2, L.nf, L.f[q].text, { size: SZ_N });
  });
  y += 0.34 + L.tf + 0.12;
  // Indicateurs clés
  const toDep = i.dep ? dayDiff(new Date(new Date().toDateString()), dd(i.dep)) : null;
  const atelier = i.arrivee && i.dep ? dayDiff(dd(i.arrivee), dd(i.dep)) : null;
  sec(s, "Indicateurs clés", MX, y, FW, [toDep == null ? "" : toDep >= 0 ? "J-" + toDep + " avant départ" : "départ dépassé de " + Math.abs(toDep) + " j", atelier != null ? "séjour atelier " + atelier + " j" : ""].filter(Boolean).join(" · "));
  const kp = [
    ["Avancement global", "gl", "ring", i.global, "signature → mise en service"],
    ["Avancement production", "av", "ring", i.pv, i.etat === "SHIPPED" ? "expédié" : "production chez ENOGIA"],
    ["Dérive du départ", "dr", "big", i.drift == null ? "—" : i.drift === 0 ? "0 j" : sg(i.drift), i.drift == null ? "pas de planning initial" : i.drift === 0 ? "conforme au planning initial" : "initial : " + fd(i.iniDep), i.drift > 0 ? C.red : i.drift < 0 ? C.green : C.navy],
    ["Retards déclarés", "rt", "big", i.totalDelay > 0 ? i.totalDelay + " j" : "0", i.totalDelay > 0 ? i.delayList.length + " cause" + (i.delayList.length > 1 ? "s" : "") + " consignée" + (i.delayList.length > 1 ? "s" : "") : "aucun retard consigné", i.totalDelay > 0 ? C.red : C.navy],
  ];
  kp.forEach(([lab, k, kind, v, sub, col], q) => {
    const x = MX + q * (cw + 0.15), ty = y + 0.34;
    tile(s, x, ty, cw, L.tk); capT(s, lab, x + 0.12, ty + 0.07, cw - 0.2);
    if (kind === "ring") {
      ring(pptx, s, x + 0.12, ty + 0.28, 0.52, v == null ? 0 : v, v != null && v >= 100 ? C.green : TEAL, v == null ? "—" : v + "%");
      s.addText(sub, { x: x + 0.74, y: ty + 0.28, w: cw - 0.84, h: 0.52, fontFace: FONT, fontSize: 9, color: C.mute, margin: 0, valign: "middle", fit: "shrink" });
    } else {
      s.addText(v, { x: x + 0.12, y: ty + 0.26, w: 1.2, h: 0.5, fontFace: FONT, fontSize: 22, bold: true, color: col, margin: 0, valign: "middle", fit: "shrink" });
      s.addText(sub, { x: x + 1.3, y: ty + 0.26, w: cw - 1.4, h: 0.5, fontFace: FONT, fontSize: 9, color: C.mute, margin: 0, valign: "middle", fit: "shrink" });
    }
    if (L.kk[q].h) noteBox(s, x + 0.1, ty + 0.82, cw - 0.2, L.nk, L.kk[q].text, { size: SZ_N });
  });
  y += 0.34 + L.tk + 0.12;
  // Jalons : frise des 4 étapes
  sec(s, "Jalons", MX, y, FW, "révisé · initial barré · écart");
  const ms = [["Arrivée", "arrivee"], ["Tests", "tests"], ["Fin de prod", "finProd"], ["Départ", "dep"]];
  const iniKey = { arrivee: "arrivee", tests: "tests", finProd: "finProd", dep: "depart" };
  const colw = FW / 4, ly = y + 0.5;
  s.addShape("line", { x: MX + colw / 2, y: ly, w: colw * 3, h: 0, line: { color: C.hair, width: 2 } });
  const todayD = new Date(new Date().toDateString());
  ms.forEach(([lab, k], q) => {
    const cx = MX + q * colw + colw / 2, v = dd(i[k]), iv = i.ini ? dd(i.ini[iniKey[k]]) : null;
    const delta = v && iv ? dayDiff(iv, v) : null;
    const past = v && v <= todayD, prevV = q > 0 ? dd(i[ms[q - 1][1]]) : null;
    const next = !past && v && (q === 0 || (prevV && prevV <= todayD));
    s.addShape("ellipse", { x: cx - 0.09, y: ly - 0.09, w: 0.18, h: 0.18, fill: { color: past ? C.navy2 : C.white }, line: { color: past ? C.navy2 : next ? C.brass : v ? C.faint : C.hair, width: next ? 2.5 : 1.5 } });
    if (past) s.addText("✓", { x: cx - 0.09, y: ly - 0.09, w: 0.18, h: 0.18, align: "center", valign: "middle", fontFace: FONT, fontSize: 8, bold: true, color: C.white, margin: 0 });
    s.addText(lab.toUpperCase(), { x: cx - colw / 2, y: ly + 0.13, w: colw, h: 0.18, align: "center", fontFace: FONT, fontSize: 8, bold: true, color: C.mute, charSpacing: 2, margin: 0 });
    s.addText(fd(i[k]), { x: cx - colw / 2, y: ly + 0.3, w: colw, h: 0.28, align: "center", fontFace: FONT, fontSize: 14, bold: true, color: C.ink, margin: 0 });
    let sub = "";
    if (k === "tests" && i.testsFin) sub = "→ " + fd(i.testsFin);
    if (sub) s.addText(sub, { x: cx - colw / 2, y: ly + 0.57, w: colw, h: 0.16, align: "center", fontFace: FONT, fontSize: 8.5, color: C.faint, margin: 0 });
    const by = ly + (sub ? 0.74 : 0.6);
    if (delta === 0) s.addText("conforme", { x: cx - colw / 2, y: by, w: colw, h: 0.2, align: "center", fontFace: FONT, fontSize: 9, bold: true, color: C.green, margin: 0 });
    else if (delta != null) {
      s.addText(fd(iv), { x: cx - 1.0, y: by, w: 0.95, h: 0.2, align: "right", fontFace: FONT, fontSize: 8.5, color: C.faint, strike: "sngStrike", margin: 0 });
      s.addShape("roundRect", { x: cx + 0.03, y: by, w: 0.62, h: 0.2, fill: { color: delta > 0 ? RED_T : GREEN_T }, line: { color: delta > 0 ? RED_T : GREEN_T, width: 0 }, rectRadius: 0.1 });
      s.addText(sg(delta), { x: cx + 0.03, y: by, w: 0.62, h: 0.2, align: "center", valign: "middle", fontFace: FONT, fontSize: 9, bold: true, color: delta > 0 ? C.red : C.green, margin: 0 });
    }
  });
}

// ── 2 : contrat & roadmap, actions, mitigation | major components, paiements, dernier import ──
function itemRows(s, x, y, w, items, col, max, empty) {
  if (!items.length) { s.addText(empty, { x, y, w, h: 0.26, fontFace: FONT, fontSize: 10, color: C.faint, margin: 0, valign: "middle" }); return y + 0.3; }
  const open = items.filter(t => !t.done), closed = items.filter(t => t.done);
  const shown = [...open.slice(0, max), ...closed.slice(0, Math.max(0, max - open.length))].slice(0, max);
  let acc = y;
  shown.forEach((t) => {
    const ry = acc, tw = w - 0.36 - (t.done ? 1.45 : t.deadline ? 1.35 : 0.05);
    const f = fitNote(t.text, tw, 10.5, 2), rh = Math.max(0.25, f.h + 0.03); // 2 lignes au plus ; hauteur calculée sur le texte réel
    s.addShape("rect", { x, y: ry, w, h: rh, fill: { color: t.done ? C.white : (col === C.red ? RED_T : BRASS_T) }, line: { color: t.done ? C.white : (col === C.red ? RED_T : BRASS_T), width: 0 } });
    s.addShape("rect", { x, y: ry, w: 0.05, h: rh, fill: { color: t.done ? C.hair : col }, line: { color: t.done ? C.hair : col, width: 0 } });
    checkGlyph(s, x + 0.12, ry + (rh - 0.16) / 2, t.done, col);
    s.addText(f.text, { x: x + 0.36, y: ry, w: tw, h: rh, fontFace: FONT, fontSize: 10.5, bold: !t.done, color: t.done ? C.faint : C.ink, strike: t.done ? "sngStrike" : undefined, margin: 0, valign: "middle" });
    if (t.done && t.doneAt) s.addText("clôturée le " + fdm(t.doneAt), { x: x + w - 1.45, y: ry, w: 1.4, h: rh, align: "right", fontFace: FONT, fontSize: 8.5, bold: true, color: C.green, margin: 0, valign: "middle" });
    if (!t.done && t.deadline) { const late = t.deadline < new Date().toISOString().slice(0, 10); s.addText((late ? "en retard · " : "avant le ") + fdm(t.deadline), { x: x + w - 1.35, y: ry, w: 1.3, h: rh, align: "right", fontFace: FONT, fontSize: 8.5, bold: true, color: late ? C.red : C.mute, margin: 0, valign: "middle" }); }
    acc += rh + 0.03;
  });
  let ny = acc;
  if (items.length > shown.length) { s.addText("+ " + (items.length - shown.length) + " autre" + (items.length - shown.length > 1 ? "s" : "") + " dans la fiche", { x, y: ny, w, h: 0.2, fontFace: FONT, fontSize: 8.5, color: C.mute, margin: 0 }); ny += 0.22; }
  return ny + 0.02;
}
const listRight = (items, at) => { const o = items.filter(t => !t.done).length, c = items.length - o; return items.length ? o + " ouverte" + (o > 1 ? "s" : "") + " · " + c + " clôturée" + (c > 1 ? "s" : "") + (at ? " · maj " + fdm(at) : "") : "aucune"; };

const SZ_C2 = 9;
function pjSlide2(pptx, i, ctx) {
  const s = pptx.addSlide(); const n = slidesForPj(i); pjHeader(s, i, ctx, 2, n);
  const LX = MX, LW = 7.0, RX = 7.75, RW = W - MX - RX;
  // Contrat & roadmap
  let y = 1.42;
  sec(s, "Contrat & roadmap", LX, y, LW, "MaD ORC = fin contractuelle, hors transport vers le site client");
  const fields = [["Montant", i.montant ? eur(i.montant) : "—", i.montant ? "" : "non renseigné"], ["T0 · début", fd(i.t0), i.t0 ? "" : "non renseigné"], ["MaD ORC", fd(i.tf), i.tf ? "fin contractuelle" : "non renseignée"], [i.etat === "SHIPPED" ? "Tf final" : "Fin projetée", fd(i.dep), i.etat === "SHIPPED" ? "départ effectif" : "départ prévu du planning"], ["Écart vs MaD ORC", i.ecart == null ? "—" : i.ecart === 0 ? "dans les temps" : sg(i.ecart), i.duree != null ? "durée contrat " + i.duree + " j" : "T0 et MaD ORC à renseigner"]];
  const fw = LW / 5;
  fields.forEach(([lab, v, sub], q) => {
    const x = LX + q * fw, late = q === 3 ? i.ecart > 0 : q === 4 ? i.ecart > 0 : false;
    s.addText(lab.toUpperCase(), { x, y: y + 0.34, w: fw - 0.05, h: 0.17, fontFace: FONT, fontSize: 7, bold: true, color: C.mute, charSpacing: 1, margin: 0, fit: "shrink" });
    s.addText(v, { x, y: y + 0.52, w: fw - 0.05, h: 0.28, fontFace: FONT, fontSize: 12.5, bold: true, color: late ? C.red : (q === 4 && i.ecart != null ? C.green : C.ink), margin: 0, fit: "shrink" });
    s.addText(sub, { x, y: y + 0.8, w: fw - 0.05, h: 0.16, fontFace: FONT, fontSize: 7.5, color: C.faint, margin: 0, fit: "shrink" });
  });
  // Frise T0 → MaD ORC → fin projetée (+ aujourd'hui)
  const t0 = dd(i.t0) || dd(i.arrivee), tf = dd(i.tf), dep = dd(i.dep), today = new Date(new Date().toDateString());
  if (tf || dd(i.t0)) {
    const pts = [t0, tf, dep, today].filter(Boolean), lo = Math.min(...pts.map(d => +d)), hi = Math.max(...pts.map(d => +d)), span = Math.max(hi - lo, 86400000 * 7);
    const pos = d => d ? Math.max(0, Math.min(1, (+d - lo) / span)) : null;
    const bx = LX + 0.05, bw = LW - 0.1, by = y + 1.42;
    const a = pos(t0), b = pos(tf), c = pos(dep), t = pos(today);
    s.addShape("roundRect", { x: bx, y: by, w: bw, h: 0.09, fill: { color: C.hair }, line: { color: C.hair, width: 0 }, rectRadius: 0.04 });
    if (a != null && b != null && b > a) s.addShape("roundRect", { x: bx + bw * a, y: by, w: bw * (b - a), h: 0.09, fill: { color: TEAL }, line: { color: TEAL, width: 0 }, rectRadius: 0.04 });
    if (b != null && c != null && c > b) s.addShape("roundRect", { x: bx + bw * b, y: by, w: bw * (c - b), h: 0.09, fill: { color: C.red }, line: { color: C.red, width: 0 }, rectRadius: 0.04 });
    const lab = (p, text, col, above) => { if (p == null) return; const x = bx + bw * p, lw = 0.9, lx = Math.max(LX, Math.min(LX + LW - lw, x - lw / 2));
      s.addShape("rect", { x: x - 0.01, y: above ? by - 0.17 : by - 0.03, w: 0.02, h: above ? 0.26 : 0.2, fill: { color: col }, line: { color: col, width: 0 } });
      s.addText(text, { x: lx, y: above ? by - 0.37 : by + 0.18, w: lw, h: 0.18, align: x - lw / 2 < LX ? "left" : x + lw / 2 > LX + LW ? "right" : "center", fontFace: FONT, fontSize: 8.5, bold: true, color: col, margin: 0 }); };
    lab(a, "T0", TEAL, false); lab(b, "MaD ORC", C.navy2, true); lab(c, i.etat === "SHIPPED" ? "Tf final" : "Fin proj.", i.ecart > 0 ? C.red : C.ink2, false);
    if (t != null) s.addShape("ellipse", { x: bx + bw * t - 0.065, y: by - 0.02, w: 0.13, h: 0.13, fill: { color: C.white }, line: { color: EMBER, width: 2 } });
    y += 1.95;
  } else y += 1.1;
  if (note(i, "ct")) { const f = fitNote("Commentaire : " + note(i, "ct"), LW - 0.2, SZ_C2, 3); noteBox(s, LX, y, LW, f.h, f.text, { size: SZ_C2 }); y += f.h + 0.12; }
  // Actions de la semaine
  sec(s, "Actions de la semaine", LX, y + 0.05, LW, listRight(i.actions || [], i.semAt));
  y = itemRows(s, LX, y + 0.4, LW, i.actions || [], C.brass, 5, "Aucune action renseignée.") + 0.12;
  // Plans de mitigation
  sec(s, "Plans de mitigation", LX, y, LW, listRight(i.mitigations || [], i.mitAt));
  itemRows(s, LX, y + 0.35, LW, i.mitigations || [], C.red, 4, "Aucun plan de mitigation renseigné.");

  // Colonne de droite : major components
  let ry = 1.42;
  const cpct = i.compPct;
  sec(s, "Major components", RX, ry, RW, (() => { const k = (i.comps || []).reduce((a, c) => a + (c.des ? 1 : 0) + (c.cmd ? 1 : 0) + (c.inst ? 1 : 0), 0); return k + " / " + (i.comps || []).length * 3 + " cases · " + (cpct == null ? "non démarré" : cpct + " %"); })());
  s.addShape("roundRect", { x: RX, y: ry + 0.36, w: RW, h: 0.07, fill: { color: C.hair }, line: { color: C.hair, width: 0 }, rectRadius: 0.03 });
  if (cpct > 0) s.addShape("roundRect", { x: RX, y: ry + 0.36, w: Math.max(0.08, RW * cpct / 100), h: 0.07, fill: { color: cpct >= 100 ? C.green : cpct >= 50 ? TEAL : C.amber }, line: { color: C.hair, width: 0 }, rectRadius: 0.03 });
  const th = (t, k) => ({ text: t, options: { bold: true, fontSize: 8, color: k ? STEP_C[k] : C.mute, align: k ? "center" : "left", fill: { color: C.wash }, fontFace: FONT, charSpacing: 1 } });
  const tick = (v, k) => ({ text: v ? "✓" : "", options: { align: "center", fontFace: FONT, fontSize: 10, bold: true, color: C.white, fill: { color: v ? STEP_C[k] : C.white } } });
  const comps = i.comps || [], MAXC = 7;
  const crow = [[th("COMPOSANT"), th("DESIGN", "des"), th("PO", "cmd"), th("RÉCEPTIONNÉ", "inst")]];
  comps.slice(0, MAXC).forEach(c => crow.push([{ text: clip(c.label, 30), options: { fontFace: FONT, fontSize: 10, bold: true, color: C.ink } }, tick(c.des, "des"), tick(c.cmd, "cmd"), tick(c.inst, "inst")]));
  if (!comps.length) crow.push([{ text: "Aucun composant saisi", options: { fontFace: FONT, fontSize: 9.5, color: C.faint, colspan: 4 } }]);
  s.addTable(crow, { x: RX, y: ry + 0.52, w: RW, colW: [RW - 2.95, 0.7, 0.7, 1.55], rowH: 0.235, border: { type: "solid", pt: 0.5, color: C.hair }, margin: [0.01, 0.06, 0.01, 0.06], valign: "middle" });
  ry += 0.52 + (crow.length) * 0.235 + 0.08;
  if (comps.length > MAXC) { s.addText("+ " + (comps.length - MAXC) + " autre(s) composant(s) dans la fiche", { x: RX, y: ry, w: RW, h: 0.18, fontFace: FONT, fontSize: 8.5, color: C.mute, margin: 0 }); ry += 0.2; }
  ry += 0.1;
  // Jalons de paiement
  // V146.1 : jalons du Cash in (montants réels) — les retards (rouge) et échéances proches (orange) passent en tête, les payés en dernier
  const rankP = p => p.done ? 3 : p.tone === "late" ? 0 : p.tone === "warn" ? 1 : 2;
  const pay = (i.pay || []).map((p, q) => ({ ...p, q })).sort((a, b) => rankP(a) - rankP(b) || a.q - b.q), MAXP = 5, ppct = i.payPct;
  const linkedPay = pay.some(p => p.linked), paidAmt = pay.filter(p => p.done).reduce((a, p) => a + (p.montant || 0), 0);
  sec(s, "Jalons de paiement", RX, ry, RW, pay.length ? pay.filter(p => p.done).length + "/" + pay.length + (ppct != null ? " · " + ppct + " %" : "") + (linkedPay ? " · " + eur(paidAmt) : i.montant && ppct != null ? " · " + eur(i.montant * ppct / 100) : "") : "aucun jalon");
  if (pay.length) { s.addShape("roundRect", { x: RX, y: ry + 0.36, w: RW, h: 0.07, fill: { color: C.hair }, line: { color: C.hair, width: 0 }, rectRadius: 0.03 }); if (ppct > 0) s.addShape("roundRect", { x: RX, y: ry + 0.36, w: Math.max(0.08, RW * ppct / 100), h: 0.07, fill: { color: ppct >= 100 ? C.green : TEAL }, line: { color: C.hair, width: 0 }, rectRadius: 0.03 }); }
  let py = ry + 0.52;
  if (!pay.length) { s.addText("Aucun jalon de paiement saisi.", { x: RX, y: py - 0.08, w: RW, h: 0.24, fontFace: FONT, fontSize: 10, color: C.faint, margin: 0 }); py += 0.2; }
  pay.slice(0, MAXP).forEach((p, q) => {
    const yy = py + q * 0.29;
    const late = !p.done && p.tone === "late", warn = !p.done && p.tone === "warn", fillP = p.done ? GREEN_T : late ? RED_T : warn ? AMBER_T : C.wash, inkP = late ? C.red : warn ? "9A6700" : C.mute;
    s.addShape("rect", { x: RX, y: yy, w: RW, h: 0.26, fill: { color: fillP }, line: { color: fillP, width: 0 } });
    checkGlyph(s, RX + 0.1, yy + 0.05, p.done, late ? C.red : warn ? C.amber : C.faint);
    s.addText(clip(p.label + (p.shared ? " · commun à " + p.sharedN + " mach." : "") + (late && p.retard ? " · " + p.retard + " j de retard" : ""), 40), { x: RX + 0.34, y: yy, w: RW - 2.3, h: 0.26, fontFace: FONT, fontSize: 10.5, bold: true, color: C.ink, margin: 0, valign: "middle", fit: "shrink" });
    s.addText(p.pct != null && p.pct !== "" ? p.pct + " %" : "", { x: RX + RW - 1.95, y: yy, w: 0.55, h: 0.26, align: "right", fontFace: FONT, fontSize: 9.5, color: C.mute, margin: 0, valign: "middle" });
    s.addText(p.linked ? eur(p.montant) : i.montant && p.pct ? eur(i.montant * Number(p.pct) / 100) : (p.done && p.doneAt ? fdm(p.doneAt) : ""), { x: RX + RW - 1.35, y: yy, w: 1.3, h: 0.26, align: "right", fontFace: FONT, fontSize: 9.5, bold: true, color: p.done ? C.green : inkP, margin: 0, valign: "middle" });
  });
  py += Math.min(pay.length, MAXP) * 0.29;
  if (pay.length > MAXP) { s.addText("+ " + (pay.length - MAXP) + " autre(s) jalon(s) dans la fiche", { x: RX, y: py, w: RW, h: 0.18, fontFace: FONT, fontSize: 8.5, color: C.mute, margin: 0 }); py += 0.2; }
  py += 0.14;
  // Depuis la dernière mise à jour
  sec(s, "Depuis la dernière mise à jour", RX, py, RW);
  const ch = i.change; const runs = [];
  if (!ch) runs.push({ text: "✓ Aucun changement pour ce PJ.", options: { color: C.green, bold: true, breakLine: true } });
  else if (ch.isNew) runs.push({ text: "Nouveau PJ dans cette version.", options: { color: C.amber, bold: true, breakLine: true } });
  else {
    Object.entries(ch.d || {}).forEach(([f, v]) => runs.push({ text: FIELD_LABEL[f] + " " + (v.delta == null ? (v.to ? "défini" : "retiré") : sg(v.delta)) + "  (" + fdm(v.from) + " → " + fdm(v.to) + ")", options: { color: v.delta == null ? C.amber : dcol(v.delta), bold: true, breakLine: true } }));
    if (ch.hours && ch.hours.at) runs.push({ text: "Heures atelier " + ch.hours.at.from + " → " + ch.hours.at.to + " h", options: { color: C.ink2, bold: true, breakLine: true } });
    if (ch.hours && ch.hours.au) runs.push({ text: "Heures autom " + ch.hours.au.from + " → " + ch.hours.au.to + " h", options: { color: C.ink2, bold: true, breakLine: true } });
  }
  s.addText(runs, { x: RX, y: py + 0.34, w: RW, h: Math.max(0.3, H - 0.5 - (py + 0.34)), fontFace: FONT, fontSize: 9.5, margin: 0, valign: "top", fit: "shrink" });
}

// ── 3 : finance & contrat — prix de la fiche, livraison, pénalités, certification, fiches du PJ ──
function pjSlideFin(pptx, i, ctx) {
  const f = i.fin, pen = f.pen;
  const s = pptx.addSlide(); pjHeader(s, i, ctx, 3, slidesForPj(i));
  const LX = MX, LW = 7.4, RX = MX + 7.85, RW = W - MX - RX; let y = 1.42;
  // Prix, contrat, livraison
  sec(s, "Prix de la fiche & livraison contractuelle", LX, y, LW);
  const livLate = f.livrContr && f.livrPrevue ? dayDiff(dd(f.livrContr), dd(f.livrPrevue)) : null;
  const tiles = [["Prix de la fiche", f.base != null ? eur(f.base) : "—", f.base != null ? "base des pénalités" : "non renseigné", C.navy],
    ["Contrat", i.montant ? eur(i.montant) : "—", i.montant ? "" : "non renseigné", C.navy],
    ["Livr. contrat.", f.livrContr ? fd(f.livrContr) : "—", f.livrContr ? "date contractuelle" : "non renseignée", C.navy],
    ["Livr. prévue", f.livrPrevue ? fd(f.livrPrevue) : "—", livLate == null ? "à saisir" : livLate === 0 ? "dans les temps" : sg(livLate) + " vs contrat", livLate > 0 ? C.red : C.navy]];
  const tw = (LW - 3 * 0.12) / 4;
  tiles.forEach(([lab, v, sub, col], q) => {
    const x = LX + q * (tw + 0.12);
    tile(s, x, y + 0.38, tw, 0.95);
    capT(s, lab, x + 0.12, y + 0.47, tw - 0.2);
    s.addText(v, { x: x + 0.12, y: y + 0.7, w: tw - 0.2, h: 0.32, fontFace: FONT, fontSize: 14, bold: true, color: col, margin: 0, fit: "shrink" });
    s.addText(sub, { x: x + 0.12, y: y + 1.04, w: tw - 0.2, h: 0.2, fontFace: FONT, fontSize: 8, color: C.faint, margin: 0, fit: "shrink" });
  });
  y += 1.6;
  // Pénalités
  sec(s, "Pénalités de retard", LX, y, LW, pen ? (pen.actif ? "activées par le client" : "non activées par le client") : "aucune condition définie", pen && pen.actif ? C.green : null);
  if (!pen) s.addText("Aucune condition de pénalité sur cette fiche.", { x: LX, y: y + 0.42, w: LW, h: 0.3, fontFace: FONT, fontSize: 10.5, color: C.faint, margin: 0 });
  else {
    checkGlyph(s, LX, y + 0.43, pen.actif, C.faint);
    s.addText("Pénalités activées par le client", { x: LX + 0.26, y: y + 0.4, w: 3.2, h: 0.22, fontFace: FONT, fontSize: 10, bold: true, color: pen.actif ? C.green : C.mute, margin: 0, valign: "middle" });
    const params = [["À partir de", pen.ref || "—"], ["Taux", pen.ratePct != null ? pen.ratePct + " % / sem" : "—"], ["Période de grâce", pen.graceWeeks + " sem."], ["Plafond", pen.cap != null && pen.cap > 0 ? (pen.capType === "eur" ? eur(pen.cap) : pen.cap + " %") + (pen.capEur != null && pen.capType !== "eur" ? " · " + eur(pen.capEur) : "") : "sans plafond"]];
    const pw = LW / 4;
    params.forEach(([lab, v], q) => { capT(s, lab, LX + q * pw, y + 0.74, pw - 0.1); s.addText(v, { x: LX + q * pw, y: y + 0.94, w: pw - 0.1, h: 0.26, fontFace: FONT, fontSize: 11, bold: true, color: pen.actif ? C.ink : C.faint, margin: 0, fit: "shrink" }); });
    if (pen.status === "inactive") noteBox(s, LX, y + 1.38, LW, 0.42, "Conditions saisies mais non activées par le client : aucun montant n'est compté.", { color: C.faint, fill: C.wash });
    else if (pen.status === "incomplete") noteBox(s, LX, y + 1.38, LW, 0.42, "À compléter dans la fiche : " + (pen.missing || []).join(", ") + ".", { color: C.amber, fill: "FFF3C9" });
    else {
      const late = pen.lateDays > 0, col = pen.amount > 0 ? C.red : late ? C.amber : C.green;
      const res = [["Pénalités", pen.amount > 0 ? eur(pen.amount) : "0 €", (pen.provisional ? "à ce jour" : "prévision") + (pen.capped ? " · plafond atteint" : pen.capEur != null ? " · max " + eur(pen.capEur) : " · sans plafond"), col],
        ["Retard / " + pen.ref, late ? pen.lateDays + " j" : "dans les temps", pen.contract ? fd(pen.contract) + " → " + (pen.effective ? fd(pen.effective) : "pas de prévision") : "", late ? C.red : C.green],
        ["Sem. factur.", String(pen.chargeableWeeks), pen.weekly != null ? eur(pen.weekly) + " / semaine" : "", C.ink],
        ["Démarrent le", pen.startDate ? fd(pen.startDate) : "—", pen.graceWeeks > 0 ? pen.graceWeeks + " sem. de grâce" : "sans grâce", C.ink]];
      res.forEach(([lab, v, sub, col2], q) => {
        const x = LX + q * (tw + 0.12);
        tile(s, x, y + 1.32, tw, 1.0); capT(s, lab, x + 0.12, y + 1.4, tw - 0.2);
        s.addText(v, { x: x + 0.12, y: y + 1.62, w: tw - 0.2, h: 0.34, fontFace: FONT, fontSize: q === 0 ? 17 : 13, bold: true, color: col2, margin: 0, fit: "shrink" });
        s.addText(sub, { x: x + 0.12, y: y + 2.0, w: tw - 0.2, h: 0.24, fontFace: FONT, fontSize: 8, color: C.faint, margin: 0, fit: "shrink" });
      });
    }
  }
  // Colonne de droite : certification, fiches du PJ
  let ry = 1.42;
  sec(s, "Certification machine", RX, ry, RW);
  if (!f.certs.length) s.addText("Aucune certification renseignée.", { x: RX, y: ry + 0.42, w: RW, h: 0.3, fontFace: FONT, fontSize: 10.5, color: C.faint, margin: 0 });
  else {
    let cx = RX, cy = ry + 0.42;
    f.certs.forEach(c => { const w = Math.max(0.8, 0.3 + c.name.length * 0.085); if (cx + w > RX + RW) { cx = RX; cy += 0.38; }
      s.addShape("roundRect", { x: cx, y: cy, w, h: 0.28, fill: { color: c.bg }, line: { color: c.border, width: 1 }, rectRadius: 0.14 });
      s.addShape("ellipse", { x: cx + 0.1, y: cy + 0.09, w: 0.1, h: 0.1, fill: { color: c.bar }, line: { color: c.bar, width: 0 } });
      s.addText(c.name, { x: cx + 0.25, y: cy, w: w - 0.3, h: 0.28, fontFace: FONT, fontSize: 10, bold: true, color: c.text, margin: 0, valign: "middle", fit: "shrink" }); cx += w + 0.1; });
    ry = cy + 0.38;
  }
  ry += 0.3;
  if (f.sibs.length) {
    const tot = f.sibs.reduce((a, x) => a + (x.amount || 0), 0), price = f.sibs.reduce((a, x) => a + (x.base || 0), 0);
    sec(s, "Fiches du " + f.sibBase, RX, ry, RW, "prix cumulé " + (price ? eur(price) : "—"));
    const th = (t, al) => ({ text: t, options: { bold: true, fontSize: 8, color: C.mute, align: al || "left", fill: { color: C.wash }, fontFace: FONT, charSpacing: 1 } });
    const rows = [[th("FICHE"), th("PRIX", "right"), th("PÉNALITÉS", "right")]];
    f.sibs.slice(0, 9).forEach(x => rows.push([{ text: x.pj, options: { fontFace: FONT, fontSize: 10, bold: true, color: x.current ? C.navy : C.ink } },
      { text: x.base != null ? eur(x.base) : "—", options: { fontFace: FONT, fontSize: 10, align: "right", color: C.ink2 } },
      { text: x.status === "ok" ? (x.amount > 0 ? eur(x.amount) : "0 €") : x.status === "inactive" ? "non activées" : x.status === "incomplete" ? "à compléter" : "—", options: { fontFace: FONT, fontSize: 10, bold: true, align: "right", color: x.amount > 0 ? C.red : C.mute } }]));
    rows.push([{ text: "Total " + f.sibBase, options: { fontFace: FONT, fontSize: 10, bold: true, color: C.navy } }, { text: price ? eur(price) : "—", options: { fontFace: FONT, fontSize: 10, bold: true, align: "right", color: C.navy } }, { text: tot > 0 ? eur(tot) : "0 €", options: { fontFace: FONT, fontSize: 10, bold: true, align: "right", color: tot > 0 ? C.red : C.navy } }]);
    s.addTable(rows, { x: RX, y: ry + 0.42, w: RW, colW: [RW - 3.0, 1.4, 1.6], rowH: 0.26, border: { type: "solid", pt: 0.5, color: C.hair }, margin: [0.01, 0.06, 0.01, 0.06], valign: "middle" });
  }
}

// ── 4 : causes de retard | fil de commentaires (+ suites) ──
function commentCard(s, c, x, y, w) {
  const h = cmH(c);
  s.addShape("rect", { x, y, w, h, fill: { color: C.wash }, line: { color: C.wash, width: 0 } });
  s.addShape("rect", { x, y, w: 0.05, h, fill: { color: TEAL }, line: { color: TEAL, width: 0 } });
  s.addText(c.author || "", { x: x + 0.14, y: y + 0.04, w: w * 0.55, h: 0.2, fontFace: FONT, fontSize: 10, bold: true, color: TEAL, margin: 0 });
  s.addText(c.date ? new Date(c.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "", { x: x + w * 0.5, y: y + 0.04, w: w * 0.5 - 0.1, h: 0.2, align: "right", fontFace: FONT, fontSize: 8.5, color: C.faint, margin: 0 });
  s.addText(clip(c.text, 1000), { x: x + 0.14, y: y + 0.26, w: w - 0.24, h: h - 0.28, fontFace: FONT, fontSize: 10, color: C.ink, margin: 0, valign: "top", fit: "shrink" });
  return h;
}
function pjSlide3(pptx, i, ctx) {
  const pages = commentPages(i); const n = slidesForPj(i);
  const k3 = needsFin(i) ? 4 : 3;
  const s = pptx.addSlide(); pjHeader(s, i, ctx, k3, n);
  const LX = MX, LW = 5.95, RX = MX + 6.35, RW = W - MX - RX; const y0 = 1.42;
  // Causes de retard
  sec(s, "Causes de retard" + ((i.delayList || []).length ? " (" + i.delayList.length + ")" : ""), LX, y0, LW, i.totalDelay > 0 ? i.totalDelay + " j" : "", C.red);
  const types = i.delays || [];
  if (!(i.delayList || []).length) s.addText("Aucune cause de retard enregistrée.", { x: LX, y: y0 + 0.4, w: LW, h: 0.3, fontFace: FONT, fontSize: 10.5, color: C.faint, margin: 0 });
  else {
    const d = 1.2, rx0 = LX, ry0 = y0 + 0.42, tot = types.reduce((a, t) => a + t.days, 0) || 1;
    s.addShape(pptx.shapes.DONUT, { x: rx0, y: ry0, w: d, h: d, fill: { color: C.hair }, line: { color: C.hair, width: 0 } });
    let ang = 270;
    types.forEach((t, q) => { const sweep = t.days / tot * 360; if (sweep > 0.5) { const e = (ang + Math.min(sweep, 359.5)) % 360; s.addShape(pptx.shapes.BLOCK_ARC, { x: rx0, y: ry0, w: d, h: d, fill: { color: DELAY_PAL[q % DELAY_PAL.length] }, line: { color: DELAY_PAL[q % DELAY_PAL.length], width: 0 }, angleRange: [ang % 360, e], arcThicknessRatio: 0.25 }); } ang += sweep; });
    s.addText([{ text: i.totalDelay + "j", options: { fontSize: 15, bold: true, color: C.ink, breakLine: true } }, { text: "de retard", options: { fontSize: 7.5, color: C.faint } }], { x: rx0, y: ry0, w: d, h: d, align: "center", valign: "middle", fontFace: FONT, margin: 0 });
    types.slice(0, 5).forEach((t, q) => {
      const yy = ry0 + 0.04 + q * 0.23;
      s.addShape("ellipse", { x: LX + d + 0.2, y: yy + 0.06, w: 0.1, h: 0.1, fill: { color: DELAY_PAL[q % DELAY_PAL.length] }, line: { color: DELAY_PAL[q % DELAY_PAL.length], width: 0 } });
      s.addText(clip(t.type, 28), { x: LX + d + 0.38, y: yy, w: LW - d - 1.6, h: 0.22, fontFace: FONT, fontSize: 10.5, bold: true, color: C.ink, margin: 0, valign: "middle" });
      s.addText(t.days + " j · " + Math.round(t.days / tot * 100) + " %", { x: LX + LW - 1.2, y: yy, w: 1.2, h: 0.22, align: "right", fontFace: FONT, fontSize: 9.5, color: C.mute, margin: 0, valign: "middle" });
    });
    let cy = ry0 + d + 0.2; const MAXD = 6;
    (i.delayList || []).slice(0, MAXD).forEach(dl => {
      s.addShape("rect", { x: LX, y: cy, w: LW, h: 0.56, fill: { color: C.wash }, line: { color: C.wash, width: 0 } });
      s.addShape("rect", { x: LX, y: cy, w: 0.05, h: 0.56, fill: { color: C.red }, line: { color: C.red, width: 0 } });
      s.addText(dl.type + " — " + dl.days + " j", { x: LX + 0.14, y: cy + 0.04, w: LW * 0.5, h: 0.2, fontFace: FONT, fontSize: 10.5, bold: true, color: C.ink, margin: 0 });
      s.addText((dl.author || "") + (dl.date ? " · " + new Date(dl.date).toLocaleDateString("fr-FR") : ""), { x: LX + LW * 0.45, y: cy + 0.04, w: LW * 0.55 - 0.1, h: 0.2, align: "right", fontFace: FONT, fontSize: 8.5, color: C.faint, margin: 0 });
      s.addText(clip(dl.note, 150), { x: LX + 0.14, y: cy + 0.25, w: LW - 0.24, h: 0.29, fontFace: FONT, fontSize: 9.5, color: C.ink2, margin: 0, valign: "top", fit: "shrink" });
      cy += 0.62;
    });
    if ((i.delayList || []).length > MAXD) s.addText("+ " + (i.delayList.length - MAXD) + " autre(s) cause(s) dans la fiche", { x: LX, y: cy, w: LW, h: 0.2, fontFace: FONT, fontSize: 8.5, color: C.mute, margin: 0 });
  }
  // Fil de commentaires (page 1)
  const nc = (i.comments || []).length;
  sec(s, "Fil de commentaires (" + nc + ")", RX, y0, RW, "hors commentaires privés");
  if (!nc) s.addText("Aucun commentaire.", { x: RX, y: y0 + 0.4, w: RW, h: 0.3, fontFace: FONT, fontSize: 10.5, color: C.faint, margin: 0 });
  let cy = y0 + 0.4; (pages[0] || []).forEach(c => { cy += commentCard(s, c, RX, cy, RW) + 0.08; });
  // Suites : pleine largeur, deux colonnes
  for (let p = 1; p < pages.length; p++) {
    const s2 = pptx.addSlide(); pjHeader(s2, i, ctx, k3 + p, n);
    sec(s2, "Fil de commentaires (suite)", MX, y0, 12.33, p + 1 + " / " + pages.length);
    const colW = (12.33 - 0.35) / 2; let col = 0, yy = y0 + 0.4;
    pages[p].forEach(c => { const h = cmH(c) + 0.08; if (yy + h > 7.0 && col === 0) { col = 1; yy = y0 + 0.4; } commentCard(s2, c, MX + col * (colW + 0.35), yy, colW); yy += h; });
  }
}
const pjSlides = (pptx, i, ctx) => { pjSlide1(pptx, i, ctx); pjSlide2(pptx, i, ctx); if (needsFin(i)) pjSlideFin(pptx, i, ctx); if (needsThird(i)) pjSlide3(pptx, i, ctx); };

// groups = [{chef, items}] ; une seule entrée pour un rapport individuel.
export function buildCdpDeck(PptxGenJS, { groups, dateLabel, lastChange, title, assets }) {
  A = assets || {};
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; pptx.author = "ENOGIA"; pptx.title = title || "Revue de projets";
  const all = groups.flatMap(g => g.items);
  const single = groups.length === 1;
  const sumPages = g => Math.max(1, Math.ceil(g.items.length / 9));
  const total = 1 + groups.reduce((a, g) => a + (single ? 0 : 1) + sumPages(g) + (lastChange ? 1 : 0) + g.items.reduce((n, i) => n + slidesForPj(i), 0), 0);
  let page = 1; const next = () => ++page;
  const late = all.filter(i => i.ecart > 0).length, risk = all.filter(i => Object.values(i.feux).includes("red")).length;
  coverSlide(pptx, { title: single ? groups[0].chef : "Tous les chefs de projet", sub: all.length + " projet" + (all.length > 1 ? "s" : ""), dateLabel, stats: [[all.length, "Projets"], [risk, "À risque"], [late, "Au-delà de la MaD ORC"], [(() => { const g = all.filter(i => i.global != null); return g.length ? Math.round(g.reduce((a, i) => a + i.global, 0) / g.length) + " %" : "—"; })(), "Avancement global moyen"], ...(all.some(i => i.montant) ? [[(() => { const t = all.reduce((a, i) => a + (i.montant || 0), 0); return t >= 1e6 ? (t / 1e6).toFixed(1).replace(".", ",") + " M€" : eur(t); })(), "de montant cumulé"]] : [])] });
  groups.forEach(g => {
    if (!single) { dividerSlide(pptx, g.chef, g.items.length); next(); }
    const ctx = { chef: g.chef, total, page: () => next(), label: "Revue de projets" };
    summarySlides(pptx, g.items, ctx);
    if (lastChange) changesSlide(pptx, g.items, { ...ctx, lastChange });
    g.items.forEach(i => pjSlides(pptx, i, ctx));
  });
  contactSlide(pptx);
  return pptx;
}
