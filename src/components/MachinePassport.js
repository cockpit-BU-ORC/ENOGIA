// v393 (maquette v393-passeport-machine.html, piste B « passeport » validée : « Oui lot 1 ») : Manager › Projets › Machines ORC en trois vues —
// Machines (tableau S/N, chef, pays, état, présence : inchangé), Passeport (une fiche par machine : fil des six phases, prévu / réel /
// écarts, historique), Standards par gamme (éléments suivis, valeur standard, suivi achat / turbines, import du « Tableau configuration
// machines »). Données : planning/machines (passport.js). Lot 1 : le réel se saisit à la main ; Turbines, Achats, Tests et SAV l'écriront ensuite.
import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { T, FZ, btn } from "../theme";
import { getPjMeta, PjPlate, ETAT_META } from "../pjMeta";
import { Segmented, tableTh, tableTd, useSheetJS, Pill } from "./SharedUI";
import { askConfirm } from "../confirm";
import { AF } from "../autoFocusOk";
import { useMachines } from "../useAppData";
import { RaiView } from "./RaiView";
import { PhotosView } from "./PhotosView";
import { raiVerdict, RAI_SECTIONS, raiSection } from "../rai";
import { PHASES, PHASE_LABEL, GROUPS, elementsOf, passportRows, phaseProgress, setCfg, setReal, gammeKey, parseConfigTable, parseReference, importPlan } from "../passport";

const field = () => ({ padding: "4px 8px", minHeight: 32, borderRadius: 8, border: "1px solid " + T.fieldLine, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box" });
const fdt = iso => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " + new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");
const LS = "enogia_mach_sub";
// Valeurs prévues des turbines encore saisies dans la fiche projet (lot 2 : elles passent dans le passeport)
const metaPlanned = meta => ({ injecteur: meta.turbInj || "", roue: meta.turbRoue || "", bouchages: meta.turbInjB != null && meta.turbInjB !== "" ? String(meta.turbInjB) : "" });

// galerie ?demo : passeport en mémoire, jamais lu ni écrit dans Firestore
export const MachinesDemoCtx = createContext(null);
export function MachinesHub({ data, canEdit, authorName, serie }) {
  const [sub, setSubS] = useState(() => { try { return localStorage.getItem(LS) || "pass"; } catch (e) { return "pass"; } });
  const setSub = v => { setSubS(v); try { localStorage.setItem(LS, v); } catch (e) { /* stockage indisponible */ } };
  const demo = useContext(MachinesDemoCtx), live = useMachines(sub !== "liste" && !demo, authorName);
  const { machinesDoc, machinesApi } = demo || live;
  return <div>
    <div className="e-tb" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
      <Segmented label="Vue" size="md" value={sub} onChange={setSub} options={[["pass", "Passeport"], ["liste", "S/N et états"], ["std", "Standards par gamme"]]} />
      {sub !== "liste" && machinesDoc && <span style={{ fontSize: 12, color: T.ink500 }}>Le passeport se remplit à chaque phase : design, appro, fabrication, tests, MES, SAV</span>}
    </div>
    {sub === "liste" ? serie : !machinesDoc ? <div style={{ color: T.ink500, fontSize: FZ.sm, padding: 20 }}>Chargement du passeport…</div>
      : sub === "pass" ? <PassportView data={data} doc={machinesDoc} api={machinesApi} canEdit={canEdit} authorName={authorName} />
      : <StandardsView data={data} doc={machinesDoc} api={machinesApi} canEdit={canEdit} authorName={authorName} />}
  </div>;
}

// ── Passeport ───────────────────────────────────────────────────────────────────────────────────────
function PassportView({ data, doc, api, canEdit, authorName }) {
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE" && !/X{2,}/i.test(r.pj)), [data]);
  const [q, setQ] = useState(""), [scope, setScope] = useState("open"), [sel, setSel] = useState(null), [phase, setPhase] = useState(null), [view, setView] = useState("pp"), [edit, setEdit] = useState(null);
  const list = rows.filter(r => (scope === "all" || (scope === "open" ? r.etat !== "SHIPPED" : r.etat === "SHIPPED"))
    && (!q || (r.pj + " " + (getPjMeta(r.pj, r).nomProjet || "") + " " + (getPjMeta(r.pj, r).numSerie || "")).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => String(a.pj).localeCompare(String(b.pj), "fr", { numeric: true }));
  const r = list.find(x => x.pj === sel) || list[0] || null;
  if (!rows.length) return <div style={{ color: T.ink500 }}>Aucune machine dans le planning.</div>;
  return <div className="enogia-pp" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 250px) minmax(0, 1fr)", gap: 0, background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden", minHeight: 560 }}>
    <nav aria-label="Machines" style={{ borderRight: "1px solid " + T.line, padding: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100dvh - 220px)", overflow: "auto" }}>
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="PJ, client, S/N" aria-label="Rechercher une machine" style={{ ...field(), width: "100%" }} />
      <Segmented label="Machines" value={scope} onChange={setScope} options={[["open", "En cours"], ["ship", "Expédiées"], ["all", "Toutes"]]} />
      {list.map(x => { const pp = phaseProgress(doc, x.pj, x.gamme), on = r && x.pj === r.pj, meta = getPjMeta(x.pj, x);
        return <button key={x.pj} type="button" onClick={() => { setSel(x.pj); setEdit(null); }} aria-current={on ? "true" : undefined}
          style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", borderRadius: 8, padding: "6px 6px", background: on ? T.surfaceAlt : "transparent", display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "3px 8px", alignItems: "center", minHeight: 44 }}>
          <PjPlate pj={x.pj} />
          <span style={{ fontSize: 13, color: T.ink700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : x.gamme}</span>
          <span aria-label={pp.map(p => p.l + " " + p.done + "/" + p.total).join(", ")} style={{ gridColumn: 2, display: "flex", gap: 2 }}>{pp.map(p => <i key={p.k} style={{ flex: 1, height: 4, borderRadius: 2, background: p.total && p.done >= p.total ? T.emerald600 : p.done ? T.info600 : T.line }} />)}</span>
        </button>; })}
      {!list.length && <span style={{ fontSize: 13, color: T.ink500, padding: 8 }}>Aucune machine</span>}
    </nav>
    {r && <Passport key={r.pj} r={r} doc={doc} api={api} canEdit={canEdit} authorName={authorName} phase={phase} setPhase={setPhase} view={view} setView={setView} edit={edit} setEdit={setEdit} />}
  </div>;
}

function Passport({ r, doc, api, canEdit, authorName, phase, setPhase, view, setView, edit, setEdit }) {
  const meta = getPjMeta(r.pj, r), mp = metaPlanned(meta), P = ((doc.pass || {})[r.pj]) || {};
  const rows = passportRows(doc, r.pj, r.gamme).map(x => (!x.planned && mp[x.el.id] ? { ...x, planned: mp[x.el.id], fromFiche: true } : x));
  const R = ((doc.rai || {})[r.pj]) || null, rv = raiVerdict(R), photos = ((doc.photos || {})[r.pj]) || [];
  // v394 : le RAI s'insère entre les tests et la MES : contrôles faits + signatures
  const raiTot = RAI_SECTIONS.reduce((n, s) => n + raiSection(R, s).total, 0) + rv.signers, raiDone = RAI_SECTIONS.reduce((n, s) => n + raiSection(R, s).done, 0) + rv.signed;
  const pp0 = phaseProgress(doc, r.pj, r.gamme), pp = [...pp0.slice(0, 4), { k: "rai", l: "RAI", total: raiTot, done: raiDone, rai: rv }, ...pp0.slice(4)], shown = phase && phase !== "rai" ? rows.filter(x => (phase === "design" ? true : x.el.phase === phase)) : rows;
  const devN = rows.filter(x => x.dev).length, gapN = rows.filter(x => x.gap).length;
  const save = async next => { const ok = await api.savePass(r.pj, next); if (ok) setEdit(null); };
  const exportCsv = () => {
    const q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const lines = [["Groupe", "Élément", "Standard " + (gammeKey(doc, r.gamme) || ""), "Prévu", "Réel", "Phase", "Source", "Saisi par", "Le"].map(q).join(";")]
      .concat(rows.map(x => [x.el.group, x.el.label, x.std, x.planned, x.real ? x.real.v : "", x.real ? PHASE_LABEL[x.real.phase] || "" : "", x.real ? x.real.src : "", x.real ? x.real.by : "", x.real ? (x.real.at || "").slice(0, 10) : ""].map(q).join(";")));
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })); a.download = "Passeport " + r.pj + ".csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  const em = ETAT_META[r.etat] || {};
  return <section aria-label={"Passeport de " + r.pj} style={{ padding: "14px 18px", minWidth: 0 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: T.ink900 }}>{r.pj}</h2>
      <span style={{ fontSize: 14, color: T.ink500 }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}{meta.pays ? " · " + meta.pays : ""}</span>
      <Pill tone="info">{r.gamme || "gamme ?"}</Pill>
      {meta.numSerie && <span style={{ fontFamily: T.fontMono, fontSize: 13, color: T.ink500 }}>S/N {meta.numSerie}</span>}
      {em.label && <Pill tone="neutral">{em.label}</Pill>}
      <span style={{ flex: 1 }} />
      {devN > 0 && <span style={{ fontSize: 12, color: T.amber600, fontWeight: 500 }}>{devN} écart{devN > 1 ? "s" : ""} au standard</span>}
      {gapN > 0 && <span style={{ fontSize: 12, color: T.red600, fontWeight: 500 }}>{gapN} réel{gapN > 1 ? "s" : ""} ≠ prévu</span>}
      <button type="button" onClick={exportCsv} style={btn("sec", "sm")}>Exporter (CSV)</button>
    </div>
    <div role="group" aria-label="Phases du passeport" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4, margin: "14px 0 8px" }} className="enogia-pp-phases">
      {pp.map(p => { const on = phase === p.k, full = p.total && p.done >= p.total, pct = p.total ? Math.round(p.done / p.total * 100) : 0;
        return <button key={p.k} type="button" aria-pressed={on} onClick={() => { if (p.k === "rai") { setView("rai"); setPhase(null); return; } setPhase(on ? null : p.k); if (view === "rai") setView("pp"); }}
          style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "flex", flexDirection: "column", gap: 3, padding: "8px 10px", borderRadius: 8, minWidth: 0, minHeight: 44,
            border: on ? "2px solid " + T.ink900 : "1px solid " + (full ? "transparent" : T.line), background: full ? T.emerald100 : T.card }}>
          <b style={{ fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 600, color: T.ink900 }}>{p.l}</b>
          {p.rai ? <span style={{ fontSize: 12, fontWeight: 500, color: p.rai.k === "ok" ? T.emerald600 : p.rai.k === "reserve" ? T.amber600 : T.ink500 }}>{p.rai.k === "ok" ? "acceptée" : p.rai.k === "reserve" ? "avec réserves" : p.done ? "en cours · " + p.rai.signed + "/" + p.rai.signers + " sign." : "à faire"}</span> : <span style={{ fontSize: 12, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{p.total ? p.done + " / " + p.total + (p.k === "design" ? " définis" : " renseignés") : "rien à renseigner"}</span>}
          <span aria-hidden="true" style={{ height: 5, borderRadius: 2, background: T.surfaceAlt, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: pct + "%", background: T.emerald600 }} /></span>
        </button>; })}
    </div>
    <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "6px 0 10px", flexWrap: "wrap" }}>
      <Segmented label="Contenu" value={view} onChange={setView} options={[["pp", "Passeport · " + rows.length], ["rai", "RAI · " + rv.label.toLowerCase()], ["photos", "Photos · " + photos.length], ["hist", "Historique · " + (P.hist || []).length]]} />
      {phase && <span style={{ fontSize: 12, color: T.ink500 }}>Éléments renseignés à la phase {PHASE_LABEL[phase]} · <button type="button" onClick={() => setPhase(null)} style={{ ...btn("ghost", "sm"), minHeight: 24 }}>Tout afficher</button></span>}
    </div>
    {view === "photos" ? <PhotosView pj={r.pj} list={photos} api={api} who={authorName} canEdit={canEdit} />
      : view === "rai" ? <RaiView photos={photos} r={r} meta={meta} doc={doc} P={P} R={R} saveRai={next => api.saveRai(r.pj, next)} savePass={next => api.savePass(r.pj, next)} canEdit={canEdit} who={authorName} />
      : view === "hist" ? <History P={P} doc={doc} />
      : <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr><th style={{ ...tableTh(), width: 200 }}>Élément</th><th style={tableTh()}>Prévu (design)</th><th style={tableTh()}>Réel sur la machine</th></tr></thead>
        <tbody>{GROUPS.concat([...new Set(shown.map(x => x.el.group))].filter(g => !GROUPS.includes(g))).map(g => { const G = shown.filter(x => x.el.group === g); if (!G.length) return null;
          return <React.Fragment key={g}><tr><td colSpan={3} style={{ ...tableTd({ h: 30 }), background: T.surfaceAlt, fontSize: 12, fontWeight: 600, color: T.ink700 }}>{g}</td></tr>
            {G.map(x => <PassRow key={x.el.id} x={x} r={r} doc={doc} P={P} canEdit={canEdit} authorName={authorName} edit={edit} setEdit={setEdit} save={save} />)}</React.Fragment>; })}</tbody>
      </table>}
    {view === "pp" && <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: T.ink500, marginTop: 10 }}>
      <span><span style={{ background: T.amber100, color: T.amber600, fontWeight: 600, borderRadius: 4, padding: "0 4px" }}>surligné</span> écart au standard de la gamme</span>
      <span><span style={{ color: T.red600, fontWeight: 600 }}>réel ≠ prévu</span> en rouge</span>
      <span>Chaque valeur réelle porte sa phase, sa source et son auteur</span>
    </div>}
  </section>;
}

function PassRow({ x, r, doc, P, canEdit, authorName, edit, setEdit, save }) {
  const k = x.el.id, onP = edit && edit.el === k && edit.what === "p", onR = edit && edit.el === k && edit.what === "r";
  const cell = { ...tableTd({ h: 40 }), verticalAlign: "top" };
  const click = what => canEdit ? () => setEdit(onP && what === "p" ? null : onR && what === "r" ? null : { el: k, what }) : undefined;
  const lid = "pp-opts-" + k;
  return <tr>
    <td style={{ ...cell, color: T.ink900, fontWeight: 500 }}>{x.el.label}{x.el.turb && <span style={{ marginLeft: 6, fontSize: 11, color: T.info600 }}>turbines</span>}{x.el.achat && <span style={{ marginLeft: 6, fontSize: 11, color: T.violet600 }}>achat</span>}</td>
    <td style={cell}>{onP ? <EditBox kind="p" x={x} lid={lid} onCancel={() => setEdit(null)} onSave={v => save(setCfg(doc, r.pj, r.gamme, k, v, authorName))} />
      : <button type="button" onClick={click("p")} disabled={!canEdit} aria-label={"Prévu : " + x.el.label + (canEdit ? ", modifier" : "")} style={{ all: "unset", cursor: canEdit ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 1, minWidth: 0, minHeight: 28 }}>
        {x.planned ? <span><b style={{ fontWeight: 600, color: T.ink900, ...(x.dev ? { background: T.amber100, color: T.amber600, borderRadius: 4, padding: "0 4px" } : null) }}>{x.planned}</b></span> : <span style={{ color: T.ink500 }}>{canEdit ? "à définir" : "—"}</span>}
        <span style={{ fontSize: 11, color: T.ink500 }}>{x.fromFiche ? "fiche projet" : x.dev ? "standard : " + x.std : x.own ? "propre à la machine" : x.std ? "standard " + (gammeKey(doc, r.gamme) || "") : ""}</span></button>}</td>
    <td style={cell}>{onR ? <EditBox kind="r" x={x} lid={lid} onCancel={() => setEdit(null)} onSave={(v, ph, src) => save(setReal(doc, r.pj, k, v, ph, src, authorName))} />
      : <button type="button" onClick={click("r")} disabled={!canEdit} aria-label={"Réel : " + x.el.label + (canEdit ? ", renseigner" : "")} style={{ all: "unset", cursor: canEdit ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 1, minWidth: 0, minHeight: 28 }}>
        {x.real && x.real.v ? <span><b style={{ fontWeight: 600, color: x.gap ? T.red600 : T.ink900 }}>{x.real.v}</b>{x.gap && <span style={{ fontSize: 12, color: T.red600, marginLeft: 6 }}>≠ prévu</span>}</span>
          : <span style={{ color: T.ink500 }}>{x.el.phase === "design" ? "fixé au design" : "renseigné en " + (PHASE_LABEL[x.el.phase] || "fabrication").toLowerCase()}</span>}
        {x.real && x.real.v && <span style={{ fontSize: 11, color: T.ink500 }}>{[PHASE_LABEL[x.real.phase], x.real.src, x.real.by, x.real.at ? x.real.at.slice(8, 10) + "/" + x.real.at.slice(5, 7) : ""].filter(Boolean).join(" · ")}</span>}</button>}</td>
  </tr>;
}

function EditBox({ kind, x, lid, onSave, onCancel }) {
  const [v, setV] = useState(kind === "p" ? x.planned || "" : (x.real && x.real.v) || ""), [ph, setPh] = useState((x.real && x.real.phase) || x.el.phase || "fab"), [src, setSrc] = useState((x.real && x.real.src) || "");
  const ok = () => (kind === "p" ? onSave(v) : onSave(v, ph, src));
  const key = e => { if (e.key === "Enter") { e.preventDefault(); ok(); } else if (e.key === "Escape") onCancel(); };
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
    <input autoFocus={AF} list={lid} value={v} onChange={e => setV(e.target.value)} onKeyDown={key} aria-label={(kind === "p" ? "Prévu" : "Réel") + " : " + x.el.label} style={{ ...field(), width: 170 }} />
    <datalist id={lid}>{[...new Set([x.std, ...(x.el.opts || [])].filter(Boolean))].map(o => <option key={o} value={o} />)}</datalist>
    {kind === "r" && <><select value={ph} onChange={e => setPh(e.target.value)} aria-label="Phase" style={field()}>{PHASES.filter(p => p[0] !== "design").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <input value={src} onChange={e => setSrc(e.target.value)} onKeyDown={key} placeholder="Source : PO, S/N, intervention…" aria-label="Source" style={{ ...field(), width: 200 }} /></>}
    <button type="button" onClick={ok} style={btn("pri", "sm")}>Enregistrer</button>
    <button type="button" onClick={onCancel} style={btn("ghost", "sm")}>Annuler</button>
    {kind === "p" && x.std && <span style={{ fontSize: 11, color: T.ink500 }}>vide = standard ({x.std})</span>}
  </div>;
}

function History({ P, doc }) {
  const L = P.hist || [], lab = Object.fromEntries(elementsOf(doc).map(e => [e.id, e.label]));
  if (!L.length) return <div style={{ color: T.ink500, fontSize: FZ.sm, padding: "10px 0" }}>Rien d'écrit pour l'instant : chaque modification du passeport s'ajoute ici, avec sa phase et son auteur.</div>;
  return <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>{L.map((h, i) => <li key={i} style={{ display: "grid", gridTemplateColumns: "120px 100px minmax(0,1fr)", gap: 10, padding: "8px 0", borderBottom: "1px solid " + T.line, fontSize: 13, alignItems: "baseline" }}>
    <span style={{ color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{fdt(h.at)}</span>
    <span><Pill tone={h.phase === "design" ? "ok" : h.phase === "appro" ? "warn" : h.phase === "sav" ? "bad" : "info"}>{PHASE_LABEL[h.phase] || h.phase}</Pill></span>
    <span style={{ color: T.ink900 }}>{h.el === "*" ? h.to : <><b style={{ fontWeight: 600 }}>{lab[h.el] || h.el}</b> ({h.k}) : {h.from ? <span style={{ color: T.ink500 }}>{h.from} → </span> : null}{h.to || <span style={{ color: T.ink500 }}>effacé</span>}</>}{h.by ? <span style={{ color: T.ink500 }}> · {h.by}</span> : null}</span>
  </li>)}</ol>;
}

// ── Standards par gamme ──────────────────────────────────────────────────────────────────────────────
function StandardsView({ data, doc, api, canEdit, authorName }) {
  const els = elementsOf(doc), S = doc.standards || {};
  const gammes = [...new Set([...Object.keys(S), ...(data || []).map(r => r.gamme).filter(Boolean).map(g => gammeKey(doc, g))])].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  const [g, setG] = useState(() => gammes[0] || ""), cur = S[g] || {};
  const rows = (data || []).filter(r => r && r.pj && gammeKey(doc, r.gamme) === g);
  const devCount = id => rows.filter(r => { const c = (((doc.pass || {})[r.pj] || {}).cfg || {})[id]; return c != null && c !== "" && String(c) !== String(cur[id] || ""); }).length;
  const setStd = async (id, v) => { const nx = { ...S, [g]: { ...cur } }; if (String(v || "").trim()) nx[g][id] = String(v).trim(); else delete nx[g][id]; await api.saveStandards(nx); };
  const setEl = async (id, patch) => { await api.saveElements(els.map(e => (e.id === id ? { ...e, ...patch } : e))); };
  const addEl = async () => { const id = "el" + Date.now().toString(36); await api.saveElements([...els, { id, group: "Auxiliaires", label: "Nouvel élément", opts: [], phase: "fab", achat: false, scope: "", turb: false }]); };
  return <div>
    <div className="e-tb" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: T.ink500 }}>Gamme</span>
      <div role="group" aria-label="Gamme" style={{ display: "inline-flex", flexWrap: "wrap", background: T.surfaceAlt, borderRadius: 8, padding: 2, gap: 2 }}>
        <Segmented bare label="Gamme" value={g} onChange={setG} options={gammes.map(x => [x, x])} /></div>
      <span style={{ flex: 1 }} />
      {canEdit && <button type="button" onClick={addEl} style={btn("sec", "sm")}>＋ Élément</button>}
      {canEdit && <ConfigImport doc={doc} api={api} authorName={authorName} />}
    </div>
    <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
        <thead><tr><th style={tableTh()}>Élément</th><th style={tableTh()}>Standard {g}</th><th style={tableTh()}>Choix possibles</th><th style={tableTh()}>Phase du réel</th><th style={tableTh()}>Suivi achat · scope</th><th style={tableTh()}>Suivi turbines</th><th style={tableTh({ num: true })}>Machines en écart</th></tr></thead>
        <tbody>{GROUPS.concat([...new Set(els.map(e => e.group))].filter(x => !GROUPS.includes(x))).map(grp => { const G = els.filter(e => e.group === grp); if (!G.length) return null;
          return <React.Fragment key={grp}><tr><td colSpan={7} style={{ ...tableTd({ h: 30 }), background: T.surfaceAlt, fontSize: 12, fontWeight: 600, color: T.ink700 }}>{grp}</td></tr>
            {G.map(e => <tr key={e.id}>
              <td style={tableTd()}>{canEdit ? <TextCell value={e.label} onSave={v => v && setEl(e.id, { label: v })} label={"Nom de l'élément " + e.label} w={190} /> : e.label}</td>
              <td style={tableTd()}>{canEdit ? <TextCell value={cur[e.id] || ""} list={"std-" + e.id} opts={e.opts} onSave={v => setStd(e.id, v)} label={"Standard " + g + " : " + e.label} w={150} placeholder="—" /> : cur[e.id] || "—"}</td>
              <td style={tableTd()}>{canEdit ? <TextCell value={(e.opts || []).join(", ")} onSave={v => setEl(e.id, { opts: v.split(",").map(s => s.trim()).filter(Boolean) })} label={"Choix possibles : " + e.label} w={220} placeholder="séparés par des virgules" /> : (e.opts || []).join(", ")}</td>
              <td style={tableTd()}><select disabled={!canEdit} value={e.phase} onChange={ev => setEl(e.id, { phase: ev.target.value })} aria-label={"Phase du réel : " + e.label} style={field()}>{PHASES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
              <td style={tableTd()}><label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="checkbox" disabled={!canEdit} checked={!!e.achat} onChange={ev => setEl(e.id, { achat: ev.target.checked })} aria-label={"Suivi achat : " + e.label} />{e.achat && (canEdit ? <TextCell value={e.scope || ""} onSave={v => setEl(e.id, { scope: v })} label={"Scope Achats : " + e.label} w={150} placeholder="scope Achats" /> : <span>{e.scope}</span>)}</label></td>
              <td style={tableTd()}><input type="checkbox" disabled={!canEdit} checked={!!e.turb} onChange={ev => setEl(e.id, { turb: ev.target.checked })} aria-label={"Suivi turbines : " + e.label} /></td>
              <td style={tableTd({ num: true })}>{devCount(e.id) || <span style={{ color: T.ink500 }}>0</span>}</td>
            </tr>)}</React.Fragment>; })}</tbody>
      </table>
    </div>
    <p style={{ fontSize: 12, color: T.ink500, maxWidth: "90ch" }}>Le standard s'applique à toutes les machines de la gamme ; une machine n'enregistre que ses écarts. « Suivi achat » et « Suivi turbines » préparent les liens avec Achats / Appro et Turbines (lots suivants).</p>
  </div>;
}
function TextCell({ value, onSave, label, w, list, opts, placeholder }) {
  const [v, setV] = useState(value), last = useRef(value);
  if (last.current !== value) { last.current = value; if (v !== value) setV(value); }
  return <><input value={v} list={list} placeholder={placeholder} onChange={e => setV(e.target.value)} onBlur={() => { if (v !== value) onSave(v); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") { setV(value); e.currentTarget.blur(); } }} aria-label={label} style={{ ...field(), width: w }} />
    {list && <datalist id={list}>{(opts || []).map(o => <option key={o} value={o} />)}</datalist>}</>;
}

// Import du « Tableau configuration machines » (export Excel, onglets Tableau et Référence) : aperçu, puis enregistrement.
// Rien de ce qui a déjà été saisi dans le Cockpit n'est écrasé.
function ConfigImport({ doc, api, authorName }) {
  const ready = useSheetJS(), ref = useRef(null), [msg, setMsg] = useState("");
  const pick = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const wb = window.XLSX.read(await f.arrayBuffer(), { type: "array" });
      const sheet = n => { const k = wb.SheetNames.find(x => x.toLowerCase().replace(/é/g, "e").startsWith(n)); return k ? window.XLSX.utils.sheet_to_json(wb.Sheets[k], { header: 1, defval: "" }) : []; };
      const table = parseConfigTable(sheet("tableau")), reference = parseReference(sheet("reference"));
      const plan = importPlan(doc, table, reference, authorName);
      const nM = Object.keys(table.machines).length;
      if (!nM && !Object.keys(reference).length) { setMsg("Aucun onglet « Tableau » ni « Référence » reconnu dans ce fichier."); return; }
      const ok = await askConfirm({ title: "Importer le tableau de configuration ?", confirmLabel: "Importer",
        message: nM + " machine" + (nM > 1 ? "s" : "") + " lue" + (nM > 1 ? "s" : "") + ", " + plan.nVals + " valeur" + (plan.nVals > 1 ? "s" : "") + " à reprendre sur " + plan.nPj + " passeport" + (plan.nPj > 1 ? "s" : "") + " ; " + Object.keys(reference).length + " standard" + (Object.keys(reference).length > 1 ? "s" : "") + " de gamme (" + plan.nStd + " complété" + (plan.nStd > 1 ? "s" : "") + "). Ce qui est déjà saisi dans le Cockpit n'est pas écrasé." + (table.unknown.length ? " Colonnes non reprises : " + table.unknown.slice(0, 6).join(", ") + "." : "") });
      if (!ok) return;
      const done = await api.saveImport(plan.pass, plan.standards);
      setMsg(done ? "Import terminé : " + plan.nVals + " valeurs reprises" : "L'import n'a pas été enregistré");
    } catch (x) { setMsg("Import impossible : " + (x && x.message)); }
  };
  return <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
    <button type="button" disabled={!ready} onClick={() => ref.current && ref.current.click()} title="Export Excel du Google Sheets « Tableau configuration machines » (onglets Tableau et Référence)" style={btn("sec", "sm")}>Importer le tableau de configuration (Excel)</button>
    <input ref={ref} type="file" accept=".xlsx,.xls" aria-label="Fichier Excel du tableau de configuration" style={{ display: "none" }} onChange={pick} />
    {msg && <span role="status" style={{ fontSize: 12, color: /impossible|Aucun|pas été/.test(msg) ? T.red600 : T.emerald600, fontWeight: 500 }}>{msg}</span>}
  </span>;
}

