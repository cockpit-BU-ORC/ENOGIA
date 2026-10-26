import React, { useMemo, useState } from "react";
import { T } from "../theme";
import { dayNum, isoOfDay } from "./engine";
import { Pop, MenuItem } from "./PlannerMenu";

// Charge atelier vs capacité, alignée sur la frise du Gantt (même échelle, même défilement horizontal).
// Chaque période (semaine ou mois) montre un cadre = la capacité ; la barre = les heures planifiées ; le vide du cadre = ce qui reste possible.
const dow = n => (((n + 3) % 7) + 7) % 7;
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const H = 150, PAD_T = 22, PAD_B = 6;

function NumField({ value, onCommit, width = 54, label }) {
  const [v, setV] = useState(String(value)); const [f, setF] = useState(false);
  if (!f && v !== String(value)) setV(String(value));
  const done = () => { setF(false); if (v !== String(value)) onCommit(v); };
  return <input aria-label={label} className="pg-in" type="number" min={0} value={v} onFocus={e => { setF(true); e.target.select(); }} onChange={e => setV(e.target.value)} onBlur={done}
    onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") { setV(String(value)); e.currentTarget.blur(); } }}
    style={{ width, height: 30, padding: "0 6px", border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, fontFamily: T.fontMono, fontSize: 13, textAlign: "right", boxSizing: "border-box" }} />;
}

export function bucketsOf(load, cal, mode) {
  const map = new Map();
  const get = (key, start, end) => { let b = map.get(key); if (!b) { b = { key, start, end, hours: 0, pjs: {} }; map.set(key, b); } return b; };
  load.phases.forEach(ph => {
    for (let i = ph.s; i <= ph.f; i++) {
      const iso = cal.dateOf(i); const n = dayNum(iso); let b;
      if (mode === "month") { const d = new Date(n * 86400000); const y = d.getUTCFullYear(), m = d.getUTCMonth(); b = get(y + "-" + m, Date.UTC(y, m, 1) / 86400000, Date.UTC(y, m + 1, 1) / 86400000); b.label = MONTHS[m] + " " + y; }
      else { const s = n - dow(n); b = get(s, s, s + 7); }
      b.hours += ph.daily; b.pjs[ph.pj] = (b.pjs[ph.pj] || 0) + ph.daily;
    }
  });
  const out = [...map.values()].sort((a, b) => a.start - b.start);
  out.forEach(b => {
    let days = 0; for (let n = b.start; n < b.end; n++) if (cal.isWork(isoOfDay(n))) days++;
    b.days = days; b.cap = load.capDay * days; b.hours = Math.round(b.hours * 10) / 10; b.over = b.hours > b.cap + 0.5;
    if (!b.label) b.label = "Semaine du " + isoOfDay(b.start).slice(8, 10) + "/" + isoOfDay(b.start).slice(5, 7);
  });
  return out;
}

export function PlannerLoad({ plan, load, cal, tl, scrollX, leftW, standalone, mode, setMode, cap, onCap, readOnly, onPropose, hasLevelNow, nTooDense }) {
  const buckets = useMemo(() => bucketsOf(load, cal, mode), [load, cal, mode]);
  const [hov, setHov] = useState(null);
  const unit = mode === "month" ? "mois" : "sem.";
  const maxV = Math.max(1, ...buckets.map(b => Math.max(b.cap, b.hours))) * 1.12;
  const yOf = v => PAD_T + (H - PAD_T - PAD_B) * (1 - v / maxV);
  const over = buckets.filter(b => b.over); const peak = buckets.reduce((m, b) => Math.max(m, b.cap > 0 ? b.hours / b.cap : 0), 0);
  const free = buckets.reduce((s, b) => s + Math.max(0, b.cap - b.hours), 0);
  const capW = (Number(cap.people) || 0) * (Number(cap.hours) || 0);
  const hb = hov != null ? buckets.find(b => b.key === hov.key) : null;
  return (<section aria-label="Charge atelier et capacité" style={{ borderTop: "2px solid " + T.line, background: T.card }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "10px 14px" }}>
      <b style={{ color: T.ink900, fontSize: 14 }}>Charge atelier</b>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12.5, color: T.ink500 }}>capacité
        <NumField label="Nombre de personnes" value={cap.people} width={52} onCommit={v => onCap({ people: Math.max(0, Number(v) || 0) })} /> pers. ×
        <NumField label="Heures par personne et par semaine" value={cap.hours} width={58} onCommit={v => onCap({ hours: Math.max(0, Number(v) || 0) })} /> h =
        <b style={{ fontFamily: T.fontMono, color: T.ink900 }}>{Math.round(capW)} h / sem.</b></span>
      <div role="group" aria-label="Période" style={{ display: "inline-flex", border: "1px solid " + T.line, borderRadius: 8, overflow: "hidden" }}>
        {[["week", "Semaine"], ["month", "Mois"]].map(([k, l]) => <button key={k} aria-pressed={mode === k} onClick={() => setMode(k)} className="pg-btn" style={{ border: 0, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: mode === k ? T.navy700 : T.card, color: mode === k ? "#fff" : T.ink700 }}>{l}</button>)}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: over.length ? T.red500 : T.emerald600 }}>
        {over.length ? "▲ " + over.length + " " + (mode === "month" ? "mois" : "semaine" + (over.length > 1 ? "s" : "")) + " en surcharge (pic " + Math.round(peak * 100) + " %)" : "✓ Aucune surcharge"}</span>
      <span style={{ fontSize: 12, color: T.ink500 }}>{Math.round(free)} h libres sur la période</span>
      <span style={{ flex: 1 }} />
      {!readOnly && <>
        <button className="pg-btn" onClick={() => onPropose("level")} title="Décale les phases des PJ les moins prioritaires pour que chaque semaine tienne dans la capacité (aperçu avant d'appliquer)" style={{ border: "none", background: "linear-gradient(135deg," + T.teal500 + "," + T.navy700 + ")", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Niveler la charge</button>
        <Pop width={290} align="right" trigger={(o, t) => <button className="pg-btn" aria-haspopup="menu" aria-expanded={o} onClick={t} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Plus ▾</button>}>
          {close => (<>
            <MenuItem onClick={() => { close(); onPropose("early"); }}>Voir au plus tôt<div style={{ fontSize: 11.5, color: T.ink500 }}>Libère les dates imposées (sauf arrivées et départs)</div></MenuItem>
            <MenuItem disabled={!nTooDense} onClick={() => { close(); onPropose("fit"); }}>Ajuster les durées{nTooDense ? " (" + nTooDense + ")" : ""}<div style={{ fontSize: 11.5, color: T.ink500 }}>Allonge les phases dont les heures ne tiennent pas</div></MenuItem>
            <MenuItem onClick={() => { close(); onPropose("sort"); }}>Trier les PJ par date de début</MenuItem>
            <MenuItem disabled={!hasLevelNow} onClick={() => { close(); onPropose("clear"); }}>Retirer le nivellement</MenuItem>
          </>)}
        </Pop>
      </>}
    </div>
    <div style={{ display: "flex" }}>
      <div style={{ width: standalone ? 190 : leftW, flexShrink: 0, borderRight: "2px solid " + T.line, padding: "0 12px", boxSizing: "border-box", position: "relative", height: H }}>
        <div style={{ position: "absolute", top: 8, left: 12, right: 12, fontSize: 11, color: T.ink500, lineHeight: 1.4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 9, border: "1.5px solid " + T.ink500, borderRadius: 2, display: "inline-block", background: "rgba(23,115,79,.08)" }} />capacité ({unit})</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 9, background: "#17734F", borderRadius: 2, display: "inline-block" }} />heures planifiées</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 9, background: "#B3261E", borderRadius: 2, display: "inline-block" }} />dépassement</div>
          <div style={{ marginTop: 4, color: T.ink300 }}>Le vide du cadre = ce qu'il reste possible.</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowX: standalone ? "auto" : "hidden", overflowY: "hidden", position: "relative", height: H }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: tl.W, height: H, transform: standalone ? "none" : "translateX(" + (-scrollX) + "px)" }}>
          {buckets.map(b => {
            const x0 = (b.start - tl.lo) * tl.px, x = Math.max(0, x0), w = (b.end - b.start) * tl.px - (x - x0); const bx = x + 2, bw = Math.max(2, w - 4);
            const hCap = b.cap > 0 ? H - PAD_B - yOf(b.cap) : 0; const hBar = b.hours > 0 ? H - PAD_B - yOf(b.hours) : 0;
            const inCap = Math.min(hBar, hCap), ex = Math.max(0, hBar - hCap);
            return (<div key={b.key} onMouseEnter={e => setHov({ key: b.key, x: e.clientX, y: e.clientY })} onMouseMove={e => setHov({ key: b.key, x: e.clientX, y: e.clientY })} onMouseLeave={() => setHov(null)}
              style={{ position: "absolute", left: bx, width: bw, top: 0, height: H }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: PAD_B, height: hCap, border: "1.5px solid " + T.ink500, borderRadius: 3, background: "rgba(23,115,79,.07)", boxSizing: "border-box" }} />
              <div style={{ position: "absolute", left: 3, right: 3, bottom: PAD_B, height: inCap, background: b.over ? "#B3261E" : "#17734F", borderRadius: "2px 2px 0 0", opacity: 0.92 }} />
              {ex > 0 && <div style={{ position: "absolute", left: 3, right: 3, bottom: PAD_B + inCap, height: ex, background: "#B3261E", borderRadius: "3px 3px 0 0", backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,.35) 0 3px,transparent 3px 6px)" }} />}
              {bw >= 34 && b.hours > 0 && <div style={{ position: "absolute", left: 0, right: 0, bottom: PAD_B + Math.max(hBar, hCap) + 2, textAlign: "center", fontSize: 11, fontWeight: 700, fontFamily: T.fontMono, color: b.over ? "#B3261E" : T.ink700, whiteSpace: "nowrap" }}>{b.over ? "▲ " : ""}{Math.round(b.hours)}{bw >= 60 ? " / " + Math.round(b.cap) : ""}</div>}
            </div>);
          })}
          <div title="Aujourd'hui" style={{ position: "absolute", left: (tl.today - tl.lo) * tl.px + tl.px / 2 - 1, top: 0, bottom: 0, width: 2, background: "#CB4848", opacity: 0.6, pointerEvents: "none" }} />
          {buckets.length === 0 && <div style={{ padding: 16, fontSize: 13, color: T.ink500 }}>Aucune heure atelier planifiée : renseignez le « Travail » des tâches Production et Fin de production.</div>}
        </div>
      </div>
    </div>
    {hb && <div style={{ position: "fixed", left: Math.min(hov.x + 14, window.innerWidth - 270), top: Math.max(8, hov.y - 150), width: 252, zIndex: 10002, pointerEvents: "none", background: T.ink900, color: T.card, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, boxShadow: T.shadowLg }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>{hb.label}</div>
      <div style={{ fontFamily: T.fontMono }}>{Math.round(hb.hours)} h planifiées / {Math.round(hb.cap)} h ({hb.days} j ouvrés)</div>
      <div style={{ fontWeight: 700, color: hb.over ? "#FFB4AB" : "#9BE3C0", margin: "2px 0 6px" }}>{hb.over ? "Dépassement de " + Math.round(hb.hours - hb.cap) + " h" : "Il reste " + Math.round(hb.cap - hb.hours) + " h"}</div>
      {Object.entries(hb.pjs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([pj, h]) => <div key={pj} style={{ display: "flex", justifyContent: "space-between", fontFamily: T.fontMono, fontSize: 12 }}><span>{pj}</span><span>{Math.round(h)} h</span></div>)}
    </div>}
  </section>);
}
