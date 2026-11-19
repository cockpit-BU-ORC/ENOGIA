// v413 / v414 : conversion des demandes de transport ClickUp (données d'exemple inventées). Lancer : cd functions && npm test
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { buildTransports, pjOf, routeOf } = require("../clickup");

const now = "2026-11-19T10:00:00.000Z", ms = d => String(Date.parse(d));
const fld = (id, type, value, extra) => ({ id, type, value, ...(extra || {}) });

test("PJ et trajet lus dans le nom « PJ | origine > destination | N colis »", () => {
  assert.strictEqual(pjOf("PJ446 - ULSAN"), "PJ446");
  assert.strictEqual(pjOf("PJ468-4 | JSI > ENOGIA"), "PJ468-4");
  assert.strictEqual(pjOf("STOCK | TRAFOTEK > ENOGIA"), "");
  assert.deepStrictEqual(routeOf("PJ443 | ENOGIA > KAICI TECH | 3 colis"), { ref: "PJ443", from: "ENOGIA", to: "KAICI TECH" });
});
test("en cours gardées (colis ramassé compris), livrées depuis plus de 60 jours retirées, rien de sensible recopié", () => {
  const tasks = [
    { id: "a", name: "PJ446 | ALLIA > ENOGIA | 2 colis", url: "https://app.clickup.com/t/a", status: { status: "en consultation", type: "custom", orderindex: 1 }, date_updated: ms("2026-11-10"),
      custom_fields: [fld("52b15f05-e132-4266-9c59-e863f48db330", "drop_down", "u", { type_config: { options: [{ id: "u", name: "Urgent", orderindex: 1 }] } }),
        fld("44e82667-1586-4dcc-a7b4-3e8b4720197e", "date", ms("2026-11-25")), fld("9466c43a-c3fb-4940-b9a7-9b0c27219eda", "number", "2"),
        fld("84d29e8a-40ff-407b-9ac7-c4a95723eab4", "text", "contact@exemple.com 06 00 00 00 00"), fld("7b95beb0-159d-4887-8ba7-90f9a8cc3b1f", "currency", "12345"), fld("1736c758-40b1-4af5-850a-2e2111edaac4", "text", "1 rue Secrète")] },
    { id: "b", name: "Vieux colis", status: { status: "colis livre", type: "closed" }, date_closed: ms("2026-08-01") },
    { id: "c", name: "PJ468 | JSI > ENOGIA | 1 colis", status: { status: "colis ramasse", type: "done" }, date_updated: ms("2026-08-01") },
    { id: "d", name: "archivée", archived: true, status: { status: "demandes", type: "open" } },
  ];
  const T = buildTransports(tasks, now);
  assert.deepStrictEqual(Object.keys(T).sort(), ["a", "c"]);
  assert.strictEqual(T.a.pj, "PJ446"); assert.strictEqual(T.a.urgent, true); assert.strictEqual(T.a.enlSouhaitee, "2026-11-25"); assert.strictEqual(T.a.colis, 2);
  assert.strictEqual(T.a.from, "ALLIA"); assert.strictEqual(T.a.to, "ENOGIA");
  const s = JSON.stringify(T); assert.ok(!s.includes("@") && !s.includes("12345") && !s.includes("Secrète"));
});
