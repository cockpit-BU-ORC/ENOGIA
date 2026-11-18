import React, { useMemo } from "react";
import { WidgetBoard, widgetsFromSpans } from "./WidgetBoard";
import { T, FZ } from "../theme";
import { presenceKind, presenceDates, ETAT_META, PjPlate, getPjMeta, chefsOf, CountryFlag, SHIPPED_SINCE, countShippedYTD } from "../pjMeta";
import { NavIcon } from "./SharedUI";
import { planOf, catalogOf, activeSections, progressOf, effRange, isForced, testersOf, findConflicts } from "../testPlan";
import { turbineStatus } from "../turbines";
import { blockOn } from "../profiles";
import { getCashinDoc, cashOverview, todayISO as cashToday } from "../cashinLink";
import { toCollect } from "../cashinModel";
import { useCashin } from "../useCashin";
import { weeklyReport, curveGeom, fmtS } from "../cashWeekly";
import { fmtEur } from "../pjProgress";
import { useProdModel } from "../prodModel"; // v324 : makeModel chargé à la demande
import { planWeeks, atelierCap, CAPA_DEFAUT } from "../loadWeeks"; // v289 : sans les graphiques du Manager

// v188 — Accueils par rôle. v229 (maquettes validées par Gabriel : « Go les 5 accueils ») : un catalogue de cadrans commun et une
// disposition par poste — chef de projet, testeur, chef d'atelier, directeur de production turbines, autres personnes (+ direction).
// La disposition est la même pour tout le poste (figée) ; seul le propriétaire la règle (« Disposer les cadrans ») et peut
// ajouter un cadran du catalogue ou en retirer un. Elle est enregistrée dans planning/profiles.homeLayouts[rôle].
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const dIso = x => { if (!x) return ""; const d = new Date(x); return isNaN(d) ? "" : iso(d); };
const fmtD = s => { if (!s) return "—"; const d = new Date(String(s).slice(0, 10) + "T12:00:00"); return isNaN(d) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", ""); };
const fmtDay = s => { if (!s) return "—"; const d = new Date(String(s).slice(0, 10) + "T12:00:00"); return isNaN(d) ? "—" : d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }); };
const addD = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const monday = s => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
const workDays = (a, b) => { let n = 0; const d = new Date(a + "T12:00:00"), e = new Date(b + "T12:00:00"); while (d <= e) { const w = d.getDay(); if (w && w !== 6) n++; d.setDate(d.getDate() + 1); } return n; };
export const CAPA_SEMAINE = CAPA_DEFAUT; // h atelier par semaine sans plan ; avec un plan : atelierCap(plan) (v282)

// v352 : les postes de l'atelier, de la commande à l'expédition (cadrans « Ligne d'atelier » et « Fiches suiveuses »)
const LINE_STATIONS = [
  { id: "cmd", label: "Commande", etats: ["NOT ORDERED", "NON_DESIGNEE"] },
  { id: "four", label: "Fournisseurs", etats: ["En fabrication", "STOCKAGE_EXT"] },
  { id: "meca", label: "Montage méca", etats: ["MONTAGE"] },
  { id: "elec", label: "Montage élec", etats: ["ELEC"] },
  { id: "tests", label: "Tests", etats: ["TESTS"] },
  { id: "pack", label: "Packaging", etats: ["PACKAGING"] },
  { id: "dep", label: "Expédiée", etats: ["SHIPPED"] },
];
const stationOf = etat => { const i = LINE_STATIONS.findIndex(st => st.etats.includes(etat)); return i < 0 ? 1 : i; };
const etatBar = etat => (ETAT_META[etat] || {}).bar || T.ink300;

// Cadrans par défaut de chaque poste (id, largeur sur 12)
export const HOME_DEFAULTS = {
  cdp: [["pjs", 7], ["jalons", 5], ["todo", 4], ["fat", 4], ["avance", 4]],
  testeur: [["today", 8], ["sign", 4], ["week", 12], ["arrivees", 6], ["results", 6]],
  resptest: [["today", 8], ["sign", 4], ["produit", 12], ["week", 12], ["arrivees", 6], ["results", 6], ["postes", 6], ["tests", 6]], // v238 ; v323 : livrables Produit
  atelier: [["charge", 7], ["arrdep", 5], ["montage", 7], ["postes", 5]],
  turbines: [["ptReady", 3], ["ptNoWheel", 3], ["ptPieces", 6], ["ptDates", 12], ["ptRoues", 6], ["ptInj", 6]],
  autre: [["kpis", 12], ["departs", 6], ["parcours", 6], ["benchWeek", 6], ["visites", 6], ["shipped", 6], ["etats", 6], ["fermetures", 6]],
  daf: [["encaisser", 6], ["cash", 6], ["cashCurve", 12], ["cashLate", 6], ["cashMonth", 6], ["kpis", 12], ["departs", 6]], // v370
  direction: [["kpis", 12], ["cashCurve", 12], ["depQuarter", 6], ["onTime", 6], ["tests", 4], ["turbines", 4], ["cash", 4], ["alertes", 8], ["charge", 4], ["postes", 6], ["departs", 6], ["parcours", 12]],
};

// Phrase d'ouverture selon le poste (lien direct avec le travail de la personne) → [segments], un segment = texte ou { t, c } surligné
export function roleLead(role, d) {
  const s = (n, one, many) => n + " " + (n > 1 ? many : one);
  if (role === "cdp") {
    const lateN = d.mine.filter(r => r.drift > 0).length, maxD = Math.max(0, ...d.mine.map(r => r.drift || 0));
    const nx = d.mine.filter(r => dIso(r.depart) >= d.today).sort((a, b) => dIso(a.depart).localeCompare(dIso(b.depart)))[0];
    if (!d.mine.length) return [d.hello + ". Aucun PJ ne vous est encore associé."];
    return [d.hello + ". Sur tes ", { t: s(d.mine.length, "PJ", "PJ"), c: "production" }, ", " + (d.mine.length - lateN) + " avance" + (d.mine.length - lateN > 1 ? "nt" : "") + ", ",
      lateN ? { t: s(lateN, "glisse", "glissent") + (maxD ? " (jusqu'à " + maxD + " j)" : ""), c: "warn" } : { t: "aucun ne glisse", c: "ok" },
      nx ? " ; prochain départ " : ".", ...(nx ? [{ t: nx.pj + " le " + fmtD(nx.depart), c: "ok" }, "."] : [])];
  }
  if (role === "testeur") {
    if (!d.myTester) return [d.hello + ". Vous n'êtes pas encore dans la liste des testeurs."];
    return [d.hello + ". Aujourd'hui, ", { t: s(d.todayT.length, "machine au banc", "machines au banc"), c: "tests" }, " pour toi, ",
      d.toSign.length ? { t: s(d.toSign.length, "fiche à signer", "fiches à signer"), c: "warn" } : "aucune fiche à signer",
      d.nextT ? " ; prochaine arrivée au banc " + fmtDay(d.nextT) + "." : "."];
  }
  if (role === "resptest") // v238 : responsable des testeurs — tous les testeurs
    return [d.hello + ". Aujourd'hui, ", { t: s(d.todayT.length, "machine au banc", "machines au banc"), c: "tests" }, ", ",
      d.toSign.length ? { t: s(d.toSign.length, "fiche à signer", "fiches à signer"), c: "warn" } : "aucune fiche à signer",
      d.nextT ? " ; prochaine arrivée au banc " + fmtDay(d.nextT) + "." : "."];
  if (role === "atelier") {
    const w = d.charge[0] || { hours: 0, cap: CAPA_SEMAINE }, pct = w.cap ? Math.round(w.hours / w.cap * 100) : 0;
    return ["Cette semaine, ", { t: s(d.montage.length, "machine en montage", "machines en montage"), c: "production" }, ", charge à ",
      { t: pct + " %", c: pct > 100 ? "late" : pct > 90 ? "warn" : "ok" }, " (" + w.hours + " h sur " + w.cap + " h) ; " + (d.arrN + d.depN === 0 ? "ni arrivée ni départ." : (d.arrN ? s(d.arrN, "arrivée", "arrivées") : "aucune arrivée") + " et " + (d.depN ? s(d.depN, "départ", "départs") : "aucun départ") + ".")];
  }
  if (role === "turbines") {
    if (!d.pt) return [d.hello + ". La page Production turbines n'est pas encore accessible depuis ce compte."];
    return [d.hello + ". ", { t: s(d.pt.ready.length, "turbine prête", "turbines prêtes"), c: "ok" }, ", " + d.pt.noWheel.length + " testée" + (d.pt.noWheel.length > 1 ? "s" : "") + " sans roue",
      d.pt.next ? " ; prochaine prête le " + d.pt.next : "", d.pt.missing.length ? [" — ", { t: s(d.pt.missing.length, "arbre manquant", "arbres manquants"), c: "late" }, " (" + d.pt.missing.map(t => t.num).join(", ") + ")."] : "."].flat();
  }
  if (role === "direction") return null; // phrase historique de l'accueil
  if (role === "daf") { // v370 : factures émises en attente de paiement (Cash in)
    const cd = getCashinDoc(); if (!cd) return [d.hello + ". Le Cash in n'est pas encore chargé sur ce poste."];
    const L = toCollect(cd.rows, cashToday()), late = L.filter(x => x.group === "late").length, week = L.filter(x => x.group === "week").length;
    if (!L.length) return [d.hello + ". ", { t: "Aucune facture", c: "ok" }, " en attente de paiement."];
    return [d.hello + ". ", { t: s(L.length, "facture émise", "factures émises"), c: "production" }, " en attente de paiement" + (late || week ? ", dont " : "."), ...(late ? [{ t: late + " en retard", c: "late" }] : []), ...(late && week ? [" et "] : []), ...(week ? [{ t: week + " prévue" + (week > 1 ? "s" : "") + " cette semaine", c: "warn" }] : []), ...(late || week ? ["."] : [])];
  }
  return ["Bonjour. ", { t: s(d.inProd, "machine", "machines"), c: "production" }, " " + (d.inProd > 1 ? "sont" : "est") + " en production et ", { t: d.next30 + " " + (d.next30 > 1 ? "partent" : "part"), c: "ok" }, " d'ici un mois."];
}

// v350 (audit de performance) : défini hors du composant (sinon recréé et remonté à chaque rendu)
const Stat = ({ label, value, tone, onClick }) => <button type="button" onClick={onClick} disabled={!onClick} style={{ border: "none", background: T.surface, borderRadius: 8, padding: "8px 10px", textAlign: "left", cursor: onClick ? "pointer" : "default", fontFamily: T.font, minWidth: 0 }}><div style={{ fontFamily: T.fontDisplay, fontSize: "clamp(18px,1.5vw,24px)", fontWeight: 600, lineHeight: 1.1, color: tone || T.ink900, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div><div style={{ fontSize: FZ.xs, color: T.ink500, fontFamily: T.fontLabel }}>{label}</div></button>;
// v350 (audit de performance) : défini hors du composant (sinon recréé et remonté à chaque rendu)
// v391 (demandé : « rajouter en widget la courbe annuelle du Cash in ») : la courbe de la fiche du lundi (cashWeekly.curveGeom), aux couleurs
// du thème ; trait plein = initial (gris) et encaissé (vert), tirets = prévu, pointillés gris = si les retards sont payés ; mois écrits dessous.
const MS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
function CashCurve({ r, h = 170 }) {
  const g = curveGeom(r, 560, h), P = l => l.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" "), ns = { vectorEffect: "non-scaling-stroke", fill: "none", strokeLinejoin: "round" };
  const up = g.today.yReal <= g.today.yIni;
  return <div>
    <svg viewBox={"0 0 560 " + h} preserveAspectRatio="none" role="img" aria-label={"Encaissements cumulés de l'année face à l'initial : " + fmtEur(r.ytd.paid) + " encaissés, initial à date " + fmtEur(r.ytd.initToDate)} style={{ display: "block", width: "100%", height: h }}>
      {g.grid.map((t, i) => <line key={i} x1={g.x0} x2={g.x1} y1={t.y} y2={t.y} stroke={T.line} strokeWidth="1" style={{ vectorEffect: "non-scaling-stroke" }} />)}
      <line x1={g.x0} x2={g.x1} y1={g.y1} y2={g.y1} stroke={T.ink300} strokeWidth="1" style={{ vectorEffect: "non-scaling-stroke" }} />
      <line x1={g.today.x} x2={g.today.x} y1={g.y0} y2={g.y1} stroke={T.ink500} strokeWidth="1" style={{ vectorEffect: "non-scaling-stroke" }} />
      <path d={P(g.ini)} stroke={T.ink300} strokeWidth="2.5" style={ns} />
      <path d={P(g.late)} stroke={T.ink500} strokeWidth="1.5" strokeDasharray="3 4" style={ns} />
      <path d={P(g.fc)} stroke={T.emerald600} strokeWidth="2.5" strokeDasharray="6 5" style={ns} />
      <path d={P(g.real)} stroke={T.emerald600} strokeWidth="2.5" style={ns} />
      {Math.abs(g.today.yIni - g.today.yReal) > 2 && <line x1={g.today.x} x2={g.today.x} y1={g.today.yIni} y2={g.today.yReal} stroke={up ? T.emerald600 : T.red600} strokeWidth="4" style={{ vectorEffect: "non-scaling-stroke" }} />}
    </svg>
    <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", fontSize: 12, color: T.ink500, textAlign: "center", margin: "2px 0 0" }}>{MS.map((m, i) => <span key={i} style={i === r.curve.cur ? { color: T.ink900, fontWeight: 600 } : null}>{m}</span>)}</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: T.ink500, marginTop: 6 }}>
      <span><i aria-hidden="true" style={{ display: "inline-block", width: 16, borderTop: "2.5px solid " + T.ink300, verticalAlign: "middle", marginRight: 5 }} />initial</span>
      <span><i aria-hidden="true" style={{ display: "inline-block", width: 16, borderTop: "2.5px solid " + T.emerald600, verticalAlign: "middle", marginRight: 5 }} />encaissé</span>
      <span><i aria-hidden="true" style={{ display: "inline-block", width: 16, borderTop: "2.5px dashed " + T.emerald600, verticalAlign: "middle", marginRight: 5 }} />prévu</span>
      <span><i aria-hidden="true" style={{ display: "inline-block", width: 16, borderTop: "1.5px dotted " + T.ink500, verticalAlign: "middle", marginRight: 5 }} />si les retards sont payés</span>
    </div>
  </div>;
}
const gapTone = v => (Math.abs(v) < 1000 ? T.ink500 : v < 0 ? T.red600 : T.emerald600);
const StatLine = ({ items }) => <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px 0", marginTop: 8 }}>
    {items.map(({ label, value, tone, onClick }, i) => { const C = onClick ? "button" : "span"; return <C key={label} type={onClick ? "button" : undefined} onClick={onClick}
      style={{ display: "inline-flex", alignItems: "baseline", gap: 5, border: "none", background: "transparent", padding: "2px 12px", minHeight: 28, borderLeft: i ? "1px solid " + T.line : "none", paddingLeft: i ? 12 : 0, cursor: onClick ? "pointer" : "default", fontFamily: T.font }}>
      <b style={{ fontFamily: T.fontDisplay, fontSize: "clamp(18px,1.5vw,22px)", fontWeight: 600, color: tone || T.ink900, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</b>
      <span style={{ fontSize: FZ.sm, color: T.ink500, whiteSpace: "nowrap" }}>{label}</span></C>; })}
  </div>;
export function RoleHome({ produit, scope, role, profile, ui, kpiEl, depEl, parcoursEl, rows, open, late, mentions, myPjs, testsDoc, myTester, turbineDoc, prodDoc, plan, closurePeriods, productionExclusions, owner, cash, onOpenPj, onGo, onOpenCash, layout, onLayout, hello, renderLead }) {
  const { Row, Head, cardS, Pill, presenceOf, nomOf, empty, grey, link, S, H, A } = ui;
  const today = iso(new Date());
  const on = id => blockOn(profile, id);
  useCashin(); // se met à jour quand le Cash in change
  const catalog = useMemo(() => catalogOf(testsDoc || {}), [testsDoc]);
  const prog = r => progressOf(planOf(testsDoc || {}, r.pj), catalog, activeSections(presenceKind(r.clientPresence || null)));
  const tStart = r => dIso(r.tests), tEnd = r => dIso(r.testsFin) || dIso(r.tests);
  const inTest = (r, day) => !!r.tests && tStart(r) <= day && tEnd(r) >= day;
  const more = (label, go) => <button type="button" onClick={go} className="enogia-homelink" style={{ ...link, marginTop: 2 }}>{label} <NavIcon name="arrow" size={15} /></button>;
  const progPill = q => <span style={{ fontVariantNumeric: "tabular-nums" }}>{q.done} / {q.total}{q.ko ? " · " + q.ko + " échec" + (q.ko > 1 ? "s" : "") : ""}</span>;
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 6, marginTop: 6 };
  // v284 (audit apple-design, lot 3) : une ligne de chiffres sans boîtes (le cadran Tests empilait 5 mini-boîtes)
  const bar = (pct, color) => <div style={{ height: 6, borderRadius: 4, background: T.surfaceAlt, overflow: "hidden" }}><div className="enogia-bar-fill" style={{ width: Math.max(0, Math.min(100, pct)) + "%", height: 6, background: color }} /></div>;

  /* ── données communes ── */
  const w0 = monday(today), weekEnd = addD(w0, 6);
  const mine = useMemo(() => open.filter(r => myPjs.includes(r.pj)).sort((a, b) => dIso(a.depart || "9").localeCompare(dIso(b.depart || "9"))), [open, myPjs]);
  // v238 : le responsable des testeurs voit les machines de tous les testeurs (cadrans « Au banc aujourd'hui », « La semaine », « Fiches à signer »…)
  const allT = role === "resptest" && !!testsDoc, tView = allT || !!myTester;
  const mineT = useMemo(() => (!testsDoc ? [] : allT ? open.filter(r => r.tests) : !myTester ? [] : open.filter(r => r.tests && planOf(testsDoc, r.pj).assign.some(a => a.tid === myTester.id))), [open, myTester, testsDoc, allT]);
  const effOf = r => { if (allT) return { from: tStart(r), to: tEnd(r) }; const a = planOf(testsDoc, r.pj).assign.find(x => x.tid === myTester.id); return effRange(a, r); };
  const todayT = tView ? mineT.filter(r => { const e = effOf(r); return e.from <= today && e.to >= today; }) : [];
  const unsigned = (r, p) => allT ? (p.assign.length > 0 && p.assign.some(a => !(p.signs || {})["t:" + a.tid])) : !(p.signs || {})["t:" + myTester.id];
  const toSign = tView ? mineT.filter(r => { const q = prog(r), p = planOf(testsDoc, r.pj); return unsigned(r, p) && (tEnd(r) < today || (q.total > 0 && q.done === q.total)); }) : [];
  const nextArr = (tView ? mineT : open).filter(r => r.tests && tStart(r) > today).sort((a, b) => tStart(a).localeCompare(tStart(b)));
  const testers = testsDoc ? testersOf(testsDoc) : [];
  const nowTest = open.filter(r => inTest(r, today));
  const montage = open.filter(r => ["MONTAGE", "ELEC", "PACKAGING"].includes(r.etat));
  const arrDep = open.flatMap(r => [["arrivee", "Arrivée", S.arrivee], ["depart", "Départ", S.depart]].map(([k, l, tone]) => ({ r, l, tone, d: dIso(r[k]) })).filter(x => x.d && x.d >= today && x.d <= weekEnd)).sort((a, b) => a.d.localeCompare(b.d));
  // Charge atelier sur 4 semaines : planificateur s'il est lu, sinon heures atelier du planning réparties sur les jours ouvrés
  const charge = useMemo(() => {
    let pw = null;
    if (plan && plan.v === 2) { try { pw = planWeeks(plan, closurePeriods, productionExclusions, 4, new Date(w0 + "T00:00:00")); } catch (e) { pw = null; } }
    if (pw) return pw.map(w => ({ a: iso(w.a), hours: w.hours, cap: Math.round(w.cap || CAPA_SEMAINE) }));
    return [0, 1, 2, 3].map(i => { const a = addD(w0, 7 * i), b = addD(a, 4); let h = 0;
      rows.forEach(r => { const s = dIso(r.arrivee), e = dIso(r.finProd) || dIso(r.depart), H = Number(r.heuresAtelier) || 0; if (!s || !e || !H || e < a || s > b) return; const tot = workDays(s, e) || 1, ov = workDays(s > a ? s : a, e < b ? e : b); h += H * ov / tot; });
      return { a, hours: Math.round(h), cap: CAPA_SEMAINE }; });
  }, [plan, closurePeriods, productionExclusions, rows, w0]);
  // Production turbines
  const prodM = useProdModel(!!prodDoc);
  const pt = useMemo(() => {
    if (!prodDoc || !prodM) return null;
    const { makeModel, EMPTY_PROD } = prodM;
    const S2 = { ...EMPTY_PROD, ...prodDoc, params: { d: {}, l: {}, ...(prodDoc.params || {}) } };
    ["turbines", "arbres", "pieces", "roues", "injecteurs"].forEach(c => { S2[c] = Object.fromEntries(Object.entries(prodDoc[c] || {}).map(([k, v]) => [k, { ...v, id: k }])); });
    const M = makeModel(S2); const T0 = new Date(); T0.setHours(0, 0, 0, 0);
    const offDate = x => { const d = new Date(T0); let n = Math.max(0, Math.ceil(x - 1e-9) - 1); while (d.getDay() % 6 === 0) d.setDate(d.getDate() + 1); while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) n--; } return d; };
    const upcoming = M.live.filter(t => t.step !== "ok").map(t => ({ t, s: M.sch[t.id] || {} })).sort((p, q) => (p.s.end ?? 1e9) - (q.s.end ?? 1e9));
    const nx = upcoming.find(u => u.s.end != null && !u.s.noRoue);
    return { S: S2, M, upcoming, offDate, ready: M.live.filter(t => t.step === "ok"), noWheel: M.live.filter(t => t.step === "s1"), missing: upcoming.filter(u => u.s.missing).map(u => u.t),
      next: nx ? offDate(nx.s.end).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "numeric" }) : null };
  }, [prodDoc, prodM]);

  // phrase d'ouverture (remontée à l'accueil)
  const next30 = open.filter(r => { const d = dIso(r.depart); return d && d >= today && d <= addD(today, 30); }).length;
  const inProd = open.filter(r => ["MONTAGE", "ELEC", "TESTS", "PACKAGING"].includes(r.etat)).length;
  const leadSegs = roleLead(role, { hello: hello || "Bonjour", today, mine, myTester, todayT, toSign, nextT: nextArr[0] && tStart(nextArr[0]), charge, montage, arrN: arrDep.filter(x => x.l === "Arrivée").length, depN: arrDep.filter(x => x.l === "Départ").length, pt, inProd, next30 });

  /* ── catalogue des cadrans ── */
  const sec = (id, label, color, body) => <section key={id} aria-label={label} style={cardS(color)}>{body}</section>;
  const W = {};
  W.kpis = { label: "Chiffres clés", span: 12, render: () => kpiEl };
  W.departs = { label: "Prochains départs", span: 6, render: () => depEl };
  W.parcours = { label: "Où en sont les machines", span: 6, render: () => parcoursEl };
  W.mentions = { label: "Mentions", span: 4, render: () => sec("mentions", "Mentions", H.note, <>
    <Head title="Mentions" sub="les @mentions qui vous attendent" count={mentions.length} />
    {mentions.length === 0 ? empty("check", "Personne ne vous attend", "Les messages où l'on vous cite apparaîtront ici.") :
      mentions.slice(0, 5).map(({ pj, idx, c }, i) => <Row key={pj + idx} first={i === 0} pj={pj} pill={<Pill tone={A.note}>Mention</Pill>} main={(c.author || "Quelqu'un") + " : « " + String(c.text || "").replace(/\s+/g, " ") + " »"} right={fmtD(c.date)} />)}
    {more("Ouvrir les commentaires", () => onGo && onGo("comments"))}</>) };
  // chef de projet
  W.pjs = { label: "Mes PJ", span: 7, render: () => sec("pjs", "Mes PJ", S.production.ring, <>
    <Head title="Mes PJ" sub="par date de départ" count={mine.length} />
    {mine.length === 0 ? empty("inbox", "Aucun PJ associé", "Les PJ vous sont associés dans Manager › Réglages › Personnes et rôles.") :
      mine.slice(0, 8).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={((ETAT_META[r.etat] || {}).label || "") + (nomOf(r) ? " · " + nomOf(r) : "")} presence={presenceOf(r)} right={(r.drift > 0 ? "+" + r.drift + " j · " : "") + fmtD(r.depart)} rightColor={r.drift > 10 ? T.red500 : r.drift > 0 ? T.amber600 : undefined} />)}
    {mine.length > 8 && more("Voir les " + mine.length + " PJ dans la liste", () => onGo && onGo("table"))}</>) };
  W.jalons = { label: "Jalons des 3 semaines", span: 5, render: () => { const end21 = addD(today, 21), j = [];
    mine.forEach(r => [["arrivee", "Arrivée"], ["tests", "Début des tests"], ["finProd", "Fin de production"], ["depart", "Départ"]].forEach(([k, l]) => { const d = dIso(r[k]); if (d && d >= today && d <= end21) j.push({ r, l, d }); }));
    j.sort((a, b) => a.d.localeCompare(b.d));
    return sec("jalons", "Jalons des 3 semaines", S.tests.ring, <><Head title="Jalons des 3 semaines" count={j.length} />
      {j.length === 0 ? empty("check", "Aucun jalon d'ici 3 semaines", "") : j.slice(0, 8).map((x, i) => <Row key={x.r.pj + x.l} first={i === 0} pj={x.r.pj} main={x.l} right={fmtDay(x.d)} />)}</>); } };
  W.fat = { label: "FAT client / NOBO", span: 4, render: () => { const f = [];
    mine.forEach(r => { const pd = presenceDates(r.clientPresence); [["client", "client"], ["nobo", "NOBO"]].forEach(([k, l]) => { if (pd[k] === undefined) return; const d = dIso(pd[k]); if (!d || d >= today) f.push({ r, l, d }); }); });
    f.sort((a, b) => (a.d || "9").localeCompare(b.d || "9"));
    return sec("fat", "FAT client / NOBO", S.arrivee.ring, <><Head title="FAT client / NOBO" count={f.length} />
      {f.length === 0 ? empty("check", "Aucune FAT prévue", "") : f.slice(0, 6).map((x, i) => <Row key={x.r.pj + x.l} first={i === 0} pj={x.r.pj} pill={<Pill tone={S.arrivee}>{x.l}</Pill>} main={nomOf(x.r)} right={x.d ? fmtDay(x.d) : "date à fixer"} />)}</>); } };
  W.todo = { label: "À traiter", span: 4, render: () => { const lateMine = mine.filter(r => r.drift > 0);
    const items = [...lateMine.slice(0, 4).map(r => ({ id: "l" + r.pj, pj: r.pj, pill: <Pill tone={r.drift > 10 ? A.red : A.orange}>Retard</Pill>, main: "+" + r.drift + " j sur l'initial : cause à déclarer" })),
      ...mentions.slice(0, 3).map(({ pj, idx, c }) => ({ id: "m" + pj + idx, pj, pill: <Pill tone={A.note}>@</Pill>, main: (c.author || "Quelqu'un") + " vous a cité" }))];
    return sec("todo", "À traiter", A.orange.ring, <><Head title="À traiter" count={items.length} />
      {items.length === 0 ? empty("check", "Rien à traiter", "") : items.map((x, i) => <Row key={x.id} first={i === 0} pj={x.pj} pill={x.pill} main={x.main} />)}
      {lateMine.length > 0 && more("Déclarer un retard", () => onGo && onGo("manager"))}</>); } };
  W.avance = { label: "Avancement moyen", span: 4, render: () => { const L = mine.length, early = mine.filter(r => r.drift < 0).length, lateN = mine.filter(r => r.drift > 0).length;
    const pv = L ? Math.round(mine.reduce((a, r) => a + (["MONTAGE", "ELEC", "TESTS", "PACKAGING"].indexOf(r.etat) + 1) / 5 * 100, 0) / L) : 0;
    return sec("avance", "Avancement moyen", S.finProd.ring, <><Head title="Avancement" sub="de mes PJ" />
      <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 300, color: T.ink900, fontVariantNumeric: "tabular-nums", margin: "2px 0 6px" }}>{pv} %</div>{bar(pv, S.finProd.solid)}
      <div style={{ ...grey, marginTop: 6 }}>{early} en avance, {L - early - lateN} à l'heure, {lateN} en retard sur l'initial.</div></>); } };
  // testeur
  W.today = { label: "Au banc aujourd'hui", span: 8, render: () => sec("today", "Au banc aujourd'hui", S.tests.ring, <>
    <Head title="Au banc aujourd'hui" sub={fmtDay(today)} count={todayT.length} />
    {!tView ? empty("check", "Vous n'êtes pas dans la liste des testeurs", "Un administrateur vous ajoute depuis la page Tests.") : todayT.length === 0 ? empty("check", "Pas de test aujourd'hui", "Vos prochaines machines sont dans « Ma semaine ».") :
      todayT.map((r, i) => { const e = effOf(r), n = workDays(e.from, today), m = workDays(e.from, e.to); return <Row key={r.pj} first={i === 0} pj={r.pj} pill={<Pill tone={S.tests}>{"jour " + n + " / " + m}</Pill>} main={nomOf(r) || r.gamme || "Tests"} presence={presenceOf(r)} right={progPill(prog(r))} />; })}
    {more("Renseigner mes tests", () => onGo && onGo("tests"))}</>) };
  // v323 (demandé : « les jalons cash flagués Produit par les CdP remontent sur l'accueil du responsable produit : PJ, nom, jalon, montant,
  // facture initiale et prévue ») — données planning/cashinProduit (copie des jalons cochés « Produit » dans le Cash in)
  W.produit = { label: "Livrables Produit (jalons cash)", span: 12, only: () => !!produit, render: () => { const L = (produit && produit.items) || [], todo = L.filter(x => !x.factReelle), done = L.length - todo.length;
    const late = x => !x.factReelle && x.factPrevue && x.factPrevue < today, shift = x => x.factInit && x.factPrevue && x.factPrevue !== x.factInit;
    const th = { textAlign: "left", fontSize: 12, fontWeight: 500, color: T.ink500, padding: "6px 8px", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" };
    const td = (num, ink) => ({ padding: "6px 8px", height: 36, borderBottom: "1px solid " + T.line, fontSize: FZ.sm, color: ink || T.ink900, textAlign: num ? "right" : "left", fontVariantNumeric: num ? "tabular-nums" : undefined, whiteSpace: num ? "nowrap" : undefined });
    return sec("produit", "Livrables Produit (jalons cash)", S.tests.ring, <>
      <Head title="Livrables Produit" sub={"jalons cash flagués par les chefs de projet" + (done ? " · " + done + " déjà facturé" + (done > 1 ? "s" : "") : "")} count={todo.length} />
      {L.length === 0 ? empty("check", "Aucun jalon Produit", "Les chefs de projet cochent « Produit » sur un jalon du Cash in lié à un livrable (ex. P&ID) : il apparaît ici.") :
        <div style={{ overflowX: "auto", marginTop: 4 }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>PJ</th><th style={th}>Projet</th><th style={th}>Jalon</th><th style={{ ...th, textAlign: "right" }}>Montant</th><th style={{ ...th, textAlign: "right" }}>Facture initiale</th><th style={{ ...th, textAlign: "right" }}>Facture prévue</th></tr></thead>
          <tbody>{[...todo, ...L.filter(x => x.factReelle)].map(x => <tr key={x.id || x.pj + x.jalon} style={{ opacity: x.factReelle ? 0.6 : 1 }}>
            <td style={td()}>{rows.some(r => r.pj === x.pj) ? <button type="button" onClick={() => onOpenPj && onOpenPj(x.pj)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: T.fontMono, fontWeight: 600, fontSize: FZ.sm, color: T.ink900 }}>{x.pj}</button> : <span style={{ fontFamily: T.fontMono, fontWeight: 600 }}>{x.pj}</span>}</td>
            <td style={td(false, T.ink700)}>{x.nom || nomOf(rows.find(r => r.pj === x.pj) || { pj: x.pj }) || "—"}</td>
            <td style={td()}>{x.jalon || "—"}{x.factReelle ? <span style={{ marginLeft: 6 }}><Pill tone={{ bg: T.emerald100, ink: T.emerald600 }}>facturé</Pill></span> : null}</td>
            <td style={td(true)}>{fmtEur(x.montant)}</td>
            <td style={td(true, T.ink500)}>{x.factInit ? fmtD(x.factInit) : "—"}</td>
            <td style={td(true, late(x) ? T.red600 : shift(x) ? T.amber600 : T.ink900)}>{x.factPrevue ? fmtD(x.factPrevue) : "—"}{late(x) ? " · en retard" : ""}</td>
          </tr>)}</tbody></table></div>}</>); } };
  W.sign = { label: "Fiches à signer", span: 4, render: () => sec("sign", "Fiches à signer", S.finProd.ring, <>
    <Head title="Fiches à signer" sub="tests terminés" count={toSign.length} />
    {toSign.length === 0 ? empty("check", "Rien à signer", "Les fiches de test à signer apparaîtront ici.") : toSign.slice(0, 5).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r) || r.gamme || ""} right={progPill(prog(r))} />)}</>) };
  W.week = { label: allT ? "La semaine" : "Ma semaine", span: 12, render: () => { const wkEnd = [0, 6].includes(new Date(today + "T12:00:00").getDay()), wk0 = wkEnd ? addD(w0, 7) : w0; // v358 : le week-end, la semaine qui vient
    const days = DOW.map((l, i) => ({ l, d: addD(wk0, i) })), wkTitle = (allT ? "La semaine" : "Ma semaine") + (wkEnd ? " prochaine" : "");
    return sec("week", wkTitle, S.production.ring, <><Head title={wkTitle} sub={"du " + fmtD(days[0].d) + " au " + fmtD(days[4].d)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6, marginTop: 6 }}>
        {days.map(({ l, d }) => { const list = tView ? mineT.filter(r => { const e = effOf(r); return e.from <= d && e.to >= d; }) : []; return (
          <div key={d} style={{ background: d === today ? T.teal100 : T.surface, borderRadius: 8, padding: "6px 6px 8px", minWidth: 0 }}>
            <div style={{ fontSize: FZ.xs, fontWeight: 500, color: d === today ? T.teal600 : T.ink700 }}>{l} {d.slice(8, 10)}</div>
            {list.length === 0 ? <div style={{ ...grey, marginTop: 4 }}>—</div> : list.map(r => <button key={r.pj} type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} style={{ display: "block", width: "100%", marginTop: 4, border: "none", borderLeft: "3px solid " + S.tests.solid, background: T.card, borderRadius: "0 8px 8px 0", padding: "3px 6px", textAlign: "left", cursor: "pointer", fontFamily: T.fontMono, fontSize: 12, fontWeight: 600, color: T.ink900, minHeight: 24 }}>{r.pj}</button>)}
          </div>); })}
      </div></>); } };
  W.arrivees = { label: "Prochaines arrivées au banc", span: 6, render: () => sec("arrivees", "Prochaines arrivées au banc", S.arrivee.ring, <>
    <Head title="Prochaines arrivées au banc" count={nextArr.length} />
    {nextArr.length === 0 ? empty("check", "Aucune arrivée prévue", "") : nextArr.slice(0, 5).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r) || r.gamme || ""} presence={presenceOf(r)} right={fmtDay(tStart(r))} />)}</>) };
  W.results = { label: "Derniers résultats", span: 6, render: () => { const L = (tView ? mineT : open).filter(r => r.tests && tStart(r) <= today).map(r => ({ r, q: prog(r) })).filter(x => x.q.done > 0).sort((a, b) => tEnd(b.r).localeCompare(tEnd(a.r))).slice(0, 5);
    return sec("results", "Derniers résultats", A.red.ring, <><Head title="Derniers résultats" />
      {L.length === 0 ? empty("inbox", "Aucun résultat pour l'instant", "") : L.map(({ r, q }, i) => <Row key={r.pj} first={i === 0} pj={r.pj} pill={<Pill tone={q.ko ? A.red : S.finProd}>{q.ko ? q.ko + " échec" + (q.ko > 1 ? "s" : "") : q.done === q.total ? "Réussi" : "En cours"}</Pill>} main={nomOf(r) || r.gamme || ""} right={progPill(q)} />)}</>); } };
  // chef d'atelier
  W.charge = { label: "Charge atelier", span: 7, render: () => { const max = Math.max(1, ...charge.map(w => Math.max(w.hours, w.cap)));
    return sec("charge", "Charge atelier", S.production.ring, <><Head title="Charge atelier" sub={"4 semaines · capacité " + atelierCap(plan) + " h / semaine"} />
      {/* v331 (unslop) : sans heures prévues, une phrase au lieu de quatre colonnes « 0 h » vides */}
      {charge.every(w => !w.hours) ? <div style={{ ...grey, padding: "16px 0 8px" }}>Pas d'heures d'atelier prévues sur les 4 prochaines semaines</div> :
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120, marginTop: 8 }}>
        {charge.map(w => { const over = w.hours > w.cap; return (<div key={w.a} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end", position: "relative" }}>
          <span style={{ fontSize: FZ.xs, fontWeight: 500, color: over ? T.red500 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{w.hours} h</span>
          <div style={{ width: "100%", maxWidth: 52, height: 84, position: "relative" }}>
            <div title={"capacité " + w.cap + " h"} style={{ position: "absolute", left: -4, right: -4, bottom: Math.round(84 * w.cap / max), borderTop: "1.5px dashed " + T.ink500 }} />
            <div className="enogia-bar-fill" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: Math.max(3, Math.round(84 * w.hours / max)), background: over ? T.red500 : S.production.solid, borderRadius: 0 }} />
          </div>
          <span style={grey}>{fmtD(w.a)}</span>
        </div>); })}
      </div>}</>); } };
  W.arrdep = { label: "Arrivées et départs", span: 5, render: () => sec("arrdep", "Arrivées et départs", S.depart.ring, <>
    <Head title="Arrivées et départs" sub="cette semaine" count={arrDep.length} />
    {arrDep.length === 0 ? empty("check", "Ni arrivée ni départ cette semaine", "") :
      arrDep.map((x, i) => <Row key={x.r.pj + x.l} first={i === 0} pj={x.r.pj} pill={<Pill tone={x.tone}>{x.l}</Pill>} main={nomOf(x.r) || x.r.gamme || ""} presence={presenceOf(x.r)} right={x.d === today ? "aujourd'hui" : fmtDay(x.d)} rightColor={x.d === today ? T.teal600 : undefined} />)}
    {more("Ouvrir le calendrier", () => onGo && onGo("calendar"))}</>) };
  W.montage = { label: "En montage", span: 7, render: () => sec("montage", "En montage", S.production.ring, <>
    <Head title="En montage" sub="méca, élec, packaging" count={montage.length} />
    {montage.length === 0 ? empty("check", "Aucune machine en montage", "") :
      montage.slice(0, 8).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={((ETAT_META[r.etat] || {}).label || "") + (nomOf(r) ? " · " + nomOf(r) : "")} right={(r.drift > 0 ? "+" + r.drift + " j · " : "") + "fin " + fmtD(r.finProd)} rightColor={r.drift > 10 ? T.red500 : r.drift > 0 ? T.amber600 : undefined} />)}</>) };
  W.postes = { label: "Postes de test", span: 5, render: () => sec("postes", "Postes de test", S.tests.ring, <>
    <Head title="Postes de test" sub="machines au banc aujourd'hui" count={nowTest.length} />
    {nowTest.length === 0 ? empty("check", "Aucun poste de test occupé", "") :
      nowTest.map((r, i) => { const names = testsDoc ? planOf(testsDoc, r.pj).assign.map(a => (testers.find(t => t.id === a.tid) || {}).name).filter(Boolean) : []; return (
        <Row key={r.pj} first={i === 0} pj={r.pj} pill={<Pill tone={names.length ? S.tests : A.orange}>{names.length ? names.map(n => n.split(" ")[0]).join(", ") : "Sans testeur"}</Pill>} main={nomOf(r) || r.gamme || ""} right={"jusqu'au " + fmtD(r.testsFin || r.tests)} />); })}
    {testsDoc && more("Ouvrir les tests", () => onGo && onGo("tests"))}</>) };
  // direction
  W.tests = { label: "Tests (chiffres)", span: 4, render: () => { const w3 = addD(w0, 20);
    const soon = testsDoc ? open.filter(r => r.tests && tEnd(r) >= w0 && tStart(r) <= w3) : [];
    const noTester = soon.filter(r => planOf(testsDoc, r.pj).assign.length === 0);
    const fails = testsDoc ? open.reduce((n, r) => n + (r.tests ? prog(r).ko : 0), 0) : 0;
    const lateT = testsDoc ? open.filter(r => r.tests && tEnd(r) < w0 && !isForced(planOf(testsDoc, r.pj)) && (q => q.total > q.done)(prog(r))).length : 0;
    const conflicts = testsDoc ? findConflicts(testsDoc, open).length : 0;
    return sec("tests", "Tests", S.tests.ring, <><Head title="Tests" sub="3 prochaines semaines" />
      {testsDoc ? <StatLine items={[{ label: "au banc", value: soon.length, onClick: () => onGo("tests") }, { label: "sans testeur", value: noTester.length, tone: noTester.length ? T.red500 : undefined, onClick: () => onGo("tests") }, { label: "échecs", value: fails, tone: fails ? T.red500 : undefined }, { label: "en retard", value: lateT, tone: lateT ? T.amber600 : undefined }, { label: "conflits", value: conflicts, tone: conflicts ? T.amber600 : undefined }]} /> : <div style={grey}>Page Tests non disponible.</div>}</>); } };
  // v267 : l'ancien pool (planning/turbines) n'est plus la référence : les turbines viennent de la production (cadrans « pt »)
  W.turbines = { label: "Turbines (pool)", span: 4, render: () => null, renderOld: () => { const turb = (turbineDoc && turbineDoc.turbines) || []; const tst = turb.map(t => turbineStatus(t, today));
    const nCrit = tst.filter(x => x === "Critique").length, nLateT = tst.filter(x => x === "En retard").length;
    return sec("turbines", "Turbines", H.brand, <><Head title="Turbines" count={turb.length} />
      <div style={grid}><Stat label="critiques" value={nCrit} tone={nCrit ? T.red500 : undefined} /><Stat label="en retard" value={nLateT} tone={nLateT ? T.amber600 : undefined} /></div></>); } };
  // v392 : sur l'accueil d'un chef de projet, le Cash in ne compte que ses PJ (jalon « PJ401/PJ402 » : compté s'il touche l'un d'eux)
  const cashDoc = () => { const d = getCashinDoc(); if (!d || !scope) return d; const hit = pj => String(pj || "").split(/[^A-Za-z0-9]+/).some(p => scope.has(p)); return { ...d, rows: (d.rows || []).filter(x => hit(x.pj)) }; };
  W.cash = { label: "Cash in", span: 4, only: () => !!cash, render: () => { const c = cashOverview(cashDoc(), today); return sec("cash", "Cash in", S.finProd.ring, <>
    <Head title="Cash in" sub={c ? "hors EPC" : ""} />
    {!c ? <div style={{ ...grey, margin: "4px 0 6px" }}>Données du Cash in pas encore chargées : ouvrez une fois l'onglet Cash in, ou importez le fichier.</div> : <>
      <div style={{ ...grid, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}><Stat label="encaissé" value={fmtEur(c.paid)} /><Stat label="facturé, en attente" value={fmtEur(c.invoiced)} /><Stat label="en retard de paiement" value={fmtEur(c.late)} tone={c.late ? T.red500 : undefined} /><Stat label="à facturer" value={fmtEur(c.toBill)} tone={c.toBill ? T.amber600 : undefined} /><Stat label="attendu sous 30 j" value={fmtEur(c.next30)} /></div>
    </>}
    {onOpenCash && more("Ouvrir le Cash in", onOpenCash)}</>); } };
  // v369 (raccourci de la proposition B) : factures émises en attente de paiement ; un appui ouvre Cash in › Encaissements
  W.encaisser = { label: "À encaisser", span: 4, sizes: ["m", "s", "xl"], only: () => !!cash, render: z => { const d = cashDoc(); if (!d) return null;
    const L = toCollect(d.rows, cashToday()), amt = x => Number(x.r.montant) || 0, tot = L.reduce((a, x) => a + amt(x), 0), lateN = L.filter(x => x.group === "late").length;
    const go = () => onOpenCash && onOpenCash("enc"), fd = iso => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "—");
    return sec("encaisser", "À encaisser", S.finProd.ring, <><Head title="À encaisser" sub={L.length ? L.length + " facture" + (L.length > 1 ? "s" : "") + " émise" + (L.length > 1 ? "s" : "") + (lateN ? " · " + lateN + " en retard" : "") : "rien en attente"} />
      <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: lateN ? T.red600 : T.ink900, margin: "2px 0 4px" }}>{fmtEur(tot)}</div>
      {z !== "s" && L.slice(0, z === "xl" ? 6 : 3).map(x => <button key={x.r.id} type="button" onClick={go} aria-label={"Saisir l'encaissement de " + x.r.pj} style={{ all: "unset", boxSizing: "border-box", width: "100%", display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "6px 4px", minHeight: 44, borderTop: "1px solid " + T.line, cursor: "pointer" }}>
        <b style={{ fontFamily: T.fontMono, fontSize: 13, fontWeight: 600 }}>{x.r.pj}</b>
        <span style={{ fontSize: 12, color: x.group === "late" ? T.red600 : T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.group === "late" ? -x.days + " j de retard" : "prévu le " + fd(x.due)}</span>
        <b style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtEur(amt(x))}</b></button>)}
      {onOpenCash && more("Saisir les encaissements", go)}</>); } };
  // v391 (demandé : « la courbe annuelle du Cash in en widget, et des widgets pour la direction ») — calculs de la fiche du lundi (cashWeekly.js)
  const cashRep = () => { const d = cashDoc(); if (!d) return null; try { return weeklyReport(d, cashToday()); } catch (e) { return null; } };
  W.cashCurve = { label: "Cash in de l'année", span: 12, sizes: ["xl", "m"], only: () => !!cash, render: z => { const r = cashRep(); if (!r) return null;
    return sec("cashCurve", "Cash in de l'année", S.finProd.ring, <><Head title={"Cash in " + r.year} sub="cumul face à l'initial, hors EPC" />
      <div style={{ display: "grid", gridTemplateColumns: z === "xl" ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0,1fr))", gap: 8, margin: "2px 0 10px" }}>
        <Stat label={"encaissé · " + fmtS(r.ytd.gap) + " sur l'initial"} value={fmtEur(r.ytd.paid)} tone={gapTone(r.ytd.gap) === T.ink500 ? undefined : gapTone(r.ytd.gap)} />
        <Stat label={"prévu fin d'année · initial " + fmtEur(r.yearEnd.init)} value={fmtEur(r.yearEnd.forecast)} />
        {z === "xl" && <Stat label="en retard de paiement" value={fmtEur(r.yearEnd.lateCash)} tone={r.yearEnd.lateCash ? T.red600 : undefined} />}
      </div>
      <CashCurve r={r} h={z === "xl" ? 190 : 140} />
      {onOpenCash && more("Ouvrir le Cash in", () => onOpenCash())}</>); } };
  W.cashMonth = { label: "Cash in du mois", span: 6, sizes: ["m", "xl"], only: () => !!cash, render: z => { const r = cashRep(); if (!r) return null;
    const col = (m, k) => { const e = m.enc, f = m.fact, pct = e.act ? Math.min(100, Math.round(e.paid / e.act * 100)) : 0;
      return <div key={k} style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink900 }}>{m.label}{k === "cur" ? " (en cours)" : ""}</div>
        <div style={{ fontSize: 12, color: T.ink500, marginTop: 6 }}>Encaissements</div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: T.ink900, lineHeight: 1.1 }}>{fmtEur(e.act)}</div>
        <div role="img" aria-label={fmtEur(e.paid) + " déjà reçus sur " + fmtEur(e.act)} style={{ height: 6, borderRadius: 2, background: T.surfaceAlt, overflow: "hidden", margin: "6px 0 4px" }}><i style={{ display: "block", height: "100%", width: pct + "%", background: T.emerald600 }} /></div>
        <div style={{ fontSize: 12, color: T.ink500 }}>{fmtEur(e.paid)} reçus · initial {fmtEur(e.init)} · <span style={{ color: gapTone(e.gap), fontWeight: 500 }}>{fmtS(e.gap)}</span></div>
        <div style={{ fontSize: 12, color: T.ink500, marginTop: 10 }}>Factures</div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: T.ink900 }}>{fmtEur(f.act)}</div>
        <div style={{ fontSize: 12, color: T.ink500 }}>{fmtEur(f.done)} émises · initial {fmtEur(f.init)} · <span style={{ color: gapTone(f.gap), fontWeight: 500 }}>{fmtS(f.gap)}</span></div>
      </div>; };
    return sec("cashMonth", "Cash in du mois", S.finProd.ring, <><Head title="Cash in du mois" sub="encaissements et factures face à l'initial" />
      <div style={{ display: "grid", gridTemplateColumns: z === "xl" ? "repeat(2, minmax(0,1fr))" : "minmax(0,1fr)", gap: 18 }}>{col(r.cur, "cur")}{z === "xl" && col(r.next, "next")}</div>
      {onOpenCash && more("Ouvrir le Cash in", () => onOpenCash())}</>); } };
  W.cashLate = { label: "Retards de paiement", span: 6, sizes: ["m", "xl"], only: () => !!cash, render: z => { const r = cashRep(); if (!r) return null; const L = r.late.items;
    return sec("cashLate", "Retards de paiement", A.orange.ring, <><Head title="Retards du Cash in" sub={L.length ? r.late.encN + " paiement" + (r.late.encN > 1 ? "s" : "") + " · " + r.late.billN + " facture" + (r.late.billN > 1 ? "s" : "") + " à émettre" : "aucun retard"} />
      <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: r.late.total ? T.red600 : T.ink900, margin: "2px 0 4px" }}>{fmtEur(r.late.total)}</div>
      {L.length === 0 ? empty("check", "Aucun retard", "Factures et paiements sont à l'heure.") : L.slice(0, z === "xl" ? 6 : 4).map((x, i) => <Row key={x.id + x.kind} first={i === 0} pj={x.pj} pill={<Pill tone={x.kind === "paiement" ? A.orange : { bg: T.surfaceAlt, ink: T.ink700 }}>{x.kind === "paiement" ? "Paiement" : "Facture"}</Pill>} main={x.jalon + (x.client ? " · " + x.client : "")} right={fmtEur(x.montant) + " · " + x.days + " j"} />)}
      {onOpenCash && more("Ouvrir le Cash in", () => onOpenCash())}</>); } };
  W.depQuarter = { label: "Départs du trimestre", span: 6, sizes: ["m", "s", "xl"], render: z => {
    const y = +today.slice(0, 4), q = Math.floor((+today.slice(5, 7) - 1) / 3), from = y + "-" + String(q * 3 + 1).padStart(2, "0") + "-01", to = (q === 3 ? (y + 1) + "-01" : y + "-" + String(q * 3 + 4).padStart(2, "0")) + "-01";
    const inQ = d => d && d >= from && d < to, ini = r => (dIso(r.depart) && Number(r.drift) ? iso(new Date(new Date(dIso(r.depart)).getTime() - Number(r.drift) * 864e5)) : dIso(r.depart));
    const plan = rows.filter(r => r.etat !== "A_DEFINIR" && inQ(dIso(r.depart))), done = plan.filter(r => r.etat === "SHIPPED"), initN = rows.filter(r => r.etat !== "A_DEFINIR" && inQ(ini(r))).length;
    const lateL = plan.filter(r => r.etat !== "SHIPPED" && dIso(r.depart) < today);
    return sec("depQuarter", "Départs du trimestre", S.depart.ring, <><Head title={"Départs T" + (q + 1) + " " + y} sub={"initial : " + initN + " départ" + (initN > 1 ? "s" : "") + " prévu" + (initN > 1 ? "s" : "")} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "2px 0 6px" }}><span style={{ fontFamily: T.fontDisplay, fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: T.ink900 }}>{done.length}</span><span style={{ fontSize: 14, color: T.ink500 }}>expédiée{done.length > 1 ? "s" : ""} sur {plan.length} prévue{plan.length > 1 ? "s" : ""}</span></div>
      <div role="img" aria-label={done.length + " expédiées sur " + plan.length} style={{ display: "flex", gap: 2, height: 8, marginBottom: 6 }}>{plan.sort((a, b) => dIso(a.depart).localeCompare(dIso(b.depart))).map(r => <i key={r.pj} style={{ flex: 1, borderRadius: 2, background: r.etat === "SHIPPED" ? T.emerald600 : dIso(r.depart) < today ? T.red500 : T.line }} />)}</div>
      {plan.length !== initN && <div style={{ fontSize: 12, color: plan.length < initN ? T.red600 : T.ink500 }}>{plan.length < initN ? initN - plan.length + " départ" + (initN - plan.length > 1 ? "s" : "") + " de l'initial glissé" + (initN - plan.length > 1 ? "s" : "") + " après le trimestre" : plan.length - initN + " de plus que l'initial"}</div>}
      {z !== "s" && lateL.slice(0, 4).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} pill={<Pill tone={A.orange}>Départ passé</Pill>} main={nomOf(r) || ""} right={fmtD(r.depart)} />)}</>); } };
  W.onTime = { label: "Départs à l'heure", span: 6, sizes: ["m", "s", "xl"], render: z => {
    const since = iso(new Date(Date.now() - 90 * 864e5)), L = rows.filter(r => r.etat === "SHIPPED" && dIso(r.depart) && dIso(r.depart) <= today && dIso(r.depart) >= since);
    const ok = L.filter(r => (Number(r.drift) || 0) <= 0).length, pct = L.length ? Math.round(ok / L.length * 100) : null, avg = L.length ? Math.round(L.reduce((t, r) => t + Math.max(0, Number(r.drift) || 0), 0) / L.length) : 0;
    const worst = L.filter(r => (Number(r.drift) || 0) > 0).sort((a, b) => b.drift - a.drift);
    return sec("onTime", "Départs à l'heure", S.depart.ring, <><Head title="Départs à l'heure" sub="expédiées des 90 derniers jours, face au planning initial" />
      {pct == null ? empty("inbox", "Aucune expédition", "Rien n'est parti ces 90 derniers jours.") : <>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "2px 0 4px" }}><span style={{ fontFamily: T.fontDisplay, fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: pct >= 80 ? T.emerald600 : T.red600 }}>{pct} %</span><span style={{ fontSize: 14, color: T.ink500 }}>{ok} sur {L.length} à la date promise</span></div>
        <div style={{ fontSize: 12, color: T.ink500 }}>Retard moyen {avg} j · objectif 80 %</div>
        {z !== "s" && worst.slice(0, z === "xl" ? 5 : 3).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r) || ""} right={"+" + r.drift + " j"} />)}</>}</>); } };
  W.alertes = { label: "Alertes", span: 8, render: () => { const bigLate = late.filter(r => r.drift > 10);
    return sec("alertes", "Alertes", A.orange.ring, <><Head title="Alertes" sub="dérives de plus de 10 j" count={bigLate.length} />
      {bigLate.length === 0 ? empty("check", "Aucune alerte", "Pas de grosse dérive.") : bigLate.slice(0, 6).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} pill={<Pill tone={A.orange}>Dérive</Pill>} main={nomOf(r) || "Départ " + fmtD(r.depart)} right={"+" + r.drift + " j"} />)}</>); } };
  // directeur de production turbines
  const ptOnly = () => !!pt;
  const ptOpen = () => more("Ouvrir Production turbines", () => onGo && onGo("prodturb"));
  W.ptReady = { label: "Turbines prêtes", span: 3, only: ptOnly, render: () => sec("ptReady", "Turbines prêtes", S.depart.ring, <><Head title="Turbines prêtes" count={pt.ready.length} />
    {pt.ready.length === 0 ? empty("inbox", "Aucune turbine prête", "") : pt.ready.slice(0, 6).map((t, i) => <div key={t.id} style={{ display: "flex", gap: 8, minHeight: 28, alignItems: "center", borderTop: i ? "1px solid " + T.line : "none", fontSize: FZ.sm }}><b style={{ fontFamily: T.fontMono }}>{t.num}</b><span style={{ ...grey, marginLeft: "auto" }}>{t.roue ? "roue " + t.roue : "roue à renseigner"}</span></div>)}</>) };
  W.ptNoWheel = { label: "Testées sans roue", span: 3, only: ptOnly, render: () => sec("ptNoWheel", "Testées sans roue", T.ink500, <><Head title="Testées sans roue" count={pt.noWheel.length} />
    {pt.noWheel.length === 0 ? empty("check", "Aucune en stock sans roue", "") : pt.noWheel.slice(0, 6).map((t, i) => <div key={t.id} style={{ display: "flex", gap: 8, minHeight: 28, alignItems: "center", borderTop: i ? "1px solid " + T.line : "none", fontSize: FZ.sm }}><b style={{ fontFamily: T.fontMono }}>{t.num}</b><span style={{ ...grey, marginLeft: "auto" }}>{t.since ? "depuis le " + fmtD(t.since) : ""}</span></div>)}</>) };
  W.ptPieces = { label: "Pièces à suivre", span: 6, only: ptOnly, render: () => { const L = Object.values(pt.S.pieces).filter(p => p.statut === "nc" || (p.statut === "appro" && p.dateLiv && p.dateLiv < today) || p.statut === "cq").sort((a, b) => (a.statut === "nc" ? 0 : 1) - (b.statut === "nc" ? 0 : 1));
    return sec("ptPieces", "Pièces à suivre", A.orange.ring, <><Head title="Pièces à suivre" sub="NC, contrôle, livraisons en retard" count={L.length} />
      {L.length === 0 ? empty("check", "Rien à suivre", "") : L.slice(0, 5).map((p, i) => <div key={p.id} style={{ display: "flex", gap: 8, minHeight: 30, alignItems: "center", borderTop: i ? "1px solid " + T.line : "none", fontSize: FZ.sm }}>
        <Pill tone={p.statut === "nc" ? A.red : p.statut === "cq" ? S.tests : A.orange}>{p.statut === "nc" ? "NC" : p.statut === "cq" ? "Contrôle" : "Appro"}</Pill>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.designation}{p.turbine ? " · " + p.turbine : ""}{p.statut === "nc" && p.motif ? " · " + p.motif : ""}</span>
        {p.statut === "appro" && <span style={{ color: T.red500, fontSize: FZ.xs, fontWeight: 500 }}>livraison {fmtD(p.dateLiv)}</span>}</div>)}
      {ptOpen()}</>); } };
  W.ptDates = { label: "Dates prévisionnelles des turbines", span: 12, only: ptOnly, render: () => { const L = pt.upcoming.slice(0, 6); const Hd = Math.min(120, Math.ceil(Math.max(10, ...L.map(u => u.s.end ?? 0))) + 2); const pct = x => Math.max(0, Math.min(100, x / Hd * 100));
    const col = ph => ({ carter: S.production.solid, assy: S.finProd.solid, tests: S.tests.solid })[ph] || T.ink300;
    return sec("ptDates", "Dates prévisionnelles des turbines", S.production.ring, <><Head title="Dates prévisionnelles" sub="prochaines turbines, jours ouvrés" count={pt.upcoming.length} />
      {L.length === 0 ? empty("inbox", "Aucune turbine en cours", "") : L.map(({ t, s }, i) => <div key={t.id} style={{ display: "flex", gap: 10, minHeight: 32, alignItems: "center", borderTop: i ? "1px solid " + T.line : "none", fontSize: FZ.sm }}>
        <b style={{ fontFamily: T.fontMono, width: 64, flex: "none" }}>{t.num}</b>
        <div style={{ flex: 1, position: "relative", height: 10, background: T.surface, borderRadius: 4 }}>{(s.segs || []).map((g, j) => <i key={j} style={{ position: "absolute", top: 0, bottom: 0, left: pct(g.from) + "%", width: (g.to === null ? 100 - pct(g.from) : pct(g.to) - pct(g.from)) + "%", borderRadius: 4, background: g.ph === "wait" ? "repeating-linear-gradient(135deg," + A.orange.ring + " 0 3px,transparent 3px 7px)" : g.ph === "missing" ? "repeating-linear-gradient(135deg," + A.red.ring + " 0 3px,transparent 3px 7px)" : col(g.ph) }} />)}</div>
        <span style={{ width: 110, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: s.missing ? T.red500 : s.noRoue ? T.amber600 : T.ink700 }}>{s.missing ? "arbre manquant" : s.noRoue ? "roue à attribuer" : s.end != null ? pt.offDate(s.end).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "numeric" }) : "—"}</span></div>)}
      {ptOpen()}</>); } };
  const stockList = (id, label, list, val, sub) => sec(id, label, S.arrivee.ring, <><Head title={label} count={list.reduce((a, r) => a + val(r), 0)} />
    {list.length === 0 ? empty("inbox", "Aucune référence", "") : list.map((r, i) => <div key={r.id} style={{ display: "flex", gap: 8, minHeight: 28, alignItems: "center", borderTop: i ? "1px solid " + T.line : "none", fontSize: FZ.sm }}><span style={{ flex: 1 }}>{r.ref}{sub ? <span style={grey}>{sub(r)}</span> : null}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{val(r)}</b></div>)}</>);
  W.ptRoues = { label: "Roues équilibrées", span: 6, only: ptOnly, render: () => stockList("ptRoues", "Roues équilibrées", Object.values(pt.S.roues), r => +r.qte || 0) };
  W.ptInj = { label: "Injecteurs", span: 6, only: ptOnly, render: () => stockList("ptInj", "Injecteurs", Object.values(pt.S.injecteurs), r => (+r.qte || 0) + (r.variantes || []).reduce((a, v) => a + (+v.qte || 0), 0), r => " · " + (+r.qte || 0) + " vierge" + ((+r.qte || 0) > 1 ? "s" : "")) };

  // v235 (demandé : « mettre à dispo plus de cadrans ») : cadrans en lecture seule, utiles à tout le monde
  W.shipped = { label: "Dernières expédiées", span: 6, render: () => { const L = rows.filter(r => r.etat === "SHIPPED" && dIso(r.depart) && dIso(r.depart) <= today).sort((a, b) => dIso(b.depart).localeCompare(dIso(a.depart))).slice(0, 6);
    return sec("shipped", "Dernières expédiées", S.depart.ring, <><Head title="Dernières expédiées" count={L.length} />
      {L.length === 0 ? empty("inbox", "Aucune machine expédiée", "") : L.map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r) || r.gamme || ""} right={fmtD(r.depart)} />)}</>); } };
  W.visites = { label: "Visites client / NOBO", span: 6, render: () => { const f = [];
    open.forEach(r => { const pd = presenceDates(r.clientPresence); [["client", "Client"], ["nobo", "NOBO"]].forEach(([k, l]) => { if (pd[k] === undefined) return; const d = dIso(pd[k]); if (d && d >= today) f.push({ r, l, d }); }); });
    f.sort((a, b) => a.d.localeCompare(b.d));
    return sec("visites", "Visites client / NOBO", S.arrivee.ring, <><Head title="Visites client / NOBO" sub="à venir, toutes machines" count={f.length} />
      {f.length === 0 ? empty("check", "Aucune visite prévue", "") : f.slice(0, 6).map((x, i) => <Row key={x.r.pj + x.l} first={i === 0} pj={x.r.pj} pill={<Pill tone={S.arrivee}>{x.l}</Pill>} main={nomOf(x.r)} right={fmtDay(x.d)} />)}</>); } };
  W.benchWeek = { label: "Au banc cette semaine", span: 6, render: () => { const L = open.filter(r => r.tests && tEnd(r) >= w0 && tStart(r) <= weekEnd).sort((a, b) => tStart(a).localeCompare(tStart(b)));
    return sec("benchWeek", "Au banc cette semaine", S.tests.ring, <><Head title="Au banc cette semaine" sub={"du " + fmtD(w0) + " au " + fmtD(addD(w0, 4))} count={L.length} />
      {L.length === 0 ? empty("check", "Aucune machine au banc cette semaine", "") : L.slice(0, 6).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r) || r.gamme || ""} presence={presenceOf(r)} right={fmtDay(tStart(r)) + " → " + fmtDay(tEnd(r))} />)}
      {testsDoc && more("Ouvrir les tests", () => onGo && onGo("tests"))}</>); } };
  W.etats = { label: "Machines par état", span: 6, render: () => { const n = {}; open.forEach(r => { n[r.etat] = (n[r.etat] || 0) + 1; });
    const L = Object.entries(n).sort((a, b) => b[1] - a[1]), max = Math.max(1, ...L.map(x => x[1]));
    return sec("etats", "Machines par état", S.production.ring, <><Head title="Machines par état" sub="hors expédiées" count={open.length} />
      {L.length === 0 ? empty("inbox", "Aucune machine", "") : L.slice(0, 8).map(([k, c]) => { const m = ETAT_META[k] || {}; return (
        <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(0,150px) 1fr 32px", gap: 8, alignItems: "center", minHeight: 26, fontSize: FZ.sm }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.ink700 }}>{m.label || k}</span>{bar(c / max * 100, m.bar || T.ink300)}
          <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c}</b></div>); })}</>); } };
  W.depMois = { label: "Départs par mois", span: 6, render: () => { const m0 = new Date(today + "T12:00:00"); const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(m0.getFullYear(), m0.getMonth() + i, 1); return { k: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"), l: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") }; });
    months.forEach(m => { m.n = open.filter(r => dIso(r.depart).slice(0, 7) === m.k).length; }); const max = Math.max(1, ...months.map(m => m.n));
    return sec("depMois", "Départs par mois", S.depart.ring, <><Head title="Départs par mois" sub="6 prochains mois" count={months.reduce((a, m) => a + m.n, 0)} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110, marginTop: 8 }}>
        {months.map(m => <div key={m.k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
          <span style={{ fontSize: FZ.xs, fontWeight: 500, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{m.n}</span>
          <div className="enogia-bar-fill" style={{ width: "100%", maxWidth: 44, height: Math.max(2, Math.round(70 * m.n / max)), background: S.depart.solid }} />
          <span style={grey}>{m.l}</span></div>)}
      </div></>); } };
  W.fermetures = { label: "Fermetures à venir", span: 4, render: () => { const L = (closurePeriods || []).filter(p => p && p.start && dIso(p.end || p.start) >= today).sort((a, b) => dIso(a.start).localeCompare(dIso(b.start))).slice(0, 5);
    return sec("fermetures", "Fermetures à venir", T.ink500, <><Head title="Fermetures à venir" sub="jours sans atelier" count={L.length} />
      {L.length === 0 ? empty("check", "Aucune fermeture prévue", "") : L.map((p, i) => { const a = dIso(p.start), b = dIso(p.end || p.start); return (
        <div key={a + i} style={{ display: "flex", gap: 8, minHeight: 28, alignItems: "center", borderTop: i ? "1px solid " + T.line : "none", fontSize: FZ.sm }}>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label || "Fermeture"}</span>
          <span style={{ ...grey, fontVariantNumeric: "tabular-nums" }}>{a === b ? fmtDay(a) : fmtD(a) + " → " + fmtD(b)}</span></div>); })}</>); } };
  W.raccourcis = { label: "Raccourcis", span: 4, render: () => sec("raccourcis", "Raccourcis", H.brand, <><Head title="Raccourcis" sub="pages du site" />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6, marginTop: 6 }}>
      {[["table", "Liste", "list"], ["gantt", "Gantt", "gantt"], ["calendar", "Calendrier", "calendar"], ["tests", "Tests", "check"], ["comments", "Commentaires", "comments"], ["changes", "Modifications", "changes"]].map(([v, l, ic]) =>
        <button key={v} type="button" onClick={() => onGo && onGo(v)} style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 36, border: "1px solid " + T.line, background: T.card, borderRadius: 8, padding: "0 10px", cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: 600, color: T.ink900 }}><NavIcon name={ic} size={16} />{l}</button>)}
    </div></>) };

  // v352 (direction frontend-design, A) : la ligne d'atelier — les sept postes reliés, chaque machine posée sur son poste
  // (plaque à liseré de la couleur de l'état), retard sur l'initial écrit dessous ; expédiées des 30 derniers jours seulement.
  W.ligne = { label: "Ligne d'atelier", span: 12, render: () => {
    const since = addD(today, -30);
    const L = rows.filter(r => r.etat !== "A_DEFINIR" && (r.etat !== "SHIPPED" || (dIso(r.depart) && dIso(r.depart) >= since)));
    const by = LINE_STATIONS.map(() => []); L.forEach(r => by[stationOf(r.etat)].push(r));
    by.forEach(l => l.sort((a, b) => (dIso(a.depart) || "9").localeCompare(dIso(b.depart) || "9")));
    const MAX = 4;
    return sec("ligne", "Ligne d'atelier", S.production.ring, <><Head title="Ligne d'atelier" sub="où sont les machines, de la commande à l'expédition" count={L.length} />
      <div style={{ overflowX: "auto", marginTop: 6 }}>
        <ol aria-label="Postes de l'atelier" style={{ listStyle: "none", margin: 0, padding: "0 0 4px", display: "grid", gridTemplateColumns: "repeat(7, minmax(104px, 1fr))", position: "relative", minWidth: 728 }}>
          <span aria-hidden="true" style={{ position: "absolute", left: "7%", right: "7%", top: 31, height: 6, borderRadius: 999, background: T.line }} />
          {LINE_STATIONS.map((st, i) => { const list = by[i], c = etatBar(st.etats[0]); return (
            <li key={st.id} aria-label={st.label + " : " + list.length + " machine" + (list.length > 1 ? "s" : "")} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0, padding: "0 4px" }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.ink500, minHeight: 18, textAlign: "center" }}>{st.label}</span>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", background: T.card, border: "4px solid " + c, position: "relative", zIndex: 1, boxSizing: "border-box" }} />
              <b style={{ fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, lineHeight: 1, color: list.length ? T.ink900 : T.ink300 }}>{list.length}</b>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                {list.slice(0, MAX).map(r => <button key={r.pj} type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} title={(nomOf(r) || r.pj) + (r.drift > 0 ? " · +" + r.drift + " j sur l'initial" : "")} aria-label={"Ouvrir " + r.pj + (r.drift > 0 ? ", " + r.drift + " jours de retard sur l'initial" : "")}
                  style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <PjPlate pj={r.pj} style={{ boxShadow: "inset 3px 0 0 " + etatBar(r.etat) }} />
                  {r.drift > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: T.red600 }}>+{r.drift} j</span>}
                </button>)}
                {list.length > MAX && <button type="button" onClick={() => onGo && onGo("table")} style={{ border: "none", background: "transparent", color: T.accentInk, fontSize: 12, fontWeight: 500, cursor: "pointer", minHeight: 24 }}>+ {list.length - MAX} autre{list.length - MAX > 1 ? "s" : ""}</button>}
              </span>
            </li>); })}
        </ol>
      </div></>); } };
  // v352 (direction frontend-design, C) : la fiche suiveuse de chaque machine en cours — liseré de la couleur de l'état, les sept
  // postes en barrettes (fait / en cours / à venir), départ et retard sur l'initial ; triées par départ.
  W.suiveuses = { label: "Fiches suiveuses", span: 12, render: () => {
    const L = open.filter(r => r.etat !== "A_DEFINIR").slice().sort((a, b) => (dIso(a.depart) || "9").localeCompare(dIso(b.depart) || "9"));
    const MAX = 9;
    return sec("suiveuses", "Fiches suiveuses", S.production.ring, <><Head title="Fiches suiveuses" sub="les machines en cours, par date de départ" count={L.length} />
      {L.length === 0 ? empty("check", "Aucune machine en cours", "") : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginTop: 6 }}>
        {L.slice(0, MAX).map(r => { const c = etatBar(r.etat), cur = stationOf(r.etat), m = ETAT_META[r.etat] || {}; return (
          <button key={r.pj} type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} aria-label={"Ouvrir " + r.pj + ", " + (m.label || r.etat) + ", départ " + fmtD(r.depart)}
            style={{ textAlign: "left", cursor: "pointer", border: "1px solid " + T.line, borderRadius: "4px 12px 12px 4px", background: T.card, boxShadow: "inset 6px 0 0 " + c, padding: "10px 12px 10px 16px", fontFamily: T.font, color: T.ink900, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}><PjPlate pj={r.pj} /><span style={{ marginLeft: "auto", fontSize: 12, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label || r.etat}</span></span>
            <span style={{ fontSize: 13, color: T.ink700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomOf(r) || r.gamme || ""}</span>
            <span aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
              {LINE_STATIONS.map((st, i) => <i key={st.id} title={st.label} style={{ height: 8, borderRadius: 2, background: i <= cur ? c : T.surfaceAlt, boxShadow: i === cur ? "0 0 0 2px " + T.card + ", 0 0 0 3px " + c : "none" }} />)}
            </span>
            <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.ink500 }}><span>Départ</span><b style={{ fontWeight: 600, color: r.drift > 0 ? T.red600 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{fmtD(r.depart)}{r.drift > 0 ? " · +" + r.drift + " j" : ""}</b></span>
          </button>); })}
      </div>}
      {L.length > MAX && more("Voir les " + L.length + " machines dans la Liste", () => onGo && onGo("table"))}</>); } };

  // v353 (demandé : « plus de modèles de cadrans ») : sept cadrans de plus, inactifs par défaut
  const countBy = (list, keyOf) => { const m = new Map(); list.forEach(r => { const ks = [].concat(keyOf(r) || []); (ks.length ? ks : ["—"]).forEach(k => m.set(k, (m.get(k) || 0) + 1)); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const barList = (id, title, sub, color, L, labelEl) => { const max = Math.max(1, ...L.map(x => x[1])); return sec(id, title, color, <><Head title={title} sub={sub} count={L.reduce((a, x) => a + x[1], 0)} />
    {L.length === 0 ? empty("inbox", "Aucune machine", "") : L.slice(0, 8).map(([k, c]) => <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(0,160px) 1fr 32px", gap: 8, alignItems: "center", minHeight: 28, fontSize: FZ.sm }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.ink700 }}>{labelEl ? labelEl(k) : k}</span>{bar(c / max * 100, color)}
      <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{c}</b></div>)}</>); };
  const upcoming = (field, days) => { const end = addD(today, days); return open.filter(r => dIso(r[field]) && dIso(r[field]) >= today && dIso(r[field]) <= end).sort((a, b) => dIso(a[field]).localeCompare(dIso(b[field]))); };
  const jIn = d => { const n = Math.round((new Date(d + "T12:00:00") - new Date(today + "T12:00:00")) / 864e5); return n <= 0 ? "aujourd'hui" : "J-" + n; };
  // tableau des départs : compte à rebours en grand (direction B de la maquette v352)
  W.depBoard = { label: "Tableau des départs", span: 8, render: () => { const L = upcoming("depart", 60).slice(0, 6);
    return sec("depBoard", "Tableau des départs", S.depart.ring, <><Head title="Tableau des départs" sub="les 60 prochains jours" count={L.length} />
      {L.length === 0 ? empty("check", "Aucun départ dans les 60 jours", "") : L.map((r, i) => { const m = ETAT_META[r.etat] || {}; return (
        <button key={r.pj} type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} style={{ display: "grid", gridTemplateColumns: "92px auto minmax(0,1fr) auto", gap: 12, alignItems: "center", width: "100%", minHeight: 44, border: "none", borderTop: i ? "1px solid " + T.line : "none", background: "transparent", padding: "4px 0", cursor: "pointer", fontFamily: T.font, textAlign: "left", color: T.ink900 }}>
          <b style={{ fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, color: r.drift > 0 ? T.red600 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{jIn(dIso(r.depart))}</b>
          <PjPlate pj={r.pj} style={{ boxShadow: "inset 3px 0 0 " + (m.bar || T.ink300) }} />
          <span style={{ fontSize: FZ.sm, color: T.ink700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomOf(r) || r.gamme || ""} · {m.label || r.etat}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: r.drift > 0 ? T.red600 : T.ink500, whiteSpace: "nowrap" }}>{r.drift > 0 ? "+" + r.drift + " j" : "à l'heure"}</span>
        </button>); })}</>); } };
  // écart au planning initial : combien en avance, à l'heure, en retard
  W.ecarts = { label: "Écarts au planning initial", span: 4, render: () => { const L = open.filter(r => r.drift != null);
    const g = [["En avance", L.filter(r => r.drift < 0).length, T.emerald600], ["À l'heure", L.filter(r => r.drift === 0).length, T.ink500], ["1 à 10 j de retard", L.filter(r => r.drift > 0 && r.drift <= 10).length, T.amber600], ["Plus de 10 j", L.filter(r => r.drift > 10).length, T.red600]];
    const max = Math.max(1, ...g.map(x => x[1]));
    return sec("ecarts", "Écarts au planning initial", A.orange ? A.orange.ink || S.production.ring : S.production.ring, <><Head title="Écarts au planning initial" sub="départ, machines en cours" count={L.length} />
      {g.map(([l, c, col]) => <div key={l} style={{ display: "grid", gridTemplateColumns: "minmax(0,140px) 1fr 32px", gap: 8, alignItems: "center", minHeight: 28, fontSize: FZ.sm }}>
        <span style={{ color: T.ink700 }}>{l}</span>{bar(c / max * 100, col)}<b style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c}</b></div>)}</>); } };
  W.parChef = { label: "Machines par chef de projet", span: 4, render: () => barList("parChef", "Machines par chef de projet", "machines en cours", S.production.ring, countBy(open, r => chefsOf(getPjMeta(r.pj, r)))) };
  W.parPays = { label: "Machines par pays", span: 4, render: () => barList("parPays", "Machines par pays", "machines en cours", S.arrivee.ring, countBy(open, r => getPjMeta(r.pj, r).pays || "—"), k => <><CountryFlag pays={k} size={13} />{k}</>) };
  W.parGamme = { label: "Machines par gamme", span: 4, render: () => barList("parGamme", "Machines par gamme", "machines en cours", S.tests.ring, countBy(open, r => r.gamme || "—")) };
  W.finProd = { label: "Fins de production à venir", span: 6, render: () => { const L = upcoming("finProd", 30);
    return sec("finProd", "Fins de production à venir", S.finProd.ring, <><Head title="Fins de production à venir" sub="les 30 prochains jours" count={L.length} />
      {L.length === 0 ? empty("check", "Aucune fin de production dans les 30 jours", "") : L.slice(0, 6).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r) || r.gamme || ""} right={fmtD(r.finProd)} />)}</>); } };
  W.arrivees30 = { label: "Prochaines arrivées", span: 6, render: () => { const L = upcoming("arrivee", 45);
    return sec("arrivees30", "Prochaines arrivées", S.arrivee.ring, <><Head title="Prochaines arrivées" sub="machines qui arrivent à l'atelier, 45 jours" count={L.length} />
      {L.length === 0 ? empty("check", "Aucune arrivée prévue", "") : L.slice(0, 6).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r) || r.gamme || ""} right={fmtD(r.arrivee)} />)}</>); } };
  // v355 (demandé : « plus de widgets », façon widgets Apple) : petits widgets d'un chiffre (Petit) ou d'un chiffre et de ses machines (Moyen)
  const stat = (id, title, n, sub, color, L, open1) => z => sec(id, title, color, <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 4 }}>
    <span style={{ fontSize: 13, fontWeight: 500, color: T.ink500 }}>{title}</span>
    <b style={{ fontFamily: T.fontDisplay, fontSize: FZ.xxl, letterSpacing: "-0.02em", fontWeight: 600, lineHeight: 1.05, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{n}</b>
    {sub && <span style={{ fontSize: 13, color: T.ink700 }}>{sub}</span>}
    {z !== "s" && L && L.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto" }}>{L.slice(0, 6).map(r => <button key={r.pj} type="button" onClick={() => (open1 || onOpenPj) && (open1 || onOpenPj)(r.pj)} aria-label={"Ouvrir " + r.pj} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}><PjPlate pj={r.pj} style={{ boxShadow: "inset 3px 0 0 " + etatBar(r.etat) }} /></button>)}</div>}
  </div>);
  const SMALL = ["s", "m"];
  const prodL = open.filter(r => ["MONTAGE", "ELEC", "TESTS", "PACKAGING"].includes(r.etat)), dep30L = upcoming("depart", 30), lateL = open.filter(r => r.drift > 0).sort((a, b) => b.drift - a.drift);
  W.nProd = { label: "En production", sizes: SMALL, render: z => stat("nProd", "En production", prodL.length, "montage, tests, packaging", S.production.ring, prodL)(z) };
  W.nDep30 = { label: "Départs à 30 jours", sizes: SMALL, render: z => stat("nDep30", "Départs à 30 jours", dep30L.length, dep30L[0] ? "prochain le " + fmtD(dep30L[0].depart) : "aucun départ prévu", S.depart.ring, dep30L)(z) };
  W.nLate = { label: "En retard sur l'initial", sizes: SMALL, render: z => stat("nLate", "En retard sur l'initial", lateL.length, lateL[0] ? "le plus fort : +" + lateL[0].drift + " j" : "aucune machine en retard", T.red600, lateL)(z) };
  W.nBanc = { label: "Au banc (chiffre)", sizes: SMALL, render: z => stat("nBanc", "Au banc aujourd'hui", nowTest.length, nowTest.length ? "machines en tests" : "aucun banc occupé", S.tests.ring, nowTest)(z) };
  W.nShipped = { label: "Expédiées depuis mai", sizes: SMALL, render: z => { const L = rows.filter(r => r.etat === "SHIPPED" && dIso(r.depart) >= SHIPPED_SINCE).sort((a, b) => dIso(b.depart).localeCompare(dIso(a.depart)));
    return stat("nShipped", "Expédiées depuis mai", countShippedYTD(rows), L[0] ? "dernière le " + fmtD(L[0].depart) : "", T.emerald600, L)(z); } };
  W.nextDep = { label: "Prochain départ", sizes: SMALL, render: z => { const r = upcoming("depart", 365)[0], m = r ? ETAT_META[r.etat] || {} : {};
    return sec("nextDep", "Prochain départ", S.depart.ring, <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.ink500 }}>Prochain départ</span>
      {!r ? <span style={{ fontSize: 13, color: T.ink700 }}>Aucun départ prévu</span> : <>
        <b style={{ fontFamily: T.fontDisplay, fontSize: FZ.xxl, letterSpacing: "-0.02em", fontWeight: 600, lineHeight: 1.05, color: r.drift > 0 ? T.red600 : T.ink900 }}>{jIn(dIso(r.depart))}</b>
        <button type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} style={{ alignSelf: "flex-start", border: "none", background: "transparent", padding: 0, cursor: "pointer" }} aria-label={"Ouvrir " + r.pj}><PjPlate pj={r.pj} style={{ boxShadow: "inset 3px 0 0 " + etatBar(r.etat) }} /></button>
        <span style={{ fontSize: 13, color: T.ink700 }}>{fmtDay(r.depart)}{z !== "s" ? " · " + (nomOf(r) || r.gamme || "") + " · " + (m.label || r.etat) : ""}</span></>}
    </div>); } };
  W.jour = { label: "Aujourd'hui", sizes: SMALL, render: z => { const d = new Date(today + "T12:00:00"), th = new Date(d); th.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const y1 = new Date(th.getFullYear(), 0, 4);
    const wk = 1 + Math.round(((th - y1) / 864e5 - 3 + ((y1.getDay() + 6) % 7)) / 7);
    return sec("jour", "Aujourd'hui", H.brand, <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 2 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.red600, textTransform: "capitalize" }}>{d.toLocaleDateString("fr-FR", { weekday: "long" })}</span>
      <b style={{ fontFamily: T.fontDisplay, fontSize: FZ.hero, letterSpacing: "-0.02em", fontWeight: 600, lineHeight: 1, color: T.ink900 }}>{d.getDate()}</b>
      <span style={{ fontSize: 13, color: T.ink700 }}>{d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} · semaine {wk}</span>
      {z !== "s" && <span style={{ fontSize: 13, color: T.ink700, marginTop: "auto" }}>{nowTest.length} au banc · {arrDep.filter(x => x.l === "Arrivée").length} arrivée(s) et {arrDep.filter(x => x.l === "Départ").length} départ(s) cette semaine</span>}
    </div>); } };

  /* ── disposition du poste ── */
  const avail = id => W[id] && (!W[id].only || W[id].only());
  const L = layout || {}, extra = Array.isArray(L.extra) ? L.extra : [], hidden = Array.isArray(L.hidden) ? L.hidden : [];
  const defs = HOME_DEFAULTS[role] || HOME_DEFAULTS.autre;
  const ids = [...defs.map(x => x[0]).filter(id => on(id)), ...extra].filter((id, i, a) => a.indexOf(id) === i && !hidden.includes(id) && avail(id));
  const spans = Object.fromEntries([...defs, ...Object.entries(W).map(([k, w]) => [k, w.span])].reverse().map(([k, s]) => [k, s]));
  // v231 (demandé : « Ajouter un cadran n'est pas clair : des thèmes ou des liens avec les onglets ») : chaque cadran est rangé sous
  // la page du site d'où viennent ses données, avec une phrase qui dit ce qu'il montre.
  const THEMES = [
    ["Vue d'ensemble — Liste et Gantt", { ligne: "les sept postes de l'atelier, chaque machine sur son poste", suiveuses: "une fiche suiveuse par machine en cours, étapes et départ", depBoard: "compte à rebours des départs des 60 jours", ecarts: "machines en avance, à l'heure ou en retard sur l'initial", parChef: "machines en cours par chef de projet", parPays: "machines en cours par pays", parGamme: "machines en cours par gamme", finProd: "fins de production des 30 jours", arrivees30: "arrivées à l'atelier des 45 jours", kpis: "les grands chiffres du portefeuille", depQuarter: "départs du trimestre : expédiés, prévus, initial", onTime: "part des départs tenus sur 90 jours", departs: "les 5 prochains départs", parcours: "combien de machines à chaque étape", alertes: "les dérives fortes et les retards à déclarer", etats: "nombre de machines dans chaque état", depMois: "départs prévus sur les 6 prochains mois", shipped: "les dernières machines parties", raccourcis: "boutons vers les pages du site" }],
    ["Projets — Fiches projet", { pjs: "les PJ d'un chef de projet, triés par départ", jalons: "arrivées, tests et départs des 3 semaines", todo: "retards à déclarer et mentions", fat: "FAT client et NOBO à venir (mes PJ)", visites: "visites client et NOBO à venir, toutes machines", avance: "avancement moyen et PJ en avance / en retard" }],
    ["Tests — page Tests", { tests: "machines au banc et tests des 3 semaines", today: "machines au banc aujourd'hui (jour N / M)", sign: "fiches de test à signer", week: "la semaine de tests d'un testeur", arrivees: "machines qui arrivent au banc", results: "réussis et échecs des 14 derniers jours", postes: "occupation des postes de test", benchWeek: "toutes les machines au banc cette semaine" }],
    ["Atelier — Planificateur et Calendrier", { charge: "heures atelier sur 4 semaines face à la capacité", arrdep: "arrivées et départs de la semaine", montage: "machines en montage méca / élec", fermetures: "fermetures de l’atelier à venir" }],
    ["Production turbines", { ptReady: "turbines prêtes", ptNoWheel: "turbines testées sans roue", ptPieces: "pièces à suivre", ptDates: "dates prévisionnelles des turbines", ptRoues: "stock de roues équilibrées", ptInj: "stock d'injecteurs" }],
    ["Gestion — Turbines et Cash in", { turbines: "pool de turbines", cash: "encaissements à venir", cashCurve: "encaissements cumulés de l'année face à l'initial", cashMonth: "encaissements et factures du mois face à l'initial", cashLate: "factures et paiements en retard", encaisser: "factures émises en attente de paiement, saisie par le DAF", produit: "jalons cash liés à un livrable du Produit" }],
    ["Échanges — Commentaires", { mentions: "les mentions qui vous attendent" }],
  ];
  // v355 : widgets à tailles fixes (WidgetBoard). Tailles permises : chiffres = Petit / Moyen ; cadrans larges = Bandeau ; autres = Moyen, Grand, Bandeau.
  const sizesOf = id => (W[id] && W[id].sizes) || ((spans[id] || 4) >= 9 ? ["xl", "m"] : (spans[id] || 4) <= 3 ? ["s", "m", "xl"] : ["m", "s", "xl"]);
  const widgets = {}; Object.keys(W).forEach(id => { if (avail(id)) widgets[id] = { label: W[id].label, sizes: sizesOf(id), render: z => W[id].render(z) }; });
  const items = Array.isArray(L.widgets) ? L.widgets : widgetsFromSpans(ids, id => spans[id] || 4, sizesOf);
  const SMALL_DESC = { jour: "la date et le n° de semaine", nextDep: "compte à rebours du prochain départ", nProd: "machines en montage, tests ou packaging", nDep30: "départs des 30 prochains jours", nLate: "machines en retard sur le planning initial", nBanc: "machines au banc aujourd'hui", nShipped: "machines expédiées depuis mai" };
  // v358 : le catalogue dessine chaque widget pour savoir s'il a un contenu — il n'est construit qu'à l'ouverture de la galerie
  const gal = () => { const g = [["Chiffres et repères", Object.keys(SMALL_DESC).filter(id => widgets[id]).map(id => [id, SMALL_DESC[id]])]]; const placed = new Set(Object.keys(SMALL_DESC));
    THEMES.forEach(([n, m]) => { const list = Object.keys(m).filter(id => widgets[id] && W[id].render("m")).map(id => [id, m[id]]); list.forEach(([id]) => placed.add(id)); if (list.length) g.push([n, list]); });
    const rest = Object.keys(widgets).filter(id => !placed.has(id) && W[id].render("m")); if (rest.length) g.push(["Autres", rest.map(id => [id, ""])]);
    return g; };
  return (<>{leadSegs && renderLead ? renderLead(leadSegs) : null}
    <WidgetBoard items={items} widgets={widgets} catalog={gal} canEdit={!!onLayout} onChange={onLayout ? w => onLayout({ ...L, widgets: w }) : undefined}
      onReset={onLayout && Array.isArray(L.widgets) ? () => onLayout({ ...L, widgets: null }) : undefined} label="Widgets de l'accueil" /></>);
}
