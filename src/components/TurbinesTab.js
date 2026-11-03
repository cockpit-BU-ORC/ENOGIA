// v146.26 — Manager › Turbines : pool de turbines 100LT / 20LT, attribution aux PJ ou au SAV (tableau glisser-déposer), roue et injecteur,
// stock à venir par semaine ; v257 : feuille par PJ, plus d'import / export ni de communication au responsable. Les données vivent dans planning/turbines (un seul document).
import React, { useMemo, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { getPjMeta } from "../pjMeta";
import { toLocalISO } from "../parsers";
import { NavIcon } from "./SharedUI";
import { CARD, H_TITLE, H_SUB } from "./ManagerParts";
import { TurbineBoard } from "./TurbineBoard";
import { TURBINE_TYPES, TYPE_LABEL, dropLoose, turbinesNeeded, planningNeeds, autoRef, withMad, makeTurbine, stockByWeek, takenNames, targetLabel, isFree, byMad, mondayOf, addDays, isoOf, weekLabel, fmtFr, isoWeek } from "../turbines";

const todayIso = () => isoOf(new Date());
const dIso = x => { if (!x) return ""; const d = new Date(x); return isNaN(d) ? "" : toLocalISO(d); };

export function TurbinesTab({ doc, save, data, authorName, superAdmin }) {
  const turbines = useMemo(() => doc.turbines || [], [doc.turbines]), wheelNames = doc.wheelNames || [], injectorNames = doc.injectorNames || [];
  const savProjects = useMemo(() => Array.isArray(doc.savProjects) ? doc.savProjects : [], [doc.savProjects]);
  const savMeta = useMemo(() => doc.savMeta && typeof doc.savMeta === "object" ? doc.savMeta : {}, [doc.savMeta]);
  const looseEls = useMemo(() => Array.isArray(doc.looseEls) ? doc.looseEls : [], [doc.looseEls]);
  const [filter, setFilter] = useState("all"), [typeF, setTypeF] = useState("all");
  const [msg, setMsg] = useState(null), [adding, setAdding] = useState(null);
  const [plan, setPlan] = useState(null);
  const installed = useMemo(() => Array.isArray(doc.installedPj) ? doc.installedPj : [], [doc.installedPj]);
  const today = todayIso();

  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE"), [data]);
  const rowOf = pj => rows.find(r => r.pj === pj);
  const commit = async next => { const ok = await save({ ...doc, ...next }); if (ok === false) setMsg({ err: true, t: "L'enregistrement a échoué." }); return ok; };
  const upd = (id, patch) => commit({ turbines: turbines.map(t => t.id === id ? { ...t, ...patch } : t) });

  // v257 (demandé : « enlever la communication au responsable des turbines ainsi que tout système d’import ou d’export pour l’instant ») : import / export Excel retirés.
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
          <div style={H_SUB}>Turbines 100 kW (gammes 100 et 180) et 20 kW (gammes 20 et 40) à attribuer aux PJ ou au SAV. La roue s'installe juste avant les tests ; l'injecteur est à part mais doit être disponible pour le départ.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={openPlan} style={btn(!!plan)} title="Crée des turbines ESTIMÉES (besoins) d'après les gammes et les arrivées du planning : elles ne comptent pas dans le stock">Estimer les besoins depuis le planning</button>
          <button onClick={() => setAdding(adding ? null : { type: "100LT", mad: today, ref: "", qty: 1 })} style={btn(!!adding)}>＋ Turbines</button>
        </div>
      </div>
      {msg && <div role="status" style={{ marginTop: 10, fontSize: FZ.xs, fontWeight: 700, color: msg.err ? T.red600 : T.emerald600 }}>{msg.t}</div>}
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

    {/* v257 : feuille par PJ — turbines, quantité, roues et injecteurs prévus */}
    <PjTurbineSheet rows={rows} doc={doc} commit={commit} installed={installed} wheelNames={wheelNames} injectorNames={injectorNames} />

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

// v257 (demandé : « une feuille dans cet onglet qui me permet de dire, par PJ, quelles turbines on doit mettre, la quantité, la ou les roues
// et le ou les injecteurs ») : une ligne par PJ en cours ; type et quantité proposés d'après la gamme (turbinesNeeded) tant que rien n'est saisi ;
// roues et injecteurs en texte libre (plusieurs séparés par des virgules), avec les noms connus proposés. Données : planning/turbines.pjSheet[PJ].
function PjTurbineSheet({ rows, doc, commit, installed, wheelNames, injectorNames }) {
  const sheet = doc.pjSheet && typeof doc.pjSheet === "object" ? doc.pjSheet : {};
  const [q, setQ] = useState(""), [showDone, setShowDone] = useState(false);
  const list = rows.filter(r => (showDone || (r.etat !== "SHIPPED" && !installed.includes(r.pj))) && (!q || (r.pj + " " + (getPjMeta(r.pj, r).nomProjet || "") + " " + (r.gamme || "")).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => String(a.arrivee || "9").localeCompare(String(b.arrivee || "9")));
  const set = (pj, patch) => { const cur = sheet[pj] || {}, nx = { ...cur, ...patch }; Object.keys(nx).forEach(k => { if (nx[k] === "" || nx[k] == null) delete nx[k]; }); const all = { ...sheet }; if (Object.keys(nx).length) all[pj] = { ...nx, at: new Date().toISOString() }; else delete all[pj]; commit({ pjSheet: all }); };
  const inp = { fontFamily: T.font, fontSize: FZ.sm, color: T.ink900, background: T.card, border: "1px solid " + T.line, borderRadius: 6, padding: "4px 8px", minHeight: 30, boxSizing: "border-box", width: "100%" };
  const th = { textAlign: "left", padding: "8px", fontSize: 12, fontWeight: 500, color: T.ink500, borderBottom: "1px solid " + T.line, whiteSpace: "nowrap", position: "sticky", top: 0, background: T.card, zIndex: 1 };
  const td = { padding: "4px 8px", borderBottom: "1px solid " + T.line, verticalAlign: "middle" };
  const filled = list.filter(r => sheet[r.pj] && (sheet[r.pj].type || sheet[r.pj].wheels || sheet[r.pj].injectors)).length;
  // un champ texte qui n'enregistre qu'à la sortie (pas à chaque frappe)
  const Txt = ({ pj, k, ph, listId }) => <input key={pj + k + (sheet[pj] && sheet[pj][k])} defaultValue={(sheet[pj] && sheet[pj][k]) || ""} placeholder={ph} list={listId} aria-label={k + " " + pj}
    onBlur={e => { const v = e.target.value.trim(); if (v !== ((sheet[pj] && sheet[pj][k]) || "")) set(pj, { [k]: v }); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} style={inp} />;
  return (<section aria-label="Turbines par PJ" style={{ ...CARD, padding: 0, overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px" }}>
      <div style={{ flex: "1 1 320px" }}>
        <div style={H_TITLE}>Turbines par PJ</div>
        <div style={H_SUB}>Pour chaque PJ : le type de turbine, la quantité, la ou les roues et le ou les injecteurs prévus. Plusieurs roues ou injecteurs : séparez-les par des virgules. En gris, la proposition d'après la gamme. {filled} PJ renseigné{filled > 1 ? "s" : ""} sur {list.length}.</div>
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un PJ, un projet…" aria-label="Chercher un PJ" style={{ ...inp, width: 220 }} />
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink700 }}><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />Afficher les PJ expédiés</label>
    </div>
    <datalist id="pjs-wheels">{wheelNames.map(n => <option key={n} value={n} />)}</datalist>
    <datalist id="pjs-injectors">{injectorNames.map(n => <option key={n} value={n} />)}</datalist>
    <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 960, fontVariantNumeric: "tabular-nums" }}>
        <thead><tr><th style={th}>PJ</th><th style={th}>Gamme</th><th style={th}>Arrivée</th><th style={{ ...th, width: 120 }}>Turbine</th><th style={{ ...th, width: 80 }}>Qté</th><th style={{ ...th, minWidth: 180 }}>Roue(s)</th><th style={{ ...th, minWidth: 180 }}>Injecteur(s)</th><th style={{ ...th, minWidth: 160 }}>Note</th></tr></thead>
        <tbody>
          {list.map(r => { const e = sheet[r.pj] || {}, sug = turbinesNeeded(r.gamme), nom = getPjMeta(r.pj, r).nomProjet || ""; return (<tr key={r.pj}>
            <td style={{ ...td, whiteSpace: "nowrap" }}><b style={{ fontFamily: T.fontMono, fontSize: FZ.sm }}>{r.pj}</b> <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{nom}</span></td>
            <td style={{ ...td, fontSize: FZ.sm, color: T.ink700 }}>{r.gamme || "—"}</td>
            <td style={{ ...td, fontSize: FZ.sm, color: T.ink700, whiteSpace: "nowrap" }}>{r.arrivee ? fmtFr(dIso(r.arrivee)) : "—"}</td>
            <td style={td}><select value={e.type || ""} onChange={ev => set(r.pj, { type: ev.target.value })} aria-label={"Turbine " + r.pj} style={{ ...inp, color: e.type ? T.ink900 : T.ink500 }}>
              <option value="">{sug ? sug.type + " (proposé)" : "—"}</option>{TURBINE_TYPES.map(x => <option key={x} value={x}>{x}</option>)}<option value="aucune">Aucune</option></select></td>
            <td style={td}><input type="number" min={0} max={20} key={r.pj + "q" + e.qty} defaultValue={e.qty == null ? "" : e.qty} placeholder={sug ? String(sug.n) : ""} aria-label={"Quantité " + r.pj}
              onBlur={ev => { const v = ev.target.value === "" ? "" : Math.max(0, Math.round(+ev.target.value)); if (v !== (e.qty == null ? "" : e.qty)) set(r.pj, { qty: v }); }} style={inp} /></td>
            <td style={td}><Txt pj={r.pj} k="wheels" ph="ex. R12, R13" listId="pjs-wheels" /></td>
            <td style={td}><Txt pj={r.pj} k="injectors" ph="ex. INJ-04" listId="pjs-injectors" /></td>
            <td style={td}><Txt pj={r.pj} k="note" ph="" /></td>
          </tr>); })}
          {!list.length && <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: T.ink500, padding: 20 }}>Aucun PJ pour ce filtre.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>);
}
