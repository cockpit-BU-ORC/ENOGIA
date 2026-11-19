// v404 (maquette maquettes-design/v407-passeport-complet.html validée : « Go, code-la » ; « gardons au max l'effet passeport : la page ne
// défile que vers le bas ») : le passeport complet d'une machine, sur une seule page qui se lit de haut en bas — arrivée dans l'outil, design
// (infos client), appro / achats, fabrication et turbine (avec la fiche de lancement de fab), tests, RAI, départ, MES et SAV, photos, historique.
// Chaque valeur porte sa source ; seul ce que le CdP du PJ (ou un admin) écrit est enregistré (machines.launch[PJ]) : le reste est lu
// dans sa page (fiche projet, planning, Achats / Appro, Turbines, fiche de tests, SAV) et recalculé à l'affichage.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, btn } from "../theme";
import { getPjMeta, chefsOf, orcChefsOf, plannedSnOf } from "../pjMeta";
import { Pill, NavIcon, notify } from "./SharedUI";
import { AF } from "../autoFocusOk";
import { smooth } from "../scrollMode";
import { contractDatesOf, livrPrevueOf } from "../penalties";
import { useProdModel } from "../prodModel";
import { turbineOf, achatsOf, ACHAT_ST } from "../pjDossier";
import { testsLive, savLive } from "../passportLive";
import { achatScopes, turbLive, gammeKey, stdOf, elementsOf, PHASE_LABEL, passportRows, liveRows } from "../passport";
import { raiVerdict } from "../rai";
import { RaiView } from "./RaiView";
import { PhotosView } from "./PhotosView";
import { dossierHtml } from "../dossierMachine";
import { NR, HOLES, SIGN_ROLES, ELEC_LABEL, DESIGN_FIELDS, QUALITY, activeComponents, elecListsOf, dimsOf, launchOf, plugsOf, plugCount, refOf, offRef,
  setLaunch, signLaunch, sortOpts, launchState, piecesArrived, achatOfComp, PASS_PHASES, phaseOfEtat, launchHtml } from "../launchFab";

const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(0, 4) : "");
const fdt = iso => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " + new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");
const has = v => v != null && String(v).trim() !== "";
const FAB = "Fiche de lancement de fab";
const ACH_LABEL = Object.fromEntries(ACHAT_ST);
// pastilles de source (d'où vient la valeur)
const SRC = () => ({ fp: [T.amber100, T.amber600], fl: [T.emerald100, T.emerald600], cdp: [T.surfaceAlt, T.ink700], ach: [T.accentSoft, T.accentInk],
  tur: [T.violet100, T.violet600], ts: [T.info100, T.info600], sav: [T.surfaceAlt, T.ink700], plan: [T.surfaceAlt, T.ink700] });
export function Src({ k, children }) { const [bg, ink] = SRC()[k] || SRC().plan; return <Pill bg={bg} ink={ink}>{children}</Pill>; }

// ── briques ────────────────────────────────────────────────────────────────────────────────────────
function Grid({ children }) { return <div className="pp2-grid">{children}</div>; }
function Cell({ k, v, src, srcK, bad, warn, edit, wide }) {
  return <div className="pp2-cell" style={wide ? { gridColumn: "1 / -1" } : undefined}>
    <span className="pp2-k">{k}</span>
    {edit ? <CellEdit v={v} {...edit} label={k} /> : <span className="pp2-v" data-empty={has(v) ? undefined : "1"} style={bad ? { color: T.red600 } : undefined}>{has(v) ? v : "—"}</span>}
    {warn && <span className="pp2-warn">{warn}</span>}
    {src && <span className="pp2-src"><Src k={srcK}>{src}</Src></span>}
  </div>;
}
// valeur modifiable sur place : des choix à toucher (ou un champ libre), Entrée enregistre, Échap annule
function CellEdit({ v, opts, onSave, canEdit, label, ro }) {
  const [on, setOn] = useState(false), [t, setT] = useState(""), back = useRef(null);
  const close = () => { setOn(false); setTimeout(() => { try { back.current && back.current.focus(); } catch (e) { /* rien */ } }, 0); };
  const pick = async val => { await onSave(val); close(); };
  if (!on) return <button type="button" ref={back} className="pp2-edit" aria-label={label + " : " + (has(v) ? v : "à renseigner") + (canEdit ? ". Modifier" : ". Lecture seule")}
    onClick={() => { if (!canEdit) { ro(); return; } setT(has(v) ? v : ""); setOn(true); }}>
    <span className="pp2-v" data-empty={has(v) ? undefined : "1"}>{has(v) ? v : "À renseigner"}</span>{canEdit && <span className="pp2-pen" aria-hidden="true"><NavIcon name="edit" size={13} /></span>}
  </button>;
  return <div className="pp2-inl enogia-cl-in" role="group" aria-label={"Modifier : " + label} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } }}>
    {(opts || []).length ? <div className="pp2-opts">{sortOpts(opts).map((o, i) => <button key={o} type="button" className="pp2-opt" aria-pressed={v === o} autoFocus={i === 0 ? AF : undefined} onClick={() => pick(v === o ? "" : o)}>{o}</button>)}</div>
      : <input className="pp2-in" autoFocus={AF} value={t} onChange={e => setT(e.target.value)} aria-label={label} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); pick(t.trim()); } }} onBlur={() => { if (t.trim() !== (v || "")) pick(t.trim()); else close(); }} />}
    <button type="button" className="pp2-x" onClick={close} aria-label="Annuler">Annuler</button>
  </div>;
}
// choix à toucher (fiche de lancement de fab) : la référence de la gamme est marquée « réf. » ; « Non requis » pour un composant optionnel
function Choice({ label, value, opts, refV, onPick, canEdit, ro, nr, other }) {
  const [free, setFree] = useState(false), [t, setT] = useState("");
  const list = [...new Set([...(opts || []), ...(refV ? [refV] : []), ...(has(value) && value !== NR ? [value] : [])])];
  const go = v => { if (!canEdit) { ro(); return; } onPick(value === v ? "" : v); };
  return <div className="pp2-opts" role="group" aria-label={label}>
    {list.map(o => <button key={o} type="button" className="pp2-opt" data-ref={o === refV ? "1" : undefined} aria-pressed={value === o} onClick={() => go(o)} aria-label={o + (o === refV ? " (référence de la gamme)" : "")}>{o}{o === refV && <small>réf.</small>}</button>)}
    {nr && <button type="button" className="pp2-opt" data-nr="1" aria-pressed={value === NR} onClick={() => go(NR)}>Non requis</button>}
    {other !== false && (free ? <input className="pp2-in" style={{ width: 160 }} autoFocus={AF} value={t} placeholder="Autre valeur" aria-label={label + " : autre valeur"} onChange={e => setT(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter" && t.trim()) { onPick(t.trim()); setFree(false); setT(""); } if (e.key === "Escape") setFree(false); }} onBlur={() => { if (t.trim()) onPick(t.trim()); setFree(false); setT(""); }} />
      : <button type="button" className="pp2-opt" data-ghost="1" onClick={() => { if (!canEdit) { ro(); return; } setFree(true); }}>Autre…</button>)}
  </div>;
}
function TextField({ label, value, onSave, canEdit, ro, area, placeholder, type }) {
  const [v, setV] = useState(value || ""), last = useRef(value || "");
  if (last.current !== (value || "")) { last.current = value || ""; if (v !== last.current) setV(last.current); }
  const commit = () => { if (v !== (value || "")) onSave(v); };
  const P = { value: v, placeholder, "aria-label": label, readOnly: !canEdit, onFocus: () => { if (!canEdit) ro(); }, onChange: e => setV(e.target.value), onBlur: commit, className: "pp2-in" };
  return area ? <textarea {...P} rows={3} style={{ width: "100%", minHeight: 72, resize: "vertical" }} /> : <input {...P} type={type || "text"} style={{ width: "100%" }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />;
}
function OkNok({ v, onSet, canEdit, ro, label }) {
  const set = x => { if (!canEdit) { ro(); return; } onSet(v === x ? "" : x); };
  return <span className="pp2-okn" role="group" aria-label={"Contrôle : " + label}>
    <button type="button" data-v="ok" aria-pressed={v === "ok"} onClick={() => set("ok")}>OK</button>
    <button type="button" data-v="nok" aria-pressed={v === "nok"} onClick={() => set("nok")}>NOK</button>
  </span>;
}
function LRow({ label, sub, children, ok, okLabel }) {
  return <div className="pp2-lrow"><span className="pp2-lab">{label}{sub && <small>{sub}</small>}</span><div style={{ minWidth: 0 }}>{children}</div><span>{ok}</span></div>;
}
// injecteur : 8 trous à toucher pour les boucher ; bouchages et ouvertures se calculent seuls
function Ring({ plugs, onToggle, canEdit, ro }) {
  const n = plugs.filter(Boolean).length;
  return <div className="pp2-ring" role="group" aria-label={"Trous de l'injecteur : " + n + " bouché" + (n > 1 ? "s" : "") + " sur " + HOLES}>
    {plugs.map((p, i) => { const a = i / HOLES * 2 * Math.PI - Math.PI / 2;
      return <button key={i} type="button" className="pp2-hole" aria-pressed={p} aria-label={"Trou " + (i + 1) + " : " + (p ? "bouché" : "ouvert")}
        style={{ left: 66 + 52 * Math.cos(a), top: 66 + 52 * Math.sin(a) }} onClick={() => (canEdit ? onToggle(i) : ro())} />; })}
    <span className="pp2-hub">{n} / {HOLES}<br />bouchés</span>
  </div>;
}
function Section({ id, title, sub, right, children }) {
  return <section className="pp2-sec" id={"pp2-" + id} data-ph={id} aria-labelledby={"pp2-h-" + id}>
    <div className="pp2-sh"><h3 id={"pp2-h-" + id}>{title}</h3>{sub && <span className="pp2-sub">{sub}</span>}<span style={{ flex: 1 }} />{right}</div>
    {children}
  </section>;
}

// ── fiche de lancement de fab (dans la phase Fabrication, rubriques l'une sous l'autre) ──────────────────────────
// v408 : only = une rubrique seule (feuillet ouvert du passeport en livre : gen, desc, fab, tur, comp, qual, log, val)
export function LaunchSheet({ L, saveL, canL, ro, gk, doc, info, ready, comps, scopes, authorName, only }) {
  const show = k => !only || only === k;
  const st = launchState(L), [open, setOpen] = useState(!st.launched);
  const lists = elecListsOf(doc), dims = dimsOf(doc, gk), std = stdOf(doc, info.gamme), els = Object.fromEntries(elementsOf(doc).map(e => [e.id, e]));
  const t = L.txt || {}, ok = L.ok || {}, design = L.design || {}, elec = L.elec || {}, inj = L.inj || {}, cv = L.comps || {}, plugs = plugsOf(L), n = plugCount(L);
  const okN = (id, lab) => <OkNok v={ok[id]} label={lab} canEdit={canL} ro={ro} onSet={x => saveL("ok." + id, x)} />;
  const txt = (id, lab, area, ph) => <TextField label={lab} value={t[id]} area={area} placeholder={ph} canEdit={canL} ro={ro} onSave={v => saveL("txt." + id, v)} />;
  const sub = h => <h4 className="pp2-h4">{h}</h4>;
  const pdf = () => { const w = window.open("", "_blank"); if (!w) return; w.document.open(); w.document.write(launchHtml({ pj: info.pj, gamme: info.gamme, info, L, dims, ready,
    comps: comps.map(c => ({ id: c.id, label: c.label, v: c.kind === "achat" ? (achatOfComp(c, scopes) || {}).st || "" : cv[c.id] === NR ? "Non requis" : cv[c.id] || "" })) })); w.document.close(); };
  return <div className="pp2-launch">
    {!only && <button type="button" className="pp2-lhead" aria-expanded={open} onClick={() => setOpen(o => !o)}>
      <b>{FAB}</b>
      {st.launched ? <Pill tone="ok">Lancée le {fd(st.at)}</Pill> : <Pill tone="warn">Brouillon · {st.signed} / {st.total} signatures</Pill>}
      {ready && <span className="pp2-sub">pièces arrivées {ready.pct} %</span>}
      <span style={{ flex: 1 }} />
      <span className="enogia-nd-chev" data-open={open ? "1" : "0"} style={{ display: "inline-grid", color: T.ink500 }}><NavIcon name="chevronDown" size={16} /></span>
    </button>}
    {(open || only) && <div className="pp2-lbody enogia-cl-in">
      {ready && show("comp") && <div className="pp2-ready">
        <div><span className="pp2-k">Pièces arrivées</span><b className="pp2-big">{ready.pct} %</b></div>
        <div style={{ flex: 1, minWidth: 220 }}><span className="pp2-bar" aria-hidden="true"><i style={{ transform: "scaleX(" + ready.n / ready.t + ")", background: ready.ready ? T.emerald600 : T.amber600 }} /></span>
          <span style={{ fontSize: 13 }}>{ready.n} / {ready.t} lignes de commande livrées{ready.waiting.length ? <> · <span style={{ color: T.amber600 }}>attendu : {ready.waiting.slice(0, 4).map(w => w.numero + (w.livraison ? " (" + fd(w.livraison).slice(0, 5) + ")" : "")).join(", ")}{ready.waiting.length > 4 ? "…" : ""}</span></> : null}</span></div>
        <Pill tone={ready.ready ? "ok" : "warn"}>{ready.ready ? "Prêt à lancer" : "Lancement à risque"}</Pill><Src k="ach">Achats / Appro</Src>
      </div>}
      {show("gen") && <>{!only && sub("Informations générales")}
      <LRow label="Numéro de projet"><span className="pp2-v">{info.pj}</span></LRow>
      <LRow label="Gamme"><span className="pp2-v">{info.gamme || "—"}</span></LRow>
      <LRow label="Date du lancement" ok={okN("date", "date du lancement")}><TextField label="Date du lancement" type="date" value={L.date} canEdit={canL} ro={ro} onSave={v => saveL("date", v)} /></LRow>
      <LRow label="Responsable du lancement"><span className="pp2-v">{info.chef || "—"}</span> <Src k="fp">fiche projet</Src></LRow>
      </>}{show("desc") && <>{!only && sub("Description de la machine")}
      <LRow label="Numéro de série"><span className="pp2-v">{info.sn || "—"}</span></LRow>
      <LRow label="Certification"><span className="pp2-v">{info.certif || "—"}</span> <Src k="fp">fiche projet</Src></LRow>
      <LRow label="Dimensions et poids" sub={"gamme " + (gk || "—")}>{dims ? <div className="pp2-dims">{[["Longueur", dims.L], ["Largeur", dims.l], ["Hauteur", dims.H], ["Poids", dims.P]].map(([k, v]) => <div key={k}><span className="pp2-k">{k}</span><b>{v || "—"}</b></div>)}</div>
        : <span className="pp2-sub">pas encore réglées pour cette gamme (Réglages du passeport)</span>}</LRow>
      <LRow label="Spécifications techniques particulières" sub="matériaux, environnement" ok={okN("spec", "spécifications")}>{txt("spec", "Spécifications techniques particulières", true)}</LRow>
      {["neutre", "freq", "tension"].map(k => <LRow key={k} label={ELEC_LABEL[k]} ok={k === "neutre" ? okN("elec", "spécifications électriques") : null}><Choice label={ELEC_LABEL[k]} value={elec[k]} opts={lists[k]} canEdit={canL} ro={ro} onPick={v => saveL("elec." + k, v)} /></LRow>)}
      {DESIGN_FIELDS.filter(f => f.opts.length).map(f => <LRow key={f.id} label={f.label}><Choice label={f.label} value={design[f.id]} opts={f.opts} other={false} canEdit={canL} ro={ro} onPick={v => saveL("design." + f.id, v)} /></LRow>)}
      <LRow label="Autre">{txt("descAutre", "Autre (description)", true)}</LRow>
      </>}{show("fab") && <>{!only && sub("Données de fabrication")}
      <LRow label="Plan / nomenclature validée (BOM)" ok={okN("bom", "BOM")}>{txt("bom", "Plan / nomenclature validée (BOM)", true, "plan châssis, schéma électrique…")}</LRow>
      <LRow label="P&ID" ok={okN("pid", "P&ID")}><TextField label="P&ID" value={design.pid} canEdit={canL} ro={ro} onSave={v => saveL("design.pid", v)} /></LRow>
      <LRow label="Autres modifications" ok={okN("mods", "autres modifications")}>{txt("mods", "Autres modifications", true)}</LRow>
      <LRow label="Délais de fabrication"><span className="pp2-v">{info.delais || "—"}</span> <Src k="plan">planning</Src></LRow>
      <LRow label="Fichiers à imprimer" ok={okN("print", "fichiers à imprimer")}>{txt("print", "Fichiers à imprimer", true, "sizer, checklist de montage…")}</LRow>
      </>}{show("tur") && <>{!only && sub("Turbine")}
      <LRow label="Roue" sub={std.roue ? "référence " + gk + " : " + std.roue : ""} ok={okN("roue", "roue")}><Choice label="Roue" value={inj.roue} opts={(els.roue || {}).opts} refV={std.roue} canEdit={canL} ro={ro} onPick={v => saveL("inj.roue", v)} />{offRef(inj.roue, std.roue) && <span className="pp2-warn">≠ référence {gk} : {std.roue}</span>}</LRow>
      <LRow label="Injecteur" sub={std.injecteur ? "référence " + gk + " : " + std.injecteur : ""} ok={okN("injecteur", "injecteur")}><Choice label="Injecteur" value={inj.injecteur} opts={(els.injecteur || {}).opts} refV={std.injecteur} canEdit={canL} ro={ro} onPick={v => saveL("inj.injecteur", v)} />{offRef(inj.injecteur, std.injecteur) && <span className="pp2-warn">≠ référence {gk} : {std.injecteur}</span>}</LRow>
      <LRow label="Bouchages de l'injecteur" sub="touchez un trou pour le boucher" ok={okN("bouchages", "bouchages")}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <Ring plugs={plugs} canEdit={canL} ro={ro} onToggle={i => saveL("inj.plugs", plugs.map((p, j) => (j === i ? !p : p)))} />
          <div className="pp2-dims" style={{ flex: 1, minWidth: 200 }}><div><span className="pp2-k">Bouchages</span><b>{n} / {HOLES}</b>{has(std.bouchages) && String(std.bouchages) !== String(n) ? <span className="pp2-warn">≠ référence {gk} : {std.bouchages}</span> : null}</div>
            <div><span className="pp2-k">Ouvertures</span><b>{HOLES - n}</b><span className="pp2-sub">calculé</span></div></div>
        </div></LRow>
      </>}{show("comp") && <>{!only && sub("Composants installés")}
      <div className="pp2-cards">{comps.map(c => { const a = c.kind === "achat" ? achatOfComp(c, scopes) : null, v = cv[c.id], ref = refOf(c, gk);
        if (c.kind === "achat") return <div key={c.id} className="pp2-card" data-set="1"><div className="pp2-ch"><b>{c.label}</b><span style={{ flex: 1 }} /><Src k="ach">Achats{c.scope ? " · " + c.scope : ""}</Src></div>
          {!a ? <span className="pp2-sub">scope Achats à préciser dans les Réglages du passeport</span> : a.none ? <span className="pp2-sub">rien dans Achats / Appro pour ce scope</span>
            : <><span style={{ fontSize: 13 }}><b style={{ fontWeight: 600 }}>{a.pos.join(", ") || "—"}</b> · <span style={{ color: a.bad ? T.red600 : T.ink700 }}>{a.st}</span></span>
              <span className="pp2-bar" aria-hidden="true"><i style={{ transform: "scaleX(" + (a.lines ? a.livre / a.lines : 0) + ")" }} /></span><span className="pp2-sub">{a.livre} / {a.lines} lignes livrées · suivi par Achats, pas de référence</span></>}
          {okN("c-" + c.id, c.label)}</div>;
        return <div key={c.id} className="pp2-card" data-set={has(v) ? "1" : undefined} data-nr={v === NR ? "1" : undefined}>
          <div className="pp2-ch"><b>{c.label}</b><span style={{ flex: 1 }} />{offRef(v, ref) ? <span className="pp2-warn">≠ réf. {ref}</span> : has(v) ? <Pill tone={v === NR ? "neutral" : "ok"}>{v === NR ? "non requis" : "choisi"}</Pill> : <Pill tone="neutral">à choisir</Pill>}</div>
          <Choice label={c.label} value={v} opts={c.opts} refV={ref} nr={c.kind === "option"} canEdit={canL} ro={ro} onPick={x => saveL("comps." + c.id, x)} />
          {okN("c-" + c.id, c.label)}</div>; })}</div>
      </>}{show("qual") && <>{!only && sub("Qualité et contrôles")}
      {QUALITY.map(([id, l]) => <LRow key={id} label={l} ok={okN(id, l)}>{txt(id, l, false, "contrôle, remarque")}</LRow>)}
      </>}{show("log") && <>{!only && sub("Logistique et organisation")}
      <LRow label="Planning"><span className="pp2-v">{info.planning || "—"}</span> <Src k="plan">planning publié</Src></LRow>
      <LRow label="Ressources" ok={okN("res", "ressources")}>{txt("res", "Ressources", false, "monteurs, électricien…")}</LRow>
      <LRow label="Risques identifiés et plans de mitigation" ok={okN("risk", "risques")}>{txt("risk", "Risques identifiés et plans de mitigation", true)}</LRow>
      <LRow label="Autre">{txt("logAutre", "Autre (logistique)", true)}</LRow>
      </>}{show("val") && <>{!only && sub("Validation du lancement")}
      <p className="pp2-sub" style={{ margin: "0 0 8px" }}>Chaque rôle signe depuis son compte ; la fiche est lancée quand les quatre ont signé.</p>
      <div className="pp2-sigs">{SIGN_ROLES.map(role => { const s = (L.signs || {})[role];
        return <div key={role} className="pp2-sig" data-done={s ? "1" : undefined}><b>{role}</b>
          {s ? <><span className="pp2-sub">{s.by} · {fd(s.at)}</span><button type="button" style={btn("ghost", "sm")} onClick={() => saveL("signs." + role, null, cur => signLaunch(cur, role, authorName, false), true)}>Retirer</button></>
            : <button type="button" style={btn("sec", "sm")} onClick={() => saveL("signs." + role, null, cur => signLaunch(cur, role, authorName, true), true)}>Signer</button>}</div>; })}</div>
      </>}
      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}><span className="pp2-sub">Enregistré à chaque modification</span><span style={{ flex: 1 }} /><button type="button" onClick={pdf} style={btn("sec", "sm")}>Exporter la fiche (PDF)</button></div>
    </div>}
  </div>;
}

export function History({ P, doc, L }) {
  const lab = Object.fromEntries(elementsOf(doc).map(e => [e.id, e.label]));
  const list = [...(P.hist || [])];
  if (L && L.at) list.unshift({ at: L.at, by: L.by, phase: "fab", el: "*", to: FAB + " modifiée" });
  if (!list.length) return <div className="pp2-sub" style={{ padding: "6px 0" }}>Rien d'écrit pour l'instant : chaque modification s'ajoute ici, avec son auteur.</div>;
  return <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>{list.map((h, i) => <li key={i} style={{ display: "grid", gridTemplateColumns: "120px 110px minmax(0,1fr)", gap: 10, padding: "8px 0", borderBottom: "1px solid " + T.line, fontSize: 13, alignItems: "baseline" }}>
    <span style={{ color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{fdt(h.at)}</span>
    <span><Pill tone="neutral">{PHASE_LABEL[h.phase] || h.phase}</Pill></span>
    <span style={{ color: T.ink900 }}>{h.el === "*" ? h.to : <><b style={{ fontWeight: 600 }}>{lab[h.el] || h.el}</b> : {h.from ? <span style={{ color: T.ink500 }}>{h.from} → </span> : null}{h.to || <span style={{ color: T.ink500 }}>effacé</span>}</>}{h.by ? <span style={{ color: T.ink500 }}> · {h.by}</span> : null}</span>
  </li>)}</ol>;
}

// ── le passeport ───────────────────────────────────────────────────────────────────────────────────
export function PassportFull({ r, data, doc, api, canEdit, authorName, prodDoc, achatsDoc, testsDoc, savDoc, certifs }) {
  const meta = getPjMeta(r.pj, r), gk = gammeKey(doc, r.gamme), pj = r.pj;
  const chefs = [...new Set([...chefsOf(meta), ...orcChefsOf(meta)])].filter(c => c && c !== "—");
  const me = String(authorName || "").trim().toLowerCase(), isCdp = !!me && chefs.some(c => String(c).trim().toLowerCase() === me);
  const canL = !!(canEdit || isCdp);
  const ro = () => notify("Lecture seule : le passeport se remplit par le chef de projet du PJ ou un admin", "info");
  const L = launchOf(doc, pj), Lr = useRef(L); useEffect(() => { Lr.current = L; }, [L]);
  // une écriture à la fois sur la dernière version connue (deux clics rapides ne s'écrasent pas)
  const saveL = async (path, v, whole, anyone) => {
    if (!canL && !anyone) { ro(); return; }
    const next = whole ? whole(Lr.current) : setLaunch(Lr.current, path, v, authorName); Lr.current = next;
    const ok = await api.saveLaunch(pj, next); if (ok === false) notify("La modification n'a pas été enregistrée", "error");
  };
  const prodM = useProdModel(!!prodDoc);
  const safe = (fn, d, what) => { try { return fn() || d; } catch (e) { console.warn("Passeport : " + what + " ignoré(s)", e); return d; } };
  const turb = useMemo(() => safe(() => (prodDoc && prodM ? turbineOf(prodDoc, data || [r], pj, x => getPjMeta(x.pj, x), prodM.buildNeeds) : null), null, "turbines"), [prodDoc, prodM, data, r]); // eslint-disable-line react-hooks/exhaustive-deps
  const tests = useMemo(() => safe(() => testsLive(testsDoc, pj), {}, "tests"), [testsDoc, pj]); // eslint-disable-line react-hooks/exhaustive-deps
  const sav = useMemo(() => safe(() => savLive(savDoc, pj), {}, "SAV"), [savDoc, pj]); // eslint-disable-line react-hooks/exhaustive-deps
  const scopes = useMemo(() => safe(() => achatScopes(achatsDoc, pj), {}, "achats"), [achatsDoc, pj]); // eslint-disable-line react-hooks/exhaustive-deps
  const achats = useMemo(() => safe(() => achatsOf(achatsDoc, pj), null, "achats"), [achatsDoc, pj]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = useMemo(() => safe(() => piecesArrived(achatsDoc, pj), null, "achats"), [achatsDoc, pj]); // eslint-disable-line react-hooks/exhaustive-deps
  const P0 = ((doc.pass || {})[pj]) || {}, liveReal = { ...safe(() => turbLive(turb), {}, "turbines"), ...tests, ...sav };
  const P = { ...P0, real: { ...liveReal, ...(P0.real || {}) } };
  const R = ((doc.rai || {})[pj]) || null, rv = raiVerdict(R), photos = ((doc.photos || {})[pj]) || [];
  const comps = activeComponents(doc), design = L.design || {}, elec = L.elec || {}, cv = L.comps || {}, inj = L.inj || {}, std = stdOf(doc, r.gamme), dims = dimsOf(doc, gk), lists = elecListsOf(doc);
  const certifTxt = (Array.isArray(meta.certifs) ? meta.certifs : []).map(id => ((certifs || []).find(c => c.id === id) || {}).name || "").filter(Boolean).join(", ");
  const sn = meta.numSerie || ((plannedSnOf(pj) || {}).sn ? (plannedSnOf(pj) || {}).sn + " (prévu)" : "");
  const cd = contractDatesOf(meta), livr = livrPrevueOf(meta, r.depart);
  const info = { pj, gamme: r.gamme, chef: chefs.join(", "), sn, certif: certifTxt,
    delais: [r.arrivee && "arrivée " + fd(r.arrivee), r.tests && "tests " + fd(r.tests), r.depart && "départ " + fd(r.depart)].filter(Boolean).join(" · "),
    planning: [r.arrivee && "arrivée " + fd(r.arrivee), r.debutProd && "production " + fd(r.debutProd), r.tests && "tests " + fd(r.tests) + (r.testsFin ? " → " + fd(r.testsFin) : ""), r.depart && "départ " + fd(r.depart)].filter(Boolean).join(" · ") };
  const ed = (path, opts) => ({ canEdit: canL, ro, opts, onSave: v => saveL(path, v) });
  const cur = phaseOfEtat(r.etat), curI = PASS_PHASES.findIndex(p => p[0] === cur);
  // ce qui demande une action (rouge) : achats en retard ou à commander, tests en échec, tickets ouverts, RAI bloquant
  const todo = [];
  if (achats && achats.retards) todo.push({ t: achats.retards + " commande" + (achats.retards > 1 ? "s" : "") + " en retard de livraison", go: "appro" });
  if (achats && achats.counts.apasser) todo.push({ t: achats.counts.apasser + " ligne" + (achats.counts.apasser > 1 ? "s" : "") + " d'achat à commander", go: "appro", warn: true });
  Object.values(tests).forEach(x => { if (x && x.bad) todo.push({ t: x.badT, go: "tests" }); });
  if (sav.ticketsOpen) todo.push({ t: sav.ticketsOpen.badT, go: "sav" });
  if (rv.blocking) todo.push({ t: "RAI : " + rv.label, go: "rai" });
  // fil des phases : suit la lecture, emmène au clic (la page ne défile que verticalement)
  const [active, setActive] = useState(cur);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.getAttribute("data-ph")); }), { rootMargin: "-25% 0px -65% 0px" });
    document.querySelectorAll(".pp2-sec[data-ph]").forEach(s => io.observe(s));
    return () => io.disconnect();
  }, [pj]);
  const go = id => { const el = document.getElementById("pp2-" + id); if (el) { el.scrollIntoView({ behavior: smooth(), block: "start" }); setActive(id); const h = el.querySelector("h3"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } } };
  const rail = [...PASS_PHASES, ["photos", "Photos"], ["hist", "Historique"]];
  const rows = liveRows(passportRows(doc, pj, r.gamme), { real: liveReal, scopes });
  const ident = [meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : "", meta.pays, r.gamme, sn ? "S/N " + sn : ""].filter(Boolean).join(" · ");
  const vars = { "--pp-ink": T.ink900, "--pp-ink7": T.ink700, "--pp-ink5": T.ink500, "--pp-line": T.line, "--pp-card": T.card, "--pp-alt": T.surfaceAlt, "--pp-surf": T.surface,
    "--pp-field": T.fieldLine, "--pp-acc": T.accentInk, "--pp-ok": T.emerald600, "--pp-okbg": T.emerald100, "--pp-bad": T.red600, "--pp-warn": T.amber600, "--pp-on": T.onFill };
  return <section aria-label={"Passeport de " + pj} className="pp2" style={{ ...vars, padding: "16px 20px", minWidth: 0 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: T.ink900 }}>{pj}</h2>
      <span style={{ fontSize: 13, color: T.ink500 }}>{ident}</span>
      {!canL && <Pill tone="neutral">Lecture seule</Pill>}
      <span style={{ flex: 1 }} />
      <button type="button" onClick={() => { const w = window.open("", "_blank"); if (!w) return; w.document.open(); w.document.write(dossierHtml({ r, meta, rows, R, photos, std: gk })); w.document.close(); }} style={btn("sec", "sm")}>Dossier machine (PDF)</button>
    </div>
    {todo.length > 0 && <div className="pp2-todo" role="region" aria-label="À traiter">
      <b>À traiter</b>{todo.map((x, i) => <button key={i} type="button" className="pp2-todoi" data-warn={x.warn ? "1" : undefined} onClick={() => go(x.go)}>{x.t}</button>)}
    </div>}
    <div className="pp2-wrap">
      <nav className="pp2-rail" aria-label="Phases du passeport">{rail.map(([k, l], i) => { const done = i < curI && i < PASS_PHASES.length, now = k === cur;
        return <a key={k} href={"#pp2-" + k} className="pp2-ra" data-done={done ? "1" : undefined} aria-current={active === k ? "true" : undefined} onClick={e => { e.preventDefault(); go(k); }}>
          <span className="pp2-dot" data-done={done ? "1" : undefined} data-now={now ? "1" : undefined}>{done ? "✓" : i < PASS_PHASES.length ? i + 1 : ""}</span><span>{l}{now && <small>en cours</small>}</span></a>; })}</nav>
      <div style={{ minWidth: 0 }}>
        <Section id="arr" title="Arrivée dans l'outil" sub={meta.contratT0 ? "contrat du " + fd(meta.contratT0) : ""}>
          <Grid>
            <Cell k="Projet" v={meta.nomProjet !== "—" ? meta.nomProjet : ""} src="fiche projet" srcK="fp" />
            <Cell k="Pays" v={meta.pays} src="fiche projet" srcK="fp" />
            <Cell k="Chef de projet" v={info.chef} src="fiche projet" srcK="fp" />
            <Cell k="Gamme" v={r.gamme} src="planning" srcK="plan" />
            <Cell k="S/N" v={sn} src="Machines ORC" srcK="plan" />
            <Cell k="T0 du contrat" v={fd(meta.contratT0)} src="fiche projet" srcK="fp" />
            <Cell k="Certification" v={certifTxt} src="fiche projet" srcK="fp" />
            <Cell k="Échéance contractuelle" v={fd(cd.deadline || cd.mad)} src="fiche projet" srcK="fp" />
            <Cell k="Arrivée de la machine" v={fd(r.arrivee)} src="planning" srcK="plan" />
          </Grid>
        </Section>
        <Section id="design" title="Design" sub="infos client · chef de projet">
          <Grid>
            {DESIGN_FIELDS.map(f => <Cell key={f.id} k={f.label} v={design[f.id]} edit={ed("design." + f.id, f.opts)} src={design[f.id] ? "CdP" : ""} srcK="cdp" />)}
            {["neutre", "freq", "tension"].map(k => <Cell key={k} k={ELEC_LABEL[k]} v={elec[k]} edit={ed("elec." + k, lists[k])} src={FAB} srcK="fl" />)}
            <Cell k="Dimensions" v={dims ? "L " + dims.L + " × l " + dims.l + " × H " + dims.H : ""} src={"gamme " + (gk || "—")} srcK="plan" />
            <Cell k="Poids" v={dims ? dims.P : ""} src={"gamme " + (gk || "—")} srcK="plan" />
          </Grid>
        </Section>
        <Section id="appro" title="Appro / Achats" sub={ready ? ready.n + " / " + ready.t + " lignes livrées · " + ready.pct + " %" : "aucune fiche machine dans Achats / Appro"}>
          {achats && achats.pos.length ? <Grid>{achats.pos.map(p => <Cell key={p.numero} k={p.numero} v={ACH_LABEL[p.statut] || p.statut} bad={p.retard}
            src={"Achats · " + (p.statut === "livre" ? "livrée" : p.livraison ? (p.retard ? "attendue le " + fd(p.livraison) + ", en retard" : "attendue le " + fd(p.livraison)) : "sans date") + " · " + p.lignes + " ligne" + (p.lignes > 1 ? "s" : "")} srcK="ach" />)}</Grid>
            : <p className="pp2-sub">{achats ? "Aucune commande passée pour l'instant (" + achats.lignes + " ligne" + (achats.lignes > 1 ? "s" : "") + " d'achat)" : "Les commandes de la fiche machine d'Achats / Appro s'afficheront ici"}</p>}
        </Section>
        <Section id="fab" title="Fabrication et turbine" sub={[r.debutProd && "production à partir du " + fd(r.debutProd), r.tests && "tests le " + fd(r.tests)].filter(Boolean).join(" · ")}>
          <LaunchSheet L={L} saveL={saveL} canL={canL} ro={ro} gk={gk} doc={doc} info={info} ready={ready} comps={comps} scopes={scopes} authorName={authorName} />
          <h4 className="pp2-h4">Turbine</h4>
          <Grid>
            <Cell k="Turbine" v={turb && turb.slots.some(s => s.allouee) ? turb.slots.filter(s => s.allouee).map(s => s.num).join(", ") : ""} src={turb ? "Turbines · " + (turb.slots.filter(s => s.allouee).length) + " / " + turb.slots.length + " attribuée" + (turb.slots.length > 1 ? "s" : "") : "Turbines"} srcK="tur" />
            <Cell k="Roue" v={inj.roue || (turb && turb.slots.map(s => s.roue).filter(Boolean)[0]) || ""} src={inj.roue ? FAB : "Turbines"} srcK={inj.roue ? "fl" : "tur"} warn={offRef(inj.roue, std.roue) ? "≠ référence " + gk + " : " + std.roue : ""} />
            <Cell k="Injecteur" v={inj.injecteur || (turb && turb.slots.map(s => s.inj).filter(Boolean)[0]) || ""} src={inj.injecteur ? FAB : "Turbines"} srcK={inj.injecteur ? "fl" : "tur"} warn={offRef(inj.injecteur, std.injecteur) ? "≠ référence " + gk + " : " + std.injecteur : ""} />
            <Cell k="Bouchages" v={plugCount(L) + " / " + HOLES + " · " + (HOLES - plugCount(L)) + " ouvertures"} src={FAB} srcK="fl" />
            <Cell k="Turbine installée" v={turb && turb.slots.some(s => s.installee) ? turb.slots.filter(s => s.installee).map(s => fd(s.installee)).join(", ") : ""} src="Turbines" srcK="tur" />
          </Grid>
          <h4 className="pp2-h4">Composants installés</h4>
          <Grid>{comps.map(c => { if (c.kind === "achat") { const a = achatOfComp(c, scopes); return <Cell key={c.id} k={c.label} v={a && !a.none ? a.pos.join(", ") || a.st : ""} bad={a && a.bad} src={"Achats" + (a && !a.none ? " · " + a.st : "")} srcK="ach" />; }
            const v = cv[c.id], ref = refOf(c, gk);
            return <Cell key={c.id} k={c.label} v={v === NR ? "Non requis" : v} edit={ed("comps." + c.id, [...new Set([...(c.opts || []), ...(ref ? [ref] : [])])])} src={has(v) ? FAB : ""} srcK="fl" warn={offRef(v, ref) ? "≠ référence " + gk + " : " + ref : ""} />; })}</Grid>
        </Section>
        <Section id="tests" title="Tests" sub={r.tests ? "du " + fd(r.tests) + (r.testsFin ? " au " + fd(r.testsFin) : "") : ""}>
          <Grid>
            <Cell k="Banc" v={r.banc ? "Banc " + r.banc : ""} src="planificateur" srcK="plan" />
            {[["livret", "Livret de configuration"], ["debugCk", "Checklist de debug"], ["freqs", "Fréquences turbines"], ["vibs", "Vibrations"], ["fat", "Tests FAT"]].map(([k, l]) =>
              <Cell key={k} k={l} v={tests[k] ? tests[k].v : ""} bad={tests[k] && tests[k].bad} src="fiche de tests" srcK="ts" />)}
            <Cell k="Version software" v={design.software} edit={ed("design.software")} src={design.software ? "CdP" : ""} srcK="cdp" />
          </Grid>
        </Section>
        <Section id="rai" title="RAI" sub={"rapport d'acceptation interne · " + rv.label}>
          <RaiView photos={photos} r={r} meta={meta} doc={doc} P={P} R={R} saveRai={next => api.saveRai(pj, next)} savePass={next => api.savePass(pj, next)} canEdit={canEdit} who={authorName} />
        </Section>
        <Section id="depart" title="Départ" sub={r.depart ? "prévu le " + fd(r.depart) : ""}>
          <Grid>
            <Cell k="Départ prévu" v={fd(r.depart)} src="planning" srcK="plan" />
            <Cell k="Feu vert du départ (RAI)" v={rv.label} bad={rv.blocking} src="RAI" srcK="ts" />
            <Cell k="Livraison sur site" v={fd(livr)} src={"fiche projet" + (meta.transportJ ? " · transport " + meta.transportJ + " j" : "")} srcK="fp" />
          </Grid>
        </Section>
        <Section id="sav" title="MES et SAV" sub="après la livraison">
          <Grid>
            <Cell k="Mise en service" v={sav.mesDate ? sav.mesDate.v : ""} src={sav.mesDate ? sav.mesDate.src : "SAV / MES"} srcK="sav" />
            <Cell k="Dernière intervention" v={sav.lastInter ? sav.lastInter.v : ""} src={sav.lastInter ? sav.lastInter.src : "SAV / MES"} srcK="sav" />
            <Cell k="Tickets ouverts" v={sav.ticketsOpen ? sav.ticketsOpen.v : "0"} bad={!!sav.ticketsOpen} src="SAV / MES" srcK="sav" />
            {Object.entries(sav).filter(([, x]) => x && x.sav).map(([k, x]) => <Cell key={k} k={"Pièce changée : " + (((elementsOf(doc).find(e => e.id === k)) || {}).label || k)} v={x.v} src={x.src} srcK="sav" />)}
          </Grid>
        </Section>
        <Section id="photos" title="Photos" sub={photos.length ? photos.length + " photo" + (photos.length > 1 ? "s" : "") : "aux étapes clés"}>
          <PhotosView pj={pj} list={photos} api={api} who={authorName} canEdit={canEdit} />
        </Section>
        <Section id="hist" title="Historique"><History P={P0} doc={doc} L={L} /></Section>
      </div>
    </div>
  </section>;
}
