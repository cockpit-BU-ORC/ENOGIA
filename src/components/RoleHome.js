import React, { useMemo } from "react";
import { Arrange } from "./Arrange";
import { T, FZ } from "../theme";
import { presenceKind, presenceDates, ETAT_META } from "../pjMeta";
import { NavIcon } from "./SharedUI";
import { planOf, catalogOf, activeSections, progressOf, effRange, isForced, testersOf, findConflicts } from "../testPlan";
import { turbineStatus } from "../turbines";
import { blockOn } from "../profiles";
import { getCashinDoc, cashOverview } from "../cashinLink";
import { useCashin } from "../useCashin";
import { fmtEur } from "../pjProgress";
import { makeModel, EMPTY_PROD } from "./ProdTurbines";
import { planWeeks } from "./KpiPilotage";

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
export const CAPA_SEMAINE = 175; // h atelier par semaine (même valeur que les KPI quand il n'y a pas de plan)

// Cadrans par défaut de chaque poste (id, largeur sur 12)
export const HOME_DEFAULTS = {
  cdp: [["pjs", 7], ["jalons", 5], ["todo", 4], ["fat", 4], ["avance", 4]],
  testeur: [["today", 8], ["sign", 4], ["week", 12], ["arrivees", 6], ["results", 6]],
  resptest: [["today", 8], ["sign", 4], ["week", 12], ["arrivees", 6], ["results", 6], ["postes", 6], ["tests", 6]], // v238
  atelier: [["charge", 7], ["arrdep", 5], ["montage", 7], ["postes", 5]],
  turbines: [["ptReady", 3], ["ptNoWheel", 3], ["ptPieces", 6], ["ptDates", 12], ["ptRoues", 6], ["ptInj", 6]],
  autre: [["kpis", 12], ["departs", 6], ["parcours", 6], ["benchWeek", 6], ["visites", 6], ["shipped", 6], ["etats", 6], ["fermetures", 6]],
  direction: [["kpis", 12], ["tests", 4], ["turbines", 4], ["cash", 4], ["alertes", 8], ["charge", 4], ["postes", 6], ["departs", 6], ["parcours", 12]],
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
  return ["Bonjour. ", { t: s(d.inProd, "machine", "machines"), c: "production" }, " " + (d.inProd > 1 ? "sont" : "est") + " en production et ", { t: d.next30 + " " + (d.next30 > 1 ? "partent" : "part"), c: "ok" }, " d'ici un mois."];
}

export function RoleHome({ role, profile, ui, kpiEl, depEl, parcoursEl, rows, open, late, mentions, myPjs, testsDoc, myTester, turbineDoc, prodDoc, plan, closurePeriods, owner, cash, onOpenPj, onGo, onOpenCash, layout, onLayout, hello, renderLead }) {
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
  const Stat = ({ label, value, tone, onClick }) => <button type="button" onClick={onClick} disabled={!onClick} style={{ border: "none", background: T.surface, borderRadius: 8, padding: "8px 10px", textAlign: "left", cursor: onClick ? "pointer" : "default", fontFamily: T.font, minWidth: 0 }}><div style={{ fontFamily: T.fontDisplay, fontSize: "clamp(18px,1.5vw,24px)", fontWeight: 600, lineHeight: 1.1, color: tone || T.ink900, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div><div style={{ ...grey, fontFamily: T.fontLabel }}>{label}</div></button>;
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 6, marginTop: 6 };
  const bar = (pct, color) => <div style={{ height: 6, borderRadius: 3, background: T.surfaceAlt, overflow: "hidden" }}><div className="enogia-bar-fill" style={{ width: Math.max(0, Math.min(100, pct)) + "%", height: 6, background: color }} /></div>;

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
    if (plan && plan.v === 2) { try { pw = planWeeks(plan, closurePeriods, null, 4, new Date(w0 + "T00:00:00")); } catch (e) { pw = null; } }
    if (pw) return pw.map(w => ({ a: iso(w.a), hours: w.hours, cap: Math.round(w.cap || CAPA_SEMAINE) }));
    return [0, 1, 2, 3].map(i => { const a = addD(w0, 7 * i), b = addD(a, 4); let h = 0;
      rows.forEach(r => { const s = dIso(r.arrivee), e = dIso(r.finProd) || dIso(r.depart), H = Number(r.heuresAtelier) || 0; if (!s || !e || !H || e < a || s > b) return; const tot = workDays(s, e) || 1, ov = workDays(s > a ? s : a, e < b ? e : b); h += H * ov / tot; });
      return { a, hours: Math.round(h), cap: CAPA_SEMAINE }; });
  }, [plan, closurePeriods, rows, w0]);
  // Production turbines
  const pt = useMemo(() => {
    if (!prodDoc) return null;
    const S2 = { ...EMPTY_PROD, ...prodDoc, params: { d: {}, l: {}, ...(prodDoc.params || {}) } };
    ["turbines", "arbres", "pieces", "roues", "injecteurs"].forEach(c => { S2[c] = Object.fromEntries(Object.entries(prodDoc[c] || {}).map(([k, v]) => [k, { ...v, id: k }])); });
    const M = makeModel(S2); const T0 = new Date(); T0.setHours(0, 0, 0, 0);
    const offDate = x => { const d = new Date(T0); let n = Math.max(0, Math.ceil(x - 1e-9) - 1); while (d.getDay() % 6 === 0) d.setDate(d.getDate() + 1); while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) n--; } return d; };
    const upcoming = M.live.filter(t => t.step !== "ok").map(t => ({ t, s: M.sch[t.id] || {} })).sort((p, q) => (p.s.end ?? 1e9) - (q.s.end ?? 1e9));
    const nx = upcoming.find(u => u.s.end != null && !u.s.noRoue);
    return { S: S2, M, upcoming, offDate, ready: M.live.filter(t => t.step === "ok"), noWheel: M.live.filter(t => t.step === "s1"), missing: upcoming.filter(u => u.s.missing).map(u => u.t),
      next: nx ? offDate(nx.s.end).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "numeric" }) : null };
  }, [prodDoc]);

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
  W.sign = { label: "Fiches à signer", span: 4, render: () => sec("sign", "Fiches à signer", S.finProd.ring, <>
    <Head title="Fiches à signer" sub="tests terminés" count={toSign.length} />
    {toSign.length === 0 ? empty("check", "Rien à signer", "Les fiches de test à signer apparaîtront ici.") : toSign.slice(0, 5).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r) || r.gamme || ""} right={progPill(prog(r))} />)}</>) };
  W.week = { label: allT ? "La semaine" : "Ma semaine", span: 12, render: () => { const days = DOW.map((l, i) => ({ l, d: addD(w0, i) }));
    return sec("week", allT ? "La semaine" : "Ma semaine", S.production.ring, <><Head title={allT ? "La semaine" : "Ma semaine"} sub={"du " + fmtD(days[0].d) + " au " + fmtD(days[4].d)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6, marginTop: 6 }}>
        {days.map(({ l, d }) => { const list = tView ? mineT.filter(r => { const e = effOf(r); return e.from <= d && e.to >= d; }) : []; return (
          <div key={d} style={{ background: d === today ? T.teal100 : T.surface, borderRadius: 8, padding: "6px 6px 8px", minWidth: 0 }}>
            <div style={{ fontSize: FZ.xs, fontWeight: 700, color: d === today ? T.teal600 : T.ink700 }}>{l} {d.slice(8, 10)}</div>
            {list.length === 0 ? <div style={{ ...grey, marginTop: 4 }}>—</div> : list.map(r => <button key={r.pj} type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} style={{ display: "block", width: "100%", marginTop: 4, border: "none", borderLeft: "3px solid " + S.tests.solid, background: T.card, borderRadius: "0 6px 6px 0", padding: "3px 6px", textAlign: "left", cursor: "pointer", fontFamily: T.fontMono, fontSize: 11, fontWeight: 700, color: T.ink900, minHeight: 24 }}>{r.pj}</button>)}
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
    return sec("charge", "Charge atelier", S.production.ring, <><Head title="Charge atelier" sub={"4 semaines · capacité " + (charge[0] ? charge[0].cap : CAPA_SEMAINE) + " h"} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120, marginTop: 8 }}>
        {charge.map(w => { const over = w.hours > w.cap; return (<div key={w.a} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end", position: "relative" }}>
          <span style={{ fontSize: FZ.xs, fontWeight: 700, color: over ? T.red500 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{w.hours} h</span>
          <div style={{ width: "100%", maxWidth: 52, height: 84, position: "relative" }}>
            <div title={"capacité " + w.cap + " h"} style={{ position: "absolute", left: -4, right: -4, bottom: Math.round(84 * w.cap / max), borderTop: "1.5px dashed " + T.ink500 }} />
            <div className="enogia-bar-fill" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: Math.max(3, Math.round(84 * w.hours / max)), background: over ? T.red500 : S.production.solid, borderRadius: "3px 3px 0 0" }} />
          </div>
          <span style={grey}>{fmtD(w.a)}</span>
        </div>); })}
      </div></>); } };
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
      {testsDoc ? <div style={grid}><Stat label="machines en test" value={soon.length} onClick={() => onGo("tests")} /><Stat label="sans testeur" value={noTester.length} tone={noTester.length ? T.red500 : undefined} onClick={() => onGo("tests")} /><Stat label="échecs" value={fails} tone={fails ? T.red500 : undefined} /><Stat label="en retard" value={lateT} tone={lateT ? T.amber600 : undefined} /><Stat label="conflits" value={conflicts} tone={conflicts ? T.amber600 : undefined} /></div> : <div style={grey}>Page Tests non disponible.</div>}</>); } };
  // v267 : l'ancien pool (planning/turbines) n'est plus la référence : les turbines viennent de la production (cadrans « pt »)
  W.turbines = { label: "Turbines (pool)", span: 4, render: () => null, renderOld: () => { const turb = (turbineDoc && turbineDoc.turbines) || []; const tst = turb.map(t => turbineStatus(t, today));
    const nCrit = tst.filter(x => x === "Critique").length, nLateT = tst.filter(x => x === "En retard").length;
    return sec("turbines", "Turbines", H.brand, <><Head title="Turbines" count={turb.length} />
      <div style={grid}><Stat label="critiques" value={nCrit} tone={nCrit ? T.red500 : undefined} /><Stat label="en retard" value={nLateT} tone={nLateT ? T.amber600 : undefined} /></div></>); } };
  W.cash = { label: "Cash in", span: 4, only: () => !!cash, render: () => { const c = cashOverview(getCashinDoc(), today); return sec("cash", "Cash in", S.finProd.ring, <>
    <Head title="Cash in" sub={c ? "hors EPC" : ""} />
    {!c ? <div style={{ ...grey, margin: "4px 0 6px" }}>Données du Cash in pas encore chargées : ouvrez une fois l'onglet Cash in, ou importez le fichier.</div> : <>
      <div style={{ ...grid, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}><Stat label="encaissé" value={fmtEur(c.paid)} /><Stat label="facturé, en attente" value={fmtEur(c.invoiced)} /><Stat label="en retard de paiement" value={fmtEur(c.late)} tone={c.late ? T.red500 : undefined} /><Stat label="à facturer" value={fmtEur(c.toBill)} tone={c.toBill ? T.amber600 : undefined} /><Stat label="attendu sous 30 j" value={fmtEur(c.next30)} /></div>
    </>}
    {onOpenCash && more("Ouvrir le Cash in", onOpenCash)}</>); } };
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
        {p.statut === "appro" && <span style={{ color: T.red500, fontSize: FZ.xs, fontWeight: 700 }}>livraison {fmtD(p.dateLiv)}</span>}</div>)}
      {ptOpen()}</>); } };
  W.ptDates = { label: "Dates prévisionnelles des turbines", span: 12, only: ptOnly, render: () => { const L = pt.upcoming.slice(0, 6); const Hd = Math.min(120, Math.ceil(Math.max(10, ...L.map(u => u.s.end ?? 0))) + 2); const pct = x => Math.max(0, Math.min(100, x / Hd * 100));
    const col = ph => ({ carter: S.production.solid, assy: S.finProd.solid, tests: S.tests.solid })[ph] || T.ink300;
    return sec("ptDates", "Dates prévisionnelles des turbines", S.production.ring, <><Head title="Dates prévisionnelles" sub="prochaines turbines, jours ouvrés" count={pt.upcoming.length} />
      {L.length === 0 ? empty("inbox", "Aucune turbine en cours", "") : L.map(({ t, s }, i) => <div key={t.id} style={{ display: "flex", gap: 10, minHeight: 32, alignItems: "center", borderTop: i ? "1px solid " + T.line : "none", fontSize: FZ.sm }}>
        <b style={{ fontFamily: T.fontMono, width: 64, flex: "none" }}>{t.num}</b>
        <div style={{ flex: 1, position: "relative", height: 10, background: T.surface, borderRadius: 3 }}>{(s.segs || []).map((g, j) => <i key={j} style={{ position: "absolute", top: 0, bottom: 0, left: pct(g.from) + "%", width: (g.to === null ? 100 - pct(g.from) : pct(g.to) - pct(g.from)) + "%", borderRadius: 2, background: g.ph === "wait" ? "repeating-linear-gradient(135deg," + A.orange.ring + " 0 3px,transparent 3px 7px)" : g.ph === "missing" ? "repeating-linear-gradient(135deg," + A.red.ring + " 0 3px,transparent 3px 7px)" : col(g.ph) }} />)}</div>
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
          <span style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{m.n}</span>
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
        <button key={v} type="button" onClick={() => onGo && onGo(v)} style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 36, border: "1px solid " + T.line, background: T.card, borderRadius: 6, padding: "0 10px", cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: 600, color: T.ink900 }}><NavIcon name={ic} size={16} />{l}</button>)}
    </div></>) };

  /* ── disposition du poste ── */
  const avail = id => W[id] && (!W[id].only || W[id].only());
  const L = layout || {}, extra = Array.isArray(L.extra) ? L.extra : [], hidden = Array.isArray(L.hidden) ? L.hidden : [];
  const defs = HOME_DEFAULTS[role] || HOME_DEFAULTS.autre;
  const ids = [...defs.map(x => x[0]).filter(id => on(id)), ...extra].filter((id, i, a) => a.indexOf(id) === i && !hidden.includes(id) && avail(id));
  const spans = Object.fromEntries([...defs, ...Object.entries(W).map(([k, w]) => [k, w.span])].reverse().map(([k, s]) => [k, s]));
  const items = ids.map(id => { const el = W[id].render(); return el ? React.cloneElement(el, { key: id, "aria-label": el.props["aria-label"] || W[id].label }) : null; }).filter(Boolean);
  // v231 (demandé : « Ajouter un cadran n'est pas clair : des thèmes ou des liens avec les onglets ») : chaque cadran est rangé sous
  // la page du site d'où viennent ses données, avec une phrase qui dit ce qu'il montre.
  const THEMES = [
    ["Vue d'ensemble — Liste et Gantt", { kpis: "les grands chiffres du portefeuille", departs: "les 5 prochains départs", parcours: "combien de machines à chaque étape", alertes: "les dérives fortes et les retards à déclarer", etats: "nombre de machines dans chaque état", depMois: "départs prévus sur les 6 prochains mois", shipped: "les dernières machines parties", raccourcis: "boutons vers les pages du site" }],
    ["Projets — Fiches projet", { pjs: "les PJ d'un chef de projet, triés par départ", jalons: "arrivées, tests et départs des 3 semaines", todo: "retards à déclarer et mentions", fat: "FAT client et NOBO à venir (mes PJ)", visites: "visites client et NOBO à venir, toutes machines", avance: "avancement moyen et PJ en avance / en retard" }],
    ["Tests — page Tests", { tests: "machines au banc et tests des 3 semaines", today: "machines au banc aujourd'hui (jour N / M)", sign: "fiches de test à signer", week: "la semaine de tests d'un testeur", arrivees: "machines qui arrivent au banc", results: "réussis et échecs des 14 derniers jours", postes: "occupation des postes de test", benchWeek: "toutes les machines au banc cette semaine" }],
    ["Atelier — Planificateur et Calendrier", { charge: "heures atelier sur 4 semaines face à la capacité", arrdep: "arrivées et départs de la semaine", montage: "machines en montage méca / élec", fermetures: "fermetures de l’atelier à venir" }],
    ["Production turbines", { ptReady: "turbines prêtes", ptNoWheel: "turbines testées sans roue", ptPieces: "pièces à suivre", ptDates: "dates prévisionnelles des turbines", ptRoues: "stock de roues équilibrées", ptInj: "stock d'injecteurs" }],
    ["Gestion — Turbines et Cash in", { turbines: "pool de turbines", cash: "encaissements à venir" }],
    ["Échanges — Commentaires", { mentions: "les mentions qui vous attendent" }],
  ];
  const addable = []; const placed = new Set();
  THEMES.forEach(([g, m]) => Object.keys(m).forEach(id => { if (W[id] && !ids.includes(id) && avail(id) && W[id].render()) { addable.push([id, W[id].label, g, m[id]]); placed.add(id); } }));
  Object.keys(W).filter(id => !placed.has(id) && !ids.includes(id) && avail(id) && W[id].render()).forEach(id => addable.push([id, W[id].label, "Autres", ""]));
  const setL = patch => onLayout && onLayout({ ...L, ...patch });
  return (<>{leadSegs && renderLead ? renderLead(leadSegs) : null}<Arrange id={"home-" + role} defaultSpan={4} spans={spans} labels={Object.fromEntries(Object.entries(W).map(([k, w]) => [k, w.label]))}
    layout={L} onLayout={onLayout ? v => onLayout(v) : undefined}
    catalog={onLayout ? addable : null} onAdd={id => setL({ extra: [...extra.filter(x => x !== id), id], hidden: hidden.filter(x => x !== id) })}
    onRemove={id => setL({ extra: extra.filter(x => x !== id), hidden: defs.some(d => d[0] === id) ? [...hidden.filter(x => x !== id), id] : hidden })}>
    {items}
  </Arrange></>);
}
