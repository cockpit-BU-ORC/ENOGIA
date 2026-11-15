// v281 (maquette « Refonte KPI » validée) — affichage du patron réponse → preuve → action sur les 7 sous-onglets KPI :
// encadré « réponse » (question, phrase, contexte, période, objectifs), chiffres en bullet (valeur, trait d'objectif, écart écrit,
// méthode au « i »), graphiques sobres (barres triées, colonnes avec la capacité, colonnes groupées, haltères, réel / attendu,
// bandeau de semaines), « Voir en tableau » sur chaque graphique, infobulle au survol, liste « À faire » (PJ cliquables).
// Couleurs : jetons du thème (dv1–dv3 validés par le script dataviz ; vert = tenu, rouge = non tenu, toujours avec un mot).
import React, { useEffect, useMemo, useState } from "react";
import { tableTh, tableTd } from "./SharedUI";
import { T, inkOn } from "../theme";
import { judge, targetDef } from "../kpiTargets";
import { PeriodPicker, TargetsDialog } from "./KpiHead";
import { storySynthese, storyBilan, storySemaines, storyDerives, storyCharge, storyAvancement, explore, EXPLORE_MEASURES, EXPLORE_DIMS, fr } from "../kpiStory";
import { CountryFlag, getPjMeta } from "../pjMeta";

const esc = s => String(s == null ? "" : s);
// Infobulle commune : tout élément portant data-tip
function Tip() {
  const [t, setT] = useState(null);
  useEffect(() => { const mv = e => { const el = e.target.closest && e.target.closest("[data-tip]"); setT(el ? { s: el.getAttribute("data-tip"), x: e.clientX, y: e.clientY } : null); }; window.addEventListener("pointermove", mv); return () => window.removeEventListener("pointermove", mv); }, []);
  if (!t) return null;
  return <div role="tooltip" style={{ position: "fixed", left: Math.min(t.x + 14, window.innerWidth - 280), top: t.y + 14, zIndex: 10030, pointerEvents: "none", background: T.ink900, color: T.card, fontSize: 12.5, borderRadius: 8, padding: "6px 9px", maxWidth: 270, boxShadow: T.shadowLg, fontFamily: T.font }}>{t.s}</div>;
}
const card = { background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "12px 14px", minWidth: 0 };
const unitOf = k => { const u = (targetDef(k) || {}).unit; return u === "%" ? " %" : u ? " " + u : ""; };

export function Answer({ q, a, ctx, sel, targets, onSaveTargets, plain }) {
  const [open, setOpen] = useState(false);
  return (<section aria-label="Réponse" style={{ ...card, borderLeft: "4px solid " + (plain ? T.ink300 : (T.navy700 || T.ink900)), padding: "14px 16px", marginBottom: 12 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 420px", minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: T.ink500, fontWeight: 600 }}>{q}</div>
        <div style={{ fontSize: plain ? 17 : 20, fontWeight: 600, letterSpacing: "-.015em", lineHeight: 1.3, marginTop: 2, color: T.ink900, maxWidth: 920 }}>{a}</div>
      </div>
      {onSaveTargets && <button type="button" onClick={() => setOpen(true)} style={{ minHeight: 30, padding: "0 12px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink700, fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: T.font }}>Objectifs</button>}
    </div>
    {ctx && ctx.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{ctx.map(c => <span key={c} style={{ fontSize: 12, color: T.ink500, border: "1px solid " + T.line, borderRadius: 999, padding: "1px 9px" }}>{c}</span>)}</div>}
    {sel && <div style={{ marginTop: 8 }}><PeriodPicker sel={sel} /></div>}
    {open && <TargetsDialog targets={targets} onSave={onSaveTargets} onClose={() => setOpen(false)} />}
  </section>);
}
// Chiffre face à son objectif : barre de la valeur, trait de l'objectif, écart écrit
export function Bullet({ k, label, v, how, targets, max }) {
  const d = targetDef(k), j = judge(k, v, targets), t = j.target, ok = j.ok, M = max || Math.max(v || 0, t || 0) * 1.25 || 1, x = n => Math.max(0, Math.min(100, (n || 0) / M * 100));
  const u = unitOf(k), pts = d.unit === "%" ? " pts" : u;
  return (<div style={card}>
    <div style={{ fontSize: 12.5, color: T.ink500, fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>{label || d.l}<span tabIndex={0} role="note" data-tip={"Méthode : " + (how || d.how)} aria-label={"Méthode : " + (how || d.how)} style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid " + T.line, display: "inline-grid", placeItems: "center", fontSize: 10.5, cursor: "help", flexShrink: 0 }}>i</span></div>
    <div style={{ fontSize: 30, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 2, color: ok === false ? T.red600 : T.ink900 }}>{v == null ? "—" : (k === "derive" && v > 0 ? "+" : "") + fr(v) + u}</div>
    <div role="img" aria-label={(label || d.l) + " : " + (v == null ? "pas de donnée" : v) + ", objectif " + t} style={{ position: "relative", height: 18, margin: "6px 0 2px" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 5, height: 8, borderRadius: 4, background: T.surfaceAlt }} />
      {v != null && <div style={{ position: "absolute", left: 0, width: x(v) + "%", top: 5, height: 8, borderRadius: 4, background: ok ? T.emerald500 : T.red500 }} />}
      <div style={{ position: "absolute", left: "calc(" + x(t) + "% - 1px)", top: 0, width: 2, height: 18, background: T.ink900 }} />
    </div>
    <div style={{ fontSize: 12.5, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>objectif {d.dir === "min" ? "≥" : "≤"} {fr(t)}{u}</div>
    <span style={{ display: "inline-flex", marginTop: 4, fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "0 8px", color: ok == null ? T.ink500 : ok ? T.emerald600 : T.red600, background: ok == null ? T.surface : ok ? T.emerald100 : T.red100 }}>{ok == null ? "pas de donnée" : ok ? "✓ tenu" : "✗ écart " + fr(Math.abs(j.gap)) + pts}</span>
  </div>);
}
// Chiffre sans objectif (contexte)
const Fact = ({ label, v, sub, bad }) => <div style={card}><div style={{ fontSize: 12.5, color: T.ink500, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 2, color: bad ? T.red600 : T.ink900 }}>{v}</div>{sub && <div style={{ fontSize: 12.5, color: T.ink500 }}>{sub}</div>}</div>;
const Grid = ({ min = 220, children, style }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%," + min + "px),1fr))", gap: 12, ...style }}>{children}</div>;
function Card({ title, sub, table, children }) {
  const [tab, setTab] = useState(false);
  return (<section aria-label={title} style={card}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: T.ink900 }}>{title}</h3><span style={{ flex: 1 }} />
      {table && <button type="button" onClick={() => setTab(v => !v)} style={{ border: "none", background: "transparent", color: T.ink500, fontWeight: 600, fontSize: 12, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2, fontFamily: T.font }}>{tab ? "Voir le graphique" : "Voir en tableau"}</button>}</div>
    {sub && <div style={{ fontSize: 12.5, color: T.ink500, margin: "1px 0 8px" }}>{sub}</div>}
    {tab && table ? <Table {...table} /> : children}
  </section>);
}
function Table({ head, rows, right }) {
  const th = { ...tableTh(), whiteSpace: "normal" }, td = { ...tableTd({ ink: T.ink900 }), height: "auto", whiteSpace: "normal" }; // v313 : tableau commun
  return <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{head.map((h, i) => <th key={i} style={{ ...th, textAlign: (right || []).includes(i) ? "right" : "left" }}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, k) => <tr key={k}>{r.map((c, i) => <td key={i} style={{ ...td, textAlign: (right || []).includes(i) ? "right" : "left" }}>{c}</td>)}</tr>)}</tbody></table></div>;
}
const pjCell = (pj, onOpenPj) => <button type="button" onClick={() => onOpenPj && onOpenPj(pj)} style={{ border: "none", background: "transparent", padding: 0, cursor: onOpenPj ? "pointer" : "default", fontFamily: T.fontMono, fontWeight: 600, fontSize: 12.5, color: T.ink900, textDecoration: onOpenPj ? "underline" : "none", textUnderlineOffset: 2 }}>{pj}</button>;
// Barres horizontales triées (une couleur)
function HBars({ rows, max, fmt, color, onOpenPj }) {
  const M = max || Math.max(1, ...rows.map(r => r.v));
  return <div role="img" aria-label={rows.map(r => r.k + " " + fmt(r.v)).join(", ")} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {rows.map(r => <div key={r.k} data-tip={r.tip || r.k + " : " + fmt(r.v)} style={{ display: "grid", gridTemplateColumns: "minmax(110px,190px) minmax(0,1fr) 64px", alignItems: "center", gap: 8 }}>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, display: "flex", gap: 6, alignItems: "center" }}>{/^PJ/.test(r.k) ? pjCell(r.k, onOpenPj) : <b style={{ color: T.ink900 }}>{r.k}</b>}{r.flag && <CountryFlag pays={r.flag} size={11} />}<span style={{ color: T.ink500 }}>{r.s || ""}</span></span>
      <span style={{ height: 16, position: "relative" }}><span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: Math.max(1, r.v / M * 100) + "%", background: color, borderRadius: "0 4px 4px 0" }} /></span>
      <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: T.ink900 }}>{fmt(r.v)}</span>
    </div>)}
  </div>;
}
// Colonnes de charge avec la ligne de capacité
function LoadCols({ weeks, H = 200 }) {
  const max = Math.max(1, ...weeks.map(w => Math.max(w.hours, w.cap))) * 1.15, y = v => v / max * H;
  const cap = weeks.length ? Math.round(weeks.reduce((a, w) => a + w.cap, 0) / weeks.length) : 0;
  return <div role="img" aria-label={weeks.map(w => w.lab + " " + w.hours + " h sur " + w.cap).join(", ")}>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: H, borderBottom: "1px solid " + T.line, position: "relative" }}>
      {weeks.map(w => { const over = w.cap && w.hours > w.cap; return <div key={w.lab} data-tip={w.lab + " : " + w.hours + " h pour " + w.cap + " h (" + (w.pct == null ? "—" : w.pct + " %") + ")"} style={{ flex: 1, minWidth: 0, height: "100%", position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{ position: "absolute", bottom: 0, width: "min(24px, 70%)", height: Math.max(1, y(w.hours)), background: over ? T.red500 : T.dvSeq4, borderRadius: 0 }} />
        <div style={{ position: "absolute", left: -4, right: -4, bottom: y(w.cap), borderTop: "2px solid " + T.ink900 }} />
        {over && <div style={{ position: "absolute", bottom: y(w.hours) + 4, fontSize: 11, fontWeight: 600, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{w.pct} %</div>}
      </div>; })}
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>{weeks.map(w => <span key={w.lab} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 11.5, color: T.ink500 }}>{w.lab}</span>)}</div>
    <div style={{ fontSize: 12, color: T.ink500, marginTop: 4 }}>trait noir = capacité (≈ {cap} h / semaine) · rouge = au-dessus</div>
  </div>;
}
// Colonnes groupées : départs, tests terminés, arrivées par mois (plein = fait, pointillé = prévu)
function MonthCols({ months, H = 180 }) {
  const ser = [["d", "Départs", T.dv1], ["t", "Tests terminés", T.dv2], ["a", "Arrivées", T.dv3]], max = Math.max(1, ...months.flatMap(m => [m.d, m.t, m.a])) * 1.25;
  return <div>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: T.ink700, marginBottom: 6 }}>{ser.map(s => <span key={s[0]} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: s[2] }} />{s[1]}</span>)}<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, border: "1.5px dashed " + T.ink500 }} />prévu (pas encore fait)</span></div>
    <div role="img" aria-label={months.map(m => m.m + " : " + m.d + " départs, " + m.t + " tests terminés, " + m.a + " arrivées").join(" ; ")} style={{ display: "flex", alignItems: "flex-end", height: H, gap: 18, borderBottom: "1px solid " + T.line }}>
      {months.map(m => <div key={m.key} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3 }}>
        {ser.map(s => { const v = m[s[0]], plan = m.kind === "prévu"; return <div key={s[0]} data-tip={m.m + " · " + s[1] + " : " + v + (plan ? " (prévu)" : m.kind === "en cours" ? " (prévu ou fait, mois en cours)" : " (fait)")} style={{ width: 20, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>{v}</span>
          <span style={{ width: 20, height: Math.max(1, v / max * (H - 18)), background: plan ? "transparent" : s[2], border: plan ? "1.5px dashed " + s[2] : "none", boxSizing: "border-box", borderRadius: 0 }} />
        </div>; })}
      </div>)}
    </div>
    <div style={{ display: "flex", gap: 18, marginTop: 4 }}>{months.map(m => <span key={m.key} style={{ flex: 1, textAlign: "center", fontSize: 12, color: T.ink500 }}>{m.m} · {m.kind}</span>)}</div>
  </div>;
}
// Haltères : date promise (0) → date actuelle
function Dumbbell({ rows, onOpenPj }) {
  const M = Math.max(30, ...rows.map(r => r.v)) * 1.1;
  return <div role="img" aria-label={rows.map(r => r.pj + " +" + r.v + " j").join(", ")} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {rows.map(r => <div key={r.pj} data-tip={r.pj + " : décalé de " + r.v + " jours depuis la date promise"} style={{ display: "grid", gridTemplateColumns: "90px minmax(0,1fr) 56px", alignItems: "center", gap: 8 }}>
      {pjCell(r.pj, onOpenPj)}
      <span style={{ position: "relative", height: 14 }}><span style={{ position: "absolute", left: 4, right: "calc(" + (100 - r.v / M * 100) + "% - 4px)", top: 6, height: 2, background: r.v > 30 ? T.red500 : T.amber500 }} />
        <span style={{ position: "absolute", left: 0, top: 3, width: 8, height: 8, borderRadius: "50%", background: T.card, border: "2px solid " + T.ink500, boxSizing: "border-box" }} />
        <span style={{ position: "absolute", left: "calc(" + (r.v / M * 100) + "% - 5px)", top: 2, width: 10, height: 10, borderRadius: "50%", background: r.v > 30 ? T.red500 : T.amber500, boxShadow: "0 0 0 2px " + T.card }} /></span>
      <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>+{r.v} j</span>
    </div>)}
    <div style={{ fontSize: 12, color: T.ink500, marginTop: 2 }}>rond vide = date promise · rond plein = date actuelle · rouge = plus de 30 j</div>
  </div>;
}
function Actions({ items, onOpenPj }) {
  return <section aria-label="À faire" style={{ ...card, marginTop: 12 }}>
    <h3 style={{ margin: "0 0 6px", fontSize: 14.5, fontWeight: 600, color: T.ink900 }}>À faire</h3>
    <ol style={{ margin: 0, paddingLeft: 20, color: T.ink700, fontSize: 13.5 }}>{items.map((a, i) => <li key={i} style={{ margin: "3px 0" }}><b style={{ color: T.ink900, fontWeight: 600 }}>{a.b}</b>{a.t ? " " + a.t : ""}{a.pjs && a.pjs.length > 0 && <span style={{ display: "inline-flex", gap: 8, marginLeft: 6, flexWrap: "wrap" }}>{a.pjs.map(p => <span key={p}>{pjCell(p, onOpenPj)}</span>)}</span>}</li>)}</ol>
  </section>;
}

// ── Les 7 récits ──
export function KpiStory({ tab, rows, driftRows, targets, metrics, saveTargets, sel, weeks6, weeks8, weeks12, notes, stepSummary, comparable, kpiStep, stepLabels, progress, onOpenPj, periodLabel, scopeLabel }) {
  const today = useMemo(() => new Date(), []);
  const [ex, setEx] = useState({ measure: "count", dim: "gamme", scope: "open" });
  const P = { targets, onSaveTargets: saveTargets };
  let body = null;
  if (tab === "synthese") {
    const s = storySynthese({ rows, driftRows, targets, metrics, weeks: weeks6, today });
    const w6 = weeks6.map(w => ({ lab: w.lab, hours: Math.round(w.hours), cap: Math.round(w.cap), pct: w.cap ? Math.round(w.hours / w.cap * 100) : null }));
    body = <>
      <Answer q="Livre-t-on à l'heure, et l'atelier tient-il ?" a={s.answer} ctx={["planning publié", "filtres du Manager", periodLabel ? "période : " + periodLabel : "période : tout"]} sel={sel} {...P} />
      <Grid><Bullet k="tenus" v={metrics.tenus} targets={targets} max={100} label={periodLabel ? "Tenus à date · départs promis " + periodLabel : null} /><Bullet k="derive" v={metrics.derive} targets={targets} /><Bullet k="charge" v={metrics.charge} targets={targets} max={160} /><Bullet k="livraisons" v={metrics.livraisons} targets={targets} label={(metrics.months && metrics.months.length > 1 ? "Expédiées par mois · " : "Expédiées · ") + (periodLabel || "mois écoulé")} /></Grid>
      <Grid min={460} style={{ marginTop: 12 }}>
        <Card title={"Les " + s.risk.length + " PJ qui pèsent le plus"} sub="retard du départ sur le planning initial, en jours — triés" table={{ head: ["PJ", "Client", "État", "Retard"], rows: s.risk.map(r => [r.pj, r.nom, r.etat, "+" + r.v + " j"]), right: [3] }}>
          {s.risk.length ? <HBars rows={s.risk.map(r => ({ k: r.pj, s: r.nom, flag: getPjMeta(r.pj, rows.find(x => x.pj === r.pj)).pays, v: r.v, tip: r.pj + " · " + r.nom + " — " + r.etat + " — départ +" + r.v + " j" }))} fmt={v => "+" + v + " j"} color={T.red500} onOpenPj={onOpenPj} /> : <div style={{ fontSize: 13, color: T.ink500 }}>Aucun PJ ouvert en retard sur son départ initial</div>}
        </Card>
        <Card title={"Charge des " + w6.length + " prochaines semaines"} sub="heures planifiées par semaine" table={{ head: ["Semaine", "Heures", "Capacité", "Taux"], rows: w6.map(w => [w.lab, w.hours + " h", w.cap + " h", (w.pct == null ? "—" : w.pct + " %")]), right: [1, 2, 3] }}><LoadCols weeks={w6} /></Card>
      </Grid>
      <Actions items={s.actions} onOpenPj={onOpenPj} />
    </>;
  } else if (tab === "bilan") {
    const b = storyBilan({ rows, notes, today });
    body = <>
      <Answer q="Qu'a-t-on tenu, et que faut-il tenir maintenant ?" a={b.answer} ctx={["deux mois passés : réalisé", "mois en cours", "mois suivant : prévu"]} sel={sel} {...P} />
      <Grid><Bullet k="realisation" v={metrics.realisation} targets={targets} max={100} label={"Jalons tenus · " + (periodLabel || "mois écoulé")} /><Bullet k="livraisons" v={metrics.livraisons} targets={targets} label={(metrics.months && metrics.months.length > 1 ? "Expédiées par mois · " : "Expédiées · ") + (periodLabel || "mois écoulé")} /></Grid>
      <Grid min={460} style={{ marginTop: 12 }}>
        <Card title="Départs, tests terminés et arrivées par mois" sub="un groupe par mois · plein = fait · pointillé = prévu" table={{ head: ["Mois", "Départs", "Tests terminés", "Arrivées", "En retard"], rows: b.months.map(m => [m.m + " (" + m.kind + ")", m.d, m.t, m.a, m.late]), right: [1, 2, 3, 4] }}><MonthCols months={b.months} /></Card>
        <section aria-label="Le mois en une ligne" style={card}><h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>Le mois en une ligne</h3><div style={{ fontSize: 12.5, color: T.ink500, margin: "1px 0 8px" }}>notes saisies plus bas, mois par mois</div>
          {b.months.map(m => <div key={m.key} style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 8, padding: "6px 0", borderTop: "1px solid " + T.line, fontSize: 13 }}><b>{m.m}</b><span style={{ color: (notes[m.key] || {}).text ? T.ink700 : T.ink500, fontStyle: (notes[m.key] || {}).text ? "normal" : "italic" }}>{(notes[m.key] || {}).text || "pas encore écrite"}</span></div>)}</section>
      </Grid>
      <Actions items={b.actions} onOpenPj={onOpenPj} />
    </>;
  } else if (tab === "semaines") {
    const s = storySemaines({ rows, weeks: weeks8 });
    const cell = { padding: "7px 8px", borderBottom: "1px solid " + T.line, minHeight: 36, display: "flex", alignItems: "center", fontSize: 12.5, minWidth: 0 };
    const pjs = l => l.length ? <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{l.map(p => <span key={p}>{pjCell(p, onOpenPj)}</span>)}</span> : <span style={{ color: T.ink500 }}>—</span>;
    body = <>
      <Answer q="Que faut-il décider dans les 8 prochaines semaines ?" a={s.answer} ctx={["8 semaines à partir d'aujourd'hui", "charge du planificateur (sinon du planning)"]} {...P} />
      <section aria-label="Les 8 prochaines semaines" style={{ ...card, overflowX: "auto" }}>
        <div role="table" style={{ display: "grid", gridTemplateColumns: "120px repeat(" + s.cols.length + ", minmax(92px,1fr))", minWidth: 120 + s.cols.length * 92 }}>
          <div style={{ ...cell, color: T.ink500 }} />{s.cols.map((c, i) => <div key={c.lab} role="columnheader" style={{ ...cell, color: T.ink500, fontSize: 12, boxShadow: i === 0 ? "inset 0 2px 0 " + (T.navy700 || T.ink900) : "none" }}>{c.lab}{i === 0 ? " · cette sem." : ""}</div>)}
          <div style={{ ...cell, fontWeight: 600, color: T.ink700 }}>Charge</div>{s.cols.map(c => { const p = (c.pct || 0) / 100, bg = p > 1 ? T.red500 : p > .85 ? T.dvSeq5 : p > .65 ? T.dvSeq4 : p > .45 ? T.dvSeq3 : T.dvSeq2; return <div key={c.lab} data-tip={c.lab + " : " + c.hours + " h / " + Math.round(c.cap) + " h"} style={{ ...cell, justifyContent: "center", background: bg, color: inkOn(bg), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.pct == null ? "—" : c.pct + " %"}</div>; })}
          <div style={{ ...cell, fontWeight: 600, color: T.ink700 }}>Départs</div>{s.cols.map(c => <div key={c.lab} style={cell}>{pjs(c.dep)}</div>)}
          <div style={{ ...cell, fontWeight: 600, color: T.ink700 }}>Au banc</div>{s.cols.map(c => <div key={c.lab} style={{ ...cell, color: c.banc.length > 2 ? T.red600 : T.ink900 }}>{pjs(c.banc)}</div>)}
          <div style={{ ...cell, fontWeight: 600, color: T.ink700 }}>À décider</div>{s.cols.map(c => <div key={c.lab} style={{ ...cell, color: T.red600, fontWeight: 600, fontSize: 12 }}>{c.decide.join(" · ") || ""}</div>)}
        </div>
        <div style={{ fontSize: 12, color: T.ink500, marginTop: 6 }}>charge en dégradé d'une teinte (plus foncé = plus chargé, rouge = au-dessus de la capacité) · « au banc » = période de tests du planning · plus de 2 machines au banc = conflit</div>
      </section>
      <Actions items={s.actions.length ? s.actions : [{ b: "Rien à décider", t: "sur ces semaines." }]} onOpenPj={onOpenPj} />
    </>;
  } else if (tab === "derives") {
    const d = storyDerives({ stepSummary, comparable, kpiStep, labels: stepLabels });
    const late = (stepSummary || []).filter(x => x.late);
    body = <>
      <Answer q="Tient-on les dates promises au client ?" a={d.answer} ctx={["dates promises : planning initial", scopeLabel || "toutes les machines", periodLabel || "période : tout"]} {...P} />
      <Grid>{(stepSummary || []).map(x => <Bullet key={x.k} k="tenus" v={x.pct} targets={targets} max={100} label={"Tenus à date · " + x.l.toLowerCase()} how={x.ok + " PJ sur " + x.n + " ont leur « " + x.l.toLowerCase() + " » actuel au plus tard à la date promise."} />)}</Grid>
      <Grid min={460} style={{ marginTop: 12 }}>
        <Card title="Retard moyen par étape" sub="jours de retard moyen des PJ en retard" table={{ head: ["Étape", "Tenus", "Comparés", "En retard", "Retard moyen"], rows: (stepSummary || []).map(x => [x.l, x.ok, x.n, x.late, x.late ? "+" + x.avg + " j" : "—"]), right: [1, 2, 3, 4] }}>
          {late.length ? <HBars rows={late.map(x => ({ k: x.l, v: x.avg, tip: x.l + " : +" + x.avg + " j en moyenne sur " + x.late + " PJ en retard" }))} fmt={v => "+" + v + " j"} color={T.dv1} /> : <div style={{ fontSize: 13, color: T.ink500 }}>Aucun retard sur la période</div>}
        </Card>
        <Card title={"« " + d.stepLabel + " » : de la date promise à la date actuelle"} sub="les 8 PJ les plus en retard (étape analysée dans la vue CODIR)" table={{ head: ["PJ", "Retard"], rows: d.dumb.map(r => [r.pj, "+" + r.v + " j"]), right: [1] }}>
          {d.dumb.length ? <Dumbbell rows={d.dumb} onOpenPj={onOpenPj} /> : <div style={{ fontSize: 13, color: T.ink500 }}>Aucun PJ en retard pour cette étape</div>}
        </Card>
      </Grid>
      <Actions items={d.actions} onOpenPj={onOpenPj} />
    </>;
  } else if (tab === "charge") {
    const c = storyCharge({ weeks: weeks12 });
    body = <>
      <Answer q="L'atelier peut-il absorber ce qui arrive ?" a={c.answer} ctx={[weeks12.length + " semaines", "heures planifiées ÷ capacité (jours fermés déduits)"]} {...P} />
      <Grid><Bullet k="charge" v={metrics.charge} targets={targets} max={160} label="Charge des 4 prochaines semaines" /><Fact label="Semaine la plus chargée" v={c.peak ? c.peak.lab + " · " + c.peak.pct + " %" : "—"} sub={c.peak ? c.peak.hours + " h pour " + c.peak.cap + " h" : ""} bad={c.peak && c.peak.pct > 100} /><Fact label="Marge disponible" v={"+" + c.marge + " h"} sub={c.low.length ? "semaines sous 70 % (jusqu'à 85 %) : " + c.low.map(x => x.lab).join(", ") : "aucune semaine sous 70 %"} /></Grid>
      <div style={{ marginTop: 12 }}><Card title={"Charge par semaine (" + c.weeks.length + " semaines)"} sub="heures planifiées · rouge = au-dessus de la capacité (taux écrit)" table={{ head: ["Semaine", "Heures", "Capacité", "Taux"], rows: c.weeks.map(w => [w.lab, w.hours + " h", w.cap + " h", w.pct == null ? "—" : w.pct + " %"]), right: [1, 2, 3] }}><LoadCols weeks={c.weeks} H={220} /></Card></div>
      <Actions items={c.actions} onOpenPj={onOpenPj} />
    </>;
  } else if (tab === "avancement") {
    const a = storyAvancement({ rows, progress, today });
    const items = a.items.slice(0, 14);
    body = <>
      <Answer q="Les machines avancent-elles comme prévu ?" a={a.answer} ctx={["PJ ouverts", "attendu = temps écoulé entre l'arrivée et le départ du planning"]} sel={sel} {...P} />
      <Grid><Bullet k="tenus" v={metrics.tenus} targets={targets} max={100} label={periodLabel ? "Tenus à date · départs promis " + periodLabel : null} /><Fact label="PJ nettement en retard d'avancement" v={a.items.filter(x => x.gap < -15).length} sub="plus de 15 points sous l'attendu" bad={a.items.some(x => x.gap < -15)} /></Grid>
      <div style={{ marginTop: 12 }}><Card title="Avancement réel et attendu" sub="barre = avancement saisi · trait = attendu à date · trié par écart (les plus en retard en haut)" table={{ head: ["PJ", "Client", "Réel", "Attendu", "Écart"], rows: a.items.map(x => [x.pj, x.nom, x.real + " %", x.exp + " %", (x.gap >= 0 ? "+" : "") + x.gap]), right: [2, 3, 4] }}>
        <div role="img" aria-label={items.map(x => x.pj + " " + x.real + " % pour " + x.exp + " % attendus").join(", ")} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(x => <div key={x.pj} data-tip={x.pj + " · " + x.nom + " : " + x.real + " % réel, " + x.exp + " % attendu (" + (x.gap >= 0 ? "+" : "") + x.gap + " pts)"} style={{ display: "grid", gridTemplateColumns: "minmax(110px,190px) minmax(0,1fr) 92px", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 12.5 }}>{pjCell(x.pj, onOpenPj)}<span style={{ color: T.ink500 }}>{x.nom}</span></span>
            <span style={{ position: "relative", height: 18 }}><span style={{ position: "absolute", left: 0, right: 0, top: 4, height: 10, borderRadius: 4, background: T.surfaceAlt }} /><span style={{ position: "absolute", left: 0, width: Math.max(1, x.real) + "%", top: 4, height: 10, borderRadius: 4, background: x.gap < -15 ? T.red500 : T.dvSeq4 }} /><span style={{ position: "absolute", left: "calc(" + x.exp + "% - 1px)", top: 0, width: 2, height: 18, background: T.ink900 }} /></span>
            <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{x.real} % <span style={{ color: x.gap < -15 ? T.red600 : T.ink500, fontWeight: 500 }}>({x.gap >= 0 ? "+" : ""}{x.gap})</span></span>
          </div>)}
          {!items.length && <div style={{ fontSize: 13, color: T.ink500 }}>Aucun PJ ouvert avec des dates d'arrivée et de départ</div>}
        </div></Card></div>
      <Actions items={a.actions} onOpenPj={onOpenPj} />
    </>;
  } else if (tab === "explorer") {
    const data = explore({ rows, ...ex }), ml = (EXPLORE_MEASURES.find(m => m[0] === ex.measure) || [])[1], dl = (EXPLORE_DIMS.find(m => m[0] === ex.dim) || [])[1];
    const sl = { minHeight: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: 13, fontFamily: T.font, padding: "0 8px" };
    body = <>
      <Answer plain q="Explorer" a="Pas de réponse imposée ici : choisissez une mesure, un découpage et les machines." />
      <div role="group" aria-label="Choix de l'exploration" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: T.ink500, display: "inline-flex", gap: 6, alignItems: "center" }}>Mesure<select value={ex.measure} onChange={e => setEx({ ...ex, measure: e.target.value })} style={sl}>{EXPLORE_MEASURES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label style={{ fontSize: 13, color: T.ink500, display: "inline-flex", gap: 6, alignItems: "center" }}>par<select value={ex.dim} onChange={e => setEx({ ...ex, dim: e.target.value })} style={sl}>{EXPLORE_DIMS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label style={{ fontSize: 13, color: T.ink500, display: "inline-flex", gap: 6, alignItems: "center" }}>Machines<select value={ex.scope} onChange={e => setEx({ ...ex, scope: e.target.value })} style={sl}><option value="open">en cours</option><option value="shipped">expédiées</option><option value="all">toutes</option></select></label>
      </div>
      <Card title={ml + " par " + dl} sub={ex.dim === "mois" ? "dans l'ordre des mois" : "barres triées (plus lisibles qu'un camembert pour comparer des tailles)"} table={{ head: [dl.charAt(0).toUpperCase() + dl.slice(1), ml], rows: data.map(d => [d.k, d.v]), right: [1] }}>
        {data.length ? <HBars rows={data.map(d => ({ k: d.k, flag: ex.dim === "pays" ? d.raw : null, v: d.v }))} fmt={v => String(v)} color={T.dv1} /> : <div style={{ fontSize: 13, color: T.ink500 }}>Aucune donnée pour ce choix</div>}
      </Card>
    </>;
  }
  return <div style={{ marginBottom: 16 }}><Tip />{body}</div>;
}
export { esc };
