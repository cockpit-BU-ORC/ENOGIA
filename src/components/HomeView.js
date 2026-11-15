import React, { useMemo, useState, useRef } from "react";
import { T, FZ, R, stageSoft, stripeBg, stripeHues, alertSoft, inkOn } from "../theme";
import { getPjMeta, chefsOf, ETAT_META, PresenceChip, presenceKind, presenceFirstDate, presenceDates, countShippedYTD, departedNotShipped } from "../pjMeta";
import { NavIcon, AnimatedNumber, EmptyState, PjPlate, Hl, Pill as SPill } from "./SharedUI";
import { openMentionsFor, chefAccount, nameFromEmail } from "../mentions";
import { SITE_NAME, SITE_SCOPE, SITE_SUB } from "../siteName";
import { testerOfEmail, planOf, testersOf } from "../testPlan";
import { RoleHome } from "./RoleHome";
import { profileOf, effectiveRole, pjsOfProfile, ROLES } from "../profiles";

// v173 — direction « Éditorial industriel » : sur-titre d'atelier en mono, grande phrase légère, chiffres géants sous un filet marine,
//   n° de PJ en plaques, parcours en blocs pleins étiquetés.
// v169 — maquette validée (taste-skill) : bloc principal « À traiter » + « Départs à venir », parcours en une barre, cartes plates.
// v162 — Page d'accueil « Aujourd'hui » : ce qui compte pour la personne connectée, en un coup d'œil.
//   Blocs selon le profil (tous / chef de projet / testeur / manager), réglables par chacun via « Personnaliser ».
//   • un chiffre phare (machines livrées) + 4 repères animés ;
//   • « Pour moi » : mentions @ encore ouvertes ;  « Mes projets » : projets dont je suis chef de projet ;
//   • prochains départs, dérives les plus fortes, et ce qui a bougé depuis ma dernière visite.
// Toutes les lignes ouvrent la fiche du PJ ; rien n'est modifiable ici (lecture seule).
const DAY = 86400000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const fmtD = iso => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", ""); };
const inDays = iso => { if (!iso) return null; const d = new Date(iso); if (isNaN(d)) return null; return Math.round((d - startOfToday()) / DAY); };
const relDays = n => n == null ? "" : n === 0 ? "aujourd'hui" : n === 1 ? "demain" : n > 1 ? "dans " + n + " j" : "il y a " + (-n) + " j";
const hello = () => { const h = new Date().getHours(); return h < 5 || h >= 18 ? "Bonsoir" : "Bonjour"; };

const BLOCKS = [
  ["mentions", "Pour moi", "Les @mentions qui vous attendent"],
  ["since", "Depuis ma dernière visite", "Ce qui a changé dans le planning"],
  ["projects", "Mes projets", "Vos projets en cours (chef de projet)"],
  ["tests", "Mes tests à venir", "Les machines où vous êtes testeur"],
  ["departs", "Prochains départs", "Les départs usine à venir"],
  ["watch", "À surveiller", "Départs qui glissent vs planning initial"],
  ["journey", "Le parcours d'une machine", "Répartition par étape de production"],
];
const prefKey = email => "enogia_home_" + String(email || "anon").toLowerCase();
const loadPrefs = email => { try { return JSON.parse(localStorage.getItem(prefKey(email)) || "{}") || {}; } catch (e) { return {}; } };

export function HomeView({ produit, data, comments, myEmail, myName, people, unseenChanges, lastImport, onOpenPj, onGo, pinOk, testsDoc, profiles, owner, cash, turbineDoc, onOpenCash, prodDoc, canProdTurb, plan, closurePeriods, productionExclusions, saveHomeLayout }) {
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE"), [data]);
  const today0 = startOfToday();

  const open = useMemo(() => rows.filter(r => r.etat !== "SHIPPED"), [rows]);
  const shipped = useMemo(() => countShippedYTD(rows), [rows]);
  const notShipped = useMemo(() => departedNotShipped(rows), [rows]); // v243 : départ passé mais pas « Expédiée »
  const shipped28 = useMemo(() => rows.filter(r => { if (!r.depart) return false; const n = inDays(r.depart); return n != null && n <= 0 && n >= -28; }).length, [rows]); // eslint-disable-line
  const departs = useMemo(() => open.filter(r => r.depart && !isNaN(new Date(r.depart)) && new Date(r.depart) >= today0).sort((a, b) => new Date(a.depart) - new Date(b.depart)), [open]); // eslint-disable-line
  const next30 = departs.filter(r => inDays(r.depart) <= 30).length;
  const late = useMemo(() => open.filter(r => r.drift > 0).sort((a, b) => b.drift - a.drift), [open]);
  const mentions = useMemo(() => openMentionsFor(comments, myEmail), [comments, myEmail]);
  const STAGE_IDS = ["MONTAGE", "ELEC", "TESTS", "PACKAGING"];
  const inProd = open.filter(r => STAGE_IDS.includes(r.etat)).length;

  const meAcc = (people || []).find(p => String(p.email || "").toLowerCase() === String(myEmail || "").toLowerCase());
  const fullName = (meAcc && meAcc.name) || (String(myName || "").includes("@") ? nameFromEmail(myEmail) : myName) || "";
  const firstName = String(fullName).split(" ")[0] || "";

  const mine = useMemo(() => {
    if (!fullName) return [];
    return open.filter(r => chefsOf(getPjMeta(r.pj, r)).some(c => !!chefAccount(c, [{ name: fullName, email: myEmail }])))
      .sort((a, b) => (a.depart ? new Date(a.depart) : 9e15) - (b.depart ? new Date(b.depart) : 9e15));
  }, [open, fullName, myEmail]);

  const myTester = useMemo(() => (testsDoc ? testerOfEmail(testsDoc, myEmail) : null), [testsDoc, myEmail]);
  const myTests = useMemo(() => {
    if (!myTester || !testsDoc) return [];
    const todayIso = today0.getFullYear() + "-" + String(today0.getMonth() + 1).padStart(2, "0") + "-" + String(today0.getDate()).padStart(2, "0");
    return open.filter(r => r.tests && String(r.testsFin || r.tests).slice(0, 10) >= todayIso && planOf(testsDoc, r.pj).assign.some(a => a.tid === myTester.id))
      .sort((a, b) => String(a.tests).localeCompare(String(b.tests)));
  }, [open, myTester, testsDoc]); // eslint-disable-line

  // v188 : accueil selon le rôle (Manager › Réglages › Personnes et rôles, sinon déduit) ; les admins peuvent afficher chaque accueil.
  const profile = useMemo(() => profileOf(profiles, myEmail), [profiles, myEmail]);
  const myPjs = useMemo(() => [...new Set([...pjsOfProfile(profile, rows), ...mine.map(r => r.pj)])], [profile, rows, mine]);
  const autoRole = effectiveRole(profile, { owner, tester: !!myTester, hasProjects: myPjs.length > 0, prodTurb: !!canProdTurb && !owner });
  // v231 (demandé : « je dois avoir la vision de chaque onglet même si je ne suis pas indiqué testeur ») : le propriétaire choisit
  // l'accueil de n'importe quel poste, et la personne vue (chef de projet, testeur) ; les autres gardent l'accueil de leur poste.
  const [viewAs, setViewAsS] = useState(() => { try { return JSON.parse(localStorage.getItem("enogia_home_viewas") || "null") || {}; } catch (e) { return {}; } });
  const setViewAs = v => { const n = { ...viewAs, ...v }; setViewAsS(n); try { localStorage.setItem("enogia_home_viewas", JSON.stringify(n)); } catch (e) { /* stockage indisponible */ } };
  const role = owner && viewAs.role ? viewAs.role : autoRole;
  const chefList = useMemo(() => owner ? [...new Set(open.flatMap(r => chefsOf(getPjMeta(r.pj, r))).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")) : [], [owner, open]);
  const testerList = useMemo(() => owner && testsDoc ? testersOf(testsDoc) : [], [owner, testsDoc]);
  const asChef = owner && role === "cdp" ? (chefList.includes(viewAs.chef) ? viewAs.chef : chefList[0] || "") : "";
  const asTester = owner && role === "testeur" ? (testerList.find(t => t.id === viewAs.tester) || testerList[0] || null) : null;
  const homePjs = asChef ? open.filter(r => chefsOf(getPjMeta(r.pj, r)).includes(asChef)).map(r => r.pj) : myPjs;
  const homeTester = owner && role === "testeur" ? asTester : myTester;
  const homeName = asChef ? asChef.split(" ")[0] : asTester ? String(asTester.name || "").split(" ")[0] : firstName;
  const nChanged = (unseenChanges || []).reduce((n, e) => n + ((e.stats && e.stats.nPj) || 0), 0);
  const nNew = (unseenChanges || []).reduce((n, e) => n + ((e.stats && e.stats.nNew) || 0), 0);

  // Profil → blocs affichés par défaut ; chacun peut ensuite cocher/décocher (mémorisé sur ce poste, par e-mail).
  const [prefs, setPrefs] = useState(() => loadPrefs(myEmail));
  const [customize, setCustomize] = useState(false);
  const defaults = { mentions: true, since: true, departs: true, journey: true, projects: mine.length > 0, tests: !!myTester, watch: !!pinOk || mine.length > 0 };
  const on = id => (prefs[id] != null ? !!prefs[id] : defaults[id]);
  const available = id => id !== "tests" || !!myTester;
  const setPref = (id, v) => { const n = { ...prefs, [id]: v }; setPrefs(n); try { localStorage.setItem(prefKey(myEmail), JSON.stringify(n)); } catch (e) {} };

  // v169 (maquette validée) : cartes plates — bordure fine, pas d'ombre (l'ombre est réservée à ce qui flotte), liseré de 4 px conservé.
  const card = { background: T.card, borderRadius: R.lg, border: "1px solid " + T.line, padding: "14px 16px", minWidth: 0, boxSizing: "border-box" };
  const S = stageSoft(), H = stripeHues(), A = alertSoft();
  const cardS = color => ({ ...card, background: stripeBg(color, T.card, 4), paddingTop: 18 });
  const grey = { fontSize: FZ.xs, color: T.ink500 };
  const link = { border: "none", background: "transparent", color: T.accentInk /* v285 : 3,2:1 → ≥ 4,5:1 */, fontWeight: 600, fontSize: FZ.sm, cursor: "pointer", padding: "4px 0", minHeight: 24, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: T.font };
  const etatOf = useMemo(() => { const m = new Map(); rows.forEach(r => m.set(r.pj, r.etat)); return m; }, [rows]);


  // v350 (audit de performance, Vercel rerender-no-inline-components) : ces petits composants sont créés une seule fois (sinon recréés à
  // chaque rendu, ce qui remontait tout leur contenu, dans l'accueil et dans RoleHome) ; ce qu'ils lisent du composant passe par live.
  const live = useRef(null); live.current = { onOpenPj, etatOf };
  const { Kpi, Pill, Row, Head } = useMemo(() => {
    const greyS = () => ({ fontSize: FZ.xs, color: T.ink500 });
    const Kpi = ({ label, value, tone, onClick, hint, sub, answer }) => (
    <button type="button" onClick={onClick} disabled={!onClick} className="enogia-kpi enogia-kpi-ed" title={hint}
      style={{ border: "none", borderRight: "1px solid " + T.line, background: "transparent", textAlign: "left", cursor: onClick ? "pointer" : "default", fontFamily: T.font, display: "flex", flexDirection: "column", gap: 4, padding: "12px 16px 6px 0", minWidth: 0 }}>
      <span style={{ fontSize: answer ? "clamp(36px,3.6vw,46px)" /* v343 (audit taste) : chiffre « réponse » 1,3 × */ : "clamp(28px,2.8vw,36px)" /* v343 : 56 → 36 px (taste : 24–40 px) */, fontWeight: 500 /* v284 : 300 → 500, plus lisible (audit apple-design, lot 3) */, lineHeight: .95, letterSpacing: "-.03em", fontFamily: T.fontDisplay, color: tone || T.ink900, fontVariantNumeric: "tabular-nums" }}><AnimatedNumber value={value} /></span>
      <span style={{ fontSize: FZ.sm, fontWeight: 500, color: T.ink700 }}>{label}</span>
      {sub && <span style={{ ...greyS(), minHeight: 16 }}>{sub}</span>}
    </button>
  );
    const Pill = ({ tone, children }) => <SPill bg={tone.bg} ink={tone.ink}>{children}</SPill>;
    const Row = ({ pj, pill, main, right, rightColor, presence, first }) => (
    <button type="button" className="enogia-homeline" onClick={() => live.current.onOpenPj && live.current.onOpenPj(pj)}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 40, border: "none", borderTop: first ? "none" : "1px solid " + T.line, background: "transparent", padding: "8px 6px", borderRadius: 0, cursor: "pointer", textAlign: "left", fontFamily: T.font, color: T.ink900 }}>
      {pill}
      <PjPlate pj={pj} style={{ minWidth: 58, textAlign: "center", boxShadow: "inset 3px 0 0 " + ((ETAT_META[live.current.etatOf.get(pj)] || {}).bar || T.ink300) }} />
      <span style={{ fontSize: FZ.sm, color: T.ink700, minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{main}</span>
      {presence}
      <span style={{ fontSize: FZ.xs, fontWeight: 600, color: rightColor || T.ink500, flexShrink: 0, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{right}</span>
    </button>
  );
    const Head = ({ title, sub, count }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontSize: FZ.md, fontWeight: 600, color: T.ink900 }}>{title}</h2>
      {sub && <span style={greyS()}>{sub}</span>}
      {count > 0 && <span style={{ ...greyS(), marginLeft: "auto", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count}</span>}
    </div>
  );
    return { Kpi, Pill, Row, Head };
  }, []);
  // Pastille d'une ligne « À traiter » : teinte pâle + texte foncé de la même teinte.
 // v311 : pastille commune
  // Ligne de liste : n° de PJ (couleur d'état), texte principal, valeur à droite en chiffres tabulaires.
  const presenceOf = r => r.clientPresence && presenceKind(r.clientPresence) ? <PresenceChip kind={presenceKind(r.clientPresence)} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} compact tiny short /> : null;
  const nomOf = r => { const m = getPjMeta(r.pj, r); return m.nomProjet && m.nomProjet !== "—" ? m.nomProjet : ""; };
  const empty = (icon, title, hint) => <EmptyState compact icon={icon} title={title} hint={hint} tone="ok" />;

  // v178 : surligneur décalé (trait de couleur sous le bas des lettres) au lieu de la seule couleur du chiffre.
  const num = (v, c) => <Hl color={c + "88"} style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{v}</Hl>;
  const nextDep = departs[0];
  const maxLate = late[0];
  const stageCount = id => open.filter(r => r.etat === id).length;
  const journey = [["MONTAGE", "Montage méca"], ["ELEC", "Montage élec"], ["TESTS", "Tests"], ["PACKAGING", "Packaging"]].map(([id, l]) => ({ id, l, n: stageCount(id), c: ETAT_META[id] ? ETAT_META[id].bar : T.teal500 }));
  const notStarted = Math.max(0, open.length - journey.reduce((a, j) => a + j.n, 0));

  // « À traiter » : mentions ouvertes, mes tests à venir, dérives — une pastille par ligne.
  const withTests = on("tests") && !!myTester;
  const todo = [
    ...(on("mentions") ? mentions.slice(0, 4).map(({ pj, idx, c }) => ({ key: "m" + pj + idx, pj, pill: <Pill tone={A.note}>Mention</Pill>, main: (c.author || "Quelqu'un") + " : « " + String(c.text || "").replace(/\s+/g, " ") + " »", right: fmtD(c.date) })) : []),
    ...(withTests ? myTests.slice(0, 3).map(r => ({ key: "t" + r.pj, pj: r.pj, pill: <Pill tone={S.tests}>Test</Pill>, main: nomOf(r) || "Tests", presence: presenceOf(r), right: fmtD(r.tests) + (r.testsFin ? " → " + fmtD(r.testsFin) : "") })) : []),
    ...(on("watch") ? late.slice(0, 4).map(r => ({ key: "w" + r.pj, pj: r.pj, pill: <Pill tone={A.orange}>Dérive</Pill>, main: "Départ " + fmtD(r.depart) + (nomOf(r) ? " · " + nomOf(r) : ""), right: "+" + r.drift + " j", rightColor: T.amber600 })) : []),
  ];
  const todoTotal = (on("mentions") ? mentions.length : 0) + (withTests ? myTests.length : 0) + (on("watch") ? late.length : 0);
  const showTodo = on("mentions") || on("watch") || on("since") || withTests;
  const showSide = on("departs");
  const since = nChanged + nNew === 0 ? "Le planning n'a pas bougé depuis votre dernière visite." : "Depuis votre dernière visite : " + nChanged + " PJ modifié" + (nChanged > 1 ? "s" : "") + (nNew ? ", " + nNew + " nouveau" + (nNew > 1 ? "x" : "") : "");

  // v224 (demandé : « certains cadrans ne peuvent pas être réduits ou déplacés ») : chiffres clés et départs à venir passent dans la grille des cadrans
  // v250 (critique design) : couleur des chiffres = jugement, comme dans les KPI — vert = bon (livrées), rouge = mauvais (retard), encre sinon
  const kpiEl = <div key="kpis" aria-label="Chiffres clés" data-span={12} className="enogia-stagger enogia-kpis-ed" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0 16px", borderTop: "3px solid " + T.teal500, marginBottom: 20 }}>
        <Kpi color={S.depart.ring} label="Expédiées depuis mai" value={shipped} tone={shipped ? T.emerald600 : T.ink900} sub={shipped28 > 0 ? shipped28 + " sur les 28 derniers jours" : open.length + " encore en cours"} onClick={() => onGo && onGo("table")} hint="Ouvrir la liste" />
        <Kpi color={S.production.ring} label="En production" value={inProd} sub={"sur " + open.length + " projet" + (open.length > 1 ? "s" : "") + " ouvert" + (open.length > 1 ? "s" : "")} onClick={() => onGo && onGo("table")} hint="Ouvrir la liste" />
        <Kpi color={S.tests.ring} label="Départs sous 30 j" value={next30} sub={nextDep ? "prochain " + nextDep.pj + " · " + fmtD(nextDep.depart) : "Aucun départ à venir"} onClick={() => onGo && onGo("calendar")} hint="Ouvrir le calendrier" />
        <Kpi answer color={H.warn} label="En retard sur l'initial" value={late.length} tone={late.length ? T.red500 : T.ink900} sub={maxLate ? "max " + maxLate.pj + " · +" + maxLate.drift + " j" : "Aucune dérive"} onClick={() => onGo && onGo("table")} hint="Ouvrir la liste" />
      </div>;
  const depEl = <section key="departs" aria-label="Prochains départs" style={{ ...cardS(S.depart.ring) }}>
        <Head title="Prochains départs" count={departs.length} />
        {departs.length === 0 ? empty("inbox", "Aucun départ prévu", "Aucune machine n'a de date de départ à venir.") :
          departs.slice(0, 5).map((r, i) => { const n = inDays(r.depart); return <Row key={r.pj} first={i === 0} pj={r.pj} main={<span style={{ color: T.ink500 }}>{nomOf(r)}</span>} presence={presenceOf(r)} right={fmtD(r.depart) + (n != null && n <= 7 ? " · " + relDays(n) : "")} />; })}
      </section>;

  const parcoursEl = (
        <section key="parcours" aria-label="Où en sont les machines" style={cardS(H.brand)}>
          <Head title={"Où en sont les " + open.length + " machine" + (open.length > 1 ? "s" : "") + " ouverte" + (open.length > 1 ? "s" : "")} />
          <div style={{ ...grey, marginBottom: 10 }}>+ {shipped} expédiée{shipped > 1 ? "s" : ""} depuis janvier{notShipped.length > 0 && <span title={notShipped.map(r => r.pj).join(", ")} style={{ color: T.amber600, fontWeight: 600 }}> · {notShipped.length} départ{notShipped.length > 1 ? "s" : ""} passé{notShipped.length > 1 ? "s" : ""} pas encore « Expédiée » ({notShipped.map(r => r.pj).join(", ")})</span>}</div>
          {open.length === 0 ? <div style={grey}>Aucune machine ouverte pour l'instant</div> : (<>
            <div role="img" aria-label={journey.map(j => j.l + " " + j.n).join(", ") + ", pas encore lancées " + notStarted} className="enogia-bar-fill" style={{ display: "flex", height: 32, gap: 4 }}>
              {journey.filter(j => j.n > 0).map(j => <div key={j.id} title={j.l + " : " + j.n} style={{ flex: j.n, minWidth: 0, background: j.c, color: inkOn(j.c), borderRadius: 4, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 11, fontWeight: 600, letterSpacing: ".01em", whiteSpace: "nowrap", overflow: "hidden" }}>{j.n}</div>)}
              {notStarted > 0 && <div title={"Pas encore lancées : " + notStarted} style={{ flex: notStarted, minWidth: 0, background: T.ink100, color: T.ink900, borderRadius: 4, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 11, fontWeight: 600, letterSpacing: ".01em", whiteSpace: "nowrap", overflow: "hidden" }}>{notStarted}</div>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 8, fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>
              {journey.map(j => <span key={j.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: j.c }} />{j.l} <b style={{ color: T.ink900 }}>{j.n}</b></span>)}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: T.ink100, border: "1px solid " + T.line }} />Pas encore lancées <b style={{ color: T.ink900 }}>{notStarted}</b></span>
            </div>
          </>)}
        </section>
  );
  // v229 : phrase d'ouverture propre au poste (calculée par RoleHome) — mêmes surlignages que la phrase historique
  const LEAD_C = { production: S.production.ring, warn: T.amber500, ok: S.finProd.ring, tests: S.tests.ring, late: T.red500 };
  const leadStyle = { margin: "0 0 16px", fontFamily: T.fontDisplay, fontWeight: 300, fontSize: "clamp(18px,1.9vw,28px)", lineHeight: 1.25, letterSpacing: "-.015em", color: T.ink900, maxWidth: "none" };
  const renderLead = segs => <p className="enogia-view-in" style={leadStyle}>{segs.map((x, k) => typeof x === "string" ? <React.Fragment key={k}>{x}</React.Fragment> : <React.Fragment key={k}>{num(x.t, LEAD_C[x.c] || T.amber500)}</React.Fragment>)}</p>;
  const layouts = (profiles && profiles.homeLayouts) || {};

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          {/* v183 : nom du site en titre de l'accueil, avec son sous-titre (demandé) */}
          <h1 style={{ margin: "0 0 2px", fontFamily: T.fontDisplay, fontWeight: 600, fontSize: "clamp(28px,3vw,36px)", letterSpacing: "-.01em", color: T.ink900, lineHeight: 1.1 }}>{SITE_NAME} <Hl color={T.amber500} style={{ whiteSpace: "nowrap" }}>{SITE_SCOPE}</Hl></h1>
          <div style={{ fontSize: FZ.sm, color: T.ink500, marginBottom: 14 }}>{SITE_SUB}</div>
          {(!role || role === "direction") && <p className="enogia-view-in" style={{ margin: 0, fontFamily: T.fontDisplay, fontWeight: 300, fontSize: "clamp(18px,1.9vw,28px)", lineHeight: 1.25, letterSpacing: "-.015em", color: T.ink900, maxWidth: "none" }}>
            {hello()}{firstName ? " " + firstName : ""}. {num(inProd + " machine" + (inProd > 1 ? "s" : ""), S.production.ring)} avance{inProd > 1 ? "nt" : ""}, {num(late.length, T.amber500)} glisse{late.length > 1 ? "nt" : ""}, {num(next30, S.finProd.ring)} part{next30 > 1 ? "ent" : ""} d'ici un mois.
          </p>}
        </div>
        {!role && <button type="button" className="enogia-ui-edit" onClick={() => setCustomize(v => !v)} aria-expanded={customize}
          style={{ border: "1px solid " + T.line, background: customize ? T.teal100 : "transparent", color: T.ink700, borderRadius: R.pill, padding: "6px 12px", minHeight: 28, fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", fontFamily: T.font, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <NavIcon name="edit" size={13} />Personnaliser
        </button>}
      </div>

      {customize && !role && (
        <div style={{ ...card, marginBottom: 12, display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
          <div style={{ width: "100%", ...grey }}>Choisissez ce qui apparaît sur votre page d'accueil (enregistré sur ce poste).</div>
          {BLOCKS.filter(([id]) => available(id)).map(([id, l, d]) => (
            <label key={id} title={d} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 24, fontSize: FZ.sm, color: T.ink900, cursor: "pointer" }}>
              <input type="checkbox" checked={on(id)} onChange={e => setPref(id, e.target.checked)} style={{ accentColor: T.teal500 }} />{l}
            </label>
          ))}
        </div>
      )}

      {!role && kpiEl}

      {owner && <div role="tablist" aria-label="Accueil affiché" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, margin: "0 0 14px" }}>
        <span style={{ fontSize: FZ.xs, color: T.ink500, fontWeight: 600, marginRight: 4 }}>Accueil de :</span>
        {ROLES.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={role === k} onClick={() => setViewAs({ role: k })} style={{ border: "1px solid " + (role === k ? T.ink900 : T.line), background: role === k ? T.ink900 : T.card, color: role === k ? T.card : T.ink700, borderRadius: 999, padding: "3px 12px", minHeight: 28, fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{l}</button>)}
        {role === "cdp" && chefList.length > 0 && <select aria-label="Chef de projet affiché" value={asChef} onChange={e => setViewAs({ chef: e.target.value })} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink900, borderRadius: 8, minHeight: 28, padding: "0 8px", fontSize: FZ.xs, fontFamily: T.font }}>{chefList.map(c => <option key={c} value={c}>{c}</option>)}</select>}
        {role === "testeur" && testerList.length > 0 && <select aria-label="Testeur affiché" value={asTester ? asTester.id : ""} onChange={e => setViewAs({ tester: e.target.value })} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink900, borderRadius: 8, minHeight: 28, padding: "0 8px", fontSize: FZ.xs, fontFamily: T.font }}>{testerList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
        {role !== autoRole && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>— vue telle que la personne la voit ; la disposition réglée ici vaut pour tout le poste.</span>}
      </div>}
      {role && <RoleHome produit={produit} key={role} kpiEl={kpiEl} depEl={depEl} parcoursEl={parcoursEl} role={role} profile={profile} rows={rows} open={open} late={late} mentions={mentions} myPjs={homePjs} testsDoc={testsDoc} myTester={homeTester} turbineDoc={turbineDoc} owner={owner} cash={cash} onOpenPj={onOpenPj} onGo={onGo} onOpenCash={onOpenCash}
        prodDoc={canProdTurb ? prodDoc : null} plan={plan} closurePeriods={closurePeriods} productionExclusions={productionExclusions} hello={hello() + (homeName ? " " + homeName : "")} renderLead={renderLead}
        layout={layouts[role] || {}} onLayout={owner && saveHomeLayout ? lay => saveHomeLayout(role, lay) : undefined}
        ui={{ Row, Head, cardS, Pill, presenceOf, nomOf, empty, grey, link, S, H, A }} />}


      {!role && (showTodo || showSide) && (
        <div className="enogia-stagger" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
          {showTodo && (
            <section aria-label="À traiter" style={{ ...cardS(H.note), flex: "3 1 420px" }}>
              <Head title="À traiter" sub="mentions, tests et dérives qui vous concernent" count={todoTotal} />
              {todo.length === 0 && (on("since")
                ? <div style={{ ...grey, padding: "8px 0" }}>Rien à traiter : personne ne vous attend et aucun départ ne glisse.</div>
                : empty("check", "Rien à traiter", "Personne ne vous attend et aucun départ ne glisse."))}
              {todo.map((t, i) => <Row key={t.key} first={i === 0} {...t} />)}
              {on("since") && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: todo.length ? "1px solid " + T.line : "none", paddingTop: 8 }}>
                  <span style={grey}>{since}</span>
                  {nChanged + nNew > 0 && <button type="button" onClick={() => onGo && onGo("changes")} className="enogia-homelink" style={{ ...link, marginLeft: "auto" }}>Voir le détail <NavIcon name="arrow" size={15} /></button>}
                </div>
              )}
              {withTests && <button type="button" onClick={() => onGo && onGo("tests")} className="enogia-homelink" style={{ ...link, marginTop: 2 }}>Ouvrir les tests <NavIcon name="arrow" size={15} /></button>}
            </section>
          )}
          {showSide && (
            <section aria-label="Départs à venir" style={{ ...cardS(S.depart.ring), flex: "2 1 300px" }}>
              <Head title="Départs à venir" count={departs.length} />
              {departs.length === 0 ? empty("inbox", "Aucun départ prévu", "Aucune machine n'a de date de départ à venir.") :
                departs.slice(0, 5).map((r, i) => { const n = inDays(r.depart); return <Row key={r.pj} first={i === 0} pj={r.pj} main={<span style={{ color: T.ink500 }}>{nomOf(r)}</span>} presence={presenceOf(r)} right={fmtD(r.depart) + (n != null && n <= 7 ? " · " + relDays(n) : "")} />; })}
              <button type="button" onClick={() => onGo && onGo("calendar")} className="enogia-homelink" style={{ ...link, marginTop: 2 }}>Ouvrir le calendrier <NavIcon name="arrow" size={15} /></button>
            </section>
          )}
        </div>
      )}

      {!role && on("projects") && (
        <section aria-label="Mes projets" style={{ ...cardS(S.production.ring), marginBottom: 12 }}>
          <Head title="Mes projets" sub="dont vous êtes chef de projet" count={mine.length} />
          {mine.length === 0 ? empty("inbox", "Aucun projet à votre nom", "Les projets dont vous êtes chef de projet apparaîtront ici.") :
            mine.slice(0, 6).map((r, i) => { const n = inDays(r.depart); return <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r)} presence={presenceOf(r)} right={r.depart ? fmtD(r.depart) + (n != null && n >= 0 && n <= 7 ? " · " + relDays(n) : "") : "—"} />; })}
        </section>
      )}

      {!role && on("journey") && parcoursEl}
    </div>
  );
}
