// ── Nouveautés affichées une seule fois à la connexion, après un déploiement ───────────────────────────────
// À CHAQUE MISE EN PRODUCTION : ajouter une entrée EN TÊTE du tableau (id unique, jamais réutilisé), puis déployer.
// Chaque personne la voit une fois par poste (mémorisé dans localStorage) ; ceux qui ont raté plusieurs versions voient les 3 plus récentes.
//   • id      : identifiant stable (ex. "2026-10-v146")
//   • date    : "AAAA-MM-JJ"
//   • title   : titre court
//   • items   : [{ t: "titre court", d: "une phrase", admin?: true }]  — admin:true = réservé au super admin (ex. Cash in)
export const RELEASES = [
  {
    id: "2026-11-v290",
    date: "2026-11-09",
    title: "V290 : Rapport CODIR plus clair",
    items: [
      { t: "Rapport CODIR", d: "La réponse et les décisions d'abord, puis les preuves ; une page PJ en trois colonnes.", admin: true },
      { t: "KPI", d: "Dérives et Bilan mensuel : le détail est replié derrière un bouton.", admin: true },
    ],
  },
  {
    id: "2026-11-v289",
    date: "2026-11-09",
    title: "V289 : démarrage plus rapide",
    items: [
      { t: "Rapidité", d: "Le site se charge presque deux fois plus vite : les grandes pages se chargent à leur première ouverture." },
    ],
  },
  {
    id: "2026-11-v288",
    date: "2026-11-09",
    title: "V288 : actions plus sûres",
    items: [
      { t: "Confirmations", d: "Une fenêtre claire qui dit ce qui va se passer, avec un bouton qui nomme l'action." },
      { t: "Fiches projet", d: "Pénalités en brouillon avant d'enregistrer, et « Annuler » 5 s après chaque enregistrement.", admin: true },
    ],
  },
  {
    id: "2026-11-v287",
    date: "2026-11-06",
    title: "V287 : fenêtres du Planificateur au clavier",
    items: [
      { t: "Planificateur", d: "Les fenêtres se ferment avec Échap et se manient au clavier.", owner: true },
    ],
  },
  {
    id: "2026-11-v286",
    date: "2026-11-06",
    title: "V286 : un seul système de design",
    items: [
      { t: "Bulles d'information", d: "Plus rapides à la souris, et aussi au clavier et au doigt." },
      { t: "Apparence", d: "Arrondis, boutons et polices harmonisés sur tout le site." },
    ],
  },
  {
    id: "2026-11-v285",
    date: "2026-11-06",
    title: "V285 : cloche plus juste, mode sombre automatique",
    items: [
      { t: "Cloche", d: "En rouge seulement ce qui vous attend ; les projets modifiés par le planning sont en gris." },
      { t: "Apparence", d: "Choix « Auto » : clair ou sombre comme votre ordinateur." },
      { t: "Chiffres", d: "« Expédiées depuis mai », et les chiffres s'affichent directement." },
    ],
  },
  {
    id: "2026-11-v284",
    date: "2026-11-06",
    title: "V284 : Cash in et accueil plus faciles à lire",
    items: [
      { t: "Cash in", d: "Un bouton « Haut de page » apparaît quand on descend dans la page.", admin: true },
      { t: "Accueil", d: "Chiffres clés plus lisibles, cadran Tests en une ligne." },
    ],
  },
  {
    id: "2026-11-v283",
    date: "2026-11-06",
    title: "V283 : pages plus lisibles",
    items: [
      { t: "Liste", d: "La vue d'ensemble tient en une ligne ; « Répartitions » déplie les graphiques." },
      { t: "Gantt", d: "Légende en haut et lignes plus basses : plus de machines visibles d'un coup." },
      { t: "Retards", d: "Les causes sans retard ne prennent plus de place.", admin: true },
    ],
  },
  {
    id: "2026-11-v282",
    date: "2026-11-05",
    title: "V282 : cibles plus grandes, textes plus lisibles",
    items: [
      { t: "Partout", d: "Les petits boutons se cliquent plus facilement et les petits textes sont un peu plus grands." },
      { t: "Charge atelier", d: "L'accueil et les KPI utilisent la même capacité, celle du planificateur.", admin: true },
    ],
  },
  {
    id: "2026-11-v281",
    date: "2026-11-05",
    title: "V281 : refonte des KPI",
    items: [
      { t: "KPI", d: "Chaque page répond d'abord en une phrase, montre les chiffres face aux objectifs, puis ce qu'il faut faire.", admin: true },
    ],
  },
  {
    id: "2026-11-v280",
    date: "2026-11-05",
    title: "V280 : page Checklists et période des objectifs",
    items: [
      { t: "Tests › Checklists", d: "Importez une checklist de debug (Word ou Excel) et modifiez ses lignes ; elle s'applique à toutes les machines.", admin: true },
      { t: "KPI", d: "Objectifs sur un mois ou plusieurs ; vue CODIR « Mois dernier » corrigée.", admin: true },
    ],
  },
  {
    id: "2026-11-v279",
    date: "2026-11-05",
    title: "V279 : objectifs chiffrés des KPI",
    items: [
      { t: "KPI", d: "Objectifs chiffrés sur chaque sous-onglet, avec l'écart et la méthode de calcul.", admin: true },
    ],
  },
  {
    id: "2026-11-v278",
    date: "2026-11-05",
    title: "V278 : checklist de debug modifiable",
    items: [
      { t: "Checklist de debug", d: "« Modifier la liste » : ajoutez ou retirez des lignes, pour une machine ou pour toutes." },
      { t: "KPI", d: "Répartition des machines en camemberts, alertes « À surveiller », méthode de chaque chiffre.", admin: true },
    ],
  },
  {
    id: "2026-11-v277",
    date: "2026-11-05",
    title: "V277 : fiche projet resserrée",
    items: [
      { t: "Fiches projet", d: "Moins de hauteur : Finance en trois colonnes, Machine à côté de Suivi, listes repliées.", admin: true },
    ],
  },
  {
    id: "2026-11-v276",
    date: "2026-11-04",
    title: "V276 : période de la vue CODIR",
    items: [
      { t: "KPI", d: "Vue CODIR : choisissez les mois pris en compte.", admin: true },
      { t: "Fiches projet", d: "Statut global et indicateurs plus compacts, jalons payés repliés.", admin: true },
    ],
  },
  {
    id: "2026-11-v275",
    date: "2026-11-04",
    title: "V275 : vue CODIR et jalons par mois",
    items: [
      { t: "KPI", d: "PJ tenus à date par étape, choix des machines, graphiques par mois.", admin: true },
      { t: "Fiches projet", d: "Frise des jalons à droite, Machine et Finance côte à côte.", admin: true },
    ],
  },
  {
    id: "2026-11-v274",
    date: "2026-11-04",
    title: "V274 : bilan mensuel et besoins turbines",
    items: [
      { t: "KPI", d: "Bilan mensuel : réalisé des deux derniers mois, objectifs du mois en cours et du suivant.", admin: true },
      { t: "Turbines", d: "Prêtes avec / sans roue séparées, mauvaise roue refusée, ORC et SAV en couleur.", admin: true },
      { t: "Fiches projet", d: "Mise en page sans trous, livraison sur site plus claire.", admin: true },
    ],
  },
  {
    id: "2026-11-v273",
    date: "2026-11-04",
    title: "V273 : besoins turbines et fiches projet",
    items: [
      { t: "Turbines", d: "Besoins en plateaux turbine · roue · injecteur, remplissage automatique depuis le stock.", admin: true },
      { t: "Fiches projet", d: "Onglets en haut, chiffres clés sous l'en-tête, zone Machine, confirmation « Enregistré ».", admin: true },
    ],
  },
  {
    id: "2026-11-v272",
    date: "2026-11-04",
    title: "V272 : checklist de debug en PDF",
    items: [
      { t: "Checklist de debug", d: "Export en PDF, au format du modèle." },
      { t: "Fiches projet", d: "Section Turbine plus compacte.", admin: true },
    ],
  },
  {
    id: "2026-11-v271",
    date: "2026-11-04",
    title: "V271 : cloche, « Vu » et besoins turbines",
    items: [
      { t: "Cloche", d: "« N à traiter » en toutes lettres, et un aperçu de chaque nouvelle mention." },
      { t: "Commentaires", d: "Cité ? Cliquez « Vu » pour montrer à l'auteur que c'est pris en compte, puis « Traité »." },
      { t: "Turbines", d: "Besoins par emplacement turbine + roue + injecteur, à remplir par glisser-déposer depuis le stock de la production.", admin: true },
    ],
  },
  {
    id: "2026-11-v270",
    date: "2026-11-04",
    title: "V270 : turbines par PJ et SAV, checklist de debug",
    items: [
      { t: "Checklist de debug", d: "Les cases cochées sont bien enregistrées." },
      { t: "Fiche d'un PJ", d: "Les sous-étapes sont toujours visibles." },
      { t: "Notifications", d: "Un commentaire de la cloche ouvre la fiche du PJ sur ses commentaires." },
      { t: "Turbines", d: "Besoins PJ et SAV : glissez une turbine disponible sur un besoin ; roue et injecteur sur la fiche projet ; demandes visibles dans la production.", admin: true },
    ],
  },
  {
    id: "2026-11-v269",
    date: "2026-11-04",
    title: "V269 : sous-étapes et dates du contrat",
    items: [
      { t: "Fiche d'un PJ", d: "Cliquez sur une étape du parcours pour voir ses sous-étapes." },
      { t: "Fiches projet", d: "Dates du contrat calculées (T0 + semaines, transport) et tableau contractuelle / prévisionnelle / effectuée.", admin: true },
    ],
  },
  {
    id: "2026-11-v268",
    date: "2026-11-04",
    title: "V268 : import des données de production",
    items: [
      { t: "Turbines › Production", d: "« Importer des données (JSON) » est disponible pour toute l'équipe qui a accès à la production turbines.", admin: true },
    ],
  },
  {
    id: "2026-11-v267",
    date: "2026-11-04",
    title: "V267 : un seul onglet Turbines",
    items: [
      { t: "Turbines", d: "La production turbines et les besoins des ORC réunis dans un seul onglet ; une turbine est attribuée à un ORC par son champ « Affaire ».", admin: true },
    ],
  },
  {
    id: "2026-11-v266",
    date: "2026-11-04",
    title: "V266 : Production turbines, gammes 100 kW et 20 kW",
    items: [
      { t: "Production turbines", d: "Deux gammes (100 kW et 20 kW), lots de roues à équilibrer, turbines reconditionnées et consommation des pièces par étape.", admin: true },
    ],
  },
  {
    id: "2026-11-v265",
    date: "2026-11-04",
    title: "V265 : nouvelle fiche d'un PJ",
    items: [
      { t: "Fiche d'un PJ", d: "Plus claire : l'étape et le départ en une ligne, les dates clés, la livraison prévue, et des onglets Tests et Commentaires." },
      { t: "Dates des fiches projet", d: "Contrat, planning initial et prévision actuelle côte à côte, pour la fin projetée et la livraison sur site client.", admin: true },
      { t: "Liaisons Cash in", d: "Plus clair : jalon réparti entre les machines, ou montant entier sur les machines cochées.", admin: true },
    ],
  },
  {
    id: "2026-11-v264",
    date: "2026-11-04",
    title: "V264 : checklist de debug",
    items: [
      { t: "Checklist de debug", d: "Tests › fiche d'une machine : la checklist de debug se coche ligne par ligne, se signe et s'exporte en Word au format de la procédure." },
    ],
  },
  {
    id: "2026-11-v263",
    date: "2026-11-04",
    title: "V263 : glisser-déposer plus fluide",
    items: [
      { t: "Glisser-déposer", d: "Ce qu'on déplace suit la souris et revient à sa place si on lâche ailleurs ; Échap annule." },
      { t: "Menus", d: "Les menus s'ouvrent depuis le bouton cliqué." },
    ],
  },
  {
    id: "2026-11-v262",
    date: "2026-11-04",
    title: "V262 : page Achats / Appro",
    items: [
      { t: "Achats / Appro", d: "Nouvelle page du menu Gestion : l'appro des composants de chaque PJ, avec les retards sur la date de besoin.", admin: true },
    ],
  },
  {
    id: "2026-11-v261",
    date: "2026-11-03",
    title: "V261 : site plus rapide à faire évoluer",
    items: [
      { t: "Sous le capot", d: "Le code principal du site est réorganisé ; rien ne change à l'écran.", admin: true },
    ],
  },
  {
    id: "2026-11-v260",
    date: "2026-11-03",
    title: "V260 : agenda des testeurs, Cash in lié au planning, retards contractuels",
    items: [
      { t: "Agenda des testeurs", d: "Page Tests › Par testeur : vos périodes de banc en fichier .ics, à ouvrir dans Outlook ou Google Agenda." },
      { t: "Cash in lié au planning", d: "Un jalon peut suivre le départ ou les tests ; la date de facturation se met à jour d'un clic.", admin: true },
      { t: "Retards contractuels", d: "Avant de publier, les PJ qui dépassent leur date contractuelle sont signalés avec les pénalités estimées.", admin: true },
      { t: "Bancs d'essai", d: "Glisser une machine dans le temps sur la frise des bancs.", admin: true },
    ],
  },
  {
    id: "2026-11-v259",
    date: "2026-11-03",
    title: "V259 : bancs en frise, nivellement réglable, clic droit pour se déplacer",
    items: [
      { t: "Se déplacer", d: "Clic droit maintenu et glisser fait défiler la zone sous la souris, partout sur le site." },
      { t: "Machines livrées", d: "Comptées depuis mai." },
      { t: "Répartitions", d: "Les camemberts indiquent toutes les valeurs, sans « Autres »." },
      { t: "Bancs d'essai", d: "Frise des 2 bancs : glisser une machine sur l'autre banc pour l'y affecter.", admin: true },
      { t: "Nivellement", d: "Période et capacité choisies avant de niveler la charge.", admin: true },
    ],
  },
  {
    id: "2026-11-v258",
    date: "2026-11-03",
    title: "V258 : planificateur — publication, annonces, dates imposées",
    items: [
      { t: "Publication", d: "Les dates publiées depuis le planificateur sont exactement celles affichées (jours sans production compris).", admin: true },
      { t: "Annonces", d: "On choisit les changements annoncés aux utilisateurs au moment de publier.", admin: true },
      { t: "Début d'une tâche", d: "La fenêtre d'une tâche dit ce qui fixe son début et permet de le choisir en gardant les liens.", admin: true },
    ],
  },
  {
    id: "2026-11-v257",
    date: "2026-11-03",
    title: "V257 : turbines par PJ, Cash in unique",
    items: [
      { t: "Turbines par PJ", d: "Dans l'onglet Turbines, une feuille pour noter par PJ la turbine, la quantité, les roues et les injecteurs prévus.", admin: true },
      { t: "Cash in", d: "Un seul Cash in ; « Prévu jusqu'à fin 2026 » est dans le cadran « À traiter ».", admin: true },
    ],
  },
  {
    id: "2026-11-v256",
    date: "2026-11-03",
    title: "V256 : Cash in au format artefact",
    items: [
      { t: "Cash in", d: "Le Cash in s'ouvre dans son format d'origine, avec le bouton « Prévu jusqu'à fin 2026 ».", admin: true },
    ],
  },
  {
    id: "2026-11-v255",
    date: "2026-11-02",
    title: "V255 : commentaires et modifications plus lisibles",
    items: [
      { t: "Commentaires", d: "Les demandes qui attendent une réponse (vous ou un collègue cité avec @) s'affichent en tête de la page, avec « Répondre » et « Marquer traité »." },
      { t: "Modifications", d: "Le journal des publications est à gauche ; à droite, une phrase résume ce qui a bougé avant le tableau détaillé." },
      { t: "Livraison prévue", d: "Saisissez la durée du transport dans la fiche projet : la livraison prévue se calcule depuis la fin projetée.", admin: true },
    ],
  },
  {
    id: "2026-11-v254",
    date: "2026-11-02",
    title: "V254 : vos projets modifiés dans la cloche",
    items: [
      { t: "Cloche", d: "Quand une mise à jour du planning modifie un de vos projets (chef de projet), la cloche vous prévient, avec le décalage du départ." },
      { t: "Planificateur", d: "En mode Couloirs, un clic sur une tâche permet de changer ses dates, sa durée et sa charge.", admin: true },
    ],
  },
  {
    id: "2026-11-v253",
    date: "2026-11-02",
    title: "V253 : Calendrier plus lisible",
    items: [
      { t: "Calendrier", d: "La production est une bande continue avec sa date de fin ; les arrivées, tests et départs sont des pastilles, et la présence client / NOBO deux petits ronds « C » et « N »." },
    ],
  },
  {
    id: "2026-11-v252",
    date: "2026-11-02",
    title: "V252 : Cash in pour les admins et corrections",
    items: [
      { t: "Cash in", d: "Ouvert aux admins, avec une vue de tout ce qui reste à facturer et à encaisser d'ici fin 2026.", admin: true },
      { t: "Commentaires", d: "Les admins suppriment un commentaire sans code, avec une simple confirmation.", admin: true },
      { t: "Connexion", d: "La vidéo de présentation se ferme correctement, et le bandeau « connexion interrompue » n'apparaît plus à la première connexion." },
    ],
  },
  {
    id: "2026-11-v251",
    date: "2026-11-02",
    title: "V251 : Gantt plus lisible",
    items: [
      { t: "Gantt", d: "Un losange gris montre le départ prévu au départ ; un pointillé le relie au départ actuel pour voir le glissement d'un coup d'œil. L'en-tête est plus léger." },
    ],
  },
  {
    id: "2026-10-v250",
    date: "2026-10-31",
    title: "V250 : des repères plus clairs",
    items: [
      { t: "Dérives", d: "La pastille rouge « +N j » indique toujours l'écart avec le planning initial. Le décalage de la dernière mise à jour est maintenant gris, avec une flèche « ↻ »." },
      { t: "Accueil", d: "Les cadrans ne sont plus coupés, et les chiffres clés suivent les mêmes couleurs que les KPI." },
    ],
  },
  {
    id: "2026-10-v249",
    date: "2026-10-31",
    title: "V249 : fenêtres vérifiées",
    items: [
      { t: "Fenêtres", d: "Le volet « Déclarer un retard », la fiche de tests et la fenêtre des états s'ouvrent de nouveau correctement, en entier et sur leur titre." },
    ],
  },
  {
    id: "2026-10-v248",
    date: "2026-10-31",
    title: "V248 : finitions des fenêtres",
    items: [
      { t: "Fenêtres", d: "L'arrière-plan est légèrement flouté sous toutes les fenêtres, et l'accueil apparaît plus vite." },
    ],
  },
  {
    id: "2026-10-v247",
    date: "2026-10-31",
    title: "V247 : fenêtres plus fluides",
    items: [
      { t: "Fenêtres", d: "Toutes les fenêtres s'ouvrent et se ferment de la même façon, en douceur. Au clavier, Tab reste dans la fenêtre ouverte et, à la fermeture, vous retrouvez le bouton d'où vous veniez." },
    ],
  },
  {
    id: "2026-10-v246",
    date: "2026-10-31",
    title: "V246 : KPI refaits",
    items: [
      { t: "KPI › Synthèse", d: "Cinq chiffres (production, départs du mois, PJ en retard, charge, livrées), les PJ à risque avec leur état, la charge plus lisible et le portefeuille en une barre.", admin: true },
      { t: "KPI › Semaines", d: "Nouvelle page : les 8 prochaines semaines en colonnes, avec la charge de l'atelier, les départs, les machines au banc et ce qui est à décider.", admin: true },
      { t: "KPI › Dérives", d: "La page s'ouvre sur la réponse : combien de machines partiront plus tard que prévu, le classement des dérives et les départs du mois.", admin: true },
    ],
  },
  {
    id: "2026-10-v245",
    date: "2026-10-30",
    title: "V245 : tout voir avec un affichage agrandi",
    items: [
      { t: "Affichage agrandi", d: "Si Windows agrandit l'affichage (125 %, 150 %), le site vous indique le zoom à faire (Ctrl et −) pour retrouver toutes les colonnes de la Liste. Le navigateur s'en souvient." },
    ],
  },
  {
    id: "2026-10-v244",
    date: "2026-10-30",
    title: "V244 : lecteur vidéo et pop-up Nouveautés",
    items: [
      { t: "Vidéo", d: "La fenêtre de la vidéo tient dans l'écran et garde toujours son bouton « Fermer »." },
      { t: "Nouveautés", d: "Le pop-up des nouveautés présente toutes les lignes à la suite, sans numéro de version.", admin: true },
    ],
  },
  {
    id: "2026-10-v243",
    date: "2026-10-30",
    title: "V243 : machines livrées = machines expédiées",
    items: [
      { t: "Machines livrées", d: "Le compteur des machines livrées compte maintenant les machines à l'état « Expédiée ». Les machines dont le départ est passé sans être « Expédiée » sont signalées juste en dessous, pour mettre leur état à jour." },
    ],
  },
  {
    id: "2026-10-v242",
    date: "2026-10-30",
    title: "V242 : la vidéo de présentation",
    items: [
      { t: "Vidéo", d: "Une vidéo de présentation du Cockpit vous est proposée à votre prochaine connexion. Pendant une semaine, vous la retrouvez dans la cloche en haut à droite." },
    ],
  },
  {
    id: "2026-10-v241",
    date: "2026-10-30",
    title: "V241 : projets EPC, le chef de projet est celui de l'EPC",
    items: [
      { t: "Projets EPC", d: "Pour un projet EPC, le chef de projet de la fiche (celui de l'EPC) est celui qui figure dans la Liste, les regroupements et les accueils. Le chef de projet ORC est en soutien : il apparaît seulement dans la fiche (« soutien ORC »), sans lien avec le projet EPC." },
    ],
  },
  {
    id: "2026-10-v240",
    date: "2026-10-30",
    title: "V240 : la cloche passe au rouge",
    items: [
      { t: "Cloche", d: "Quand une demande vous attend, la cloche en haut à droite et sa pastille passent en rouge." },
    ],
  },
  {
    id: "2026-10-v239",
    date: "2026-10-30",
    title: "V239 : les PJXX ne comptent nulle part",
    items: [
      { t: "Planificateur", d: "Les PJXX (estimations, pas des PJ vendus) ne sont plus publiés, ne comptent plus dans la charge atelier et n'apparaissent plus dans les modifications ni dans les écarts avant publication.", admin: true },
    ],
  },
  {
    id: "2026-10-v238",
    date: "2026-10-29",
    title: "V238 : personnes, rôles et responsable des testeurs",
    items: [
      { t: "Responsable des testeurs", d: "Nouveau rôle : il voit les machines en test de tous les testeurs (accueil et page Tests) et renseigne l'avancement de chaque test." },
      { t: "Personnes et rôles", d: "Retirer une personne de la liste (et la rétablir), ou coller une liste d'adresses @enogia.com pour ajouter plusieurs personnes d'un coup." },
      { t: "Mentions", d: "Les personnes ajoutées dans Personnes et rôles peuvent être taguées avec @, même si elles ne se sont jamais connectées." },
    ],
  },
  {
    id: "2026-10-v237",
    date: "2026-10-29",
    title: "V237 : nouvelle adresse du site",
    items: [
      { t: "Adresse", d: "Le site est maintenant à l'adresse cockpit-bu-orc.github.io/ENOGIA (bêta : cockpit-bu-orc.github.io/ENOGIA/beta). L'ancienne adresse ne fonctionne plus : mettez à jour vos favoris et réinstallez l'appli sur téléphone." },
    ],
  },
  {
    id: "2026-10-v236",
    date: "2026-10-29",
    title: "V236 : le site s'appelle « Cockpit BU ORC »",
    items: [
      { t: "Nom du site", d: "« Cockpit BU ORC » : « Cockpit » en gras, « BU ORC » surligné." },
    ],
  },
  {
    id: "2026-10-v235",
    date: "2026-10-29",
    title: "V235 : plus de cadrans, disposition commune",
    items: [
      { t: "Cadrans", d: "Nouveaux cadrans : dernières expédiées, visites client / NOBO, au banc cette semaine, machines par état, départs par mois, fermetures à venir, raccourcis vers les pages." },
      { t: "Disposition", d: "La disposition des cadrans (accueil, KPI, Tests) est la même pour tout le monde et seul le propriétaire peut la changer." },
    ],
  },
  {
    id: "2026-10-v234",
    date: "2026-10-29",
    title: "V234 : le site s'appelle « Cockpit ORC »",
    items: [
      { t: "Nom du site", d: "Le site s'appelle maintenant « Cockpit ORC » : « Cockpit » en gras, « ORC » surligné, dans le menu, l'accueil, l'écran de connexion et l'onglet du navigateur." },
    ],
  },
  {
    id: "2026-10-v233",
    date: "2026-10-29",
    title: "V233 : un fond plus discret",
    items: [
      { t: "Fond", d: "Le fond est plus discret : papier millimétré et un seul dessin pâle par page (cycle ORC, diagramme de Mollier ou rotor de turbine), sans texte. Les tableaux ont eux aussi un papier millimétré très léger." },
      { t: "Barre du haut", d: "Le nombre d'unités et la date de mise à jour ne sont plus affichés en haut de page." },
    ],
  },
  {
    id: "2026-10-v232",
    date: "2026-10-29",
    title: "V232 : le site s'appelle « BU ORC – Pilotage »",
    items: [
      { t: "Nom du site", d: "« BU ORC – Pilotage » remplace « ENOGIA – BU ORC » (menu, accueil, connexion, onglet du navigateur, appli installée). Le sous-titre ne change pas." },
    ],
  },
  {
    id: "2026-10-v231",
    date: "2026-10-29",
    title: "V231 : tout se fait sur le site, accueils de chaque poste visibles",
    items: [
      { t: "Planning", d: "Plus d'import de planning MS Project ni de planning initial : le planning actuel fait foi et ne change plus que par « Publier » dans le Planificateur. L'onglet Modifications devient le journal des publications." },
      { t: "Accueil", d: "Le propriétaire choisit l'accueil affiché (direction, chef de projet, testeur, chef d'atelier, directeur turbines, autres) et la personne vue. « Ajouter un cadran » range les cadrans par page du site, avec ce que chacun montre." },
      { t: "Tests", d: "Une machine expédiée a ses tests faits : elle n'apparaît plus en retard ni à faire." },
      { t: "Fond des pages", d: "Papier millimétré léger, motif de la page annoté (repères, cotes) en haut à droite et second motif en bas à gauche." },
    ],
  },
  {
    id: "2026-10-v230",
    date: "2026-10-29",
    title: "V230 : cadrans libres, états modifiables, bancs et couloirs",
    items: [
      { t: "Cadrans", d: "Placement libre : un cadran se pose où l'on veut (y compris en laissant du vide) ; seuls les cadrans qu'il recouvre descendent. La hauteur se règle en tirant le bord bas, la largeur au bord droit, les deux au coin." },
      { t: "États", d: "« Fabrication/Montage Fournisseurs » ; le Stockage externe peut être avant le montage interne ou après les tests et le packaging. Dans « Gérer les états », les états existants se renomment, se recolorent et reçoivent une explication (fiche du PJ) ; « Rétablir » revient à l'origine." },
      { t: "Planificateur", d: "Le ⚠ rouge des bancs ne compte plus les PJ archivés, expédiés, les slots libres ni les tests terminés ; « Répartir les tests sur les 2 bancs » active aussi « une machine à la fois par banc ». La priorité passe à gauche du n° de PJ ; boutons Priorité et S/N pour les masquer. En Couloirs, la charge atelier suit le défilement et s'aligne sur les couloirs." },
    ],
  },
  {
    id: "2026-10-v229",
    date: "2026-10-29",
    title: "V229 : un accueil pour chaque poste",
    items: [
      { t: "Accueil", d: "Chaque poste a son accueil et sa phrase d'ouverture : chef de projet (mes PJ, jalons, à traiter, FAT, avancement), testeur (au banc aujourd'hui, fiches à signer, ma semaine, arrivées au banc, résultats), chef d'atelier (charge, arrivées et départs, en montage, postes de test), directeur de production turbines (turbines prêtes, sans roue, pièces, dates prévisionnelles, stocks) et une page de base pour les autres personnes." },
    ],
  },
  {
    id: "2026-10-v228",
    date: "2026-10-29",
    title: "V228 : états plus clairs",
    items: [
      { t: "États", d: "« Fabrication FNR » devient « Fabrication fournisseurs » : l'ORC (armoire et skid) est fabriqué et monté chez les fournisseurs. « Non désignée » devient « Design en cours » : le design de l'ORC n'est pas encore complètement défini, la commande ne peut pas être passée." },
      { t: "Cadrans", d: "Disposition plus sobre : on glisse le cadran, on tire son bord droit ; plus de flèches ni de boutons sur les cadrans." },
    ],
  },
  {
    id: "2026-10-v227",
    date: "2026-10-29",
    title: "V227 : Production turbines — correction des fiches",
    items: [
      { t: "Production turbines", d: "Les turbines, arbres, pièces et références enregistrées se rouvrent et se modifient correctement.", admin: true },
    ],
  },
  {
    id: "2026-10-v226",
    date: "2026-10-29",
    title: "V226 : page Production turbines",
    items: [
      { t: "Production turbines", d: "Nouvelle page (menu Gestion) pour le suivi du montage des turbines : turbines prêtes et testées sans roue, stocks de roues et d'injecteurs, dates prévisionnelles, pièces (appro, contrôle qualité, non-conformités), tableau des turbines et des arbres où l'on glisse une carte pour changer d'étape, gamme et durées.", admin: true },
    ],
  },
  {
    id: "2026-10-v225",
    date: "2026-10-29",
    title: "V225 : un fond léger pour chaque page",
    items: [
      { t: "Fonds de page", d: "Chaque page a son motif discret dans le coin haut droit, en clair comme en sombre : cycle ORC sur l'accueil, tuyauterie sur la Liste, traces de mesure sur le Gantt et les Tests, isothermes sur le Calendrier, rotor de turbine sur le Manager." },
    ],
  },
  {
    id: "2026-10-v224",
    date: "2026-10-29",
    title: "V224 : bancs d'essai, zoom du planificateur, résumé des projets à plusieurs machines",
    items: [
      { t: "Fiches projet", d: "La fiche commune d'un PJ à plusieurs machines (PJ461-1, -2…) commence par un résumé : machines, avancement moyen, plus grande dérive, retards déclarés, FAT à venir, états, jalons et derniers messages.", admin: true },
      { t: "Accueil", d: "Les chiffres clés font partie des cadrans de l'accueil." },
    ],
  },
  {
    id: "2026-10-v223",
    date: "2026-10-28",
    title: "V223 : isothermes sur l'accueil",
    items: [
      { t: "Accueil", d: "Des courbes isothermes légères dans le coin haut droit donnent du relief au fond de l'accueil, en clair comme en sombre." },
    ],
  },
  {
    id: "2026-10-v222",
    date: "2026-10-28",
    title: "V222 : disposez vos cadrans",
    items: [
      { t: "Disposer les cadrans", d: "Sur l'accueil, KPI › Synthèse et Tests › Par semaine : « Disposer les cadrans » permet de les déplacer (glisser, ou ◀ ▶) et de les élargir ou rétrécir (− +). Votre disposition est gardée sur ce poste ; « Réinitialiser » revient à l'origine." },
    ],
  },
  {
    id: "2026-10-v221",
    date: "2026-10-28",
    title: "V221 : Machines ORC réparé, fiches regroupées par projet, liens plus simples",
    items: [
      { t: "Machines ORC", d: "Le menu du Manager ouvre bien la page Machines ORC (elle s'affichait vide).", admin: true },
      { t: "Fiches regroupées", d: "Dans Fiches projet, les machines d'un même PJ (PJ461-1, PJ461-2…) sont regroupées ; un clic sur le groupe affiche leur synthèse commune. Case pour désactiver.", admin: true },
      { t: "Calendrier", d: "Un clic sur la tuile d'un PJ ouvre sa fiche habituelle, avec un bouton « Pas de production le JJ/MM » (ou « Rétablir ») pour ce PJ seulement.", admin: true },
      { t: "Planificateur", d: "« Lier » ouvre une fenêtre à listes : commence après…, doit être finie avant…, type et décalage, liens existants supprimables. Slots libres masqués (case pour les afficher).", admin: true },
    ],
  },
  {
    id: "2026-10-v220",
    date: "2026-10-28",
    title: "V220 : le site devient « ENOGIA – BU ORC »",
    items: [
      { t: "Nouveau nom", d: "L'outil couvre maintenant toute la BU ORC : il s'appelle « ENOGIA – BU ORC », avec le sous-titre « Ordonnancement · Production · Tests · Projets · Cash in » (menu, connexion, titre de l'onglet, icône installée)." },
    ],
  },
  {
    id: "2026-10-v219",
    date: "2026-10-28",
    title: "V219 : KPI — la charge du planificateur, des camemberts, une sous-page Explorer",
    items: [
      { t: "Charge du planificateur", d: "La charge des KPI (Synthèse et Charge) vient du planificateur : heures planifiées, capacité de chaque semaine (y compris les semaines spéciales), jours fermés et sans production déduits.", admin: true },
      { t: "Camemberts", d: "Les répartitions (états, pays, gammes, causes et PJ en retard) sont en camemberts, avec les plus grandes parts et « Autres ».", admin: true },
      { t: "Plus clair", d: "La Synthèse ne garde que le pilotage ; répartitions et explorateur libre ont leur sous-page « Explorer ».", admin: true },
    ],
  },
  {
    id: "2026-10-v218",
    date: "2026-10-28",
    title: "V218 : un clic sur la tuile d'un PJ, et le planificateur suit",
    items: [
      { t: "Clic sur la tuile", d: "Dans le Calendrier (vue Jour), un clic sur la tuile d'un PJ un jour ouvré de sa production ouvre : pas de production ce jour pour ce PJ (ou la rétablir), ouvrir sa fiche, ou fermer l'atelier ce jour-là.", admin: true },
      { t: "Le planificateur suit", d: "Les jours sans production d'un PJ allongent ses tâches d'atelier d'autant (hachures sur la barre) et ne comptent pas dans la charge ; les fermetures de l'atelier étaient déjà prises en compte.", admin: true },
    ],
  },
  {
    id: "2026-10-v217",
    date: "2026-10-28",
    title: "V217 : Cash in et Turbines en pages, un Manager mieux rangé",
    items: [
      { t: "Cash in et Turbines", d: "Dans le menu de gauche, ce sont maintenant de vraies pages du site (plus des onglets du Manager).", admin: true },
      { t: "Machines ORC sur une page", d: "N° de série, chef de projet, pays, état et présence client / NOBO aux tests dans le même tableau ; « Gérer les états » y est aussi.", admin: true },
      { t: "Manager regroupé", d: "Pilotage : KPI et Retards (Déclarer, Analyse). Projets : Fiches projet (et Point hebdo), Machines ORC. Réglages : Calendrier de production (jours sans production, fermetures) et Personnes et site.", admin: true },
      { t: "Nouveaux PJ à l'import", d: "Après un import du planning, les PJ absents du planning initial sont signalés avec un bouton pour les y ancrer.", admin: true },
    ],
  },
  {
    id: "2026-10-v216",
    date: "2026-10-28",
    title: "V216 : les pages KPI parlent la même langue",
    items: [
      { t: "Chiffres clés", d: "Sur Charge, Dérives, Avancement et Retards : libellé, chiffre, une ligne d'explication, comme la Synthèse ; rouge seulement quand c'est mauvais.", admin: true },
      { t: "Retards en classement", d: "Causes et PJ les plus touchés en barres triées d'une seule couleur, à la place des camemberts à 8 parts.", admin: true },
      { t: "Graphiques plus nets", d: "Grille légère horizontale, lignes fines sans points, barres nettes, couleurs des étapes pour la charge, plus de lignes alternées ni de total au centre des anneaux.", admin: true },
    ],
  },
  {
    id: "2026-10-v215",
    date: "2026-10-28",
    title: "V215 : KPI — un tableau de pilotage",
    items: [
      { t: "Cinq chiffres", d: "En tête de KPI › Synthèse : machines en production, départs d'ici 30 jours (et combien en dérive), dérive moyenne du départ, charge des 4 prochaines semaines face à la capacité, PJ avec un retard déclaré et leur 1re cause.", admin: true },
      { t: "PJ à risque", d: "Les PJ dont le départ dérive le plus, triés, avec leur état et leur date de départ ; un clic ouvre la fiche projet.", admin: true },
      { t: "Charge et portefeuille", d: "La charge atelier des 6 prochaines semaines face à la capacité (jours fermés et sans production déduits) et le portefeuille par état en une barre.", admin: true },
    ],
  },
  {
    id: "2026-10-v214",
    date: "2026-10-28",
    title: "V214 : planificateur — lignes plus basses, liens en tirant, phase et ressource",
    items: [
      { t: "Hauteur des lignes", d: "Un curseur « Hauteur des lignes » règle la hauteur des lignes du Gantt (Arrivée, Production, Tests…), de 24 à 44 px.", admin: true },
      { t: "Lier en tirant", d: "Tirez une barre vers le haut ou le bas et lâchez-la sur la tâche qui suit : le lien fin → début est créé (« Lier » reste disponible).", admin: true },
      { t: "Phase et ressource", d: "Sur chaque tâche, un clic sur sa ressource choisit la phase (Production, Tests, Packing) et la ressource (atelier, testeur, un testeur nommé). « ＋ Ajouter une tâche » ouvre la fenêtre complète.", admin: true },
    ],
  },
  {
    id: "2026-10-v213",
    date: "2026-10-28",
    title: "V213 : les jours de production se règlent dans le Calendrier",
    items: [
      { t: "Un clic sur un jour", d: "Dans le Calendrier (vue Jour), un clic sur la date ouvre ses options : jour non travaillé pour tout l'atelier, ou pas de production pour certains PJ ce jour-là.", admin: true },
      { t: "Le Gantt suit", d: "Les jours fermés ou sans production coupent les barres du Gantt (hachures) ; une info-bulle dit pourquoi." },
      { t: "La charge suit", d: "La charge atelier des KPI se répartit sur les jours réellement travaillés : un jour retiré n'est plus compté.", admin: true },
    ],
  },
  {
    id: "2026-10-v212",
    date: "2026-10-28",
    title: "V212 : un Manager plus simple, Cash in à portée de clic",
    items: [
      { t: "Cash in et Turbines dans le menu", d: "Les personnes qui ont accès au Cash in le trouvent directement dans le menu de gauche (rubrique Gestion), avec les Turbines pour le propriétaire.", admin: true },
      { t: "Sous-menus en surimpression", d: "Dans le Manager, survolez une rubrique du menu : ses sous-pages s'ouvrent à côté, un clic suffit.", admin: true },
      { t: "Machines ORC", d: "Une seule page pour chaque machine : N° de série, chef de projet, pays et état, plus « Statut & présence ». L'onglet Suivi disparaît (la santé des projets est dans les fiches).", admin: true },
      { t: "Fiche projet et Point hebdo", d: "Le point hebdo devient une sous-page de Fiche projet.", admin: true },
      { t: "Réglages", d: "« Accès Manager » et « Personnes et rôles » ne font plus qu'une page ; l'onglet Imports est supprimé (le repère Planning initial est en tête des KPI › Synthèse).", admin: true },
    ],
  },
  {
    id: "2026-10-v211",
    date: "2026-10-28",
    title: "V211 : planificateur — nouveaux PJ et tâches, 2 bancs, liens en deux clics",
    items: [
      { t: "Nouveau PJ", d: "« ＋ Nouveau PJ » crée un PJ avec ses tâches Arrivée → Production → Tests → Packing → Départ, enchaînées, durées du modèle de la gamme, ressources (atelier, banc, testeur) et tâches supplémentaires. Un PJ du planning reprend ses dates.", admin: true },
      { t: "Tâches", d: "« ＋ Tâche » ajoute une tâche à un PJ (phase Production / Tests / Packing, ressource, durée, heures, placée après une autre) ; ⋮⋮ pour changer l'ordre des tâches ; « Fin de production » s'appelle Packing.", admin: true },
      { t: "Liens en deux clics", d: "« Lier » sur une tâche, puis clic sur la tâche qui doit suivre ; un message confirme le lien.", admin: true },
      { t: "2 bancs de tests", d: "Chaque PJ a son banc (Banc 1 / 2 sur la ligne Tests), deux couloirs de bancs, et « Répartir les tests sur les 2 bancs » dans Règles.", admin: true },
      { t: "Navigation", d: "Clic droit maintenu pour faire glisser le Gantt et les couloirs ; tâche mère plus fine ; hauteur des couloirs au curseur ; la liste laisse la place au Gantt sur un petit écran.", admin: true },
    ],
  },
  {
    id: "2026-10-v210",
    date: "2026-10-28",
    title: "V210 : Cash in pour les chefs de projet, tous les PJ dans le planning des bancs",
    items: [
      { t: "Cash in ouvert aux admins", d: "Les chefs de projet admins remplissent et mettent à jour le Cash in depuis leur session, et retrouvent le bloc Cash in sur leur accueil.", admin: true },
      { t: "Cash in allégé", d: "Plus de boutons « Sauvegarde JSON » ni « Importer / Reprendre un fichier », plus de mention technique.", admin: true },
      { t: "Planning des bancs", d: "Tous les PJ en cours avec une période de tests, chacun sur sa ligne, en colonnes séparées : PJ, gamme, testeur, client, NOBO, tests. Hors des 3 semaines, une flèche dit quand ; option « PJ sans période »." },
    ],
  },
  {
    id: "2026-10-v209",
    date: "2026-10-28",
    title: "V209 : la page Tests en grille, claire et alignée",
    items: [
      { t: "Planning des bancs", d: "Sous le bandeau « Au banc maintenant », une ligne par machine sur 3 semaines : n° de PJ, gamme, testeurs, avancement, puis la barre de ses jours de tests (or en cours, rouge en retard, vert terminé, contour = prévu) et les venues client / NOBO. ◀ ▶ pour avancer d'une semaine." },
      { t: "Par testeur", d: "La même grille, une ligne par testeur : ses machines, ou « libre ». On affecte toujours en glissant une barre sur un testeur." },
      { t: "Catalogue", d: "Un tableau par partie (interne, client, NOBO) : n°, test, objectifs, actions." },
    ],
  },
  {
    id: "2026-10-v208",
    date: "2026-10-28",
    title: "V208 : un planificateur plus lisible",
    items: [
      { t: "La charge toujours sous les yeux", d: "Le graphique de charge atelier reste collé en bas de l'écran (Gantt, liste et couloirs) ; « Réduire » le rend plus bas.", admin: true },
      { t: "Capacité d'une semaine", d: "Cliquez une semaine du graphique pour lui donner sa propre capacité (absences, renfort, fermeture) ; « Revenir à la normale » l'efface. Le nivellement en tient compte.", admin: true },
      { t: "On se repère", d: "Chaque barre du Gantt porte le n° du PJ et le nom de la tâche (dedans, ou juste après si elle est courte) ; dans les couloirs, le n° de PJ est toujours écrit.", admin: true },
      { t: "À votre taille", d: "Couloirs serrés, normaux ou larges ; largeur de la liste réglable en « Liste + Gantt » en glissant son bord (double-clic : largeur normale).", admin: true },
      { t: "Mode sombre", d: "Textes, boutons, flèches de liens, couloirs et infobulles relisent les couleurs du thème : plus de texte invisible.", admin: true },
    ],
  },
  {
    id: "2026-10-v207",
    date: "2026-10-27",
    title: "V207 : les tests en grand calendrier",
    items: [
      { t: "Un calendrier à la place des colonnes", d: "Trois semaines du lundi au vendredi : chaque machine est une barre posée sur ses jours de tests, avec la gamme, le testeur, « jour 2 / 4 » ou le retard et sa barre test par test." },
      { t: "Lisible d'un coup d'œil", d: "Or en cours, rouge en retard, vert terminé, neutre à venir ; contour orange si un testeur est pris ailleurs. Aujourd'hui est surligné, les jours fériés grisés, les venues client et NOBO posées sur leur jour." },
      { t: "Toujours en tête", d: "Le bandeau « Au banc maintenant » et les derniers résultats restent au-dessus du calendrier ; un clic sur une barre ouvre la fiche de tests." },
    ],
  },
  {
    id: "2026-10-v206",
    date: "2026-10-27",
    title: "V206 : le planificateur repart de vos dates",
    items: [
      { t: "Reprendre les dates du planning", d: "Un bouton recrée le plan avec les dates actuelles de tous les PJ, en gardant la capacité et les modèles par gamme (Ctrl+Z pour revenir).", admin: true },
      { t: "Une charge plus complète", d: "Un PJ sans heures atelier reprend le modèle de sa gamme, sinon la moyenne des PJ de la même gamme ; c'est signalé en tête et ces estimations ne sont jamais publiées.", admin: true },
    ],
  },
  {
    id: "2026-10-v205",
    date: "2026-10-27",
    title: "V205 : la page Tests prend vie",
    items: [
      { t: "Au banc maintenant", d: "En tête de la vue par semaine, une carte par machine en test aujourd'hui : avancement en anneau, test en cours, testeurs, « jour 3 / 5 » ou le retard, et la prochaine machine attendue." },
      { t: "Une barre par test", d: "La barre d'avancement est découpée test par test : vert réussi, or en cours, rouge échec, gris à faire (cartes, bandeau et fiche de tests)." },
      { t: "Derniers résultats", d: "Le fil des réussites et des échecs des 14 derniers jours, avec le testeur et l'heure ; un clic ouvre la fiche de la machine." },
    ],
  },
  {
    id: "2026-10-v204",
    date: "2026-10-27",
    title: "V204 : le planificateur, rien que pour vous",
    items: [
      { t: "Onglet Planificateur", d: "Sous Tests, réservé au propriétaire : ordre des machines, arrivées, durées, liens entre PJ, dates forcées et charge par semaine, dans un brouillon qui ne change rien pour les autres avant « Publier ».", admin: true },
      { t: "Modèles par gamme", d: "Durées et heures habituelles de chaque phase par gamme, modifiables et applicables aux PJ en un clic.", admin: true },
      { t: "Fiche PJ", d: "Les sous-étapes d'une étape s'affichent quand on clique dessus (plus au survol)." },
    ],
  },
  {
    id: "2026-10-v203",
    date: "2026-10-27",
    title: "V203 : une seule fiche PJ, qui explique où en est la machine",
    items: [
      { t: "La même fiche partout", d: "Liste, Gantt, Calendrier et accueil ouvrent la même fiche au centre de l'écran (sur téléphone, elle monte du bas)." },
      { t: "Où en est la machine", d: "L'avancement en anneau, le nom de l'étape et ce qu'elle signifie, l'étape suivante, puis les sous-étapes (survolez une étape pour voir les siennes)." },
      { t: "Le calendrier en un coup d'œil", d: "Une mini-frise avec aujourd'hui, le départ et l'écart au planning initial, et les pastilles utiles : présence, tests, turbine." },
    ],
  },
  {
    id: "2026-10-v202",
    date: "2026-10-27",
    title: "V202 : la fiche PJ en pop-up central, PV de debug au format ENOGIA",
    items: [
      { t: "Fiche PJ au centre de l'écran", d: "Dans la Liste, la fiche s'ouvre au centre avec un flou derrière, en douceur, et se referme de la même façon. On y retrouve le parcours avec le nom de chaque étape." },
      { t: "PV de debug machine", d: "Le PDF des tests devient le PV de debug machine interne, à la forme du modèle ENOGIA : page de garde, informations de la machine, résultats et validation." },
      { t: "Écrans mieux proportionnés", d: "Les graphiques et les grilles du Manager reprennent une taille adaptée à l'écran." },
    ],
  },
  {
    id: "2026-10-v201",
    date: "2026-10-27",
    title: "V201 : la fiche suiveuse, des cadres à la bonne taille",
    items: [
      { t: "Fiche suiveuse dans la Liste", d: "Le détail d'un PJ montre le parcours avec le nom de chaque étape (faites, en cours, à venir et leurs dates), puis le chef de projet, la présence, le dernier commentaire et trois actions." },
      { t: "Moins de blanc", d: "Les cadres prennent la taille de leur contenu : marges réduites, graphiques à la hauteur de leurs données, angles harmonisés." },
    ],
  },
  {
    id: "2026-10-v200",
    date: "2026-10-27",
    title: "V200 : fiche PDF en trois pages, tests terminés",
    items: [
      { t: "Fiche PDF des tests", d: "Une page de garde avec le résultat (conforme, non conforme ou non terminé), une page d'informations sur la machine, puis les résultats des tests et la validation signée." },
      { t: "Colonne « Terminés »", d: "Sur la page Tests, une machine dont tous les tests sont faits (ou validée) passe dans une colonne « Terminés », comme dans un Kanban." },
    ],
  },
  {
    id: "2026-10-v199",
    date: "2026-10-27",
    title: "V199 : le détail d'un PJ se déplie dans la Liste",
    items: [
      { t: "Plus de fenêtre ni de volet dans la Liste", d: "Un clic sur une ligne déplie le détail juste dessous : parcours, chiffres clés, commentaires, retards et actions. Un second clic ou Échap le replie." },
      { t: "Plus de place pour les colonnes", d: "Sans le volet de droite, la Liste occupe toute la largeur." },
    ],
  },
  {
    id: "2026-10-v198",
    date: "2026-10-27",
    title: "V198 : le tableau du Cash in, comme dans l'artefact",
    items: [
      { t: "Grand tableau modifiable", d: "Le Cash in reprend le tableau de l'artefact, directement dans le site : montant, dates prévues au départ, actualisées et réelles, statut et commentaire se modifient dans la cellule.", admin: true },
    ],
  },
  {
    id: "2026-10-v197",
    date: "2026-10-27",
    title: "V197 : un seul thème, tests plus compacts",
    items: [
      { t: "Un seul thème", d: "Le clair d'Ardoise et le sombre de Salle de contrôle forment désormais un thème unique ; il ne reste que le choix clair / sombre." },
      { t: "Page Tests plus compacte", d: "Chaque machine tient sur deux lignes : PJ, gamme, projet, dates, testeurs, signaux et avancement." },
      { t: "Liste plus lisible", d: "Le point de dérive à côté du PJ disparaît (l'écart est déjà dans la colonne Départ) ; les étiquettes de l'import restent." },
      { t: "Projets EPC", d: "Pour un projet EPC, c'est le chef de projet ORC qui apparaît dans les listes et les regroupements." },
      { t: "Manager en pleine largeur", d: "Les pages du Manager prennent tout l'écran, avec des tableaux plus réguliers.", admin: true },
    ],
  },
  {
    id: "2026-10-v196",
    date: "2026-10-27",
    title: "V196 : un espace Manager plus aéré",
    items: [
      { t: "Un seul menu", d: "Dans le Manager, le menu de gauche affiche directement ses rubriques (KPI, Suivi, Retards, Fiches…) ; « Revenir au planning » en haut.", admin: true },
      { t: "Sous-pages en onglets", d: "Chaque page a le même en-tête : titre, une phrase, actions à droite, puis ses sous-pages en onglets. Les filtres se rangent dans un bouton.", admin: true },
      { t: "Fiches projet", d: "La liste des projets se replie en languette : la fiche prend toute la largeur.", admin: true },
    ],
  },
  {
    id: "2026-10-v195",
    date: "2026-10-27",
    title: "V195 : menu, signatures en image, accueil plus fluide",
    items: [
      { t: "Menu de gauche", d: "Il reste en mini-barre ; la flèche du bas l'ouvre en entier, et il se replie dès que vous choisissez une page." },
      { t: "Signer une fiche de tests", d: "Chaque testeur indique son nom, sa fonction et dépose l'image de sa signature. La fiche PDF ne garde que ces signatures." },
      { t: "Accueil", d: "Les tuiles apparaissent plus en douceur et prennent la place qu'il leur faut." },
      { t: "Chefs de projet", d: "Le chef de projet d'une fiche se saisit librement : un nouveau nom peut être ajouté." },
      { t: "Cash in", d: "Le Cash in retrouve le format de l'artefact ; la nouvelle présentation reste à un clic.", admin: true },
    ],
  },
  {
    id: "2026-10-v194",
    date: "2026-10-27",
    title: "V194 : Cash in complet dans le site",
    items: [
      { t: "Projets, Cash par mois, Écarts", d: "Les trois vues du Cash in sont maintenant dans le site : synthèse par PJ, cash mois par mois (initial vs réel, tenue des dates, tableau PJ × mois) et écarts en jours.", admin: true },
    ],
  },
  {
    id: "2026-10-v193",
    date: "2026-10-27",
    title: "V193 : le Cash in intégré au site",
    items: [
      { t: "Cash in dans le site", d: "Plus de page à part : chiffres clés, « À traiter », jalons par PJ et volet d'édition, aux couleurs du site. Import, sauvegarde et export Excel conservés.", admin: true },
    ],
  },
  {
    id: "2026-10-v192",
    date: "2026-10-27",
    title: "V192 : des couleurs d'état bien distinctes",
    items: [
      { t: "Chaque état a sa couleur", d: "Plus de couleurs presque identiques : avant production en rouge, lilas et orange, montage en bleus, tests en or, packaging en sarcelle, expédiée en vert foncé." },
      { t: "Étiquettes Client et NOBO", d: "Nouvelles étiquettes avec icône, liseré (bleu acier pour le client, rouge pour NOBO) et date." },
      { t: "Camemberts plus lisibles", d: "Les parts par pays et par chef de projet ont chacune une teinte franche." },
    ],
  },
  {
    id: "2026-10-v191",
    date: "2026-10-27",
    title: "V191 : menus discrets, projets EPC, plusieurs chefs de projet",
    items: [
      { t: "Menus qui se replient seuls", d: "Le menu de gauche et celui du Manager restent réduits et s'ouvrent au survol ; une épingle les garde ouverts." },
      { t: "Plusieurs chefs de projet", d: "Un projet peut avoir plusieurs chefs ; il apparaît chez chacun d'eux (fiches, filtres, accueil)." },
      { t: "Projets EPC", d: "Une pastille EPC, avec le chef de projet ORC, signale les projets EPC dans la liste et les fiches." },
      { t: "Machines expédiées masquées", d: "Les machines expédiées n'apparaissent plus dans la liste des fiches projet (case « Expédiées » pour les revoir)." },
      { t: "Accueil réglé par le super admin", d: "Rôle et blocs de l'accueil de chaque personne dans Manager › Réglages › Personnes et rôles ; le Cash in apparaît sur l'accueil direction.", admin: true },
    ],
  },
  {
    id: "2026-10-v190",
    date: "2026-10-27",
    title: "V190 : fiches par chef de projet, fiche PJ plus claire",
    items: [
      { t: "Une fiche PJ plus claire", d: "En-tête sur une ligne, parcours en 5 étapes avec l'étape en cours, prochain jalon, écart, client / NOBO et dernier commentaire ; actions en bas." },
      { t: "Tous les projets d'un chef d'un coup", d: "Dans les fiches projet, la liste se range par chef de projet ; un clic sur son nom affiche tous ses projets en cartes.", admin: true },
    ],
  },
  {
    id: "2026-10-v189",
    date: "2026-10-27",
    title: "V189 : tests en pop-up, calendrier et fiche PDF signée",
    items: [
      { t: "La fiche de tests en grand", d: "Un clic sur une machine ouvre sa fiche au centre de l'écran : avancement, réussis, échecs, testeurs et tests." },
      { t: "Signer ses tests", d: "Chaque testeur signe au doigt ou à la souris ; la fiche PDF reprend le projet, les tests, les heures et les signatures, au format ENOGIA." },
      { t: "Nouveau calendrier des tests", d: "Deux semaines par testeur, une barre par machine avec sa gamme et son avancement ; ligne « Sans testeur » en évidence." },
      { t: "Affecter en glissant", d: "Glissez une barre du calendrier sur un testeur pour lui confier la machine.", admin: true },
    ],
  },
  {
    id: "2026-10-v188",
    date: "2026-10-27",
    title: "V188 : un accueil pour chaque rôle",
    items: [
      { t: "Votre accueil selon votre rôle", d: "Testeur : vos tests du jour, fiches à signer, votre semaine. Chef de projet : vos PJ et retards, jalons des 3 semaines, FAT client. Chef d'atelier : arrivées, départs et postes de test." },
      { t: "Affecté aux tests ? Vous êtes prévenu", d: "La cloche signale les nouvelles affectations aux tests, avec un lien pour les ajouter à votre agenda Google." },
      { t: "Personnes et rôles", d: "Manager › Réglages : rôle de chaque compte et ses PJ, un par un ou tous ceux d'un chef de projet d'un coup.", admin: true },
      { t: "Invitations Google Agenda", d: "Sur la fiche de tests, « Inviter les testeurs » ouvre Google Agenda avec la période et les testeurs déjà invités.", admin: true },
    ],
  },
  {
    id: "2026-10-v187",
    date: "2026-10-27",
    title: "V187 : les testeurs renseignent leurs tests",
    items: [
      { t: "Avancement par les testeurs", d: "Le testeur affecté indique pour chaque test : à faire, en cours, réussi ou échec. Son nom, la date et l'heure sont enregistrés." },
      { t: "Gamme sur chaque carte", d: "La gamme de la machine (ORC 50, ORC 100…) apparaît sur la carte et dans le volet de détail." },
      { t: "Anciennes machines", d: "Une fois la période de tests passée, un admin peut forcer la validation, même sans testeur ni test coché.", admin: true },
      { t: "Titres", d: "Titres de page plus grands ; le titre répété sous l'en-tête de la page Tests est retiré." },
    ],
  },
  {
    id: "2026-10-v186",
    date: "2026-10-27",
    title: "V186 : une page Tests par semaine",
    items: [
      { t: "Les tests de la semaine en un coup d'œil", d: "Trois colonnes : cette semaine, la semaine prochaine, dans deux semaines. Chaque machine en test y a sa carte : testeurs, présence client ou NOBO, avancement." },
      { t: "Cocher les tests faits", d: "Cliquez une carte : le volet de droite montre les testeurs et la liste des tests à réaliser, à cocher une fois faits." },
      { t: "Rien n'est oublié", d: "Les cartes signalent « Sans testeur », « Conflit » et « En retard » (période passée, tests pas tous faits). « Seulement mes tests » pour les testeurs." },
    ],
  },
  {
    id: "2026-10-v185",
    date: "2026-10-27",
    title: "V185 : thème mixte, titres en couleur, droits des admins",
    items: [
      { t: "Thème Ardoise revu", d: "En clair, le gris froid d'Ardoise ; en sombre, le marine et l'or. C'est le thème par défaut ; « Salle de contrôle » reste au choix." },
      { t: "Chaque page a sa couleur", d: "Le trait sous le titre change de couleur selon la page : liste, Gantt, calendrier, modifications, commentaires, tests." },
      { t: "Vue d'ensemble animée", d: "Les camemberts se dessinent l'un après l'autre, avec leur total au centre ; les totaux sont en gras." },
      { t: "Admins", d: "Les admins ont désormais les mêmes droits que le super admin (réglages, suppressions, fiches, rapport CODIR), sauf le Cash in.", admin: true },
    ],
  },
  {
    id: "2026-10-v184",
    date: "2026-10-26",
    title: "V184 : un Gantt lisible",
    items: [
      { t: "Une barre par machine, par étape", d: "Chaque barre se découpe en production, tests et fin de production jusqu'au départ, au lieu des pastilles qui se chevauchaient." },
      { t: "L'écart écrit en clair", d: "Au bout de chaque barre : « à l'heure », « +5 j » ou « +12 j », en vert, orange ou rouge ; le planning initial apparaît en pointillés." },
      { t: "Lignes alignées", d: "Chaque nom de machine est maintenant exactement en face de sa barre, même en bas d'une longue liste." },
    ],
  },
  {
    id: "2026-10-v183",
    date: "2026-10-26",
    title: "V183 : ORDO & OPS – BU ORC",
    items: [
      { t: "Nouveau nom", d: "Le site s'appelle désormais ORDO & OPS – BU ORC : ordonnancement, planning de production, suivi des tests et pilotage des projets." },
      { t: "Titres plus lisibles", d: "Chaque page affiche son titre en plus grand, sans le mot « Planning » au-dessus." },
      { t: "Connexion et accueil", d: "Écran de connexion avec une carte du monde en fond et un écran d'accueil après connexion dans le style du site." },
      { t: "Thème", d: "Le thème « Salle de contrôle » est utilisé par défaut ; « Ardoise » reste disponible dans le menu Apparence." },
    ],
  },
  {
    id: "2026-10-v182",
    date: "2026-10-26",
    title: "V182 : nouveau thème « Salle de contrôle »",
    items: [
      { t: "Salle de contrôle", d: "Un second style au choix dans le menu Apparence : ardoise sombre et dense, pensé pour l'écran d'atelier et la tablette, avec les mêmes couleurs d'étapes." },
      { t: "Style plus net", d: "Les derniers restes de l'ancien effet « en relief » ont disparu : filets fins et fonds plats partout." },
    ],
  },
  {
    id: "2026-10-v181",
    date: "2026-10-26",
    title: "V181 : des mouvements plus fluides",
    items: [
      { t: "Passage d'une vue à l'autre", d: "Accueil, liste, Gantt et calendrier apparaissent en fondu ; les lignes de la liste arrivent l'une après l'autre." },
      { t: "Réponse au clic", d: "Les boutons s'enfoncent légèrement, les barres se déploient, les messages glissent depuis la droite." },
      { t: "Plus léger pour l'ordinateur", d: "Toutes les animations sont courtes et désactivées si l'ordinateur demande moins de mouvement." },
    ],
  },
  {
    id: "2026-10-v180",
    date: "2026-10-26",
    title: "V180 : messages clairs et planning plus lisible",
    items: [
      { t: "Messages discrets", d: "Les erreurs et confirmations s'affichent en bas à droite, sans bloquer la page, et se ferment seules." },
      { t: "Hors ligne signalé", d: "Si la connexion aux données est perdue, un bandeau le dit et propose de recharger, au lieu d'afficher des données figées." },
      { t: "Vues prêtes dans la liste", d: "Le menu Colonnes propose une vue Atelier et une vue Direction en un clic." },
      { t: "Gantt et calendrier", d: "Dans le Gantt, le prochain jalon de chaque machine ressort et les jalons passés s'estompent ; la légende du calendrier rappelle les abréviations." },
    ],
  },
  {
    id: "2026-10-v179",
    date: "2026-10-26",
    title: "V179 : écran de connexion et en-tête allégé",
    items: [
      { t: "Nouvel écran de connexion", d: "Plus clair et en un seul clic : « Continuer avec Google », avec ce que l'on trouve dans le site." },
      { t: "Session d'une journée", d: "Pour la sécurité, la session se ferme chaque soir à minuit ; il suffit de se reconnecter le lendemain." },
      { t: "Logo en haut du menu", d: "Le logo ENOGIA passe en haut du menu de gauche et la page commence tout de suite, sans bandeau." },
    ],
  },
  {
    id: "2026-10-v178",
    date: "2026-10-26",
    title: "V178 : plus de place pour le contenu",
    items: [
      { t: "En-tête discret", d: "Le grand titre disparaît : chaque page a le sien. En descendant dans la page, la barre du haut s'efface et seul le logo reste ; elle revient dès qu'on remonte." },
      { t: "Vue d'ensemble qui se replie", d: "Dans la liste, la vue d'ensemble se replie toute seule quand on descend et se rouvre en haut de page." },
      { t: "Fiche synthèse plein écran", d: "Un bouton replie le menu du Manager et la liste des projets pour laisser toute la place à la fiche ; au survol d'une icône, ses sous-pages s'affichent et s'ouvrent d'un clic.", admin: true },
      { t: "Pilotage aligné", d: "Les trois colonnes du bloc Pilotage commencent au même niveau et leurs cartes ont la même hauteur." },
    ],
  },
  {
    id: "2026-10-v177",
    date: "2026-10-26",
    title: "V177 : nouvelles couleurs, nouvelle police, nouvelles icônes",
    items: [
      { t: "Une palette pour tout le site", d: "Bleu marine, bleu clair, or, vert forêt et vert sombre pour les étapes ; orange et tomate pour les alertes ; chaque état et chaque gamme a sa couleur, partout la même." },
      { t: "Nouvelle police", d: "Cabinet Grotesk pour les titres et les chiffres, Satoshi pour le texte." },
      { t: "Nouvelles icônes", d: "Toutes les icônes viennent désormais de la famille Phosphor, plus nettes et homogènes." },
    ],
  },
  {
    id: "2026-10-v176",
    date: "2026-10-26",
    title: "V176 : vue d'ensemble compacte, accès à la fiche synthèse",
    items: [
      { t: "Camemberts de retour", d: "La vue d'ensemble de la liste reprend ses camemberts en couleur, en plus compact : légende à côté de chaque anneau." },
      { t: "Plaques plus claires", d: "Les n° de PJ gardent leur plaque, sur fond clair au lieu du bleu marine." },
      { t: "Vers la fiche synthèse", d: "Depuis la fiche d'un projet, un bouton « Fiche synthèse » ouvre directement sa fiche dans le Manager.", admin: true },
      { t: "Thèmes", d: "Les thèmes Forêt et Cuivre sont retirés ; Atelier et Ardoise restent au choix." },
    ],
  },
  {
    id: "2026-10-v175",
    date: "2026-10-26",
    title: "V175 : le style « Atelier » sur tout le site",
    items: [
      { t: "Suivi et Manager", d: "Modifications, Commentaires, Tests et Manager adoptent le même style : n° de PJ sur plaques, intitulés d'atelier, grands chiffres." },
      { t: "Chiffres clés du Manager", d: "Chaque indicateur s'affiche en grand chiffre sous un filet bleu marine, avec un petit repère de couleur à côté de son libellé." },
    ],
  },
  {
    id: "2026-10-v174",
    date: "2026-10-26",
    title: "V174 : Gantt, Calendrier et fiche au style « Atelier »",
    items: [
      { t: "Plaques de machine partout", d: "Dans le Gantt et le Calendrier, chaque n° de PJ est sur sa plaque, avec un liseré à la couleur de son état." },
      { t: "Commandes plus franches", d: "Semaine / Jour, « Par projet » et « Aujourd'hui » passent en bleu marine quand ils sont actifs ou survolés." },
      { t: "Fiche projet", d: "Grande plaque de PJ, nom du projet en titre, onglets soulignés." },
    ],
  },
  {
    id: "2026-10-v173",
    date: "2026-10-26",
    title: "V173 : nouveau style « Atelier »",
    items: [
      { t: "Un nouveau style", d: "Fond crème, menu latéral bleu marine avec repère jaune, grands titres et grands chiffres : le planning prend l'allure d'un journal d'atelier. Les anciens thèmes restent disponibles dans le menu Apparence." },
      { t: "Accueil et liste refaits", d: "Les n° de PJ apparaissent sur des plaques, chaque ligne de la liste porte la couleur de son état, et les chiffres se comptent à l'ouverture." },
      { t: "Des transitions douces", d: "Pages qui apparaissent en fondu, barres qui se remplissent, lignes qui glissent au survol — désactivées si votre ordinateur demande moins d'animations." },
    ],
  },
  {
    id: "2026-10-v172",
    date: "2026-10-26",
    title: "V172 : Calendrier sans bulles, étapes nommées",
    items: [
      { t: "Plus de bulles au survol", d: "Le calendrier n'affiche plus d'infobulle quand on passe la souris sur une case ; un clic ouvre toujours la fiche." },
      { t: "Chaque jour nomme son étape", d: "En vue Jour, chaque case affiche à nouveau l'étape : en entier quand la place le permet, sinon en abrégé (Arr., Prod, Tests, Fin, Dép.)." },
    ],
  },
  {
    id: "2026-10-v171",
    date: "2026-10-26",
    title: "V171 : Liste, Gantt et fiche plus lisibles",
    items: [
      { t: "Liste : vue d'ensemble en barres", d: "La répartition par gamme, pays et chef de projet se lit en barres triées, l'état en une barre découpée ; l'en-tête du tableau est plus discret." },
      { t: "Gantt : une couleur par niveau d'écart", d: "Barre verte à l'heure (≤ 3 j), orange de 4 à 10 j de retard, rouge au-delà ; un trait fin montre le planning initial." },
      { t: "Fiche projet plus claire", d: "N° de PJ, nom du projet et état en tête, puis chef de projet, gamme, pays et départ ; les 4 étapes en une barre qui se remplit au fil du projet." },
    ],
  },
  {
    id: "2026-10-v170",
    date: "2026-10-26",
    title: "V170 : Calendrier recentré, tout au clavier",
    items: [
      { t: "Calendrier : la semaine passée et les 3 suivantes", d: "À l'ouverture et sur « Aujourd'hui », le calendrier montre la semaine passée à gauche puis les 3 prochaines semaines. En vue Jour, les cases étroites gardent la couleur de l'étape et le détail s'affiche au survol." },
      { t: "Calendrier allégé", d: "Les commentaires par jour et leur fenêtre sont retirés du calendrier ; les commentaires restent dans la fiche projet et la page Commentaires." },
      { t: "Utilisable au clavier", d: "Filtres, listes de PJ, lignes du Gantt, du Calendrier et des Commentaires s'ouvrent avec Tab puis Entrée ; les fenêtres se ferment avec Échap." },
    ],
  },
  {
    id: "2026-10-v169",
    date: "2026-10-26",
    title: "V169 : un accueil plus direct",
    items: [
      { t: "« À traiter » d'abord", d: "Vos mentions, vos tests à venir et les départs qui glissent sont réunis dans un seul bloc, une pastille par ligne, avec ce qui a changé depuis votre dernière visite." },
      { t: "Départs à côté", d: "Les prochains départs s'affichent dans une colonne à droite, avec un accès direct au calendrier." },
      { t: "Parcours en une barre", d: "La répartition des machines ouvertes par étape tient maintenant sur une seule barre, avec le nombre sous chaque étape." },
    ],
  },
  {
    id: "2026-10-v168",
    date: "2026-10-26",
    title: "V168 : Calendrier instantané, Manager plus lisible",
    items: [
      { t: "Calendrier instantané", d: "Seules les machines et les dates visibles sont dessinées : l'onglet s'ouvre et défile sans attendre, même avec beaucoup de projets." },
      { t: "Causes de retard lisibles", d: "La cause choisie reste lisible dans tous les thèmes, y compris en mode sombre ; les graphiques utilisent les couleurs du thème." },
      { t: "Déclarer un retard au clavier", d: "Le volet s'ouvre avec le curseur dedans et se ferme avec Échap ; les boutons de choix annoncent leur état aux lecteurs d'écran." },
    ],
  },
  {
    id: "2026-10-v167",
    date: "2026-10-26",
    title: "V167 : Calendrier fluide, plus de blocage",
    items: [
      { t: "Calendrier beaucoup plus léger", d: "Seules les colonnes visibles sont dessinées : l'onglet s'ouvre vite, même en vue Jour, et ne fige plus l'application." },
      { t: "Survol et commentaires sans ralentir", d: "Passer la souris sur les cases ou écrire un commentaire ne redessine plus tout le calendrier." },
    ],
  },
  {
    id: "2026-10-v166",
    date: "2026-10-26",
    title: "V166 : le Calendrier ne plante plus",
    items: [
      { t: "Calendrier réparé", d: "L'onglet Calendrier pouvait planter à l'ouverture quand le zoom mémorisé sur le poste était illisible ; il reprend maintenant le zoom par défaut." },
    ],
  },
  {
    id: "2026-10-v165",
    date: "2026-10-26",
    title: "V165 : fiche pleine largeur et accessibilité partout",
    items: [
      { t: "Fiche synthèse pleine largeur", d: "Quand la liste de gauche est réduite, la fiche prend toute la largeur de l'écran (plus de plafond)." },
      { t: "Champs et boutons identifiés", d: "Tous les champs, listes et boutons icônes ont maintenant un nom pour les lecteurs d'écran, et les petits boutons ont une zone de clic plus large." },
      { t: "Textes plus lisibles, titres partout", d: "Plus aucun texte sous 11 px ; chaque onglet du Manager a son titre de page ; ✕ et ⚠ remplacés par des icônes aux endroits concernés." },
    ],
  },
  {
    id: "2026-10-v164",
    date: "2026-10-26",
    title: "V164 : couleurs sur le texte, liste des projets redimensionnable",
    items: [
      { t: "Couleurs d'état sur le texte", d: "Le n° de PJ, le pourcentage et la barre d'avancement prennent la couleur de l'état, dans la liste des fiches synthèse comme sur l'accueil ; le point d'état ne s'affiche plus en blanc en mode sombre." },
      { t: "Plus de place pour la fiche", d: "Dans Fiche projet, la colonne de gauche s'élargit ou se réduit en glissant la poignée (double-clic : taille d'origine), ou se replie en mini-liste d'un clic." },
      { t: "Accessibilité", d: "Lien « Aller au contenu », zone principale repérée pour les lecteurs d'écran, tri des colonnes annoncé, poignée utilisable aux flèches du clavier." },
    ],
  },
  {
    id: "2026-10-v163",
    date: "2026-10-23",
    title: "V163 : palette B, accueil par profil, liste plus explicite",
    items: [
      { t: "Nouvelles couleurs", d: "Cinq étapes bien distinctes (violet, bleu, turquoise, vert, vert vif), liseré coloré sur le haut des cadres, et un mode sombre nettement plus clair." },
      { t: "Accueil adapté à votre profil", d: "Une phrase-bilan du jour, quatre repères, des blocs numérotés selon que vous êtes manager, chef de projet ou testeur — et « Personnaliser » pour choisir les vôtres." },
      { t: "Liste : survolez pour comprendre", d: "Au survol d'un état, d'un écart de départ ou de l'avancement : étapes avec dates, départ initial vs actuel, détail méca / élec / tests. Liseré à la couleur de l'état sur la ligne survolée." },
      { t: "Un seul style partout", d: "Police Roboto sur toutes les pages, en-tête commun (rubrique + titre), densité compacte par défaut, menu latéral avec repère sur la page active." },
    ],
  },
  {
    id: "2026-10-v162",
    date: "2026-10-23",
    title: "V162 : page d'accueil « Aujourd'hui » et finitions",
    items: [
      { t: "Nouvelle page d'accueil", d: "« Aujourd'hui » : machines livrées, départs sous 30 jours, retards, vos mentions à traiter, vos projets, les prochains départs et ce qui a bougé depuis votre dernière visite. Un clic ouvre la fiche." },
      { t: "Actions rapides sur la liste", d: "Clic droit sur une ligne (ou bouton ⋯ au survol) : ouvrir la fiche, commenter, copier le n° de PJ et, pour les administrateurs, changer l'état." },
      { t: "Gantt plus lisible", d: "Ctrl + molette pour zoomer en continu, bouton « Par projet » pour regrouper les lignes, aperçu enrichi au survol (état, chef de projet, gamme)." },
      { t: "Chiffres animés et icônes unifiées", d: "Les repères montent jusqu'à leur valeur ; les derniers pictogrammes (cloche, corbeille, crayon, alerte) suivent le même trait que le reste." },
    ],
  },
  {
    id: "2026-10-v161",
    date: "2026-10-23",
    title: "V161 : nouvelles couleurs « Ardoise »",
    items: [
      { t: "Un site plus sobre", d: "Fond gris froid à la place de la crème, bleu acier de la marque, et fini l'effet pastel multicolore." },
      { t: "États et étapes lisibles d'un coup d'œil", d: "Arrivée, Production, Tests, Fin prod et Départ suivent une seule rampe bleu → vert ; le rouge n'apparaît que pour un retard, l'ambre pour « Non commandée »." },
    ],
  },
  {
    id: "2026-10-v160",
    date: "2026-10-23",
    title: "V160 : étiquette Client + NOBO corrigée",
    items: [
      { t: "Fiche d'un PJ", d: "L'étiquette de présence client / NOBO ne déborde plus de la tuile « Tests » (affichage « C + N » quand les deux sont présents)." },
    ],
  },
  {
    id: "2026-10-v159",
    date: "2026-10-23",
    title: "V159 : menu principal libellé, Ctrl K partout, fiche en volet ou en pop-up",
    items: [
      { t: "Menu à gauche avec les noms", d: "Liste, Gantt, Calendrier, Modifications, Commentaires et Tests sont rangés par famille ; le menu se réduit en icônes d'un clic." },
      { t: "Aller à… (Ctrl K) sur toutes les pages", d: "Une recherche pour passer d'une page à l'autre ou ouvrir directement la fiche d'un PJ ; la loupe en haut à droite fait la même chose." },
      { t: "Fiche d'un PJ : volet ou pop-up", d: "Choisissez où s'ouvre la fiche : volet à droite (comme avant) ou fenêtre centrale. Le choix se change dans la fiche ou dans le panneau des réglages d'affichage." },
      { t: "Commentaires", d: "Retrait de la case « Prévenir aussi par e-mail » : les personnes taguées sont prévenues dans leur cloche." },
    ],
  },
  {
    id: "2026-10-v158",
    date: "2026-10-23",
    title: "V158 : nouveau menu de l'espace Manager et recherche Ctrl K",
    items: [
      { t: "Menu Manager à gauche", d: "Les onglets sont rangés par famille (Pilotage, Projets, Admin) ; les sous-onglets se déplient sous l'onglet actif, et le menu se réduit en icônes." },
      { t: "Aller à… (Ctrl K)", d: "Tapez Ctrl K pour aller directement à un onglet, un sous-onglet ou la fiche d'un PJ ; vos derniers choix sont proposés en premier." },
      { t: "Fil d'Ariane", d: "Au-dessus de chaque page Manager, vous voyez où vous êtes (Manager › KPI › Dérives)." },
    ],
  },
  {
    id: "2026-10-v157",
    date: "2026-10-23",
    title: "V157 : tests en consultation pour les testeurs, message dans la fenêtre @",
    items: [
      { t: "Tests : consultation pour les testeurs", d: "Les testeurs voient leurs machines et les tests à réaliser, sans pouvoir cocher / décocher : seuls les administrateurs modifient la page." },
      { t: "Tag @ plus clair", d: "Si personne n'est trouvé, la fenêtre @ explique pourquoi (la personne doit s'être connectée une fois au site)." },
    ],
  },
  {
    id: "2026-10-v156",
    date: "2026-10-23",
    title: "V156 : tag @ par prénom avec fenêtre de suggestions, testeurs qui choisissent leurs tests",
    items: [
      { t: "Tag @ par prénom", d: "Tapez @ puis le début d'un prénom : une petite fenêtre s'ouvre sous le curseur (avatar, nom, adresse), comme dans Gmail. Seul le prénom compte pour la recherche." },
      { t: "Les testeurs choisissent leurs tests", d: "Un testeur affecté à une machine peut cocher / décocher les tests à y réaliser et écrire les commentaires ; les affectations et le catalogue restent aux administrateurs." },
    ],
  },
  {
    id: "2026-10-v155",
    date: "2026-10-23",
    title: "V155 : page Tests dans le rail de gauche, fiches par machine plus claires",
    items: [
      { t: "Page « Tests » à gauche", d: "Elle quitte l'espace Manager : une icône dans le rail de gauche, visible des administrateurs et des testeurs de la liste (qui consultent)." },
      { t: "Fiches de test par machine", d: "Même présentation que la checklist FAT : en-tête PJ / ORC / certification / dates FAT, puis 1 · Qui teste (clic sur un nom), 2 · Présence, 3 · Tests à réaliser avec objectifs et commentaires." },
      { t: "Planning des testeurs", d: "Frise sur 6 semaines : une ligne par testeur, une ligne « À affecter », chevauchements signalés ; ajout et retrait des testeurs au même endroit." },
      { t: "Dates client / NOBO en lecture seule", d: "Elles se règlent uniquement dans la Liste." },
    ],
  },
  {
    id: "2026-10-v154",
    date: "2026-10-23",
    title: "V154 : onglet Tests (testeurs, FAT) et chef de projet prévenu",
    items: [
      { t: "Nouvel onglet Manager › Tests", d: "Liste des testeurs, affectation aux périodes de tests de chaque PJ (alerte en cas de chevauchement) et tests FAT à réaliser : interne toujours, client et/ou NOBO selon la présence." },
      { t: "Catalogue des tests modifiable", d: "Le contenu de la checklist FAT (interne, client, NOBO) est préchargé ; ajoutez, renommez, réordonnez ou supprimez des tests." },
      { t: "Chef de projet prévenu automatiquement", d: "Tout commentaire sur un PJ arrive dans la cloche du chef de projet, sans avoir à le taguer." },
      { t: "Tag @ : plus de managers proposés d'office", d: "Seuls les comptes qui se sont déjà connectés au site sont suggérés, et uniquement quand vous tapez @." },
    ],
  },
  {
    id: "2026-10-v153",
    date: "2026-10-23",
    title: "V153 : taguer comme sur Gmail",
    items: [
      { t: "Tapez @ pour taguer", d: "Une liste de suggestions apparaît pendant la frappe (flèches + Entrée), sans afficher toute la liste des personnes." },
      { t: "Tous les comptes connectés", d: "On peut taguer toute personne qui s'est déjà connectée au site au moins une fois, pas seulement les managers." },
      { t: "Cloche pour tous", d: "Chacun voit ses demandes dans la cloche de l'en-tête ; les messages privés restent réservés aux managers." },
    ],
  },
  {
    id: "2026-10-v152",
    date: "2026-10-23",
    title: "V152 : taguer (@) partout et cloche de notifications",
    items: [
      { t: "Taguer dans tous les commentaires", d: "Les puces « @ Prénom » sont maintenant dans la fenêtre projet de la Liste et dans la page Commentaires, plus seulement dans la fiche Manager." },
      { t: "Cloche de notifications", d: "Les managers voient dans l'en-tête, avec un compteur, les demandes où ils sont cités ; ouvrir la fiche ou « ✓ Traité » en un clic." },
      { t: "Prévenir par e-mail", d: "Case optionnelle : un e-mail prêt à envoyer aux personnes taguées s'ouvre dans votre messagerie à la publication." },
    ],
  },
  {
    id: "2026-10-v151",
    date: "2026-10-23",
    title: "V151 : état et présence client/NOBO modifiables dans la Liste, privés masqués",
    items: [
      { t: "Changer l'état depuis la Liste", d: "Les administrateurs choisissent l'état d'un PJ directement dans la colonne État, sans passer par Manager › Statut." },
      { t: "Dates client / NOBO dans la Liste", d: "Un clic sur la pastille de présence (ou « ＋ Client/NOBO ») ouvre l'éditeur : client, NOBO ou les deux, avec une date chacun dans la période de tests." },
      { t: "Commentaires privés masqués", d: "À l'ouverture d'un PJ (fiche et fenêtre projet), les messages privés sont cachés ; « Afficher les privés (n) » les révèle à la demande." },
    ],
  },
  {
    id: "2026-10-v150",
    date: "2026-10-21",
    title: "V150 : liste des composants, livraison contractuelle, Tf final",
    items: [
      { t: "Pénalités plus compactes", d: "Le bloc tient en moins de place ; la case « Pénalités activées par le client » passe au rouge quand elle est cochée." },
      { t: "Liste des composants", d: "« Gérer la liste des composants » : ajouter, renommer, réordonner ou retirer des composants proposés à tous les PJ ; boutons « ＋ » pour ajouter ceux qui manquent à une fiche." },
      { t: "Livraison contractuelle à côté de la MaD ORC", d: "Les dates de livraison (transport inclus) sont maintenant dans Planning › Contrat & roadmap, à côté de la MaD ORC." },
      { t: "Tf final", d: "Pour un projet expédié, « Fin projetée » devient « Tf final » (fiche, CODIR, rapport chef de projet)." },
      { t: "CODIR sans doublons", d: "Montant et pourcentage de paiement ne sont plus répétés ; plus de « fiche d'init. » ni d'objectif de marge." },
    ],
  },
  {
    id: "2026-10-v149",
    date: "2026-10-21",
    title: "V149 : @mentions, pénalités activées par le client, fiche complète dans le rapport CdP",
    items: [
      { t: "Taguer un manager (@)", d: "Dans le fil de commentaires, cliquez sur un nom pour le taguer : il voit un badge @ dans la liste des PJ, filtre « Pour moi » et marque la demande « traitée »." },
      { t: "Pénalités activées par le client", d: "Une case à cocher indique si le client a activé les pénalités ; décochée, aucun montant n'est compté. Plafond et unité sur la même ligne." },
      { t: "Rapport chef de projet complet", d: "Nouvelle diapositive par PJ : prix de la fiche d'init., livraison contractuelle, pénalités, certification machine et fiches du PJ." },
    ],
  },
  {
    id: "2026-10-v148",
    date: "2026-10-21",
    title: "V148 : stock « À venir », certification en couleur, CODIR avec pénalités",
    items: [
      { t: "Stock « À venir »", d: "Toutes les turbines du fichier du responsable (montage, livraisons jusqu'en mars) sont visibles, une ligne = une turbine. « Stock virtuel » devient « À venir » ; les turbines livrées restent en stock réel.", admin: true },
      { t: "Certification machine en couleur", d: "La certification choisie s'affiche dans sa couleur et la liste propose chaque certification en pastille colorée." },
      { t: "Rapport CODIR : pénalités et fiche d'init.", d: "Chaque page PJ et le tableau de synthèse montrent le prix de la fiche d'init. (objectif de marge inclus) et les pénalités ; tout tient sur une page." },
    ],
  },
  {
    id: "2026-10-v147",
    date: "2026-10-21",
    title: "V147 : fiche de synthèse en colonnes, stock turbines réel",
    items: [
      { t: "Fiche de synthèse plus courte", d: "Chaque zone (Pilotage, Planning, Finance, Suivi) est découpée en 3 ou 4 colonnes côte à côte au lieu d'une longue liste." },
      { t: "Certification machine", d: "Une liste déroulante « Certification machine » dans l'en-tête de la fiche, à côté de l'état et du pays." },
      { t: "Stock virtuel = appros attendus", d: "Le stock virtuel ne reprend que les turbines attendues du fichier du responsable (12 semaines affichées) ; les estimations du planning sont à part, hors stock.", admin: true },
      { t: "Projet SAV avec tiret", d: "Le cadre SAV reprend le numéro complet du PJ : PJ411-1 donne SAV411-1.", admin: true },
    ],
  },
  {
    id: "2026-10-v146-28",
    date: "2026-10-21",
    title: "Fiche de synthèse par zones, turbines repliables, export responsable",
    items: [
      { t: "Fiche de synthèse en 4 zones pleine largeur", d: "Pilotage, Planning, Finance, puis Suivi (actions, mitigation, retards, commentaires), empilées les unes sous les autres." },
      { t: "Certification comme le N° de série", d: "Plus de cadre à part : la certification est un simple élément à côté du N° de série dans l'en-tête de la fiche." },
      { t: "Prix de la fiche d'init.", d: "Le prix de la fiche correspond à la fiche d'initialisation (objectif de marge inclus) ; il se trouve dans la zone Finance avec les pénalités, les achats et les paiements.", admin: true },
      { t: "Turbines : PJ repliés, PJ 2/3 – SAV 1/3", d: "Chaque PJ se réduit à son nom (ouvert par défaut pour le mois en cours) ; les projets SAV s'affichent à droite sur un tiers de l'écran.", admin: true },
      { t: "Export au format du responsable turbines", d: "Même fichier que l'import (Projet, Modèle, N° série, Échéance, Livraison, Status, Retard) avec vos nouvelles MàD, l'ancienne date et un repère « modifiée » ; il se ré-importe sans rien casser.", admin: true },
    ],
  },
  {
    id: "2026-10-v146-27",
    date: "2026-10-20",
    title: "Turbines : règles d'arrivée, « Complet », éléments seuls, stock du fichier",
    items: [
      { t: "Échéances calées sur l'arrivée de la machine", d: "La turbine doit être disponible à l'arrivée du PJ, la roue connue au plus tard 1 semaine avant et l'injecteur disponible le jour de l'arrivée ; alertes rouges / orange en conséquence.", admin: true },
      { t: "« Complet » seulement quand tout est rempli", d: "Un PJ n'est complet qu'avec toutes ses turbines, chacune avec sa roue et son injecteur ; sinon la carte indique ce qui manque.", admin: true },
      { t: "Roue ou injecteur seul sur un PJ / SAV", d: "On peut déposer une roue ou un injecteur sur un projet même sans turbine ; il passe sur la turbine dès qu'elle arrive.", admin: true },
      { t: "Stock réel et virtuel d'après le fichier du responsable", d: "L'import du Google Sheet remplit le stock réel (déjà livré) et virtuel (à venir), sans les projets expédiés ou installés.", admin: true },
    ],
  },
  {
    id: "2026-10-v146-26",
    date: "2026-10-20",
    title: "Turbines : stock en colonnes, SAV, import du fichier turbines",
    items: [
      { t: "Stock réel et stock virtuel en colonnes", d: "Plus besoin de défiler : le stock réel (vert, déjà arrivé) et le stock virtuel (violet, à venir) sont côte à côte, avec l'échéance et le retard du fichier.", admin: true },
      { t: "Roues et injecteurs ajoutés dans la zone", d: "Un champ « Nouvelle roue / injecteur » directement sous la liste ; sur chaque turbine, on clique pour choisir la roue ou l'injecteur disponible.", admin: true },
      { t: "Nouveau projet SAV par fenêtre", d: "On saisit le n° du PJ (cadre « SAVxxx »), la turbine demandée et la date de besoin ; seul le super admin peut supprimer un cadre SAV.", admin: true },
      { t: "Import du fichier du responsable turbines", d: "Le fichier « Livraisons turbines ORC » est reconnu tel quel : une turbine par ligne, MàD = dernière date de livraison, rattachée à son PJ ou SAV.", admin: true },
    ],
  },
  {
    id: "2026-10-v146-25",
    date: "2026-10-20",
    title: "Turbines : dates modifiables, export / import, à communiquer",
    items: [
      { t: "Projets plus lisibles", d: "Cartes colorées par gamme, état et dates en pastilles, roue et injecteur avec leur échéance ; les projets expédiés ou marqués « installés » quittent la liste.", admin: true },
      { t: "Date de MàD modifiable en direct", d: "Sur chaque turbine, sans casser le prochain import : une date corrigée ici est conservée tant que le fichier n'a pas changé.", admin: true },
      { t: "Export et ré-import Excel", d: "L'export contient toutes les turbines avec leur attribution ; le ré-import ne touche que le type et la date, jamais les attributions, roues ou injecteurs.", admin: true },
      { t: "Pré-remplir depuis le planning", d: "Crée les turbines à prévoir d'après les gammes, datées de l'arrivée des ORC ; le responsable turbines ajuste et peut en ajouter.", admin: true },
      { t: "À communiquer au responsable turbines", d: "Les attributions pas encore transmises sont listées avec un message prêt à copier, puis marquées « communiquées ».", admin: true },
    ],
  },
  {
    id: "2026-10-v146-24",
    date: "2026-10-20",
    title: "Turbines : glisser-déposer, pénalités simplifiées",
    items: [
      { t: "Tableau d'attribution des turbines", d: "On glisse les turbines entre le stock, le stock virtuel, les PJ et les projets SAV. Un PJ attend 1 ou 2 turbines selon sa gamme (100 kW : gammes 100 et 180 ; 20 kW : gammes 20 et 40).", admin: true },
      { t: "Roue et injecteur", d: "Ils se glissent sur la turbine comme des sous-ensembles ; une alerte rouge apparaît si la turbine, la roue ou l'injecteur manque dans la semaine qui arrive.", admin: true },
      { t: "Certification dans un cadre à part", d: "La fiche synthèse a maintenant un cadre « Certification » séparé du cadre « Prix & pénalités »." },
      { t: "Pénalités simplifiées", d: "Plus de dates MES ni de choix de franchise : une période de grâce en semaines, et toute semaine entamée compte pour une semaine entière.", admin: true },
    ],
  },
  {
    id: "2026-10-v146-23",
    date: "2026-10-20",
    title: "Certifications, prix et pénalités par fiche",
    items: [
      { t: "Certification du projet", d: "Dans la fiche synthèse, liste déroulante des certifications (ATEX, CE…) : on en crée de nouvelles avec leur couleur, et elles s'affichent dans l'en-tête de la fiche." },
      { t: "Prix de la fiche et dates contractuelles", d: "Prix par fiche, livraison contractuelle et prévue, en plus de la MaD ORC.", admin: true },
      { t: "Pénalités de retard", d: "Taux en % par semaine, période de grâce, jalon de départ (MaD ORC ou livraison) et plafond : le montant se recalcule seul avec les dates de la fiche.", admin: true },
      { t: "Plusieurs fiches par PJ", d: "Chaque fiche (PJ461-1, -2, -3…) a ses valeurs ; le total du PJ est affiché et les conditions se recopient sur les autres fiches.", admin: true },
      { t: "Turbines : projets SAV", d: "Liste de projets SAV qui s'enrichit au fil de l'eau, proposée à côté des PJ dans l'attribution des turbines.", admin: true },
    ],
  },
  {
    id: "2026-10-v146-22",
    date: "2026-10-20",
    title: "Nouvel onglet Turbines",
    items: [
      { t: "Pool de turbines 100LT / 20LT", d: "Manager › Turbines : on importe les dates de MàD, puis on attribue chaque turbine à un PJ ou au SAV, et on la ré-attribue en direct.", admin: true },
      { t: "Roue et injecteur", d: "Chacun porte un nom pris dans une liste ; la case cochée le réserve pour la turbine, décochée il redevient disponible.", admin: true },
      { t: "Stock virtuel par semaine", d: "Turbines qui arrivent, libres et attribuées sur 12 semaines, avec alertes si la roue ou l'injecteur n'est pas sécurisé avant les tests / le départ.", admin: true },
    ],
  },
  {
    id: "2026-10-v146-21",
    date: "2026-10-20",
    title: "Import réservé aux administrateurs",
    items: [
      { t: "Bouton d'import du planning", d: "Il n'est plus visible que pour les administrateurs et le super admin." },
      { t: "En-tête de la Liste", d: "Le filet sombre entre « Chef de Projet » et « Gamme » a disparu." },
    ],
  },
  {
    id: "2026-10-v146-20",
    date: "2026-10-20",
    title: "Version téléphone plus claire",
    items: [
      { t: "En-tête compact", d: "Sur téléphone, le logo et le titre tiennent sur une ligne ; l'import, le Manager et le profil passent en icônes." },
      { t: "Vue d'ensemble repliée", d: "Les camemberts ne prennent plus l'écran : on arrive directement sur la liste (le chevron les rouvre)." },
      { t: "Liste, Gantt et Calendrier", d: "Plus de message « colonnes masquées », pas de fiche vide sous la liste, et la colonne des noms est étroite pour laisser la place à la frise." },
    ],
  },
  {
    id: "2026-10-v146-19",
    date: "2026-10-20",
    title: "Actions et risques mieux structurés, retards en lot, nouveaux états",
    items: [
      { t: "Actions : action, état, date", d: "Chaque action de la semaine a maintenant sa zone d'action, son état (À faire, En cours, Bloqué, Terminé) et sa date." },
      { t: "Plan de mitigation : risque, mesure, état, date", d: "Plus de zone de commentaire unique : on indique le risque, ce qu'on fait pour l'éviter, un état et une date." },
      { t: "Retards sur plusieurs projets", d: "Dans « ＋ Sur plusieurs projets… », un nouvel onglet Retard applique la même cause et le même nombre de jours à tous les PJ cochés." },
      { t: "Créer un état depuis la liste", d: "Dans Suivi › Statut & état, l'option « ＋ Créer / gérer les états… » ouvre la liste des états existants avec leurs couleurs et permet d'en créer un." },
      { t: "Pop-up Nouveautés", d: "Il ne s'ouvre plus puis se referme à l'actualisation de la page." },
    ],
  },
  {
    id: "2026-10-v146-18",
    date: "2026-10-20",
    title: "Saisie sur plusieurs projets, nouveaux états, expédiées masquées",
    items: [
      { t: "Plusieurs projets à la fois", d: "Dans la fiche projet, « ＋ Sur plusieurs projets… » ajoute une action, un plan de mitigation, un commentaire ou un statut global à tous les PJ cochés (ex. PJ461-1 à -5) ; clôturer une action commune peut se faire d'un coup." },
      { t: "Nouveaux états", d: "Dans Suivi › Statut & état, la liste déroulante propose « ＋ Créer / gérer les états… » : créez un état et choisissez sa couleur." },
      { t: "Expédiées masquées", d: "Les machines expédiées ne s'affichent plus de base ; elles se retrouvent en cochant « Expédiée » dans le filtre État." },
      { t: "Composants réceptionnés", d: "Cocher « Réceptionné » coche aussi Design et PO." },
      { t: "Import MS Project", d: "L'en-tête affiche la date et l'heure du dernier import ; l'indice n'est plus demandé." },
      { t: "Retard enregistré sans erreur", d: "L'ajout d'un retard sur une fiche projet fonctionne à nouveau." },
    ],
  },
  {
    id: "2026-10-v146-17",
    date: "2026-10-20",
    title: "Écran atelier : jours de production et machines à fabriquer",
    items: [
      { t: "Écran atelier", d: "Les jours de production désactivés et les fermetures du Manager apparaissent dans « Cette semaine » ; « machines à fabriquer » ne compte que les machines en production." },
    ],
  },
  {
    id: "2026-10-v146-16",
    date: "2026-10-19",
    title: "Choisir les nouveautés à annoncer",
    items: [
      { t: "Catalogue des nouveautés", d: "Manager › Réglages › Nouveautés : toutes les évolutions depuis la V146.5 se cochent ; depuis la bêta, la sélection se publie vers la production.", admin: true },
    ],
  },
  {
    id: "2026-10-v146-15",
    date: "2026-10-19",
    title: "Téléphone et tablette, étapes Montage Méca / Élec, jalons communs, tri par date",
    items: [
      { t: "Téléphone et tablette", d: "L'application s'adapte : barre de navigation en bas sur téléphone, en-tête compact, fiche projet sous la liste. Elle peut aussi s'ajouter à l'écran d'accueil comme une application." },
      { t: "Étapes de production", d: "« Montage Méca » et « Montage Élec » (avec « Pose de l'armoire »), « FAT » dans les Tests, et une note sur le remplissage, possible à tout moment une fois test de pression et tirage au vide terminés." },
      { t: "Tri par date", d: "« Prochaine date d'abord » met en tête la date la plus proche à venir ; « Date la plus tardive d'abord » inverse." },
      { t: "Causes de retard partout", d: "« ＋ Nouvelle cause » est aussi proposé dans l'onglet Retards et dans la fiche du planning.", admin: true },
      { t: "Jalons communs à plusieurs machines", d: "Un jalon choisi « Commun » (ex. l'acompte de PJ461) n'est pas divisé : chaque machine le voit en entier, avec la mention « ne pas additionner ».", admin: true },
      { t: "Écran atelier", d: "Le calendrier affiche toutes les étapes de chaque jour, avec retour à la ligne." },
      { t: "Rapports", d: "Les boutons sont au-dessus de la fiche synthèse ; le Manager ouvre toujours « Fiche projet » ; la synthèse PowerPoint ajoute pays et montant ; roadmap du CODIR sans texte superposé." },
    ],
  },
  {
    id: "2026-10-v146-14",
    date: "2026-10-19",
    title: "Jalons par machine, causes de retard à créer, rapports depuis la fiche",
    items: [
      { t: "Jalons de paiement machine par machine", d: "Pour un contrat général (ex. PJ461) avec plusieurs machines, chaque jalon peut être global ou réservé à certaines machines.", admin: true },
      { t: "Nouvelles causes de retard", d: "Dans la fiche, la liste des causes propose « ＋ Nouvelle cause… » pour en créer une à la volée." },
      { t: "« Réceptionné » à la place de « Installé »", d: "La 3e colonne des Major components couvre aussi bien une pièce reçue à ENOGIA qu'installée." },
      { t: "Écran atelier", d: "Légende des couleurs en bas de page, étape écrite en toutes lettres dans le calendrier, couleurs par gamme sur les chiffres clés." },
      { t: "Bouton Manager", d: "Il ouvre directement la page Synthèse." },
      { t: "Rapports dans la fiche projet", d: "Les boutons « Rapport chef de projet » et « Rapport CODIR » sont dans la fiche projet ; le CODIR n'est visible que par le super admin." },
      { t: "Rapports plus lisibles", d: "PowerPoint : titres en Abel, texte en Roboto ; textes secondaires plus contrastés ; roadmap du CODIR sans texte superposé." },
    ],
  },
  {
    id: "2026-10-v146-13",
    date: "2026-10-19",
    title: "Calendrier à tuiles bicolores, écran atelier remanié, rapports aux couleurs ENOGIA",
    items: [
      { t: "Tri plus clair", d: "Les choix de tri des dates sont renommés (« du plus ancien… », « prochain passage au banc d'abord ») pour ne plus prêter à confusion." },
      { t: "Calendrier : étapes en diagonale", d: "Quand plusieurs étapes tombent dans la même semaine, la tuile est coupée en diagonale aux couleurs de chaque étape (aussi en mode présentation)." },
      { t: "Colonne Machine : nom complet", d: "Le nom du projet s'affiche de nouveau en entier dans le Calendrier et le Gantt." },
      { t: "Écran atelier", d: "Une page avec toutes les machines attendues dans les 4 semaines, un vrai calendrier « arrivées, tests, départs » et des chiffres clés tournés vers la fabrication du mois prochain (machines à construire par gamme)." },
      { t: "Bouton Manager plus discret", d: "Une icône mêlant cadenas, projet et roue crantée." },
      { t: "Rapports PowerPoint et CODIR sur le gabarit ENOGIA", d: "Page de garde, bandeau, tableaux et page de contact reprennent le gabarit de l'entreprise." },
    ],
  },
  {
    id: "2026-10-v146-12",
    date: "2026-10-19",
    title: "Tri direct, fiches plus complètes, statuts à risque encadrés",
    items: [
      { t: "Tri depuis les flèches des colonnes", d: "Dans la Liste, on trie directement depuis la flèche de chaque en-tête. Les menus « Tri », « En dérive seulement » et « Vues » disparaissent." },
      { t: "Écran atelier : gammes en grand", d: "La gamme de chaque machine s'affiche en grand, et la page 2 montre les 4 semaines à partir de la semaine actuelle." },
      { t: "N° de série et gamme toujours visibles", d: "Dans le Calendrier et le Gantt, la colonne Machine affiche le code PJ, la gamme et le N° de série sans les couper." },
      { t: "Actions de la semaine avec échéance", d: "Chaque action doit avoir une date d'échéance ; les actions en retard ressortent en rouge, y compris dans les rapports." },
      { t: "Statut « À risque » : commentaire obligatoire", d: "Passer un statut au rouge demande un commentaire ; pour le Planning, un plan de mitigation en plus." },
      { t: "Cash in dans les fiches pour les admins", d: "Les administrateurs voient les jalons de paiement dans les fiches synthèse (lecture seule)." },
      { t: "Major components modifiables", d: "Les administrateurs peuvent renommer, ajouter ou retirer les composants d'une fiche." },
      { t: "Exports PowerPoint plus sûrs", d: "Les zones de commentaire s'adaptent au texte : plus de commentaire qui sort du cadre." },
      { t: "Mode sombre plus lisible", d: "Les états et les étapes se détachent mieux du fond. Le bouton Manager devient une simple icône." },
    ],
  },
  {
    id: "2026-10-v146-10",
    date: "2026-10-19",
    title: "Nouvelles étapes de production",
    items: [
      { t: "Montage, Élec, Tests, Packaging", d: "Ces 4 étapes remplacent « Production ENOGIA ». L'avancement suit l'état choisi : Montage 0–40 %, Élec 40–80 %, Tests 80–90 %, Packaging 90–95 %, Expédiée 100 %." },
      { t: "Bouton « i » à côté des filtres d'état", d: "Il ouvre une frise qui montre chaque étape, son avancement et le détail de ce qu'elle couvre." },
      { t: "Écran atelier remanié", d: "Une page toutes les 15 secondes : la semaine, le mois, les semaines suivantes (arrivées, tests, départs) et les chiffres clés depuis le 19/05." },
      { t: "Dates client et NOBO", d: "Dans Statut & état, on choisit désormais une date pour le client et une date pour NOBO." },
      { t: "Couleurs plus lisibles", d: "États plus contrastés, Calendrier sans vert ni rouge (Fin prod en violet, Départ en orange). Le Gantt ne change pas." },
      { t: "Menus simplifiés", d: "Le bouton Manager passe en haut à droite ; mode sombre et thème sont regroupés dans le bouton palette." },
    ],
  },
  {
    id: "2026-10-v146",
    date: "2026-10-19",
    title: "Ce qui change dans le planning",
    items: [
      { t: "Repères « nouveau / modifié »", d: "Après un import, les PJ touchés portent une pastille (+3 j, −2 j, nouveau…) dans la Liste et le Calendrier. Bouton « Modifiés » pour ne voir qu'eux." },
      { t: "Alerte de mise à jour en direct", d: "Le message « Le planning a été mis à jour » s'affiche tout de suite et ne disparaît plus avec Ctrl + R tant qu'il n'est pas lu." },
      { t: "Écran atelier", d: "Un diaporama plein écran pour la TV (icône écran, à gauche) : cette semaine, départs à 30 jours, retards, dernière mise à jour." },
      { t: "Touche T et dernière vue", d: "T recentre le Gantt ou le Calendrier sur aujourd'hui. L'onglet ouvert en dernier est retrouvé à la prochaine visite." },
      { t: "Couleurs harmonisées", d: "Arrivée en bleu-gris et Départ en rose, identiques dans le Calendrier, les fiches et les rapports." },
      { t: "Nouvelle icône", d: "L'onglet du navigateur et l'icône d'installation reprennent le signe ENOGIA." },
      { t: "Cash in relié aux jalons de paiement", d: "Les fiches synthèse affichent l'avancement des encaissements, avec liaison manuelle et répartition d'un paiement sur plusieurs PJ.", admin: true },
    ],
  },
];
