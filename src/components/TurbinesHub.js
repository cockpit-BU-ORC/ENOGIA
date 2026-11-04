// v267 (demandé : « un seul onglet Turbines, avec la production turbines et la gestion des turbines pour les ORC ; les informations des
// turbines, des roues et des injecteurs ne sont vraies que dans la production turbines ») : page « Turbines » à deux sous-pages.
//  · Production : la page de Jérémie (ProdTurbines, échangée par le kit) — seul endroit où l'on saisit turbines, arbres, roues, injecteurs ;
//    la turbine est attribuée à un ORC par son champ « Affaire / client », proposé parmi les PJ du planning.
//  · (v267, remplacé en v270 par turbineNeeds.js : besoins PJ + SAV, turbines glissées) Besoins des ORC : rien à saisir — pour chaque PJ en cours, les turbines nécessaires d'après sa gamme, celles qui lui sont attribuées
//    dans la production, leur date de fin prévue (calcul de la production) et ce qui coince ; stocks de roues et d'injecteurs.
// Plus : « Importer des données (JSON) » (propriétaire et liste d’accès de la production, v268) pour reprendre les données de l'outil Claude de Jérémie, avec aperçu avant écriture.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { PageHead } from "./SharedUI";
import { ProdTurbines } from "./ProdTurbines";
import { usePointerDnD } from "../pointerDrag";
import { TURB_CFGS, cfgById, refsOf, buildNeeds, assignOps, unassignOps, demandesOf, prodState, workDate, pjOfAffaire } from "../turbineNeeds";
import { getPjMeta } from "../pjMeta";

const COLLS = ["turbines", "arbres", "pieces", "roues", "injecteurs"];
export { prodState, workDate, pjOfAffaire };
const fd = s => (s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) + "/" + String(s).slice(2, 4) : "—");

// v270 : fenêtre d'un besoin SAV (création / modification) — L hors du composant (sinon le champ perd le focus à chaque frappe)
const L = ({ l, children }) => <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: T.ink500 }}>{l}{children}</label>;
function SavDialog({ doc, init, onSave, onDelete, onClose }) {
  const [v, setV] = useState(() => ({ label: "", cfg: "100", roue: "", inj: "", date: "", note: "", ...(init || {}) }));
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const g = (cfgById(v.cfg) || TURB_CFGS[1]).g, roues = refsOf(doc, "roues", g), injs = refsOf(doc, "injecteurs", g);
  const f = { minHeight: 32, borderRadius: 6, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, padding: "0 8px", width: "100%", boxSizing: "border-box" };
  const btn = p => ({ minHeight: 34, padding: "0 14px", borderRadius: 8, border: "1px solid " + (p ? T.ink900 : T.line), background: p ? T.ink900 : T.card, color: p ? T.card : T.ink700, fontWeight: 700, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font });
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label={init ? "Besoin SAV " + (init.label || "") : "Nouveau besoin SAV"} style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(520px,100%)", padding: "16px 18px", fontFamily: T.font, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: FZ.lg, fontWeight: 600 }}>{init ? "Besoin SAV" : "Nouveau besoin SAV"}</div>
      <L l="Client / n° SAV"><input autoFocus value={v.label} onChange={e => setV({ ...v, label: e.target.value })} placeholder="Par exemple : SAV411 - Client" style={f} /></L>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <L l="Turbine"><select value={v.cfg} onChange={e => setV({ ...v, cfg: e.target.value })} style={f}>{TURB_CFGS.map(c => <option key={c.id} value={c.id}>{c.l}</option>)}</select></L>
        <L l="Pour le"><input type="date" value={v.date} onChange={e => setV({ ...v, date: e.target.value })} style={f} /></L>
        <L l="Roue"><select value={v.roue} onChange={e => setV({ ...v, roue: e.target.value })} style={f}><option value="">À choisir</option>{[...new Set([...roues, ...(v.roue ? [v.roue] : [])])].map(r => <option key={r} value={r}>{r}</option>)}</select></L>
        <L l="Injecteur"><select value={v.inj} onChange={e => setV({ ...v, inj: e.target.value })} style={f}><option value="">À choisir</option>{[...new Set([...injs, ...(v.inj ? [v.inj] : [])])].map(r => <option key={r} value={r}>{r}</option>)}</select></L>
      </div>
      <L l="Note"><input value={v.note} onChange={e => setV({ ...v, note: e.target.value })} style={f} /></L>
      <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Roues et injecteurs : les références de la production turbines ({g} kW).</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {onDelete && <button type="button" style={{ ...btn(false), color: T.red600, marginRight: "auto" }} onClick={onDelete}>Supprimer</button>}
        <button type="button" style={btn(false)} onClick={onClose}>Annuler</button>
        <button type="button" style={btn(true)} disabled={!v.label.trim()} onClick={() => onSave({ ...v, label: v.label.trim() })}>Enregistrer</button>
      </div>
    </div>
  </div>);
}

// v270 : Besoins = PJ en cours + SAV (cibles) ; turbines disponibles de la production (à glisser sur un besoin)
function NeedsView({ doc, api, rows, canEdit, savePjMeta }) {
  const [tick, setTick] = useState(0); // la fiche PJ (pjMetaOverrides) change sans changer rows : recalcul après une modification ici
  const { needs, free } = useMemo(() => buildNeeds(doc, rows, r => getPjMeta(r.pj, r)), [doc, rows, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const dnd = usePointerDnD();
  const [msg, setMsg] = useState(null), [sav, setSav] = useState(null), [busy, setBusy] = useState(false), [onlyOpen, setOnlyOpen] = useState(true);
  const run = async ops => { setBusy(true); let ok = true; for (const w of ops.writes) { if (!(await api.put(w.c, w.id, w.data))) { ok = false; break; } } setBusy(false);
    setMsg(ok ? { t: ops.msg + (ops.warn ? " · " + ops.warn : ""), warn: !!ops.warn } : { t: "L'enregistrement a échoué.", bad: true }); };
  const assign = (tid, need) => { if (busy) return; const x = free.find(y => y.id === tid); if (!x || !canEdit) return;
    if (need.cfg && x.gamme !== need.cfg.g && !window.confirm(x.num + " est une turbine " + x.gamme + " kW ; le besoin est en " + need.cfg.g + " kW. L'attribuer quand même ?")) return;
    if (x.ready && !window.confirm(x.num + " est prête : elle sort du stock de la production" + (need.inj ? " avec un injecteur " + need.inj : "") + ". Continuer ?")) return;
    run(assignOps(doc, x, need)); };
  const unassign = x => { if (!canEdit) return; if (x.livree && !x.raw.sortieOrc) { setMsg({ t: x.num + " a été livrée par la production : retirez-la dans la production.", warn: true }); return; } run(unassignOps(doc, x)); };
  const setNeed = (n, patch) => { if (n.kind === "pj") { if (savePjMeta) Promise.resolve(savePjMeta(n.pj, patch)).then(() => setTick(x => x + 1)); } else api.put("besoins", n.id, { ...n.raw, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k.replace(/^turb(.)/, (m, c) => c.toLowerCase()), v])) }); };
  const saveSav = async v => { const id = (sav && sav.id) || "s" + Date.now().toString(36); const data = { label: v.label, cfg: v.cfg, roue: v.roue, inj: v.inj, date: v.date, note: v.note, at: new Date().toISOString() };
    if (await api.put("besoins", id, data)) { setSav(null); setMsg({ t: "Besoin SAV « " + v.label + " » enregistré." }); } };
  const delSav = async () => { if (!sav || !window.confirm("Supprimer le besoin SAV « " + sav.label + " » ? Les turbines attribuées redeviennent disponibles.")) return;
    const n = needs.find(x => x.key === "sav:" + sav.id); if (n) for (const x of n.got) await run(unassignOps(doc, x)); await api.del("besoins", sav.id); setSav(null); };
  const shown = needs.filter(n => !onlyOpen || n.want > n.got.length || n.issues.some(i => i.bad));
  const missing = needs.reduce((s, n) => s + Math.max(0, n.want - n.got.length), 0), bad = needs.filter(n => n.issues.some(i => i.bad)).length;
  const card = { background: T.card, border: "1px solid " + T.line, borderRadius: 10, padding: "12px 14px" };
  const sel = { minHeight: 28, borderRadius: 6, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.xs, fontFamily: T.font, maxWidth: 150 };
  const chip = (x, on) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", minHeight: 26, borderRadius: 6, fontSize: FZ.xs, fontFamily: T.font, border: "1px solid " + (x.ready || x.livree ? T.emerald500 : T.line), background: x.ready || x.livree ? T.emerald100 : T.surface, color: T.ink900, boxSizing: "border-box", opacity: on ? 0.35 : 1 });
  const turbLine = x => <><b style={{ fontFamily: T.fontMono }}>{x.num || "sans n°"}</b><span style={{ color: T.ink700 }}>{x.livree ? "sortie le " + fd(x.livree) : x.ready ? "prête" : x.step + (x.end ? " · fin " + fd(x.end) : "")}</span>{x.roue && <span style={{ color: T.ink500 }}>roue {x.roue}</span>}</>;
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <PageHead title="Besoins des ORC et du SAV" sub="Glissez une turbine disponible sur un PJ ou un besoin SAV. Une turbine prête sort du stock de la production ; les besoins s'affichent dans son planning (Production › Accueil)." right={canEdit && <button type="button" onClick={() => setSav({})} style={{ border: "1px solid " + T.ink900, background: T.ink900, color: T.card, borderRadius: 8, padding: "0 14px", minHeight: 34, fontSize: FZ.sm, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>＋ Besoin SAV</button>} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
      {[["Besoins suivis", needs.length, ""], ["Turbines à attribuer", missing, missing ? "bad" : ""], ["Besoins avec un problème", bad, bad ? "bad" : ""], ["Turbines disponibles", free.length, free.filter(x => x.ready).length + " prête" + (free.filter(x => x.ready).length > 1 ? "s" : "")]].map(([l, v, sub]) => (
        <div key={l} style={card}><div style={{ fontSize: 12, color: T.ink500 }}>{l}</div><div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, color: sub === "bad" ? T.red600 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{v}</div>{sub && sub !== "bad" && <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{sub}</div>}</div>))}
    </div>
    {msg && <div role="status" style={{ fontSize: FZ.sm, fontWeight: 600, color: msg.bad ? T.red600 : msg.warn ? T.amber600 : T.emerald600, display: "flex", gap: 8, alignItems: "center" }}>{msg.t}<button type="button" aria-label="Fermer le message" onClick={() => setMsg(null)} style={{ border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 24, minHeight: 24 }}>×</button></div>}
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(240px,300px)", gap: 12, alignItems: "start" }} className="enogia-needs-grid">
      <section aria-label="Besoins" style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid " + T.line }}>
          <b style={{ fontSize: FZ.md }}>Besoins</b><span style={{ fontSize: FZ.xs, color: T.ink500 }}>triés par date de besoin (PJ : arrivée de la machine)</span><span style={{ flex: 1 }} />
          <label style={{ fontSize: FZ.xs, color: T.ink700, display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} />À traiter seulement</label>
        </div>
        <div style={{ maxHeight: "68vh", overflowY: "auto" }}>
          {shown.map(n => { const g = n.cfg ? n.cfg.g : null, roues = refsOf(doc, "roues", g), injs = refsOf(doc, "injecteurs", g), isOver = dnd.over === n.key, okDrop = dnd.drag && (!g || dnd.drag.g === g);
            return <div key={n.key} {...(canEdit ? dnd.dropProps(n.key, () => true, d => assign(d.id, n)) : {})}
              style={{ padding: "10px 14px", borderBottom: "1px solid " + T.line, background: isOver ? (okDrop ? T.emerald100 : T.amber100) : dnd.drag ? T.surface : "transparent", boxShadow: isOver ? "inset 3px 0 0 " + (okDrop ? T.emerald600 : T.amber600) : "none", transition: "background 120ms" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <b style={{ fontFamily: T.fontMono, fontSize: FZ.sm }}>{n.label}</b>
                <span style={{ fontSize: 11, fontWeight: 700, color: n.kind === "sav" ? T.amber600 : T.ink500, border: "1px solid " + (n.kind === "sav" ? T.amber500 : T.line), borderRadius: 999, padding: "0 7px" }}>{n.kind === "sav" ? "SAV" : n.r.gamme || "PJ"}</span>
                <span style={{ fontSize: FZ.xs, color: T.ink500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{n.sub}</span>
                <span style={{ marginLeft: "auto", fontSize: FZ.xs, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>pour le <b>{fd(n.date)}</b></span>
                {n.kind === "sav" && canEdit && <button type="button" onClick={() => setSav({ id: n.id, ...n.raw })} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 6, minHeight: 26, padding: "0 8px", fontSize: FZ.xs, cursor: "pointer", fontFamily: T.font }}>Modifier</button>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                <select aria-label={"Turbine pour " + n.label} disabled={!canEdit && n.kind === "sav"} value={n.cfg ? n.cfg.id : ""} onChange={e => setNeed(n, { turbCfg: e.target.value || null })} style={sel}>{n.kind === "pj" && <option value="">{n.cfg && !n.cfgSet ? "(gamme)" : "—"}</option>}{TURB_CFGS.map(c => <option key={c.id} value={c.id}>{c.l}{n.kind === "pj" && !n.cfgSet && n.cfg && n.cfg.id === c.id ? " (gamme)" : ""}</option>)}</select>
                <select aria-label={"Roue pour " + n.label} value={n.roue} onChange={e => setNeed(n, { turbRoue: e.target.value })} style={sel}><option value="">Roue à choisir</option>{[...new Set([...roues, ...(n.roue ? [n.roue] : [])])].map(r => <option key={r} value={r}>Roue {r}</option>)}</select>
                <select aria-label={"Injecteur pour " + n.label} value={n.inj} onChange={e => setNeed(n, { turbInj: e.target.value })} style={sel}><option value="">Injecteur à choisir</option>{[...new Set([...injs, ...(n.inj ? [n.inj] : [])])].map(r => <option key={r} value={r}>Injecteur {r}</option>)}</select>
                <span style={{ fontSize: FZ.xs, color: n.got.length >= n.want ? T.emerald600 : T.ink700, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n.got.length} / {n.want} turbine{n.want > 1 ? "s" : ""}</span>
                {canEdit && n.got.length < n.want && free.length > 0 && <select aria-label={"Attribuer une turbine à " + n.label} value="" onChange={e => e.target.value && assign(e.target.value, n)} style={sel}><option value="">Attribuer…</option>{free.filter(x => !g || x.gamme === g).map(x => <option key={x.id} value={x.id}>{x.num} · {x.ready ? "prête" : "fin " + fd(x.end)}</option>)}</select>}
              </div>
              {(n.got.length > 0 || (dnd.drag && n.got.length < n.want)) && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {n.got.map(x => <span key={x.id} style={chip(x)}>{turbLine(x)}{canEdit && <button type="button" aria-label={"Retirer " + x.num + " de " + n.label} title="Retirer l'attribution" onClick={() => unassign(x)} style={{ border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 20, minHeight: 20, padding: 0 }}>×</button>}</span>)}
                {dnd.drag && n.got.length < n.want && <span style={{ ...chip({}), borderStyle: "dashed", color: T.ink500 }}>déposer ici</span>}
              </div>}
              {n.issues.length > 0 && <div style={{ marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>{n.issues.map((i, k) => <span key={k} style={{ fontSize: FZ.xs, fontWeight: 600, color: i.bad ? T.red600 : T.ink500 }}>{i.t}</span>)}</div>}
            </div>; })}
          {!shown.length && <div style={{ padding: 20, textAlign: "center", color: T.ink500, fontSize: FZ.sm }}>{needs.length ? "Tous les besoins sont couverts. Décochez « À traiter seulement » pour tout voir." : "Aucun PJ en cours avec une turbine, ni besoin SAV."}</div>}
        </div>
      </section>
      <section aria-label="Turbines disponibles" style={{ ...card, position: "sticky", top: 8, maxHeight: "80vh", overflowY: "auto" }}>
        <b style={{ fontSize: FZ.md }}>Turbines disponibles</b>
        <div style={{ fontSize: FZ.xs, color: T.ink500, margin: "2px 0 8px", lineHeight: 1.45 }}>Production turbines, non attribuées et non livrées. {canEdit ? "Glissez-en une sur un besoin." : ""}</div>
        {["100", "20"].map(g => { const L = free.filter(x => x.gamme === g); return <div key={g} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink700, margin: "4px 0" }}>{g} kW · {L.length}</div>
          {L.length ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{L.map(x => <div key={x.id} {...(canEdit ? dnd.dragProps({ id: x.id, g: x.gamme }) : {})} title={(x.affaire ? "Affaire : « " + x.affaire + " » · " : "") + (canEdit ? "Glisser sur un besoin" : "")}
            style={{ ...chip(x, dnd.drag && dnd.drag.id === x.id), cursor: canEdit ? "grab" : "default", display: "flex", flexWrap: "wrap", touchAction: "none" }}>{turbLine(x)}{x.affaire && <span style={{ color: T.amber600, width: "100%" }}>« {x.affaire} »</span>}</div>)}</div>
            : <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucune.</div>}
        </div>; })}
      </section>
    </div>
    {sav && <SavDialog doc={doc} init={sav.id ? sav : null} onSave={saveSav} onDelete={sav.id ? delSav : null} onClose={() => setSav(null)} />}
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

const TABS = [["prod", "Production"], ["orc", "Besoins ORC et SAV"]];
export function TurbinesHub({ doc, api, rows, canEdit, owner, savePjMeta }) {
  const [tab, setTab] = useState(() => { try { const v = localStorage.getItem("enogia_turbines_tab"); return TABS.some(t => t[0] === v) ? v : "prod"; } catch (e) { return "prod"; } });
  useEffect(() => { try { localStorage.setItem("enogia_turbines_tab", tab); } catch (e) { /* stockage indisponible */ } }, [tab]);
  const [imp, setImp] = useState(false);
  const pjs = useMemo(() => (rows || []).filter(r => r && r.pj && r.etat !== "SHIPPED" && r.etat !== "SLOT_LIBRE").map(r => r.pj + (getPjMeta(r.pj, r).nomProjet ? " - " + getPjMeta(r.pj, r).nomProjet : "")), [rows]);
  const top = useRef(null);
  // v270 : besoins ORC / SAV transmis au planning de la production (« on attend cette turbine avec cette roue et cet injecteur pour telle date »)
  const demandes = useMemo(() => demandesOf(buildNeeds(doc, rows, r => getPjMeta(r.pj, r)).needs), [doc, rows]);
  return (<div ref={top}>
    <div style={{ display: "flex", alignItems: "center", gap: 18, borderBottom: "1px solid " + T.line, marginBottom: 12, flexWrap: "wrap" }}>
      <div role="tablist" aria-label="Turbines" style={{ display: "flex", gap: 18 }}>
        {TABS.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{ border: "none", background: "transparent", padding: "8px 0", minHeight: 36, cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: tab === id ? 700 : 500, color: tab === id ? T.ink900 : T.ink500, borderBottom: "2px solid " + (tab === id ? T.ink900 : "transparent"), marginBottom: -1 }}>{l}</button>)}
      </div>
      <span style={{ flex: 1 }} />
      {/* v268 (demandé : « mettre à disposition le bouton importer à Jérémie ») : toute personne qui peut modifier la production (propriétaire + liste d’accès) */}
      {canEdit && tab === "prod" && <button type="button" onClick={() => setImp(true)} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "4px 12px", minHeight: 30, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Importer des données (JSON)</button>}
    </div>
    {tab === "prod" ? <ProdTurbines doc={doc} api={api} canEdit={canEdit} owner={owner} pjs={pjs} demandes={demandes} /> : <NeedsView doc={doc} api={api} rows={rows} canEdit={canEdit} savePjMeta={savePjMeta} />}
    {imp && <ImportDialog doc={doc} api={api} onClose={() => setImp(false)} />}
  </div>);
}
