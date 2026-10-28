// v215 (maquette A « tableau de pilotage » validée) : KPI › Synthèse répond à une question — « livre-t-on à l'heure, et l'atelier
// tient-il ? ». Bandeau de 5 chiffres (libellé au-dessus, chiffre, une ligne d'explication ; couleur seulement quand c'est mauvais),
// puis la liste des PJ à risque (triés par dérive du départ) et la charge atelier des 6 prochaines semaines face à la capacité,
// enfin le portefeuille par état en une barre à 100 %. Règles ui-ux-pro-max + taste : une couleur par graphique, chiffres
// tabulaires alignés à droite, en-têtes de tableau 12 px gris, lignes ≥ 36 px.
import React, { useMemo } from "react";
import { T, FZF as FZ, stageSoft, alertSoft } from "../theme";
import { getPjMeta, ETAT_META } from "../pjMeta";
import { PjPlate } from "./SharedUI";
import { toLocalISO, weekStartOf } from "../parsers";
import { workDaysBetween, isClosedDay } from "../workDays";

const PROD = ["MONTAGE", "ELEC", "TESTS", "PACKAGING", "En fabrication"];
const fdm = v => { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? "—" : String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
const isoWeek = d => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - n); const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y) / 86400000 + 1) / 7); };

export function KpiPilotage({ rows, driftRows, delays, closurePeriods, productionExclusions, capaWeek, hasInitial, onOpenPj, onSeeDerives }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const open = rows.filter(r => r.etat !== "SHIPPED");
  const driftOf = useMemo(() => { const m = {}; (driftRows || []).forEach(d => { m[d.pj] = d.depart && d.depart.delta; }); return m; }, [driftRows]);
  const inProd = open.filter(r => PROD.includes(r.etat));
  const lim30 = new Date(today); lim30.setDate(lim30.getDate() + 30);
  const dep30 = open.filter(r => { const d = r.depart ? new Date(r.depart) : null; return d && d >= today && d <= lim30; });
  const dep30Late = dep30.filter(r => (driftOf[r.pj] || 0) > 0).length;
  const drifts = open.map(r => driftOf[r.pj]).filter(v => v != null);
  const avgDrift = drifts.length ? Math.round(drifts.reduce((a, b) => a + b, 0) / drifts.length) : null;

  // charge atelier des 6 prochaines semaines, sur les jours réellement travaillés (comme KPI › Charge depuis V213)
  const weeks = useMemo(() => {
    const w0 = weekStartOf(today), out = [];
    for (let i = 0; i < 6; i++) { const a = new Date(w0); a.setDate(a.getDate() + 7 * i); let days = 0; for (let k = 0; k < 5; k++) { const d = new Date(a); d.setDate(d.getDate() + k); if (!isClosedDay(closurePeriods, d)) days++; } out.push({ key: toLocalISO(a), a, hours: 0, cap: capaWeek * days / 5 }); }
    const idx = Object.fromEntries(out.map((w, i) => [w.key, i]));
    rows.forEach(r => {
      if (!r.arrivee || !r.finProd || !r.heuresAtelier || r.etat === "SHIPPED") return;
      const days = workDaysBetween(r.arrivee, r.finProd, closurePeriods, (productionExclusions || {})[r.pj]); if (!days.length) return;
      days.forEach(k => { const i = idx[toLocalISO(weekStartOf(new Date(k + "T12:00:00")))]; if (i != null) out[i].hours += r.heuresAtelier / days.length; });
    });
    return out.map(w => ({ ...w, hours: Math.round(w.hours) }));
  }, [rows, closurePeriods, productionExclusions, capaWeek, today]);
  const w4 = weeks.slice(0, 4), load4 = w4.reduce((a, w) => a + w.hours, 0), cap4 = w4.reduce((a, w) => a + w.cap, 0), pct4 = cap4 ? Math.round(load4 / cap4 * 100) : null;

  // retards déclarés sur les PJ en cours
  const delayInfo = useMemo(() => {
    const openSet = new Set(open.map(r => r.pj)), byType = {}; let n = 0;
    Object.entries(delays || {}).forEach(([pj, list]) => { if (!openSet.has(pj) || !(list || []).length) return; n++; list.forEach(d => { if (d && d.type) byType[d.type] = (byType[d.type] || 0) + (Number(d.days) || 0); }); });
    const top = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    return { n, top };
  }, [delays, open]);

  const risky = open.filter(r => (driftOf[r.pj] || 0) > 0).sort((a, b) => (driftOf[b.pj] || 0) - (driftOf[a.pj] || 0));
  const A = alertSoft(), S = stageSoft();
  const card = { background: T.card, border: "1px solid " + T.line, borderRadius: 10, padding: "12px 14px", minWidth: 0 };
  const Kpi = ({ label, value, sub, bad }) => (<div style={card}>
    <div style={{ fontSize: 12.5, color: T.ink500, fontFamily: T.fontLabel }}>{label}</div>
    <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, color: bad ? T.red500 : T.ink900, fontVariantNumeric: "tabular-nums", lineHeight: 1.15, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: 12, color: T.ink500, marginTop: 4 }}>{sub}</div>
  </div>);
  const pill = d => { const t = d > 10 ? A.red : A.orange; return <span style={{ background: t.bg, color: t.ink, borderRadius: 999, padding: "0 8px", fontSize: 12, fontWeight: 700, lineHeight: "20px", display: "inline-block", fontVariantNumeric: "tabular-nums" }}>+{d} j</span>; };
  const th = { fontSize: 12, color: T.ink500, fontWeight: 500, textAlign: "left", padding: "6px 8px", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" };
  const td = { padding: "0 8px", height: 40, borderBottom: "1px solid " + T.line, fontSize: FZ.sm, color: T.ink700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 };

  // portefeuille par état : 4 états les plus fournis + « autres »
  const etats = useMemo(() => {
    const m = {}; open.forEach(r => { m[r.etat] = (m[r.etat] || 0) + 1; });
    const l = Object.entries(m).sort((a, b) => b[1] - a[1]); const top = l.slice(0, 4), rest = l.slice(4).reduce((a, x) => a + x[1], 0);
    return [...top.map(([e, n]) => ({ label: (ETAT_META[e] && ETAT_META[e].label) || e, n, c: (ETAT_META[e] && ETAT_META[e].bar) || T.ink300 })), ...(rest ? [{ label: "autres", n: rest, c: T.ink300 }] : [])];
  }, [open]);
  const tot = etats.reduce((a, e) => a + e.n, 0);
  const maxH = Math.max(1, ...weeks.map(w => Math.max(w.hours, w.cap))) * 1.15, H = 120;

  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,160px),1fr))", gap: 8 }}>
      <Kpi label="En production" value={inProd.length} sub="machines dans l'atelier" />
      <Kpi label="Départs d'ici 30 jours" value={dep30.length} sub={dep30.length ? (dep30Late ? "dont " + dep30Late + " en dérive" : "aucun en dérive") : "aucun départ prévu"} />
      <Kpi label="Dérive moyenne" value={avgDrift == null ? "—" : (avgDrift > 0 ? "+" : avgDrift < 0 ? "−" : "") + Math.abs(avgDrift) + " j"} sub={hasInitial ? "départ, vs planning initial" : "planning initial non importé"} bad={avgDrift != null && avgDrift > 3} />
      <Kpi label={"Charge S" + isoWeek(w4[0].a) + " → S" + isoWeek(w4[3].a)} value={pct4 == null ? "—" : pct4 + " %"} sub={load4 + " h sur " + Math.round(cap4) + " h de capacité"} bad={pct4 != null && pct4 > 100} />
      <Kpi label="PJ avec un retard déclaré" value={delayInfo.n} sub={delayInfo.top ? "1re cause : " + delayInfo.top[0] + " (" + delayInfo.top[1] + " j)" : "aucune cause saisie"} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: 12, alignItems: "start" }}>
      <section aria-label="PJ à risque" style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "12px 14px 6px" }}>
          <h3 style={{ margin: 0, fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>PJ à risque</h3>
          <span style={{ fontSize: 12, color: T.ink500 }}>{risky.length ? "triés par dérive du départ · " + Math.min(6, risky.length) + " sur " + risky.length : ""}</span>
        </div>
        {!hasInitial ? <div style={{ padding: "4px 14px 14px", fontSize: FZ.sm, color: T.ink500 }}>Les dérives se calculent par rapport au planning initial : importez-le avec le repère « Planning initial » ci-dessus.</div>
          : risky.length === 0 ? <div style={{ padding: "4px 14px 14px", fontSize: FZ.sm, color: T.ink500 }}>Aucun PJ en dérive sur son départ.</div>
          : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>PJ</th><th style={th}>Projet</th><th style={th}>État</th><th style={{ ...th, textAlign: "right" }}>Départ</th><th style={{ ...th, textAlign: "right" }}>Dérive</th></tr></thead>
            <tbody>{risky.slice(0, 6).map(r => <tr key={r.pj} className="enogia-kpi-row" onClick={() => onOpenPj && onOpenPj(r.pj)} style={{ cursor: onOpenPj ? "pointer" : "default" }} tabIndex={onOpenPj ? 0 : undefined} onKeyDown={e => { if (e.key === "Enter" && onOpenPj) onOpenPj(r.pj); }} aria-label={onOpenPj ? "Ouvrir la fiche de " + r.pj : undefined}>
              <td style={td}><PjPlate pj={r.pj} /></td>
              <td style={{ ...td, color: T.ink900 }}>{getPjMeta(r.pj, r).nomProjet || "—"}</td>
              <td style={td}>{(ETAT_META[r.etat] && ETAT_META[r.etat].label) || r.etat}</td>
              <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fdm(r.depart)}</td>
              <td style={{ ...td, textAlign: "right" }}>{pill(driftOf[r.pj])}</td>
            </tr>)}</tbody>
          </table></div>}
        {risky.length > 6 && onSeeDerives && <button type="button" onClick={onSeeDerives} style={{ border: "none", background: "transparent", color: T.teal600, fontWeight: 700, fontSize: FZ.sm, padding: "10px 14px", cursor: "pointer", fontFamily: T.font, minHeight: 36 }}>Voir les {risky.length} PJ en dérive →</button>}
      </section>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <section aria-label="Charge atelier" style={card}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}><h3 style={{ margin: 0, fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>Charge atelier</h3><span style={{ fontSize: 12, color: T.ink500 }}>heures par semaine · trait = capacité</span></div>
          <div role="img" aria-label={"Charge des 6 prochaines semaines : " + weeks.map(w => "S" + isoWeek(w.a) + " " + w.hours + " h sur " + Math.round(w.cap)).join(", ")} style={{ display: "flex", alignItems: "flex-end", gap: 8, height: H, borderBottom: "1px solid " + T.line }}>
            {weeks.map(w => { const h = Math.round(w.hours / maxH * H), c = Math.round(w.cap / maxH * H), over = w.hours > w.cap + 0.5; return (
              <div key={w.key} title={"S" + isoWeek(w.a) + " : " + w.hours + " h / " + Math.round(w.cap) + " h"} style={{ flex: 1, position: "relative", height: "100%", minWidth: 0 }}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: Math.max(1, h), background: over ? T.red500 : S.production.solid, borderRadius: "2px 2px 0 0" }} />
                <div style={{ position: "absolute", left: -3, right: -3, bottom: c, borderTop: "2px dashed " + T.ink500 }} />
                <div style={{ position: "absolute", left: 0, right: 0, bottom: Math.max(h, c) + 4, textAlign: "center", fontSize: 11.5, fontWeight: 700, color: over ? T.red500 : T.ink700, fontVariantNumeric: "tabular-nums" }}>{w.hours}</div>
              </div>); })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>{weeks.map(w => <span key={w.key} style={{ flex: 1, textAlign: "center", fontSize: 11.5, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>S{isoWeek(w.a)}</span>)}</div>
        </section>
        <section aria-label="Portefeuille par état" style={card}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><h3 style={{ margin: 0, fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>Portefeuille par état</h3><span style={{ fontSize: 12, color: T.ink500 }}>{tot} PJ en cours</span></div>
          <div role="img" aria-label={etats.map(e => e.label + " " + e.n).join(", ")} style={{ display: "flex", height: 12, borderRadius: 3, overflow: "hidden", margin: "10px 0 8px", background: T.surfaceAlt }}>
            {etats.map(e => <i key={e.label} title={e.label + " : " + e.n} style={{ flex: e.n, background: e.c }} />)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12.5, color: T.ink700 }}>{etats.map(e => <span key={e.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: e.c }} />{e.label}<b style={{ fontVariantNumeric: "tabular-nums", color: T.ink900 }}>{e.n}</b></span>)}</div>
        </section>
      </div>
    </div>
  </div>);
}
