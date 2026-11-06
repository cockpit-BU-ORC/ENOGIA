// v262 (demandé : « un onglet spécial pour les Achats / Appro, pour le suivi des appros des composants qu'on installe sur nos ORC ;
// le responsable achats travaille le fond sur son Claude, je lui fournis la forme, comme pour Jérémie ») : page « Achats / Appro ».
// Forme de départ : Accueil (chiffres, à traiter en premier), Par PJ, Commandes, Composants, Fournisseurs, Réglages (propriétaire).
// Les dates de besoin partent de l'arrivée de chaque PJ dans le planning (moins une marge réglable). Données : document Firestore
// planning/achats (préfixe beta_ en bêta), une entrée par élément. Le planning n'est que lu (rows).
// La partie entre les repères DÉBUT PAGE / FIN PAGE est échangée avec le Claude du responsable achats (npm run kit:achats /
// npm run import:achats) : elle n'importe que React, le thème, PageHead et NavIcon.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, FZF } from "../theme";
import { PageHead, NavIcon } from "./SharedUI";

// ===== DÉBUT PAGE (kit Achats : tout ce qui suit jusqu’à FIN PAGE est échangé avec le Claude du responsable achats — scripts/achats-kit.js / achats-import.js) =====

/* ---------- Modèle de données ----------
   composants   { [id]: { ref, designation, famille, fournisseurId, delaiJ, note } }        catalogue des composants installés sur les ORC
   lignes       { [id]: { pj, composantId, designation, qte, fournisseurId, po, statut,      une ligne d'appro = un composant pour un PJ
                          dateBesoin, datePrevue, dateRecue, note } }
   fournisseurs { [id]: { nom, contact, email, tel, note } }
   params       { marge }                                                                   jours avant l'arrivée du PJ où le composant doit être là
   access       [ e-mails ]                                                                 qui voit et modifie la page (en plus du propriétaire) */
export const EMPTY_ACHATS = { composants: {}, lignes: {}, fournisseurs: {}, params: { marge: 10 }, access: [] };
export const STATUTS = [
  ["besoin", "À commander"], ["consult", "En consultation"], ["commande", "Commandé"], ["confirme", "Confirmé (ARC)"],
  ["expedie", "Expédié"], ["recu", "Reçu"], ["nc", "Non conforme"],
];
const ST_LABEL = Object.fromEntries(STATUTS);
const FAMILLES = ["Échangeurs", "Pompes", "Tuyauterie / vannes", "Instrumentation", "Électrique / armoire", "Châssis / skid", "Turbine", "Divers"];

/* ---------- Dates ---------- */
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const isoOf = v => { if (!v) return ""; const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const d = new Date(s); return isNaN(d) ? "" : iso(d); };
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
const fd = s => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(2, 4) : "—");
const newId = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Date de besoin d'une ligne : saisie, sinon arrivée du PJ moins la marge (jours calendaires)
export function besoinOf(line, row, params) {
  if (line && line.dateBesoin) return line.dateBesoin;
  const a = row && isoOf(row.arrivee); if (!a) return "";
  return addDays(a, -(Number(params && params.marge) || 0));
}
// État d'une ligne : done (reçue), nc (non conforme), late (en retard : prévue après le besoin, ou besoin dépassé sans réception),
// soon (besoin dans 21 j et pas encore commandée), todo (à commander), ok (dans les temps).
export function lineState(line, row, params, todayIso) {
  const t = todayIso || iso(today0()), besoin = besoinOf(line, row, params), st = line.statut || "besoin";
  if (st === "recu") return { k: "done", besoin, retardJ: 0 };
  if (st === "nc") return { k: "nc", besoin, retardJ: 0 };
  const prevue = line.datePrevue || "";
  const ref = prevue || (besoin && t > besoin ? t : "");
  const retardJ = besoin && ref && ref > besoin ? daysBetween(besoin, ref) : 0;
  if (retardJ > 0) return { k: "late", besoin, retardJ };
  if (st === "besoin" || st === "consult") return { k: besoin && daysBetween(t, besoin) <= 21 ? "soon" : "todo", besoin, retardJ: 0 };
  return { k: "ok", besoin, retardJ: 0 };
}
const TONE = () => ({
  late: { bg: T.red100, ink: T.red600, l: "En retard" }, nc: { bg: T.red100, ink: T.red600, l: "Non conforme" },
  soon: { bg: T.amber100, ink: T.amber600, l: "À commander vite" }, todo: { bg: T.surfaceAlt, ink: T.ink700, l: "À commander" },
  ok: { bg: T.emerald100, ink: T.emerald600, l: "Dans les temps" }, done: { bg: T.surfaceAlt, ink: T.ink500, l: "Reçu" },
});

/* ---------- Petits composants ---------- */
const CARD = () => ({ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "12px 14px", boxSizing: "border-box" });
const btn = primary => ({ minHeight: 30, padding: "0 12px", borderRadius: 8, border: "1px solid " + (primary ? T.ink900 : T.line), background: primary ? T.ink900 : T.card, color: primary ? T.card : T.ink700, fontFamily: T.font, fontSize: FZF.sm, fontWeight: 700, cursor: "pointer" });
const field = () => ({ padding: "5px 8px", minHeight: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontFamily: T.font, fontSize: FZF.sm, boxSizing: "border-box", width: "100%" });
const th = () => ({ textAlign: "left", padding: "8px 10px", fontSize: 12, fontWeight: 500, color: T.ink500, borderBottom: "1px solid " + T.line, whiteSpace: "nowrap", position: "sticky", top: 0, background: T.card });
const td = () => ({ padding: "6px 10px", borderBottom: "1px solid " + T.line, fontSize: FZF.sm, color: T.ink900, verticalAlign: "middle" });
function Pill({ k }) { const t = TONE()[k] || TONE().todo; return <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 999, background: t.bg, color: t.ink, fontSize: FZF.xs, fontWeight: 700, whiteSpace: "nowrap" }}>{t.l}</span>; }
function Kpi({ label, value, sub, bad }) {
  return (<div style={CARD()}>
    <div style={{ fontSize: 12, color: T.ink500 }}>{label}</div>
    <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 600, color: bad && value ? T.red600 : T.ink900, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{value}</div>
    {sub && <div style={{ fontSize: FZF.xs, color: T.ink500 }}>{sub}</div>}
  </div>);
}

// Fenêtre de saisie commune : fields = [{ k, l, type: text|number|date|select|textarea, opts:[[v,l]], req }]
function FormDialog({ title, vals, fields, onSave, onDelete, onClose }) {
  const [v, setV] = useState(vals); const [err, setErr] = useState("");
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const save = () => { const miss = fields.find(f => f.req && !String(v[f.k] == null ? "" : v[f.k]).trim()); if (miss) { setErr("« " + miss.l + " » est obligatoire."); return; } onSave(v); };
  const L = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: T.ink700 };
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label={title} style={{ ...CARD(), width: "min(560px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: T.shadowLg, padding: "16px 18px" }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: FZF.lg, fontWeight: 600, marginBottom: 12, color: T.ink900 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        {fields.map(f => <label key={f.k} style={{ ...L, gridColumn: f.type === "textarea" ? "1 / -1" : undefined }}>{f.l}{f.req ? " *" : ""}
          {f.type === "select" ? <select value={v[f.k] == null ? "" : v[f.k]} onChange={e => setV({ ...v, [f.k]: e.target.value })} style={field()}>{f.opts.map(([o, l]) => <option key={o} value={o}>{l}</option>)}</select>
            : f.type === "textarea" ? <textarea rows={3} value={v[f.k] || ""} onChange={e => setV({ ...v, [f.k]: e.target.value })} style={{ ...field(), resize: "vertical" }} />
              : <input type={f.type || "text"} value={v[f.k] == null ? "" : v[f.k]} onChange={e => setV({ ...v, [f.k]: f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })} style={field()} />}
          {f.hint && <span style={{ fontWeight: 400, color: T.ink500 }}>{f.hint}</span>}
        </label>)}
      </div>
      {err && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: FZF.sm, marginTop: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {onDelete && <button type="button" style={{ ...btn(false), color: T.red600 }} onClick={onDelete}>Supprimer</button>}
        <span style={{ flex: 1 }} />
        <button type="button" style={btn(false)} onClick={onClose}>Annuler</button>
        <button type="button" style={btn(true)} onClick={save}>Enregistrer</button>
      </div>
    </div>
  </div>);
}

const TABS = [["accueil", "Accueil"], ["pj", "Par PJ"], ["commandes", "Commandes"], ["composants", "Composants"], ["fournisseurs", "Fournisseurs"], ["reglages", "Réglages"]];

/* ---------- Page ---------- */
// doc : document planning/achats ; api : put(collection, id, data), del(collection, id), setParams(p), setAccess(liste)
// rows : lignes du planning (pj, nomProjet, gamme, etat, arrivee, depart), en lecture seule ; canEdit : modifier ; owner : propriétaire
export function Achats({ doc, api, rows, canEdit, owner }) {
  const S = useMemo(() => { const d = doc || {}, o = { ...EMPTY_ACHATS, ...d, params: { ...EMPTY_ACHATS.params, ...(d.params || {}) }, access: Array.isArray(d.access) ? d.access : [] };
    ["composants", "lignes", "fournisseurs"].forEach(c => { o[c] = Object.fromEntries(Object.entries(d[c] || {}).map(([k, v]) => [k, { ...v, id: k }])); }); return o; }, [doc]);
  const byPj = useMemo(() => { const m = {}; (rows || []).forEach(r => { if (r && r.pj) m[r.pj] = r; }); return m; }, [rows]);
  const openPjs = useMemo(() => (rows || []).filter(r => r && r.pj && r.etat !== "SHIPPED" && r.etat !== "SLOT_LIBRE").sort((a, b) => String(isoOf(a.arrivee) || "9").localeCompare(String(isoOf(b.arrivee) || "9"))), [rows]);
  const tIso = iso(today0());
  const lines = useMemo(() => Object.values(S.lignes).map(l => ({ ...l, st: lineState(l, byPj[l.pj], S.params, tIso) })), [S, byPj, tIso]);
  const [tab, setTab] = useState(() => { try { const v = localStorage.getItem("enogia_achats_tab"); return TABS.some(t => t[0] === v) ? v : "accueil"; } catch (e) { return "accueil"; } });
  useEffect(() => { try { localStorage.setItem("enogia_achats_tab", tab); } catch (e) { /* stockage indisponible */ } }, [tab]);
  const [pjSel, setPjSel] = useState(null), [stF, setStF] = useState("open"), [form, setForm] = useState(null), [toast, setToast] = useState(null); const tRef = useRef(null);
  const notify = (msg, err) => { setToast({ msg, err }); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(null), err ? 5200 : 3000); };
  const put = async (c, id, data) => { const d = { ...data }; delete d.id; delete d.st; const ok = await api.put(c, id, d); if (!ok) notify("Enregistrement impossible, réessayez dans un instant.", true); else notify("Enregistré."); return ok; };
  const del = async (c, id) => { const ok = await api.del(c, id); if (ok) notify("Supprimé."); return ok; };
  const compName = id => (S.composants[id] && (S.composants[id].designation || S.composants[id].ref)) || "";
  const fourName = id => (S.fournisseurs[id] && S.fournisseurs[id].nom) || "";
  const pjLabel = pj => pj + (byPj[pj] && byPj[pj].nomProjet ? " · " + byPj[pj].nomProjet : "");

  /* ---- fiches ---- */
  const compOpts = [["", "— (texte libre)"], ...Object.values(S.composants).sort((a, b) => String(a.designation || a.ref).localeCompare(String(b.designation || b.ref))).map(c => [c.id, (c.ref ? c.ref + " · " : "") + (c.designation || "")])];
  const fourOpts = [["", "—"], ...Object.values(S.fournisseurs).sort((a, b) => String(a.nom).localeCompare(String(b.nom))).map(f => [f.id, f.nom])];
  const openLine = (l, pj) => {
    const isNew = !l; l = l || { id: newId(), pj: pj || (openPjs[0] && openPjs[0].pj) || "", composantId: "", designation: "", qte: 1, fournisseurId: "", po: "", statut: "besoin", dateBesoin: "", datePrevue: "", dateRecue: "", note: "" };
    setForm({ title: isNew ? "Nouvelle ligne d'appro" : "Appro · " + l.pj, vals: l, onDelete: isNew ? null : async () => { if (await del("lignes", l.id)) setForm(null); },
      fields: [
        { k: "pj", l: "PJ", type: "select", req: true, opts: [...openPjs.map(r => [r.pj, pjLabel(r.pj)]), ...(l.pj && !openPjs.some(r => r.pj === l.pj) ? [[l.pj, l.pj]] : [])] },
        { k: "composantId", l: "Composant (catalogue)", type: "select", opts: compOpts }, { k: "designation", l: "Désignation (si hors catalogue)" },
        { k: "qte", l: "Quantité", type: "number" }, { k: "fournisseurId", l: "Fournisseur", type: "select", opts: fourOpts }, { k: "po", l: "N° de commande (PO)" },
        { k: "statut", l: "Statut", type: "select", opts: STATUTS }, { k: "dateBesoin", l: "Date de besoin", type: "date", hint: "Vide : arrivée du PJ moins " + S.params.marge + " j" },
        { k: "datePrevue", l: "Livraison prévue (ARC)", type: "date" }, { k: "dateRecue", l: "Reçu le", type: "date" }, { k: "note", l: "Note", type: "textarea" },
      ],
      onSave: async v => { const d = { ...v }; if (d.dateRecue && d.statut !== "nc") d.statut = "recu"; if (await put("lignes", d.id, d)) setForm(null); } });
  };
  const openComp = c => { const isNew = !c; c = c || { id: newId(), ref: "", designation: "", famille: FAMILLES[0], fournisseurId: "", delaiJ: "", note: "" };
    setForm({ title: isNew ? "Nouveau composant" : "Composant " + (c.ref || c.designation), vals: c, onDelete: isNew ? null : async () => { if (await del("composants", c.id)) setForm(null); },
      fields: [{ k: "ref", l: "Référence" }, { k: "designation", l: "Désignation", req: true }, { k: "famille", l: "Famille", type: "select", opts: FAMILLES.map(f => [f, f]) }, { k: "fournisseurId", l: "Fournisseur habituel", type: "select", opts: fourOpts }, { k: "delaiJ", l: "Délai habituel (jours)", type: "number" }, { k: "note", l: "Note", type: "textarea" }],
      onSave: async v => { if (await put("composants", v.id, v)) setForm(null); } }); };
  const openFour = f => { const isNew = !f; f = f || { id: newId(), nom: "", contact: "", email: "", tel: "", note: "" };
    setForm({ title: isNew ? "Nouveau fournisseur" : f.nom, vals: f, onDelete: isNew ? null : async () => { if (await del("fournisseurs", f.id)) setForm(null); },
      fields: [{ k: "nom", l: "Nom", req: true }, { k: "contact", l: "Contact" }, { k: "email", l: "E-mail" }, { k: "tel", l: "Téléphone" }, { k: "note", l: "Note", type: "textarea" }],
      onSave: async v => { if (await put("fournisseurs", v.id, v)) setForm(null); } }); };

  /* ---- tableau des lignes (réutilisé par Accueil, Par PJ, Commandes) ---- */
  const LineTable = ({ list, showPj, empty }) => (<div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
      <thead><tr>{showPj && <th style={th()}>PJ</th>}<th style={th()}>Composant</th><th style={{ ...th(), textAlign: "right" }}>Qté</th><th style={th()}>Fournisseur</th><th style={th()}>PO</th><th style={th()}>Statut</th><th style={th()}>Besoin</th><th style={th()}>Prévue</th><th style={th()}>Suivi</th></tr></thead>
      <tbody>
        {list.map(l => <tr key={l.id} onClick={canEdit ? () => openLine(l) : undefined} style={{ cursor: canEdit ? "pointer" : "default", height: 36 }}>
          {showPj && <td style={{ ...td(), fontFamily: T.fontMono, fontWeight: 700, whiteSpace: "nowrap" }}>{l.pj}</td>}
          <td style={td()}>{compName(l.composantId) || l.designation || "—"}</td>
          <td style={{ ...td(), textAlign: "right" }}>{l.qte || "—"}</td>
          <td style={{ ...td(), color: T.ink700 }}>{fourName(l.fournisseurId) || "—"}</td>
          <td style={{ ...td(), fontFamily: T.fontMono, color: T.ink700 }}>{l.po || "—"}</td>
          <td style={{ ...td(), color: T.ink700, whiteSpace: "nowrap" }}>{ST_LABEL[l.statut || "besoin"]}</td>
          <td style={{ ...td(), whiteSpace: "nowrap" }}>{fd(l.st.besoin)}</td>
          <td style={{ ...td(), whiteSpace: "nowrap", color: l.st.k === "late" ? T.red600 : T.ink900 }}>{fd(l.datePrevue)}</td>
          <td style={{ ...td(), whiteSpace: "nowrap" }}><Pill k={l.st.k} />{l.st.retardJ > 0 && <span style={{ marginLeft: 6, fontSize: FZF.xs, color: T.red600, fontWeight: 700 }}>+{l.st.retardJ} j</span>}</td>
        </tr>)}
        {!list.length && <tr><td colSpan={showPj ? 9 : 8} style={{ ...td(), color: T.ink500, textAlign: "center", padding: 18 }}>{empty}</td></tr>}
      </tbody>
    </table>
  </div>);

  const urgent = lines.filter(l => ["late", "nc", "soon"].includes(l.st.k)).sort((a, b) => (b.st.retardJ - a.st.retardJ) || String(a.st.besoin).localeCompare(String(b.st.besoin)));
  const in14 = lines.filter(l => l.st.k !== "done" && l.datePrevue && l.datePrevue >= tIso && daysBetween(tIso, l.datePrevue) <= 14).length;
  const visibleTabs = TABS.filter(t => t[0] !== "reglages" || owner);

  return (<div style={{ fontFamily: T.font, color: T.ink900 }}>
    <PageHead kicker="Gestion" title="Achats / Appro" sub="Approvisionnement des composants installés sur les ORC" right={canEdit ? <button type="button" style={btn(true)} onClick={() => openLine(null, tab === "pj" ? pjSel : null)}>＋ Ligne d'appro</button> : null} />
    <div role="tablist" aria-label="Sous-pages" style={{ display: "flex", gap: 18, borderBottom: "1px solid " + T.line, marginBottom: 14, flexWrap: "wrap" }}>
      {visibleTabs.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{ border: "none", background: "transparent", padding: "8px 0", minHeight: 32, cursor: "pointer", fontFamily: T.font, fontSize: FZF.sm, fontWeight: tab === id ? 700 : 500, color: tab === id ? T.ink900 : T.ink500, borderBottom: "2px solid " + (tab === id ? T.ink900 : "transparent"), marginBottom: -1 }}>{l}</button>)}
    </div>

    {tab === "accueil" && <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 14 }}>
        <Kpi label="À commander" value={lines.filter(l => l.st.k === "todo" || l.st.k === "soon").length} sub={lines.filter(l => l.st.k === "soon").length + " à lancer sous 3 semaines"} />
        <Kpi label="En retard sur le besoin" value={lines.filter(l => l.st.k === "late").length} bad sub="livraison prévue après la date de besoin" />
        <Kpi label="Livraisons attendues" value={in14} sub="dans les 14 prochains jours" />
        <Kpi label="Non conformes" value={lines.filter(l => l.st.k === "nc").length} bad />
      </div>
      <section aria-label="À traiter en premier" style={CARD()}>
        <div style={{ fontWeight: 700, fontSize: FZF.md, marginBottom: 6 }}>À traiter en premier</div>
        <LineTable list={urgent.slice(0, 12)} showPj empty="Rien d'urgent : aucune ligne en retard, non conforme ou à commander sous 3 semaines." />
      </section>
    </>}

    {tab === "pj" && <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,260px) 1fr", gap: 12, alignItems: "start" }}>
      <nav aria-label="PJ" style={{ ...CARD(), padding: 6, maxHeight: "70vh", overflow: "auto" }}>
        {openPjs.map(r => { const L = lines.filter(l => l.pj === r.pj), bad = L.some(l => l.st.k === "late" || l.st.k === "nc"), on = (pjSel || (openPjs[0] && openPjs[0].pj)) === r.pj; return (
          <button key={r.pj} type="button" onClick={() => setPjSel(r.pj)} aria-current={on ? "true" : undefined} style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, border: "none", borderRadius: 8, padding: "6px 8px", minHeight: 36, background: on ? T.surfaceAlt : "transparent", cursor: "pointer", textAlign: "left", fontFamily: T.font, color: T.ink900 }}>
            <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontFamily: T.fontMono, fontSize: FZF.sm }}>{r.pj}</b><span style={{ display: "block", fontSize: FZF.xs, color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nomProjet || ""} · arrivée {fd(isoOf(r.arrivee))}</span></span>
            <span style={{ fontSize: FZF.xs, color: bad ? T.red600 : T.ink500, fontWeight: 700 }}>{L.length ? L.filter(l => l.st.k === "done").length + "/" + L.length : "—"}</span>
          </button>); })}
        {!openPjs.length && <div style={{ padding: 10, color: T.ink500, fontSize: FZF.sm }}>Aucun PJ en cours dans le planning.</div>}
      </nav>
      {(() => { const pj = pjSel || (openPjs[0] && openPjs[0].pj); const r = byPj[pj]; return (<section aria-label={"Appro " + (pj || "")} style={CARD()}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <b style={{ fontFamily: T.fontMono, fontSize: FZF.md }}>{pj || "—"}</b><span style={{ color: T.ink500, fontSize: FZF.sm }}>{r ? [r.nomProjet, r.gamme, "arrivée " + fd(isoOf(r.arrivee)), "départ " + fd(isoOf(r.depart))].filter(Boolean).join(" · ") : ""}</span>
          <span style={{ flex: 1 }} />{canEdit && pj && <button type="button" style={btn(false)} onClick={() => openLine(null, pj)}>＋ Ligne pour ce PJ</button>}
        </div>
        <LineTable list={lines.filter(l => l.pj === pj)} empty="Aucune ligne d'appro pour ce PJ." />
      </section>); })()}
    </div>}

    {tab === "commandes" && <section aria-label="Commandes" style={CARD()}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {[["open", "En cours"], ["late", "En retard"], ...STATUTS, ["all", "Toutes"]].map(([k, l]) => <button key={k} type="button" aria-pressed={stF === k} onClick={() => setStF(k)} style={{ ...btn(stF === k), minHeight: 26, padding: "0 10px", fontSize: FZF.xs }}>{l}</button>)}
      </div>
      <LineTable showPj list={lines.filter(l => stF === "all" || (stF === "open" ? l.st.k !== "done" : stF === "late" ? l.st.k === "late" : (l.statut || "besoin") === stF)).sort((a, b) => String(a.st.besoin || "9").localeCompare(String(b.st.besoin || "9")))} empty="Aucune ligne pour ce filtre." />
    </section>}

    {tab === "composants" && <section aria-label="Composants" style={CARD()}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}><b style={{ fontSize: FZF.md }}>Catalogue des composants</b><span style={{ flex: 1 }} />{canEdit && <button type="button" style={btn(false)} onClick={() => openComp(null)}>＋ Composant</button>}</div>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
        <thead><tr><th style={th()}>Référence</th><th style={th()}>Désignation</th><th style={th()}>Famille</th><th style={th()}>Fournisseur habituel</th><th style={{ ...th(), textAlign: "right" }}>Délai</th></tr></thead>
        <tbody>{Object.values(S.composants).sort((a, b) => String(a.famille).localeCompare(String(b.famille)) || String(a.designation).localeCompare(String(b.designation))).map(c => <tr key={c.id} onClick={canEdit ? () => openComp(c) : undefined} style={{ cursor: canEdit ? "pointer" : "default", height: 36 }}>
          <td style={{ ...td(), fontFamily: T.fontMono }}>{c.ref || "—"}</td><td style={td()}>{c.designation}</td><td style={{ ...td(), color: T.ink700 }}>{c.famille || "—"}</td><td style={{ ...td(), color: T.ink700 }}>{fourName(c.fournisseurId) || "—"}</td><td style={{ ...td(), textAlign: "right" }}>{c.delaiJ ? c.delaiJ + " j" : "—"}</td></tr>)}
          {!Object.keys(S.composants).length && <tr><td colSpan={5} style={{ ...td(), color: T.ink500, textAlign: "center", padding: 18 }}>Aucun composant : ajoutez ceux qui sont installés sur les ORC.</td></tr>}</tbody>
      </table></div>
    </section>}

    {tab === "fournisseurs" && <section aria-label="Fournisseurs" style={CARD()}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}><b style={{ fontSize: FZF.md }}>Fournisseurs</b><span style={{ flex: 1 }} />{canEdit && <button type="button" style={btn(false)} onClick={() => openFour(null)}>＋ Fournisseur</button>}</div>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th()}>Nom</th><th style={th()}>Contact</th><th style={th()}>E-mail</th><th style={th()}>Téléphone</th><th style={{ ...th(), textAlign: "right" }}>Lignes en cours</th></tr></thead>
        <tbody>{Object.values(S.fournisseurs).sort((a, b) => String(a.nom).localeCompare(String(b.nom))).map(f => <tr key={f.id} onClick={canEdit ? () => openFour(f) : undefined} style={{ cursor: canEdit ? "pointer" : "default", height: 36 }}>
          <td style={{ ...td(), fontWeight: 700 }}>{f.nom}</td><td style={{ ...td(), color: T.ink700 }}>{f.contact || "—"}</td><td style={{ ...td(), color: T.ink700 }}>{f.email || "—"}</td><td style={{ ...td(), color: T.ink700 }}>{f.tel || "—"}</td>
          <td style={{ ...td(), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{lines.filter(l => l.fournisseurId === f.id && l.st.k !== "done").length}</td></tr>)}
          {!Object.keys(S.fournisseurs).length && <tr><td colSpan={5} style={{ ...td(), color: T.ink500, textAlign: "center", padding: 18 }}>Aucun fournisseur pour l'instant.</td></tr>}</tbody>
      </table></div>
    </section>}

    {tab === "reglages" && owner && <section aria-label="Réglages" style={{ ...CARD(), display: "grid", gap: 14, maxWidth: 720 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: T.ink700, maxWidth: 260 }}>Marge avant l'arrivée du PJ (jours)
        <input type="number" min={0} defaultValue={S.params.marge} onBlur={e => { const n = Math.max(0, Number(e.target.value) || 0); if (n !== S.params.marge) api.setParams({ ...S.params, marge: n }).then(ok => notify(ok ? "Marge enregistrée." : "Enregistrement impossible.", !ok)); }} style={field()} />
        <span style={{ fontWeight: 400, color: T.ink500 }}>Date de besoin d'un composant = arrivée du PJ moins cette marge, sauf date saisie sur la ligne.</span></label>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink700, marginBottom: 4 }}>Accès à la page (en plus de vous)</div>
        <textarea rows={3} defaultValue={S.access.join("\n")} aria-label="Adresses ayant accès, une par ligne" onBlur={e => { const list = e.target.value.split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(x => /@enogia\.com$/.test(x)); if (list.join() !== S.access.join()) api.setAccess(list).then(ok => notify(ok ? "Accès enregistrés." : "Enregistrement impossible.", !ok)); }} style={{ ...field(), resize: "vertical", fontFamily: T.fontMono }} />
        <div style={{ fontSize: FZF.xs, color: T.ink500, marginTop: 4 }}>Une adresse @enogia.com par ligne. Ces personnes voient la page Achats / Appro et peuvent la modifier.</div>
      </div>
    </section>}

    {form && <FormDialog {...form} onClose={() => setForm(null)} />}
    {toast && <div role="status" style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 10020, background: toast.err ? T.red600 : T.ink900, color: T.card, padding: "8px 14px", borderRadius: 8, fontSize: FZF.sm, fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}><NavIcon name={toast.err ? "warning" : "check"} size={15} />{toast.msg}</div>}
  </div>);
}

// ===== FIN PAGE =====
