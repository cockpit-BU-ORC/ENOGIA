// v146.24 → v146.26 — Manager › Turbines : tableau d'attribution par glisser-déposer.
// Zones : Stock (turbines déjà arrivées, vert), À venir (violet) — en plusieurs colonnes pour rester visibles —, Roues et Injecteurs (ajout direct),
// un cadre par PJ (qui attend 1 ou 2 turbines selon sa gamme) et par projet SAV (nom « SAV » + n° de PJ, créé via une fenêtre).
// La roue et l'injecteur se glissent (ou se choisissent dans la liste) sur la turbine, comme des sous-ensembles ; ils reviennent dans leur liste en les y déposant.
// Les déplacements passent par les fonctions pures de turbines.js (moveTurbine, placeElement) ; le contrôle (pjCheck) signale en rouge la turbine,
// la roue ou l'injecteur manquant dans la semaine qui arrive.
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePointerDnD } from "../pointerDrag";
import { T, FZF as FZ } from "../theme";
import { getPjMeta, GAMME_COLORS } from "../pjMeta";
import { Badge, NavIcon } from "./SharedUI";
import { toLocalISO } from "../parsers";
import { CARD, H_TITLE, H_SUB } from "./ManagerParts";
import { TYPE_LABEL, TURBINE_TYPES, isFree, byMad, weekLabel, fmtFr, turbinesNeeded, pjCheck, moveTurbine, placeElement, hasEl, urgencyOf, withMad, savName, lateDays, dueDates, placeLoose, dropLoose, looseOf, absorbLoose } from "../turbines";

const dIso = x => { if (!x) return ""; const d = new Date(x); return isNaN(d) ? "" : toLocalISO(d); };
const typeColor = ty => ty === "20LT" ? T.teal600 : T.navy700;
const lvlColor = l => l === "error" ? T.red500 : l === "warn" ? T.amber600 : T.ink500;
const lvlBg = l => l === "error" ? T.red100 : l === "warn" ? T.amber100 : "transparent";
// Stock réel (déjà arrivé, vert) et à venir (violet) : deux familles de couleurs bien distinctes
const isReal = (t, today) => !!t.mad && t.mad <= today;
const realC = () => T.emerald500, futC = () => T.violet500;
const zoneC = (t, today) => isReal(t, today) ? realC() : futC();
const SAV_NEEDS = [["100LT:1", "1 × 100 kW"], ["100LT:2", "2 × 100 kW"], ["20LT:1", "1 × 20 kW"], ["20LT:2", "2 × 20 kW"]];

function SavDialog({ onClose, onCreate, existing }) {
  const [pj, setPj] = useState(""), [need, setNeed] = useState("100LT:1"), [date, setDate] = useState(""), [err, setErr] = useState("");
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const name = savName(pj);
  const fld = { padding: "7px 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.surface, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, width: "100%", boxSizing: "border-box" };
  const lbl = { fontSize: FZ.xs, fontWeight: 800, color: T.ink500, textTransform: "uppercase", letterSpacing: ".04em", margin: "12px 0 4px" };
  const submit = async e => {
    e.preventDefault();
    if (!name) { setErr("Indiquez le n° du PJ (ex. 411 ou PJ411)."); return; }
    if (existing.includes(name)) { setErr("Le cadre " + name + " existe déjà."); return; }
    const [type, n] = need.split(":");
    if (await onCreate({ name, pj: pj.trim().toUpperCase(), type, n: +n, need: date || "" })) onClose();
  };
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Nouveau projet SAV" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 20010, background: "rgba(10,16,28,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
    <form onSubmit={submit} style={{ background: T.card, color: T.ink900, borderRadius: 16, boxShadow: T.shadowLg, border: "1px solid " + T.line, width: "min(440px,100%)", padding: 20, fontFamily: T.font }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: FZ.md }}>Nouveau projet SAV</div>
      <div style={{ fontSize: FZ.sm, color: T.ink500, marginTop: 2 }}>Le cadre s'appelle « SAV » + le numéro du PJ concerné.</div>
      <div style={lbl}>N° du PJ</div>
      <input autoFocus value={pj} onChange={e => { setPj(e.target.value); setErr(""); }} placeholder="ex. 411, PJ411 ou PJ411-1" aria-label="N° du PJ" style={fld} />
      <div style={{ fontSize: FZ.xs, color: name ? T.emerald600 : T.ink300, marginTop: 4, fontWeight: 700 }}>{name ? "Nom du cadre : " + name : "Nom du cadre : SAVXXX"}</div>
      <div style={lbl}>Turbine demandée</div>
      <select value={need} onChange={e => setNeed(e.target.value)} aria-label="Turbine demandée" style={fld}>{SAV_NEEDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <div style={lbl}>Date de besoin (facultatif)</div>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Date de besoin" style={{ ...fld, colorScheme: T.mode === "dark" ? "dark" : "light" }} />
      {err && <div role="alert" style={{ marginTop: 10, fontSize: FZ.xs, color: T.red600, fontWeight: 700 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <button type="button" onClick={onClose} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 999, padding: "6px 14px", fontSize: FZ.sm, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Annuler</button>
        <button type="submit" style={{ border: "none", background: T.navy700, color: "#fff", borderRadius: 999, padding: "6px 16px", fontSize: FZ.sm, fontWeight: 800, cursor: "pointer", fontFamily: T.font }}>Créer {name}</button>
      </div>
    </form>
  </div>, document.body);
}

export function TurbineBoard({ installed, turbines, looseEls, rows, savProjects, savMeta, wheelNames, injectorNames, today, commit, superAdmin }) {
  const loose = Array.isArray(looseEls) ? looseEls : [];
  const dnd = usePointerDnD(), over = dnd.over;
  const [q, setQ] = useState(""), [onlyTodo, setOnlyTodo] = useState(false), [savDlg, setSavDlg] = useState(false), [openMap, setOpenMap] = useState({});

  // v263 (audit apple-design) : glisser maison — la carte suit la souris, la cible s'allume, retour au départ si refusé
  const dragProps = payload => dnd.dragProps(payload);
  const dropProps = (key, accepts, onDrop) => dnd.dropProps(key, accepts, onDrop);
  const isT = p => p.k === "turbine";
  const lit = key => over === key ? { borderColor: T.teal500, background: T.teal100 } : null;

  const toTarget = (p, target) => { const L = moveTurbine(turbines, p.id, target); const r = target ? absorbLoose(L, loose, p.id) : { turbines: L, looseEls: loose }; return commit({ turbines: r.turbines, looseEls: r.looseEls }); };
  const setMad = (id, mad) => mad && commit({ turbines: turbines.map(t => t.id === id ? withMad(t, mad) : t) });
  const place = (kind, name, turbineId) => commit({ turbines: placeElement(turbines, kind, name, turbineId), looseEls: dropLoose(loose, kind, name) });
  // Dépôt d'une roue / d'un injecteur sur la carte d'un PJ ou SAV : sur la 1re turbine à laquelle il manque, sinon « seul » (sans turbine)
  const toCard = (p, target, assigned) => {
    const free = assigned.find(t => !hasEl(t[p.k]));
    if (free) return place(p.k, p.name, free.id);
    const r = placeLoose(turbines, loose, p.k, p.name, target); return commit({ turbines: r.turbines, looseEls: r.looseEls });
  };
  const dropCard = (key, target, assigned) => dropProps(key, p => isT(p) || p.k === "wheel" || p.k === "injector", p => isT(p) ? toTarget(p, target) : toCard(p, target, assigned));
  const accepts = kind => p => p.k === kind;
  const usedNames = kind => new Set([...turbines.map(t => t[kind] && t[kind].name), ...loose.filter(l => l.kind === kind).map(l => l.name)].filter(Boolean));
  const dateIn = (t, edited) => <input type="date" value={t.mad || ""} onChange={e => setMad(t.id, e.target.value)} aria-label={"Date de MàD de " + (t.ref || "la turbine")} style={{ fontFamily: T.font, fontSize: FZ.xs, color: T.ink900, background: edited ? T.amber100 : T.surface, border: "1px solid " + (edited ? T.amber600 : T.line), borderRadius: 6, padding: "1px 4px", colorScheme: T.mode === "dark" ? "dark" : "light", minWidth: 0 }} />;
  const latePill = t => { const d = lateDays(t); return d > 0 ? <span title={"MàD " + d + " j après l'échéance du fichier (" + fmtFr(t.need) + ")"} style={{ fontSize: FZ.xs, fontWeight: 800, color: d > 7 ? T.red500 : T.amber600, background: d > 7 ? T.red100 : T.amber100, borderRadius: 999, padding: "0 6px", whiteSpace: "nowrap", flexShrink: 0 }}>+{d} j</span> : null; };

  // ── morceaux d'interface (appelés comme des fonctions, jamais comme des composants : sinon le glisser-déposer est interrompu par le re-rendu)
  const Tag = ({ ty }) => <span style={{ fontSize: FZ.xs, fontWeight: 800, color: "#fff", background: typeColor(ty), borderRadius: 6, padding: "0 6px", lineHeight: "16px", flexShrink: 0 }}>{TYPE_LABEL[ty]}</span>;
  const ElChip = ({ kind, name, onRemove, where }) => <span {...dragProps({ k: kind, name })} title={name + (where ? " → " + where : "") + " — glisser pour déplacer"} style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "grab", padding: "2px 9px", borderRadius: 999, fontSize: FZ.xs, fontWeight: 700, background: where && !onRemove ? T.surfaceAlt : T.card, color: where && !onRemove ? T.ink500 : T.ink900, border: "1px solid " + (where && !onRemove ? T.line : T.emerald600), whiteSpace: "nowrap", userSelect: "none" }}>
    {name}{where && !onRemove && <span style={{ fontWeight: 600 }}>→ {where}</span>}
    {onRemove && <button onClick={onRemove} aria-label={"Retirer " + name} title="Remettre dans la liste" style={{ border: "none", background: "transparent", color: T.ink300, cursor: "pointer", padding: 0, fontSize: FZ.sm, lineHeight: 1 }}>×</button>}
  </span>;

  // Emplacement de roue / d'injecteur : déposer un élément, ou cliquer pour choisir dans la liste des disponibles
  const ElSlot = ({ t, kind, level, when }) => {
    const e = t[kind], key = "el:" + t.id + kind, label = kind === "wheel" ? "Roue" : "Injecteur";
    const miss = level === "error" ? "À poser" : level === "warn" ? "À prévoir" : "Non posée";
    const names = (kind === "wheel" ? wheelNames : injectorNames), used = usedNames(kind), freeN = names.filter(n => !used.has(n));
    return <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: 2, lineHeight: 1.25 }}><div style={{ fontSize: FZ.xs, color: T.ink900, fontWeight: 800 }}>{label}</div><div style={{ fontSize: FZ.xs, fontWeight: 500, color: level && !hasEl(e) ? lvlColor(level) : T.ink300 }}>{when}</div></div>
      <div {...dropProps(key, accepts(kind), p => place(kind, p.name, t.id))} style={{ border: "1.5px " + (hasEl(e) ? "solid " + (T.emerald600) : "dashed " + (level ? lvlColor(level) : T.line)), borderRadius: 8, padding: "3px 5px", background: hasEl(e) ? T.card : lvlBg(level), minHeight: 30, display: "flex", alignItems: "center", ...lit(key) }}>
        {hasEl(e) ? ElChip({ kind, name: e.name, onRemove: () => place(kind, e.name, null) })
          : <select value="" onChange={ev => ev.target.value && place(kind, ev.target.value, t.id)} aria-label={label + " de " + (t.ref || "la turbine") + " : choisir"} style={{ width: "100%", border: "none", background: "transparent", color: level ? lvlColor(level) : T.ink500, fontWeight: level ? 800 : 600, fontSize: FZ.xs, fontFamily: T.font, cursor: "pointer", padding: 0 }}>
            <option value="">{(level === "error" ? "⚠ " : "") + miss + " — choisir ▾"}</option>
            {freeN.map(n => <option key={n} value={n}>{n}</option>)}
            {!freeN.length && <option disabled value="">{names.length ? "Toutes déjà posées" : "Ajoutez des noms dans la zone « " + label + "s »"}</option>}
          </select>}
      </div>
    </div>;
  };

  const TurbineCard = ({ t, row, full }) => {
    const due = row ? dueDates(row) : null, wl = due ? urgencyOf(due.wheel, today) : null, il = due ? urgencyOf(due.injector, today) : null;
    const edited = t.madSrc && t.madSrc !== t.mad, real = isReal(t, today), zc = zoneC(t, today);
    return <div {...dragProps({ k: "turbine", id: t.id })} title="Glisser pour déplacer cette turbine" style={{ border: "1px solid " + T.line, borderLeft: "5px " + (real ? "solid " : "dashed ") + zc, borderRadius: 10, background: T.surface, padding: "6px 8px", cursor: "grab", userSelect: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {Tag({ ty: t.type })}
        <b style={{ fontSize: FZ.xs, color: T.ink900 }}>{t.ref || "Turbine"}</b>
        <span style={{ fontSize: FZ.xs, fontWeight: 800, color: real ? T.emerald600 : T.violet600, background: real ? T.emerald100 : T.violet100, borderRadius: 999, padding: "0 7px" }}>{real ? "En stock" : "À venir"}</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: FZ.xs, color: T.ink500 }} title={edited ? "Date corrigée ici (date d'origine : " + fmtFr(t.madSrc) + ")" : "Date de mise à disposition — modifiable"}>
          MàD {weekLabel(t.mad)} {dateIn(t, edited)}
        </span>
      </div>
      {t.need && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: FZ.xs, color: T.ink500 }}>
        {t.need && <span>Échéance {fmtFr(t.need)} {latePill(t)}</span>}
      </div>}
      {full && <div style={{ display: "flex", gap: 6 }}>
        {ElSlot({ t, kind: "wheel", level: wl, when: due && due.wheel ? (due.fromArrival ? "connue 1 sem. avant l'arrivée" : "avant les tests") + " (" + fmtFr(due.wheel) + ")" : "" })}
        {ElSlot({ t, kind: "injector", level: il, when: due && due.injector ? (due.fromArrival ? "dispo le jour de l'arrivée" : "avant le départ") + " (" + fmtFr(due.injector) + ")" : "" })}
      </div>}
    </div>;
  };
  const PoolChip = ({ t }) => {
    const edited = t.madSrc && t.madSrc !== t.mad, real = isReal(t, today), zc = zoneC(t, today);
    return <div {...dragProps({ k: "turbine", id: t.id })} title={(t.ref || "Turbine") + " — glisser vers un PJ, un SAV ou l'autre stock" + (t.need ? " · échéance " + fmtFr(t.need) : "")} style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid " + zc + "88", borderLeft: "5px " + (real ? "solid " : "dashed ") + zc, borderRadius: 8, background: T.card, padding: "3px 6px", cursor: "grab", userSelect: "none", fontSize: FZ.xs, minWidth: 0 }}>
      {Tag({ ty: t.type })}<b style={{ color: T.ink900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{t.ref || "Turbine"}</b>
      {latePill(t)}<span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3, color: T.ink500 }} title={edited ? "Date corrigée ici (date d'origine : " + fmtFr(t.madSrc) + ")" : "Date de mise à disposition — modifiable"}>{weekLabel(t.mad)} {dateIn(t, edited)}</span>
    </div>;
  };

  const zone = (key, title, sub, accept, onDrop, children, extra, tint) => <div {...dropProps(key, accept, onDrop)} style={{ border: "1.5px dashed " + (tint || T.line), borderRadius: 12, padding: 10, background: tint ? tint + "14" : T.surface, minWidth: 0, flex: "1 1 260px", ...lit(key), ...extra }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: FZ.sm, fontWeight: 800, color: T.ink900 }}>{title}</span><span style={{ fontSize: FZ.xs, color: T.ink500 }}>{sub}</span></div>
    {children}
  </div>;
  const chipGrid = (items, empty) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 5, marginTop: 8, maxHeight: 196, overflowY: "auto", alignContent: "start", paddingRight: 2 }}>
    {items.length ? items : <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{empty}</span>}
  </div>;

  // ── données
  // Stock = ce qu'on possède ou attend VRAIMENT (fichier du responsable turbines, saisie manuelle). Les turbines « estimées d'après le planning » (origin) ne sont pas du stock : zone à part.
  const freeAll = turbines.filter(isFree).sort(byMad), est = freeAll.filter(t => t.origin), free = freeAll.filter(t => !t.origin);
  const stock = free.filter(t => isReal(t, today)), virtualAll = free.filter(t => !isReal(t, today));
  const virtual = virtualAll;   // toutes les turbines attendues du fichier du responsable (jusqu'à mars), une ligne = une turbine
  const countBy = L => TURBINE_TYPES.map(ty => [ty, L.filter(t => t.type === ty).length]).filter(x => x[1]).map(([ty, n]) => n + " × " + TYPE_LABEL[ty]).join(" · ") || "vide";
  const assignedTo = (kind, ref) => turbines.filter(t => t.target && t.target.kind === kind && t.target.ref === ref);
  const where = (kind, name) => { const t = turbines.find(x => x[kind] && x[kind].name === name); if (t) return t.target ? t.target.ref : (t.ref || "turbine"); const l = loose.find(x => x.kind === kind && x.name === name); return l ? l.target.ref : null; };

  const isDone = r => r.etat === "SHIPPED" || (installed || []).includes(r.pj);
  const pjRows = useMemo(() => {
    const norm = rows.map(r => ({ ...r, arrivee: dIso(r.arrivee), tests: dIso(r.tests), depart: dIso(r.depart) }));
    const has = new Set(turbines.filter(t => t.target && t.target.kind === "PJ").map(t => t.target.ref));
    return norm.filter(r => !isDone(r) && (has.has(r.pj) || turbinesNeeded(r.gamme))).map(r => {
      const a = turbines.filter(t => t.target && t.target.kind === "PJ" && t.target.ref === r.pj);
      return { r, a, chk: pjCheck(r, a, today, 7, looseOf(loose, { kind: "PJ", ref: r.pj })) };
    }).sort((x, y) => (x.r.arrivee || x.r.tests || "9999").localeCompare(y.r.arrivee || y.r.tests || "9999") || x.r.pj.localeCompare(y.r.pj));
  }, [rows, turbines, loose, today, installed]); // eslint-disable-line react-hooks/exhaustive-deps
  const nErr = pjRows.filter(x => x.chk.issues.some(i => i.level === "error")).length;
  const ql = q.trim().toLowerCase();
  const shown = pjRows.filter(x => (!ql || x.r.pj.toLowerCase().includes(ql) || (getPjMeta(x.r.pj, x.r).nomProjet || "").toLowerCase().includes(ql)) && (!onlyTodo || x.chk.issues.length > 0 || (x.chk.need && x.chk.have < x.chk.need.n)));

  const savNames = [...savProjects, ...Array.from(new Set(turbines.filter(t => t.target && t.target.kind === "SAV" && t.target.ref && !savProjects.includes(t.target.ref)).map(t => t.target.ref)))];

  // Roue / injecteur « seul » : posé sur le projet sans turbine (ou en attendant qu'elle arrive) ; il passe sur la turbine dès qu'il lui manque
  const LooseZone = ({ items }) => <div style={{ border: "1.5px dashed " + (items.length ? T.emerald600 : T.line), borderRadius: 8, padding: "5px 8px", background: T.surface, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minHeight: 28 }}>
    {items.map(l => <React.Fragment key={l.kind + l.name}>{ElChip({ kind: l.kind, name: l.name, onRemove: () => place(l.kind, l.name, null) })}<span style={{ fontSize: FZ.xs, color: T.ink500, marginLeft: -3 }}>{l.kind === "wheel" ? "roue" : "injecteur"} seul(e)</span></React.Fragment>)}
    {!items.length && <span style={{ fontSize: FZ.xs, color: T.ink300 }}>Roue ou injecteur seul : glisser ici (sans turbine)</span>}
  </div>;

  const PjCard = ({ x }) => {
    const { r, a, chk } = x, key = "pj:" + r.pj, m = getPjMeta(r.pj, r);
    const gc = GAMME_COLORS[r.gamme] || T.ink300;
    const nErr = chk.issues.filter(i => i.level === "error").length, nWarn = chk.issues.length - nErr;
    // Replié par défaut (seul le nom reste visible) ; ouvert pour les projets du mois en cours (arrivée, à défaut tests) ; un clic sur l'en-tête bascule
    const month = (r.arrivee || r.tests || "").slice(0, 7), open = r.pj in openMap ? openMap[r.pj] : (!!month && month === today.slice(0, 7));
    const toggle = () => setOpenMap(m => ({ ...m, [r.pj]: !open }));
    const complete = chk.complete, lz = looseOf(loose, { kind: "PJ", ref: r.pj });
    const manque = [chk.missing.turbines && chk.missing.turbines + " turbine" + (chk.missing.turbines > 1 ? "s" : ""), chk.missing.wheels && chk.missing.wheels + " roue" + (chk.missing.wheels > 1 ? "s" : ""), chk.missing.injectors && chk.missing.injectors + " injecteur" + (chk.missing.injectors > 1 ? "s" : "")].filter(Boolean).join(" · ");
    const border = nErr ? T.red500 : nWarn ? T.amber600 : complete ? T.emerald600 : T.line;
    const missing = chk.need ? Math.max(0, chk.need.n - a.length) : 0;
    const status = nErr ? { t: "⚠ " + nErr + " à traiter", c: T.red500, bg: T.red100 } : nWarn ? { t: "• " + nWarn + " point" + (nWarn > 1 ? "s" : "") + " à vérifier", c: T.amber600, bg: T.amber100 } : complete ? { t: "✓ Complet", c: T.emerald600, bg: "transparent" } : { t: chk.need ? "À compléter : " + manque : "—", c: T.ink500, bg: T.surfaceAlt };
    const dchip = (lab, iso, lvl) => <span style={{ fontSize: FZ.xs, fontWeight: 700, borderRadius: 6, padding: "1px 7px", color: lvl ? lvlColor(lvl) : T.ink700, background: lvl ? lvlBg(lvl) : T.surfaceAlt }}>{lab} {iso ? fmtFr(iso) + " · " + weekLabel(iso) : "—"}</span>;
    const cardIssues = chk.issues.filter(i => i.scope === "card");
    return <div {...dropCard(key, { kind: "PJ", ref: r.pj }, a)} style={{ border: "1.5px solid " + border, borderLeft: "6px solid " + gc, borderRadius: 12, background: T.card, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", ...lit(key) }}>
      <div style={{ background: gc + "24", padding: open ? "8px 10px" : "5px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
        <div role="button" tabIndex={0} aria-expanded={open} title={open ? "Replier la fiche" : "Ouvrir la fiche"} onClick={toggle} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: "pointer", userSelect: "none" }}>
          <span aria-hidden="true" style={{ fontSize: FZ.xs, color: T.ink500, width: 10 }}>{open ? "▾" : "▸"}</span>
          <b style={{ fontSize: FZ.md, color: T.ink900, letterSpacing: "-.01em" }}>{r.pj}</b>
          <span style={{ fontSize: FZ.xs, fontWeight: 800, color: T.ink900, background: gc + "44", border: "1px solid " + gc, borderRadius: 6, padding: "0 7px" }}>{r.gamme || "—"}</span>
          {!open && chk.need && <span style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink700 }}>{chk.have}/{chk.need.n} turb.</span>}
          {!open && r.arrivee && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>arr. {fmtFr(r.arrivee)}</span>}
          <span style={{ marginLeft: "auto", fontSize: FZ.xs, fontWeight: 800, color: status.c, background: status.bg, borderRadius: 999, padding: "1px 9px" }}>{status.t}</span>
        </div>
        {open && <div style={{ fontSize: FZ.xs, color: T.ink700, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nomProjet && m.nomProjet !== "—" ? m.nomProjet : "Projet sans nom"}</div>}
        {open && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {r.etat && <Badge etat={r.etat} />}
          {r.arrivee ? dchip("Arrivée", r.arrivee, urgencyOf(r.arrivee, today)) : null}
          {dchip("Tests", r.tests, urgencyOf(r.tests, today))}
          {dchip("Départ", r.depart, urgencyOf(r.depart, today))}
        </div>}
      </div>
      {open && <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        {chk.need && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: FZ.xs, fontWeight: 800, color: T.ink700, whiteSpace: "nowrap" }}>{chk.have}/{chk.need.n} turbine{chk.need.n > 1 ? "s" : ""} {TYPE_LABEL[chk.need.type]}</span>
          <span style={{ display: "flex", gap: 3, flex: 1 }}>{Array.from({ length: Math.max(chk.need.n, chk.have) }).map((_, i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < chk.have ? typeColor(chk.need.type) : T.ink100 }} />)}</span>
        </div>}
        {a.map(t => <React.Fragment key={t.id}>{TurbineCard({ t, row: r, full: true })}</React.Fragment>)}
        {Array.from({ length: missing }).map((_, i) => <div key={"e" + i} style={{ border: "1.5px dashed " + (cardIssues.some(z => /à attribuer/.test(z.text)) ? lvlColor(cardIssues.find(z => /à attribuer/.test(z.text)).level) : T.line), borderRadius: 8, padding: "12px 8px", textAlign: "center", fontSize: FZ.xs, color: T.ink500, background: T.surface }}>Glisser une turbine {TYPE_LABEL[chk.need.type]} ici</div>)}
        {!chk.need && a.length === 0 && <div style={{ fontSize: FZ.xs, color: T.ink300 }}>Pas de turbine attendue pour cette gamme.</div>}
        {LooseZone({ items: lz })}
        {cardIssues.map((z, i) => <div key={i} role={z.level === "error" ? "alert" : undefined} style={{ fontSize: FZ.xs, fontWeight: 700, color: lvlColor(z.level), background: lvlBg(z.level), borderRadius: 6, padding: "3px 8px" }}>{z.level === "error" ? "⚠ " : "• "}{z.text}</div>)}
        <button onClick={() => commit({ installedPj: [...(installed || []), r.pj] })} title="Retire ce projet de la liste (machine installée)" style={{ alignSelf: "flex-end", border: "none", background: "transparent", color: T.ink500, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", padding: "0 2px", fontFamily: T.font, textDecoration: "underline" }}>✓ Turbines installées — retirer de la liste</button>
      </div>}
    </div>;
  };

  const SavCard = ({ name }) => {
    const key = "sav:" + name, a = assignedTo("SAV", name), meta = (savMeta || {})[name];
    const need = meta && meta.type ? { type: meta.type, n: meta.n || 1 } : null;
    const needIso = (meta && meta.need) || "", row = { pj: name, needOverride: need, tests: needIso, depart: needIso, etat: "SAV", arrivee: needIso };
    const chk = pjCheck(row, a, today, 7, looseOf(loose, { kind: "SAV", ref: name })), nErr = chk.issues.filter(i => i.level === "error").length, cardIssues = chk.issues.filter(i => i.scope === "card");
    const missing = need ? Math.max(0, need.n - a.length) : 0, sc = T.ember500 || T.amber600;
    const del = () => {
      if (!window.confirm("Supprimer le cadre " + name + " ?" + (a.length ? " Ses " + a.length + " turbine(s) retournent en stock (avec leur roue et injecteur libérés)." : ""))) return;
      let L = turbines; a.forEach(t => { L = moveTurbine(L, t.id, null); });
      const sm = { ...(savMeta || {}) }; delete sm[name];
      commit({ turbines: L, savProjects: savProjects.filter(x => x !== name), savMeta: sm });
    };
    return <div {...dropCard(key, { kind: "SAV", ref: name }, a)} style={{ border: "1.5px solid " + (nErr ? T.red500 : T.line), borderLeft: "6px solid " + sc, borderRadius: 12, background: T.card, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0, ...lit(key) }}>
      <div style={{ background: sc + "22", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <b style={{ fontSize: FZ.md, color: T.ink900, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{/^SAV/.test(name) ? name : "SAV · " + name}</b>
          <span style={{ fontSize: FZ.xs, fontWeight: 800, color: T.ink900, background: sc + "44", border: "1px solid " + sc, borderRadius: 6, padding: "0 7px" }}>SAV</span>
          {chk.complete && <span style={{ fontSize: FZ.xs, fontWeight: 800, color: T.emerald600 }}>✓ Complet</span>}
          {superAdmin && <button onClick={del} title="Supprimer ce cadre (super admin)" aria-label={"Supprimer " + name} style={{ border: "none", background: "transparent", color: T.red600, cursor: "pointer", fontSize: FZ.sm, lineHeight: 0, padding: 2 }}><NavIcon name="trash" size={16} /></button>}
        </div>
        <div style={{ fontSize: FZ.xs, color: T.ink700, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {meta && meta.pj && <span>PJ {meta.pj.replace(/^PJ\s*/i, "")}</span>}
          {meta && meta.need ? <span style={{ fontWeight: 700, color: lvlColor(urgencyOf(meta.need, today)) }}>Besoin {fmtFr(meta.need)} · {weekLabel(meta.need)}</span> : <span>Sans date de besoin</span>}
        </div>
      </div>
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        {need && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: FZ.xs, fontWeight: 800, color: T.ink700, whiteSpace: "nowrap" }}>{a.length}/{need.n} turbine{need.n > 1 ? "s" : ""} {TYPE_LABEL[need.type]}</span>
          <span style={{ display: "flex", gap: 3, flex: 1 }}>{Array.from({ length: Math.max(need.n, a.length) }).map((_, i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < a.length ? typeColor(need.type) : T.ink100 }} />)}</span>
        </div>}
        {a.map(t => <React.Fragment key={t.id}>{TurbineCard({ t, row: row, full: true })}</React.Fragment>)}
        {Array.from({ length: need ? missing : a.length ? 0 : 1 }).map((_, i) => <div key={"e" + i} style={{ border: "1.5px dashed " + T.line, borderRadius: 8, padding: "12px 8px", textAlign: "center", fontSize: FZ.xs, color: T.ink500, background: T.surface }}>Glisser une turbine {need ? TYPE_LABEL[need.type] + " " : ""}ici</div>)}
        {LooseZone({ items: looseOf(loose, { kind: "SAV", ref: name }) })}
        {cardIssues.map((z, i) => <div key={i} style={{ fontSize: FZ.xs, fontWeight: 700, color: lvlColor(z.level), background: lvlBg(z.level), borderRadius: 6, padding: "3px 8px" }}>{z.level === "error" ? "⚠ " : "• "}{z.text}</div>)}
      </div>
    </div>;
  };

  // Roues / injecteurs : liste, ajout direct (champ « ＋ »), retrait réservé au super admin
  const ElPool = ({ kind, names, title }) => {
    const key = kind === "wheel" ? "wheelNames" : "injectorNames", used = usedNames(kind);
    return zone("pool:" + kind, title, names.filter(n => !used.has(n)).length + " libre(s) sur " + names.length, accepts(kind), p => place(kind, p.name, null),
      <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8, maxHeight: 96, overflowY: "auto", alignContent: "flex-start" }}>
          {names.length ? names.map(n => <React.Fragment key={n}>{(() => { const w = where(kind, n); return <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>{ElChip({ kind, name: n, where: w })}{superAdmin && !w && <button onClick={() => commit({ [key]: names.filter(x => x !== n) })} aria-label={"Retirer " + n + " de la liste"} title="Supprimer de la liste (super admin)" style={{ border: "none", background: "transparent", color: T.ink300, cursor: "pointer", padding: 0, fontSize: FZ.sm, lineHeight: 1 }}>×</button>}</span>; })()}</React.Fragment>) : <span style={{ fontSize: FZ.xs, color: T.ink300 }}>Aucun nom : ajoutez-en ci-dessous.</span>}
        </div>
        <form onSubmit={e => { e.preventDefault(); const v = e.target.elements.nm.value.trim(); if (!v || names.some(x => x.toLowerCase() === v.toLowerCase())) return; commit({ [key]: [...names, v] }); e.target.reset(); }} style={{ display: "flex", gap: 5, marginTop: 8 }}>
          <input name="nm" placeholder={"＋ Nouvelle " + (kind === "wheel" ? "roue" : "injecteur")} aria-label={"Ajouter " + (kind === "wheel" ? "une roue" : "un injecteur")} maxLength={40} style={{ ...inp, flex: 1, minWidth: 0 }} />
          <button type="submit" style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 999, padding: "3px 10px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Ajouter</button>
        </form>
      </>, { flex: "1 1 240px" });
  };

  const inp = { fontFamily: T.font, fontSize: FZ.xs, color: T.ink900, background: T.surface, border: "1px solid " + T.line, borderRadius: 8, padding: "5px 8px" };

  return <div style={{ ...CARD, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
    <div>
      <div style={H_TITLE}>Tableau d'attribution</div>
      <div style={H_SUB}>Glissez une turbine du stock vers un PJ ou un SAV (ou l'inverse), puis sa roue et son injecteur (ou choisissez-les dans la liste de la turbine). 100 kW = gammes 100 (1 turbine) et 180 (2) ; 20 kW = gammes 20 (1) et 40 (2).</div>
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {zone("stock", <span style={{ color: T.emerald600 }}>● Stock réel</span>, countBy(stock) + " · déjà arrivées", isT, p => toTarget(p, null), chipGrid(stock.map(t => <React.Fragment key={t.id}>{PoolChip({ t })}</React.Fragment>), "Aucune turbine en stock."), { flex: "1 1 470px" }, realC())}
      {zone("virtual", <span style={{ color: T.violet600 }}>◌ À venir</span>, countBy(virtual) + " · en montage / attendues (MàD future)", isT, p => toTarget(p, null), chipGrid(virtual.map(t => <React.Fragment key={t.id}>{PoolChip({ t })}</React.Fragment>), "Aucune turbine attendue."), { flex: "1 1 470px" }, futC())}
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {ElPool({ kind: "wheel", names: wheelNames, title: "Roues" })}
      {ElPool({ kind: "injector", names: injectorNames, title: "Injecteurs" })}
    </div>

    {est.length > 0 && <details style={{ border: "1px dashed " + T.line, borderRadius: 10, padding: "6px 10px", background: T.surface }}>
      <summary style={{ cursor: "pointer", fontSize: FZ.xs, fontWeight: 800, color: T.ink500 }}>Turbines estimées d'après le planning ({est.length}) — hors stock : ce sont des besoins, pas des appros</summary>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 5, marginTop: 8 }}>{est.map(t => <React.Fragment key={t.id}>{PoolChip({ t })}</React.Fragment>)}</div>
      {superAdmin && <button onClick={() => { if (window.confirm("Supprimer les " + est.length + " turbines estimées (libres) ? Les turbines du fichier du responsable et les turbines attribuées ne sont pas touchées.")) commit({ turbines: turbines.filter(t => !(isFree(t) && t.origin)) }); }} style={{ ...inp, marginTop: 8, cursor: "pointer", fontWeight: 700, color: T.red600 }}>Supprimer ces estimations</button>}
    </details>}
    {/* v146.28 : 2/3 de l'écran pour les PJ, 1/3 pour les SAV (empilés sur écran étroit) */}
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start", borderTop: "1px solid " + T.line, paddingTop: 10 }}>
      <div style={{ flex: "2 1 640px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", }}>
      <div style={{ fontSize: FZ.sm, fontWeight: 800, color: T.ink900 }}>Projets</div>
      <span style={{ fontSize: FZ.xs, color: nErr ? T.red500 : T.ink500, fontWeight: nErr ? 800 : 500 }}>{pjRows.length} PJ avec turbine{nErr ? " · " + nErr + " en erreur" : ""}</span>
      <button onClick={() => setOpenMap(Object.fromEntries(shown.map(x => [x.r.pj, true])))} style={{ ...inp, cursor: "pointer", fontWeight: 700, marginLeft: "auto" }}>Tout ouvrir</button><button onClick={() => setOpenMap(Object.fromEntries(shown.map(x => [x.r.pj, false])))} style={{ ...inp, cursor: "pointer", fontWeight: 700 }}>Tout replier</button>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un PJ…" aria-label="Chercher un PJ" style={{ ...inp, width: 150 }} />
      <label style={{ fontSize: FZ.xs, color: T.ink700, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}><input type="checkbox" checked={onlyTodo} onChange={e => setOnlyTodo(e.target.checked)} style={{ accentColor: T.teal600 }} />À compléter / en alerte</label>
    </div>
    <div style={{ columns: "290px", columnGap: 10 }}>
      {shown.map(x => <div key={x.r.pj} style={{ breakInside: "avoid", marginBottom: 10 }}>{PjCard({ x })}</div>)}
      {!shown.length && <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucun PJ ne correspond.</div>}
    </div>

      </div>
      <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", }}>
      <div style={{ fontSize: FZ.sm, fontWeight: 800, color: T.ink900 }}>Projets SAV</div>
      <button onClick={() => setSavDlg(true)} style={{ marginLeft: "auto", border: "none", borderRadius: 999, padding: "5px 14px", background: T.navy700, color: "#fff", fontWeight: 700, fontSize: FZ.xs, cursor: "pointer", fontFamily: T.font }}>＋ Nouveau projet SAV</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, alignItems: "start" }}>
      {savNames.map(n => <React.Fragment key={n}>{SavCard({ name: n })}</React.Fragment>)}
      {!savNames.length && <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucun projet SAV : créez-en un, puis glissez-y des turbines.</div>}
    </div>
      </div>
    </div>
    {savDlg && <SavDialog existing={savNames} onClose={() => setSavDlg(false)} onCreate={s => commit({ savProjects: [...savProjects, s.name], savMeta: { ...(savMeta || {}), [s.name]: { pj: s.pj, type: s.type, n: s.n, need: s.need } } })} />}

    {(() => {
      const doneRows = rows.filter(isDone).map(r => ({ r, a: turbines.filter(t => t.target && t.target.kind === "PJ" && t.target.ref === r.pj) })).filter(x => x.a.length || (installed || []).includes(x.r.pj));
      if (!doneRows.length) return null;
      return <details style={{ borderTop: "1px solid " + T.line, paddingTop: 10 }}>
        <summary style={{ cursor: "pointer", fontSize: FZ.sm, fontWeight: 800, color: T.ink700 }}>Expédiés / installés ({doneRows.length})</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {doneRows.map(({ r, a }) => <div key={r.pj} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: FZ.xs, color: T.ink500 }}>
            <b style={{ color: T.ink700, minWidth: 80 }}>{r.pj}</b><span>{r.etat === "SHIPPED" ? "expédié" : "installé"}</span>
            {a.map(t => <React.Fragment key={t.id}>{PoolChip({ t })}</React.Fragment>)}
            {r.etat !== "SHIPPED" && <button onClick={() => commit({ installedPj: (installed || []).filter(x => x !== r.pj) })} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 999, padding: "1px 10px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Réafficher</button>}
          </div>)}
        </div>
      </details>;
    })()}
  </div>;
}
