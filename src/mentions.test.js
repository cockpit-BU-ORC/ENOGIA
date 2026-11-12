import { nameFromEmail, mentionOptions, typedMentions, toggleToken, isOpenFor, countOpenFor, setResolved, mailtoFor, openMentionsFor, peopleOptions, mentionQueryAt, suggestMentions, insertMention, firstNameSpan, chefAccount, withChef, toggleReaction } from "./mentions";

const opts = mentionOptions(["emmy.bourelly@enogia.com", "Gabriel.Vincent@enogia.com", "emmy.bourelly@enogia.com"], "nordine.sakhri@enogia.com");

test("noms tirés des emails, sans doublon, triés", () => {
  expect(nameFromEmail("gabriel.vincent@enogia.com")).toBe("Gabriel Vincent");
  expect(opts.map(o => o.name)).toEqual(["Emmy Bourelly", "Gabriel Vincent", "Nordine Sakhri"]);
});
test("mentions saisies dans le texte, ajout / retrait par puce", () => {
  expect(typedMentions("Peux-tu relancer @emmy bourelly, merci", opts).map(o => o.email)).toEqual(["emmy.bourelly@enogia.com"]);
  expect(typedMentions("@Gabriel Vincentx non", opts)).toEqual([]);
  const t1 = toggleToken("Relancer le fournisseur", opts[1]);
  expect(t1).toBe("Relancer le fournisseur @Gabriel Vincent ");
  expect(typedMentions(t1, opts).length).toBe(1);
  expect(toggleToken(t1, opts[1]).trim()).toBe("Relancer le fournisseur");
});
test("demande ouverte, traitée, rouverte", () => {
  const list = [{ text: "a", mentions: ["emmy.bourelly@enogia.com"] }, { text: "b" }];
  expect(isOpenFor(list[0], "Emmy.Bourelly@enogia.com")).toBe(true);
  expect(isOpenFor(list[1], "emmy.bourelly@enogia.com")).toBe(false);
  const done = setResolved(list, 0, "emmy.bourelly@enogia.com", true, "2026-10-21T10:00:00Z");
  expect(countOpenFor(done, "emmy.bourelly@enogia.com")).toBe(0);
  expect(done[0].resolved[0].at).toBe("2026-10-21T10:00:00Z");
  // v319 : une réaction de la personne citée ferme la demande ; la retirer la rouvre
  const r1 = toggleReaction(list, 0, "👍", "emmy.bourelly@enogia.com");
  expect(countOpenFor(r1, "emmy.bourelly@enogia.com")).toBe(0);
  expect(countOpenFor(toggleReaction(r1, 0, "👍", "emmy.bourelly@enogia.com"), "emmy.bourelly@enogia.com")).toBe(1);
});

test("mailtoFor : destinataires cités sans soi-même, null si personne", () => {
  const t = typedMentions("@Emmy Bourelly et @Gabriel Vincent merci", opts);
  const href = mailtoFor(t, { pj: "PJ461-1", projet: "Centrale", author: "Gab", text: "merci", url: "https://x/", me: "gabriel.vincent@enogia.com" });
  expect(href.startsWith("mailto:emmy.bourelly%40enogia.com?")).toBe(true);
  expect(decodeURIComponent(href)).toContain("PJ461-1");
  expect(mailtoFor(typedMentions("@Gabriel Vincent", opts), { pj: "P", me: "gabriel.vincent@enogia.com" })).toBeNull();
});

test("openMentionsFor : demandes ouvertes tous PJ confondus, récentes d'abord, sans les traitées", () => {
  const me = "gabriel.vincent@enogia.com";
  const by = {
    A: [{ date: "2026-10-01T00:00:00Z", mentions: [me], text: "a" }, { date: "2026-10-02T00:00:00Z", mentions: [me], resolved: [{ email: me, at: "x" }] }],
    B: [{ date: "2026-10-05T00:00:00Z", mentions: [me], text: "b" }, { date: "2026-10-06T00:00:00Z", text: "sans tag" }],
  };
  const r = openMentionsFor(by, me);
  expect(r.map(x => x.pj + x.idx)).toEqual(["B0", "A0"]);
});

test("peopleOptions : comptes connectés + managers + soi, sans doublon, nom du compte prioritaire", () => {
  const o = peopleOptions([{ email: "A@enogia.com", name: "Alice DURAND" }, { email: "b@enogia.com", name: "" }], ["a@enogia.com", "c.dupont@enogia.com"], "me@enogia.com", "Moi Même");
  expect(o.map(x => x.email)).toEqual(["a@enogia.com", "b@enogia.com", "c.dupont@enogia.com", "me@enogia.com"].sort((x, y) => o.find(p => p.email === x).name.localeCompare(o.find(p => p.email === y).name)));
  expect(o.find(x => x.email === "a@enogia.com").name).toBe("Alice DURAND");
  expect(o.find(x => x.email === "c.dupont@enogia.com").name).toBe("C Dupont");
});

test("saisie @ à la Gmail : détection, prénom uniquement, insertion", () => {
  const o = [{ email: "benoit.paillette@enogia.com", name: "Benoit Paillette" }, { email: "emmy.bourelly@enogia.com", name: "Emmy Bourelly" }, { email: "b.x@enogia.com", name: "Bourges, Guillaume" }, { email: "z@enogia.com", name: "Zoé Benard" }, { email: "g@enogia.com", name: "Gabriel VINCENT" }];
  expect(mentionQueryAt("Salut @be", 9)).toEqual({ start: 6, query: "be" });
  expect(mentionQueryAt("Salut @", 7)).toEqual({ start: 6, query: "" });
  expect(mentionQueryAt("mail a@be", 9)).toBeNull();
  expect(mentionQueryAt("ok @be\nsuite", 12)).toBeNull();
  expect(mentionQueryAt("@Benoit Pa", 10)).toBeNull(); // espace : la recherche s'arrête
  expect(suggestMentions(o, "be", []).map(x => x.name)).toEqual(["Benoit Paillette"]); // pas « Zoé Benard » (nom de famille), pas « Bourges »
  expect(suggestMentions(o, "gu", []).map(x => x.name)).toEqual(["Bourges, Guillaume"]); // format « Nom, Prénom »
  expect(suggestMentions(o, "zo", []).map(x => x.name)).toEqual(["Zoé Benard"]);
  expect(suggestMentions(o, "ZOE", []).map(x => x.name)).toEqual(["Zoé Benard"]); // accents et casse ignorés
  expect(suggestMentions(o, "", [o[0]]).map(x => x.name)).toEqual(["Emmy Bourelly", "Gabriel VINCENT", "Bourges, Guillaume", "Zoé Benard"]); // triées par prénom
  expect(insertMention("Salut @be et", 9, { start: 6, query: "be" }, o[0])).toEqual({ text: "Salut @Benoit Paillette  et", caret: 24 });
  expect(firstNameSpan("Bourges, Guillaume")).toEqual([9, 18]);
});
test("chef de projet : rapproché d'un compte sans tenir compte des accents / casse / ordre, ajouté aux mentions sauf auteur", () => {
  const people = [{ email: "clement.martouzet@enogia.com", name: "Clement Martouzet" }, { email: "gabriel.vincent@enogia.com", name: "Gabriel VINCENT" }, { email: "x@enogia.com", name: "X" }];
  expect(chefAccount("Clément MARTOUZET", people).email).toBe("clement.martouzet@enogia.com");
  expect(chefAccount("VINCENT Gabriel", people).email).toBe("gabriel.vincent@enogia.com");
  expect(chefAccount("Emmy BOURELLY", people)).toBeNull();
  expect(chefAccount("", people)).toBeNull();
  const chef = people[0];
  expect(withChef(["a@x.com"], chef, "me@enogia.com")).toEqual(["a@x.com", "clement.martouzet@enogia.com"]);
  expect(withChef([], chef, "Clement.Martouzet@enogia.com")).toEqual([]);
  expect(withChef(["clement.martouzet@enogia.com"], chef, "me@enogia.com")).toEqual(["clement.martouzet@enogia.com"]);
});
