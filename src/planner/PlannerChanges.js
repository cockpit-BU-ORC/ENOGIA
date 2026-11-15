import React, { useState, useMemo } from "react";
import { T } from "../theme";
import { tableTh } from "../components/SharedUI";
import { fmtIso } from "./PlannerGantt";

// ── Onglet « Modifications » : synthèse de ce qui a bougé entre le plan en cours et une référence ──────────
// Une ligne par PJ touché, triée par départ le plus en retard ; chaque date modifiée montre l'écart en jours calendaires
// (rouge = plus tard, vert = plus tôt). Aucun besoin de fouiller le Gantt : un clic sur la ligne y emmène.

const FIELDS = [["arrivee", "Arrivée"], ["tests", "Tests"], ["testsFin", "Fin tests"], ["finProd", "Fin prod."], ["depart", "Départ"]];
const fmtDelta = n => (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n) + " j";
const TONE = {
  late: { bg: T.red100, fg: T.red500 },
  early: { bg: T.emerald100, fg: T.emerald600 },
  neutral: { bg: T.amber100, fg: T.amber600 },
};
const KIND_COLOR = { "Priorité": "#5A44A6", "Durée": "#17734F", "Date imposée": "#A4570B", "Travail": "#2E7D9A", "Lien": "#44546A", "Tâche libre": "#7A5A1C", "Étape": "#7A5A1C", "PJ": "#A8332F", "Capacité": "#2E7D9A", "Règle": "#5A44A6", "Nivellement": "#17734F" };

function DateCell({ c, strong }) {
  if (!c) return <span style={{ color: T.ink300 }}>·</span>;
  const tone = TONE[c.delta === null ? "neutral" : c.delta > 0 ? "late" : "early"];
  const label = c.delta === null ? (c.to ? "défini" : "retiré") : fmtDelta(c.delta);
  return (<span title={fmtIso(c.from) + " → " + fmtIso(c.to) + (c.delta !== null ? " (" + fmtDelta(c.delta) + " calendaires)" : "")} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1, lineHeight: 1.15 }}>
    <span style={{ background: tone.bg, color: tone.fg, borderRadius: 8, padding: strong ? "2px 8px" : "1px 7px", fontWeight: 600, fontSize: strong ? 13 : 12 }}>{label}</span>
    <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.fontMono, whiteSpace: "nowrap" }}>{c.from ? fmtIso(c.from).slice(0, 5) : "—"} → {c.to ? fmtIso(c.to).slice(0, 5) : "—"}</span>
  </span>);
}

// Texte brut de la synthèse (à coller dans un mail ou un compte rendu)
export function changesText({ refLabel, summary, planDiff, ctx }) {
  const st = summary.stats; const L = [];
  L.push(ctx === "version" ? "Modifications du planning — " + refLabel : "Modifications du planning — comparé à : " + refLabel);
  L.push(st.nPj + " PJ modifié" + (st.nPj > 1 ? "s" : "") + " · " + st.late + " départ" + (st.late > 1 ? "s" : "") + " en retard" + (st.late ? " (jusqu'à +" + st.maxLate + " j)" : "") + " · " + st.early + " avancé" + (st.early > 1 ? "s" : "") + (st.nNew ? " · " + st.nNew + " nouveau" + (st.nNew > 1 ? "x" : "") : ""));
  L.push("");
  summary.pjs.forEach(p => {
    if (p.isNew) { L.push("• " + p.pj + (p.nomProjet ? " — " + p.nomProjet : "") + " : nouveau PJ"); return; }
    const parts = FIELDS.filter(([f]) => p.d[f]).map(([f, l]) => { const c = p.d[f]; return l + " " + fmtIso(c.from) + " → " + fmtIso(c.to) + (c.delta !== null ? " (" + fmtDelta(c.delta) + ")" : ""); });
    if (p.hours) { if (p.hours.at) parts.push("Heures atelier " + p.hours.at.from + " → " + p.hours.at.to); if (p.hours.au) parts.push("Heures autom " + p.hours.au.from + " → " + p.hours.au.to); }
    L.push("• " + p.pj + (p.nomProjet ? " — " + p.nomProjet : "") + " : " + parts.join(" ; "));
  });
  if (planDiff && planDiff.length) { L.push(""); L.push("Modifications du plan :"); planDiff.forEach(x => L.push("– " + (x.pj ? x.pj + " · " : "") + x.kind + " : " + x.text)); }
  return L.join("\n");
}

export function PlannerChanges({ summary, planDiff, refs, refId, setRefId, refLabel, hasDetail, loadingRefs, q, onOpenPj, ctx, lead, removed, openHint }) {
  const [filter, setFilter] = useState("all"); const [copied, setCopied] = useState(false); const [allDiff, setAllDiff] = useState(false);
  const st = summary.stats; const needle = (q || "").trim().toLowerCase();
  const list = useMemo(() => summary.pjs.filter(p => {
    if (needle && !(p.pj.toLowerCase().includes(needle) || (p.nomProjet || "").toLowerCase().includes(needle))) return false;
    return filter === "all" ? true : filter === "late" ? p.group === 0 : filter === "early" ? p.group === 2 : filter === "hours" ? !!p.hours : filter === "new" ? p.isNew : true;
  }), [summary, filter, needle]);
  const copy = () => {
    const text = changesText({ refLabel, summary, planDiff, ctx });
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    try { navigator.clipboard.writeText(text).then(done, () => fallback(text, done)); } catch (e) { fallback(text, done); }
  };
  const tiles = [
    ["all", "PJ modifiés", st.nPj, st.nDates + " date" + (st.nDates > 1 ? "s" : "") + " changée" + (st.nDates > 1 ? "s" : ""), T.ink900],
    ["late", "Départs en retard", st.late, st.late ? "jusqu'à +" + st.maxLate + " j" : "aucun", st.late ? T.red500 : T.emerald600],
    ["early", "Départs avancés", st.early, st.early ? "jusqu'à −" + st.maxEarly + " j" : "aucun", st.early ? T.emerald600 : T.ink500],
    ["hours", "Heures modifiées", st.nHours, "PJ concernés", T.ink900],
    ["new", "Nouveaux PJ", st.nNew, ctx === "version" ? st.nRemoved + " retiré" + (st.nRemoved > 1 ? "s" : "") : st.nRemoved ? st.nRemoved + " absent" + (st.nRemoved > 1 ? "s" : "") + " du plan" : "dans le plan", T.ink900],
  ];
  const th = { ...tableTh({ sticky: true, align: "center" }), padding: "7px 8px" }; // v313 : tableau commun
  return (<div style={{ padding: "14px 16px 16px" }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: T.ink500 }}>{lead || "Plan en cours comparé à"}</span>
      <select value={refId} onChange={e => { setRefId(e.target.value); setFilter("all"); }} aria-label="Référence de comparaison" style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: 13, fontWeight: 500, fontFamily: T.font, maxWidth: 560 }}>
        {refs.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
      {loadingRefs && <span style={{ fontSize: 12, color: T.ink500 }}>chargement de l'historique…</span>}
      <span style={{ flex: 1 }} />
      <button className="pg-tb" style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink700, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap" }} onClick={copy} title="Copie la synthèse en texte, prête à coller dans un mail ou un compte rendu">{copied ? "Copié ✓" : "Copier la synthèse"}</button>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
      {tiles.map(([k, label, n, sub, col]) => (<button key={k} onClick={() => setFilter(filter === k && k !== "all" ? "all" : k)} aria-pressed={filter === k}
        style={{ textAlign: "left", cursor: "pointer", fontFamily: T.font, background: filter === k ? T.teal100 : T.card, border: "1px solid " + (filter === k ? T.teal500 : T.line), borderRadius: 12, padding: "9px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: T.ink500 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: n ? col : T.ink300, lineHeight: 1.15 }}>{n}</div>
        <div style={{ fontSize: 12, color: T.ink500 }}>{sub}</div>
      </button>))}
    </div>

    {summary.pjs.length === 0 ? <div style={{ background: T.emerald100, color: T.emerald600, borderRadius: 12, padding: "14px 16px", fontWeight: 600, fontSize: 14 }}>{ctx === "version" ? "✓ Aucune date ni heure n'a changé entre ces deux versions." : <>✓ Aucune différence : le plan en cours est identique à « {refLabel} ».</>}</div>
      : list.length === 0 ? <div style={{ color: T.ink500, fontSize: 14, padding: "10px 2px" }}>Aucun PJ ne correspond à ce filtre.</div>
      : <div style={{ border: "1px solid " + T.line, borderRadius: 12, overflow: "auto", maxHeight: 520 }}>
        <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>
            <th style={{ ...th, textAlign: "left", paddingLeft: 12 }}>PJ</th>
            {FIELDS.map(([f, l]) => <th key={f} style={{ ...th, color: f === "depart" ? T.ink900 : T.ink500 }}>{l}</th>)}
            <th style={th}>Heures</th><th style={th} />
          </tr></thead>
          <tbody>
            {list.map(p => (<tr key={p.pj} className="pg-row" onClick={() => onOpenPj(p.pj)} style={{ cursor: "pointer", borderTop: "1px solid " + T.line }}>
              <td style={{ padding: "7px 8px 7px 12px", minWidth: 190 }}>
                <div style={{ fontFamily: T.fontMono, fontWeight: 600, color: T.teal600 }}>{p.pj}{p.isNew && <span style={{ marginLeft: 6, fontFamily: T.font, fontSize: 12, background: T.amber100, color: T.amber600, borderRadius: 4, padding: "1px 6px" }}>nouveau</span>}</div>
                {p.nomProjet && <div style={{ fontSize: 12, color: T.ink500, maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nomProjet}</div>}
              </td>
              {FIELDS.map(([f]) => <td key={f} style={{ padding: "6px 4px", textAlign: "center", background: f === "depart" && p.d.depart ? "rgba(0,0,0,.025)" : "transparent" }}>{p.isNew ? (f === "depart" && p.row.depart ? <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.fontMono }}>{fmtIso(p.row.depart)}</span> : null) : <DateCell c={p.d[f]} strong={f === "depart"} />}</td>)}
              <td style={{ padding: "6px 6px", textAlign: "center", fontSize: 12, color: T.ink700, whiteSpace: "nowrap" }}>
                {p.hours ? <>{p.hours.at && <div title="Heures atelier">At. {p.hours.at.from} → {p.hours.at.to} h</div>}{p.hours.au && <div title="Heures autom">Au. {p.hours.au.from} → {p.hours.au.to} h</div>}</> : <span style={{ color: T.ink300 }}>·</span>}
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" }}><span style={{ fontSize: 12, fontWeight: 500, color: T.teal600 }}>Voir ›</span></td>
            </tr>))}
          </tbody>
        </table>
      </div>}
    <div style={{ fontSize: 12, color: T.ink500, marginTop: 6 }}>Écarts en jours calendaires : <span style={{ color: TONE.late.fg, fontWeight: 600 }}>rouge = plus tard</span>, <span style={{ color: TONE.early.fg, fontWeight: 600 }}>vert = plus tôt</span> · cliquez une ligne pour l'ouvrir {openHint || "dans le Gantt"}.</div>
    {removed && removed.length > 0 && <div style={{ marginTop: 10, fontSize: 13, color: T.ink700, lineHeight: 1.7 }}><b style={{ color: T.red500 }}>Retirés de cette version :</b> {removed.map(r => <span key={r.pj} title={r.nomProjet || ""} style={{ fontFamily: T.fontMono, fontWeight: 600, background: T.red100, color: T.red500, borderRadius: 4, padding: "1px 7px", marginRight: 5, display: "inline-block" }}>{r.pj}</span>)}</div>}

    {hasDetail ? (planDiff.length > 0 && <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: T.ink900, marginBottom: 6 }}>Ce qui a changé dans le plan ({planDiff.length}) <span style={{ fontWeight: 400, color: T.ink500, fontSize: 12 }}>· les causes des décalages ci-dessus</span></div>
      <div style={{ border: "1px solid " + T.line, borderRadius: 12, overflow: "auto", maxHeight: allDiff ? 520 : 240 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
          {(allDiff ? planDiff : planDiff.slice(0, 60)).map((x, i) => (<tr key={i} onClick={x.pj ? () => onOpenPj(x.pj) : undefined} className={x.pj ? "pg-row" : undefined} style={{ borderTop: i ? "1px solid " + T.line : "none", cursor: x.pj ? "pointer" : "default" }}>
            <td style={{ padding: "5px 10px", width: 110 }}><span style={{ fontSize: 12, fontWeight: 500, color: KIND_COLOR[x.kind] || T.ink700 }}>{x.kind}</span></td>
            <td style={{ padding: "5px 8px", width: 100, fontFamily: T.fontMono, fontWeight: 600, color: T.teal600 }}>{x.pj || ""}</td>
            <td style={{ padding: "5px 10px", color: T.ink700 }}>{x.text}</td>
          </tr>))}
        </tbody></table>
      </div>
      {planDiff.length > 60 && !allDiff && <button className="pg-tb" style={{ marginTop: 6 }} onClick={() => setAllDiff(true)}>Afficher les {planDiff.length} lignes</button>}
    </div>) : hasDetail === null ? null : <div style={{ marginTop: 14, fontSize: 12, color: T.ink500, lineHeight: 1.55 }}>Le détail des causes (durées, dates imposées, travail, liens, priorité) est disponible en comparant à « Ouverture de la page » ou à une publication passée : ces références gardent le plan complet, pas seulement les dates.</div>}
  </div>);
}

function fallback(text, done) {
  try { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); done(); } catch (e) { /* copie indisponible */ }
}
