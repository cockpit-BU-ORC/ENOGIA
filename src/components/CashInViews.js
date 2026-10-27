// ── v194 : Cash in intégré, étape 2 — vues Projets, Cash par mois et Écarts (reprises de public/cashin.html) ────────────
// Un clic sur un PJ, un mois, une case ou un groupe déplie la liste des jalons concernés ; un clic sur un jalon l'ouvre dans l'onglet Jalons.
import React, { useMemo, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { fmtEur } from "../pjProgress";
import { pjList, groupInfo, groupStats, monthly, monthKeys, punctual, matrixItems, monthRange, ECARTS, ecartOf, ecartGroups, ecartKpis } from "../cashinModel";

const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(2, 4) : "—");
const monthLabel = k => (k === "none" ? "Sans date" : new Date(k + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
const monthShort = k => (k === "none" ? "Sans date" : new Date(k + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }));
const fmtK = n => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + " M€" : n >= 1e4 ? Math.round(n / 1e3) + " k€" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".", ",") + " k€" : Math.round(n) + " €");
const signed = (n, dec) => { const v = dec ? Math.round(n * 10) / 10 : Math.round(n); return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toLocaleString("fr-FR") + " j"; };
const card = () => ({ background: T.card, border: "1px solid " + T.line, borderRadius: 10, minWidth: 0 });
const th = () => ({ padding: "8px 10px", fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, color: T.ink500, borderBottom: "1px solid " + T.line, textAlign: "left", whiteSpace: "nowrap", background: T.surface });
const td = () => ({ padding: "7px 10px", borderTop: "1px solid " + T.line, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" });
const H = ({ title, sub }) => <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", margin: "0 0 8px" }}><h3 style={{ margin: 0, fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>{title}</h3>{sub && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{sub}</span>}</div>;
const Legend = ({ items }) => <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: FZ.xs, color: T.ink500, marginBottom: 8 }}>{items.map(([c, l]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}</span>)}</div>;

// Liste des jalons concernés (sous une ligne cliquée).
function Detail({ title, list, onOpenRow, extra }) {
  const tot = list.reduce((s, r) => s + (Number(r.montant) || 0), 0);
  return (<div className="enogia-view-in" style={{ ...card(), padding: "8px 12px", margin: "4px 0 10px", background: T.surface }}>
    <div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink700, marginBottom: 4 }}>{title} · {list.length} jalon{list.length > 1 ? "s" : ""} · {fmtEur(tot)}</div>
    {list.map(r => <button key={r.id} type="button" onClick={() => onOpenRow(r.id)} style={{ display: "flex", gap: 10, width: "100%", border: "none", borderTop: "1px solid " + T.line, background: "transparent", padding: "5px 0", minHeight: 28, cursor: "pointer", fontFamily: T.font, fontSize: FZ.xs, color: T.ink700, textAlign: "left", alignItems: "center" }}>
      <b style={{ fontFamily: T.fontMono, color: T.ink900, minWidth: 64 }}>{r.pj}</b><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.jalon || "Jalon sans nom"}</span>
      {extra && <span style={{ fontWeight: 700 }}>{extra(r)}</span>}<span style={{ fontVariantNumeric: "tabular-nums", minWidth: 80, textAlign: "right" }}>{fmtEur(r.montant)}</span></button>)}
  </div>);
}

// ── Projets ──
export function ProjetsView({ doc, today, onOpenPj }) {
  const rows = (doc && doc.rows) || [], labels = (doc && doc.labels) || {};
  const list = pjList(doc).map(pj => { const g = groupStats(rows.filter(r => r.pj === pj), today), tot = groupInfo(doc, pj).total, tm = Math.max(0, tot - g.epc); return { pj, g, tot, pp: tm ? Math.round(g.paid / tm * 100) : 0, fp: tm ? Math.round(g.inv / tm * 100) : 0 }; });
  const S = list.reduce((a, x) => ({ total: a.total + x.tot, paid: a.paid + x.g.paid, inv: a.inv + x.g.inv, toBill: a.toBill + x.g.toBill }), { total: 0, paid: 0, inv: 0, toBill: 0 });
  if (!rows.length) return <div style={{ ...card(), padding: 16, color: T.ink500 }}>Pas encore de données.</div>;
  return (<div style={{ ...card(), overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: FZ.sm, minWidth: 820 }}>
      <thead><tr>{["PJ", "Jalons", "Montant du projet", "Encaissé", "Facturé, en attente", "Reste à facturer", "Prochain encaissement", "Avancement"].map((h, i) => <th key={h} style={{ ...th(), textAlign: i >= 2 && i <= 5 ? "right" : "left" }}>{h}</th>)}</tr></thead>
      <tbody>
        {list.map(({ pj, g, tot, pp, fp }) => <tr key={pj} onClick={() => onOpenPj(pj)} style={{ cursor: "pointer" }} title={"Voir les jalons de " + pj}>
          <td style={td()}><b style={{ fontFamily: T.fontMono, color: T.ink900 }}>{pj}</b>{labels[pj] && <span style={{ color: T.ink500, marginLeft: 8 }}>{labels[pj]}</span>}</td>
          <td style={td()}>{g.paidN} / {g.n} payés</td>
          <td style={{ ...td(), textAlign: "right" }}>{fmtEur(tot)}{g.epc ? <div style={{ fontSize: 11, color: T.ink500 }}>dont EPC {fmtEur(g.epc)}</div> : null}</td>
          <td style={{ ...td(), textAlign: "right", color: T.emerald600, fontWeight: 600 }}>{fmtEur(g.paid)}</td>
          <td style={{ ...td(), textAlign: "right" }}>{fmtEur(g.inv)}</td>
          <td style={{ ...td(), textAlign: "right", color: g.toBill ? T.amber600 : T.ink500 }}>{fmtEur(g.toBill)}</td>
          <td style={td()}>{g.next ? fd(g.next) + (g.nextRow ? " · " + fmtEur(g.nextRow.montant) : "") : "—"}</td>
          <td style={{ ...td(), minWidth: 160 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div aria-hidden="true" style={{ flex: 1, height: 8, borderRadius: 4, background: T.surfaceAlt, overflow: "hidden", display: "flex" }}><i className="enogia-bar-fill" style={{ width: pp + "%", background: T.emerald500 }} /><i style={{ width: fp + "%", background: T.teal500 }} /></div><span style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink700 }}>{pp} %</span></div></td>
        </tr>)}
        <tr style={{ background: T.surface }}><td style={td()}><b>Total</b></td><td style={td()} /><td style={{ ...td(), textAlign: "right" }}><b>{fmtEur(S.total)}</b></td><td style={{ ...td(), textAlign: "right" }}><b>{fmtEur(S.paid)}</b></td><td style={{ ...td(), textAlign: "right" }}><b>{fmtEur(S.inv)}</b></td><td style={{ ...td(), textAlign: "right" }}><b>{fmtEur(S.toBill)}</b></td><td style={td()} /><td style={td()} /></tr>
      </tbody>
    </table>
    <div style={{ padding: "8px 12px", fontSize: FZ.xs, color: T.ink500 }}>Barre : vert = encaissé, bleu = facturé en attente, en part du montant du projet hors EPC. Cliquez sur un PJ pour voir ses jalons.</div>
  </div>);
}

// ── Cash par mois ──
export function MoisView({ doc, today, onOpenRow }) {
  const rows = useMemo(() => (doc && doc.rows) || [], [doc]);
  const [open, setOpen] = useState(null), [pastOpen, setPastOpen] = useState({}), [mx, setMx] = useState(null);
  const m = useMemo(() => monthly(rows, today), [rows, today]);
  if (!rows.length) return <div style={{ ...card(), padding: 16, color: T.ink500 }}>Pas encore de données.</div>;
  const cur = today.slice(0, 7);
  let max = 1; m.months.forEach(x => { max = Math.max(max, x.init, x.paid + x.fc); }); max = Math.max(max, m.nodate.init, m.nodate.fc);
  const pct = v => (v / max * 100).toFixed(2) + "%";
  const pu = g => { const t = g.ot + g.sh; return t ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 60, height: 6, borderRadius: 3, background: T.surfaceAlt, overflow: "hidden", display: "flex" }}><i style={{ width: (g.ot / t * 100) + "%", background: T.emerald500 }} /><i style={{ width: (g.sh / t * 100) + "%", background: T.amber500 }} /></span>{Math.round(g.ot / t * 100)} % à l'heure</span> : <span style={{ color: T.ink300 }}>—</span>; };
  const bar = (parts, label) => <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}><div aria-hidden="true" style={{ flex: 1, height: 10, borderRadius: 3, background: T.surfaceAlt, overflow: "hidden", display: "flex" }}>{parts.map(([v, c], i) => <i key={i} className="enogia-bar-fill" style={{ width: pct(v), background: c }} />)}</div><span style={{ fontSize: FZ.xs, fontWeight: 600, color: T.ink700, minWidth: 74, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{label}</span></div>;
  const ecart = e => <span style={{ color: Math.abs(e) < .5 ? T.ink500 : e > 0 ? T.emerald600 : T.red500, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{Math.abs(e) < .5 ? "0" : (e > 0 ? "+" : "−") + fmtEur(Math.abs(e))}</span>;
  const grid = { display: "grid", gridTemplateColumns: "150px minmax(0,1fr) minmax(0,1fr) 110px 150px", gap: 12, alignItems: "center", padding: "6px 10px" };
  const listFor = key => { const init = [], act = []; rows.forEach(r => { const mk = monthKeys(r, today); if (!mk) return; if (mk.init === key) init.push(r); if (mk.act === key) act.push(r); }); return { init, act }; };
  const line = (key, label, x, isCur) => { const act = x.paid + x.fc, e = act - x.init, on = open === key; return (<React.Fragment key={key}>
    <button type="button" onClick={() => setOpen(on ? null : key)} aria-expanded={on} style={{ ...grid, width: "100%", border: "none", borderTop: "1px solid " + T.line, background: on ? T.teal100 : isCur ? T.surface : "transparent", cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, color: T.ink900, textAlign: "left" }}>
      <span style={{ fontWeight: 600 }}>{label}{isCur && <em style={{ fontStyle: "normal", fontSize: 11, color: T.teal600, marginLeft: 6 }}>en cours</em>}</span>
      {bar([[x.init, T.ink300]], x.init ? fmtEur(x.init) : "–")}{bar([[x.paid, T.emerald500], [x.fc, T.teal500]], act ? fmtEur(act) : "–")}
      <span style={{ textAlign: "right" }}>{ecart(e)}</span><span style={{ fontSize: FZ.xs, color: T.ink700 }}>{x.ot != null ? pu(x) : null}</span>
    </button>
    {on && (() => { const l = listFor(key); return <div style={{ padding: "0 10px" }}><Detail title="Réel et actualisé" list={l.act} onOpenRow={onOpenRow} extra={r => { const q = punctual(r, today); return q ? <span style={{ color: q.k === "ontime" ? T.emerald600 : T.amber600 }}>{q.k === "ontime" ? "à l'heure" : signed(q.d)}</span> : null; }} /><Detail title="Prévu au départ" list={l.init} onOpenRow={onOpenRow} /></div>; })()}
  </React.Fragment>); };
  const yrs = {}; m.months.forEach(x => { if (x.key < cur) { const y = x.key.slice(0, 4), g = yrs[y] || (yrs[y] = { init: 0, paid: 0, fc: 0, n: 0, ot: 0, sh: 0 }); g.init += x.init; g.paid += x.paid; g.fc += x.fc; g.n++; g.ot += x.ot; g.sh += x.sh; } });
  const out = [], shown = {}; let totI = 0, totA = 0;
  m.months.forEach(x => {
    const y = x.key.slice(0, 4), past = x.key < cur; totI += x.init; totA += x.paid + x.fc;
    if (past && !shown[y]) { shown[y] = 1; const g = yrs[y], o = !!pastOpen[y]; out.push(<button key={"y" + y} type="button" onClick={() => setPastOpen(p => ({ ...p, [y]: !o }))} aria-expanded={o} style={{ ...grid, width: "100%", border: "none", borderTop: "1px solid " + T.line, background: T.surface, cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, color: T.ink700, textAlign: "left" }}><span style={{ fontWeight: 700 }}>{o ? "▾" : "▸"} {y} <em style={{ fontStyle: "normal", fontSize: 11, color: T.ink500 }}>{g.n} mois passé{g.n > 1 ? "s" : ""}</em></span><span style={{ fontSize: FZ.xs }}>{fmtEur(g.init)}</span><span style={{ fontSize: FZ.xs }}>{fmtEur(g.paid + g.fc)}</span><span style={{ textAlign: "right" }}>{ecart(g.paid + g.fc - g.init)}</span><span style={{ fontSize: FZ.xs }}>{pu(g)}</span></button>); }
    if (past && !pastOpen[y]) return;
    out.push(line(x.key, monthLabel(x.key), x, x.key === cur));
  });
  if (m.nodate.init || m.nodate.fc) out.push(line("none", "Sans date", { init: m.nodate.init, paid: 0, fc: m.nodate.fc, ot: null }, false));
  // Matrice PJ × mois
  const items = matrixItems(rows, today), ks = {}; items.forEach(x => { ks[x.key] = 1; }); ks[cur] = 1;
  const months = monthRange(Object.keys(ks).filter(k => k !== "none").sort()); if (ks.none) months.push("none");
  const pjs = pjList(doc).filter(pj => items.some(x => x.r.pj === pj)), sum = l => l.reduce((s, x) => s + x.r.montant, 0);
  const cell = (l, k, pj) => { const allPaid = l.every(x => x.paid), on = mx && mx.pj === pj && mx.k === k; return <td key={k} onClick={() => setMx(on ? null : { pj, k })} title={fmtEur(sum(l)) + "\n" + l.map(x => (x.paid ? "Reçu : " : "Prévu : ") + (x.r.jalon || "Jalon") + " · " + fmtEur(x.r.montant)).join("\n")} style={{ padding: "4px 6px", textAlign: "right", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", background: on ? T.teal100 : allPaid ? T.emerald100 : T.surfaceAlt, color: allPaid ? T.emerald600 : T.ink900, borderLeft: "1px solid " + T.card, outline: k === cur ? "1px solid " + T.teal500 : "none", outlineOffset: -1 }}>{fmtK(sum(l))}{l.length > 1 && <sup style={{ fontSize: 9, marginLeft: 1 }}>{l.length}</sup>}</td>; };
  const mxList = mx ? items.filter(x => (mx.pj === "*" || x.r.pj === mx.pj) && (mx.k === "*" || x.key === mx.k)).map(x => x.r) : null;
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <section style={{ ...card(), padding: "10px 0 4px" }}>
      <div style={{ padding: "0 12px" }}><H title="Cash par mois" sub="cliquez sur un mois pour voir les jalons concernés" />
        <Legend items={[[T.ink300, "Initial"], [T.emerald500, "Encaissé (réel)"], [T.teal500, "Prévu, actualisé"], [T.amber500, "Décalé ou payé en retard"]]} /></div>
      <div style={{ ...grid, fontFamily: T.fontLabel, fontSize: 12, color: T.ink500, borderTop: "1px solid " + T.line }}><span>Mois</span><span>Initial</span><span>Réel et actualisé</span><span style={{ textAlign: "right" }}>Écart</span><span>Tenue des dates</span></div>
      {out}
      <div style={{ padding: "8px 12px", fontSize: FZ.xs, color: T.ink500, borderTop: "1px solid " + T.line }}>Total initial {fmtEur(totI)} · total réel et actualisé {fmtEur(totA)}. L'écart est positif quand le cash arrive plus tôt ou plus haut que prévu. Le mois initial est la date d'encaissement initiale, à défaut la date prévue.</div>
    </section>
    {items.length > 0 && <section style={{ ...card(), padding: "10px 12px" }}>
      <H title="Cash par PJ et par mois" sub="cliquez sur une case pour le détail des jalons" />
      <Legend items={[[T.emerald100, "Paiement reçu"], [T.surfaceAlt, "Encaissement prévu"]]} />
      <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", fontSize: FZ.xs, fontVariantNumeric: "tabular-nums" }}>
        <thead><tr><th style={{ ...th(), position: "sticky", left: 0 }}>PJ</th>{months.map(k => <th key={k} style={{ ...th(), textAlign: "right", color: k === cur ? T.teal600 : T.ink500 }}>{monthShort(k)}</th>)}<th style={{ ...th(), textAlign: "right" }}>Total</th></tr></thead>
        <tbody>
          {pjs.map(pj => { const mine = items.filter(x => x.r.pj === pj); return <tr key={pj}><th style={{ padding: "4px 8px", textAlign: "left", fontFamily: T.fontMono, fontSize: 11, color: T.ink900, background: T.card, position: "sticky", left: 0, borderTop: "1px solid " + T.line }} title={(doc.labels || {})[pj] || ""}>{pj}</th>{months.map(k => { const l = mine.filter(x => x.key === k); return l.length ? cell(l, k, pj) : <td key={k} style={{ borderTop: "1px solid " + T.line }} />; })}<td onClick={() => setMx({ pj, k: "*" })} style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, cursor: "pointer", borderTop: "1px solid " + T.line }}>{fmtK(sum(mine))}</td></tr>; })}
          <tr><th style={{ padding: "4px 8px", textAlign: "left", background: T.surface, position: "sticky", left: 0 }}>Total</th>{months.map(k => { const l = items.filter(x => x.key === k); return l.length ? cell(l, k, "*") : <td key={k} style={{ background: T.surface }} />; })}<td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, background: T.surface }}>{fmtK(sum(items))}</td></tr>
        </tbody></table></div>
      {mxList && <Detail title={(mx.pj === "*" ? "Tous les PJ" : mx.pj) + " · " + (mx.k === "*" ? "tous les mois" : monthLabel(mx.k))} list={mxList} onOpenRow={onOpenRow} />}
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 6 }}>Mois du paiement reçu, sinon de l'encaissement prévu. Jalons EPC exclus. Petit chiffre : nombre de jalons.</div>
    </section>}
  </div>);
}

// ── Écarts ──
export function EcartsView({ doc, today, onOpenRow }) {
  const rows = (doc && doc.rows) || [], labels = (doc && doc.labels) || {};
  const [metric, setMetric] = useState("eEncReel"), [by, setBy] = useState("mois"), [measure, setMeasure] = useState("avg"), [open, setOpen] = useState(null);
  if (!rows.length) return <div style={{ ...card(), padding: 16, color: T.ink500 }}>Pas encore de données.</div>;
  const k = ecartKpis(rows, today), m = ecartOf(metric), groups = ecartGroups(doc, metric, by, measure, today);
  let mxv = 1; groups.forEach(g => { mxv = Math.max(mxv, Math.abs(g.val)); });
  const Tile = ({ l, v, note }) => <div style={{ ...card(), padding: "10px 12px" }}><div style={{ fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>{l}</div><div style={{ fontFamily: T.fontDisplay, fontSize: 24, fontWeight: 600, color: T.ink900, fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>{v}</div><div style={{ fontSize: 11, color: T.ink500 }}>{note}</div></div>;
  const seg = (opts, val, set, label) => <div role="group" aria-label={label} style={{ display: "inline-flex", gap: 2, background: T.surface, border: "1px solid " + T.line, borderRadius: 8, padding: 2 }}>{opts.map(([id, l]) => <button key={id} type="button" aria-pressed={val === id} onClick={() => { set(id); setOpen(null); }} style={{ border: "none", borderRadius: 6, minHeight: 26, padding: "0 10px", fontSize: FZ.xs, fontWeight: 700, fontFamily: T.font, cursor: "pointer", background: val === id ? T.card : "transparent", color: val === id ? T.ink900 : T.ink500 }}>{l}</button>)}</div>;
  const dayCell = v => <td style={{ ...td(), textAlign: "right", color: v == null ? T.ink300 : v > 0 ? T.red500 : v < 0 ? T.emerald600 : T.ink500, fontWeight: 600 }}>{v == null ? "–" : signed(v, 1)}</td>;
  const EK = ["eFactPrev", "eFactEm", "eFactTot", "eEncPrev", "eEncReel", "eEncTot"];
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}>
      <Tile l="Retard moyen de paiement" v={k.avgRet == null ? "–" : signed(k.avgRet, 1)} note={"sur " + k.paidN + " jalons payés, réel vs prévu"} />
      <Tile l="Payés en retard" v={k.paidN ? Math.round(k.lateN / k.paidN * 100) + " %" : "–"} note={k.lateN + " sur " + k.paidN + " jalons payés"} />
      <Tile l="Glissement moyen des encaissements" v={k.avgGl == null ? "–" : signed(k.avgGl, 1)} note={"prévu vs initial, " + k.glN + " jalons"} />
      <Tile l="Plus gros retard" v={k.worst ? signed(k.worst.v) : "–"} note={k.worst ? k.worst.r.pj + " · " + (k.worst.r.jalon || "") : "aucun retard mesuré"} />
    </div>
    <section style={{ ...card(), padding: "10px 12px" }}>
      <H title={m.label} sub="en jours, cliquez sur une ligne pour voir les jalons" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink700 }}>Indicateur <select value={metric} onChange={e => { setMetric(e.target.value); setOpen(null); }} style={{ padding: "4px 8px", minHeight: 30, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontFamily: T.font, fontSize: FZ.xs }}>{ECARTS.map(e => <option key={e.k} value={e.k}>{e.label}</option>)}</select></label>
        {seg([["mois", "Mois"], ["semaine", "Semaine"], ["pj", "PJ"], ["cdp", "CdP"], ["jalon", "Jalon"]], by, setBy, "Regrouper par")}
        {seg([["avg", "Moyenne"], ["max", "Pire écart"]], measure, setMeasure, "Mesure")}
      </div>
      <Legend items={[[T.red500, "Plus tard que prévu (retard, glissement)"], [T.emerald500, "Plus tôt que prévu (avance)"]]} />
      {groups.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500, padding: "8px 0" }}>Aucune donnée pour cet indicateur : il faut les deux dates comparées sur au moins un jalon.</div> :
        groups.map(g => { const w = Math.abs(g.val) / mxv * 50, neg = g.val < 0, on = open === g.key, label = by === "mois" ? monthLabel(g.key) : g.label; return (<React.Fragment key={g.key}>
          <button type="button" onClick={() => setOpen(on ? null : g.key)} aria-expanded={on} style={{ display: "grid", gridTemplateColumns: "minmax(120px,220px) minmax(0,1fr) 90px", gap: 10, alignItems: "center", width: "100%", border: "none", borderTop: "1px solid " + T.line, background: on ? T.teal100 : "transparent", padding: "6px 4px", cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, color: T.ink900, textAlign: "left" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
            <span aria-hidden="true" style={{ position: "relative", height: 10 }}><span style={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: 1, background: T.ink300 }} /><i className="enogia-bar-fill" style={{ position: "absolute", top: 0, bottom: 0, left: neg ? (50 - w) + "%" : "50%", width: w + "%", background: neg ? T.emerald500 : T.red500, borderRadius: 2 }} /></span>
            <span style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: g.val > 0 ? T.red500 : g.val < 0 ? T.emerald600 : T.ink500 }}>{signed(g.val, 1)} <small style={{ color: T.ink500, fontWeight: 500 }}>{g.items.length}</small></span>
          </button>
          {on && <Detail title={label + " · " + m.short} list={g.items.slice().sort((a, b) => b.v - a.v).map(x => x.r)} onOpenRow={onOpenRow} extra={r => { const v = m.fn(r, today); return v == null ? null : <span style={{ color: v > 0 ? T.red500 : T.emerald600 }}>{signed(v)}</span>; }} />}
        </React.Fragment>); })}
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 6 }}>Le petit nombre est le nombre de jalons mesurés. {measure === "avg" ? "Chaque ligne montre la moyenne des écarts du groupe." : "Chaque ligne montre le plus grand retard du groupe."}</div>
    </section>
    <section style={{ ...card(), overflowX: "auto" }}>
      <div style={{ padding: "10px 12px 0" }}><H title="Détail par PJ et par jalon" sub="écarts en jours, positif = plus tard ; la ligne du PJ donne l'écart moyen" /></div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: FZ.sm, minWidth: 1000 }}>
        <thead><tr><th style={th()}>PJ / Jalon</th><th style={{ ...th(), textAlign: "right" }}>Montant</th>{EK.map(e => <th key={e} style={{ ...th(), textAlign: "right" }}>{ecartOf(e).short}</th>)}</tr></thead>
        <tbody>{pjList(doc).map(pj => { const list = rows.filter(r => r.pj === pj && !r.epc); if (!list.length) return null; return (<React.Fragment key={pj}>
          <tr style={{ background: T.surface }}><td style={td()}><b style={{ fontFamily: T.fontMono }}>{pj}</b>{labels[pj] ? <i style={{ color: T.ink500, marginLeft: 6 }}>{labels[pj]}</i> : null} <span style={{ color: T.ink500, fontSize: FZ.xs }}>· moyenne, {list.length} jalon{list.length > 1 ? "s" : ""}</span></td><td style={{ ...td(), textAlign: "right", fontWeight: 700 }}>{fmtEur(groupInfo(doc, pj).total)}</td>{EK.map(e => { const vals = list.map(r => ecartOf(e).fn(r, today)).filter(v => v != null); return <React.Fragment key={e}>{dayCell(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null)}</React.Fragment>; })}</tr>
          {list.map(r => <tr key={r.id} onClick={() => onOpenRow(r.id)} style={{ cursor: "pointer" }}><td style={{ ...td(), paddingLeft: 24, whiteSpace: "normal" }}>{r.jalon || "Jalon sans nom"}</td><td style={{ ...td(), textAlign: "right" }}>{fmtEur(r.montant)}</td>{EK.map(e => <React.Fragment key={e}>{dayCell(ecartOf(e).fn(r, today))}</React.Fragment>)}</tr>)}
        </React.Fragment>); })}</tbody>
      </table>
    </section>
  </div>);
}
