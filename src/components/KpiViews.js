// v246 (maquettes B et C de Claude Design, choisies par Gabriel avec la A) :
//   • KpiDerivesHead — tête de KPI › Dérives : la réponse en titre (« N machines partiront plus tard que prévu »), le classement
//     des plus fortes dérives du départ (une couleur, barres triées, clic = fiche), les départs des 30 prochains jours et deux repères.
//   • KpiSemaines — sous-page KPI › Semaines : une colonne par semaine sur 8 semaines (charge atelier face à la capacité, départs
//     avec leur dérive, machines au banc), puis « À décider » (semaines en surcharge, plus forte dérive).
import React, { useMemo } from "react";
import { T, FZF as FZ, inkOn } from "../theme";
import { getPjMeta } from "../pjMeta";
import { loadWeeks, isoWeek, weekLabel } from "./KpiPilotage";

const fdm = v => { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? "—" : String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const card = () => ({ background: T.card, border: "1px solid " + T.line, borderRadius: 12, minWidth: 0 });
const useDrift = driftRows => useMemo(() => { const m = {}; (driftRows || []).forEach(d => { m[d.pj] = d.depart && d.depart.delta; }); return m; }, [driftRows]);
const nom = r => getPjMeta(r.pj, r).nomProjet || "";
const plural = (n, a, b) => n > 1 ? b : a;

export function KpiDerivesHead({ rows, driftRows, delays, hasInitial, onOpenPj }) {
  const today = useMemo(day0, []);
  const driftOf = useDrift(driftRows);
  const open = rows.filter(r => r.etat !== "SHIPPED");
  const late = open.filter(r => (driftOf[r.pj] || 0) > 0).sort((a, b) => driftOf[b.pj] - driftOf[a.pj]);
  const drifts = open.map(r => driftOf[r.pj]).filter(v => v != null);
  const avg = drifts.length ? Math.round(drifts.reduce((a, b) => a + b, 0) / drifts.length) : null;
  const lim30 = new Date(today); lim30.setDate(lim30.getDate() + 30);
  const dep30 = open.filter(r => { const d = r.depart ? new Date(r.depart) : null; return d && d >= today && d <= lim30; }).sort((a, b) => new Date(a.depart) - new Date(b.depart));
  const dep30Late = dep30.filter(r => (driftOf[r.pj] || 0) > 0).length;
  const delayInfo = useMemo(() => {
    const openSet = new Set(open.map(r => r.pj)), byType = {}; let n = 0;
    Object.entries(delays || {}).forEach(([pj, list]) => { if (!openSet.has(pj) || !(list || []).length) return; n++; list.forEach(d => { if (d && d.type) byType[d.type] = (byType[d.type] || 0) + (Number(d.days) || 0); }); });
    return { n, top: Object.entries(byType).sort((a, b) => b[1] - a[1])[0] };
  }, [delays, open]);
  if (!hasInitial) return null;
  const top = late.slice(0, 14), max = Math.max(1, ...top.map(r => driftOf[r.pj]));
  const dark = T.teal500, onDark = inkOn(dark);
  const lbl = { fontSize: 12, color: T.ink500, fontFamily: T.fontLabel };
  const sentence = (avg != null ? "Dérive moyenne de " + (avg > 0 ? "+" : avg < 0 ? "−" : "") + Math.abs(avg) + " jours sur le départ, comparé au planning initial. " : "")
    + (dep30.length ? (dep30Late === dep30.length ? (dep30.length > 1 ? "Les " + dep30.length + " départs du mois sont tous concernés." : "Le départ du mois est concerné.") : dep30Late + " des " + dep30.length + " départs du mois " + plural(dep30Late, "est concerné.", "sont concernés.")) : "Aucun départ dans les 30 prochains jours.");
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: "clamp(24px, 2.6vw, 36px)", lineHeight: 1.12, fontWeight: 600, color: late.length ? T.ink900 : T.emerald600, letterSpacing: "-.01em" }}>
        {late.length ? late.length + " " + plural(late.length, "machine en cours partira", "machines en cours partiront") + " plus tard que prévu" : "Aucune machine en cours ne part plus tard que prévu"}</h2>
      <p style={{ margin: 0, fontSize: FZ.md, color: T.ink700 }}>{sentence}</p>
    </header>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
      <section aria-label="Dérive du départ par PJ" style={{ ...card(), padding: "12px 16px 14px", flex: "999 1 560px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: FZ.md, fontWeight: 600, color: T.ink900 }}>Dérive du départ, en jours</h3>
          <span style={{ fontSize: 12, color: T.ink500 }}>{late.length > top.length ? top.length + " plus fortes sur " + late.length : late.length + " PJ"} · clic = fiche du PJ</span>
        </div>
        {top.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500, padding: "6px 0" }}>Aucun PJ en dérive sur son départ</div> :
          <div role="list" style={{ display: "flex", flexDirection: "column" }}>
            {top.map(r => { const d = driftOf[r.pj]; return (
              <button key={r.pj} type="button" role="listitem" onClick={() => onOpenPj && onOpenPj(r.pj)} aria-label={"Ouvrir la fiche de " + r.pj + " : +" + d + " jours"}
                className="enogia-kpi-row" style={{ display: "grid", gridTemplateColumns: "92px minmax(90px, 160px) minmax(0, 1fr) 56px 52px", gap: 12, alignItems: "center", minHeight: 34, border: "none", borderTop: "1px solid " + T.line, background: "transparent", padding: "0 2px", cursor: "pointer", textAlign: "left", fontFamily: T.font, color: T.ink900 }}>
                <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: FZ.sm }}>{r.pj}</span>
                <span style={{ fontSize: FZ.sm, color: T.ink700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nom(r) || "—"}</span>
                <span aria-hidden="true" style={{ height: 12, display: "block" }}><span style={{ display: "block", height: "100%", width: Math.max(2, d / max * 100) + "%", background: T.red500 }} /></span>
                <span style={{ textAlign: "right", fontWeight: 600, color: T.red500, fontVariantNumeric: "tabular-nums", fontSize: FZ.sm }}>+{d}</span>
                <span style={{ textAlign: "right", color: T.ink500, fontVariantNumeric: "tabular-nums", fontSize: FZ.sm }}>{fdm(r.depart)}</span>
              </button>); })}
          </div>}
      </section>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, flex: "1 1 300px" }}>
        <section aria-label="Départs des 30 prochains jours" style={{ background: dark, color: onDark, borderRadius: 12, padding: "12px 16px" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: FZ.md, fontWeight: 600 }}>Départs des 30 prochains jours</h3>
          {dep30.length === 0 ? <div style={{ fontSize: FZ.sm, opacity: .85 }}>Aucun départ prévu</div> : dep30.map(r => { const d = driftOf[r.pj] || 0; return (
            <button key={r.pj} type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 8, alignItems: "center", minHeight: 36, border: "none", borderTop: "1px solid " + (onDark === "#FFFFFF" ? "rgba(255,255,255,.18)" : "rgba(16,24,40,.18)"), background: "transparent", color: onDark, cursor: "pointer", padding: 0, fontFamily: T.font, fontSize: FZ.sm, textAlign: "left" }}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><b style={{ fontFamily: T.fontMono }}>{r.pj}</b> {nom(r)}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fdm(r.depart)}{d > 0 && <> · <b>+{d} j</b></>}</span>
            </button>); })}
        </section>
        <section aria-label="Repères" style={{ ...card(), padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div><div style={lbl}>Dérive moyenne</div><div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: avg > 3 ? T.red500 : T.ink900 }}>{avg == null ? "—" : (avg > 0 ? "+" : avg < 0 ? "−" : "") + Math.abs(avg) + " j"}</div><div style={{ fontSize: 12, color: T.ink500 }}>machines en cours, vs initial</div></div>
          <div><div style={lbl}>Retards déclarés</div><div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: T.ink900 }}>{delayInfo.n}</div><div style={{ fontSize: 12, color: T.ink500, overflow: "hidden", textOverflow: "ellipsis" }}>{delayInfo.top ? "1re cause : " + delayInfo.top[0] : "aucune cause saisie"}</div></div>
        </section>
      </div>
    </div>
  </div>);
}

export function KpiSemaines({ rows, driftRows, closurePeriods, productionExclusions, capaWeek, plan, hasInitial, onOpenPj, onOpenPlanner }) {
  const today = useMemo(day0, []);
  const driftOf = useDrift(driftRows);
  const N = 8;
  const weeks = useMemo(() => loadWeeks(rows, closurePeriods, productionExclusions, capaWeek, plan, N, today), [rows, closurePeriods, productionExclusions, capaWeek, plan, today]);
  const open = rows.filter(r => r.etat !== "SHIPPED");
  const cols = weeks.map(w => {
    const a = new Date(w.a), b = new Date(a); b.setDate(b.getDate() + 7);
    const inW = v => { if (!v) return false; const d = new Date(v); return d >= a && d < b; };
    const deps = open.filter(r => inW(r.depart)).sort((x, y) => new Date(x.depart) - new Date(y.depart));
    const bench = open.filter(r => { if (!r.tests) return false; const s = new Date(r.tests), e = new Date(r.testsFin || r.tests); e.setHours(23); return s < b && e >= a; });
    return { ...w, deps, bench, over: w.cap > 0 && w.hours > w.cap + 0.5, now: a <= today && today < b };
  });
  const nDeps = cols.reduce((s, c) => s + c.deps.length, 0), overW = cols.filter(c => c.over);
  const late = open.filter(r => (driftOf[r.pj] || 0) > 0).sort((a, b) => driftOf[b.pj] - driftOf[a.pj]);
  const maxH = Math.max(1, ...cols.map(c => Math.max(c.hours, c.cap))) * 1.12, H = 150;
  const fromPlan = !!(plan && plan.v === 2);
  const lbl = { fontSize: 12, color: T.ink500, fontFamily: T.fontLabel };
  const cell = c => ({ padding: "8px 8px", borderLeft: "1px solid " + T.line, background: c.now ? T.amber100 : "transparent", minWidth: 0 });
  const rowHead = { padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 };
  const grid = { display: "grid", gridTemplateColumns: "140px repeat(" + N + ", minmax(108px, 1fr))", minWidth: 140 + N * 108 };
  const decide = [
    ...overW.sort((x, y) => (y.hours - y.cap) - (x.hours - x.cap)).slice(0, 2).map(c => ({ key: c.key, tone: "red", title: "S" + isoWeek(c.a) + " : " + c.hours + " h pour " + Math.round(c.cap) + " h", text: Math.round(c.hours - c.cap) + " h à déplacer ou à renforcer" + (c.deps.length ? " ; " + plural(c.deps.length, "départ", "départs") + " " + c.deps.map(r => r.pj).join(", ") + "." : "."), action: onOpenPlanner ? { label: "Ouvrir le planificateur", run: onOpenPlanner } : null })),
    ...(hasInitial && late[0] ? [{ key: "late", tone: "amber", title: late[0].pj + " : +" + driftOf[late[0].pj] + " j", text: "Plus forte dérive du portefeuille" + (late[0].depart ? ", départ le " + fdm(late[0].depart) : "") + ".", action: onOpenPj ? { label: "Ouvrir la fiche", run: () => onOpenPj(late[0].pj) } : null }] : []),
  ];
  const Chip = ({ r }) => { const d = driftOf[r.pj] || 0; return (
    <button type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} aria-label={"Ouvrir la fiche de " + r.pj} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", border: "1px solid " + T.line, borderRadius: 8, background: T.card, padding: "4px 7px", cursor: "pointer", fontFamily: T.font, textAlign: "left", color: T.ink900, minHeight: 36 }}>
      <span style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 4, whiteSpace: "nowrap" }}><b style={{ fontFamily: T.fontMono, fontSize: 13 }}>{r.pj}</b>{d > 0 && <b style={{ color: T.red500, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>+{d} j</b>}</span>
      <span style={{ fontSize: 12, color: T.ink700, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nom(r) || fdm(r.depart)}</span>
    </button>); };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <p style={{ margin: 0, fontSize: FZ.md, color: T.ink700 }}>Charge de l'atelier et départs, semaine par semaine{fromPlan ? " (charge d'après le planificateur)" : " (charge d'après le planning, " + capaWeek + " h / semaine)"}.</p>
      <div style={{ display: "flex", gap: 28, fontVariantNumeric: "tabular-nums" }}>
        <div><div style={lbl}>Départs</div><div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, color: T.ink900 }}>{nDeps}</div></div>
        <div><div style={lbl}>Semaines en surcharge</div><div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, color: overW.length ? T.red500 : T.emerald600 }}>{overW.length}</div></div>
        {hasInitial && <div><div style={lbl}>En retard sur l'initial</div><div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, color: late.length ? T.red500 : T.emerald600 }}>{late.length}</div></div>}
      </div>
    </div>
    <section aria-label={"Les " + N + " prochaines semaines"} style={{ ...card(), overflowX: "auto" }}>
      <div style={grid}>
        <span style={{ borderBottom: "1px solid " + T.line }} />
        {cols.map(c => <div key={c.key} style={{ ...cell(c), borderBottom: "1px solid " + T.line, padding: "10px 8px" }}><b style={{ fontSize: FZ.md, color: T.ink900 }}>S{isoWeek(c.a)}</b><div style={{ fontSize: 12, color: T.ink500, whiteSpace: "nowrap" }}>{weekLabel(c.a).split(" · ")[1]}{c.now ? " · cette semaine" : ""}</div></div>)}

        <div style={{ ...rowHead, borderBottom: "1px solid " + T.line }}><b style={{ fontSize: FZ.sm, color: T.ink900 }}>Charge atelier</b><span style={{ fontSize: 12, color: T.ink500 }}>trait = capacité</span></div>
        {cols.map(c => { const h = Math.round(c.hours / maxH * H), k = Math.round(c.cap / maxH * H); return (
          <div key={c.key} role="img" aria-label={"S" + isoWeek(c.a) + " : " + c.hours + " heures sur " + Math.round(c.cap)} style={{ ...cell(c), borderBottom: "1px solid " + T.line, height: H + 34, position: "relative", padding: "6px 10px" }}>
            <div style={{ position: "absolute", left: 10, right: 10, bottom: 6, height: Math.max(1, h), background: c.over ? T.red500 : T.teal500 }} />
            <div aria-hidden="true" style={{ position: "absolute", left: 4, right: 4, bottom: 6 + k, borderTop: "2px dashed " + T.ink700 }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 6 + Math.max(h, k) + 4, textAlign: "center", fontSize: 13, fontWeight: 500, color: c.over ? T.red500 : T.ink700, fontVariantNumeric: "tabular-nums" }}>{c.hours} h</div>
          </div>); })}

        <div style={{ ...rowHead, borderBottom: "1px solid " + T.line }}><b style={{ fontSize: FZ.sm, color: T.ink900 }}>Départs</b><span style={{ fontSize: 12, color: T.ink500 }}>{hasInitial ? "dérive vs initial" : "date de départ"}</span></div>
        {cols.map(c => <div key={c.key} style={{ ...cell(c), borderBottom: "1px solid " + T.line, display: "flex", flexDirection: "column", gap: 6 }}>{c.deps.length ? c.deps.map(r => <Chip key={r.pj} r={r} />) : <span style={{ fontSize: 13, color: T.ink300 }}>—</span>}</div>)}

        <div style={rowHead}><b style={{ fontSize: FZ.sm, color: T.ink900 }}>Au banc</b><span style={{ fontSize: 12, color: T.ink500 }}>période de tests</span></div>
        {cols.map(c => <div key={c.key} style={{ ...cell(c), display: "flex", flexWrap: "wrap", gap: 4, alignContent: "flex-start" }}>{c.bench.length ? c.bench.map(r => <button key={r.pj} type="button" onClick={() => onOpenPj && onOpenPj(r.pj)} title={nom(r)} style={{ border: "1px solid " + T.line, background: T.panel, color: T.ink900, borderRadius: 999, padding: "1px 8px", fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, cursor: "pointer", minHeight: 24 }}>{r.pj}</button>) : <span style={{ fontSize: 13, color: T.ink300 }}>—</span>}</div>)}
      </div>
    </section>
    <section aria-label="À décider" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 12 }}>
      {decide.length === 0 ? <div style={{ ...card(), padding: "12px 16px", fontSize: FZ.sm, color: T.ink700 }}>Rien à arbitrer sur les {N} prochaines semaines : aucune semaine en surcharge.</div>
        : decide.map(d => <div key={d.key} style={{ ...card(), borderTop: "4px solid " + (d.tone === "red" ? T.red500 : T.amber500), padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <b style={{ fontSize: FZ.md, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{d.title}</b>
          <span style={{ fontSize: FZ.sm, color: T.ink700 }}>{d.text}</span>
          {d.action && <button type="button" onClick={d.action.run} style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: T.teal600, fontWeight: 600, fontSize: FZ.sm, padding: 0, cursor: "pointer", fontFamily: T.font, minHeight: 28 }}>{d.action.label}</button>}
        </div>)}
    </section>
  </div>);
}
