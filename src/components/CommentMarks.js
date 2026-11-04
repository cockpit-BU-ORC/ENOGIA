// v271 (demandé : « quand on me cite, montrer que j'ai bien pris en compte le commentaire ») : pour chaque personne citée,
// « à traiter » / « vu le … » / « traité le … » — visible de tous (l'auteur voit l'accusé) ; boutons « Vu » et « Traité » pour la personne citée.
import React from "react";
import { T, FZF as FZ } from "../theme";
import { mentionsOf, markOf, lc, nameFromEmail } from "../mentions";

const dm = iso => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "");
export function CommentMarks({ c, pj, idx, me, nameOf, resolveComment }) {
  const mn = mentionsOf(c); if (!mn.length) return null;
  const nm = e => (nameOf ? nameOf(e) : nameFromEmail(e));
  const mine = !!me && mn.includes(lc(me)), seen = markOf(c, me, "seen"), done = markOf(c, me, "resolved");
  const b = (on, tone) => ({ border: "1px solid " + (on ? tone[0] : T.line), background: on ? tone[1] : T.card, color: on ? tone[2] : T.ink700, borderRadius: 999, minHeight: 26, padding: "0 10px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font });
  const G = [T.emerald500, T.emerald100, T.emerald600];
  return (<div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
    {mn.map(e => { const d = markOf(c, e, "resolved"), s = markOf(c, e, "seen");
      return <span key={e} title={d ? "Traité le " + dm(d.at) : s ? "Vu le " + dm(s.at) + ", pas encore traité" : "Pas encore vu"} style={{ fontSize: FZ.xs, fontWeight: 600, borderRadius: 999, padding: "1px 9px", background: d ? T.emerald100 : s ? T.surface : T.violet100, color: d ? T.emerald600 : s ? T.ink700 : T.violet600, border: "1px solid " + (d ? T.emerald500 : s ? T.line : T.violet500) }}>
        {d ? "✓ " : s ? "✓ " : "@ "}{nm(e)}{d ? " · traité le " + dm(d.at) : s ? " · vu le " + dm(s.at) : " · à traiter"}</span>; })}
    {mine && resolveComment && <>
      <button type="button" aria-pressed={!!seen} onClick={() => resolveComment(pj, idx, me, !seen, "seen")} title="Montrer à l'auteur que vous l'avez pris en compte" style={b(!!seen, G)}>{seen ? "✓ Vu" : "Vu"}</button>
      <button type="button" aria-pressed={!!done} onClick={() => resolveComment(pj, idx, me, !done)} style={b(!!done, G)}>{done ? "✓ Traité" : "Traité"}</button>
    </>}
  </div>);
}
