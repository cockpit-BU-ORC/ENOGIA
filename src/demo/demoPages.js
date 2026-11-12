// v321 (revue, point 7) : les pages de la galerie ?demo et du test des pages — chaque entrée rend une page avec les données d'exemple.
// Ajouter ici toute nouvelle page (une ligne) : elle est alors vérifiée à chaque série de tests et visible dans la galerie.
import React, { useState } from "react";
import { DEMO_ROWS, DEMO_COMMENTS, DEMO_PROGRESS, DEMO_TESTS, DEMO_PROD, DEMO_ME, DEMO_PEOPLE, demoApi } from "./demoData";
import { useListFilters, filterOptions, filterRows } from "../listFilters";
import { DashboardSummary } from "../components/DashboardSummary";
import { TableView } from "../components/TableView";
import { GanttView } from "../components/GanttView";
import { CalendarView } from "../components/CalendarView";
import { CommentsView } from "../components/CommentsView";
import { InboxPage } from "../components/InboxPage";
import { TestsTab } from "../components/TestsTab";
import { TurbinesHub } from "../components/TurbinesHub";
import { HomeView } from "../components/HomeView";

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
const ATraiter = () => <InboxPage me={DEMO_ME.email} comments={DEMO_COMMENTS} data={DEMO_ROWS} resolveComment={yes} canSeePrivate onOpen={no} assignments={[]} onSeenAssign={no} onOpenTests={no}
  actions={[{ id: "sn", n: 1, primary: true, title: "1 machine arrivée sans S/N", detail: "S/N prévus d'après l'ordo.", items: [{ pj: "PJ902", text: "2026-041-180", yes: { label: "✓ Oui", title: "Garder", onClick: no } }], cta: { label: "Attribuer les S/N", onClick: no } }]}
  pjChanges={[{ pj: "PJ901", at: new Date().toISOString(), delta: 4, nom: "Papeterie du Nord" }]} onSeenPjChanges={no} onOpenChanges={no} />;
function Tests() { const [sub, setSub] = useState("semaine"); return <TestsTab doc={DEMO_TESTS} save={yes} data={DEMO_ROWS} certifs={{}} canEdit lead sub={sub} onSub={setSub} me={DEMO_ME.email} signApi={null} />; }
function Turbines({ tab0 = "orc" }) { const [tab, setTab] = useState(tab0); return <TurbinesHub doc={DEMO_PROD} api={demoApi} rows={DEMO_ROWS} canEdit owner tab={tab} onTab={setTab} allowTabs={["prod", "orc"]} savePjMeta={yes} />; }
const Accueil = () => <HomeView pinOk testsDoc={DEMO_TESTS} data={DEMO_ROWS} comments={DEMO_COMMENTS} myEmail={DEMO_ME.email} myName={DEMO_ME.name} people={DEMO_PEOPLE} unseenChanges={[]} lastImport={null} onOpenPj={no} onGo={no}
  profiles={{ byEmail: {} }} owner cash={false} turbineDoc={null} onOpenCash={null} prodDoc={DEMO_PROD} canProdTurb productionExclusions={{}} plan={null} closurePeriods={[]} saveHomeLayout={null} />;

export const DEMO_PAGES = [
  { id: "home", label: "Accueil", Render: Accueil, expect: [] },
  { id: "inbox", label: "À traiter", Render: ATraiter, expect: ["Demandes à valider", "PJ902"] },
  { id: "table", label: "Liste", Render: Liste, expect: ["PJ901", "Papeterie du Nord"] },
  { id: "gantt", label: "Gantt", Render: Gantt, expect: ["PJ901"] },
  { id: "calendar", label: "Calendrier", Render: () => <Calendrier />, expect: [] },
  { id: "calmonth", label: "Calendrier · mois", Render: () => <Calendrier mode0="month" />, expect: [] },
  { id: "comments", label: "Commentaires", Render: Commentaires, expect: ["Papeterie du Nord", "Répondre"] },
  { id: "tests", label: "Tests", Render: Tests, expect: [] },
  { id: "turb-orc", label: "Turbines · besoins", Render: () => <Turbines tab0="orc" />, expect: ["Turbines prêtes · avec roue", "SAV-12"] },
  { id: "turb-prod", label: "Turbines · production", Render: () => <Turbines tab0="prod" />, expect: ["Production turbines"] },
];
