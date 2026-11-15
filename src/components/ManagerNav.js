// v158 — Navigation de l'espace Manager : rail latéral groupé (réductible, sous-onglets en accordéon) + palette « Aller à… » (Ctrl K).
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { T, FZ } from "../theme";
import { NavIcon } from "./SharedUI";

const LS_PIN = "enogia_manager_rail_pin", LS_RECENT = "enogia_manager_recent";
const lsGet = (k, d) => { try { const v = window.localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible : sans effet */ } };
// v191 (demandé : « le menu doit se masquer automatiquement ») : réduit par défaut (icônes + sous-pages au survol) ; « agrandir » l'épingle ouvert.
export const useRailCollapsed = () => { const [pin, setPin] = useState(() => !!lsGet(LS_PIN, false)); return [!pin, v => { setPin(!v); lsSet(LS_PIN, !v); }]; };
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Aplatit les entrées du menu en « destinations » (une par sous-onglet, ou une par onglet sans sous-onglet), utilisées par la palette.
export function leavesOf(groups) {
  const out = [];
  groups.forEach(g => g.entries.forEach(e => {
    if (e.subs) e.subs.forEach(s => out.push({ key: e.id + ":" + s.id, label: e.label + " › " + s.label, group: g.label, icon: e.icon, lock: e.lock, go: s.go, hay: fold(e.label + " " + s.label + " " + g.label + " " + (e.hint || "")) }));
    else out.push({ key: e.id + ":", label: e.label, group: g.label, icon: e.icon, lock: e.lock, go: e.go, hay: fold(e.label + " " + g.label + " " + (e.hint || "")) });
  }));
  return out;
}

export function ManagerRail({ groups, activeId, activeSub, onGo, collapsed, setCollapsed, phone }) {
  const w = collapsed ? 58 : 216;
  // v178 : panneau des sous-pages au survol d'une icône (menu réduit). Rendu hors du rail (portail) pour ne pas être rogné.
  const [fly, setFly] = useState(null), flyT = useRef(0);
  const openFly = (e, el) => { if (!collapsed || !el) return; clearTimeout(flyT.current); const r = el.getBoundingClientRect(); setFly({ e, top: r.top, left: r.right + 8 }); };
  const closeFly = () => { clearTimeout(flyT.current); flyT.current = setTimeout(() => setFly(null), 160); };
  useEffect(() => { if (!fly) return; const k = ev => { if (ev.key === "Escape") setFly(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [fly]);
  useEffect(() => () => clearTimeout(flyT.current), []);
  useEffect(() => { if (!collapsed) setFly(null); }, [collapsed]);
  const flyout = fly && typeof document !== "undefined" ? createPortal(
    <div role="menu" aria-label={fly.e.label} className="enogia-flyout" onMouseEnter={() => clearTimeout(flyT.current)} onMouseLeave={closeFly}
      style={{ position: "fixed", top: Math.max(8, fly.top - 6), left: fly.left, zIndex: 10040, minWidth: 200, background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowFloat, padding: 6, fontFamily: T.font }}>
      {/* v185 : le nom de la page est lui-même le lien (plus de bouton « Ouvrir ») ; les sous-pages suivent dessous. */}
      <button type="button" role="menuitem" onClick={() => { onGo(fly.e.go); setFly(null); }} aria-current={fly.e.id === activeId && !fly.e.subs ? "page" : undefined}
        style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", color: T.accentInk, fontWeight: 600, fontSize: FZ.sm, fontFamily: T.font, padding: "7px 10px", minHeight: 32, borderRadius: 8, cursor: "pointer" }}
        onMouseEnter={x => { x.currentTarget.style.background = T.surface; }} onMouseLeave={x => { x.currentTarget.style.background = "transparent"; }}>{fly.e.label}</button>
      {(fly.e.subs || []).map(s => { const sOn = fly.e.id === activeId && (!fly.e.subs || s.id === activeSub); return (
        <button key={s.id || "open"} role="menuitem" type="button" onClick={() => { onGo(s.go); setFly(null); }} aria-current={sOn ? "page" : undefined}
          style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: sOn ? T.teal100 : "transparent", color: sOn ? T.teal600 : T.ink700, fontWeight: sOn ? 600 : 500, fontSize: FZ.sm, fontFamily: T.font, padding: "7px 10px", minHeight: 32, borderRadius: 8, cursor: "pointer" }}
          onMouseEnter={x => { if (!sOn) x.currentTarget.style.background = T.surface; }} onMouseLeave={x => { if (!sOn) x.currentTarget.style.background = "transparent"; }}>{s.label}</button>); })}
    </div>, document.body) : null;
  if (phone) return (<nav aria-label="Navigation Manager" style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4, borderBottom: "1px solid " + T.line }}>
    {groups.flatMap(g => g.entries).map(e => { const on = e.id === activeId; return (
      <button key={e.id} onClick={() => onGo(e.go)} aria-current={on ? "page" : undefined} style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", border: "none", borderBottom: "2px solid " + (on ? T.teal500 : "transparent"), background: "transparent", color: on ? T.teal600 : T.ink500, fontWeight: on ? 600 : 600, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font }}><NavIcon name={e.icon} size={15} />{e.label}</button>); })}
  </nav>);
  return (<>{flyout}<nav aria-label="Navigation Manager" style={{ width: w, flex: "none", position: "sticky", top: 8, alignSelf: "flex-start", background: T.surface, border: "1px solid " + T.line, borderRadius: 12, padding: "8px 8px 10px", display: "flex", flexDirection: "column", gap: 2, overflow: "hidden", fontFamily: T.font }}>
    {groups.map(g => (<div key={g.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.accentInk,padding: collapsed ? "6px 0 2px" : "10px 10px 3px",whiteSpace: "nowrap",textAlign: collapsed ? "center" : "left",overflow: "hidden",height: collapsed ? 14 : "auto",transition: "padding .2s"}}>{collapsed ? "·" : g.label}</div>
      {g.entries.map(e => { const on = e.id === activeId; return (<React.Fragment key={e.id}>
        <button onClick={() => onGo(e.go)} title={collapsed && !fly ? e.label : undefined} aria-current={on ? "page" : undefined} aria-haspopup={collapsed ? "menu" : undefined} aria-expanded={collapsed ? !!(fly && fly.e.id === e.id) : undefined}
          onFocus={x => openFly(e, x.currentTarget)} onBlur={closeFly}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", borderRadius: 8, padding: collapsed ? "9px 0" : "8px 10px", justifyContent: collapsed ? "center" : "flex-start", background: on ? T.card : "transparent", boxShadow: on ? T.shadowSm : "none", color: on ? T.ink900 : T.ink500, fontWeight: on ? 600 : 500, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font, textAlign: "left", whiteSpace: "nowrap" }}
          onMouseEnter={x => { openFly(e, x.currentTarget); if (!on) { x.currentTarget.style.background = T.card; x.currentTarget.style.color = T.ink900; } }} onMouseLeave={x => { closeFly(); if (!on) { x.currentTarget.style.background = "transparent"; x.currentTarget.style.color = T.ink500; } }}>
          <span style={{ display: "inline-flex", color: on ? T.teal500 : "inherit", flex: "none" }}><NavIcon name={e.icon} size={17} /></span>
          {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{e.label}</span>}
          {!collapsed && e.badge > 0 && <span style={{ fontSize: 11, fontWeight: 600, background: T.red500, color: T.onFill, borderRadius: 999, padding: "0 6px", minWidth: 18, textAlign: "center" }}>{e.badge}</span>}
          {!collapsed && e.lock && <span style={{ fontSize:11, fontWeight: 600, color: T.amber600, background: T.amber100, padding: "1px 6px", borderRadius: 999 }}>Admin</span>}
        </button>
        {e.subs && !collapsed && <div style={{ display: "grid", gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0, transition: "opacity .2s ease" }}>
          <div style={{ overflow: "hidden", minHeight: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", margin: "2px 0 4px 19px", paddingLeft: 6, borderLeft: "2px solid " + T.line }}>
              {e.subs.map(s => { const sOn = on && s.id === activeSub; return (
                <button key={s.id} tabIndex={on ? 0 : -1} onClick={() => onGo(s.go)} aria-current={sOn ? "page" : undefined}
                  style={{ border: "none", background: sOn ? T.teal100 : "transparent", textAlign: "left", padding: "5px 10px", borderRadius: 8, color: sOn ? T.teal600 : T.ink500, fontWeight: sOn ? 600 : 500, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap" }}
                  onMouseEnter={x => { if (!sOn) x.currentTarget.style.color = T.ink900; }} onMouseLeave={x => { if (!sOn) x.currentTarget.style.color = T.ink500; }}>{s.label}</button>); })}
            </div>
          </div>
        </div>}
      </React.Fragment>); })}
    </div>))}
    <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"} title={collapsed ? "Agrandir le menu" : "Réduire le menu"}
      style={{ marginTop: 8, border: "1px solid " + T.line, background: T.card, borderRadius: 8, padding: 6, display: "flex", justifyContent: "center", color: T.ink500, cursor: "pointer" }}>
      <span style={{ display: "inline-flex", transform: "rotate(" + (collapsed ? "-90deg" : "90deg") + ")", transition: "transform .28s var(--e-ease)" }}><NavIcon name="chevronDown" size={15} /></span>
    </button>
  </nav></>);
}

// Ligne du haut : fil d'Ariane + bouton « Aller à… »
export function ManagerCrumb({ parts, onOpenPalette }) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
    <div style={{ flex: 1, minWidth: 140, fontSize: FZ.sm, color: T.ink500, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }} aria-label="Fil d'Ariane">
      {parts.map((p, i) => <React.Fragment key={i}>{i > 0 && <span aria-hidden="true" style={{ color: T.ink300 }}>›</span>}{i === parts.length - 1 ? <h1 style={{ margin: 0, font: "inherit", color: T.ink900, fontWeight: 600 }}>{p}</h1> : <span style={{ color: T.ink500, fontWeight: 500 }}>{p}</span>}</React.Fragment>)}
    </div>
    <button onClick={onOpenPalette} aria-label="Aller à… (Ctrl K)" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 210, border: "1px solid " + T.line, background: T.surface, borderRadius: 12, padding: "6px 10px 6px 12px", color: T.ink500, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font }}>
      <NavIcon name="search" size={15} /><span>Aller à…</span>
      <kbd style={{ marginLeft: "auto", fontFamily: T.font, fontSize: 11, fontWeight: 600, border: "1px solid " + T.line, borderRadius: 4, padding: "1px 6px", background: T.card, color: T.ink500 }}>Ctrl K</kbd>
    </button>
  </div>);
}

export function ManagerPalette({ groups, data, onGo, onOpenPj, onClose, activeKey, storageKey = LS_RECENT }) {
  const [q, setQ] = useState(""), [sel, setSel] = useState(0), [recent] = useState(() => lsGet(storageKey, []));
  const ref = useRef(null), listRef = useRef(null);
  const leaves = useMemo(() => leavesOf(groups), [groups]);
  const items = useMemo(() => {
    const f = fold(q.trim());
    if (!f) {
      const rec = recent.map(k => leaves.find(l => l.key === k)).filter(l => l && l.key !== activeKey);
      const rest = leaves.filter(l => !rec.includes(l) && l.key !== activeKey);
      return [...(rec.length ? [{ head: "Récents" }] : []), ...rec, { head: "Destinations" }, ...rest];
    }
    const nav = leaves.filter(l => f.split(/\s+/).every(w => (" " + l.hay).includes(" " + w)));
    const pjs = f.length >= 2 ? (data || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE" && fold(r.pj + " " + (r.nomProjet || r.client || "")).includes(f)).slice(0, 5).map(r => ({ pjRow: r, key: "pj:" + r.pj, label: "Fiche " + r.pj + (r.nomProjet ? " · " + r.nomProjet : ""), icon: "list", group: "Projet" })) : [];
    const out = [];
    if (nav.length) out.push({ head: "Aller à" }, ...nav);
    if (pjs.length) out.push({ head: "Ouvrir une fiche projet" }, ...pjs);
    return out;
  }, [q, leaves, recent, data, activeKey]);
  const real = items.filter(i => !i.head);
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { const el = listRef.current && listRef.current.querySelector("[data-sel='1']"); if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); }, [sel, items]);
  const choose = it => { if (!it) return; if (it.pjRow) onOpenPj(it.pjRow.pj); else { lsSet(storageKey, [it.key, ...recent.filter(k => k !== it.key)].slice(0, 3)); onGo(it.go); } onClose(); };
  const keyDown = e => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => real.length ? (s + 1) % real.length : 0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => real.length ? (s - 1 + real.length) % real.length : 0); }
    else if (e.key === "Enter") { e.preventDefault(); choose(real[sel]); }
  };
  let n = -1;
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(8,12,28,.45)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "min(14vh,110px) 16px 16px", animation: "enogiaFadeIn .18s ease" }}>
    <div role="dialog" aria-modal="true" aria-label="Aller à…" onKeyDown={keyDown} style={{ width: "min(560px,100%)", background: T.card, border: "1px solid " + T.line, borderRadius: 12, boxShadow: "0 24px 70px rgba(0,0,0,.35)", overflow: "hidden", animation: "enogiaPop .24s var(--e-ease)", fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderBottom: "1px solid " + T.line, color: T.ink500 }}>
        <NavIcon name="search" size={17} />
        <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Aller à… (ex. dérives, cash, accès, PJ2003)" aria-label="Rechercher une destination" autoComplete="off"
          style={{ flex: 1, border: "none", background: "transparent", color: T.ink900, fontSize: FZ.md, padding: "15px 0", fontFamily: T.font }} />
      </div>
      <div ref={listRef} role="listbox" style={{ maxHeight: 340, overflowY: "auto", padding: 6 }}>
        {items.map((it, i) => { if (it.head) return <div key={"h" + i} style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.accentInk,padding: "8px 12px 3px"}}>{it.head}</div>;
          n++; const on = n === sel, idx = n; return (
            <div key={it.key} role="option" aria-selected={on} data-sel={on ? "1" : "0"} onMouseEnter={() => setSel(idx)} onMouseDown={e => { e.preventDefault(); choose(it); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 8, cursor: "pointer", background: on ? T.teal100 : "transparent", color: T.ink900, fontSize: FZ.sm }}>
              <span style={{ display: "inline-flex", color: T.teal500 }}><NavIcon name={it.icon} size={16} /></span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: on ? 600 : 500 }}>{it.label}</span>
              {it.lock && <span style={{ fontSize:11, fontWeight: 600, color: T.amber600, background: T.amber100, padding: "1px 6px", borderRadius: 999 }}>Admin</span>}
              <span style={{ fontSize: FZ.xs, color: T.ink500, minWidth: 14, textAlign: "right" }}>{on ? "↵" : it.lock ? "" : it.group}</span>
            </div>); })}
        {real.length === 0 && <div style={{ padding: "18px 14px", fontSize: FZ.sm, color: T.ink500 }}>Aucun résultat pour « {q} ».</div>}
      </div>
      <div style={{ display: "flex", gap: 16, padding: "8px 16px", borderTop: "1px solid " + T.line, fontSize: FZ.xs, color: T.ink500 }}><span>↑↓ naviguer</span><span>↵ ouvrir</span><span>Échap fermer</span></div>
    </div>
  </div>);
}
