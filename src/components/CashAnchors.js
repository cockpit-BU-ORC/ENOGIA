// v260 (demandé : « Cash in relié au planning : un jalon de facturation qui suit la date de départ ou de tests, et un signal quand un
// glissement repousse un encaissement ») : fenêtre « Jalons liés au planning » (choisir la date suivie et le décalage, jalon par jalon)
// et bandeau du Cash in qui propose de remettre les dates de facturation à jour quand le planning a bougé.
import React, { useEffect, useMemo, useState } from "react";
import { setDoc } from "firebase/firestore";
import { T, FZ } from "../theme";
import { CASHIN_LINKS_REF } from "../cashinData";
import { allCashGroups, getCashinDoc, getCashinLinks, setCashinLinks, anchorOf, anchorKey, anchoredBill, ANCHOR_FIELDS } from "../cashinLink";
import { useCashin } from "../useCashin";

const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(2, 4) : "—");
const btn = primary => ({ padding: "6px 12px", minHeight: 32, borderRadius: 8, border: "1px solid " + (primary ? T.ink900 : T.line), background: primary ? T.ink900 : T.card, color: primary ? T.card : T.ink700, fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", fontFamily: T.font });
const field = { padding: "4px 6px", minHeight: 30, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box" };

export function CashAnchorsDialog({ planRows, authorName, onClose }) {
  useCashin();
  const doc = getCashinDoc(), links = getCashinLinks();
  const [edits, setEdits] = useState({}); const [q, setQ] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(null);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const byPj = useMemo(() => { const m = {}; (planRows || []).forEach(r => { if (r && r.pj) m[r.pj] = r; }); return m; }, [planRows]);
  const groups = allCashGroups(doc).filter(g => !q.trim() || (g.pj + " " + g.label).toLowerCase().includes(q.trim().toLowerCase()));
  const cur = r => (r.id in edits ? edits[r.id] : anchorOf(r, links));
  const set = (r, patch) => setEdits(e => { const a = { ...(cur(r) || { on: "", lag: 0 }), ...patch }; return { ...e, [r.id]: a.on ? a : null }; });
  const n = Object.keys(edits).length;
  const save = async () => {
    const next = { ...links }; Object.entries(edits).forEach(([id, a]) => { if (a && a.on) next[anchorKey(id)] = { on: a.on, lag: Number(a.lag) || 0 }; else delete next[anchorKey(id)]; });
    setBusy(true); setErr(null);
    try { await setDoc(CASHIN_LINKS_REF(), { links: next, updatedBy: authorName || "", updatedAt: new Date().toISOString() }); setCashinLinks(next); onClose(); }
    catch (e) { setErr(e && e.code === "permission-denied" ? "Écriture refusée par les règles Firestore (document « cashinLinks »)." : "Enregistrement impossible : " + (e && e.message)); }
    finally { setBusy(false); }
  };
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label="Jalons liés au planning" style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(980px,100%)", maxHeight: "90dvh", display: "flex", flexDirection: "column", fontFamily: T.font }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.line }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 18 }}>Jalons liés au planning</div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un PJ…" aria-label="Chercher un PJ" style={{ ...field, marginLeft: "auto", width: 200 }} />
        </div>
        <div style={{ fontSize: 12.5, color: T.ink500, marginTop: 4, lineHeight: 1.5 }}>Un jalon lié suit une date du planning de ses PJ (la plus tardive s'il y en a plusieurs), plus un décalage en jours. Quand le planning bouge, le Cash in propose de remettre sa date de facturation à jour. Les jalons déjà facturés ne bougent jamais.</div>
      </div>
      <div style={{ overflow: "auto", padding: "4px 18px", flex: 1 }}>
        {groups.length === 0 && <div style={{ padding: 16, color: T.ink500, fontSize: 13 }}>Aucun jalon</div>}
        {groups.map(g => <section key={g.pj} aria-label={g.pj} style={{ borderTop: "1px solid " + T.line, padding: "8px 0" }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}><span style={{ fontFamily: T.fontMono }}>{g.pj}</span> <span style={{ fontWeight: 400, color: T.ink500 }}>{g.label}</span></div>
          {g.rows.map(r => { const a = cur(r), done = !!(r.factReelle || r.encReelle), want = a ? anchoredBill(r, byPj, { ...links, [anchorKey(r.id)]: a }) : null; return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "minmax(160px,1fr) 90px 170px 90px 110px", gap: 8, alignItems: "center", minHeight: 36, fontSize: 12.5, opacity: done ? 0.55 : 1 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.jalon}>{r.jalon || "Jalon sans nom"}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: T.ink700 }} title="Facturation prévue actuelle">{done ? "facturé" : fd(r.factPrevue)}</span>
              <select disabled={done} value={(a && a.on) || ""} onChange={e => set(r, { on: e.target.value })} aria-label={"Date suivie par " + (r.jalon || r.id)} style={field}><option value="">Pas lié</option>{ANCHOR_FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.ink500 }}>+<input type="number" disabled={done || !a} value={a ? a.lag : ""} onChange={e => set(r, { lag: e.target.value })} aria-label="Décalage en jours" style={{ ...field, width: 56 }} />j</label>
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: want && want !== r.factPrevue ? T.amber600 : T.ink700 }} title="Facturation calculée depuis le planning">{want ? "→ " + fd(want) : ""}</span>
            </div>); })}
        </section>)}
      </div>
      {err && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: 13, padding: "0 18px 8px" }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 18px 14px", borderTop: "1px solid " + T.line }}>
        <button type="button" style={btn(false)} onClick={onClose}>Annuler</button>
        <button type="button" style={btn(true)} disabled={busy || !n} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer" + (n ? " (" + n + ")" : "")}</button>
      </div>
    </div>
  </div>);
}
