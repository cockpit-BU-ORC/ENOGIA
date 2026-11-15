// v294 : client Odoo testé contre un faux serveur local (JSON-RPC et JSON-2) — aucun appel à Odoo.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
process.env.ODOO_ALLOW_LOCAL = "1"; // v354 : faux serveur local autorisé seulement dans les tests
const { readPurchases, host } = require("../odoo");

// v354 (revue de sécurité) : la clé API ne part que vers *.odoo.com ou un domaine de ODOO_ALLOWED_HOSTS
test("v354 : domaine Odoo limité à *.odoo.com et aux domaines autorisés", () => {
  assert.strictEqual(host("enogia.odoo.com"), "https://enogia.odoo.com");
  assert.strictEqual(host("https://enogia.odoo.com/"), "https://enogia.odoo.com");
  assert.throws(() => host("attaquant.exemple"), /non autorisé/);
  assert.throws(() => host("enogia.odoo.com.attaquant.exemple"), /non autorisé/);
  assert.throws(() => host("enogia.odoo.com@attaquant.exemple"), /invalide/);
  assert.throws(() => host("enogia.odoo.com:8443"), /invalide/);
  process.env.ODOO_ALLOWED_HOSTS = "erp.enogia.com";
  assert.strictEqual(host("erp.enogia.com"), "https://erp.enogia.com");
  delete process.env.ODOO_ALLOWED_HOSTS;
  delete process.env.ODOO_ALLOW_LOCAL;
  assert.throws(() => host("http://localhost:8069"), /invalide|non autorisé/);
  process.env.ODOO_ALLOW_LOCAL = "1";
});

const ORDERS = [{ id: 1, name: "P00010", date_approve: false, date_order: "2026-10-01 09:00:00", state: "purchase" }];
const LINES = [{ id: 10, order_id: [1, "P00010"], sequence: 1, product_id: [7, "Pompe"], name: "Pompe", product_qty: 1, qty_received: 0, date_planned: "2026-11-01 00:00:00", x_projet: "PJ1" }];
const answer = (model, method, body) => {
  if (method === "fields_get") return model === "purchase.order.line" ? { x_projet: {}, name: {} } : { name: {} };
  if (model === "purchase.order") return ORDERS;
  if (model === "purchase.order.line") return LINES;
  if (model === "product.product") return [{ id: 7, default_code: "POMP-01" }];
  return [];
};
function server(handler) { return new Promise(r => { const s = http.createServer((req, res) => { let b = ""; req.on("data", c => (b += c)); req.on("end", () => { const out = handler(req, b ? JSON.parse(b) : {}); res.writeHead(out.status || 200, { "Content-Type": "application/json" }); res.end(JSON.stringify(out.body)); }); }); s.listen(0, () => r(s)); }); }

test("JSON-RPC : authentification puis lectures", async () => {
  const seen = [];
  const s = await server((req, b) => {
    const p = b.params; if (p.service === "common") return { body: { result: p.args[2] === "CLE" ? 5 : false } };
    const [, uid, key, model, method, args, kw] = p.args; seen.push([model, method, args, kw]);
    assert.strictEqual(uid, 5); assert.strictEqual(key, "CLE");
    return { body: { result: answer(model, method) } };
  });
  const r = await readPurchases({ domaine: "http://localhost:" + s.address().port, base: "b", login: "u", protocole: "jsonrpc", champProjet: "x_projet", depuis: "2026-01-01", key: "CLE" });
  s.close();
  assert.strictEqual(r.champSur, "ligne"); assert.strictEqual(r.lines.length, 1); assert.strictEqual(r.products[0].default_code, "POMP-01");
  const so = seen.find(x => x[0] === "purchase.order" && x[1] === "search_read");
  assert.deepStrictEqual(so[2], [[["date_order", ">=", "2026-01-01 00:00:00"]]]);
  const sl = seen.find(x => x[0] === "purchase.order.line" && x[1] === "search_read");
  assert.ok(sl[3].fields.includes("x_projet"));
});

test("JSON-RPC : clé refusée → message clair, sans la clé", async () => {
  const s = await server(() => ({ body: { result: false } }));
  await assert.rejects(readPurchases({ domaine: "http://localhost:" + s.address().port, base: "b", login: "u", protocole: "jsonrpc", key: "SECRET123" }), e => /refusée/.test(e.message) && !e.message.includes("SECRET123"));
  s.close();
});

test("JSON-2 : en-têtes et routes /json/2/<modèle>/<méthode>", async () => {
  const seen = [];
  const s = await server((req, b) => { seen.push([req.url, req.headers.authorization, req.headers["x-odoo-database"]]); const [, , , model, method] = req.url.split("/"); return { body: answer(model, method, b) }; });
  const r = await readPurchases({ domaine: "http://localhost:" + s.address().port, base: "prod", login: "u", protocole: "json2", champProjet: "", key: "CLE" });
  s.close();
  assert.strictEqual(r.orders.length, 1);
  assert.ok(seen.some(x => x[0] === "/json/2/purchase.order/search_read"));
  assert.ok(seen.every(x => x[1] === "bearer CLE" && x[2] === "prod"));
});

test("erreur HTTP : la clé n'apparaît pas dans le message", async () => {
  const s = await server(() => ({ status: 401, body: { message: "bad key SECRET123" } }));
  await assert.rejects(readPurchases({ domaine: "http://localhost:" + s.address().port, base: "b", login: "u", protocole: "json2", key: "SECRET123" }), e => /401/.test(e.message) && !e.message.includes("SECRET123"));
  s.close();
});
