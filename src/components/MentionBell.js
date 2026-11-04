import React, { useState, useEffect, useMemo, useRef } from "react";
import { T, FZ } from "../theme";
import { openMentionsFor, nameFromEmail, isSeenFor } from "../mentions";
import { relTime, getPjMeta } from "../pjMeta";
import { gcalUrl } from "../gcal";
import { NavIcon } from "./SharedUI";

// v152 — Cloche de l'en-tête : les demandes où l'on est cité (@) et qu'on n'a pas encore marquées « traitées », tous PJ confondus.
// v188 : + les nouvelles affectations aux tests (assignments = [{ pj, at, by, from, to }]), « Vu » les retire, lien Google Agenda.
export function MentionBell({ comments, me, data, resolveComment, onOpen, canSeePrivate, assignments, onSeenAssign, onOpenTests, video, onOpenVideo, pjChanges, onSeenPjChanges, onOpenChanges }) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => openMentionsFor(comments, me).filter(x => canSeePrivate || !x.c.private), [comments, me, canSeePrivate]); // un compte sans accès Manager ne voit jamais un message privé
  useEffect(() => {
    if (!open) return;
    const k = e => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  // v271 (demandé : « la notification n'est pas assez visible », piste C) : « N à traiter » en toutes lettres, la cloche tinte et s'entoure d'un
  // halo quand le compte augmente, et un aperçu de la nouvelle mention sort de la cloche pendant 6 s (même chemin au retour, sans prendre le focus).
  const unseen = items.filter(x => !isSeenFor(x.c, me)), seenL = items.filter(x => isSeenFor(x.c, me));
  const asg0 = assignments || [], chg0 = pjChanges || [], red = unseen.length + asg0.length + chg0.length;
  const [ring, setRing] = useState(0), [peek, setPeek] = useState(null);
  const prev = useRef(null), shown = useRef(new Set());
  useEffect(() => {
    if (prev.current !== null && red > prev.current) setRing(k => k + 1);
    if (prev.current === null && red > 0) setRing(k => k + 1);
    prev.current = red;
  }, [red]);
  useEffect(() => {
    const fresh = unseen.find(x => !shown.current.has(x.pj + "-" + x.idx + "-" + x.c.date));
    unseen.forEach(x => shown.current.add(x.pj + "-" + x.idx + "-" + x.c.date));
    if (!fresh || open) return undefined;
    setPeek(fresh); const t = setTimeout(() => setPeek(null), 6000); return () => clearTimeout(t);
  }, [unseen.map(x => x.pj + x.idx + x.c.date).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!me) return null;
  const asg = asg0, chg = chg0, n = red;
  const rowOf = pj => (data || []).find(x => x.pj === pj);
  const nameOf = pj => { const r = (data || []).find(x => x.pj === pj); return r ? getPjMeta(pj, r).nomProjet || "" : ""; };
  return (<div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
    {n > 0 && <button type="button" onClick={() => { setPeek(null); setOpen(v => !v); }} aria-hidden="true" tabIndex={-1} className="enogia-bell-ask"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 28, padding: "0 11px 0 9px", borderRadius: 999, border: "none", background: T.red100, color: T.red600, fontWeight: 700, fontSize: FZ.xs, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.red600 }} />{n} à traiter</button>}
    <button key={"b" + ring} className={ring ? "enogia-bell-ring" : undefined} onClick={() => { setPeek(null); setOpen(v => !v); }} title={n ? n + " notification" + (n > 1 ? "s" : "") + " (cité, affecté aux tests ou projet modifié)" : "Aucune notification"} aria-label={"Notifications : " + n + " à traiter"} aria-expanded={open}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, padding: 0, border: "1px solid " + (open ? T.violet500 + "66" : "transparent"), borderRadius: 9, cursor: "pointer", background: open ? T.violet100 : "transparent", color: n ? T.red600 : T.ink500 }}>
      {/* v240 (demandé : « mettre la notification de la cloche en rouge ») : cloche, pastille et compteur en rouge ; texte de la pastille = couleur de carte (lisible en clair et en sombre) */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      {n > 0 && <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 999, background: T.red600, color: T.card, fontSize:11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px", fontFamily: T.font }}>{n > 99 ? "99+" : n}</span>}
    </button>
    {peek && !open && <div role="status" className="enogia-bell-peek" style={{ position: "absolute", right: 0, top: 40, width: 300, zIndex: 9997, background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: "10px 12px", transformOrigin: "top right" }}>
      <div style={{ fontSize: FZ.xs, color: T.ink500 }}><b style={{ color: T.ink900 }}>{peek.c.author || "Un collègue"}</b> vous cite · <span style={{ fontFamily: T.fontMono, fontWeight: 700, color: T.ink900 }}>{peek.pj}</span></div>
      <div style={{ fontSize: FZ.sm, color: T.ink700, margin: "4px 0 8px", lineHeight: 1.4 }}>« {String(peek.c.text || "").length > 140 ? String(peek.c.text).slice(0, 139) + "…" : peek.c.text} »</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => { const p = peek; setPeek(null); onOpen(p.pj, "comments"); }} style={{ border: "1px solid " + T.ink900, background: T.ink900, color: T.card, borderRadius: 8, minHeight: 28, padding: "0 12px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Ouvrir</button>
        <button type="button" onClick={() => { const p = peek; setPeek(null); resolveComment(p.pj, p.idx, me, true, "seen"); }} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, minHeight: 28, padding: "0 12px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>✓ Vu</button>
        <button type="button" aria-label="Fermer l'aperçu" onClick={() => setPeek(null)} style={{ marginLeft: "auto", border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 24, minHeight: 24 }}>×</button>
      </div>
    </div>}
    {open && <>
      <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
      <div role="dialog" aria-label="À traiter : vous êtes cité ou chef de projet" style={{ position: "absolute", right: 0, top: 38, width: 380, maxWidth: "calc(100vw - 24px)", maxHeight: 440, overflowY: "auto", zIndex: 9999, background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: 8 }}>
        <div style={{ padding: "4px 8px 8px", fontSize: FZ.sm, fontWeight: 800, color: T.ink900 }}>À traiter : vous êtes cité ou chef de projet {n > 0 && <span style={{ color: T.red600 }}>({n})</span>}</div>
        {asg.length > 0 && <div style={{ padding: "6px 8px", borderRadius: 8, background: T.surface, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><b style={{ fontSize: FZ.xs, color: T.ink900 }}>Vous êtes affecté aux tests</b><button onClick={onSeenAssign} style={{ marginLeft: "auto", border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "2px 9px", minHeight: 24, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Vu</button></div>
          {asg.map(a => { const r = rowOf(a.pj) || {}, from = a.from || String(r.tests || "").slice(0, 10), to = a.to || String(r.testsFin || r.tests || "").slice(0, 10); return (
            <div key={a.pj + a.at} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "4px 0", borderTop: "1px solid " + T.line }}>
              <button onClick={() => { setOpen(false); onOpenTests && onOpenTests(a.pj); }} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: T.fontMono, fontWeight: 800, fontSize: FZ.sm, color: T.teal600, minHeight: 24 }}>{a.pj}</button>
              <span style={{ fontSize: FZ.xs, color: T.ink500, flex: 1, minWidth: 0 }}>{r.gamme ? r.gamme + " · " : ""}{from ? from.slice(8, 10) + "/" + from.slice(5, 7) + (to && to !== from ? " → " + to.slice(8, 10) + "/" + to.slice(5, 7) : "") : "période à fixer"}{a.by ? " · par " + a.by : ""}</span>
              {from && <a href={gcalUrl({ title: "Tests FAT " + a.pj + (r.gamme ? " · " + r.gamme : ""), from, to, details: "Tests FAT de la machine " + a.pj + "." })} target="_blank" rel="noopener noreferrer" style={{ fontSize: FZ.xs, fontWeight: 700, color: T.teal600 }}>Ajouter à mon agenda</a>}
            </div>); })}
        </div>}
        {/* v243 (demandé : « la laisser dispo dans l'onglet notification pendant 1 semaine, sans laisser le 1 apparent ») : la vidéo est une information, jamais comptée dans la pastille */}
        {video && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: T.surface, marginBottom: 6 }}>
          <NavIcon name="play" size={16} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink900 }}>{video.title || "Le tour du Cockpit en vidéo"}</div><div style={{ fontSize: FZ.xs, color: T.ink500 }}>Disponible jusqu'au {new Date(video.until + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div></div>
          <button onClick={() => { setOpen(false); onOpenVideo && onOpenVideo(); }} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "2px 9px", minHeight: 24, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Regarder</button>
        </div>}
        {/* v254 : modifications du planning sur les PJ dont je suis chef de projet */}
        {chg.length > 0 && <div style={{ padding: "6px 8px", borderRadius: 8, background: T.surface, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><b style={{ fontSize: FZ.xs, color: T.ink900 }}>Vos projets modifiés par le planning</b><button onClick={onSeenPjChanges} style={{ marginLeft: "auto", border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "2px 9px", minHeight: 24, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Vu</button></div>
          {chg.map(c => <div key={c.pj} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "4px 0", borderTop: "1px solid " + T.line }}>
            <button onClick={() => { setOpen(false); onOpen(c.pj, "resume"); }} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: T.fontMono, fontWeight: 800, fontSize: FZ.sm, color: T.teal600, minHeight: 24 }}>{c.pj}</button>
            <span style={{ fontSize: FZ.xs, color: T.ink500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nom || nameOf(c.pj)}</span>
            <span style={{ fontSize: FZ.xs, fontWeight: 700, color: c.isNew ? T.teal600 : c.delta > 0 ? T.red500 : c.delta < 0 ? T.emerald600 : T.ink700, whiteSpace: "nowrap" }}>{c.isNew ? "nouveau" : c.delta > 0 ? "départ +" + c.delta + " j" : c.delta < 0 ? "départ −" + Math.abs(c.delta) + " j" : "dates modifiées"}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{relTime(c.at)}</span>
          </div>)}
          {onOpenChanges && <button onClick={() => { setOpen(false); onOpenChanges(); }} style={{ border: "none", background: "transparent", padding: "4px 0 0", cursor: "pointer", fontFamily: T.font, fontSize: FZ.xs, fontWeight: 700, color: T.teal600 }}>Voir le détail des modifications</button>}
        </div>}
        {n === 0 && !seenL.length && <div style={{ padding: "14px 8px", fontSize: FZ.sm, color: T.ink500, textAlign: "center" }}>Rien à traiter pour l'instant.</div>}
        {[...unseen, ...seenL].map(({ pj, idx, c }, k) => { const seen = isSeenFor(c, me); return (<React.Fragment key={pj + "-" + idx}>{seen && k === unseen.length && <div style={{ padding: "8px 8px 2px", fontSize: FZ.xs, fontWeight: 700, color: T.ink500 }}>Vus, pas encore traités ({seenL.length})</div>}<div key={pj + "-" + idx} style={{ padding: "8px", borderRadius: 8, borderTop: "1px solid " + T.surface, display: "flex", flexDirection: "column", gap: 4, opacity: seen ? 0.78 : 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => { setOpen(false); onOpen(pj, "comments"); }} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: T.fontMono, fontWeight: 800, fontSize: FZ.sm, color: T.teal600 }}>{pj}</button>
            <span style={{ fontSize: FZ.xs, color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{nameOf(pj)}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink300 }}>{relTime(c.date)}</span>
          </div>
          <div style={{ fontSize: FZ.xs, color: T.ink700, whiteSpace: "pre-wrap", lineHeight: 1.4 }}><b>{c.author || nameFromEmail("")}</b> : {String(c.text || "").length > 220 ? String(c.text).slice(0, 219) + "…" : c.text}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { setOpen(false); onOpen(pj, "comments"); }} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "2px 9px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>{canSeePrivate ? "Ouvrir la fiche" : "Ouvrir le PJ"}</button>
            {!seen && <button onClick={() => resolveComment(pj, idx, me, true, "seen")} title="Montrer à l'auteur que vous l'avez pris en compte" style={{ border: "1px solid " + T.emerald500, background: T.emerald100, color: T.emerald600, borderRadius: 8, padding: "2px 9px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>✓ Vu</button>}
            <button onClick={() => resolveComment(pj, idx, me, true)} style={{ border: "1px solid " + T.violet500, background: T.violet100, color: T.violet600, borderRadius: 8, padding: "2px 9px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>✓ Traité</button>
          </div>
        </div></React.Fragment>); })}
      </div>
    </>}
  </div>);
}
