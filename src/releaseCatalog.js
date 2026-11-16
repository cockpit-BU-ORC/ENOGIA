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
  { v: "267", t: "Un seul onglet Turbines", items: [
    ["Turbines", "Un seul onglet : la production turbines (seul endroit où l'on saisit turbines, roues et injecteurs) et les besoins des ORC, calculés à partir d'elle.", "admin"],
    ["Turbines › Besoins des ORC", "Pour chaque PJ en cours : turbines nécessaires d'après la gamme, turbines attribuées (champ « Affaire »), date de fin prévue et ce qui coince ; stocks de roues et d'injecteurs.", "admin"],
  ] },
  { v: "268", t: "Import des données de production ouvert à l'équipe turbines", items: [
    ["Turbines › Production", "Le bouton « Importer des données (JSON) » est disponible pour toutes les personnes qui ont accès à la production turbines.", "admin"],
  ] },
  { v: "269", t: "Sous-étapes au clic, dates contractuelles calculées", items: [
    ["Fiche d'un PJ", "Un clic sur une étape du parcours (Montage méca…) affiche de nouveau ses sous-étapes."],
    ["Fiches projet · contrat", "Échéance du contrat = T0 + une durée en semaines ; case « Livraison sur site client (avec transport) » et nombre de jours : la MàD ORC contractuelle se calcule toute seule.", "admin"],
    ["Fiches projet · dates", "MàD ORC et livraison sur site : date contractuelle, prévisionnelle (mise à jour à chaque publication) et effectuée, avec l'écart au contrat.", "admin"],
  ] },
  { v: "270", t: "Turbines : besoins PJ et SAV, turbines glissées, roue et injecteur", items: [
    ["Turbines › Besoins ORC et SAV", "Les PJ en cours et les besoins SAV d'un côté, les turbines disponibles de la production de l'autre : glissez une turbine sur un besoin. Une turbine prête sort du stock de la production (avec un injecteur).", "admin"],
    ["Turbines › Production", "Nouvel encart « Demandes ORC et SAV » : date, turbine, roue et injecteur attendus, turbines déjà attribuées.", "admin"],
    ["Fiches projet", "Turbine (2 × 100 kW, 100 kW, 20 kW, 2 × 40 kW), roue et injecteur, choisis dans les listes de la production turbines.", "admin"],
    ["Fiche d'un PJ", "Les sous-étapes de l'étape en cours sont toujours affichées ; cliquez sur une autre étape pour voir les siennes."],
    ["Notifications", "Un clic sur un commentaire de la cloche ouvre la fiche du PJ sur ses commentaires."],
    ["Tests · checklist de debug", "Les cases cochées sont bien enregistrées."],
  ] },
  { v: "271", t: "Cloche plus visible, « Vu » sur les commentaires, besoins turbines refaits", items: [
    ["Cloche", "« N à traiter » écrit à côté de la cloche ; elle tinte à chaque nouvelle demande et un aperçu de la mention s'affiche quelques secondes."],
    ["Commentaires", "Quand on vous cite : « Vu » montre à l'auteur que vous l'avez pris en compte, « Traité » quand c'est réglé. Les deux sont visibles de tous."],
    ["Turbines › Besoins ORC et SAV", "Chaque turbine attendue est un emplacement turbine + roue + injecteur ; glissez-y les turbines (prêtes avec roue, sans roue, en fabrication), les roues et les injecteurs du stock : le stock de la production se met à jour.", "admin"],
    ["Fiches projet", "Turbine choisie sur des cartes, roue et injecteur en pastilles avec leur stock, nombre de bouchages de l'injecteur.", "admin"],
  ] },
  { v: "272", t: "Checklist de debug en PDF, section Turbine compacte", items: [
    ["Tests · checklist de debug", "« Exporter en PDF » : même mise en page que le modèle (A4 paysage), à enregistrer en PDF depuis la fenêtre d'impression. L'export Word est retiré."],
    ["Fiches projet · Turbine", "Section plus compacte : turbine, roue et injecteur sur trois lignes courtes.", "admin"],
  ] },
  { v: "273", t: "Besoins turbines en plateaux, fiches projet plus lisibles", items: [
    ["Turbines › Besoins ORC et SAV", "Chaque turbine attendue est un plateau turbine · roue · injecteur ; la pièce prévue est écrite dans son logement et s'allume en vert quand on glisse la bonne. « Remplir automatiquement » propose le stock (annulable). Toucher une tuile puis un logement marche aussi.", "admin"],
    ["Fiches projet", "Onglets collés en haut (Pilotage, Planning, Machine, Finance, Suivi), chiffres clés sous l'en-tête, zone Machine (S/N, certification, tests, turbine), « Enregistré » après chaque saisie, feux plus grands.", "admin"],
  ] },
  { v: "274", t: "Bilan mensuel des KPI, roues imposées, fiches sans trous", items: [
    ["KPI › Bilan mensuel", "Ce qui a été fait les deux derniers mois et ce qui est prévu ce mois-ci et le suivant (départs, fins de production, tests, arrivées), avec l'écart à l'initial et une note par mois.", "admin"],
    ["Turbines › Besoins", "Turbines prêtes avec roue et sans roue séparées ; une turbine ou une roue d'une autre référence que celle prévue est refusée avec un message. Couleurs ORC (marine) et SAV (violet), drapeaux.", "admin"],
    ["Fiches projet", "Les blocs se rangent en colonnes sans trous ; textes harmonisés ; livraison sur site : « en transport, non confirmée » avec la date estimée, puis « confirmée ».", "admin"],
  ] },
  { v: "275", t: "Vue CODIR compacte, jalons par mois, fiches mieux remplies", items: [
    ["KPI › Dérives", "Résumé « PJ tenus à date, par étape » (compact, prêt pour une capture), choix des machines (toutes, en cours, expédiées) pour toute la vue CODIR, graphiques des arrivées, tests, fins de production et départs par mois, cadrans resserrés.", "admin"],
    ["KPI › Bilan mensuel", "Graphique des départs, tests terminés et arrivées sur les quatre mois.", "admin"],
    ["Fiches projet", "Planning : contrat à gauche, frise des jalons à droite ; Machine et Finance côte à côte.", "admin"],
  ] },
  { v: "276", t: "Période de la vue CODIR, fiche projet plus compacte", items: [
    ["KPI › Dérives", "Vue CODIR : choix des mois pris en compte (mois promis au planning initial) — Tout, année en cours, 6 derniers mois, mois passés, ou du … au …", "admin"],
    ["Fiches projet", "Statut global en une ligne par axe, indicateurs clés sur une rangée, frises plus basses, jalons de paiement payés repliés.", "admin"],
  ] },
  { v: "277", t: "Fiche projet resserrée", items: [
    ["Fiches projet", "Finance sur toute la largeur en trois colonnes, Machine à côté de Suivi, section Turbine plus basse, composants plus serrés, actions et mitigations : les deux premières ouvertes, le reste derrière « Afficher tout ».", "admin"],
  ] },
  { v: "278", t: "Répartition des machines, alertes KPI, checklist de debug modifiable", items: [
    ["KPI › Synthèse", "Camemberts de répartition des machines (état, gamme, pays, chef de projet ; en cours, expédiées ou toutes), bloc « À surveiller », méthode de calcul de chaque chiffre au survol du « i ».", "admin"],
    ["Tests · checklist de debug", "« Modifier la liste » : retirer une ligne ou en ajouter une, pour cette machine seulement, ou pour toutes (modèle commun, administrateurs). Les lignes retirées se rétablissent."],
  ] },
  { v: "279", t: "Objectifs chiffrés sur tous les KPI", items: [
    ["KPI", "Chaque sous-onglet dit la question à laquelle il répond, sa période et sa méthode, et met ses chiffres face à des objectifs (PJ tenus à date, dérive moyenne, charge, jalons du mois tenus, machines expédiées) : vert si tenu, rouge avec l'écart sinon. Bouton « Objectifs » pour les régler.", "admin"],
  ] },
  { v: "280", t: "Page Checklists, période des objectifs, vue CODIR corrigée", items: [
    ["Tests › Checklists", "Modèle de la checklist de debug : importer un Word au format du modèle ou un tableau collé depuis Excel, ajouter, modifier, déplacer ou supprimer des sections et des contrôles. Il ne se modifie plus depuis un PJ.", "admin"],
    ["KPI", "Objectifs calculés sur la période choisie : mois dernier, mois en cours, 3 derniers mois, année, ou du … au ….", "admin"],
    ["KPI › Dérives", "Vue CODIR : « Mois dernier » ne prend plus que les jalons promis le mois dernier (l'ancien « Mois passés » prenait tous les mois précédents).", "admin"],
  ] },
  { v: "281", t: "Refonte des KPI : réponse, preuve, action", items: [
    ["KPI", "Chaque sous-onglet commence par la réponse en une phrase, calculée sur le planning publié, puis les chiffres face aux objectifs (barre, trait d'objectif, écart) et un graphique choisi pour la question, enfin « À faire » avec les PJ concernés. « Voir en tableau » sur chaque graphique ; l'ancien contenu reste dessous en « Détail ».", "admin"],
    ["KPI › Explorer", "Une mesure (machines, départs, arrivées, tests terminés, fins de production) par mois, gamme, pays, chef de projet ou état, en barres triées.", "admin"],
  ] },
  { v: "282", t: "Confort : cibles plus grandes, textes plus lisibles, une seule capacité atelier", items: [
    ["Partout", "Les petits boutons ont une zone de clic d'au moins 28 × 28 px (sans changer leur dessin) ; les textes de 11 px passent à 12 px, ceux de 12,5 px à 13 px ; les initiales des avatars ne descendent plus sous 9 px.", "all"],
    ["Accueil et KPI", "Une seule capacité atelier : celle du planificateur (175 h par semaine s'il n'y a pas de plan). L'accueil compte aussi les jours sans production, comme les KPI.", "admin"],
  ] },
  { v: "283", t: "Pages plus lisibles : Liste, Planificateur, Gantt, Retards, Personnes", items: [
    ["Liste", "La vue d'ensemble tient en une ligne de chiffres ; « Répartitions » déplie les quatre graphiques. Le tableau commence plus haut.", "all"],
    ["Gantt", "La légende est en haut, toujours visible ; chaque machine tient sur deux lignes (le n° de série s'affiche au survol), on en voit davantage.", "all"],
    ["Planificateur", "Une seule barre d'outils avec les menus « Affichage », « Outils » et « ＋ Ajouter » ; la charge atelier est repliée en une ligne (« Déplier » pour le graphique).", "owner"],
    ["Retards", "Une cause sans retard devient une bande étroite avec « + » : toutes les autres tiennent à l'écran.", "admin"],
    ["Personnes et site", "Une ligne par personne, filtres par rôle ; les accès Manager ont leur propre onglet « Accès ».", "owner"],
  ] },
  { v: "284", t: "Cash in et accueil plus faciles à lire", items: [
    ["Cash in", "Bouton « Haut de page » en bas à droite dès qu'on a défilé d'un écran ; cases à cocher plus grandes.", "admin"],
    ["Accueil", "Chiffres clés plus lisibles ; le cadran Tests tient en une ligne de chiffres (au banc, sans testeur, échecs, en retard, conflits).", "all"],
  ] },
  { v: "285", t: "Cloche plus juste, mode sombre automatique, lecture améliorée", items: [
    ["Cloche", "Le rouge et « à traiter » ne comptent plus que ce qui vous attend (cité, affecté aux tests). Les projets modifiés par le planning s'affichent en gris, comme des mises à jour.", "all"],
    ["Apparence", "Nouveau choix « Auto » : le Cockpit passe en clair ou en sombre comme votre ordinateur (réglage par défaut).", "all"],
    ["Accueil et Liste", "« Expédiées depuis mai » au lieu de « livrées » (livrée = arrivée chez le client) ; les chiffres s'affichent directement, sans compter depuis zéro.", "all"],
    ["Partout", "Police des boutons harmonisée, liens et initiales plus contrastés, texte complet au survol des noms coupés ; au téléphone, la ligne de chiffres de la Liste ne chevauche plus le bouton.", "all"],
  ] },
  { v: "286", t: "Un seul système de design : formes, boutons, polices, bulles", items: [
    ["Partout", "Les infos au survol s'affichent dans une bulle maison : plus rapide à la souris, et maintenant aussi au clavier (Tab) et d'un appui au doigt.", "all"],
    ["Partout", "Trois arrondis seulement (petit, contrôle, cadre), une seule couleur pour l'action principale, et des étiquettes dans la même police que le texte.", "all"],
    ["Planificateur", "Sur un écran plus étroit, la barre d'outils passe sur deux lignes au lieu de cacher ses menus.", "owner"],
  ] },
  { v: "287", t: "Fenêtres du Planificateur au clavier", items: [
    ["Planificateur", "Les fenêtres Publier, Modèles par gamme, Historique, Plan vierge, Nouveau PJ, Nouvelle tâche et Niveler se ferment avec Échap, reçoivent le focus clavier et s'ouvrent comme les autres fenêtres du site.", "owner"],
  ] },
  { v: "288", t: "Actions plus sûres : confirmations claires, brouillon, annulation", items: [
    ["Partout", "Les confirmations s'ouvrent dans une fenêtre du site : la question, sa conséquence, et un bouton qui nomme l'action (« Retirer les pénalités », « Supprimer l'étape »…) ; pour une suppression, Entrée ne valide pas par mégarde.", "all"],
    ["Fiches projet", "« ＋ Définir les pénalités » ouvre un brouillon : rien n'est enregistré ni compté avant « Enregistrer les pénalités ».", "admin"],
    ["Fiches projet", "Après chaque enregistrement, « Annuler » reste proposé 5 secondes à côté de « ✓ Enregistré ».", "admin"],
  ] },
  { v: "289", t: "Démarrage plus rapide", items: [
    ["Partout", "Le site se charge presque deux fois plus vite à la connexion : le Planificateur, l'espace Manager, Tests, Turbines, Achats, le Cash in et les autres grandes pages ne se chargent qu'à leur première ouverture.", "all"],
    ["Tests", "Le planning des bancs s'affiche sans animer chaque barre de machine en même temps.", "all"],
  ] },
  { v: "290", t: "Rapport CODIR : la réponse et les décisions d'abord", items: [
    ["Rapport CODIR", "La synthèse commence par la réponse en une phrase, puis « À décider aujourd'hui » (3 sujets au plus, reformulables avant l'export), 4 chiffres et le tableau. Chaque page PJ dit en une phrase où en est la machine, puis où en est-on · ce qui coince · ce qu'on fait, et le contrat sur une ligne.", "admin"],
    ["Rapport CODIR", "Texte plus lisible : 5 tailles, casse normale, couleurs de texte foncées (le gabarit ENOGIA ne change pas).", "admin"],
    ["KPI", "Dérives et Bilan mensuel : le détail est replié derrière un bouton ; les écarts en vert sont plus lisibles.", "admin"],
  ] },
  { v: "291", t: "Boutons et textes harmonisés", items: [
    ["Fiches projet, Tests, Retards", "Mêmes boutons partout : une seule action principale pleine (encre), les autres bordées, mêmes hauteurs et mêmes arrondis.", "admin"],
    ["Partout", "Les fiches et le Manager utilisent la même échelle de texte (12 · 13 · 14 · 16 px).", "all"],
  ] },
  { v: "292", t: "Jours sans production : même date de fin, charge répartie", items: [
    ["Planificateur", "Un jour sans production (Calendrier) ne repousse plus la fin de la production du PJ : ses heures se répartissent sur ses autres jours de production.", "owner"],
    ["Planificateur", "Bandeau : les modifications du brouillon (dont celles du calendrier de production) n'apparaissent dans le Gantt, le Calendrier et la Liste qu'après « Publier ».", "owner"],
    ["Calendrier", "Le menu « Production du … » rappelle l'effet sur le planning et le moment où le Gantt change.", "admin"],
    ["Planificateur", "Mêmes couleurs d'étape que le Gantt ; une tâche ajoutée prend la couleur de sa phase et son nom reste lisible dans la liste.", "owner"],
    ["Liste", "Les chiffres se comptent à nouveau depuis zéro ; plus de mention « départ passé pas encore Expédiée ».", "all"],
  ] },
  { v: "293", t: "Achats / Appro refait par le responsable achats", items: [
    ["Achats / Appro", "Nouvelle page : fiches machine (projets), nomenclatures, articles, fournisseurs, PO, configuration ; rétro-planning des commandes (besoin − marge − délai fournisseur − transport).", "admin"],
    ["Achats / Appro", "Réglages : connexion Odoo préparée pour importer les PO (la clé API reste sur le serveur, jamais dans la page).", "owner"],
    ["Planificateur", "Un jour sans production au début de la production en recule le début ; la fin ne change pas.", "owner"],
  ] },
  { v: "294", t: "Synchronisation Odoo des PO", items: [
    ["Achats / Appro", "Les commandes d'achat d'Odoo arrivent dans l'onglet PO chaque nuit et sur « Synchroniser maintenant » (après la mise en service du serveur).", "admin"],
  ] },
  { v: "295", t: "Synchronisation Odoo débloquée", items: [
    ["Achats / Appro", "Une demande de synchronisation restée sans réponse plus de 5 minutes ne bloque plus le bouton « Synchroniser maintenant ».", "admin"],
  ] },
  { v: "296", t: "Compte rendu de la synchronisation Odoo", items: [
    ["Achats / Appro", "Le compte rendu dit combien de commandes et de lignes ont été lues dans Odoo, et pourquoi des lignes ont été écartées (pas de fiche machine, pas de n° de projet), avec des exemples.", "admin"],
  ] },
  { v: "297", t: "Réglages des achats ouverts au responsable achats", items: [
    ["Achats / Appro", "Les personnes qui ont accès à la page voient aussi Réglages (marge, connexion Odoo, synchronisation) ; la liste d'accès reste au propriétaire.", "admin"],
  ] },
  { v: "298", t: "Kits Achats et Production turbines réparés", items: [
    ["Kits", "Les kits envoyés au responsable achats et au directeur de production turbines s'ouvrent de nouveau dans Claude ; le kit Achats a des données d'exemple à jour et simule la synchronisation Odoo.", "owner"],
  ] },
  { v: "299", t: "Besoins turbines : onglets ORC / SAV, cartes et frise", items: [
    ["Turbines", "Besoins ORC et SAV en deux onglets, une carte par besoin : roue et injecteur en grand, numéro de série en petit.", "owner"],
    ["Turbines", "Turbine allouée (bleu) ou installée (vert, avec sa date) : bouton « Marquer installée ».", "owner"],
    ["Turbines", "Date de disponibilité de chaque turbine (estimée pour un emplacement vide) et écart avec le besoin, sur une petite frise.", "owner"],
  ] },
  { v: "300", t: "Besoins turbines compacts : une seule feuille, états lisibles", items: [
    ["Turbines", "Production et Besoins ORC et SAV : deux grands boutons avec leurs chiffres (en fabrication, prêtes ; à attribuer, en retard).", "owner"],
    ["Turbines", "ORC et SAV dans la même feuille (filtre Tout · ORC · SAV), cartes compactes : une turbine par ligne, trois colonnes à l'écran.", "owner"],
    ["Turbines", "Chaque roue, injecteur et turbine montre son état : pointillé à attribuer, teinté et coché attribué, vert installé, rouge refusé.", "owner"],
    ["Turbines", "Stock : roues et injecteurs d'abord, puis turbines prêtes avec roue, sans roue, en fabrication. Une turbine sans roue s'alloue, la roue reste à poser.", "owner"],
  ] },
  { v: "301", t: "Besoins turbines : noms complets, ordre de besoin, stock lisible", items: [
    ["Turbines", "Chaque besoin porte son rang (ordre de besoin par date) ; cartes ORC bleu-gris pâle, SAV violet pâle.", "owner"],
    ["Turbines", "Noms complets des roues, injecteurs et turbines (sur deux lignes si besoin), avec le détail : montée, prise dans le stock, bouchages, prête, fin prévue.", "owner"],
    ["Turbines", "« Marquer installée » dès qu'une turbine est allouée ; s'il manque une pièce, le site le demande avant.", "owner"],
    ["Turbines", "Stock : injecteurs regroupés par référence avec leurs variantes ; turbines prêtes affichées par leur roue ; une turbine qui a déjà sa roue ne touche pas au stock de roues.", "owner"],
  ] },
  { v: "302", t: "Besoins turbines : priorité modifiable, par mois, installée verrouillée", items: [
    ["Turbines", "Ordre de priorité modifiable (▲ ▼ dans le mois) ; il sert aussi aux dates estimées et à « Remplir automatiquement ». Cartes regroupées par mois.", "owner"],
    ["Turbines", "Turbine installée : sa roue et son injecteur sont verrouillés, on ne peut plus agir que sur la turbine.", "owner"],
    ["Turbines", "Plus de frise : « Turbine disponible le …, besoin le … » avec la marge ou le retard. Fonds ORC bleu léger, SAV violet léger ; la configuration passe dans le bouton ⋯.", "owner"],
    ["Turbines", "Stock en trois sections séparées : roues équilibrées, injecteurs, turbines libres.", "owner"],
  ] },
  { v: "303", t: "Besoins turbines : titres de mois collants en verre dépoli", items: [
    ["Turbines", "Barre d'outils et titres de mois en verre dépoli, collés en haut pendant que les cartes défilent dessous ; les logements à remplir s'enfoncent légèrement à l'appui. Le stock reste visible à gauche.", "owner"],
  ] },
  { v: "304", t: "Menu par métier : Travailler, Suivre, Régler", items: [
    ["Menu", "Un seul menu en trois rubriques : Travailler (Aujourd'hui, Planning, Tests, Turbines, Achats), Suivre (Projets, Finance, Pilotage, Commentaires), Régler (Calendrier de production, Personnes et site)."],
    ["Planning", "Liste, Gantt, Calendrier, Planificateur et Modifications sont réunis sous « Planning », avec des onglets en haut de la page."],
    ["Menu", "L'Espace Manager n'est plus une entrée à part : ses pages sont dans Projets, Pilotage et Régler.", "admin"],
  ] },
  { v: "305", t: "Accès par rôle et par page", items: [
    ["Accès", "Nouvelle page Régler › Accès : un rôle par personne, et pour chaque rôle un niveau par page (Masqué, Lecture, Modifier, Admin), avec l'aperçu du menu.", "owner"],
    ["Accès", "Les nouveaux accès ne s'appliquent qu'après « Activer » ; d'ici là, chacun garde ses droits d'avant.", "owner"],
    ["Menu", "Chacun ne voit dans le menu que les pages permises par son rôle (une fois les accès activés)."],
  ] },
  { v: "306", t: "Menu masqué, sélecteur de vues, sombre graphite", items: [
    ["Menu", "Le menu se cache comme la barre des tâches Windows : il apparaît quand la souris touche le bord gauche, avec ☰ en haut ou Ctrl + B. « Épingler le menu » le garde ouvert."],
    ["Menu", "Les sous-pages d'une entrée se déplient sous elle (page active, ou au survol)."],
    ["Planning", "Liste, Gantt et Calendrier se choisissent dans un sélecteur à côté du titre (touches 1, 2, 3) ; Planificateur et Modifications sont des boutons à part."],
    ["Thème", "Mode sombre en gris neutres (graphite) au lieu de l'ardoise bleue."],
  ] },
  { v: "307", t: "Le même sélecteur de vues partout", items: [
    ["Navigation", "Tests, Turbines, Projets, KPI, Retards, Calendrier de production et Personnes et site changent de vue avec le même sélecteur que le Planning."],
    ["Menu", "Les vues de Tests et de Turbines sont aussi dans le menu de gauche."],
    ["Projets", "Fiches projet, Point hebdo et Machines ORC réunis sous « Projets »."],
  ] },
  { v: "308", t: "Accès plus simples : Rôles, puis Accès par page", items: [
    ["Accès", "Sous-page Rôles : créer, renommer, supprimer un rôle ; voir ses membres, en ajouter, en retirer.", "owner"],
    ["Accès", "Sous-page Accès par page : un rôle à la fois, un niveau pour chaque page et chaque sous-page, copie depuis un autre rôle, aperçu du menu.", "owner"],
  ] },
  { v: "309", t: "La fiche d'un PJ montre sa turbine et ses achats", items: [
    ["Fiche d'un PJ", "Onglet et tuile Turbine : turbines attribuées, roue, injecteur, installée, date de disponibilité face au besoin."],
    ["Fiche d'un PJ", "Onglet et tuile Achats : lignes par statut, commandes (PO) avec leur livraison et leurs retards."],
  ] },
  { v: "310", t: "Calendrier : vue Mois ; la fiche d'un PJ ouvre ses tests", items: [
    ["Calendrier", "Vue Mois : le mois sur une page, jalons en plaques pleines, production et tests chaque jour en plaques claires, « + N autres » pour déplier un jour."],
    ["Fiche d'un PJ", "Clic sur la tuile Tests : la page Tests s'ouvre sur la fiche de tests du PJ (si vous avez accès à Tests)."],
  ] },
  { v: "311", t: "Briques communes : survols, pastilles, puces", items: [
    ["Site", "Survols du menu, de la Liste, du Gantt, du Calendrier et des Commentaires en CSS : plus fluides, et rien ne reste allumé sous le doigt sur tablette."],
    ["Site", "Pastilles et puces de choix dessinées une seule fois et réutilisées (fiche d'un PJ, accueil, fiches projet, séries, personnes)."],
  ] },
  { v: "312", t: "Calendrier en barres continues, début de production, départ modifiable", items: [
    ["Calendrier", "Vues Jour et Semaine : une barre par machine (réception, production, tests, packaging) avec les dates écrites ; visites client / NOBO en étiquettes ; planning initial derrière un bouton."],
    ["Liste", "Nouvelle colonne « Début prod » (date du planificateur, après publication) ; aussi dans la fiche d'un PJ, le Gantt et le Calendrier."],
    ["Planning", "Les admins changent la date de départ dans la Liste (crayon) ou dans la fiche d'un PJ ; elle est reprise dans le planificateur."],
  ] },
  { v: "313", t: "Tableaux et filtres communs", items: [
    ["Site", "En-têtes de tableau, lignes et filtres dessinés une seule fois : KPI, fiches projet, point hebdo, modifications, tests, Cash in prévu."],
  ] },
  { v: "314", t: "Tablette et écran tactile ; menu Opérations, Gestion, Administration", items: [
    ["Site", "Densité « Auto » : confortable sur tablette et écran tactile (boutons et lignes de 44 px), compacte à la souris."],
    ["Site", "Au doigt : un toucher sur une entrée du menu déplie ses sous-pages, un toucher sur une bulle d'info l'ouvre."],
    ["Menu", "Rubriques renommées : Opérations, Gestion, Administration."],
    ["Liste", "La colonne « Début prod » est entre Arrivée et Tests."],
  ] },
  { v: "315", t: "Page « À traiter » et S/N automatiques", items: [
    ["À traiter", "Nouvelle page « À traiter » (menu Opérations) : demandes à valider, mentions, affectations aux tests, puis informations. La cloche y mène et ne compte que ce qui attend une action."],
    ["Machines ORC", "S/N prévus d'après l'ordo (année d'arrivée · n° dans l'année · gamme, ex. 2026-034-180), affichés en italique ; « Attribuer les S/N » les fixe à l'arrivée des machines.", "admin"],
  ] },
  { v: "316", t: "Commentaires dans Opérations", items: [
    ["Menu", "Commentaires passe dans la rubrique Opérations."],
  ] },
  { v: "317", t: "Commentaires plus simples et réactions", items: [
    ["Commentaires", "Une liste des machines et le fil du PJ choisi ; filtres À répondre, Mes PJ et Tous (direction et admins). Un chef de projet voit ses PJ et les fils où on le cite."],
    ["Réactions", "Réagissez à un commentaire d'un emoji (👍 ✅ 👀 🙏 🎉 ❗), sur la page Commentaires et dans la fiche d'un PJ."],
    ["Envoyer à…", "Un même message peut partir sur plusieurs PJ depuis le fil (remplace la sélection multiple et le Kanban)."],
  ] },
  { v: "318", t: "Production turbines : mise à jour de Jérémie", items: [
    ["Turbines", "Production : charge de l'équipe (personnes × heures), lancements lissés sur cette capacité, banc d'essai commun aux deux gammes avec ordre de passage, attentes de table et de banc dans les dates prévisionnelles, retards par étape, cadrans de l'accueil réordonnables, export et import des données."],
  ] },
  { v: "319", t: "Réactions à la place de Vu / Traité, version anglaise", items: [
    ["Commentaires", "Plus de boutons « Vu » et « Traité » : quand on vous cite, réagissez d'un emoji ; la demande se ferme et l'auteur voit votre réaction."],
    ["Langue", "Drapeaux FR / EN en haut à droite : le site passe en anglais (menu, Commentaires, À traiter, états des machines ; les autres pages suivent)."],
  ] },
  { v: "320", t: "Stock des turbines, priorités, S/N en un clic", items: [
    ["Turbines", "Besoins ORC et SAV : stock dans l'ordre turbines prêtes avec roue, sans roue, roues, injecteurs, en fabrication ; chaque section se replie. Le n° de priorité se clique pour l'échanger avec un autre besoin, même d'un autre mois."],
    ["Machines ORC", "« ✓ Oui » à côté d'un S/N proposé pour le garder, aussi dans la page À traiter.", "admin"],
    ["Administration", "« Personnes et accès » réunit Personnes, Rôles et Accès par page ; les Nouveautés et la version passent dans « Réglages du site ».", "admin"],
  ] },
  { v: "321", t: "Vérification automatique des pages", items: [
    ["Qualité", "Chaque page principale est désormais vérifiée automatiquement, en clair et en sombre, avant chaque mise à jour du site.", "admin"],
  ] },
  { v: "322", t: "Anglais : planning, fiches, accueil, tests, turbines", items: [
    ["English", "En anglais, la Liste, le Gantt, le Calendrier, la fiche d'un PJ, Modifications, l'accueil, les Tests, les Turbines (besoins) et les pages d'administration sont traduits."],
  ] },
  { v: "323", t: "Jalons cash liés aux livrables du Produit", items: [
    ["Cash in", "Nouvelle case « Produit » sur chaque jalon : cochez-la quand le jalon dépend d'un livrable du Produit (ex. P&ID).", "admin"],
    ["Accueil", "Le responsable produit voit ces jalons sur son accueil : PJ, projet, jalon, montant, facture initiale et prévue."],
  ] },
  { v: "324", t: "Cloche en pop-up, site plus rapide", items: [
    ["Cloche", "Un clic sur la cloche ouvre ce qui est à traiter (demandes, mentions, affectations, informations) dans un pop-up ; plus de page « À traiter » ni de message à côté de la cloche."],
    ["Rapidité", "Le site s'ouvre plus vite : moins de choses à charger au démarrage."],
  ] },
  { v: "325", t: "Gestion des accès et Réglages", items: [
    ["Administration", "« Gestion des accès » (Personnes, Rôles, Accès par page) avec le même titre et le même sélecteur sur les trois sous-pages ; « Réglages » pour les Nouveautés et la version.", "admin"],
  ] },
  { v: "326", t: "SAV / MES dans le Cockpit", items: [
    ["SAV / MES", "Nouvelle page dans Opérations : tickets (chaque type de demande suit ses étapes), interventions (équipe, dates, préparation, clôture, coûts), planning des équipes et parc (machines, contrats de maintenance)."],
    ["Chefs de projet", "Le planning du SAV en une ligne : cliquez un jour libre pour demander une intervention ; le responsable SAV accepte ou refuse, la réponse arrive dans votre cloche."],
    ["Fiche d'un PJ", "Onglet SAV : tickets, interventions et contrat du PJ, « Demander une intervention »."],
  ] },
  { v: "327", t: "SAV : planning à la semaine ou au mois, fiches plus courtes", items: [
    ["SAV / MES", "Planning des équipes à la semaine ou au mois ; glisser une barre sur un autre jour ou une autre ligne change ses dates ou son technicien."],
    ["SAV / MES", "Ticket et intervention plus courts : la préparation, la clôture, les pièces et les coûts se déplient après la création."],
  ] },
  { v: "328", t: "SAV : deux plannings, étapes du ticket", items: [
    ["SAV / MES", "Deux plannings : « Techniciens » (équipe SAV, barres à glisser) et « Demandes d'intervention » (jours libres, demandes des chefs de projet) ; mois et semaines (S46) en tête de chaque planning."],
    ["SAV / MES", "Ticket : toutes les étapes visibles, l'étape en cours surlignée ; cliquer une étape y place le ticket, « Passer à … » nomme l'étape suivante."],
  ] },
  { v: "329", t: "Achats / Appro : mise à jour d'Alexis", items: [
    ["Achats / Appro", "Synthèse Appro par scope (à commander, à livrer, livrées), avance ou retard de livraison à côté du statut, choix d'une ligne de PO filtré (projet, article, fournisseur), fournisseur des PO repris d'Odoo, options « choisir 1 » à préciser dans les fiches machine."],
  ] },
  { v: "330", t: "SAV : demandes, carte du parc, historique", items: [
    ["SAV / MES", "Planning des demandes : une ligne « Équipe SAV / MES » avec les jours déjà réservés (PJ), un « + » sur chaque jour pour demander une intervention ; la demande apparaît rayée jusqu'à la réponse du responsable SAV, qui la reçoit dans la cloche."],
    ["SAV / MES", "Parc : carte du monde des sites (coordonnées GPS facultatives, sinon centre du pays)."],
    ["SAV / MES", "Reprise de l'historique du fichier SAV (tickets, interventions, parc, contrats) en une fois.", "admin"],
  ] },
  { v: "331", t: "Textes plus légers et plus nets", items: [
    ["Affichage", "Textes en gras allégés partout (titres et étiquettes) ; plus d'étiquettes en majuscules espacées."],
    ["Accueil", "Charge atelier : une phrase quand aucune heure n'est prévue, au lieu de colonnes vides."],
  ] },
  { v: "332", t: "SAV : planning unique, KPI, carte et fournitures", items: [
    ["SAV / MES", "Tableaux triables : un clic sur le nom d'une colonne trie dans un sens, un second clic dans l'autre."],
    ["SAV / MES", "Un commentaire possible à chaque étape d'un ticket."],
    ["SAV / MES", "Un seul planning, qui défile comme le Calendrier (‹ ›, zoom, Aujourd'hui) ; les chefs de projet le voient grisé, jours occupés rayés, sans nom de PJ."],
    ["SAV / MES", "Carte du parc : régions, zoom et déplacement ; le site se place avec la ville et le pays."],
    ["SAV / MES", "Parc : fournitures ENOGIA par projet (ORC, drycooler, conteneur…), à ajouter ou supprimer."],
    ["SAV / MES", "Nouvelle sous-page KPI : affectation de l'équipe, interventions, tickets et coûts."],
  ] },
  { v: "333", t: "Tablette : boutons au doigt et pages resserrées", items: [
    ["Tablette", "Boutons des barres d'outils à 44 px et zones de toucher élargies sur les petites cibles."],
    ["Tablette", "Glisser au doigt dans Tests et le Planificateur."],
    ["Tablette", "Liste : état en pastille compacte ; Turbines › Besoins : stock dans un tiroir en bas de l'écran ; planning des bancs plus large en portrait."],
  ] },
  { v: "334", t: "Turbines : clore un besoin", items: [
    ["Turbines", "Besoins ORC et SAV : « Clore » retire un PJ dont les turbines sont installées ; « Besoins clos » pour le rouvrir."],
  ] },
  { v: "335", t: "Menu plus stable, planning SAV et carte", items: [
    ["Menu", "Les sous-pages ne s'ouvrent plus au survol : un clic sur la petite flèche les déplie ; le menu reste ouvert plus longtemps."],
    ["SAV / MES", "Ticket : un PJ pas encore dans l'ordo peut être saisi."],
    ["SAV / MES", "Planning : samedi et dimanche visibles (sans demande possible), demandes en une seule barre, interventions à planifier en pointillés."],
    ["SAV / MES", "Carte : bulles par pays, liste des sites à côté, fiche au survol."],
  ] },
  { v: "336", t: "Carte routière du parc, tests sur 4 semaines", items: [
    ["SAV / MES", "Carte du parc : vraie carte routière, toujours claire, quel que soit le mode clair ou sombre."],
    ["SAV / MES", "Planning : le nom du PJ d'une demande n'est plus barré."],
    ["Tests", "Le planning des bancs couvre les 4 prochaines semaines."],
  ] },
  { v: "337", t: "Fiche de tests refaite, livret de configuration", items: [
    ["Tests", "La fiche de tests d'une machine se suit étape par étape : qui teste, présence, configuration ORC, checklist de debug, checklist de tests, signature."],
    ["Tests", "Livret de configuration (manuel découpé en chapitres et étapes) : validation, statut OK ou Problème, commentaire, filtres, synthèse des problèmes, exports CSV, JSON et PDF, reprise d'une session."],
    ["Tests", "Checklist de tests au même format que la checklist de debug ; les chefs de projet y ajoutent les demandes spécifiques du client."],
    ["Tests", "Fréquences turbines et vibrations dans la checklist de debug ; signature au doigt ; créneaux des bancs mieux séparés."],
    ["Tests", "Import du manuel Word et réglage des fréquences dans Tests › Checklists.", "admin"],
  ] },
  { v: "338", t: "Bancs séparés, planning des tests qui défile", items: [
    ["Tests", "Planning des bancs : machines regroupées par banc (Banc 1, Banc 2) et défilement sur plusieurs mois, comme les autres calendriers."],
    ["Tests", "Fréquences turbines et vibrations dans la checklist de debug et son PDF."],
    ["SAV / MES", "Carte du parc : noms en français, elle ne passe plus par-dessus le menu."],
    ["Général", "Les pages Turbines, Tests et SAV s'ouvrent plus vite (préchargées en arrière-plan)."],
  ] },
  { v: "339", t: "Écran atelier réparé, objectifs, demandes client dans la fiche projet", items: [
    ["Écran atelier", "L'écran atelier ne se referme plus tout seul ; nouvelle page « Objectifs de la semaine et du mois »."],
    ["Projets", "Fiche projet : demandes spécifiques du client pour le FAT interne ; cochées, elles s'ajoutent à la checklist de tests."],
    ["Réglages", "Les fermetures de l'atelier passent dans Réglages ; l'entrée Calendrier de production est retirée (jours sans production : depuis le Calendrier)."],
    ["Général", "Titres des pages du Manager et de la gestion des accès au même format que les autres pages."],
  ] },
  { v: "340", t: "Clavier, suppressions confirmées, brouillons protégés", items: [
    ["Projets", "Fiche projet : supprimer une action, un plan de mitigation, un composant ou un jalon demande confirmation."],
    ["Général", "Les lignes et cases cliquables s'ouvrent aussi au clavier (Tab, puis Entrée) ; focus visible dans les menus."],
    ["Général", "Le navigateur prévient avant de fermer la page si des accès, une checklist ou des pénalités ne sont pas enregistrés."],
  ] },
  { v: "341", t: "Tablette plus confortable", items: [
    ["Général", "Au doigt : le clavier ne s'ouvre plus tout seul à l'ouverture d'une fenêtre, plus de délai ni de flash gris au toucher."],
    ["Général", "Faire défiler une fenêtre ne fait plus défiler la page derrière ; titres sans mot isolé en fin de ligne."],
  ] },
  { v: "342", t: "La page affichée est dans l'adresse", items: [
    ["Général", "Le bouton Précédent du navigateur revient à la page d'avant ; un lien copié ouvre la même page, la même sous-page et la même fiche de PJ."],
  ] },
  { v: "343", t: "Lisibilité : sombre, gras, chiffres clés", items: [
    ["Calendrier", "Étiquettes Client et NOBO lisibles en mode sombre."],
    ["Général", "Textes en gras ramenés à la graisse du site ; chiffres clés de l'accueil et de la Liste moins grands, le retard sur l'initial mis en avant."],
  ] },
  { v: "344", t: "Finitions : arrondis, gras, couleurs du thème", items: [
    ["Général", "Arrondis, gras et couleurs harmonisés sur tout le site (mêmes règles partout, en clair comme en sombre)."],
    ["Planificateur", "Textes du planificateur plus lisibles : plus de petits caractères ni de majuscules."],
  ] },
  { v: "345", t: "Moins d'effets de verre et de flou", items: [
    ["Général", "Fenêtres sans flou derrière ; barres collées de Turbines › Besoins et onglets de la fiche projet en surface pleine."],
    ["Tests", "Au banc maintenant : avancement en barre au lieu de l'anneau (aussi sur les cartes des besoins turbines)."],
  ] },
  { v: "346", t: "KPI lisibles en sombre, rapports harmonisés", items: [
    ["Pilotage", "KPI : les encadrés « réponse » restaient blancs en mode sombre ; corrigé (et dans Gestion des accès, Checklists, SAV)."],
    ["Projets", "Fiche projet : bouton « Définir les pénalités » et pourcentages de la liste lisibles en sombre ; titres de zones pour les lecteurs d'écran."],
    ["Général", "Rapports CODIR, PV et rapport chef de projet : graisses harmonisées, plus de lignes zébrées."],
  ] },
  { v: "347", t: "Fiche projet : la vue « Cette semaine »", items: [
    ["Projets", "La fiche projet s'ouvre sur « Cette semaine » : statut, commentaire général, actions, mitigations, retards et commentaires sur un seul écran."],
    ["Projets", "Contrat et dates, Finance et Machine dans leurs onglets ; « À compléter » mène au bon onglet."],
    ["Projets", "Actions et mitigations : Entrée pour ajouter ; le commentaire d'un axe n'est demandé qu'en vigilance ou à risque."],
  ] },
  { v: "348", t: "Accessibilité : champs, titres, échecs visibles sans couleur", items: [
    ["Général", "Bord des champs de saisie plus marqué (repérables d'un coup d'œil) ; titres de page dans le bon ordre pour les lecteurs d'écran."],
    ["Tests", "Échecs et retards hachurés en plus du rouge, « ✓ terminé » sur les bancs, nombre d'échecs écrit à côté de la barre des tests."],
    ["Tests", "Couverture du livret de configuration lisible en mode sombre."],
  ] },
  { v: "349", t: "Pastilles d'état mieux détourées", items: [
    ["Planning", "Liste : les pastilles d'état ont un contour de la couleur du texte, visible en clair comme en sombre."],
  ] },
  { v: "350", t: "Site plus léger à l'ouverture", items: [
    ["Général", "Le site télécharge moins au démarrage (icônes allégées, Gantt chargé seulement quand on l'ouvre, polices réduites)."],
    ["Général", "L'accueil se met à jour plus légèrement à chaque changement dans la base."],
  ] },
  { v: "351", t: "Texte plus lisible : une échelle, une hiérarchie", items: [
    ["Général", "Tailles de texte harmonisées sur tout le site ; petits textes et étiquettes moins gras, titres et chiffres qui ressortent."],
    ["Général", "Un seul bouton principal par écran ; en changeant de page, le lecteur d'écran se place sur le titre."],
  ] },
  { v: "352", t: "Deux nouveaux cadrans d'accueil : ligne d'atelier et fiches suiveuses", items: [
    ["Accueil", "« Ligne d'atelier » : les sept postes de la commande à l'expédition, chaque machine posée sur son poste, retard écrit dessous."],
    ["Accueil", "« Fiches suiveuses » : une fiche par machine en cours, ses étapes en barrettes et son départ ; à ajouter avec « Disposer les cadrans »."],
  ] },
  { v: "353", t: "Sept cadrans de plus, animations plus vives", items: [
    ["Accueil", "Nouveaux cadrans à ajouter : tableau des départs, écarts au planning initial, machines par chef, par pays, par gamme, fins de production et arrivées à venir."],
    ["Général", "Toutes les animations durent entre 150 et 300 ms ; les signaux d'attention ne clignotent plus qu'une fois."],
  ] },
  { v: "354", t: "Sécurité : signature du PDF de debug et connexion Odoo", items: [
    ["Tests", "PDF de la checklist de debug : seule une vraie image de signature est acceptée."],
    ["Achats / Appro", "La synchronisation Odoo n'envoie la clé qu'à un domaine Odoo autorisé."],
  ] },
  { v: "355", t: "L'accueil en widgets", items: [
    ["Accueil", "Widgets de taille fixe sur une grille qui se remplit seule : « Modifier l'accueil », glisser pour déplacer, « − » pour retirer, bouton de taille."],
    ["Accueil", "Piles : poser un widget au centre d'un autre de même taille ; on passe de l'un à l'autre en faisant défiler."],
    ["Accueil", "Galerie « Ajouter un widget » avec aperçu dans la taille choisie, et sept petits widgets (chiffres et repères)."],
  ] },
  { v: "356", t: "Gestes et retours plus fluides (audit apple-design)", items: [
    ["Général", "Lignes, cartes et plaques cliquables réagissent dès l'appui ; les menus prennent le focus (flèches haut / bas) et le rendent en se fermant."],
    ["Général", "Échap ferme d'abord le volet ouvert dans la fiche d'un PJ ; le défilement doux respecte « réduire les animations »."],
    ["Planificateur", "Barres du Gantt glissées au doigt ou à la souris, collées au pointeur entre deux jours ; détail de la charge au toucher."],
    ["Téléphone", "Fiche d'un PJ : on la tire vers le bas par son en-tête pour la fermer."],
  ] },
  { v: "357", t: "La page Tests en widgets", items: [
    ["Tests", "Au banc maintenant, Derniers résultats et Planning des bancs : widgets à tailles fixes, à déplacer, empiler, agrandir ou retirer (« Modifier la page »)."],
    ["Tests", "Nouvelle taille « Pleine hauteur » : toute la largeur, hauteur du contenu (planning des bancs)."],
  ] },
  { v: "358", t: "Accueil, téléphone et lisibilité (audit apple-design, taste, UI/UX)", items: [
    ["Accueil", "Widgets : « Annuler » pendant 6 secondes après chaque modification, « Réinitialiser », pile feuilletée de gauche à droite (la molette reste à la page), widget sans contenu masqué."],
    ["Accueil", "« Ma semaine » montre la semaine qui vient le samedi et le dimanche ; « expédiée depuis mai » partout."],
    ["Téléphone", "Fiche de tests : étapes en bande au-dessus du contenu ; SAV : onglets et boutons sur l'écran ; Calendrier du mois : lettre de l'étape sur chaque plaque."],
    ["Général", "Surligneur des titres éclairci quand la couleur de la page est foncée (SAV / MES, Projets, À traiter) ; un seul bouton plein par écran dans la fiche de tests et les Réglages."],
    ["KPI", "Détail replié sur tous les onglets ; graphiques animés en 0,3 s ; charge par mois dans l'ordre du temps ; pas de statut « tenu » sans heures planifiées."],
    ["Machines ORC", "Le tableau tient dans un écran de 1 280 px."],
  ] },
  { v: "359", t: "Des widgets à la hauteur de leur contenu", items: [
    ["Accueil", "La hauteur d'un widget suit son contenu : plus de cadres à moitié vides, plus de listes coupées."],
    ["Accueil", "Trois tailles, qui règlent la largeur : Petit (1 colonne), Moyen (2), Large (toute la largeur)."],
    ["Tests", "Mêmes règles pour les cadres de Tests › Par semaine."],
  ] },
  { v: "360", t: "Trier la Liste d'un clic", items: [
    ["Liste", "Clic sur le nom d'une colonne : ↓ décroissant, puis ↑ croissant, puis plus de tri ; toutes les colonnes, Commentaires compris."],
  ] },
  { v: "361", t: "Besoins turbines plus compacts", items: [
    ["Turbines", "Besoins ORC et SAV : logements sur 2 lignes (40 px au lieu de 50), cartes plus étroites et resserrées."],
    ["Turbines", "Les besoins complets restent affichés par défaut ; la case « À compléter » les masque et se souvient du choix."],
  ] },
  { v: "362", t: "Jalons d'arrivée et de départ au calendrier", items: [
    ["Calendrier", "Jour et Semaine : repère d'arrivée (triangle) avant la barre et de départ (losange) après, même quand la barre est très courte."],
    ["Calendrier", "Machine hors de la partie affichée : « Arrivée jj/mm → » ou « ← Départ jj/mm » reste collé au bord pendant le défilement."],
    ["Calendrier", "Mois : les plaques Arrivée et Départ portent la même forme ; légendes complétées."],
  ] },
  { v: "363", t: "Fréquences par vitesse de turbine dans la checklist de debug", items: [
    ["Tests", "Checklist de debug : tableau « Fréquences par vitesse (Hz) », lignes = turbines, colonnes = vitesses ; case verte « ✓ dans la plage », rouge « hors plage »."],
    ["Tests", "Tests › Checklists › Fréquences et vibrations : vitesses de turbine et plage min – max par turbine et par vitesse (bornes comprises)."],
    ["Tests", "PDF de la checklist de debug : même tableau, mêmes couleurs et signes ; étape signalée « fréquences hors plage » dans la fiche."],
  ] },
  { v: "364", t: "Gestion des accueils par rôle sur un seul écran", items: [
    ["Accueil", "« Gérer les accueils par rôle » (propriétaire) : liste des rôles avec « modifié / par défaut » et le nombre de widgets, aperçu réel de l'accueil du rôle choisi."],
    ["Accueil", "Actions « Copier depuis un autre rôle », « Partir de zéro », « Rétablir l'accueil par défaut », « Voir comme » ; chaque action s'annule pendant 6 s."],
    ["Accueil", "Galerie « Ajouter des widgets » : « Choisir » sur plusieurs widgets puis « Ajouter N widgets » (une seule annulation)."],
  ] },
  { v: "365", t: "Cloche : Vu, Traité et Plus tard sur chaque notification", items: [
    ["Cloche", "Pop-up en fil par jour : mentions, affectations aux tests, projets modifiés et vidéo, demandes à valider en tête."],
    ["Cloche", "Sur chaque ligne (au survol, au focus, toujours au doigt) : « Vu », « Traité », « Plus tard » ; « Tout marquer vu » ; au doigt, glisser à droite = Traité, à gauche = Plus tard."],
    ["Cloche", "« Plus tard » revient le lendemain à 8 h ; « Traités » repliés en bas (30 jours) avec « Rouvrir » ; les réactions émojis restent."],
  ] },
  { v: "366", t: "Bancs de tests séparés, planning par banc et historiques validés", items: [
    ["Tests", "Au banc maintenant : un cadre par banc (en cours ou « Libre jusqu'au … »), puis les 4 prochaines machines de ce banc avec leur date."],
    ["Tests", "Planning des bancs : une ligne par banc où les machines se suivent comme des créneaux, trait « aujourd'hui », zoom 2 sem. / 6 sem. / 3 mois."],
    ["Tests", "« Tests validés » repliable sous le planning : machines aux tests faits ou validés, par mois, avec testeurs et résultats."],
    ["Turbines", "Besoins ORC et SAV : cartes plus étroites ; besoins installés et complets dans « Besoins validés » (par mois, « Voir la carte ») ; case « À compléter » retirée."],
  ] },
  { v: "367", t: "Fiches projet : dossiers dépliés seuls, projets EPC dans le rapport, clôturées réduites", items: [
    ["Fiches projet", "Liste de gauche : le groupe du chef et le dossier (machines d'un même PJ) du PJ choisi se déplient seuls ; la ligne vient à l'écran en douceur, sans mouvement si « réduire les animations »."],
    ["Fiches projet", "Actions et plans de mitigation : les clôturés passent dans « Clôturées (N) », replié, une ligne compacte chacun avec « Rouvrir »."],
    ["Rapport chef de projet", "Un projet EPC est rangé chez son chef ORC (comme les fiches projet) ; le chef de l'EPC est rappelé en mention."],
  ] },
  { v: "368", t: "Rapport chef de projet plus lisible, bancs en deux jaunes", items: [
    ["Rapport chef de projet", "Passe apple-design : plus de majuscules espacées, titres de section 11 pt, petits textes à 8,5–9 pt au moins, gras réservé aux titres et aux valeurs."],
    ["Rapport chef de projet", "Comme la fiche : mitigation = risque puis « ce qu'on fait pour l'éviter », actions et mitigations ouvertes en entier, clôturées résumées sur une ligne."],
    ["Rapport chef de projet", "Un commentaire trop long pour sa diapositive est repris en entier sur « Textes complets de la fiche » (plus rien d'abrégé sans suite)."],
    ["Tests", "Planning des bancs : « en cours » en jaune sur le banc 1, en jaune ambré sur le banc 2 (légende à jour)."],
  ] },
  { v: "369", t: "Cash in : sous-page Encaissements pour le DAF", items: [
    ["Cash in", "Sous-page « Encaissements » à côté du tableau complet : factures émises non payées, groupées En retard / Cette semaine / Plus tard, avec montant, date de facture et encaissement prévu."],
    ["Cash in", "« Encaissé aujourd'hui » ou une autre date ; « Annuler » 6 s ; « Reçus ces 30 jours » avec « Remettre à encaisser ». Seule la date de paiement change, avec les mêmes recalculs que le tableau."],
    ["Accueil", "Widget « À encaisser » dans le catalogue (Gestion) : total, retards, prochaines factures ; un appui ouvre Cash in › Encaissements."],
  ] },
];
