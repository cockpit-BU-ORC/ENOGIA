import React, { useMemo, useState } from "react";
import { T, FZ, R, stageSoft, stripeBg, stripeHues } from "../theme";
import { getPjMeta, ETAT_META, etatInk, PresenceChip, presenceKind, presenceFirstDate, presenceDates, countShippedYTD } from "../pjMeta";
import { NavIcon, AnimatedNumber, EmptyState } from "./SharedUI";
import { openMentionsFor, chefAccount, nameFromEmail } from "../mentions";
import { testerOfEmail, planOf } from "../testPlan";

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
  const card = { background: T.card, borderRadius: R.lg, boxShadow: T.shadowCard, padding: "16px 18px", minWidth: 0 };
  const S = stageSoft(), H = stripeHues();
  const cardS = color => ({ ...card, background: stripeBg(color, T.card, 4), paddingTop: 20 });
  const kick = { fontSize: FZ.xs, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: T.ink500 };

  const Kpi = ({ label, value, tone, onClick, hint, color, sub }) => (
    <button type="button" onClick={onClick} disabled={!onClick} className="enogia-kpi" title={hint}
      style={{ ...cardS(color), border: "none", textAlign: "left", cursor: onClick ? "pointer" : "default", fontFamily: T.font, display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: FZ.xs, fontWeight: 600, color: T.ink500 }}>{label}</span>
      <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, fontFamily: T.fontDisplay, color: tone || T.ink900 }}><AnimatedNumber value={value} /></span>
      {sub && <span style={{ fontSize: FZ.xs, color: T.ink500, minHeight: 16 }}>{sub}</span>}
    </button>
  );

  const Line = ({ r, right, sub, accent }) => {
    const meta = getPjMeta(r.pj, r); const em = ETAT_META[r.etat];
    return (
      <button type="button" className="enogia-homeline" onClick={() => onOpenPj && onOpenPj(r.pj)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", background: "transparent", padding: "8px 8px", margin: "0 -8px", borderRadius: R.sm, cursor: "pointer", textAlign: "left", fontFamily: T.font, color: T.ink900 }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: em ? em.bar : T.ink300, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: FZ.sm, flexShrink: 0, color: etatInk(r.etat) }}>{r.pj}</span>
        <span style={{ fontSize: FZ.sm, color: T.ink700, minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}{sub ? <span style={{ color: T.ink500 }}> · {sub}</span> : null}</span>
        {r.clientPresence && presenceKind(r.clientPresence) && <PresenceChip kind={presenceKind(r.clientPresence)} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} compact tiny short />}
        <span style={{ fontSize: FZ.xs, fontWeight: 600, color: accent || T.ink700, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{right}</span>
      </button>
    );
  };
  const empty = (icon, title, hint) => <EmptyState compact icon={icon} title={title} hint={hint} tone="ok" />;

  // Blocs numérotés 01, 02… dans l'ordre d'affichage (la numérotation suit les blocs réellement visibles).
  let counter = 0;
  const Sec = ({ title, color, icon, count, children, wide }) => {
    const n = String(++counter).padStart(2, "0");
    return (
      <section style={{ ...cardS(color), gridColumn: wide ? "1 / -1" : undefined }} aria-label={title}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink300, fontVariantNumeric: "tabular-nums", letterSpacing: ".04em" }}>{n}</span>
          <span style={{ color: T.ink500, display: "flex" }}><NavIcon name={icon} size={15} /></span>
          <span style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900 }}>{title}</span>
          {count != null && count > 0 && <span style={{ marginLeft: "auto", fontSize: FZ.xs, fontWeight: 700, color: T.ink500 }}>{count}</span>}
        </div>
        {children}
      </section>
    );
  };

  const num = (v, c) => <b style={{ color: c, background: "none", fontWeight: 800, fontVariantNumeric: "tabular-nums", WebkitTextFillColor: c }}>{v}</b>;
  const nextDep = departs[0];
  const maxLate = late[0];
  const stageCount = id => open.filter(r => r.etat === id).length;
  const journey = [["MONTAGE", "Montage méca"], ["ELEC", "Montage élec"], ["TESTS", "Tests"], ["PACKAGING", "Packaging"]].map(([id, l]) => [id, l, stageCount(id)]);

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ ...kick, marginBottom: 8 }}>{dateLong}{lastImport ? " · dernier import " + lastImport : ""}</div>
          <h1 style={{ margin: 0, fontFamily: T.fontDisplay, fontWeight: 600, fontSize: "clamp(22px,3.2vw,32px)", lineHeight: 1.22, letterSpacing: "-.015em", color: T.ink900, maxWidth: 820 }}>
            {hello()}{firstName ? " " + firstName : ""}. {num(inProd, S.production.ring)} machine{inProd > 1 ? "s" : ""} avance{inProd > 1 ? "nt" : ""}, {num(late.length, T.amber600)} glisse{late.length > 1 ? "nt" : ""}, {num(next30, S.depart.ring)} part{next30 > 1 ? "ent" : ""} d'ici un mois.
          </h1>
          {profile.length > 0 && <div style={{ marginTop: 8, fontSize: FZ.xs, color: T.ink500 }}>Vue adaptée à votre profil : {profile.join(" · ")}</div>}
        </div>
        <button type="button" className="enogia-ui-edit" onClick={() => setCustomize(v => !v)} aria-expanded={customize}
          style={{ border: "1px solid " + T.line, background: customize ? T.teal100 : "transparent", color: T.ink700, borderRadius: R.pill, padding: "6px 12px", fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", fontFamily: T.font, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <NavIcon name="edit" size={13} />Personnaliser
        </button>
      </div>

      {customize && (
        <div style={{ ...card, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
          <div style={{ width: "100%", fontSize: FZ.xs, color: T.ink500 }}>Choisissez les blocs de votre page d'accueil (enregistré sur ce poste).</div>
          {BLOCKS.filter(([id]) => available(id)).map(([id, l, d]) => (
            <label key={id} title={d} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: FZ.sm, color: T.ink900, cursor: "pointer" }}>
              <input type="checkbox" checked={on(id)} onChange={e => setPref(id, e.target.checked)} style={{ accentColor: T.teal500 }} />{l}
            </label>
          ))}
        </div>
      )}

      <div className="enogia-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 12 }}>
        <Kpi color={S.depart.ring} label="Livrées cette année" value={shipped} sub={shipped28 > 0 ? "+" + shipped28 + " sur 28 j" : open.length + " encore en cours"} onClick={() => onGo && onGo("table")} hint="Ouvrir la liste" />
        <Kpi color={S.production.ring} label="En production" value={inProd} sub={open.length + " projet" + (open.length > 1 ? "s" : "") + " ouverts"} onClick={() => onGo && onGo("table")} hint="Ouvrir la liste" />
        <Kpi color={S.tests.ring} label="Départs sous 30 jours" value={next30} sub={nextDep ? "Prochain : " + nextDep.pj + " · " + fmtD(nextDep.depart) : "Aucun départ à venir"} onClick={() => onGo && onGo("calendar")} hint="Ouvrir le calendrier" />
        <Kpi color={H.warn} label="En retard sur l'initial" value={late.length} tone={late.length ? T.amber600 : T.ink900} sub={maxLate ? "Max : " + maxLate.pj + " · +" + maxLate.drift + " j" : "Aucune dérive"} onClick={() => onGo && onGo("table")} hint="Ouvrir la liste" />
      </div>

      <div className="enogia-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12 }}>
        {on("mentions") && (
          <Sec title="Pour moi" icon="at" color={H.note} count={mentions.length}>
            {mentions.length === 0 ? empty("check", "Rien à traiter", "Personne ne vous attend pour l'instant.") :
              mentions.slice(0, 5).map(({ pj, idx, c }) => (
                <button key={pj + idx} type="button" className="enogia-homeline" onClick={() => onOpenPj && onOpenPj(pj)}
                  style={{ display: "block", width: "100%", border: "none", background: "transparent", padding: "8px 8px", margin: "0 -8px", borderRadius: R.sm, cursor: "pointer", textAlign: "left", fontFamily: T.font }}>
                  <span style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink900 }}>{pj}</span>
                  <span style={{ fontSize: FZ.xs, color: T.ink500 }}> · {c.author || "Quelqu'un"} · {fmtD(c.date)}</span>
                  <span style={{ display: "block", fontSize: FZ.sm, color: T.ink700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(c.text || "").replace(/\s+/g, " ")}</span>
                </button>
              ))}
          </Sec>
        )}

        {on("since") && (
          <Sec title="Depuis ma dernière visite" icon="changes" color={H.brand}>
            {nChanged + nNew === 0 ? empty("check", "Rien de nouveau", "Le planning n'a pas bougé depuis votre dernière visite.") : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 22 }}>
                  <div><div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.fontDisplay, color: T.ink900, lineHeight: 1 }}><AnimatedNumber value={nChanged} /></div><div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 4 }}>PJ modifié{nChanged > 1 ? "s" : ""}</div></div>
                  {nNew > 0 && <div><div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.fontDisplay, color: T.ink900, lineHeight: 1 }}><AnimatedNumber value={nNew} /></div><div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 4 }}>nouveau{nNew > 1 ? "x" : ""}</div></div>}
                </div>
                <button type="button" onClick={() => onGo && onGo("changes")} className="enogia-homelink"
                  style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: T.accent, fontWeight: 600, fontSize: FZ.sm, cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: T.font }}>
                  Voir le détail <NavIcon name="arrow" size={15} />
                </button>
              </div>
            )}
          </Sec>
        )}

        {on("projects") && (
          <Sec title="Mes projets" icon="flag" color={S.production.ring} count={mine.length}>
            {mine.length === 0 ? empty("inbox", "Aucun projet à votre nom", "Les projets dont vous êtes chef de projet apparaîtront ici.") :
              mine.slice(0, 6).map(r => { const n = inDays(r.depart); return <Line key={r.pj} r={r} right={r.depart ? fmtD(r.depart) + (n != null && n >= 0 ? " · " + relDays(n) : "") : "—"} />; })}
          </Sec>
        )}

        {on("tests") && myTester && (
          <Sec title="Mes tests à venir" icon="check" color={S.tests.ring} count={myTests.length}>
            {myTests.length === 0 ? empty("check", "Aucun test planifié", "Les machines qui vous sont affectées apparaîtront ici.") :
              myTests.slice(0, 6).map(r => <Line key={r.pj} r={r} right={fmtD(r.tests) + (r.testsFin ? " → " + fmtD(r.testsFin) : "")} />)}
            <button type="button" onClick={() => onGo && onGo("tests")} className="enogia-homelink"
              style={{ marginTop: 6, border: "none", background: "transparent", color: T.accent, fontWeight: 600, fontSize: FZ.sm, cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: T.font }}>Ouvrir les tests <NavIcon name="arrow" size={15} /></button>
          </Sec>
        )}

        {on("departs") && (
          <Sec title="Prochains départs" icon="calendar" color={S.depart.ring}>
            {departs.length === 0 ? empty("inbox", "Aucun départ prévu", "Aucune machine n'a de date de départ à venir.") :
              departs.slice(0, 6).map(r => { const n = inDays(r.depart); return <Line key={r.pj} r={r} right={fmtD(r.depart) + " · " + relDays(n)} />; })}
          </Sec>
        )}

        {on("watch") && (
          <Sec title="À surveiller" icon="warning" color={H.warn} count={late.length}>
            {late.length === 0 ? empty("check", "Aucune dérive", "Aucun départ ne glisse par rapport au planning initial.") :
              late.slice(0, 6).map(r => <Line key={r.pj} r={r} right={"+" + r.drift + " j"} accent={T.amber600} sub={"départ " + fmtD(r.depart)} />)}
          </Sec>
        )}

        {on("journey") && (
          <Sec title="Le parcours d'une machine" icon="gantt" color={H.brand} wide>
            <div style={{ display: "flex", alignItems: "stretch", gap: 0, flexWrap: "wrap" }}>
              {journey.map(([id, l, n], i) => {
                const c = ETAT_META[id] ? ETAT_META[id].bar : T.teal500;
                return (
                  <div key={id} style={{ flex: "1 1 130px", minWidth: 120, padding: "6px 14px 6px 0", position: "relative" }}>
                    <div style={{ height: 4, borderRadius: 2, background: c, marginBottom: 10 }} />
                    <div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink300, letterSpacing: ".04em" }}>{String(i + 1).padStart(2, "0")}</div>
                    <div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, margin: "2px 0 4px" }}>{l}</div>
                    <div style={{ fontSize: FZ.xs, color: T.ink500 }}><b style={{ color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{n}</b> machine{n > 1 ? "s" : ""} en ce moment</div>
                  </div>
                );
              })}
              <div style={{ flex: "1 1 130px", minWidth: 120, padding: "6px 0" }}>
                <div style={{ height: 4, borderRadius: 2, background: ETAT_META.SHIPPED.bar, marginBottom: 10 }} />
                <div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink300, letterSpacing: ".04em" }}>05</div>
                <div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, margin: "2px 0 4px" }}>Expédiée</div>
                <div style={{ fontSize: FZ.xs, color: T.ink500 }}><b style={{ color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{shipped}</b> depuis janvier</div>
              </div>
            </div>
          </Sec>
        )}
      </div>
    </div>
  );
}
