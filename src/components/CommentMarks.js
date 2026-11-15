// v271 : marques des personnes citées. v319 (demandé : « enlever Vu et Traité, laisser uniquement les émojis ») :
// plus de boutons ; seules restent les personnes qui n'ont pas encore réagi (« @ Nom · attend »). Une réaction ferme la demande.
import React from "react";
import { T, FZF as FZ } from "../theme";
import { mentionsOf, isOpenFor, nameFromEmail } from "../mentions";

export function CommentMarks({ c, nameOf }) {
  const open = mentionsOf(c).filter(e => isOpenFor(c, e)); if (!open.length) return null;
  const nm = e => (nameOf ? nameOf(e) : null) || nameFromEmail(e);
  return (<div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
    {open.map(e => <span key={e} title="Cité, n'a pas encore réagi" style={{ fontSize: FZ.xs, fontWeight: 500, borderRadius: 999, padding: "1px 9px", background: T.violet100, color: T.violet600, border: "1px solid " + T.violet500 }}>{"@ " + nm(e)}</span>)}
  </div>);
}
