// v267 (demandé : « un seul onglet Turbines, avec la production turbines et la gestion des turbines pour les ORC ; les informations des
// turbines, des roues et des injecteurs ne sont vraies que dans la production turbines ») : page « Turbines » à deux sous-pages.
//  · Production : la page de Jérémie (ProdTurbines, échangée par le kit) — seul endroit où l'on saisit turbines, arbres, roues, injecteurs ;
//    la turbine est attribuée à un ORC par son champ « Affaire / client », proposé parmi les PJ du planning.
//  · Besoins des ORC : rien à saisir — pour chaque PJ en cours, les turbines nécessaires d'après sa gamme, celles qui lui sont attribuées
//    dans la production, leur date de fin prévue (calcul de la production) et ce qui coince ; stocks de roues et d'injecteurs.
// Plus : « Importer des données (JSON) » (propriétaire et liste d’accès de la production, v268) pour reprendre les données de l'outil Claude de Jérémie, avec aperçu avant écriture.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { PageHead } from "./SharedUI";
import { ProdTurbines, makeModel, EMPTY_PROD } from "./ProdTurbines";
import { turbinesNeeded } from "../turbines";
import { getPjMeta } from "../pjMeta";

const COLLS = ["turbines", "arbres", "pieces", "roues", "injecteurs"];
const gammeOf = x => (x && String(x.gamme) === "20" ? "20" : "100");
// Même lecture que la page de production : éléments de la gamme, identifiant repris de la clé, durées du 20 kW dans params.r20
export function prodState(doc, g) {
  const d = doc || {}, dp = d.params || {};
  const o = { ...EMPTY_PROD, ...d, gamme: g, params: g === "20" ? { d: {}, l: {}, ...(dp.r20 || {}) } : { d: {}, l: {}, ...dp } };
  COLLS.forEach(c => { o[c] = Object.fromEntries(Object.entries(d[c] || {}).filter(([, v]) => gammeOf(v) === g).map(([k, v]) => [k, { ...v, id: k }])); });
  return o;
}
// Jours ouvrés (lundi–vendredi), comme la page de production : date de fin = n jours ouvrés après le prochain jour ouvré
const isWork = d => d.getDay() % 6 !== 0;
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export function workDate(n, from = new Date()) { const d = new Date(from); d.setHours(0, 0, 0, 0); while (!isWork(d)) d.setDate(d.getDate() + 1); let k = Math.ceil(n || 0); while (k > 0) { d.setDate(d.getDate() + 1); if (isWork(d)) k--; } return iso(d); }
const fd = s => (s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) + "/" + String(s).slice(2, 4) : "—");
const isoOf = v => { if (!v) return ""; const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const d = new Date(s); return isNaN(d) ? "" : iso(d); };
// PJ du planning désigné par le champ « Affaire » (« PJ479-1 - EDF PEI » → PJ479-1) : le plus long numéro qui commence le texte
export function pjOfAffaire(aff, pjs) {
  const a = String(aff || "").trim().toUpperCase(); if (!a) return null;
  let best = null;
  (pjs || []).forEach(p => { const P = String(p).toUpperCase(); if (a.startsWith(P) && !/[A-Z0-9-]/.test(a.charAt(P.length)) && (!best || P.length > best.length)) best = p; });
  return best;
}

// Turbines attribuées à chaque PJ, avec leur date de fin prévue
export function orcNeeds(doc, rows, today = new Date()) {
  const open = (rows || []).filter(r => r && r.pj && r.etat !== "SHIPPED" && r.etat !== "SLOT_LIBRE");
  const ids = (rows || []).map(r => r.pj);
  const byPj = {}, free = [];
  ["100", "20"].forEach(g => {
    const S = prodState(doc, g), M = makeModel(S);
    Object.values(S.turbines).filter(t => !t.livree).forEach(t => {
      const sc = M.sch[t.id] || {}, ready = t.step === "ok", end = ready ? iso(today) : sc.end != null ? workDate(sc.end, today) : null;
      const x = { id: t.id, num: t.num || "", gamme: g, step: M.lbl(t.step), ready, end, missing: !!sc.missing, noRoue: !!sc.noRoue && !t.roue, roue: t.roue || "", affaire: t.affaire || "" };
      const pj = pjOfAffaire(t.affaire, ids);
      if (pj) (byPj[pj] = byPj[pj] || []).push(x); else free.push(x);
    });
  });
  const lines = open.map(r => {
    const need = turbinesNeeded(r.gamme), g = need ? (need.type === "20LT" ? "20" : "100") : null, got = byPj[r.pj] || [], arr = isoOf(r.arrivee);
    const issues = [];
    if (need && got.length < need.n) issues.push({ bad: true, t: (need.n - got.length) + " turbine" + (need.n - got.length > 1 ? "s" : "") + " à attribuer" });
    got.forEach(x => {
      if (g && x.gamme !== g) issues.push({ bad: true, t: (x.num || "Turbine") + " : " + x.gamme + " kW au lieu de " + g + " kW" });
      if (x.missing) issues.push({ bad: true, t: (x.num || "Turbine") + " : pas d'arbre prévu" });
      else if (!x.ready && x.end && arr && x.end > arr) issues.push({ bad: true, t: (x.num || "Turbine") + " prête le " + fd(x.end) + ", après l'arrivée du " + fd(arr) });
      if (x.noRoue) issues.push({ bad: false, t: (x.num || "Turbine") + " : roue à attribuer" });
    });
    return { r, nom: getPjMeta(r.pj, r).nomProjet || "", need, g, got, arr, issues };
  }).filter(l => l.need || l.got.length).sort((a, b) => String(a.arr || "9").localeCompare(String(b.arr || "9")));
  return { lines, free };
}

function NeedsView({ doc, rows }) {
  const { lines, free } = useMemo(() => orcNeeds(doc, rows), [doc, rows]);
  const stocks = useMemo(() => ["100", "20"].map(g => { const S = prodState(doc, g); return { g, roues: Object.values(S.roues).filter(x => (Number(x.qte) || 0) > 0), inj: Object.values(S.injecteurs).filter(x => (Number(x.qte) || 0) > 0) }; }), [doc]);
  const bad = lines.filter(l => l.issues.some(i => i.bad)).length;
  const card = { background: T.card, border: "1px solid " + T.line, borderRadius: 10, padding: "12px 14px" };
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 12, fontWeight: 500, color: T.ink500, borderBottom: "1px solid " + T.line, whiteSpace: "nowrap", position: "sticky", top: 0, background: T.card };
  const td = { padding: "6px 10px", borderBottom: "1px solid " + T.line, fontSize: FZ.sm, color: T.ink900, verticalAlign: "top" };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <PageHead title="Besoins des ORC" sub="Calculé depuis la production turbines : rien à saisir ici. Une turbine va à un ORC par son champ « Affaire / client »." />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
      {[["PJ suivis", lines.length, ""], ["PJ avec un problème", bad, bad ? "bad" : ""], ["Turbines non attribuées", free.length, "dans la production, hors livrées"], ["Turbines prêtes non attribuées", free.filter(x => x.ready).length, ""]].map(([l, v, sub]) => (
        <div key={l} style={card}><div style={{ fontSize: 12, color: T.ink500 }}>{l}</div><div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, color: sub === "bad" ? T.red600 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{v}</div>{sub && sub !== "bad" && <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{sub}</div>}</div>))}
    </div>
    <section aria-label="Turbines par ORC" style={{ ...card, padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto", maxHeight: "60vh", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860, fontVariantNumeric: "tabular-nums" }}>
          <thead><tr><th style={th}>PJ</th><th style={th}>Gamme</th><th style={th}>Arrivée</th><th style={th}>Besoin</th><th style={th}>Turbines attribuées (production)</th><th style={th}>À traiter</th></tr></thead>
          <tbody>
            {lines.map(l => <tr key={l.r.pj}>
              <td style={{ ...td, whiteSpace: "nowrap" }}><b style={{ fontFamily: T.fontMono }}>{l.r.pj}</b><div style={{ fontSize: FZ.xs, color: T.ink500 }}>{l.nom}</div></td>
              <td style={{ ...td, color: T.ink700 }}>{l.r.gamme || "—"}</td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{fd(l.arr)}</td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{l.need ? l.need.n + " × " + l.g + " kW" : "—"}</td>
              <td style={td}>{l.got.length ? l.got.map(x => <div key={x.id} style={{ fontSize: FZ.xs, lineHeight: 1.6 }}><b style={{ fontFamily: T.fontMono }}>{x.num || "sans numéro"}</b> · {x.step}{x.ready ? <span style={{ color: T.emerald600, fontWeight: 700 }}> · prête</span> : x.end ? " · fin prévue " + fd(x.end) : ""}{x.roue ? " · roue " + x.roue : ""}</div>) : <span style={{ color: T.ink500 }}>aucune</span>}</td>
              <td style={td}>{l.issues.length ? l.issues.map((i, k) => <div key={k} style={{ fontSize: FZ.xs, fontWeight: 600, color: i.bad ? T.red600 : T.amber600, lineHeight: 1.6 }}>{i.t}</div>) : <span style={{ fontSize: FZ.xs, fontWeight: 600, color: T.emerald600 }}>OK</span>}</td>
            </tr>)}
            {!lines.length && <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: T.ink500, padding: 20 }}>Aucun PJ en cours avec une gamme à turbines.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
      <section aria-label="Turbines non attribuées" style={card}>
        <b style={{ fontSize: FZ.md }}>Turbines non attribuées</b>
        <div style={{ fontSize: FZ.xs, color: T.ink500, marginBottom: 6 }}>Champ « Affaire » vide ou sans PJ du planning.</div>
        {free.length ? free.map(x => <div key={x.id} style={{ fontSize: FZ.xs, lineHeight: 1.7 }}><b style={{ fontFamily: T.fontMono }}>{x.num || "sans numéro"}</b> · {x.gamme} kW · {x.step}{x.ready ? " · prête" : x.end ? " · fin prévue " + fd(x.end) : ""}{x.affaire ? " · « " + x.affaire + " »" : ""}</div>) : <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucune.</div>}
      </section>
      {stocks.map(s => <section key={s.g} aria-label={"Stocks " + s.g + " kW"} style={card}>
        <b style={{ fontSize: FZ.md }}>Stocks {s.g} kW</b>
        <div style={{ fontSize: FZ.xs, color: T.ink700, marginTop: 6, lineHeight: 1.7 }}><span style={{ color: T.ink500 }}>Roues :</span> {s.roues.length ? s.roues.map(x => x.ref + " × " + x.qte).join(" · ") : "aucune"}<br /><span style={{ color: T.ink500 }}>Injecteurs :</span> {s.inj.length ? s.inj.map(x => x.ref + " × " + x.qte).join(" · ") : "aucun"}</div>
      </section>)}
    </div>
  </div>);
}

// ── Reprise des données de l'outil Claude de Jérémie (fichier JSON exporté) ──
// Formes acceptées : { turbines, arbres, pieces, roues, injecteurs, params } (objets par identifiant ou listes), éventuellement enveloppées
// dans une clé (« turbines-planning »…) ou en texte JSON. Rien n'est écrit avant « Importer » ; un élément dont l'identifiant ou le numéro
// (turbines, arbres) / la référence (roues, injecteurs) existe déjà n'est pas repris.
const rid = () => "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export function parseProdJson(text) {
  const hasColl = x => !!x && typeof x === "object" && COLLS.some(c => c in x);
  const inner = x => Object.values(x).find(y => y && (typeof y === "object" || typeof y === "string"));
  let o = JSON.parse(text);
  for (let k = 0; k < 3 && o && typeof o === "object" && !hasColl(o); k++) { const v = inner(o); if (!v) break; o = typeof v === "string" ? JSON.parse(v) : v; }
  if (!o || typeof o !== "object" || !COLLS.some(c => c in o)) throw new Error("Aucune turbine, arbre, pièce, roue ni injecteur dans ce fichier.");
  const out = {}; COLLS.forEach(c => { const v = o[c]; out[c] = Array.isArray(v) ? v.map(x => [x && x.id ? String(x.id) : rid(), x]) : v && typeof v === "object" ? Object.entries(v) : []; });
  out.params = o.params && typeof o.params === "object" ? o.params : null;
  return out;
}
export function importPlan(parsed, doc, gamme) {
  const d = doc || {}, keyOf = (c, x) => c === "turbines" || c === "arbres" ? String(x.num || "").trim().toUpperCase() : c === "roues" || c === "injecteurs" ? String(x.ref || "").trim().toUpperCase() : "";
  const plan = [];
  COLLS.forEach(c => {
    const cur = d[c] || {}, keys = new Set(Object.values(cur).map(x => keyOf(c, x || {})).filter(Boolean));
    parsed[c].forEach(([id, x]) => { if (!x || typeof x !== "object") return; const dup = id in cur || (keyOf(c, x) && keys.has(keyOf(c, x)));
      const data = { ...x }; delete data.id; if (!data.gamme) data.gamme = gamme; plan.push({ c, id, data, dup }); });
  });
  return plan;
}
function ImportDialog({ doc, api, onClose }) {
  const [plan, setPlan] = useState(null), [params, setParams] = useState(null), [useParams, setUseParams] = useState(false), [gamme, setGamme] = useState("100"), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(null), [raw, setRaw] = useState(null);
  useEffect(() => { const k = e => { if (e.key === "Escape" && !busy) onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose, busy]);
  useEffect(() => { if (raw) setPlan(importPlan(raw, doc, gamme)); }, [raw, doc, gamme]);
  const pick = e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; const fr = new FileReader(); fr.onload = () => { try { const p = parseProdJson(String(fr.result)); setRaw(p); setParams(p.params); setErr(""); } catch (x) { setRaw(null); setPlan(null); setErr("Fichier illisible : " + x.message); } }; fr.readAsText(f); };
  const go = async () => {
    setBusy(true); let n = 0, ko = 0;
    for (const it of plan.filter(x => !x.dup)) { const ok = await api.put(it.c, it.id, it.data); if (ok) n++; else ko++; }
    if (useParams && params) { const ok = await api.setParams(gamme === "20" ? { ...((doc && doc.params) || {}), r20: params } : { ...params, ...(((doc && doc.params) || {}).r20 ? { r20: doc.params.r20 } : {}) }); if (!ok) ko++; }
    setBusy(false); setDone({ n, ko });
  };
  const btn = p => ({ minHeight: 34, padding: "0 14px", borderRadius: 8, border: "1px solid " + (p ? T.ink900 : T.line), background: p ? T.ink900 : T.card, color: p ? T.card : T.ink700, fontWeight: 700, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font });
  const count = (c, dup) => (plan || []).filter(x => x.c === c && x.dup === dup).length;
  const LBL = { turbines: "Turbines", arbres: "Arbres", pieces: "Pièces", roues: "Roues", injecteurs: "Injecteurs" };
  return (<div onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label="Importer des données de production" style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(560px,100%)", padding: "16px 18px", fontFamily: T.font }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: FZ.lg, fontWeight: 600 }}>Importer des données (JSON)</div>
      <div style={{ fontSize: FZ.xs, color: T.ink500, margin: "4px 0 12px", lineHeight: 1.5 }}>Fichier exporté de l'outil Claude de Jérémie. Seuls les éléments nouveaux sont ajoutés : rien de ce qui existe déjà n'est modifié ni supprimé. Vous voyez le détail avant d'importer.</div>
      {!done && <>
        <input type="file" accept=".json,application/json" onChange={pick} aria-label="Fichier JSON" style={{ fontSize: FZ.sm }} />
        {err && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: FZ.sm, marginTop: 10 }}>{err}</div>}
        {plan && <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: FZ.sm, color: T.ink700, display: "flex", gap: 8, alignItems: "center" }}>Gamme des éléments sans gamme
            <select value={gamme} onChange={e => setGamme(e.target.value)} style={{ minHeight: 30, borderRadius: 6, border: "1px solid " + T.line, background: T.card, color: T.ink900 }}><option value="100">100 kW</option><option value="20">20 kW</option></select></label>
          <table style={{ borderCollapse: "collapse", fontSize: FZ.sm, fontVariantNumeric: "tabular-nums" }}><tbody>
            {COLLS.map(c => <tr key={c}><td style={{ padding: "3px 12px 3px 0", color: T.ink700 }}>{LBL[c]}</td><td style={{ padding: "3px 12px", fontWeight: 700 }}>{count(c, false)} à ajouter</td><td style={{ padding: "3px 0", color: T.ink500 }}>{count(c, true) ? count(c, true) + " déjà présent" + (count(c, true) > 1 ? "s" : "") + ", ignoré" + (count(c, true) > 1 ? "s" : "") : ""}</td></tr>)}
          </tbody></table>
          {params && <label style={{ fontSize: FZ.sm, color: T.ink700, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={useParams} onChange={e => setUseParams(e.target.checked)} />Reprendre aussi ses durées et noms d'étapes (remplace ceux de la gamme {gamme} kW)</label>}
        </div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button type="button" style={btn(false)} disabled={busy} onClick={onClose}>Annuler</button>
          <button type="button" style={btn(true)} disabled={busy || !plan || !plan.some(x => !x.dup)} onClick={go}>{busy ? "Import…" : "Importer " + (plan ? plan.filter(x => !x.dup).length : 0) + " élément" + (plan && plan.filter(x => !x.dup).length > 1 ? "s" : "")}</button>
        </div>
      </>}
      {done && <div><div style={{ fontSize: FZ.sm, fontWeight: 700, color: done.ko ? T.red600 : T.emerald600 }}>{done.n} élément{done.n > 1 ? "s" : ""} importé{done.n > 1 ? "s" : ""}{done.ko ? " · " + done.ko + " en erreur" : ""}.</div><div style={{ textAlign: "right", marginTop: 12 }}><button type="button" style={btn(true)} onClick={onClose}>Fermer</button></div></div>}
    </div>
  </div>);
}

const TABS = [["prod", "Production"], ["orc", "Besoins des ORC"]];
export function TurbinesHub({ doc, api, rows, canEdit, owner }) {
  const [tab, setTab] = useState(() => { try { const v = localStorage.getItem("enogia_turbines_tab"); return TABS.some(t => t[0] === v) ? v : "prod"; } catch (e) { return "prod"; } });
  useEffect(() => { try { localStorage.setItem("enogia_turbines_tab", tab); } catch (e) { /* stockage indisponible */ } }, [tab]);
  const [imp, setImp] = useState(false);
  const pjs = useMemo(() => (rows || []).filter(r => r && r.pj && r.etat !== "SHIPPED" && r.etat !== "SLOT_LIBRE").map(r => r.pj + (getPjMeta(r.pj, r).nomProjet ? " - " + getPjMeta(r.pj, r).nomProjet : "")), [rows]);
  const top = useRef(null);
  return (<div ref={top}>
    <div style={{ display: "flex", alignItems: "center", gap: 18, borderBottom: "1px solid " + T.line, marginBottom: 12, flexWrap: "wrap" }}>
      <div role="tablist" aria-label="Turbines" style={{ display: "flex", gap: 18 }}>
        {TABS.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{ border: "none", background: "transparent", padding: "8px 0", minHeight: 36, cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: tab === id ? 700 : 500, color: tab === id ? T.ink900 : T.ink500, borderBottom: "2px solid " + (tab === id ? T.ink900 : "transparent"), marginBottom: -1 }}>{l}</button>)}
      </div>
      <span style={{ flex: 1 }} />
      {/* v268 (demandé : « mettre à disposition le bouton importer à Jérémie ») : toute personne qui peut modifier la production (propriétaire + liste d’accès) */}
      {canEdit && tab === "prod" && <button type="button" onClick={() => setImp(true)} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "4px 12px", minHeight: 30, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Importer des données (JSON)</button>}
    </div>
    {tab === "prod" ? <ProdTurbines doc={doc} api={api} canEdit={canEdit} owner={owner} pjs={pjs} /> : <NeedsView doc={doc} rows={rows} />}
    {imp && <ImportDialog doc={doc} api={api} onClose={() => setImp(false)} />}
  </div>);
}
