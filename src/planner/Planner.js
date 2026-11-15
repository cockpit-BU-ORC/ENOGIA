import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { T, btn } from "../theme";
import { guessGamme } from "../parsers";
import {
  STEPS, splitKey, makeCalendar, schedule, planToRows, diffRows, initPlanFromRows,
  addPj, initBlankPlan, setStep, rulesOf, summarizeChanges, diffPlans, DEFAULT_CAP, releasePins, setCap, setRules, loadModel, levelPlan, fitDurations, hasLevel, clearLevel, sortPjsByStart, capWeek, fillMissingHours, refreshPlanFromRows, setCapWeek, newPjPlan, addPhaseTask, splitBenches, stepKeysOf, stepLabel, PHASES,
} from "./engine";
import { PlannerGantt, fmtIso, makeTimeline, leftWidthWith, STEP_COLOR, ZOOM_PX, PX_MIN, PX_MAX } from "./PlannerGantt";
import { LABEL_W as LANE_LABEL_W } from "./PlannerLanes";
import { benchOrderByStart, setBench, benchMoveUp, benchConflicts, splitBenches as splitBenchesV, isEstimatePj, startAtKeepLinks, applyPendingDeparts } from "./engine";
import { getPjMeta } from "../pjMeta";
import { contractLate } from "../penalties";
import { getCashinDoc, anchoredBill, diffDays } from "../cashinLink";
import { fmtEur } from "../pjProgress";
import { landFrom } from "../pointerDrag";
import { PlannerLoad } from "./PlannerLoad";
import { PlannerLanes } from "./PlannerLanes";
import { PlannerChanges } from "./PlannerChanges";
import { Pop, MenuItem } from "./PlannerMenu";
import { askConfirm } from "../confirm";
import { AF } from "../autoFocusOk";

// ── Module « Planification » (super admin) : remplace MS Project pour construire le planning d'ordonnancement ──
// Un seul tableau Gantt modifiable en direct (dates, durées, travail, prédécesseurs, priorité) + la charge atelier sous le Gantt.
// Le plan est un brouillon enregistré automatiquement. « Publier » le copie dans le planning actuel lu par tous les écrans
// (avec aperçu des changements, historique et annulation). Le planning INITIAL (figé) n'est jamais touché ici.

// v208 : styles relus dans le thème à chaque usage (ils étaient figés au chargement : textes illisibles en sombre)
const live = f => new Proxy({}, { get: (o, k) => f()[k], has: (o, k) => k in f(), ownKeys: () => Reflect.ownKeys(f()), getOwnPropertyDescriptor: (o, k) => { const v = f(); return k in v ? { value: v[k], enumerable: true, configurable: true, writable: true } : undefined; } });
const INP = live(() => ({ padding: "5px 8px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: 12.5, fontFamily: T.font, boxSizing: "border-box" }));
const BTN = live(() => btn("sec", "sm")); // v286 : bouton commun
const BTN_P = live(() => btn("pri", "sm"));
const STEP_LABELS = Object.fromEntries(STEPS.map(s => [s[0], s[1]]));
const CARD = live(() => ({ background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }));

// styles : survol, focus et menus (la spécificité dépasse les règles globales sur les champs)
const pgCss = () => `
.pg-root{font-family:${T.font};color:${T.ink900}}
.pg-root .pg-row:hover{background:${T.teal100} !important}
.pg-root .pg-row .pg-more{opacity:0;transition:opacity .12s}
.pg-root .pg-row:hover .pg-more,.pg-root .pg-row:focus-within .pg-more{opacity:1}
.pg-root .pg-cell{width:100%;min-height:24px;line-height:24px;padding:0 4px;box-sizing:border-box;border-radius:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pg-root .pg-ed{cursor:text}
.pg-root .pg-ed:hover{box-shadow:inset 0 0 0 1px ${T.line};background:${T.card}}
.pg-root .pg-btn:focus-visible,.pg-root input:focus-visible{outline:2px solid ${T.teal500};outline-offset:1px}
.pg-root .pg-bar:hover{filter:brightness(1.12)}
.pg-root .pg-h{opacity:0;transition:opacity .1s;z-index:6}
.pg-root .pg-trow:hover .pg-h,.pg-root .pg-h.on{opacity:1}
.pg-menuitem:hover:not(:disabled){background:${T.teal100} !important}
.pg-menuitem:focus-visible{outline:2px solid ${T.teal500}}
.pg-root .pg-tb{border:1px solid ${T.line};background:${T.card};color:${T.ink700};border-radius:8px;padding:2px 8px;min-height:26px;font-size:12px;line-height:16px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit}
.pg-root .pg-bar1{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-bottom:4px}
.pg-root .pg-bar1 > label{font-size:12px!important;min-height:24px!important}
.pg-root .pg-bar1 > .pg-in{height:26px!important;font-size:12px!important;padding:0 6px!important}
.pg-root .pg-tb:hover:not(:disabled):not([aria-pressed=true]){background:${T.teal100}}
.pg-root .pg-tb:disabled{opacity:.45;cursor:default}
.pg-root .pg-tb[aria-pressed=true]{background:${T.ink900};color:${T.card};border-color:${T.ink900}}
.pg-root .pg-split:hover,.pg-root .pg-split:focus-visible{background:linear-gradient(90deg,transparent 3px,${T.teal500} 3px,${T.teal500} 6px,transparent 6px);outline:none}
`;

// v287 (audit par skill) : fenêtre commune du planificateur déclarée comme les autres fenêtres du site — aria-modal sur le fond
// (motion.js : entrée / sortie animées, focus placé dedans, Tab piégé, focus rendu à la fermeture), nom = titre, Échap ferme.
let modalSeq = 0;
function Modal({ title, onClose, children, width = 720 }) {
  const id = useRef("pg-modal-" + (++modalSeq)).current;
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const k = e => { if (e.key !== "Escape") return; const top = [...document.querySelectorAll('[aria-modal="true"]')].pop(); if (top && top.getAttribute("aria-labelledby") === id) { e.stopPropagation(); closeRef.current && closeRef.current(); } };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [id]);
  return (<div role="dialog" aria-modal="true" aria-labelledby={id} onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,.45)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: T.font }}>
    <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 12, boxShadow: T.shadowLg, border: "1px solid " + T.line, width: "min(" + width + "px,100%)", maxHeight: "88dvh", overflow: "auto", padding: "20px 22px" }}>
      <div id={id} style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 19, color: T.ink900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  </div>);
}




// v204 (demandé : « modifier en live les tâches types par gamme avec leur durée habituelle ») : modèles par gamme —
// durée (jours ouvrés) et travail (heures) des phases Production, Tests et Fin de production. « Proposer » part de la moyenne
// des PJ de la gamme dans le plan ; « Appliquer » écrit ces durées sur les PJ de la gamme (les dates imposées sont gardées).
const TPL_STEPS = [["production", "Production"], ["tests", "Tests"], ["finProd", "Packing"]];
function gammeOfPj(pj, rows) { const r = (rows || []).find(x => x.pj === pj); return (r && r.gamme) || "Sans gamme"; }
// v258 (demandé : « quand j'applique les modèles par gamme, ils ne s'appliquent qu'aux PJ non commencés en production ») :
// started = PJ dont la production a commencé (début ≤ aujourd'hui, ou état Montage, Élec, Tests, Packaging, Expédiée) : jamais touchés.
function TemplatesDialog({ plan, rows, started, onClose, onApply }) {
  const gammes = [...new Set((plan.pjs || []).map(x => gammeOfPj(x.pj, rows)))].sort();
  const avg = g => { const L = (plan.pjs || []).filter(x => gammeOfPj(x.pj, rows) === g), o = {}; TPL_STEPS.forEach(([k]) => { const v = L.map(x => x.steps && x.steps[k]).filter(Boolean); o[k] = { dur: v.length ? Math.round(v.reduce((a, b) => a + (Number(b.dur) || 0), 0) / v.length) : 0, work: v.some(b => b.work != null) ? Math.round(v.reduce((a, b) => a + (Number(b.work) || 0), 0) / v.length) : null }; }); return o; };
  const [tpl, setTpl] = useState(() => { const t = { ...(plan.templates || {}) }; gammes.forEach(g => { if (!t[g]) t[g] = avg(g); }); return t; });
  const set = (g, k, f, v) => setTpl(t => ({ ...t, [g]: { ...t[g], [k]: { ...(t[g] && t[g][k]), [f]: v === "" ? null : Math.max(0, Number(v) || 0) } } }));
  const applyG = (g, np) => { let out = np; (out.pjs || []).filter(x => gammeOfPj(x.pj, rows) === g && !started.has(x.pj)).forEach(x => TPL_STEPS.forEach(([k]) => { const m = tpl[g] && tpl[g][k]; if (!m || !x.steps || !x.steps[k]) return; const patch = { dur: m.dur }; if (m.work != null) patch.work = m.work; out = setStep(out, x.pj, k, patch); })); return out; };
  const save = (all, g) => { let np = { ...plan, templates: tpl }; if (all) gammes.forEach(x => { np = applyG(x, np); }); else if (g) np = applyG(g, np); onApply(np); };
  const n = g => (plan.pjs || []).filter(x => gammeOfPj(x.pj, rows) === g).length;
  const nTodo = g => (plan.pjs || []).filter(x => gammeOfPj(x.pj, rows) === g && !started.has(x.pj)).length;
  return (<Modal title="Modèles par gamme" onClose={onClose} width={860}>
    <div style={{ fontSize: 13, color: T.ink500, lineHeight: 1.5, marginBottom: 10 }}>Durée habituelle (jours ouvrés) et travail (heures atelier) de chaque phase, par gamme. « Appliquer » recalcule seulement les PJ de la gamme <b>dont la production n'a pas commencé</b> ; les PJ en cours ne changent pas, les dates imposées restent.</div>
    <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
      <thead><tr><th style={{ textAlign: "left", padding: "6px 8px", color: T.ink500, fontWeight: 600 }}>Gamme</th>{TPL_STEPS.map(([k, l]) => <th key={k} colSpan={2} style={{ textAlign: "left", padding: "6px 8px", color: T.ink500, fontWeight: 600 }}>{l} <span style={{ fontWeight: 400 }}>(j · h)</span></th>)}<th /></tr></thead>
      <tbody>{gammes.map(g => <tr key={g} style={{ borderTop: "1px solid " + T.line }}>
        <td style={{ padding: "6px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>{g} <span style={{ fontWeight: 400, color: T.ink500 }}>· {nTodo(g)} / {n(g)} PJ à venir</span></td>
        {TPL_STEPS.map(([k]) => <React.Fragment key={k}>
          <td style={{ padding: "4px 4px" }}><input type="number" min={0} aria-label={g + " " + k + " durée"} value={(tpl[g] && tpl[g][k] && tpl[g][k].dur != null) ? tpl[g][k].dur : ""} onChange={e => set(g, k, "dur", e.target.value)} style={{ ...INP, width: 64 }} /></td>
          <td style={{ padding: "4px 4px" }}><input type="number" min={0} aria-label={g + " " + k + " travail"} value={(tpl[g] && tpl[g][k] && tpl[g][k].work != null) ? tpl[g][k].work : ""} placeholder="h" onChange={e => set(g, k, "work", e.target.value)} style={{ ...INP, width: 64 }} /></td>
        </React.Fragment>)}
        <td style={{ padding: "4px 4px", whiteSpace: "nowrap" }}><button style={{ ...BTN }} onClick={() => setTpl(t => ({ ...t, [g]: avg(g) }))} title="Reprendre la moyenne des PJ de cette gamme dans le plan">Proposer</button> <button style={{ ...BTN }} onClick={() => { save(false, g); }}>Appliquer</button></td>
      </tr>)}</tbody>
    </table></div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
      <button style={{ ...BTN }} onClick={onClose}>Fermer</button>
      <button style={{ ...BTN }} onClick={() => { save(false); onClose(); }}>Enregistrer les modèles</button>
      <button style={{ ...BTN_P }} onClick={() => { save(true); onClose(); }}>Appliquer à tous les PJ</button>
    </div>
  </Modal>);
}

// ── v211 (demandé : « comment rajouter des tâches ? pourquoi je ne peux pas rajouter de PJ ? un nouveau PJ garde des tâches
// initiales associées à la production, aux tests ou au packing, avec une ressource atelier ou testeur ») ───────────────────
const RES_OPTS = (testers, phase) => [...(phase === "tests" ? [] : [["atelier", "Atelier"]]), ["testeur", "Testeur (à désigner)"], ...testers.map(t => [t.id, t.name])];
function NewPjDialog({ plan, rows, cal, testers, onClose, onApply }) {
  const known = (rows || []).filter(r => r && r.pj && !plan.pjs.some(p => p.pj === r.pj));
  const gammes = [...new Set([...(rows || []).map(r => r && r.gamme).filter(Boolean), ...Object.keys(plan.templates || {})])].sort();
  const [f, setF] = useState({ pj: "", nomProjet: "", gamme: "", start: "", banc: 1, tester: "testeur", durs: { production: 15, tests: 3, finProd: 5 }, works: { production: "", finProd: "" } });
  const [extra, setExtra] = useState([]); const [err, setErr] = useState("");
  const set = patch => setF(x => ({ ...x, ...patch }));
  const fromRow = known.find(r => String(r.pj).toUpperCase() === f.pj.trim().toUpperCase());
  const pickGamme = g => { const t = (plan.templates || {})[g]; set({ gamme: g, ...(t ? { durs: { production: (t.production && t.production.dur) || 15, tests: (t.tests && t.tests.dur) || 3, finProd: (t.finProd && t.finProd.dur) || 5 }, works: { production: t.production && t.production.work != null ? t.production.work : "", finProd: t.finProd && t.finProd.work != null ? t.finProd.work : "" } } : {}) }); };
  const ok = () => {
    const code = f.pj.trim().toUpperCase(); if (!code) { setErr("Saisissez le n° du PJ."); return; } if (plan.pjs.some(p => p.pj === code)) { setErr(code + " est déjà dans le plan."); return; }
    if (fromRow) { onApply(addPj(plan, fromRow.pj, fromRow, cal), fromRow.pj); onClose(); return; }
    if (!f.start) { setErr("Choisissez la date d'arrivée."); return; }
    const W = { production: f.works.production === "" ? null : Number(f.works.production), finProd: f.works.finProd === "" ? null : Number(f.works.finProd) };
    onApply(newPjPlan(plan, cal, { pj: code, nomProjet: f.nomProjet.trim() || null, gamme: f.gamme || null, start: f.start, banc: f.banc, tester: f.tester, durs: f.durs, works: { production: W.production == null ? undefined : W.production, finProd: W.finProd == null ? undefined : W.finProd }, extra }), code); onClose();
  };
  const L = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600, color: T.ink700 };
  const num = (v, on, label) => <input type="number" min={0} value={v} onChange={e => on(e.target.value)} aria-label={label} className="pg-in" style={{ ...INP, width: 70 }} />;
  return (<Modal title="Nouveau PJ" onClose={onClose} width={760}>
    <div style={{ fontSize: 13, color: T.ink500, lineHeight: 1.5, marginBottom: 12 }}>Un PJ du planning reprend ses dates. Un nouveau PJ reçoit ses tâches : Arrivée → Production → Tests → Packing → Départ, enchaînées, avec leurs ressources ; les durées viennent du modèle de sa gamme.</div>
    <datalist id="np-known">{known.map(r => <option key={r.pj} value={r.pj}>{r.nomProjet || ""}</option>)}</datalist>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
      <label style={L}>N° du PJ<input list="np-known" value={f.pj} onChange={e => { set({ pj: e.target.value }); setErr(""); }} placeholder="PJ512" className="pg-in" style={{ ...INP, fontFamily: T.fontMono }} /></label>
      {!fromRow && <label style={L}>Projet<input value={f.nomProjet} onChange={e => set({ nomProjet: e.target.value })} placeholder="Client / site" className="pg-in" style={{ ...INP }} /></label>}
      {!fromRow && <label style={L}>Gamme<select value={f.gamme} onChange={e => pickGamme(e.target.value)} className="pg-in" style={{ ...INP }}><option value="">—</option>{gammes.map(g => <option key={g} value={g}>{g}</option>)}</select></label>}
      {!fromRow && <label style={L}>Arrivée<input type="date" value={f.start} onChange={e => { set({ start: e.target.value }); setErr(""); }} className="pg-in" style={{ ...INP }} /></label>}
    </div>
    {fromRow ? <div style={{ marginTop: 12, fontSize: 13, color: T.emerald600, fontWeight: 600 }}>{fromRow.pj} est dans le planning : ses dates et ses heures sont reprises.</div> : <>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14, fontSize: 12.5 }}>
        <thead><tr>{["Tâche", "Durée (j ouvrés)", "Heures", "Ressource"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 6px", color: T.ink500, fontWeight: 600, borderBottom: "1px solid " + T.line }}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={{ padding: 6, fontWeight: 600 }}>Production</td><td>{num(f.durs.production, v => set({ durs: { ...f.durs, production: v } }), "Durée production")}</td><td>{num(f.works.production, v => set({ works: { ...f.works, production: v } }), "Heures production")}</td><td style={{ color: T.ink500 }}>Atelier</td></tr>
          <tr><td style={{ padding: 6, fontWeight: 600 }}>Tests</td><td>{num(f.durs.tests, v => set({ durs: { ...f.durs, tests: v } }), "Durée tests")}</td><td />
            <td style={{ display: "flex", gap: 6, padding: "4px 0" }}><select value={f.banc} onChange={e => set({ banc: Number(e.target.value) })} aria-label="Banc" className="pg-in" style={{ ...INP }}><option value={1}>Banc 1</option><option value={2}>Banc 2</option></select>
              <select value={f.tester} onChange={e => set({ tester: e.target.value })} aria-label="Testeur" className="pg-in" style={{ ...INP }}>{RES_OPTS(testers, "tests").map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td></tr>
          <tr><td style={{ padding: 6, fontWeight: 600 }}>Packing</td><td>{num(f.durs.finProd, v => set({ durs: { ...f.durs, finProd: v } }), "Durée packing")}</td><td>{num(f.works.finProd, v => set({ works: { ...f.works, finProd: v } }), "Heures packing")}</td><td style={{ color: T.ink500 }}>Atelier</td></tr>
          {extra.map((x, i) => <tr key={i}>
            <td style={{ padding: "4px 0", display: "flex", gap: 6 }}><input value={x.name} onChange={e => setExtra(l => l.map((y, j) => j === i ? { ...y, name: e.target.value } : y))} placeholder="Nom de la tâche" aria-label="Nom de la tâche" className="pg-in" style={{ ...INP, flex: 1 }} />
              <select value={x.phase} onChange={e => setExtra(l => l.map((y, j) => j === i ? { ...y, phase: e.target.value, res: e.target.value === "tests" ? "testeur" : "atelier" } : y))} aria-label="Phase" className="pg-in" style={{ ...INP }}>{PHASES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
            <td>{num(x.dur, v => setExtra(l => l.map((y, j) => j === i ? { ...y, dur: v } : y)), "Durée")}</td>
            <td>{num(x.work, v => setExtra(l => l.map((y, j) => j === i ? { ...y, work: v } : y)), "Heures")}</td>
            <td style={{ display: "flex", gap: 6, padding: "4px 0" }}><select value={x.res} onChange={e => setExtra(l => l.map((y, j) => j === i ? { ...y, res: e.target.value } : y))} aria-label="Ressource" className="pg-in" style={{ ...INP }}>{RES_OPTS(testers, x.phase).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <button type="button" onClick={() => setExtra(l => l.filter((_, j) => j !== i))} aria-label="Retirer cette tâche" style={{ ...BTN, padding: "4px 8px" }}>×</button></td>
          </tr>)}
        </tbody>
      </table>
      <button type="button" onClick={() => setExtra(l => [...l, { name: "", phase: "production", dur: 2, work: "", res: "atelier" }])} style={{ ...BTN, marginTop: 8 }}>＋ Tâche supplémentaire</button>
    </>}
    {err && <div role="alert" style={{ color: T.red500, fontWeight: 600, fontSize: 13, marginTop: 10 }}>{err}</div>}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><button style={{ ...BTN }} onClick={onClose}>Annuler</button><button style={{ ...BTN_P }} onClick={ok}>Ajouter le PJ</button></div>
  </Modal>);
}
function TaskDialog({ plan, pj, after, testers, onClose, onApply }) {
  const p = plan.pjs.find(x => x.pj === pj); const keys = p ? stepKeysOf(p) : [];
  const [f, setF] = useState({ name: "", phase: "production", dur: 2, work: "", res: "atelier", after: after && keys.includes(after) ? after : (keys.includes("production") ? "production" : keys[keys.length - 1] || "") });
  const [err, setErr] = useState(""); const set = patch => setF(x => ({ ...x, ...patch }));
  const ok = () => { if (!f.name.trim()) { setErr("Donnez un nom à la tâche."); return; } const r = addPhaseTask(plan, pj, { name: f.name.trim(), phase: f.phase, dur: f.dur, work: f.work, res: f.res, after: f.after || null }); onApply(r.plan, r.key); onClose(); };
  const L = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600, color: T.ink700 };
  return (<Modal title={"Nouvelle tâche · " + pj} onClose={onClose} width={620}>
    <div style={{ fontSize: 13, color: T.ink500, lineHeight: 1.5, marginBottom: 12 }}>La tâche est rangée dans sa phase et commence après la tâche choisie (lien fin → début). Ses heures comptent dans la charge si elle est faite par l'atelier.</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
      <label style={L}>Nom<input autoFocus={AF} value={f.name} onChange={e => { set({ name: e.target.value }); setErr(""); }} placeholder="Câblage armoire" className="pg-in" style={{ ...INP }} /></label>
      <label style={L}>Phase<select value={f.phase} onChange={e => set({ phase: e.target.value, res: e.target.value === "tests" ? "testeur" : "atelier" })} className="pg-in" style={{ ...INP }}>{PHASES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label style={L}>Ressource<select value={f.res} onChange={e => set({ res: e.target.value })} className="pg-in" style={{ ...INP }}>{RES_OPTS(testers, f.phase).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label style={L}>Durée (j ouvrés)<input type="number" min={1} value={f.dur} onChange={e => set({ dur: e.target.value })} className="pg-in" style={{ ...INP }} /></label>
      <label style={L}>Heures<input type="number" min={0} value={f.work} onChange={e => set({ work: e.target.value })} className="pg-in" style={{ ...INP }} /></label>
      <label style={L}>Après<select value={f.after} onChange={e => set({ after: e.target.value })} className="pg-in" style={{ ...INP }}><option value="">— (sans lien)</option>{keys.map(k => <option key={k} value={k}>{stepLabel(p, k)}</option>)}</select></label>
    </div>
    {err && <div role="alert" style={{ color: T.red500, fontWeight: 600, fontSize: 13, marginTop: 10 }}>{err}</div>}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><button style={{ ...BTN }} onClick={onClose}>Annuler</button><button style={{ ...BTN_P }} onClick={ok}>Ajouter la tâche</button></div>
  </Modal>);
}

function BlankDialog({ rows, onClose, onApply, hasPlan }) {
  const [txt, setTxt] = useState("PJ479-1, PJ479-2, PJ456, PJ472");
  const codes = txt.split(/[,;\s]+/).filter(Boolean);
  return (<Modal title="Repartir d'un plan vierge" onClose={onClose} width={620}>
    <div style={{ fontSize: 13.5, color: T.ink500, lineHeight: 1.55 }}>Crée un plan avec seulement ces PJ : les 5 étapes de chacun, <b>sans aucune date, sans durée et sans lien</b>. Vous saisissez ensuite les dates, durées et prédécesseurs dans le tableau. Les heures de travail du planning actuel sont reprises quand le PJ existe.{hasPlan ? " Le plan en cours est remplacé (Annuler le rétablit). Le planning actuel n'est pas modifié tant que vous ne publiez pas." : ""}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: T.ink500, margin: "12px 0 4px" }}>PJ à garder (séparés par des virgules)</div>
    <input value={txt} onChange={e => setTxt(e.target.value)} style={{ ...INP, width: "100%", fontFamily: T.fontMono }} aria-label="Codes des PJ à garder" />
    <div style={{ fontSize: 12.5, color: T.ink500, marginTop: 6 }}>{codes.map(c => { const r = (rows || []).find(x => String(x.pj).toLowerCase() === c.toLowerCase()); return c.toUpperCase() + (r ? "" : " (nouveau)"); }).join(" · ")}</div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
      <button style={{ ...BTN }} onClick={onClose}>Annuler</button>
      <button style={{ ...BTN_P }} disabled={!codes.length} onClick={() => { onApply(initBlankPlan(codes, rows)); onClose(); }}>Créer le plan vierge ({codes.length} PJ)</button>
    </div>
  </Modal>);
}

// v258 (demandé : « choisir les modifications que j'annonce aux utilisateurs ; la modification d'heures d'une tâche n'intéresse pas
// les autres ») : une case par changement ; heures décochées par défaut. Tout est publié ; seuls les changements cochés sont annoncés
// (page Modifications, cloche, repères ↻ de la Liste et du Calendrier).
const HOUR_FIELDS = new Set(["heuresAtelier", "heuresAutom"]);
function PublishDialog({ plan, sched, rows, pubRows, changes, onClose, onPublish }) {
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState(null);
  const keyOf = c => c.pj + "|" + c.field;
  const [ann, setAnn] = useState(() => new Set(changes.filter(c => !HOUR_FIELDS.has(c.field)).map(keyOf)));
  const flip = (keys, on) => setAnn(s => { const n = new Set(s); keys.forEach(k => { if (on) n.add(k); else n.delete(k); }); return n; });
  const nAnn = changes.filter(c => ann.has(keyOf(c))).length;
  // v260 : PJ qui dépassent (davantage) leur date contractuelle avec cette publication, et jalons de facturation liés au planning qui reculent
  const lateList = useMemo(() => {
    const cur = {}; (rows || []).forEach(r => { cur[r.pj] = r; }); const t = new Date(), out = [];
    (pubRows || []).forEach(r => { const o = cur[r.pj]; if (!r.depart || (o && o.depart === r.depart)) return; const m = getPjMeta(r.pj, r), a = contractLate(m, r.depart, t); if (!a || a.lateDays <= 0) return; const b = o && o.depart ? contractLate(m, o.depart, t) : null; if (b && b.lateDays >= a.lateDays) return; out.push({ pj: r.pj, a, b }); });
    return out.sort((x, y) => y.a.lateDays - x.a.lateDays);
  }, [rows, pubRows]);
  const cashLate = useMemo(() => {
    const doc = getCashinDoc(); if (!doc || !Array.isArray(doc.rows)) return [];
    const now = {}, nxt = {}; (rows || []).forEach(r => { now[r.pj] = r; }); (pubRows || []).forEach(r => { nxt[r.pj] = r; });
    return doc.rows.filter(r => !r.factReelle && !r.encReelle).map(r => ({ r, a: anchoredBill(r, now), b: anchoredBill(r, nxt) })).filter(x => x.a && x.b && x.b > x.a).map(x => ({ ...x, d: diffDays(x.a, x.b) }));
  }, [rows, pubRows]);
  const byPj = useMemo(() => { const m = {}; changes.forEach(c => { (m[c.pj] = m[c.pj] || []).push(c); }); return m; }, [changes]);
  const unschedL = Object.values(sched.nodes).filter(n => n.s === null && !isEstimatePj(n.pj)), unscheduled = unschedL.length; // v258 : un PJXX (estimation) n’est jamais publié
  const FL = { arrivee: "Arrivée", tests: "Tests", testsFin: "Fin tests", finProd: "Fin prod.", depart: "Départ", heuresAtelier: "Heures atelier", heuresAutom: "Heures autom", new: "Nouveau PJ" };
  const go = async () => { setBusy(true); setErr(""); try { const r = await onPublish(note.trim(), new Set(changes.filter(c => ann.has(keyOf(c))).map(keyOf))); setDone(r); } catch (e) { setErr(e.message || String(e)); } setBusy(false); };
  return (<Modal title="Publier dans le planning actuel" onClose={onClose} width={760}>
    {done ? <div style={{ fontSize: 14, color: T.emerald600, fontWeight: 600 }}>✓ Publié : {done.nChanges} changement(s) appliqués, {done.nAnnounced || 0} annoncé(s) aux utilisateurs. Tous les écrans utilisent maintenant ces dates.<div style={{ marginTop: 12, textAlign: "right" }}><button style={{ ...BTN_P }} onClick={onClose}>Fermer</button></div></div> : <>
      <div style={{ fontSize: 13.5, color: T.ink500, lineHeight: 1.55 }}>{changes.length === 0 ? "Le planning actuel est déjà identique au plan : rien à publier." : <>Ces changements remplaceront les dates du planning actuel (calendrier, Gantt, liste, KPI, rapport CODIR). Le planning <b>initial</b> n'est pas modifié. Une copie de l'état actuel est gardée pour pouvoir annuler. <b>Cochez ce que vous annoncez</b> aux utilisateurs (page Modifications, cloche) : le reste est publié sans être annoncé.</>}</div>
      {unscheduled > 0 && <div style={{ color: T.amber600, fontSize: 12.5, marginTop: 6 }}>⚠ {unscheduled} étape(s) du plan n'ont pas de date (ni date imposée ni prédécesseur) : les dates correspondantes seront vides — {unschedL.slice(0, 6).map(n => n.pj + " · " + stepLabel(plan.pjs.find(x => x.pj === n.pj), n.step)).join(", ")}{unscheduled > 6 ? "…" : ""}.</div>}
      {changes.length > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10, fontSize: 12.5, color: T.ink500 }}>
        <span>{nAnn} sur {changes.length} annoncé{nAnn > 1 ? "s" : ""}</span>
        <button type="button" style={{ ...BTN, minHeight: 26, padding: "0 10px" }} onClick={() => flip(changes.map(keyOf), true)}>Tout annoncer</button>
        <button type="button" style={{ ...BTN, minHeight: 26, padding: "0 10px" }} onClick={() => setAnn(new Set(changes.filter(c => !HOUR_FIELDS.has(c.field)).map(keyOf)))}>Dates seulement</button>
        <button type="button" style={{ ...BTN, minHeight: 26, padding: "0 10px" }} onClick={() => setAnn(new Set())}>Ne rien annoncer</button>
      </div>}
      {changes.length > 0 && <div style={{ marginTop: 8, border: "1px solid " + T.line, borderRadius: 12, maxHeight: 300, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}><tbody>
          {Object.keys(byPj).map(pj => byPj[pj].map((c, i) => (<tr key={pj + i} style={{ borderTop: i === 0 ? "1px solid " + T.line : "none", opacity: ann.has(keyOf(c)) ? 1 : 0.6 }}>
            <td style={{ padding: "4px 4px 4px 10px", width: 28 }}><input type="checkbox" checked={ann.has(keyOf(c))} onChange={e => flip([keyOf(c)], e.target.checked)} aria-label={"Annoncer " + pj + " " + (FL[c.field] || c.field)} /></td>
            <td style={{ padding: "4px 10px", fontFamily: T.fontMono, fontWeight: 600, color: T.teal600, width: 90 }}>{i === 0 ? <label style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }} title="Annoncer ou non tous les changements de ce PJ"><input type="checkbox" checked={byPj[pj].every(x => ann.has(keyOf(x)))} onChange={e => flip(byPj[pj].map(keyOf), e.target.checked)} aria-label={"Annoncer tout " + pj} />{pj}</label> : ""}</td>
            <td style={{ padding: "4px 10px", color: T.ink500, width: 100 }}>{FL[c.field] || c.field}</td>
            <td style={{ padding: "4px 10px", color: T.ink700 }}>{c.field === "new" ? fmtIso(c.to) : (typeof c.from === "number" ? c.from : fmtIso(c.from)) + " → " + (typeof c.to === "number" ? c.to : fmtIso(c.to))}</td>
          </tr>)))}
        </tbody></table></div>}
      {lateList.length > 0 && <div role="alert" style={{ marginTop: 10, border: "1px solid " + T.red500, borderRadius: 12, padding: "8px 12px", background: T.red100 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: T.red600, marginBottom: 4 }}>⚠ {lateList.length} PJ dépasse{lateList.length > 1 ? "nt" : ""} sa date contractuelle avec cette publication</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, color: T.ink900 }}><tbody>{lateList.map(x => <tr key={x.pj}>
          <td style={{ padding: "2px 8px 2px 0", fontFamily: T.fontMono, fontWeight: 600, width: 90 }}>{x.pj}</td>
          <td style={{ padding: "2px 8px", color: T.ink700 }}>{x.a.refLabel} contractuelle {fmtIso(x.a.contract)}</td>
          <td style={{ padding: "2px 8px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>retard {x.b ? x.b.lateDays + " → " : ""}<b>{x.a.lateDays} j</b></td>
          <td style={{ padding: "2px 0 2px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{x.a.amount != null ? <>pénalités {x.b && x.b.amount != null ? fmtEur(x.b.amount) + " → " : ""}<b>{fmtEur(x.a.amount)}</b></> : <span style={{ color: T.ink500 }}>pénalités non renseignées</span>}</td>
        </tr>)}</tbody></table>
      </div>}
      {cashLate.length > 0 && <div style={{ marginTop: 10, border: "1px solid " + T.amber600, borderRadius: 12, padding: "8px 12px" }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: T.amber600, marginBottom: 4 }}>{cashLate.length} facturation{cashLate.length > 1 ? "s" : ""} liée{cashLate.length > 1 ? "s" : ""} au planning recule{cashLate.length > 1 ? "nt" : ""} ({fmtEur(cashLate.reduce((s, x) => s + (Number(x.r.montant) || 0), 0))})</div>
        {cashLate.slice(0, 8).map(x => <div key={x.r.id} style={{ fontSize: 12.5, color: T.ink700, display: "flex", gap: 8 }}><b style={{ fontFamily: T.fontMono }}>{x.r.pj}</b><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.r.jalon}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtIso(x.a)} → {fmtIso(x.b)} (+{x.d} j)</span></div>)}
        <div style={{ fontSize: 12, color: T.ink500, marginTop: 4 }}>Après la publication, le Cash in propose de mettre ces dates à jour.</div>
      </div>}
      {changes.length > 0 && <input value={note} onChange={e => setNote(e.target.value)} placeholder="Commentaire de publication (facultatif) : ex. « glissement PJ449 suite retard fournisseur »" style={{ ...INP, width: "100%", marginTop: 10 }} />}
      {err && <div style={{ color: T.red500, fontWeight: 600, fontSize: 13, marginTop: 8 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button style={{ ...BTN }} onClick={onClose}>Annuler</button>
        <button style={{ ...BTN_P }} disabled={busy || changes.length === 0 || !!sched.cycle} onClick={go}>{busy ? "Publication…" : "Publier " + changes.length + " changement" + (changes.length > 1 ? "s" : "")}</button>
      </div></>}
  </Modal>);
}

// v259 (demandé : « choisir de quand à quand je nivelle la charge et sur quelle capacité ») : aperçu ensuite, comme avant
function LevelDialog({ plan, onClose, onGo }) {
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const d0 = new Date(), d1 = new Date(d0.getFullYear(), d0.getMonth() + 3, d0.getDate()), base = Math.round(capWeek(plan));
  const [f, setF] = useState({ from: iso(d0), to: iso(d1), cap: String(base) }); const [err, setErr] = useState("");
  const L = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600, color: T.ink700 };
  const go = () => { if (!f.from || !f.to || f.to < f.from) { setErr("La fin doit être après le début."); return; } const c = Number(f.cap); if (!(c > 0)) { setErr("Donnez une capacité en heures par semaine."); return; } onGo({ from: f.from, to: f.to, cap: c === base ? null : c }); };
  return (<Modal title="Niveler la charge atelier" onClose={onClose} width={560}>
    <div style={{ fontSize: 13, color: T.ink500, lineHeight: 1.5, marginBottom: 12 }}>Seules les semaines de cette période sont nivelées : les phases qui commencent avant le début ne bougent pas. Vous voyez le résultat avant de l'appliquer.</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
      <label style={L}>Du<input type="date" value={f.from} onChange={e => { setF({ ...f, from: e.target.value }); setErr(""); }} className="pg-in" style={{ ...INP }} /></label>
      <label style={L}>Au<input type="date" value={f.to} onChange={e => { setF({ ...f, to: e.target.value }); setErr(""); }} className="pg-in" style={{ ...INP }} /></label>
      <label style={L}>Capacité (h / semaine)<input type="number" min={1} value={f.cap} onChange={e => { setF({ ...f, cap: e.target.value }); setErr(""); }} className="pg-in" style={{ ...INP }} /></label>
    </div>
    <div style={{ fontSize: 12, color: T.ink500, marginTop: 6 }}>Capacité du plan : {base} h / semaine (garder ce chiffre conserve aussi les semaines à capacité spéciale).</div>
    {err && <div role="alert" style={{ color: T.red500, fontWeight: 600, fontSize: 13, marginTop: 10 }}>{err}</div>}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><button style={{ ...BTN }} onClick={onClose}>Annuler</button><button style={{ ...BTN_P }} onClick={go}>Voir le nivellement</button></div>
  </Modal>);
}

function HistoryDialog({ onClose, onLoad, onRestorePlan, onRestorePub }) {
  const [items, setItems] = useState(null); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  useEffect(() => { onLoad().then(setItems).catch(e => setErr(e.message)); }, []); // eslint-disable-line
  return (<Modal title="Historique des publications" onClose={onClose}>
    {err && <div style={{ color: T.red500 }}>{err}</div>}{msg && <div style={{ color: T.emerald600, fontWeight: 600, margin: "6px 0" }}>{msg}</div>}
    {items === null && !err && <div style={{ color: T.ink500 }}>Chargement…</div>}
    {items && items.length === 0 && <div style={{ color: T.ink500, fontSize: 13.5 }}>Aucune publication pour l'instant.</div>}
    {items && items.map(e => (<div key={e.at} style={{ borderTop: "1px solid " + T.line, padding: "10px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 220 }}><div style={{ fontWeight: 600, fontSize: 13.5, color: T.ink900 }}>{new Date(e.at).toLocaleString("fr-FR")} · {e.by || "—"}</div>
        <div style={{ fontSize: 12.5, color: T.ink500 }}>{e.nChanges} changement(s){e.note ? " · " + e.note : ""}</div></div>
      <button style={{ ...BTN }} title="Recharge le plan tel qu'il était à cette publication (n'est pas publié automatiquement)" onClick={() => { onRestorePlan(e.plan); setMsg("Plan rechargé dans l'éditeur (non publié)."); }}>Recharger ce plan</button>
      <button style={{ ...BTN, color: T.red500 }} title="Remet dans le planning actuel les dates d'avant cette publication" onClick={async () => { if (!(await askConfirm({ title: "Annuler cette publication ?", message: "Le planning actuel revient aux dates d'avant cette publication, pour tout le monde.", confirmLabel: "Annuler la publication", cancelLabel: "Garder", danger: true }))) return; try { await onRestorePub(e.at); setMsg("Publication annulée : le planning actuel est revenu à l'état précédent."); } catch (x) { setErr(x.message); } }}>Annuler cette publication</button>
    </div>))}
    <div style={{ textAlign: "right", marginTop: 10 }}><button style={{ ...BTN }} onClick={onClose}>Fermer</button></div>
  </Modal>);
}

// Résumé d'une proposition : combien d'étapes changent, jusqu'à quand les départs reculent
function compareScheds(a, b, cal) {
  let steps = 0; const pjs = new Set(); let maxDelay = 0, lateDeparts = 0;
  Object.keys(b.nodes).forEach(k => { const x = a.nodes[k], y = b.nodes[k]; if (!x || x.s === null || y.s === null) return; if (x.start !== y.start) { steps++; pjs.add(y.pj); } if (y.step === "depart") { const d = y.s - x.s; if (d > 0) { lateDeparts++; maxDelay = Math.max(maxDelay, d); } } });
  return { steps, pjs: pjs.size, maxDelay, lateDeparts };
}

function loadUi() { try { return { zoom: "week", links: false, loadMode: "week", view: "both", lock: false, ...JSON.parse(localStorage.getItem("planUi105") || "{}") }; } catch (e) { return { zoom: "week", links: false, loadMode: "week", view: "both", lock: false }; } }
function saveUi(u) { try { localStorage.setItem("planUi105", JSON.stringify(u)); } catch (e) { /* stockage indisponible */ } }

// Place un PJ à la position d'un autre (priorité) ; l'ordre de passage suit quand les règles sont actives
function moveTo(plan, pj, over) {
  const i = plan.pjs.findIndex(p => p.pj === pj), j = plan.pjs.findIndex(p => p.pj === over); if (i < 0 || j < 0 || i === j) return plan;
  const pjs = plan.pjs.slice(); const [it] = pjs.splice(i, 1); pjs.splice(j, 0, it);
  const np = { ...plan, pjs };
  if (plan.order) { const order = {}; ["prod", "banc"].forEach(res => { const o = (plan.order[res] || []).filter(x => x !== pj); const k = (plan.order[res] || []).indexOf(over); const had = (plan.order[res] || []).includes(pj); if (!had || k < 0) { order[res] = plan.order[res]; return; } const at = o.indexOf(over); o.splice(i < j ? at + 1 : at, 0, pj); order[res] = o; }); np.order = order; }
  return np;
}

// v224 (demandé : « 2 slots de banc d'essai : 2 machines en même temps, jamais 2 machines sur le même slot ; une attribution
// simple et claire ») : une ligne par banc, ses machines dans l'ordre (dates, chevauchements en rouge), changer de banc d'un clic,
// « Allouer automatiquement » (banc libre le plus tôt + une machine à la fois par banc, ordre = ordre des tests).
// v259 (demandé : « une vision planning / frise chronologique avec les 2 bancs l'un au-dessus de l'autre ; allouer les tests
// d'une machine au banc que je souhaite en glisser-déposer ») : une ligne par banc, une barre par machine (jours ouvrés), les
// machines qui se chevauchent sur un même banc passent sur une sous-ligne et sont en rouge. Glisser une barre sur l'autre banc
// = setBench ; au clavier : flèche haut / bas. Le jour est repéré par un trait.
// v260 (demandé : « glisser les tests dans le temps sur la frise des bancs, en gardant les liens ») : un glisser horizontal décale
// le début des tests d'autant de jours ouvrés (startAtKeepLinks, comme la fenêtre d'une tâche) ; flèches gauche / droite au clavier.
const BT_PX = 18, BT_LBL = 74, BT_BAR = 24;
function BenchTimeline({ items, lo, hi, cal, bad, today, readOnly, onDrop }) {
  const [drag, setDrag] = useState(null); const rows = useRef({}), land = useRef(null), box = useRef(null);
  // v263 (audit apple-design) : après un dépôt, la barre repart de l'endroit où on l'a lâchée et glisse jusqu'à sa place
  useLayoutEffect(() => { const l = land.current; if (!l || !box.current) return; land.current = null; const el = box.current.querySelector('[data-bench-pj="' + (window.CSS && CSS.escape ? CSS.escape(l.pj) : l.pj) + '"]'); landFrom(el, l.rect); });
  const span = Math.max(1, hi - lo + 1), W = span * BT_PX;
  const lanesOf = L => { const ends = []; return L.map(x => { let k = ends.findIndex(e => e < x.n.s); if (k < 0) { k = ends.length; ends.push(x.n.f); } else ends[k] = x.n.f; return { ...x, lane: k }; }); };
  const benches = [1, 2].map(b => { const L = lanesOf(items.filter(x => x.b === b)); return { b, L, h: Math.max(1, ...L.map(x => x.lane + 1)) * (BT_BAR + 6) + 10 }; });
  const ticks = []; for (let i = lo; i <= hi; i++) { const d = cal.dateOf(i); if (i === lo || new Date(d + "T00:00:00").getDay() === 1) ticks.push({ i, d }); }
  const ti = today ? cal.idxOnOrAfter(today) : null;
  const benchAt = y => { let hit = null; Object.keys(rows.current).forEach(b => { const el = rows.current[b]; if (!el) return; const r = el.getBoundingClientRect(); if (y >= r.top && y <= r.bottom) hit = Number(b); }); return hit; };
  const down = (e, x) => { if (readOnly || (e.button != null && e.button !== 0)) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ pj: x.p.pj, from: x.b, s: x.n.s, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, over: x.b }); };
  const move = e => { if (!drag) return; setDrag(d => ({ ...d, dx: e.clientX - d.x0, dy: e.clientY - d.y0, over: benchAt(e.clientY) || d.over })); };
  const up = e => { if (!drag) return; const d = drag; const el = box.current && box.current.querySelector('[data-bench-pj="' + (window.CSS && CSS.escape ? CSS.escape(d.pj) : d.pj) + '"]'); if (el) land.current = { pj: d.pj, rect: el.getBoundingClientRect() }; setDrag(null); const days = Math.round(d.dx / BT_PX); const b = d.over && d.over !== d.from ? d.over : null; if (b || days) onDrop(d.pj, b, days ? cal.dateOf(d.s + days) : null); };
  const dayTxt = drag && Math.round(drag.dx / BT_PX) ? cal.dateOf(drag.s + Math.round(drag.dx / BT_PX)) : null;
  if (!items.length) return <div style={{ fontSize: 12.5, color: T.ink500, margin: "6px 0 12px" }}>Aucune machine avec des tests datés sur cette période.</div>;
  return (<div style={{ border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
    <div style={{ fontSize: 12, color: T.ink500, padding: "6px 10px", borderBottom: "1px solid " + T.line, background: T.surface }}>{readOnly ? "Frise des bancs." : dayTxt ? "Début des tests le " + fmtIso(dayTxt) + " (les liens du PJ sont gardés)" : "Glissez une machine sur l'autre banc pour l'y affecter, ou à gauche / droite pour changer ses dates (liens gardés). Au clavier : flèches."}</div>
    <div style={{ overflowX: "auto" }}>
      <div ref={box} style={{ position: "relative", width: BT_LBL + W, minWidth: "100%" }} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
        <div style={{ position: "relative", height: 22, marginLeft: BT_LBL, borderBottom: "1px solid " + T.line }}>
          {ticks.map(t => <span key={t.i} style={{ position: "absolute", left: (t.i - lo) * BT_PX, top: 4, fontSize: 11, color: T.ink500, whiteSpace: "nowrap", borderLeft: "1px solid " + T.line, paddingLeft: 3, fontVariantNumeric: "tabular-nums" }}>{fmtIso(t.d).slice(0, 5)}</span>)}
        </div>
        {benches.map(({ b, L, h }) => { const over = drag && drag.over === b && drag.from !== b; return (
          <div key={b} ref={el => { rows.current[b] = el; }} aria-label={"Banc " + b} style={{ position: "relative", height: h, borderTop: b === 2 ? "1px solid " + T.line : "none", background: over ? T.surfaceAlt : "transparent", outline: over ? "2px dashed " + T.teal600 : "none", outlineOffset: -2 }}>
            <div style={{ position: "sticky", left: 0, zIndex: 3, width: BT_LBL, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 10px", background: T.card, borderRight: "1px solid " + T.line, boxSizing: "border-box" }}>
              <b style={{ fontSize: 13 }}>Banc {b}</b><span style={{ fontSize: 11, color: T.ink500 }}>{L.length} PJ</span>
            </div>
            {ticks.map(t => <span key={t.i} aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: BT_LBL + (t.i - lo) * BT_PX, width: 1, background: T.line, opacity: 0.6 }} />)}
            {ti !== null && ti >= lo && ti <= hi && <span aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: BT_LBL + (ti - lo) * BT_PX, width: 2, background: T.red500, opacity: 0.7, zIndex: 1 }} />}
            {L.map(x => { const me = drag && drag.pj === x.p.pj, red = bad.has(x.p.pj); return (
              <div key={x.p.pj} data-bench-pj={x.p.pj} role="button" tabIndex={0} aria-label={x.p.pj + ", banc " + b + ", tests du " + fmtIso(x.n.start) + " au " + fmtIso(x.n.finish)}
                title={x.p.pj + (x.p.nomProjet ? " · " + x.p.nomProjet : "") + "\n" + fmtIso(x.n.start) + " → " + fmtIso(x.n.finish) + " (" + x.n.dur + " j)" + (red ? "\nChevauche une autre machine sur ce banc" : "")}
                onPointerDown={e => down(e, x)}
                onKeyDown={e => { if (readOnly) return; if (e.key === "ArrowUp" && b === 2) { e.preventDefault(); onDrop(x.p.pj, 1, null); } if (e.key === "ArrowDown" && b === 1) { e.preventDefault(); onDrop(x.p.pj, 2, null); } if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); onDrop(x.p.pj, null, cal.dateOf(x.n.s + (e.key === "ArrowRight" ? 1 : -1))); } }}
                style={{ position: "absolute", left: BT_LBL + (x.n.s - lo) * BT_PX + 1, width: Math.max(BT_PX - 2, (x.n.f - x.n.s + 1) * BT_PX - 2), top: 6 + x.lane * (BT_BAR + 6), height: BT_BAR, borderRadius: 4, background: red ? T.red500 : STEP_COLOR.tests, color: T.card, fontSize: 11.5, fontWeight: 600, fontFamily: T.fontMono, display: "flex", alignItems: "center", padding: "0 6px", boxSizing: "border-box", overflow: "hidden", whiteSpace: "nowrap", cursor: readOnly ? "default" : me ? "grabbing" : "grab", zIndex: me ? 6 : 2, transform: me ? "translate(" + drag.dx + "px," + drag.dy + "px)" : "none", boxShadow: me ? T.shadowLg : "none", touchAction: "none", userSelect: "none" }}>{x.p.pj}</div>); })}
          </div>); })}
      </div>
    </div>
  </div>);
}

function BenchDialog({ plan, sched, cal, hide, skip, readOnly, onClose, onApply }) {
  const [past, setPast] = useState(false);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const rule = rulesOf(plan).banc; const conf = benchConflicts(plan, sched, { skip, since: past ? null : (d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"))(new Date()) }); const bad = new Set(conf.map(c => c.pj));
  const items = plan.pjs.filter(p => p.steps.tests && !(hide && hide.has(p.pj)) && !(skip && skip(p))).map(p => ({ p, b: Number(p.steps.tests.banc) === 2 ? 2 : 1, n: sched.nodes[p.pj + "|tests"] })).filter(x => x.n && x.n.s !== null).sort((a, b) => a.n.s - b.n.s);
  const d0 = new Date(), t0 = d0.getFullYear() + "-" + String(d0.getMonth() + 1).padStart(2, "0") + "-" + String(d0.getDate()).padStart(2, "0");
  const shown = items.filter(x => past || x.n.finish >= t0);
  const lo = shown.length ? Math.min(...shown.map(x => x.n.s)) : 0, hi = shown.length ? Math.max(...shown.map(x => x.n.f)) : 1;
  const withRule = np => benchOrderByStart({ ...np, rules: { ...rulesOf(np), banc: true } }, cal);
  const tb = { border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "2px 8px", fontSize: 11.5, fontWeight: 600, cursor: readOnly ? "default" : "pointer", minHeight: 24, fontFamily: T.font };
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,.45)", zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label="Bancs d'essai" onClick={e => e.stopPropagation()} style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(980px,100%)", maxHeight: "90dvh", overflow: "auto", padding: "16px 18px", fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 18 }}>Bancs d'essai</div>
        <span style={{ fontSize: 12.5, color: T.ink500 }}>2 bancs : deux machines peuvent être testées en même temps, une seule par banc.</span>
        <button type="button" onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minHeight: 28 }}>Fermer</button>
      </div>
      {/* v226 (demandé : « je ne comprends pas l’interdiction des chevauchements ; il faut un moyen rapide d’allouer en auto ») : un bouton qui fait tout */}
      <div style={{ margin: "10px 0", padding: "10px 12px", borderRadius: 8, border: "1px solid " + T.line, background: T.surface, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: T.ink700, lineHeight: 1.5 }}>
          <b style={{ color: T.ink900 }}>Allouer automatiquement</b> : chaque machine va sur le banc libre le plus tôt. Si les deux bancs sont pris, ses tests attendent la fin de la machine précédente sur son banc (les dates suivantes se décalent). Annulable avec ↶.
        </div>
        {!readOnly && <button type="button" style={{ ...tb, background: T.ink900, color: T.card, borderColor: T.ink900, padding: "6px 14px", fontSize: 12.5 }} onClick={() => onApply(withRule(splitBenchesV(plan, cal)), "Bancs alloués : une seule machine à la fois par banc, chacune sur le banc libre le plus tôt.")}>Allouer automatiquement</button>}
      </div>
      <div role="status" style={{ marginBottom: 10, padding: "6px 12px", borderRadius: 8, background: conf.length ? T.red100 : T.emerald100, color: conf.length ? T.red500 : T.emerald600, fontSize: 12.5, fontWeight: 600, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 220 }}>{conf.length ? conf.length + " machine" + (conf.length > 1 ? "s" : "") + " sur un banc déjà occupé : " + conf.slice(0, 3).map(c => c.pj + " avec " + c.with + " (banc " + c.b + ")").join(" ; ") + (conf.length > 3 ? "…" : "") + ". Cliquez « Allouer automatiquement »." : rule ? "Aucun conflit : chaque banc teste une machine à la fois, les suivantes attendent leur tour." : "Aucun conflit pour l’instant."}</span>
        {!readOnly && <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500, color: T.ink700, cursor: "pointer" }} title="Coché : une machine qui arrive sur un banc occupé attend la fin de la précédente (ses dates se décalent). Décoché : rien ne l’empêche."><input type="checkbox" checked={rule} onChange={e => onApply(e.target.checked ? withRule(plan) : setRules(plan, { banc: false }), e.target.checked ? "Une machine à la fois par banc : les suivantes attendent leur tour." : "Plusieurs machines peuvent de nouveau se trouver sur le même banc.")} />Une machine à la fois par banc</label>}
      </div>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.ink700, marginBottom: 8, cursor: "pointer" }}><input type="checkbox" checked={past} onChange={e => setPast(e.target.checked)} />Afficher les tests terminés</label>
      <BenchTimeline items={shown} lo={lo} hi={hi} cal={cal} bad={bad} today={t0} readOnly={readOnly} onDrop={(pj, b, iso) => { let np = plan; const msg = []; if (b) { np = setBench(np, cal, pj, b); msg.push(pj + " passe sur le banc " + b); }
        if (iso) { const r = startAtKeepLinks(np, cal, pj, "tests", iso); np = r.plan; msg.push(r.blocked ? "début des tests au plus tôt possible (" + r.blocked + ")" : "tests à partir du " + fmtIso(iso)); }
        onApply(np, msg.join(" ; ").replace(/^./, c => c.toUpperCase()) + "."); }} />
      {[1, 2].map(b => { const L = shown.filter(x => x.b === b); return (<section key={b} aria-label={"Banc " + b} style={{ borderTop: "1px solid " + T.line, padding: "8px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}><b style={{ fontSize: 14 }}>Banc {b}</b><span style={{ fontSize: 12, color: T.ink500 }}>{L.length} machine{L.length > 1 ? "s" : ""}</span></div>
        {L.length === 0 && <div style={{ fontSize: 12.5, color: T.ink500 }}>Aucune machine sur ce banc.</div>}
        {L.map((x, i) => { const c = conf.find(k => k.pj === x.p.pj); return (<div key={x.p.pj} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 34, borderTop: i ? "1px solid " + T.line : "none", fontSize: 13, flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.fontMono, fontWeight: 600, color: T.teal600, width: 86 }}>{x.p.pj}</span>
          <span style={{ flex: 1, minWidth: 120, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.p.nomProjet || ""}</span>
          <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtIso(x.n.start)} → {fmtIso(x.n.finish)}</span>
          <span style={{ width: 44, textAlign: "right", color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{x.n.dur} j</span>
          <span style={{ width: 150, fontSize: 12, fontWeight: 600, color: c ? T.red500 : T.ink300 }}>{c ? "chevauche " + c.with : ""}</span>
          {!readOnly && rule && <button type="button" style={tb} disabled={i === 0} onClick={() => onApply(benchMoveUp(plan, x.p.pj), x.p.pj + " passe avant " + L[i - 1].p.pj + " sur le banc " + b + ".")} title="Faire passer ce PJ avant le précédent sur ce banc">Passer avant</button>}
          {!readOnly && <button type="button" style={tb} onClick={() => onApply(setBench(plan, cal, x.p.pj, b === 1 ? 2 : 1), x.p.pj + " passe sur le banc " + (b === 1 ? 2 : 1) + ".")}>→ Banc {b === 1 ? 2 : 1}</button>}
        </div>); })}
      </section>); })}
    </div>
  </div>);
}

function Banner({ tone, children }) {
  const c = { warn: [T.amber100, T.amber600], bad: [T.red100, T.red500], ok: [T.emerald100, T.emerald600] }[tone];
  return <div role="status" style={{ background: c[0], color: c[1], borderRadius: 12, padding: "8px 14px", fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{children}</div>;
}

export function PlannerView({ planLoaded, planDoc, rows, closurePeriods, productionExclusions, authorName, onSavePlan, onPublish, onLoadHistory, onRestorePublication, testers, pendingDeparts, onPendingApplied }) {
  const [plan, setPlanState] = useState(null); const [preview, setPreview] = useState(null); const [proposal, setProposal] = useState(null);
  const [undo, setUndo] = useState([]); const [redo, setRedo] = useState([]);
  const [sel, setSel] = useState(null); const [exp, setExp] = useState(() => new Set());
  const [q, setQ] = useState(""); const [dlg, setDlg] = useState(null); const [saveSt, setSaveSt] = useState(""); const [notice, setNotice] = useState(null); const [taskPj, setTaskPj] = useState(null);
  const [ui, setUiState] = useState(loadUi); const [scrollX, setScrollX] = useState(0);
  const [refId, setRefId] = useState("pub"); const [hist, setHist] = useState(null); const baseRef = useRef(null);
  const lastSaved = useRef(null); const gref = useRef(null); const lref = useRef(null); const expInit = useRef(false);
  const setUi = useCallback(patch => setUiState(u => { const n = { ...u, ...patch }; saveUi(n); return n; }), []);
  const holidays = !(plan && plan.cal && plan.cal.holidays === false);
  const cal = useMemo(() => makeCalendar({ closurePeriods, holidays, pjOff: productionExclusions }), [closurePeriods, holidays, productionExclusions]); // v218 : jours sans production réglés dans le Calendrier

  // reprise du plan enregistré (première lecture, ou modification faite ailleurs tant qu'on n'a rien changé ici)
  useEffect(() => {
    if (!planDoc || !planDoc.plan) return;
    const js = JSON.stringify(planDoc.plan);
    if (plan === null) { setPlanState(planDoc.plan); lastSaved.current = js; if (!baseRef.current) baseRef.current = planDoc.plan; return; }
    if (js !== lastSaved.current && JSON.stringify(plan) === lastSaved.current) { setPlanState(planDoc.plan); lastSaved.current = js; }
  }, [planDoc]); // eslint-disable-line
  // référence « Ouverture de la page » : le plan tel qu'il était au chargement (ou à sa création)
  useEffect(() => { if (plan && plan.v === 2 && !baseRef.current) baseRef.current = plan; }, [plan]);
  // enregistrement automatique (brouillon partagé)
  useEffect(() => {
    if (!plan) return; const js = JSON.stringify(plan); if (js === lastSaved.current) return;
    setSaveSt("Enregistrement…");
    const t = setTimeout(async () => { try { await onSavePlan(plan); lastSaved.current = js; setSaveSt("Brouillon enregistré ✓"); } catch (e) { console.error(e); setSaveSt("Échec de l'enregistrement"); } }, 900);
    return () => clearTimeout(t);
  }, [plan]); // eslint-disable-line
  // v312 : départs changés dans la Liste / la fiche d'un PJ par un admin → reportés dans le plan (date du départ, liens gardés), une fois
  const pendDone = useRef("");
  useEffect(() => {
    const keys = Object.keys(pendingDeparts || {}); if (!plan || plan.v !== 2 || !keys.length) return;
    const sig = JSON.stringify(pendingDeparts); if (pendDone.current === sig) return; pendDone.current = sig;
    const r = applyPendingDeparts(plan, cal, pendingDeparts);
    if (r.plan !== plan) { setUndo(u => [...u.slice(-29), plan]); setRedo([]); setPlanState(r.plan); }
    const fr = iso => iso ? iso.split("-").reverse().join("/") : "—";
    setNotice({ tone: r.blocked.length ? "warn" : "ok", text: (r.applied.length ? "Départ changé hors planificateur repris : " + r.applied.map(pj => pj + " (" + fr(pendingDeparts[pj].date) + ")").join(", ") + ". " : "") + (r.blocked.length ? "Pas pu placer : " + r.blocked.map(b => b.pj + " le " + fr(b.date) + " (calculé : " + fr(b.got) + ")").join(", ") + "." : "") });
    if (onPendingApplied) onPendingApplied(keys).catch(e => console.warn(e));
  }, [plan, pendingDeparts]); // eslint-disable-line react-hooks/exhaustive-deps
  // premier affichage : tout déplié si le plan est petit
  useEffect(() => { if (plan && plan.v === 2 && !expInit.current) { expInit.current = true; if (plan.pjs.length <= 12) setExp(new Set(plan.pjs.map(p => p.pj))); } }, [plan]);

  const live = preview || (proposal && proposal.plan) || plan;
  const sched = useMemo(() => live && live.v === 2 ? schedule(live, cal) : { nodes: {}, cycle: null }, [live, cal]);
  const load = useMemo(() => live && live.v === 2 ? loadModel(live, sched, cal) : null, [live, sched, cal]);
  const tl = useMemo(() => makeTimeline(sched, ui.px || ui.zoom), [sched, ui.zoom, ui.px]);
  // v224 (demandé : « pouvoir zoomer ») : − + et Ctrl + molette ; la date sous la souris reste en place
  const zoomAnchor = useRef(null); const zoomFn = useRef(null);
  zoomFn.current = (factor, clientX) => { const el = gref.current; const nv = Math.max(PX_MIN, Math.min(PX_MAX, Math.round(tl.px * factor * 10) / 10)); if (nv === tl.px) return;
    if (el) { const r = el.getBoundingClientRect(); const lw = ui.view === "gantt" || ui.view === "both" ? (el.firstChild && el.firstChild.firstChild ? el.firstChild.firstChild.getBoundingClientRect().width : 0) : 0; const mx = clientX != null ? clientX - r.left : el.clientWidth / 2; zoomAnchor.current = { day: (el.scrollLeft + mx - lw) / tl.px, mx, lw }; }
    setUi({ px: nv }); };
  useLayoutEffect(() => { const a = zoomAnchor.current, el = gref.current; zoomAnchor.current = null; if (a && el) el.scrollLeft = Math.max(0, a.day * tl.px - a.mx + a.lw); }, [tl.px]);
  useEffect(() => { const el = gref.current; if (!el) return undefined; const w = e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoomFn.current(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX); }; el.addEventListener("wheel", w, { passive: false }); return () => el.removeEventListener("wheel", w); });
  const pubRows = useMemo(() => plan && plan.v === 2 ? planToRows(plan, schedule(plan, cal), rows || [], guessGamme, cal) : [], [plan, cal, rows]);
  const changes = useMemo(() => plan && plan.v === 2 ? diffRows(rows || [], pubRows) : [], [rows, pubRows, plan]);

  // onglet « Modifications » : écart entre le plan en cours et la référence choisie (planning actuel, initial, ouverture de la page, publication)
  useEffect(() => { if (ui.view === "changes") onLoadHistory().then(h => setHist(h || [])).catch(() => setHist([])); }, [ui.view]); // eslint-disable-line
  const nTouched = useMemo(() => new Set(changes.map(c => c.pj)).size, [changes]);
  const chg = useMemo(() => {
    if (ui.view !== "changes" || !plan || plan.v !== 2) return null;
    const refs = [{ id: "pub", label: "Planning actuel (publié)" }];
    if (baseRef.current && baseRef.current.v === 2) refs.push({ id: "open", label: "Ouverture de la page (brouillon au chargement)" });
    (hist || []).forEach(e => { if (e.plan && e.plan.v === 2) refs.push({ id: "h:" + e.at, label: "Publication du " + new Date(e.at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + (e.by ? " · " + e.by : "") }); });
    const cur = refs.find(r => r.id === refId) || refs[0];
    let refPlan = null, refRows = rows || [];
    if (cur.id === "open") refPlan = baseRef.current;
    else if (cur.id.startsWith("h:")) { const e = (hist || []).find(x => x.at === cur.id.slice(2)); refPlan = e && e.plan; }
    if (refPlan) { const c2 = makeCalendar({ closurePeriods, holidays: !(refPlan.cal && refPlan.cal.holidays === false) }); refRows = planToRows(refPlan, schedule(refPlan, c2), rows || [], guessGamme, c2); }
    return { refs, id: cur.id, label: cur.label, summary: summarizeChanges(refRows, pubRows), planDiff: refPlan ? diffPlans(refPlan, plan) : null };
  }, [ui.view, plan, pubRows, refId, hist, rows, closurePeriods]);
  const openPj = pj => { setSel({ pj, step: null }); setExp(s => { const n = new Set(s); n.add(pj); return n; }); setUi({ view: "both" }); };

  // chevauchements Production / Tests (utile quand les règles « un à la fois » sont désactivées)
  const overlaps = useMemo(() => {
    if (!plan || plan.v !== 2) return 0; const base = schedule(plan, cal); let n = 0;
    ["production", "tests"].forEach(step => { const a = Object.values(base.nodes).filter(x => x.step === step && x.s !== null).sort((x, y) => x.s - y.s); for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length && a[j].s <= a[i].f; j++) n++; });
    return n;
  }, [plan, cal]);

  const apply = useCallback(np => {
    if (!np || np === plan) return;
    if (proposal) { setNotice({ tone: "warn", text: "Une proposition est en cours : appliquez-la ou annulez-la d'abord." }); return; }
    setUndo(u => [...u.slice(-49), plan]); setRedo([]); setPlanState(np); setPreview(null);
  }, [plan, proposal]);
  const doUndo = () => { if (!undo.length) return; setRedo(r => [...r, plan]); setPlanState(undo[undo.length - 1]); setUndo(u => u.slice(0, -1)); };
  const doRedo = () => { if (!redo.length) return; setUndo(u => [...u, plan]); setPlanState(redo[redo.length - 1]); setRedo(r => r.slice(0, -1)); };
  const undoRef = useRef(null); undoRef.current = { doUndo, doRedo, ro: ui.lock };
  useEffect(() => {
    const k = e => {
      if (!(e.ctrlKey || e.metaKey) || undoRef.current.ro) return; const t = e.target && e.target.tagName; if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
      const key = e.key.toLowerCase(); if (key === "z" && !e.shiftKey) { e.preventDefault(); undoRef.current.doUndo(); } else if (key === "y" || (key === "z" && e.shiftKey)) { e.preventDefault(); undoRef.current.doRedo(); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  const onCommit = useCallback((np, info) => {
    const before = schedule(plan, cal), after = schedule(np, cal);
    if (after.cycle) { setPreview(null); setNotice({ tone: "bad", text: "Impossible : cette modification créerait une boucle de liens." }); return; }
    apply(np);
    const parts = [];
    if (info && info.key) { const n = after.nodes[info.key]; if (n && n.s !== null && n.start !== info.want) parts.push("début limité au " + fmtIso(n.start) + " par un lien ou l'ordre de passage"); }
    const moved = new Set(); Object.keys(after.nodes).forEach(k => { const a = after.nodes[k], b = before.nodes[k]; if (b && a.s !== null && b.s !== null && a.start !== b.start && (!info || a.pj !== info.pj)) moved.add(a.pj); });
    if (moved.size) { const l = [...moved]; parts.push(moved.size + " autre" + (moved.size > 1 ? "s" : "") + " PJ décalé" + (moved.size > 1 ? "s" : "") + " par les liens : " + l.slice(0, 5).join(", ") + (l.length > 5 ? "…" : "")); }
    setNotice(parts.length ? { tone: "warn", text: parts.join(" · ").replace(/^./, c => c.toUpperCase()) } : null);
  }, [apply, cal, plan]);
  const onError = useCallback(text => setNotice({ tone: "bad", text }), []);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 9000); return () => clearTimeout(t); }, [notice]);

  // propositions : aperçu sur le Gantt (contour pointillé) avant d'appliquer
  const startProposal = (kind, patch) => {
    if (!plan) return; let np, title;
    if (kind === "level" && !patch) { setDlg("level"); return; } // v259 : période et capacité choisies d'abord
    if (kind === "level") { const r = levelPlan(plan, cal, patch); np = r.plan; title = "Nivellement de la charge atelier du " + fmtIso(patch.from) + " au " + fmtIso(patch.to) + " (" + Math.round(patch.cap > 0 ? patch.cap : capWeek(plan)) + " h / semaine" + (patch.cap > 0 ? "" : ", semaines spéciales comprises") + ")"; }
    else if (kind === "early") { np = releasePins(plan); title = "Dates au plus tôt : dates imposées libérées (sauf arrivées et départs)"; }
    else if (kind === "fit") { np = fitDurations(plan); title = "Durées allongées pour tenir la capacité"; }
    else if (kind === "bench") { np = benchOrderByStart({ ...splitBenches(plan, cal), rules: { ...rulesOf(plan), banc: true } }, cal); title = "Répartition des tests sur les 2 bancs (une machine à la fois par banc)"; } // v230 : la règle suit, sinon le ⚠ restait
    else if (kind === "rules") { np = setRules(plan, patch); title = Object.keys(patch).map(k => (k === "prod" ? "Une production à la fois" : "Un test à la fois par banc") + (patch[k] ? " : activé" : " : désactivé")).join(", "); }
    else if (kind === "sort") { apply(sortPjsByStart(plan, cal)); return; }
    else { np = clearLevel(plan); title = "Retrait du nivellement"; }
    const cmp = compareScheds(schedule(plan, cal), schedule(np, cal), cal);
    const lm = loadModel(np, schedule(np, cal), cal);
    setProposal({ plan: np, title, cmp, over: lm.overWeeks, peak: lm.peak, same: JSON.stringify(np) === JSON.stringify(plan) });
  };
  const acceptProposal = () => { const np = proposal.plan; setProposal(null); setUndo(u => [...u.slice(-49), plan]); setRedo([]); setPlanState(np); setPreview(null); };
  const reorder = useCallback((pj, over) => { if (!plan) return; const np = moveTo(plan, pj, over); if (np !== plan) onCommit(np, { pj, key: null, want: null }); }, [plan, onCommit]);

  // v221 (demandé : « pouvoir cacher les PJ en slot libre dans le planificateur ») : masqués par défaut (case « Slots libres »)
  // v224 (demandé : « je ne dois pas avoir les slots libres ou PJXXX ») : jamais affichés (ils restent comptés dans la charge)
  const slotSet = useMemo(() => new Set([...(rows || []).filter(r => r && r.etat === "SLOT_LIBRE").map(r => r.pj), ...((live && live.pjs) || []).map(p => p.pj).filter(pj => /X{2,}/i.test(pj) || isEstimatePj(pj))]), [rows, live]);
  const hideSlots = true;
  // v228 (demandé : « archiver des projets ; quand le PJ est expédié je ne dois pas le voir ») : archivés et expédiés masqués (case « Archivés »)
  const shippedSet = useMemo(() => new Set((rows || []).filter(r => r && r.etat === "SHIPPED").map(r => r.pj)), [rows]);
  const isArch = p => !!p.archived || shippedSet.has(p.pj);
  const nArch = live && live.v === 2 ? live.pjs.filter(isArch).length : 0;
  const benchSkip = p => isArch(p) || slotSet.has(p.pj); const todayIso = (d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"))(new Date());
  const startedSet = useMemo(() => { const s = new Set(); const ST = new Set(["MONTAGE", "ELEC", "TESTS", "PACKAGING", "SHIPPED"]);
    (rows || []).forEach(r => { if (r && ST.has(r.etat)) s.add(r.pj); });
    Object.values(sched.nodes).forEach(n => { if (n.step === "production" && n.start && n.start <= todayIso) s.add(n.pj); });
    return s; }, [rows, sched, todayIso]);
  const conflicts = useMemo(() => live && live.v === 2 ? benchConflicts(live, sched, { skip: benchSkip, since: todayIso }) : [], [live, sched, slotSet, shippedSet]); // eslint-disable-line react-hooks/exhaustive-deps
  const pjsShown = useMemo(() => { if (!live || live.v !== 2) return []; const s = q.trim().toLowerCase(); return live.pjs.filter(p => (ui.showArch || !isArch(p)) && !(hideSlots && slotSet.has(p.pj)) && (!s || p.pj.toLowerCase().includes(s) || (p.nomProjet || "").toLowerCase().includes(s))); }, [live, q, hideSlots, slotSet, shippedSet, ui.showArch]); // eslint-disable-line react-hooks/exhaustive-deps
  const lanesPlan = useMemo(() => live && live.v === 2 ? { ...live, pjs: live.pjs.filter(p => !slotSet.has(p.pj) && (ui.showArch || !isArch(p))) } : live, [live, slotSet, shippedSet, ui.showArch]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleExp = (pj, force) => setExp(s => { const n = new Set(s); (force === true || !n.has(pj)) ? n.add(pj) : n.delete(pj); return n; });
  // v230 : en changeant de vue, la charge reprend le défilement de la vue affichée (couloirs ou Gantt)
  useEffect(() => { const el = (ui.view === "lanes" ? lref : gref).current; setScrollX(el ? el.scrollLeft : 0); }, [ui.view]); // eslint-disable-line react-hooks/exhaustive-deps
  const goToday = () => { const el = (ui.view === "lanes" ? lref : gref).current; if (el) el.scrollLeft = Math.max(0, (tl.today - tl.lo) * tl.px - 160); };
  useEffect(() => { if (plan && plan.v === 2) { const t = setTimeout(goToday, 60); return () => clearTimeout(t); } }, [plan === null, ui.zoom, ui.view]); // eslint-disable-line

  if (!planLoaded) return <div className="pg-root"><style>{pgCss()}</style><div style={{ color: T.ink500, padding: 20 }}>Chargement du plan…</div></div>;
  const empty = !plan || plan.v !== 2;
  if (empty) {
    return (<div className="pg-root"><style>{pgCss()}</style>
      <div style={{ ...CARD, padding: "24px 28px", maxWidth: 760 }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 24, color: T.ink900 }}>Planification</div>
        {plan && plan.v !== 2 && <div style={{ background: T.amber100, color: T.amber600, borderRadius: 12, padding: "8px 14px", margin: "12px 0", fontWeight: 600, fontSize: 13 }}>Le plan enregistré date d'une ancienne version. Recréez-le : le planning actuel n'est pas modifié tant que vous ne publiez pas.</div>}
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: T.ink700, margin: "14px 0 20px" }}>Un Gantt modifiable en direct, à la place de MS Project : chaque PJ suit <b>Arrivée, Production, Tests, Fin de production, Départ</b>, avec ses dates, durées, travail (heures), liens entre tâches et priorité. La charge atelier est comparée à la capacité par semaine ou par mois. À la création, <b>toutes les dates sont reprises à l'identique</b> du planning actuel.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={{ ...BTN_P, padding: "10px 18px", fontSize: 14 }} onClick={() => { setPlanState(fillMissingHours(initPlanFromRows(rows || [], cal), rows || [], null).plan); setUndo([]); setRedo([]); }}>Créer le plan depuis le planning actuel ({(rows || []).length} PJ)</button>
          <button style={{ ...BTN, padding: "10px 18px", fontSize: 14 }} onClick={() => setDlg("blank")}>Plan vierge (quelques PJ, sans dates)</button>
        </div>
      </div>
      {dlg === "blank" && <BlankDialog rows={rows} hasPlan={false} onClose={() => setDlg(null)} onApply={np => { setPlanState(np); setUndo([]); setRedo([]); }} />}
    </div>);
  }
  const nEst = plan.pjs.filter(p => p.hEst).length, nNoH = plan.pjs.filter(p => !(Number(p.hAt) > 0) && (p.steps.production || p.steps.finProd)).length;
  const nLinks = (plan.links || []).length; const rules = rulesOf(plan); const cap = plan.cap || DEFAULT_CAP;
  const rowsNotInPlan = (rows || []).filter(r => !plan.pjs.some(p => p.pj === r.pj));
  const selPj = sel && plan.pjs.some(p => p.pj === sel.pj) ? sel : null;
  const laneBH = typeof ui.laneH === "number" ? ui.laneH : ({ s: 11, m: 17, l: 22 }[ui.laneH] || 17);
  // v211 : en Liste + Gantt, la liste prend au plus ~42 % de la largeur tant qu'on ne l'a pas réglée (sinon le Gantt n'apparaît pas sur un petit écran)
  const listW = ui.listW || (ui.view === "both" && typeof window !== "undefined" ? Math.max(380, Math.min(736, Math.round(window.innerWidth * 0.42))) : null);
  const noT = ui.view === "list" || ui.view === "changes"; const cmp = proposal && proposal.cmp; const ro = ui.lock || !!proposal;
  const loadEl = load && !ui.loadHide ? <PlannerLoad folded={ui.loadFold !== false} setFolded={v => setUi({ loadFold: v })} today={tl.today} plan={live} load={load} cal={cal} tl={tl} scrollX={scrollX} leftW={ui.view === "lanes" ? LANE_LABEL_W : leftWidthWith(ui.view, listW)} onCapWeek={(w, h) => apply(setCapWeek(plan, w, h))} small={!!ui.loadSmall} setSmall={v => setUi({ loadSmall: v })} standalone={ui.view === "list"} mode={ui.loadMode} setMode={m => setUi({ loadMode: m })} cap={cap}
        onCap={patch => apply(setCap(plan, patch))} readOnly={ro} onPropose={startProposal} hasLevelNow={hasLevel(plan)} nTooDense={load.tooDense.length} /> : null;
  return (<div className="pg-root">
    <style>{pgCss()}</style>
    <datalist id="plan-add">{rowsNotInPlan.map(r => <option key={r.pj} value={r.pj} />)}</datalist>
    {/* v283 (audit apple-design, lot 2, maquette validée) : une ligne d'état (titre, statut, légende, Publier) et une seule ligne d'outils ;
        les réglages d'affichage et les outils rares passent dans deux menus ancrés « Affichage » et « Outils ». */}
    <div className="pg-bar1">
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 14, color: T.ink900, marginRight: 4 }}>Planification</div>
      <span style={{ fontSize: 11, color: T.ink500 }}>{plan.pjs.length} PJ · {nLinks} lien{nLinks > 1 ? "s" : ""}</span>
      {nEst + nNoH > 0 && <span title="La charge vient des heures atelier du planning. Sans heures, un PJ reprend le modèle de sa gamme ou la moyenne des PJ de la même gamme." style={{ fontSize: 12, color: T.amber600 }}>{nEst ? nEst + " PJ aux heures estimées" : ""}{nEst && nNoH ? " · " : ""}{nNoH ? nNoH + " PJ sans heures (hors charge)" : ""}</span>}
      <span role="button" tabIndex={0} onClick={() => { setRefId("pub"); setUi({ view: "changes" }); }} onKeyDown={e => { if (e.key === "Enter") { setRefId("pub"); setUi({ view: "changes" }); } }} title="Voir la synthèse des modifications" style={{ cursor: "pointer", borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 600, background: changes.length ? T.amber100 : T.emerald100, color: changes.length ? T.amber600 : T.emerald600 }}>{changes.length ? changes.length + " modification" + (changes.length > 1 ? "s" : "") + " non publiée" + (changes.length > 1 ? "s" : "") : "À jour avec le planning actuel"}</span>
      <span style={{ fontSize: 12, color: T.ink500 }} aria-live="polite">{saveSt}</span>
      <span style={{ flex: 1 }} />
      <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: T.ink500, alignItems: "center" }}>
        {[["arrivee", "Arrivée", 1], ["production", "Production"], ["tests", "Tests"], ["finProd", "Packing"], ["depart", "Départ", 1]].map(([k, l, ms]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: ms ? 9 : 16, height: 9, background: STEP_COLOR[k], transform: ms ? "rotate(45deg)" : "none", borderRadius: 4, display: "inline-block" }} />{l}</span>)}
        <span><span style={{ color: T.ink500 }}>→</span> lien</span>
      </span>
      {!ui.lock && <button className="pg-tb" style={{...btn("pri","sm")}} onClick={() => setDlg("publish")}>Publier</button>}
      {ui.lock && <button className="pg-tb" aria-pressed onClick={() => setUi({ lock: false })} title="Quitter la lecture seule">Lecture seule · quitter</button>}
    </div>
    <div className="pg-bar1" role="toolbar" aria-label="Outils du planificateur" style={{ marginBottom: 6, flexWrap: "wrap", rowGap: 4 }}>
      {!ui.lock && <>
        <button className="pg-tb" disabled={!undo.length} onClick={doUndo} aria-label="Annuler la dernière modification" title="Annuler (Ctrl + Z)">↶</button>
        <button className="pg-tb" disabled={!redo.length} onClick={doRedo} aria-label="Rétablir" title="Rétablir">↷</button>
        <span aria-hidden="true" style={{ width: 1, height: 18, background: T.line, margin: "0 2px", flexShrink: 0 }} />
      </>}
      <div role="group" aria-label="Vue" style={{ display: "inline-flex" }}>
        {[["list", "Liste"], ["both", "Liste + Gantt"], ["gantt", "Gantt"], ["lanes", "Couloirs"], ["changes", "Modifications"]].map(([k, l], i, arr) => <button key={k} className="pg-tb" aria-pressed={ui.view === k} onClick={() => setUi({ view: k })} style={{ borderRadius: i === 0 ? "6px 0 0 6px" : i === arr.length - 1 ? "0 6px 6px 0" : 0, marginLeft: i ? -1 : 0 }}>{l}{k === "changes" && nTouched > 0 && <span style={{ marginLeft: 6, background: ui.view === k ? "rgba(255,255,255,.25)" : T.amber100, color: ui.view === k ? "#fff" : T.amber600, borderRadius: 999, padding: "0 7px", fontSize: 11.5 }}>{nTouched}</span>}</button>)}
      </div>
      <button className="pg-tb" onClick={() => setDlg("bench")} title="Attribuer les 2 bancs d'essai (une seule machine par banc à la fois)">Bancs d'essai{conflicts.length ? <span style={{ color: T.red500 }}> ⚠ {conflicts.length}</span> : null}</button>
      <span aria-hidden="true" style={{ width: 1, height: 18, background: T.line, margin: "0 2px", flexShrink: 0 }} />
      <button className="pg-tb" disabled={noT} onClick={goToday}>Aujourd'hui</button>
      <div role="group" aria-label="Zoom" style={{ display: "inline-flex", gap: 0 }}>
        <button className="pg-tb" disabled={noT || tl.px <= PX_MIN} onClick={() => zoomFn.current(1 / 1.4)} aria-label="Dézoomer" title="Dézoomer (Ctrl + molette)" style={{ borderRadius: "6px 0 0 6px" }}>−</button>
        {[["day", "Jour"], ["week", "Sem."], ["month", "Mois"]].map(([k, l]) => <button key={k} className="pg-tb" disabled={noT} aria-pressed={(!ui.px && ui.zoom === k) || ui.px === ZOOM_PX[k]} onClick={() => setUi({ zoom: k, px: null })} style={{ borderRadius: 0, marginLeft: -1 }}>{l}</button>)}
        <button className="pg-tb" disabled={noT || tl.px >= PX_MAX} onClick={() => zoomFn.current(1.4)} aria-label="Zoomer" title="Zoomer (Ctrl + molette)" style={{ borderRadius: "0 6px 6px 0", marginLeft: -1 }}>+</button>
      </div>
      <span aria-hidden="true" style={{ width: 1, height: 18, background: T.line, margin: "0 2px", flexShrink: 0 }} />
      <Pop width={270} align="left" trigger={(o, t) => <button className="pg-tb" aria-haspopup="menu" aria-expanded={o} onClick={t}>Affichage ▾</button>}>
        {close => (<div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.ink500, padding: "2px 8px" }}>Afficher</div>
          <label title="Masquer la charge atelier pour agrandir le Gantt" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 8px", cursor: "pointer", fontWeight: 600, color: T.ink900 }}><input type="checkbox" checked={!ui.loadHide} onChange={() => setUi({ loadHide: !ui.loadHide })} />Charge atelier en bas</label>
          <label title="Toutes les flèches de liens (sinon seulement celles du PJ sélectionné)" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 8px", cursor: "pointer", fontWeight: 600, color: T.ink900 }}><input type="checkbox" checked={!!ui.links} onChange={() => setUi({ links: !ui.links })} />Tous les liens</label>
          {ui.view !== "lanes" && ui.view !== "changes" && <>
            <label title="Priorité devant chaque PJ" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 8px", cursor: "pointer", fontWeight: 600, color: T.ink900 }}><input type="checkbox" checked={!ui.hidePrio} onChange={() => setUi({ hidePrio: !ui.hidePrio })} />Priorité (P n)</label>
            <label title="N° de série à côté de chaque PJ" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 8px", cursor: "pointer", fontWeight: 600, color: T.ink900 }}><input type="checkbox" checked={!ui.hideSn} onChange={() => setUi({ hideSn: !ui.hideSn })} />N° de série</label>
          </>}
          {nArch > 0 && <label title="PJ archivés ou expédiés : ils gardent leurs dernières dates mais sont masqués" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 8px", cursor: "pointer", fontWeight: 600, color: T.ink900 }}><input type="checkbox" checked={!!ui.showArch} onChange={() => setUi({ showArch: !ui.showArch })} />Archivés ({nArch})</label>}
          {ui.view === "lanes" && <label title="Tableau des tâches sous les couloirs" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 8px", cursor: "pointer", fontWeight: 600, color: T.ink900 }}><input type="checkbox" checked={!!ui.lanesTable} onChange={() => setUi({ lanesTable: !ui.lanesTable })} />Tableau des tâches</label>}
          <div style={{ borderTop: "1px solid " + T.line, margin: "6px 0" }} />
          {ui.view !== "lanes" && ui.view !== "changes" && <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 8px", fontWeight: 600, color: T.ink900 }}>Hauteur des lignes
            <input type="range" min={24} max={44} step={2} value={ui.rowH || 32} onChange={e => setUi({ rowH: Number(e.target.value) })} aria-label="Hauteur des lignes du Gantt" style={{ flex: 1 }} /></label>}
          {ui.view === "lanes" && <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 8px", fontWeight: 600, color: T.ink900 }}>Hauteur des couloirs
            <input type="range" min={8} max={30} step={1} value={laneBH} onChange={e => setUi({ laneH: Number(e.target.value) })} aria-label="Hauteur des couloirs" style={{ flex: 1 }} /></label>}
          <MenuItem onClick={() => { close(); setExp(s => s.size ? new Set() : new Set(plan.pjs.map(p => p.pj))); }}>{exp.size ? "Tout replier" : "Tout déplier"}</MenuItem>
          <MenuItem onClick={() => { close(); setUi({ lock: !ui.lock }); setProposal(null); }}>{ui.lock ? "Quitter la lecture seule" : "Lecture seule (réunion)"}<div style={{ fontSize: 11.5, color: T.ink500, fontWeight: 400 }}>Verrouille l'édition</div></MenuItem>
        </div>)}
      </Pop>
      {!ui.lock && <Pop width={300} align="left" trigger={(o, t) => <button className="pg-tb" aria-haspopup="menu" aria-expanded={o} onClick={t}>Outils ▾</button>}>
        {close => (<>
          <MenuItem onClick={async () => { close(); if (await askConfirm({ title: "Reprendre toutes les dates du planning actuel ?", message: (rows || []).length + " PJ. Le plan en cours est remplacé ; la capacité et les modèles par gamme sont gardés. Annuler (Ctrl+Z) reste possible.", confirmLabel: "Reprendre les dates" })) { const np = refreshPlanFromRows(plan, rows || [], cal); setSel(null); apply(np); setNotice({ tone: "warn", text: "Plan recréé depuis le planning actuel : " + np.pjs.length + " PJ, dates reprises telles quelles." }); } }}>Reprendre les dates du planning<div style={{ fontSize: 11.5, color: T.ink500, fontWeight: 400 }}>Recrée le plan avec les dates actuelles (capacité et modèles gardés)</div></MenuItem>
          <MenuItem onClick={() => { close(); setDlg("templates"); }}>Modèles par gamme…<div style={{ fontSize: 11.5, color: T.ink500, fontWeight: 400 }}>Durées et heures habituelles par gamme</div></MenuItem>
          <MenuItem onClick={() => { close(); setDlg("history"); }}>Historique des publications</MenuItem>
          <div style={{ borderTop: "1px solid " + T.line, margin: "6px 0" }} />
          <MenuItem onClick={() => { close(); setDlg("blank"); }}>Plan vierge…<div style={{ fontSize: 11.5, color: T.ink500, fontWeight: 400 }}>Repartir de zéro avec quelques PJ, sans dates</div></MenuItem>
        </>)}
      </Pop>}
      {!ui.lock && <Pop width={330} align="left" trigger={(o, t) => <button className="pg-tb" aria-haspopup="menu" aria-expanded={o} onClick={t}>Règles ▾{overlaps && !rules.prod && !rules.banc ? <span style={{ color: T.amber600 }}> ⚠ {overlaps}</span> : null}</button>}>
          {close => (<div style={{ padding: 4, fontSize: 13, color: T.ink700, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={rules.prod} onChange={e => { close(); startProposal("rules", { prod: e.target.checked }); }} /><span><b>Une production à la fois</b><br /><span style={{ fontSize: 12, color: T.ink500 }}>Les productions passent l'une après l'autre (ordre = priorité). Aperçu avant application.</span></span></label>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={rules.banc} onChange={e => { close(); startProposal("rules", { banc: e.target.checked }); }} /><span><b>Un test à la fois par banc</b><br /><span style={{ fontSize: 12, color: T.ink500 }}>2 bancs : chaque banc enchaîne ses PJ. Le banc se choisit sur la ligne Tests (« Banc 1 / 2 »).</span></span></label>
            <button type="button" className="pg-tb" onClick={() => { close(); startProposal("bench"); }} title="Répartit les tests sur le banc libéré le plus tôt (aperçu avant d'appliquer)">Répartir les tests sur les 2 bancs</button>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={holidays} onChange={e => { close(); apply({ ...plan, cal: { ...(plan.cal || {}), holidays: e.target.checked } }); }} /><span><b>Jours fériés non ouvrés</b><br /><span style={{ fontSize: 12, color: T.ink500 }}>Modifie le calendrier : les dates se recalculent (annulable).</span></span></label>
            <div style={{ fontSize: 12, color: overlaps ? T.amber600 : T.emerald600, borderTop: "1px solid " + T.line, paddingTop: 6 }}>{overlaps ? overlaps + " chevauchement" + (overlaps > 1 ? "s" : "") + " de Production / Tests dans le plan actuel." : "Aucun chevauchement de Production / Tests."}</div>
          </div>)}
        </Pop>}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ…" aria-label="Rechercher un PJ" className="pg-in" style={{ ...INP, width: 140, flexShrink: 0 }} />
      <span style={{ flex: 1 }} />
      {!ui.lock && <Pop width={240} align="right" trigger={(o, t) => <button className="pg-tb" aria-haspopup="menu" aria-expanded={o} disabled={!!proposal} onClick={t}>＋ Ajouter ▾</button>}>
        {close => (<>
          <MenuItem onClick={() => { close(); setDlg("newpj"); }}>Nouveau PJ<div style={{ fontSize: 11.5, color: T.ink500, fontWeight: 400 }}>Avec ses tâches et ses ressources</div></MenuItem>
          <MenuItem disabled={!selPj} onClick={() => { close(); setTaskPj(null); setDlg("task"); }}>Tâche{selPj ? " à " + selPj.pj : ""}<div style={{ fontSize: 11.5, color: T.ink500, fontWeight: 400 }}>{selPj ? "Ajoutée au PJ sélectionné" : "Sélectionnez d'abord un PJ"}</div></MenuItem>
        </>)}
      </Pop>}
    </div>

    {load && load.tooDense.length > 0 && !proposal && !ui.lock && <Banner tone="warn">
      {load.tooDense.length} phase{load.tooDense.length > 1 ? "s" : ""} atelier ne tien{load.tooDense.length > 1 ? "nent" : "t"} pas dans {load.tooDense.length > 1 ? "leur" : "sa"} durée à {Math.round(load.capWeek)} h / semaine : {load.tooDense.slice(0, 4).map(x => x.pj + " " + STEP_LABELS[x.step] + " (" + x.hours + " h en " + x.dur + " j, minimum " + x.min + " j)").join(" ; ")}{load.tooDense.length > 4 ? "…" : ""}
    </Banner>}
    {proposal && <div role="status" style={{ ...CARD, borderColor: T.teal500, borderWidth: 2, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      <div style={{ flex: 1, minWidth: 260, fontSize: 13.5, color: T.ink700 }}><b style={{ color: T.ink900 }}>Aperçu : {proposal.title}</b><br />
        {proposal.same ? "Rien à changer : le plan est déjà dans cet état." : <>{cmp.steps} étape{cmp.steps > 1 ? "s" : ""} change{cmp.steps > 1 ? "nt" : ""} de date ({cmp.pjs} PJ, contour en pointillés){cmp.lateDeparts ? " · " + cmp.lateDeparts + " départ" + (cmp.lateDeparts > 1 ? "s" : "") + " recule" + (cmp.lateDeparts > 1 ? "nt" : "") + " (jusqu'à " + cmp.maxDelay + " j ouvrés)" : " · aucun départ ne recule"} · charge : {proposal.over ? proposal.over + " semaine" + (proposal.over > 1 ? "s" : "") + " en surcharge" : "aucune surcharge"}</>}
      </div>
      <button className="pg-tb" onClick={() => setProposal(null)}>Annuler</button>
      <button style={{ ...BTN_P, opacity: proposal.same ? 0.5 : 1 }} disabled={proposal.same} onClick={acceptProposal}>Appliquer au plan</button>
    </div>}
    {sched.cycle && <Banner tone="bad">Boucle de liens détectée ({sched.cycle.slice(0, 4).map(k => { const x = splitKey(k); return x.pj + " · " + STEP_LABELS[x.step]; }).join(" → ")}…) : certaines dates ne peuvent pas être calculées. Corrigez la colonne Prédécesseurs.</Banner>}
    {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
    {/* v292 : le brouillon n'est vu que par vous ; le Gantt, le Calendrier et la Liste affichent le planning publié */}
    {changes.length > 0 && !proposal && !ui.lock && <Banner tone="warn">{changes.length} modification{changes.length > 1 ? "s" : ""} du brouillon (dont celles venues du calendrier de production) {changes.length > 1 ? "ne sont" : "n'est"} pas encore dans le Gantt, le Calendrier et la Liste : elles y apparaîtront après « Publier ».</Banner>}

    {/* v208 (demandé : « la charge atelier toujours visible en bas de l'écran ») : la charge colle au bas de l'écran ; en Couloirs elle suit les couloirs */}
    {ui.view === "lanes" && <div style={{ ...CARD, overflow: "clip", marginBottom: 12 }}>
      <PlannerLanes laneH={laneBH} plan={lanesPlan} basePlan={plan} sched={sched} cal={cal} closurePeriods={closurePeriods} load={load} tl={tl} sel={selPj} setSel={setSel} readOnly={ro} onPreview={setPreview} onCommit={onCommit} scrollRef={lref} onScrollX={setScrollX} />
      {loadEl}
    </div>}
    {ui.view === "changes" && chg && <div style={{ ...CARD, overflow: "hidden" }}>
      <PlannerChanges summary={chg.summary} planDiff={chg.planDiff || []} hasDetail={!!chg.planDiff} refs={chg.refs} refId={chg.id} setRefId={setRefId} refLabel={chg.label} loadingRefs={hist === null} q={q} onOpenPj={openPj} />
    </div>}
    {ui.view !== "changes" && (ui.view !== "lanes" || ui.lanesTable) && <div style={{ ...CARD, overflow: "clip" }}>
      <PlannerGantt listW={listW} onListW={w => setUi({ listW: w })} testers={testers} onInfo={t => setNotice({ tone: "ok", text: t })} rowH={ui.rowH || 32} onAddTask={pj => { setSel({ pj, step: null }); setTaskPj(pj); setDlg("task"); }} plan={live} basePlan={plan} sched={sched} cal={cal} closurePeriods={closurePeriods} tl={tl} pjs={pjsShown} sel={selPj} setSel={setSel} expanded={exp} toggleExp={toggleExp}
        showLinks={ui.links} view={ui.view} readOnly={ro} onPreview={setPreview} onCommit={onCommit} onError={onError} onReorder={reorder} scrollRef={gref} onScrollX={setScrollX} showPrio={!ui.hidePrio} showSn={!ui.hideSn} maxH={ui.loadHide ? 150 : ui.loadFold !== false ? 200 : ui.loadSmall ? 260 : 360} />
      {ui.view !== "lanes" && loadEl}
    </div>}
    {ui.view !== "changes" && <div style={{ fontSize: 11, color: T.ink500, marginTop: 4, lineHeight: 1.5 }}>
      Ctrl + molette pour zoomer · tirez d'un rond à une autre tâche pour la lier · cliquez une date, une durée, un travail ou un prédécesseur pour la modifier (Entrée valide, Échap annule) · glissez une barre pour la déplacer, sa poignée pour changer la durée · glissez ⋮⋮ pour changer la priorité d'un PJ · prédécesseurs : numéros de ligne, <b>2 ; 7SS+3j</b> (FS par défaut, SS, FF, SF, décalage en jours ouvrés).
    </div>}
    {dlg === "newpj" && <NewPjDialog plan={plan} rows={rows} cal={cal} testers={testers || []} onClose={() => setDlg(null)} onApply={(np, pj) => { apply(np); setSel({ pj, step: null }); toggleExp(pj, true); setNotice({ tone: "ok", text: pj + " ajouté au plan avec ses tâches." }); }} />}
    {dlg === "task" && (selPj || taskPj) && <TaskDialog plan={plan} pj={taskPj || selPj.pj} after={selPj && selPj.pj === (taskPj || selPj.pj) ? selPj.step : null} testers={testers || []} onClose={() => { setDlg(null); setTaskPj(null); }} onApply={(np, key) => { const pj = taskPj || selPj.pj; apply(np); toggleExp(pj, true); setSel({ pj, step: key ? key.split("|").pop() : null }); setTaskPj(null); }} />}
    {dlg === "level" && <LevelDialog plan={plan} onClose={() => setDlg(null)} onGo={o => { setDlg(null); startProposal("level", o); }} />}
    {dlg === "bench" && <BenchDialog plan={plan} sched={sched} cal={cal} hide={slotSet} skip={benchSkip} readOnly={ro} onClose={() => setDlg(null)} onApply={(np, msg) => { apply(np); if (msg) setNotice({ tone: "ok", text: msg }); }} />}
    {dlg === "templates" && <TemplatesDialog plan={plan} rows={rows} started={startedSet} onClose={() => setDlg(null)} onApply={np => apply(np)} />}
    {dlg === "blank" && <BlankDialog rows={rows} hasPlan onClose={() => setDlg(null)} onApply={np => { setSel(null); setExp(new Set(np.pjs.map(p => p.pj))); apply(np); }} />}
    {dlg === "publish" && <PublishDialog plan={plan} sched={sched} rows={rows} pubRows={pubRows} changes={changes} onClose={() => setDlg(null)} onPublish={(note, announce) => onPublish(plan, note, announce)} />}
    {dlg === "history" && <HistoryDialog onClose={() => setDlg(null)} onLoad={onLoadHistory} onRestorePlan={p => apply(p)} onRestorePub={onRestorePublication} />}
  </div>);
}
