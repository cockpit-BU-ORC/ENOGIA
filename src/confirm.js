// v288 (audit par skill, lot E « sécurité des actions ») : fenêtre de confirmation maison, à la place de window.confirm / window.prompt.
// askConfirm({ title, message, confirmLabel, cancelLabel, danger }) → Promise<boolean>
//   • un titre qui pose la question, la conséquence en clair, un bouton qui nomme l'action (« Retirer les pénalités », pas « OK ») ;
//   • action destructive (danger) : bouton rouge, focus placé sur « Annuler » (Entrée ne détruit rien par mégarde) ;
//   • Échap ou clic sur le fond = annuler ; fenêtre modale du site (aria-modal : animations et focus de motion.js).
// showText({ title, text }) → Promise<void> : texte sélectionné à copier (remplace window.prompt de secours).
import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { T, btn } from "./theme";

let seq = 0;
function mount(render) {
  return new Promise(resolve => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = v => { root.unmount(); host.remove(); resolve(v); };
    root.render(render(done));
  });
}

function Box({ title, children, onCancel, actions, width = 440 }) {
  const id = useRef("e-confirm-" + (++seq)).current;
  useEffect(() => {
    const k = e => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } };
    document.addEventListener("keydown", k, true); return () => document.removeEventListener("keydown", k, true);
  }, [onCancel]);
  return (<div role="dialog" aria-modal="true" aria-labelledby={id} onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    style={{ position: "fixed", inset: 0, zIndex: 10060, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: T.font }}>
    <div style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(" + width + "px,100%)", padding: "18px 20px" }}>
      <div id={id} style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 16, lineHeight: 1.3, marginBottom: 8 }}>{title}</div>
      {children}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>{actions}</div>
    </div>
  </div>);
}

export function askConfirm({ title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", danger = false }) {
  if (typeof document === "undefined") return Promise.resolve(false);
  return mount(done => {
    function C() {
      const cancelRef = useRef(null), okRef = useRef(null);
      useEffect(() => { const el = danger ? cancelRef.current : okRef.current; const t = setTimeout(() => el && el.focus({ preventScroll: true }), 30); return () => clearTimeout(t); }, []);
      return (<Box title={title} onCancel={() => done(false)} actions={<>
        <button ref={cancelRef} type="button" className="e-btn e-btn-sec" style={btn("sec", "md")} onClick={() => done(false)}>{cancelLabel}</button>
        <button ref={okRef} type="button" className={"e-btn " + (danger ? "e-btn-dan" : "e-btn-pri")} style={danger ? { ...btn("pri", "md"), background: T.redFill || T.red600, borderColor: T.redFill || T.red600, color: T.onFill } : btn("pri", "md")} onClick={() => done(true)}>{confirmLabel}</button>
      </>}>
        {message && <div style={{ fontSize: 14, lineHeight: 1.5, color: T.ink700, whiteSpace: "pre-line" }}>{message}</div>}
      </Box>);
    }
    return <C />;
  });
}

export function showText({ title, text }) {
  if (typeof document === "undefined") return Promise.resolve();
  return mount(done => {
    function C() {
      const ref = useRef(null);
      useEffect(() => { const t = setTimeout(() => { if (ref.current) { ref.current.focus(); ref.current.select(); } }, 30); return () => clearTimeout(t); }, []);
      return (<Box title={title} width={560} onCancel={() => done()} actions={<button type="button" className="e-btn e-btn-pri" style={btn("pri", "md")} onClick={() => done()}>Fermer</button>}>
        <div style={{ fontSize: 13, color: T.ink500, marginBottom: 6 }}>Le texte est sélectionné : Ctrl + C pour le copier.</div>
        <textarea ref={ref} readOnly value={text} aria-label="Texte à copier" rows={10} style={{ width: "100%", boxSizing: "border-box", border: "1px solid " + T.line, borderRadius: 8, padding: 10, fontFamily: T.fontMono, fontSize: 13, background: T.surface, color: T.ink900, resize: "vertical" }} />
      </Box>);
    }
    return <C />;
  });
}
