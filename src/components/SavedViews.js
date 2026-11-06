import React, { useState, useEffect, useRef } from "react";
import { T, FZ } from "../theme";
import { NavIcon } from "./SharedUI";

// ── Vues enregistrées de la liste (v126) ──────────────────────────────────────────────────────────────────────
// Une vue = une combinaison de filtres + le tri + « En dérive seulement ». Aucune donnée du planning n'est touchée.
// Les vues personnelles sont gardées dans ce navigateur (localStorage) : propres à chaque personne et chaque poste,
// jamais envoyées à Firebase. Deux vues prêtes à l'emploi sont toujours proposées.
const KEY = "enogia_savedViews_v1";
const load = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.filter(v => v && v.id && v.name && v.state) : []; } catch (e) { return []; } };
const store = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* stockage indisponible : la vue reste valable le temps de la session */ } };
// Clé de comparaison indépendante de l'ordre des cases cochées
export const viewKey = st => JSON.stringify(Object.keys(st).sort().map(k => [k, Array.isArray(st[k]) ? [...st[k]].sort() : st[k]]));

const BTN = { padding: "0 10px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 28, fontFamily: T.font }; // v286 : tailles du bouton commun (sm)

export function ViewsMenu({ current, presets, onApply }) {
  const [open, setOpen] = useState(false); const [list, setList] = useState(load); const [name, setName] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const cur = viewKey(current);
  const all = [...presets, ...list];
  const active = all.find(v => viewKey(v.state) === cur);
  const custom = active && active.id !== presets[0].id; // une vue autre que « Toute la liste » est en cours
  const save = () => {
    const n = name.trim().slice(0, 40); if (!n) return;
    const next = [...list.filter(x => x.name !== n), { id: "v" + Date.now().toString(36), name: n, state: current }];
    setList(next); store(next); setName("");
  };
  const del = id => { const next = list.filter(v => v.id !== id); setList(next); store(next); };
  const row = (v, isPreset) => (<div key={v.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
    <button onClick={() => { onApply(v.state); setOpen(false); }} aria-current={active && active.id === v.id ? "true" : undefined}
      style={{ flex: 1, textAlign: "left", border: "none", background: active && active.id === v.id ? T.teal100 : "transparent", color: T.ink900, fontSize: FZ.sm, fontWeight: active && active.id === v.id ? 700 : 500, padding: "8px 8px", borderRadius: 8, cursor: "pointer", fontFamily: T.font, minHeight: 28 }}>
      {active && active.id === v.id ? "✓ " : ""}{v.name}
    </button>
    {!isPreset && <button onClick={() => del(v.id)} aria-label={"Supprimer la vue « " + v.name + " »"} title="Supprimer cette vue" style={{ border: "none", background: "transparent", color: T.ink500, cursor: "pointer", fontSize: FZ.md, width: 28, height: 28, borderRadius: 8 }}><NavIcon name="close" size={11}/></button>}
  </div>);
  return (<span ref={ref} style={{ position: "relative", display: "inline-block" }}>
    <button onClick={() => setOpen(v => !v)} aria-haspopup="true" aria-expanded={open}
      style={{ ...BTN, background: custom ? T.teal100 : T.card, color: custom ? T.teal600 : T.ink700, boxShadow: T.outline, maxWidth: 260 }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{custom ? "Vue : " + active.name : "Vues"}</span><span aria-hidden="true" style={{ fontSize: FZ.xs }}>▾</span>
    </button>
    {open && <div role="group" aria-label="Vues enregistrées" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 9999, minWidth: 280, maxWidth: 340, background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: FZ.xs, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.ink500, padding: "4px 8px" }}>Vues prêtes à l'emploi</div>
      {presets.map(v => row(v, true))}
      <div style={{ fontSize: FZ.xs, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.ink500, padding: "8px 8px 4px", borderTop: "1px solid " + T.line, marginTop: 4 }}>Mes vues</div>
      {list.length === 0 && <div style={{ fontSize: FZ.xs, color: T.ink500, padding: "2px 8px 6px" }}>Aucune pour l'instant.</div>}
      {list.map(v => row(v, false))}
      <div style={{ borderTop: "1px solid " + T.line, marginTop: 4, padding: "8px 4px 2px" }}>
        <div style={{ fontSize: FZ.xs, color: T.ink500, padding: "0 6px 6px" }}>Enregistrer les filtres et le tri actuels :</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(); }} placeholder="Nom de la vue" aria-label="Nom de la vue" maxLength={40}
            style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font }} />
          <button onClick={save} disabled={!name.trim()} style={{ ...BTN, background: name.trim() ? T.navy700 : T.ink100, color: "#fff", cursor: name.trim() ? "pointer" : "default" }}>Enregistrer</button>
        </div>
        <div style={{ fontSize: FZ.xs, color: T.ink500, padding: "6px 6px 2px" }}>Gardées sur ce navigateur : propres à chaque personne et à chaque poste.</div>
      </div>
    </div>}
  </span>);
}
