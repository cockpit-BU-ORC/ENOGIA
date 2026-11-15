import React, { useState } from "react";
import { T, FZ } from "../theme";
import { useSheetJS } from "./SharedUI";
import { ChangesTable } from "./ChangesTable";
import { readPlanningFile } from "../readPlanning";
import { summarizeChanges } from "../changeDiff";

// ── Comparer deux fichiers MS Project (ancien / nouveau) ───────────────────────────────────────────────────────
// Outil de consultation : les fichiers sont lus dans le navigateur, rien n'est importé ni enregistré. Sert à voir l'écart entre deux
// exports quelconques, y compris quand le journal d'imports n'a pas (encore) gardé la version précédente.
function Drop({ label, file, onFile }) {
  const [over, setOver] = useState(false);
  const id = "cmp-" + label;
  return (<div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    onClick={() => document.getElementById(id).click()}
    style={{ flex: "1 1 240px", minWidth: 220, border: "2px dashed " + (over ? T.teal500 : file ? T.emerald500 : T.ink100), borderRadius: 12, padding: "12px 16px", background: over ? T.teal100 : T.surface, cursor: "pointer", textAlign: "center" }}>
    <div style={{fontFamily:T.font,fontSize:12,fontWeight:500,color:T.accentInk}}>{label}</div>
    <div style={{ fontSize: FZ.sm, color: file ? T.ink900 : T.ink300, fontWeight: file ? 600 : 400, marginTop: 5, wordBreak: "break-all" }}>{file ? file.name : "Glisser un fichier ou cliquer"}</div>
    <input id={id} type="file" accept=".xlsx,.xls,.txt,.tsv" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ""; }} />
  </div>);
}

export function CompareFiles({ onOpenPj, defaultOpen }) {
  useSheetJS();
  const [open, setOpen] = useState(!!defaultOpen);
  const [oldF, setOldF] = useState(null); const [newF, setNewF] = useState(null);
  const [res, setRes] = useState(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const card = { background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)", overflow: "hidden" };
  const run = async () => {
    setBusy(true); setErr(""); setRes(null);
    try {
      const [a, b] = await Promise.all([readPlanningFile(oldF), readPlanningFile(newF)]);
      const s = summarizeChanges(a, b);
      const inNew = new Set(b.map(r => r.pj));
      setRes({ summary: s, removed: a.filter(r => !inNew.has(r.pj)).map(r => ({ pj: r.pj, nomProjet: r.nomProjet || null, depart: r.depart || null })), label: "« " + newF.name + " » comparé à « " + oldF.name + " »" });
    } catch (e) { setErr(e.message || "Lecture impossible"); }
    setBusy(false);
  };
  const ok = oldF && newF && !busy;
  return (<div style={{ marginBottom: 12 }}>
    <button onClick={() => setOpen(o => !o)} title="Ancien export ↔ nouvel export MS Project, sans rien importer : sert à voir l'écart une première fois" style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid " + (open ? T.teal500 : T.line), background: open ? T.teal100 : "transparent", color: open ? T.teal600 : T.ink500, borderRadius: 8, padding: "3px 8px", fontSize: FZ.xs, fontWeight: 500, fontFamily: T.font, cursor: "pointer" }}>
      <span aria-hidden>⇄</span>Comparer 2 plannings
    </button>
    {open && <div style={{ ...card, padding: "0 16px 16px", marginTop: 8 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "14px 0 10px" }}>
        <Drop label="Ancien fichier" file={oldF} onFile={f => { setOldF(f); setRes(null); }} />
        <Drop label="Nouveau fichier" file={newF} onFile={f => { setNewF(f); setRes(null); }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button disabled={!ok} onClick={run} style={{ border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: FZ.sm, fontFamily: T.font, color: T.onFill, cursor: ok ? "pointer" : "default", background: ok ? T.navy700 : T.ink100 }}>{busy ? "Comparaison…" : "Comparer"}</button>
        <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Les fichiers restent dans votre navigateur : aucune donnée du site n'est modifiée.</span>
      </div>
      {err && <div style={{ marginTop: 10, color: T.red500, background: T.red100, borderRadius: 8, padding: "8px 12px", fontSize: FZ.sm }}>{err}</div>}
      {res && <div style={{ marginTop: 14, ...card }}>
        <ChangesTable summary={res.summary} removed={res.removed} refs={[{ id: "cmp", label: res.label }]} refId="cmp" setRefId={() => {}} refLabel={res.label} q="" onOpenPj={onOpenPj} />
      </div>}
    </div>}
  </div>);
}
