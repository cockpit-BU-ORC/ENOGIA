// v342 (audit Web Interface Guidelines, lot 6) : la page affichée, sa sous-page et la fiche d'un PJ ouverte sont dans
// l'adresse (?p=gantt, ?p=tests&s=testers, ?p=table&pj=PJ426) — le bouton Précédent du navigateur revient à la page
// d'avant et un lien copié ouvre la même page. Les autres paramètres (ecran, demo…) sont gardés tels quels.
export const URL_VIEWS = ["home", "table", "gantt", "calendar", "changes", "comments", "tests", "planner", "cashin", "turbines", "achats", "manager", "access", "sav"];

export function readUrlState(search) {
  try {
    const q = new URLSearchParams(search != null ? search : window.location.search);
    const p = q.get("p") || "";
    return { p: URL_VIEWS.includes(p) ? p : "", s: (q.get("s") || "").slice(0, 40), pj: (q.get("pj") || "").slice(0, 40) };
  } catch (e) { return { p: "", s: "", pj: "" }; }
}

// sous-page lue dans l'adresse si elle concerne cette page, sinon la valeur par défaut
export const urlSub = (view, def) => { const u = readUrlState(); return u.p === view && u.s ? u.s : def; };

// texte de la requête pour un état donné (sans « ? »), en gardant les autres paramètres
export function buildSearch(search, { p, s, pj }) {
  const q = new URLSearchParams(search || "");
  [["p", p], ["s", s], ["pj", pj]].forEach(([k, v]) => { if (v) q.set(k, v); else q.delete(k); });
  return q.toString();
}

// push = nouvelle entrée d'historique (changement fait par la personne), sinon remplacement (premier affichage)
export function writeUrlState(state, push) {
  try {
    const cur = window.location.search.replace(/^\?/, "");
    const next = buildSearch(cur, state);
    if (next === cur) return;
    const url = window.location.pathname + (next ? "?" + next : "") + window.location.hash;
    window.history[push ? "pushState" : "replaceState"](null, "", url);
  } catch (e) {}
}
