// v154 — Page « Tests » (rail de gauche, réservée aux administrateurs et aux testeurs de la liste) :
// fiches de test par machine (modèle OP022-DP001-A), affectation des testeurs aux périodes de tests, frise des testeurs.
// Les dates de venue du client / de NOBO se règlent dans la Liste : ici elles sont en lecture seule.
// Les données vivent dans planning/tests (un seul document).
import { PlanSwitch } from "./PlanSwitch";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { T, FZF as FZ, stageSoft, inkOn, btn as themeBtn } from "../theme";
import { getPjMeta, PRESENCE_META, PresenceChip, presenceKind, presenceDates, presenceFirstDate, Avatar, personTint } from "../pjMeta";
import { fmt, toLocalISO } from "../parsers";
import { useMentions } from "../mentionContext";
import { CARD, H_SUB } from "./ManagerParts";
import { CertifChip } from "./FicheContrat";
import { NavIcon, PjPlate, pressable, tableTh, Segmented } from "./SharedUI";
import { BENCHES, benchOf, nextByBench, packRows, byMonth } from "../benchModel";
import { SECTIONS, DEFAULT_TEST_CATALOG, catalogOf, testersOf, planOf, activeSections, selectedIds, toggleTest, setExtra, setNote, assignTester, unassignTester, setAssignDates, effRange, findConflicts, assignmentsOf, dropTester, dropTestFromPlans, newId, packLanes, addDaysIso, mondayOf, testerOfEmail, doneIds, progressOf, TEST_STATUS, statusOf, statusByOf, setStatus, isForced, setForced } from "../testPlan";
import { buildIcs, downloadIcs } from "../ics";
import { usePointerDnD } from "../pointerDrag";
import { DebugChecklistStep } from "./DebugChecklist";
import { StepRail, StepHead, BookStep, TestsChecklistStep, SignPad } from "./TestFiche";
import { vibRows, vibProgress, speedProgress } from "../testFiche";
import { manualProgress, bookStepsOf } from "../manualImport";
import { debugSections, debugProgress } from "../debugChecklist";
import { ChecklistsView } from "./ChecklistsView";
import { nameFromEmail } from "../mentions";
import { gcalUrl } from "../gcal";
import { openTestReport } from "../testReport";
import { makeCalendar } from "../planner/engine";
import { WidgetArrange } from "./WidgetBoard"; // v357 : cadrans en widgets
import { smooth } from "../scrollMode";

const field = () => ({ padding: "5px 9px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, minWidth: 0 });
// v291 (lot H) : branché sur le bouton commun (theme.js) — principal encre, secondaire bordé, désactivé gris
const btn = (on = true, kind) => ({ ...themeBtn(kind === "ghost" ? "sec" : "pri", "sm"), flexShrink: 0, ...(on || kind === "ghost" ? {} : { background: T.ink100, borderColor: T.ink100, color: T.ink500, cursor: "default" }) });
// mêmes couleurs que les pastilles de présence client / NOBO (lisibles en clair comme en sombre)
const SEC_COLOR = { interne: () => T.teal600, client: () => PRESENCE_META.client.ink, nobo: () => PRESENCE_META.nobo.ink };
const SEC_BORDER = { interne: () => T.teal500, client: () => PRESENCE_META.client.color, nobo: () => PRESENCE_META.nobo.color };
const SEC_WHEN = { interne: "Toujours réalisé en atelier", client: "Quand le client est présent", nobo: "Quand NOBO est présent" };
const dIso = x => { if (!x) return ""; const d = new Date(x); return isNaN(d) ? "" : toLocalISO(d); };
const fd = iso => iso ? fmt(new Date(iso + "T12:00:00")) : "—";
const fdm = iso => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "";
const period = r => r.tests ? fd(dIso(r.tests)) + (r.testsFin ? " → " + fd(dIso(r.testsFin)) : "") : "Période non définie";
const Cap = ({ children, style }) => <div style={{fontFamily:T.fontLabel,fontSize:12,fontWeight:500,color:T.ink500,...style}}>{children}</div>; // v188 : étiquettes en IBM Plex Sans

function TesterChip({ t, warn, on, onClick, disabled, small }) {
  const interactive = !!onClick;
  return (<span role={interactive ? "button" : undefined} aria-pressed={interactive ? !!on : undefined} tabIndex={interactive && !disabled ? 0 : undefined}
    onClick={interactive && !disabled ? onClick : undefined} onKeyDown={interactive && !disabled ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }) : undefined}
    title={warn ? "Déjà affecté sur un autre PJ à la même période" : t.email || t.name}
    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: on ? T.teal100 : T.card, border: "1.5px solid " + (warn ? T.amber500 : on ? T.teal500 : T.line), borderRadius: 999, padding: small ? "1px 9px 1px 3px" : "3px 12px 3px 4px", fontSize: FZ.xs, fontWeight: 500, color: warn ? T.amber600 : on ? T.teal600 : T.ink700, cursor: interactive && !disabled ? "pointer" : "default", opacity: disabled && interactive && !on ? .6 : 1, userSelect: "none" }}>
    <Avatar name={t.name} tint={personTint(t.name)[0]} size={small ? 18 : 22} />{t.name}{on && interactive ? " ✓" : ""}{warn ? " ⚠" : ""}
  </span>);
}

export function TestsTab({ doc, save, data, certifs, canEdit, lead, me, signApi, sub: subP, onSub, allowSubs, focusPj, book, bookApi, askPjs, myName, benches }) {
  const [sub0, setSub0] = useState("semaine"); // v186 : vue par semaine par défaut (maquette validée)
  const sub = subP || sub0, setSub = onSub || setSub0; // v307 : sous-page choisie aussi depuis le menu (App)
  const [focus, setFocus] = useState(null);
  const [msg, setMsg] = useState(null);
  const testers = testersOf(doc), catalog = catalogOf(doc);
  const myTester = testerOfEmail(doc, me);
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE"), [data]);
  const conflicts = useMemo(() => findConflicts(doc, rows), [doc, rows]);
  const who = (myTester && myTester.name) || myName || nameFromEmail(me || "");
  const commit = async next => { if (!canEdit && !myTester && !lead && !(askPjs && askPjs.size)) return false; /* v337 (D12) : un chef de projet écrit les demandes du client de ses PJ */ const ok = await save({ ...doc, ...next }); setMsg(ok === false ? "L'enregistrement a échoué." : null); return ok; };
  const SUBS = [["semaine", "Par semaine"], ["testers", "Par testeur"], ...(canEdit ? [["catalog", "Catalogue"], ["checklists", "Checklists"]] : [])].filter(([id]) => !allowSubs || allowSubs.includes(id)); // v308 : sous-pages permises par la page Accès // v280 : modèle de la checklist de debug (import, ajout, modification)
  const openPj = pj => { setFocus({ pj, n: Date.now() }); setSub("semaine"); };
  // v310 : ouverture depuis la fiche d'un PJ (App : { pj, n }) → Par semaine, fiche de tests du PJ ouverte.
  useEffect(() => { if (focusPj && focusPj.pj) setFocus(focusPj); }, [focusPj]);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div>
        <div style={H_SUB}>{canEdit ? "Qui teste quelle machine, quand, et quels tests faire en interne, avec le client et avec NOBO." : lead ? "Les machines en test de tous les testeurs : suivez et renseignez l'avancement de chaque test." : "Vos machines en test : indiquez l'avancement et le résultat de chaque test."}</div>
      </div>
      <PlanSwitch label="Vue des tests" value={sub} onGo={setSub} views={SUBS.map(([id, l]) => ({ id, l }))} tools={[]} />
    </div>
    {msg && <div role="alert" style={{ color: T.red500, fontSize: FZ.sm, fontWeight: 600 }}>{msg}</div>}
    {conflicts.length > 0 && sub !== "catalog" && <div role="status" style={{ background: T.amber100, color: T.amber600, borderRadius: 12, padding: "8px 12px", fontSize: FZ.sm, fontWeight: 600 }}>
      <span style={{ display: "inline-flex", verticalAlign: "-3px", marginRight: 6 }}><NavIcon name="warning" size={16} /></span>{conflicts.length} chevauchement{conflicts.length > 1 ? "s" : ""} : {conflicts.slice(0, 4).map(c => { const t = testers.find(x => x.id === c.tid); return (t ? t.name : "Testeur") + " sur " + c.a.pj + " et " + c.b.pj; }).join(" · ")}{conflicts.length > 4 ? " …" : ""}
    </div>}
    {sub === "semaine" && <WeekBoard {...{ doc, rows, testers, catalog, conflicts, commit, certifs, canEdit, lead, myTester, focus, who, signApi, book, bookApi, askPjs, benches }} />}
    {sub === "testers" && <TesterTimeline {...{ doc, rows, testers, catalog, conflicts, commit, canEdit, myTester, openPj, who }} />}
    {sub === "catalog" && canEdit && <CatalogView {...{ doc, catalog, commit }} />}
    {sub === "checklists" && canEdit && <ChecklistsView doc={doc} commit={commit} book={book} bookApi={bookApi} />}
  </div>);
}

// ── v186 : Tests par semaine (maquette validée) ─────────────────────────────────────────────────────────────────
// Trois colonnes (cette semaine, la suivante, dans deux semaines), une carte par machine dont la période de tests touche la
// semaine (rangée dans la première semaine concernée) ; un volet à droite reprend la fiche de la machine choisie, avec la
// checklist des tests à cocher « fait ». Les machines dont la période est passée sans que tout soit fait restent dans la
// première colonne, signalées « En retard ».
const mondayD = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const isoWeek = d => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - n); const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y) / 86400000 + 1) / 7); };
function WeekBoard({ doc, rows, testers, catalog, conflicts, commit, certifs, canEdit, lead, myTester, focus, who, signApi, book, bookApi, askPjs, benches }) {
  const [sel, setSel] = useState(null);
  const [onlyMine, setOnlyMine] = useState(!!myTester && !canEdit && !lead); // v238 : le responsable des testeurs voit tout
  useEffect(() => { if (focus && focus.pj) setSel(focus.pj); }, [focus]);
  const w0 = mondayD(new Date());
  const weeks = [0, 1, 2, 3].map(i => { const a = new Date(w0); a.setDate(a.getDate() + 7 * i); const b = new Date(a); b.setDate(b.getDate() + 7); return { a, b, i }; });
  const startOf = r => new Date(dIso(r.tests) + "T00:00:00"), endOf = r => new Date((dIso(r.testsFin) || dIso(r.tests)) + "T23:59:59");
  const isMine = r => !!myTester && planOf(doc, r.pj).assign.some(a => a.tid === myTester.id);
  const pr = r => progressOf(planOf(doc, r.pj), catalog, activeSections(presenceKind(r.clientPresence || null)));
  const withP = rows.filter(r => r.tests && r.etat !== "SHIPPED" && (!onlyMine || isMine(r)));
  const cols = weeks.map(w => ({ ...w, items: [] }));
  // v200 (demandé : « une colonne de tests finis, comme dans un Kanban ») : une machine dont tous les tests sont faits (ou validée) passe dans « Terminés » (60 derniers jours).
  const isDone = r => { const pl = planOf(doc, r.pj), q = pr(r); return isForced(pl) || (q.total > 0 && q.done === q.total); };
  const lim = new Date(w0); lim.setDate(lim.getDate() - 60);
  const doneCol = { a: null, b: null, i: 4, done: true, items: [] };
  withP.forEach(r => {
    if (isDone(r)) { if (endOf(r) >= lim) doneCol.items.push({ r, late: false }); return; }
    const c = cols.find(w => startOf(r) < w.b && endOf(r) >= w.a);
    if (c) c.items.push({ r, late: false });
    else if (endOf(r) < weeks[0].a) { const q = pr(r); if (q.total > q.done && !isForced(planOf(doc, r.pj))) cols[0].items.push({ r, late: true }); }
  });
  cols.forEach(c => c.items.sort((x, y) => (y.late - x.late) || (startOf(x.r) - startOf(y.r))));
  doneCol.items.sort((x, y) => endOf(y.r) - endOf(x.r));
  cols.push(doneCol);
  const later = withP.filter(r => startOf(r) >= weeks[3].b).length, noPeriod = rows.filter(r => !r.tests && r.etat !== "SHIPPED").length;
  const all = cols.flatMap(c => c.items.map(x => x.r));
  const cur = sel ? (all.find(r => r.pj === sel) || rows.find(r => r.pj === sel) || null) : null;
  return (<div className="enogia-tests-board">
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: FZ.xs, color: T.ink500 }}>
        <span>S{isoWeek(weeks[0].a)} → S{isoWeek(weeks[3].a)} · {all.length} machine{all.length > 1 ? "s" : ""}{later ? " · " + later + " plus tard" : ""}{noPeriod ? " · " + noPeriod + " sans période de tests" : ""}</span>
        {myTester && <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto", minHeight: 24, cursor: "pointer", color: T.ink700, fontWeight: 600 }}><input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} />Seulement mes tests</label>}
      </div>
      <WidgetArrange id="tests-semaine" label="Cadrans de Tests › Par semaine" spans={{ banc: 8, resultats: 4, grille: 12 }} labels={{ banc: "Au banc maintenant", resultats: "Derniers résultats", grille: "Planning des bancs" }}
        sizes={{ banc: ["xl", "m"], resultats: ["m", "s", "xl"], grille: ["xl"] }}>
        <BenchStrip key="banc" rows={withP} {...{ doc, catalog, testers, benches }} on={cur && cur.pj} onPick={setSel} />
        <ResultsFeed key="resultats" rows={withP} {...{ doc, catalog }} onPick={setSel} />
        <BenchGrid key="grille" rows={withP} allRows={rows} {...{ doc, catalog, testers, conflicts, benches }} on={cur && cur.pj} onPick={setSel} />
      </WidgetArrange>
    </div>
    {cur && <TestDialog r={cur} onClose={() => setSel(null)} {...{ doc, testers, catalog, conflicts, commit, certifs, canEdit, lead, myTester, who, signApi, book, bookApi, askPjs }} />}
  </div>);
}

// ── v205 (maquette A + fil de B validés : « la page de tests manque de saveur ») ──────────────────────────────────
// Bandeau « Au banc maintenant » : une carte par machine dont la période de tests couvre aujourd'hui (ou finie depuis
// moins de 30 jours sans que tout soit fait = en retard) — anneau d'avancement, test en cours, testeurs, compteur
// « jour N / M » et barre découpée test par test (réussi / en cours / échec / à faire). À côté, le fil des derniers
// résultats (réussis et échecs des 14 derniers jours, d'après l'horodatage des statuts).
const DAY = 86400000;
const segsOf = (plan, catalog, act) => { const out = []; act.forEach(k => selectedIds(plan, catalog, k).forEach(id => { const t = (catalog[k] || []).find(x => x.id === id); out.push({ k, id, name: t ? t.name : id, v: statusOf(plan, k, id) }); })); return out; };
// v348 (WCAG 1.4.1) : échec / retard hachurés en plus du rouge (lisible sans les couleurs)
const HATCH = "repeating-linear-gradient(135deg, rgba(255,255,255,.55) 0 2px, transparent 2px 5px)";
const SEG_FILL = { ok: () => stageSoft().finProd.solid, wip: () => stageSoft().tests.solid, ko: () => T.red500, todo: () => T.line };
const ST_LABEL = Object.fromEntries(TEST_STATUS);
// v289 (lot G) : still = sans animation d'entrée (grille des bancs : une barre par machine, tout bougeait en même temps)
function SegBar({ segs, h = 8, gap = 2, width, still }) {
  if (!segs.length) return <span aria-hidden="true" style={{ width: width || "100%", height: h, borderRadius: 4, background: T.surfaceAlt, display: "block" }} />;
  return (<span aria-hidden="true" className={still ? undefined : "enogia-segbar"} style={{ display: "flex", gap, height: h, width: width || "100%", flexShrink: 0 }}>
    {segs.map((s, i) => <i key={s.k + s.id} title={s.name + " — " + ST_LABEL[s.v]} style={{ flex: 1, minWidth: 2, borderRadius: 4, background: SEG_FILL[s.v](), backgroundImage: s.v === "ko" ? HATCH : undefined, animationDelay: (i * 25) + "ms" }} />)}
  </span>);
}
const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
// v366 (maquette v366-bancs-turbines.html, piste A validée) : un cadre par banc — la machine en cours (ou « Libre »), puis les 4 suivantes
// de ce banc dans l'ordre de passage (banc d'après le planificateur, benchModel.js).
const BENCH_C = b => (b === 2 ? T.info600 : T.ink900);
function BenchCard({ r, plan, act, q, lateD, n, m, testers, catalog, on, onPick }) {
  const segs = segsOf(plan, catalog, act), cur = segs.find(s => s.v === "wip") || segs.find(s => s.v === "todo") || segs.find(s => s.v === "ko");
  const names = plan.assign.map(x => testers.find(t => t.id === x.tid)).filter(Boolean).map(t => t.name.split(" ")[0]);
  const meta = getPjMeta(r.pj, r), todo = q.total - q.done - q.wip;
  const sum = [q.ok && q.ok + " réussi" + (q.ok > 1 ? "s" : ""), q.wip && q.wip + " en cours", q.ko && q.ko + " échec" + (q.ko > 1 ? "s" : ""), todo > 0 && todo + " à faire"].filter(Boolean).join(" · ");
  return (<div {...pressable(() => onPick(r.pj), { "aria-pressed": on === r.pj, "aria-label": r.pj + " au banc — " + q.done + " tests faits sur " + q.total + (lateD ? " — en retard de " + lateD + " jours" : "") })}
    className="enogia-bench-card" style={{ background: on === r.pj ? T.teal100 : T.card, borderRadius: 12, boxShadow: T.shadowSm + (lateD ? ", inset 0 3px 0 " + T.red500 : ""), padding: "12px 14px", cursor: "pointer", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <PjPlate pj={r.pj} />
      {r.gamme && <span style={{ fontSize: 13, fontWeight: 600, color: T.ink900, whiteSpace: "nowrap" }}>{r.gamme}</span>}
      <span title={meta.nomProjet || ""} style={{ flex: 1, minWidth: 0, fontSize: FZ.xs, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: lateD ? T.red600 : T.ink700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{lateD ? "en retard de " + lateD + " j" : "jour " + n + " / " + m}</span>
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cur ? cur.name : q.total ? "Tous les tests sont faits" : "Aucun test retenu"}</div>
      <div style={{ fontSize: 13, color: names.length ? T.ink500 : T.red600, marginTop: 1 }}>{cur ? ST_LABEL[cur.v].toLowerCase() : ""}{cur ? " · " : ""}{names.length ? names.join(", ") : "sans testeur"}</div>
    </div>
    <SegBar segs={segs} />
    <div style={{ fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{sum || "Aucun test retenu"}</div>
  </div>);
}
const inDays = (iso, today) => { const k = Math.round((new Date(iso + "T12:00:00") - today) / DAY); return k <= 0 ? "aujourd'hui" : k === 1 ? "demain" : k < 35 ? "dans " + k + " j" : "dans " + Math.round(k / 7) + " sem."; };
function BenchStrip({ rows, doc, catalog, testers, on, onPick, benches }) {
  const today = dayStart(new Date());
  const startOf = r => dayStart(new Date(dIso(r.tests) + "T12:00:00")), endOf = r => dayStart(new Date((dIso(r.testsFin) || dIso(r.tests)) + "T12:00:00"));
  const items = [];
  rows.forEach(r => {
    const plan = planOf(doc, r.pj), act = activeSections(presenceKind(r.clientPresence || null)), q = progressOf(plan, catalog, act);
    const full = isForced(plan) || (q.total > 0 && q.done === q.total), a = startOf(r), b = endOf(r);
    if (full || a > today) return;
    const lateD = b < today ? Math.round((today - b) / DAY) : 0;
    if (lateD > 30) return;
    items.push({ r, plan, act, q, lateD, n: Math.round((today - a) / DAY) + 1, m: Math.round((b - a) / DAY) + 1, bench: benchOf(benches, r), end: dIso(r.testsFin) || dIso(r.tests) });
  });
  items.sort((x, y) => (y.lateD > 0) - (x.lateD > 0) || endOf(x.r) - endOf(y.r));
  const queue = nextByBench(rows.filter(r => startOf(r) > today).map(r => ({ r, pj: r.pj, a: dIso(r.tests), bench: benchOf(benches, r) })), 4);
  const total = items.length;
  return (<section aria-label="Au banc maintenant" style={{ minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
      <h2 style={{ margin: 0, fontSize: FZ.sm, fontWeight: 600, color: T.ink900 }}>Au banc maintenant</h2>
      <Cap>{total ? total + " machine" + (total > 1 ? "s" : "") + " en test" : "aucune machine aujourd'hui"}</Cap>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 12 }}>
      {BENCHES.map(b => { const cur = items.filter(x => x.bench === b), nx = queue[b] || [], late = cur.some(x => x.lateD);
        const st = cur.length ? (late ? "occupé · en retard" : "occupé · fin des tests le " + fdm(cur.map(x => x.end).sort().pop())) : nx[0] ? "libre jusqu'au " + fdm(nx[0].a) : "libre";
        return (<div key={b} style={{ background: T.surface, border: "1px solid " + T.line, borderRadius: 12, padding: 12, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: BENCH_C(b), flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink900 }}>Banc {b}</h3>
            <span style={{ marginLeft: "auto", fontSize: 12, color: late ? T.red600 : T.ink500, fontWeight: late ? 600 : 500, textAlign: "right" }}>{st}</span>
          </div>
          {cur.map(x => <BenchCard key={x.r.pj} {...x} testers={testers} catalog={catalog} on={on} onPick={onPick} />)}
          {!cur.length && <div style={{ border: "1.5px dashed " + T.line, borderRadius: 12, minHeight: 96, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 12, fontSize: 13, color: T.ink500 }}>
            {nx[0] ? <span>Libre jusqu'au {fdm(nx[0].a)} — prochaine : <b style={{ color: T.ink900, fontWeight: 600 }}>{nx[0].pj}</b></span> : "Libre, rien de prévu"}</div>}
          {nx.length > 0 && <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.ink500, margin: "0 0 2px 2px" }}>À suivre sur le banc {b}</div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {nx.map((x, i) => { const meta = getPjMeta(x.pj, x.r), pd = presenceDates(x.r.clientPresence || null), vis = [pd.client && "client le " + fdm(dIso(pd.client)), pd.nobo && "NOBO le " + fdm(dIso(pd.nobo))].filter(Boolean).join(" · ");
                return <li key={x.pj} style={{ borderTop: i ? "1px solid " + T.line : "none" }}>
                  <button type="button" onClick={() => onPick(x.pj)} aria-label={"Ouvrir la fiche de tests de " + x.pj + ", tests le " + fd(x.a)} style={{ all: "unset", boxSizing: "border-box", width: "100%", cursor: "pointer", display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "7px 8px", minHeight: 44, borderRadius: 8, "--e-hov-bg": T.card }} className="e-hov">
                    <PjPlate pj={x.pj} />
                    <span style={{ minWidth: 0, fontSize: 13, color: T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[x.r.gamme, meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""].filter(Boolean).join(" · ")}{vis ? <span style={{ color: T.ink500 }}> · {vis}</span> : null}</span>
                    <span style={{ textAlign: "right", lineHeight: 1.25, fontVariantNumeric: "tabular-nums" }}><b style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink900 }}>{fdm(x.a)}</b><span style={{ fontSize: 12, color: T.ink500 }}>{inDays(x.a, today)}</span></span>
                  </button></li>; })}
            </ol></div>}
        </div>); })}
    </div>
  </section>);
}
const whenTxt = at => { const d = new Date(at); if (isNaN(d)) return ""; const t = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"), k = Math.round((dayStart(new Date()) - dayStart(d)) / DAY); return (k === 0 ? "aujourd'hui" : k === 1 ? "hier" : fdm(toLocalISO(d))) + " " + t; };
function ResultsFeed({ rows, doc, catalog, onPick }) {
  const lim = Date.now() - 14 * DAY, ev = [];
  rows.forEach(r => {
    const plan = planOf(doc, r.pj);
    activeSections(presenceKind(r.clientPresence || null)).forEach(k => selectedIds(plan, catalog, k).forEach(id => {
      const v = statusOf(plan, k, id), by = statusByOf(plan, k, id);
      if (!["ok", "ko"].includes(v) || !by || !by.at || new Date(by.at) < lim) return;
      const t = (catalog[k] || []).find(x => x.id === id);
      ev.push({ pj: r.pj, v, name: t ? t.name : id, by: by.by, at: by.at });
    }));
  });
  ev.sort((a, b) => new Date(b.at) - new Date(a.at));
  return (<section aria-label="Derniers résultats" style={{ minWidth: 0, background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "10px 12px" }}>
    <h2 style={{ margin: "0 0 6px", fontSize: FZ.sm, fontWeight: 600, color: T.ink900 }}>Derniers résultats</h2>
    {ev.length === 0 && <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucun résultat ces 14 derniers jours. Ils apparaissent ici dès qu'un test est marqué réussi ou en échec.</div>}
    <ol className="enogia-stagger" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
      {ev.slice(0, 7).map((e, i) => <li key={e.pj + e.name + e.at} style={{ borderTop: i ? "1px solid " + T.line : "none" }}>
        <button type="button" onClick={() => onPick(e.pj)} style={{ all: "unset", boxSizing: "border-box", width: "100%", cursor: "pointer", padding: "6px 0", display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", columnGap: 8, rowGap: 1, alignItems: "baseline", minHeight: 36 }}>
          <span style={{ fontSize: FZ.xs, fontWeight: 500, color: e.v === "ok" ? T.emerald600 : T.red600 }}>{e.v === "ok" ? "Réussi" : "Échec"}</span>
          <span style={{ fontSize: FZ.xs, color: T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</span>
          <span />
          <span style={{ fontSize: 12, color: T.ink500, fontVariantNumeric: "tabular-nums" }}><span style={{ fontFamily: T.fontMono || "monospace" }}>{e.pj}</span>{e.by ? " · " + e.by : ""} · {whenTxt(e.at)}</span>
        </button>
      </li>)}
    </ol>
  </section>);
}

// ── v209 (maquette A validée : « grille des bancs », après « le calendrier est catastrophique ») ──────────────────
// Une grille commune à « Par semaine » et « Par testeur » : à gauche l'étiquette de la ligne, à droite 15 jours ouvrés
// (3 semaines, lundi → vendredi) avec la semaine en tête, aujourd'hui surligné et les jours fériés marqués. Une ligne par
// machine (Par semaine) ou par testeur (Par testeur) ; la barre couvre les jours de tests et sa couleur dit l'état :
// or en cours, rouge en retard (jusqu'à aujourd'hui), vert terminé, contour gris = prévu ; contour orange = testeur en conflit.
const HOLI = makeCalendar({ closurePeriods: [] });
const DOW1 = ["L", "M", "M", "J", "V"];
const GRID_DAYS = 20; // v336 (D11, demandé : « allonger le planning des tests à venir : 4 prochaines semaines ») : 4 semaines au lieu de 3
const workDaysFrom = (mondayIso, n) => { const out = []; for (let i = 0; out.length < n && i < n * 2 + 14; i++) { const d = addDaysIso(mondayIso, i); const wd = (new Date(d + "T12:00:00").getDay() + 6) % 7; if (wd < 5) out.push(d); } return out; };
function machineState(r, doc, catalog, todayIso) {
  const a = dIso(r && r.tests), b = dIso(r && r.testsFin) || a; if (!a) return null;
  const plan = planOf(doc, r.pj), act = activeSections(presenceKind(r.clientPresence || null)), q = progressOf(plan, catalog, act);
  const full = isForced(plan) || (q.total > 0 && q.done === q.total), late = !full && b < todayIso;
  const dd = (x, y) => Math.round((new Date(y + "T12:00:00") - new Date(x + "T12:00:00")) / DAY);
  return { plan, act, q, a, b, full, st: full ? "done" : late ? "late" : a <= todayIso ? "wip" : "next", lateD: late ? dd(b, todayIso) : 0, n: dd(a, todayIso) + 1, m: dd(a, b) + 1 };
}
const toneOfSt = st => { const S = stageSoft(), c = st === "late" ? T.red500 : st === "done" ? S.finProd.solid : st === "wip" ? S.tests.solid : null; return c ? { bg: c, ink: inkOn(c), bd: "none" } : { bg: T.card, ink: T.ink900, bd: "1.5px solid " + T.ink500 }; };
function GridLegend() {
  const S = stageSoft(), sw = (bg, bd) => <i aria-hidden="true" style={{ width: 12, height: 9, borderRadius: 4, background: bg, border: bd || "none", boxSizing: "border-box", display: "inline-block" }} />;
  return (<span style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", fontSize: FZ.xs, color: T.ink500, alignItems: "center" }}>
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>{sw(S.tests.solid)}en cours</span>
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>{sw(T.red500)}en retard</span>
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>{sw(S.finProd.solid)}terminé</span>
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>{sw(T.card, "1.5px solid " + T.ink500)}prévu</span>
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><i aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: PRESENCE_META.client.color }} />client<i aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: PRESENCE_META.nobo.color, marginLeft: 6 }} />NOBO</span>
  </span>);
}
function GridHead({ days, todayIso, labelStyle, label }) {
  const S = stageSoft(), m0 = mondayOf(todayIso);
  const wk = d => { const k = Math.round((new Date(d + "T12:00:00") - new Date(m0 + "T12:00:00")) / (7 * DAY)); return "S" + isoWeek(new Date(d + "T12:00:00")) + (k === 0 ? " · cette semaine" : k === 1 ? " · semaine prochaine" : ""); };
  return (<div style={{ display: "flex", background: T.surface, borderBottom: "1px solid " + T.line, position: "sticky", top: 0, zIndex: 3 }}>
    <div style={{ ...labelStyle, fontFamily: T.fontLabel, fontSize: 12, fontWeight: 500, color: T.ink500, display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>{label}</div>
    <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "repeat(" + days.length + ",minmax(0,1fr))" }}>
      {days.filter((d, i) => i % 5 === 0).map((d, i) => <div key={"w" + d} style={{ gridColumn: "span 5", padding: "7px 8px 2px", fontSize: 12, fontWeight: 500, color: T.ink900, borderLeft: i ? "2px solid " + T.line : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wk(d)}</div>)}
      {days.map((d, i) => { const td = d === todayIso, off = !HOLI.isWork(d); return <div key={d} title={off ? "Jour férié" : td ? "Aujourd'hui" : undefined} style={{ padding: "3px 0 6px", textAlign: "center", fontSize: 12, fontWeight: td ? 500 : 500, color: td ? S.tests.ink : off ? T.ink300 : T.ink500, background: td ? S.tests.bg : "transparent", borderRadius: td ? "8px 8px 0 0" : 0, borderLeft: i % 5 === 0 && i ? "2px solid " + T.line : "none", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden" }}>{off ? "férié" : DOW1[i % 5] + " " + Number(d.slice(8, 10))}</div>; })}
    </div>
  </div>);
}
function TrackBg({ days, todayIso }) {
  const S = stageSoft();
  return (<div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(" + days.length + ",1fr)", pointerEvents: "none" }}>
    {days.map((d, i) => <div key={d} style={{ borderLeft: i % 5 === 0 && i ? "2px solid " + T.line : i ? "1px solid " + T.surface : "none", background: d === todayIso ? S.tests.bg : !HOLI.isWork(d) ? T.surfaceAlt : "transparent", opacity: d === todayIso ? 0.4 : 1 }} />)}
  </div>);
}
function GridNav({ off, setOff, step = 1 }) {
  return (<span className="e-tb" style={{ display: "inline-flex", gap: 6 }}>
    <button type="button" onClick={() => setOff(o => o - step)} style={{ ...btn(true, "ghost"), minHeight: 30 }} aria-label="Une semaine plus tôt">◀</button>
    <button type="button" onClick={() => setOff(0)} disabled={off === 0} style={{ ...btn(off !== 0, "ghost"), minHeight: 30 }}>Aujourd'hui</button>
    <button type="button" onClick={() => setOff(o => o + step)} style={{ ...btn(true, "ghost"), minHeight: 30 }} aria-label="Une semaine plus tard">▶</button>
  </span>);
}
// v366 (maquette v366-bancs-turbines.html, piste A validée : « Go, piste A ») : une ligne par banc — les machines s'y suivent comme des
// créneaux (sous-lignes si deux périodes se chevauchent, contour orange = testeur en conflit), trait « aujourd'hui », zoom 2 sem. / 6 sem. /
// 3 mois (enogia_bg_zoom), bande continue (4 semaines avant, 100 jours ouvrés), ‹ › = un écran. Dessous : PJ sans période, puis
// « Tests validés » repliable (historique par mois : tous les tests faits ou validés à la main, expédiées comprises). Remplace la grille V338.
const BG_WEEKS_BEFORE = 4, BG_DAYS = 100, BG_ZOOM = { "2w": 56, "6w": 30, "3m": 16 }, BG_LW = "min(180px, 34vw)";
function BenchGrid({ rows, allRows, doc, catalog, testers, conflicts, on, onPick, benches }) {
  const todayIso = toLocalISO(new Date());
  const [zoom, setZoomS] = useState(() => { try { const z = localStorage.getItem("enogia_bg_zoom"); return BG_ZOOM[z] ? z : "6w"; } catch (e) { return "6w"; } });
  const setZoom = z => { setZoomS(z); try { localStorage.setItem("enogia_bg_zoom", z); } catch (e) { /* stockage indisponible */ } };
  const COL = BG_ZOOM[zoom];
  const days = useMemo(() => workDaysFrom(addDaysIso(mondayOf(todayIso), -7 * BG_WEEKS_BEFORE), BG_DAYS), [todayIso]), end = days[days.length - 1];
  const idx = d => { const i = days.findIndex(x => x >= d); return i < 0 ? days.length : i; };
  const scRef = useRef(null), [vis, setVis] = useState([0, 0]), [months, setMonths] = useState(3);
  const labW = () => { const el = scRef.current && scRef.current.querySelector(".e-bga-lab"); return el ? el.offsetWidth : 0; };
  const onScroll = () => { const el = scRef.current; if (!el) return; const a = Math.max(0, Math.floor(el.scrollLeft / COL)), b = Math.min(days.length - 1, Math.floor((el.scrollLeft + el.clientWidth - labW()) / COL)); setVis(v => (v[0] === a && v[1] === b ? v : [a, b])); };
  const goToday = () => { const el = scRef.current; if (!el) return; const i = idx(todayIso); el.scrollLeft = Math.max(0, (i - Math.max(2, Math.round((el.clientWidth - labW()) / COL / 6))) * COL); onScroll(); };
  const page = dir => { const el = scRef.current; if (el) el.scrollBy({ left: dir * Math.round((el.clientWidth - labW()) * 0.8), behavior: smooth() }); };
  useEffect(() => { goToday(); }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  // machines par banc, avec leur créneau (fin = aujourd'hui pour une machine en retard)
  const lanes = {}; BENCHES.forEach(b => { lanes[b] = []; });
  const noPer = [];
  rows.forEach(r => {
    const ms = machineState(r, doc, catalog, todayIso); if (!ms) { noPer.push(r); return; }
    const b = benchOf(benches, r), z = ms.st === "late" ? todayIso : ms.b;
    if (z < days[0] || ms.a > end) return;
    const names = ms.plan.assign.map(x => testers.find(t => t.id === x.tid)).filter(Boolean).map(t => t.name.split(" ")[0]);
    (lanes[b] = lanes[b] || []).push({ r, ms, a: ms.a, b: z, names, conf: conflicts.some(c => c.a.pj === r.pj || c.b.pj === r.pj), pd: presenceDates(r.clientPresence || null) });
  });
  (allRows || []).forEach(r => { if (r && r.pj && !r.tests && r.etat !== "SHIPPED" && r.etat !== "SLOT_LIBRE" && !noPer.includes(r)) noPer.push(r); });
  // historique : tests validés (tous faits ou validés à la main), expédiées comprises
  const done = (allRows || []).map(r => { const ms = r && r.pj && machineState(r, doc, catalog, todayIso); return ms && ms.full ? { r, ms } : null; }).filter(Boolean);
  const hist = byMonth(done, x => x.ms.b);
  const ROW = zoom === "3m" ? 34 : 44, wTot = days.length * COL;
  const ti = days.indexOf(todayIso), tx = ti >= 0 ? ti * COL + COL / 2 : idx(todayIso) * COL;
  const lab = { width: BG_LW, minWidth: BG_LW, flexShrink: 0, position: "sticky", left: 0, zIndex: 3, background: T.card, boxSizing: "border-box", padding: "8px 14px", borderRight: "1px solid " + T.line };
  const weekStarts = days.map((d, i) => (i === 0 || (new Date(d + "T12:00:00").getDay() === 1) ? i : -1)).filter(i => i >= 0);
  const m0 = mondayOf(todayIso);
  const wkLab = d => { const k = Math.round((new Date(mondayOf(d) + "T12:00:00") - new Date(m0 + "T12:00:00")) / (7 * DAY)); return "S" + isoWeek(new Date(d + "T12:00:00")) + (COL >= 30 && k === 0 ? " · cette semaine" : ""); };

  return (<section aria-label="Planning des bancs" className="enogia-bga" style={{ background: T.card, borderRadius: 12, boxShadow: T.shadowSm, border: "1px solid " + T.line, overflow: "hidden", minWidth: 0 }}>
    <div className="e-tb" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px" }}>
      <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink900 }}>Planning des bancs</h2>
      <span style={{ fontSize: 13, color: T.ink500 }}>{days[vis[0]] ? "du " + fd(days[vis[0]]) + " au " + fd(days[vis[1]]) : ""}</span>
      <span style={{ flex: 1 }} />
      <Segmented label="Zoom du planning" value={zoom} onChange={setZoom} options={[["2w", "2 sem."], ["6w", "6 sem."], ["3m", "3 mois"]]} />
      <span style={{ display: "inline-flex", gap: 6 }}>
        <button type="button" onClick={() => page(-1)} style={{ ...btn(true, "ghost"), minHeight: 32, minWidth: 32 }} aria-label="Période précédente">‹</button>
        <button type="button" onClick={goToday} style={{ ...btn(true, "ghost"), minHeight: 32 }}>Aujourd'hui</button>
        <button type="button" onClick={() => page(1)} style={{ ...btn(true, "ghost"), minHeight: 32, minWidth: 32 }} aria-label="Période suivante">›</button></span>
    </div>
    <div ref={scRef} onScroll={onScroll} style={{ overflowX: "auto", overflowY: "hidden", borderTop: "1px solid " + T.line }}>
      <div style={{ width: "calc(" + BG_LW + " + " + wTot + "px)" }}>
        {/* en-tête : semaines puis jours (aujourd'hui en pastille) */}
        <div style={{ display: "flex", borderBottom: "1px solid " + T.line, background: T.card }}>
          <div className="e-bga-lab" style={{ ...lab, display: "flex", alignItems: "flex-end", fontSize: 12, color: T.ink500, padding: "6px 14px" }}>Banc</div>
          <div style={{ position: "relative", width: wTot, height: 46 }}>
            {weekStarts.map(i => <span key={"w" + i} style={{ position: "absolute", left: i * COL, top: 0, height: 46, paddingLeft: 6, borderLeft: i ? "1px solid " + T.line : "none", fontSize: 12, fontWeight: 600, color: T.ink900, whiteSpace: "nowrap", lineHeight: "22px" }}>{wkLab(days[i])}</span>)}
            {days.map((d, i) => { const td = d === todayIso, off = !HOLI.isWork(d), show = COL >= 24 || td || i % 5 === 0;
              return show ? <span key={d} title={off ? "Jour férié" : undefined} style={{ position: "absolute", left: i * COL + (COL - 22) / 2, top: 22, width: 22, height: 20, lineHeight: "20px", textAlign: "center", fontSize: 12, fontWeight: td ? 600 : 500, borderRadius: 999, background: td ? T.red500 : "transparent", color: td ? T.onFill : off ? T.ink300 : T.ink500, fontVariantNumeric: "tabular-nums" }}>{Number(d.slice(8, 10))}</span> : null; })}
          </div>
        </div>
        {BENCHES.map(bk => { const L = lanes[bk] || [], nRow = packRows(L), late = L.some(x => x.ms.st === "late"), cur = L.filter(x => x.ms.st === "wip" || x.ms.st === "late"), nx = L.filter(x => x.ms.st === "next").sort((p, q) => (p.a < q.a ? -1 : 1))[0];
          const st = late ? "en retard" : cur.length ? "fin le " + fdm(cur.map(x => x.ms.b).sort().pop()) : nx ? "libre jusqu'au " + fdm(nx.a) : "libre";
          return (<div key={bk} style={{ display: "flex", borderBottom: "1px solid " + T.line }}>
            <div className="e-bga-lab" style={{ ...lab, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: T.ink900 }}><i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: BENCH_C(bk) }} />Banc {bk}</span>
              <span style={{ fontSize: 12, color: late ? T.red600 : T.ink500, paddingLeft: 18 }}>{st}</span>
            </div>
            <div style={{ position: "relative", width: wTot, height: nRow * ROW + 16 }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
                {weekStarts.map(i => i ? <span key={i} style={{ position: "absolute", left: i * COL, top: 0, bottom: 0, borderLeft: "1px solid " + T.line, opacity: 0.6 }} /> : null)}
                {days.map((d, i) => !HOLI.isWork(d) ? <span key={d} style={{ position: "absolute", left: i * COL, width: COL, top: 0, bottom: 0, background: T.surfaceAlt }} /> : null)}
                <span style={{ position: "absolute", left: tx - 1, top: 0, bottom: 0, width: 2, borderRadius: 2, background: T.red500, zIndex: 1 }} />
              </div>
              {L.map(x => { const { r, ms } = x, tn = toneOfSt(ms.st), a0 = Math.max(0, idx(x.a)), z1 = Math.min(days.length - 1, idx(x.b) - (days.includes(x.b) ? 0 : 1)), w = Math.max(1, z1 - a0 + 1) * COL - 4, sel = on === r.pj;
                const pct = ms.q.total ? Math.round(ms.q.done / ms.q.total * 100) : 0;
                const info = ms.st === "late" ? "en retard de " + ms.lateD + " j" : ms.st === "wip" ? "jour " + ms.n + " / " + ms.m : ms.st === "done" ? (isForced(ms.plan) ? "✓ validé" : "✓ terminé") : "prévu le " + fdm(ms.a);
                const aria = r.pj + (r.gamme ? ", " + r.gamme : "") + ", banc " + bk + ", tests du " + fd(ms.a) + " au " + fd(ms.b) + ", " + info + ", " + ms.q.done + " tests faits sur " + ms.q.total + (x.names.length ? ", " + x.names.join(" et ") : ", sans testeur") + (x.conf ? ", testeur en conflit" : "");
                const dots = ["client", "nobo"].map(k => { const d = dIso(x.pd[k]); const i = d ? days.indexOf(d) : -1; return i >= 0 ? <span key={k} role="img" aria-label={(k === "client" ? "Client" : "NOBO") + " présent le " + fd(d)} title={(k === "client" ? "Client" : "NOBO") + " présent le " + fd(d)} style={{ position: "absolute", left: i * COL + COL / 2 - 4, top: 8 + x.row * ROW - 4, width: 8, height: 8, borderRadius: "50%", background: PRESENCE_META[k].color, boxShadow: "0 0 0 2px " + T.card, zIndex: 3 }} /> : null; });
                return (<React.Fragment key={r.pj}>
                  <button type="button" className="enogia-bg-bar" onClick={() => onPick(r.pj)} aria-label={aria} title={r.pj + " · " + fd(ms.a) + " → " + fd(ms.b) + " · " + info + (x.conf ? " · testeur en conflit" : "")}
                    style={{ position: "absolute", left: a0 * COL + 2, width: w, top: 8 + x.row * ROW, height: ROW - 8, zIndex: 2, border: "none", borderRadius: 8, background: tn.bg, backgroundImage: ms.st === "late" ? HATCH : undefined, color: tn.ink,
                      boxShadow: (tn.bd !== "none" ? "inset 0 0 0 1.5px " + T.ink300 : "") + (x.conf ? (tn.bd !== "none" ? ", " : "") + "0 0 0 2px " + T.amber600 : sel ? (tn.bd !== "none" ? ", " : "") + "0 0 0 2px " + T.ink900 : ""), cursor: "pointer", padding: "0 8px", textAlign: "left", fontFamily: T.font, overflow: "clip", whiteSpace: "nowrap", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", lineHeight: 1.2 }}>
                    <span style={{ position: "sticky", left: "calc(" + BG_LW + " + 8px)", display: "flex", flexDirection: "column", minWidth: 0, maxWidth: "100%" }}>
                    <b style={{ fontFamily: T.fontDisplay, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{r.pj}{r.gamme && w > 120 ? " · " + r.gamme : ""}</b>
                    {ROW >= 44 && w > 70 && <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", opacity: 0.9 }}>{info}{x.names.length ? " · " + x.names.join(", ") : ms.st !== "done" ? " · sans testeur" : ""}</span>}</span>
                    {ms.st !== "next" && ms.st !== "done" && <span aria-hidden="true" style={{ position: "absolute", left: 0, bottom: 0, height: 3, width: pct + "%", background: "rgba(0,0,0,.28)" }} />}
                  </button>{dots}</React.Fragment>); })}
              {!L.length && <span style={{ position: "absolute", left: 12, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 13, color: T.ink500 }}>Aucune machine sur ce banc dans la période</span>}
            </div>
          </div>); })}
      </div>
    </div>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "10px 14px", borderTop: "1px solid " + T.line }}>
      <GridLegend />
      {noPer.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginLeft: "auto", fontSize: 12, color: T.ink500 }}>Sans période de tests :
        {noPer.slice(0, 8).map(r => <button key={r.pj} type="button" onClick={() => onPick(r.pj)} aria-label={"Ouvrir la fiche de tests de " + r.pj} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}><PjPlate pj={r.pj} /></button>)}
        {noPer.length > 8 ? "et " + (noPer.length - 8) + " autres" : null}</span>}
    </div>
    <details className="e-bga-hist" style={{ borderTop: "1px solid " + T.line }}>
      <summary style={{ cursor: "pointer", padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, color: T.ink900, minHeight: 44, boxSizing: "border-box" }}>
        <NavIcon name="chevronDown" size={14} />Tests validés <span style={{ fontWeight: 500, fontSize: 13, color: T.ink500 }}>· {done.length} machine{done.length > 1 ? "s" : ""}, historique</span></summary>
      {done.length === 0 && <div style={{ padding: "0 14px 14px", fontSize: 13, color: T.ink500 }}>Les machines dont tous les tests sont faits, ou validées à la main, s'ajoutent ici.</div>}
      {hist.slice(0, months).map(g => <div key={g.month}>
        <div style={{ padding: "8px 14px 4px", fontSize: 12, fontWeight: 500, color: T.ink500 }}>{g.label}</div>
        {g.items.map(({ r, ms }) => { const names = ms.plan.assign.map(x => testers.find(t => t.id === x.tid)).filter(Boolean).map(t => t.name.split(" ")[0]);
          return <button key={r.pj} type="button" onClick={() => onPick(r.pj)} aria-label={"Ouvrir la fiche de tests de " + r.pj + ", validée le " + fd(ms.b)} className="e-hov" style={{ "--e-hov-bg": T.surface, width: "100%", border: "none", borderTop: "1px solid " + T.line, background: "transparent", cursor: "pointer", fontFamily: T.font, textAlign: "left", display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "8px 14px", minHeight: 44, color: T.ink900 }}>
            <PjPlate pj={r.pj} />
            <span style={{ minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[r.gamme, names.join(", "), ms.q.total && ms.q.done ? ms.q.ok + " / " + ms.q.total + " réussis" + (ms.q.ko ? " · " + ms.q.ko + " échec" + (ms.q.ko > 1 ? "s" : "") : "") : "", isForced(ms.plan) ? (ms.plan.forced.auto ? "machine expédiée" : "validé à la main") : ""].filter(Boolean).join(" · ")}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.emerald600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>✓ validé le {fdm(ms.b)}</span>
          </button>; })}
      </div>)}
      {hist.length > months && <div style={{ padding: "10px 14px" }}><button type="button" onClick={() => setMonths(n => n + 3)} style={{ ...btn(true, "ghost"), minHeight: 32 }}>Afficher les mois précédents</button></div>}
    </details>
  </section>);
}

// v337 (maquette maquettes-design/v336-fiche-tests.html validée : « Go, code-la ») — fiche de tests d'un PJ : fil des 6 étapes à gauche
// (Qui teste ?, Présence, Configuration ORC = livret D13, Checklist de debug + D14, Checklist de tests + D12, Signature), étape ouverte à droite,
// pied avec la progression des étapes. Remplace le pop-up V189 (toutes les étapes l'une sous l'autre). Échap ferme, focus gardé.
const StepBigCtx = React.createContext(false);
export function TestDialog({ r, onClose, doc, testers, catalog, conflicts, commit, certifs, canEdit, lead, myTester, who, signApi, book, bookApi, askPjs }) {
  const box = useRef(null);
  useEffect(() => {
    const prev = document.activeElement, k = e => { if (e.key === "Escape" && !document.querySelector(".enogia-book-reader, [aria-label^='Checklist de ']")) onClose(); };
    window.addEventListener("keydown", k); if (box.current) box.current.focus({ preventScroll: true });
    const ov = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ov; if (prev && prev.focus) prev.focus(); };
  }, [onClose]);
  const plan = planOf(doc, r.pj), kind = presenceKind(r.clientPresence || null), act = activeSections(kind), q = progressOf(plan, catalog, act), meta = getPjMeta(r.pj, r);
  const pd = presenceDates(r.clientPresence || null), myCerts = (Array.isArray(meta.certifs) ? meta.certifs : []).map(id => (certifs || []).find(c => c.id === id)).filter(Boolean);
  const assigned = plan.assign.map(x => testers.find(t => t.id === x.tid)).filter(Boolean), signsDone = assigned.filter(t => (plan.signs || {})["t:" + t.id]).length;
  const mine = !!myTester && plan.assign.some(x => x.tid === myTester.id), canMark = canEdit || mine || !!lead;
  const canAsk = canEdit || !!lead || !!(askPjs && (askPjs.has(r.pj) || [...askPjs].some(p => String(p).replace(/-\d+[A-Z]*$/, "") === String(r.pj).replace(/-\d+[A-Z]*$/, ""))));
  const saveTests = p => commit({ plans: { ...(doc.plans || {}), [r.pj]: { ...p, asks: (p.asks || []).filter(a => !a.fiche) } } });
  const dsec = debugSections(doc.debugModel), dpr = debugProgress(plan.debug, dsec), vRows = vibRows(doc.vibModel), vpr = vibProgress(plan.debug, vRows), spr = speedProgress(plan.debug, doc.vibModel);
  const bpr = manualProgress(book, plan.book && plan.book.rows), hasBook = bookStepsOf(book).length > 0;
  const steps = [
    { id: "who", t: "Qui teste ?", s: assigned.length ? assigned.map(t => t.name).join(", ") : "à affecter", st: assigned.length ? "done" : "todo" },
    { id: "pres", t: "Présence", s: kind === "both" ? "client et NOBO" : kind === "client" ? "client" + (pd.client ? " le " + fdm(dIso(pd.client)) : "") : kind === "nobo" ? "NOBO" + (pd.nobo ? " le " + fdm(dIso(pd.nobo)) : "") : "tests internes seuls", st: "done" },
    { id: "book", t: "Configuration ORC", s: hasBook ? bpr.valid + " / " + bpr.total + " validées" + (bpr.pb ? " · " + bpr.pb + " problème" + (bpr.pb > 1 ? "s" : "") : "") : "livret à charger", st: bpr.pb ? "bad" : hasBook && bpr.valid === bpr.total ? "done" : "todo" },
    { id: "debug", t: "Checklist de debug", s: dpr.done + " / " + dpr.total + (dpr.nok ? " · " + dpr.nok + " NOK" : "") + (vpr.over ? " · vibrations hautes" : "") + (spr.out ? " · fréquences hors plage" : ""), st: dpr.nok || vpr.over || spr.out ? "bad" : dpr.signed ? "done" : "todo" },
    { id: "tests", t: "Checklist de tests", s: q.done + " / " + q.total + (q.ko ? " · " + q.ko + " NOK" : "") + (plan.asks.length ? " · " + plan.asks.length + " demande" + (plan.asks.length > 1 ? "s" : "") + " client" : ""), st: q.ko ? "bad" : q.total && q.done === q.total ? "done" : "todo" },
    { id: "sign", t: "Signature", s: signsDone + " / " + assigned.length + " testeur" + (assigned.length > 1 ? "s" : ""), st: assigned.length && signsDone === assigned.length ? "done" : "todo" },
  ];
  const [cur, setCur] = useState(() => { const i = steps.findIndex((x, k) => k >= 2 && x.st !== "done"); return i < 0 ? 0 : i; });
  const id = steps[cur].id, nDone = steps.filter(x => x.st === "done").length;
  const fact = (l, v) => <div style={{ fontSize: 12, color: T.ink500, minWidth: 0 }}>{l}<b style={{ display: "block", fontSize: 13, color: T.ink900, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</b></div>;
  return (<div className="enogia-test-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(8,12,28,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3dvh 12px", overflowY: "auto" }}>
    <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={"Tests de " + r.pj} className="enogia-test-dialog" style={{ width: "min(1200px,100%)", background: T.card, borderRadius: 12, border: "1px solid " + T.line, boxShadow: T.shadowLg, outline: "none", display: "grid", gridTemplateRows: "auto minmax(0,1fr) auto", maxHeight: "94dvh", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid " + T.line, flexWrap: "wrap" }}>
        <PjPlate pj={r.pj} size="lg" />
        <span style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: FZ.lg, color: T.ink900, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
        {r.gamme && <span style={{ fontFamily: T.fontLabel, fontSize: FZ.sm, fontWeight: 600, color: T.ink700, border: "1px solid " + T.line, borderRadius: 8, padding: "1px 8px" }}>{r.gamme}</span>}
        <span style={{ marginLeft: "auto", fontSize: FZ.sm, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>Tests {period(r)}</span>
        <button type="button" onClick={onClose} aria-label="Fermer la fiche" style={{ border: "1px solid " + T.line, background: "transparent", color: T.ink700, borderRadius: 8, width: 36, height: 36, cursor: "pointer", display: "grid", placeItems: "center" }}><NavIcon name="close" size={14} /></button>
      </div>
      <div className="enogia-fiche-body" style={{ display: "grid", gridTemplateColumns: "268px minmax(0,1fr)", minHeight: 0 }}>
        <nav aria-label="Étapes de la fiche" style={{ borderRight: "1px solid " + T.line, background: T.surface, padding: "14px 10px", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "0 6px 12px", marginBottom: 8, borderBottom: "1px solid " + T.line }}>
            {fact("Certification", myCerts.length ? myCerts.map(c => c.label || c.name || c.id).join(", ") : "N/A")}{fact("Avancement", q.done + " / " + q.total)}
            {fact("FAT client", pd.client ? fd(dIso(pd.client)) : kind === "client" || kind === "both" ? "date à fixer" : "—")}{fact("FAT NOBO", pd.nobo ? fd(dIso(pd.nobo)) : kind === "nobo" || kind === "both" ? "date à fixer" : "—")}
          </div>
          <StepRail steps={steps} cur={cur} onPick={setCur} />
        </nav>
        <main style={{ overflowY: "auto", padding: "20px 24px 28px", minWidth: 0 }}>
          <StepBigCtx.Provider value={true}>
            {(id === "who" || id === "pres" || id === "debug" || id === "sign") && <FatSheet panel bare only={id} r={r} {...{ doc, testers, catalog, conflicts, commit, certifs, canEdit, lead, myTester, who, signApi }} open onToggle={() => {}} />}
            {id === "book" && <><StepHead title="Configuration de l'ORC" lead="Le livret de configuration de cette machine, étape par étape : validez chaque étape, donnez son statut (OK ou Problème) et commentez si besoin. Il s'ouvre comme un livre." />
              <BookStep r={r} plan={plan} book={book || { chapters: [] }} bookApi={bookApi} canMark={canMark} saveTests={saveTests} who={who} canAdmin={canEdit} meta={meta} /></>}
            {id === "tests" && <><StepHead title="Checklist de tests" lead="Les tests FAT de la machine, dans le même tableau que la checklist de debug : OK ou NOK, problème, causalité, correctif et temps passé. Le chef de projet ajoute les demandes spécifiques du client dans le FAT interne." />
              <TestsChecklistStep r={r} plan={plan} catalog={catalog} act={act} canMark={canMark} canAsk={canAsk} saveTests={saveTests} who={who} pr={q}
                extra={canEdit ? <details style={{ marginTop: 14 }}><summary style={{ cursor: "pointer", fontSize: FZ.sm, fontWeight: 600, color: T.ink700, minHeight: 32 }}>Choisir les tests de cette machine</summary><div style={{ marginTop: 10 }}><Checklist {...{ r, plan, catalog, act, canEdit: true, canMark, saveTests, who }} startEdit /></div></details> : null} /></>}
          </StepBigCtx.Provider>
        </main>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 18px", borderTop: "1px solid " + T.line, flexWrap: "wrap" }}>
        <div aria-hidden="true" style={{ display: "flex", gap: 4, flex: "1 1 200px", maxWidth: 420 }}>{steps.map((x, i) => <i key={x.id} style={{ flex: 1, height: 6, borderRadius: 4, background: x.st === "done" ? T.emerald500 : x.st === "bad" ? T.red500 : i === cur ? T.ink900 : T.surfaceAlt }} />)}</div>
        <span style={{ fontSize: 12, color: T.ink500 }}>{nDone} étape{nDone > 1 ? "s" : ""} sur 6 terminée{nDone > 1 ? "s" : ""}</span>
        <span style={{ flex: 1 }} />
        {cur > 0 && <button type="button" onClick={() => setCur(cur - 1)} style={btn(true, "ghost")}>← {steps[cur - 1].t}</button>}
        {cur < 5 && <button type="button" onClick={() => setCur(cur + 1)} style={{ ...themeBtn("pri", "md") }}>Étape suivante : {steps[cur + 1].t}</button>}
      </div>
    </div>
  </div>);
}

// Carte d'une machine dans une colonne : PJ, présence, dates, testeurs, avancement « faits / à réaliser ».
function FatSheet({ r, doc, testers, catalog, conflicts, commit, certifs, canEdit, lead, open, onToggle, myTester, panel, who, bare, signApi, only }) {
  const [newName, setNewName] = useState(""), [limit, setLimit] = useState({});
  const ctx = useMentions();
  const plan = planOf(doc, r.pj);
  const presence = r.clientPresence || null;
  const kind = presenceKind(presence), pd = presenceDates(presence);
  const act = activeSections(kind);
  const meta = getPjMeta(r.pj, r);
  const strip = p => ({ ...p, asks: (p.asks || []).filter(a => !a.fiche) }); // v339 : demandes de la fiche projet jamais recopiées
  const savePlan = p => commit({ plans: { ...(doc.plans || {}), [r.pj]: strip(p) } });
  const saveTests = p => commit({ plans: { ...(doc.plans || {}), [r.pj]: strip(p) } });
  const myConf = new Set(conflicts.filter(c => c.a.pj === r.pj || c.b.pj === r.pj).map(c => c.tid));
  const assigned = plan.assign.map(a => testers.find(t => t.id === a.tid)).filter(Boolean);
  const nTests = act.reduce((n, s) => n + selectedIds(plan, catalog, s).length, 0);
  const minD = dIso(r.tests), maxD = dIso(r.testsFin) || minD;
  const myCerts = (Array.isArray(meta.certifs) ? meta.certifs : []).map(id => (certifs || []).find(c => c.id === id)).filter(Boolean);
  const toggle = t => { const on = plan.assign.some(a => a.tid === t.id); savePlan(on ? unassignTester(plan, t.id) : assignTester(plan, t.id, who)); };
  const addNew = async () => {
    const n = newName.trim(); if (!n) return;
    let t = testers.find(x => x.name.toLowerCase() === n.toLowerCase()), tl = testers;
    if (!t) { const acct = ctx.options.find(o => o.name.toLowerCase() === n.toLowerCase()); t = { id: newId("t"), name: n, email: acct ? acct.email : "" }; tl = [...testers, t]; }
    const p = assignTester(plan, t.id, who);
    const ok = await commit({ testers: tl, plans: { ...(doc.plans || {}), [r.pj]: p } });
    if (ok !== false) setNewName("");
  };
  const mine = !!myTester && plan.assign.some(a => a.tid === myTester.id);
  const canTest = canEdit; // seuls les administrateurs choisissent les tests et les testeurs
  const canMark = canEdit || mine || !!lead; // v238 : le responsable des testeurs aussi ; v187 : le testeur affecté renseigne l'avancement et le résultat de ses tests
  const forced = isForced(plan), ended = !!r.tests && (dIso(r.testsFin) || dIso(r.tests)) < dIso(new Date());
  return (<div id={"fat-" + r.pj} className={panel && !bare ? "enogia-view-in" : undefined} style={bare ? { overflow: "hidden" } : { ...CARD, overflow: "hidden", borderColor: mine ? T.teal500 : undefined }}>
    {panel && (!only || only === "who") && (!bare || (canEdit && (ended || forced))) && <div style={{ padding: bare ? "10px 18px 0" : "10px 14px", borderBottom: bare ? "none" : "1px solid " + T.line, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {!bare && <><PjPlate pj={r.pj} size="lg" /><span style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: FZ.lg, color: T.ink900 }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
      {r.gamme && <span style={{ fontFamily: T.fontLabel, fontSize: FZ.sm, fontWeight: 600, color: T.ink700, border: "1px solid " + T.line, borderRadius: 8, padding: "1px 8px" }}>{r.gamme}</span>}
      <span style={{ width: "100%", fontSize: FZ.xs, color: T.ink500 }}>Tests {period(r)}{mine ? " · vous êtes testeur" : ""}</span></>}
      {canEdit && (ended || forced) && <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: forced ? T.emerald100 : T.surface, borderRadius: 8, padding: "6px 10px", marginTop: 2 }}>
        <span style={{ fontSize: FZ.xs, color: forced ? T.emerald600 : T.ink700, fontWeight: 500, flex: "1 1 180px" }}>{forced ? (plan.forced.auto ? "Tests faits : machine expédiée" : "Validée manuellement" + (plan.forced.by ? " par " + plan.forced.by : "")) + " le " + fd(dIso(plan.forced.at)) + "." : "Période terminée : vous pouvez valider ces tests sans testeur ni test coché (anciennes machines)."}</span>
        {!(forced && plan.forced.auto) && <button type="button" onClick={() => saveTests(setForced(plan, !forced, who))} className="enogia-btn-ind" style={{ border: "1.5px solid " + (forced ? T.ink300 : T.emerald600), background: forced ? "transparent" : T.emerald600, color: forced ? T.ink700 : T.card, borderRadius: 8, padding: "4px 10px", minHeight: 28, fontSize: FZ.xs, fontWeight: 500, cursor: "pointer", fontFamily: T.font }}>{forced ? "Annuler la validation" : "Forcer la validation"}</button>}
      </div>}
    </div>}
    {!panel && <div onClick={onToggle} role="button" aria-expanded={open} tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", cursor: "pointer", flexWrap: "wrap" }}>
      <div style={{ minWidth: 150, flex: "0 1 190px" }}>
        <div style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: FZ.sm, color: T.teal600 }}>{r.pj}{mine && <span style={{ marginLeft: 6, fontFamily: T.font, fontSize: 12, background: T.teal100, color: T.teal600, borderRadius: 999, padding: "1px 7px" }}>Mon test</span>}</div>
        <div title={meta.nomProjet || ""} style={{ fontSize: FZ.xs, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.nomProjet || ""} {r.gamme ? "· " + r.gamme : ""}</div>
      </div>
      <div style={{ fontSize: FZ.sm, color: T.ink700, fontWeight: 600, minWidth: 170 }}>{period(r)}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 90 }}>{kind ? <PresenceChip kind={kind} date={presenceFirstDate(presence)} dates={pd} compact tiny fontSize={10.5} /> : <span style={{ fontSize: FZ.xs, color: T.ink300 }}>Interne seul</span>}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 140 }}>
        {assigned.length === 0
          ? <span style={{ fontSize: FZ.xs, fontWeight: 500, color: T.amber600, background: T.amber100, borderRadius: 999, padding: "2px 10px" }}>À affecter</span>
          : assigned.map(t => <TesterChip key={t.id} t={t} small warn={myConf.has(t.id)} />)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.ink500, fontSize: FZ.xs, fontWeight: 500 }}>{nTests} test{nTests > 1 ? "s" : ""}<span style={{ transform: open ? "rotate(180deg)" : "none", display: "inline-flex" }}><NavIcon name="chevronDown" size={12} /></span></div>
    </div>}
    {open && <div style={{ borderTop: bare ? "none" : "1px solid " + T.line, background: bare ? T.card : T.surface, padding: only ? 0 : bare ? "14px 18px 18px" : 14, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* En-tête de fiche : le haut du tableau « PJ / ORC / Certification / FAT client / FAT NOBO » du fichier de checklist */}
      <div style={{ display: only ? "none" : "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
        {[["PJ", r.pj], ["ORC", r.gamme || "—"], ["Certification", myCerts.length ? myCerts.map(c => <span key={c.id} style={{ marginRight: 4 }}><CertifChip c={c} small /></span>) : "N/A"],
          ["FAT client", pd.client ? fd(pd.client) : kind === "client" || kind === "both" ? "Date à fixer" : "Pas de FAT client"], ["FAT NOBO", pd.nobo ? fd(pd.nobo) : kind === "nobo" || kind === "both" ? "Date à fixer" : "Pas de FAT NOBO"]].map(([l, v]) => (
          <div key={l} style={{ background: T.card, borderRadius: 8, padding: "6px 10px", minWidth: 0 }}><Cap>{l}</Cap><div style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink900, marginTop: 2 }}>{v}</div></div>))}
      </div>
      {/* ① Qui teste ? */}
      {(!only || only === "who") && <Step n="1" title="Qui teste cette machine ?" hint={canEdit ? "Cliquez sur un nom pour l'affecter à toute la période de tests, recliquez pour le retirer." : ""}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {testers.map(t => <TesterChip key={t.id} t={t} on={plan.assign.some(a => a.tid === t.id)} warn={myConf.has(t.id)} onClick={() => toggle(t)} disabled={!canEdit} />)}
          {canEdit && <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input list={"acc-" + r.pj} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addNew(); }} placeholder={testers.length ? "＋ Autre personne…" : "＋ Nom du testeur…"} style={{ ...field(), width: 190 }} />
            <datalist id={"acc-" + r.pj}>{ctx.options.map(o => <option key={o.email} value={o.name} />)}</datalist>
            {newName.trim() && <button onClick={addNew} style={btn(true)}>Ajouter</button>}
          </span>}
          {!canEdit && testers.length === 0 && <span style={{ fontSize: FZ.xs, color: T.ink300 }}>Aucun testeur dans la liste</span>}
        </div>
        {/* v188 : invitation Google Agenda préremplie (période de tests, testeurs invités) */}
        {canEdit && assigned.length > 0 && r.tests && <a href={gcalUrl({ title: "Tests FAT " + r.pj + (r.gamme ? " · " + r.gamme : "") + (meta.nomProjet && meta.nomProjet !== "—" ? " · " + meta.nomProjet : ""), from: minD, to: maxD,
            details: "Tests FAT de la machine " + r.pj + (r.gamme ? " (" + r.gamme + ")" : "") + ".\nTesteurs : " + assigned.map(t => t.name).join(", ") + (kind ? "\nPrésence : " + (kind === "both" ? "client et NOBO" : kind === "nobo" ? "NOBO" : "client") : "") + "\nTests à réaliser : " + nTests + ".",
            location: "ENOGIA, 43 avenue de Boisbaudran, 13015 Marseille", guests: assigned.map(t => t.email) })}
          target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: FZ.xs, fontWeight: 500, color: T.teal600, textDecoration: "none", border: "1.5px solid " + T.teal500, borderRadius: 8, padding: "4px 10px", minHeight: 28, boxSizing: "border-box" }}>
          <NavIcon name="calendar" size={14} />Inviter les testeurs (Google Agenda)</a>}
        {plan.assign.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {plan.assign.map(a => { const t = testers.find(x => x.id === a.tid); if (!t) return null; const eff = effRange(a, r), custom = !!(a.from || a.to), showDates = custom || limit[a.tid]; return (
            <div key={a.tid} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: FZ.xs, color: T.ink500 }}>
              <b style={{ minWidth: 130, color: T.ink700 }}>{t.name}</b>
              {showDates && canEdit
                ? <>du <input type="date" value={a.from || ""} min={minD || undefined} max={maxD || undefined} onChange={e => savePlan(setAssignDates(plan, a.tid, e.target.value, a.to))} style={{ ...field(), padding: "2px 6px" }} />
                  au <input type="date" value={a.to || ""} min={minD || undefined} max={maxD || undefined} onChange={e => savePlan(setAssignDates(plan, a.tid, a.from, e.target.value))} style={{ ...field(), padding: "2px 6px" }} />
                  <button onClick={() => { setLimit(l => ({ ...l, [a.tid]: false })); savePlan(setAssignDates(plan, a.tid, "", "")); }} style={btn(true, "ghost")}>Toute la période</button></>
                : <><span>{custom ? "du " : "toute la période : "}{fd(eff.from)} → {fd(eff.to)}</span>{canEdit && <button onClick={() => setLimit(l => ({ ...l, [a.tid]: true }))} style={btn(true, "ghost")}>Limiter à des dates</button>}</>}
            </div>); })}
        </div>}
      </Step>}
      {/* ② Présence (lecture seule : se règle dans la Liste) */}
      {(!only || only === "pres") && <Step n="2" title="Présence aux tests" hint="Se règle dans la Liste (colonne Tests) : ici en lecture seule.">
        {kind
          ? <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><PresenceChip kind={kind} date={presenceFirstDate(presence)} dates={pd} tiny fontSize={11} />
            {pd.client && <span style={{ fontSize: FZ.xs, color: PRESENCE_META.client.ink, fontWeight: 500 }}>Client le {fd(pd.client)}</span>}{pd.nobo && <span style={{ fontSize: FZ.xs, color: PRESENCE_META.nobo.ink, fontWeight: 500 }}>NOBO le {fd(pd.nobo)}</span>}</div>
          : <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Ni client ni NOBO : seuls les tests internes sont à réaliser.</span>}
      </Step>}
      {/* ③ Tests : dans le volet, checklist « fait » (et choix des tests à réaliser via « Modifier la liste ») */}
      {/* v264 : checklist de debug, au début des tests (modèle Word PI105-047-XX0003) */}
      {panel && (!only || only === "debug") && <Step n="3" title="Checklist de debug (début des tests)" hint={canMark ? "À remplir au début des tests : une ligne par contrôle (OK / NOK), puis à signer ; le PDF reprend le modèle de la procédure." : "Consultation : seuls le testeur affecté et les administrateurs remplissent la checklist."}>
        <DebugChecklistStep {...{ r, plan, saveTests, canMark, who, signApi, SignForm, model: doc.debugModel, vibModel: doc.vibModel, saveModel: canEdit ? (m => commit({ debugModel: m })) : null }} />
      </Step>}
      {panel && !only && <Step n="4" title="Tests" hint={canMark ? "Indiquez pour chaque test : en cours, réussi ou en échec." : "Consultation : seuls le testeur affecté et les administrateurs renseignent les tests."}>
        <Checklist {...{ r, plan, catalog, act, canEdit: canTest, canMark, saveTests, who }} />
      </Step>}
      {panel && (!only || only === "sign") && <Step n="5" title="Signatures et fiche PDF" hint="Chaque testeur indique son nom et sa fonction, puis signe au doigt ou à la souris (ou dépose une image) ; le PV PDF reprend tous les tests, les demandes du client et les signatures.">
        <Signatures {...{ r, plan, assigned, mine, myTester, canEdit, who, signApi, saveTests, catalog, act, testers, meta, myCerts, kind, pd }} />
      </Step>}
      {!panel && <Step n="3" title="Tests à réaliser" hint={canTest ? "Cochez / décochez les tests à réaliser pour cette machine ; les commentaires sont propres à ce PJ." : "Consultation : seuls les administrateurs modifient les tests."}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SECTIONS.map(([k, label]) => {
            const on = act.includes(k), ids = selectedIds(plan, catalog, k), col = SEC_COLOR[k]();
            return (<div key={k} style={{ background: T.card, border: "1px solid " + (on ? SEC_BORDER[k]() : T.line), borderRadius: 12, overflow: "hidden", opacity: on ? 1 : .6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "7px 12px", borderBottom: on ? "1px solid " + T.line : "none" }}>
                <span><b style={{ color: col, fontSize: FZ.sm }}>{label}</b> <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{on ? SEC_WHEN[k] : "Section non applicable : pas de présence " + (k === "client" ? "client" : "NOBO") + " pour ce PJ"}</span></span>
                {on && <span style={{ fontSize: FZ.xs, color: T.ink500, fontWeight: 500 }}>{ids.length}/{catalog[k].length} test{catalog[k].length > 1 ? "s" : ""}</span>}
              </div>
              {on && <>
                {catalog[k].length > 0 && <div style={{fontFamily:T.font,fontSize:12,fontWeight:500,color:T.accentInk,display: "grid",gridTemplateColumns: "26px minmax(150px,1fr) minmax(200px,2fr) minmax(150px,1fr)",gap: "0 10px",padding: "4px 12px"}}><span /><span>Test</span><span>Objectifs</span><span>Commentaires</span></div>}
                {catalog[k].map(tst => { const chk = ids.includes(tst.id); return (
                  <div key={tst.id} style={{ display: "grid", gridTemplateColumns: "26px minmax(150px,1fr) minmax(200px,2fr) minmax(150px,1fr)", gap: "0 10px", padding: "6px 12px", borderTop: "1px solid " + T.surface, alignItems: "start", opacity: chk ? 1 : .55 }}>
                    <input type="checkbox" checked={chk} disabled={!canTest} onChange={() => saveTests(toggleTest(plan, catalog, k, tst.id))} aria-label={tst.name} style={{ marginTop: 3 }} />
                    <span style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink900, textDecoration: chk ? "none" : "line-through" }}>{tst.name}</span>
                    <span style={{ fontSize: FZ.xs, color: T.ink500, whiteSpace: "pre-line", lineHeight: 1.45 }}>{tst.obj}</span>
                    {canTest
                      ? <input defaultValue={plan.notes[tst.id] || ""} key={r.pj + tst.id + (plan.notes[tst.id] || "")} disabled={!chk} onBlur={e => { if (e.target.value !== (plan.notes[tst.id] || "")) saveTests(setNote(plan, tst.id, e.target.value)); }} placeholder="Commentaire" maxLength={300} style={{ ...field(), fontSize: FZ.xs, width: "100%", boxSizing: "border-box" }} />
                      : <span style={{ fontSize: FZ.xs, color: T.ink700 }}>{plan.notes[tst.id] || ""}</span>}
                  </div>); })}
                <div style={{ display: "grid", gridTemplateColumns: "26px minmax(150px,1fr) 3fr", gap: "0 10px", padding: "6px 12px", borderTop: "1px solid " + T.surface, alignItems: "center" }}>
                  <span /><span style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink500 }}>Autre</span>
                  {canTest ? <input defaultValue={plan.extra[k] || ""} key={r.pj + k + (plan.extra[k] || "")} onBlur={e => { if (e.target.value !== (plan.extra[k] || "")) saveTests(setExtra(plan, k, e.target.value)); }} placeholder="Test supplémentaire (texte libre)" maxLength={300} style={{ ...field(), fontSize: FZ.xs, width: "100%", boxSizing: "border-box" }} />
                    : <span style={{ fontSize: FZ.xs, color: T.ink700 }}>{plan.extra[k] || ""}</span>}
                </div>
              </>}
            </div>);
          })}
        </div>
      </Step>}
    </div>}
  </div>);
}

// v186 : checklist du volet — par défaut, seulement les tests à réaliser, avec une case « fait » ; « Modifier la liste » affiche
// tout le catalogue de la partie pour choisir les tests à réaliser (comme avant). Commentaire par test et test libre conservés.
function Checklist({ r, plan, catalog, act, canEdit, canMark, saveTests, who, startEdit }) {
  const [edit, setEdit] = useState(!!startEdit);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {canEdit && <button type="button" onClick={() => setEdit(v => !v)} aria-pressed={edit} className="enogia-btn-ind" style={{ alignSelf: "flex-start", border: "1.5px solid " + T.teal500, background: "transparent", color: T.teal600, borderRadius: 8, padding: "4px 10px", minHeight: 28, fontSize: FZ.xs, fontWeight: 500, cursor: "pointer", fontFamily: T.font }}>{edit ? "Terminer" : "Modifier la liste des tests"}</button>}
    {act.map(k => {
      const label = (SECTIONS.find(x => x[0] === k) || [])[1], sel = selectedIds(plan, catalog, k), done = doneIds(plan, k), items = edit ? catalog[k] : catalog[k].filter(t => sel.includes(t.id));
      const nDone = sel.filter(id => done.includes(id)).length;
      return (<div key={k} style={{ background: T.card, border: "1px solid " + SEC_BORDER[k](), borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "7px 12px", borderBottom: "1px solid " + T.line }}>
          <b style={{ color: SEC_COLOR[k](), fontSize: FZ.sm }}>{label}</b>
          <span style={{ marginLeft: "auto", fontSize: FZ.xs, fontWeight: 500, color: nDone === sel.length && sel.length ? T.emerald600 : T.ink700, fontVariantNumeric: "tabular-nums" }}>{edit ? sel.length + " retenu" + (sel.length > 1 ? "s" : "") : nDone + " / " + sel.length}</span>
        </div>
        {items.length === 0 && <div style={{ padding: "8px 12px", fontSize: FZ.xs, color: T.ink500 }}>Aucun test retenu</div>}
        {items.map(tst => { const stv = statusOf(plan, k, tst.id), by = statusByOf(plan, k, tst.id), chk = edit ? sel.includes(tst.id) : stv === "ok"; return (
          <div key={tst.id} style={{ display: "flex", gap: 10, padding: "8px 12px", borderTop: "1px solid " + T.surface, alignItems: "flex-start", flexWrap: "wrap" }}>
            {edit && <input type="checkbox" checked={chk} disabled={!canEdit} aria-label={"À réaliser : " + tst.name}
              onChange={() => saveTests(toggleTest(plan, catalog, k, tst.id))} style={{ marginTop: 3, width: 16, height: 16, accentColor: stageSoft().finProd.solid }} />}
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <div style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink900, textDecoration: !edit && chk ? "line-through" : "none", textDecorationColor: T.ink300 }}>{tst.name}</div>
              {!edit && by && stv !== "todo" && <div style={{ fontSize: 12, color: T.ink500, marginTop: 2 }}>{(TEST_STATUS.find(x => x[0] === stv) || [])[1]}{by.by ? " · " + by.by : ""}{by.at ? " · " + stamp(by.at) : ""}</div>}
              {(edit || !chk) && tst.obj && <div style={{ fontSize: FZ.xs, color: T.ink500, whiteSpace: "pre-line", lineHeight: 1.45, marginTop: 2 }}>{tst.obj}</div>}
              {!edit && (canMark
                ? <input defaultValue={plan.notes[tst.id] || ""} key={r.pj + tst.id + (plan.notes[tst.id] || "")} onBlur={e => { if (e.target.value !== (plan.notes[tst.id] || "")) saveTests(setNote(plan, tst.id, e.target.value)); }} placeholder="Commentaire" aria-label={"Commentaire : " + tst.name} maxLength={300} style={{ ...field(), fontSize: FZ.xs, width: "100%", boxSizing: "border-box", marginTop: 6 }} />
                : plan.notes[tst.id] ? <div style={{ fontSize: FZ.xs, color: T.ink700, marginTop: 4 }}>{plan.notes[tst.id]}</div> : null)}
            </div>
            {!edit && <StatusPick value={stv} disabled={!canMark} label={tst.name} onPick={v => { if (v !== stv) saveTests(setStatus(plan, k, tst.id, v, who)); }} />}
          </div>); })}
        {(edit || plan.extra[k]) && <div style={{ padding: "8px 12px", borderTop: "1px solid " + T.surface }}>
          {canEdit ? <input defaultValue={plan.extra[k] || ""} key={r.pj + k + (plan.extra[k] || "")} onBlur={e => { if (e.target.value !== (plan.extra[k] || "")) saveTests(setExtra(plan, k, e.target.value)); }} placeholder="Test supplémentaire (texte libre)" aria-label={"Test supplémentaire : " + label} maxLength={300} style={{ ...field(), fontSize: FZ.xs, width: "100%", boxSizing: "border-box" }} />
            : <span style={{ fontSize: FZ.xs, color: T.ink700 }}>Autre : {plan.extra[k]}</span>}
        </div>}
      </div>);
    })}
  </div>);
}

// v195 (demandé) : chaque testeur affecté indique son nom et sa fonction et dépose l'image de sa signature (PNG / JPG, comme sur
// un PDF) ; plus de « Vérifié par » ni de case Client / NOBO. L'image (réduite à 360 × 120 max) va dans planning/testsign_<PJ> via signApi ;
// plan.signs garde { name, fn, at } pour l'état « signé ».
function Signatures({ r, plan, assigned, mine, myTester, canEdit, who, signApi, saveTests, catalog, act, testers, meta, myCerts, kind, pd }) {
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const signs = (plan && plan.signs) || {};
  const sign = async (key, name, fn, img) => {
    if (!signApi) { setErr("Signature indisponible."); return; }
    setBusy(true); setErr("");
    const entry = { name, fn, at: new Date().toISOString(), img };
    const ok = await signApi.save(r.pj, key, entry);
    if (ok !== false) { await saveTests({ ...plan, signs: { ...signs, [key]: { name, fn, at: entry.at } } }); setForm(null); } else setErr("La signature n'a pas pu être enregistrée.");
    setBusy(false);
  };
  const pdf = async () => {
    setBusy(true); setErr("");
    let imgs = {}; try { imgs = signApi ? (await signApi.load(r.pj)) || {} : {}; } catch (e) { imgs = {}; }
    const kindLabel = kind === "both" ? "Client et NOBO" : kind === "client" ? "Client" : kind === "nobo" ? "NOBO" : "Interne seul";
    const presence = [pd.client && "client le " + fd(pd.client), pd.nobo && "NOBO le " + fd(pd.nobo)].filter(Boolean).join(", ");
    // v337 (D12) : les demandes spécifiques du client figurent dans le FAT interne du PV
    const asks = plan.asks || [], catalogX = { ...catalog, interne: [...(catalog.interne || []), ...asks.map(x => ({ id: x.id, name: "Demande du client : " + x.label, obj: x.hint || "" }))] };
    const planX = asks.length ? { ...plan, sel: { ...plan.sel, interne: [...selectedIds(plan, catalog, "interne"), ...asks.map(x => x.id)] } } : plan;
    const ok = openTestReport({ r, meta, plan: planX, catalog: catalogX, act, testers, signs: imgs, certs: myCerts.map(c => c.label || c.name || c.id), base: window.location.origin + (process.env.PUBLIC_URL || "") + "/report/", kindLabel, presence });
    if (!ok) setErr("Le navigateur a bloqué la nouvelle fenêtre : autorisez les fenêtres pour ce site.");
    setBusy(false);
  };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {assigned.length === 0 && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucun testeur affecté</span>}
    {assigned.map(t => { const key = "t:" + t.id, sg = signs[key], canSign = (!!myTester && myTester.id === t.id) || canEdit; return (
      <div key={key} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px", background: T.card, border: "1px solid " + T.line, borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px", minWidth: 0 }}><div style={{ fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>Réalisé par</div><div style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink900 }}>{(sg && sg.name) || t.name}{sg && sg.fn ? <span style={{ fontWeight: 500, color: T.ink500 }}> · {sg.fn}</span> : null}</div></div>
          {sg && <span style={{ fontFamily: T.fontLabel, fontSize: 12, fontWeight: 500, color: T.emerald600, background: T.emerald100, borderRadius: 999, padding: "2px 10px" }}>Signé le {fd(dIso(sg.at))}</span>}
          {canSign && (!form || form.key !== key) && <button type="button" disabled={busy} onClick={() => setForm({ key, name: (sg && sg.name) || t.name, fn: (sg && sg.fn) || "" })} style={btn(true, sg ? "ghost" : undefined)}>{sg ? "Remplacer la signature" : "Signer"}</button>}
          {!canSign && !sg && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Pas encore signé</span>}
        </div>
        {form && form.key === key && <SignForm init={form} busy={busy} onCancel={() => setForm(null)} onSave={(name, fn, img) => sign(key, name, fn, img)} />}
      </div>); })}
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={pdf} disabled={busy} className="enogia-btn-ind" style={{...themeBtn("sec","md")}}><NavIcon name="copy" size={15} />PV de tests (PDF)</button>
      <span style={{ fontSize: FZ.xs, color: T.ink500 }}>S'ouvre dans un nouvel onglet : Imprimer → « Enregistrer au format PDF ».</span>
    </div>
    {err && <div role="alert" style={{ fontSize: FZ.xs, color: T.red500, fontWeight: 500 }}>{err}</div>}
  </div>);
}
// Réduit l'image de signature (PNG / JPG) à 360 × 120 au plus, en PNG, pour rester léger dans Firestore.
const shrinkImage = file => new Promise((res, rej) => {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) { rej(new Error("Choisissez une image PNG ou JPG.")); return; }
  const fr = new FileReader();
  fr.onerror = () => rej(new Error("Lecture de l'image impossible."));
  fr.onload = () => { const im = new Image(); im.onerror = () => rej(new Error("Image illisible.")); im.onload = () => {
    const k = Math.min(1, 360 / im.width, 120 / im.height), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(im, 0, 0, w, h);
    const url = c.toDataURL("image/png"); if (url.length > 150000) { rej(new Error("Image trop lourde : recadrez la signature.")); return; } res(url); };
    im.src = fr.result; };
  fr.readAsDataURL(file);
});
function SignForm({ init, onSave, onCancel, busy }) {
  const [name, setName] = useState(init.name || ""), [fn, setFn] = useState(init.fn || ""), [img, setImg] = useState(null), [err, setErr] = useState(""), [mode, setMode] = useState("pad"); // v337 : signer au doigt ou à la souris
  const pick = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; try { setImg(await shrinkImage(f)); setErr(""); } catch (x) { setErr(x.message); } };
  const ok = name.trim() && fn.trim() && img;
  return (<div className="enogia-view-in" style={{ border: "1.5px solid " + T.teal500, borderRadius: 12, padding: 10, background: T.surface, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>Nom<input value={name} onChange={e => setName(e.target.value)} style={field()} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>Fonction<input value={fn} onChange={e => setFn(e.target.value)} placeholder="Technicien d'essais" style={field()} /></label>
    </div>
    <div role="tablist" aria-label="Façon de signer" style={{ display: "inline-flex", alignSelf: "flex-start", background: T.surfaceAlt, borderRadius: 8, padding: 2, gap: 2 }}>
      {[["pad", "Signer ici"], ["file", "Déposer une image"]].map(([m, l]) => <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setImg(null); }} style={{ border: "none", borderRadius: 8, minHeight: 30, padding: "0 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: T.font, background: mode === m ? T.card : "transparent", color: mode === m ? T.ink900 : T.ink500 }}>{l}</button>)}
    </div>
    {mode === "pad" ? <SignPad onChange={setImg} /> : <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: FZ.xs, fontWeight: 500, color: T.teal600, cursor: "pointer", minHeight: 28 }}>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} style={{ fontSize: FZ.xs }} aria-label="Image de la signature" />
    </label>}
    {img && mode === "file" && <img src={img} alt="Aperçu de la signature" style={{ maxWidth: 240, maxHeight: 80, background: "#fff", border: "1px solid " + T.line, borderRadius: 8, padding: 4, alignSelf: "flex-start" }} />}
    {err && <div role="alert" style={{ fontSize: FZ.xs, color: T.red500, fontWeight: 500 }}>{err}</div>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" disabled={busy || !ok} onClick={() => onSave(name.trim(), fn.trim(), img)} style={btn(!!ok)}>Valider la signature</button>
      <button type="button" onClick={onCancel} style={btn(true, "ghost")}>Annuler</button>
      {!ok && <span style={{ fontSize: FZ.xs, color: T.ink500, alignSelf: "center" }}>Nom, fonction et signature sont nécessaires.</span>}
    </div>
  </div>);
}
// v187 : sélecteur de statut d'un test (À faire / En cours / Réussi / Échec), cibles de 28 px.
const stamp = iso => { const d = new Date(iso); return isNaN(d) ? "" : fd(dIso(d)) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const STATUS_TONE = { todo: () => [T.ink700, T.card], wip: () => [T.amber600, T.amber100], ok: () => [T.emerald600, T.emerald100], ko: () => [T.red600, T.red100] };
function StatusPick({ value, onPick, disabled, label }) {
  return (<div role="radiogroup" aria-label={"Statut : " + label} style={{ display: "inline-flex", gap: 2, background: T.surface, borderRadius: 8, padding: 2, flex: "0 0 auto" }}>
    {TEST_STATUS.map(([v, l]) => { const on = value === v, [ink, bg] = STATUS_TONE[v](); return (
      <button key={v} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onPick(v)}
        style={{ border: "none", borderRadius: 8, padding: "4px 8px", minHeight: 28, fontSize: 12, fontWeight: 500, fontFamily: T.fontLabel, cursor: disabled ? "default" : "pointer", background: on ? bg : "transparent", color: on ? ink : T.ink500, opacity: disabled && !on ? .55 : 1, transition: "background-color var(--e-dur-menu) ease, color var(--e-dur-menu) ease" }}>{l}</button>); })}
  </div>);
}

function Step({ n, title, hint, children }) {
  const big = React.useContext(StepBigCtx);
  if (big) return <div><StepHead title={title} lead={hint} />{children}</div>;
  return (<div style={{ display: "flex", gap: 12 }}>
    <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: "50%", background: T.teal600, color: T.onFill, fontSize: FZ.xs, fontWeight: 500, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{n}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}><span style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink900 }}>{title}</span>{hint && <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{hint}</span>}</div>
      {children}
    </div>
  </div>);
}

// ── v189 : calendrier des tests par testeur (maquette validée) ───────────────────────────────────────────
// Deux semaines ouvrées, une ligne par testeur ; chaque barre = une machine (couleur : interne / client / NOBO),
// avec le PJ, la gamme et l'avancement. Ligne « Sans testeur » en pointillés rouges. Les administrateurs glissent une
// barre sur un testeur pour l'affecter (depuis un autre testeur : la machine passe de l'un à l'autre).
const CAL_DAYS = GRID_DAYS, LANE_H = 36, LABEL_W = 220; // v209 : 3 semaines, lignes de 36 px (même grille que les bancs)
// v260 : agenda d'un testeur (.ics) — ses périodes de banc des 30 derniers jours et à venir
function testerIcs(doc, t, rows) {
  const by = {}; rows.forEach(r => { by[r.pj] = r; }); const since = addDaysIso(toLocalISO(new Date()), -30);
  const ev = assignmentsOf(doc, t.id, rows).filter(a => a.from && a.to >= since).map(a => { const r = by[a.pj] || {}, nom = getPjMeta(a.pj, r).nomProjet;
    return { uid: a.pj + "-" + t.id, from: a.from, to: a.to, title: "Tests " + a.pj + (r.gamme ? " · " + r.gamme : "") + (nom && nom !== "—" ? " · " + nom : ""), details: "Tests au banc de la machine " + a.pj + ".\nCockpit BU ORC — mis à jour le " + new Date().toLocaleDateString("fr-FR") + "." }; });
  downloadIcs(buildIcs(ev, "Tests — " + t.name), "tests-" + t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-") + ".ics");
}
export function TesterTimeline({ doc, rows, testers, catalog, conflicts, commit, canEdit, myTester, openPj, who }) {
  const ctx = useMentions();
  const [offset, setOffset] = useState(0), [edit, setEdit] = useState(null), [del, setDel] = useState(null), [newName, setNewName] = useState("");
  const dnd = usePointerDnD(), over = dnd.over; // v263 : glisser maison (la barre suit la souris)
  const todayIso = toLocalISO(new Date());
  const start = addDaysIso(mondayOf(todayIso), offset * 7);
  const days = []; for (let i = 0; days.length < CAL_DAYS; i++) { const d = addDaysIso(start, i); const wd = (new Date(d + "T12:00:00").getDay() + 6) % 7; if (wd < 5) days.push(d); }
  const end = days[days.length - 1];
  const byPj = useMemo(() => { const m = {}; rows.forEach(r => { m[r.pj] = r; }); return m; }, [rows]);
  const idxFrom = d => { const i = days.findIndex(x => x >= d); return i < 0 ? -1 : i; };
  const idxTo = d => { let i = -1; days.forEach((x, k) => { if (x <= d) i = k; }); return i; };
  const place = it => { const a = Math.max(0, idxFrom(it.from)), b = idxTo(it.to); return b < a || a < 0 ? null : { a, b }; };
  const inWin = it => it.to >= days[0] && it.from <= end && !!place(it);
  const trows = testers.map(t => { const items = packLanes(assignmentsOf(doc, t.id, rows).filter(inWin)); return { t, items, lanes: Math.max(1, ...items.map(i => i.lane + 1)), conflict: items.some(i => i.lane > 0) }; });
  const freeItems = packLanes(rows.filter(r => r.tests && r.etat !== "SHIPPED" && !planOf(doc, r.pj).assign.length && !isForced(planOf(doc, r.pj))).map(r => ({ pj: r.pj, from: dIso(r.tests), to: dIso(r.testsFin) || dIso(r.tests) })).filter(inWin));
  const addTester = async () => { const n = newName.trim(); if (!n || testers.some(t => t.name.toLowerCase() === n.toLowerCase())) return; const acct = ctx.options.find(o => o.name.toLowerCase() === n.toLowerCase()); const ok = await commit({ testers: [...testers, { id: newId("t"), name: n, email: acct ? acct.email : "" }] }); if (ok !== false) setNewName(""); };
  const upd = (id, patch) => commit({ testers: testers.map(t => t.id === id ? { ...t, ...patch } : t) });
  const toneOf = pj => { const r = byPj[pj] || {}, k = presenceKind(r.clientPresence || null), ms = machineState(r, doc, catalog, todayIso); return { ...toneOfSt(ms ? ms.st : "next"), k }; }; // v209 : couleur = état des tests (comme la grille des bancs)
  const dropTo = (tid, d) => {
    if (!canEdit || !d || !d.pj || d.from === tid) return;
    let plan = planOf(doc, d.pj); if (d.from) plan = unassignTester(plan, d.from); plan = assignTester(plan, tid, who);
    commit({ plans: { ...(doc.plans || {}), [d.pj]: plan } });
  };
  const dropZone = tid => canEdit ? dnd.dropProps(tid, d => d.from !== tid, d => dropTo(tid, d)) : {};
  const pct = i => (i / CAL_DAYS * 100) + "%";
  const Bar = ({ it, fromTid, free }) => {
    const pl = place(it); if (!pl) return null;
    const r = byPj[it.pj] || {}, tn = toneOf(it.pj), q = progressOf(planOf(doc, it.pj), catalog, activeSections(tn.k)), warn = it.lane > 0;
    return (<button type="button" className="enogia-cal-bar" {...(canEdit ? dnd.dragProps({ pj: it.pj, from: fromTid || "" }) : {})}
      onKeyDown={e => { if (!canEdit || !fromTid || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return; const i = testers.findIndex(t => t.id === fromTid), t2 = testers[i + (e.key === "ArrowDown" ? 1 : -1)]; if (t2) { e.preventDefault(); dropTo(t2.id, { pj: it.pj, from: fromTid }); } }}
      onClick={() => openPj(it.pj)} title={it.pj + (r.gamme ? " · " + r.gamme : "") + " · " + (getPjMeta(it.pj, r).nomProjet || "") + " · " + fd(it.from) + " → " + fd(it.to) + " · " + q.done + "/" + q.total + " tests" + (warn ? " · chevauche un autre PJ" : "") + (canEdit ? " · glisser pour affecter (flèches haut / bas : testeur voisin)" : "")}
      style={{ opacity: dnd.drag && dnd.drag.pj === it.pj && dnd.drag.from === (fromTid || "") ? 0.35 : 1, position: "absolute", left: "calc(" + pct(pl.a) + " + 3px)", width: "calc(" + pct(pl.b - pl.a + 1) + " - 6px)", top: it.lane * LANE_H + 8, height: LANE_H - 16, boxSizing: "border-box",
        background: free ? "transparent" : tn.bg, color: free ? T.red600 : tn.ink, border: free ? "1.5px dashed " + T.red500 : tn.bd, boxShadow: warn ? "0 0 0 2px " + T.amber600 : "none", borderRadius: 4,
        fontFamily: T.fontLabel, fontSize: 12, fontWeight: 500, cursor: canEdit ? "grab" : "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", padding: "0 6px", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
      <b style={{ fontFamily: T.fontMono }}>{it.pj}</b>{r.gamme && <span>{r.gamme}</span>}{q.total > 0 && <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{q.done}/{q.total}</span>}
    </button>);
  };
  const lanesBox = (items, lanes, tid, free) => (<div className="enogia-cal-drop" {...(free ? {} : dropZone(tid))} style={{ position: "relative", flex: 1, minWidth: 0, height: lanes * LANE_H, background: over === tid ? T.teal100 : "transparent" }}>
    <TrackBg days={days} todayIso={todayIso} />
    {items.length === 0 && <span style={{ position: "absolute", left: 10, top: 0, lineHeight: LANE_H + "px", fontSize: FZ.xs, color: T.ink500 }}>{free ? "Toutes les machines ont un testeur." : "libre"}</span>}
    {items.map(it => <Bar key={it.pj} it={it} fromTid={free ? "" : tid} free={free} />)}
  </div>);
  const labelCell = { width: LABEL_W, flexShrink: 0, padding: "6px 10px", borderRight: "1px solid " + T.line, boxSizing: "border-box" };
  const rowStyle = { display: "flex", borderBottom: "1px solid " + T.line, alignItems: "stretch", minHeight: LANE_H };
  return (<div style={{ ...CARD, overflow: "hidden" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", flexWrap: "wrap" }}>
      <div><h2 style={{ margin: 0, fontSize: FZ.md, fontWeight: 600, color: T.ink900 }}>Testeurs</h2><div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 2 }}>Du {fd(days[0])} au {fd(end)} · une ligne par testeur : qui est pris, qui est libre{canEdit ? " · glissez une barre sur un testeur pour l'affecter" : ""}</div></div>
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <GridLegend />
        {myTester && <button className="e-btn e-btn-sec" type="button" onClick={() => testerIcs(doc, myTester, rows)} title="Télécharger mes périodes de banc pour Outlook / Google Agenda. Réimportez le fichier après une mise à jour du planning : les événements sont mis à jour, pas dupliqués." style={{...themeBtn("sec","sm")}}><NavIcon name="calendar" size={14} />Mon agenda (.ics)</button>}
        <GridNav off={offset} setOff={setOffset} />
      </div>
    </div>
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: LABEL_W + GRID_DAYS * 36 }}>
        <GridHead days={days} todayIso={todayIso} labelStyle={labelCell} label="Testeur" />
        {trows.length === 0 && <div style={{ padding: "14px", fontSize: FZ.sm, color: T.ink500, borderTop: "1px solid " + T.line }}>Aucun testeur pour l'instant{canEdit ? " : ajoutez-en un ci-dessous." : "."}</div>}
        {trows.map(({ t, items, lanes, conflict }) => (
          <div key={t.id} style={rowStyle}>
            <div style={{ ...labelCell, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
              {edit === t.id
                ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <input defaultValue={t.name} onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.name) upd(t.id, { name: v }); }} style={field()} aria-label="Nom" />
                  <input defaultValue={t.email || ""} onBlur={e => { if (e.target.value.trim() !== (t.email || "")) upd(t.id, { email: e.target.value.trim() }); }} placeholder="E-mail (accès à l'onglet)" style={field()} aria-label="E-mail" />
                  <div style={{ display: "flex", gap: 6 }}>
                    {del === t.id ? <><button onClick={() => { setDel(null); setEdit(null); commit(dropTester(doc, t.id)); }} style={{ ...btn(true), background: T.red500 }}>Confirmer</button><button onClick={() => setDel(null)} style={btn(true, "ghost")}>Non</button></>
                      : <><button onClick={() => setEdit(null)} style={btn(true)}>OK</button><button onClick={() => setDel(t.id)} style={btn(true, "ghost")}>Retirer</button></>}
                  </div>
                </div>
                : <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={t.name} tint={personTint(t.name)[0]} size={24} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: FZ.sm, fontWeight: 600, color: myTester && myTester.id === t.id ? T.teal600 : T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                    {conflict ? <div style={{ fontFamily: T.fontLabel, fontSize: 12, fontWeight: 500, color: T.amber600 }}>Chevauchement</div> : <div style={{ fontSize: 12, color: T.ink500 }}>{items.length ? items.length + " machine" + (items.length > 1 ? "s" : "") : "libre"}{!t.email ? " · sans e-mail" : ""}</div>}
                  </div>
                  <button onClick={() => testerIcs(doc, t, rows)} aria-label={"Agenda de " + t.name + " (.ics)"} title={"Agenda de " + t.name + " (.ics) pour Outlook / Google Agenda"} style={{ border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 24, minHeight: 24, padding: 2, lineHeight: 0 }}><NavIcon name="calendar" size={15} /></button>
                  {canEdit && <button onClick={() => setEdit(t.id)} aria-label={"Modifier " + t.name} title="Modifier / retirer" style={{ border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 24, minHeight: 24, padding: 2, lineHeight: 0 }}><NavIcon name="edit" size={15} /></button>}
                </div>}
            </div>
            {lanesBox(items, lanes, t.id, false)}
          </div>))}
        <div style={rowStyle}>
          <div style={{ ...labelCell, display: "flex", alignItems: "center", fontFamily: T.fontLabel, fontSize: FZ.sm, fontWeight: 600, color: T.red600 }}>Sans testeur <span style={{ marginLeft: 6, color: T.ink500, fontWeight: 500 }}>{freeItems.length}</span></div>
          {lanesBox(freeItems, Math.max(1, ...freeItems.map(i => i.lane + 1)), "__free", true)}
        </div>
      </div>
    </div>
    {canEdit && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 14px", borderTop: "1px solid " + T.line, background: T.surface }}>
      <span style={{ fontSize: FZ.xs, fontWeight: 500, color: T.ink500 }}>Équipe de test :</span>
      <input list="tl-accounts" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addTester(); }} placeholder="＋ Ajouter un testeur (nom ou compte connecté)" style={{ ...field(), width: 300 }} />
      <datalist id="tl-accounts">{ctx.options.map(o => <option key={o.email} value={o.name}>{o.email}</option>)}</datalist>
      <button onClick={addTester} disabled={!newName.trim()} style={btn(!!newName.trim())}>Ajouter</button>
      <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Un testeur choisi parmi les comptes connectés reçoit l'accès à cet onglet.</span>
    </div>}
  </div>);
}

// ── Catalogue des tests (FAT interne / client / NOBO) ───────────────────────────────────────
// v209 : un tableau par partie (N°, test, objectifs, actions) — en-têtes 12 px gris, lignes ≥ 36 px, champs sans cadre
// qui en prennent un au survol / à la saisie.
function CatalogView({ doc, catalog, commit }) {
  const [del, setDel] = useState(null), [reset, setReset] = useState(false);
  const setSec = (k, list) => commit({ catalog: { ...catalog, [k]: list } });
  const move = (k, i, d) => { const l = [...catalog[k]]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setSec(k, l); };
  const TH = { ...tableTh({ sticky: true }), padding: "8px 10px" }; // v313 : tableau commun
  const TD = { padding: "4px 6px", borderBottom: "1px solid " + T.line, verticalAlign: "top" };
  const cell = { ...field(), width: "100%", boxSizing: "border-box", border: "1px solid transparent", background: "transparent", minHeight: 32 };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ ...CARD, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: FZ.sm, color: T.ink500 }}>Tests proposés pour chaque PJ (modèle OP022-DP001-A). On coche ensuite ceux à réaliser dans la fiche de tests de chaque machine.</span>
      {reset ? <span style={{ display: "inline-flex", gap: 6 }}><button onClick={() => { setReset(false); commit({ catalog: DEFAULT_TEST_CATALOG }); }} style={{ ...btn(true), background: T.red500 }}>Rétablir le modèle</button><button onClick={() => setReset(false)} style={btn(true, "ghost")}>Annuler</button></span>
        : <button onClick={() => setReset(true)} style={btn(true, "ghost")}>Rétablir le modèle du fichier</button>}
    </div>
    {SECTIONS.map(([k, label, hint]) => (<section key={k} aria-label={label} style={{ ...CARD, padding: 0, overflow: "hidden", borderTop: "3px solid " + SEC_BORDER[k]() }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "10px 14px", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: FZ.md, fontWeight: 600, color: T.ink900 }}>{label}</h2>
        <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{hint} · {catalog[k].length} test{catalog[k].length > 1 ? "s" : ""}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="enogia-cat" style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead><tr><th style={{ ...TH, width: 44, textAlign: "right" }}>N°</th><th style={{ ...TH, width: "30%" }}>Test</th><th style={TH}>Objectifs</th><th style={{ ...TH, width: 190 }} aria-label="Actions" /></tr></thead>
          <tbody>{catalog[k].map((t, i) => (<tr key={t.id}>
            <td style={{ ...TD, textAlign: "right", color: T.ink500, fontVariantNumeric: "tabular-nums", paddingTop: 11, fontSize: FZ.sm }}>{i + 1}</td>
            <td style={TD}><input className="enogia-cat-in" defaultValue={t.name} key={t.id + t.name} onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.name) setSec(k, catalog[k].map(x => x.id === t.id ? { ...x, name: v } : x)); }} style={{ ...cell, fontWeight: 600 }} aria-label={"Nom du test " + (i + 1)} /></td>
            <td style={TD}><textarea className="enogia-cat-in" defaultValue={t.obj || ""} key={t.id + "o" + (t.obj || "")} rows={Math.max(1, Math.min(5, (t.obj || "").split("\n").length))} onBlur={e => { if (e.target.value !== (t.obj || "")) setSec(k, catalog[k].map(x => x.id === t.id ? { ...x, obj: e.target.value } : x)); }} placeholder="Objectifs du test" style={{ ...cell, resize: "vertical", lineHeight: 1.45, color: T.ink700 }} aria-label={"Objectifs du test " + (i + 1)} /></td>
            <td style={{ ...TD, whiteSpace: "nowrap", textAlign: "right" }}>
              <button onClick={() => move(k, i, -1)} disabled={i === 0} style={{ ...btn(i > 0, "ghost"), minWidth: 30, minHeight: 30 }} aria-label={"Monter le test " + (i + 1)}>↑</button>{" "}
              <button onClick={() => move(k, i, 1)} disabled={i === catalog[k].length - 1} style={{ ...btn(i < catalog[k].length - 1, "ghost"), minWidth: 30, minHeight: 30 }} aria-label={"Descendre le test " + (i + 1)}>↓</button>{" "}
              {del === t.id
                ? <><button onClick={() => { setDel(null); commit({ ...dropTestFromPlans(doc, k, t.id), catalog: { ...catalog, [k]: catalog[k].filter(x => x.id !== t.id) } }); }} style={{ ...btn(true), background: T.red500, minHeight: 30 }}>Confirmer</button> <button onClick={() => setDel(null)} style={{ ...btn(true, "ghost"), minHeight: 30 }}>Non</button></>
                : <button onClick={() => setDel(t.id)} style={{ ...btn(true, "ghost"), minHeight: 30 }}>Supprimer</button>}
            </td>
          </tr>))}</tbody>
        </table>
      </div>
      <div style={{ padding: "8px 14px" }}><button onClick={() => setSec(k, [...catalog[k], { id: newId(k[0]), name: "Nouveau test", obj: "" }])} style={btn(true, "ghost")}>＋ Ajouter un test</button></div>
    </section>))}
  </div>);
}
