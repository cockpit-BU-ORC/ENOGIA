import React, { useMemo, useRef, useState, useEffect } from "react";
import { T, stageSoft, inkOn, btn } from "../theme";
import { SerieTag } from "../pjMeta";
import { STEP_KEYS, STEP_LABEL, STEP_IS_MS, STEP_KIND, stepKeysOf, stepLabel, isCustomKey, addCustomStep, addLink, removeLink, updateLink, nodeKey, splitKey, dayNum, isoOfDay, setStep, setWork, stepWork, shiftPj, moveStepTo, startAtKeepLinks, removeStep, removePj, allLinks, orderOf, rulesOf, schedule as scheduleOf, moveStepOrder, setStepMeta, benchOf, PHASES, setBench, setPrio, setArchived } from "./engine";
import { numberRows, predText, applyPredText } from "./predecessors";
import { Pop, MenuItem } from "./PlannerMenu";
import { usePointerDnD } from "../pointerDrag";
import { askConfirm } from "../confirm";
import { AF } from "../autoFocusOk";

export const fmtIso = iso => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(2, 4) : "—";
export const STEP_COLOR_BASE = { arrivee: "#7A5A1C", production: "#17734F", tests: "#5A44A6", finProd: "#A4570B", depart: "#A8332F" };
// v292 (demandé : « MAJ des couleurs de tâches ») : mêmes couleurs d'étape que le Gantt et le Calendrier (stageSoft du thème,
// clair / sombre) ; STEP_COLOR_BASE reste l'ancienne palette (repli si le thème ne connaît pas l'étape).
export const STEP_COLOR = new Proxy(STEP_COLOR_BASE, { get: (o, k) => { const S = stageSoft(); return (S[k] && S[k].solid) || o[k] || T.ink500; } });
// Couleur d'une tâche : une tâche ajoutée (« ＋ Tâche ») prend la couleur de sa phase (production, tests, packing).
export const stepColor = (p, k) => { if (!isCustomKey(k)) return STEP_COLOR[k]; const ph = p && p.steps && p.steps[k] && p.steps[k].phase; return ph ? STEP_COLOR[ph] : T.ink500; };
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_L = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const dow = n => (((n + 3) % 7) + 7) % 7; // 0 = lundi
export const ROW_H = 32, HEAD_H = 56;
export const COLS_FULL = [["id", 40], ["name", 280], ["start", 96], ["end", 88], ["dur", 56], ["work", 66], ["pred", 110]];
export const COLS_LIST = [["id", 44], ["name", 400], ["start", 112], ["end", 112], ["dur", 84], ["work", 92], ["pred", 260]];
export const COLS_COMPACT = [["id", 40], ["name", 256], ["start", 104], ["dur", 60]];
export const colsFor = view => view === "list" || view === "lanes" ? COLS_LIST : view === "gantt" ? COLS_COMPACT : COLS_FULL;
export const leftWidth = view => colsFor(view).reduce((a, c) => a + c[1], 0);
// v208 (demandé : « régler la largeur de la partie liste dans le mode Liste + Gantt ») : la colonne Tâche prend la place gagnée ;
// en dessous de la largeur normale, Prédécesseurs, Travail puis Fin sont masquées.
export const LIST_W_MIN = 380, LIST_W_MAX = 1200;
export function colsWith(view, listW) {
  let cs = colsFor(view); if (view !== "both" || !listW) return cs;
  const sum = cs.reduce((a, c) => a + c[1], 0);
  cs = cs.map(([c, w]) => c === "name" ? [c, Math.max(170, w + listW - sum)] : [c, w]);
  let tot = cs.reduce((a, c) => a + c[1], 0);
  for (const d of ["pred", "work", "end"]) { if (tot <= listW + 1) break; const i = cs.findIndex(c => c[0] === d); if (i >= 0) { tot -= cs[i][1]; cs = cs.filter((_, j) => j !== i); } }
  if (tot < listW) cs = cs.map(([c, w]) => c === "name" ? [c, w + listW - tot] : [c, w]);
  return cs;
}
export const leftWidthWith = (view, listW) => colsWith(view, listW).reduce((a, c) => a + c[1], 0);
const HEAD_LABEL = { id: "N°", name: "Tâche (l'ordre des PJ = priorité)", start: "Début", end: "Fin", dur: "Durée", work: "Travail", pred: "Prédécesseurs" };

// Échelle de temps commune au Gantt et au graphique de charge
// v224 (demandé : « pouvoir zoomer ») : zoom = "day" | "week" | "month" ou un nombre de pixels par jour (Ctrl + molette, − +) ;
// l'en-tête suit la largeur d'un jour (jours au-delà de 18 px, semaines au-delà de 5 px, sinon mois).
export const ZOOM_PX = { day: 28, week: 9, month: 3 }, PX_MIN = 1.5, PX_MAX = 48;
export function makeTimeline(sched, zoomIn) {
  const px = typeof zoomIn === "number" ? Math.max(PX_MIN, Math.min(PX_MAX, zoomIn)) : ZOOM_PX[zoomIn] || 9; const zoom = px >= 18 ? "day" : px >= 5 ? "week" : "month";
  const t = new Date(); const today = dayNum(t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"));
  let lo = Infinity, hi = -Infinity;
  Object.values(sched.nodes).forEach(n => { if (n.s === null) return; lo = Math.min(lo, dayNum(n.start)); hi = Math.max(hi, dayNum(n.finish)); });
  if (!isFinite(lo)) { lo = today - 14; hi = today + 120; }
  lo = Math.min(lo, today - 14) - 14; lo -= dow(lo); hi = Math.max(hi, today + 60) + 28; hi = Math.max(hi, lo + Math.ceil(1500 / px));
  return { lo, hi, px, today, W: (hi - lo + 1) * px, X: iso => (dayNum(iso) - lo) * px, zoom };
}

export function headerCells(tl) {
  const top = [], bottom = []; const { lo, hi, px, zoom } = tl;
  if (zoom === "month") {
    let n = lo; while (n <= hi) { const d = new Date(n * 86400000); const y = d.getUTCFullYear(); const next = Date.UTC(y + 1, 0, 1) / 86400000; const end = Math.min(hi + 1, next); top.push({ label: String(y), x: (n - lo) * px, w: (end - n) * px }); n = next; }
    n = lo; while (n <= hi) { const d = new Date(n * 86400000); const y = d.getUTCFullYear(), m = d.getUTCMonth(); const next = Date.UTC(y, m + 1, 1) / 86400000; const end = Math.min(hi + 1, next); bottom.push({ label: MONTHS[m], x: (n - lo) * px, w: (end - n) * px }); n = next; }
  } else {
    let n = lo; while (n <= hi) { const d = new Date(n * 86400000); const y = d.getUTCFullYear(), m = d.getUTCMonth(); const next = Date.UTC(y, m + 1, 1) / 86400000; const end = Math.min(hi + 1, next); top.push({ label: MONTHS_L[m] + " " + y, x: (n - lo) * px, w: (end - n) * px }); n = next; }
    if (zoom === "day") for (let n2 = lo; n2 <= hi; n2++) { const d = new Date(n2 * 86400000); bottom.push({ label: String(d.getUTCDate()), sub: "LMMJVSD"[dow(n2)], x: (n2 - lo) * px, w: px, we: dow(n2) >= 5, today: n2 === tl.today }); }
    else for (let n2 = lo; n2 <= hi; n2 += 7) { const d = new Date((n2 + 3) * 86400000); const w1 = Date.UTC(d.getUTCFullYear(), 0, 4); const wk = 1 + Math.round(((d.getTime() - w1) / 86400000 - 3 + dow(Math.floor(w1 / 86400000))) / 7); bottom.push({ label: "S" + wk, x: (n2 - lo) * px, w: 7 * px, cur: tl.today >= n2 && tl.today < n2 + 7 }); }
  }
  return { top, bottom };
}

// Cellule modifiable : un clic ouvre la saisie, Entrée valide, Échap annule
function EditCell({ value, display, onCommit, type = "text", disabled, align = "left", mono, title, style, placeholder, autoEdit }) {
  const [ed, setEd] = useState(!!autoEdit); const [v, setV] = useState(autoEdit && value != null ? String(value) : ""); const cancel = useRef(false);
  if (!ed || disabled) return <div className={"pg-cell" + (disabled ? "" : " pg-ed")} title={title} onClick={() => { if (disabled) return; cancel.current = false; setV(value == null ? "" : String(value)); setEd(true); }} style={{ textAlign: align, fontFamily: mono ? T.fontMono : T.font, ...style }}>{display}</div>;
  const done = () => { setEd(false); if (!cancel.current && v !== String(value == null ? "" : value)) onCommit(v); };
  return <input autoFocus={AF} type={type} value={v} placeholder={placeholder} onChange={e => setV(e.target.value)} onBlur={done} onFocus={e => e.target.select && type !== "date" && e.target.select()}
    onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") { cancel.current = true; e.currentTarget.blur(); } }}
    style={{ width: "100%", height: ROW_H - 6, margin: "0 0 0 0", padding: "0 4px", border: "2px solid " + T.teal500, borderRadius: 8, background: T.card, color: T.ink900, fontFamily: mono ? T.fontMono : T.font, fontSize: 13, textAlign: align, boxSizing: "border-box" }} />;
}


// Édition rapide d'une tâche directement depuis sa barre (double-clic) : début, durée, travail, prédécesseurs
function QuickEdit({ at, title, ms, vals, canWork, onStart, onDur, onWork, onPred, onClose }) {
  const [v, setV] = useState(vals); const box = useRef(null);
  useEffect(() => {
    const down = e => { if (box.current && !box.current.contains(e.target)) onClose(); }; const esc = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", esc); return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", esc); };
  }, [onClose]);
  const F = (label, key, type, fn, show = true) => show ? (<label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink500, marginBottom: 6 }}><span style={{ width: 84 }}>{label}</span>
    <input className="pg-in" type={type} value={v[key]} onChange={e => setV({ ...v, [key]: e.target.value })} onBlur={() => { if (v[key] !== vals[key]) fn(v[key]); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
      style={{ flex: 1, minWidth: 0, height: 30, padding: "0 8px", border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, fontFamily: T.fontMono, fontSize: 13, boxSizing: "border-box" }} /></label>) : null;
  return (<div ref={box} role="dialog" aria-label={"Modifier " + title} style={{ position: "fixed", left: Math.min(at.x, window.innerWidth - 330), top: Math.min(at.y + 8, window.innerHeight - 270), width: 310, zIndex: 10003, background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: 12 }}>
    <div style={{ fontWeight: 600, fontSize: 14, color: T.ink900, marginBottom: 8 }}>{title}</div>
    {F("Début", "start", "date", onStart)}{F("Durée (j)", "dur", "number", onDur, !ms)}{F("Travail (h)", "work", "number", onWork, canWork)}{F("Prédécesseurs", "pred", "text", onPred)}
    <div style={{ fontSize: 12, color: T.ink300 }}>Entrée ou clic ailleurs pour valider · Échap pour fermer</div>
  </div>);
}

// Modification d'un lien (clic sur sa flèche) : type, décalage, suppression
function LinkEdit({ at, link, from, to, onType, onLag, onDelete, onClose }) {
  const box = useRef(null); const [lag, setLag] = useState(String(link.lag || 0));
  useEffect(() => {
    const down = e => { if (box.current && !box.current.contains(e.target)) onClose(); }; const esc = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", esc); return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", esc); };
  }, [onClose]);
  const names = { FS: "Fin → Début (FS)", SS: "Début → Début (SS)", FF: "Fin → Fin (FF)", SF: "Début → Fin (SF)" };
  return (<div ref={box} role="dialog" aria-label="Modifier le lien" style={{ position: "fixed", left: Math.min(at.x, window.innerWidth - 320), top: Math.min(at.y + 8, window.innerHeight - 220), width: 300, zIndex: 10003, background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: 12 }}>
    <div style={{ fontWeight: 500, fontSize: 13, color: T.ink900 }}>Lien</div>
    <div style={{ fontSize: 12, color: T.ink500, margin: "2px 0 8px" }}>{from} → {to}</div>
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink500, marginBottom: 6 }}><span style={{ width: 70 }}>Type</span>
      <select value={link.type} onChange={e => onType(e.target.value)} style={{ flex: 1, height: 30, border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, fontSize: 13 }}>{Object.keys(names).map(k => <option key={k} value={k}>{names[k]}</option>)}</select></label>
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink500, marginBottom: 10 }}><span style={{ width: 70 }}>Décalage</span>
      <input className="pg-in" type="number" value={lag} onChange={e => setLag(e.target.value)} onBlur={() => { if (lag !== String(link.lag || 0)) onLag(lag); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ width: 70, height: 30, padding: "0 8px", border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, fontFamily: T.fontMono, fontSize: 13, boxSizing: "border-box" }} /> <span style={{ fontSize: 12 }}>jours ouvrés (négatif = chevauchement)</span></label>
    <button onClick={onDelete} style={{ border: "1px solid " + T.red500, color: T.red500, background: "transparent", borderRadius: 8, padding: "5px 12px", fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Supprimer le lien</button>
  </div>);
}

export function PlannerGantt({ plan, basePlan, sched, cal, closurePeriods, tl, pjs, sel, setSel, expanded, toggleExp, showLinks, view, readOnly, onPreview, onCommit, onError, onReorder, scrollRef, onScrollX, listW, onListW, testers, onInfo, rowH, onAddTask, maxH, showPrio = true, showSn = true }) {
  // v214 (demandé : « réduire la hauteur des lignes Arrivée, Production… ») : hauteur des lignes réglable (24 à 44 px)
  const ROW_H = Math.max(24, Math.min(44, Number(rowH) || 32)), BAR_H = Math.max(12, ROW_H - 10), BAR_T = (ROW_H - BAR_H) / 2, MID = ROW_H / 2;
  const cbRef = useRef({}); cbRef.current = { onInfo, onError };
  const { lo, px, W, X } = tl; const cols = colsWith(view, listW); const LEFT_W = cols.reduce((a, c) => a + c[1], 0);
  // v211 : lien en deux clics (« Lier » sur une tâche, puis clic sur la tâche qui suit) — plus fiable que le glisser
  const [linkFrom, setLinkFrom] = useState(null); const [linkDlg, setLinkDlg] = useState(null);
  useEffect(() => { if (!linkFrom) return undefined; const k = e => { if (e.key === "Escape") setLinkFrom(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [linkFrom]);
  const labOf = key => { const sp = splitKey(key), pp = plan.pjs.find(x => x.pj === sp.pj); return sp.pj + " · " + (pp ? stepLabel(pp, sp.step) : sp.step); };
  const pick = (pj, step) => {
    if (!linkFrom) { setSel({ pj, step }); return; }
    const to = nodeKey(pj, step), from = linkFrom; setLinkFrom(null); if (to === from) return;
    if (allLinks(base).some(l => !l.seq && l.from === from && l.to === to)) { onError("Ce lien existe déjà."); return; }
    go(addLink(base, { from, to, type: "FS", lag: 0 }), { pj, key: null, want: null }); setSel({ pj, step });
    if (onInfo) onInfo("Lien créé : « " + labOf(from) + " » → « " + labOf(to) + " » (fin → début). Cliquez la flèche pour changer son type ou son décalage.");
  };
  const resName = (p, k) => { const st = p.steps[k] || {}, r = st.res; if (!r || r === "atelier") return "atelier"; if (r === "testeur") return "testeur"; const t = (testers || []).find(x => x.id === r); return t ? t.name.split(" ")[0] : "testeur"; };
  // v211 (demandé : « me déplacer de gauche à droite avec le clic droit qui reste appuyé ») : clic droit (ou molette) maintenu = faire glisser la vue
  const panStart = e => {
    if (e.button !== 2 && e.button !== 1) return; const el = scrollRef && scrollRef.current; if (!el) return; e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, sl = el.scrollLeft, st = el.scrollTop; el.style.cursor = "grabbing";
    const mv = ev => { el.scrollLeft = sl - (ev.clientX - x0); el.scrollTop = st - (ev.clientY - y0); };
    const up = () => { el.style.cursor = ""; window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
  };
  const clampW = w => Math.max(LIST_W_MIN, Math.min(LIST_W_MAX, Math.round(w)));
  const startSplit = e => { e.preventDefault(); const x0 = e.clientX, w0 = LEFT_W; const mv = ev => onListW(clampW(w0 + ev.clientX - x0)); const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); }; window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up); }; const listOnly = view === "list" || view === "lanes";
  const base = basePlan || plan;
  const [qe, setQe] = useState(null); const [newKey, setNewKey] = useState(null); const [lk, setLk] = useState(null); const [le, setLe] = useState(null); const tlBody = useRef(null);
  const nums = useMemo(() => numberRows(plan), [plan]);
  const rules = rulesOf(plan);
  const rows = useMemo(() => {
    const out = []; let y = 0;
    pjs.forEach(p => { out.push({ type: "pj", p, y }); y += ROW_H; if (expanded.has(p.pj)) { stepKeysOf(p).forEach(k => { out.push({ type: "step", p, k, y }); y += ROW_H; }); out.push({ type: "add", p, y }); y += ROW_H; } });
    return { list: out, height: y };
  }, [pjs, expanded, ROW_H]);

  // étapes dont la date change par rapport au plan enregistré (aperçu d'un déplacement ou d'une proposition)
  const changed = useMemo(() => {
    const s = new Set(); if (!basePlan || basePlan === plan) return s;
    const a = scheduleOf(basePlan, cal); Object.keys(sched.nodes).forEach(k => { const x = a.nodes[k], y = sched.nodes[k]; if (x && y && x.s !== null && y.s !== null && (x.start !== y.start || x.finish !== y.finish)) s.add(k); });
    return s;
  }, [basePlan, plan, sched, cal]);

  const head = useMemo(() => headerCells(tl), [tl]);
  const posOf = useMemo(() => { const m = {}; ["prod", "banc"].forEach(res => { if (rules[res]) orderOf(plan, res).forEach((pj, i) => { m[res + ":" + pj] = i + 1; }); }); return m; }, [plan, rules.prod, rules.banc]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── glisser-déposer des barres ──
  const drag = useRef(null); const [dragging, setDragging] = useState(false); const tipRef = useRef(null); const [tip, setTip] = useState(null);
  useEffect(() => {
    if (!dragging) return;
    const move = e => {
      const d = drag.current; if (!d) return;
      if (tipRef.current) { tipRef.current.style.left = (e.clientX + 14) + "px"; tipRef.current.style.top = (e.clientY + 16) + "px"; }
      // v214 (demandé : « quand je tire entre 2 tâches, il ne se passe rien ») : tirer une barre vers le haut ou le bas = créer un lien
      if (d.kind === "move" && !d.linking && Math.abs(e.clientY - d.y0) > d.rowH * 0.7 && Math.abs(e.clientY - d.y0) > Math.abs(e.clientX - d.x0)) { d.linking = true; d.cand = null; d.dd = 0; onPreview(null); setTip("Lâchez sur la tâche qui doit suivre (lien fin → début)"); }
      if (d.linking) { follow(d, 0); return; }
      const dd = Math.round((e.clientX - d.x0) / px); follow(d, (e.clientX - d.x0) - dd * px); if (dd === d.dd) return; d.dd = dd;
      if (dd === 0) { d.cand = null; onPreview(null); return; }
      let cand = null;
      if (d.kind === "move") cand = moveStepTo(d.base, cal, d.pj, d.step, cal.dateOf(cal.idxOnOrAfter(isoOfDay(dayNum(d.node.start) + dd))));
      else if (d.kind === "resize") cand = setStep(d.base, d.pj, d.step, { dur: Math.max(1, cal.countBetween(d.node.start, isoOfDay(dayNum(d.node.finish) + dd))) });
      else if (d.kind === "pj") {
        const target = cal.dateOf(cal.idxOnOrAfter(isoOfDay(dayNum(d.startIso) + dd))); const wd = cal.idxOnOrAfter(target) - cal.idxOnOrAfter(d.startIso);
        cand = shiftPj(d.base, d.pj, wd, cal);
      }
      d.cand = cand; setTip(d.kind === "move" ? "début " + fmtIso(cal.dateOf(cal.idxOnOrAfter(isoOfDay(dayNum(d.node.start) + dd)))) : d.kind === "resize" ? Math.max(1, cal.countBetween(d.node.start, isoOfDay(dayNum(d.node.finish) + dd))) + " j ouvrés" : (dd > 0 ? "+" : "") + dd + " j calendaires"); onPreview(cand);
    };
    const up = e => {
      const d = drag.current; drag.current = null; setDragging(false); setTip(null); if (!d) return; settle(d);
      if (d.linking) {
        const el = document.elementFromPoint(e.clientX, e.clientY), tgt = el && el.closest && el.closest("[data-key]"), to = tgt && tgt.getAttribute("data-key"), from = nodeKey(d.pj, d.step), cb = cbRef.current;
        if (!to || to === from) { if (cb.onError) cb.onError("Lâchez sur une autre tâche (sa barre ou sa ligne) pour créer le lien."); return; }
        if (allLinks(d.base).some(l => !l.seq && l.from === from && l.to === to)) { if (cb.onError) cb.onError("Ce lien existe déjà."); return; }
        onCommit(addLink(d.base, { from, to, type: "FS", lag: 0 }), { pj: splitKey(to).pj, key: null, want: null });
        if (cb.onInfo) cb.onInfo("Lien créé : " + from.replace("|", " · ") + " → " + to.replace("|", " · ") + " (fin → début).");
        return;
      }
      if (d.dd && d.cand) { const want = d.kind === "move" ? cal.dateOf(cal.idxOnOrAfter(isoOfDay(dayNum(d.node.start) + d.dd))) : null; onCommit(d.cand, { pj: d.pj, key: want ? nodeKey(d.pj, d.step) : null, want }); } else onPreview(null);
    };
    const esc = e => { if (e.key === "Escape") { settle(drag.current); drag.current = null; setDragging(false); setTip(null); onPreview(null); } };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up); window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); window.removeEventListener("keydown", esc); };
  }, [dragging, px, cal, onPreview, onCommit]);
  const startDrag = (e, d) => { if (readOnly || e.button > 0) return; e.preventDefault(); e.stopPropagation(); drag.current = { ...d, x0: e.clientX, y0: e.clientY, rowH: ROW_H, dd: 0, base, el: d.kind === "resize" ? null : e.currentTarget }; setDragging(true); };
  // v356 (audit apple-design) : la barre reste collée au pointeur (reste entre deux jours en translateX), puis se pose en 150 ms
  const follow = (d, x) => { if (!d.el) return; d.el.style.transition = "none"; d.el.style.transform = x ? "translateX(" + x + "px)" : ""; };
  const settle = d => { if (!d || !d.el) return; const el = d.el; el.style.transition = "transform var(--e-dur-micro) var(--e-ease)"; el.style.transform = ""; };

  // ── nouvelle tâche libre ──
  const addTask = pj => { if (onAddTask) { onAddTask(pj); return; } addTaskRaw(pj); };
  const addTaskRaw = pj => { const r = addCustomStep(base, pj, "Nouvelle tâche"); if (!r.key) return; go(r.plan, { pj, key: null, want: null }); setNewKey(r.key); setTimeout(() => setNewKey(null), 700); setSel({ pj, step: splitKey(r.key).step }); if (!expanded.has(pj)) toggleExp(pj, true); };
  // ── création d'un lien en tirant depuis la poignée d'une barre vers une autre barre ──
  const lkRef = useRef(null); lkRef.current = lk; const geoRef = useRef(null); geoRef.current = { sched, X, px };
  useEffect(() => {
    if (!lk) return;
    const pos = e => { const r = tlBody.current ? tlBody.current.getBoundingClientRect() : { left: 0, top: 0 }; return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const move = e => setLk(s => s && { ...s, ...pos(e) });
    const up = e => {
      const s = lkRef.current; setLk(null); if (!s) return;
      const el = document.elementFromPoint(e.clientX, e.clientY); const tgt = el && el.closest && el.closest("[data-key]"); if (!tgt) return;
      const to = tgt.getAttribute("data-key"); if (!to || to === s.from) return;
      // v224 (demandé : « quand je tire un lien du rond d'une tâche au rond d'une autre, il ne se crée pas ») : les ronds et toute la
      // ligne de la tâche acceptent le lâcher ; rond de début = vers le début, rond de fin = vers la fin, sinon la moitié de la barre la plus proche.
      const side = tgt.getAttribute("data-side"); let left;
      if (side) left = side === "start";
      else { const g = geoRef.current, n = g.sched.nodes[to], body = tlBody.current; if (n && n.s !== null && body) { const x = e.clientX - body.getBoundingClientRect().left; left = x < g.X(n.start) + ((dayNum(n.finish) - dayNum(n.start) + 1) * g.px) / 2; } else { const b = tgt.getBoundingClientRect(); left = e.clientX < b.left + b.width / 2; } }
      const type = s.side === "end" ? (left ? "FS" : "FF") : (left ? "SS" : "SF");
      if (allLinks(base).some(l => !l.seq && l.from === s.from && l.to === to && l.type === type)) { onError("Ce lien existe déjà."); return; }
      go(addLink(base, { from: s.from, to, type, lag: 0 }), { pj: splitKey(to).pj, key: null, want: null });
      setSel({ pj: splitKey(to).pj, step: splitKey(to).step });
      const cb = cbRef.current; if (cb.onInfo) cb.onInfo("Lien créé : « " + labOf(s.from) + " » → « " + labOf(to) + " » (" + { FS: "fin → début", FF: "fin → fin", SS: "début → début", SF: "début → fin" }[type] + ").");
    };
    const esc = e => { if (e.key === "Escape") setLk(null); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up); window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); window.removeEventListener("keydown", esc); };
  }, [!!lk]); // eslint-disable-line
  const startLink = (e, key, side, x, y) => { if (readOnly) return; e.preventDefault(); e.stopPropagation(); setLk({ from: key, side, x, y, fx: x, fy: y }); };

  // ── liens ──
  const yOf = useMemo(() => { const m = {}; rows.list.forEach(r => { m[r.type === "pj" ? r.p.pj : nodeKey(r.p.pj, r.k)] = r.y + ROW_H / 2; }); return m; }, [rows, ROW_H]);
  const links = useMemo(() => {
    const all = allLinks(plan).filter(l => !l.seq).filter(l => showLinks || (sel && (splitKey(l.from).pj === sel.pj || splitKey(l.to).pj === sel.pj)));
    return all.map(l => {
      const a = sched.nodes[l.from], b = sched.nodes[l.to]; if (!a || !b || a.s === null || b.s === null) return null;
      const ya = yOf[l.from] != null ? yOf[l.from] : yOf[a.pj], yb = yOf[l.to] != null ? yOf[l.to] : yOf[b.pj]; if (ya == null || yb == null) return null;
      const fromEnd = l.type === "FS" || l.type === "FF", toStart = l.type === "FS" || l.type === "SS";
      const x1 = fromEnd ? (a.ms ? X(a.start) + px / 2 : X(a.finish) + px) : (a.ms ? X(a.start) + px / 2 : X(a.start));
      const x2 = toStart ? (b.ms ? X(b.start) + px / 2 : X(b.start)) : (b.ms ? X(b.start) + px / 2 : X(b.finish) + px);
      const hot = !!sel && (splitKey(l.from).pj === sel.pj || splitKey(l.to).pj === sel.pj);
      return { id: l.id, seq: !!l.seq, type: l.type, lag: l.lag, hot, x1, y1: ya, x2, y2: yb };
    }).filter(Boolean);
  }, [plan, sched, sel, showLinks, yOf, px, lo]); // eslint-disable-line react-hooks/exhaustive-deps
  const closures = (closurePeriods || []).map(c => ({ x: X(c.start), w: (dayNum(c.end || c.start) - dayNum(c.start) + 1) * px, label: c.label })).filter(c => c.x + c.w > 0 && c.x < W);

  // ── modifications dans le tableau ──
  const go = (np, info) => { if (np) onCommit(np, info || null); };
  const editStart = (p, k, v) => {
    if (!v) return; const iso = cal.dateOf(cal.idxOnOrAfter(v));
    const r = startAtKeepLinks(base, cal, p.pj, k, iso); // v258 : liens du PJ gardés (avance si besoin)
    if (r.blocked) onError("Impossible de commencer le " + fmtIso(iso) + " : " + r.blocked);
    go(r.plan, { pj: p.pj, key: nodeKey(p.pj, k), want: iso });
  };
  const editEnd = (p, k, n, v) => {
    if (!v) return; if (!n || n.s === null) { onError("Donnez d'abord une date de début."); return; }
    if (v < n.start) { onError("La fin ne peut pas précéder le début (" + fmtIso(n.start) + ")."); return; }
    go(setStep(base, p.pj, k, { dur: Math.max(1, cal.countBetween(n.start, v)) }), { pj: p.pj, key: null, want: null });
  };
  const editDur = (p, k, v) => { const d = Math.round(Number(String(v).replace(",", "."))); if (!(d >= 1)) { onError("La durée doit être d'au moins 1 jour ouvré."); return; } go(setStep(base, p.pj, k, { dur: d }), { pj: p.pj, key: null, want: null }); };
  const editWork = (p, k, v) => { const h = Number(String(v).replace(",", ".")); if (!(h >= 0)) { onError("Saisissez un nombre d'heures."); return; } go(setWork(base, p.pj, k, h), { pj: p.pj, key: null, want: null }); };
  const editPred = (p, k, v) => { const r = applyPredText(base, nodeKey(p.pj, k), v, cal); if (r.error) { onError(r.error); return; } go(r.plan, { pj: p.pj, key: null, want: null }); };

  // v263 (audit apple-design) : glisser maison pour la priorité et l'ordre des tâches ; la ligne entière suit la souris
  const dnd = usePointerDnD(), dropOn = dnd.over, dragPj = dnd.drag && dnd.drag.t === "pj" ? dnd.drag.pj : null, dragStep = dnd.drag && dnd.drag.t === "step" ? dnd.drag : null;

  const cell = (key, w, content, extra) => <div key={key} style={{ width: w, flex: "none", height: ROW_H, display: "flex", alignItems: "center", padding: "0 4px", boxSizing: "border-box", overflow: "hidden", ...extra }}>{content}</div>;

  const leftRow = r => {
    if (r.type === "add") return (<div key={"a" + r.p.pj} style={{ display: "flex", height: ROW_H, background: T.card, borderBottom: "1px solid " + T.line, alignItems: "center", paddingLeft: 66 }}>
      {!readOnly && <button className="pg-btn" onClick={() => addTask(r.p.pj)} aria-label={"Ajouter une tâche à " + r.p.pj} style={{...btn("sec","sm")}}>＋ Ajouter une tâche</button>}
    </div>);
    if (r.type === "pj") {
      const p = r.p; const on = sel && sel.pj === p.pj && !sel.step; const open = expanded.has(p.pj);
      const ns = stepKeysOf(p).map(k => sched.nodes[nodeKey(p.pj, k)]).filter(n => n && n.s !== null);
      const a = ns.length ? Math.min(...ns.map(n => dayNum(n.start))) : null, b = ns.length ? Math.max(...ns.map(n => dayNum(n.finish))) : null;
      const missing = STEP_KEYS.filter(k => !p.steps[k]); const idx = plan.pjs.indexOf(p);
      return (<div key={"p" + p.pj} className="pg-row" onClick={() => setSel({ pj: p.pj, step: null })} {...dnd.dropProps(p.pj, d => d.t === "pj" && d.pj !== p.pj, d => onReorder(d.pj, p.pj))}
        style={{ display: "flex", height: ROW_H, background: on ? T.teal100 : T.surface, borderBottom: "1px solid " + T.line, boxShadow: dropOn === p.pj && dragPj !== p.pj ? "inset 0 2px 0 " + T.teal500 : "none", fontWeight: 600 }}>
        {cols.map(([c, w]) => {
          if (c === "id") return cell(c, w, <span style={{ fontSize: 12, color: T.ink300, fontFamily: T.fontMono, width: "100%", textAlign: "center" }}>{nums.pjId[p.pj]}</span>);
          if (c === "name") return cell(c, w, <>
            {!readOnly && <span role="button" tabIndex={0} {...dnd.dragProps({ t: "pj", pj: p.pj }, { ghost: el => el.closest(".pg-row") })} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return; const q = plan.pjs[idx + (e.key === "ArrowDown" ? 1 : -1)]; if (q) { e.preventDefault(); onReorder(p.pj, q.pj); } }} aria-label={"Déplacer " + p.pj + " pour changer sa priorité (flèches haut / bas)"} title="Glisser pour changer la priorité (ou flèches haut / bas)" style={{ cursor: "grab", color: T.ink300, padding: "0 4px", fontSize: 13, letterSpacing: -2 }}>⋮⋮</span>}
            {/* v230 (demandé : « la priorité à gauche, et masquable comme le S/N ») */}
            {showPrio && <span onClick={e => e.stopPropagation()} style={{ display: "inline-flex", width: 34, flex: "none" }}><EditCell disabled={readOnly} type="number" align="center" value={p.prio != null ? p.prio : ""} onCommit={v => go(setPrio(base, p.pj, v), { pj: p.pj, key: null, want: null })} display={p.prio != null ? "P" + p.prio : "P–"} title={"Priorité des tâches de " + p.pj + " : plus le numéro est grand, plus elles passent en premier (vide = sans priorité)"} style={{ fontSize: 12, fontWeight: 500, color: p.prio != null ? T.teal600 : T.ink300, width: "100%" }} /></span>}
            <button aria-label={open ? "Replier " + p.pj : "Déplier " + p.pj} aria-expanded={open} onClick={e => { e.stopPropagation(); toggleExp(p.pj); }} className="pg-btn" style={{ width: 20, border: 0, background: "none", color: T.ink500, fontSize: 12, cursor: "pointer", padding: 0 }}>{open ? "▾" : "▸"}</button>
            <span style={{ fontFamily: T.fontMono, color: T.teal600, fontSize: 13 }}>{p.pj}</span>{showSn && <SerieTag pj={p.pj} size={9.5} />}
            <span style={{ fontSize: 12, color: T.ink500, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{p.nomProjet || ""}</span>
            {!readOnly && <Pop width={230} align="right" trigger={(o, t) => <button className="pg-btn pg-more" aria-label={"Actions pour " + p.pj} onClick={e => { e.stopPropagation(); t(); }} style={{ border: 0, background: "none", color: T.ink500, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 6px" }}>⋯</button>}>
              {close => (<>
                <MenuItem onClick={() => { close(); addTask(p.pj); }}>＋ Nouvelle tâche (libre)</MenuItem>
                {missing.map(k => <MenuItem key={k} onClick={() => { close(); go(setStep(base, p.pj, k, { dur: STEP_IS_MS[k] ? 0 : 5 }), { pj: p.pj, key: null, want: null }); toggleExp(p.pj, true); }}>＋ Ajouter l'étape « {STEP_LABEL[k]} »</MenuItem>)}
                <MenuItem disabled={idx === 0} onClick={() => { close(); onReorder(p.pj, plan.pjs[idx - 1].pj); }}>▲ Monter dans la priorité</MenuItem>
                <MenuItem disabled={idx === plan.pjs.length - 1} onClick={() => { close(); onReorder(p.pj, plan.pjs[idx + 1].pj); }}>▼ Baisser dans la priorité</MenuItem>
                <MenuItem onClick={() => { close(); go(setArchived(base, p.pj, !p.archived), null); if (!p.archived) setSel(null); }}>{p.archived ? "Sortir des archives" : "Archiver (garde ses dates, masqué du Gantt)"}</MenuItem>
                <MenuItem danger onClick={async () => { close(); if (await askConfirm({ title: "Retirer " + p.pj + " du plan ?", message: "Le planning actuel publié n'est pas modifié. Annuler (Ctrl + Z) reste possible.", confirmLabel: "Retirer du plan", danger: true })) { go(removePj(base, p.pj), null); setSel(null); } }}>Retirer ce PJ du plan</MenuItem>
              </>)}
            </Pop>}
          </>, { gap: 2 });
          if (c === "start") return cell(c, w, <span className="pl-mono" style={{ fontFamily: T.fontMono, fontSize: 12, padding: "0 4px" }}>{a != null ? fmtIso(isoOfDay(a)) : "—"}</span>);
          if (c === "end") return cell(c, w, <span style={{ fontFamily: T.fontMono, fontSize: 12, padding: "0 4px" }}>{b != null ? fmtIso(isoOfDay(b)) : "—"}</span>);
          if (c === "dur") return cell(c, w, <span style={{ fontFamily: T.fontMono, fontSize: 12, padding: "0 4px", width: "100%", textAlign: "right" }}>{a != null ? cal.countBetween(isoOfDay(a), isoOfDay(b)) + " j" : ""}</span>);
          if (c === "work") return cell(c, w, <span title={"Atelier " + Math.round(p.hAt || 0) + " h · Autom " + Math.round(p.hAu || 0) + " h"} style={{ fontFamily: T.fontMono, fontSize: 12, padding: "0 4px", width: "100%", textAlign: "right" }}>{Math.round(p.hAt || 0)} h</span>);
          return cell(c, w, null);
        })}
      </div>);
    }
    const p = r.p, k = r.k, key = nodeKey(p.pj, k), n = sched.nodes[key], ms = STEP_IS_MS[k]; const on = sel && sel.pj === p.pj && sel.step === k; const ch = changed.has(key);
    const rank = k === "production" ? posOf["prod:" + p.pj] : k === "tests" ? posOf["banc:" + p.pj] : null;
    const pinned = n && n.driver === "snet";
    const work = stepWork(p, k);
    return (<div key={key} data-key={key} className="pg-row" onClick={() => pick(p.pj, k)} {...dnd.dropProps(key, d => d.t === "step" && d.pj === p.pj && d.k !== k, d => go(moveStepOrder(base, p.pj, d.k, k), { pj: p.pj, key: null, want: null }))}
      style={{ boxShadow: dropOn === key && dragStep && dragStep.k !== k ? "inset 0 2px 0 " + T.teal500 : linkFrom === key ? "inset 0 0 0 2px " + T.teal500 : "none", cursor: linkFrom ? "crosshair" : undefined, display: "flex", height: ROW_H, background: on ? T.teal100 : T.card, borderBottom: "1px solid " + T.line, fontSize: 13 }}>
      {cols.map(([c, w]) => {
        if (c === "id") return cell(c, w, <span style={{ fontSize: 12, color: T.ink300, fontFamily: T.fontMono, width: "100%", textAlign: "center" }}>{nums.idOf[key]}</span>);
        if (c === "name") return cell(c, w, <>
          {!readOnly ? <span role="button" tabIndex={0} {...dnd.dragProps({ t: "step", pj: p.pj, k }, { ghost: el => el.closest(".pg-row") })} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return; const ks = stepKeysOf(p), j = ks.indexOf(k) + (e.key === "ArrowDown" ? 1 : -1); if (ks[j]) { e.preventDefault(); go(moveStepOrder(base, p.pj, k, ks[j]), { pj: p.pj, key: null, want: null }); } }} aria-label={"Déplacer la tâche " + stepLabel(p, k) + " dans la liste (flèches haut / bas)"} title="Glisser pour changer l'ordre des tâches (ou flèches haut / bas)" style={{ width: 12, flex: "none", cursor: "grab", color: T.ink300, fontSize: 12, marginLeft: 14 }}>⋮⋮</span> : <span style={{ width: 12, flex: "none" }} />}
          <span style={{ width: 9, height: 9, borderRadius: ms ? 2 : 3, transform: ms ? "rotate(45deg)" : "none", background: stepColor(p, k), flexShrink: 0, margin: "0 6px 0 8px" }} />
          {isCustomKey(k)
            ? <EditCell autoEdit={newKey === key} disabled={readOnly} value={stepLabel(p, k)} onCommit={v => { if (v.trim()) go(setStep(base, p.pj, k, { name: v.trim() }), { pj: p.pj, key: null, want: null }); }} display={stepLabel(p, k)} title="Cliquez pour renommer cette tâche" style={{ color: T.ink900, fontWeight: 600, width: "auto", maxWidth: 190, minWidth: 64, flexShrink: 0 }} />
            : <span style={{ color: T.ink900, fontWeight: 600, whiteSpace: "nowrap" }}>{STEP_LABEL[k]}</span>}
          {STEP_KIND[k] === "jalon" ? <span style={{ fontSize: 12, color: T.ink500, whiteSpace: "nowrap" }}>jalon</span>
            : <span style={{ fontSize: 12, color: T.ink500, whiteSpace: "nowrap", display: "inline-flex", gap: 4, alignItems: "center" }}>
              {/* v292 : la phase d'une tâche ajoutée se lit à la couleur de sa pastille (plus de « Production · » qui écrasait le nom) */}
              {k === "tests" ? <button type="button" className="pg-btn" disabled={readOnly} title="Banc d'essai (cliquer pour changer)" onClick={e => { e.stopPropagation(); go(setBench(base, cal, p.pj, benchOf(p) === 2 ? 1 : 2), { pj: p.pj, key: null, want: null }); }} style={{ border: "1px solid " + T.line, background: T.surface, color: T.ink700, borderRadius: 8, fontSize: 12, fontWeight: 500, padding: "0 5px", cursor: readOnly ? "default" : "pointer", lineHeight: "16px" }}>Banc {benchOf(p)}</button> : null}
              {readOnly ? <span>{resName(p, k)}</span> : <Pop width={240} align="left" trigger={(o, t) => <button type="button" className="pg-btn" aria-haspopup="menu" aria-expanded={o} onClick={e => { e.stopPropagation(); t(); }} title="Phase et ressource de la tâche" style={{ border: "1px dashed " + T.ink300, background: "transparent", color: T.ink700, borderRadius: 8, fontSize: 12, padding: "0 5px", cursor: "pointer", lineHeight: "16px", fontWeight: 500 }}>{resName(p, k)} ▾</button>}>
                {close => { const st = p.steps[k] || {}, defRes = k === "tests" || st.phase === "tests" ? "testeur" : "atelier", curRes = st.res || defRes; const info = { pj: p.pj, key: null, want: null };
                  const opts = [...(k === "tests" ? [] : [["atelier", "Atelier"]]), ["testeur", "Testeur (à désigner)"], ...(testers || []).map(t => [t.id, t.name])];
                  return (<>
                    {isCustomKey(k) && <><div style={{ fontSize: 12, fontWeight: 500, color: T.ink500, padding: "2px 12px 4px" }}>Phase</div>
                      {PHASES.map(([v, l]) => <MenuItem key={v} onClick={() => { close(); go(setStepMeta(base, p.pj, k, { phase: v, ...(v === "tests" && curRes === "atelier" ? { res: "testeur" } : {}) }), info); }}>{(st.phase === v ? "✓ " : "") + l}</MenuItem>)}</>}
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.ink500, padding: "6px 12px 4px" }}>Ressource</div>
                    {opts.map(([v, l]) => <MenuItem key={v} onClick={() => { close(); go(setStepMeta(base, p.pj, k, { res: v }), info); }}>{(curRes === v ? "✓ " : "") + l}</MenuItem>)}
                  </>); }}
              </Pop>}
            </span>}
          {rank ? <span title={"Ordre de passage : " + rank} style={{ fontSize: 12, fontWeight: 500, color: T.teal600, background: "rgba(46,125,154,.14)", borderRadius: 8, padding: "0 5px" }}>#{rank}</span> : null}
          <span style={{ flex: 1 }} />
          {!readOnly && <button className="pg-btn pg-more" aria-label={"Lier " + stepLabel(p, k) + " de " + p.pj + " à une autre tâche"} title="Lier à une autre tâche : cliquez ensuite la tâche qui doit suivre" onClick={e => { e.stopPropagation(); setLinkDlg(key); }} style={{...btn("sec","sm"),marginRight: 4}}>Lier</button>}
          {!readOnly && <button className="pg-btn pg-more" aria-label={"Supprimer l'étape " + stepLabel(p, k) + " de " + p.pj} title="Supprimer cette étape" onClick={async e => { e.stopPropagation(); if (await askConfirm({ title: "Supprimer l'étape « " + stepLabel(p, k) + " » de " + p.pj + " ?", message: "Ses liens sont supprimés aussi. Annuler (Ctrl + Z) reste possible.", confirmLabel: "Supprimer l'étape", danger: true })) go(removeStep(base, p.pj, k), { pj: p.pj, key: null, want: null }); }} style={{ border: 0, background: "none", color: T.red500, cursor: "pointer", fontSize: 13, padding: "0 6px" }}>✕</button>}
        </>, { gap: 2 });
        if (c === "start") return cell(c, w, <EditCell disabled={readOnly} type="date" value={n && n.s !== null ? n.start : ""} onCommit={v => editStart(p, k, v)} mono title={pinned ? "Date imposée : « pas avant ce jour »" : n && n.s !== null ? "Date calculée par un lien. Cliquez pour imposer une date." : "Pas de date : imposez-en une ou ajoutez un prédécesseur"}
          display={<>{n && n.s !== null ? fmtIso(n.start) : "—"}{n && n.snetIgnored && !String(n.driver || "").startsWith("seq:") ? <span title="La date imposée est antérieure à ce que permettent les liens : elle n'a pas d'effet" style={{ color: T.amber600 }}> ⚠</span> : null}</>} style={{ fontSize: 12, fontWeight: pinned ? 500 : 400, color: ch ? T.amber600 : pinned ? T.ink900 : T.ink500, background: ch ? T.amber100 : "transparent", borderRadius: 8 }} />);
        if (c === "end") return cell(c, w, ms ? <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.ink300, padding: "0 4px" }}>{n && n.s !== null ? fmtIso(n.start) : "—"}</span>
          : <EditCell disabled={readOnly} type="date" value={n && n.s !== null ? n.finish : ""} onCommit={v => editEnd(p, k, n, v)} mono display={n && n.s !== null ? fmtIso(n.finish) : "—"} title="Cliquez pour changer la date de fin (modifie la durée)" style={{ fontSize: 12, color: ch ? T.amber600 : T.ink500, background: ch ? T.amber100 : "transparent", borderRadius: 8 }} />);
        if (c === "dur") return cell(c, w, ms ? <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.ink300, width: "100%", textAlign: "right", padding: "0 4px" }}>0 j</span>
          : <EditCell disabled={readOnly} type="number" align="right" placeholder="j" value={n && !n.noDur ? n.dur : ""} onCommit={v => editDur(p, k, v)} mono display={n && !n.noDur ? n.dur + " j" : "—"} title="Durée en jours ouvrés" style={{ fontSize: 12, width: "100%" }} />);
        if (c === "work") return cell(c, w, work == null ? null : <EditCell disabled={readOnly} type="number" align="right" value={work} onCommit={v => editWork(p, k, v)} mono display={Math.round(work) + " h"} title={k === "tests" ? "Heures Autom du PJ (non limitées par la capacité atelier)" : "Heures atelier de cette tâche (comptées dans la charge)"} style={{ fontSize: 12, width: "100%", color: k === "tests" ? T.ink500 : T.ink900 }} />);
        const txt = predText(plan, nums.idOf, key); const auto = allLinks(plan).filter(l => l.seq && l.to === key && nums.idOf[l.from] != null).map(l => nums.idOf[l.from]);
        return cell(c, w, <EditCell disabled={readOnly} value={txt} placeholder="ex. 2 ; 7SS+3j" onCommit={v => editPred(p, k, v)} mono title={"Numéros de ligne, type FS (défaut) SS FF SF, décalage en jours ouvrés. Exemple : 2 ; 7SS+3j" + (auto.length ? "\nOrdre de passage automatique après la ligne " + auto.join(", ") : "")}
          display={<>{txt || <span style={{ color: T.ink300 }}>—</span>}{auto.length ? <span style={{ color: T.teal600, fontSize: 12 }}> ↻{auto.join(",")}</span> : null}</>} style={{ fontSize: 12, width: "100%" }} />);
      })}
    </div>);
  };

  return (<div ref={scrollRef} onScroll={e => onScrollX && onScrollX(e.currentTarget.scrollLeft)} onMouseDown={panStart} onContextMenu={e => e.preventDefault()} style={{ overflow: "auto", maxHeight: "calc(100dvh - " + (maxH || 430) + "px)", minHeight: 260, position: "relative", userSelect: dragging ? "none" : "auto", cursor: dragging ? "grabbing" : "default" }}>
    <div style={{ display: "flex", minWidth: "min-content" }}>
      {/* tableau */}
      <div style={{ width: listOnly ? "100%" : LEFT_W, minWidth: LEFT_W, flexShrink: 0, position: "sticky", left: 0, zIndex: 6, background: T.card, borderRight: "2px solid " + T.line }}>
        <div style={{ height: HEAD_H, position: "sticky", top: 0, zIndex: 7, background: T.surface, borderBottom: "1px solid " + T.line, display: "flex", alignItems: "flex-end" }}>
          {cols.map(([c, w]) => <div key={c} style={{ width: w, flex: "none", padding: "0 8px 8px", fontSize: 12, fontWeight: 500, color: T.ink500, textAlign: c === "dur" || c === "work" ? "right" : "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box" }}>{HEAD_LABEL[c]}</div>)}
        </div>
        {rows.list.map(leftRow)}
        {view === "both" && onListW && <div role="separator" aria-orientation="vertical" aria-label="Largeur de la liste : glisser, ou flèches gauche / droite" aria-valuenow={LEFT_W} aria-valuemin={LIST_W_MIN} aria-valuemax={LIST_W_MAX} tabIndex={0} className="pg-split" title="Glisser pour élargir ou réduire la liste (double-clic : largeur normale)"
          onMouseDown={startSplit} onDoubleClick={() => onListW(null)} onKeyDown={e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); onListW(clampW(LEFT_W + (e.key === "ArrowRight" ? 40 : -40))); } }}
          style={{ position: "absolute", top: 0, bottom: 0, right: -6, width: 10, cursor: "col-resize", zIndex: 9 }} />}
        {rows.list.length === 0 && <div style={{ padding: 16, color: T.ink500, fontSize: 13 }}>Aucun PJ ne correspond.</div>}
      </div>
      {/* frise */}
      {!listOnly && <div style={{ width: W, flexShrink: 0, position: "relative" }}>
        <div style={{ height: HEAD_H, position: "sticky", top: 0, zIndex: 5, background: T.surface, borderBottom: "1px solid " + T.line }}>
          {head.top.map((m, i) => <div key={i} style={{ position: "absolute", left: m.x, width: m.w, top: 0, height: HEAD_H / 2, borderLeft: "1px solid " + T.line, padding: "6px 8px", fontSize: 12, fontWeight: 500, color: T.ink700, whiteSpace: "nowrap", overflow: "hidden", boxSizing: "border-box" }}>{m.w > 70 ? m.label : ""}</div>)}
          {head.bottom.map((m, i) => <div key={i} style={{ position: "absolute", left: m.x, width: m.w, top: HEAD_H / 2, height: HEAD_H / 2, borderLeft: "1px solid " + T.line, display: "flex", flexDirection: tl.zoom === "day" ? "column" : "row", alignItems: "center", justifyContent: tl.zoom === "day" ? "center" : "flex-start", paddingLeft: tl.zoom === "day" ? 0 : 6, fontSize: 12, color: m.we ? T.ink300 : T.ink500, fontWeight: m.cur || m.today ? 500 : 500, background: m.cur ? T.teal100 : "transparent", boxSizing: "border-box", overflow: "hidden", lineHeight: 1.1 }}>
            {tl.zoom === "day" && <span style={{ fontSize: 12, color: T.ink300 }}>{m.sub}</span>}<span style={m.today ? { background: T.teal500, color: T.onFill, borderRadius: 999, padding: "0 5px" } : undefined}>{m.label}</span></div>)}
        </div>
        <div ref={tlBody} onClick={e => { if (e.target === e.currentTarget) setSel(null); }} style={{ position: "relative", height: rows.height }}>
          {px >= 8 && head.bottom.length > 0 && Array.from({ length: Math.ceil((tl.hi - lo + 1) / 7) }, (_, i) => <div key={"we" + i} style={{ position: "absolute", left: (i * 7 + 5) * px, width: 2 * px, top: 0, bottom: 0, background: "rgba(120,120,120,.07)", pointerEvents: "none" }} />)}
          {closures.map((c, i) => <div key={i} title={c.label} style={{ position: "absolute", left: c.x, width: c.w, top: 0, bottom: 0, background: "rgba(193,131,30,.14)", pointerEvents: "none" }} />)}
          {head.bottom.map((m, i) => <div key={"g" + i} style={{ position: "absolute", left: m.x, top: 0, bottom: 0, width: 1, background: T.line, opacity: tl.zoom === "day" ? 0.5 : 0.8, pointerEvents: "none" }} />)}
          <div title="Aujourd'hui" style={{ position: "absolute", left: (tl.today - lo) * px + px / 2 - 1, top: 0, bottom: 0, width: 2, background: T.red500, opacity: 0.7, zIndex: 3, pointerEvents: "none" }} />
          {rows.list.map(r => {
            const rowStyle = { position: "absolute", left: 0, right: 0, top: r.y, height: ROW_H, borderBottom: "1px solid " + T.line, boxSizing: "border-box", background: sel && sel.pj === r.p.pj && (r.type === "pj" ? !sel.step : sel.step === r.k) ? "rgba(120,160,200,.12)" : "transparent" };
            if (r.type === "add") return <div key={"a" + r.p.pj} style={rowStyle} />;
            if (r.type === "pj") {
              const ns = stepKeysOf(r.p).map(k => sched.nodes[nodeKey(r.p.pj, k)]).filter(n => n && n.s !== null);
              if (!ns.length) return <div key={"p" + r.p.pj} style={rowStyle} />;
              const a = Math.min(...ns.map(n => dayNum(n.start))), b = Math.max(...ns.map(n => dayNum(n.finish))); const startIso = isoOfDay(a); const on = sel && sel.pj === r.p.pj;
              return (<div key={"p" + r.p.pj} style={rowStyle}>
                <div title={r.p.pj + " : " + fmtIso(startIso) + " → " + fmtIso(isoOfDay(b)) + (readOnly ? "" : "\nGlisser pour décaler tout le PJ")} data-dnd-drag="1" onPointerDown={e => startDrag(e, { kind: "pj", pj: r.p.pj, startIso })} onClick={() => setSel({ pj: r.p.pj, step: null })}
                  style={{ position: "absolute", left: X(startIso), width: Math.max(px, (b - a + 1) * px), top: MID - 3, height: 6, borderRadius: 4, background: on ? T.ink700 : T.ink300, cursor: readOnly ? "default" : "grab" }} />
                <span aria-hidden="true" style={{ position: "absolute", left: X(isoOfDay(b)) + px + 16, top: MID - 9, fontSize: 12, fontWeight: 500, color: T.ink900, whiteSpace: "nowrap", pointerEvents: "none" }}>{r.p.pj}{r.p.nomProjet ? <span style={{ fontWeight: 500, color: T.ink500 }}> · {r.p.nomProjet}</span> : null}</span>
                {ns.filter(n => n.ms).map(n => <span key={n.step} style={{ position: "absolute", left: X(n.start) + px / 2 - 6, top: MID - 6, width: 12, height: 12, transform: "rotate(45deg)", background: STEP_COLOR[n.step], border: "1px solid #fff", pointerEvents: "none" }} />)}
              </div>);
            }
            const key = nodeKey(r.p.pj, r.k), n = sched.nodes[key]; const on = sel && sel.pj === r.p.pj && sel.step === r.k; const ch = changed.has(key);
            if (!n || n.s === null) return <div key={key} style={{ ...rowStyle, cursor: readOnly ? "default" : "crosshair" }} title={readOnly ? undefined : "Cliquez ici pour placer la tâche à cette date"} onClick={e => { if (readOnly || !tlBody.current) return; const b = tlBody.current.getBoundingClientRect(); const d = lo + Math.floor((e.clientX - b.left) / px); editStart(r.p, r.k, isoOfDay(d)); setSel({ pj: r.p.pj, step: r.k }); }} />;
            const col = stepColor(r.p, r.k); const pinned = n.driver === "snet";
            const bw = (dayNum(n.finish) - dayNum(n.start) + 1) * px, lab = r.p.pj + " · " + stepLabel(r.p, r.k), fits = !n.ms && bw >= lab.length * 6.4 + 16;
            const tipTxt = r.p.pj + " · " + stepLabel(r.p, r.k) + "\n" + fmtIso(n.start) + (n.ms ? "" : " → " + fmtIso(n.finish) + " (" + n.dur + " j ouvrés)") + (pinned ? "\nDate imposée" : n.driver ? "\nCalée par un lien" : "") + (readOnly ? "" : "\nGlisser pour déplacer");
            return (<div key={key} style={rowStyle} className="pg-trow" data-key={key}>
              {n.ms
                ? <div title={tipTxt} data-dnd-drag="1" onPointerDown={e => startDrag(e, { kind: "move", pj: r.p.pj, step: r.k, node: n })} onClick={() => pick(r.p.pj, r.k)} onDoubleClick={e => { if (!readOnly) setQe({ pj: r.p.pj, step: r.k, x: e.clientX, y: e.clientY }); }} data-key={key} className="pg-bar"
                    style={{ position: "absolute", left: X(n.start) + px / 2 - 8, top: MID - Math.min(8, BAR_H / 2), width: Math.min(16, BAR_H), height: Math.min(16, BAR_H), transform: "rotate(45deg)", background: col, border: on ? "2px solid " + T.ink900 : "1px solid #fff", outline: ch ? "2px dashed #E08A00" : "none", outlineOffset: 2, boxSizing: "border-box", cursor: readOnly ? "default" : "grab", borderRadius: 4 }} />
                : <div title={tipTxt} data-dnd-drag="1" onPointerDown={e => startDrag(e, { kind: "move", pj: r.p.pj, step: r.k, node: n })} onClick={() => pick(r.p.pj, r.k)} onDoubleClick={e => { if (!readOnly) setQe({ pj: r.p.pj, step: r.k, x: e.clientX, y: e.clientY }); }} data-key={key} className="pg-bar"
                    style={{ position: "absolute", left: X(n.start), width: Math.max(px, (dayNum(n.finish) - dayNum(n.start) + 1) * px), top: BAR_T, height: BAR_H, borderRadius: 4, background: col, outline: on ? "2px solid " + T.ink900 : ch ? "2px dashed #E08A00" : "none", outlineOffset: 1, cursor: readOnly ? "default" : "grab", display: "flex", alignItems: "center", justifyContent: "center", color: inkOn(col), fontSize: 12, fontWeight: 500, overflow: "hidden", boxSizing: "border-box" }}>
                    {fits ? <span style={{ pointerEvents: "none", padding: "0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lab}</span> : bw >= 40 ? <span style={{ pointerEvents: "none", fontFamily: T.fontMono }}>{n.noDur ? "?" : n.dur + " j"}</span> : null}
                    {!readOnly && <div onPointerDown={e => startDrag(e, { kind: "resize", pj: r.p.pj, step: r.k, node: n })} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 7, cursor: "ew-resize", background: "rgba(0,0,0,.25)" }} />}
                  </div>}
              {!readOnly && (() => { const xs = n.ms ? X(n.start) + px / 2 - 20 : X(n.start) - 16, xe = n.ms ? X(n.start) + px / 2 + 12 : X(n.finish) + px + 4; const cy = r.y + ROW_H / 2;
                const H = (x, side, label) => <span role="button" aria-label={label} title={label} className={"pg-h" + (lk || on || linkFrom ? " on" : "")} data-key={key} data-side={side} onMouseDown={e => startLink(e, key, side, x + 6, cy)} style={{ position: "absolute", left: x - 1, top: MID - 7, width: 14, height: 14, borderRadius: 8, border: "2px solid " + T.accentInk, background: T.card, cursor: "crosshair", boxSizing: "border-box" }} />;
                return <>{H(xs, "start", "Tirer vers une autre tâche pour créer un lien depuis le début (SS / SF)")}{H(xe, "end", "Tirer vers une autre tâche pour créer un lien depuis la fin (FS / FF)")}</>; })()}
              {!fits && <span aria-hidden="true" style={{ position: "absolute", left: n.ms ? X(n.start) + px / 2 + 26 : X(n.finish) + px + 22, top: MID - 8, fontSize: 12, fontWeight: 500, color: T.ink900, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 2 }}>{lab}{!n.ms && !n.noDur ? <span style={{ color: T.ink500, fontWeight: 400 }}> · {n.dur} j</span> : null}</span>}
              {n.off && [...n.off].map(i => <span key={"off" + i} title={"Pas de production le " + fmtIso(cal.dateOf(i))} aria-hidden="true" style={{ position: "absolute", left: X(cal.dateOf(i)), width: Math.max(2, px), top: BAR_T, height: BAR_H, zIndex: 2, pointerEvents: "none", background: T.surface, backgroundImage: "repeating-linear-gradient(135deg," + T.line + " 0 2px,transparent 2px 5px)" }} />)}
              {pinned && !n.ms && <span title="Date imposée" aria-hidden="true" style={{ position: "absolute", left: X(n.start) - 10, top: MID - 3, width: 6, height: 6, borderRadius: 4, background: T.ink700, pointerEvents: "none" }} />}
            </div>);
          })}
          <svg width={W} height={rows.height} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 4 }} aria-hidden="true">
            <defs><marker id="pg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={T.ink500} /></marker><marker id="pg-arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={T.red500} /></marker><marker id="pg-arrow-seq" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={T.teal600} /></marker></defs>
            {links.map(l => !l.seq && !readOnly ? <path key={"h" + l.id} d={"M" + l.x1 + "," + l.y1 + " H" + (l.x1 + 7) + " V" + l.y2 + " H" + l.x2} fill="none" stroke="transparent" strokeWidth={12} style={{ pointerEvents: "stroke", cursor: "pointer" }} onClick={e => setLe({ id: l.id, x: e.clientX, y: e.clientY })}><title>Cliquer pour modifier ou supprimer ce lien</title></path> : null)}
            {lk && <><path d={"M" + lk.fx + "," + lk.fy + " L" + lk.x + "," + lk.y} stroke={T.accentInk} strokeWidth={2} strokeDasharray="5 3" fill="none" /><circle cx={lk.x} cy={lk.y} r={4} fill={T.accentInk} /></>}
            {links.map(l => <path key={l.id} d={"M" + l.x1 + "," + l.y1 + " H" + (l.x1 + 7) + " V" + l.y2 + " H" + l.x2} fill="none" stroke={l.seq ? T.teal600 : l.hot ? T.red500 : T.ink500} strokeWidth={l.hot ? 1.8 : 1.2} strokeDasharray={l.seq ? "5 3" : undefined} markerEnd={l.seq ? "url(#pg-arrow-seq)" : l.hot ? "url(#pg-arrow-hot)" : "url(#pg-arrow)"} opacity={l.hot || !sel ? 0.9 : 0.35} />)}
          </svg>
        </div>
      </div>}
    </div>
    {qe && (() => { const p = plan.pjs.find(x => x.pj === qe.pj); const key = nodeKey(qe.pj, qe.step), n = sched.nodes[key]; if (!p || !n) return null; const w = stepWork(p, qe.step);
      return <QuickEdit at={qe} title={qe.pj + " · " + stepLabel(p, qe.step)} ms={n.ms} canWork={w != null} vals={{ start: n.s !== null ? n.start : "", dur: n.noDur ? "" : String(n.dur), work: w != null ? String(Math.round(w)) : "", pred: predText(plan, nums.idOf, key) }}
        onStart={v => editStart(p, qe.step, v)} onDur={v => editDur(p, qe.step, v)} onWork={v => editWork(p, qe.step, v)} onPred={v => editPred(p, qe.step, v)} onClose={() => setQe(null)} />; })()}
    {le && (() => { const l = allLinks(base).find(x => x.id === le.id); if (!l) return null; const lab = k => { const s = splitKey(k); const pp = plan.pjs.find(x => x.pj === s.pj); return s.pj + " · " + (pp ? stepLabel(pp, s.step) : s.step); };
      return <LinkEdit at={le} link={l} from={lab(l.from)} to={lab(l.to)} onType={t => go(updateLink(base, l.id, { type: t }), { pj: splitKey(l.to).pj, key: null, want: null })} onLag={v => go(updateLink(base, l.id, { lag: Math.round(Number(v)) || 0 }), { pj: splitKey(l.to).pj, key: null, want: null })} onDelete={() => { setLe(null); go(removeLink(base, l.id), { pj: splitKey(l.to).pj, key: null, want: null }); }} onClose={() => setLe(null)} />; })()}
    {linkDlg && <LinkDialog nodeKey_={linkDlg} plan={plan} base={base} pjs={pjs} onClose={() => setLinkDlg(null)} onPick={() => { setLinkFrom(linkDlg); setLinkDlg(null); }}
      onAdd={(from, to, type, lag) => { if (from === to) return; if (allLinks(base).some(l => !l.seq && l.from === from && l.to === to)) { onError("Ce lien existe déjà."); return; } go(addLink(base, { from, to, type, lag: Math.round(Number(lag) || 0) }), { pj: splitKey(to).pj, key: null, want: null }); if (onInfo) onInfo("Lien créé : « " + labOf(from) + " » → « " + labOf(to) + " ».");}}
      onRemove={id => go(removeLink(base, id), null)} labOf={labOf} />}
    {linkFrom && <div role="status" style={{ position: "fixed", left: "50%", top: 84, transform: "translateX(-50%)", zIndex: 10005, background: T.ink900, color: T.card, borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 500, boxShadow: T.shadowLg, display: "flex", gap: 10, alignItems: "center" }}>
      Cliquez la tâche (ligne ou barre) qui doit suivre « {labOf(linkFrom)} »
      <button type="button" onClick={() => setLinkFrom(null)} style={{ border: "1px solid " + T.card, background: "transparent", color: T.card, borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}>Annuler</button>
    </div>}
    {dragging && tip && <div ref={tipRef} style={{ position: "fixed", left: 0, top: 0, zIndex: 10001, background: T.ink900, color: T.card, borderRadius: 8, padding: "3px 8px", fontSize: 12, fontWeight: 500, pointerEvents: "none" }}>{tip}</div>}
  </div>);
}

// v221 (demandé : « le système de lien n'est pas simple à prendre en main ») : liens d'une tâche choisis dans des listes —
// « commence après » (prédécesseur) et « doit être finie avant » (successeur), type et décalage ; liens existants supprimables.
const LTYPES = [["FS", "fin → début"], ["SS", "début → début"], ["FF", "fin → fin"], ["SF", "début → fin"]];
function LinkDialog({ nodeKey_, plan, base, pjs, onClose, onAdd, onRemove, onPick, labOf }) {
  const [pred, setPred] = useState(""), [succ, setSucc] = useState(""), [type, setType] = useState("FS"), [lag, setLag] = useState("0");
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const list = (pjs && pjs.length ? pjs : plan.pjs);
  const opts = <>{list.map(p => <optgroup key={p.pj} label={p.pj + (p.nomProjet ? " · " + p.nomProjet : "")}>{stepKeysOf(p).map(k => { const key = nodeKey(p.pj, k); return key === nodeKey_ ? null : <option key={key} value={key}>{p.pj + " · " + stepLabel(p, k)}</option>; })}</optgroup>)}</>;
  const mine = allLinks(base).filter(l => !l.seq && (l.from === nodeKey_ || l.to === nodeKey_));
  const L = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 500, color: T.ink700 };
  const sel = { height: 34, border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, fontSize: 13, padding: "0 8px", fontFamily: T.font };
  const ok = () => { if (pred) onAdd(pred, nodeKey_, type, lag); if (succ) onAdd(nodeKey_, succ, type, lag); setPred(""); setSucc(""); };
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,.45)", zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label={"Liens de " + labOf(nodeKey_)} onClick={e => e.stopPropagation()} style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(560px,100%)", maxHeight: "88dvh", overflow: "auto", padding: "16px 18px", fontFamily: T.font }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 20 }}>Liens · {labOf(nodeKey_)}</div>
      <div style={{ fontSize: 13, color: T.ink500, margin: "4px 0 12px" }}>Choisissez la tâche qui doit passer avant, ou celle qui attend la fin de celle-ci. Les dates se recalculent aussitôt.</div>
      <div style={{ display: "grid", gap: 10 }}>
        <label style={L}>Commence après…<select value={pred} onChange={e => setPred(e.target.value)} style={sel}><option value="">— aucune —</option>{opts}</select></label>
        <label style={L}>Doit être finie avant…<select value={succ} onChange={e => setSucc(e.target.value)} style={sel}><option value="">— aucune —</option>{opts}</select></label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label style={{ ...L, flex: "1 1 200px" }}>Type<select value={type} onChange={e => setType(e.target.value)} style={sel}>{LTYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label style={{ ...L, width: 140 }}>Décalage (j ouvrés)<input type="number" value={lag} onChange={e => setLag(e.target.value)} style={sel} /></label>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" disabled={!pred && !succ} onClick={ok} style={{ border: "none", borderRadius: 8, padding: "8px 14px", background: pred || succ ? T.ink900 : T.surfaceAlt, color: pred || succ ? T.card : T.ink500, fontWeight: 600, cursor: pred || succ ? "pointer" : "default", minHeight: 34 }}>Créer le lien</button>
        <button className="e-btn e-btn-sec" type="button" onClick={onPick} style={{...btn("sec","md")}}>Ou cliquer la tâche suivante dans le Gantt</button>
        <button type="button" onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minHeight: 34 }}>Fermer</button>
      </div>
      <div style={{ borderTop: "1px solid " + T.line, marginTop: 14, paddingTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.ink700, marginBottom: 6 }}>Liens de cette tâche ({mine.length})</div>
        {mine.length === 0 && <div style={{ fontSize: 13, color: T.ink500 }}>Aucun lien pour l'instant.</div>}
        {mine.map(l => <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0", minHeight: 30 }}>
          <span style={{ flex: 1, minWidth: 0 }}>{labOf(l.from)} <span style={{ color: T.ink500 }}>→</span> {labOf(l.to)} <span style={{ color: T.ink500, fontSize: 12 }}>({(LTYPES.find(t => t[0] === l.type) || LTYPES[0])[1]}{l.lag ? ", " + (l.lag > 0 ? "+" : "") + l.lag + " j" : ""})</span></span>
          <button className="e-btn e-btn-sec" type="button" onClick={() => onRemove(l.id)} aria-label="Supprimer ce lien" style={{...btn("sec","sm")}}>Supprimer</button>
        </div>)}
      </div>
    </div>
  </div>);
}
