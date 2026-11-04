import { contractDatesOf, contractPatch, livrPrevueOf, hasTransport } from "./penalties";

// v269 : dates contractuelles — échéance = T0 + semaines ; avec transport, MàD = échéance − transport ; sans transport, MàD = livraison
test("sans transport : MàD ORC = livraison = T0 + semaines", () => {
  const cd = contractDatesOf({ contratT0: "2026-01-05", contratSemaines: 40, transport: false });
  expect(cd).toMatchObject({ auto: true, deadline: "2026-10-12", mad: "2026-10-12", livr: "2026-10-12", transport: false });
});
test("avec transport : l'échéance est la livraison sur site, la MàD s'en déduit", () => {
  const cd = contractDatesOf({ contratT0: "2026-01-05", contratSemaines: 40, transport: true, transportJ: 21 });
  expect(cd).toMatchObject({ deadline: "2026-10-12", livr: "2026-10-12", mad: "2026-09-21", tj: 21 });
});
test("sans durée en semaines : les dates saisies d'avant restent", () => {
  expect(contractDatesOf({ contratTFin: "2026-10-14" })).toMatchObject({ auto: false, mad: "2026-10-14", livr: "2026-10-14" });
  expect(contractDatesOf({ contratTFin: "2026-10-14", contratLivr: "2026-11-01", transportJ: 18 })).toMatchObject({ auto: false, transport: true, livr: "2026-11-01" });
});
test("enregistrement : les dates contractuelles calculées sont écrites avec le changement", () => {
  expect(contractPatch({ contratT0: "2026-01-05", transport: true, transportJ: 21 }, { contratSemaines: 40 })).toEqual({ contratSemaines: 40, contratTFin: "2026-09-21", contratLivr: "2026-10-12" });
  expect(contractPatch({}, { contratT0: "2026-01-05" })).toEqual({ contratT0: "2026-01-05" });
});
test("livraison prévue : départ (+ transport si la case est cochée)", () => {
  expect(livrPrevueOf({ transport: false, transportJ: 21 }, "2026-11-10")).toBe("2026-11-10");
  expect(livrPrevueOf({ transport: true, transportJ: 14 }, "2026-11-10")).toBe("2026-11-24");
  expect(hasTransport({ transportJ: 10 })).toBe(true);
  expect(hasTransport({})).toBe(false);
});
