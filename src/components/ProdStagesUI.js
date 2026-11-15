import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { T, FZ } from "../theme";
import { ETAT_META } from "../pjMeta";
import { STAGES, STEP_NOTE } from "../prodStages";

const barOf = id => (ETAT_META[id] || {}).bar || T.teal500;

// Bouton « i » à côté des filtres d'état : ouvre la frise des étapes.
export function EtatInfoButton({ style }) {
  const [open, setOpen] = useState(false);
  return (<>
    <button type="button" aria-label="Voir les étapes de production" title="Étapes de production et avancement" onClick={e => { e.stopPropagation(); setOpen(true); }}
      style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid " + T.teal500, background: "transparent", color: T.teal600, fontSize: 12, fontWeight: 500, fontStyle: "italic", fontFamily: T.font, lineHeight: "17px", padding: 0, cursor: "pointer", flexShrink: 0, ...style }}>i</button>
    {open && <StageTimelineDialog onClose={() => setOpen(false)} />}
  </>);
}

// Rendu dans <body> (portail) : le cadre ne peut plus passer sous les en-têtes collants des tableaux.
export function StageTimelineDialog({ onClose }) {
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const nodes = [...STAGES.map(s => ({ id: s.id, label: s.label, range: s.from + " → " + s.to + " %", steps: s.steps })), { id: "SHIPPED", label: "Expédiée", range: "100 %", steps: ["Machine expédiée au client"] }];
  const wrap = { overflowWrap: "anywhere", minWidth: 0 };
  return createPortal(<div className="enogia-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 20010, background: "rgba(15,25,40,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-labelledby="stg-title" className="enogia-modal-pop" style={{ background: T.card, color: T.ink900, borderRadius: 12, border: "1px solid " + T.line, boxShadow: T.shadowLg, width: "min(1040px,100%)", maxHeight: "92dvh", overflowY: "auto", overflowX: "hidden", fontFamily: T.font, padding: "22px 26px 26px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, ...wrap }}>
          <h2 id="stg-title" style={{ margin: 0, fontSize: FZ.lg, fontWeight: 600 }}>Étapes de production chez ENOGIA</h2>
          <div style={{ fontSize: FZ.sm, color: T.ink500, marginTop: 4 }}>L'avancement se met à jour automatiquement selon l'état choisi pour la machine.</div>
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: FZ.sm, fontWeight: 600, fontFamily: T.font, flexShrink: 0 }}>Fermer</button>
      </div>
      {/* frise proportionnelle 0 → 100 % */}
      <div style={{ display: "flex", height: 14, borderRadius: 8, overflow: "hidden", marginTop: 20, border: "1px solid " + T.line }}>
        {STAGES.map(s => <div key={s.id} title={s.label + " " + s.from + "–" + s.to + " %"} style={{ width: (s.to - s.from) + "%", background: barOf(s.id) }} />)}
        <div style={{ flex: 1, background: barOf("SHIPPED") }} title="Expédiée 100 %" />
      </div>
      <div style={{ fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums", marginTop: 4, position: "relative", height: 16 }}>
        {[[0, "0 %", "none"], [40, "40 %", "translateX(-50%)"], [80, "80 %", "translateX(-50%)"], [90, "", ""], [100, "100 %", "translateX(-100%)"]].filter(x => x[1]).map(([v, l, tf]) =>
          <span key={v} style={{ position: "absolute", whiteSpace: "nowrap", left: v + "%", transform: tf }}>{l}</span>)}
      </div>
      {/* frise chronologique */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginTop: 20 }}>
        {nodes.map((nd, i) => (<div key={nd.id} style={{ position: "relative", paddingTop: 24, minWidth: 0 }}>
          <div style={{ position: "absolute", top: 8, left: 0, right: i === nodes.length - 1 ? 0 : -12, height: 3, background: T.line }} />
          <span style={{ position: "absolute", top: 0, left: 0, width: 17, height: 17, borderRadius: "50%", background: barOf(nd.id), border: "3px solid " + T.card, boxShadow: "0 0 0 1.5px " + barOf(nd.id) }} />
          <div style={{ background: ETAT_META[nd.id].bg, border: "1px solid " + ETAT_META[nd.id].border, borderRadius: 12, padding: "11px 13px", minHeight: 118, boxSizing: "border-box" }}>
            <div style={{ fontSize: FZ.md, fontWeight: 600, color: ETAT_META[nd.id].text, ...wrap }}>{i + 1}. {nd.label}</div>
            <div style={{ fontSize: FZ.xs, fontWeight: 500, color: ETAT_META[nd.id].text, opacity: .85, fontVariantNumeric: "tabular-nums", marginBottom: 6 }}>{nd.range}</div>
            {nd.steps.map(s => <div key={s} style={{ fontSize: FZ.xs, color: ETAT_META[nd.id].text, display: "flex", gap: 6, alignItems: "baseline", marginTop: 2 }}>
              <span aria-hidden="true">•</span><span style={{ ...wrap, lineHeight: 1.35 }}>{s}</span></div>)}
          </div>
        </div>))}
      </div>
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 14, lineHeight: 1.4 }}>{STEP_NOTE}</div>
    </div>
  </div>, document.body);
}
