// v305 (maquette `maquettes-design/v304-menu-acces.html`, onglet « Les accès » validé) : Régler › Accès — super admin seul.
// Personnes : un rôle chacune (planning/profiles, le même que pour l'accueil). Rôles et pages : un niveau par page et par rôle
// (Masqué, Lecture, Modifier, Admin) dans planning/access. Aperçu du menu d'un rôle ou d'une personne. Rien ne change pour
// les autres avant « Activer les nouveaux accès » (planning/access.on) ; « Enregistrer » garde le brouillon des deux documents.
import React, { useMemo, useState } from "react";
import { T, btn } from "../theme";
import { PageHead } from "./SharedUI";
import { askConfirm } from "../confirm";
import { profileOf, setProfile, isRemoved } from "../profiles";
import { ACCESS_PAGES, LEVELS, LEVEL_LABEL, levelsOf, rolesOf, roleSummary, accessOn, slugRole } from "../access";

const NEXT = { n: "r", r: "w", w: "a", a: "n" };
const tone = l => l === "a" ? { bg: T.accentSoft, ink: T.accentInk, bd: T.accentInk } : l === "w" ? { bg: T.emerald100, ink: T.emerald600, bd: T.emerald600 } : l === "r" ? { bg: T.info100, ink: T.info600, bd: T.info600 } : { bg: "transparent", ink: T.ink500, bd: T.ink300 };
const LvChip = ({ l, w }) => { const c = tone(l); return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: w || 64, minHeight: 22, borderRadius: 8, fontSize: 12, fontWeight: l === "n" ? 500 : 700, background: c.bg, color: c.ink, border: "1.5px " + (l === "n" ? "dashed " : "solid ") + "color-mix(in srgb, " + c.bd + " 45%, transparent)", padding: "0 6px" }}>{LEVEL_LABEL[l]}</span>; };
const card = { background: T.card, borderRadius: 12, padding: "14px 16px", minWidth: 0 };
const h3 = { margin: "0 0 4px", fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 700, color: T.ink900 };
const hint = { margin: "0 0 10px", fontSize: 13, color: T.ink500 };
const initials = (name, email) => { const s = String(name || email || "?").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean); return ((s[0] || "?")[0] + ((s[1] || "")[0] || "")).toUpperCase(); };

export default function AccessPage({ profiles, saveProfiles, accessDoc, saveAccess, people, ownerEmails }) {
  const owners = useMemo(() => (ownerEmails || []).map(e => String(e).toLowerCase()), [ownerEmails]);
  const base = useMemo(() => ({ roles: rolesOf(accessDoc), levels: levelsOf(accessDoc) }), [accessDoc]);
  const [roles, setRoles] = useState(null), [levels, setLevels] = useState(null), [roleOf, setRoleOf] = useState({}), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const R = roles || base.roles, L = levels || base.levels;
  const list = useMemo(() => {
    const seen = new Map();
    (people || []).forEach(p => { const e = String(p.email || "").toLowerCase(); if (e && !seen.has(e) && !isRemoved(profiles, e)) seen.set(e, { email: e, name: p.name || profileOf(profiles, e).name || "" }); });
    owners.forEach(e => { if (!seen.has(e)) seen.set(e, { email: e, name: "" }); });
    return [...seen.values()].sort((a, b) => (owners.includes(b.email) - owners.includes(a.email)) || (a.name || a.email).localeCompare(b.name || b.email, "fr"));
  }, [people, profiles, owners]);
  const roleNow = e => roleOf[e] != null ? roleOf[e] : profileOf(profiles, e).role || "";
  const [q, setQ] = useState(""), [f, setF] = useState("all"), [pv, setPv] = useState("role:cdp"), [newRole, setNewRole] = useState(null);
  const counts = useMemo(() => { const c = {}; list.forEach(p => { if (owners.includes(p.email)) return; const r = roleNow(p.email) || "autre"; c[r] = (c[r] || 0) + 1; }); return c; }, [list, roleOf, profiles]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = list.filter(p => (f === "all" || (!owners.includes(p.email) && (roleNow(p.email) || "autre") === f)) && (!q || (p.name + " " + p.email).toLowerCase().includes(q.toLowerCase())));
  const nChanges = Object.keys(roleOf).filter(e => roleOf[e] !== (profileOf(profiles, e).role || "")).length
    + (levels ? ACCESS_PAGES.reduce((n, p) => n + R.filter(([k]) => (L[p.id] || {})[k] !== (base.levels[p.id] || {})[k]).length, 0) : 0)
    + (roles ? Math.max(0, R.length - base.roles.length) : 0);
  const on = accessOn(accessDoc);
  const cycle = (page, role) => { const p = ACCESS_PAGES.find(x => x.id === page); let v = NEXT[(L[page] || {})[role] || "n"]; if (p.min && v === "n") v = p.min; setLevels({ ...L, [page]: { ...(L[page] || {}), [role]: v } }); };
  const addRole = () => { const name = String(newRole || "").trim(); if (!name) { setNewRole(null); return; } const id = slugRole(name, R.map(r => r[0]));
    setRoles([...R, [id, name]]); setLevels(Object.fromEntries(ACCESS_PAGES.map(p => [p.id, { ...(L[p.id] || {}), [id]: p.min || "n" }]))); setNewRole(null); setPv("role:" + id); };
  const cancel = () => { setRoles(null); setLevels(null); setRoleOf({}); setMsg(""); };
  const doc = nextOn => ({ on: nextOn, roles: R.map(([id, name]) => ({ id, name })), levels: L });
  const save = async () => {
    setBusy(true); let ok = true;
    const changed = Object.keys(roleOf).filter(e => roleOf[e] !== (profileOf(profiles, e).role || ""));
    if (changed.length) { let next = profiles || {}; changed.forEach(e => { next = setProfile(next, e, { role: roleOf[e] }); }); ok = await saveProfiles(next); }
    if (ok && (levels || roles || !accessDoc || !accessDoc.levels)) ok = await saveAccess(doc(on));
    setBusy(false); if (ok) { cancel(); setMsg("✓ Enregistré" + (on ? " : chacun voit son nouveau menu à sa prochaine ouverture." : ". Les accès ne s'appliqueront qu'après « Activer »")); }
  };
  const toggleOn = async () => {
    if (nChanges && !(await askConfirm({ title: "Enregistrer d'abord ?", message: "Vous avez " + nChanges + " changement(s) non enregistré(s). Ils seront enregistrés avec l'activation.", confirmLabel: "Enregistrer et continuer" }))) return;
    const go = on ? await askConfirm({ title: "Désactiver les nouveaux accès ?", message: "Chacun retrouve ses droits d'avant (admins du Manager, listes d'accès des Turbines et des Achats). Vos rôles et niveaux restent enregistrés.", confirmLabel: "Désactiver", danger: true })
      : await askConfirm({ title: "Activer les nouveaux accès ?", message: "Chaque personne n'aura plus que les pages permises par son rôle ; les anciennes listes (admins du Manager, accès Turbines et Achats) ne comptent plus. Vous restez seul super admin. Pensez à republier les règles de la base (SECURITE.md).", confirmLabel: "Activer" });
    if (!go) return;
    setBusy(true); let ok = true;
    const changed = Object.keys(roleOf).filter(e => roleOf[e] !== (profileOf(profiles, e).role || ""));
    if (changed.length) { let next = profiles || {}; changed.forEach(e => { next = setProfile(next, e, { role: roleOf[e] }); }); ok = await saveProfiles(next); }
    if (ok) ok = await saveAccess(doc(!on));
    setBusy(false); if (ok) { cancel(); setMsg(on ? "Nouveaux accès désactivés : droits d'avant rétablis." : "✓ Nouveaux accès activés."); }
  };
  // aperçu du menu
  const [pk, pval] = pv.split(":"); const pRole = pk === "p" ? (owners.includes(pval) ? "super" : (roleNow(pval) || "autre")) : pval;
  const lvlFor = page => pRole === "super" ? "a" : ((L[page] || {})[pRole] || "n");
  const groups = ["Travailler", "Suivre", "Régler"];
  const th = { fontSize: 12, fontWeight: 600, color: T.ink500, textAlign: "left", padding: "6px 8px", borderBottom: "1px solid " + T.line, verticalAlign: "bottom", whiteSpace: "nowrap" };
  const td = { padding: "4px 8px", borderBottom: "1px solid " + T.line, fontSize: 13, verticalAlign: "middle" };
  const sel = { minHeight: 32, border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, padding: "0 8px", fontFamily: T.font, fontSize: 13, minWidth: 180 };
  const chipF = act => ({ border: "1px solid " + (act ? T.ink900 : T.line), background: act ? T.ink900 : T.card, color: act ? T.card : T.ink700, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, minHeight: 28, cursor: "pointer", fontFamily: T.font });

  return (<div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 70 }}>
    <PageHead title="Accès" sub="Chaque personne a un rôle ; chaque rôle a, pour chaque page, un niveau. Vous seul êtes super admin." accent={T.accentInk} />
    <div role="status" style={{ ...card, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: on ? T.emerald100 : T.amber100, color: on ? T.emerald600 : T.amber600 }}>
      <span style={{ flex: "1 1 320px", fontSize: 13, color: T.ink900 }}>{on
        ? <><b>Nouveaux accès activés</b>{accessDoc && accessDoc.at ? " (dernière modification le " + new Date(accessDoc.at).toLocaleDateString("fr-FR") + ")" : ""} : chacun ne voit que les pages permises par son rôle.</>
        : <><b>Pas encore activés.</b> Tout le monde garde ses droits d'avant (admins du Manager, listes d'accès des Turbines et des Achats). Réglez les rôles, vérifiez l'aperçu, enregistrez, puis activez.</>}</span>
      <button type="button" disabled={busy} onClick={toggleOn} style={{ ...btn(on ? "ghost" : "pri", "md") }}>{on ? "Désactiver" : "Activer les nouveaux accès"}</button>
    </div>

    <section aria-label="Personnes" style={card}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div><h3 style={h3}>Personnes</h3><p style={hint}>Le rôle sert aussi à l'accueil « Aujourd'hui ». Sans rôle = Autres personnes. Pour ajouter quelqu'un : Personnes et site.</p></div>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une personne" aria-label="Rechercher une personne" style={{ ...sel, minWidth: 0, width: "min(280px,100%)", padding: "0 10px" }} />
      </div>
      <div role="group" aria-label="Filtrer par rôle" style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "4px 0 10px" }}>
        <button type="button" aria-pressed={f === "all"} onClick={() => setF("all")} style={chipF(f === "all")}>Tous {list.length}</button>
        {R.map(([k, l]) => <button key={k} type="button" aria-pressed={f === k} onClick={() => setF(k)} style={chipF(f === k)}>{l} {counts[k] || 0}</button>)}
      </div>
      <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 620 }}>
        <thead><tr><th style={th}>Personne</th><th style={th}>Rôle</th><th style={th}>Ce qu'elle ouvre</th></tr></thead>
        <tbody>{shown.map(p => { const own = owners.includes(p.email), r = roleNow(p.email), chg = roleOf[p.email] != null && roleOf[p.email] !== (profileOf(profiles, p.email).role || "");
          return <tr key={p.email}><td style={{ ...td, height: 44 }}><span style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 999, background: T.surfaceAlt, display: "grid", placeItems: "center", fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 11, flex: "0 0 28px" }}>{initials(p.name, p.email)}</span>
            <span style={{ minWidth: 0 }}><b style={{ display: "block", color: T.ink900 }}>{p.name || p.email.replace(/@.*/, "")}</b><span style={{ fontSize: 12, color: T.ink500 }}>{p.email}</span></span></span></td>
            <td style={td}>{own ? <span style={{ display: "inline-flex", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 700, background: T.ink900, color: T.card }}>Super admin</span>
              : <select value={r} onChange={e => setRoleOf({ ...roleOf, [p.email]: e.target.value })} aria-label={"Rôle de " + (p.name || p.email)} style={{ ...sel, boxShadow: chg ? "0 0 0 2px " + T.accent : "none" }}>
                <option value="">Autres personnes (par défaut)</option>{R.filter(([k]) => k !== "autre").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}</td>
            <td style={{ ...td, color: T.ink700 }}>{own ? "toutes les pages, admin partout" : roleSummary(L, r || "autre")}</td></tr>; })}
        </tbody></table></div>
      {!shown.length && <p style={{ ...hint, margin: "10px 0 0" }}>Personne ne correspond à ce filtre.</p>}
    </section>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(240px,300px)", gap: 14, alignItems: "start" }} className="enogia-access-grid">
      <section aria-label="Rôles et pages" style={card}>
        <h3 style={h3}>Rôles et pages</h3>
        <p style={hint}>Cliquez sur une case : Masqué → Lecture → Modifier → Admin. « Admin » = modifier + les réglages de la page (écrits sous chaque page). Cliquez sur un rôle pour voir son menu. Planificateur, Personnes et site et Accès restent à vous seul.</p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: T.ink500, marginBottom: 10 }}>{LEVELS.map(l => <span key={l} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><LvChip l={l} w={56} />{{ n: "absente du menu", r: "voir seulement", w: "saisir, déplacer, commenter", a: "+ réglages de la page" }[l]}</span>)}</div>
        <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: 220 + R.length * 92 }}>
          <thead><tr><th style={{ ...th, position: "sticky", left: 0, background: T.card, zIndex: 1 }}>Page</th>
            {R.map(([k, l]) => <th key={k} style={{ ...th, textAlign: "center", whiteSpace: "normal", background: pv === "role:" + k ? "color-mix(in srgb, " + T.accentSoft + " 60%, transparent)" : "transparent" }}>
              <button type="button" onClick={() => setPv("role:" + k)} title="Voir le menu de ce rôle" style={{ border: "none", background: "transparent", color: T.ink700, font: "inherit", fontWeight: 700, cursor: "pointer", padding: "2px 4px", borderRadius: 6 }}>{l}</button>
              <span style={{ display: "block", fontWeight: 500, fontSize: 11 }}>{counts[k] || 0} pers.</span></th>)}
            <th style={th}>{newRole == null ? <button type="button" onClick={() => setNewRole("")} style={{ ...btn("ghost", "sm"), whiteSpace: "nowrap" }}>＋ Rôle</button>
              : <span style={{ display: "inline-flex", gap: 4 }}><input autoFocus value={newRole} onChange={e => setNewRole(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addRole(); if (e.key === "Escape") setNewRole(null); }} aria-label="Nom du nouveau rôle" placeholder="Nom du rôle" style={{ ...sel, minWidth: 0, width: 130 }} /><button type="button" onClick={addRole} style={{ ...btn("sec", "sm") }}>Ajouter</button></span>}</th></tr></thead>
          <tbody>{groups.map(g => <React.Fragment key={g}>
            <tr><td colSpan={R.length + 2} style={{ ...td, background: T.surface, fontFamily: T.fontDisplay, fontWeight: 700, color: T.ink700, height: 30 }}>{g}</td></tr>
            {ACCESS_PAGES.filter(p => p.g === g).map(p => <tr key={p.id}>
              <td style={{ ...td, position: "sticky", left: 0, background: T.card, zIndex: 1, minWidth: 200 }}><b style={{ display: "block", color: T.ink900 }}>{p.l}</b><span style={{ display: "block", fontSize: 12, color: T.ink500, lineHeight: 1.25 }}>{p.d}</span>{p.adm && <span style={{ display: "block", fontSize: 12, color: T.accentInk, lineHeight: 1.25 }}>Admin : {p.adm}</span>}</td>
              {R.map(([k, l]) => { const v = (L[p.id] || {})[k] || "n", c = tone(v), chg = levels && v !== (base.levels[p.id] || {})[k];
                return <td key={k} style={{ ...td, textAlign: "center", height: 40, background: pv === "role:" + k ? "color-mix(in srgb, " + T.accentSoft + " 35%, transparent)" : "transparent" }}>
                  <button type="button" onClick={() => cycle(p.id, k)} aria-label={p.l + ", " + l + " : " + LEVEL_LABEL[v]}
                    style={{ width: "100%", maxWidth: 92, minHeight: 30, borderRadius: 8, cursor: "pointer", fontFamily: T.font, fontSize: 12, fontWeight: v === "n" ? 500 : 700, background: c.bg, color: c.ink, border: "1.5px " + (v === "n" ? "dashed " : "solid ") + "color-mix(in srgb, " + c.bd + " 45%, transparent)", boxShadow: chg ? "0 0 0 2px " + T.accent : "none" }}>{LEVEL_LABEL[v]}</button></td>; })}
              <td style={td} /></tr>)}
          </React.Fragment>)}</tbody></table></div>
      </section>
      <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <section aria-label="Aperçu du menu" style={card}>
          <h3 style={h3}>Aperçu du menu</h3>
          <label htmlFor="acc-pv" style={{ ...hint, display: "block" }}>Ce que verra…</label>
          <select id="acc-pv" value={pv} onChange={e => setPv(e.target.value)} style={{ ...sel, width: "100%", minWidth: 0 }}>
            <optgroup label="Rôles">{R.map(([k, l]) => <option key={k} value={"role:" + k}>{l}</option>)}</optgroup>
            <optgroup label="Personnes">{list.map(p => <option key={p.email} value={"p:" + p.email}>{(p.name || p.email) + (owners.includes(p.email) ? " (super admin)" : "")}</option>)}</optgroup>
          </select>
          <div style={{ marginTop: 8, borderRadius: 8, background: T.ink900, color: T.card, padding: 8, fontSize: 13 }}>
            {groups.map(g => { const its = ACCESS_PAGES.filter(p => p.g === g && lvlFor(p.id) !== "n"); return its.length ? <div key={g}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: .65, padding: "6px 6px 2px" }}>{g}</div>
              {its.map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 8px" }}><span>{p.l}</span><span style={{ fontSize: 11, opacity: .8 }}>{{ r: "lecture", w: "modifier", a: "admin" }[lvlFor(p.id)]}</span></div>)}</div> : null; })}
            {pRole === "super" && <div style={{ padding: "3px 8px", fontSize: 12, opacity: .8 }}>+ Planificateur, Personnes et site, Accès</div>}
          </div>
        </section>
        <section style={card}><h3 style={h3}>Super admin</h3><p style={{ ...hint, margin: 0 }}>Vous seul. Ce statut ne se donne pas depuis l'écran : il est écrit dans le site et dans les règles de la base.</p></section>
      </aside>
    </div>

    <div style={{ position: "sticky", bottom: 8, zIndex: 5, ...card, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", boxShadow: "0 -1px 0 " + T.line + ", " + T.shadowFloat }}>
      <p role="status" style={{ margin: 0, flex: "1 1 300px", fontSize: 13, color: T.ink700 }}>{nChanges ? <><b>{nChanges} changement{nChanges > 1 ? "s" : ""}</b> pas encore enregistré{nChanges > 1 ? "s" : ""}.</> : (msg || "Aucun changement en attente.")}</p>
      <button type="button" disabled={!nChanges || busy} onClick={cancel} style={{ ...btn("sec", "md") }}>Annuler</button>
      <button type="button" disabled={!nChanges || busy} onClick={save} style={{ ...btn("pri", "md") }}>Enregistrer</button>
    </div>
    <style>{"@media (max-width: 1000px){.enogia-access-grid{grid-template-columns:1fr !important}}"}</style>
  </div>);
}
