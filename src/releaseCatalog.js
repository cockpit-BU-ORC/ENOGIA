// Catalogue des nouveautés depuis la V146.5 : on y coche ce qu'on veut annoncer (Manager › Réglages › Nouveautés).
// Chaque ligne : [titre court, une phrase, "admin" si réservée au super admin]. À compléter à chaque version.
export const RELEASE_CATALOG = [
  { v: "146.5", t: "Colonne « État »", items: [
    ["Couleurs d'état d'avant", "La colonne État de la Liste et les pastilles d'état retrouvent leurs couleurs d'avant la V146.2."],
  ] },
  { v: "146.6", t: "Icône du site", items: [
    ["Icône aux couleurs d'ENOGIA", "L'onglet du navigateur et l'icône d'installation reprennent le signe ENOGIA sur fond bleu-vert."],
  ] },
  { v: "146.7", t: "Alerte de mise à jour", items: [
    ["Alerte « Le planning a été mis à jour » en direct", "Elle s'affiche tout de suite chez toutes les personnes connectées, sans actualiser."],
    ["Alerte qui ne disparaît plus avec Ctrl + R", "Elle revient à chaque chargement tant qu'elle n'a pas été lue ; l'onglet du navigateur affiche « ● (1) » en attendant."],
  ] },
  { v: "146.8", t: "Repères, écran atelier, raccourcis", items: [
    ["Repères « nouveau / modifié »", "Après un import, les PJ touchés portent une pastille (+3 j, −2 j, nouveau…) dans la Liste et le Calendrier, avec un bouton « Modifiés » pour ne voir qu'eux."],
    ["Écran atelier pour la TV", "Un diaporama plein écran (icône écran à gauche) : Échap pour fermer, flèches pour changer de page, Espace pour la pause."],
    ["Touche T", "Elle recentre le Gantt ou le Calendrier sur aujourd'hui."],
    ["Dernière vue retrouvée", "L'onglet ouvert en dernier est rouvert à la prochaine visite."],
    ["PJXXX écartés des modifications", "Les estimations n'apparaissent plus dans « Modifications du planning » ni dans le message de mise à jour."],
  ] },
  { v: "146.9", t: "Pop-up Nouveautés", items: [
    ["Pop-up « Nouveautés » à la connexion", "Après un déploiement, chacun voit une fois un résumé des améliorations (les 3 dernières s'il en a raté plusieurs)."],
  ] },
  { v: "146.10", t: "Étapes de production", items: [
    ["Étapes Montage, Élec, Tests, Packaging", "Elles remplacent « Production ENOGIA » ; l'avancement suit l'état choisi."],
    ["Bouton « i » à côté des filtres d'état", "Il ouvre une frise qui détaille chaque étape et ce qu'elle couvre."],
    ["Couleurs plus contrastées", "États et étapes plus lisibles ; le Gantt garde ses teintes."],
    ["Éditeur du pop-up Nouveautés", "Manager › Réglages › Nouveautés : on coche, reformule, ajoute les lignes, puis on publie.", "admin"],
  ] },
  { v: "146.11", t: "États simplifiés, écran atelier refait", items: [
    ["Avancement déduit de l'état", "Plus de cases à cocher ni d'onglet Avancement : Montage 20 %, Élec 60 %, Tests 85 %, Packaging 93 %, Expédiée 100 %."],
    ["Écran atelier refait", "Une page toutes les 15 s : semaine, mois, semaines suivantes et chiffres clés depuis le 19/05."],
    ["Menus allégés", "Le mode sombre rejoint le bouton palette ; le bouton Manager passe en haut à droite."],
    ["Calendrier sans vert ni rouge", "Fin prod en violet, Départ en orange."],
    ["Pastille « modifié » qui ne recouvre plus le N° de série", "Elle est maintenant sur la deuxième ligne."],
    ["Dates client et NOBO", "Dans Statut & état, une date pour le client et une pour NOBO, affichées dans le Calendrier, les fiches, la Liste et les rapports."],
  ] },
  { v: "146.12", t: "Tri, fiches, statuts à risque", items: [
    ["Tri depuis les flèches des colonnes", "On trie directement depuis la flèche de chaque en-tête de la Liste ; les anciens menus disparaissent."],
    ["Gamme en grand sur l'écran atelier", "La gamme de chaque machine s'affiche en grand."],
    ["N° de série et gamme toujours visibles", "Dans le Calendrier et le Gantt, la colonne Machine ne les coupe plus."],
    ["Actions de la semaine avec échéance", "Chaque action a une date ; les retards ressortent en rouge, y compris dans les rapports."],
    ["« À risque » : commentaire obligatoire", "Passer un statut au rouge demande un commentaire (et un plan de mitigation pour le Planning)."],
    ["Cash in dans les fiches", "Les administrateurs voient les jalons de paiement dans les fiches synthèse, en lecture seule.", "admin"],
    ["Major components modifiables", "Les administrateurs peuvent renommer, ajouter ou retirer les composants d'une fiche.", "admin"],
    ["Exports PowerPoint plus sûrs", "Les zones de commentaire s'adaptent au texte : plus de texte qui sort du cadre."],
    ["Mode sombre plus lisible", "Les états et les étapes se détachent mieux du fond."],
  ] },
  { v: "146.13", t: "Calendrier bicolore, rapports ENOGIA", items: [
    ["Calendrier : tuiles en diagonale", "Quand plusieurs étapes tombent dans la même semaine, la tuile est coupée en diagonale aux couleurs de chaque étape."],
    ["Nom complet dans la colonne Machine", "Le nom du projet s'affiche en entier dans le Calendrier et le Gantt."],
    ["Écran atelier : 4 semaines et calendrier", "Toutes les machines attendues sur 4 semaines, un calendrier arrivées / tests / départs et des chiffres clés tournés vers le mois prochain."],
    ["Bouton Manager plus discret", "Une icône mêlant cadenas, projet et roue crantée."],
    ["Rapports PowerPoint et CODIR au gabarit ENOGIA", "Page de garde, bandeau, tableaux et page de contact reprennent le gabarit de l'entreprise."],
  ] },
  { v: "146.14", t: "Jalons par machine, causes de retard", items: [
    ["Jalons de paiement machine par machine", "Pour un contrat général (ex. PJ461) avec plusieurs machines, chaque jalon peut être global ou réservé à certaines machines.", "admin"],
    ["Créer une cause de retard à la volée", "La liste des causes propose « ＋ Nouvelle cause… »."],
    ["« Réceptionné » à la place de « Installé »", "La 3e colonne des Major components couvre une pièce reçue à ENOGIA comme installée."],
    ["Écran atelier : légende et étapes en toutes lettres", "Légende des couleurs en bas de page, étape écrite dans le calendrier, couleurs par gamme sur les chiffres clés."],
    ["PowerPoint : Abel et Roboto", "Titres en Abel, texte en Roboto, textes secondaires plus contrastés."],
    ["Rapport CODIR réservé au super admin", "Le bouton n'apparaît que pour le super admin."],
  ] },
  { v: "146.15", t: "Téléphone, étapes, jalons communs", items: [
    ["Application sur téléphone et tablette", "Barre de navigation en bas sur téléphone, en-tête compact, fiche sous la liste ; installable sur l'écran d'accueil."],
    ["Étapes « Montage Méca » et « Montage Élec »", "Avec « Pose de l'armoire », « FAT » dans les Tests et une note sur le remplissage."],
    ["Tri par date : prochaine date d'abord", "La date la plus proche à venir passe en tête ; « Date la plus tardive d'abord » inverse."],
    ["Nouvelle cause de retard partout", "Proposée aussi dans l'onglet Retards et dans la fiche du planning."],
    ["Jalons communs à plusieurs machines", "Un jalon « Commun » (ex. l'acompte de PJ461) n'est pas divisé et porte la mention « ne pas additionner ».", "admin"],
    ["Calendrier de l'écran atelier complet", "Toutes les étapes de chaque jour, avec retour à la ligne."],
    ["Boutons de rapport au-dessus de la fiche", "Ils sont dans une barre au-dessus de la fiche synthèse ; le bouton Manager ouvre toujours « Fiche projet »."],
    ["Synthèse PowerPoint avec pays et montant", "Colonnes Pays et Montant, montant cumulé, et roadmap du CODIR sans texte superposé."],
  ] },
  { v: "146.16", t: "Catalogue des nouveautés", items: [
    ["Choisir les nouveautés à annoncer", "Manager › Réglages › Nouveautés : toutes les évolutions depuis la V146.5 se cochent ; depuis la bêta, la sélection se publie vers la production.", "admin"],
  ] },
  { v: "146.17", t: "Écran atelier corrigé", items: [
    ["Écran atelier : jours de production suivis", "Les jours désactivés (Manager › Production) et les fermetures sont pris en compte dans la page « Cette semaine »."],
    ["Écran atelier : « machines à fabriquer »", "Ne compte plus que les machines en production (Montage, Élec, Tests, Packaging)."],
  ] },
  { v: "146.18", t: "Saisie multi-projets, états, expédiées masquées", items: [
    ["Saisie sur plusieurs projets", "Action, plan de mitigation, commentaire ou statut global ajoutés d'un coup à tous les PJ cochés, avec clôture groupée des actions."],
    ["Nouveaux états avec couleur", "Suivi › Statut & état : « ＋ Créer / gérer les états… » dans la liste déroulante.", "admin"],
    ["Expédiées masquées de base", "Les machines expédiées sont masquées par défaut ; le filtre État permet de les afficher."],
    ["Composant réceptionné", "Cocher « Réceptionné » coche aussi Design et PO."],
    ["Date du dernier import", "L'en-tête montre la date et l'heure du dernier import ; l'indice n'est plus demandé."],
    ["Écran atelier : jours non prod", "Un jour « non prod » ou fermé n'affiche plus rien pour la machine."],
  ] },
  { v: "146.19", t: "Actions et risques structurés, retards en lot", items: [
    ["Actions : action, état, date", "Chaque action de la semaine a sa zone d'action, son état (À faire, En cours, Bloqué, Terminé) et sa date."],
    ["Plan de mitigation structuré", "Risque, ce qu'on fait pour l'éviter, état et date remplacent la zone de commentaire unique."],
    ["Retards sur plusieurs projets", "Nouvel onglet Retard dans la saisie multi-projets : même cause et mêmes jours sur tous les PJ cochés."],
    ["Créer un état depuis la liste", "L'option « ＋ Créer / gérer les états… » de Statut & état montre les états existants et leurs couleurs et permet d'en créer.", "admin"],
    ["Pop-up Nouveautés stable", "Il ne s'ouvre plus puis se referme à l'actualisation."],
  ] },
  { v: "146.20", t: "Version téléphone", items: [
    ["En-tête compact sur téléphone", "Logo et titre sur une ligne ; import, Manager et profil en icônes."],
    ["Vue d'ensemble repliée sur téléphone", "On arrive directement sur la liste ; le chevron rouvre les camemberts."],
    ["Liste, Gantt, Calendrier lisibles", "Colonne des noms étroite, plus de fiche vide ni de message parasite."],
  ] },
  { v: "146.21", t: "Import réservé, en-tête de la Liste", items: [
    ["Import du planning réservé aux admins", "Le bouton d'import n'apparaît plus pour les autres comptes.", "admin"],
    ["En-tête de la Liste", "Le filet sombre entre Chef de Projet et Gamme disparaît."],
  ] },
  { v: "146.22", t: "Pool de turbines", items: [
    ["Onglet Turbines (Manager)", "Pool 100LT / 20LT avec date de MàD, attribution et ré-attribution en direct aux PJ ou au SAV.", "admin"],
    ["Roue et injecteur par nom", "Nom pris dans une liste ; case cochée = réservé pour la turbine, décochée = disponible.", "admin"],
    ["Stock virtuel sur 12 semaines", "Turbines arrivées, libres et attribuées, avec alertes avant les tests et le départ.", "admin"],
    ["Import Excel des turbines", "Un fichier simple (type, date ou semaine, réf., quantité) met le pool à jour chaque semaine ; modèle téléchargeable.", "admin"],
  ] },
  { v: "146.23", t: "Certifications, prix et pénalités", items: [
    ["Certification dans la fiche synthèse", "Liste déroulante de certifications créées par vous, chacune avec sa couleur ; visibles dans l'en-tête de la fiche."],
    ["Prix de la fiche et dates contractuelles", "Prix par fiche, livraison contractuelle / prévue en plus de la MaD ORC.", "admin"],
    ["Pénalités de retard", "% par semaine, période de grâce, jalon de départ (MaD ORC, livraison) et plafond ; calcul automatique selon les dates.", "admin"],
    ["Plusieurs fiches par PJ", "Total du PJ affiché et copie des conditions sur les autres fiches (PJ461-1, -2, -3…).", "admin"],
    ["Projets SAV pour les turbines", "Liste de projets SAV créée au fil de l'eau, proposée dans l'attribution des turbines.", "admin"],
  ] },
  { v: "146.24", t: "Turbines en glisser-déposer", items: [
    ["Tableau d'attribution", "Glisser les turbines entre stock, stock virtuel, PJ et projets SAV ; 1 ou 2 turbines par PJ selon la gamme.", "admin"],
    ["Roue et injecteur sur la turbine", "Se glissent comme des sous-ensembles ; alerte rouge s'il manque dans la semaine qui arrive.", "admin"],
    ["Certification dans son propre cadre", "Séparée du cadre Prix & pénalités dans la fiche synthèse."],
    ["Pénalités simplifiées", "Période de grâce en semaines, semaine entamée = semaine entière, plus de dates MES."],
  ] },
  { v: "146.25", t: "Turbines : dates, export, communication", items: [
    ["Cartes projet colorées et plus claires", "Couleur de gamme, état, dates et échéances de la roue / de l'injecteur ; projets expédiés ou installés masqués.", "admin"],
    ["MàD modifiable en direct", "Corrigée sur la turbine, conservée au ré-import tant que le fichier n'a pas changé.", "admin"],
    ["Export / import Excel sans casse", "L'export porte l'attribution ; le ré-import ne touche que type et date.", "admin"],
    ["Pré-remplir depuis le planning", "Turbines à prévoir selon les gammes, datées de l'arrivée des ORC ; ajout par quantité.", "admin"],
    ["À communiquer au responsable turbines", "Liste et message prêt à copier pour les attributions pas encore transmises.", "admin"],
  ] },
  { v: "146.26", t: "Turbines : stock en colonnes, SAV, import", items: [
    ["Stock réel / virtuel côte à côte", "Colonnes multiples, vert pour le stock réel, violet pour le futur ; échéance et retard visibles.", "admin"],
    ["Roues et injecteurs dans la zone", "Ajout direct et choix au clic sur la turbine, en plus du glisser-déposer.", "admin"],
    ["Projet SAV par fenêtre", "Cadre SAVxxx créé depuis le n° du PJ avec la turbine demandée ; suppression réservée au super admin.", "admin"],
    ["Import du fichier du responsable turbines", "Format « Livraisons turbines ORC » reconnu automatiquement, sans toucher aux attributions existantes.", "admin"],
  ] },
  { v: "146.27", t: "Turbines : règles d'arrivée et stock du fichier", items: [
    ["Échéances depuis l'arrivée de la machine", "Turbine à l'arrivée, roue connue 1 semaine avant, injecteur le jour de l'arrivée.", "admin"],
    ["« Complet » seulement si tout est rempli", "Turbines, roues et injecteurs ; sinon la carte liste ce qui manque.", "admin"],
    ["Roue / injecteur seul sur un projet", "Déposable sans turbine ; repris par la turbine à son arrivée.", "admin"],
    ["Stock réel / virtuel d'après le Google Sheet", "Import direct : livré = réel, à venir = virtuel ; projets expédiés ou installés ignorés.", "admin"],
  ] },
  { v: "146.28", t: "Fiche par zones, turbines repliables, export responsable", items: [
    ["Fiche de synthèse en 4 zones", "Pilotage, Planning, Finance, Suivi en pleine largeur, empilés."],
    ["Certification comme le N° de série", "Élément d'en-tête à côté du S/N, sans cadre à part."],
    ["Prix de la fiche d'init.", "Zone Finance : prix de la fiche d'initialisation (objectif de marge), pénalités, achats, paiements.", "admin"],
    ["Turbines : PJ repliés, 2/3 PJ – 1/3 SAV", "Nom du PJ seul, mois en cours ouvert ; SAV à droite.", "admin"],
    ["Export au format du responsable", "Même fichier que l'import avec vos MàD, ré-importable.", "admin"],
  ] },
  { v: "147", t: "Fiche en colonnes, stock turbines réel", items: [
    ["Fiche de synthèse en colonnes", "Chaque zone en 3 ou 4 colonnes côte à côte : fiche beaucoup plus courte."],
    ["Certification machine en liste déroulante", "Dans l'en-tête de la fiche, avec son libellé."],
    ["Stock virtuel = appros attendus", "Turbines du fichier du responsable, 12 semaines ; estimations du planning hors stock.", "admin"],
    ["SAV411-1", "Le nom du cadre SAV garde le tiret du PJ.", "admin"],
  ] },
  { v: "148", t: "Stock « À venir », certification en couleur, CODIR", items: [
    ["Stock « À venir »", "Toutes les turbines du fichier du responsable jusqu'en mars ; « virtuel » renommé ; livrées = stock réel.", "admin"],
    ["Certification machine en couleur", "Pastille à la couleur de la certification, liste colorée."],
    ["CODIR : pénalités et fiche d'init.", "Montants dans chaque page PJ et dans la synthèse, sur une page."],
  ] },
  { v: "149", t: "@mentions, pénalités activées, rapport CdP complet", items: [
    ["Taguer un manager (@)", "Dans le fil de commentaires de la fiche, avec suivi « traité »."],
    ["Pénalités activées par le client", "Case à cocher ; plafond et unité sur la même ligne."],
    ["Rapport CdP : fiche complète", "Prix de la fiche d'init., livraison, pénalités, certification."],
  ] },
  { v: "150", t: "Composants, livraison contractuelle, Tf final", items: [
    ["Liste des composants gérable", "Ajouter, renommer, réordonner, retirer ; ajout rapide dans chaque fiche."],
    ["Livraison à côté de la MaD ORC", "Dates de livraison (transport inclus) dans Contrat & roadmap."],
    ["Tf final", "Remplace « Fin projetée » une fois le projet expédié."],
    ["Pénalités compactes, en rouge si activées", "Bloc plus court ; la case passe au rouge."],
    ["CODIR sans doublons", "Plus de répétition du montant ni du % payé ; vocabulaire « fiche d'init. » supprimé."],
  ] },
  { v: "151", t: "État et présence client/NOBO dans la Liste, privés masqués", items: [
    ["État modifiable dans la Liste", "Les administrateurs changent l'état d'un PJ directement dans le tableau."],
    ["Présence client / NOBO dans la Liste", "Éditeur flottant : client, NOBO ou les deux, une date chacun dans la période de tests."],
    ["Commentaires privés masqués", "Cachés à l'ouverture d'un PJ ; bouton « Afficher les privés (n) »."],
  ] },
  { v: "152", t: "Taguer partout, cloche de notifications", items: [
    ["@ dans tous les commentaires", "Fenêtre projet de la Liste et page Commentaires, en plus de la fiche Manager."],
    ["Cloche dans l'en-tête", "Compteur des demandes où l'on est cité, « Ouvrir la fiche » et « ✓ Traité »."],
    ["Prévenir par e-mail", "Case optionnelle : e-mail préparé dans la messagerie de l'auteur."],
  ] },
  { v: "153", t: "Taguer comme sur Gmail", items: [
    ["Saisie @ avec suggestions", "Flèches + Entrée ; la liste complète des personnes n'est plus affichée."],
    ["Tous les comptes déjà connectés", "Registre planning/knownUsers alimenté à chaque connexion."],
    ["Cloche pour tous", "Messages privés toujours réservés aux managers."],
  ] },
  { v: "154", t: "Onglet Tests, chef de projet prévenu", items: [
    ["Manager › Tests", "Testeurs, affectation aux périodes de tests, tests FAT interne / client / NOBO."],
    ["Chef de projet notifié", "Chaque commentaire sur son PJ arrive dans sa cloche."],
    ["Tag @ sans managers", "Seuls les comptes déjà connectés sont suggérés."],
  ] },
  { v: "155", t: "Page Tests à gauche, fiches par machine", items: [
    ["Page Tests dans le rail de gauche", "Administrateurs + testeurs de la liste (consultation)."],
    ["Fiches de test par machine", "Modèle de la checklist FAT : qui teste, présence, tests à réaliser."],
    ["Planning des testeurs", "Frise sur 6 semaines, « À affecter », chevauchements."],
    ["Dates client / NOBO", "Lecture seule dans cette page (Liste uniquement)."],
  ] },
  { v: "156", t: "Tag @ par prénom, testeurs et choix des tests", items: [
    ["Fenêtre de suggestions", "Recherche sur le prénom seulement, avatar + nom + adresse, comme Gmail."],
    ["Testeurs : cocher / décocher", "Un testeur affecté choisit les tests de sa machine et commente."],
  ] },
  { v: "157", t: "Tests en consultation, message dans la fenêtre @", items: [
    ["Testeurs en lecture seule", "Seuls les administrateurs cochent / décochent les tests et commentent."],
    ["Fenêtre @ vide expliquée", "Message si personne d'autre ne s'est encore connecté ou si aucun prénom ne correspond."],
  ] },
  { v: "158", t: "Menu Manager en rail, Ctrl K", items: [
    ["Rail latéral groupé", "Pilotage / Projets / Admin, sous-onglets en accordéon, réductible (mémorisé sur le poste)."],
    ["Aller à… (Ctrl K)", "Recherche d'un onglet, d'un sous-onglet ou d'un PJ, avec les 3 derniers choix."],
    ["Fil d'Ariane et fondu", "Position toujours visible, transition douce à chaque changement d'écran."],
  ] },
  { v: "159", t: "Menu libellé, Ctrl K partout, fiche en pop-up", items: [
    ["Menu principal libellé", "Groupes Planning / Suivi, réductible en icônes (mémorisé sur le poste)."],
    ["Ctrl K sur toutes les pages", "Pages et fiches PJ ; loupe dans l'en-tête."],
    ["Fiche en volet ou en pop-up", "Choix personnel, dans la fiche ou dans les réglages d'affichage."],
    ["Icône Manager", "Bouclier avec coche ; case « e-mail » des commentaires retirée."],
  ] },
  { v: "160", t: "Étiquette Client + NOBO", items: [
    ["Tuile Tests de la fiche PJ", "L'étiquette de présence ne déborde plus."],
  ] },
  { v: "161", t: "Couleurs « Ardoise »", items: [
    ["Fond gris froid, bleu acier", "Thème par défaut plus sobre (clair et sombre)."],
    ["Une rampe de couleurs", "États et étapes : bleu marine → bleu → sarcelle → vert ; rouge réservé au retard."],
  ] },
  { v: "162", t: "Accueil « Aujourd'hui » et finitions", items: [
    ["Page d'accueil", "Chiffres animés, mentions à traiter, mes projets, prochains départs, ce qui a bougé."],
    ["Actions rapides", "Clic droit ou ⋯ sur une ligne de la liste : ouvrir, commenter, copier le n°, changer l'état (admin)."],
    ["Gantt", "Zoom continu (Ctrl + molette), regroupement par projet, aperçu enrichi."],
  ] },
  { v: "163", t: "Palette B, accueil par profil, liste explicite", items: [
    ["Couleurs", "Étapes plus marquées, liseré coloré sur les cadres, mode sombre plus clair."],
    ["Accueil par profil", "Blocs selon manager / chef de projet / testeur, réglables avec « Personnaliser »."],
    ["Liste", "Bulles au survol (étapes, écart de départ, avancement) et liseré d'état sur la ligne."],
    ["Cohérence", "Roboto partout, en-tête commun, densité compacte par défaut."],
  ] },
  { v: "164", t: "Couleurs sur le texte, liste redimensionnable", items: [
    ["Couleurs d'état", "N° de PJ, pourcentage et barre aux couleurs de l'état (fiches synthèse, accueil)."],
    ["Liste des projets", "Colonne de gauche redimensionnable (poignée) et repliable en mini-liste."],
    ["Accessibilité", "Lien d'évitement, tri annoncé, poignée au clavier."],
  ] },
  { v: "165", t: "Fiche pleine largeur, accessibilité partout", items: [
    ["Fiche synthèse", "Pleine largeur quand la liste de gauche est réduite."],
    ["Accessibilité", "Champs, listes et boutons nommés ; zones de clic élargies ; plus de texte sous 11 px."],
    ["Manager", "Un titre de page sur chaque onglet."],
  ] },
  { v: "166", t: "Calendrier réparé", items: [
    ["Calendrier", "Ne plante plus à l'ouverture quand le zoom mémorisé est illisible."],
  ] },
  { v: "167", t: "Calendrier fluide", items: [
    ["Calendrier", "Seules les colonnes visibles sont dessinées : ouverture rapide, plus de blocage."],
    ["Survol et commentaires", "Ne redessinent plus tout le calendrier."],
  ] },
  { v: "168", t: "Calendrier instantané, Manager plus lisible", items: [
    ["Calendrier", "Seules les machines et dates visibles sont dessinées."],
    ["Manager", "Causes de retard lisibles dans tous les thèmes, couleurs du thème dans les graphiques."],
    ["Accessibilité", "Volet « Déclarer un retard » au clavier (Échap), état des boutons de choix annoncé."],
  ] },
  { v: "169", t: "Un accueil plus direct", items: [
    ["À traiter", "Mentions, tests et dérives réunis dans un seul bloc, une pastille par ligne."],
    ["Départs", "Colonne à droite avec accès au calendrier."],
    ["Parcours", "Machines ouvertes par étape sur une seule barre."],
  ] },
  { v: "170", t: "Calendrier recentré, tout au clavier", items: [
    ["Calendrier", "Semaine passée à gauche, 3 semaines à venir à droite ; commentaires par jour retirés."],
    ["Clavier", "Filtres, listes et lignes utilisables avec Tab et Entrée ; Échap ferme les fenêtres."],
  ] },
  { v: "171", t: "Liste, Gantt et fiche plus lisibles", items: [
    ["Liste", "Vue d'ensemble en barres triées, en-tête du tableau allégé."],
    ["Gantt", "Une couleur par niveau d'écart, trait du planning initial."],
    ["Fiche projet", "En-tête PJ + nom + état, informations clés, étapes en une barre."],
  ] },
  { v: "172", t: "Calendrier sans bulles, étapes nommées", items: [
    ["Calendrier", "Plus d'infobulle au survol ; chaque jour affiche son étape, abrégée si la colonne est étroite."],
  ] },
  { v: "173", t: "Nouveau style « Atelier »", items: [
    ["Style", "Fond crème, menu marine avec repère jaune, grands titres et chiffres ; anciens thèmes toujours disponibles."],
    ["Accueil et liste", "N° de PJ en plaques, couleur d'état sur chaque ligne, chiffres animés."],
    ["Transitions", "Fondus, barres qui se remplissent, désactivés si l'ordinateur demande moins d'animations."],
  ] },
  { v: "174", t: "Gantt, Calendrier et fiche au style « Atelier »", items: [
    ["Plaques", "N° de PJ en plaques dans le Gantt et le Calendrier."],
    ["Commandes", "Boutons actifs et « Aujourd'hui » en bleu marine."],
    ["Fiche projet", "Grande plaque, nom du projet en titre, onglets soulignés."],
  ] },
  { v: "175", t: "Le style « Atelier » sur tout le site", items: [
    ["Suivi et Manager", "Plaques de PJ, intitulés d'atelier et grands chiffres sur Modifications, Commentaires, Tests et Manager."],
  ] },
  { v: "176", t: "Vue d'ensemble compacte, accès à la fiche synthèse", items: [
    ["Liste", "Camemberts colorés de retour, en plus compact ; plaques de PJ sur fond clair."],
    ["Fiche synthèse", "Bouton dans la fiche projet pour ouvrir la fiche synthèse (admins)."],
    ["Thèmes", "Forêt et Cuivre retirés."],
  ] },
  { v: "177", t: "Nouvelles couleurs, police et icônes", items: [
    ["Couleurs", "Nouvelle palette pour les étapes, états, gammes et alertes, sur toutes les pages."],
    ["Police", "Cabinet Grotesk (titres, chiffres) et Satoshi (texte)."],
    ["Icônes", "Famille Phosphor partout."],
  ] },
  { v: "178", t: "Plus de place pour le contenu", items: [
    ["En-tête", "Grand titre retiré ; la barre s'efface au défilement, seul le logo reste."],
    ["Liste", "Vue d'ensemble repliée automatiquement en descendant."],
    ["Manager", "Fiche synthèse plein écran, sous-pages au survol des icônes ; Pilotage aligné."],
  ] },
  { v: "179", t: "Écran de connexion et en-tête allégé", items: [
    ["Connexion", "Nouvel écran en un clic ; session fermée chaque soir à minuit."],
    ["En-tête", "Logo en haut du menu ; informations d'import réservées aux admins."],
  ] },
  { v: "180", t: "Messages clairs et planning plus lisible", items: [
    ["Messages", "Notifications discrètes au lieu des fenêtres bloquantes ; bandeau si les données ne sont plus synchronisées."],
    ["Liste", "Vues prêtes Atelier et Direction dans le menu Colonnes."],
    ["Gantt et calendrier", "Prochain jalon mis en avant ; abréviations rappelées dans la légende."],
  ] },
  { v: "181", t: "Des mouvements plus fluides", items: [
    ["Animations", "Fondu entre les vues, lignes et barres qui arrivent, retour au clic ; courtes et désactivables."],
  ] },
  { v: "182", t: "Nouveau thème « Salle de contrôle »", items: [
    ["Thèmes", "Salle de contrôle (ardoise dense, écran d'atelier) en plus d'Atelier et Ardoise ; fin de l'effet en relief."],
  ] },
  { v: "183", t: "ORDO & OPS – BU ORC", items: [
    ["Nom", "Nouveau nom du site et sous-titre, partout."],
    ["Titres", "Titres de page plus grands, sans sur-titre."],
    ["Connexion", "Carte du monde en fond ; nouvel écran après connexion ; thème Atelier retiré."],
  ] },
  { v: "184", t: "Un Gantt lisible", items: [
    ["Gantt", "Barres découpées par étape, écart écrit en clair, planning initial en pointillés, lignes alignées."],
  ] },
  { v: "185", t: "Thème mixte, titres en couleur, droits des admins", items: [
    ["Thème", "Ardoise : clair gris froid, sombre marine et or ; par défaut."],
    ["Titres", "Une couleur de trait par page ; camemberts animés, totaux en gras."],
    ["Admins", "Mêmes droits que le super admin, sauf le Cash in."],
  ] },
  { v: "186", t: "Une page Tests par semaine", items: [
    ["Tests", "Colonnes par semaine, une carte par machine, avancement des tests."],
    ["Volet de détail", "Testeurs et tests à cocher une fois réalisés."],
  ] },
  { v: "187", t: "Les testeurs renseignent leurs tests", items: [
    ["Tests", "Statut par test (en cours, réussi, échec) avec nom, date et heure ; gamme sur les cartes."],
    ["Titres", "Plus grands ; plus de titre répété sur la page Tests."],
  ] },
  { v: "188", t: "Un accueil pour chaque rôle", items: [
    ["Accueil", "Testeur, chef de projet, chef d'atelier, direction : chacun ses blocs."],
    ["Notifications", "Nouvelles affectations aux tests dans la cloche, ajout à l'agenda Google."],
    ["Manager", "Personnes et rôles : rôle et PJ de chaque compte."],
  ] },
  { v: "189", t: "Tests en pop-up, calendrier et fiche PDF signée", items: [
    ["Tests", "Fiche de la machine en pop-up central ; signature des testeurs ; fiche PDF au format ENOGIA."],
    ["Calendrier", "Deux semaines par testeur, avancement dans les barres, affectation par glisser-déposer."],
  ] },
  { v: "190", t: "Fiches par chef de projet, fiche PJ plus claire", items: [
    ["Fiche PJ", "En-tête sur une ligne, parcours en 5 étapes, chiffres clés, actions en bas."],
    ["Fiches projet", "Liste par chef de projet, vue d'ensemble de tous ses projets."],
  ] },
  { v: "191", t: "Menus discrets, projets EPC, plusieurs chefs de projet", items: [
    ["Menus", "Repliés par défaut, ouverts au survol."],
    ["Projets", "Plusieurs chefs de projet ; pastille EPC avec le chef de projet ORC ; expédiées masquées."],
    ["Accueil", "Réglé par personne dans le Manager ; chiffres du Cash in pour la direction."],
  ] },
  { v: "192", t: "Des couleurs d'état bien distinctes", items: [
    ["Couleurs", "Nouvelle palette d'état, étiquettes Client / NOBO, camemberts plus contrastés."],
  ] },
  { v: "193", t: "Le Cash in intégré au site", items: [
    ["Cash in", "Chiffres, À traiter, jalons et volet d'édition dans le Manager ; import et export Excel."],
  ] },
  { v: "194", t: "Cash in complet dans le site", items: [
    ["Cash in", "Vues Projets, Cash par mois et Écarts intégrées."],
  ] },
  { v: "195", t: "Menu, signatures en image, accueil plus fluide", items: [
    ["Menu", "Mini-barre ; la flèche l'ouvre en entier."],
    ["Tests", "Signature : nom, fonction et image ; PDF simplifié."],
    ["Accueil", "Tuiles dimensionnées et apparition plus douce."],
  ] },
  { v: "196", t: "Un espace Manager plus aéré", items: [
    ["Manager", "Un seul menu, en-tête commun, sous-pages en onglets, filtres repliés, liste des fiches en tiroir."],
  ] },
  { v: "197", t: "Un seul thème, tests plus compacts", items: [
    ["Thème", "Un thème unique (clair Ardoise, sombre Salle de contrôle)."],
    ["Tests", "Machines sur deux lignes, proportionnées au contenu."],
    ["Liste", "Point de dérive retiré ; chef ORC pour les projets EPC."],
  ] },
  { v: "198", t: "Le tableau du Cash in, comme dans l'artefact", items: [
    ["Cash in", "Grand tableau modifiable au format de l'artefact, dans le site."],
  ] },
  { v: "199", t: "Le détail d'un PJ se déplie dans la Liste", items: [
    ["Liste", "Détail déplié sous la ligne, à la place du pop-up et du volet."],
  ] },
  { v: "200", t: "Fiche PDF en trois pages, tests terminés", items: [
    ["Tests", "PDF : page de garde, informations machine, résultats et validation ; colonne « Terminés »."],
  ] },
  { v: "201", t: "La fiche suiveuse, des cadres à la bonne taille", items: [
    ["Liste", "Détail en fiche suiveuse : étapes nommées, infos utiles, trois actions."],
    ["Tous les écrans", "Cadres proportionnés au contenu."],
  ] },
  { v: "202", t: "Fiche PJ en pop-up central, PV de debug au format ENOGIA", items: [
    ["Liste", "Fiche au centre avec flou, ouverture et fermeture animées."],
    ["Tests", "PV de debug machine interne au format du modèle ENOGIA."],
  ] },
  { v: "203", t: "Une seule fiche PJ, qui explique où en est la machine", items: [
    ["Fiche PJ", "Même fenêtre partout ; avancement, étape expliquée, sous-étapes, mini-frise, pastilles."],
  ] },
  { v: "204", t: "Le planificateur, rien que pour vous", items: [
    ["Planificateur", "Onglet réservé : ordre, dates, durées, liens, forçages, charge ; modèles par gamme."],
  ] },
  { v: "205", t: "La page Tests prend vie", items: [
    ["Tests", "Bandeau « Au banc maintenant », barre découpée test par test, fil des derniers résultats."],
  ] },
  { v: "206", t: "Le planificateur repart de vos dates", items: [
    ["Planificateur", "Reprise des dates du planning ; heures manquantes estimées par gamme pour la charge."],
  ] },
  { v: "207", t: "Les tests en grand calendrier", items: [
    ["Tests", "Calendrier de 3 semaines à la place des colonnes ; barres par machine, venues client / NOBO, fériés."],
  ] },
  { v: "208", t: "Un planificateur plus lisible", items: [
    ["Planificateur", "Charge collée en bas, capacité par semaine, libellés sur les barres, couloirs et liste réglables, mode sombre."],
  ] },
  { v: "209", t: "La page Tests en grille", items: [
    ["Tests", "Planning des bancs (une ligne par machine), Par testeur sur la même grille, catalogue en tableaux."],
  ] },
  { v: "210", t: "Cash in pour les chefs de projet, tous les PJ dans les bancs", items: [
    ["Cash in", "Ouvert aux admins, bloc sur leur accueil ; plus de sauvegarde / reprise JSON."],
    ["Tests", "Tous les PJ en ligne, colonnes PJ · gamme · testeur · client · NOBO · tests."],
  ] },
  { v: "211", t: "Planificateur : nouveaux PJ et tâches, 2 bancs, liens en deux clics", items: [
    ["Planificateur", "Nouveau PJ avec tâches et ressources, ajout et ordre des tâches, Packing, 2 bancs, liens en deux clics, clic droit pour se déplacer."],
  ] },
  { v: "212", t: "Un Manager plus simple, Cash in à portée de clic", items: [
    ["Menu", "Cash in et Turbines dans le menu de gauche ; sous-menus du Manager en surimpression."],
    ["Manager", "Machines ORC (S/N, chef, pays, état) ; Point hebdo dans Fiche projet ; Personnes, rôles et accès ; plus de Suivi ni d'Imports."],
  ] },
  { v: "213", t: "Les jours de production se règlent dans le Calendrier", items: [
    ["Calendrier", "Clic sur un jour : fermer l'atelier ou retirer la production de PJ ; Gantt coupé et charge recalculée."],
  ] },
  { v: "214", t: "Planificateur : lignes plus basses, liens en tirant, phase et ressource", items: [
    ["Planificateur", "Hauteur des lignes du Gantt, lien en tirant une barre sur une autre, phase et ressource modifiables sur chaque tâche."],
  ] },
  { v: "215", t: "KPI : un tableau de pilotage", items: [
    ["KPI", "Synthèse : 5 chiffres, PJ à risque, charge des 6 semaines, portefeuille par état."],
  ] },
  { v: "216", t: "Les pages KPI parlent la même langue", items: [
    ["KPI", "Charge, Dérives, Avancement, Retards : mêmes chiffres clés que la Synthèse, classements à une couleur, graphiques nets."],
  ] },
  { v: "217", t: "Cash in et Turbines en pages, un Manager mieux rangé", items: [
    ["Menu", "Cash in et Turbines sont des pages du site."],
    ["Manager", "Machines ORC sur une page avec la présence ; Pilotage / Projets / Réglages regroupés ; Retards › Analyse."],
    ["Import", "Les PJ absents du planning initial sont signalés après un import."],
  ] },
  { v: "218", t: "Un clic sur la tuile d'un PJ, et le planificateur suit", items: [
    ["Calendrier", "Clic sur la tuile d'un PJ : pas de production ce jour, fiche, fermeture ; le planificateur allonge les tâches et retire la charge."],
  ] },
  { v: "219", t: "KPI : charge du planificateur, camemberts, Explorer", items: [
    ["KPI", "Charge d'après le planificateur ; répartitions en camemberts ; sous-page Explorer."],
  ] },
  { v: "220", t: "ENOGIA – BU ORC", items: [
    ["Site", "Nouveau nom « ENOGIA – BU ORC » et nouveau sous-titre."],
  ] },
  { v: "221", t: "Machines ORC réparé, fiches regroupées, liens plus simples", items: [
    ["Manager", "Machines ORC réparé ; fiches regroupées par PJ (PJ461-1, -2…) avec synthèse commune."],
    ["Calendrier", "Fiche du PJ avec un bouton « production ce jour »."],
    ["Planificateur", "Fenêtre de liens à listes ; slots libres masqués ; Cash in, Turbines et Planificateur réservés au propriétaire."],
  ] },
  { v: "222", t: "Disposez vos cadrans", items: [
    ["Accueil, KPI, Tests", "Cadrans déplaçables et redimensionnables, disposition gardée sur le poste."],
  ] },
  { v: "223", t: "Isothermes sur l'accueil", items: [
    ["Accueil", "Courbes isothermes légères en coin, en clair et en sombre."],
  ] },
  { v: "224", t: "Bancs d'essai, zoom du planificateur, résumé des projets à plusieurs machines", items: [
    ["Planificateur", "Zoom (− + et Ctrl + molette), fenêtre Bancs d'essai (une machine par banc), charge masquable, barre compacte, liens d'un rond à l'autre réparés, insertion d'une tâche qui reprend les liens."],
    ["Manager", "KPI et Personnes et site réservés au propriétaire ; résumé en tête des fiches communes."],
    ["Cadrans", "Disposition réservée au propriétaire, glisser en direct, largeur au bord droit."],
  ] },
  { v: "225", t: "Un fond léger pour chaque page", items: [
    ["Toutes les pages", "Motif discret par page (cycle ORC, tuyauterie, traces de mesure, isothermes, rotor)."],
  ] },
  { v: "226", t: "Page Production turbines", items: [
    ["Production turbines", "Nouvelle page réservée (propriétaire + comptes autorisés) : accueil, planning turbines / arbres / pièces, stocks roues et injecteurs, gamme et durées."],
    ["Planificateur", "Bancs d'essai : « Allouer automatiquement » en un clic."],
    ["Cadrans", "Le cadran se saisit n'importe où et suit la souris."],
  ] },
  { v: "227", t: "Production turbines : fiches corrigées, kit pour le directeur", items: [
    ["Production turbines", "Éléments enregistrés rouverts correctement ; kit d'échange avec le Claude du directeur de production turbines."],
  ] },
  { v: "228", t: "États plus clairs, planificateur (priorité, archives), cadrans sobres", items: [
    ["États", "Fabrication fournisseurs (ex-Fabrication FNR), Design en cours (ex-Non désignée)."],
    ["Planificateur", "Priorité par PJ, archives (expédiés masqués), tableau des couloirs masquable, plus de pointillés, plus d'alerte après l'allocation des bancs."],
    ["Production turbines", "Une erreur dans la page ne touche plus le reste du site ; contrôle de version des retours du kit."],
  ] },
  { v: "229", t: "Un accueil pour chaque poste", items: [
    ["Accueil", "5 accueils par poste (chef de projet, testeur, chef d'atelier, directeur production turbines, autres) avec leur phrase ; disposition figée par poste, réglée par le propriétaire, catalogue « Ajouter un cadran »."],
  ] },
  { v: "230", t: "Cadrans libres, états modifiables, bancs et couloirs", items: [
    ["Cadrans", "Placement libre et hauteur réglable (bord bas, bord droit, coin)."],
    ["États", "Fabrication/Montage Fournisseurs ; états existants renommables, recolorables, avec explication."],
    ["Planificateur", "⚠ des bancs sans PJ masqués ni tests terminés ; priorité à gauche, Priorité et S/N masquables ; charge alignée en Couloirs."],
  ] },
  { v: "231", t: "Tout se fait sur le site, accueils de chaque poste visibles", items: [
    ["Planning", "Plus d'import MS Project ni de planning initial ; publication depuis le Planificateur ; journal des publications."],
    ["Accueil", "Choix de l'accueil d'un poste et de la personne vue (propriétaire) ; catalogue des cadrans par page du site."],
    ["Tests", "Machine expédiée = tests faits."],
    ["Fond", "Papier millimétré, motif annoté, second motif."],
  ] },
  { v: "232", t: "Le site s'appelle « BU ORC – Pilotage »", items: [
    ["Nom du site", "BU ORC – Pilotage (ex-ENOGIA – BU ORC)."],
  ] },
  { v: "233", t: "Un fond plus discret", items: [
    ["Fond", "Papier millimétré + un seul motif pâle sans texte (T-s, Mollier h-s ou rotor) ; papier millimétré très léger sur les tableaux."],
    ["Barre du haut", "Plus de « N unités · Mis à jour le … · N PJ modifiés »."],
  ] },
  { v: "234", t: "Le site s'appelle « Cockpit ORC »", items: [
    ["Nom du site", "Cockpit ORC (« Cockpit » en gras, « ORC » au surligneur) ; ex-BU ORC – Pilotage."],
  ] },
  { v: "235", t: "Plus de cadrans, disposition commune, règles de sécurité", items: [
    ["Cadrans", "7 nouveaux cadrans (expédiées, visites, banc de la semaine, états, départs par mois, fermetures, raccourcis) ; accueil « Autres personnes » enrichi."],
    ["Disposition", "KPI et Tests : disposition partagée (planning/profiles.pageLayouts), réglée par le propriétaire seul."],
    ["Sécurité", "firestore.rules (comptes @enogia.com, droits par document) + SECURITE.md, à publier dans la console."],
  ] },
  { v: "236", t: "Le site s'appelle « Cockpit BU ORC »", items: [
    ["Nom du site", "Cockpit BU ORC (« BU ORC » au surligneur) ; ex-Cockpit ORC."],
  ] },
  { v: "237", t: "Nouvelle adresse du site", items: [
    ["Adresse", "cockpit-bu-orc.github.io/ENOGIA (compte GitHub cockpit-BU-ORC, dépôt ENOGIA) ; ex-planning-enogia-bu-orc.github.io/planning-enogia-2026."],
  ] },
  { v: "238", t: "Personnes, rôles et responsable des testeurs", items: [
    ["Responsable des testeurs", "Rôle resptest : page Tests et accueil avec les machines de tous les testeurs ; avancement des tests modifiable."],
    ["Personnes et rôles", "Retirer / Rétablir (profil removed) ; « Coller une liste » d'adresses @enogia.com."],
    ["Mentions", "Personnes de planning/profiles taguables avant leur première connexion ; personnes retirées exclues."],
  ] },
  { v: "239", t: "Les PJXX ne comptent nulle part", items: [
    ["PJXX", "isEstimatePj élargi (PJXX, PJ4XX…) ; exclus de planToRows, diffRows, summarizeChanges, diffPlans, atelierPhases (charge) et de toutes les pages (dataWithOverrides).", "admin"],
  ] },
  { v: "240", t: "Cloche en rouge", items: [
    ["Cloche", "MentionBell : icône, pastille et compteur en T.red600 (texte de la pastille en T.card) quand il y a des demandes."],
  ] },
  { v: "241", t: "Projets EPC : chef de projet EPC, chef ORC en soutien", items: [
    ["EPC", "chefsOf : chefProjet + autres chefs, jamais chefOrc (remplace la règle V197) ; orcSupportOf ; pastille EPC sans nom ; « soutien ORC » dans les fiches ; libellé « Chef de projet ORC en soutien »."],
  ] },
  { v: "242", t: "Vidéo de présentation à la connexion", items: [
    ["Vidéo", "TutoVideo.js : profiles.tutoVideo { id, url, until, title } réglé dans Manager › Réglages › Nouveautés ; ouverture une fois par personne (localStorage enogia_tuto_seen_<id>_<adresse>), revue depuis la cloche (MentionBell, sans compter dans la pastille) jusqu'à la date de fin ; lien Drive, YouTube ou .mp4."],
  ] },
  { v: "243", t: "Machines livrées = machines expédiées", items: [
    ["Machines livrées", "countShippedYTD compte l'état « Expédiée » (départ dans l'année) ; departedNotShipped (départ passé, pas « Expédiée », hors PJXX) signalé sous le chiffre de la Liste et dans l'accueil."],
  ] },
  { v: "244", t: "Lecteur vidéo et réglage des nouveautés", items: [
    ["Vidéo toujours fermable", "La fenêtre de la vidéo est dimensionnée sur la hauteur de l'écran ; le bouton « Fermer » reste visible pendant la lecture."],
    ["Un seul réglage du pop-up Nouveautés", "Manager › Réglages › Nouveautés : on coche les lignes, on les reformule sur place, on ajoute des lignes libres ; « Enregistrer » corrige sans réafficher, « Publier » réaffiche à tous. Plus de numéro de version dans le pop-up.", "admin"],
  ] },
  { v: "245", t: "Tout voir avec un affichage agrandi", items: [
    ["Conseil de zoom", "Quand Windows agrandit l'affichage (125 %, 150 %), un bandeau indique le zoom du navigateur (Ctrl et −) qui redonne toutes les colonnes ; il disparaît une fois le zoom fait ou avec « Compris »."],
  ] },
  { v: "246", t: "KPI refaits (maquettes Claude Design)", items: [
    ["KPI › Synthèse", "Production, départs du mois, PJ en retard sur l'initial, charge 4 semaines, livrées cette année ; PJ à risque avec la pastille d'état ; charge en heures avec les dates ; portefeuille en barre à 100 %.", "admin"],
    ["KPI › Semaines", "Les 8 prochaines semaines en colonnes : charge atelier face à la capacité, départs avec leur dérive, machines au banc, et « À décider » (semaines en surcharge, plus forte dérive).", "admin"],
    ["KPI › Dérives", "En tête : « N machines partiront plus tard que prévu », classement des plus fortes dérives (clic = fiche), départs des 30 prochains jours, dérive moyenne et retards déclarés.", "admin"],
  ] },
  { v: "247", t: "Ouvertures et fermetures harmonisées", items: [
    ["Fenêtres", "Une seule ouverture (240 ms, sans rebond) et une seule fermeture (170 ms) pour toutes les fenêtres ; menus et sélecteurs en 160 ms."],
    ["Clavier", "Tab reste dans la fenêtre ouverte ; à la fermeture, le focus revient sur le bouton qui l'avait ouverte."],
  ] },
  { v: "248", t: "Fond flouté et cascades au même rythme", items: [
    ["Fond des fenêtres", "Toutes les fenêtres qui bloquent la page floutent légèrement l'arrière-plan ; jamais les menus."],
    ["Apparitions", "Les cadrans de l'accueil et les lignes des tableaux apparaissent au même rythme partout (40 ms d'écart, 200 ms au plus)."],
  ] },
  { v: "249", t: "Fenêtres vérifiées une par une", items: [
    ["Volet « Déclarer un retard »", "Il s'ouvre de nouveau en pleine hauteur, depuis la droite, avec un fond qui s'efface en douceur."],
    ["Fiche de tests", "Elle s'ouvre en haut, en-tête visible."],
    ["États des machines", "La fenêtre s'ouvre sur son titre au lieu de défiler jusqu'au champ du bas."],
    ["Fonds des fenêtres", "États, feux, saisie multiple, composants, rapport CODIR, Cash in, SAV, écran atelier : le fond se fond et se floute, seule la fenêtre monte."],
  ] },
  { v: "250", t: "Critique design : un sens par pastille, cadrans entiers", items: [
    ["Pastille « +N j »", "La pastille rouge est réservée à l'écart avec le planning initial ; le décalage dû à la dernière mise à jour s'affiche « ↻ +N j » sur fond gris (expliqué dans la légende du Calendrier)."],
    ["Cadrans entiers", "Sur l'accueil et la page Tests, un cadran n'est plus coupé avec une barre de défilement : il prend la hauteur de son contenu."],
    ["Chiffres de l'accueil", "Même règle que les KPI : vert pour les machines livrées, rouge pour les PJ en retard, encre sinon."],
  ] },
  { v: "251", t: "Gantt épuré (maquette Claude Design)", items: [
    ["Départ initial", "Un losange gris marque le départ prévu au planning initial ; un pointillé de la couleur de l'écart le relie au départ actuel."],
    ["En-tête", "Deux lignes seulement : le mois, puis la semaine et la date de son lundi."],
  ] },
  { v: "252", t: "Cash in pour les admins, commentaires, première connexion", items: [
    ["Cash in pour les admins", "Les admins ouvrent le Cash in (page, pastille de la fiche, blocs de l'accueil).", "admin"],
    ["Prévu jusqu'à fin 2026", "Dans « À traiter » du Cash in : toutes les factures à émettre et les encaissements attendus d'ici le 31 décembre, mois par mois, avec les totaux.", "admin"],
    ["Supprimer un commentaire", "Les admins suppriment un commentaire avec une simple confirmation, sans code.", "admin"],
    ["Vidéo de présentation", "Ouverte d'elle-même à la connexion, elle se ferme bien avec « Fermer »."],
    ["Première connexion", "Plus de bandeau « connexion aux données interrompue » : les données se chargent après la connexion Google."],
  ] },
  { v: "253", t: "Calendrier affiné (maquette Claude Design)", items: [
    ["Production en bande", "La production est une bande continue sur les semaines ou les jours, avec sa date de fin au début."],
    ["Jalons en pastilles", "Arrivée, tests, fin de production et départ sont des pastilles ; client et NOBO aux tests, deux ronds « C » et « N »."],
  ] },
  { v: "254", t: "Couloirs éditables, chefs ORC, cloche des projets modifiés", items: [
    ["Couloirs du planificateur", "Un clic sur une tâche ouvre une fenêtre : début, fin, durée en jours ouvrés et charge en heures, ou libérer la date imposée.", "admin"],
    ["Fiches projet", "Les chefs de projet affichés et les regroupements « Par chef » sont les chefs ORC ; pour un projet EPC, le chef EPC est indiqué en mention.", "admin"],
    ["Cloche", "Un chef de projet est prévenu quand une publication du planning modifie un de ses projets (nouveau, départ repoussé ou avancé, dates modifiées)."],
  ] },
  { v: "255", t: "Livraison prévue calculée, demandes en tête des commentaires, journal des modifications", items: [
    ["Livraison prévue", "Avec une durée de transport dans la fiche, la livraison prévue = fin projetée + transport, recalculée à chaque publication ; mention « date de livraison, transport compris ».", "admin"],
    ["Commentaires", "En tête de page, les demandes qui attendent une réponse (personnes citées avec @ qui n'ont pas marqué « traité »), avec Répondre et Marquer traité ; Kanban et Fil en dessous."],
    ["Modifications", "Le journal des publications à gauche, le détail à droite avec une phrase qui résume (départs, plus grands écarts, ajouts et retraits)."],
  ] },
  { v: "256", t: "Cash in au format artefact", items: [
    ["Cash in", "Le Cash in s'ouvre au format de l'artefact d'origine (mêmes données) ; « Prévu jusqu'à fin 2026 » y est aussi ; « Cash in du site » reste à un clic.", "admin"],
  ] },
  { v: "257", t: "Turbines par PJ, Cash in unique", items: [
    ["Turbines par PJ", "Une feuille dans l'onglet Turbines : pour chaque PJ, le type de turbine, la quantité, la ou les roues et le ou les injecteurs prévus.", "admin"],
    ["Cash in", "Un seul Cash in (le format d'origine) ; « Prévu jusqu'à fin 2026 » est dans le cadran « À traiter », à côté de « Mois prochain ».", "admin"],
  ] },
  { v: "258", t: "Planificateur : publication, annonces, dates imposées", items: [
    ["Publication", "Les jours sans production de chaque PJ sont pris en compte à la publication : les dates publiées sont celles affichées.", "admin"],
    ["Annonces", "À la publication, on coche les changements annoncés aux utilisateurs ; les heures ne le sont pas par défaut.", "admin"],
    ["Modèles par gamme", "Ils ne s'appliquent qu'aux PJ dont la production n'a pas commencé.", "admin"],
    ["Début d'une tâche", "On voit ce qui fixe le début (lien, date imposée, ordre de passage) et on choisit le début en gardant les liens du PJ.", "admin"],
  ] },
  { v: "259", t: "Bancs en frise, nivellement réglable, clic droit pour se déplacer", items: [
    ["Bancs d'essai", "Frise des 2 bancs l'un au-dessus de l'autre ; on glisse une machine sur l'autre banc pour l'y affecter.", "admin"],
    ["Nivellement", "On choisit la période et la capacité avant de niveler la charge atelier.", "admin"],
    ["Se déplacer", "Clic droit maintenu et glisser : fait défiler la zone sous la souris, partout sur le site."],
    ["Machines livrées", "Comptées depuis mai (et non depuis le 1er janvier)."],
    ["Répartitions", "Les camemberts indiquent toutes les valeurs, sans regroupement « Autres »."],
  ] },
  { v: "260", t: "Bancs dans le temps, retards contractuels, Cash in lié au planning, agenda des testeurs", items: [
    ["Bancs d'essai", "Sur la frise, on glisse une machine à gauche ou à droite pour changer la date de ses tests (liens gardés).", "admin"],
    ["Retards contractuels", "L'aperçu de publication signale les PJ qui dépassent leur date contractuelle, avec les pénalités estimées.", "admin"],
    ["Cash in lié au planning", "Un jalon peut suivre le départ ou les tests ; quand le planning bouge, le Cash in propose de mettre la date de facturation à jour.", "admin"],
    ["Agenda des testeurs", "Les périodes de banc de chaque testeur se téléchargent en fichier .ics pour Outlook ou Google Agenda."],
  ] },
  { v: "261", t: "Réorganisation du code", items: [
    ["Sous le capot", "Le code principal du site est réorganisé (lectures des données, filtres de la Liste) ; rien ne change à l'écran.", "admin"],
  ] },
  { v: "262", t: "Page Achats / Appro", items: [
    ["Achats / Appro", "Nouvelle page (menu Gestion) pour suivre l'appro des composants des ORC, PJ par PJ : commandes, livraisons prévues, retards sur la date de besoin.", "admin"],
  ] },
  { v: "263", t: "Glisser-déposer plus fluide", items: [
    ["Glisser-déposer", "Dans Tests › Par testeur, le tableau des turbines et le planificateur, l'élément suit la souris, la cible s'allume, et il revient à sa place si on lâche ailleurs (Échap annule)."],
    ["Planificateur", "Dans les Couloirs, la barre suit la souris en continu puis se pose sur son jour ; dans les Bancs d'essai, elle glisse jusqu'à sa nouvelle place.", "admin"],
    ["Menus", "Les menus s'ouvrent depuis le bouton cliqué."],
  ] },
  { v: "264", t: "Checklist de debug", items: [
    ["Checklist de debug", "Dans la fiche de tests de chaque machine : la checklist de debug à cocher ligne par ligne (OK / NOK), à signer, et à exporter en Word au format de la procédure."],
  ] },
  { v: "265", t: "Fiche d'un PJ à onglets, dates des fiches projet, liaisons Cash in", items: [
    ["Fiche d'un PJ", "Nouvelle fiche : étape et départ en une ligne, barre de parcours, onglets Résumé, Tests et Commentaires ; dates clés, livraison prévue et état des tests et de la checklist en un coup d'œil."],
    ["Dates des fiches projet", "Un tableau sépare le contrat, le planning initial (figé) et la prévision actuelle (mise à jour à chaque publication) pour la fin projetée (MàD ORC) et la livraison sur site client.", "admin"],
    ["Liaisons Cash in", "Jalon par jalon : « réparti » (divisé entre les machines) ou « machines cochées » (montant entier sur une machine ou paiement unique du contrat), avec des exemples.", "admin"],
  ] },
  { v: "266", t: "Production turbines : gammes 100 kW et 20 kW, roues, reconditionnement", items: [
    ["Production turbines", "Retour de Jérémie : une gamme 100 kW et une gamme 20 kW séparées, lots de roues à équilibrer, turbines reconditionnées avec contrôles OK / NOK, consommation des pièces par étape.", "admin"],
  ] },
];
