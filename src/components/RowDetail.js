// ── v201 : détail d'un PJ dans la Liste — la « fiche suiveuse » (maquette validée) ───────────────────────────────────────
// Un ruban des étapes avec leurs noms (comme la fiche qui suit la machine dans l'atelier) : étapes faites cochées avec leur date,
// étape en cours en couleur d'état, étapes à venir avec la date prévue (écart au départ). Dessous, deux colonnes : qui / quoi /
// dernier commentaire, puis trois actions qui ouvrent sur place les commentaires ou les retards. Rien de ce que montre déjà la ligne.
import React, { useEffect, useState } from "react";
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

export function RowDetail({ r, onClose, comments, addComment, deleteComment, pinOk, delays, delayTypes, setDelayTypes, addDelayAllocation, deleteDelayAllocation, addDelayComment, deleteDelayComment, authorName, savePjMetaOverride, canEditMeta }) {
  const [open, setOpen] = useState(null); // "comments" | "delays" | "edit"
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const meta = getPjMeta(r.pj, r), cur = Math.max(0, STEPS.findIndex(s => s.etats.includes(r.etat)));
  const shipped = r.etat === "SHIPPED", stateBar = ((ETAT_META[r.etat] || {}).bar) || T.teal500;
  const list = (comments && comments[r.pj]) || [], pub = list.filter(c => !c.private);
  const last = pub.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))).pop();
  const kind = presenceKind(r.clientPresence);
  const done = mixHex(T.card, ETAT_META.SHIPPED.bar, T.mode === "dark" ? .22 : .12);
  const btn = primary => ({ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 30, padding: "0 12px", borderRadius: 6, border: primary ? "none" : "1px solid " + T.line, background: primary ? T.ink900 : T.card, color: primary ? T.card : T.ink700, fontFamily: T.font, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" });
  const toggle = id => setOpen(o => (o === id ? null : id));
  return (<div className="enogia-row-open" style={{ padding: "10px 12px 12px", background: T.surface, borderLeft: "3px solid " + stateBar, fontFamily: T.font }}>
    {/* Ruban des étapes */}
    <ol aria-label="Parcours de la machine" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", border: "1px solid " + T.line, borderRadius: 6, overflow: "hidden", background: T.card }}>
      {STEPS.map((s, i) => {
        const isDone = shipped ? true : i < cur, isCur = !shipped && i === cur, bar = (ETAT_META[s.color] || {}).bar || T.teal500;
        const a = s.from ? fd(r[s.from]) : "", b = s.to ? fd(r[s.to]) : "";
        const date = a && b ? a + " → " + b : a || b;
        const late = s.id === "ship" && r.drift > 0 && !shipped;
        return (<li key={s.id} aria-current={isCur ? "step" : undefined} style={{ flex: 1, minWidth: 0, padding: "5px 6px 6px", textAlign: "center", borderLeft: i ? "1px solid " + T.line : "none", background: isCur ? bar : isDone ? done : T.card, color: isCur ? inkOn(bar) : isDone ? T.ink700 : T.ink500 }}>
          <div style={{ fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isCur ? inkOn(bar) : T.ink900 }}>{isDone ? "✓ " : ""}{s.label}</div>
          <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isCur ? "en cours" + (date ? " · " + date : "") : date || (isDone ? "fait" : "—")}{late ? <b style={{ color: T.red500 }}> +{r.drift} j</b> : null}</div>
        </li>);
      })}
    </ol>
    {/* Qui / quoi / dernier mot  ·  actions */}
    <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
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
        <button type="button" onClick={onClose} aria-label="Replier le détail" title="Replier (Échap)" style={{ ...btn(false), padding: 0, width: 30, justifyContent: "center" }}><NavIcon name="close" size={11} /></button>
      </div>
    </div>
    {open && <div className="enogia-view-in" style={{ marginTop: 10, padding: 12, background: T.card, border: "1px solid " + T.line, borderRadius: 10 }}>
      {open === "comments" && <ProjectComments pj={r.pj} comments={list} addComment={addComment} deleteComment={deleteComment} pinOk={pinOk} authorName={authorName} />}
      {open === "delays" && <DelayAllocations pj={r.pj} delays={(delays && delays[r.pj]) || []} delayTypes={delayTypes} setDelayTypes={setDelayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation} addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} />}
      {open === "edit" && <EditMetaForm meta={meta} gamme={r.gamme} onCancel={() => setOpen(null)} onSave={async f => { const ok = await savePjMetaOverride(r.pj, f); if (ok) setOpen(null); }} />}
    </div>}
  </div>);
}
