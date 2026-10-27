// ── v201 : détail d'un PJ dans la Liste — la « fiche suiveuse » (maquette validée) ───────────────────────────────────────
// Un ruban des étapes avec leurs noms (comme la fiche qui suit la machine dans l'atelier) : étapes faites cochées avec leur date,
// étape en cours en couleur d'état, étapes à venir avec la date prévue (écart au départ). Dessous, deux colonnes : qui / quoi /
// dernier commentaire, puis trois actions qui ouvrent sur place les commentaires ou les retards. Rien de ce que montre déjà la ligne.
import React, { useEffect, useRef, useState } from "react";
import { PjPlate, Badge } from "./SharedUI";
import { T, FZF as FZ, inkOn, mixHex } from "../theme";
import { getPjMeta, ETAT_META, chefsOf, EpcTag, PresenceChip, presenceKind, presenceFirstDate, presenceDates, CountryFlag, relTime, Avatar } from "../pjMeta";
import { NavIcon } from "./SharedUI";
import { ProjectComments, DelayAllocations, EditMetaForm } from "./ProjectModal";

const fd = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
// Étapes du ruban : état(s) correspondants et date affichée (début → fin quand on la connaît).
const STEPS = [
  { id: "cmd", label: "Commande", etats: ["NOT ORDERED", "NON_DESIGNEE"], color: "NOT ORDERED" },
  { id: "fnr", label: "Fabrication FNR", etats: ["En fabrication", "STOCKAGE_EXT"], color: "En fabrication" },
  { id: "meca", label: "Montage méca", etats: ["MONTAGE"], from: "arrivee", color: "MONTAGE" },
  { id: "elec", label: "Montage élec", etats: ["ELEC"], color: "ELEC" },
  { id: "tests", label: "Tests", etats: ["TESTS"], from: "tests", to: "testsFin", color: "TESTS" },
  { id: "pack", label: "Packaging", etats: ["PACKAGING"], to: "finProd", color: "PACKAGING" },
  { id: "ship", label: "Expédiée", etats: ["SHIPPED"], to: "depart", color: "SHIPPED" },
];

export function RowDetail({ dialog, r, onClose, comments, addComment, deleteComment, pinOk, delays, delayTypes, setDelayTypes, addDelayAllocation, deleteDelayAllocation, addDelayComment, deleteDelayComment, authorName, savePjMetaOverride, canEditMeta }) {
  const [open, setOpen] = useState(null); // "comments" | "delays" | "edit"
  useEffect(() => { if (dialog) return undefined; const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose, dialog]);
  const meta = getPjMeta(r.pj, r), cur = Math.max(0, STEPS.findIndex(s => s.etats.includes(r.etat)));
  const shipped = r.etat === "SHIPPED", stateBar = ((ETAT_META[r.etat] || {}).bar) || T.teal500;
  const list = (comments && comments[r.pj]) || [], pub = list.filter(c => !c.private);
  const last = pub.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))).pop();
  const kind = presenceKind(r.clientPresence);
  const done = mixHex(T.card, ETAT_META.SHIPPED.bar, T.mode === "dark" ? .22 : .12);
  const btn = primary => ({ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 30, padding: "0 12px", borderRadius: 6, border: primary ? "none" : "1px solid " + T.line, background: primary ? T.ink900 : T.card, color: primary ? T.card : T.ink700, fontFamily: T.font, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" });
  const toggle = id => setOpen(o => (o === id ? null : id));
  return (<div className="enogia-row-open" style={dialog ? { fontFamily: T.font } : { padding: "10px 12px 12px", background: T.surface, borderLeft: "3px solid " + stateBar, fontFamily: T.font }}>
    {/* Ruban des étapes */}
    <ol aria-label="Parcours de la machine" style={dialog ? { listStyle: "none", margin: 0, padding: 0, display: "flex", gap: 4 } : { listStyle: "none", margin: 0, padding: 0, display: "flex", border: "1px solid " + T.line, borderRadius: 6, overflow: "hidden", background: T.card }}>
      {STEPS.map((s, i) => {
        const isDone = shipped ? true : i < cur, isCur = !shipped && i === cur, bar = (ETAT_META[s.color] || {}).bar || T.teal500;
        const a = s.from ? fd(r[s.from]) : "", b = s.to ? fd(r[s.to]) : "";
        const date = a && b ? a + " → " + b : a || b;
        const late = s.id === "ship" && r.drift > 0 && !shipped;
        return (<li key={s.id} aria-current={isCur ? "step" : undefined} style={{ flex: 1, minWidth: 0, padding: dialog ? "8px 6px 9px" : "5px 6px 6px", textAlign: "center", borderLeft: !dialog && i ? "1px solid " + T.line : "none", borderRadius: dialog ? 10 : 0, boxShadow: dialog && !isCur && !isDone ? "inset 0 0 0 1px " + T.line : "none", background: isCur ? bar : isDone ? done : dialog ? T.surface : T.card, color: isCur ? inkOn(bar) : isDone ? T.ink700 : T.ink500, transform: dialog && isCur ? "translateY(-2px)" : "none" }}>
          <div style={{ fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isCur ? inkOn(bar) : T.ink900 }}>{isDone ? "✓ " : ""}{s.label}</div>
          <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isCur ? "en cours" + (date ? " · " + date : "") : date || (isDone ? "fait" : "—")}{late ? <b style={{ color: T.red500 }}> +{r.drift} j</b> : null}</div>
        </li>);
      })}
    </ol>
    {/* Qui / quoi / dernier mot  ·  actions */}
    <div style={{ display: "flex", gap: 16, marginTop: dialog ? 16 : 10, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 5, fontSize: FZ.xs, color: T.ink700 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {chefsOf(meta).map(c => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Avatar name={c} size={18} />{c}</span>)}
          <EpcTag meta={meta} />
          {kind && <PresenceChip kind={kind} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} />}
          {meta.numSerie && <span style={{ fontFamily: T.fontMono, color: T.ink500 }}>{meta.numSerie}</span>}
          {meta.pays && meta.pays !== "—" && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><CountryFlag pays={meta.pays} size={12} />{meta.pays}</span>}
          {canEditMeta && savePjMetaOverride && <button type="button" onClick={() => toggle("edit")} aria-expanded={open === "edit"} style={{ border: "none", background: "transparent", color: T.teal600, fontWeight: 700, fontSize: FZ.xs, cursor: "pointer", minHeight: 24, padding: 0, fontFamily: T.font }}>Modifier</button>}
        </div>
        {last ? <button type="button" onClick={() => toggle("comments")} style={{ textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, color: T.ink900, lineHeight: 1.45 }}>« {String(last.text || "").replace(/\s+/g, " ").slice(0, 180)}{String(last.text || "").length > 180 ? "…" : ""} » <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{last.author || ""}, {relTime(last.date)}</span></button>
          : <span style={{ color: T.ink500 }}>Pas encore de commentaire.</span>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => toggle("comments")} aria-expanded={open === "comments"} style={btn(false)}><NavIcon name="comments" size={14} />Commentaires{pub.length ? " (" + pub.length + ")" : ""}</button>
        {pinOk && delayTypes && <button type="button" onClick={() => toggle("delays")} aria-expanded={open === "delays"} style={btn(false)}><NavIcon name="clock" size={14} />Déclarer un retard</button>}
        {pinOk && <button type="button" onClick={() => { try { window.dispatchEvent(new CustomEvent("enogia:openSynthese", { detail: { pj: r.pj } })); } catch (e) {} }} style={btn(true)}>Ouvrir la fiche projet</button>}
        {!dialog && <button type="button" onClick={onClose} aria-label="Replier le détail" title="Replier (Échap)" style={{ ...btn(false), padding: 0, width: 30, justifyContent: "center" }}><NavIcon name="close" size={11} /></button>}
      </div>
    </div>
    {open && <div className="enogia-view-in" style={{ marginTop: 10, padding: 12, background: T.card, border: "1px solid " + T.line, borderRadius: 10 }}>
      {open === "comments" && <ProjectComments pj={r.pj} comments={list} addComment={addComment} deleteComment={deleteComment} pinOk={pinOk} authorName={authorName} />}
      {open === "delays" && <DelayAllocations pj={r.pj} delays={(delays && delays[r.pj]) || []} delayTypes={delayTypes} setDelayTypes={setDelayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation} addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} />}
      {open === "edit" && <EditMetaForm meta={meta} gamme={r.gamme} onCancel={() => setOpen(null)} onSave={async f => { const ok = await savePjMetaOverride(r.pj, f); if (ok) setOpen(null); }} />}
    </div>}
  </div>);
}

// v202 (demandé : « la pop-up qui s'ouvre en transition, et pareil à la fermeture, au milieu de la page avec un flou derrière ») :
// fenêtre centrale arrondie, fond flouté ; entrée 240 ms (fondu + légère montée et zoom), sortie 180 ms avant de disparaître.
// Échap, clic à côté ou la croix ferment ; le focus revient à la ligne ; prefers-reduced-motion respecté (styles.css).
export function RowDialog(props) {
  const { r, onClose } = props;
  const [closing, setClosing] = useState(false), box = useRef(null), t = useRef(0);
  const close = () => { if (closing) return; setClosing(true); t.current = setTimeout(onClose, 180); };
  useEffect(() => {
    const prev = document.activeElement, k = e => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", k); if (box.current) box.current.focus();
    const ov = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ov; clearTimeout(t.current); if (prev && prev.focus) prev.focus(); };
  }, []); // eslint-disable-line
  if (!r) return null;
  const meta = getPjMeta(r.pj, r), bar = ((ETAT_META[r.etat] || {}).bar) || T.teal500;
  return (<div className={"enogia-dlg-backdrop" + (closing ? " closing" : "")} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(8,12,28,.42)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={"Fiche " + r.pj} className="enogia-dlg"
      style={{ width: "min(860px, 100%)", maxHeight: "88vh", overflowY: "auto", background: T.card, borderRadius: 20, boxShadow: "0 30px 80px rgba(8,12,28,.35), 0 0 0 1px " + T.line, outline: "none", position: "relative" }}>
      <div aria-hidden="true" style={{ height: 6, background: bar, borderRadius: "20px 20px 0 0" }} />
      <div style={{ padding: "16px 22px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <PjPlate pj={r.pj} size="lg" />
          <Badge etat={r.etat} />
          {r.gamme && <span style={{ fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, color: T.ink700 }}>{r.gamme}</span>}
          <span style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 600, letterSpacing: "-.01em", color: T.ink900, flex: "1 1 160px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
          <button type="button" onClick={close} aria-label="Fermer" title="Fermer (Échap)" style={{ border: "none", background: T.surface, color: T.ink700, borderRadius: 999, width: 34, height: 34, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><NavIcon name="close" size={12} /></button>
        </div>
        <RowDetail dialog {...props} onClose={close} />
      </div>
    </div>
  </div>);
}
