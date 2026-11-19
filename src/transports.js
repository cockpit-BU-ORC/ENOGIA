// v413 (demandé : « nous utilisons ClickUp pour les demandes de transport : leur avancement sur les accueils, avec un clic vers ClickUp ») :
// planning/transports = copie réduite de la liste ClickUp SCCM › Logistique, écrite toutes les 15 minutes par la fonction clickupTransports
// (functions/clickup.js). { items: { id: { name, url, pj, status, statusType, order, enlevement, livraison, transporteur, contenu, by, updated, closed } }, at, etat, message, liste }
export const CLICKUP_LIST_URL = "https://app.clickup.com/2618431/v/l/li/38157935";
const DONE = t => t === "closed" || t === "done";
const base = pj => String(pj || "").toUpperCase().replace(/-\d+[A-Z]*$/, "");

// étapes de la liste ClickUp, dans l'ordre (le ton suit l'avancement, rouge = on attend le demandeur)
export const TRANSPORT_STEPS = [["demandes", "Demande reçue", "warn"], ["en consultation", "En consultation", "info"], ["depart programme", "Départ programmé", "accent"],
  ["en attente infos demandeur", "Infos demandées", "bad"], ["colis ramasse", "Colis ramassé", "ok"], ["colis livre", "Colis livré", "ok"]];
export const stepOf = status => { const s = String(status || "").toLowerCase().trim(), i = TRANSPORT_STEPS.findIndex(x => x[0] === s); return i < 0 ? { i: -1, label: status || "—", tone: "neutral" } : { i, label: TRANSPORT_STEPS[i][1], tone: TRANSPORT_STEPS[i][2] }; };

// demandes à afficher : en cours d'abord (attente du demandeur en tête, puis par date d'enlèvement), puis livrées / ramassées récemment
// scope (Set de PJ, facultatif) = accueil d'un chef de projet : seulement ses PJ
export function transportList(doc, scope) {
  const all = Object.entries((doc && doc.items) || {}).map(([id, x]) => ({ id, ...(x || {}) }))
    .filter(x => !scope || (x.pj && [...scope].some(p => base(p) === base(x.pj))));
  const open = all.filter(x => !DONE(x.statusType)).sort((a, b) => (stepOf(b.status).tone === "bad") - (stepOf(a.status).tone === "bad")
    || String(a.enlevement || "9").localeCompare(String(b.enlevement || "9")) || String(b.updated || "").localeCompare(String(a.updated || "")));
  const done = all.filter(x => DONE(x.statusType)).sort((a, b) => String(b.closed || b.updated || "").localeCompare(String(a.closed || a.updated || "")));
  return { open, done, waiting: open.filter(x => stepOf(x.status).tone === "bad").length };
}
