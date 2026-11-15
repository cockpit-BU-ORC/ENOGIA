// v294 : lecture Odoo (lecture seule) — protocole « jsonrpc » (Odoo 14 à 18) ou « json2 » (API JSON-2, Odoo 19 et plus).
// La clé API n'est jamais écrite dans un message d'erreur ni dans Firestore.
"use strict";

const TIMEOUT_MS = 60000;
const CHUNK = 400;

function clean(msg, key) { let s = String(msg || "Erreur inconnue"); if (key) s = s.split(key).join("***"); return s.slice(0, 400); }

async function post(url, body, headers, key) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(headers || {}) }, body: JSON.stringify(body), signal: ctl.signal });
    const text = await res.text(); let data = null; try { data = JSON.parse(text); } catch (e) { /* réponse non JSON */ }
    if (!res.ok) throw new Error("Odoo a répondu " + res.status + " : " + clean((data && (data.message || (data.error && data.error.message))) || text.slice(0, 200), key));
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Odoo ne répond pas (plus de " + TIMEOUT_MS / 1000 + " s).");
    throw new Error(clean(e.message, key));
  } finally { clearTimeout(t); }
}

// v354 (revue de sécurité) : le domaine vient de Firestore (planning/achats.params.odoo, modifiable par l'équipe Achats) ; sans contrôle,
// la clé API partait vers n'importe quel serveur. Seuls *.odoo.com et les domaines listés dans la variable d'environnement
// ODOO_ALLOWED_HOSTS (functions/.env, ex. « erp.enogia.com ») sont acceptés ; http://localhost seulement pour les tests (ODOO_ALLOW_LOCAL=1).
const allowedHosts = () => ["odoo.com", ...String(process.env.ODOO_ALLOWED_HOSTS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean)];
function host(domaine) {
  const raw = String(domaine || "").trim();
  if (process.env.ODOO_ALLOW_LOCAL === "1" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(raw)) return raw;
  const d = raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
  if (!d || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) throw new Error("Domaine Odoo invalide (attendu : par exemple enogia.odoo.com).");
  if (!allowedHosts().some(a => d === a || d.endsWith("." + a))) throw new Error("Domaine Odoo non autorisé : " + d + " (seuls *.odoo.com et les domaines de ODOO_ALLOWED_HOSTS sont acceptés).");
  return "https://" + d;
}

// Client commun : searchRead(model, domain, fields), read(model, ids, fields), fieldNames(model)
function client({ domaine, base, login, protocole, key }) {
  const root = host(domaine);
  if (!base || !login) throw new Error("Base de données ou identifiant Odoo manquant.");
  if (protocole === "json2") {
    const call = async (model, method, body) => post(root + "/json/2/" + model + "/" + method, body, { Authorization: "bearer " + key, "X-Odoo-Database": base }, key);
    return {
      searchRead: (model, domain, fields) => call(model, "search_read", { domain, fields }),
      read: (model, ids, fields) => call(model, "read", { ids, fields }),
      fieldNames: async model => Object.keys(await call(model, "fields_get", { attributes: ["type"] }) || {}),
    };
  }
  let uid = null;
  const rpc = async (service, method, args) => {
    const r = await post(root + "/jsonrpc", { jsonrpc: "2.0", method: "call", id: Date.now(), params: { service, method, args } }, null, key);
    if (r && r.error) throw new Error("Odoo : " + clean((r.error.data && r.error.data.message) || r.error.message, key));
    return r ? r.result : null;
  };
  const exec = async (model, method, args, kwargs) => {
    if (uid == null) { uid = await rpc("common", "authenticate", [base, login, key, {}]); if (!uid) throw new Error("Connexion Odoo refusée : vérifier la base, l'identifiant et la clé API."); }
    return rpc("object", "execute_kw", [base, uid, key, model, method, args, kwargs || {}]);
  };
  return {
    searchRead: (model, domain, fields) => exec(model, "search_read", [domain], { fields }),
    read: (model, ids, fields) => exec(model, "read", [ids], { fields }),
    fieldNames: async model => Object.keys(await exec(model, "fields_get", [], { attributes: ["type"] }) || {}),
  };
}

const chunks = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
const idOf = v => (Array.isArray(v) ? v[0] : typeof v === "number" ? v : v && v.id) || null;

/**
 * Lit les commandes d'achat (y compris annulées, pour les repérer) depuis `depuis`, leurs lignes et les références articles.
 * cfg : { domaine, base, login, protocole, champProjet, depuis, key } → { orders, lines, products, champSur: "ligne" | "commande" | "" }
 */
async function readPurchases(cfg) {
  const c = client(cfg), champ = String(cfg.champProjet || "").trim();
  let champSur = "";
  if (champ) {
    if ((await c.fieldNames("purchase.order.line")).includes(champ)) champSur = "ligne";
    else if ((await c.fieldNames("purchase.order")).includes(champ)) champSur = "commande";
    else throw new Error("Champ projet « " + champ + " » introuvable sur les lignes ni sur les commandes d'achat.");
  }
  const domain = cfg.depuis ? [["date_order", ">=", cfg.depuis + " 00:00:00"]] : [];
  const orders = await c.searchRead("purchase.order", domain, ["name", "date_approve", "date_order", "state", ...(champSur === "commande" ? [champ] : [])]) || [];
  const lineFields = ["order_id", "sequence", "product_id", "name", "product_qty", "qty_received", "date_planned", ...(champSur === "ligne" ? [champ] : [])];
  const lines = [];
  for (const ids of chunks(orders.map(o => o.id), CHUNK)) lines.push(...(await c.searchRead("purchase.order.line", [["order_id", "in", ids], ["display_type", "=", false]], lineFields) || []));
  const prodIds = [...new Set(lines.map(l => idOf(l.product_id)).filter(Boolean))], products = [];
  for (const ids of chunks(prodIds, CHUNK)) products.push(...(await c.read("product.product", ids, ["default_code"]) || []));
  return { orders, lines, products, champSur };
}

module.exports = { readPurchases, client, clean, host };
