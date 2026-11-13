import React, { useState, useEffect, useRef } from "react";
import { T } from "../theme";

// Petit menu déroulant « flottant » (position fixe : jamais coupé par une zone qui défile)
export function Pop({ trigger, children, width = 260, align = "left" }) {
  const [pos, setPos] = useState(null); const ref = useRef(null); const box = useRef(null);
  const close = () => setPos(null);
  useEffect(() => {
    if (!pos) return;
    const down = e => { if (box.current && !box.current.contains(e.target) && ref.current && !ref.current.contains(e.target)) close(); };
    const esc = e => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", esc); window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", esc); window.removeEventListener("resize", close); };
  }, [pos]);
  const toggle = () => {
    if (pos) { close(); return; }
    const r = ref.current.getBoundingClientRect(); const left = align === "right" ? Math.max(8, r.right - width) : Math.min(r.left, window.innerWidth - width - 8);
    const below = r.bottom + 4, room = window.innerHeight - below;
    setPos(room < 220 && r.top > room ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: below });
  };
  return (<span ref={ref} style={{ display: "inline-flex" }}>
    {trigger(!!pos, toggle)}
    {pos && <div ref={box} role="menu" style={{ position: "fixed", ...pos, width, zIndex: 10001, background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: 8, fontFamily: T.font, fontSize: 13, color: T.ink700, maxHeight: "70dvh", overflow: "auto" }}>{typeof children === "function" ? children(close) : children}</div>}
  </span>);
}

export function MenuItem({ children, onClick, danger, disabled }) {
  return <button role="menuitem" className="pg-menuitem" disabled={disabled} onClick={onClick} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: 0, background: "transparent", borderRadius: 8, cursor: disabled ? "default" : "pointer", color: danger ? T.red500 : T.ink900, opacity: disabled ? 0.45 : 1, fontSize: 13, fontFamily: T.font, fontWeight: 600 }}>{children}</button>;
}
