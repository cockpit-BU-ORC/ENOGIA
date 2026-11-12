// v310 (maquette v310-calendrier, « vue Mois » validée : « tant qu'il y a de la production, laisser le jalon production tous les jours ») :
// le mois sur une page, lundi → vendredi. Par jour : les jalons (arrivée, début des tests, fin de production, départ, visites client / NOBO)
// en plaques pleines, puis les jours de tests et de production en plaques discrètes (liseré de la couleur de l'étape) ; 4 lignes au plus,
// « + N autres » déplie le jour. Un événement du week-end est rangé le vendredi (« sam. » / « dim. »). Clic sur une plaque = fiche du PJ.
import React, { useMemo, useState } from "react";
import { T, FZF, stagePalette } from "../theme";
import { presenceDates, PRESENCE_META } from "../pjMeta";
import { toLocalISO } from "../parsers";
import { isClosedDay } from "../workDays";
import { isoWeek } from "../loadWeeks";
import { getDayStatus } from "./CalendarView";

const MAX_LINES = 4;
const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const RANK = { "Départ": 0, "Arrivée": 1, "Fin prod": 2, visit: 3, "Début tests": 4, "Tests": 5, "Production": 6 };
const LABEL = { "Départ": "Départ", "Arrivée": "Arrivée", "Fin prod": "Fin de prod", "Début tests": "Début tests", "Tests": "Au banc", "Production": "Production" };
const isoOf = v => { if (!v) return ""; const d = new Date(v); return isNaN(d) ? "" : toLocalISO(d); };

// Événements d'un jour pour toutes les machines (une entrée par PJ et par étape).
function dayEvents(rows, day, productionExclusions, closed) {
  const k = toLocalISO(day), out = [];
  rows.forEach(r => {
    const st = getDayStatus(r, day, productionExclusions && productionExclusions[r.pj]);
    if (st) st.split(" + ").forEach(s => {
      if (s === "Production" && closed) return;
      const kind = s === "Tests" && isoOf(r.tests) === k ? "Début tests" : s;
      out.push({ pj: r.pj, kind, stage: s === "Tests" ? "Tests" : s, quiet: kind === "Production" || kind === "Tests" });
    });
    const pd = presenceDates(r.clientPresence);
    ["client", "nobo"].forEach(w => { if (pd[w] && isoOf(pd[w]) === k) out.push({ pj: r.pj, kind: "visit", who: w, quiet: false }); });
  });
  return out.sort((a, b) => RANK[a.kind] - RANK[b.kind] || String(a.pj).localeCompare(String(b.pj), "fr", { numeric: true }));
}

function Plate({ ev, onOpen, note }) {
  const P = stagePalette();
  const vis = ev.kind === "visit" ? PRESENCE_META[ev.who] : null;
  const s = vis ? null : P[ev.stage] || P["Production"];
  const label = vis ? "Visite " + vis.label : LABEL[ev.kind] || ev.kind;
  const style = ev.quiet
    ? { background: T.surfaceAlt, color: T.ink700, boxShadow: "inset 3px 0 0 " + s.c }
    : vis ? { background: vis.bg, color: vis.ink, boxShadow: "inset 3px 0 0 " + vis.color } : { background: s.c, color: s.t };
  return <button type="button" onClick={() => onOpen(ev.pj)} title={ev.pj + " · " + label + (note ? " (" + note + ")" : "") + " — ouvrir la fiche"}
    style={{ display: "flex", alignItems: "baseline", gap: 6, width: "100%", minWidth: 0, minHeight: 22, padding: "2px 6px 2px 7px", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: T.font, textAlign: "left", ...style }}>
    <b style={{ fontFamily: T.fontDisplay, fontSize: FZF.xs, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{ev.pj}</b>
    <span style={{ fontSize: FZF.xs, opacity: ev.quiet ? 0.9 : 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}{note ? " · " + note : ""}</span>
  </button>;
}

export function CalendarMonth({ data, month, closurePeriods, productionExclusions, onSelectPj }) {
  const [open, setOpen] = useState(() => new Set());
  const rows = useMemo(() => { const m = new Map(); (data || []).forEach(r => { if (r && r.pj && !m.has(r.pj)) m.set(r.pj, r); }); return [...m.values()]; }, [data]);
  const weeks = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1), last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const mon = new Date(first); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const out = [];
    for (let w = new Date(mon); w <= last; w.setDate(w.getDate() + 7)) out.push(new Date(w));
    return out;
  }, [month]);
  const todayK = toLocalISO(new Date());
  const onOpen = pj => onSelectPj && onSelectPj(pj);
  const cells = useMemo(() => weeks.flatMap(w => [0, 1, 2, 3, 4].map(i => {
    const d = new Date(w); d.setDate(d.getDate() + i);
    const k = toLocalISO(d), closed = isClosedDay(closurePeriods, k);
    let evs = dayEvents(rows, d, productionExclusions, closed).map(ev => ({ ev }));
    if (i === 4) [5, 6].forEach(j => { // week-end → vendredi
      const we = new Date(w); we.setDate(we.getDate() + j);
      dayEvents(rows, we, productionExclusions, true).filter(e => !e.quiet).forEach(ev => evs.unshift({ ev, note: (j === 5 ? "sam. " : "dim. ") + we.getDate() }));
    });
    const cp = closed && (closurePeriods || []).find(p => p && p.start && toLocalISO(new Date(p.start)) <= k && k <= toLocalISO(new Date(p.end || p.start)));
    return { d, k, i, evs, closed, closedLabel: cp && cp.label, out: d.getMonth() !== month.getMonth() };
  })), [weeks, rows, closurePeriods, productionExclusions, month]);
  const toggle = k => setOpen(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const legend = [["Arrivée", "Arrivée"], ["Production", "Production"], ["Tests", "Tests"], ["Fin prod", "Fin de prod"], ["Départ", "Départ"]];
  const P = stagePalette();

  return <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
    <div role="grid" aria-label={"Mois de " + month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
      style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 1, background: T.line, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
      {DAY_NAMES.map(n => <div key={n} role="columnheader" style={{ background: T.card, padding: "8px 10px", fontSize: FZF.xs, fontWeight: 700, color: T.ink500 }}>{n}</div>)}
      {cells.map(c => {
        const isToday = c.k === todayK, all = open.has(c.k), shown = all ? c.evs : c.evs.slice(0, MAX_LINES), more = c.evs.length - shown.length;
        return <div key={c.k} role="gridcell" aria-label={c.d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + (c.evs.length ? ", " + c.evs.length + " événement" + (c.evs.length > 1 ? "s" : "") : "")}
          style={{ background: c.closed ? T.surfaceAlt : c.out ? T.surface : isToday ? T.red500 + "12" : T.card, boxShadow: isToday ? "inset 0 3px 0 " + T.red500 : "none", minHeight: 128, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3, minWidth: 0, opacity: c.out ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: FZF.md, color: isToday ? T.red600 : c.out ? T.ink500 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{c.d.getDate()}{c.d.getDate() === 1 || (c.out && c.i === 0) ? " " + c.d.toLocaleDateString("fr-FR", { month: "short" }) : ""}</span>
            {c.i === 0 && <span style={{ fontSize: FZF.xs, color: T.ink500 }}>S{isoWeek(c.d)}</span>}
          </div>
          {c.closed && <span style={{ fontSize: FZF.xs, color: T.ink500 }}>{c.closedLabel || "Atelier fermé"}</span>}
          {shown.map((x, j) => <Plate key={x.ev.pj + x.ev.kind + (x.ev.who || "") + j} ev={x.ev} note={x.note} onOpen={onOpen} />)}
          {(more > 0 || (all && c.evs.length > MAX_LINES)) && <button type="button" onClick={() => toggle(c.k)} aria-expanded={all}
            style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: T.accentInk || T.ink700, fontFamily: T.font, fontSize: FZF.xs, fontWeight: 700, padding: "2px 0", cursor: "pointer" }}>{all ? "Réduire" : "+ " + more + " autre" + (more > 1 ? "s" : "")}</button>}
        </div>;
      })}
    </div>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: FZF.xs, color: T.ink700, alignItems: "center" }}>
      {legend.map(([k, l]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: k === "Production" || k === "Tests" ? T.surfaceAlt : P[k].c, boxShadow: k === "Production" || k === "Tests" ? "inset 3px 0 0 " + P[k].c : "none", border: "1px solid " + T.line }} />{l}</span>)}
      {["client", "nobo"].map(w => <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: PRESENCE_META[w].bg, boxShadow: "inset 3px 0 0 " + PRESENCE_META[w].color }} />Visite {PRESENCE_META[w].label}</span>)}
      <span style={{ color: T.ink500 }}>Plaques pleines = jalons ; plaques claires = chaque jour de production ou de tests. Week-end rangé le vendredi.</span>
    </div>
  </div>;
}
