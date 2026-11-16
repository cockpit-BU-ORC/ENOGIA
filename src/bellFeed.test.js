import { buildFeed, markLocal, laterUntil, dayLabel } from "./bellFeed";

const now = new Date("2026-11-16T10:00:00");
const me = "moi@enogia.com";
const comments = {
  PJ901: [
    { text: "@moi a", date: "2026-11-16T09:00:00", mentions: [me] },
    { text: "@moi b", date: "2026-11-15T09:00:00", mentions: [me], seen: [{ email: me, at: "x" }] },
    { text: "@moi c", date: "2026-11-14T09:00:00", mentions: [me], resolved: [{ email: me, at: "2026-11-15T09:00:00" }] },
    { text: "pas cité", date: "2026-11-16T08:00:00", mentions: [] },
  ],
  PJ902: [
    { text: "@moi réagi", date: "2026-11-13T09:00:00", mentions: [me], reactions: { "👍": [me] } },
    { text: "@moi privé", date: "2026-11-16T07:00:00", mentions: [me], private: true },
  ],
};

describe("cloche : Vu / Traité / Plus tard (v365)", () => {
  test("mentions : nouvelle, vue (grisée, hors pastille), traitée ou réagie (sortie du fil), privé masqué sans droit", () => {
    const f = buildFeed({ comments, me, canSeePrivate: false, now });
    expect(f.feed.map(x => x.c.text)).toEqual(["@moi a", "@moi b"]);
    expect(f.feed.map(x => x.s)).toEqual(["new", "seen"]);
    expect(f.done.map(x => x.c.text)).toEqual(["@moi c", "@moi réagi"]);
    expect(f.red).toBe(1);
    expect(buildFeed({ comments, me, canSeePrivate: true, now }).red).toBe(2);
  });
  test("Plus tard : disparaît jusqu'au lendemain 8 h, puis revient", () => {
    const key = "m:PJ901:0:2026-11-16T09:00:00";
    const local = markLocal({}, key, "later", now);
    expect(local[key].until).toBe(new Date("2026-11-17T08:00:00").toISOString());
    const f = buildFeed({ comments, me, local, now });
    expect(f.later.map(x => x.key)).toEqual([key]);
    expect(f.red).toBe(0);
    const g = buildFeed({ comments, me, local, now: new Date("2026-11-17T08:00:01") });
    expect(g.later).toEqual([]);
    expect(g.feed[0].key).toBe(key);
  });
  test("affectations et projets modifiés : marques locales", () => {
    const assignments = [{ pj: "PJ903", at: "2026-11-16T08:00:00" }], pjChanges = [{ pj: "PJ904", at: "2026-11-15T08:00:00", delta: 3 }];
    let f = buildFeed({ me, assignments, pjChanges, now });
    expect([f.red, f.info]).toEqual([1, 1]);
    const loc = markLocal(markLocal({}, "a:PJ903:2026-11-16T08:00:00", "seen", now), "c:PJ904:2026-11-15T08:00:00", "done", now);
    f = buildFeed({ me, assignments, pjChanges, local: loc, now });
    expect([f.red, f.info, f.feed.length, f.done.length]).toEqual([0, 0, 1, 1]);
    expect(f.feed[0].s).toBe("seen");
  });
  test("utilitaires", () => {
    expect(laterUntil(new Date("2026-11-16T23:30:00"))).toBe(new Date("2026-11-17T08:00:00").toISOString());
    expect(dayLabel("2026-11-16T01:00:00", now)).toBe("Aujourd'hui");
    expect(dayLabel("2026-11-15T23:00:00", now)).toBe("Hier");
    expect(dayLabel("2026-11-12T23:00:00", now)).toBe("Cette semaine");
    expect(dayLabel("2026-10-01", now)).toBe("Plus ancien");
    expect(markLocal({ k: { s: "seen", at: "2026-11-16T09:00:00" } }, "k", null, now)).toEqual({});
  });
});
