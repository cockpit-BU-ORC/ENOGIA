// v305 → v308 (demandé : « trop complexe ; une sous-page pour gérer les rôles (création et attribution de personnes) et une page avec
// les accès pour chaque page / sous-page ») : Régler › Accès — super admin seul, deux sous-pages (même sélecteur que le reste du site).
//  · Rôles : liste des rôles (nombre de personnes) ; le rôle choisi montre ses membres (× = retirer → Autres personnes) et
//    « Ajouter des personnes » (recherche, cases à cocher, rôle actuel affiché). Nouveau rôle, renommer, supprimer (rôles créés ici).
//  · Accès : un rôle à la fois ; chaque page et chaque sous-page a son niveau (Masqué, Lecture, Modifier, Admin) ; changer une page
//    change ses sous-pages ; « Copier les accès de… » ; aperçu du menu du rôle. Activation des nouveaux accès en tête.
// Brouillon commun aux deux sous-pages : « Enregistrer » écrit planning/profiles (rôles des personnes) et planning/access.
import React, { useMemo, useState } from "react";
import { T, FZ, btn } from "../theme";
import { PlanSwitch } from "./PlanSwitch";
import { askConfirm } from "../confirm";
import { profileOf, setProfile, isRemoved } from "../profiles";
import { ACCESS_PAGES, LEVELS, LEVEL_LABEL, levelsOf, rolesOf, accessOn, slugRole, setLevel, copyRole, BUILTIN_ROLE_IDS } from "../access";

const tone = l => l === "a" ? { bg: T.accentSoft, ink: T.accentInk } : l === "w" ? { bg: T.emerald100, ink: T.emerald600 } : l === "r" ? { bg: T.info100, ink: T.info600 } : { bg: T.surfaceAlt, ink: T.ink500 };
const card = { background: T.card, borderRadius: 12, padding: "14px 16px", minWidth: 0 };
const h3 = { margin: "0 0 4px", fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 700, color: T.ink900 };
const hint = { margin: "0 0 10px", fontSize: 13, color: T.ink500 };
const initials = (name, email) => { const s = String(name || email || "?").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean); return ((s[0] || "?")[0] + ((s[1] || "")[0] || "")).toUpperCase(); };
const Avatar = ({ p }) => <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 999, background: T.surfaceAlt, color: T.ink700, display: "grid", placeItems: "center", fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 11, flex: "0 0 28px" }}>{initials(p.name, p.email)}</span>;
const field = { minHeight: 34, border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, padding: "0 10px", fontFamily: T.font, fontSize: 13, minWidth: 0 };

// Choix du niveau : 4 segments (Masqué, Lecture, Modifier, Admin)
function LevelPicker({ value, onChange, label, min }) {
  return <div role="radiogroup" aria-label={label} style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 8, background: T.surfaceAlt, flexShrink: 0 }}>
    {LEVELS.map(l => { const on = value === l, c = tone(l), off = min && LEVELS.indexOf(l) < LEVELS.indexOf(min);
      return <button key={l} type="button" role="radio" aria-checked={on} disabled={off} onClick={() => onChange(l)} title={off ? "Toujours visible" : LEVEL_LABEL[l]}
        style={{ border: "none", borderRadius: 6, minHeight: 28, minWidth: 70, padding: "0 8px", cursor: off ? "not-allowed" : "pointer", fontFamily: T.font, fontSize: 12, fontWeight: on ? 700 : 500, opacity: off ? .4 : 1,
          background: on ? c.bg : "transparent", color: on ? c.ink : T.ink500, boxShadow: on ? "inset 0 0 0 1.5px color-mix(in srgb, " + c.ink + " 45%, transparent)" : "none" }}>{LEVEL_LABEL[l]}</button>; })}
  </div>;
}

// v320 (demandé : « lier les pages Accès et Personnes et site ») : une seule entrée « Personnes et accès » — Personnes (Manager) · Rôles · Accès par page
export default function AccessPage({ profiles, saveProfiles, accessDoc, saveAccess, people, ownerEmails, sub: subP, onSub, onPeople }) {
  const owners = useMemo(() => (ownerEmails || []).map(e => String(e).toLowerCase()), [ownerEmails]);
  const base = useMemo(() => ({ roles: rolesOf(accessDoc), levels: levelsOf(accessDoc) }), [accessDoc]);
  const [sub0, setSub0] = useState("roles");
  const sub = subP || sub0, setSub = id => { if (id === "personnes") { if (onPeople) onPeople(); return; } (onSub || setSub0)(id); };
  const [roles, setRoles] = useState(null), [levels, setLevels] = useState(null), [roleOf, setRoleOf] = useState({}), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const R = roles || base.roles, L = levels || base.levels;
  const roleName = k => (R.find(r => r[0] === k) || ["", "Autres personnes"])[1];
  const list = useMemo(() => {
    const seen = new Map();
    (people || []).forEach(p => { const e = String(p.email || "").toLowerCase(); if (e && !seen.has(e) && !isRemoved(profiles, e) && !owners.includes(e)) seen.set(e, { email: e, name: p.name || profileOf(profiles, e).name || "" }); });
    return [...seen.values()].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, "fr"));
  }, [people, profiles, owners]);
  const savedRole = e => profileOf(profiles, e).role || "autre";
  const roleNow = e => { const r = roleOf[e] != null ? roleOf[e] : savedRole(e); return R.some(x => x[0] === r) ? r : "autre"; };
  const members = k => list.filter(p => roleNow(p.email) === k);
  const [cur, setCur] = useState("cdp"), [adding, setAdding] = useState(false), [pick, setPick] = useState({}), [q, setQ] = useState(""), [newRole, setNewRole] = useState(null), [prevRole, setPrevRole] = useState("cdp");
  const curRole = R.some(r => r[0] === cur) ? cur : R[0][0];
  const peopleChanged = Object.keys(roleOf).filter(e => (roleOf[e] || "autre") !== savedRole(e));
  const levelChanges = levels ? Object.keys(L).reduce((n, id) => n + R.filter(([k]) => (L[id] || {})[k] !== (base.levels[id] || {})[k]).length, 0) : 0;
  const roleChanges = roles ? (R.length !== base.roles.length || R.some(([k, n], i) => !base.roles[i] || base.roles[i][0] !== k || base.roles[i][1] !== n) ? 1 : 0) : 0;
  const nChanges = peopleChanged.length + levelChanges + roleChanges;
  const on = accessOn(accessDoc);

  const assign = (emails, k) => setRoleOf(m => { const n = { ...m }; emails.forEach(e => { n[e] = k; }); return n; });
  const addRole = () => { const name = String(newRole || "").trim(); if (!name) { setNewRole(null); return; } const id = slugRole(name, R.map(r => r[0]));
    setRoles([...R.filter(r => r[0] !== "autre"), [id, name], ...R.filter(r => r[0] === "autre")]);
    setLevels(Object.fromEntries(Object.entries(L).map(([pid, m]) => [pid, { ...m, [id]: pid === "home" ? "r" : "n" }]))); setNewRole(null); setCur(id); };
  const renameRole = (k, name) => setRoles(R.map(r => r[0] === k ? [k, name] : r));
  const deleteRole = async k => {
    const n = members(k).length;
    if (!(await askConfirm({ title: "Supprimer le rôle « " + roleName(k) + " » ?", message: (n ? n + " personne" + (n > 1 ? "s passent" : " passe") + " dans « Autres personnes ». " : "") + "Effectif après « Enregistrer ».", confirmLabel: "Supprimer", danger: true }))) return;
    assign(members(k).map(p => p.email), "autre"); setRoles(R.filter(r => r[0] !== k)); setCur("autre");
  };
  const cancel = () => { setRoles(null); setLevels(null); setRoleOf({}); setMsg(""); setAdding(false); setPick({}); };
  const persist = async nextOn => {
    setBusy(true); let ok = true;
    if (peopleChanged.length) { let next = profiles || {}; peopleChanged.forEach(e => { next = setProfile(next, e, { role: roleOf[e] === "autre" ? "" : roleOf[e] }); }); ok = await saveProfiles(next); }
    if (ok) ok = await saveAccess({ on: nextOn, roles: R.map(([id, name]) => ({ id, name })), levels: L });
    setBusy(false); return ok;
  };
  const save = async () => { if (await persist(on)) { cancel(); setMsg("✓ Enregistré" + (on ? " : chacun voit son nouveau menu à sa prochaine ouverture." : ". Les accès ne s'appliqueront qu'après « Activer ».")); } };
  const toggleOn = async () => {
    const go = on ? await askConfirm({ title: "Désactiver les nouveaux accès ?", message: "Chacun retrouve ses droits d'avant (admins du Manager, listes d'accès des Turbines et des Achats). Rôles et accès restent enregistrés.", confirmLabel: "Désactiver", danger: true })
      : await askConfirm({ title: "Activer les nouveaux accès ?", message: "Chaque personne n'aura plus que les pages et sous-pages permises par son rôle ; les anciennes listes ne comptent plus. Vous restez seul super admin. Republiez d'abord les règles de la base (SECURITE.md)." + (nChanges ? " Vos " + nChanges + " changement(s) en cours seront enregistrés." : ""), confirmLabel: "Activer" });
    if (go && await persist(!on)) { cancel(); setMsg(on ? "Nouveaux accès désactivés : droits d'avant rétablis." : "✓ Nouveaux accès activés."); }
  };

  // ---------- Rôles ----------
  const rolesView = <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,280px) minmax(0,1fr)", gap: 14, alignItems: "start" }} className="enogia-access-grid">
    <nav aria-label="Rôles" style={{ ...card, padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
      {R.map(([k, l]) => { const sel = k === curRole, n = members(k).length; return <button key={k} type="button" onClick={() => { setCur(k); setAdding(false); setPick({}); }} aria-current={sel ? "true" : undefined}
        style={{ display: "flex", alignItems: "center", gap: 8, border: "none", borderRadius: 8, minHeight: 38, padding: "0 10px", cursor: "pointer", textAlign: "left", fontFamily: T.font, fontSize: 13, background: sel ? T.surfaceAlt : "transparent", color: T.ink900, fontWeight: sel ? 700 : 500 }}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</span><span style={{ fontSize: 12, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{n}</span></button>; })}
      {newRole == null ? <button type="button" onClick={() => setNewRole("")} style={{ ...btn("ghost", "sm"), marginTop: 6, justifyContent: "flex-start" }}>＋ Nouveau rôle</button>
        : <div style={{ display: "flex", gap: 4, marginTop: 6 }}><input autoFocus value={newRole} onChange={e => setNewRole(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addRole(); if (e.key === "Escape") setNewRole(null); }} placeholder="Nom du rôle" aria-label="Nom du nouveau rôle" style={{ ...field, flex: 1 }} /><button type="button" onClick={addRole} style={{ ...btn("sec", "sm") }}>Créer</button></div>}
    </nav>
    <section aria-label={"Rôle " + roleName(curRole)} style={card}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <input value={roleName(curRole)} onChange={e => renameRole(curRole, e.target.value)} aria-label="Nom du rôle" style={{ ...field, fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 700, minHeight: 38, flex: "1 1 220px" }} />
        <button type="button" onClick={() => { setPrevRole(curRole); setSub("acces"); }} style={{ ...btn("sec", "sm") }}>Voir ses accès</button>
        {!BUILTIN_ROLE_IDS.includes(curRole) && <button type="button" onClick={() => deleteRole(curRole)} style={{ ...btn("dan", "sm") }}>Supprimer le rôle</button>}
      </div>
      <p style={hint}>{curRole === "autre" ? "Rôle par défaut : toute personne sans rôle choisi en fait partie." : members(curRole).length + " personne" + (members(curRole).length > 1 ? "s" : "") + " dans ce rôle. Une personne n'a qu'un rôle : l'ajouter ici la retire de son rôle actuel."}</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {members(curRole).map(p => { const chg = (roleOf[p.email] || null) && roleNow(p.email) !== savedRole(p.email);
          return <li key={p.email} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, borderBottom: "1px solid " + T.line }}>
            <Avatar p={p} /><span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 13, color: T.ink900 }}>{p.name || p.email.replace(/@.*/, "")}{chg && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: T.accentInk }}>nouveau</span>}</b><span style={{ fontSize: 12, color: T.ink500 }}>{p.email}</span></span>
            {curRole !== "autre" && <button type="button" onClick={() => assign([p.email], "autre")} aria-label={"Retirer " + (p.name || p.email) + " du rôle"} title="Retirer du rôle (passe dans Autres personnes)" style={{ ...btn("ghost", "sm"), minWidth: 32 }}>×</button>}
          </li>; })}
        {!members(curRole).length && <li style={{ ...hint, margin: "6px 0" }}>Personne pour l'instant.</li>}
      </ul>
      {curRole !== "autre" && (!adding ? <button type="button" onClick={() => setAdding(true)} style={{ ...btn("sec", "md"), marginTop: 10 }}>＋ Ajouter des personnes</button>
        : <div style={{ marginTop: 12, border: "1px solid " + T.line, borderRadius: 12, padding: 10 }}>
          <input type="search" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une personne" aria-label="Rechercher une personne à ajouter" style={{ ...field, width: "100%" }} />
          <div style={{ maxHeight: 280, overflowY: "auto", marginTop: 6 }}>
            {list.filter(p => roleNow(p.email) !== curRole && (!q || (p.name + " " + p.email).toLowerCase().includes(q.toLowerCase()))).map(p => <label key={p.email} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40, padding: "0 4px", cursor: "pointer", borderBottom: "1px solid " + T.line }}>
              <input type="checkbox" checked={!!pick[p.email]} onChange={e => setPick({ ...pick, [p.email]: e.target.checked })} />
              <Avatar p={p} /><span style={{ flex: 1, minWidth: 0, fontSize: 13 }}><b style={{ color: T.ink900 }}>{p.name || p.email.replace(/@.*/, "")}</b> <span style={{ color: T.ink500 }}>{p.email}</span></span>
              <span style={{ fontSize: 12, color: T.ink500, whiteSpace: "nowrap" }}>{roleName(roleNow(p.email))}</span></label>)}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={() => { setAdding(false); setPick({}); setQ(""); }} style={{ ...btn("ghost", "sm") }}>Fermer</button>
            <button type="button" disabled={!Object.values(pick).some(Boolean)} onClick={() => { assign(Object.keys(pick).filter(e => pick[e]), curRole); setPick({}); setAdding(false); setQ(""); }} style={{ ...btn("pri", "sm") }}>Ajouter ({Object.values(pick).filter(Boolean).length})</button>
          </div></div>)}
    </section>
  </div>;

  // ---------- Accès ----------
  const aRole = R.some(r => r[0] === prevRole) ? prevRole : R[0][0];
  const lv = id => (L[id] || {})[aRole] || "n";
  const change = (id, v) => setLevels(setLevel(L, id, aRole, v));
  const groups = ["Opérations", "Gestion", "Administration"]; // v314 : noms plus pro (ex-Travailler, Suivre, Régler)
  const accesView = <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(220px,280px)", gap: 14, alignItems: "start" }} className="enogia-access-grid">
    <section aria-label="Accès par page" style={card}>
      <div role="group" aria-label="Rôle" style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        {R.map(([k, l]) => { const sel = k === aRole; return <button key={k} type="button" aria-pressed={sel} onClick={() => setPrevRole(k)} style={{ border: "1px solid " + (sel ? T.ink900 : T.line), background: sel ? T.ink900 : T.card, color: sel ? T.card : T.ink700, borderRadius: 999, minHeight: 30, padding: "0 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{l} <span style={{ opacity: .7, fontWeight: 500 }}>{members(k).length}</span></button>; })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: T.ink500, flex: 1 }}>Accès du rôle <b style={{ color: T.ink900 }}>{roleName(aRole)}</b>. Changer une page change toutes ses sous-pages.</span>
        <label style={{ fontSize: 13, color: T.ink700, display: "inline-flex", gap: 6, alignItems: "center" }}>Copier les accès de
          <select value="" onChange={e => { if (e.target.value) setLevels(copyRole(L, e.target.value, aRole)); }} style={field}><option value="">— choisir —</option>{R.filter(r => r[0] !== aRole).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      {groups.map(g => <div key={g}>
        <div style={{ fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13, color: T.ink500, padding: "12px 0 4px" }}>{g}</div>
        {ACCESS_PAGES.filter(p => p.g === g).map(p => <div key={p.id} style={{ borderTop: "1px solid " + T.line }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, flexWrap: "wrap", padding: "4px 0" }}>
            <span style={{ flex: "1 1 220px", minWidth: 0 }}><b style={{ display: "block", fontSize: 14, color: T.ink900 }}>{p.l}</b><span style={{ fontSize: 12, color: T.ink500 }}>{p.d}{p.adm ? " · Admin : " + p.adm : ""}</span></span>
            <LevelPicker label={"Accès à " + p.l} value={lv(p.id)} min={p.min} onChange={v => change(p.id, v)} />
          </div>
          {(p.subs || []).map(([s, sl]) => { const id = p.id + "." + s; return <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40, flexWrap: "wrap", paddingLeft: 22, borderLeft: "2px solid " + T.line, marginLeft: 6, marginBottom: 2 }}>
            <span style={{ flex: "1 1 200px", fontSize: 13, color: T.ink700 }}>{sl}</span>
            <LevelPicker label={"Accès à " + p.l + " › " + sl} value={lv(id)} onChange={v => change(id, v)} /></div>; })}
        </div>)}
      </div>)}
      <p style={{ ...hint, margin: "12px 0 0" }}>Planificateur, Personnes et site et Accès restent à vous seul.</p>
    </section>
    <aside aria-label="Aperçu du menu" style={card}>
      <h3 style={h3}>Menu de « {roleName(aRole)} »</h3>
      <div style={{ marginTop: 8, borderRadius: 8, background: T.mode === "dark" ? T.surface : T.ink900, color: T.mode === "dark" ? T.ink900 : T.card, padding: 8, fontSize: 13 }}>
        {groups.map(g => { const its = ACCESS_PAGES.filter(p => p.g === g && lv(p.id) !== "n"); return its.length ? <div key={g}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: .65, padding: "6px 6px 2px" }}>{g}</div>
          {its.map(p => <div key={p.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 8px" }}><span>{p.l}</span><span style={{ fontSize: 11, opacity: .8 }}>{{ r: "lecture", w: "modifier", a: "admin" }[lv(p.id)]}</span></div>
            {(p.subs || []).filter(([s]) => lv(p.id + "." + s) !== "n").map(([s, sl]) => <div key={s} style={{ padding: "1px 8px 1px 22px", fontSize: 12, opacity: .8 }}>{sl}</div>)}</div>)}</div> : null; })}
      </div>
    </aside>
  </div>;

  return (<div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 70 }}>
    {/* v325 (demandé : « pas de titre en haut à gauche ; nom Gestion des accès ; boutons aux mêmes endroits ») : même en-tête que le Manager
        (titre, phrase, sélecteur dessous) sur Personnes, Rôles et Accès par page */}
    <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: "clamp(24px,2.4vw,30px)", fontWeight: 600, letterSpacing: "-.01em", color: T.ink900, lineHeight: 1.15 }}>Gestion des accès</h1>
        <div style={{ fontSize: FZ.sm, color: T.ink500, marginTop: 2 }}>Personnes, rôles et accès par page</div>
      </div>
      <PlanSwitch label="Sous-pages : Gestion des accès" value={sub} onGo={setSub} tools={[]} views={[...(onPeople ? [{ id: "personnes", l: "Personnes" }] : []), { id: "roles", l: "Rôles" }, { id: "acces", l: "Accès par page" }]} />
    </header>
    <div role="status" style={{ ...card, padding: "10px 14px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: on ? T.emerald100 : T.amber100 }}>
      <span style={{ flex: "1 1 320px", fontSize: 13, color: T.ink900 }}>{on ? <><b>Nouveaux accès activés.</b> Chacun ne voit que ce que permet son rôle.</> : <><b>Pas encore activés.</b> Tout le monde garde ses droits d'avant. Réglez rôles et accès, enregistrez, puis activez.</>}</span>
      <button type="button" disabled={busy} onClick={toggleOn} style={{ ...btn(on ? "ghost" : "sec", "sm") }}>{on ? "Désactiver" : "Activer les nouveaux accès"}</button>
    </div>
    {sub === "roles" ? rolesView : accesView}
    <div style={{ position: "sticky", bottom: 8, zIndex: 5, ...card, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", boxShadow: "0 -1px 0 " + T.line + ", " + T.shadowFloat }}>
      <p role="status" style={{ margin: 0, flex: "1 1 300px", fontSize: 13, color: T.ink700 }}>{nChanges ? <><b>{nChanges} changement{nChanges > 1 ? "s" : ""}</b> pas encore enregistré{nChanges > 1 ? "s" : ""}.</> : (msg || "Aucun changement en attente.")}</p>
      <button type="button" disabled={!nChanges || busy} onClick={cancel} style={{ ...btn("sec", "md") }}>Annuler</button>
      <button type="button" disabled={!nChanges || busy} onClick={save} style={{ ...btn("pri", "md") }}>Enregistrer</button>
    </div>
    <style>{"@media (max-width: 1000px){.enogia-access-grid{grid-template-columns:1fr !important}}"}</style>
  </div>);
}
