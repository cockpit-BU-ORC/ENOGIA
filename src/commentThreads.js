// v317 — page Commentaires simplifiée (maquette v316 validée : « Go, code-la ») : une ligne par machine, filtres À répondre / Mes PJ / Tous.
// Un chef de projet ne voit que ses PJ et les fils où on le cite ; « Tous » est réservé à la direction et aux admins (seeAll).
import { mentionsOf, isOpenFor, lc } from "./mentions";

// lastSeen = { PJ: iso } (dernière ouverture du fil sur ce poste) ; sans date : nouveaux = 7 derniers jours.
export function threadsOf({ comments, pjs, me, myName, myPjs, seeAll, seePrivate, lastSeen, now = Date.now() }) {
  const mine = new Set(myPjs || []), seen = lastSeen || {}, nm = lc(myName), out = [];
  const def = new Date(now - 7 * 864e5).toISOString();
  (pjs || []).forEach(pj => {
    const list = ((comments || {})[pj] || []).map((c, idx) => ({ c, idx })).filter(x => x.c && (seePrivate || !x.c.private));
    const cited = !!me && list.some(x => mentionsOf(x.c).includes(lc(me)));
    if (!seeAll && !mine.has(pj) && !cited) return;
    const since = seen[pj] || def;
    let last = null, atMe = 0, newN = 0, priv = false;
    list.forEach(({ c }) => {
      if (!last || String(c.date || "") > String(last.date || "")) last = c;
      if (isOpenFor(c, me)) atMe++;
      if (String(c.date || "") > since && lc(c.author) !== nm) newN++;
      if (c.private) priv = true;
    });
    out.push({ pj, count: list.length, last, atMe, newN, priv, mine: mine.has(pj), cited });
  });
  return out.sort((a, b) => String((b.last && b.last.date) || "").localeCompare(String((a.last && a.last.date) || "")) || a.pj.localeCompare(b.pj));
}
export function filterThreads(threads, filter) {
  if (filter === "at") return threads.filter(t => t.atMe > 0);
  if (filter === "mine") return threads.filter(t => t.mine || t.cited);
  return threads;
}
