import { buildFeed, whenTxt } from "./liveFeed";

test("v418 : fil « En direct » — tests, commentaires, publications, transports, triés du plus récent", () => {
  const now = new Date("2026-11-19T11:00:00Z");
  const testsDoc = { plans: { "PJ903-1": { st: { interne: { t3: "ok", t4: "wip", t9: "todo" } }, stBy: { interne: { t3: { by: "Léa", at: "2026-11-19T09:42:00Z" }, t4: { by: "Léa", at: "2026-11-19T10:00:00Z" }, t9: { by: "x", at: "2026-11-19T10:30:00Z" } } } } } };
  const catalog = { interne: [{ id: "t3", label: "Étanchéité" }, { id: "t4", label: "Démarrage" }] };
  const comments = { PJ901: [{ author: "Camille", text: "pièce reçue", date: "2026-11-19T08:31:00Z" }, { author: "Vieux", text: "ancien", date: "2026-10-01T08:00:00Z" }, { author: "P", text: "privé", date: "2026-11-19T08:00:00Z", private: true }] };
  const changeLog = [{ at: "2026-11-18T16:00:00Z", by: "Gabriel", pjs: [{ pj: "PJ901", departDelta: 4 }, { pj: "PJ902", departDelta: 1 }] }];
  const transports = { items: { x1: { pj: "PJ446-9", status: "colis ramasse", from: "Emballeur", to: "Ulsan", updatedAt: "2026-11-19T09:15:00Z", url: "u" } } };
  const F = buildFeed({ testsDoc, catalog, comments, changeLog, transports, isPrivateHidden: true, now });
  expect(F.map(e => e.kind)).toEqual(["test", "test", "transport", "comment", "publish"]);
  expect(F[0]).toMatchObject({ pj: "PJ903-1", text: "test « Démarrage » commencé", tone: "info" });
  expect(F[1].text).toBe("test « Étanchéité » réussi");
  expect(F[2]).toMatchObject({ tone: "ok", text: "colis ramassé, en route · Emballeur → Ulsan", url: "u" });
  expect(F[4]).toMatchObject({ pj: "PJ901", tone: "bad", text: "planning publié · 2 PJ modifiés · départ +4 j (et 1 autre)" });
  expect(buildFeed({})).toEqual([]);
  expect(whenTxt("2026-11-18T15:05:00Z", now)).toMatch(/^hier /);
});
