// v222 (demandé : « pouvoir bouger moi-même chaque cadran et les redimensionner — KPI, page d'accueil, page Tests ») :
// grille de 12 colonnes dont chaque cadran peut être déplacé et élargi / rétréci.
// v224 (demandé : « la disposition n'est pas fluide, laisser cette action uniquement pour moi ») : réservé au propriétaire ;
// on glisse la poignée ⋮⋮ et les autres cadrans se rangent en direct (animation FLIP) ; la largeur se règle en tirant le bord droit
// (une colonne = 1/12) ou avec − + ; ◀ ▶ au clavier. Disposition gardée sur ce poste (localStorage enogia_arr_<id>) ;
// « Réinitialiser » revient à l'origine. Sur un écran étroit (< 900 px), chaque cadran prend toute la largeur.
// v226 (demandé : « je ne suis pas très libre de bouger les cadrans, ça bug un peu ») : le cadran se saisit n'importe où (en mode
// disposition) et suit la souris ; sa place se calcule d'après la position des autres cadrans (plus d'oscillation quand on survole
// un cadran qui vient de bouger) ; la page défile seule près des bords de l'écran.
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

  // FLIP : chaque cadran qui change de place glisse de l’ancienne position vers la nouvelle (180 ms, transform seulement).
  // Positions « naturelles » = rectangle à l’écran moins la translation en cours (animation ou cadran saisi).
  const natural = el => { const b = el.getBoundingClientRect(); let dx = 0, dy = 0; try { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); dx = m.m41; dy = m.m42; } catch (x) { /* pas de transform */ } return { left: b.left - dx, top: b.top - dy, width: b.width, height: b.height }; };
  const orderKey = order.join("|") + "#" + order.map(spanOf).join(",");
  useLayoutEffect(() => {
    const next = {};
    Object.entries(els.current).forEach(([k, el]) => { if (!el) return; const r = natural(el); next[k] = r; const p = rects.current[k];
      if (p && !calm() && (Math.abs(p.left - r.left) > 1 || Math.abs(p.top - r.top) > 1) && !(live && live.k === k)) {
        el.style.transition = "none"; el.style.transform = "translate(" + (p.left - r.left) + "px," + (p.top - r.top) + "px)";
        void el.offsetWidth; el.style.transition = "transform 180ms cubic-bezier(.2,.8,.2,1)"; el.style.transform = "";
      } });
    rects.current = next;
  }, [orderKey]); // eslint-disable-line

  const scroller = el => { for (let n = el && el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowY; if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n; } return null; };
  const startDrag = (k, e) => {
    if (e.button != null && e.button !== 0) return; if (e.target.closest && e.target.closest("button,[data-arr-resize]")) return; e.preventDefault();
    const el0 = els.current[k]; if (!el0) return; const r0 = natural(el0); const gx = e.clientX - r0.left, gy = e.clientY - r0.top; const sc = scroller(el0);
    let cur = baseOrder.slice(), raf = 0, last = { x: e.clientX, y: e.clientY };
    setLive({ k, order: cur });
    const follow = () => { const el = els.current[k]; if (!el) return; el.style.transition = "none"; const slot = natural(el); // le cadran suit la souris depuis sa place actuelle
      el.style.transform = "translate(" + (last.x - gx - slot.left) + "px," + (last.y - gy - slot.top) + "px)"; };
    const place = () => { // première place (dans l’ordre affiché) dont le cadran est après le pointeur
      const others = cur.filter(x => x !== k); let to = others.length;
      for (let i = 0; i < others.length; i++) { const el = els.current[others[i]]; if (!el) continue; const r = natural(el);
        if (last.y < r.top || (last.y < r.top + r.height && last.x < r.left + r.width / 2)) { to = i; break; } }
      const o = others.slice(); o.splice(to, 0, k); if (o.join("|") !== cur.join("|")) { cur = o; setLive({ k, order: o }); }
    };
    const onMove = ev => { last = { x: ev.clientX, y: ev.clientY }; if (raf) return; raf = requestAnimationFrame(() => { raf = 0;
      const d = last.y < 70 ? -16 : last.y > window.innerHeight - 70 ? 16 : 0; if (d) { if (sc) sc.scrollTop += d; else window.scrollBy(0, d); }
      place(); follow(); }); };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); if (raf) cancelAnimationFrame(raf);
      const el = els.current[k]; if (el) { el.style.transition = calm() ? "none" : "transform 160ms cubic-bezier(.2,.8,.2,1)"; el.style.transform = ""; }
      setLive(null); save({ ...lay, order: cur }); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
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
      {edit && <span style={{ fontSize: FZ.xs, color: T.ink500, alignSelf: "center", marginRight: "auto" }}>Glissez un cadran pour le déplacer, tirez son bord droit pour la largeur.</span>}
      {edit && <button type="button" onClick={() => save({ order: [], span: {} })} style={{ ...tb, padding: "0 10px" }}>Réinitialiser</button>}
      <button type="button" aria-pressed={edit} onClick={() => setEdit(v => !v)} title="Déplacer et redimensionner les cadrans de cette page" style={{ ...tb, padding: "0 12px", background: edit ? T.ink900 : T.card, color: edit ? T.card : T.ink700 }}>{edit ? "Terminer" : "Disposer les cadrans"}</button>
    </div>}
    <div ref={grid} className="enogia-arr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: GAP, alignItems: "start", gridAutoFlow: on ? "row" : "row dense", userSelect: live ? "none" : undefined }}>
      {order.map((k, i) => { const c = byId[k]; if (!c) return null; const sp = spanOf(k); const lab = labels[k] || (c.props && c.props["aria-label"]) || k; const dragging = live && live.k === k;
        return (<div key={k} ref={el => { els.current[k] = el; }} data-arr-k={k} className="enogia-arr-item" onPointerDown={on ? e => startDrag(k, e) : undefined} style={{ gridColumn: "span " + sp, minWidth: 0, position: "relative", outline: on ? "2px dashed " + (dragging ? T.teal500 : T.line) : "none", outlineOffset: 3, borderRadius: 10, opacity: dragging && live.order ? .85 : 1, zIndex: dragging ? 5 : undefined, cursor: on ? (dragging ? "grabbing" : "grab") : undefined, touchAction: on ? "none" : undefined, boxShadow: dragging && live.order ? T.shadowLg : undefined }}>
          {/* v228 (demandé : « trop brouillon, je ne veux pas voir de flèches ni de plus ») : plus de barre sur les cadrans ; au clavier,
               le cadran sélectionné se déplace avec ← → et change de largeur avec Maj + ← → */}
          {on && <span role="button" tabIndex={0} aria-label={lab + " : flèches gauche / droite pour déplacer, Maj + flèches pour la largeur"} onKeyDown={e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); const d = e.key === "ArrowLeft" ? -1 : 1; if (e.shiftKey) resize(k, d); else move(k, i + d); }}
            style={{ position: "absolute", inset: 0, zIndex: 3, borderRadius: 10 }} />}
          {dragging && live.span && <span aria-hidden="true" style={{ position: "absolute", right: 8, top: 8, zIndex: 4, background: T.ink900, color: T.card, borderRadius: 6, padding: "1px 7px", fontSize: FZ.xs, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{Math.round(sp / 12 * 100)} %</span>}
          <div style={{ pointerEvents: on ? "none" : "auto" }}>{c}</div>
          {on && <span aria-hidden="true" data-arr-resize="1" title="Tirer pour changer la largeur" onPointerDown={e => startResize(k, e)}
            style={{ position: "absolute", top: 0, bottom: 0, right: -9, width: 12, zIndex: 4, cursor: "ew-resize", touchAction: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 4, height: 40, borderRadius: 2, background: dragging && live.span ? T.teal500 : T.ink300 }} />
          </span>}
        </div>); })}
    </div>
  </div>);
}
