// ── Nouveautés affichées une seule fois à la connexion, après un déploiement ───────────────────────────────
// À CHAQUE MISE EN PRODUCTION : ajouter une entrée EN TÊTE du tableau (id unique, jamais réutilisé), puis déployer.
// Chaque personne la voit une fois par poste (mémorisé dans localStorage) ; ceux qui ont raté plusieurs versions voient les 3 plus récentes.
//   • id      : identifiant stable (ex. "2026-10-v146")
//   • date    : "AAAA-MM-JJ"
//   • title   : titre court
//   • items   : [{ t: "titre court", d: "une phrase", admin?: true }]  — admin:true = réservé au super admin (ex. Cash in)
export const RELEASES = [
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
