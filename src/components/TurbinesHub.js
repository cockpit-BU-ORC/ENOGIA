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
import { TURB_CFGS, cfgById, refsOf, buildNeeds, assignOps, unassignOps, allocOps, unallocOps, stockTiles, injInfo, maxBouches, prodState, workDate, pjOfAffaire } from "../turbineNeeds";
import { getPjMeta } from "../pjMeta";

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

// v271 (demandé : « design horrible, pas clair ; indiquer par PJ le couple turbine / roue / injecteur plus simplement, sans listes ;
// différencier les turbines prêtes avec et sans roue ; le stock de roues et d'injecteurs aussi en glisser-déposer ; tout glisser-déposer
// met à jour le stock de Jérémie ; pour chaque PJ, la roue et l'injecteur à installer signalés en couleur ; cadrans plus petits ») :
// à gauche le stock de la production (turbines, roues, injecteurs) en tuiles ; à droite les besoins par semaine, chaque turbine attendue
// étant un emplacement à trois cases (turbine, roue, injecteur) où l'on dépose les tuiles. × = retour au stock. Plus de numéro de PJ chez Jérémie.
const fdS = s => (s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) : "—");
const wkOf = iso => { if (!iso) return "Sans date"; const d = new Date(iso + "T12:00:00"), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return "Semaine " + Math.ceil(((t - y0) / 86400000 + 1) / 7) + " · " + t.getUTCFullYear(); };
function NeedsView({ doc, api, rows, canEdit, savePjMeta }) {
  const [tick, setTick] = useState(0); // la fiche PJ (pjMetaOverrides) change sans changer rows : recalcul après une modification ici
  const { needs, free } = useMemo(() => buildNeeds(doc, rows, r => getPjMeta(r.pj, r)), [doc, rows, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const dnd = usePointerDnD();
  const docRef = useRef(doc); docRef.current = doc;
  const [gam, setGam] = useState("100"), [msg, setMsg] = useState(null), [sav, setSav] = useState(null), [busy, setBusy] = useState(false), [onlyOpen, setOnlyOpen] = useState(true), [pop, setPop] = useState(null);
  useEffect(() => { if (!msg) return undefined; const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); }, [msg]);
  const stock = useMemo(() => stockTiles(doc, gam), [doc, gam]);
  const run = async (ops, undo) => { if (ops.error) { setMsg({ t: ops.error, bad: true }); return false; } setBusy(true); let ok = true;
    for (const w of ops.writes || []) { if (!(await api.put(w.c, w.id, w.data))) { ok = false; break; } }
    if (ok) for (const d of ops.dels || []) { if (!(await api.del(d.c, d.id))) { ok = false; break; } }
    setBusy(false); setMsg(ok ? { t: ops.msg + (ops.warn ? " · " + ops.warn : ""), warn: !!ops.warn, undo } : { t: "L'enregistrement a échoué.", bad: true }); return ok; };
  const dropTurbine = (need, d) => { if (busy || !canEdit) return; const x = free.find(y => y.id === d.id); if (!x) return;
    run(assignOps(doc, x, need), () => { const d0 = docRef.current || {}, t = (d0.turbines || {})[x.id]; if (t) run(unassignOps(d0, { ...x, raw: { ...t, id: x.id } })); }); };
  const dropStock = (need, slot, d) => { if (busy || !canEdit) return; const tile = (d.kind === "roue" ? stock.roues : stock.injs).find(y => y.stockId === d.stockId && (d.kind === "roue" || String(y.bouches) === String(d.bouches))); run(allocOps(doc, need, slot, tile)); };
  const outTurbine = x => { if (!canEdit) return; if (x.livree && !x.raw.sortieOrc) { setMsg({ t: x.num + " a été livrée par la production : retirez-la dans la production.", warn: true }); return; } run(unassignOps(doc, x)); };
  const outAlloc = a => canEdit && run(unallocOps(doc, a));
  const setNeed = (n, patch) => { if (n.kind === "pj") { if (savePjMeta) Promise.resolve(savePjMeta(n.pj, patch)).then(() => setTick(x => x + 1)); }
    else api.put("besoins", n.id, { ...n.raw, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k.replace(/^turb(.)/, (m, c) => c.toLowerCase()), v])) }); };
  const saveSav = async v => { const id = (sav && sav.id) || "s" + Date.now().toString(36); const data = { label: v.label, cfg: v.cfg, roue: v.roue, inj: v.inj, injB: v.injB === "" ? null : +v.injB, date: v.date, note: v.note, at: new Date().toISOString() };
    if (await api.put("besoins", id, data)) { setSav(null); setMsg({ t: "Besoin SAV « " + v.label + " » enregistré." }); } };
  const delSav = async () => { if (!sav || !window.confirm("Supprimer le besoin SAV « " + sav.label + " » ? Turbines, roues et injecteurs attribués retournent dans le stock.")) return;
    const n = needs.find(x => x.key === "sav:" + sav.id); if (n) { for (const s of n.slots) { if (s.roue) await run(unallocOps(doc, s.roue)); if (s.inj) await run(unallocOps(doc, s.inj)); if (s.t) await run(unassignOps(doc, s.t)); } }
    await api.del("besoins", sav.id); setSav(null); };
  const shown = needs.filter(n => !onlyOpen || !n.complete || n.issues.some(i => i.bad));
  const missT = needs.reduce((s, n) => s + Math.max(0, n.want - n.got.length), 0), missR = needs.reduce((s, n) => s + n.roueMiss, 0), missI = needs.reduce((s, n) => s + n.injMiss, 0), bad = needs.filter(n => n.issues.some(i => i.bad && !/à attribuer$/.test(i.t))).length; // un emplacement vide n’est pas un problème : il est compté à part
  const freeG = free.filter(x => x.gamme === gam), groups = [["Prêtes · roue montée", freeG.filter(x => x.ready)], ["Testées sans roue", freeG.filter(x => x.sansRoue)], ["En fabrication", freeG.filter(x => !x.dispo)]];
  // styles
  const tileS = (on, tone) => ({ background: T.card, border: "1px solid " + (tone || T.line), borderRadius: 8, padding: "5px 8px", minHeight: 40, boxSizing: "border-box", cursor: canEdit ? "grab" : "default", touchAction: "none", userSelect: "none", opacity: on ? 0.3 : 1, transition: "opacity 160ms", fontFamily: T.font });
  const dotS = c => ({ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0, display: "inline-block" });
  const H4 = ({ children, n }) => <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: T.ink500, margin: "10px 0 5px" }}><span>{children}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{n}</span></div>;
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 };
  const drag = dnd.drag;
  const zone = (key, kind, g, filled, onDrop, label, children) => {
    const accept = p => p && p.kind === kind && (!g || p.g === g), can = drag && accept(drag), over = dnd.over === key && can;
    return <div {...(canEdit ? dnd.dropProps(key, p => !filled && accept(p), onDrop) : {})} aria-label={label}
      style={{ flex: "1 1 0", minWidth: 0, minHeight: 54, borderRadius: 9, padding: "6px 8px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
        border: (filled ? "1px solid " + T.line : "1.5px dashed " + (over ? T.emerald500 : can ? T.teal500 : T.line)), background: over ? T.emerald100 : filled ? T.card : can ? T.surface : "transparent",
        transform: over ? "scale(1.02)" : "none", transition: "transform 160ms cubic-bezier(.2,.8,.2,1), background 140ms, border-color 140ms", opacity: drag && !can && !filled ? 0.5 : 1 }}>{children}</div>;
  };
  const want = (txt, ok) => <span style={{ fontSize: 11.5, fontWeight: 700, color: ok === true ? T.emerald600 : ok === false ? T.red600 : T.teal600 }}>{txt}</span>;
  const xBtn = (lab, fn) => canEdit && <button type="button" aria-label={lab} title="Remettre dans le stock" onClick={fn} style={{ marginLeft: "auto", border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 24, minHeight: 24, borderRadius: 6, fontSize: 15, lineHeight: 1 }}>×</button>;
  const chipBtn = (n, kind, txt, empty) => <button type="button" data-no-drag onClick={e => canEdit && setPop({ n, kind, el: e.currentTarget })} aria-label={"Changer " + (kind === "cfg" ? "la turbine" : kind === "roue" ? "la roue" : "l'injecteur") + " de " + n.label}
    style={{ border: "1px solid " + (empty ? T.amber500 : T.line), borderBottom: "2px solid " + (empty ? T.amber500 : T.teal500), background: empty ? "transparent" : T.surface, color: empty ? T.amber600 : T.ink900, borderRadius: 7, minHeight: 26, padding: "0 9px", fontSize: FZ.xs, fontWeight: 700, cursor: canEdit ? "pointer" : "default", fontFamily: T.font, whiteSpace: "nowrap" }}>{txt}</button>;
  const injTxt = n => n.inj ? n.inj + (n.injB != null ? " · " + n.injB + " bouch." : "") : "injecteur à choisir";
  let lastWk = "";
  return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <PageHead title="Besoins ORC et SAV" sub="Glissez une turbine, une roue ou un injecteur du stock sur l'emplacement d'un PJ : le stock de la production se met à jour. × = retour au stock." right={canEdit && <button type="button" onClick={() => setSav({})} style={{ border: "1px solid " + T.ink900, background: T.ink900, color: T.card, borderRadius: 8, padding: "0 14px", minHeight: 34, fontSize: FZ.sm, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>＋ Besoin SAV</button>} />
    <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 14, overflow: "hidden" }}>
      <div role="group" aria-label="Résumé" style={{ display: "flex", gap: 20, alignItems: "baseline", flexWrap: "wrap", padding: "10px 14px", borderBottom: "1px solid " + T.line }}>
        {[[missT, "turbines à attribuer"], [missR, "roues"], [missI, "injecteurs"], [bad, "PJ avec un problème", true]].map(([v, l, b]) => <span key={l} style={{ display: "inline-flex", gap: 5, alignItems: "baseline" }}><b style={{ fontSize: 20, fontVariantNumeric: "tabular-nums", color: b && v ? T.red600 : T.ink900 }}>{v}</b><span style={{ fontSize: 12, color: T.ink500 }}>{l}</span></span>)}
        <span style={{ flex: 1 }} />
        <label style={{ fontSize: FZ.xs, color: T.ink700, display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} />À compléter seulement</label>
      </div>
      <div className="enogia-needs-cols" style={{ display: "grid", gridTemplateColumns: "minmax(250px,290px) minmax(0,1fr)" }}>
        <aside aria-label="Stock de la production" style={{ borderRight: "1px solid " + T.line, background: T.surface, padding: 12, position: "sticky", top: 0, alignSelf: "start", maxHeight: "78vh", overflowY: "auto" }}>
          <div role="group" aria-label="Gamme" style={{ display: "inline-flex", background: T.surfaceAlt, borderRadius: 9, padding: 2, gap: 2 }}>
            {["100", "20"].map(g => <button key={g} type="button" aria-pressed={gam === g} onClick={() => setGam(g)} style={{ border: "none", borderRadius: 7, minHeight: 28, padding: "0 12px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font, background: gam === g ? T.card : "transparent", color: gam === g ? T.ink900 : T.ink500, boxShadow: gam === g ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{g} kW</button>)}
          </div>
          {groups.map(([lab, L2]) => <div key={lab}><H4 n={L2.length}>{lab}</H4>
            {L2.length ? <div style={grid2}>{L2.map(x => <div key={x.id} {...(canEdit ? dnd.dragProps({ kind: "turbine", id: x.id, g: x.gamme }) : {})} title={x.affaire ? "Affaire : « " + x.affaire + " »" : undefined} style={tileS(drag && drag.id === x.id, x.ready ? T.emerald500 : x.sansRoue ? T.amber500 : T.line)}>
              <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 12 }}>{x.num || "sans n°"}</div>
              <div style={{ fontSize: 11, color: T.ink500, display: "flex", gap: 5, alignItems: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span style={dotS(x.ready ? T.emerald500 : x.sansRoue ? T.amber500 : T.ink300)} />{x.ready ? (x.roue ? "roue " + x.roue : "prête") : x.sansRoue ? "sans roue" : x.step + " · " + (x.end ? fdS(x.end) : "—")}</div></div>)}</div>
              : <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucune.</div>}</div>)}
          <H4 n={stock.roues.reduce((s, r) => s + r.qte, 0)}>Roues équilibrées</H4>
          {stock.roues.length ? <div style={grid2}>{stock.roues.map(t => <div key={t.stockId} {...(canEdit && t.qte > 0 ? dnd.dragProps({ kind: "roue", stockId: t.stockId, g: gam }) : {})} style={{ ...tileS(false), cursor: canEdit && t.qte > 0 ? "grab" : "default", opacity: t.qte > 0 ? 1 : 0.5 }}>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{t.ref}</div><div style={{ fontSize: 11, color: t.qte ? T.ink500 : T.red600, fontVariantNumeric: "tabular-nums" }}>{t.qte} en stock</div></div>)}</div> : <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucune référence.</div>}
          <H4 n={stock.injs.reduce((s, r) => s + r.qte, 0)}>Injecteurs</H4>
          {stock.injs.length ? <div style={grid2}>{stock.injs.map(t => <div key={t.stockId + "-" + t.bouches} {...(canEdit && t.qte > 0 ? dnd.dragProps({ kind: "inj", stockId: t.stockId, bouches: t.bouches, g: gam }) : {})} style={{ ...tileS(false), cursor: canEdit && t.qte > 0 ? "grab" : "default", opacity: t.qte > 0 ? 1 : 0.5 }}>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{t.ref}</div><div style={{ fontSize: 11, color: t.qte ? T.ink500 : T.red600, fontVariantNumeric: "tabular-nums" }}>{t.bouches == null ? "vierge" : t.bouches + " bouch."} · {t.qte}</div></div>)}</div> : <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucune référence.</div>}
          <p style={{ fontSize: 11.5, color: T.ink500, margin: "12px 0 0", lineHeight: 1.45 }}>Tuiles = stock réel de la production turbines. Une turbine prête ou sans roue, une roue ou un injecteur déposé sort de ce stock.</p>
        </aside>
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          {shown.map(n => { const wk = wkOf(n.date), head = wk !== lastWk; lastWk = wk; const g = n.cfg.g;
            return <React.Fragment key={n.key}>
              {head && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: T.ink500, marginTop: 4 }}>{wk}<span style={{ flex: 1, height: 1, background: T.line }} /></div>}
              <article aria-label={"Besoin " + n.label} style={{ border: "1px solid " + T.line, borderLeft: n.kind === "sav" ? "4px solid " + T.violet500 : "1px solid " + T.line, borderRadius: 12, padding: "10px 12px", background: T.card }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <b style={{ fontFamily: T.fontMono, fontSize: FZ.sm }}>{n.label}</b>
                  {n.kind === "sav" && <span style={{ fontSize: 11, fontWeight: 700, color: T.violet600, background: T.violet100, borderRadius: 999, padding: "0 7px" }}>SAV</span>}
                  <span style={{ fontSize: FZ.xs, color: T.ink500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{n.sub}</span>
                  <span style={{ fontSize: FZ.xs, color: T.ink700 }}>pour le <b style={{ fontVariantNumeric: "tabular-nums" }}>{fd(n.date)}</b></span>
                  <span style={{ flex: 1 }} />
                  {chipBtn(n, "cfg", n.cfg.l + (n.kind === "pj" && !n.cfgSet ? " (gamme)" : ""), false)}
                  {chipBtn(n, "roue", n.roue ? "Roue " + n.roue : "roue à choisir", !n.roue)}
                  {chipBtn(n, "inj", n.inj ? "Inj. " + injTxt(n) : "injecteur à choisir", !n.inj)}
                  {n.kind === "sav" && canEdit && <button type="button" onClick={() => setSav({ id: n.id, ...n.raw, injB: n.raw.injB == null ? "" : String(n.raw.injB) })} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 7, minHeight: 26, padding: "0 8px", fontSize: FZ.xs, cursor: "pointer", fontFamily: T.font }}>Modifier</button>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {n.slots.map(s => { const k = n.key + "#" + s.i, rr = s.roue ? s.roue.ref : s.roueMontee;
                    return <div key={s.i} style={{ display: "flex", gap: 6, alignItems: "stretch", flexWrap: "wrap" }}>
                      <span aria-hidden="true" style={{ alignSelf: "center", width: 18, fontSize: 11, fontWeight: 700, color: T.ink300, textAlign: "center" }}>{n.want > 1 ? s.i + 1 : ""}</span>
                      {zone(k + ":t", "turbine", g, !!s.t, d => dropTurbine(n, d), "Turbine " + g + " kW pour " + n.label, s.t
                        ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ minWidth: 0 }}><b style={{ fontFamily: T.fontMono, fontSize: 12.5 }}>{s.t.num}</b><div style={{ fontSize: 11, color: s.t.dispo || s.t.livree ? T.emerald600 : T.ink500, fontWeight: 600 }}>{s.t.livree ? "sortie du stock le " + fdS(s.t.livree) : s.t.step + (s.t.end ? " · fin " + fdS(s.t.end) : "")}</div></div>{xBtn("Retirer " + s.t.num, () => outTurbine(s.t))}</div>
                        : <><span style={{ fontSize: 12, color: T.ink700, fontWeight: 600 }}>Turbine {g} kW</span><span style={{ fontSize: 11, color: T.ink500 }}>glisser une turbine</span></>)}
                      {zone(k + ":r", "roue", g, s.roueOk, d => dropStock(n, s.i, d), "Roue pour " + n.label, s.roueOk
                        ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div><b style={{ fontSize: 12.5 }}>{rr}</b><div style={{ fontSize: 11, fontWeight: 600, color: n.roue && rr.toUpperCase() !== n.roue.toUpperCase() ? T.red600 : T.emerald600 }}>{s.roue ? "sortie du stock" : "montée sur la turbine"}{n.roue && rr.toUpperCase() !== n.roue.toUpperCase() ? " · prévue " + n.roue : ""}</div></div>{s.roue && xBtn("Remettre la roue " + rr + " en stock", () => outAlloc(s.roue))}</div>
                        : <><span style={{ fontSize: 12, color: T.ink700, fontWeight: 600 }}>Roue</span>{n.roue ? want("à installer : " + n.roue) : <span style={{ fontSize: 11, color: T.amber600 }}>à choisir</span>}</>)}
                      {zone(k + ":i", "inj", g, !!s.inj, d => dropStock(n, s.i, d), "Injecteur pour " + n.label, s.inj
                        ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div><b style={{ fontSize: 12.5 }}>{s.inj.ref}</b><div style={{ fontSize: 11, fontWeight: 600, color: (n.inj && s.inj.ref.toUpperCase() !== n.inj.toUpperCase()) ? T.red600 : T.emerald600 }}>{s.inj.bouches == null ? "vierge" : s.inj.bouches + " bouchages"}{n.injB && s.inj.bouches == null ? " · " + n.injB + " à boucher" : ""}</div></div>{xBtn("Remettre l'injecteur " + s.inj.ref + " en stock", () => outAlloc(s.inj))}</div>
                        : <><span style={{ fontSize: 12, color: T.ink700, fontWeight: 600 }}>Injecteur</span>{n.inj ? want("à installer : " + injTxt(n)) : <span style={{ fontSize: 11, color: T.amber600 }}>à choisir</span>}</>)}
                    </div>; })}
                </div>
                {n.issues.filter(i => i.bad && !/à attribuer$/.test(i.t)).length > 0 && <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>{n.issues.filter(i => i.bad && !/à attribuer$/.test(i.t)).map((i, q) => <span key={q} style={{ fontSize: FZ.xs, fontWeight: 600, color: T.red600 }}>{i.t}</span>)}</div>}
              </article>
            </React.Fragment>; })}
          {!shown.length && <div style={{ padding: 30, textAlign: "center", color: T.ink500, fontSize: FZ.sm }}>{needs.length ? "Tous les besoins sont complets. Décochez « À compléter seulement » pour tout voir." : "Aucun PJ en cours avec une turbine, ni besoin SAV."}</div>}
        </div>
      </div>
    </div>
    {msg && <div role="status" className="enogia-bell-peek" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 10015, background: msg.bad ? T.red600 : T.ink900, color: T.card, borderRadius: 10, padding: "8px 14px", fontSize: FZ.sm, boxShadow: T.shadowLg, display: "flex", gap: 12, alignItems: "center", maxWidth: "min(640px, 92vw)" }}>
      <span>{msg.t}</span>{msg.undo && <button type="button" onClick={() => { const u = msg.undo; setMsg(null); u(); }} style={{ border: "none", background: "transparent", color: T.card, fontWeight: 800, textDecoration: "underline", cursor: "pointer", fontFamily: T.font }}>Annuler</button>}
      <button type="button" aria-label="Fermer" onClick={() => setMsg(null)} style={{ border: "none", background: "transparent", color: T.card, cursor: "pointer", minWidth: 24, minHeight: 24 }}>×</button></div>}
    {pop && (() => { const n = needs.find(x => x.key === pop.n.key) || pop.n, g = n.cfg.g, close = () => setPop(null);
      if (pop.kind === "cfg") return <ChoicePop anchor={pop.el} title={"Turbine pour " + n.label} value={n.cfg.id} options={TURB_CFGS.map(c => ({ v: c.id, l: c.l }))} onPick={v => { setNeed(n, { turbCfg: v }); close(); }} onClose={close} />;
      if (pop.kind === "roue") return <ChoicePop anchor={pop.el} title={"Roue à installer · " + n.label + " (stock de la production)"} value={n.roue} options={stockTiles(doc, g).roues.map(t => ({ v: t.ref, l: t.ref, q: t.qte }))} onPick={v => { setNeed(n, { turbRoue: v === n.roue ? null : v }); close(); }} onClose={close} />;
      const ii = n.inj ? injInfo(doc, n.inj) : null, mx = ii ? maxBouches(ii.ouv) : 99;
      return <ChoicePop anchor={pop.el} title={"Injecteur à installer · " + n.label} value={n.inj} options={refsOf(doc, "injecteurs", g).map(r => { const x = injInfo(doc, r); return { v: r, l: r, q: x ? x.vierges + x.variantes.reduce((s, v) => s + v.qte, 0) : 0 }; })} onPick={v => setNeed(n, { turbInj: v === n.inj ? null : v, turbInjB: null })} onClose={close}
        extra={n.inj && <div style={{ marginTop: 10, borderTop: "1px solid " + T.line, paddingTop: 8 }}>
          <div style={{ fontSize: 12, color: T.ink500, marginBottom: 6 }}>Bouchages{ii && ii.ouv ? " (" + ii.ouv + " ouvertures : " + mx + " au plus)" : ""}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" aria-label="Un bouchage de moins" disabled={!n.injB} onClick={() => setNeed(n, { turbInjB: Math.max(0, (n.injB || 0) - 1) || null })} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, cursor: "pointer" }}>−</button>
            <b style={{ minWidth: 28, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{n.injB || 0}</b>
            <button type="button" aria-label="Un bouchage de plus" disabled={(n.injB || 0) >= mx} onClick={() => setNeed(n, { turbInjB: Math.min(mx, (n.injB || 0) + 1) })} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, cursor: "pointer" }}>+</button>
            <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{ii ? (ii.variantes.find(v => v.bouches === (n.injB || 0)) ? ii.variantes.find(v => v.bouches === (n.injB || 0)).qte + " déjà prêt(s)" : (n.injB ? "à boucher par la production" : ii.vierges + " vierge(s)")) : ""}</span>
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
