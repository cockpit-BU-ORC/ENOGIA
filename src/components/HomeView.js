import React, { useMemo, useState } from "react";
import { T, FZ, R, stageSoft, stripeBg, stripeHues, alertSoft, inkOn } from "../theme";
import { getPjMeta, ETAT_META, PresenceChip, presenceKind, presenceFirstDate, presenceDates, countShippedYTD } from "../pjMeta";
import { NavIcon, AnimatedNumber, EmptyState, PjPlate, Hl } from "./SharedUI";
import { openMentionsFor, chefAccount, nameFromEmail } from "../mentions";
import { testerOfEmail, planOf } from "../testPlan";

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

export function HomeView({ data, comments, myEmail, myName, people, unseenChanges, lastImport, onOpenPj, onGo, pinOk, testsDoc }) {
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE"), [data]);
  const today0 = startOfToday();

  const open = useMemo(() => rows.filter(r => r.etat !== "SHIPPED"), [rows]);
  const shipped = useMemo(() => countShippedYTD(rows), [rows]);
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
    return open.filter(r => { const c = getPjMeta(r.pj, r).chefProjet; const a = c && chefAccount(c, [{ name: fullName, email: myEmail }]); return !!a; })
      .sort((a, b) => (a.depart ? new Date(a.depart) : 9e15) - (b.depart ? new Date(b.depart) : 9e15));
  }, [open, fullName, myEmail]);

  const myTester = useMemo(() => (testsDoc ? testerOfEmail(testsDoc, myEmail) : null), [testsDoc, myEmail]);
  const myTests = useMemo(() => {
    if (!myTester || !testsDoc) return [];
    const todayIso = today0.getFullYear() + "-" + String(today0.getMonth() + 1).padStart(2, "0") + "-" + String(today0.getDate()).padStart(2, "0");
    return open.filter(r => r.tests && String(r.testsFin || r.tests).slice(0, 10) >= todayIso && planOf(testsDoc, r.pj).assign.some(a => a.tid === myTester.id))
      .sort((a, b) => String(a.tests).localeCompare(String(b.tests)));
  }, [open, myTester, testsDoc]); // eslint-disable-line

  const nChanged = (unseenChanges || []).reduce((n, e) => n + ((e.stats && e.stats.nPj) || 0), 0);
  const nNew = (unseenChanges || []).reduce((n, e) => n + ((e.stats && e.stats.nNew) || 0), 0);

  // Profil → blocs affichés par défaut ; chacun peut ensuite cocher/décocher (mémorisé sur ce poste, par e-mail).
  const [prefs, setPrefs] = useState(() => loadPrefs(myEmail));
  const [customize, setCustomize] = useState(false);
  const defaults = { mentions: true, since: true, departs: true, journey: true, projects: mine.length > 0, tests: !!myTester, watch: !!pinOk || mine.length > 0 };
  const on = id => (prefs[id] != null ? !!prefs[id] : defaults[id]);
  const available = id => id !== "tests" || !!myTester;
  const setPref = (id, v) => { const n = { ...prefs, [id]: v }; setPrefs(n); try { localStorage.setItem(prefKey(myEmail), JSON.stringify(n)); } catch (e) {} };
  const profile = [pinOk ? "manager" : null, mine.length ? "chef de projet" : null, myTester ? "testeur" : null].filter(Boolean);

  const dateLong = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const dateLine = dateLong.charAt(0).toUpperCase() + dateLong.slice(1);
  // v169 (maquette validée) : cartes plates — bordure fine, pas d'ombre (l'ombre est réservée à ce qui flotte), liseré de 4 px conservé.
  const card = { background: T.card, borderRadius: R.lg, border: "1px solid " + T.line, padding: "14px 16px", minWidth: 0, boxSizing: "border-box" };
  const S = stageSoft(), H = stripeHues(), A = alertSoft();
  const cardS = color => ({ ...card, background: stripeBg(color, T.card, 4), paddingTop: 18 });
  const grey = { fontSize: FZ.xs, color: T.ink500 };
  const link = { border: "none", background: "transparent", color: T.accent, fontWeight: 600, fontSize: FZ.sm, cursor: "pointer", padding: "4px 0", minHeight: 24, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: T.font };
  const etatOf = useMemo(() => { const m = new Map(); rows.forEach(r => m.set(r.pj, r.etat)); return m; }, [rows]);

  const Kpi = ({ label, value, tone, onClick, hint, sub }) => (
    <button type="button" onClick={onClick} disabled={!onClick} className="enogia-kpi enogia-kpi-ed" title={hint}
      style={{ border: "none", borderRight: "1px solid " + T.line, background: "transparent", textAlign: "left", cursor: onClick ? "pointer" : "default", fontFamily: T.font, display: "flex", flexDirection: "column", gap: 4, padding: "12px 16px 6px 0", minWidth: 0 }}>
      <span style={{ fontSize: "clamp(40px,5vw,56px)", fontWeight: 300, lineHeight: .95, letterSpacing: "-.03em", fontFamily: T.fontDisplay, color: tone || T.ink900, fontVariantNumeric: "tabular-nums" }}><AnimatedNumber value={value} /></span>
      <span style={{ fontSize: FZ.sm, fontWeight: 500, color: T.ink700 }}>{label}</span>
      {sub && <span style={{ ...grey, minHeight: 16 }}>{sub}</span>}
    </button>
  );

  // Pastille d'une ligne « À traiter » : teinte pâle + texte foncé de la même teinte.
  const Pill = ({ tone, children }) => <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, lineHeight: "18px", padding: "0 7px", borderRadius: R.pill, background: tone.bg, color: tone.ink }}>{children}</span>;
  // Ligne de liste : n° de PJ (couleur d'état), texte principal, valeur à droite en chiffres tabulaires.
  const Row = ({ pj, pill, main, right, rightColor, presence, first }) => (
    <button type="button" className="enogia-homeline" onClick={() => onOpenPj && onOpenPj(pj)}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 40, border: "none", borderTop: first ? "none" : "1px solid " + T.line, background: "transparent", padding: "8px 6px", borderRadius: 0, cursor: "pointer", textAlign: "left", fontFamily: T.font, color: T.ink900 }}>
      {pill}
      <PjPlate pj={pj} style={{ minWidth: 58, textAlign: "center", boxShadow: "inset 3px 0 0 " + ((ETAT_META[etatOf.get(pj)] || {}).bar || T.ink300) }} />
      <span style={{ fontSize: FZ.sm, color: T.ink700, minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{main}</span>
      {presence}
      <span style={{ fontSize: FZ.xs, fontWeight: 600, color: rightColor || T.ink500, flexShrink: 0, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{right}</span>
    </button>
  );
  const presenceOf = r => r.clientPresence && presenceKind(r.clientPresence) ? <PresenceChip kind={presenceKind(r.clientPresence)} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} compact tiny short /> : null;
  const nomOf = r => { const m = getPjMeta(r.pj, r); return m.nomProjet && m.nomProjet !== "—" ? m.nomProjet : ""; };
  const empty = (icon, title, hint) => <EmptyState compact icon={icon} title={title} hint={hint} tone="ok" />;
  const Head = ({ title, sub, count }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>{title}</h2>
      {sub && <span style={grey}>{sub}</span>}
      {count > 0 && <span style={{ ...grey, marginLeft: "auto", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{count}</span>}
    </div>
  );

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

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.accentInk, marginBottom: 6 }}>{dateLine}{lastImport ? " · import " + lastImport : ""} · BU ORC</div>
          <h1 className="enogia-view-in" style={{ margin: 0, fontFamily: T.fontDisplay, fontWeight: 300, fontSize: "clamp(24px,3.2vw,34px)", lineHeight: 1.18, letterSpacing: "-.02em", color: T.ink900, maxWidth: 820 }}>
            {hello()}{firstName ? " " + firstName : ""}. {num(inProd + " machine" + (inProd > 1 ? "s" : ""), S.production.ring)} avance{inProd > 1 ? "nt" : ""}, {num(late.length, T.amber500)} glisse{late.length > 1 ? "nt" : ""}, {num(next30, S.finProd.ring)} part{next30 > 1 ? "ent" : ""} d'ici un mois.
          </h1>
          {profile.length > 0 && <div style={{ ...grey, marginTop: 6 }}>Vue adaptée à votre profil : {profile.join(" · ")}</div>}
        </div>
        <button type="button" className="enogia-ui-edit" onClick={() => setCustomize(v => !v)} aria-expanded={customize}
          style={{ border: "1px solid " + T.line, background: customize ? T.teal100 : "transparent", color: T.ink700, borderRadius: R.pill, padding: "6px 12px", minHeight: 28, fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", fontFamily: T.font, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <NavIcon name="edit" size={13} />Personnaliser
        </button>
      </div>

      {customize && (
        <div style={{ ...card, marginBottom: 12, display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
          <div style={{ width: "100%", ...grey }}>Choisissez ce qui apparaît sur votre page d'accueil (enregistré sur ce poste).</div>
          {BLOCKS.filter(([id]) => available(id)).map(([id, l, d]) => (
            <label key={id} title={d} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 24, fontSize: FZ.sm, color: T.ink900, cursor: "pointer" }}>
              <input type="checkbox" checked={on(id)} onChange={e => setPref(id, e.target.checked)} style={{ accentColor: T.teal500 }} />{l}
            </label>
          ))}
        </div>
      )}

      <div className="enogia-stagger enogia-kpis-ed" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0 16px", borderTop: "3px solid " + T.teal500, marginBottom: 20 }}>
        <Kpi color={S.depart.ring} label="Livrées cette année" value={shipped} sub={shipped28 > 0 ? shipped28 + " sur les 28 derniers jours" : open.length + " encore en cours"} onClick={() => onGo && onGo("table")} hint="Ouvrir la liste" />
        <Kpi color={S.production.ring} label="En production" value={inProd} sub={"sur " + open.length + " projet" + (open.length > 1 ? "s" : "") + " ouvert" + (open.length > 1 ? "s" : "")} onClick={() => onGo && onGo("table")} hint="Ouvrir la liste" />
        <Kpi color={S.tests.ring} label="Départs sous 30 j" value={next30} tone={S.depart.ring} sub={nextDep ? "prochain " + nextDep.pj + " · " + fmtD(nextDep.depart) : "Aucun départ à venir"} onClick={() => onGo && onGo("calendar")} hint="Ouvrir le calendrier" />
        <Kpi color={H.warn} label="En retard sur l'initial" value={late.length} tone={late.length ? T.amber600 : T.ink900} sub={maxLate ? "max " + maxLate.pj + " · +" + maxLate.drift + " j" : "Aucune dérive"} onClick={() => onGo && onGo("table")} hint="Ouvrir la liste" />
      </div>

      {(showTodo || showSide) && (
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

      {on("projects") && (
        <section aria-label="Mes projets" style={{ ...cardS(S.production.ring), marginBottom: 12 }}>
          <Head title="Mes projets" sub="dont vous êtes chef de projet" count={mine.length} />
          {mine.length === 0 ? empty("inbox", "Aucun projet à votre nom", "Les projets dont vous êtes chef de projet apparaîtront ici.") :
            mine.slice(0, 6).map((r, i) => { const n = inDays(r.depart); return <Row key={r.pj} first={i === 0} pj={r.pj} main={nomOf(r)} presence={presenceOf(r)} right={r.depart ? fmtD(r.depart) + (n != null && n >= 0 && n <= 7 ? " · " + relDays(n) : "") : "—"} />; })}
        </section>
      )}

      {on("journey") && (
        <section aria-label="Où en sont les machines" style={cardS(H.brand)}>
          <Head title={"Où en sont les " + open.length + " machine" + (open.length > 1 ? "s" : "") + " ouverte" + (open.length > 1 ? "s" : "")} />
          <div style={{ ...grey, marginBottom: 10 }}>+ {shipped} expédiée{shipped > 1 ? "s" : ""} depuis janvier</div>
          {open.length === 0 ? <div style={grey}>Aucune machine ouverte pour l'instant.</div> : (<>
            <div role="img" aria-label={journey.map(j => j.l + " " + j.n).join(", ") + ", pas encore lancées " + notStarted} className="enogia-bar-fill" style={{ display: "flex", height: 32, gap: 4 }}>
              {journey.filter(j => j.n > 0).map(j => <div key={j.id} title={j.l + " : " + j.n} style={{ flex: j.n, minWidth: 0, background: j.c, color: inkOn(j.c), borderRadius: 3, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden" }}>{j.n}</div>)}
              {notStarted > 0 && <div title={"Pas encore lancées : " + notStarted} style={{ flex: notStarted, minWidth: 0, background: T.ink100, color: T.ink900, borderRadius: 3, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", whiteSpace: "nowrap", overflow: "hidden" }}>{notStarted}</div>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 8, fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>
              {journey.map(j => <span key={j.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: j.c }} />{j.l} <b style={{ color: T.ink900 }}>{j.n}</b></span>)}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: T.ink100, border: "1px solid " + T.line }} />Pas encore lancées <b style={{ color: T.ink900 }}>{notStarted}</b></span>
            </div>
          </>)}
        </section>
      )}
    </div>
  );
}
