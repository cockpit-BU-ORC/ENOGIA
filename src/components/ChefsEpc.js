import React, { useState } from "react";
import { T, FZF as FZ } from "../theme";
import { getAllChefs } from "../pjMeta";

// v191 — Autres chefs de projet, projet EPC et chef de projet ORC (demandé : « rajouter des chefs de projet aux projets et mettre
// un chef de projet ORC à ceux que je flague en projet EPC »). Champs contrôlés : value = { chefsExtra:[], epc, chefOrc }.
const field = () => ({ padding: "6px 8px", borderRadius: 8, border: "1px solid " + T.line, fontSize: FZ.sm, fontFamily: T.font, color: T.ink900, background: T.card, minHeight: 32, boxSizing: "border-box" });
export const chefsEpcOf = meta => ({ chefsExtra: Array.isArray(meta && meta.chefsExtra) ? meta.chefsExtra : [], epc: !!(meta && meta.epc), chefOrc: (meta && meta.chefOrc) || "" });

export function ChefsEpcFields({ value, onChange, mainChef }) {
  const [add, setAdd] = useState("");
  const all = getAllChefs();
  const v = value, set = patch => onChange({ ...v, ...patch });
  const push = () => { const n = add.trim(); if (!n || n === mainChef || v.chefsExtra.includes(n)) { setAdd(""); return; } set({ chefsExtra: [...v.chefsExtra, n] }); setAdd(""); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ fontSize: FZ.xs, fontWeight: 600, color: T.ink500 }}>Autres chefs de projet</div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {v.chefsExtra.map(c => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: FZ.xs, fontWeight: 600, color: T.ink700, background: T.panel, borderRadius: 999, padding: "2px 4px 2px 10px" }}>{c}
        <button type="button" aria-label={"Retirer " + c} onClick={() => set({ chefsExtra: v.chefsExtra.filter(x => x !== c) })} style={{ border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 24, minHeight: 24, fontSize: 14 }}>×</button></span>)}
      <input list="enogia-chefs-all" value={add} onChange={e => setAdd(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); push(); } }} placeholder="Ajouter un chef de projet" aria-label="Ajouter un chef de projet" style={{ ...field(), width: 200 }} />
      <datalist id="enogia-chefs-all">{all.map(c => <option key={c} value={c} />)}</datalist>
      {add.trim() && <button type="button" onClick={push} style={{ ...field(), background: T.ink900, color: T.card, border: "none", fontWeight: 600, cursor: "pointer" }}>Ajouter</button>}
    </div>
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: FZ.sm, fontWeight: 600, color: T.ink900, cursor: "pointer", minHeight: 28 }}>
      <input type="checkbox" checked={v.epc} onChange={e => set({ epc: e.target.checked })} style={{ width: 16, height: 16, accentColor: T.violet500 }} />Projet EPC
    </label>
    {v.epc && <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: FZ.xs, fontWeight: 600, color: T.ink500, maxWidth: 420 }}>Chef de projet ORC en soutien
      <input list="enogia-chefs-all" value={v.chefOrc} onChange={e => set({ chefOrc: e.target.value })} placeholder="Nom du chef de projet ORC (facultatif)" style={field()} />
      <span style={{ fontWeight: 400, lineHeight: 1.4 }}>Le chef de projet de la fiche est celui de l'EPC : c'est lui qui figure dans les listes. Le chef ORC est en soutien : il n'est pas relié au projet EPC.</span>
    </label>}
  </div>);
}

// Édition autonome (fiche projet du Manager) : les trois champs + Enregistrer / Annuler.
export function ChefsEpcEditor({ meta, onSave, onCancel }) {
  const [v, setV] = useState(() => chefsEpcOf(meta)), [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); const ok = await onSave({ chefsExtra: v.chefsExtra, epc: v.epc, chefOrc: v.epc ? v.chefOrc.trim() : "" }); setBusy(false); if (ok !== false) onCancel(); };
  return (<div className="enogia-view-in" style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
    <ChefsEpcFields value={v} onChange={setV} mainChef={meta && meta.chefProjet} />
    <div style={{ display: "flex", gap: 8 }}>
      <button type="button" onClick={save} disabled={busy} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: T.ink900, color: T.card, fontSize: FZ.sm, fontWeight: 600, cursor: "pointer", minHeight: 30 }}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      <button type="button" onClick={onCancel} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: T.panel, color: T.ink700, fontSize: FZ.sm, fontWeight: 600, cursor: "pointer", minHeight: 30 }}>Annuler</button>
    </div>
  </div>);
}
