// v279 (skill kpi-dashboard-design, tous les sous-onglets KPI) : en-tête commun — la question à laquelle répond la page, la période et
// la méthode (« ne pas cacher la méthode »), et les objectifs chiffrés concernés : objectif, valeur, écart, vert si tenu / rouge sinon.
// « Objectifs » (propriétaire) : fenêtre de réglage, enregistrée dans planning/profiles.kpiTargets.
import React, { useEffect, useState } from "react";
import { Chip } from "./SharedUI";
import { T } from "../theme";
import { KPI_TARGETS, judge, targetDef } from "../kpiTargets";

const fmtV = (k, v) => v == null ? "—" : (k === "derive" && v > 0 ? "+" : "") + v + (targetDef(k).unit ? (targetDef(k).unit === "%" ? " %" : " " + targetDef(k).unit) : "");
export function TargetChip({ k, v, targets, label }) {
  const d = targetDef(k), j = judge(k, v, targets);
  const tone = j.ok == null ? [T.ink500, T.surface, T.line] : j.ok ? [T.emerald600, T.emerald100, T.emerald500] : [T.red600, T.red100, T.red500];
  return <div title={d.how} style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 150, padding: "6px 10px", borderRadius: 12, background: tone[1], border: "1px solid " + tone[2] }}>
    <span style={{ fontSize: 12, color: T.ink700, fontWeight: 600 }}>{label || d.l}</span>
    <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
      <b style={{ fontSize: 20, color: tone[0], fontVariantNumeric: "tabular-nums" }}>{fmtV(k, v)}</b>
      <span style={{ fontSize: 12, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>objectif {d.dir === "min" ? "≥" : "≤"} {fmtV(k, j.target)}</span>
    </span>
    <span style={{ fontSize: 11.5, fontWeight: 700, color: tone[0] }}>{j.ok == null ? "pas de donnée" : j.ok ? "tenu" + (j.gap ? " (marge " + Math.abs(j.gap) + (d.unit === "%" ? " pts" : d.unit ? " " + d.unit : "") + ")" : "") : "écart " + Math.abs(j.gap) + (d.unit === "%" ? " pts" : d.unit ? " " + d.unit : "")}</span>
  </div>;
}
export function TargetsDialog({ targets, onSave, onClose }) {
  const [v, setV] = useState(() => ({ ...targets })), [busy, setBusy] = useState(false);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label="Objectifs des KPI" style={{ width: "min(560px,100%)", background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: "16px 18px", fontFamily: T.font, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Objectifs des KPI</div>
      <div style={{ fontSize: 12.5, color: T.ink500 }}>Chaque objectif s'affiche à côté de la valeur, en vert s'il est tenu, en rouge sinon. Valeurs pour tout le Manager.</div>
      {KPI_TARGETS.map(d => <label key={d.k} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto 120px", gap: 8, alignItems: "center", fontSize: 13 }}>
        <span><b>{d.l}</b><span style={{ display: "block", fontSize: 12, color: T.ink500 }}>{d.how}</span></span>
        <span style={{ fontSize: 13, color: T.ink700 }}>{d.dir === "min" ? "au moins" : "au plus"}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="number" step="any" value={v[d.k]} onChange={e => setV({ ...v, [d.k]: e.target.value })} aria-label={d.l} style={{ width: 80, minHeight: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, padding: "0 8px", fontFamily: T.font, fontSize: 13 }} />{d.unit}</span>
      </label>)}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} style={{ minHeight: 34, padding: "0 14px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink700, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Annuler</button>
        <button type="button" disabled={busy} onClick={async () => { setBusy(true); const o = {}; KPI_TARGETS.forEach(d => { const x = +v[d.k]; if (!isNaN(x)) o[d.k] = x; }); const ok = await onSave(o); setBusy(false); if (ok !== false) onClose(); }} style={{ minHeight: 34, padding: "0 14px", borderRadius: 8, border: "1px solid " + T.ink900, background: T.ink900, color: T.card, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Enregistrer</button>
      </div>
    </div>
  </div>);
}
// question = ce que la page permet de décider ; period = fenêtre de temps ; how = méthode ; items = [[clé, valeur, libellé?]]
// v280 : choix de la période des objectifs (un mois ou plusieurs) — sel = { from, to, set(from, to), months: [AAAA-MM] }
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const monthLab = k => { if (!k) return ""; const [y, m] = k.split("-"); return MOIS[+m - 1] + " " + y; };
const mkey = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
export function PeriodPicker({ sel }) {
  const t = new Date(), m = n => mkey(new Date(t.getFullYear(), t.getMonth() + n, 1));
  const presets = [["Mois dernier", m(-1), m(-1)], ["Mois en cours", m(0), m(0)], ["3 derniers mois", m(-3), m(-1)], ["Année " + t.getFullYear(), t.getFullYear() + "-01", t.getFullYear() + "-12"], ["Tout", "", ""]];
  const sl = { minHeight: 28, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: 12, fontFamily: T.font };
  return <div role="group" aria-label="Période des objectifs" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", width: "100%" }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: T.ink500 }}>Période :</span>
    {presets.map(([l, a, b]) => <Chip key={l} on={sel.from === a && sel.to === b} onClick={() => sel.set(a, b)}>{l}</Chip>)}
    <label style={{ fontSize: 12, color: T.ink500, display: "inline-flex", alignItems: "center", gap: 4 }}>du<select value={sel.from} onChange={e => sel.set(e.target.value, sel.to && sel.to < e.target.value ? e.target.value : sel.to)} style={sl}><option value="">début</option>{sel.months.map(k => <option key={k} value={k}>{monthLab(k)}</option>)}</select></label>
    <label style={{ fontSize: 12, color: T.ink500, display: "inline-flex", alignItems: "center", gap: 4 }}>au<select value={sel.to} onChange={e => sel.set(sel.from && sel.from > e.target.value && e.target.value ? e.target.value : sel.from, e.target.value)} style={sl}><option value="">fin</option>{sel.months.map(k => <option key={k} value={k}>{monthLab(k)}</option>)}</select></label>
  </div>;
}
export function KpiHead({ question, period, how, items, targets, onSaveTargets, sel }) {
  const [open, setOpen] = useState(false);
  return (<section aria-label="Question et objectifs de la page" style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <div style={{ flex: "1 1 320px", minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.ink900 }}>{question}</div>
      <div style={{ fontSize: 12.5, color: T.ink500, marginTop: 2 }}>{period}{how ? " · " + how : ""}</div>
    </div>
    {(items || []).length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{items.map(([k, v, l]) => <TargetChip key={k} k={k} v={v} label={l} targets={targets} />)}</div>}
    {onSaveTargets && <button type="button" onClick={() => setOpen(true)} style={{ minHeight: 30, padding: "0 12px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink700, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: T.font }}>Objectifs</button>}
    {sel && <PeriodPicker sel={sel} />}
    {open && <TargetsDialog targets={targets} onSave={onSaveTargets} onClose={() => setOpen(false)} />}
  </section>);
}
