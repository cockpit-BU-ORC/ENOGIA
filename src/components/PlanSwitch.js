// v306 (maquette v306-navigation, piste A validée) : sélecteur segmenté des vues d'une page (Liste · Gantt · Calendrier),
// pastille qui glisse sous la vue active, flèches gauche / droite au clavier ; les outils (Planificateur, Modifications) à part, à droite.
import React, { useLayoutEffect, useRef, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { NavIcon } from "./SharedUI";

export function PlanSwitch({ views, tools, value, onGo, label }) {
  const box = useRef(null), [thumb, setThumb] = useState(null);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return undefined;
    const place = () => { const b = el.querySelector('[aria-selected="true"]'); setThumb(b ? { x: b.offsetLeft, w: b.offsetWidth } : null); };
    place(); if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(place); ro.observe(el); return () => ro.disconnect();
  }, [value, views.length]);
  const onKey = e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = views.findIndex(v => v.id === value), n = views.length; if (!n) return;
    const j = i < 0 ? 0 : (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    e.preventDefault(); onGo(views[j].id);
    requestAnimationFrame(() => { const b = box.current && box.current.querySelectorAll('[role="tab"]')[j]; if (b) b.focus(); });
  };
  return (<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
    <div ref={box} role="tablist" aria-label={label} onKeyDown={onKey} className="enogia-seg" style={{ position: "relative", display: "inline-flex", gap: 2, padding: 3, borderRadius: 12, background: T.surfaceAlt }}>
      {thumb && <span aria-hidden="true" className="enogia-seg-thumb" style={{ position: "absolute", top: 3, bottom: 3, left: 0, width: thumb.w, transform: "translateX(" + thumb.x + "px)", borderRadius: 8, background: T.card, boxShadow: "0 1px 3px rgba(0,0,0,.14)" }} />}
      {views.map(v => { const on = v.id === value; return <button key={v.id} type="button" role="tab" aria-selected={on} tabIndex={on || (!views.some(x => x.id === value) && v === views[0]) ? 0 : -1} onClick={() => onGo(v.id)} title={v.key ? v.l + " (touche " + v.key + ")" : v.l}
        style={{ position: "relative", zIndex: 1, border: "none", background: "transparent", borderRadius: 8, minHeight: 32, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: on ? 600 : 600, color: on ? T.ink900 : T.ink500 }}>
        {v.icon && <NavIcon name={v.icon} size={16} />}{v.l}{v.badge ? <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "0 6px", background: v.badgeBad ? T.red100 : T.card, color: v.badgeBad ? T.red600 : T.ink700, boxShadow: v.badgeBad ? "none" : "inset 0 0 0 1px " + T.line }}>{v.badge}</span> : null}</button>; })}
    </div>
    {tools.map(t => { const on = t.id === value; return <button key={t.id} type="button" onClick={() => onGo(t.id)} aria-pressed={on} title={t.hint || t.l}
      style={{ border: "1px solid " + (on ? T.ink900 : T.line), background: T.card, borderRadius: 8, minHeight: 32, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: on ? 600 : 500, color: on ? T.ink900 : T.ink700 }}>
      <NavIcon name={t.icon} size={16} />{t.l}{t.badge ? <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "0 6px", background: T.red100, color: T.red600 }}>{t.badge}</span> : null}</button>; })}
  </div>);
}
