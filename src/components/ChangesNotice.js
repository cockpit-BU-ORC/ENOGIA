import React, { useState, useEffect, useMemo, useCallback, useRef, useContext, createContext } from "react";
import { T, FZ } from "../theme";
import { NavIcon } from "./SharedUI";

// ── Notification des modifications du planning (v135) ──────────────────────────────────────────────────────────
// Chaque import / publication est déjà enregistré dans le journal (« Modifications »). Ici on retient, PAR PERSONNE ET PAR POSTE
// (localStorage, jamais envoyé à Firebase), la dernière version déjà vue : tout ce qui est plus récent est « non vu ».
//   • une pastille avec le nombre de nouveautés sur l'icône « Modifications » ;
//   • un message à la connexion qui résume ce qui a bougé et renvoie vers l'onglet ;
//   • la pastille disparaît (et la version est marquée « vue ») dès que la personne ouvre l'onglet « Modifications ».
const KEY = u => "enogia_changesSeen_" + String(u || "anon").toLowerCase();
const read = u => { try { return localStorage.getItem(KEY(u)) || null; } catch (e) { return null; } };
const write = (u, v) => { try { localStorage.setItem(KEY(u), v); } catch (e) { /* stockage indisponible : la pastille reviendra à la prochaine visite */ } };

export function useUnseenChanges(entries, userKey) {
  const [seen, setSeen] = useState(() => read(userKey));
  useEffect(() => { setSeen(read(userKey)); }, [userKey]);
  const unseen = useMemo(() => {
    if (!Array.isArray(entries) || !entries.length) return [];
    if (seen) return entries.filter(e => e.at > seen);
    // première visite sur ce poste : seulement la dernière version, si elle est récente (14 jours)
    return (Date.now() - new Date(entries[0].at).getTime()) / 86400000 <= 14 ? [entries[0]] : [];
  }, [entries, seen]);
  const markSeen = useCallback(() => {
    const at = Array.isArray(entries) && entries[0] && entries[0].at; if (!at) return;
    write(userKey, at); setSeen(at);
  }, [entries, userKey]);
  return { unseen, markSeen };
}

// ── v146.8 : repères « modifié » sur les PJ touchés par les imports récents ───────────────────────────────────
// Le message de mise à jour se ferme ; les repères restent dans la Liste et le Calendrier jusqu'à « Tout marquer comme vu »
// (ou 14 jours). Mémorisés par personne et par poste, comme le reste.
const MKEY = u => "enogia_changesMarks_" + String(u || "anon").toLowerCase();
const readM = u => { try { return localStorage.getItem(MKEY(u)) || null; } catch (e) { return null; } };
export const ChangeMarksContext = createContext({ marks: new Map(), clear: () => {} });
export const useMarks = () => useContext(ChangeMarksContext);
export function useChangeMarks(entries, userKey) {
  const [cleared, setCleared] = useState(() => readM(userKey));
  useEffect(() => { setCleared(readM(userKey)); }, [userKey]);
  const marks = useMemo(() => {
    const m = new Map();
    if (!Array.isArray(entries)) return m;
    const limit = Date.now() - 14 * 864e5;
    entries.forEach(e => {
      if (new Date(e.at).getTime() < limit || (cleared && e.at <= cleared)) return;
      (e.pjs || []).forEach(p => { if (!m.has(p.pj)) m.set(p.pj, { isNew: !!p.isNew, delta: p.departDelta || 0, at: e.at }); });
    });
    return m;
  }, [entries, cleared]);
  const clear = useCallback(() => {
    const at = Array.isArray(entries) && entries[0] && entries[0].at; if (!at) return;
    try { localStorage.setItem(MKEY(userKey), at); } catch (e) { /* tant pis : les repères reviendront */ }
    setCleared(at);
  }, [entries, userKey]);
  return useMemo(() => ({ marks, clear }), [marks, clear]);
}
// Petite étiquette à côté du N° de PJ : « nouveau », « +5 j » (départ repoussé), « −3 j » (avancé) ou « modifié ».
export function NewMark({ mark }) {
  if (!mark) return null;
  const d = mark.delta, late = d > 0, early = d < 0;
  const text = mark.isNew ? "nouveau" : late ? "+" + d + " j" : early ? "−" + Math.abs(d) + " j" : "modifié";
  const [bg, fg] = mark.isNew ? [T.teal100, T.teal600] : late ? [T.red100, T.red500] : early ? [T.emerald100, T.emerald600] : [T.surfaceAlt, T.ink700];
  const title = mark.isNew ? "Nouveau PJ depuis votre dernière visite" : late ? "Départ repoussé de " + d + " j par la dernière mise à jour" : early ? "Départ avancé de " + Math.abs(d) + " j par la dernière mise à jour" : "Modifié par la dernière mise à jour";
  return <span title={title} aria-label={title} style={{ background: bg, color: fg, borderRadius: 999, padding: "0 6px", fontSize:11, lineHeight: "16px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{text}</span>;
}

const fmtAt = at => new Date(at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const plural = (n, s, p) => n + " " + (n > 1 ? (p || s + "s") : s);

function Chip({ children, tone }) {
  const map = { red: [T.red100, T.red500], green: [T.emerald100, T.emerald600], blue: [T.teal100, T.teal600], gray: [T.surfaceAlt, T.ink700] };
  const [bg, fg] = map[tone || "gray"];
  return <span style={{ background: bg, color: fg, borderRadius: 999, padding: "3px 8px", fontSize: FZ.xs, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
}

export function ChangesPopup({ entries, onOpen, onLater, onRead, userName }) {
  const openRef = useRef(null);
  useEffect(() => { if (openRef.current) openRef.current.focus(); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onLater(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [onLater]);
  const shown = entries.slice(0, 3), more = entries.length - shown.length;
  const first = (userName || "").split(/[\s@]/)[0];
  return (<div className="enogia-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onLater(); }} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,25,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: T.font }}>
    <div role="dialog" aria-modal="true" aria-labelledby="chg-title" className="enogia-modal-pop" style={{ background: T.card, color: T.ink900, borderRadius: 16, border: "1px solid " + T.line, boxShadow: T.shadowLg, width: "100%", maxWidth: 520, maxHeight: "86vh", overflowY: "auto", padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span aria-hidden="true" style={{ width: 4, height: 22, borderRadius: 4, background: T.accent }} />
        <h2 id="chg-title" style={{ margin: 0, fontSize: FZ.lg, fontWeight: 700, letterSpacing: "-.01em" }}>Le planning a été mis à jour</h2>
      </div>
      <div style={{ fontSize: FZ.sm, color: T.ink500, margin: "0 0 14px 14px" }}>{first ? "Bonjour " + first + ", d" : "D"}epuis votre dernière visite, {entries.length > 1 ? entries.length + " versions ont été publiées" : "une nouvelle version a été publiée"}.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map(e => {
          const s = e.stats || {};
          const top = (e.pjs || []).filter(p => !p.isNew && p.departDelta > 0).slice(0, 3);
          return (<div key={e.at} style={{ background: T.surface, border: "1px solid " + T.line, borderRadius: 12, padding: "8px 12px" }}>
            <div style={{ fontSize: FZ.sm, fontWeight: 700 }}>{e.source === "publication" ? "Publication" : e.source === "restauration" ? "Restauration" : "Import"} du {fmtAt(e.at)}{e.by ? <span style={{ fontWeight: 400, color: T.ink500 }}> · {e.by}</span> : null}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <Chip tone="blue">{plural(s.nPj || 0, "PJ modifié")}</Chip>
              {s.late > 0 && <Chip tone="red">{plural(s.late, "départ repoussé")}{s.maxLate ? " (jusqu'à +" + s.maxLate + " j)" : ""}</Chip>}
              {s.early > 0 && <Chip tone="green">{plural(s.early, "départ avancé")}{s.maxEarly ? " (jusqu'à −" + s.maxEarly + " j)" : ""}</Chip>}
              {s.nNew > 0 && <Chip>{plural(s.nNew, "PJ ajouté")}</Chip>}
              {s.nRemoved > 0 && <Chip>{plural(s.nRemoved, "PJ retiré")}</Chip>}
            </div>
            {top.length > 0 && <div style={{ marginTop: 8, fontSize: FZ.xs, color: T.ink700, lineHeight: 1.5 }}>
              <span style={{ color: T.ink500 }}>Plus gros décalages : </span>
              {top.map((p, i) => <span key={p.pj}>{i > 0 ? " · " : ""}<b style={{ fontVariantNumeric: "tabular-nums" }}>{p.pj}</b> <span style={{ color: T.red500, fontWeight: 700 }}>+{p.departDelta} j</span></span>)}
            </div>}
          </div>);
        })}
        {more > 0 && <div style={{ fontSize: FZ.xs, color: T.ink500, paddingLeft: 4 }}>… et {plural(more, "version plus ancienne", "versions plus anciennes")}.</div>}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
        <button onClick={onLater} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "8px 12px", fontSize: FZ.sm, fontWeight: 600, cursor: "pointer", fontFamily: T.font, minHeight: 34 }}>Plus tard</button>
        {onRead && <button onClick={onRead} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink900, borderRadius: 8, padding: "8px 12px", fontSize: FZ.sm, fontWeight: 600, cursor: "pointer", fontFamily: T.font, minHeight: 34 }}>J'ai pris connaissance</button>}
        <button ref={openRef} onClick={onOpen} style={{ border: "none", background: T.navy700, color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: FZ.sm, fontWeight: 700, cursor: "pointer", fontFamily: T.font, minHeight: 34 }}>Voir les modifications</button>
      </div>
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 10, textAlign: "right" }}>« Plus tard » : le message reviendra à la prochaine actualisation de la page, tant que vous n'avez pas cliqué sur « Voir les modifications » ou « J'ai pris connaissance ».</div>
    </div>
  </div>);
}

// Pastille posée sur l'icône de l'onglet
export function ChangesBadge({ n }) {
  if (!n) return null;
  return <><span aria-hidden="true" className="enogia-badge-pop" style={{ position: "absolute", bottom: -1, left: -2, fontSize: 12, lineHeight: 0, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.25))", pointerEvents: "none" }}><NavIcon name="bell" size={13} /></span><span aria-hidden="true" className="enogia-badge-pop" style={{ position: "absolute", top: 1, right: 0, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 999, background: T.redFill, color: "#fff", fontSize: 11, fontWeight: 800, lineHeight: "17px", textAlign: "center", boxShadow: "0 0 0 2px " + T.card, boxSizing: "border-box" }}>{n > 9 ? "9+" : n}</span></>;
}
