import { monthLists, commentOf, weeklyReport, snapshotOf, headline, subject, mailHtml, curveSvg, cleanRecipients, fmtK, fmtS, monthView } from "./cashWeekly";

// Jeu d'essai : aujourd'hui lundi 16/11/2026
const T0 = "2026-11-16";
const R = (id, pj, montant, o) => ({ id, pj, jalon: "J" + id, montant, delai: 30, ...o });
const DOC = { labels: { PJ1: "Client A", PJ2: "Client B" }, owners: { PJ1: "Chef A", PJ2: "Chef B" }, rows: [
  R("a", "PJ1", 100000, { factInit: "2026-01-05", factReelle: "2026-01-05", encInit: "2026-02-04", encPrevue: "2026-02-04", encReelle: "2026-02-10" }), // payé en retard de 6 j
  R("b", "PJ1", 200000, { factInit: "2026-09-20", factReelle: "2026-10-01", encInit: "2026-10-20", encPrevue: "2026-10-31" }), // paiement en retard (16 j)
  R("c", "PJ2", 50000, { factInit: "2026-10-15", factPrevue: "2026-10-15", encInit: "2026-11-14", encPrevue: "2026-11-14" }), // facture à émettre en retard
  R("d", "PJ2", 80000, { factInit: "2026-10-20", factReelle: "2026-10-20", encInit: "2026-11-19", encPrevue: "2026-11-19" }), // attendu cette semaine
  R("e", "PJ2", 120000, { factInit: "2026-11-05", factPrevue: "2026-11-25", encInit: "2026-12-05", encPrevue: "2026-12-25" }), // décembre
  R("f", "PJ1", 70000, { factInit: "2026-11-10", factPrevue: "2026-12-20", encInit: "2026-12-10", encPrevue: "2027-01-19" }), // parti en janvier
  R("g", "PJ1", 999, { epc: true, encInit: "2026-11-01" }), // EPC : ignoré
]};

test("v374 : chiffres de l'année, du mois et du mois prochain", () => {
  const r = weeklyReport(DOC, T0);
  expect(r.week.w).toBe(47);
  expect(r.ytd.paid).toBe(100000);
  expect(r.ytd.initToDate).toBe(100000 + 200000 + 50000); // initiaux passés : févr., oct., 14 nov.
  expect(r.ytd.gap).toBe(-250000);
  expect(r.late.bill).toBe(50000); expect(r.late.enc).toBe(200000); expect(r.late.total).toBe(250000);
  expect(r.late.items[0].pj).toBe("PJ1"); expect(r.late.items[0].days).toBe(16);
  expect(r.yearEnd.init).toBe(100000 + 200000 + 50000 + 80000 + 120000 + 70000);
  expect(r.yearEnd.toYearEnd).toBe(80000 + 120000); // f part en janvier
  expect(r.yearEnd.lateCash).toBe(200000 + 50000);
  expect(r.thisWeek.map(x => x.id)).toEqual(["d"]);
  expect(r.cur.enc.init).toBe(50000 + 80000);
  expect(r.next.key).toBe("2026-12"); expect(r.next.enc.init).toBe(190000); expect(r.next.enc.act).toBe(120000);
  expect(r.next.enc.pushedN).toBe(1);
  expect(r.next.items.map(x => x.id + x.kind[0])).toEqual(["ff", "ep"]);
  expect(r.retards.paidN).toBe(1); expect(r.retards.avgRet).toBe(6);
});
test("v374 : novembre — factures initial / émis + à émettre", () => {
  const m = monthView(DOC.rows, "2026-11", T0);
  expect(m.fact.init).toBe(120000 + 70000); expect(m.fact.todo).toBe(120000); expect(m.fact.done).toBe(0);
});
test("v374 : comparaison avec l'envoi de la semaine précédente", () => {
  const prev = { ...snapshotOf(weeklyReport(DOC, "2026-11-09")), week: "2026-46" };
  const r = weeklyReport(DOC, T0, { ...prev, late: 100000 });
  expect(r.delta.late).toBe(150000);
  expect(weeklyReport(DOC, T0, { week: "2026-47", late: 1 }).delta).toBe(null); // même semaine : pas de comparaison
});
test("v374 : phrases, mail et courbe", () => {
  const r = weeklyReport(DOC, T0);
  expect(headline(r)).toMatch(/^Vous êtes en retard sur l'initial : −250 k€/);
  expect(subject(r)).toMatch(/^Cash in S47 — année −71 %/);
  const h = mailHtml(r, { appUrl: "https://x.test/?p=cashin" });
  expect(h).toContain("Les encaissements de 2026"); expect(h).toContain(">Encaissements<"); expect(h).toContain(">Factures<"); // v385 : mail allégé
  expect(h).toContain("Novembre"); expect(h).toContain("Décembre"); expect(h).toContain("cid:courbe"); expect(h).toContain("Novembre (en cours)"); expect(h).toContain("Décembre (à venir)"); expect(h).not.toContain("Causes :");
  expect(h).not.toMatch(/<script/i);
  const s = curveSvg(r); expect(s.startsWith("<svg")).toBe(true); expect(s).not.toContain("NaN"); expect(s).not.toContain("<text");
});
test("v374 : le texte des jalons est échappé dans le mail", () => {
  const d = { ...DOC, rows: [...DOC.rows, R("x", "PJ3", 9000, { factInit: "2026-11-01", factPrevue: "2026-11-01", encPrevue: "2026-12-01", jalon: "<img src=x onerror=alert(1)>" })] };
  const h = mailHtml(weeklyReport(d, T0));
  expect(h).not.toContain("<img src=x"); // v385 : les jalons ne sont plus dans le mail (seulement dans le PDF)
});
test("v374 : destinataires et montants", () => {
  expect(cleanRecipients([" A.B@enogia.com", "a.b@enogia.com", "x@gmail.com", ""])).toEqual(["a.b@enogia.com"]);
  expect(fmtK(1024000)).toBe("1,02 M€"); expect(fmtK(436200)).toBe("436 k€"); expect(fmtS(-614000)).toBe("−614 k€"); expect(fmtS(0)).toBe("0 €");
});
test("v374 : les copies pour la fonction serveur sont à jour (node scripts/sync-functions.js)", () => {
  const fs = require("fs"), path = require("path"), { FILES, OUT, build, lf } = require("../scripts/sync-functions.js");
  FILES.forEach(f => { const p = path.join(OUT, f + ".mjs"); expect(fs.existsSync(p)).toBe(true); expect(lf(fs.readFileSync(p, "utf8"))).toBe(build(f)); });
});

test("v376 : listes du mois — factures émises / à émettre, encaissements prévus (retards repris) et reçus, avec commentaires", () => {
  const d = { ...DOC, rows: DOC.rows.map(r => (r.id === "b" ? { ...r, note: "Client relancé le 10/11", causes: [{ c: "Client", d: 12 }] } : r)) };
  const L = monthLists(d, "2026-11", T0, true);
  expect(L.factures.map(x => x.id + (x.done ? "+" : "-"))).toEqual(["c-", "e-"]); // c : à émettre depuis le 15/10 (en retard), e : prévue le 25/11
  expect(L.factures[0].late).toBe(32);
  expect(L.prevus.map(x => x.id)).toEqual(["b", "c", "d"]); // b et c en retard (mois précédents / passé), d le 19/11
  expect(L.prevus[0].comment).toBe("Client relancé le 10/11 · Causes : Client (12 j)");
  expect(L.recus).toEqual([]);
  const N = monthLists(d, "2026-12", T0, false);
  expect(N.factures.map(x => x.id)).toEqual(["f"]); expect(N.prevus.map(x => x.id)).toEqual(["e"]);
  expect(commentOf({})).toBe("");
});
test("v376 : encaissement reçu avec écart de date et de montant", () => {
  const rows = [{ id: "p", pj: "PJ9", jalon: "Solde", montant: 50000, factReelle: "2026-10-01", encPrevue: "2026-11-02", encReelle: "2026-11-09", montantRecu: 48000 }];
  const x = monthLists({ rows }, "2026-11", T0, true).recus[0];
  expect(x.montant).toBe(48000); expect(x.prevu).toBe(50000); expect(x.gap).toBe(-2000); expect(x.delay).toBe(7);
});
