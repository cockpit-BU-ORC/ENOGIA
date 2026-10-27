// v188 — Lien « Nouvel événement » de Google Agenda, prérempli (aucune clé d'API : l'agenda s'ouvre dans le compte Google de la
// personne, qui n'a plus qu'à cliquer « Enregistrer » ; Google envoie alors l'invitation aux invités).
// Événement sur la journée entière : dates au format AAAAMMJJ, fin exclue (lendemain du dernier jour).
const ymd = iso => String(iso || "").slice(0, 10).replace(/-/g, "");
const nextDay = iso => { const d = new Date(String(iso).slice(0, 10) + "T12:00:00"); d.setDate(d.getDate() + 1); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0"); };
export function gcalUrl({ title, from, to, details, location, guests }) {
  const p = new URLSearchParams({ action: "TEMPLATE", text: title || "" });
  if (from) p.set("dates", ymd(from) + "/" + nextDay(to || from));
  if (details) p.set("details", details);
  if (location) p.set("location", location);
  const g = (guests || []).filter(Boolean);
  if (g.length) p.set("add", g.join(","));
  return "https://calendar.google.com/calendar/render?" + p.toString();
}
