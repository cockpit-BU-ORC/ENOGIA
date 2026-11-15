// v355 (maquette v354-cadrans-widgets validée : « Go », relue avec le skill apple-design) : l'accueil en widgets.
// Tailles fixes sur une grille de 4 colonnes qui se remplit seule (2 colonnes sous 900 px) : Petit 1 × 2, Moyen 2 × 2, Grand 2 × 4,
// Bandeau 4 × 2, Grand bandeau 4 × 4 (lignes de 112 px). Mode édition (bouton, ou appui long) : « − » retire, le bouton de taille
// fait défiler les tailles permises, on glisse un widget pour le déplacer (les autres se décalent), on le pose au centre d'un autre
// de même taille et on attend pour former une pile (plusieurs widgets dans une case, défilement vertical, points). Galerie d'ajout
// (feuille qui monte du bas) avec aperçu dans la taille choisie. Clavier : Entrée saisit, flèches déplacent, Entrée pose.
// apple-design : retour à l'appui (0,97), le widget suit le pointeur depuis l'endroit saisi (capture), atterrit depuis le lâcher,
// animations depuis la position affichée (interruptibles), 150–300 ms, frémissement coupé si « réduire les animations ».
// Disposition = [{ t, z } | { stack: [t…], z }] ; enregistrée par onLayout (propriétaire) ; sans onLayout, lecture seule.
import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { T, FZ, btn } from "../theme";
import { ArrangeCtx } from "./Arrange";

export const WG_SIZES = { s: "Petit", m: "Moyen", l: "Grand", xl: "Bandeau", xxl: "Grand bandeau", auto: "Pleine hauteur" }; // v357 : auto = toute la largeur, hauteur du contenu
const calm = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const keyOf = it => (it.stack ? "p:" + it.stack[0] : "w:" + it.t); // stable : un widget n'est jamais deux fois sur l'accueil

export function WidgetBoard({ items, widgets, onChange, canEdit, catalog = [], label = "Widgets de l'accueil", editLabel = "Modifier l'accueil" }) {
  // items : disposition ; widgets : { id: { label, sizes, render(size) } } ; catalog : [[groupe, [[id, description]…]]]
  const [draft, setDraft] = useState(null); // ordre provisoire pendant un glisser : une seule écriture, au lâcher
  // widgets connus seulement, taille ramenée à une taille permise
  const fit = it => { const kids = it.stack ? it.stack.filter(t => widgets[t]) : null; const x = kids ? (kids.length > 1 ? { ...it, stack: kids } : { t: kids[0], z: it.z }) : it;
    const ok = (x.stack || [x.t]).map(t => widgets[t].sizes).reduce((p, q) => p.filter(z => q.includes(z))); return ok.includes(x.z) ? x : { ...x, z: ok[0] || "m" }; };
  const list = (draft || items || []).filter(it => (it.stack ? it.stack.some(t => widgets[t]) : widgets[it.t])).map(fit);
  const [edit, setEdit] = useState(false), [gallery, setGallery] = useState(false), [msg, setMsg] = useState("");
  const [held, setHeld] = useState(null), [merge, setMerge] = useState(null), [dragK, setDragK] = useState(null);
  const grid = useRef(null), before = useRef(null), drag = useRef(null), msgT = useRef(null), landing = useRef(null);
  const say = m => { setMsg(m); clearTimeout(msgT.current); msgT.current = setTimeout(() => setMsg(""), 1800); };
  const save = next => { if (!canEdit || !onChange) return; snap(); setDraft(next); onChange(next); };
  useEffect(() => { setDraft(null); }, [items]); // la disposition enregistrée est revenue : plus besoin du brouillon
  // FLIP : on relève les places affichées avant le changement, puis chaque widget glisse de là vers sa nouvelle place
  const snap = () => { const m = {}; if (grid.current) grid.current.querySelectorAll("[data-wg]").forEach(el => { m[el.dataset.wg] = el.getBoundingClientRect(); }); before.current = m; };
  useLayoutEffect(() => { const b = before.current; before.current = null; if (!b || calm() || !grid.current) return;
    grid.current.querySelectorAll("[data-wg]").forEach(el => { const k = el.dataset.wg; const from = landing.current && landing.current.k === k ? landing.current.r : b[k]; if (!from) return;
      const to = el.getBoundingClientRect(), dx = from.left - to.left, dy = from.top - to.top; if (!dx && !dy) return;
      el.style.transition = "none"; el.style.transform = "translate(" + dx + "px," + dy + "px)"; void el.offsetWidth;
      el.style.transition = "transform var(--e-dur-long) var(--e-ease)"; el.style.transform = ""; });
    landing.current = null; });
  useEffect(() => () => clearTimeout(msgT.current), []);
  useEffect(() => { const g = grid.current; if (!g || typeof ResizeObserver === "undefined") return;
    const fit = el => { const cell = el.closest(".e-wg-auto"); if (cell) cell.style.gridRow = "span " + Math.max(2, Math.ceil((el.offsetHeight + 14) / (112 + 14))); };
    const ro = new ResizeObserver(es => es.forEach(e => fit(e.target)));
    g.querySelectorAll(".e-wg-auto > .e-wg-body > *").forEach(el => { ro.observe(el); fit(el); });
    return () => ro.disconnect(); });
  useEffect(() => { if (!canEdit) setEdit(false); }, [canEdit]);

  const kOf = it => keyOf(it);
  const move = (from, to) => { if (to < 0 || to >= list.length || from === to) return; const n = list.slice(); const [m] = n.splice(from, 1); n.splice(to, 0, m); save(n); };
  const remove = i => { const n = list.slice(); n.splice(i, 1); save(n); say("Widget retiré"); };
  const sizesOf = it => { const all = (it.stack || [it.t]).map(t => (widgets[t] && widgets[t].sizes) || ["m"]); return all.reduce((a, s) => a.filter(z => s.includes(z))); };
  const resize = i => { const it = list[i], opts = sizesOf(it); if (opts.length < 2) return; const z = opts[(opts.indexOf(it.z) + 1) % opts.length]; const n = list.slice(); n[i] = { ...it, z }; save(n); say(WG_SIZES[z]); };
  const unstack = (i, t) => { const it = list[i]; const rest = it.stack.filter(x => x !== t); const n = list.slice(); n.splice(i, 1, rest.length > 1 ? { ...it, stack: rest } : { t: rest[0], z: it.z }, { t, z: it.z }); save(n); say("Sorti de la pile"); };
  const add = (t, z) => { save([{ t, z }, ...list]); setGallery(false); say((widgets[t] && widgets[t].label) + " ajouté"); };

  // ── glisser au pointeur
  const onDown = (e, i) => {
    if (e.button !== 0 || e.target.closest("[data-wg-act]")) return;
    const el = e.currentTarget, r = el.getBoundingClientRect();
    if (!edit) { if (!canEdit) return; const t0 = setTimeout(() => { setEdit(true); say("Mode édition"); }, 450);
      const stop = () => { clearTimeout(t0); window.removeEventListener("pointerup", stop); window.removeEventListener("pointermove", mv); };
      const mv = ev => { if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 8) stop(); };
      window.addEventListener("pointerup", stop); window.addEventListener("pointermove", mv); return; }
    try { el.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    drag.current = { i, k: el.dataset.wg, ox: e.clientX - r.left, oy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, started: false, clone: null, w: r.width, h: r.height, mergeK: null, mergeT: null, ready: null };
  };
  const onMove = e => { const d = drag.current; if (!d) return;
    if (!d.started) { if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 8) return; d.started = true;
      const src = grid.current.querySelector('[data-wg="' + d.k + '"]'); const c = src.cloneNode(true);
      Object.assign(c.style, { position: "fixed", zIndex: 1000, pointerEvents: "none", width: d.w + "px", height: d.h + "px", margin: 0, animation: "none", transform: "scale(1.03)", boxShadow: T.shadowLg, transition: "none" });
      c.removeAttribute("data-wg"); document.body.appendChild(c); d.clone = c; setDragK(d.k); }
    d.clone.style.left = (e.clientX - d.ox) + "px"; d.clone.style.top = (e.clientY - d.oy) + "px";
    const over = document.elementsFromPoint(e.clientX, e.clientY).map(x => x.closest && x.closest("[data-wg]")).find(x => x && x.dataset.wg !== d.k);
    if (!over) { clearTimeout(d.mergeT); d.mergeK = null; d.ready = null; setMerge(null); return; }
    const r = over.getBoundingClientRect(), cx = (e.clientX - r.left) / r.width, cy = (e.clientY - r.top) / r.height;
    const from = list.findIndex((it, j) => kOf(it, j) === d.k), to = list.findIndex((it, j) => kOf(it, j) === over.dataset.wg);
    const me = list[from], tg = list[to], center = cx > .3 && cx < .7 && cy > .3 && cy < .7;
    if (center && me && tg && me.z === tg.z) {
      if (d.mergeK !== over.dataset.wg) { clearTimeout(d.mergeT); d.mergeK = over.dataset.wg; d.ready = null; d.mergeT = setTimeout(() => { d.ready = over.dataset.wg; setMerge(over.dataset.wg); }, 450); }
      return; }
    clearTimeout(d.mergeT); d.mergeK = null; d.ready = null; setMerge(null);
    const after = (cx > .5 && r.width >= r.height) || (cy > .5 && r.height > r.width); let t = to; if (after && t < from) t++; else if (!after && t > from) t--;
    if (t !== from && t >= 0) { const n = list.slice(); const [m] = n.splice(from, 1); n.splice(t, 0, m); snap(); setDraft(n); }
  };
  const onUp = () => { const d = drag.current; drag.current = null; if (!d) return; clearTimeout(d.mergeT); setMerge(null); setDragK(null);
    if (!d.started) return;
    const r = d.clone.getBoundingClientRect(); d.clone.remove();
    if (d.ready) { const a = list.findIndex((it, j) => kOf(it, j) === d.k), b = list.findIndex((it, j) => kOf(it, j) === d.ready);
      if (a >= 0 && b >= 0) { const A = list[a], B = list[b], kids = x => (x.stack || [x.t]); const st = { stack: [...kids(B), ...kids(A).filter(t => !kids(B).includes(t))], z: B.z };
        const n = list.slice(); n[b] = st; n.splice(a, 1); save(n); say("Pile de " + st.stack.length + " widgets"); return; } }
    landing.current = { k: d.k, r }; save(list.slice()); };

  const onKey = (e, i, k) => { if (!edit || e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHeld(h => (h === k ? null : k)); say(held === k ? "Posé" : "Saisi : flèches pour déplacer, Entrée pour poser"); return; }
    if (e.key === "Escape" && held) { setHeld(null); return; }
    if (held === k && /^Arrow/.test(e.key)) { e.preventDefault(); move(i, i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1)); }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(i); } };
  // le focus suit le widget saisi au clavier
  useEffect(() => { if (!held || !grid.current) return; const el = grid.current.querySelector('[data-wg="' + held + '"]'); if (el && document.activeElement !== el) el.focus(); });

  const used = new Set(list.flatMap(it => it.stack || [it.t]));
  return (<div className="e-wg-root" style={{ "--wg-card": T.card, "--wg-surface": T.surface, "--wg-line": T.line, "--wg-ink": T.ink900, "--wg-accent": T.accentInk || T.ink900, "--wg-veil": "rgba(10,14,20,.45)", "--wg-shadow": T.shadowLg }}>
    {canEdit && <div className="e-tb" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
      {edit && <button type="button" onClick={() => setGallery(true)} style={{ ...btn("sec", "md") }}>＋ Ajouter un widget</button>}
      <button type="button" onClick={() => { setEdit(v => !v); setHeld(null); }} aria-pressed={edit} style={{ ...btn(edit ? "pri" : "sec", "md") }}>{edit ? "Terminé" : editLabel}</button>
    </div>}
    <div ref={grid} className={"e-wg" + (edit ? " e-wg-edit" : "")} role="list" aria-label={label} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {list.map((it, i) => { const k = kOf(it), kids = it.stack || [it.t], name = kids.map(t => widgets[t] ? widgets[t].label : t).join(", ");
        return (<div key={k} data-wg={k} role="listitem" tabIndex={edit ? 0 : -1} aria-label={(it.stack ? "Pile : " : "") + name + (edit ? ", " + WG_SIZES[it.z] : "")}
          className={"e-wg-cell e-wg-" + it.z + (dragK === k ? " e-wg-ghost" : "") + (merge === k ? " e-wg-merge" : "") + (held === k ? " e-wg-held" : "")}
          onPointerDown={e => onDown(e, i)} onKeyDown={e => onKey(e, i, k)}>
          {it.stack ? <Stack kids={kids} z={it.z} widgets={widgets} edit={edit} onOut={t => unstack(i, t)} /> : <div className="e-wg-body">{widgets[it.t].render(it.z)}</div>}
          {edit && <><button type="button" data-wg-act="rm" className="e-wg-rm" onClick={() => remove(i)} aria-label={"Retirer " + name}>−</button>
            {sizesOf(it).length > 1 && <button type="button" data-wg-act="size" className="e-wg-size" onClick={() => resize(i)} aria-label={"Taille : " + WG_SIZES[it.z] + ", changer"}>{WG_SIZES[it.z]}</button>}</>}
          {merge === k && <span className="e-wg-mergehint" aria-hidden="true">Lâcher pour empiler</span>}
        </div>); })}
      {list.length === 0 && <div style={{ gridColumn: "1 / -1", color: T.ink500, fontSize: FZ.sm, padding: 24, textAlign: "center" }}>{canEdit ? "Aucun widget : « Modifier l'accueil » puis « Ajouter un widget »." : "Aucun widget sur cet accueil."}</div>}
    </div>
    <span role="status" aria-live="polite" className={"e-wg-toast" + (msg ? " on" : "")}>{msg}</span>
    {gallery && <Gallery catalog={catalog} widgets={widgets} used={used} onAdd={add} onClose={() => setGallery(false)} />}
  </div>);
}

function Stack({ kids, z, widgets, edit, onOut }) {
  const pane = useRef(null), [cur, setCur] = useState(0);
  const go = n => { const p = pane.current; if (!p) return; const c = Math.max(0, Math.min(kids.length - 1, n)); p.scrollTo({ top: c * p.clientHeight, behavior: calm() ? "auto" : "smooth" }); };
  return (<>
    <div ref={pane} className="e-wg-pane" onScroll={e => { const p = e.currentTarget, c = Math.round(p.scrollTop / Math.max(1, p.clientHeight)); if (c !== cur) setCur(c); }}
      onKeyDown={e => { if (edit) return; if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); go(cur + (e.key === "ArrowDown" ? 1 : -1)); } }} tabIndex={edit ? -1 : 0} aria-label={"Pile de " + kids.length + " widgets, flèches haut et bas pour changer"}>
      {kids.map(t => widgets[t] ? <div key={t} className="e-wg-page e-wg-body">{widgets[t].render(z)}</div> : null)}
    </div>
    <span className="e-wg-dots" aria-hidden="true">{kids.map((t, j) => <i key={t} className={j === cur ? "on" : ""} />)}</span>
    {edit && kids.length > 1 && <button type="button" data-wg-act="out" className="e-wg-out" onClick={() => onOut(kids[cur])}>Sortir « {widgets[kids[cur]] ? widgets[kids[cur]].label : ""} »</button>}
  </>);
}

function Gallery({ catalog, widgets, used, onAdd, onClose }) {
  const [pick, setPick] = useState({}), [q, setQ] = useState(""), ref = useRef(null);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const match = (id, d) => !q.trim() || (widgets[id].label + " " + d).toLowerCase().includes(q.trim().toLowerCase());
  return (<div className="e-wg-veil" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="wg-gal-h" className="e-wg-sheet">
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid " + T.line, flexWrap: "wrap" }}>
        <h2 id="wg-gal-h" style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600 }}>Ajouter un widget</h2>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un widget…" aria-label="Rechercher un widget" style={{ flex: "1 1 200px", minHeight: 34, border: "1px solid " + T.line, borderRadius: 8, padding: "0 10px", background: T.card, color: T.ink900, fontSize: FZ.sm }} />
        <button type="button" onClick={onClose} style={{ ...btn("sec", "md") }}>Fermer</button>
      </div>
      <div style={{ overflow: "auto", padding: "4px 18px 22px", overscrollBehavior: "contain" }}>
        {catalog.map(([g, ids]) => { const L = ids.filter(([id, d]) => widgets[id] && match(id, d)); if (!L.length) return null;
          return (<section key={g}><h3 style={{ margin: "16px 0 8px", fontSize: 13, fontWeight: 500, color: T.ink500 }}>{g}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 12 }}>
              {L.map(([id, d]) => { const w = widgets[id], z = pick[id] || w.sizes[0];
                return (<div key={id} style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className={"e-wg-preview e-wg-pv-" + z} aria-hidden="true"><div className="e-wg-body">{w.render(z)}</div></div>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{w.label}</div><div style={{ fontSize: 12, color: T.ink500 }}>{d}</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {w.sizes.length > 1 && <span role="group" aria-label="Taille" style={{ display: "inline-flex", background: T.surfaceAlt, borderRadius: 999, padding: 2 }}>
                      {w.sizes.map(s => <button key={s} type="button" aria-pressed={s === z} onClick={() => setPick(p => ({ ...p, [id]: s }))}
                        style={{ border: "none", borderRadius: 999, padding: "4px 9px", minHeight: 26, fontSize: 12, fontWeight: 500, cursor: "pointer", background: s === z ? T.card : "transparent", color: s === z ? T.ink900 : T.ink700, boxShadow: s === z ? "0 0 0 1px " + T.line : "none", fontFamily: T.font }}>{WG_SIZES[s]}</button>)}
                    </span>}
                    <span style={{ flex: 1 }} />
                    {used.has(id) ? <span style={{ fontSize: 12, color: T.ink500 }}>Sur l'accueil</span> : <button type="button" onClick={() => onAdd(id, z)} style={{ ...btn("sec", "sm") }}>Ajouter</button>}
                  </div>
                </div>); })}
            </div></section>); })}
      </div>
    </div>
  </div>);
}

// Disposition initiale depuis l'ancienne (cadrans + largeurs sur 12) : 1–3 → Petit, 4–6 → Moyen, 7–8 → Grand, 9–12 → Bandeau
export function widgetsFromSpans(ids, spanOf, sizesOf) {
  const want = sp => (sp <= 3 ? "s" : sp <= 6 ? "m" : sp <= 8 ? "l" : "xl");
  return ids.map(t => { const ok = sizesOf(t), z = want(spanOf(t)); return { t, z: ok.includes(z) ? z : ok[0] }; });
}

// v357 (demandé : « fais-le aussi » — les cadrans des pages KPI et Tests en widgets) : remplace Arrange sur une page.
// Chaque enfant est un widget (identité = clé React, sinon aria-label) ; disposition = planning/profiles.pageLayouts[id].widgets
// (ArrangeCtx, réglée par le propriétaire) ; sans elle, tailles déduites des largeurs d'avant (spans) ou de defaults.
const idOfChild = c => { const k = c.key != null ? String(c.key).replace(/^\.\$/, "") : ""; return k && !/^\.\d+$/.test(k) ? k : (c.props && c.props["aria-label"]) || k; };
export function WidgetArrange({ id, children, spans = {}, labels = {}, sizes = {}, defaults = {}, label = "Cadrans de la page" }) {
  const ctx = useContext(ArrangeCtx), lay = (ctx && ctx.layouts && ctx.layouts[id]) || {}, save = ctx && ctx.save ? v => ctx.save(id, v) : null;
  const kids = React.Children.toArray(children).filter(c => c && c.props), widgets = {}, ids = [];
  kids.forEach(c => { const k = idOfChild(c), sp = spans[k] || 6; ids.push(k);
    widgets[k] = { label: labels[k] || c.props["aria-label"] || k, sizes: sizes[k] || (sp >= 9 ? ["xl", "xxl", "auto"] : sp >= 7 ? ["l", "m", "xl"] : ["m", "l", "xl"]), render: () => c }; });
  const items = Array.isArray(lay.widgets) ? lay.widgets : ids.map(t => ({ t, z: defaults[t] || widgets[t].sizes[0] }));
  return <WidgetBoard items={items} widgets={widgets} catalog={[["Cadrans de la page", ids.map(t => [t, ""])]]} canEdit={!!save} onChange={save ? w => save({ ...lay, widgets: w }) : undefined} label={label} editLabel="Modifier la page" />;
}
