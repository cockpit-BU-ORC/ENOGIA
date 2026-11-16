// v364 (maquette maquettes-design/v365-accueils-roles.html validée : « Go lot 3 ») : gestion des accueils par rôle sur un seul écran —
// liste des rôles à gauche (« modifié » / « par défaut », nombre de widgets), aperçu réel de l'accueil du rôle à droite, et les actions
// « Copier depuis un autre rôle », « Partir de zéro », « Rétablir l'accueil par défaut », « Voir comme ». Même donnée qu'avant :
// planning/profiles.homeLayouts[rôle] (propriétaire seul) ; chaque action s'annule pendant 6 s.
import React, { useEffect, useRef, useState } from "react";
import { T, FZF as FZ, btn } from "../theme";
import { HOME_DEFAULTS } from "./RoleHome";
import { askConfirm } from "../confirm";

export const layoutModified = l => !!l && (Array.isArray(l.widgets) || (Array.isArray(l.extra) && l.extra.length > 0) || (Array.isArray(l.hidden) && l.hidden.length > 0));
export const layoutCount = (l, role) => (l && Array.isArray(l.widgets) ? l.widgets.length : (HOME_DEFAULTS[role] || HOME_DEFAULTS.autre).length);
// disposition à recopier : celle du rôle source, ou ses widgets par défaut (taille déduite de la largeur d'origine, ramenée ensuite à une taille permise)
export function copyLayout(l, role) {
  if (l && Array.isArray(l.widgets)) return { widgets: l.widgets.map(w => ({ ...w })) };
  if (layoutModified(l)) return { ...l };
  return { widgets: (HOME_DEFAULTS[role] || HOME_DEFAULTS.autre).map(([t, sp]) => ({ t, z: sp >= 9 ? "xl" : sp <= 3 ? "s" : "m" })) };
}

export function HomeRoles({ roles, role, onPick, layouts, onSave, viewAsEl, onClose, children }) {
  const [src, setSrc] = useState(""), [msg, setMsg] = useState(""), [undo, setUndo] = useState(null), t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);
  const cur = layouts[role] || {}, mod = layoutModified(cur), name = (roles.find(r => r[0] === role) || [])[1] || role;
  const apply = (lay, text) => { const prev = cur; onSave(role, lay); setMsg(text); setUndo(() => () => onSave(role, prev)); clearTimeout(t.current); t.current = setTimeout(() => { setMsg(""); setUndo(null); }, 6000); };
  const copy = () => { if (!src) return; const l = (roles.find(r => r[0] === src) || [])[1]; apply(copyLayout(layouts[src], src), "Accueil copié depuis « " + l + " »"); setSrc(""); };
  const zero = async () => { if (await askConfirm({ title: "Vider l'accueil « " + name + " » ?", message: "Tous les widgets sont retirés ; ajoutez ensuite ceux que vous voulez avec « ＋ Ajouter des widgets ». Annulable pendant 6 s.", confirmLabel: "Partir de zéro", danger: true })) apply({ widgets: [] }, "Accueil vidé"); };
  const restore = () => apply({}, "Accueil par défaut rétabli");
  const sel = { border: "1px solid " + T.line, background: T.card, color: T.ink900, borderRadius: 8, minHeight: 34, padding: "0 8px", fontSize: FZ.sm, fontFamily: T.font };
  return <div className="enogia-homeroles" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start", marginBottom: 14 }}>
    <nav aria-label="Rôles" style={{ flex: "1 1 220px", maxWidth: "100%", background: T.surface, border: "1px solid " + T.line, borderRadius: 12, padding: 8 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "4px 6px 8px" }}><span style={{ fontSize: 12, fontWeight: 500, color: T.ink500, flex: 1 }}>Accueils par rôle</span>
        <button type="button" onClick={onClose} style={{ ...btn("ghost", "sm") }}>Fermer</button></div>
      {roles.map(([k, l]) => { const m = layoutModified(layouts[k]), n = layoutCount(layouts[k], k), on = k === role;
        return <button key={k} type="button" aria-current={on ? "true" : undefined} onClick={() => onPick(k)} className="e-hov" data-on={on ? "1" : undefined}
          style={{ "--e-hov-bg": T.card, width: "100%", textAlign: "left", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "0 8px", alignItems: "center", padding: "7px 10px", minHeight: 44, borderRadius: 8, border: "1px solid " + (on ? T.line : "transparent"), background: on ? T.card : "transparent", boxShadow: on ? "inset 3px 0 0 " + T.amber500 : "none", color: T.ink900, cursor: "pointer", fontFamily: T.font }}>
          <span style={{ fontSize: FZ.sm, fontWeight: on ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</span>
          <span style={{ gridRow: "1 / 3", gridColumn: 2, fontSize: 12, borderRadius: 999, padding: "0 8px", background: m ? T.amber100 : "transparent", color: m ? T.amber600 : T.ink500, border: m ? "none" : "1px solid " + T.line }}>{m ? "modifié" : "par défaut"}</span>
          <span style={{ fontSize: 12, color: T.ink500 }}>{n} widget{n > 1 ? "s" : ""}</span>
        </button>; })}
    </nav>
    <section aria-labelledby="hr-title" style={{ flex: "999 1 480px", minWidth: 0 }}>
      <div className="e-tb" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <h2 id="hr-title" style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600 }}>Accueil « {name} »</h2>
        <span style={{ fontSize: 12, borderRadius: 999, padding: "0 8px", background: mod ? T.amber100 : "transparent", color: mod ? T.amber600 : T.ink500, border: mod ? "none" : "1px solid " + T.line }}>{mod ? "modifié" : "par défaut"}</span>
        <span style={{ flex: 1 }} />
        {viewAsEl}
      </div>
      <div className="e-tb" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <select aria-label="Copier l'accueil d'un autre rôle" value={src} onChange={e => setSrc(e.target.value)} style={sel}>
            <option value="">Copier depuis un autre rôle…</option>
            {roles.filter(r => r[0] !== role).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {src && <button type="button" onClick={copy} style={{ ...btn("pri", "md") }}>Copier</button>}
        </span>
        <button type="button" onClick={zero} style={{ ...btn("sec", "md") }}>Partir de zéro</button>
        <button type="button" onClick={restore} disabled={!mod} style={{ ...btn("sec", "md"), opacity: mod ? 1 : 0.5, cursor: mod ? "pointer" : "default" }}>Rétablir l'accueil par défaut</button>
        <span role="status" aria-live="polite" style={{ fontSize: FZ.sm, color: T.ink700, display: "inline-flex", gap: 8, alignItems: "center" }}>{msg}{undo && <button type="button" onClick={() => { undo(); setUndo(null); setMsg("Modification annulée"); }} style={{ ...btn("ghost", "sm") }}>Annuler</button>}</span>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: T.ink500 }}>Aperçu réel de l'accueil du rôle. « Modifier l'accueil » pour déplacer, retirer ou ajouter des widgets (plusieurs à la fois) ; chaque modification vaut pour tout le rôle.</p>
      {children}
    </section>
  </div>;
}
