import React, { useMemo, useState } from "react";
import { T, FZ } from "../theme";
import { PjPlate } from "./SharedUI";
import { useMentions } from "../mentionContext";
import { ROLES, ROLE_BLOCKS, profileOf, setProfile, chefNames, pjsOfProfile, removePerson, parsePeopleList } from "../profiles";
import { nameFromEmail } from "../mentions";

// v188 — Manager › Réglages › Personnes et rôles : pour chaque compte, le rôle (donc l'accueil qu'il voit) et ses PJ.
// Les PJ s'associent un par un, ou d'un coup en choisissant un nom de chef de projet (tous ses PJ, y compris les futurs).
// v238 : retirer une personne (gardée à part, « Rétablir ») ; coller une liste d'adresses @enogia.com — les personnes ajoutées
// reçoivent un rôle et peuvent être taguées (@) avant leur première connexion.
const lc = v => String(v || "").trim().toLowerCase();
const chip = on => ({ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 26, padding: "2px 10px", borderRadius: 999, border: "1.5px solid " + (on ? T.teal500 : T.line), background: on ? T.teal100 : T.card, color: on ? T.teal600 : T.ink700, fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font });
const field = () => ({ padding: "6px 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, minHeight: 32, boxSizing: "border-box" });

export function PeopleRoles({ profiles, saveProfiles, data }) {
  const ctx = useMentions();
  const rows = useMemo(() => (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE"), [data]);
  const chefs = useMemo(() => chefNames(rows), [rows]);
  const [q, setQ] = useState(""), [newEmail, setNewEmail] = useState(""), [open, setOpen] = useState(null), [err, setErr] = useState("");
  const [bulk, setBulk] = useState(null), [bulkMsg, setBulkMsg] = useState(""), [showRemoved, setShowRemoved] = useState(false);
  const [rf, setRf] = useState("*"); // v283 : filtre par rôle (« * » = toutes, « » = automatique)
  const removed = useMemo(() => Object.values((profiles && profiles.byEmail) || {}).filter(p => p && p.email && p.removed).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, "fr")), [profiles]);
  const people = useMemo(() => {
    const m = new Map();
    (ctx.options || []).forEach(o => { if (o.email) m.set(lc(o.email), { email: lc(o.email), name: o.name || nameFromEmail(o.email) }); });
    Object.values((profiles && profiles.byEmail) || {}).forEach(p => { if (p && p.email && !p.removed && !m.has(lc(p.email))) m.set(lc(p.email), { email: lc(p.email), name: p.name || nameFromEmail(p.email) }); });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [ctx.options, profiles]);
  const shown = people.filter(p => (!q.trim() || (p.name + " " + p.email).toLowerCase().includes(q.trim().toLowerCase())) && (rf === "*" || (profileOf(profiles, p.email).role || "") === rf));
  const save = (email, patch) => saveProfiles(setProfile(profiles, email, patch));
  const add = () => {
    const v = lc(newEmail);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setErr("Adresse e-mail invalide."); return; }
    setErr(""); const pr = profileOf(profiles, v); saveProfiles(setProfile(profiles, v, { name: pr.name || nameFromEmail(v), removed: false })); setNewEmail(""); setOpen(v);
  };
  const remove = p => { if (window.confirm("Retirer " + p.name + " de la liste ? Son rôle et ses PJ sont effacés ; vous pourrez la rétablir.")) { saveProfiles(removePerson(profiles, p.email)); if (open === p.email) setOpen(null); } };
  const addBulk = () => {
    const list = parsePeopleList(bulk);
    if (!list.length) { setBulkMsg("Aucune adresse @enogia.com trouvée."); return; }
    let next = profiles, n = 0;
    list.forEach(({ email, name }) => { const pr = profileOf(next, email), known = people.some(x => x.email === email); if (!known) n++; next = setProfile(next, email, { name: pr.name || name || nameFromEmail(email), removed: false }); });
    saveProfiles(next); setBulk(null); setBulkMsg(n + " personne" + (n > 1 ? "s" : "") + " ajoutée" + (n > 1 ? "s" : "") + (list.length > n ? ", " + (list.length - n) + " déjà dans la liste" : "") + ".");
  };
  const counts = [["*", "Toutes", people.length], ...ROLES.map(([id, l]) => [id, l, people.filter(p => profileOf(profiles, p.email).role === id).length]), ["", "Automatique", people.filter(p => !profileOf(profiles, p.email).role).length]].filter(x => x[0] === "*" || x[2] > 0);

  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ background: T.card, borderRadius: 12, padding: 16, border: "1px solid " + T.line }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: FZ.md, color: T.ink900, marginBottom: 4 }}>Personnes et rôles</div>
      <div style={{ fontSize: FZ.sm, color: T.ink500, lineHeight: 1.5, marginBottom: 12 }}>Le rôle choisit la page d'accueil de la personne. Associez-lui ses PJ un par un, ou tous ceux d'un chef de projet d'un coup (les prochains PJ de ce chef s'ajoutent tout seuls). « Automatique » : direction pour vous, testeur si la personne est dans la liste des testeurs, chef de projet si son nom figure sur des fiches.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une personne" aria-label="Rechercher une personne" style={{ ...field(), flex: "1 1 200px" }} />
        <input value={newEmail} onChange={e => { setNewEmail(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="prenom.nom@enogia.com" aria-label="Ajouter une personne par e-mail" style={{ ...field(), flex: "1 1 220px" }} />
        <button type="button" onClick={add} style={{ ...field(), background: T.ink900, color: T.card, border: "none", fontWeight: 700, cursor: "pointer" }}>Ajouter</button>
        <button type="button" onClick={() => { setBulk(bulk === null ? "" : null); setBulkMsg(""); }} aria-expanded={bulk !== null} style={{ ...field(), cursor: "pointer", fontWeight: 700, color: T.ink700 }}>Coller une liste</button>
        {bulk !== null && <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea value={bulk} onChange={e => { setBulk(e.target.value); setBulkMsg(""); }} rows={6} aria-label="Liste de personnes à ajouter" placeholder={"Une personne par ligne :\nPrénom NOM <prenom.nom@enogia.com>\nou simplement prenom.nom@enogia.com"} style={{ ...field(), width: "100%", fontFamily: T.fontMono, fontSize: FZ.xs, resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={addBulk} style={{ ...field(), background: T.ink900, color: T.card, border: "none", fontWeight: 700, cursor: "pointer" }}>Ajouter {parsePeopleList(bulk).length || ""} personne{parsePeopleList(bulk).length > 1 ? "s" : ""}</button>
            <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Seules les adresses @enogia.com sont gardées. Les personnes ajoutées peuvent être taguées avant leur première connexion.</span>
          </div>
        </div>}
        {bulkMsg && <span role="status" style={{ fontSize: FZ.xs, color: T.ink700, fontWeight: 600 }}>{bulkMsg}</span>}
        <div role="group" aria-label="Filtrer par rôle" style={{ display: "flex", gap: 6, flexWrap: "wrap", width: "100%" }}>
          {counts.map(([id, l, n]) => <button key={id || "auto"} type="button" aria-pressed={rf === id} onClick={() => setRf(id)} style={{ ...chip(rf === id), minHeight: 30 }}>{l} <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{n}</span></button>)}
        </div>
        {err && <span role="alert" style={{ fontSize: FZ.xs, color: T.red500, fontWeight: 600 }}>{err}</span>}
      </div>
    </div>
    <div style={{ background: T.card, borderRadius: 12, border: "1px solid " + T.line, overflow: "hidden" }}>
      {shown.length === 0 && rf !== "*" && <div style={{ padding: 16, fontSize: FZ.sm, color: T.ink500 }}>Aucune personne avec ce rôle.</div>}
      {shown.length === 0 && rf === "*" && <div style={{ padding: 16, fontSize: FZ.sm, color: T.ink500 }}>Aucune personne. Les comptes apparaissent ici après leur première connexion, ou ajoutez-les par e-mail.</div>}
      {shown.map((p, i) => {
        const pr = profileOf(profiles, p.email), mine = pjsOfProfile(pr, rows), isOpen = open === p.email;
        return (<div key={p.email} style={{ borderTop: i ? "1px solid " + T.line : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 14px", minHeight: 40, flexWrap: "wrap" }}>
            {/* v283 (audit apple-design, lot 2) : une ligne par personne — nom puis adresse en gris */}
            <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex", alignItems: "baseline", gap: 8, overflow: "hidden" }}>
              <span style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, whiteSpace: "nowrap" }}>{p.name}</span>
              <span title={p.email} style={{ fontSize: FZ.xs, color: T.ink500, fontFamily: T.fontMono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.email}</span>
            </div>
            <select value={pr.role} onChange={e => save(p.email, { role: e.target.value, name: pr.name || p.name })} aria-label={"Rôle de " + p.name} style={{ ...field(), minWidth: 170 }}>
              <option value="">Automatique</option>
              {ROLES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
            <button type="button" onClick={() => setOpen(isOpen ? null : p.email)} aria-expanded={isOpen} style={{ ...field(), cursor: "pointer", fontWeight: 700, color: T.ink700, minWidth: 120 }}>Accueil · {mine.length} PJ {isOpen ? "▴" : "▾"}</button>
            {lc(p.email) !== lc(ctx.me) && <button type="button" onClick={() => remove(p)} aria-label={"Retirer " + p.name} title="Retirer de la liste" style={{ ...field(), cursor: "pointer", color: T.red500, fontWeight: 700, minWidth: 32, padding: "6px 8px" }}>Retirer</button>}
          </div>
          {isOpen && <div style={{ padding: "4px 14px 14px", display: "flex", flexDirection: "column", gap: 10, background: T.surface }}>
            {/* v191 : le super admin choisit les blocs de l'accueil de chaque personne (plus de sélecteur sur l'accueil lui-même) */}
            <div>
              <div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink700, margin: "8px 0 6px" }}>Blocs de son accueil</div>
              {!pr.role ? <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Choisissez d'abord un rôle : « Automatique » garde l'accueil général.</span>
                : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(ROLE_BLOCKS[pr.role] || []).map(([id, l]) => { const all = (ROLE_BLOCKS[pr.role] || []).map(x => x[0]), cur = pr.blocks || all, on = cur.includes(id); return (
                  <button key={id} type="button" aria-pressed={on} onClick={() => save(p.email, { name: pr.name || p.name, blocks: on ? cur.filter(x => x !== id) : [...cur, id] })} style={chip(on)}>{on ? "✓ " : ""}{l}</button>); })}</div>}
            </div>
            <div>
              <div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink700, margin: "8px 0 6px" }}>Tous les PJ d'un chef de projet</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {chefs.length === 0 && <span style={{ fontSize: FZ.xs, color: T.ink500 }}>Aucun chef de projet renseigné dans les fiches.</span>}
                {chefs.map(c => { const on = pr.chefs.map(lc).includes(lc(c.name)); return (
                  <button key={c.name} type="button" aria-pressed={on} onClick={() => save(p.email, { name: pr.name || p.name, chefs: on ? pr.chefs.filter(x => lc(x) !== lc(c.name)) : [...pr.chefs, c.name] })} style={chip(on)}>{c.name} <span style={{ fontWeight: 500, color: on ? T.teal600 : T.ink500 }}>{c.n}</span></button>); })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: FZ.xs, fontWeight: 700, color: T.ink700, margin: "0 0 6px" }}>PJ ajoutés un par un</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {pr.pjs.map(pj => <span key={pj} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><PjPlate pj={pj} /><button type="button" aria-label={"Retirer " + pj} onClick={() => save(p.email, { pjs: pr.pjs.filter(x => x !== pj) })} style={{ border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 24, minHeight: 24, fontSize: 14 }}>×</button></span>)}
                <input list={"pjs-" + i} placeholder="Ajouter un PJ" aria-label={"Ajouter un PJ à " + p.name} style={{ ...field(), width: 150 }}
                  onKeyDown={e => { if (e.key === "Enter") { const v = e.target.value.trim().toUpperCase(); if (rows.some(r => r.pj === v) && !pr.pjs.includes(v)) { save(p.email, { name: pr.name || p.name, pjs: [...pr.pjs, v] }); e.target.value = ""; } } }} />
                <datalist id={"pjs-" + i}>{rows.map(r => <option key={r.pj} value={r.pj}>{getNom(r)}</option>)}</datalist>
              </div>
            </div>
            {mine.length > 0 && <div style={{ fontSize: FZ.xs, color: T.ink500 }}>Au total : {mine.slice(0, 30).join(", ")}{mine.length > 30 ? "…" : ""}</div>}
          </div>}
        </div>);
      })}
    </div>
    {removed.length > 0 && <div style={{ background: T.card, borderRadius: 12, border: "1px solid " + T.line, overflow: "hidden" }}>
      <button type="button" onClick={() => setShowRemoved(v => !v)} aria-expanded={showRemoved} style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "10px 14px", cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: 700, color: T.ink700, minHeight: 36 }}>Personnes retirées ({removed.length}) {showRemoved ? "▴" : "▾"}</button>
      {showRemoved && removed.map(p => <div key={p.email} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderTop: "1px solid " + T.line }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: FZ.sm, color: T.ink700 }}>{p.name || nameFromEmail(p.email)}</div><div style={{ fontSize: FZ.xs, color: T.ink500, fontFamily: T.fontMono }}>{p.email}</div></div>
        <button type="button" onClick={() => saveProfiles(removePerson(profiles, p.email, false))} style={{ ...field(), cursor: "pointer", fontWeight: 700, color: T.teal600 }}>Rétablir</button>
      </div>)}
    </div>}
  </div>);
}
const getNom = r => String(r.nomProjet || r.client || "");
