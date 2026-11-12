// v315 (revue frontend, point 6 « trois cloches pour une seule boîte de réception ») : la page « À traiter », une par personne.
// Ordre : 1. demandes à valider (une vraie action : S/N à attribuer, départs à reprendre, commandes en retard, turbines en retard… ;
// les demandes d'intervention SAV viendront ici), 2. mentions (cité dans un commentaire), 3. affectations aux tests, 4. informations
// (projets modifiés par le planning, vidéo). La cloche ne fait plus que mener ici et ne compte que ce qui attend une action.
import React from "react";
import { T, FZF as FZ } from "../theme";
import { openMentionsFor, isSeenFor } from "../mentions";
import { relTime, getPjMeta } from "../pjMeta";
import { gcalUrl } from "../gcal";
import { PageHead, Panel, Pill, Btn, PjPlate, EmptyState, NavIcon } from "./SharedUI";
import { Reactions } from "./Reactions";

const Row = ({ children, first }) => <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: first ? "none" : "1px solid " + T.line, minHeight: 40 }}>{children}</div>;
const PjBtn = ({ pj, onClick }) => <button type="button" onClick={onClick} aria-label={"Ouvrir la fiche de " + pj} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}><PjPlate pj={pj} /></button>;

export function InboxPage({ me, comments, data, resolveComment, canSeePrivate, onOpen, actions, assignments, onSeenAssign, onOpenTests, video, onOpenVideo, pjChanges, onSeenPjChanges, onOpenChanges }) {
  const ments = openMentionsFor(comments, me).filter(x => canSeePrivate || !x.c.private);
  const unseen = ments.filter(x => !isSeenFor(x.c, me)), seenL = ments.filter(x => isSeenFor(x.c, me));
  const acts = actions || [], asg = assignments || [], chg = pjChanges || [];
  const nameOf = pj => { const r = (data || []).find(x => x.pj === pj); return r ? getPjMeta(pj, r).nomProjet || "" : ""; };
  const rowOf = pj => (data || []).find(x => x.pj === pj) || {};
  const nAct = acts.reduce((a, x) => a + (x.n || 1), 0) + unseen.length + asg.length;
  const lead = nAct ? nAct + " élément" + (nAct > 1 ? "s attendent" : " attend") + " une action de votre part." : "Rien n'attend d'action de votre part.";

  return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1100 }}>
    <PageHead title="À traiter" sub={lead} accent={T.red500} />

    <Panel title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Demandes à valider {acts.length > 0 && <Pill tone="bad">{acts.reduce((a, x) => a + (x.n || 1), 0)}</Pill>}</span>}>
      {acts.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucune demande en attente. Les demandes d'intervention SAV arriveront ici.</div>
        : acts.map((a, i) => <div key={a.id} style={{ borderTop: i ? "1px solid " + T.line : "none", paddingTop: i ? 10 : 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span aria-hidden="true" style={{ width: 4, alignSelf: "stretch", minHeight: 20, borderRadius: 2, background: a.tone === "warn" ? T.amber500 : T.red500 }} />
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900 }}>{a.title}</div>
              {a.detail && <div style={{ fontSize: FZ.xs, color: T.ink500 }}>{a.detail}</div>}
            </div>
            {a.cta && <Btn v={a.primary ? "pri" : "sec"} size="sm" onClick={a.cta.onClick}>{a.cta.label}</Btn>}
          </div>
          {a.items && a.items.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 14 }}>
            {a.items.slice(0, 12).map(x => <span key={x.pj + (x.text || "")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.surface, borderRadius: 8, padding: "3px 8px 3px 4px", fontSize: FZ.xs, color: T.ink700 }}>
              <PjBtn pj={x.pj} onClick={() => onOpen(x.pj, "resume")} />{x.text}
              {x.yes && <button type="button" onClick={x.yes.onClick} title={x.yes.title} aria-label={x.yes.title} style={{ minHeight: 24, padding: "0 8px", borderRadius: 8, border: "1px solid " + T.emerald500, background: T.emerald100, color: T.emerald600, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>{x.yes.label}</button>}</span>)}
            {a.items.length > 12 && <span style={{ fontSize: FZ.xs, color: T.ink500, alignSelf: "center" }}>et {a.items.length - 12} autres</span>}
          </div>}
        </div>)}
    </Panel>

    <Panel title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Vous êtes cité {unseen.length > 0 && <Pill tone="bad">{unseen.length} à voir</Pill>}{seenL.length > 0 && <Pill tone="muted">{seenL.length} vu{seenL.length > 1 ? "s" : ""}, pas traité{seenL.length > 1 ? "s" : ""}</Pill>}</span>}>
      {ments.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Personne ne vous attend dans un commentaire.</div>
        : [...unseen, ...seenL].map(({ pj, idx, c }, k) => { const seen = isSeenFor(c, me); return <Row key={pj + "-" + idx} first={k === 0}>
          <PjBtn pj={pj} onClick={() => onOpen(pj, "comments")} />
          <div style={{ flex: "1 1 320px", minWidth: 0, opacity: seen ? 0.8 : 1 }}>
            <div style={{ fontSize: FZ.xs, color: T.ink500 }}><b style={{ color: T.ink900 }}>{c.author || "Un collègue"}</b> · {nameOf(pj)} · {relTime(c.date)}</div>
            <div data-no-i18n="1" style={{ fontSize: FZ.sm, color: T.ink700, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{String(c.text || "").length > 260 ? String(c.text).slice(0, 259) + "…" : c.text}</div>
          </div>
          <span style={{ display: "inline-flex", gap: 6 }}>
            <Btn size="sm" onClick={() => onOpen(pj, "comments")}>Répondre</Btn>
            <Reactions c={c} pj={pj} idx={idx} />
          </span>
        </Row>; })}
    </Panel>

    {asg.length > 0 && <Panel title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Vous êtes affecté aux tests <Pill tone="bad">{asg.length}</Pill></span>} right={<Btn size="sm" onClick={onSeenAssign}>Tout marquer vu</Btn>}>
      {asg.map((a, k) => { const r = rowOf(a.pj), from = a.from || String(r.tests || "").slice(0, 10), to = a.to || String(r.testsFin || r.tests || "").slice(0, 10); return <Row key={a.pj + a.at} first={k === 0}>
        <PjBtn pj={a.pj} onClick={() => onOpenTests && onOpenTests(a.pj)} />
        <span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm, color: T.ink700 }}>{r.gamme ? r.gamme + " · " : ""}{from ? from.slice(8, 10) + "/" + from.slice(5, 7) + (to && to !== from ? " → " + to.slice(8, 10) + "/" + to.slice(5, 7) : "") : "période à fixer"}{a.by ? " · par " + a.by : ""}</span>
        {from && <a href={gcalUrl({ title: "Tests FAT " + a.pj + (r.gamme ? " · " + r.gamme : ""), from, to, details: "Tests FAT de la machine " + a.pj + "." })} target="_blank" rel="noopener noreferrer" style={{ fontSize: FZ.xs, fontWeight: 700, color: T.accentInk || T.teal600 }}>Ajouter à mon agenda</a>}
      </Row>; })}
    </Panel>}

    <Panel title="Pour information" right={chg.length > 0 ? <Btn size="sm" onClick={onSeenPjChanges}>Tout marquer vu</Btn> : null}>
      {!chg.length && !video && <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Rien de nouveau.</div>}
      {video && <Row first>
        <NavIcon name="play" size={16} />
        <span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm, color: T.ink700 }}><b style={{ color: T.ink900 }}>{video.title || "Le tour du Cockpit en vidéo"}</b> · disponible jusqu'au {new Date(video.until + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>
        <Btn size="sm" onClick={onOpenVideo}>Regarder</Btn>
      </Row>}
      {chg.length > 0 && <div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink500, marginTop: video ? 6 : 0 }}>Vos projets modifiés par le planning</div>}
      {chg.map((c, k) => <Row key={c.pj} first={k === 0 && !video}>
        <PjBtn pj={c.pj} onClick={() => onOpen(c.pj, "resume")} />
        <span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm, color: T.ink700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nom || nameOf(c.pj)}</span>
        <Pill tone={c.isNew ? "info" : c.delta > 0 ? "bad" : c.delta < 0 ? "ok" : "neutral"}>{c.isNew ? "nouveau" : c.delta > 0 ? "départ +" + c.delta + " j" : c.delta < 0 ? "départ −" + Math.abs(c.delta) + " j" : "dates modifiées"}</Pill>
        <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{relTime(c.at)}</span>
      </Row>)}
      {chg.length > 0 && onOpenChanges && <Btn v="ghost" size="sm" onClick={onOpenChanges} style={{ alignSelf: "flex-start" }}>Voir le détail des modifications</Btn>}
    </Panel>
    {!nAct && !chg.length && !video && <EmptyState compact icon="check" title="Tout est à jour" hint="Les mentions, affectations et demandes à valider apparaîtront ici." />}
  </div>;
}
