// v317 (demandé : « pouvoir rajouter des réactions emoji, comme un pouce en l'air ») : réactions sous un commentaire.
// Données : comments[PJ][i].reactions = { "👍": [adresses] } ; enregistrement par mentionCtx.react(pj, idx, emoji) (App).
import React, { useState, useRef, useEffect } from "react";
import { T, FZ } from "../theme";
import { useMentions } from "../mentionContext";
import { REACTIONS, lc, nameFromEmail } from "../mentions";

export function Reactions({ c, pj, idx }) {
  const { react, me, options } = useMentions();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const k = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("pointerdown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  if (!react) return null;
  const r = (c && c.reactions) || {};
  const nameOf = e => ((options || []).find(o => lc(o.email) === lc(e)) || {}).name || nameFromEmail(e);
  const chip = on => ({ display: "inline-flex", alignItems: "center", gap: 4, minHeight: 26, padding: "0 8px", borderRadius: 999, border: "1px solid " + (on ? T.accent || T.teal500 : T.line), background: on ? T.accentSoft || T.teal100 : T.card, color: T.ink700, fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", fontFamily: T.font });
  const used = REACTIONS.filter(e => (r[e] || []).length).concat(Object.keys(r).filter(e => !REACTIONS.includes(e) && (r[e] || []).length));
  return (<div ref={box} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 6, position: "relative" }}>
    {used.map(e => { const who = r[e] || [], on = !!me && who.map(lc).includes(lc(me));
      return <button key={e} type="button" aria-pressed={on} onClick={() => react(pj, idx, e)} title={who.map(nameOf).join(", ")} aria-label={e + " " + who.length + " — " + who.map(nameOf).join(", ")} style={chip(on)}>
        <span aria-hidden="true">{e}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{who.length}</span></button>; })}
    <button type="button" aria-expanded={open} aria-label="Ajouter une réaction" onClick={() => setOpen(v => !v)} className="e-hov-ink"
      style={{ ...chip(false), color: T.ink500, borderStyle: "dashed", "--e-hov-ink": T.ink900 }}>＋ Réagir</button>
    {open && <div role="menu" aria-label="Réactions" style={{ position: "absolute", left: 0, bottom: "calc(100% + 4px)", zIndex: 30, display: "flex", gap: 2, padding: 4, background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowMd }}>
      {REACTIONS.map(e => { const on = !!me && (r[e] || []).map(lc).includes(lc(me));
        return <button key={e} type="button" role="menuitemcheckbox" aria-checked={on} aria-label={"Réagir " + e} onClick={() => { react(pj, idx, e); setOpen(false); }}
          style={{ width: 34, height: 34, border: "none", borderRadius: 8, background: on ? (T.accentSoft || T.teal100) : "transparent", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>{e}</button>; })}
    </div>}
  </div>);
}
