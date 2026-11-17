// v374 (maquette maquettes-design/v375-fiche-lundi-G.html, piste G validée : « Oui, code G ») — la fiche du lundi du Cash in,
// envoyée par le site (plus par l'artefact « Cash in PJ ») : trois parties — l'année (courbe cumulée face à l'initial), le mois en cours
// avec les retards, le mois qui arrive. Calculs purs (aucun accès à Firebase) : le même fichier sert à l'aperçu de la page
// Cash in › Fiche du lundi et à la fonction serveur qui envoie le mail (copié dans functions/shared par scripts/sync-functions.js).
// Mêmes règles que les onglets du Cash in : statut (cashinLink), Cash par mois et Écarts (cashinModel). Jalons EPC exclus.
import { statusOf, addDays, diffDays } from "./cashinLink";
import { monthly, ecartKpis } from "./cashinModel";

export const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const amt = r => Number(r && r.montant) || 0;
const live = rows => (rows || []).filter(r => r && !r.epc && amt(r) > 0);
const ym = iso => (iso ? String(iso).slice(0, 7) : "");
const nextYm = k => { let y = +k.slice(0, 4), m = +k.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return y + "-" + String(m).padStart(2, "0"); };
export const monthName = k => MONTHS[+k.slice(5, 7) - 1] || "";
export function isoWeek(iso) { const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z"), n = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - n); const y = d.getUTCFullYear(); return { y, w: Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7) }; }
export const mondayOf = iso => { const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z"); return addDays(String(iso).slice(0, 10), -((d.getUTCDay() + 6) % 7)); };
const ddmm = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) : "—");
const initEnc = r => r.encInit || r.encPrevue || r.encReelle || null; // comme monthKeys (Cash par mois)
const initFact = r => r.factInit || r.factPrevue || r.factReelle || null;

// Montants : 1,02 M€ · 436 k€ · 850 € ; signé : −1,02 M€ / +12 k€
export function fmtK(v) {
  const a = Math.abs(v || 0);
  if (a >= 995000) return (a / 1e6).toFixed(2).replace(".", ",") + " M€";
  if (a >= 1000) return Math.round(a / 1000) + " k€";
  return Math.round(a) + " €";
}
export const fmtS = v => (Math.round(v || 0) === 0 ? "0 €" : (v < 0 ? "−" : "+") + fmtK(v));
export const pct = (v, base) => (base ? Math.round(v / base * 100) : null);
const fmtPct = (v, base) => { const p = pct(v, base); return p == null ? "" : (p > 0 ? "+" : p < 0 ? "−" : "") + Math.abs(p) + " %"; };
const days1 = v => (v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v * 10) / 10).toLocaleString("fr-FR") + " j");

// Un mois (« Cash par mois ») : encaissements initial → réel + actualisé, factures initial → émis + à émettre, jalons repoussés
export function monthView(rows, key, today) {
  const L = live(rows), m = monthly(L, today).months.find(x => x.key === key) || { init: 0, paid: 0, fc: 0, ot: 0, sh: 0 };
  let initN = 0, actN = 0, pushedN = 0, pushed = 0, fInit = 0, fInitN = 0, fDone = 0, fTodo = 0, fN = 0;
  L.forEach(r => {
    const a = amt(r), ik = ym(initEnc(r)), ak = ym(r.encReelle || r.encPrevue);
    if (ik === key) { initN++; if (ak && ak > key) { pushedN++; pushed += a; } }
    if (ak === key) actN++;
    if (ym(initFact(r)) === key) { fInit += a; fInitN++; }
    if (r.factReelle && ym(r.factReelle) === key) { fDone += a; fN++; }
    else if (!r.factReelle && ym(r.factPrevue) === key) { fTodo += a; fN++; }
  });
  const act = m.paid + m.fc;
  return { key, label: cap(monthName(key)), enc: { init: m.init, initN, paid: m.paid, fc: m.fc, act, actN, gap: act - m.init, pushed, pushedN },
    fact: { init: fInit, initN: fInitN, done: fDone, todo: fTodo, act: fDone + fTodo, actN: fN, gap: fDone + fTodo - fInit },
    ontime: m.ot + m.sh ? Math.round(m.ot / (m.ot + m.sh) * 100) : null };
}

// Jalon décrit pour la fiche (une ligne)
const item = (r, kind, date, doc, today) => ({ id: r.id, pj: r.pj, jalon: r.jalon || "Jalon", client: (doc.labels || {})[r.pj] || "", chef: (doc.owners || {})[r.pj] || "", kind, date, days: date && date < today ? diffDays(date, today) : 0, montant: amt(r) });

// Toute la fiche. prev = instantané de l'envoi précédent (snapshot) pour « face à lundi dernier ».
export function weeklyReport(doc, today, prev) {
  doc = doc || {}; const rows = live(doc.rows), Y = today.slice(0, 4), cur = today.slice(0, 7), nxt = nextYm(cur);
  const initM = Array(12).fill(0), paidM = Array(12).fill(0), fcM = Array(12).fill(0);
  let initToDate = 0, paidYtd = 0, factYtd = 0, factInitToDate = 0, lateCash = 0, lateBill = 0, lateBillN = 0, lateEnc = 0, lateEncN = 0;
  const late = [];
  rows.forEach(r => {
    const a = amt(r), ie = initEnc(r), st = statusOf(r, today);
    if (ie && ie.slice(0, 4) === Y) { initM[+ie.slice(5, 7) - 1] += a; if (ie <= today) initToDate += a; }
    if (r.encReelle) { if (r.encReelle.slice(0, 4) === Y && r.encReelle <= today) { paidM[+r.encReelle.slice(5, 7) - 1] += a; paidYtd += a; } }
    else if (r.encPrevue) { if (r.encPrevue < today) lateCash += a; else if (r.encPrevue.slice(0, 4) === Y) fcM[+r.encPrevue.slice(5, 7) - 1] += a; }
    if (r.factReelle && r.factReelle.slice(0, 4) === Y && r.factReelle <= today) factYtd += a;
    const fi = initFact(r); if (fi && fi.slice(0, 4) === Y && fi <= today) factInitToDate += a;
    if (st.k === "tobill" && (st.days || 0) > 0) { lateBill += a; lateBillN++; late.push(item(r, "facture", addDays(today, -st.days), doc, today)); }
    if (st.k === "late") { lateEnc += a; lateEncN++; late.push(item(r, "paiement", r.encPrevue, doc, today)); }
  });
  late.sort((a, b) => b.montant - a.montant || b.days - a.days);
  const initYear = initM.reduce((s, v) => s + v, 0), toYearEnd = fcM.reduce((s, v) => s + v, 0), forecastYear = paidYtd + toYearEnd;
  const k = ecartKpis(rows, today);
  const ret = { avgRet: k.avgRet, paidN: k.paidN, lateN: k.lateN, latePct: k.paidN ? Math.round(k.lateN / k.paidN * 100) : null, avgGl: k.avgGl, glN: k.glN,
    worst: k.worst ? { v: k.worst.v, pj: k.worst.r.pj, jalon: k.worst.r.jalon || "", client: (doc.labels || {})[k.worst.r.pj] || "", chef: (doc.owners || {})[k.worst.r.pj] || "" } : null };
  // la semaine (lundi → dimanche)
  const mon = mondayOf(today), sun = addDays(mon, 6), week = [];
  rows.forEach(r => {
    if (!r.encReelle && r.encPrevue && r.encPrevue >= today && r.encPrevue <= sun) week.push(item(r, "paiement", r.encPrevue, doc, today));
    if (!r.factReelle && r.factPrevue && r.factPrevue >= today && r.factPrevue <= sun) week.push(item(r, "facture", r.factPrevue, doc, today));
  });
  week.sort((a, b) => a.date.localeCompare(b.date));
  // le mois qui arrive : jalons par semaine, jalons déjà partis au mois suivant, gros jalons à surveiller
  const nextItems = [];
  rows.forEach(r => {
    if (!r.factReelle && ym(r.factPrevue) === nxt) nextItems.push(item(r, "facture", r.factPrevue, doc, today));
    if (!r.encReelle && ym(r.encPrevue) === nxt) nextItems.push(item(r, "paiement", r.encPrevue, doc, today));
  });
  nextItems.sort((a, b) => a.date.localeCompare(b.date) || b.montant - a.montant);
  const byWeek = []; nextItems.forEach(x => { const m = mondayOf(x.date); let g = byWeek.find(w => w.mon === m); if (!g) byWeek.push(g = { mon: m, w: isoWeek(m).w, fact: [], enc: [], total: 0 }); (x.kind === "facture" ? g.fact : g.enc).push(x); g.total += x.montant; });
  const nextM = monthView(rows, nxt, today), encNext = nextItems.filter(x => x.kind === "paiement"), encTot = encNext.reduce((s, x) => s + x.montant, 0);
  const watch = encNext.length < 3 ? [] : encNext.filter(x => encTot && x.montant >= .25 * encTot).sort((a, b) => b.montant - a.montant).slice(0, 2);
  const endDays = encNext.filter(x => diffDays(x.date, addDays(nextYm(nxt) + "-01", -1)) <= 2);
  const lateAmt = lateBill + lateEnc;
  // les 12 mois tels que l'onglet « Cash par mois » les montre (un paiement en retard reste dans son mois prévu)
  const mm = monthly(rows, today).months, months = Array.from({ length: 12 }, (_, i) => { const x = mm.find(o => o.key === Y + "-" + String(i + 1).padStart(2, "0")) || { init: 0, paid: 0, fc: 0 }; return { init: x.init, paid: x.paid, fc: x.fc, act: x.paid + x.fc }; });
  const r = {
    today, week: isoWeek(today), mon, sun, year: +Y,
    ytd: { paid: paidYtd, initToDate, gap: paidYtd - initToDate, fact: factYtd, factInit: factInitToDate, factGap: factYtd - factInitToDate },
    yearEnd: { init: initYear, forecast: forecastYear, gap: forecastYear - initYear, toYearEnd, ifLate: forecastYear + lateCash, lateCash },
    months, curve: { initM, paidM, fcM, cur: +cur.slice(5, 7) - 1, dayFrac: (+today.slice(8, 10)) / 30.5 },
    late: { bill: lateBill, billN: lateBillN, enc: lateEnc, encN: lateEncN, total: lateAmt, items: late },
    retards: ret, cur: monthView(rows, cur, today), next: { ...nextM, items: nextItems, byWeek, watch, endDays },
    thisWeek: week, actions: late.slice(0, 3),
  };
  r.delta = prev && prev.week !== r.week.y + "-" + r.week.w ? {
    late: prev.late != null ? lateAmt - prev.late : null, avgRet: prev.avgRet != null && ret.avgRet != null ? ret.avgRet - prev.avgRet : null,
    latePct: prev.latePct != null && ret.latePct != null ? ret.latePct - prev.latePct : null, avgGl: prev.avgGl != null && ret.avgGl != null ? ret.avgGl - prev.avgGl : null,
    forecast: prev.forecast != null ? forecastYear - prev.forecast : null } : null;
  return r;
}
// Ce qu'on garde d'un envoi pour la comparaison de la semaine suivante
export const snapshotOf = r => ({ week: r.week.y + "-" + r.week.w, late: r.late.total, avgRet: r.retards.avgRet, latePct: r.retards.latePct, avgGl: r.retards.avgGl, forecast: r.yearEnd.forecast });

// Phrases
export function headline(r) {
  const g = r.ytd.gap, c = r.cur;
  const a = Math.abs(g) < 1000 ? "Vous êtes à l'heure sur l'initial depuis janvier." : g < 0 ? "Vous êtes en retard sur l'initial : " + fmtS(g) + " encaissés depuis janvier." : "Vous êtes en avance sur l'initial : " + fmtS(g) + " encaissés depuis janvier.";
  const same = Math.abs(c.enc.act - c.enc.init) < 1000;
  const b = c.enc.init || c.enc.act ? " " + c.label + " finira vers " + fmtK(c.enc.act) + (same ? ", comme prévu au départ" : c.enc.init ? " au lieu de " + fmtK(c.enc.init) : "") + "." : "";
  return a + b;
}
export function subject(r) {
  const part = (l, g, b) => (b ? l + " " + fmtPct(g, b) : null);
  return "Cash in S" + r.week.w + " — " + [part("année", r.ytd.gap, r.ytd.initToDate), part(r.cur.label.toLowerCase(), r.cur.enc.gap, r.cur.enc.init), part(r.next.label.toLowerCase(), r.next.enc.gap, r.next.enc.init)].filter(Boolean).join(", ") + " sur l'initial";
}

// Courbe cumulée de l'année : géométrie commune au SVG (mail, aperçu) et au PDF
export function curveGeom(r, W = 560, H = 210) {
  const c = r.curve, x0 = 6, x1 = W - 6, y0 = 8, y1 = H - 6, xs = (x1 - x0) / 12, X = i => x0 + i * xs;
  let ci = 0, cr = 0; const ini = [[X(0), 0]], real = [[X(0), 0]];
  c.initM.forEach((v, i) => { ci += v; ini.push([X(i + 1), ci]); });
  for (let i = 0; i < c.cur; i++) { cr += c.paidM[i]; real.push([X(i + 1), cr]); }
  cr += c.paidM[c.cur]; const tx = X(c.cur + Math.min(1, c.dayFrac)); real.push([tx, cr]);
  const fc = [[tx, cr]]; let cf = cr + c.fcM[c.cur]; fc.push([X(c.cur + 1), cf]); for (let i = c.cur + 1; i < 12; i++) { cf += c.fcM[i]; fc.push([X(i + 1), cf]); }
  const lt = fc.map(([x, v], i) => [x, v + (i ? r.yearEnd.lateCash : 0)]);
  const max = Math.max(ci, cf + r.yearEnd.lateCash, 1) * 1.05, Y = v => y1 - (y1 - y0) * v / max;
  const map = l => l.map(([x, v]) => [Math.round(x * 10) / 10, Math.round(Y(v) * 10) / 10]);
  const iniToday = ini[c.cur][1] + (ini[c.cur + 1][1] - ini[c.cur][1]) * Math.min(1, c.dayFrac);
  return { W, H, x0, x1, y0, y1, xs, max, grid: [.25, .5, .75, 1].map(f => ({ v: max * f / 1.05, y: Math.round(Y(max * f / 1.05)) })), ini: map(ini), real: map(real), fc: map(fc), late: map(lt), today: { x: Math.round(tx), yIni: Math.round(Y(iniToday)), yReal: Math.round(Y(cr)) } };
}
export const COL = { ink: "#18202E", ink7: "#3D4757", ink5: "#5F6979", ink3: "#9AA3B0", line: "#DCE1E8", hair: "#ECEFF3", alt: "#F5F7F9", init: "#B7BFCB", green: "#1D7350", green1: "#E3F3EA", red: "#B3322E", red1: "#FBE7E4", bill: "#2F5A9E", bill1: "#E6EDF8", amber: "#8A5A00", amber1: "#FFF1D6", navy: "#1B2A55" };
// Sans texte : le serveur le transforme en image (les clients mail n'affichent pas le SVG) ; les libellés sont écrits en HTML autour
export function curveSvg(r, W = 560, H = 210) {
  const g = curveGeom(r, W, H), P = l => l.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '"><rect width="' + W + '" height="' + H + '" fill="#FFFFFF"/>'
    + g.grid.map(t => '<line x1="' + g.x0 + '" x2="' + g.x1 + '" y1="' + t.y + '" y2="' + t.y + '" stroke="' + COL.hair + '"/>').join("")
    + Array.from({ length: 13 }, (_, i) => '<line x1="' + (g.x0 + i * g.xs) + '" x2="' + (g.x0 + i * g.xs) + '" y1="' + (g.y1 - 4) + '" y2="' + g.y1 + '" stroke="' + COL.line + '"/>').join("")
    + '<line x1="' + g.x0 + '" x2="' + g.x1 + '" y1="' + g.y1 + '" y2="' + g.y1 + '" stroke="' + COL.line + '"/>'
    + '<line x1="' + g.today.x + '" x2="' + g.today.x + '" y1="' + g.y0 + '" y2="' + g.y1 + '" stroke="' + COL.ink + '" stroke-width="1"/>'
    + '<path d="' + P(g.ini) + '" fill="none" stroke="' + COL.init + '" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<path d="' + P(g.late) + '" fill="none" stroke="' + COL.ink3 + '" stroke-width="1.5" stroke-dasharray="3 4"/>'
    + '<path d="' + P(g.fc) + '" fill="none" stroke="' + COL.green + '" stroke-width="2.5" stroke-dasharray="6 5"/>'
    + '<path d="' + P(g.real) + '" fill="none" stroke="' + COL.green + '" stroke-width="2.5" stroke-linejoin="round"/>'
    + (Math.abs(g.today.yIni - g.today.yReal) > 2 ? '<line x1="' + g.today.x + '" x2="' + g.today.x + '" y1="' + g.today.yIni + '" y2="' + g.today.yReal + '" stroke="' + (g.today.yReal > g.today.yIni ? COL.red : COL.green) + '" stroke-width="4"/>' : "")
    + '<circle cx="' + g.today.x + '" cy="' + g.today.yReal + '" r="4" fill="' + COL.green + '"/></svg>';
}

// ── Le mail (HTML en tableaux, styles en ligne : Outlook, Gmail, téléphone) ─────────────────────────────────
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const F = "font-family:'Segoe UI',Arial,Helvetica,sans-serif;";
const tone = v => (v < 0 ? COL.red : v > 0 ? COL.green : COL.ink5);
const worse = (v, upIsBad = true) => (v == null || Math.round(v * 10) === 0 ? COL.ink5 : (v > 0) === upIsBad ? COL.red : COL.green);
const pill = (txt, bg, fg) => '<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:' + bg + ";color:" + fg + ';font-size:12px;font-weight:600">' + esc(txt) + "</span>";
const H3 = (t, small, lvl) => '<tr><td style="padding:' + (lvl ? "16px" : "20px") + ' 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="' + F + "font-size:" + (lvl ? 15 : 17) + "px;font-weight:700;color:" + COL.ink + ";border-bottom:" + (lvl ? 1 : 2) + "px solid " + COL.ink + ';padding-bottom:4px">' + esc(t) + '</td><td align="right" style="' + F + "font-size:12px;color:" + COL.ink5 + ";border-bottom:" + (lvl ? 1 : 2) + "px solid " + COL.ink + ';padding-bottom:4px">' + esc(small || "") + "</td></tr></table></td></tr>";
const part = t => '<tr><td style="padding:22px 24px 0;border-top:6px solid ' + COL.alt + ";" + F + "font-size:12px;font-weight:600;color:" + COL.ink5 + '">' + esc(t) + "</td></tr>";
const kpi = (l, v, d, c, big) => '<td width="50%" valign="top" style="padding:10px 12px;background:#FFFFFF;border:1px solid ' + COL.hair + '"><div style="' + F + "font-size:12px;color:" + COL.ink5 + '">' + esc(l) + '</div><div style="' + F + "font-size:" + (big ? 30 : 24) + "px;font-weight:700;letter-spacing:-0.02em;color:" + (c || COL.ink) + '">' + esc(v) + '</div><div style="' + F + "font-size:12px;color:" + COL.ink5 + '">' + d + "</div></td>";
function flow(title, a, b, bSub, c, cSub, cColor) {
  const cell = (l, v, s, col) => '<td valign="top" style="padding:8px 10px;' + F + '"><div style="font-size:12px;color:' + COL.ink5 + '">' + l + '</div><div style="font-size:19px;font-weight:700;color:' + (col || COL.ink) + '">' + v + '</div><div style="font-size:12px;color:' + (col || COL.ink5) + '">' + s + "</div></td>";
  return '<div style="' + F + "font-size:12px;color:" + COL.ink5 + ';margin:10px 0 4px">' + title + '</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + COL.alt + ';border-radius:8px"><tr>' + cell("Initial", a[0], a[1]) + cell(b[0], b[1], bSub) + cell("Écart", c, cSub, cColor) + "</tr></table>";
}
const row = (left, right, rc) => '<tr><td style="padding:7px 0;border-bottom:1px solid ' + COL.hair + ";" + F + "font-size:14px;color:" + COL.ink + '">' + left + '</td><td align="right" style="padding:7px 0 7px 8px;border-bottom:1px solid ' + COL.hair + ";" + F + "font-size:14px;font-weight:700;white-space:nowrap;color:" + (rc || COL.ink) + '">' + right + "</td></tr>";
const sub = s => '<div style="font-size:12px;color:' + COL.ink5 + '">' + s + "</div>";
const plural = (n, one, many) => n + " " + (n > 1 ? many : one);
const who = x => esc([x.client, x.chef].filter(Boolean).join(" · "));

export function mailHtml(r, { img = "cid:courbe", appUrl = "", beta = false } = {}) {
  const c = r.cur, n = r.next, d = r.delta || {}, ret = r.retards;
  const dl = (v, fmt, upBad = true) => (v == null ? "" : ' <span style="color:' + worse(v, upBad) + '">' + (Math.round(v * 10) === 0 ? "=" : fmt(v)) + "</span>");
  const months = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' + MS.map((m, i) => '<td align="center" style="' + F + "font-size:10px;color:" + (i === r.curve.cur ? COL.ink : COL.ink5) + ";font-weight:" + (i === r.curve.cur ? 700 : 400) + '">' + m + "</td>").join("") + "</tr></table>";
  const legend = '<div style="' + F + "font-size:12px;color:" + COL.ink5 + ';margin-top:4px"><span style="color:' + COL.init + ';font-weight:700">━</span> initial &nbsp; <span style="color:' + COL.green + ';font-weight:700">━</span> encaissé &nbsp; <span style="color:' + COL.green + ';font-weight:700">┅</span> prévu &nbsp; <span style="color:' + COL.ink3 + '">┅</span> si les retards sont payés &nbsp; <span style="color:' + COL.ink + '">│</span> aujourd\'hui</div>';
  const lateRows = r.actions.map(x => row(pill(x.kind === "facture" ? "Facturer" : "Relancer", x.kind === "facture" ? COL.bill1 : COL.red1, x.kind === "facture" ? COL.bill : COL.red) + " <b>" + esc(x.pj) + "</b> · " + esc(x.jalon) + sub((x.kind === "facture" ? "à émettre depuis le " : "échu le ") + ddmm(x.date) + " · " + x.days + " j" + (who(x) ? " · " + who(x) : "")), fmtK(x.montant), x.kind === "facture" ? COL.bill : COL.red)).join("");
  const weekTxt = r.thisWeek.length ? "Attendus cette semaine : " + r.thisWeek.slice(0, 4).map(x => esc(x.pj) + " " + esc(x.jalon) + " le " + ddmm(x.date) + " (" + fmtK(x.montant) + (x.kind === "facture" ? ", facture" : "") + ")").join(", ") + (r.thisWeek.length > 4 ? "…" : "") + "." : "Rien n'est attendu cette semaine.";
  const wk = n.byWeek.map(g => '<tr><td valign="top" style="padding:6px 6px 6px 0;border-bottom:1px solid ' + COL.hair + ";" + F + 'font-size:13px;font-weight:600;white-space:nowrap">S' + g.w + " · " + ddmm(g.mon) + '</td><td valign="top" style="padding:6px 6px;border-bottom:1px solid ' + COL.hair + ";" + F + "font-size:12px;color:" + COL.bill + '">' + (g.fact.map(x => esc(x.pj) + " " + esc(x.jalon) + " " + fmtK(x.montant)).join(" · ") || "—") + '</td><td valign="top" style="padding:6px 6px;border-bottom:1px solid ' + COL.hair + ";" + F + "font-size:12px;color:" + COL.green + '">' + (g.enc.map(x => esc(x.pj) + " " + esc(x.jalon) + " " + fmtK(x.montant)).join(" · ") || "—") + '</td><td align="right" valign="top" style="padding:6px 0;border-bottom:1px solid ' + COL.hair + ";" + F + 'font-size:13px;white-space:nowrap">' + fmtK(g.total) + "</td></tr>").join("");
  const watch = n.watch.length || n.endDays.length ? '<div style="margin-top:12px;border-left:3px solid ' + COL.amber + ";background:" + COL.amber1 + ";padding:8px 12px;" + F + 'font-size:13px;color:' + COL.ink + '"><b>À surveiller</b><br>' + [n.watch.length ? n.watch.map(x => esc(x.pj) + " · " + esc(x.jalon) + " (" + fmtK(x.montant) + ", le " + ddmm(x.date) + ")").join(" et ") + " port" + (n.watch.length > 1 ? "ent" : "e") + " " + pct(n.watch.reduce((s, x) => s + x.montant, 0), n.enc.act) + " % des paiements du mois." : "", n.endDays.length ? n.endDays.length + " paiement" + (n.endDays.length > 1 ? "s tombent" : " tombe") + " dans les deux derniers jours du mois." : ""].filter(Boolean).join("<br>") + "</div>" : "";
  const url = appUrl ? esc(appUrl) : "#";
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(subject(r)) + '</title></head><body style="margin:0;padding:0;background:#F4F5F7">'
    + '<div style="display:none;max-height:0;overflow:hidden">' + esc(fmtK(r.ytd.paid) + " encaissés au lieu de " + fmtK(r.ytd.initToDate) + " · " + fmtK(r.late.total) + " en retard · " + fmtK(r.thisWeek.filter(x => x.kind === "paiement").reduce((s, x) => s + x.montant, 0)) + " attendus cette semaine") + "</div>"
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7"><tr><td align="center" style="padding:16px 8px">'
    + '<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#FFFFFF;border-radius:8px">'
    + '<tr><td style="padding:22px 24px 0;' + F + "font-size:12px;color:" + COL.ink5 + '">' + (beta ? "BÊTA · " : "") + "Semaine " + r.week.w + " · " + esc(ddmm(r.today)) + "/" + r.year + " · hors jalons EPC</td></tr>"
    + '<tr><td style="padding:4px 24px 14px;' + F + "font-size:21px;line-height:1.3;font-weight:700;color:" + COL.ink + '">' + esc(headline(r)) + "</td></tr>"
    + '<tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
    + kpi("Encaissé depuis janvier", fmtK(r.ytd.paid), '<span style="color:' + tone(r.ytd.gap) + '">' + fmtS(r.ytd.gap) + " (" + fmtPct(r.ytd.gap, r.ytd.initToDate) + ")</span> face à l'initial à date", null, true)
    + kpi("Facturé depuis janvier", fmtK(r.ytd.fact), '<span style="color:' + tone(r.ytd.factGap) + '">' + fmtS(r.ytd.factGap) + " (" + fmtPct(r.ytd.factGap, r.ytd.factInit) + ")</span> face à l'initial")
    + "</tr><tr>"
    + kpi("En retard aujourd'hui", fmtK(r.late.total), fmtK(r.late.bill) + " à facturer · " + fmtK(r.late.enc) + " à encaisser" + (d.late != null ? ' · <span style="color:' + worse(d.late) + '">' + (Math.round(d.late) === 0 ? "=" : fmtS(d.late)) + "</span> depuis lundi dernier" : ""), r.late.total ? COL.red : null)
    + kpi("Prévu d'ici le 31 décembre", fmtK(r.yearEnd.toYearEnd), fmtK(r.yearEnd.toYearEnd + r.yearEnd.lateCash) + " si les retards sont payés", COL.green)
    + "</tr></table></td></tr>"
    + part("1 · L'année") + H3("Les encaissements de " + r.year, "cumul, face à l'initial")
    + '<tr><td style="padding:4px 24px 0"><img src="' + esc(img) + '" width="572" alt="Encaissements cumulés ' + r.year + " : " + fmtK(r.ytd.paid) + " encaissés au lieu de " + fmtK(r.ytd.initToDate) + '" style="display:block;width:100%;max-width:572px;height:auto;border:0">' + months + legend
    + '<div style="' + F + "font-size:13px;color:" + COL.ink5 + ';margin-top:6px">Fin d\'année : <b style="color:' + COL.ink + '">' + fmtK(r.yearEnd.forecast) + "</b> prévus au lieu de " + fmtK(r.yearEnd.init) + " à l'initial (" + fmtPct(r.yearEnd.gap, r.yearEnd.init) + ")" + (r.yearEnd.lateCash ? " ; " + fmtK(r.yearEnd.ifLate) + " si les retards sont payés" : "") + ".</div></td></tr>"
    + part("2 · Le mois en cours") + H3(c.label, "au " + ddmm(r.today) + " · onglet « Cash par mois »")
    + '<tr><td style="padding:0 24px">' + flow("Encaissements", [fmtK(c.enc.init), c.enc.initN + " jalon" + (c.enc.initN > 1 ? "s" : "")], ["Réel + actualisé", fmtK(c.enc.act)], fmtK(c.enc.paid) + " reçus · " + fmtK(c.enc.fc) + " attendus", fmtS(c.enc.gap), fmtPct(c.enc.gap, c.enc.init) + (c.enc.pushedN ? " · " + c.enc.pushedN + " jalon" + (c.enc.pushedN > 1 ? "s repoussés" : " repoussé") : ""), tone(c.enc.gap))
    + flow("Factures", [fmtK(c.fact.init), c.fact.initN + " jalon" + (c.fact.initN > 1 ? "s" : "")], ["Émis + à émettre", fmtK(c.fact.act)], fmtK(c.fact.done) + " émis · " + fmtK(c.fact.todo) + " à émettre", fmtS(c.fact.gap), fmtPct(c.fact.gap, c.fact.init), tone(c.fact.gap))
    + (c.ontime != null ? '<div style="' + F + "font-size:12px;color:" + COL.ink5 + ';margin-top:8px">Dates tenues ce mois-ci : <b style="color:' + COL.ink + '">' + c.ontime + " %</b> des montants payés à l'heure (pas plus tard que l'initial).</div>" : "") + "</td></tr>"
    + H3("Retards et décalages", "onglet « Écarts » · face à lundi dernier", 1)
    + '<tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
    + row("Retard moyen de paiement" + sub("réel face au prévu, " + plural(ret.paidN, "jalon payé", "jalons payés")), days1(ret.avgRet) + dl(d.avgRet, v => days1(v)))
    + row("Payés en retard" + sub(plural(ret.lateN, "jalon", "jalons") + " sur " + ret.paidN), (ret.latePct == null ? "–" : ret.latePct + " %") + dl(d.latePct, v => (v > 0 ? "+" : "−") + Math.abs(v) + " pt"))
    + row("Glissement des encaissements" + sub("prévu face à l'initial, " + plural(ret.glN, "jalon", "jalons")), days1(ret.avgGl) + dl(d.avgGl, v => days1(v)))
    + (ret.worst ? row("Plus gros retard" + sub(esc(ret.worst.pj + " · " + ret.worst.jalon) + (ret.worst.chef ? " · " + esc(ret.worst.chef) : "")), days1(ret.worst.v)) : "")
    + "</table></td></tr>"
    + H3("Cette semaine", r.actions.length ? r.actions.length + " action" + (r.actions.length > 1 ? "s" : "") + " qui rapprochent de l'initial" : "", 1)
    + '<tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + (lateRows || row("Aucun retard.", "")) + "</table>"
    + '<div style="' + F + "font-size:12px;color:" + COL.ink5 + ';margin-top:6px">' + weekTxt + (r.late.items.length > 3 ? " " + (r.late.items.length - 3) + " autre" + (r.late.items.length > 4 ? "s retards" : " retard") + " dans le PDF." : "") + "</div></td></tr>"
    + part("3 · Le mois qui arrive") + H3(n.label, "d'après les dates prévues du Cash in")
    + '<tr><td style="padding:0 24px">' + flow("Encaissements", [fmtK(n.enc.init), n.enc.initN + " jalon" + (n.enc.initN > 1 ? "s" : "")], ["Prévu aujourd'hui", fmtK(n.enc.act)], n.enc.actN + " jalon" + (n.enc.actN > 1 ? "s" : ""), fmtS(n.enc.gap), fmtPct(n.enc.gap, n.enc.init) + (n.enc.pushedN ? " · " + n.enc.pushedN + " jalon" + (n.enc.pushedN > 1 ? "s partis" : " parti") + " plus tard" : ""), tone(n.enc.gap))
    + flow("Factures à émettre", [fmtK(n.fact.init), n.fact.initN + " jalon" + (n.fact.initN > 1 ? "s" : "")], ["Prévu aujourd'hui", fmtK(n.fact.act)], n.fact.actN + " facture" + (n.fact.actN > 1 ? "s" : ""), fmtS(n.fact.gap), fmtPct(n.fact.gap, n.fact.init), tone(n.fact.gap))
    + (wk ? '<div style="' + F + "font-size:12px;color:" + COL.ink5 + ';margin:12px 0 4px">Par semaine</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="' + F + "font-size:12px;color:" + COL.ink5 + '">Semaine</td><td style="' + F + "font-size:12px;color:" + COL.ink5 + '">Factures à émettre</td><td style="' + F + "font-size:12px;color:" + COL.ink5 + '">Paiements attendus</td><td align="right" style="' + F + "font-size:12px;color:" + COL.ink5 + '">Total</td></tr>' + wk + "</table>" : "")
    + watch
    + '<div style="padding:18px 0 22px"><a href="' + url + '" style="display:inline-block;background:' + COL.navy + ";color:#FFFFFF;text-decoration:none;" + F + 'font-size:14px;font-weight:600;padding:11px 16px;border-radius:8px">Ouvrir le Cash in</a></div></td></tr>'
    + '<tr><td style="padding:12px 24px;background:#FAFBFC;border-top:1px solid ' + COL.hair + ";" + F + "font-size:12px;color:" + COL.ink5 + '">Envoyé chaque lundi à 7 h par le Cockpit BU ORC · « initial » = dates enregistrées au départ dans le Cash in · détail dans le PDF joint.</td></tr>'
    + "</table></td></tr></table></body></html>";
}
// Version texte (clients mail sans HTML, aperçu des notifications)
export function mailText(r) {
  const c = r.cur, n = r.next;
  return [subject(r), "", headline(r), "",
    "Encaissé depuis janvier : " + fmtK(r.ytd.paid) + " (" + fmtS(r.ytd.gap) + " face à l'initial)",
    "Facturé depuis janvier : " + fmtK(r.ytd.fact) + " (" + fmtS(r.ytd.factGap) + ")",
    "En retard aujourd'hui : " + fmtK(r.late.total), "Prévu d'ici le 31 décembre : " + fmtK(r.yearEnd.toYearEnd), "",
    c.label + " : encaissements " + fmtK(c.enc.act) + " au lieu de " + fmtK(c.enc.init) + " (" + fmtS(c.enc.gap) + ")",
    n.label + " : encaissements prévus " + fmtK(n.enc.act) + " au lieu de " + fmtK(n.enc.init) + " (" + fmtS(n.enc.gap) + ")", "",
    "Cette semaine :", ...r.actions.map(x => "- " + (x.kind === "facture" ? "Facturer " : "Relancer ") + x.pj + " · " + x.jalon + " : " + fmtK(x.montant) + " (" + x.days + " j)")].join("\n");
}
// Liste de destinataires : adresses @enogia.com seulement, sans doublon
export const cleanRecipients = list => [...new Set((list || []).map(s => String(s || "").trim().toLowerCase()).filter(s => /^[a-z0-9._%+-]+@enogia\.com$/.test(s)))];
// Prochain lundi 7 h (heure de Paris) à partir d'aujourd'hui (ISO)
export const nextMonday = (today, past7) => { const m = mondayOf(today); return today === m && !past7 ? m : addDays(m, 7); };
