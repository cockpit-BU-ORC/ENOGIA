// v413 : conversion des demandes de transport ClickUp (données d'exemple inventées). Lancer : cd functions && npm test
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { buildTransports, pjOf } = require("../clickup");

const now = "2026-11-19T10:00:00.000Z", ms = d => String(Date.parse(d));
const dd = (id, name, orderindex) => ({ id: "d61d2631-638a-4b3f-bc46-1ffffafe8cf4", type: "drop_down", value: id, type_config: { options: [{ id, name, orderindex }] } });

test("n° de PJ lu dans le champ Projet, sinon dans le nom", () => {
  assert.strictEqual(pjOf("PJ446 - ULSAN"), "PJ446");
  assert.strictEqual(pjOf("JSI --> ENOGIA PJ468-4 180kWLT"), "PJ468-4");
  assert.strictEqual(pjOf("ENOGIA"), "");
});
test("demandes ouvertes gardées, livrées depuis plus de 60 jours retirées, pas de données de contact", () => {
  const tasks = [
    { id: "a", name: "ALLIA --> ENOGIA", url: "https://app.clickup.com/t/a", status: { status: "en consultation", type: "custom", orderindex: 1 }, date_updated: ms("2026-11-10"),
      creator: { username: "Demandeur Test", email: "x@exemple.com" }, custom_fields: [dd("o1", "PJ446 - ULSAN", 0), { id: "bb3d5a4e-a94d-409a-b72e-27c2da825a57", type: "date", value: ms("2026-11-25") }, { id: "a126348b-43f0-489e-be03-ee42fb3b9401", type: "email", value: "contact@exemple.com" }] },
    { id: "b", name: "Vieux colis", status: { status: "colis livre", type: "closed" }, date_closed: ms("2026-08-01") },
    { id: "c", name: "Récent PJ468", status: { status: "colis livre", type: "closed" }, date_closed: ms("2026-11-01") },
    { id: "d", name: "archivée", archived: true, status: { status: "demandes", type: "open" } },
  ];
  const T = buildTransports(tasks, now);
  assert.deepStrictEqual(Object.keys(T).sort(), ["a", "c"]);
  assert.strictEqual(T.a.pj, "PJ446"); assert.strictEqual(T.a.enlevement, "2026-11-25"); assert.strictEqual(T.a.by, "Demandeur Test");
  assert.ok(!JSON.stringify(T).includes("@"));
  assert.strictEqual(T.c.pj, "PJ468");
});
