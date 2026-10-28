// v222 (demandé : « pouvoir bouger moi-même chaque cadran et les redimensionner — KPI, page d'accueil, page Tests ») :
// grille de 12 colonnes dont chaque cadran peut être déplacé (glisser ⋮⋮, ou ◀ ▶ au clavier) et élargi / rétréci (− +).
// La disposition est propre à chaque page et gardée sur ce poste (localStorage enogia_arr_<id>) ; « Réinitialiser » revient
// à la disposition d'origine. Sur un écran étroit (< 900 px), chaque cadran prend toute la largeur.
// Identité d'un cadran : sa clé React, sinon son aria-label.
import React, { useState } from "react";
import { T, FZF as FZ } from "../theme";

const STEPS = [3, 4, 5, 6, 7, 8, 12];
const load = id => { try { const v = JSON.parse(localStorage.getItem("enogia_arr_" + id) || "null"); return v && Array.isArray(v.order) ? { order: v.order, span: v.span || {} } : { order: [], span: {} }; } catch (e) { return { order: [], span: {} }; } };
const store = (id, v) => { try { localStorage.setItem("enogia_arr_" + id, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } };
const idOf = c => { const k = c.key != null ? String(c.key).replace(/^\.\$/, "") : ""; return k && !/^\.\d+$/.test(k) ? k : (c.props && c.props["aria-label"]) || k; };

export function Arrange({ id, children, spans = {}, defaultSpan = 6, labels = {} }) {
  const items = React.Children.toArray(children).filter(c => c && c.props);
  const ids = items.map(idOf);
  const [lay, setLay] = useState(() => load(id)); const [edit, setEdit] = useState(false); const [drag, setDrag] = useState(null); const [over, setOver] = useState(null);
  const save = v => { setLay(v); store(id, v); };
  const order = [...lay.order.filter(k => ids.includes(k)), ...ids.filter(k => !lay.order.includes(k))];
  const spanOf = (k, c) => Number(lay.span[k]) || spans[k] || (c && c.props && Number(c.props["data-span"])) || (c && c.props && /enogia-home-wide/.test(c.props.className || "") ? 8 : defaultSpan);
  const byId = Object.fromEntries(items.map((c, i) => [ids[i], c]));
  const move = (k, to) => { const o = order.filter(x => x !== k); o.splice(Math.max(0, Math.min(o.length, to)), 0, k); save({ ...lay, order: o }); };
  const resize = (k, dir) => { const cur = spanOf(k, byId[k]); const i = STEPS.findIndex(x => x >= cur); const n = STEPS[Math.max(0, Math.min(STEPS.length - 1, (i < 0 ? STEPS.length - 1 : i) + dir))]; save({ ...lay, span: { ...lay.span, [k]: n } }); };
  const tb = { border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 6, minWidth: 28, minHeight: 28, fontWeight: 700, cursor: "pointer", fontFamily: T.font, fontSize: 13 };
  return (<div className="enogia-arr" style={{ minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
      {edit && <button type="button" onClick={() => save({ order: [], span: {} })} style={{ ...tb, padding: "0 10px" }}>Réinitialiser</button>}
      <button type="button" aria-pressed={edit} onClick={() => setEdit(v => !v)} title="Déplacer et redimensionner les cadrans de cette page" style={{ ...tb, padding: "0 12px", background: edit ? T.ink900 : T.card, color: edit ? T.card : T.ink700 }}>{edit ? "Terminer" : "Disposer les cadrans"}</button>
    </div>
    <div className="enogia-arr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: 12, alignItems: "start", gridAutoFlow: "row dense" }}>
      {order.map((k, i) => { const c = byId[k]; if (!c) return null; const sp = spanOf(k, c); const lab = labels[k] || (c.props && c.props["aria-label"]) || k;
        return (<div key={k} className="enogia-arr-item" style={{ gridColumn: "span " + sp, minWidth: 0, position: "relative", outline: edit ? "2px dashed " + (over === k ? T.teal500 : T.line) : "none", outlineOffset: 3, borderRadius: 10 }}
          draggable={edit} onDragStart={e => { if (!edit) return; setDrag(k); try { e.dataTransfer.setData("text/plain", k); e.dataTransfer.effectAllowed = "move"; } catch (x) { /* ignore */ } }}
          onDragOver={e => { if (edit && drag) { e.preventDefault(); setOver(k); } }} onDragLeave={() => setOver(o => (o === k ? null : o))}
          onDrop={e => { if (!edit || !drag) return; e.preventDefault(); if (drag !== k) move(drag, order.indexOf(k)); setDrag(null); setOver(null); }} onDragEnd={() => { setDrag(null); setOver(null); }}>
          {edit && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", marginBottom: 6, background: T.surface, border: "1px solid " + T.line, borderRadius: 8, fontSize: FZ.xs, color: T.ink700 }}>
            <span aria-hidden="true" style={{ cursor: "grab", color: T.ink500, fontSize: 14 }}>⋮⋮</span>
            <b style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lab}</b>
            <button type="button" style={tb} disabled={i === 0} onClick={() => move(k, i - 1)} aria-label={"Avancer " + lab}>◀</button>
            <button type="button" style={tb} disabled={i === order.length - 1} onClick={() => move(k, i + 1)} aria-label={"Reculer " + lab}>▶</button>
            <button type="button" style={tb} onClick={() => resize(k, -1)} aria-label={"Rétrécir " + lab}>−</button>
            <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 34, textAlign: "center" }}>{Math.round(sp / 12 * 100)} %</span>
            <button type="button" style={tb} onClick={() => resize(k, 1)} aria-label={"Élargir " + lab}>+</button>
          </div>}
          <div style={{ pointerEvents: edit ? "none" : "auto" }}>{c}</div>
        </div>); })}
    </div>
  </div>);
}
