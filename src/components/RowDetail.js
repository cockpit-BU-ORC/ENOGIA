// ── v203 : fiche d'un PJ en pop-up unique (maquette validée) — la même depuis la Liste, le Gantt, le Calendrier et l'accueil ────
// D'abord la réponse à « où en est la machine ? » : anneau d'avancement, nom de l'étape et ce qu'elle signifie, étape suivante.
// Puis le ruban des étapes (clic : ses sous-étapes s'affichent), les sous-étapes reprises de prodStages.js, une mini-frise
// (aujourd'hui, départ, écart à l'initial), des pastilles de contexte (présence, tests, cash pour le propriétaire, turbine),
// le dernier commentaire et trois actions (commentaires, retard, fiche projet) qui s'ouvrent dans la fenêtre.
// Fenêtre centrale floutée (téléphone : monte du bas), entrée 240 ms / sortie 180 ms, Échap / clic à côté / croix pour fermer.
// v265 : contenu refait d'après la maquette B (onglets) — voir RowDetail plus bas.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { T, FZF as FZ, inkOn, mixHex, stageSoft } from "../theme";
import { plannedSnOf, ETAT_EDITS, getPjMeta, ETAT_META, chefsOf, EpcTag, PresenceChip, presenceKind, presenceFirstDate, presenceDates, CountryFlag, relTime, Avatar } from "../pjMeta";
import { NavIcon, PjPlate, OpenIn, Pill } from "./SharedUI";
import { ProjectComments, DelayAllocations, EditMetaForm } from "./ProjectModal";
import { STAGES, STEP_NOTE, autoPct } from "../prodStages";
import { planOf, catalogOf, activeSections, progressOf, SECTIONS, selectedIds, statusOf } from "../testPlan";
import { debugProgress, debugSections } from "../debugChecklist";
import { contractLate, livrPrevueOf } from "../penalties";
import { linkedPayments, cashSummary } from "../cashinLink";
import { canCash } from "../roles";
import { fmtEur } from "../pjProgress";
import { turbineOf, achatsOf, ACHAT_ST } from "../pjDossier";
import { useProdModel } from "../prodModel";
import { AF } from "../autoFocusOk";

// Données de contexte fournies par App (tests, turbines) pour les pastilles, sans les faire passer par chaque vue.
export const PjDialogCtx = createContext({ testsDoc: null, turbineDoc: null });

const dmy = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
// Étapes du ruban : « Avant production » regroupe commande, désignation, fabrication FNR et stockage externe.
const PRE = ["NOT ORDERED", "NON_DESIGNEE", "En fabrication", "STOCKAGE_EXT", "A_DEFINIR", "SLOT_LIBRE"];
const RIBBON = [
  { id: "PRE", label: "Avant production", etats: PRE, color: "En fabrication" },
  { id: "MONTAGE", label: "Montage méca", etats: ["MONTAGE"], from: "arrivee", color: "MONTAGE" },
  { id: "ELEC", label: "Montage élec", etats: ["ELEC"], color: "ELEC" },
  { id: "TESTS", label: "Tests", etats: ["TESTS"], from: "tests", to: "testsFin", color: "TESTS" },
  { id: "PACKAGING", label: "Packaging", etats: ["PACKAGING"], to: "finProd", color: "PACKAGING" },
  { id: "SHIPPED", label: "Départ", etats: ["SHIPPED"], to: "depart", color: "SHIPPED" },
];
// Ce que signifie chaque état, en une phrase (et l'étape suivante).
const MEANING = {
  "NOT ORDERED": ["Commande non passée", "La machine n'est pas encore commandée : rien n'est lancé en atelier.", "la commande"],
  "NON_DESIGNEE": ["Design en cours", "Le design de l'ORC n'est pas encore complètement défini : la commande ne peut pas être passée.", "la commande"],
  "En fabrication": ["Fabrication / montage fournisseurs", "L'ORC (armoire et skid) est en fabrication et en montage chez les fournisseurs, avant son arrivée en atelier.", "le montage mécanique"],
  "STOCKAGE_EXT": ["Stockage externe", "La machine est dans un stockage externe : soit avant le montage interne, soit après les tests et le packaging, en attendant le départ.", "le montage mécanique ou le départ"],
  "MONTAGE": ["Montage mécanique", "Assemblage mécanique de la machine : lubrification, refroidissement, test de pression, tirage au vide, remplissage.", "le montage électrique"],
  "ELEC": ["Montage électrique", "Le circuit est fermé et testé ; on installe et on câble l'armoire électrique.", "les tests (essais de la machine, puis FAT)"],
  "TESTS": ["Tests", "La machine tourne : essais internes, puis FAT avec le client ou NOBO quand c'est prévu.", "le packaging"],
  "PACKAGING": ["Packaging", "Derniers contrôles (RAI), pose des carters et emballage avant le départ.", "le départ"],
  "SHIPPED": ["Expédiée", "La machine est partie de l'atelier.", ""],
};

// v265 (maquette B du canevas « Cockpit — Fiche d'un PJ » retenue ; demandé : « attention, certaines données ne doivent pas être
// mises à disposition de tout le monde, comme le cash ; les blocs appro et turbines sont encore en cours de dev ») : en-tête court
// (étape, avancement, départ, écart à l'initial), barre de parcours, onglets Résumé · Tests · Cash · Commentaires. L'onglet et la tuile
// Cash ne s'affichent qu'avec l'accès Cash in (canCash) ; le retard contractuel aux admins (pinOk), le montant des pénalités avec l'accès
// Cash in seulement ; pas d'appro ni de turbines pour l'instant.
const STATUS_TXT = { paid: "Payé", invoiced: "Facture émise", tobill: "À facturer", warn: "À surveiller", late: "En retard", future: "À venir", epc: "EPC" };

export function RowDetail({ resolveComment, initialTab, r, onClose, comments, addComment, deleteComment, pinOk, delays, delayTypes, setDelayTypes, addDelayAllocation, deleteDelayAllocation, addDelayComment, deleteDelayComment, authorName, savePjMetaOverride, canEditMeta, dayAction }) {
  const ctx = useContext(PjDialogCtx);
  const [tab, setTab] = useState(initialTab || "resume"), [open, setOpen] = useState(null), [focus0, setFocus] = useState(null); // v270 : initialTab (notification d’échange → Commentaires) // open : "delays" | "edit"
  const meta = getPjMeta(r.pj, r), shipped = r.etat === "SHIPPED";
  const cur = Math.max(0, RIBBON.findIndex(s => s.etats.includes(r.etat)));
  const em = ETAT_META[r.etat] || ETAT_META["NOT ORDERED"], bar = em.bar;
  const focus = focus0 || RIBBON[cur].id; // v270 (demandé : « les sous-étapes doivent être toujours visibles ») : l’étape en cours par défaut
  const [title0, meaning0, next] = MEANING[r.etat] || [em.label, "", ""];
  const ed = ETAT_EDITS[r.etat]; const title = (ed && ed.label) || title0, meaning = (ed && ed.desc) || meaning0;
  const pct = shipped ? 100 : autoPct(r.etat) != null ? autoPct(r.etat) : 0;
  const list = (comments && comments[r.pj]) || [], pub = list.filter(c => !c.private);
  const last = pub.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))).pop();
  const kind = presenceKind(r.clientPresence);
  const drift = Number(r.drift) || 0, z = r.depart ? new Date(r.depart) : null, zInit = z && drift ? new Date(z.getTime() - drift * 864e5) : null;
  const daysLeft = z ? Math.round((z - day0()) / 864e5) : null;
  // Tests et checklist de debug (page Tests)
  const plan = ctx.testsDoc ? planOf(ctx.testsDoc, r.pj) : null, catalog = ctx.testsDoc ? catalogOf(ctx.testsDoc) : null, act = activeSections(kind);
  const tq = plan ? progressOf(plan, catalog, act) : null, dbgSecs = plan ? debugSections(ctx.testsDoc && ctx.testsDoc.debugModel) : null, dbg = plan ? debugProgress(plan.debug, dbgSecs) : null;
  const nokAll = (tq ? tq.ko : 0) + (dbg ? dbg.nok : 0); // échecs de tests + NOK de la checklist
  const testers = plan ? plan.assign.map(x => ((ctx.testsDoc.testers || []).find(t => t.id === x.tid) || {}).name).filter(Boolean) : [];
  // Cash (accès Cash in seulement) et contrat (admins ; montant avec l'accès Cash in)
  const cashOk = canCash(), pays = cashOk ? linkedPayments(r.pj) : [], cash = cashOk && pays.length ? cashSummary(pays) : null;
  const nextPay = pays.filter(p => !p.done && !p.epc).sort((a, b) => String(a.factPrevue || a.encPrevue || "9").localeCompare(String(b.factPrevue || b.encPrevue || "9")))[0];
  const ct = pinOk ? contractLate(meta, r.depart, new Date()) : null;
  const livr = livrPrevueOf(meta, r.depart);
  // v309 (revue, point 3 : « le PJ, centre de tout ») : turbine (Turbines › Besoins) et achats (Achats / Appro) du PJ, en lecture,
  // pour qui a accès à ces pages (ctx.prodDoc / ctx.achatsDoc fournis par App) ; « Ouvrir » mène à la page d'origine.
  const prodM = useProdModel(!!ctx.prodDoc); // v324 : calcul des turbines chargé à la demande
  const turb = useMemo(() => (ctx.prodDoc && prodM ? turbineOf(ctx.prodDoc, ctx.rows || [r], r.pj, x => getPjMeta(x.pj, x), prodM.buildNeeds) : null), [ctx.prodDoc, ctx.rows, r, prodM]);
  const ach = useMemo(() => (ctx.achatsDoc ? achatsOf(ctx.achatsDoc, r.pj) : null), [ctx.achatsDoc, r.pj]);
  // v312 : départ modifiable (admins, ctx.setDepart) 
  const [depEd, setDepEd] = useState(false), [depV, setDepV] = useState("");
  const saveDep = () => { if (depV && ctx.setDepart) ctx.setDepart(r.pj, depV); setDepEd(false); };
  const openPage = (v, sub) => { if (ctx.openPage) { ctx.openPage(v, sub); if (onClose) onClose(); } };
  const gapTxt = g => g == null ? "" : g > 0 ? g + " j de marge" : g < 0 ? -g + " j de retard" : "juste à temps";
  const pill = (txt, ink, bg, key) => <Pill key={key} ink={ink} bg={bg} size="md">{txt}</Pill>; // v311 : pastille commune
  const btn = primary => ({ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 14px", borderRadius: 999, border: primary ? "none" : "1px solid " + T.line, background: primary ? T.ink900 : T.card, color: primary ? T.card : T.ink700, fontFamily: T.font, fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" });
  const toggle = id => setOpen(o => (o === id ? null : id));
  const doneBg = mixHex(T.card, ETAT_META.SHIPPED.bar, T.mode === "dark" ? .3 : .28);
  const TABS = [["resume", "Résumé", ""], ...(plan ? [["tests", "Tests", nokAll ? nokAll + " NOK" : "", true]] : []), ...(turb ? [["turbine", "Turbine", turb.issues.length ? turb.issues.length + " à voir" : "", true]] : []), ...(ach ? [["achats", "Achats", ach.retards ? ach.retards + " en retard" : "", true]] : []), ...(cash ? [["cash", "Cash", cash.lateN ? cash.lateN + " en retard" : "", true]] : []), ...(ctx.savDoc && ctx.SavTab ? [["sav", "SAV", "", true]] : []), ["comments", "Commentaires", pub.length ? String(pub.length) : ""]];
  const tile = { textAlign: "left", border: "1px solid " + T.line, borderRadius: 12, background: T.card, padding: "10px 12px", cursor: "pointer", fontFamily: T.font, color: T.ink900, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 };
  const meter = (p, c) => <span aria-hidden="true" style={{ display: "block", height: 6, borderRadius: 4, background: T.surfaceAlt, overflow: "hidden", marginTop: "auto" }}><span style={{ display: "block", height: "100%", width: Math.max(0, Math.min(100, p)) + "%", background: c }} /></span>;
  const dateTile = (label, value, sub, bad) => <div key={label} style={{ background: T.surface, borderRadius: 12, padding: "8px 12px", minWidth: 0 }}><div style={{ fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>{label}</div><div style={{ fontFamily: T.fontDisplay, fontSize: 19, fontWeight: 600, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{value || "—"}</div>{sub && <div style={{ fontSize: 11.5, color: bad ? T.red600 : T.ink500 }}>{sub}</div>}</div>;

  return (<div style={{ fontFamily: T.font }}>
    {/* Où en est la machine, en une ligne */}
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontFamily: T.fontLabel, fontSize: 13, fontWeight: 600, background: bar, color: inkOn(bar), borderRadius: 999, padding: "3px 12px" }}>{title}{shipped ? "" : " · " + pct + " %"}</span>
      <span style={{ fontSize: FZ.sm, color: T.ink700 }}>{shipped ? "Partie le " + dmy(r.depart) : daysLeft == null ? "Départ pas encore daté" : <>Départ le <b style={{ color: T.ink900 }}>{dmy(r.depart)}</b>{daysLeft > 0 ? " · dans " + daysLeft + " j" : daysLeft === 0 ? " · aujourd'hui" : ""}</>}</span>
      {drift !== 0 && !shipped && pill((drift > 0 ? "+" : "−") + Math.abs(drift) + " j sur l'initial", drift > 0 ? T.red600 : T.emerald600, drift > 0 ? T.red100 : T.emerald100, "d")}
    </div>
    <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 6, lineHeight: 1.45 }}>{meaning}{next ? " Étape suivante : " + next + "." : ""}</div>
    {/* Parcours : une barre par étape ; v269 (demandé : « on ne voit plus les sous-étapes quand on clique dessus ») : clic = ses sous-étapes */}
    <ol aria-label="Parcours de la machine" style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", gap: 3 }}>
      {RIBBON.map((s, i) => { const done = shipped || i < cur, isCur = !shipped && i === cur, on = focus === s.id;
        return <li key={s.id} style={{ flex: s.id === "PRE" ? 3 : s.id === "SHIPPED" || s.id === "PACKAGING" ? 1 : 2, minWidth: 0 }}>
          <button type="button" onClick={() => setFocus(s.id)} aria-pressed={on} aria-current={isCur ? "step" : undefined} title={"Voir les sous-étapes · " + s.label}
            style={{ width: "100%", border: "none", background: "transparent", padding: "0 0 2px", cursor: "pointer", textAlign: "left", fontFamily: T.font, minWidth: 0 }}>
            <span aria-hidden="true" style={{ display: "block", height: 10, borderRadius: 4, background: isCur ? bar : done ? doneBg : T.surfaceAlt, boxShadow: on ? "0 0 0 2px " + T.ink900 : "none" }} />
            <span style={{ display: "block", marginTop: 3, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isCur || on ? 600 : 400, color: isCur || on ? T.ink900 : T.ink500 }}>{done ? "✓ " : ""}{s.label}</span>
          </button>
        </li>; })}
    </ol>
    {(() => { const fi = RIBBON.findIndex(x => x.id === focus), fs0 = RIBBON[fi], st = STAGES.find(x => x.id === focus), state = shipped || fi < cur ? "done" : fi === cur ? "cur" : "todo", col = (ETAT_META[fs0.color] || {}).bar || bar;
      return <div className="enogia-view-in" style={{ marginTop: 8, background: T.surface, borderRadius: 12, padding: "10px 12px", borderLeft: "3px solid " + col }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b style={{ fontSize: FZ.sm, color: T.ink900 }}>{st ? "Sous-étapes · " + fs0.label : fs0.label}</b><span style={{ fontSize: 11.5, color: T.ink500 }}>{state === "done" ? "étape terminée" : state === "cur" ? "étape en cours" : "à venir"}</span>
          </div>
        {st ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "2px 16px", marginTop: 4 }}>{st.steps.map(x => <div key={x} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: FZ.xs, color: T.ink700, padding: "2px 0" }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: state === "done" ? ETAT_META.SHIPPED.bar : state === "cur" ? col : "transparent", boxShadow: state === "todo" ? "inset 0 0 0 1.5px " + T.ink300 : "none" }} />{x}</div>)}</div>
          : <div style={{ fontSize: FZ.xs, color: T.ink700, lineHeight: 1.5, marginTop: 4 }}>{focus === "PRE" ? "Design de l’ORC, commande, fabrication et montage chez les fournisseurs (armoire et skid) ou stockage externe." : MEANING.SHIPPED[1]}</div>}
        {st && st.steps.some(x => x.endsWith("*")) && <div style={{ fontSize: 11, color: T.ink500, marginTop: 4, lineHeight: 1.4 }}>{STEP_NOTE}</div>}
      </div>; })()}
    {/* Onglets */}
    <div role="tablist" aria-label="Rubriques de la fiche" style={{ display: "flex", gap: 18, borderBottom: "1px solid " + T.line, marginTop: 12 }}>
      {TABS.map(([id, label, badge, warn]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{ border: "none", background: "transparent", padding: "8px 0", minHeight: 36, cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: tab === id ? 600 : 500, color: tab === id ? T.ink900 : T.ink500, borderBottom: "2px solid " + (tab === id ? T.ink900 : "transparent"), marginBottom: -1, display: "inline-flex", alignItems: "center", gap: 6 }}>{label}{badge && <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "0 7px", background: warn ? T.red100 : T.surfaceAlt, color: warn ? T.red600 : T.ink700 }}>{badge}</span>}</button>)}
    </div>

    <div role="tabpanel" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {tab === "resume" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          {dateTile("Arrivée", dmy(r.arrivee))}
          {r.debutProd && dateTile("Début de production", dmy(r.debutProd))}
          {dateTile(r.testsFin ? "Fin des tests" : "Tests", dmy(r.testsFin || r.tests), r.tests && r.testsFin ? "début " + dmy(r.tests) : "")}
          {depEd ? <div style={{ background: T.surface, borderRadius: 12, padding: "8px 12px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>Nouvelle date de départ
              <input type="date" autoFocus={AF} value={depV} onChange={e => setDepV(e.target.value)} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setDepEd(false); } if (e.key === "Enter") saveDep(); }}
                style={{ display: "block", marginTop: 4, font: "inherit", fontSize: FZ.sm, padding: "4px 6px", border: "1px solid " + T.teal500, borderRadius: 8, background: T.card, color: T.ink900, width: "100%", boxSizing: "border-box" }} /></label>
            <span style={{ display: "flex", gap: 6 }}><button type="button" onClick={saveDep} disabled={!depV} style={{ ...btn(true), minHeight: 30 }}>Enregistrer</button><button type="button" onClick={() => setDepEd(false)} style={{ ...btn(false), minHeight: 30 }}>Annuler</button></span>
          </div>
          : <div style={{ position: "relative", minWidth: 0 }}>{dateTile(shipped ? "Départ" : "Départ prévu", dmy(r.depart), zInit ? "initial " + dmy(zInit) : "", drift > 0)}
            {ctx.setDepart && !shipped && <button type="button" onClick={() => { setDepV(r.depart ? String(r.depart).slice(0, 10) : ""); setDepEd(true); }} aria-label={"Changer la date de départ de " + r.pj} title="Changer la date de départ (admins) — reprise ensuite dans le planificateur"
              style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, border: "none", borderRadius: 8, background: "transparent", color: T.ink500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} className="e-hov" ><NavIcon name="edit" size={14} /></button>}</div>}
          {dateTile("Livraison prévue", dmy(livr), livr ? "sur site client, transport compris" : "transport non renseigné")}
        </div>
        {(tq || ct || cash || turb || ach) && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
          {tq && <button type="button" onClick={() => (ctx.testsOk ? openPage("tests", r.pj) : setTab("tests"))} title={ctx.testsOk ? "Ouvrir la fiche de tests dans la page Tests" : undefined} style={tile}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: FZ.sm }}>Tests</b>{tq.total ? pill(tq.ko ? tq.ko + " échec" + (tq.ko > 1 ? "s" : "") : tq.done === tq.total ? "terminés" : "en cours", tq.ko ? T.red600 : tq.done === tq.total ? T.emerald600 : T.amber600, tq.ko ? T.red100 : tq.done === tq.total ? T.emerald100 : T.amber100, "s") : null}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink700 }}>{tq.total ? tq.done + " test" + (tq.done > 1 ? "s" : "") + " sur " + tq.total + " renseigné" + (tq.done > 1 ? "s" : "") : "Aucun test choisi"}</span>
            <span style={{ fontSize: FZ.xs, color: dbg && dbg.nok ? T.red600 : T.ink500 }}>Checklist de debug : {dbg ? dbg.done + " / " + dbg.total + (dbg.nok ? ", " + dbg.nok + " NOK" : "") + (dbg.signed ? ", signée" : ", à signer") : "—"}</span>
            {meter(tq.total ? tq.done / tq.total * 100 : 0, tq.ko ? T.red500 : stageSoft().tests.solid)}
          </button>}
          {ct && <div style={{ ...tile, cursor: "default" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: FZ.sm }}>Contrat</b>{pill(ct.lateDays > 0 ? ct.lateDays + " j de retard" : "dans les temps", ct.lateDays > 0 ? T.red600 : T.emerald600, ct.lateDays > 0 ? T.red100 : T.emerald100, "c")}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink700 }}>{ct.refLabel} au contrat : {dmy(ct.contract)}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{cashOk ? (ct.amount != null ? "Pénalités estimées : " + fmtEur(ct.amount) : "Pas de conditions de pénalité saisies") : "Prévu : " + dmy(ct.effective)}</span>
          </div>}
          {turb && <button type="button" onClick={() => setTab("turbine")} style={tile}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: FZ.sm }}>Turbine</b>{pill(turb.installees >= turb.want ? "installée" : turb.late ? "en retard" : turb.complete ? "complète" : turb.slots.filter(s => s.allouee).length + " / " + turb.want + " allouée" + (turb.want > 1 ? "s" : ""), turb.late ? T.red600 : turb.installees >= turb.want ? T.emerald600 : T.ink700, turb.late ? T.red100 : turb.installees >= turb.want ? T.emerald100 : T.surfaceAlt, "t")}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink700 }}>{turb.cfg.l}{turb.slots.some(s => s.num) ? " · " + turb.slots.filter(s => s.num).map(s => s.num).join(", ") : ""}</span>
            <span style={{ fontSize: FZ.xs, color: turb.issues.length ? T.red600 : T.ink500 }}>{turb.issues.length ? turb.issues[0] : "Besoin le " + dmy(turb.date)}</span>
          </button>}
          {ach && <button type="button" onClick={() => setTab("achats")} style={tile}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: FZ.sm }}>Achats</b>{pill(ach.retards ? ach.retards + " commande" + (ach.retards > 1 ? "s" : "") + " en retard" : ach.counts.apasser ? ach.counts.apasser + " à commander" : "à jour", ach.retards ? T.red600 : ach.counts.apasser ? T.amber600 : T.emerald600, ach.retards ? T.red100 : ach.counts.apasser ? T.amber100 : T.emerald100, "a")}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink700 }}>{ach.counts.livre} livrée{ach.counts.livre > 1 ? "s" : ""} sur {ach.lignes} ligne{ach.lignes > 1 ? "s" : ""}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{ach.pos.length} commande{ach.pos.length > 1 ? "s" : ""} (PO)</span>
            {meter(ach.lignes ? ach.counts.livre / ach.lignes * 100 : 0, T.emerald500)}
          </button>}
          {cash && <button type="button" onClick={() => setTab("cash")} style={tile}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: FZ.sm }}>Cash</b>{pill(cash.lateN ? fmtEur(cash.late) + " en retard" : "à jour", cash.lateN ? T.red600 : T.ink700, cash.lateN ? T.red100 : T.surfaceAlt, "k")}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink700 }}>Encaissé {fmtEur(cash.paid)} sur {fmtEur(cash.total)}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{nextPay ? "Prochain : " + nextPay.label + (nextPay.factPrevue ? " · facturation " + dmy(nextPay.factPrevue) : "") : "Tous les jalons sont payés"}</span>
            {meter(cash.total ? cash.paid / cash.total * 100 : 0, T.emerald500)}
          </button>}
        </div>}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: FZ.xs, color: T.ink700 }}>
          {chefsOf(meta).map(c => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Avatar name={c} size={20} />{c}</span>)}
          <EpcTag meta={meta} />
          {testers.length > 0 && <span><span style={{ color: T.ink500 }}>Testeurs</span> {testers.join(", ")}</span>}
          {kind && <PresenceChip kind={kind} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} />}
          {meta.numSerie ? <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.ink500 }}>{meta.numSerie}</span> : plannedSnOf(r.pj) && <span title="S/N prévu d'après l'ordo, fixé à l'arrivée de la machine" style={{ fontFamily: T.fontMono, fontSize: 11, color: T.ink500, fontStyle: "italic" }}>S/N prévu {plannedSnOf(r.pj).sn}</span>}
          {canEditMeta && savePjMetaOverride && <button type="button" onClick={() => toggle("edit")} aria-expanded={open === "edit"} style={{ border: "none", background: "transparent", color: T.teal600, fontWeight: 600, fontSize: FZ.xs, cursor: "pointer", minHeight: 24, padding: 0, fontFamily: T.font }}>Modifier</button>}
        </div>
        {last && <button type="button" onClick={() => setTab("comments")} style={{ background: T.surface, borderRadius: 12, padding: "10px 12px", display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, color: T.ink900, lineHeight: 1.45 }}>« {String(last.text || "").replace(/\s+/g, " ").slice(0, 200)}{String(last.text || "").length > 200 ? "…" : ""} » <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{last.author || ""}, {relTime(last.date)}</span></button>}
      </>}

      {tab === "tests" && plan && <>
        {act.map(k => { const ids = selectedIds(plan, catalog, k), items = ids.map(id => ({ id, name: ((catalog[k] || []).find(t => t.id === id) || { name: id }).name, st: statusOf(plan, k, id) })); const ok = items.filter(x => x.st === "ok").length, ko = items.filter(x => x.st === "ko");
          return <div key={k} style={{ background: T.surface, borderRadius: 12, padding: "8px 12px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b style={{ fontSize: FZ.sm }}>{(SECTIONS.find(x => x[0] === k) || [])[1] || k}</b><span style={{ fontSize: FZ.xs, color: T.ink500 }}>{ok} réussi{ok > 1 ? "s" : ""} sur {items.length}{ko.length ? " · " : ""}</span>{ko.length > 0 && <span style={{ fontSize: FZ.xs, color: T.red600, fontWeight: 600 }}>{ko.length} échec{ko.length > 1 ? "s" : ""}</span>}</div>
            {ko.length > 0 && <div style={{ fontSize: FZ.xs, color: T.red600, marginTop: 4 }}>{ko.map(x => x.name).join(" · ")}</div>}
          </div>; })}
        <div style={{ background: T.surface, borderRadius: 12, padding: "8px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b style={{ fontSize: FZ.sm }}>Checklist de debug</b><span style={{ fontSize: FZ.xs, color: T.ink500 }}>{dbg.done} / {dbg.total} renseignés{dbg.signed ? " · signée" : " · pas encore signée"}</span>{dbg.nok > 0 && <span style={{ fontSize: FZ.xs, color: T.red600, fontWeight: 600 }}>{dbg.nok} NOK</span>}</div>
          {dbg.nok > 0 && <div style={{ fontSize: FZ.xs, color: T.red600, marginTop: 4 }}>{dbgSecs.flatMap(s => s.items).filter(i => plan.debug && plan.debug.rows && plan.debug.rows[i.id] && plan.debug.rows[i.id].r === "nok").map(i => i.label).join(" · ")}</div>}
        </div>
        <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{testers.length ? "Testeurs : " + testers.join(", ") + "." : "Aucun testeur affecté."} Le détail se remplit dans la page Tests.</div>
        {ctx.testsOk && <OpenIn label="Ouvrir dans Tests" onClick={() => openPage("tests", r.pj)} />}
      </>}

      {tab === "turbine" && turb && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: FZ.xs, color: T.ink700 }}>{turb.cfg.l} · besoin le <b>{dmy(turb.date)}</b>{turb.roue ? " · roue prévue " + turb.roue : ""}{turb.inj ? " · injecteur prévu " + turb.inj : ""}</div>
        {turb.slots.map((s, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(120px,1.2fr) repeat(2,minmax(100px,1fr)) minmax(120px,auto)", gap: 8, alignItems: "center", padding: "8px 12px", background: T.surface, borderRadius: 12, fontSize: FZ.xs }}>
          <span><span style={{ display: "block", color: T.ink500 }}>Turbine{turb.slots.length > 1 ? " " + (i + 1) : ""}</span><b style={{ color: s.allouee ? T.ink900 : T.ink500 }}>{s.num || (s.estNum ? "prochaine libre : " + s.estNum : "à attribuer")}</b></span>
          <span><span style={{ display: "block", color: T.ink500 }}>Roue</span><b style={{ color: s.roue ? T.ink900 : T.ink500 }}>{s.roue || "—"}</b></span>
          <span><span style={{ display: "block", color: T.ink500 }}>Injecteur</span><b style={{ color: s.inj ? T.ink900 : T.ink500 }}>{s.inj || "—"}</b></span>
          <span style={{ textAlign: "right" }}>{s.installee ? pill("Installée le " + dmy(s.installee), T.emerald600, T.emerald100, "i") : s.dispo ? <><span style={{ display: "block", color: T.ink500 }}>{s.estimee ? "estimée" : "disponible"} le {dmy(s.dispo)}</span><b style={{ color: s.ecart < 0 ? T.red600 : s.ecart < 5 ? T.amber600 : T.emerald600 }}>{gapTxt(s.ecart)}</b></> : <span style={{ color: T.ink500 }}>pas de date</span>}</span>
        </div>)}
        {turb.issues.length > 0 && <div style={{ fontSize: FZ.xs, color: T.red600 }}>{turb.issues.join(" · ")}</div>}
        {ctx.openPage && <OpenIn label="Ouvrir dans Turbines › Besoins" onClick={() => openPage("turbines", "orc")} />}
      </div>}

      {/* v326 : onglet SAV (tickets, interventions, contrat ; demander une intervention) — composant chargé à la demande */}
      {tab === "sav" && ctx.savDoc && ctx.SavTab && <React.Suspense fallback={null}><ctx.SavTab pj={r.pj} doc={ctx.savDoc} dem={ctx.demDoc} onOpenSav={() => ctx.openSav("tickets", r.pj)} onRequest={() => ctx.openSav("planning", r.pj)} /></React.Suspense>}
      {tab === "achats" && ach && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
          {ACHAT_ST.filter(([k]) => k !== "nc" || ach.counts.nc).map(([k, l]) => dateTile(l, String(ach.counts[k]), "", k === "nc" && ach.counts.nc > 0))}
        </div>
        {ach.pos.length > 0 ? ach.pos.map(p => <div key={p.numero} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: T.surface, borderRadius: 8, fontSize: FZ.xs }}>
          <span style={{ fontFamily: T.fontMono, fontWeight: 600, color: T.ink900 }}>{p.numero}</span>
          <span style={{ flex: 1, color: T.ink500 }}>{p.lignes} ligne{p.lignes > 1 ? "s" : ""}{p.source === "odoo" ? " · Odoo" : ""}</span>
          <span style={{ color: p.retard ? T.red600 : T.ink700, fontWeight: p.retard ? 600 : 500 }}>{(ACHAT_ST.find(x => x[0] === p.statut) || ["", ""])[1]}{p.livraison ? " · livraison " + dmy(p.livraison) : ""}{p.retard ? " · en retard" : ""}</span>
        </div>) : <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucune commande (PO) pour l'instant</div>}
        {ctx.openPage && <OpenIn label="Ouvrir dans Achats / Appro" onClick={() => openPage("achats")} />}
      </div>}

      {tab === "cash" && cash && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pays.map(p => <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: T.surface, borderRadius: 8, fontSize: FZ.xs }}>
          <span style={{ flex: 1, minWidth: 0, color: T.ink900, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.label}>{p.label}{p.shared ? <span style={{ fontWeight: 400, color: T.ink500 }}> · paiement unique du contrat, non divisé</span> : p.split > 1 ? <span style={{ fontWeight: 400, color: T.ink500 }}> · part 1/{p.split}</span> : null}</span>
          <span style={{ color: T.ink500, whiteSpace: "nowrap" }}>{p.done ? "payé " + dmy(p.doneAt) : p.factPrevue ? "facturation " + dmy(p.factPrevue) : ""}</span>
          <span style={{ fontWeight: 600, color: p.k === "late" ? T.red600 : T.ink900, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtEur(p.montant)}</span>
          <span style={{ width: 92, textAlign: "right", color: p.k === "late" ? T.red600 : p.done ? T.emerald600 : T.ink500, fontWeight: 600 }}>{STATUS_TXT[p.k] || ""}</span>
        </div>)}
      </div>}

      {tab === "comments" && <ProjectComments pj={r.pj} comments={list} addComment={addComment} deleteComment={deleteComment} pinOk={pinOk} authorName={authorName} resolveComment={resolveComment} />}
    </div>

    {/* Actions */}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px solid " + T.line }}>
      {dayAction && <button type="button" onClick={dayAction.onToggle} title={dayAction.hint} style={{ ...btn(false), color: dayAction.off ? T.emerald600 : T.red600 }}><NavIcon name="calendar" size={14} />{dayAction.label}</button>}
      {pinOk && delayTypes && <button type="button" onClick={() => toggle("delays")} aria-expanded={open === "delays"} style={btn(false)}><NavIcon name="clock" size={14} />Déclarer un retard</button>}
      {pinOk && <button type="button" onClick={() => { try { window.dispatchEvent(new CustomEvent("enogia:openSynthese", { detail: { pj: r.pj } })); } catch (e) {} onClose && onClose(); }} style={{ ...btn(true), marginLeft: "auto" }}>Ouvrir la fiche projet</button>}
    </div>
    {open && <div className="enogia-view-in" style={{ marginTop: 12, padding: 12, background: T.surface, borderRadius: 12 }}>
      {open === "delays" && <DelayAllocations pj={r.pj} delays={(delays && delays[r.pj]) || []} delayTypes={delayTypes} setDelayTypes={setDelayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation} addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} />}
      {open === "edit" && <EditMetaForm meta={meta} gamme={r.gamme} onCancel={() => setOpen(null)} onSave={async f => { const ok = await savePjMetaOverride(r.pj, f); if (ok) setOpen(null); }} />}
    </div>}
  </div>);
}

export function RowDialog(props) {
  const { r, onClose } = props;
  const [closing, setClosing] = useState(false), box = useRef(null), tm = useRef(0);
  const close = () => { if (closing) return; setClosing(true); tm.current = setTimeout(onClose, 180); };
  useEffect(() => {
    const prev = document.activeElement, k = e => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", k); if (box.current) box.current.focus();
    const ov = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ov; clearTimeout(tm.current); if (prev && prev.focus) prev.focus(); };
  }, []); // eslint-disable-line
  if (!r) return null;
  const meta = getPjMeta(r.pj, r), bar = ((ETAT_META[r.etat] || {}).bar) || T.teal500;
  const sub = [r.gamme, meta.pays && meta.pays !== "—" ? meta.pays : ""].filter(Boolean);
  return (<div className={"enogia-dlg-backdrop" + (closing ? " closing" : "")} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(8,12,28,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={"Fiche " + r.pj} className="enogia-dlg"
      style={{ width: "min(720px, 100%)", maxHeight: "90dvh", overflowY: "auto", background: T.card, borderRadius: 22, boxShadow: "0 30px 80px rgba(8,12,28,.35), 0 0 0 1px " + T.line, outline: "none" }}>
      <div aria-hidden="true" style={{ height: 6, background: bar }} />
      <div style={{ padding: "16px 22px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <PjPlate pj={r.pj} size="lg" />
          <span style={{ fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink900, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
          {sub.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink500 }}>{meta.pays && meta.pays !== "—" && <CountryFlag pays={meta.pays} size={12} />}{sub.join(" · ")}</span>}
          <button type="button" onClick={close} aria-label="Fermer" title="Fermer (Échap)" style={{ marginLeft: "auto", border: "none", background: T.surface, color: T.ink700, borderRadius: 999, width: 34, height: 34, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><NavIcon name="close" size={12} /></button>
        </div>
        <RowDetail {...props} onClose={close} />
      </div>
    </div>
  </div>);
}

// Ouvre la fiche d'un PJ à partir de son numéro (Gantt, Calendrier, accueil).
export function PjDialog({ pj, data, ...rest }) {
  const r = (data || []).find(x => x.pj === pj);
  return r ? <RowDialog key={pj + (rest.initialTab || "")} r={r} {...rest} /> : null;
}
