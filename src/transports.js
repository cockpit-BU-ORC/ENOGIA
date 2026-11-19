// v413 (demandé : « nous utilisons ClickUp pour les demandes de transport : leur avancement sur les accueils, avec un clic vers ClickUp ») :
// planning/transports = copie réduite de la liste ClickUp SCCM › Logistique, écrite toutes les 15 minutes par la fonction clickupTransports
// (functions/clickup.js). { items: { id: { name, url, pj, status, statusType, order, enlevement, livraison, transporteur, contenu, by, updated, closed } }, at, etat, message, liste }
export const CLICKUP_LIST_URL = "https://app.clickup.com/2618431/v/li/901524181433"; // v414 : SCCM › LOGISTIQUE V2
// terminé = colis livré ou clôture des documents fournisseur ; « colis ramassé » = en route
const isDone = x => x.statusType === "closed" || ["colis livre", "cloture doc frn"].includes(String(x.status || "").toLowerCase().trim());
export const pickupOf = x => x.enlReelle || x.enlPrevue || x.enlSouhaitee || x.enlevement || "";
export const deliveryOf = x => x.livReelle || x.livPrevue || x.livSouhaitee || x.livraison || "";
const base = pj => String(pj || "").toUpperCase().replace(/-\d+[A-Z]*$/, "");

// étapes de la liste ClickUp, dans l'ordre (le ton suit l'avancement, rouge = on attend le demandeur)
export const TRANSPORT_STEPS = [["demandes", "Demande reçue", "warn"], ["en consultation", "En consultation", "info"], ["depart programme", "Départ programmé", "accent"],
  ["en attente infos demandeur", "Infos demandées", "bad"], ["colis ramasse", "En route", "info"], ["cloture doc frn", "Documents clôturés", "ok"], ["colis livre", "Colis livré", "ok"]];
export const stepOf = status => { const s = String(status || "").toLowerCase().trim(), i = TRANSPORT_STEPS.findIndex(x => x[0] === s); return i < 0 ? { i: -1, label: status || "—", tone: "neutral" } : { i, label: TRANSPORT_STEPS[i][1], tone: TRANSPORT_STEPS[i][2] }; };

// v414 (maquette v414-transports-clickup.html, piste C « suivi colis » : « C, parcel tracking ») : frise en 5 points
export const TRACK = ["Demande", "Consultation", "Programmé", "En route", "Livré"];
const TRACK_OF = { "demandes": 0, "en consultation": 1, "en attente infos demandeur": 1, "depart programme": 2, "colis ramasse": 3, "cloture doc frn": 4, "colis livre": 4 };
// { k : point en cours (0–4), bad : on attend le demandeur }
export const trackOf = x => { const s = String((x && x.status) || "").toLowerCase().trim(); return { k: s in TRACK_OF ? TRACK_OF[s] : 0, bad: s === "en attente infos demandeur" }; };
// texte de date : livrée le, partie, enlèvement prévu / souhaité (« passé » si la date souhaitée est dépassée sans enlèvement)
export function whenOf(x, today) {
  const t = trackOf(x);
  if (t.k === 4) return x.livReelle ? "livré le " + x.livReelle : "livré";
  if (t.k === 3) return x.livPrevue ? "livraison prévue " + x.livPrevue : x.enlReelle ? "parti le " + x.enlReelle : "parti";
  if (x.enlPrevue) return "enlèvement prévu " + x.enlPrevue;
  if (x.enlSouhaitee) return "souhaité " + x.enlSouhaitee + (today && x.enlSouhaitee < today ? " · passé" : "");
  return "";
}
// demandes à afficher : en cours d'abord (attente du demandeur en tête, puis par date d'enlèvement), puis livrées / ramassées récemment
// scope (Set de PJ, facultatif) = accueil d'un chef de projet : seulement ses PJ
export function transportList(doc, scope) {
  const all = Object.entries((doc && doc.items) || {}).map(([id, x]) => ({ id, ...(x || {}) }))
    .filter(x => !scope || (x.pj && [...scope].some(p => base(p) === base(x.pj))));
  const open = all.filter(x => !isDone(x)).sort((a, b) => (stepOf(b.status).tone === "bad") - (stepOf(a.status).tone === "bad")
    || (!!b.urgent - !!a.urgent) || String(pickupOf(a) || "9").localeCompare(String(pickupOf(b) || "9")) || String(b.updated || "").localeCompare(String(a.updated || "")));
  const done = all.filter(x => isDone(x)).sort((a, b) => String(b.livReelle || b.closed || b.updated || "").localeCompare(String(a.livReelle || a.closed || a.updated || "")));
  return { open, done, waiting: open.filter(x => stepOf(x.status).tone === "bad").length };
}
