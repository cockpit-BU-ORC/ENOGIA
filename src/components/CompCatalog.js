// v150 — Liste des major components, gérée par les administrateurs : ajouter, renommer, réordonner, retirer.
// Cette liste est celle qu'ont les PJ qui n'ont pas encore de liste propre ; « Ajouter aux PJ en cours » complète les listes déjà démarrées.
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { T, FZF as FZ } from "../theme";
import { DEFAULT_COMPOSANTS } from "../pjProgress";

const btn = (extra = {}) => ({ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "4px 10px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font, ...extra });
const fld = { padding: "6px 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.surface, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font };

export function CompCatalogDialog({ catalog, setCatalog, nPj, missingCount, onApplyAll, onClose }) {
  const list = catalog && catalog.length ? catalog : DEFAULT_COMPOSANTS;
  const [name, setName] = useState(""), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const has = t => list.some(x => x.toLowerCase() === t.toLowerCase());
  const add = async () => { const t = name.trim(); if (!t) return; if (has(t)) { setErr("Ce composant est déjà dans la liste."); return; } setErr(""); if (await setCatalog([...list, t])) setName(""); };
  const rename = (i, t) => { t = t.trim(); if (!t || t === list[i]) return; if (list.some((x, k) => k !== i && x.toLowerCase() === t.toLowerCase())) { setErr("Ce nom existe déjà."); return; } setErr(""); setCatalog(list.map((x, k) => k === i ? t : x)); };
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= list.length) return; const n = [...list];[n[i], n[j]] = [n[j], n[i]]; setCatalog(n); };
  const del = i => { if (list.length <= 1) { setErr("Gardez au moins un composant."); return; } setCatalog(list.filter((_, k) => k !== i)); };
  const apply = async () => {
    if (!window.confirm("Ajouter les composants manquants à la liste des " + nPj + " PJ en cours ? Les cases déjà cochées ne changent pas, aucun composant n'est retiré.")) return;
    const n = await onApplyAll(list); setMsg(n === false ? "" : "Liste complétée sur " + n + " PJ.");
  };
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Liste des composants" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: "fixed", inset: 0, zIndex: 20010, background: "rgba(10,16,28,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
    <div style={{ background: T.card, color: T.ink900, borderRadius: 12, boxShadow: T.shadowLg, border: "1px solid " + T.line, width: "min(520px,100%)", maxHeight: "90vh", overflow: "auto", padding: 20, fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ flex: 1, fontFamily: T.fontDisplay, fontWeight: 700, fontSize: FZ.md }}>Liste des composants</div>
        <button onClick={onClose} style={btn()}>Fermer</button>
      </div>
      <div style={{ fontSize: FZ.sm, color: T.ink500, marginBottom: 12 }}>C'est la liste proposée à chaque PJ (« Major components »). Renommer ici ne change pas les listes déjà démarrées ; chaque fiche garde aussi la main sur ses propres composants.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {list.map((c, i) => <div key={c + i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input defaultValue={c} key={c} maxLength={40} aria-label={"Composant " + c} onBlur={e => { const t = e.target.value.trim(); if (t && t !== c) rename(i, t); else e.target.value = c; }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ ...fld, flex: 1, minWidth: 0 }} />
          <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={"Monter " + c} style={btn({ padding: "4px 8px", opacity: i === 0 ? .4 : 1 })}>↑</button>
          <button onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={"Descendre " + c} style={btn({ padding: "4px 8px", opacity: i === list.length - 1 ? .4 : 1 })}>↓</button>
          <button onClick={() => del(i)} aria-label={"Retirer " + c} style={btn({ color: T.red600 })}>Retirer</button>
        </div>)}
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid " + T.line }}>
        <input value={name} autoFocus onChange={e => { setName(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Nouveau composant (ex. Vanne, Bac à huile…)" aria-label="Nouveau composant" maxLength={40} style={{ ...fld, flex: 1, minWidth: 0 }} />
        <button onClick={add} disabled={!name.trim()} style={{ border: "none", borderRadius: 12, padding: "7px 14px", background: name.trim() ? T.navy700 : T.ink100, color: name.trim() ? "#fff" : T.ink500, fontWeight: 800, fontSize: FZ.sm, cursor: name.trim() ? "pointer" : "default", fontFamily: T.font }}>Ajouter</button>
      </div>
      {err && <div role="alert" style={{ marginTop: 8, fontSize: FZ.xs, color: T.red600, fontWeight: 700 }}>{err}</div>}
      {onApplyAll && <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid " + T.line, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button onClick={apply} disabled={!missingCount} style={btn({ color: missingCount ? T.navy700 : T.ink300 })}>Ajouter aux PJ en cours</button>
        <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{missingCount ? missingCount + " PJ ont une liste à compléter" : "Toutes les listes en cours sont à jour"}</span>
        {msg && <span role="status" style={{ fontSize: FZ.xs, color: T.emerald600, fontWeight: 700 }}>{msg} ✓</span>}
      </div>}
    </div>
  </div>, document.body);
}
