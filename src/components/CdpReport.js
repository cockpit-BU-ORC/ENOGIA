import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { T, FZ } from "../theme";
import { getPjMeta, ETAT_META, PRESENCE_META, presenceKind, presenceDateText, GAMME_COLORS, etatColors } from "../pjMeta";
import { penaltyCalc, livrPrevueOf, ficheBase, siblingsOf, pjBase } from "../penalties";
import { diffDays } from "../parsers";
import { NavIcon } from "./SharedUI";
import { feuxOf } from "./Feux";
import { composantsOf, paiementsOf, compPct, payPct, prodPct, manualGlobal, montantOf, itemsOf, sortedItems } from "../pjProgress";
import { buildCdpDeck, slidesForPj } from "../reports/cdpPptx";
import { loadReportAssets } from "../reports/reportAssets";

// ── Rapport « Chef de projet » (PowerPoint) ──────────────────────────────────────────────────────────────────
// Un .pptx généré dans le navigateur (bibliothèque pptxgenjs chargée à la demande depuis cdnjs, rien n'est envoyé
// ailleurs) : garde, synthèse, modifications de la dernière mise à jour et une diapositive par PJ. Les commentaires privés
// ne sont jamais repris. Le chef de projet se choisit dans la liste, ou « Tous » (un chapitre par chef de projet).
// La bibliothèque est embarquée avec le site (public/vendor/pptxgen.bundle.js, même origine : aucun accès internet requis).
// Repli sur cdnjs si le fichier local était absent (déploiement partiel).
const PPT_SOURCES = [process.env.PUBLIC_URL + "/vendor/pptxgen.bundle.js", "https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js"];
let loading = null;
function loadScript(src) {
  return new Promise((ok, ko) => {
    const s = document.createElement("script"); s.src = src;
    s.onload = () => window.PptxGenJS ? ok(window.PptxGenJS) : ko(new Error("pptxgenjs introuvable"));
    s.onerror = () => { s.remove(); ko(new Error("chargement impossible : " + src)); };
    document.head.appendChild(s);
  });
}
function loadPptx() {
  if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
  if (!loading) loading = PPT_SOURCES.reduce((p, src) => p.catch(() => loadScript(src)), Promise.reject(new Error("start")))
    .catch(() => { loading = null; throw new Error("Bibliothèque PowerPoint introuvable : vérifiez que le dossier vendor/ a bien été déployé avec le site."); });
  return loading;
}

const dOf = v => v ? new Date(v) : null;
const NONE = "Sans chef de projet";
const sevScore = i => { const v = Object.values(i.feux); return v.filter(l => l === "red").length * 100 + v.filter(l => l === "yellow").length * 10 + (i.ecart > 0 ? 5 : 0); };

const hex6 = c => String(c || "").replace("#", "").slice(0, 6).toUpperCase();
function financeOf(r, meta, rows, certifs) {
  const byId = Object.fromEntries((certifs || []).map(c => [c.id, c]));
  const today = new Date();
  const pc = penaltyCalc(meta, r.depart, today), p = meta.penalite || null;
  const pen = p ? { status: pc.status, actif: p.actif !== false, ref: pc.refLabel, ratePct: p.ratePct == null ? null : Number(p.ratePct), graceWeeks: Number(p.graceWeeks) || 0, capType: p.capType === "eur" ? "eur" : "pct", cap: p.cap == null ? null : Number(p.cap),
    capEur: pc.capEur, amount: pc.amount || 0, lateDays: pc.lateDays, chargeableWeeks: pc.chargeableWeeks, weekly: pc.weekly, startDate: pc.startDate || null, contract: pc.contract, effective: pc.effective, provisional: pc.provisional, capped: pc.capped, missing: pc.missing } : null;
  const certs = (Array.isArray(meta.certifs) ? meta.certifs : []).map(id => {
    const c = byId[id] || { id, name: id, color: "#8a9199" }, m = etatColors(c.color).light;
    return { name: c.name || id, bg: hex6(m.bg), text: hex6(m.text), border: hex6(m.border), bar: hex6(m.bar) };
  });
  const sib = siblingsOf(rows, r.pj);
  const sibs = sib.length > 1 ? sib.map(x => { const m = getPjMeta(x.pj, x), c = penaltyCalc(m, x.depart, today); return { pj: x.pj, base: ficheBase(m), status: c.status, lateDays: c.lateDays, weeks: c.chargeableWeeks, amount: c.status === "ok" ? c.amount : 0, current: x.pj === r.pj }; }) : [];
  return { base: ficheBase(meta), livrContr: meta.contratLivr || null, livrPrevue: livrPrevueOf(meta, r.depart), pen, certs, sibs, sibBase: pjBase(r.pj) };
}

function infoOf(r, { initialByPj, delays, comments, progress, change, rows, certifs }) {
  const meta = getPjMeta(r.pj, r);
  const ini = initialByPj[r.pj] || null;
  const dep = dOf(r.depart), tf = meta.contratTFin ? dOf(meta.contratTFin) : null, t0 = meta.contratT0 ? dOf(meta.contratT0) : null;
  const dd = (a, b) => a && b ? diffDays(dOf(a), dOf(b)) : null;
  const dl = [...((delays && delays[r.pj]) || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const by = {}; dl.forEach(d => { by[d.type] = (by[d.type] || 0) + (d.days || 0); });
  const cm = ((comments && comments[r.pj]) || []).filter(c => !c.private).sort((a, b) => new Date(b.date) - new Date(a.date)); // jamais les commentaires privés
  const comps = composantsOf(meta).map(c => ({ label: c.label, des: !!c.des, cmd: !!c.cmd, inst: !!c.inst }));
  const gSet = manualGlobal(meta) != null;
  const kind = presenceKind(r.clientPresence);
  return {
    pj: r.pj, nom: meta.nomProjet || r.nomProjet || "", pays: meta.pays, gamme: r.gamme, chef: meta.chefProjet || NONE, sn: meta.numSerie || "",
    etat: r.etat, etatLabel: (ETAT_META[r.etat] || {}).label || r.etat || "—",
    presence: kind ? (PRESENCE_META[kind].label + (presenceDateText(r.clientPresence) ? " · " + presenceDateText(r.clientPresence) : "")) : "",
    arrivee: r.arrivee, tests: r.tests, testsFin: r.testsFin, finProd: r.finProd, dep: r.depart, tf: meta.contratTFin || null, t0: meta.contratT0 || null,
    dArr: ini ? dd(ini.arrivee, r.arrivee) : null, dTests: ini ? dd(ini.tests, r.tests) : null, dFin: ini ? dd(ini.finProd, r.finProd) : null,
    drift: ini ? dd(ini.depart, r.depart) : null, ecart: tf && dep ? diffDays(tf, dep) : null, duree: t0 && tf ? diffDays(t0, tf) : null,
    iniDep: ini ? ini.depart : null, ini: ini ? { arrivee: ini.arrivee, tests: ini.tests, finProd: ini.finProd, depart: ini.depart } : null,
    gammeColor: GAMME_COLORS[r.gamme] || "#5068b0", etatColor: (ETAT_META[r.etat] || {}).bar || "#8a9199", presenceKind: kind || "",
    feux: feuxOf(meta), notes: meta.notes || {}, semAt: meta.semAt || null, mitAt: meta.mitAt || null,
    actions: sortedItems(itemsOf(meta, "actions")).map(x => ({ text: x.text, done: !!x.done, doneAt: x.doneAt || null, deadline: x.deadline || null })),
    mitigations: sortedItems(itemsOf(meta, "mitigations")).map(x => ({ text: x.text, done: !!x.done, doneAt: x.doneAt || null })),
    feuxAt: meta.feuxAt || null,
    global: gSet ? manualGlobal(meta) : null, montant: montantOf(meta), pv: prodPct(r, progress), compPct: compPct(meta), payPct: payPct(meta, r.pj),
    comps, pay: paiementsOf(meta, r.pj).filter(p => !p.epc).map(p => ({ label: p.label, pct: p.pct, done: !!p.done, doneAt: p.doneAt || null, linked: !!p.linked, montant: p.linked ? p.montant : null, tone: p.linked ? p.tone : null, retard: p.linked ? p.retard : null, shared: !!p.shared, sharedN: p.sharedN || 1 })),
    delays: Object.entries(by).sort((a, b) => b[1] - a[1]).map(([type, days]) => ({ type, days })),
    delayList: dl.map(d => ({ type: d.type, days: d.days || 0, note: d.note || "", author: d.author || "", date: d.date })),
    comments: cm.map(c => ({ author: c.author || "", date: c.date, text: c.text || "" })),
    totalDelay: dl.reduce((a, d) => a + (d.days || 0), 0),
    change: change || null,
    fin: financeOf(r, meta, rows, certifs),
  };
}

export function CdpDialog({ data, initialData, delays, comments, progress, changeLog, initialChef, certifs, onClose }) {
  const last = (changeLog && changeLog[0]) || null;
  const initialByPj = useMemo(() => { const m = {}; (initialData || []).forEach(x => { m[x.pj] = x; }); return m; }, [initialData]);
  const chgByPj = useMemo(() => { const m = {}; ((last && last.pjs) || []).forEach(p => { m[p.pj] = p; }); return m; }, [last]);
  const infos = useMemo(() => data.filter(r => r.etat !== "SLOT_LIBRE").map(r => infoOf(r, { initialByPj, delays, comments, progress, change: chgByPj[r.pj], rows: data, certifs })), [data, initialByPj, delays, comments, progress, chgByPj, certifs]);
  const chefs = useMemo(() => { const m = {}; infos.forEach(i => { m[i.chef] = (m[i.chef] || 0) + 1; }); return Object.keys(m).sort((a, b) => a === NONE ? 1 : b === NONE ? -1 : a.localeCompare(b)).map(c => [c, m[c]]); }, [infos]);
  const [chef, setChef] = useState(initialChef || "__all");
  const [withShipped, setWithShipped] = useState(false);
  const [withChanges, setWithChanges] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const onKey = e => { if (e.key === "Escape" && !busy) onClose(); }; window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose, busy]);

  const groups = useMemo(() => {
    const keep = i => (withShipped || i.etat !== "SHIPPED") && (chef === "__all" || i.chef === chef);
    const m = {}; infos.filter(keep).forEach(i => { (m[i.chef] = m[i.chef] || []).push(i); });
    return Object.keys(m).sort((a, b) => a === NONE ? 1 : b === NONE ? -1 : a.localeCompare(b)).map(c => ({ chef: c, items: m[c].sort((a, b) => sevScore(b) - sevScore(a) || a.pj.localeCompare(b.pj)) }));
  }, [infos, chef, withShipped]);
  const n = groups.reduce((a, g) => a + g.items.length, 0);
  const lastChange = last && withChanges ? { when: new Date(last.at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), indice: last.indice || "" } : null;
  const nSlides = groups.length ? 2 + groups.reduce((a, g) => a + (groups.length > 1 ? 1 : 0) + Math.max(1, Math.ceil(g.items.length / 9)) + (lastChange ? 1 : 0) + g.items.reduce((m, i) => m + slidesForPj(i), 0), 0) : 0;

  const generate = async () => {
    setBusy(true); setErr("");
    try {
      const P = await loadPptx();
      const dateLabel = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      const assets = await loadReportAssets();
      const pptx = buildCdpDeck(P, { groups, dateLabel, lastChange, assets, title: "Revue de projets" + (chef === "__all" ? "" : " — " + chef) });
      const slug = (chef === "__all" ? "Tous" : chef).normalize("NFD").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
      await pptx.writeFile({ fileName: "ENOGIA_Revue_projets_" + slug + "_" + new Date().toISOString().slice(0, 10) + ".pptx" });
    } catch (e) { console.error(e); setErr(e.message || "Échec de la génération"); }
    setBusy(false);
  };

  const row = { display: "flex", alignItems: "center", gap: 8, fontSize: FZ.sm, color: T.ink700, cursor: "pointer" };
  return createPortal(
    <div onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(10,18,32,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: T.font }}>
      <div role="dialog" aria-modal="true" aria-label="Rapport chef de projet" style={{ width: "min(520px,100%)", maxHeight: "90vh", overflow: "auto", background: T.card, borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.35)", border: "1px solid " + T.line }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid " + T.line, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: T.teal600, display: "inline-flex" }}><NavIcon name="chart" size={18} /></span>
          <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: FZ.md, color: T.ink900 }}>Rapport chef de projet (PowerPoint)</div>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: FZ.xs, fontWeight: 700, color: T.ink500 }}>Chef de projet
            <select data-testid="cdp-chef" value={chef} onChange={e => setChef(e.target.value)} style={{ padding: "8px 8px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontFamily: T.font, fontSize: FZ.sm, colorScheme: T.mode === "dark" ? "dark" : "light" }}>
              <option value="__all">Tous les chefs de projet (un chapitre chacun)</option>
              {chefs.map(([c, k]) => <option key={c} value={c}>{c} — {k} PJ</option>)}
            </select>
          </label>
          <label style={row}><input type="checkbox" checked={withChanges} onChange={e => setWithChanges(e.target.checked)} disabled={!last} />Inclure les modifications de la dernière mise à jour{!last && <span style={{ color: T.ink300 }}> (aucun import enregistré)</span>}</label>
          <label style={row}><input type="checkbox" checked={withShipped} onChange={e => setWithShipped(e.target.checked)} />Inclure les PJ déjà expédiés</label>
          <div style={{ fontSize: FZ.xs, color: T.ink500, lineHeight: 1.5, background: T.surface, border: "1px solid " + T.line, borderRadius: 8, padding: "8px 12px" }}>
            Contenu : garde, synthèse des projets, modifications depuis la dernière mise à jour, puis pour chaque PJ la fiche projet complète sur 2 à 4 diapositives (statut global et commentaires, certification, prix de la fiche, livraison et pénalités, indicateurs, jalons, contrat & MaD ORC, major components, jalons de paiement, actions de la semaine, plans de mitigation, retards, fil de commentaires). Les commentaires privés ne sont pas repris.
          </div>
          <div style={{ fontSize: FZ.sm, color: T.ink700, fontWeight: 600 }}>{n} projet{n > 1 ? "s" : ""} · {nSlides} diapositive{nSlides > 1 ? "s" : ""}</div>
          {err && <div style={{ fontSize: FZ.xs, color: T.red500, background: T.red100, borderRadius: 8, padding: "8px 8px" }}>{err}</div>}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid " + T.line, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} disabled={busy} style={{ border: "1px solid " + T.line, borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: FZ.sm, fontFamily: T.font, background: "transparent", color: T.ink700, cursor: "pointer" }}>Fermer</button>
          <button data-testid="cdp-go" disabled={!n || busy} onClick={generate} style={{ border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: FZ.sm, fontFamily: T.font, color: "#fff", cursor: n && !busy ? "pointer" : "default", background: n ? T.navy700 : T.ink100 }}>{busy ? "Génération…" : "Télécharger le PowerPoint"}</button>
        </div>
      </div>
    </div>, document.body);
}
