// v321 (revue, point 7) : les pages de la galerie ?demo et du test des pages — chaque entrée rend une page avec les données d'exemple.
// Ajouter ici toute nouvelle page (une ligne) : elle est alors vérifiée à chaque série de tests et visible dans la galerie.
import React, { useState, useEffect, useMemo } from "react";
import { DEMO_BOOK, DEMO_SAV, DEMO_SAV_DEM, DEMO_ROWS, DEMO_COMMENTS, DEMO_PROGRESS, DEMO_TESTS, DEMO_PROD, DEMO_ME, DEMO_PEOPLE, demoApi, DEMO_CASHIN, demoWeeklyCash } from "./demoData";
import { useListFilters, filterOptions, filterRows } from "../listFilters";
import { DashboardSummary } from "../components/DashboardSummary";
import { TableView } from "../components/TableView";
import { GanttView } from "../components/GanttView";
import { CalendarView } from "../components/CalendarView";
import { CommentsView } from "../components/CommentsView";
import { InboxPage } from "../components/InboxPage";
import { TestsTab, TestDialog } from "../components/TestsTab";
import { testersOf, catalogOf } from "../testPlan";
import { TurbinesHub } from "../components/TurbinesHub";
import { HomeView } from "../components/HomeView";
import { MentionBell } from "../components/MentionBell";
import { SavPage } from "../components/SavPage";
import { WorkshopScreen } from "../components/WorkshopScreen";
import { userKey } from "../mentions";
import { ManagerPanel } from "../components/ManagerPanel";
import { PlannerView } from "../planner/Planner";
import { setOwner, setSuperAdmin } from "../roles";
import { ChangesView } from "../components/ChangesView";
import { summarizeChanges } from "../changeDiff";
import AccessPage from "../components/AccessPage";
import { Achats } from "../components/Achats";
import { ArrangeCtx } from "../components/Arrange";
import { CashInEncaissements } from "../components/CashInEncaissements";
import { CashInWeekly } from "../components/CashInWeekly";
import { setCashinDoc, getCashinDoc } from "../cashinLink";
import { setEncReelle } from "../cashinModel";
import { PjDialog, PjDialogCtx } from "../components/RowDetail";
import { MachinesDemoCtx } from "../machinesCtx";
import { setRaiDoc } from "../raiStatus";
import { RAI_SIGNERS } from "../rai";

const no = () => {}, yes = async () => true;
const common = { comments: DEMO_COMMENTS, addComment: yes, deleteComment: yes, pinOk: true, delays: [], delayTypes: [], setDelayTypes: no, addDelayAllocation: yes, deleteDelayAllocation: yes, addDelayComment: yes, deleteDelayComment: yes, authorName: DEMO_ME.name, savePjMetaOverride: yes, canEditMeta: true };

function Liste() {
  const f = useListFilters(), o = filterOptions(DEMO_ROWS), [df, setDf] = useState("date"), [sel, setSel] = useState(null);
  const rows = filterRows(DEMO_ROWS, f, {});
  return <>
    <DashboardSummary data={rows} allData={DEMO_ROWS} progress={DEMO_PROGRESS} changeLog={[]} onOpenChanges={no} />
    <TableView data={rows} progress={DEMO_PROGRESS} df={df} setDf={setDf} onSetDepart={yes} setEtatFor={no} setClientPresenceFor={no} {...f} {...o} {...common}
      externalSel={sel} setExternalSel={setSel} onlyChanged={false} setOnlyChanged={no} />
  </>;
}
function Gantt() {
  const f = useListFilters(), o = filterOptions(DEMO_ROWS);
  return <GanttView data={filterRows(DEMO_ROWS, f, {})} progress={DEMO_PROGRESS} df="date" selEtats={f.selEtats} setSelEtats={f.setSelEtats} allPJs={o.allPJs} selPJs={f.selPJs} setSelPJs={f.setSelPJs} closurePeriods={[]} productionExclusions={{}} {...common} />;
}
function Calendrier({ mode0 = "week" }) {
  const f = useListFilters(), o = filterOptions(DEMO_ROWS), [mode, setMode] = useState(mode0), [anchor, setAnchor] = useState(new Date()), [dayAnchor, setDayAnchor] = useState(new Date()), [zoom, setZoom] = useState(1);
  return <CalendarView canEditDays setClosurePeriods={no} setProductionExclusionDays={no} data={filterRows(DEMO_ROWS, f, {})} onSelectPj={no} mode={mode} setMode={setMode} anchor={anchor} setAnchor={setAnchor}
    dayAnchor={dayAnchor} setDayAnchor={setDayAnchor} closurePeriods={[]} productionExclusions={{}} zoomLevel={zoom} setZoomLevel={setZoom} selEtats={f.selEtats} setSelEtats={f.setSelEtats} allPJs={o.allPJs} selPJs={f.selPJs} setSelPJs={f.setSelPJs} />;
}
const Commentaires = () => <CommentsView data={DEMO_ROWS} comments={DEMO_COMMENTS} addComment={yes} addCommentMulti={yes} deleteComment={yes} pinOk seeAll myPjs={["PJ901", "PJ902", "PJ905"]} openPj={no} authorName={DEMO_ME.name} resolveComment={yes} />;
// v380 : demandes à valider de la galerie (Vu / Masquer / Plus tard en mémoire du poste)
const DEMO_ACTS = [{ id: "sn", n: 1, primary: true, title: "1 machine arrivée sans S/N", detail: "S/N prévus d'après l'ordo.", items: [{ pj: "PJ902", text: "2026-041-180", yes: { label: "✓ Oui", title: "Garder", onClick: no } }], cta: { label: "Attribuer les S/N", onClick: no } },
  { id: "po", n: 3, tone: "warn", title: "3 commandes (PO) en retard de livraison", detail: "2026-1179 · prévue le 26/10 · 2026-1130 · prévue le 14/10 · 2026-1002 · prévue le 30/09", cta: { label: "Ouvrir Achats / Appro", onClick: no } }];
const ATraiter = ({ popup, bell, comments = DEMO_COMMENTS, resolveComment = yes }) => <InboxPage popup={popup} bell={bell} me={DEMO_ME.email} comments={comments} data={DEMO_ROWS} resolveComment={resolveComment} canSeePrivate onOpen={no} assignments={[{ pj: "PJ905", at: BELL_AT, by: "Responsable des tests", from: "2026-11-24", to: "2026-11-28" }]} onSeenAssign={no} onOpenTests={no}
  actions={DEMO_ACTS}
  pjChanges={[{ pj: "PJ901", at: BELL_AT, delta: 4, nom: "Papeterie du Nord" }]} onSeenPjChanges={no} onOpenChanges={no} />;
const bookApi = { loadImg: async () => null, save: async () => true };
// v357 : cadrans en widgets — disposition gardée en mémoire (comme ArrangeCtx d'App pour le propriétaire)
function Tests() { const [sub, setSub] = useState("semaine"), [lays, setLays] = useState({}); return <ArrangeCtx.Provider value={{ layouts: lays, save: (id, v) => setLays(l => ({ ...l, [id]: v })) }}><TestsTab doc={DEMO_TESTS} save={yes} data={DEMO_ROWS} benches={{ "PJ903-1": 2, PJ901: 2 }} certifs={{}} canEdit lead sub={sub} onSub={setSub} me={DEMO_ME.email} signApi={null} book={DEMO_BOOK} bookApi={bookApi} askPjs={new Set(["PJ901"])} myName={DEMO_ME.name} /></ArrangeCtx.Provider>; }
// v337 : la fiche de tests d'un PJ (6 étapes), ouverte directement
const TestsFiche = () => <TestDialog r={DEMO_ROWS.find(x => x.pj === "PJ903-2")} onClose={no} doc={DEMO_TESTS} testers={testersOf(DEMO_TESTS)} catalog={catalogOf(DEMO_TESTS)} conflicts={[]} commit={yes} certifs={[]} canEdit lead myTester={null} who={DEMO_ME.name} signApi={null} book={DEMO_BOOK} bookApi={bookApi} askPjs={new Set()} />;
// v372 : document de la production en mémoire (attribuer, installer, rouvrir se voient ; jamais écrit en base)
function Turbines({ tab0 = "orc" }) { const [tab, setTab] = useState(tab0), [doc, setDoc] = useState(DEMO_PROD);
  const api = useMemo(() => ({ ...demoApi, put: async (c, id, data) => { setDoc(d => ({ ...d, [c]: { ...(d[c] || {}), [id]: data } })); return true; }, del: async (c, id) => { setDoc(d => { const x = { ...(d[c] || {}) }; delete x[id]; return { ...d, [c]: x }; }); return true; } }), []);
  return <TurbinesHub doc={doc} api={api} rows={DEMO_ROWS} canEdit owner tab={tab} onTab={setTab} allowTabs={["prod", "orc"]} savePjMeta={yes} />; }
// v413 : demandes de transport ClickUp fictives (accueil)
const DEMO_TRANSPORTS = { at: new Date().toISOString(), etat: "ok", items: { // v414 / v416 : format LOGISTIQUE V2 (fictif)
  t1: { name: "PJ903 | Fournisseur A > ENOGIA | 1 colis", url: "https://app.clickup.com", pj: "PJ903", from: "Fournisseur A", to: "ENOGIA", colis: 1, cond: "Colis / carton", poids: 35, mode: "truck", modeEst: true, status: "en attente infos demandeur", statusType: "custom", enlSouhaitee: "2026-11-10" },
  t2: { name: "PJ906 | ENOGIA > Client Asie | 2 colis", url: "https://app.clickup.com", pj: "PJ906", from: "ENOGIA", to: "Client Asie", colis: 2, cond: "Palette", poids: 320, incoterm: "CPT", horsUE: true, dangereux: true, un: ["UN3163 r1233zd"], mode: "plane", modeEst: false, urgent: true, status: "en consultation", statusType: "custom", enlSouhaitee: "2026-11-26", livSouhaitee: "2026-12-05", demandeur: "Camille D." },
  t3: { name: "PJ901 | ENOGIA > Client Nord | 1 colis", url: "https://app.clickup.com", pj: "PJ901", from: "ENOGIA", to: "Client Nord", colis: 1, cond: "Palette", poids: 180, incoterm: "DAP", transporteur: "DACHSER", mode: "truck", modeEst: true, status: "depart programme", statusType: "custom", enlSouhaitee: "2026-11-21", enlPrevue: "2026-11-21", livPrevue: "2026-11-25" },
  t4: { name: "PJ905 | Emballeur > Client Corée | 1 colis", url: "https://app.clickup.com", pj: "PJ905", from: "Emballeur", to: "Client Corée", colis: 1, cond: "ORC sur fond bois", poids: 4850, incoterm: "DAP", transporteur: "HEPPNER", mode: "boat", modeEst: true, status: "colis ramasse", statusType: "done", enlReelle: "2026-11-07", livSouhaitee: "2026-12-20", livPrevue: "2026-12-21" },
  t5: { name: "PJ903 | ENOGIA > Client Sud | 3 colis", url: "https://app.clickup.com", pj: "PJ903", from: "ENOGIA", to: "Client Sud", colis: 3, cond: "Palette", poids: 400, incoterm: "DAP", transporteur: "ALL SOLUTIONS", mode: "truck", modeEst: true, urgent: true, status: "colis livre", statusType: "closed", livSouhaitee: "2026-11-17", livReelle: "2026-11-16" } } };
const Accueil = () => <HomeView transports={DEMO_TRANSPORTS} pinOk testsDoc={DEMO_TESTS} data={DEMO_ROWS} comments={DEMO_COMMENTS} myEmail={DEMO_ME.email} myName={DEMO_ME.name} people={DEMO_PEOPLE} unseenChanges={[]} lastImport={null} onOpenPj={no} onGo={no}
  profiles={{ byEmail: {} }} owner cash={false} turbineDoc={null} onOpenCash={null} prodDoc={DEMO_PROD} canProdTurb productionExclusions={{}} plan={null} closurePeriods={[]} saveHomeLayout={null} />;
// v352 : cadrans « Ligne d'atelier » et « Fiches suiveuses » (à ajouter dans la disposition d'un poste)
const AccueilAtelier = () => <HomeView pinOk testsDoc={DEMO_TESTS} data={DEMO_ROWS} comments={DEMO_COMMENTS} myEmail={DEMO_ME.email} myName={DEMO_ME.name} people={DEMO_PEOPLE} unseenChanges={[]} lastImport={null} onOpenPj={no} onGo={no}
  profiles={{ byEmail: {}, homeLayouts: { moi: { extra: ["ligne", "suiveuses", "depBoard", "ecarts", "parChef", "parPays", "parGamme", "finProd", "arrivees30"] } } }} owner cash={false} turbineDoc={null} onOpenCash={null} prodDoc={DEMO_PROD} canProdTurb productionExclusions={{}} plan={null} closurePeriods={[]} saveHomeLayout={null} />;

// v355 : accueil en widgets (tailles fixes, une pile, petits widgets) ; « Modifier l'accueil » marche ici (disposition gardée en mémoire)
const WG_DEMO = { widgets: [{ t: "jour", z: "s" }, { t: "nextDep", z: "s" }, { t: "nLate", z: "m" }, { t: "kpis", z: "xl" }, { stack: ["nProd", "nDep30", "nShipped"], z: "m" }, { t: "nBanc", z: "s" }, { t: "ecarts", z: "s" }, { t: "depBoard", z: "l" }, { t: "transports", z: "xl" }, { t: "parcours", z: "l" }, { t: "ligne", z: "xl" }] };
function AccueilWidgets() { const [lay, setLay] = useState(WG_DEMO); return <HomeView transports={DEMO_TRANSPORTS} pinOk testsDoc={DEMO_TESTS} data={DEMO_ROWS} comments={DEMO_COMMENTS} myEmail={DEMO_ME.email} myName={DEMO_ME.name} people={DEMO_PEOPLE} unseenChanges={[]} lastImport={null} onOpenPj={no} onGo={no}
  profiles={{ byEmail: {}, homeLayouts: { moi: lay } }} owner cash={false} turbineDoc={null} onOpenCash={null} prodDoc={DEMO_PROD} canProdTurb productionExclusions={{}} plan={null} closurePeriods={[]} saveHomeLayout={(r, l) => setLay(l)} />; }

// v364 : gestion des accueils par rôle (liste des rôles, copier, partir de zéro, rétablir) — dispositions gardées en mémoire
function AccueilRoles() { const [lays, setLays] = useState(() => { setCashinDoc(JSON.parse(JSON.stringify(DEMO_CASHIN))); try { localStorage.setItem("enogia_home_manage", "1"); } catch (e) { /* galerie */ } return { cdp: { widgets: [{ t: "pjs", z: "m" }, { t: "jalons", z: "m" }] } }; });
  useEffect(() => () => { try { localStorage.removeItem("enogia_home_manage"); } catch (e) { /* galerie */ } }, []);
  return <HomeView pinOk testsDoc={DEMO_TESTS} data={DEMO_ROWS} comments={DEMO_COMMENTS} myEmail={DEMO_ME.email} myName={DEMO_ME.name} people={DEMO_PEOPLE} unseenChanges={[]} lastImport={null} onOpenPj={no} onGo={no}
    profiles={{ byEmail: {}, homeLayouts: lays }} owner cash turbineDoc={null} onOpenCash={null} prodDoc={DEMO_PROD} canProdTurb productionExclusions={{}} plan={null} closurePeriods={[]} saveHomeLayout={(r, l) => setLays(L => ({ ...L, [r]: l }))} />; }

// v356 (audit apple-design « ne manque aucune page ») : pages absentes de la galerie jusque-là
const shift = (d, n) => { if (!d) return d; const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const DEMO_CHANGES = (() => { const after = DEMO_ROWS.map((r, i) => (i < 3 ? { ...r, depart: shift(r.depart, i === 1 ? -3 : 5), tests: shift(r.tests, 4) } : r)); const sm = summarizeChanges(DEMO_ROWS, after);
  return [{ at: new Date().toISOString(), by: DEMO_ME.name, source: "planificateur", stats: sm.stats, pjs: sm.pjs.map(x => ({ ...x, row: { depart: (x.row && x.row.depart) || null } })), removed: [] }]; })();
const Modifs = () => <ChangesView entries={DEMO_CHANGES} onOpenPj={no} />;
function Acces() { const [sub, setSub] = useState("people"); return <AccessPage profiles={{ byEmail: {} }} saveProfiles={yes} accessDoc={{ on: false, roles: [], levels: {} }} saveAccess={yes} people={DEMO_PEOPLE} ownerEmails={[DEMO_ME.email]} sub={sub} onSub={setSub} onPeople={no} />; }
// la fiche d'un PJ (pop-up commun à la Liste, au Gantt, au Calendrier et à l'accueil)
function FichePj() { const [pj, setPj] = useState("PJ903-2"); return <PjDialogCtx.Provider value={{ testsDoc: DEMO_TESTS, turbineDoc: null, prodDoc: DEMO_PROD, rows: DEMO_ROWS, setDepart: yes, savDoc: DEMO_SAV, demDoc: DEMO_SAV_DEM, openPage: no, testsOk: true }}>
  {pj ? <PjDialog pj={pj} data={DEMO_ROWS} df="date" onClose={() => setPj(null)} {...common} resolveComment={yes} /> : <button type="button" onClick={() => setPj("PJ903-2")}>Rouvrir la fiche</button>}</PjDialogCtx.Provider>; }
// v419 : une fiche machine, un fournisseur à 5 j ouvrés de transport, une PO à temps et une en retard (vue Gantt : commande puis transport)
const DEMO_ACHATS_G = { fournisseurs: { fr1: { id: "fr1", nom: "Fournisseur A", ltJ: 30, ltTransportJ: 5 } },
  projets: { f1: { id: "f1", projet: "PJ902", machine: "PJ902", marge: 7, dateDebut: "2027-01-20" } },
  po: { o1: { numero: "PO2611", ligne: "1", ref: "MD500", designation: "Armoire", qte: 1, dateCommande: "2026-11-02", dateLivraison: "2026-12-04", statut: "attente" },
    o2: { numero: "PO2640", ligne: "1", ref: "A2V", designation: "Pompe de lubrification", qte: 1, dateCommande: "2026-11-16", dateLivraison: "2027-01-08", statut: "attente" } },
  lignes: { l1: { projetId: "f1", famille: "ARMOIRE", ref: "MD500", designation: "Armoire électrique", fournisseurId: "fr1", poId: "o1" },
    l2: { projetId: "f1", famille: "POMPE DE LUB", ref: "A2V", designation: "Pompe A2V", fournisseurId: "fr1", poId: "o2" },
    l3: { projetId: "f1", famille: "CHOKE", designation: "Choke", fournisseurId: "fr1" } } };
const AchatsDemo = () => <Achats doc={DEMO_ACHATS_G} api={demoApi} rows={DEMO_ROWS.map(r => ({ pj: r.pj, nomProjet: "", gamme: r.gamme || "", etat: r.etat, arrivee: r.arrivee || null, depart: r.depart || null }))} canEdit owner />;

// v323 : accueil du responsable produit (responsable des testeurs) avec les jalons cash « Produit »
const DEMO_PRODUIT = { items: [
  { id: "p1", pj: "PJ901", nom: "Papeterie du Nord", jalon: "P&ID validé", montant: 18000, factInit: "2026-11-30", factPrevue: "2026-12-14" },
  { id: "p2", pj: "PJ905", nom: "Fonderie Est", jalon: "Plans d'implantation", montant: 9500, factInit: "2027-01-15", factPrevue: "2027-01-15" },
  { id: "p3", pj: "PJ902", nom: "Verrerie Alpes", jalon: "Note de calcul", montant: 6000, factInit: "2026-10-20", factPrevue: "2026-10-20", factReelle: "2026-10-22" } ] };
const AccueilProduit = () => <HomeView produit={DEMO_PRODUIT} pinOk testsDoc={DEMO_TESTS} data={DEMO_ROWS} comments={DEMO_COMMENTS} myEmail={DEMO_ME.email} myName={DEMO_ME.name} people={DEMO_PEOPLE} unseenChanges={[]} lastImport={null} onOpenPj={no} onGo={no}
  profiles={{ byEmail: { [userKey(DEMO_ME.email)]: { email: DEMO_ME.email, name: DEMO_ME.name, role: "resptest", pjs: [], chefs: [] } } }} owner={false} cash={false} turbineDoc={null} onOpenCash={null} prodDoc={null} canProdTurb={false} productionExclusions={{}} plan={null} closurePeriods={[]} saveHomeLayout={null} />;

// v324 : la cloche ouvre le pop-up « À traiter » (plus de page dédiée)
// v369 : Cash in › Encaissements — Cash in fictif en mémoire (jamais écrit en base)
function Encaissements() { useState(() => { setCashinDoc(JSON.parse(JSON.stringify(DEMO_CASHIN))); return 0; });
  const save = async (id, iso, by, recu) => { const d = getCashinDoc(); setCashinDoc({ ...d, rows: setEncReelle(d.rows, id, iso, undefined, recu) }); };
  return <CashInEncaissements authorName={DEMO_ME.name} canEdit save={save} />; }
// v374 : Cash in › Fiche du lundi — Cash in fictif et réglages en mémoire (aucun envoi, rien en base)
function FicheLundi() { const [cash] = useState(demoWeeklyCash), [w, setW] = useState({ on: true, recipients: ["direction@enogia.com", "daf@enogia.com", "camille.durand@enogia.com"], history: [{ at: new Date(Date.now() - 7 * 864e5).toISOString(), kind: "auto", n: 3, ok: true }] });
  return <CashInWeekly cashDoc={cash} weekly={w} onPatch={async p => setW(o => ({ ...o, ...p }))} me={DEMO_ME} canEdit />; }
const BELL_AT = new Date(Date.now() - 3600000).toISOString(); // v365 : horodatage fixe (clé stable des lignes)
// v365 : cloche interactive — Vu / Traité d'une mention écrits dans les commentaires en mémoire
function Cloche() { const [cm, setCm] = useState(DEMO_COMMENTS);
  const resolve = (pj, idx, email, on, field) => setCm(C => ({ ...C, [pj]: (C[pj] || []).map((c, i) => i !== idx ? c : { ...c, [field]: on ? [...(c[field] || []).filter(x => x.email !== email), { email, at: new Date().toISOString() }] : (c[field] || []).filter(x => x.email !== email) }) }));
  const asg = [{ pj: "PJ905", at: BELL_AT, by: "Responsable des tests", from: "2026-11-24", to: "2026-11-28" }], chg = [{ pj: "PJ901", at: BELL_AT, delta: 4, nom: "Papeterie du Nord" }];
  return <div style={{ display: "flex", justifyContent: "flex-end", minHeight: 520 }}><MentionBell me={DEMO_ME.email} comments={cm} data={DEMO_ROWS} onOpen={no} canSeePrivate assignments={asg} pjChanges={chg} actions={DEMO_ACTS}
    panel={<ATraiter popup comments={cm} resolveComment={resolve} />} closeKey="x" /></div>; }

// v326 : SAV / MES — équipe SAV (tout) et chef de projet (lecture, planning sur une ligne, demandes)
// window.__savLast : dernier enregistrement simulé (pour vérifier le glisser à l'écran)
const savApi = { put: async (c, id, d) => { if (typeof window !== "undefined") window.__savLast = { c, id, d }; return true; }, del: async () => true, setField: async () => true };
// v377 : la règle des créneaux se règle en mémoire (le planning des chefs de projet suit en direct)
// v384 : une demande de turbines liée au ticket TC-26-42 (ORC modifiables par l'équipe SAV, en mémoire)
function SavDemo({ level, sub0 }) { const [sub, setSub] = useState(sub0), [doc, setDoc] = useState(DEMO_SAV), [reqs, setReqs] = useState({ s1: { label: "SAV903", pj: "PJ903", scope: "multi", orcs: ["PJ903-1", "PJ903-2"], qty: 3, gamme: "20", alloc: ["PJ903-2", "", ""], statut: "conf", ticket: "TC-26-42" } }); const api = useMemo(() => ({ ...savApi, setField: async (k, v) => { setDoc(d => ({ ...d, [k]: v })); return true; } }), []); return <SavPage doc={doc} dem={DEMO_SAV_DEM} turbReqs={reqs} onSetAlloc={async (id, alloc) => { setReqs(R => ({ ...R, [id]: { ...R[id], alloc } })); return true; }} api={api} demApi={savApi} rows={DEMO_ROWS} level={level} canCost={level !== "r"} me={DEMO_ME.email} myName={DEMO_ME.name} myPjs={["PJ901", "PJ902"]} team={[]} skills={{ me: DEMO_ME.email, name: DEMO_ME.name, admin: level === "a", owner: false, people: [DEMO_ME] }} sub={sub} onSub={setSub} onOpenPj={no} />; }

// v346 : Manager (KPI, fiche projet, point hebdo) et Planificateur, vus en propriétaire (droits remis à zéro en quittant la page)
// v359 : les droits sont aussi remis dans l'effet — en développement React démonte puis remonte la page, et le démontage les retirait
// pour tous les rendus suivants (le bouton « Rapport CODIR » disparaissait après le premier clic).
function AsOwner({ children }) { setOwner(true); setSuperAdmin(true); React.useEffect(() => { setOwner(true); setSuperAdmin(true); return () => { setOwner(false); setSuperAdmin(false); }; }, []); return children; }
// v393 : passeport machine en mémoire (standards fictifs, une machine avec écarts et réels)
const DEMO_MACHINES = { dims: { "180LT": { L: "3,0 m", l: "2,2 m", H: "2,4 m", P: "5 600 kg" }, "20LT": { L: "1,6 m", l: "1,2 m", H: "1,8 m", P: "1 450 kg" } },
  launch: { PJ901: { date: "2026-11-12", elec: { neutre: "TN-S", freq: "50 Hz", tension: "415 V" }, design: { application: "Terrestre", integration: "Extérieur", pid: "PJ901-043-DC001-A" }, inj: { roue: "W0400", injecteur: "I0350", plugs: [true, false, false, false, true, false, false, false] },
    comps: { choke: "0,1 mH", capteursVib: "IFM", silent: "__nr" }, ok: { date: "ok", bom: "ok" }, txt: { bom: "Plan châssis rév. D, schéma électrique rév. M", risk: "Armoire attendue le 10/11 : câblage en fin de montage" },
    signs: { "Responsable projet": { by: "Camille Durand", at: "2026-11-10T09:00:00Z" } }, at: "2026-11-10T09:00:00Z", by: "Camille Durand" } },
  standards: { "180LT": { nbTurb: "2", roue: "W0400", injecteur: "I0350", volute: "100-V2", jacket: "100-V2", connecteurs: "WAGO", capteursVib: "IFM", elecPuissance: "Inovance", choke: "Aucun", flexibleLub: "Inox - Flexible", pompeLub: "A2V", aerotherme: "Stefani", application: "Terrestre", integration: "Intérieur", multiOrc: "Non" },
  "20LT": { nbTurb: "1", roue: "W0250", injecteur: "I0282", volute: "20-V1", jacket: "20-V1", connecteurs: "WAGO", capteursVib: "IFM", elecPuissance: "Inovance", pompeLub: "A2V", application: "Terrestre", integration: "Intérieur" } },
  pass: { PJ902: { cfg: { integration: "Extérieur", choke: "Oui", bouchages: "2" }, real: { elecPuissance: { v: "Inovance MD500", phase: "appro", src: "PO 2611 reçue", by: "Alex Moreau", at: "2026-11-04T10:00:00Z" }, capteursVib: { v: "Wago", phase: "appro", src: "substitution (rupture IFM)", by: "Alex Moreau", at: "2026-11-06T09:41:00Z" } },
    hist: [{ at: "2026-11-06T09:41:00Z", by: "Alex Moreau", phase: "appro", el: "capteursVib", k: "réel", from: "", to: "Wago" }, { at: "2026-09-02T18:30:00Z", by: "Camille Durand", phase: "design", el: "choke", k: "prévu", from: "Aucun", to: "Oui" }] } } };
// v397 : une fiche machine d'Achats / Appro fictive pour PJ902 (armoire livrée, pompe de lub commandée en retard, choke à commander)
const DEMO_MACH_ACHATS = { projets: { f1: { id: "f1", projet: "PJ902", machine: "PJ902" } }, po: { o1: { numero: "PO 2611", statut: "livre", dateLivraison: "2026-11-04" }, o2: { numero: "PO 2640", statut: "attente", dateLivraison: "2026-11-10" } },
  lignes: { l1: { projetId: "f1", famille: "ARMOIRE", ref: "MD500", poId: "o1" }, l2: { projetId: "f1", famille: "POMPE DE LUB", designation: "Pompe A2V", poId: "o2" }, l3: { projetId: "f1", famille: "CHOKE", designation: "Choke" } } };
// turbine 100N1 allouée au PJ901 (le passeport en reprend le n° et la roue)
const DEMO_MACH_PROD = { ...DEMO_PROD, turbines: { ...DEMO_PROD.turbines, a: { ...DEMO_PROD.turbines.a, besoin: "pj:PJ901", affaire: "PJ901" } } };
export function MachinesDemo({ children }) { const [d, setD] = useState(DEMO_MACHINES);
  const api = useMemo(() => ({ savePass: async (pj, P) => { setD(x => ({ ...x, pass: { ...(x.pass || {}), [pj]: P } })); return true; }, saveRai: async (pj, R) => { setD(x => ({ ...x, rai: { ...(x.rai || {}), [pj]: R } })); return true; },
    uploadPhoto: async (pj, full, thumb, meta) => { const p = { ...meta, url: URL.createObjectURL(full.blob), turl: URL.createObjectURL(thumb.blob), w: full.w, h: full.h, at: new Date().toISOString(), by: "Camille Durand" }; setD(x => ({ ...x, photos: { ...(x.photos || {}), [pj]: [...(((x.photos || {})[pj]) || []), p] } })); return p; },
    deletePhoto: async (pj, p) => { setD(x => ({ ...x, photos: { ...(x.photos || {}), [pj]: (((x.photos || {})[pj]) || []).filter(q => q.id !== p.id) } })); return true; }, saveStandards: async S => { setD(x => ({ ...x, standards: S })); return true; },
    saveElements: async L => { setD(x => ({ ...x, elements: L })); return true; },
    saveLaunch: async (pj, L) => { setD(x => ({ ...x, launch: { ...(x.launch || {}), [pj]: L } })); return true; }, saveComponents: async L => { setD(x => ({ ...x, components: L })); return true; },
    saveDims: async D => { setD(x => ({ ...x, dims: D })); return true; }, saveElecLists: async E => { setD(x => ({ ...x, elecLists: E })); return true; }, saveImport: async (pass, standards) => { setD(x => ({ ...x, pass, standards })); return true; } }), []);
  return <MachinesDemoCtx.Provider value={{ machinesDoc: d, machinesApi: api, prodDoc: DEMO_MACH_PROD, achatsDoc: DEMO_MACH_ACHATS, testsDoc: DEMO_TESTS, savDoc: DEMO_SAV }}>{children}</MachinesDemoCtx.Provider>; }
// v398 : RAI fictifs (PJ902 accepté, PJ901 en cours avec une action bloquante) — Liste, fiche d’un PJ, accueil
setRaiDoc({ rai: { PJ902: { rows: { "c-evap": { ok: "OK" } }, signs: Object.fromEntries(RAI_SIGNERS.map(([sv]) => [sv, { by: "Sam Petit", at: "2026-11-10" }])) }, PJ901: { rows: { "v-ce": { ok: "NOK" } }, actions: [{ id: "a1", t: "Plaque CE absente", bloq: true, pole: "PROD", at: "2026-11-12", done: "" }], signs: {} } } });
function Manager({ tab0 }) { const [tab, setTab] = useState(tab0); return <AsOwner><ManagerPanel tab={tab} setTab={setTab} kpiOk calOk data={DEMO_ROWS} initialData={DEMO_ROWS} progress={DEMO_PROGRESS} setProgress={no} changeLog={[]} profiles={{ byEmail: {} }} saveProfiles={yes}
  comments={DEMO_COMMENTS} delays={[]} delayTypes={[]} setDelayTypes={no} addDelayAllocationMulti={yes} deleteDelayAllocation={yes} managerEmails={[]} setManagerEmails={no} currentUserEmail={DEMO_ME.email} authorName={DEMO_ME.name}
  savePjMetaOverride={yes} savePjMetaMulti={yes} addCommentMulti={yes} addComment={yes} resolveComment={yes} deleteComment={yes} closurePeriods={[]} setClosurePeriods={no} productionExclusions={{}} setProductionExclusionDays={no}
  customEtats={[]} setCustomEtats={no} etatEdits={{}} setEtatEdits={no} clientPresence={{}} setClientPresenceFor={no} setEtatFor={no} certifs={[]} setCertifs={no} releases={[]} releaseSelection={null} /></AsOwner>; }
const Planificateur = () => <AsOwner><PlannerView planLoaded planDoc={null} rows={DEMO_ROWS} closurePeriods={[]} productionExclusions={{}} authorName={DEMO_ME.name} onSavePlan={yes} onPublish={yes} onLoadHistory={async () => []} onRestorePublication={yes} testers={testersOf(DEMO_TESTS)} pendingDeparts={{}} onPendingApplied={no} /></AsOwner>;

export const DEMO_PAGES = [
  { id: "home", label: "Accueil", Render: Accueil, expect: [] },
  { id: "home-widgets", label: "Accueil · widgets", Render: AccueilWidgets, expect: ["Modifier l'accueil", "Prochain départ", "En retard sur l'initial", "Ligne d'atelier", "Tableau des départs"] },
  { id: "home-atelier", label: "Accueil · ligne d'atelier", Render: AccueilAtelier, expect: ["Ligne d'atelier", "Fiches suiveuses", "Montage méca", "Tableau des départs", "Écarts au planning initial", "Machines par gamme"] },
  { id: "home-roles", label: "Accueil · gestion par rôle", Render: AccueilRoles, expect: ["Accueils par rôle", "Copier depuis un autre rôle…", "Partir de zéro", "Rétablir l'accueil par défaut", "modifié"] },
  { id: "cash-lundi", label: "Cash in · fiche du lundi", Render: FicheLundi, expect: ["Destinataires", "Envoi automatique chaque lundi", "M'envoyer un test"] },
  { id: "cash-enc", label: "Cash in · encaissements", Render: Encaissements, expect: ["À encaisser", "En retard", "Fonderie Est", "Encaissé aujourd'hui"] },
  { id: "home-produit", label: "Accueil · resp. produit", Render: AccueilProduit, expect: ["Livrables Produit", "P&ID validé", "Papeterie du Nord"] },
  { id: "sav", label: "SAV · équipe", Render: () => <SavDemo level="w" sub0="tickets" />, expect: ["SAV / MES", "TC-26-41", "Sucrerie Centre"] },
  { id: "sav-plan", label: "SAV · planning", Render: () => <SavDemo level="w" sub0="planning" />, expect: ["Lou Martin", "Demandes des chefs de projet", "Aujourd'hui"] },
  { id: "sav-dispo", label: "SAV · disponibilités", Render: () => <SavDemo level="w" sub0="dispo" />, expect: ["Équipe et ressources", "Réservation par les chefs de projet", "Disponibles"] },
  { id: "sav-cdp", label: "SAV · chef de projet", Render: () => <SavDemo level="r" sub0="planning" />, expect: ["SAV / MES", "Mes demandes", "Complet"] },
  { id: "sav-comp", label: "SAV · compétences", Render: () => <SavDemo level="a" sub0="competences" />, expect: ["Compétences"] },
  { id: "sav-kpi", label: "SAV · KPI", Render: () => <SavDemo level="w" sub0="kpi" />, expect: ["Affectation de l'équipe", "Interventions", "Finance"] },
  { id: "sav-parc", label: "SAV · parc", Render: () => <SavDemo level="w" sub0="parc" />, expect: ["PJ214", "Premium"] },
  { id: "bell", label: "Cloche", Render: Cloche, expect: [] },
  { id: "workshop", label: "Écran atelier", Render: () => <WorkshopScreen data={DEMO_ROWS} productionExclusions={{}} closurePeriods={[]} changeLog={[]} darkMode={false} onClose={no} />, expect: ["Cette semaine"] },
  { id: "inbox", label: "À traiter", Render: ATraiter, expect: ["Demandes à valider", "PJ902"] },
  { id: "table", label: "Liste", Render: Liste, expect: ["PJ901", "Papeterie du Nord"] },
  { id: "gantt", label: "Gantt", Render: Gantt, expect: ["PJ901"] },
  { id: "calendar", label: "Calendrier", Render: () => <Calendrier />, expect: [] },
  { id: "calmonth", label: "Calendrier · mois", Render: () => <Calendrier mode0="month" />, expect: [] },
  { id: "comments", label: "Commentaires", Render: Commentaires, expect: ["Papeterie du Nord", "Répondre"] },
  { id: "tests", label: "Tests", Render: Tests, expect: [] },
  { id: "tests-fiche", label: "Tests · fiche", Render: TestsFiche, expect: ["Qui teste ?", "Configuration ORC", "Checklist de tests", "Signature"] },
  { id: "turb-orc", label: "Turbines · besoins", Render: () => <Turbines tab0="orc" />, expect: ["Turbines prêtes · avec roue", "SAV-12"] },
  { id: "turb-prod", label: "Turbines · production", Render: () => <Turbines tab0="prod" />, expect: ["Turbines", "Charge de l'équipe"] },
  { id: "kpi", label: "Manager · KPI", Render: () => <Manager tab0="derives" />, expect: [] },
  { id: "fiche", label: "Manager · fiche projet", Render: () => <Manager tab0="fiche" />, expect: ["Cette semaine", "Contrat et dates", "Actions de la semaine", "Statut global"] },
  { id: "retards", label: "Manager · retards", Render: () => <Manager tab0="retards" />, expect: [] },
  { id: "serie", label: "Machines ORC", Render: () => <MachinesDemo><Manager tab0="serie" /></MachinesDemo>, expect: [] },
  { id: "fermetures", label: "Réglages · fermetures", Render: () => <Manager tab0="vacances" />, expect: [] },
  { id: "personnes", label: "Personnes", Render: () => <Manager tab0="personnes" />, expect: [] },
  { id: "nouveautes", label: "Réglages · nouveautés", Render: () => <Manager tab0="nouveautes" />, expect: [] },
  { id: "fiche-pj", label: "Fiche d'un PJ", Render: FichePj, expect: [] },
  { id: "changes", label: "Modifications", Render: Modifs, expect: [] },
  { id: "access", label: "Gestion des accès", Render: Acces, expect: [] },
  { id: "achats", label: "Achats / Appro", Render: AchatsDemo, expect: [] },
  { id: "hebdo", label: "Manager · point hebdo", Render: () => <Manager tab0="hebdo" />, expect: [] },
  { id: "planner", label: "Planificateur", Render: Planificateur, expect: [] },
];
