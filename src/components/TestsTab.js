// v154 — Page « Tests » (rail de gauche, réservée aux administrateurs et aux testeurs de la liste) :
// fiches de test par machine (modèle OP022-DP001-A), affectation des testeurs aux périodes de tests, frise des testeurs.
// Les dates de venue du client / de NOBO se règlent dans la Liste : ici elles sont en lecture seule.
// Les données vivent dans planning/tests (un seul document).
import React, { useMemo, useState, useEffect } from "react";
import { T, FZF as FZ } from "../theme";
import { getPjMeta, PRESENCE_META, PresenceChip, presenceKind, presenceDates, presenceFirstDate, Avatar, personTint } from "../pjMeta";
import { fmt, toLocalISO } from "../parsers";
import { useMentions } from "../mentionContext";
import { CARD, H_TITLE, H_SUB, EmptyNote } from "./ManagerParts";
import { CertifChip } from "./FicheContrat";
import { NavIcon } from "./SharedUI";
import { SECTIONS, DEFAULT_TEST_CATALOG, catalogOf, testersOf, planOf, activeSections, selectedIds, toggleTest, setExtra, setNote, assignTester, unassignTester, setAssignDates, effRange, findConflicts, assignmentsOf, dropTester, dropTestFromPlans, newId, packLanes, dayDiffIso, addDaysIso, mondayOf, testerOfEmail } from "../testPlan";

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
const Cap = ({ children, style }) => <div style={{fontFamily:T.fontMono,fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.accentInk,...style}}>{children}</div>;

function TesterChip({ t, warn, on, onClick, disabled, small }) {
  const interactive = !!onClick;
  return (<span role={interactive ? "button" : undefined} aria-pressed={interactive ? !!on : undefined} tabIndex={interactive && !disabled ? 0 : undefined}
    onClick={interactive && !disabled ? onClick : undefined} onKeyDown={interactive && !disabled ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }) : undefined}
    title={warn ? "Déjà affecté sur un autre PJ à la même période" : t.email || t.name}
    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: on ? T.teal100 : T.card, border: "1.5px solid " + (warn ? T.amber500 : on ? T.teal500 : T.line), borderRadius: 999, padding: small ? "1px 9px 1px 3px" : "3px 12px 3px 4px", fontSize: FZ.xs, fontWeight: 700, color: warn ? T.amber600 : on ? T.teal600 : T.ink700, cursor: interactive && !disabled ? "pointer" : "default", opacity: disabled && interactive && !on ? .6 : 1, userSelect: "none" }}>
    <Avatar name={t.name} tint={personTint(t.name)[0]} size={small ? 18 : 22} />{t.name}{on && interactive ? " ✓" : ""}{warn ? " ⚠" : ""}
  </span>);
}

export function TestsTab({ doc, save, data, certifs, canEdit, me }) {
  const [sub, setSub] = useState("machines");
  const [focus, setFocus] = useState(null);
  const [msg, setMsg] = useState(null);
  const testers = testersOf(doc), catalog = catalogOf(doc);
  const myTester = testerOfEmail(doc, me);
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE"), [data]);
  const conflicts = useMemo(() => findConflicts(doc, rows), [doc, rows]);
  const commit = async next => { if (!canEdit) return false; const ok = await save({ ...doc, ...next }); setMsg(ok === false ? "L'enregistrement a échoué." : null); return ok; };
  const SUBS = [["machines", "Fiches par machine"], ["testers", "Planning des testeurs"], ...(canEdit ? [["catalog", "Catalogue des tests"]] : [])];
  const openPj = pj => { setFocus({ pj, n: Date.now() }); setSub("machines"); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div>
        <span style={{ fontFamily: T.fontDisplay, fontWeight: 600, color: T.ink900, fontSize: FZ.lg, display: "flex", alignItems: "center", gap: 8 }}><NavIcon name="check" size={20} />Tests (FAT)</span>
        <div style={H_SUB}>{canEdit ? "Qui teste quelle machine, quand, et quels tests faire en interne, avec le client et avec NOBO." : "Consultation : vos affectations et les tests à réaliser. Seuls les administrateurs modifient cette page."}</div>
      </div>
      <div role="tablist" style={{ display: "inline-flex", background: T.surface, border: "1px solid " + T.line, borderRadius: 10, padding: 2, gap: 2 }}>
        {SUBS.map(([id, l]) => <button key={id} role="tab" aria-selected={sub === id} onClick={() => setSub(id)} style={{ border: "none", cursor: "pointer", borderRadius: 8, padding: "6px 14px", fontSize: FZ.sm, fontWeight: 700, fontFamily: T.font, background: sub === id ? T.card : "transparent", color: sub === id ? T.teal600 : T.ink500, boxShadow: sub === id ? T.shadowSm : "none" }}>{l}</button>)}
      </div>
    </div>
    {msg && <div role="alert" style={{ color: T.red500, fontSize: FZ.sm, fontWeight: 600 }}>{msg}</div>}
    {conflicts.length > 0 && sub !== "catalog" && <div role="status" style={{ background: T.amber100, color: T.amber600, borderRadius: 10, padding: "8px 12px", fontSize: FZ.sm, fontWeight: 600 }}>
      <span style={{ display: "inline-flex", verticalAlign: "-3px", marginRight: 6 }}><NavIcon name="warning" size={16} /></span>{conflicts.length} chevauchement{conflicts.length > 1 ? "s" : ""} : {conflicts.slice(0, 4).map(c => { const t = testers.find(x => x.id === c.tid); return (t ? t.name : "Testeur") + " sur " + c.a.pj + " et " + c.b.pj; }).join(" · ")}{conflicts.length > 4 ? " …" : ""}
    </div>}
    {sub === "machines" && <MachinesView {...{ doc, rows, testers, catalog, conflicts, commit, certifs, canEdit, myTester, focus }} />}
    {sub === "testers" && <TesterTimeline {...{ doc, rows, testers, conflicts, commit, canEdit, myTester, openPj }} />}
    {sub === "catalog" && canEdit && <CatalogView {...{ doc, catalog, commit }} />}
  </div>);
}

// ── Fiches par machine ──────────────────────────────────────────────────────────────────────
function MachinesView({ doc, rows, testers, catalog, conflicts, commit, certifs, canEdit, myTester, focus }) {
  const [filter, setFilter] = useState(myTester && !canEdit ? "mine" : "soon"), [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const todayIso = toLocalISO(new Date());
  useEffect(() => { if (focus && focus.pj) { setFilter("all"); setQ(""); setOpenId(focus.pj); setTimeout(() => { const el = document.getElementById("fat-" + focus.pj); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: "smooth" }); }, 60); } }, [focus]);
  const withPeriod = rows.filter(r => r.tests);
  const isSoon = r => r.etat !== "SHIPPED" && dIso(r.testsFin || r.tests) >= todayIso;
  const isMine = r => !!myTester && planOf(doc, r.pj).assign.some(a => a.tid === myTester.id);
  const noTester = r => planOf(doc, r.pj).assign.length === 0;
  const FILTERS = [["soon", "À venir", withPeriod.filter(isSoon).length], ["free", "Sans testeur", withPeriod.filter(r => isSoon(r) && noTester(r)).length], ...(myTester ? [["mine", "Mes tests", withPeriod.filter(isMine).length]] : []), ["all", "Tous", withPeriod.length]];
  const list = useMemo(() => withPeriod.filter(r => filter === "all" || (filter === "soon" && isSoon(r)) || (filter === "free" && isSoon(r) && noTester(r)) || (filter === "mine" && isMine(r)))
    .filter(r => { const s = q.trim().toLowerCase(); return !s || r.pj.toLowerCase().includes(s) || String(getPjMeta(r.pj, r).nomProjet || "").toLowerCase().includes(s); })
    .sort((a, b) => dIso(a.tests).localeCompare(dIso(b.tests))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rows, doc, filter, q, todayIso, myTester]);
  const noPeriod = rows.filter(r => !r.tests && r.etat !== "SHIPPED").length;
  return (<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ, un projet…" style={{ ...field(), width: 240 }} />
      <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map(([id, l, n]) => <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id} style={{ border: "1px solid " + (filter === id ? T.teal500 : T.line), background: filter === id ? T.teal100 : T.card, color: filter === id ? T.teal600 : T.ink700, borderRadius: 999, padding: "3px 12px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>{l} <span style={{ opacity: .7 }}>{n}</span></button>)}
      </div>
      {noPeriod > 0 && <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{noPeriod} PJ sans période de tests (non listés)</span>}
    </div>
    {list.length === 0 && <EmptyNote>Aucune machine à afficher avec ce filtre.</EmptyNote>}
    {list.map(r => <FatSheet key={r.pj} {...{ r, doc, testers, catalog, conflicts, commit, certifs, canEdit, open: openId === r.pj, onToggle: () => setOpenId(openId === r.pj ? null : r.pj), myTester }} />)}
  </div>);
}

function FatSheet({ r, doc, testers, catalog, conflicts, commit, certifs, canEdit, open, onToggle, myTester }) {
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
  const toggle = t => { const on = plan.assign.some(a => a.tid === t.id); savePlan(on ? unassignTester(plan, t.id) : assignTester(plan, t.id)); };
  const addNew = async () => {
    const n = newName.trim(); if (!n) return;
    let t = testers.find(x => x.name.toLowerCase() === n.toLowerCase()), tl = testers;
    if (!t) { const acct = ctx.options.find(o => o.name.toLowerCase() === n.toLowerCase()); t = { id: newId("t"), name: n, email: acct ? acct.email : "" }; tl = [...testers, t]; }
    const p = assignTester(plan, t.id);
    const ok = await commit({ testers: tl, plans: { ...(doc.plans || {}), [r.pj]: p } });
    if (ok !== false) setNewName("");
  };
  const mine = !!myTester && plan.assign.some(a => a.tid === myTester.id);
  const canTest = canEdit; // seuls les administrateurs modifient les tests ; les testeurs consultent
  return (<div id={"fat-" + r.pj} style={{ ...CARD, overflow: "hidden", borderColor: mine ? T.teal500 : undefined }}>
    <div onClick={onToggle} role="button" aria-expanded={open} tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
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
    </div>
    {open && <div style={{ borderTop: "1px solid " + T.line, background: T.surface, padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>
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
      {/* ③ Tests à réaliser */}
      <Step n="3" title="Tests à réaliser" hint={canTest ? "Cochez / décochez les tests à réaliser pour cette machine ; les commentaires sont propres à ce PJ." : "Consultation : seuls les administrateurs modifient les tests."}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SECTIONS.map(([k, label]) => {
            const on = act.includes(k), ids = selectedIds(plan, catalog, k), col = SEC_COLOR[k]();
            return (<div key={k} style={{ background: T.card, border: "1px solid " + (on ? SEC_BORDER[k]() : T.line), borderRadius: 10, overflow: "hidden", opacity: on ? 1 : .6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "7px 12px", borderBottom: on ? "1px solid " + T.line : "none" }}>
                <span><b style={{ color: col, fontSize: FZ.sm }}>{label}</b> <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{on ? SEC_WHEN[k] : "Section non applicable : pas de présence " + (k === "client" ? "client" : "NOBO") + " pour ce PJ"}</span></span>
                {on && <span style={{ fontSize: FZ.xs, color: T.ink500, fontWeight: 600 }}>{ids.length}/{catalog[k].length} test{catalog[k].length > 1 ? "s" : ""}</span>}
              </div>
              {on && <>
                {catalog[k].length > 0 && <div style={{fontFamily:T.fontMono,fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.accentInk,display: "grid",gridTemplateColumns: "26px minmax(150px,1fr) minmax(200px,2fr) minmax(150px,1fr)",gap: "0 10px",padding: "4px 12px"}}><span /><span>Test</span><span>Objectifs</span><span>Commentaires</span></div>}
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
      </Step>
    </div>}
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

// ── Planning des testeurs : frise sur 6 semaines + équipe ───────────────────────────────────
const DAY_W = 24, LABEL_W = 220, LANE_H = 28, WEEKS = 6;
function TesterTimeline({ doc, rows, testers, conflicts, commit, canEdit, myTester, openPj }) {
  const ctx = useMentions();
  const [offset, setOffset] = useState(0), [edit, setEdit] = useState(null), [del, setDel] = useState(null), [newName, setNewName] = useState("");
  const todayIso = toLocalISO(new Date());
  const start = addDaysIso(mondayOf(todayIso), offset * 7), N = WEEKS * 7, end = addDaysIso(start, N - 1);
  const byPj = useMemo(() => { const m = {}; rows.forEach(r => { m[r.pj] = r; }); return m; }, [rows]);
  const inWin = it => it.to >= start && it.from <= end;
  const bar = (it, lane, extra) => {
    const a = Math.max(0, dayDiffIso(start, it.from)), b = Math.min(N - 1, dayDiffIso(start, it.to));
    return { left: a * DAY_W + 1, width: (b - a + 1) * DAY_W - 2, top: lane * LANE_H + 3, height: LANE_H - 6, ...extra };
  };
  const trows = testers.map(t => {
    const items = packLanes(assignmentsOf(doc, t.id, rows).filter(inWin));
    return { t, items, lanes: Math.max(1, ...items.map(i => i.lane + 1)), conflict: items.some(i => i.lane > 0) };
  });
  const freeItems = packLanes(rows.filter(r => r.tests && r.etat !== "SHIPPED" && !planOf(doc, r.pj).assign.length).map(r => ({ pj: r.pj, from: dIso(r.tests), to: dIso(r.testsFin) || dIso(r.tests) })).filter(inWin));
  const days = Array.from({ length: N }, (_, i) => addDaysIso(start, i));
  const addTester = async () => { const n = newName.trim(); if (!n || testers.some(t => t.name.toLowerCase() === n.toLowerCase())) return; const acct = ctx.options.find(o => o.name.toLowerCase() === n.toLowerCase()); const ok = await commit({ testers: [...testers, { id: newId("t"), name: n, email: acct ? acct.email : "" }] }); if (ok !== false) setNewName(""); };
  const upd = (id, patch) => commit({ testers: testers.map(t => t.id === id ? { ...t, ...patch } : t) });
  const rowStyle = h => ({ display: "flex", borderTop: "1px solid " + T.surface, minHeight: h });
  const labelCell = { width: LABEL_W, flexShrink: 0, padding: "6px 10px", position: "sticky", left: 0, background: T.card, zIndex: 2, borderRight: "1px solid " + T.line };
  const grid = (<div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none" }}>
    {days.map(d => { const wd = (new Date(d + "T12:00:00").getDay() + 6) % 7; return <div key={d} style={{ width: DAY_W, flexShrink: 0, background: wd >= 5 ? T.surface : "transparent", borderLeft: wd === 0 ? "1px solid " + T.line : "none", position: "relative" }}>{d === todayIso && <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: T.teal500, opacity: .7 }} />}</div>; })}
  </div>);
  const Bar = ({ it, tone, h }) => { const [strong, soft] = personTint(it.pj); const warn = it.lane > 0; return (
    <button onClick={() => openPj(it.pj)} title={it.pj + " · " + (getPjMeta(it.pj, byPj[it.pj] || {}).nomProjet || "") + " · " + fd(it.from) + " → " + fd(it.to) + (warn ? " · ⚠ chevauche un autre PJ" : "")}
      style={{ position: "absolute", ...bar(it, it.lane), background: tone === "free" ? "transparent" : soft, border: (tone === "free" ? "1.5px dashed " + T.amber500 : "1.5px solid " + (warn ? T.amber500 : strong)), color: tone === "free" ? T.amber600 : T.ink900, borderRadius: 6, fontSize:11, fontWeight: 700, fontFamily: T.font, cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", padding: "0 5px", textAlign: "left" }}>{warn ? "⚠ " : ""}{it.pj}</button>); };
  return (<div style={{ ...CARD, overflow: "hidden" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", flexWrap: "wrap" }}>
      <div><div style={H_TITLE}>Planning des testeurs</div><div style={H_SUB}>Chaque barre est une période de tests (cliquez pour ouvrir la fiche de la machine). Une ligne « À affecter » regroupe les tests encore sans testeur.</div></div>
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <button onClick={() => setOffset(o => o - 4)} style={btn(true, "ghost")} aria-label="Reculer de 4 semaines">◀</button>
        <button onClick={() => setOffset(0)} style={btn(true, "ghost")}>Aujourd'hui</button>
        <button onClick={() => setOffset(o => o + 4)} style={btn(true, "ghost")} aria-label="Avancer de 4 semaines">▶</button>
      </div>
    </div>
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: LABEL_W + N * DAY_W }}>
        <div style={{ display: "flex", background: T.surface, borderTop: "1px solid " + T.line }}>
          <div style={{fontFamily:T.fontMono,fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.accentInk,...labelCell,background: T.surface}}>Testeur</div>
          <div style={{ display: "flex" }}>{Array.from({ length: WEEKS }, (_, w) => <div key={w} style={{ width: 7 * DAY_W, flexShrink: 0, padding: "6px 6px", borderLeft: "1px solid " + T.line, fontSize: FZ.xs, fontWeight: 700, color: T.ink500 }}>Sem. du {fdm(addDaysIso(start, w * 7))}</div>)}</div>
        </div>
        {/* À affecter */}
        <div style={rowStyle(LANE_H * Math.max(1, ...freeItems.map(i => i.lane + 1)))}>
          <div style={{ ...labelCell, color: T.amber600, fontSize: FZ.sm, fontWeight: 800 }}>À affecter <span style={{ fontWeight: 600, color: T.ink300 }}>({freeItems.length})</span></div>
          <div style={{ position: "relative", width: N * DAY_W }}>{grid}{freeItems.map(it => <Bar key={it.pj} it={it} tone="free" />)}</div>
        </div>
        {trows.length === 0 && <div style={{ padding: "14px 14px", fontSize: FZ.sm, color: T.ink500, borderTop: "1px solid " + T.surface }}>Aucun testeur pour l'instant{canEdit ? " : ajoutez-en un ci-dessous." : "."}</div>}
        {trows.map(({ t, items, lanes, conflict }) => (
          <div key={t.id} style={rowStyle(lanes * LANE_H)}>
            <div style={{ ...labelCell, display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
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
                    <div style={{ fontSize: FZ.sm, fontWeight: 700, color: myTester && myTester.id === t.id ? T.teal600 : T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}{conflict ? " ⚠" : ""}</div>
                    <div style={{ fontSize:11, color: T.ink300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.email || "sans e-mail : pas d'accès à l'onglet"}</div>
                  </div>
                  {canEdit && <button onClick={() => setEdit(t.id)} aria-label={"Modifier " + t.name} title="Modifier / retirer" style={{ border: "none", background: "transparent", color: T.ink500, cursor: "pointer", fontSize: FZ.md, padding: 2, lineHeight: 0 }}><NavIcon name="edit" size={15} /></button>}
                </div>}
            </div>
            <div style={{ position: "relative", width: N * DAY_W }}>{grid}{items.map(it => <Bar key={it.pj} it={it} />)}</div>
          </div>))}
      </div>
    </div>
    {canEdit && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 14px", borderTop: "1px solid " + T.line, background: T.surface }}>
      <span style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink500 }}>Équipe de test :</span>
      <input list="tl-accounts" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addTester(); }} placeholder="＋ Ajouter un testeur (nom ou compte connecté)" style={{ ...field(), width: 300 }} />
      <datalist id="tl-accounts">{ctx.options.map(o => <option key={o.email} value={o.name}>{o.email}</option>)}</datalist>
      <button onClick={addTester} disabled={!newName.trim()} style={btn(!!newName.trim())}>Ajouter</button>
      <span style={{ fontSize: FZ.xs, color: T.ink300 }}>Un testeur choisi parmi les comptes connectés reçoit l'accès à cet onglet (consultation).</span>
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
