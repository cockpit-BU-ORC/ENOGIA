// v393 (maquette v393-passeport-machine.html, piste B « passeport » validée : « Oui lot 1 ») : Manager › Projets › Machines ORC en trois vues —
// Machines (tableau S/N, chef, pays, état, présence : inchangé), Passeport (une fiche par machine : fil des six phases, prévu / réel /
// écarts, historique), Standards par gamme (éléments suivis, valeur standard, suivi achat / turbines, import du « Tableau configuration
// machines »). Données : planning/machines (passport.js). Lot 1 : le réel se saisit à la main ; Turbines, Achats, Tests et SAV l'écriront ensuite.
import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { T, FZ, btn } from "../theme";
import { getPjMeta, PjPlate } from "../pjMeta";
import { Segmented, tableTh, tableTd, useSheetJS, Pill, NavIcon } from "./SharedUI";
import { askConfirm } from "../confirm";
import { AF } from "../autoFocusOk";
import { useMachines, useProdTurbines, useAchats } from "../useAppData";
import { useProdModel } from "../prodModel";
import { turbineOf } from "../pjDossier";
import { RaiView } from "./RaiView";
import { PhotosView } from "./PhotosView";
import { raiVerdict, RAI_SECTIONS, raiSection } from "../rai";
import { PHASES, PHASE_LABEL, GROUPS, elementsOf, passportRows, phaseProgress, setCfg, setReal, gammeKey, achatScopes, turbLive, liveRows, rowIssue, rowState, parseConfigTable, parseReference, importPlan } from "../passport";

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
  // v397 (lots 2 et 3) : Turbines › Besoins et Achats / Appro sont lus pour remplir le réel du passeport (lecture seule)
  const liveOn = sub === "pass" && !demo, prod = useProdTurbines(liveOn ? true : null, authorName), ach = useAchats(liveOn ? true : null, authorName);
  const prodDoc = demo ? demo.prodDoc : prod.prodDoc, achatsDoc = demo ? demo.achatsDoc : ach.achatsDoc;
  return <div>
    <div className="e-tb" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
      <Segmented label="Vue" size="md" value={sub} onChange={setSub} options={[["pass", "Passeport"], ["liste", "S/N et états"], ["std", "Standards par gamme"]]} />
      {sub !== "liste" && machinesDoc && <span style={{ fontSize: 12, color: T.ink500 }}>Le passeport se remplit à chaque phase : design, appro, fabrication, tests, MES, SAV</span>}
    </div>
    {sub === "liste" ? serie : !machinesDoc ? <div style={{ color: T.ink500, fontSize: FZ.sm, padding: 20 }}>Chargement du passeport…</div>
      : sub === "pass" ? <PassportView prodDoc={prodDoc} achatsDoc={achatsDoc} data={data} doc={machinesDoc} api={machinesApi} canEdit={canEdit} authorName={authorName} />
      : <StandardsView data={data} doc={machinesDoc} api={machinesApi} canEdit={canEdit} authorName={authorName} />}
  </div>;
}

// ── Passeport ───────────────────────────────────────────────────────────────────────────────────────
// v399 (maquette v399-passeport-allege.html, piste A « à traiter » choisie ; audit UI/UX Pro Max, frontend-design, taste) :
// en tête ce qui cloche (réel ≠ prévu, achats en retard ou à commander, valeurs à définir), puis un groupe replié par sous-ensemble
// (avancement + alertes) ; une ligne = élément · prévu · réel · état ; le fil des phases sur une ligne ; liste des machines resserrée.
const curPhase = pp => { const c = pp.find(p => p.total && p.done < p.total); return c ? c.l : "Complet"; };
function PassportView({ data, doc, api, canEdit, authorName, prodDoc, achatsDoc }) {
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE" && !/X{2,}/i.test(r.pj)), [data]);
  const [q, setQ] = useState(""), [scope, setScope] = useState("open"), [sel, setSel] = useState(null), [view, setView] = useState("pp"), [edit, setEdit] = useState(null);
  const list = rows.filter(r => ((scope === "open" ? r.etat !== "SHIPPED" : r.etat === "SHIPPED") || !!q)
    && (!q || (r.pj + " " + (getPjMeta(r.pj, r).nomProjet || "") + " " + (getPjMeta(r.pj, r).numSerie || "")).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => String(a.pj).localeCompare(String(b.pj), "fr", { numeric: true }));
  const r = list.find(x => x.pj === sel) || list[0] || null;
  if (!rows.length) return <div style={{ color: T.ink500 }}>Aucune machine dans le planning.</div>;
  return <div className="enogia-pp" style={{ display: "grid", gridTemplateColumns: "minmax(190px, 210px) minmax(0, 1fr)", gap: 0, background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden", minHeight: 480 }}>
    <nav aria-label="Machines" style={{ borderRight: "1px solid " + T.line, padding: 8, display: "flex", flexDirection: "column", gap: 2, maxHeight: "calc(100dvh - 220px)", overflow: "auto" }}>
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="PJ, client, S/N" aria-label="Rechercher une machine" style={{ ...field(), width: "100%", marginBottom: 4 }} />
      <div style={{ marginBottom: 4 }}><Segmented label="Machines" value={scope} onChange={setScope} options={[["open", "En cours"], ["ship", "Expédiées"]]} /></div>
      {list.map(x => { const on = r && x.pj === r.pj, pp = phaseProgress(doc, x.pj, x.gamme), alert = passportRows(doc, x.pj, x.gamme).some(y => rowIssue(y) && rowIssue(y).tone === "bad");
        return <button key={x.pj} type="button" onClick={() => { setSel(x.pj); setEdit(null); }} aria-current={on ? "true" : undefined} title={getPjMeta(x.pj, x).nomProjet || undefined}
          style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", borderRadius: 8, padding: "6px", background: on ? T.surfaceAlt : "transparent", display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}>
          <PjPlate pj={x.pj} />
          {alert && <span aria-label="alerte" style={{ width: 8, height: 8, borderRadius: 999, background: T.red600, flexShrink: 0 }} />}
          <span style={{ marginLeft: "auto", fontSize: 12, color: T.ink500, whiteSpace: "nowrap" }}>{curPhase(pp)}</span>
        </button>; })}
      {!list.length && <span style={{ fontSize: 13, color: T.ink500, padding: 8 }}>Aucune machine</span>}
    </nav>
    {r && <Passport key={r.pj} data={data} prodDoc={prodDoc} achatsDoc={achatsDoc} r={r} doc={doc} api={api} canEdit={canEdit} authorName={authorName} view={view} setView={setView} edit={edit} setEdit={setEdit} />}
  </div>;
}

function Passport({ r, doc, api, canEdit, authorName, view, setView, edit, setEdit, data, prodDoc, achatsDoc }) {
  const meta = getPjMeta(r.pj, r), mp = metaPlanned(meta), P0 = ((doc.pass || {})[r.pj]) || {};
  // v397 : réel « vivant » — turbines allouées / installées (Turbines › Besoins), état des achats par scope (Achats / Appro)
  const prodM = useProdModel(!!prodDoc);
  const turb = useMemo(() => (prodDoc && prodM ? turbineOf(prodDoc, data || [r], r.pj, x => getPjMeta(x.pj, x), prodM.buildNeeds) : null), [prodDoc, prodM, data, r]);
  const live = useMemo(() => ({ real: turbLive(turb), scopes: achatScopes(achatsDoc, r.pj) }), [turb, achatsDoc, r.pj]);
  const P = { ...P0, real: { ...live.real, ...(P0.real || {}) } }; // pour le RAI : n° des turbines et autres réels vivants
  const rows = liveRows(passportRows(doc, r.pj, r.gamme).map(x => (!x.planned && mp[x.el.id] ? { ...x, planned: mp[x.el.id], fromFiche: true } : x)), live);
  const R = ((doc.rai || {})[r.pj]) || null, rv = raiVerdict(R), photos = ((doc.photos || {})[r.pj]) || [];
  // v394 : le RAI s'insère entre les tests et la MES : contrôles faits + signatures
  const raiTot = RAI_SECTIONS.reduce((n, s) => n + raiSection(R, s).total, 0) + rv.signers, raiDone = RAI_SECTIONS.reduce((n, s) => n + raiSection(R, s).done, 0) + rv.signed;
  const pp0 = phaseProgress(doc, r.pj, r.gamme, live), pp = [...pp0.slice(0, 4), { k: "rai", l: "RAI", total: raiTot, done: raiDone, rai: rv }, ...pp0.slice(4)];
  const todo = rows.map(x => ({ x, i: rowIssue(x) })).filter(y => y.i).sort((a, b) => (a.i.tone === "bad" ? 0 : 1) - (b.i.tone === "bad" ? 0 : 1));
  const [open, setOpen] = useState({});
  const save = async next => { const ok = await api.savePass(r.pj, next); if (ok) setEdit(null); };
  const exportCsv = () => {
    const q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const lines = [["Groupe", "Élément", "Standard " + (gammeKey(doc, r.gamme) || ""), "Prévu", "Réel", "Phase", "Source", "Saisi par", "Le"].map(q).join(";")]
      .concat(rows.map(x => [x.el.group, x.el.label, x.std, x.planned, x.real ? x.real.v : "", x.real ? PHASE_LABEL[x.real.phase] || "" : "", x.real ? x.real.src : "", x.real ? x.real.by : "", x.real ? (x.real.at || "").slice(0, 10) : ""].map(q).join(";")));
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })); a.download = "Passeport " + r.pj + ".csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  const rowProps = { r, doc, canEdit, authorName, edit, setEdit, save };
  const ident = [meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : "", meta.pays, r.gamme, meta.numSerie ? "S/N " + meta.numSerie : ""].filter(Boolean).join(" · ");
  return <section aria-label={"Passeport de " + r.pj} style={{ padding: "16px 20px", minWidth: 0 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: T.ink900 }}>{r.pj}</h2>
      <span style={{ fontSize: 13, color: T.ink500 }}>{ident}</span>
      <span style={{ flex: 1 }} />
      <Segmented label="Contenu du passeport" value={view} onChange={v => { setView(v); setEdit(null); }} options={[["pp", "Passeport"], ["rai", "RAI"], ["photos", "Photos" + (photos.length ? " · " + photos.length : "")], ["hist", "Historique"]]} />
    </div>
    <ol aria-label="Phases" style={{ listStyle: "none", margin: "14px 0 4px", padding: 0, display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 6 }}>
      {pp.map((p, i) => { const full = p.k === "rai" ? p.rai.k === "ok" : !!(p.total && p.done >= p.total), cur = !full && pp.slice(0, i).every(o => (o.k === "rai" ? o.rai.k === "ok" : !o.total || o.done >= o.total));
        const sub = p.k === "rai" ? (p.rai.k === "ok" ? "" : p.rai.k === "reserve" ? "réserves" : p.done ? p.rai.signed + "/" + p.rai.signers : "") : cur && p.total ? p.done + " / " + p.total : "";
        return <li key={p.k} style={{ display: "flex", alignItems: "center", flex: i < pp.length - 1 ? "1 1 auto" : "0 0 auto", minWidth: 0 }}>
          <button type="button" onClick={p.k === "rai" ? () => setView("rai") : undefined} aria-current={cur ? "step" : undefined} title={p.total ? p.done + " / " + p.total + (p.k === "design" ? " définis" : " renseignés") : "rien à renseigner"}
            style={{ all: "unset", cursor: p.k === "rai" ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: full || cur ? T.ink900 : T.ink500, fontWeight: cur ? 600 : 500, whiteSpace: "nowrap" }}>
            <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 999, boxSizing: "border-box", display: "inline-grid", placeItems: "center", fontSize: 10, color: T.onFill, background: full ? T.emerald600 : "transparent", border: "2px solid " + (full ? T.emerald600 : cur ? T.ink900 : T.line) }}>{full ? "✓" : ""}</span>
            {p.l}{sub && <span style={{ fontWeight: 500, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{sub}</span>}
          </button>
          {i < pp.length - 1 && <span aria-hidden="true" style={{ flex: 1, height: 2, minWidth: 12, margin: "0 10px", background: full ? T.emerald600 : T.line }} />}
        </li>; })}
    </ol>
    {view === "photos" ? <div style={{ marginTop: 14 }}><PhotosView pj={r.pj} list={photos} api={api} who={authorName} canEdit={canEdit} /></div>
      : view === "rai" ? <div style={{ marginTop: 14 }}><RaiView photos={photos} r={r} meta={meta} doc={doc} P={P} R={R} saveRai={next => api.saveRai(r.pj, next)} savePass={next => api.savePass(r.pj, next)} canEdit={canEdit} who={authorName} /></div>
      : view === "hist" ? <div style={{ marginTop: 14 }}><History P={P} doc={doc} /></div>
      : <>
        <section aria-label="À traiter" style={{ border: "1px solid " + T.line, borderRadius: 12, margin: "16px 0 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: todo.length ? "1px solid " + T.line : "none" }}>
            <h3 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink900 }}>À traiter</h3>
            {todo.length ? <Pill tone={todo.some(y => y.i.tone === "bad") ? "bad" : "warn"}>{todo.length}</Pill> : <Pill tone="ok">rien</Pill>}
            <span style={{ fontSize: 12, color: T.ink500 }}>{todo.length ? "réel ≠ prévu, achats en retard ou à commander, valeurs à définir" : "pas d'écart ni de retard sur cette machine"}</span>
          </div>
          {todo.map(({ x }) => <PassRow key={x.el.id} x={x} {...rowProps} />)}
        </section>
        {GROUPS.concat([...new Set(rows.map(x => x.el.group))].filter(g => !GROUPS.includes(g))).map(g => { const G = rows.filter(x => x.el.group === g); if (!G.length) return null;
          const done = G.filter(x => (x.el.phase === "design" ? !!x.planned : (x.real && x.real.v) || (x.achatSt && x.achatSt.lines && x.achatSt.livre === x.achatSt.lines))).length, nAl = G.filter(x => rowIssue(x)).length, isOpen = !!open[g];
          return <div key={g} style={{ border: "1px solid " + T.line, borderRadius: 12, marginTop: 8, overflow: "hidden" }}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(o => ({ ...o, [g]: !o[g] }))} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", minHeight: 44 }}>
              <b style={{ fontFamily: T.fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink900 }}>{g}</b>
              <span aria-hidden="true" style={{ width: 90, height: 4, borderRadius: 2, background: T.surfaceAlt, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: Math.round(done / G.length * 100) + "%", background: T.emerald600 }} /></span>
              <span style={{ fontSize: 12, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{done} / {G.length}</span>
              {nAl > 0 && <Pill tone={G.some(x => rowIssue(x) && rowIssue(x).tone === "bad") ? "bad" : "warn"}>{nAl}</Pill>}
              <span className="enogia-nd-chev" data-open={isOpen ? "1" : "0"} style={{ marginLeft: "auto", color: T.ink500, display: "inline-grid" }}><NavIcon name="chevronDown" size={16} /></span>
            </button>
            {isOpen && <div className="enogia-cl-in" style={{ borderTop: "1px solid " + T.line }}>{G.map(x => <PassRow key={x.el.id} x={x} {...rowProps} />)}</div>}
          </div>; })}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, fontSize: 12, color: T.ink500, flexWrap: "wrap" }}>
          <span>Un clic sur une valeur la modifie ; la source d'une valeur réelle s'affiche au survol.</span><span style={{ flex: 1 }} />
          <button type="button" onClick={exportCsv} style={btn("ghost", "sm")}>Exporter (CSV)</button>
        </div>
      </>}
  </section>;
}

// une ligne : élément · prévu · réel · état (44 px, une seule ligne ; détails au survol)
function PassRow({ x, r, doc, canEdit, authorName, edit, setEdit, save }) {
  const k = x.el.id, onP = edit && edit.el === k && edit.what === "p", onR = edit && edit.el === k && edit.what === "r";
  const click = what => canEdit ? () => setEdit(onP && what === "p" ? null : onR && what === "r" ? null : { el: k, what }) : undefined;
  const lid = "pp-opts-" + k, iss = rowIssue(x), st = iss || rowState(x);
  const pTitle = x.fromFiche ? "repris de la fiche projet" : x.dev ? "écart au standard (" + x.std + ")" : x.own ? "propre à la machine" : x.std ? "standard " + (gammeKey(doc, r.gamme) || "") : "";
  const rTitle = x.real && x.real.v ? [PHASE_LABEL[x.real.phase], x.real.src, x.real.by, x.real.at ? x.real.at.slice(8, 10) + "/" + x.real.at.slice(5, 7) : ""].filter(Boolean).join(" · ") : x.el.phase === "design" ? "fixé au design" : "renseigné en " + (PHASE_LABEL[x.el.phase] || "fabrication").toLowerCase();
  const cellBtn = { all: "unset", cursor: canEdit ? "pointer" : "default", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minHeight: 28, display: "flex", alignItems: "center", gap: 6 };
  const toneC = t => (t === "bad" ? T.red600 : t === "warn" ? T.amber600 : t === "ok" ? T.emerald600 : T.ink500);
  return <div className="enogia-pp-row" style={{ display: "grid", gridTemplateColumns: "minmax(140px, 200px) minmax(0, 1fr) minmax(0, 1fr) minmax(120px, auto)", gap: 12, alignItems: "center", padding: "6px 14px", minHeight: 44, borderTop: "1px solid " + T.line, fontSize: 13 }}>
    <span style={{ color: T.ink700 }}>{x.el.label}</span>
    {onP ? <EditBox kind="p" x={x} lid={lid} onCancel={() => setEdit(null)} onSave={v => save(setCfg(doc, r.pj, r.gamme, k, v, authorName))} />
      : <button type="button" onClick={click("p")} disabled={!canEdit} title={pTitle || undefined} aria-label={"Prévu : " + x.el.label + " = " + (x.planned || "non défini") + (canEdit ? ", modifier" : "")} style={cellBtn}>
        {x.planned ? <b style={{ fontWeight: 600, color: T.ink900 }}>{x.planned}</b> : <span style={{ color: T.ink500 }}>—</span>}
        {x.dev && <span style={{ fontSize: 11, fontWeight: 600, color: T.amber600, background: T.amber100, borderRadius: 4, padding: "0 4px" }}>écart</span>}</button>}
    {onR ? <EditBox kind="r" x={x} lid={lid} onCancel={() => setEdit(null)} onSave={(v, ph, src) => save(setReal(doc, r.pj, k, v, ph, src, authorName))} />
      : <button type="button" onClick={click("r")} disabled={!canEdit} title={rTitle} aria-label={"Réel : " + x.el.label + " = " + ((x.real && x.real.v) || "non renseigné") + (canEdit ? ", renseigner" : "")} style={cellBtn}>
        {x.real && x.real.v ? <b style={{ fontWeight: 600, color: x.gap ? T.red600 : T.ink900 }}>{x.real.v}</b> : <span style={{ color: T.ink500 }}>—</span>}</button>}
    <span title={st && st.title ? st.title : undefined} style={{ fontSize: 12, fontWeight: st && st.tone !== "mute" ? 500 : 400, color: st ? toneC(st.tone) : T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st ? st.t : ""}</span>
  </div>;
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

