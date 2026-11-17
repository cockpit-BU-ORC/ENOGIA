// v374 — fiche du lundi du Cash in : PDF de 3 pages (l'année, le mois en cours avec les retards, le mois qui arrive),
// image de la courbe pour le mail (PNG : les clients mail n'affichent pas le SVG) et envoi par Google Workspace (SMTP).
// Les chiffres et le HTML du mail viennent de functions/shared/cashWeekly.mjs, copie de src/cashWeekly.js (même code que l'aperçu du site).
"use strict";

const PDFDocument = require("pdfkit");

// Helvetica (polices de base du PDF) : jeu de caractères WinAnsi — on remplace ce qu'il n'a pas
const WIN = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•—˜™š›œžŸ"; // caractères de WinAnsi au-delà de Latin-1
const P = s => String(s == null ? "" : s).replace(/[\u2212\u2013]/g, "-").replace(/[\u202F\u00A0]/g, " ").replace(/\u2192/g, "->").replace(/[\r\n\t]+/g, " ").replace(/[^\u0020-\u00FF]/gu, c => (WIN.includes(c) ? c : ""));
const C = { ink: "#18202E", ink7: "#3D4757", ink5: "#5F6979", ink3: "#9AA3B0", line: "#DCE1E8", hair: "#ECEFF3", alt: "#F5F7F9", init: "#B7BFCB", green: "#1D7350", red: "#B3322E", bill: "#2F5A9E", amber: "#8A5A00", amber1: "#FFF1D6" };
const ddmm = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) : "-");

function buildPdf(rep, M, now = new Date()) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 40, bottom: 0, left: 40, right: 40 }, bufferPages: true, info: { Title: P(M.subject(rep)), Author: "Cockpit BU ORC" } });
    const out = []; doc.on("data", b => out.push(b)); doc.on("end", () => resolve(Buffer.concat(out))); doc.on("error", reject);
    const L = 40, R = 555, W = R - L, gen = "Cockpit BU ORC · généré le " + now.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) + " à " + now.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
    let y = 40;
    const t = (s, x, yy, o = {}) => { doc.font(o.b ? "Helvetica-Bold" : "Helvetica").fontSize(o.s || 9).fillColor(o.c || C.ink).text(P(s), x, yy, { width: o.w, align: o.a || "left", lineBreak: !!o.wrap, ellipsis: !o.wrap }); };
    const head = (title, right, n) => {
      if (n > 1) doc.addPage(); y = 40;
      t(title, L, y, { b: 1, s: 12, w: 360 }); t(right, L + 300, y + 3, { s: 8, c: C.ink5, w: W - 300, a: "right" });
      y += 18; doc.moveTo(L, y).lineTo(R, y).lineWidth(1.5).strokeColor(C.ink).stroke(); y += 8;
    };
    const sentence = s => { doc.font("Helvetica-Bold").fontSize(12).fillColor(C.ink); const h = doc.heightOfString(P(s), { width: W }); doc.text(P(s), L, y, { width: W }); y += h + 8; };
    const kpis = list => { const cw = W / list.length; list.forEach(([l, v, d, col, dc], i) => { const x = L + i * cw; doc.moveTo(x, y).lineTo(x + cw - 8, y).lineWidth(1.5).strokeColor(C.line).stroke(); t(l, x, y + 4, { s: 7.5, c: C.ink5, w: cw - 8 }); t(v, x, y + 14, { b: 1, s: 14, c: col || C.ink, w: cw - 8 }); t(d || "", x, y + 32, { s: 7.5, c: dc || (d && d[0] === "−" ? C.red : C.ink5), w: cw - 8 }); }); y += 48; };
    const sub = s => { t(s, L, y, { b: 1, s: 9.5, w: W }); y += 14; };
    const note = (s, col) => { doc.font("Helvetica").fontSize(8).fillColor(col || C.ink5); const h = doc.heightOfString(P(s), { width: W }); doc.text(P(s), L, y, { width: W }); y += h + 6; };
    // tableau : cols = [{ l, w, a }] ; rows = [[cellules]] ; colors = (ligne, colonne) → couleur
    const table = (cols, rows, o = {}) => {
      const rh = o.rh || 13, max = o.max || 999; let x = L;
      cols.forEach(c => { t(c.l, x + 2, y, { s: 7.5, c: C.ink5, w: c.w - 4, a: c.a }); x += c.w; });
      y += 11; doc.moveTo(L, y).lineTo(R, y).lineWidth(.8).strokeColor(C.ink3).stroke(); y += 2;
      rows.slice(0, max).forEach((r, i) => { x = L; if (o.hl && o.hl(i)) doc.rect(L, y - 1, W, rh).fill("#FFFBEF");
        r.forEach((v, j) => { const c = cols[j]; t(v, x + 2, y + 2, { s: 8, b: o.bold && o.bold(i, j), c: (o.color && o.color(i, j)) || C.ink, w: c.w - 4, a: c.a }); x += c.w; });
        y += rh; doc.moveTo(L, y - 1).lineTo(R, y - 1).lineWidth(.5).strokeColor(C.hair).stroke(); });
      if (rows.length > max) { t("… et " + (rows.length - max) + " autres", L + 2, y + 1, { s: 7.5, c: C.ink5, w: W }); y += 12; }
      y += 6;
    };
    const fk = M.fmtK, fs = M.fmtS, pc = (v, b) => { const p = M.pct(v, b); return p == null ? "" : (p > 0 ? "+" : p < 0 ? "−" : "") + Math.abs(p) + " %"; };
    const red = v => (v < 0 ? C.red : v > 0 ? C.green : C.ink5);

    // ── 1 · L'année ──
    head("1 · L'année " + rep.year, "Cash in · BU ORC · semaine " + rep.week.w, 1);
    sentence(M.headline(rep).split(".")[0] + ". Fin d'année prévue à " + fk(rep.yearEnd.forecast) + " au lieu de " + fk(rep.yearEnd.init) + ".");
    kpis([["Encaissé depuis janvier", fk(rep.ytd.paid), fs(rep.ytd.gap) + " · " + pc(rep.ytd.gap, rep.ytd.initToDate)], ["Facturé depuis janvier", fk(rep.ytd.fact), fs(rep.ytd.factGap) + " · " + pc(rep.ytd.factGap, rep.ytd.factInit)],
      ["Fin d'année prévue", fk(rep.yearEnd.forecast), fs(rep.yearEnd.gap) + " · " + pc(rep.yearEnd.gap, rep.yearEnd.init)], ["Si les retards sont payés", fk(rep.yearEnd.ifLate), fs(rep.yearEnd.ifLate - rep.yearEnd.init)]]);
    // courbe (même géométrie que le mail)
    const gh = 200, g = M.curveGeom(rep, W - 50, gh), ox = L + 50, oy = y;
    g.grid.forEach(gr => { doc.moveTo(ox + g.x0, oy + gr.y).lineTo(ox + g.x1, oy + gr.y).lineWidth(.5).strokeColor(C.hair).stroke(); t(fk(gr.v), L, oy + gr.y - 4, { s: 7, c: C.ink5, w: 46, a: "right" }); });
    doc.moveTo(ox + g.x0, oy + g.y1).lineTo(ox + g.x1, oy + g.y1).lineWidth(.5).strokeColor(C.line).stroke();
    const line = (pts, col, wd, dash) => { doc.save(); if (dash) doc.dash(dash[0], { space: dash[1] }); pts.forEach((p, i) => (i ? doc.lineTo(ox + p[0], oy + p[1]) : doc.moveTo(ox + p[0], oy + p[1]))); doc.lineWidth(wd).strokeColor(col).stroke(); doc.restore(); };
    doc.moveTo(ox + g.today.x, oy + g.y0).lineTo(ox + g.today.x, oy + g.y1).lineWidth(.7).strokeColor(C.ink).stroke();
    line(g.ini, C.init, 2); line(g.late, C.ink3, 1, [2, 3]); line(g.fc, C.green, 2, [4, 3]); line(g.real, C.green, 2);
    if (Math.abs(g.today.yIni - g.today.yReal) > 2) { doc.moveTo(ox + g.today.x, oy + g.today.yIni).lineTo(ox + g.today.x, oy + g.today.yReal).lineWidth(3).strokeColor(g.today.yReal > g.today.yIni ? C.red : C.green).stroke(); }
    doc.circle(ox + g.today.x, oy + g.today.yReal, 3).fill(C.green);
    ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."].forEach((m, i) => t(m, ox + g.x0 + i * g.xs, oy + gh + 2, { s: 7, c: i === rep.curve.cur ? C.ink : C.ink5, b: i === rep.curve.cur, w: g.xs, a: "center" }));
    y = oy + gh + 14;
    note("Gris : initial · vert plein : encaissé · vert pointillé : prévu · gris pointillé : si les retards sont payés · trait vertical : aujourd'hui.");
    sub("Mois par mois (encaissements)");
    const c = rep.curve; let cum = 0;
    const mrows = rep.months.map((m, i) => { const e = m.act - m.init; cum += e; return [M.MONTHS[i], fk(m.init), fk(m.act), fs(e), fs(cum)]; });
    const ti = rep.months.reduce((s, m) => s + m.init, 0), ta = rep.months.reduce((s, m) => s + m.act, 0);
    mrows.push(["Année", fk(ti), fk(ta), fs(ta - ti), ""]);
    table([{ l: "Mois", w: 120 }, { l: "Initial", w: 95, a: "right" }, { l: "Réel + actualisé", w: 110, a: "right" }, { l: "Écart", w: 95, a: "right" }, { l: "Écart cumulé", w: W - 420, a: "right" }], mrows,
      { rh: 12.5, hl: i => i === c.cur, bold: i => i === 12, color: (i, j) => (j >= 3 ? (mrows[i][j][0] === "−" ? C.red : mrows[i][j][0] === "+" ? C.green : C.ink) : null) });

    note("Comme l'onglet « Cash par mois » : un mois passé compte les paiements reçus et ceux encore attendus à sa date prévue ; le total de l'année comprend donc les retards.");
    // v376 : des listes datées par mois — v385 (demandé : « les sommes en bas de chaque tableau et des graphiques (barres ou camembert) pour
    // comprendre où nous en sommes sur le mois en cours et le mois prochain ; ne pas mettre les commentaires ») : barres de situation en tête
    // de page (initial en trait), total sous chaque tableau, plus de commentaires.
    let cont = null; // titre de la page en cours, pour une page « suite »
    const room = h => { if (y + h > 795) { head(cont + " (suite)", "", 2); } };
    const cols = [{ l: "", w: 92 }, { l: "PJ", w: 52 }, { l: "Jalon", w: 132 }, { l: "Client", w: 92 }, { l: "Date", w: 92 }, { l: "Montant", w: W - 460, a: "right" }];
    const list = (title, items, row, empty, totalOf) => {
      room(40); sub(title + (items.length ? " · " + items.length : ""));
      if (!items.length) { note(empty); return; }
      let x = L; cols.forEach(c => { t(c.l, x + 2, y, { s: 7.5, c: C.ink5, w: c.w - 4, a: c.a }); x += c.w; });
      y += 11; doc.moveTo(L, y).lineTo(R, y).lineWidth(.8).strokeColor(C.ink3).stroke(); y += 2;
      items.forEach(it => {
        const [tag, tagC, date, dateC, money, moneyC] = row(it);
        room(15);
        x = L; [[tag, tagC], [it.pj, C.ink, 1], [it.jalon], [it.client, C.ink5], [date, dateC], [money, moneyC, 1]].forEach(([v, c, bd], j) => { t(v, x + 2, y + 2, { s: 8, b: bd, c: c || C.ink, w: cols[j].w - 4, a: cols[j].a }); x += cols[j].w; });
        y += 13; doc.moveTo(L, y + 1).lineTo(R, y + 1).lineWidth(.5).strokeColor(C.hair).stroke(); y += 3;
      });
      // total du tableau
      room(16); doc.moveTo(L, y).lineTo(R, y).lineWidth(1).strokeColor(C.ink).stroke();
      t("Total", L + 2, y + 3, { s: 8.5, b: 1, w: 200 }); t(fk(totalOf ? totalOf(items) : items.reduce((q, it) => q + (+it.montant || 0), 0)), R - 120, y + 3, { s: 8.5, b: 1, w: 118, a: "right" });
      y += 22;
    };
    // barre de situation : segments [valeur, couleur, libellé] sur une échelle commune, trait = initial du mois
    const bars = (title, rowsB) => {
      room(30 + rowsB.length * 26); sub(title);
      const lw = 110, bw = W - lw - 120, max = Math.max(1, ...rowsB.map(r => Math.max(r.init || 0, r.segs.reduce((q, g) => q + g[0], 0))));
      rowsB.forEach(r => {
        const tot = r.segs.reduce((q, g) => q + g[0], 0);
        t(r.label, L, y + 3, { s: 8.5, b: 1, w: lw - 6 });
        doc.rect(L + lw, y, bw, 14).fill(C.hair);
        let x = L + lw; r.segs.forEach(([v, c]) => { const w = bw * v / max; if (w > 0) { doc.rect(x, y, w, 14).fill(c); x += w; } });
        if (r.init) { const xi = L + lw + bw * r.init / max; doc.moveTo(xi, y - 3).lineTo(xi, y + 17).lineWidth(1.5).strokeColor(C.ink).stroke(); }
        t(fk(tot) + (r.init ? "  /  initial " + fk(r.init) : ""), L + lw + bw + 6, y + 3, { s: 8, w: 118 });
        y += 18;
        t(r.segs.filter(g => g[0] > 0).map(g => g[2] + " " + fk(g[0])).join(" · ") || "rien ce mois-ci", L + lw, y - 1, { s: 7.5, c: C.ink5, w: bw + 120 });
        y += 10;
      });
      t("Trait noir : montant prévu à l'initial pour le mois.", L, y, { s: 7.5, c: C.ink5, w: W }); y += 14;
    };
    const LG = "#7DB89C", LB = "#9DB6DA";

    // ── 2 · Le mois en cours ──
    const cu = rep.cur, ct = cu.lists.tot, lateF = cu.lists.factures.filter(x => !x.done && x.late).reduce((q, x) => q + x.montant, 0);
    cont = "2 · " + cu.label; head("2 · " + cu.label + ", le mois en cours", "au " + ddmm(rep.today) + "/" + rep.year, 2);
    bars("Où en est " + cu.label.toLowerCase(), [
      { label: "Factures", init: cu.fact.init, segs: [[ct.factDone, C.bill, "émises"], [ct.factTodo - lateF, LB, "à émettre"], [lateF, C.red, "à émettre en retard"]] },
      { label: "Encaissements", init: cu.enc.init, segs: [[ct.recus, C.green, "reçus"], [ct.prevus - ct.prevusLate, LG, "attendus"], [ct.prevusLate, C.red, "en retard"]] },
    ]);
    list("Factures du mois", cu.lists.factures, x => [x.done ? "Émise" : x.late ? "À émettre · " + x.late + " j" : "À émettre", x.done ? C.bill : x.late ? C.red : C.ink5, (x.done ? "émise le " : "prévue le ") + ddmm(x.date), x.late && !x.done ? C.red : C.ink, fk(x.montant), C.ink], "Aucune facture ce mois-ci.");
    list("Encaissements prévus", cu.lists.prevus, x => [x.late ? x.late + " j de retard" : x.invoiced ? "Facturé" : "Pas facturé", x.late ? C.red : x.invoiced ? C.bill : C.ink5, "prévu le " + ddmm(x.date), x.late ? C.red : C.ink, fk(x.montant), C.ink], "Plus rien n'est attendu ce mois-ci.");
    list("Encaissements reçus", cu.lists.recus, x => ["Reçu", C.green, "le " + ddmm(x.date) + (x.delay ? " (" + (x.delay > 0 ? "+" : "-") + Math.abs(x.delay) + " j)" : ""), x.delay > 0 ? C.red : C.ink, fk(x.montant) + (x.gap != null ? " / " + fk(x.prevu) : ""), x.gap != null && x.gap < 0 ? C.red : C.green], "Rien n'est encore arrivé ce mois-ci.");

    // ── 3 · Le mois qui arrive ──
    const n = rep.next, nt = n.lists.tot, factInv = n.lists.prevus.filter(x => x.invoiced).reduce((q, x) => q + x.montant, 0);
    cont = "3 · " + n.label; head("3 · " + n.label + ", le mois qui arrive", "dates prévues au " + ddmm(rep.today), 3);
    bars("Ce qui est prévu en " + n.label.toLowerCase(), [
      { label: "Factures", init: n.fact.init, segs: [[nt.factTodo, LB, "à émettre"]] },
      { label: "Encaissements", init: n.enc.init, segs: [[factInv, LG, "déjà facturés"], [nt.prevus - factInv, "#C9E3D5", "pas encore facturés"]] },
    ]);
    list("Factures à émettre", n.lists.factures, x => ["À émettre", C.bill, "prévue le " + ddmm(x.date), C.ink, fk(x.montant), C.ink], "Aucune facture prévue.");
    list("Encaissements prévus", n.lists.prevus, x => [x.invoiced ? "Facturé" : "Pas facturé", x.invoiced ? C.bill : C.ink5, "prévu le " + ddmm(x.date), C.ink, fk(x.montant), C.ink], "Aucun encaissement prévu.");

    // pied de chaque page : n / total
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) { doc.switchToPage(range.start + i); t(gen, L, 812, { s: 7, c: C.ink3, w: 300 }); t((i + 1) + " / " + range.count, R - 60, 812, { s: 7, c: C.ink3, w: 60, a: "right" }); }
    doc.end();
  });
}

// Courbe en PNG (2× pour les écrans haute définition) ; sans texte (pas de police à charger)
function curvePng(rep, M) {
  const { Resvg } = require("@resvg/resvg-js");
  return new Resvg(M.curveSvg(rep, 560, 210), { fitTo: { mode: "width", value: 1120 }, font: { loadSystemFonts: false } }).render().asPng();
}

// Envoi SMTP Google Workspace (compte d'envoi + mot de passe d'application, secrets MAIL_USER / MAIL_PASS)
async function sendMail({ user, pass, to, subject, html, text, png, pdf, pdfName }) {
  const nodemailer = require("nodemailer");
  const tr = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  return tr.sendMail({ from: { name: "Cockpit BU ORC", address: user }, to, subject, html, text,
    attachments: [{ filename: "courbe.png", content: png, cid: "courbe", contentType: "image/png" }, { filename: pdfName, content: pdf, contentType: "application/pdf" }] });
}

module.exports = { buildPdf, curvePng, sendMail, P };
