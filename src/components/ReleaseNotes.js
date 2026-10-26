import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { T, FZ } from "../theme";
import { NavIcon } from "./SharedUI";
import { RELEASES } from "../releaseNotes";
import { RELEASE_CATALOG } from "../releaseCatalog";

// Nouveautés à la connexion : une fois par personne et par poste, jusqu'à ce qu'une nouvelle entrée soit ajoutée dans releaseNotes.js.
const KEY = u => "enogia_releaseSeen_" + String(u || "anon").toLowerCase();
const read = u => { try { return localStorage.getItem(KEY(u)) || null; } catch (e) { return null; } };
const write = (u, v) => { try { localStorage.setItem(KEY(u), v); } catch (e) { /* stockage indisponible : le message reviendra */ } };
// v146.18 : on mémorise aussi la DATE de la dernière nouveauté vue. Si son identifiant a disparu de la liste (publication remplacée,
// notes du code retirées…), on ne ré-affiche pas tout : seules les nouveautés plus récentes que cette date comptent.
const KEYD = u => KEY(u) + "_date";
const readDate = u => { try { return localStorage.getItem(KEYD(u)) || null; } catch (e) { return null; } };
const writeDate = (u, v) => { try { localStorage.setItem(KEYD(u), v || ""); } catch (e) { /* idem */ } };

// Liste effective : publications enregistrées depuis l'appli (planning/overrides.releaseNotes) + celles du code (releaseNotes.js) ; à id égal, l'appli l'emporte.
export function mergeReleases(stored, code = RELEASES) {
  const st = Array.isArray(stored) ? stored.filter(r => r && r.id && Array.isArray(r.items)) : [];
  // Une publication « catalogue » (replaceCode) remplace les notes du code datées du même jour ou avant : on n'annonce que ce qui a été coché.
  // Même désactivée (off = préparée, pas encore affichée), elle masque ces notes : rien ne s'affiche tant qu'on ne l'active pas.
  // v146.18 : dès qu'une publication « catalogue » existe, les notes du code ne s'affichent plus du tout : seul ce qui a été coché et publié est annoncé.
  const catalogue = st.some(r => r.replaceCode);
  const all = [...st, ...code.filter(c => !st.some(r => r.id === c.id) && !catalogue)];
  return all.map((r, i) => ({ r, i })).sort((a, b) => String(b.r.date || "").localeCompare(String(a.r.date || "")) || a.i - b.i).map(x => x.r);
}

export function pickUnseen(releases, seenId, isAdmin, seenDate) {
  releases = releases.filter(r => !r.off);
  if (!releases.length) return [];
  const idx = seenId ? releases.findIndex(r => r.id === seenId) : -1;
  // Identifiant connu : tout ce qui est avant lui. Inconnu mais date connue : ce qui est strictement plus récent. Sinon (première visite) : les 3 dernières.
  const base = idx !== -1 ? releases.slice(0, idx) : seenId && seenDate ? releases.filter(r => String(r.date || "") > seenDate) : releases;
  const fresh = base.slice(0, 3);
  return fresh.map(r => ({ ...r, items: r.items.filter(i => !i.hidden && (!i.admin || isAdmin)) })).filter(r => r.items.length);
}

export function useUnseenReleases(userKey, isAdmin, releases = RELEASES) {
  const [seen, setSeen] = useState(() => ({ id: read(userKey), date: readDate(userKey) }));
  useEffect(() => { setSeen({ id: read(userKey), date: readDate(userKey) }); }, [userKey]);
  const unseen = useMemo(() => (userKey ? pickUnseen(releases, seen.id, isAdmin, seen.date) : []), [seen, userKey, isAdmin, releases]);
  const markSeen = useCallback(() => {
    if (!userKey || !releases.length) return;
    const top = releases.find(r => !r.off) || releases[0]; write(userKey, top.id); writeDate(userKey, top.date); setSeen({ id: top.id, date: top.date || null });
  }, [userKey, releases]);
  return { unseen, markSeen };
}

const fmtDate = s => { try { return new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return s; } };

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
        {releases.map((r, ri) => (<div key={r.id} style={{ paddingTop: ri ? 10 : 0 }}>
          {(releases.length > 1 || ri > 0) && <div style={{ fontSize: 11.5, color: T.ink500, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", margin: "14px 0 2px" }}>{r.title} · {fmtDate(r.date)}</div>}
          {r.items.map((i, k) => (<div key={i.t} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: (k < r.items.length - 1 || ri < releases.length - 1) ? "1px solid " + T.line : "none" }}>
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
const BTN = (primary, dis) => ({ border: primary ? "none" : "1px solid " + T.line, background: primary ? (dis ? T.surfaceAlt : T.navy700) : T.card, color: primary ? (dis ? T.ink300 : "#fff") : T.ink700, borderRadius: 8, padding: "7px 14px", fontSize: FZ.sm, fontWeight: 700, cursor: dis ? "not-allowed" : "pointer", fontFamily: T.font });
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
  return (<div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: T.font }}>
    <div>
      <div style={{ fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>Pop-up « Nouveautés » à la connexion</div>
      <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 2 }}>Choisissez les lignes à afficher (case cochée = affichée), reformulez-les, ajoutez-en. « Publier » le réaffiche à tout le monde ; « Enregistrer » corrige le texte sans le réafficher. Ce réglage est propre à cette version du site (test ou production).</div>
    </div>
    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: FZ.xs, fontWeight: 700, color: T.ink500 }}>Titre
      <input value={d.title || ""} onChange={e => setD({ ...d, title: e.target.value })} style={INP} /></label>
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: FZ.sm, color: T.ink700, fontWeight: 600 }}>
      <input type="checkbox" checked={!d.off} onChange={e => setD({ ...d, off: !e.target.checked })} /> Afficher ce pop-up aux utilisateurs</label>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: d.off ? .5 : 1 }}>
      {d.items.map((it, i) => (<div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "start", border: "1px solid " + T.line, borderRadius: 10, padding: 8, background: it.hidden ? T.surfaceAlt : T.surface }}>
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
  return (<div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: T.font, marginBottom: 14 }}>
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
        return (<div key={g.v} style={{ border: "1px solid " + T.line, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 12px", background: T.surface, borderBottom: "1px solid " + T.line, flexWrap: "wrap" }}>
            <b style={{ fontSize: FZ.sm, color: T.ink900 }}>V{g.v}</b><span style={{ fontSize: FZ.xs, color: T.ink500, flex: 1, minWidth: 0 }}>{g.t}</span>
            <span style={{ fontSize: FZ.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{n} / {rows.length}</span>
            <button onClick={() => setMany(rows.map(x => x.k), !all)} style={{ border: "none", background: "transparent", color: T.teal600, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", padding: "2px 4px" }}>{all ? "Aucune" : "Toutes"}</button>
          </div>
          {rows.map(({ it, k }) => (<label key={k} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 10, padding: "8px 12px", borderTop: "1px solid " + T.line, cursor: "pointer", background: sel.has(k) ? T.teal100 : "transparent", alignItems: "start" }}>
            <input type="checkbox" style={{ ...CB, marginTop: 3 }} checked={sel.has(k)} onChange={() => flip(k)} />
            <span style={{ minWidth: 0 }}>
              <span style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900 }}>{it[0]}{it[2] === "admin" && <span style={{ marginLeft: 8, fontSize:11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: T.ink500, border: "1px solid " + T.line, borderRadius: 99, padding: "0 6px" }}>Admin</span>}</span>
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
