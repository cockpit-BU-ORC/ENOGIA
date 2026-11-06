import React, { useState } from "react";
import { T, FZ, stripeBg } from "../theme";
import { ChangesTable } from "./ChangesTable";

// ── Onglet « Modifications » : synthèse de ce qui a bougé entre l'ancienne et la nouvelle version du planning ──
// Chaque publication du Planificateur est enregistrée avec son écart (src/changeLog.js) ; v231 : plus d'import de fichier.
// v255 (maquette A « Journal et détail » du canevas Claude Design, choisie par Gabriel) : le journal des publications à gauche
// (une ligne par publication, la plus récente en haut), le détail à droite avec une phrase qui résume, puis le tableau habituel.
const fmtAt = at => new Date(at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const fmtDay = at => new Date(at).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) + " · " + new Date(at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const srcLabel = e => e.source === "publication" ? "Publication" : e.source === "restauration" ? "Restauration" : "Mise à jour";
const plural = (n, a, b) => n + " " + (n > 1 ? b : a);

// Phrase de synthèse : nombre de PJ, départs, puis les plus grands écarts (signés)
function sentenceOf(e) {
  const st = e.stats || {}, pjs = e.pjs || [];
  const head = plural(st.nPj || 0, "PJ modifié", "PJ modifiés") + " · " + (st.late ? plural(st.late, "départ repoussé", "départs repoussés") + " (jusqu'à +" + st.maxLate + " j)" : st.early ? plural(st.early, "départ avancé", "départs avancés") + " (jusqu'à −" + st.maxEarly + " j)" : "aucun départ ne bouge");
  const big = pjs.filter(p => !p.isNew).map(p => { let best = 0; Object.values(p.d || {}).forEach(x => { if (x && x.delta != null && Math.abs(x.delta) > Math.abs(best)) best = x.delta; }); return { pj: p.pj, best }; })
    .filter(x => x.best).sort((a, b) => Math.abs(b.best) - Math.abs(a.best)).slice(0, 4);
  const added = pjs.filter(p => p.isNew).map(p => p.pj), removed = (e.removed || []).map(p => p.pj);
  const parts = [];
  if (big.length) parts.push("Plus grands écarts : " + big.map(x => x.pj + " " + (x.best > 0 ? "+" : "−") + Math.abs(x.best) + " j").join(", ") + ".");
  if (added.length) parts.push("Ajouté" + (added.length > 1 ? "s" : "") + " : " + added.join(", ") + ".");
  if (removed.length) parts.push("Retiré" + (removed.length > 1 ? "s" : "") + " : " + removed.join(", ") + ".");
  if (st.nHours) parts.push(plural(st.nHours, "PJ a ses heures modifiées", "PJ ont leurs heures modifiées") + ".");
  return { head, sub: parts.join(" ") };
}

export function ChangesView({ entries, onOpenPj }) {
  const [id, setId] = useState(null); const [q, setQ] = useState("");
  const card = { background: stripeBg(T.teal500, T.card, 4), border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" };
  const title = <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
    <span style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.accentInk }}>Journal des publications</span>
    <span style={{ fontSize: FZ.sm, color: T.ink500 }}>Ce qui a bougé entre l'ancienne version et la nouvelle, à chaque publication du Planificateur</span>
  </div>;
  if (entries === null) return <div>{title}<div aria-label="Chargement" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>{[100, 92, 96, 70].map((w, k) => <div key={k} className="enogia-skeleton" style={{ height: 38, width: w + "%" }} />)}</div></div>;
  if (!entries.length) return (<div>{title}<div style={{ ...card, padding: "24px 28px", maxWidth: 720, color: T.ink700, fontSize: FZ.sm, lineHeight: 1.65 }}>
    Aucune modification enregistrée pour l'instant. <b>Dès la prochaine publication du Planificateur</b>, l'écart avec la version précédente apparaîtra ici : PJ qui ont bougé, départs en retard ou avancés, étapes décalées, heures modifiées, PJ ajoutés ou retirés.
  </div></div>);
  const cur = entries.find(e => e.at === id) || entries[0]; const idx = entries.indexOf(cur);
  const prev = cur.prevLabel ? "version du " + cur.prevLabel : "version précédente";
  const nowL = (cur.label || fmtAt(cur.at));
  const refLabel = srcLabel(cur) + " du " + fmtAt(cur.at) + " : nouvelle version " + nowL + " comparée à la " + prev + (cur.note ? " — " + cur.note : "");
  const s = sentenceOf(cur);
  return (<div>
    {title}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
      <nav aria-label="Publications" style={{ flex: "1 1 260px", maxWidth: 320, background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "6px 0", position: "sticky", top: 8 }}>
        {entries.map((e, i) => { const on = e === cur, n = e.stats ? e.stats.nPj : 0; return (
          <button key={e.at} type="button" onClick={() => setId(e.at)} aria-current={on ? "true" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", padding: "8px 14px", cursor: "pointer", fontFamily: T.font, color: T.ink900, textAlign: "left", background: on ? T.surfaceAlt : "transparent", boxShadow: on ? "inset 3px 0 0 " + T.ember500 : "none", minHeight: 44 }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", flex: "none", background: on ? T.ember500 : i < 3 ? T.ember100 : T.line, boxShadow: on || i < 3 ? "none" : "inset 0 0 0 1px " + T.ink300 }} />
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <b style={{ fontSize: FZ.sm }}>{fmtDay(e.at)}</b>
              <span style={{ fontSize: FZ.xs, color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{srcLabel(e)}{e.by ? " · " + e.by : ""}</span>
            </span>
            <span style={{ marginLeft: "auto", fontSize: FZ.xs, fontWeight: 700, color: T.ink700, whiteSpace: "nowrap" }}>{n} PJ</span>
          </button>); })}
        {idx === entries.length - 1 && <div style={{ fontSize: FZ.xs, color: T.ink500, padding: "6px 14px" }}>Plus ancienne comparaison conservée (20 dernières versions).</div>}
      </nav>
      <section aria-label="Détail de la publication" style={{ flex: "999 1 620px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: FZ.xs, color: T.ink500, fontFamily: T.fontLabel }}>{srcLabel(cur)} du {fmtAt(cur.at)}{cur.by ? " · " + cur.by : ""} — nouvelle version {nowL}, comparée à la {prev}{cur.note ? " — " + cur.note : ""}</div>
          <h2 style={{ margin: "4px 0 0", fontFamily: T.fontDisplay, fontSize: FZ.lg, fontWeight: 700, color: T.ink900 }}>{s.head}</h2>
          {s.sub && <p style={{ margin: "4px 0 0", fontSize: FZ.sm, color: T.ink700 }}>{s.sub}</p>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ…" aria-label="Rechercher un PJ" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, width: 200 }} />
        </div>
        <div style={card}>
          <ChangesTable bare summary={{ pjs: cur.pjs || [], stats: cur.stats }} removed={cur.removed || []}
            refs={null} refId={cur.at} setRefId={setId} refLabel={refLabel} q={q} onOpenPj={onOpenPj} />
        </div>
      </section>
    </div>
  </div>);
}
