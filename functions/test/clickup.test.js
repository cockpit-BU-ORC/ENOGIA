// v413 / v414 : conversion des demandes de transport ClickUp (données d'exemple inventées). Lancer : cd functions && npm test
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { buildTransports, pjOf, routeOf, toItem } = require("../clickup");

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

test("v416 : mode de transport (champ, sinon texte), infos d'envoi, code UN court, rien de sensible", () => {
  const { toItem, modeOf } = require("../clickup");
  assert.deepStrictEqual(modeOf({ name: "473 | DRI > BUSAN", text_content: "Expédition maritime sur flat rack 40'" }), { mode: "boat", modeEst: true });
  assert.strictEqual(modeOf({ name: "x", custom_fields: [{ id: "c", name: "Commentaire", type: "text", value: "on fait une expédition avion" }].map(f => ({ ...f, id: "5c4f529d-3ec7-4ae4-96d8-8156a696de32" })) }).mode, "plane");
  assert.deepStrictEqual(modeOf({ name: "PJ1 | A > B", custom_fields: [{ id: "m", name: "Mode de transport", type: "drop_down", value: "r", type_config: { options: [{ id: "r", name: "Maritime" }] } }] }), { mode: "boat", modeEst: false });
  assert.strictEqual(modeOf({ name: "PJ426 | ALLSLOGISTIQUE > JSI | 3 colis" }).mode, "truck");
  const it = toItem({ id: "z", name: "473 | DRI > BUSAN Corée | 2 colis", status: { status: "en consultation", type: "custom" }, text_content: "Expédition maritime",
    custom_fields: [
      { id: "05dea813-b510-4d98-9960-2face8dd3898", type: "drop_down", value: "o", type_config: { options: [{ id: "o", name: "OUI" }] } },
      { id: "d6ca9e9b-9f1d-4774-92b2-897d0d0efec8", type: "drop_down", value: "i", type_config: { options: [{ id: "i", name: "DDP (nous consulter)" }] } },
      { id: "e6ed684c-afc8-4aa3-a6a8-39e3f2e878eb", type: "number", value: "5400" },
      { id: "69e5ea09-800f-4d7e-931b-b017641faa47", type: "drop_down", value: "d", type_config: { options: [{ id: "d", name: "OUI" }] } },
      { id: "870048f1-71b8-4883-92fe-c28cc59f3cda", type: "labels", value: [{ id: "u", label: "UN3536 - Batterie au litihum installée dans un engin de transport" }] }] });
  assert.strictEqual(it.mode, "boat"); assert.strictEqual(it.horsUE, true); assert.strictEqual(it.incoterm, "DDP"); assert.strictEqual(it.poids, 5400);
  assert.strictEqual(it.dangereux, true); assert.deepStrictEqual(it.un, ["UN3536 batterie lithium"]);
  assert.ok(!JSON.stringify(it).includes("Expédition"));
});

test("v418 : date de clôture et heure exacte de mise à jour lues", () => {
  const it = toItem({ id: "z", name: "PJ500 | ENOGIA > Client", status: { status: "colis livre", type: "closed" }, date_closed: ms("2026-11-10"), date_updated: ms("2026-11-10T09:30:00Z") });
  assert.strictEqual(it.closed, "2026-11-10");
  assert.strictEqual(it.updatedAt, "2026-11-10T09:30:00.000Z");
});
