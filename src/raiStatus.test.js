import { raiGate } from "./raiStatus";
import { RAI_SIGNERS, raiItems } from "./rai";

test("v398 : feu vert du départ — à faire, non accepté, avec réserves, accepté ; alerte à 14 jours", () => {
  const signs = Object.fromEntries(RAI_SIGNERS.map(([s]) => [s, { by: "x", at: "2026-11-10" }]));
  const all = Object.fromEntries(raiItems().map(x => [x.id, { ok: "OK" }]));
  const d = { rai: { A: { rows: { "v-ce": { ok: "NOK" } }, actions: [{ id: "a1", t: "x", bloq: true, done: "" }] }, B: { rows: { "c-evap": { ok: "OK" } }, signs }, C: { rows: all, signs } } };
  expect(raiGate("Z", "2026-11-25", "TESTS", "2026-11-18", null)).toBeNull();
  expect(raiGate("Z", "2026-11-25", "TESTS", "2026-11-18", d)).toMatchObject({ k: "none", alert: true, left: 7 });
  expect(raiGate("A", "2026-12-30", "TESTS", "2026-11-18", d)).toMatchObject({ k: "no", alert: false });
  expect(raiGate("B", "2026-11-20", "TESTS", "2026-11-18", d)).toMatchObject({ k: "reserve", alert: false });
  expect(raiGate("C", "2026-11-20", "TESTS", "2026-11-18", d)).toMatchObject({ k: "ok", label: "RAI accepté" });
  expect(raiGate("Z", "2026-11-01", "SHIPPED", "2026-11-18", d)).toMatchObject({ due: false, alert: false });
});
