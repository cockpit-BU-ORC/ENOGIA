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
import { createPortal } from "react-dom";
import { TURB_CFGS, cfgById, refsOf, buildNeeds, assignOps, unassignOps, allocOps, unallocOps, stockTiles, injInfo, maxBouches, autoFill, roueConflict, prodState, workDate, pjOfAffaire } from "../turbineNeeds";
import { getPjMeta, CountryFlag } from "../pjMeta";

const COLLS = ["turbines", "arbres", "pieces", "roues", "injecteurs"];
export { prodState, workDate, pjOfAffaire };
const fd = s => (s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) + "/" + String(s).slice(2, 4) : "—");

// v270 : fenêtre d'un besoin SAV (création / modification) — L hors du composant (sinon le champ perd le focus à chaque frappe)
const L = ({ l, children }) => <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: T.ink500 }}>{l}{children}</label>;
function SavDialog({ doc, init, onSave, onDelete, onClose }) {
  const [v, setV] = useState(() => ({ label: "", cfg: "100", roue: "", inj: "", injB: "", date: "", note: "", ...(init || {}) }));
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const g = (cfgById(v.cfg) || TURB_CFGS[1]).g, roues = refsOf(doc, "roues", g), injs = refsOf(doc, "injecteurs", g), ii = v.inj ? injInfo(doc, v.inj) : null, mx = ii ? maxBouches(ii.ouv) : 99;
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
        <L l={"Bouchages" + (ii && ii.ouv ? " (sur " + ii.ouv + " ouvertures)" : "")}><input type="number" min={0} max={mx} value={v.injB} onChange={e => setV({ ...v, injB: e.target.value === "" ? "" : String(Math.max(0, Math.min(mx, Math.round(+e.target.value || 0)))) })} placeholder="aucun" style={f} /></L>
      </div>
      <L l="Note"><input value={v.note} onChange={e => setV({ ...v, note: e.target.value })} style={f} /></L>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {onDelete && <button type="button" style={{ ...btn(false), color: T.red600, marginRight: "auto" }} onClick={onDelete}>Supprimer</button>}
        <button type="button" style={btn(false)} onClick={onClose}>Annuler</button>
        <button type="button" style={btn(true)} disabled={!v.label.trim()} onClick={() => onSave({ ...v, label: v.label.trim() })}>Enregistrer</button>
      </div>
    </div>
  </div>);
}

// v271 : petite fenêtre de choix ancrée sur le jeton cliqué (configuration, roue, injecteur + bouchages)
function ChoicePop({ anchor, title, options, value, onPick, onClose, extra }) {
  const ref = useRef(null);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }, d = e => { if (ref.current && !ref.current.contains(e.target) && !(anchor && anchor.contains(e.target))) onClose(); };
    window.addEventListener("keydown", k); document.addEventListener("pointerdown", d); const b = ref.current && ref.current.querySelector("button"); if (b) b.focus({ preventScroll: true });
    return () => { window.removeEventListener("keydown", k); document.removeEventListener("pointerdown", d); }; }, [anchor, onClose]);
  const r = anchor ? anchor.getBoundingClientRect() : { left: 0, bottom: 0 };
  return createPortal(<div ref={ref} role="dialog" aria-label={title} className="enogia-bell-peek" style={{ position: "fixed", left: Math.max(8, Math.min(r.left, window.innerWidth - 300)), top: Math.min(r.bottom + 6, window.innerHeight - 220), width: 288, zIndex: 10020, background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: 10, transformOrigin: "top left", fontFamily: T.font }}>
    <div style={{ fontSize: 12, color: T.ink500, fontWeight: 600, marginBottom: 6 }}>{title}</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(o => <button key={o.v} type="button" aria-pressed={o.v === value} onClick={() => onPick(o.v)} style={{ border: "1px solid " + (o.v === value ? T.ink900 : T.line), background: o.v === value ? T.ink900 : T.card, color: o.v === value ? T.card : T.ink900, borderRadius: 8, minHeight: 32, padding: "0 10px", fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font, display: "inline-flex", gap: 6, alignItems: "center" }}>
        {o.l}{o.q != null && <span style={{ fontSize: FZ.xs, fontVariantNumeric: "tabular-nums", color: o.v === value ? T.card : o.q > 0 ? T.ink500 : T.red600, opacity: o.v === value ? 0.8 : 1 }}>{o.q}</span>}</button>)}
      {!options.length && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucune référence dans la production turbines.</span>}
    </div>
    {extra}
  </div>, document.body);
}

// v272 (maquette « Besoins v2 » validée, audit apple-design) : un plateau par turbine attendue (turbine · roue · injecteur), la pièce prévue
// écrite en filigrane dans son logement ; pendant le glisser, les logements qui acceptent la pièce s'allument, celui dont la référence
// correspond passe en vert, les autres s'effacent ; la pièce atterrit dans son logement. Toucher une tuile puis un logement = même chose
// (clavier, tablette). Clic sur un logement vide sans pièce choisie = choisir la référence prévue. « Remplir automatiquement » propose
// une affectation du stock (annulable). Anneau d'avancement par PJ, barre « % des pièces attribuées ». × = retour au stock.
const fdS = s => (s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) : "—");
const wkOf = iso => { if (!iso) return "Sans date"; const d = new Date(iso + "T12:00:00"), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return "Semaine " + Math.ceil(((t - y0) / 86400000 + 1) / 7) + " · " + t.getUTCFullYear(); };
const U2 = v => String(v || "").trim().toUpperCase();
const NEEDS_CSS = `
.enogia-nd-glass{background:color-mix(in srgb, var(--nd-bg) 80%, transparent);backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%)}
.enogia-nd-tile{transition:transform 120ms cubic-bezier(.2,.8,.2,1),box-shadow 120ms,opacity 160ms}
.enogia-nd-tile:active{transform:scale(.97)}
.enogia-nd-sock{transition:background 140ms,box-shadow 140ms,transform 180ms cubic-bezier(.2,.8,.2,1),opacity 140ms}
.enogia-nd-land{animation:enogiaNdLand 260ms cubic-bezier(.2,.8,.2,1)}
@keyframes enogiaNdLand{0%{transform:scale(1.06)}100%{transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.enogia-nd-land{animation:none}.enogia-nd-sock,.enogia-nd-tile{transition:none}}
@media (prefers-reduced-transparency: reduce){.enogia-nd-glass{background:var(--nd-bg);backdrop-filter:none;-webkit-backdrop-filter:none}}
@media (max-width: 860px){.enogia-nd-app{grid-template-columns:1fr !important;height:auto !important}.enogia-nd-stock{position:static !important;max-height:none !important}.enogia-nd-need{grid-template-columns:1fr !important}}`;
function Ring({ p }) { const c = 2 * Math.PI * 9; return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="9" fill="none" stroke={T.surfaceAlt} strokeWidth="3" /><circle cx="11" cy="11" r="9" fill="none" stroke={T.emerald500} strokeWidth="3" strokeLinecap="round" strokeDasharray={(c * p) + " " + c} transform="rotate(-90 11 11)" style={{ transition: "stroke-dasharray 300ms cubic-bezier(.2,.8,.2,1)" }} /></svg>; }
function Tile({ ctx, p, k, title, sub, q, disabled }) { const { dnd, canEdit, setPicked, isPicked } = ctx; const on = !!(dnd.drag && (p.kind === "turbine" ? dnd.drag.id === p.id : dnd.drag.stockId === p.stockId && String(dnd.drag.bouches) === String(p.bouches)));
    return <div role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled || undefined} aria-pressed={isPicked(p)} className="enogia-nd-tile" aria-label={title + " " + sub + (q != null ? ", " + q + " en stock" : "")}
      {...(canEdit && !disabled ? dnd.dragProps(p) : {})}
      onClick={() => { if (!canEdit || disabled) return; setPicked(isPicked(p) ? null : p); }}
      onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && canEdit && !disabled) { e.preventDefault(); setPicked(isPicked(p) ? null : p); } }}
      style={{ position: "relative", background: T.card, borderRadius: 10, padding: "6px 9px 6px 13px", minHeight: 46, height: 46, boxSizing: "border-box", boxShadow: "0 0 0 " + (isPicked(p) ? "2px " + T.teal600 : "1px " + T.line), cursor: canEdit && !disabled ? "grab" : "default", touchAction: "none", userSelect: "none", opacity: on ? 0.25 : disabled ? 0.45 : 1, fontFamily: T.font }}>
      <span aria-hidden="true" style={{ position: "absolute", left: 4, top: 8, bottom: 8, width: 3, borderRadius: 2, background: k }} />
      <div style={{ fontWeight: 700, fontSize: 12.5, fontFamily: p.kind === "turbine" ? T.fontMono : T.font, paddingRight: q != null ? 18 : 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      <div style={{ fontSize: 11.5, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
      {q != null && <span style={{ position: "absolute", top: 6, right: 8, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: q ? T.ink700 : T.red600 }}>{q}</span>}
    </div>; }
function Sock({ ctx, n, s, kind, label, want, filled, children }) {
    const { dnd, canEdit, picked, active, landed, drop, setMsg, setPop } = ctx;
    const key = n.key + "#" + s.i + ":" + kind, g = n.cfg.g;
    const acc = p => !!p && !filled && p.kind === kind && (!p.g || p.g === g);
    const can0 = active && acc(active);
    // v274 : turbine portant une autre roue, ou roue d'une autre référence = refusée (rouge) ; le dépôt donne le message d'erreur
    const refused = can0 && n.roue && ((kind === "turbine" && roueConflict({ roue: active.roue, sansRoue: !active.roue }, n)) || (kind === "roue" && U2(active.ref) !== U2(n.roue)));
    const can = can0 && !refused, match = can && want && (kind === "turbine" ? !!active.roue : U2((active.ref || "")) === U2(kind === "roue" ? n.roue : n.inj)), over = dnd.over === key && can, overBad = dnd.over === key && refused;
    return <div {...(canEdit ? dnd.dropProps(key, acc, d => drop(n, s.i, d)) : {})} className={"enogia-nd-sock" + (landed === key ? " enogia-nd-land" : "")}
      role={!filled ? "button" : undefined} tabIndex={!filled ? 0 : undefined} aria-label={!filled ? label + " pour " + n.label + (want ? ", prévu " + want : "") : undefined}
      onClick={!filled ? (e => { if (!canEdit) return; if (picked) { if (acc(picked)) drop(n, s.i, picked); else setMsg({ t: "Cette pièce ne va pas dans ce logement.", warn: true }); } else if (kind !== "turbine") setPop({ n, kind: kind === "roue" ? "roue" : "inj", el: e.currentTarget }); }) : undefined}
      onKeyDown={!filled ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }) : undefined}
      style={{ flex: "1 1 0", minWidth: 0, minHeight: 44, borderRadius: 8, padding: "5px 9px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 8, cursor: !filled && canEdit ? "pointer" : "default",
        background: refused ? T.red100 : over || match ? T.emerald100 : can ? T.teal100 : filled ? T.card : "transparent",
        boxShadow: overBad ? "inset 0 0 0 2px " + T.red600 : refused ? "inset 0 0 0 1.5px " + T.red500 : over ? "inset 0 0 0 2px " + T.emerald500 + ", 0 6px 16px rgba(45,106,79,.18)" : match ? "inset 0 0 0 2px " + T.emerald500 : can ? "inset 0 0 0 1.5px " + T.teal500 : filled ? "0 1px 2px rgba(16,24,40,.06)" : "none",
        transform: over ? "scale(1.03)" : "none", opacity: active && !can0 && !filled ? 0.35 : 1 }}>
      {filled ? children : <div style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 11, fontWeight: 600, color: refused ? T.red600 : T.ink500 }}>{refused ? "Refusé : roue " + n.roue + " prévue" : label}</span>
        <span style={{ fontSize: 12.5, fontWeight: want ? 700 : 600, color: want ? T.teal600 : T.amber600, opacity: want ? 0.8 : 1 }}>{want || (kind === "turbine" ? "glisser une turbine" : "à choisir")}</span></div>}
    </div>;
  }
function NeedsView({ doc, api, rows, canEdit, savePjMeta }) {
  const [tick, setTick] = useState(0); // la fiche PJ (pjMetaOverrides) change sans changer rows : recalcul après une modification ici
  const { needs, free } = useMemo(() => buildNeeds(doc, rows, r => getPjMeta(r.pj, r)), [doc, rows, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const dnd = usePointerDnD();
  const docRef = useRef(doc); docRef.current = doc;
  const [gam, setGam] = useState("100"), [msg, setMsg] = useState(null), [sav, setSav] = useState(null), [busy, setBusy] = useState(false), [onlyOpen, setOnlyOpen] = useState(true), [pop, setPop] = useState(null), [picked, setPicked] = useState(null), [landed, setLanded] = useState(null);
  useEffect(() => { if (!msg) return undefined; const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); }, [msg]);
  useEffect(() => { if (!picked) return undefined; const k = e => { if (e.key === "Escape") setPicked(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [picked]);
  useEffect(() => { if (!landed) return undefined; const t = setTimeout(() => setLanded(null), 300); return () => clearTimeout(t); }, [landed]);
  const stock = useMemo(() => stockTiles(doc, gam), [doc, gam]);
  const run = async (ops, undo, land) => { if (ops.error) { setMsg({ t: ops.error, bad: true }); return false; } setBusy(true); let ok = true;
    for (const w of ops.writes || []) { if (!(await api.put(w.c, w.id, w.data))) { ok = false; break; } }
    if (ok) for (const d of ops.dels || []) { if (!(await api.del(d.c, d.id))) { ok = false; break; } }
    setBusy(false); if (ok && land) setLanded(land);
    setMsg(ok ? { t: ops.msg + (ops.warn ? " · " + ops.warn : ""), warn: !!ops.warn, undo } : { t: "L'enregistrement a échoué.", bad: true }); return ok; };
  const tileOf = d => (d.kind === "roue" ? stock.roues : stockTiles(docRef.current, d.g).injs).find(y => y.stockId === d.stockId && (d.kind === "roue" || String(y.bouches) === String(d.bouches))) || (d.kind === "roue" ? stockTiles(docRef.current, d.g).roues.find(y => y.stockId === d.stockId) : null);
  const drop = (need, slot, d) => { if (busy || !canEdit || !d) return; setPicked(null);
    if (d.kind === "turbine") { const x = free.find(y => y.id === d.id); if (!x) return;
      return run(assignOps(doc, x, need), () => { const d0 = docRef.current || {}, t = (d0.turbines || {})[x.id]; if (t) run(unassignOps(d0, { ...x, raw: { ...t, id: x.id } })); }, need.key + "#" + slot + ":turbine"); }
    const id = "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    run(allocOps(doc, need, slot, tileOf(d), new Date(), () => id), () => { const a = ((docRef.current || {}).allocs || {})[id]; if (a) run(unallocOps(docRef.current, { id, ...a })); }, need.key + "#" + slot + ":" + d.kind);
  };
  const outTurbine = x => { if (!canEdit) return; if (x.livree && !x.raw.sortieOrc) { setMsg({ t: x.num + " a été livrée par la production : retirez-la dans la production.", warn: true }); return; } run(unassignOps(doc, x)); };
  const outAlloc = a => canEdit && run(unallocOps(doc, a));
  const setNeed = (n, patch) => { if (n.kind === "pj") { if (savePjMeta) Promise.resolve(savePjMeta(n.pj, patch)).then(() => setTick(x => x + 1)); }
    else api.put("besoins", n.id, { ...n.raw, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k.replace(/^turb(.)/, (m, c) => c.toLowerCase()), v])) }); };
  const auto = async () => { if (!canEdit || busy) return; const plan = autoFill(doc, needs, free);
    if (!plan.count) { setMsg({ t: "Rien à proposer : le stock ne contient pas les pièces prévues.", warn: true }); return; }
    const ok = await run({ writes: plan.writes, msg: plan.count + " pièce" + (plan.count > 1 ? "s" : "") + " attribuée" + (plan.count > 1 ? "s" : "") + " depuis le stock" }, async () => {
      const d0 = docRef.current || {};
      for (const id of plan.allocs) { const a = (d0.allocs || {})[id]; if (a) { const o = unallocOps(docRef.current, { id, ...a }); for (const w of o.writes) await api.put(w.c, w.id, w.data); for (const x of o.dels) await api.del(x.c, x.id); } }
      for (const id of plan.turbs) { const t = ((docRef.current || {}).turbines || {})[id]; if (t) { const o = unassignOps(docRef.current, { id, num: t.num, raw: { ...t, id } }); for (const w of o.writes) await api.put(w.c, w.id, w.data); } }
      setMsg({ t: "Remplissage annulé : tout est revenu dans le stock." }); });
    return ok; };
  const saveSav = async v => { const id = (sav && sav.id) || "s" + Date.now().toString(36); const data = { label: v.label, cfg: v.cfg, roue: v.roue, inj: v.inj, injB: v.injB === "" ? null : +v.injB, date: v.date, note: v.note, at: new Date().toISOString() };
    if (await api.put("besoins", id, data)) { setSav(null); setMsg({ t: "Besoin SAV « " + v.label + " » enregistré." }); } };
  const delSav = async () => { if (!sav || !window.confirm("Supprimer le besoin SAV « " + sav.label + " » ? Turbines, roues et injecteurs attribués retournent dans le stock.")) return;
    const n = needs.find(x => x.key === "sav:" + sav.id); if (n) { for (const s of n.slots) { if (s.roue) await run(unallocOps(doc, s.roue)); if (s.inj) await run(unallocOps(doc, s.inj)); if (s.t) await run(unassignOps(doc, s.t)); } }
    await api.del("besoins", sav.id); setSav(null); };
  const shown = needs.filter(n => !onlyOpen || !n.complete || n.issues.some(i => i.bad));
  const tot = needs.reduce((s, n) => s + n.want * 3, 0), got = needs.reduce((s, n) => s + n.slots.filter(x => !x.extra).reduce((a, x) => a + !!x.t + !!x.roueOk + !!x.inj, 0), 0), pct = tot ? Math.round(got / tot * 100) : 100;
  const missT = needs.reduce((s, n) => s + Math.max(0, n.want - n.got.length), 0), missR = needs.reduce((s, n) => s + n.roueMiss, 0), missI = needs.reduce((s, n) => s + n.injMiss, 0);
  const freeG = free.filter(x => x.gamme === gam).sort((a, b) => (b.ready - a.ready) || (b.sansRoue - a.sansRoue) || String(a.end || "9").localeCompare(String(b.end || "9")));
  const active = dnd.drag || picked;
  const isPicked = p => picked && picked.kind === p.kind && (p.kind === "turbine" ? picked.id === p.id : picked.stockId === p.stockId && String(picked.bouches) === String(p.bouches));
  // tuile du stock : liseré de couleur (vert prête, ambre sans roue, gris en fabrication ; bleu roues, violet injecteurs), quantité en haut à droite
  const Grp = ({ t, n, children }) => <div style={{ padding: "4px 12px 10px" }}><div style={{ display: "flex", justifyContent: "space-between", margin: "8px 0 6px", fontSize: 12, fontWeight: 600, color: T.ink500 }}><span>{t}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{n}</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(122px,1fr))", gap: 6 }}>{children}</div></div>;
  const none = <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucune.</span>;
  // logement d'un plateau
  const xBtn = (lab, fn) => canEdit && <button type="button" data-no-drag aria-label={lab} title="Remettre dans le stock" onClick={e => { e.stopPropagation(); fn(); }} style={{ marginLeft: "auto", border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 24, minHeight: 24, borderRadius: 6, fontSize: 15, lineHeight: 1 }}>×</button>;
  const Val = ({ lab, v, mono, note, bad }) => <div style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.ink500 }}>{lab}</span><span style={{ fontWeight: 700, fontSize: 12.5, fontFamily: mono ? T.fontMono : T.font }}>{v}</span> <span style={{ fontSize: 11, fontWeight: bad ? 700 : 600, color: bad ? T.red600 : T.emerald600 }}>{note}</span></div>;
  const injTxt = n => n.inj ? n.inj + (n.injB ? " · " + n.injB + " bouch." : "") : "";
  const ctx = { dnd, canEdit, picked, setPicked, isPicked, active, landed, drop, setMsg, setPop };
  let lastWk = "";
  return (<div style={{ display: "flex", flexDirection: "column", gap: 10, "--nd-bg": T.card }}>
    <style>{NEEDS_CSS}</style>
    <PageHead title="Besoins ORC et SAV" sub="Glissez (ou touchez puis posez) une turbine, une roue ou un injecteur du stock dans le plateau d'un PJ : le stock de la production se met à jour. × la remet." />
    <div className="enogia-nd-app" style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 16, overflow: "hidden", display: "grid", gridTemplateColumns: "300px minmax(0,1fr)", height: "min(78vh, 900px)" }}>
      <aside className="enogia-nd-stock" aria-label="Stock de la production turbines" style={{ background: T.surface, borderRight: "1px solid " + T.line, overflowY: "auto", "--nd-bg": T.surface }}>
        <div className="enogia-nd-glass" style={{ position: "sticky", top: 0, zIndex: 2, padding: "12px 12px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 13 }}>Stock de la production</b>
          <div role="group" aria-label="Gamme" style={{ display: "inline-flex", background: T.surfaceAlt, borderRadius: 9, padding: 2, gap: 2, alignSelf: "flex-start" }}>
            {["100", "20"].map(g => <button key={g} type="button" aria-pressed={gam === g} onClick={() => { setGam(g); setPicked(null); }} style={{ border: "none", borderRadius: 7, minHeight: 28, padding: "0 12px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font, background: gam === g ? T.card : "transparent", color: gam === g ? T.ink900 : T.ink500, boxShadow: gam === g ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{g} kW</button>)}
          </div>
        </div>
        {/* v274 (demandé : « bien séparer les turbines prêtes avec roues et celles sans ») */}
        {[["Prêtes · avec roue", freeG.filter(x => x.ready && x.roue), T.emerald500, x => "roue " + x.roue], ["Prêtes · sans roue", freeG.filter(x => x.sansRoue || (x.ready && !x.roue)), T.amber500, x => x.sansRoue ? "testée sans roue" : "roue à monter"], ["En fabrication", freeG.filter(x => !x.dispo), T.ink300, x => x.step + " · " + fdS(x.end) + (x.roue ? " · roue " + x.roue : "")]].map(([t, L, k, sub]) =>
          <Grp key={t} t={t} n={L.length}>{L.length ? L.map(x => <Tile ctx={ctx} key={x.id} p={{ kind: "turbine", id: x.id, g: x.gamme, roue: x.roue && !x.sansRoue ? x.roue : "" }} k={k} title={x.num || "sans n°"} sub={sub(x)} />) : none}</Grp>)}
        <Grp t="Roues équilibrées" n={stock.roues.reduce((s, r) => s + r.qte, 0)}>{stock.roues.length ? stock.roues.map(t => <Tile ctx={ctx} key={t.stockId} p={{ kind: "roue", stockId: t.stockId, ref: t.ref, g: gam }} k={T.teal500} title={t.ref} sub="roue" q={t.qte} disabled={!t.qte} />) : none}</Grp>
        <Grp t="Injecteurs" n={stock.injs.reduce((s, r) => s + r.qte, 0)}>{stock.injs.length ? stock.injs.map(t => <Tile ctx={ctx} key={t.stockId + "-" + t.bouches} p={{ kind: "inj", stockId: t.stockId, ref: t.ref, bouches: t.bouches, g: gam }} k={T.violet500} title={t.ref} sub={t.bouches == null ? "vierge" : t.bouches + " bouchages"} q={t.qte} disabled={!t.qte} />) : none}</Grp>
        <p style={{ fontSize: 11.5, color: T.ink500, padding: "0 12px 14px", margin: 0, lineHeight: 1.45 }}>{picked ? "Pièce choisie : touchez un logement (Échap pour annuler)." : "Les tuiles sont le stock réel de la production turbines."}</p>
      </aside>
      <section aria-label="Besoins" style={{ overflowY: "auto", position: "relative", "--nd-bg": T.card }}>
        <div className="enogia-nd-glass" style={{ position: "sticky", top: 0, zIndex: 3, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "10px 16px", boxShadow: "0 1px 0 " + T.line }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><span aria-hidden="true" style={{ width: 150, height: 6, borderRadius: 3, background: T.surfaceAlt, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: "100%", transform: "scaleX(" + Math.max(0, Math.min(1, pct / 100)) + ")", transformOrigin: "left center", background: T.emerald500, transition: "transform 300ms cubic-bezier(.2,.8,.2,1)" }} /></span>
            <span style={{ fontSize: 12.5, color: T.ink500 }}><b style={{ color: T.ink900, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{pct}</b> % des pièces attribuées</span></span>
          {[[missT, "turbines"], [missR, "roues"], [missI, "injecteurs à attribuer"]].map(([v, l]) => <span key={l} style={{ fontSize: 12.5, color: T.ink500 }}><b style={{ color: T.ink900, fontSize: 15, fontVariantNumeric: "tabular-nums", marginRight: 3 }}>{v}</b>{l}</span>)}
          <span style={{ flex: 1 }} />
          <label style={{ fontSize: FZ.xs, color: T.ink700, display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} />À compléter</label>
          {canEdit && <button type="button" disabled={busy} onClick={auto} title="Propose une affectation du stock (par date de besoin, pièces prévues), annulable" style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", border: "1px solid " + T.line, background: T.card, color: T.ink700, fontWeight: 700, fontSize: FZ.xs, cursor: "pointer", fontFamily: T.font }}>Remplir automatiquement</button>}
          {canEdit && <button type="button" onClick={() => setSav({})} style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", border: "1px solid " + T.ink900, background: T.ink900, color: T.card, fontWeight: 700, fontSize: FZ.xs, cursor: "pointer", fontFamily: T.font }}>＋ Besoin SAV</button>}
        </div>
        <div style={{ padding: "0 16px 20px" }}>
          {shown.map(n => { const wk = wkOf(n.date), head = wk !== lastWk; lastWk = wk;
            const T3 = n.want * 3, G3 = n.slots.filter(x => !x.extra).reduce((a, x) => a + !!x.t + !!x.roueOk + !!x.inj, 0), badI = n.issues.filter(i => i.bad && !/à attribuer$/.test(i.t));
            return <React.Fragment key={n.key}>
              {head && <div style={{ position: "sticky", top: 52, zIndex: 2, padding: "8px 0 6px", fontSize: 12, fontWeight: 700, color: T.ink500, background: "linear-gradient(" + T.card + " 70%, transparent)" }}>{wk}</div>}
              <article className="enogia-nd-need" aria-label={(n.kind === "sav" ? "Besoin SAV " : "Besoin ORC ") + n.label} style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", gap: 14, alignItems: "stretch", padding: "10px 12px 10px 16px", marginBottom: 8, borderRadius: 12, minHeight: 72, boxSizing: "border-box", position: "relative", overflow: "hidden",
                background: n.kind === "sav" ? T.violet100 : T.card, boxShadow: "0 0 0 1px " + (n.complete && !badI.length ? T.emerald500 : badI.length ? T.red500 : n.kind === "sav" ? T.violet500 : T.line), transition: "box-shadow 160ms" }}>
                <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: n.kind === "sav" ? T.violet500 : (T.navy700 || T.ink900) }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Ring p={T3 ? G3 / T3 : 1} /><b style={{ fontFamily: T.fontMono, fontSize: 13.5 }}>{n.label}</b>
                    {n.kind === "pj" && <CountryFlag pays={getPjMeta(n.pj, n.r).pays} size={13} />}
                    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".02em", color: n.kind === "sav" ? T.card : T.card, background: n.kind === "sav" ? T.violet600 : (T.navy700 || T.ink900), borderRadius: 999, padding: "1px 7px" }}>{n.kind === "sav" ? "SAV" : "ORC"}</span></div>
                  {n.sub && <div style={{ fontSize: 12, color: T.ink700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>{n.sub}{n.kind === "pj" && getPjMeta(n.pj, n.r).pays && getPjMeta(n.pj, n.r).pays !== "—" ? <span style={{ color: T.ink500 }}>· {getPjMeta(n.pj, n.r).pays}</span> : null}</div>}
                  <div style={{ fontSize: 12, color: T.ink700, marginTop: 2 }}>pour le <b style={{ fontVariantNumeric: "tabular-nums" }}>{fd(n.date)}</b> · <button type="button" onClick={e => canEdit && setPop({ n, kind: "cfg", el: e.currentTarget })} style={{ border: "none", background: "transparent", padding: 0, color: T.teal600, fontWeight: 700, fontSize: 12, cursor: canEdit ? "pointer" : "default", textDecoration: "underline", textUnderlineOffset: 2, fontFamily: T.font }}>{n.cfg.l}{n.kind === "pj" && !n.cfgSet ? " (gamme)" : ""}</button>
                    {n.kind === "sav" && canEdit && <> · <button type="button" onClick={() => setSav({ id: n.id, ...n.raw, injB: n.raw.injB == null ? "" : String(n.raw.injB) })} style={{ border: "none", background: "transparent", padding: 0, color: T.ink500, fontSize: 12, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2, fontFamily: T.font }}>modifier</button></>}</div>
                  {badI.length > 0 && <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 1 }}>{badI.map((i, q) => <span key={q} style={{ fontSize: 11.5, fontWeight: 600, color: T.red600 }}>{i.t}</span>)}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  {n.slots.map(s => { const rr = s.roue ? s.roue.ref : s.roueMontee, full = !!(s.t && s.roueOk && s.inj);
                    return <div key={s.i} style={{ display: "flex", alignItems: "stretch", gap: 3, padding: 3, borderRadius: 11, background: full ? T.emerald100 : T.surface, transition: "background 200ms" }}>
                      <span aria-hidden="true" style={{ width: 18, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: T.ink300 }}>{n.want > 1 ? s.i + 1 : ""}</span>
                      <Sock ctx={ctx} n={n} s={s} kind="turbine" label={"Turbine " + n.cfg.g + " kW"} filled={!!s.t}>{s.t && <><Val lab={"Turbine " + n.cfg.g + " kW"} v={s.t.num} mono note={s.t.livree ? "sortie du stock" : s.t.dispo ? "prête" : "réservée · fin " + fdS(s.t.end)} />{xBtn("Retirer " + s.t.num, () => outTurbine(s.t))}</>}</Sock>
                      <Sock ctx={ctx} n={n} s={s} kind="roue" label="Roue" want={n.roue} filled={s.roueOk}>{s.roueOk && <><Val lab="Roue" v={rr} note={n.roue && U2(rr) !== U2(n.roue) ? "prévue " + n.roue : s.roue ? "✓" : "montée"} bad={!!(n.roue && U2(rr) !== U2(n.roue))} />{s.roue && xBtn("Remettre la roue " + rr + " en stock", () => outAlloc(s.roue))}</>}</Sock>
                      <Sock ctx={ctx} n={n} s={s} kind="inj" label="Injecteur" want={injTxt(n)} filled={!!s.inj}>{s.inj && <><Val lab="Injecteur" v={s.inj.ref} note={(n.inj && U2(s.inj.ref) !== U2(n.inj)) ? "prévu " + n.inj : (s.inj.bouches == null ? "vierge" : s.inj.bouches + " bouch.") + (n.injB && s.inj.bouches == null ? " · " + n.injB + " à boucher" : " ✓")} bad={!!(n.inj && U2(s.inj.ref) !== U2(n.inj))} />{xBtn("Remettre l'injecteur " + s.inj.ref + " en stock", () => outAlloc(s.inj))}</>}</Sock>
                    </div>; })}
                </div>
              </article>
            </React.Fragment>; })}
          {!shown.length && <div style={{ padding: 30, textAlign: "center", color: T.ink500, fontSize: FZ.sm }}>{needs.length ? "Tous les besoins sont complets. Décochez « À compléter » pour tout voir." : "Aucun PJ en cours avec une turbine, ni besoin SAV."}</div>}
        </div>
      </section>
    </div>
    {msg && <div role="status" className="enogia-bell-peek" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 10015, background: msg.bad ? T.red600 : T.ink900, color: T.card, borderRadius: 12, padding: "9px 14px", fontSize: FZ.sm, boxShadow: T.shadowLg, display: "flex", gap: 12, alignItems: "center", maxWidth: "min(640px, 92vw)" }}>
      <span>{msg.t}</span>{msg.undo && <button type="button" onClick={() => { const u = msg.undo; setMsg(null); u(); }} style={{ border: "none", background: "transparent", color: T.card, fontWeight: 800, textDecoration: "underline", cursor: "pointer", fontFamily: T.font }}>Annuler</button>}
      <button type="button" aria-label="Fermer" onClick={() => setMsg(null)} style={{ border: "none", background: "transparent", color: T.card, cursor: "pointer", minWidth: 24, minHeight: 24 }}>×</button></div>}
    {pop && (() => { const n = needs.find(x => x.key === pop.n.key) || pop.n, g = n.cfg.g, close = () => setPop(null);
      if (pop.kind === "cfg") return <ChoicePop anchor={pop.el} title={"Turbine pour " + n.label} value={n.cfg.id} options={TURB_CFGS.map(c => ({ v: c.id, l: c.l }))} onPick={v => { setNeed(n, { turbCfg: v }); close(); }} onClose={close} />;
      if (pop.kind === "roue") return <ChoicePop anchor={pop.el} title={"Roue prévue · " + n.label + " (stock de la production)"} value={n.roue} options={stockTiles(doc, g).roues.map(t => ({ v: t.ref, l: t.ref, q: t.qte }))} onPick={v => { setNeed(n, { turbRoue: v === n.roue ? null : v }); close(); }} onClose={close} />;
      const ii = n.inj ? injInfo(doc, n.inj) : null, mx = ii ? maxBouches(ii.ouv) : 99;
      return <ChoicePop anchor={pop.el} title={"Injecteur prévu · " + n.label} value={n.inj} options={refsOf(doc, "injecteurs", g).map(r => { const x = injInfo(doc, r); return { v: r, l: r, q: x ? x.vierges + x.variantes.reduce((s, v) => s + v.qte, 0) : 0 }; })} onPick={v => setNeed(n, { turbInj: v === n.inj ? null : v, turbInjB: null })} onClose={close}
        extra={n.inj && <div style={{ marginTop: 10, borderTop: "1px solid " + T.line, paddingTop: 8 }}>
          <div style={{ fontSize: 12, color: T.ink500, marginBottom: 6 }}>Bouchages{ii && ii.ouv ? " (" + ii.ouv + " ouvertures : " + mx + " au plus)" : ""}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" aria-label="Un bouchage de moins" disabled={!n.injB} onClick={() => setNeed(n, { turbInjB: Math.max(0, (n.injB || 0) - 1) || null })} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, cursor: "pointer" }}>−</button>
            <b style={{ minWidth: 28, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{n.injB || 0}</b>
            <button type="button" aria-label="Un bouchage de plus" disabled={(n.injB || 0) >= mx} onClick={() => setNeed(n, { turbInjB: Math.min(mx, (n.injB || 0) + 1) })} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, cursor: "pointer" }}>+</button>
          </div></div>} />; })()}
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
  return (<div ref={top}>
    <div style={{ display: "flex", alignItems: "center", gap: 18, borderBottom: "1px solid " + T.line, marginBottom: 12, flexWrap: "wrap" }}>
      <div role="tablist" aria-label="Turbines" style={{ display: "flex", gap: 18 }}>
        {TABS.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{ border: "none", background: "transparent", padding: "8px 0", minHeight: 36, cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: tab === id ? 700 : 500, color: tab === id ? T.ink900 : T.ink500, borderBottom: "2px solid " + (tab === id ? T.ink900 : "transparent"), marginBottom: -1 }}>{l}</button>)}
      </div>
      <span style={{ flex: 1 }} />
      {/* v268 (demandé : « mettre à disposition le bouton importer à Jérémie ») : toute personne qui peut modifier la production (propriétaire + liste d’accès) */}
      {canEdit && tab === "prod" && <button type="button" onClick={() => setImp(true)} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "4px 12px", minHeight: 30, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Importer des données (JSON)</button>}
    </div>
    {tab === "prod" ? <ProdTurbines doc={doc} api={api} canEdit={canEdit} owner={owner} pjs={pjs} /> : <NeedsView doc={doc} api={api} rows={rows} canEdit={canEdit} savePjMeta={savePjMeta} />}
    {imp && <ImportDialog doc={doc} api={api} onClose={() => setImp(false)} />}
  </div>);
}
