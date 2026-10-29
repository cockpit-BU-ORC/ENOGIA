import React, { useMemo } from "react";
import { Arrange } from "./Arrange";
import { T, FZ } from "../theme";
import { presenceKind, presenceDates } from "../pjMeta";
import { NavIcon } from "./SharedUI";
import { planOf, catalogOf, activeSections, progressOf, effRange, isForced, testersOf, findConflicts } from "../testPlan";
import { turbineStatus, pendingShare } from "../turbines";
import { blockOn } from "../profiles";
import { getCashinDoc, cashOverview } from "../cashinLink";
import { useCashin } from "../useCashin";
import { fmtEur } from "../pjProgress";

// v188 — Accueils par rôle (choix validés par Gabriel) : les blocs propres au rôle, sous les repères communs de l'accueil.
//  · Testeur : mes tests du jour, fiches à signer, ma semaine, mes remarques ;
//  · Chef de projet : mes PJ et retards, jalons des 3 semaines, FAT client à venir, mentions ;
//  · Direction : ordo, tests, turbines, cash in, alertes, charge atelier ;
//  · Chef d'atelier : arrivées et départs, postes de test.
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const dIso = x => { if (!x) return ""; const d = new Date(x); return isNaN(d) ? "" : iso(d); };
const fmtD = s => { if (!s) return "—"; const d = new Date(String(s).slice(0, 10) + "T12:00:00"); return isNaN(d) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", ""); };
const addD = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const monday = s => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

export function RoleHome({ role, profile, ui, lead, tail, rows, open, late, mentions, myPjs, testsDoc, myTester, turbineDoc, owner, cash, onOpenPj, onGo, onOpenCash }) {
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
  const mentionsBlock = (title, flex) => (
    <section aria-label={title} style={{ ...cardS(H.note), flex }}>
      <Head title={title} sub="les @mentions qui vous attendent" count={mentions.length} />
      {mentions.length === 0 ? empty("check", "Personne ne vous attend", "Les messages où l'on vous cite apparaîtront ici.") :
        mentions.slice(0, 5).map(({ pj, idx, c }, i) => <Row key={pj + idx} first={i === 0} pj={pj} pill={<Pill tone={A.note}>Mention</Pill>} main={(c.author || "Quelqu'un") + " : « " + String(c.text || "").replace(/\s+/g, " ") + " »"} right={fmtD(c.date)} />)}
      {more("Ouvrir les commentaires", () => onGo && onGo("comments"))}
    </section>);

  // ── Testeur ──
  const mineT = useMemo(() => (!myTester || !testsDoc ? [] : open.filter(r => r.tests && planOf(testsDoc, r.pj).assign.some(a => a.tid === myTester.id))), [open, myTester, testsDoc]);
  const Stat = ({ label, value, tone, onClick }) => <button type="button" onClick={onClick} disabled={!onClick} style={{ border: "none", background: T.surface, borderRadius: 8, padding: "8px 10px", textAlign: "left", cursor: onClick ? "pointer" : "default", fontFamily: T.font, minWidth: 0 }}><div style={{ fontFamily: T.fontDisplay, fontSize: "clamp(18px,1.5vw,24px)", fontWeight: 600, lineHeight: 1.1, color: tone || T.ink900, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div><div style={{ ...grey, fontFamily: T.fontLabel }}>{label}</div></button>;
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 6, marginTop: 6 };
  // v210 : Cash in sur l'accueil du propriétaire et des admins (direction et chefs de projet)
  const cashBlock = flex => { const c = cashOverview(getCashinDoc(), today); return (<section aria-label="Cash in" style={{ ...cardS(S.finProd.ring), flex }}>
        <Head title="Cash in" sub={c ? "hors EPC" : ""} />
        {!c ? <div style={{ ...grey, margin: "4px 0 6px" }}>Données du Cash in pas encore chargées : ouvrez une fois l'onglet Cash in, ou importez le fichier.</div> : <>
          <div style={{ ...grid, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}><Stat label="encaissé" value={fmtEur(c.paid)} /><Stat label="facturé, en attente" value={fmtEur(c.invoiced)} /><Stat label="en retard de paiement" value={fmtEur(c.late)} tone={c.late ? T.red500 : undefined} /><Stat label="à facturer" value={fmtEur(c.toBill)} tone={c.toBill ? T.amber600 : undefined} /><Stat label="attendu sous 30 j" value={fmtEur(c.next30)} /></div>
          {c.lateRows.slice(0, 3).map((x, i) => <div key={i} style={{ display: "flex", gap: 8, fontSize: FZ.xs, color: T.ink700, padding: "4px 2px", borderTop: i ? "1px solid " + T.line : "none", marginTop: i ? 0 : 8 }}><b style={{ fontFamily: T.fontMono }}>{x.pj || "—"}</b><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.label}</span><span style={{ color: T.red500, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtEur(x.montant)} · {x.days} j</span></div>)}
        </>}
        {onOpenCash && more("Ouvrir le Cash in", onOpenCash)}
      </section>); };
  if (role === "testeur") {
    const effOf = r => { const a = planOf(testsDoc, r.pj).assign.find(x => x.tid === myTester.id); return effRange(a, r); };
    const todayT = mineT.filter(r => { const e = effOf(r); return e.from <= today && e.to >= today; });
    const toSign = mineT.filter(r => { const q = prog(r), p = planOf(testsDoc, r.pj); return !(p.signs || {})["t:" + myTester.id] && (tEnd(r) < today || (q.total > 0 && q.done === q.total)); }); // v189 : pas encore signée par moi
    const w0 = monday(today), days = DOW.map((l, i) => ({ l, d: addD(w0, i) }));
    if (!myTester) return <section style={{ ...cardS(S.tests.ring), marginBottom: 12 }}>{empty("check", "Vous n'êtes pas dans la liste des testeurs", "Un administrateur vous ajoute depuis la page Tests.")}</section>;
    return (<Arrange id={"home-" + role} defaultSpan={4}>
      {lead}
      {on("today") && <section aria-label="Mes tests du jour" className="enogia-home-wide" style={{ ...cardS(S.tests.ring), flex: "3 1 420px" }}>
        <Head title="Mes tests du jour" sub={fmtD(today)} count={todayT.length} />
        {todayT.length === 0 ? empty("check", "Pas de test aujourd'hui", "Vos prochaines machines sont dans « Ma semaine ».") :
          todayT.map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} pill={<Pill tone={S.tests}>{r.gamme || "Test"}</Pill>} main={nomOf(r) || "Tests"} presence={presenceOf(r)} right={progPill(prog(r))} />)}
        {more("Renseigner mes tests", () => onGo && onGo("tests"))}
      </section>}
      {on("sign") && <section aria-label="Fiches à signer" style={{ ...cardS(S.finProd.ring), flex: "2 1 280px" }}>
        <Head title="Fiches à signer" sub="période terminée ou tous les tests faits" count={toSign.length} />
        {toSign.length === 0 ? empty("check", "Rien à signer", "Les fiches de test à signer apparaîtront ici.") :
          toSign.slice(0, 5).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r) || r.gamme || ""} right={progPill(prog(r))} />)}
      </section>}
      {on("week") && <section aria-label="Ma semaine" className="enogia-home-wide" style={{ ...cardS(S.production.ring), flex: "3 1 420px" }}>
        <Head title="Ma semaine" sub={"du " + fmtD(days[0].d) + " au " + fmtD(days[4].d)} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6, marginTop: 6 }}>
          {days.map(({ l, d }) => { const list = mineT.filter(r => { const e = effOf(r); return e.from <= d && e.to >= d; }); return (
            <div key={d} style={{ background: d === today ? T.teal100 : T.surface, borderRadius: 8, padding: "6px 6px 8px", minWidth: 0 }}>
              <div style={{ fontSize: FZ.xs, fontWeight: 700, color: d === today ? T.teal600 : T.ink700 }}>{l} {d.slice(8, 10)}</div>
              {list.length === 0 ? <div style={{ ...grey, marginTop: 4 }}>—</div> : list.map(r => <button key={r.pj} type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} style={{ display: "block", width: "100%", marginTop: 4, border: "none", borderLeft: "3px solid " + S.tests.solid, background: T.card, borderRadius: "0 6px 6px 0", padding: "3px 6px", textAlign: "left", cursor: "pointer", fontFamily: T.fontMono, fontSize: 11, fontWeight: 700, color: T.ink900, minHeight: 24 }}>{r.pj}</button>)}
            </div>); })}
        </div>
      </section>}
      {on("notes") && mentionsBlock("Mes remarques", "2 1 280px")}
      {tail}
    </Arrange>);
  }

  // ── Chef de projet ──
  if (role === "cdp") {
    const mine = open.filter(r => myPjs.includes(r.pj)).sort((a, b) => (b.drift || 0) - (a.drift || 0));
    const end21 = addD(today, 21);
    const jalons = [];
    mine.forEach(r => [["arrivee", "Arrivée"], ["tests", "Tests"], ["finProd", "Fin prod"], ["depart", "Départ"]].forEach(([k, l]) => { const d = dIso(r[k]); if (d && d >= today && d <= end21) jalons.push({ r, l, d }); }));
    jalons.sort((a, b) => a.d.localeCompare(b.d));
    const fats = [];
    mine.forEach(r => { const pd = presenceDates(r.clientPresence); [["client", "FAT client"], ["nobo", "FAT NOBO"]].forEach(([k, l]) => { const d = dIso(pd[k]) || (pd[k] === "" ? "" : null); if (pd[k] !== undefined && (!d || d >= today)) fats.push({ r, l, d }); }); });
    fats.sort((a, b) => (a.d || "9").localeCompare(b.d || "9"));
    return (<Arrange id={"home-" + role} defaultSpan={4}>
      {lead}
      {on("pjs") && <section aria-label="Mes PJ et retards" className="enogia-home-wide" style={{ ...cardS(S.production.ring), flex: "3 1 420px" }}>
        <Head title="Mes PJ et retards" sub={mine.filter(r => r.drift > 0).length + " en retard sur l'initial"} count={mine.length} />
        {mine.length === 0 ? empty("inbox", "Aucun PJ associé", "Les PJ vous sont associés dans Manager › Réglages › Personnes et rôles.") :
          mine.slice(0, 8).map((r, i) => <Row key={r.pj} first={i === 0} pj={r.pj} pill={r.drift > 0 ? <Pill tone={r.drift > 10 ? A.red : A.orange}>+{r.drift} j</Pill> : <Pill tone={S.finProd}>À l'heure</Pill>} main={nomOf(r)} presence={presenceOf(r)} right={"départ " + fmtD(r.depart)} />)}
        {mine.length > 8 && more("Voir les " + mine.length + " PJ dans la liste", () => onGo && onGo("table"))}
      </section>}
      {on("jalons") && <section aria-label="Jalons des 3 semaines" style={{ ...cardS(S.tests.ring), flex: "2 1 300px" }}>
        <Head title="Jalons des 3 semaines" count={jalons.length} />
        {jalons.length === 0 ? empty("check", "Aucun jalon d'ici 3 semaines", "") :
          jalons.slice(0, 8).map((j, i) => <Row key={j.r.pj + j.l} first={i === 0} pj={j.r.pj} pill={<Pill tone={j.l === "Départ" ? S.depart : j.l === "Tests" ? S.tests : j.l === "Arrivée" ? S.arrivee : S.finProd}>{j.l}</Pill>} main={nomOf(j.r)} right={fmtD(j.d)} />)}
      </section>}
      {on("fat") && <section aria-label="FAT client à venir" style={{ ...cardS(S.arrivee.ring), flex: "2 1 300px" }}>
        <Head title="FAT client à venir" count={fats.length} />
        {fats.length === 0 ? empty("check", "Aucune FAT client ou NOBO prévue", "") :
          fats.slice(0, 6).map((f, i) => <Row key={f.r.pj + f.l} first={i === 0} pj={f.r.pj} pill={<Pill tone={S.arrivee}>{f.l}</Pill>} main={nomOf(f.r)} right={f.d ? fmtD(f.d) : "date à fixer"} />)}
      </section>}
      {cash && on("cash") && cashBlock("2 1 360px")}
      {on("mentions") && mentionsBlock("Mentions", "2 1 300px")}
      {tail}
    </Arrange>);
  }

  // ── Chef d'atelier ──
  const weekEnd = addD(monday(today), 6);
  const arrDep = open.flatMap(r => [["arrivee", "Arrivée", S.arrivee], ["depart", "Départ", S.depart]].map(([k, l, tone]) => ({ r, l, tone, d: dIso(r[k]) })).filter(x => x.d && x.d >= today && x.d <= weekEnd)).sort((a, b) => a.d.localeCompare(b.d));
  const testers = testsDoc ? testersOf(testsDoc) : [];
  const nowTest = open.filter(r => inTest(r, today));
  const postes = (title, flex) => (
    <section aria-label={title} style={{ ...cardS(S.tests.ring), flex }}>
      <Head title={title} sub="machines en test aujourd'hui" count={nowTest.length} />
      {nowTest.length === 0 ? empty("check", "Aucun poste de test occupé", "") :
        nowTest.map((r, i) => { const names = testsDoc ? planOf(testsDoc, r.pj).assign.map(a => (testers.find(t => t.id === a.tid) || {}).name).filter(Boolean) : []; return (
          <Row key={r.pj} first={i === 0} pj={r.pj} pill={<Pill tone={names.length ? S.tests : A.orange}>{names.length ? names.map(n => n.split(" ")[0]).join(", ") : "Sans testeur"}</Pill>} main={nomOf(r) || r.gamme || ""} presence={presenceOf(r)} right={testsDoc ? progPill(prog(r)) : fmtD(r.testsFin)} />); })}
      {testsDoc && more("Ouvrir les tests", () => onGo && onGo("tests"))}
    </section>);
  if (role === "atelier") return (<Arrange id={"home-" + role} defaultSpan={4}>
      {lead}
    {on("arrdep") && <section aria-label="Arrivées et départs" className="enogia-home-wide" style={{ ...cardS(S.depart.ring), flex: "3 1 420px" }}>
      <Head title="Arrivées et départs" sub="aujourd'hui et cette semaine" count={arrDep.length} />
      {arrDep.length === 0 ? empty("check", "Ni arrivée ni départ cette semaine", "") :
        arrDep.map((x, i) => <Row key={x.r.pj + x.l} first={i === 0} pj={x.r.pj} pill={<Pill tone={x.tone}>{x.l}</Pill>} main={nomOf(x.r) || x.r.gamme || ""} presence={presenceOf(x.r)} right={x.d === today ? "aujourd'hui" : fmtD(x.d)} rightColor={x.d === today ? T.teal600 : undefined} />)}
      {more("Ouvrir le calendrier", () => onGo && onGo("calendar"))}
    </section>}
    {on("postes") && postes("Postes de test", "2 1 320px")}
    {tail}
    </Arrange>);

  // ── Direction ──
  if (role === "direction") {
    const w0 = monday(today), w3 = addD(w0, 20);
    const soon = testsDoc ? open.filter(r => r.tests && tEnd(r) >= w0 && tStart(r) <= w3) : [];
    const noTester = soon.filter(r => planOf(testsDoc, r.pj).assign.length === 0);
    const fails = testsDoc ? open.reduce((n, r) => n + (r.tests ? prog(r).ko : 0), 0) : 0;
    const lateT = testsDoc ? open.filter(r => r.tests && tEnd(r) < w0 && !isForced(planOf(testsDoc, r.pj)) && (q => q.total > q.done)(prog(r))).length : 0;
    const conflicts = testsDoc ? findConflicts(testsDoc, open).length : 0;
    const turb = (turbineDoc && turbineDoc.turbines) || [];
    const tst = turb.map(t => turbineStatus(t, today));
    const nCrit = tst.filter(x => x === "Critique").length, nLateT = tst.filter(x => x === "En retard").length, nShare = pendingShare(turb).length;
    const bigLate = late.filter(r => r.drift > 10);
    const weeks = [0, 1, 2, 3].map(i => { const a = addD(w0, 7 * i), b = addD(a, 6); const n = open.filter(r => { const s = dIso(r.arrivee) || dIso(r.tests), e = dIso(r.finProd) || dIso(r.depart) || dIso(r.testsFin); return s && e && s <= b && e >= a; }).length; return { a, n }; });
    const maxW = Math.max(1, ...weeks.map(w => w.n));
    const alerts = [
      ...bigLate.slice(0, 4).map(r => ({ id: "d" + r.pj, pj: r.pj, pill: <Pill tone={A.orange}>Dérive</Pill>, main: nomOf(r) || "Départ " + fmtD(r.depart), right: "+" + r.drift + " j" })),
      ...noTester.slice(0, 3).map(r => ({ id: "t" + r.pj, pj: r.pj, pill: <Pill tone={S.tests}>Sans testeur</Pill>, main: nomOf(r) || r.gamme || "", right: fmtD(r.tests) })),
    ];
    return (<Arrange id={"home-" + role} defaultSpan={4}>
      {lead}
      {on("tests") && <section aria-label="Tests" style={{ ...cardS(S.tests.ring), flex: "1 1 300px" }}>
        <Head title="Tests" sub="3 prochaines semaines" />
        {testsDoc ? <div style={grid}><Stat label="machines en test" value={soon.length} onClick={() => onGo("tests")} /><Stat label="sans testeur" value={noTester.length} tone={noTester.length ? T.red500 : undefined} onClick={() => onGo("tests")} /><Stat label="échecs" value={fails} tone={fails ? T.red500 : undefined} /><Stat label="en retard" value={lateT} tone={lateT ? T.amber600 : undefined} /><Stat label="conflits" value={conflicts} tone={conflicts ? T.amber600 : undefined} /></div> : <div style={grey}>Page Tests non disponible.</div>}
      </section>}
      {on("turbines") && <section aria-label="Turbines" style={{ ...cardS(H.brand), flex: "1 1 260px" }}>
        <Head title="Turbines" count={turb.length} />
        <div style={grid}><Stat label="critiques" value={nCrit} tone={nCrit ? T.red500 : undefined} /><Stat label="en retard" value={nLateT} tone={nLateT ? T.amber600 : undefined} /><Stat label="à communiquer" value={nShare} /></div>
      </section>}
      {cash && on("cash") && cashBlock("2 1 360px")}
      {on("alertes") && <section aria-label="Alertes" className="enogia-home-wide" style={{ ...cardS(A.orange.ring), flex: "3 1 420px" }}>
        <Head title="Alertes" sub="dérives > 10 j, tests sans testeur" count={bigLate.length + noTester.length} />
        {alerts.length === 0 ? empty("check", "Aucune alerte", "Pas de grosse dérive ni de test sans testeur.") : alerts.map((a, i) => <Row key={a.id} first={i === 0} pj={a.pj} pill={a.pill} main={a.main} right={a.right} />)}
      </section>}
      {on("charge") && <section aria-label="Charge atelier" style={{ ...cardS(S.production.ring), flex: "2 1 300px" }}>
        <Head title="Charge atelier" sub="machines présentes par semaine" />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110, marginTop: 8 }}>
          {weeks.map(w => <div key={w.a} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{w.n}</span>
            <div className="enogia-bar-fill" style={{ width: "100%", maxWidth: 46, height: Math.max(4, Math.round(70 * w.n / maxW)), background: S.production.solid, borderRadius: "4px 4px 0 0" }} />
            <span style={grey}>{fmtD(w.a)}</span>
          </div>)}
        </div>
      </section>}
      {on("postes") && postes("Postes de test", "2 1 320px")}
      {tail}
    </Arrange>);
  }
  return null;
}
