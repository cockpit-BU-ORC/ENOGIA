// v374 — fiche du lundi du Cash in : PDF de 3 pages (l'année, le mois en cours avec les retards, le mois qui arrive),
// image de la courbe pour le mail (PNG : les clients mail n'affichent pas le SVG) et envoi par Google Workspace (SMTP).
// Les chiffres et le HTML du mail viennent de functions/shared/cashWeekly.mjs, copie de src/cashWeekly.js (même code que l'aperçu du site).
"use strict";

const PDFDocument = require("pdfkit");

// Helvetica (polices de base du PDF) : jeu de caractères WinAnsi — on remplace ce qu'il n'a pas
const P = s => String(s == null ? "" : s).replace(/[−–]/g, "-").replace(/[  ]/g, " ").replace(/→/g, "->");
const C = { ink: "#18202E", ink7: "#3D4757", ink5: "#5F6979", ink3: "#9AA3B0", line: "#DCE1E8", hair: "#ECEFF3", alt: "#F5F7F9", init: "#B7BFCB", green: "#1D7350", red: "#B3322E", bill: "#2F5A9E", amber: "#8A5A00", amber1: "#FFF1D6" };
const ddmm = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) : "-");

function buildPdf(rep, M, now = new Date()) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 40, bottom: 0, left: 40, right: 40 }, info: { Title: P(M.subject(rep)), Author: "Cockpit BU ORC" } });
    const out = []; doc.on("data", b => out.push(b)); doc.on("end", () => resolve(Buffer.concat(out))); doc.on("error", reject);
    const L = 40, R = 555, W = R - L, gen = "Cockpit BU ORC · généré le " + now.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) + " à " + now.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
    let y = 40;
    const t = (s, x, yy, o = {}) => { doc.font(o.b ? "Helvetica-Bold" : "Helvetica").fontSize(o.s || 9).fillColor(o.c || C.ink).text(P(s), x, yy, { width: o.w, align: o.a || "left", lineBreak: !!o.wrap, ellipsis: !o.wrap }); };
    const head = (title, right, n) => {
      if (n > 1) doc.addPage(); y = 40;
      t(title, L, y, { b: 1, s: 12, w: 360 }); t(right, L + 300, y + 3, { s: 8, c: C.ink5, w: W - 300, a: "right" });
      y += 18; doc.moveTo(L, y).lineTo(R, y).lineWidth(1.5).strokeColor(C.ink).stroke(); y += 8;
      t(gen, L, 812, { s: 7, c: C.ink3, w: 300 }); t(n + " / 3", R - 60, 812, { s: 7, c: C.ink3, w: 60, a: "right" });
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
    // ── 2 · Le mois en cours ──
    const cu = rep.cur, rt = rep.retards, d = rep.delta || {};
    head("2 · " + cu.label + ", le mois en cours", "au " + ddmm(rep.today) + "/" + rep.year, 2);
    sentence(cu.label + " finira vers " + fk(cu.enc.act) + " encaissés au lieu de " + fk(cu.enc.init) + " ; " + fk(rep.late.total) + " sont en retard.");
    table([{ l: "", w: 120 }, { l: "Initial", w: 100, a: "right" }, { l: "Réel + actualisé", w: 160, a: "right" }, { l: "Écart", w: 80, a: "right" }, { l: "%", w: W - 460, a: "right" }],
      [["Encaissements", fk(cu.enc.init), fk(cu.enc.act) + " (" + fk(cu.enc.paid) + " reçus)", fs(cu.enc.gap), pc(cu.enc.gap, cu.enc.init)], ["Factures", fk(cu.fact.init), fk(cu.fact.act) + " (" + fk(cu.fact.done) + " émis)", fs(cu.fact.gap), pc(cu.fact.gap, cu.fact.init)]],
      { color: (i, j) => (j >= 3 ? red(i ? cu.fact.gap : cu.enc.gap) : null) });
    if (cu.ontime != null) note("Dates tenues ce mois-ci : " + cu.ontime + " % des montants payés à l'heure (pas plus tard que l'initial).");
    sub("Retards et décalages (face à lundi dernier)");
    const dd = (v, f) => (v == null ? "" : Math.round(v * 10) === 0 ? "=" : f(v));
    const dj = v => (v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v * 10) / 10).toLocaleString("fr-FR") + " j");
    const wc = v => (v == null || Math.round(v * 10) === 0 ? C.ink5 : v > 0 ? C.red : C.green); // plus de retard = pire
    kpis([["Retard moyen de paiement", dj(rt.avgRet), dd(d.avgRet, dj), null, wc(d.avgRet)], ["Payés en retard", rt.latePct == null ? "–" : rt.latePct + " %", dd(d.latePct, v => (v > 0 ? "+" : "−") + Math.abs(v) + " pt"), null, wc(d.latePct)],
      ["Glissement face à l'initial", dj(rt.avgGl), dd(d.avgGl, dj), null, wc(d.avgGl)], ["En retard aujourd'hui", fk(rep.late.total), dd(d.late, fs), C.red, wc(d.late)]]);
    sub("Jalons en retard · " + rep.late.items.length + " · " + fk(rep.late.total));
    table([{ l: "", w: 50 }, { l: "PJ", w: 60 }, { l: "Jalon", w: 120 }, { l: "Client", w: 85 }, { l: "Chef", w: 70 }, { l: "Échu le", w: 40 }, { l: "Retard", w: 35, a: "right" }, { l: "Montant", w: W - 460, a: "right" }],
      rep.late.items.map(x => [x.kind === "facture" ? "Facture" : "Paiement", x.pj, x.jalon, x.client, x.chef, ddmm(x.date), x.days + " j", fk(x.montant)]), { max: 24, bold: (i, j) => j === 1, color: (i, j) => (j === 6 ? C.red : j === 0 ? (rep.late.items[i].kind === "facture" ? C.bill : C.green) : null) });
    sub("Cette semaine");
    if (rep.thisWeek.length) table([{ l: "", w: 70 }, { l: "PJ", w: 70 }, { l: "Jalon", w: 210 }, { l: "Date", w: 70 }, { l: "Montant", w: W - 420, a: "right" }], rep.thisWeek.map(x => [x.kind === "facture" ? "Facture" : "Paiement", x.pj, x.jalon, ddmm(x.date), fk(x.montant)]), { max: 8 });
    else note("Rien n'est attendu cette semaine.");

    // ── 3 · Le mois qui arrive ──
    const n = rep.next;
    head("3 · " + n.label + ", le mois qui arrive", "dates prévues au " + ddmm(rep.today), 3);
    sentence(n.label + " est prévu à " + fk(n.enc.act) + " encaissés au lieu de " + fk(n.enc.init) + " ; " + fk(n.fact.act) + " de factures à émettre.");
    table([{ l: "", w: 120 }, { l: "Initial", w: 100, a: "right" }, { l: "Prévu", w: 160, a: "right" }, { l: "Écart", w: 80, a: "right" }, { l: "%", w: W - 460, a: "right" }],
      [["Encaissements", fk(n.enc.init), fk(n.enc.act), fs(n.enc.gap), pc(n.enc.gap, n.enc.init)], ["Factures", fk(n.fact.init), fk(n.fact.act), fs(n.fact.gap), pc(n.fact.gap, n.fact.init)]],
      { color: (i, j) => (j >= 3 ? red(i ? n.fact.gap : n.enc.gap) : null) });
    if (n.enc.pushedN) note(n.enc.pushedN + " jalon" + (n.enc.pushedN > 1 ? "s prévus" : " prévu") + " ce mois-ci à l'initial " + (n.enc.pushedN > 1 ? "sont partis" : "est parti") + " plus tard (" + fk(n.enc.pushed) + ").");
    sub("Jalons du mois, par date");
    table([{ l: "", w: 60 }, { l: "Date", w: 45 }, { l: "PJ", w: 65 }, { l: "Jalon", w: 150 }, { l: "Client", w: 95 }, { l: "Chef", w: 60 }, { l: "Montant", w: W - 475, a: "right" }],
      n.items.map(x => [x.kind === "facture" ? "Facture" : "Paiement", ddmm(x.date), x.pj, x.jalon, x.client, x.chef, fk(x.montant)]), { max: 34, bold: (i, j) => j === 2, color: (i, j) => (j === 0 ? (n.items[i].kind === "facture" ? C.bill : C.green) : null) });
    if (n.watch.length || n.endDays.length) {
      const txt = "À surveiller · " + [n.watch.length ? n.watch.map(x => x.pj + " " + x.jalon + " (" + fk(x.montant) + ", le " + ddmm(x.date) + ")").join(" et ") + " port" + (n.watch.length > 1 ? "ent" : "e") + " " + M.pct(n.watch.reduce((s, x) => s + x.montant, 0), n.enc.act) + " % des paiements du mois." : "", n.endDays.length ? n.endDays.length + " paiement(s) dans les deux derniers jours du mois." : ""].filter(Boolean).join(" ");
      doc.font("Helvetica").fontSize(8.5); const h = doc.heightOfString(P(txt), { width: W - 16 }) + 10;
      doc.rect(L, y, W, h).fill(C.amber1); doc.rect(L, y, 2, h).fill(C.amber); doc.fillColor(C.ink).text(P(txt), L + 10, y + 5, { width: W - 16 }); y += h + 6;
    }
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
