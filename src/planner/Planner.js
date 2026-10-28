import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { T } from "../theme";
import { useSheetJS } from "../components/SharedUI";
import { guessGamme } from "../parsers";
import {
  STEPS, splitKey, makeCalendar, schedule, planToRows, diffRows, initPlanFromRows,
  addPj, initBlankPlan, setStep, rulesOf, summarizeChanges, diffPlans, DEFAULT_CAP, releasePins, setCap, setRules, loadModel, levelPlan, fitDurations, hasLevel, clearLevel, sortPjsByStart, capWeek, fillMissingHours, refreshPlanFromRows, setCapWeek,
} from "./engine";
import { parseMsPlan, compareWithMs, applyCalibration } from "./importPlan";
import { PlannerGantt, fmtIso, makeTimeline, leftWidthWith, STEP_COLOR } from "./PlannerGantt";
import { PlannerLoad } from "./PlannerLoad";
import { PlannerLanes } from "./PlannerLanes";
import { PlannerChanges } from "./PlannerChanges";
import { Pop } from "./PlannerMenu";

// ── Module « Planification » (super admin) : remplace MS Project pour construire le planning d'ordonnancement ──
// Un seul tableau Gantt modifiable en direct (dates, durées, travail, prédécesseurs, priorité) + la charge atelier sous le Gantt.
// Le plan est un brouillon enregistré automatiquement. « Publier » le copie dans le planning actuel lu par tous les écrans
// (avec aperçu des changements, historique et annulation). Le planning INITIAL (figé) n'est jamais touché ici.

// v208 : styles relus dans le thème à chaque usage (ils étaient figés au chargement : textes illisibles en sombre)
const live = f => new Proxy({}, { get: (o, k) => f()[k], has: (o, k) => k in f(), ownKeys: () => Reflect.ownKeys(f()), getOwnPropertyDescriptor: (o, k) => { const v = f(); return k in v ? { value: v[k], enumerable: true, configurable: true, writable: true } : undefined; } });
const INP = live(() => ({ padding: "5px 8px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: 12.5, fontFamily: T.font, boxSizing: "border-box" }));
const BTN = live(() => ({ padding: "6px 12px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink700, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap" }));
const BTN_P = live(() => ({ ...BTN, border: "none", background: T.ink900, color: T.card }));
const STEP_LABELS = Object.fromEntries(STEPS.map(s => [s[0], s[1]]));
const CARD = live(() => ({ background: T.card, border: "1px solid " + T.line, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }));

// styles : survol, focus et menus (la spécificité dépasse les règles globales sur les champs)
const pgCss = () => `
.pg-root{font-family:${T.font};color:${T.ink900}}
.pg-root .pg-row:hover{background:${T.teal100} !important}
.pg-root .pg-row .pg-more{opacity:0;transition:opacity .12s}
.pg-root .pg-row:hover .pg-more,.pg-root .pg-row:focus-within .pg-more{opacity:1}
.pg-root .pg-cell{width:100%;min-height:24px;line-height:24px;padding:0 4px;box-sizing:border-box;border-radius:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pg-root .pg-ed{cursor:text}
.pg-root .pg-ed:hover{box-shadow:inset 0 0 0 1px ${T.line};background:${T.card}}
.pg-root .pg-btn:focus-visible,.pg-root input:focus-visible{outline:2px solid ${T.teal500};outline-offset:1px}
.pg-root .pg-bar:hover{filter:brightness(1.12)}
.pg-root .pg-h{opacity:0;transition:opacity .1s;z-index:6}
.pg-root .pg-trow:hover .pg-h,.pg-root .pg-h.on{opacity:1}
.pg-menuitem:hover:not(:disabled){background:${T.teal100} !important}
.pg-menuitem:focus-visible{outline:2px solid ${T.teal500}}
.pg-root .pg-tb{border:1px solid ${T.line};background:${T.card};color:${T.ink700};border-radius:8px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit}
.pg-root .pg-tb:hover:not(:disabled):not([aria-pressed=true]){background:${T.teal100}}
.pg-root .pg-tb:disabled{opacity:.45;cursor:default}
.pg-root .pg-tb[aria-pressed=true]{background:${T.ink900};color:${T.card};border-color:${T.ink900}}
.pg-root .pg-split:hover,.pg-root .pg-split:focus-visible{background:linear-gradient(90deg,transparent 3px,${T.teal500} 3px,${T.teal500} 6px,transparent 6px);outline:none}
`;

function Modal({ title, onClose, children, width = 720 }) {
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,.45)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: T.font }}>
    <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, boxShadow: T.shadowLg, border: "1px solid " + T.line, width: "min(" + width + "px,100%)", maxHeight: "88vh", overflow: "auto", padding: "20px 22px" }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 19, color: T.ink900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  </div>);
}


function mergePlans(old, imp, mode) {
  if (mode === "replace" || !old) return { ...imp, cal: (old && old.cal) || imp.cal };
  const replaced = new Set(imp.pjs.map(p => p.pj));
  const kept = old.pjs.map(p => replaced.has(p.pj) ? imp.pjs.find(x => x.pj === p.pj) : p);
  const added = imp.pjs.filter(p => !old.pjs.some(o => o.pj === p.pj));
  const oldLinks = (old.links || []).filter(l => !replaced.has(splitKey(l.from).pj) && !replaced.has(splitKey(l.to).pj));
  return { ...old, pjs: [...kept, ...added], links: [...oldLinks, ...imp.links] };
}
function ImportDialog({ cal, rows, plan, onClose, onApply }) {
  useSheetJS();
  const [err, setErr] = useState(""); const [res, setRes] = useState(null); const [mode, setMode] = useState(plan && plan.pjs.length ? "merge" : "replace"); const [calib, setCalib] = useState(true);
  const onFile = async f => {
    setErr(""); setRes(null); if (!f) return;
    try {
      if (!window.XLSX) { setErr("Librairie Excel en cours de chargement, réessayez dans 2 s."); return; }
      const wb = window.XLSX.read(await f.arrayBuffer(), { type: "array" });
      const data = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });
      const parsed = parseMsPlan(data, cal, rows);
      if (!parsed || !parsed.plan.pjs.length) { setErr("Aucun PJ reconnu. Colonnes attendues : Nom, Début (+ ID, Durée, Fin, Prédécesseurs, Niveau hiérarchique)."); return; }
      setRes({ ...parsed, diffs: compareWithMs(parsed.plan, parsed.msDates, cal), name: f.name });
    } catch (e) { console.error(e); setErr("Lecture impossible : " + e.message); }
  };
  const fixable = res ? res.diffs.filter(d => d.fixable).length : 0, notFixable = res ? res.diffs.length - fixable : 0;
  const finalPlan = res ? mergePlans(plan, calib ? applyCalibration(res.plan, res.diffs) : res.plan, mode) : null;
  return (<Modal title="Importer un export MS Project (avec les liens)" onClose={onClose} width={760}>
    <div style={{ fontSize: 13.5, color: T.ink500, lineHeight: 1.55 }}>Export Excel avec les colonnes <b>ID, Nom, Durée, Début, Fin, Prédécesseurs, Niveau hiérarchique</b> (niveau 1 = PJ, niveau 2 = Arrivée / Production / Tests / Fin de production / Départ). Les liens sont repris tels quels.</div>
    <input type="file" accept=".xlsx,.xls" onChange={e => onFile(e.target.files[0])} style={{ margin: "12px 0", fontSize: 13 }} />
    {err && <div style={{ color: T.red500, fontWeight: 700, fontSize: 13 }}>{err}</div>}
    {res && <div style={{ fontSize: 13.5, color: T.ink700, lineHeight: 1.6 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 10px" }}>
        {[[res.report.pjCount, "PJ"], [res.report.stepCount, "étapes"], [res.report.linkCount, "liens"]].map(([v, l]) => <span key={l} style={{ background: T.teal100, color: T.teal600, borderRadius: 99, padding: "3px 12px", fontWeight: 700, fontSize: 12.5 }}>{v} {l}</span>)}
      </div>
      {res.report.warnings.slice(0, 6).map((w, i) => <div key={i} style={{ color: T.amber600, fontSize: 12.5 }}>⚠ {w}</div>)}
      {res.report.ignoredLinks.length > 0 && <details style={{ margin: "6px 0" }}><summary style={{ cursor: "pointer", color: T.amber600, fontWeight: 700, fontSize: 12.5 }}>{res.report.ignoredLinks.length} lien(s) non repris (vers des tâches hors Arrivée / Production / Tests / Fin de production / Départ)</summary>
        {res.report.ignoredLinks.slice(0, 20).map((l, i) => <div key={i} style={{ fontSize: 12, color: T.ink500 }}>{l.from} → {l.to}</div>)}</details>}
      {res.diffs.length > 0 && <div style={{ margin: "8px 0", padding: "8px 10px", background: T.amber100, borderRadius: 8, fontSize: 12.5 }}>
        <b>{res.diffs.length} étape(s)</b> ont une date calculée différente de celle de MS Project ({fixable} calculée(s) plus tôt, {notFixable} plus tard — sans doute un calendrier ou un lien interprété différemment).
        {res.diffs.slice(0, 5).map(d => <div key={d.key} style={{ color: T.ink700 }}>{d.key.replace("|", " · ")} : MS {fmtIso(d.ms)} → calcul {fmtIso(d.calc)}</div>)}
        {fixable > 0 && <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, fontWeight: 700 }}><input type="checkbox" checked={calib} onChange={e => setCalib(e.target.checked)} />Caler les {fixable} étapes calculées trop tôt sur les dates MS Project (date imposée)</label>}
      </div>}
      {res.diffs.length === 0 && <div style={{ color: T.emerald600, fontWeight: 700, fontSize: 12.5, margin: "6px 0" }}>✓ Toutes les dates calculées correspondent à celles de MS Project.</div>}
      {plan && plan.pjs.length > 0 && <div style={{ display: "flex", gap: 14, margin: "8px 0", fontSize: 13 }}>
        <label><input type="radio" checked={mode === "merge"} onChange={() => setMode("merge")} /> Fusionner : remplacer seulement les PJ du fichier</label>
        <label><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> Tout remplacer</label></div>}
    </div>}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
      <button style={BTN} onClick={onClose}>Annuler</button>
      <button style={BTN_P} disabled={!res} onClick={() => { onApply(finalPlan); onClose(); }}>Importer dans le plan</button>
    </div>
  </Modal>);
}


// v204 (demandé : « modifier en live les tâches types par gamme avec leur durée habituelle ») : modèles par gamme —
// durée (jours ouvrés) et travail (heures) des phases Production, Tests et Fin de production. « Proposer » part de la moyenne
// des PJ de la gamme dans le plan ; « Appliquer » écrit ces durées sur les PJ de la gamme (les dates imposées sont gardées).
const TPL_STEPS = [["production", "Production"], ["tests", "Tests"], ["finProd", "Fin de production"]];
function gammeOfPj(pj, rows) { const r = (rows || []).find(x => x.pj === pj); return (r && r.gamme) || "Sans gamme"; }
function TemplatesDialog({ plan, rows, onClose, onApply }) {
  const gammes = [...new Set((plan.pjs || []).map(x => gammeOfPj(x.pj, rows)))].sort();
  const avg = g => { const L = (plan.pjs || []).filter(x => gammeOfPj(x.pj, rows) === g), o = {}; TPL_STEPS.forEach(([k]) => { const v = L.map(x => x.steps && x.steps[k]).filter(Boolean); o[k] = { dur: v.length ? Math.round(v.reduce((a, b) => a + (Number(b.dur) || 0), 0) / v.length) : 0, work: v.some(b => b.work != null) ? Math.round(v.reduce((a, b) => a + (Number(b.work) || 0), 0) / v.length) : null }; }); return o; };
  const [tpl, setTpl] = useState(() => { const t = { ...(plan.templates || {}) }; gammes.forEach(g => { if (!t[g]) t[g] = avg(g); }); return t; });
  const set = (g, k, f, v) => setTpl(t => ({ ...t, [g]: { ...t[g], [k]: { ...(t[g] && t[g][k]), [f]: v === "" ? null : Math.max(0, Number(v) || 0) } } }));
  const applyG = (g, np) => { let out = np; (out.pjs || []).filter(x => gammeOfPj(x.pj, rows) === g).forEach(x => TPL_STEPS.forEach(([k]) => { const m = tpl[g] && tpl[g][k]; if (!m || !x.steps || !x.steps[k]) return; const patch = { dur: m.dur }; if (m.work != null) patch.work = m.work; out = setStep(out, x.pj, k, patch); })); return out; };
  const save = (all, g) => { let np = { ...plan, templates: tpl }; if (all) gammes.forEach(x => { np = applyG(x, np); }); else if (g) np = applyG(g, np); onApply(np); };
  const n = g => (plan.pjs || []).filter(x => gammeOfPj(x.pj, rows) === g).length;
  return (<Modal title="Modèles par gamme" onClose={onClose} width={860}>
    <div style={{ fontSize: 13, color: T.ink500, lineHeight: 1.5, marginBottom: 10 }}>Durée habituelle (jours ouvrés) et travail (heures atelier) de chaque phase, par gamme. « Appliquer » recalcule les PJ de la gamme ; les dates imposées restent.</div>
    <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
      <thead><tr><th style={{ textAlign: "left", padding: "6px 8px", color: T.ink500, fontWeight: 600 }}>Gamme</th>{TPL_STEPS.map(([k, l]) => <th key={k} colSpan={2} style={{ textAlign: "left", padding: "6px 8px", color: T.ink500, fontWeight: 600 }}>{l} <span style={{ fontWeight: 400 }}>(j · h)</span></th>)}<th /></tr></thead>
      <tbody>{gammes.map(g => <tr key={g} style={{ borderTop: "1px solid " + T.line }}>
        <td style={{ padding: "6px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>{g} <span style={{ fontWeight: 400, color: T.ink500 }}>· {n(g)} PJ</span></td>
        {TPL_STEPS.map(([k]) => <React.Fragment key={k}>
          <td style={{ padding: "4px 4px" }}><input type="number" min={0} aria-label={g + " " + k + " durée"} value={(tpl[g] && tpl[g][k] && tpl[g][k].dur != null) ? tpl[g][k].dur : ""} onChange={e => set(g, k, "dur", e.target.value)} style={{ ...INP, width: 64 }} /></td>
          <td style={{ padding: "4px 4px" }}><input type="number" min={0} aria-label={g + " " + k + " travail"} value={(tpl[g] && tpl[g][k] && tpl[g][k].work != null) ? tpl[g][k].work : ""} placeholder="h" onChange={e => set(g, k, "work", e.target.value)} style={{ ...INP, width: 64 }} /></td>
        </React.Fragment>)}
        <td style={{ padding: "4px 4px", whiteSpace: "nowrap" }}><button style={BTN} onClick={() => setTpl(t => ({ ...t, [g]: avg(g) }))} title="Reprendre la moyenne des PJ de cette gamme dans le plan">Proposer</button> <button style={BTN} onClick={() => { save(false, g); }}>Appliquer</button></td>
      </tr>)}</tbody>
    </table></div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
      <button style={BTN} onClick={onClose}>Fermer</button>
      <button style={BTN} onClick={() => { save(false); onClose(); }}>Enregistrer les modèles</button>
      <button style={BTN_P} onClick={() => { save(true); onClose(); }}>Appliquer à tous les PJ</button>
    </div>
  </Modal>);
}

function BlankDialog({ rows, onClose, onApply, hasPlan }) {
  const [txt, setTxt] = useState("PJ479-1, PJ479-2, PJ456, PJ472");
  const codes = txt.split(/[,;\s]+/).filter(Boolean);
  return (<Modal title="Repartir d'un plan vierge" onClose={onClose} width={620}>
    <div style={{ fontSize: 13.5, color: T.ink500, lineHeight: 1.55 }}>Crée un plan avec seulement ces PJ : les 5 étapes de chacun, <b>sans aucune date, sans durée et sans lien</b>. Vous saisissez ensuite les dates, durées et prédécesseurs dans le tableau. Les heures de travail du planning actuel sont reprises quand le PJ existe.{hasPlan ? " Le plan en cours est remplacé (Annuler le rétablit). Le planning actuel n'est pas modifié tant que vous ne publiez pas." : ""}</div>
    <div style={{ fontSize: 12, fontWeight: 700, color: T.ink500, margin: "12px 0 4px" }}>PJ à garder (séparés par des virgules)</div>
    <input value={txt} onChange={e => setTxt(e.target.value)} style={{ ...INP, width: "100%", fontFamily: T.fontMono }} aria-label="Codes des PJ à garder" />
    <div style={{ fontSize: 12.5, color: T.ink500, marginTop: 6 }}>{codes.map(c => { const r = (rows || []).find(x => String(x.pj).toLowerCase() === c.toLowerCase()); return c.toUpperCase() + (r ? "" : " (nouveau)"); }).join(" · ")}</div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
      <button style={BTN} onClick={onClose}>Annuler</button>
      <button style={BTN_P} disabled={!codes.length} onClick={() => { onApply(initBlankPlan(codes, rows)); onClose(); }}>Créer le plan vierge ({codes.length} PJ)</button>
    </div>
  </Modal>);
}

function PublishDialog({ plan, sched, rows, pubRows, changes, onClose, onPublish }) {
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState(null);
  const byPj = useMemo(() => { const m = {}; changes.forEach(c => { (m[c.pj] = m[c.pj] || []).push(c); }); return m; }, [changes]);
  const unscheduled = Object.values(sched.nodes).filter(n => n.s === null).length;
  const FL = { arrivee: "Arrivée", tests: "Tests", testsFin: "Fin tests", finProd: "Fin prod.", depart: "Départ", heuresAtelier: "Heures atelier", heuresAutom: "Heures autom", new: "Nouveau PJ" };
  const go = async () => { setBusy(true); setErr(""); try { const r = await onPublish(note.trim()); setDone(r); } catch (e) { setErr(e.message || String(e)); } setBusy(false); };
  return (<Modal title="Publier dans le planning actuel" onClose={onClose} width={760}>
    {done ? <div style={{ fontSize: 14, color: T.emerald600, fontWeight: 700 }}>✓ Publié : {done.nChanges} changement(s) appliqués. Tous les écrans utilisent maintenant ces dates.<div style={{ marginTop: 12, textAlign: "right" }}><button style={BTN_P} onClick={onClose}>Fermer</button></div></div> : <>
      <div style={{ fontSize: 13.5, color: T.ink500, lineHeight: 1.55 }}>{changes.length === 0 ? "Le planning actuel est déjà identique au plan : rien à publier." : <>Ces changements remplaceront les dates du planning actuel (calendrier, Gantt, liste, KPI, rapport CODIR). Le planning <b>initial</b> n'est pas modifié. Une copie de l'état actuel est gardée pour pouvoir annuler.</>}</div>
      {unscheduled > 0 && <div style={{ color: T.amber600, fontSize: 12.5, marginTop: 6 }}>⚠ {unscheduled} étape(s) du plan n'ont pas de date (ni date imposée ni prédécesseur) : les dates correspondantes seront vides.</div>}
      {changes.length > 0 && <div style={{ marginTop: 10, border: "1px solid " + T.line, borderRadius: 10, maxHeight: 300, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}><tbody>
          {Object.keys(byPj).map(pj => byPj[pj].map((c, i) => (<tr key={pj + i} style={{ borderTop: i === 0 ? "1px solid " + T.line : "none" }}>
            <td style={{ padding: "4px 10px", fontFamily: T.fontMono, fontWeight: 700, color: T.teal600, width: 90 }}>{i === 0 ? pj : ""}</td>
            <td style={{ padding: "4px 10px", color: T.ink500, width: 100 }}>{FL[c.field] || c.field}</td>
            <td style={{ padding: "4px 10px", color: T.ink700 }}>{c.field === "new" ? fmtIso(c.to) : (typeof c.from === "number" ? c.from : fmtIso(c.from)) + " → " + (typeof c.to === "number" ? c.to : fmtIso(c.to))}</td>
          </tr>)))}
        </tbody></table></div>}
      {changes.length > 0 && <input value={note} onChange={e => setNote(e.target.value)} placeholder="Commentaire de publication (facultatif) : ex. « glissement PJ449 suite retard fournisseur »" style={{ ...INP, width: "100%", marginTop: 10 }} />}
      {err && <div style={{ color: T.red500, fontWeight: 700, fontSize: 13, marginTop: 8 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button style={BTN} onClick={onClose}>Annuler</button>
        <button style={BTN_P} disabled={busy || changes.length === 0 || !!sched.cycle} onClick={go}>{busy ? "Publication…" : "Publier " + changes.length + " changement" + (changes.length > 1 ? "s" : "")}</button>
      </div></>}
  </Modal>);
}

function HistoryDialog({ onClose, onLoad, onRestorePlan, onRestorePub }) {
  const [items, setItems] = useState(null); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  useEffect(() => { onLoad().then(setItems).catch(e => setErr(e.message)); }, []); // eslint-disable-line
  return (<Modal title="Historique des publications" onClose={onClose}>
    {err && <div style={{ color: T.red500 }}>{err}</div>}{msg && <div style={{ color: T.emerald600, fontWeight: 700, margin: "6px 0" }}>{msg}</div>}
    {items === null && !err && <div style={{ color: T.ink500 }}>Chargement…</div>}
    {items && items.length === 0 && <div style={{ color: T.ink500, fontSize: 13.5 }}>Aucune publication pour l'instant.</div>}
    {items && items.map(e => (<div key={e.at} style={{ borderTop: "1px solid " + T.line, padding: "10px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 220 }}><div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink900 }}>{new Date(e.at).toLocaleString("fr-FR")} · {e.by || "—"}</div>
        <div style={{ fontSize: 12.5, color: T.ink500 }}>{e.nChanges} changement(s){e.note ? " · " + e.note : ""}</div></div>
      <button style={BTN} title="Recharge le plan tel qu'il était à cette publication (n'est pas publié automatiquement)" onClick={() => { onRestorePlan(e.plan); setMsg("Plan rechargé dans l'éditeur (non publié)."); }}>Recharger ce plan</button>
      <button style={{ ...BTN, color: T.red500 }} title="Remet dans le planning actuel les dates d'avant cette publication" onClick={async () => { if (!window.confirm("Annuler cette publication et remettre le planning actuel dans son état d'avant ?")) return; try { await onRestorePub(e.at); setMsg("Publication annulée : le planning actuel est revenu à l'état précédent."); } catch (x) { setErr(x.message); } }}>Annuler cette publication</button>
    </div>))}
    <div style={{ textAlign: "right", marginTop: 10 }}><button style={BTN} onClick={onClose}>Fermer</button></div>
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

function Banner({ tone, children }) {
  const c = { warn: [T.amber100, T.amber600], bad: [T.red100, T.red500], ok: [T.emerald100, T.emerald600] }[tone];
  return <div role="status" style={{ background: c[0], color: c[1], borderRadius: 10, padding: "8px 14px", fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{children}</div>;
}

export function PlannerView({ planLoaded, planDoc, rows, closurePeriods, authorName, onSavePlan, onPublish, onLoadHistory, onRestorePublication }) {
  const [plan, setPlanState] = useState(null); const [preview, setPreview] = useState(null); const [proposal, setProposal] = useState(null);
  const [undo, setUndo] = useState([]); const [redo, setRedo] = useState([]);
  const [sel, setSel] = useState(null); const [exp, setExp] = useState(() => new Set());
  const [q, setQ] = useState(""); const [dlg, setDlg] = useState(null); const [saveSt, setSaveSt] = useState(""); const [notice, setNotice] = useState(null); const [addCode, setAddCode] = useState("");
  const [ui, setUiState] = useState(loadUi); const [scrollX, setScrollX] = useState(0);
  const [refId, setRefId] = useState("pub"); const [hist, setHist] = useState(null); const baseRef = useRef(null);
  const lastSaved = useRef(null); const gref = useRef(null); const lref = useRef(null); const expInit = useRef(false);
  const setUi = useCallback(patch => setUiState(u => { const n = { ...u, ...patch }; saveUi(n); return n; }), []);
  const holidays = !(plan && plan.cal && plan.cal.holidays === false);
  const cal = useMemo(() => makeCalendar({ closurePeriods, holidays }), [closurePeriods, holidays]);

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
  // premier affichage : tout déplié si le plan est petit
  useEffect(() => { if (plan && plan.v === 2 && !expInit.current) { expInit.current = true; if (plan.pjs.length <= 12) setExp(new Set(plan.pjs.map(p => p.pj))); } }, [plan]);

  const live = preview || (proposal && proposal.plan) || plan;
  const sched = useMemo(() => live && live.v === 2 ? schedule(live, cal) : { nodes: {}, cycle: null }, [live, cal]);
  const load = useMemo(() => live && live.v === 2 ? loadModel(live, sched, cal) : null, [live, sched, cal]);
  const tl = useMemo(() => makeTimeline(sched, ui.zoom), [sched, ui.zoom]);
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
    if (kind === "level") { const r = levelPlan(plan, cal); np = r.plan; title = "Nivellement de la charge atelier (" + Math.round(capWeek(plan)) + " h / semaine)"; }
    else if (kind === "early") { np = releasePins(plan); title = "Dates au plus tôt : dates imposées libérées (sauf arrivées et départs)"; }
    else if (kind === "fit") { np = fitDurations(plan); title = "Durées allongées pour tenir la capacité"; }
    else if (kind === "rules") { np = setRules(plan, patch); title = Object.keys(patch).map(k => (k === "prod" ? "Une production à la fois" : "Un test au banc à la fois") + (patch[k] ? " : activé" : " : désactivé")).join(", "); }
    else if (kind === "sort") { apply(sortPjsByStart(plan, cal)); return; }
    else { np = clearLevel(plan); title = "Retrait du nivellement"; }
    const cmp = compareScheds(schedule(plan, cal), schedule(np, cal), cal);
    const lm = loadModel(np, schedule(np, cal), cal);
    setProposal({ plan: np, title, cmp, over: lm.overWeeks, peak: lm.peak, same: JSON.stringify(np) === JSON.stringify(plan) });
  };
  const acceptProposal = () => { const np = proposal.plan; setProposal(null); setUndo(u => [...u.slice(-49), plan]); setRedo([]); setPlanState(np); setPreview(null); };
  const reorder = useCallback((pj, over) => { if (!plan) return; const np = moveTo(plan, pj, over); if (np !== plan) onCommit(np, { pj, key: null, want: null }); }, [plan, onCommit]);

  const pjsShown = useMemo(() => { if (!live || live.v !== 2) return []; const s = q.trim().toLowerCase(); return live.pjs.filter(p => !s || p.pj.toLowerCase().includes(s) || (p.nomProjet || "").toLowerCase().includes(s)); }, [live, q]);
  const toggleExp = (pj, force) => setExp(s => { const n = new Set(s); (force === true || !n.has(pj)) ? n.add(pj) : n.delete(pj); return n; });
  const goToday = () => { const el = (ui.view === "lanes" ? lref : gref).current; if (el) el.scrollLeft = Math.max(0, (tl.today - tl.lo) * tl.px - 160); };
  useEffect(() => { if (plan && plan.v === 2) { const t = setTimeout(goToday, 60); return () => clearTimeout(t); } }, [plan === null, ui.zoom, ui.view]); // eslint-disable-line

  if (!planLoaded) return <div className="pg-root"><style>{pgCss()}</style><div style={{ color: T.ink500, padding: 20 }}>Chargement du plan…</div></div>;
  const empty = !plan || plan.v !== 2;
  if (empty) {
    return (<div className="pg-root"><style>{pgCss()}</style>
      <div style={{ ...CARD, padding: "24px 28px", maxWidth: 760 }}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 24, color: T.ink900 }}>Planification</div>
        {plan && plan.v !== 2 && <div style={{ background: T.amber100, color: T.amber600, borderRadius: 10, padding: "8px 14px", margin: "12px 0", fontWeight: 600, fontSize: 13 }}>Le plan enregistré date d'une ancienne version. Recréez-le : le planning actuel n'est pas modifié tant que vous ne publiez pas.</div>}
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: T.ink700, margin: "14px 0 20px" }}>Un Gantt modifiable en direct, à la place de MS Project : chaque PJ suit <b>Arrivée, Production, Tests, Fin de production, Départ</b>, avec ses dates, durées, travail (heures), liens entre tâches et priorité. La charge atelier est comparée à la capacité par semaine ou par mois. À la création, <b>toutes les dates sont reprises à l'identique</b> du planning actuel.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={{ ...BTN_P, padding: "10px 18px", fontSize: 14 }} onClick={() => { setPlanState(fillMissingHours(initPlanFromRows(rows || [], cal), rows || [], null).plan); setUndo([]); setRedo([]); }}>Créer le plan depuis le planning actuel ({(rows || []).length} PJ)</button>
          <button style={{ ...BTN, padding: "10px 18px", fontSize: 14 }} onClick={() => setDlg("blank")}>Plan vierge (quelques PJ, sans dates)</button>
          <button style={{ ...BTN, padding: "10px 18px", fontSize: 14 }} onClick={() => setDlg("import")}>Importer un export MS Project</button>
        </div>
      </div>
      {dlg === "import" && <ImportDialog cal={cal} rows={rows} plan={null} onClose={() => setDlg(null)} onApply={np => setPlanState(np)} />}
      {dlg === "blank" && <BlankDialog rows={rows} hasPlan={false} onClose={() => setDlg(null)} onApply={np => { setPlanState(np); setUndo([]); setRedo([]); }} />}
    </div>);
  }
  const nEst = plan.pjs.filter(p => p.hEst).length, nNoH = plan.pjs.filter(p => !(Number(p.hAt) > 0) && (p.steps.production || p.steps.finProd)).length;
  const nLinks = (plan.links || []).length; const rules = rulesOf(plan); const cap = plan.cap || DEFAULT_CAP;
  const rowsNotInPlan = (rows || []).filter(r => !plan.pjs.some(p => p.pj === r.pj));
  const selPj = sel && plan.pjs.some(p => p.pj === sel.pj) ? sel : null;
  const noT = ui.view === "list" || ui.view === "changes"; const cmp = proposal && proposal.cmp; const ro = ui.lock || !!proposal;
  const loadEl = load ? <PlannerLoad plan={live} load={load} cal={cal} tl={tl} scrollX={scrollX} leftW={leftWidthWith(ui.view, ui.listW)} onCapWeek={(w, h) => apply(setCapWeek(plan, w, h))} small={!!ui.loadSmall} setSmall={v => setUi({ loadSmall: v })} standalone={ui.view === "list" || ui.view === "lanes"} mode={ui.loadMode} setMode={m => setUi({ loadMode: m })} cap={cap}
        onCap={patch => apply(setCap(plan, patch))} readOnly={ro} onPropose={startProposal} hasLevelNow={hasLevel(plan)} nTooDense={load.tooDense.length} /> : null;
  return (<div className="pg-root">
    <style>{pgCss()}</style>
    <datalist id="plan-add">{rowsNotInPlan.map(r => <option key={r.pj} value={r.pj} />)}</datalist>
    {/* en-tête */}
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 22, color: T.ink900 }}>Planification</div>
      <span style={{ fontSize: 12.5, color: T.ink500 }}>{plan.pjs.length} PJ · {nLinks} lien{nLinks > 1 ? "s" : ""}</span>
      {nEst + nNoH > 0 && <span title="La charge vient des heures atelier du planning importé. Sans heures, un PJ reprend le modèle de sa gamme ou la moyenne des PJ de la même gamme." style={{ fontSize: 12, color: T.amber600 }}>{nEst ? nEst + " PJ aux heures estimées" : ""}{nEst && nNoH ? " · " : ""}{nNoH ? nNoH + " PJ sans heures (hors charge)" : ""}</span>}
      <span role="button" tabIndex={0} onClick={() => { setRefId("pub"); setUi({ view: "changes" }); }} onKeyDown={e => { if (e.key === "Enter") { setRefId("pub"); setUi({ view: "changes" }); } }} title="Voir la synthèse des modifications" style={{ cursor: "pointer", borderRadius: 99, padding: "3px 12px", fontSize: 12.5, fontWeight: 700, background: changes.length ? T.amber100 : T.emerald100, color: changes.length ? T.amber600 : T.emerald600 }}>{changes.length ? changes.length + " modification" + (changes.length > 1 ? "s" : "") + " non publiée" + (changes.length > 1 ? "s" : "") : "À jour avec le planning actuel"}</span>
      <span style={{ fontSize: 12, color: T.ink500 }} aria-live="polite">{saveSt}</span>
      <span style={{ flex: 1 }} />
      <button className="pg-tb" aria-pressed={ui.lock} onClick={() => { setUi({ lock: !ui.lock }); setProposal(null); }} title="Verrouille l'édition (lecture en réunion)">{ui.lock ? "🔒 Lecture" : "Lecture"}</button>
      {!ui.lock && <>
        <button className="pg-tb" disabled={!undo.length} onClick={doUndo} aria-label="Annuler la dernière modification">↶ Annuler</button>
        <button className="pg-tb" disabled={!redo.length} onClick={doRedo} aria-label="Rétablir">↷ Rétablir</button>
        <button className="pg-tb" onClick={() => { if (window.confirm("Reprendre toutes les dates du planning actuel (" + (rows || []).length + " PJ) ? Le plan en cours est remplacé ; la capacité et les modèles par gamme sont gardés. Annuler (Ctrl+Z) reste possible.")) { const np = refreshPlanFromRows(plan, rows || [], cal); setSel(null); apply(np); setNotice({ tone: "warn", text: "Plan recréé depuis le planning actuel : " + np.pjs.length + " PJ, dates reprises telles quelles." }); } }} title="Recrée le plan avec les dates du planning actuel (la capacité et les modèles par gamme sont gardés)">Reprendre les dates du planning</button>
        <button className="pg-tb" onClick={() => setDlg("templates")} title="Durées et heures habituelles par gamme, applicables aux PJ">Modèles par gamme…</button>
        <button className="pg-tb" onClick={() => setDlg("blank")} title="Repartir de zéro avec quelques PJ, sans dates ni durées">Plan vierge…</button>
        <button className="pg-tb" onClick={() => setDlg("import")}>Importer</button>
        <button className="pg-tb" onClick={() => setDlg("history")}>Historique</button>
        <button style={{ ...BTN_P, padding: "7px 16px" }} onClick={() => setDlg("publish")}>Publier</button>
      </>}
    </div>
    {/* barre d'outils */}
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      <button className="pg-tb" disabled={noT} onClick={goToday}>Aujourd'hui</button>
      <div role="group" aria-label="Échelle de temps" style={{ display: "inline-flex", gap: 0 }}>
        {[["day", "Jour"], ["week", "Semaine"], ["month", "Mois"]].map(([k, l], i) => <button key={k} className="pg-tb" disabled={noT} aria-pressed={ui.zoom === k} onClick={() => setUi({ zoom: k })} style={{ borderRadius: i === 0 ? "8px 0 0 8px" : i === 3 ? "0 8px 8px 0" : 0, marginLeft: i ? -1 : 0 }}>{l}</button>)}
      </div>
      <button className="pg-tb" onClick={() => setExp(s => s.size ? new Set() : new Set(plan.pjs.map(p => p.pj)))}>{exp.size ? "Tout replier" : "Tout déplier"}</button>
      <button className="pg-tb" disabled={noT} aria-pressed={ui.links} onClick={() => setUi({ links: !ui.links })} title="Affiche toutes les flèches de liens (sinon seulement celles du PJ sélectionné)">Liens</button>
<div role="group" aria-label="Affichage" style={{ display: "inline-flex" }}>
        {[["list", "Liste"], ["both", "Liste + Gantt"], ["gantt", "Gantt"], ["lanes", "Couloirs"], ["changes", "Modifications"]].map(([k, l], i, arr) => <button key={k} className="pg-tb" aria-pressed={ui.view === k} onClick={() => setUi({ view: k })} style={{ borderRadius: i === 0 ? "8px 0 0 8px" : i === arr.length - 1 ? "0 8px 8px 0" : 0, marginLeft: i ? -1 : 0 }}>{l}{k === "changes" && nTouched > 0 && <span style={{ marginLeft: 6, background: ui.view === k ? "rgba(255,255,255,.25)" : T.amber100, color: ui.view === k ? "#fff" : T.amber600, borderRadius: 99, padding: "0 7px", fontSize: 11.5 }}>{nTouched}</span>}</button>)}
      </div>
      {ui.view === "lanes" && <div role="group" aria-label="Hauteur des couloirs" style={{ display: "inline-flex" }}>
        {[["s", "Serrés"], ["m", "Normaux"], ["l", "Larges"]].map(([k, l], i) => <button key={k} className="pg-tb" aria-pressed={(ui.laneH || "m") === k} onClick={() => setUi({ laneH: k })} title="Hauteur des couloirs" style={{ borderRadius: i === 0 ? "8px 0 0 8px" : i === 2 ? "0 8px 8px 0" : 0, marginLeft: i ? -1 : 0 }}>{l}</button>)}
      </div>}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ…" aria-label="Rechercher un PJ" className="pg-in" style={{ ...INP, width: 160 }} />
      {!ui.lock && <>
        <span style={{ display: "inline-flex", gap: 4 }}>
          <input list="plan-add" value={addCode} onChange={e => setAddCode(e.target.value)} placeholder="Ajouter un PJ…" aria-label="Code du PJ à ajouter" className="pg-in" style={{ ...INP, width: 130, fontFamily: T.fontMono }} />
          <button className="pg-tb" disabled={!addCode.trim() || !!proposal} onClick={() => { const c = addCode.trim().toUpperCase(); apply(addPj(plan, c, (rows || []).find(r => r.pj === c) || null, cal)); setSel({ pj: c, step: null }); toggleExp(c, true); setAddCode(""); }}>＋ PJ</button>
        </span>
        <Pop width={330} align="left" trigger={(o, t) => <button className="pg-tb" aria-haspopup="menu" aria-expanded={o} onClick={t}>Règles ▾{overlaps && !rules.prod && !rules.banc ? <span style={{ color: T.amber600 }}> ⚠ {overlaps}</span> : null}</button>}>
          {close => (<div style={{ padding: 4, fontSize: 13, color: T.ink700, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={rules.prod} onChange={e => { close(); startProposal("rules", { prod: e.target.checked }); }} /><span><b>Une production à la fois</b><br /><span style={{ fontSize: 12, color: T.ink500 }}>Les productions passent l'une après l'autre (ordre = priorité). Aperçu avant application.</span></span></label>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={rules.banc} onChange={e => { close(); startProposal("rules", { banc: e.target.checked }); }} /><span><b>Un test au banc à la fois</b><br /><span style={{ fontSize: 12, color: T.ink500 }}>Un seul PJ au banc d'essai en même temps.</span></span></label>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={holidays} onChange={e => { close(); apply({ ...plan, cal: { ...(plan.cal || {}), holidays: e.target.checked } }); }} /><span><b>Jours fériés non ouvrés</b><br /><span style={{ fontSize: 12, color: T.ink500 }}>Modifie le calendrier : les dates se recalculent (annulable).</span></span></label>
            <div style={{ fontSize: 12, color: overlaps ? T.amber600 : T.emerald600, borderTop: "1px solid " + T.line, paddingTop: 6 }}>{overlaps ? overlaps + " chevauchement" + (overlaps > 1 ? "s" : "") + " de Production / Tests dans le plan actuel." : "Aucun chevauchement de Production / Tests."}</div>
          </div>)}
        </Pop>
      </>}
      <span style={{ flex: 1 }} />
      <span style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: T.ink500, alignItems: "center" }}>
        {[["arrivee", "Arrivée", 1], ["production", "Production"], ["tests", "Tests"], ["finProd", "Fin de prod."], ["depart", "Départ", 1]].map(([k, l, ms]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: ms ? 9 : 16, height: 9, background: STEP_COLOR[k], transform: ms ? "rotate(45deg)" : "none", borderRadius: 2, display: "inline-block" }} />{l}</span>)}
        <span><span style={{ color: T.ink500 }}>→</span> lien</span>
        {(rules.prod || rules.banc) && <span style={{ color: T.teal600 }}>⇢ ordre de passage</span>}
      </span>
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

    {/* v208 (demandé : « la charge atelier toujours visible en bas de l'écran ») : la charge colle au bas de l'écran ; en Couloirs elle suit les couloirs */}
    {ui.view === "lanes" && <div style={{ ...CARD, overflow: "clip", marginBottom: 12 }}>
      <PlannerLanes laneH={ui.laneH || "m"} plan={live} basePlan={plan} sched={sched} cal={cal} closurePeriods={closurePeriods} load={load} tl={tl} sel={selPj} setSel={setSel} readOnly={ro} onPreview={setPreview} onCommit={onCommit} scrollRef={lref} />
      {loadEl}
    </div>}
    {ui.view === "changes" && chg && <div style={{ ...CARD, overflow: "hidden" }}>
      <PlannerChanges summary={chg.summary} planDiff={chg.planDiff || []} hasDetail={!!chg.planDiff} refs={chg.refs} refId={chg.id} setRefId={setRefId} refLabel={chg.label} loadingRefs={hist === null} q={q} onOpenPj={openPj} />
    </div>}
    {ui.view !== "changes" && <div style={{ ...CARD, overflow: "clip" }}>
      <PlannerGantt listW={ui.listW} onListW={w => setUi({ listW: w })} plan={live} basePlan={plan} sched={sched} cal={cal} closurePeriods={closurePeriods} tl={tl} pjs={pjsShown} sel={selPj} setSel={setSel} expanded={exp} toggleExp={toggleExp}
        showLinks={ui.links} view={ui.view} readOnly={ro} onPreview={setPreview} onCommit={onCommit} onError={onError} onReorder={reorder} scrollRef={gref} onScrollX={setScrollX} />
      {ui.view !== "lanes" && loadEl}
    </div>}
    {ui.view !== "changes" && <div style={{ fontSize: 12, color: T.ink500, marginTop: 8, lineHeight: 1.6 }}>
      Cliquez une date, une durée, un travail ou un prédécesseur pour la modifier (Entrée valide, Échap annule) · glissez une barre pour la déplacer, sa poignée pour changer la durée · glissez ⋮⋮ pour changer la priorité d'un PJ · prédécesseurs : numéros de ligne, <b>2 ; 7SS+3j</b> (FS par défaut, SS, FF, SF, décalage en jours ouvrés).
    </div>}
    {dlg === "templates" && <TemplatesDialog plan={plan} rows={rows} onClose={() => setDlg(null)} onApply={np => apply(np)} />}
    {dlg === "blank" && <BlankDialog rows={rows} hasPlan onClose={() => setDlg(null)} onApply={np => { setSel(null); setExp(new Set(np.pjs.map(p => p.pj))); apply(np); }} />}
    {dlg === "import" && <ImportDialog cal={cal} rows={rows} plan={plan} onClose={() => setDlg(null)} onApply={np => apply(np)} />}
    {dlg === "publish" && <PublishDialog plan={plan} sched={sched} rows={rows} pubRows={pubRows} changes={changes} onClose={() => setDlg(null)} onPublish={note => onPublish(plan, note)} />}
    {dlg === "history" && <HistoryDialog onClose={() => setDlg(null)} onLoad={onLoadHistory} onRestorePlan={p => apply(p)} onRestorePub={onRestorePublication} />}
  </div>);
}
