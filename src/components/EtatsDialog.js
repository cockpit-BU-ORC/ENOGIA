// v146.19 — Fenêtre « États » ouverte depuis la liste déroulante de Suivi › Statut & état.
// Elle liste les états existants avec leur couleur et permet d'en créer un nouveau (nom + couleur).
// Les états intégrés sont en lecture seule ; les états créés ici se renomment, se recolorent et se suppriment.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { T, FZF as FZ } from "../theme";
import { ETAT_META, ASSIGNABLE_ETATS, ALL_ETATS, isCustomEtat, etatColors } from "../pjMeta";

export const ETAT_SWATCHES = ["#4a64b8", "#2e8fbf", "#4f9fa8", "#4f9a7f", "#7c9a3c", "#c79a2e", "#b68a56", "#b86a63", "#9b72b3", "#8a9199"];
export const etatSlug = t => "CUSTOM_" + t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");

const Chip = ({ m, label }) => <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: m.bg, color: m.text, border: "1px solid " + m.border, borderRadius: 999, padding: "3px 12px", fontSize: FZ.xs, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>;

export function EtatsDialog({ onClose, customEtats, setCustomEtats, data }) {
  const [label, setLabel] = useState(""), [color, setColor] = useState("#c79a2e"), [err, setErr] = useState("");
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const used = id => (data || []).filter(r => r.etat === id).length;
  const labels = ALL_ETATS.map(e => ETAT_META[e].label.toLowerCase());
  const add = async () => {
    const t = label.trim(); if (!t) return;
    const id = etatSlug(t);
    if (labels.includes(t.toLowerCase()) || ETAT_META[id]) { setErr("Un état porte déjà ce nom."); return; }
    setErr("");
    if (await setCustomEtats([...customEtats, { id, label: t, color }])) setLabel("");
  };
  const patch = (id, f) => setCustomEtats(customEtats.map(e => e.id === id ? { ...e, ...f } : e));
  const del = id => { const n = used(id); if (n > 0) { setErr("Cet état est utilisé par " + n + " PJ : changez d'abord leur état dans la liste."); return; } if (window.confirm("Supprimer cet état ?")) setCustomEtats(customEtats.filter(e => e.id !== id)); };
  const fld = { padding: "6px 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.surface, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font };
  const lbl = { fontSize: FZ.xs, fontWeight: 800, color: T.ink500, textTransform: "uppercase", letterSpacing: ".04em", margin: "0 0 6px" };
  const builtin = ASSIGNABLE_ETATS.filter(e => !isCustomEtat(e));
  const prev = etatColors(color), pm = T.mode === "dark" ? prev.dark : prev.light;

  return createPortal(<div role="dialog" aria-modal="true" aria-label="États des machines" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: "fixed", inset: 0, zIndex: 20010, background: "rgba(10,16,28,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
    <div style={{ background: T.card, color: T.ink900, borderRadius: 16, boxShadow: T.shadowLg, border: "1px solid " + T.line, width: "min(560px,100%)", maxHeight: "90vh", overflow: "auto", padding: 20, fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ flex: 1, fontFamily: T.fontDisplay, fontWeight: 700, fontSize: FZ.md }}>États des machines</div>
        <button onClick={onClose} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 999, padding: "4px 12px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer" }}>Fermer</button>
      </div>
      <div style={{ fontSize: FZ.sm, color: T.ink500, marginBottom: 14 }}>États déjà disponibles et leur couleur. Un état créé ici est proposé aussitôt dans la liste et dans tous les filtres « État ».</div>

      <div style={lbl}>Existants</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>{builtin.map(e => <Chip key={e} m={ETAT_META[e]} label={ETAT_META[e].label} />)}</div>

      {customEtats.length > 0 && <>
        <div style={lbl}>Créés par vous</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {customEtats.map(e => (<div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "6px 10px", border: "1px solid " + T.line, borderRadius: 10 }}>
            {ETAT_META[e.id] && <Chip m={ETAT_META[e.id]} label={e.label} />}
            <input defaultValue={e.label} key={e.id + e.label} aria-label={"Nom de l'état " + e.label} maxLength={30} onBlur={ev => { const t = ev.target.value.trim(); if (t && t !== e.label) patch(e.id, { label: t }); else ev.target.value = e.label; }} style={{ ...fld, flex: 1, minWidth: 110 }} />
            <input type="color" value={e.color} onChange={ev => patch(e.id, { color: ev.target.value })} aria-label={"Couleur de l'état " + e.label} style={{ width: 38, height: 30, border: "1px solid " + T.line, borderRadius: 8, background: "transparent", padding: 2, cursor: "pointer" }} />
            <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{used(e.id)} PJ</span>
            <button onClick={() => del(e.id)} style={{ border: "1px solid " + T.line, background: T.card, color: T.red600, borderRadius: 8, padding: "4px 10px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer" }}>Supprimer</button>
          </div>))}
        </div>
      </>}

      <div style={{ ...lbl, paddingTop: 12, borderTop: "1px solid " + T.line }}>Nouvel état</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input value={label} autoFocus onChange={e => { setLabel(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Nom (ex. En attente client)" aria-label="Nom du nouvel état" maxLength={30} style={{ ...fld, flex: 1, minWidth: 170 }} />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} aria-label="Couleur du nouvel état" style={{ width: 42, height: 32, border: "1px solid " + T.line, borderRadius: 8, background: "transparent", padding: 2, cursor: "pointer" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
        {ETAT_SWATCHES.map(c => <button key={c} onClick={() => setColor(c)} title={c} aria-label={"Couleur " + c} style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (color === c ? T.ink900 : "transparent"), background: c, cursor: "pointer", padding: 0 }} />)}
        {label.trim() && <span style={{ marginLeft: 8 }}><Chip m={pm} label={label.trim()} /></span>}
        <button onClick={add} disabled={!label.trim()} style={{ marginLeft: "auto", border: "none", borderRadius: 10, padding: "7px 14px", background: label.trim() ? T.navy700 : T.ink100, color: label.trim() ? "#fff" : T.ink500, fontWeight: 800, fontSize: FZ.sm, cursor: label.trim() ? "pointer" : "default" }}>Créer l'état</button>
      </div>
      {err && <div role="alert" style={{ marginTop: 8, fontSize: FZ.xs, color: T.red600, fontWeight: 700 }}>{err}</div>}
    </div>
  </div>, document.body);
}
