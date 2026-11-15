// v317 — page Commentaires simplifiée (maquette maquettes-design/v316-commentaires.html validée : « Go, code-la »).
// À gauche les machines (filtres À répondre / Mes PJ / Tous), à droite le fil du PJ choisi avec réactions et réponse.
// Un chef de projet ne voit que ses PJ et les fils où on le cite ; « Tous » = direction et admins (seeAll).
// Plus de Kanban ni de sélection multiple : « Envoyer à… » ajoute d'autres PJ au message.
import React, { useState, useMemo, useEffect, useRef } from "react";
import { T, FZ } from "../theme";
import { fmt } from "../parsers";
import { getPjMeta, Avatar, PjPlate, relTime } from "../pjMeta";
import { PjChecklist, NavIcon, Segmented, Pill, Btn } from "./SharedUI";
import { MentionPicker, MentionTextarea } from "./MentionPicker";
import { useMentions } from "../mentionContext";
import { typedMentions, firstNameOf, lc } from "../mentions";
import { CommentMarks } from "./CommentMarks";
import { Reactions } from "./Reactions";
import { threadsOf, filterThreads } from "../commentThreads";
import { askConfirm } from "../confirm";

const ls = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } };
const dayLabel = iso => {
  const d = new Date(iso); if (isNaN(d)) return "";
  const t = new Date(); t.setHours(0, 0, 0, 0); const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = Math.round((t - x) / 864e5);
  if (diff === 0) return "Aujourd'hui"; if (diff === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
};
const hm = iso => { const d = new Date(iso); return isNaN(d) ? "" : String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };

function useNarrow(q = "(max-width: 760px)") {
  const [n, setN] = useState(() => { try { return window.matchMedia(q).matches; } catch (e) { return false; } });
  useEffect(() => { let m; try { m = window.matchMedia(q); } catch (e) { return undefined; } const f = () => setN(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, [q]);
  return n;
}

export function CommentsView({ data, comments, addComment, addCommentMulti, deleteComment, pinOk, seeAll, myPjs, openPj, authorName, resolveComment }) {
  const mctx = useMentions(), me = mctx.me;
  const narrow = useNarrow();
  const seenKey = "enogia_cmt_seen_" + lc(me);
  const [lastSeen, setLastSeen] = useState(() => { try { return JSON.parse(ls(seenKey, "{}")) || {}; } catch (e) { return {}; } });
  const [hidePrivate, setHidePrivate] = useState(() => ls("enogia_cmtHidePrivate", "0") === "1");
  const seePrivate = pinOk && !hidePrivate;
  const [filter, setFilterS] = useState(() => ls("enogia_cmt_filter", "mine"));
  const setFilter = f => { setFilterS(f); lsSet("enogia_cmt_filter", f); };
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);
  const [showList, setShowList] = useState(true);

  const pjs = useMemo(() => (data || []).map(r => r.pj), [data]);
  const metaOf = useMemo(() => { const m = {}; (data || []).forEach(r => { m[r.pj] = getPjMeta(r.pj, r); }); return m; }, [data]);
  const threads = useMemo(() => threadsOf({ comments, pjs, me, myName: authorName, myPjs, seeAll, seePrivate, lastSeen }), [comments, pjs, me, authorName, myPjs, seeAll, seePrivate, lastSeen]);
  const eff = filter === "all" && !seeAll ? "mine" : filter;
  const n = { at: filterThreads(threads, "at").length, mine: filterThreads(threads, "mine").length, all: threads.length };
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    let l = filterThreads(threads, eff);
    if (q) l = l.filter(t => t.pj.toLowerCase().includes(q) || String((metaOf[t.pj] || {}).nomProjet || "").toLowerCase().includes(q) || (t.last && String(t.last.text || "").toLowerCase().includes(q)));
    return l;
  }, [threads, eff, search, metaOf]);
  useEffect(() => { if (!narrow && shown.length && !shown.some(t => t.pj === sel)) setSel(shown[0].pj); }, [shown, sel, narrow]);

  // Fil ouvert = lu (sur ce poste)
  const cur = threads.find(t => t.pj === sel);
  const curLast = cur && cur.last && cur.last.date;
  useEffect(() => {
    if (!sel) return;
    setLastSeen(prev => { const next = { ...prev, [sel]: new Date().toISOString() }; lsSet(seenKey, JSON.stringify(next)); return next; });
  }, [sel, curLast, seenKey]);

  const pick = pj => { setSel(pj); if (narrow) setShowList(false); };
  const listCol = (<section aria-label="Machines" style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid " + T.line }}>
      <Segmented label="Filtrer les fils" value={eff} onChange={setFilter} options={[
        ["at", <span key="a">À répondre <Count n={n.at} bad /></span>],
        ["mine", <span key="m">Mes PJ <Count n={n.mine} /></span>],
        ...(seeAll ? [["all", <span key="t">Tous <Count n={n.all} /></span>]] : [])]} />
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un PJ, un client, un texte…" aria-label="Rechercher un fil"
        style={{ width: "100%", boxSizing: "border-box", minHeight: 32, padding: "0 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font }} />
    </div>
    <div style={{ overflowY: "auto", flex: 1 }}>
      {shown.map(t => { const m = metaOf[t.pj] || {}, on = t.pj === sel;
        return <button key={t.pj} type="button" onClick={() => pick(t.pj)} aria-current={on ? "true" : undefined} className="e-hov" data-on={on ? "1" : "0"}
          style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "2px 8px", alignItems: "center", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: "1px solid " + T.line, borderLeft: "3px solid " + (on ? T.accent : "transparent"), background: on ? T.surfaceAlt : "transparent", cursor: "pointer", fontFamily: T.font, color: T.ink900, "--e-hov-bg": T.surface }}>
          <PjPlate pj={t.pj} />
          <span style={{ fontSize: FZ.sm, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nomProjet || ""}</span>
          <span style={{ fontSize: FZ.xs, color: T.ink500, whiteSpace: "nowrap" }}>{t.last ? relTime(t.last.date) : ""}</span>
          <span style={{ gridColumn: "1 / -1", fontSize: FZ.xs, color: T.ink500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.last ? (t.last.author || "—") + " : " + t.last.text : "Aucun commentaire"}</span>
          {(t.atMe > 0 || t.newN > 0 || (t.priv && seePrivate)) && <span style={{ gridColumn: "1 / -1", display: "flex", gap: 4, flexWrap: "wrap" }}>
            {t.atMe > 0 && <Pill tone="violet">@ vous</Pill>}
            {t.newN > 0 && <Pill tone="info">{t.newN} nouveau{t.newN > 1 ? "x" : ""}</Pill>}
            {t.priv && seePrivate && <Pill tone="warn">privé</Pill>}
          </span>}
        </button>; })}
      {!shown.length && <div role="status" style={{ padding: 16, fontSize: FZ.sm, color: T.ink500 }}>
        {eff === "at" ? "Personne ne vous attend : aucune demande ouverte." : search ? "Aucun fil ne correspond à la recherche." : "Aucune machine à afficher."}</div>}
    </div>
  </section>);

  const thread = sel ? <Thread key={sel} pj={sel} meta={metaOf[sel] || {}} list={(comments || {})[sel] || []} seePrivate={seePrivate} pinOk={pinOk} me={me}
    data={data} myPjs={myPjs} seeAll={seeAll} authorName={authorName} addComment={addComment} addCommentMulti={addCommentMulti} deleteComment={deleteComment}
    resolveComment={resolveComment} openPj={openPj} onBack={narrow ? () => setShowList(true) : null} /> :
    <div style={{ display: "grid", placeItems: "center", color: T.ink500, fontSize: FZ.sm, background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: 24 }}>Choisissez une machine.</div>;

  return (<div style={{ fontFamily: T.font, display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: FZ.sm, color: T.ink500 }}>{seeAll ? "Toutes les machines, et en premier les fils où l'on vous attend." : "Vos PJ et les fils où l'on vous cite."}</span>
      {pinOk && <button type="button" aria-pressed={hidePrivate} onClick={() => { const v = !hidePrivate; setHidePrivate(v); lsSet("enogia_cmtHidePrivate", v ? "1" : "0"); }} title="Pour un partage d'écran"
        style={{ marginLeft: "auto", minHeight: 28, padding: "0 10px", borderRadius: 8, border: "1px solid " + (hidePrivate ? T.amber500 : T.line), background: hidePrivate ? T.amber100 : "transparent", color: hidePrivate ? T.amber600 : T.ink500, fontSize: FZ.xs, fontWeight: 500, cursor: "pointer", fontFamily: T.font }}>{hidePrivate ? "Privés masqués" : "Masquer les privés"}</button>}
    </div>
    {narrow ? (showList || !sel ? listCol : thread) :
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)", gap: 12, height: "calc(100dvh - 210px)", minHeight: 480 }}>{listCol}{thread}</div>}
  </div>);
}

function Count({ n, bad }) {
  return <span style={{ marginLeft: 4, fontVariantNumeric: "tabular-nums", color: bad && n ? T.red600 : T.ink500 }}>{n}</span>;
}

function Thread({ pj, meta, list, seePrivate, pinOk, me, data, myPjs, seeAll, authorName, addComment, addCommentMulti, deleteComment, resolveComment, openPj, onBack }) {
  const mctx = useMentions();
  const [text, setText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [sendTo, setSendTo] = useState(new Set());
  const [sendOpen, setSendOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const items = useMemo(() => list.map((c, idx) => ({ c, idx })).filter(x => x.c && (seePrivate || !x.c.private)).sort((a, b) => String(a.c.date || "").localeCompare(String(b.c.date || ""))), [list, seePrivate]);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: "end" }); }, [items.length]);
  const chef = (meta.chefProjet || "").trim();
  const others = [...sendTo].filter(p => p !== pj);
  const nameOf = e => ((mctx.options || []).find(o => o.email === e) || {}).name || undefined;
  const pickData = useMemo(() => { if (seeAll) return data || []; const s = new Set(myPjs || []); return (data || []).filter(r => s.has(r.pj)); }, [data, myPjs, seeAll]);

  const send = async () => {
    if (!text.trim() || !authorName || busy) return;
    setBusy(true);
    const tagged = typedMentions(text, mctx.options).map(o => o.email);
    const ok = others.length ? await addCommentMulti([pj, ...others], authorName, text, null, isPrivate, tagged) : await addComment(pj, authorName, text, null, isPrivate, tagged);
    setBusy(false);
    if (ok) { setText(""); setIsPrivate(false); setSendTo(new Set()); setSendOpen(false); }
  };
  const reply = c => {
    const o = (mctx.options || []).find(x => lc(x.name) === lc(c.author));
    const tag = o ? "@" + firstNameOf(o) + " " : "";
    setText(t => (t.startsWith(tag) ? t : tag + t));
    setTimeout(() => { const el = document.querySelector("#enogia-cmt-compose textarea"); if (el) el.focus(); }, 0);
  };
  const del = async idx => { if (await askConfirm({ title: "Supprimer ce commentaire ?", message: "Il disparaît pour tout le monde.", confirmLabel: "Supprimer", danger: true })) deleteComment(pj, idx); };

  let lastDay = "";
  return (<section aria-label={"Fil de " + pj} style={{ display: "flex", flexDirection: "column", minHeight: 0, background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
    <header style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 14px", borderBottom: "1px solid " + T.line }}>
      {onBack && <Btn size="sm" onClick={onBack} aria-label="Retour à la liste">← Liste</Btn>}
      <PjPlate pj={pj} />
      <h2 style={{ margin: 0, fontSize: FZ.lg, fontWeight: 600, fontFamily: T.fontDisplay, color: T.ink900, minWidth: 0 }}>{meta.nomProjet || pj}</h2>
      {chef && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>CdP {chef}</span>}
      <span style={{ flex: 1 }} />
      {openPj && <Btn size="sm" onClick={() => openPj(pj)}>Ouvrir la fiche</Btn>}
    </header>
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
      {!items.length && <div role="status" style={{ color: T.ink500, fontSize: FZ.sm, padding: "24px 0", textAlign: "center" }}>Pas encore de commentaire sur {pj}. Écrivez le premier ci-dessous ; @ pour citer quelqu'un.</div>}
      {items.map(({ c, idx }) => {
        const d = dayLabel(c.date), sep = d !== lastDay; lastDay = d;
        const grp = Array.isArray(c.groupPjs) ? c.groupPjs.filter(p => p !== pj) : [];
        return <React.Fragment key={idx}>
          {sep && <div style={{ alignSelf: "center", fontSize: FZ.xs, color: T.ink500, fontWeight: 500, padding: "2px 10px", borderRadius: 999, background: T.surfaceAlt }}>{d}</div>}
          <article style={{ display: "flex", gap: 10, padding: c.private ? "8px 10px" : 0, borderRadius: 12, background: c.private ? T.amber100 : "transparent" }}>
            <Avatar name={c.author} tint={c.private ? T.amber500 : T.teal500} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: FZ.sm, color: T.ink900 }}>{c.author || "—"}</b>
                <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{hm(c.date)}</span>
                {c.private && <Pill tone="warn">privé</Pill>}
                {grp.length > 0 && <Pill tone="neutral" title={"Aussi envoyé à " + grp.join(", ")}>aussi sur {grp.length > 2 ? grp.slice(0, 2).join(", ") + " +" + (grp.length - 2) : grp.join(", ")}</Pill>}
              </div>
              <div data-no-i18n="1" style={{ fontSize: FZ.sm, color: T.ink900, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", marginTop: 2 }}>{c.text}</div>
              {c.linkedDate && <div style={{ marginTop: 4, fontSize: FZ.xs, color: T.ink500 }}>Lié au {fmt(new Date(c.linkedDate))}</div>}
              <CommentMarks c={c} pj={pj} idx={idx} me={me} nameOf={nameOf} resolveComment={resolveComment} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Reactions c={c} pj={pj} idx={idx} />
                <button type="button" onClick={() => reply(c)} className="e-hov-ink" style={{ marginTop: 6, minHeight: 26, padding: "0 8px", border: "none", background: "transparent", color: T.ink500, fontSize: FZ.xs, fontWeight: 500, cursor: "pointer", fontFamily: T.font, "--e-hov-ink": T.ink900 }}>Répondre</button>
                {pinOk && <button type="button" onClick={() => del(idx)} aria-label="Supprimer ce commentaire" title="Supprimer" className="e-hov-ink" style={{ marginTop: 6, minHeight: 26, minWidth: 26, border: "none", background: "transparent", color: T.ink300, cursor: "pointer", "--e-hov-ink": T.red600 }}><NavIcon name="close" size={12} /></button>}
              </div>
            </div>
          </article>
        </React.Fragment>; })}
      <div ref={endRef} />
    </div>
    <div id="enogia-cmt-compose" style={{ borderTop: "1px solid " + T.line, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      {sendOpen && <div style={{ border: "1px solid " + T.line, borderRadius: 12, padding: 10, background: T.surface }}>
        <div style={{ fontSize: FZ.xs, color: T.ink500, marginBottom: 6 }}>Envoyer aussi ce message à :</div>
        <PjChecklist data={pickData.filter(r => r.pj !== pj)} selected={sendTo} onChange={setSendTo} maxHeight={180} />
      </div>}
      <MentionTextarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder="Écrire un commentaire… @ pour citer quelqu'un (Entrée pour envoyer)" aria-label={"Nouveau commentaire sur " + pj} rows={2} maxLength={1000}
        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, resize: "vertical" }} />
      <MentionPicker text={text} pjs={[pj, ...others]} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {pinOk && <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink500, cursor: "pointer" }}><input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} /> Privé (direction et admins)</label>}
        <Btn size="sm" aria-expanded={sendOpen} onClick={() => setSendOpen(v => !v)}>{others.length ? "Envoyer à " + (others.length + 1) + " PJ" : "Envoyer à…"}</Btn>
        <span style={{ flex: 1 }} />
        {!authorName && <span style={{ fontSize: FZ.xs, color: T.red600 }}>Connectez-vous pour écrire.</span>}
        <Btn v="pri" size="sm" disabled={!text.trim() || !authorName || busy} onClick={send}>Envoyer</Btn>
      </div>
    </div>
  </section>);
}
