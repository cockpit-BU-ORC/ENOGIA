// v222 (demandé : « pouvoir bouger moi-même chaque cadran et les redimensionner — KPI, page d'accueil, page Tests ») :
// grille de 12 colonnes dont chaque cadran peut être déplacé et élargi / rétréci.
// v224 (demandé : « la disposition n'est pas fluide, laisser cette action uniquement pour moi ») : réservé au propriétaire.
// v226 : le cadran se saisit n'importe où (en mode disposition) et suit la souris ; la page défile seule près des bords.
// v230 (demandé : « régler leurs hauteurs et les positionner où je veux sans blocage ») : placement libre. Chaque cadran a une
// place { x, y, w, h } (x / w en colonnes sur 12, y / h en pas de 8 px) ; on le pose où l'on veut, y compris en laissant du vide ;
// seuls les cadrans qu'il recouvre descendent juste en dessous. La largeur se tire au bord droit, la hauteur au bord bas, les
// deux au coin. Au premier déplacement, la disposition actuelle est relevée telle qu'elle s'affiche (pas de saut).
// Clavier : ← → ↑ ↓ déplacent le cadran sélectionné, Maj + flèches changent sa largeur / sa hauteur.
// Disposition gardée sur ce poste (localStorage enogia_arr_<id>) ou partagée (layout / onLayout, ex. accueil d'un poste) ;
// « Réinitialiser » revient à l'origine. Sur un écran étroit (< 900 px), chaque cadran prend toute la largeur, dans l'ordre des places.
// Identité d'un cadran : sa clé React, sinon son aria-label.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { isOwner } from "../roles";

const MIN = 2, MAX = 12, GAP = 12, ROW = 8, MINH = 8;
const load = id => { try { const v = JSON.parse(localStorage.getItem("enogia_arr_" + id) || "null"); return v && typeof v === "object" ? { order: Array.isArray(v.order) ? v.order : [], span: v.span || {}, pos: v.pos || {} } : { order: [], span: {}, pos: {} }; } catch (e) { return { order: [], span: {}, pos: {} }; } };
const store = (id, v) => { try { localStorage.setItem("enogia_arr_" + id, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } };
const idOf = c => { const k = c.key != null ? String(c.key).replace(/^\.\$/, "") : ""; return k && !/^\.\d+$/.test(k) ? k : (c.props && c.props["aria-label"]) || k; };
const calm = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const narrowNow = () => { try { return window.matchMedia("(max-width: 900px)").matches; } catch (e) { return false; } };
const norm = p => { const w = Math.max(MIN, Math.min(MAX, Math.round(+p.w) || 6)); return { w, x: Math.max(0, Math.min(MAX - w, Math.round(+p.x) || 0)), y: Math.max(0, Math.round(+p.y) || 0), h: Math.max(MINH, Math.round(+p.h) || 30) }; };
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
// Le cadran k garde sa place ; les autres (du haut vers le bas) descendent seulement s'ils recouvrent un cadran déjà posé.
export const resolve = (P, k) => { const out = {}, placed = []; if (k && P[k]) { out[k] = P[k]; placed.push(P[k]); }
  Object.keys(P).filter(o => o !== k).sort((a, b) => P[a].y - P[b].y || P[a].x - P[b].x).forEach(o => { const p = { ...P[o] };
    for (let g = 0; g < 500; g++) { const c = placed.find(q => hit(p, q)); if (!c) break; p.y = c.y + c.h; }
    placed.push(p); out[o] = p; });
  return out; };

export function Arrange({ id, children, spans = {}, defaultSpan = 6, labels = {}, layout, onLayout, catalog, onAdd, onRemove }) {
  const can = isOwner();
  const items = React.Children.toArray(children).filter(c => c && c.props);
  const ids = items.map(idOf);
  const [local, setLocal] = useState(() => load(id)); const [edit, setEdit] = useState(false);
  const [narrow, setNarrow] = useState(narrowNow);
  useEffect(() => { let m; try { m = window.matchMedia("(max-width: 900px)"); } catch (e) { return undefined; } const f = () => setNarrow(m.matches);
    if (m.addEventListener) m.addEventListener("change", f); else if (m.addListener) m.addListener(f);
    return () => { if (m.removeEventListener) m.removeEventListener("change", f); else if (m.removeListener) m.removeListener(f); }; }, []);
  // v230 : une disposition partagée s'applique à tout le monde ; seul onLayout (propriétaire) la modifie.
  const shared = !!layout;
  const lay = shared ? { order: Array.isArray(layout.order) ? layout.order : [], span: layout.span || {}, pos: layout.pos || {} } : local;
  const [live, setLive] = useState(null); // { k, pos, mode: "drag" | "size" } pendant un glissement ou un redimensionnement
  const grid = useRef(null), els = useRef({}), rects = useRef({});
  const save = v => { if (shared) { if (onLayout) onLayout({ ...layout, ...v }); } else { setLocal(v); store(id, v); } };
  const byId = Object.fromEntries(items.map((c, i) => [ids[i], c]));
  const spanOf = k => { const c = byId[k]; return Number(lay.span[k]) || spans[k] || (c && c.props && Number(c.props["data-span"])) || (c && c.props && /enogia-home-wide/.test(c.props.className || "") ? 8 : defaultSpan); };

  // Places de tous les cadrans affichés : celles enregistrées, puis les cadrans nouveaux posés en dessous.
  const fullPos = base => { const P = {}; let bottom = 0;
    ids.forEach(k => { if (base[k]) { P[k] = norm(base[k]); bottom = Math.max(bottom, P[k].y + P[k].h); } });
    ids.forEach(k => { if (!P[k]) { P[k] = norm({ x: 0, y: bottom, w: spanOf(k), h: 30 }); bottom += 30; } });
    return resolve(P, null); };
  const hasPos = ids.some(k => lay.pos[k]);
  const free = !narrow && (hasPos || !!live);
  const pos = live ? live.pos : hasPos ? fullPos(lay.pos) : null;
  const flowOrder = pos ? ids.slice().sort((a, b) => pos[a].y - pos[b].y || pos[a].x - pos[b].x) : [...lay.order.filter(k => ids.includes(k)), ...ids.filter(k => !lay.order.includes(k))];

  // Position « naturelle » = rectangle à l'écran moins la translation en cours (animation ou cadran saisi).
  const natural = el => { const b = el.getBoundingClientRect(); let dx = 0, dy = 0; try { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); dx = m.m41; dy = m.m42; } catch (x) { /* pas de transform */ } return { left: b.left - dx, top: b.top - dy, width: b.width, height: b.height }; };
  const metrics = () => { const g = grid.current ? grid.current.getBoundingClientRect() : { left: 0, top: 0, width: 1200 }; return { g, col: (g.width - GAP * 11) / 12 + GAP }; };
  // Relève la disposition telle qu'elle s'affiche (mode libre : places enregistrées ; sinon mesure des cadrans).
  const current = () => { if (pos) return pos; const { g, col } = metrics(); const P = {};
    ids.forEach(k => { const el = els.current[k]; const w = spanOf(k); if (!el) { P[k] = norm({ x: 0, y: 0, w, h: 30 }); return; } const r = natural(el);
      P[k] = norm({ x: Math.round((r.left - g.left) / col), y: Math.round((r.top - g.top) / ROW), w, h: Math.round((r.height + GAP) / ROW) }); });
    return resolve(P, null); };

  // FLIP : chaque cadran qui change de place glisse de l'ancienne position vers la nouvelle (180 ms, transform seulement).
  const posKey = (free ? "f" : "o") + JSON.stringify(pos || flowOrder.map(k => k + ":" + spanOf(k)));
  useLayoutEffect(() => {
    const next = {};
    Object.entries(els.current).forEach(([k, el]) => { if (!el) return; const r = natural(el); next[k] = r; const p = rects.current[k];
      if (p && !calm() && (Math.abs(p.left - r.left) > 1 || Math.abs(p.top - r.top) > 1) && !(live && live.k === k && live.mode === "drag")) {
        el.style.transition = "none"; el.style.transform = "translate(" + (p.left - r.left) + "px," + (p.top - r.top) + "px)";
        void el.offsetWidth; el.style.transition = "transform 180ms cubic-bezier(.2,.8,.2,1)"; el.style.transform = "";
      } });
    rects.current = next;
  }, [posKey]); // eslint-disable-line

  const scroller = el => { for (let n = el && el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowY; if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n; } return null; };
  const track = (onMove, onEnd) => { let raf = 0, last = null;
    const mv = ev => { last = ev; if (raf) return; raf = requestAnimationFrame(() => { raf = 0; onMove(last); }); };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); if (raf) cancelAnimationFrame(raf); onEnd(); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up); };

  const startDrag = (k, e) => {
    if (narrow || (e.button != null && e.button !== 0)) return; if (e.target.closest && e.target.closest("button,select,[data-arr-resize]")) return; e.preventDefault();
    const el0 = els.current[k]; if (!el0) return; const r0 = natural(el0); const gx = e.clientX - r0.left, gy = e.clientY - r0.top; const sc = scroller(el0);
    const P0 = current(); let P = P0, last = { x: e.clientX, y: e.clientY };
    setLive({ k, pos: P, mode: "drag" });
    const follow = () => { const el = els.current[k]; if (!el) return; el.style.transition = "none"; const slot = natural(el); // le cadran suit la souris depuis sa place actuelle
      el.style.transform = "translate(" + (last.x - gx - slot.left) + "px," + (last.y - gy - slot.top) + "px)"; };
    track(ev => { last = { x: ev.clientX, y: ev.clientY };
      const d = last.y < 70 ? -16 : last.y > window.innerHeight - 70 ? 16 : 0; if (d) { if (sc) sc.scrollTop += d; else window.scrollBy(0, d); }
      const { g, col } = metrics(); const p = P0[k];
      const x = Math.max(0, Math.min(MAX - p.w, Math.round((last.x - gx - g.left) / col))), y = Math.max(0, Math.round((last.y - gy - g.top) / ROW));
      if (x !== P[k].x || y !== P[k].y) { P = resolve({ ...P0, [k]: { ...p, x, y } }, k); setLive({ k, pos: P, mode: "drag" }); }
      follow(); },
    () => { const el = els.current[k]; if (el) { el.style.transition = calm() ? "none" : "transform 160ms cubic-bezier(.2,.8,.2,1)"; el.style.transform = ""; }
      setLive(null); save({ ...lay, pos: P }); });
  };
  const startResize = (k, e, dir) => {
    if (e.button != null && e.button !== 0) return; e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, y0 = e.clientY; const P0 = current(); const p = P0[k]; const { col } = metrics(); let P = P0;
    setLive({ k, pos: P, mode: "size" });
    track(ev => { const w = dir === "y" ? p.w : Math.max(MIN, Math.min(MAX - p.x, Math.round(p.w + (ev.clientX - x0) / col)));
      const h = dir === "x" ? p.h : Math.max(MINH, Math.round(p.h + (ev.clientY - y0) / ROW));
      if (w !== P[k].w || h !== P[k].h) { P = resolve({ ...P0, [k]: { ...p, w, h } }, k); setLive({ k, pos: P, mode: "size" }); } },
    () => { setLive(null); save({ ...lay, pos: P }); });
  };
  const nudge = (k, e) => { const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0, dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0; if (!dx && !dy) return; e.preventDefault();
    const P0 = current(), p = P0[k]; const n = e.shiftKey ? norm({ ...p, w: p.w + dx, h: p.h + dy * 4 }) : norm({ ...p, x: p.x + dx, y: p.y + dy * 4 });
    save({ ...lay, pos: resolve({ ...P0, [k]: n }, k) }); };

  const tb = { border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 6, minWidth: 26, minHeight: 26, fontWeight: 700, cursor: "pointer", fontFamily: T.font, fontSize: 13, padding: 0 };
  const on = can && edit && !!(onLayout || !shared);
  const grip = (k, dir, st, cursor) => <span aria-hidden="true" data-arr-resize="1" title={dir === "x" ? "Tirer pour la largeur" : dir === "y" ? "Tirer pour la hauteur" : "Tirer pour la largeur et la hauteur"} onPointerDown={e => startResize(k, e, dir)}
    style={{ position: "absolute", zIndex: 4, cursor, touchAction: "none", display: "flex", alignItems: "center", justifyContent: "center", ...st }} />;
  const ghost = live && live.mode === "drag" && pos && pos[live.k];
  return (<div className="enogia-arr" style={{ minWidth: 0 }}>
    {can && (onLayout || !shared) ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
      {edit && <span style={{ fontSize: FZ.xs, color: T.ink500, alignSelf: "center", marginRight: "auto" }}>Glissez un cadran où vous voulez ; tirez son bord droit pour la largeur, son bord bas pour la hauteur.</span>}
      {edit && catalog && catalog.length > 0 && onAdd && <select aria-label="Ajouter un cadran" value="" onChange={e => { if (e.target.value) onAdd(e.target.value); }} style={{ ...tb, padding: "0 8px", fontWeight: 600 }}><option value="">Ajouter un cadran…</option>{catalog.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
      {edit && <button type="button" onClick={() => { if (shared) onLayout({ ...layout, order: [], span: {}, pos: {} }); else save({ order: [], span: {}, pos: {} }); }} style={{ ...tb, padding: "0 10px" }}>Réinitialiser</button>}
      <button type="button" aria-pressed={edit} onClick={() => setEdit(v => !v)} title="Déplacer et redimensionner les cadrans de cette page" style={{ ...tb, padding: "0 12px", background: edit ? T.ink900 : T.card, color: edit ? T.card : T.ink700 }}>{edit ? "Terminer" : "Disposer les cadrans"}</button>
    </div> : null}
    <div ref={grid} className={"enogia-arr-grid" + (free ? " enogia-arr-free" : "")} style={free
      ? { display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", columnGap: GAP, rowGap: 0, gridAutoRows: ROW + "px", position: "relative", userSelect: live ? "none" : undefined }
      : { display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: GAP, alignItems: "start", gridAutoFlow: "row dense", userSelect: live ? "none" : undefined }}>
      {ghost && <div aria-hidden="true" style={{ gridColumn: (ghost.x + 1) + " / span " + ghost.w, gridRow: (ghost.y + 1) + " / span " + ghost.h, marginBottom: GAP, border: "2px dashed " + T.teal500, borderRadius: 10, background: T.panelDim || "transparent", opacity: .6 }} />}
      {(free ? ids : flowOrder).map(k => { const c = byId[k]; if (!c) return null; const lab = labels[k] || (c.props && c.props["aria-label"]) || k; const act = live && live.k === k;
        const p = free ? pos[k] : null; const sp = p ? p.w : spanOf(k);
        const place = p ? { gridColumn: (p.x + 1) + " / span " + p.w, gridRow: (p.y + 1) + " / span " + p.h } : { gridColumn: "span " + sp };
        return (<div key={k} ref={el => { els.current[k] = el; }} data-arr-k={k} className="enogia-arr-item" onPointerDown={on ? e => startDrag(k, e) : undefined}
          style={{ ...place, minWidth: 0, minHeight: 0, position: "relative", outline: on ? "2px dashed " + (act ? T.teal500 : T.line) : "none", outlineOffset: 3, borderRadius: 10, marginBottom: p ? GAP : undefined, opacity: act && live.mode === "drag" ? .9 : 1, zIndex: act ? 5 : undefined, cursor: on ? (act && live.mode === "drag" ? "grabbing" : "grab") : undefined, touchAction: on ? "none" : undefined, boxShadow: act && live.mode === "drag" ? T.shadowLg : undefined }}>
          {on && <span role="button" tabIndex={0} aria-label={lab + " : flèches pour déplacer, Maj + flèches pour la largeur et la hauteur"} onKeyDown={e => nudge(k, e)}
            style={{ position: "absolute", inset: 0, zIndex: 3, borderRadius: 10 }} />}
          {on && onRemove && <button type="button" data-arr-resize="1" onClick={() => onRemove(k)} aria-label={"Retirer « " + lab + " » de la page"} style={{ position: "absolute", right: 8, top: 8, zIndex: 4, border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 6, padding: "0 8px", minHeight: 24, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Retirer</button>}
          {act && live.mode === "size" && <span aria-hidden="true" style={{ position: "absolute", right: 8, bottom: 8, zIndex: 4, background: T.ink900, color: T.card, borderRadius: 6, padding: "1px 7px", fontSize: FZ.xs, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{Math.round(sp / 12 * 100)} % · {p ? p.h * ROW - GAP : ""} px</span>}
          <div className={p ? "enogia-arr-fit" : undefined} style={{ pointerEvents: on ? "none" : "auto", height: p ? "100%" : undefined, overflow: p ? "auto" : undefined }}>{c}</div>
          {on && <span>
            {grip(k, "x", { top: 0, bottom: 14, right: -9, width: 12 }, "ew-resize")}
            {grip(k, "y", { left: 0, right: 14, bottom: -9, height: 12 }, "ns-resize")}
            {grip(k, "xy", { right: -9, bottom: -9, width: 18, height: 18 }, "nwse-resize")}
            <span aria-hidden="true" style={{ position: "absolute", right: -5, top: "50%", marginTop: -20, width: 4, height: 40, borderRadius: 2, background: act && live.mode === "size" ? T.teal500 : T.ink300, pointerEvents: "none", zIndex: 4 }} />
            <span aria-hidden="true" style={{ position: "absolute", bottom: -5, left: "50%", marginLeft: -20, height: 4, width: 40, borderRadius: 2, background: act && live.mode === "size" ? T.teal500 : T.ink300, pointerEvents: "none", zIndex: 4 }} />
          </span>}
        </div>); })}
    </div>
  </div>);
}
