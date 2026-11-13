// v264 (demandé : « une checklist de debug dans l'onglet Tests, un système de cochage de cellule par ligne, pour chaque machine, au
// début des phases de tests ; le testeur la remplit et la signe ; exportée sous le même format ») : étape « Checklist de debug » de la
// fiche de tests d'un PJ (résumé + fenêtre de saisie ligne par ligne) et export PDF (v272, à la forme du modèle PI105-047-XX0003).
import React, { useEffect, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { DEBUG_FIELDS, DEBUG_DOC, debugProgress, setDebugRow, debugSections } from "../debugChecklist";
import { openDebugPdf } from "../debugPdf"; // v272 : export PDF seulement (le Word de la V264 est retiré)
import { vibRows, vibOver, vibProgress } from "../testFiche";
import { VibBlock } from "./TestFiche";

const todayIso = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(0, 4) : "—");
const btn = (primary, ghost) => ({ padding: "6px 12px", minHeight: 32, borderRadius: 8, border: "1px solid " + (primary && !ghost ? T.ink900 : T.line), background: primary && !ghost ? T.ink900 : T.card, color: primary && !ghost ? T.card : T.ink700, fontSize: FZ.sm, fontWeight: 600, cursor: "pointer", fontFamily: T.font });
const field = () => ({ padding: "4px 6px", minHeight: 28, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.xs, fontFamily: T.font, boxSizing: "border-box", width: "100%" });

// Résumé dans la fiche de tests du PJ : avancement, NOK, signature, boutons
// v338 (demandé : « mettre les fréquences turbines dans la checklist de debug ») : bloc « Fréquences turbines et vibrations » dans la fenêtre
// de la checklist (après les contrôles) et dans le PDF ; vibModel = planning/tests.vibModel (Tests › Checklists).
export function DebugChecklistStep({ r, plan, saveTests, canMark, who, signApi, SignForm, model, saveModel, vibModel }) {
  const [open, setOpen] = useState(false), [busy] = useState(false), [err, setErr] = useState("");
  const debug = (plan && plan.debug) || {}, sections = debugSections(model), pr = debugProgress(debug, sections);
  const exportWord = () => {
    setErr("");
    const ok = openDebugPdf(async () => {
      let sign = null;
      if (debug.signed && signApi) { const imgs = (await signApi.load(r.pj)) || {}; sign = imgs.debug ? { ...debug.signed, img: imgs.debug.img } : debug.signed; }
      const vv = debug.vib || {}, vib = vibRows(vibModel).map(x => { const o = vibOver(vv[x.id], x.limit); return { ...x, val: vv[x.id] || "", res: o == null ? "" : o ? "NOK" : "OK" }; });
      return { pj: r.pj, date: debug.date || todayIso(), name: debug.name || who, debug, sign, sections, vib };
    });
    if (!ok) setErr("Le navigateur a bloqué la fenêtre du PDF : autorisez les fenêtres pour ce site.");
  };
  const pct = Math.round(pr.done / pr.total * 100), vpr = vibProgress(debug, vibRows(vibModel));
  return (<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "8px 10px", background: T.card, border: "1px solid " + T.line, borderRadius: 12 }}>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink900 }}>{pr.done} / {pr.total} contrôles renseignés{pr.nok ? <span style={{ color: T.red600 }}> · {pr.nok} NOK</span> : ""}<span style={{ fontWeight: 500, color: vpr.over ? T.red600 : T.ink500 }}> · vibrations {vpr.done} / {vpr.total}{vpr.over ? " (" + vpr.over + " au-dessus de la limite)" : ""}</span></div>
        <div aria-hidden="true" style={{ height: 6, borderRadius: 4, background: T.surfaceAlt, marginTop: 6, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: pr.nok ? T.red500 : T.emerald500 }} /></div>
      </div>
      {pr.signed ? <span style={{ fontSize: 12, fontWeight: 600, color: T.emerald600, background: T.emerald100, borderRadius: 999, padding: "2px 10px" }}>Signée le {fd((debug.signed.at || "").slice(0, 10))} · {debug.signed.name}</span>
        : <span style={{ fontSize: 12, color: T.ink500 }}>Pas encore signée</span>}
      <button type="button" onClick={() => setOpen(true)} style={btn(true)}>{canMark ? (pr.done ? "Continuer la checklist" : "Remplir la checklist") : "Voir la checklist"}</button>
      <button type="button" onClick={exportWord} disabled={busy} style={btn(true, true)}>Exporter en PDF</button>
    </div>
    {err && <div role="alert" style={{ fontSize: FZ.xs, color: T.red600, fontWeight: 600 }}>{err}</div>}
    {open && <DebugChecklistDialog {...{ r, plan, saveTests, canMark, who, signApi, SignForm, model, saveModel, vibModel, onExport: exportWord, onClose: () => setOpen(false) }} />}
  </div>);
}

function DebugChecklistDialog({ r, plan, saveTests, canMark, who, signApi, SignForm, model, saveModel, vibModel, onExport, onClose }) {
  const debug = (plan && plan.debug) || {}, rows = debug.rows || {}, sections = debugSections(model), pr = debugProgress(debug, sections);
  const [sigOpen, setSigOpen] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  useEffect(() => { const k = e => { if (e.key === "Escape" && !sigOpen) onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose, sigOpen]);
  const save = d => saveTests({ ...plan, debug: { date: debug.date || todayIso(), name: debug.name || who, ...d } });
  const setRow = (id, patch) => save(setDebugRow(debug, id, patch));
  const setHead = patch => save({ ...debug, ...patch, at: new Date().toISOString() });
  const sign = async (name, fn, img) => {
    if (!signApi) { setErr("Signature indisponible."); return; }
    setBusy(true); setErr("");
    const at = new Date().toISOString(), ok = await signApi.save(r.pj, "debug", { name, fn, at, img });
    if (ok !== false) { await save({ ...debug, signed: { name, fn, at } }); setSigOpen(false); } else setErr("La signature n'a pas pu être enregistrée.");
    setBusy(false);
  };
  const changedAfter = debug.signed && debug.at && debug.at > debug.signed.at;
  const th = { textAlign: "left", padding: "6px 8px", fontSize: 12, fontWeight: 600, color: T.ink900, background: T.surfaceAlt, borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" };
  const td = { padding: "4px 6px", borderBottom: "1px solid " + T.line, verticalAlign: "top", fontSize: FZ.xs, color: T.ink900 };
  const Cell = ({ id, v, val, label, tone }) => { const on = (rows[id] && rows[id].r) === val;
    return <button type="button" disabled={!canMark} aria-pressed={on} aria-label={label} onClick={() => setRow(id, { r: val })}
      style={{ width: 40, minHeight: 28, borderRadius: 8, border: "1px solid " + (on ? tone[0] : T.line), background: on ? tone[1] : T.card, color: on ? tone[0] : T.ink300, fontWeight: 600, fontSize: FZ.xs, cursor: canMark ? "pointer" : "default", fontFamily: T.font }}>{on ? (val === "na" ? "S.O." : "X") : v}</button>; };
  const OK = [T.emerald600, T.emerald100], NOK = [T.red600, T.red100], NA = [T.ink700, T.surfaceAlt];
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
    <div role="dialog" aria-modal="true" aria-label={"Checklist de debug " + r.pj} style={{ width: "min(1480px,100%)", maxHeight: "94dvh", display: "flex", flexDirection: "column", background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px", borderBottom: "1px solid " + T.line }}>
        <div style={{ flex: "1 1 260px" }}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: FZ.lg, fontWeight: 600 }}>{DEBUG_DOC.subtitle} · <span style={{ fontFamily: T.fontMono }}>{r.pj}</span></div>
          <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{DEBUG_DOC.title} · Version {DEBUG_DOC.version} · à remplir au début des tests. Cochez OK ou NOK sur chaque ligne ; en cas de NOK, décrivez le problème, sa cause, le correctif et le temps passé.</div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, color: T.ink500 }}>Date<input type="date" disabled={!canMark} value={debug.date || todayIso()} onChange={e => setHead({ date: e.target.value })} style={{ ...field(), width: 150 }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, color: T.ink500 }}>Nom et prénom<input disabled={!canMark} key={"n" + (debug.name || who)} defaultValue={debug.name || who} onBlur={e => { const v = e.target.value.trim(); if (v !== (debug.name || who)) setHead({ name: v }); }} style={{ ...field(), width: 220 }} /></label>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{ ...btn(true, true), padding: "0 12px" }}>Fermer</button>
      </div>
      <div style={{ overflow: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
          <colgroup><col style={{ width: 190 }} /><col style={{ width: 52 }} /><col style={{ width: 52 }} /><col style={{ width: 150 }} /><col style={{ width: 150 }} /><col style={{ width: 170 }} /><col style={{ width: 90 }} /><col /></colgroup>
          {sections.map(s => <tbody key={s.id}>
            <tr><th style={th}>{s.title}</th><th style={{ ...th, textAlign: "center" }}>OK</th><th style={{ ...th, textAlign: "center" }}>NOK</th>{DEBUG_FIELDS.map(([k, l]) => <th key={k} style={th}>{l}</th>)}<th style={th}>Consigne (commentaires du modèle)</th></tr>
            {s.items.map(it => { const v = rows[it.id] || {}; return (<tr key={it.id} style={{ background: v.r === "nok" ? T.red100 : "transparent" }}>
              <td style={{ ...td, fontWeight: 600 }}>{it.label}</td>
              <td style={{ ...td, textAlign: "center" }}><Cell id={it.id} v="" val="ok" label={"OK : " + it.label} tone={OK} /></td>
              <td style={{ ...td, textAlign: "center" }}><Cell id={it.id} v="" val="nok" label={"NOK : " + it.label} tone={NOK} />{it.opt && <div style={{ marginTop: 4 }}><Cell id={it.id} v="S.O." val="na" label={"Sans objet : " + it.label} tone={NA} /></div>}</td>
              {DEBUG_FIELDS.map(([k, l]) => <td key={k} style={td}><textarea rows={1} disabled={!canMark} key={k + it.id + (v[k] || "")} defaultValue={v[k] || ""} aria-label={l + " : " + it.label} onBlur={e => { const t = e.target.value.trim(); if (t !== (v[k] || "")) setRow(it.id, { [k]: t }); }} style={{ ...field(), resize: "vertical", minHeight: 28 }} /></td>)}
              <td style={{ ...td, color: T.ink700, whiteSpace: "pre-line", lineHeight: 1.4 }}>{it.hint}</td>
            </tr>); })}
          </tbody>)}
        </table>
        <div style={{ padding: "0 12px 14px" }}><VibBlock plan={plan} rows={vibRows(vibModel)} canMark={canMark} saveTests={saveTests} who={who} canAdmin={!!saveModel} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 16px", borderTop: "1px solid " + T.line }}>
        <span style={{ fontSize: FZ.sm, fontWeight: 600 }}>{pr.done} / {pr.total} renseignés{pr.nok ? <span style={{ color: T.red600 }}> · {pr.nok} NOK</span> : ""}</span>
        {debug.signed ? <span style={{ fontSize: 12, fontWeight: 600, color: changedAfter ? T.amber600 : T.emerald600, background: changedAfter ? T.amber100 : T.emerald100, borderRadius: 999, padding: "2px 10px" }}>Signée le {fd(debug.signed.at.slice(0, 10))} par {debug.signed.name}{changedAfter ? " · modifiée depuis, à signer de nouveau" : ""}</span> : null}
        <span style={{ flex: 1 }} />
        {saveModel && <span style={{ fontSize: 12, color: T.ink500 }}>La liste des contrôles se modifie dans Tests › Checklists.</span>}
        {canMark && !sigOpen && <button type="button" disabled={busy} onClick={() => setSigOpen(true)} style={btn(true, !!debug.signed && !changedAfter)}>{debug.signed ? "Signer de nouveau" : pr.done < pr.total ? "Signer (" + (pr.total - pr.done) + " ligne" + (pr.total - pr.done > 1 ? "s" : "") + " vide" + (pr.total - pr.done > 1 ? "s" : "") + ")" : "Signer la checklist"}</button>}
        <button type="button" onClick={onExport} style={btn(true, true)}>Exporter en PDF</button>
      </div>
      {sigOpen && <div style={{ padding: "0 16px 14px" }}><SignForm init={{ name: debug.name || who, fn: (debug.signed && debug.signed.fn) || "" }} busy={busy} onCancel={() => setSigOpen(false)} onSave={sign} /></div>}
      {err && <div role="alert" style={{ padding: "0 16px 12px", fontSize: FZ.xs, color: T.red600, fontWeight: 600 }}>{err}</div>}
    </div>
  </div>);
}
