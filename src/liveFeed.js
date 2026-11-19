// v418 (maquette v419-accueil-vivant.html, pistes A + C : « A + C ») : fil « En direct » de l'accueil — ce qui vient de se passer,
// rassemblé depuis les données déjà lues en temps réel : résultats de tests (stBy), commentaires, publications du planning (changeLog),
// demandes de transport (ClickUp), affectations de testeurs. Rien n'est écrit : le fil se recalcule à chaque changement.
const day = iso => String(iso || "").slice(0, 10);
const T_LABEL = { ok: "réussi", ko: "en échec", wip: "commencé" };

// événement : { id, at (ISO), kind, pj, text, by, tone: ok | bad | warn | info | neutral, url? }
export function buildFeed({ testsDoc, catalog, comments, changeLog, transports, isPrivateHidden, now = new Date(), days = 7, limit = 40 } = {}) {
  const since = new Date(now.getTime() - days * 864e5).toISOString(), out = [];
  const nameOf = (sec, id) => { const L = (catalog && catalog[sec]) || []; const x = L.find(t => t && t.id === id); return (x && (x.label || x.name)) || id; };
  // tests : chaque statut posé (réussi, échec, commencé) avec son auteur et son heure
  Object.entries((testsDoc && testsDoc.plans) || {}).forEach(([pj, p]) => {
    Object.entries((p && p.stBy) || {}).forEach(([sec, ids]) => Object.entries(ids || {}).forEach(([id, m]) => {
      const v = p.st && p.st[sec] && p.st[sec][id];
      if (!m || !m.at || m.at < since || !T_LABEL[v]) return;
      out.push({ id: "t:" + pj + ":" + sec + ":" + id, at: m.at, kind: "test", pj, by: m.by || "", tone: v === "ok" ? "ok" : v === "ko" ? "bad" : "info", text: "test « " + nameOf(sec, id) + " » " + T_LABEL[v] });
    }));
    (Array.isArray(p && p.assign) ? p.assign : []).forEach(a => { if (a && a.at && a.at >= since) out.push({ id: "a:" + pj + ":" + a.tid + ":" + a.at, at: a.at, kind: "assign", pj, by: a.by || "", tone: "neutral", text: "testeur affecté" }); });
  });
  // commentaires (pas les privés si demandé)
  Object.entries(comments || {}).forEach(([pj, L]) => (Array.isArray(L) ? L : []).forEach((c, i) => {
    if (!c || !c.date || c.date < since || (isPrivateHidden && c.private)) return;
    const t = String(c.text || "").replace(/\s+/g, " ").trim();
    out.push({ id: "c:" + pj + ":" + i + ":" + c.date, at: c.date, kind: "comment", pj, by: c.author || "", tone: "warn", text: "« " + (t.length > 90 ? t.slice(0, 89) + "…" : t) + " »" });
  }));
  // publications du planning : un événement par publication, le plus gros décalage de départ en tête
  (Array.isArray(changeLog) ? changeLog : []).forEach(e => {
    if (!e || !e.at || e.at < since) return;
    const P = (e.pjs || []).filter(p => p && p.pj), moved = P.filter(p => p.departDelta).sort((a, b) => Math.abs(b.departDelta) - Math.abs(a.departDelta));
    if (!P.length && !(e.removed || []).length) return;
    const top = moved[0], n = P.length;
    out.push({ id: "p:" + e.at, at: e.at, kind: "publish", pj: top ? top.pj : (P[0] || {}).pj || "", by: e.by || "", tone: top && top.departDelta > 0 ? "bad" : "neutral",
      text: "planning publié · " + n + " PJ modifié" + (n > 1 ? "s" : "") + (top ? " · départ " + (top.departDelta > 0 ? "+" : "") + top.departDelta + " j" + (moved.length > 1 ? " (et " + (moved.length - 1) + " autre" + (moved.length > 2 ? "s" : "") + ")" : "") : "") });
  });
  // transports : dernière mise à jour de chaque demande récente
  Object.entries((transports && transports.items) || {}).forEach(([id, x]) => {
    const at = x && (x.updatedAt || (x.updated ? x.updated + "T08:00:00.000Z" : ""));
    if (!at || at < since) return;
    const s = String(x.status || "").toLowerCase();
    const label = { "demandes": "demande de transport créée", "en consultation": "transport en consultation", "depart programme": "départ programmé", "en attente infos demandeur": "transport : infos demandées", "colis ramasse": "colis ramassé, en route", "colis livre": "colis livré", "cloture doc frn": "transport clôturé" }[s] || "transport mis à jour";
    out.push({ id: "x:" + id + ":" + at, at, kind: "transport", pj: x.pj || "", by: x.transporteur || "", url: x.url, tone: s === "en attente infos demandeur" ? "bad" : s === "colis livre" || s === "colis ramasse" ? "ok" : "info",
      text: label + (x.from || x.to ? " · " + (x.from || "?") + " → " + (x.to || "?") : "") });
  });
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit);
}

// heure lisible : « 10:42 » aujourd'hui, « hier 16:05 », sinon « 17 nov »
export function whenTxt(iso, now = new Date()) {
  const d = new Date(iso); if (isNaN(d)) return "";
  const t = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), dd = d.toLocaleDateString("sv-SE"), n0 = now.toLocaleDateString("sv-SE");
  if (dd === n0) return t;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (dd === y.toLocaleDateString("sv-SE")) return "hier " + t;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", "");
}
export const feedDay = day;
