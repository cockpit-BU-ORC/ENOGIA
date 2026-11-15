import React, { useState, useRef, useEffect } from "react";
import { T, FZ } from "../theme";
import { typedMentions, mentionQueryAt, suggestMentions, insertMention, firstNameSpan } from "../mentions";
import { personTint } from "../pjMeta";
import { useMentions } from "../mentionContext";

// Position (en px, dans la zone de texte) du curseur : on recopie le texte dans un calque invisible de même police.
function caretXY(ta, pos) {
  const cs = window.getComputedStyle(ta), d = document.createElement("div");
  ["fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "textTransform", "wordSpacing", "textIndent", "tabSize"].forEach(k => { d.style[k] = cs[k]; });
  d.style.position = "absolute"; d.style.visibility = "hidden"; d.style.whiteSpace = "pre-wrap"; d.style.wordWrap = "break-word"; d.style.boxSizing = "border-box"; d.style.width = ta.clientWidth + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0) + "px"; d.style.top = "0"; d.style.left = "0";
  d.textContent = ta.value.slice(0, pos);
  const m = document.createElement("span"); m.textContent = "\u200b"; d.appendChild(m);
  document.body.appendChild(d);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35;
  const r = { x: m.offsetLeft, y: m.offsetTop - ta.scrollTop, lh };
  document.body.removeChild(d);
  return r;
}

// Zone de texte « à la Gmail » : on tape @ puis le début d'un PRÉNOM, une petite fenêtre s'ouvre sous le curseur avec les personnes
// (avatar, nom, adresse) ; flèches + Entrée/Tab ou clic pour choisir, Échap pour fermer. La liste complète n'est jamais affichée.
export function MentionTextarea({ value, onChange, onKeyDown, options, style, ...rest }) {
  const ctx = useMentions();
  const opts = options || ctx.options;
  const ref = useRef(null), listRef = useRef(null);
  const [q, setQ] = useState(null);
  const [sel, setSel] = useState(0);
  const [pos, setPos] = useState({ x: 8, y: 30 });
  const text = value || "";
  const list = q ? suggestMentions(opts.filter(o => o.email !== ctx.me), q.query, typedMentions(text, opts)) : []; // on ne se tague pas soi-même
  const refresh = (ta, t, caret) => {
    const nq = mentionQueryAt(t, caret); setQ(nq); setSel(0);
    if (nq && ta) { try { const c = caretXY(ta, nq.start); setPos({ x: Math.min(Math.max(c.x, 4), Math.max(4, ta.clientWidth - 300)), y: c.y + c.lh + 4 }); } catch (e) { setPos({ x: 8, y: 30 }); } }
  };
  useEffect(() => { const el = listRef.current && listRef.current.children[sel]; if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); }, [sel]);
  const pick = o => {
    const caret = ref.current ? ref.current.selectionStart : text.length;
    const r = insertMention(text, caret, q, o);
    onChange({ target: { value: r.text } });
    setQ(null);
    requestAnimationFrame(() => { const el = ref.current; if (el) { el.focus(); el.setSelectionRange(r.caret, r.caret); } });
  };
  const keyDown = e => {
    if (q && list.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => (s + 1) % list.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => (s - 1 + list.length) % list.length); return; }
      if ((e.key === "Enter" && !e.metaKey && !e.ctrlKey) || e.key === "Tab") { e.preventDefault(); pick(list[sel]); return; }
      if (e.key === "Escape") { e.preventDefault(); setQ(null); return; }
    }
    if (onKeyDown) onKeyDown(e);
  };
  return (<div style={{ position: "relative", flex: "1 1 auto", minWidth: 0, width: "100%" }}>
    <textarea ref={ref} value={text} {...rest} style={{ ...style, flex: undefined, width: "100%", boxSizing: "border-box" }}
      onChange={e => { onChange(e); refresh(e.target, e.target.value, e.target.selectionStart); }}
      onKeyDown={keyDown} onKeyUp={e => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) refresh(e.target, text, e.target.selectionStart); }}
      onClick={e => refresh(e.target, text, e.target.selectionStart)} onBlur={() => setTimeout(() => setQ(null), 150)} />
    {q && list.length === 0 && <div role="status" style={{ position: "absolute", left: pos.x, top: pos.y, width: 300, zIndex: 60, background: T.card, border: "1px solid " + T.line, borderRadius: 8, boxShadow: "0 4px 18px rgba(0,0,0,.18)", padding: "10px 14px", fontSize: FZ.xs, color: T.ink500, lineHeight: 1.45 }}>
      {opts.filter(o => o.email !== ctx.me).length === 0
        ? "Aucune autre personne ne s'est encore connectée au site : elle apparaîtra ici dès sa première connexion."
        : "Aucun prénom ne commence par « " + q.query + " »."}
    </div>}
    {q && list.length > 0 && <div ref={listRef} role="listbox" aria-label="Personnes à taguer" style={{ position: "absolute", left: pos.x, top: pos.y, width: 300, maxHeight: 5 * 52 + 8, overflowY: "auto", zIndex: 60, background: T.card, border: "1px solid " + T.line, borderRadius: 8, boxShadow: T.shadowLg, padding: "4px 0" }}>
      {list.map((o, i) => { const [a, b] = firstNameSpan(o.name), n = Math.min(q.query.length, b - a); return (
        <div key={o.email} role="option" aria-selected={i === sel} onMouseDown={e => { e.preventDefault(); pick(o); }} onMouseEnter={() => setSel(i)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 14px", height: 52, boxSizing: "border-box", cursor: "pointer", background: i === sel ? T.surfaceAlt : "transparent" }}>
          <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: "50%", background: personTint(o.name)[0], color: T.onFill, fontSize: FZ.sm, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{(o.name.slice(a, a + 1) || "?").toUpperCase()}</span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: FZ.sm, color: T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.name.slice(0, a)}<b>{o.name.slice(a, a + n)}</b>{o.name.slice(a + n)}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.email}</span>
          </span>
        </div>); })}
    </div>}
  </div>);
}

// Chef(s) de projet à prévenir automatiquement pour ces PJ : [{ name, account }] (account = compte connecté ou null).
export function chefsFor(ctx, pjs) {
  const seen = new Set(), out = [];
  (pjs || []).forEach(pj => { const c = ctx.chefOf ? ctx.chefOf(pj) : null; if (c && c.name && !seen.has(c.name)) { seen.add(c.name); out.push(c); } });
  return out;
}

// Sous la zone de texte : qui est tagué, chef de projet prévenu d'office + case « Prévenir par e-mail ».
export function MentionPicker({ text, options, pjs }) {
  const ctx = useMentions();
  const opts = options || ctx.options;
  const chefs = chefsFor(ctx, pjs);
  const tagged = typedMentions(text, opts || []);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
    {tagged.length > 0 ? <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {tagged.map(o => <span key={o.email} title={o.email} style={{ border: "1px solid " + T.violet500, background: T.violet100, color: T.violet600, borderRadius: 999, padding: "1px 9px", fontSize: FZ.xs, fontWeight: 500 }}>@ {o.name}</span>)}
      <span style={{ fontSize: FZ.xs, color: T.violet600 }}>{tagged.length > 1 ? "verront" : "verra"} cette demande dans {tagged.length > 1 ? "leur" : "sa"} cloche et pourr{tagged.length > 1 ? "ont" : "a"} la marquer « traitée ».</span>
    </div> : <div style={{ fontSize: FZ.xs, color: T.ink300 }}>Tapez @ pour taguer un collègue.</div>}
    {chefs.map(c => <div key={c.name} style={{ fontSize: FZ.xs, color: c.account ? T.teal600 : T.ink500 }}>
      {c.account
        ? (c.account.email === ctx.me ? "Vous êtes le chef de projet : pas de notification à vous envoyer." : "✓ Chef de projet " + c.name + " prévenu automatiquement.")
        : "Chef de projet " + c.name + " : pas encore connecté au site, il ne pourra être prévenu qu'après sa première connexion."}
    </div>)}
  </div>);
}
