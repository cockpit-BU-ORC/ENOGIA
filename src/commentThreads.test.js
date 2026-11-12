import { threadsOf, filterThreads } from "./commentThreads";
import { toggleReaction } from "./mentions";

const comments = {
  PJ1: [{ author: "Thomas", text: "a", date: "2026-11-10T09:00:00Z" }, { author: "Thomas", text: "@Clément ?", date: "2026-11-12T10:00:00Z", mentions: ["clement@enogia.com"] }],
  PJ2: [{ author: "Gabriel", text: "privé", date: "2026-11-11T09:00:00Z", private: true }],
  PJ3: [{ author: "Ben", text: "b", date: "2026-11-01T09:00:00Z" }],
};
const now = Date.parse("2026-11-12T12:00:00Z");

test("un CdP ne voit que ses PJ et les fils où il est cité", () => {
  const t = threadsOf({ comments, pjs: ["PJ1", "PJ2", "PJ3"], me: "clement@enogia.com", myName: "Clément", myPjs: ["PJ3"], seeAll: false, seePrivate: false, now });
  expect(t.map(x => x.pj)).toEqual(["PJ1", "PJ3"]);
  expect(t[0].atMe).toBe(1);
  expect(t[0].newN).toBe(2);
  expect(filterThreads(t, "at").map(x => x.pj)).toEqual(["PJ1"]);
});

test("la direction voit tout, privés compris", () => {
  const t = threadsOf({ comments, pjs: ["PJ1", "PJ2", "PJ3"], me: "g@enogia.com", myName: "Gabriel", myPjs: [], seeAll: true, seePrivate: true, lastSeen: { PJ1: "2026-11-11T00:00:00Z" }, now });
  expect(t.length).toBe(3);
  expect(t.find(x => x.pj === "PJ2").priv).toBe(true);
  expect(t.find(x => x.pj === "PJ2").newN).toBe(0); // son propre commentaire
  expect(t.find(x => x.pj === "PJ1").newN).toBe(1);
  expect(filterThreads(t, "mine").length).toBe(0);
});

test("réaction : ajout puis retrait", () => {
  const l1 = toggleReaction(comments.PJ1, 0, "👍", "A@enogia.com");
  expect(l1[0].reactions).toEqual({ "👍": ["a@enogia.com"] });
  const l2 = toggleReaction(toggleReaction(l1, 0, "👍", "b@enogia.com"), 0, "👍", "a@enogia.com");
  expect(l2[0].reactions).toEqual({ "👍": ["b@enogia.com"] });
  expect(toggleReaction(l1, 0, "👍", "a@enogia.com")[0].reactions).toBeUndefined();
  expect(l1[1]).toBe(comments.PJ1[1]);
});
