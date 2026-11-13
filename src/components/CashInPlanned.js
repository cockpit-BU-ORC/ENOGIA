// v260 : fenêtre « Prévu jusqu’à fin 2026 » du Cash in, sortie de l’ancien Cash in du site (CashInNative.js, supprimé).
import React, { useEffect, useMemo, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { NavIcon, tableTh, tableTd } from "./SharedUI";
import { plannedUntil } from "../cashinModel";
import { fmtEur } from "../pjProgress";

const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(2, 4) : "—");
const btn = primary => ({ padding: "6px 12px", minHeight: 32, borderRadius: 8, border: "1px solid " + (primary ? T.ink900 : T.line), background: primary ? T.ink900 : T.card, color: primary ? T.card : T.ink700, fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", fontFamily: T.font, display: "inline-flex", alignItems: "center", gap: 6 });
const UNTIL = "2026-12-31";
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// v252 (demandé : « un bouton dans À traiter pour voir toutes les facturations et encaissements prévus jusqu'à fin 2026 ») :
// fenêtre listant, mois par mois, les factures à émettre et les encaissements attendus d'ici UNTIL (retards en tête du mois
// courant, signalés en rouge), avec les totaux ; un clic ouvre le jalon.
export function PlannedDialog({ rows, labels, today, onClose, onOpenRow }) {
  const [show, setShow] = useState("all");
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const all = useMemo(() => plannedUntil(rows, UNTIL), [rows]);
  const list = all.filter(x => show === "all" || x.kind === show);
  const sum = k => all.filter(x => x.kind === k).reduce((a, x) => a + x.montant, 0);
  const byMonth = [];
  list.forEach(x => { const m = x.date < today ? "retard" : x.date.slice(0, 7); let g = byMonth.find(b => b.m === m); if (!g) { g = { m, items: [] }; byMonth.push(g); } g.items.push(x); });
  byMonth.sort((a, b) => (a.m === "retard" ? -1 : b.m === "retard" ? 1 : a.m.localeCompare(b.m)));
  const th = tableTh(), td = { ...tableTd(), padding: "0 8px" }; // v313 : tableau commun
  const tab = (id, l) => <button key={id} type="button" aria-pressed={show === id} onClick={() => setShow(id)} style={{ ...btn(show === id) }}>{l}</button>;
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(8,12,28,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 12px", overflowY: "auto" }}>
    <div role="dialog" aria-modal="true" aria-label={"Facturations et encaissements prévus jusqu'au " + fd(UNTIL)} style={{ width: "min(920px,100%)", background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid " + T.line, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: FZ.md, fontWeight: 600 }}>Prévu jusqu'au 31 décembre {UNTIL.slice(0, 4)}</div>
          <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Factures pas encore émises et paiements pas encore reçus (hors EPC). Clic sur une ligne = le jalon.</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{ ...btn(false) }}><NavIcon name="close" size={14} />Fermer</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8, padding: "12px 16px 4px" }}>
        <div style={{ background: T.surface, borderRadius: 12, padding: "8px 12px" }}><div style={{ fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>À facturer d'ici fin {UNTIL.slice(0, 4)}</div><div style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtEur(sum("facture"))}</div></div>
        <div style={{ background: T.surface, borderRadius: 12, padding: "8px 12px" }}><div style={{ fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>À encaisser d'ici fin {UNTIL.slice(0, 4)}</div><div style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: T.emerald600 }}>{fmtEur(sum("encaissement"))}</div></div>
      </div>
      <div role="group" aria-label="Afficher" style={{ display: "flex", gap: 6, padding: "8px 16px", flexWrap: "wrap" }}>{tab("all", "Tout")}{tab("facture", "Facturations")}{tab("encaissement", "Encaissements")}</div>
      <div style={{ padding: "0 16px 16px", overflowX: "auto" }}>
        {list.length === 0 ? <div style={{ padding: "16px 0", fontSize: FZ.sm, color: T.ink500 }}>Rien de prévu d'ici la fin de l'année.</div> :
          <table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
            <thead><tr><th style={th}>Date prévue</th><th style={th}>PJ</th><th style={th}>Jalon</th><th style={th}>Type</th><th style={{ ...th, textAlign: "right" }}>Montant</th></tr></thead>
            {byMonth.map(g => { const tot = g.items.reduce((a, x) => a + x.montant, 0); return (<tbody key={g.m}>
              <tr><td colSpan={5} style={{ padding: "10px 8px 4px", fontSize: FZ.xs, fontWeight: 600, color: g.m === "retard" ? T.red500 : T.ink900 }}>{g.m === "retard" ? "Déjà en retard" : MOIS[Number(g.m.slice(5, 7)) - 1] + " " + g.m.slice(0, 4)} <span style={{ color: T.ink500, fontWeight: 600 }}>· {fmtEur(tot)}</span></td></tr>
              {g.items.map((x, i) => <tr key={x.r.id + x.kind + i} className="enogia-kpi-row" tabIndex={0} onClick={() => onOpenRow(x.r.id)} onKeyDown={e => { if (e.key === "Enter") onOpenRow(x.r.id); }} style={{ cursor: "pointer" }} aria-label={"Ouvrir le jalon " + x.r.pj + " " + (x.r.jalon || "")}>
                <td style={{ ...td, color: x.date < today ? T.red500 : T.ink700, fontWeight: x.date < today ? 700 : 400 }}>{fd(x.date)}</td>
                <td style={{ ...td, fontFamily: T.fontMono, fontWeight: 600, color: T.ink900 }}>{x.r.pj}<span style={{ fontFamily: T.font, fontWeight: 400, color: T.ink500 }}>{labels[x.r.pj] ? " · " + labels[x.r.pj] : ""}</span></td>
                <td style={{ ...td, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{x.r.jalon || "Jalon sans nom"}</td>
                <td style={td}>{x.kind === "facture" ? "Facturation" : "Encaissement"}</td>
                <td style={{ ...td, textAlign: "right", color: T.ink900, fontWeight: 600 }}>{fmtEur(x.montant)}</td>
              </tr>)}
            </tbody>); })}
          </table>}
      </div>
    </div>
  </div>);
}
