import { freqStatus, speedProgress, vibSpeeds, speedRange } from "./testFiche";

describe("vitesses de turbine (v362)", () => {
  test("statut d'une case : bornes comprises", () => {
    const r = { min: "480", max: "520" };
    expect(freqStatus("480", r)).toBe("in");
    expect(freqStatus("520", r)).toBe("in");
    expect(freqStatus("500,5", r)).toBe("in");
    expect(freqStatus("479,9", r)).toBe("out");
    expect(freqStatus("521", r)).toBe("out");
  });
  test("vide ou sans plage", () => {
    expect(freqStatus("", { min: "1", max: "2" })).toBe("empty");
    expect(freqStatus("  ", { min: "1", max: "2" })).toBe("empty");
    expect(freqStatus("abc", { min: "1", max: "2" })).toBe("empty");
    expect(freqStatus("500", { min: "", max: "" })).toBe("norange");
    expect(freqStatus("500", undefined)).toBe("norange");
  });
  test("une seule borne réglée", () => {
    expect(freqStatus("500", { min: "450" })).toBe("in");
    expect(freqStatus("400", { min: "450" })).toBe("out");
    expect(freqStatus("600", { max: "550 Hz" })).toBe("out");
  });
  test("avancement : cases saisies et hors plage", () => {
    const model = { rows: [{ id: "ta", label: "Turbine A" }, { id: "tb", label: "Turbine B" }], speeds: [{ id: "s1", label: "3 000 tr/min" }, { id: "s2", label: "6 000 tr/min" }],
      ranges: { ta: { s1: { min: "50", max: "55" } } } };
    expect(vibSpeeds(model).map(s => s.id)).toEqual(["s1", "s2"]);
    expect(speedRange(model, "tb", "s1")).toEqual({ min: "", max: "" });
    expect(speedProgress({ spd: { ta: { s1: "60", s2: "100" } } }, model)).toEqual({ done: 2, total: 4, out: 1 });
    expect(speedProgress(null, { rows: [] })).toEqual({ done: 0, total: 0, out: 0 });
  });
});
