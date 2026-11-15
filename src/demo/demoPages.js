// v321 (revue, point 7) : les pages de la galerie ?demo et du test des pages — chaque entrée rend une page avec les données d'exemple.
// Ajouter ici toute nouvelle page (une ligne) : elle est alors vérifiée à chaque série de tests et visible dans la galerie.
import React, { useState } from "react";
import { DEMO_BOOK, DEMO_SAV, DEMO_SAV_DEM, DEMO_ROWS, DEMO_COMMENTS, DEMO_PROGRESS, DEMO_TESTS, DEMO_PROD, DEMO_ME, DEMO_PEOPLE, demoApi } from "./demoData";
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
const ATraiter = ({ popup }) => <InboxPage popup={popup} me={DEMO_ME.email} comments={DEMO_COMMENTS} data={DEMO_ROWS} resolveComment={yes} canSeePrivate onOpen={no} assignments={[]} onSeenAssign={no} onOpenTests={no}
  actions={[{ id: "sn", n: 1, primary: true, title: "1 machine arrivée sans S/N", detail: "S/N prévus d'après l'ordo.", items: [{ pj: "PJ902", text: "2026-041-180", yes: { label: "✓ Oui", title: "Garder", onClick: no } }], cta: { label: "Attribuer les S/N", onClick: no } }]}
  pjChanges={[{ pj: "PJ901", at: new Date().toISOString(), delta: 4, nom: "Papeterie du Nord" }]} onSeenPjChanges={no} onOpenChanges={no} />;
const bookApi = { loadImg: async () => null, save: async () => true };
function Tests() { const [sub, setSub] = useState("semaine"); return <TestsTab doc={DEMO_TESTS} save={yes} data={DEMO_ROWS} certifs={{}} canEdit lead sub={sub} onSub={setSub} me={DEMO_ME.email} signApi={null} book={DEMO_BOOK} bookApi={bookApi} askPjs={new Set(["PJ901"])} myName={DEMO_ME.name} />; }
// v337 : la fiche de tests d'un PJ (6 étapes), ouverte directement
const TestsFiche = () => <TestDialog r={DEMO_ROWS.find(x => x.pj === "PJ903-2")} onClose={no} doc={DEMO_TESTS} testers={testersOf(DEMO_TESTS)} catalog={catalogOf(DEMO_TESTS)} conflicts={[]} commit={yes} certifs={[]} canEdit lead myTester={null} who={DEMO_ME.name} signApi={null} book={DEMO_BOOK} bookApi={bookApi} askPjs={new Set()} />;
function Turbines({ tab0 = "orc" }) { const [tab, setTab] = useState(tab0); return <TurbinesHub doc={DEMO_PROD} api={demoApi} rows={DEMO_ROWS} canEdit owner tab={tab} onTab={setTab} allowTabs={["prod", "orc"]} savePjMeta={yes} />; }
const Accueil = () => <HomeView pinOk testsDoc={DEMO_TESTS} data={DEMO_ROWS} comments={DEMO_COMMENTS} myEmail={DEMO_ME.email} myName={DEMO_ME.name} people={DEMO_PEOPLE} unseenChanges={[]} lastImport={null} onOpenPj={no} onGo={no}
  profiles={{ byEmail: {} }} owner cash={false} turbineDoc={null} onOpenCash={null} prodDoc={DEMO_PROD} canProdTurb productionExclusions={{}} plan={null} closurePeriods={[]} saveHomeLayout={null} />;

// v323 : accueil du responsable produit (responsable des testeurs) avec les jalons cash « Produit »
const DEMO_PRODUIT = { items: [
  { id: "p1", pj: "PJ901", nom: "Papeterie du Nord", jalon: "P&ID validé", montant: 18000, factInit: "2026-11-30", factPrevue: "2026-12-14" },
  { id: "p2", pj: "PJ905", nom: "Fonderie Est", jalon: "Plans d'implantation", montant: 9500, factInit: "2027-01-15", factPrevue: "2027-01-15" },
  { id: "p3", pj: "PJ902", nom: "Verrerie Alpes", jalon: "Note de calcul", montant: 6000, factInit: "2026-10-20", factPrevue: "2026-10-20", factReelle: "2026-10-22" } ] };
const AccueilProduit = () => <HomeView produit={DEMO_PRODUIT} pinOk testsDoc={DEMO_TESTS} data={DEMO_ROWS} comments={DEMO_COMMENTS} myEmail={DEMO_ME.email} myName={DEMO_ME.name} people={DEMO_PEOPLE} unseenChanges={[]} lastImport={null} onOpenPj={no} onGo={no}
  profiles={{ byEmail: { [userKey(DEMO_ME.email)]: { email: DEMO_ME.email, name: DEMO_ME.name, role: "resptest", pjs: [], chefs: [] } } }} owner={false} cash={false} turbineDoc={null} onOpenCash={null} prodDoc={null} canProdTurb={false} productionExclusions={{}} plan={null} closurePeriods={[]} saveHomeLayout={null} />;

// v324 : la cloche ouvre le pop-up « À traiter » (plus de page dédiée)
const Cloche = () => <div style={{ display: "flex", justifyContent: "flex-end", minHeight: 420 }}><MentionBell me={DEMO_ME.email} comments={DEMO_COMMENTS} data={DEMO_ROWS} onOpen={no} canSeePrivate assignments={[]} pjChanges={[]} extra={1}
  panel={<ATraiter popup />} closeKey="x" /></div>;

// v326 : SAV / MES — équipe SAV (tout) et chef de projet (lecture, planning sur une ligne, demandes)
// window.__savLast : dernier enregistrement simulé (pour vérifier le glisser à l'écran)
const savApi = { put: async (c, id, d) => { if (typeof window !== "undefined") window.__savLast = { c, id, d }; return true; }, del: async () => true, setField: async () => true };
function SavDemo({ level, sub0 }) { const [sub, setSub] = useState(sub0); return <SavPage doc={DEMO_SAV} dem={DEMO_SAV_DEM} api={savApi} demApi={savApi} rows={DEMO_ROWS} level={level} canCost={level !== "r"} me={DEMO_ME.email} myName={DEMO_ME.name} myPjs={["PJ901", "PJ902"]} team={[]} sub={sub} onSub={setSub} onOpenPj={no} />; }

// v346 : Manager (KPI, fiche projet, point hebdo) et Planificateur, vus en propriétaire (droits remis à zéro en quittant la page)
function AsOwner({ children }) { setOwner(true); setSuperAdmin(true); React.useEffect(() => () => { setOwner(false); setSuperAdmin(false); }, []); return children; }
function Manager({ tab0 }) { const [tab, setTab] = useState(tab0); return <AsOwner><ManagerPanel tab={tab} setTab={setTab} kpiOk calOk data={DEMO_ROWS} initialData={DEMO_ROWS} progress={DEMO_PROGRESS} setProgress={no} changeLog={[]} profiles={{ byEmail: {} }} saveProfiles={yes}
  comments={DEMO_COMMENTS} delays={[]} delayTypes={[]} setDelayTypes={no} addDelayAllocationMulti={yes} deleteDelayAllocation={yes} managerEmails={[]} setManagerEmails={no} currentUserEmail={DEMO_ME.email} authorName={DEMO_ME.name}
  savePjMetaOverride={yes} savePjMetaMulti={yes} addCommentMulti={yes} addComment={yes} resolveComment={yes} deleteComment={yes} closurePeriods={[]} setClosurePeriods={no} productionExclusions={{}} setProductionExclusionDays={no}
  customEtats={[]} setCustomEtats={no} etatEdits={{}} setEtatEdits={no} clientPresence={{}} setClientPresenceFor={no} setEtatFor={no} certifs={[]} setCertifs={no} releases={[]} releaseSelection={null} /></AsOwner>; }
const Planificateur = () => <AsOwner><PlannerView planLoaded planDoc={null} rows={DEMO_ROWS} closurePeriods={[]} productionExclusions={{}} authorName={DEMO_ME.name} onSavePlan={yes} onPublish={yes} onLoadHistory={async () => []} onRestorePublication={yes} testers={testersOf(DEMO_TESTS)} pendingDeparts={{}} onPendingApplied={no} /></AsOwner>;

export const DEMO_PAGES = [
  { id: "home", label: "Accueil", Render: Accueil, expect: [] },
  { id: "home-produit", label: "Accueil · resp. produit", Render: AccueilProduit, expect: ["Livrables Produit", "P&ID validé", "Papeterie du Nord"] },
  { id: "sav", label: "SAV · équipe", Render: () => <SavDemo level="w" sub0="tickets" />, expect: ["SAV / MES", "TC-26-41", "Sucrerie Centre"] },
  { id: "sav-plan", label: "SAV · planning", Render: () => <SavDemo level="w" sub0="planning" />, expect: ["Lou Martin", "Demandes des chefs de projet", "Aujourd'hui"] },
  { id: "sav-cdp", label: "SAV · chef de projet", Render: () => <SavDemo level="r" sub0="planning" />, expect: ["Demandes", "Mes demandes", "Lou Martin"] },
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
  { id: "turb-prod", label: "Turbines · production", Render: () => <Turbines tab0="prod" />, expect: ["Production turbines"] },
  { id: "kpi", label: "Manager · KPI", Render: () => <Manager tab0="derives" />, expect: [] },
  { id: "fiche", label: "Manager · fiche projet", Render: () => <Manager tab0="fiche" />, expect: ["Cette semaine", "Contrat et dates", "Actions de la semaine", "Statut global"] },
  { id: "hebdo", label: "Manager · point hebdo", Render: () => <Manager tab0="hebdo" />, expect: [] },
  { id: "planner", label: "Planificateur", Render: Planificateur, expect: [] },
];
