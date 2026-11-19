// v412 (demandé : « je veux que ça fonctionne comme les autres cadres et pages du Cockpit ») : SAV / MES › Compétences en page du site
// (plus de cadre ni de page à part) — Équipe (un radar par personne, situation par catégorie, tableau détaillé, trimestre figé), Fiche
// (radar, catégories, compétences niveau par niveau : auto-évaluation et manager, objectifs), Référentiel (personnes, comptes reliés,
// catégories, niveaux, compétences). Responsable SAV (Admin sur SAV) et propriétaire : toute l'équipe ; une personne reliée : sa fiche.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, btn } from "../theme";
import { Segmented, Pill, NavIcon, notify, tableTh, tableTd } from "./SharedUI";
import { askConfirm } from "../confirm";
import { AF } from "../autoFocusOk";
import { useSavSkills, firestoreBackend, memoryBackend } from "../useSavSkills";
import { STATE, LVL_DEFAULT, KINDS, STARTER, periodsAround, mean, fmt, uid, catsOf, stateOf, stateOfView, mgrOf, selfOf, snapVal, current, target, series, avgSeries,
  cycle, stepTarget, prefillMgr, freezeScores, mirrorOf, personStats, hasData } from "../savSkillsModel";

const isDemo = () => { try { return process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("demo"); } catch (e) { return false; } };
const DEMO_SEED = {
  savSkillsCat: { categories: Object.fromEntries(STARTER.map(([n, k], i) => ["c" + i, { name: n, kind: k, order: i + 1, levels: LVL_DEFAULT.map((l, j) => ({ label: l, skills: j < 3 ? [{ id: "s" + i + j + "a", text: "Savoir " + n.toLowerCase() + " · niveau " + (j + 1) }, { id: "s" + i + j + "b", text: "Maîtriser " + n.toLowerCase() + " · niveau " + (j + 1) }] : [] })) }])) },
  savSkills: { people: { p1: { name: "Technicien A", role: "Mise en service", order: 1 }, p2: { name: "Technicienne B", role: "SAV", order: 2 } },
    assess: { p1: { mgr: { s00a: 2, s00b: 2, s01a: 1, s10a: 2, s20a: 2, s20b: 1 } }, p2: { mgr: { s00a: 2, s00b: 1, s10a: 2, s10b: 2, s11a: 2, s30a: 1 } } },
    objectives: { "p1_x": { personId: "p1", period: periodsAround()[2], targets: { c0: 2.5, c1: 1.5 } } }, snapshots: {} },
};
const stable = o => JSON.stringify(o, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v));
const ini = n => String(n || "?").trim().charAt(0).toUpperCase();

// ── visuels
function Spark({ ser, tIdx, tVal }) {
  const W = 140, H = 34, px = i => 7 + i * (W - 14) / 5, py = v => H - 6 - (v / 5) * (H - 12);
  const pts = []; ser.forEach((v, i) => { if (v != null) pts.push([px(i), py(v)]); });
  const last = pts[pts.length - 1];
  return <svg viewBox={"0 0 " + W + " " + H} width={W} height={H} aria-hidden="true" style={{ display: "block" }}>
    {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={px(i)} x2={px(i)} y1={H - 3} y2={H} stroke={T.line} />)}
    {pts.length > 1 && <polyline points={pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")} fill="none" stroke={T.accentInk} strokeWidth="2" />}
    {tVal != null && tIdx >= 0 && last && <line x1={last[0]} y1={last[1]} x2={px(tIdx)} y2={py(tVal)} stroke={T.amber600} strokeWidth="1.5" strokeDasharray="3 3" />}
    {tVal != null && tIdx >= 0 && <circle cx={px(tIdx)} cy={py(tVal)} r="3.2" fill="none" stroke={T.amber600} strokeWidth="1.5" />}
    {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.4 : 2.2} fill={T.accentInk} />)}
  </svg>;
}
function Radar({ cats, S, pid, cur, horizon, mini, avgOf, label }) {
  const n = cats.length; if (n < 3) return <p style={{ fontSize: 13, color: T.ink500 }}>Le radar s'affiche à partir de trois catégories.</p>;
  const [W, H, cx, cy, R] = mini ? [200, 192, 100, 96, 58] : [420, 344, 210, 172, 104];
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n, pt = (i, v) => [cx + Math.cos(ang(i)) * R * v / 5, cy + Math.sin(ang(i)) * R * v / 5];
  const poly = f => cats.map((c, i) => { const q = pt(i, f(c)); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ");
  const hasT = cats.some(c => target(S, pid, c.id, horizon) != null);
  return <svg viewBox={"0 0 " + W + " " + H} role="img" aria-label={label} style={{ width: "100%", maxWidth: mini ? 220 : 460, display: "block", margin: "0 auto" }}>
    {(mini ? [1, 3, 5] : [1, 2, 3, 4, 5]).map(k => <polygon key={k} points={poly(() => k)} fill="none" stroke={T.line} />)}
    {cats.map((c, i) => { const q = pt(i, 5); return <line key={c.id} x1={cx} y1={cy} x2={q[0]} y2={q[1]} stroke={T.line} />; })}
    {avgOf && <polygon points={poly(c => avgOf(c) || 0)} fill="none" stroke={T.ink500} strokeDasharray="2 3" />}
    {hasT && <polygon points={poly(c => { const t = target(S, pid, c.id, horizon); return t != null ? t : (current(S, pid, c, cur).v || 0); })} fill="none" stroke={T.amber600} strokeWidth="1.5" strokeDasharray="5 4" />}
    <polygon points={poly(c => current(S, pid, c, cur).v || 0)} fill={T.accentInk} fillOpacity=".16" stroke={T.accentInk} strokeWidth="2" />
    {cats.map((c, i) => { const a = ang(i), co = Math.cos(a), x = cx + co * (R + (mini ? 9 : 14)), y = cy + Math.sin(a) * (R + (mini ? 9 : 14)) + (mini ? 3 : 4);
      const nm = mini && c.name.length > 9 ? c.name.slice(0, 8) + "." : c.name;
      return <text key={c.id} x={x} y={y} textAnchor={co > 0.3 ? "start" : co < -0.3 ? "end" : "middle"} fontSize={mini ? 10 : 12} fill={T.ink700}>{nm}</text>; })}
  </svg>;
}
function Legend({ horizon, avg }) {
  return <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: T.ink500 }}>
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><i style={{ width: 10, height: 10, borderRadius: 2, background: T.accentInk }} />niveau actuel</span>
    <span style={{ color: T.amber600 }}>- - objectif {horizon}</span>{avg && <span>···· moyenne de l'équipe</span>}
  </div>;
}
function Card({ title, sub, right, children }) {
  return <section style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "14px 16px" }}>
    {(title || right) && <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
      {title && <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.ink900 }}>{title}</h3>}{sub && <span style={{ fontSize: 13, color: T.ink500 }}>{sub}</span>}<span style={{ flex: 1 }} />{right}</div>}
    {children}
  </section>;
}
// pastille d'une compétence : vide = non acquis, demi = en cours, plein = autonome
function Dot({ v, label, onClick, disabled, why }) {
  const c = v === 2 ? T.emerald600 : v === 1 ? T.amber600 : T.fieldLine;
  return <button type="button" onClick={disabled ? () => notify(why, "info") : onClick} aria-label={label + " : " + STATE[v || 0]} title={label + " : " + STATE[v || 0]}
    style={{ all: "unset", position: "relative", cursor: disabled ? "default" : "pointer", width: 44, height: 36, display: "grid", placeItems: "center" }}>
    <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 999, border: "2px solid " + c, boxSizing: "border-box", background: v === 2 ? c : v === 1 ? "linear-gradient(90deg," + c + " 50%,transparent 50%)" : "transparent", opacity: disabled ? 0.55 : 1 }} />
  </button>;
}

// ── Équipe
function TeamView({ S, cats, cur, horizon, periods, open, setOpen, isAdmin, onPerson, onCell, onFreeze }) {
  const catAvg = c => mean(S.people.map(p => current(S, p.id, c, cur).v).filter(v => v != null));
  const tIdx = periods.indexOf(horizon);
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <Card title="Vue d'ensemble" sub={"un radar par personne · objectif " + horizon} right={isAdmin && <button type="button" style={btn("sec", "sm")} onClick={onFreeze}>Figer le trimestre {cur}</button>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {S.people.map(p => { const vs = cats.map(c => current(S, p.id, c, cur).v).filter(v => v != null), m = mean(vs);
          const anyT = cats.some(c => target(S, p.id, c.id, horizon) != null), tv = cats.map(c => target(S, p.id, c.id, horizon) != null ? target(S, p.id, c.id, horizon) : current(S, p.id, c, cur).v).filter(v => v != null);
          return <button key={p.id} type="button" className="sk-card" onClick={() => onPerson(p.id)} aria-label={"Ouvrir la fiche de " + p.name}>
            <b style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</b><span style={{ fontSize: 12, color: T.ink500 }}>{p.role}</span>
            <Radar mini cats={cats} S={S} pid={p.id} cur={cur} horizon={horizon} avgOf={catAvg} label={"Radar de " + p.name} />
            <span style={{ display: "flex", gap: 14, alignItems: "flex-end", width: "100%" }}>
              <span><small style={{ display: "block", fontSize: 12, color: T.ink500 }}>Niveau moyen</small><b style={{ fontSize: 20, fontWeight: 600 }}>{fmt(m == null ? null : Math.round(m * 10) / 10)}</b></span>
              <span><small style={{ display: "block", fontSize: 12, color: T.ink500 }}>Objectif</small><b style={{ fontSize: 20, fontWeight: 600, color: T.amber600 }}>{anyT ? fmt(Math.round(mean(tv) * 10) / 10) : "–"}</b></span>
              <span style={{ marginLeft: "auto" }}><Spark ser={avgSeries(S, p.id, cats, periods, cur)} tIdx={tIdx} tVal={anyT ? mean(tv) : null} /></span></span>
          </button>; })}
      </div>
      <div style={{ marginTop: 10 }}><Legend horizon={horizon} avg /></div>
    </Card>
    <Card title="Situation par catégorie" sub="une pastille par personne, l'anneau = objectif">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {KINDS.map(([k, kl]) => { const cs = cats.filter(c => c.kind === k); if (!cs.length) return null;
          return <React.Fragment key={k}><div style={{ fontSize: 12, fontWeight: 600, color: T.ink500, margin: "8px 0 2px" }}>{kl}</div>
            {cs.map(c => { const av = catAvg(c);
              return <div key={c.id} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 200px) minmax(0, 1fr)", gap: 12, alignItems: "center", borderTop: "1px solid " + T.line, padding: "6px 0" }}>
                <span style={{ fontSize: 13 }}>{c.name}<small style={{ display: "block", color: T.ink500, fontSize: 12 }}>moy. {fmt(av == null ? null : Math.round(av * 10) / 10)}</small></span>
                <div style={{ position: "relative", height: Math.max(28, S.people.length * 26), margin: "0 14px" }}>
                  {[0, 1, 2, 3, 4, 5].map(x => <i key={x} aria-hidden="true" style={{ position: "absolute", left: x * 20 + "%", top: 0, bottom: 0, width: 1, background: T.line }} />)}
                  {S.people.map((p, i) => { const cu = current(S, p.id, c, cur), t = target(S, p.id, c.id, horizon), top = i * 26 + 2; if (cu.v == null) return null;
                    return <React.Fragment key={p.id}>
                      {t != null && t > cu.v && <i aria-hidden="true" style={{ position: "absolute", left: cu.v * 20 + "%", width: (t - cu.v) * 20 + "%", top: top + 11, height: 2, background: T.amber600, opacity: 0.6 }} />}
                      {t != null && <i aria-hidden="true" style={{ position: "absolute", left: "calc(" + t * 20 + "% - 12px)", top: top - 1, width: 24, height: 24, borderRadius: 999, border: "2px solid " + (cu.v >= t ? T.emerald600 : T.amber600), boxSizing: "border-box" }} />}
                      <button type="button" onClick={() => onCell(p.id, c.id)} aria-label={p.name + ", " + c.name + " : " + fmt(cu.v)} title={p.name + " : " + fmt(cu.v)}
                        style={{ all: "unset", position: "absolute", cursor: "pointer", left: "calc(" + cu.v * 20 + "% - 10px)", top: top + 1, width: 20, height: 20, borderRadius: 999, background: cu.src === "import" ? T.amber600 : T.accentInk, color: T.onFill, fontSize: 11, fontWeight: 600, display: "grid", placeItems: "center" }}>{ini(p.name)}</button>
                    </React.Fragment>; })}
                </div></div>; })}</React.Fragment>; })}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 200px) minmax(0, 1fr)", gap: 12 }}><span /><div style={{ position: "relative", height: 16, margin: "0 14px", fontSize: 11, color: T.ink500 }}>{[0, 1, 2, 3, 4, 5].map(x => <span key={x} style={{ position: "absolute", left: x * 20 + "%", transform: "translateX(-50%)" }}>{x}</span>)}</div></div>
      </div>
    </Card>
    <div><button type="button" style={btn("ghost", "sm")} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Masquer le tableau détaillé" : "Afficher le tableau détaillé"}</button></div>
    {open && <Card title="Niveau par catégorie" sub="échelle de 0 à 5 · clic = fiche">
      <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
        <thead><tr><th style={tableTh()}>Catégorie</th>{S.people.map(p => <th key={p.id} style={tableTh({ num: true })}>{p.name}</th>)}<th style={tableTh({ num: true })}>Équipe</th></tr></thead>
        <tbody>{cats.map(c => { const vals = []; return <tr key={c.id}><td style={tableTd()}>{c.name}</td>
          {S.people.map(p => { const cu = current(S, p.id, c, cur), t = target(S, p.id, c.id, horizon); if (cu.v != null) vals.push(cu.v);
            return <td key={p.id} style={tableTd({ num: true })}><button type="button" onClick={() => onCell(p.id, c.id)} style={{ all: "unset", position: "relative", cursor: "pointer", fontWeight: 600 }}>{fmt(cu.v)}{t != null && <small style={{ marginLeft: 6, color: cu.v != null && cu.v >= t ? T.emerald600 : T.amber600, fontWeight: 500 }}>{cu.v != null && cu.v >= t ? "✓ " : "→ "}{fmt(t)}</small>}</button></td>; })}
          <td style={tableTd({ num: true })}><b style={{ fontWeight: 600 }}>{fmt(mean(vals))}</b></td></tr>; })}</tbody>
      </table></div></Card>}
  </div>;
}

// ── Fiche
function CatRow({ S, p, c, cur, horizon, periods, open, onOpen, isAdmin, canSelf, onCycle, onTarget, onPrefill }) {
  const cu = current(S, p.id, c, cur), t = target(S, p.id, c.id, horizon), m = mgrOf(S, p.id), s = selfOf(S, p.id), base = snapVal(S, p.id, cur, c.id);
  return <article style={{ borderTop: "1px solid " + T.line }}>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 12, alignItems: "center", padding: "6px 0" }}>
      <button type="button" aria-expanded={open} onClick={onOpen} style={{ all: "unset", position: "relative", cursor: "pointer", display: "grid", gridTemplateColumns: "minmax(110px, 180px) minmax(80px, 1fr) 48px", gap: 12, alignItems: "center", minHeight: 44 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
        <span aria-hidden="true" style={{ position: "relative", height: 8, borderRadius: 4, background: T.surfaceAlt }}>
          <i style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (cu.v || 0) / 5 * 100 + "%", borderRadius: 4, background: T.accentInk }} />
          {t != null && <i style={{ position: "absolute", left: "calc(" + t / 5 * 100 + "% - 1px)", top: -4, bottom: -4, width: 2, background: T.amber600 }} />}</span>
        <span style={{ fontSize: 16, fontWeight: 600, textAlign: "right" }}>{fmt(cu.v)}{cu.src === "import" && <small style={{ display: "block", fontSize: 11, color: T.amber600, fontWeight: 500 }}>importé</small>}</span>
      </button>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, background: T.surfaceAlt, borderRadius: 8, padding: 2 }} title={"Objectif pour " + horizon}>
        {isAdmin && <button type="button" style={{ ...btn("ghost", "sm"), minWidth: 32 }} onClick={() => onTarget(-0.5)} aria-label={"Baisser l'objectif de " + c.name}>−</button>}
        <span style={{ minWidth: 40, textAlign: "center", fontSize: 13, fontWeight: 600, color: T.amber600 }}>{t != null ? fmt(t) : "–"}</span>
        {isAdmin && <button type="button" style={{ ...btn("ghost", "sm"), minWidth: 32 }} onClick={() => onTarget(0.5)} aria-label={"Monter l'objectif de " + c.name}>+</button>}</span>
      <Spark ser={series(S, p.id, c, periods, cur)} tIdx={periods.indexOf(horizon)} tVal={t} />
    </div>
    {open && <div className="enogia-cl-in" style={{ padding: "4px 0 14px" }}>
      {isAdmin && !hasData(S, p.id, c) && base != null && <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 12px", borderRadius: 8, background: T.amber100, margin: "4px 0 10px", fontSize: 13 }}>
        <span>Niveau importé : <b>{fmt(base)}</b>. Les compétences ne sont pas encore détaillées.</span><button type="button" style={btn("sec", "sm")} onClick={onPrefill}>Pré-remplir depuis ce score</button></div>}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 44px 44px", gap: 8, fontSize: 12, color: T.ink500, padding: "0 0 4px" }}><span>Compétence</span><span style={{ textAlign: "center" }}>Auto</span><span style={{ textAlign: "center" }}>Manager</span></div>
      {c.levels.map((lv, i) => { const sk = lv.skills || [], ok = sk.filter(k => m[k.id] === 2).length, done = sk.length && ok === sk.length;
        return <div key={i} style={{ marginTop: 8, borderRadius: 8, border: "1px solid " + (done ? T.emerald600 : T.line), padding: "6px 10px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 13 }}><b style={{ fontWeight: 600 }}>N{i + 1} · {lv.label}</b><span style={{ color: T.ink500, fontSize: 12 }}>{done ? "validé · " : ""}{ok} / {sk.length} en autonomie</span></div>
          {sk.map(k => { const mv = m[k.id] || 0, sv = s[k.id] || 0, need = t != null && i < Math.ceil(t) && mv < 2;
            return <div key={k.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 44px 44px", gap: 8, alignItems: "center", borderTop: "1px solid " + T.line }}>
              <span style={{ fontSize: 13, padding: "6px 0" }}>{k.text || <i style={{ color: T.ink500 }}>(compétence à décrire)</i>}{need && <small style={{ display: "block", fontSize: 12, color: T.amber600 }}>objectif {horizon}</small>}</span>
              <Dot v={sv} label={"Auto-évaluation, " + (k.text || "compétence")} disabled={!canSelf} why="L'auto-évaluation est renseignée par la personne depuis son compte" onClick={() => onCycle("self", k.id)} />
              <Dot v={mv} label={"Manager, " + (k.text || "compétence")} disabled={!isAdmin} why="La pastille Manager est renseignée par le responsable SAV" onClick={() => onCycle("mgr", k.id)} />
            </div>; })}
          {!sk.length && <p style={{ fontSize: 12, color: T.ink500, margin: "6px 0 2px" }}>Aucune compétence décrite pour ce niveau</p>}
        </div>; })}
      <p style={{ fontSize: 12, color: T.ink500, margin: "10px 0 0" }}>Un appui fait passer une compétence de vide (non acquis) à demi (en cours ou avec aide) puis à plein (autonome).</p>
    </div>}
  </article>;
}
function PersonView({ S, cats, cur, horizon, periods, pid, setPid, isAdmin, openCat, setOpenCat, canSelf, onCycle, onTarget, onPrefill }) {
  const p = S.people.find(x => x.id === pid) || S.people[0];
  const vals = cats.map(c => current(S, p.id, c, cur).v).filter(v => v != null), tg = cats.filter(c => target(S, p.id, c.id, horizon) != null), st = personStats(S, p.id, cats);
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    {isAdmin && S.people.length > 1 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="group" aria-label="Personne">{S.people.map(x =>
      <button key={x.id} type="button" aria-current={x.id === p.id ? "true" : undefined} onClick={() => { setPid(x.id); setOpenCat(null); }}
        style={{ all: "unset", position: "relative", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px 0 4px", borderRadius: 999, border: "1px solid " + (x.id === p.id ? T.ink900 : T.line), background: x.id === p.id ? T.ink900 : T.card, color: x.id === p.id ? T.card : T.ink900, fontSize: 13, fontWeight: 500 }}>
        <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: x.id === p.id ? T.card : T.surfaceAlt, color: T.ink900, fontWeight: 600, fontSize: 12 }}>{ini(x.name)}</span>{x.name}</button>)}</div>}
    <div className="sk-fiche">
      <Card title={p.name} sub={p.role}>
        <Radar cats={cats} S={S} pid={p.id} cur={cur} horizon={horizon} label={"Radar des niveaux de " + p.name} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
          {[["Niveau moyen", fmt(vals.length ? Math.round(mean(vals) * 10) / 10 : null), T.ink900], ["Objectif " + horizon, tg.length ? fmt(Math.round(mean(tg.map(c => target(S, p.id, c.id, horizon))) * 10) / 10) : "–", T.amber600], ["Compétences autonomes", st.mast + " / " + st.total, T.ink900]].map(([k, v, col]) =>
            <div key={k} style={{ borderTop: "1px solid " + T.line, paddingTop: 8 }}><span style={{ display: "block", fontSize: 12, color: T.ink500 }}>{k}</span><b style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: col }}>{v}</b></div>)}
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}><Legend horizon={horizon} />{st.gaps > 0 && <Pill tone="warn">{st.gaps} écart{st.gaps > 1 ? "s" : ""} entre auto-évaluation et manager</Pill>}</div>
      </Card>
      <Card title="Catégories" sub="ouvrez une catégorie pour situer chaque compétence">
        {KINDS.map(([k, kl]) => { const cs = cats.filter(c => c.kind === k); if (!cs.length) return null;
          return <div key={k} style={{ marginBottom: 6 }}><div style={{ fontSize: 12, fontWeight: 600, color: T.ink500, margin: "6px 0 2px" }}>{kl}</div>
            {cs.map(c => <CatRow key={c.id} S={S} p={p} c={c} cur={cur} horizon={horizon} periods={periods} open={openCat === c.id} onOpen={() => setOpenCat(openCat === c.id ? null : c.id)}
              isAdmin={isAdmin} canSelf={canSelf(p)} onCycle={(who, sid) => onCycle(p, who, sid)} onTarget={d => onTarget(p, c, d)} onPrefill={() => onPrefill(p, c)} />)}</div>; })}
      </Card>
    </div>
  </div>;
}

// ── Référentiel
function Field({ value, onSave, label, placeholder, width }) {
  const [v, setV] = useState(value || ""), last = useRef(value || "");
  if (last.current !== (value || "")) { last.current = value || ""; if (v !== last.current) setV(last.current); }
  return <input className="sk-in" value={v} placeholder={placeholder} aria-label={label} style={{ width: width || "100%", minHeight: 36 }} onChange={e => setV(e.target.value)}
    onBlur={() => { if (v.trim() !== (value || "")) onSave(v.trim()); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setV(value || ""); e.currentTarget.blur(); } }} />;
}
function LinkPicker({ people, taken, onPick, onCancel }) {
  const [q, setQ] = useState(""), s = q.trim().toLowerCase();
  const hits = s.length < 2 ? [] : (people || []).filter(x => x && x.email && !taken.has(String(x.email).toLowerCase()) && (String(x.name || "") + " " + x.email).toLowerCase().includes(s)).slice(0, 8);
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
    <input className="sk-in" autoFocus={AF} value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un collègue par nom" aria-label="Rechercher un collègue" style={{ minHeight: 36, minWidth: 220 }} />
    {hits.map(h => <button key={h.email} type="button" style={btn("sec", "sm")} onClick={() => onPick(String(h.email).toLowerCase())}>{h.name || h.email}</button>)}
    {s.length >= 2 && !hits.length && <span style={{ fontSize: 12, color: T.ink500 }}>Aucun résultat</span>}
    <button type="button" style={btn("ghost", "sm")} onClick={onCancel}>Annuler</button>
  </div>;
}
function RefView({ S, cats, api, people, nameOf, onStarter }) {
  const [linkFor, setLinkFor] = useState(null), [openC, setOpenC] = useState(null);
  const taken = new Set(S.people.map(p => p.uid && String(p.uid).toLowerCase()).filter(Boolean));
  const saveP = (p, patch) => api.setPerson(p.id, (({ id, ...rest }) => rest)({ ...p, ...patch }));
  const saveC = c => api.setCat(c.id, (({ id, ...rest }) => rest)(c));
  const addPerson = () => { const id = "p-" + uid(); api.setPerson(id, { name: "Nouveau collaborateur", role: "SAV / Mise en service", order: S.people.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1 }); };
  const addCat = () => { const id = "c-" + uid(); api.setCat(id, { name: "Nouvelle catégorie", kind: "technique", order: cats.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1, levels: LVL_DEFAULT.map(l => ({ label: l, skills: [] })) }); setOpenC(id); };
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <Card title="Équipe" sub="les personnes suivies ; une personne reliée à son compte voit sa fiche et fait son auto-évaluation" right={<button type="button" style={btn("sec", "sm")} onClick={addPerson}>＋ Personne</button>}>
      {!S.people.length && <p style={{ fontSize: 13, color: T.ink500, margin: 0 }}>Personne pour l'instant : ajoutez les techniciens de l'équipe SAV / MES</p>}
      {S.people.map(p => <div key={p.id} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 1fr) minmax(140px, 1fr) auto", gap: 8, alignItems: "center", borderTop: "1px solid " + T.line, padding: "8px 0" }}>
        <Field value={p.name} label="Nom" onSave={v => v && saveP(p, { name: v })} />
        <Field value={p.role} label="Fonction" placeholder="Fonction" onSave={v => saveP(p, { role: v })} />
        <button type="button" style={{ ...btn("ghost", "sm"), color: T.red600 }} onClick={async () => { if (await askConfirm({ title: "Retirer " + p.name + " ?", message: "Ses évaluations sont retirées avec la personne.", confirmLabel: "Retirer", danger: true })) { api.delPerson(p.id); if (p.uid) api.delMirror(p.uid); } }}>Retirer</button>
        <div style={{ gridColumn: "1 / -1", fontSize: 13 }}>{p.uid ? <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Pill tone="ok">compte relié</Pill>{nameOf(p.uid)}
            <button type="button" style={btn("ghost", "sm")} onClick={() => { saveP(p, { uid: null }); api.delMirror(p.uid); }}>Délier</button></span>
          : linkFor === p.id ? <LinkPicker people={people} taken={taken} onCancel={() => setLinkFor(null)} onPick={u => { saveP(p, { uid: u }); setLinkFor(null); }} />
          : <button type="button" style={btn("ghost", "sm")} onClick={() => setLinkFor(p.id)}>Relier un compte ENOGIA</button>}</div>
      </div>)}
    </Card>
    <Card title="Catégories et niveaux" sub="chaque niveau regroupe les compétences qui le définissent" right={<>{!cats.length && <button type="button" style={btn("sec", "sm")} onClick={onStarter}>Créer la trame de départ</button>}<button type="button" style={btn("sec", "sm")} onClick={addCat}>＋ Catégorie</button></>}>
      {!cats.length && <p style={{ fontSize: 13, color: T.ink500, margin: 0 }}>Aucune catégorie : créez la trame de départ (fluidique, électricité, automatisme, produit, livrables, rigueur, relation client) ou ajoutez-les une à une</p>}
      {cats.map(c => { const open = openC === c.id, n = c.levels.reduce((s, l) => s + l.skills.length, 0);
        return <div key={c.id} style={{ borderTop: "1px solid " + T.line }}>
          <button type="button" aria-expanded={open} onClick={() => setOpenC(open ? null : c.id)} style={{ all: "unset", position: "relative", boxSizing: "border-box", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
            <b style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</b><Pill tone="neutral">{(KINDS.find(k => k[0] === c.kind) || KINDS[0])[1]}</Pill><span style={{ fontSize: 12, color: T.ink500 }}>{n} compétence{n > 1 ? "s" : ""}</span>
            <span style={{ marginLeft: "auto", display: "inline-grid", color: T.ink500, transform: open ? "rotate(180deg)" : "none", transition: "transform var(--e-dur-micro) ease-out" }}><NavIcon name="chevronDown" size={16} /></span></button>
          {open && <div className="enogia-cl-in" style={{ padding: "0 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Field value={c.name} label="Nom de la catégorie" width={240} onSave={v => v && saveC({ ...c, name: v })} />
              <Segmented label="Type" value={c.kind} onChange={v => saveC({ ...c, kind: v })} options={KINDS} />
              <span style={{ flex: 1 }} />
              <button type="button" style={{ ...btn("ghost", "sm"), color: T.red600 }} onClick={async () => { if (await askConfirm({ title: "Supprimer « " + c.name + " » ?", message: "Ses niveaux et ses compétences sont supprimés.", confirmLabel: "Supprimer", danger: true })) api.delCat(c.id); }}>Supprimer la catégorie</button></div>
            {c.levels.map((lv, i) => <div key={i} style={{ border: "1px solid " + T.line, borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><b style={{ fontSize: 13, fontWeight: 600, width: 28 }}>N{i + 1}</b>
                <Field value={lv.label} label={"Intitulé du niveau " + (i + 1)} width={220} onSave={v => v && saveC({ ...c, levels: c.levels.map((l, j) => (j === i ? { ...l, label: v } : l)) })} /></div>
              {lv.skills.map(k => <div key={k.id} style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: 36 }}>
                <Field value={k.text} label="Compétence" placeholder="Savoir… ou Maîtriser…" onSave={v => saveC({ ...c, levels: c.levels.map((l, j) => (j === i ? { ...l, skills: l.skills.map(x => (x.id === k.id ? { ...x, text: v } : x)) } : l)) })} />
                <button type="button" style={btn("ghost", "sm")} aria-label={"Retirer la compétence " + (k.text || "")} onClick={() => saveC({ ...c, levels: c.levels.map((l, j) => (j === i ? { ...l, skills: l.skills.filter(x => x.id !== k.id) } : l)) })}><NavIcon name="close" size={14} /></button></div>)}
              <div style={{ paddingLeft: 36 }}><button type="button" style={btn("ghost", "sm")} onClick={() => saveC({ ...c, levels: c.levels.map((l, j) => (j === i ? { ...l, skills: [...l.skills, { id: "s" + uid(), text: "" }] } : l)) })}>＋ Compétence</button></div>
            </div>)}
          </div>}
        </div>; })}
    </Card>
  </div>;
}

export default function SavSkillsPage({ me, name, admin, owner, people }) {
  const isAdmin = !!(admin || owner), email = String(me || "").toLowerCase();
  const backend = useMemo(() => (isDemo() ? memoryBackend(DEMO_SEED) : firestoreBackend()), []);
  const { adminDoc, catDoc, meDoc, selfDocs, api, ready } = useSavSkills(backend, email, isAdmin);
  const periods = useMemo(() => periodsAround(), []), cur = periods[1];
  const [horizon, setHorizon] = useState(periods[2]);
  const [view, setViewS] = useState(() => { try { const v = localStorage.getItem("enogia_skills_view"); return ["team", "person", "ref"].includes(v) ? v : "team"; } catch (e) { return "team"; } });
  const setView = v => { setViewS(v); try { localStorage.setItem("enogia_skills_view", v); } catch (e) { /* rien */ } };
  const [pid, setPid] = useState(null), [openCat, setOpenCat] = useState(null), [tableOpen, setTableOpen] = useState(false);
  const cats = useMemo(() => catsOf(catDoc), [catDoc]);
  const S = useMemo(() => (isAdmin ? stateOf(adminDoc, selfDocs) : stateOfView(meDoc && meDoc.view, meDoc && meDoc.selfeval, email)), [isAdmin, adminDoc, selfDocs, meDoc, email]);
  const nameOf = u => { const p = (people || []).find(x => x && String(x.email).toLowerCase() === String(u).toLowerCase()); return (p && (p.name || p.email)) || u; };
  // fiche visible par chaque personne reliée : recalculée et réécrite seulement si elle a changé
  const mirrors = useRef({});
  useEffect(() => { if (!isAdmin || !S) return;
    S.people.forEach(p => { if (!p.uid) return; const u = String(p.uid).toLowerCase(), m = mirrorOf(S, p, periods), k = stable(m); if (mirrors.current[u] === k) return; mirrors.current[u] = k; api.setMirror(u, m); }); }, [isAdmin, S, periods, api]);
  const canSelf = p => (isAdmin ? !p.uid : true);
  const onCycle = (p, who, sid) => {
    if (who === "mgr") { const a = S.assess[p.id] || {}; api.setAssess(p.id, { ...a, mgr: { ...(a.mgr || {}), [sid]: cycle((a.mgr || {})[sid]) } }); return; }
    if (!isAdmin) { const s = selfOf(S, p.id); api.setSelf(email, { ...s, [sid]: cycle(s[sid]) }); return; }
    const a = S.assess[p.id] || {}; api.setAssess(p.id, { ...a, self: { ...(a.self || {}), [sid]: cycle((a.self || {})[sid]) } });
  };
  const onTarget = (p, c, d) => { const t0 = { ...(S.objs[p.id + "|" + horizon] || {}) }, nv = stepTarget(t0[c.id] != null ? t0[c.id] : null, current(S, p.id, c, cur).v, d); if (nv == null) delete t0[c.id]; else t0[c.id] = nv; api.setTargets(p.id, horizon, t0); };
  const onPrefill = (p, c) => { const base = snapVal(S, p.id, cur, c.id); if (base == null) return; const a = S.assess[p.id] || {}; api.setAssess(p.id, { ...a, mgr: prefillMgr(a.mgr, c, base) }); };
  const onFreeze = async () => { if (!(await askConfirm({ title: "Figer le trimestre " + cur + " ?", message: "Les niveaux actuels de toute l'équipe sont enregistrés comme référence de progression pour " + cur + ".", confirmLabel: "Figer" }))) return;
    const sc = freezeScores(S, cats, cur); await Promise.all(S.people.map(p => api.setSnapshot(p.id, cur, sc[p.id] || {}))); notify("Trimestre " + cur + " figé pour toute l'équipe", "ok"); };
  const onStarter = () => Promise.all(STARTER.map(([n, k], i) => api.setCat("c-" + uid(), { name: n, kind: k, order: i + 1, levels: LVL_DEFAULT.map(l => ({ label: l, skills: [] })) })));
  const hzOpts = periods.slice(2);
  if (!ready) return <div style={{ padding: 20, color: T.ink500, fontSize: 14 }}>Lecture des compétences…</div>;
  if (!isAdmin && !(meDoc && meDoc.view)) return <section style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: 20 }}><h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>Suivi des compétences pas encore activé</h3><p style={{ margin: 0, fontSize: 14, color: T.ink500 }}>Votre compte n'est pas encore relié à une fiche. Le responsable SAV le relie dans Compétences › Référentiel.</p></section>;
  const v = isAdmin ? view : "person";
  const empty = !S.people.length || !cats.length;
  return <div className="sk-root" style={{ display: "flex", flexDirection: "column", gap: 14, "--sk-card": T.card, "--sk-ink": T.ink900, "--sk-acc": T.accentInk, "--sk-line": T.line }}>
    <div className="e-tb" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      {isAdmin && <Segmented label="Vue" size="md" value={view} onChange={setView} options={[["team", "Équipe"], ["person", "Fiche"], ["ref", "Référentiel"]]} />}
      <span style={{ fontSize: 13, color: T.ink500 }}>{isAdmin ? "Mise en service et après-vente" : "Mon suivi de compétences"} · trimestre en cours <b style={{ color: T.ink900, fontWeight: 600 }}>{cur}</b></span>
      <span style={{ flex: 1 }} />
      {v !== "ref" && <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13, color: T.ink700 }}>Objectif pour
        <select value={horizon} onChange={e => setHorizon(e.target.value)} className="sk-in" style={{ minHeight: 34 }}>{hzOpts.map(o => <option key={o}>{o}</option>)}</select></label>}
    </div>
    {v === "ref" ? <RefView S={S} cats={cats} api={api} people={people} nameOf={nameOf} onStarter={onStarter} />
      : empty ? <section style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: 20 }}><h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>Rien à afficher pour l'instant</h3>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: T.ink500 }}>Ajoutez les personnes et les catégories dans le référentiel.</p>{isAdmin && <button type="button" style={btn("pri", "md")} onClick={() => setView("ref")}>Ouvrir le référentiel</button>}</section>
      : v === "team" ? <TeamView S={S} cats={cats} cur={cur} horizon={horizon} periods={periods} open={tableOpen} setOpen={setTableOpen} isAdmin={isAdmin}
          onPerson={id => { setPid(id); setOpenCat(null); setView("person"); }} onCell={(id, c) => { setPid(id); setOpenCat(c); setView("person"); }} onFreeze={onFreeze} />
      : <PersonView S={S} cats={cats} cur={cur} horizon={horizon} periods={periods} pid={pid} setPid={setPid} isAdmin={isAdmin} openCat={openCat} setOpenCat={setOpenCat}
          canSelf={canSelf} onCycle={onCycle} onTarget={onTarget} onPrefill={onPrefill} />}
  </div>;
}
