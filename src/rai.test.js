import { RAI_SECTIONS, RAI_SIGNERS, raiItems, raiSection, raiVerdict, compSn, setRow, addAction, setAction, sign, raiHtml } from "./rai";

test("v394 : modèle du RAI repris du fichier Excel (4 sections cochées, 6 signataires, identifiants uniques)", () => {
  expect(RAI_SECTIONS.map(s => s.id)).toEqual(["comps", "docs", "qual", "visu"]);
  expect(RAI_SIGNERS.length).toBe(6);
  const ids = raiItems().map(x => x.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(raiItems().length).toBe(21 + 9 + 9 + 26);
});

test("v394 : verdict — non acceptée (bloquant, signatures), avec réserves, acceptée", () => {
  let R = {};
  expect(raiVerdict(R)).toMatchObject({ k: "no", signed: 0 });
  RAI_SIGNERS.forEach(([s]) => { R = sign(R, s, "Quelqu'un"); });
  expect(raiVerdict(R).k).toBe("reserve"); // contrôles pas faits
  raiItems().forEach(x => { R = setRow(R, x.id, { ok: "OK" }, "Quelqu'un"); });
  expect(raiVerdict(R).k).toBe("ok");
  R = addAction(R, "Flexible mal positionné", true, "PROD", "Quelqu'un");
  expect(raiVerdict(R)).toMatchObject({ k: "no", blocking: 1 });
  R = setAction(R, R.actions[0].id, { done: "2026-12-11" });
  expect(raiVerdict(R).k).toBe("ok");
  R = setRow(R, "v-ce", { ok: "NOK", c: "plaque absente" }, "Quelqu'un");
  expect(raiVerdict(R)).toMatchObject({ k: "reserve", nok: 1 });
  expect(raiSection(R, RAI_SECTIONS[3])).toMatchObject({ nok: 1 });
});

test("v394 : S/N d'un composant — passeport d'abord, sinon saisi dans le RAI", () => {
  const ev = raiItems().find(x => x.id === "c-evap"), turb = raiItems().find(x => x.id === "c-turb");
  const pass = { real: { evaporateur: { v: "EV-1", src: "PO 12" } } };
  expect(compSn({}, pass, ev)).toMatchObject({ v: "EV-1", from: "passport" });
  const R = setRow({}, "c-turb", { sn: "T-0141" }, "Quelqu'un");
  expect(compSn(R, pass, turb)).toMatchObject({ v: "T-0141", from: "rai" });
  expect(setRow(R, "c-turb", { sn: "" }, "Quelqu'un").rows["c-turb"]).toBeUndefined();
});

test("v394 : PDF du RAI — toute valeur saisie est échappée", () => {
  let R = setRow({}, "v-ce", { ok: "NOK", c: "<img src=x onerror=alert(1)>" }, "x");
  R = addAction(R, "<script>alert(1)</script>", true, "PROD", "x");
  const h = raiHtml({ R, pass: {}, info: { ref: "PJ900-741-RA001-A", pj: "PJ900", client: "<b>c</b>" } });
  expect(h).not.toMatch(/<img src=x/);
  expect(h).not.toMatch(/<script>alert/);
  expect(h).toMatch(/&lt;b&gt;c&lt;\/b&gt;/);
});
