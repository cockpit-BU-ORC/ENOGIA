// Écran atelier : diaporama plein écran pour un téléviseur — cette semaine, les 4 prochaines semaines, arrivées / tests / départs (arrivées / tests / départs), chiffres clés. Une page toutes les 15 s.
// Se met à jour tout seul avec les données du site ; Échap pour quitter, ←/→ pour changer de page, Espace pour mettre en pause.
// Ouverture directe possible avec l'adresse …/?ecran=1 (après connexion).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, stagePalette } from "../theme";
import { getPjMeta, CountryFlag, GAMME_COLORS } from "../pjMeta";
import { getDayStatus, getWeekStatus, stageFill } from "./CalendarView";
import { isEstimatePj } from "../changeDiff";
import { toLocalISO } from "../parsers";

const SLIDE_MS = 15000;
const DAY = 864e5;
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmtD = d => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
const fmtDow = d => d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
const u = n => "calc(" + n + "px * var(--u))";

const isoWeek = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); // pas de calcul en ms : le passage à l'heure d'hiver décalerait les jours
const mondayOf = d => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); };

// États où la machine est réellement en fabrication à l'atelier (le reste : pas commandée, en attente, stockée, expédiée…)
const PROD_ETATS = new Set(["MONTAGE", "ELEC", "TESTS", "PACKAGING"]);
export const isInProduction = r => !!r && PROD_ETATS.has(r.etat);

// Jours fermés (périodes de fermeture du Manager) → liste de dates ISO, pour que l'écran suive le calendrier de production
export function closedDaysOf(closurePeriods) {
  const out = [];
  (closurePeriods || []).forEach(p => {
    if (!p || !p.start || !p.end) return;
    const s = startOfDay(p.start), e = startOfDay(p.end);
    for (let d = s, i = 0; d <= e && i < 400; d = addDays(d, 1), i++) out.push(toLocalISO(d));
  });
  return out;
}

// v350 (audit de performance) : défini hors du composant (sinon recréé et remonté à chaque rendu)
const Row = ({ children, style }) => <div style={{ display: "flex", alignItems: "center", gap: u(18), padding: u(10) + " " + u(18), borderRadius: u(12), background: T.card, border: "1px solid " + T.line, ...style }}>{children}</div>;
// v350 (audit de performance) : défini hors du composant (sinon recréé et remonté à chaque rendu)
const Col = ({ title, items }) => <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: u(14) }}>
      <div style={{ fontSize: u(30), fontWeight: 600, color: T.ink900 }}>{title}</div>
      {items.map(g => { const tot = g.list.length, pct = tot ? Math.round(g.done / tot * 100) : 0;
        return <div key={g.k} style={{ background: T.card, border: "1px solid " + T.line, borderRadius: u(12), padding: u(14) + " " + u(20), display: "flex", flexDirection: "column", gap: u(8) }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: u(14) }}><span style={{ fontSize: u(24), color: T.ink700, fontWeight: 600, flex: 1 }}>{g.lab}</span>
            <span style={{ fontSize: u(44), fontWeight: 600, fontVariantNumeric: "tabular-nums", color: tot && g.done === tot ? T.emerald600 : T.ink900, lineHeight: 1 }}>{tot ? g.done + " / " + tot : "—"}</span></div>
          <div style={{ height: u(12), borderRadius: 999, background: T.surfaceAlt, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: T.emerald500 }} /></div>
          <div style={{ display: "flex", gap: u(8), flexWrap: "wrap", minHeight: u(30) }}>{tot === 0 ? <span style={{ fontSize: u(20), color: T.ink500 }}>Rien de prévu</span>
            : g.list.slice(0, 8).map(x => <span key={x.r.pj} style={{ fontSize: u(20), fontWeight: 600, borderRadius: u(8), padding: u(2) + " " + u(10), background: x.ok ? T.emerald100 : T.surfaceAlt, color: x.ok ? T.emerald600 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{x.ok ? "✓ " : ""}{x.r.pj}</span>)}
            {g.list.length > 8 && <span style={{ fontSize: u(20), color: T.ink500 }}>+ {g.list.length - 8}</span>}</div>
        </div>; })}
    </div>;
// v350 (audit de performance) : défini hors du composant (sinon recréé et remonté à chaque rendu)
const Kpi = ({ v, l }) => <div style={{ flex: 1, minWidth: 0, background: T.card, border: "1px solid " + T.line, borderRadius: u(18), padding: u(14) + " " + u(18), textAlign: "center" }}>
      <div style={{ fontSize: u(70), fontWeight: 600, lineHeight: 1, color: T.teal600, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      <div style={{ fontSize: u(22), color: T.ink500, marginTop: u(6), fontWeight: 600 }}>{l}</div></div>;
// v350 (audit de performance) : défini hors du composant (sinon recréé et remonté à chaque rendu)
const Head = ({ t }) => <div style={{ fontSize: u(26), fontWeight: 600, color: T.ink900, letterSpacing: ".01em" }}>{t}</div>;
export function WorkshopScreen({ data, onClose, darkMode, productionExclusions, closurePeriods }) {
  const [now, setNow] = useState(() => new Date());
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [scale, setScale] = useState(() => Math.max(.7, Math.min(2, window.innerWidth / 1920)));
  const rootRef = useRef(null);
  // v339 (« l'écran atelier ne marche plus ») : onClose change à chaque rendu d'App ; l'effet du plein écran se relançait alors, sortait du
  // plein écran… et la sortie fermait l'écran aussitôt. On garde la dernière fonction dans une référence : le plein écran n'est demandé qu'une fois.
  const closeRef = useRef(onClose); closeRef.current = onClose;

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { const f = () => setScale(Math.max(.7, Math.min(2, window.innerWidth / 1920))); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  // Plein écran (si le navigateur l'autorise) ; en sortir avec Échap ferme aussi l'écran atelier.
  useEffect(() => {
    const el = document.documentElement;
    try { if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {}); } catch (e) { /* refusé : on reste en plein cadre */ }
    const out = () => { if (!document.fullscreenElement) closeRef.current(); };
    document.addEventListener("fullscreenchange", out);
    return () => { document.removeEventListener("fullscreenchange", out); try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) { /* déjà quitté */ } };
  }, []);

  const today = startOfDay(now);
  const live = useMemo(() => (data || []).filter(r => r && r.etat !== "SLOT_LIBRE"), [data]);
  const closed = useMemo(() => closedDaysOf(closurePeriods), [closurePeriods]);

  // Jour « non prod » choisi dans le Manager (ou fermeture) : rien n'est marqué ce jour-là pour la machine
  const offDay = (pj, d) => { const iso = toLocalISO(d); return closed.includes(iso) || !!(productionExclusions && productionExclusions[pj] && productionExclusions[pj].includes(iso)); };
  const slides = useMemo(() => {
    const out = [];
    const monday = mondayOf(today);
    const byDepart = (a, b) => String(a.r.depart || "9").localeCompare(String(b.r.depart || "9"));
    // 0 · v339 (demandé : « rajouter une slide objectifs de la semaine et du mois ») : jalons du planning publié dans la semaine et le mois
    // (départs, fins de production, débuts et fins de tests) avec ce qui est déjà fait d'après l'état de la machine.
    const realG = live.filter(r => !isEstimatePj(r.pj));
    const AFTER = { depart: ["SHIPPED"], finProd: ["TESTS", "PACKAGING", "SHIPPED"], tests: ["TESTS", "PACKAGING", "SHIPPED"], testsFin: ["PACKAGING", "SHIPPED"] };
    const goals = (from, to) => [["depart", "Départs"], ["finProd", "Fins de production"], ["tests", "Débuts de tests"], ["testsFin", "Fins de tests"]].map(([k, lab]) => {
      const list = realG.filter(r => { if (!r[k]) return false; const d = startOfDay(r[k]); return d >= from && d < to; }).map(r => ({ r, ok: AFTER[k].includes(r.etat) })).sort((a, b) => (a.ok - b.ok) || String(a.r[k]).localeCompare(String(b.r[k])));
      return { k, lab, list, done: list.filter(x => x.ok).length };
    });
    const m0 = new Date(today.getFullYear(), today.getMonth(), 1), m1 = new Date(today.getFullYear(), today.getMonth() + 1, 1), monthName = m0.toLocaleDateString("fr-FR", { month: "long" });
    out.push({ id: "goals", title: "Objectifs de la semaine et du mois", sub: "S" + isoWeek(monday) + " · du " + fmtD(monday) + " au " + fmtD(addDays(monday, 4)) + " · et " + monthName + " " + m0.getFullYear(), week: goals(monday, addDays(monday, 7)), month: goals(m0, m1), wkLabel: "Cette semaine · S" + isoWeek(monday), moLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1) });
    // 1 · Cette semaine (jours)
    const days = [0, 1, 2, 3, 4].map(i => addDays(monday, i));
    const wk = live.map(r => ({ r, cells: days.map(d => (offDay(r.pj, d) ? null : getDayStatus(r, d, []))) })).filter(x => x.cells.some(Boolean)).sort(byDepart);
    out.push({ id: "week", title: "Cette semaine", sub: "Semaine du " + fmtD(days[0]) + " au " + fmtD(days[4]), days, rows: wk });
    // 2 · Les 4 prochaines semaines, à partir de la semaine actuelle : TOUTES les lignes sur une seule page (même forme que la semaine)
    const weeks = [0, 1, 2, 3].map(i => addDays(monday, 7 * i));
    const mo = live.map(r => ({ r, cells: weeks.map(w => getWeekStatus(r, w, addDays(w, 7))) })).filter(x => x.cells.some(Boolean)).sort(byDepart);
    out.push({ id: "month", kind: "month", title: "Les 4 prochaines semaines", sub: "S" + isoWeek(weeks[0]) + " → S" + isoWeek(weeks[3]) + " · du " + fmtD(weeks[0]) + " au " + fmtD(addDays(weeks[3], 4)) + " · " + mo.length + " machine" + (mo.length > 1 ? "s" : ""), weeks, monday, rows: mo });
    // 3 · Arrivées, tests et départs : sous forme de calendrier (4 semaines × 7 jours)
    const key = d => d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    const byDay = {};
    live.filter(r => !isEstimatePj(r.pj)).forEach(r => {
      [["Arrivée", r.arrivee], ["Tests", r.tests], ["Départ", r.depart]].forEach(([k, v]) => { if (!v) return; const d = startOfDay(v); if (offDay(r.pj, d)) return; (byDay[key(d)] = byDay[key(d)] || []).push({ k, r }); });
    });
    const order = { "Arrivée": 0, "Tests": 1, "Départ": 2 };
    const calWeeks = weeks.map(w => ({ start: w, days: [0, 1, 2, 3, 4, 5, 6].map(i => { const d = addDays(w, i); return { d, ev: (byDay[key(d)] || []).sort((x, y) => order[x.k] - order[y.k] || x.r.pj.localeCompare(y.r.pj)) }; }) }));
    out.push({ id: "next", title: "Arrivées, tests et départs", sub: "Calendrier des 4 semaines à partir de la semaine actuelle", calWeeks });
    // 4 · Chiffres clés : depuis le 19/05, puis ce qu'il y a à fabriquer le mois prochain
    const since = new Date(today.getFullYear(), 4, 19);
    const real = live.filter(r => !isEstimatePj(r.pj));
    const made = real.filter(r => r.etat === "SHIPPED" && r.depart && startOfDay(r.depart) >= since && startOfDay(r.depart) <= today);
    const count = (list, f) => { const m = {}; list.forEach(r => { const k = f(r); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
    const paysOf = r => getPjMeta(r.pj, r).pays;
    const gammes = count(made, r => r.gamme), pays = count(made, paysOf);
    const months = []; for (let d = new Date(since.getFullYear(), since.getMonth(), 1); d <= today; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push({ y: d.getFullYear(), m: d.getMonth(), n: 0, g: {} });
    made.forEach(r => { const d = new Date(r.depart); const b = months.find(x => x.y === d.getFullYear() && x.m === d.getMonth()); if (b) { b.n++; const g = r.gamme || "?"; b.g[g] = (b.g[g] || 0) + 1; } });
    const ms = new Date(today.getFullYear(), today.getMonth() + 1, 1), me = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    const inM = v => { if (!v) return false; const d = startOfDay(v); return d >= ms && d < me; };
    // « À fabriquer » : machines en production (Montage, Élec, Tests, Packaging) dont la période de fabrication (arrivée → fin de prod, sinon départ) touche le mois prochain
    const toBuild = real.filter(r => { if (!isInProduction(r)) return false; const s0 = r.arrivee || r.tests || r.finProd || r.depart, e0 = r.finProd || r.depart || r.tests || r.arrivee; if (!s0 || !e0) return false; return startOfDay(s0) < me && startOfDay(e0) >= ms; });
    const dep = real.filter(r => r.etat !== "SHIPPED" && inM(r.depart));
    const nextMonth = ms.toLocaleDateString("fr-FR", { month: "long" });
    out.push({ id: "stats", title: "Les chiffres clés", sub: "Depuis le " + fmtD(since) + "/" + since.getFullYear() + " · et le mois prochain (" + nextMonth + ")", made: made.length, gammes, pays, months, nextMonth, toBuild: toBuild.length, toBuildG: count(toBuild, r => r.gamme), arrivals: real.filter(r => inM(r.arrivee)).length, departs: dep.length, departsP: count(dep, paysOf) });
    return out;
  }, [live, today.getTime(), productionExclusions, closed]); // eslint-disable-line

  const n = slides.length, cur = slides[idx % n];
  useEffect(() => { if (paused) return; const t = setTimeout(() => setIdx(i => (i + 1) % n), SLIDE_MS); return () => clearTimeout(t); }, [idx, paused, n]);
  useEffect(() => {
    const k = e => {
      if (e.key === "Escape") closeRef.current();
      else if (e.key === "ArrowRight") setIdx(i => (i + 1) % n);
      else if (e.key === "ArrowLeft") setIdx(i => (i - 1 + n) % n);
      else if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [n]);

  const name = r => getPjMeta(r.pj, r).nomProjet || "";
  // Gamme de la machine, en grand (demandé) : pastille pleine à la couleur de la gamme, jamais tronquée.
  const Gamme = ({ r, size = 26 }) => r.gamme ? <span style={{ background: GAMME_COLORS[r.gamme] || T.ink500, color: T.onFill, borderRadius: u(12), padding: u(2) + " " + u(12), fontSize: u(size), fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: ".01em" }}>{r.gamme}</span> : null;
  // f = facteur de réduction quand il y a beaucoup de lignes (toutes tiennent sur la page)
  const PjCell = ({ r, f = 1 }) => <Row style={{ minWidth: 0, padding: u(6 * f) + " " + u(18), height: "100%", boxSizing: "border-box" }}><b style={{ fontSize: u(28 * f), fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{r.pj}</b><Gamme r={r} size={26 * f} /><span style={{ fontSize: u(22 * f), color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{name(r)}</span></Row>;
  // Plusieurs étapes dans la même case : coupée en diagonale, une bande par étape
  const tile = (c, i, f = 1) => c
    ? (() => { const fl = stageFill(c); return <div key={i} style={{ background: fl.background, color: fl.color, borderRadius: u(12), display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: u((c.includes("+") ? 20 : 22) * f), fontWeight: 600, padding: u(4 * f), overflow: "hidden", overflowWrap: "anywhere", minWidth: 0 }}>{c.replace(/ \+ /g, " · ")}</div>; })()
    : <div key={i} style={{ borderRadius: u(12), border: "1px dashed " + T.line }} />;

  // Légende des couleurs (en bas de page) : une pastille par étape ; une case coupée en diagonale = plusieurs étapes la même semaine.
  const Legend = () => { const SPL = stagePalette(); return (<div style={{ display: "flex", gap: u(26), alignItems: "center", flexWrap: "wrap", fontSize: u(20), color: T.ink500, flexShrink: 0, paddingTop: u(4) }}>
    {Object.entries(SPL).map(([k, pal]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: u(8) }}><span style={{ background: pal.c, color: pal.t, border: "1px solid " + T.line, borderRadius: u(8), width: u(30), height: u(20), display: "inline-block" }} />{k}</span>)}
    <span style={{ display: "inline-flex", alignItems: "center", gap: u(8) }}><span style={{ background: stageFill("Arrivée + Départ").background, borderRadius: u(8), width: u(30), height: u(20), display: "inline-block", border: "1px solid " + T.line }} />Plusieurs étapes dans la semaine</span>
  </div>); };

  let body = null;
  if (cur.id === "goals") {
    body = (<div style={{ display: "flex", gap: u(28), height: "100%" }}><Col title={cur.wkLabel} items={cur.week} /><div style={{ width: 1, background: T.line, flexShrink: 0 }} /><Col title={cur.moLabel} items={cur.month} /></div>);
  } else if (cur.id === "week") {
    const rows = cur.rows, n = Math.max(1, rows.length), f = Math.min(1, Math.max(.42, 9.5 / n)), COLS = "minmax(0,2.4fr) repeat(5,minmax(0,1fr))";
    body = (<div style={{ display: "flex", flexDirection: "column", gap: u(8), height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: u(8), padding: "0 " + u(18), flexShrink: 0 }}>
        <span />{cur.days.map((d, i) => { const isT = d.getTime() === today.getTime(); return <div key={i} style={{ textAlign: "center", fontSize: u(22), fontWeight: 600, color: isT ? T.red600 : T.ink500, letterSpacing: ".01em" }}>{fmtDow(d)} {fmtD(d)}</div>; })}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "repeat(" + n + ",minmax(0," + u(n <= 8 ? 100 : 80) + "))", gap: u(6 * Math.max(.5, f)), alignContent: "start" }}>
        {rows.map(({ r, cells }) => (<div key={r.pj} style={{ display: "grid", gridTemplateColumns: COLS, gap: u(8), minHeight: 0 }}><PjCell r={r} f={f} />{cells.map((c, i) => tile(c, i, f))}</div>))}
      </div>
      {!rows.length && <Empty text="Rien de planifié cette semaine." />}
      <Legend />
    </div>);
  } else if (cur.kind === "month") {
    const n = Math.max(1, cur.rows.length), f = Math.min(1, Math.max(.42, 9.5 / n));
    const COLS = "minmax(0,2.4fr) repeat(" + cur.weeks.length + ",minmax(0,1fr))";
    body = (<div style={{ display: "flex", flexDirection: "column", gap: u(8), height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: u(8), padding: "0 " + u(18), flexShrink: 0 }}>
        <span />{cur.weeks.map((w, i) => { const isT = w.getTime() === cur.monday.getTime(); return <div key={i} style={{ textAlign: "center", fontSize: u(22), fontWeight: 600, color: isT ? T.red600 : T.ink500, letterSpacing: ".01em", lineHeight: 1.15 }}>S{isoWeek(w)}<div style={{ fontSize: u(18), fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>{fmtD(w)}</div></div>; })}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "repeat(" + n + ",minmax(0," + u(n <= 8 ? 100 : 80) + "))", gap: u(6 * Math.max(.5, f)), alignContent: "start" }}>
        {cur.rows.map(({ r, cells }) => (<div key={r.pj} style={{ display: "grid", gridTemplateColumns: COLS, gap: u(8), minHeight: 0 }}><PjCell r={r} f={f} />{cells.map((c, i) => tile(c, i, f))}</div>))}
      </div>
      {!cur.rows.length && <Empty text="Rien de planifié sur les 4 prochaines semaines." />}
      <Legend />
    </div>);
  } else if (cur.id === "next") {
    const SP2 = stagePalette(), KIND = { "Arrivée": ["A", SP2["Arrivée"]], "Tests": ["T", SP2["Tests"]], "Départ": ["D", SP2["Départ"]] };
    const DCOLS = "minmax(0,.9fr) repeat(5,minmax(0,1fr)) repeat(2,minmax(0,.8fr))";
    // v146.15 : tous les éléments sont affichés ; les lignes de semaine prennent la hauteur de leur jour le plus chargé et le texte passe à la ligne
    const wMax = cur.calWeeks.map(w => Math.max(1, ...w.days.map(x => x.ev.length))), tot = wMax.reduce((a, b) => a + b, 0), cf = Math.min(1, Math.max(.62, 7 / Math.max(1, tot / Math.max(1, cur.calWeeks.length) * 1.6)));
    body = (<div style={{ display: "flex", flexDirection: "column", gap: u(8), height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: DCOLS, gap: u(8), flexShrink: 0 }}>
        <span />{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(x => <div key={x} style={{ textAlign: "center", fontSize: u(22), fontWeight: 600, color: T.ink500, letterSpacing: ".01em" }}>{x}</div>)}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: wMax.map(m => "minmax(0," + (m + 1.1) + "fr)").join(" "), gap: u(8) }}>
        {cur.calWeeks.map((w, wi) => (<div key={wi} style={{ display: "grid", gridTemplateColumns: DCOLS, gap: u(8), minHeight: 0 }}>
          <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: u(12), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
            <b style={{ fontSize: u(30), color: wi === 0 ? T.red600 : T.ink900 }}>S{isoWeek(w.start)}</b>
            <span style={{ fontSize: u(18), color: T.ink500 }}>{fmtD(w.start)}</span>
          </div>
          {w.days.map(({ d, ev }, di) => { const isT = d.getTime() === today.getTime(), we = di >= 5;
            return (<div key={di} style={{ background: we ? T.surfaceAlt : T.card, border: "1px solid " + (isT ? T.red500 : T.line), boxShadow: isT ? "inset 0 0 0 " + u(2) + " " + T.red500 : "none", borderRadius: u(12), padding: u(6) + " " + u(8), display: "flex", flexDirection: "column", gap: u(4), minWidth: 0, minHeight: 0, overflow: "hidden" }}>
              <div style={{ fontSize: u(18), fontWeight: 600, color: isT ? T.red600 : T.ink500 }}>{d.getDate()}{d.getDate() === 1 || (wi === 0 && di === 0) ? " " + d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") : ""}</div>
              {ev.map((e, j) => { const pal = KIND[e.k][1]; return (<div key={j} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: u(6), rowGap: 0, background: pal.c, color: pal.t, borderRadius: u(8), padding: u(2) + " " + u(7), fontSize: u(19 * cf), lineHeight: 1.18, fontWeight: 600, minWidth: 0, overflowWrap: "anywhere" }}>
                <span style={{ fontWeight: 600 }}>{e.k}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{e.r.pj}</span><span style={{ opacity: .85, fontWeight: 600 }}>{e.r.gamme}</span>
              </div>); })}
            </div>); })}
        </div>))}
      </div>
      <div style={{ display: "flex", gap: u(28), alignItems: "center", fontSize: u(20), color: T.ink500, flexShrink: 0 }}>
        {Object.entries(KIND).map(([k, [, pal]]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: u(8) }}><span style={{ background: pal.c, border: "1px solid " + T.line, borderRadius: u(8), width: u(30), height: u(20), display: "inline-block" }} />{k}</span>)}
      </div>
    </div>);
  } else if (cur.id === "stats") {
    const gc = k => GAMME_COLORS[k] || T.teal500;
    const Bars = ({ title, items, flag, byGamme }) => { const max = Math.max(1, ...items.map(x => x[1])); return (<div style={{ flex: 1, minWidth: 0, minHeight: 0, background: T.card, border: "1px solid " + T.line, borderRadius: u(18), padding: u(14) + " " + u(18), display: "flex", flexDirection: "column", gap: u(12), overflow: "hidden" }}>
      <div style={{ fontSize: u(22), fontWeight: 600, letterSpacing: ".01em", color: T.ink500 }}>{title}</div>
      {items.slice(0, 6).map(([k, v]) => (<div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(0," + u(190) + ") 1fr " + u(40), alignItems: "center", gap: u(12) }}>
        <span style={{ fontSize: u(25), fontWeight: 600, display: "flex", alignItems: "center", gap: u(8), minWidth: 0 }}>{flag && <CountryFlag pays={k} size={Math.round(22 * scale)} />}<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k}</span></span>
        <span style={{ height: u(24), background: T.surfaceAlt, borderRadius: 999, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: Math.max(6, v / max * 100) + "%", background: byGamme ? gc(k) : T.teal500, borderRadius: 999 }} /></span>
        <b style={{ fontSize: u(27), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v}</b>
      </div>))}
      {!items.length && <span style={{ color: T.ink300, fontSize: u(22) }}>—</span>}
    </div>); };
    const maxM = Math.max(1, ...cur.months.map(m => m.n));
    body = (<div style={{ display: "flex", gap: u(26), height: "100%" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: u(14) }}>
        <Head t={"Depuis le " + fmtD(new Date(today.getFullYear(), 4, 19)) + " · fabriqué et expédié"} />
        <div style={{ display: "flex", gap: u(14) }}>
          <Kpi v={cur.made} l={cur.made > 1 ? "machines expédiées" : "machine expédiée"} />
          <Kpi v={cur.gammes.length} l={cur.gammes.length > 1 ? "types de machines" : "type de machine"} />
          <Kpi v={cur.pays.length} l={cur.pays.length > 1 ? "pays livrés" : "pays livré"} />
        </div>
        <div style={{ display: "flex", gap: u(14), flex: 1, minHeight: 0 }}>
          <Bars title="Par type de machine" items={cur.gammes} byGamme />
          <div style={{ flex: 1, minWidth: 0, background: T.card, border: "1px solid " + T.line, borderRadius: u(18), padding: u(14) + " " + u(18), display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: u(22), fontWeight: 600, letterSpacing: ".01em", color: T.ink500 }}>Expéditions par mois</div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: u(10), paddingTop: u(8) }}>
              {cur.months.map(m => (<div key={m.y + "-" + m.m} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: u(6) }}>
                <b style={{ fontSize: u(22), fontVariantNumeric: "tabular-nums" }}>{m.n}</b>
                <div style={{ width: "62%", height: Math.max(m.n ? 4 : 2, m.n / maxM * 66) + "%", background: m.n ? "transparent" : T.line, borderRadius: u(8) + " " + u(8) + " 0 0", overflow: "hidden", display: "flex", flexDirection: "column-reverse" }}>{Object.entries(m.g || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([g, c]) => <div key={g} title={g} style={{ flex: c, background: gc(g), minHeight: 2 }} />)}</div>
                <span style={{ fontSize: u(19), color: T.ink500, fontWeight: 600 }}>{new Date(m.y, m.m, 1).toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</span>
              </div>))}
            </div>
            <div style={{ display: "flex", gap: u(16), flexWrap: "wrap", fontSize: u(19), color: T.ink500, paddingTop: u(6) }}>{cur.gammes.map(([g]) => <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: u(6) }}><span style={{ width: u(14), height: u(14), borderRadius: 4, background: gc(g) }} />{g}</span>)}</div>
          </div>
        </div>
      </div>
      <div style={{ width: 1, background: T.line, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: u(14) }}>
        <Head t={"Le mois prochain · " + cur.nextMonth} />
        <div style={{ display: "flex", gap: u(14) }}>
          <Kpi v={cur.toBuild} l={cur.toBuild > 1 ? "machines à fabriquer" : "machine à fabriquer"} />
          <Kpi v={cur.arrivals} l={cur.arrivals > 1 ? "arrivées prévues" : "arrivée prévue"} />
          <Kpi v={cur.departs} l={cur.departs > 1 ? "départs prévus" : "départ prévu"} />
        </div>
        <div style={{ display: "flex", gap: u(14), flex: 1, minHeight: 0 }}>
          <Bars title="À fabriquer par type" items={cur.toBuildG} byGamme />
          <Bars title="Départs par pays" items={cur.departsP} flag />
        </div>
      </div>
    </div>);
  }

  const logo = (darkMode ? "/enogia-logo-white.svg" : "/enogia-logo-color-crop.svg");
  return (<div ref={rootRef} role="dialog" aria-modal="true" aria-label="Écran atelier" style={{ "--u": scale, position: "fixed", inset: 0, zIndex: 20000, background: T.surface, color: T.ink900, fontFamily: T.font, display: "flex", flexDirection: "column", padding: u(36) + " " + u(56), boxSizing: "border-box", cursor: "none" }}
    onMouseMove={e => { e.currentTarget.style.cursor = "default"; clearTimeout(rootRef.current && rootRef.current._c); if (rootRef.current) rootRef.current._c = setTimeout(() => { if (rootRef.current) rootRef.current.style.cursor = "none"; }, 2500); }}>
    <div style={{ display: "flex", alignItems: "center", gap: u(28), marginBottom: u(22) }}>
      <img src={(process.env.PUBLIC_URL || "") + logo} alt="ENOGIA" style={{ height: u(64), width: "auto" }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: u(46), fontWeight: 600, letterSpacing: "-.01em", lineHeight: 1.1 }}>{cur.title}</div>
        {cur.sub && <div style={{ fontSize: u(24), color: T.ink500, marginTop: u(4) }}>{cur.sub}</div>}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: u(54), fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
        <div style={{ fontSize: u(22), color: T.ink500 }}>{(d => d.charAt(0).toUpperCase() + d.slice(1))(now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</div>
      </div>
    </div>
    <div key={cur.id} className="enogia-fade-in" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{body}</div>
    <div style={{ display: "flex", alignItems: "center", gap: u(14), marginTop: u(18) }}>
      {slides.map((s, i) => <span key={s.id} aria-hidden="true" style={{ width: i === idx % n ? u(46) : u(14), height: u(14), borderRadius: 999, background: i === idx % n ? T.accent : T.line, transition: "width var(--e-dur-in)" }}/>)}
      <span style={{ flex: 1 }}/>
      <span style={{ fontSize: u(18), color: T.ink500 }}>{paused ? "⏸ En pause · " : ""}Échap : quitter · ← → : changer de page · Espace : pause</span>
    </div>
  </div>);
}

function Empty({ text }) {
  return <div style={{ padding: "6vh 0", textAlign: "center", fontSize: u(34), color: T.ink500, fontWeight: 600 }}>{text}</div>;
}
