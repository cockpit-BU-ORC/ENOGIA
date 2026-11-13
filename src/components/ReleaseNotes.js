import React, { useState, useEffect, useMemo, useRef } from "react";
import { T, FZ, btn } from "../theme";
import { NavIcon } from "./SharedUI";
import { RELEASES } from "../releaseNotes";
import { RELEASE_CATALOG } from "../releaseCatalog";

// v324 : logique « vu » dans releaseSeen.js (module léger) ; ici, les notes du code par défaut
import { mergeReleases as mergeR, pickUnseen, useUnseenReleases as useUnseenR } from "../releaseSeen";
export { pickUnseen };
export const mergeReleases = (stored, code = RELEASES) => mergeR(stored, code);
export const useUnseenReleases = (userKey, isAdmin, releases = RELEASES) => useUnseenR(userKey, isAdmin, releases);

// Icône choisie d'après le titre de la ligne (aucune saisie nécessaire dans l'éditeur).
const ICONS = [[/frise|« i »/i, "list"], [/couleur|palette|contraste/i, "palette"], [/écran|tv|diapo/i, "screen"], [/alerte|mise à jour|modif|repère/i, "changes"], [/calendrier|date|aujourd/i, "calendar"],
  [/étape|montage|élec|état|avancement|production/i, "gauge"], [/cash|euro|paiement/i, "euro"], [/menu|bouton|manager|mode sombre/i, "settings"], [/icône|logo/i, "tag"], [/commentaire/i, "comments"]];
const iconFor = t => { const m = ICONS.find(([re]) => re.test(t || "")); return m ? m[1] : "check"; };

export function ReleasePopup({ releases, userName, onClose }) {
  const okRef = useRef(null);
  useEffect(() => { if (okRef.current) okRef.current.focus(); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape" || e.key === "Enter") onClose(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const first = (userName || "").split(/[\s@]/)[0];
  const dark = T.mode === "dark";
  const total = releases.reduce((a, r) => a + r.items.length, 0);
  return (<div className="enogia-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(10,20,34,.58)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-labelledby="rel-title" className="enogia-modal-pop" style={{ background: T.card, color: T.ink900, borderRadius: 22, border: "1px solid " + T.line, boxShadow: "0 30px 80px rgba(8,16,30,.38)", width: "min(600px,100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", fontFamily: T.font, overflow: "hidden" }}>
      {/* bandeau */}
      <div style={{ position: "relative", flexShrink: 0, padding: "26px 30px 24px", color: "#fff", background: "linear-gradient(135deg," + (dark ? "#16324A" : T.navy700) + " 0%," + (dark ? "#1B5E73" : T.teal600) + " 100%)", overflow: "hidden" }}>
        <span aria-hidden="true" style={{ position: "absolute", right: -40, top: -50, width: 190, height: 190, borderRadius: "50%", background: "rgba(255,255,255,.09)" }} />
        <span aria-hidden="true" style={{ position: "absolute", right: 60, bottom: -70, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <img src={(process.env.PUBLIC_URL || "") + "/enogia-logo-white.svg"} alt="ENOGIA" style={{ height: 30, width: "auto" }} />
          <span style={{ background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 999, padding: "3px 12px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>{total} nouveauté{total > 1 ? "s" : ""}</span>
        </div>
        <h2 id="rel-title" style={{ position: "relative", margin: "18px 0 0", fontSize: 27, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-.015em", fontFamily: T.fontDisplay || T.font }}>{first ? "Bonjour " + first + ", le planning évolue" : "Le planning évolue"}</h2>
        <div style={{ position: "relative", marginTop: 6, fontSize: FZ.sm, opacity: .85 }}>Voici ce qui change depuis votre dernière visite.</div>
      </div>
      {/* contenu */}
      <div className="enogia-stagger" style={{ padding: "8px 30px 4px", overflowY: "auto", flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* v244 (demandé : « sans marquer le numéro de la version ») : toutes les lignes à la suite, sans titre de version */}
        {releases.map((r, ri) => (<div key={r.id}>
          {r.items.map((i, k) => (<div key={i.t + k} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: (k < r.items.length - 1 || ri < releases.length - 1) ? "1px solid " + T.line : "none" }}>
            <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: dark ? "#9BD6E4" : T.teal600, background: dark ? "rgba(99,185,210,.14)" : T.teal100, border: "1px solid " + (dark ? "rgba(99,185,210,.28)" : T.teal400 + "55") }}><NavIcon name={iconFor(i.t)} size={19} /></span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: FZ.md, fontWeight: 700, lineHeight: 1.25, overflowWrap: "anywhere" }}>{i.t}</div>
              {i.d && <div style={{ fontSize: FZ.sm, color: T.ink700, lineHeight: 1.5, marginTop: 3, overflowWrap: "anywhere" }}>{i.d}</div>}
            </div>
          </div>))}
        </div>))}
      </div>
      <div style={{ display: "flex", flexShrink: 0, alignItems: "center", justifyContent: "flex-end", padding: "14px 30px 24px" }}>
        <button ref={okRef} onClick={onClose} className="enogia-btn-tap" style={{ border: "none", color: "#fff", background: "linear-gradient(135deg," + (dark ? "#1E5C7A" : T.navy700) + "," + (dark ? "#2A8099" : T.teal600) + ")", borderRadius: 12, padding: "11px 28px", fontSize: FZ.sm, fontWeight: 800, letterSpacing: ".01em", cursor: "pointer", fontFamily: T.font, boxShadow: "0 8px 20px rgba(20,60,90,.28)" }}>C'est compris</button>
      </div>
    </div>
  </div>);
}

// ── Éditeur (super admin) : choisir ce qui s'affiche dans le pop-up « Nouveautés » ───────────────────────────────
// Enregistrer = modifie le texte sans le réafficher à ceux qui l'ont déjà vu. Publier = nouvelle publication, réaffichée à tout le monde.
const INP = { width: "100%", boxSizing: "border-box", border: "1px solid " + T.line, borderRadius: 8, padding: "6px 9px", fontSize: FZ.sm, fontFamily: T.font, color: T.ink900, background: T.card };
const BTN = (primary, dis) => ({ ...btn(primary ? "pri" : "sec", "md"), ...(dis ? { opacity: .45, cursor: "not-allowed" } : {}) }); // v286 : bouton commun
export function ReleaseEditor({ releases, onSave, authorName }) {
  const latest = releases[0] || { id: "", date: new Date().toISOString().slice(0, 10), title: "Ce qui change dans le planning", items: [] };
  const [d, setD] = useState(() => JSON.parse(JSON.stringify(latest)));
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(false);
  const setItem = (i, patch) => setD(x => ({ ...x, items: x.items.map((it, j) => j === i ? { ...it, ...patch } : it) }));
  const move = (i, k) => setD(x => { const a = [...x.items], j = i + k; if (j < 0 || j >= a.length) return x; [a[i], a[j]] = [a[j], a[i]]; return { ...x, items: a }; });
  const clean = () => ({ ...d, title: (d.title || "").trim() || "Ce qui change dans le planning", items: d.items.filter(i => (i.t || "").trim()).map(i => ({ ...i, t: i.t.trim(), d: (i.d || "").trim() })) });
  const others = releases.slice(1, 6);
  const save = async (fresh) => {
    const rel = clean();
    if (fresh) { rel.id = "r" + Date.now().toString(36); rel.date = new Date().toISOString().slice(0, 10); delete rel.off; }
    else if (!rel.id) rel.id = "r" + Date.now().toString(36);
    const list = [rel, ...others.filter(o => o.id !== rel.id)];
    setMsg("Enregistrement…");
    try { await onSave(list); setD(JSON.parse(JSON.stringify(rel))); setMsg(fresh ? "✓ Publié : le pop-up s'affichera à la prochaine connexion de chacun." : "✓ Enregistré (sans le réafficher à ceux qui l'ont déjà vu)."); }
    catch (e) { setMsg("Échec de l'enregistrement : " + (e && e.message ? e.message : e)); }
  };
  const shownCount = d.items.filter(i => !i.hidden && (i.t || "").trim()).length;
  return (<div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: T.font }}>
    <div>
      <div style={{ fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>Pop-up « Nouveautés » à la connexion</div>
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 2 }}>Choisissez les lignes à afficher (case cochée = affichée), reformulez-les, ajoutez-en. « Publier » le réaffiche à tout le monde ; « Enregistrer » corrige le texte sans le réafficher. Ce réglage est propre à cette version du site (test ou production).</div>
    </div>
    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: FZ.xs, fontWeight: 700, color: T.ink500 }}>Titre
      <input value={d.title || ""} onChange={e => setD({ ...d, title: e.target.value })} style={INP} /></label>
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: FZ.sm, color: T.ink700, fontWeight: 600 }}>
      <input type="checkbox" checked={!d.off} onChange={e => setD({ ...d, off: !e.target.checked })} /> Afficher ce pop-up aux utilisateurs</label>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: d.off ? .5 : 1 }}>
      {d.items.map((it, i) => (<div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "start", border: "1px solid " + T.line, borderRadius: 12, padding: 8, background: it.hidden ? T.surfaceAlt : T.surface }}>
        <input type="checkbox" title="Afficher cette ligne" checked={!it.hidden} onChange={e => setItem(i, { hidden: !e.target.checked })} style={{ marginTop: 9 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
          <input value={it.t || ""} placeholder="Titre court" onChange={e => setItem(i, { t: e.target.value })} style={{ ...INP, fontWeight: 700 }} />
          <textarea value={it.d || ""} placeholder="Une phrase pour expliquer" rows={2} onChange={e => setItem(i, { d: e.target.value })} style={{ ...INP, resize: "vertical" }} />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: FZ.xs, color: T.ink500 }}><input type="checkbox" checked={!!it.admin} onChange={e => setItem(i, { admin: e.target.checked })} /> Réservé au super admin (ex. Cash in)</label>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button onClick={() => move(i, -1)} title="Monter" style={BTN(false)}>↑</button>
          <button onClick={() => move(i, 1)} title="Descendre" style={BTN(false)}>↓</button>
          <button onClick={() => setD(x => ({ ...x, items: x.items.filter((_, j) => j !== i) }))} title="Supprimer la ligne" aria-label="Supprimer la ligne" style={{ ...BTN(false), color: T.red500, display: "inline-flex", alignItems: "center" }}><NavIcon name="close" size={13}/></button>
        </div>
      </div>))}
      <div><button onClick={() => setD(x => ({ ...x, items: [...x.items, { t: "", d: "" }] }))} style={BTN(false)}>+ Ajouter une nouveauté</button></div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button onClick={() => setPreview(true)} disabled={!shownCount} style={BTN(false)}>Aperçu</button>
      <button onClick={() => save(false)} style={BTN(false)}>Enregistrer</button>
      <button onClick={() => save(true)} disabled={!shownCount} style={BTN(true, !shownCount)}>Publier et réafficher à tous</button>
      <span style={{ fontSize: FZ.xs, color: msg.startsWith("✓") ? T.emerald500 : T.ink500, fontWeight: 600 }}>{msg}</span>
    </div>
    {preview && <ReleasePopup releases={[{ ...clean(), items: clean().items.filter(i => !i.hidden) }]} userName={authorName} onClose={() => setPreview(false)} />}
  </div>);
}

// ── Catalogue : choisir, parmi toutes les nouveautés depuis la V146.5, celles à annoncer à la production ─────────────
// Sur le site bêta : « Publier vers la production » écrit le pop-up dans le document de la production (planning/overrides).
// Sur la production : « Publier ici ». La sélection en cours est mémorisée (overrides.releaseSelection) pour y revenir.
const keyOf = (v, i) => v + "#" + i;
export function ReleaseCatalog({ isBeta, selection, onSaveSelection, onPublish, authorName }) {
  const [sel, setSel] = useState(() => new Set((selection && selection.keys) || []));
  const [title, setTitle] = useState((selection && selection.title) || "Ce qui change dans le planning");
  const [hideAdmin, setHideAdmin] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState(false);
  const loaded = useRef(false);
  useEffect(() => { if (!loaded.current && selection) { loaded.current = true; setSel(new Set(selection.keys || [])); if (selection.title) setTitle(selection.title); } }, [selection]);
  const flip = k => { setConfirm(false); setSel(a => { const n = new Set(a); n.has(k) ? n.delete(k) : n.add(k); return n; }); };
  const visible = (g) => g.items.map((it, i) => ({ it, k: keyOf(g.v, i) })).filter(x => !(hideAdmin && x.it[2] === "admin"));
  const setMany = (keys, on) => { setConfirm(false); setSel(a => { const n = new Set(a); keys.forEach(k => on ? n.add(k) : n.delete(k)); return n; }); };
  const chosen = useMemo(() => RELEASE_CATALOG.map(g => ({ g, rows: g.items.map((it, i) => ({ it, k: keyOf(g.v, i) })).filter(x => sel.has(x.k)) })).filter(x => x.rows.length), [sel]);
  const nChosen = chosen.reduce((a, x) => a + x.rows.length, 0);
  const build = (off) => ({ id: "r" + Date.now().toString(36), date: new Date().toISOString().slice(0, 10), title: title.trim() || "Ce qui change dans le planning", replaceCode: true, ...(off ? { off: true } : {}),
    items: chosen.flatMap(x => x.rows.map(r => ({ t: r.it[0], d: r.it[1], ...(r.it[2] === "admin" ? { admin: true } : {}) }))) });
  const previewRel = () => [build()];
  const saveDraft = async () => { setMsg("Enregistrement…"); try { await onSaveSelection({ keys: [...sel], title, by: authorName || "", at: new Date().toISOString() }); setMsg("✓ Sélection enregistrée sur ce site."); } catch (e) { setMsg("Échec : " + (e && e.message ? e.message : e)); } };
  const sel0 = () => ({ keys: [...sel], title, by: authorName || "", at: new Date().toISOString() });
  // « Préparer » : le pop-up est écrit sur la production mais désactivé ; il ne s'affiche à personne et masque les notes du code.
  // On l'active ensuite depuis la production (Réglages › Nouveautés › case « Afficher ce pop-up » puis « Publier et réafficher à tous »).
  const prepare = async () => {
    setMsg("Préparation…");
    try { await onSaveSelection(sel0()); await onPublish(build(true), sel0()); setConfirm(false); setMsg(isBeta ? "✓ Préparé sur la production, sans pop-up : à activer depuis la production (Réglages › Nouveautés)." : "✓ Préparé, sans pop-up : cochez « Afficher ce pop-up » dans l'éditeur ci-dessous pour l'activer."); }
    catch (e) { setMsg("Échec : " + (e && e.code === "permission-denied" ? "écriture refusée par les règles Firestore." : (e && e.message ? e.message : e))); }
  };
  const publish = async () => {
    if (!confirm) { setConfirm(true); return; }
    setMsg("Publication…");
    try { await onSaveSelection(sel0()); await onPublish(build(), sel0()); setConfirm(false); setMsg(isBeta ? "✓ Publié sur la production : le pop-up s'affichera à la prochaine connexion de chacun." : "✓ Publié : le pop-up s'affichera à la prochaine connexion de chacun."); }
    catch (e) { setConfirm(false); setMsg("Échec de la publication : " + (e && e.code === "permission-denied" ? "écriture refusée par les règles Firestore." : (e && e.message ? e.message : e))); }
  };
  const copy = async () => {
    const txt = chosen.map(x => "V" + x.g.v + " — " + x.g.t + "\n" + x.rows.map(r => "- " + r.it[0] + " : " + r.it[1]).join("\n")).join("\n\n");
    try { await navigator.clipboard.writeText(txt); setMsg("✓ Texte copié."); } catch (e) { setMsg("Copie impossible sur ce navigateur."); }
  };
  const CB = { accentColor: T.teal600 };
  return (<div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: T.font, marginBottom: 14 }}>
    <div>
      <div style={{ fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>Nouveautés à annoncer{isBeta ? " à la production" : ""}</div>
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 2 }}>Toutes les évolutions depuis la V146.5. Cochez celles à annoncer ; « {isBeta ? "Publier vers la production" : "Publier"} » crée le pop-up « Nouveautés » affiché une fois à chaque personne{isBeta ? " du site de production" : ""}, à sa prochaine connexion. Il remplace les notes de version intégrées au code.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input value={title} onChange={e => setTitle(e.target.value)} aria-label="Titre du pop-up" style={{ ...INP, flex: "1 1 240px", width: "auto", fontWeight: 700 }} />
      <button onClick={() => setMany(RELEASE_CATALOG.flatMap(g => visible(g).map(x => x.k)), true)} style={BTN(false)}>Tout cocher</button>
      <button onClick={() => setMany(RELEASE_CATALOG.flatMap(g => g.items.map((_, i) => keyOf(g.v, i))), false)} style={BTN(false)}>Tout décocher</button>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: FZ.xs, color: T.ink500, fontWeight: 600 }}><input type="checkbox" style={CB} checked={hideAdmin} onChange={e => setHideAdmin(e.target.checked)} /> Masquer les lignes admin</label>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
      {[...RELEASE_CATALOG].reverse().map(g => { const rows = visible(g); if (!rows.length) return null; const n = rows.filter(x => sel.has(x.k)).length, all = n === rows.length;
        return (<div key={g.v} style={{ border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 12px", background: T.surface, borderBottom: "1px solid " + T.line, flexWrap: "wrap" }}>
            <b style={{ fontSize: FZ.sm, color: T.ink900 }}>V{g.v}</b><span style={{ fontSize: FZ.xs, color: T.ink500, flex: 1, minWidth: 0 }}>{g.t}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{n} / {rows.length}</span>
            <button onClick={() => setMany(rows.map(x => x.k), !all)} style={{ border: "none", background: "transparent", color: T.teal600, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", padding: "2px 4px" }}>{all ? "Aucune" : "Toutes"}</button>
          </div>
          {rows.map(({ it, k }) => (<label key={k} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 10, padding: "8px 12px", borderTop: "1px solid " + T.line, cursor: "pointer", background: sel.has(k) ? T.teal100 : "transparent", alignItems: "start" }}>
            <input type="checkbox" style={{ ...CB, marginTop: 3 }} checked={sel.has(k)} onChange={() => flip(k)} />
            <span style={{ minWidth: 0 }}>
              <span style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900 }}>{it[0]}{it[2] === "admin" && <span style={{ marginLeft: 8, fontSize:11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: T.ink500, border: "1px solid " + T.line, borderRadius: 999, padding: "0 6px" }}>Admin</span>}</span>
              <span style={{ display: "block", fontSize: FZ.xs, color: T.ink500, marginTop: 1 }}>{it[1]}</span>
            </span>
          </label>))}
        </div>); })}
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <b style={{ fontSize: FZ.sm, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{nChosen} nouveauté{nChosen > 1 ? "s" : ""} cochée{nChosen > 1 ? "s" : ""}</b>
      <button onClick={() => setPreview(true)} disabled={!nChosen} style={BTN(false)}>Aperçu</button>
      <button onClick={copy} disabled={!nChosen} style={BTN(false)}>Copier le texte</button>
      <button onClick={saveDraft} style={BTN(false)} title="Mémorise vos coches sur ce site uniquement, sans rien publier">Enregistrer la sélection</button>
      <button onClick={prepare} disabled={!nChosen} style={BTN(false)} title="Écrit le pop-up sur la production sans l'afficher : vous l'activerez plus tard depuis la production">{isBeta ? "Préparer pour la production (sans pop-up)" : "Préparer sans afficher"}</button>
      <button onClick={publish} disabled={!nChosen} style={BTN(true, !nChosen)}>{confirm ? "Confirmer : publier" + (isBeta ? " sur la production" : "") + " (" + nChosen + ")" : isBeta ? "Publier vers la production" : "Publier et réafficher à tous"}</button>
      {confirm && <button onClick={() => setConfirm(false)} style={BTN(false)}>Annuler</button>}
      <span style={{ fontSize: FZ.xs, color: msg.startsWith("✓") ? T.emerald500 : T.ink500, fontWeight: 600 }}>{msg}</span>
    </div>
    {preview && <ReleasePopup releases={previewRel()} userName={authorName} onClose={() => setPreview(false)} />}
  </div>);
}

// ── v244 : un seul réglage pour le pop-up « Nouveautés » ──────────────────────────────────────────────────────────────
// Demandé : « je ne comprends pas pourquoi il y a 2 pop-up, je dois en avoir un seul, sélectionner ce que je veux afficher (et pouvoir
// le modifier) sans marquer le numéro de la version ». On coche dans le catalogue, chaque ligne cochée se reformule sur place,
// on peut ajouter des lignes libres ; « Enregistrer » corrige le pop-up en ligne sans le réafficher, « Publier » le réaffiche à tous.
// La sélection garde les reformulations (selection.edits[clé] = { t, d }) et les lignes libres (selection.extra = [{ t, d }]).
export function ReleaseManager({ isBeta, selection, releases, onSaveSelection, onPublish, authorName }) {
  const s0 = selection || {};
  const [sel, setSel] = useState(() => new Set(s0.keys || []));
  const [edits, setEdits] = useState(() => s0.edits || {});
  const [extra, setExtra] = useState(() => s0.extra || []);
  const [title, setTitle] = useState(s0.title || "Ce qui change dans le planning");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState(false);
  const loaded = useRef(!!selection);
  useEffect(() => { if (!loaded.current && selection) { loaded.current = true; setSel(new Set(selection.keys || [])); setEdits(selection.edits || {}); setExtra(selection.extra || []); if (selection.title) setTitle(selection.title); } }, [selection]);
  const touch = () => { setConfirm(false); setMsg(""); };
  const flip = k => { touch(); setSel(a => { const n = new Set(a); n.has(k) ? n.delete(k) : n.add(k); return n; }); };
  const lineOf = (g, i) => { const it = g.items[i], e = edits[keyOf(g.v, i)] || {}; return { t: e.t != null ? e.t : it[0], d: e.d != null ? e.d : it[1], admin: it[2] === "admin" }; };
  const setEdit = (k, patch) => { touch(); setEdits(x => ({ ...x, [k]: { ...(x[k] || {}), ...patch } })); };
  // lignes choisies, de la plus récente à la plus ancienne ; les lignes libres en tête
  const chosen = useMemo(() => [...RELEASE_CATALOG].reverse().flatMap(g => g.items.map((_, i) => ({ g, i, k: keyOf(g.v, i) })).filter(x => sel.has(x.k))), [sel]);
  const items = () => [...extra, ...chosen.map(x => lineOf(x.g, x.i))]
    .map(x => ({ t: String(x.t || "").trim(), d: String(x.d || "").trim(), ...(x.admin ? { admin: true } : {}) })).filter(x => x.t);
  const n = items().length;
  const top = (releases || []).find(r => r && r.replaceCode);
  const sel0 = () => ({ keys: [...sel], edits, extra, title, by: authorName || "", at: new Date().toISOString() });
  const build = keep => ({ id: keep && top ? top.id : "r" + Date.now().toString(36), date: keep && top ? top.date : new Date().toISOString().slice(0, 10), title: title.trim() || "Ce qui change dans le planning", replaceCode: true, items: items() });
  const err = e => "Échec : " + (e && e.code === "permission-denied" ? "écriture refusée par les règles Firestore." : (e && e.message ? e.message : e));
  const save = async () => {
    setMsg("Enregistrement…");
    try {
      await onSaveSelection(sel0());
      if (top && !isBeta && n) await onPublish(build(true), sel0()); // corrige le pop-up en ligne sans le réafficher à ceux qui l'ont vu
      setMsg(top && !isBeta && n ? "✓ Enregistré : le pop-up en ligne est corrigé, sans être réaffiché." : "✓ Sélection enregistrée.");
    } catch (e) { setMsg(err(e)); }
  };
  const publish = async () => {
    if (!confirm) { setConfirm(true); return; }
    setMsg("Publication…");
    try { await onSaveSelection(sel0()); await onPublish(build(false), sel0()); setConfirm(false); setMsg("✓ Publié : le pop-up s'affichera une fois à chacun, à sa prochaine connexion" + (isBeta ? " (site de production)" : "") + "."); }
    catch (e) { setConfirm(false); setMsg(err(e)); }
  };
  const CB = { accentColor: T.teal600, width: 16, height: 16, marginTop: 3 };
  const ql = q.trim().toLowerCase();
  const groups = [...RELEASE_CATALOG].reverse().map(g => ({ g, rows: g.items.map((it, i) => ({ it, i, k: keyOf(g.v, i) })).filter(x => !ql || (x.it[0] + " " + x.it[1] + " " + g.t).toLowerCase().includes(ql)) })).filter(x => x.rows.length);
  const setX = (j, patch) => { touch(); setExtra(a => a.map((y, m) => m === j ? { ...y, ...patch } : y)); };
  return (<div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: T.font, marginBottom: 14 }}>
    <div>
      <div style={{ fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>Pop-up « Nouveautés »</div>
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 2, lineHeight: 1.5 }}>Cochez ce que vous voulez annoncer ; chaque ligne cochée peut être reformulée. « Publier » l'affiche une fois à chacun, à sa prochaine connexion{isBeta ? " sur le site de production" : ""}. « Enregistrer » garde vos choix{isBeta ? "" : " et corrige le pop-up déjà publié sans le réafficher"}.</div>
    </div>
    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: FZ.xs, fontWeight: 700, color: T.ink500 }}>Titre du pop-up
      <input value={title} onChange={e => { touch(); setTitle(e.target.value); }} style={{ ...INP, fontWeight: 700 }} /></label>
    {extra.map((x, j) => (<div key={"x" + j} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, border: "1px solid " + T.line, background: T.teal100, borderRadius: 12, padding: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
        <input value={x.t || ""} placeholder="Titre court" aria-label="Titre de la ligne" onChange={e => setX(j, { t: e.target.value })} style={{ ...INP, fontWeight: 700 }} />
        <textarea value={x.d || ""} placeholder="Une phrase pour expliquer" aria-label="Explication" rows={2} onChange={e => setX(j, { d: e.target.value })} style={{ ...INP, resize: "vertical" }} />
      </div>
      <button onClick={() => { touch(); setExtra(a => a.filter((_, m) => m !== j)); }} title="Supprimer la ligne" aria-label="Supprimer la ligne" style={{ ...BTN(false), color: T.red500, alignSelf: "start", display: "inline-flex", alignItems: "center" }}><NavIcon name="close" size={13} /></button>
    </div>))}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button onClick={() => { touch(); setExtra(a => [...a, { t: "", d: "" }]); }} style={BTN(false)}>+ Ajouter une ligne</button>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher une nouveauté…" aria-label="Chercher une nouveauté" style={{ ...INP, flex: "1 1 220px", width: "auto" }} />
      <button onClick={() => { touch(); setSel(new Set()); }} disabled={!sel.size} style={BTN(false)}>Tout décocher</button>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflowY: "auto", paddingRight: 4 }}>
      {groups.map(({ g, rows }) => (<div key={g.v} style={{ border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "7px 12px", background: T.surface, borderBottom: "1px solid " + T.line, fontSize: FZ.xs, fontWeight: 700, color: T.ink700 }}>{g.t}</div>
        {rows.map(({ it, i, k }) => { const on = sel.has(k), L = lineOf(g, i);
          return (<div key={k} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 10, padding: "8px 12px", borderTop: "1px solid " + T.line, background: on ? T.teal100 : "transparent", alignItems: "start" }}>
            <input type="checkbox" style={CB} checked={on} onChange={() => flip(k)} aria-label={"Annoncer : " + it[0]} />
            {on ? <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
              <input value={L.t} aria-label="Titre de la ligne" onChange={e => setEdit(k, { t: e.target.value })} style={{ ...INP, fontWeight: 700 }} />
              <textarea value={L.d} aria-label="Explication" rows={2} onChange={e => setEdit(k, { d: e.target.value })} style={{ ...INP, resize: "vertical" }} />
              {edits[k] && <button onClick={() => { touch(); setEdits(x => { const y = { ...x }; delete y[k]; return y; }); }} style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: T.teal600, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", padding: 0, minHeight: 24 }}>Revenir au texte d'origine</button>}
            </div> : <div onClick={() => flip(k)} style={{ minWidth: 0, cursor: "pointer" }}>
              <span style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900 }}>{it[0]}{it[2] === "admin" && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: T.ink500, border: "1px solid " + T.line, borderRadius: 999, padding: "0 6px" }}>Propriétaire</span>}</span>
              <span style={{ display: "block", fontSize: FZ.xs, color: T.ink500, marginTop: 1 }}>{it[1]}</span>
            </div>}
          </div>); })}
      </div>))}
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <b style={{ fontSize: FZ.sm, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{n} ligne{n > 1 ? "s" : ""} dans le pop-up</b>
      <button onClick={() => setPreview(true)} disabled={!n} style={BTN(false)}>Aperçu</button>
      <button onClick={save} style={BTN(false)}>Enregistrer</button>
      <button onClick={publish} disabled={!n} style={BTN(true, !n)}>{confirm ? "Confirmer : publier (" + n + ")" : "Publier et afficher à tous"}</button>
      {confirm && <button onClick={() => setConfirm(false)} style={BTN(false)}>Annuler</button>}
      <span role="status" style={{ fontSize: FZ.xs, color: msg.startsWith("✓") ? T.emerald500 : T.ink500, fontWeight: 600 }}>{msg}</span>
    </div>
    {preview && <ReleasePopup releases={[build(false)]} userName={authorName} onClose={() => setPreview(false)} />}
  </div>);
}
