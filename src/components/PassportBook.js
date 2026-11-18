// v408 (maquette maquettes-design/v410-passeport-pages.html validée : « Go, code-la » ; « c'est ça que je voulais : le défilement de gauche
// à droite ») : le passeport se feuillette comme un livre. Couverture, puis une page par phase ; on tourne les pages de gauche à droite au doigt
// ou à la souris (la page suit le geste, pivote sur sa reliure, l'élan décide, une page par geste, résistance aux deux bouts), au pavé tactile,
// avec ‹ › ou ← →. Une page longue défile vers le bas à l'intérieur. Lignes groupées : un appui ouvre une feuille par le bas (choix à toucher,
// on la tire vers le bas pour fermer). La fiche de lancement de fab (page 5) et le RAI (avec ses photos et ses valeurs pré-remplies par Achats,
// Turbines et la fiche du CdP) sont des feuillets qui s'ouvrent depuis leur page.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { T } from "../theme";
import { getPjMeta, chefsOf, orcChefsOf, plannedSnOf } from "../pjMeta";
import { Pill, notify } from "./SharedUI";
import { AF } from "../autoFocusOk";
import { contractDatesOf, livrPrevueOf } from "../penalties";
import { useProdModel } from "../prodModel";
import { turbineOf, achatsOf, ACHAT_ST } from "../pjDossier";
import { testsLive, savLive } from "../passportLive";
import { achatScopes, turbLive, gammeKey, stdOf, elementsOf, passportRows, liveRows } from "../passport";
import { raiVerdict } from "../rai";
import { safeImgUrl } from "../photos";
import { RaiView } from "./RaiView";
import { PhotosView } from "./PhotosView";
import { dossierHtml } from "../dossierMachine";
import { LaunchSheet, Src, History } from "./PassportFull";
import { NR, HOLES, ELEC_LABEL, DESIGN_FIELDS, activeComponents, elecListsOf, dimsOf, launchOf, plugCount, refOf, offRef, setLaunch, launchState,
  piecesArrived, achatOfComp, PASS_PHASES, phaseOfEtat, raiPrefill } from "../launchFab";

const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(0, 4) : "");
const has = v => v != null && String(v).trim() !== "";
const FAB = "Fiche de lancement de fab";
const ACH_LABEL = Object.fromEntries(ACHAT_ST);
const FAB_TABS = [["gen", "Informations générales"], ["desc", "Description"], ["fab", "Données de fabrication"], ["tur", "Turbine"], ["comp", "Composants"], ["qual", "Qualité"], ["log", "Logistique"], ["val", "Validation"]];
const reduced = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

// une ligne de liste groupée : valeur à droite, chevron si modifiable ; l'appui réagit tout de suite
function Row({ k, v, src, srcK, bad, warn, onEdit, onGo }) {
  const act = onEdit || onGo;
  return <button type="button" className="pb-row" data-ro={act ? undefined : "1"} onClick={act || undefined} tabIndex={act ? 0 : -1}
    aria-label={k + " : " + (has(v) ? v : "à renseigner") + (onEdit ? ". Modifier" : onGo ? ". Ouvrir" : "")}>
    <span className="pb-k">{k}{src && <small><Src k={srcK}>{src}</Src></small>}</span>
    <span className="pb-v" data-empty={has(v) ? undefined : "1"} style={bad ? { color: T.red600 } : undefined}>{has(v) ? v : (onEdit ? "À renseigner" : "—")}{warn && <small className="pp2-warn">{warn}</small>}</span>
    <span className="pb-chev" aria-hidden="true">{act ? "›" : ""}</span>
  </button>;
}
function Group({ children }) { return <div className="pb-group">{children}</div>; }

// feuille par le bas : choix à toucher (ou champ libre), on la tire vers le bas pour fermer (elle suit le doigt, l'élan compte)
function Sheet({ s, onClose }) {
  const ref = useRef(null), drag = useRef(null), [t, setT] = useState(s.value && s.value !== NR ? s.value : "");
  const pick = v => { s.onPick(v); onClose(); };
  const down = e => { if (e.target.closest("button,input")) return; drag.current = { y0: e.clientY, h: [[e.clientY, e.timeStamp]] }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* rien */ } };
  const move = e => { const d = drag.current; if (!d) return; const dy = e.clientY - d.y0; ref.current.style.transform = "translateY(" + (dy < 0 ? dy * 0.25 : dy) + "px)"; d.h.push([e.clientY, e.timeStamp]); if (d.h.length > 5) d.h.shift(); };
  const up = () => { const d = drag.current; if (!d) return; drag.current = null; const a = d.h[0], b = d.h[d.h.length - 1], dy = b[0] - d.y0, v = (b[0] - a[0]) / Math.max(1, b[1] - a[1]) * 1000;
    if (dy > ref.current.offsetHeight * 0.3 || v > 700) onClose(); else { ref.current.style.transition = "transform var(--e-dur-in) cubic-bezier(.16,1,.3,1)"; ref.current.style.transform = ""; setTimeout(() => { if (ref.current) ref.current.style.transition = ""; }, 260); } };
  const opts = [...new Set([...(s.opts || []), ...(s.refV ? [s.refV] : [])])];
  return <div className="pb-veil" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} className="pb-sheet" role="dialog" aria-modal="true" aria-labelledby="pb-sh-t" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
      <div className="pb-grab" aria-hidden="true" />
      <h4 id="pb-sh-t">{s.title}</h4>{s.sub && <div className="pp2-sub" style={{ marginBottom: 12 }}>{s.sub}</div>}
      {opts.length ? <div className="pb-opts" role="group" aria-label={s.title}>
        {opts.map((o, i) => <button key={o} type="button" className="pb-opt" aria-pressed={s.value === o} autoFocus={i === 0 ? AF : undefined} onClick={() => pick(s.value === o ? "" : o)}>
          <span>{o}{o === s.refV && <small> référence de la gamme</small>}</span><span className="pb-ck" aria-hidden="true">✓</span></button>)}
        {s.nr && <button type="button" className="pb-opt" aria-pressed={s.value === NR} onClick={() => pick(s.value === NR ? "" : NR)}><span>Non requis</span><span className="pb-ck" aria-hidden="true">✓</span></button>}
      </div> : null}
      {(s.free || !opts.length) && <div style={{ display: "flex", gap: 8, marginTop: opts.length ? 10 : 0 }}>
        <input className="pp2-in" style={{ flex: 1, minHeight: 44 }} autoFocus={opts.length ? undefined : AF} value={t} placeholder={opts.length ? "Autre valeur" : "Valeur"} aria-label={s.title} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === "Enter") pick(t.trim()); }} />
        <button type="button" className="pb-opt" style={{ width: "auto" }} onClick={() => pick(t.trim())}>Enregistrer</button></div>}
    </div>
  </div>;
}

// feuillet qui s'ouvre (fiche de lancement de fab, RAI) : prend toute la place du livre, « ‹ Passeport » le referme
function Insert({ title, badge, onClose, tabs, tab, setTab, children }) {
  return <div className="pb-insert" role="dialog" aria-modal="true" aria-label={title} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
    <div className="pb-ih"><button type="button" className="pb-back" onClick={onClose} autoFocus={AF}>‹ Passeport</button><b>{title}</b><span style={{ flex: 1 }} />{badge}</div>
    {tabs && <nav className="pb-itabs" aria-label="Rubriques">{tabs.map(([k, l]) => <button key={k} type="button" className="pb-itab" aria-current={tab === k ? "true" : undefined} onClick={() => setTab(k)}>{l}</button>)}</nav>}
    <div className="pb-ibody">{children}</div>
  </div>;
}

export function PassportBook({ r, data, doc, api, canEdit, authorName, prodDoc, achatsDoc, testsDoc, savDoc, certifs }) {
  const meta = getPjMeta(r.pj, r), gk = gammeKey(doc, r.gamme), pj = r.pj;
  const chefs = [...new Set([...chefsOf(meta), ...orcChefsOf(meta)])].filter(c => c && c !== "—");
  const me = String(authorName || "").trim().toLowerCase(), canL = !!(canEdit || (!!me && chefs.some(c => String(c).trim().toLowerCase() === me)));
  const ro = useCallback(() => notify("Lecture seule : le passeport se remplit par le chef de projet du PJ ou un admin", "info"), []);
  const L = launchOf(doc, pj), Lr = useRef(L); useEffect(() => { Lr.current = L; }, [L]);
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
  const comps = activeComponents(doc);
  const P0 = ((doc.pass || {})[pj]) || {}, liveReal = { ...safe(() => turbLive(turb), {}, "turbines"), ...tests, ...sav };
  const rows = liveRows(passportRows(doc, pj, r.gamme), { real: liveReal, scopes });
  // RAI pré-rempli : Achats (référence · PO), fiche de lancement de fab du CdP, puis Turbines / tests / SAV, puis ce qui a été saisi à la main
  const P = { ...P0, real: { ...safe(() => raiPrefill(L, comps, rows), {}, "pré-remplissage"), ...liveReal, ...(P0.real || {}) } };
  const R = ((doc.rai || {})[pj]) || null, rv = raiVerdict(R), photos = ((doc.photos || {})[pj]) || [];
  const design = L.design || {}, elec = L.elec || {}, cv = L.comps || {}, inj = L.inj || {}, std = stdOf(doc, r.gamme), dims = dimsOf(doc, gk), lists = elecListsOf(doc), st = launchState(L);
  const certifTxt = (Array.isArray(meta.certifs) ? meta.certifs : []).map(id => ((certifs || []).find(c => c.id === id) || {}).name || "").filter(Boolean).join(", ");
  const sn = meta.numSerie || ((plannedSnOf(pj) || {}).sn ? (plannedSnOf(pj) || {}).sn + " (prévu)" : "");
  const cd = contractDatesOf(meta), livr = livrPrevueOf(meta, r.depart);
  const info = { pj, gamme: r.gamme, chef: chefs.join(", "), sn, certif: certifTxt,
    delais: [r.arrivee && "arrivée " + fd(r.arrivee), r.tests && "tests " + fd(r.tests), r.depart && "départ " + fd(r.depart)].filter(Boolean).join(" · "),
    planning: [r.arrivee && "arrivée " + fd(r.arrivee), r.debutProd && "production " + fd(r.debutProd), r.tests && "tests " + fd(r.tests) + (r.testsFin ? " → " + fd(r.testsFin) : ""), r.depart && "départ " + fd(r.depart)].filter(Boolean).join(" · ") };
  const curPh = phaseOfEtat(r.etat), curPhI = PASS_PHASES.findIndex(p => p[0] === curPh);
  const [sheet, setSheet] = useState(null), [ins, setIns] = useState(null), [fabTab, setFabTab] = useState("gen");
  const edit = (title, path, opts, extra) => () => { if (!canL) { ro(); return; } const val = path.split(".").reduce((o, k) => (o || {})[k], L); setSheet({ title, sub: (extra && extra.sub) || FAB, value: val || "", opts, refV: extra && extra.refV, nr: extra && extra.nr, free: extra && extra.free, onPick: v => saveL(path, v) }); };
  // ce qui demande une action
  const todo = [];
  if (achats && achats.retards) todo.push({ t: achats.retards + " commande" + (achats.retards > 1 ? "s" : "") + " en retard", go: "appro" });
  if (achats && achats.counts.apasser) todo.push({ t: achats.counts.apasser + " ligne" + (achats.counts.apasser > 1 ? "s" : "") + " à commander", go: "appro" });
  Object.values(tests).forEach(x => { if (x && x.bad) todo.push({ t: x.badT, go: "tests" }); });
  if (sav.ticketsOpen) todo.push({ t: sav.ticketsOpen.badT, go: "sav" });
  if (rv.blocking) todo.push({ t: "RAI : " + rv.label, go: "rai" });
  const stOf = k => { const i = PASS_PHASES.findIndex(p => p[0] === k); return i < 0 ? "" : i < curPhI ? "done" : i === curPhI ? "now" : ""; };
  // ── les pages
  const pages = [
    { k: "cover", l: "Couverture", node: <div className="pb-cover-in">
      <div className="pb-run"><b>Passeport machine</b><span>ENOGIA · BU ORC</span></div>
      <h2 className="pb-title">{pj}</h2>
      <div className="pb-id">{[meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : "", meta.pays, r.gamme, sn ? "S/N " + sn : ""].filter(Boolean).join(" · ")}</div>
      <div className="pb-facts"><div><span>Phase</span><b>{(PASS_PHASES.find(p => p[0] === curPh) || ["", ""])[1]}</b></div><div><span>Départ prévu</span><b>{fd(r.depart) || "—"}</b></div>
        <div><span>Pièces arrivées</span><b>{ready ? ready.pct + " %" : "—"}</b></div><div><span>À traiter</span><b>{todo.length || "rien"}</b></div></div>
      {todo.length > 0 && <div className="pb-todo">{todo.map((x, i) => <button key={i} type="button" className="pb-todoi" onClick={() => go(x.go)}>{x.t} ›</button>)}</div>}
      <p className="pb-hint">Glissez vers la gauche pour tourner la page, ou ← →</p>
    </div> },
    { k: "arr", l: "Arrivée dans l'outil", sub: meta.contratT0 ? "contrat du " + fd(meta.contratT0) : "", node: <Group>
      <Row k="Projet" v={meta.nomProjet !== "—" ? meta.nomProjet : ""} src="fiche projet" srcK="fp" /><Row k="Pays" v={meta.pays} src="fiche projet" srcK="fp" />
      <Row k="Chef de projet" v={info.chef} src="fiche projet" srcK="fp" /><Row k="Gamme" v={r.gamme} src="planning" srcK="plan" /><Row k="S/N" v={sn} src="Machines ORC" srcK="plan" />
      <Row k="T0 du contrat" v={fd(meta.contratT0)} src="fiche projet" srcK="fp" /><Row k="Certification" v={certifTxt} src="fiche projet" srcK="fp" />
      <Row k="Échéance contractuelle" v={fd(cd.deadline || cd.mad)} src="fiche projet" srcK="fp" /><Row k="Arrivée de la machine" v={fd(r.arrivee)} src="planning" srcK="plan" /></Group> },
    { k: "design", l: "Design", sub: "infos client", node: <Group>
      {DESIGN_FIELDS.map(f => <Row key={f.id} k={f.label} v={design[f.id]} src={design[f.id] ? "CdP" : ""} srcK="cdp" onEdit={edit(f.label, "design." + f.id, f.opts, { sub: "Design · CdP", free: !f.opts.length })} />)}
      {["neutre", "freq", "tension"].map(k => <Row key={k} k={ELEC_LABEL[k]} v={elec[k]} src={FAB} srcK="fl" onEdit={edit(ELEC_LABEL[k], "elec." + k, lists[k])} />)}
      <Row k="Dimensions" v={dims ? "L " + dims.L + " × l " + dims.l + " × H " + dims.H : ""} src={"gamme " + (gk || "—")} srcK="plan" /><Row k="Poids" v={dims ? dims.P : ""} src={"gamme " + (gk || "—")} srcK="plan" /></Group> },
    { k: "appro", l: "Appro / Achats", sub: ready ? ready.n + " / " + ready.t + " lignes livrées · " + ready.pct + " %" : "aucune fiche machine dans Achats / Appro", node: achats && achats.pos.length
      ? <Group>{achats.pos.map(p => <Row key={p.numero} k={p.numero} v={ACH_LABEL[p.statut] || p.statut} bad={p.retard}
          src={"Achats · " + (p.statut === "livre" ? "livrée" : p.livraison ? (p.retard ? "attendue le " + fd(p.livraison) + ", en retard" : "attendue le " + fd(p.livraison)) : "sans date") + " · " + p.lignes + " ligne" + (p.lignes > 1 ? "s" : "")} srcK="ach" />)}</Group>
      : <p className="pp2-sub">{achats ? "Aucune commande passée pour l'instant (" + achats.lignes + " ligne" + (achats.lignes > 1 ? "s" : "") + " d'achat)" : "Les commandes de la fiche machine d'Achats / Appro s'afficheront ici"}</p> },
    { k: "launch", l: FAB, sub: "remplie par le CdP au lancement de la fabrication", node: <>
      <div className="pb-card"><div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {st.launched ? <Pill tone="ok">Lancée le {fd(st.at)} · 4 / 4 signatures</Pill> : <Pill tone="warn">Brouillon · {st.signed} / {st.total} signatures</Pill>}
        <span className="pp2-sub">{canL ? "vous pouvez la remplir" : "lecture seule"}</span></div>
        {ready && <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}><b className="pb-big">{ready.pct} %</b><span style={{ fontSize: 13 }}>des pièces arrivées{ready.waiting.length ? " · attendu : " + ready.waiting.slice(0, 3).map(w => w.numero).join(", ") : ""}</span><Src k="ach">Achats</Src></div>}
        <div className="pb-mini">{[["Régime de neutre", elec.neutre], ["Roue", inj.roue], ["Injecteur", inj.injecteur], ["Bouchages", plugCount(L) + " / " + HOLES], ["Composants choisis", comps.filter(c => c.kind !== "achat" && has(cv[c.id])).length + " / " + comps.filter(c => c.kind !== "achat").length]].map(([k, v]) => <div key={k}><span>{k}</span><b>{has(v) ? v : "—"}</b></div>)}</div>
      </div>
      <button type="button" className="pb-open" onClick={() => setIns("launch")}>Ouvrir la fiche de lancement de fab <span aria-hidden="true">↗</span></button></> },
    { k: "fab", l: "Fabrication et turbine", sub: [r.debutProd && "production à partir du " + fd(r.debutProd), r.tests && "tests le " + fd(r.tests)].filter(Boolean).join(" · "), node: <>
      <Group><Row k={FAB} v={st.launched ? "Lancée le " + fd(st.at) : "Brouillon · " + st.signed + " / " + st.total + " signatures"} src="page précédente" srcK="fl" onGo={() => go("launch")} /></Group>
      <h4 className="pb-h4">Turbine</h4>
      <Group>
        <Row k="Turbine" v={turb && turb.slots.some(s => s.allouee) ? turb.slots.filter(s => s.allouee).map(s => s.num).join(", ") : ""} src={turb ? "Turbines · " + turb.slots.filter(s => s.allouee).length + " / " + turb.slots.length + " attribuée(s)" : "Turbines"} srcK="tur" />
        <Row k="Roue" v={inj.roue || (turb && turb.slots.map(s => s.roue).filter(Boolean)[0]) || ""} src={inj.roue ? FAB : "Turbines"} srcK={inj.roue ? "fl" : "tur"} warn={offRef(inj.roue, std.roue) ? "≠ référence " + gk + " : " + std.roue : ""} onEdit={edit("Roue", "inj.roue", (elementsOf(doc).find(e => e.id === "roue") || {}).opts, { refV: std.roue, free: true })} />
        <Row k="Injecteur" v={inj.injecteur || (turb && turb.slots.map(s => s.inj).filter(Boolean)[0]) || ""} src={inj.injecteur ? FAB : "Turbines"} srcK={inj.injecteur ? "fl" : "tur"} warn={offRef(inj.injecteur, std.injecteur) ? "≠ référence " + gk + " : " + std.injecteur : ""} onEdit={edit("Injecteur", "inj.injecteur", (elementsOf(doc).find(e => e.id === "injecteur") || {}).opts, { refV: std.injecteur, free: true })} />
        <Row k="Bouchages" v={plugCount(L) + " / " + HOLES + " · " + (HOLES - plugCount(L)) + " ouvertures"} src={FAB + " · Turbine"} srcK="fl" onGo={() => { setFabTab("tur"); setIns("launch"); }} />
        <Row k="Turbine installée" v={turb && turb.slots.some(s => s.installee) ? turb.slots.filter(s => s.installee).map(s => fd(s.installee)).join(", ") : ""} src="Turbines" srcK="tur" /></Group>
      <h4 className="pb-h4">Composants installés</h4>
      <Group>{comps.map(c => { if (c.kind === "achat") { const a = achatOfComp(c, scopes); return <Row key={c.id} k={c.label} v={a && !a.none ? a.pos.join(", ") || a.st : ""} bad={a && a.bad} src={"Achats" + (a && !a.none ? " · " + a.st : "")} srcK="ach" />; }
        const v = cv[c.id], ref = refOf(c, gk);
        return <Row key={c.id} k={c.label} v={v === NR ? "Non requis" : v} src={has(v) ? FAB : ""} srcK="fl" warn={offRef(v, ref) ? "≠ référence " + gk + " : " + ref : ""} onEdit={edit(c.label, "comps." + c.id, c.opts, { refV: ref, nr: c.kind === "option", free: true })} />; })}</Group></> },
    { k: "tests", l: "Tests", sub: r.tests ? "du " + fd(r.tests) + (r.testsFin ? " au " + fd(r.testsFin) : "") : "", node: <Group>
      <Row k="Banc" v={r.banc ? "Banc " + r.banc : ""} src="planificateur" srcK="plan" />
      {[["livret", "Livret de configuration"], ["debugCk", "Checklist de debug"], ["freqs", "Fréquences turbines"], ["vibs", "Vibrations"], ["fat", "Tests FAT"]].map(([k, l]) => <Row key={k} k={l} v={tests[k] ? tests[k].v : ""} bad={tests[k] && tests[k].bad} src="fiche de tests" srcK="ts" />)}
      <Row k="Version software" v={design.software} src={design.software ? "CdP" : ""} srcK="cdp" onEdit={edit("Version software", "design.software", [], { sub: "Tests · CdP" })} /></Group> },
    { k: "rai", l: "RAI", sub: "rapport d'acceptation interne · feu vert du départ", node: <>
      <div className="pb-card"><div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><Pill tone={rv.k === "ok" ? "ok" : rv.blocking ? "bad" : rv.k === "reserve" ? "warn" : "neutral"}>{rv.label}</Pill>
        <span className="pp2-sub">{rv.signed} / {rv.signers} signatures · {photos.length} photo{photos.length > 1 ? "s" : ""} · composants pré-remplis par Achats, Turbines et la fiche de lancement de fab</span></div>
        {photos.length > 0 && <div className="pb-thumbs">{photos.slice(0, 6).map(p => { const u = safeImgUrl(p.turl || p.url); return u ? <img key={p.id} src={u} alt={p.shot || "photo"} /> : null; })}</div>}</div>
      <button type="button" className="pb-open" onClick={() => setIns("rai")}>Ouvrir le RAI <span aria-hidden="true">↗</span></button></> },
    { k: "depart", l: "Départ", sub: r.depart ? "prévu le " + fd(r.depart) : "", node: <Group>
      <Row k="Départ prévu" v={fd(r.depart)} src="planning" srcK="plan" /><Row k="Feu vert du départ (RAI)" v={rv.label} bad={rv.blocking} src="RAI" srcK="ts" onGo={() => go("rai")} />
      <Row k="Livraison sur site" v={fd(livr)} src={"fiche projet" + (meta.transportJ ? " · transport " + meta.transportJ + " j" : "")} srcK="fp" /></Group> },
    { k: "sav", l: "MES et SAV", sub: "après la livraison", node: <Group>
      <Row k="Mise en service" v={sav.mesDate ? sav.mesDate.v : ""} src={sav.mesDate ? sav.mesDate.src : "SAV / MES"} srcK="sav" />
      <Row k="Dernière intervention" v={sav.lastInter ? sav.lastInter.v : ""} src={sav.lastInter ? sav.lastInter.src : "SAV / MES"} srcK="sav" />
      <Row k="Tickets ouverts" v={sav.ticketsOpen ? sav.ticketsOpen.v : "0"} bad={!!sav.ticketsOpen} src="SAV / MES" srcK="sav" />
      {Object.entries(sav).filter(([, x]) => x && x.sav).map(([k, x]) => <Row key={k} k={"Pièce changée : " + (((elementsOf(doc).find(e => e.id === k)) || {}).label || k)} v={x.v} src={x.src} srcK="sav" />)}</Group> },
    { k: "hist", l: "Historique", node: <History P={P0} doc={doc} L={L} /> },
  ];
  const N = pages.length;
  // ── tourner les pages (positions en pages ; 0 = couverture)
  const bookRef = useRef(null), pageRefs = useRef([]), pos = useRef(0), anim = useRef(0), drag = useRef(null);
  const [cur, setCur] = useState(0);
  const paint = useCallback(() => {
    const rm = reduced();
    pageRefs.current.forEach((el, i) => { if (!el) return; const d = i - pos.current;
      el.style.transform = rm ? "translateX(" + d * 100 + "%)" : d <= 0 ? "translateX(" + Math.max(-1.2, d) * 100 + "%) rotateY(" + Math.max(-1, d) * 28 + "deg)" : "translateX(" + Math.min(1.2, d) * 100 + "%) scale(" + (1 - Math.min(1, d) * 0.06) + ")";
      el.style.opacity = String(rm ? (Math.abs(d) < 0.5 ? 1 : 0) : Math.max(0, 1 - Math.abs(d) * 0.55)); el.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      el.style.visibility = Math.abs(d) > 1.5 ? "hidden" : "visible"; el.setAttribute("aria-hidden", Math.abs(d) < 0.5 ? "false" : "true"); el.inert = Math.abs(d) >= 0.5; });
    const c = Math.max(0, Math.min(N - 1, Math.round(pos.current))); setCur(x => (x === c ? x : c));
  }, [N]);
  const goI = useCallback((to, v0) => {
    to = Math.max(0, Math.min(N - 1, to)); cancelAnimationFrame(anim.current);
    if (reduced()) { pos.current = to; paint(); return; }
    let x = pos.current, v = v0 || 0, last = performance.now(); const k = 170, c = 2 * Math.sqrt(k);
    const step = t => { const dt = Math.min(0.032, (t - last) / 1000); last = t; v += (-k * (x - to) - c * v) * dt; x += v * dt; pos.current = x; paint();
      if (Math.abs(x - to) < 0.002 && Math.abs(v) < 0.02) { pos.current = to; paint(); return; } anim.current = requestAnimationFrame(step); };
    anim.current = requestAnimationFrame(step);
  }, [N, paint]);
  const keys = pages.map(p => p.k).join(",");
  const go = k => { const i = keys.split(",").indexOf(k); if (i >= 0) goI(i, 0); };
  useEffect(() => { paint(); }, [paint, keys]);
  useEffect(() => () => cancelAnimationFrame(anim.current), []);
  useEffect(() => { pos.current = 0; setCur(0); paint(); setIns(null); setSheet(null); }, [pj]); // eslint-disable-line react-hooks/exhaustive-deps
  const W = () => (bookRef.current ? bookRef.current.clientWidth : 800);
  const onDown = e => { if (e.button !== 0 || ins || sheet) return; drag.current = { x0: e.clientX, y0: e.clientY, p0: pos.current, on: false, h: [[e.clientX, e.timeStamp]], id: e.pointerId }; };
  const onMove = e => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.on) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { d.on = true; cancelAnimationFrame(anim.current); try { bookRef.current.setPointerCapture(d.id); } catch (x) { /* rien */ } bookRef.current.classList.add("pb-dragging"); }
      else if (Math.abs(dy) > 8) { drag.current = null; return; } else return; }
    let p = d.p0 - dx / W(); if (p < 0) p = -(1 - 1 / (1 - p * 0.6)) * 0.5; if (p > N - 1) { const o = p - (N - 1); p = N - 1 + (1 - 1 / (1 + o * 0.6)) * 0.5; }
    pos.current = p; paint(); d.h.push([e.clientX, e.timeStamp]); if (d.h.length > 6) d.h.shift(); };
  const onUp = () => { const d = drag.current; if (!d) return; drag.current = null; if (!d.on) return; bookRef.current.classList.remove("pb-dragging");
    const a = d.h[0], b = d.h[d.h.length - 1], vp = -((b[0] - a[0]) / Math.max(1, b[1] - a[1]) * 1000) / W(), base = Math.round(d.p0);
    goI(Math.max(base - 1, Math.min(base + 1, Math.round(pos.current + vp * 0.18))), vp);
    const stop = ev => { ev.stopPropagation(); ev.preventDefault(); };
    bookRef.current.addEventListener("click", stop, { capture: true, once: true }); setTimeout(() => { if (bookRef.current) bookRef.current.removeEventListener("click", stop, true); }, 60); };
  const wheel = useRef({ acc: 0, t: 0 });
  useEffect(() => { const el = bookRef.current; if (!el) return undefined;
    const h = e => { if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; e.preventDefault(); const w = wheel.current; w.acc += e.deltaX; clearTimeout(w.t);
      if (Math.abs(w.acc) > 60) { goI(Math.round(pos.current) + Math.sign(w.acc), 0); w.acc = 0; } w.t = setTimeout(() => { w.acc = 0; }, 200); };
    el.addEventListener("wheel", h, { passive: false }); return () => el.removeEventListener("wheel", h); }, [goI]);
  const onKey = e => { if (ins || sheet || e.target.closest("input,textarea,select")) return; if (e.key === "ArrowRight") { e.preventDefault(); goI(Math.round(pos.current) + 1, 0); } if (e.key === "ArrowLeft") { e.preventDefault(); goI(Math.round(pos.current) - 1, 0); } };
  const pdfDossier = () => { const w = window.open("", "_blank"); if (!w) return; w.document.open(); w.document.write(dossierHtml({ r, meta, rows, R, photos, std: gk })); w.document.close(); };
  const vars = { "--pp-ink": T.ink900, "--pp-ink7": T.ink700, "--pp-ink5": T.ink500, "--pp-line": T.line, "--pp-card": T.card, "--pp-alt": T.surfaceAlt, "--pp-surf": T.surface,
    "--pp-field": T.fieldLine, "--pp-acc": T.accentInk, "--pp-ok": T.emerald600, "--pp-okbg": T.emerald100, "--pp-bad": T.red600, "--pp-warn": T.amber600, "--pp-on": T.onFill };
  return <section aria-label={"Passeport de " + pj} className="pp2 pb" style={vars}>
    <div className="pb-bar e-tb">
      <b className="pb-bt">{pj}</b>{!canL && <Pill tone="neutral">Lecture seule</Pill>}<span style={{ flex: 1 }} />
      <button type="button" className="pb-nav" onClick={() => goI(cur - 1, 0)} disabled={cur === 0} aria-label="Page précédente">‹</button>
      <span className="pb-pg" aria-live="polite">{cur === 0 ? "Couverture" : "Page " + (cur + 1)} · {cur + 1} / {N}</span>
      <button type="button" className="pb-nav" onClick={() => goI(cur + 1, 0)} disabled={cur === N - 1} aria-label="Page suivante">›</button>
      <button type="button" className="pb-chip" onClick={pdfDossier}>Dossier machine (PDF)</button>
    </div>
    <nav className="pb-chips" aria-label="Pages du passeport">{pages.map((p, i) => <button key={p.k} type="button" className="pb-chip" aria-current={cur === i ? "true" : undefined} onClick={() => goI(i, 0)}>
      <span className="pb-dot" data-st={i === 0 ? "done" : stOf(p.k)} aria-hidden="true" />{p.l}</button>)}</nav>
    <div className="pb-frame">
      <div ref={bookRef} className="pb-book" tabIndex={0} aria-roledescription="livre" aria-label="Passeport, une page par phase : glisser à gauche ou à droite, ou flèches du clavier"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}>
        {pages.map((p, i) => <article key={p.k} ref={el => { pageRefs.current[i] = el; }} className={"pb-page" + (p.k === "cover" ? " pb-cover" : "")} aria-roledescription="page" aria-label={p.l + ", page " + (i + 1) + " sur " + N}>
          <div className="pb-pin">
            {p.k !== "cover" && <><div className="pb-run"><b>{pj} · Passeport machine</b><span>{stOf(p.k) === "done" ? "terminée" : stOf(p.k) === "now" ? "en cours" : ""}</span></div>
              <h3 className="pb-h3">{p.l}</h3>{p.sub && <div className="pp2-sub" style={{ margin: "2px 0 12px" }}>{p.sub}</div>}</>}
            {p.node}
            <div className="pb-foot">{i + 1} / {N}</div>
          </div>
        </article>)}
      </div>
      {sheet && <Sheet s={sheet} onClose={() => setSheet(null)} />}
      {ins === "launch" && <Insert title={FAB + " · " + pj} badge={st.launched ? <Pill tone="ok">Lancée</Pill> : <Pill tone="warn">{st.signed} / {st.total} signatures</Pill>} onClose={() => setIns(null)} tabs={FAB_TABS} tab={fabTab} setTab={setFabTab}>
        <LaunchSheet L={L} saveL={saveL} canL={canL} ro={ro} gk={gk} doc={doc} info={info} ready={ready} comps={comps} scopes={scopes} authorName={authorName} only={fabTab} /></Insert>}
      {ins === "rai" && <Insert title={"RAI · " + pj} badge={<Pill tone={rv.k === "ok" ? "ok" : rv.blocking ? "bad" : "neutral"}>{rv.label}</Pill>} onClose={() => setIns(null)}>
        <RaiView photos={photos} r={r} meta={meta} doc={doc} P={P} R={R} saveRai={next => api.saveRai(pj, next)} savePass={next => api.savePass(pj, next)} canEdit={canEdit} who={authorName} />
        <h4 className="pb-h4" style={{ marginTop: 20 }}>Photos</h4>
        <PhotosView pj={pj} list={photos} api={api} who={authorName} canEdit={canEdit} /></Insert>}
    </div>
  </section>;
}
