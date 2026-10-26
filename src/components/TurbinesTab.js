// v146.26 — Manager › Turbines : pool de turbines 100LT / 20LT, attribution aux PJ ou au SAV (tableau glisser-déposer), roue et injecteur,
// import du fichier du responsable turbines ou de l'export, stock à venir par semaine. Les données vivent dans planning/turbines (un seul document).
import React, { useMemo, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { getPjMeta } from "../pjMeta";
import { toLocalISO } from "../parsers";
import { useSheetJS, NavIcon } from "./SharedUI";
import { CARD, H_TITLE, H_SUB } from "./ManagerParts";
import { TurbineBoard } from "./TurbineBoard";
import { TURBINE_TYPES, TYPE_LABEL, parseTurbineRows, parseBossRows, isBossId, dropLoose, turbinesNeeded, mergeImport, exportRows, stampExport, planningNeeds, pendingShare, markShared, shareMessage, autoRef, withMad, makeTurbine, stockByWeek, takenNames, targetLabel, isFree, byMad, mondayOf, addDays, isoOf, weekLabel, fmtFr, isoWeek } from "../turbines";

const todayIso = () => isoOf(new Date());
const dIso = x => { if (!x) return ""; const d = new Date(x); return isNaN(d) ? "" : toLocalISO(d); };

export function TurbinesTab({ doc, save, data, authorName, superAdmin }) {
  const turbines = useMemo(() => doc.turbines || [], [doc.turbines]), wheelNames = doc.wheelNames || [], injectorNames = doc.injectorNames || [];
  const savProjects = useMemo(() => Array.isArray(doc.savProjects) ? doc.savProjects : [], [doc.savProjects]);
  const savMeta = useMemo(() => doc.savMeta && typeof doc.savMeta === "object" ? doc.savMeta : {}, [doc.savMeta]);
  const [sheetSel, setSheetSel] = useState(""), [attachBoss, setAttachBoss] = useState(false);
  const looseEls = useMemo(() => Array.isArray(doc.looseEls) ? doc.looseEls : [], [doc.looseEls]);
  const ready = useSheetJS();
  const [filter, setFilter] = useState("all"), [typeF, setTypeF] = useState("all");
  const [pending, setPending] = useState(null), [msg, setMsg] = useState(null), [adding, setAdding] = useState(null);
  const [removeAbs, setRemoveAbs] = useState(false), [plan, setPlan] = useState(null), [copied, setCopied] = useState(false);
  const installed = useMemo(() => Array.isArray(doc.installedPj) ? doc.installedPj : [], [doc.installedPj]);
  const today = todayIso();

  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE"), [data]);
  const rowOf = pj => rows.find(r => r.pj === pj);
  const commit = async next => { const ok = await save({ ...doc, ...next }); if (ok === false) setMsg({ err: true, t: "L'enregistrement a échoué." }); return ok; };
  const upd = (id, patch) => commit({ turbines: turbines.map(t => t.id === id ? { ...t, ...patch } : t) });

  // ── Import Excel : reconnaît l'export de l'outil (colonne Réf./Type) ou le fichier du responsable turbines (Projet | Modèle | Échéance | Livraison Sxx…)
  const normH = v => String(v == null ? "" : v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const looksBoss = rowsX => { const head = rowsX.slice(0, 8).some(r => Array.isArray(r) && r.some(c => /^projet$/.test(normH(c))) && r.some(c => /livraison|modele/.test(normH(c)))); return head || (rowsX.filter(r => Array.isArray(r) && isBossId(r[0])).length >= 2 && !rowsX.slice(0, 8).some(r => Array.isArray(r) && r.some(c => /^type$/.test(normH(c))))); };
  const pickSheet = names => names.find(n => /dates?[_ ]?livraison[_ ]turbines/i.test(n)) || names.filter(n => /^import[_ ]?s\d+/i.test(n)).sort((a, b) => (+b.replace(/\D/g, "")) - (+a.replace(/\D/g, "")))[0] || names[0];
  const onFile = async f => {
    setMsg(null);
    try {
      if (!window.XLSX) { setMsg({ err: true, t: "Librairie Excel en cours de chargement, réessayez dans 2 s." }); return; }
      const wb = window.XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true });
      const sheets = {}; wb.SheetNames.forEach(n => { sheets[n] = window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true }); });
      const names = wb.SheetNames, first = looksBoss(sheets[names[0]] || []) || names.some(n => looksBoss(sheets[n])) ? pickSheet(names.filter(n => looksBoss(sheets[n]))) : names[0];
      setSheetSel(first); setAttachBoss(false); setRemoveAbs(looksBoss(sheets[first] || [])); setPending({ name: f.name, sheets, names });
    } catch (e) { setMsg({ err: true, t: "Lecture impossible : " + e.message }); }
  };
  const parsedFile = useMemo(() => {
    if (!pending) return null;
    const rowsX = pending.sheets[sheetSel] || [];
    if (!looksBoss(rowsX)) return { ...parseTurbineRows(rowsX), boss: false };
    const pjIds = new Set(rows.map(r => String(r.pj).toUpperCase()));
    const typeOf = (id, target) => {
      const ex = turbines.find(t => t.ref && t.ref.toLowerCase() === String(id).toLowerCase()); if (ex) return ex.type;
      const r = target && target.kind === "PJ" ? rows.find(x => String(x.pj).toUpperCase() === target.ref) : null;
      const n = r && turbinesNeeded(r.gamme); return n ? n.type : null;
    };
    // Projets déjà expédiés / installés, et anciennes livraisons dont le projet n'est plus au planning : pas de turbine à suivre
    const gone = new Set([...rows.filter(r => r.etat === "SHIPPED").map(r => String(r.pj).toUpperCase()), ...installed.map(x => String(x).toUpperCase())]);
    const skip = (target, mad) => !target ? false : target.kind === "PJ" ? (gone.has(target.ref) || (!pjIds.has(target.ref) && mad < today)) : (mad < today && !savProjects.includes(target.ref));
    return { ...parseBossRows(rowsX, { pjIds, typeOf, skip }, new Date()), boss: true };
  }, [pending, sheetSel, rows, turbines, installed, savProjects, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = useMemo(() => parsedFile ? mergeImport(turbines, parsedFile.items, { removeFreeAbsent: removeAbs, attach: !(parsedFile.boss && !attachBoss) }) : null, [parsedFile, turbines, removeAbs, attachBoss]);
  const confirmImport = async () => {
    const r = preview, patch = { turbines: r.turbines, importedAt: new Date().toISOString(), importedBy: authorName || "", importFile: pending.name + (parsedFile.boss ? " (" + sheetSel + ")" : "") };
    const addSavs = (r.newSav || []).filter(n => !savProjects.some(x => x.toLowerCase() === n.toLowerCase()));
    if (addSavs.length) patch.savProjects = [...savProjects, ...addSavs];
    const ok = await commit(patch);
    if (ok !== false) { setMsg({ t: "Pool mis à jour : " + r.stats.added + " ajoutée(s), " + r.stats.updated + " modifiée(s), " + r.stats.removed + " retirée(s)" + (addSavs.length ? ", " + addSavs.length + " projet(s) SAV créé(s)" : "") + ". Les attributions, roues et injecteurs existants n'ont pas bougé." }); setPending(null); setRemoveAbs(false); }
  };
  // Export : toutes les turbines + attribution ; les dates exportées deviennent la référence du prochain import (la correction faite ici n'est alors jamais écrasée par un fichier inchangé)
  const doExport = async () => {
    if (!window.XLSX) return;
    const ws = window.XLSX.utils.aoa_to_sheet(exportRows(turbines, today), { cellDates: true });
    ws["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 9 }, { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
    for (let i = 1; i <= turbines.length; i++) ["D", "E", "H"].forEach(col => { const c = ws[col + (i + 1)]; if (c && c.t === "d") c.z = "dd/mm/yyyy"; });
    const wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, "Turbines");
    window.XLSX.writeFile(wb, "Dates_livraison_turbines_" + today + ".xlsx");
    await commit({ turbines: stampExport(turbines) });
    setMsg({ t: "Export réalisé au format du fichier du responsable turbines : la colonne « Livraison » porte vos nouvelles MàD (ancienne date et repère « modifiée » à côté). Vous pouvez aussi le ré-importer ici sans rien écraser." });
  };
  // Pré-remplissage depuis le planning : une turbine par besoin (gamme), datée de l'arrivée de l'ORC
  const doneRow = r => r.etat === "SHIPPED" || installed.includes(r.pj);
  const openPlan = () => { setMsg(null); const items = planningNeeds(rows.map(r => ({ ...r, arrivee: dIso(r.arrivee), tests: dIso(r.tests) })), turbines, doneRow); if (!items.length) { setMsg({ t: "Rien à pré-remplir : tous les besoins du planning sont déjà couverts." }); return; } setPlan(items); };
  const confirmPlan = async () => {
    const made = []; plan.forEach(p => made.push({ ...makeTurbine({ type: p.type, mad: p.mad, origin: p.origin, ref: autoRef(turbines, p.type, made) }), madSrc: p.mad }));
    const ok = await commit({ turbines: [...turbines, ...made].sort(byMad) });
    if (ok !== false) { setMsg({ t: made.length + " estimation(s) créée(s) d'après le planning (hors stock, listées sous les stocks). Le stock réel et à venir vient du fichier du responsable." }); setPlan(null); }
  };
  const addForm = async e => {
    e.preventDefault(); if (!adding.mad) return;
    const n = Math.max(1, Math.min(50, Math.round(+adding.qty) || 1)), made = [];
    for (let i = 0; i < n; i++) made.push({ ...makeTurbine({ type: adding.type, mad: adding.mad, ref: n === 1 && adding.ref ? adding.ref : autoRef(turbines, adding.type, made) }), madSrc: adding.mad });
    const ok = await commit({ turbines: [...turbines, ...made].sort(byMad) }); if (ok !== false) setAdding(null);
  };
  // À communiquer au responsable turbines
  const toShare = pendingShare(turbines).sort(byMad);
  const copyShare = async () => { try { await navigator.clipboard.writeText(shareMessage(turbines, today)); setCopied(true); setTimeout(() => setCopied(false), 3000); } catch (e) { window.prompt("Copiez le message :", shareMessage(turbines, today)); } };

  // ── Stock à venir : de la semaine courante jusqu'à la dernière MàD connue (fichier du responsable, jusqu'en mars), 12 semaines au minimum
  const mondays = useMemo(() => {
    const m0 = mondayOf(new Date());
    const last = turbines.filter(t => t.mad && !(isFree(t) && t.origin)).reduce((a, t) => t.mad > a ? t.mad : a, "");
    const n = last ? Math.ceil((new Date(last).getTime() - m0.getTime()) / 6048e5) + 1 : 0;
    return Array.from({ length: Math.min(52, Math.max(12, n)) }, (_, i) => addDays(m0, i * 7));
  }, [turbines]);
  const stock = useMemo(() => stockByWeek(turbines.filter(t => !(isFree(t) && t.origin)), mondays), [turbines, mondays]);

  const list = turbines.filter(t => (typeF === "all" || t.type === typeF) && (filter === "all" || (filter === "free" ? isFree(t) : !isFree(t)))).sort(byMad);

  // ── styles
  const sel = { fontFamily: T.font, fontSize: FZ.xs, color: T.ink900, background: T.surface, border: "1px solid " + T.line, borderRadius: 8, padding: "4px 6px", maxWidth: "100%" };
  const btn = (on, primary) => ({ border: "1px solid " + (primary ? T.navy700 : on ? T.teal500 : T.line), background: primary ? T.navy700 : on ? T.teal100 : T.card, color: primary ? "#fff" : on ? T.teal600 : T.ink700, borderRadius: 999, padding: "5px 12px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font });
  const th = { textAlign: "left", padding: "7px 8px", fontSize: FZ.xs, fontWeight: 700, color: T.ink500, background: T.surfaceAlt, whiteSpace: "nowrap" };
  const td = { padding: "6px 8px", borderTop: "1px solid " + T.line, verticalAlign: "top", fontSize: FZ.sm };
  const warn = t => <span key={t} style={{ display: "inline-block", fontSize: FZ.xs, fontWeight: 700, color: T.amber600, background: T.amber100, borderRadius: 999, padding: "1px 8px", marginRight: 4, marginTop: 3 }}><NavIcon name="warning" size={12}/> {t}</span>;

  const targetSel = t => {
    const inList = t.target && t.target.kind === "SAV" && savProjects.includes(t.target.ref);
    const legacySav = t.target && t.target.kind === "SAV" && !inList;
    const val = !t.target ? "" : t.target.kind === "SAV" ? (inList ? "SAVP:" + t.target.ref : "SAV") : "PJ:" + t.target.ref;
    const mine = rows.filter(r => r.etat !== "SHIPPED" || (t.target && t.target.ref === r.pj));
    const digits = t.type.replace("LT", "");
    const match = mine.filter(r => String(r.gamme || "").startsWith(digits)), other = mine.filter(r => !String(r.gamme || "").startsWith(digits));
    const opt = r => <option key={r.pj} value={"PJ:" + r.pj}>{r.pj} · {getPjMeta(r.pj, r).nomProjet || r.gamme || ""}</option>;
    return <div>
      <select value={val} aria-label={"Attribution de la turbine " + (t.ref || t.id)} onChange={e => {
        const v = e.target.value;
        upd(t.id, v === "" ? { target: null, wheel: { ...t.wheel, ok: false }, injector: { ...t.injector, ok: false } } : v.startsWith("SAVP:") ? { target: { kind: "SAV", ref: v.slice(5) } } : v === "SAV" ? { target: { kind: "SAV", ref: "" } } : { target: { kind: "PJ", ref: v.slice(3) } });
      }} style={{ ...sel, minWidth: 150, fontWeight: t.target ? 700 : 500 }}>
        <option value="">— Libre (dans le pool) —</option>
        {match.length > 0 && <optgroup label={"PJ en " + t.type}>{match.map(opt)}</optgroup>}
        {other.length > 0 && <optgroup label="Autres PJ">{other.map(opt)}</optgroup>}
        <optgroup label="Projets SAV">
          {savProjects.map(n => <option key={n} value={"SAVP:" + n}>SAV · {n}</option>)}
          {legacySav && <option value="SAV">SAV{t.target.ref ? " · " + t.target.ref : ""} (hors liste)</option>}
        </optgroup>
      </select>
      {legacySav && <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        <input value={t.target.ref} onChange={e => upd(t.id, { target: { kind: "SAV", ref: e.target.value } })} placeholder="Client / n° SAV" aria-label="Précision SAV" style={{ ...sel, flex: 1, minWidth: 0, boxSizing: "border-box" }} />
      </div>}
    </div>;
  };

  const elementCell = (t, kind, names) => {
    const e = t[kind] || { name: "", ok: false };
    const taken = takenNames(turbines, kind, t.id);
    const label = kind === "wheel" ? "Roue" : "Injecteur";
    return <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="checkbox" checked={!!e.ok} disabled={!e.name || (!e.ok && taken.has(e.name))} onChange={ev => upd(t.id, { [kind]: { ...e, ok: ev.target.checked } })} aria-label={label + " réservée pour cette turbine"} title={e.ok ? "Décocher libère cet élément pour autre chose" : "Cocher quand on a la " + label.toLowerCase() + " pour cette turbine"} style={{ accentColor: T.teal600, width: 16, height: 16 }} />
      <select value={e.name || ""} onChange={ev => commit({ turbines: turbines.map(x => x.id === t.id ? { ...x, [kind]: { name: ev.target.value, ok: ev.target.value === e.name ? e.ok : false } } : x), looseEls: dropLoose(looseEls, kind, ev.target.value) })} aria-label={label + " — nom"} style={{ ...sel, minWidth: 96 }}>
        <option value="">—</option>
        {names.map(n => { const o = taken.get(n); return <option key={n} value={n} disabled={!!o}>{n}{o ? " (prise : " + (targetLabel(o) || o.ref || "autre turbine") + ")" : ""}</option>; })}
        {e.name && !names.includes(e.name) && <option value={e.name}>{e.name}</option>}
      </select>
    </div>;
  };

  const needs = t => {
    if (!t.target || t.target.kind !== "PJ") return null;
    const r = rowOf(t.target.ref); if (!r) return <span style={{ color: T.ink300, fontSize: FZ.xs }}>PJ introuvable</span>;
    const tests = dIso(r.tests), dep = dIso(r.depart), soon = isoOf(addDays(new Date(), 14));
    const W = [];
    if (t.mad && tests && t.mad > tests) W.push("MàD après le début des tests");
    if (tests && tests <= soon && !(t.wheel && t.wheel.ok)) W.push("Roue à sécuriser");
    if (dep && dep <= soon && !(t.injector && t.injector.ok)) W.push("Injecteur à sécuriser");
    return <div style={{ fontSize: FZ.xs, color: T.ink500, lineHeight: 1.4 }}>
      {tests ? <div>Tests {fmtFr(tests)} <span style={{ color: T.ink300 }}>(S{isoWeek(new Date(tests)).week})</span></div> : null}
      {dep ? <div>Départ {fmtFr(dep)}</div> : null}
      {W.map(warn)}
    </div>;
  };

  return (<div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: T.font }}>
    {/* En-tête + actions */}
    <div style={{ ...CARD, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px" }}>
          <div style={H_TITLE}>Pool de turbines</div>
          <div style={H_SUB}>Turbines 100 kW (gammes 100 et 180) et 20 kW (gammes 20 et 40) à attribuer aux PJ ou au SAV. La roue s'installe juste avant les tests ; l'injecteur est à part mais doit être disponible pour le départ.{doc.importedAt ? " Dernier import : " + new Date(doc.importedAt).toLocaleDateString("fr-FR") + (doc.importedBy ? " par " + doc.importedBy : "") + (doc.importFile ? " (" + doc.importFile + ")" : "") + "." : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ ...btn(false, true), display: "inline-flex", alignItems: "center", gap: 6 }}>
            Importer l'Excel (responsable turbines ou export)
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; e.target.value = ""; if (f) onFile(f); }} />
          </label>
          <button onClick={doExport} disabled={!ready} style={btn(false)} title="Fichier au format du responsable turbines, avec vos nouvelles MàD">Exporter pour le responsable</button>
          <button onClick={openPlan} style={btn(!!plan)} title="Crée des turbines ESTIMÉES (besoins) d'après les gammes et les arrivées du planning : elles ne comptent pas dans le stock">Estimer les besoins depuis le planning</button>
          <button onClick={() => setAdding(adding ? null : { type: "100LT", mad: today, ref: "", qty: 1 })} style={btn(!!adding)}>＋ Turbines</button>
        </div>
      </div>
      {msg && <div role="status" style={{ marginTop: 10, fontSize: FZ.xs, fontWeight: 700, color: msg.err ? T.red600 : T.emerald600 }}>{msg.t}</div>}
      {pending && parsedFile && <div style={{ marginTop: 12, padding: 12, border: "1px solid " + T.line, borderRadius: 10, background: T.surface }}>
        <div style={{ fontSize: FZ.sm, fontWeight: 700 }}>{pending.name} : {parsedFile.items.length} ligne(s) lue(s) — {preview.stats.added} nouvelle(s), {preview.stats.updated} modifiée(s), {parsedFile.items.length - preview.stats.added} retrouvée(s)</div>
        {pending.names.length > 1 && <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: FZ.xs, color: T.ink700, marginTop: 6 }}>Feuille lue
          <select value={sheetSel} onChange={e => setSheetSel(e.target.value)} aria-label="Feuille à importer" style={sel}>{pending.names.map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
        {parsedFile.boss
          ? <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 4 }}>Fichier du responsable turbines reconnu : une turbine par ligne, MàD = dernière date de livraison, échéance du fichier conservée (retard affiché). Les turbines déjà livrées (MàD passée) vont dans le <b>stock réel</b>, les autres dans le <b>stock à venir</b> ; les projets expédiés / installés sont ignorés. Celles déjà dans l'outil ne changent que de date (<b>attributions, roues et injecteurs jamais touchés</b>).<div style={{ marginTop: 4, color: T.ink900, fontWeight: 700 }}>Stock après import : {preview.turbines.filter(t => !t.target && t.mad && t.mad <= today).length} en stock réel · {preview.turbines.filter(t => !t.target && (!t.mad || t.mad > today)).length} à venir (libres)</div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, cursor: "pointer", color: T.ink700 }}><input type="checkbox" checked={attachBoss} onChange={e => setAttachBoss(e.target.checked)} style={{ accentColor: T.teal600 }} />Rattacher aussi chaque nouvelle turbine au PJ / SAV du fichier (sinon elles arrivent libres : à glisser vers le bon PJ ; leur réf. rappelle le PJ prévu)</label></div>
          : <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 4 }}>Les lignes retrouvées (colonne Id, sinon Réf.) ne changent que de type / date de MàD : <b>attributions, roues et injecteurs ne sont jamais touchés</b>. Une date corrigée ici est conservée si la date du fichier n'a pas changé depuis le dernier export.</div>}
        {parsedFile.boss && parsedFile.guessed > 0 && <div style={{ fontSize: FZ.xs, color: T.amber600, marginTop: 6, fontWeight: 700 }}><NavIcon name="warning" size={12}/> {parsedFile.guessed} ligne(s) sans modèle ni gamme connue : type 100 kW par défaut (à corriger dans le détail).</div>}
        {parsedFile.boss && parsedFile.unspecified > 0 && <div style={{ fontSize: FZ.xs, color: T.amber600, marginTop: 4, fontWeight: 700 }}><NavIcon name="warning" size={12}/> {parsedFile.unspecified} ligne(s) « SAV » sans numéro : créées libres, à rattacher à un SAVxxx.</div>}
        {parsedFile.boss && parsedFile.skipped > 0 && <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 4 }}>{parsedFile.skipped} ligne(s) ignorée(s) : projet expédié / installé ou ancienne livraison sans projet en cours.</div>}
        {parsedFile.boss && parsedFile.noDate > 0 && <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 4 }}>{parsedFile.noDate} ligne(s) ignorée(s) : pas encore de date de livraison.</div>}
        {preview.conflicts.length > 0 && <div style={{ fontSize: FZ.xs, color: T.amber600, marginTop: 6, fontWeight: 700 }}><NavIcon name="warning" size={12}/> Date modifiée des deux côtés (celle du fichier est retenue) : {preview.conflicts.slice(0, 6).map(c => c.ref + " " + fmtFr(c.live) + " → " + fmtFr(c.file)).join(" ; ")}{preview.conflicts.length > 6 ? " …" : ""}</div>}
        {preview.absent.length > 0 && <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink700, marginTop: 6, cursor: "pointer" }}><input type="checkbox" checked={removeAbs} onChange={e => setRemoveAbs(e.target.checked)} style={{ accentColor: T.teal600 }} />Retirer aussi les {preview.absent.length} turbine(s) libre(s) absentes du fichier (le stock reflète alors exactement le fichier)</label>}
        {parsedFile.errors.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: FZ.xs, color: T.red600 }}>{parsedFile.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}{parsedFile.errors.length > 8 && <li>… et {parsedFile.errors.length - 8} autre(s)</li>}</ul>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={confirmImport} disabled={!parsedFile.items.length} style={btn(false, true)}>Mettre à jour le pool</button>
          <button onClick={() => { setPending(null); setRemoveAbs(false); }} style={btn(false)}>Annuler</button>
        </div>
      </div>}
      {adding && <form onSubmit={addForm} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select value={adding.type} onChange={e => setAdding({ ...adding, type: e.target.value })} style={sel} aria-label="Type">{TURBINE_TYPES.map(x => <option key={x}>{x}</option>)}</select>
        <input type="date" value={adding.mad} onChange={e => setAdding({ ...adding, mad: e.target.value })} aria-label="Date de MàD" style={{ ...sel, colorScheme: T.mode === "dark" ? "dark" : "light" }} />
        <input type="number" min={1} max={50} value={adding.qty} onChange={e => setAdding({ ...adding, qty: e.target.value })} aria-label="Nombre de turbines" title="Nombre de turbines" style={{ ...sel, width: 64 }} />
        <input value={adding.ref} onChange={e => setAdding({ ...adding, ref: e.target.value })} placeholder="Réf. (si 1 seule, facultatif)" aria-label="Référence" style={sel} />
        <button type="submit" style={btn(false, true)}>Ajouter</button>
      </form>}
      {plan && <div style={{ marginTop: 12, padding: 12, border: "1px solid " + T.line, borderRadius: 10, background: T.surface }}>
        <div style={{ fontSize: FZ.sm, fontWeight: 700 }}>{plan.length} besoin(s) estimé(s) d'après le planning — {TURBINE_TYPES.map(ty => plan.filter(i => i.type === ty).length + " × " + TYPE_LABEL[ty]).join(", ")}</div>
        <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 4 }}>Une estimation par besoin non couvert (1 ou 2 selon la gamme), datée de l'<b>arrivée de l'ORC</b>. Ce sont des <b>besoins, pas des appros</b> : elles n'entrent pas dans le stock réel ni à venir et sont rangées dans une zone à part ; le stock vient du fichier du responsable turbines.</div>
        <div style={{ fontSize: FZ.xs, color: T.ink700, marginTop: 6 }}>{plan.slice(0, 8).map(p => p.origin + " · " + TYPE_LABEL[p.type] + " · " + fmtFr(p.mad)).join("  |  ")}{plan.length > 8 ? "  | …" : ""}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}><button onClick={confirmPlan} style={btn(false, true)}>Créer ces turbines</button><button onClick={() => setPlan(null)} style={btn(false)}>Annuler</button></div>
      </div>}
    </div>

    {/* À communiquer au responsable turbines */}
    {toShare.length > 0 && <div style={{ ...CARD, padding: 14, borderLeft: "4px solid " + T.amber600 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px" }}><div style={H_TITLE}>À communiquer au responsable turbines ({toShare.length})</div>
          <div style={H_SUB}>Ces attributions n'ont pas encore été transmises : tant qu'il ne les connaît pas, il peut réutiliser la turbine, la roue ou l'injecteur ailleurs.</div></div>
        <button onClick={copyShare} style={btn(copied, false)}>{copied ? "Message copié ✓" : "Copier le message"}</button>
        <button onClick={doExport} disabled={!ready} style={btn(false)} title="Fichier au format du responsable turbines, avec vos nouvelles MàD">Exporter pour le responsable</button>
        <button onClick={() => { if (window.confirm("Marquer ces " + toShare.length + " attribution(s) comme communiquées ?")) commit({ turbines: markShared(turbines) }); }} style={btn(false, true)}>C'est communiqué</button>
      </div>
      <pre style={{ margin: "10px 0 0", whiteSpace: "pre-wrap", fontFamily: T.font, fontSize: FZ.xs, color: T.ink700, background: T.surface, borderRadius: 8, padding: "8px 10px", maxHeight: 160, overflow: "auto" }}>{shareMessage(turbines, today)}</pre>
    </div>}

    {/* v146.24 : tableau d'attribution par glisser-déposer */}
    <TurbineBoard installed={installed} turbines={turbines} rows={rows} savProjects={savProjects} savMeta={savMeta} looseEls={looseEls} wheelNames={wheelNames} injectorNames={injectorNames} today={today} commit={commit} superAdmin={superAdmin} />

    {/* Stock à venir par semaine */}
    <div style={{ ...CARD, padding: 14, overflowX: "auto" }}>
      <div style={H_TITLE}>Stock à venir par semaine</div>
      <div style={H_SUB}>Appros réellement connus (fichier du responsable, saisie) : « Libres » = turbines dont la MàD est passée ou tombe cette semaine-là et qui ne sont attribuées à personne (cumul). Les estimations du planning n'y figurent pas.</div>
      <table style={{ borderCollapse: "collapse", marginTop: 10, minWidth: 640, width: "100%" }}>
        <thead><tr><th style={th}></th>{mondays.map(m => <th key={m.getTime()} style={{ ...th, textAlign: "center" }}>S{isoWeek(m).week}<div style={{ fontWeight: 500, color: T.ink300 }}>{String(m.getDate()).padStart(2, "0") + "/" + String(m.getMonth() + 1).padStart(2, "0")}</div></th>)}</tr></thead>
        <tbody>{TURBINE_TYPES.map(ty => [["arrivent", "Arrivent"], ["libres", "Libres (cumul)"], ["attribuees", "Attribuées (cumul)"]].map(([k, l], i) => <tr key={ty + k}>
          <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap", color: k === "libres" ? T.teal600 : T.ink700 }}>{i === 0 ? ty + " · " : "       "}{l}</td>
          {stock[ty].map((c, j) => <td key={j} style={{ ...td, textAlign: "center", fontWeight: k === "libres" ? 800 : 500, color: c[k] ? (k === "libres" ? T.teal600 : T.ink900) : T.ink300 }}>{c[k] || "·"}</td>)}
        </tr>))}</tbody>
      </table>
    </div>

    {/* Turbines : détail et édition (réf., date, suppression) — repli par défaut, sert aussi de solution de rechange sans glisser-déposer */}
    <details style={{ ...CARD, overflow: "hidden" }}>
      <summary style={{ cursor: "pointer", padding: "12px 14px", fontWeight: 700, fontSize: FZ.sm, color: T.ink900 }}>Détail et édition des turbines <span style={{ fontWeight: 500, color: T.ink500 }}>— réf., dates de MàD, attribution par liste, suppression</span></summary>
      <div style={{ padding: "12px 14px 8px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}><div style={H_TITLE}>Turbines et attributions</div><div style={H_SUB}>Attribuer ou ré-attribuer en direct : choisir « Libre » remet la turbine (et sa roue / son injecteur) dans le pool.</div></div>
        {[["all", "Toutes"], ["free", "Libres"], ["alloc", "Attribuées"]].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} style={btn(filter === k)}>{l}</button>)}
        <span style={{ width: 1, height: 18, background: T.line }} />
        {[["all", "100 + 20"], ...TURBINE_TYPES.map(x => [x, x])].map(([k, l]) => <button key={k} onClick={() => setTypeF(k)} style={btn(typeF === k)}>{l}</button>)}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 860 }}>
          <thead><tr>{["Type", "Réf.", "MàD", "Attribuée à", "Besoin du PJ", "Roue (☑ réservée)", "Injecteur (☑ réservé)", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map(t => <tr key={t.id} style={{ background: isFree(t) ? "transparent" : T.surface }}>
              <td style={{ ...td, fontWeight: 800 }}>{t.type}</td>
              <td style={td}><input defaultValue={t.ref} key={t.id + t.ref} placeholder="—" aria-label="Référence" onBlur={e => { if (e.target.value.trim() !== t.ref) upd(t.id, { ref: e.target.value.trim() }); }} style={{ ...sel, width: 84 }} /></td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>
                <input type="date" value={t.mad || ""} onChange={e => commit({ turbines: turbines.map(x => x.id === t.id ? withMad(x, e.target.value) : x) })} aria-label="Date de MàD" style={{ ...sel, colorScheme: T.mode === "dark" ? "dark" : "light" }} />
                <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 2 }}>{weekLabel(t.mad)}{t.mad && t.mad > today ? " · à venir" : t.mad ? " · disponible" : ""}</div>
              </td>
              <td style={td}>{targetSel(t)}</td>
              <td style={td}>{needs(t)}</td>
              <td style={td}>{elementCell(t, "wheel", wheelNames)}</td>
              <td style={td}>{elementCell(t, "injector", injectorNames)}</td>
              <td style={{ ...td, textAlign: "right" }}>{superAdmin && <button onClick={() => { if (window.confirm("Supprimer cette turbine du pool ?")) commit({ turbines: turbines.filter(x => x.id !== t.id) }); }} aria-label="Supprimer la turbine" title="Supprimer" style={{ border: "none", background: "transparent", color: T.red600, cursor: "pointer", fontSize: FZ.md }}>×</button>}</td>
            </tr>)}
            {!list.length && <tr><td colSpan={8} style={{ ...td, color: T.ink500, textAlign: "center", padding: 22 }}>{turbines.length ? "Aucune turbine pour ce filtre." : "Aucune turbine pour l'instant : importez l'Excel ou utilisez « Pré-remplir depuis le planning » ou ajoutez-en une avec « ＋ Turbine »."}</td></tr>}
          </tbody>
        </table>
      </div>
    </details>
  </div>);
}
