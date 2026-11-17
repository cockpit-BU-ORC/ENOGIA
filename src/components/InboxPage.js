// v315 (revue frontend, point 6) : « À traiter », une boîte par personne ; v324 : affichée seulement dans le pop-up de la cloche.
// v365 (maquette v364-cloche.html, piste B choisie) : fil par jour — demandes à valider en tête, puis mentions, affectations aux tests,
// projets modifiés et vidéo groupés par jour. Sur chaque ligne : « Vu » (reste, grisée, hors pastille), « Traité » (sort du fil, section
// « Traités » repliée), « Plus tard » (revient le lendemain à 8 h) ; actions au survol ou au focus, toujours visibles au doigt ; au doigt,
// glisser à droite = Traité, à gauche = Plus tard. Les réactions émojis restent. Modèle : src/bellFeed.js.
import React, { useRef, useState } from "react";
import { T, FZF as FZ, btn } from "../theme";
import { getPjMeta, relTime } from "../pjMeta";
import { gcalUrl } from "../gcal";
import { splitActions, buildFeed, dayLabel } from "../bellFeed";
import { Pill, Btn, PjPlate, EmptyState, NavIcon } from "./SharedUI";
import { Reactions } from "./Reactions";

const PjBtn = ({ pj, onClick }) => <button type="button" onClick={onClick} aria-label={"Ouvrir la fiche de " + pj} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", flexShrink: 0 }}><PjPlate pj={pj} /></button>;
const SWIPE = 80;

// ligne du fil : glisser au doigt (droite = Traité, gauche = Plus tard), suivi 1:1 puis retour en 150 ms
function FeedRow({ item, seen, children, acts, onSwipe }) {
  const [dx, setDx] = useState(0), st = useRef(null);
  const down = e => { if (e.pointerType !== "touch" || !onSwipe) return; st.current = { x: e.clientX, y: e.clientY, on: false }; };
  const move = e => { const s = st.current; if (!s) return; const x = e.clientX - s.x, y = e.clientY - s.y;
    if (!s.on) { if (Math.abs(y) > 10 && Math.abs(y) > Math.abs(x)) { st.current = null; return; } if (Math.abs(x) < 10) return; s.on = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
    setDx(x); };
  const up = () => { const s = st.current; st.current = null; if (s && s.on && Math.abs(dx) >= SWIPE) onSwipe(dx > 0 ? "done" : "later"); setDx(0); };
  const hint = dx > 20 ? { bg: T.emerald100, ink: T.emerald600, t: "Traité", side: "flex-start" } : dx < -20 ? { bg: T.amber100, ink: T.amber600, t: "Plus tard", side: "flex-end" } : null;
  return <div style={{ position: "relative", borderTop: "1px solid " + T.line, overflow: "hidden" }}>
    {hint && <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: hint.bg, color: hint.ink, display: "flex", alignItems: "center", justifyContent: hint.side, padding: "0 16px", fontSize: FZ.sm, fontWeight: 600 }}>{hint.t}</div>}
    <div className="e-bell-row" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} data-key={item.key}
      style={{ position: "relative", display: "grid", gridTemplateColumns: "10px minmax(0,1fr)", gap: 10, padding: "10px 12px", background: T.card, touchAction: "pan-y", transform: dx ? "translateX(" + dx + "px)" : "none", transition: dx ? "none" : "transform var(--e-dur-micro) ease-out" }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 7, borderRadius: 999, background: seen ? "transparent" : T.red600, border: seen ? "1px solid " + T.ink500 : "none", boxSizing: "border-box" }} />
      <div style={{ minWidth: 0, opacity: seen ? 0.6 : 1 }}>{children}</div>
      {acts && <div className="e-bell-acts" style={{ position: "absolute", right: 8, top: 6, display: "flex", gap: 4, background: T.card, borderRadius: 8, padding: 2 }}>{acts}</div>}
    </div>
  </div>;
}

export function InboxPage({ me, comments, data, resolveComment, canSeePrivate, onOpen, actions, assignments, onOpenTests, video, onOpenVideo, pjChanges, onOpenChanges, bell }) {
  const local = (bell && bell.local) || {}, setMark = (bell && bell.mark) || (() => {});
  const [showLater, setShowLater] = useState(false);
  const f = buildFeed({ comments, me, canSeePrivate, assignments, pjChanges, video, local });
  // v380 : demandes à valider avec Vu / Masquer / Plus tard (sur ce poste ; une demande dont le contenu change revient)
  const AS = splitActions(actions, local), acts = [...AS.open, ...AS.seen], nAct = AS.open.reduce((a, x) => a + (x.n || 1), 0), hidden = [...AS.later, ...AS.done];
  const [showHidden, setShowHidden] = useState(false);
  const markA = (a, s) => setMark(a.key, s === "seen" && a.s === "seen" ? null : s);
  const AA = (a, s, label, tone, title) => <button type="button" onClick={() => markA(a, s)} title={title} aria-label={label + " : " + a.title}
    style={{ ...btn("sec", "sm"), minHeight: 28, padding: "0 8px", fontSize: 12, color: tone || T.ink700, borderColor: tone || T.line }}>{label}</button>;
  const nameOf = pj => { const r = (data || []).find(x => x.pj === pj); return r ? getPjMeta(pj, r).nomProjet || "" : ""; };
  const rowOf = pj => (data || []).find(x => x.pj === pj) || {};
  // Vu / Traité d'une mention : enregistrés sur le commentaire (visibles de tous) ; le reste et « Plus tard » : sur ce poste
  const mark = (x, s) => {
    if (x.kind === "mention" && s !== "later" && x.s !== "later" && resolveComment) {
      if (s === "seen") resolveComment(x.pj, x.idx, me, x.s !== "seen", "seen");
      else if (s === "done") resolveComment(x.pj, x.idx, me, true, "resolved");
      else if (s === null) resolveComment(x.pj, x.idx, me, false, "resolved");
      if (local[x.key]) setMark(x.key, null);
      return;
    }
    setMark(x.key, s === "seen" && x.s === "seen" ? null : s);
  };
  const allSeen = () => f.feed.filter(x => x.s === "new").forEach(x => mark(x, "seen"));
  const A = (x, s, label, tone) => <button type="button" onClick={() => mark(x, s)} aria-label={label + " : " + (x.pj || "vidéo")}
    style={{ ...btn("sec", "sm"), minHeight: 28, padding: "0 8px", fontSize: 12, color: tone || T.ink700, borderColor: tone || T.line }}>{label}</button>;
  const actsOf = x => <>{A(x, "seen", x.s === "seen" ? "Non vu" : "✓ Vu")}{A(x, "done", "Traité", T.emerald600)}{A(x, "later", "Plus tard", T.amber600)}</>;
  const head = (pj, who, at, tab) => <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingRight: 210 }} className="e-bell-head">
    {pj && <PjBtn pj={pj} onClick={() => onOpen(pj, tab)} />}<span style={{ fontSize: FZ.xs, color: T.ink500, minWidth: 0 }}>{who}{at ? " · " + relTime(at) : ""}</span></div>;
  const body = x => {
    if (x.kind === "mention") { const c = x.c; return <>
      {head(x.pj, <><b style={{ color: T.ink900, fontWeight: 600 }}>{c.author || "Un collègue"}</b>{nameOf(x.pj) ? " · " + nameOf(x.pj) : ""}</>, c.date, "comments")}
      <div data-no-i18n="1" style={{ fontSize: FZ.sm, color: T.ink700, whiteSpace: "pre-wrap", lineHeight: 1.4, margin: "4px 0 6px" }}>{String(c.text || "").length > 220 ? String(c.text).slice(0, 219) + "…" : c.text}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><Btn size="sm" onClick={() => onOpen(x.pj, "comments")}>Répondre</Btn><Reactions c={c} pj={x.pj} idx={x.idx} /></div></>; }
    if (x.kind === "assign") { const a = x.a, r = rowOf(a.pj), from = a.from || String(r.tests || "").slice(0, 10), to = a.to || String(r.testsFin || r.tests || "").slice(0, 10);
      return <>{head(a.pj, <><b style={{ color: T.ink900, fontWeight: 600 }}>Affecté aux tests</b>{a.by ? " · par " + a.by : ""}</>, a.at, "resume")}
        <div style={{ fontSize: FZ.sm, color: T.ink700, margin: "4px 0 0", display: "flex", gap: 10, flexWrap: "wrap" }}>{r.gamme ? r.gamme + " · " : ""}{from ? from.slice(8, 10) + "/" + from.slice(5, 7) + (to && to !== from ? " → " + to.slice(8, 10) + "/" + to.slice(5, 7) : "") : "période à fixer"}
          {onOpenTests && <button type="button" onClick={() => onOpenTests(a.pj)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: T.accentInk, fontSize: FZ.xs, fontWeight: 500, fontFamily: T.font }}>Ouvrir dans Tests</button>}
          {from && <a href={gcalUrl({ title: "Tests FAT " + a.pj + (r.gamme ? " · " + r.gamme : ""), from, to, details: "Tests FAT de la machine " + a.pj + "." })} target="_blank" rel="noopener noreferrer" style={{ fontSize: FZ.xs, fontWeight: 500, color: T.accentInk }}>Ajouter à mon agenda</a>}</div></>; }
    if (x.kind === "change") { const c = x.ch; return <>{head(c.pj, <><b style={{ color: T.ink900, fontWeight: 600 }}>Projet modifié par le planning</b>{c.nom || nameOf(c.pj) ? " · " + (c.nom || nameOf(c.pj)) : ""}</>, c.at, "resume")}
      <div style={{ marginTop: 4 }}><Pill tone={c.isNew ? "info" : c.delta > 0 ? "bad" : c.delta < 0 ? "ok" : "neutral"}>{c.isNew ? "nouveau" : c.delta > 0 ? "départ +" + c.delta + " j" : c.delta < 0 ? "départ −" + Math.abs(c.delta) + " j" : "dates modifiées"}</Pill></div></>; }
    const v = x.video; return <>{head(null, <b style={{ color: T.ink900, fontWeight: 600 }}>{v.title || "Le tour du Cockpit en vidéo"}</b>)}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, fontSize: FZ.xs, color: T.ink500 }}><NavIcon name="play" size={14} />Disponible jusqu'au {v.until ? new Date(v.until + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "…"}<Btn size="sm" onClick={onOpenVideo}>Regarder</Btn></div></>;
  };
  let lastDay = "";
  const nNew = f.feed.filter(x => x.s === "new").length;
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: FZ.md, fontWeight: 600, color: T.ink900, fontFamily: T.fontDisplay }}>À traiter</div>
        <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{nAct + f.red ? nAct + f.red + " élément" + (nAct + f.red > 1 ? "s attendent" : " attend") + " une action de votre part" : "Rien n'attend d'action de votre part"}</div></div>
      {nNew > 0 && <Btn size="sm" onClick={allSeen}>Tout marquer vu</Btn>}
    </div>

    {(acts.length > 0 || hidden.length > 0) && <section aria-label="Demandes à valider" style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: FZ.xs, fontWeight: 500, color: T.ink500, display: "flex", gap: 8, alignItems: "center" }}>Demandes à valider {nAct > 0 && <Pill tone="bad">{nAct}</Pill>}</div>
      {acts.map((a, i) => <div key={a.id} style={{ borderTop: i ? "1px solid " + T.line : "none", paddingTop: i ? 8 : 0, display: "flex", flexDirection: "column", gap: 6, opacity: a.s === "seen" ? 0.6 : 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span aria-hidden="true" style={{ width: 4, alignSelf: "stretch", minHeight: 20, borderRadius: 4, background: a.tone === "warn" ? T.amber500 : T.red500 }} />
          <div style={{ flex: "1 1 220px", minWidth: 0 }}><div style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink900 }}>{a.title}</div>{a.detail && <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{a.detail}</div>}</div>
          {a.cta && <Btn v={a.primary && a.s !== "seen" ? "pri" : "sec"} size="sm" onClick={a.cta.onClick}>{a.cta.label}</Btn>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 14 }}>{AA(a, "seen", a.s === "seen" ? "Non vu" : "✓ Vu", null, a.s === "seen" ? "Remettre en évidence" : "Garder la demande, grisée, hors du compte rouge")}{AA(a, "done", "Masquer", T.emerald600, "Masquer jusqu'à ce que son contenu change")}{AA(a, "later", "Plus tard", T.amber600, "Revient demain à 8 h")}</div>
        {a.items && a.items.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 14 }}>
          {a.items.slice(0, 12).map(x => <span key={x.pj + (x.text || "")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.surface, borderRadius: 8, padding: "3px 8px 3px 4px", fontSize: FZ.xs, color: T.ink700 }}>
            <PjBtn pj={x.pj} onClick={() => onOpen(x.pj, "resume")} />{x.text}
            {x.yes && <button type="button" onClick={x.yes.onClick} title={x.yes.title} aria-label={x.yes.title} style={{ minHeight: 24, padding: "0 8px", borderRadius: 8, border: "1px solid " + T.emerald500, background: T.emerald100, color: T.emerald600, fontSize: FZ.xs, fontWeight: 500, cursor: "pointer", fontFamily: T.font }}>{x.yes.label}</button>}</span>)}
          {a.items.length > 12 && <span style={{ fontSize: FZ.xs, color: T.ink500, alignSelf: "center" }}>et {a.items.length - 12} autres</span>}
        </div>}
      </div>)}
      {!acts.length && <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Toutes les demandes sont masquées ou reportées</div>}
      {hidden.length > 0 && <div style={{ borderTop: "1px solid " + T.line, paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <button type="button" aria-expanded={showHidden} onClick={() => setShowHidden(v => !v)} style={{ ...btn("ghost", "sm"), alignSelf: "flex-start", fontWeight: 500 }}>{hidden.length} masquée{hidden.length > 1 ? "s" : ""} ou reportée{hidden.length > 1 ? "s" : ""} · {showHidden ? "Cacher" : "Afficher"}</button>
        {showHidden && hidden.map(a => <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: FZ.xs, color: T.ink500 }}>
          <span style={{ flex: "1 1 200px", minWidth: 0 }}>{a.title}{a.s === "later" ? " · revient demain à 8 h" : ""}</span>
          <button type="button" onClick={() => setMark(a.key, null)} style={{ ...btn("sec", "sm"), minHeight: 28, fontSize: 12 }}>Remettre</button></div>)}
      </div>}
    </section>}

    <section aria-label="Notifications" style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
      <div className="e-bell-swipe" aria-hidden="true" style={{ justifyContent: "space-between", padding: "6px 12px", fontSize: 12, fontWeight: 500, color: T.ink500, background: T.surface }}><span>← glisser : Plus tard</span><span>glisser : Traité →</span></div>
      {f.feed.length === 0 && <div style={{ padding: 12 }}><EmptyState compact icon="check" title="Tout est à jour" hint="Mentions, affectations aux tests et projets modifiés apparaîtront ici." /></div>}
      {f.feed.map(x => { const d = dayLabel(x.at), sep = d !== lastDay; lastDay = d;
        return <React.Fragment key={x.key}>
          {sep && <div style={{ padding: "6px 12px 4px", fontSize: 12, fontWeight: 500, color: T.ink500, background: T.surface, borderTop: "1px solid " + T.line }}>{d}</div>}
          <FeedRow item={x} seen={x.s === "seen"} acts={actsOf(x)} onSwipe={s => mark(x, s)}>{body(x)}</FeedRow>
        </React.Fragment>; })}
      {f.later.length > 0 && <div style={{ borderTop: "1px solid " + T.line, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, background: T.amber100, color: T.amber600, borderRadius: 999, padding: "2px 10px" }}>{f.later.length} reviendra{f.later.length > 1 ? "ont" : ""} demain à 8 h</span>
        <button type="button" aria-expanded={showLater} onClick={() => setShowLater(v => !v)} style={{ ...btn("ghost", "sm") }}>{showLater ? "Masquer" : "Voir"}</button>
      </div>}
      {showLater && f.later.map(x => <FeedRow key={x.key} item={x} seen acts={<button type="button" onClick={() => mark(x, null)} style={{ ...btn("sec", "sm"), minHeight: 28, fontSize: 12 }}>Remettre maintenant</button>}>{body(x)}</FeedRow>)}
      {f.done.length > 0 && <details style={{ borderTop: "1px solid " + T.line }}>
        <summary style={{ cursor: "pointer", padding: "10px 12px", fontSize: FZ.sm, fontWeight: 500, color: T.ink700 }}>Traités ({f.done.length})</summary>
        {f.done.map(x => <FeedRow key={x.key} item={x} seen acts={x.kind === "mention" && x.c && x.c.reactions && Object.values(x.c.reactions).some(l => (l || []).map(e => String(e).toLowerCase()).includes(String(me).toLowerCase())) ? null
          : <button type="button" onClick={() => mark(x, null)} style={{ ...btn("sec", "sm"), minHeight: 28, fontSize: 12 }}>Rouvrir</button>}>{body(x)}</FeedRow>)}
      </details>}
    </section>
    {(pjChanges || []).length > 0 && onOpenChanges && <Btn v="ghost" size="sm" onClick={onOpenChanges} style={{ alignSelf: "flex-start" }}>Voir le détail des modifications</Btn>}
  </div>;
}
