// v374 (piste G validée : « Oui, code G ») — Cash in › Fiche du lundi : la synthèse hebdomadaire du Cash in est envoyée par le site
// (plus par l'artefact « Cash in PJ »). Cette page montre l'aperçu exact du mail de la semaine (même code que le serveur : src/cashWeekly.js),
// règle les destinataires et l'envoi automatique, permet un test et un envoi immédiat (annulable 10 s), et garde l'historique.
// Données : planning/cashinWeekly (beta_ en bêta) = { on, recipients, ask: { at, by, test, to }, sent: { ask, fin, etat, message, n }, history, last }.
// L'envoi lui-même est fait par la fonction serveur (functions/index.js : cashWeeklyLundi, cashWeeklyDemande*), qui écrit « sent » et « history ».
import React, { useEffect, useMemo, useRef, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { T, FZF as FZ } from "../theme";
import { Btn, Panel, Pill } from "./SharedUI";
import { CASHIN_DOC_REF, CASHIN_WEEKLY_REF } from "../cashinData";
import { todayISO } from "../cashinLink";
import { weeklyReport, mailHtml, curveSvg, subject, cleanRecipients, nextMonday } from "../cashWeekly";

const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) : "—");
const fdt = iso => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? String(iso) : d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }) + ", " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); };
const WAIT_MS = 10000, LATE_MS = 5 * 60 * 1000;

// Écritures par défaut : fusion dans planning/cashinWeekly
const defaultPatch = p => setDoc(CASHIN_WEEKLY_REF(), p, { merge: true });

// Aperçu du mail dans un cadre (pas de script : sandbox), hauteur = contenu
function MailFrame({ html }) {
  const ref = useRef(null), [h, setH] = useState(900);
  const fit = () => { try { const d = ref.current && ref.current.contentDocument; if (d && d.body) setH(Math.max(400, d.body.scrollHeight + 8)); } catch (e) { /* cadre fermé */ } };
  useEffect(() => { const t = setTimeout(fit, 120); return () => clearTimeout(t); }, [html]);
  return <iframe ref={ref} title="Aperçu du mail du lundi" srcDoc={html} sandbox="allow-same-origin" onLoad={fit} style={{ width: "100%", height: h, border: "1px solid " + T.line, borderRadius: 8, background: "#F4F5F7", display: "block" }} />;
}

export function CashInWeekly(props) {
  // Galerie / tests : données fournies ; sinon lecture temps réel des deux documents
  if (props.cashDoc !== undefined) return <WeeklyView {...props} />;
  return <WeeklyLive {...props} />;
}
function WeeklyLive(props) {
  const [cash, setCash] = useState(null), [weekly, setWeekly] = useState(null), [err, setErr] = useState("");
  useEffect(() => onSnapshot(CASHIN_DOC_REF(), s => setCash(s.exists() ? s.data() : {}), e => setErr("Lecture du Cash in impossible : " + (e && e.message))), []);
  useEffect(() => onSnapshot(CASHIN_WEEKLY_REF(), s => setWeekly(s.exists() ? s.data() : {}), e => setErr(e && e.code === "permission-denied" ? "Lecture refusée par les règles Firestore : publiez les règles de la V374 (document « cashinWeekly »)." : "Lecture impossible : " + (e && e.message))), []);
  if (err) return <div role="alert" style={{ padding: "8px 12px", borderRadius: 8, background: T.red100, color: T.red600, fontWeight: 600, fontSize: FZ.sm }}>{err}</div>;
  if (!cash || !weekly) return <div style={{ color: T.ink500, fontSize: FZ.sm }}>Chargement…</div>;
  return <WeeklyView {...props} cashDoc={cash} weekly={weekly} />;
}

function WeeklyView({ cashDoc, weekly, onPatch = defaultPatch, me = {}, canEdit, today = todayISO(), appUrl = "" }) {
  const w = weekly || {}, rec = cleanRecipients(w.recipients);
  const rep = useMemo(() => weeklyReport(cashDoc || {}, today, w.last), [cashDoc, today, w.last]);
  const html = useMemo(() => mailHtml(rep, { img: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(curveSvg(rep)), appUrl }), [rep, appUrl]);
  const [draft, setDraft] = useState(""), [hint, setHint] = useState(""), [busy, setBusy] = useState(false), [toast, setToast] = useState(null), [now, setNow] = useState(Date.now());
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const save = async (p, okText) => { setBusy(true); try { await onPatch(p); if (okText) setToast({ text: okText }); } catch (e) { setToast({ text: "Enregistrement impossible : " + (e && e.message), bad: true }); } finally { setBusy(false); } };
  const add = () => {
    const list = draft.split(/[\s,;]+/).filter(Boolean), ok = cleanRecipients(list), bad = list.filter(s => !ok.includes(s.trim().toLowerCase()));
    if (bad.length) { setHint("Adresse refusée : " + bad.join(", ") + " (seules les adresses @enogia.com sont acceptées)"); return; }
    if (!ok.length) return; setHint(""); setDraft("");
    save({ recipients: cleanRecipients([...rec, ...ok]), at: new Date().toISOString(), by: me.name || "" });
  };
  const remove = e => { const prev = rec; save({ recipients: rec.filter(x => x !== e) }); setToast({ text: e + " retiré", undo: () => onPatch({ recipients: prev }) }); };
  const ask = (test) => onPatch({ ask: { at: new Date().toISOString(), by: me.name || "", test: !!test, to: test ? [me.email] : rec } });
  const sendNow = () => { // 10 s pour se raviser avant que la demande parte
    clearTimeout(timer.current);
    setToast({ text: "Envoi à " + rec.length + " destinataire" + (rec.length > 1 ? "s" : "") + " dans 10 s", undo: () => clearTimeout(timer.current), sticky: true });
    timer.current = setTimeout(() => { setToast(null); ask(false).then(() => setToast({ text: "Demande d'envoi transmise au serveur" }), e => setToast({ text: "Demande impossible : " + (e && e.message), bad: true })); }, WAIT_MS);
  };
  const sendTest = () => { if (!me.email) return; ask(true).then(() => setToast({ text: "Test demandé : il arrivera à " + me.email }), e => setToast({ text: "Demande impossible : " + (e && e.message), bad: true })); };
  useEffect(() => { if (!toast || toast.sticky) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  // État de la dernière demande
  const a = w.ask, s = w.sent || {};
  const pending = !!(a && a.at && s.ask !== a.at), stale = pending && now - Date.parse(a.at) > LATE_MS;
  const nm = nextMonday(today, new Date(now).getHours() >= 7), hist = Array.isArray(w.history) ? w.history.slice().reverse().slice(0, 10) : [];

  const field = { flex: 1, minWidth: 180, minHeight: 34, padding: "0 10px", borderRadius: 8, border: "1px solid " + T.fieldLine, background: T.card, color: T.ink900, fontFamily: T.font, fontSize: 14 };
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: T.ink500 }}>Synthèse du Cash in envoyée par mail, avec un PDF de 3 pages : l'année, le mois en cours, le mois qui arrive</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.ink900, marginTop: 2 }}>{w.on ? <>Prochain envoi : lundi {fd(nm)} à 7 h · {rec.length} destinataire{rec.length > 1 ? "s" : ""}</> : "Envoi automatique arrêté"}</div>
      </div>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: T.ink900, cursor: canEdit ? "pointer" : "default", minHeight: 34 }}>
        <input type="checkbox" checked={!!w.on} disabled={!canEdit || busy} onChange={e => save({ on: e.target.checked }, e.target.checked ? "Envoi automatique activé : chaque lundi à 7 h" : "Envoi automatique arrêté")} style={{ width: 18, height: 18 }} />
        Envoi automatique chaque lundi à 7 h
      </label>
    </div>

    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      <Panel style={{ flex: "1 1 560px" }} level={2} title={"Aperçu de la semaine " + rep.week.w}>
        <div style={{ fontSize: 13, color: T.ink700, marginTop: -4 }}><span style={{ color: T.ink500 }}>Objet : </span>{subject(rep)}</div>
        <MailFrame html={html} />
      </Panel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, flex: "1 1 300px" }}>
        <Panel level={2} title="Destinataires" right={<span style={{ fontSize: 12, color: T.ink500 }}>{rec.length}</span>}>
          {rec.length ? <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {rec.map(e => <li key={e} style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid " + T.line, background: T.surfaceAlt, borderRadius: 999, padding: "2px 4px 2px 10px", fontSize: 13, color: T.ink900, maxWidth: "100%" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e}</span>
              {canEdit && <button type="button" onClick={() => remove(e)} aria-label={"Retirer " + e} style={{ width: 24, height: 24, border: "none", borderRadius: 999, background: "transparent", color: T.ink500, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>}
            </li>)}
          </ul> : <div style={{ fontSize: 13, color: T.ink500 }}>Personne pour l'instant : ajoutez au moins une adresse pour que le mail parte.</div>}
          {canEdit && <form onSubmit={e => { e.preventDefault(); add(); }} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label htmlFor="enogia-weekly-add" className="enogia-sr">Ajouter un destinataire</label>
            <input id="enogia-weekly-add" type="email" value={draft} onChange={e => { setDraft(e.target.value); setHint(""); }} placeholder="prenom.nom@enogia.com" autoComplete="email" style={field} aria-describedby={hint ? "enogia-weekly-hint" : undefined} />
            <Btn type="submit" v="sec" disabled={!draft.trim() || busy}>Ajouter</Btn>
          </form>}
          {hint && <div id="enogia-weekly-hint" role="alert" style={{ fontSize: 12, color: T.red600 }}>{hint}</div>}
        </Panel>

        <Panel level={2} title="Envoyer">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn v="sec" onClick={sendTest} disabled={!canEdit || !me.email || pending}>M'envoyer un test</Btn>
            <Btn v="pri" onClick={sendNow} disabled={!canEdit || !rec.length || pending || (toast && toast.sticky)}>Envoyer maintenant à {rec.length}</Btn>
          </div>
          <div aria-live="polite" style={{ fontSize: 13, color: T.ink700 }}>
            {pending ? (stale ? <span style={{ color: T.red600 }}>Demande du {fdt(a.at)} restée sans réponse du serveur : la fonction d'envoi est-elle déployée, avec ses secrets ?</span> : <>Envoi en cours ({a.test ? "test" : rec.length + " destinataires"})…</>)
              : s.fin ? <>Dernier envoi : {fdt(s.fin)} · {s.etat === "ok" ? <Pill tone="ok">envoyé</Pill> : <Pill tone="bad">erreur</Pill>} {s.message ? <span style={{ color: s.etat === "ok" ? T.ink500 : T.red600 }}>{s.message}</span> : null}</> : "Aucun envoi pour l'instant."}
          </div>
          <div style={{ fontSize: 12, color: T.ink500 }}>Le mail part de l'adresse d'envoi du Cockpit. Le PDF joint et l'image de la courbe sont fabriqués par le serveur au moment de l'envoi, avec les chiffres de cet aperçu.</div>
        </Panel>

        <Panel level={2} title="Derniers envois">
          {hist.length ? <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
            {hist.map((h, i) => <tr key={i} style={{ borderLeft: "none" }}><td style={{ padding: "6px 4px 6px 0", borderBottom: "1px solid " + T.line, color: T.ink900, whiteSpace: "nowrap" }}>{fdt(h.at)}</td>
              <td style={{ padding: "6px 4px", borderBottom: "1px solid " + T.line, color: T.ink500 }}>{h.kind === "test" ? "Test" : h.kind === "auto" ? "Lundi" : "Envoi manuel"} · {h.n} destinataire{h.n > 1 ? "s" : ""}</td>
              <td style={{ padding: "6px 0 6px 4px", borderBottom: "1px solid " + T.line, textAlign: "right" }}>{h.ok ? <Pill tone="ok">envoyé</Pill> : <Pill tone="bad" title={h.err || ""}>erreur</Pill>}</td></tr>)}
          </tbody></table> : <div style={{ fontSize: 13, color: T.ink500 }}>Les envois apparaîtront ici.</div>}
        </Panel>
      </div>
    </div>
    {toast && <div role="status" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 1001, display: "flex", alignItems: "center", gap: 12, background: toast.bad ? T.red600 : T.ink900, color: T.card, padding: "10px 14px", borderRadius: 8, fontSize: 14, boxShadow: T.shadowLg, maxWidth: "calc(100vw - 32px)" }}>
      <span>{toast.text}</span>
      {toast.undo && <button type="button" onClick={() => { toast.undo(); setToast({ text: "Annulé" }); }} style={{ background: "none", border: "none", color: T.card, textDecoration: "underline", fontWeight: 600, cursor: "pointer", fontSize: 14, minHeight: 28 }}>Annuler</button>}
    </div>}
  </div>);
}
