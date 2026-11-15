// v280 (demandé : « pour les tests, une page où je peux importer une checklist et ajouter ou modifier des lignes ; le rendre impossible
// sur les PJ ») : Tests › Checklists (administrateurs) — le modèle de la checklist de debug, section par section : renommer, ajouter,
// supprimer, déplacer ; contrôle, consigne, « Option » (S.O. possible). Import d'un Word au format du modèle ou d'un texte collé
// depuis Excel, avec aperçu ; « Remplacer » ou « Ajouter à la suite ». Rien n'est écrit avant « Enregistrer ».
// Données : planning/tests.debugModel.sections (lu par toutes les fiches de tests et par l'export PDF).
import React, { useEffect, useMemo, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { DEBUG_DOC, debugSections } from "../debugChecklist";
import { parseDocxXml, parseChecklistText, docxDocumentXml, zipFiles } from "../checklistImport";
import { parseManual, bookStepsOf, bookImages, slug } from "../manualImport";
import { vibRows } from "../testFiche";
import { askConfirm } from "../confirm";
import { useUnsavedGuard } from "../unsavedGuard";

const nid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const btn = (primary, ghost) => ({ padding: "0 12px", minHeight: 32, borderRadius: 8, border: "1px solid " + (primary && !ghost ? T.ink900 : T.line), background: primary && !ghost ? T.ink900 : T.card, color: primary && !ghost ? T.card : T.ink700, fontSize: FZ.sm, fontWeight: 600, cursor: "pointer", fontFamily: T.font });
const field = { padding: "4px 8px", minHeight: 30, borderRadius: 8, get border() { return "1px solid " + T.line; }, get background() { return T.card; }, get color() { return T.ink900; }, fontSize: FZ.sm, get fontFamily() { return T.font; }, boxSizing: "border-box", width: "100%"  }; // v346 : accesseurs (suivent le clair / sombre)
const mini = { get border() { return "1px solid " + T.line; }, get background() { return T.card; }, get color() { return T.ink700; }, borderRadius: 8, minWidth: 28, minHeight: 28, cursor: "pointer", get fontFamily() { return T.font; }, fontSize: 13  }; // v346 : accesseurs (suivent le clair / sombre)

function ImportDialog({ onApply, onClose }) {
  const [txt, setTxt] = useState(""), [res, setRes] = useState(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const pick = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; setErr(""); setBusy(true);
    try { const r = /\.docx$/i.test(f.name) ? parseDocxXml(await docxDocumentXml(await f.arrayBuffer())) : parseChecklistText(await f.text()); setRes(r); if (!r.length) setErr("Aucun contrôle reconnu dans ce fichier."); }
    catch (x) { setRes(null); setErr("Lecture impossible : " + x.message); }
    setBusy(false); };
  const fromText = () => { const r = parseChecklistText(txt); setRes(r); setErr(r.length ? "" : "Aucun contrôle reconnu : une ligne par contrôle « Section ; Contrôle ; Consigne ; Option »."); };
  const n = (res || []).reduce((a, s) => a + s.items.length, 0);
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label="Importer une checklist" style={{ width: "min(720px,100%)", maxHeight: "90dvh", overflow: "auto", background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: "16px 18px", fontFamily: T.font, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 20, fontWeight: 600 }}>Importer une checklist</div>
      <div style={{ fontSize: 13, color: T.ink500, lineHeight: 1.5 }}>Un document Word au format du modèle ({DEBUG_DOC.ref}) : chaque ligne de tableau dont les colonnes 2 et 3 sont « OK » et « NOK » ouvre une section ; les lignes suivantes sont les contrôles (1re colonne) et leur consigne (dernière colonne).<br />Ou un tableau Excel / CSV : <b>Section ; Contrôle ; Consigne ; Option</b> (une ligne par contrôle).</div>
      <input type="file" accept=".docx,.csv,.txt" onChange={pick} aria-label="Fichier de checklist" disabled={busy} />
      <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={5} placeholder={"Ou collez ici depuis Excel :\nSorties\tVentilateur circuit de cooling\tActiver le ventilateur…\t"} aria-label="Checklist collée" style={{ ...field, resize: "vertical", fontFamily: T.fontMono, fontSize: 12 }} />
      <div><button type="button" style={btn(false, true)} disabled={!txt.trim()} onClick={fromText}>Lire le texte collé</button></div>
      {err && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: FZ.sm }}>{err}</div>}
      {res && res.length > 0 && <div style={{ border: "1px solid " + T.line, borderRadius: 8, padding: "8px 10px", maxHeight: 260, overflow: "auto" }}>
        <div style={{ fontWeight: 600, fontSize: FZ.sm, marginBottom: 4 }}>{res.length} section{res.length > 1 ? "s" : ""} · {n} contrôle{n > 1 ? "s" : ""}</div>
        {res.map(s => <div key={s.id} style={{ fontSize: 13, marginBottom: 4 }}><b>{s.title}</b> <span style={{ color: T.ink500 }}>({s.items.length})</span> — <span style={{ color: T.ink700 }}>{s.items.slice(0, 4).map(i => i.label).join(", ")}{s.items.length > 4 ? "…" : ""}</span></div>)}
      </div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button type="button" style={btn(false, true)} onClick={onClose}>Annuler</button>
        <button type="button" style={btn(true, true)} disabled={!n} onClick={() => onApply(res, "append")}>Ajouter à la suite</button>
        <button type="button" style={btn(true)} disabled={!n} onClick={() => onApply(res, "replace")}>Remplacer la liste</button>
      </div>
    </div>
  </div>);
}

function DebugModelView({ doc, commit }) {
  const saved = useMemo(() => debugSections(doc && doc.debugModel), [doc]);
  const [secs, setSecs] = useState(saved), [dirty, setDirty] = useState(false), [imp, setImp] = useState(false), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => { if (!dirty) setSecs(saved); }, [saved, dirty]);
  useUnsavedGuard(dirty); // v340
  const upd = fn => { setSecs(s => fn(s.map(x => ({ ...x, items: x.items.map(i => ({ ...i })) })))); setDirty(true); };
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const c = arr.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; };
  const save = async () => { setBusy(true); const ok = await commit({ debugModel: { sections: secs, at: new Date().toISOString() } }); setBusy(false); if (ok !== false) { setDirty(false); setMsg({ t: "Checklist enregistrée : elle s'applique à toutes les machines." }); } else setMsg({ t: "L'enregistrement a échoué.", bad: true }); };
  const reset = async () => { if (!(await askConfirm({ title: "Revenir au modèle Word d'origine ?", message: "Modèle " + DEBUG_DOC.ref + ". Les lignes ajoutées ou modifiées seront perdues pour toutes les machines.", confirmLabel: "Revenir au modèle d'origine", danger: true }))) return; setBusy(true); const ok = await commit({ debugModel: null }); setBusy(false); if (ok !== false) { setDirty(false); setMsg({ t: "Modèle d'origine rétabli." }); } };
  const total = secs.reduce((a, s) => a + s.items.length, 0);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <section style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 320px" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Checklist de debug · modèle</div>
        <div style={{ fontSize: 13, color: T.ink500 }}>{secs.length} sections · {total} contrôles · s'applique à toutes les machines (fiche de tests et export PDF). Elle ne se modifie qu'ici, pas depuis un PJ.</div>
      </div>
      <button type="button" style={btn(false, true)} onClick={() => setImp(true)}>Importer…</button>
      <button type="button" style={btn(false, true)} onClick={reset} disabled={busy}>Modèle d'origine</button>
      {dirty && <button type="button" style={btn(false, true)} onClick={() => { setSecs(saved); setDirty(false); }}>Annuler les modifications</button>}
      <button type="button" style={btn(true)} disabled={!dirty || busy} onClick={save}>{busy ? "Enregistrement…" : dirty ? "Enregistrer" : "Enregistré"}</button>
    </section>
    {msg && <div role="status" style={{ fontSize: FZ.sm, fontWeight: 600, color: msg.bad ? T.red600 : T.emerald600 }}>{msg.t}</div>}
    {secs.map((s, si) => <section key={s.id} aria-label={"Section " + s.title} style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: T.surfaceAlt }}>
        <input value={s.title} onChange={e => upd(a => { a[si].title = e.target.value; return a; })} aria-label="Titre de la section" style={{ ...field, fontWeight: 600, maxWidth: 420, background: T.card }} />
        <span style={{ fontSize: 12, color: T.ink500, marginRight: "auto" }}>{s.items.length} contrôle{s.items.length > 1 ? "s" : ""}</span>
        <button type="button" aria-label="Monter la section" style={mini} disabled={si === 0} onClick={() => upd(a => move(a, si, -1))}>↑</button>
        <button type="button" aria-label="Descendre la section" style={mini} disabled={si === secs.length - 1} onClick={() => upd(a => move(a, si, 1))}>↓</button>
        <button type="button" aria-label="Supprimer la section" style={{ ...mini, color: T.red600 }} onClick={async () => { if (await askConfirm({ title: "Supprimer la section « " + s.title + " » ?", message: "Ses " + s.items.length + " contrôles seront retirés du modèle (rien n'est enregistré avant « Enregistrer »).", confirmLabel: "Supprimer la section", danger: true })) upd(a => a.filter((_, k) => k !== si)); }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,1fr) minmax(220px,2fr) 82px 120px", gap: 0 }}>
        {["Contrôle", "Consigne", "Option", ""].map(h => <div key={h} style={{ fontSize: 12, color: T.ink500, padding: "6px 8px", borderBottom: "1px solid " + T.line }}>{h}</div>)}
        {s.items.map((it, ii) => <React.Fragment key={it.id}>
          <div style={{ padding: "4px 6px", borderBottom: "1px solid " + T.line }}><input value={it.label} onChange={e => upd(a => { a[si].items[ii].label = e.target.value; return a; })} aria-label="Contrôle" style={field} /></div>
          <div style={{ padding: "4px 6px", borderBottom: "1px solid " + T.line }}><textarea value={it.hint} rows={Math.min(4, Math.max(1, String(it.hint).split("\n").length))} onChange={e => upd(a => { a[si].items[ii].hint = e.target.value; return a; })} aria-label={"Consigne : " + it.label} style={{ ...field, resize: "vertical", lineHeight: 1.4 }} /></div>
          <label style={{ padding: "4px 8px", borderBottom: "1px solid " + T.line, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.ink700 }}><input type="checkbox" checked={!!it.opt} onChange={e => upd(a => { a[si].items[ii].opt = e.target.checked; return a; })} />S.O.</label>
          <div style={{ padding: "4px 6px", borderBottom: "1px solid " + T.line, display: "flex", gap: 4, alignItems: "center" }}>
            <button type="button" aria-label={"Monter " + it.label} style={mini} disabled={ii === 0} onClick={() => upd(a => { a[si].items = move(a[si].items, ii, -1); return a; })}>↑</button>
            <button type="button" aria-label={"Descendre " + it.label} style={mini} disabled={ii === s.items.length - 1} onClick={() => upd(a => { a[si].items = move(a[si].items, ii, 1); return a; })}>↓</button>
            <button type="button" aria-label={"Supprimer " + it.label} style={{ ...mini, color: T.red600 }} onClick={() => upd(a => { a[si].items = a[si].items.filter((_, k) => k !== ii); return a; })}>×</button>
          </div>
        </React.Fragment>)}
      </div>
      <div style={{ padding: "6px 10px" }}><button type="button" onClick={() => upd(a => { a[si].items.push({ id: nid("x"), label: "Nouveau contrôle", hint: "", opt: false }); return a; })} style={{ border: "none", background: "transparent", color: T.ink700, fontWeight: 600, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font, minHeight: 28 }}>＋ Ajouter un contrôle</button></div>
    </section>)}
    <div><button type="button" style={btn(false, true)} onClick={() => upd(a => [...a, { id: nid("s"), title: "Nouvelle section", items: [] }])}>＋ Ajouter une section</button></div>
    {imp && <ImportDialog onClose={() => setImp(false)} onApply={(res, mode) => { upd(a => mode === "replace" ? res : [...a, ...res]); setImp(false); setMsg({ t: "Import prêt : vérifiez puis « Enregistrer »." }); }} />}
  </div>);
}

// ── v337 : Tests › Checklists en trois onglets — checklist de debug (ci-dessus), livret de configuration (D13), fréquences et vibrations (D14)
export function ChecklistsView({ doc, commit, book, bookApi }) {
  const [tab, setTab] = useState("debug");
  const tabs = [["debug", "Checklist de debug"], ["book", "Livret de configuration"], ["vib", "Fréquences et vibrations"]];
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div role="tablist" aria-label="Modèles des fiches de tests" style={{ display: "inline-flex", alignSelf: "flex-start", background: T.surfaceAlt, borderRadius: 8, padding: 2, gap: 2 }}>
      {tabs.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{ border: "none", borderRadius: 8, minHeight: 32, padding: "0 14px", fontSize: FZ.sm, fontWeight: 600, cursor: "pointer", fontFamily: T.font, background: tab === id ? T.card : "transparent", color: tab === id ? T.ink900 : T.ink500 }}>{l}</button>)}
    </div>
    {tab === "debug" && <DebugModelView doc={doc} commit={commit} />}
    {tab === "book" && <BookImportView book={book} bookApi={bookApi} />}
    {tab === "vib" && <VibModelView doc={doc} commit={commit} />}
  </div>;
}

// D13 : import du manuel Word → chapitres et étapes (manualImport.js) ; images réduites (1 100 px de large au plus, JPEG) dans des documents à part
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", webp: "image/webp" };
const shrink = (bytes, ext) => new Promise(res => {
  const mime = MIME[ext]; if (!mime) { res(null); return; }
  const url = URL.createObjectURL(new Blob([bytes], { type: mime })), im = new Image();
  im.onload = () => { const out = (w, q) => { const k = Math.min(1, w / im.width), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); const g = c.getContext("2d"); g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", q); };
    let d = out(1100, 0.75); if (d.length > 700000) d = out(900, 0.6); if (d.length > 900000) d = out(700, 0.5); URL.revokeObjectURL(url); res(d.length > 950000 ? null : d); };
  im.onerror = () => { URL.revokeObjectURL(url); res(null); };
  im.src = url;
});
const imgKey = src => slug(src).replace(/\//g, "-");
function BookImportView({ book, bookApi }) {
  const [prev, setPrev] = useState(null), [busy, setBusy] = useState(""), [err, setErr] = useState(""), [meta, setMeta] = useState({ title: "", ref: "" });
  const cur = bookStepsOf(book), pick = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; setErr(""); setPrev(null); setBusy("Lecture du manuel…");
    try {
      const files = await zipFiles(await f.arrayBuffer(), n => n === "word/document.xml" || n === "word/styles.xml" || n === "word/_rels/document.xml.rels" || /^word\/media\//.test(n));
      const dec = n => (files[n] ? new TextDecoder().decode(files[n]) : "");
      if (!files["word/document.xml"]) throw new Error("pas de contenu Word dans ce fichier");
      const b = parseManual({ documentXml: dec("word/document.xml"), stylesXml: dec("word/styles.xml"), relsXml: dec("word/_rels/document.xml.rels") });
      if (!b.chapters.length) throw new Error("aucun chapitre trouvé : le manuel doit utiliser les styles Titre 1, Titre 2…");
      const srcs = bookImages(b), imgs = {}, images = {}; let skipped = 0, i = 0;
      for (const src of srcs) { i++; setBusy("Préparation des images " + i + " / " + srcs.length + "…"); const bytes = files["word/" + src], ext = (src.split(".").pop() || "").toLowerCase(); const d = bytes ? await shrink(bytes, ext) : null; if (d) { const k = imgKey(src); imgs[k] = d; images[src] = k; } else skipped++; }
      const base = f.name.replace(/\.docx$/i, ""), m = /^([A-Z]{2}\d{3}-\d{3}-[A-Z]{2}\d{3}-[A-Z])\s*-\s*(.+)$/.exec(base);
      setMeta({ ref: m ? m[1] : "", title: m ? m[2] : base });
      setPrev({ name: f.name, book: { ...b, images }, imgs, skipped, size: Object.values(imgs).reduce((s, d) => s + d.length, 0) + JSON.stringify(b).length });
    } catch (x) { setErr("Lecture impossible : " + x.message); }
    setBusy("");
  };
  const save = async () => { if (!prev || !bookApi) return; const n = Object.keys(prev.imgs).length;
    if (cur.length && !(await askConfirm({ title: "Remplacer le livret actuel ?", message: "Les réponses déjà saisies sur les PJ sont gardées pour les étapes de même titre.", confirmLabel: "Remplacer le livret" }))) return;
    setBusy("Enregistrement…"); const ok = await bookApi.save({ ...prev.book, title: meta.title.trim() || "Livret de configuration", ref: meta.ref.trim() }, prev.imgs, k => setBusy("Enregistrement des images " + k + " / " + n + "…")); setBusy(""); if (ok) setPrev(null); };
  const steps = prev ? bookStepsOf(prev.book) : [];
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <section style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 320px" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Livret de configuration · {cur.length ? (book.title || "Livret") : "pas encore chargé"}</div>
        <div style={{ fontSize: 13, color: T.ink500 }}>{cur.length ? (book.ref ? book.ref + " · " : "") + book.chapters.length + " chapitres · " + cur.length + " étapes" + (book.at ? " · importé le " + new Date(book.at).toLocaleDateString("fr-FR") + (book.by ? " par " + book.by : "") : "") : "Importez le manuel Word : il est découpé en chapitres (titres 1) et en étapes (chaque titre qui porte du texte, un tableau ou une image)."}</div>
      </div>
      <label style={{ ...btn(true), display: "inline-flex", alignItems: "center", cursor: busy ? "default" : "pointer" }}>Importer le manuel Word…<input type="file" accept=".docx" disabled={!!busy} onChange={pick} aria-label="Manuel Word (.docx)" style={{ display: "none" }} /></label>
    </section>
    {busy && <div role="status" style={{ fontSize: FZ.sm, color: T.ink700, fontWeight: 600 }}>{busy}</div>}
    {err && <div role="alert" style={{ fontSize: FZ.sm, color: T.red600, fontWeight: 600 }}>{err}</div>}
    {prev && <section style={{ background: T.card, border: "1.5px solid " + T.ink900, borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontWeight: 600 }}>Aperçu : {prev.name}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: T.ink500 }}>Titre du livret<input value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} style={field} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: T.ink500 }}>Référence du document<input value={meta.ref} onChange={e => setMeta(m => ({ ...m, ref: e.target.value }))} style={field} /></label>
      </div>
      <div style={{ fontSize: FZ.sm, color: T.ink700 }}>{prev.book.chapters.length} chapitres · {steps.length} étapes · {Object.keys(prev.imgs).length} images{prev.skipped ? " (" + prev.skipped + " non lisibles, ignorées)" : ""} · environ {Math.round(prev.size / 1024)} Ko</div>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: T.ink700, maxHeight: 260, overflow: "auto" }}>{prev.book.chapters.map(c => <li key={c.id} style={{ marginBottom: 4 }}><b style={{ color: T.ink900 }}>{c.title}</b> <span style={{ color: T.ink500 }}>({c.steps.length})</span> : {c.steps.slice(0, 6).map(s => s.title).join(", ")}{c.steps.length > 6 ? "…" : ""}</li>)}</ol>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}><button type="button" style={btn(false, true)} onClick={() => setPrev(null)}>Annuler</button><button type="button" style={btn(true)} disabled={!!busy || !bookApi} onClick={save}>Enregistrer le livret</button></div>
    </section>}
    {!prev && cur.length > 0 && <section style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "10px 14px" }}>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: T.ink700 }}>{book.chapters.map(c => <li key={c.id} style={{ marginBottom: 4 }}><b style={{ color: T.ink900 }}>{c.title}</b> <span style={{ color: T.ink500 }}>({c.steps.length} étape{c.steps.length > 1 ? "s" : ""})</span></li>)}</ol>
    </section>}
  </div>;
}

// D14 : fréquences turbines figées (affichées telles quelles sur la fiche) et limite de vibrations, par point de mesure
function VibModelView({ doc, commit }) {
  const saved = useMemo(() => vibRows(doc && doc.vibModel), [doc]);
  const [rows, setRows] = useState(saved), [dirty, setDirty] = useState(false), [msg, setMsg] = useState("");
  useEffect(() => { if (!dirty) setRows(saved); }, [saved, dirty]);
  useUnsavedGuard(dirty); // v340
  const upd = (i, p) => { setRows(L => L.map((x, k) => (k === i ? { ...x, ...p } : x))); setDirty(true); };
  const save = async () => { const ok = await commit({ vibModel: { rows: rows.filter(r => r.label.trim()), at: new Date().toISOString() } }); if (ok !== false) { setDirty(false); setMsg("Enregistré : s'applique à toutes les fiches de tests."); } else setMsg("L'enregistrement a échoué."); };
  return <section style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div style={{ flex: "1 1 320px" }}><div style={{ fontSize: 16, fontWeight: 600 }}>Fréquences turbines et vibrations</div>
      <div style={{ fontSize: 13, color: T.ink500 }}>Étape de la checklist de debug : la fréquence est figée (affichée), le testeur saisit la vibration relevée ; au-dessus de la limite, la ligne passe en rouge.</div></div>
      <button type="button" style={btn(true)} disabled={!dirty} onClick={save}>{dirty ? "Enregistrer" : "Enregistré"}</button></div>
    {msg && <div role="status" style={{ fontSize: FZ.sm, fontWeight: 600, color: /échoué/.test(msg) ? T.red600 : T.emerald600 }}>{msg}</div>}
    <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,1.4fr) minmax(120px,1fr) minmax(120px,1fr) 40px", gap: 6, alignItems: "center" }}>
      {["Point de mesure", "Fréquence figée", "Limite de vibrations", ""].map(h => <div key={h} style={{ fontSize: 12, color: T.ink500 }}>{h}</div>)}
      {rows.map((r, i) => <React.Fragment key={r.id}>
        <input value={r.label} onChange={e => upd(i, { label: e.target.value })} aria-label="Point de mesure" style={field} />
        <input value={r.freq} onChange={e => upd(i, { freq: e.target.value })} placeholder="ex. 500 Hz" aria-label={"Fréquence figée : " + r.label} style={field} />
        <input value={r.limit} onChange={e => upd(i, { limit: e.target.value })} placeholder="ex. 4,5 mm/s" aria-label={"Limite de vibrations : " + r.label} style={field} />
        <button type="button" aria-label={"Supprimer " + r.label} style={{ ...mini, color: T.red600 }} onClick={() => { setRows(L => L.filter((_, k) => k !== i)); setDirty(true); }}>×</button>
      </React.Fragment>)}
    </div>
    <div><button type="button" onClick={() => { setRows(L => [...L, { id: nid("v"), label: "Nouveau point", freq: "", limit: "" }]); setDirty(true); }} style={{ border: "none", background: "transparent", color: T.ink700, fontWeight: 600, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font, minHeight: 28 }}>＋ Ajouter un point de mesure</button></div>
  </section>;
}
