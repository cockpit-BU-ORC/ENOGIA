// v267 (demandé : « un seul onglet Turbines, avec la production turbines et la gestion des turbines pour les ORC ; les informations des
// turbines, des roues et des injecteurs ne sont vraies que dans la production turbines ») : page « Turbines » à deux sous-pages.
//  · Production : la page de Jérémie (ProdTurbines, échangée par le kit) — seul endroit où l'on saisit turbines, arbres, roues, injecteurs ;
//    la turbine est attribuée à un ORC par son champ « Affaire / client », proposé parmi les PJ du planning.
//  · (v267, remplacé en v270 par turbineNeeds.js : besoins PJ + SAV, turbines glissées) Besoins des ORC : rien à saisir — pour chaque PJ en cours, les turbines nécessaires d'après sa gamme, celles qui lui sont attribuées
//    dans la production, leur date de fin prévue (calcul de la production) et ce qui coince ; stocks de roues et d'injecteurs.
// Plus : « Importer des données (JSON) » (propriétaire et liste d’accès de la production, v268) pour reprendre les données de l'outil Claude de Jérémie, avec aperçu avant écriture.
import { PlanSwitch } from "./PlanSwitch";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, FZF as FZ, btn as themeBtn } from "../theme";
import { ProdTurbines } from "./ProdTurbines";
import { usePointerDnD } from "../pointerDrag";
import { NavIcon } from "./SharedUI";
import { createPortal } from "react-dom";
import { allTurbines, monthOf, swapNeedKeys, TURB_CFGS, cfgById, refsOf, buildNeeds, assignOps, unassignOps, installOps, allocOps, unallocOps, stockTiles, injInfo, maxBouches, autoFill, roueConflict, prodState, workDate, pjOfAffaire, closedNeeds } from "../turbineNeeds";
import { getPjMeta, CountryFlag } from "../pjMeta";
import { askConfirm } from "../confirm";
import { AF } from "../autoFocusOk";

const COLLS = ["turbines", "arbres", "pieces", "roues", "injecteurs"];
export { prodState, workDate, pjOfAffaire };

// v270 : fenêtre d'un besoin SAV (création / modification) — L hors du composant (sinon le champ perd le focus à chaque frappe)
const L = ({ l, children }) => <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: T.ink500 }}>{l}{children}</label>;
function SavDialog({ doc, init, onSave, onDelete, onClose }) {
  const [v, setV] = useState(() => ({ label: "", cfg: "100", roue: "", inj: "", injB: "", date: "", note: "", ...(init || {}) }));
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const g = (cfgById(v.cfg) || TURB_CFGS[1]).g, roues = refsOf(doc, "roues", g), injs = refsOf(doc, "injecteurs", g), ii = v.inj ? injInfo(doc, v.inj) : null, mx = ii ? maxBouches(ii.ouv) : 99;
  const f = { minHeight: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, padding: "0 8px", width: "100%", boxSizing: "border-box" };
  const btn = p => themeBtn(p ? "pri" : "sec", "md"); // v292 : bouton commun
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label={init ? "Besoin SAV " + (init.label || "") : "Nouveau besoin SAV"} style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(520px,100%)", padding: "16px 18px", fontFamily: T.font, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: FZ.lg, fontWeight: 600 }}>{init ? "Besoin SAV" : "Nouveau besoin SAV"}</div>
      <L l="Client / n° SAV"><input autoFocus={AF} value={v.label} onChange={e => setV({ ...v, label: e.target.value })} placeholder="Par exemple : SAV411 - Client" style={f} /></L>
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
      {!options.length && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucune référence dans la production turbines</span>}
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
const U2 = v => String(v || "").trim().toUpperCase();
const NEEDS_CSS = `
.enogia-nd-glass{background:var(--nd-bg)}
.enogia-nd-tile{transition:transform 120ms cubic-bezier(.2,.8,.2,1),box-shadow 120ms,opacity 160ms}
.enogia-nd-tile:active{transform:scale(.97)}
.enogia-nd-sock{transition:background 140ms,box-shadow 140ms,transform 180ms cubic-bezier(.2,.8,.2,1),opacity 140ms}
.enogia-nd-sock[role=button]{cursor:pointer}
.enogia-nd-sock[role=button]:active{transform:scale(.97);transition-duration:100ms}
.enogia-nd-month{position:sticky;z-index:2;border-bottom:1px solid var(--nd-line)}
.enogia-nd-land{animation:enogiaNdLand 260ms cubic-bezier(.2,.8,.2,1)}
@keyframes enogiaNdLand{0%{transform:scale(1.06)}100%{transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.enogia-nd-land{animation:none}.enogia-nd-sock,.enogia-nd-tile{transition:none}}

@media (max-width: 860px){.enogia-nd-app{grid-template-columns:1fr !important;height:auto !important;overflow:clip !important}.enogia-nd-need{grid-template-columns:1fr !important}.enogia-nd-stock{position:sticky !important;bottom:0;order:2;z-index:6;border-right:none !important;border-top:1px solid var(--nd-line);max-height:50vh;overflow-y:auto;transition:max-height 200ms ease-out}.enogia-nd-stock[data-open="0"]{max-height:52px;overflow:hidden}.enogia-nd-drawer{display:inline-flex !important}}
/* v333 (audit tablette) : sous 860 px, le stock devient un tiroir collé en bas, replié par défaut (toucher une pièce le referme) */`;
function ProgBar({ p }) { return <span aria-hidden="true" style={{ display: "inline-block", width: 28, height: 6, borderRadius: 4, background: T.surfaceAlt, overflow: "hidden", flexShrink: 0 }}><span style={{ display: "block", width: Math.round(p * 100) + "%", height: "100%", background: T.emerald500 }} /></span>; } // v345 (taste) : barre au lieu de l'anneau
// v300 (maquette V300 validée : « Go ») : tuile du stock compacte, 30 px, liseré de couleur à gauche, quantité à droite
function Tile({ ctx, p, k, title, sub, q, disabled, tc, subMono }) { const { dnd, canEdit, setPicked, isPicked } = ctx; const on = !!(dnd.drag && (p.kind === "turbine" ? dnd.drag.id === p.id : dnd.drag.stockId === p.stockId && String(dnd.drag.bouches) === String(p.bouches)));
    return <div role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled || undefined} aria-pressed={isPicked(p)} className="enogia-nd-tile" aria-label={title + " " + sub + (q != null ? ", " + q + " en stock" : "")} title={title + (sub ? " · " + sub : "")}
      {...(canEdit && !disabled ? dnd.dragProps(p) : {})}
      onClick={() => { if (!canEdit || disabled) return; setPicked(isPicked(p) ? null : p); }}
      onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && canEdit && !disabled) { e.preventDefault(); setPicked(isPicked(p) ? null : p); } }}
      style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 8px 0 10px", boxSizing: "border-box", minWidth: 0, borderRadius: 8, background: T.card, boxShadow: "inset 3px 0 0 " + k + ", inset 0 0 0 " + (isPicked(p) ? "2px " + T.ink900 : "1px " + T.line), cursor: canEdit && !disabled ? "grab" : "default", touchAction: "none", userSelect: "none", opacity: on ? 0.25 : disabled ? 0.45 : 1, fontFamily: T.font }}>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 12, color: tc || T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      {sub && <span style={{ fontSize: subMono ? 11 : 12, fontFamily: subMono ? T.fontMono : T.font, color: T.ink500, whiteSpace: "nowrap" }}>{sub}</span>}
      {q != null && <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: q ? T.ink700 : T.red600 }}>{q}</span>}
    </div>; }
const IC = {
  ok: <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M2.5 6.5l2.2 2.2L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  lock: <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}><rect x="2.5" y="5.5" width="7" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M4 5.5V4a2 2 0 014 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>,
  plus: <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M6 2.5v7M2.5 6h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
};
// Couleurs des 4 états d'un logement (jetons du thème, clair et sombre)
const TONES = () => ({
  roue: { bg: T.accentSoft, bd: T.accentInk, ink: T.accentInk }, inj: { bg: T.violet100, bd: T.violet600, ink: T.violet600 },
  turbine: { bg: T.info100, bd: T.info600, ink: T.info600 }, inst: { bg: T.emerald100, bd: T.emerald600, ink: T.emerald600 }, bad: { bg: T.red100, bd: T.red600, ink: T.red600 },
});
// Logement d'un emplacement (roue, injecteur, turbine) : hauteur fixe 40 px, jamais de retour à la ligne.
// Vide = contour pointillé + « + » (pièce prévue en gris, ou « à choisir » en ambre) ; rempli = fond teinté + contour plein (tone).
function Sock({ ctx, n, s, kind, label, want, tone, empty, hint, children }) {
    const { dnd, canEdit, picked, active, landed, drop, setMsg, setPop } = ctx;
    const filled = !!tone, key = n.key + "#" + s.i + ":" + kind, g = n.cfg.g;
    // v302 (demandé : « quand la turbine est marquée installée, impossible de supprimer l'injecteur ou la roue ») : logement verrouillé
    const lock = !!s.installee && kind !== "turbine";
    const acc = p => !lock && !!p && !filled && p.kind === kind && (!p.g || p.g === g);
    const can0 = active && acc(active);
    // v274 : turbine portant une autre roue, ou roue d'une autre référence = refusée (rouge) ; le dépôt donne le message d'erreur
    const refused = can0 && n.roue && ((kind === "turbine" && roueConflict({ roue: active.roue, sansRoue: !active.roue }, n)) || (kind === "roue" && U2(active.ref) !== U2(n.roue)));
    const can = can0 && !refused, over = dnd.over === key && can;
    const bd = refused ? "1.5px solid " + T.red600 : over ? "2px solid " + T.emerald600 : can ? "1.5px solid " + T.ink700 : filled ? "1.5px solid " + tone.bd : "1.5px dashed " + (want || kind === "turbine" ? T.ink300 : T.amber600);
    return <div {...(canEdit ? dnd.dropProps(key, acc, d => drop(n, s.i, d)) : {})} className={"enogia-nd-sock" + (landed === key ? " enogia-nd-land" : "")}
      role={!filled && !lock ? "button" : undefined} tabIndex={!filled && !lock ? 0 : undefined} aria-label={!filled ? label + " pour " + n.label + (lock ? ", verrouillé : turbine installée" : want ? ", prévu " + want : "") : undefined}
      onClick={!filled ? (e => { if (!canEdit || lock) return; if (picked) { if (acc(picked)) drop(n, s.i, picked); else setMsg({ t: "Cette pièce ne va pas dans ce logement.", warn: true }); } else if (kind !== "turbine") setPop({ n, kind: kind === "roue" ? "roue" : "inj", el: e.currentTarget }); }) : undefined}
      onKeyDown={!filled ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }) : undefined}
      style={{ position: "relative", minWidth: 0, minHeight: 50, borderRadius: 8, padding: "3px 7px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", border: bd, cursor: !filled && canEdit && !lock ? "pointer" : "default",
        background: refused ? T.red100 : over ? T.emerald100 : can ? T.surfaceAlt : filled ? tone.bg : "transparent", transform: over ? "scale(1.03)" : "none", opacity: active && !can0 && !filled ? 0.35 : 1 }}>
      {filled ? children : <>
        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, lineHeight: 1.15, color: refused ? T.red600 : T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lock ? IC.lock : IC.plus}{refused ? "Refusé : roue " + n.roue + " prévue" : lock ? label + " · verrouillé" : label}</span>
        <span style={{ ...REF_ST, fontFamily: want ? T.fontDisplay : T.font, fontSize: want ? 14 : 13, fontWeight: 600, color: want ? T.ink500 : T.ink700 }}>{want || empty || (kind === "turbine" ? "glisser une turbine" : "à choisir")}</span>
        {hint && <span style={{ fontSize: 11, lineHeight: 1.15, color: T.ink500 }}>{hint}</span>}</>}
    </div>;
  }
// v301 (demandé : « je n'arrive pas à voir le nom complet de l'injecteur ») : la référence passe à la ligne (2 lignes au plus) au lieu d'être coupée
const REF_ST = { lineHeight: 1.12, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };
// contenu d'un logement rempli : quoi (icône + état), référence complète, détail
function Piece({ tone, icon, label, val, mono, detail, x }) {
  return <><span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, lineHeight: 1.15, color: tone.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: x ? 16 : 0 }}>{icon}{label}</span>
    <span title={val} style={{ ...REF_ST, fontFamily: mono ? T.fontMono : T.fontDisplay, fontSize: mono ? 12 : 14, fontWeight: 600, color: tone.ink, paddingRight: x ? 14 : 0 }}>{val}</span>
    {detail && <span style={{ fontSize: 11, lineHeight: 1.15, color: tone.ink, opacity: 0.85 }}>{detail}</span>}{x}</>;
}
function NeedsView({ doc, api, rows, canEdit, savePjMeta, authorName }) {
  const [tick, setTick] = useState(0); // la fiche PJ (pjMetaOverrides) change sans changer rows : recalcul après une modification ici
  const { needs, free } = useMemo(() => buildNeeds(doc, rows, r => getPjMeta(r.pj, r)), [doc, rows, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const dnd = usePointerDnD();
  const docRef = useRef(doc); docRef.current = doc;
  const [gam, setGam] = useState("100"), [msg, setMsg] = useState(null), [sav, setSav] = useState(null), [busy, setBusy] = useState(false), [onlyOpen, setOnlyOpen] = useState(true), [pop, setPop] = useState(null), [picked, setPicked] = useState(null), [landed, setLanded] = useState(null), [drawer, setDrawer] = useState(false), [closedDlg, setClosedDlg] = useState(false);
  // v334 (demandé : « pouvoir fermer des PJ car les turbines sont déjà installées et donc plus dans la liste ») : clore / rouvrir un besoin
  const closeNeed = async n => {
    if (!(await askConfirm({ title: "Clore le besoin " + n.label + " ?", message: "Il sort de la liste des besoins (et du remplissage automatique). Les turbines et pièces déjà attribuées ne bougent pas. On le rouvre depuis « Besoins clos ».", confirmLabel: "Clore le besoin" }))) return;
    const at = new Date().toISOString(), by = authorName || "";
    const ok = n.kind === "sav" ? await api.put("besoins", n.id, { ...n.raw, done: true, doneAt: at, doneBy: by }) : await api.put("clos", n.pj, { at, by });
    setMsg({ t: ok ? "Besoin " + n.label + " clos." : "La fermeture n'a pas été enregistrée." });
  };
  const reopenNeed = async c => {
    const ok = c.kind === "sav" ? await api.put("besoins", c.id, { ...c.raw, done: false, doneAt: null, doneBy: null }) : await api.del("clos", c.pj);
    setMsg({ t: ok ? "Besoin " + c.label + " rouvert." : "La réouverture n'a pas été enregistrée." });
  };
  const closedL = closedNeeds(doc);
  useEffect(() => { if (picked) setDrawer(false); }, [picked]);
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
  const delSav = async () => { if (!sav || !(await askConfirm({ title: "Supprimer le besoin SAV « " + sav.label + " » ?", message: "Turbines, roues et injecteurs attribués retournent dans le stock.", confirmLabel: "Supprimer le besoin", danger: true }))) return;
    const n = needs.find(x => x.key === "sav:" + sav.id); if (n) { for (const s of n.slots) { if (s.roue) await run(unallocOps(doc, s.roue)); if (s.inj) await run(unallocOps(doc, s.inj)); if (s.t) await run(unassignOps(doc, s.t)); } }
    await api.del("besoins", sav.id); setSav(null); };
  // v300 (maquette V300 validée) : ORC et SAV dans la même feuille (filtre Tout · ORC · SAV), cartes compactes (une turbine = une ligne
  // de 40 px), logements à 4 états, disponibilité sur une ligne fine ; stock : roues et injecteurs d'abord.
  const [fold, setFold] = useState(() => { try { return JSON.parse(localStorage.getItem("enogia_nd_fold") || "null") || { "En fabrication": true }; } catch (e) { return { "En fabrication": true }; } });
  const flipFold = t => setFold(f => { const nx = { ...f, [t]: !f[t] }; try { localStorage.setItem("enogia_nd_fold", JSON.stringify(nx)); } catch (e) { /* stockage indisponible */ } return nx; });
  const [rankEdit, setRankEdit] = useState(null);
  const [kind, setKind0] = useState(() => { try { const v = localStorage.getItem("enogia_nd_kind"); return v === "pj" || v === "sav" ? v : "all"; } catch (e) { return "all"; } });
  const setKind = k => { setKind0(k); try { localStorage.setItem("enogia_nd_kind", k); } catch (e) { /* stockage indisponible */ } };
  const nOrc = needs.filter(n => n.kind === "pj").length, nSav = needs.length - nOrc;
  const allDone = n => n.slots.filter(x => !x.extra).every(x => x.installee);
  const shown = needs.filter(n => (kind === "all" || n.kind === kind) && (!onlyOpen || !allDone(n) || !n.complete || n.late || n.issues.some(i => i.bad && !/à attribuer$/.test(i.t))));
  const freeG = free.filter(x => x.gamme === gam).sort((a, b) => (b.ready - a.ready) || (b.sansRoue - a.sansRoue) || String(a.end || "9").localeCompare(String(b.end || "9")));
  const active = dnd.drag || picked;
  const isPicked = p => picked && picked.kind === p.kind && (p.kind === "turbine" ? picked.id === p.id : picked.stockId === p.stockId && String(picked.bouches) === String(p.bouches));
  // v302 (demandé : « bien séparer les types de stock dans le panneau de gauche ») : une section encadrée par type, titre et pastille de couleur
  // v320 (demandé : « menus déroulants pour gagner de la place ») : chaque section se replie ; état gardé sur ce poste (enogia_nd_fold)
  const Sect = ({ t, n, k, note, children }) => { const open = !fold[t];
    return <section aria-label={t} style={{ margin: "10px 10px 0", background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
    <button type="button" aria-expanded={open} onClick={() => flipFold(t)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", minHeight: 34, padding: "7px 10px", border: "none", borderBottom: open ? "1px solid " + T.line : "none", background: T.surface, color: T.ink900, cursor: "pointer", fontFamily: T.font, textAlign: "left" }}>
      <span aria-hidden="true" style={{ display: "inline-flex", color: T.ink500, transform: open ? "none" : "rotate(-90deg)", transition: "transform 120ms" }}><NavIcon name="chevronDown" size={14} /></span>
      <i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: k, flexShrink: 0 }} /><b style={{ fontSize: 13, flex: 1 }}>{t}</b><span style={{ fontSize: 12, fontWeight: 600, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>{n}</span></button>
    {open && <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>{children}{note && <span style={{ fontSize: 11, color: T.ink500, lineHeight: 1.35 }}>{note}</span>}</div>}</section>; };
  const Sub = ({ t, n, children }) => <div style={{ display: "flex", flexDirection: "column", gap: 3 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: T.ink500, padding: "0 2px" }}><span>{t}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{n}</span></div>{children}</div>;
  const none = <span style={{ fontSize: 12, color: T.ink500 }}>Aucune.</span>;
  const xBtn = (lab, fn) => canEdit && <button type="button" data-no-drag aria-label={lab} title="Remettre dans le stock" onClick={e => { e.stopPropagation(); fn(); }} style={{ position: "absolute", top: 1, right: 2, border: "none", background: "transparent", color: "inherit", opacity: 0.7, cursor: "pointer", width: 22, height: 22, borderRadius: 4, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>;
  const injTxt = n => n.inj || "";
  const ctx = { dnd, canEdit, picked, setPicked, isPicked, active, landed, drop, setMsg, setPop };
  const TN = TONES();
  // v301 (demandé : « pas la vision de l'ordre dont on a besoin des turbines ») : rang de chaque besoin, par date (tous types confondus)
  const rankOf = new Map(needs.map((n, i) => [n.key, i + 1]));
  // v302 : ▲ ▼ = un cran plus tôt / plus tard dans le mois (parmi les besoins affichés) ; enregistré dans planning/prodTurbines.ordre.besoins
  // v320 : ▲ ▼ échangent avec la carte affichée voisine du mois (cartes masquées sautées)
  const shownD = [...shown].sort((a, b) => monthOf(a.date).localeCompare(monthOf(b.date)) || rankOf.get(a.key) - rankOf.get(b.key));
  const neighbor = (n, dir) => { const i = shownD.indexOf(n), m = shownD[i + dir]; return m && monthOf(m.date) === monthOf(n.date) ? m : null; };
  const saveKeys = async (keys, t) => { if (!keys || busy) return; if (await api.put("ordre", "besoins", { keys, at: new Date().toISOString() })) setMsg({ t }); else setMsg({ t: "L'enregistrement a échoué.", bad: true }); };
  const moveNeed = (n, dir) => { const m = neighbor(n, dir); if (m) saveKeys(swapNeedKeys(needs, n.key, m.key), n.label + (dir < 0 ? " remonte" : " descend") + " d'un cran."); };
  const setRank = (n, r) => { setRankEdit(null); const m = needs[r - 1]; if (!m || m.key === n.key) return; saveKeys(swapNeedKeys(needs, n.key, m.key), n.label + " passe en priorité n° " + r + " (échangé avec " + m.label + ")."); };
  const monthLab = iso => { if (!iso) return "Sans date"; const d = new Date(String(iso).slice(0, 7) + "-01T12:00:00"); const t = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const arrowB = { width: 24, height: 24, borderRadius: 4, border: "1px solid " + T.line, background: T.card, color: T.ink700, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0, display: "inline-grid", placeItems: "center" };
  let lastMo = "";
  // v303 (maquette « effets des skills », piste Apple choisie, stock gardé visible) : barre d'outils et titres de mois en verre dépoli,
  // collés en haut de la liste ; les titres se posent juste sous la barre (hauteur mesurée).
  const barRef = useRef(null), [barH, setBarH] = useState(46);
  useEffect(() => { const el = barRef.current; if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setBarH(Math.round(el.getBoundingClientRect().height))); ro.observe(el); return () => ro.disconnect(); }, []);
  const install = async (n, x, full) => {
    if (!x.installee && !full) { const miss = [!x.roueOk && "la roue", !x.inj && "l'injecteur"].filter(Boolean);
      if (!(await askConfirm({ title: "Marquer " + (x.t.num || "la turbine") + " installée ?", message: "Il manque " + miss.join(" et ") + " pour " + n.label + ". La turbine sera quand même marquée installée.", confirmLabel: "Marquer installée" }))) return; }
    run(installOps(doc, x.t, !x.installee)); };
  const pill = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" };
  const linkB = { border: "none", background: "transparent", padding: 0, fontSize: 12, fontWeight: 600, cursor: canEdit ? "pointer" : "default", textDecoration: "underline", textUnderlineOffset: 2, fontFamily: T.font, whiteSpace: "nowrap" };
  const gapEl = x => x.ecart == null ? null : <span style={{ fontWeight: 600, color: x.ecart < 0 ? T.red600 : x.ecart < 5 ? T.amber600 : T.emerald600 }}>{x.ecart < 0 ? -x.ecart + " j de retard" : x.ecart === 0 ? "juste à temps" : x.ecart + " j de marge"}</span>;
  const legend = [["à attribuer", { border: "1.5px dashed " + T.ink300 }], ["roue", { background: TN.roue.bg, border: "1.5px solid " + TN.roue.bd }], ["injecteur", { background: TN.inj.bg, border: "1.5px solid " + TN.inj.bd }],
    ["turbine allouée", { background: TN.turbine.bg, border: "1.5px solid " + TN.turbine.bd }], ["installée (roue et injecteur verrouillés)", { background: TN.inst.bg, border: "1.5px solid " + TN.inst.bd }], ["refusé", { background: TN.bad.bg, border: "1.5px solid " + TN.bad.bd }]];
  return (<div style={{ display: "flex", flexDirection: "column", gap: 10, "--nd-bg": T.card, "--nd-line": T.line }}>
    <style>{NEEDS_CSS}</style>
    <div className="enogia-nd-app" style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden", display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", height: "min(80vh, 940px)" }}>
      <aside className="enogia-nd-stock" data-open={drawer ? "1" : "0"} aria-label="Stock de la production turbines" style={{ background: T.surface, borderRight: "1px solid " + T.line, overflowY: "auto" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: T.surface, padding: "10px 12px 6px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 1px 0 " + T.line }}>
          <b style={{ fontSize: 13, flex: 1 }}>Stock de la production</b>
          <button type="button" className="enogia-nd-drawer" aria-expanded={drawer} onClick={() => setDrawer(v => !v)} style={{ display: "none", alignItems: "center", gap: 4, minHeight: 32, padding: "0 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{drawer ? "Replier" : "Ouvrir"}</button>
          <div role="group" aria-label="Gamme" style={{ display: "inline-flex", background: T.surfaceAlt, borderRadius: 8, padding: 2, gap: 2 }}>
            {["100", "20"].map(g => <button key={g} type="button" aria-pressed={gam === g} onClick={() => { setGam(g); setPicked(null); }} style={{ border: "none", borderRadius: 8, minHeight: 26, padding: "0 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font, background: gam === g ? T.card : "transparent", color: gam === g ? T.ink900 : T.ink500, boxShadow: gam === g ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{g} kW</button>)}
          </div>
        </div>
        {/* v320 (demandé : « voir en premier les turbines prêtes avec roue, puis prêtes sans roue, puis roues et injecteurs ») : sections repliables */}
        {(() => { const turbTile = (k, sub) => x => { const hasR = !!(x.roue && !x.sansRoue);
            return <Tile ctx={ctx} key={x.id} p={{ kind: "turbine", id: x.id, g: x.gamme, roue: hasR ? x.roue : "" }} k={k} tc={hasR ? TN.roue.ink : T.ink700} title={hasR ? "roue " + x.roue : sub(x)} sub={(x.num || "sans n°") + (hasR && !x.dispo ? " · " + (x.end ? "fin " + fdS(x.end) : "sans date") : "")} subMono />; };
          const grid = L => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: 3 }}>{L}</div>;
          const withR = freeG.filter(x => x.ready && x.roue && !x.sansRoue), noR = freeG.filter(x => x.sansRoue || (x.ready && !x.roue)), fab = freeG.filter(x => !x.dispo);
          return <>
            <Sect t="Turbines prêtes · avec roue" n={withR.length} k={T.emerald600}>{withR.length ? grid(withR.map(turbTile(T.emerald600, x => "roue " + x.roue))) : none}</Sect>
            <Sect t="Turbines prêtes · sans roue" n={noR.length} k={T.amber500}>{noR.length ? grid(noR.map(turbTile(T.amber500, x => x.sansRoue ? "testée sans roue" : "roue à monter"))) : none}</Sect>
        <Sect t="Roues équilibrées" n={stock.roues.reduce((q, r) => q + r.qte, 0)} k={TN.roue.bd} note="Roues seules. Une turbine qui a déjà sa roue ne consomme pas ce stock.">
          {stock.roues.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: 3 }}>{stock.roues.map(t => <Tile ctx={ctx} key={t.stockId} p={{ kind: "roue", stockId: t.stockId, ref: t.ref, g: gam }} k={TN.roue.bd} tc={TN.roue.ink} title={t.ref} sub="" q={t.qte} disabled={!t.qte} />)}</div> : none}
        </Sect>
        <Sect t="Injecteurs" n={stock.injs.reduce((q, r) => q + r.qte, 0)} k={TN.inj.bd}>
          {stock.injs.length ? [...new Set(stock.injs.map(t => t.stockId))].map(id => { const L = stock.injs.filter(t => t.stockId === id);
            return <Sub key={id} t={<span style={{ color: TN.inj.ink, fontWeight: 600, overflowWrap: "anywhere" }}>{L[0].ref}{L[0].ouv ? <span style={{ fontWeight: 500, color: T.ink500 }}> · {L[0].ouv} ouvertures</span> : null}</span>} n={L.reduce((q, t) => q + t.qte, 0)}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: 3 }}>{L.map(t => <Tile ctx={ctx} key={t.stockId + "-" + t.bouches} p={{ kind: "inj", stockId: t.stockId, ref: t.ref, bouches: t.bouches, g: gam }} k={TN.inj.bd} title={t.bouches == null ? "vierge" : t.bouches + " bouchage" + (t.bouches > 1 ? "s" : "")} sub="" q={t.qte} disabled={!t.qte} />)}</div></Sub>; }) : none}
        </Sect>
            <Sect t="En fabrication" n={fab.length} k={T.ink300}>{fab.length ? grid(fab.map(turbTile(T.ink300, x => (x.end ? "fin " + fdS(x.end) : "sans date") + (x.roue ? " · " + x.roue : "")))) : none}</Sect>
          </>; })()}
        <p style={{ fontSize: 12, color: T.ink500, padding: "10px 12px 14px", margin: 0, lineHeight: 1.45 }}>{picked ? "Pièce choisie : touchez un logement (Échap pour annuler)." : "Glissez une pièce sur un logement en pointillé, ou touchez-la puis touchez le logement. Une turbine sans roue s'alloue aussi : la roue reste à poser."}</p>
      </aside>
      <section aria-label="Besoins ORC et SAV" style={{ overflowY: "auto", position: "relative" }}>
        <div ref={barRef} className="enogia-nd-glass e-tb" style={{ position: "sticky", top: 0, zIndex: 3, display: "flex", alignItems: "center", gap: "6px 12px", flexWrap: "wrap", padding: "8px 12px", boxShadow: "0 1px 0 " + T.line }}>
          <div role="group" aria-label="Type de besoin" style={{ display: "inline-flex", background: T.surfaceAlt, borderRadius: 8, padding: 2, gap: 2 }}>
            {[["all", "Tout", needs.length], ["pj", "ORC", nOrc], ["sav", "SAV", nSav]].map(([k, l, c]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
              style={{ border: "none", borderRadius: 8, minHeight: 26, padding: "0 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font, background: kind === k ? T.card : "transparent", color: kind === k ? T.ink900 : T.ink500, boxShadow: kind === k ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{l} <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{c}</span></button>)}
          </div>
          <label style={{ fontSize: 12, color: T.ink700, display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} />À compléter</label>
          <span aria-label="Légende" style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: T.ink500 }}>{legend.map(([l, st]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><i aria-hidden="true" style={{ width: 16, height: 12, borderRadius: 4, boxSizing: "border-box", display: "inline-block", ...st }} />{l}</span>)}</span>
          <span style={{ fontSize: 12, color: T.ink500 }}>Par mois de besoin ; n° = priorité (cliquer dessus pour l'échanger avec un autre besoin, ▲ ▼ dans le mois).</span>
          <span style={{ flex: 1 }} />
          {canEdit && <button type="button" disabled={busy} onClick={auto} title="Propose une affectation du stock (par date de besoin, pièces prévues), annulable" style={{ ...themeBtn("sec", "sm") }}>Remplir automatiquement</button>}
          {closedL.length > 0 && <button type="button" onClick={() => setClosedDlg(true)} style={{ ...themeBtn("ghost", "sm") }}>Besoins clos ({closedL.length})</button>}
          {canEdit && <button type="button" onClick={() => setSav({})} style={{ ...themeBtn("pri", "sm") }}>＋ Besoin SAV</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))", gap: 8, padding: "8px 12px 16px", alignItems: "start" }}>
          {shownD.map(n => { const mo = monthOf(n.date), head = mo !== lastMo; lastMo = mo;
            const canUp = canEdit && !!neighbor(n, -1), canDown = canEdit && !!neighbor(n, 1);
            const T3 = n.want * 3, G3 = n.slots.filter(x => !x.extra).reduce((q, x) => q + !!x.t + !!x.roueOk + !!x.inj, 0), badI = n.issues.filter(i => i.bad && !/à attribuer$/.test(i.t) && !/après le besoin/.test(i.t));
            const meta = n.kind === "pj" ? getPjMeta(n.pj, n.r) : null, done = allDone(n);
            // v302 (demandé : « plus léger sur ORC (bleu léger) et violet sur SAV ») : bleu information très pâle / violet pâle, mêlés au fond de carte
            const rk = rankOf.get(n.key), bgC = n.kind === "sav" ? "color-mix(in srgb, " + T.violet100 + " 80%, " + T.card + ")" : "color-mix(in srgb, " + T.info100 + " 45%, " + T.card + ")";
            return <React.Fragment key={n.key}>
              {head && <h3 className="enogia-nd-month enogia-nd-glass" style={{ gridColumn: "1 / -1", top: barH, margin: "2px -12px 0", padding: "7px 14px", fontSize: 13, fontWeight: 600, color: T.ink700, fontFamily: T.font }}>{monthLab(n.date)}</h3>}
              <article className="enogia-nd-need" aria-label={"Besoin n° " + rk + ", " + (n.kind === "sav" ? "SAV " : "ORC ") + n.label} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px", borderRadius: 12, minWidth: 0, boxSizing: "border-box", background: bgC,
              boxShadow: "inset 0 0 0 " + (n.late || badI.length ? "1.5px " + T.red600 : "1px " + (done ? T.emerald600 : n.kind === "sav" ? "color-mix(in srgb, " + T.violet500 + " 45%, transparent)" : "color-mix(in srgb, " + T.info600 + " 22%, transparent)")) }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px 6px", flexWrap: "wrap", minWidth: 0, minHeight: 24 }}>
                {canEdit && <span style={{ display: "inline-flex", gap: 2 }}>
                  <button type="button" aria-label={"Monter " + n.label + " d'un cran dans l'ordre de besoin"} disabled={!canUp} onClick={() => moveNeed(n, -1)} style={{ ...arrowB, opacity: canUp ? 1 : 0.35, cursor: canUp ? "pointer" : "default" }}>▲</button>
                  <button type="button" aria-label={"Descendre " + n.label + " d'un cran dans l'ordre de besoin"} disabled={!canDown} onClick={() => moveNeed(n, 1)} style={{ ...arrowB, opacity: canDown ? 1 : 0.35, cursor: canDown ? "pointer" : "default" }}>▼</button></span>}
                {rankEdit === n.key ? <input type="number" min={1} max={needs.length} defaultValue={rk} autoFocus={AF} aria-label={"Priorité de " + n.label + " (1 à " + needs.length + ")"}
                    onKeyDown={e => { if (e.key === "Enter") setRank(n, +e.currentTarget.value); if (e.key === "Escape") setRankEdit(null); }} onBlur={e => setRank(n, +e.currentTarget.value)}
                    style={{ width: 52, height: 24, borderRadius: 8, border: "1px solid " + T.ink900, background: T.card, color: T.ink900, fontSize: 12, fontWeight: 600, padding: "0 4px", fontFamily: T.font }} />
                  : <button type="button" disabled={!canEdit} onClick={() => setRankEdit(n.key)} title={canEdit ? "Priorité n° " + rk + " : cliquer pour l'échanger avec un autre besoin, même d'un autre mois" : "Priorité n° " + rk} aria-label={"Priorité n° " + rk + " de " + n.label}
                    style={{ minWidth: 22, height: 22, padding: "0 5px", boxSizing: "border-box", border: "none", borderRadius: 999, background: T.ink900, color: T.card, display: "inline-grid", placeItems: "center", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", cursor: canEdit ? "pointer" : "default", fontFamily: T.font }}>{rk}</button>}
                <ProgBar p={T3 ? G3 / T3 : 1} /><b style={{ fontFamily: T.fontMono, fontSize: 13, whiteSpace: "nowrap" }}>{n.label}</b>
                {meta && <CountryFlag pays={meta.pays} size={13} />}
                <span style={{ ...pill, background: T.card, color: n.kind === "sav" ? T.violet600 : T.ink700 }}>{n.kind === "sav" ? "SAV" : "ORC"}</span>
                <span title={n.sub} style={{ flex: "1 1 80px", minWidth: 0, fontSize: 12, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}{meta && meta.pays && meta.pays !== "—" ? " · " + meta.pays : ""}</span>
                {n.kind === "sav" && canEdit && <button type="button" onClick={() => setSav({ id: n.id, ...n.raw, injB: n.raw.injB == null ? "" : String(n.raw.injB) })} style={{ ...linkB, color: T.ink500, fontWeight: 500 }}>modifier</button>}
                <span style={{ fontSize: 12, color: T.ink700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>pour le <b>{fdS(n.date)}</b></span>
                {canEdit && <button type="button" onClick={() => closeNeed(n)} title="Turbines installées : retirer ce besoin de la liste" aria-label={"Clore le besoin " + n.label} style={{ ...themeBtn(allDone(n) ? "sec" : "ghost", "sm"), minHeight: 26, padding: "0 8px", fontSize: 12 }}>Clore</button>}
                {canEdit && <button type="button" aria-label={"Configuration des turbines de " + n.label + " (" + n.cfg.l + ")"} title={"Configuration : " + n.cfg.l} onClick={e => setPop({ n, kind: "cfg", el: e.currentTarget })} style={{ ...arrowB, fontSize: 14, border: "none", background: "transparent" }}>⋯</button>}
              </div>
              {badI.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>{badI.map((i, q) => <span key={q} style={{ fontSize: 12, fontWeight: 600, color: T.red600 }}>{i.t}</span>)}</div>}
              {n.slots.map(x => {
                const rr = x.roue ? x.roue.ref : x.roueMontee, roueBad = !!(n.roue && rr && U2(rr) !== U2(n.roue)), injBad = !!(n.inj && x.inj && U2(x.inj.ref) !== U2(n.inj));
                const full = !!(x.t && x.roueOk && x.inj), tT = x.installee ? TN.inst : TN.turbine;
                const tDet = x.installee ? "le " + fdS(x.installee) : x.t ? (x.t.livree ? "sortie du stock" : x.t.sansRoue || (x.t.dispo && !x.t.roue) ? "sans roue" : x.t.dispo ? "prête" : x.t.end ? "fin " + fdS(x.t.end) : "sans date") : "";
                const injDet = x.inj ? (x.inj.bouches == null ? (n.injB ? "vierge · " + n.injB + " à boucher" : "vierge") : x.inj.bouches + " bouchage" + (x.inj.bouches > 1 ? "s" : "") + (n.injB != null && +x.inj.bouches !== n.injB ? " (prévu " + n.injB + ")" : "")) : "";
                return <React.Fragment key={x.i}>
                  <div style={{ display: "grid", gridTemplateColumns: "16px repeat(3, minmax(0, 1fr))", gap: 4, alignItems: "stretch" }}>
                    <span aria-hidden="true" style={{ display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: T.ink300 }}>{n.want > 1 || x.extra ? x.i + 1 : ""}</span>
                    <Sock ctx={ctx} n={n} s={x} kind="roue" label={x.t && !x.roueOk ? "Roue à poser" : "Roue"} want={n.roue} hint={n.roue ? "prévue" : ""} tone={x.roueOk ? (roueBad ? TN.bad : TN.roue) : null}>
                      {x.roueOk && <Piece tone={roueBad ? TN.bad : TN.roue} icon={roueBad ? null : IC.ok} label="Roue" val={rr} detail={roueBad ? "prévue " + n.roue : x.roue ? "prise dans le stock" : "montée sur la turbine"} x={x.roue && !x.installee && xBtn("Remettre la roue " + rr + " en stock", () => outAlloc(x.roue))} />}</Sock>
                    <Sock ctx={ctx} n={n} s={x} kind="inj" label="Injecteur" want={injTxt(n)} hint={n.inj ? (n.injB ? n.injB + " bouchage" + (n.injB > 1 ? "s" : "") + " prévu" + (n.injB > 1 ? "s" : "") : "vierge prévu") : ""} tone={x.inj ? (injBad ? TN.bad : TN.inj) : null}>
                      {x.inj && <Piece tone={injBad ? TN.bad : TN.inj} icon={injBad ? null : IC.ok} label="Injecteur" val={x.inj.ref} detail={injBad ? "prévu " + n.inj : injDet} x={!x.installee && xBtn("Remettre l'injecteur " + x.inj.ref + " en stock", () => outAlloc(x.inj))} />}</Sock>
                    <Sock ctx={ctx} n={n} s={x} kind="turbine" label={"Turbine " + n.cfg.g + " kW"} want={x.estNum} hint={x.estNum ? "prochaine libre" : ""} empty={x.estNum ? "" : "glisser une turbine"} tone={x.t ? tT : null}>
                      {x.t && <Piece tone={tT} icon={x.installee ? IC.lock : IC.ok} label={x.installee ? "Installée" : "Turbine allouée"} val={x.t.num || "sans n°"} mono detail={tDet} x={!x.installee && xBtn("Retirer " + (x.t.num || "la turbine"), () => outTurbine(x.t))} />}</Sock>
                  </div>
                  {!x.extra && <div style={{ display: "grid", gridTemplateColumns: "16px minmax(0, 1fr) auto", gap: 6, alignItems: "center", minHeight: 24, fontSize: 12, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>
                    <span />
                    {/* v302 (demandé : « la frise chronologique n'est pas claire du tout ») : une phrase — disponible le … pour un besoin le … — et l'écart */}
                    {x.installee ? <span style={{ color: T.emerald600, fontWeight: 600 }}>Installée sur la machine le {fdS(x.installee)}</span>
                      : x.dispo ? <span style={{ color: T.ink700 }}>{x.t ? "Turbine disponible le " : "Prochaine turbine libre le "}<b>{fdS(x.dispo)}</b>{x.estimee ? " (estimée)" : ""}, besoin le <b>{fdS(n.date)}</b></span>
                        : <span>{x.t && x.t.missing ? "Pas de date : pas d'arbre prévu" : "Pas de date : aucune turbine libre de cette gamme"}</span>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                      {!x.installee && x.ecart != null && <span style={{ ...pill, padding: "2px 8px", fontSize: 12, background: x.ecart < 0 ? T.red100 : x.ecart < 5 ? T.amber100 : T.emerald100 }}>{gapEl(x)}</span>}
                      {/* v301 (demandé : « je ne peux pas valider des turbines allouées ») : bouton dès qu'une turbine est allouée ; s'il manque une pièce, on le confirme */}
                      {canEdit && x.t && <button type="button" disabled={busy} onClick={() => install(n, x, full)} style={{ ...themeBtn(x.installee ? "ghost" : "sec", "sm"), minHeight: 24, padding: "0 8px" }}>{x.installee ? "Annuler l'installation" : "Marquer installée"}</button>}
                    </span>
                  </div>}
                </React.Fragment>; })}
            </article></React.Fragment>; })}
          {!shown.length && <div style={{ gridColumn: "1 / -1", padding: 30, textAlign: "center", color: T.ink500, fontSize: FZ.sm }}>{needs.length ? "Tout est installé. Décochez « À compléter » pour tout voir." : "Aucun PJ en cours avec une turbine, ni besoin SAV."}</div>}
        </div>
      </section>
    </div>
    {msg && <div role="status" className="enogia-bell-peek" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 10015, background: msg.bad ? T.red600 : T.ink900, color: T.card, borderRadius: 12, padding: "9px 14px", fontSize: FZ.sm, boxShadow: T.shadowLg, display: "flex", gap: 12, alignItems: "center", maxWidth: "min(640px, 92vw)" }}>
      <span>{msg.t}</span>{msg.undo && <button type="button" onClick={() => { const u = msg.undo; setMsg(null); u(); }} style={{ border: "none", background: "transparent", color: T.card, fontWeight: 600, textDecoration: "underline", cursor: "pointer", fontFamily: T.font }}>Annuler</button>}
      <button type="button" aria-label="Fermer" onClick={() => setMsg(null)} style={{ border: "none", background: "transparent", color: T.card, cursor: "pointer", minWidth: 24, minHeight: 24 }}><NavIcon name="close" size={14} /></button></div>}
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
    {closedDlg && <div onMouseDown={e => { if (e.target === e.currentTarget) setClosedDlg(false); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Besoins clos" onKeyDown={e => { if (e.key === "Escape") setClosedDlg(false); }} style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(520px,100%)", maxHeight: "80dvh", overflowY: "auto", padding: "16px 18px", fontFamily: T.font, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: FZ.lg, fontWeight: 600 }}>Besoins clos ({closedL.length})</div>
        <div style={{ fontSize: 12, color: T.ink500 }}>Retirés de la liste (turbines installées). « Rouvrir » les remet dans la liste, avec leurs turbines et pièces.</div>
        {closedL.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucun besoin clos</div> : closedL.map(c => <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, borderTop: "1px solid " + T.line }}>
          <b style={{ fontFamily: T.fontMono, fontSize: 13 }}>{c.label}</b><span style={{ fontSize: 12, color: c.kind === "sav" ? T.violet600 : T.ink700 }}>{c.kind === "sav" ? "SAV" : "ORC"}</span>
          <span style={{ flex: 1, fontSize: 12, color: T.ink500 }}>{c.at ? "clos le " + new Date(c.at).toLocaleDateString("fr-FR") : ""}{c.by ? " par " + c.by : ""}</span>
          {canEdit && <button type="button" onClick={() => reopenNeed(c)} style={{ ...themeBtn("sec", "sm") }}>Rouvrir</button>}</div>)}
        <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" onClick={() => setClosedDlg(false)} style={{ ...themeBtn("sec", "md") }}>Fermer</button></div>
      </div></div>}
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
  const btn = p => themeBtn(p ? "pri" : "sec", "md"); // v292 : bouton commun
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
            <select value={gamme} onChange={e => setGamme(e.target.value)} style={{ minHeight: 30, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900 }}><option value="100">100 kW</option><option value="20">20 kW</option></select></label>
          <table style={{ borderCollapse: "collapse", fontSize: FZ.sm, fontVariantNumeric: "tabular-nums" }}><tbody>
            {COLLS.map(c => <tr key={c}><td style={{ padding: "3px 12px 3px 0", color: T.ink700 }}>{LBL[c]}</td><td style={{ padding: "3px 12px", fontWeight: 600 }}>{count(c, false)} à ajouter</td><td style={{ padding: "3px 0", color: T.ink500 }}>{count(c, true) ? count(c, true) + " déjà présent" + (count(c, true) > 1 ? "s" : "") + ", ignoré" + (count(c, true) > 1 ? "s" : "") : ""}</td></tr>)}
          </tbody></table>
          {params && <label style={{ fontSize: FZ.sm, color: T.ink700, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={useParams} onChange={e => setUseParams(e.target.checked)} />Reprendre aussi ses durées et noms d'étapes (remplace ceux de la gamme {gamme} kW)</label>}
        </div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button type="button" style={btn(false)} disabled={busy} onClick={onClose}>Annuler</button>
          <button type="button" style={btn(true)} disabled={busy || !plan || !plan.some(x => !x.dup)} onClick={go}>{busy ? "Import…" : "Importer " + (plan ? plan.filter(x => !x.dup).length : 0) + " élément" + (plan && plan.filter(x => !x.dup).length > 1 ? "s" : "")}</button>
        </div>
      </>}
      {done && <div><div style={{ fontSize: FZ.sm, fontWeight: 600, color: done.ko ? T.red600 : T.emerald600 }}>{done.n} élément{done.n > 1 ? "s" : ""} importé{done.n > 1 ? "s" : ""}{done.ko ? " · " + done.ko + " en erreur" : ""}.</div><div style={{ textAlign: "right", marginTop: 12 }}><button type="button" style={btn(true)} onClick={onClose}>Fermer</button></div></div>}
    </div>
  </div>);
}

const TABS = [["prod", "Production"], ["orc", "Besoins ORC et SAV"]]; // identifiants gardés (clé enogia_turbines_tab)
export function TurbinesHub({ doc, api, rows, canEdit, owner, savePjMeta, tab: tabP, onTab, allowTabs, authorName }) {
  const [tab0, setTab0] = useState(() => { try { const v = localStorage.getItem("enogia_turbines_tab"); return TABS.some(t => t[0] === v) ? v : "prod"; } catch (e) { return "prod"; } });
  const tab = tabP || tab0, setTab = onTab || setTab0; // v307 : sous-page choisie aussi depuis le menu (App)
  useEffect(() => { try { localStorage.setItem("enogia_turbines_tab", tab); } catch (e) { /* stockage indisponible */ } }, [tab]);
  const [imp, setImp] = useState(false);
  const pjs = useMemo(() => (rows || []).filter(r => r && r.pj && r.etat !== "SHIPPED" && r.etat !== "SLOT_LIBRE").map(r => r.pj + (getPjMeta(r.pj, r).nomProjet ? " - " + getPjMeta(r.pj, r).nomProjet : "")), [rows]);
  const top = useRef(null);
  // v300 (demandé : « changer le design pour passer de la page Production à la page Besoins ») : deux grands boutons avec leurs chiffres
  const counts = useMemo(() => { const tb = allTurbines(doc).filter(x => !x.livree && !x.besoin), { needs } = buildNeeds(doc, rows, r => getPjMeta(r.pj, r)), sl = needs.flatMap(n => n.slots.filter(x => !x.extra));
    return { fab: tb.filter(x => !x.dispo).length, ready: tb.filter(x => x.dispo).length, todo: sl.filter(x => !x.t).length, late: sl.filter(x => !x.installee && x.ecart != null && x.ecart < 0).length }; }, [doc, rows]);
  return (<div ref={top}>
    {/* v307 (même sélecteur sur toutes les pages) : remplace les deux grands boutons de la V300 ; les chiffres passent en pastilles */}
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
      <PlanSwitch label="Turbines" value={tab} onGo={setTab} tools={[]} views={[{ id: "prod", l: "Production", badge: counts.ready ? counts.ready + " prêtes" : null },
        { id: "orc", l: "Besoins ORC et SAV", badge: counts.todo ? counts.todo + " à attribuer" : null, badgeBad: counts.late > 0 }].filter(v => !allowTabs || allowTabs.includes(v.id))} />
      <span style={{ fontSize: 12, color: T.ink500 }}>{tab === "prod" ? counts.fab + " en fabrication · " + counts.ready + " prêtes, libres" : counts.todo + " à attribuer" + (counts.late ? " · " + counts.late + " en retard" : "")}</span>
    </div>
    <div style={{ display: tab === "prod" && canEdit ? "flex" : "none", justifyContent: "flex-end", marginBottom: 8 }}>
      {/* v268 (demandé : « mettre à disposition le bouton importer à Jérémie ») : toute personne qui peut modifier la production (propriétaire + liste d’accès) */}
      {canEdit && tab === "prod" && <button type="button" onClick={() => setImp(true)} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "4px 12px", minHeight: 30, fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Importer des données (JSON)</button>}
    </div>
    {tab === "prod" ? <ProdTurbines doc={doc} api={api} canEdit={canEdit} owner={owner} pjs={pjs} /> : <NeedsView doc={doc} api={api} rows={rows} canEdit={canEdit} savePjMeta={savePjMeta} authorName={authorName} />}
    {imp && <ImportDialog doc={doc} api={api} onClose={() => setImp(false)} />}
  </div>);
}
