// v369 (maquette maquettes-design/v369-daf-encaissements.html, proposition A validée : « Go A + raccourci B ») — Cash in › Encaissements :
// la liste des factures émises par les chefs de projet et pas encore payées, groupée En retard / Cette semaine / Plus tard ; le DAF saisit
// la date de paiement d'un geste (« Encaissé aujourd'hui » ou une autre date), « Annuler » pendant 6 s. Seul le champ encReelle change,
// dans le même document planning/cashin, avec les mêmes recalculs que la page Cash in (applyEdit) ; écriture en transaction pour ne pas
// écraser une saisie faite au même moment dans le tableau complet.
import React, { useEffect, useRef, useState } from "react";
import { runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { T, FZF as FZ, btn } from "../theme";
import { useCashin } from "../useCashin";
import { getCashinDoc, todayISO } from "../cashinLink";
import { toCollect, recentlyPaid, setEncReelle, groupInfo } from "../cashinModel";
import { CASHIN_DOC_REF, validateCashin } from "../cashinData";
import { PjPlate } from "./SharedUI";

const eur = v => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v || 0)) + " €";
const fdm = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) : "—");

// Écriture par défaut : transaction sur planning/cashin (seul encReelle du jalon change)
export async function saveEncReelle(id, iso, by) {
  await runTransaction(db, async tx => {
    const ref = CASHIN_DOC_REF(), snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Cash in introuvable");
    const d = snap.data(), rows = setEncReelle(d.rows, id, iso), body = { ...d, rows, updatedAt: new Date().toISOString() };
    const err = validateCashin(body); if (err) throw new Error(err);
    tx.set(ref, { ...body, updatedBy: by || "" });
  });
}

const Kpi = ({ l, v, c }) => <div style={{ minWidth: 0 }}><div style={{ fontSize: 12, color: T.ink500 }}>{l}</div><div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: c || T.ink900, fontVariantNumeric: "tabular-nums" }}>{v}</div></div>;
const GROUPS = [["late", "En retard", "encaissement prévu dépassé"], ["week", "Cette semaine", "prévus d'ici dimanche"], ["later", "Plus tard", ""]];

export function CashInEncaissements({ authorName, canEdit, save = saveEncReelle }) {
  useCashin(); // relu à chaque changement du Cash in
  const doc = getCashinDoc(), rows = (doc && doc.rows) || [], labels = (doc && doc.labels) || {}, today = todayISO();
  const [dates, setDates] = useState({}), [busy, setBusy] = useState(null), [toast, setToast] = useState(null), [err, setErr] = useState("");
  const tRef = useRef(null);
  useEffect(() => () => clearTimeout(tRef.current), []);
  const amountOf = r => { if (r.montant != null && !isNaN(Number(r.montant))) return Number(r.montant); const g = groupInfo(doc, r.pj); return r.pct != null && g && g.total ? g.total * Number(r.pct) / 100 : 0; };
  const L = toCollect(rows, today), paid = recentlyPaid(rows, today);
  const sum = list => list.reduce((a, x) => a + amountOf(x.r || x), 0);
  const late = L.filter(x => x.group === "late"), monthPaid = rows.filter(r => r && !r.epc && r.encReelle && r.encReelle.slice(0, 7) === today.slice(0, 7));
  const run = async (r, iso, undoOf) => {
    setBusy(r.id); setErr("");
    try { await save(r.id, iso, authorName);
      clearTimeout(tRef.current);
      if (undoOf === undefined) { setToast({ text: r.pj + " · " + eur(amountOf(r)) + " encaissé le " + fdm(iso), r }); tRef.current = setTimeout(() => setToast(null), 6000); }
      else setToast(null);
      setDates(d => { const n = { ...d }; delete n[r.id]; return n; });
    } catch (e) { setErr("Enregistrement impossible : " + ((e && e.code === "permission-denied") ? "il faut le niveau « Modifier » sur Finance." : (e && e.message) || e)); }
    setBusy(null);
  };
  if (!doc) return <div style={{ padding: 24, color: T.ink500, fontSize: FZ.sm }}>Le Cash in n'est pas encore chargé.</div>;
  return (<section aria-label="Encaissements" style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
    <p style={{ margin: 0, fontSize: 13, color: T.ink500, maxWidth: "75ch" }}>Factures émises par les chefs de projet, pas encore payées. Saisissez la date à laquelle le paiement arrive.</p>
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
      <Kpi l="À encaisser" v={L.length + " · " + eur(sum(L))} />
      <Kpi l="En retard" v={late.length + " · " + eur(sum(late))} c={late.length ? T.red600 : undefined} />
      <Kpi l="Reçus ce mois" v={monthPaid.length + " · " + eur(monthPaid.reduce((a, r) => a + amountOf(r), 0))} c={T.emerald600} />
    </div>
    {err && <div role="alert" style={{ padding: "8px 12px", borderRadius: 8, background: T.red100, color: T.red600, fontSize: FZ.sm, fontWeight: 500 }}>{err}</div>}
    {!L.length && <div style={{ padding: "28px 16px", textAlign: "center", color: T.ink500, background: T.card, borderRadius: 12, border: "1px solid " + T.line }}>Aucune facture en attente de paiement.</div>}
    {GROUPS.map(([g, title, sub]) => { const G = L.filter(x => x.group === g); if (!G.length) return null;
      const tone = g === "late" ? { bg: T.red100, ink: T.red600 } : g === "week" ? { bg: T.amber100, ink: T.amber600 } : { bg: T.surfaceAlt, ink: T.ink700 };
      return (<div key={g}>
        <h3 style={{ margin: "4px 0 6px 2px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: T.ink500 }}>
          <span style={{ background: tone.bg, color: tone.ink, borderRadius: 999, padding: "1px 8px", fontSize: 12, fontWeight: 500 }}>{title}</span>{sub}<span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{G.length} · {eur(sum(G))}</span></h3>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
          {G.map(({ r, due, days }, i) => { const d = dates[r.id] || today, other = d !== today, lab = labels[r.pj] || "";
            // éléments qui passent à la ligne selon la place (le cadre peut être étroit sans que l'écran le soit)
            return <li key={r.id} style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", alignItems: "center", padding: "12px 14px", minHeight: 64, borderTop: i ? "1px solid " + T.line : "none" }} className="enogia-enc-row">
              <div style={{ flex: "1 1 220px", minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}><PjPlate pj={r.pj} />
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14, color: T.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lab || r.pj}</div>
                <div style={{ fontSize: 12, color: T.ink500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[r.jalon, r.pct != null ? r.pct + " %" : "", r.ref].filter(Boolean).join(" · ")}</div></div></div>
              <div style={{ flex: "0 1 170px", fontSize: 12, color: T.ink500, lineHeight: 1.45, fontVariantNumeric: "tabular-nums" }}>Facture <b style={{ color: T.ink900, fontWeight: 600 }}>{fdm(r.factReelle)}</b><br />Prévu <b style={{ color: g === "late" ? T.red600 : T.ink900, fontWeight: 600 }}>{fdm(due)}{g === "late" && days != null ? " · " + -days + " j de retard" : ""}</b></div>
              <div className="enogia-enc-act" style={{ flex: "1 1 300px", display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <b style={{ fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginRight: 4 }}>{eur(amountOf(r))}</b>
                {canEdit && <><input type="date" value={d} max={today} onChange={e => setDates(x => ({ ...x, [r.id]: e.target.value || today }))} aria-label={"Date de paiement de " + r.pj + " " + (r.jalon || "")}
                  style={{ minHeight: 36, borderRadius: 8, border: "1px solid " + T.fieldLine, background: T.card, color: T.ink900, fontFamily: T.font, fontSize: 13, padding: "0 8px", colorScheme: T.mode === "dark" ? "dark" : "light" }} />
                <button type="button" disabled={busy === r.id} onClick={() => run(r, d)} style={{ ...btn("sec", "md"), minHeight: 36, whiteSpace: "nowrap" }}>{busy === r.id ? "Enregistrement…" : other ? "Encaissé le " + fdm(d) : "Encaissé aujourd'hui"}</button></>}
              </div>
            </li>; })}
        </ol></div>); })}
    {paid.length > 0 && <details style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
      <summary style={{ cursor: "pointer", padding: "10px 14px", fontSize: 14, fontWeight: 600, color: T.ink900, minHeight: 44, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 8 }}>Reçus ces 30 jours <span style={{ fontWeight: 500, fontSize: 13, color: T.ink500 }}>· {paid.length}</span></summary>
      {paid.map(r => <div key={r.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto auto", gap: 12, alignItems: "center", padding: "8px 14px", borderTop: "1px solid " + T.line, minHeight: 44 }}>
        <PjPlate pj={r.pj} /><span style={{ minWidth: 0, fontSize: 13, color: T.ink700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[labels[r.pj], r.jalon].filter(Boolean).join(" · ")}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.emerald600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>✓ {eur(amountOf(r))} le {fdm(r.encReelle)}</span>
        {canEdit ? <button type="button" disabled={busy === r.id} onClick={() => run(r, null, true)} style={{ ...btn("ghost", "sm") }}>Remettre à encaisser</button> : <span />}
      </div>)}
    </details>}
    <div role="status" aria-live="polite" style={{ position: "sticky", bottom: 12, display: "flex", justifyContent: "center", pointerEvents: "none", minHeight: 0 }}>
      {toast && <div className="enogia-enc-toast" style={{ pointerEvents: "auto", display: "inline-flex", alignItems: "center", gap: 14, background: T.ink900, color: T.card, borderRadius: 12, padding: "10px 14px", fontSize: 13, boxShadow: T.shadowLg }}>
        {toast.text}<button type="button" onClick={() => run(toast.r, null, true)} style={{ border: "none", background: "none", color: T.amber500, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: T.font, minHeight: 28 }}>Annuler</button></div>}
    </div>
  </section>);
}
