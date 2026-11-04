import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { T } from "../theme";
import { STEP_LABEL, nodeKey, dayNum, isoOfDay, moveStepTo, setStep, orderOf, rulesOf, schedule, benchOf, stepWork, setWork, startAtKeepLinks, startReason } from "./engine";
import { fmtIso, STEP_COLOR, headerCells } from "./PlannerGantt";

// Vue « Couloirs » : le planning lu comme un atelier. Deux rails de jalons (Arrivées en haut, Départs en bas) encadrent
// trois couloirs de travail (Production, Banc d'essai, Fin de production). Même échelle de temps que le Gantt, défilement
// horizontal libre (molette + Maj, glisser le fond, boutons ‹ ›), mise en page dense pour voir beaucoup de PJ à la fois.
const FONT = T.font, MONO = T.fontMono; // v208 : polices du site (Roboto réservé aux rapports imprimés)
// v208 : couleurs lues dans le thème à chaque rendu (clair / sombre) — plus de palette claire figée
const pal = () => ({ bg: T.card, panel: T.surface, line: T.line, line2: T.line, ink: T.ink900, ink2: T.ink700, ink3: T.ink500, accent: T.teal600, bad: T.red500, warn: T.amber600, ok: T.emerald600 });
export const LABEL_W = 148;

// v254 (demandé : « en mode couloirs, cliquer sur la tâche et ouvrir un pop-up où modifier les dates, la durée et la charge ») :
// début (date imposée « pas avant »), fin ou durée en jours ouvrés, et heures de la tâche (Production, Packing : heures atelier ;
// Banc : heures d'essai). « Appliquer » passe par les mêmes opérations que le glisser-déposer (moveStepTo, setStep, setWork).
function StepDialog({ it, step, plan, cal, onApply, onClose }) {
  const C = pal(); const n = it.n; const ms = step === "arrivee" || step === "depart";
  const p = plan.pjs.find(x => x.pj === it.pj); const w0 = p ? stepWork(p, step) : null;
  const [start, setStart] = useState(n.start), [dur, setDur] = useState(n.dur), [end, setEnd] = useState(n.finish), [work, setWorkV] = useState(w0 == null ? "" : String(w0));
  const [free, setFree] = useState(false), [err, setErr] = useState("");
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const onEnd = v => { setEnd(v); if (v && start && v >= start) setDur(Math.max(1, cal.countBetween(start, v))); };
  const onDur = v => { const d = Math.max(1, Math.round(Number(v) || 1)); setDur(d); if (start) setEnd(cal.addWork(cal.dateOf(cal.idxOnOrAfter(start)), d - 1)); };
  const onStart = v => { setStart(v); if (v && !ms) setEnd(cal.addWork(cal.dateOf(cal.idxOnOrAfter(v)), Math.max(1, dur) - 1)); };
  const apply = () => {
    let np = plan;
    if (free) np = setStep(np, it.pj, step, { snet: null });
    else if (start && start !== n.start) {
      // v258 : le début choisi est respecté en gardant les liens du PJ (avance sur le lien si besoin)
      const r = startAtKeepLinks(np, cal, it.pj, step, cal.dateOf(cal.idxOnOrAfter(start)));
      if (r.blocked) { setErr("Impossible de commencer le " + fmtIso(start) + " : " + r.blocked); return; }
      np = r.plan;
    }
    if (!ms && dur && dur !== n.dur) np = setStep(np, it.pj, step, { dur: Math.max(1, dur) });
    if (w0 != null && work !== "" && Number(work) !== w0) np = setWork(np, it.pj, step, Number(work));
    onApply(np, { pj: it.pj, key: !free && start !== n.start ? it.key : null, want: !free && start !== n.start ? cal.dateOf(cal.idxOnOrAfter(start)) : null });
  };
  const fld = { padding: "6px 8px", minHeight: 32, border: "1px solid " + C.line, borderRadius: 6, background: C.bg, color: C.ink, fontFamily: FONT, fontSize: 13, boxSizing: "border-box", width: "100%" };
  const lab = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: C.ink3 };
  const btn = primary => ({ minHeight: 34, padding: "0 14px", borderRadius: 6, border: primary ? "none" : "1px solid " + C.line, background: primary ? C.ink : C.bg, color: primary ? C.bg : C.ink2, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT });
  const unit = step === "tests" ? "heures d'essai" : "heures atelier";
  // rendu dans <body> : à l’intérieur de la zone qui défile du planificateur, la fenêtre se plaçait hors de l’écran
  return createPortal(<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10005, background: "rgba(8,12,28,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label={"Modifier " + it.pj + " · " + STEP_LABEL[step]} style={{ width: "min(420px,100%)", background: C.bg, color: C.ink, border: "1px solid " + C.line, borderRadius: 10, boxShadow: T.shadowLg, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid " + C.line }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: STEP_COLOR[step], flex: "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 15 }}><span style={{ fontFamily: MONO }}>{it.pj}</span> · {STEP_LABEL[step]}</div>
          <div style={{ fontSize: 12, color: C.ink3 }}>Actuellement : {fmtIso(n.start)}{ms ? "" : " → " + fmtIso(n.finish) + " · " + n.dur + " j ouvrés"}{w0 != null ? " · " + w0 + " h" : ""}</div>
          <div style={{ fontSize: 12, color: n.snet ? C.ink : C.ink3, marginTop: 2 }}>{n.snet ? "📌 " : ""}{startReason(plan, n)}</div></div>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{ ...btn(false), padding: "0 10px" }}>×</button>
      </div>
      <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: ms ? "1fr" : "1fr 1fr", gap: 12 }}>
        <label style={lab}>{ms ? "Date" : "Début"}<input type="date" value={start || ""} disabled={free} onChange={e => { onStart(e.target.value); setErr(""); }} style={fld} /></label>
        {!ms && <label style={lab}>Fin<input type="date" value={end || ""} min={start || undefined} onChange={e => onEnd(e.target.value)} style={fld} /></label>}
        {!ms && <label style={lab}>Durée (jours ouvrés)<input type="number" min={1} step={1} value={dur} onChange={e => onDur(e.target.value)} style={fld} /></label>}
        {w0 != null && <label style={lab}>Charge ({unit})<input type="number" min={0} step={0.5} value={work} onChange={e => setWorkV(e.target.value)} style={fld} /></label>}
        {!ms && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: C.ink3, lineHeight: 1.45 }}>Le début choisi est respecté et les liens du PJ sont gardés : plus tard, il devient la date imposée ; plus tôt, le lien qui la repousse prend une avance.</div>}
        {n.snet && <label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink2 }}><input type="checkbox" checked={free} onChange={e => setFree(e.target.checked)} />Libérer la date imposée du {fmtIso(n.snet)} (la tâche suit de nouveau ses liens)</label>}
        {err && <div role="alert" style={{ gridColumn: "1 / -1", fontSize: 12.5, fontWeight: 600, color: T.red600 }}>{err}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 16px 14px", borderTop: "1px solid " + C.line }}>
        <button type="button" onClick={onClose} style={btn(false)}>Annuler</button>
        <button type="button" onClick={apply} style={btn(true)}>Appliquer</button>
      </div>
    </div>
  </div>, document.body);
}
// v208 (demandé : « pouvoir réduire la hauteur des couloirs ») : piste, barre, marge, hauteur mini d'un couloir, taille du texte
export const LANE_DENS = { s: [14, 11, 3, 28, 9.5], m: [21, 17, 7, 44, 10.5], l: [28, 22, 8, 56, 11.5] };
const LANES = [
  { id: "arr", step: "arrivee", title: "Arrivées", ms: true },
  { id: "prod", step: "production", title: "Production", res: "prod" },
  { id: "banc1", step: "tests", title: "Banc 1", res: "banc", banc: 1 }, // v211 : deux bancs de tests
  { id: "banc2", step: "tests", title: "Banc 2", res: "banc", banc: 2 },
  { id: "fin", step: "finProd", title: "Packing" },
  { id: "dep", step: "depart", title: "Départs", ms: true },
];

export function PlannerLanes({ plan, basePlan, sched, cal, closurePeriods, load, tl, sel, setSel, readOnly, onPreview, onCommit, scrollRef, laneH, onScrollX }) {
  // v211 : hauteur réglable en continu (curseur) — laneH = hauteur de barre en px (ou s / m / l des versions précédentes)
  const C = pal(); const bh = typeof laneH === "number" ? laneH : ({ s: 11, m: 17, l: 22 }[laneH] || 17);
  const [TR, BH, PAD, MINH, FS] = [bh + 4, bh, Math.max(3, Math.round(bh * 0.4)), Math.max(26, Math.round(bh * 2.6)), Math.max(9, Math.min(12, Math.round(bh * 0.62 * 2) / 2))];
  const { lo, px, W } = tl; const nodes = sched.nodes; const base = basePlan || plan;
  const rules = rulesOf(plan);
  const names = useMemo(() => { const m = {}; plan.pjs.forEach(p => { m[p.pj] = p.nomProjet || ""; }); return m; }, [plan]);
  const ranks = useMemo(() => ({ prod: orderOf(plan, "prod"), banc: orderOf(plan, "banc") }), [plan]);
  const changed = useMemo(() => {
    const s = new Set(); if (!basePlan || basePlan === plan) return s; const a = schedule(basePlan, cal);
    Object.keys(nodes).forEach(k => { const x = a.nodes[k], y = nodes[k]; if (x && y && x.s !== null && y.s !== null && (x.start !== y.start || x.finish !== y.finish)) s.add(k); });
    return s;
  }, [basePlan, plan, nodes, cal]);

  // ── mise en page : chaque étape reçoit une position absolue ; les barres qui se chevauchent passent sur une autre piste ──
  const L = useMemo(() => {
    const out = []; let y = 0; const pos = {};
    LANES.forEach(l => {
      const arr = [];
      plan.pjs.forEach(p => {
        if (l.banc && benchOf(p) !== l.banc) return;
        const key = nodeKey(p.pj, l.step), n = nodes[key]; if (!n || n.s === null) return;
        const a = dayNum(n.start), b = dayNum(n.finish);
        if (l.ms) { const cx = (a - lo + 0.5) * px; arr.push({ pj: p.pj, key, n, cx, from: cx - 6, to: cx + 12 + p.pj.length * 6.4 }); }
        else { const x = (a - lo) * px, w = Math.max(px, (b - a + 1) * px), tw = p.pj.length * FS * 0.62 + 12, out = w < tw + 4; arr.push({ pj: p.pj, key, n, x, w, out, from: x, to: x + w + (out ? tw + 6 : 0) }); }
      });
      arr.sort((p, q) => p.from - q.from);
      const tracks = []; arr.forEach(i => { let t = tracks.findIndex(e => e <= i.from + 0.5); if (t < 0) { t = tracks.length; tracks.push(0); } tracks[t] = i.to + 2; i.track = t; });
      const h = Math.max(MINH, Math.max(1, tracks.length) * TR + PAD * 2);
      arr.forEach(i => { i.y = y + PAD + i.track * TR + (TR - BH) / 2; pos[i.key] = { ...i, cy: i.y + BH / 2, ms: !!l.ms }; });
      out.push({ ...l, y, h, items: arr }); y += h;
    });
    return { lanes: out, H: y, pos };
  }, [plan, nodes, lo, px, TR, BH, PAD, MINH, FS]);

  // ── glisser-déposer ──
  const [edit, setEdit] = useState(null); const dragged = useRef(0); // v254 : fenêtre d'édition ; dragged = un glisser vient de finir (le clic qui suit ne l'ouvre pas)
  const drag = useRef(null); const tipRef = useRef(null); const [dragKey, setDragKey] = useState(null); const [tip, setTip] = useState("");
  // au lâcher, la barre glisse de la souris jusqu'à son jour (150 ms, sans rebond)
  const settle = key => requestAnimationFrame(() => { const el = document.querySelector('[data-lane-key="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]'); if (!el || !el.style.transform) return; el.style.transition = "transform 150ms cubic-bezier(.2,.8,.2,1)"; el.style.transform = ""; setTimeout(() => { el.style.transition = ""; }, 170); });
  const startDrag = (e, d) => {
    if (readOnly || (e.button !== undefined && e.button !== 0)) return;
    e.stopPropagation(); e.preventDefault();
    // v263 (audit apple-design) : position de départ de la barre, pour qu'elle suive la souris au pixel près entre deux jours
    const bar = e.currentTarget.closest ? e.currentTarget.closest("[data-lane-key]") : null;
    drag.current = { ...d, x0: e.clientX, dd: 0, base, left0: bar ? parseFloat(bar.style.left) : null }; setDragKey(d.key + (d.kind === "resize" ? "|r" : ""));
  };
  useEffect(() => {
    if (!dragKey) return;
    const move = e => {
      const d = drag.current; if (!d) return;
      if (tipRef.current) { tipRef.current.style.left = (e.clientX + 14) + "px"; tipRef.current.style.top = (e.clientY + 16) + "px"; }
      // la barre colle à la souris (écart restant jusqu'à la souris, mesuré après le recalcul du plan)
      if (d.kind === "move" && d.left0 != null) { const cx = e.clientX; requestAnimationFrame(() => { const el = document.querySelector('[data-lane-key="' + (window.CSS && CSS.escape ? CSS.escape(d.key) : d.key) + '"]'); if (el && drag.current === d) { el.style.transition = "none"; el.style.transform = "translateX(" + (d.left0 + (cx - d.x0) - parseFloat(el.style.left)) + "px)"; } }); }
      const dd = Math.round((e.clientX - d.x0) / px); if (dd === d.dd) return; d.dd = dd;
      if (dd === 0) { d.cand = null; setTip(""); onPreview(null); return; }
      const ns = isoOfDay(dayNum(d.node.start) + dd);
      const cand = d.kind === "move" ? moveStepTo(d.base, cal, d.pj, d.step, cal.dateOf(cal.idxOnOrAfter(ns))) : setStep(d.base, d.pj, d.step, { dur: Math.max(1, cal.countBetween(d.node.start, isoOfDay(dayNum(d.node.finish) + dd))) });
      d.cand = cand; setTip(d.kind === "move" ? "début " + fmtIso(cal.dateOf(cal.idxOnOrAfter(ns))) : Math.max(1, cal.countBetween(d.node.start, isoOfDay(dayNum(d.node.finish) + dd))) + " j ouvrés"); onPreview(cand);
    };
    const up = () => {
      const d = drag.current; drag.current = null; setDragKey(null); setTip(""); if (!d) return;
      settle(d.key);
      if (d.dd) dragged.current = Date.now();
      if (d.dd && d.cand) { const want = d.kind === "move" ? cal.dateOf(cal.idxOnOrAfter(isoOfDay(dayNum(d.node.start) + d.dd))) : null; onCommit(d.cand, { pj: d.pj, key: want ? d.key : null, want }); } else onPreview(null);
    };
    const esc = e => { if (e.key === "Escape") { const d = drag.current; drag.current = null; setDragKey(null); setTip(""); onPreview(null); if (d) settle(d.key); } };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("keydown", esc); };
  }, [dragKey, px, cal, onPreview, onCommit]); // eslint-disable-line react-hooks/exhaustive-deps

  // clavier : ← → déplacent d'un jour ouvré (Maj : une semaine), [ ] changent la durée
  const onKey = (e, it, step, isMs) => {
    const n = it.n;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel({ pj: it.pj, step }); if (!readOnly) setEdit({ it, step }); return; }
    if (e.key === "Escape") { setSel(null); return; }
    if (readOnly) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const want = cal.addWork(n.start, (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 5 : 1)); setSel({ pj: it.pj, step }); onCommit(moveStepTo(base, cal, it.pj, step, want), { pj: it.pj, key: it.key, want }); }
    else if (!isMs && (e.key === "[" || e.key === "]")) { e.preventDefault(); setSel({ pj: it.pj, step }); onCommit(setStep(base, it.pj, step, { dur: Math.max(1, n.dur + (e.key === "]" ? 1 : -1)) }), { pj: it.pj, key: null, want: null }); }
  };

  // ── défilement : glisser le fond pour parcourir les dates ──
  const pan = useRef(null); const [panning, setPanning] = useState(false);
  useEffect(() => {
    if (!panning) return;
    const move = e => { const p = pan.current; if (p && scrollRef.current) scrollRef.current.scrollLeft = p.s0 - (e.clientX - p.x0); };
    const up = () => { pan.current = null; setPanning(false); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [panning, scrollRef]);
  const shift = k => { if (scrollRef.current) scrollRef.current.scrollBy({ left: k * 7 * px * 4, behavior: "smooth" }); };

  const head = useMemo(() => headerCells(tl), [tl]);
  const wmap = useMemo(() => { const m = new Map(); (load ? load.weeks : []).forEach(w => m.set(w.week, w)); return m; }, [load]);
  const showGauge = px >= 8 && load && load.capDay > 0;
  const HEAD1 = 22, HEAD2 = tl.zoom === "day" ? 34 : 22, GAUGE = showGauge ? 18 : 0, HEAD = HEAD1 + HEAD2 + GAUGE;
  const selPj = sel ? sel.pj : null;
  const todayX = (tl.today - lo) * px + px / 2;
  const closures = (closurePeriods || []).map(c => ({ x: (dayNum(c.start) - lo) * px, w: (dayNum(c.end || c.start) - dayNum(c.start) + 1) * px, label: c.label })).filter(c => c.x + c.w > 0 && c.x < W);
  const sPos = useMemo(() => selPj ? ["arrivee", "production", "tests", "finProd", "depart"].map(s => L.pos[nodeKey(selPj, s)]).filter(Boolean) : [], [selPj, L]);

  const label = it => it.pj + (px >= 9 && it.w > 170 && names[it.pj] ? "  " + names[it.pj] : "");
  const aria = (it, l) => it.pj + ", " + STEP_LABEL[l.step] + ", " + (l.ms ? "le " + fmtIso(it.n.start) : "du " + fmtIso(it.n.start) + " au " + fmtIso(it.n.finish));

  return (<div style={{ fontFamily: FONT, color: C.ink, background: C.bg }}>
    <div ref={scrollRef} onScroll={e => onScrollX && onScrollX(e.currentTarget.scrollLeft)} onContextMenu={e => e.preventDefault()} onMouseDown={e => { if ((e.button !== 2 && e.button !== 1) || !scrollRef.current) return; e.preventDefault(); const el = scrollRef.current, x0 = e.clientX, y0 = e.clientY, sl = el.scrollLeft, st = el.scrollTop; const mv = ev => { el.scrollLeft = sl - (ev.clientX - x0); el.scrollTop = st - (ev.clientY - y0); }; const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); }; window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up); }} style={{ overflow: "auto", maxHeight: "calc(100dvh - 430px)", minHeight: 260, position: "relative", cursor: panning ? "grabbing" : "default", userSelect: dragKey || panning ? "none" : "auto" }}>
      <div style={{ width: LABEL_W + W, position: "relative" }}>
        {/* en-tête */}
        <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 8, height: HEAD, background: C.bg, borderBottom: "1px solid " + C.line }}>
          <div style={{ width: LABEL_W, flex: "none", position: "sticky", left: 0, zIndex: 9, background: C.bg, borderRight: "1px solid " + C.line, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 8px 6px 12px", boxSizing: "border-box" }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase", color: C.ink3 }}>Couloirs</span>
            <span style={{ display: "inline-flex", gap: 2 }}>
              {[["‹", -1, "Plus tôt"], ["›", 1, "Plus tard"]].map(([t, k, a]) => <button key={t} onClick={() => shift(k)} aria-label={a} title={a} style={{ width: 24, height: 22, border: "1px solid " + C.line, background: C.bg, color: C.ink2, borderRadius: 4, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>{t}</button>)}
            </span>
          </div>
          <div style={{ position: "relative", width: W, flex: "none" }}>
            {head.top.map((m, i) => <div key={i} style={{ position: "absolute", left: m.x, width: m.w, top: 0, height: HEAD1, borderLeft: "1px solid " + C.line, padding: "4px 8px", fontSize: 11.5, fontWeight: 500, color: C.ink2, whiteSpace: "nowrap", overflow: "hidden", boxSizing: "border-box" }}>{m.w > 60 ? m.label : ""}</div>)}
            {head.bottom.map((m, i) => <div key={i} style={{ position: "absolute", left: m.x, width: m.w, top: HEAD1, height: HEAD2, borderLeft: "1px solid " + C.line2, display: "flex", flexDirection: "column", alignItems: tl.zoom === "day" ? "center" : "flex-start", justifyContent: "center", paddingLeft: tl.zoom === "day" ? 0 : 6, fontSize: 10.5, color: m.we ? "#9CA3AF" : C.ink3, fontWeight: m.cur || m.today ? 700 : 400, background: m.cur ? T.surface : "transparent", boxSizing: "border-box", overflow: "hidden", lineHeight: 1.15 }}>
              {tl.zoom === "day" && <span style={{ fontSize: 9, color: C.ink3 }}>{m.sub}</span>}<span style={m.today ? { background: C.ink, color: C.bg, borderRadius: 8, padding: "0 5px" } : undefined}>{m.label}</span></div>)}
            {showGauge && Array.from({ length: Math.ceil((tl.hi - lo + 1) / 7) }, (_, i) => {
              const n = lo + i * 7, w = wmap.get(isoOfDay(n)); if (!w) return null; const r = w.cap > 0 ? w.hours / w.cap : (w.hours > 0 ? 9 : 0); const over = w.over;
              return (<div key={"g" + i} title={Math.round(w.hours) + " h planifiées / " + Math.round(w.cap) + " h de capacité"} style={{ position: "absolute", left: i * 7 * px + 3, width: 7 * px - 6, top: HEAD1 + HEAD2 + 7, height: 4, borderRadius: 2, background: C.line2 }}>
                <div style={{ width: Math.min(100, r * 100) + "%", height: "100%", borderRadius: 2, background: over ? C.bad : r > 0.85 ? C.warn : C.ok }} />
                {px >= 10 && <span style={{ position: "absolute", left: 0, top: 5, fontSize: 9, fontFamily: MONO, color: over ? C.bad : C.ink3, whiteSpace: "nowrap" }}>{Math.round(w.hours)}</span>}
              </div>);
            })}
          </div>
        </div>

        {/* corps */}
        <div style={{ display: "flex", position: "relative", height: L.H }}>
          <div style={{ width: LABEL_W, flex: "none", position: "sticky", left: 0, zIndex: 6, background: C.bg, borderRight: "1px solid " + C.line }}>
            {L.lanes.map(l => (<div key={l.id} style={{ position: "absolute", top: l.y, left: 0, right: 0, height: l.h, borderBottom: "1px solid " + C.line, background: l.ms ? C.panel : C.bg, padding: bh < 14 ? "5px 12px" : "8px 12px", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, background: STEP_COLOR[l.step], borderRadius: l.ms ? 1 : 2, transform: l.ms ? "rotate(45deg)" : "none", flex: "none" }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{l.title}</span>
              </div>
              {bh >= 14 && <div style={{ fontSize: 10.5, color: C.ink3, marginTop: 3, paddingLeft: 15 }}>{l.items.length} PJ{l.res && rules[l.res] ? " · 1 à la fois" : ""}</div>}
            </div>))}
          </div>
          <div style={{ position: "relative", width: W, flex: "none" }} onPointerDown={e => { if (e.target === e.currentTarget || e.target.dataset.bg) { setSel(null); if (scrollRef.current) { pan.current = { x0: e.clientX, s0: scrollRef.current.scrollLeft }; setPanning(true); } } }}>
            {L.lanes.map(l => <div key={l.id} data-bg="1" style={{ position: "absolute", left: 0, right: 0, top: l.y, height: l.h, borderBottom: "1px solid " + C.line, background: l.ms ? C.panel : "transparent", cursor: "grab" }} />)}
            {px >= 8 && Array.from({ length: Math.ceil((tl.hi - lo + 1) / 7) }, (_, i) => <div key={"we" + i} data-bg="1" style={{ position: "absolute", left: (i * 7 + 5) * px, width: 2 * px, top: 0, bottom: 0, background: "rgba(127,127,127,.08)", cursor: "grab" }} />)}
            {closures.map((c, i) => <div key={i} title={c.label} style={{ position: "absolute", left: c.x, width: c.w, top: 0, bottom: 0, background: "rgba(180,83,9,.08)", pointerEvents: "none" }} />)}
            {head.bottom.map((m, i) => <div key={"v" + i} style={{ position: "absolute", left: m.x, top: 0, bottom: 0, width: 1, background: C.line2, pointerEvents: "none" }} />)}
            <div title="Aujourd'hui" style={{ position: "absolute", left: todayX - 0.5, top: 0, bottom: 0, width: 1, background: C.bad, opacity: 0.7, zIndex: 3, pointerEvents: "none" }} />
            {/* liaison du PJ sélectionné d'un couloir à l'autre */}
            {sPos.length > 1 && <svg width={W} height={L.H} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 4 }} aria-hidden="true">
              {sPos.slice(1).map((b, i) => { const a = sPos[i]; const x1 = a.ms ? a.cx : a.x + a.w, x2 = b.ms ? b.cx : b.x; const mx = (x1 + x2) / 2; return <path key={i} d={"M" + x1 + "," + a.cy + " C" + mx + "," + a.cy + " " + mx + "," + b.cy + " " + x2 + "," + b.cy} fill="none" stroke={C.accent} strokeWidth={1.25} opacity={0.75} />; })}
            </svg>}
            {L.lanes.map(l => l.items.map(it => {
              const on = sel && sel.pj === it.pj && (!sel.step || sel.step === l.step); const dim = selPj && selPj !== it.pj; const ch = changed.has(it.key);
              const col = STEP_COLOR[l.step]; const n = it.n; const pinned = n.driver === "snet" && !l.ms;
              const rank = l.res && rules[l.res] ? ranks[l.res].indexOf(it.pj) + 1 : 0;
              const common = { "data-lane-key": it.key, tabIndex: 0, role: "button", "aria-label": aria(it, l), "aria-pressed": !!on, onKeyDown: e => onKey(e, it, l.step, !!l.ms), title: it.pj + (names[it.pj] ? " · " + names[it.pj] : "") + "\n" + STEP_LABEL[l.step] + " : " + fmtIso(n.start) + (l.ms ? "" : " → " + fmtIso(n.finish) + " (" + n.dur + " j)") + "\n" + startReason(base, n) + (readOnly ? "" : "\nClic : modifier · glisser : déplacer") };
              if (l.ms) {
                const y = it.y; return (<div key={it.key} {...common} onPointerDown={e => startDrag(e, { kind: "move", pj: it.pj, step: l.step, key: it.key, node: n })} onClick={() => { setSel({ pj: it.pj, step: l.step }); if (!readOnly && Date.now() - dragged.current > 300) setEdit({ it, step: l.step }); }}
                  style={{ position: "absolute", left: it.cx - 6, top: y, height: BH, display: "flex", alignItems: "center", gap: 6, opacity: dim ? 0.3 : 1, cursor: readOnly ? "default" : "grab", zIndex: on ? 5 : 2, whiteSpace: "nowrap" }}>
                  <span style={{ width: 11, height: 11, background: col, transform: "rotate(45deg)", borderRadius: 1.5, outline: on ? "2px solid " + C.ink : ch ? "2px dashed #E08A00" : "none", outlineOffset: 2, flex: "none", marginLeft: 0 }} />
                  <span style={{ fontSize: FS + 0.5, fontWeight: on ? 700 : 500, color: on ? C.ink : C.ink2, fontFamily: MONO }}>{it.pj}</span>
                </div>);
              }
              return (<div key={it.key} {...common} onPointerDown={e => startDrag(e, { kind: "move", pj: it.pj, step: l.step, key: it.key, node: n })} onClick={() => { setSel({ pj: it.pj, step: l.step }); if (!readOnly && Date.now() - dragged.current > 300) setEdit({ it, step: l.step }); }}
                style={{ position: "absolute", left: it.x, top: it.y, width: it.w, height: BH, borderRadius: 3, background: col, opacity: dim ? 0.28 : 1, outline: on ? "2px solid " + C.ink : ch ? "2px dashed #E08A00" : "none", outlineOffset: 1, display: "flex", alignItems: "center", padding: "0 6px", gap: 5, color: "#fff", fontSize: FS, fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", cursor: readOnly ? "default" : "grab", zIndex: on ? 5 : 2, boxSizing: "border-box" }}>
                {rank > 0 && it.w > 36 && <span style={{ fontFamily: MONO, fontSize: 9.5, background: "rgba(255,255,255,.25)", borderRadius: 3, padding: "0 3px", flex: "none" }}>{rank}</span>}
                <span style={{ fontFamily: MONO, pointerEvents: "none", overflow: "hidden", textOverflow: "ellipsis" }}>{it.out ? "" : label(it)}</span>
                {it.w > 96 && <span style={{ marginLeft: "auto", opacity: 0.85, pointerEvents: "none", flex: "none", fontFamily: MONO }}>{n.dur} j</span>}
                {pinned && <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "rgba(0,0,0,.35)" }} />}
                {!readOnly && <span onPointerDown={e => startDrag(e, { kind: "resize", pj: it.pj, step: l.step, key: it.key, node: n })} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 6, cursor: "ew-resize", background: "rgba(0,0,0,.22)" }} />}
              </div>);
            }))}
            {/* v208 : n° de PJ écrit à côté des barres trop courtes pour le contenir */}
            {L.lanes.map(l => l.ms ? null : l.items.filter(it => it.out).map(it => <span key={"o" + it.key} aria-hidden="true" style={{ position: "absolute", left: it.x + it.w + 4, top: it.y, height: BH, lineHeight: BH + "px", fontSize: FS, fontFamily: MONO, fontWeight: 600, color: selPj && selPj !== it.pj ? C.ink3 : C.ink, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 2 }}>{it.pj}</span>))}
          </div>
        </div>
      </div>
    </div>
    {edit && <StepDialog it={edit.it} step={edit.step} plan={base} cal={cal} onClose={() => setEdit(null)} onApply={(np, info) => { setEdit(null); onCommit(np, info); }} />}
    {dragKey && tip && <div ref={tipRef} style={{ position: "fixed", left: 0, top: 0, zIndex: 10001, background: C.ink, color: C.bg, borderRadius: 4, padding: "3px 8px", fontSize: 11.5, fontWeight: 500, pointerEvents: "none" }}>{tip}</div>}
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "6px 14px 8px", fontSize: 11, color: C.ink3, borderTop: "1px solid " + C.line }}>
      <span>Clic sur une tâche : dates, durée et charge · glisser une barre : déplacer · bord droit : durée · glisser le fond ou clic droit maintenu : parcourir les dates · ← → au clavier</span>
      {(rules.prod || rules.banc) && <span>Chiffre dans la barre = rang de passage</span>}
      <span>Trait sombre à gauche = date imposée</span>
    </div>
  </div>);
}
