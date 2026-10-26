import React, { useState } from "react";
import { T, FZ, stripeBg } from "../theme";
import { ChangesTable } from "./ChangesTable";
import { CompareFiles } from "./CompareFiles";

// ── Onglet « Modifications » : synthèse de ce qui a bougé entre l'ancienne et la nouvelle version du planning ──
// Chaque import MS Project (ou publication depuis Planification) est enregistré avec son écart (src/changeLog.js).
const fmtAt = at => new Date(at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const srcLabel = e => e.source === "publication" ? "Publication" : e.source === "restauration" ? "Restauration" : "Import";
const entryLabel = e => srcLabel(e) + " du " + fmtAt(e.at) + (e.by ? " · " + e.by : "") + " — " + (e.stats ? e.stats.nPj : 0) + " PJ modifié" + ((e.stats ? e.stats.nPj : 0) > 1 ? "s" : "");

export function ChangesView({ entries, onOpenPj }) {
  const [id, setId] = useState(null); const [q, setQ] = useState("");
  const card = { background: stripeBg(T.teal500, T.card, 4), border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" };
  const title = <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
    <span style={{ fontFamily: T.fontMono, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.accentInk }}>Journal des imports</span>
    <span style={{ fontSize: FZ.sm, color: T.ink500 }}>Ce qui a bougé entre l'ancienne version et la nouvelle, à chaque import</span>
  </div>;
  if (entries === null) return <div>{title}<div aria-label="Chargement" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>{[100, 92, 96, 70].map((w, k) => <div key={k} className="enogia-skeleton" style={{ height: 38, width: w + "%" }} />)}</div></div>;
  if (!entries.length) return (<div>{title}<CompareFiles onOpenPj={onOpenPj} /><div style={{ ...card, padding: "24px 28px", maxWidth: 720, color: T.ink700, fontSize: FZ.sm, lineHeight: 1.65 }}>
    Aucune comparaison enregistrée pour l'instant (le journal ne remonte pas avant la mise en ligne de cet onglet) : pour voir l'écart une première fois, utilisez le petit bouton « Comparer 2 plannings » ci-dessus avec deux exports MS Project. <b>Dès le prochain import d'un planning MS Project</b> (bouton « Importer un planning » en haut), l'écart avec la version précédente apparaîtra ici : PJ qui ont bougé, départs en retard ou avancés, étapes décalées, heures modifiées, PJ ajoutés ou retirés.
  </div></div>);
  const cur = entries.find(e => e.at === id) || entries[0]; const idx = entries.indexOf(cur);
  const prev = cur.prevLabel ? "version du " + cur.prevLabel : "version précédente";
  const nowL = (cur.label || fmtAt(cur.at));
  const refLabel = srcLabel(cur) + " du " + fmtAt(cur.at) + " : nouvelle version " + nowL + " comparée à la " + prev + (cur.note ? " — " + cur.note : "");
  return (<div>
    {title}
    <CompareFiles onOpenPj={onOpenPj} />
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      <span style={{ fontSize: FZ.sm, color: T.ink700 }}>Nouvelle version <b>{nowL}</b> ← <span style={{ color: T.ink500 }}>{prev}</span></span>
      <span style={{ flex: 1 }} />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ…" aria-label="Rechercher un PJ" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, width: 170 }} />
    </div>
    <div style={card}>
      <ChangesTable summary={{ pjs: cur.pjs || [], stats: cur.stats }} removed={cur.removed || []}
        refs={entries.map(e => ({ id: e.at, label: entryLabel(e) }))} refId={cur.at} setRefId={setId} refLabel={refLabel} q={q} onOpenPj={onOpenPj} />
    </div>
    {idx === entries.length - 1 && <div style={{ fontSize: FZ.xs, color: T.ink500, marginTop: 8 }}>C'est la plus ancienne comparaison conservée (les 20 dernières versions sont gardées).</div>}
  </div>);
}
