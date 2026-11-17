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
import { allTurbines, monthOf, swapNeedKeys, placeNeedKey, TURB_CFGS, cfgById, machinesOf, proposeAlloc, SAV_STATUTS, refsOf, buildNeeds, assignOps, unassignOps, installOps, allocOps, unallocOps, stockTiles, injInfo, maxBouches, autoFill, roueConflict, prodState, workDate, pjOfAffaire, closedNeeds } from "../turbineNeeds";
import { getPjMeta, CountryFlag } from "../pjMeta";
import { askConfirm } from "../confirm";
import { AF } from "../autoFocusOk";

const COLLS = ["turbines", "arbres", "pieces", "roues", "injecteurs"];
export { prodState, workDate, pjOfAffaire };

// v270 : fenêtre d'un besoin SAV (création / modification) — L hors du composant (sinon le champ perd le focus à chaque frappe)
const L = ({ l, children }) => <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: T.ink500 }}>{l}{children}</label>;
// v383 (demandé : « revoir la demande de turbines SAV ») : statut hypothétique / confirmée, PJ, un ORC ou plusieurs du même PJ, nombre de turbines,
// chaque turbine liée à un ORC ou « à préciser après l'intervention » (proposition automatique), ticket et intervention SAV liés. Rouvrable.
const PJ_BASE = pj => String(pj || "").replace(/-\d+$/, "");
function SavDialog({ doc, init, rows, sav, onSave, onDelete, onClose }) {
  const [v, setV] = useState(() => { const i = init || {}, legacy = !i.qty && i.cfg ? cfgById(i.cfg) : null;
    return { label: "", pj: "", scope: "one", orcs: [], qty: legacy ? legacy.n : 2, gamme: legacy ? legacy.g : "100", alloc: [], statut: "hypo", ticket: "", inter: "", roue: "", inj: "", injB: "", date: "", note: "", ...i, ...(legacy ? { qty: legacy.n, gamme: legacy.g } : {}) }; });
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const set = patch => setV(x => ({ ...x, ...patch }));
  const pjs = useMemo(() => [...new Set((rows || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE").map(r => PJ_BASE(r.pj)))].sort((p, q) => p.localeCompare(q, "fr", { numeric: true })), [rows]);
  const M = machinesOf(rows, v.pj), chosen = v.scope === "one" ? M.filter(m => m.pj === (v.orcs || [])[0]) : M.filter(m => (v.orcs || []).includes(m.pj));
  const qty = Math.max(1, Math.min(30, Math.round(+v.qty || 1))), alloc = Array.from({ length: qty }, (_, i) => (v.alloc || [])[i] || "");
  const choosePj = pj => { const L = machinesOf(rows, pj), num = String(pj).replace(/\D/g, "");
    set({ pj, orcs: L.length === 1 ? [L[0].pj] : [], scope: L.length > 1 ? v.scope : "one", gamme: L[0] ? L[0].g : v.gamme, label: v.label && !/^SAV\d*$/.test(v.label) ? v.label : (num ? "SAV" + num : v.label), alloc: [] }); };
  const setOrcs = orcs => { const L = M.filter(m => orcs.includes(m.pj)), q = L.reduce((t, m) => t + (m.per || 1), 0) || qty; set({ orcs, qty: q, alloc: v.scope === "one" ? proposeAlloc(L, q) : alloc.map(x => (orcs.includes(x) ? x : "")) }); };
  const g = v.gamme === "20" ? "20" : "100", roues = refsOf(doc, "roues", g), injs = refsOf(doc, "injecteurs", g), ii = v.inj ? injInfo(doc, v.inj) : null, mx = ii ? maxBouches(ii.ouv) : 99;
  const tickets = Object.entries((sav && sav.tickets) || {}).filter(([, t]) => t && (!v.pj || PJ_BASE(t.pj) === PJ_BASE(v.pj))).sort((p, q) => q[0].localeCompare(p[0]));
  const inters = Object.entries((sav && sav.inters) || {}).filter(([, i]) => i && (!v.pj || PJ_BASE(i.pj) === PJ_BASE(v.pj)) && (!v.ticket || !i.tk || i.tk === v.ticket)).sort((p, q) => q[0].localeCompare(p[0]));
  const f = { minHeight: 34, borderRadius: 8, border: "1px solid " + T.fieldLine, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, padding: "0 8px", width: "100%", boxSizing: "border-box" };
  const seg = (on, onClick, label, tone) => <button type="button" role="radio" aria-checked={on} onClick={onClick} style={{ flex: 1, minHeight: 34, borderRadius: 8, border: "1px solid " + (on ? (tone || T.ink900) : T.line), background: on ? (tone ? "color-mix(in srgb, " + tone + " 14%, " + T.card + ")" : T.surfaceAlt) : T.card, color: on ? (tone || T.ink900) : T.ink700, fontWeight: on ? 600 : 500, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font }}>{label}</button>;
  const unknown = alloc.filter(x => !x).length;
  const ok = v.label.trim() && v.pj;
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label={init && init.id ? "Demande de turbines " + (init.label || "") : "Nouvelle demande de turbines SAV"} style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(640px,100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: FZ.lg, fontWeight: 600 }}>{init && init.id ? "Demande de turbines · " + (init.label || "SAV") : "Nouvelle demande de turbines SAV"}</div>
      <div role="radiogroup" aria-label="Statut de la demande" style={{ display: "flex", gap: 6 }}>{seg(v.statut === "hypo", () => set({ statut: "hypo" }), "Hypothétique", T.amber600)}{seg(v.statut === "conf", () => set({ statut: "conf" }), "Confirmée", T.emerald600)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <L l="PJ concerné"><input list="enogia-sav-pjs" value={v.pj} onChange={e => choosePj(e.target.value.trim().toUpperCase())} placeholder="PJ406" autoFocus={AF} style={f} /><datalist id="enogia-sav-pjs">{pjs.map(p => <option key={p} value={p} />)}</datalist></L>
        <L l="N° SAV / client"><input value={v.label} onChange={e => set({ label: e.target.value })} placeholder="SAV406" style={f} /></L>
        <L l="Pour le"><input type="date" value={v.date} onChange={e => set({ date: e.target.value })} style={f} /></L>
      </div>
      {v.pj && <div style={{ display: "flex", flexDirection: "column", gap: 8, background: T.surfaceAlt, borderRadius: 8, padding: "10px 12px" }}>
        <div role="radiogroup" aria-label="Pour un ORC ou plusieurs" style={{ display: "flex", gap: 6 }}>{seg(v.scope === "one", () => set({ scope: "one", orcs: (v.orcs || []).slice(0, 1) }), "Un ORC")}{seg(v.scope === "multi", () => set({ scope: "multi" }), "Plusieurs ORC de " + v.pj)}</div>
        {M.length === 0 ? <div style={{ fontSize: 12, color: T.ink500 }}>Aucun ORC de {v.pj} dans le planning : les turbines resteront « à préciser ».</div>
        : v.scope === "one" ? <L l="ORC"><select value={(v.orcs || [])[0] || ""} onChange={e => setOrcs(e.target.value ? [e.target.value] : [])} style={f}><option value="">À préciser après l'intervention</option>{M.map(m => <option key={m.pj} value={m.pj}>{m.pj}{m.gamme ? " · " + m.gamme : ""} · {m.per} turbine{m.per > 1 ? "s" : ""}</option>)}</select></L>
        : <div role="group" aria-label="ORC concernés" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{M.map(m => { const on = (v.orcs || []).includes(m.pj); return <label key={m.pj} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 10px", borderRadius: 8, border: "1px solid " + (on ? T.accentInk : T.line), background: on ? T.card : "transparent", fontSize: FZ.sm, cursor: "pointer" }}>
            <input type="checkbox" checked={on} onChange={() => setOrcs(on ? v.orcs.filter(x => x !== m.pj) : [...(v.orcs || []), m.pj])} />{m.pj}<span style={{ fontSize: 12, color: T.ink500 }}>{m.per} t.</span></label>; })}</div>}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <L l="Nombre de turbines"><input type="number" min={1} max={30} value={v.qty} onChange={e => set({ qty: e.target.value })} style={{ ...f, width: 110 }} /></L>
          <L l="Turbine"><select value={g} onChange={e => set({ gamme: e.target.value })} style={{ ...f, width: 130 }}><option value="100">100 kW</option><option value="20">20 kW</option></select></L>
          {(v.scope === "multi" ? chosen.length > 0 : chosen.length === 1) && <button type="button" onClick={() => set({ alloc: proposeAlloc(chosen, qty) })} style={{ ...themeBtn("sec", "sm"), minHeight: 34 }}>Proposer la répartition</button>}
        </div>
        <div role="group" aria-label="ORC de chaque turbine" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 6 }}>
          {alloc.map((x, i) => <label key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.ink500 }}>T{i + 1}
            <select value={x} onChange={e => { const A = alloc.slice(); A[i] = e.target.value; set({ alloc: A }); }} aria-label={"ORC de la turbine " + (i + 1)} style={{ ...f, minHeight: 30, color: x ? T.ink900 : T.ink500 }}><option value="">À préciser</option>{(chosen.length ? chosen : M).map(m => <option key={m.pj} value={m.pj}>{m.pj}</option>)}</select></label>)}
        </div>
        <div style={{ fontSize: 12, color: T.ink500 }}>{unknown ? unknown + " turbine" + (unknown > 1 ? "s" : "") + " à préciser : le SAV indiquera l'ORC après son intervention (« modifier » sur la carte)." : "Chaque turbine est liée à un ORC."}</div>
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <L l="Ticket SAV lié">{sav ? <select value={v.ticket} onChange={e => set({ ticket: e.target.value, inter: "" })} style={f}><option value="">Aucun</option>{tickets.map(([id, t]) => <option key={id} value={id}>{id} · {t.pj}{t.det ? " · " + String(t.det).slice(0, 40) : ""}</option>)}{v.ticket && !tickets.some(([id]) => id === v.ticket) && <option value={v.ticket}>{v.ticket}</option>}</select>
          : <input value={v.ticket} onChange={e => set({ ticket: e.target.value.trim() })} placeholder="TC-26-03" style={f} />}</L>
        <L l="Intervention liée">{sav ? <select value={v.inter} onChange={e => set({ inter: e.target.value })} style={f}><option value="">Aucune</option>{inters.map(([id, i]) => <option key={id} value={id}>{id} · {i.pj}{i.a ? " · " + i.a.slice(8, 10) + "/" + i.a.slice(5, 7) : ""}</option>)}{v.inter && !inters.some(([id]) => id === v.inter) && <option value={v.inter}>{v.inter}</option>}</select>
          : <input value={v.inter} onChange={e => set({ inter: e.target.value.trim() })} placeholder="INT-012" style={f} />}</L>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <L l="Roue"><select value={v.roue} onChange={e => set({ roue: e.target.value })} style={f}><option value="">À choisir</option>{[...new Set([...roues, ...(v.roue ? [v.roue] : [])])].map(r => <option key={r} value={r}>{r}</option>)}</select></L>
        <L l="Injecteur"><select value={v.inj} onChange={e => set({ inj: e.target.value })} style={f}><option value="">À choisir</option>{[...new Set([...injs, ...(v.inj ? [v.inj] : [])])].map(r => <option key={r} value={r}>{r}</option>)}</select></L>
        <L l={"Bouchages" + (ii && ii.ouv ? " (sur " + ii.ouv + ")" : "")}><input type="number" min={0} max={mx} value={v.injB} onChange={e => set({ injB: e.target.value === "" ? "" : String(Math.max(0, Math.min(mx, Math.round(+e.target.value)))) })} style={f} /></L>
      </div>
      <L l="Note"><input value={v.note} onChange={e => set({ note: e.target.value })} style={f} /></L>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {onDelete && <button type="button" style={{ ...themeBtn("dan", "md"), marginRight: "auto" }} onClick={onDelete}>Supprimer</button>}
        <button type="button" style={themeBtn("sec", "md")} onClick={onClose}>Annuler</button>
        <button type="button" style={themeBtn("pri", "md")} disabled={!ok} onClick={() => onSave({ ...v, label: v.label.trim(), qty, gamme: g, alloc, orcs: v.scope === "one" ? (v.orcs || []).slice(0, 1) : (v.orcs || []) })}>Enregistrer</button>
      </div>
      {!ok && <div style={{ fontSize: 12, color: T.ink500, textAlign: "right" }}>Indiquez le PJ et le n° SAV</div>}
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
    <div style={{ fontSize: 12, color: T.ink500, fontWeight: 500, marginBottom: 6 }}>{title}</div>
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
.enogia-nd-tile{transition:transform var(--e-dur-micro) cubic-bezier(.2,.8,.2,1),box-shadow var(--e-dur-micro),opacity var(--e-dur-menu)}
.enogia-nd-tile:active{transform:scale(.97)}
.enogia-nd-sock{transition:background var(--e-dur-menu),box-shadow var(--e-dur-menu),transform var(--e-dur-menu) cubic-bezier(.2,.8,.2,1),opacity var(--e-dur-menu)}
.enogia-nd-sock[role=button]{cursor:pointer}
.enogia-nd-sock[role=button]:active{transform:scale(.97);transition-duration:var(--e-dur-micro)}
.enogia-nd-grip{width:20px;height:28px;display:inline-grid;place-items:center;color:var(--nd-mute);border-radius:6px;cursor:grab;touch-action:none;flex-shrink:0}
.enogia-nd-grip:hover,.enogia-nd-grip:focus-visible{color:var(--nd-ink);background:var(--nd-alt)}
.enogia-nd-rank{min-width:24px;height:24px;padding:0 6px;border:none;border-radius:999px;background:transparent;color:var(--nd-mute);font:600 12px var(--nd-font);font-variant-numeric:tabular-nums;cursor:pointer}
.enogia-nd-rank:hover,.enogia-nd-rank[aria-expanded=true]{background:var(--nd-alt);color:var(--nd-ink)}
.enogia-nd-need{transition:box-shadow var(--e-dur-menu),opacity var(--e-dur-menu)}
.enogia-nd-need.is-lifted{opacity:.35}
.enogia-nd-pick{animation:enogiaNdPick var(--e-dur-menu) cubic-bezier(.2,.8,.2,1);transform-origin:top left}
@keyframes enogiaNdPick{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
.enogia-nd-pick button.slot:hover{background:var(--nd-alt)}
.enogia-nd-month{position:sticky;z-index:2;border-bottom:1px solid var(--nd-line)}
.enogia-nd-land{animation:enogiaNdLand 260ms cubic-bezier(.2,.8,.2,1)}
@keyframes enogiaNdLand{0%{transform:scale(1.06)}100%{transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.enogia-nd-pick{animation:none}.enogia-nd-land{animation:none}.enogia-nd-sock,.enogia-nd-tile{transition:none}}

@media (max-width: 860px){.enogia-nd-app{grid-template-columns:1fr !important;height:auto !important;overflow:clip !important}.enogia-nd-need{grid-template-columns:1fr !important}.enogia-nd-stock{position:sticky !important;bottom:0;order:2;z-index:6;border-right:none !important;border-top:1px solid var(--nd-line);max-height:50vh;overflow-y:auto}.enogia-nd-stock[data-open="0"]{max-height:52px;overflow:hidden}.enogia-nd-drawer{display:inline-flex !important}}
/* v333 (audit tablette) : sous 860 px, le stock devient un tiroir collé en bas, replié par défaut (toucher une pièce le referme) */`;
// v300 (maquette V300 validée : « Go ») : tuile du stock compacte, 30 px, liseré de couleur à gauche, quantité à droite
function Tile({ ctx, p, k, title, sub, q, disabled, tc, subMono }) { const { dnd, canEdit, setPicked, isPicked } = ctx; const on = !!(dnd.drag && (p.kind === "turbine" ? dnd.drag.id === p.id : dnd.drag.stockId === p.stockId && String(dnd.drag.bouches) === String(p.bouches)));
    return <div role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled || undefined} aria-pressed={isPicked(p)} className="enogia-nd-tile" aria-label={title + " " + sub + (q != null ? ", " + q + " en stock" : "")} title={title + (sub ? " · " + sub : "")}
      {...(canEdit && !disabled ? dnd.dragProps(p) : {})}
      onClick={() => { if (!canEdit || disabled) return; setPicked(isPicked(p) ? null : p); }}
      onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && canEdit && !disabled) { e.preventDefault(); setPicked(isPicked(p) ? null : p); } }}
      style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 8px 0 10px", boxSizing: "border-box", minWidth: 0, borderRadius: 8, background: T.card, boxShadow: "inset 3px 0 0 " + k + ", inset 0 0 0 " + (isPicked(p) ? "2px " + T.ink900 : "1px " + T.line), cursor: canEdit && !disabled ? "grab" : "default", touchAction: "none", userSelect: "none", opacity: on ? 0.25 : disabled ? 0.45 : 1, fontFamily: T.font }}>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 500, fontSize: 12, color: tc || T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      {sub && <span style={{ fontSize: subMono ? 12 : 12, fontFamily: subMono ? T.fontMono : T.font, color: T.ink500, whiteSpace: "nowrap" }}>{sub}</span>}
      {q != null && <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: q ? T.ink700 : T.red600 }}>{q}</span>}
    </div>; }
const IC = {
  ok: <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M2.5 6.5l2.2 2.2L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  lock: <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}><rect x="2.5" y="5.5" width="7" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M4 5.5V4a2 2 0 014 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>,
  grip: <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true" style={{ flexShrink: 0 }}><g fill="currentColor"><circle cx="2" cy="3" r="1.4" /><circle cx="8" cy="3" r="1.4" /><circle cx="2" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="2" cy="13" r="1.4" /><circle cx="8" cy="13" r="1.4" /></g></svg>,
  plus: <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M6 2.5v7M2.5 6h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
};
// v373 (piste E) : « Placer PJ… » — la liste du mois, on touche la place voulue ; en bas, le rang global (échange avec le besoin qui l'a)
function RankPicker({ n, at: anchor, list, rankOf, total, onPlace, onRank, onClose }) {
  const at = anchor.isConnected ? anchor.getBoundingClientRect() : { left: 8, top: 8, bottom: 8 };
  const ref = React.useRef(null);
  React.useEffect(() => { const el = ref.current; const f = el && el.querySelector("button.slot:not([aria-current])"); if (f) f.focus();
    const k = e => { if (e.key === "Escape") onClose(); }, c = e => { if (el && !el.contains(e.target) && !e.target.closest(".enogia-nd-rank")) onClose(); };
    window.addEventListener("keydown", k); document.addEventListener("pointerdown", c); return () => { window.removeEventListener("keydown", k); document.removeEventListener("pointerdown", c); }; }, [onClose]);
  const left = Math.max(8, Math.min(at.left, window.innerWidth - 316)), top = at.bottom + 6 + 360 > window.innerHeight ? Math.max(8, at.top - 6 - Math.min(360, 60 + list.length * 40)) : at.bottom + 6;
  const me = rankOf.get(n.key), fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) : "—");
  return <div ref={ref} role="dialog" aria-label={"Placer " + n.label} className="enogia-nd-pick" style={{ position: "fixed", left, top, zIndex: 9000, width: 300, maxHeight: 360, overflowY: "auto", background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: 8, fontFamily: T.font }}>
    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink900, padding: "2px 6px 6px" }}>Placer {n.label}…</div>
    {list.map(m => { const rk = rankOf.get(m.key), cur = m.key === n.key;
      return <button key={m.key} type="button" className="slot" aria-current={cur ? "true" : undefined} onClick={() => (cur ? onClose() : onPlace(m))}
        style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) auto", gap: 8, alignItems: "center", width: "100%", minHeight: 40, padding: "6px 8px", border: "none", borderRadius: 8, background: cur ? T.info100 : "transparent", color: T.ink900, cursor: "pointer", textAlign: "left", fontFamily: T.font }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{rk}</span>
        <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}><b style={{ fontFamily: T.fontMono, fontWeight: 600 }}>{m.label}</b> <span style={{ color: T.ink500, fontSize: 12 }}>pour le {fd(m.date)}</span></span>
        <span style={{ fontSize: 12, color: cur ? T.info600 : T.ink500 }}>{cur ? "ici" : rk < me ? "avant" : "après"}</span></button>; })}
    <form onSubmit={e => { e.preventDefault(); const v = +e.currentTarget.elements.rg.value; if (v >= 1 && v <= total) onRank(v); }} style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid " + T.line, marginTop: 6, padding: "8px 6px 2px", fontSize: 12, color: T.ink500 }}>
      <label htmlFor="enogia-nd-rg">Rang global (autre mois)</label>
      <input id="enogia-nd-rg" name="rg" type="number" min={1} max={total} defaultValue={me} style={{ width: 56, minHeight: 28, borderRadius: 8, border: "1px solid " + T.fieldLine, background: T.card, color: T.ink900, fontFamily: T.font, fontSize: 13, padding: "0 6px" }} />
      <button type="submit" style={{ ...themeBtn("sec", "sm") }}>Échanger</button>
    </form>
  </div>;
}
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
      title={!filled && hint ? label + " : " + (want || "") + " (" + hint + ")" : undefined} role={!filled && !lock ? "button" : undefined} tabIndex={!filled && !lock ? 0 : undefined} aria-label={!filled ? label + " pour " + n.label + (lock ? ", verrouillé : turbine installée" : want ? ", prévu " + want : "") : undefined}
      onClick={!filled ? (e => { if (!canEdit || lock) return; if (picked) { if (acc(picked)) drop(n, s.i, picked); else setMsg({ t: "Cette pièce ne va pas dans ce logement.", warn: true }); } else if (kind !== "turbine") setPop({ n, kind: kind === "roue" ? "roue" : "inj", el: e.currentTarget }); }) : undefined}
      onKeyDown={!filled ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }) : undefined}
      style={{ position: "relative", minWidth: 0, height: 36, borderRadius: 8, padding: "0 6px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 4, border: bd, cursor: !filled && canEdit && !lock ? "pointer" : "default",
        background: refused ? T.red100 : over ? T.emerald100 : can ? T.surfaceAlt : filled ? tone.bg : "transparent", transform: over ? "scale(1.03)" : "none", opacity: active && !can0 && !filled ? 0.35 : 1 }}>
      {filled ? children : <>
        <span style={{ display: "inline-flex", color: refused ? T.red600 : T.ink500 }}>{lock ? IC.lock : IC.plus}</span>
        <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: want && !refused ? T.fontDisplay : T.font, fontSize: 12, fontWeight: want ? 600 : 500, color: refused ? T.red600 : want ? T.ink500 : kind === "turbine" ? T.ink500 : T.amber600 }}>{refused ? "Refusé : roue " + n.roue : want || empty || (kind === "turbine" ? "à glisser" : "à choisir")}</span>
</>}
    </div>;
  }
// contenu d'un logement rempli : quoi (icône + état), référence complète, détail
// v372 (demandé : « les trois pièces sur une ligne de 36 px », passe apple-design) : une ligne — icône d'état + référence ; quoi et détail dans la bulle
function Piece({ tone, icon, label, val, mono, detail, x }) {
  return <><span style={{ display: "inline-flex", color: tone.ink }}>{icon}</span>
    <span title={label + " : " + val + (detail ? " · " + detail : "")} style={{ minWidth: 0, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: mono ? T.fontMono : T.fontDisplay, fontSize: 13, fontWeight: 600, color: tone.ink, paddingRight: x ? 16 : 0 }}>{val}</span>{x}</>;
}
// v350 (audit de performance) : défini hors du composant (sinon recréé et remonté à chaque rendu)
const Sub = ({ t, n, children }) => <div style={{ display: "flex", flexDirection: "column", gap: 3 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 500, color: T.ink500, padding: "0 2px" }}><span>{t}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{n}</span></div>{children}</div>;
function NeedsView({ doc, api, rows, canEdit, savePjMeta, authorName, savDoc }) {
  const [tick, setTick] = useState(0); // la fiche PJ (pjMetaOverrides) change sans changer rows : recalcul après une modification ici
  const { needs, free } = useMemo(() => buildNeeds(doc, rows, r => getPjMeta(r.pj, r)), [doc, rows, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const dnd = usePointerDnD();
  const docRef = useRef(doc); docRef.current = doc;
  const [gam, setGam] = useState("100"), [msg, setMsg] = useState(null), [sav, setSav] = useState(null), [busy, setBusy] = useState(false), [pop, setPop] = useState(null), [picked, setPicked] = useState(null), [landed, setLanded] = useState(null), [drawer, setDrawer] = useState(false), [closedDlg, setClosedDlg] = useState(false);
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
  const saveSav = async v => { const id = (sav && sav.id) || "s" + Date.now().toString(36); const data = { label: v.label, pj: v.pj, scope: v.scope, orcs: v.orcs || [], qty: v.qty, gamme: v.gamme, alloc: v.alloc || [], statut: v.statut, ticket: v.ticket || "", inter: v.inter || "", roue: v.roue, inj: v.inj, injB: v.injB === "" || v.injB == null ? null : +v.injB, date: v.date, note: v.note, at: new Date().toISOString(), by: authorName || "" };
    if (await api.put("besoins", id, data)) { setSav(null); setMsg({ t: "Demande « " + v.label + " » enregistrée (" + v.qty + " turbine" + (v.qty > 1 ? "s" : "") + ", " + SAV_STATUTS[v.statut].toLowerCase() + ")." }); } };
  const delSav = async () => { if (!sav || !(await askConfirm({ title: "Supprimer le besoin SAV « " + sav.label + " » ?", message: "Turbines, roues et injecteurs attribués retournent dans le stock.", confirmLabel: "Supprimer le besoin", danger: true }))) return;
    const n = needs.find(x => x.key === "sav:" + sav.id); if (n) { for (const s of n.slots) { if (s.roue) await run(unallocOps(doc, s.roue)); if (s.inj) await run(unallocOps(doc, s.inj)); if (s.t) await run(unassignOps(doc, s.t)); } }
    await api.del("besoins", sav.id); setSav(null); };
  // v300 (maquette V300 validée) : ORC et SAV dans la même feuille (filtre Tout · ORC · SAV), cartes compactes (une turbine = une ligne
  // de 40 px), logements à 4 états, disponibilité sur une ligne fine ; stock : roues et injecteurs d'abord.
  const [fold, setFold] = useState(() => { try { return JSON.parse(localStorage.getItem("enogia_nd_fold") || "null") || { "En fabrication": true }; } catch (e) { return { "En fabrication": true }; } });
  const flipFold = t => setFold(f => { const nx = { ...f, [t]: !f[t] }; try { localStorage.setItem("enogia_nd_fold", JSON.stringify(nx)); } catch (e) { /* stockage indisponible */ } return nx; });
  // v373 (piste A + E validée) : la carte se glisse par sa poignée ; le rang ouvre « Placer … » (liste du mois, ou rang global)
  const [rankPick, setRankPick] = useState(null);
  const [kind, setKind0] = useState(() => { try { const v = localStorage.getItem("enogia_nd_kind"); return v === "pj" || v === "sav" ? v : "all"; } catch (e) { return "all"; } });
  const setKind = k => { setKind0(k); try { localStorage.setItem("enogia_nd_kind", k); } catch (e) { /* stockage indisponible */ } };
  const nOrc = needs.filter(n => n.kind === "pj").length, nSav = needs.length - nOrc;
  const allDone = n => n.slots.filter(x => !x.extra).every(x => x.installee);
  // v366 (maquette v366-bancs-turbines.html validée) : un besoin validé (turbines installées, besoin complet, sans retard ni problème) quitte le fil
  // et passe dans « Besoins validés » (repliable, par mois d'installation) ; la case « À compléter » (V361) est retirée
  const isValid = n => allDone(n) && n.complete && !n.late && !n.issues.some(i => i.bad && !/à attribuer$/.test(i.t));
  const instOf = n => n.slots.filter(x => !x.extra).map(x => String(x.installee || "")).sort().pop() || "";
  const shown = needs.filter(n => (kind === "all" || n.kind === kind) && !isValid(n));
  const validL = needs.filter(n => (kind === "all" || n.kind === kind) && isValid(n)).sort((a, b) => instOf(b).localeCompare(instOf(a)));
  // « Rouvrir » un besoin validé : annule l'installation de ses turbines, il revient dans la liste (confirmé, comme « Clore »)
  const reopen = async n => { if (!(await askConfirm({ title: "Rouvrir le besoin " + n.label + " ?", message: "L'installation de ses turbines est annulée : le besoin revient dans la liste, avec ses pièces.", confirmLabel: "Rouvrir" }))) return;
    const writes = n.slots.filter(x => x.installee && x.t).flatMap(x => (installOps(doc, x.t, false).writes || [])); if (writes.length) run({ writes, msg: n.label + " rouvert" }); };
  const freeG = free.filter(x => x.gamme === gam).sort((a, b) => (b.ready - a.ready) || (b.sansRoue - a.sansRoue) || String(a.end || "9").localeCompare(String(b.end || "9")));
  const active = dnd.drag || picked;
  const isPicked = p => picked && picked.kind === p.kind && (p.kind === "turbine" ? picked.id === p.id : picked.stockId === p.stockId && String(picked.bouches) === String(p.bouches));
  // v302 (demandé : « bien séparer les types de stock dans le panneau de gauche ») : une section encadrée par type, titre et pastille de couleur
  // v320 (demandé : « menus déroulants pour gagner de la place ») : chaque section se replie ; état gardé sur ce poste (enogia_nd_fold)
  const Sect = ({ t, n, k, note, children }) => { const open = !fold[t];
    return <section aria-label={t} style={{ margin: "10px 10px 0", background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
    <button type="button" aria-expanded={open} onClick={() => flipFold(t)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", minHeight: 34, padding: "7px 10px", border: "none", borderBottom: open ? "1px solid " + T.line : "none", background: T.surface, color: T.ink900, cursor: "pointer", fontFamily: T.font, textAlign: "left" }}>
      <span aria-hidden="true" style={{ display: "inline-flex", color: T.ink500, transform: open ? "none" : "rotate(-90deg)", transition: "transform var(--e-dur-micro)" }}><NavIcon name="chevronDown" size={14} /></span>
      <i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: k, flexShrink: 0 }} /><b style={{ fontSize: 13, flex: 1 }}>{t}</b><span style={{ fontSize: 12, fontWeight: 500, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>{n}</span></button>
    {open && <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>{children}{note && <span style={{ fontSize: 12, color: T.ink500, lineHeight: 1.35 }}>{note}</span>}</div>}</section>; };
  const none = <span style={{ fontSize: 12, color: T.ink500 }}>Aucune.</span>;
  const xBtn = (lab, fn) => canEdit && <button type="button" data-no-drag aria-label={lab} title="Remettre dans le stock" onClick={e => { e.stopPropagation(); fn(); }} style={{ position: "absolute", top: 6, right: 2, border: "none", background: "transparent", color: "inherit", opacity: 0.7, cursor: "pointer", width: 22, height: 22, borderRadius: 4, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>;
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
  const placeNeed = (n, m) => { setRankPick(null); if (!m || m.key === n.key) return; const a = rankOf.get(n.key), b = rankOf.get(m.key); saveKeys(placeNeedKey(needs, n.key, m.key), n.label + (b < a ? " passe avant " : " passe après ") + m.label + "."); };
  const moveNeed = (n, dir) => { const m = neighbor(n, dir); if (m) saveKeys(swapNeedKeys(needs, n.key, m.key), n.label + (dir < 0 ? " remonte" : " descend") + " d'un cran."); };
  const setRank = (n, r) => { setRankPick(null); const m = needs[r - 1]; if (!m || m.key === n.key) return; saveKeys(swapNeedKeys(needs, n.key, m.key), n.label + " passe en priorité n° " + r + " (échangé avec " + m.label + ")."); };
  const monthLab = iso => { if (!iso) return "Sans date"; const d = new Date(String(iso).slice(0, 7) + "-01T12:00:00"); const t = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
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
  const pill = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "1px 7px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" };
  const linkB = { border: "none", background: "transparent", padding: 0, fontSize: 12, fontWeight: 500, cursor: canEdit ? "pointer" : "default", textDecoration: "underline", textUnderlineOffset: 2, fontFamily: T.font, whiteSpace: "nowrap" };
  const gapEl = x => x.ecart == null ? null : <span style={{ fontWeight: 600, color: x.ecart < 0 ? T.red600 : x.ecart < 5 ? T.amber600 : T.emerald600 }}>{x.ecart < 0 ? -x.ecart + " j de retard" : x.ecart === 0 ? "juste à temps" : x.ecart + " j de marge"}</span>;
  const legend = [["à attribuer", { border: "1.5px dashed " + T.ink300 }], ["roue", { background: TN.roue.bg, border: "1.5px solid " + TN.roue.bd }], ["injecteur", { background: TN.inj.bg, border: "1.5px solid " + TN.inj.bd }],
    ["turbine allouée", { background: TN.turbine.bg, border: "1.5px solid " + TN.turbine.bd }], ["installée (roue et injecteur verrouillés)", { background: TN.inst.bg, border: "1.5px solid " + TN.inst.bd }], ["refusé", { background: TN.bad.bg, border: "1.5px solid " + TN.bad.bd }]];
  const card = n => {
            const T3 = n.want * 3, G3 = n.slots.filter(x => !x.extra).reduce((q, x) => q + !!x.t + !!x.roueOk + !!x.inj, 0), badI = n.issues.filter(i => i.bad && !/à attribuer$/.test(i.t) && !/après le besoin/.test(i.t));
            const meta = n.kind === "pj" ? getPjMeta(n.pj, n.r) : null, done = allDone(n);
            // v302 (demandé : « plus léger sur ORC (bleu léger) et violet sur SAV ») : bleu information très pâle / violet pâle, mêlés au fond de carte
            const rk = rankOf.get(n.key), bgC = n.kind === "sav" ? "color-mix(in srgb, " + T.violet100 + " 80%, " + T.card + ")" : "color-mix(in srgb, " + T.info100 + " 45%, " + T.card + ")";
    return (
              <article {...(canEdit ? dnd.dropProps("need:" + n.key, p => !!p && p.kind === "need" && p.key !== n.key, p => placeNeed(needs.find(x => x.key === p.key), n)) : {})} className={"enogia-nd-need" + (dnd.drag && dnd.drag.kind === "need" && dnd.drag.key === n.key ? " is-lifted" : "")} aria-label={"Besoin n° " + rk + ", " + (n.kind === "sav" ? "SAV " : "ORC ") + n.label} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 8px", borderRadius: 12, minWidth: 0, boxSizing: "border-box", background: bgC,
              outline: dnd.over === "need:" + n.key ? "2px solid " + T.accentInk : "none", outlineOffset: 2,
              boxShadow: "inset 0 0 0 " + (n.late || badI.length ? "1.5px " + T.red600 : "1px " + (done ? T.emerald600 : n.kind === "sav" ? "color-mix(in srgb, " + T.violet500 + " 45%, transparent)" : "color-mix(in srgb, " + T.info600 + " 22%, transparent)")) }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px 6px", flexWrap: "wrap", minWidth: 0, minHeight: 24 }}>
                {canEdit && <span {...dnd.dragProps({ kind: "need", key: n.key }, { ghost: el => el.closest(".enogia-nd-need") })} className="enogia-nd-grip" role="button" tabIndex={0} aria-label={"Déplacer " + n.label + " (glisser, ou Alt + flèches haut / bas)"} title="Glisser pour changer l'ordre"
                  onKeyDown={e => { if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveNeed(n, e.key === "ArrowUp" ? -1 : 1); } }}>{IC.grip}</span>}
                {canEdit ? <button type="button" className="enogia-nd-rank" aria-haspopup="dialog" aria-expanded={!!(rankPick && rankPick.n.key === n.key)} aria-label={"Priorité n° " + rk + " de " + n.label + " : choisir sa place"} title="Choisir sa place dans la liste"
                    onClick={e => setRankPick(rankPick && rankPick.n.key === n.key ? null : { n, r: e.currentTarget })}>{rk}</button>
                  : <span style={{ fontSize: 12, fontWeight: 600, color: T.ink500, fontVariantNumeric: "tabular-nums", minWidth: 14, textAlign: "right" }} aria-label={"Priorité n° " + rk}>{rk}</span>}
                <b style={{ fontFamily: T.fontMono, fontSize: 13, whiteSpace: "nowrap" }}>{n.label}</b>
                {meta && <CountryFlag pays={meta.pays} size={13} />}
                <span style={{ ...pill, background: T.card, color: n.kind === "sav" ? T.violet600 : T.ink700 }}>{n.kind === "sav" ? "SAV" : "ORC"}</span>
                <span title={n.sub} style={{ flex: "1 1 80px", minWidth: 0, fontSize: 12, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}{meta && meta.pays && meta.pays !== "—" ? " · " + meta.pays : ""}</span>
                {n.kind === "sav" && <span title={n.statut === "hypo" ? "Demande hypothétique : pas servie par « Remplir automatiquement », pas d'alerte de retard" : "Demande confirmée"} style={{ ...pill, background: n.statut === "hypo" ? "transparent" : T.emerald100, color: n.statut === "hypo" ? T.amber600 : T.emerald600, border: n.statut === "hypo" ? "1px dashed " + T.amber600 : "1px solid transparent" }}>{SAV_STATUTS[n.statut]}</span>}
                {n.kind === "sav" && (n.pj || n.ticket || n.inter) && <span style={{ fontSize: 12, color: T.ink700, fontFamily: T.fontMono, whiteSpace: "nowrap" }}>{[n.pj, n.ticket, n.inter].filter(Boolean).join(" · ")}</span>}
                {n.kind === "sav" && canEdit && <button type="button" onClick={() => setSav({ id: n.id, ...n.raw, injB: n.raw.injB == null ? "" : String(n.raw.injB) })} style={{ ...linkB, color: T.ink500, fontWeight: 500 }}>modifier</button>}
                <span style={{ fontSize: 12, color: T.ink700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>pour le <b>{fdS(n.date)}</b></span>
                {canEdit && <button type="button" onClick={() => closeNeed(n)} title="Turbines installées : retirer ce besoin de la liste" aria-label={"Clore le besoin " + n.label} style={{ ...themeBtn(allDone(n) ? "sec" : "ghost", "sm"), minHeight: 26, padding: "0 8px", fontSize: 12 }}>Clore</button>}
                {canEdit && <button type="button" aria-label={"Configuration des turbines de " + n.label + " (" + n.cfg.l + ")"} title={"Configuration : " + n.cfg.l} onClick={e => setPop({ n, kind: "cfg", el: e.currentTarget })} className="enogia-nd-rank" style={{ fontSize: 14 }}>⋯</button>}
              </div>
              {badI.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>{badI.map((i, q) => <span key={q} style={{ fontSize: 12, fontWeight: 500, color: T.red600 }}>{i.t}</span>)}</div>}
              <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: (n.kind === "sav" ? "68px" : "14px") + " repeat(3, minmax(0, 1fr)) 28px", gap: 4, fontSize: 12, color: T.ink500, padding: "2px 0 0" }}><span>{n.kind === "sav" ? "ORC" : ""}</span><span>Turbine {n.cfg.g} kW</span><span>Roue</span><span>Injecteur</span><span /></div>
              {n.slots.map(x => {
                const rr = x.roue ? x.roue.ref : x.roueMontee, roueBad = !!(n.roue && rr && U2(rr) !== U2(n.roue)), injBad = !!(n.inj && x.inj && U2(x.inj.ref) !== U2(n.inj));
                const full = !!(x.t && x.roueOk && x.inj), tT = x.installee ? TN.inst : TN.turbine;
                const tDet = x.installee ? "installée le " + fdS(x.installee) : x.t ? (x.t.livree ? "sortie du stock" : x.t.sansRoue || (x.t.dispo && !x.t.roue) ? "sans roue" : x.t.dispo ? "prête" : x.t.end ? "fin " + fdS(x.t.end) : "sans date") : "";
                const injDet = x.inj ? (x.inj.bouches == null ? (n.injB ? "vierge · " + n.injB + " à boucher" : "vierge") : x.inj.bouches + " bouchage" + (x.inj.bouches > 1 ? "s" : "") + (n.injB != null && +x.inj.bouches !== n.injB ? " (prévu " + n.injB + ")" : "")) : "";
                return <div key={x.i} style={{ display: "grid", gridTemplateColumns: (n.kind === "sav" ? "68px" : "14px") + " repeat(3, minmax(0, 1fr)) 28px", gap: 4, alignItems: "center" }}>
                    {n.kind === "sav" ? <span title={x.machine ? "Turbine pour " + x.machine : "ORC à préciser après l'intervention (« modifier »)"} style={{ fontSize: 12, fontWeight: 600, fontFamily: T.fontMono, color: x.machine ? T.ink700 : T.amber600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.machine || "à préciser"}</span>
                      : <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 500, color: T.ink300, textAlign: "center" }}>{n.want > 1 || x.extra ? x.i + 1 : ""}</span>}
                    <Sock ctx={ctx} n={n} s={x} kind="turbine" label={"Turbine " + n.cfg.g + " kW"} want={x.estNum} hint={x.estNum ? "prochaine libre" : ""} empty={x.estNum ? "" : "à glisser"} tone={x.t ? tT : null}>
                      {x.t && <Piece tone={tT} icon={x.installee ? IC.lock : IC.ok} label={x.installee ? "Turbine installée" : "Turbine allouée"} val={x.t.num || "sans n°"} mono detail={tDet} x={!x.installee && xBtn("Retirer " + (x.t.num || "la turbine"), () => outTurbine(x.t))} />}</Sock>
                    <Sock ctx={ctx} n={n} s={x} kind="roue" label={x.t && !x.roueOk ? "Roue à poser" : "Roue"} want={n.roue} hint={n.roue ? "prévue" : ""} tone={x.roueOk ? (roueBad ? TN.bad : TN.roue) : null}>
                      {x.roueOk && <Piece tone={roueBad ? TN.bad : TN.roue} icon={roueBad ? null : IC.ok} label="Roue" val={rr} detail={roueBad ? "prévue " + n.roue : x.roue ? "prise dans le stock" : "montée sur la turbine"} x={x.roue && !x.installee && xBtn("Remettre la roue " + rr + " en stock", () => outAlloc(x.roue))} />}</Sock>
                    <Sock ctx={ctx} n={n} s={x} kind="inj" label="Injecteur" want={injTxt(n)} hint={n.inj ? (n.injB ? n.injB + " bouchage" + (n.injB > 1 ? "s" : "") + " prévu" + (n.injB > 1 ? "s" : "") : "vierge prévu") : ""} tone={x.inj ? (injBad ? TN.bad : TN.inj) : null}>
                      {x.inj && <Piece tone={injBad ? TN.bad : TN.inj} icon={injBad ? null : IC.ok} label="Injecteur" val={x.inj.ref} detail={injBad ? "prévu " + n.inj : injDet} x={!x.installee && xBtn("Remettre l'injecteur " + x.inj.ref + " en stock", () => outAlloc(x.inj))} />}</Sock>
                    {canEdit && x.t ? <button type="button" disabled={busy} onClick={() => install(n, x, full)} aria-pressed={!!x.installee} aria-label={(x.installee ? "Annuler l'installation de " : "Marquer installée : ") + (x.t.num || "la turbine")} title={x.installee ? "Installée le " + fdS(x.installee) + " · annuler l'installation" : "Marquer installée"}
                      style={{ width: 28, height: 28, borderRadius: 999, border: "1.5px solid " + (x.installee || full ? T.emerald600 : T.line), background: x.installee ? T.emerald600 : T.card, color: x.installee ? T.onFill : full ? T.emerald600 : T.ink500, display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}>{IC.ok}</button> : <span />}
                  </div>; })}
              {(() => { // pied : marge (pire écart des turbines pas encore installées) et pièces posées
                const open = n.slots.filter(x => !x.extra && !x.installee && x.ecart != null), worst = open.length ? open.reduce((p, q) => (q.ecart < p.ecart ? q : p)) : null, inst = n.slots.filter(x => !x.extra && x.installee).length;
                const dispoT = worst && worst.dispo ? (worst.t ? "Turbine disponible le " : "Prochaine turbine libre le ") + fdS(worst.dispo) + (worst.estimee ? " (estimée)" : "") + ", besoin le " + fdS(n.date) : "";
                return <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 24, paddingTop: 2, fontSize: 12, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>
                  {worst ? <span title={dispoT} style={{ ...pill, padding: "2px 8px", background: worst.ecart < 0 ? T.red100 : worst.ecart < 5 ? T.amber100 : T.emerald100 }}>{gapEl(worst)}</span>
                    : inst ? <span style={{ ...pill, padding: "2px 8px", background: T.emerald100, color: T.emerald600, fontWeight: 600 }}>{inst === n.want ? "installée" + (n.want > 1 ? "s" : "") : inst + " / " + n.want + " installée" + (inst > 1 ? "s" : "")}</span>
                    : <span>pas de date de turbine</span>}
                  <span style={{ marginLeft: "auto" }}>{G3} / {T3} pièce{T3 > 1 ? "s" : ""}</span>
                </div>; })()}
            </article>);
  };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 10, "--nd-bg": T.card, "--nd-line": T.line, "--nd-mute": T.ink500, "--nd-ink": T.ink900, "--nd-alt": T.surfaceAlt, "--nd-font": T.font }}>
    {rankPick && <RankPicker n={rankPick.n} at={rankPick.r} list={shownD.filter(x => monthOf(x.date) === monthOf(rankPick.n.date))} rankOf={rankOf} total={needs.length} onPlace={m => placeNeed(rankPick.n, m)} onRank={v => setRank(rankPick.n, v)} onClose={() => setRankPick(null)} />}
    <style>{NEEDS_CSS}</style>
    <div className="enogia-nd-app" style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden", display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", height: "min(80vh, 940px)" }}>
      <aside className="enogia-nd-stock" data-open={drawer ? "1" : "0"} aria-label="Stock de la production turbines" style={{ background: T.surface, borderRight: "1px solid " + T.line, overflowY: "auto" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: T.surface, padding: "10px 12px 6px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 1px 0 " + T.line }}>
          <b style={{ fontSize: 13, flex: 1 }}>Stock de la production</b>
          <button type="button" className="enogia-nd-drawer" aria-expanded={drawer} onClick={() => setDrawer(v => !v)} style={{ display: "none", alignItems: "center", gap: 4, minHeight: 32, padding: "0 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: T.font }}>{drawer ? "Replier" : "Ouvrir"}</button>
          <div role="group" aria-label="Gamme" style={{ display: "inline-flex", background: T.surfaceAlt, borderRadius: 8, padding: 2, gap: 2 }}>
            {["100", "20"].map(g => <button key={g} type="button" aria-pressed={gam === g} onClick={() => { setGam(g); setPicked(null); }} style={{ border: "none", borderRadius: 8, minHeight: 26, padding: "0 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: T.font, background: gam === g ? T.card : "transparent", color: gam === g ? T.ink900 : T.ink500, boxShadow: gam === g ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{g} kW</button>)}
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
              style={{ border: "none", borderRadius: 8, minHeight: 26, padding: "0 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: T.font, background: kind === k ? T.card : "transparent", color: kind === k ? T.ink900 : T.ink500, boxShadow: kind === k ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{l} <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{c}</span></button>)}
          </div>
          <span aria-label="Légende" style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: T.ink500 }}>{legend.map(([l, st]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><i aria-hidden="true" style={{ width: 16, height: 12, borderRadius: 4, boxSizing: "border-box", display: "inline-block", ...st }} />{l}</span>)}</span>
          <span style={{ flex: 1 }} />
          {canEdit && <button type="button" disabled={busy} onClick={auto} title="Propose une affectation du stock (par date de besoin, pièces prévues), annulable" style={{ ...themeBtn("sec", "sm") }}>Remplir automatiquement</button>}
          {closedL.length > 0 && <button type="button" onClick={() => setClosedDlg(true)} style={{ ...themeBtn("ghost", "sm") }}>Besoins clos ({closedL.length})</button>}
          {canEdit && <button type="button" onClick={() => setSav({})} style={{ ...themeBtn("pri", "sm") }}>＋ Demande de turbines SAV</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 310px), 1fr))", gap: 8, padding: "8px 12px 16px", alignItems: "start" }}>
          {shownD.map(n => { const mo = monthOf(n.date), head = mo !== lastMo; lastMo = mo;
            return <React.Fragment key={n.key}>
              {head && <h2 className="enogia-nd-month enogia-nd-glass" style={{ gridColumn: "1 / -1", top: barH, margin: "2px -12px 0", padding: "7px 14px", fontSize: 13, fontWeight: 500, color: T.ink700, fontFamily: T.font }}>{monthLab(n.date)}</h2>}
              {card(n)}</React.Fragment>; })}
          {!shown.length && <div style={{ gridColumn: "1 / -1", padding: 30, textAlign: "center", color: T.ink500, fontSize: FZ.sm }}>{needs.length ? "Tout est installé : les besoins terminés sont dans « Besoins validés »." : "Aucun PJ en cours avec une turbine, ni besoin SAV."}</div>}
        </div>
        {validL.length > 0 && <details className="enogia-nd-valid" style={{ margin: "0 12px 16px", background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
          <summary style={{ cursor: "pointer", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: T.ink900, minHeight: 44, boxSizing: "border-box" }}>
            <NavIcon name="chevronDown" size={14} />Besoins validés <span style={{ fontWeight: 500, fontSize: 13, color: T.ink500 }}>· {validL.length}, turbines installées</span></summary>
          {(() => { let lm = ""; return validL.map(n => { const d = instOf(n), m = d.slice(0, 7), hd = m !== lm; lm = m;
            const parts = n.slots.filter(x => !x.extra).map(x => [x.t && (x.t.num || "turbine"), x.roue ? x.roue.ref : x.roueMontee, x.inj && x.inj.ref].filter(Boolean).join(" · ")).join(" ; ");
            return <React.Fragment key={n.key}>
              {hd && <div style={{ padding: "8px 12px 4px", fontSize: 12, fontWeight: 500, color: T.ink500 }}>{monthLab(d)}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto auto", gap: 12, alignItems: "center", padding: "8px 12px", borderTop: "1px solid " + T.line, minHeight: 44 }}>
                <b style={{ fontFamily: T.fontMono, fontSize: 13, whiteSpace: "nowrap" }}>{n.label} <span style={{ ...pill, background: T.surfaceAlt, color: n.kind === "sav" ? T.violet600 : T.ink700, fontFamily: T.font }}>{n.kind === "sav" ? "SAV" : "ORC"}</span></b>
                <span style={{ minWidth: 0, fontSize: 13, color: T.ink700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={parts}>{parts}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.emerald600, whiteSpace: "nowrap" }}>✓ installée{d ? " le " + fdS(d) : ""}</span>
                {canEdit ? <button type="button" disabled={busy} onClick={() => reopen(n)} style={{ ...themeBtn("ghost", "sm") }}>Rouvrir</button> : <span />}
              </div>
            </React.Fragment>; }); })()}
        </details>}
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
    {sav && <SavDialog doc={doc} rows={rows} sav={savDoc} init={sav.id ? sav : null} onSave={saveSav} onDelete={sav.id ? delSav : null} onClose={() => setSav(null)} />}
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
export function TurbinesHub({ doc, api, rows, canEdit, owner, savePjMeta, tab: tabP, onTab, allowTabs, authorName, savDoc }) {
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
      {canEdit && tab === "prod" && <button type="button" onClick={() => setImp(true)} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "4px 12px", minHeight: 30, fontSize: FZ.xs, fontWeight: 500, cursor: "pointer", fontFamily: T.font }}>Importer des données (JSON)</button>}
    </div>
    {tab === "prod" ? <ProdTurbines doc={doc} api={api} canEdit={canEdit} owner={owner} pjs={pjs} /> : <NeedsView doc={doc} api={api} rows={rows} canEdit={canEdit} savePjMeta={savePjMeta} authorName={authorName} savDoc={savDoc} />}
    {imp && <ImportDialog doc={doc} api={api} onClose={() => setImp(false)} />}
  </div>);
}
