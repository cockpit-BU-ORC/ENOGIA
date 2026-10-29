// v226 (demandé : « une nouvelle page, disponible uniquement au directeur de production turbines et à moi ; intégrer son .md en
// gardant tout le design du site ») : reprise de l'outil « Production turbines » du directeur (artifact claude.ai) dans le site —
// Accueil (turbines prêtes, testées sans roue, stocks de roues et d'injecteurs, dates prévisionnelles), Planning (pièces : appro,
// contrôle qualité, non-conformités ; tableau des turbines et des arbres, glisser une carte sur sa ligne pour changer d'étape),
// Stocks roues & injecteurs, Gamme & durées (+ accès, propriétaire). Mêmes règles de calcul que l'original : jours ouvrés
// (lundi–vendredi), durées de la gamme moins le temps déjà passé, un arbre « Disponible » requis pour l'assemblage (affecté
// automatiquement, le premier carter terminé prend le premier arbre prêt), une roue requise pour le banc avec roue.
// Données : document Firestore planning/prodTurbines (préfixe beta_ en bêta), une entrée par élément (écritures fusionnées).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, FZF as FZ, stageSoft, alertSoft } from "../theme";
import { PageHead, NavIcon } from "./SharedUI";

/* ---------- Gamme de montage (reprise de l'original) ---------- */
const PHASES = { att: "À lancer", carter: "Montage carter", assy: "Assemblage / finition", tests: "Tests", ok: "Prête", arbre: "Arbre", dispo: "Disponible", stock: "Stock" };
export const T_STEPS = [
  { id: "att", ph: "att", l: "À lancer", d: 0 },
  { id: "c1", ph: "carter", l: "Montage génératrice", d: 1 },
  { id: "c2", ph: "carter", l: "Montage chemisage", d: 1 },
  { id: "c3", ph: "carter", l: "Étanchéité chemisage", d: 0.5 },
  { id: "c4", ph: "carter", l: "Montage raccords + liner", d: 1 },
  { id: "c5", ph: "carter", l: "Montage presse-étoupes", d: 0.5 },
  { id: "c6", ph: "carter", l: "Câblage", d: 1 },
  { id: "a1", ph: "assy", l: "Assemblage rotor dans stator", d: 1 },
  { id: "a2", ph: "assy", l: "Pose couvercle AR", d: 0.5 },
  { id: "a3", ph: "assy", l: "Pose isolant + ressorts", d: 0.5 },
  { id: "a4", ph: "assy", l: "Perçage", d: 0.5 },
  { id: "a5", ph: "assy", l: "Contrôle faux-rond", d: 0.5 },
  { id: "t1", ph: "tests", l: "Test d'étanchéité", d: 0.5 },
  { id: "t2", ph: "tests", l: "Banc d'essai : lubrification", d: 1 },
  { id: "t3", ph: "tests", l: "Banc d'essai : sans roue", d: 1 },
  { id: "s1", ph: "stock", l: "Stock testée sans roue", d: 0 },
  { id: "t4", ph: "tests", l: "Banc d'essai : avec roue", d: 1 },
  { id: "ok", ph: "ok", l: "Prête", d: 0 },
];
export const A_STEPS = [
  { id: "b0", ph: "att", l: "À lancer", d: 0 },
  { id: "b1", ph: "arbre", l: "Montage aimant", d: 1 },
  { id: "b2", ph: "arbre", l: "Équilibrage (SST)", d: 10 },
  { id: "b3", ph: "arbre", l: "Contrôle de l'équilibrage", d: 0.5 },
  { id: "b4", ph: "arbre", l: "Montage roulements", d: 0.5 },
  { id: "b5", ph: "arbre", l: "Montage douille", d: 0.5 },
  { id: "b6", ph: "dispo", l: "Disponible", d: 0 },
];
const TI = Object.fromEntries(T_STEPS.map((s, i) => [s.id, i]));
const AI = Object.fromEntries(A_STEPS.map((s, i) => [s.id, i]));
const STEP = Object.fromEntries([...T_STEPS, ...A_STEPS].map(s => [s.id, s]));
const IA1 = TI.a1, IT4 = TI.t4;
export const EMPTY_PROD = { turbines: {}, arbres: {}, pieces: {}, roues: {}, injecteurs: {}, params: { d: {}, l: {} }, access: [] };

/* ---------- Dates (jours ouvrés lundi–vendredi, comme l'original) ---------- */
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const parseD = s => { if (!s) return null; const d = new Date(s + "T00:00:00"); return isNaN(d) ? null : d; };
const isWork = d => d.getDay() % 6 !== 0;
function nextWork(d) { d = new Date(d); while (!isWork(d)) d.setDate(d.getDate() + 1); return d; }
function addWD(d, n) { d = nextWork(d); while (n > 0) { d.setDate(d.getDate() + 1); if (isWork(d)) n--; } return d; }
function wdBetween(a, b) { a = new Date(a); a.setHours(0, 0, 0, 0); b = new Date(b); b.setHours(0, 0, 0, 0); if (a > b) return -wdBetween(b, a); let n = 0; while (a < b) { if (isWork(a)) n++; a.setDate(a.getDate() + 1); } return n; }
const T0 = () => nextWork(today0());
const offDate = x => x <= 0 ? T0() : addWD(T0(), Math.ceil(x - 1e-9) - 1);
const fmtD = d => d ? d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";
const fmtShort = d => d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "—";
const fmtJ = n => (Math.round(n * 10) / 10).toLocaleString("fr-FR") + " j";
const elapsed = it => { const d = parseD(it.since); return d ? Math.max(0, wdBetween(d, today0())) : 0; };
const sortNum = (a, b) => (a.num || "").localeCompare(b.num || "", "fr", { numeric: true });
const byRef = (a, b) => (a.ref || "").localeCompare(b.ref || "", "fr", { numeric: true });
const vars = r => (r.variantes || []).filter(v => (+v.qte || 0) > 0).sort((a, b) => a.bouches - b.bouches);
const injTotal = r => (+r.qte || 0) + vars(r).reduce((s, v) => s + (+v.qte || 0), 0);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- Calculs (purs, testables) ---------- */
export function makeModel(S) {
  const dur = id => { const v = S.params && S.params.d && S.params.d[id]; return typeof v === "number" && v >= 0 ? v : STEP[id].d; };
  const lbl = id => (S.params && S.params.l && S.params.l[id]) || STEP[id].l;
  const live = Object.values(S.turbines || {}).filter(t => !t.livree);
  const hasArbre = t => !!(t.arbreId && S.arbres[t.arbreId]);
  const used = new Set(live.map(t => t.arbreId).filter(Boolean));
  const availableArbres = () => Object.values(S.arbres || {}).filter(a => a.step === "b6" && !used.has(a.id) && !a.livree).sort((a, b) => (a.since || "").localeCompare(b.since || "") || sortNum(a, b));
  const arbreReadyOffset = a => {
    const i = AI[a.step] ?? 0, iD = AI.b6; if (i >= iD) return 0; let x = 0;
    if (i === 0) { const L = parseD(a.lancement); x = L ? Math.max(0, wdBetween(T0(), L)) : 0; }
    for (let j = Math.max(i, 1); j < iD; j++) { const id = A_STEPS[j].id;
      if (id === "b2" && j === i) { const r = parseD(a.retour); if (r) { x += Math.max(0, wdBetween(T0(), r)); continue; } }
      x += j === i ? Math.max(0, dur(id) - elapsed(a)) : dur(id); }
    return x;
  };
  const pushSeg = (segs, ph, from, to) => { if (to <= from) return; const last = segs[segs.length - 1]; if (last && last.ph === ph && Math.abs(last.to - from) < 1e-9) last.to = to; else segs.push({ ph, from, to }); };
  const runFrom = (t, i, x, segs) => {
    for (let j = i; j <= IT4; j++) { const s = T_STEPS[j]; if (s.ph === "att") continue;
      if (s.id === "s1") { if (!t.roue) { segs.noRoue = true; return x; } continue; }
      const d = j === TI[t.step] ? Math.max(0, dur(s.id) - elapsed(t)) : dur(s.id); pushSeg(segs, s.ph, x, x + d); x += d; }
    return x;
  };
  const progressOf = t => { let total = 0, done = 0; const i = TI[t.step] ?? 0;
    for (let j = 1; j <= IT4; j++) { const d = dur(T_STEPS[j].id); total += d; if (j < i) done += d; else if (j === i) done += Math.min(d, elapsed(t)); }
    if (t.step === "ok") return 1; return total ? done / total : 0; };
  const sch = {}, needs = [];
  for (const t of live) {
    const i = TI[t.step] ?? 0, segs = [];
    if (t.step === "ok") { sch[t.id] = { segs, end: 0, ready: true }; continue; }
    let x = 0;
    if (i === 0) { const L = parseD(t.lancement); x = L ? Math.max(0, wdBetween(T0(), L)) : 0; }
    if (i < IA1) {
      for (let j = Math.max(i, 1); j < IA1; j++) { const d = j === i ? Math.max(0, dur(T_STEPS[j].id) - elapsed(t)) : dur(T_STEPS[j].id); pushSeg(segs, "carter", x, x + d); x += d; }
      if (!hasArbre(t)) { needs.push({ t, x, segs }); continue; }
    }
    sch[t.id] = { segs, end: runFrom(t, Math.max(i, IA1), x, segs), noRoue: segs.noRoue };
  }
  // Affectation prévisionnelle des arbres : premier carter terminé = premier arbre prêt
  const pool = Object.values(S.arbres || {}).filter(a => !used.has(a.id) && !a.livree).map(a => ({ a, r: arbreReadyOffset(a) })).sort((p, q) => p.r - q.r);
  needs.sort((p, q) => p.x - q.x || (p.t.ordre || 0) - (q.t.ordre || 0));
  for (const n of needs) {
    const p = pool.shift();
    if (!p) { n.segs.push({ ph: "missing", from: n.x, to: null }); sch[n.t.id] = { segs: n.segs, end: null, missing: true }; continue; }
    if (p.r > n.x) pushSeg(n.segs, "wait", n.x, p.r);
    sch[n.t.id] = { segs: n.segs, end: runFrom(n.t, IA1, Math.max(n.x, p.r), n.segs), arbrePrevu: p.a.num, wait: Math.max(0, p.r - n.x), noRoue: n.segs.noRoue };
  }
  return { dur, lbl, live, hasArbre, used, availableArbres, arbreReadyOffset, progressOf, sch };
}

// Changement d'étape d'une turbine (mêmes garde-fous que l'original) → { turbine, msg } ou { error }
export function moveTurbine(S, M, old, nv) {
  const t = { ...old, ...nv }; const oldI = TI[old.step] ?? 0, newI = TI[t.step] ?? 0; let msg = null;
  if (t.arbreId === "") t.arbreId = null;
  if (newI >= TI.t4 && oldI < TI.t4 && !t.roue) return { error: "Attribuez d'abord une roue à " + t.num + " (fiche turbine) avant le banc d'essai avec roue." };
  if (newI >= IA1 && !(t.arbreId && S.arbres[t.arbreId])) {
    const av = M.availableArbres();
    if (!av.length) return { error: "Impossible de passer en assemblage : aucun arbre équilibré disponible. Faites d'abord avancer un arbre jusqu'à « Disponible »." };
    t.arbreId = av[0].id; msg = "Arbre " + av[0].num + " affecté à " + t.num;
  }
  if (newI < IA1 && oldI >= IA1 && old.arbreId && t.arbreId === old.arbreId) { msg = "Arbre " + ((S.arbres[old.arbreId] || {}).num || "") + " remis en stock"; t.arbreId = null; }
  if (old.step !== t.step || !t.since) t.since = iso(today0());
  return { turbine: t, msg };
}

/* ---------- Couleurs des phases (jetons du thème) ---------- */
function phaseColors() {
  const S = stageSoft(), A = alertSoft();
  const tone = o => ({ c: o.solid || o.ring, bg: o.bg, ink: o.ink });
  return {
    att: { c: T.ink300, bg: T.surfaceAlt, ink: T.ink700 }, stock: { c: T.ink500, bg: T.surfaceAlt, ink: T.ink700 },
    carter: tone(S.production), assy: tone(S.finProd), tests: tone(S.tests), ok: tone(S.depart), arbre: tone(S.arrivee), dispo: tone(S.finProd),
    wait: { c: A.orange.ring, bg: A.orange.bg, ink: A.orange.ink }, missing: { c: A.red.ring, bg: A.red.bg, ink: A.red.ink },
  };
}

/* ---------- Petits éléments communs ---------- */
const card = () => ({ background: T.card, border: "1px solid " + T.line, borderRadius: 10, padding: "12px 14px", minWidth: 0, boxSizing: "border-box" });
const btn = (kind) => ({ border: kind === "primary" ? "1px solid " + T.ink900 : "1px solid " + (kind === "danger" ? T.red500 : T.line), background: kind === "primary" ? T.ink900 : T.card, color: kind === "primary" ? T.card : kind === "danger" ? T.red500 : T.ink700, borderRadius: 6, padding: "4px 10px", minHeight: 28, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap" });
const H2 = ({ children, sub, right }) => (<div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", margin: "4px 0 8px" }}>
  <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: FZ.lg, fontWeight: 600, color: T.ink900 }}>{children}</h2>
  {sub && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{sub}</span>}
  {right && <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>{right}</span>}
</div>);
const Muted = ({ children }) => <div style={{ fontSize: FZ.sm, color: T.ink500, padding: "6px 0" }}>{children}</div>;

// Fenêtre d'édition générique (mêmes champs que l'original)
function FormDialog({ title, fields, vals, onSave, extra = [], readOnly, onClose, notify }) {
  const [v, setV] = useState(() => { const o = {}; fields.forEach(f => { o[f.k] = vals[f.k] ?? (f.type === "number" ? 0 : ""); }); return o; });
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const val = () => { const o = {}; fields.forEach(f => { let x = v[f.k]; if (f.type === "number") x = Math.max(0, parseInt(x || "0", 10) || 0); o[f.k] = typeof x === "string" ? x.trim() : x; }); return o; };
  const submit = async e => { e.preventDefault(); const r = val(); const miss = fields.find(f => f.req && (!f.show || f.show(r)) && !r[f.k]); if (miss) { notify("Renseignez le champ « " + miss.l + " ».", true); return; } const ok = await onSave(r); if (ok !== false) onClose(); };
  const inp = { width: "100%", height: 34, border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, padding: "0 10px", fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box" };
  const cur = val();
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,.45)", zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <form role="dialog" aria-label={title} onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(460px,100%)", maxHeight: "90vh", overflow: "auto", padding: "16px 18px", fontFamily: T.font }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 18, marginBottom: 10 }}>{title}</div>
      {fields.filter(f => !f.show || f.show(cur)).map(f => (<label key={f.k} style={{ display: "block", marginBottom: 10 }}>
        <span style={{ display: "block", fontSize: FZ.xs, fontWeight: 700, color: T.ink700, marginBottom: 4 }}>{f.l}{f.req ? " *" : ""}</span>
        {f.type === "select" ? <select disabled={readOnly} value={v[f.k]} onChange={e => setV({ ...v, [f.k]: e.target.value })} style={inp}>{f.opts.map(([ov, ol]) => <option key={ov} value={ov}>{ol}</option>)}</select>
          : f.type === "textarea" ? <textarea disabled={readOnly} value={v[f.k]} onChange={e => setV({ ...v, [f.k]: e.target.value })} style={{ ...inp, height: 70, padding: 8, resize: "vertical" }} />
          : <><input disabled={readOnly} type={f.type || "text"} min={f.type === "number" ? 0 : undefined} value={v[f.k]} list={f.list ? "pt-dl-" + f.k : undefined} onChange={e => setV({ ...v, [f.k]: e.target.value })} style={inp} />
            {f.list && <datalist id={"pt-dl-" + f.k}>{f.list.map(o => <option key={o} value={o} />)}</datalist>}</>}
        {f.hint && <span style={{ display: "block", fontSize: 11.5, color: T.ink500, marginTop: 3 }}>{f.hint}</span>}
      </label>))}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        {!readOnly && extra.map((x, i) => <button key={i} type="button" style={btn(x.danger ? "danger" : "")} onClick={async () => { const ok = await x.fn(val()); if (ok !== false) onClose(); }}>{x.l}</button>)}
        <span style={{ flex: 1 }} />
        <button type="button" style={btn("")} onClick={onClose}>{readOnly ? "Fermer" : "Annuler"}</button>
        {!readOnly && <button type="submit" style={btn("primary")}>Enregistrer</button>}
      </div>
    </form>
  </div>);
}

/* ---------- Page ---------- */
const TABS = [["accueil", "Accueil"], ["planning", "Planning"], ["stocks", "Stocks roues & injecteurs"], ["parametres", "Gamme & durées"]];

export function ProdTurbines({ doc, api, canEdit, owner }) {
  const S = useMemo(() => ({ ...EMPTY_PROD, ...(doc || {}), params: { d: {}, l: {}, ...((doc && doc.params) || {}) } }), [doc]);
  const M = useMemo(() => makeModel(S), [S]);
  const P = phaseColors();
  const readOnly = !canEdit;
  const [tab, setTab] = useState(() => { try { const v = localStorage.getItem("enogia_prodturb_tab"); return TABS.some(t => t[0] === v) ? v : "accueil"; } catch (e) { return "accueil"; } });
  useEffect(() => { try { localStorage.setItem("enogia_prodturb_tab", tab); } catch (e) { /* stockage indisponible */ } }, [tab]);
  const [form, setForm] = useState(null); const [toast, setToast] = useState(null); const tRef = useRef(null);
  const notify = (msg, err) => { setToast({ msg, err }); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(null), err ? 5200 : 3000); };
  const put = async (c, id, data) => { const d = { ...data }; delete d.id; const ok = await api.put(c, id, d); if (!ok) notify("Enregistrement impossible, réessayez dans un instant.", true); return ok; };
  const del = (c, id) => api.del(c, id);
  const saveTurbine = async (old, nv) => { const r = moveTurbine(S, M, old, nv); if (r.error) { notify(r.error, true); return false; } if (r.msg) notify(r.msg); return put("turbines", r.turbine.id, r.turbine); };

  /* ---- fiches ---- */
  const openTurbine = t => {
    const isNew = !t;
    t = t || { id: newId(), num: "", affaire: "", roue: "", step: "att", ordre: Math.max(0, ...M.live.map(x => x.ordre || 0)) + 1, arbreId: null, since: iso(today0()) };
    const roueRefs = Object.values(S.roues).map(r => r.ref).filter(Boolean).sort(); if (t.roue && !roueRefs.includes(t.roue)) roueRefs.push(t.roue);
    const av = M.availableArbres();
    const arbreOpts = [["", "Aucun (affectation automatique)"], ...(t.arbreId && S.arbres[t.arbreId] ? [[t.arbreId, "Arbre " + S.arbres[t.arbreId].num]] : []), ...av.map(a => [a.id, "Arbre " + a.num + " (disponible)"])];
    setForm({ title: isNew ? "Nouvelle turbine" : "Turbine " + t.num, vals: { ...t, arbreId: t.arbreId || "" },
      fields: [
        { k: "num", l: "Numéro de turbine", req: true }, { k: "affaire", l: "Affaire / client" },
        { k: "roue", l: "Roue attribuée", type: "select", opts: [["", "Non attribuée"], ...roueRefs.map(r => [r, r])], hint: "Sans roue, la turbine s'arrête en « Stock testée sans roue » après le banc d'essai sans roue." },
        { k: "step", l: "Étape actuelle", type: "select", opts: T_STEPS.map(s => [s.id, PHASES[s.ph] + " : " + M.lbl(s.id)]) },
        { k: "lancement", l: "Lancement prévu", type: "date", show: v => v.step === "att" },
        { k: "arbreId", l: "Arbre", type: "select", opts: arbreOpts, hint: "Obligatoire à partir de l'assemblage : seul un arbre équilibré peut être affecté." },
        { k: "note", l: "Note", type: "textarea" },
      ],
      onSave: v => saveTurbine(t, v),
      extra: isNew ? [] : [
        ...(t.step === "ok" ? [{ l: "Marquer livrée", fn: async () => { await put("turbines", t.id, { ...t, livree: iso(today0()) }); if (t.arbreId && S.arbres[t.arbreId]) await put("arbres", t.arbreId, { ...S.arbres[t.arbreId], livree: iso(today0()) }); notify(t.num + " marquée livrée"); } }] : []),
        { l: "Supprimer", danger: true, fn: async () => { if (!window.confirm("Supprimer la turbine " + t.num + " ? Son arbre éventuel retourne en stock.")) return false; await del("turbines", t.id); notify(t.num + " supprimée"); } },
      ] });
  };
  const openArbre = a => {
    const isNew = !a; a = a || { id: newId(), num: "", ref: "", step: "b0", since: iso(today0()) };
    setForm({ title: isNew ? "Nouvel arbre" : "Arbre " + a.num, vals: a,
      fields: [
        { k: "num", l: "Numéro d'arbre", req: true }, { k: "ref", l: "Référence" },
        { k: "step", l: "Étape actuelle", type: "select", opts: A_STEPS.map(s => [s.id, M.lbl(s.id)]) },
        { k: "lancement", l: "Lancement prévu", type: "date", show: v => v.step === "b0" },
        { k: "retour", l: "Retour prévu de l'équilibrage", type: "date", show: v => v.step === "b2", hint: "Remplace la durée standard dans le calcul des dates." },
        { k: "note", l: "Note", type: "textarea" },
      ],
      onSave: v => { const n = { ...a, ...v }; if (n.step !== a.step || !n.since) n.since = iso(today0()); return put("arbres", n.id, n); },
      extra: isNew ? [] : [{ l: "Supprimer", danger: true, fn: async () => { if (!window.confirm("Supprimer l'arbre " + a.num + " ?")) return false; await del("arbres", a.id); } }] });
  };
  const openPiece = (p, statut) => {
    const isNew = !p; p = p || { id: newId(), statut: statut || "appro", designation: "", ref: "", qte: 1, cqEtat: "en attente", since: iso(today0()) };
    setForm({ title: isNew ? "Nouvelle pièce" : (p.designation || "Pièce"), vals: p,
      fields: [
        { k: "designation", l: "Désignation", req: true }, { k: "ref", l: "Référence" }, { k: "qte", l: "Quantité", type: "number" },
        { k: "po", l: "N° de PO", req: true, show: v => v.statut === "appro" }, { k: "fournisseur", l: "Fournisseur", req: true, show: v => v.statut === "appro" },
        { k: "turbine", l: "Turbine concernée", list: M.live.map(t => t.num).sort() },
        { k: "statut", l: "Statut", type: "select", opts: [["appro", "Appro : pas encore livrée"], ["cq", "Contrôle qualité"], ["nc", "Non conforme"]] },
        { k: "dateLiv", l: "Date de livraison prévue", type: "date", show: v => v.statut === "appro" },
        { k: "cqEtat", l: "État du contrôle", type: "select", opts: [["en attente", "En attente de contrôle"], ["en cours", "Contrôle en cours"]], show: v => v.statut === "cq" },
        { k: "motif", l: "Motif de non-conformité", show: v => v.statut === "nc" }, { k: "note", l: "Note", type: "textarea" },
      ],
      onSave: v => { const n = { ...p, ...v }; if (n.statut !== p.statut) n.since = iso(today0()); return put("pieces", n.id, n); },
      extra: isNew ? [] : [{ l: "Supprimer", danger: true, fn: () => del("pieces", p.id) }] });
  };
  const pieceAction = async (id, act) => {
    const p = S.pieces[id]; if (!p) return;
    if (act === "recue") { await put("pieces", id, { ...p, statut: "cq", cqEtat: "en attente", since: iso(today0()) }); notify(p.designation + " passée au contrôle qualité"); }
    if (act === "conforme") { await del("pieces", id); notify(p.designation + " conforme, retirée de la liste"); }
    if (act === "nc") openPiece({ ...p, statut: "nc", since: iso(today0()) });
    if (act === "traitee") { await del("pieces", id); notify("NC " + p.designation + " soldée"); }
  };
  const openStock = (c, r) => {
    const isNew = !r; r = r || { id: newId(), ref: "", qte: 0 };
    const fields = [{ k: "ref", l: "Référence", req: true }, { k: "qte", l: c === "roues" ? "Roues équilibrées en stock" : "Injecteurs vierges en stock", type: "number" }];
    if (c === "injecteurs") fields.push({ k: "ouvertures", l: "Nombre total d'ouvertures", type: "number", hint: "Par exemple 11 pour MT EDP. Les bouchages se gèrent dans le tableau, avec « Ajouter un bouchage »." });
    setForm({ title: isNew ? "Nouvelle référence" : r.ref, vals: r, fields, onSave: v => put(c, r.id, { ...r, ...v }), extra: isNew ? [] : [{ l: "Supprimer", danger: true, fn: () => del(c, r.id) }] });
  };
  const addVar = r => setForm({ title: r.ref + " : injecteurs avec bouchages", vals: { bouches: "", qte: 1 },
    fields: [{ k: "bouches", l: "Ouvertures bouchées" + (r.ouvertures ? " (sur " + r.ouvertures + ")" : ""), type: "number", req: true }, { k: "qte", l: "Quantité", type: "number", req: true }],
    onSave: f => { if (r.ouvertures && f.bouches >= r.ouvertures) { notify("Un injecteur " + r.ref + " a " + r.ouvertures + " ouvertures : il faut en boucher moins de " + r.ouvertures + ".", true); return false; }
      const v = (r.variantes || []).map(x => ({ ...x })); const x = v.find(y => +y.bouches === f.bouches); if (x) x.qte = (+x.qte || 0) + f.qte; else v.push({ bouches: f.bouches, qte: f.qte });
      return put("injecteurs", r.id, { ...r, variantes: v }); } });
  const bumpQty = (c, r, d) => put(c, r.id, { ...r, qte: Math.max(0, (+r.qte || 0) + d) });
  const bumpVar = (r, b, d) => { const v = (r.variantes || []).map(x => ({ ...x })); const x = v.find(y => +y.bouches === b); if (x) x.qte = Math.max(0, (+x.qte || 0) + d); put("injecteurs", r.id, { ...r, variantes: v.filter(y => (+y.qte || 0) > 0) }); };

  /* ---- glisser une carte sur sa ligne (souris et tactile) ---- */
  const dragRef = useRef(null); const [drag, setDrag] = useState(null);
  const cellState = (kind, item, stepId) => {
    if (kind !== "turbine") return "valid";
    if (TI[stepId] >= IA1 && !M.hasArbre(item) && !M.availableArbres().length) return "blocked";
    if (TI[stepId] >= TI.t4 && (TI[item.step] ?? 0) < TI.t4 && !item.roue) return "blocked";
    return "valid";
  };
  const onCardDown = (e, kind, id) => { if (e.button != null && e.button !== 0) return; dragRef.current = { kind, id, x0: e.clientX, y0: e.clientY, moved: false }; };
  useEffect(() => {
    const move = e => { const d = dragRef.current; if (!d) return;
      if (!d.moved) { if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6 || readOnly) return; d.moved = true; }
      e.preventDefault();
      const el = document.elementFromPoint(e.clientX, e.clientY); const td = el && el.closest && el.closest("td[data-step]");
      d.target = td && td.getAttribute("data-row") === d.id ? td.getAttribute("data-step") : null;
      setDrag({ kind: d.kind, id: d.id, x: e.clientX, y: e.clientY, target: d.target });
    };
    const up = async () => { const d = dragRef.current; dragRef.current = null; if (!d) return;
      if (!d.moved) { if (d.kind === "turbine") openTurbine(S.turbines[d.id]); else openArbre(S.arbres[d.id]); return; }
      setDrag(null); if (!d.target) return;
      if (d.kind === "turbine") { const t = S.turbines[d.id]; if (!t || t.step === d.target) return;
        if (cellState("turbine", t, d.target) === "blocked") { notify(TI[d.target] >= TI.t4 && !t.roue ? "Attribuez d'abord une roue à " + t.num + " : cliquez sur sa carte." : "Impossible de passer en assemblage : aucun arbre disponible.", true); return; }
        await saveTurbine(t, { step: d.target }); }
      else { const a = S.arbres[d.id]; if (a && a.step !== d.target) await put("arbres", a.id, { ...a, step: d.target, since: iso(today0()) }); }
    };
    const esc = e => { if (e.key === "Escape" && dragRef.current) { dragRef.current = null; setDrag(null); } };
    window.addEventListener("pointermove", move, { passive: false }); window.addEventListener("pointerup", up); window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("keydown", esc); };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- rendu ---- */
  const kpi = (title, big, body) => (<section aria-label={title} style={{ ...card(), display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><h3 style={{ margin: 0, fontSize: FZ.sm, fontWeight: 700, color: T.ink700, flex: 1 }}>{title}</h3>
      <span style={{ fontFamily: T.fontDisplay, fontSize: 30, fontWeight: 300, lineHeight: 1, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{big}</span></div>
    {body}
  </section>);
  const li = { display: "flex", justifyContent: "space-between", gap: 8, minHeight: 28, alignItems: "center", borderTop: "1px solid " + T.line, fontSize: FZ.sm };

  const renderHome = () => {
    const turbs = M.live, ready = turbs.filter(t => t.step === "ok").sort(sortNum), noWheel = turbs.filter(t => t.step === "s1").sort(sortNum);
    const roues = Object.values(S.roues).sort(byRef), injs = Object.values(S.injecteurs).sort(byRef);
    const maxR = Math.max(1, ...roues.map(r => +r.qte || 0)), sumR = roues.reduce((s, r) => s + (+r.qte || 0), 0), sumI = injs.reduce((s, r) => s + injTotal(r), 0);
    const upcoming = turbs.filter(t => t.step !== "ok").map(t => ({ t, s: M.sch[t.id] || { segs: [], end: null } })).sort((p, q) => (p.s.end ?? 1e9) - (q.s.end ?? 1e9) || sortNum(p.t, q.t));
    const H = Math.min(120, Math.ceil(Math.max(10, ...upcoming.map(u => u.s.end ?? 0))) + 2);
    const pct = x => Math.max(0, Math.min(100, (x / H) * 100));
    const ticks = []; for (let k = 0; k < H; k++) { const d = addWD(T0(), k); if (k === 0 || d.getDay() === 1) ticks.push({ k, l: fmtShort(d) }); }
    const hatch = c => "repeating-linear-gradient(135deg," + c + " 0 3px,transparent 3px 7px)";
    return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,230px),1fr))", gap: 12, alignItems: "start" }}>
        {kpi("Turbines prêtes", ready.length, ready.length ? ready.map(t => <div key={t.id} style={li}><b>{t.num}</b><span style={{ color: T.ink500, fontSize: FZ.xs }}>{t.roue ? "roue " + t.roue : "config. roue à renseigner"}</span></div>) : <Muted>Aucune turbine prête pour l'instant.</Muted>)}
        {kpi("Testées sans roue", noWheel.length, noWheel.length ? noWheel.map(t => <div key={t.id} style={li}><b>{t.num}</b><span style={{ color: T.ink500, fontSize: FZ.xs }}>{t.roue ? "roue " + t.roue + " attribuée" : "en stock depuis le " + fmtShort(parseD(t.since))}</span></div>) : <Muted>Aucune turbine en stock sans roue.</Muted>)}
        {kpi("Roues équilibrées par réf.", sumR, roues.length ? roues.map(r => <div key={r.id} style={{ ...li, display: "block", padding: "4px 0" }}><div style={{ display: "flex", justifyContent: "space-between" }}><span>{r.ref}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{+r.qte || 0}</b></div>
          <div style={{ height: 4, background: T.surfaceAlt, borderRadius: 2, marginTop: 3 }}><div style={{ width: ((+r.qte || 0) / maxR * 100) + "%", height: 4, borderRadius: 2, background: P.arbre.c }} /></div></div>) : <Muted>Ajoutez les références dans l'onglet Stocks.</Muted>)}
        {kpi("Injecteurs par réf.", sumI, injs.length ? injs.map(r => <div key={r.id} style={{ ...li, alignItems: "flex-start", padding: "4px 0" }}><span>{r.ref}<br /><span style={{ fontSize: FZ.xs, color: T.ink500 }}>{+r.qte || 0} vierge{(+r.qte || 0) > 1 ? "s" : ""}</span>{vars(r).map(v => <span key={v.bouches} style={{ display: "block", fontSize: FZ.xs, color: T.ink700 }}>{v.qte} avec {v.bouches}/{r.ouvertures || "?"} bouchages</span>)}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{injTotal(r)}</b></div>) : <Muted>Ajoutez les références dans l'onglet Stocks.</Muted>)}
      </div>
      <section aria-label="Dates prévisionnelles des prochaines turbines" style={card()}>
        <H2 sub="jours ouvrés" right={<span style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", fontSize: FZ.xs, color: T.ink500 }}>
          {[["carter", "Montage carter"], ["assy", "Assemblage / finition"], ["tests", "Tests"], ["wait", "Attente arbre"]].map(([k, l]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 14, height: 9, borderRadius: 2, background: k === "wait" ? hatch(P.wait.c) : P[k].c, display: "inline-block" }} />{l}</span>)}
        </span>}>Dates prévisionnelles des prochaines turbines</H2>
        {upcoming.length === 0 ? <Muted>Aucune turbine en cours. Créez-en une depuis l'onglet Planning.</Muted> : <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 640 }}>
            <div style={{ display: "grid", gridTemplateColumns: "210px 1fr 150px", gap: 10, alignItems: "end", fontSize: 12, color: T.ink500, paddingBottom: 4 }}>
              <span>Turbine et étape actuelle</span>
              <div style={{ position: "relative", height: 16 }}>{ticks.map(t => <span key={t.k} style={{ position: "absolute", left: pct(t.k) + "%", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{t.l}</span>)}</div>
              <span style={{ textAlign: "right" }}>Prête le</span>
            </div>
            {upcoming.map(({ t, s }) => { const st = STEP[t.step] || T_STEPS[0], pc = P[st.ph] || P.att;
              const end = s.missing ? <><b style={{ color: P.missing.ink }}>Arbre manquant</b><small>pas d'arbre en cours</small></>
                : s.noRoue ? <><b style={{ color: P.wait.ink }}>Roue à attribuer</b><small>{t.step === "s1" ? "en stock, testée sans roue" : "testée sans roue le " + fmtD(offDate(s.end))}</small></>
                : <><b>{fmtD(offDate(s.end))}</b><small>{s.wait ? "dont " + fmtJ(s.wait) + " d'attente arbre" : t.affaire || " "}</small></>;
              return (<div key={t.id} style={{ display: "grid", gridTemplateColumns: "210px 1fr 150px", gap: 10, alignItems: "center", minHeight: 46, borderTop: "1px solid " + T.line }}>
                <button type="button" onClick={() => openTurbine(t)} style={{ border: "none", background: "transparent", textAlign: "left", padding: "4px 0", cursor: "pointer", fontFamily: T.font, color: T.ink900, minWidth: 0 }}>
                  <b style={{ fontFamily: T.fontMono, fontSize: FZ.sm }}>{t.num}</b>{t.roue ? <span style={{ fontSize: FZ.xs, color: T.ink500 }}> roue {t.roue}</span> : null}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink700 }}><i style={{ width: 8, height: 8, borderRadius: 4, background: pc.c, display: "inline-block", flexShrink: 0 }} /><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{M.lbl(st.id)}</span></div>
                  <div style={{ height: 3, background: T.surfaceAlt, borderRadius: 2, marginTop: 3 }}><div style={{ width: Math.round(M.progressOf(t) * 100) + "%", height: 3, borderRadius: 2, background: pc.c }} /></div>
                </button>
                <div style={{ position: "relative", height: 16, background: T.surface, borderRadius: 3 }}>
                  {ticks.slice(1).map(k => <i key={k.k} style={{ position: "absolute", left: pct(k.k) + "%", top: -4, bottom: -4, width: 1, background: T.line }} />)}
                  {s.segs.map((g, i) => <div key={i} title={g.ph === "wait" ? "Attente arbre" : g.ph === "missing" ? "Aucun arbre prévu" : PHASES[g.ph]} style={{ position: "absolute", top: 2, bottom: 2, left: pct(g.from) + "%", width: (g.to === null ? 100 - pct(g.from) : pct(g.to) - pct(g.from)) + "%", borderRadius: 2, background: g.ph === "wait" ? hatch(P.wait.c) : g.ph === "missing" ? hatch(P.missing.c) : (P[g.ph] || P.att).c }} />)}
                  <i title="Aujourd'hui" style={{ position: "absolute", left: 0, top: -6, bottom: -6, width: 2, background: T.red500 }} />
                </div>
                <div style={{ textAlign: "right", fontSize: FZ.sm, display: "flex", flexDirection: "column", lineHeight: 1.25 }}>{end}</div>
              </div>); })}
          </div></div>}
        <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 8 }}>Calcul en jours ouvrés à partir des durées de la gamme, du temps déjà passé à l'étape en cours et de la disponibilité des arbres équilibrés.</div>
      </section>
    </div>);
  };

  const board = (kind, steps, lockId, items, nameCell, cardText) => {
    const groups = []; steps.forEach(s => { const g = groups[groups.length - 1]; if (g && g.ph === s.ph) g.n++; else groups.push({ ph: s.ph, n: 1, first: s.id }); });
    const th = { position: "sticky", top: 0, background: T.surface, fontSize: 12, color: T.ink500, fontWeight: 600, padding: "4px 6px", textAlign: "left", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" };
    const item = drag && drag.kind === kind ? (kind === "turbine" ? S.turbines[drag.id] : S.arbres[drag.id]) : null;
    return (<div style={{ overflowX: "auto", border: "1px solid " + T.line, borderRadius: 10, background: T.card }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%", fontFamily: T.font }}>
        <thead>
          <tr><th rowSpan={2} style={{ ...th, left: 0, zIndex: 3, minWidth: 190 }}>{kind === "turbine" ? "Turbine" : "Arbre"}</th>
            {groups.map(g => <th key={g.first} colSpan={g.n} style={{ ...th, borderTop: "3px solid " + (P[g.ph] || P.att).c, color: T.ink700, fontWeight: 700 }}>{PHASES[g.ph]}{g.first === lockId ? <small style={{ display: "block", fontWeight: 500, color: T.ink500 }}>Arbre disponible requis</small> : null}</th>)}</tr>
          <tr>{steps.map(s => <th key={s.id} style={{ ...th, top: 0, minWidth: 104, whiteSpace: "normal", lineHeight: 1.2, borderLeft: s.id === lockId ? "2px solid " + T.ink500 : undefined }}>{M.lbl(s.id)}{M.dur(s.id) ? <em style={{ display: "block", fontStyle: "normal", color: T.ink300, fontVariantNumeric: "tabular-nums" }}>{fmtJ(M.dur(s.id))}</em> : null}</th>)}</tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={steps.length + 1} style={{ padding: 14, color: T.ink500, fontSize: FZ.sm }}>{kind === "turbine" ? "Aucune turbine en cours. Créez la première avec « Nouvelle turbine »." : "Aucun arbre en stock ou en cours."}</td></tr>}
          {items.map(x => { const idx = (kind === "turbine" ? TI : AI)[x.step] ?? 0; const dragging = drag && drag.id === x.id;
            return (<tr key={x.id}>
              <td style={{ position: "sticky", left: 0, zIndex: 2, background: T.card, borderTop: "1px solid " + T.line, padding: "6px 8px", verticalAlign: "top", minWidth: 190, maxWidth: 230 }}>{nameCell(x)}</td>
              {steps.map((c, j) => { const pc = P[c.ph] || P.att; const isCur = j === idx; const st = dragging && item ? cellState(kind, item, c.id) : null; const hot = dragging && drag.target === c.id;
                return (<td key={c.id} data-step={c.id} data-row={x.id} style={{ borderTop: "1px solid " + T.line, borderLeft: c.id === lockId ? "2px solid " + T.ink500 : "1px solid " + T.line, padding: 4, verticalAlign: "middle", minWidth: 104, height: 52, boxSizing: "border-box",
                  background: hot ? (st === "blocked" ? P.missing.bg : pc.bg) : st === "blocked" ? "repeating-linear-gradient(135deg," + T.surfaceAlt + " 0 4px,transparent 4px 8px)" : j < idx ? T.surface : "transparent", outline: hot ? "2px solid " + (st === "blocked" ? P.missing.c : pc.c) : "none", outlineOffset: -2 }}>
                  {isCur && <button type="button" aria-label={(kind === "turbine" ? "Turbine " : "Arbre ") + x.num + " : " + M.lbl(c.id) + ". Glisser sur la ligne pour changer d'étape, cliquer pour la fiche."} onPointerDown={e => onCardDown(e, kind, x.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kind === "turbine" ? openTurbine(x) : openArbre(x); } }}
                    style={{ width: "100%", textAlign: "left", border: "1px solid " + pc.c, borderLeft: "4px solid " + pc.c, background: pc.bg, color: pc.ink, borderRadius: 6, padding: "4px 6px", cursor: readOnly ? "pointer" : "grab", fontFamily: T.font, touchAction: "none", opacity: dragging ? 0.45 : 1 }}>
                    <b style={{ display: "block", fontFamily: T.fontMono, fontSize: 12 }}>{x.num}</b><span style={{ fontSize: 11 }}>{cardText(x, c)}</span>
                  </button>}
                </td>); })}
            </tr>); })}
        </tbody>
      </table>
    </div>);
  };

  const renderPlanning = () => {
    const pieces = Object.values(S.pieces), t0 = iso(today0());
    const appro = pieces.filter(p => p.statut === "appro").sort((a, b) => (a.dateLiv || "9").localeCompare(b.dateLiv || "9"));
    const cq = pieces.filter(p => p.statut === "cq").sort((a, b) => (a.since || "").localeCompare(b.since || ""));
    const nc = pieces.filter(p => p.statut === "nc").sort((a, b) => (a.since || "").localeCompare(b.since || ""));
    const late = { color: T.red600, fontWeight: 600 };
    const pItem = (p, meta, acts) => (<div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid " + T.line, padding: "6px 0", minHeight: 36 }}>
      <button type="button" onClick={() => openPiece(p)} style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", textAlign: "left", cursor: "pointer", fontFamily: T.font, color: T.ink900, padding: 0 }}>
        <span style={{ fontSize: FZ.sm, fontWeight: 600 }}>{p.designation || "Pièce"}{p.qte > 1 ? <span style={{ color: T.ink500 }}> ×{p.qte}</span> : null}{p.turbine ? <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, background: T.surfaceAlt, color: T.ink700, borderRadius: 99, padding: "0 7px" }}>{p.turbine}</span> : null}</span>
        <span style={{ display: "block", fontSize: FZ.xs, color: T.ink500 }}>{meta}</span>
      </button>
      {!readOnly && <span style={{ display: "inline-flex", gap: 4 }}>{acts}</span>}
    </div>);
    const panel = (title, sub, kind, list, empty) => (<section aria-label={title} style={card()}>
      <H2 sub={sub} right={!readOnly && <button type="button" style={btn("")} onClick={() => openPiece(null, kind)}>Ajouter</button>}>{title}</H2>
      {list.length ? list : <Muted>{empty}</Muted>}
    </section>);
    const turbs = M.live.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || sortNum(a, b));
    const arbres = Object.values(S.arbres).filter(a => !M.used.has(a.id) && !a.livree).sort((a, b) => (AI[b.step] ?? 0) - (AI[a.step] ?? 0) || sortNum(a, b));
    const mounted = Object.values(S.arbres).filter(a => M.used.has(a.id));
    const nAvail = M.availableArbres().length;
    const chip = (ok, txt, soft) => <span style={{ display: "inline-block", marginTop: 3, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "0 7px", background: ok ? P.dispo.bg : P.missing.bg, color: ok ? P.dispo.ink : P.missing.ink, opacity: soft ? 0.8 : 1 }}>{txt}</span>;
    return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 12, alignItems: "start" }}>
        {panel("Appro", "Pièces pas encore livrées", "appro", appro.map(p => pItem(p, <>{p.ref ? p.ref + " — " : ""}{p.po || p.fournisseur ? [p.po, p.fournisseur].filter(Boolean).join(", ") + " — " : <span style={late}>PO et fournisseur à renseigner — </span>}livraison {p.dateLiv ? <span style={p.dateLiv < t0 ? late : undefined}>{fmtD(parseD(p.dateLiv))}</span> : "non datée"}</>,
          <button type="button" style={btn("")} title="Passer en contrôle qualité" onClick={() => pieceAction(p.id, "recue")}>Reçue</button>)), "Rien en attente de livraison.")}
        {panel("Contrôle qualité", "En cours ou en attente de contrôle", "cq", cq.map(p => pItem(p, (p.ref ? p.ref + " — " : "") + (p.cqEtat === "en cours" ? "contrôle en cours" : "en attente de contrôle"),
          <><button type="button" style={btn("")} onClick={() => pieceAction(p.id, "conforme")}>Conforme</button><button type="button" style={btn("danger")} onClick={() => pieceAction(p.id, "nc")}>NC</button></>)), "Aucune pièce au contrôle.")}
        {panel("Non-conformités", "Pièces déclarées NC", "nc", nc.map(p => pItem(p, (p.ref ? p.ref + " — " : "") + (p.motif || "motif à préciser"),
          <button type="button" style={btn("")} title="Retirer de la liste" onClick={() => pieceAction(p.id, "traitee")}>Soldée</button>)), "Aucune pièce NC.")}
      </div>
      <section aria-label="Turbines">
        <H2 sub={"Glissez une carte sur sa ligne pour changer d'étape · " + nAvail + " arbre" + (nAvail > 1 ? "s" : "") + " prêt" + (nAvail > 1 ? "s" : "") + " à monter"} right={!readOnly && <button type="button" style={btn("primary")} onClick={() => openTurbine(null)}>Nouvelle turbine</button>}>Turbines</H2>
        {board("turbine", T_STEPS, "a1", turbs, t => { const i = TI[t.step] ?? 0, sc = M.sch[t.id] || {};
          return (<button type="button" onClick={() => openTurbine(t)} style={{ border: "none", background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", fontFamily: T.font, color: T.ink900 }}>
            <b style={{ fontFamily: T.fontMono, fontSize: FZ.sm }}>{t.num}</b>{t.affaire ? <span style={{ fontSize: FZ.xs, color: T.ink500 }}> {t.affaire}</span> : null}
            <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{t.roue ? "Roue " + t.roue : "Roue non attribuée"}</div>
            {M.hasArbre(t) ? chip(true, "Arbre " + S.arbres[t.arbreId].num) : i < IA1 ? (sc.arbrePrevu ? chip(true, "Arbre prévu : " + sc.arbrePrevu, true) : chip(false, "Aucun arbre prévu")) : t.step === "ok" ? null : chip(false, "Arbre à affecter")}
            <div style={{ fontSize: FZ.xs, fontWeight: 700, marginTop: 2, color: t.step === "ok" ? P.dispo.ink : sc.missing ? T.red600 : sc.noRoue ? P.wait.ink : T.ink700 }}>{t.step === "ok" ? "Prête" : sc.missing ? "Date bloquée : arbre manquant" : sc.noRoue ? "Roue à attribuer" : "Prête le " + fmtD(offDate(sc.end))}</div>
          </button>); },
          (t, c) => { const late = M.dur(c.id) && elapsed(t) > M.dur(c.id); const txt = c.id === "ok" ? (t.roue ? "roue " + t.roue : "prête") : c.id === "s1" ? (t.roue ? "roue " + t.roue : "sans roue") : c.id === "att" ? (t.lancement ? "lancement " + fmtShort(parseD(t.lancement)) : "à lancer") : "J" + (elapsed(t) + 1) + " / " + Math.max(1, Math.ceil(M.dur(c.id))); return late ? <b style={{ color: T.red600 }}>{txt}</b> : txt; })}
      </section>
      <section aria-label="Arbres">
        <H2 sub="Un arbre « Disponible » (contrôlé, roulements et douille montés) est affecté automatiquement à la turbine qui passe en assemblage." right={!readOnly && <button type="button" style={btn("")} onClick={() => openArbre(null)}>Nouvel arbre</button>}>Arbres</H2>
        {board("arbre", A_STEPS, null, arbres, a => (<button type="button" onClick={() => openArbre(a)} style={{ border: "none", background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", fontFamily: T.font, color: T.ink900 }}>
            <b style={{ fontFamily: T.fontMono, fontSize: FZ.sm }}>{a.num}</b><div style={{ fontSize: FZ.xs, color: T.ink500 }}>{a.ref ? a.ref + " · " : ""}{a.step === "b6" ? "Prêt à monter" : "Dispo le " + fmtD(addWD(T0(), Math.ceil(M.arbreReadyOffset(a) - 1e-9)))}</div>
          </button>),
          (a, c) => { const late = M.dur(c.id) && elapsed(a) > M.dur(c.id); const txt = c.id === "b6" ? "disponible" : c.id === "b0" ? (a.lancement ? "lancement " + fmtShort(parseD(a.lancement)) : "à lancer") : "J" + (elapsed(a) + 1) + (M.dur(c.id) ? " / " + Math.ceil(M.dur(c.id)) : ""); return late ? <b style={{ color: T.red600 }}>{txt}</b> : txt; })}
        {mounted.length > 0 && <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 6 }}>Arbres montés : {mounted.map(a => a.num + " sur " + ((M.live.find(t => t.arbreId === a.id) || {}).num || "")).join(", ")}</div>}
      </section>
    </div>);
  };

  const qty = (onMinus, n, onPlus, lab) => (<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    {!readOnly && <button type="button" aria-label={"Retirer " + lab} onClick={onMinus} style={{ ...btn(""), minWidth: 28, padding: 0 }}>−</button>}
    <b style={{ minWidth: 22, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{n}</b>
    {!readOnly && <button type="button" aria-label={"Ajouter " + lab} onClick={onPlus} style={{ ...btn(""), minWidth: 28, padding: 0 }}>+</button>}
  </span>);
  const thS = { fontSize: 12, color: T.ink500, fontWeight: 600, textAlign: "left", padding: "6px 8px", borderBottom: "1px solid " + T.line };
  const tdS = { padding: "6px 8px", borderTop: "1px solid " + T.line, fontSize: FZ.sm, verticalAlign: "top" };
  const renderStocks = () => {
    const roues = Object.values(S.roues).sort(byRef), injs = Object.values(S.injecteurs).sort(byRef);
    return (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 12, alignItems: "start" }}>
      <section aria-label="Roues équilibrées" style={card()}>
        <H2 right={!readOnly && <button type="button" style={btn("")} onClick={() => openStock("roues", null)}>Ajouter une référence</button>}>Roues équilibrées</H2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thS}>Référence</th><th style={thS}>Quantité</th><th style={thS} /></tr></thead><tbody>
          {roues.length === 0 && <tr><td colSpan={3} style={{ ...tdS, color: T.ink500 }}>Aucune référence.</td></tr>}
          {roues.map(r => <tr key={r.id}><td style={tdS}>{r.ref}</td><td style={tdS}>{qty(() => bumpQty("roues", r, -1), +r.qte || 0, () => bumpQty("roues", r, 1), "une roue " + r.ref)}</td><td style={{ ...tdS, textAlign: "right" }}>{!readOnly && <button type="button" style={btn("")} onClick={() => openStock("roues", r)}>Modifier</button>}</td></tr>)}
        </tbody></table>
      </section>
      <section aria-label="Injecteurs" style={card()}>
        <H2 right={!readOnly && <button type="button" style={btn("")} onClick={() => openStock("injecteurs", null)}>Ajouter une référence</button>}>Injecteurs</H2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thS}>Référence</th><th style={thS}>Vierges</th><th style={thS}>Avec bouchages</th><th style={thS} /></tr></thead><tbody>
          {injs.length === 0 && <tr><td colSpan={4} style={{ ...tdS, color: T.ink500 }}>Aucune référence.</td></tr>}
          {injs.map(r => <tr key={r.id}><td style={tdS}>{r.ref}<br /><span style={{ fontSize: FZ.xs, color: r.ouvertures ? T.ink500 : T.red600 }}>{r.ouvertures ? r.ouvertures + " ouvertures" : "ouvertures à renseigner"}</span></td>
            <td style={tdS}>{qty(() => bumpQty("injecteurs", r, -1), +r.qte || 0, () => bumpQty("injecteurs", r, 1), "un injecteur vierge " + r.ref)}</td>
            <td style={tdS}>{vars(r).length === 0 && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucun</span>}
              {vars(r).map(v => <div key={v.bouches} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>{qty(() => bumpVar(r, v.bouches, -1), v.qte, () => bumpVar(r, v.bouches, 1), "un injecteur " + v.bouches + " bouchages")}<span style={{ fontSize: FZ.xs, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>{v.bouches}/{r.ouvertures || "?"}</span></div>)}
              {!readOnly && <button type="button" style={{ ...btn(""), marginTop: 4 }} onClick={() => addVar(r)}>Ajouter un bouchage</button>}</td>
            <td style={{ ...tdS, textAlign: "right" }}>{!readOnly && <button type="button" style={btn("")} onClick={() => openStock("injecteurs", r)}>Modifier</button>}</td></tr>)}
        </tbody></table>
      </section>
    </div>);
  };

  const [pd, setPd] = useState(null); const [mail, setMail] = useState("");
  const renderParams = () => {
    const cur = pd || { d: { ...S.params.d }, l: { ...S.params.l } };
    const dOf = id => (cur.d[id] != null ? cur.d[id] : STEP[id].d), lOf = id => cur.l[id] != null ? cur.l[id] : M.lbl(id);
    const inp = { height: 30, border: "1px solid " + T.line, borderRadius: 6, background: T.card, color: T.ink900, padding: "0 8px", fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box" };
    const rows = steps => steps.map(s => <tr key={s.id}><td style={tdS}><input aria-label={"Nom de l'étape " + STEP[s.id].l} disabled={readOnly} value={lOf(s.id)} onChange={e => setPd({ ...cur, l: { ...cur.l, [s.id]: e.target.value } })} style={{ ...inp, width: "100%" }} /></td>
      <td style={{ ...tdS, width: 110 }}><input aria-label={"Durée en jours ouvrés de " + STEP[s.id].l} disabled={readOnly} type="number" min={0} step={0.5} value={dOf(s.id)} onChange={e => setPd({ ...cur, d: { ...cur.d, [s.id]: e.target.value } })} style={{ ...inp, width: 90, textAlign: "right", fontVariantNumeric: "tabular-nums" }} /></td></tr>);
    const grp = (title, ph, steps) => <><tr><td colSpan={2} style={{ ...tdS, fontWeight: 700, color: T.ink900, borderLeft: "4px solid " + (P[ph] || P.att).c, background: T.surface }}>{title}</td></tr>{rows(steps)}</>;
    const save = async () => { const p = { d: {}, l: {} };
      Object.keys(cur.d).forEach(id => { const v = parseFloat(String(cur.d[id]).replace(",", ".")); if (!isNaN(v) && v >= 0 && v !== STEP[id].d) p.d[id] = v; });
      Object.keys(cur.l).forEach(id => { const v = String(cur.l[id] || "").trim(); if (v && v !== STEP[id].l) p.l[id] = v; });
      if (await api.setParams(p)) { setPd(null); notify("Gamme enregistrée"); } };
    const access = Array.isArray(S.access) ? S.access : [];
    return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: FZ.sm, color: T.ink500, maxWidth: 820 }}>Les durées sont en jours ouvrés (lundi à vendredi). Elles alimentent les dates prévisionnelles de l'accueil. Pour l'équilibrage sous-traité, une date de retour saisie sur l'arbre remplace la durée standard.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 12, alignItems: "start" }}>
        <section aria-label="Étapes turbine" style={card()}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thS}>Étape turbine</th><th style={thS}>Durée (j)</th></tr></thead><tbody>
          {grp("Montage carter", "carter", T_STEPS.filter(s => s.ph === "carter"))}{grp("Assemblage / finition", "assy", T_STEPS.filter(s => s.ph === "assy"))}{grp("Tests", "tests", T_STEPS.filter(s => s.ph === "tests"))}
        </tbody></table></section>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section aria-label="Étapes arbre" style={card()}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thS}>Étape arbre</th><th style={thS}>Durée (j)</th></tr></thead><tbody>
            {grp("Arbre", "arbre", A_STEPS.filter(s => s.ph === "arbre"))}</tbody></table>
            {!readOnly && <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><button type="button" style={btn("primary")} onClick={save}>Enregistrer la gamme</button>
              <button type="button" style={btn("")} onClick={async () => { if (window.confirm("Revenir aux durées et noms d'étapes par défaut ?") && await api.setParams({ d: {}, l: {} })) { setPd(null); notify("Gamme remise par défaut"); } }}>Revenir aux valeurs par défaut</button></div>}
          </section>
          {owner && <section aria-label="Accès à la page" style={card()}>
            <H2 sub="propriétaire seulement">Accès à la page</H2>
            <div style={{ fontSize: FZ.xs, color: T.ink500, marginBottom: 8 }}>En plus de vous, ces comptes voient et modifient Production turbines (adresse de connexion au site).</div>
            {access.length === 0 && <Muted>Aucun compte ajouté.</Muted>}
            {access.map(m => <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, borderTop: "1px solid " + T.line, fontSize: FZ.sm }}><span style={{ flex: 1 }}>{m}</span><button type="button" style={btn("danger")} onClick={() => api.setAccess(access.filter(x => x !== m))}>Retirer</button></div>)}
            <form onSubmit={async e => { e.preventDefault(); const m = mail.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) { notify("Saisissez une adresse e-mail valide.", true); return; } if (!access.includes(m) && await api.setAccess([...access, m])) { setMail(""); notify(m + " a accès à Production turbines"); } }} style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input type="email" aria-label="Adresse e-mail à ajouter" placeholder="prenom.nom@enogia.com" value={mail} onChange={e => setMail(e.target.value)} style={{ ...inp, flex: 1 }} />
              <button type="submit" style={btn("primary")}>Ajouter</button>
            </form>
          </section>}
        </div>
      </div>
    </div>);
  };

  return (<div style={{ fontFamily: T.font }}>
    <PageHead title="Production turbines" accent={P.carter.c} sub={new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + (readOnly ? " · lecture seule" : "")} />
    <div role="tablist" aria-label="Sous-pages Production turbines" style={{ display: "flex", gap: 18, borderBottom: "1px solid " + T.line, marginBottom: 12, overflowX: "auto" }}>
      {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ border: "none", background: "transparent", padding: "8px 0", marginBottom: -1, borderBottom: "2px solid " + (tab === k ? T.ink900 : "transparent"), color: tab === k ? T.ink900 : T.ink500, fontWeight: tab === k ? 700 : 500, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap", minHeight: 32 }}>{l}</button>)}
    </div>
    <div key={tab} className="enogia-view-in">
      {tab === "accueil" && renderHome()}
      {tab === "planning" && renderPlanning()}
      {tab === "stocks" && renderStocks()}
      {tab === "parametres" && renderParams()}
    </div>
    {form && <FormDialog {...form} readOnly={readOnly} notify={notify} onClose={() => setForm(null)} />}
    {drag && drag.x != null && <div aria-hidden="true" style={{ position: "fixed", left: drag.x + 12, top: drag.y + 12, zIndex: 10020, pointerEvents: "none", background: T.ink900, color: T.card, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 700, fontFamily: T.fontMono, boxShadow: T.shadowLg }}>{(drag.kind === "turbine" ? S.turbines : S.arbres)[drag.id]?.num}{drag.target ? " → " + M.lbl(drag.target) : ""}</div>}
    {toast && <div role="status" aria-live="polite" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 10030, background: toast.err ? T.redFill : T.ink900, color: toast.err ? "#fff" : T.card, borderRadius: 10, padding: "8px 14px", fontSize: FZ.sm, fontWeight: 600, boxShadow: T.shadowLg, maxWidth: "min(560px,92vw)" }}><NavIcon name={toast.err ? "warning" : "check"} size={14} /> {toast.msg}</div>}
  </div>);
}
