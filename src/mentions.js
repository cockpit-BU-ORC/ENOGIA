// v148 — Mentions (@) dans le fil de commentaires d'une fiche : on tague un manager pour qu'il suive une demande précise.
// Un commentaire garde  mentions: [email…]  et  resolved: [{ email, at }]  (la personne taguée marque « traité »).
// Logique pure, sans React ni Firestore.
export const lc = v => String(v || "").trim().toLowerCase();

// « gabriel.vincent@enogia.com » → « Gabriel Vincent »
export function nameFromEmail(email) {
  const local = String(email || "").split("@")[0];
  return local.split(/[._\-+]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") || String(email || "");
}

// Personnes que l'on peut taguer : les managers déclarés (+ soi-même si absent), sans doublon.
export function mentionOptions(managerEmails, myEmail) {
  const seen = new Set(), out = [];
  [...(managerEmails || []), myEmail].forEach(e => { const k = lc(e); if (k && !seen.has(k)) { seen.add(k); out.push({ email: k, name: nameFromEmail(k) }); } });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export const token = o => "@" + o.name;
// Personnes citées dans le texte (« @Prénom Nom »), insensible à la casse ; l'espace dans le nom peut être multiple.
export function typedMentions(text, options) {
  const t = String(text || "").toLowerCase();
  return (options || []).filter(o => {
    const k = token(o).toLowerCase(); let i = t.indexOf(k);
    while (i !== -1) { const next = t.charAt(i + k.length); if (!next || !/[\p{L}\p{N}]/u.test(next)) return true; i = t.indexOf(k, i + 1); }
    return false;
  });
}
export function toggleToken(text, o) {
  const has = typedMentions(text, [o]).length > 0;
  if (!has) return (text && !/\s$/.test(text) ? text + " " : text || "") + token(o) + " ";
  const esc = token(o).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(text).replace(new RegExp(esc + "(?![\\p{L}\\p{N}])\\s?", "giu"), "").replace(/\s{2,}/g, " ");
}

export const mentionsOf = c => (c && Array.isArray(c.mentions) ? c.mentions.map(lc) : []);
// v271 (demandé : « montrer que j'ai bien pris en compte le commentaire ») : « Vu » = seen: [{ email, at }], visible de tous, avant « traité »
export const isSeenFor = (c, email) => !!(c && Array.isArray(c.seen) && c.seen.some(x => lc(x.email) === lc(email)));
export const markOf = (c, email, field) => ((c && Array.isArray(c[field]) && c[field].find(x => lc(x.email) === lc(email))) || null);
export const isResolvedFor = (c, email) => !!(c && Array.isArray(c.resolved) && c.resolved.some(x => lc(x.email) === lc(email)));
// Demande ouverte pour cette personne : elle est citée et n'a pas marqué « traité »
export const isOpenFor = (c, email) => !!email && mentionsOf(c).includes(lc(email)) && !isResolvedFor(c, email);
export const countOpenFor = (list, email) => (list || []).filter(c => isOpenFor(c, email)).length;

// Nouvelle liste de commentaires après « traité » / « rouvrir »
export function setResolved(list, idx, email, on, nowIso, field = "resolved") {
  return (list || []).map((c, i) => {
    if (i !== idx) return c;
    const rest = (c[field] || []).filter(x => lc(x.email) !== lc(email));
    const marks = on ? [...rest, { email: lc(email), at: nowIso }] : rest;
    const next = { ...c, [field]: marks };
    if (!marks.length) delete next[field];
    // « traité » vaut aussi « vu »
    if (field === "resolved" && on && !isSeenFor(c, email)) next.seen = [...(c.seen || []), { email: lc(email), at: nowIso }];
    return next;
  });
}

// v152 — « Prévenir par e-mail » : pas de serveur d'envoi, donc on prépare un message dans la messagerie de la personne qui écrit.
// Retourne null s'il n'y a personne à prévenir (on ne se prévient pas soi-même).
export function mailtoFor(tagged, { pj, projet, author, text, url, me }) {
  const to = (tagged || []).map(o => lc(o.email)).filter(e => e && e !== lc(me));
  if (!to.length) return null;
  const subject = "[Planning ENOGIA] " + pj + " : " + (author || "un collègue") + " vous a cité";
  const body = "Bonjour,\n\n" + (author || "Un collègue") + " vous a cité sur " + pj + (projet ? " (" + projet + ")" : "") + " :\n\n« " + String(text || "").trim() + " »\n\nÀ retrouver dans le planning" + (url ? " : " + url : ".") + "\nVous pouvez la marquer « traitée » depuis la cloche du site.\n";
  return "mailto:" + to.map(encodeURIComponent).join(",") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}

// Demandes ouvertes pour une personne, tous PJ confondus (cloche d'en-tête) : [{ pj, idx, c }], plus récentes d'abord.
export function openMentionsFor(commentsByPj, email) {
  const out = [];
  Object.entries(commentsByPj || {}).forEach(([pj, list]) => (list || []).forEach((c, idx) => { if (isOpenFor(c, email)) out.push({ pj, idx, c }); }));
  return out.sort((a, b) => new Date(b.c.date) - new Date(a.c.date));
}

// v153 — Personnes que l'on peut taguer : tous les comptes qui se sont déjà connectés au site (registre « knownUsers »)
// + les managers déclarés + soi-même. Le nom affiché est celui du compte Google, à défaut tiré de l'adresse.
export const userKey = email => lc(email).replace(/[.#$[\]/]/g, "_");
// v238 : profiles = planning/profiles (personnes ajoutées à la main, taguables avant leur première connexion ; les retirées sont exclues).
export function peopleOptions(known, managerEmails, myEmail, myName, profiles) {
  const byEmail = new Map();
  const add = (email, name) => { const k = lc(email); if (!k) return; const prev = byEmail.get(k); if (!prev || (!prev.named && name)) byEmail.set(k, { email: k, name: String(name || "").trim() || nameFromEmail(k), named: !!String(name || "").trim() }); };
  (known || []).forEach(u => u && add(u.email, u.name));
  (managerEmails || []).forEach(e => add(e, ""));
  add(myEmail, myName);
  const by = (profiles && profiles.byEmail) || {};
  Object.values(by).forEach(p => { if (p && p.email && !p.removed) add(p.email, p.name); });
  Object.values(by).forEach(p => { if (p && p.email && p.removed && lc(p.email) !== lc(myEmail)) byEmail.delete(lc(p.email)); });
  return [...byEmail.values()].map(({ email, name }) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name));
}

// Saisie « à la Gmail » : si le curseur suit un « @ » (en début de mot) et un début de PRÉNOM, retourne { start, query } ; sinon null.
// Dès qu'on tape un espace, la recherche s'arrête (on cherche uniquement sur le prénom).
export function mentionQueryAt(text, caret) {
  const before = String(text || "").slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before.charAt(at - 1))) return null;
  const query = before.slice(at + 1);
  if (/\s/.test(query) || query.length > 20) return null;
  return { start: at, query };
}
const fold = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// Position du prénom dans le nom affiché : « Gabriel VINCENT » → [0, 7] ; « Bourges, Guillaume » → [9, 18].
export function firstNameSpan(name) {
  const n = String(name || ""); const ci = n.indexOf(",");
  let start = 0; if (ci >= 0) { start = ci + 1; while (n.charAt(start) === " ") start++; }
  const m = n.slice(start).match(/^[^\s,]+/);
  return m ? [start, start + m[0].length] : [0, 0];
}
export function firstNameOf(o) { const [a, b] = firstNameSpan(o.name); return String(o.name || "").slice(a, b) || nameFromEmail(o.email).split(" ")[0]; }
// Suggestions : le PRÉNOM commence par la saisie (accents et casse ignorés), triées par nom ; 20 au maximum (liste défilante).
export function suggestMentions(options, query, already) {
  const q = fold(query);
  const taken = new Set((already || []).map(o => o.email));
  return (options || []).filter(o => !taken.has(o.email) && fold(firstNameOf(o)).startsWith(q)).sort((a, b) => fold(firstNameOf(a)).localeCompare(fold(firstNameOf(b))) || a.name.localeCompare(b.name)).slice(0, 20);
}
// Remplace « @saisie » par « @Nom  » au curseur ; retourne { text, caret }.
export function insertMention(text, caret, q, option) {
  const ins = token(option) + " ";
  const next = text.slice(0, q.start) + ins + text.slice(caret);
  return { text: next, caret: q.start + ins.length };
}

// v154 — Le chef de projet est prévenu automatiquement de tout commentaire sur son projet.
// On relie le nom du chef (« Clément MARTOUZET ») à un compte connecté (nom du compte Google ou adresse prénom.nom@…),
// sans tenir compte des accents, de la casse ni de l'ordre prénom / nom.
const nameTokens = v => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
export function chefAccount(chefName, people) {
  const want = nameTokens(chefName);
  if (!want.length) return null;
  const same = a => a.length === want.length && want.every(t => a.includes(t));
  return (people || []).find(p => same(nameTokens(p.name)) || same(nameTokens(String(p.email || "").split("@")[0]))) || null;
}
// Ajoute le chef de projet aux personnes citées (sauf l'auteur lui-même), sans doublon.
export function withChef(mentions, chef, myEmail) {
  const list = (mentions || []).map(lc);
  if (chef && chef.email && lc(chef.email) !== lc(myEmail) && !list.includes(lc(chef.email))) list.push(lc(chef.email));
  return list;
}
