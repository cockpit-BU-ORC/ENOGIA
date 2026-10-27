// v154 — Page « Tests » (rail de gauche, réservée aux administrateurs et aux testeurs de la liste) :
// fiches de test par machine (modèle OP022-DP001-A), affectation des testeurs aux périodes de tests, frise des testeurs.
// Les dates de venue du client / de NOBO se règlent dans la Liste : ici elles sont en lecture seule.
// Les données vivent dans planning/tests (un seul document).
import React, { useMemo, useState, useEffect, useRef } from "react";
import { T, FZF as FZ, stageSoft, inkOn } from "../theme";
import { getPjMeta, PRESENCE_META, PresenceChip, presenceKind, presenceDates, presenceFirstDate, Avatar, personTint } from "../pjMeta";
import { fmt, toLocalISO } from "../parsers";
import { useMentions } from "../mentionContext";
import { CARD, H_TITLE, H_SUB, EmptyNote } from "./ManagerParts";
import { CertifChip } from "./FicheContrat";
import { NavIcon, PjPlate, pressable } from "./SharedUI";
import { SECTIONS, DEFAULT_TEST_CATALOG, catalogOf, testersOf, planOf, activeSections, selectedIds, toggleTest, setExtra, setNote, assignTester, unassignTester, setAssignDates, effRange, findConflicts, assignmentsOf, dropTester, dropTestFromPlans, newId, packLanes, addDaysIso, mondayOf, testerOfEmail, doneIds, progressOf, TEST_STATUS, statusOf, statusByOf, setStatus, isForced, setForced } from "../testPlan";
import { nameFromEmail } from "../mentions";
import { gcalUrl } from "../gcal";
import { openTestReport } from "../testReport";

const field = () => ({ padding: "5px 9px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, minWidth: 0 });
const btn = (on = true, kind) => ({ border: kind === "ghost" ? "1px solid " + T.line : "none", borderRadius: 8, padding: "5px 12px", fontSize: FZ.xs, fontWeight: 700, fontFamily: T.font, cursor: on ? "pointer" : "default", background: kind === "ghost" ? T.card : on ? T.navy700 : T.ink100, color: kind === "ghost" ? T.ink700 : "#fff", flexShrink: 0 });
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
    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: on ? T.teal100 : T.card, border: "1.5px solid " + (warn ? T.amber500 : on ? T.teal500 : T.line), borderRadius: 999, padding: small ? "1px 9px 1px 3px" : "3px 12px 3px 4px", fontSize: FZ.xs, fontWeight: 700, color: warn ? T.amber600 : on ? T.teal600 : T.ink700, cursor: interactive && !disabled ? "pointer" : "default", opacity: disabled && interactive && !on ? .6 : 1, userSelect: "none" }}>
    <Avatar name={t.name} tint={personTint(t.name)[0]} size={small ? 18 : 22} />{t.name}{on && interactive ? " ✓" : ""}{warn ? " ⚠" : ""}
  </span>);
}

export function TestsTab({ doc, save, data, certifs, canEdit, me, signApi }) {
  const [sub, setSub] = useState("semaine"); // v186 : vue par semaine par défaut (maquette validée)
  const [focus, setFocus] = useState(null);
  const [msg, setMsg] = useState(null);
  const testers = testersOf(doc), catalog = catalogOf(doc);
  const myTester = testerOfEmail(doc, me);
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE"), [data]);
  const conflicts = useMemo(() => findConflicts(doc, rows), [doc, rows]);
  const who = (myTester && myTester.name) || nameFromEmail(me || "");
  const commit = async next => { if (!canEdit && !myTester) return false; const ok = await save({ ...doc, ...next }); setMsg(ok === false ? "L'enregistrement a échoué." : null); return ok; };
  const SUBS = [["semaine", "Par semaine"], ["testers", "Par testeur"], ...(canEdit ? [["catalog", "Catalogue"]] : [])];
  const openPj = pj => { setFocus({ pj, n: Date.now() }); setSub("semaine"); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div>
        <div style={H_SUB}>{canEdit ? "Qui teste quelle machine, quand, et quels tests faire en interne, avec le client et avec NOBO." : "Vos machines en test : indiquez l'avancement et le résultat de chaque test."}</div>
      </div>
      <div role="tablist" style={{ display: "inline-flex", background: T.surface, border: "1px solid " + T.line, borderRadius: 10, padding: 2, gap: 2 }}>
        {SUBS.map(([id, l]) => <button key={id} role="tab" aria-selected={sub === id} onClick={() => setSub(id)} style={{ border: "none", cursor: "pointer", borderRadius: 8, padding: "6px 14px", fontSize: FZ.sm, fontWeight: 700, fontFamily: T.font, background: sub === id ? T.card : "transparent", color: sub === id ? T.teal600 : T.ink500, boxShadow: sub === id ? T.shadowSm : "none" }}>{l}</button>)}
      </div>
    </div>
    {msg && <div role="alert" style={{ color: T.red500, fontSize: FZ.sm, fontWeight: 600 }}>{msg}</div>}
    {conflicts.length > 0 && sub !== "catalog" && <div role="status" style={{ background: T.amber100, color: T.amber600, borderRadius: 10, padding: "8px 12px", fontSize: FZ.sm, fontWeight: 600 }}>
      <span style={{ display: "inline-flex", verticalAlign: "-3px", marginRight: 6 }}><NavIcon name="warning" size={16} /></span>{conflicts.length} chevauchement{conflicts.length > 1 ? "s" : ""} : {conflicts.slice(0, 4).map(c => { const t = testers.find(x => x.id === c.tid); return (t ? t.name : "Testeur") + " sur " + c.a.pj + " et " + c.b.pj; }).join(" · ")}{conflicts.length > 4 ? " …" : ""}
    </div>}
    {sub === "semaine" && <WeekBoard {...{ doc, rows, testers, catalog, conflicts, commit, certifs, canEdit, myTester, focus, who, signApi }} />}
    {sub === "testers" && <TesterTimeline {...{ doc, rows, testers, catalog, conflicts, commit, canEdit, myTester, openPj, who }} />}
    {sub === "catalog" && canEdit && <CatalogView {...{ doc, catalog, commit }} />}
  </div>);
}

// ── v186 : Tests par semaine (maquette validée) ─────────────────────────────────────────────────────────────────
// Trois colonnes (cette semaine, la suivante, dans deux semaines), une carte par machine dont la période de tests touche la
// semaine (rangée dans la première semaine concernée) ; un volet à droite reprend la fiche de la machine choisie, avec la
// checklist des tests à cocher « fait ». Les machines dont la période est passée sans que tout soit fait restent dans la
// première colonne, signalées « En retard ».
const mondayD = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const isoWeek = d => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - n); const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y) / 86400000 + 1) / 7); };
function WeekBoard({ doc, rows, testers, catalog, conflicts, commit, certifs, canEdit, myTester, focus, who, signApi }) {
  const [sel, setSel] = useState(null);
  const [onlyMine, setOnlyMine] = useState(!!myTester && !canEdit);
  useEffect(() => { if (focus && focus.pj) setSel(focus.pj); }, [focus]);
  const w0 = mondayD(new Date());
  const weeks = [0, 1, 2].map(i => { const a = new Date(w0); a.setDate(a.getDate() + 7 * i); const b = new Date(a); b.setDate(b.getDate() + 7); return { a, b, i }; });
  const startOf = r => new Date(dIso(r.tests) + "T00:00:00"), endOf = r => new Date((dIso(r.testsFin) || dIso(r.tests)) + "T23:59:59");
  const isMine = r => !!myTester && planOf(doc, r.pj).assign.some(a => a.tid === myTester.id);
  const pr = r => progressOf(planOf(doc, r.pj), catalog, activeSections(presenceKind(r.clientPresence || null)));
  const withP = rows.filter(r => r.tests && r.etat !== "SHIPPED" && (!onlyMine || isMine(r)));
  const cols = weeks.map(w => ({ ...w, items: [] }));
  // v200 (demandé : « une colonne de tests finis, comme dans un Kanban ») : une machine dont tous les tests sont faits (ou validée) passe dans « Terminés » (60 derniers jours).
  const isDone = r => { const pl = planOf(doc, r.pj), q = pr(r); return isForced(pl) || (q.total > 0 && q.done === q.total); };
  const lim = new Date(w0); lim.setDate(lim.getDate() - 60);
  const doneCol = { a: null, b: null, i: 3, done: true, items: [] };
  withP.forEach(r => {
    if (isDone(r)) { if (endOf(r) >= lim) doneCol.items.push({ r, late: false }); return; }
    const c = cols.find(w => startOf(r) < w.b && endOf(r) >= w.a);
    if (c) c.items.push({ r, late: false });
    else if (endOf(r) < weeks[0].a) { const q = pr(r); if (q.total > q.done && !isForced(planOf(doc, r.pj))) cols[0].items.push({ r, late: true }); }
  });
  cols.forEach(c => c.items.sort((x, y) => (y.late - x.late) || (startOf(x.r) - startOf(y.r))));
  doneCol.items.sort((x, y) => endOf(y.r) - endOf(x.r));
  cols.push(doneCol);
  const later = withP.filter(r => startOf(r) >= weeks[2].b).length, noPeriod = rows.filter(r => !r.tests && r.etat !== "SHIPPED").length;
  const all = cols.flatMap(c => c.items.map(x => x.r));
  const cur = sel ? (all.find(r => r.pj === sel) || rows.find(r => r.pj === sel) || null) : null;
  const COL_TITLE = ["Cette semaine", "Semaine prochaine", "Dans 2 semaines", "Terminés"];
  return (<div className="enogia-tests-board">
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: FZ.xs, color: T.ink500 }}>
        <span>S{isoWeek(weeks[0].a)} → S{isoWeek(weeks[2].a)} · {all.length} machine{all.length > 1 ? "s" : ""}{later ? " · " + later + " plus tard" : ""}{noPeriod ? " · " + noPeriod + " sans période de tests" : ""}</span>
        {myTester && <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto", minHeight: 24, cursor: "pointer", color: T.ink700, fontWeight: 600 }}><input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} />Seulement mes tests</label>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, alignItems: "start" }}>
        {cols.map((c, ci) => (<section key={ci} aria-label={COL_TITLE[ci]} style={{ background: T.card, border: "1px solid " + T.line, borderTop: "3px solid " + (c.done ? stageSoft().finProd.solid : ci === 0 ? stageSoft().tests.solid : T.line), borderRadius: "0 0 10px 10px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "8px 12px", borderBottom: "1px solid " + T.line }}>
            <h3 style={{ margin: 0, fontSize: FZ.sm, fontWeight: 700, color: T.ink900 }}>{COL_TITLE[ci]}</h3>
            <span style={{ marginLeft: "auto", fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{c.done ? "60 derniers jours · " : "S" + isoWeek(c.a) + " · "}{c.items.length}</span>
          </div>
          {c.items.length === 0 && <div style={{ fontSize: FZ.xs, color: T.ink500, padding: "10px 12px" }}>{c.done ? "Aucune machine terminée ces 60 derniers jours." : "Aucun test prévu."}</div>}
          <div className="enogia-stagger" style={{ display: "flex", flexDirection: "column" }}>
            {c.items.map(({ r, late }) => <TestCard key={r.pj} {...{ r, doc, testers, catalog, conflicts, late }} on={cur && cur.pj === r.pj} onPick={() => setSel(r.pj)} />)}
          </div>
        </section>))}
      </div>
    </div>
    {all.length === 0 && <EmptyNote>Aucune machine en test sur ces trois semaines.</EmptyNote>}
    {cur && <TestDialog r={cur} onClose={() => setSel(null)} {...{ doc, testers, catalog, conflicts, commit, certifs, canEdit, myTester, who, signApi }} />}
  </div>);
}

// v189 — pop-up central de la fiche de tests (fond assombri, entrée 200 ms, Échap pour fermer, focus gardé dans le pop-up).
export function TestDialog({ r, onClose, doc, testers, catalog, conflicts, commit, certifs, canEdit, myTester, who, signApi }) {
  const box = useRef(null);
  useEffect(() => {
    const prev = document.activeElement, k = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k); if (box.current) box.current.focus();
    const ov = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ov; if (prev && prev.focus) prev.focus(); };
  }, [onClose]);
  const plan = planOf(doc, r.pj), kind = presenceKind(r.clientPresence || null), q = progressOf(plan, catalog, activeSections(kind)), meta = getPjMeta(r.pj, r);
  const pct = q.total ? Math.round(q.done / q.total * 100) : 0, S = stageSoft();
  const Num = ({ l, v, c }) => <div style={{ background: T.surface, borderRadius: 10, padding: "8px 12px", minWidth: 0 }}><div style={{ fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>{l}</div><div style={{ fontFamily: T.fontDisplay, fontSize: 24, fontWeight: 600, color: c || T.ink900, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{v}</div></div>;
  return (<div className="enogia-test-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(8,12,28,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "4vh 12px", overflowY: "auto" }}>
    <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={"Tests de " + r.pj} className="enogia-test-dialog" style={{ width: "min(880px,100%)", background: T.card, borderRadius: 16, border: "1px solid " + T.line, boxShadow: "0 24px 70px rgba(0,0,0,.28)", outline: "none", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid " + T.line, flexWrap: "wrap", background: T.card, position: "sticky", top: 0, zIndex: 2 }}>
        <PjPlate pj={r.pj} size="lg" />
        {r.gamme && <span style={{ fontFamily: T.fontLabel, fontSize: FZ.sm, fontWeight: 600, color: T.ink700, border: "1px solid " + T.line, borderRadius: 6, padding: "1px 8px" }}>{r.gamme}</span>}
        <span style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: FZ.lg, color: T.ink900, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 160px" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
        <span style={{ fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{period(r)}</span>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: "none", background: T.surface, color: T.ink700, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ padding: "12px 18px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        <Num l="Avancement" v={q.done + " / " + q.total} /><Num l="Réussis" v={q.ok} c={T.emerald600} /><Num l="Échecs" v={q.ko} c={q.ko ? T.red600 : undefined} /><Num l="En cours" v={q.wip} c={q.wip ? T.amber600 : undefined} />
      </div>
      <div aria-hidden="true" style={{ margin: "10px 18px 0", height: 6, borderRadius: 3, background: T.surfaceAlt, overflow: "hidden" }}><div className="enogia-bar-fill" style={{ width: pct + "%", height: "100%", background: S.finProd.solid, transition: "width .3s cubic-bezier(.16,1,.3,1)" }} /></div>
      <FatSheet panel bare r={r} {...{ doc, testers, catalog, conflicts, commit, certifs, canEdit, myTester, who, signApi }} open onToggle={() => {}} />
    </div>
  </div>);
}

// Carte d'une machine dans une colonne : PJ, présence, dates, testeurs, avancement « faits / à réaliser ».
function TestCard({ r, doc, testers, catalog, conflicts, late, on, onPick }) {
  // v197 (taste-skill : lignes de 44 px, une seule marque d'état, chiffres tabulaires à droite) : ligne de liste compacte, plus de grande tuile.
  const plan = planOf(doc, r.pj), kind = presenceKind(r.clientPresence || null), act = activeSections(kind), q = progressOf(plan, catalog, act);
  const assigned = plan.assign.map(a => testers.find(t => t.id === a.tid)).filter(Boolean);
  const forced = isForced(plan), conf = conflicts.some(c => c.a.pj === r.pj || c.b.pj === r.pj), noTester = assigned.length === 0 && !forced, full = forced || (q.total > 0 && q.done === q.total);
  const S = stageSoft(), edge = noTester || late ? T.red500 : full ? S.finProd.solid : S.tests.solid;
  const meta = getPjMeta(r.pj, r), pct = q.total ? Math.round(q.done / q.total * 100) : 0;
  const tag = (txt, ink, bg) => <span style={{ fontFamily: T.fontLabel, fontSize: 11, fontWeight: 600, color: ink, background: bg, borderRadius: 999, padding: "0 7px", lineHeight: "18px", whiteSpace: "nowrap" }}>{txt}</span>;
  return (<div {...pressable(onPick, { "aria-pressed": !!on, "aria-label": r.pj + " — " + (meta.nomProjet || "") + " — " + q.done + " tests faits sur " + q.total })} className="enogia-test-row"
    style={{ borderLeft: "3px solid " + edge, borderTop: "1px solid " + T.line, background: on ? T.teal100 : T.card, padding: "6px 12px 7px 10px", cursor: "pointer", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <PjPlate pj={r.pj} />
      {r.gamme && <span style={{ fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, color: T.ink700, whiteSpace: "nowrap" }}>{r.gamme}</span>}
      <span title={meta.nomProjet || ""} style={{ flex: 1, minWidth: 0, fontSize: FZ.sm, color: T.ink700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
      <span style={{ fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fdm(dIso(r.tests))}{r.testsFin ? " → " + fdm(dIso(r.testsFin)) : ""}</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
      {noTester ? tag("Sans testeur", T.red600, T.red100) : <span style={{ display: "inline-flex" }}>{assigned.slice(0, 4).map((t, i) => <span key={t.id} title={t.name} style={{ marginLeft: i ? -5 : 0, borderRadius: "50%", boxShadow: "0 0 0 2px " + (on ? T.teal100 : T.card), display: "inline-flex" }}><Avatar name={t.name} tint={personTint(t.name)[0]} size={18} /></span>)}</span>}
      {kind && <PresenceChip kind={kind} compact tiny />}
      {late && tag("En retard", T.red600, T.red100)}
      {forced && tag("Validé (forcé)", T.emerald600, T.emerald100)}
      {q.ko > 0 && tag(q.ko + " échec" + (q.ko > 1 ? "s" : ""), T.red600, T.red100)}
      {conf && tag("Conflit", T.amber600, T.amber100)}
      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden="true" style={{ width: 48, height: 4, borderRadius: 2, background: T.surfaceAlt, overflow: "hidden" }}><i className="enogia-bar-fill" style={{ display: "block", width: pct + "%", height: "100%", background: S.finProd.solid }} /></span>
        <span style={{ fontSize: FZ.xs, fontWeight: 700, color: full ? T.emerald600 : T.ink700, fontVariantNumeric: "tabular-nums", minWidth: 34, textAlign: "right" }}>{q.done}/{q.total}</span>
      </span>
    </div>
  </div>);
}

function FatSheet({ r, doc, testers, catalog, conflicts, commit, certifs, canEdit, open, onToggle, myTester, panel, who, bare, signApi }) {
  const [newName, setNewName] = useState(""), [limit, setLimit] = useState({});
  const ctx = useMentions();
  const plan = planOf(doc, r.pj);
  const presence = r.clientPresence || null;
  const kind = presenceKind(presence), pd = presenceDates(presence);
  const act = activeSections(kind);
  const meta = getPjMeta(r.pj, r);
  const savePlan = p => commit({ plans: { ...(doc.plans || {}), [r.pj]: p } });
  const saveTests = p => commit({ plans: { ...(doc.plans || {}), [r.pj]: p } });
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
  const canMark = canEdit || mine; // v187 : le testeur affecté renseigne l'avancement et le résultat de ses tests
  const forced = isForced(plan), ended = !!r.tests && (dIso(r.testsFin) || dIso(r.tests)) < dIso(new Date());
  return (<div id={"fat-" + r.pj} className={panel && !bare ? "enogia-view-in" : undefined} style={bare ? { overflow: "hidden" } : { ...CARD, overflow: "hidden", borderColor: mine ? T.teal500 : undefined }}>
    {panel && (!bare || (canEdit && (ended || forced))) && <div style={{ padding: bare ? "10px 18px 0" : "10px 14px", borderBottom: bare ? "none" : "1px solid " + T.line, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {!bare && <><PjPlate pj={r.pj} size="lg" /><span style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: FZ.lg, color: T.ink900 }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
      {r.gamme && <span style={{ fontFamily: T.fontLabel, fontSize: FZ.sm, fontWeight: 600, color: T.ink700, border: "1px solid " + T.line, borderRadius: 6, padding: "1px 8px" }}>{r.gamme}</span>}
      <span style={{ width: "100%", fontSize: FZ.xs, color: T.ink500 }}>Tests {period(r)}{mine ? " · vous êtes testeur" : ""}</span></>}
      {canEdit && (ended || forced) && <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: forced ? T.emerald100 : T.surface, borderRadius: 8, padding: "6px 10px", marginTop: 2 }}>
        <span style={{ fontSize: FZ.xs, color: forced ? T.emerald600 : T.ink700, fontWeight: 600, flex: "1 1 180px" }}>{forced ? "Validée manuellement" + (plan.forced.by ? " par " + plan.forced.by : "") + " le " + fd(dIso(plan.forced.at)) + "." : "Période terminée : vous pouvez valider ces tests sans testeur ni test coché (anciennes machines)."}</span>
        <button type="button" onClick={() => saveTests(setForced(plan, !forced, who))} className="enogia-btn-ind" style={{ border: "1.5px solid " + (forced ? T.ink300 : T.emerald600), background: forced ? "transparent" : T.emerald600, color: forced ? T.ink700 : T.card, borderRadius: 8, padding: "4px 10px", minHeight: 28, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>{forced ? "Annuler la validation" : "Forcer la validation"}</button>
      </div>}
    </div>}
    {!panel && <div onClick={onToggle} role="button" aria-expanded={open} tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", cursor: "pointer", flexWrap: "wrap" }}>
      <div style={{ minWidth: 150, flex: "0 1 190px" }}>
        <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: FZ.sm, color: T.teal600 }}>{r.pj}{mine && <span style={{ marginLeft: 6, fontFamily: T.font, fontSize:11, background: T.teal100, color: T.teal600, borderRadius: 999, padding: "1px 7px" }}>Mon test</span>}</div>
        <div title={meta.nomProjet || ""} style={{ fontSize: FZ.xs, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.nomProjet || ""} {r.gamme ? "· " + r.gamme : ""}</div>
      </div>
      <div style={{ fontSize: FZ.sm, color: T.ink700, fontWeight: 600, minWidth: 170 }}>{period(r)}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 90 }}>{kind ? <PresenceChip kind={kind} date={presenceFirstDate(presence)} dates={pd} compact tiny fontSize={10.5} /> : <span style={{ fontSize: FZ.xs, color: T.ink300 }}>Interne seul</span>}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 140 }}>
        {assigned.length === 0
          ? <span style={{ fontSize: FZ.xs, fontWeight: 700, color: T.amber600, background: T.amber100, borderRadius: 999, padding: "2px 10px" }}>À affecter</span>
          : assigned.map(t => <TesterChip key={t.id} t={t} small warn={myConf.has(t.id)} />)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.ink500, fontSize: FZ.xs, fontWeight: 600 }}>{nTests} test{nTests > 1 ? "s" : ""}<span style={{ transform: open ? "rotate(180deg)" : "none", display: "inline-flex" }}><NavIcon name="chevronDown" size={12} /></span></div>
    </div>}
    {open && <div style={{ borderTop: bare ? "none" : "1px solid " + T.line, background: bare ? T.card : T.surface, padding: bare ? "14px 18px 18px" : 14, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* En-tête de fiche : le haut du tableau « PJ / ORC / Certification / FAT client / FAT NOBO » du fichier de checklist */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
        {[["PJ", r.pj], ["ORC", r.gamme || "—"], ["Certification", myCerts.length ? myCerts.map(c => <span key={c.id} style={{ marginRight: 4 }}><CertifChip c={c} small /></span>) : "N/A"],
          ["FAT client", pd.client ? fd(pd.client) : kind === "client" || kind === "both" ? "Date à fixer" : "Pas de FAT client"], ["FAT NOBO", pd.nobo ? fd(pd.nobo) : kind === "nobo" || kind === "both" ? "Date à fixer" : "Pas de FAT NOBO"]].map(([l, v]) => (
          <div key={l} style={{ background: T.card, borderRadius: 8, padding: "6px 10px", minWidth: 0 }}><Cap>{l}</Cap><div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, marginTop: 2 }}>{v}</div></div>))}
      </div>
      {/* ① Qui teste ? */}
      <Step n="1" title="Qui teste cette machine ?" hint={canEdit ? "Cliquez sur un nom pour l'affecter à toute la période de tests, recliquez pour le retirer." : ""}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {testers.map(t => <TesterChip key={t.id} t={t} on={plan.assign.some(a => a.tid === t.id)} warn={myConf.has(t.id)} onClick={() => toggle(t)} disabled={!canEdit} />)}
          {canEdit && <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input list={"acc-" + r.pj} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addNew(); }} placeholder={testers.length ? "＋ Autre personne…" : "＋ Nom du testeur…"} style={{ ...field(), width: 190 }} />
            <datalist id={"acc-" + r.pj}>{ctx.options.map(o => <option key={o.email} value={o.name} />)}</datalist>
            {newName.trim() && <button onClick={addNew} style={btn(true)}>Ajouter</button>}
          </span>}
          {!canEdit && testers.length === 0 && <span style={{ fontSize: FZ.xs, color: T.ink300 }}>Aucun testeur dans la liste.</span>}
        </div>
        {/* v188 : invitation Google Agenda préremplie (période de tests, testeurs invités) */}
        {canEdit && assigned.length > 0 && r.tests && <a href={gcalUrl({ title: "Tests FAT " + r.pj + (r.gamme ? " · " + r.gamme : "") + (meta.nomProjet && meta.nomProjet !== "—" ? " · " + meta.nomProjet : ""), from: minD, to: maxD,
            details: "Tests FAT de la machine " + r.pj + (r.gamme ? " (" + r.gamme + ")" : "") + ".\nTesteurs : " + assigned.map(t => t.name).join(", ") + (kind ? "\nPrésence : " + (kind === "both" ? "client et NOBO" : kind === "nobo" ? "NOBO" : "client") : "") + "\nTests à réaliser : " + nTests + ".",
            location: "ENOGIA, 43 avenue de Boisbaudran, 13015 Marseille", guests: assigned.map(t => t.email) })}
          target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: FZ.xs, fontWeight: 700, color: T.teal600, textDecoration: "none", border: "1.5px solid " + T.teal500, borderRadius: 8, padding: "4px 10px", minHeight: 28, boxSizing: "border-box" }}>
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
      </Step>
      {/* ② Présence (lecture seule : se règle dans la Liste) */}
      <Step n="2" title="Présence aux tests" hint="Se règle dans la Liste (colonne Tests) : ici en lecture seule.">
        {kind
          ? <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><PresenceChip kind={kind} date={presenceFirstDate(presence)} dates={pd} tiny fontSize={11} />
            {pd.client && <span style={{ fontSize: FZ.xs, color: PRESENCE_META.client.ink, fontWeight: 700 }}>Client le {fd(pd.client)}</span>}{pd.nobo && <span style={{ fontSize: FZ.xs, color: PRESENCE_META.nobo.ink, fontWeight: 700 }}>NOBO le {fd(pd.nobo)}</span>}</div>
          : <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Ni client ni NOBO : seuls les tests internes sont à réaliser.</span>}
      </Step>
      {/* ③ Tests : dans le volet, checklist « fait » (et choix des tests à réaliser via « Modifier la liste ») */}
      {panel && <Step n="3" title="Tests" hint={canMark ? "Indiquez pour chaque test : en cours, réussi ou en échec." : "Consultation : seuls le testeur affecté et les administrateurs renseignent les tests."}>
        <Checklist {...{ r, plan, catalog, act, canEdit: canTest, canMark, saveTests, who }} />
      </Step>}
      {panel && <Step n="4" title="Signatures et fiche PDF" hint="Chaque testeur indique son nom, sa fonction et dépose l'image de sa signature ; la fiche PDF reprend tous les tests, les heures et les signatures.">
        <Signatures {...{ r, plan, assigned, mine, myTester, canEdit, who, signApi, saveTests, catalog, act, testers, meta, myCerts, kind, pd }} />
      </Step>}
      {!panel && <Step n="3" title="Tests à réaliser" hint={canTest ? "Cochez / décochez les tests à réaliser pour cette machine ; les commentaires sont propres à ce PJ." : "Consultation : seuls les administrateurs modifient les tests."}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SECTIONS.map(([k, label]) => {
            const on = act.includes(k), ids = selectedIds(plan, catalog, k), col = SEC_COLOR[k]();
            return (<div key={k} style={{ background: T.card, border: "1px solid " + (on ? SEC_BORDER[k]() : T.line), borderRadius: 10, overflow: "hidden", opacity: on ? 1 : .6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "7px 12px", borderBottom: on ? "1px solid " + T.line : "none" }}>
                <span><b style={{ color: col, fontSize: FZ.sm }}>{label}</b> <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{on ? SEC_WHEN[k] : "Section non applicable : pas de présence " + (k === "client" ? "client" : "NOBO") + " pour ce PJ"}</span></span>
                {on && <span style={{ fontSize: FZ.xs, color: T.ink500, fontWeight: 600 }}>{ids.length}/{catalog[k].length} test{catalog[k].length > 1 ? "s" : ""}</span>}
              </div>
              {on && <>
                {catalog[k].length > 0 && <div style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk,display: "grid",gridTemplateColumns: "26px minmax(150px,1fr) minmax(200px,2fr) minmax(150px,1fr)",gap: "0 10px",padding: "4px 12px"}}><span /><span>Test</span><span>Objectifs</span><span>Commentaires</span></div>}
                {catalog[k].map(tst => { const chk = ids.includes(tst.id); return (
                  <div key={tst.id} style={{ display: "grid", gridTemplateColumns: "26px minmax(150px,1fr) minmax(200px,2fr) minmax(150px,1fr)", gap: "0 10px", padding: "6px 12px", borderTop: "1px solid " + T.surface, alignItems: "start", opacity: chk ? 1 : .55 }}>
                    <input type="checkbox" checked={chk} disabled={!canTest} onChange={() => saveTests(toggleTest(plan, catalog, k, tst.id))} aria-label={tst.name} style={{ marginTop: 3 }} />
                    <span style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, textDecoration: chk ? "none" : "line-through" }}>{tst.name}</span>
                    <span style={{ fontSize: FZ.xs, color: T.ink500, whiteSpace: "pre-line", lineHeight: 1.45 }}>{tst.obj}</span>
                    {canTest
                      ? <input defaultValue={plan.notes[tst.id] || ""} key={r.pj + tst.id + (plan.notes[tst.id] || "")} disabled={!chk} onBlur={e => { if (e.target.value !== (plan.notes[tst.id] || "")) saveTests(setNote(plan, tst.id, e.target.value)); }} placeholder="Commentaire" maxLength={300} style={{ ...field(), fontSize: FZ.xs, width: "100%", boxSizing: "border-box" }} />
                      : <span style={{ fontSize: FZ.xs, color: T.ink700 }}>{plan.notes[tst.id] || ""}</span>}
                  </div>); })}
                <div style={{ display: "grid", gridTemplateColumns: "26px minmax(150px,1fr) 3fr", gap: "0 10px", padding: "6px 12px", borderTop: "1px solid " + T.surface, alignItems: "center" }}>
                  <span /><span style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink500 }}>Autre</span>
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
function Checklist({ r, plan, catalog, act, canEdit, canMark, saveTests, who }) {
  const [edit, setEdit] = useState(false);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {canEdit && <button type="button" onClick={() => setEdit(v => !v)} aria-pressed={edit} className="enogia-btn-ind" style={{ alignSelf: "flex-start", border: "1.5px solid " + T.teal500, background: "transparent", color: T.teal600, borderRadius: 8, padding: "4px 10px", minHeight: 28, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>{edit ? "Terminer" : "Modifier la liste des tests"}</button>}
    {act.map(k => {
      const label = (SECTIONS.find(x => x[0] === k) || [])[1], sel = selectedIds(plan, catalog, k), done = doneIds(plan, k), items = edit ? catalog[k] : catalog[k].filter(t => sel.includes(t.id));
      const nDone = sel.filter(id => done.includes(id)).length;
      return (<div key={k} style={{ background: T.card, border: "1px solid " + SEC_BORDER[k](), borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "7px 12px", borderBottom: "1px solid " + T.line }}>
          <b style={{ color: SEC_COLOR[k](), fontSize: FZ.sm }}>{label}</b>
          <span style={{ marginLeft: "auto", fontSize: FZ.xs, fontWeight: 700, color: nDone === sel.length && sel.length ? T.emerald600 : T.ink700, fontVariantNumeric: "tabular-nums" }}>{edit ? sel.length + " retenu" + (sel.length > 1 ? "s" : "") : nDone + " / " + sel.length}</span>
        </div>
        {items.length === 0 && <div style={{ padding: "8px 12px", fontSize: FZ.xs, color: T.ink500 }}>Aucun test retenu.</div>}
        {items.map(tst => { const stv = statusOf(plan, k, tst.id), by = statusByOf(plan, k, tst.id), chk = edit ? sel.includes(tst.id) : stv === "ok"; return (
          <div key={tst.id} style={{ display: "flex", gap: 10, padding: "8px 12px", borderTop: "1px solid " + T.surface, alignItems: "flex-start", flexWrap: "wrap" }}>
            {edit && <input type="checkbox" checked={chk} disabled={!canEdit} aria-label={"À réaliser : " + tst.name}
              onChange={() => saveTests(toggleTest(plan, catalog, k, tst.id))} style={{ marginTop: 3, width: 16, height: 16, accentColor: stageSoft().finProd.solid }} />}
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, textDecoration: !edit && chk ? "line-through" : "none", textDecorationColor: T.ink300 }}>{tst.name}</div>
              {!edit && by && stv !== "todo" && <div style={{ fontSize: 11, color: T.ink500, marginTop: 2 }}>{(TEST_STATUS.find(x => x[0] === stv) || [])[1]}{by.by ? " · " + by.by : ""}{by.at ? " · " + stamp(by.at) : ""}</div>}
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
    const ok = openTestReport({ r, meta, plan, catalog, act, testers, signs: imgs, certs: myCerts.map(c => c.label || c.name || c.id), base: window.location.origin + (process.env.PUBLIC_URL || "") + "/report/", kindLabel, presence });
    if (!ok) setErr("Le navigateur a bloqué la nouvelle fenêtre : autorisez les fenêtres pour ce site.");
    setBusy(false);
  };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {assigned.length === 0 && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucun testeur affecté.</span>}
    {assigned.map(t => { const key = "t:" + t.id, sg = signs[key], canSign = (!!myTester && myTester.id === t.id) || canEdit; return (
      <div key={key} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px", background: T.card, border: "1px solid " + T.line, borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px", minWidth: 0 }}><div style={{ fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>Réalisé par</div><div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900 }}>{(sg && sg.name) || t.name}{sg && sg.fn ? <span style={{ fontWeight: 500, color: T.ink500 }}> · {sg.fn}</span> : null}</div></div>
          {sg && <span style={{ fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, color: T.emerald600, background: T.emerald100, borderRadius: 999, padding: "2px 10px" }}>Signé le {fd(dIso(sg.at))}</span>}
          {canSign && (!form || form.key !== key) && <button type="button" disabled={busy} onClick={() => setForm({ key, name: (sg && sg.name) || t.name, fn: (sg && sg.fn) || "" })} style={btn(true, sg ? "ghost" : undefined)}>{sg ? "Remplacer la signature" : "Signer"}</button>}
          {!canSign && !sg && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Pas encore signé</span>}
        </div>
        {form && form.key === key && <SignForm init={form} busy={busy} onCancel={() => setForm(null)} onSave={(name, fn, img) => sign(key, name, fn, img)} />}
      </div>); })}
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={pdf} disabled={busy} className="enogia-btn-ind" style={{ border: "none", background: T.ink900, color: T.card, borderRadius: 8, padding: "7px 14px", minHeight: 32, fontSize: FZ.sm, fontWeight: 700, cursor: "pointer", fontFamily: T.font, display: "inline-flex", alignItems: "center", gap: 6 }}><NavIcon name="copy" size={15} />PV de debug (PDF)</button>
      <span style={{ fontSize: FZ.xs, color: T.ink500 }}>S'ouvre dans un nouvel onglet : Imprimer → « Enregistrer au format PDF ».</span>
    </div>
    {err && <div role="alert" style={{ fontSize: FZ.xs, color: T.red500, fontWeight: 600 }}>{err}</div>}
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
  const [name, setName] = useState(init.name || ""), [fn, setFn] = useState(init.fn || ""), [img, setImg] = useState(null), [err, setErr] = useState("");
  const pick = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; try { setImg(await shrinkImage(f)); setErr(""); } catch (x) { setErr(x.message); } };
  const ok = name.trim() && fn.trim() && img;
  return (<div className="enogia-view-in" style={{ border: "1.5px solid " + T.teal500, borderRadius: 10, padding: 10, background: T.surface, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>Nom<input value={name} onChange={e => setName(e.target.value)} style={field()} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>Fonction<input value={fn} onChange={e => setFn(e.target.value)} placeholder="Technicien d'essais" style={field()} /></label>
    </div>
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: FZ.xs, fontWeight: 700, color: T.teal600, cursor: "pointer", minHeight: 28 }}>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} style={{ fontSize: FZ.xs }} aria-label="Image de la signature" />
    </label>
    {img && <img src={img} alt="Aperçu de la signature" style={{ maxWidth: 240, maxHeight: 80, background: "#fff", border: "1px solid " + T.line, borderRadius: 6, padding: 4, alignSelf: "flex-start" }} />}
    {err && <div role="alert" style={{ fontSize: FZ.xs, color: T.red500, fontWeight: 600 }}>{err}</div>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" disabled={busy || !ok} onClick={() => onSave(name.trim(), fn.trim(), img)} style={btn(!!ok)}>Valider la signature</button>
      <button type="button" onClick={onCancel} style={btn(true, "ghost")}>Annuler</button>
      {!ok && <span style={{ fontSize: FZ.xs, color: T.ink500, alignSelf: "center" }}>Nom, fonction et image de la signature sont nécessaires.</span>}
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
        style={{ border: "none", borderRadius: 6, padding: "4px 8px", minHeight: 28, fontSize: 12, fontWeight: 600, fontFamily: T.fontLabel, cursor: disabled ? "default" : "pointer", background: on ? bg : "transparent", color: on ? ink : T.ink500, opacity: disabled && !on ? .55 : 1, transition: "background-color .15s ease, color .15s ease" }}>{l}</button>); })}
  </div>);
}

function Step({ n, title, hint, children }) {
  return (<div style={{ display: "flex", gap: 12 }}>
    <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: "50%", background: T.teal600, color: "#fff", fontSize: FZ.xs, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{n}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}><span style={{ fontSize: FZ.sm, fontWeight: 800, color: T.ink900 }}>{title}</span>{hint && <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{hint}</span>}</div>
      {children}
    </div>
  </div>);
}

// ── v189 : calendrier des tests par testeur (maquette validée) ───────────────────────────────────────────
// Deux semaines ouvrées, une ligne par testeur ; chaque barre = une machine (couleur : interne / client / NOBO),
// avec le PJ, la gamme et l'avancement. Ligne « Sans testeur » en pointillés rouges. Les administrateurs glissent une
// barre sur un testeur pour l'affecter (depuis un autre testeur : la machine passe de l'un à l'autre).
const CAL_DAYS = 10, LANE_H = 30, LABEL_W = 200;
export function TesterTimeline({ doc, rows, testers, catalog, conflicts, commit, canEdit, myTester, openPj, who }) {
  const ctx = useMentions();
  const [offset, setOffset] = useState(0), [edit, setEdit] = useState(null), [del, setDel] = useState(null), [newName, setNewName] = useState(""), [over, setOver] = useState(null);
  const todayIso = toLocalISO(new Date());
  const start = addDaysIso(mondayOf(todayIso), offset * 14);
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
  const S = stageSoft();
  const toneOf = pj => { const k = presenceKind((byPj[pj] || {}).clientPresence || null); const c = k === "nobo" ? PRESENCE_META.nobo.color : k ? S.arrivee.solid : S.tests.solid; return { bg: c, ink: inkOn(c), k }; };
  const drop = (tid, e) => {
    e.preventDefault(); setOver(null); if (!canEdit) return;
    let d; try { d = JSON.parse(e.dataTransfer.getData("text/plain")); } catch (x) { return; }
    if (!d || !d.pj || d.from === tid) return;
    let plan = planOf(doc, d.pj); if (d.from) plan = unassignTester(plan, d.from); plan = assignTester(plan, tid, who);
    commit({ plans: { ...(doc.plans || {}), [d.pj]: plan } });
  };
  const dropZone = tid => canEdit ? { onDragOver: e => { e.preventDefault(); setOver(tid); }, onDragLeave: () => setOver(o => (o === tid ? null : o)), onDrop: e => drop(tid, e) } : {};
  const pct = i => (i / CAL_DAYS * 100) + "%";
  const Bar = ({ it, fromTid, free }) => {
    const pl = place(it); if (!pl) return null;
    const r = byPj[it.pj] || {}, tn = toneOf(it.pj), q = progressOf(planOf(doc, it.pj), catalog, activeSections(tn.k)), warn = it.lane > 0;
    return (<button type="button" className="enogia-cal-bar" draggable={canEdit} onDragStart={e => { e.dataTransfer.setData("text/plain", JSON.stringify({ pj: it.pj, from: fromTid || "" })); e.dataTransfer.effectAllowed = "move"; }}
      onClick={() => openPj(it.pj)} title={it.pj + (r.gamme ? " · " + r.gamme : "") + " · " + (getPjMeta(it.pj, r).nomProjet || "") + " · " + fd(it.from) + " → " + fd(it.to) + " · " + q.done + "/" + q.total + " tests" + (warn ? " · chevauche un autre PJ" : "") + (canEdit ? " · glisser pour affecter" : "")}
      style={{ position: "absolute", left: "calc(" + pct(pl.a) + " + 2px)", width: "calc(" + pct(pl.b - pl.a + 1) + " - 4px)", top: it.lane * LANE_H + 3, height: LANE_H - 6, boxSizing: "border-box",
        background: free ? "transparent" : tn.bg, color: free ? T.red600 : tn.ink, border: free ? "1.5px dashed " + T.red500 : warn ? "2px solid " + T.amber500 : "none", borderRadius: 6,
        fontFamily: T.fontLabel, fontSize: 11, fontWeight: 600, cursor: canEdit ? "grab" : "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", padding: "0 6px", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
      <b style={{ fontFamily: T.fontMono }}>{it.pj}</b>{r.gamme && <span>{r.gamme}</span>}{q.total > 0 && <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{q.done}/{q.total}</span>}
    </button>);
  };
  const lanesBox = (items, lanes, tid, free) => (<div className="enogia-cal-drop" {...(free ? {} : dropZone(tid))} style={{ position: "relative", flex: 1, minWidth: 0, height: lanes * LANE_H, background: over === tid ? T.teal100 : "transparent" }}>
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(" + CAL_DAYS + ",1fr)", pointerEvents: "none" }}>
      {days.map((d, i) => <div key={d} style={{ borderLeft: i === 5 ? "2px solid " + T.line : i ? "1px solid " + T.surface : "none", background: d === todayIso ? T.teal100 : "transparent", opacity: d === todayIso ? .6 : 1 }} />)}
    </div>
    {items.map(it => <Bar key={it.pj} it={it} fromTid={free ? "" : tid} free={free} />)}
  </div>);
  const labelCell = { width: LABEL_W, flexShrink: 0, padding: "6px 10px", borderRight: "1px solid " + T.line, boxSizing: "border-box" };
  const rowStyle = { display: "flex", borderTop: "1px solid " + T.line, alignItems: "stretch" };
  const DOWL = ["L", "M", "M", "J", "V"];
  return (<div style={{ ...CARD, overflow: "hidden" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", flexWrap: "wrap" }}>
      <div><div style={H_TITLE}>Calendrier des tests</div><div style={H_SUB}>Du {fd(days[0])} au {fd(end)} · une barre par machine{canEdit ? " · glissez une barre sur un testeur pour l'affecter" : ""}</div></div>
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", gap: 10, fontSize: FZ.xs, color: T.ink500, marginRight: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: S.tests.solid }} />Interne</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: S.arrivee.solid }} />Client</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: PRESENCE_META.nobo.color }} />NOBO</span>
        </span>
        <button onClick={() => setOffset(o => o - 1)} style={btn(true, "ghost")} aria-label="Deux semaines plus tôt">◀</button>
        <button onClick={() => setOffset(0)} style={btn(true, "ghost")}>Aujourd'hui</button>
        <button onClick={() => setOffset(o => o + 1)} style={btn(true, "ghost")} aria-label="Deux semaines plus tard">▶</button>
      </div>
    </div>
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: LABEL_W + 520 }}>
        <div style={{ display: "flex", background: T.surface, borderTop: "1px solid " + T.line }}>
          <div style={{ ...labelCell, fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, color: T.ink500 }}>Testeur</div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(" + CAL_DAYS + ",1fr)" }}>{days.map((d, i) => <div key={d} style={{ padding: "6px 4px", fontSize: FZ.xs, fontWeight: 700, textAlign: "center", color: d === todayIso ? T.teal600 : T.ink500, borderLeft: i === 5 ? "2px solid " + T.line : "none", fontVariantNumeric: "tabular-nums" }}>{DOWL[i % 5]} {d.slice(8, 10)}</div>)}</div>
        </div>
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
                    <div style={{ fontSize: FZ.sm, fontWeight: 700, color: myTester && myTester.id === t.id ? T.teal600 : T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                    {conflict ? <div style={{ fontFamily: T.fontLabel, fontSize: 11, fontWeight: 600, color: T.amber600 }}>Chevauchement</div> : !t.email && <div style={{ fontSize: 11, color: T.ink500 }}>sans e-mail</div>}
                  </div>
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
      <span style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink500 }}>Équipe de test :</span>
      <input list="tl-accounts" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addTester(); }} placeholder="＋ Ajouter un testeur (nom ou compte connecté)" style={{ ...field(), width: 300 }} />
      <datalist id="tl-accounts">{ctx.options.map(o => <option key={o.email} value={o.name}>{o.email}</option>)}</datalist>
      <button onClick={addTester} disabled={!newName.trim()} style={btn(!!newName.trim())}>Ajouter</button>
      <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Un testeur choisi parmi les comptes connectés reçoit l'accès à cet onglet.</span>
    </div>}
  </div>);
}

// ── Catalogue des tests (FAT interne / client / NOBO) ───────────────────────────────────────
function CatalogView({ doc, catalog, commit }) {
  const [del, setDel] = useState(null), [reset, setReset] = useState(false);
  const setSec = (k, list) => commit({ catalog: { ...catalog, [k]: list } });
  const move = (k, i, d) => { const l = [...catalog[k]]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setSec(k, l); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ ...CARD, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: FZ.sm, color: T.ink500 }}>Tests proposés pour chaque PJ (modèle OP022-DP001-A). On coche ensuite ceux à réaliser pour chaque PJ dans « Planning des tests ».</span>
      {reset ? <span style={{ display: "inline-flex", gap: 6 }}><button onClick={() => { setReset(false); commit({ catalog: DEFAULT_TEST_CATALOG }); }} style={{ ...btn(true), background: T.red500 }}>Rétablir le modèle</button><button onClick={() => setReset(false)} style={btn(true, "ghost")}>Annuler</button></span>
        : <button onClick={() => setReset(true)} style={btn(true, "ghost")}>Rétablir le modèle du fichier</button>}
    </div>
    {SECTIONS.map(([k, label, hint]) => (<div key={k} style={{ ...CARD, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: FZ.md, fontWeight: 800, color: SEC_COLOR[k]() }}>{label}</span><span style={{ fontSize: FZ.xs, color: T.ink300 }}>{hint}</span></div>
      {catalog[k].map((t, i) => (<div key={t.id} style={{ display: "grid", gridTemplateColumns: "minmax(200px,300px) 1fr auto", gap: 8, alignItems: "start" }}>
        <input defaultValue={t.name} key={t.id + t.name} onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.name) setSec(k, catalog[k].map(x => x.id === t.id ? { ...x, name: v } : x)); }} style={field()} aria-label="Nom du test" />
        <textarea defaultValue={t.obj || ""} key={t.id + "o" + (t.obj || "")} rows={2} onBlur={e => { if (e.target.value !== (t.obj || "")) setSec(k, catalog[k].map(x => x.id === t.id ? { ...x, obj: e.target.value } : x)); }} placeholder="Objectifs du test" style={{ ...field(), resize: "vertical" }} aria-label="Objectifs" />
        <span style={{ display: "inline-flex", gap: 4 }}>
          <button onClick={() => move(k, i, -1)} disabled={i === 0} style={btn(i > 0, "ghost")} aria-label="Monter">↑</button>
          <button onClick={() => move(k, i, 1)} disabled={i === catalog[k].length - 1} style={btn(i < catalog[k].length - 1, "ghost")} aria-label="Descendre">↓</button>
          {del === t.id
            ? <><button onClick={() => { setDel(null); commit({ ...dropTestFromPlans(doc, k, t.id), catalog: { ...catalog, [k]: catalog[k].filter(x => x.id !== t.id) } }); }} style={{ ...btn(true), background: T.red500 }}>Confirmer</button><button onClick={() => setDel(null)} style={btn(true, "ghost")}>Non</button></>
            : <button onClick={() => setDel(t.id)} style={btn(true, "ghost")}>Supprimer</button>}
        </span>
      </div>))}
      <div><button onClick={() => setSec(k, [...catalog[k], { id: newId(k[0]), name: "Nouveau test", obj: "" }])} style={btn(true, "ghost")}>＋ Ajouter un test</button></div>
    </div>))}
  </div>);
}
