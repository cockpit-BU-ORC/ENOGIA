// v337 (maquette maquettes-design/v336-fiche-tests.html validée : « Go, code-la » ; évolutions D12, D13, D14) — briques de la fiche de tests :
// fil des 6 étapes, livret de configuration en double page (D13), fréquences turbines et vibrations (D14), checklist de tests au format de la
// checklist de debug avec les demandes spécifiques du client (D12), signature au doigt ou à la souris.
import React, { useEffect, useRef, useState } from "react";
import { T, FZF as FZ, btn as themeBtn } from "../theme";
import { SECTIONS, statusOf } from "../testPlan";
import { DEBUG_FIELDS } from "../debugChecklist";
import { BOOK_DOC, vibOver, vibProgress, testRows, setTestMark, setTestDetail, addAsk, delAsk } from "../testFiche";
import { bookStepsOf, manualProgress, filterSteps, setStep, stepStatus, STEP_STATUS, exportCsv, exportJson, parseExport, printHtml } from "../manualImport";
import { askConfirm } from "../confirm";

const B = (v = "sec", s = "sm") => ({ ...themeBtn(v, s), flexShrink: 0 });
const field = () => ({ padding: "4px 6px", minHeight: 30, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.xs, fontFamily: T.font, boxSizing: "border-box", width: "100%" });
const fdt = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }); };

export function Ring({ v, max, bad, size = 64 }) {
  const r = size / 2 - 6, c = 2 * Math.PI * r, p = max ? v / max : 0;
  return <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} aria-hidden="true" style={{ flexShrink: 0 }}>
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.surfaceAlt} strokeWidth={7} />
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bad ? T.red500 : T.emerald500} strokeWidth={7} strokeLinecap="round" strokeDasharray={(c * p) + " " + c} transform={"rotate(-90 " + size / 2 + " " + size / 2 + ")"} />
    <text x={size / 2} y={size / 2 + 5} textAnchor="middle" style={{ fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 600, fill: T.ink900, fontVariantNumeric: "tabular-nums" }}>{Math.round(p * 100)}%</text></svg>;
}
const Bars = ({ total, ok, bad }) => <div aria-hidden="true" style={{ display: "flex", gap: 2, marginTop: 8 }}>{Array.from({ length: Math.min(total, 60) }, (_, i) => <i key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: i < ok ? T.emerald500 : i < ok + bad ? T.red500 : T.surfaceAlt }} />)}</div>;

// ── fil des étapes (gauche de la fiche)
export function StepRail({ steps, cur, onPick }) {
  return <ol aria-label="Étapes de la fiche" style={{ listStyle: "none", margin: 0, padding: 0, position: "relative" }}>
    <span aria-hidden="true" style={{ position: "absolute", left: 21, top: 18, bottom: 18, width: 2, background: T.line }} />
    {steps.map((s, i) => { const on = i === cur, done = s.st === "done", bad = s.st === "bad";
      return <li key={s.id} style={{ position: "relative" }}><button type="button" onClick={() => onPick(i)} aria-current={on ? "step" : undefined}
        style={{ width: "100%", display: "grid", gridTemplateColumns: "30px 1fr", gap: 10, alignItems: "center", textAlign: "left", border: "none", borderRadius: 8, padding: "8px 6px", minHeight: 52, cursor: "pointer", fontFamily: T.font, background: on ? T.card : "transparent", boxShadow: on ? "inset 3px 0 0 " + T.ink900 + ", " + T.shadowSm : "none" }}>
        <span aria-hidden="true" style={{ position: "relative", zIndex: 1, width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 13, background: done ? T.emerald600 : T.card, border: "2px " + (done || on ? "solid " : "dashed ") + (done ? T.emerald600 : bad ? T.red500 : on ? T.ink900 : T.line), color: done ? T.card : on ? T.ink900 : T.ink500 }}>{done ? "✓" : i + 1}</span>
        <span style={{ minWidth: 0 }}><span style={{ display: "block", fontWeight: 600, fontSize: FZ.sm, color: T.ink900 }}>{s.t}</span><span style={{ display: "block", fontSize: 12, color: bad ? T.red600 : done ? T.emerald600 : T.ink500, fontWeight: bad || done ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.s}</span></span>
      </button></li>; })}
  </ol>;
}
export const StepHead = ({ title, lead }) => <div style={{ marginBottom: 14 }}><h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 600, color: T.ink900 }}>{title}</h2>{lead && <p style={{ margin: "4px 0 0", color: T.ink500, fontSize: FZ.sm, maxWidth: "68ch" }}>{lead}</p>}</div>;

// ── D13 : livret de configuration (manuel Word découpé en chapitres et en étapes, manualImport.js)
// Par étape : case de validation, statut (À faire, OK, Problème), commentaire. Suivi : progression, filtres, synthèse des problèmes ;
// exports CSV, JSON, PDF imprimable ; réimport d'un export (JSON ou CSV) pour reprendre une session. Réponses : plans[PJ].book.rows.
const download = (name, text, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
const ST_TONE = { todo: () => [T.ink700, T.surfaceAlt], ok: () => [T.emerald600, T.emerald100], pb: () => [T.red600, T.red100] };
function useBookIo({ r, plan, book, saveTests, who, meta }) {
  const rows = (plan.book && plan.book.rows) || {}, info = { title: book.title || BOOK_DOC.title, ref: book.ref || "", pj: r.pj, nom: meta && meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : "", at: new Date().toISOString() };
  const base = (book.ref ? book.ref + " - " : "") + "Livret " + r.pj;
  const save = nr => saveTests({ ...plan, book: { ...(plan.book || {}), rows: nr, at: new Date().toISOString() } });
  return {
    rows, info, save,
    setRow: (id, patch) => save(setStep(rows, id, patch, who)),
    csv: () => download(base + ".csv", exportCsv(book, rows, info), "text/csv;charset=utf-8"),
    json: () => download(base + ".json", exportJson(book, rows, info), "application/json"),
    pdf: () => { const w = window.open("", "_blank"); if (!w) return false; w.document.open(); w.document.write(printHtml(book, rows, info)); w.document.close(); return true; },
    reimport: async file => {
      const res = parseExport(await file.text(), book);
      if (!res.n) throw new Error("aucune réponse reconnue dans ce fichier" + (res.unknown ? " (" + res.unknown + " étapes absentes du livret actuel)" : ""));
      const other = res.pj && res.pj !== r.pj;
      if (!(await askConfirm({ title: "Reprendre la session du fichier ?", message: res.n + " réponse" + (res.n > 1 ? "s" : "") + " (validation, statut, commentaire)" + (other ? " d'un autre PJ (" + res.pj + ")" : "") + " remplaceront celles de ces étapes pour " + r.pj + "." + (res.unknown ? " " + res.unknown + " étape(s) absente(s) du livret actuel ignorée(s)." : ""), confirmLabel: "Reprendre la session" }))) return 0;
      await save({ ...rows, ...res.rows }); return res.n;
    },
  };
}
function IoButtons({ io, canMark, compact }) {
  const fileRef = useRef(null), [msg, setMsg] = useState("");
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
    <button type="button" onClick={io.csv} style={B("sec", "sm")}>Export CSV</button>
    <button type="button" onClick={io.json} style={B("sec", "sm")}>Export JSON</button>
    <button type="button" onClick={() => { if (!io.pdf()) setMsg("Le navigateur a bloqué la fenêtre : autorisez les fenêtres pour ce site."); }} style={B("sec", "sm")}>PDF imprimable</button>
    {canMark && <><button type="button" onClick={() => fileRef.current && fileRef.current.click()} style={B("ghost", "sm")}>Reprendre une session…</button>
      <input ref={fileRef} type="file" accept=".json,.csv,.txt" aria-label="Fichier d'export du livret à reprendre" style={{ display: "none" }} onChange={async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; try { const n = await io.reimport(f); if (n) setMsg(n + " réponse" + (n > 1 ? "s" : "") + " reprise" + (n > 1 ? "s" : "")); } catch (x) { setMsg("Reprise impossible : " + x.message); } }} /></>}
    {msg && <span role="status" style={{ fontSize: 12, color: /impossible|bloqué/.test(msg) ? T.red600 : T.emerald600, fontWeight: 600, flexBasis: compact ? "100%" : "auto" }}>{msg}</span>}
  </div>;
}
export function BookStep({ r, plan, book, bookApi, canMark, saveTests, who, canAdmin, meta }) {
  const [open, setOpen] = useState(false), [focus, setFocus] = useState(null);
  const steps = bookStepsOf(book);
  const io = useBookIo({ r, plan, book: book || {}, saveTests, who, meta }), pr = manualProgress(book, io.rows);
  if (!steps.length) return <div style={{ border: "1px dashed " + T.line, borderRadius: 12, padding: 16, color: T.ink700, fontSize: FZ.sm }}>Le livret de configuration n'est pas encore chargé.{canAdmin ? " Importez le manuel Word dans Tests › Checklists › Livret de configuration : il est découpé en chapitres et en étapes." : " Un administrateur l'importe dans Tests › Checklists."}</div>;
  return <>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,200px) minmax(0,1fr)", gap: 24, alignItems: "start" }} className="enogia-book-cover">
      <button type="button" onClick={() => { setFocus(null); setOpen(true); }} aria-label={"Ouvrir le livret de configuration de " + r.pj}
        style={{ position: "relative", aspectRatio: "210 / 297", borderRadius: "4px 10px 10px 4px", background: T.navy700 || T.teal500, color: T.card, padding: "20px 14px 14px 22px", boxShadow: T.shadowLg, border: "none", textAlign: "left", cursor: "pointer", fontFamily: T.font }}>
        <span aria-hidden="true" style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 2, background: "color-mix(in srgb, " + T.card + " 22%, transparent)" }} />
        <span aria-hidden="true" style={{ position: "absolute", right: 14, top: -4, width: 16, height: 40, background: T.amber500, clipPath: "polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)" }} />
        <span style={{ display: "block", fontSize: 11, opacity: 0.8 }}>{book.ref || "ENOGIA"}</span>
        <span style={{ display: "block", fontFamily: T.fontDisplay, fontSize: 19, fontWeight: 600, lineHeight: 1.12, margin: "10px 0 6px" }}>{book.title || BOOK_DOC.title}</span>
        <span style={{ display: "block", fontSize: 11, opacity: 0.85 }}>{r.pj}{r.gamme ? " · " + r.gamme : ""}</span>
        <span style={{ position: "absolute", left: 22, right: 14, bottom: 12, fontSize: 11, opacity: 0.85, display: "flex", justifyContent: "space-between" }}><span>{book.chapters.length} chapitres</span><span>{pr.valid} / {pr.total}</span></span>
      </button>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: FZ.sm }}><b style={{ color: T.ink900 }}>{pr.valid} / {pr.total} étapes validées</b><span style={{ color: T.emerald600, fontWeight: 600 }}>{pr.ok} OK</span><span style={{ color: pr.pb ? T.red600 : T.ink500, fontWeight: 600 }}>{pr.pb} problème{pr.pb > 1 ? "s" : ""}</span><span style={{ color: T.ink500 }}>{pr.todo} à faire</span></div>
          <div role="progressbar" aria-label="Étapes validées" aria-valuenow={pr.total ? Math.round(pr.valid / pr.total * 100) : 0} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, borderRadius: 4, background: T.surfaceAlt, overflow: "hidden", marginTop: 6 }}><i style={{ display: "block", height: "100%", width: (pr.total ? pr.valid / pr.total * 100 : 0) + "%", background: T.emerald500 }} /></div>
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid " + T.line }}>
          {pr.byChap.map((c, i) => <li key={c.id}><button type="button" onClick={() => { setFocus({ chap: c.id }); setOpen(true); }} style={{ width: "100%", display: "flex", gap: 12, padding: "9px 2px", minHeight: 40, border: "none", borderBottom: "1px solid " + T.line, background: "transparent", fontSize: FZ.sm, color: T.ink900, cursor: "pointer", textAlign: "left", fontFamily: T.font }}>
            <span style={{ fontFamily: T.fontDisplay, fontWeight: 600, color: T.ink500, minWidth: 18 }}>{i + 1}</span><span style={{ flex: 1, minWidth: 0 }}>{c.title}</span>
            <em style={{ fontStyle: "normal", color: c.pb ? T.red600 : T.ink500, fontWeight: c.pb ? 600 : 500, fontVariantNumeric: "tabular-nums" }}>{c.pb ? c.pb + " problème" + (c.pb > 1 ? "s" : "") + " · " : ""}{c.valid} / {c.total}</em></button></li>)}
        </ol>
        {pr.problems.length > 0 && <div style={{ border: "1px solid " + T.red500, background: T.red100, borderRadius: 8, padding: "8px 10px", fontSize: 13 }}><b style={{ color: T.red600 }}>Problèmes signalés ({pr.problems.length})</b>
          {pr.problems.slice(0, 4).map(p => <div key={p.id} style={{ marginTop: 4, color: T.ink900 }}><button type="button" onClick={() => { setFocus({ id: p.id }); setOpen(true); }} style={{ border: "none", background: "transparent", padding: 0, color: T.ink900, fontWeight: 600, cursor: "pointer", textDecoration: "underline", fontFamily: T.font, fontSize: 13 }}>{p.title}</button>{p.c ? " : " + p.c : ""}</div>)}
          {pr.problems.length > 4 && <div style={{ color: T.ink700, marginTop: 4 }}>+ {pr.problems.length - 4} autre{pr.problems.length - 4 > 1 ? "s" : ""} dans le livret</div>}</div>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => { setFocus(null); setOpen(true); }} style={B("pri", "md")}>{canMark ? (pr.valid || pr.ok || pr.pb ? "Reprendre le livret" : "Ouvrir le livret") : "Consulter le livret"}</button>
          <IoButtons io={io} canMark={canMark} />
        </div>
      </div>
    </div>
    {open && <BookReader {...{ r, book, bookApi, canMark, io, focus }} onClose={() => setOpen(false)} />}
  </>;
}
function BookImg({ k, src, bookApi }) {
  const [url, setUrl] = useState(null), [none, setNone] = useState(false);
  useEffect(() => { let on = true; if (!k || !bookApi) { setNone(true); return undefined; } bookApi.loadImg(k).then(d => { if (!on) return; if (d) setUrl(d); else setNone(true); }); return () => { on = false; }; }, [k, bookApi]);
  if (none) return <div style={{ fontSize: 12, color: T.ink500, border: "1px dashed " + T.line, borderRadius: 6, padding: 8, margin: "6px 0" }}>Image non disponible ({src})</div>;
  return url ? <img src={url} alt="" style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: 4, margin: "8px 0", border: "1px solid " + T.line, background: "#FFFFFF" }} /> : <div aria-hidden="true" style={{ height: 120, borderRadius: 4, background: T.surfaceAlt, margin: "8px 0" }} />;
}
function Blocks({ blocks, book, bookApi }) {
  return blocks.map((b, i) => b.t === "img" ? <BookImg key={i} src={b.src} k={(book.images || {})[b.src]} bookApi={bookApi} />
    : b.t === "table" ? <div key={i} style={{ overflowX: "auto", margin: "8px 0" }}><table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}><tbody>{b.rows.map((rw, j) => <tr key={j}>{rw.map((c, k) => <td key={k} style={{ border: "1px solid " + T.line, padding: "4px 6px", fontWeight: j === 0 ? 600 : 400, background: j === 0 ? T.surfaceAlt : "transparent", verticalAlign: "top" }}>{c}</td>)}</tr>)}</tbody></table></div>
    : <p key={i} style={{ margin: "0 0 7px", fontSize: FZ.sm, lineHeight: 1.5, color: b.cap ? T.ink500 : T.ink900, fontStyle: "normal", paddingLeft: b.list ? 16 : 0, position: "relative", whiteSpace: "pre-line" }}>{b.list && <span aria-hidden="true" style={{ position: "absolute", left: 2 }}>•</span>}{b.text}</p>);
}
function StepCtl({ s, row, canMark, io }) {
  const st = stepStatus(row);
  return <div style={{ borderTop: "1px solid " + T.line, paddingTop: 10, marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: FZ.sm, fontWeight: 600, color: T.ink900, minHeight: 32, cursor: canMark ? "pointer" : "default" }}><input type="checkbox" disabled={!canMark} checked={!!(row && row.v)} onChange={e => io.setRow(s.id, { v: e.target.checked })} style={{ width: 20, height: 20 }} />Étape validée</label>
      <span style={{ flex: 1 }} />
      <div role="radiogroup" aria-label={"Statut : " + s.title} style={{ display: "inline-flex", gap: 2, background: T.surfaceAlt, borderRadius: 8, padding: 2 }}>
        {STEP_STATUS.map(([v, l]) => { const on = st === v, [ink, bg] = ST_TONE[v](); return <button key={v} type="button" role="radio" aria-checked={on} disabled={!canMark} onClick={() => io.setRow(s.id, { s: v })}
          style={{ border: "none", borderRadius: 8, minHeight: 32, padding: "0 12px", fontSize: 12, fontWeight: 600, fontFamily: T.font, cursor: canMark ? "pointer" : "default", background: on ? bg : "transparent", color: on ? ink : T.ink500 }}>{l}</button>; })}
      </div>
    </div>
    <textarea rows={2} disabled={!canMark} key={s.id + ((row && row.c) || "")} defaultValue={(row && row.c) || ""} placeholder={st === "pb" ? "Décrivez le problème" : "Commentaire (facultatif)"} aria-label={"Commentaire : " + s.title}
      onBlur={e => { const t = e.target.value.trim(); if (t !== ((row && row.c) || "")) io.setRow(s.id, { c: t }); }} style={{ ...field(), fontSize: FZ.sm, resize: "vertical", borderColor: st === "pb" ? T.red500 : T.line }} />
    {row && row.by && <span style={{ fontSize: 11, color: T.ink500 }}>{row.by}{row.at ? " · " + fdt(row.at) : ""}</span>}
  </div>;
}
function BookReader({ r, book, bookApi, canMark, io, focus, onClose }) {
  const [flt, setFlt] = useState({ status: "all", chap: (focus && focus.chap) || "", q: "" }), [showPb, setShowPb] = useState(false);
  const list = filterSteps(book, io.rows, flt), pr = manualProgress(book, io.rows);
  const [cur, setCur] = useState(() => { if (focus && focus.id) { const i = bookStepsOf(book).findIndex(s => s.id === focus.id); return Math.max(0, i); } return 0; });
  const at = Math.min(cur, Math.max(0, list.length - 1)), pg = at - (at % 2), L = list[pg], R2 = list[pg + 1];
  useEffect(() => { const k = e => { const tag = e.target && e.target.tagName; if (e.key === "Escape") onClose(); else if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return; else if (e.key === "ArrowRight") setCur(c => Math.min(list.length - 1, c - (c % 2) + 2)); else if (e.key === "ArrowLeft") setCur(c => Math.max(0, c - (c % 2) - 2)); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose, list.length]);
  const setF = p => { setFlt(f => ({ ...f, ...p })); setCur(0); };
  const goId = id => { const i = list.findIndex(s => s.id === id); if (i >= 0) setCur(i); else { setFlt({ status: "all", chap: "", q: "" }); setCur(Math.max(0, bookStepsOf(book).findIndex(s => s.id === id))); } };
  const paper = "color-mix(in srgb, " + T.card + " 94%, " + T.amber100 + ")";
  const Page = ({ s, n }) => !s ? <div style={{ padding: 30, color: T.ink500, fontSize: FZ.sm }}>{list.length ? "Fin de la sélection" : "Aucune étape avec ces filtres"}</div>
    : <article aria-label={s.title} style={{ padding: "26px 30px 40px", position: "relative", minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 11, color: T.ink500, marginBottom: 4 }}>{[s.chapTitle, ...s.path.slice(1)].filter((x, i, a) => x && a.indexOf(x) === i).join(" › ")}</div>
      <h3 style={{ margin: "0 0 10px", fontFamily: T.fontDisplay, fontSize: 19, fontWeight: 600, color: T.ink900, display: "flex", gap: 8, alignItems: "center" }}>{s.title}
        {stepStatus(io.rows[s.id]) !== "todo" && <span style={{ fontFamily: T.font, fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "1px 8px", color: ST_TONE[stepStatus(io.rows[s.id])]()[0], background: ST_TONE[stepStatus(io.rows[s.id])]()[1] }}>{Object.fromEntries(STEP_STATUS)[stepStatus(io.rows[s.id])]}</span>}</h3>
      <div style={{ flex: 1 }}><Blocks blocks={s.blocks} book={book} bookApi={bookApi} /></div>
      <StepCtl s={s} row={io.rows[s.id]} canMark={canMark} io={io} />
      <span style={{ position: "absolute", bottom: 12, [n % 2 ? "left" : "right"]: 30, fontSize: 11, color: T.ink500 }}>{n} / {list.length}</span>
    </article>;
  const chip = (v, l, n) => { const on = flt.status === v; return <button key={v} type="button" aria-pressed={on} onClick={() => setF({ status: v })} style={{ minHeight: 30, padding: "0 10px", borderRadius: 999, border: "1px solid " + (on ? T.ink900 : T.line), background: on ? T.ink900 : T.card, color: on ? T.card : T.ink700, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{l} <span style={{ opacity: 0.7 }}>{n}</span></button>; };
  return <div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} className="enogia-book-reader" style={{ position: "fixed", inset: 0, zIndex: 10020, background: "rgba(10,14,22,.58)", display: "grid", gridTemplateColumns: "minmax(250px,300px) minmax(0,1080px)", gap: 14, alignContent: "center", justifyContent: "center", padding: 16 }}>
    <aside aria-label="Suivi du livret" style={{ background: T.card, borderRadius: 12, boxShadow: T.shadowLg, padding: 14, alignSelf: "stretch", maxHeight: "92dvh", overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <div><div style={{ fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink900 }}>{book.title || BOOK_DOC.title} · {r.pj}</div>
        <div style={{ fontSize: 12, color: T.ink500, marginTop: 2 }}>{pr.valid} / {pr.total} validées · <span style={{ color: T.emerald600 }}>{pr.ok} OK</span> · <span style={{ color: pr.pb ? T.red600 : T.ink500 }}>{pr.pb} problème{pr.pb > 1 ? "s" : ""}</span></div>
        <div role="progressbar" aria-label="Étapes validées" aria-valuenow={pr.total ? Math.round(pr.valid / pr.total * 100) : 0} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, borderRadius: 4, background: T.surfaceAlt, overflow: "hidden", marginTop: 6 }}><i style={{ display: "block", height: "100%", width: (pr.total ? pr.valid / pr.total * 100 : 0) + "%", background: T.emerald500 }} /></div></div>
      <div role="group" aria-label="Filtrer par statut" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{chip("all", "Toutes", pr.total)}{chip("todo", "À faire", pr.todo)}{chip("ok", "OK", pr.ok)}{chip("pb", "Problème", pr.pb)}{chip("novalid", "Non validées", pr.total - pr.valid)}</div>
      <select value={flt.chap} onChange={e => setF({ chap: e.target.value })} aria-label="Filtrer par chapitre" style={{ ...field(), fontSize: FZ.sm, minHeight: 34 }}><option value="">Tous les chapitres</option>{book.chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <input type="search" value={flt.q} onChange={e => setF({ q: e.target.value })} placeholder="Rechercher dans le livret" aria-label="Rechercher dans le livret" style={{ ...field(), fontSize: FZ.sm, minHeight: 34 }} />
      <ol style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, minHeight: 120, overflow: "auto", borderTop: "1px solid " + T.line }}>
        {list.map((s, i) => { const st = stepStatus(io.rows[s.id]), on = i === pg || i === pg + 1, head = i === 0 || list[i - 1].chap !== s.chap;
          return <li key={s.id}>{head && <div style={{ fontSize: 11, fontWeight: 600, color: T.ink500, padding: "8px 4px 2px" }}>{s.chapTitle}</div>}
            <button type="button" onClick={() => setCur(i)} aria-current={on ? "step" : undefined} style={{ width: "100%", display: "flex", gap: 8, alignItems: "center", padding: "5px 6px", minHeight: 34, border: "none", borderRadius: 6, background: on ? T.surfaceAlt : "transparent", cursor: "pointer", textAlign: "left", fontFamily: T.font, fontSize: 13, color: T.ink900 }}>
              <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 11, border: "1.5px solid " + ((io.rows[s.id] || {}).v ? T.emerald600 : T.line), background: (io.rows[s.id] || {}).v ? T.emerald600 : "transparent", color: T.card }}>{(io.rows[s.id] || {}).v ? "✓" : ""}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
              {st !== "todo" && <i aria-label={Object.fromEntries(STEP_STATUS)[st]} style={{ width: 8, height: 8, borderRadius: "50%", background: st === "pb" ? T.red500 : T.emerald500, flexShrink: 0 }} />}</button></li>; })}
      </ol>
      <div style={{ borderTop: "1px solid " + T.line, paddingTop: 8 }}>
        <button type="button" aria-expanded={showPb} onClick={() => setShowPb(v => !v)} style={{ border: "none", background: "transparent", padding: 0, fontWeight: 600, fontSize: 13, color: pr.pb ? T.red600 : T.ink700, cursor: "pointer", fontFamily: T.font, minHeight: 28 }}>Synthèse des problèmes ({pr.problems.length}) {showPb ? "▾" : "▸"}</button>
        {showPb && (pr.problems.length ? pr.problems.map(p => <button key={p.id} type="button" onClick={() => goId(p.id)} style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderLeft: "3px solid " + T.red500, background: T.red100, borderRadius: 4, padding: "6px 8px", marginTop: 6, cursor: "pointer", fontFamily: T.font }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.ink900 }}>{p.title}</span><span style={{ display: "block", fontSize: 11, color: T.ink700 }}>{p.chap}{p.c ? " · " + p.c : ""}</span></button>) : <div style={{ fontSize: 12, color: T.ink500, marginTop: 4 }}>Aucun problème signalé</div>)}
      </div>
      <IoButtons io={io} canMark={canMark} compact />
    </aside>
    <div role="dialog" aria-modal="true" aria-label={"Livret de configuration " + r.pj} style={{ position: "relative", minWidth: 0, alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 10, maxHeight: "92dvh" }}>
      <div key={pg} className="enogia-book-flip" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", background: paper, borderRadius: 6, boxShadow: T.shadowLg, overflow: "auto", position: "relative" }}>
        <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 34, transform: "translateX(-50%)", background: "linear-gradient(90deg, transparent, rgba(16,24,40,.08) 45%, rgba(16,24,40,.14) 50%, rgba(16,24,40,.08) 55%, transparent)", pointerEvents: "none" }} />
        <Page s={L} n={pg + 1} /><Page s={R2} n={pg + 2} />
      </div>
      <div style={{ alignSelf: "center", display: "flex", gap: 6, alignItems: "center", background: T.card, borderRadius: 999, padding: 4, boxShadow: T.shadowLg }}>
        <button type="button" onClick={() => setCur(Math.max(0, pg - 2))} disabled={pg === 0} aria-label="Pages précédentes" style={{ ...B("sec", "md"), borderRadius: 999 }}>‹</button>
        <span style={{ fontSize: 12, color: T.ink500, padding: "0 8px", fontVariantNumeric: "tabular-nums" }}>{list.length ? "Étapes " + (pg + 1) + (R2 ? "–" + (pg + 2) : "") + " sur " + list.length : "Aucune étape"}</span>
        <button type="button" onClick={() => setCur(Math.min(list.length - 1, pg + 2))} disabled={pg + 2 >= list.length} aria-label="Pages suivantes" style={{ ...B("sec", "md"), borderRadius: 999 }}>›</button>
        <button type="button" onClick={onClose} style={{ ...B("pri", "md"), borderRadius: 999 }}>Fermer le livret</button>
      </div>
    </div>
  </div>;
}

// ── D14 : fréquences turbines figées et vibrations (dans l'étape « Checklist de debug »)
export function VibBlock({ plan, rows, canMark, saveTests, who, canAdmin }) {
  const debug = plan.debug || {}, v = debug.vib || {}, pr = vibProgress(debug, rows);
  const save = (id, val) => saveTests({ ...plan, debug: { ...debug, name: debug.name || who, vib: { ...v, [id]: val }, at: new Date().toISOString() } });
  const th = { textAlign: "left", fontSize: 12, fontWeight: 600, color: T.ink700, padding: "8px 12px", borderBottom: "1px solid " + T.line };
  const td = { padding: "6px 12px", borderBottom: "1px solid " + T.line, fontSize: FZ.sm, fontVariantNumeric: "tabular-nums", color: T.ink900 };
  return <section aria-label="Fréquences turbines et vibrations" style={{ marginTop: 16, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
    <header style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "10px 14px", background: T.surface, borderBottom: "1px solid " + T.line }}>
      <b style={{ fontFamily: T.fontDisplay, fontSize: 15, fontWeight: 600 }}>Fréquences turbines et vibrations</b>
      <span style={{ fontSize: 12, color: pr.over ? T.red600 : T.ink500, fontWeight: pr.over ? 600 : 500 }}>{pr.done} / {pr.total} relevé{pr.total > 1 ? "s" : ""}{pr.over ? " · " + pr.over + " au-dessus de la limite" : ""}</span>
      <span style={{ flex: 1 }} /><span style={{ fontSize: 12, color: T.ink500 }}>Fréquences figées{canAdmin ? " (réglage : Tests › Checklists)" : ""}</span></header>
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
      <thead><tr><th style={th}>Point de mesure</th><th style={th}>Fréquence turbine (figée)</th><th style={th}>Vibrations relevées</th><th style={th}>Limite</th><th style={th}>Résultat</th></tr></thead>
      <tbody>{rows.map(rw => { const over = vibOver(v[rw.id], rw.limit);
        return <tr key={rw.id}><td style={td}>{rw.label}</td><td style={{ ...td, fontWeight: 600 }}>{rw.freq || <span style={{ color: T.ink500, fontWeight: 500 }}>à régler</span>}</td>
          <td style={td}><input disabled={!canMark} key={rw.id + (v[rw.id] || "")} defaultValue={v[rw.id] || ""} inputMode="decimal" placeholder="—" aria-label={"Vibrations relevées : " + rw.label}
            onBlur={e => { const t = e.target.value.trim(); if (t !== (v[rw.id] || "")) save(rw.id, t); }} style={{ ...field(), width: 110, textAlign: "right", fontSize: FZ.sm }} /></td>
          <td style={{ ...td, color: T.ink500 }}>{rw.limit || "—"}</td>
          <td style={{ ...td, fontWeight: 600, color: over == null ? T.ink500 : over ? T.red600 : T.emerald600 }}>{over == null ? (String(v[rw.id] || "").trim() ? "relevé" : "à saisir") : over ? "Au-dessus" : "OK"}</td></tr>; })}</tbody>
    </table></div>
  </section>;
}

// ── checklist de tests au format de la checklist de debug (+ D12 demandes du client)
export function TestsChecklistStep({ r, plan, catalog, act, canMark, canAsk, saveTests, who, pr, extra }) {
  const [open, setOpen] = useState(false);
  const groups = testRows(plan, catalog, act), label = k => (SECTIONS.find(x => x[0] === k) || [])[1];
  return <>
    <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 16, alignItems: "center", border: "1px solid " + T.line, borderRadius: 12, padding: "14px 16px", background: T.card }}>
      <Ring v={pr.done} max={pr.total || 1} bad={pr.ko > 0} />
      <div style={{ minWidth: 0 }}><div style={{ fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink900 }}>{pr.done} test{pr.done > 1 ? "s" : ""} renseigné{pr.done > 1 ? "s" : ""} sur {pr.total}</div>
        <div style={{ fontSize: 13, color: T.ink500 }}>{pr.ok} OK{pr.ko ? " · " + pr.ko + " NOK" : ""}{plan.asks.length ? " · " + plan.asks.length + " demande" + (plan.asks.length > 1 ? "s" : "") + " du client" : ""}</div>
        <Bars total={pr.total} ok={pr.ok} bad={pr.ko} /></div>
      <button type="button" onClick={() => setOpen(true)} style={B("pri", "md")}>{canMark ? (pr.done ? "Continuer la checklist" : "Remplir la checklist de tests") : canAsk ? "Ouvrir · demandes du client" : "Voir la checklist"}</button>
    </div>
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 8 }}>
      {groups.map(g => [["", g.rows], ...(g.k === "interne" ? [[" · Demandes du client", g.asks]] : [])].map(([suf, L]) => { const ok = L.filter(x => statusOf(plan, g.k, x.id) === "ok").length, ko = L.filter(x => statusOf(plan, g.k, x.id) === "ko").length;
        return <div key={g.k + suf} style={{ border: "1px solid " + (ko ? T.red500 : T.line), background: ko ? T.red100 : "transparent", borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
          <span>{label(g.k)}{suf}</span><span style={{ fontVariantNumeric: "tabular-nums", color: ko ? T.red600 : T.ink500, fontWeight: ko ? 600 : 500 }}>{ko ? ko + " NOK · " : ""}{ok + ko} / {L.length}</span></div>; }))}
    </div>
    {extra}
    {open && <TestsChecklistDialog {...{ r, plan, catalog, act, canMark, canAsk, saveTests, who }} onClose={() => setOpen(false)} />}
  </>;
}
function TestsChecklistDialog({ r, plan, catalog, act, canMark, canAsk, saveTests, who, onClose }) {
  const [ask, setAsk] = useState(null), groups = testRows(plan, catalog, act);
  useEffect(() => { const k = e => { if (e.key === "Escape" && !ask) onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose, ask]);
  const tres = plan.tres || {}, label = k => (SECTIONS.find(x => x[0] === k) || [])[1];
  const all = groups.flatMap(g => [...g.rows, ...g.asks].map(x => ({ ...x, k: g.k }))), done = all.filter(x => ["ok", "ko"].includes(statusOf(plan, x.k, x.id))).length, ko = all.filter(x => statusOf(plan, x.k, x.id) === "ko").length;
  const th = { textAlign: "left", padding: "6px 8px", fontSize: 12, fontWeight: 600, color: T.ink900, background: T.surfaceAlt, borderBottom: "1px solid " + T.line, whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1 };
  const td = { padding: "4px 6px", borderBottom: "1px solid " + T.line, verticalAlign: "top", fontSize: FZ.xs, color: T.ink900 };
  const Cell = ({ k, id, val, lab }) => { const st = statusOf(plan, k, id), on = (val === "ok" && st === "ok") || (val === "nok" && st === "ko"), tone = val === "ok" ? [T.emerald600, T.emerald100] : [T.red600, T.red100];
    return <button type="button" disabled={!canMark} aria-pressed={on} aria-label={lab} onClick={() => saveTests(setTestMark(plan, k, id, val, who))}
      style={{ width: 40, minHeight: 30, borderRadius: 8, border: "1px solid " + (on ? tone[0] : T.line), background: on ? tone[1] : T.card, color: on ? tone[0] : T.ink300, fontWeight: 600, fontSize: FZ.xs, cursor: canMark ? "pointer" : "default", fontFamily: T.font }}>{on ? "X" : ""}</button>; };
  const Row = ({ k, x }) => { const d = (tres[k] || {})[x.id] || {}, st = statusOf(plan, k, x.id);
    return <tr style={{ background: st === "ko" ? T.red100 : "transparent" }}>
      <td style={{ ...td, fontWeight: 600 }}>{x.label}{x.ask && <span style={{ display: "block", fontWeight: 500, fontSize: 11, color: T.info600, marginTop: 2 }}>demande du client{x.by ? " · " + x.by : ""}{x.at ? " · " + fdt(x.at) : ""}</span>}
        {x.ask && canAsk && <button type="button" onClick={async () => { if (await askConfirm({ title: "Retirer la demande « " + x.label + " » ?", message: "Elle disparaît de la checklist de tests de " + r.pj + ".", confirmLabel: "Retirer la demande", danger: true })) saveTests(delAsk(plan, x.id)); }} style={{ border: "none", background: "transparent", color: T.red600, fontSize: 11, fontWeight: 600, padding: 0, marginTop: 2, cursor: "pointer", fontFamily: T.font, minHeight: 24 }}>Retirer</button>}</td>
      <td style={{ ...td, textAlign: "center" }}><Cell k={k} id={x.id} val="ok" lab={"OK : " + x.label} /></td>
      <td style={{ ...td, textAlign: "center" }}><Cell k={k} id={x.id} val="nok" lab={"NOK : " + x.label} /></td>
      {DEBUG_FIELDS.map(([f, l]) => <td key={f} style={td}><textarea rows={1} disabled={!canMark} key={f + x.id + (d[f] || "")} defaultValue={d[f] || ""} aria-label={l + " : " + x.label} onBlur={e => { const t = e.target.value.trim(); if (t !== (d[f] || "")) saveTests(setTestDetail(plan, k, x.id, { [f]: t })); }} style={{ ...field(), resize: "vertical" }} /></td>)}
      <td style={{ ...td, color: T.ink700, whiteSpace: "pre-line", lineHeight: 1.4 }}>{x.hint}</td>
    </tr>; };
  return <div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
    <div role="dialog" aria-modal="true" aria-label={"Checklist de tests " + r.pj} style={{ width: "min(1480px,100%)", maxHeight: "94dvh", display: "flex", flexDirection: "column", background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px", borderBottom: "1px solid " + T.line }}>
        <div style={{ flex: "1 1 300px" }}><div style={{ fontFamily: T.fontDisplay, fontSize: FZ.lg, fontWeight: 600 }}>Checklist de tests · <span style={{ fontFamily: T.fontMono }}>{r.pj}</span></div>
          <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Même format que la checklist de debug : OK ou NOK sur chaque test ; en cas de NOK, le problème, sa cause, le correctif et le temps passé. Enregistré à chaque saisie.</div></div>
        <button type="button" onClick={onClose} style={B("sec", "md")}>Fermer</button>
      </div>
      <div style={{ overflow: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
          <colgroup><col style={{ width: 220 }} /><col style={{ width: 52 }} /><col style={{ width: 52 }} /><col style={{ width: 150 }} /><col style={{ width: 150 }} /><col style={{ width: 170 }} /><col style={{ width: 90 }} /><col /></colgroup>
          <thead><tr><th style={th}>Test</th><th style={{ ...th, textAlign: "center" }}>OK</th><th style={{ ...th, textAlign: "center" }}>NOK</th>{DEBUG_FIELDS.map(([f, l]) => <th key={f} style={th}>{l}</th>)}<th style={th}>Objectifs du test</th></tr></thead>
          {groups.map(g => <React.Fragment key={g.k}>
            <tbody><tr><th colSpan={8} style={{ textAlign: "left", padding: "8px 8px", background: T.surface, fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 600, borderBottom: "1px solid " + T.line }}>{label(g.k)}</th></tr>
              {g.rows.length === 0 && <tr><td colSpan={8} style={{ ...td, color: T.ink500 }}>Aucun test retenu</td></tr>}
              {g.rows.map(x => <Row key={x.id} k={g.k} x={x} />)}</tbody>
            {g.k === "interne" && <tbody><tr><th colSpan={8} style={{ textAlign: "left", padding: "8px 8px", background: T.info100, color: T.info600, fontSize: 13, fontWeight: 600, borderBottom: "1px solid " + T.line }}>
              {label(g.k)} · Demandes spécifiques du client
              {canAsk && <button type="button" onClick={() => setAsk({ label: "", hint: "" })} style={{ ...B("sec", "sm"), marginLeft: 10 }}>＋ Ajouter une demande</button>}</th></tr>
              {ask && <tr><td colSpan={8} style={{ ...td, background: T.surface }}><div style={{ display: "grid", gridTemplateColumns: "minmax(200px,1fr) minmax(240px,2fr) auto auto", gap: 8, alignItems: "center", padding: 4 }}>
                <input autoFocus value={ask.label} onChange={e => setAsk(a => ({ ...a, label: e.target.value }))} placeholder="Test demandé par le client" aria-label="Test demandé par le client" style={{ ...field(), fontSize: FZ.sm }} />
                <input value={ask.hint} onChange={e => setAsk(a => ({ ...a, hint: e.target.value }))} placeholder="Objectif ou précision (facultatif)" aria-label="Objectif de la demande" style={{ ...field(), fontSize: FZ.sm }} />
                <button type="button" disabled={!ask.label.trim()} onClick={async () => { if ((await saveTests(addAsk(plan, ask.label, ask.hint, who))) !== false) setAsk(null); }} style={B("pri", "sm")}>Ajouter</button>
                <button type="button" onClick={() => setAsk(null)} style={B("ghost", "sm")}>Annuler</button></div></td></tr>}
              {g.asks.length === 0 && !ask && <tr><td colSpan={8} style={{ ...td, color: T.ink500 }}>Aucune demande du client{canAsk ? " : le chef de projet les ajoute ici" : ""}</td></tr>}
              {g.asks.map(x => <Row key={x.id} k={g.k} x={x} />)}</tbody>}
          </React.Fragment>)}
        </table>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 16px", borderTop: "1px solid " + T.line }}>
        <span style={{ fontSize: FZ.sm, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{done} / {all.length} renseignés{ko ? <span style={{ color: T.red600 }}> · {ko} NOK</span> : ""}</span>
        <span style={{ flex: 1 }} /><span style={{ fontSize: 12, color: T.ink500 }}>La liste des tests se règle dans Tests › Catalogue ; « Choisir les tests » dans l'étape pour cette machine</span>
      </div>
    </div>
  </div>;
}

// ── signature au doigt ou à la souris (PNG réduit à 360 × 120, comme l'image déposée)
export function SignPad({ onChange }) {
  const cv = useRef(null), on = useRef(false), [empty, setEmpty] = useState(true);
  useEffect(() => { const c = cv.current; if (!c) return; const r = c.getBoundingClientRect(); c.width = Math.round(r.width * 2); c.height = Math.round(r.height * 2);
    const g = c.getContext("2d"); g.scale(2, 2); g.lineWidth = 2.2; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#101828"; }, []);
  const pt = e => { const r = cv.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const out = () => { const c = cv.current, o = document.createElement("canvas"), k = Math.min(1, 360 / c.width, 120 / c.height); o.width = Math.round(c.width * k); o.height = Math.round(c.height * k); o.getContext("2d").drawImage(c, 0, 0, o.width, o.height); onChange(o.toDataURL("image/png")); };
  const clear = () => { const c = cv.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); setEmpty(true); onChange(null); };
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ position: "relative", height: 130, borderRadius: 8, border: "1.5px dashed " + T.line, background: "#FFFFFF", touchAction: "none" }}>
      <canvas ref={cv} aria-label="Zone de signature : signez au doigt ou à la souris" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair" }}
        onPointerDown={e => { on.current = true; e.currentTarget.setPointerCapture(e.pointerId); const g = cv.current.getContext("2d"); g.beginPath(); g.moveTo(...pt(e)); setEmpty(false); }}
        onPointerMove={e => { if (!on.current) return; const g = cv.current.getContext("2d"); g.lineTo(...pt(e)); g.stroke(); }}
        onPointerUp={() => { if (on.current) { on.current = false; out(); } }} onPointerCancel={() => { on.current = false; }} />
      <span aria-hidden="true" style={{ position: "absolute", left: 14, right: 14, bottom: 28, borderBottom: "1px solid #98A2B3", pointerEvents: "none" }} />
      {empty && <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 12, color: "#667085", pointerEvents: "none" }}>Signez ici</span>}
    </div>
    <div><button type="button" onClick={clear} disabled={empty} style={B("ghost", "sm")}>Effacer</button></div>
  </div>;
}
