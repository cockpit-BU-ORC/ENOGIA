// ── v203 : fiche d'un PJ en pop-up unique (maquette validée) — la même depuis la Liste, le Gantt, le Calendrier et l'accueil ────
// D'abord la réponse à « où en est la machine ? » : anneau d'avancement, nom de l'étape et ce qu'elle signifie, étape suivante.
// Puis le ruban des étapes (clic : ses sous-étapes s'affichent), les sous-étapes reprises de prodStages.js, une mini-frise
// (aujourd'hui, départ, écart à l'initial), des pastilles de contexte (présence, tests, cash pour le propriétaire, turbine),
// le dernier commentaire et trois actions (commentaires, retard, fiche projet) qui s'ouvrent dans la fenêtre.
// Fenêtre centrale floutée (téléphone : monte du bas), entrée 240 ms / sortie 180 ms, Échap / clic à côté / croix pour fermer.
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { T, FZF as FZ, inkOn, mixHex } from "../theme";
import { getPjMeta, ETAT_META, chefsOf, EpcTag, PresenceChip, presenceKind, presenceFirstDate, presenceDates, CountryFlag, relTime, Avatar } from "../pjMeta";
import { NavIcon, PjPlate } from "./SharedUI";
import { ProjectComments, DelayAllocations, EditMetaForm } from "./ProjectModal";
import { STAGES, STEP_NOTE, autoPct } from "../prodStages";
import { planOf, catalogOf, activeSections, progressOf } from "../testPlan";
import { linkedPayments, cashSummary } from "../cashinLink";
import { canCash } from "../roles";
import { fmtEur } from "../pjProgress";

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
  "NON_DESIGNEE": ["Non désignée", "La commande existe, mais la machine n'est pas encore affectée à un client final.", "la désignation"],
  "En fabrication": ["Fabrication FNR", "Les pièces sont fabriquées chez les fournisseurs avant l'arrivée de la machine en atelier.", "le montage mécanique"],
  "STOCKAGE_EXT": ["Stockage externe", "La machine attend dans un stockage externe avant de revenir en atelier.", "le montage mécanique"],
  "MONTAGE": ["Montage mécanique", "Assemblage mécanique de la machine : lubrification, refroidissement, test de pression, tirage au vide, remplissage.", "le montage électrique"],
  "ELEC": ["Montage électrique", "Le circuit est fermé et testé ; on installe et on câble l'armoire électrique.", "les tests (essais de la machine, puis FAT)"],
  "TESTS": ["Tests", "La machine tourne : essais internes, puis FAT avec le client ou NOBO quand c'est prévu.", "le packaging"],
  "PACKAGING": ["Packaging", "Derniers contrôles (RAI), pose des carters et emballage avant le départ.", "le départ"],
  "SHIPPED": ["Expédiée", "La machine est partie de l'atelier.", ""],
};

function Ring({ pct, color, label }) {
  const r = 40, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pct || 0));
  return (<svg viewBox="0 0 100 100" width="104" height="104" role="img" aria-label={label + " : " + v + " %"} style={{ flexShrink: 0 }}>
    <circle cx="50" cy="50" r={r} fill="none" stroke={T.surfaceAlt} strokeWidth="10" />
    <circle className="enogia-ring" cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={(c * v / 100) + " " + c} transform="rotate(-90 50 50)" />
    <text x="50" y="50" textAnchor="middle" fontSize="20" fontWeight="600" fill={T.ink900} style={{ fontFamily: T.fontDisplay }}>{v} %</text>
    <text x="50" y="65" textAnchor="middle" fontSize="9" fill={T.ink500}>{label}</text>
  </svg>);
}

export function RowDetail({ r, onClose, comments, addComment, deleteComment, pinOk, delays, delayTypes, setDelayTypes, addDelayAllocation, deleteDelayAllocation, addDelayComment, deleteDelayComment, authorName, savePjMetaOverride, canEditMeta, dayAction }) {
  const ctx = useContext(PjDialogCtx);
  const [open, setOpen] = useState(null); // "comments" | "delays" | "edit"
  const meta = getPjMeta(r.pj, r), shipped = r.etat === "SHIPPED";
  const cur = Math.max(0, RIBBON.findIndex(s => s.etats.includes(r.etat)));
  const [focus, setFocus] = useState(RIBBON[cur].id);
  const em = ETAT_META[r.etat] || ETAT_META["NOT ORDERED"], bar = em.bar;
  const [title, meaning, next] = MEANING[r.etat] || [em.label, "", ""];
  const pct = shipped ? 100 : autoPct(r.etat) != null ? autoPct(r.etat) : 0;
  const list = (comments && comments[r.pj]) || [], pub = list.filter(c => !c.private);
  const last = pub.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))).pop();
  const kind = presenceKind(r.clientPresence);
  const doneBg = mixHex(T.card, ETAT_META.SHIPPED.bar, T.mode === "dark" ? .24 : .13);
  // Mini-frise : de l'arrivée (ou du début des tests) au départ, avec aujourd'hui et le départ initial (départ − écart).
  const t0 = day0(), a = r.arrivee ? new Date(r.arrivee) : r.tests ? new Date(r.tests) : null, z = r.depart ? new Date(r.depart) : null;
  const drift = Number(r.drift) || 0, zInit = z && drift ? new Date(z.getTime() - drift * 864e5) : null;
  const span = a && z ? Math.max(1, (Math.max(z, zInit || z) - a)) : 0, pos = d => Math.max(0, Math.min(100, ((d - a) / span) * 100));
  const daysLeft = z ? Math.round((z - t0) / 864e5) : null;
  // Pastilles de contexte
  const plan = ctx.testsDoc ? planOf(ctx.testsDoc, r.pj) : null;
  const tq = plan ? progressOf(plan, catalogOf(ctx.testsDoc), activeSections(kind)) : null;
  const cash = canCash() ? cashSummary(linkedPayments(r.pj)) : null;
  const turb = ((ctx.turbineDoc && ctx.turbineDoc.turbines) || []).filter(t => t.target && t.target.kind === "PJ" && t.target.ref === r.pj);
  const pill = (txt, ink, bg, key) => <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, color: ink, background: bg, borderRadius: 999, padding: "2px 10px", whiteSpace: "nowrap" }}>{txt}</span>;
  const btn = primary => ({ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 34, padding: "0 14px", borderRadius: 999, border: primary ? "none" : "1px solid " + T.line, background: primary ? T.ink900 : T.card, color: primary ? T.card : T.ink700, fontFamily: T.font, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" });
  const toggle = id => setOpen(o => (o === id ? null : id));
  const fs = RIBBON.find(s => s.id === focus) || RIBBON[cur], fsIdx = RIBBON.indexOf(fs), stage = STAGES.find(s => s.id === fs.id);
  const fsState = shipped || fsIdx < cur ? "done" : fsIdx === cur ? "cur" : "todo";
  const box = { background: T.surface, borderRadius: 12, padding: "10px 12px", minWidth: 0 };

  return (<div style={{ fontFamily: T.font }}>
    {/* Où en est la machine */}
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <Ring pct={pct} color={bar} label="production" />
      <div style={{ flex: "1 1 300px", minWidth: 0 }}>
        <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{shipped ? "La machine est" : "La machine est en"}</div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 24, fontWeight: 600, letterSpacing: "-.01em", color: T.ink900, lineHeight: 1.15, margin: "2px 0 4px" }}>{title}</div>
        <div style={{ fontSize: FZ.sm, color: T.ink700, lineHeight: 1.5 }}>{meaning}{next ? " Étape suivante : " + next + "." : ""}</div>
      </div>
    </div>
    {/* Ruban des étapes */}
    <ol aria-label="Parcours de la machine" style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", gap: 4 }}>
      {RIBBON.map((s, i) => {
        const isDone = shipped || i < cur, isCur = !shipped && i === cur, sb = (ETAT_META[s.color] || {}).bar || T.teal500, on = focus === s.id;
        const f = s.from ? dmy(r[s.from]) : "", t = s.to ? dmy(r[s.to]) : "", date = f && t ? f + " → " + t : f || t;
        return (<li key={s.id} aria-current={isCur ? "step" : undefined} style={{ flex: 1, minWidth: 0 }}>
          <button type="button" onClick={() => setFocus(s.id)} aria-pressed={on} title={(STAGES.find(x => x.id === s.id) || { steps: [] }).steps.join(" · ") || s.label}
            className="enogia-rib" style={{ width: "100%", border: "none", borderRadius: 10, padding: "8px 6px 9px", cursor: "pointer", textAlign: "center", fontFamily: T.font, background: isCur ? sb : isDone ? doneBg : T.surface, color: isCur ? inkOn(sb) : T.ink500, boxShadow: on ? "0 0 0 2px " + (isCur ? T.ink900 : sb) : !isCur && !isDone ? "inset 0 0 0 1px " + T.line : "none", transform: isCur ? "translateY(-2px)" : "none" }}>
            <span style={{ display: "block", fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isCur ? inkOn(sb) : T.ink900 }}>{isDone ? "✓ " : ""}{s.label}</span>
            <span style={{ display: "block", fontSize: 11, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isCur ? "en cours" : date || (isDone ? "fait" : "—")}{s.id === "SHIPPED" && drift > 0 && !shipped ? <b style={{ color: T.red500 }}> +{drift} j</b> : null}</span>
          </button>
        </li>);
      })}
    </ol>
    {/* Sous-étapes de l'étape choisie · mini-frise */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10, marginTop: 12 }}>
      <div style={{ ...box, borderLeft: "3px solid " + ((ETAT_META[fs.color] || {}).bar || bar), borderRadius: "0 12px 12px 0" }}>
        <div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, marginBottom: 4 }}>{stage ? "Sous-étapes · " + fs.label : fs.label}</div>
        {stage ? stage.steps.map(st => <div key={st} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: FZ.xs, color: T.ink700, padding: "2px 0" }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: fsState === "done" ? ETAT_META.SHIPPED.bar : fsState === "cur" ? bar : "transparent", boxShadow: fsState === "todo" ? "inset 0 0 0 1.5px " + T.ink300 : "none" }} />{st}</div>)
          : <div style={{ fontSize: FZ.xs, color: T.ink700, lineHeight: 1.5 }}>{fs.id === "PRE" ? "Commande, désignation du client, fabrication des pièces chez les fournisseurs (FNR) ou stockage externe." : (MEANING.SHIPPED[1])}</div>}
        {stage && stage.steps.some(x => x.endsWith("*")) && <div style={{ fontSize: 11, color: T.ink500, marginTop: 4, lineHeight: 1.4 }}>{STEP_NOTE}</div>}
        <div style={{ fontSize: 11, color: T.ink500, marginTop: 4 }}>{fsState === "done" ? "Étape terminée." : fsState === "cur" ? "Étape en cours." : "À venir."} Cliquez une autre étape pour voir la sienne.</div>
      </div>
      <div style={box}>
        <div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, marginBottom: 8 }}>Calendrier</div>
        {a && z ? <div aria-hidden="true" style={{ position: "relative", height: 30 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 10, height: 6, borderRadius: 3, background: T.surfaceAlt }} />
          <div className="enogia-bar-fill" style={{ position: "absolute", left: 0, width: pos(Math.min(t0, z)) + "%", top: 10, height: 6, borderRadius: 3, background: bar }} />
          {zInit && <div title={"Départ initial : " + dmy(zInit)} style={{ position: "absolute", left: 0, width: pos(zInit) + "%", top: 20, borderTop: "2px dashed " + T.ink300 }} />}
          {t0 > a && t0 < z && <div style={{ position: "absolute", left: pos(t0) + "%", top: 2, bottom: 2, width: 2, background: T.red500, borderRadius: 1 }} />}
          <span style={{ position: "absolute", left: 0, top: 18, fontSize: 10, color: T.ink500 }}>{dmy(a)}</span>
          <span style={{ position: "absolute", right: 0, top: 18, fontSize: 10, color: T.ink500 }}>{dmy(z)}</span>
        </div> : <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Dates pas encore connues.</div>}
        <div style={{ fontSize: FZ.xs, color: T.ink700, marginTop: 6 }}>{shipped ? "Partie le " + dmy(r.depart) : daysLeft == null ? "" : daysLeft > 0 ? <>Départ dans <b style={{ color: T.ink900 }}>{daysLeft} jour{daysLeft > 1 ? "s" : ""}</b></> : daysLeft === 0 ? <b>Départ aujourd'hui</b> : <>Départ prévu il y a {-daysLeft} j</>}{drift > 0 ? <span style={{ color: T.red500 }}> · {drift} j plus tard que l'initial</span> : drift < 0 ? <span style={{ color: T.emerald600 }}> · {-drift} j d'avance</span> : null}</div>
      </div>
    </div>
    {/* Qui · contexte */}
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
      {chefsOf(meta).map(c => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink700 }}><Avatar name={c} size={20} />{c}</span>)}
      <EpcTag meta={meta} />
      {kind && <PresenceChip kind={kind} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} />}
      {tq && tq.total > 0 && pill("Tests " + tq.done + "/" + tq.total + (tq.ko ? " · " + tq.ko + " échec" + (tq.ko > 1 ? "s" : "") : ""), tq.ko ? T.red600 : T.amber600, tq.ko ? T.red100 : T.amber100, "t")}
      {cash && pill(cash.lateN ? fmtEur(cash.late) + " en retard" : "Encaissé " + fmtEur(cash.paid) + " / " + fmtEur(cash.total), cash.lateN ? T.red600 : T.emerald600, cash.lateN ? T.red100 : T.emerald100, "c")}
      {turb.length > 0 && pill("Turbine attribuée" + (turb.length > 1 ? " × " + turb.length : ""), T.ink700, T.surfaceAlt, "u")}
      {meta.numSerie && <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.ink500 }}>{meta.numSerie}</span>}
      {canEditMeta && savePjMetaOverride && <button type="button" onClick={() => toggle("edit")} aria-expanded={open === "edit"} style={{ border: "none", background: "transparent", color: T.teal600, fontWeight: 700, fontSize: FZ.xs, cursor: "pointer", minHeight: 24, padding: 0, fontFamily: T.font }}>Modifier</button>}
    </div>
    {last && <button type="button" onClick={() => toggle("comments")} style={{ ...box, display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer", marginTop: 10, fontFamily: T.font, fontSize: FZ.sm, color: T.ink900, lineHeight: 1.45 }}>« {String(last.text || "").replace(/\s+/g, " ").slice(0, 200)}{String(last.text || "").length > 200 ? "…" : ""} » <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{last.author || ""}, {relTime(last.date)}</span></button>}
    {/* Actions */}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
      <button type="button" onClick={() => toggle("comments")} aria-expanded={open === "comments"} style={btn(false)}><NavIcon name="comments" size={14} />Commentaires{pub.length ? " (" + pub.length + ")" : ""}</button>
      {/* v221 (demandé : « garder le pop-up classique mais avec un bouton pour activer ou non ce jour de prod, pour ce PJ seulement ») */}
      {dayAction && <button type="button" onClick={dayAction.onToggle} title={dayAction.hint} style={{ ...btn(false), color: dayAction.off ? T.emerald600 : T.red600 }}><NavIcon name="calendar" size={14} />{dayAction.label}</button>}
      {pinOk && delayTypes && <button type="button" onClick={() => toggle("delays")} aria-expanded={open === "delays"} style={btn(false)}><NavIcon name="clock" size={14} />Déclarer un retard</button>}
      {pinOk && <button type="button" onClick={() => { try { window.dispatchEvent(new CustomEvent("enogia:openSynthese", { detail: { pj: r.pj } })); } catch (e) {} onClose && onClose(); }} style={{ ...btn(true), marginLeft: "auto" }}>Ouvrir la fiche projet</button>}
    </div>
    {open && <div className="enogia-view-in" style={{ marginTop: 12, padding: 12, background: T.surface, borderRadius: 12 }}>
      {open === "comments" && <ProjectComments pj={r.pj} comments={list} addComment={addComment} deleteComment={deleteComment} pinOk={pinOk} authorName={authorName} />}
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
    style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(8,12,28,.42)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={"Fiche " + r.pj} className="enogia-dlg"
      style={{ width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto", background: T.card, borderRadius: 22, boxShadow: "0 30px 80px rgba(8,12,28,.35), 0 0 0 1px " + T.line, outline: "none" }}>
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
  return r ? <RowDialog key={pj} r={r} {...rest} /> : null;
}
