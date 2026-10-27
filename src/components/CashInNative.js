// ── v193 : Manager › Cash in intégré au site (étape 1 : chiffres, À traiter, Jalons, volet d'édition, import / export) ────────
// Remplace l'affichage de public/cashin.html dans un cadre. Mêmes données (planning/cashin), mêmes règles de calcul (cashinModel.js),
// même enregistrement (document entier, 500 ms après la dernière modification). L'ancienne page reste accessible (« Ancienne page »).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { T, FZF as FZ, statusSoft } from "../theme";
import { NavIcon, notify } from "./SharedUI";
import { CashLinksDialog } from "./CashLinks";
import { CASHIN_DOC_REF, CASHIN_MAX_BYTES, validateCashin, cleanCashin } from "../cashinData";
import { cashOverview, todayISO, STATUS_LABEL } from "../cashinLink";
import { applyEdit, newRow, rowView, toTreat, groupInfo, pjList } from "../cashinModel";
import { fmtEur } from "../pjProgress";

const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(2, 4) : "—");
const btn = primary => ({ padding: "6px 12px", minHeight: 32, borderRadius: 8, border: "1px solid " + (primary ? T.ink900 : T.line), background: primary ? T.ink900 : T.card, color: primary ? T.card : T.ink700, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font, display: "inline-flex", alignItems: "center", gap: 6 });
const field = () => ({ padding: "5px 8px", minHeight: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box", width: "100%" });
const FILTERS = [["all", "Tous"], ["late", "En retard"], ["tobill", "À facturer"], ["invoiced", "Facture émise"], ["future", "À venir"], ["paid", "Payé"]];
const SAVE_TXT = { ok: "Enregistré", dirty: "Modifié", saving: "Enregistrement…", error: "Échec de l'enregistrement" };

export function CashInNative({ authorName, focus, onLegacy }) {
  const [doc, setDocState] = useState(null), [info, setInfo] = useState({ loaded: false, exists: false, err: null });
  const [save, setSave] = useState("ok"), [msg, setMsg] = useState(null), [linksOpen, setLinksOpen] = useState(false);
  const [q, setQ] = useState(""), [filter, setFilter] = useState("all"), [hidePaid, setHidePaid] = useState(true), [hideEpc, setHideEpc] = useState(false);
  const [sel, setSel] = useState(null), [tab, setTab] = useState("jalons"), [folded, setFolded] = useState(() => new Set());
  const dirty = useRef(false), timer = useRef(0), latest = useRef(null), fileRef = useRef(null);
  const today = todayISO();

  useEffect(() => onSnapshot(CASHIN_DOC_REF(), snap => {
    const d = snap.exists() ? cleanCashin(snap.data()) : null;
    setInfo({ loaded: true, exists: snap.exists(), err: null });
    if (!dirty.current && !snap.metadata.hasPendingWrites) { setDocState(d); latest.current = d; }
  }, err => {
    console.error("Erreur Firestore (cashin):", err);
    setInfo({ loaded: true, exists: false, err: err && err.code === "permission-denied" ? "Lecture refusée par les règles Firestore (document « cashin », voir DEPLOIEMENT.md, v146)." : "Lecture impossible : " + (err && err.message) });
  }), []);
  useEffect(() => { if (focus && focus.pj) { setQ(focus.pj); setTab("jalons"); setFilter("all"); setHidePaid(false); } }, [focus]);

  const flush = async () => {
    const cur = latest.current; if (!cur) return;
    const body = { ...cleanCashin(cur), updatedAt: new Date().toISOString() };
    const e = validateCashin(body) || (JSON.stringify(body).length > CASHIN_MAX_BYTES ? "Document trop gros pour Firestore." : null);
    if (e) { setSave("error"); setMsg({ kind: "err", text: e }); return; }
    setSave("saving");
    try { await setDoc(CASHIN_DOC_REF(), { ...body, updatedBy: authorName || "" }); if (latest.current === cur) { dirty.current = false; setSave("ok"); } }
    catch (er) { setSave("error"); setMsg({ kind: "err", text: er && er.code === "permission-denied" ? "Écriture refusée par les règles Firestore (document « cashin »)." : "Enregistrement impossible : " + (er && er.message) }); }
  };
  const flushRef = useRef(flush); flushRef.current = flush;
  useEffect(() => () => { clearTimeout(timer.current); if (dirty.current) flushRef.current(); }, []);
  const commit = next => { latest.current = next; setDocState(next); dirty.current = true; setSave("dirty"); clearTimeout(timer.current); timer.current = setTimeout(() => flushRef.current(), 500); };
  const rows = useMemo(() => (doc && doc.rows) || [], [doc]);
  const editRow = (id, f, v) => {
    const r0 = rows.find(r => r.id === id); if (!r0) return;
    const { row, autoDelai } = applyEdit(r0, f, v, today);
    if (JSON.stringify(row) === JSON.stringify(r0)) return;
    commit({ ...doc, rows: rows.map(r => (r.id === id ? row : r)) });
    if (autoDelai && f !== "delai") notify("Délai de paiement de 30 j appliqué, modifiable dans le volet. Encaissements calculés.");
    else if (f === "encReelle" && v) notify("Jalon payé le " + fd(v));
  };
  const addRow = pj => { const last = rows.reduce((a, r, i) => (r.pj === pj ? i : a), -1); const nr = { ...newRow(pj, ""), delai: last >= 0 && rows[last].delai != null ? rows[last].delai : 30 }; const next = [...rows]; next.splice(last + 1, 0, nr); commit({ ...(doc || { labels: {}, totals: {}, owners: {} }), rows: next }); setSel(nr.id); };
  const addPj = () => { const pj = (window.prompt("Numéro du PJ à ajouter au Cash in (ex. PJ2412) :") || "").trim().toUpperCase(); if (!pj) return; if (rows.some(r => r.pj === pj)) { notify(pj + " est déjà dans le Cash in."); return; } const nr = newRow(pj, "1er Jalon - Advance payment"); commit({ ...(doc || { labels: {}, totals: {}, owners: {} }), rows: [...rows, nr] }); setSel(nr.id); setQ(""); };
  const delRow = id => { commit({ ...doc, rows: rows.filter(r => r.id !== id) }); setSel(null); notify("Jalon supprimé"); };
  const setGroup = (pj, k, v) => { const o = { ...((doc && doc[k]) || {}) }; if (v === "" || v == null || (k === "totals" && !(Number(v) > 0))) delete o[pj]; else o[pj] = k === "totals" ? Number(v) : v; commit({ ...doc, [k]: o }); };

  const ov = useMemo(() => cashOverview(doc, today), [doc, today]);
  const treat = useMemo(() => toTreat(rows, today), [rows, today]);
  const qq = q.trim().toLowerCase();
  const match = r => { if (hideEpc && r.epc) return false; const v = rowView(r, today); if (filter !== "all" && v.st.k !== filter) return false; if (hidePaid && filter === "all" && v.st.k === "paid" && !qq) return false; if (!qq) return true; return [r.pj, r.jalon, r.ref, r.note, doc && doc.labels && doc.labels[r.pj]].some(x => String(x || "").toLowerCase().includes(qq)); };
  const groups = pjList(doc).map(pj => ({ pj, g: groupInfo(doc, pj), list: rows.filter(r => r.pj === pj && match(r)) })).filter(x => x.list.length || (qq && x.pj.toLowerCase().includes(qq)));
  const S = statusSoft();
  const pill = r => { const v = rowView(r, today), k = r.epc ? "epc" : v.tone, c = S[k] || S.future; return <span style={{ fontFamily: T.fontLabel, fontSize: 11, fontWeight: 600, background: c.bg, color: c.ink, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>{r.epc ? "EPC" : v.label}{v.st.days && (v.st.k === "late" || v.st.k === "tobill") ? " · " + v.st.days + " j" : v.tone === "warn" && v.due ? " · " + v.due.days + " j" : ""}</span>; };
  const cur = rows.find(r => r.id === sel) || null;

  const exportXlsx = async () => {
    if (!rows.length) { notify("Rien à exporter pour l'instant"); return; }
    try { await loadExcelJS(); } catch (e) { notify("Export indisponible (bibliothèque Excel non chargée)."); return; }
    const blob = await buildWorkbook(doc, today);
    const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "Cash-in-PJ_" + today + ".xlsx"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    notify("Fichier Excel prêt");
  };
  const download = () => { if (!doc) return; const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "cashin-sauvegarde-" + today + ".json"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500); };
  const onFile = async ev => {
    const f = ev.target.files && ev.target.files[0]; ev.target.value = ""; if (!f) return;
    try {
      const obj = JSON.parse(await f.text()), err = validateCashin(obj);
      if (err) { setMsg({ kind: "err", text: err }); return; }
      if (info.exists && !window.confirm("Remplacer les " + rows.length + " jalons actuels par les " + obj.rows.length + " du fichier ?\nL'état actuel n'est pas conservé : téléchargez d'abord une sauvegarde si besoin.")) return;
      commit(cleanCashin(obj)); setMsg({ kind: "ok", text: obj.rows.length + " jalons repris depuis « " + f.name + " »." });
    } catch (er) { setMsg({ kind: "err", text: er instanceof SyntaxError ? "Ce fichier n'est pas un JSON valide." : "Reprise impossible : " + (er && er.message) }); }
  };

  const Kpi = ({ l, v, tone }) => <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 10, padding: "10px 12px", minWidth: 0 }}><div style={{ fontFamily: T.fontLabel, fontSize: 12, color: T.ink500 }}>{l}</div><div style={{ fontFamily: T.fontDisplay, fontSize: 24, fontWeight: 600, color: tone || T.ink900, fontVariantNumeric: "tabular-nums", lineHeight: 1.15, whiteSpace: "nowrap" }}>{v}</div></div>;
  const banner = (kind, children) => <div role={kind === "err" ? "alert" : "status"} style={{ padding: "8px 12px", borderRadius: 8, background: kind === "err" ? T.red100 : kind === "ok" ? T.emerald100 : T.teal100, color: kind === "err" ? T.red600 : kind === "ok" ? T.emerald600 : T.teal600, fontSize: FZ.sm, fontWeight: 600 }}>{children}</div>;

  return (<div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: T.font }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <span aria-live="polite" style={{ fontSize: FZ.xs, fontWeight: 700, color: save === "error" ? T.red500 : save === "ok" ? T.emerald600 : T.ink500 }}>● {SAVE_TXT[save]}</span>
      <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" style={btn(false)} onClick={() => setLinksOpen(true)} disabled={!info.exists}>Liaisons avec l'ordo</button>
        <button type="button" style={btn(false)} onClick={download} disabled={!doc}>Sauvegarde JSON</button>
        <button type="button" style={btn(false)} onClick={() => fileRef.current && fileRef.current.click()}>Importer un fichier…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: "none" }} aria-label="Fichier de sauvegarde Cash in" />
        <button type="button" style={btn(true)} onClick={exportXlsx}><NavIcon name="copy" size={14} />Exporter en Excel</button>
        {onLegacy && <button type="button" style={{ ...btn(false), border: "none", background: "transparent", color: T.ink500 }} onClick={onLegacy}>Ancienne page</button>}
      </span>
    </div>
    {info.err && banner("err", info.err)}
    {msg && banner(msg.kind, <>{msg.text} <button type="button" onClick={() => setMsg(null)} style={{ marginLeft: 8, border: "none", background: "none", color: "inherit", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}>Fermer</button></>)}
    {info.loaded && !info.exists && !info.err && banner("info", <>Aucune donnée Cash in pour l'instant. « Importer un fichier… » puis choisissez <b>cashin-reprise.json</b>, ou ajoutez un PJ.</>)}
    {linksOpen && <CashLinksDialog onClose={() => setLinksOpen(false)} authorName={authorName} />}

    {ov && <div className="enogia-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
      <Kpi l="Encaissé" v={fmtEur(ov.paid)} tone={T.emerald600} /><Kpi l="Facturé, en attente" v={fmtEur(ov.invoiced)} /><Kpi l="En retard" v={fmtEur(ov.late)} tone={ov.late ? T.red500 : undefined} /><Kpi l="Reste à facturer" v={fmtEur(ov.toBill)} tone={ov.toBill ? T.amber600 : undefined} /><Kpi l="Attendu sous 30 j" v={fmtEur(ov.next30)} />
    </div>}

    {treat.length > 0 && <section aria-label="À traiter" style={{ background: T.card, border: "1px solid " + T.line, borderLeft: "4px solid " + T.red500, borderRadius: "0 10px 10px 0", padding: "8px 12px" }}>
      <div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, marginBottom: 4 }}>À traiter · {treat.length}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
        {treat.slice(0, 8).map(x => <button key={x.r.id} type="button" onClick={() => { setTab("jalons"); setSel(x.r.id); setHidePaid(false); }} style={{ border: "none", background: "transparent", padding: "2px 0", minHeight: 24, cursor: "pointer", fontFamily: T.font, fontSize: FZ.xs, color: T.ink700, textAlign: "left" }}>
          <b style={{ fontFamily: T.fontMono, color: T.ink900 }}>{x.r.pj}</b> {x.r.jalon || "Jalon sans nom"} · {fmtEur(x.r.montant)} · <span style={{ color: x.kind === "late" ? T.red500 : x.kind === "tobill" ? T.amber600 : T.ink500, fontWeight: 700 }}>{x.text}</span></button>)}
        {treat.length > 8 && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>… et {treat.length - 8} autres</span>}
      </div>
    </section>}

    <div role="tablist" aria-label="Vues du Cash in" style={{ display: "flex", gap: 2, borderBottom: "1px solid " + T.line }}>
      {[["jalons", "Jalons"], ["projets", "Projets"], ["mois", "Cash par mois"], ["ecarts", "Écarts"]].map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{ border: "none", background: "transparent", borderBottom: "3px solid " + (tab === id ? T.ink900 : "transparent"), marginBottom: -1, padding: "8px 12px", fontSize: FZ.sm, fontWeight: 700, color: tab === id ? T.ink900 : T.ink500, cursor: "pointer", fontFamily: T.font }}>{l}</button>)}
    </div>

    {tab !== "jalons" && <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 10, padding: 16, fontSize: FZ.sm, color: T.ink500 }}>Cette vue arrive à l'étape 2. En attendant, elle reste disponible dans l'ancienne page{onLegacy ? <> : <button type="button" onClick={onLegacy} style={{ border: "none", background: "transparent", color: T.teal600, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>ouvrir l'ancienne page</button></> : "."}</div>}

    {tab === "jalons" && <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ, un jalon, une facture" aria-label="Rechercher dans le Cash in" style={{ ...field(), width: 280 }} />
        <div role="group" aria-label="Filtrer par statut" style={{ display: "inline-flex", gap: 2, background: T.surface, border: "1px solid " + T.line, borderRadius: 8, padding: 2, flexWrap: "wrap" }}>
          {FILTERS.map(([id, l]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} style={{ border: "none", borderRadius: 6, minHeight: 26, padding: "0 10px", fontSize: FZ.xs, fontWeight: 700, fontFamily: T.font, cursor: "pointer", background: filter === id ? T.card : "transparent", color: filter === id ? T.ink900 : T.ink500 }}>{l}</button>)}
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink700, cursor: "pointer" }}><input type="checkbox" checked={hidePaid} onChange={e => setHidePaid(e.target.checked)} />Masquer les payés</label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink700, cursor: "pointer" }}><input type="checkbox" checked={hideEpc} onChange={e => setHideEpc(e.target.checked)} />Masquer EPC</label>
        <button type="button" onClick={addPj} style={{ ...btn(false), marginLeft: "auto" }}>＋ PJ</button>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0, background: T.card, border: "1px solid " + T.line, borderRadius: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: FZ.sm, minWidth: 720 }}>
            <thead><tr style={{ background: T.surface, textAlign: "left" }}>{["Jalon", "Montant", "Facture prévue → émise", "Paiement prévu → reçu", "Statut"].map(h => <th key={h} style={{ padding: "8px 10px", fontFamily: T.fontLabel, fontSize: 12, fontWeight: 600, color: T.ink500, borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>
              {groups.length === 0 && <tr><td colSpan={5} style={{ padding: 16, color: T.ink500 }}>{rows.length ? "Aucun jalon ne correspond." : "Aucun jalon pour l'instant."}</td></tr>}
              {groups.map(({ pj, g, list }) => <React.Fragment key={pj}>
                <tr style={{ background: T.surface }}>
                  <td colSpan={5} style={{ padding: "6px 10px", borderTop: "1px solid " + T.line }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => setFolded(f => { const n = new Set(f); n.has(pj) ? n.delete(pj) : n.add(pj); return n; })} aria-expanded={!folded.has(pj)} aria-label={(folded.has(pj) ? "Déplier " : "Replier ") + pj} style={{ border: "none", background: "transparent", cursor: "pointer", color: T.ink500, minWidth: 24, minHeight: 24, padding: 0 }}><span style={{ display: "inline-flex", transform: folded.has(pj) ? "rotate(-90deg)" : "none", transition: "transform .15s ease" }}><NavIcon name="chevronDown" size={13} /></span></button>
                      <b style={{ fontFamily: T.fontMono, color: T.ink900 }}>{pj}</b>
                      <span style={{ color: T.ink700, minWidth: 0 }}>{g.label}</span>
                      {g.epc && <span style={{ fontFamily: T.fontLabel, fontSize: 11, fontWeight: 700, color: T.violet600, background: T.violet100, borderRadius: 4, padding: "0 6px" }}>EPC</span>}
                      <span style={{ marginLeft: "auto", fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{fmtEur(g.paid)} encaissés sur {fmtEur(g.total)}{g.total ? " · " + Math.round(g.paid / g.total * 100) + " %" : ""}</span>
                      <button type="button" onClick={() => addRow(pj)} style={{ border: "none", background: "transparent", color: T.teal600, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", minHeight: 24, fontFamily: T.font }}>＋ jalon</button>
                    </div>
                  </td>
                </tr>
                {!folded.has(pj) && list.map(r => { const on = sel === r.id; return (
                  <tr key={r.id} onClick={() => setSel(on ? null : r.id)} aria-selected={on} style={{ cursor: "pointer", background: on ? T.teal100 : "transparent", opacity: r.epc ? .6 : 1 }}>
                    <td style={{ padding: "7px 10px 7px 36px", borderTop: "1px solid " + T.line, color: T.ink900, fontWeight: 600 }}>{r.jalon || <i style={{ color: T.ink500 }}>Jalon sans nom</i>}{r.ref ? <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.ink500, marginLeft: 6 }}>{r.ref}</span> : null}</td>
                    <td style={{ padding: "7px 10px", borderTop: "1px solid " + T.line, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtEur(r.montant)}</td>
                    <td style={{ padding: "7px 10px", borderTop: "1px solid " + T.line, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: T.ink700 }}>{fd(r.factPrevue)} → {r.factReelle ? fd(r.factReelle) : "—"}</td>
                    <td style={{ padding: "7px 10px", borderTop: "1px solid " + T.line, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: T.ink700 }}>{fd(r.encPrevue)} → {r.encReelle ? fd(r.encReelle) : "—"}</td>
                    <td style={{ padding: "7px 10px", borderTop: "1px solid " + T.line }}>{pill(r)}</td>
                  </tr>); })}
              </React.Fragment>)}
            </tbody>
          </table>
        </div>
        {cur && <JalonPanel key={cur.id} r={cur} doc={doc} onEdit={(f, v) => editRow(cur.id, f, v)} onDelete={() => delRow(cur.id)} onClose={() => setSel(null)} setGroup={setGroup} pill={pill(cur)} today={today} />}
      </div>
    </>}
  </div>);
}

const L = ({ l, children }) => <label style={{ display: "flex", flexDirection: "column", gap: 3, fontFamily: T.fontLabel, fontSize: 12, color: T.ink500, minWidth: 0 }}>{l}{children}</label>;
// Volet d'édition d'un jalon (à droite du tableau).
function JalonPanel({ r, doc, onEdit, onDelete, onClose, setGroup, pill, today }) {
  const [arm, setArm] = useState(false);
  const date = f => <input type="date" value={r[f] || ""} onChange={e => onEdit(f, e.target.value)} style={field()} aria-label={{ factInit: "Facture initiale", factPrevue: "Facture prévue", factReelle: "Facture émise", encPrevue: "Paiement prévu", encReelle: "Paiement reçu" }[f] || f} />;
  const g = groupInfo(doc, r.pj);
  return (<aside aria-label={"Jalon " + (r.jalon || "")} className="enogia-view-in" style={{ width: 340, flexShrink: 0, position: "sticky", top: 12, background: T.card, border: "1px solid " + T.line, borderTop: "4px solid " + T.teal500, borderRadius: "0 0 12px 12px", padding: 14, display: "flex", flexDirection: "column", gap: 10, maxHeight: "calc(100dvh - 120px)", overflowY: "auto" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <b style={{ fontFamily: T.fontMono, color: T.ink900 }}>{r.pj}</b>{pill}
      <button type="button" onClick={onClose} aria-label="Fermer le volet" style={{ marginLeft: "auto", border: "none", background: T.surface, borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: T.ink700 }}><NavIcon name="close" size={11} /></button>
    </div>
    <L l="Jalon"><input defaultValue={r.jalon} onBlur={e => onEdit("jalon", e.target.value)} style={field()} /></L>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8 }}>
      <L l="Montant (€)"><input key={"m" + r.montant} inputMode="decimal" defaultValue={r.montant == null ? "" : r.montant} onBlur={e => onEdit("montant", String(e.target.value).replace(/[^\d.,-]/g, "").replace(",", "."))} style={field()} /></L>
      <L l="Délai (j)"><input key={"d" + r.delai} type="number" step="1" defaultValue={r.delai == null ? "" : r.delai} onBlur={e => onEdit("delai", e.target.value)} style={field()} /></L>
    </div>
    <L l="N° de facture"><input defaultValue={r.ref || ""} onBlur={e => onEdit("ref", e.target.value)} placeholder="FA…" style={{ ...field(), fontFamily: T.fontMono }} /></L>
    <div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink700, marginTop: 2 }}>Facture</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><L l="Initiale">{date("factInit")}</L><L l="Prévue">{date("factPrevue")}</L><L l="Émise">{date("factReelle")}</L></div>
    <div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink700, marginTop: 2 }}>Paiement</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><L l="Initial (calculé)"><span style={{ ...field(), display: "flex", alignItems: "center", background: T.surface, color: T.ink700 }}>{fd(r.encInit)}</span></L><L l="Prévu">{date("encPrevue")}</L><L l="Reçu">{date("encReelle")}</L></div>
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: FZ.sm, color: T.ink900, cursor: "pointer", minHeight: 28 }}><input type="checkbox" checked={!!r.epc} onChange={e => onEdit("epc", e.target.checked)} />Jalon géré par la BU EPC (hors suivi)</label>
    <L l="Commentaire"><textarea defaultValue={r.note || ""} onBlur={e => onEdit("note", e.target.value)} rows={3} placeholder="Pourquoi ce décalage ? Que s'est-il passé, qui a décidé, prochaine étape…" style={{ ...field(), resize: "vertical", minHeight: 64 }} /></L>
    {Array.isArray(r.causes) && r.causes.some(c => c.c) && <div style={{ fontSize: FZ.xs, color: T.ink700 }}><b>Causes du décalage :</b> {r.causes.filter(c => c.c).map(c => c.c + (c.d ? " (" + c.d + " j)" : "")).join(" · ")}</div>}
    <details style={{ fontSize: FZ.xs, color: T.ink700 }}><summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 24 }}>Projet {r.pj}</summary>
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <L l="Nom du projet"><input defaultValue={g.label} onBlur={e => setGroup(r.pj, "labels", e.target.value.trim())} style={field()} /></L>
        <L l="Montant du projet (€)"><input inputMode="decimal" defaultValue={(doc && doc.totals && doc.totals[r.pj]) || ""} placeholder={String(Math.round(g.sum))} onBlur={e => setGroup(r.pj, "totals", String(e.target.value).replace(/[^\d.,]/g, "").replace(",", "."))} style={field()} /></L>
      </div>
    </details>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
      {!r.encReelle && !r.epc && <button type="button" onClick={() => onEdit("encReelle", today)} style={btn(true)}>Marquer payé aujourd'hui</button>}
      <button type="button" onClick={() => { if (arm) onDelete(); else { setArm(true); setTimeout(() => setArm(false), 3500); } }} style={{ ...btn(false), color: T.red600, borderColor: arm ? T.red500 : T.line }}>{arm ? "Confirmer la suppression" : "Supprimer"}</button>
    </div>
  </aside>);
}

// ── Export Excel (ExcelJS 4.4.0, chargé à la demande depuis cdnjs, comme dans l'ancienne page) ──
let excelP = null;
function loadExcelJS() {
  if (window.ExcelJS) return Promise.resolve();
  if (!excelP) excelP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"; s.onload = res; s.onerror = () => { excelP = null; rej(new Error("ExcelJS")); }; document.head.appendChild(s); });
  return excelP;
}
async function buildWorkbook(doc, today) {
  const XL = window.ExcelJS, wb = new XL.Workbook(); wb.creator = "Cash in PJ"; wb.created = new Date();
  const d = iso => (iso ? new Date(iso + "T12:00:00") : null), head = (ws, n) => { const h = ws.getRow(1); h.height = 30; for (let i = 1; i <= n; i++) { const c = h.getCell(i); c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF142230" } }; c.alignment = { vertical: "middle", wrapText: true }; } };
  const ws = wb.addWorksheet("Suivi cash in", { views: [{ state: "frozen", xSplit: 3, ySplit: 1 }] });
  const cols = [["PJ", 11], ["Nom du projet", 22], ["Jalon", 40], ["% du projet", 11], ["Montant (€)", 15], ["Statut", 15], ["Délai (j)", 9], ["Facture initiale", 14], ["Encaissement initial", 16], ["Facture prévue", 14], ["Encaissement prévu", 16], ["Facture émise", 14], ["Paiement client", 15], ["N° facture", 14], ["Commentaire", 40]];
  ws.columns = cols.map(([header, width]) => ({ header, width }));
  (doc.rows || []).forEach(r => {
    const t = groupInfo(doc, r.pj).total, k = rowView(r, today).st.k;
    const row = ws.addRow([r.pj, (doc.labels || {})[r.pj] || null, r.jalon, r.montant && t ? r.montant / t : null, r.montant, STATUS_LABEL[k], r.epc ? null : r.delai, ...["factInit", "encInit", "factPrevue", "encPrevue", "factReelle", "encReelle"].map(f => (r.epc ? null : d(r[f]))), r.ref || null, r.note || null]);
    row.getCell(4).numFmt = "0.0%"; row.getCell(5).numFmt = '#,##0 "€"'; [8, 9, 10, 11, 12, 13].forEach(i => { row.getCell(i).numFmt = "dd/mm/yyyy"; });
  });
  head(ws, cols.length); ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  const w2 = wb.addWorksheet("Synthèse PJ", { views: [{ state: "frozen", ySplit: 1 }] });
  const c2 = [["PJ", 12], ["Nom du projet", 22], ["Montant du projet (€)", 20], ["Jalons", 9], ["Jalons payés", 12], ["Total des jalons (€)", 20], ["Encaissé (€)", 16], ["Facturé, en attente (€)", 22], ["Reste à facturer (€)", 20], ["% encaissé", 11], ["Prochain encaissement", 20]];
  w2.columns = c2.map(([header, width]) => ({ header, width }));
  pjList(doc).forEach(pj => {
    const g = groupInfo(doc, pj), live = g.rows.filter(r => !r.epc), inv = live.filter(r => r.factReelle && !r.encReelle).reduce((a, r) => a + (Number(r.montant) || 0), 0);
    const nxt = live.filter(r => !r.encReelle && r.encPrevue).map(r => r.encPrevue).sort()[0] || null;
    const row = w2.addRow([pj, g.label || null, g.total, g.rows.length, live.filter(r => r.encReelle).length, g.sum, g.paid, inv, Math.max(0, g.sum - g.paid - inv), g.total ? g.paid / g.total : null, d(nxt)]);
    [3, 6, 7, 8, 9].forEach(i => { row.getCell(i).numFmt = '#,##0 "€"'; }); row.getCell(10).numFmt = "0%"; row.getCell(11).numFmt = "dd/mm/yyyy";
  });
  head(w2, c2.length);
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
