import React, { useState, useEffect, useRef } from "react";
import { T, FZ, THEMES, THEME_IDS } from "../theme";
import { NavIcon, closeAllMenus, useCloseOnSignal } from "./SharedUI";
import { useDetailMode } from "../detailMode";

// ── Choix du thème (v139) : bouton « palette » dans la barre latérale + petit panneau avec les 5 thèmes. ──
// Le choix est mémorisé par personne et par poste (navigateur) ; il se combine avec le mode clair / sombre.
export function ThemePicker({ ink, themeId, onPick, density = "comfortable", onDensity, presentation = false, onPresentation, darkMode = false, darkPref, onDarkMode }) {
  const [open, setOpen] = useState(false);
  const [detailMode, setDetailMode] = useDetailMode();
  const ref = useRef(null);
  useCloseOnSignal(setOpen); // un autre menu s'ouvre : on se ferme
  useEffect(() => {
    if (!open) return;
    const esc = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);
  const toggle = () => { if (!open) closeAllMenus(); setOpen(v => !v); }; // on ferme d'abord les autres menus
  return (<div ref={ref} style={{ position: "relative", marginTop: 4 }}>
    <button onClick={toggle} title="Apparence : thème, mode clair / sombre, densité, présentation" aria-label="Apparence : thème, mode clair ou sombre, densité, présentation" aria-expanded={open} aria-haspopup="dialog" style={{ width: 40, height: 36, borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: open ? T.teal100 : "transparent", color: open ? T.teal600 : (ink || T.ink300) }}><NavIcon name="palette" size={17} /></button>
    {open && <div aria-hidden="true" onMouseDown={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10019 }} />}
    {open && <div role="dialog" aria-label="Affichage" className="enogia-float-in enogia-theme-pop" style={{ position: "fixed", left: 72, bottom: 14, zIndex: 10020, width: 262, maxHeight: "calc(100dvh - 28px)", overflowY: "auto", background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: "12px 12px 8px", fontFamily: T.font }}>
      {onDarkMode && <>
        <div style={{ fontSize: FZ.sm, fontWeight: 700, marginBottom: 6 }}>Mode</div>
        <div role="radiogroup" aria-label="Mode clair ou sombre" style={{ display: "flex", gap: 4, background: T.surfaceAlt, borderRadius: 12, padding: 4, marginBottom: 12 }}>
          {/* v285 : Auto = suit le réglage clair / sombre de l'ordinateur */}
          {[["light", "Clair", "sunSm"], ["dark", "Sombre", "moon"], ["system", "Auto", "auto"]].map(([k, l, ic]) => { const on = (darkPref || (darkMode ? "dark" : "light")) === k; return (
            <button key={l} role="radio" aria-checked={on} onClick={() => onDarkMode(k)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontFamily: T.font, fontSize: FZ.xs, fontWeight: 700, background: on ? T.card : "transparent", color: on ? T.teal600 : T.ink500, boxShadow: on ? T.shadowCard : "none" }}><NavIcon name={ic} size={14} />{l}</button>); })}
        </div>
      </>}
      {THEME_IDS.length > 1 && <>{/* v197 : un seul thème — le choix de thème disparaît */}
      <div style={{ fontSize: FZ.sm, fontWeight: 700, marginBottom: 8 }}>Thème de couleurs</div>
      <div role="radiogroup" aria-label="Thème" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {THEME_IDS.map(id => {
          const th = THEMES[id], on = id === themeId;
          return (<button key={id} role="radio" aria-checked={on} onClick={() => onPick(id)} style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", border: "1px solid " + (on ? T.teal500 : "transparent"), background: on ? T.teal100 : "transparent", color: T.ink900, borderRadius: 12, padding: "6px 8px", cursor: "pointer", fontFamily: T.font }}>
            <span aria-hidden="true" style={{ display: "inline-flex", flexShrink: 0, borderRadius: 8, overflow: "hidden", border: "1px solid " + T.line, width: 54, height: 26 }}>
              <span style={{ flex: 2, background: th.swatch[0] }} /><span style={{ flex: 2, background: th.swatch[1] }} /><span style={{ flex: 1, background: th.swatch[2] }} />
            </span>
            <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: FZ.sm, fontWeight: 700 }}>{th.label}</span><span style={{ display: "block", fontSize: FZ.xs, color: T.ink500 }}>{th.desc}</span></span>
            {on && <span aria-hidden="true" style={{ marginLeft: "auto", color: T.teal600, fontWeight: 800 }}>✓</span>}
          </button>);
        })}
      </div></>}
      <div style={{ fontSize: FZ.sm, fontWeight: 700, margin: "12px 0 6px" }}>Densité</div>
      <div role="radiogroup" aria-label="Densité d'affichage" style={{ display: "flex", gap: 4, background: T.surfaceAlt, borderRadius: 12, padding: 4 }}>
        {[["comfortable", "Confortable"], ["compact", "Compacte"]].map(([k, l]) => { const on = density === k; return (
          <button key={k} role="radio" aria-checked={on} onClick={() => onDensity && onDensity(k)} style={{ flex: 1, border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontFamily: T.font, fontSize: FZ.xs, fontWeight: 700, background: on ? T.card : "transparent", color: on ? T.ink900 : T.ink500, boxShadow: on ? T.shadowFlat : "none" }}>{l}</button>); })}
      </div>
      <div style={{ fontSize: FZ.sm, fontWeight: 700, margin: "12px 0 6px" }}>Fiche d'un PJ</div>
      <div role="radiogroup" aria-label="Affichage de la fiche d'un PJ" style={{ display: "flex", gap: 4, background: T.surfaceAlt, borderRadius: 12, padding: 4 }}>
        {[["panel", "Volet à droite", "sidepanel"], ["popup", "Pop-up central", "popup"]].map(([k, l, ic]) => { const on = detailMode === k; return (
          <button key={k} role="radio" aria-checked={on} onClick={() => setDetailMode(k)} style={{ flex: 1, border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontFamily: T.font, fontSize: FZ.xs, fontWeight: 700, background: on ? T.card : "transparent", color: on ? T.ink900 : T.ink500, boxShadow: on ? T.shadowFlat : "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><NavIcon name={ic} size={13} />{l}</button>); })}
      </div>
      <div style={{ fontSize: FZ.sm, fontWeight: 700, margin: "12px 0 6px" }}>Présentation</div>
      <button role="switch" aria-checked={presentation} onClick={() => { onPresentation && onPresentation(!presentation); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", border: "1px solid " + (presentation ? T.teal500 : T.line), background: presentation ? T.teal100 : "transparent", color: T.ink900, borderRadius: 12, padding: "8px", cursor: "pointer", fontFamily: T.font }}>
        <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: FZ.sm, fontWeight: 700 }}>{presentation ? "Quitter le mode présentation" : "Mode présentation"}</span><span style={{ display: "block", fontSize: FZ.xs, color: T.ink500 }}>Contraste maximal, textes plus grands, pour projeter en réunion.</span></span>
      </button>
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 10, lineHeight: 1.4 }}>Mémorisé sur ce poste (sauf la présentation, propre à l'onglet). Les rapports (CODIR, chef de projet) gardent la charte Marine.</div>
    </div>}
  </div>);
}
