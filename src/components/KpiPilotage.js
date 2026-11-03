// v215 (maquette A « tableau de pilotage » validée) : KPI › Synthèse répond à une question — « livre-t-on à l'heure, et l'atelier
// tient-il ? ». Bandeau de 5 chiffres (libellé au-dessus, chiffre, une ligne d'explication ; couleur seulement quand c'est mauvais),
// puis la liste des PJ à risque (triés par dérive du départ) et la charge atelier des 6 prochaines semaines face à la capacité,
// enfin le portefeuille par état en une barre à 100 %. Règles ui-ux-pro-max + taste : une couleur par graphique, chiffres
// tabulaires alignés à droite, en-têtes de tableau 12 px gris, lignes ≥ 36 px.
import React, { useMemo } from "react";
import { T, FZF as FZ, stageSoft } from "../theme";
import { getPjMeta, ETAT_META, countShippedYTD } from "../pjMeta";
import { PjPlate } from "./SharedUI";
import { toLocalISO, weekStartOf } from "../parsers";
import { workDaysBetween, isClosedDay } from "../workDays";
import { Arrange } from "./Arrange";
import { makeCalendar, schedule, loadModel } from "../planner/engine";

const PROD = ["MONTAGE", "ELEC", "TESTS", "PACKAGING", "En fabrication"];
const fdm = v => { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? "—" : String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
const isoWeek = d => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - n); const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y) / 86400000 + 1) / 7); };

// v219 (demandé : « prendre la charge en fonction de l'onglet planificateur ») : si le plan du planificateur est disponible, la charge
// (heures planifiées et capacité, y compris les semaines à capacité spéciale) vient de lui ; sinon, du planning et de 175 h / semaine.
export function planWeeks(plan, closurePeriods, productionExclusions, n, from) {
  if (!plan || plan.v !== 2) return null;
  const cal = makeCalendar({ closurePeriods, holidays: !(plan.cal && plan.cal.holidays === false), pjOff: productionExclusions });
  const lm = loadModel(plan, schedule(plan, cal), cal), byWeek = {}; (lm.weeks || []).forEach(w => { byWeek[w.week] = w; });
  const out = []; for (let i = 0; i < n; i++) { const a = new Date(from); a.setDate(a.getDate() + 7 * i); const k = toLocalISO(a), w = byWeek[k];
    let cap = w ? w.cap : null; if (cap == null) { let days = 0; for (let j = 0; j < 5; j++) { const d = new Date(a); d.setDate(d.getDate() + j); if (cal.isWork(toLocalISO(d))) days++; } const ov = plan.capWeeks && plan.capWeeks[k]; cap = ov != null ? Number(ov) : lm.capDay * days; }
    out.push({ key: k, a, hours: Math.round(w ? w.hours : 0), cap }); }
  return out;
}
// v246 : charge atelier sur n semaines à partir du lundi `from` (planificateur si disponible, sinon planning + capacité hebdomadaire),
// partagée par la Synthèse et la sous-page Semaines.
export function loadWeeks(rows, closurePeriods, productionExclusions, capaWeek, plan, n, from) {
  const w0 = weekStartOf(from), out = [];
  for (let i = 0; i < n; i++) { const a = new Date(w0); a.setDate(a.getDate() + 7 * i); let days = 0; for (let k = 0; k < 5; k++) { const d = new Date(a); d.setDate(d.getDate() + k); if (!isClosedDay(closurePeriods, d)) days++; } out.push({ key: toLocalISO(a), a, hours: 0, cap: capaWeek * days / 5 }); }
  const idx = Object.fromEntries(out.map((w, i) => [w.key, i]));
  rows.forEach(r => {
    if (!r.arrivee || !r.finProd || !r.heuresAtelier || r.etat === "SHIPPED") return;
    const days = workDaysBetween(r.arrivee, r.finProd, closurePeriods, (productionExclusions || {})[r.pj]); if (!days.length) return;
    days.forEach(k => { const i = idx[toLocalISO(weekStartOf(new Date(k + "T12:00:00")))]; if (i != null) out[i].hours += r.heuresAtelier / days.length; });
  });
  return planWeeks(plan, closurePeriods, productionExclusions, n, w0) || out.map(w => ({ ...w, hours: Math.round(w.hours) }));
}
export { isoWeek };
const SHORT_MONTHS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
export const weekLabel = a => "S" + isoWeek(a) + " · " + a.getDate() + " " + SHORT_MONTHS[a.getMonth()];

// v246 (maquette A de Claude Design, choisie par Gabriel) : 5 chiffres (production, départs du mois, PJ en retard sur l'initial,
// charge 4 semaines, livrées cette année), PJ à risque avec la pastille d'état, charge plus haute avec heures et dates, portefeuille
// en barre à 100 % + légende chiffrée. La dérive moyenne et les retards déclarés passent en tête de la sous-page Dérives.
export function KpiPilotage({ rows, driftRows, closurePeriods, productionExclusions, capaWeek, hasInitial, onOpenPj, onSeeDerives, plan }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const open = rows.filter(r => r.etat !== "SHIPPED");
  const driftOf = useMemo(() => { const m = {}; (driftRows || []).forEach(d => { m[d.pj] = d.depart && d.depart.delta; }); return m; }, [driftRows]);
  const inProd = open.filter(r => PROD.includes(r.etat));
  const lim30 = new Date(today); lim30.setDate(lim30.getDate() + 30);
  const dep30 = open.filter(r => { const d = r.depart ? new Date(r.depart) : null; return d && d >= today && d <= lim30; });
  const dep30Late = dep30.filter(r => (driftOf[r.pj] || 0) > 0).length;
  const shipped = countShippedYTD(rows);
  const shipped28 = rows.filter(r => { if (r.etat !== "SHIPPED" || !r.depart) return false; const d = new Date(r.depart), n = (today - d) / 864e5; return n >= 0 && n <= 28; }).length;

  // charge atelier des 6 prochaines semaines, sur les jours réellement travaillés (comme KPI › Charge depuis V213)
  const weeks = useMemo(() => loadWeeks(rows, closurePeriods, productionExclusions, capaWeek, plan, 6, today), [rows, closurePeriods, productionExclusions, capaWeek, today, plan]);
  const fromPlan = !!(plan && plan.v === 2);
  const w4 = weeks.slice(0, 4), load4 = w4.reduce((a, w) => a + w.hours, 0), cap4 = w4.reduce((a, w) => a + w.cap, 0), pct4 = cap4 ? Math.round(load4 / cap4 * 100) : null;
  const peak = w4.filter(w => w.cap > 0 && w.hours > w.cap + 0.5).sort((a, b) => b.hours / b.cap - a.hours / a.cap)[0];

  const risky = open.filter(r => (driftOf[r.pj] || 0) > 0).sort((a, b) => (driftOf[b.pj] || 0) - (driftOf[a.pj] || 0));
  const S = stageSoft();
  const card = { background: T.card, border: "1px solid " + T.line, borderRadius: 10, padding: "12px 14px", minWidth: 0 };
  const Kpi = ({ label, value, sub, bad, good, subBad }) => (<div style={card}>
    <div style={{ fontSize: 12.5, color: T.ink500, fontFamily: T.fontLabel }}>{label}</div>
    <div style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 600, color: bad ? T.red500 : good ? T.emerald600 : T.ink900, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: 12.5, color: subBad ? T.red500 : T.ink500, fontWeight: subBad ? 600 : 400, marginTop: 4 }}>{sub}</div>
  </div>);
  const etatChip = e => { const m = ETAT_META[e]; return m ? <span style={{ background: m.bg, color: m.text, borderRadius: 999, padding: "0 9px", fontSize: 12, fontWeight: 600, lineHeight: "20px", display: "inline-block", maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" }}>{m.label}</span> : (e || "—"); };
  const th = { fontSize: 12, color: T.ink500, fontWeight: 500, textAlign: "left", padding: "6px 8px", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" };
  const td = { padding: "0 8px", height: 40, borderBottom: "1px solid " + T.line, fontSize: FZ.sm, color: T.ink700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 };

  // portefeuille par état : 4 états les plus fournis + « autres »
  const etats = useMemo(() => {
    const m = {}; open.forEach(r => { m[r.etat] = (m[r.etat] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([e, n]) => ({ label: (ETAT_META[e] && ETAT_META[e].label) || e, n, c: (ETAT_META[e] && ETAT_META[e].bar) || T.ink300 }));
  }, [open]);
  const tot = etats.reduce((a, e) => a + e.n, 0);
  const top4 = etats.slice(0, 4), rest = etats.slice(4).reduce((a, e) => a + e.n, 0);
  const parts = [...top4, ...(rest ? [{ label: etats.slice(4).length === 1 ? etats[4].label : "Autres états", n: rest, c: T.ink300 }] : [])];
  const maxH = Math.max(1, ...weeks.map(w => Math.max(w.hours, w.cap))) * 1.18, H = 180;

  return (<Arrange id="kpi-synthese" spans={{ "Chiffres clés": 12, "PJ à risque": 7, "Charge atelier": 5, "Portefeuille par état": 5 }}>
    <div aria-label="Chiffres clés" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,170px),1fr))", gap: 10 }}>
      <Kpi label="En production" value={inProd.length} sub={"sur " + open.length + " projet" + (open.length > 1 ? "s" : "") + " ouvert" + (open.length > 1 ? "s" : "")} />
      <Kpi label="Départs d'ici 30 jours" value={dep30.length} sub={dep30.length ? (dep30Late === dep30.length ? (dep30.length > 1 ? "tous en dérive" : "en dérive") : dep30Late ? "dont " + dep30Late + " en dérive" : "aucun en dérive") : "aucun départ prévu"} subBad={dep30Late > 0} />
      <Kpi label="En retard sur l'initial" value={hasInitial ? risky.length : "—"} bad={risky.length > 0} sub={!hasInitial ? "pas de planning initial" : risky.length ? "max " + risky[0].pj + " · +" + driftOf[risky[0].pj] + " j" : "aucun PJ en dérive"} />
      <Kpi label={"Charge S" + isoWeek(w4[0].a) + " → S" + isoWeek(w4[3].a)} value={pct4 == null ? "—" : pct4 + " %"} bad={pct4 != null && pct4 > 100} sub={load4 + " h sur " + Math.round(cap4) + " h" + (peak ? " · S" + isoWeek(peak.a) + " à " + Math.round(peak.hours / peak.cap * 100) + " %" : "")} subBad={!!peak} />
      <Kpi label="Livrées depuis mai" value={shipped} good={shipped > 0} sub={shipped28 + " sur les 28 derniers jours"} />
    </div>
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
              <td style={td}>{etatChip(r.etat)}</td>
              <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fdm(r.depart)}</td>
              <td style={{ ...td, textAlign: "right", color: T.red500, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>+{driftOf[r.pj]} j</td>
            </tr>)}</tbody>
          </table></div>}
        {risky.length > 6 && onSeeDerives && <button type="button" onClick={onSeeDerives} style={{ border: "none", background: "transparent", color: T.teal600, fontWeight: 700, fontSize: FZ.sm, padding: "10px 14px", cursor: "pointer", fontFamily: T.font, minHeight: 36 }}>Voir les {risky.length} PJ en dérive →</button>}
      </section>
        <section aria-label="Charge atelier" style={card}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}><h3 style={{ margin: 0, fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>Charge atelier</h3><span style={{ fontSize: 12, color: T.ink500 }}>heures par semaine · trait = capacité · {fromPlan ? "d'après le planificateur" : "d'après le planning (175 h / sem.)"}</span></div>
          <div role="img" aria-label={"Charge des 6 prochaines semaines : " + weeks.map(w => "S" + isoWeek(w.a) + " " + w.hours + " h sur " + Math.round(w.cap)).join(", ")} style={{ display: "flex", alignItems: "flex-end", gap: 8, height: H, borderBottom: "1px solid " + T.line }}>
            {weeks.map(w => { const h = Math.round(w.hours / maxH * H), c = Math.round(w.cap / maxH * H), over = w.hours > w.cap + 0.5; return (
              <div key={w.key} title={"S" + isoWeek(w.a) + " : " + w.hours + " h / " + Math.round(w.cap) + " h"} style={{ flex: 1, position: "relative", height: "100%", minWidth: 0 }}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: Math.max(1, h), background: over ? T.red500 : S.production.solid, borderRadius: "2px 2px 0 0" }} />
                <div style={{ position: "absolute", left: -3, right: -3, bottom: c, borderTop: "2px dashed " + T.ink500 }} />
                <div style={{ position: "absolute", left: 0, right: 0, bottom: Math.max(h, c) + 4, textAlign: "center", fontSize: 12.5, fontWeight: 700, color: over ? T.red500 : T.ink700, fontVariantNumeric: "tabular-nums" }}>{w.hours} h</div>
              </div>); })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>{weeks.map(w => <span key={w.key} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 11.5, color: T.ink500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{weekLabel(w.a)}</span>)}</div>
        </section>
        <section aria-label="Portefeuille par état" style={card}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><h3 style={{ margin: 0, fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>Portefeuille par état</h3><span style={{ fontSize: 12, color: T.ink500 }}>{tot} PJ ouverts</span></div>
          {tot === 0 ? <div style={{ marginTop: 10, fontSize: FZ.sm, color: T.ink500 }}>Aucun PJ ouvert avec les filtres actuels.</div> : <>
            <div role="img" aria-label={parts.map(p => p.label + " " + p.n).join(", ")} style={{ display: "flex", height: 22, gap: 2, marginTop: 14 }}>
              {parts.map(p => <div key={p.label} title={p.label + " : " + p.n} style={{ flex: p.n, minWidth: 3, background: p.c }} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))", gap: "6px 16px", marginTop: 12, fontSize: FZ.sm, color: T.ink700 }}>
              {parts.map(p => <span key={p.label} style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}><span aria-hidden="true" style={{ width: 10, height: 10, background: p.c, flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</span><b style={{ marginLeft: "auto", color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{p.n}</b></span>)}
            </div>
          </>}
        </section>
  </Arrange>);
}
