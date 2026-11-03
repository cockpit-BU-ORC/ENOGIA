// v260 (demandé : « agenda des testeurs : leurs périodes de banc dans leur calendrier, mises à jour à chaque publication ») : fichier .ics
// (Outlook, Google Agenda, Apple). Chaque période garde le même identifiant (UID = PJ + testeur) et un numéro de version croissant :
// réimporter le fichier après une publication met à jour les événements au lieu de les dupliquer. Un abonnement qui se met à jour seul
// demanderait un service en ligne (même choix que les e-mails des notifications).
const esc = s => String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = iso => String(iso).slice(0, 10).replace(/-/g, "");
const next = iso => { const d = new Date(String(iso).slice(0, 10) + "T12:00:00"); d.setDate(d.getDate() + 1); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0"); };
const stamp = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// Lignes de plus de 75 octets repliées (RFC 5545)
const fold = l => { const out = []; let s = l; while (s.length > 74) { out.push(s.slice(0, 74)); s = " " + s.slice(74); } out.push(s); return out.join("\r\n"); };
// events : [{ uid, from, to, title, details }] (dates ISO, journées entières)
export function buildIcs(events, calName, now = new Date()) {
  const seq = Math.floor(now.getTime() / 60000) % 2000000000;
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cockpit BU ORC//Tests//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + esc(calName)];
  (events || []).filter(e => e && e.from).forEach(e => {
    L.push("BEGIN:VEVENT", "UID:" + esc(e.uid) + "@cockpit-bu-orc", "SEQUENCE:" + seq, "DTSTAMP:" + stamp(now), "DTSTART;VALUE=DATE:" + ymd(e.from), "DTEND;VALUE=DATE:" + next(e.to || e.from),
      "SUMMARY:" + esc(e.title), ...(e.details ? ["DESCRIPTION:" + esc(e.details)] : []), "TRANSP:OPAQUE", "END:VEVENT");
  });
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
}
export function downloadIcs(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
