// v393 (maquette v393-passeport-machine.html, piste B « passeport » validée : « Oui lot 1 ») : Manager › Projets › Machines ORC en trois vues.
// v404 (maquette v407-passeport-complet.html validée : « Go, code-la ») : Passeport = le passeport complet d'une machine (PassportFull.js, une
// seule page qui se lit de haut en bas, avec la fiche de lancement de fab) · S/N et états · Réglages du passeport (PassportSettings.js :
// composants, références turbine, dimensions et poids par gamme, choix électriques) — remplace « Standards par gamme ».
import React, { useContext, useMemo, useRef, useState } from "react";
import { MachinesDemoCtx } from "../machinesCtx";
import { T, FZ, btn } from "../theme";
import { getPjMeta, PjPlate } from "../pjMeta";
import { Segmented, useSheetJS } from "./SharedUI";
import { PageGuard } from "./PageGuard";
import { askConfirm } from "../confirm";
import { useMachines, useProdTurbines, useAchats, useTestsDoc, useSav } from "../useAppData";
import { parseConfigTable, parseReference, importPlan } from "../passport";
import { PASS_PHASES, phaseOfEtat } from "../launchFab";
import { PassportBook } from "./PassportBook";
import { PassportSettings } from "./PassportSettings";

const field = () => ({ padding: "4px 8px", minHeight: 32, borderRadius: 8, border: "1px solid " + T.fieldLine, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box" });
const LS = "enogia_mach_sub";
const PH_LABEL = Object.fromEntries(PASS_PHASES);

// galerie ?demo : passeport en mémoire, jamais lu ni écrit dans Firestore (contexte dans machinesCtx.js)
export { MachinesDemoCtx };
export function MachinesHub({ data, canEdit, authorName, serie, certifs }) {
  const [sub, setSubS] = useState(() => { try { const v = localStorage.getItem(LS); return v === "liste" || v === "std" ? v : "pass"; } catch (e) { return "pass"; } });
  const setSub = v => { setSubS(v); try { localStorage.setItem(LS, v); } catch (e) { /* stockage indisponible */ } };
  const demo = useContext(MachinesDemoCtx), live = useMachines(sub !== "liste" && !demo, authorName);
  const { machinesDoc, machinesApi } = demo || live;
  // Turbines, Achats / Appro, Tests et SAV sont lus (lecture seule) pour remplir le passeport
  const liveOn = sub === "pass" && !demo, prod = useProdTurbines(liveOn ? true : null, authorName), ach = useAchats(sub !== "liste" && !demo ? true : null, authorName);
  const tst = useTestsDoc(liveOn ? true : null, authorName), sv = useSav(liveOn ? true : null, authorName);
  const prodDoc = demo ? demo.prodDoc : prod.prodDoc, achatsDoc = demo ? demo.achatsDoc : ach.achatsDoc, testsDoc = demo ? demo.testsDoc : tst.testsDoc, savDoc = demo ? demo.savDoc : sv.savDoc;
  return <div>
    <div className="e-tb" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
      <Segmented label="Vue" size="md" value={sub} onChange={setSub} options={[["pass", "Passeport"], ["liste", "S/N et états"], ["std", "Réglages du passeport"]]} />
      {sub === "pass" && machinesDoc && <span style={{ fontSize: 12, color: T.ink500 }}>Toute la vie de la machine, de l'arrivée dans l'outil au SAV</span>}
    </div>
    {sub === "liste" ? serie : !machinesDoc ? <div style={{ color: T.ink500, fontSize: FZ.sm, padding: 20 }}>Chargement du passeport…</div>
      : sub === "pass" ? <PassportView prodDoc={prodDoc} achatsDoc={achatsDoc} testsDoc={testsDoc} savDoc={savDoc} data={data} doc={machinesDoc} api={machinesApi} canEdit={canEdit} authorName={authorName} certifs={certifs} />
      : <PassportSettings data={data} doc={machinesDoc} api={machinesApi} canEdit={canEdit} achatsDoc={achatsDoc} importer={<ConfigImport doc={machinesDoc} api={machinesApi} authorName={authorName} />} />}
  </div>;
}

// liste des machines (plaque, point rouge = achat en retard, phase en cours) + passeport de la machine choisie
function lateAchat(achatsDoc, pj) {
  if (!achatsDoc) return false;
  const t = new Date().toISOString().slice(0, 10), ids = new Set(Object.values(achatsDoc.projets || {}).filter(f => f && String(f.machine || "").trim() === pj).map(f => f.id));
  if (!ids.size) return false; const po = achatsDoc.po || {};
  return Object.values(achatsDoc.lignes || {}).some(l => { const p = l && ids.has(l.projetId) && l.poId && po[l.poId]; return p && !p.annule && p.statut !== "livre" && p.dateLivraison && String(p.dateLivraison).slice(0, 10) < t; });
}
function PassportView({ data, doc, api, canEdit, authorName, prodDoc, achatsDoc, testsDoc, savDoc, certifs }) {
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE" && !/X{2,}/i.test(r.pj)), [data]);
  const [q, setQ] = useState(""), [scope, setScope] = useState("open"), [sel, setSel] = useState(null);
  const list = rows.filter(r => ((scope === "open" ? r.etat !== "SHIPPED" : r.etat === "SHIPPED") || !!q)
    && (!q || (r.pj + " " + (getPjMeta(r.pj, r).nomProjet || "") + " " + (getPjMeta(r.pj, r).numSerie || "")).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => String(a.pj).localeCompare(String(b.pj), "fr", { numeric: true }));
  const late = useMemo(() => { const m = new Set(); rows.forEach(r => { try { if (lateAchat(achatsDoc, r.pj)) m.add(r.pj); } catch (e) { /* donnée inattendue : ignorée */ } }); return m; }, [rows, achatsDoc]);
  const r = list.find(x => x.pj === sel) || list[0] || null;
  if (!rows.length) return <div style={{ color: T.ink500 }}>Aucune machine dans le planning.</div>;
  return <div className="enogia-pp" style={{ display: "grid", gridTemplateColumns: "minmax(190px, 210px) minmax(0, 1fr)", gap: 0, background: T.card, border: "1px solid " + T.line, borderRadius: 12, minHeight: 480 }}>
    <nav aria-label="Machines" style={{ borderRight: "1px solid " + T.line, padding: 8, display: "flex", flexDirection: "column", gap: 2, maxHeight: "calc(100dvh - 160px)", overflow: "auto", position: "sticky", top: 64, alignSelf: "start" }}>
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="PJ, client, S/N" aria-label="Rechercher une machine" style={{ ...field(), width: "100%", marginBottom: 4 }} />
      <div style={{ marginBottom: 4 }}><Segmented label="Machines" value={scope} onChange={setScope} options={[["open", "En cours"], ["ship", "Expédiées"]]} /></div>
      {list.map(x => { const on = r && x.pj === r.pj;
        return <button key={x.pj} type="button" onClick={() => { setSel(x.pj); try { window.scrollTo({ top: 0 }); } catch (e) { /* rien */ } }} aria-current={on ? "true" : undefined} title={getPjMeta(x.pj, x).nomProjet || undefined}
          style={{ all: "unset", position: "relative", boxSizing: "border-box", cursor: "pointer", borderRadius: 8, padding: "6px", background: on ? T.surfaceAlt : "transparent", display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}>
          <PjPlate pj={x.pj} />
          {late.has(x.pj) && <span aria-label="achat en retard" style={{ width: 8, height: 8, borderRadius: 999, background: T.red600, flexShrink: 0 }} />}
          <span style={{ marginLeft: "auto", fontSize: 12, color: T.ink500, whiteSpace: "nowrap" }}>{PH_LABEL[phaseOfEtat(x.etat)]}</span>
        </button>; })}
      {!list.length && <span style={{ fontSize: 13, color: T.ink500, padding: 8 }}>Aucune machine</span>}
    </nav>
    {r && <div style={{ minWidth: 0 }}><PageGuard key={r.pj} name={"Passeport " + r.pj}><PassportBook data={data} prodDoc={prodDoc} achatsDoc={achatsDoc} testsDoc={testsDoc} savDoc={savDoc} r={r} doc={doc} api={api} canEdit={canEdit} authorName={authorName} certifs={certifs} /></PageGuard></div>}
  </div>;
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

