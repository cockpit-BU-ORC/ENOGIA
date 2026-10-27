// ── v198 : Cash in — le grand tableau modifiable de l'artefact, reconstruit dans le site (demandé) ─────────────────────────
// Mêmes colonnes que public/cashin.html : Jalon · Montant · % · EPC | Initial (facture, délai, encaissement) | Prévu (facture,
// encaissement) | Réel (facture émise, paiement client) | Statut · Commentaire · suppression. Une ligne de groupe par PJ :
// numéro (renommable), nom du projet, montant du projet, chef de projet, EPC pour tout le PJ, encaissé / total, « ＋ jalon ».
// Les règles de calcul sont celles de cashinModel.applyEdit (appliquées par onEdit du parent).
import React, { useState } from "react";
import { T, FZF as FZ } from "../theme";
import { NavIcon } from "./SharedUI";
import { fmtEur } from "../pjProgress";
import { getAllChefs } from "../pjMeta";
import { groupInfo } from "../cashinModel";

const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(2, 4) : "—");
const inp = () => ({ width: "100%", boxSizing: "border-box", minHeight: 28, padding: "3px 6px", border: "1px solid transparent", borderRadius: 6, background: "transparent", color: T.ink900, fontFamily: T.font, fontSize: FZ.xs });
const COLS = [
  ["jalon", "Jalon", "base", 220], ["montant", "Montant", "base", 104], ["pct", "%", "base", 52], ["epc", "EPC", "base", 44],
  ["factInit", "Facture", "init", 124], ["delai", "Délai (j)", "init", 66], ["encInit", "Encaissement", "init", 96],
  ["factPrevue", "Facture", "prev", 124], ["encPrevue", "Encaissement", "prev", 124],
  ["factReelle", "Facture émise", "maj", 124], ["encReelle", "Paiement client", "maj", 124],
  ["statut", "Statut", "stat", 120], ["cm", "Commentaire", "cm", 200], ["del", "", "none", 40],
];
const GROUPS = [["base", "", 4], ["init", "Prévu au départ", 3], ["prev", "Prévu, actualisé", 2], ["maj", "Réel", 2], ["stat", "", 3]];

function Money({ value, onCommit, label }) {
  const [edit, setEdit] = useState(false);
  return edit
    ? <input autoFocus inputMode="decimal" defaultValue={value == null ? "" : value} aria-label={label} onBlur={e => { setEdit(false); onCommit(String(e.target.value).replace(/[^\d.,-]/g, "").replace(",", ".")); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEdit(false); }} style={{ ...inp(), textAlign: "right", borderColor: T.teal500, background: T.card }} />
    : <button type="button" onClick={() => setEdit(true)} aria-label={label} style={{ ...inp(), textAlign: "right", cursor: "text", fontVariantNumeric: "tabular-nums", color: value == null ? T.ink300 : T.ink900 }}>{value == null ? "—" : fmtEur(value)}</button>;
}

export function CashInGrid({ doc, groups, folded, setFolded, sel, setSel, today, onEdit, onAddRow, onDelRow, setGroup, renamePj, setPjEpc, rowView, S }) {
  const [arm, setArm] = useState(null);
  const chefs = getAllChefs();
  const cell = (r, k, w) => {
    const date = f => <input type="date" value={r[f] || ""} onChange={e => onEdit(r.id, f, e.target.value)} aria-label={f + " " + (r.jalon || "")} className="enogia-cash-in" style={{ ...inp(), color: r[f] ? T.ink900 : T.ink300 }} disabled={r.epc && f !== "factInit"} />;
    switch (k) {
      case "jalon": return <input defaultValue={r.jalon} key={"j" + r.jalon} onBlur={e => onEdit(r.id, "jalon", e.target.value)} placeholder="Nom du jalon" aria-label="Nom du jalon" className="enogia-cash-in" style={{ ...inp(), fontWeight: 600 }} />;
      case "montant": return <Money value={r.montant} label={"Montant " + (r.jalon || "")} onCommit={v => onEdit(r.id, "montant", v)} />;
      case "pct": { const t = groupInfo(doc, r.pj).total; return <span style={{ display: "block", textAlign: "right", fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{r.montant && t ? (Math.round(r.montant / t * 1000) / 10).toLocaleString("fr-FR") + " %" : "—"}</span>; }
      case "epc": return <input type="checkbox" checked={!!r.epc} onChange={e => onEdit(r.id, "epc", e.target.checked)} aria-label={"Jalon EPC " + (r.jalon || "")} title="Jalon géré par la BU EPC : hors suivi des factures et encaissements" style={{ width: 16, height: 16, display: "block", margin: "0 auto" }} />;
      case "delai": return <input type="number" step="1" defaultValue={r.delai == null ? "" : r.delai} key={"d" + r.delai} onBlur={e => onEdit(r.id, "delai", e.target.value)} aria-label="Délai de paiement en jours" className="enogia-cash-in" style={{ ...inp(), textAlign: "right" }} disabled={r.epc} />;
      case "encInit": return <span title="Calculé : facture initiale + délai" style={{ display: "block", padding: "0 6px", fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{fd(r.encInit)}</span>;
      case "statut": { const v = rowView(r, today), kk = r.epc ? "epc" : v.tone, c = S[kk] || S.future; return <span style={{ fontFamily: T.fontLabel, fontSize: 11, fontWeight: 600, background: c.bg, color: c.ink, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>{r.epc ? "EPC" : v.label}{v.st.days && (v.st.k === "late" || v.st.k === "tobill") ? " · " + v.st.days + " j" : v.tone === "warn" && v.due ? " · " + v.due.days + " j" : ""}</span>; }
      case "cm": return <button type="button" onClick={() => setSel(sel === r.id ? null : r.id)} title={r.note || "Ajouter un commentaire, voir les causes"} style={{ ...inp(), textAlign: "left", cursor: "pointer", color: r.note ? T.ink700 : T.ink300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}><NavIcon name="comments" size={13} />{r.note || "Commentaire"}</button>;
      case "del": return <button type="button" onClick={() => { if (arm === r.id) { onDelRow(r.id); setArm(null); } else { setArm(r.id); setTimeout(() => setArm(a => (a === r.id ? null : a)), 3500); } }} aria-label={arm === r.id ? "Confirmer la suppression" : "Supprimer le jalon"} title={arm === r.id ? "Cliquez encore pour supprimer" : "Supprimer"} style={{ border: "none", background: arm === r.id ? T.red100 : "transparent", color: arm === r.id ? T.red600 : T.ink300, borderRadius: 6, minWidth: 28, minHeight: 28, cursor: "pointer", fontSize: arm === r.id ? 11 : 14, fontWeight: 700 }}>{arm === r.id ? "Suppr. ?" : "✕"}</button>;
      default: return date(k);
    }
  };
  const gb = g => (g === "init" || g === "prev" || g === "maj" ? "2px solid " + T.line : "none");
  return (<div style={{ flex: 1, minWidth: 0, background: T.card, border: "1px solid " + T.line, borderRadius: 10, overflow: "auto", maxHeight: "calc(100dvh - 260px)" }}>
    <table className="enogia-cash-grid" style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: FZ.xs, minWidth: COLS.reduce((a, c) => a + c[3], 0) }}>
      <colgroup>{COLS.map(c => <col key={c[0]} style={{ width: c[3] }} />)}</colgroup>
      <thead>
        <tr>{GROUPS.map(([g, l, n]) => <th key={g} colSpan={n} style={{ position: "sticky", top: 0, zIndex: 3, background: T.surface, padding: "6px 8px 2px", textAlign: "left", fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, color: T.ink700, borderLeft: gb(g) }}>{l}</th>)}</tr>
        <tr>{COLS.map(([k, l, g], i) => <th key={k} style={{ position: "sticky", top: 25, zIndex: 3, background: T.surface, padding: "2px 8px 6px", textAlign: k === "montant" || k === "pct" || k === "delai" ? "right" : "left", fontFamily: T.fontLabel, fontSize: 12, fontWeight: 500, color: T.ink500, borderBottom: "1px solid " + T.line, borderLeft: i > 0 && COLS[i - 1][2] !== g ? gb(g) : "none", whiteSpace: "nowrap", ...(k === "jalon" ? { left: 0, zIndex: 4 } : {}) }}>{l}</th>)}</tr>
      </thead>
      <tbody>
        {groups.length === 0 && <tr><td colSpan={COLS.length} style={{ padding: 16, color: T.ink500, fontSize: FZ.sm }}>Aucun jalon ne correspond.</td></tr>}
        {groups.map(({ pj, g, list }) => <React.Fragment key={pj}>
          <tr>
            <td colSpan={COLS.length} style={{ background: T.surfaceAlt, borderTop: "1px solid " + T.line, padding: "4px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", position: "sticky", left: 8, width: "max-content", maxWidth: "calc(100vw - 160px)" }}>
                <button type="button" onClick={() => setFolded(f => { const n = new Set(f); n.has(pj) ? n.delete(pj) : n.add(pj); return n; })} aria-expanded={!folded.has(pj)} aria-label={(folded.has(pj) ? "Déplier " : "Replier ") + pj} style={{ border: "none", background: "transparent", cursor: "pointer", color: T.ink500, minWidth: 24, minHeight: 24, padding: 0 }}><span style={{ display: "inline-flex", transform: folded.has(pj) ? "rotate(-90deg)" : "none", transition: "transform .15s ease" }}><NavIcon name="chevronDown" size={13} /></span></button>
                <input defaultValue={pj} key={"pj" + pj} onBlur={e => { const v = e.target.value.trim().toUpperCase(); if (v && v !== pj) renamePj(pj, v); else e.target.value = pj; }} aria-label="Numéro du PJ" className="enogia-cash-in" style={{ ...inp(), width: 96, fontFamily: T.fontMono, fontWeight: 700, fontSize: FZ.sm }} />
                <input defaultValue={g.label} key={"lb" + pj + g.label} onBlur={e => setGroup(pj, "labels", e.target.value.trim())} placeholder="Nom du projet" aria-label={"Nom du projet " + pj} className="enogia-cash-in" style={{ ...inp(), width: 200, fontSize: FZ.sm, color: T.ink700 }} />
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.ink500 }}>Montant du projet
                  <input inputMode="decimal" defaultValue={(doc.totals || {})[pj] || ""} key={"tt" + pj + ((doc.totals || {})[pj] || "")} placeholder={String(Math.round(g.sum))} onBlur={e => setGroup(pj, "totals", String(e.target.value).replace(/[^\d.,]/g, "").replace(",", "."))} aria-label={"Montant du projet " + pj} className="enogia-cash-in" style={{ ...inp(), width: 110, textAlign: "right" }} /></label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.ink500 }}>CdP
                  <input list="enogia-cash-chefs" defaultValue={(doc.owners || {})[pj] || ""} key={"ow" + pj + ((doc.owners || {})[pj] || "")} onBlur={e => setGroup(pj, "owners", e.target.value.trim())} aria-label={"Chef de projet " + pj} className="enogia-cash-in" style={{ ...inp(), width: 150 }} /></label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.ink500, cursor: "pointer" }}><input type="checkbox" checked={g.epc} onChange={e => setPjEpc(pj, e.target.checked)} />PJ EPC</label>
                <span style={{ color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{fmtEur(g.paid)} encaissés sur {fmtEur(g.total)}{g.total ? " · " + Math.round(g.paid / g.total * 100) + " %" : ""}</span>
                <button type="button" onClick={() => onAddRow(pj)} style={{ border: "none", background: "transparent", color: T.teal600, fontWeight: 700, cursor: "pointer", minHeight: 24, fontFamily: T.font, fontSize: FZ.xs }}>＋ jalon</button>
              </div>
            </td>
          </tr>
          {!folded.has(pj) && list.map(r => { const on = sel === r.id; return (
            <tr key={r.id} style={{ background: on ? T.teal100 : r.epc ? T.surface : T.card, opacity: r.epc ? .7 : 1 }}>
              {COLS.map(([k, , gr], i) => <td key={k} style={{ padding: "2px 2px", borderTop: "1px solid " + T.line, borderLeft: i > 0 && COLS[i - 1][2] !== gr ? gb(gr) : "none", verticalAlign: "middle", background: k === "jalon" ? "inherit" : undefined, ...(k === "jalon" ? { position: "sticky", left: 0, zIndex: 1 } : {}) }}>{cell(r, k)}</td>)}
            </tr>); })}
        </React.Fragment>)}
      </tbody>
    </table>
    <datalist id="enogia-cash-chefs">{chefs.map(c => <option key={c} value={c} />)}</datalist>
  </div>);
}
