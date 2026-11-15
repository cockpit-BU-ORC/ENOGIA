// v146.23 — Fiche synthèse : certifications (cadre à part), prix de la fiche, date de livraison contractuelle et pénalités de retard.
// Chaque fiche (PJ461-1, PJ461-2…) porte ses propres valeurs ; le bandeau « PJ » additionne celles d'un même PJ (prix, pénalités)
// et un bouton recopie les conditions de pénalité / les certifications sur les autres fiches du PJ.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { T, FZF as FZ, btn as themeBtn } from "../theme";
import { etatColors } from "../pjMeta";
import { fmtEur } from "../pjProgress";
import { NavIcon } from "./SharedUI";
import { ETAT_SWATCHES } from "./EtatsDialog";
import { PEN_REFS, PEN_DEFAULT, penaltyCalc, ficheBase, siblingsOf, pjBase } from "../penalties";
import { askConfirm } from "../confirm";
import { useUnsavedGuard } from "../unsavedGuard";
import { AF } from "../autoFocusOk";

const fd = iso => iso ? new Date(String(iso).slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const capLbl = () => ({ fontSize: FZ.xs, fontWeight: 600, color: T.ink500, letterSpacing: ".01em" });
const inp = dirty => ({ padding: "4px 8px", borderRadius: 8, border: "1.5px solid " + (dirty ? T.teal500 : T.line), background: T.card, color: T.ink900, fontSize: FZ.sm, fontWeight: 600, fontFamily: T.font, minWidth: 0, width: "100%" });
const btn = () => themeBtn("sec", "sm"); // v291 (lot H) : bouton commun

// ── Certifications : catalogue global (nom + couleur) ───────────────────────────────────────────
export const certifSlug = t => "CERT_" + t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
export function CertifChip({ c, onRemove, small }) {
  const m = etatColors(c.color), p = T.mode === "dark" ? m.dark : m.light;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: p.bg, color: p.text, border: "1px solid " + p.border, borderRadius: 999, padding: small ? "1px 9px" : "3px 6px 3px 12px", fontSize: FZ.xs, fontWeight: 600, whiteSpace: "nowrap" }}>
    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: p.bar, flexShrink: 0, marginLeft: small ? 0 : -4 }} />{c.name}
    {onRemove && <button onClick={onRemove} title={"Retirer " + c.name} aria-label={"Retirer " + c.name} style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: "0 4px", fontSize: FZ.sm, lineHeight: 1 }}>×</button>}
  </span>;
}

export function CertifDialog({ onClose, certifs, setCertifs, usage }) {
  const [name, setName] = useState(""), [color, setColor] = useState("#4f9a7f"), [err, setErr] = useState("");
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const add = async () => {
    const t = name.trim(); if (!t) return;
    if (certifs.some(c => c.name.toLowerCase() === t.toLowerCase())) { setErr("Une certification porte déjà ce nom."); return; }
    const ids = new Set(certifs.map(c => c.id)); let id = certifSlug(t), n = 2; while (ids.has(id)) id = certifSlug(t) + "_" + n++;
    setErr("");
    if (await setCertifs([...certifs, { id, name: t, color }])) setName("");
  };
  const patch = (id, f) => setCertifs(certifs.map(c => c.id === id ? { ...c, ...f } : c));
  const del = id => { const n = usage(id); if (n > 0) { setErr("Cette certification est utilisée par " + n + " fiche" + (n > 1 ? "s" : "") + " : retirez-la d'abord de ces fiches."); return; } askConfirm({ title: "Supprimer cette certification ?", message: "Elle ne sera plus proposée dans les fiches. Aucune fiche ne l'utilise.", confirmLabel: "Supprimer la certification", danger: true }).then(ok => { if (ok) setCertifs(certifs.filter(c => c.id !== id)); }); };
  const fld = { padding: "6px 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.surface, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font };
  const lbl = { fontSize: FZ.xs, fontWeight: 600, color: T.ink500, letterSpacing: ".01em", margin: "0 0 6px" };
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Certifications" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: "fixed", inset: 0, zIndex: 20010, background: "rgba(10,16,28,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
    <div style={{ background: T.card, color: T.ink900, borderRadius: 12, boxShadow: T.shadowLg, border: "1px solid " + T.line, width: "min(560px,100%)", maxHeight: "90dvh", overflow: "auto", padding: 20, fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ flex: 1, fontFamily: T.fontDisplay, fontWeight: 600, fontSize: FZ.md }}>Certifications</div>
        <button onClick={onClose} style={btn()}>Fermer</button>
      </div>
      <div style={{ fontSize: FZ.sm, color: T.ink500, marginBottom: 14 }}>Une certification créée ici est proposée aussitôt dans la liste de toutes les fiches ; sa couleur est reprise partout où elle s'affiche.</div>
      {certifs.length > 0 && <>
        <div style={lbl}>Existantes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {certifs.map(c => (<div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "6px 10px", border: "1px solid " + T.line, borderRadius: 12 }}>
            <CertifChip c={c} />
            <input defaultValue={c.name} key={c.id + c.name} aria-label={"Nom de la certification " + c.name} maxLength={40} onBlur={ev => { const t = ev.target.value.trim(); if (t && t !== c.name) patch(c.id, { name: t }); else ev.target.value = c.name; }} style={{ ...fld, flex: 1, minWidth: 120 }} />
            <input type="color" value={c.color} onChange={ev => patch(c.id, { color: ev.target.value })} aria-label={"Couleur de " + c.name} style={{ width: 38, height: 30, border: "1px solid " + T.line, borderRadius: 8, background: "transparent", padding: 2, cursor: "pointer" }} />
            <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{usage(c.id)} fiche{usage(c.id) > 1 ? "s" : ""}</span>
            <button onClick={() => del(c.id)} style={{ ...btn(), color: T.red600 }}>Supprimer</button>
          </div>))}
        </div>
      </>}
      <div style={{ ...lbl, paddingTop: 12, borderTop: "1px solid " + T.line }}>Nouvelle certification</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input value={name} autoFocus={AF} onChange={e => { setName(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Nom (ex. ATEX, CE, UL…)" aria-label="Nom de la nouvelle certification" maxLength={40} style={{ ...fld, flex: 1, minWidth: 160 }} />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} aria-label="Couleur de la nouvelle certification" style={{ width: 42, height: 32, border: "1px solid " + T.line, borderRadius: 8, background: "transparent", padding: 2, cursor: "pointer" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
        {ETAT_SWATCHES.map(c => <button key={c} onClick={() => setColor(c)} title={c} aria-label={"Couleur " + c} style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (color === c ? T.ink900 : "transparent"), background: c, cursor: "pointer", padding: 0 }} />)}
        {name.trim() && <span style={{ marginLeft: 8 }}><CertifChip c={{ name: name.trim(), color }} /></span>}
        <button onClick={add} disabled={!name.trim()} style={{ marginLeft: "auto", border: "none", borderRadius: 12, padding: "7px 14px", background: name.trim() ? T.navy700 : T.ink100, color: name.trim() ? T.onFill : T.ink500, fontWeight: 600, fontSize: FZ.sm, cursor: name.trim() ? "pointer" : "default", fontFamily: T.font }}>Créer</button>
      </div>
      {err && <div role="alert" style={{ marginTop: 8, fontSize: FZ.xs, color: T.red600, fontWeight: 600 }}>{err}</div>}
    </div>
  </div>, document.body);
}

// ── Champs ──────────────────────────────────────────────────────────────────────────────────────
function NumInput({ label, value, onSave, unit, hint, max, step, width = 110 }) {
  const [v, setV] = useState(value == null ? "" : String(value));
  useEffect(() => { setV(value == null ? "" : String(value)); }, [value]);
  const num = v === "" ? null : Number(String(v).replace(/\s/g, "").replace(",", "."));
  const dirty = (num == null ? null : num) !== (value == null ? null : value);
  const commit = () => { if (!dirty) return; if (num != null && (isNaN(num) || num < 0 || (max != null && num > max))) { setV(value == null ? "" : String(value)); return; } onSave(num); };
  return <div style={{ minWidth: 0 }}>
    <div style={capLbl()}>{label}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
      <input type="text" inputMode="decimal" value={v} step={step} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} placeholder="0" aria-label={label}
        style={{ ...inp(dirty), maxWidth: width, textAlign: "right" }} />
      {unit && <span style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink500 }}>{unit}</span>}
    </div>
    {hint && <div style={{ fontSize: FZ.xs, color: T.ink300, marginTop: 2 }}>{hint}</div>}
  </div>;
}
// Plafond : nombre + unité (% du prix / €) dans un seul champ, sur la même ligne que les autres conditions
function CapInput({ value, type, base, onSave }) {
  const [v, setV] = useState(value == null ? "" : String(value));
  useEffect(() => { setV(value == null ? "" : String(value)); }, [value]);
  const eur = type === "eur";
  const num = v === "" ? null : Number(String(v).replace(/\s/g, "").replace(",", "."));
  const dirty = (num == null ? null : num) !== (value == null ? null : value);
  const commit = () => { if (!dirty) return; if (num != null && (isNaN(num) || num < 0 || (!eur && num > 100))) { setV(value == null ? "" : String(value)); return; } onSave({ cap: num }); };
  return <div style={{ minWidth: 0 }}>
    <div style={{ ...capLbl(), display: "flex", justifyContent: "space-between", gap: 6 }}><span>Plafond</span><span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600, color: T.ink300 }}>{value && base ? "= " + fmtEur(eur ? Number(value) : base * Number(value) / 100) : "vide = sans"}</span></div>
    <div className="e-fw" style={{ display: "flex", alignItems: "stretch", marginTop: 3, border: "1.5px solid " + (dirty ? T.teal500 : T.line), borderRadius: 8, background: T.card, overflow: "hidden" }}>
      <input type="text" inputMode="decimal" value={v} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} placeholder="—" aria-label="Plafond"
        style={{ flex: 1, minWidth: 0, width: 56, border: "none", outline: "none", background: "transparent", color: T.ink900, fontSize: FZ.sm, fontWeight: 600, fontFamily: T.font, textAlign: "right", padding: "4px 6px" }} />
      <select value={type} onChange={e => onSave({ capType: e.target.value })} aria-label="Unité du plafond" style={{ border: "none", borderLeft: "1px solid " + T.line, background: T.surfaceAlt, color: T.ink700, fontSize: FZ.xs, fontWeight: 600, fontFamily: T.font, padding: "0 4px", cursor: "pointer" }}>
        <option value="pct">% du prix</option><option value="eur">€</option>
      </select>
    </div>
  </div>;
}
function SelInput({ label, value, onSave, options, hint }) {
  return <div style={{ minWidth: 0 }}>
    <div style={capLbl()}>{label}</div>
    <select value={value} onChange={e => onSave(e.target.value)} aria-label={label} style={{ ...inp(false), marginTop: 3, cursor: "pointer" }}>
      {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
    {hint && <div style={{ fontSize: FZ.xs, color: T.ink300, marginTop: 2 }}>{hint}</div>}
  </div>;
}
const Sub = ({ title, right }) => <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
  <span style={{ fontSize: FZ.sm, fontWeight: 600, color: T.ink900, whiteSpace: "nowrap" }}>{title}</span>
  <span style={{ flex: 1, height: 1, background: T.line, minWidth: 8 }} />
  {right && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{right}</span>}
</div>;
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 8, alignItems: "start" };

// ── Panneau complet ─────────────────────────────────────────────────────────────────────────────
// v146.28 : la certification n'est plus un cadre : un simple élément de l'en-tête de la fiche, comme le N° de série.
export function CertifTag({ r, meta, rows, getMeta, save, saveMulti, certifs, setCertifs }) {
  const [dlg, setDlg] = useState(false), [copied, setCopied] = useState(""), [open, setOpen] = useState(false), box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const down = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); }, key = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down); window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); window.removeEventListener("keydown", key); };
  }, [open]);
  const editable = !!save;
  const mine = Array.isArray(meta.certifs) ? meta.certifs : [];
  const byId = Object.fromEntries((certifs || []).map(c => [c.id, c]));
  const usage = id => (rows || []).filter(x => (getMeta(x.pj, x).certifs || []).includes(id)).length;
  const others = siblingsOf(rows, r.pj).filter(x => x.pj !== r.pj);
  const setCerts = ids => save({ certifs: ids.length ? ids : undefined });
  const pick = async v => {
    if (v === "__MANAGE__") { setDlg(true); return; }
    if (v === "__COPY__") { const patch = {}; others.forEach(x => { patch[x.pj] = { certifs: mine }; }); if (await saveMulti(patch)) { setCopied("Copié sur " + others.length + " fiche" + (others.length > 1 ? "s" : "")); setTimeout(() => setCopied(""), 3500); } return; }
    if (v && !mine.includes(v)) setCerts([...mine, v]);
  };
  if (!editable && !mine.length) return null;
  const first = mine[0] || "", extra = mine.slice(1);
  const cur = byId[first] || null;
  const pal = c => { const m = etatColors(c.color); return T.mode === "dark" ? m.dark : m.light; };
  const choose = v => { setOpen(false); if (v === "__MANAGE__" || v === "__COPY__") pick(v); else setCerts(v ? [v, ...extra.filter(x => x !== v)] : []); };
  const triggerP = cur ? pal(cur) : null;
  const itemSt = { display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "5px 8px", borderRadius: 8, cursor: "pointer", fontFamily: T.font, fontSize: FZ.xs, color: T.ink700, fontWeight: 600 };
  return <span ref={box} style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", position: "relative" }}>
    <span style={{ fontSize: FZ.xs, color: T.ink500, fontWeight: 600, whiteSpace: "nowrap" }}>Certification machine :</span>
    {editable
      ? <>
        <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={"Certification machine : " + (cur ? cur.name : first || "aucune") + " — changer"}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "3px 10px 3px 12px", fontSize: FZ.xs, fontWeight: 600, fontFamily: T.font, cursor: "pointer", maxWidth: 240, whiteSpace: "nowrap",
            border: triggerP ? "1.5px solid " + triggerP.border : "1.5px dashed " + T.teal500, background: triggerP ? triggerP.bg : T.teal100, color: triggerP ? triggerP.text : T.teal600 }}>
          <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: triggerP ? triggerP.bar : T.teal500, flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{cur ? cur.name : first ? first + " (supprimée)" : "Choisir…"}</span>
          <span aria-hidden="true" style={{ fontSize: 12, opacity: .8 }}>▾</span>
        </button>
        {open && <div role="listbox" aria-label="Certifications machine" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 40, minWidth: 230, maxHeight: 320, overflowY: "auto", background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,.18)", padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
          <button type="button" role="option" aria-selected={!first} onClick={() => choose("")} style={{ ...itemSt, color: T.ink500 }}>— Aucune —</button>
          {(certifs || []).map(c => { const p = pal(c); return <button key={c.id} type="button" role="option" aria-selected={c.id === first} onClick={() => choose(c.id)} style={{ ...itemSt, background: c.id === first ? p.bg : "transparent" }}>
            <CertifChip c={c} small />{c.id === first && <span aria-hidden="true" style={{ marginLeft: "auto", color: p.text }}>✓</span>}
          </button>; })}
          {first && !byId[first] && <button type="button" role="option" aria-selected onClick={() => choose(first)} style={itemSt}>{first} (supprimée du catalogue)</button>}
          <div style={{ height: 1, background: T.line, margin: "3px 0" }} />
          {mine.length > 0 && others.length > 0 && saveMulti && <button type="button" onClick={() => choose("__COPY__")} style={itemSt}>⧉ Copier sur les {others.length} autre{others.length > 1 ? "s" : ""} fiche{others.length > 1 ? "s" : ""} du {pjBase(r.pj)}</button>}
          <button type="button" onClick={() => choose("__MANAGE__")} style={{ ...itemSt, color: T.teal600, fontWeight: 600 }}>＋ Créer / gérer les certifications…</button>
        </div>}
      </>
      : (byId[first] ? <CertifChip c={byId[first]} small /> : null)}
    {extra.map(id => byId[id] ? <CertifChip key={id} c={byId[id]} small onRemove={editable ? () => setCerts(mine.filter(x => x !== id)) : null} /> : null)}
    {copied && <span role="status" style={{ fontSize: FZ.xs, color: T.emerald600, fontWeight: 600 }}>{copied} ✓</span>}
    {dlg && <CertifDialog onClose={() => setDlg(false)} certifs={certifs || []} setCertifs={setCertifs} usage={usage} />}
  </span>;
}

export function FicheContratPanel({ part, r, meta, rows, getMeta, today, save, saveMulti }) {
  const [copied, setCopied] = useState("");
  const sib = siblingsOf(rows, r.pj), others = sib.filter(x => x.pj !== r.pj);
  // v288 (lot E, sécurité des actions) : « ＋ Définir les pénalités » ouvre un brouillon — rien n'est enregistré ni compté
  // dans les totaux avant « Enregistrer les pénalités » (avant : un clic enregistrait des pénalités actives par défaut).
  const savedPen = meta.penalite ? { ...PEN_DEFAULT, ...meta.penalite } : null;
  const [draft, setDraft] = useState(null);
  useEffect(() => { setDraft(null); }, [r.pj]);
  useUnsavedGuard(!savedPen && !!draft); // v340
  const isDraft = !savedPen && !!draft;
  const pen = savedPen || draft;
  const setPen = f => { if (savedPen) save({ penalite: { ...savedPen, ...f } }); else setDraft(d => ({ ...(d || PEN_DEFAULT), ...f })); };
  const calc = penaltyCalc(isDraft ? { ...meta, penalite: draft } : meta, r.depart, today), active = !pen || pen.actif !== false;
  const base = ficheBase(meta);

  const flash = t => { setCopied(t); setTimeout(() => setCopied(""), 3500); };
  const copyTo = async (fields, label) => {
    const patch = {}; others.forEach(x => { patch[x.pj] = fields; });
    if (await saveMulti(patch)) flash(label + " copié" + (label.endsWith("s") ? "es" : "") + " sur " + others.length + " fiche" + (others.length > 1 ? "s" : ""));
  };
  const sibRows = sib.map(x => { const m = getMeta(x.pj, x); return { pj: x.pj, base: ficheBase(m), c: penaltyCalc(m, x.depart, today) }; });
  const totPrice = sibRows.reduce((s, x) => s + (x.base || 0), 0);
  const totPen = sibRows.reduce((s, x) => s + (x.c.status === "ok" ? x.c.amount : 0), 0);

  const result = () => {
    if (!pen) return null;
    if (calc.status === "incomplete") return <div style={{ marginTop: 8, fontSize: FZ.xs, color: T.amber600, background: T.amber100, borderRadius: 8, padding: "5px 9px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><NavIcon name="warning" size={12} />À compléter pour le calcul : {calc.missing.join(", ")}.</div>;
    const late = calc.lateDays > 0;
    const col = calc.amount > 0 ? T.red500 : late ? T.amber600 : T.emerald600;
    const cell = (lab, val, vcol, sub, big) => <div style={{ minWidth: 0 }}><div style={{ ...capLbl(), fontSize: 12, whiteSpace: "nowrap" }}>{lab}</div>
      <div style={{ fontWeight: 600, fontSize: big ? FZ.lg : FZ.sm, color: vcol, marginTop: 2, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>{val}</div>
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={sub}>{sub}</div></div>;
    return <div style={{ marginTop: 8, background: T.surfaceAlt, borderRadius: 12, padding: "7px 10px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))", gap: 8 }}>
      {cell("Pénalités", calc.amount > 0 ? fmtEur(calc.amount) : "0 €", col, calc.capped ? "plafond atteint" : calc.provisional ? "à ce jour" : "prévision", true)}
      {cell("Retard", late ? calc.lateDays + " j" : "dans les temps", late ? T.red500 : T.emerald600, fd(calc.contract) + " → " + (calc.effective ? fd(calc.effective) : "—"))}
      {cell("Semaines", String(calc.chargeableWeeks), T.ink900, calc.weekly != null ? fmtEur(calc.weekly) + " / sem." : "") }
      {cell("Début", fd(calc.startDate), T.ink900, pen.graceWeeks > 0 ? pen.graceWeeks + " sem. de grâce" : "sans grâce")}
    </div>;
  };

  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    {/* Prix de la fiche (base de calcul des pénalités) */}
    {<div>
      <Sub title="Prix de la fiche" />
      <div style={grid}>
        <NumInput label="Prix de la fiche" value={meta.prixFiche == null ? null : Number(meta.prixFiche)} unit="€" width={120} onSave={n => save({ prixFiche: n == null || n === 0 ? undefined : n })}
          hint={meta.prixFiche ? "base des pénalités" : base ? "défaut : montant global (" + fmtEur(base) + ")" : "non renseigné"} />
      </div>
      {sib.length > 1 && <div style={{ marginTop: 6, fontSize: FZ.xs, color: T.ink500 }}>{pjBase(r.pj)} : {sib.length} fiches · prix cumulé {totPrice > 0 ? fmtEur(totPrice) : "—"}{sibRows.some(x => x.base == null) ? " (certaines fiches sans prix)" : ""}</div>}
    </div>}

    {/* Pénalités */}
    {<div>
      <Sub title="Pénalités de retard" right={savedPen ? <button onClick={async () => { if (await askConfirm({ title: "Retirer les pénalités de cette fiche ?", message: "Les conditions de pénalité sont effacées et ne comptent plus dans les totaux ni les rapports.", confirmLabel: "Retirer les pénalités", danger: true })) save({ penalite: undefined }); }} style={{ ...btn(), padding: "1px 8px" }}>Retirer</button> : null} />
      {!pen ? <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: FZ.sm, color: T.ink300 }}>Aucune condition de pénalité sur cette fiche</span>
        <button onClick={() => setDraft({ ...PEN_DEFAULT })} style={{ ...btn(), color: T.accentInk }}>＋ Définir les pénalités</button>
      </div> : <>
        {isDraft && <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 12px", borderRadius: 8, background: T.amber100, color: T.ink900, marginBottom: 8, fontSize: FZ.sm }}>
          <span style={{ flex: "1 1 220px" }}><b>Brouillon</b> — rien n'est enregistré ni compté dans les totaux tant que vous n'avez pas enregistré.</span>
          <button type="button" className="e-btn e-btn-sec" onClick={() => setDraft(null)} style={{ ...btn(), minHeight: 30 }}>Annuler</button>
          <button type="button" className="e-btn e-btn-pri" onClick={() => { save({ penalite: { ...draft } }); setDraft(null); }} style={{ ...btn(), minHeight: 30, background: T.ink900, color: T.card, borderColor: T.ink900 }}>Enregistrer les pénalités</button>
        </div>}
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderRadius: 12, cursor: "pointer", marginBottom: 6,
          background: active ? T.red100 : T.surfaceAlt, border: "1.5px solid " + (active ? T.red500 : T.line) }}>
          <input type="checkbox" checked={active} onChange={e => setPen({ actif: e.target.checked })} style={{ width: 17, height: 17, accentColor: T.red500, cursor: "pointer", flexShrink: 0 }} />
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: FZ.sm, fontWeight: 600, color: active ? T.red600 : T.ink700 }}>Pénalités activées par le client</span>
            <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{active ? "Calculées et comptées dans les totaux." : "Non activées : conditions conservées, aucun montant compté."}</span>
          </span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "6px 14px", alignItems: "start", opacity: active ? 1 : .55 }}>
          <div style={{ minWidth: 0 }}><SelInput label="À partir de" value={pen.ref} onSave={v => setPen({ ref: v })} options={Object.entries(PEN_REFS).map(([k, x]) => [k, x.label])} /></div>
          <div style={{ minWidth: 0 }}><NumInput label="Taux (du prix)" value={pen.ratePct == null ? null : Number(pen.ratePct)} unit="%/sem" max={100} width={64} onSave={n => setPen({ ratePct: n })} /></div>
          <div style={{ minWidth: 0 }}><NumInput label="Période de grâce" value={Number(pen.graceWeeks) || 0} unit="sem." max={104} width={64} onSave={n => setPen({ graceWeeks: n || 0 })} /></div>
          <div style={{ minWidth: 0 }}><CapInput value={pen.cap == null ? null : Number(pen.cap)} type={pen.capType} base={base} onSave={setPen} /></div>
        </div>
        {active && result()}
        <div style={{ fontSize: FZ.xs, color: T.ink300, marginTop: 6 }}>
          {pen.ref === "mad" ? "Prévision = fin projetée du planning, comparée à la MaD ORC contractuelle." : "Prévision = « Livraison prévue » de la section Planning ; à défaut, la date du jour si l'échéance est dépassée."} Semaine entamée = semaine due, après la période de grâce.
        </div>
        {others.length > 0 && !isDraft && <div style={{ marginTop: 6 }}><button onClick={() => copyTo({ penalite: pen }, "Conditions")} style={btn()}>Copier les conditions sur les {others.length} autre{others.length > 1 ? "s" : ""} fiche{others.length > 1 ? "s" : ""} du {pjBase(r.pj)}</button></div>}
      </>}
      {sib.length > 1 && sibRows.some(x => x.c.status !== "off") && <div style={{ marginTop: 10, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ ...capLbl(), padding: "6px 10px", background: T.surfaceAlt }}>Pénalités du {pjBase(r.pj)} · toutes fiches</div>
        {sibRows.map(x => <div key={x.pj} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "4px 10px", fontSize: FZ.xs, borderTop: "1px solid " + T.line, background: x.pj === r.pj ? T.surfaceAlt : "transparent", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, color: T.ink900, minWidth: 74 }}>{x.pj}</span>
          <span style={{ color: T.ink500, flex: 1 }}>{x.c.status === "off" ? "pas de pénalité définie" : x.c.status === "inactive" ? "non activées par le client" : x.c.status === "incomplete" ? "à compléter : " + x.c.missing.join(", ") : (x.c.lateDays > 0 ? x.c.lateDays + " j de retard · " : "dans les temps · ") + x.c.chargeableWeeks + " sem."}</span>
          <span style={{ fontWeight: 600, color: x.c.amount > 0 ? T.red500 : T.ink500 }}>{x.c.status === "ok" ? fmtEur(x.c.amount) : "—"}</span>
        </div>)}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", fontSize: FZ.xs, fontWeight: 600, borderTop: "1px solid " + T.line, color: T.ink900 }}><span>Total {pjBase(r.pj)}</span><span style={{ color: totPen > 0 ? T.red500 : T.ink900 }}>{fmtEur(totPen)}</span></div>
      </div>}
      {copied && <div role="status" style={{ marginTop: 6, fontSize: FZ.xs, color: T.emerald600, fontWeight: 600 }}>{copied} ✓</div>}
    </div>}
  </div>);
}
