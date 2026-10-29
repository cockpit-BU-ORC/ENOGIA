// v222 (demandé : « pouvoir bouger moi-même chaque cadran et les redimensionner — KPI, page d'accueil, page Tests ») :
// grille de 12 colonnes dont chaque cadran peut être déplacé et élargi / rétréci.
// v224 (demandé : « la disposition n'est pas fluide, laisser cette action uniquement pour moi ») : réservé au propriétaire ;
// on glisse la poignée ⋮⋮ et les autres cadrans se rangent en direct (animation FLIP) ; la largeur se règle en tirant le bord droit
// (une colonne = 1/12) ou avec − + ; ◀ ▶ au clavier. Disposition gardée sur ce poste (localStorage enogia_arr_<id>) ;
// « Réinitialiser » revient à l'origine. Sur un écran étroit (< 900 px), chaque cadran prend toute la largeur.
// Identité d'un cadran : sa clé React, sinon son aria-label.
import React, { useLayoutEffect, useRef, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { isOwner } from "../roles";

const MIN = 2, MAX = 12, GAP = 12;
const load = id => { try { const v = JSON.parse(localStorage.getItem("enogia_arr_" + id) || "null"); return v && Array.isArray(v.order) ? { order: v.order, span: v.span || {} } : { order: [], span: {} }; } catch (e) { return { order: [], span: {} }; } };
const store = (id, v) => { try { localStorage.setItem("enogia_arr_" + id, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } };
const idOf = c => { const k = c.key != null ? String(c.key).replace(/^\.\$/, "") : ""; return k && !/^\.\d+$/.test(k) ? k : (c.props && c.props["aria-label"]) || k; };
const calm = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

export function Arrange({ id, children, spans = {}, defaultSpan = 6, labels = {} }) {
  const can = isOwner();
  const items = React.Children.toArray(children).filter(c => c && c.props);
  const ids = items.map(idOf);
  const [lay, setLay] = useState(() => load(id)); const [edit, setEdit] = useState(false);
  const [live, setLive] = useState(null); // { k, order?, span? } pendant un glissement ou un redimensionnement
  const grid = useRef(null), els = useRef({}), rects = useRef({});
  const save = v => { setLay(v); store(id, v); };
  const baseOrder = [...lay.order.filter(k => ids.includes(k)), ...ids.filter(k => !lay.order.includes(k))];
  const order = (live && live.order) || baseOrder;
  const byId = Object.fromEntries(items.map((c, i) => [ids[i], c]));
  const spanOf = k => { const c = byId[k]; if (live && live.k === k && live.span) return live.span; return Number(lay.span[k]) || spans[k] || (c && c.props && Number(c.props["data-span"])) || (c && c.props && /enogia-home-wide/.test(c.props.className || "") ? 8 : defaultSpan); };
  const move = (k, to) => { const o = baseOrder.filter(x => x !== k); o.splice(Math.max(0, Math.min(o.length, to)), 0, k); save({ ...lay, order: o }); };
  const resize = (k, d) => save({ ...lay, span: { ...lay.span, [k]: Math.max(MIN, Math.min(MAX, spanOf(k) + d)) } });

  // FLIP : chaque cadran qui change de place glisse de l'ancienne position vers la nouvelle (180 ms, transform seulement).
  const orderKey = order.join("|") + "#" + order.map(spanOf).join(",");
  useLayoutEffect(() => {
    const next = {};
    Object.entries(els.current).forEach(([k, el]) => { if (!el) return; const r = el.getBoundingClientRect(); next[k] = r; const p = rects.current[k];
      if (p && !calm() && (Math.abs(p.left - r.left) > 1 || Math.abs(p.top - r.top) > 1) && !(live && live.k === k && live.span)) {
        el.style.transition = "none"; el.style.transform = "translate(" + (p.left - r.left) + "px," + (p.top - r.top) + "px)";
        void el.offsetWidth; el.style.transition = "transform 180ms cubic-bezier(.2,.8,.2,1)"; el.style.transform = "";
      } });
    rects.current = next;
  }, [orderKey]); // eslint-disable-line

  const startDrag = (k, e) => {
    if (e.button != null && e.button !== 0) return; e.preventDefault();
    let cur = baseOrder.slice();
    setLive({ k, order: cur });
    const onMove = ev => {
      const hit = document.elementFromPoint(ev.clientX, ev.clientY); const box = hit && hit.closest && hit.closest("[data-arr-k]");
      const t = box && box.getAttribute("data-arr-k"); if (!t || t === k || !grid.current || !grid.current.contains(box)) return;
      const from = cur.indexOf(k), to = cur.indexOf(t); const o = cur.filter(x => x !== k); o.splice(to, 0, k); if (from === to) return;
      cur = o; setLive({ k, order: o });
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); setLive(null); save({ ...lay, order: cur }); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };
  const startResize = (k, e) => {
    if (e.button != null && e.button !== 0) return; e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, s0 = spanOf(k); const w = grid.current ? grid.current.getBoundingClientRect().width : 1200; const col = (w - GAP * 11) / 12 + GAP;
    let n = s0; setLive({ k, span: s0 });
    const onMove = ev => { const v = Math.max(MIN, Math.min(MAX, Math.round(s0 + (ev.clientX - x0) / col))); if (v !== n) { n = v; setLive({ k, span: v }); } };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); setLive(null); save({ ...lay, span: { ...lay.span, [k]: n } }); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };

  const tb = { border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 6, minWidth: 26, minHeight: 26, fontWeight: 700, cursor: "pointer", fontFamily: T.font, fontSize: 13, padding: 0 };
  const on = can && edit;
  return (<div className="enogia-arr" style={{ minWidth: 0 }}>
    {can && <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
      {edit && <span style={{ fontSize: FZ.xs, color: T.ink500, alignSelf: "center", marginRight: "auto" }}>Glissez ⋮⋮ pour déplacer, tirez le bord droit pour la largeur.</span>}
      {edit && <button type="button" onClick={() => save({ order: [], span: {} })} style={{ ...tb, padding: "0 10px" }}>Réinitialiser</button>}
      <button type="button" aria-pressed={edit} onClick={() => setEdit(v => !v)} title="Déplacer et redimensionner les cadrans de cette page" style={{ ...tb, padding: "0 12px", background: edit ? T.ink900 : T.card, color: edit ? T.card : T.ink700 }}>{edit ? "Terminer" : "Disposer les cadrans"}</button>
    </div>}
    <div ref={grid} className="enogia-arr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: GAP, alignItems: "start", gridAutoFlow: on ? "row" : "row dense", userSelect: live ? "none" : undefined }}>
      {order.map((k, i) => { const c = byId[k]; if (!c) return null; const sp = spanOf(k); const lab = labels[k] || (c.props && c.props["aria-label"]) || k; const dragging = live && live.k === k;
        return (<div key={k} ref={el => { els.current[k] = el; }} data-arr-k={k} className="enogia-arr-item" style={{ gridColumn: "span " + sp, minWidth: 0, position: "relative", outline: on ? "2px dashed " + (dragging ? T.teal500 : T.line) : "none", outlineOffset: 3, borderRadius: 10, opacity: dragging && live.order ? .55 : 1, zIndex: dragging ? 2 : undefined }}>
          {on && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 6px", marginBottom: 6, background: T.surface, border: "1px solid " + T.line, borderRadius: 8, fontSize: FZ.xs, color: T.ink700 }}>
            <span role="button" tabIndex={-1} aria-label={"Glisser " + lab} onPointerDown={e => startDrag(k, e)} style={{ cursor: live ? "grabbing" : "grab", color: T.ink500, fontSize: 15, padding: "2px 6px", touchAction: "none", lineHeight: 1 }}>⋮⋮</span>
            <b style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lab}</b>
            <button type="button" style={tb} disabled={i === 0} onClick={() => move(k, i - 1)} aria-label={"Avancer " + lab}>◀</button>
            <button type="button" style={tb} disabled={i === order.length - 1} onClick={() => move(k, i + 1)} aria-label={"Reculer " + lab}>▶</button>
            <button type="button" style={tb} disabled={sp <= MIN} onClick={() => resize(k, -1)} aria-label={"Rétrécir " + lab}>−</button>
            <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 34, textAlign: "center" }}>{sp}/12</span>
            <button type="button" style={tb} disabled={sp >= MAX} onClick={() => resize(k, 1)} aria-label={"Élargir " + lab}>+</button>
          </div>}
          <div style={{ pointerEvents: on ? "none" : "auto" }}>{c}</div>
          {on && <span aria-hidden="true" title="Tirer pour changer la largeur" onPointerDown={e => startResize(k, e)}
            style={{ position: "absolute", top: 0, bottom: 0, right: -9, width: 12, cursor: "ew-resize", touchAction: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 4, height: 40, borderRadius: 2, background: dragging && live.span ? T.teal500 : T.ink300 }} />
          </span>}
        </div>); })}
    </div>
  </div>);
}
