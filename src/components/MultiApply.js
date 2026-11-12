// v146.18 — Saisir une action, un plan de mitigation, un commentaire ou un statut global sur PLUSIEURS projets en une fois
// (ex. PJ461-1, -2, -3…). Chaque PJ reçoit sa propre ligne ; les lignes d'un même envoi portent le même groupId / groupPjs,
// ce qui permet de les retrouver (badge « × N PJ ») et de clôturer l'action d'un coup.
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { T, FZF as FZ } from "../theme";
import { getPjMeta } from "../pjMeta";
import { itemsOf, ITEM_STATUS, statusPatch, mitText } from "../pjProgress";
import { FEUX, FEU_LEVELS, FeuDot, patchFeu, openMitigations, NOTE_MAX } from "./Feux";
import { chipStyle } from "./SharedUI";

export const newItemId = () => "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// Champs à écrire pour chaque PJ choisi (fonction pure, testée) : { [pj]: { champ: valeur } }
export function buildMultiPatch(kind, pjs, metaOf, f, now = new Date().toISOString()) {
  const out = {}, gid = pjs.length > 1 ? "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) : null;
  const grp = gid ? { groupId: gid, groupPjs: pjs } : {};
  pjs.forEach(pj => {
    const meta = metaOf(pj) || {};
    const st = statusPatch(null, f.status || "todo", now.slice(0, 10));
    if (kind === "actions") out[pj] = { actions: [...itemsOf(meta, "actions"), { id: newItemId(), text: f.text.trim(), createdAt: now, deadline: f.deadline, ...st, ...grp }], semAt: now };
    else if (kind === "mitigations") out[pj] = { mitigations: [...itemsOf(meta, "mitigations"), { id: newItemId(), risk: f.risk.trim(), measure: f.measure.trim(), text: mitText(f.risk, f.measure), createdAt: now, deadline: f.deadline, ...st, ...grp }], mitAt: now };
    else if (kind === "statut") {
      const p = { ...patchFeu(meta, f.axis, f.level) };
      if (f.level) { p.notes = { ...(meta.notes || {}), [f.axis]: f.note.trim() }; p.notesAt = now; }
      if (f.level === "red" && f.axis === "planning" && f.risk && f.risk.trim() && !openMitigations(meta).length) { p.mitigations = [...itemsOf(meta, "mitigations"), { id: newItemId(), risk: f.risk.trim(), measure: (f.measure || "").trim(), text: mitText(f.risk, f.measure), deadline: f.deadline, status: "todo", createdAt: now, done: false, doneAt: null, from: "planning", ...grp }]; p.mitAt = now; }
      out[pj] = p;
    }
  });
  return out;
}
// Le statut « à risque » exige un commentaire, et pour le Planning un plan de mitigation (déjà ouvert sur le PJ, ou saisi ici)
export function statutProblems(pjs, metaOf, f) {
  const out = [];
  if (f.level && !(f.note || "").trim()) out.push("un commentaire est obligatoire");
  if (f.level === "red" && f.axis === "planning" && !((f.risk || "").trim() && (f.measure || "").trim() && f.deadline)) { const lack = pjs.filter(pj => !openMitigations(metaOf(pj) || {}).length); if (lack.length) out.push("un plan de mitigation (risque, mesure, date) est obligatoire pour " + lack.join(", ")); }
  return out;
}

const TABS = [["actions", "Action de la semaine"], ["mitigations", "Plan de mitigation"], ["comment", "Commentaire"], ["statut", "Statut global"], ["retard", "Retard"]];

export function MultiApplyDialog({ onClose, data, currentPj, savePjMetaMulti, addCommentMulti, addDelayAllocationMulti, delayTypes, authorName }) {
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE"), [data]);
  const metaOf = pj => { const r = rows.find(x => x.pj === pj); return r ? getPjMeta(pj, r) : {}; };
  const cur = rows.find(x => x.pj === currentPj);
  const [sel, setSel] = useState(() => new Set(currentPj ? [currentPj] : []));
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("actions");
  const [text, setText] = useState(""), [deadline, setDeadline] = useState(""), [priv, setPriv] = useState(false);
  const [axis, setAxis] = useState("planning"), [level, setLevel] = useState("yellow"), [note, setNote] = useState("");
  const [risk, setRisk] = useState(""), [measure, setMeasure] = useState(""), [status, setStatus] = useState("todo");
  const types = delayTypes || [];
  const [dType, setDType] = useState(types[0] || ""), [dDays, setDDays] = useState(""), [dNote, setDNote] = useState("");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const projet = pj => getPjMeta(pj, rows.find(x => x.pj === pj) || {}).nomProjet || "";
  const shown = rows.filter(r => !q.trim() || (r.pj + " " + projet(r.pj)).toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => (a.etat === "SHIPPED") - (b.etat === "SHIPPED") || a.pj.localeCompare(b.pj, "fr", { numeric: true }));
  const flip = pj => { const n = new Set(sel); n.has(pj) ? n.delete(pj) : n.add(pj); setSel(n); };
  const sameProject = cur ? rows.filter(r => projet(r.pj) && projet(r.pj) === projet(cur.pj)).map(r => r.pj) : [];
  const pjs = rows.map(r => r.pj).filter(pj => sel.has(pj));

  const f = { text, deadline, axis, level, note, risk, measure, status };
  let problem = null;
  if (!pjs.length) problem = "Cochez au moins un projet";
  else if (tab === "actions" && (!text.trim() || !deadline)) problem = "Action et date obligatoires";
  else if (tab === "mitigations" && (!risk.trim() || !measure.trim() || !deadline)) problem = "Risque, mesure et date obligatoires";
  else if (tab === "comment" && !text.trim()) problem = "Saisissez un texte";
  else if (tab === "retard" && (!dType || !(+dDays > 0))) problem = !dType ? "Choisissez une cause" : "Indiquez le nombre de jours";
  else if (tab === "statut") { const p = statutProblems(pjs, metaOf, f); if (p.length) problem = p[0]; }
  const apply = async () => {
    if (problem || busy) return; setBusy(true); setMsg(null);
    try {
      let ok = true;
      if (tab === "comment") ok = await addCommentMulti(pjs, authorName || "Anonyme", text, null, priv);
      else if (tab === "retard") ok = await addDelayAllocationMulti(pjs, dType, dDays, dNote, authorName || "");
      else ok = await savePjMetaMulti(buildMultiPatch(tab, pjs, metaOf, f));
      if (ok === false) setMsg({ err: true, t: "L'enregistrement a échoué (voir le message d'erreur)." });
      else { setMsg({ t: "Enregistré sur " + pjs.length + " projet" + (pjs.length > 1 ? "s" : "") + "." }); setText(""); setNote(""); setRisk(""); setMeasure(""); setDDays(""); setDNote(""); }
    } catch (e) { setMsg({ err: true, t: "Erreur : " + (e && e.message) }); }
    finally { setBusy(false); }
  };

  const field = { width: "100%", boxSizing: "border-box", fontFamily: T.font, fontSize: FZ.sm, color: T.ink900, background: T.surface, border: "1px solid " + T.line, borderRadius: 8, padding: "7px 10px" };
  const chip = chipStyle; // v311 : puce commune
  const lbl = { fontSize: FZ.xs, fontWeight: 700, color: T.ink500, display: "block", marginBottom: 4 };

  return createPortal(<div role="dialog" aria-modal="true" aria-label="Saisie sur plusieurs projets" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: "fixed", inset: 0, zIndex: 20010, background: "rgba(10,16,28,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
    <div style={{ background: T.card, color: T.ink900, borderRadius: 12, boxShadow: T.shadowLg, border: "1px solid " + T.line, width: "min(860px,100%)", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: T.font }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.line, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}><div style={{ fontSize: FZ.md, fontWeight: 800 }}>Saisir sur plusieurs projets</div><div style={{ fontSize: FZ.xs, color: T.ink500 }}>Une seule saisie, ajoutée à chaque projet coché — action, mitigation, commentaire ou statut.</div></div>
        <button onClick={onClose} style={chip(false)}>Fermer</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", minHeight: 0, flex: 1, overflow: "auto" }}>
        <div style={{ flex: "1 1 280px", minWidth: 250, padding: 14, borderRight: "1px solid " + T.line, display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un PJ ou un projet" aria-label="Chercher un PJ" style={field} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sameProject.length > 1 && <button style={chip(false)} onClick={() => setSel(new Set(sameProject))} title="Tous les PJ du même projet que la fiche ouverte">Même projet ({sameProject.length})</button>}
            <button style={chip(false)} onClick={() => setSel(new Set([...sel, ...shown.map(r => r.pj)]))}>Cocher la liste</button>
            <button style={chip(false)} onClick={() => setSel(new Set())}>Aucun</button>
          </div>
          <div style={{ overflowY: "auto", maxHeight: 340, border: "1px solid " + T.line, borderRadius: 8 }}>
            {shown.map(r => (<label key={r.pj} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 9px", fontSize: FZ.sm, cursor: "pointer", borderBottom: "1px solid " + T.line, opacity: r.etat === "SHIPPED" ? .6 : 1 }}>
              <input type="checkbox" checked={sel.has(r.pj)} onChange={() => flip(r.pj)} style={{ accentColor: T.teal600 }} />
              <b style={{ whiteSpace: "nowrap" }}>{r.pj}</b><span style={{ color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projet(r.pj)}{r.etat === "SHIPPED" ? " · expédiée" : ""}</span>
            </label>))}
            {!shown.length && <div style={{ padding: 10, fontSize: FZ.sm, color: T.ink500 }}>Aucun PJ ne correspond.</div>}
          </div>
          <div style={{ fontSize: FZ.xs, color: T.ink500, fontWeight: 700 }}>{pjs.length} projet{pjs.length > 1 ? "s" : ""} coché{pjs.length > 1 ? "s" : ""}</div>
        </div>
        <div style={{ flex: "1.3 1 330px", minWidth: 300, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div role="tablist" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} style={chip(tab === k)} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>)}</div>
          {tab === "statut" ? <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div><span style={lbl}>Axe</span><select value={axis} onChange={e => setAxis(e.target.value)} style={{ ...field, width: "auto" }}>{FEUX.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div><span style={lbl}>Niveau</span><div style={{ display: "flex", gap: 6 }}>
                {FEU_LEVELS.map(([lv, l]) => <button key={lv} type="button" onClick={() => setLevel(lv)} style={{ ...chip(level === lv), display: "inline-flex", alignItems: "center", gap: 6 }}><FeuDot value={lv} size={11} />{l}</button>)}
                <button type="button" onClick={() => setLevel(null)} style={chip(level === null)}>Effacer</button></div></div>
            </div>
            {level && <div><span style={lbl}>Commentaire de synthèse (obligatoire)</span><textarea value={note} maxLength={NOTE_MAX} onChange={e => setNote(e.target.value)} rows={3} style={field} placeholder="Pourquoi ce niveau ?" /></div>}
            {level === "red" && axis === "planning" && <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, border: "1px solid " + T.line, borderRadius: 8 }}>
              <span style={{ ...lbl, marginBottom: 0 }}>Plan de mitigation (obligatoire pour les PJ qui n'en ont pas d'ouvert)</span>
              <input value={risk} onChange={e => setRisk(e.target.value)} placeholder="Risque" aria-label="Risque" style={field} />
              <input value={measure} onChange={e => setMeasure(e.target.value)} placeholder="Ce qu'on fait pour l'éviter" aria-label="Mesure" style={field} />
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} aria-label="Date" style={{ ...field, width: "auto", colorScheme: T.mode === "dark" ? "dark" : "light" }} />
            </div>}
          </> : tab === "retard" ? <>
            <div><span style={lbl}>Cause du retard</span>
              <select value={dType} onChange={e => setDType(e.target.value)} style={field}>{!types.length && <option value="">Aucune cause définie</option>}{types.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><span style={lbl}>Nombre de jours</span><input type="number" min="1" value={dDays} onChange={e => setDDays(e.target.value)} style={{ ...field, width: 120 }} /></div>
            <div><span style={lbl}>Précision (facultatif)</span><textarea value={dNote} onChange={e => setDNote(e.target.value)} rows={2} style={field} /></div>
            <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Le même retard est enregistré sur chaque projet coché (comme dans la fiche).</div>
          </> : tab === "mitigations" ? <>
            <div><span style={lbl}>Risque</span><input value={risk} onChange={e => setRisk(e.target.value)} style={field} placeholder="Quel risque ?" /></div>
            <div><span style={lbl}>Ce qu'on fait pour l'éviter</span><input value={measure} onChange={e => setMeasure(e.target.value)} style={field} placeholder="Mesure, responsable…" /></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div><span style={lbl}>État</span><select value={status} onChange={e => setStatus(e.target.value)} style={{ ...field, width: "auto" }}>{ITEM_STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div><span style={lbl}>Date (obligatoire)</span><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...field, width: "auto", colorScheme: T.mode === "dark" ? "dark" : "light" }} /></div>
            </div>
          </> : <>
            <div><span style={lbl}>{tab === "actions" ? "Action (qui fait quoi…)" : "Commentaire"}</span><textarea value={text} onChange={e => setText(e.target.value)} rows={tab === "actions" ? 3 : 4} style={field} /></div>
            {tab === "actions" && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div><span style={lbl}>État</span><select value={status} onChange={e => setStatus(e.target.value)} style={{ ...field, width: "auto" }}>{ITEM_STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div><span style={lbl}>Date (obligatoire)</span><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...field, width: "auto", colorScheme: T.mode === "dark" ? "dark" : "light" }} /></div>
            </div>}
            {tab === "comment" && <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: FZ.sm }}><input type="checkbox" checked={priv} onChange={e => setPriv(e.target.checked)} style={{ accentColor: T.teal600 }} />Commentaire privé</label>}
          </>}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: "auto" }}>
            <button disabled={!!problem || busy} onClick={apply} title={problem || ""} style={{ border: "none", borderRadius: 12, padding: "8px 16px", background: problem ? T.ink100 : T.navy700, color: problem ? T.ink500 : "#fff", fontWeight: 800, fontSize: FZ.sm, fontFamily: T.font, cursor: problem ? "default" : "pointer" }}>{busy ? "Enregistrement…" : "Appliquer à " + pjs.length + " projet" + (pjs.length > 1 ? "s" : "")}</button>
            {problem && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{problem}</span>}
            {msg && <span role="status" style={{ fontSize: FZ.xs, fontWeight: 700, color: msg.err ? T.red600 : T.emerald600 }}>{msg.t}</span>}
          </div>
        </div>
      </div>
    </div>
  </div>, document.body);
}
