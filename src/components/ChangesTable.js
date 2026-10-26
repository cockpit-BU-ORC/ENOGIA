import React, { useState, useMemo } from "react";
import { T, FZ } from "../theme";
import { EmptyState } from "./SharedUI";
import { PjPlate } from "../pjMeta";
const fmtIso = iso => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(2, 4) : "—";

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

// v125 : trait proportionnel à l'écart (milieu = date d'origine ; vers la droite = plus tard, vers la gauche = plus tôt).
// Purement visuel (aria-hidden) : l'écart reste écrit en toutes lettres dans la pastille juste au-dessus.
function GapBar({ delta, color }) {
  const len = Math.min(26, Math.abs(delta) * 1.6 + 3), x2 = 30 + (delta > 0 ? len : -len);
  return (<svg aria-hidden="true" width="60" height="8" viewBox="0 0 60 8" style={{ display: "block", margin: "1px 0" }}>
    <line x1="2" y1="4" x2="58" y2="4" stroke={T.line} strokeWidth="1" />
    <line x1="30" y1="4" x2={x2} y2="4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="30" cy="4" r="2.5" fill={T.card} stroke={color} strokeWidth="1.5" />
  </svg>);
}

function DateCell({ c, strong }) {
  if (!c) return <span style={{ color: T.ink300 }}>·</span>;
  const tone = TONE[c.delta === null ? "neutral" : c.delta > 0 ? "late" : "early"];
  const label = c.delta === null ? (c.to ? "défini" : "retiré") : fmtDelta(c.delta);
  return (<span title={fmtIso(c.from) + " → " + fmtIso(c.to) + (c.delta !== null ? " (" + fmtDelta(c.delta) + " calendaires)" : "")} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1, lineHeight: 1.15 }}>
    <span style={{ background: tone.bg, color: tone.fg, borderRadius: 8, padding: strong ? "2px 8px" : "1px 7px", fontWeight: 700, fontSize: strong ? FZ.xs : FZ.xs }}>{label}</span>
    {c.delta !== null && <GapBar delta={c.delta} color={tone.fg} />}
    <span style={{ fontSize: FZ.xs, color: T.ink500, fontFamily: T.fontMono, whiteSpace: "nowrap" }}>{c.from ? fmtIso(c.from).slice(0, 5) : "—"} → {c.to ? fmtIso(c.to).slice(0, 5) : "—"}</span>
  </span>);
}

// Texte brut de la synthèse (à coller dans un mail ou un compte rendu)
function changesText({ refLabel, summary }) {
  const st = summary.stats; const L = [];
  L.push("Modifications du planning — " + refLabel);
  L.push(st.nPj + " PJ modifié" + (st.nPj > 1 ? "s" : "") + " · " + st.late + " départ" + (st.late > 1 ? "s" : "") + " en retard" + (st.late ? " (jusqu'à +" + st.maxLate + " j)" : "") + " · " + st.early + " avancé" + (st.early > 1 ? "s" : "") + (st.nNew ? " · " + st.nNew + " nouveau" + (st.nNew > 1 ? "x" : "") : ""));
  L.push("");
  summary.pjs.forEach(p => {
    if (p.isNew) { L.push("• " + p.pj + (p.nomProjet ? " — " + p.nomProjet : "") + " : nouveau PJ"); return; }
    const parts = FIELDS.filter(([f]) => p.d[f]).map(([f, l]) => { const c = p.d[f]; return l + " " + fmtIso(c.from) + " → " + fmtIso(c.to) + (c.delta !== null ? " (" + fmtDelta(c.delta) + ")" : ""); });
    if (p.hours) { if (p.hours.at) parts.push("Heures atelier " + p.hours.at.from + " → " + p.hours.at.to); if (p.hours.au) parts.push("Heures autom " + p.hours.au.from + " → " + p.hours.au.to); }
    L.push("• " + p.pj + (p.nomProjet ? " — " + p.nomProjet : "") + " : " + parts.join(" ; "));
  });
  return L.join("\n");
}

export function ChangesTable({ summary, refs, refId, setRefId, refLabel, q, onOpenPj, removed }) {
  const [filter, setFilter] = useState("all"); const [copied, setCopied] = useState(false);
  const st = summary.stats; const needle = (q || "").trim().toLowerCase();
  const list = useMemo(() => summary.pjs.filter(p => {
    if (needle && !(p.pj.toLowerCase().includes(needle) || (p.nomProjet || "").toLowerCase().includes(needle))) return false;
    return filter === "all" ? true : filter === "late" ? p.group === 0 : filter === "early" ? p.group === 2 : filter === "hours" ? !!p.hours : filter === "new" ? p.isNew : true;
  }), [summary, filter, needle]);
  // Filtre « Ajoutés ou retirés » : les PJ retirés n'ont plus de ligne dans le planning, on les ajoute à la liste pour ce filtre
  const gone = useMemo(() => filter !== "new" ? [] : (removed || []).filter(r => !needle || r.pj.toLowerCase().includes(needle) || (r.nomProjet || "").toLowerCase().includes(needle)), [removed, filter, needle]);
  const copy = () => {
    const text = changesText({ refLabel, summary });
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    try { navigator.clipboard.writeText(text).then(done, () => fallback(text, done)); } catch (e) { fallback(text, done); }
  };
  const tiles = [
    ["all", "PJ modifiés", st.nPj, st.nDates + " date" + (st.nDates > 1 ? "s" : "") + " changée" + (st.nDates > 1 ? "s" : ""), T.ink900],
    ["late", "Départs en retard", st.late, st.late ? "jusqu'à +" + st.maxLate + " j" : "aucun", st.late ? T.red500 : T.emerald600],
    ["early", "Départs avancés", st.early, st.early ? "jusqu'à −" + st.maxEarly + " j" : "aucun", st.early ? T.emerald600 : T.ink500],
    ["hours", "Heures modifiées", st.nHours, "PJ concernés", T.ink900],
    ["new", "Ajoutés ou retirés", st.nNew + st.nRemoved, st.nNew + " ajouté" + (st.nNew > 1 ? "s" : "") + " · " + st.nRemoved + " retiré" + (st.nRemoved > 1 ? "s" : ""), T.ink900],
  ];
  const th = { padding: "8px 8px", fontSize: FZ.xs, fontWeight: 700, color: T.ink500, textAlign: "center", whiteSpace: "nowrap", borderBottom: "1px solid " + T.line, background: T.surface, position: "sticky", top: 0, zIndex: 1 };
  return (<div style={{ padding: "12px 16px 16px" }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
      <span style={{ fontSize: FZ.sm, color: T.ink500 }}>Version à afficher</span>
      <select value={refId} onChange={e => { setRefId(e.target.value); setFilter("all"); }} aria-label="Référence de comparaison" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontWeight: 700, fontFamily: T.font, maxWidth: 560 }}>
        {refs.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
            <span style={{ flex: 1 }} />
      <button style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink700, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap" }} onClick={copy} title="Copie la synthèse en texte, prête à coller dans un mail ou un compte rendu">{copied ? "Copié ✓" : "Copier la synthèse"}</button>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
      {tiles.map(([k, label, n, sub, col]) => (<button key={k} onClick={() => setFilter(filter === k && k !== "all" ? "all" : k)} aria-pressed={filter === k}
        style={{ textAlign: "left", cursor: "pointer", fontFamily: T.font, background: filter === k ? T.teal100 : T.card, border: "1px solid " + (filter === k ? T.teal500 : T.line), borderRadius: 12, padding: "8px 12px" }}>
        <div style={{fontFamily:T.fontMono,fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.accentInk}}>{label}</div>
        <div style={{ fontSize: FZ.xl, fontWeight: 700, color: n ? col : T.ink300, lineHeight: 1.15 }}>{n}</div>
        <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{sub}</div>
      </button>))}
    </div>

    {filter !== "all" && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: FZ.xs, color: T.ink500 }}>
      <span>Filtre : <b style={{ color: T.ink900 }}>{(tiles.find(t => t[0] === filter) || [])[1]}</b></span>
      <button onClick={() => setFilter("all")} style={{ border: "none", background: "transparent", color: T.teal600, fontWeight: 700, fontSize: FZ.xs, cursor: "pointer", fontFamily: T.font, padding: "2px 4px", minHeight: 24 }}>Tout afficher</button>
    </div>}

    {summary.pjs.length === 0 && !(removed && removed.length) ? <div style={{ background: T.emerald100, borderRadius: 12 }}><EmptyState compact tone="ok" icon="check" title="Aucune date ni heure n'a changé entre ces deux versions." /></div>
      : list.length === 0 && gone.length === 0 ? <EmptyState compact icon="search" title="Aucun PJ ne correspond à ce filtre." />
      : <div style={{ border: "1px solid " + T.line, borderRadius: 12, overflow: "auto", maxHeight: 520 }}>
        <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse", fontSize: FZ.sm }}>
          <thead><tr>
            <th style={{ ...th, textAlign: "left", paddingLeft: 12 }}>PJ</th>
            {FIELDS.map(([f, l]) => <th key={f} style={{ ...th, color: f === "depart" ? T.ink900 : T.ink500 }}>{l}</th>)}
            <th style={th}>Heures</th><th style={th} />
          </tr></thead>
          <tbody>
            {list.map(p => (<tr key={p.pj} onClick={() => onOpenPj(p.pj)} style={{ cursor: "pointer", borderTop: "1px solid " + T.line }}>
              <td style={{ padding: "8px 8px 8px 12px", minWidth: 190 }}>
                <div style={{ fontFamily: T.fontMono, fontWeight: 700, color: T.teal600 }}>{p.pj}{p.isNew && <span style={{ marginLeft: 6, fontFamily: T.font, fontSize: FZ.xs, background: T.amber100, color: T.amber600, borderRadius: 4, padding: "1px 6px" }}>ajouté</span>}</div>
                {p.nomProjet && <div style={{ fontSize: FZ.xs, color: T.ink500, maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nomProjet}</div>}
              </td>
              {FIELDS.map(([f]) => <td key={f} style={{ padding: "6px 4px", textAlign: "center", background: f === "depart" && p.d.depart ? "rgba(0,0,0,.025)" : "transparent" }}>{p.isNew ? (f === "depart" && p.row.depart ? <span style={{ fontSize: FZ.xs, color: T.ink500, fontFamily: T.fontMono }}>{fmtIso(p.row.depart)}</span> : null) : <DateCell c={p.d[f]} strong={f === "depart"} />}</td>)}
              <td style={{ padding: "6px 6px", textAlign: "center", fontSize: FZ.xs, color: T.ink700, whiteSpace: "nowrap" }}>
                {p.hours ? <>{p.hours.at && <div title="Heures atelier">At. {p.hours.at.from} → {p.hours.at.to} h</div>}{p.hours.au && <div title="Heures autom">Au. {p.hours.au.from} → {p.hours.au.to} h</div>}</> : <span style={{ color: T.ink300 }}>·</span>}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right", whiteSpace: "nowrap" }}><span style={{ fontSize: FZ.xs, fontWeight: 700, color: T.teal600 }}>Voir ›</span></td>
            </tr>))}
            {gone.map(r => (<tr key={"rm-" + r.pj} style={{ borderTop: "1px solid " + T.line }}>
              <td style={{ padding: "8px 8px 8px 12px", minWidth: 190 }}>
                <div style={{ fontFamily: T.fontMono, fontWeight: 700, color: T.ink500 }}><PjPlate pj={r.pj}/><span style={{ marginLeft: 6, fontFamily: T.font, fontSize: FZ.xs, background: T.red100, color: T.red500, borderRadius: 4, padding: "1px 6px" }}>retiré</span></div>
                {r.nomProjet && <div style={{ fontSize: FZ.xs, color: T.ink500, maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.nomProjet}</div>}
              </td>
              {FIELDS.map(([f]) => <td key={f} style={{ padding: "6px 4px", textAlign: "center" }}>{f === "depart" && r.depart ? <span title="Départ qui était prévu" style={{ fontSize: FZ.xs, color: T.ink500, fontFamily: T.fontMono, textDecoration: "line-through" }}>{fmtIso(r.depart)}</span> : null}</td>)}
              <td style={{ padding: "6px 6px", textAlign: "center" }}><span style={{ color: T.ink300 }}>·</span></td>
              <td style={{ padding: "6px 8px" }} />
            </tr>))}
          </tbody>
        </table>
      </div>}
    <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 6 }}>Écarts en jours calendaires : <span style={{ color: TONE.late.fg, fontWeight: 700 }}>rouge = plus tard</span>, <span style={{ color: TONE.early.fg, fontWeight: 700 }}>vert = plus tôt</span> (le trait va vers la droite quand c'est plus tard, vers la gauche quand c'est plus tôt) · cliquez une ligne pour l'ouvrir dans la liste.</div>
    {removed && removed.length > 0 && <div style={{ marginTop: 10, fontSize: FZ.xs, color: T.ink700, lineHeight: 1.7 }}><b style={{ color: T.red500 }}>Retirés de cette version :</b> {removed.map(r => <span key={r.pj} title={r.nomProjet || ""} style={{ fontFamily: T.fontMono, fontWeight: 700, background: T.red100, color: T.red500, borderRadius: 4, padding: "1px 8px", marginRight: 5, display: "inline-block" }}><PjPlate pj={r.pj}/></span>)}</div>}

  </div>);
}

function fallback(text, done) {
  try { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); done(); } catch (e) { /* copie indisponible */ }
}
