// V146 — Manager › Cash in (super admin). La page elle-même est public/cashin.html (reprise de l'artefact « Cash in PJ »),
// affichée dans un cadre ; ce composant fait le pont avec Firestore (planning/cashin) et fournit les couleurs du site.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { T, FZ, R } from "../theme";
import { CashLinksDialog } from "./CashLinks";
import { PlannedDialog } from "./CashInPlanned";
import { todayISO, anchorShifts } from "../cashinLink";
import { applyEdit } from "../cashinModel";
import { CashAnchorsDialog } from "./CashAnchors";
import { CashInEncaissements } from "./CashInEncaissements";
import { CashInWeekly } from "./CashInWeekly";
import { Segmented } from "./SharedUI";
import { useCashin } from "../useCashin";
import { CASHIN_DOC_REF, CASHIN_PAGE_VERSION, CASHIN_MAX_BYTES, cashinTheme, validateCashin, CASHIN_PRODUIT_REF, produitItems } from "../cashinData";

const btn = (primary) => ({ padding: "6px 12px", borderRadius: 8, border: "1px solid " + (primary ? T.teal600 : T.line), background: primary ? T.teal600 : T.card, color: primary ? T.card : T.ink900, fontSize: FZ.sm, fontWeight: 600, cursor: "pointer" });

export function CashInTab({ authorName, focus, planRows, sub = "table", onSub, canEdit, canWeekly, me }) {
  // v257 (demandé : « enlever le Cash in du site ») : le format artefact est le seul Cash in.
  // v369 : sous-page « Encaissements » (saisie des paiements reçus par le DAF) à côté du tableau complet
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {onSub && <div><Segmented label="Vue du Cash in" value={sub} onChange={onSub} options={[["table", "Tableau complet"], ["enc", "Encaissements"], ...(canWeekly ? [["lundi", "Fiche du lundi"]] : [])]} /></div>}
    {sub === "lundi" && canWeekly ? <CashInWeekly me={me} canEdit={canWeekly} appUrl={window.location.origin + window.location.pathname + "?p=cashin"} /> : sub === "enc" ? <CashInEncaissements authorName={authorName} canEdit={canEdit} /> : <CashInLegacy authorName={authorName} focus={focus} planRows={planRows} />}
  </div>);
}
function CashInLegacy({ authorName, focus, planRows }) {
  useCashin(); // v260 : liaisons et jalons liés relus à chaque changement
  const frameRef = useRef(null);
  const latest = useRef({ loaded: false, exists: false, data: null, err: null });
  const readyRef = useRef(false);
  const focusRef = useRef(focus || null); // { pj, n } : PJ à afficher (depuis la fiche projet)
  const lastTheme = useRef("");
  const [info, setInfo] = useState({ loaded: false, exists: false, err: null, count: 0 });
  const [linksOpen, setLinksOpen] = useState(false); // V146.2
  const [planOpen, setPlanOpen] = useState(false); // v256 : « Prévu jusqu'à fin 2026 » aussi dans le format artefact
  const [msg, setMsg] = useState(null); // { kind: "ok" | "err", text }
  const [ancOpen, setAncOpen] = useState(false);
  // v323 : jalons « Produit » recopiés pour l'accueil du responsable produit, seulement quand ils changent
  const lastProd = useRef(null);
  const publishProduit = useCallback(body => { const items = produitItems(body), k = JSON.stringify(items); if (k === lastProd.current) return; lastProd.current = k;
    setDoc(CASHIN_PRODUIT_REF(), { items, at: new Date().toISOString(), by: authorName || "" }).catch(e => { lastProd.current = null; console.warn("Jalons Produit non publiés :", e && e.message); }); }, [authorName]);
  // v260 : jalons liés au planning dont la facturation prévue ne suit plus les dates → bandeau « Mettre à jour »
  const shifts = info.exists ? anchorShifts(planRows || [], latest.current.data) : [];
  const applyShifts = async () => {
    const d = latest.current.data; if (!d || !Array.isArray(d.rows)) return;
    const by = {}; shifts.forEach(s => { by[s.row.id] = s.to; });
    const rows = d.rows.map(r => (by[r.id] ? applyEdit(r, "factPrevue", by[r.id]).row : r));
    try { const body = { ...d, rows, updatedAt: new Date().toISOString() }; const err = validateCashin(body); if (err) throw new Error(err); await setDoc(CASHIN_DOC_REF(), { ...body, updatedBy: authorName || "" }); publishProduit(body); setMsg({ kind: "ok", text: shifts.length + " date" + (shifts.length > 1 ? "s" : "") + " de facturation mise" + (shifts.length > 1 ? "s" : "") + " à jour d'après le planning." }); }
    catch (er) { setMsg({ kind: "err", text: "Mise à jour impossible : " + (er && er.message) }); }
  };

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
      if (m.type === "planned") { setPlanOpen(true); return; } // v257 : bouton « Prévu jusqu’à fin 2026 » du cadran « À traiter » de la page
      if (m.type === "ready") { readyRef.current = true; sendTheme(true); sendState(); if (focusRef.current) post({ type: "goto", pj: focusRef.current.pj }); return; }
      if (m.type === "save") {
        try {
          const err = validateCashin(m.body);
          if (err) throw new Error(err);
          if (JSON.stringify(m.body).length > CASHIN_MAX_BYTES) throw new Error("document trop gros");
          await setDoc(CASHIN_DOC_REF(), { ...m.body, updatedBy: authorName || "" });
          post({ type: "ack", id: m.id, ok: true });
          publishProduit(m.body);
        } catch (er) {
          console.error("Cash in : écriture refusée", er);
          post({ type: "ack", id: m.id, ok: false, error: String((er && er.message) || er) });
          setMsg({ kind: "err", text: er && er.code === "permission-denied" ? "Écriture refusée par les règles Firestore : ajoutez le document « cashin » (voir DEPLOIEMENT.md, v146)." : "Enregistrement impossible : " + (er && er.message) });
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [authorName, post, sendState, sendTheme, publishProduit]);

  useEffect(() => { focusRef.current = focus || null; if (focus && readyRef.current) post({ type: "goto", pj: focus.pj }); }, [focus, post]);

  // Le thème du site (Marine / Forêt / Cuivre, clair / sombre) peut changer : on le renvoie à chaque rendu s'il a bougé.
  useEffect(() => { sendTheme(false); });


  const base = (process.env.PUBLIC_URL || "") + "/cashin.html?v=" + CASHIN_PAGE_VERSION;
  const banner = (bg, fg, children, role) => <div role={role} style={{ padding: "8px 12px", borderRadius: R.md || 8, background: bg, color: fg, fontSize: FZ.sm, fontWeight: 600 }}>{children}</div>;

  return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
      <span />
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn(false)} onClick={() => setAncOpen(true)} disabled={!info.exists} title="Faire suivre à un jalon une date du planning (départ, tests…)">Jalons liés au planning</button>
        <button style={btn(true)} onClick={() => setLinksOpen(true)} disabled={!info.exists} title="Choisir à quel(s) PJ de l'ordo chaque PJ du Cash in se rattache">Liaisons avec l'ordo</button>
      </div>
    </div>
    {info.err && banner(T.red100, T.red600, info.err, "alert")}
    {msg && banner(msg.kind === "ok" ? T.emerald100 : T.red100, msg.kind === "ok" ? T.emerald600 : T.red600, <>{msg.text} <button onClick={() => setMsg(null)} style={{ marginLeft: 8, border: "none", background: "none", color: "inherit", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}>Fermer</button></>, msg.kind === "ok" ? "status" : "alert")}
    {info.loaded && !info.exists && !info.err && banner(T.teal100, T.teal600, <>Aucune donnée Cash in sur ce site pour l'instant</>, "status")}
    {shifts.length > 0 && banner(T.amber100 || T.surfaceAlt, T.ink900, <>{shifts.length} jalon{shifts.length > 1 ? "s" : ""} lié{shifts.length > 1 ? "s" : ""} au planning ne suive{shifts.length > 1 ? "nt" : ""} plus ses dates : {shifts.slice(0, 3).map(s => s.row.pj + " · " + (s.row.jalon || "jalon") + " " + (s.from ? s.from.slice(8, 10) + "/" + s.from.slice(5, 7) : "—") + " → " + s.to.slice(8, 10) + "/" + s.to.slice(5, 7)).join(" ; ")}{shifts.length > 3 ? "…" : ""} <button onClick={applyShifts} style={{ marginLeft: 8, border: "1px solid " + T.ink900, borderRadius: 8, background: T.ink900, color: T.card, padding: "2px 10px", cursor: "pointer", fontWeight: 600 }}>Mettre à jour les dates</button></>, "status")}
    {ancOpen && <CashAnchorsDialog planRows={planRows} authorName={authorName} onClose={() => setAncOpen(false)} />}
    {linksOpen && <CashLinksDialog onClose={() => setLinksOpen(false)} authorName={authorName}/>}
    {planOpen && <PlannedDialog rows={(latest.current.data && latest.current.data.rows) || []} labels={(latest.current.data && latest.current.data.labels) || {}} today={todayISO()} onClose={() => setPlanOpen(false)} onOpenRow={id => { const r = ((latest.current.data && latest.current.data.rows) || []).find(x => x.id === id); setPlanOpen(false); if (r) post({ type: "goto", pj: r.pj }); }} />}
    <iframe ref={frameRef} title="Cash in PJ" src={base} style={{ width: "100%", height: "calc(100dvh - 210px)", minHeight: 560, border: "1px solid " + T.line, borderRadius: 12, background: T.surface }}/>
  </div>);
}
