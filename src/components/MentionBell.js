import React, { useState, useEffect, useMemo } from "react";
import { T, FZ } from "../theme";
import { openMentionsFor, nameFromEmail } from "../mentions";
import { relTime, getPjMeta } from "../pjMeta";

// v152 — Cloche de l'en-tête : les demandes où l'on est cité (@) et qu'on n'a pas encore marquées « traitées », tous PJ confondus.
export function MentionBell({ comments, me, data, resolveComment, onOpen, canSeePrivate }) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => openMentionsFor(comments, me).filter(x => canSeePrivate || !x.c.private), [comments, me, canSeePrivate]); // un compte sans accès Manager ne voit jamais un message privé
  useEffect(() => {
    if (!open) return;
    const k = e => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  if (!me) return null;
  const n = items.length;
  const nameOf = pj => { const r = (data || []).find(x => x.pj === pj); return r ? getPjMeta(pj, r).nomProjet || "" : ""; };
  return (<div style={{ position: "relative" }}>
    <button onClick={() => setOpen(v => !v)} title={n ? n + " notification" + (n > 1 ? "s" : "") + " à traiter (cité ou chef de projet)" : "Aucune demande à traiter"} aria-label="Notifications : demandes où vous êtes cité" aria-expanded={open}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, padding: 0, border: "1px solid " + (open ? T.violet500 + "66" : "transparent"), borderRadius: 9, cursor: "pointer", background: open ? T.violet100 : "transparent", color: n ? T.violet600 : T.ink500 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      {n > 0 && <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 999, background: T.violet600, color: "#fff", fontSize:11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px", fontFamily: T.font }}>{n > 99 ? "99+" : n}</span>}
    </button>
    {open && <>
      <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
      <div role="dialog" aria-label="À traiter : vous êtes cité ou chef de projet" style={{ position: "absolute", right: 0, top: 38, width: 380, maxWidth: "calc(100vw - 24px)", maxHeight: 440, overflowY: "auto", zIndex: 9999, background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: 8 }}>
        <div style={{ padding: "4px 8px 8px", fontSize: FZ.sm, fontWeight: 800, color: T.ink900 }}>À traiter : vous êtes cité ou chef de projet {n > 0 && <span style={{ color: T.violet600 }}>({n})</span>}</div>
        {n === 0 && <div style={{ padding: "14px 8px", fontSize: FZ.sm, color: T.ink500, textAlign: "center" }}>Rien à traiter pour l'instant.</div>}
        {items.map(({ pj, idx, c }) => (<div key={pj + "-" + idx} style={{ padding: "8px", borderRadius: 8, borderTop: "1px solid " + T.surface, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => { setOpen(false); onOpen(pj); }} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: T.fontMono, fontWeight: 800, fontSize: FZ.sm, color: T.teal600 }}>{pj}</button>
            <span style={{ fontSize: FZ.xs, color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{nameOf(pj)}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{relTime(c.date)}</span>
          </div>
          <div style={{ fontSize: FZ.xs, color: T.ink700, whiteSpace: "pre-wrap", lineHeight: 1.4 }}><b>{c.author || nameFromEmail("")}</b> : {String(c.text || "").length > 220 ? String(c.text).slice(0, 219) + "…" : c.text}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { setOpen(false); onOpen(pj); }} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "2px 9px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>{canSeePrivate ? "Ouvrir la fiche" : "Ouvrir le PJ"}</button>
            <button onClick={() => resolveComment(pj, idx, me, true)} style={{ border: "1px solid " + T.violet500, background: T.violet100, color: T.violet600, borderRadius: 8, padding: "2px 9px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>✓ Traité</button>
          </div>
        </div>))}
      </div>
    </>}
  </div>);
}
