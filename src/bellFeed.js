// v365 (maquette maquettes-design/v364-cloche.html, piste B « fil par jour, actions au survol » choisie) : contenu du pop-up de la cloche.
// Chaque ligne (mention, affectation aux tests, projet modifié, vidéo) peut être marquée :
//   · « Vu »       → la ligne reste, grisée, et ne compte plus dans la pastille ;
//   · « Traité »   → la ligne sort du fil (section « Traités », gardée 30 jours) ;
//   · « Plus tard »→ la ligne disparaît jusqu'au lendemain 8 h, puis revient.
// Une mention garde ses marques sur le commentaire (seen / resolved, visibles de tous, comme en V271) ; une réaction de la personne citée
// vaut « Traité » (règle V319). « Plus tard » et les marques des autres lignes sont propres au poste : localStorage enogia_bell_<adresse>
// = { [clé]: { s: "seen" | "done" | "later", at, until? } }.
import { mentionsOf, isSeenFor, isResolvedFor, reactedBy } from "./mentions";

const lc = s => String(s || "").trim().toLowerCase();
const KEEP_DONE_MS = 30 * 86400000;

// lendemain à 8 h (heure locale)
export function laterUntil(now = new Date()) { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString(); }

export function dayLabel(at, now = new Date()) {
  const d = new Date(at); if (isNaN(d)) return "Plus ancien";
  const a = new Date(now); a.setHours(0, 0, 0, 0); const b = new Date(d); b.setHours(0, 0, 0, 0);
  const n = Math.round((a - b) / 86400000);
  if (n <= 0) return "Aujourd'hui"; if (n === 1) return "Hier"; if (n < 7) return "Cette semaine";
  return "Plus ancien";
}

// état d'une ligne : "new" | "seen" | "later" | "done"
function stateOf(local, key, now) {
  const x = local && local[key]; if (!x) return null;
  if (x.s === "later") return x.until && new Date(x.until) > now ? "later" : null;
  return x.s === "seen" || x.s === "done" ? x.s : null;
}

export function buildFeed({ comments, me, canSeePrivate, assignments, pjChanges, video, local = {}, now = new Date() }) {
  const items = [], email = lc(me);
  if (email) Object.entries(comments || {}).forEach(([pj, list]) => (list || []).forEach((c, idx) => {
    if (!c || !mentionsOf(c).includes(email) || (c.private && !canSeePrivate)) return;
    const key = "m:" + pj + ":" + idx + ":" + (c.date || "");
    const done = isResolvedFor(c, email) || reactedBy(c, email);
    const lat = stateOf(local, key, now) === "later";
    const s = done ? "done" : lat ? "later" : isSeenFor(c, email) ? "seen" : "new";
    const doneAt = done ? (((c.resolved || []).find(x => lc(x.email) === email) || {}).at || c.date) : null;
    items.push({ key, kind: "mention", pj, idx, c, at: c.date, doneAt, s });
  }));
  (assignments || []).forEach(a => { const key = "a:" + a.pj + ":" + (a.at || ""); items.push({ key, kind: "assign", pj: a.pj, a, at: a.at, s: stateOf(local, key, now) || "new" }); });
  (pjChanges || []).forEach(c => { const key = "c:" + c.pj + ":" + (c.at || ""); items.push({ key, kind: "change", pj: c.pj, ch: c, at: c.at, s: stateOf(local, key, now) || "new" }); });
  if (video) { const key = "v:" + (video.id || video.url || "video"); items.push({ key, kind: "video", video, at: video.at || now.toISOString(), s: stateOf(local, key, now) || "new" }); }
  items.forEach(x => { if (x.s === "done" && x.kind !== "mention") x.doneAt = (local[x.key] && local[x.key].at) || x.at; });
  const byDate = (p, q) => new Date(q.at || 0) - new Date(p.at || 0);
  const feed = items.filter(x => x.s === "new" || x.s === "seen").sort(byDate);
  const later = items.filter(x => x.s === "later").sort(byDate);
  const done = items.filter(x => x.s === "done" && (!x.doneAt || now - new Date(x.doneAt) < KEEP_DONE_MS)).sort(byDate);
  // pastille rouge : ce qui attend une action (mentions, affectations) et n'a été ni vu, ni reporté, ni traité ; le reste est de l'information
  const red = feed.filter(x => x.s === "new" && (x.kind === "mention" || x.kind === "assign")).length;
  const info = feed.filter(x => x.s === "new" && (x.kind === "change")).length;
  return { feed, later, done, red, info };
}

// nouvelles marques locales (sans toucher aux autres) ; s = null efface la marque
export function markLocal(local, key, s, now = new Date()) {
  const n = { ...(local || {}) };
  if (!s) delete n[key]; else n[key] = s === "later" ? { s, at: now.toISOString(), until: laterUntil(now) } : { s, at: now.toISOString() };
  // ménage : marques de plus de 60 jours, reports échus
  Object.keys(n).forEach(k => { const x = n[k]; if (!x || (x.s === "later" && x.until && new Date(x.until) <= now) || (x.at && now - new Date(x.at) > 60 * 86400000)) delete n[k]; });
  return n;
}
