import { countryLL, mapPoints, isoOf, euros, parseSavHistory, historyPlan } from "./savImport";

test("pays → coordonnées, points écartés pour un même pays", () => {
  expect(countryLL("ALLEMAGNE")).toEqual([51.2, 10.4]);
  expect(countryLL("France")).toEqual([46.6, 2.4]);
  expect(countryLL("Atlantide")).toBeNull();
  const P = mapPoints([{ pj: "PJ1", pays: "France", info: {} }, { pj: "PJ2", pays: "France", info: {} }, { pj: "PJ3", pays: "Japon", info: { lat: 35.4, lon: 132.7 } }]);
  expect(P).toHaveLength(3);
  expect(P[0].lat).not.toBe(P[1].lat);
  expect(P[2]).toMatchObject({ lat: 35.4, lon: 132.7, exact: true });
});

test("dates et montants du fichier SAV", () => {
  expect(isoOf("02/12/2025")).toBe("2025-12-02");
  expect(isoOf("07/2022")).toBe("2022-07-01");
  expect(isoOf(new Date(2026, 0, 13))).toBe("2026-01-13");
  expect(isoOf("")).toBeNull();
  expect(euros("5 650,00 €")).toBe(5650);
  expect(euros("0,00 €")).toBe(0);
});

test("reprise de l'historique : tickets, interventions, parc, contrats", () => {
  const sheets = {
    Tickets_SAV: [["", "Tickets"], ["", "", "", "", "Progression", "Statut", "N° de tickets", "N° de projet", "Nom du projet", "Type de demande", "Date de la demande", "Origine de la demande", "Détails", "Priorité", "Responsable du ticket", "État de la demande", "Actions / Commentaires / Avancement", "N° intervention(s) liée(s)", "Documents annexes", "Date de clôture", "Nbre jours de traitement", "Satisfaction client"],
      ["", "", "", "", "", "Fermé", "TC-26-04", "PJ360", "", "Maintenance Curative (Pannes/Arrêts)", "10/12/2025", "Pôle SAV", "Défaillance turbine", "Haute", "Tech A", "6. Terminé, à clôturer", "Machine fonctionnelle", "INT-003", "", "21/01/2026", "42", "5"],
      ["", "", "", "", "", "Ouvert", "TC-26-03", "PJ252", "", "Devis", "01/12/2025", "Client", "Devis cooling", "Basse", "Tech B", "4. Chiffrage envoyé", "", "INT-077", "", "", "", ""]],
    Interventions: [["Interventions"], ["", "", "", "", "N° d'intervention", "Statut", "Objectifs de l'intervention", "Ticket(s) lié(s)", "N° de projet", "Type d'intervention", "Responsable intervention", "Intervenants", "Date d'arrivée", "Date de départ", "Nb de jours", "Préparation d'intervention", "Préparation OK", "Clôture d'intervention ", "Fiche machine à jour", "Clôture OK", "Réussite intervention", "Date de clôture", "Nbre jours homme", "Zone", "Coûts PdR", "Coûts transport PdR ", "Coûts transports (vol/train)", "Coûts hébergements", "Coûts repas", "Coût total"],
      ["", "", "", "", "INT-003", "Réalisée", "Remplacement turbine", "TC-26-04", "PJ360", "Maintenance curative", "Tech A", "Tech C", "10/01/2026", "16/01/2026", "7", "Communication au client, Ordre de mission, Check list de PdR et matériels", "OK", "Certificat de mise en service ou d'intervention signé, PPT de clôture ", "", "OK", "Succès", "23/01/2026", "7", "", "5 650,00 €", "0,00 €", " ", "200,00 €", "420,00 €", "6 270,00 €"]],
    Parc_Projets: [["Parc"], [], [], [], ["#", "Statut", "Classification client", "PROJET", "CP", "Fiches machines", "Nom du projet", "Client principal", "Poste", "E-mail", "Téléphone", "Type d'ORC", "Prod", "Gamme", "Version", "Nombre d'ORC", "Fourniture Enogia", "Date de mise en service", "Pays", "Adresse du site", "Application", "Visitable", "Contrat de maintenance", "N° de contrat"],
      ["18", "SAV", "2", "PJ231", "", "", "DUNGSTRUP", "Client X", "Dir.", "x@client.de", "+49 1", "20LTV2", "20", "LT", "V2", "1", "ORC", "20/10/2022", "ALLEMAGNE", "", "Biomass", "Non", "Premium", "MP231-001"]],
    Parc_ORC: [[], ["N° de série", "Module", "Adresse IP", "Type d'ORC", "Prod", "Gamme", "Version", "Date de MES", "Projet(s) rattaché(s)"], ["2023-011-20", "M17", "", "20LTV3", "20", "LT", "V3", "21/07/2023", "PJ231"]],
    Suivi_contrats: [["Suivi Contrats"], ["", "", "", "", "Statut du contrat", "N° de projet", "Nom du projet", "N° de contrat", "Mécanisme de facturation", "Type de contrat", "Dispositions particulières", "Montant du forfait annuel (€)", "Date de lancement", "Année en cours", "Date de notification de la prochaine maintenance préventive", "Prochaine facturation", "Date de fin/suspension du contrat"],
      ["", "", "", "", "En cours", "PJ231", "", "MP231-001", "Date", "Premium", "-", "7 200,00 €", "15/09/2022", "4", "15/08/2026", "14/09/2026", "13/09/2028"]],
  };
  const h = parseSavHistory(sheets);
  expect(h.tickets["TC-26-04"]).toMatchObject({ pj: "PJ360", type: "cur", prio: "h", closedAt: "2026-01-21", satisf: 5, inters: ["INT-003"], step: 6 });
  expect(h.tickets["TC-26-03"]).toMatchObject({ type: "dev", prio: "b", step: 4 });
  expect(h.tickets["TC-26-03"].closedAt).toBeUndefined();
  expect(h.inters["INT-003"]).toMatchObject({ tk: "TC-26-04", a: "2026-01-10", b: "2026-01-16", st: "Réalisée", resp: "Tech A", who: ["Tech C"], reussite: "Succès" });
  expect(h.inters["INT-003"].prep).toEqual(expect.arrayContaining(["Communication au client", "Ordre de mission", "Check-list PdR et matériels"]));
  expect(h.inters["INT-003"].clo).toEqual(["Certificat de MES ou d'intervention signé", "PPT de clôture"]);
  expect(h.inters["INT-003"].costs).toMatchObject({ pdr: 5650, heberg: 200, repas: 420 });
  expect(h.parc.PJ231).toMatchObject({ nom: "DUNGSTRUP", pays: "Allemagne", contrat: "Premium", contratStatut: "En cours", forfait: 7200, preventive: "2026-08-15", sn: ["2023-011-20"], mes: "2022-10-20" });
  expect(JSON.stringify(h.parc.PJ231)).not.toMatch(/client\.de|\+49/); // pas de coordonnées personnelles des clients
  expect(h.techs).toEqual(["Tech A", "Tech B", "Tech C"]);
  const plan = historyPlan({ tickets: { "TC-26-04": { pj: "PJ360" } }, parc: { PJ231: { lat: 55 } } }, h);
  expect(plan.counts).toMatchObject({ tickets: 1, dejaT: 1, inters: 1 });
  expect(plan.parc.PJ231).toMatchObject({ lat: 55, nom: "DUNGSTRUP" });
});
