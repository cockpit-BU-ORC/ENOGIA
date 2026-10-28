// V146 — Manager › Cash in (super admin). La page elle-même est public/cashin.html (reprise de l'artefact « Cash in PJ »),
// affichée dans un cadre ; ce composant fait le pont avec Firestore (planning/cashin) et fournit les couleurs du site.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { T, FZ, R } from "../theme";
import { CashLinksDialog } from "./CashLinks";
import { CashInNative } from "./CashInNative";
import { CASHIN_DOC_REF, CASHIN_PAGE_VERSION, CASHIN_MAX_BYTES, cashinTheme, validateCashin } from "../cashinData";

const btn = (primary) => ({ padding: "6px 12px", borderRadius: 8, border: "1px solid " + (primary ? T.teal600 : T.line), background: primary ? T.teal600 : T.card, color: primary ? T.card : T.ink900, fontSize: FZ.sm, fontWeight: 600, cursor: "pointer" });

// v193 : l'onglet affiche la version intégrée (CashInNative) ; l'ancienne page en cadre reste accessible le temps de comparer.
export function CashInTab({ authorName, focus }) {
  // v195 (demandé : « reprendre le même format que la version artefact ») : le format de l'artefact est affiché par défaut ; « Nouvelle version » reste à un clic.
  const [legacy, setLegacy] = useState(() => { try { return localStorage.getItem("enogia_cashin_format") === "artefact"; } catch (e) { return false; } }); // v198 : le format artefact est reconstruit dans le site, affiché par défaut
  const pick = v => { setLegacy(v); try { localStorage.setItem("enogia_cashin_format", v ? "artefact" : "nouveau"); } catch (e) {} };
  return legacy ? <CashInLegacy authorName={authorName} focus={focus} onNative={() => pick(false)} /> : <CashInNative authorName={authorName} focus={focus} onLegacy={() => pick(true)} />;
}
function CashInLegacy({ authorName, focus, onNative }) {
  const frameRef = useRef(null);
  const latest = useRef({ loaded: false, exists: false, data: null, err: null });
  const readyRef = useRef(false);
  const focusRef = useRef(focus || null); // { pj, n } : PJ à afficher (depuis la fiche projet)
  const lastTheme = useRef("");
  const [info, setInfo] = useState({ loaded: false, exists: false, err: null, count: 0 });
  const [linksOpen, setLinksOpen] = useState(false); // V146.2
  const [msg, setMsg] = useState(null); // { kind: "ok" | "err", text }

  const post = useCallback((m) => {
    const w = frameRef.current && frameRef.current.contentWindow;
    if (w) w.postMessage({ src: "cashin-host", ...m }, window.location.origin);
  }, []);
  const sendState = useCallback(() => {
    const s = latest.current;
    if (!readyRef.current || !s.loaded) return;
    if (s.err) post({ type: "error", error: s.err }); else post({ type: "state", exists: s.exists, data: s.data });
  }, [post]);
  const sendTheme = useCallback((force) => {
    if (!readyRef.current) return;
    const th = cashinTheme(), key = JSON.stringify(th);
    if (!force && key === lastTheme.current) return;
    lastTheme.current = key; post({ type: "theme", ...th });
  }, [post]);

  // Lecture temps réel du document. Les écritures de cette page sont déjà dans le cadre : on ne lui renvoie que ce qui vient du serveur.
  useEffect(() => {
    const unsub = onSnapshot(CASHIN_DOC_REF(), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      latest.current = { loaded: true, exists: snap.exists(), data, err: null };
      setInfo({ loaded: true, exists: snap.exists(), err: null, count: data && Array.isArray(data.rows) ? data.rows.length : 0 });
      if (!snap.metadata.hasPendingWrites) sendState();
    }, (err) => {
      console.error("Erreur Firestore (cashin):", err);
      const text = err && err.code === "permission-denied" ? "Lecture refusée par les règles Firestore : ajoutez le document « cashin » (voir DEPLOIEMENT.md, v146)." : "Lecture impossible : " + (err && err.message);
      latest.current = { loaded: true, exists: false, data: null, err: text };
      setInfo({ loaded: true, exists: false, err: text, count: 0 });
      sendState();
    });
    return () => unsub();
  }, [sendState]);

  // Messages venant de la page (même origine uniquement)
  useEffect(() => {
    const onMsg = async (e) => {
      if (e.origin !== window.location.origin) return;
      const w = frameRef.current && frameRef.current.contentWindow;
      if (!w || e.source !== w) return;
      const m = e.data;
      if (!m || m.src !== "cashin") return;
      if (m.type === "ready") { readyRef.current = true; sendTheme(true); sendState(); if (focusRef.current) post({ type: "goto", pj: focusRef.current.pj }); return; }
      if (m.type === "save") {
        try {
          const err = validateCashin(m.body);
          if (err) throw new Error(err);
          if (JSON.stringify(m.body).length > CASHIN_MAX_BYTES) throw new Error("document trop gros");
          await setDoc(CASHIN_DOC_REF(), { ...m.body, updatedBy: authorName || "" });
          post({ type: "ack", id: m.id, ok: true });
        } catch (er) {
          console.error("Cash in : écriture refusée", er);
          post({ type: "ack", id: m.id, ok: false, error: String((er && er.message) || er) });
          setMsg({ kind: "err", text: er && er.code === "permission-denied" ? "Écriture refusée par les règles Firestore : ajoutez le document « cashin » (voir DEPLOIEMENT.md, v146)." : "Enregistrement impossible : " + (er && er.message) });
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [authorName, post, sendState, sendTheme]);

  useEffect(() => { focusRef.current = focus || null; if (focus && readyRef.current) post({ type: "goto", pj: focus.pj }); }, [focus, post]);

  // Le thème du site (Marine / Forêt / Cuivre, clair / sombre) peut changer : on le renvoie à chaque rendu s'il a bougé.
  useEffect(() => { sendTheme(false); });


  const base = (process.env.PUBLIC_URL || "") + "/cashin.html?v=" + CASHIN_PAGE_VERSION;
  const banner = (bg, fg, children, role) => <div role={role} style={{ padding: "8px 12px", borderRadius: R.md || 8, background: bg, color: fg, fontSize: FZ.sm, fontWeight: 600 }}>{children}</div>;

  return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
      <span />
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn(false)} onClick={onNative} title="Revenir au Cash in du site">Cash in du site</button>
        <button style={btn(true)} onClick={() => setLinksOpen(true)} disabled={!info.exists} title="Choisir à quel(s) PJ de l'ordo chaque PJ du Cash in se rattache">Liaisons avec l'ordo</button>
      </div>
    </div>
    {info.err && banner(T.red100, T.red600, info.err, "alert")}
    {msg && banner(msg.kind === "ok" ? T.emerald100 : T.red100, msg.kind === "ok" ? T.emerald600 : T.red600, <>{msg.text} <button onClick={() => setMsg(null)} style={{ marginLeft: 8, border: "none", background: "none", color: "inherit", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}>Fermer</button></>, msg.kind === "ok" ? "status" : "alert")}
    {info.loaded && !info.exists && !info.err && banner(T.teal100, T.teal600, <>Aucune donnée Cash in sur ce site pour l'instant.</>, "status")}
    {linksOpen && <CashLinksDialog onClose={() => setLinksOpen(false)} authorName={authorName}/>}
    <iframe ref={frameRef} title="Cash in PJ" src={base} style={{ width: "100%", height: "calc(100dvh - 210px)", minHeight: 560, border: "1px solid " + T.line, borderRadius: 12, background: T.surface }}/>
  </div>);
}
