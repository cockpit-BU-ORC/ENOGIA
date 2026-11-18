import { placeOf, makeSkillsBridge, memoryBackend, meKey } from "./savSkills";

const flush = () => new Promise(r => setTimeout(r, 5));
test("v405 : chemins de la page rangés dans trois documents", () => {
  expect(placeOf("people/p1")).toEqual({ doc: "savSkills", field: "people", id: "p1" });
  expect(placeOf("categories/c1").doc).toBe("savSkillsCat");
  expect(placeOf("selfeval/A@enogia.com")).toMatchObject({ doc: "savSkillsMe_a@enogia.com", field: "selfeval", whole: true });
  expect(placeOf("inconnu")).toBeNull(); expect(meKey(" B@X.com ")).toBe("savSkillsMe_b@x.com");
});
test("v405 : le pont lit et écrit comme la base de l'artefact", async () => {
  const be = memoryBackend({}), br = makeSkillsBridge({ backend: be, me: { email: "chef@enogia.com", name: "Chef", admin: true }, people: [{ email: "tech@enogia.com", name: "Tech" }] });
  const db = await br.use("db"), user = await br.use("user");
  expect(await user.me()).toMatchObject({ id: "chef@enogia.com", canEdit: true });
  expect((await user.search("tec"))[0]).toEqual({ id: "tech@enogia.com", name: "Tech" });
  let people = null, self = null; db.collection("people").onSnapshot(s => { people = s.docs.map(d => ({ id: d.id, ...d.data() })); });
  db.collection("selfeval").onSnapshot(s => { self = s.docs.map(d => d.id); });
  await db.doc("people/p1").set({ name: "Tech", uid: "tech@enogia.com" }); await flush();
  expect(people).toEqual([{ id: "p1", name: "Tech", uid: "tech@enogia.com" }]);
  await db.doc("selfeval/tech@enogia.com").set({ self: { s1: 2 } }); await db.doc("view/tech@enogia.com").set({ name: "Tech" }); await flush();
  expect(self).toEqual(["tech@enogia.com"]); expect(be.data["savSkillsMe_tech@enogia.com"].email).toBe("tech@enogia.com");
  let view = "x"; db.doc("view/tech@enogia.com").onSnapshot(s => { view = s.exists ? s.data() : null; }); await flush(); expect(view).toEqual({ name: "Tech" });
  await db.doc("people/p1").delete(); await flush(); expect(people).toEqual([]);
  br.stop();
});
