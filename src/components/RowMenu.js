import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { T, FZ, R } from "../theme";
import { ETAT_META, ASSIGNABLE_ETATS } from "../pjMeta";
import { NavIcon } from "./SharedUI";

// v162 — Menu d'actions rapides d'une ligne (clic droit, ou bouton ⋯ au survol) : ouvrir la fiche, commenter,
// copier le n° de PJ et — pour les administrateurs — changer l'état sans ouvrir la fiche.
export function RowMenu({ pj, x, y, canSetEtat, etat, onOpen, onComment, onSetEtat, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [showEtats, setShowEtats] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const away = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const key = e => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    const mv = () => onClose();
    document.addEventListener("mousedown", away, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("scroll", mv, { capture: true, passive: true });
    window.addEventListener("resize", mv);
    return () => { document.removeEventListener("mousedown", away, true); document.removeEventListener("keydown", key, true); window.removeEventListener("scroll", mv, true); window.removeEventListener("resize", mv); };
  }, [onClose]);

  // Reste dans la fenêtre : on recale après la mesure (et quand la liste des états s'ouvre).
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    setPos({ left: Math.max(8, Math.min(x, window.innerWidth - w - 8)), top: Math.max(8, Math.min(y, window.innerHeight - h - 8)) });
  }, [x, y, showEtats]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(pj); setCopied(true); setTimeout(onClose, 650); } catch (e) { onClose(); }
  };
  const item = (icon, label, fn, extra) => (
    <button type="button" role="menuitem" className="enogia-menu-item" onClick={fn} style={{ fontSize: FZ.sm, color: T.ink900, ...extra }}>
      <span style={{ color: T.ink500, display: "inline-flex" }}><NavIcon name={icon} size={16} /></span>{label}
    </button>
  );

  return createPortal(
    <div ref={ref} role="menu" aria-label={"Actions " + pj} className="enogia-menu"
      onContextMenu={e => e.preventDefault()}
      style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 3000, minWidth: 220, maxWidth: 280, padding: 6, background: T.card, borderRadius: R.md, boxShadow: "0 0 0 1px " + T.line + ", 0 12px 32px -8px rgba(16,24,40,.28)", fontFamily: T.font }}>
      <div style={{ padding: "6px 12px 8px", fontSize: FZ.xs, fontWeight: 700, color: T.ink500, letterSpacing: ".04em" }}>{pj}</div>
      {item("sidepanel", "Ouvrir la fiche", () => { onOpen(); onClose(); })}
      {item("comments", "Commenter", () => { onComment(); onClose(); })}
      {item(copied ? "check" : "copy", copied ? "N° copié" : "Copier le n° de PJ", copy)}
      {canSetEtat && <>
        <div style={{ height: 1, background: T.line, margin: "4px 6px" }} />
        {item("layers", "Changer l'état", () => setShowEtats(s => !s), { fontWeight: 600 })}
        {showEtats && <div style={{ maxHeight: 240, overflowY: "auto", padding: "2px 0 2px 8px" }}>
          {ASSIGNABLE_ETATS.map(id => {
            const m = ETAT_META[id]; if (!m) return null;
            return (
              <button key={id} type="button" role="menuitemradio" aria-checked={id === etat} className="enogia-menu-item" onClick={() => { onSetEtat(id); onClose(); }} style={{ fontSize: FZ.sm, color: T.ink900, fontWeight: id === etat ? 700 : 400 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: m.bar, flexShrink: 0 }} />{m.label}
                {id === etat && <span style={{ marginLeft: "auto", color: T.accent, display: "inline-flex" }}><NavIcon name="check" size={14} /></span>}
              </button>
            );
          })}
        </div>}
      </>}
    </div>,
    document.body
  );
}
