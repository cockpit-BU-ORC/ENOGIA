# Déploiement — Planning Ordonnancement ENOGIA 2026

## ⚠️ Avant de commencer : 2 choses à remplacer

### 1. `src/firebase.js`
Remplace les valeurs `TON_API_KEY`, `TON_PROJET`, etc. par celles de ton
projet Firebase existant :
- Console Firebase → ⚙️ Paramètres du projet → Tes applications
- Si tu n'as pas d'app "Web" (icône `</>`), crée-la → choisis "Pas besoin
  de Firebase Hosting" (on utilise GitHub Pages)
- Copie l'objet `firebaseConfig` fourni, colle-le dans le fichier
- Vérifie que **Firestore Database** est activé (Build → Firestore
  Database) — c'est lui qui stocke les données du planning

### 2. `package.json`
Remplace `TON-USERNAME` dans le champ `"homepage"` par ton nom
d'utilisateur GitHub :
```json
"homepage": "https://TON-USERNAME.github.io/planning-enogia-2026",
```

---

## Étapes de déploiement

### 1. Créer le repository GitHub
- Va sur [github.com](https://github.com) → **New repository**
- Nom : `planning-enogia-2026`
- Visibilité : **Public** (nécessaire pour GitHub Pages gratuit)
- Ne pas cocher "Add README" → **Create repository**

### 2. Installer Node.js (si pas déjà fait)
- [nodejs.org](https://nodejs.org) → télécharger la version LTS → installer

### 3. Préparer le projet en local
Dans un terminal, à l'intérieur de ce dossier `planning-enogia-2026/` :
```bash
npm install
```
Cela installe React, Firebase et les autres dépendances (peut prendre 1-2 minutes).

### 4. Tester en local (optionnel mais recommandé)
```bash
npm start
```
Le dashboard s'ouvre sur `http://localhost:3000`. Vérifie que la connexion
Firestore fonctionne (pas d'erreur dans la console du navigateur) avant de
déployer.

### 5. Connecter le projet à GitHub
```bash
git init
git add .
git commit -m "Premier déploiement du dashboard"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/planning-enogia-2026.git
git push -u origin main
```

### 6. Déployer sur GitHub Pages
```bash
npm run deploy
```
Cette commande build le projet et publie automatiquement le contenu sur
une branche `gh-pages`.

### 7. Activer GitHub Pages
- Sur GitHub → ton repo → **Settings** → **Pages**
- Source : branche `gh-pages` / dossier `/ (root)` → **Save**
- Attends 1-2 minutes, l'URL apparaît en haut de la page

Ton dashboard sera accessible à :
**`https://TON-USERNAME.github.io/planning-enogia-2026`**

---

## Mettre à jour le dashboard plus tard

Si tu modifies le code (`src/App.js` ou autre) :
```bash
git add .
git commit -m "Description de la modif"
git push
npm run deploy
```

---

## Règles de sécurité Firestore (recommandé)

Par défaut, Firestore peut être configuré en mode "test" qui autorise tout
le monde à lire/écrire sans restriction — pratique pour démarrer, mais à
sécuriser avant un usage en production avec toute l'équipe. Dans la
console Firebase → Firestore Database → Règles, tu peux par exemple
restreindre l'écriture aux seules requêtes contenant le bon PIN côté
applicatif (déjà fait dans le dashboard avec le code "2214"), ou mettre en
place une authentification Firebase plus robuste si besoin.

## Problèmes fréquents

- **Page blanche après déploiement** : vérifie que `homepage` dans
  `package.json` correspond exactement à l'URL GitHub Pages.
- **Erreur Firestore "permission-denied"** : les règles de sécurité
  Firestore bloquent l'accès — vérifie les règles dans la console Firebase.
- **Le bouton "Importer" ne sauvegarde rien** : vérifie que Firestore
  Database est bien activé et que `firebaseConfig` est correctement rempli.

---

## Version bêta (essais) et retour arrière

### Principe
- **Production** : https://cockpit-bu-orc.github.io/ENOGIA/ (`npm run deploy`) — depuis v237 ; avant : Planning-ENOGIA-BU-ORC.github.io/planning-enogia-2026.
- **Bêta** : https://cockpit-bu-orc.github.io/ENOGIA/beta/ (`npm run deploy:beta`).
- La bêta a **ses propres données** (documents Firestore préfixés `beta_`) : tout ce qui est saisi ou importé dans la bêta
  n'affecte jamais la production. Un bandeau orange « VERSION BÊTA » est affiché en haut de chaque écran.
- Un déploiement de la production **conserve** le dossier `beta/`, et un déploiement de la bêta **ne touche pas** la production.

### Utiliser la bêta
1. `npm run deploy:beta` (construit puis publie dans `/beta/`).
2. Ouvrir l'adresse /beta/, se connecter, puis cliquer sur **« Copier la production vers la bêta »** (bandeau orange, comptes
   propriétaires uniquement) pour charger des données réelles dans la bêta. À refaire quand on veut repartir des données à jour
   (les données de la bêta sont alors remplacées ; la production n'est jamais modifiée).
3. Tester. Quand c'est validé : `npm run deploy` publie la même version en production.
4. Si la bêta ne convient pas : ne rien faire côté production (elle n'a pas bougé), ou redéployer une bêta corrigée.

### Revenir à la version précédente de la production
Avant chaque mise en production, poser un repère : `git tag prod-AAAA-MM-JJ` (ex. `prod-2026-10-08`).
Pour revenir en arrière : `git checkout prod-AAAA-MM-JJ` puis `npm run deploy` (puis `git checkout main`).
Alternative sans le code source : la branche `gh-pages` garde chaque déploiement ; on peut y annuler le dernier (`git revert`).

### À savoir
- Les règles de sécurité Firestore doivent autoriser les documents `beta_*` du dossier `planning` (c'est le cas si la règle porte sur tout `planning/{document}`).
- Les données de la bêta ne sont pas synchronisées avec la production : un import MS Project fait en production ne se voit en bêta qu'après une nouvelle copie.

## Onglet Modifications (suivi entre deux imports)

Le module « Planification » (Gantt éditable, plan, publication) a été retiré à la v114. Il reste un seul outil de suivi : l'onglet **Modifications** (icône à deux flèches dans le rail de gauche), visible par tous.

- À chaque **import d'un planning MS Project** (bouton « Importer un planning »), l'application relit l'ancienne version juste avant de l'écraser et enregistre l'écart avec la nouvelle (document Firestore `planning/changeLog`, 20 versions gardées ; `beta_changeLog` en bêta). Elle ouvre ensuite directement cet onglet.
- Synthèse : une ligne par PJ qui a bougé (départ le plus en retard en premier), écart en jours (rouge = plus tard, vert = plus tôt) pour Arrivée, Tests, Fin tests, Fin prod. et Départ, heures modifiées, PJ ajoutés ou retirés. Tuiles Retards / Avancés / Heures / Nouveaux (cliquables = filtre), recherche d'un PJ, bouton « Copier la synthèse » (texte pour un mail ou le CODIR), clic sur une ligne = ouvre le PJ dans la Liste.
- Le menu déroulant permet de revoir les imports précédents. Le premier import n'a pas de version précédente : la comparaison apparaît à partir du deuxième.
- Si les règles Firestore listent les documents un par un, ajouter `changeLog` (comme les autres documents du dossier `planning`).
- Les anciens documents `plan` et `planHistory` ne sont plus lus : ils peuvent être supprimés dans la console Firebase (sans conséquence).

## Nouveautés v115

- **États** « Non désignée » et « Slot libre » : disponibles dans les filtres, le sélecteur d'état (Manager) et les camemberts.
- **Camemberts** à la place des barres : dérive des PJ (Manager › Suivi) et retard par PJ (jours cumulés).
- **Dernier import** : bandeau sur la vue d'ensemble et section « Depuis le dernier import » dans la fiche projet (lien avec l'onglet Modifications).
- **Fiche projet** (Manager › Fiches) :
  - **Avancement global** = moyenne des volets renseignés (production, gros composants, jalons de paiement).
  - **Gros composants** : tableau de cases à cocher Désigné / Commandé / Installé (Pompe, Échangeur, Skid, Turbine, Générateur, Armoire par défaut ; on peut en ajouter ou retirer).
  - **Jalons de paiement** : cases à cocher + barre d'avancement (pondérée par le % du contrat si renseigné).
  - **Actions de la semaine** : nouvelle catégorie de commentaire, datée.
  - « Commentaire CODIR » supprimé ; « Fin contractuelle » devient **MaD ORC**.
- **Rapport chef de projet (PowerPoint)** : bouton dans le Manager, à côté de « Rapport CODIR ». Choix du chef de projet (ou tous), génération dans le navigateur d'un .pptx. La bibliothèque pptxgenjs est chargée à la demande depuis cdnjs : connexion internet nécessaire au clic.
- Les saisies (composants, paiements, actions) sont stockées dans `pjMetaOverrides` et ne sont jamais écrasées par un import.

## Corrections v116

- **Liste** : le bloc « avancement global » est retiré de la vue d'ensemble.
- **Avancement global** (fiche projet) : moyenne automatique par défaut, mais modifiable à la main (champ % dans la tuile). « ↺ revenir à l'auto » rétablit la moyenne. Ce chiffre alimente aussi le rapport PowerPoint.
- **Montant global du contrat** : champ dans « Contrat & roadmap » (en €). Si les jalons de paiement ont un % du contrat, le montant de chaque jalon est calculé ; le PPT reprend ces montants.
- **État** « Non Designée » (nouvelle graphie). **Slot libre** : aucune gamme affichée (les PJ en slot libre sont exclus des graphes par gamme).
- **Onglets Suivi › Avancement et Statut** : colonne S/N dédiée, alignée avec les lignes.
- **Fiche projet** compactée (deux colonnes) pour tenir sur un écran.
- **Gros composants** : une couleur par étape (Désigné ambre, Commandé bleu, Installé vert), reprise dans le PPT.

## Corrections v117

- **MaD ORC** = fin contractuelle, hors transport vers le site client (libellés fiche, CODIR, PPT).
- **Slot libre** : exclu de tous les KPI (Manager, vue d'ensemble) et des rapports (CODIR, PPT chef de projet). Il reste dans la liste, la fiche, le statut & état et la charge atelier.
- **Avancement global** : saisi uniquement à la main (signature → mise en service), plus aucune formule.
- **PowerPoint** : la bibliothèque est embarquée dans le site (`public/vendor/pptxgen.bundle.js`, publiée avec le site) : plus besoin d'internet ni de CDN. Le dossier `vendor/` part avec `npm run deploy` / `deploy:beta`.
- **Rapport CODIR** : montant du contrat, avancement global, jalons de paiement (cases, barre, montants), gros composants colorés par étape, colonnes Global / Paiem. / Contrat dans la synthèse, total des contrats.
- **S/N** : colonne dédiée aussi dans Suivi › Santé projets.

## v118 — Comparer deux fichiers

Onglet **Modifications** › « Comparer deux fichiers MS Project » : on choisit un ancien et un nouvel export (.xlsx), le site affiche l'écart (PJ qui ont bougé, jours de retard/avance, heures, nouveaux/retirés). Lecture dans le navigateur, **rien n'est importé ni enregistré**. Utile pour les versions antérieures à la mise en ligne du journal d'imports.

## v119 — Plans de mitigation, fiche synthèse et rapport CDP complet

- **Plans de mitigation** : nouvel encart sur la fiche projet (à côté des « Actions de la semaine »), repris dans le rapport CODIR et le PowerPoint chef de projet.
- **Commentaires** : les « commentaires de synthèse » (cadres pointillés laiton, repris dans les rapports) sont distincts du « Fil de commentaires » (discussion datée, hors fiche synthèse) — légende ajoutée sous l'identité du projet.
- **Major components** : titre renommé, colonnes **Design / PO / Installé**.
- **Rapport CDP (PowerPoint)** : 2 diapositives par PJ (3 s'il y a des retards/commentaires) reprenant toute la fiche : statut global + commentaires, indicateurs, jalons, MaD ORC, contrat, major components, jalons de paiement avec montants, dernier import, retards, actions, mitigation, fil de commentaires (hors privés).
- **Slots libres** masqués par défaut dans la liste des fiches (case « Slots libres » pour les afficher).
- Corrections de design : frise du contrat (libellés MaD ORC / Fin proj. qui se chevauchaient), en-têtes de section tronqués.

## v120 — Puces clôturables, rapport CdP identique à la fiche, CODIR allégé

- **Actions de la semaine / Plans de mitigation** : ce sont maintenant des listes de puces. Cocher une puce la clôture (date du jour, modifiable) ; les puces closes passent en bas, barrées. Les anciens textes libres sont repris ligne par ligne comme puces ; dès la première modification, la liste devient la référence (champs `actions` / `mitigations`, jamais écrasés par un import).
- **Commentaire général** (nouveau, en haut de la fiche) : le seul commentaire repris dans le rapport CODIR.
- **Rapport CODIR** : plus de commentaires de synthèse ni de fil de commentaires ; il contient le commentaire général, les actions et les plans de mitigation (avec clôtures datées).
- **Rapport CdP (PowerPoint)** : reproduit la fiche synthèse (commentaire général, statut global avec feux, indicateurs en anneaux, frise des jalons, contrat & roadmap, actions, mitigation, major components, jalons de paiement, dernier import, causes de retard, fil de commentaires complet hors privés avec diapositives de suite si besoin) — 3 diapositives par PJ, suites éventuelles.
- **Onglet Suivi** : S/N affiché en entier (Avancement, Statut & état, Santé) ; barre d'avancement réduite.
- **Onglet Modifications** : l'outil « Comparer 2 plannings » devient un petit bouton ; l'historique des imports reste affiché en dessous.

## v122 — Finitions UX (à tester en bêta)

- **Contrastes** : séparateurs plus visibles, gris des petits textes plus lisibles (clair et sombre).
- **Boutons principaux** pleins (plus de dégradé), survol plus soutenu, léger enfoncement au clic.
- **Clavier** : anneau de focus visible ; **chiffres alignés** (dates, %, montants) ; coches animées ; mouvement réduit respecté.
- **En-tête** : « Import 14/10 11:26 · 35 PJ modifiés › » est cliquable et ouvre Modifications ; squelette de chargement.
- Fiche : champs de saisie lisibles en mode sombre (jalons de paiement).
- Retour arrière facile : tout est dans `src/theme.js` (2 valeurs) et la fin de `src/styles.css`.

## v123 — Étape 1 : lisibilité et confiance (à tester en bêta)

Rien ne change dans la mise en page. Cinq retouches locales :

- **Feux lisibles sans la couleur** : à risque = carré, vigilance = losange, bon = rond (fiche, onglet Santé, légende). Zone cliquable de 24 px.
- **Un seul orange** pour « Vigilance » (fini le jaune `#E3B505` à 1,9:1) ; le texte « Vigilance » est en orange foncé lisible.
- **Accusé d'enregistrement** : « ✓ Enregistré à 14:32 » sous le nombre d'unités, en haut à droite, après chaque enregistrement d'infos projet réussi.
- **Légende des commentaires repliée** sous l'identité du projet : un clic sur « ? Légende des commentaires » l'affiche.
- **Cases à cocher** de la fiche (actions, composants, paiements) de 17 à 20 px avec marge (24 px d'emprise) ; « MaD ORC » a une définition au survol.
- Retour arrière : `git revert` du commit v123, ou voir `src/components/Feux.js` (`feuColor`, `feuText`, `feuShape`).

## v123b — Date de saisie sur les actions et les plans de mitigation
- Chaque puce (Actions de la semaine, Plans de mitigation) affiche la date de saisie en petit italique (JJ/MM/AA) à droite du texte ; l'heure exacte est dans l'infobulle.
- Les puces reprises de l'ancien texte libre n'ont pas de vraie date de saisie : rien n'est affiché pour elles.
- Fichiers : `src/components/ManagerFiche.js`, `src/App.js` (version). Retour arrière : `git revert` du commit.

## v124 — Étape 2 : synthèse en tête de fiche
- Nouveau bandeau de trois chiffres sous l'identité du projet : **Départ** (date + écart au planning initial, en jours et en mots), **Prochain jalon** (étape, date, dans N j), **À traiter** (actions + mitigations ouvertes).
- Aucune donnée nouvelle : tout vient des dates et des listes déjà saisies.
- Dans « Statut global », les axes **Non évalué** ne sont plus quatre cartes vides : une ligne unique « Non évalués » garde les sélecteurs de feu ; dès qu'un axe est évalué il passe en carte, avec son commentaire.
- Le reste de la fiche est inchangé. Fichiers : `src/components/ManagerFiche.js`, `src/App.js` (version).
- Retour arrière : `git revert` du commit v124.

## v125 — Étape 3 : écran Modifications plus lisible
- Dans chaque date décalée, un **trait proportionnel à l'écart** sous la pastille (milieu = date d'origine ; droite = plus tard, gauche = plus tôt). L'écart reste écrit en jours dans la pastille.
- Le filtre « Nouveaux PJ » devient **« Ajoutés ou retirés »** : il liste aussi les PJ retirés (départ d'origine barré). Un rappel « Filtre : … · Tout afficher » apparaît dès qu'un filtre est actif. Les filtres Retards et Avancés existaient déjà (cartes cliquables) et sont conservés.
- Bouton **« Prévenir le CdP »** sur chaque ligne : ouvre un message pré-rempli (objet + ce qui a bougé pour ce PJ, appel par le prénom du chef de projet). Aucune adresse n'est enregistrée dans l'application : vous choisissez le destinataire, et votre messagerie ajoute la signature.
- Rien n'est stocké ni envoyé par l'application. Fichiers : `src/components/ChangesTable.js`, `src/App.js` (version). Retour arrière : `git revert` du commit v125.

## v125b — Retrait du bouton « Prévenir le CdP »
- Le bouton et le générateur de message ont été retirés de l'écran Modifications (`src/components/ChangesTable.js`). Le trait d'écart et le filtre « Ajoutés ou retirés » de la v125 sont conservés.

## v126 — Étape 4 : la liste se trie et se filtre par dérive, avec des vues enregistrées
- Au-dessus du tableau de la liste (aucun bandeau de chiffres ajouté) :
  - **En dérive seulement** : n'affiche que les PJ dont le départ est plus tard que dans le planning initial. Comme les autres filtres, il suit aussi le Gantt et le calendrier.
  - **Tri** : ordre du planning (par défaut, inchangé), dérive la plus forte d'abord, départ le plus proche, N° PJ. Le tri ne change que l'ordre d'affichage ; l'export Excel suit l'ordre affiché.
  - **Vues** : deux vues prêtes à l'emploi (« Toute la liste », « En dérive, les plus en retard d'abord ») et « Mes vues » : enregistre les filtres, le tri et « En dérive seulement » sous un nom. Le bouton affiche « Vue : … » quand l'état correspond à une vue.
- Les vues personnelles sont gardées **dans le navigateur** (localStorage) : propres à chaque personne et à chaque poste, rien n'est envoyé à Firebase.
- Aucune donnée du planning n'est modifiée. Fichiers : `src/App.js`, `src/components/TableView.js`, `src/components/SavedViews.js` (nouveau), `src/components/ChangesTable.js`.
- Retour arrière : `git revert` du commit v126.

## v127 — Étape 5 : une seule échelle de texte et des gris lisibles
**Tailles de texte.** Il y avait une quarantaine de tailles différentes (de 7 à 66 px). Elles sont ramenées à **sept** (`FZ` dans `src/theme.js`) : `FZ.xs` 12 · `FZ.sm` 14 · `FZ.md` 16 · `FZ.lg` 20 · `FZ.xl` 28 · `FZ.xxl` 40 · `FZ.hero` 64. Chaque ancienne taille a été ramenée à la plus proche (tout ce qui faisait moins de 12 px passe à 12 px, ce qui rend les petites étiquettes lisibles). Roboto est conservée.
- Effet visible : les petits libellés sont un peu plus grands, la fiche est environ 5 % plus longue ; les libellés en majuscules ont un espacement de lettres réduit pour rester compacts. Le petit libellé « de retard » au centre des petits anneaux n'est plus affiché (il tient dans la légende).
- **Non touchés** (volontairement) : les rapports CODIR / CdP (mise en page imprimée et PowerPoint), le Gantt et le Calendrier (tailles liées à la géométrie des barres), et les tailles calculées dans les graphiques (anneaux, courbes). À traiter séparément si vous le souhaitez.
- Règle pour la suite : toute nouvelle taille se prend dans `FZ` (`fontSize: FZ.sm`), jamais en dur.

**Contrastes.** Les gris de texte étaient trop pâles (le gris tertiaire était à 3,1:1 en mode clair, le minimum d'accessibilité étant 4,5:1) :
- clair : `ink500` `#5A616A` (6:1), `ink300` `#676D74` (≥ 4,7:1), `red500` `#BE3A3A` (≥ 4,9:1, texte blanc dessus 5,7:1) ;
- sombre : `ink500` `#B2BBC6`, `ink300` `#A0AAB6` (≥ 4,8:1 sur les trois fonds).
- Limite connue : le rouge de texte en mode sombre reste un peu sous 4,5:1 (le changer rendrait les boutons rouges à texte blanc moins lisibles).

Fichiers : `src/theme.js`, `src/App.js`, `src/pjMeta.js` et 17 composants de `src/components/`. Retour arrière : `git revert` du commit v127 (rien d'autre n'est modifié : aucune donnée, aucun enregistrement).

## v128 — Export Excel en vrai tableau, aux couleurs du site
- Le bouton « Export Excel » de la liste produit maintenant un **tableau Excel** : boutons de filtre dans l'en-tête, lignes alternées, en-tête et colonne PJ figés, impression paysage sur une page de large.
- Couleurs du site (version claire, même si l'écran est en mode sombre) : en-tête bleu marine, **État** avec la pastille de l'état, **Gamme** dans la couleur de la gamme, **Départ** en rouge s'il a glissé, **dérive** en rouge / vert, **avancement** avec barre.
- Données plus utiles : vraies **dates** (triables et filtrables dans Excel), Tests en deux colonnes (début / fin), nouvelle colonne **Dérive du départ (j)**, avancement en pourcentage.
- L'export suit ce qui est affiché : filtres, « En dérive seulement » et tri de la liste.
- La bibliothèque (ExcelJS) est chargée à la demande depuis jsDelivr (puis cdnjs en secours). Si elle ne peut pas se charger (hors ligne, réseau filtré), l'ancien export simple prend le relais : rien n'est perdu.
- Fichiers : `src/exportExcel.js` et `src/exportExcelBuild.js` (nouveaux), `src/components/TableView.js`, `src/App.js` (version). Aucune dépendance à installer. Retour arrière : `git revert` du commit v128.

## v129 — Fiche synthèse plus claire (cadres par thème, une seule police)

- **Cadres par thème** : la fiche est découpée en 6 cadres crème au filet fin — Pilotage (synthèse, commentaire général, statut global, indicateurs), Planning (jalons, contrat, dernier import), Suivi (actions, mitigations), Achats et finance (composants, paiements), Retards, Échanges (fil de commentaires). Titre de cadre en gras avec repère laiton ; les tuiles intérieures sont blanches (plus de crème sur crème).
- **Hiérarchie des titres** : cadre (16 px gras) > sous-titre de bloc (14 px gras, sans majuscules) > libellé de tuile (12 px, majuscules).
- **Une seule police** : le N° PJ et le N° de série n'utilisent plus la police à chasse fixe dans la fiche, le volet, la liste de gauche et le tableau (même police que le reste, chiffres alignés). Les autres vues (Gantt, Calendrier, Retards, Commentaires…) gardent leur police actuelle.
- Aucune donnée ni règle de calcul modifiée. Fichiers : ManagerFiche.js, ProjectModal.js, TableView.js, pjMeta.js, App.js (numéro de version).
- Retour arrière : `git revert <commit v129>`.

## v130 — Liste à gauche sans défilement horizontal

- **Plus de barre de défilement horizontale** : la liste s'adapte à sa largeur. Le N° de série passe sous le N° PJ (petit, gris), le pays devient un drapeau (nom au survol) dès que la place manque.
- **Si cela ne suffit pas** (écran étroit, volet de droite ouvert), les colonnes les moins importantes sont masquées une à une, dans cet ordre : Arrivée, Fin prod, Chef de projet, Gamme, Pays, Commentaires, Tests, Avancement. Le tableau est mesuré réellement (pas d'estimation), et une ligne « N colonnes masquées faute de place » l'indique avec un lien « Réduire le volet de droite pour les afficher ».
- Les colonnes reviennent d'elles-mêmes dès qu'il y a de la place (volet réduit, écran plus large). Le sélecteur « Colonnes » reste maître : une colonne décochée n'est jamais réaffichée ; « N° de série (sous le PJ) » y pilote la 2ᵉ ligne du N° PJ.
- Fichiers : TableView.js, App.js (numéro de version). Aucune donnée modifiée.
- Retour arrière : `git revert <commit v130>`.

## v131 — Fiche plus large, liste de gauche sans barre horizontale, « Échanges » clarifié

- **Fiche plus large** : elle n'est plus plafonnée à 880 px ni centrée ; elle occupe toute la largeur disponible (jusqu'à 1500 px), collée à la liste. Les deux colonnes de cadres s'élargissent en conséquence (moins de défilement vertical).
- **Liste de gauche (onglet Fiche)** : 280 px au lieu de 250, plus aucune barre de défilement horizontale. Le N° de série passe sur la 2ᵉ ligne, devant le nom du projet.
- **Cadre « Échanges » renommé « Fil de commentaires »** (sous-titre : « Discussion entre managers, propre à ce projet »), compteur « N messages », texte d'aide réécrit : la discussion est distincte de la synthèse, seuls les derniers messages non privés peuvent être joints au CODIR. Aucune donnée ni règle modifiée.
- Fichiers : ManagerFiche.js, App.js (numéro de version). Retour arrière : `git revert <commit v131>`.

## v132 — Police réduite sur les fiches synthèse, échelle de tailles étendue au Gantt et au Calendrier

- **Fiches synthèse plus compactes** (fiche de l'onglet Manager et volet de droite de la liste) : échelle de police réduite d'un cran — texte courant 12,5 px (au lieu de 14), libellés 11 px (au lieu de 12), sous-titres 14,5 px, gros chiffres 17 px (au lieu de 20), N° PJ de la fiche 24 px (au lieu de 28). La fiche est environ 10 % plus courte. Contraste inchangé (texte toujours ≥ 4,5:1). L'échelle est définie une seule fois dans `theme.js` (`FZF`) : on peut la rééchelonner en changeant ces 7 chiffres.
- **Gantt et Calendrier** : toutes leurs tailles de texte (jusque-là 9,5 à 18 px, à la main) passent sur la même échelle ; plus aucun texte sous 11 px. Calendrier : la mesure des largeurs de colonnes utilise les mêmes tailles, donc les libellés (« Production »…) ne sont toujours jamais coupés. Les rapports (CODIR, chef de projet) ne sont pas touchés : ils sont faits pour l'impression.
- **Volet de droite** : le mini-calendrier (3 mois) ne déborde plus à droite.
- **Fiche Manager** : le × d'une action clôturée ne passe plus seul à la ligne.
- Fichiers : theme.js, ManagerFiche.js, ProjectModal.js, GanttView.js, CalendarView.js, App.js (numéro de version). Aucune donnée modifiée.
- Retour arrière : `git revert <commit v132>`.

## v133 — Tri « Passage au banc »

- **Nouveau tri** dans la liste : « Passage au banc : prochain d'abord » (menu « Tri »), et une vue prête à l'emploi « Ordre de passage au banc » (menu « Vues »). Le tri s'applique aussi à l'export Excel (il exporte ce qui est affiché).
- **Règle** : l'ordre de passage se lit sur les dates de la phase « Tests » (début, puis fin). D'abord les PJ dont les tests sont en cours ou à venir (le plus proche en tête), puis les passages déjà terminés (le plus récent d'abord), enfin les PJ sans date de tests.
- Aucune donnée modifiée. Fichiers : TableView.js, App.js (numéro de version). Retour arrière : `git revert <commit v133>`.

## v134 — Point hebdo + fiche à la hauteur de l'écran

- **Nouvel onglet Manager « Point hebdo »** (entre « Fiche projet » et « KPI ») : toutes les actions de la semaine et tous les plans de mitigation **ouverts**, PJ par PJ, sur un seul écran. Chaque ligne montre la date de saisie (petite, en italique) et l'ancienneté (en jours ; orange à partir de 14 j, rouge à partir de 30 j). Les anciennes notes sans date de saisie n'ont pas d'ancienneté (« — »).
  - Cocher une ligne la **clôture à la date du jour** (comme dans la fiche) ; la case « Clôturés ces 7 derniers jours » permet de rouvrir par erreur.
  - Filtres : Tout / Actions / Mitigations, « Plus de 7 jours seulement », recherche (PJ, projet, chef, mot), tri (plus ancien d'abord, départ le plus proche, ordre du planning).
  - Un clic sur l'en-tête d'un PJ ouvre sa fiche. « Copier le point » met la liste affichée en texte dans le presse-papiers (compte rendu, e-mail).
  - Mêmes données que les fiches : rien de nouveau côté stockage.
- **Fiche synthèse à la taille de l'écran** : la fiche prend la hauteur de la fenêtre (comme la liste de gauche) et défile à l'intérieur ; l'en-tête (PJ, état, statut global) reste figé en haut. Plus de défilement de la page entière.
- Fichiers : PointHebdo.js (nouveau), ManagerFiche.js, ManagerPanel.js, App.js (numéro de version). Retour arrière : `git revert <commit v134>`.

## v135 — Notification des modifications (message à la connexion + pastille sur l'icône)

- **Pastille rouge sur l'icône « Modifications »** : nombre de versions (imports / publications) publiées depuis la dernière fois que la personne a ouvert l'onglet. Elle disparaît dès l'ouverture de l'onglet.
- **Message à la connexion** : une fenêtre « Le planning a été mis à jour » résume ce qui a bougé (PJ modifiés, départs repoussés / avancés, PJ ajoutés / retirés, les 3 plus gros décalages) avec deux boutons : « Voir les modifications » (ouvre l'onglet) ou « Plus tard » (la pastille reste). Échap ou clic à côté = « Plus tard ». Elle ne s'affiche qu'une fois par session de navigateur.
- **Mémorisation par personne et par poste** (stockage du navigateur, rien n'est envoyé à Firebase) : une personne qui change de poste ou vide son navigateur reverra la dernière version si elle a moins de 14 jours. Aucune règle Firestore à modifier ; le journal « Modifications » existant sert de source.
- Fichiers : ChangesNotice.js (nouveau), App.js. Retour arrière : `git revert <commit v135>`.

## v137 — Transitions et micro-animations

(La V136 « fiche en 4 vues » a été annulée : cette version part de la V135.)

- **Déjà en place et conservé** : fondu à chaque changement de vue principale (Liste, Gantt, Calendrier…), ouverture des fenêtres et tiroirs, retour au clic sur les boutons, écran de connexion.
- **Ajouté** :
  - **Espace Manager** : chaque onglet (et sous-onglet KPI) apparaît en fondu léger (0,26 s).
  - **Fiche projet** : changement de PJ dans la liste = la fiche réapparaît en fondu, en haut.
  - **Barres d'avancement** (fiche, liste de gauche, onglets KPI/Avancement) : elles se remplissent de gauche à droite à l'affichage (0,7 s) et glissent en douceur quand la valeur change. **Anneaux d'avancement** : ils se dessinent.
  - **Tableau de bord** : les 4 camemberts arrivent l'un après l'autre (40 ms d'écart).
  - **Pastille « nouveautés »** (V135) : elle jaillit puis émet 3 ondes discrètes, ensuite elle reste fixe ; le message de connexion apparaît avec fond teinté et fenêtre qui « pop ».
  - **Boutons** : transitions de survol / appui un peu plus douces (courbe commune).
- **Règle** : rien ne dure plus de 0,8 s, rien ne boucle. Tout est coupé automatiquement quand le système demande « réduire les animations » (Windows : Paramètres > Accessibilité > Effets visuels). Aucune animation ne laisse de décalage résiduel (les éléments collants ou fixes restent corrects).
- Fichiers : styles.css, ManagerFiche.js, ManagerParts.js, ManagerPanel.js, DashboardSummary.js, ChangesNotice.js, App.js (numéro de version). Aucune donnée modifiée. Retour arrière : `git revert <commit v137>`.

## v138 — Fiche synthèse sur trois colonnes, plus compacte

- **Trois colonnes** (au lieu d'une grande colonne + deux demi-colonnes) : **Pilotage** | **Planning + Retards** | **Achats et finance + Suivi**. Sur un écran plus étroit la fiche passe à deux puis une colonne (chaque colonne fait au moins 340 px).
- **Plus compact** : tuiles de synthèse côte à côte (Départ / Prochain jalon = la date, avec « Tests · dans 25 j » dessous / À traiter), cadres et espacements resserrés, camembert des retards ramené de 90 à 64 px, champs du contrat sur trois colonnes, la phrase répétée « MaD ORC = fin contractuelle… » supprimée (l'info-bulle sur « MaD ORC » la donne toujours).
- **Fil de commentaires replié par défaut** : une seule ligne avec le dernier message, le nombre de messages et un bouton « Ouvrir ». Le choix (ouvert / replié) est mémorisé sur le poste. Aucun message n'est supprimé.
- **Mesuré** (jeu d'essai avec un PJ moyennement rempli) : hauteur totale du contenu de la fiche 1 680 px → **890 px** à 1650×772 ; à 1920×1080 elle tient **sans défilement**. Sur un écran plus petit (ex. 1650×772, 1440×800) ou pour un PJ très rempli (nombreuses actions, composants), la fiche défile encore à l'intérieur, en-tête figé.
- Fichiers : ManagerFiche.js, App.js (numéro de version). Aucune donnée modifiée. Retour arrière : `git revert <commit v138>`.

## v139 — Palette centrale, accent unique, 5 thèmes sélectionnables, contrastes vérifiés

- **Sélecteur de thème** : nouveau bouton « palette » en bas de la barre latérale (au-dessus du soleil / de la lune). 5 thèmes, chacun en clair **et** en sombre : **Marine** (défaut : bleu acier, fond crème), **Bleu nuit** (bleu profond, fond blanc-bleuté), **Ardoise** (gris-bleu industriel), **Forêt** (vert foncé), **Cuivre** (marron chaud, fond sable). Le choix est mémorisé par personne et par poste (navigateur), rien n'est envoyé à Firebase. La couleur de la barre d'adresse des mobiles suit le thème.
- **Le laiton disparaît** : l'accent (barres de titre des cadres, repère « prochain jalon », cadres de commentaires, actions de la semaine…) est maintenant **un seul jeton `T.accent`** propre à chaque thème : sarcelle (Marine, Cuivre), magenta (Bleu nuit), violet (Ardoise), rose antique (Forêt). Ces teintes ont été choisies **hors** des couleurs de statut pour ne jamais être prises pour un état. Les rapports (CODIR, PowerPoint chef de projet) et l'export Excel gardent la charte Marine, quel que soit le thème affiché.
- **Une couleur par sens, la même partout** : rouge = retard / risque ; vert = conforme / en avance ; ambre = vigilance ; bleu = information (nouveau jeton `info`) ; orange braise = retard important (15–30 j). Migrés vers ces jetons : l'orange de la dérive, le bleu des barres « Production », le rouge des mitigations, les 3 couleurs Design / PO / Installé des composants, le bandeau BÊTA, les boutons rouges de confirmation de suppression (nouveau jeton `redFill`, texte blanc lisible aussi en sombre).
- **Audit des couleurs en dur** : il en restait ≈ 300 hors du fichier de thème. ≈ 80 % sont des **palettes de catégories voulues** (couleurs des gammes, des états, de la présence client / NOBO, des phases du calendrier, drapeaux, logo Google, rapports imprimés) : conservées. Le reste (≈ 15 couleurs de sens) est migré, voir ci-dessus.
- **Contrastes (≥ 4,5:1)** : script `npm run check:contrast` (557 contrôles : tous les textes sur tous les fonds de chaque thème, clair et sombre, textes de statut, texte blanc sur boutons pleins, pastilles d'état, présence et phases du calendrier). Corrections apportées : gris discret (`ink300`) un peu plus contrasté, rouge de texte en sombre éclairci, 3 textes d'état et 3 textes de phase assombris, boutons pleins sombres des thèmes Bleu nuit / Forêt / Cuivre assombris.
- **Correctif au passage** : les fenêtres et panneaux « flottants » (message de connexion, choix de thème…) se calent désormais sur l'écran et non sur la page (l'animation d'apparition de l'application ne laisse plus de décalage résiduel).
- Fichiers : theme.js, ThemePicker.js (nouveau), App.js, SharedUI.js, ManagerFiche.js, PointHebdo.js, ChangesNotice.js, ManagerPanel.js, ManagerParts.js, CommentsKanban.js, CommentsView.js, ProjectModal.js, pjMeta.js, CalendarView.js, CodirReport.js, reports/cdpPptx.js, exportExcel.js, styles.css, package.json, scripts/check-contrast.mjs. Aucune donnée modifiée. Retour arrière : `git revert <commit v139>`.

## v139.1 — Couleurs plus vives + correctif de superposition des menus

- **Couleurs plus marquées** sur les 5 thèmes (clair et sombre) : accents plus saturés (sarcelle, magenta, violet, rose, vert-de-gris), couleur principale de chaque thème plus intense (Bleu nuit plus électrique, Forêt plus verte, Cuivre plus chaud), fonds légèrement plus teintés, statuts ambre / vert plus francs. Contrastes revérifiés : `npm run check:contrast` → 557 contrôles, 0 échec.
- **Correctif** : le sélecteur de thème passait sous un menu ouvert (ex. filtre « PJ »). Désormais **un seul menu ouvert à la fois** (ouvrir le sélecteur de thème ferme les filtres / colonnes / import ouverts, et inversement), le sélecteur passe au-dessus de tout, et un clic à côté ou la touche Échap le referme.
- Fichiers : theme.js, ThemePicker.js, SharedUI.js, TableView.js, App.js. Aucune donnée modifiée. Retour arrière : `git revert <commit v139.1>`.

## v140 — Hiérarchie et finition (ombres, grille, états vides, chargement, tableaux, icônes)

- **Trois niveaux d'ombre, pas un de plus** : *plat* (simple filet : boutons, champs, pastilles), *carte* (filet + ombre douce : cadres, panneaux, fiche) et *flottant* (menus, fenêtres, tiroirs, sélecteur de thème). Jetons `shadowFlat` / `shadowCard` / `shadowFloat` dans theme.js ; les anciens noms (`shadowSm`, `shadowMd`, `neuOut`…) pointent vers ces trois niveaux, donc plus aucune ombre « intermédiaire » (clair et sombre).
- **Une grille pour les rayons et les espacements** : rayons 4 / 8 / 12 / 16 + pastille (≈ 200 valeurs ramenées : 5-7-9-10-11-14 → valeurs de la grille) ; espacements (`gap`, `padding`) en multiples de 4 (2 et 6 tolérés pour les micro-ajustements : ≈ 470 valeurs alignées). Constantes `R` et `SP` exportées par theme.js pour le code à venir. Calendrier, Gantt et rapports imprimés non touchés (réservés à la V142). Effet mesuré : fiche synthèse 892 → 872 px de haut.
- **Un seul style d'état vide** (`EmptyState`) : petit pictogramme du jeu d'icônes + message + action facultative, en trois tons : « rien pour l'instant » (boîte), « aucun résultat pour ces filtres » (loupe, avec « Tout afficher »), « tout est à jour » (coche verte). Remplace les messages secs d'une ligne : liste filtrée, fiche sans sélection, composants, commentaires, point hebdo, séries, changements, colonnes des retards, Manager.
- **Chargement** : à l'ouverture, à la place du cercle qui tourne et du texte « Connexion à la base… », un **squelette gris animé** qui reprend la forme de la liste (barre d'outils, en-tête, 9 lignes qui s'estompent, volet de droite). Coupé automatiquement si le système demande « réduire les animations ».
- **Tableaux** (liste des PJ) : en-tête **détaché** (bande teintée séparée des lignes par un espace, plus de trait dessous), **ligne survolée mise en évidence** (teinte de l'accent du thème), **zébrage très discret** (teinte opaque : rien ne transparaît sous la colonne N° PJ figée), plus de filets entre les lignes.
- **Un seul jeu d'icônes** : les croix « ✕ » / « × » écrites en texte (14 boutons de suppression ou de fermeture) sont remplacées par l'icône « fermer » du jeu (même épaisseur de trait que le reste) ; nouvelle icône « loupe » pour les états vides.
- Fichiers : theme.js, SharedUI.js (EmptyState, LoadingSkeleton, icône loupe), App.js, TableView.js, ProjectModal.js, ManagerFiche.js, ManagerParts.js, ManagerPanel.js, CommentsKanban.js, CommentsView.js, PointHebdo.js, Series.js, ChangesTable.js, SavedViews.js + valeurs de rayons / espacements dans la plupart des composants. Aucune donnée modifiée. Retour arrière : `git revert <commit v140>`.

## v141 — Mode sombre soigné, densité d'affichage, mode présentation

- **Correctif de la v140** : lors de l'alignement des espacements sur la grille, la marge intérieure des cellules de la liste des PJ (N° PJ, projet, dates…) avait été perdue (texte collé aux bords). Rétablie, et désormais pilotée par la densité (voir plus bas). Aucune autre zone n'était touchée.
- **Bouton « palette » = menu « Affichage »** (barre latérale) : thème de couleurs, **densité** (Confortable / Compacte) et **mode présentation**.
- **Mode sombre soigné** : fonds bleu-gris (jamais noir pur) ; **couleurs de statut désaturées** (rouge, ambre, vert, orange, bleu : plus douces, moins fatigantes, mêmes sens) ; **relief par filets clairs** au lieu d'ombres noires (seuls menus et fenêtres gardent une ombre, plus un filet) ; barres de défilement teintées selon le thème (elles étaient grises claires en sombre). Contrastes ≥ 4,5:1 revérifiés.
- **Densité** : *Confortable* (défaut) ou *Compacte* (mémorisée sur le poste). La compacte réduit : hauteur de ligne de la liste (52 → 40 px) et marges des cellules, marge autour du contenu (20/28 → 12/20 px), cadres et écarts de la fiche synthèse. Les textes ne changent pas de taille.
- **Mode présentation** (réunion, vidéoprojecteur) : **contraste maximal** (encres noir pur sur clair / blanc pur sur sombre), **filets francs** autour des cartes, statuts plus profonds (clair) ou plus lumineux (sombre), **textes agrandis de 15 %**. Une pastille « Mode présentation · Quitter (Échap) » reste en bas à droite. Propre à l'onglet (on n'y reste pas après fermeture / rechargement du navigateur), combinable avec tous les thèmes, clair ou sombre. Les exports Excel et rapports gardent leur charte normale.
- **Contrôle** : `npm run check:contrast` couvre maintenant aussi le mode présentation (1 087 contrôles, 0 échec).
- Fichiers : theme.js, App.js, ThemePicker.js, TableView.js, ManagerFiche.js, exportExcel.js, styles.css, scripts/check-contrast.mjs. Aucune donnée modifiée. Retour arrière : `git revert <commit v141>`.

## v142 — Gantt et Calendrier plus lisibles + cloche sur « Modifications »

- **🔔 sur l'icône « Modifications »** (barre latérale) : tant qu'une mise à jour (nouvel import) n'a pas été vue, une petite cloche apparaît sur l'icône, en plus de la pastille rouge avec le nombre de nouvelles versions. Elle disparaît dès que les modifications sont consultées.
- **Gantt**
  - **Couleurs de phases bien distinctes** : Arrivée = violet, Tests = ambre, Fin prod = vert, Départ = rouge (l'Arrivée n'est plus de la couleur principale du thème, trop proche des encres). Lettres des pastilles plus foncées donc lisibles.
  - **Barre arrivée → départ en dégradé continu de la dérive vs planning initial** : vert (en avance) → bleu-gris (au plan) → ambre → braise → rouge (jusqu'à +45 j) ; gris neutre si le PJ n'a pas de planning initial. Légende du dégradé sous le tableau.
  - **Barres qui se déploient** de gauche à droite à l'affichage (0,7 s, léger décalage d'une ligne à l'autre ; coupé si « réduire les animations »).
  - **Repère « Aujourd'hui » net** : trait plein (plus de transparence) + pastille rouge datée posée sur le bord de l'en-tête.
  - **Infobulle propre** au survol d'une ligne : PJ et projet, les 4 dates (plage des tests), écart vs planning initial et date de départ initiale ; elle suit la souris et reste dans l'écran. Remplace les bulles du navigateur.
- **Calendrier**
  - **Palette des étapes plus tranchée** (violet Arrivée · bleu Production · ambre Tests · vert Fin prod · corail Départ), en clair et en sombre, contrastes ≥ 4,5:1 vérifiés (`npm run check:contrast`).
  - **Colonne « aujourd'hui »** : en-tête rouge, filets rouges de chaque côté, fond légèrement teinté (au lieu du bleu du thème).
  - **Même infobulle propre** que le Gantt : PJ, période (semaine ou jour), étapes concernées, présence aux tests, écart vs planning initial.
- Fichiers : GanttView.js, CalendarView.js, ChangesNotice.js, App.js. Aucune donnée modifiée. Retour arrière : `git revert <commit v142>`.


## v142.1 — Trois thèmes seulement : Marine, Forêt, Cuivre

- Les thèmes **Bleu nuit** et **Ardoise** sont retirés (le menu « Affichage » n'en propose plus que trois, chacun en clair et en sombre). Un poste qui avait choisi l'un des deux retombe automatiquement sur **Marine** (défaut) ; aucune donnée touchée.
- Contrôle de contraste relancé : 663 vérifications, 0 échec.
- Fichiers : theme.js, App.js (commentaire, numéro de version). Retour arrière : `git revert <commit v142.1>`.

## v143 — Rôle super admin + couleurs des étapes alignées sur la charte

- **Trois niveaux d'accès** (src/roles.js, rôle posé par App à chaque rendu) :
  - **Super admin** = les adresses de `OWNER_EMAILS` (App.js : `gabriel.vincent@enogia.com`) : **voit toutes les tuiles** (dont l'onglet Réglages), entre toujours dans l'espace Manager sans PIN, **peut tout supprimer** et **changer le site**. Une pastille « Super admin » apparaît dans le menu du compte (en haut à droite).
  - **Admin** (adresse listée dans « Accès Manager », ou code PIN) : **utilise** le site : consulte, ajoute et modifie (commentaires, avancement, statut, causes de retard, notes de la fiche…). **Il ne supprime plus rien et n'a plus l'onglet Réglages** (Accès Manager, N° de série, Production, Vacances) ni les boutons d'import / d'ajout du planning initial. Pastille « Admin ».
  - Les autres comptes : lecture et commentaires, sans espace Manager (inchangé).
- **Suppressions réservées au super admin** : commentaires (liste, tableau Kanban, fiche), causes de retard et leurs commentaires, causes de la liste, puces d'actions / mitigations, jalons de paiement, composants. Les boutons disparaissent pour les admins, et les trois fonctions de suppression refusent aussi l'appel (message « réservée au super admin »). Le super admin garde la confirmation par code PIN pour éviter les fausses manœuvres. Non concerné : l'import du planning courant et les vues enregistrées personnelles.
- **Important** : c'est une protection de l'interface. Pour qu'elle soit **garantie côté base**, il faut aussi des règles Firestore qui refusent les suppressions aux autres comptes (à faire dans la console Firebase, hors de ce dépôt).
- **Couleurs des étapes** (Calendrier + Gantt) alignées sur la charte : elles se déduisent maintenant du thème actif (Marine, Forêt, Cuivre, clair / sombre / présentation) : Arrivée = accent du thème, Production = teinte légère de la couleur principale, Tests = ambre, Fin prod = vert, **Départ = couleur principale pleine** (le rouge reste réservé au retard). Fin de la palette « arc-en-ciel » de la V142. Contrastes ≥ 4,5:1 vérifiés (`npm run check:contrast` : 713 contrôles, 0 échec).
- Fichiers : roles.js (nouveau), theme.js, App.js, SharedUI.js, ManagerPanel.js, ManagerFiche.js, ManagerParts.js, ProjectModal.js, CommentsView.js, CommentsKanban.js, CalendarView.js, GanttView.js, scripts/check-contrast.mjs. Aucune donnée modifiée. Retour arrière : `git revert <commit v143>`.

## v144 — Couleurs d'étapes et d'états plus douces (pastel)

- **Retour à des tons doux** : l'ambre et le vert « émeraude » reprennent leurs valeurs d'avant la V139.1 (ambre `#C1831E`, émeraude `#2B9C78`) ; les autres teintes vives de la V139.1 (accents des thèmes) sont conservées.
- **Étapes Arrivée / Tests / Fin prod / Départ en pastel partout** : aplat très clair + liseré doux + texte foncé (au lieu de disques et de jours pleins en blanc sur couleur vive). Concerne la **fiche** (4 tuiles de dates, mini-calendrier, légende), le **Gantt** (marqueurs A/T/F/D et légende) et le **Calendrier** (Tests et Fin prod ne sont plus en gras sur aplat soutenu ; le Départ reste la teinte la plus marquée, mais claire).
- **Points et camemberts d'état** (Expédiée, Production ENOGIA, etc.) : teintes éclaircies de 20 % en mode clair ; les pastilles d'état de la liste restent inchangées (déjà pastel).
- Nouvelle fonction `stageSoft()` (theme.js) : une seule source pour les couleurs douces des étapes, déduite du thème actif (Marine, Forêt, Cuivre ; clair, sombre, présentation).
- Contrôle de contraste relancé : 809 vérifications, 0 échec (texte des étapes sur leur fond ≥ 4,5:1 dans tous les thèmes).
- Fichiers : theme.js, pjMeta.js, GanttView.js, ProjectModal.js, App.js (numéro de version), scripts/check-contrast.mjs. Aucune donnée modifiée. Retour arrière : `git revert <commit v144>`.

## v144.1 — Étapes : une teinte pastel distincte par étape (Calendrier surtout)

- **Calendrier** : les tuiles ne dérivent plus de la couleur du thème (elles tiraient vers le gris-bleu et ne se distinguaient plus). Chaque étape a maintenant sa **propre teinte pastel** : Arrivée = lavande, Production = bleu ciel, Tests = beurre, Fin prod = menthe, Départ = pêche ; texte foncé de la même famille (en sombre : fond sombre teinté + texte clair). Légende avec un fin liseré pour que les pastilles restent visibles.
- **Colonne « aujourd'hui »** : en-tête rose pâle avec texte rouge foncé (au lieu d'un aplat rouge plein avec texte blanc) ; le liseré rouge de la colonne reste.
- **Gantt et fiche** : mêmes teintes que le Calendrier (une seule source : `stageSoft()` dans theme.js).
- Contrôle de contraste : 833 vérifications, 0 échec.
- Fichiers : theme.js, CalendarView.js, DEPLOIEMENT.md. Retour arrière : `git revert <commit v144.1>`.

## v144.2 — Calendrier : teintes poudrées d'après les palettes Pantone

- Les cinq étapes reprennent des teintes **poudrées, peu saturées**, tirées des deux palettes Pantone fournies : Arrivée = lavande grisée, Production = bleu glacier, Tests = beurre, Fin prod = vert sauge, Départ = pêche rosée. Texte foncé de la même famille ; en mode sombre, fond sombre teinté et texte clair. Même source (`stageSoft()`) pour le Calendrier, le Gantt et la fiche.
- Pastilles de présence des tests (Client / NOBO / Client + NOBO) adoucies dans le même esprit.
- Contrôle de contraste : 833 vérifications, 0 échec.
- Fichiers : theme.js, pjMeta.js. Retour arrière : `git revert <commit v144.2/v145>`.

## v145 — Import quotidien sans risque

- **Copie automatique avant chaque import** : avant d'écraser le planning courant, le site en garde une copie (documents Firestore `backup_<date>` + un index `importIndex`). Les **14 dernières copies** sont conservées, les plus anciennes sont supprimées.
- **Réglages › Imports** (super admin uniquement) : tableau des copies (date du planning, indice, nombre d'unités, date de copie, cause, auteur) et bouton **« Restaurer cette version »** (avec confirmation). La restauration **copie d'abord le planning actuel** : elle se défait elle-même. Les saisies faites sur le site (commentaires, statuts, retards, avancement…) ne sont jamais touchées.
- La restauration est inscrite dans « Modifications » (source « Restauration »).
- **Si la copie ne peut pas être écrite** (par exemple règles Firestore qui refusent les nouveaux documents `backup_*` / `importIndex`), le site demande une confirmation avant d'importer, au lieu de bloquer l'import quotidien. **À vérifier une fois en beta** : lancer un import puis ouvrir Réglages › Imports. Si la liste reste vide, ajouter aux règles Firestore l'écriture sur ces deux documents.
- 5 tests automatiques de la logique de copie / rotation / restauration (`npm test`) ; l'écriture réelle dans Firestore n'a pas pu être testée hors du site.
- Fichiers : importBackups.js (nouveau), importBackups.test.js (nouveau), components/ImportHistory.js (nouveau), ManagerPanel.js, App.js, ChangesNotice.js, ChangesView.js. Retour arrière : `git revert <commit v144.2/v145>` (les copies déjà créées restent dans Firestore, sans effet).

## v146 — Cash in dans le Manager, fin du clavier PIN, palette Pantone B

- **Palette B (Pantone 2 adoucie)** pour les étapes du Calendrier, du Gantt et de la fiche : Quiet Violet (Arrivée), Baltic Sea (Production), Golden Mist (Tests), Veiled Vista (Fin prod), Raindrops on Roses (Départ), éclaircies en mode clair, mélangées au fond en mode sombre. Contrôle de contraste : 833 vérifications, 0 échec.
- **Plus de clavier PIN** à l'entrée de l'espace Manager. L'accès se fait uniquement par adresse : liste « Accès Manager » (comparaison insensible à la casse) + super admin. Les autres comptes voient un écran « Espace Manager réservé ». Un compte retiré de la liste perd l'accès. Le bouton « Verrouiller » disparaît. Le code PIN ne sert plus qu'à confirmer certaines suppressions (inchangé).
- **Onglet Manager › Cash in** (super admin uniquement) : votre page « Cash in PJ » reprise **à l'identique** (jalons, alertes à traiter, cash par mois, écarts, projets, glisser-déposer, colonnes masquables, export Excel, annulation, causes de retard, responsables). Elle s'affiche dans un cadre (`public/cashin.html`) ; le site fait le pont avec Firestore (`src/components/CashInTab.js`, `src/cashinData.js`).
  - Données : document Firestore **`planning/cashin`** (en bêta : `planning/beta_cashin`), même forme que dans l'artefact : `{ rows, labels, totals, owners, updatedAt }` (+ `updatedBy`). Le bouton « copier la production vers la bêta » copie aussi ce document.
  - Couleurs : les statuts reprennent celles du Calendrier (Payé = Fin prod, Facture émise = Production, À facturer = Arrivée, Relancé = Tests ; En retard reste rouge), selon le thème (Marine / Forêt / Cuivre, clair / sombre). Les polices et la mise en page de la page restent celles de l'artefact.
  - **Reprise de vos données (une seule fois)** : Manager › Cash in › « Reprendre un fichier… » → choisir `cashin-reprise.json` (envoyé à part, hors du dépôt : ce sont vos chiffres). Le site refuse un fichier invalide et demande confirmation avant de remplacer des données existantes. « Sauvegarde JSON » télécharge l'état actuel.
  - Votre artefact reste en place, sans modification, tant que vous n'avez pas validé la bêta.
  - Vos préférences d'affichage (colonnes masquées, mode compact, délai d'alerte) sont mémorisées par navigateur : elles repartent de zéro sur le site, une seule fois.
- **À faire dans la console Firebase (règles Firestore)** : autoriser lecture et écriture de `planning/cashin` et `planning/beta_cashin` **uniquement à votre adresse**. Si vos règles actuelles autorisent déjà tout `planning/{doc}` aux comptes connectés, il faut **exclure** ces deux documents de cette règle (les règles Firestore s'additionnent : une règle plus stricte ne suffit pas). Exemple à adapter :
  ```
  match /planning/{docId} {
    allow read, write: if request.auth != null && docId != 'cashin' && docId != 'beta_cashin';
  }
  match /planning/{docId} {
    allow read, write: if request.auth != null
      && request.auth.token.email.lower() == 'gabriel.vincent@enogia.com'
      && (docId == 'cashin' || docId == 'beta_cashin');
  }
  ```
  Tant que ces règles manquent, l'onglet affiche un bandeau « Lecture / Écriture refusée par les règles Firestore » : rien n'est perdu. Même remarque pour la sauvegarde d'import de la v145 (`backup_*`, `importIndex`).
- **Vérification en bêta** : 1) Manager › Cash in ; 2) « Reprendre un fichier… » avec `cashin-reprise.json` ; 3) comparer les 4 chiffres du haut avec l'artefact (Encaissé, Facturé en attente, À facturer sous 30 jours, Reste à encaisser) ; 4) modifier une date, recharger la page, vérifier qu'elle est conservée ; 5) tester « Exporter en Excel ».
- Tests : `npm test` (validation du fichier de reprise, lisibilité des couleurs dans les 3 thèmes × clair / sombre). Banc d'essai local avec vos 114 jalons dans un Firestore simulé : lecture, ajout, refus d'écriture, reprise. L'écriture réelle dans Firebase n'a pas pu être testée hors du site.
- Fichiers : public/cashin.html (nouveau), src/components/CashInTab.js (nouveau), src/cashinData.js (nouveau), src/cashinData.test.js (nouveau), theme.js, App.js, ManagerPanel.js, SharedUI.js (écran d'accès + icône €). Retour arrière : `git revert <commit v146>` (le document Firestore `cashin` reste, sans effet).

## v146.1 — Cash in relié aux jalons de paiement, avec rouge et orange doux

**Réservé au super admin** (les données de Cash in restent privées) : pour les autres comptes, les jalons de paiement saisis dans la fiche restent la référence.

- **Fiche projet › Achats et finance › Jalons de paiement** : si le PJ figure dans Cash in, les jalons viennent de Cash in (lecture seule) avec statut coloré, % du total, montant réel, dates de facture et d'encaissement, retard en jours. Bouton **Ouvrir dans Cash in** (ouvre l'onglet sur ce PJ).
- **Synthèse de tête** : nouvelle tuile « Prochain paiement » (rouge si retard, orange si échéance ≤ 15 j, vert si tout est soldé).
- **Avancement paiements, CODIR (synthèse + fiche PJ) et PowerPoint CDP** : pondérés par le montant réel ; retards en rouge, échéances proches en orange ; les lignes EPC sont exclues.
- **Couleurs** (même grain pastel que la palette B) : payé = vert Fin prod, facture émise = bleu Production, à facturer = lilas Arrivée, **à surveiller = orange doux** (à facturer depuis plus d'un jour ou échéance ≤ 15 j), **en retard = rouge doux**, à venir/EPC = gris. Contrastes vérifiés (1049 contrôles, 0 échec) ; la page Cash in reprend les mêmes teintes.
- **Rapprochement PJ** : même numéro, ou numéro suivi d'un suffixe (PJ405 ↔ PJ405-Y34, PJ461 ↔ PJ461 Etude) ; PJ46 ne reprend pas PJ460.
- Aucune nouvelle règle Firestore (lecture du document `cashin` déjà prévu en v146).

À vérifier en bêta : ouvrir la fiche d'un PJ présent dans Cash in (jalons colorés), un PJ absent (jalons manuels inchangés), un compte admin non super (aucun jalon Cash in), puis le rapport CODIR.

## v146.2 — Couleurs Liste = Calendrier, liaisons Cash in ↔ ordo choisies à la main, répartition ÷ X

- **Couleurs** : la Liste (pastilles de dates Arrivée / Tests / Fin prod / Départ, pastilles d'état, repères dans les en-têtes) reprend exactement les teintes du Calendrier et de la fiche (palette B). Départ proche (≤ 15 j) en orange doux, expédié en vert. **Gantt inchangé.**
- **Lier un PJ du Cash in à un PJ de l'ordo** (super admin) :
  - Onglet **Cash in › Liaisons avec l'ordo** : liste de tous les PJ du Cash in avec leur rattachement ; **Modifier** → cocher un ou plusieurs PJ de l'ordo. Les PJ sans correspondance sont en orange.
  - **Fiche projet › Jalons de paiement** : **Lier à un PJ du Cash in** (ou **Modifier la liaison**) → un clic « Lier à PJxxxx / Délier ».
  - **Répartition ÷ X** : un PJ du Cash in coché sur X PJ de l'ordo est divisé à parts égales ; chaque fiche reçoit 1/X des montants (les % ne changent pas), et l'en-tête indique « réparti sur X PJ ». Fiche, avancement, CODIR et PowerPoint CDP utilisent ces montants.
  - Sans choix de votre part, le rapprochement par numéro reste automatique (le numéro exact l'emporte : PJ405 ↔ PJ405, PJ405-Y34 ↔ PJ405-Y34 s'il existe dans l'ordo). « Remettre en automatique » annule un choix.
- **Données** : nouveau document `planning/cashinLinks` (en bêta `planning/beta_cashinLinks`) : `{ links: { "PJ405-Y34": ["PJ405", "PJ406"] }, updatedBy, updatedAt }`. Document séparé car la page Cash in réécrit `cashin` en entier.
- **À faire dans la console Firebase (règles)** : ajouter `cashinLinks` / `beta_cashinLinks` à la règle réservée à votre adresse, comme `cashin` :
  ```
  docId != 'cashin' && docId != 'beta_cashin' && docId != 'cashinLinks' && docId != 'beta_cashinLinks'   // règle générale
  (docId == 'cashin' || docId == 'beta_cashin' || docId == 'cashinLinks' || docId == 'beta_cashinLinks')  // règle réservée
  ```
  Tant que ce n'est pas fait, la boîte de liaison affiche « Écriture refusée par les règles Firestore » : rien n'est perdu, le rapprochement automatique continue de fonctionner.

## v146.3 — Liste sans couleurs d'étape, Arrivée / Départ mieux distincts

- **Liste** : retour aux dates neutres (les pastilles de couleur de la v146.2 sont retirées).
- **Arrivée** passe au **bleu-gris**, **Départ** au **rose soutenu** (Calendrier, fiche, rapports CODIR / CDP, statuts Cash in). Le lilas et le rose pâle se ressemblaient trop.
- **Gantt** : ses teintes restent exactement celles de la v146 (il garde sa propre palette, `ganttSoft()` dans theme.js).
- Contrastes vérifiés (1035 contrôles, 0 échec).

## v146.4 — Liste : statuts sans couleur

La colonne **État** de la Liste redevient neutre (pastille grise, point gris, sans clignotement pour « Non commandée »). Les autres vues (fiche, Gantt, Calendrier, filtres) gardent leurs teintes.

## v146.5 — Colonne « État » : couleurs d'avant

La colonne État de la Liste (et les pastilles d'état partout ailleurs) retrouve exactement ses couleurs d'avant la v146.2 : vert Expédiée, bleu Production ENOGIA, sable Fabrication FNR, violet Non désignée, turquoise Slot libre, rouge Non commandée, gris Stockage externe. Les dates de la Liste restent neutres (v146.3).

## v146.6 — Icône du site aux couleurs d'ENOGIA

Le carré « ORC » est remplacé par le **signe ENOGIA** (les deux feuilles du logo, en blanc) sur un carré arrondi bleu-vert dégradé. Fichiers : `public/icon.svg` (onglet du navigateur, net à toute taille), `favicon.ico` (16/32/48), `logo192.png` et `logo512.png` (écran d'accueil mobile / raccourci), `manifest.json` (nom « Planning Ordonnancement ENOGIA 2026 »). Le navigateur garde parfois l'ancienne icône en cache : actualiser avec Ctrl + F5, ou fermer et rouvrir l'onglet.

## v146.7 — Message « Le planning a été mis à jour » : impossible à rater

- **En direct** : dès qu'un import (ou une publication / restauration) est enregistré, le message s'affiche chez toutes les personnes connectées, sans actualiser.
- **Ctrl + R ne le fait plus disparaître** : il revient à chaque chargement de la page tant que la personne n'a pas cliqué sur « Voir les modifications » ou « J'ai pris connaissance ». « Plus tard » ne le masque que jusqu'à la prochaine actualisation.
- **Onglet du navigateur** : « ● (1) Planning Ordonnancement ENOGIA 2026 » tant qu'il y a des modifications non lues.
- La personne qui lance l'import ne reçoit pas son propre message.
- Le « lu / non lu » reste mémorisé par personne et par poste (comme avant).

## v146.8 — Repères « modifié », écran atelier, touche T, vue mémorisée

- **Repères Liste / Calendrier** : après un import, les PJ touchés portent une pastille (« nouveau », « +3 j », « −2 j », « modifié »), visible 14 jours ou jusqu'à « Tout marquer comme vu ». Bouton **Modifiés (N)** dans la Liste pour ne garder que ces PJ. Mémorisé par personne et par poste (`enogia_changesMarks_<user>`). Le Gantt n'est pas touché.
- **Écran atelier** (icône écran dans la barre de gauche, ou adresse `…/?ecran=1`) : diaporama plein écran pour une TV, 4 écrans qui tournent toutes les 20 s (Cette semaine, Départs 30 jours, Retards, Dernière mise à jour). Échap pour fermer, ← → pour changer, Espace pour pause.
- **Touche T** : recentre le Gantt ou le Calendrier sur aujourd'hui (sans effet dans un champ de saisie).
- **Dernière vue mémorisée** par poste (Liste, Gantt, Calendrier, Modifications, Commentaires) : `enogia_view`.
- **PJXXX** (estimations) : jamais affichés dans « Modifications du planning », ni dans les listes de PJ retirés, ni dans le message de mise à jour.
- Aucune règle Firestore à ajouter.

## v146.9 — Pop-up « Nouveautés » à la connexion

- Après un déploiement, chaque personne voit **une seule fois** (par poste) une fenêtre qui résume les améliorations. « C'est compris », Entrée, Échap ou un clic à côté la ferme définitivement. Si une personne a raté plusieurs déploiements, elle voit les 3 plus récents.
- Elle passe **avant** le message « Le planning a été mis à jour » (qui s'affiche juste après). Pas affichée en mode écran atelier.
- **À chaque mise en production** : ajouter une entrée **en tête** de `RELEASES` dans `src/releaseNotes.js` (`id` unique jamais réutilisé, `date`, `title`, `items` avec `t` = titre court et `d` = une phrase). `admin: true` sur un item le réserve au super admin (ex. Cash in). Sans nouvelle entrée, rien ne s'affiche.
- Texte de départ déjà rédigé pour la v146 (repères, alerte en direct, écran atelier, touche T, couleurs, icône, Cash in pour l'admin). Fichiers : `src/releaseNotes.js`, `src/components/ReleaseNotes.js`.
- Pour le revoir en test : supprimer la clé `enogia_releaseSeen_<email>` dans le localStorage du navigateur.

## v146.10 — Étapes de production, frise « i », couleurs plus contrastées, éditeur du pop-up

- **Nouveaux états** : « Production ENOGIA » est remplacée par **Montage → Élec → Tests → Packaging** (puis Expédiée). Les PJ qui étaient en « Production ENOGIA » sont reclassés à l'affichage selon leur ancien avancement (< 40 % Montage, < 80 % Élec, < 90 % Tests, sinon Packaging), sans rien écrire dans la base ; ils gardent leur % tant qu'aucune case n'est cochée. Les vues enregistrées contenant l'ancien état sont converties.
- **Avancement automatique** (Manager › Suivi › Avancement) : Montage 0–40 % (lubrification, refroidissement, **test de pression**), Élec 40–80 % (tirage de câbles, câblage), Tests 80–90 % (« Tests réalisés »), Packaging 90–95 % (RAI, mise des carters, emballage), Expédiée 100 %. Pourcentage = début de l'étape + cases cochées / total. Pour les autres états (Non commandée, FNR, stockage…) l'avancement reste saisi à la main.
- **Test de pression obligatoire** : sans lui, impossible de passer à Élec / Tests / Packaging (ni d'expédier depuis une étape), que ce soit par le bouton « Passer à… » ou par le sélecteur d'état (Statut & état). Les PJ déjà en Élec ou au-delà ne sont pas bloqués.
- Les cases cochées sont dans `planning/overrides` (champ `prodSteps`, avec la date de chaque case) : aucune nouvelle règle Firestore.
- **Bouton « i »** à côté des filtres d'état (Liste, Gantt, Calendrier, Manager) : frise des 5 étapes avec leurs cases.
- **Couleurs** : fonds, liserés et textes des états et des étapes du Calendrier / fiches / rapports un cran plus soutenus. **Le Gantt garde ses teintes** (palette désormais figée à part). Contrastes vérifiés (1055 contrôles, 0 échec).
- **Pop-up Nouveautés rédigé dans l'appli** : Manager › Réglages › **Nouveautés** (super admin). On coche les lignes à afficher, on les reformule, on en ajoute ; « Aperçu », « Enregistrer » (corrige sans réafficher) ou « Publier et réafficher à tous ». Le réglage est propre à chaque site (test / production : publier depuis la production pour qu'il y apparaisse). Les entrées de `src/releaseNotes.js` restent affichées si rien n'est publié depuis l'appli.

## v146.11 — États simplifiés, écran atelier refait, menus allégés, dates client / NOBO

- **Plus de cases à cocher ni d'onglet « Avancement »** (Manager › Suivi) : on ne garde que **Statut & état**. L'avancement de production se déduit de l'état : Montage 20 %, Élec 60 %, Tests 85 %, Packaging 93 %, Expédiée 100 % (milieu de chaque plage ; modifiable dans `src/prodStages.js`). Les autres états gardent l'avancement déjà saisi. Plus de règle « test de pression obligatoire » : les éléments entre parenthèses (lub, cooling, test de pression…) ne sont qu'une information dans la frise « i ». Le champ `prodSteps` écrit par la v146.10 n'est plus lu (inoffensif).
- **Frise « i »** : s'ouvre au premier plan (elle passait sous l'en-tête du tableau), plus de phrase en bas, textes qui ne dépassent plus des cadres.
- **Liste des états** : le menu déroulant est blanc ; seule la pastille de l'état choisi est colorée.
- **Écran atelier** (une page toutes les **15 s**) : Cette semaine · **Ce mois-ci** (même forme, une colonne par semaine ; pages de 9 PJ) · **Semaines suivantes** (4 semaines : dates d'arrivée, de tests et de départ) · **Chiffres clés depuis le 19/05** (machines expédiées, types de machines, pays, machines en cours, répartition par type / pays / mois). Les retards et la dernière mise à jour du planning ne sont plus affichés. Les PJXXX sont exclus des deux dernières pages. « Fabriquée » = état Expédiée avec une date de départ entre le 19/05 et aujourd'hui.
- **Rail de gauche allégé** : le mode sombre rejoint le bouton palette (section « Mode »). **Bouton Manager** en haut à droite (nouvelle icône, avec son libellé).
- **Donuts** (répartition au-dessus de la liste) : légende et nombre côte à côte.
- **Calendrier** : plus de vert ni de rouge — **Fin prod en violet, Départ en orange** (Production bleu, Arrivée gris-bleu, Tests jaune inchangés). Le Gantt et les statuts de paiement du Cash in (Payé = vert) ne changent pas.
- **Superposition corrigée** (Calendrier) : la pastille « modifié / +N j » ne recouvre plus le N° de série (elle est sur la 2e ligne ; le N° de série se tronque proprement).
- **Dates client / NOBO** (Statut & état) : une date pour le client et une date pour NOBO, chacune dans la période de tests ; affichées dans le Calendrier, les fiches, la liste et les rapports (« C 21/10 · N 23/10 »). Les anciennes saisies (une seule date) restent valables.
- **Pop-up Nouveautés** redessiné (bandeau, icônes, lignes aérées) et texte mis à jour.

## v146.12 — Tri dans les en-têtes, fiches complétées, statuts à risque encadrés, Cash in pour les admins

- **Liste** : le tri se fait depuis la flèche de chaque colonne (croissant / décroissant ; Départ propose aussi « les plus en retard d'abord (dérive) », Tests = ordre de passage au banc ; Avancement : petite flèche cliquable). Retirés : menu « Tri », bouton « En dérive seulement », menu « Vues ».
- **Écran atelier** : gamme de chaque machine en grand (pastille à la couleur de la gamme) ; page 2 = les **4 semaines à partir de la semaine actuelle** (S, S+1, S+2, S+3), de même que la page « Arrivées, tests et départs ».
- **Calendrier / Gantt, colonne Machine** : ligne 1 = code PJ + gamme (jamais tronqués) ; ligne 2 = N° de série (jamais tronqué) + drapeau + nom du projet (seul élément abrégé).
- **Bouton Manager** : simple icône (infobulle « Espace Manager »).
- **Mode sombre** : fonds des états et des étapes plus soutenus (≥ 1,5:1 / ≥ 1,9:1 par rapport à la carte) ; `npm run check:contrast` contrôle désormais aussi cet écart (1145 vérifications).
- **Actions de la semaine** : **échéance obligatoire** (champ date à côté du texte ; les anciennes actions sans date sont signalées en rouge) ; « en retard » en rouge ; reprise dans les rapports CODIR et PowerPoint chef de projet.
- **Major components** : le nom d'un composant se modifie directement (en plus de l'ajout et du retrait) ; réservé aux comptes admin, comme le reste de la fiche.
- **Statut « À risque » (rouge)** : une fenêtre demande un **commentaire** (obligatoire) ; pour le **Planning**, un **plan de mitigation** associé aussi (sauf s'il en existe déjà un ouvert). Tout est enregistré en une seule écriture. Vaut dans la fiche synthèse et dans Manager › Santé projets. Un feu déjà rouge sans commentaire / plan est signalé en rouge dans la fiche.
- **Cash in visible pour les admins** : le super admin publie automatiquement (2 s après un changement, uniquement si le contenu a changé) une **copie réduite** dans le document `planning/cashinShared` (bêta : `planning/beta_cashinShared`) : seulement les PJ du Cash in rattachés à un PJ de l'ordo, avec jalons, libellés, totaux et liaisons. Les admins la lisent (lecture seule) dans les fiches et les rapports ; le document complet `cashin` reste réservé au super admin.
  - **Règles Firestore** : la règle générale `planning/{docId}` (hors `cashin`, `beta_cashin`, `cashinLinks`) autorise déjà ce document à tout compte connecté ; l'accès est donc limité aux admins **dans l'appli seulement**. Pour une vraie restriction côté base, ajouter une règle limitant `cashinShared` / `beta_cashinShared` à la lecture par les comptes admin et à l'écriture par votre adresse seule.
  - Pour que les admins voient le Cash in, **ouvrir le site une fois avec votre compte** après le déploiement (c'est lui qui publie la copie).
- **Export PowerPoint (fiches projet)** : les zones de commentaire (commentaire général, feux, indicateurs, contrat, actions, mitigations, fil de commentaires) sont dimensionnées sur le texte réel ; au-delà du plafond de lignes, le texte est abrégé par « … » (le texte complet reste dans la fiche). Vérifié par rendu PDF.
- Fichiers : SharedUI.js, TableView.js, WorkshopScreen.js, pjMeta.js, theme.js, App.js, cashinData.js, Feux.js, ManagerFiche.js, CdpReport.js, CodirReport.js, reports/cdpPptx.js, releaseNotes.js, scripts/check-contrast.mjs.

## v146.13 — Calendrier bicolore, écran atelier remanié, rapports sur le gabarit ENOGIA

- **Tri (Liste)** : libellés renommés pour la colonne Tests (« Du plus ancien au plus récent » / « Du plus récent au plus ancien » / « Prochain passage au banc d'abord »), cohérents avec l'ordre réellement appliqué.
- **Calendrier / mode présentation** : si une semaine contient plusieurs étapes, la tuile est partagée **en diagonale** aux couleurs de chaque étape (`stageFill`, CalendarView.js). Colonne Machine : 3 lignes (PJ + gamme + marque / drapeau + **nom complet** / N° de série), largeur calculée sur le texte ; hauteur de ligne 58 px (Calendrier et Gantt).
- **Écran atelier** : page « Semaine » (toutes les lignes), page « 4 semaines » (toutes les machines qui arrivent, sur une page), page « Arrivées, tests et départs » en **calendrier** (4 semaines × 7 jours), page **chiffres clés** = depuis le 19/05 + **le mois prochain** (machines à construire, par gamme ; arrivées ; départs), sans information chef de projet.
- **Bouton Manager** : icône discrète (cadenas + roue crantée), sans cadre.
- **Rapport PowerPoint chef de projet** : refait sur `Template_slide.pptx` — page de garde (fond forêt, vague, logo, pastilles), bandeau photo + plume + titre blanc sur chaque diapositive, tableaux en-tête 004659 / lignes alternées E6F3F2, numéro de page en bas à droite, **diapositive de contact** en fin. Polices du gabarit : titres **Abel**, texte **Aptos Narrow** (à défaut sur le poste, PowerPoint les remplace ; installer ces polices pour un rendu identique). Les images sont dans `public/report/` (chargées à la demande par `reports/reportAssets.js` ; une image absente est simplement omise).
- **Rapport CODIR (PDF)** : même gabarit (bandeau, page de garde, tableau, page de contact finale) ; police Roboto conservée. La page de contact suit la case « Page de garde ». Coordonnées : Gabriel VINCENT (signature), adresse 43 avenue de Boisbaudran.
- Fichiers : SharedUI.js, TableView.js, CalendarView.js, GanttView.js, WorkshopScreen.js, pjMeta.js, App.js, CdpReport.js, CodirReport.js, reports/cdpPptx.js, reports/reportAssets.js, public/report/*, releaseNotes.js.

## v146.14 — Jalons par machine, causes de retard créables, rapports dans la fiche projet

- **Cash in : jalon par jalon** — pour un PJ du Cash in réparti sur plusieurs PJ de l'ordo (contrat général + machines), la fenêtre « Liaisons » (bouton Modifier) affiche un bloc **Jalon par jalon** : on coche les PJ concernés par chaque jalon. Tout coché = jalon **global** (suit la liaison du PJ du Cash in) ; sinon il est **réservé** aux PJ cochés (montant ÷ nombre de PJ cochés). Stockage : mêmes documents `cashinLinks` / `cashinShared`, clés `"row:<id du jalon>"` — aucune règle Firestore à changer. Sans jalon réservé, le calcul est celui d'avant (total ÷ n). Tests : `cashinRows.test.js`.
- **Retards** : dans la fiche projet (Manager), le sélecteur de cause propose **« ＋ Nouvelle cause… »** (écrit dans `delayTypes`, comme l'onglet Retards).
- **Major components** : la 3e colonne s'appelle **Réceptionné** (pièce reçue à ENOGIA ou installée).
- **Écran atelier** : légende des couleurs en bas des pages « semaine » et « 4 semaines » ; calendrier : l'étape est écrite en toutes lettres (« Arrivée PJ… ») ; chiffres clés : barres et colonnes mensuelles **colorées par gamme** (+ légende).
- **Bouton Manager** → ouvre toujours Manager › KPI › Synthèse.
- **Rapports** : boutons « Rapport chef de projet » et « Rapport CODIR » déplacés dans l'**en-tête de la fiche projet** (plus dans la barre du Manager) ; le CODIR n'apparaît que pour le super admin ; le rapport s'ouvre pré-réglé sur ce PJ (CODIR) / son chef de projet (PowerPoint).
- **PowerPoint chef de projet** : polices **Abel** (titres) et **Roboto** (texte) ; textes secondaires plus foncés. **CODIR** : roadmap sans texte superposé quand le T0 est ancien ; mêmes gris plus foncés.
- Fichiers : App.js, ManagerFiche.js, ManagerPanel.js, CashLinks.js, cashinLink.js, cashinData.js, pjProgress.js, WorkshopScreen.js, CdpReport.js, CodirReport.js, reports/cdpPptx.js, releaseNotes.js.

## v146.15 — Téléphone / tablette, étapes Montage Méca / Élec, jalons communs, tri par date

- **Responsive** : feuille `styles.css` (classes `enogia-nav`, `enogia-bar`, `enogia-main`…). ≤ 900 px : marges réduites ; ≤ 700 px : le rail d'icônes devient une **barre d'onglets fixe en bas**, l'en-tête se compacte, la synthèse et les fiches s'empilent, le panneau de détail de la Liste s'ouvre sous le tableau (défilement automatique). `index.html` : `viewport-fit=cover`, lien `manifest.json`, balises « application web » iOS/Android ; `manifest.json` : `lang`, `scope`, `purpose`. Installation : Android (Chrome) « Installer l'application », iPhone (Safari) « Sur l'écran d'accueil ». Pas de service worker (pas de mode hors ligne).
- **Application iOS / Android (App Store / Play Store)** : non incluse. Possible plus tard en enveloppant le site avec Capacitor ; coûts : Apple Developer ≈ 99 $/an, Google Play ≈ 25 $ (une fois).
- **Étapes** : « Montage Méca » (lubrification, refroidissement, test de pression, tirage au vide, remplissage*) ; « Montage Élec » (tirage de câbles, **pose de l'armoire**, câblage) ; Tests : essais de la machine + **FAT** ; note * sous la frise. Les identifiants d'état ne changent pas.
- **Tri des dates (Liste)** : « Prochaine date d'abord (à venir) » = dates à venir par ordre croissant, puis dates passées (la plus récente d'abord), puis sans date ; « Date la plus tardive d'abord » ; « Date la plus ancienne d'abord ». Les menus de filtre s'affichent dans `document.body` (ils n'étaient plus recouverts par l'en-tête de la colonne voisine).
- **Causes de retard** : « ＋ Nouvelle cause » aussi dans l'onglet Retards (Manager) et dans l'onglet Retards de la fiche du planning (`NewDelayType`, SharedUI.js).
- **Cash in — jalons communs** : dans « Jalon par jalon », deux modes par jalon : **Réparti** (÷ nombre de PJ liés, comme avant) ou **Commun** (machines cochées ; montant complet sur chacune, jamais divisé, marqué « commun à N machines — ne pas additionner » dans la fiche, le CODIR et le PowerPoint). Les liaisons `row:<id>` déjà enregistrées en v146.14 sont lues comme « Commun » (plus de division).
- **Manager** : le bouton de l'en-tête ouvre toujours Manager › Fiche projet. **Rapports** : boutons « Rapport chef de projet » / « Rapport CODIR » dans une barre au-dessus de la fiche synthèse.
- **Écran atelier** : calendrier « Arrivées, tests, départs » — plus de limite à 4 étapes par jour ; hauteur de ligne proportionnelle au jour le plus chargé, texte à la ligne.
- **PowerPoint CDP** : synthèse avec colonnes Pays et Montant + montant cumulé ; page de garde avec montant cumulé. **CODIR** : roadmap (étiquettes de trimestre, T0 ancien, bords) sans chevauchement ; colonne « Réceptionné » entière.
- Fichiers : App.js, styles.css, public/index.html, public/manifest.json, prodStages.js, pjMeta.js, TableView.js, SharedUI.js, ManagerFiche.js, ManagerParts.js, ProjectModal.js, GanttView.js, DashboardSummary.js, ThemePicker.js, CashLinks.js, cashinLink.js, WorkshopScreen.js, CdpReport.js, CodirReport.js, reports/cdpPptx.js, releaseNotes.js.

## v146.16 — Catalogue des nouveautés : choisir ce qu'on annonce à la production

- **Où** : Manager › Réglages › **Nouveautés** (super admin), bloc « Nouveautés à annoncer » au-dessus de l'éditeur existant. Il liste **toutes les nouveautés depuis la V146.5** (`src/releaseCatalog.js`, à compléter à chaque version : `[titre, phrase, "admin"?]`), regroupées par version, avec « Toutes / Aucune » par version, « Masquer les lignes admin », Aperçu, **Copier le texte** et **Enregistrer la sélection** (mémorisée dans `overrides.releaseSelection` du site courant).
- **Depuis le site bêta** : « Publier vers la production » (avec une confirmation) écrit le pop-up dans le document de la **production** (`planning/overrides`, champ `releaseNotes`, sans préfixe `beta_`). Chaque personne le voit une fois à sa prochaine connexion sur le site de production. Sur la production, le bouton s'appelle « Publier et réafficher à tous ».
- **Règles Firestore** : la bêta écrit dans `planning/overrides` (production). Cette écriture doit être permise à votre compte, comme l'est déjà l'écriture des réglages depuis la production. Si elle est refusée, le message « écriture refusée par les règles Firestore » s'affiche et rien n'est publié.
- **Préparer sans afficher** : « Préparer pour la production (sans pop-up) » écrit le pop-up sur la production avec `off: true` (et la sélection dans `releaseSelection`). Personne ne le voit, et il masque déjà les notes du code : on peut donc déployer la production sans aucun pop-up. Pour l'activer plus tard **depuis la production** : Manager › Réglages › Nouveautés › éditeur « Pop-up Nouveautés à la connexion » → cocher « Afficher ce pop-up aux utilisateurs » → « Publier et réafficher à tous » (ou « Enregistrer »). Ordre conseillé : préparer depuis la bêta **avant** de déployer la production. « Enregistrer la sélection » seul ne fait que mémoriser les coches sur le site courant : rien n'est écrit sur la production.
- **Priorité sur le code** : la publication porte `replaceCode: true` → les notes de `src/releaseNotes.js` datées du même jour ou avant ne sont plus affichées (on n'annonce que ce qui a été coché). Une publication préparée ou désactivée (`off`) masque aussi ces notes, sans rien afficher.
- Fichiers : releaseCatalog.js (nouveau), releaseCatalog.test.js (nouveau), components/ReleaseNotes.js, components/ManagerPanel.js, App.js, releaseNotes.js.

## v146.17 — Écran atelier : jours de production et machines à fabriquer

- **Écran atelier / jours de production** : la page « Cette semaine » ignorait le calendrier de production (elle recevait une liste vide). Elle reçoit maintenant `productionExclusions` (jours désactivés par PJ, Manager › Production) et `closurePeriods` (fermetures, Manager › Vacances) : ces jours ne montrent plus de « Production ». Les pages « 4 semaines » restent hebdomadaires.
- **Écran atelier / dernière page** : « machines à fabriquer » ne compte que les machines dont l'état est Montage Méca, Montage Élec, Tests ou Packaging (`isInProduction`) ; plus les machines non commandées, en attente, stockées ou expédiées.
- Fichiers : App.js, components/WorkshopScreen.js, workshopScreen.test.js (nouveau), releaseNotes.js, releaseCatalog.js, releaseCatalog.test.js.

## v146.18 — Saisie multi-projets, états personnalisés, corrections

- **Pop-up « nouveautés » qui revenait** : (1) dès qu'une publication « catalogue » existe (Réglages › Nouveautés), les notes du code ne s'affichent plus du tout (avant, une note de code plus récente que la publication réapparaissait) ; (2) la date de la dernière nouveauté vue est mémorisée avec son identifiant : si l'identifiant disparaît (publication remplacée), seules les nouveautés plus récentes s'affichent. La mémorisation reste par navigateur et par site (la bêta et la prod ont chacune la leur).
- **Erreur « Unsupported field value: undefined (planning/delays) »** : le retard d'un seul PJ écrivait `groupPjs: undefined`. Corrigé (`null`) et Firestore est initialisé avec `ignoreUndefinedProperties` (firebase.js) pour toutes les écritures. Au passage : `addCommentMulti` avait un `undefined` du même genre.
- **Écran atelier** : un jour « Désactivé » (Manager › Production) ou une fermeture n'affiche plus rien pour la machine, ni dans « Cette semaine » ni dans le calendrier arrivées / tests / départs.
- **Expédiées masquées** : l'état « Expédiée » est décoché de base dans le filtre État (comme « Slot libre »).
- **Import MS Project** : plus de champ ni d'affichage de l'indice ; l'en-tête affiche « Dernier import » avec date et heure. Les anciennes entrées gardent leur indice en base (non affiché).
- **Major components** : cocher « Réceptionné » (ligne ou colonne) coche aussi Design et PO.
- **Saisie sur plusieurs projets** : bouton « ＋ Sur plusieurs projets… » au-dessus de la fiche (`MultiApply.js`) : action (échéance obligatoire), plan de mitigation, commentaire (privé possible), statut global (un « à risque » exige un commentaire, et pour le Planning un plan de mitigation). Une seule écriture Firestore (`savePjMetaMulti`). Les lignes d'un même envoi portent `groupId` / `groupPjs` : badge « × N PJ » ; clôturer ou rouvrir l'une propose de l'appliquer aux autres.
- **États personnalisés** : Manager › Réglages › États (super admin). Enregistrés dans `planning/overrides.customEtats` (`[{id,label,color}]`) ; couleurs claire / sombre calculées avec un texte toujours lisible (≥ 4,5:1). Un état utilisé par un PJ ne peut pas être supprimé ; un état inconnu retombe sur « À définir ».
- Fichiers : App.js, firebase.js, pjMeta.js, SharedUI.js, components/{MultiApply,ManagerFiche,ManagerPanel,ReleaseNotes,WorkshopScreen,ChangesView,ChangesNotice,ImportHistory}.js, reports/cdpPptx.js, releaseNotes.js, releaseCatalog.js + tests.

## v146.19 — Actions / mitigations structurées, retards en lot, création d'état depuis la liste

- **Actions de la semaine** : trois zones (action, état, date) ; état ∈ À faire / En cours / Bloqué / Terminé (`status`). `done` / `doneAt` restent la référence « ouvert / clôturé » des rapports : passer à Terminé clôture, repasser à un autre état rouvre (`statusPatch` dans `pjProgress.js`).
- **Plan de mitigation** : champs `risk` (risque), `measure` (ce qu'on fait pour l'éviter), état, date (obligatoire). `text` = « risque → mesure » (`mitText`) pour que les anciens affichages et rapports continuent de fonctionner ; une ancienne mitigation sans `risk` s'affiche comme risque. Le feu rouge Planning (RedGateDialog) demande les mêmes champs.
- **Saisie multi-projets** : formulaires alignés (action / risque + mesure / état / date), nouvel onglet **Retard** (cause de `delayTypes`, jours, précision → `addDelayAllocationMulti`).
- **États** : l'onglet Réglages › États disparaît. Dans Suivi › Statut & état, la liste déroulante se termine par « ＋ Créer / gérer les états… » (super admin) qui ouvre `EtatsDialog.js` : états existants avec couleurs, états créés (renommer, recolorer, supprimer si inutilisés) et formulaire de création.
- **Pop-up « Nouveautés »** : il s'ouvrait puis se fermait à l'actualisation (beta) car les notes du code s'affichaient avant l'arrivée des réglages Firestore. Le pop-up (et l'avis de modifications) attend maintenant le premier snapshot serveur de `overrides` (`overridesLoaded`).
- Fichiers : App.js, pjProgress.js, components/{ManagerFiche,ManagerPanel,ManagerParts,MultiApply,Feux,EtatsDialog}.js, releaseNotes.js, releaseCatalog.js, tests (multiApply, releaseCatalog).

## v146.20 — Version téléphone plus claire

- Constat sur un viewport iPhone (402 × 874) : en-tête sur 4 lignes (~¼ d'écran), 4 camemberts avant la liste, message « colonnes masquées… volet de droite » et carte « Aucun PJ sélectionné » inutiles, colonne des noms du Gantt / Calendrier qui écrasait la frise.
- Corrections (téléphone ≤ 700 px uniquement ; le bureau ne change pas) : en-tête compact (classes `enogia-bar-right`, `enogia-bar-meta`, `enogia-user-name`, `enogia-import-label`, `enogia-hide-phone` dans `styles.css`) ; « Vue d'ensemble » repliée par défaut si l'utilisateur n'a jamais choisi ; Liste : pas de message de colonnes masquées, Export en icône, volet de droite visible seulement quand un PJ est sélectionné ; Gantt (124 px) et Calendrier (112 px) : colonne des noms étroite, gamme masquée dans le libellé.
- Nouveau `src/useIsPhone.js` (`isPhone()`, `useIsPhone()`).
- Fichiers : App.js, styles.css, pjMeta.js, useIsPhone.js, components/{SharedUI,DashboardSummary,TableView,GanttView,CalendarView}.js, releaseNotes.js, releaseCatalog.js, releaseCatalog.test.js.

## v146.21 — Import réservé aux admins, en-tête de la Liste

- Le bouton « Importer un planning MS Project » (en-tête) n'est rendu que si `pinOk` (adresse listée dans « Accès Manager » ou super admin). Les autres comptes voient « Le planning sera visible dès qu'un administrateur l'aura importé » si la base est vide. Protection d'interface : les règles Firestore doivent aussi refuser l'écriture de `planning/current` aux autres comptes.
- Liste : un filet sombre apparaissait entre deux en-têtes (arrondis de largeur des colonnes) ; chaque en-tête reçoit une ombre de 1 px à sa couleur qui le recouvre (`thBase`, TableView.js).
- Fichiers : App.js, components/TableView.js, releaseNotes.js, releaseCatalog.js, releaseCatalog.test.js.

## v146.22 — Manager › Turbines (pool 100LT / 20LT)

- **Onglet** « Turbines » (admins et super admin) : `components/TurbinesTab.js`, logique pure et testée dans `turbines.js` / `turbines.test.js`.
- **Données** : un seul document Firestore `planning/turbines` (beta : `planning/beta_turbines`, ajouté à `BETA_DOCS`) : `{ turbines:[{id,type,ref,mad,target,wheel:{name,ok},injector:{name,ok},note}], wheelNames:[], injectorNames:[], importedAt, importedBy, importFile, updatedAt, updatedBy }`. **Vérifier les règles Firestore** : l'écriture de ce document doit être autorisée aux comptes Manager.
- **Modèle** : la turbine est l'objet attribué (`target` = null/libre, `{kind:"PJ",ref}` ou `{kind:"SAV",ref:texte}`). La roue et l'injecteur portent un nom pris dans une liste ; la case cochée réserve l'élément pour CETTE turbine (un nom coché ne peut servir qu'une fois), décochée il est libre. Repasser une turbine en « Libre » décoche aussi sa roue et son injecteur.
- **Alertes** (PJ attribué) : MàD après le début des tests ; roue non cochée alors que les tests sont dans ≤ 14 jours ; injecteur non coché alors que le départ est dans ≤ 14 jours.
- **Stock virtuel** : 12 semaines à partir de la semaine courante ; par type : arrivent / libres (cumul, MàD ≤ fin de semaine, non attribuées) / attribuées (cumul).
- **Import Excel (proposition)** : une ligne = une turbine ; colonnes reconnues par leur titre : Type (100, 100LT, 100 kW, 20…), Date MàD (date, n° de série Excel, jj/mm/aaaa, ou semaine « S46 », « 2026-S46 »), Réf. (facultatif), Quantité (facultatif, duplique la ligne). Sans titres : ordre type, date, réf., quantité. « Modèle Excel » télécharge un exemple. À l'import : les turbines **libres** sont remplacées par celles du fichier ; les turbines **attribuées** sont conservées (leur date est mise à jour si la réf. correspond). Sans réf., ne mettre dans le fichier que les turbines pas encore attribuées pour éviter les doublons.
- Droits : tout admin attribue, ré-attribue et ajoute ; seul le super admin supprime une turbine ou retire un nom des listes.
- Fichiers : App.js, components/{ManagerPanel,TurbinesTab}.js, turbines.js, turbines.test.js, releaseNotes.js, releaseCatalog.js, releaseCatalog.test.js.

## v146.23 — Certifications, prix et pénalités par fiche, projets SAV (turbines)

- **Fiche synthèse** (Manager › Fiche projet) : nouveau cadre « Certification, prix & pénalités » (`components/FicheContrat.js`). Chaque fiche (PJ461-1, -2, -3…) porte ses propres valeurs ; les fiches d'un même PJ sont repérées par ce qui précède le premier « - » (`pjBase`, `siblingsOf` dans `penalties.js`).
- **Certifications** : catalogue global `certifCatalog:[{id,name,color}]` dans `planning/overrides` (même mécanisme que les états personnalisés) ; par fiche `meta.certifs:[id]`. La liste déroulante propose « ＋ Créer / gérer les certifications… » (renommer, recolorer, supprimer si inutilisée). Les pastilles sont reprises dans l'en-tête de la fiche.
- **Prix** : `meta.prixFiche` (distinct du « Montant global » du bloc Contrat, repris par défaut si le prix est vide). Dates : `contratLivr`, `livrPrevue`, `contratMES`, `mesPrevue`.
- **Pénalités** : `meta.penalite = {ref:"mad"|"livr"|"mes", ratePct, graceWeeks, grace:"deduct"|"all", unit:"started"|"full", capType:"pct"|"eur", cap}`. Calcul pur et testé (`penalties.js`, `penalties.test.js`) : retard = prévision − date contractuelle (MaD ORC : fin projetée du planning ; livraison / MES : date prévue saisie, à défaut aujourd'hui si l'échéance est passée) ; semaines facturables après franchise ; montant = semaines × taux × prix, plafonné. Recalcul à chaque changement de date. Hypothèses à confirmer : franchise « déduite » par défaut, semaine entamée comptée.
- **Multi-fiches** : tableau « toutes fiches » avec total du PJ ; boutons « Copier sur les autres fiches du PJ » (certifications, conditions de pénalité).
- **Turbines** : `savProjects:[nom]` dans `planning/turbines` ; liste « Projets SAV », création à la volée (« ＋ Nouveau projet SAV… ») ; l'ancienne saisie libre reste lisible (« hors liste », bouton « ＋ liste »).
- Fichiers : App.js, penalties.js(+test), components/{FicheContrat,ManagerFiche,ManagerPanel,TurbinesTab}.js, releaseNotes.js, releaseCatalog.js(+test).

## v146.24 — Turbines en glisser-déposer, certification à part, pénalités simplifiées

- **Tableau d'attribution** (`components/TurbineBoard.js`) en tête de Manager › Turbines : zones Stock (MàD passée) et Stock virtuel (MàD à venir) — les deux sont dérivées de la date, y déposer une turbine la remet simplement « libre » —, une carte par PJ et par projet SAV. Glisser-déposer HTML5 (souris ; sur tablette / téléphone, le détail en tableau reste disponible, replié par défaut).
- **Gamme → turbines** (`turbinesNeeded`, `turbines.js`) : 100 / 100 (LT, MT) = 1 × 100 kW ; 180 = 2 × 100 kW ; 20 = 1 × 20 kW ; 40 = 2 × 20 kW ; autres gammes (10, conteneur…) : pas de turbine attendue. Les types de données restent `100LT` / `20LT` (affichés « 100 kW » / « 20 kW »).
- **Roue / injecteur** : glissés sur la turbine (`placeElement` : un nom ne sert qu'à une turbine, la pose met `ok:true`) ; remettre la turbine en stock les libère. Contrôle `pjCheck` : erreur rouge si, dans les 7 jours, il manque une turbine ou la roue (échéance = début des tests) ou l'injecteur (échéance = départ) ; avertissement orange jusqu'à 21 jours. Hypothèse à confirmer : « semaine qui arrive » = 7 jours.
- **Fiche synthèse** : cadre « Certification » seul, cadre « Prix & pénalités » séparé. Dates MES supprimées ; « À partir de » = MaD ORC ou Livraison ; période de grâce en semaines (déduite) ; semaine entamée = semaine entière (plus de choix de franchise / d'unité).
- Fichiers : App.js, penalties.js(+test), turbines.js(+test), components/{TurbineBoard,TurbinesTab,FicheContrat,ManagerFiche}.js, releaseNotes.js, releaseCatalog.js(+test).

## v146.25 — Turbines : cartes lisibles, MàD en direct, export / import, communication

- **Cartes** : couleur de gamme (`GAMME_COLORS`), état (Badge), dates Tests / Départ en pastilles (rouge ≤ 7 j, orange ≤ 21 j), roue et injecteur avec leur échéance, état global (« ✓ Complet », « ⚠ n à traiter »). Les PJ expédiés (`etat === "SHIPPED"`) ou marqués « Turbines installées » (`planning/turbines.installedPj`) sortent de la liste (rubrique repliée « Expédiés / installés », bouton « Réafficher »). Texte d'alerte corrigé (« tests tests commencés »).
- **MàD en direct** : champ date sur chaque turbine ; `withMad` garde `madSrc` (date d'origine du dernier import / export).
- **Export / import** (`exportRows`, `mergeImport`, `stampExport`) : l'export contient Réf., Type, MàD, Semaine, Attribué à, Roue, Injecteur et l'Id technique ; le ré-import retrouve les lignes par Id puis Réf., ne met à jour que type et date, fusion à trois (fichier inchangé → correction locale conservée ; fichier modifié → il gagne, signalé), ne supprime rien (option « retirer les libres absentes »). Références automatiques `T100-001` / `T20-001`.
- **Pré-remplir depuis le planning** (`planningNeeds`) : une turbine libre par besoin non couvert, daté de l'arrivée de l'ORC (`origin` = PJ). « ＋ Turbines » accepte une quantité.
- **À communiquer** (`pendingShare`, `markShared`, `shareMessage`) : chaque turbine garde `shared` = dernière attribution / roue / injecteur transmis ; le bandeau liste les écarts, propose un message à copier et « C'est communiqué ».
- Fichiers : App.js, turbines.js(+test), components/{TurbineBoard,TurbinesTab}.js, releaseNotes.js, releaseCatalog.js(+test).

## v146.26 — Turbines : stock en colonnes, SAV par fenêtre, import du fichier du responsable

- **Stock** : « Stock réel » (MàD ≤ aujourd'hui, vert) et « Stock virtuel » (MàD future, violet, bordure pointillée) côte à côte, grilles multi-colonnes (hauteur max, défilement interne). Retard = `lateDays` (MàD après l'échéance du fichier).
- **Roues / injecteurs** : champ d'ajout dans chaque zone ; sur la turbine, liste déroulante des noms libres en plus du glisser-déposer ; retrait des noms inutilisés réservé au super admin.
- **SAV** : fenêtre « Nouveau projet SAV » (n° du PJ → `savName` = SAVxxx, turbine demandée 1×/2× 100 ou 20 kW, date de besoin facultative) ; métadonnées dans `planning/turbines.savMeta`. Suppression du cadre : super admin uniquement (turbines rendues au stock).
- **Import** : détection automatique du fichier « Livraisons_Turbines_ORC » (feuille large `Dates_livraison_turbines` ou feuilles `IMPORT_Sxx`) via `parseBossRows` ; choix de la feuille dans l'aperçu ; type déduit du modèle, sinon de la turbine existante, sinon de la gamme du PJ ; les cadres SAV rencontrés sont créés. Les attributions / roues / injecteurs existants ne sont jamais modifiés.
- Fichiers : App.js, turbines.js(+test), components/{TurbineBoard,TurbinesTab}.js, releaseNotes.js, releaseCatalog.js(+test).

## v146.27 — Turbines : règles d'arrivée, « Complet », éléments seuls, stock du fichier

- **Échéances** (`dueDates`) : turbine MàD ≤ arrivée du PJ (`arrivee`, ou date de besoin d'un SAV), roue connue ≤ arrivée − 7 j, injecteur disponible le jour de l'arrivée ; sans date d'arrivée, repli sur tests (turbine, roue) et départ (injecteur). Erreur ≤ 7 j, alerte ≤ 21 j.
- **« Complet »** (`pjCheck().complete`) : toutes les turbines attendues ET chacune avec roue + injecteur, sans alerte ; sinon « À compléter : … » liste le manque (`missing`).
- **Éléments seuls** : `planning/turbines.looseEls = [{kind, name, target:{kind,ref}}]` ; déposés sur une carte, ils vont sur la 1re turbine à laquelle il manque l'élément, sinon restent « seuls » (comptés dans `pjCheck`), puis sont absorbés par une turbine qui arrive (`absorbLoose`). Un nom ne sert qu'une fois (turbine ou seul).
- **Import du Google Sheet** : feuille `Dates_livraison_turbines` préférée ; les nouvelles turbines arrivent **libres** (option « rattacher au PJ du fichier ») : MàD ≤ aujourd'hui = stock réel, sinon stock virtuel ; lignes ignorées si projet expédié / installé, ou ancienne livraison dont le PJ n'est plus au planning ; option « retirer les turbines libres absentes » cochée par défaut pour ce format.
- Fichiers : App.js, turbines.js(+test), components/{TurbineBoard,TurbinesTab}.js, releaseNotes.js, releaseCatalog.js(+test).

## v146.28 — Fiche de synthèse par zones, turbines repliables, export au format du responsable

- **Fiche de synthèse** (`ManagerFiche.js`) : plus de colonnes ; quatre cadres pleine largeur empilés — Pilotage, Planning, **Finance** (prix de la fiche d'init. avec objectif de marge, livraison contractuelle, pénalités, composants, paiements) et **Suivi** (actions, mitigation, retards, fil de commentaires, en sections).
- **Certification** : plus de cadre ; `CertifTag` (FicheContrat.js) affiche les puces et un sélecteur « ＋ » à côté du N° de série dans l'en-tête (copie vers les autres fiches du PJ et gestion du catalogue dans le menu).
- **Turbines** : cartes PJ repliées (en-tête seul : nom, gamme, n/N, arrivée, statut) ; ouvertes par défaut si l'arrivée (à défaut les tests) tombe dans le mois en cours ; clic sur l'en-tête, « Tout ouvrir / Tout replier » ; PJ 2/3 (colonnes type « maçonnerie ») et SAV 1/3 côte à côte (empilés sur écran étroit). Le glisser-déposer reste actif sur une carte repliée.
- **Export** (`exportRows(turbines, today)`) : même présentation que le fichier du responsable — Projet | Modèle | N° Série | Échéance | Livraison Sxx (= MàD saisie ici) | Status (Livré / OK / En retard / Critique > 10 j) | Retard (j) — plus Ancienne date, Date modifiée ?, Attribué à, Roue, Injecteur, Id technique. Le ré-import (feuille « Projet / Livraison ») retrouve les lignes par Id, sans toucher aux attributions ; le modèle d'origine (« 100kW MT ») est conservé (`model`).
- Fichiers : App.js, turbines.js(+test), components/{ManagerFiche,FicheContrat,TurbineBoard,TurbinesTab}.js, releaseNotes.js, releaseCatalog.js(+test).

## v147 — Fiche de synthèse en colonnes, stock turbines = appros réels

- **Fiche de synthèse** : dans chaque zone, 3 ou 4 colonnes verticales (`Cols` / `Col`, grille auto-fit 300 px, empilées sur écran étroit) — Pilotage : synthèse + commentaire général | statut global | indicateurs ; Planning : jalons | contrat & roadmap | dernier import ; Finance : prix de la fiche d'init. + pénalités | composants | paiements ; Suivi : actions | mitigation | retards | fil de commentaires.
- **En-tête** : première ligne centrée (PJ, gamme, S/N) ; « Certification machine : [liste déroulante] » sur la ligne de l'état / du pays (menu : Aucune, certifications du catalogue, copier sur les autres fiches, créer / gérer).
- **Stock virtuel** : uniquement les appros connus (fichier du responsable, saisie) ; horizon d'affichage 12 semaines (bouton pour tout voir) ; les turbines « estimées d'après le planning » (`origin`, bouton « Estimer les besoins depuis le planning ») ne comptent ni dans le stock ni dans le tableau par semaine : zone repliée à part, suppression en bloc réservée au super admin.
- **SAV** : `savName("PJ411-1") = "SAV411-1"`.
- Fichiers : App.js, turbines.js(+test), components/{ManagerFiche,FicheContrat,TurbineBoard,TurbinesTab}.js, releaseNotes.js, releaseCatalog.js(+test).

## v148 — Stock « À venir », certification en couleur, CODIR avec pénalités

- **Stock « À venir »** (ex-« virtuel ») : plus d'horizon de 12 semaines — toutes les turbines du fichier du responsable (montage, livraisons jusqu'en mars) sont affichées, une ligne = une turbine ; MàD passée = stock réel. Les estimations du planning (`origin`) restent hors stock. Le tableau « Stock à venir par semaine » s'étend jusqu'à la dernière MàD connue (12 semaines minimum, 52 maximum).
- **Certification machine** : `CertifTag` devient un bouton-pastille à la couleur de la certification (pointillé « Choisir… » si aucune) ouvrant une liste de pastilles colorées (Aucune, catalogue, copier sur les autres fiches, créer / gérer) ; fermeture au clic extérieur / Échap.
- **Rapport CODIR** : `pjInfo` calcule `base` (`ficheBase`) et `pen` (`penaltyCalc` → `penView`) ; page PJ : bandeau Contrat avec « Fiche d'init. (objectif de marge inclus) » et « Pénalités » (montant, jours de retard, à ce jour / prévision, « à compléter » si incomplètes) ; synthèse : colonnes « Fiche init. » et « Pénalités » + total des pénalités ; roadmap légèrement resserrée pour que la page PJ reste sur une seule feuille.
- Fichiers : App.js, turbines.js, components/{TurbineBoard,TurbinesTab,FicheContrat,CodirReport}.js, releaseNotes.js, releaseCatalog.js(+test).

## v149 — @mentions, pénalités activées par le client, fiche complète dans le rapport CdP

- **@mentions** (`mentions.js`, +test) : dans le fil de commentaires, des puces « @ Prénom Nom » (managers déclarés, nom tiré de l'email) ajoutent `@Prénom Nom` au texte ; le commentaire garde `mentions: [email]` et `resolved: [{email, at}]`. La personne taguée voit un badge « @ n » dans la liste des PJ, le filtre « @ Pour moi (n à traiter) », et « Marquer traité ✓ » / « Rouvrir » (`resolveComment` dans App.js). Pas de notification par email (pas de serveur) : le suivi se fait dans l'appli.
- **Pénalités** : `penalite.actif` (case « Pénalités activées par le client », vrai par défaut pour les fiches existantes) ; `penaltyCalc` renvoie `status: "inactive"` (aucun montant) quand décochée ; plafond + unité fusionnés dans un champ (`CapInput`), grille 2 × 2 ; CODIR : « non activées ».
- **Rapport chef de projet** : nouvelle diapositive 3 par PJ (`pjSlideFin`) — prix de la fiche d'init. (objectif de marge inclus), montant du contrat, livraison contractuelle / prévue, conditions et résultats des pénalités, certification machine (pastilles colorées), tableau des fiches du PJ ; la certification est aussi rappelée sous le titre.
- Fichiers : App.js, mentions.js(+test), penalties.js(+test), reports/cdpPptx.js, components/{ManagerFiche,ManagerPanel,FicheContrat,CdpReport,CodirReport}.js, releaseNotes.js, releaseCatalog.js(+test).

## v150 — Liste des composants, livraison contractuelle, Tf final

- **Pénalités** : bloc compact (grille 2 × 2, plafond avec son montant dans le libellé, résultats sur une ligne) ; case « Pénalités activées par le client » en rouge quand cochée.
- **Major components** : liste générale gérée par les administrateurs (`composantCatalog` dans planning/overrides ; `setDefaultComposants` dans pjProgress.js) — dialogue `CompCatalog.js` (ajouter, renommer, monter / descendre, retirer, « Ajouter aux PJ en cours » qui complète les listes déjà démarrées sans rien retirer) ; boutons « ＋ » dans chaque fiche pour les composants de la liste absents. Les PJ sans liste propre partent de la liste générale.
- **Dates** : `contratLivr` / `livrPrevue` quittent Finance et vont dans Planning › Contrat & roadmap à côté de la MaD ORC (hors transport / transport inclus).
- **Tf final** : pour un PJ expédié, « Fin projetée » devient « Tf final » (fiche, frise, CODIR, rapport chef de projet).
- **CODIR** : plus de doublons (montant du contrat, % payé) ; « fiche d'init. » et « objectif de marge » supprimés partout (le champ prix de la fiche reste, simplement nommé « Prix de la fiche », base des pénalités).
- Fichiers : App.js, pjProgress.js(+test), components/{CompCatalog,FicheContrat,ManagerFiche,ManagerPanel,CodirReport,CdpReport}.js, reports/cdpPptx.js, releaseNotes.js, releaseCatalog.js(+test).

## v151 — Édition de l'état et de la présence client/NOBO dans la Liste, privés masqués

- **Liste (TableView)** : pour les administrateurs (`pinOk`), la colonne État devient un sélecteur compact (`EtatSelect compact`, exporté de ManagerParts.js) et la pastille de présence ouvre un éditeur flottant (`PresenceCell` → `PresenceEditor`, nouveau, réutilisé aussi par Manager › Statut). Enregistrement via `setEtatFor` / `setClientPresenceFor` (App.js) ; les clics ne déclenchent pas l'ouverture du PJ. Les non-admins gardent l'affichage en lecture seule.
- **Commentaires privés** : masqués par défaut à l'ouverture d'un PJ (ManagerFiche et ProjectComments) ; bouton « Afficher les privés (n) » / « Masquer les privés » ; réinitialisé à chaque changement de PJ. Le filtre « @ Pour moi » inclut toujours les messages qui citent l'utilisateur.
- Fichiers : App.js, components/{TableView,ManagerParts,ManagerFiche,ProjectModal}.js, releaseNotes.js, releaseCatalog.js(+test).

## v152 — Taguer (@) partout, cloche de notifications

- **Tags** : `MentionPicker` (components/MentionPicker.js) est utilisé dans la fiche Manager, `ProjectComments` (fenêtre projet de la Liste / Gantt) et `CommentsView` ; les personnes taguables viennent de `MentionCtx` (mentionContext.js, fourni par App : managers déclarés + soi-même). `addCommentMulti` accepte aussi `mentions`.
- **Cloche** (`MentionBell`, en-tête, managers) : demandes ouvertes où l'on est cité (`openMentionsFor`), « Ouvrir la fiche » (App `managerJump` → ManagerPanel `jumpFiche`) et « ✓ Traité » (`resolveComment`).
- **E-mail** : pas de serveur d'envoi ; la case « Prévenir aussi par e-mail » ouvre un `mailto:` prérempli (`mailtoFor`) dans la messagerie de l'auteur. Une vraie notification automatique demanderait une fonction serveur (non incluse).
- Fichiers : App.js, mentions.js(+test), mentionContext.js, components/{MentionPicker,MentionBell,ManagerFiche,ManagerPanel,ProjectModal,CommentsView}.js, releaseNotes.js, releaseCatalog.js(+test).

## v153 — Taguer « comme sur Gmail »

- **Saisie** : `MentionTextarea` (components/MentionPicker.js) remplace les zones de texte des commentaires (fiche Manager, fenêtre projet, page Commentaires) : on tape `@` + quelques lettres, suggestions (6 max, flèches / Entrée / Tab / clic, Échap ferme). La liste complète n'est plus affichée. Logique pure dans mentions.js (`mentionQueryAt`, `suggestMentions`, `insertMention`).
- **Qui peut être tagué** : tout compte déjà connecté au site. App écrit à chaque connexion `{ byEmail: { <email> : { email, name, at } } }` dans **`planning/knownUsers`** (document commun bêta / production, sans préfixe) et le lit en direct ; s'y ajoutent les managers déclarés et soi-même (`peopleOptions`). Les comptes ne sont proposés qu'après leur première connexion avec cette version.
- **Règles Firestore** : `planning/knownUsers` suit la règle générale `planning/{docId}` (lecture / écriture pour tout compte connecté). Si elle est refusée, la liste se limite aux managers déclarés (avertissement en console, rien de bloquant).
- **Cloche** : visible par tous les comptes ; sans accès Manager, « Ouvrir le PJ » mène à la Liste et les messages privés sont exclus.
- Fichiers : App.js, mentions.js(+test), components/{MentionPicker,MentionBell,ManagerFiche,ProjectModal,CommentsView}.js, releaseNotes.js, releaseCatalog.js(+test).

## v154 — Onglet Tests (FAT), chef de projet prévenu, tags sans managers

- **Manager › Tests** (`components/TestsTab.js`, logique pure `testPlan.js` + tests) : trois sous-onglets — *Planning des tests* (une carte par PJ ayant une période de tests : testeurs affectés avec dates propres facultatives, alerte de chevauchement d'un même testeur sur deux PJ, éditeur de présence client / NOBO, cases des tests à réaliser), *Testeurs* (nom, e-mail facultatif, affectations), *Catalogue des tests* (FAT interne / client / NOBO, préchargé d'après OP022-DP001-A : 6 / 2 / 3 tests, modifiable, « Rétablir le modèle du fichier »). La partie interne est toujours active ; client et NOBO ne le sont que si la présence correspondante est définie (`activeSections`). Champ « Autre test » en texte libre par partie.
- **Données** : nouveau document **`planning/tests`** (`planning/beta_tests` en bêta, ajouté à la copie bêta) : `{ testers, catalog, plans }`, lu en direct par les administrateurs (`pinOk`). **Règles Firestore** : la règle générale `planning/{docId}` couvre ce document ; si vos règles listent les documents un par un, ajouter `tests` / `beta_tests`.
- **Chef de projet** : à chaque commentaire (`addComment`, `addCommentMulti`), son compte est ajouté d'office aux personnes citées (sauf s'il est l'auteur) → il le voit dans la cloche et peut le marquer « traité ». Le chef est rapproché d'un compte connecté ou manager déclaré par son nom (`chefAccount` : accents, casse et ordre prénom / nom ignorés, ou adresse prénom.nom@…). Sans compte connu, la saisie l'indique (« pas encore connecté »). Ne concerne que les commentaires écrits à partir de cette version.
- **Tags @** : les managers ne sont plus proposés d'office (`peopleOptions(knownUsers, [], …)`) ; seuls les comptes déjà connectés, et soi-même exclu des suggestions.
- Fichiers : App.js, mentions.js(+test), testPlan.js(+test), components/{TestsTab,MentionPicker,MentionBell,ManagerPanel,ManagerFiche,ProjectModal,CommentsView}.js, releaseNotes.js, releaseCatalog.js(+test).

## v155 — Page Tests dans le rail de gauche, fiches par machine

- **Emplacement** : l'onglet « Tests » quitte Manager ; c'est une vue du rail de gauche (icône ✓, `view==="tests"`). Visible des administrateurs (`pinOk`, modification) et des **testeurs de la liste dont l'adresse est renseignée** (`testerOfEmail`, consultation seule : leurs affectations sont repérées « Mon test », filtre « Mes tests »). Le document `planning/tests` est donc lu par tous les comptes connectés (petit document) ; l'écriture est refusée côté interface aux non-admins.
- **Fiches par machine** (`TestsTab.js`) : filtres À venir / Sans testeur / Mes tests / Tous ; fiche dépliable au modèle de la checklist OP022-DP001-A (en-tête PJ, ORC, certification, FAT client, FAT NOBO ; puis ① qui teste : clic sur un nom pour affecter à toute la période, « Limiter à des dates » ; ② présence en lecture seule ; ③ tests par partie avec objectifs et **commentaire propre au PJ** (`plan.notes`), ligne « Autre »).
- **Planning des testeurs** : frise de 6 semaines (◀ ▶ par 4 semaines), une ligne par testeur (✎ pour modifier nom / e-mail ou retirer), ligne « À affecter » (périodes sans testeur), 2e ligne et ⚠ si un testeur est pris deux fois ; clic sur une barre = ouvre la fiche de la machine ; ajout d'un testeur en pied de page (comptes connectés suggérés).
- **Dates de venue client / NOBO** : plus modifiables depuis cette page (Liste uniquement).
- Fichiers : App.js, testPlan.js(+test), components/{TestsTab,ManagerPanel}.js, releaseNotes.js, releaseCatalog.js(+test).

## v156 — Tag @ par prénom (fenêtre Gmail), testeurs qui choisissent leurs tests

- **Tag @** (`MentionTextarea`, `mentions.js`) : la recherche ne porte que sur le **prénom** (accents et casse ignorés ; « Nom, Prénom » géré) et s'arrête au premier espace. Une fenêtre s'ouvre **sous le curseur** (position calculée dans la zone de texte) : avatar à initiale, nom avec le début du prénom en gras, adresse, liste défilante (5 lignes visibles), flèches / Entrée / Tab / clic, Échap pour fermer. Le texte inséré reste le nom complet (`@Prénom NOM`) pour éviter les homonymes.
- **Tests** : un testeur de la liste affecté à une machine peut cocher / décocher les tests, écrire les commentaires et la ligne « Autre » de **cette** machine (`commitTests`) ; affectations, testeurs et catalogue restent aux administrateurs. Contrôle côté interface (les règles Firestore générales de `planning/{docId}` s'appliquent comme pour les autres documents).
- Fichiers : mentions.js(+test), components/{MentionPicker,TestsTab}.js, releaseNotes.js, releaseCatalog.js(+test), App.js.

## v157 — Testeurs en consultation seule, message dans la fenêtre @

- **Tests** : retour en arrière sur la v156. Un testeur (même affecté à la machine) ne peut **ni cocher / décocher, ni commenter, ni remplir « Autre »** ; il consulte ses machines et les tests à réaliser (« Mon test », filtre « Mes tests »). Seuls les administrateurs (`pinOk`) modifient la page ; `commit` refuse l'écriture pour les autres. `commitTests` supprimé.
- **Tag @** : si la fenêtre ne trouve personne, elle l'explique (« Aucune autre personne ne s'est encore connectée… » ou « Aucun prénom ne commence par … »). Rappel : le registre `planning/knownUsers` est **commun à la préprod et à la prod** (non préfixé) et ne se remplit qu'à la connexion d'une personne sur une version ≥ v153 ; on ne se tague pas soi-même et les managers ne sont pas proposés tant qu'ils ne se sont pas connectés.
- Fichiers : components/{TestsTab,MentionPicker}.js, releaseNotes.js, releaseCatalog.js(+test), App.js.

## v158 — Menu Manager en rail latéral + palette Ctrl K

- **Rail** (`components/ManagerNav.js`, `ManagerRail`) : les onglets Manager passent dans une colonne à gauche, par famille — Pilotage (KPI, Suivi, Retards), Projets (Fiche projet, Point hebdo, Turbines), Admin (Cash in, Réglages ; super admin seulement). Les sous-onglets (KPI, Suivi, Réglages) se déplient en accordéon sous l'entrée active ; le bouton ‹ réduit le rail en icônes (état mémorisé dans `localStorage`, clé `enogia_manager_rail_min`). Sur téléphone, le rail redevient une barre horizontale et les sous-onglets restent en pastilles.
- **Fil d'Ariane** (`ManagerCrumb`) au-dessus du contenu : Manager › KPI › Dérives. La tuile « Planning initial » reste à droite.
- **Aller à…** (`ManagerPalette`) : Ctrl K (ou Cmd K), ou le bouton « Aller à… ». Recherche sur le début des mots (accents ignorés) dans les onglets et sous-onglets, et sur le n° / nom d'un PJ (ouvre sa fiche). Flèches, Entrée, Échap ; 3 derniers choix mémorisés (`enogia_manager_recent`). Les entrées Admin n'existent que pour le super admin.
- Contenu des onglets **inchangé** ; seule la navigation change (`ManagerPanel.js` : `navGroups`, plus de barre `TOP`). Fondu existant (`enogia-view-in`) conservé ; nouvelles animations `enogiaFadeIn` / `enogiaPop` dans `styles.css`. Pas de pastille sur « Retards » : l'onglet n'a pas de compteur de PJ en retard (le rail sait afficher un `badge` si on en ajoute un).
- Fichiers : components/{ManagerNav,ManagerPanel}.js, styles.css, releaseNotes.js, releaseCatalog.js(+test), App.js.

## v159 — Menu principal libellé, Ctrl K global, fiche PJ en volet ou pop-up

- **Menu principal** (`App.js`, `<nav className="enogia-nav">`) : mêmes codes que le rail Manager. Entrées libellées par famille (Planning : Liste, Gantt, Calendrier ; Suivi : Modifications, Commentaires, Tests), page active en teinte, bouton ‹ pour réduire en icônes (`localStorage` `enogia_nav_min`). Dans l'espace Manager il passe automatiquement en icônes (un seul grand menu à l'écran). Téléphone : inchangé, barre d'icônes en bas (libellés masqués par `styles.css`).
- **Aller à… (Ctrl K / Cmd K)** sur toutes les pages hors Manager (celui-ci garde sa propre palette) : pages, Espace Manager (administrateurs) et recherche d'un PJ (ouvre sa fiche). Loupe dans l'en-tête. Récents : `enogia_nav_recent`. Même composant que le Manager (`ManagerPalette`, paramètre `storageKey`).
- **Fiche d'un PJ : volet ou pop-up** (`detailMode.js`, `localStorage` `enogia_detail_mode`, par poste) : « Volet à droite » = comportement précédent (volet fixe dans la Liste, tiroir dans Gantt / Calendrier) ; « Pop-up central » = fenêtre centrée sur fond flouté (Échap ou clic à l'extérieur pour fermer), dans toutes les vues ; la Liste prend alors toute la largeur. Bascule dans l'en-tête de la fiche (bouton Volet / Pop-up) et dans le panneau palette › « Fiche d'un PJ ».
- **Commentaires** : case « Prévenir aussi par e-mail » retirée (`MentionPicker`, `mailTagged` supprimé) ; les personnes taguées et le chef de projet sont prévenus par la cloche.
- **Icône Manager** : bouclier avec coche (`NavIcon "manager"`).
- Fichiers : App.js, detailMode.js, components/{ManagerNav,MentionPicker,ManagerFiche,CommentsView,ProjectModal,TableView,ThemePicker,SharedUI}.js, styles.css, releaseNotes.js, releaseCatalog.js(+test).

## v160 — Étiquette Client + NOBO, plus de source maps publiées

- **Fiche PJ** : dans la tuile « Tests », l'étiquette de présence passe en version courte (`tiny` : « C + N » quand client et NOBO sont présents) et ne peut plus déborder (`overflow:hidden`).
- **Sécurité du déploiement** : nouveau fichier `.env` à la racine avec `GENERATE_SOURCEMAP=false`. Avant, `npm run build` produisait `build/static/js/main.*.js.map`, publié sur GitHub Pages avec le site : ce fichier permet de relire le code d'origine (noms de fichiers, commentaires, structure) depuis les outils du navigateur. Après ce déploiement, ce fichier n'existe plus. À faire une fois : vérifier sur GitHub que le dépôt est **privé** (Settings › General › Danger zone › visibilité) et, côté Firebase, que les règles Firestore exigent une connexion.
- Fichiers : components/ProjectModal.js, .env, releaseNotes.js, releaseCatalog.js(+test), App.js.

## v161 — Palette « Ardoise » (proposition A)

- **Thème par défaut** (`theme.js`, id `marine`, renommé « Ardoise » ; les choix de thème déjà mémorisés restent valables) : fond gris froid `#F3F5F8` au lieu de la crème, cartes blanches, encre `#101828`, filets `#DDE2EA` ; sombre `#0E141F` / `#141C2B`. Couleur de marque et accent sarcelle inchangés. Les thèmes Forêt et Cuivre ne bougent pas.
- **États** (`pjMeta.js`, `ETAT_META`) : les cinq étapes de production suivent une rampe (Montage Méca `#3E4F86` → Montage Élec `#2F6F9E` → Tests `#1F8CA0` → Packaging `#2A9C8A` → Expédiée `#3C9A68`) ; Fabrication FNR, Stockage externe et Non désignée en gris ; « Non commandée » passe en ambre (le rouge n'est plus que pour les retards) ; « Slot libre » en bleu marine. Fonds très clairs, texte foncé de la même teinte, point de couleur.
- **Étapes** (Calendrier, Gantt, fiche) : `STAGE_HUES` et `GANTT_HUES` suivent la même rampe (Arrivée → Production → Tests → Fin prod → Départ). Le Gantt, qui gardait ses teintes propres depuis la v146, est donc aligné sur le reste.
- Contrastes (`npm run check:contrast`) : 1145 vérifications, 0 échec ; liste des cartes sombres mise à jour dans le script.
- Fichiers : theme.js, pjMeta.js, scripts/check-contrast.mjs, releaseNotes.js, releaseCatalog.js(+test), App.js.

## v162 — Accueil « Aujourd'hui », actions rapides, Gantt, finitions

- **Accueil** (`components/HomeView.js`, nouvelle vue `home`, première du menu et page d'ouverture par défaut ; une vue déjà mémorisée par la personne est conservée) : machines livrées (compteur animé), repères En production / Départs sous 30 j / En retard / Mentions à traiter, puis cartes « Pour moi » (mentions ouvertes), « Depuis ma dernière visite » (journal des modifications non vues), « Mes projets » (chef de projet = moi, rapprochement par nom comme les notifications), « Prochains départs » et « À surveiller » (dérive > 0). Lecture seule ; chaque ligne ouvre la fiche. Aucune nouvelle donnée Firestore.
- **Chiffres animés** (`AnimatedNumber` dans `SharedUI.js`) : décompte de 0 à la valeur, désactivé si « réduire les animations » est demandé.
- **Actions rapides** (`components/RowMenu.js`, `TableView.js`) : clic droit ou bouton ⋯ (visible au survol) sur une ligne → Ouvrir la fiche, Commenter (ouvre la fiche et place le curseur dans la zone de commentaire), Copier le n° de PJ, Changer l'état (seulement si `pinOk`). Même fonction `setEtatFor` que le sélecteur de la colonne État.
- **Gantt** : zoom continu 4–56 px/jour (boutons ×1,28 et Ctrl + molette centré sur le curseur), bouton « Par projet » (mémorisé dans `enogia_gantt_group`) avec en-tête de groupe et étendue arrivée → départ, infobulle enrichie (état, chef, gamme).
- **Icônes** : nouveaux pictogrammes `home`, `more`, `copy`, `arrow`, `at`, `flag`, `edit`, `trash`, `bell` ; remplacement des émojis restants (🔔, 🗑, ✎, ⬆️, ⚠ de l'onglet Tests).
- **Typographie** : lissage, chiffres tabulaires sur tableaux et champs, interlettrage des en-têtes de colonne (`styles.css`).
- Fichiers : components/HomeView.js, RowMenu.js, TableView.js, GanttView.js, SharedUI.js, ChangesNotice.js, TurbineBoard.js, ProjectModal.js, TestsTab.js, App.js, styles.css, releaseNotes.js, releaseCatalog.js(+test).


## v163 — Palette B, accueil par profil, liste explicite, cohérence

- **Palette B** (`theme.js`, `pjMeta.js`) : étapes violet `#7C4DDB` / bleu `#1D63E0` / turquoise `#0C8AA8` / vert `#0F9D74` / vert vif `#4CA81E` ; helpers `stripeBg` et `stripeHues` (liseré de 4 px sur le haut des cartes : accueil, fiche — couleur de l'état —, Gantt, Modifications, Manager). **Mode sombre éclairci** (surface `#1C2536`, carte `#27324A`), états/étapes recalculés ; `scripts/check-contrast.mjs` : `CARD_DARK` mis à jour, 1145 vérifications, 0 échec.
- **Polices** : Roboto partout (`fontMontserrat` pointe désormais sur Roboto, Georgia retirée du bouton « i »), `index.html` ne charge plus que Roboto + JetBrains Mono.
- **Densité compacte par défaut** : clé `enogia_density2` (les anciens choix « confortable » enregistrés sous `enogia_density` sont volontairement ignorés une fois).
- **Liste** (`TableView.js`, `RowPops.js`, `HoverPop` dans `SharedUI.js`) : plus de zébrage ; survol = liseré 3 px + teinte 7 % de la couleur d'état ; bulles au survol d'État (étapes + dates), d'écart de départ (« +N j » : initial vs actuel, initial = départ − écart) et d'Avancement (méca/élec/tests déduits de la valeur).
- **Accueil** (`HomeView.js`) : phrase-bilan, 4 repères (Livrées avec « +N sur 28 j » calculé, les autres avec un sous-texte factuel), blocs numérotés par profil (manager `pinOk`, chef de projet, testeur via `testerOfEmail`), « Personnaliser » (`localStorage` `enogia_home_<email>`), « Le parcours d'une machine » (répartition par étape).
- **Cohérence** : `PageHead` (rubrique + titre + sous-titre) au-dessus de chaque vue, repère `::before` sur l'entrée de menu active, tuiles d'étapes numérotées et liseré d'état dans la fiche, mode présentation : masque ⋯ / Personnaliser, texte du tableau agrandi.
- Fichiers : theme.js, pjMeta.js, App.js, styles.css, index.html, scripts/check-contrast.mjs, components/{HomeView,RowPops,TableView,SharedUI,ProjectModal,GanttView,ChangesView,ManagerFiche,ProdStagesUI}.js, releaseNotes.js, releaseCatalog.js(+test).

## v164 — Couleurs sur le texte, liste des fiches synthèse redimensionnable, accessibilité

- **Couleur d'état sur le texte** (`pjMeta.js` : `etatInk(etat)` — clair : encre foncée de la teinte ; sombre : teinte éclaircie) : n° de PJ et % de la liste des fiches synthèse (`ManagerFiche.js`), n° de PJ des lignes de l'accueil ; barre d'avancement à la couleur de l'état ; le point d'état utilise `ec.bar` (il utilisait `ec.text`, blanc en sombre). Chiffres de la phrase-bilan : `background:none` + `WebkitTextFillColor` pour rester colorés même sous extension de mode sombre.
- **Liste des fiches synthèse** : largeur 340 px par défaut, poignée `.enogia-mhandle` (glisser, flèches ← → au clavier, double-clic = 340 px), plage 220–640 px (`localStorage` `enogia_mlist_w`) ; bouton Réduire/Agrandir → mini-liste de 76 px (n° de PJ + barre, `enogia_mlist_mini`). Masquée sous 760 px.
- **Accessibilité** (règles issues des skills UI/UX Pro Max et Taste, ajoutés au compte) : lien d'évitement `.enogia-skip`, `<main id="enogia-main">`, `aria-sort` sur les en-têtes triables de la Liste, focus visible sur la poignée.
- Fichiers : pjMeta.js, App.js, styles.css, components/{ManagerFiche,HomeView,TableView}.js, releaseNotes.js, releaseCatalog.js(+test).

## v165 — Fiche pleine largeur, accessibilité sur toutes les pages, garde-fous Claude Code

- **Fiche synthèse** (`ManagerFiche.js`) : plafond `maxWidth:1500` retiré → la fiche occupe toute la largeur quand la liste est réduite.
- **Filet d'accessibilité** (`src/a11yFallback.js`, hook `useA11yFallback` appelé dans `App.js`) : `MutationObserver` (350 ms) qui (1) donne un `aria-label` aux champs/listes sans étiquette (en-tête de colonne + 1re cellule de la ligne, texte voisin, placeholder), (2) nomme les boutons icône sans nom (ex. « Trier ou filtrer : Projet »), (3) marque `data-hit` les boutons de moins de 24 px → `styles.css` élargit leur zone de clic de 5 px (`::after`, aspect inchangé). Audit avant/après (Chromium, 1400 px) : champs sans étiquette 8→0 (Liste), 52 champs de la Fiche projet dont 18 sans étiquette → 0, boutons sans nom 6→0, textes < 11 px 43→0.
- **Titres** : `ManagerCrumb` rend le dernier élément du fil d'Ariane en `<h1>` (un titre sur chaque onglet Manager).
- **Textes < 11 px** remontés à 11 px dans l'interface (hors rapports PDF/PowerPoint) ; `✕`/`⚠` remplacés par `NavIcon` (TableView, ReleaseNotes, TurbinesTab). Les caractères `✓ ⚠` placés dans des libellés texte (options de listes, infobulles) sont conservés.
- **Claude Code** : `CLAUDE.md` (règles du projet, version, design) et `.claude/settings.json` (refus de `git push`, `npm run deploy*`, `npm run predeploy*`, `node scripts/deploy.js`, `gh-pages`) ajoutés à la racine.
- Fichiers : a11yFallback.js, App.js, styles.css, components/{ManagerFiche,ManagerNav,TestsTab,FicheContrat,TableView,ReleaseNotes,MentionBell,ChangesNotice,RowPops,TurbinesTab}.js, pjMeta.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, .claude/settings.json.

## v166 — Correction du crash de l'onglet Calendrier

- **Cause** : le zoom du calendrier (`localStorage` `enogia_calZoom`) était relu par `parseInt` sans contrôle. Une valeur illisible donnait `NaN` → `nWeeks`/`nDays` indéfinis → l'en-tête (`weekNum(weeks[NaN])`) levait `TypeError: Cannot read properties of undefined (reading 'getFullYear')`. La valeur `NaN` étant réenregistrée, l'onglet plantait à chaque ouverture sur le poste concerné.
- **Correction** : `App.js` ignore un zoom non numérique ou négatif (défaut 2) et une date d'ancre illisible (`enogia_calAnchor`, `enogia_calDayAnchor`) ; `CalendarView.js` normalise aussi le zoom reçu (défaut 2) et les boutons + / − partent de la valeur normalisée. Aucune clé `localStorage` nouvelle ; les postes touchés se réparent seuls au premier affichage.
- **Outil** : `.claude/launch.json` (configuration `dev` = `npm start`, port 3000) pour l'aperçu local.
- Fichiers : App.js, components/CalendarView.js, releaseNotes.js, releaseCatalog.js(+test), .claude/launch.json.

## v167 — Calendrier : fin du gel de l'application

- **Cause** : la V166 corrigeait le zoom illisible, mais l'onglet figeait encore la page. Le Calendrier dessinait toutes les colonnes (300 jours ou 60 semaines) pour chaque machine : avec 120 machines, environ 39 000 éléments en vue Jour (1er rendu ≈ 31 s sous jsdom). L'infobulle (`tip`) et la saisie de commentaire étaient des états de `CalendarView` : chaque mouvement de souris ou chaque touche redessinait toute la grille (≈ 226 ms par mouvement en vue Semaine).
- **Correction** (`components/CalendarView.js`) :
  - Fenêtrage horizontal : seules les colonnes visibles + 8 de marge de chaque côté sont dessinées (position relue au plus une fois par image via `requestAnimationFrame`). Toutes les cases ont désormais une position explicite (`gridColumn`/`gridRow`), en-têtes compris ; les pistes de la grille sont inchangées, donc l'affichage et la largeur de défilement restent identiques.
  - Infobulle déplacée dans `CalTip` (état propre, alimenté par une ref) et fenêtre de commentaire dans `CalCommentPopup` (champs, Échap, remise à zéro par `key` à chaque ouverture).
  - Mesure (120 machines, jsdom) : vue Jour 39 128 → 5 528 éléments, 31 s → 2,7 s ; vue Semaine 226 ms → 2 ms par mouvement de souris.
- Aucune clé `localStorage` nouvelle.
- Fichiers : components/CalendarView.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v168 — Calendrier instantané, audit Manager (ui-ux-pro-max)

- **Calendrier** (`components/CalendarView.js`) : la V167 ne fenêtrait que les colonnes ; toutes les lignes machine restaient dessinées et la grille se redessinait à chaque image de défilement.
  - Lignes fenêtrées aussi : hauteur des lignes figée dans `gridTemplateRows` (`rowH + 1` px) pour que la barre de défilement reste juste.
  - Position de défilement arrondie par paliers de 240 px (`SCROLL_Q`), marge de 720 px (`VIEW_BUF`) : la grille ne se redessine qu'en changeant de palier.
  - `rowOf` (Map PJ → 1re ligne) remplace les `data.find` répétés (tri, largeur de colonne, lignes).
  - Mesure (jsdom) : vue Semaine 120 PJ, 1er rendu 2,4 s (V166) → 0,36 s ; vue Jour 31 s → 0,7 s ; 400 PJ : identique (33 lignes dessinées) ; ≈ 15 ms par palier de défilement.
- **Audit Manager** (`ManagerPanel.js`, `ManagerParts.js`, `ManagerNav.js`) et corrections :
  - Cause de retard sélectionnée : le texte blanc tombait à 1,8–3,4:1 → nouvel utilitaire `inkOn(bg)` dans `theme.js` (blanc ou encre foncée, le plus contrasté) ; minimum mesuré 4,5:1 sauf `navy600` du thème Forêt clair (4,26:1, aucune encre ne fait mieux).
  - Camembert « par PJ » : 8 teintes pastel codées en dur (2,3–3,1:1 sur la carte en clair) → `getDelayColors()` (jetons du thème).
  - Volet « Déclarer un retard » : `role="dialog"`, `aria-modal`, titre relié, focus à l'ouverture, Échap, retour du focus.
  - Boutons de choix (étape analysée, sous-onglets téléphone, causes) : `aria-pressed` ; groupe « Étape analysée » nommé.
  - Graphique « initial vs révisé » : `role="img"` + résumé (retard / avance / total), textes 10,5 → 11 px, points « date initiale » en `T.card` (étaient blancs en sombre). Camembert : `role="img"` + liste des valeurs.
  - Bouton « Effacer » : zone de clic ≥ 24 px ; hauteurs de listes en `100dvh`.
  - Rien à corriger dans le menu latéral (`aria-current`, bouton nommé, sous-onglets hors tabulation quand repliés).
- Aucune clé `localStorage` nouvelle.
- Fichiers : theme.js, components/{CalendarView,ManagerPanel,ManagerParts}.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v169 — Accueil refait d'après la maquette validée (taste-skill)

- **Structure** (`components/HomeView.js`, affichage seulement ; calculs inchangés) :
  - En-tête : date en casse normale (plus de majuscules espacées), phrase-bilan conservée, « Personnaliser » conservé.
  - 4 repères : liseré 4 px conservé, libellé au-dessus, valeur 28 px semi-gras en chiffres tabulaires.
  - Bloc principal « À traiter » : mentions ouvertes (4 max), mes tests à venir (3 max), dérives (4 max), une pastille par ligne (teinte pâle + texte foncé de la même teinte), puis « Depuis votre dernière visite » ; « Départs à venir » (5) dans une colonne à droite (`flex` 3/2, repli sous ~760 px).
  - « Mes projets » garde sa carte (non présent dans la maquette, conservé pour les chefs de projet).
  - « Le parcours d'une machine » → « Où en sont les N machines ouvertes » : une barre empilée (méca, élec, tests, packaging, pas encore lancées) avec effectifs, `role="img"` + résumé.
  - Numéros 01, 02… supprimés ; cartes plates (bordure 1 px, plus d'ombre) ; lignes ≥ 40 px, séparées par un filet.
- **Thème** : teinte douce `note` ajoutée à `alertSoft()` (pastille « Mention » ; 8,9:1 en clair, 7,4:1 en sombre).
- **Préférences** : même clé `localStorage` `enogia_home_<email>` ; les cases Pour moi / Mes tests / À surveiller / Depuis ma dernière visite pilotent désormais les lignes du bloc « À traiter ».
- Vérifié par rendu statique (jsdom → HTML) en clair, en sombre, à 500 et 768 px de large ; pas testé dans l'appli connectée.
- Fichiers : components/HomeView.js, theme.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v170 — Calendrier recentré et allégé, audit complet (ui-ux-pro-max)

- **Calendrier** (`components/CalendarView.js`, `App.js`, `styles.css`) :
  - Commentaires par jour retirés : bouton sur chaque case, fenêtre `CalCommentPopup`, styles `.enogia-cal-commentbtn`, props `comments` / `addComment` / `pinOk` / `authorName` du Calendrier. Les commentaires datés existants restent en base et visibles dans la fiche projet et la page Commentaires.
  - Cadrage (demandé) : à l'ouverture, au changement Semaine/Jour et sur « Aujourd'hui », la plage commence à J-7 (vue Jour) ou à la semaine passée (vue Semaine), et le zoom revient au niveau « J-7 → J+21 » : `WEEK_COUNTS[0]=5` semaines, `DAY_COUNTS[3]=29` jours (`HOME_ZOOM`). Les niveaux +/− restent disponibles.
  - Vue Jour : largeur minimale de colonne abaissée à 28 px pour faire tenir 29 jours ; sous la largeur d'un mot, la case ne garde que la couleur d'étape (`showWords`), le détail reste dans l'infobulle.
  - Code mort retiré : `PJ_PALETTE`, `usePjColors`.
- **Audit du site** (scan de tous les composants) et corrections :
  - Clavier : nouvel utilitaire `pressable(fn, extra)` dans `SharedUI.js` (rôle, `tabIndex`, Entrée/Espace). Appliqué aux options de `DropFilter` et `PjChecklist` (`role="checkbox"` + `aria-checked`), au choix des colonnes et du format de date de la Liste, aux lignes du Gantt (`aria-pressed`), du Calendrier, des Commentaires, des en-têtes du Kanban et de la liste des fiches synthèse (`aria-current`).
  - Dialogues : `role="dialog"` + `aria-modal` + nom sur la fiche projet en panneau latéral (déjà présent en mode centré), « Ajouter à l'initial » (+ Échap), rapport chef de projet, rapport CODIR.
  - `100vh` → `100dvh` (11 composants) ; `transition: all` retiré dans `Feux.js`.
  - Laissé volontairement : couleurs du logo Google (`LoginScreen`), nuancier de choix d'état (`EtatsDialog`), palette pastel des camemberts de `DashboardSummary` (demandée explicitement), tailles < 11 px des rapports imprimés.
- Aucune clé `localStorage` nouvelle (le zoom du calendrier `enogia_calZoom` est réécrit au niveau J-7 → J+21 à chaque ouverture).
- Fichiers : App.js, styles.css, components/{CalendarView,SharedUI,TableView,GanttView,CommentsView,CommentsKanban,ManagerFiche,ProjectModal,InitialAdd,CdpReport,CodirReport,Feux,CashInTab,LoginScreen,Series,ThemePicker}.js, releaseNotes.js, releaseCatalog.js(+test).

## v171 — Maquettes taste-skill appliquées : Liste, Gantt, fiche projet

- **Liste** (`components/DashboardSummary.js`, `TableView.js`, `SharedUI.js`) :
  - Vue d'ensemble : les 4 camemberts deviennent des barres horizontales triées (gamme, pays, chef de projet, une teinte `T.teal500`, 5 valeurs + « Autres ») et une barre découpée aux couleurs d'état (`ETAT_META[].bar`) avec sa légende chiffrée. Recharts n'y est plus utilisé ; la palette pastel `PALETTE` est retirée (choix validé avec la maquette). Titre « Vue d'ensemble » en casse normale, bouton replier nommé (`aria-expanded`). Clé `enogia-dashboard-collapsed` inchangée.
  - Tableau : en-tête sur le fond des lignes avec un filet de 1 px (plus de bandeau `surfaceAlt`) ; « Chef de projet » en casse normale ; pastille d'état sans ombre (`Badge`).
- **Gantt** (`components/GanttView.js`) : `DRIFT_STOPS`/`driftGradientColor` (dégradé continu) remplacés par `DRIFT_LEVELS`/`driftColor` : ≤ 3 j ou en avance = vert, 4–10 j = orange, > 10 j = rouge, sans initial = gris ; barre unie (50 % de la teinte sur la surface) ; trait de 2 px sous la barre = planning initial (arrivée → départ − écart) ; légende à 4 pastilles + trait.
- **Fiche projet** (`components/ProjectModal.js`) : en-tête n° de PJ (JetBrains Mono) + nom du projet + pastille d'état ; grille Chef de projet / Gamme / Pays / Départ (+ écart) ; les 4 étapes restent sur une ligne à largeur égale (demande d'origine) mais en barre segmentée (segment coloré une fois la date passée) avec libellé et date dessous, sans numéros ni majuscules ; libellés du formulaire et compteur de commentaires en casse normale.
- Vérifié par rendu statique (jsdom → HTML) en clair et en sombre, 768 px ; pas testé dans l'appli connectée.
- Fichiers : components/{DashboardSummary,TableView,SharedUI,GanttView,ProjectModal}.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v172 — Calendrier : plus d'infobulle, nom d'étape dans chaque case

- **Infobulle retirée** (demandé : « il y a toujours les petits pop-up ») : composant `CalTip`, `tipRef`/`setTip` et les `onMouseMove` des cases supprimés (`components/CalendarView.js`). Le survol garde la teinte de fond ; le clic ouvre toujours la fiche.
- **Nom d'étape rétabli en vue Jour** (demandé : « plus les noms des status par jours ») : la V170 n'affichait que la couleur sous la largeur d'un mot. Désormais mot entier quand il tient, sinon abréviation `STAGE_SHORT` (Arr., Prod, Tests, Fin, Dép.) ; largeur minimale de colonne = abréviation la plus longue mesurée (`SHORT_COL`) au lieu de 28 px. `aria-label` = libellé complet.
- Imports inutilisés retirés (`PRESENCE_META`, `fmt`).
- Fichiers : components/CalendarView.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v173 — Direction « Éditorial industriel » : fondations, accueil et liste

- **Thème « Atelier »** (`theme.js`, par défaut) : fond crème `#FAF7F1`, cartes blanches, filets `#E4DCCB`, encres marine (`#14203F`…), accent ocre (`#7A5C12` / encre `#6A4F0F`) ; sombre = surfaces du mode sombre validé + accent jaune `#F3C35B`. `check:contrast` : 1 509 vérifications, 0 échec (le nouveau thème ajoute 364 vérifications).
- **Clé de thème** : `enogia_theme` → `enogia_theme2` (`THEME_KEY`). L'ancienne clé était réécrite pour tout le monde à chaque visite : sans changement de clé, personne n'aurait vu le nouveau thème. Ardoise, Forêt et Cuivre restent au choix dans « Apparence ».
- **Menu latéral industriel** (`navTokens()` dans `theme.js`, `App.js`, `styles.css`) : pour le thème Atelier seulement, fond marine `#1B2A55` (sombre `#121A2E`), libellés `#C3CCE0` (8,6:1), titres de groupe en JetBrains Mono jaune, repère jaune de 4 px sur la page active (`--nav-mark`), anneau de focus jaune ; `ThemePicker` reçoit une couleur d'icône (`ink`). Les autres thèmes gardent le menu clair.
- **En-tête de page** (`PageHead`, toutes les pages sauf l'accueil) : sur-titre JetBrains Mono ocre en capitales, titre Roboto 300 de 32 px, filet marine de 3 px, apparition en fondu.
- **Plaque de n° de PJ** (`PjPlate` dans `SharedUI.js`) : JetBrains Mono, fond marine (clair) / `teal600` (sombre, 12:1).
- **Accueil** (`HomeView.js`) : sur-titre d'atelier (date · import · BU ORC), phrase du jour en Roboto 300 jusqu'à 34 px, repères en bande éditoriale (filet marine de 3 px, chiffres 40–56 px en trait fin qui se comptent, séparateurs verticaux), n° de PJ en plaques (liseré intérieur couleur d'état), parcours en blocs pleins de 32 px avec effectifs (encre `inkOn`), barre qui se déploie.
- **Liste** (`TableView.js`, `DashboardSummary.js`) : bordure gauche permanente de 4 px à la couleur d'état sur chaque ligne (la sélection reste marine), n° de PJ en plaque ; vue d'ensemble : sur-titre d'atelier, compteur des livraisons en grand chiffre léger animé, séparateur marine, barres plus épaisses qui se remplissent.
- **Transitions** (`styles.css`) : glissement des lignes de l'accueil au survol, soulèvement des repères ; tout est coupé sous `prefers-reduced-motion`.
- `CLAUDE.md` : section Design mise à jour (direction validée, taste-skill n'est plus la direction principale).
- Vérifié par rendu statique (jsdom → HTML, 1 100 px) en clair et en sombre ; pas testé dans l'appli connectée.
- Fichiers : theme.js, App.js, styles.css, components/{SharedUI,ThemePicker,HomeView,TableView,DashboardSummary}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v174 — Direction « Éditorial industriel » : Gantt, Calendrier, fiche projet

- **Plaque partagée** : `PjPlate` déplacé de `SharedUI.js` vers `pjMeta.js` (ré-exporté par `SharedUI`) pour servir `ProjectLabelCell`, la colonne « Machine » du Gantt et du Calendrier : plaque marine + liseré intérieur de 3 px à la couleur d'état (remplace la pastille ronde).
- **Gantt** (`GanttView.js`) : liseré marine en haut du cadre, titre « PLANNING » en sur-titre d'atelier + année en Roboto 300, note d'usage sans italique, en-tête de colonne « MACHINE » en sur-titre d'atelier ; « Par projet » actif en marine plein ; « Aujourd'hui » en bouton contour marine qui se remplit au survol.
- **Calendrier** (`CalendarView.js`) : cadre à liseré marine, apparition en fondu ; Semaine / Jour actif en marine plein ; période en Roboto 300 ; « MACHINE », « ÉTAPES » et « PRÉSENCE TESTS » en sur-titres d'atelier ; « Aujourd'hui » comme dans le Gantt.
- **Fiche projet** (`ProjectModal.js`) : grande plaque (`size="lg"`), nom du projet en Roboto 300 de 24 px, onglets soulignés (`role="tab"`, `aria-selected`, trait marine de 3 px) au lieu de pastilles.
- **Mode sombre** : les fonds marine pleins passent à `teal600` (`#C6D0EE`) avec texte `#0B1130` (12:1) ; survol des boutons via `--e-ind-bg` / `--e-ind-ink` posées par `App.js` (`.enogia-btn-ind`).
- Vérifié par rendu statique (jsdom → HTML, 1 100 px) en clair et en sombre ; pas testé dans l'appli connectée.
- Fichiers : pjMeta.js, App.js, styles.css, components/{SharedUI,GanttView,CalendarView,ProjectModal}.js, releaseNotes.js, releaseCatalog.js(+test).

## v175 — Direction « Éditorial industriel » : Modifications, Commentaires, Tests, Manager

- **Sur-titres d'atelier** : les petits libellés gris en capitales grasses (≈ 18) passent en JetBrains Mono 11 px, ocre (`T.accentInk`), espacement .1em — ChangesTable, CompareFiles, CommentsView, TestsTab (`Cap`, en-tête « Testeur »), ManagerPanel (en-têtes de tableaux, « Version du site »), ManagerParts, ManagerNav (titres de groupe), ManagerFiche (`Cap`, montants, « Projets », boutons de colonnes des composants).
- **Plaques de PJ** (`PjPlate`) : 14 n° de PJ affichés en texte dans les listes (ChangesTable, CommentsView, CommentsKanban, ManagerParts, ManagerPanel, ManagerFiche — grande plaque dans l'en-tête de la fiche synthèse). Le n° du graphique SVG « initial vs révisé » reste en texte (pas de HTML dans un SVG).
- **Chiffres clés du Manager** (`KpiRow`) : filet marine de 3 px en haut, chiffre Roboto 300 de 30–40 px, libellé dessous avec un petit carré de la couleur d'accent (au lieu de la bordure gauche colorée), apparition en fondu.
- **Commentaires** : titres en capitales grasses → Roboto 300 de 22 px.
- **Modifications** : le titre interne (doublon de l'en-tête de page) devient le sur-titre « JOURNAL DES IMPORTS » ; carte à liseré marine, sans ombre.
- Vérifié : rendu statique des chiffres clés et des Commentaires (thème Atelier, clair) ; build, tests, contraste. Pas testé dans l'appli connectée.
- Fichiers : components/{ChangesView,ChangesTable,CompareFiles,CommentsView,CommentsKanban,TestsTab,ManagerPanel,ManagerParts,ManagerNav,ManagerFiche}.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v176 — Retours bêta : vue d'ensemble compacte, plaques claires, accès fiche synthèse, thèmes

- **Vue d'ensemble de la Liste** (`DashboardSummary.js`) : retour aux camemberts colorés (demandé : « hauteur trop importante, je préfère les camemberts avec les couleurs »). Anneau Recharts de 76 px avec la légende à côté (4 valeurs + « Autres »), compteur des livraisons réduit (36–46 px), marges réduites. Couleurs : gammes `GAMME_COLORS`, états `ETAT_META[].bar`, pays et chefs de projet palette douce `PALETTE` (rétablie).
- **Plaques de PJ** (`PjPlate`, `pjMeta.js`) : fond `T.surfaceAlt` + filet `T.line` + texte `T.ink900` au lieu du marine plein (jugé « fond bleu bizarre »). Le liseré intérieur couleur d'état reste.
- **Accès direct à la fiche synthèse** (`ProjectModal.js`, `App.js`) : si `pinOk`, bouton « Fiche synthèse » dans l'en-tête de la fiche projet (Liste, Gantt, Calendrier) ; il émet l'événement `enogia:openSynthese` { pj } qu'`App` écoute pour ouvrir Manager › Fiche sur ce PJ (même mécanisme que la cloche des mentions : `managerJump`).
- **Thèmes** : Forêt et Cuivre retirés de `THEMES`. Un thème enregistré qui n'existe plus (`enogia_theme2` = foret/cuivre) retombe sur « Atelier ». `check:contrast` : 781 vérifications (2 thèmes en moins), 0 échec.
- Aucune nouvelle clé `localStorage`.
- Fichiers : components/{DashboardSummary,ProjectModal}.js, pjMeta.js, theme.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v177 — Nouvelle palette, police Cabinet Grotesk + Satoshi, icônes Phosphor (maquette validée, police A)

- **Palette** (deux nuanciers fournis par Gabriel : Regal Navy #0D3B66, Cornsilk #FAF0CA, Royal Gold #F4D35E, Sandy Brown #EE964B, Tomato #F95738, Light Blue #A8D5E2, Orange #F9A620, Mustard #FFD449, Forest Green #548C2F, Black Forest #104911) :
  - Thème Atelier (`theme.js`) : fond `#FCF8EA` (Cornsilk adouci), filets `#EBE2C4`, marine `#0D3B66` (structure, `teal500`/`navy700`), encres `#0D2238`…, accent or/ocre (`#8A6400`, sombre `#F4D35E`) ; menu latéral `#0D3B66` (sombre `#0B2440`) avec repère et titres de groupe or `#F4D35E`.
  - Étapes (`STAGE_HUES`, champ `solid` ajouté) : arrivée Light Blue · production Regal Navy · tests Royal Gold · fin prod Forest Green (aplat `#4A7D29` pour le contraste) · départ Black Forest. `stagePalette()` = aplats pleins (calendrier) avec encre `inkOn()`.
  - États (`pjMeta.js`) : une couleur par état via `etatFromColor()` → `etatColors()` (fond, encre, liseré dérivés, lisibles en clair et en sombre) : Expédiée Black Forest, Montage méca Regal Navy, Montage élec Light Blue, Tests Royal Gold, Packaging Forest Green, Fabrication FNR Sandy Brown, Stockage externe Mustard, Non commandée Tomato, Non désignée Orange, Slot libre gris.
  - Gammes (`GAMME_COLORS`) et camemberts (`PALETTE` de `DashboardSummary`) sur la même palette.
  - Alertes (communes aux thèmes) : `amber500` Orange, `emerald500` Forest Green, `ember500` Sandy Brown, `red500`/`redFill` tomate assombrie `#B8331A` (texte ≥ 4,5:1) ; variantes sombres éclaircies ; `stripeHues()` mis à jour.
  - **Correctif** : `lum`/`contrastRatio`/`readable`/`etatColors` remontés au-dessus de `ETAT_META` dans `pjMeta.js` (ils sont désormais appelés au chargement ; sinon l'appli plantait au démarrage — détecté par les tests).
- **Police** : Fontshare chargé dans `public/index.html` (Cabinet Grotesk 400–800, Satoshi 400–700) ; `T.fontDisplay` = Cabinet Grotesk, `T.font` = Satoshi (et `ROBOTO` de l'écran de connexion). JetBrains Mono reste chargé pour les identifiants, Roboto pour les rapports imprimés. Plaques de PJ en Cabinet Grotesk 800 ; sur-titres d'atelier (27) en Satoshi gras ocre, sans capitales (maquette) ; titres de groupe du menu en casse normale.
- **Icônes** : dépendance `@phosphor-icons/react` **2.1.7** (version fixée, intégrée au build) ; `NavIcon` garde ses 42 noms et rend l'icône Phosphor correspondante (`PH_ICONS`), aucun appel modifié.
- `check:contrast` : 731 vérifications, 0 échec. Bundle : 538 kB gzip.
- Vérifié par rendu statique (accueil, liste, calendrier) en clair et en sombre avec les vraies polices ; pas testé dans l'appli connectée.
- Fichiers : theme.js, pjMeta.js, App.js, public/index.html, package.json, package-lock.json, components/{SharedUI,LoginScreen,DashboardSummary,HomeView,CalendarView,GanttView,ChangesTable,ChangesView,CommentsView,CompareFiles,ManagerFiche,ManagerNav,ManagerPanel,ManagerParts,TestsTab}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v178 — Plus de place pour le contenu : en-tête, vue d'ensemble, Manager, Pilotage

- **En-tête** (`App.js`) : grand titre « Planning Ordonnancement » + « BU ORC » retirés (chaque page a son `PageHead`) ; barre collante (`position: sticky`) qui s'efface en fondu quand on descend (`hdrHidden` : fond et filet transparents, partie droite en opacité 0 / `visibility: hidden`, logo réduit sur une pastille) et revient dès qu'on remonte ou en haut de page (écoute de `window.scroll`, une lecture par image).
- **En-tête de page** (`PageHead`) : sur-titre, titre (26 px, Cabinet Grotesk 500) et sous-titre sur une même ligne de base, marges réduites.
- **Surligneur décalé** (`Hl` dans `SharedUI.js`, demandé : « les lignes de couleur sous la police, en décalé ») : trait épais (`text-decoration-thickness: .3em`, `text-underline-offset: -.08em`) posé sous le bas des lettres ; titres de page (or) et phrase du jour de l'accueil (couleur de l'étape / de l'alerte à 53 %).
- **Vue d'ensemble de la Liste** (`DashboardSummary.js`) : repli automatique au défilement (au-delà de 180 px), réouverture en haut de page (< 8 px), animé (`grid-template-rows` 1fr → 0fr + fondu) ; le choix manuel `enogia-dashboard-collapsed` est inchangé.
- **Manager** : bouton « Fiche plein écran » (clé `localStorage` `enogia_manager_focus`) — menu réduit aux icônes + liste des projets masquée en fondu (largeur 0, opacité 0) ; au survol ou au focus d'une icône du menu réduit, panneau des sous-pages (portail `role="menu"`, Échap pour fermer), clic = navigation (`ManagerNav.js`, `ManagerPanel.js`, `ManagerFiche.js`).
- **Pilotage aligné** (`ManagerFiche.js`, `styles.css`) : en-tête « Synthèse » sur la 1re colonne (les trois colonnes commencent au même niveau) ; cartes Statut global et Indicateurs clés en hauteur égale, « Commentaire de synthèse » calé en bas (`.enogia-pilot-card`) ; Indicateurs en grille 2 × 2 au lieu de 3 + 1.
- Nouvelle clé `localStorage` : `enogia_manager_focus`.
- Vérifié : test isolé du panneau des sous-pages (survol → menu → clic → navigation, fermeture) ; rendu statique de l'en-tête de page et de la phrase du jour. Pas testé dans l'appli connectée (défilement réel, Manager complet).
- Fichiers : App.js, styles.css, components/{SharedUI,HomeView,DashboardSummary,ManagerNav,ManagerPanel,ManagerFiche}.js, releaseNotes.js, releaseCatalog.js(+test).

## v179 — En-tête allégé, logo dans le menu, connexion refaite, déconnexion quotidienne

- **En-tête** (`App.js`) : logo retiré de la barre du haut et placé en haut du menu latéral (blanc sur le marine, bouton vers l'accueil) pour que la page commence au même niveau que le menu ; la barre ne garde que les outils, sans fond ni filet (toujours masquée au défilement). Nombre d'unités, dernier import et « Enregistré à » **réservés aux admins** (`pinOk`), sur une ligne compacte ; le bouton d'import l'était déjà.
- **Accueil** (`HomeView.js`) : ligne « date · import · BU ORC » et phrase « Vue adaptée à votre profil » retirées.
- **Connexion** (`LoginScreen.js`) : écran refait en direction Atelier — panneau marine (logo, « Toutes les machines ORC, de l'atelier à la livraison » avec surligneur sur « atelier », les trois usages du site avec icônes Phosphor), connexion Google en un clic (étape « Entrer » supprimée), messages d'erreur explicites (fenêtre bloquée, réseau), mention de la session quotidienne ; plus d'ombres internes néomorphiques. `LoginTransition` inchangée.
- **Déconnexion quotidienne** (`App.js`) : à la restauration de session, si `user.metadata.lastSignInTime` n'est pas aujourd'hui → `signOut` ; si le site reste ouvert, minuteur jusqu'à minuit + 5 s → `signOut`. Aucune écriture en base.
- Vérifié : rendu statique de la connexion (bureau) ; build, tests, contraste. Pas testé dans l'appli connectée.
- Fichiers : App.js, styles.css, components/{HomeView,LoginScreen}.js, releaseNotes.js, releaseCatalog.js(+test).

## v180 — Problèmes de l'audit ui-ux-pro-max (1/2)

- **Notifications** (`notify()` + `<Toaster/>` dans `SharedUI.js`, monté dans `App.js`) : les 34 `alert()` natifs (App, ManagerPanel, TableView) deviennent des notifications non bloquantes en bas à droite (`role="alert"` pour les erreurs, `role="status"` sinon), fermeture auto 4,5 s (8 s pour une erreur) ou manuelle, 4 au plus à l'écran. Le type est déduit du texte (« Erreur », « réservée », « incorrect »…). Les `confirm()` de suppression restent (choix explicite requis).
- **Synchronisation perdue** (`App.js`) : bandeau « hors ligne » (événements `online`/`offline`) ou « connexion aux données interrompue » (erreur de l'abonnement principal `DOC_REF`), avec bouton « Recharger ».
- **Liste — vues prêtes** (`TableView.js`, `COLUMN_PRESETS`) : « Atelier » (masque N° de série, pays, chef, gamme), « Direction » (masque série, commentaires, arrivée, tests, fin prod), « Tout afficher » ; même stockage des colonnes masquées qu'avant.
- **Gantt** (`GanttView.js`) : prochain jalon de chaque ligne mis en avant (22 px + anneau), jalons passés à 50 % d'opacité ; libellé « PLANNING » retiré (doublon de l'en-tête de page), années conservées.
- **Calendrier** : en vue Jour avec colonnes étroites, la légende rappelle l'abréviation de chaque étape.
- Déjà en place (vérifié) : squelette de chargement sur toutes les vues pendant le premier chargement (`LoadingSkeleton`), états vides sur 11 écrans.
- Reste à faire (audit) : vue tablette dédiée « mes machines du jour », abonnements Firestore secondaires sans gestion d'erreur (14), couleurs codées en dur hors thème (65, dont logo Google, nuancier et rapports).
- Vérifié : test isolé des notifications ; build, tests, contraste. Pas testé dans l'appli connectée.
- Fichiers : App.js, components/{SharedUI,ManagerPanel,TableView,GanttView,CalendarView}.js, releaseNotes.js, releaseCatalog.js(+test).

## v181 — Mouvement sobre et fonctionnel (ui-ux-pro-max)

- **Règles** (`styles.css`, bloc « v181 ») : 150–300 ms, uniquement `transform` / `opacity` / `scale`, fin sans transform résiduel, tout coupé par `prefers-reduced-motion` (règle globale existante).
- **Animations prévues et appliquées** :
  1. Changement de vue (`.enogia-main > *`) : fondu + glissement de 8 px, 240 ms.
  2. Barres (avancement, Gantt, répartition, parcours) : déploiement par `scale` depuis la gauche, 300 ms (remplace `clip-path` 700 ms) ; plus de transition de `width`.
  3. Anneaux d'avancement : fondu 300 ms (remplace le tracé `stroke-dasharray` 800 ms).
  4. Liste : les 12 premières lignes apparaissent avec 20 ms d'écart (`.enogia-table`).
  5. Squelettes de chargement : respiration d'opacité (remplace le reflet `background-position`).
  6. Clic : enfoncement `scale(.97)` ; survol des lignes et cartes conservé.
  7. Notifications : glissement depuis la droite 240 ms ; panneau des sous-pages du Manager : ouverture depuis l'icône 180 ms.
  8. Alertes (« Non commandée », pastille nouveautés) : 3 pulsations d'échelle puis immobiles (remplace le halo `box-shadow` infini).
- **Transitions de taille retirées** : largeur du menu latéral, du menu Manager et de la liste des fiches ; hauteur de la vue d'ensemble (désormais opacité + glissement) ; accordéon des sous-pages du menu Manager (fondu).
- Restent hors règle : transitions de couleur au survol (peinture seule, sans recalcul de mise en page) ; indicateur de diapositive de l'écran atelier (largeur).
- Aucune modification de logique ni de Firebase.
- Fichiers : styles.css, App.js, components/{ManagerNav,ManagerFiche,DashboardSummary,TableView}.js, releaseNotes.js, releaseCatalog.js(+test).

## v182 — 2e direction « Salle de contrôle », fin du néomorphisme

- **Thème « Salle de contrôle »** (`theme.js`, id `controle`) : sombre = ardoise dense (surface `#16202E`, carte `#1F2B3D`, filets `#33435C`, accent or `#F4D35E`, `teal500` `#4A73A3` pour le texte blanc ≥ 4,5:1) ; clair = gris industriel (`#EEF1F4`, cartes blanches, marine `#0D3B66`). Mêmes étapes, états et alertes que le thème Atelier. Menu latéral ardoise très sombre avec repère or (`navTokens`). Au choix dans « Apparence » ; « Atelier » reste par défaut.
- **Néomorphisme abandonné** : jetons renommés partout (59 occurrences, `src/` et `scripts/check-contrast.mjs`) — `neuPanel`→`panel`, `neuPanelDim`→`panelDim`, `neuOutSm`→`outline`, `neuOut`→`outlineSoft`, `neuInSm`→`insetSm`, `neuIn`→`inset`. Valeurs inchangées (déjà plates depuis V140).
- `check:contrast` : 1 095 vérifications (3 thèmes), 0 échec.
- `CLAUDE.md` : thèmes, néomorphisme et règles d'animation mis à jour.
- Vérifié : rendu statique de l'accueil en « Salle de contrôle » sombre ; build, tests, contraste.
- Fichiers : theme.js, scripts/check-contrast.mjs, components/{CommentsKanban,CommentsView,ManagerPanel,ProjectModal,SavedViews,SharedUI,TableView}.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v183 — ORDO & OPS – BU ORC, titres, connexion, transition, thème, courbes d'animation

- **Nom du site** (`src/siteName.js`, nouveau) : `SITE_NAME` « ORDO & OPS », `SITE_SCOPE` « BU ORC », `SITE_SUB` « Ordonnancement · Planning de production · Suivi des tests · Pilotage projets ». Repris dans le menu (sous le logo, menu déplié), le titre de l'accueil (+ sous-titre, la phrase du jour passe en paragraphe), l'écran de connexion, l'écran de transition, le titre de l'onglet (`document.title`, `public/index.html`) et `public/manifest.json`.
- **Titres de page** (`PageHead`, `App.js`) : sur-titre « Planning / Suivi » retiré ; titre 28–36 px, Cabinet Grotesk 600.
- **Thème Atelier retiré** (`theme.js`) : `DEFAULT_THEME` = `controle` ; une préférence `enogia_theme2 = atelier` retombe sur « Salle de contrôle ». `check:contrast` : 731 vérifications (2 thèmes), 0 échec.
- **Connexion** (`LoginScreen.js`) : carte du monde (`world-map-bg.svg`) en filigrane blanc à 12 % dans le panneau marine ; nom + sous-titre au-dessus de la phrase d'accroche.
- **Écran de transition** (`LoginTransition`) : refait (l'ancien « verre dépoli » jugé kitsch) — fond du menu, carte en filigrane, logo, nom surligné or, sous-titre, « Bienvenue, Prénom. Chargement du planning… », barre or de 1,8 s ; entrée échelonnée (60 ms), fondu de sortie à 1,95 s (avant le retrait à 2,2 s par `App`).
- **Animations, revue avec les skills animation-principles et motion-framer** : courbe d'entrée `--e-ease` = `cubic-bezier(.16,1,.3,1)`, courbe de sortie `--e-ease-in` = `cubic-bezier(.7,0,.84,0)` ; notifications avec sortie animée (180 ms) ; chiffres animés (`AnimatedNumber`) 700 → 300 ms. Motion (framer-motion) non ajouté : ~30 ko pour des sorties faisables en CSS.
- Vérifié : rendu statique de la connexion, de la transition et de l'accueil ; build, tests, contraste. Pas testé dans l'appli connectée.
- Fichiers : siteName.js, App.js, theme.js, styles.css, public/index.html, public/manifest.json, components/{SharedUI,HomeView,LoginScreen}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v184 — Gantt lisible (maquette validée)

- **Barres par étape** (`GanttView.js`) : une barre par machine (arrivée → départ) découpée en trois segments aux couleurs d'étape (`stageSoft().x.solid`) — production (arrivée → tests), tests (tests → fin prod), fin de prod (fin prod → départ) ; segments absents si la date manque. Machine « Non commandée » : barre en pointillés « dates prévisionnelles ». Les pastilles A/T/F/D sur la barre sont retirées (détail toujours dans l'infobulle).
- **Écart en clair** au bout de la barre : « à l'heure » / « −3 j » (vert), « +5 j » (orange, 4–10 j), « +12 j » (rouge, > 10 j), sur pastille pâle ; `aria-label` de la barre = étapes + écart.
- **Planning initial** : pointillés de 2 px sous la barre (au lieu d'un trait plein).
- **Lignes** : 60 px. **Correctif d'alignement** : les cellules de la colonne « Machine » faisaient 73 px (60 + marges intérieures, `content-box`) contre 61 px pour les lignes de barres — le décalage s'accumulait vers le bas. `box-sizing: border-box` sur les lignes et regroupements des deux colonnes : 60 / 34 px exacts, et la ligne « aujourd'hui » descend jusqu'en bas.
- **Légende** : segments d'étape, planning initial, aujourd'hui, dates prévisionnelles, paliers d'écart.
- Vérifié : rendu statique clair/sombre, alignement mesuré (positions identiques ligne à ligne). Pas testé dans l'appli connectée.
- Fichiers : components/GanttView.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v185 — Panneau Manager, thème mixte, couleur des titres, camemberts animés, droits des admins

- **Panneau des sous-pages (Manager)** (`ManagerNav.js`) : le nom de la page est lui-même le lien ; plus de bouton « Ouvrir » (les sous-pages restent listées dessous).
- **Thème Ardoise mixte** (`theme.js`) : clair inchangé ; sombre = celui de l'ex-thème Atelier (accent `#F4D35E` / encre `#F7DE84`, menu marine `#0B2440` à repère or via `navTokens`). Thème par défaut = `marine` ; **nouvelle clé `localStorage` `enogia_theme3`** (l'ancienne `enogia_theme2` valait « controle » pour tous ceux qui ont ouvert la bêta). « Salle de contrôle » reste au choix.
- **Couleur du trait sous le titre** (`PageHead` prop `accent`, `App.js`) : Liste marine, Gantt or, Calendrier vert forêt, Modifications brun sable, Commentaires magenta, Tests bleu clair ; accueil orange.
- **Vue d'ensemble** (`DashboardSummary.js`, `styles.css`) : cartes en cascade (90 ms), anneaux Recharts dessinés l'un après l'autre (600 ms, départ 120 ms + 120 ms par carte), total au centre de l'anneau en Cabinet Grotesk 800 avec petit rebond, lignes de légende en cascade (40 ms), part survolée légèrement agrandie ; **total d'en-tête en gras** (il ne l'était pas, contrairement au titre). Exception assumée à la règle 150–300 ms, à la demande de Gabriel (« effets plus poussés »).
- **Droits** (`roles.js`, `App.js`, `ManagerPanel.js`) : `isSuperAdmin()` = propriétaire **ou** admin → Réglages, suppressions, modification des fiches projet, rapport CODIR, turbines, puces… ouverts aux admins ; nouveau `isOwner()` = propriétaire seul → onglet Cash in, lien vers le Cash in depuis la fiche, lecture du Cash in complet et publication de la copie réduite (inchangé pour les admins : copie réduite en lecture seule), copie des données vers la bêta, lignes de nouveautés « réservées ». Le PIN reste demandé pour les suppressions. **À vérifier côté Firestore** : si les règles de sécurité réservent certaines écritures ou suppressions à l'adresse du propriétaire, elles refuseront encore les admins (l'interface les autorise désormais).
- Fichiers : roles.js, theme.js, App.js, styles.css, components/{ManagerNav,ManagerPanel,SharedUI,HomeView,DashboardSummary}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v186 — Page Tests par semaine (maquette validée)

- **Vue « Par semaine »** (`TestsTab.js`, `WeekBoard` + `TestCard`), nouvelle vue par défaut : trois colonnes (cette semaine, semaine prochaine, dans 2 semaines, n° de semaine ISO) ; une carte par machine dont la période de tests (`tests` → `testsFin`) touche la semaine, rangée dans la première semaine concernée. Carte : plaque PJ, présence client/NOBO, dates, projet, avatars des testeurs, « Sans testeur » / « Conflit » / « En retard », barre et compteur « faits / à réaliser ». Liseré gauche : rouge (sans testeur ou en retard), or (en cours), vert (tout fait). Les machines dont la période est passée sans que tout soit fait restent dans la 1re colonne (« En retard »). Case « Seulement mes tests » pour les testeurs.
- **Volet de détail** à droite (collant) : la fiche existante (`FatSheet`, mode `panel`) — infos, testeurs et dates, présence, puis une **checklist** (`Checklist`) des seuls tests retenus avec une case « fait » ; « Modifier la liste des tests » (admins) réaffiche tout le catalogue pour choisir les tests à réaliser. Commentaires par test et test libre conservés. Testeurs : consultation.
- **Onglets** : Par semaine / Par testeur / Catalogue (admins). L'ancienne liste de fiches dépliables est retirée ; un clic sur une barre du planning des testeurs ouvre la machine dans la vue par semaine.
- **Données** (`testPlan.js`) : nouveau champ `plans[pj].done = { interne: [ids], client: [ids], nobo: [ids] }` dans le document Tests existant ; helpers `doneIds`, `toggleDone`, `progressOf` (+2 tests). Rétrocompatible, aucune migration ; pas de nouvelle clé `localStorage`.
- Vérifié : rendu statique clair/sombre, build (13 avertissements existants), 115 tests, contraste 0 échec. Pas testé dans l'appli connectée.
- Fichiers : testPlan.js(+test), components/TestsTab.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v187 — Les testeurs renseignent leurs tests, validation forcée, gamme, titres

- **Statut par test** (`testPlan.js`) : `plans[pj].st = { interne: { idTest: "wip"|"ok"|"ko" } }` et `plans[pj].stBy = { interne: { idTest: { by, at } } }` (nom et horodatage, pour la future fiche PDF). « Fait » = réussi ou échec ; `progressOf` renvoie aussi `ok`, `ko`, `wip`. Les listes `plans[pj].done` de la V186 (non publiée) restent lues comme « réussi ». +2 tests.
- **Droits** (`TestsTab.js`) : le testeur affecté à une machine renseigne le statut et les commentaires de ses tests (sélecteur À faire / En cours / Réussi / Échec) ; le choix des tests et des testeurs reste aux admins. L'écriture passe par le même document `planning/tests` : **à vérifier côté règles Firestore** que les testeurs (non admins) ont le droit d'y écrire, sinon leur enregistrement échouera avec un message.
- **Validation forcée** (admins) : `plans[pj].forced = { by, at }`, proposée dans le volet quand la période de tests est terminée ; la carte passe « Validé (forcé) » (liseré vert), sort de « En retard » et de « Sans testeur ». Annulable.
- **Cartes** : gamme affichée (pastille) ; pastille « N échecs ». Volet : gamme à côté du nom du projet.
- **Étiquettes** de la fiche (PJ, ORC, Certification, FAT client…) : Cabinet Grotesk 500 grise au lieu de Satoshi gras ocre.
- **Titres** : `PageHead` 32–44 px (au lieu de 28–36) ; le titre « Tests (FAT) » répété sous l'en-tête de la page Tests est retiré.
- Pas de nouvelle clé `localStorage`, pas de migration.
- Vérifié : rendu statique (vue testeur), build (13 avertissements existants), 117 tests, contraste. Pas testé dans l'appli connectée.
- Fichiers : testPlan.js(+test), components/{TestsTab,SharedUI}.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v188 — Accueils par rôle, personnes et rôles, notifications d'affectation, Google Agenda, police des étiquettes

- **Profils** (`src/profiles.js`, nouveau) : document Firestore `planning/profiles` (bêta `beta_profiles`, ajouté à `BETA_DOCS`) : `{ byEmail: { [userKey(email)]: { email, name, role, pjs:[], chefs:[] } } }`. `role` = `direction` | `cdp` | `testeur` | `atelier` | `""` (automatique : propriétaire → direction, testeur de la liste → testeur, nom sur des fiches → chef de projet). `chefs` = noms de chef de projet des fiches → tous leurs PJ, y compris les futurs. Lu par tous les comptes connectés, écrit depuis le Manager. La règle générale `planning/{docId}` couvre ce document (comme les autres).
- **Manager › Réglages › Personnes et rôles** (`components/PeopleRoles.js`, nouveau) : liste des comptes connus (et ajout par e-mail), rôle, PJ un par un ou par chef de projet.
- **Accueil** (`HomeView.js` + `components/RoleHome.js`, nouveau) : blocs validés — testeur (tests du jour avec avancement, fiches à signer, sa semaine, ses remarques ; sans les 4 grands chiffres) ; chef de projet (PJ et retards, jalons des 3 semaines, FAT client/NOBO à venir, mentions) ; direction (tests : en test, sans testeur, échecs, en retard, conflits ; turbines : critiques, en retard, à communiquer ; raccourci Cash in ; alertes ; charge atelier sur 4 semaines ; postes de test ; départs ; parcours) ; chef d'atelier (arrivées et départs de la semaine, postes de test). Sans rôle : l'accueil d'avant (« Général », personnalisable). Les admins ont un sélecteur « Mon accueil / Direction / Chef de projet / Testeur / Chef d'atelier / Général » (`localStorage` **`enogia_home_role_<email>`**). Pas de fond (choix de Gabriel).
- **Cloche** (`MentionBell.js`) : nouvelles affectations aux tests depuis le dernier « Vu » (`localStorage` **`enogia_assign_seen_<email>`**), avec « Ajouter à mon agenda ». Les affectations portent désormais `by` / `at` (`assignTester`, `assignmentsSince`) ; celles d'avant la v188 ne notifient pas.
- **Google Agenda** (`src/gcal.js`, nouveau) : lien « nouvel événement » prérempli (journée entière, période de tests, testeurs invités, lieu). Aucune clé d'API : l'événement s'ouvre dans le compte Google de la personne, qui clique « Enregistrer » pour envoyer les invitations. Bouton « Inviter les testeurs (Google Agenda) » sur la fiche de tests (admins).
- **Police des étiquettes** : IBM Plex Sans (Google Fonts, `public/index.html`), jeton `T.fontLabel` ; étiquettes de la fiche de tests, pastilles des cartes, sélecteur de statut.
- +2 tests (119). Vérifié : rendu statique des 4 accueils et du réglage, build (13 avertissements existants), contraste. Pas testé dans l'appli connectée.
- Fichiers : profiles.js, gcal.js, testPlan.js(+test), theme.js, App.js, public/index.html, components/{HomeView,RoleHome,PeopleRoles,MentionBell,ManagerPanel,TestsTab}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v189 — Tests : pop-up central, calendrier refait, fiche PDF signée (maquettes validées)

- **Pop-up central** (`TestsTab.js`, `TestDialog`) : le tableau par semaine passe en pleine largeur ; un clic sur une carte ouvre la fiche au centre (fond assombri, entrée 200 ms fondu + montée, Échap / clic à côté pour fermer, défilement de la page bloqué) : plaque, gamme, projet, période, 4 chiffres (avancement, réussis, échecs, en cours), barre d'avancement, puis la fiche (validation forcée, testeurs, présence, tests, signatures). Survol des cartes : léger soulèvement (transform). `prefers-reduced-motion` respecté (`styles.css`, bloc v189).
- **Calendrier des tests** (`TesterTimeline`, onglet « Par testeur ») : 10 jours ouvrés (2 semaines, navigation par 2 semaines), une ligne par testeur ; barres colorées (interne or, client bleu clair, NOBO couleur NOBO) avec PJ, gamme et « faits / total » ; chevauchement encadré orange ; ligne « Sans testeur » en pointillés rouges (hors validations forcées). **Glisser-déposer** (admins) : une barre lâchée sur un testeur l'affecte (depuis un autre testeur, la machine change de testeur).
- **Signatures** (`Signatures`, `SignaturePad`) : « Réalisé par » = chaque testeur affecté (il ne signe que pour lui) ; « Vérifié par » = l'admin connecté ; signature au doigt ou à la souris (pointer events, repère 300 × 100, tracés compacts). **Stockage** : le tracé va dans un document par PJ, `planning/testsign_<PJ>` (bêta `beta_testsign_<PJ>`) via `signApi` (`App.js`), pour ne pas alourdir `planning/tests` ; `plans[pj].signs = { "t:<id>" | "v:<nom>": { name, fn, at } }` garde l'état « signé ». L'accueil testeur « Fiches à signer » ne montre plus que celles qu'il n'a pas signées. Règle Firestore : la règle générale `planning/{docId}` couvre ces documents.
- **Fiche PDF** (`src/testReport.js`, nouveau) : procès-verbal d'après « Template Word CdC » — bandeau ENOGIA du modèle (`public/report/cdc-banner.jpg`, + `cdc-logo.png`), identification (document, projet, gamme, client, chef de projet, période, présence, début / fin des saisies, certification, testeurs, validation forcée), compteurs, tableau des tests par partie (résultat, par, date · heure, commentaire), tableau de validation Nom / Fonction / Visa (signatures, case Client / NOBO à signer sur papier), pied de page société. Ouverte dans un nouvel onglet : « Imprimer / Enregistrer en PDF ».
- Pas de nouvelle clé `localStorage`. Vérifié : rendu statique du pop-up, du calendrier et de la fiche PDF ; build (13 avertissements existants), tests, contraste. Pas testé dans l'appli connectée (signature au doigt à essayer sur tablette).
- Fichiers : testReport.js, testPlan.js, App.js, styles.css, public/report/cdc-banner.jpg, public/report/cdc-logo.png, components/{TestsTab,RoleHome}.js, releaseNotes.js, releaseCatalog.js(+test).

## v190 — Fiches projet par chef de projet (maquette A) et fiche PJ de la Liste redessinée (maquette B)

- **Fiches projet** (`ManagerFiche.js`) : la liste de gauche se regroupe « Par chef » (défaut), « Tous » ou « Mes PJ » (PJ associés dans Personnes et rôles + ceux à votre nom ; `localStorage` **`enogia_mlist_group`**). Chaque groupe a un en-tête collant (replier / déplier, nombre de PJ, « N en retard »). Un clic sur le nom du chef affiche **tous ses projets en cartes** (`ChefOverview`) à la place de la fiche : étape, gamme, pays, écart, prochain jalon, avancement ; en-tête avec le nombre de projets, en cours, en retard, FAT client / NOBO à venir. Un clic sur une carte ou une ligne ouvre la fiche. `profiles` est passé de `ManagerPanel` à `ProjectFileManager`.
- **Fiche PJ de la Liste / Gantt / Calendrier** (`ProjectModal.js`, volet et pop-up) : en-tête sur une ligne (plaque, état, gamme, projet ; pays, chef, n° de série, présence, « Modifier » dessous) ; **parcours en 5 étapes** (Arrivée, Production, Tests, Fin prod, Départ — étapes atteintes en couleur pleine, étape en cours encadrée, écart au départ) à la place des 4 barres ; **4 chiffres clés** (prochain jalon, écart initial, client / NOBO, commentaires) ; aperçu du dernier commentaire (clic → onglet Commentaires) ; calendrier des mois inchangé ; **barre d'actions collée en bas** (Commenter, Déclarer un retard, Fiche synthèse) ; le bouton « Fiche synthèse » quitte l'en-tête.
- Pas de nouvelle donnée Firestore. Vérifié : rendu de la liste regroupée + vue d'ensemble (rendu client jsdom) et du volet ; build (13 avertissements existants), tests, contraste. Pas testé dans l'appli connectée.
- Fichiers : components/{ManagerFiche,ManagerPanel,ProjectModal}.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v191 — Menus repliés, accueil réglé par le super admin, Cash in à l'accueil, chefs multiples, EPC, expédiées masquées

- **Menu principal** (`App.js`) : réduit (64 px) par défaut, il s'ouvre **par-dessus** la page au survol ou au clavier (délai 120 ms, fermeture 180 ms) ; le bouton du bas l'épingle ouvert. Nouvelle clé `localStorage` **`enogia_nav_pin`** (remplace `enogia_nav_min`, ignorée). Dans le Manager : même comportement.
- **Menu du Manager** (`ManagerNav.js`, `useRailCollapsed`) : réduit par défaut (icônes + sous-pages au survol) ; « agrandir » l'épingle. Nouvelle clé **`enogia_manager_rail_pin`** (remplace `enogia_manager_rail_min`).
- **Accueil** (`HomeView.js`) : plus de sélecteur « Mon accueil / Direction / … » ; le rôle vient du profil (Manager › Réglages › Personnes et rôles), et le super admin coche pour chaque personne **les blocs de son accueil** (`profiles.byEmail.*.blocks`, absent = tous ; `ROLE_BLOCKS`, `blockOn` dans `profiles.js`). La clé `enogia_home_role_<email>` n'est plus lue.
- **Cash in sur l'accueil direction** (`RoleHome.js`, `cashOverview` dans `cashinLink.js`, +1 test) : encaissé, facturé en attente, en retard de paiement, à facturer, attendu sous 30 jours (hors EPC), et les 3 paiements les plus en retard. Lit le Cash in déjà chargé par l'appli pour le propriétaire (aucune nouvelle lecture). Avant : simple raccourci, d'où « pas d'info ».
- **Plusieurs chefs de projet / EPC / chef ORC** (`pjMeta.js` : `chefsOf`, `isEpc`, `EpcTag` ; `components/ChefsEpc.js`, nouveau) : nouveaux champs de fiche dans `planning/pjMetaOverrides` : `chefsExtra:[noms]`, `epc:true`, `chefOrc:"nom"`. Saisie dans « Modifier » de la fiche PJ (Liste / Gantt / Calendrier) et « Chefs / EPC » dans l'en-tête de la fiche projet du Manager (super admin). Pastille **EPC · chef ORC** sur la fiche, la liste du Manager, la vue d'ensemble d'un chef et la colonne PJ de la Liste. Un PJ apparaît chez chacun de ses chefs (regroupement par chef, « Mes PJ », accueil chef de projet, profils, filtre Chef de la Liste, liste des chefs connus).
- **Machines expédiées** : masquées de base dans la liste des fiches projet du Manager (case « Expédiées »). Liste, Gantt, Calendrier (filtre État) et Tests les masquaient déjà.
- **Camemberts** (`DashboardSummary.js`) : total au centre retiré.
- Vérifié : build (13 avertissements existants), 120 tests, contraste ; rendu de la fiche EPC et de l'accueil direction avec Cash in. Pas testé dans l'appli connectée.
- Fichiers : App.js, pjMeta.js, profiles.js, cashinLink.js(+test), components/{ChefsEpc,HomeView,RoleHome,PeopleRoles,ManagerNav,ManagerFiche,ProjectModal,TableView,DashboardSummary}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v192 — Palette d'état A, étiquettes Client / NOBO, palette des camemberts (choix de Gabriel)

- **États** (`pjMeta.js`, `ETAT_META`) : Non commandée `#D62839`, Non désignée `#C77DFF`, Fabrication FNR `#E76F51`, Stockage externe `#8D99AE`, Montage méca `#1D3557`, Montage élec `#48CAE4`, Tests `#FFB703`, Packaging `#2A9D8F`, Expédiée `#2D6A4F`, Slot libre `#CED4DA`. Fonds et textes toujours dérivés par `etatColors()` ; en sombre, la barre / le point est désormais éclairci jusqu'à 3:1 sur la surface (`visibleOn`) — un marine foncé disparaissait. Les états créés dans Réglages gardent leur couleur. Les couleurs d'étape (Gantt, calendrier, accueil) ne changent pas.
- **Présence** (`PresenceChip`, `PRESENCE_META`) : étiquette d'atelier — fond de carte, filet, liseré gauche bleu acier `#457B9D` (client) / rouge `#C1121F` (NOBO), icône personne / bouclier, libellé IBM Plex Sans et date ; « Client + NOBO » = deux étiquettes. `bg` / `ink` de `PRESENCE_META` ajustés aux nouvelles teintes (rapport CODIR, tests, Manager).
- **Camemberts** (`DashboardSummary.js`) : palette catégorielle `#4E79A7 #F28E2B #E15759 #76B7B2 #59A14F #B07AA1 #EDC948 #FF9DA7 #9C755F` pour pays et chefs ; « État » suit la nouvelle palette d'état.
- Pas de nouvelle donnée ni clé `localStorage`. Vérifié : rendu des états et des étiquettes en clair / sombre, build (13 avertissements existants), 120 tests, contraste 0 échec.
- Fichiers : pjMeta.js, components/DashboardSummary.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v193 — Cash in intégré au site, étape 1 (maquette validée)

- **Manager › Cash in** (`components/CashInNative.js`, nouveau) : la page n'est plus `public/cashin.html` dans un cadre. En haut : état d'enregistrement, Liaisons avec l'ordo, Sauvegarde JSON, Importer un fichier… (reprise JSON, comme avant), **Exporter en Excel**, « Ancienne page ». Chiffres clés (encaissé, facturé en attente, en retard, reste à facturer, attendu sous 30 j — hors EPC, `cashOverview`). **À traiter** : paiements en retard, factures à émettre en retard, échéances dans les 15 j (clic → volet). Onglet **Jalons** : recherche (PJ, jalon, n° de facture, commentaire, nom du projet), filtre par statut, « Masquer les payés » (par défaut), « Masquer EPC », groupes par PJ repliables (encaissé / montant du projet, « ＋ jalon »), « ＋ PJ ». **Volet** à droite : jalon, montant, délai, n° de facture, dates de facture (initiale, prévue, émise) et de paiement (initial calculé, prévu, reçu), EPC, commentaire, causes (lecture), nom et montant du projet, « Marquer payé aujourd'hui », suppression en deux clics. Onglets Projets / Cash par mois / Écarts : étape 2 (renvoi vers l'ancienne page).
- **Règles de calcul** (`src/cashinModel.js`, nouveau, +4 tests) : reprises à l'identique de l'ancienne page (`applyEdit` : délai de 30 j par défaut, facture prévue = initiale, encaissement prévu = facture + délai, encaissement initial recalculé, statut dérivé). **Enregistrement** : document entier `planning/cashin`, 500 ms après la dernière modification, validé (`validateCashin`, taille ≤ 900 Ko) — même forme qu'avant ({ rows, labels, totals, owners, updatedAt }), rien à migrer. Une modification venue d'ailleurs n'écrase pas une saisie en cours.
- **Export Excel** : ExcelJS 4.4.0 chargé à la demande (cdnjs, comme l'ancienne page), feuilles « Suivi cash in » et « Synthèse PJ ».
- **Ancienne page** : toujours disponible (bouton « Ancienne page », `localStorage` **`enogia_cashin_legacy`** ; « Version intégrée » pour revenir). À retirer après l'étape 2.
- Vérifié : rendu de l'onglet (jsdom) et parcours « ouvrir un jalon → Marquer payé → enregistrement » ; build (13 avertissements existants), 124 tests, contraste. Pas testé dans l'appli connectée avec vos vraies données.
- Fichiers : cashinModel.js(+test), components/{CashInNative,CashInTab}.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v194 — Cash in intégré au site, étape 2 : Projets, Cash par mois, Écarts

- **Calculs** (`src/cashinModel.js`, +3 tests) repris de l'ancienne page : `groupStats` (payés, encaissé, facturé en attente, reste à facturer, prochain encaissement), `punctual` (tenue de la date vs encaissement initial), `monthKeys` / `monthly` (initial vs réel + actualisé par mois), `matrixItems` / `monthRange` (PJ × mois), `retard` / `retardFact`, les 6 indicateurs `ECARTS`, `ecartGroups` (mois, semaine, PJ, CdP, jalon ; moyenne ou pire écart) et `ecartKpis`.
- **Vues** (`components/CashInViews.js`, nouveau), branchées dans `CashInNative.js` :
  - **Projets** : une ligne par PJ (jalons payés, montant du projet dont EPC, encaissé, facturé en attente, reste à facturer, prochain encaissement, barre encaissé / facturé), total ; clic → onglet Jalons filtré sur le PJ.
  - **Cash par mois** : initial vs réel et actualisé (encaissé + prévu), écart, tenue des dates ; mois passés regroupés par année (dépliables), « Sans date » ; clic sur un mois → jalons « réel et actualisé » et « prévu au départ ». **Cash par PJ et par mois** : tableau en k€ (vert = reçu, gris = prévu, mois en cours encadré), clic sur une case ou un total → jalons concernés.
  - **Écarts** : 4 chiffres clés (retard moyen de paiement, % payés en retard, glissement moyen des encaissements, plus gros retard), barres divergentes par indicateur / regroupement / mesure (clic → jalons), détail par PJ et par jalon des 6 écarts.
  - Un clic sur un jalon, dans n'importe quelle liste, l'ouvre dans l'onglet Jalons avec son volet.
- L'ancienne page reste accessible (« Ancienne page ») le temps de comparer ; à retirer quand vous l'aurez validé.
- Pas de nouvelle donnée ni clé `localStorage`. Vérifié : rendu et parcours des trois onglets (jsdom), build (13 avertissements existants), 127 tests, contraste. Pas testé avec vos vraies données.
- Fichiers : cashinModel.js(+test), components/{CashInViews,CashInNative}.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v195 — Menu à la flèche, légende des camemberts, signature en image, chefs libres, accueil en grille, Cash in au format artefact

- **Menu principal** (`App.js`) : toujours en mini-barre (64 px) ; plus d'ouverture au survol (il fallait garder la souris 1 s dessus). La flèche du bas ouvre le menu complet **par-dessus** la page ; il se replie quand on choisit une page, quand la souris le quitte (350 ms) ou avec Échap. La clé `enogia_nav_pin` n'est plus utilisée.
- **Camemberts** (`DashboardSummary.js`) : légende en grille — colonne des noms à la largeur du plus long (18 caractères max), chiffre juste après au lieu d'être rejeté à droite ; total du bloc collé au titre.
- **Fiche PDF des tests** (`testReport.js`) : plus de « Client » dans l'identification, plus de « Vérifié par » ni de case Client / NOBO ; tableau « Signatures » = un « Réalisé par » par testeur affecté, avec le nom et la fonction saisis et l'**image** de la signature.
- **Signature** (`TestsTab.js`, `Signatures` / `SignForm`) : le testeur (ou un admin) saisit Nom, Fonction et dépose une image PNG / JPG de sa signature, réduite à 360 × 120 px (PNG, ≤ 150 Ko) et stockée dans `planning/testsign_<PJ>` (`{ name, fn, at, img }`) ; « Remplacer la signature » possible. Les anciennes signatures tracées (`paths`) s'impriment toujours. Le bloc de tracé à la souris est retiré.
- **Chef de projet** (`ProjectModal.js`, « Modifier ») : champ libre avec la liste des chefs connus en suggestion (au lieu d'une liste fermée) ; les « autres chefs » l'étaient déjà.
- **Accueil** (`RoleHome.js`, `styles.css`) : tuiles en grille (`.enogia-home-grid`, colonnes de 300 px min., remplissage dense) ; listes longues (tests du jour, ma semaine, mes PJ, arrivées et départs, alertes) sur 2 colonnes à partir de 980 px. Apparition : fondu + montée de 12 px et léger zoom, 420 ms, cascade de 70 ms (exception assumée à la règle 150–300 ms, à la demande de Gabriel) ; `prefers-reduced-motion` respecté.
- **Cash in** (`CashInTab.js`) : le format de l'artefact (page `public/cashin.html` dans le site) est de nouveau affiché par défaut ; « Nouvelle présentation » ouvre la version refaite (V193-V194), « Format artefact » y revient. Nouvelle clé `localStorage` **`enogia_cashin_format`** (`artefact` / `nouveau`), qui remplace `enogia_cashin_legacy`.
- Vérifié : build (13 avertissements existants), tests, contraste. Pas testé dans l'appli connectée (dépôt d'une image de signature à essayer).
- Fichiers : App.js, styles.css, testReport.js, components/{DashboardSummary,TestsTab,ProjectModal,RoleHome,CashInTab,CashInNative}.js, releaseNotes.js, releaseCatalog.js(+test).

## v196 — Espace Manager réorganisé (maquette validée)

- **Un seul menu** (`App.js`, `ManagerPanel.js`) : sur ordinateur, le rail du Manager n'est plus affiché ; `ManagerPanel` publie ses rubriques (`onNav` → état `mgrNav` d'App) et le menu du site les affiche à la place des pages du planning (icônes en mini-barre, libellés quand on l'ouvre avec la flèche), avec « Revenir au planning » en haut. En quittant le Manager, le menu redevient celui du site. Sur téléphone, le rail horizontal reste.
- **En-tête commun** à toutes les sous-pages : titre de la rubrique, une phrase de description (`PAGE_DESC`), à droite « Plein écran » (Fiche projet), « Filtres · N » (KPI et Suivi) et « Aller à… Ctrl K ». Le fil d'Ariane est retiré.
- **Sous-pages en onglets soulignés** sous le titre (KPI : Synthèse, Dérives, Charge, Avancement, Retards ; Suivi ; Réglages…), défilables horizontalement si besoin.
- **Filtres** (Statut, Gamme) repliés dans le bouton « Filtres », qui affiche le nombre de filtres actifs.
- **Planning initial** : la tuile (état, import initial, ajout de PJ) passe en haut de **Réglages › Imports**.
- **Fiche projet** : la liste se replie en languette verticale « Projets · N » (44 px) ; la fiche prend alors toute la largeur. (Le mode « mini-liste » de numéros est remplacé par cette languette.)
- **Règles communes** : contenu du Manager limité à 1 440 px de large.
- Pas de nouvelle donnée ni clé `localStorage`. Vérifié : rendu de l'espace Manager (jsdom : menu publié, titre, phrase, onglets), build (13 avertissements existants), tests, contraste. Pas testé dans l'appli connectée.
- Fichiers : App.js, components/{ManagerPanel,ManagerFiche}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v197 — Thème unique, Manager pleine largeur, tests compacts, Liste sans point de dérive, EPC → chef ORC

- **Thème unique** (`theme.js`) : `THEMES` ne contient plus que `marine` (libellé « ENOGIA ») — clair = Ardoise, sombre = ex-« Salle de contrôle » ; `navTokens` : menu clair en clair, menu ardoise très sombre à repère or en sombre. Le choix de thème disparaît du sélecteur (`ThemePicker`), il reste clair / sombre. Une ancienne préférence `controle` retombe sur le thème unique. `check:contrast` : 367 vérifications (1 thème), 0 échec.
- **Accueil** : la phrase du jour tient sur une ligne (taille 18–28 px, plus de largeur max) ; les montants des tuiles ne passent plus à la ligne (« € » collé au nombre, tuile Cash in en colonnes de 150 px min.).
- **Manager** : plus de largeur max (pleine largeur) ; règles communes dans toutes les sous-pages (`styles.css`, `.enogia-mgr-main`) — en-têtes de tableau 12 px gris, casse normale, collés en haut au défilement ; lignes ≥ 36 px ; chiffres tabulaires ; filets de 1 px ; grilles au pas de 12 px.
- **Tests** (`TestsTab.js`, `TestCard`) : chaque semaine est une carte, chaque machine une ligne compacte (≈ 44 px) — plaque, gamme, projet, dates ; puis testeurs, présence, signaux (sans testeur, en retard, échecs, conflit, validé), barre et « faits/total » à droite. Colonnes de 300 px min.
- **Liste** (`TableView.js`) : le point de dérive à côté du PJ est retiré (l'écart est déjà affiché dans la colonne Départ) ; l'étiquette de l'import (nouveau / modifié) reste.
- **EPC** (`pjMeta.js`, `chefsOf`) : pour un projet EPC avec un chef de projet ORC, c'est lui qui figure dans les listes, regroupements par chef, filtres et accueil, à la place du chef classique (les autres chefs restent).
- Vérifié : rendu de la page Tests en clair / sombre, build (13 avertissements existants), tests, contraste. Pas testé dans l'appli connectée.
- Fichiers : theme.js, pjMeta.js, styles.css, App.js (version), components/{ThemePicker,HomeView,RoleHome,ManagerPanel,TestsTab,TableView}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v198 — Cash in : le grand tableau modifiable de l'artefact, reconstruit dans le site

- **Onglet Jalons** (`components/CashInGrid.js`, nouveau, branché dans `CashInNative.js`) : mêmes colonnes que l'artefact — Jalon · Montant · % · EPC | **Prévu au départ** (facture, délai, encaissement calculé) | **Prévu, actualisé** (facture, encaissement) | **Réel** (facture émise, paiement client) | Statut · Commentaire · ✕. Toutes les cellules se modifient sur place (texte et nombres à la sortie du champ, dates et cases à cocher tout de suite), avec les règles de calcul de l'artefact (`cashinModel.applyEdit`). En-têtes collés en haut, colonne Jalon collée à gauche, tableau défilant (hauteur de l'écran).
- **Ligne de groupe par PJ** : numéro modifiable (renomme le PJ : jalons, nom, montant du projet et chef suivent ; refusé si le numéro existe), nom du projet, montant du projet, chef de projet (`owners`, avec la liste des chefs connus), « PJ EPC » (tous les jalons du PJ), encaissé / total et %, « ＋ jalon », repli.
- **Commentaire** : la cellule ouvre le volet du jalon (commentaire, causes, « Marquer payé aujourd'hui », suppression). Suppression aussi depuis la colonne ✕ (deux clics).
- **Affichage par défaut** (`CashInTab.js`) : le Cash in du site (avec ce tableau) ; « Ancienne page » ouvre toujours `public/cashin.html` ; clé `enogia_cashin_format` (`artefact` pour garder l'ancienne page).
- Données inchangées (`planning/cashin`, même forme). Vérifié : rendu du tableau et parcours « Commentaire → Marquer payé », renommage d'un PJ, enregistrement (jsdom) ; build (13 avertissements existants), tests, contraste. Pas testé avec vos vraies données.
- Fichiers : components/{CashInGrid,CashInNative,CashInTab}.js, styles.css, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v199 — Liste : détail déplié sous la ligne (maquette A validée)

- **Liste** (`TableView.js`) : un clic sur une ligne insère, juste dessous, une ligne de détail (`.enogia-row-detail`, pleine largeur visible, 1 100 px max, collée à gauche au défilement horizontal) ; un second clic, la croix ou Échap la replie ; une seule ligne ouverte à la fois ; la page fait défiler jusqu'au détail. **Le volet de droite et le pop-up central sont retirés de la Liste** (la Liste prend toute la largeur ; le lien « Réduire le volet » des colonnes masquées disparaît ; clé `enogia_panelCollapsed` plus lue). Le menu « Actions » (clic droit) ouvre aussi le détail.
- **Détail** (`ProjectModal.js`, mode `embedded`) : sans fenêtre ni en-tête répété (ni plaque, ni état, ni bascule Volet / Pop-up) ; liseré de la couleur d'état à gauche ; métadonnées (pays, chefs, n° de série, présence, Modifier), parcours en 5 étapes, chiffres clés, onglets Aperçu / Commentaires / Retards (dernier commentaire en aperçu, sans le calendrier des mois), actions Commenter / Déclarer un retard / Fiche synthèse.
- Gantt et Calendrier gardent leur fiche (volet ou pop-up, au choix).
- Pas de nouvelle donnée. Vérifié : clic → détail déplié, re-clic → replié, aucune fenêtre (jsdom) ; build (13 avertissements existants), tests, contraste. Pas testé dans l'appli connectée.
- Fichiers : components/{TableView,ProjectModal}.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v200 — Fiche PDF des tests en trois pages, colonne « Terminés »

- **Fiche PDF** (`testReport.js`) : 1) **page de garde** — bandeau ENOGIA, « Procès-verbal de tests FAT », PJ et projet, gamme et période, **résultat** encadré (Conforme si tous les tests sont réussis, Non conforme s'il y a un échec, Tests non terminés sinon, Validé manuellement si la validation a été forcée) avec les compteurs, tableau « Suivi du document » (document, version A, date, objet, rédigé par, pages) ; 2) **informations de la machine** — PJ, gamme, projet, n° de série, chef de projet, pays, certification ; planning (arrivée, tests, fin de production, départ, présence) ; équipe de test (testeurs, début / fin des saisies, validation forcée) ; 3) **résultats des tests et validation** — compteurs, tableaux par partie, puis « Validation » (phrase d'attestation et signatures). Saut de page entre chaque partie à l'impression.
- **Page Tests** (`TestsTab.js`, `WeekBoard`) : 4e colonne **« Terminés »** (liseré vert) — une machine dont tous les tests retenus sont faits, ou dont la validation a été forcée, quitte les colonnes de semaine et y passe (fins de tests des 60 derniers jours, la plus récente en haut). Colonnes de 260 px min.
- Pas de nouvelle donnée. Vérifié : rendu du PDF (3 pages, « Conforme ») et de la colonne (jsdom / aperçu) ; build (13 avertissements existants), tests, contraste.
- Fichiers : testReport.js, components/TestsTab.js, App.js (version), releaseNotes.js, releaseCatalog.js(+test).

## v201 — Fiche suiveuse dans la Liste, cadres proportionnés (maquette validée, skill frontend-design)

- **Liste** (`components/RowDetail.js`, nouveau ; `TableView.js`) : le détail déplié sous la ligne devient la « fiche suiveuse » — ruban des étapes nommées (Commande, Fabrication FNR, Montage méca, Montage élec, Tests, Packaging, Expédiée) : faites = cochées sur fond vert pâle avec leur date, en cours = couleur de l'état + dates, à venir = date prévue, écart au départ en rouge ; dessous, chefs de projet (avec EPC), présence, n° de série, pays, « Modifier » (admins), dernier commentaire (clic → commentaires) ; actions **Commentaires (n)**, **Déclarer un retard**, **Ouvrir la fiche projet**, replier (Échap). Commentaires, retards et modification s'ouvrent dans un cadre sous la fiche, sans fenêtre. Hauteur ≈ 100 px fermée. `ProjectComments`, `DelayAllocations` et `EditMetaForm` sont exportés de `ProjectModal.js` pour être réutilisés.
- **Cadres proportionnés, tous écrans** (`styles.css`, sous `#enogia-main`) : marges internes de 16–20 px ramenées à 12–14 px, rayons 12 / 14 / 16 px ramenés à 10 px (pastilles inchangées) ; `CARD` à 10 px. **Manager** : grilles de graphiques en 320 px min. (au lieu de 380), graphiques en barres à la hauteur de leurs données (28 px par ligne, au lieu de 160–180 px minimum). **Point hebdo** : colonnes de 360 px min. (au lieu de 460).
- Pas de nouvelle donnée ni clé `localStorage`. Vérifié : fiche suiveuse en clair / sombre (étape en cours, commentaires ouverts sur place) ; build (13 avertissements existants), tests, contraste.
- Fichiers : components/{RowDetail,TableView,ProjectModal,ManagerPanel,ManagerParts,PointHebdo}.js, styles.css, App.js (version), releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v202 — Fiche PJ en pop-up central, PV de debug au format du modèle Word, écrans proportionnés

- **Liste** (`RowDetail.js` : `RowDialog` ; `TableView.js`) : un clic sur une ligne ouvre la fiche **au centre** de la page — fond assombri et **flouté** (6 px), fenêtre de 860 px max, coins de 20 px, liseré de la couleur d'état en haut, ombre douce ; **entrée** 240 ms (fondu + montée de 14 px + zoom de 96,5 %) et **sortie** 180 ms avant de disparaître ; Échap, clic à côté ou la croix ferment, le focus revient à la ligne. En-tête : plaque, état, gamme, projet. Contenu : la fiche suiveuse (ruban des étapes nommées en segments arrondis, l'étape en cours légèrement surélevée ; infos ; dernier commentaire ; Commentaires / Déclarer un retard / Ouvrir la fiche projet, ouverts dans la fenêtre). Le détail déplié sous la ligne (V199–V201) est retiré.
- **PV de debug machine** (`testReport.js`, demandé : « PV de debug machine interne, à la forme du modèle Word ») : référence `PV-DEBUG-<PJ>` ; **page de garde** — grand bandeau, « PV de debug machine · PJ », projet / gamme / document interne, tableau Version · Date · Rédacteur · Objet · Pages, sommaire, pied de page société (siège, capital, Siren, Siret, APE) ; **pages suivantes** — en-tête avec le logo ENOGIA (`cdc-logo.png`) et la référence, titres numérotés (1 Informations de la machine ; 2 Résultats du debug ; 3 Validation), pied « Document / Projet / Version » en tableau. **Retirés** : l'encadré de résultat, la phrase d'attestation et les phrases au-dessus des tableaux ; les parties de tests sont en sous-titres. Bouton « PV de debug (PDF) » (`TestsTab.js`).
- **Écrans** (précisé : « pas la taille du contenu, mais bien positionné et proportionné par rapport à l'écran ») : grilles de graphiques du Manager en `minmax(min(100%, 380px), 1fr)` (remplissent la largeur), graphiques en barres ≥ 180 px, colonnes du Point hebdo à 420 px ; marges et rayons harmonisés de la V201 conservés.
- Pas de nouvelle donnée ni clé `localStorage`. Vérifié : pop-up (jsdom, aperçu) et PV (aperçu des 3 pages) ; build (13 avertissements existants), tests, contraste.
- Fichiers : components/{RowDetail,TableView,TestsTab,ManagerPanel,PointHebdo}.js, testReport.js, styles.css, App.js (version), releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v203 — Une seule fiche PJ (Liste, Gantt, Calendrier, accueil), qui explique l'étape et ses sous-étapes (maquette validée)

- **Fiche unique** (`components/RowDetail.js` : `RowDialog`, `PjDialog`, `PjDialogCtx`) : la Liste (`TableView.js`), le Gantt (`GanttView.js`) et App (accueil, Calendrier, cloche, recherche → `calSel`) ouvrent la **même** fenêtre ; l'ancienne fiche `ProjectModal` n'est plus utilisée par ces vues (elle reste dans le code). Fenêtre centrale floutée, 720 px, coins de 22 px ; entrée / sortie animées ; **sur téléphone (≤ 640 px) elle monte du bas** (bottom sheet) et le ruban passe sur deux lignes.
- **Contenu** : en-tête (plaque, projet, drapeau, gamme · pays, fermer) ; **anneau d'avancement** (avancement de l'étape, qui se dessine) avec le **nom de l'étape en clair et ce qu'elle signifie** + l'étape suivante (`MEANING`, une phrase par état) ; **ruban** Avant production · Montage méca · Montage élec · Tests · Packaging · Départ (faites cochées, en cours en couleur et surélevée, dates, écart au départ) — **survol ou clic d'une étape : ses sous-étapes** (reprises de `prodStages.js` : lubrification… remplissage*, tirage de câbles / pose de l'armoire / câblage, essais / FAT, RAI / carters / emballage, avec la note du remplissage) ; **mini-frise** arrivée → départ avec « aujourd'hui », départ initial en pointillés (départ − écart) et « Départ dans N jours · écart » ; **pastilles** : chefs (EPC), présence, tests « faits/total · échecs » (document Tests), cash du PJ (propriétaire seulement), turbine attribuée, n° de série, « Modifier » ; dernier commentaire ; actions Commentaires / Déclarer un retard / Ouvrir la fiche projet (ouverts dans la fenêtre).
- Les sous-étapes sont **informatives** (aucune donnée ne dit lesquelles sont faites) : pour l'étape en cours elles sont toutes marquées « en cours ».
- **App** : `PjDialogCtx` fournit le document Tests (si l'utilisateur y a accès) et les turbines aux fiches.
- Pas de nouvelle donnée ni clé `localStorage`. Vérifié : fiche en clair, sombre et téléphone (jsdom + aperçu) ; build (13 avertissements existants), tests, contraste.
- Fichiers : components/{RowDetail,TableView,GanttView}.js, App.js, styles.css, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v204 — Planificateur (propriétaire seul), modèles par gamme ; fiche PJ : sous-étapes au clic

- **Onglet « Planificateur »** (`App.js`, menu « Suivi », sous Tests) : visible et accessible **uniquement par le propriétaire** (`isOwner` ; un autre compte qui y arrive est renvoyé à la Liste). Il rebranche le module de planification déjà présent dans le dépôt (`src/planner`, inutilisé depuis la V165) : Gantt façon MS Project modifiable en direct (début, durée, travail, prédécesseurs, ordre des PJ = priorité), liens entre étapes du même PJ ou d'autres PJ (fin → début, début → début…, avec décalage en jours ouvrés), **dates imposées** pour forcer une tâche, règles « une production à la fois » / « un test au banc à la fois » qui **décalent automatiquement** les PJ suivants, charge atelier par semaine face à la capacité (personnes × heures), lissage, vues Gantt / Liste / Couloirs, onglet Modifications, annuler / rétablir, import d'un export MS Project (avec ses liens), jours fériés et fermetures du site exclus.
- **Données** : brouillon `planning/plan` (bêta `beta_plan`), enregistré automatiquement — **il ne change rien pour les autres** ; « **Publier** » (avec aperçu des changements) écrit dans `planning/current` (le planning lu par tous), garde les 8 dernières publications dans `planning/planHistory` et permet de les **annuler**, et alimente le journal des modifications. Le planning initial (figé) n'est jamais touché. Le plan n'est lu que lorsque l'onglet est ouvert. **Règles Firestore** : ces documents relèvent de la règle générale `planning/{docId}` ; pour les réserver au propriétaire côté base, ajoutez une règle comme pour le Cash in.
- **Modèles par gamme** (`Planner.js`, `TemplatesDialog`, bouton « Modèles par gamme… ») : durée (jours ouvrés) et travail (heures) de Production, Tests et Fin de production pour chaque gamme présente dans le plan ; « Proposer » = moyenne des PJ de la gamme ; « Appliquer » (une gamme ou tous les PJ) recalcule les PJ en gardant les dates imposées. Enregistrés dans le plan (`plan.templates`).
- **Fiche PJ** (`RowDetail.js`) : les sous-étapes d'une étape du ruban s'affichent au **clic** seulement (plus au survol).
- +2 tests (`src/planner/engine.test.js` : plan depuis le planning, calcul, charge, lissage, décalage d'un PJ). Vérifié : onglet et dialogue des modèles (jsdom + aperçu), build (13 avertissements existants), 129 tests, contraste. Pas testé dans l'appli connectée ; la présentation du module garde son ancien style (à rafraîchir).
- Fichiers : App.js, planner/{Planner.js, engine.test.js}, components/RowDetail.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v205 — Page Tests plus vivante : « Au banc maintenant », barre découpée test par test, derniers résultats (maquette validée)

- **Bandeau « Au banc maintenant »** (`TestsTab.js`, `BenchStrip`, en tête de la vue « Par semaine », respecte « Seulement mes tests ») : une carte par machine dont la période de tests couvre aujourd'hui, ou terminée depuis 30 jours au plus sans que tout soit fait (« en retard N j », liseré rouge). Carte : plaque, gamme, projet, « jour N / M » de la période, anneau d'avancement (faits / à réaliser), test en cours (sinon le prochain à faire), testeurs (ou « sans testeur » en rouge), barre découpée et décompte « réussis · en cours · échecs · à faire ». Une carte en pointillés annonce la **prochaine machine au banc** et sa date. Un clic ouvre la fiche de tests.
- **Barre découpée** (`SegBar`) : un segment par test retenu — réussi vert forêt, en cours or, échec rouge, à faire gris ; remplace la barre fine des cartes des colonnes et la barre du pop-up. Les segments se déroulent à l'ouverture (transform, `prefers-reduced-motion` respecté).
- **Derniers résultats** (`ResultsFeed`, à droite du bandeau, dessous sur téléphone et tablette) : les 7 derniers tests marqués réussis ou en échec sur 14 jours (d'après l'horodatage des statuts), avec le test, le PJ, le testeur et l'heure ; un clic ouvre la fiche.
- Pas de nouvelle donnée ni clé `localStorage` (lecture de `planning/tests`). Vérifié : rendu en clair, sombre et téléphone (jsdom + aperçu, pas de défilement horizontal à 375 px) ; build (13 avertissements existants), tests, contraste.
- Fichiers : components/TestsTab.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v206 — Planificateur : reprendre les dates du planning, charge complétée par gamme

- **« Reprendre les dates du planning »** (`Planner.js`, barre d'en-tête) : après confirmation, recrée le plan depuis le planning actuel (`refreshPlanFromRows` : mêmes dates qu'aujourd'hui, liens de chaîne de chaque PJ) en gardant la **capacité**, les **modèles par gamme** et le réglage des jours fériés ; les règles « un à la fois » repartent désactivées pour ne rien décaler. Annulable (Ctrl+Z). Le brouillon est enregistré ; rien ne change pour les autres avant « Publier ».
- **Charge complétée** (`engine.js`, `fillMissingHours`) : à la création du plan et à la reprise, un PJ sans heures atelier prend les heures du modèle de sa gamme (Production + Fin de production), sinon la moyenne des PJ de la même gamme qui en ont. Ces PJ sont marqués `hEst` et signalés en tête (« N PJ aux heures estimées · N PJ sans heures (hors charge) ») ; **les heures estimées ne sont jamais publiées** dans le planning, et saisir des heures efface l'estimation.
- Vérifié avec 14 PJ sur sept.–févr. : plan identique au planning (aucune modification à publier), Gantt et charge hebdomadaire avec surcharges ; +1 test (`engine.test.js`). Build (13 avertissements existants), 130 tests, contraste.
- Fichiers : planner/{engine.js, engine.test.js, Planner.js}, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v207 — Vue Tests en grand calendrier (maquette validée)

- **Grand calendrier** (`TestsTab.js`, `TestCalendar`) à la place des colonnes Kanban (« Cette semaine », « Semaine prochaine », « Dans 2 semaines », « Terminés ») : trois semaines, du lundi au vendredi, une ligne d'en-tête par semaine (n° de semaine, nombre de machines). Chaque machine est une **barre posée sur ses jours de tests** (rangée sur la première ligne libre) : n° de PJ, gamme, testeurs (ou « sans testeur » en rouge), « jour N / M » ou « en retard N j », « terminé » / « validé », et la barre découpée test par test. Une période qui commence la semaine précédente est marquée « suite ».
- **Couleurs** (jetons d'étape) : or = en cours, rouge = en retard (étalée de lundi à aujourd'hui), vert = terminé, neutre = à venir ; **contour orange** si un testeur est en conflit. **Venues client / NOBO** : pastilles d'un jour (bleu acier / rouge). **Aujourd'hui** surligné, **jours fériés** grisés (calendrier du planificateur).
- Le bandeau « Au banc maintenant » et « Derniers résultats » restent au-dessus ; « Seulement mes tests » s'applique aussi au calendrier ; un clic sur une barre ouvre la fiche de tests. Sur téléphone, les barres n'affichent que le n° de PJ.
- L'ancienne carte de colonne (`TestCard`) est retirée. Pas de nouvelle donnée ni clé `localStorage`. Vérifié : clair, sombre et téléphone (jsdom + aperçu, pas de défilement horizontal à 375 px) ; build (13 avertissements existants), 130 tests, contraste.
- Fichiers : components/TestsTab.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v208 — Planificateur : charge toujours visible, capacité par semaine, libellés, couloirs et liste réglables, mode sombre

- **Charge atelier collée en bas de l'écran** (`PlannerLoad.js`, section `.pg-load` en `position: sticky`) dans les vues Liste, Liste + Gantt, Gantt et Couloirs (en Couloirs, elle suit les couloirs) ; bouton « Réduire / Agrandir » (graphique de 150 → 78 px). Le Gantt et les couloirs prennent `100dvh − 430 px` pour laisser la place.
- **Capacité d'une semaine** (`engine.js` : `plan.capWeeks` = { lundi ISO : heures }, `setCapWeek`, `capDayFn`, `weekKeyOf`) : en mode Semaine, un clic (ou Entrée) sur une semaine du graphique ouvre « Capacité » (heures disponibles cette semaine) avec « Appliquer », « Revenir à la normale », « Fermer ». Cadre en pointillés orange et mention dans l'infobulle pour une semaine spéciale. `loadModel`, le graphique par semaine / mois et le **nivellement** utilisent cette capacité.
- **Libellés** : chaque barre du Gantt porte « PJ · nom de la tâche » (dans la barre si elle est assez large, sinon juste après, avec la durée), les jalons aussi ; la barre de synthèse d'un PJ est suivie de « PJ · projet ». Dans les **Couloirs**, le n° de PJ est écrit à côté des barres trop courtes.
- **Hauteur des couloirs** : « Serrés / Normaux / Larges » dans la barre d'outils en vue Couloirs (`ui.laneH`). **Largeur de la liste** en Liste + Gantt : poignée sur le bord droit de la liste (glisser, flèches ← →, double-clic = largeur normale ; `ui.listW`, 380 à 1 200 px) ; la colonne Tâche s'élargit, et en dessous de la largeur normale Prédécesseurs, Travail puis Fin sont masquées.
- **Mode sombre** : les styles du module étaient figés au chargement (boutons, champs, cartes, CSS) et les couloirs avaient une palette claire fixe ; ils relisent maintenant le thème à chaque rendu. Boutons actifs et « Publier » en encre / carte (lisibles dans les deux modes), flèches de liens et repères en `T.ink500` / `T.teal600`, infobulle de charge sur fond carte. Polices du site dans les couloirs (plus de Roboto).
- Clés `localStorage` : `planUi105` gagne `listW`, `laneH`, `loadSmall`. Données : `capWeeks` dans le brouillon `planning/plan` (jamais publié dans le planning).
- Vérifié : Liste + Gantt clair (liste élargie) et sombre, Gantt sombre, Couloirs serrés sombre et normaux clair (jsdom + aperçu) ; +1 test (`engine.test.js`) ; build (13 avertissements existants), 131 tests, contraste.
- Fichiers : planner/{engine.js, engine.test.js, Planner.js, PlannerGantt.js, PlannerLanes.js, PlannerLoad.js}, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v209 — Page Tests : planning des bancs en grille, Par testeur sur la même grille, catalogue en tableaux (maquette A validée)

- **Planning des bancs** (`TestsTab.js`, `BenchGrid`) à la place du grand calendrier V207, sous le bandeau « Au banc maintenant » et les derniers résultats : une **ligne par machine**, 15 jours ouvrés (3 semaines) avec la semaine en tête (« cette semaine », « semaine prochaine »), aujourd'hui surligné, jours fériés marqués. Étiquette : plaque, gamme, testeurs (ou « sans testeur » en rouge), barre découpée et « faits / total » ; barre d'état sur les jours de tests : **or** en cours (« jour N / M »), **rouge** en retard (jusqu'à aujourd'hui, « en retard de N j », 30 jours au plus), **vert** terminé / validé, **contour** = prévu ; halo orange = testeur en conflit ; **points** bleu acier / rouge = venue client / NOBO. Tri : retards, en cours, prévus, terminés. ◀ Aujourd'hui ▶ par semaine. Clic sur l'étiquette ou la barre = fiche de tests.
- **Par testeur** (`TesterTimeline`) : même grille (`GridHead`, `TrackBg`, légende, navigation), 3 semaines au lieu de 2, lignes de 36 px, couleur des barres = état des tests (plus la couleur de présence), « libre » sur une ligne vide, nombre de machines sous le nom. Inchangé : glisser une barre sur un testeur pour l'affecter, ligne « Sans testeur », ajout / modification / retrait d'un testeur.
- **Catalogue** (`CatalogView`) : un tableau par partie (interne, client, NOBO) — N°, Test, Objectifs, actions (↑ ↓ Supprimer) — en-têtes 12 px gris collés, lignes ≥ 36 px, champs sans cadre qui en prennent un au survol et à la saisie.
- Téléphone : étiquette réduite au n° de PJ, la grille défile dans son cadre (pas de défilement de la page). Pas de nouvelle donnée ni clé `localStorage`. Le calendrier V207 (`TestCalendar`, styles `.enogia-tcal`) est retiré.
- Vérifié : Par semaine, Par testeur et Catalogue en clair et sombre, Par semaine sur téléphone (jsdom + aperçu) ; build (13 avertissements existants), 131 tests, contraste.
- Fichiers : components/TestsTab.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v210 — Cash in pour les chefs de projet admins ; planning des bancs avec tous les PJ en colonnes

- **Cash in ouvert aux admins** (`roles.js` : `canCash()` = propriétaire OU admin ; `App.js` : `canCash`) : les comptes de la liste « Accès Manager » (dont les chefs de projet Clément et Myy) ont l'onglet Manager › Admin › Cash in, lisent et écrivent le document complet (`planning/cashin`, `planning/cashinLinks`, préfixe `beta_` en bêta), voient la pastille cash dans la fiche PJ et le **bloc Cash in sur leur accueil** (direction et maintenant **chef de projet** : bloc `cash` ajouté aux blocs du rôle, décochable dans Personnes et rôles). Ils ne passent plus par la copie réduite `cashinShared` (toujours publiée pour compatibilité).
- **À faire par Gabriel — règles Firestore** : aujourd'hui les documents Cash in sont réservés au propriétaire. Pour que les admins puissent écrire, ouvrez-les aux adresses de `planning/managerEmails` (champ `emails`), par exemple :
  `match /planning/{d} { allow read, write: if d in ['cashin','cashinLinks','beta_cashin','beta_cashinLinks'] && (request.auth.token.email in ['<propriétaire>'] || request.auth.token.email in get(/databases/$(database)/documents/planning/managerEmails).data.emails || request.auth.token.email in get(/databases/$(database)/documents/planning/beta_managerEmails).data.emails); }`
  (à fusionner avec vos règles existantes). Sans cela, l'onglet s'ouvre mais l'enregistrement échoue pour eux.
- **Cash in allégé** (`CashInNative.js`, `CashInTab.js`) : retrait de « Sauvegarde JSON », « Importer un fichier… » / « Reprendre un fichier… » et de la mention « Réservé au super admin. Données : document … ». L'export Excel reste.
- **Planning des bancs** (`TestsTab.js`, `BenchGrid`) : **tous les PJ** en cours (non expédiés) ayant une période de tests, chacun sur sa ligne, même hors des 3 semaines (« tests le 07/12 → » à droite, « ← terminé (…) » à gauche) ; case « PJ sans période (N) » pour ajouter les autres. À gauche, de vraies **colonnes séparées avec en-tête** : PJ · Gamme · Testeur · Client (point + date) · NOBO (point + date) · Tests (barre + faits / total). Sur tablette, colonnes plus étroites ; sur téléphone, PJ · Testeur · Tests. La grille défile dans son cadre (en-tête collé).
- Vérifié : grille en clair et sombre (jsdom + aperçu) ; build (13 avertissements existants), tests, contraste.
- Fichiers : roles.js, App.js, profiles.js, components/{CashInNative,CashInTab,ManagerPanel,RowDetail,HomeView,RoleHome,TestsTab}.js, styles.css, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v211 — Planificateur : nouveaux PJ et tâches, ordre des tâches, Packing, 2 bancs, liens en deux clics, navigation

- **« ＋ Nouveau PJ »** (`Planner.js`, `NewPjDialog` ; `engine.js`, `newPjPlan`) à la place du champ « Ajouter un PJ » (qui créait un PJ vide quand il n'était pas dans le planning) : n° (liste des PJ du planning absents du plan → leurs dates sont reprises), projet, gamme (durées / heures préremplies par le modèle de la gamme), arrivée ; tâches Production (atelier, durée, heures), Tests (Banc 1 / 2, testeur), Packing (atelier) et **tâches supplémentaires** (nom, phase, durée, heures, ressource). Le tout enchaîné Arrivée → Production → … → Packing → … → Départ, et placé dans les ordres de passage.
- **« ＋ Tâche à PJ… »** (`TaskDialog`, `addPhaseTask`) : tâche libre avec phase (Production / Tests / Packing), ressource (Atelier, Testeur à désigner, un testeur nommé), durée, heures, « Après » (lien fin → début). Une tâche faite par l'atelier compte ses heures dans la **charge**. Les ressources s'affichent sur la ligne de chaque tâche.
- **Ordre des tâches** : poignée ⋮⋮ sur chaque ligne de tâche, glisser sur une autre tâche du même PJ (`p.seq`, `moveStepOrder` ; ordre d'affichage, les liens ne changent pas).
- **Packing** : « Fin de production » est renommée Packing dans tout le planificateur (même étape `finProd`).
- **2 bancs de tests** : chaque ligne Tests porte « Banc 1 / Banc 2 » (clic pour changer ; `steps.tests.banc`) ; la règle devient « Un test à la fois **par banc** » (une file d'attente par banc) ; « Répartir les tests sur les 2 bancs » (Règles, aperçu avant d'appliquer, `splitBenches`) ; vue Couloirs avec deux couloirs Banc 1 et Banc 2.
- **Liens en deux clics** : bouton « Lier » au survol d'une tâche, puis clic sur la ligne ou la barre de la tâche qui suit → lien fin → début, message « Lien créé : … » (Échap / Annuler pour sortir). Le glisser depuis les poignées reste possible (poignées plus grandes, visibles sur la tâche sélectionnée). À noter : un lien ne déplace une tâche que s'il l'oblige à commencer plus tard que sa date actuelle (les dates reprises du planning sont imposées).
- **Navigation** : **clic droit maintenu** (ou molette maintenue) pour faire glisser le Gantt, la liste et les couloirs dans tous les sens ; **tâche mère** (barre de synthèse du PJ) plus fine ; **hauteur des couloirs** au curseur (8 à 30 px ; `ui.laneH` devient un nombre, les anciennes valeurs s / m / l sont reprises) ; en Liste + Gantt, la liste prend au plus ~42 % de l'écran tant qu'on ne l'a pas réglée (sur un petit écran elle masquait le Gantt : « pas de différence entre Liste et Liste + Gantt »).
- **Correctif** : les styles du module (V208) étaient passés tels quels à certains champs et boutons des fenêtres ; React (mode développement) les gèle, ce qui faisait planter les fenêtres. Ils sont maintenant copiés.
- `App.js` passe les testeurs de l'onglet Tests au planificateur. Données : dans le brouillon `planning/plan` (`seq`, `banc`, `res`, `phase`, `work` des tâches) — jamais publiées dans le planning. Clé `localStorage` `planUi105` : `laneH` numérique.
- Vérifié : moteur (+1 test : nouveau PJ, ordre, 2 bancs), Liste + Gantt sombre avec lien en deux clics et fenêtre Nouveau PJ, Couloirs clair (jsdom + aperçu) ; build (13 avertissements existants), 132 tests, contraste.
- Fichiers : planner/{engine.js, engine.test.js, Planner.js, PlannerGantt.js, PlannerLanes.js}, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v212 — Menu : Cash in et Turbines ; Manager : sous-menus en surimpression, Machines ORC, Point hebdo dans les fiches, Personnes et accès

- **Menu de gauche** (`App.js`, `VIEWS`) : nouvelle rubrique **Gestion** avec **Cash in** (comptes `canCash` : propriétaire et admins) et **Turbines** (propriétaire) ; un clic ouvre la page correspondante du Manager (entrées `mgr`), repère actif sur la bonne entrée. Aussi dans la recherche « Aller à… ».
- **Sous-menus en surimpression** (`App.js`, état `fly` ; `styles.css` `.enogia-fly`) : dans le Manager, survoler (ou atteindre au clavier) une rubrique qui a des sous-pages ouvre un panneau à droite du menu avec ses sous-pages ; il se ferme en le quittant ou avec Échap.
- **Manager réorganisé** (`ManagerPanel.js`) :
  - **Machines ORC** (Projets) : sous-page **Machines** = l'ancien tableau des N° de série enrichi des colonnes **Chef de projet**, **Pays** (enregistrés dans les corrections de fiche, `chefProjet` / `pays`) et **État** (même liste que Statut & état) — ouvert à tous les accès Manager ; sous-page **Statut & présence** (l'ancien Suivi › Statut & état).
  - **Suivi** supprimé (Santé projets est dans les fiches synthèses).
  - **Fiche projet** › Fiches projet / **Point hebdo**.
  - **Réglages** › **Personnes, rôles et accès** (fusion de Personnes et rôles + Accès Manager + version du site), Production, Vacances, Nouveautés. **Imports** supprimé : le repère « Planning initial » (son seul usage : ancrer de nouveaux PJ dans l'initial, base des dérives) est en tête de **KPI › Synthèse** ; l'historique des imports n'est plus affiché.
  - Les anciens onglets mémorisés (acces, imports, sante, suivi) ramènent à leur nouvelle place.
- Pas de nouvelle donnée ni clé `localStorage`. Vérifié : build (13 avertissements existants), tests, contraste. Pas vérifié dans l'appli connectée (menu et Manager demandent la connexion).
- Fichiers : App.js, components/{ManagerPanel,Series}.js, styles.css, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v213 — Jours de production réglés depuis le Calendrier ; Gantt fractionné ; charge recalculée

- **Calendrier** (`CalendarView.js`, `DayProdMenu`) : en vue **Jour**, pour les accès Manager (`canEditMeta`), un clic (ou Entrée) sur la date d'un jour ouvré ouvre ses options : « **Jour non travaillé pour tout l'atelier** » / « Rouvrir ce jour » (ajoute une période d'un jour aux fermetures, ou coupe la période qui le couvre — `closurePeriods`, même donnée que Réglages › Vacances), et la liste des **PJ en production ce jour** avec une case par PJ (décochée = pas de production ce jour — `productionExclusions`, même donnée que Réglages › Production), « Aucune production » / « Tout rétablir ». Les réglages des pages Production et Vacances du Manager restent disponibles.
- **Gantt** (`GanttView.js`) : les jours fermés (sur toute la barre) et les jours sans production du PJ (pendant sa production) **coupent la barre** (hachures, info-bulle « Atelier fermé » / « Pas de production »).
- **Charge atelier des KPI** (`ManagerPanel.js`) : les heures atelier d'un PJ se répartissent sur ses **jours ouvrés** d'arrivée à fin de production, hors week-ends, fermetures et jours sans production (avant : au prorata du temps calendaire). Le planificateur tenait déjà compte des fermetures.
- Nouveau module `src/workDays.js` (+ `workDays.test.js`, 2 tests). Pas de nouvelle clé `localStorage`. Vérifié : menu d'un jour et Gantt coupé (jsdom + aperçu) ; build (13 avertissements existants), 134 tests, contraste.
- Fichiers : workDays.js(+test), App.js, components/{CalendarView,GanttView,ManagerPanel}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v214 — Planificateur : hauteur des lignes, lien en tirant, phase et ressource sur chaque tâche

- **Hauteur des lignes du Gantt** (`PlannerGantt.js`, `ROW_H` calculé à partir de `ui.rowH`) : curseur « Hauteur des lignes » dans la barre d'outils (vues Liste, Liste + Gantt, Gantt), de 24 à 44 px ; barres, jalons, poignées et libellés suivent. Les couloirs gardent leur propre curseur.
- **Lien en tirant** : tirer une barre **verticalement** (plus que horizontalement, d'au moins ~¾ de ligne) puis la lâcher sur la barre ou la ligne d'une autre tâche crée un lien fin → début, avec le message « Lien créé ». Un glisser horizontal déplace toujours la tâche. « Lier » (deux clics) et les poignées restent disponibles.
- **Phase et ressource** : sur chaque tâche (sauf jalons), la ressource affichée est un menu : **Phase** (Production / Tests / Packing, pour les tâches ajoutées) et **Ressource** (Atelier, Testeur à désigner, testeurs de l'onglet Tests) — `setStepMeta`. « ＋ Ajouter une tâche » (sous un PJ déplié, et dans son menu ⋯) ouvre la fenêtre complète (nom, phase, ressource, durée, heures, après quelle tâche).
- Clé `localStorage` `planUi105` : `rowH`. Vérifié : lignes à 24 px en sombre, menu Phase / Ressource, lien par glisser vertical (jsdom + aperçu) ; build (13 avertissements existants), tests, contraste.
- Fichiers : planner/{Planner,PlannerGantt}.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v215 — KPI › Synthèse en tableau de pilotage (maquette A validée)

- **Nouveau composant `KpiPilotage.js`** en tête de Manager › KPI › Synthèse (filtres État / Gamme appliqués), à la place de l'ancienne rangée de chiffres et du graphique « Répartition par état » :
  - **5 chiffres** (libellé, valeur, une ligne d'explication ; rouge seulement quand c'est mauvais) : En production · Départs d'ici 30 jours (dont N en dérive) · Dérive moyenne du départ vs planning initial (rouge au-delà de +3 j) · Charge des 4 prochaines semaines en % de la capacité (heures planifiées / capacité, rouge au-delà de 100 %) · PJ avec un retard déclaré et leur 1re cause (jours cumulés).
  - **PJ à risque** : PJ en cours dont le départ dérive, triés par dérive (6 premiers), colonnes PJ · Projet · État · Départ · Dérive (pastille orange ≤ 10 j, rouge au-delà) ; clic ou Entrée = fiche projet ; « Voir les N PJ en dérive » ouvre KPI › Dérives. Sans planning initial : un message l'explique.
  - **Charge atelier** des 6 prochaines semaines : colonnes d'une seule couleur (rouge si la semaine dépasse), trait pointillé = capacité (175 h × jours ouverts / 5), heures au-dessus ; même calcul que KPI › Charge depuis la V213 (jours fermés et sans production déduits).
  - **Portefeuille par état** : une barre à 100 % (4 états les plus fournis + autres) avec la légende chiffrée.
  - Ensuite « Pour aller plus loin » : répartition par pays et explorateur libre (inchangés).
- Les sous-pages **Dérives, Charge, Avancement, Retards ne sont pas modifiées** dans cette version.
- Pas de nouvelle donnée ni clé `localStorage`. Vérifié : clair, sombre, téléphone (jsdom + aperçu, pas de défilement horizontal à 375 px) ; build (13 avertissements existants), tests, contraste.
- Fichiers : components/{KpiPilotage,ManagerPanel}.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v216 — Sous-pages KPI (Charge, Dérives, Avancement, Retards) aux règles de la Synthèse

- **`KpiRow`** (`ManagerParts.js`, utilisé par toutes les sous-pages KPI) : libellé 12,5 px gris au-dessus, chiffre 28 px en encre (chiffres tabulaires), ligne d'explication facultative (4e élément) ; plus de liseré ni de petit carré de couleur — la couleur d'un chiffre ne dit plus que « mauvais » (rouge) ou « bon » (vert).
- **Retards** : « Répartition par cause » et « Retard par PJ » passent de camemberts (jusqu'à 9 parts) à des **classements en barres triées d'une seule couleur** (`RankBars`, valeurs à droite) ; chiffres clés avec explication (1re cause…).
- **Avancement** : chiffres clés avec explication.
- **Charge / Dérives** (`ManagerPanel.js`) : grille horizontale légère (plus de pointillés), courbes en lignes droites de 2 px sans points, barres à angles nets (2 px), charge par étape aux **couleurs des étapes** (palette V177), atelier / autom en bleu production et ocre (plus de violet), plus de lignes alternées dans le graphique initial / révisé, anneau de sévérité **sans total au centre** (comme V192) ; tableaux : en-têtes 12 px gris sans bandeau, heures et écarts alignés à droite en chiffres tabulaires.
- `PieBlock` : anneau plus fin, total au centre seulement si on le demande explicitement.
- Pas de nouvelle donnée ni clé `localStorage`. Vérifié : Avancement et Retards en clair et sombre (jsdom + aperçu) ; les graphiques Recharts de Charge et Dérives ne se dessinent pas en jsdom — à regarder dans l'appli. Build (13 avertissements existants), tests, contraste.
- Fichiers : components/{ManagerParts,ManagerPanel}.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v217 — Cash in et Turbines en pages ; Manager regroupé ; Machines ORC sur une page ; nouveaux PJ signalés à l'import

- **Cash in et Turbines** (`App.js`) : les entrées de la rubrique **Gestion** du menu ouvrent de vraies pages du site (`view` = `cashin` / `turbines`, avec leur en-tête) au lieu des onglets du Manager. Cash in : comptes `canCash` ; Turbines : accès Manager (`pinOk`). « Ouvrir le Cash in » de l'accueil et le lien paiements d'une fiche projet ouvrent la page Cash in (sur le PJ). Ces deux onglets sont retirés du Manager (un ancien onglet mémorisé ramène aux KPI).
- **Manager regroupé** (`ManagerPanel.js`) :
  - **Pilotage** : KPI (Synthèse, Dérives, Charge, Avancement) ; **Retards** (Déclarer, **Analyse** — l'ancien KPI › Retards).
  - **Projets** : Fiches projet (Fiches projet, Point hebdo) ; **Machines ORC**.
  - **Réglages** : **Calendrier de production** (Jours sans production, Fermetures de l'atelier) ; **Personnes et site** (Personnes, rôles et accès ; Nouveautés).
- **Machines ORC sur une page** (`Series.js`) : le tableau gagne la colonne **Présence aux tests** (client / NOBO et leurs dates, même éditeur que la Liste) et le bouton **Gérer les états** (états personnalisés) ; la sous-page « Statut & présence » disparaît.
- **Nouveaux PJ à l'import** (`App.js`) : après l'import du planning révisé, les PJ (hors slots libres) absents du planning initial sont signalés par un bandeau pour les accès Manager ; « Les ancrer dans l'initial… » ouvre l'examen d'ajout à l'initial (`InitialAddReview`, les PJ déjà présents ne sont jamais modifiés), « Plus tard » le ferme. Avant, il fallait réimporter le fichier avec le bouton ＋ du repère « Planning initial ».
- Pas de nouvelle donnée ni clé `localStorage` (`enogia_view` accepte `cashin` et `turbines`). Vérifié : build (13 avertissements existants), tests, contraste. Pas vérifié dans l'appli connectée (menu, Manager et import demandent la connexion).
- Fichiers : App.js, components/{ManagerPanel,Series}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v218 — Calendrier : clic sur la tuile d'un PJ ; le planificateur suit les jours sans production

- **Calendrier** (`CalendarView.js`) : en vue Jour, pour les accès Manager, un clic sur la **tuile d'un PJ** (un jour ouvré entre son arrivée et sa fin de production, ou un jour fermé) ouvre le menu du jour avec, en tête, ce PJ : « **Pas de production ce jour** » / « Rétablir la production ce jour » et « Ouvrir la fiche » ; puis « Jour non travaillé pour tout l'atelier » et la liste des PJ en production. Une case vide (jour retiré) est aussi cliquable pour rétablir. Le clic sur la date en haut reste disponible. Hors production, la tuile ouvre la fiche comme avant.
- **Planificateur** (`engine.js`) : `makeCalendar` reçoit les jours sans production de chaque PJ (`pjOff` = `productionExclusions`) ; ses tâches d'atelier (Production, Packing, tâches libres de l'atelier) **s'allongent** pour garder leur durée en jours travaillés, ces jours sont **hachurés** sur la barre et **ne portent pas de charge** (graphique de charge, nivellement). Les fermetures de l'atelier étaient déjà prises en compte. `App.js` passe `productionExclusions` au planificateur.
- +1 test (`engine.test.js`). Pas de nouvelle donnée ni clé `localStorage`. Vérifié : clic sur une tuile (jsdom), build (13 avertissements existants), 135 tests, contraste.
- Fichiers : planner/{engine.js, engine.test.js, Planner.js, PlannerGantt.js, PlannerLoad.js}, components/CalendarView.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v219 — KPI : charge d'après le planificateur, répartitions en camemberts, sous-page Explorer

- **Charge d'après le planificateur** (`KpiPilotage.js`, `planWeeks`) : si un plan existe (`planning/plan`), la charge de KPI › Synthèse (chiffre « Charge S… → S… » et colonnes des 6 semaines) et le nouveau bloc **« Charge atelier — 12 semaines »** en tête de KPI › Charge viennent du planificateur : heures planifiées de ses tâches d'atelier, **capacité de chaque semaine** (personnes × heures, semaines à capacité spéciale), jours fermés et jours sans production déduits. Sans plan : repli sur l'ancien calcul (planning + 175 h / semaine), indiqué sous le titre. `App.js` lit le plan aussi quand un accès Manager ouvre le Manager (**règles Firestore** : `planning/plan` doit être lisible par les admins, comme `planning/{docId}`).
- **Camemberts** (`ManagerParts.js` : `CAT_COLORS` = palette V192, `topSlices` = les N plus grandes parts + « Autres ») : portefeuille par état (Synthèse), répartition par pays et par gamme (Explorer), répartition par cause et retard par PJ (Retards › Analyse). Sans total au centre. Les séries dans le temps (charge, départs par mois) et les moyennes (dérive par gamme / jalon, avancement) restent en colonnes ou barres.
- **Sous-page KPI « Explorer »** (`ManagerPanel.js`) : la Synthèse ne garde que le tableau de pilotage ; répartition par pays, départs par mois, par gamme et l'explorateur libre passent dans **KPI › Explorer**.
- Pas de nouvelle clé `localStorage`. Vérifié : Synthèse avec un plan (jsdom) ; les camemberts Recharts ne se dessinent pas en jsdom — à regarder dans l'appli. Build (13 avertissements existants), tests, contraste.
- Fichiers : components/{KpiPilotage,ManagerParts,ManagerPanel}.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v220 — Nouveau nom du site : « ENOGIA – BU ORC »

- **Nom** (`siteName.js`) : `SITE_NAME` = « ENOGIA », `SITE_SCOPE` = « BU ORC » → « ENOGIA – BU ORC » ; sous-titre « Ordonnancement · Production · Tests · Projets · Cash in ». Repris par le menu, la connexion, l'écran de transition et le titre de l'onglet (`App.js`, sans « · ENOGIA » en double ; bêta : « [BÊTA] ENOGIA – BU ORC »), `public/index.html` (titre, description) et `public/manifest.json` (nom de l'application installée).
- **Dépôt GitHub — à faire par Gabriel, si vous voulez aussi le renommer** (je ne pousse rien) :
  1. Sur GitHub : Settings › General › Repository name (ex. `bu-orc-enogia`). GitHub redirige l'ancien dépôt pour git, **mais pas l'adresse GitHub Pages** : l'ancienne adresse du site ne répondra plus.
  2. Dans `package.json`, remplacer `"homepage": "https://Planning-ENOGIA-BU-ORC.github.io/planning-enogia-2026"` par la nouvelle adresse (`…github.io/<nouveau-nom>`), puis `git remote set-url origin https://github.com/Planning-ENOGIA-BU-ORC/<nouveau-nom>.git`.
  3. Redéployer (`npm run deploy:beta` puis `npm run deploy`) et prévenir les utilisateurs de la nouvelle adresse. Firebase n'est pas concerné (même domaine `…github.io`, seul le chemin change) ; les données Firestore restent les mêmes.
- Vérifié : build (13 avertissements existants), tests, contraste.
- Fichiers : siteName.js, App.js, public/{index.html, manifest.json}, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v221 — Machines ORC réparé ; Cash in / Turbines au propriétaire ; fiches regroupées ; Calendrier et planificateur

- **Machines ORC** (`ManagerPanel.js`) : depuis la V217 l'entrée du menu ouvrait l'onglet `orc`, qui n'avait pas de contenu (page vide sous l'en-tête des KPI) ; elle ouvre maintenant `serie` (et un ancien `orc` mémorisé y ramène).
- **Cash in et Turbines réservés au propriétaire pour l'instant** (`roles.js` : `CASH_FOR_ADMINS = false`, `canCash()` ; `App.js`) : menu Gestion, pages, bloc Cash in de l'accueil et pastille cash de la fiche ne s'affichent que pour le propriétaire. Le planificateur l'était déjà. Pour rouvrir le Cash in aux admins : `CASH_FOR_ADMINS = true` (+ règles Firestore, cf. v210).
- **Fiches projet** (`ManagerFiche.js`) : les machines d'un même PJ (code « PJ461-1 », « PJ461-2 »… = même base « PJ461 ») sont **regroupées** dans la liste (ligne « PJ461 · projet · N machines · avancement moyen », ▸ pour déplier) ; un clic sur le groupe affiche leur **synthèse commune** (même vue que « tous les projets d'un chef »). Case « Regrouper les machines d'un même PJ » (clé `localStorage` `enogia_mlist_cluster`).
- **Calendrier** (`CalendarView.js`, `RowDetail.js`, `App.js`) : la tuile d'un PJ (jour ouvré de sa production) ouvre de nouveau la **fiche habituelle** du PJ, avec un bouton **« Pas de production le JJ/MM »** / « Rétablir la production le JJ/MM » pour ce PJ seulement (Gantt, charge et planificateur suivent). Le clic sur la date en haut garde son menu (atelier entier, plusieurs PJ).
- **Planificateur** : « Lier » ouvre une **fenêtre à listes déroulantes** (`LinkDialog`) — « Commence après… », « Doit être finie avant… », type (fin → début…), décalage, liste des liens de la tâche avec « Supprimer », et « Ou cliquer la tâche suivante dans le Gantt ». **Slots libres masqués** par défaut (case « Slots libres (N) » ; `planUi105.hideSlots`), dans la liste, le Gantt et les couloirs (la charge les compte toujours).
- **À savoir** : les tâches ajoutées dans le planificateur (tâches libres) ne sont **pas publiées** dans la Liste, le Gantt ou le Calendrier : le planning publié ne connaît que les 5 jalons de chaque PJ (arrivée, tests, fin des tests, fin de production, départ). Elles servent à calculer ces dates et la charge.
- Vérifié : fiches regroupées (jsdom), build (13 avertissements existants), tests, contraste.
- Fichiers : roles.js, App.js, components/{ManagerPanel,ManagerFiche,CalendarView,RowDetail}.js, planner/{Planner,PlannerGantt}.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v222 — Cadrans déplaçables et redimensionnables (accueil, KPI › Synthèse, Tests › Par semaine)

- **Nouveau composant `Arrange.js`** : grille de 12 colonnes ; bouton « **Disposer les cadrans** » (en haut à droite de la zone) → chaque cadran porte une barre : poignée ⋮⋮ (glisser-déposer sur un autre cadran), ◀ ▶ (déplacer au clavier), − + (largeur : 25 %, 33 %, 42 %, 50 %, 58 %, 67 %, 100 %) ; « Terminer » ; « **Réinitialiser** » revient à la disposition d'origine. Sur un écran de moins de 900 px, chaque cadran prend toute la largeur.
- Appliqué à : **l'accueil** de chaque rôle (`RoleHome.js` ; disposition propre à chaque rôle), **KPI › Synthèse** (`KpiPilotage.js` : Chiffres clés, PJ à risque, Charge atelier, Portefeuille par état), **Tests › Par semaine** (`TestsTab.js` : Au banc maintenant, Derniers résultats, Planning des bancs).
- Clés `localStorage` : `enogia_arr_home-<rôle>`, `enogia_arr_kpi-synthese`, `enogia_arr_tests-semaine` (disposition propre à chaque poste et navigateur).
- Vérifié : KPI (redimensionnement enregistré) et accueil (jsdom + aperçu) ; build (13 avertissements existants), tests, contraste.
- Fichiers : components/{Arrange,KpiPilotage,RoleHome,TestsTab}.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v223 — Isothermes sur l'accueil (option B validée)

- **Accueil** (`HomeView.js`) : composant `Isotherms` — 10 courbes de niveau en quart de cercle irrégulier autour du coin haut droit, trait 1,2 px, de plus en plus pâles vers le contenu ; décoratif (`aria-hidden`, sans clic), placé sous les cartes (`isolation: isolate`, `z-index: -1`), largeur `min(620px, 75%)`.
- Nouveau jeton de thème `T.contour` : `#C7D2DE` (clair), `#36445F` (sombre).
- Pas de clé `localStorage`.
- Vérifié : rendu clair et sombre (jsdom + aperçu), build (13 avertissements existants), tests, contraste.
- Fichiers : components/HomeView.js, theme.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v224 — KPI au propriétaire, cadrans fluides, résumé des projets multi-machines, planificateur (zoom, bancs, place, liens)

- **KPI et Personnes et site** (`ManagerPanel.js`) : réservés au **propriétaire** (`isOwner()`). Un admin arrive sur Fiches projet ; le Calendrier de production reste ouvert aux admins. Après un import, le bandeau « Les ancrer dans l'initial » mène un admin aux fiches (l'examen s'ouvre quand même).
- **Cadrans** (`Arrange.js`) : bouton « Disposer les cadrans » visible par le propriétaire seul ; on glisse la poignée ⋮⋮ et les autres cadrans se rangent en direct (animation 180 ms, `prefers-reduced-motion` respecté) ; la largeur se règle en tirant le bord droit (1 colonne = 1/12, de 2 à 12) ou avec − + ; **accueil** : les chiffres clés et « Départs à venir » (direction) sont maintenant des cadrans (`HomeView.js` → `RoleHome` `lead` / `tail`).
- **Fiches projet** (`ManagerFiche.js`) : la fiche commune d'un PJ à plusieurs machines s'ouvre sur un **Résumé du projet** (`ProjectSummary`) : projet, pays, gammes, chefs ; machines, avancement moyen, plus grande dérive, retards déclarés, FAT client / NOBO ; barre des états ; jalons de la première à la dernière machine ; 3 derniers messages publics (clic = fiche de la machine).
- **Planificateur** :
  - **Zoom** : − + autour de Jour / Sem. / Mois, et **Ctrl + molette** sur le Gantt (la date sous la souris reste en place) ; clé `planUi105.px` (1,5 à 48 px par jour).
  - **Bancs d'essai** (bouton de la barre, ⚠ = nombre de chevauchements) : une ligne par banc, ses machines dans l'ordre avec leurs dates, chevauchements en rouge, « → Banc 2 », « Passer avant » ; **« Interdire les chevauchements »** active la règle « un test à la fois par banc » avec l'ordre des tests (`benchOrderByStart`), « Répartir automatiquement » ; changer de banc sur la ligne Tests réordonne aussi la file.
  - **Place pour le Gantt** : bouton « Charge » pour masquer la charge atelier (clé `planUi105.loadHide`), barres d'outils compactes, hauteur du Gantt adaptée.
  - **Slots libres et PJ « …XXX… »** jamais affichés (toujours comptés dans la charge).
  - **Liens** : tirer d'un rond vers le rond d'une autre tâche crée bien le lien (rond de début = vers son début, rond de fin = vers sa fin ; lâcher sur la ligne marche aussi).
  - **Insertion** : une tâche ajoutée « après » une tâche reprend ses liens (A → C devient A → nouvelle → C).
  - **Publication** : un PJ publié qui n'est pas dans le planning initial déclenche le bandeau « N PJ ne sont pas dans le planning initial » → les ancrer : leurs dates deviennent les dates initiales (figées) ; les publications suivantes changent les dates actuelles et la dérive se calcule par rapport à l'initial.
- Vérifié : moteur (insertion, bancs) et rendu du planificateur et des bancs (jsdom + aperçu), build (13 avertissements existants), tests, contraste. Non vérifié dans l'appli connectée : glisser des cadrans, Ctrl + molette, lien rond → rond à la souris.
- Fichiers : components/{Arrange,HomeView,RoleHome,ManagerPanel,ManagerFiche}.js, planner/{engine,Planner,PlannerGantt,store}.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v225 — Un fond léger pour chaque page

- Nouveau `src/pageBackdrop.js` : `backdropStyle(view)` peint un motif SVG en image de fond de `<main>` (coin haut droit, `min(620px, 75%)`), trait 1,2 px au jeton `T.contour` (clair `#C7D2DE`, sombre `#36445F`) — même opacité que les isothermes de la V223. En image de fond : il reste sous les cartes et ne change pas l'empilement des fenêtres.
- Motifs (`PAGE_MOTIF`) : accueil et Cash in = diagramme T-s du cycle ORC ; Liste et Modifications = tuyauterie (P&ID) ; Gantt et Tests = traces de banc d'essai ; Calendrier, Commentaires et Planificateur = isothermes ; Turbines et Manager = rotor de turbine.
- Les isothermes de l'accueil (V223, `Isotherms` dans `HomeView.js`) sont retirées au profit de ce mécanisme commun.
- Pas de clé `localStorage`.
- Vérifié : planche des motifs en clair et en sombre (aperçu), build (13 avertissements existants), tests, contraste.
- Fichiers : pageBackdrop.js, App.js, components/HomeView.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v226 — Page Production turbines ; bancs alloués en un clic ; cadrans plus libres

- **Production turbines** (nouvelle page `prodturb`, menu de gauche › Gestion, `components/ProdTurbines.js`) : reprise, dans le design du site, de l'outil « Production turbines » du directeur de production turbines (artifact claude.ai). Elle **s'ajoute** à la page Turbines (pool), qui ne change pas.
  - Sous-pages : **Accueil** (turbines prêtes, testées sans roue, roues équilibrées et injecteurs par référence, dates prévisionnelles des prochaines turbines), **Planning** (pièces : Appro, Contrôle qualité, Non-conformités ; tableau des turbines et des arbres — glisser une carte sur sa ligne pour changer d'étape, clic = fiche), **Stocks roues & injecteurs** (quantités ±, bouchages), **Gamme & durées** (noms et durées des étapes ; **Accès à la page**, propriétaire seul).
  - Règles reprises telles quelles : jours ouvrés lundi–vendredi ; durée de l'étape en cours moins le temps déjà passé ; un arbre « Disponible » est requis pour l'assemblage (affecté automatiquement, le premier carter terminé prend le premier arbre prêt) ; une roue est requise pour le banc avec roue, sinon la turbine s'arrête en « Stock testée sans roue » ; date de retour de l'équilibrage sous-traité prioritaire.
  - **Accès** : le propriétaire + les adresses ajoutées dans Gamme & durées › Accès (ajouter l'e-mail du directeur). Tous ces comptes peuvent modifier.
  - **Données** : document Firestore `planning/prodTurbines` (`beta_prodTurbines` en bêta), une entrée par turbine / arbre / pièce / référence (écritures fusionnées, pas d'écrasement entre deux personnes qui modifient des éléments différents). Les données de l'artifact d'origine (stockées dans claude.ai) **ne sont pas reprises** : à ressaisir, ou à importer sur demande.
  - **Règles Firestore** : le directeur doit pouvoir lire et écrire `planning/prodTurbines` (et `beta_prodTurbines`). Si les règles limitent l'écriture aux managers, ajouter son adresse ou une règle dédiée à ce document. Tous les comptes connectés lisent ce document pour savoir s'ils ont accès (à restreindre dans les règles si besoin).
- **Planificateur › Bancs d'essai** : un seul bouton **« Allouer automatiquement »** — chaque machine va sur le banc libre le plus tôt et, si les deux bancs sont pris, ses tests attendent la fin de la machine précédente sur son banc. La case « Une machine à la fois par banc » remplace « Interdire / Autoriser les chevauchements ».
- **Cadrans** (`Arrange.js`) : en mode disposition, le cadran se saisit n'importe où et suit la souris ; sa place se calcule d'après la position des autres cadrans (plus d'oscillation) ; la page défile seule près des bords.
- Vérifié : calculs (affectation des arbres, garde-fous arbre / roue), rendu des 4 sous-pages en clair et en sombre (jsdom + aperçu), build (13 avertissements existants), tests, contraste. Non vérifié dans l'appli connectée : écritures Firestore de la page, glisser des cartes et des cadrans à la souris.
- Fichiers : components/{ProdTurbines,ProdTurbines.test,Arrange}.js, planner/Planner.js, pageBackdrop.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v227 — Production turbines : fiches corrigées ; kit d'échange avec le Claude de Jérémie

- **Correction** (`ProdTurbines.js`) : Firestore enregistre chaque turbine / arbre / pièce / référence sans son champ `id` ; la page le reprend maintenant depuis la clé (sans cela, rouvrir ou glisser un élément enregistré ne marchait pas).
- **Kit pour Jérémie** (directeur de production turbines), pour qu'il fasse évoluer la page dans son Claude et la renvoie :
  1. `npm run kit:jeremie` → dossier `kit-jeremie/` (non versionné) : **`ProdTurbines-kit.jsx`** (un seul fichier, s'ouvre comme artifact React dans claude.ai : thème du site recopié, en-tête et icônes simplifiés, la page entre les repères `// ===== DÉBUT PAGE` et `// ===== FIN PAGE =====`, aperçu avec données d'exemple, boutons Mode sombre / Voir comme le directeur) et **`Consignes-pour-Claude.md`** (règles à coller en tête de sa conversation).
  2. Jérémie modifie et renvoie le fichier **complet**.
  3. `npm run import:jeremie -- "C:\chemin\ProdTurbines-kit.jsx"` (ajouter `--dry` pour voir sans écrire) : remet sa partie dans `src/components/ProdTurbines.js`. **Refusé** si la partie contient des `import`, utilise `window.claude` / le stockage de l'artifact, ou ne garde pas les exports `ProdTurbines`, `makeModel`, `moveTurbine`, `EMPTY_PROD`, `T_STEPS`, `A_STEPS`. **Signalé** : couleurs codées en dur ajoutées, nouvelles collections de données.
  4. Build, tests, contraste, commit, `npm run deploy:beta` ; puis `npm run kit:jeremie` pour lui renvoyer la version intégrée.
- Vérifié : aller-retour sans modification (aucun changement), retour modifié (1 ligne), retour refusé (`import`), kit rendu seul (jsdom) ; build, tests, contraste.
- Fichiers : scripts/{prodturb-kit,prodturb-import}.js, scripts/prodturb-consignes.md, components/ProdTurbines.js, package.json, .gitignore, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v228 — États plus clairs ; garde-fous Production turbines ; cadrans sobres ; planificateur (priorité, archives, couloirs, pointillés)

- **États** (`pjMeta.js`, `RowDetail.js`) : « Fabrication FNR » → **« Fabrication fournisseurs »** (l'ORC, armoire et skid, est fabriqué et monté chez les fournisseurs) ; « Non désignée » → **« Design en cours »** (le design de l'ORC n'est pas complètement défini : la commande ne peut pas être passée ; étape suivante : la commande). Les identifiants des états ne changent pas (aucune donnée à migrer).
- **Production turbines** : `components/PageGuard.js` — une erreur dans la page s'affiche dans la page seulement (« Réessayer »), le reste du site continue. **Kit** : ligne « Base du kit : <empreinte> » ; `import:jeremie` **refuse** un retour fait à partir d'une version plus ancienne de la page (vos modifications ou un autre retour seraient perdues) — fusion à faire, `--force` pour écraser.
- **Cadrans** (`Arrange.js`) : plus de barre (flèches, −, +) sur les cadrans ; en mode disposition on glisse le cadran et on tire son bord droit (la largeur s'affiche pendant le geste) ; au clavier : ← → pour déplacer, Maj + ← → pour la largeur.
- **Planificateur** :
  - **Priorité** : « P n » sur la ligne de chaque PJ (cliquer pour saisir) ; plus le numéro est grand, plus ses tâches passent en premier (la liste se range du plus grand au plus petit, les PJ sans numéro ensuite ; ordre « une production à la fois » mis à jour).
  - **Archives** : menu ⋯ d'un PJ › « Archiver » — il garde ses dernières dates (publiées telles quelles) mais disparaît de la liste, du Gantt et des couloirs ; les PJ **expédiés** sont masqués de la même façon ; case « Archivés (N) » pour les revoir, « Sortir des archives » pour revenir.
  - **Couloirs** : le tableau des tâches sous les couloirs est masqué ; bouton « Tableau des tâches » pour l'afficher.
  - **Pointillés** supprimés (liens automatiques de l'ordre de passage : ils agissent toujours, ils ne sont plus dessinés).
  - **Alerte après « Allouer automatiquement »** : le ⚠ à côté d'une date de test signalait qu'une date imposée n'était plus tenue parce que la machine attend son banc — normal après une allocation ; il n'apparaît plus dans ce cas (il reste pour les liens que vous créez).
- Clés `localStorage` (`planUi105`) : `showArch`, `lanesTable`.
- Vérifié : build (13 avertissements existants), tests (priorité, archives), contraste.
- Fichiers : pjMeta.js, components/{RowDetail,Arrange,PageGuard}.js, planner/{engine,Planner,PlannerGantt,bench.test}.js, scripts/{prodturb-kit,prodturb-import}.js, scripts/prodturb-consignes.md, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v229 — Un accueil pour chaque poste (maquettes validées)

- **5 accueils** (`RoleHome.js`, `HomeView.js`), chacun avec sa phrase d'ouverture liée au poste :
  - **Chef de projet** : Mes PJ (par départ, dérive), Jalons des 3 semaines, À traiter (retards à déclarer, mentions), FAT client / NOBO, Avancement. Phrase : « Sur tes N PJ, … avancent, … glissent ; prochain départ … ».
  - **Testeur** : Au banc aujourd'hui (jour N / M, avancement des tests), Fiches à signer, Ma semaine, Prochaines arrivées au banc, Derniers résultats.
  - **Chef d'atelier** : Charge atelier sur 4 semaines (heures et capacité ; d'après le planificateur quand il est lisible, sinon les heures atelier du planning réparties sur les jours ouvrés, capacité 175 h), Arrivées et départs, En montage, Postes de test. Phrase : machines en montage, charge en %, arrivées et départs.
  - **Directeur de production turbines** (nouveau rôle `turbines`, automatique pour un compte qui a accès à Production turbines) : Turbines prêtes, Testées sans roue, Pièces à suivre, Dates prévisionnelles, Roues équilibrées, Injecteurs.
  - **Autres personnes** (nouveau rôle `autre`, accueil par défaut d'un compte sans rôle) : Chiffres clés, Prochains départs, Où en sont les machines.
  - La **Direction** garde ses cadrans (chiffres, tests, turbines, cash in, alertes, charge, postes, départs, parcours) et sa phrase.
- **Disposition figée par poste** : la même pour toutes les personnes du poste, enregistrée dans `planning/profiles` (`homeLayouts.<rôle>` : ordre, largeurs, cadrans ajoutés ou retirés). **Seul le propriétaire** la règle : « Disposer les cadrans » sur l'accueil du poste affiché (choisir son propre rôle dans Manager › Personnes et site pour voir un autre poste), « Ajouter un cadran… » (catalogue de tous les cadrans), « Retirer », « Réinitialiser ».
- Rôles : Manager › Personnes et site › Personnes, rôles et accès propose maintenant « Directeur production turbines » et « Autres personnes ».
- Le plan du planificateur est lu aussi sur l'accueil pour les admins (charge atelier).
- Vérifié : rendu des 5 accueils (jsdom + aperçu, clair et sombre), build (13 avertissements existants), tests, contraste. Non vérifié dans l'appli connectée : enregistrement de la disposition partagée.
- Fichiers : components/{RoleHome,HomeView,Arrange}.js, profiles.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v230 — Cadrans libres, états modifiables, bancs et couloirs

- **Cadrans** (`Arrange.js`) : placement libre — chaque cadran a une place `{ x, y, w, h }` (colonnes sur 12, pas de 8 px) ; on le pose où l'on veut, seuls les cadrans recouverts descendent. Hauteur au bord bas, largeur au bord droit, les deux au coin ; clavier : flèches = déplacer, Maj + flèches = taille. La disposition actuelle est relevée au premier déplacement (pas de saut). Écran < 900 px : pleine largeur dans l'ordre des places. Les dispositions partagées (accueils par poste) s'appliquent maintenant à tout le monde, pas seulement au propriétaire. Clés `localStorage` inchangées (`enogia_arr_<id>`, champ `pos` ajouté).
- **États** : « Fabrication/Montage Fournisseurs » ; Stockage externe = avant le montage interne ou après les tests et le packaging. « Gérer les états » (admins) : les états intégrés se renomment, se recolorent et reçoivent une explication affichée dans la fiche du PJ ; « Rétablir ». Stockage : `planning/overrides.etatEdits` (`{ [id]: { label, color, desc } }`).
- **Planificateur** : le ⚠ rouge des « Bancs d'essai » ignore les PJ archivés / expédiés, les slots libres et les tests terminés (on ne peut plus les corriger) ; « Règles › Répartir les tests sur les 2 bancs » active aussi « une machine à la fois par banc ». Priorité (P n) à gauche du n° de PJ ; boutons « Priorité » et « S/N » pour les masquer (`ui.hidePrio`, `ui.hideSn`). Couloirs : la charge atelier suit le défilement horizontal et s'aligne sur la colonne des couloirs.
- Fichiers : components/{Arrange,Arrange.test,RoleHome,EtatsDialog,RowDetail,ManagerPanel,ManagerParts,Series}.js, pjMeta.js, styles.css, planner/{engine,Planner,PlannerGantt,PlannerLanes}.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v231 — Tout se fait sur le site

- **Plus d'import** : bouton « Importer un planning » (en-tête), import et ajout du planning initial (Manager › KPI, tuile Planning initial), import MS Project du Planificateur et « Comparer 2 plannings » (Modifications) retirés. Les dates actuellement en base (`planning/current`) font foi ; elles ne changent plus que par « Publier » dans le Planificateur. Avant la prochaine modification : Planificateur › « Reprendre les dates du planning » pour repartir exactement des dates en base. Textes : « Dernier import » → « Mis à jour le », « Journal des imports » → « Journal des publications », « dernier import » → « dernière mise à jour ». Les PJ nouveaux s'ancrent dans l'initial via le bandeau qui suit une publication.
- **Accueil** : le propriétaire choisit l'accueil affiché (« Accueil de : » chaque poste) et, pour un chef de projet ou un testeur, la personne vue. Clé `localStorage` `enogia_home_viewas`. La disposition réglée sur un poste vaut pour tout le poste.
- **Ajouter un cadran** : catalogue rangé par page du site (Vue d'ensemble, Projets, Tests, Atelier, Production turbines, Gestion, Échanges), chaque cadran avec ce qu'il montre.
- **Tests** : une machine expédiée a ses tests validés (« Tests faits : machine expédiée ») ; calcul à l'affichage, jamais écrit en base.
- **Fond des pages** (`pageBackdrop.js`) : papier millimétré (maille 32 px, trait 160 px), motif de la page avec annotations (repères du cycle, étiquettes P&ID, unités, cotes, températures) en haut à droite, second motif retourné en bas à gauche (`PAGE_SECOND`), même opacité.
- Fichiers : App.js, pageBackdrop.js, components/{HomeView,RoleHome,Arrange,TestsTab,ChangesView,ChangesNotice,ManagerPanel,ManagerFiche,KpiPilotage,CdpReport,Series}.js, reports/cdpPptx.js, planner/Planner.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v232 — Nom du site « BU ORC – Pilotage »

- `src/siteName.js` : SITE_NAME « BU ORC », SITE_SCOPE « Pilotage » (menu, accueil, écran de connexion, titre de l'onglet) ; `public/index.html` (titre, description, titre iOS) ; `public/manifest.json` (« BU ORC – Pilotage », court « BU ORC Pilotage ») ; titre bêta dans `App.js`. Le sous-titre ne change pas. Le dépôt et `homepage` (`planning-enogia-2026`) restent inchangés : l'adresse du site ne bouge pas.
- Une appli déjà installée sur un téléphone peut garder l'ancien nom jusqu'à sa réinstallation.

## v233 — Un fond plus discret

- **Fond** (`pageBackdrop.js`) : deux couches seulement — papier millimétré sur toute la page et **un seul motif pâle, sans texte** dans le coin haut droit (diagramme T-s du cycle ORC, diagramme de Mollier h-s, rotor de turbine). Retirés : tuyauterie P&ID, traces de banc, isothermes, second motif en bas à gauche, annotations.
- **Tableaux** : papier millimétré très léger sous les lignes (`#enogia-main table`, variable `--enogia-grid` posée sur `<main>`).
- **Barre du haut** : plus de « N unités · Mis à jour le … · N PJ modifiés » (le journal reste dans Modifications ; « ✓ Enregistré » reste).
- Pas de nouvelle clé `localStorage`.
- Fichiers : pageBackdrop.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v234 — Le site s'appelle « Cockpit ORC »

- `siteName.js` : `SITE_NAME` = « Cockpit », `SITE_SCOPE` = « ORC », `SITE_TITLE` = « Cockpit ORC ».
- Menu, accueil et écran de connexion : « Cockpit » en gras, « ORC » au surligneur (`Hl`, or).
- `public/index.html` (titre, description, titre iOS), `public/manifest.json` (nom et nom court), titre bêta « [BÊTA] Cockpit ORC ».
- Une appli déjà installée sur un téléphone peut garder l'ancien nom jusqu'à sa réinstallation. Dépôt et adresse inchangés.
- Pas de nouvelle clé `localStorage`.
- Fichiers : siteName.js, App.js, components/{HomeView,LoginScreen}.js, public/{index.html,manifest.json}, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v235 — Plus de cadrans, disposition commune, règles de sécurité

- **Cadrans** (`RoleHome.js`) : Dernières expédiées, Visites client / NOBO (toutes machines), Au banc cette semaine, Machines par état, Départs par mois (6 mois), Fermetures à venir, Raccourcis. Rangés dans le catalogue « Ajouter un cadran ». Accueil « Autres personnes » par défaut : chiffres clés, départs, parcours, banc de la semaine, visites, expédiées, états, fermetures.
- **Disposition commune** : `ArrangeCtx` (Arrange.js) fourni par App autour de `<main>` ; les pages sans disposition propre (KPI › Synthèse, Tests › semaine) lisent `planning/profiles.pageLayouts[id]` ; seul le propriétaire enregistre (`savePageLayout`). Les anciennes dispositions locales (`enogia_arr_kpi-synthese`, `enogia_arr_tests-semaine`) ne sont plus lues : à refaire une fois par le propriétaire.
- **Sécurité** : `firestore.rules` (nouveau) et `SECURITE.md` (procédure). **Non publiées** : Gabriel les colle et les publie dans la console Firebase après test dans le terrain de jeu des règles. Tout nouveau document de `planning/` devra être ajouté aux règles.
- Fichiers : components/{Arrange,RoleHome}.js, App.js, firestore.rules, SECURITE.md, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v236 — Le site s'appelle « Cockpit BU ORC »

- `siteName.js` : `SITE_SCOPE` = « BU ORC » (surligneur, sans retour à la ligne entre BU et ORC) ; titre, manifeste et titre bêta « Cockpit BU ORC ».
- Adresse web visée : `https://cockpit-bu-orc.github.io/ENOGIA/` — **pas encore changée**. Il faut d'abord renommer l'organisation GitHub (Planning-ENOGIA-BU-ORC → cockpit-BU-ORC) et le dépôt (planning-enogia-2026 → ENOGIA), puis `homepage` dans `package.json`, le domaine autorisé dans Firebase Authentication et la restriction de la clé API. L'ancienne adresse cessera de fonctionner (pas de redirection des pages GitHub).
- Fichiers : siteName.js, App.js, components/{HomeView,LoginScreen}.js, public/{index.html,manifest.json}, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md.

## v237 — Nouvelle adresse : cockpit-bu-orc.github.io/ENOGIA

- Compte GitHub renommé `cockpit-BU-ORC` et dépôt `ENOGIA` (par Gabriel). `package.json` : `homepage` = `https://cockpit-bu-orc.github.io/ENOGIA` ; adresse git `origin` = `https://github.com/cockpit-BU-ORC/ENOGIA.git` (réglage local, hors commit).
- **Avant le premier déploiement** : Firebase › Authentication › Paramètres › Domaines autorisés → ajouter `cockpit-bu-orc.github.io` (sinon la connexion Google est refusée). Restriction de la clé API (Google Cloud › Identifiants) sur `https://cockpit-bu-orc.github.io/*`.
- L'ancienne adresse ne fonctionne plus (pas de redirection des pages GitHub) : prévenir les utilisateurs, réinstaller l'appli sur téléphone.
- Alerte GitHub « Google API Key » (secret scanning) : c'est la clé web Firebase, publique par nature (elle est dans le code envoyé au navigateur). Elle est protégée par les règles Firestore, la restriction de domaine et, plus tard, App Check. Le fichier `.map` signalé date de juin ; `.env` désactive les `.map` depuis, et le déploiement production efface les anciens fichiers. Fermer l'alerte en « Won't fix » une fois la clé restreinte.
- Fichiers : package.json, releaseNotes.js, releaseCatalog.js(+test), App.js, CLAUDE.md, DEPLOIEMENT.md, SECURITE.md.

## v238 — Personnes, rôles et responsable des testeurs

- **Responsable des testeurs** : nouveau rôle `resptest` (Manager › Réglages › Personnes et rôles). Donne la page Tests sans être admin ni testeur, avec toutes les machines (pas de filtre « mes tests ») ; il renseigne l'avancement et le résultat de chaque test. Affecter les testeurs et le catalogue restent aux admins. Accueil : cadrans testeur sur l'ensemble des testeurs + Postes de test + Tests (chiffres).
- **Personnes et rôles** : bouton « Retirer » (confirmation ; profil gardé avec `removed: true`, liste « Personnes retirées » avec « Rétablir ») et « Coller une liste » (une personne par ligne, `Prénom NOM <adresse>` ou l'adresse seule ; seules les @enogia.com sont gardées).
- **Mentions** : les personnes de `planning/profiles` (non retirées) sont proposées dans la saisie @ avant leur première connexion ; une personne retirée n'est plus proposée.
- Données : uniquement `planning/profiles` (écrit par le propriétaire, déjà couvert par les règles Firestore). Pas de nouvelle clé `localStorage`.
- La liste des collègues n'est pas dans le code (dépôt public) : elle se colle dans la page.
- Fichiers : profiles.js, mentions.js, App.js, components/PeopleRoles.js, components/TestsTab.js, components/RoleHome.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v239 — Les PJXX ne comptent nulle part

- Demandé : « quand je fais des modifications sur le planificateur, ne jamais prendre en compte les PJXX (ni dans les modifications, nulle part) ».
- `isEstimatePj` (changeDiff.js) reconnaît aussi PJXX, PJ4XX, PJXX-2 (avant : PJXXX seulement).
- Planificateur (engine.js) : pas publiés (`planToRows` les retire, même s'ils étaient déjà dans le planning actuel), pas dans les écarts (`diffRows`, `summarizeChanges`, `diffPlans`), pas dans la charge atelier (`atelierPhases` → `loadModel`, donc aussi KPI et accueils). **Changement** : depuis la V224 ils restaient comptés dans la charge ; ce n'est plus le cas.
- App : exclus de toutes les pages (`dataWithOverrides`) et du bandeau « ancrer dans l'initial » après une publication.
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : changeDiff.js(+test), planner/engine.js(+test), planner/Planner.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v240 — Cloche en rouge

- Demandé : « mettre la notification de la cloche en rouge ». `MentionBell.js` : quand il y a des demandes, l'icône, la pastille et le compteur « (n) » passent du violet au rouge (`T.red600`) ; le chiffre de la pastille prend la couleur de carte (`T.card`), lisible en clair comme en sombre.
- Pas de nouvelle clé `localStorage`, pas de donnée Firestore.
- Fichiers : components/MentionBell.js, releaseNotes.js, releaseCatalog.js(+test), App.js, CLAUDE.md, DEPLOIEMENT.md.

## v241 — Projets EPC : chef de projet EPC, chef ORC en soutien

- Demandé : « pour un projet EPC, le chef de projet est la personne qui doit être dans la liste ; le chef de projet ORC est en soutien ; impossible d'avoir un lien entre Clément MARTOUZET et EPC ».
- `pjMeta.js` : `chefsOf` renvoie le chef de projet de la fiche + les autres chefs, sans jamais le chef ORC en soutien (l'ancienne règle V197 mettait le chef ORC à la place). Conséquences : Liste, regroupements des fiches projet, camembert « Par chef de projet », Personnes et rôles (PJ d'un chef), accueils chef de projet.
- `orcSupportOf(meta)` : nom du chef ORC en soutien, affiché « soutien ORC : … » dans la fiche projet (ProjectModal) et la fiche synthèse (ManagerFiche). Pastille EPC : « EPC » seul.
- Saisie (`ChefsEpc.js`) : « Chef de projet ORC en soutien » + phrase d'explication. Données inchangées (`epc`, `chefOrc`).
- Test ajouté (143 tests). Pas de nouvelle clé `localStorage`.
- Fichiers : pjMeta.js, components/ChefsEpc.js, components/ProjectModal.js, components/ManagerFiche.js, customEtats.test.js, releaseNotes.js, releaseCatalog.js(+test), App.js, CLAUDE.md, DEPLOIEMENT.md.

## v242 — Vidéo de présentation à la connexion

- Demandé : « intégrer cette vidéo à l'ouverture des prochaines connexions des gens et la laisser disponible pendant 1 semaine ».
- `components/TutoVideo.js` : fenêtre vidéo (Drive `/preview`, YouTube `youtube-nocookie`, ou fichier .mp4), bouton « Vidéo » de la barre du haut, réglage propriétaire.
- Ensuite (demandé : « ne pas s'ouvrir à chaque connexion, la laisser dispo dans l'onglet notification, sans laisser le 1 apparent ») : proposée une seule fois, puis ligne « Regarder » dans la cloche ; elle ne compte pas dans la pastille. Plus de bouton « Vidéo » dans la barre.
- Réglage : Manager › Réglages › Nouveautés › « Vidéo de présentation » : lien, titre, date de fin (par défaut : dans 7 jours). « Publier » = nouvel identifiant → s'ouvre à la prochaine connexion de chacun ; « Enregistrer sans rouvrir » ; « Retirer ».
- Données : `planning/profiles.tutoVideo` (écrit par le propriétaire, déjà couvert par les règles Firestore). Clé `localStorage` : `enogia_tuto_seen_<id>_<adresse>` (vidéo déjà vue sur ce poste).
- **La vidéo n'est pas dans le dépôt** : le dépôt et GitHub Pages sont publics et la vidéo montre de vraies données. La déposer sur le Google Drive ENOGIA, partage « ENOGIA : toute personne ayant le lien », et coller le lien.
- Fichiers : components/TutoVideo.js, components/SharedUI.js (icône play), components/ManagerPanel.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v243 — Machines livrées = machines expédiées

- Demandé : « pourquoi 12 machines livrées mais seulement 10 expédiées ? » → aligner.
- `pjMeta.js` : `countShippedYTD` compte l'état « Expédiée » (départ dans l'année) au lieu de tout départ passé ; nouveau `departedNotShipped` (départ passé, pas « Expédiée », hors PJXX et slots libres).
- Liste (`DashboardSummary`) et accueil (`HomeView`) : ligne orange « + N départs passés pas encore « Expédiée » » avec les n° de PJ.
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : pjMeta.js, components/DashboardSummary.js, components/HomeView.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v244 — Lecteur vidéo et pop-up Nouveautés

- Demandé : « je n'arrive pas à fermer le lecteur lorsque la vidéo se lance » ; « pourquoi il y a 2 pop-up (Nouveautés) : en avoir un seul, sélectionner ce que je veux afficher et pouvoir le modifier, sans le numéro de version ».
- `TutoVideo.js` : largeur limitée par la hauteur de l'écran (`(100vh - 150px) × 16/9`), bouton « Fermer » visible ; clic en dehors / Échap ferment.
- `ReleaseNotes.js` : `ReleaseManager` remplace les deux blocs (catalogue + éditeur) — coches, reformulation sur place, lignes libres, aperçu ; « Enregistrer » corrige le pop-up publié sans le réafficher, « Publier » le réaffiche. `ReleasePopup` : lignes à la suite, sans titre ni numéro de version.
- Données : `planning/overrides.releaseSelection` gagne `edits` et `extra` (document déjà couvert par les règles). Pas de nouvelle clé `localStorage`.
- Fichiers : components/ReleaseNotes.js, components/ManagerPanel.js, components/TutoVideo.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v245 — Tout voir avec un affichage agrandi par Windows

- Demandé : « garder le même format mais avoir la vision globale même si les gens ont une résolution plus grande (150 %) sur Windows ».
- Un site ne peut pas régler le zoom du navigateur ; un zoom CSS forcé sur la page a été essayé et décale les menus flottants (filtres, pop-ups) et le glisser-déposer. On guide donc vers le zoom du navigateur, que Chrome et Edge retiennent par site.
- `components/ZoomHint.js` : bandeau en tête de page quand Windows agrandit l'affichage (devicePixelRatio ≥ 1,2, largeur < 1900 px) : « Ctrl et − (N fois, zoom X %) » ; disparaît de lui-même une fois le zoom fait, ou avec « Compris ». Même conseil dans le message « N colonnes masquées » de la Liste.
- Clé `localStorage` : `enogia_zoomhint_off` (bandeau masqué).
- Fichiers : components/ZoomHint.js, components/TableView.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v246 — KPI refaits (maquettes Claude Design)

- Demandé : maquettes de la page KPI dans Claude Design, puis « je veux les 3 ».
- A — `KpiPilotage.js` (KPI › Synthèse) : 5 chiffres (en production, départs d'ici 30 jours, en retard sur l'initial, charge 4 semaines avec la semaine la plus chargée, livrées cette année) ; « PJ à risque » avec la pastille d'état ; charge plus haute, en heures, avec la date de chaque semaine ; portefeuille par état en barre à 100 % avec légende chiffrée. `loadWeeks` (charge sur n semaines) et `weekLabel` exportés.
- B — `KpiViews.js` › `KpiDerivesHead` en tête de KPI › Dérives : titre-réponse, classement des 14 plus fortes dérives (clic = fiche), départs des 30 prochains jours, dérive moyenne et retards déclarés.
- C — `KpiViews.js` › `KpiSemaines`, nouvelle sous-page KPI › Semaines : 8 colonnes (charge vs capacité, départs avec dérive, machines au banc), « À décider ».
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : components/KpiPilotage.js, components/KpiViews.js (nouveau), components/ManagerPanel.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v247 — Ouvertures et fermetures de fenêtres harmonisées

- Demandé : audit UX/UI des transitions et ouvertures de pop-up, puis « next step » (mise en œuvre des propositions).
- `styles.css` (bloc v247) : jetons de durée (micro 120 ms, menus 160 ms, fenêtres 240 ms / 170 ms en sortie) ; toutes les fenêtres modales entrent de la même façon (montée de 14 px + léger agrandissement, sans rebond), leur fond en fondu, les menus et sélecteurs en 160 ms ; doublons retirés (transition des boutons, règle « réduire les animations »).
- `src/motion.js` (appelé dans `index.js`) : sortie animée de toute fenêtre modale (copie inerte `.enogia-ghost` jouée 170 ms puis supprimée ; la fiche d'un PJ garde sa propre sortie), focus clavier placé dans la fenêtre, Tab / Maj+Tab gardés dans la fenêtre du dessus, focus rendu à l'élément d'origine à la fermeture. « Réduire les animations » : pas de copie de sortie.
- `aria-modal="true"` ajouté aux fenêtres Bancs d'essai et Liens du planificateur.
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : motion.js (nouveau), index.js, styles.css, planner/Planner.js, planner/PlannerGantt.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v248 — Fond flouté et cascades au même rythme

- Suite de l'audit des transitions (« next step ») : points 4 et 5.
- `styles.css` (bloc v248) : flou léger (4 px) de l'arrière-plan sous toutes les fenêtres modales — avant, seules 5 fenêtres le faisaient ; la fiche d'un PJ garde son flou de 6 px ; jamais sous un menu ou un sélecteur. Cascades d'apparition au même rythme : 40 ms entre deux éléments, 200 ms de retard au plus (accueil : 350 ms avant).
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v249 — Fenêtres vérifiées une par une

- Demandé : vérifier toutes les fenêtres touchées par la V247. Ouvertes et fermées dans le site local : Étapes (Liste), Aller à…, États des machines, feux de statut, saisie sur plusieurs projets, rapports chef de projet et CODIR, liste des composants, Déclarer un retard, fiche de tests, Bancs d'essai, Écran atelier, Liaisons Cash in, Nouveau projet SAV, vidéo, fiche d'un PJ.
- Corrigé :
  - `styles.css` : le flou et le fondu du fond ne s'appliquent qu'à un vrai fond (`position: fixed`) ; sur le conteneur de la page, le flou décalait le volet « Déclarer un retard » (215 px du haut au lieu de 0).
  - fenêtres dont le fond porte lui-même `aria-modal` (8 fenêtres) : le fond se fond et se floute, seul le contenu monte (avant, tout le fond glissait) ; sortie assortie.
  - volet à droite : entrée et sortie latérales ; son fond (élément voisin) se fond, se floute et s'efface avec lui (`motion.js`).
  - `TestsTab.js` : focus sans défilement (la fiche de tests s'ouvrait remontée de 74 px).
  - `EtatsDialog.js` : plus de focus automatique sur le champ du bas (la fenêtre s'ouvrait défilée, titre masqué).
- Non ouvertes (il faut des données ou une action précise) : Liens du planificateur, alerte de modifications, ajout à l'initial, certifications. Elles suivent les mêmes règles.
- Fichiers : styles.css, motion.js, components/TestsTab.js, components/EtatsDialog.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v250 — Critique design : un sens par pastille, cadrans entiers

- Demandé : une critique design avec un autre skill (design-critique), puis « les trois » recommandations.
- `ChangesNotice.js` (`NewMark`) : le décalage dû à la dernière mise à jour s'affiche « ↻ +N j » sur fond gris ; la pastille rouge « +N j » reste réservée à l'écart avec le planning initial (avant : PJ461-1 à +113 j dans le Calendrier, +160 j ailleurs). `CalendarView.js` : légende « ↻ = décalage de la dernière mise à jour », « Client + NOBO » retiré (doublon).
- `Arrange.js` : hors mode disposition, un cadran prend au moins la hauteur de son contenu (les cadrans qu'il recouvre descendent) ; la disposition enregistrée ne change pas. `styles.css` : pas de marge basse ni de barre de défilement dans un cadran placé librement.
- `HomeView.js` : chiffres clés de l'accueil — livrées en vert, en retard en rouge, départs en encre (avant : départs en vert, retard en ocre).
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : components/ChangesNotice.js, components/CalendarView.js, components/Arrange.js, components/HomeView.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v251 — Gantt épuré (maquette Claude Design)

- Demandé : trois pistes pour le Gantt dans Claude Design (canevas « Cockpit — Gantt »), puis « Piste A ».
- `GanttView.js` : le départ prévu au planning initial devient un losange gris, relié au départ actuel par un pointillé de la couleur de l'écart (rouge plus de 10 j, ambre 4 à 10 j, vert sinon) ; il remplace la barre initiale en pointillés sous chaque ligne. En-tête sur deux lignes : le mois (en gras, aligné à gauche), puis « S45 · 2 » (semaine et date du lundi) ; l'ancienne ligne des jours est retirée. Légende : « Départ initial », « Glissement ».
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : components/GanttView.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v252 — Cash in pour les admins, commentaires, première connexion

- Demandé : « déployer le Cash in aussi aux admins », « un bouton dans À traiter pour voir toutes les facturations et encaissements prévus jusqu'à fin 2026 », « les admins peuvent supprimer des commentaires », « la vidéo de la première connexion ne se fermait pas », « comment éviter le bandeau (connexion interrompue) lors des premières connexions ? ».
- **À faire par Gabriel : republier `firestore.rules`** (console Firebase › Firestore › Règles, voir SECURITE.md). Sans cela, les admins voient le Cash in mais la lecture est refusée.
- `roles.js` : `CASH_FOR_ADMINS = true`. `firestore.rules` : `cashin` / `cashinLinks` lisibles et modifiables par les admins (`isAdmin`), plus seulement le propriétaire.
- `cashinModel.js` : `plannedUntil(rows, until)`. `CashInNative.js` : « À traiter » toujours affiché, bouton « Prévu jusqu'à fin 2026 » → fenêtre mois par mois (déjà en retard, puis chaque mois), totaux à facturer / à encaisser, filtre Tout / Facturations / Encaissements, clic = le jalon.
- Commentaires : `deleteComment` sans code Manager ; dans la Liste des commentaires, le tableau et la fiche, « Supprimer ce commentaire ? » + Confirmer.
- Vidéo : une vidéo ouverte d'elle-même à la connexion restait affichée après « Fermer » (aucun état ne changeait) ; `tutoClosedId` la retire tout de suite.
- Première connexion : les lectures temps réel (planning, initial, réglages, commentaires, fiches, retards, types de retard, accès Manager, journal) démarrent après la connexion Google (`authUid`). Avant, elles partaient sans compte, étaient refusées par les règles et ne repartaient plus : bandeau « connexion interrompue » et données figées jusqu'au rechargement.
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : roles.js, firestore.rules, cashinModel.js, components/CashInNative.js, components/CommentsKanban.js, components/CommentsView.js, components/ProjectModal.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v253 — Calendrier affiné (maquette Claude Design)

- Demandé : trois pistes pour le Calendrier dans Claude Design (canevas « Cockpit — Calendrier »), la piste A vue aussi en mode Jours, puis « Oui, intègre ».
- `CalendarView.js` : la production devient une bande continue d'une case à l'autre (semaines ou jours), arrondie seulement au début et à la fin, avec « Production → date de fin » au début ; les jalons (arrivée, tests, fin de prod, départ, et leurs combinaisons) deviennent des pastilles ; la présence client / NOBO devient deux petits ronds « C » / « N » (aussi dans la légende). La grille, la colonne du jour, les fermetures, les clics (fiche, jour sans production) ne changent pas.
- Vérifié ensuite dans le site local (Semaines et Jours) : les pastilles combinées (« Tests + Fin prod ») sont séparées en une pastille par étape (le fond en diagonale rendait le texte illisible sur le vert foncé) ; en mode Jours étroit, la pastille remplit la case avec un texte abrégé.
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : components/CalendarView.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v254 — Couloirs éditables, chefs ORC dans les fiches, cloche des projets modifiés

- Demandé : « en mode couloirs, cliquer sur la tâche pour un pop-up où modifier les dates, la durée et la charge » ; « dans les fiches projet, les chefs de projet sont uniquement les CdP ORC » ; « quand mon projet (chef de projet) subit une modification, je devrais avoir une notification sur la cloche ».
- `planner/PlannerLanes.js` : `StepDialog` (fenêtre rendue dans `<body>`) — début (date imposée « pas avant »), fin ou durée en jours ouvrés, charge en heures (atelier pour Production / Packing, essai pour les bancs), « Libérer la date imposée » ; ouverte au clic ou avec Entrée, pas juste après un glisser. Rien ne change pour les autres avant « Publier ».
- `pjMeta.js` : `orcChefsOf`, `epcChefOf`. `ManagerFiche.js` : chefs affichés, liste « Par chef », vue d'un chef et « Mes PJ » sur les chefs ORC ; projet EPC : « chef EPC : … » en mention (au lieu de « soutien ORC »). Les autres pages gardent la règle V241.
- Cloche : `App.js` `myPjChanges` (publications du planning touchant mes PJ depuis mon dernier « Vu », 14 jours par défaut) ; `MentionBell.js` : section « Vos projets modifiés par le planning » (nouveau, départ ± N j, dates modifiées), « Vu », lien vers Modifications ; comptée dans la pastille rouge.
- Clé `localStorage` : `enogia_mypjchg_seen_<adresse>`.
- Fichiers : planner/PlannerLanes.js, pjMeta.js, components/ManagerFiche.js, components/MentionBell.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v255 — Livraison prévue calculée, Commentaires (piste B), Modifications (piste A)

- Demandé : « livraison prévue : marqué en italique qu'il s'agit de la date de livraison transport compris ; mettre la date de fin projetée + durée transport » ; « B en commentaires avec un Kanban ou une vision globale » ; « A en modifications » (canevas Claude Design « Cockpit — Commentaires et Modifications »).
- `penalties.js` : `livrPrevueOf(meta, depart)` = départ prévu + `meta.transportJ` jours, sinon `meta.livrPrevue` ; utilisé par `penaltyCalc` (référence « Livraison ») et `CdpReport`. `ManagerFiche.js` : `LivrPrevueField` — durée « transport … j », date calculée (ou saisie si pas de durée), mention en italique.
- `CommentsView.js` : `OpenAsks` — demandes en attente (cité avec @, pas encore « traité »), cartes avec Répondre / Marquer traité, 6 visibles puis « Voir les N autres » ; sans demande, une ligne explique comment en créer. Kanban et Fil en dessous. `App.js` passe `resolveComment`.
- `ChangesView.js` : journal des publications à gauche, détail à droite (phrase de synthèse + tableau) ; `ChangesTable.js` : la liste « Version à afficher » n'apparaît que si `refs` est donné.
- Donnée Firestore : `pjMetaOverrides` gagne `transportJ` (document déjà couvert par les règles). Pas de nouvelle clé `localStorage`.
- Fichiers : penalties.js, components/ManagerFiche.js, components/CdpReport.js, components/CommentsView.js, components/ChangesView.js, components/ChangesTable.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v256 — Cash in au format artefact

- Demandé : « garder le format et le design du Cash in en format artefact et non la solution du site » ; « les modifications du Cash in ne sont visibles que sur la version du site ».
- `CashInTab.js` : le format artefact (page d'origine `public/cashin.html`, mêmes données `planning/cashin`) s'ouvre par défaut pour tout le monde ; « Cash in du site » reste à un clic (choix mémorisé dans la nouvelle clé `enogia_cashin_format2` : un ancien choix ne l'empêche plus). Bouton « Prévu jusqu'à fin 2026 » ajouté à la barre de ce format (même fenêtre que dans la version du site ; clic sur une ligne = le PJ dans la page).
- Clé `localStorage` : `enogia_cashin_format2` (`artefact` par défaut, `site`).
- Fichiers : components/CashInTab.js, components/CashInNative.js (PlannedDialog exporté), App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v257 — Turbines par PJ, Cash in unique

- Demandé : « enlever le Cash in du site » ; « le bouton Prévu jusqu'à fin 2026 dans le cadran À traiter, à côté de Mois prochain » ; Turbines : « enlever la communication au responsable des turbines ainsi que tout système d'import ou d'export pour l'instant » et « une feuille qui me permet de dire, par PJ, quelles turbines, la quantité, la ou les roues et le ou les injecteurs ».
- Cash in : seul le format d'origine (`public/cashin.html`) reste ; le bouton « Prévu jusqu'à fin 2026 » de la page envoie `{src:'cashin', type:'planned'}` au site, qui ouvre la fenêtre. `CASHIN_PAGE_VERSION` = 257 (recharge la page). Clé `enogia_cashin_format2` plus lue.
- Turbines : plus d'import / export Excel ni de liste « À communiquer » (onglet, tableau d'attribution, cadran Turbines de l'accueil). Feuille « Turbines par PJ » : une ligne par PJ en cours (« Afficher les PJ expédiés » pour tout voir), turbine (100LT / 20LT / Aucune ; proposition d'après la gamme), quantité, roues, injecteurs (plusieurs séparés par des virgules, noms connus proposés), note. Données : `planning/turbines.pjSheet[PJ] = { type, qty, wheels, injectors, note, at }` — document déjà couvert par les règles.
- Fichiers : public/cashin.html, cashinData.js, components/CashInTab.js, components/TurbinesTab.js, components/TurbineBoard.js, components/RoleHome.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v258 — Planificateur : publication, annonces, dates imposées

- Demandé : « choisir les modifications que j'annonce aux utilisateurs (les heures n'intéressent pas les autres) » ; « les modèles par gamme ne s'appliquent qu'aux PJ non commencés en production » ; « à certains moments cela ne se publie pas ; je ne sais pas quand la date est imposée ni laquelle ; avoir la main sur le début d'une tâche tant qu'elle est liée ».
- Publication : la cause était le calendrier — l'écran compte les jours sans production de chaque PJ (Calendrier), la publication ne les comptait pas ; elle recalculait d'autres dates (souvent celles déjà publiées), d'où des changements qui revenaient. `publishPlan` reçoit maintenant `productionExclusions`.
- Annonces : une case par changement dans « Publier » (heures décochées par défaut) ; tout est publié, seuls les changements cochés vont au journal des modifications (page Modifications, cloche, repères ↻).
- Modèles par gamme : seulement les PJ dont la production n'a pas commencé (début ≤ aujourd'hui ou état Montage, Élec, Tests, Packaging, Expédiée) ; la fenêtre affiche « N / M PJ à venir ».
- Début d'une tâche : la fenêtre d'une tâche (Couloirs) et l'infobulle des barres disent ce qui fixe le début et la date imposée (et si elle est sans effet) ; le début choisi est respecté en gardant les liens du PJ (plus tard = date imposée, plus tôt = avance sur le lien). Même règle dans la colonne Début du Gantt.
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : planner/engine.js (+test), planner/store.js, planner/Planner.js, planner/PlannerLanes.js, planner/PlannerGantt.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v259 — Bancs en frise, nivellement réglable, clic droit pour se déplacer

- Demandé : « livrées depuis le mois de mai » ; « pas de légende Autres, tout indiquer » ; « Bancs d'essai : une frise avec les 2 bancs l'un au-dessus de l'autre, allouer en glisser-déposer » ; « le clic droit enfoncé pour se déplacer sur tout le site » ; « choisir de quand à quand je nivelle la charge et sur quelle capacité ».
- Machines livrées : état Expédiée avec départ depuis le 1er mai 2026 (`SHIPPED_SINCE`, pjMeta.js) ; libellés « Livrées depuis mai » (accueil, KPI › Synthèse), « depuis le 1er mai 2026 » (Liste).
- Camemberts de la Liste et du Manager : toutes les valeurs, légende sur 2 colonnes au-delà de 6 (noms abrégés avec « … » si la place manque).
- Planificateur › Bancs d'essai : frise des 2 bancs ; glisser une machine sur l'autre banc (ou flèche haut / bas) l'y affecte ; chevauchements en rouge.
- Planificateur › Niveler la charge : fenêtre « Du / Au / Capacité (h par semaine) », puis aperçu à appliquer ou annuler comme avant.
- Clic droit maintenu + glisser : fait défiler la zone sous la souris sur tout le site (`src/pan.js`) ; un clic droit sans bouger garde son menu.
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : pan.js (nouveau), index.js, pjMeta.js, components/DashboardSummary.js, components/ManagerParts.js, components/HomeView.js, components/KpiPilotage.js, planner/engine.js (+test), planner/Planner.js, planner/PlannerLoad.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v260 — Bancs dans le temps, retards contractuels, Cash in lié au planning, agenda des testeurs, ménage

- Demandé : « glisser les tests dans le temps sur la frise des bancs » ; « alertes de retard contractuel avec pénalités dans l'aperçu avant publication » ; « Cash in relié au planning : jalon qui suit le départ ou les tests, signal quand un glissement repousse un encaissement » ; « agenda des testeurs (.ics) » ; « supprimer le code mort » ; « corriger les 13 avertissements et découper App.js ».
- Planificateur › Bancs d'essai : glisser une machine à gauche / droite décale le début de ses tests en jours ouvrés, en gardant les liens du PJ (flèches ← → au clavier).
- Planificateur › Publier : encadré rouge des PJ qui dépassent (davantage) leur date contractuelle, retard avant → après et pénalités estimées ; encadré des facturations liées au planning qui reculent.
- Cash in : bouton « Jalons liés au planning » (date suivie + décalage en jours, jalon par jalon ; enregistré dans le document `cashinLinks`, clé `anc:<id>` — pas de nouveau document, règles inchangées) ; bandeau « N jalons ne suivent plus le planning » avec « Mettre à jour les dates » (écrit la facturation prévue dans `planning/cashin`, l'encaissement prévu suit le délai du jalon). Les jalons facturés ne bougent jamais.
- Tests › Par testeur : « Mon agenda (.ics) » (testeur connecté) et une icône par testeur : fichier pour Outlook / Google Agenda. Réimporter le fichier après une publication met les événements à jour (même identifiant). Un abonnement qui se met à jour seul demande un service en ligne (même décision que les e-mails).
- Ménage : anciens composants du Cash in du site supprimés (CashInNative, CashInGrid, CashInViews ; la fenêtre « Prévu jusqu'à fin 2026 » passe dans CashInPlanned.js) ; lecture Excel, fichier du responsable, import / export et « à communiquer » retirés de turbines.js (et leurs 14 tests). 0 avertissement ESLint. App.js : documents Firestore dans `src/appDocs.js`, bandeau bêta et compte connecté dans `components/AppChrome.js` (1 321 → 1 248 lignes).
- Tests : 134 / 23 suites (nouveau : ics.test.js).
- Pas de nouvelle clé `localStorage`.
- Fichiers : planner/Planner.js, penalties.js, cashinLink.js, components/CashAnchors.js (nouveau), components/CashInTab.js, components/CashInPlanned.js (nouveau), components/CashInNative.js / CashInGrid.js / CashInViews.js (supprimés), ics.js (nouveau), ics.test.js (nouveau), components/TestsTab.js, turbines.js (+test), cashinData.js, components/CalendarView.js, components/GanttView.js, components/ManagerPanel.js, components/TableView.js, parsers.js, appDocs.js (nouveau), components/AppChrome.js (nouveau), App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v261 — Découpage d'App.js (rien ne change à l'écran)

- Demandé : « continuer le découpage d'App.js ».
- `src/useAppData.js` (nouveau) : lectures temps réel et enregistrements du pool de turbines, des tests, de Production turbines, des retards et du Cash in, sortis d'App.js à l'identique.
- `src/listFilters.js` (nouveau) : état des 11 filtres de la Liste, valeurs proposées, calcul de la liste filtrée (+ `listFilters.test.js`).
- App.js : 1 248 → 1 134 lignes (1 321 avant la V260). 0 avertissement ESLint ; 135 tests / 24 suites.
- Vérifié dans le site local : Liste (33 machines, filtres), Tests, Turbines, Production turbines, Cash in, accueil.
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : App.js, useAppData.js (nouveau), listFilters.js (nouveau), listFilters.test.js (nouveau), releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v262 — Page Achats / Appro et kit du responsable achats

- Demandé : « un onglet spécial pour les Achats / Appro, pour le suivi des appros des composants qu'on installe sur nos ORC ; le responsable achats travaille le fond sur son Claude, je lui fournis la forme, comme pour Jérémie ».
- Page `achats` (menu Gestion) : propriétaire + adresses de la liste « access » (Achats › Réglages). Accueil, Par PJ, Commandes, Composants, Fournisseurs, Réglages (marge avant l'arrivée du PJ, accès). Date de besoin = arrivée du PJ dans le planning − marge, sauf date saisie ; ligne en retard si la livraison prévue dépasse le besoin.
- **Règles Firestore à republier** : nouvelle ligne `achats` (même principe que `prodTurbines`). Sans elle, la page s'affiche mais n'enregistre rien. Nouveau document `planning/achats` (`beta_achats` en bêta, ajouté à la copie production → bêta).
- Kit : `npm run kit:achats` → `kit-achats/` (ignoré par git) ; retour : `npm run import:achats -- "<fichier>" --dry` puis sans `--dry`. Marche à suivre complète : `kit-achats/Marche-a-suivre.md` (source `scripts/achats-marche-a-suivre.md`).
- Production turbines et Achats / Appro : un seul titre (l'en-tête du site n'est plus ajouté au-dessus de celui de la page).
- Clé `localStorage` : `enogia_achats_tab` (sous-page ouverte).
- Fichiers : components/Achats.js (nouveau), useAppData.js, appDocs.js, App.js, firestore.rules, achats.test.js (nouveau), scripts/achats-kit.js, achats-import.js, achats-consignes.md, achats-marche-a-suivre.md (nouveaux), scripts/prodturb-kit.js (en-tête commun SHARED, kit de Jérémie inchangé), package.json, .gitignore, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v263 — Audit apple-design : glisser-déposer, menus, accessibilité

- Demandé : « toutes » (les 8 retouches de l'audit apple-design).
- Glisser-déposer maison (`src/pointerDrag.js`, avec défilement automatique près des bords comme le glisser du navigateur) dans Tests › Par testeur, le tableau des turbines et le Gantt du planificateur : l'élément suit la souris, la cible s'allume, retour au départ si refusé, Échap annule ; flèches haut / bas au clavier dans Par testeur et le Gantt.
- Planificateur : barre des Couloirs qui suit la souris en continu puis se pose sur son jour ; frise des bancs qui atterrit depuis l'endroit du lâcher.
- Menus ancrés sur le bouton cliqué (motion.js) ; « Réduire la transparence » et « Contraste élevé » du système respectés ; pastille « Non commandée » : 3 pulsations puis fixe ; doublons CSS des boutons retirés ; petits textes très légèrement espacés.
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : pointerDrag.js (nouveau), components/TestsTab.js, components/TurbineBoard.js, planner/PlannerGantt.js, planner/PlannerLanes.js, planner/Planner.js, motion.js, theme.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v264 — Checklist de debug (Tests)

- Demandé : « dans l'onglet Tests, une checklist de debug — un système de cochage de cellule par ligne, pour chaque machine, au début des phases de tests ; le testeur la remplit puis la signe ; exportée sous le même format » (modèle `PI105-047-XX0003-A-Check list debug.docx`).
- Fiche de tests d'un PJ : nouvelle étape 3 « Checklist de debug (début des tests) » (avancement, NOK, signature) ; « Remplir la checklist » ouvre le tableau : 36 contrôles en 6 sections, OK / NOK (S.O. pour les 7 lignes « Option »), problème rencontré, causalité, correctif, temps correctif, consigne du modèle ; date et nom en tête ; signature (nom, fonction, image) comme les fiches FAT. Les étapes Tests et Signatures deviennent 4 et 5.
- Export Word au format du modèle (A4 paysage, en-tête ENOGIA, tableaux gris), avec en plus le bloc « Validation » signé.
- Données : `planning/tests` (`plans[PJ].debug`) et `planning/testsign_<PJ>` (clé `debug`) — documents déjà couverts par les règles, rien à republier.
- Pas de nouvelle clé `localStorage`.
- Fichiers : debugChecklist.js, debugDocx.js, debugLogo.js, zipStore.js, components/DebugChecklist.js, debugChecklist.test.js (nouveaux), components/TestsTab.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v265 — Fiche d'un PJ (maquette B), dates des fiches projet, liaisons Cash in

- Demandé : « la piste B, mais attention certaines données ne doivent pas être mises à disposition de tout le monde, comme le cash ; les blocs appro et turbines sont encore en cours de dev » ; « dans les fiches synthèse, je suis perdu entre toutes les dates : différencier les dates initiales et les nouvelles dates automatiques ; une livraison prévue sur site client selon le temps de transport, et la date de fin projetée = MàD ORC actuelle » ; « quand je lie du cash à un PJ, pas clair quand répartir un jalon et quand c'est commun ».
- Fiche d'un PJ (Liste, Gantt, Calendrier, accueil) : ligne d'état, barre de parcours, onglets Résumé · Tests · Cash · Commentaires. Cash : seulement avec l'accès Cash in ; contrat : admins (pénalités en euros : accès Cash in). Appro et turbines non affichés.
- Fiches projet › Planning : tableau « Dates de fin et de livraison » (contrat / planning initial / prévision actuelle / écart) et durée du transport ; la livraison prévue se recalcule à chaque publication.
- Liaisons Cash in : « Réparti ÷ N » ou « Machines cochées » jalon par jalon, explications et exemples ; résumé corrigé (le montant « par machine » ne tenait pas compte des jalons non divisés).
- Pas de nouvelle clé `localStorage`, pas de nouveau document Firestore.
- Fichiers : components/RowDetail.js, components/ManagerFiche.js, components/CashLinks.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v266 — Production turbines : retour de Jérémie (gammes 100 kW / 20 kW)

- Demandé : intégrer le fichier renvoyé par Jérémie (`ProdTurbines-kit (1).jsx`).
- Intégré avec `npm run import:jeremie` : son kit partait de la V227 (sans ligne « Base du kit ») et la page du site n'avait pas changé depuis, donc rien n'est perdu.
- Nouveautés de la page : gamme 100 kW / 20 kW (sélecteur ; accueil, planning, stocks et durées propres à chaque gamme ; les données existantes comptent en 100 kW), lots de roues à équilibrer, turbines reconditionnées avec contrôles OK / NOK à chaque étape, consommation des pièces par étape.
- Données : même document `planning/prodTurbines`, mêmes collections (nouveaux champs `gamme`, `checks`, `conso`, `params.r20`) — règles Firestore inchangées.
- Clé `localStorage` : `enogia_prodturb_gamme` (gamme affichée).
- Kit régénéré (`npm run kit:jeremie`) : à renvoyer à Jérémie, c'est sa nouvelle base.
- Fichiers : components/ProdTurbines.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v267 — Un seul onglet Turbines (production + besoins des ORC), reprise des données de Jérémie

- Demandé : « un seul onglet Turbines, avec la prod turbine et la gestion des turbines pour les ORC ; les infos des turbines, roues et injecteurs ne sont vraies que dans la production turbines » ; « récupérer les infos que Jérémie avait dans son outil Claude ».
- Menu Gestion : « Turbines » remplace « Turbines » (ancien pool) et « Production turbines ». Accès : propriétaire + adresses de la liste d'accès de la production.
- Production : la page de Jérémie, seule saisie ; le champ « Affaire / client » d'une turbine propose les PJ du planning.
- Besoins des ORC : calculé, sans saisie (turbines nécessaires, attribuées, date de fin prévue, alertes ; turbines non attribuées ; stocks de roues et d'injecteurs).
- Importer des données (JSON), propriétaire : reprend le fichier exporté de l'outil de Jérémie ; ajoute seulement les éléments nouveaux, aperçu avant d'écrire.
- Ancienne page Turbines retirée (ses données `planning/turbines` restent dans Firestore). Cadran « Turbines (pool) » de l'accueil masqué.
- Clé `localStorage` : `enogia_turbines_tab` (sous-page ouverte).
- Kit de Jérémie régénéré (consigne : garder la propriété `pjs`).
- Fichiers : components/TurbinesHub.js (nouveau), turbinesHub.test.js (nouveau), components/ProdTurbines.js, components/TurbinesTab.js et TurbineBoard.js (supprimés), components/RoleHome.js, App.js, scripts/prodturb-consignes.md, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v268 — Import des données de production ouvert à Jérémie

- Demandé : « mettre à disposition le bouton importer à Jérémie ».
- Turbines › Production : « Importer des données (JSON) » visible pour toutes les personnes de la liste d'accès de la production (en plus du propriétaire). Les règles Firestore autorisent déjà leurs écritures sur `planning/prodTurbines` : rien à republier.
- Pas de nouvelle clé `localStorage`.
- Fichiers : components/TurbinesHub.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v269 — Sous-étapes au clic, dates contractuelles calculées

- Demandé : « on ne voit plus les sous-étapes quand on clique dessus » ; « la Tf contractuelle à côté du T0, calculée par un ajout de semaines ; une ligne MàD ORC et une ligne Livraison sur site avec date contractuelle, prévisionnelle et effectuée ; cocher s'il y a un transport et de combien de jours, la MàD contractuelle se met à jour ».
- Fiche d'un PJ : clic sur une étape du parcours → ses sous-étapes (re-clic pour fermer).
- Fiches projet › Contrat & roadmap : T0, durée en semaines, Tf (échéance = T0 + semaines), case « Livraison sur site client (avec transport) » + jours. Avec transport : MàD contractuelle = échéance − transport ; sans : MàD = livraison = échéance. Les dates calculées sont enregistrées dans les champs habituels (pénalités, rapports, alertes).
- Fiches projet › Dates de fin et de livraison : contractuelle, prévisionnelle (à chaque publication), effectuée (départ réel ; livraison réelle saisie quand il y a transport), écart au contrat.
- Nouveaux champs de fiche (`planning/pjMetaOverrides`) : `contratSemaines`, `transport`, `livrReelle` — document déjà couvert par les règles.
- Pas de nouvelle clé `localStorage`.
- Fichiers : penalties.js, contractDates.test.js (nouveau), components/ManagerFiche.js, components/RowDetail.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v270 — Turbines par PJ et SAV, checklist de debug, sous-étapes, notifications

- Demandé : « le cochage de la checklist de debug ne fonctionne pas » ; « les sous-étapes doivent être toujours visibles » ; « une notification de commentaire ouvre la fiche pop-up à l'endroit des commentaires » ; « dans les besoins turbines, une liste des PJ et des besoins SAV, on glisse dessus des turbines disponibles de la production ; sur chaque fiche projet la turbine, la roue et l'injecteur ; une turbine libre / terminée prise doit sortir de son stock ; les besoins doivent remonter dans son planning ».
- Checklist de debug : chaque case cochée est gardée (la précédente était écrasée).
- Fiche d'un PJ : sous-étapes de l'étape en cours affichées d'office ; clic sur une autre étape = les siennes.
- Cloche : commentaire → fiche du PJ, onglet Commentaires ; projet modifié → fiche, Résumé.
- Turbines › Besoins ORC et SAV : PJ en cours + besoins SAV (« ＋ Besoin SAV »), turbines disponibles à glisser (ou « Attribuer… ») ; une turbine prête attribuée sort du stock de la production (marquée livrée, arbre livré, 1 injecteur vierge décompté) ; × = retour au stock.
- Turbines › Production : encart « Demandes ORC et SAV » (date, turbine, roue, injecteur, stock, turbines attribuées).
- Fiches projet : section « Turbine » (configuration, roue, injecteur parmi les références de la production).
- Données : `planning/pjMetaOverrides` (`turbCfg`, `turbRoue`, `turbInj`) ; `planning/prodTurbines` : collection `besoins`, champs de turbine `besoin`, `sortieOrc`, `injPris`, `injDemande` — documents déjà couverts par les règles.
- Kit de Jérémie : à régénérer (`npm run kit:jeremie`) ; consignes : garder la prop `demandes` et ces champs.
- Pas de nouvelle clé `localStorage`.
- Fichiers : turbineNeeds.js (+ test, nouveaux), components/TurbinesHub.js, components/ProdTurbines.js, components/ManagerFiche.js, components/RowDetail.js, components/MentionBell.js, testPlan.js, App.js, turbinesHub.test.js, scripts/prodturb-kit.js, scripts/prodturb-consignes.md, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v271 — Cloche plus visible, « Vu » sur les commentaires, besoins turbines par emplacement

- Demandé : « cloche pas assez visible » (piste C retenue) ; « montrer que j'ai pris en compte un commentaire » (« Vu ») ; « besoins ORC : design pas clair ; turbines prêtes avec / sans roue ; stock de roues et d'injecteurs aussi en glisser-déposer, qui met à jour le stock de Jérémie ; roue et injecteur à installer signalés par PJ » ; « rien dans l'onglet de Jérémie » ; « fiche projet : piste A, et nombre de bouchages de l'injecteur borné par l'injecteur ».
- Cloche : « N à traiter » écrit, tintement et halo à chaque nouvelle demande, aperçu 6 s de la nouvelle mention (Ouvrir / Vu).
- Commentaires : « Vu » et « Traité » pour la personne citée, visibles de tous (fiche pop-up et fiches projet). Données : `seen` à côté de `resolved` dans `planning/comments`.
- Turbines › Besoins ORC et SAV : stock de la production en tuiles (turbines prêtes / sans roue / en fabrication, roues, injecteurs vierges ou bouchés) ; chaque turbine attendue = emplacement turbine + roue + injecteur ; glisser = sortie du stock (quantités de Jérémie mises à jour), × = retour. Nouvelle collection `allocs` dans `planning/prodTurbines` (déjà couvert par les règles).
- Turbines › Production : encart « Demandes ORC et SAV » retiré.
- Fiches projet › Turbine : cartes, pastilles avec stock, bouchages (`turbInjB`).
- Kit de Jérémie à régénérer (`npm run kit:jeremie`) : consignes 7 bis mises à jour (champs `besoin`, `sortieOrc`, collections `besoins` et `allocs`).
- Pas de nouvelle clé `localStorage`.
- Fichiers : turbineNeeds.js (+ test), components/TurbinesHub.js, components/ProdTurbines.js (retour V269), components/ManagerFiche.js, components/CommentMarks.js (nouveau), components/ProjectModal.js, components/RowDetail.js, components/MentionBell.js, mentions.js, styles.css, App.js, scripts/prodturb-kit.js, scripts/prodturb-consignes.md, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v272 — Checklist de debug en PDF, section Turbine compacte

- Demandé : « exporter la checklist de debug en PDF uniquement » ; « la place pour les turbines est trop importante dans la fiche synthèse ».
- Tests › checklist de debug : « Exporter en PDF » ouvre la checklist au format du modèle (A4 paysage) et lance l'impression : choisir « Enregistrer au format PDF ». Le nom proposé est celui du modèle. Si le navigateur bloque la fenêtre, un message le dit.
- Fiches projet › Turbine : trois lignes courtes (turbine, roue, injecteur + bouchages).
- Pas de nouvelle clé `localStorage`, pas de nouvelle donnée.
- Fichiers : debugPdf.js (nouveau), debugDocx.js et zipStore.js (supprimés), debugChecklist.test.js, components/DebugChecklist.js, components/ManagerFiche.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v273 — Besoins turbines en plateaux, fiches projet plus lisibles (audit apple-design)

- Demandé : « Oui, tout » sur la maquette « Besoins v2 et audit des fiches synthèse ».
- Turbines › Besoins ORC et SAV : un plateau par turbine attendue (turbine · roue · injecteur) ; la pièce prévue est écrite dans son logement ; pendant le glisser, les logements compatibles s'allument et celui de la bonne référence passe en vert ; toucher une tuile puis un logement marche aussi ; « Remplir automatiquement » propose une affectation du stock, annulable ; anneau d'avancement par PJ et barre de progression.
- Fiches projet : onglets collés en haut (Pilotage, Planning, Machine, Finance, Suivi) ; chiffres clés sous l'en-tête ; nouvelle zone Machine (S/N, certification, présence aux tests, turbine) ; zones sans bordure ; étiquettes grises ; feux plus grands ; « ✓ Enregistré » (ou l'échec) après chaque saisie.
- Pas de nouvelle donnée, pas de nouvelle clé `localStorage`.
- Fichiers : turbineNeeds.js (+ test), needsView.test.js (nouveau), components/TurbinesHub.js, components/ManagerFiche.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v274 — Bilan mensuel des KPI, roues imposées, fiches sans trous

- Demandé : « liste des accomplissements du mois dernier et du mois d'avant, objectifs du mois en cours et du suivant » ; « livraison sur site effectuée pas claire, on ne la maîtrise pas » ; « cadrans disproportionnés, beaucoup de blancs » ; « séparer les turbines prêtes avec et sans roue ; message d'erreur si la roue ne correspond pas » ; « couleurs SAV / ORC, taille des cadrans, drapeaux » ; « pousser l'audit au max ».
- KPI › Bilan mensuel : quatre colonnes (deux mois passés, mois en cours, mois suivant), jalons faits / en retard / prévus, écart à l'initial, note libre par mois (enregistrée dans `planning/profiles.monthNotes`).
- Turbines › Besoins : trois groupes de turbines ; mauvaise roue refusée avec message ; ORC en marine, SAV en violet ; drapeaux.
- Fiches projet : blocs rangés en colonnes sans trous ; tailles de texte harmonisées ; livraison sur site « en transport · non confirmée » (date estimée) puis « confirmée ».
- Pas de nouvelle clé `localStorage`. Règles Firestore inchangées (`profiles` déjà écrit par le propriétaire).
- Fichiers : monthReview.js (+ test), components/KpiBilan.js (nouveaux), components/ManagerPanel.js, components/ManagerFiche.js, components/TurbinesHub.js, turbineNeeds.js (+ test), styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v275 — Vue CODIR compacte, jalons par mois, fiches mieux remplies

- Demandé : « cadrans de Dérives trop grands ; sur la vue CODIR un résumé des PJ tenus à date par étape pour des captures PowerPoint » ; « la sévérité des retards ne porte-t-elle que sur les expédiées ? je dois pouvoir choisir » ; « plus de graphiques : arrivées par mois, tests par mois… » ; « fiche projet : trop de zones sans information, finance et machine côte à côte, frise à droite » ; « un graphique des départs, tests et arrivées sur les mois du bilan ».
- Réponse sur la sévérité : elle portait sur toutes les machines qui ont un planning initial (filtres du Manager appliqués), expédiées ou non. Un choix Toutes / En cours / Expédiées s'applique maintenant à toute la vue CODIR.
- KPI › Dérives : résumé compact par étape, jalons par mois, cadrans resserrés. KPI › Bilan mensuel : graphique des quatre mois.
- Fiches projet : Planning (contrat | jalons), Machine | Finance.
- Pas de nouvelle donnée, pas de nouvelle clé `localStorage`.
- Fichiers : components/ManagerPanel.js, components/KpiBilan.js, components/ManagerFiche.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v276 — Période de la vue CODIR, fiche projet plus compacte

- Demandé : « Promesse vs Réalité : choisir les mois pris en compte » ; « mieux gérer les cadrans des fiches projet (audit apple-design) » ; « installer wshobson/agents et l'utiliser pour les KPI à chaque fois ».
- KPI › Dérives : période (mois promis) pour toute la vue CODIR et le résumé par étape.
- Fiches projet : statut global en lignes, indicateurs en une rangée, frises plus basses, jalons payés repliés.
- Skills installés : `kpi-dashboard-design`, `data-storytelling` (dans `.claude/skills/`, non versionnés).
- Pas de nouvelle donnée, pas de nouvelle clé `localStorage`.
- Fichiers : components/ManagerPanel.js, components/ManagerFiche.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v277 — Fiche projet resserrée (fin de l'audit apple-design)

- Demandé : « Oui, fais-les » (Machine plus basse, composants plus serrés, Suivi plus court).
- Fiches projet : Finance sur toute la largeur (3 colonnes), Machine à côté de Suivi ; Turbine en lignes courtes ; composants en lignes de 30 px, ajout replié ; actions et mitigations : deux lignes ouvertes visibles, le reste derrière « Afficher tout ». Hauteur d'une fiche type : environ 2 320 → 2 060 px.
- Pas de nouvelle donnée, pas de nouvelle clé `localStorage`.
- Fichiers : components/ManagerFiche.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v278 — Répartition des machines, alertes KPI, checklist de debug modifiable

- Demandé : « des camemberts pour la répartition des machines ; utiliser le skill KPI pour l'onglet KPI » ; « pouvoir ajouter ou enlever des éléments de la liste de debug ».
- KPI › Synthèse : méthode de calcul au survol de chaque chiffre, bloc « À surveiller », répartition des machines (état, gamme, pays, chef de projet) avec le choix En cours / Expédiées / Toutes.
- Checklist de debug : « Modifier la liste » — pour cette machine (testeur) ou pour toutes (administrateurs, modèle commun) ; l'export PDF suit la liste modifiée.
- Données : `planning/tests.debugModel`, `plans[PJ].debug.hide` / `extra` — document déjà couvert par les règles.
- Pas de nouvelle clé `localStorage`.
- Fichiers : debugChecklist.js (+ test), debugPdf.js, components/DebugChecklist.js, components/TestsTab.js, components/RowDetail.js, components/KpiPilotage.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v279 — Objectifs chiffrés sur tous les KPI

- Demandé : « objectifs chiffrés, et passer tous les sous-onglets KPI au skill KPI ».
- KPI : en-tête commun sur chaque sous-onglet (question, période, méthode, objectifs : valeur, objectif, écart) ; « Objectifs » pour les régler (propriétaire, `planning/profiles.kpiTargets`).
- Pas de nouvelle clé `localStorage`. Règles Firestore inchangées.
- Fichiers : kpiTargets.js (+ test), components/KpiHead.js (nouveaux), components/ManagerPanel.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v280 — Page Checklists, période des objectifs, vue CODIR corrigée

- Demandé : « une page pour importer une checklist, ajouter ou modifier des lignes ; impossible sur les PJ » ; « choisir les données des objectifs par mois ou sur plusieurs mois » ; « vue CODIR : le mois passé ne devrait pas donner 6/22 arrivées tenues ».
- Tests › Checklists (administrateurs) : import Word (format du modèle) ou Excel collé, édition des sections et contrôles, « Enregistrer », « Modèle d'origine ». Les fiches de tests des PJ n'ont plus « Modifier la liste ».
- KPI : sélecteur de période sur les objectifs.
- Vue CODIR : « Mois passés » prenait tous les mois jusqu'au mois dernier (d'où 22 arrivées) ; remplacé par « Mois dernier », « Mois en cours », « 3 derniers mois », « Année », « Tout ».
- Données : `planning/tests.debugModel.sections` (document déjà couvert par les règles).
- Pas de nouvelle clé `localStorage`.
- Fichiers : checklistImport.js, components/ChecklistsView.js (nouveaux), debugChecklist.js (+ test), components/DebugChecklist.js, components/TestsTab.js, components/RowDetail.js, kpiTargets.js (+ test), components/KpiHead.js, components/ManagerPanel.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v281 — Refonte des KPI (réponse, preuve, action)

- Demandé : « Oui, code-la » (maquette « Refonte KPI »).
- KPI : sur chaque sous-onglet, la réponse en une phrase calculée sur le planning publié, les chiffres face aux objectifs, un graphique adapté à la question (avec « Voir en tableau »), puis « À faire ». L'ancien contenu reste dessous (« Détail »), sauf la Synthèse dont l'ancien tableau de pilotage est remplacé.
- Explorer : mesure × découpage × machines en barres triées.
- Pas de nouvelle donnée, pas de nouvelle clé `localStorage`.
- Fichiers : kpiStory.js (+ test), components/KpiStory.js (nouveaux), components/ManagerPanel.js, components/KpiHead.js, theme.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v282 — Audit apple-design, lot 1 (sans changement visible)

- Demandé : « Lots 1 et 2 » (lot 2 = maquette à valider d'abord).
- Zones de clic d'au moins 28 × 28 px pour tous les petits boutons (dessin inchangé) ; cases à cocher ≥ 16 px.
- Textes 11 / 11,5 / 10,5 px → 12 px et 12,5 → 13 px sur tout le site ; initiales des avatars ≥ 9 px.
- Une seule capacité atelier (planificateur, 175 h sans plan) pour l'accueil et les KPI ; l'accueil compte les jours sans production.
- Plus d'animation de largeur (Besoins turbines, barres de progression) ; tableau des Modifications sans double cadre.
- Pas de nouvelle donnée ni de clé `localStorage`.
- Fichiers : a11yFallback.js, styles.css, pjMeta.js, components/KpiPilotage.js, RoleHome.js, HomeView.js, ManagerPanel.js, TurbinesHub.js, ChangesTable.js, ChangesView.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v283 — Audit apple-design, lot 2 (mise en page)

- Demandé : « Go, les cinq » (maquette du lot 2).
- Liste : vue d'ensemble en une ligne, « Répartitions » déplie les 4 graphiques (repliée par défaut).
- Planificateur : une ligne d'état + une ligne d'outils (menus Affichage, Outils, ＋ Ajouter) ; charge atelier repliée en une ligne.
- Retards : causes sans retard en bande étroite.
- Personnes et site : onglet « Accès » séparé, une ligne par personne, filtres par rôle.
- Gantt : légende en haut, lignes de 44 px, n° de série au survol.
- Clé `localStorage` : `enogia-dashboard-collapsed2` (remplace `enogia-dashboard-collapsed`) ; réglage du planificateur `ui.loadFold`.
- Fichiers : components/DashboardSummary.js, planner/Planner.js, planner/PlannerLoad.js, components/ManagerParts.js, components/PeopleRoles.js, components/ManagerPanel.js, components/GanttView.js, pjMeta.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v284 — Audit apple-design, lot 3

- Demandé : « Oui, le lot 3 ».
- Cash in : bouton « Haut de page » flottant, cases à cocher 16 px (format artefact gardé ; `CASHIN_PAGE_VERSION` 284).
- Accueil : chiffres clés en poids 500 ; cadran Tests en une ligne de chiffres.
- Pas de nouvelle donnée ni de clé `localStorage`.
- Fichiers : public/cashin.html, cashinData.js, components/HomeView.js, components/RoleHome.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v285 — Audit croisé, lots A et B

- Demandé : « Oui, A et B » (audit multi-skills).
- Police héritée par les boutons et champs ; contrastes corrigés (liens de l'accueil, initiales des avatars, « i » de la Liste) ; titres h2 et en-tête de page ; texte complet au survol des textes coupés ; Liste au téléphone sans chevauchement.
- Cloche : rouge = demandes qui vous attendent ; projets modifiés en gris.
- Mode Clair / Sombre / Auto (comme l'ordinateur, par défaut).
- « Expédiées depuis mai » ; chiffres affichés directement ; « touchez » sur écran tactile.
- Clé `localStorage` : `enogia_darkPref` (light / dark / system), `enogia_darkMode` encore écrit.
- Fichiers : styles.css, a11yFallback.js, pjMeta.js, App.js, components/HomeView.js, TableView.js, DashboardSummary.js, TestsTab.js, MentionBell.js, ThemePicker.js, SharedUI.js, KpiPilotage.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v286 — Système de design (lot D de l'audit croisé)

- Demandé : « B, B, B, bulle maison » (maquette v286-systeme).
- Rayons 4 / 8 / 12 + pilule partout (313 valeurs ramenées) ; bouton commun `btn()` / `Btn`, action principale en encre ; étiquettes en Satoshi (IBM Plex Sans retirée).
- Bulle maison (`src/tips.js`) à la place des bulles du navigateur : souris, clavier, doigt.
- Planificateur : barre d'outils sur deux lignes quand l'écran est étroit.
- Pas de nouvelle donnée ni de clé `localStorage`. Kits de Jérémie et du responsable achats à renvoyer (rayons changés dans leurs pages).
- Fichiers : theme.js, tips.js (nouveau), index.js, styles.css, components/SharedUI.js, ManagerFiche.js, ReleaseNotes.js, SavedViews.js, planner/Planner.js, public/index.html, + rayons dans la plupart des composants, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v287 — Fenêtres du Planificateur au clavier

- Demandé : « Fait les corrections + continue l'audit » (audit par skill).
- Planificateur : les 7 fenêtres (Publier, Modèles par gamme, Historique, Plan vierge, Nouveau PJ, Nouvelle tâche, Niveler) sont modales et nommées, prennent le focus, se ferment avec Échap.
- Rapport : maquettes-design/audit-par-skill.html (publié).
- À faire par Gabriel : retirer les pénalités ajoutées par erreur sur PJ473 (Fiches projet › PJ473 › Pénalités de retard › Retirer).
- Pas de nouvelle donnée ni de clé `localStorage`.
- Fichiers : planner/Planner.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v288 — Actions plus sûres (lot E)

- Demandé : « Oui, le lot E ».
- Fenêtre de confirmation du site (`src/confirm.js`) à la place de 18 confirmations et d'une saisie du navigateur ; restent les 3 de Production turbines (kit de Jérémie).
- Pénalités : brouillon avant enregistrement. Fiche projet : « Annuler » 5 s après chaque enregistrement.
- Pas de nouvelle donnée ni de clé `localStorage`.
- Fichiers : confirm.js (nouveau), components/AppChrome.js, ChecklistsView.js, CompCatalog.js, EtatsDialog.js, FicheContrat.js, ImportHistory.js, ManagerFiche.js, PeopleRoles.js, PointHebdo.js, TurbinesHub.js, SharedUI.js, planner/Planner.js, PlannerGantt.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v289 — Démarrage plus rapide (lot G)

- Demandé : « Lot G (rapidité) ».
- Paquet JavaScript de départ : 759 → 399 Ko compressé (−47 %). Les grandes pages sont chargées à leur première ouverture ; la bibliothèque de graphiques n'est plus chargée au démarrage.
- Écoutes du défilement passives ; Tests : barres de la grille sans animation d'entrée.
- Non fait : sortir les états d'App.js (69) — gain faible, risque élevé.
- Après déploiement : le premier clic sur une grande page la télécharge (≈ 10 à 115 Ko), ensuite elle est en cache.
- Pas de nouvelle donnée ni de clé `localStorage`.
- Fichiers : App.js, loadWeeks.js (nouveau), components/EtatControls.js (nouveau), components/MiniPie.js (nouveau), KpiPilotage.js, ManagerParts.js, RoleHome.js, TableView.js, DashboardSummary.js, TestsTab.js, RowMenu.js, SharedUI.js, tips.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v290 — Rapport CODIR plus clair (lot F)

- Demandé : « Go » (maquette du lot F).
- Rapport CODIR : réponse en une phrase, « À décider aujourd'hui » (reformulable avant l'export), 4 chiffres, tableau ; page PJ en trois colonnes ; 5 tailles de texte, casse normale, couleurs de texte lisibles. Gabarit ENOGIA inchangé.
- KPI › Dérives (886 px replié au lieu de 5 659) et Bilan mensuel : détail derrière un bouton.
- Point hebdo, Machines ORC, Couloirs : couleurs de texte et casse corrigées.
- Pas de nouvelle donnée ni de clé `localStorage`.
- Fichiers : components/CodirReport.js, ManagerPanel.js, PointHebdo.js, Series.js, planner/PlannerLanes.js, styles.css, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v291 — Cohérence finale (lot H)

- Demandé : « Oui, le lot H ».
- Boutons : style commun dans Fiches projet, Tests et Retards (une seule action principale pleine).
- Texte : jetons `FZF` à l'échelle 12 · 13 · 14 · 16 ; tailles en dur alignées dans ces pages.
- Graphiques : déjà conformes (valeurs écrites, une couleur par graphique dans les récits) — pas de changement.
- Pas de nouvelle donnée ni de clé `localStorage`.
- Fichiers : theme.js, components/ManagerFiche.js, FicheContrat.js, TestsTab.js, ManagerParts.js, TableView.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v292 — Jours sans production, lien calendrier / planificateur, tâches ajoutées

- Demandé : bouton commun sur les pages restantes ; jour sans production = charge répartie sans changer la date de fin ; avertissement sur le lien Planificateur / Calendrier / Gantt ; noms et couleurs des tâches ajoutées ; comptage des chiffres de la Liste ; retrait de « départ passé pas encore Expédiée » sur la Liste.
- Planificateur : un jour sans production garde la fin de la production et répartit les heures sur les autres jours ; bandeau « modifications pas encore publiées ».
- Calendrier : note dans le menu « Production du … ».
- Couleurs d'étape du planificateur = celles du Gantt ; tâches ajoutées à la couleur de leur phase, nom lisible.
- Pas de nouvelle donnée ni de clé `localStorage`.
- Fichiers : planner/engine.js (+test), planner/Planner.js, PlannerGantt.js, PlannerLoad.js, PlannerLanes.js, components/CalendarView.js, DashboardSummary.js, SharedUI.js, TableView.js, CommentsView.js, CommentsKanban.js, TurbinesHub.js, ChangesView.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v293 — Achats / Appro (retour du kit) et début de production

- Demandé : intégrer la mise à jour du kit achats ; « la production peut avoir sa date de début qui change ».
- Achats / Appro : page du responsable achats (fiches machine, nomenclatures, articles, fournisseurs, PO, configuration, connexion Odoo sans clé API).
- Nouvelles collections dans le même document `planning/achats` : `projets`, `po`, `odooSync` ; `params.odoo`, `params.odooDemande`, `params.scopes`. Règles Firestore inchangées.
- Synchronisation Odoo : la page n'appelle jamais Odoo ; une fonction serveur (à écrire) lit `params.odoo` et la clé API dans un coffre de secrets, écrit `po` et `odooSync`.
- Planificateur : jours sans production en tête de la production → début reculé, fin inchangée.
- Fichiers : components/Achats.js, achats.test.js, planner/engine.js (+test), components/CalendarView.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v294 — Synchronisation Odoo des PO (Cloud Function)

- Demandé : « faire la synchronisation avec Odoo sur la page achats / appros » (choix : Cloud Function Firebase).
- Nouveau dossier `functions/` (fonctions `odooSyncDemandeProd`, `odooSyncDemandeBeta`, `odooSyncNuit`), `firebase.json`, `.firebaserc` ; mode d'emploi `functions/LISEZMOI.md`.
- À faire par Gabriel : compte technique + clé API Odoo, forfait Blaze, `firebase functions:secrets:set ODOO_API_KEY`, `firebase deploy --only functions`, puis Réglages › Connexion Odoo dans la page (bêta d'abord).
- Le site lui-même ne change pas (page Achats déjà prête depuis la V293) ; pas de nouvelle règle Firestore (la fonction écrit avec les droits du serveur).
- Fichiers : functions/index.js, odoo.js, convert.js, test/*.js, package.json, LISEZMOI.md ; firebase.json, .firebaserc, .gitignore, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v295 — Synchronisation Odoo débloquée

- Constat : demande faite le 09/11 avant le déploiement des fonctions → jamais traitée, bouton « Synchroniser maintenant » désactivé pour toujours.
- Correctif : une demande sans réponse depuis plus de 5 min ne bloque plus le bouton ; message « restée sans réponse du serveur ».
- Pas de nouvelle donnée ni de clé `localStorage`. Kit achats régénéré (`npm run kit:achats`).
- Fichiers : components/Achats.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v296 — Compte rendu de la synchronisation Odoo

- Constat : « 0 ligne(s) » sans explication.
- Compte rendu : commandes et lignes lues, lignes de commandes annulées, sans n° de projet, écartées faute de fiche machine (exemples de valeurs Odoo).
- À déployer : `firebase deploy --only functions` (serveur) et le site (affichage du message).
- Fichiers : functions/convert.js, functions/index.js, functions/test/convert.test.js, components/Achats.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v297 — Réglages des achats ouverts au responsable achats

- Demandé : « que Alexis ait accès à la page Réglages dans l'onglet Achats / Appro ».
- Réglages visibles par toute personne de la liste d'accès ; la liste d'accès elle-même reste au propriétaire.
- Règles Firestore inchangées (la liste d'accès pouvait déjà écrire le document). Kit achats régénéré.
- Fichiers : components/Achats.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v298 — Kits Achats et Production turbines réparés

- Demandé : « le nouveau kit pour Alexis afin qu'il l'utilise sur son Claude ».
- Défaut trouvé en le testant : depuis la V286, les kits ne s'ouvraient plus (`btn` déclaré deux fois). Corrigé pour les deux kits (`themeFor`).
- Kit Achats : données d'exemple au format actuel, synchronisation Odoo simulée dans l'aperçu ; consignes mises à jour (Odoo, collections, rayons, Réglages).
- Rien ne change dans le site. Kits régénérés : `kit-achats/` et `kit-jeremie/` (à renvoyer).
- Fichiers : scripts/prodturb-kit.js, achats-kit.js, achats-import.js, achats-consignes.md, achats-marche-a-suivre.md, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v299 — Besoins turbines : onglets ORC / SAV, cartes et frise (piste B)

- Demandé : autre présentation des Besoins ORC et SAV ; roues et injecteurs plus visibles que le S/N ; différencier turbine allouée / installée ; date estimée de mise à disposition face au besoin. Maquette V299, piste B validée.
- Onglets Besoins ORC / Besoins SAV, cartes par besoin, roue et injecteur en grand, Allouée (bleu) / Installée (vert, date, bouton « Marquer installée »), disponibilité et écart sur une frise.
- Nouvelle donnée : `planning/prodTurbines.turbines[id].installee` (date ISO), écrite seulement par le bouton (même document, règles inchangées). Nouvelle clé `localStorage` : `enogia_nd_kind` (onglet ORC / SAV).
- Fichiers : turbineNeeds.js (+test), components/TurbinesHub.js, needsView.test.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v300 — Besoins turbines compacts (maquette V300)

- Demandé : ORC et SAV dans la même feuille ; autre passage Production → Besoins ; cadrans trop grands ; l'attribution cassait la mise en page ; pas d'indication visuelle de l'attribution ; roues et injecteurs en premier dans le stock ; pouvoir allouer une turbine sans roue (déjà possible, gardé et rendu visible).
- Bascule Production / Besoins en deux grands boutons chiffrés ; une feuille ORC + SAV filtrable ; cartes compactes, logements de hauteur fixe à 4 états ; stock réordonné.
- Clé `localStorage` `enogia_nd_kind` : valeurs all / pj / sav (défaut all). Pas de nouvelle donnée.
- Fichiers : components/TurbinesHub.js, needsView.test.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v301 — Besoins turbines lisibles (retours V300)

- Demandé : nom complet de l'injecteur ; valider (installer) une turbine allouée ; voir l'ordre de besoin des PJ ; injecteur aussi clair que roue et turbine ; turbine déjà montée avec roue = stock de roues inchangé, stock plus clair ; roue et injecteur avant les turbines prêtes ; cadrans ORC / SAV en couleur légère.
- Rang de besoin sur chaque carte, fonds ORC / SAV, logements sur 3 lignes avec noms complets, « Marquer installée » dès l'allocation (confirmation s'il manque une pièce), stock d'injecteurs par référence, turbines prêtes titrées par leur roue.
- Pas de nouvelle donnée ni de clé `localStorage`.
- Fichiers : components/TurbinesHub.js, turbineNeeds.js (+test), needsView.test.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v302 — Besoins turbines : priorité modifiable, regroupement par mois

- Demandé : turbine installée = roue et injecteur non modifiables ; fonds plus légers (ORC bleu, SAV violet) ; changer l'ordre de priorité et regrouper par mois ; frise peu claire ; retirer « 2 × 100 kW (gamme) » des tuiles ; bien séparer les types de stock.
- Nouvelle donnée : `planning/prodTurbines.ordre.besoins = { keys, at }` (ordre choisi), même document, règles inchangées. Pas de nouvelle clé `localStorage`.
- Fichiers : turbineNeeds.js (+test), components/TurbinesHub.js, needsView.test.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v303 — Besoins turbines : titres de mois collants en verre dépoli

- Maquette `maquettes-design/v303-effets-skills.html` (effets des autres skills) ; choix : apple-design sans cacher le stock.
- Barre d'outils et titres de mois en verre dépoli, collés en haut ; appui 0,97 sur les logements à remplir. Pas de nouvelle donnée, pas de nouvelle clé `localStorage`.
- Fichiers : components/TurbinesHub.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v304 — Menu par métier

- Maquette `maquettes-design/v304-menu-acces.html` (onglet « Le menu » validé).
- Menu en trois rubriques (Travailler, Suivre, Régler) ; Planning réunit Liste, Gantt, Calendrier, Planificateur et Modifications (onglets en tête de page) ; l'Espace Manager n'est plus une entrée : Projets, Pilotage, Calendrier de production, Personnes et site ouvrent ses pages. Droits inchangés. Pas de nouvelle donnée, pas de nouvelle clé `localStorage`.
- Fichiers : App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v305 — Accès par rôle et par page

- Maquette `maquettes-design/v304-menu-acces.html` (onglet « Les accès » validé).
- Page Régler › Accès (propriétaire seul) : rôle de chaque personne (planning/profiles, le même que l'accueil), niveau par page et par rôle (Masqué, Lecture, Modifier, Admin), aperçu du menu.
- Nouveau document `planning/access` (`beta_access` en bêta) : `{ on, roles, levels, at, by }`. Rien ne change tant que « Activer les nouveaux accès » n'a pas été cliqué.
- **Règles Firestore à republier avant d'activer** (firestore.rules, voir SECURITE.md) : sinon les personnes qui reçoivent un accès Modifier sur Turbines, Achats ou Finance ne pourront pas enregistrer, et les anciens admins garderont leurs droits côté base.
- Après activation : la liste « Accès Manager » (managerEmails) et les listes « Accès » des Turbines et des Achats ne comptent plus.
- Fichiers : access.js (+test), components/AccessPage.js, App.js, components/ManagerPanel.js, profiles.js, appDocs.js, useAppData.js, firestore.rules, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v306 — Menu masqué, sélecteur de vues, sombre graphite

- Maquette `maquettes-design/v306-navigation.html` (choix A + 1 + 2).
- Menu caché au bord gauche (zone de 8 px, ☰, Ctrl + B), épinglable ; sous-pages dépliées sous l'entrée active et au survol.
- Planning : sélecteur segmenté Liste · Gantt · Calendrier (touches 1, 2, 3) + boutons Planificateur et Modifications.
- Mode sombre en gris neutres (graphite).
- Nouvelle clé `localStorage` : `enogia_nav_pin2` (menu épinglé). Pas de nouvelle donnée.
- Fichiers : App.js, components/PlanSwitch.js, theme.js, styles.css, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v307 — Le même sélecteur de vues partout

- Sélecteur segmenté (PlanSwitch) dans Tests, Turbines, Projets (Fiches projet · Point hebdo · Machines ORC), KPI, Retards, Calendrier de production, Personnes et site ; vues de Tests et de Turbines dans le menu. Titre « Espace Manager » et bouton mallette retirés. Achats / Appro inchangé (page du kit).
- Pas de nouvelle donnée ni de nouvelle clé `localStorage`.
- Fichiers : App.js, components/PlanSwitch.js, ManagerPanel.js, TestsTab.js, TurbinesHub.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v308 — Accès : Rôles, puis Accès par page

- Page Régler › Accès en deux sous-pages : Rôles (création, renommage, membres) et Accès par page (un rôle à la fois, niveau par page et par sous-page).
- `planning/access.levels` contient aussi les sous-pages (« planning.gantt », « tests.catalog »…) ; le niveau d'une page reste le plus haut de ses sous-pages (règles Firestore inchangées depuis la V305 : toujours à republier avant d'activer).
- Fichiers : access.js (+test), components/AccessPage.js, App.js, ManagerPanel.js, TestsTab.js, TurbinesHub.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v309 — La fiche d'un PJ montre sa turbine et ses achats

- Fiche d'un PJ (Liste, Gantt, Calendrier, accueil) : onglets et tuiles Turbine (Turbines › Besoins) et Achats (Achats / Appro), en lecture, pour les personnes qui ont accès à ces pages ; bouton pour ouvrir la page d'origine.
- Pas de nouvelle donnée ni de nouvelle clé `localStorage`.
- Fichiers : pjDossier.js (+test), components/RowDetail.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v310 — Calendrier en vue Mois, fiche d'un PJ → Tests

- Calendrier : bouton « Mois » (à côté de Semaine / Jour) — jalons, production et tests jour par jour, « + N autres », clic = fiche du PJ. Clé `enogia_calMode` peut valoir `month`.
- Fiche d'un PJ : tuile Tests et bouton « Ouvrir dans Tests » → Tests › Par semaine, fiche de tests du PJ ouverte (selon les accès).
- Brique commune `OpenIn` (SharedUI.js) pour les liens « Ouvrir dans … ».
- Pas de nouvelle donnée Firestore.
- Fichiers : components/CalendarMonth.js (nouveau), CalendarView.js, RowDetail.js, SharedUI.js, TestsTab.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v311 — Briques communes (revue, point 4, lot 1)

- SharedUI.js : `hoverVars`, `Pill`, `PILL_TONES`, `Chip`, `chipStyle`, `Panel` ; styles.css : classes `e-hov`, `e-hov-ink`, `e-lift`, `e-chip`.
- Survols JavaScript remplacés par du CSS : App (menu), TableView, GanttView, CalendarView, CommentsView, Feux, ManagerParts, ManagerFiche, bouton d'import.
- Pastilles / puces locales branchées sur les briques : RowDetail, HomeView, ManagerFiche, Series, MultiApply, PeopleRoles.
- Pas de nouvelle donnée ni de nouvelle clé `localStorage`.

## v312 — Calendrier en barres continues, début de production, départ modifiable

- Calendrier (Jour / Semaine) : une barre par machine (réception, production, tests, packaging), visites en étiquettes, bouton « Planning initial » (clé `localStorage` `enogia_cal_ini`).
- Début de production : champ `debutProd` des lignes de `planning/current`, rempli **à la prochaine publication** du planificateur ; colonne « Début prod » de la Liste, fiche d'un PJ, Gantt, Calendrier.
- Départ modifiable par les admins (Liste, fiche d'un PJ) : écrit dans `planning/current` (+ `pendingDeparts`) et le journal des modifications ; repris dans le plan à l'ouverture du planificateur ou à la publication. Règles Firestore inchangées.
- Fichiers : planner/engine.js (+test), planner/store.js, planner/Planner.js, components/CalendarView.js, TableView.js, RowDetail.js, GanttView.js, App.js, styles.css, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v313 — Tableaux et filtres communs (revue, point 4, lot 2)

- SharedUI.js : `tableTh`, `tableTd`, `SortTh`, `useSort`, `Segmented`, `ChipGroup`.
- Tableaux branchés : CashInPlanned, KpiPilotage, KpiStory, ManagerFiche, InitialAdd, ImportHistory, ChangesTable, PlannerChanges, TestsTab.
- Filtres branchés : ManagerPanel, KpiPilotage, PointHebdo, KpiHead.
- Pas de nouvelle donnée ni de nouvelle clé `localStorage`.

## v314 — Tablette et écran tactile (revue, point 5) ; noms des rubriques du menu

- Densité « Auto » (nouvelle clé `localStorage` `enogia_density3`) : confortable au doigt, compacte à la souris.
- `@media (pointer: coarse)` (styles.css) : cibles ≥ 44 px, champs 16 px ; a11yFallback : zones de clic 44 px au doigt.
- Menu : sous-pages au premier toucher ; HoverPop : ouverture au toucher. Bandeau « Ctrl et − » retiré.
- Menu : Opérations, Gestion, Administration. Liste : « Début prod » entre Arrivée et Tests.
- Fichiers : App.js, ThemePicker.js, SharedUI.js, a11yFallback.js, styles.css, access.js, AccessPage.js, TableView.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v315 — Page « À traiter » (revue, point 6) et S/N automatiques

- Page « À traiter » (`view` inbox) : demandes à valider (S/N à attribuer, départs à reprendre, PO en retard, besoins turbine en retard), mentions, affectations, informations ; la cloche y mène.
- S/N : `serialNumbers.js` (+test) — prévus d'après l'ordo (`AAAA-NNN-CCC`), affichés en italique, fixés par « Attribuer les S/N » (écrit `numSerie` dans `planning/pjMetaOverrides`, après confirmation).
- Pas de nouvelle clé `localStorage` ; règles Firestore inchangées.
- Fichiers : serialNumbers.js (+test), components/InboxPage.js (nouveau), MentionBell.js, Series.js, RowDetail.js, TableView.js, pjMeta.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v316 — Commentaires dans Opérations

- Menu : Commentaires passe de Gestion à Opérations (App.js `NAV_TREE`, access.js).

## v317 — Commentaires simplifiés et réactions

- Page Commentaires réécrite : liste des machines + fil ; filtres À répondre / Mes PJ / Tous (Tous : admins, propriétaire, rôle direction) ; un CdP voit ses PJ et les fils où il est cité.
- Réactions emoji sur un commentaire : champ `reactions` des commentaires (`planning/comments`, déjà écrit par tous les comptes : règles inchangées).
- « Envoyer à… » remplace la sélection multiple ; Kanban retiré (CommentsKanban.js supprimé).
- Nouvelles clés `localStorage` : `enogia_cmt_filter`, `enogia_cmt_seen_<adresse>` (anciennes `enogia_commentsMode` plus lue).
- Fichiers : components/CommentsView.js, components/Reactions.js (nouveau), commentThreads.js (+test), mentions.js, components/ProjectModal.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v318 — Production turbines : retour de Jérémie

- Kit renvoyé par Jérémie (parti de la V271) fusionné avec la page du site (rayons V286 gardés).
- Nouveaux champs dans `planning/prodTurbines` : `params.equipe` (personnes, heures / semaine), `turbines[id].rangBanc` ; collections inchangées, règles inchangées.
- Export / import JSON dans la page (« Tout remplacer » réservé au propriétaire).
- Clé `localStorage` : `enogia_prodturb_order` (ordre des cadrans de la page).
- Fichiers : components/ProdTurbines.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md. Kit régénéré (`npm run kit:jeremie`).

## v319 — Réactions à la place de Vu / Traité, version anglaise (lot 1)

- Commentaires : boutons « Vu » / « Traité » retirés (cloche, À traiter, fiches) ; une réaction de la personne citée ferme la demande (anciens vu / traité toujours lus).
- Anglais : `src/i18n.js` + dictionnaire `src/i18n/en.js` (traduction de l'affichage à la volée), drapeaux FR / EN dans la barre du haut.
- Nouvelle clé `localStorage` : `enogia_lang` (fr / en).
- Fichiers : i18n.js, i18n/en.js (nouveaux), index.js, mentions.js(+test), components/CommentMarks.js, MentionBell.js, InboxPage.js, ManagerFiche.js, ProjectModal.js, CommentsView.js, AppChrome.js, App.js, releaseNotes.js, releaseCatalog.js(+test), CLAUDE.md, DEPLOIEMENT.md.

## v320 — Stock et priorités des besoins turbines, S/N « Oui », Personnes et accès

- Besoins turbines : stock réordonné et repliable, priorité globale échangeable entre mois (`planning/prodTurbines.ordre.besoins.keys`, même champ).
- S/N : bouton « ✓ Oui » (Machines ORC, À traiter) → `numSerie` dans `planning/pjMetaOverrides`.
- Menu Administration : « Personnes et accès » (Personnes, Rôles, Accès par page) et « Réglages du site » (Nouveautés, version).
- Clés `localStorage` : `enogia_nd_fold`, `enogia_fiche_shipped`, `enogia_cdp_shipped`. Règles Firestore inchangées.
- Fichiers : turbineNeeds.js(+test), components/TurbinesHub.js, CommentMarks.js, Series.js, InboxPage.js, ManagerFiche.js, CdpReport.js, ManagerPanel.js, AccessPage.js, App.js, versions.

## v321 — Galerie ?demo et vérification automatique des pages (revue, point 7)

- `src/demo/` : données fictives, liste des pages, galerie (http://localhost:3000/?demo, développement seulement), test `pages.test.js` (10 pages × clair / sombre).
- Script `npm run check:pages`. Rien ne change dans le site publié (la galerie n'est pas dans le build).
- Fichiers : src/demo/* (nouveaux), index.js, package.json, App.js, versions, CLAUDE.md.

## v322 — Anglais, lots 2 et 3

- Dictionnaires `src/i18n/en-planning.js` et `src/i18n/en-pages.js` (+ test `src/i18n/i18n.test.js`).
- Restent à traduire : Manager (fiches projet, KPI, Retards, Point hebdo, rapports), Planificateur, Achats, Production turbines, Cash in.
- Aucune clé `localStorage` nouvelle ; règles Firestore inchangées.

## v323 — Jalons cash « Produit » sur l'accueil du responsable produit

- Cash in (public/cashin.html, version 323) : case « Produit » par jalon.
- Nouveau document `planning/cashinProduit` (copie des jalons cochés : PJ, nom, jalon, montant, factures initiale / prévue / émise), écrit par la page Cash in à chaque enregistrement.
- **Règles Firestore à republier** : `allow write` sur `cashinProduit` pour les admins et la Finance (Modifier) ; lecture ouverte aux comptes ENOGIA.
- Accueil du rôle « Responsable des testeurs » : cadran « Livrables Produit » (ajoutable aussi aux autres postes par « Ajouter un cadran »).
- Fichiers : public/cashin.html, cashinData.js(+test), components/CashInTab.js, useAppData.js, App.js, HomeView.js, RoleHome.js, demo/demoPages.js, firestore.rules, versions.

## v324 — Cloche en pop-up, anglais retiré, paquet de départ allégé (audit Vercel)

- Cloche : pop-up « À traiter » ; page et entrée de menu « À traiter » retirées ; plus d'étiquette « N à traiter ».
- Anglais et choix de langue retirés (clé `enogia_lang` plus lue).
- Paquet de départ 430 → 340 Ko compressés : Nouveautés et calculs turbines chargés à la demande (`releaseSeen.js`, `prodModel.js`, `prodDocCtx.js`).
- Règles Firestore inchangées par cette version (celles de la V323 restent à republier).
- Fichiers : App.js, index.js, components/MentionBell.js, InboxPage.js, AppChrome.js, ReleaseNotes.js, RoleHome.js, RowDetail.js, pjDossier.js(+test), turbineNeeds.js, releaseSeen.js, prodModel.js, prodDocCtx.js (nouveaux), demo/demoPages.js ; supprimés : i18n.js, i18n/*.

## v325 — Gestion des accès, Réglages

- Menu et Manager : « Gestion des accès » (Personnes, Rôles, Accès par page), « Réglages » (Nouveautés, version).
- Page Accès : même en-tête que le Manager (titre en haut à gauche, sélecteur dessous).
- Fichiers : App.js, components/AccessPage.js, components/ManagerPanel.js, versions. Rien à republier.

## v326 — SAV / MES

- Page SAV / MES (Opérations) : Tickets, Interventions, Planning des équipes, Parc ; onglet SAV dans la fiche d'un PJ ; demandes des chefs de projet (vue d'une ligne) acceptées ou refusées par le SAV.
- Nouveaux documents : `planning/sav` (tickets, inters, parc, techs) et `planning/savDemandes` (items) — préfixe `beta_` en bêta.
- **Règles Firestore à republier** : écriture `sav` (propriétaire, rôle SAV / niveau Modifier sur SAV), `savDemandes` (tout compte ENOGIA).
- Page Accès : nouvelle page « SAV / MES » (sous-pages Tickets, Interventions, Planning des équipes, Parc).
- Aucune nouvelle clé `localStorage`.
- Fichiers : savModel.js(+test), components/SavPage.js (nouveaux), appDocs.js, useAppData.js, access.js, App.js, RowDetail.js, SharedUI.js (icône), styles.css, demo/*, firestore.rules, versions.

## v327 — SAV : planning à la semaine / au mois, glisser-déposer, fiches plus courtes

- Planning des équipes : Semaine / Mois, glisser une barre (dates, technicien).
- Ticket et intervention : formulaires courts, détails en sections repliées après création.
- Clé `localStorage` : `enogia_sav_plan` (week / month). Règles inchangées depuis la V326 (à republier si ce n'est pas fait).
- Fichiers : components/SavPage.js, demo/demoPages.js, versions.

## v328 — SAV : deux plannings, en-tête commun, étapes du ticket

- Planning : en-tête mois · semaine · jour ; deux plannings (Techniciens / Demandes d'intervention) ; échelle 2 semaines / Mois.
- En-tête de page commun (PageHead), boutons d'ajout à gauche ; étapes du ticket en liste cliquable.
- Clé `localStorage` `enogia_sav_plan` inchangée. Règles inchangées depuis la V326 (à republier si ce n'est pas fait).
- Fichiers : components/SavPage.js, demo/demoPages.js, versions.

## v329 — Achats / Appro : retour du kit d'Alexis

- Page Achats / Appro mise à jour par Alexis (Synthèse Appro, avance de livraison, choix filtré des lignes de PO, fournisseurs des PO, options à préciser).
- Mêmes données (`planning/achats`), règles inchangées. Kit achats régénéré (`kit-achats/`) à lui renvoyer.
- Fichiers : components/Achats.js, versions.

## v330 — SAV : demandes sur une ligne, carte du parc, reprise de l'historique

- Planning des demandes : ligne « Équipe SAV / MES », jours réservés, « + » pour demander, demandes rayées en attente.
- Parc : carte du monde (fond chargé depuis cdn.jsdelivr.net : topojson-client 3.1.0, world-atlas 2.0.2) ; latitude / longitude facultatives par projet.
- Reprise unique de l'historique : bouton « Reprendre l'historique (fichier SAV) » (propriétaire) — exporter le Google Sheet en .xlsx, le choisir, vérifier l'aperçu, confirmer. Écrit dans `planning/sav` (règles V326 à republier avant).
- Fichiers : savImport.js(+test) (nouveau), components/SavPage.js, useAppData.js, demo/demoPages.js, versions.

## v331 — retouche « unslop » : graisses, majuscules, cadran vide, points finaux, croix

- Graisses 700 / 800 / 900 → 600 dans le site (pages des kits, rapport CODIR et PV non touchés) ; Satoshi chargée en police variable (public/index.html, lien Fontshare séparé).
- Plus d'étiquettes en majuscules espacées ; pop-up Nouveautés sans dégradé.
- Accueil › Charge atelier : phrase quand aucune heure n'est prévue.
- Points finaux retirés des messages courts ; boutons Fermer en icône.
- Aucune clé localStorage, aucune donnée ni règle Firestore modifiée.
- Fichiers : public/index.html, styles.css, ~90 composants (graisses), RoleHome.js, ReleaseNotes.js, versions.

## v332 — SAV : tri des tableaux, commentaires d'étape, planning unique, carte par régions, fournitures, KPI

- Tableaux SAV triables ; commentaires sur chaque étape d'un ticket (`stepNotes`).
- Planning unique (défilement continu, ‹ ›, zoom, Aujourd'hui) ; vue chef de projet grisée, jours occupés rayés sans nom de PJ.
- Carte : régions, Ctrl + molette, glisser ; fiche du parc par ville et pays (recherche de la ville sur OpenStreetMap Nominatim à l'enregistrement : seuls la ville et le pays sont envoyés).
- Parc : fournitures ENOGIA par projet, types réglables (`planning/sav.fournTypes`), forfait annuel du contrat.
- Sous-page KPI (accès `sav.kpi`).
- Clés localStorage : `enogia_sav_zoom` (nouvelle), `enogia_sav_plan` (plus lue).
- Règles Firestore inchangées (même document `planning/sav`).
- Fichiers : components/SavPage.js, savModel.js(+test), savImport.js, access.js, App.js, demo/demoPages.js, versions.

## v333 — tablette (audit responsive-craft)

- Au doigt : barres d'outils à 44 px (classe `e-tb`), zones de toucher élargies, glisser au doigt (`touch-action: none` sur les éléments à glisser).
- Liste : état en pastille compacte sous 1 100 px. Turbines › Besoins : stock en tiroir bas sous 860 px. Bancs : colonnes secondaires masquées en portrait.
- SAV : fiche du ticket à côté de la liste jusqu'à 980 px. Menu : toucher à côté le referme. Fenêtres en `dvh`.
- Aucune clé localStorage, aucune donnée ni règle Firestore.
- Fichiers : styles.css, a11yFallback.js, pointerDrag.js, App.js, components/EtatControls.js, TableView.js, GanttView.js, CalendarView.js, TestsTab.js, TurbinesHub.js, SavPage.js, ~20 fenêtres (vh → dvh), versions.

## v334 — Turbines › Besoins : clore un besoin

- Bouton « Clore » sur chaque carte ; « Besoins clos (N) » pour rouvrir.
- Données : `planning/prodTurbines.clos[PJ]` (PJ), `besoins[id].done` (SAV) ; règles Firestore inchangées.
- Fichiers : turbineNeeds.js(+test), components/TurbinesHub.js, App.js, demo/demoData.js, versions.

## v335 — menu stable, SAV : PJ libre, week-ends, demandes en barre, planifiée / à planifier, carte

- Menu : sous-pages dépliées au clic sur le chevron (plus au survol), fermeture après 0,7 s.
- SAV : PJ saisi librement dans le ticket et l'intervention ; planning avec samedi et dimanche (pas de demande possible) ; demandes en barres continues ; « Dates validées avec le client » dans l'intervention (Planifiée / À planifier) ; une demande acceptée = intervention À planifier ; carte avec bulles par pays et liste des sites.
- Aucune clé localStorage nouvelle ; règles Firestore inchangées.
- Fichiers : App.js, components/SavPage.js, savModel.js(+test), styles.css, versions.

## v336 — carte routière du parc, demandes non barrées, tests sur 4 semaines (D11)

- Carte du parc : Leaflet 1.9.4 (cdn.jsdelivr.net) + tuiles OpenStreetMap (tile.openstreetmap.org), chargées à l'ouverture du Parc ; toujours claire.
- Planning SAV : nom du PJ des demandes non barré. Tests : planning sur 20 jours ouvrés.
- Maquette de la fiche de tests (D12 à D14, D10) : maquettes-design/v336-fiche-tests.html, en attente du go.
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : components/SavPage.js, components/TestsTab.js, versions.

## v337 — fiche de tests refaite, livret de configuration (D13), D10, D12, D14

- Fiche de tests : fil des 6 étapes (qui teste, présence, configuration ORC, checklist de debug + fréquences et vibrations, checklist de tests + demandes du client, signature au doigt).
- Livret de configuration : import du manuel Word dans Tests › Checklists › Livret de configuration (administrateurs) ; validation, statut, commentaire par étape ; filtres, synthèse des problèmes ; exports CSV / JSON / PDF ; reprise d'une session.
- **À faire par Gabriel avant l'import du manuel : republier firestore.rules** (documents `testbook` et `testbook_img_*`).
- D14 : régler les fréquences figées et les limites dans Tests › Checklists › Fréquences et vibrations.
- Données : `planning/testbook`, `planning/testbook_img_<clé>` (nouveaux) ; dans `planning/tests` : `vibModel`, `plans[PJ].book / tres / asks / debug.vib`.
- Aucune clé localStorage.
- Fichiers : components/TestsTab.js, components/TestFiche.js (nouveau), components/ChecklistsView.js, manualImport.js(+test) (nouveau), testFiche.js (nouveau), testPlan.js, checklistImport.js, useAppData.js, appDocs.js, App.js, firestore.rules, demo, versions.

## v338 — livret enregistrable, carte en français, fréquences dans la checklist de debug, bancs 1 / 2, planning des tests qui défile

- Livret : correction de l'enregistrement (« Nested arrays are not supported ») ; réimporter le manuel dans Tests › Checklists.
- Carte du parc : fond OpenStreetMap France (tile.openstreetmap.fr), ne passe plus sur le menu.
- Tests : planning des bancs regroupé par banc (lu dans planning/plan, publié dans rows[].banc à la prochaine publication) et défilant sur 100 jours ouvrés ; fréquences et vibrations dans la checklist de debug et son PDF.
- Pages lourdes préchargées après la connexion (plus de latence au premier clic).
- Aucune clé localStorage ; règles Firestore inchangées depuis la V337 (à republier si ce n'est pas fait).
- Fichiers : manualImport.js(+test), components/TestFiche.js, DebugChecklist.js, debugPdf.js, TestsTab.js, SavPage.js, planner/engine.js, App.js, demo, versions.

## v339 — écran atelier réparé, objectifs, D12 dans la fiche projet, Réglages

- Écran atelier : ne se ferme plus tout seul ; page « Objectifs de la semaine et du mois ».
- Fiche projet (zone Machine) : demandes spécifiques du client pour le FAT interne (`meta.fatAsks`), ajoutées à la checklist de tests.
- Réglages : fermetures de l'atelier (ex-Calendrier de production, entrée retirée) ; titres au format commun.
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : components/WorkshopScreen.js, ManagerFiche.js, ManagerPanel.js, AccessPage.js, TestFiche.js, TestsTab.js, testPlan.js, testFiche.js, access.js, App.js, demo, versions.

## v340 — audit Web Interface Guidelines (lots 1 à 4)

- Fiche projet : confirmation avant de supprimer une action, une mitigation, un composant ou un jalon.
- Clavier : éléments cliquables atteignables (filet a11yFallback), focus visible dans les menus, boutons de zoom nommés.
- Alerte du navigateur avant de quitter avec un brouillon (accès, checklists, pénalités).
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : a11yFallback.js(+test), unsavedGuard.js, styles.css, components/ManagerFiche.js, ManagerNav.js, FicheContrat.js, CalendarView.js, GanttView.js, AccessPage.js, ChecklistsView.js, versions.

## v341 — audit Web Interface Guidelines (lot 5)

- Fenêtres : défilement contenu (overscroll-behavior), plus de défilement de la page derrière.
- Toucher : touch-action manipulation, pas de flash gris ; au doigt, pas de clavier ouvert automatiquement (autoFocusOk.js, motion.js).
- Titres équilibrés (text-wrap: balance) ; points de suspension « … ».
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : autoFocusOk.js, motion.js, styles.css, 12 composants (autoFocus), ProjectModal.js, SharedUI.js, versions.

## v342 — audit Web Interface Guidelines (lot 6) : page dans l'adresse

- Adresse : ?p=<page>&s=<sous-page>&pj=<PJ> (urlState.js) ; Précédent / Suivant du navigateur ; liens partageables (l'accès reste vérifié par le rôle).
- Liste : pas de virtualisation (content-visibility sans effet sur les lignes de tableau ; ~100 PJ).
- Aucune nouvelle clé localStorage (enogia_view reste lue si l'adresse ne dit rien) ; règles Firestore inchangées.
- Fichiers : urlState.js(+test), App.js, versions.

## v343 — audit taste (lots 1 à 3)

- Calendrier : étiquettes Client / NOBO lisibles en sombre.
- Gras : <b> / <strong> à 600 (styles.css).
- Accueil : chiffres clés 36 px, retard sur l'initial 46 px ; vue d'ensemble de la Liste 36 px.
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : styles.css, components/CalendarView.js, HomeView.js, DashboardSummary.js, TurbinesHub.js, versions.

## v344 — audit taste (lots 4 et 5)

- Rayons 4 / 8 / 12 partout (hors kits et rapports) ; colonnes de graphiques à angles nets.
- Graisses : plus aucun 700+ hors kits et rapports ; planificateur sans majuscules ni texte < 11 px.
- Couleurs : jetons T.onFill / T.onInd (theme.js), planificateur et Nouveautés branchés sur le thème.
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : theme.js, styles.css, App.js, ~40 composants et planner/*, versions.

## v345 — choix sur l'audit taste

- Fenêtres sans flou (voile seul) ; barres collées de Besoins turbines et onglets de la fiche projet pleins.
- Avancement en barre dans les listes (Tests › Au banc maintenant, Besoins turbines).
- Gardés : liseré des cartes, lignes alternées des bancs, camemberts, « Bonsoir Prénom ».
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : styles.css, components/TurbinesHub.js, TestsTab.js, RowDetail.js, ManagerNav.js, ProjectModal.js, ReleaseNotes.js, versions.

## v346 — rapports, pages du Manager dans la galerie, sombre

- Rapports imprimés : graisses 600, PowerPoint sans lignes zébrées.
- Galerie ?demo : Manager (KPI, fiche projet, point hebdo) et Planificateur ; test des pages sans base réelle.
- Sombre : styles de module en accesseurs (KPI, accès, checklists, SAV…) ; fiche projet : pénalités et pourcentages lisibles, titres h2 / h3.
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : CodirReport.js, testReport.js, debugPdf.js, reports/cdpPptx.js, demo/demoPages.js, demo/pages.test.js, KpiStory.js, AccessPage.js, CashAnchors.js, CashLinks.js, ChecklistsView.js, CompCatalog.js, ManagerFiche.js, FicheContrat.js, ReleaseNotes.js, RowPops.js, SavedViews.js, SavPage.js, versions.

## v347 — fiche projet : vue « Cette semaine »

- Fiche projet en vues : Cette semaine (par défaut), Contrat et dates, Finance, Machine ; bloc « À compléter ».
- Enregistrement : témoin unique dans les onglets ; commentaire d'axe seulement en vigilance / à risque ; Entrée pour ajouter une action.
- Aucune clé localStorage ; règles Firestore inchangées ; données inchangées.
- Fichiers : components/ManagerFiche.js, styles.css, demo/demoPages.js, versions.

## v348 — audit accessibilité (WCAG 2.1 AA)

- Bord des champs à 3:1 (jeton fieldLine, variable --e-field-line).
- Échecs / retards hachurés, « ✓ terminé », nombre d'échecs écrit ; couverture du livret lisible en sombre.
- Titres sans saut (Panel level, KPI, Besoins turbines) ; libellés de champs à la source.
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : theme.js, App.js, styles.css, components/TestFiche.js, TestsTab.js, SharedUI.js, SavPage.js, InboxPage.js, KpiStory.js, TurbinesHub.js, ManagerFiche.js, EtatControls.js, versions.

## v349 — pastilles d'état de la Liste

- Bord des pastilles d'état en encre de l'état (≥ 3:1, WCAG 1.4.11).
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : components/EtatControls.js, versions.

## v350 — audit de performance (impeccable + Vercel React Best Practices)

- Paquet de départ 337 → 306 Ko compressés : icônes en une seule graisse (src/iconPaths.js, scripts/gen-icons.js), Gantt chargé à la demande (src/ganttPhases.js), moteur chargé à la publication.
- Composants internes remontés hors des composants (accueil, KPI, Turbines, écran atelier, fenêtre projet) ; polices réduites ; copie bêta en parallèle.
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : scripts/gen-icons.js, src/iconPaths.js, src/ganttPhases.js, components/SharedUI.js, GanttView.js, ProjectModal.js, HomeView.js, RoleHome.js, KpiPilotage.js, TurbinesHub.js, WorkshopScreen.js, AppChrome.js, planner/store.js, public/index.html, versions.

## v351 — direction design (UI UX Pro Max) : échelle, graisses, bouton principal, règles UX

- Une seule échelle de tailles (12 · 13 · 14 · 16 · 20 · 28 · 36 · 44) ; graisses 400 / 500 / 600 selon le rôle.
- Un bouton principal par écran ; focus sur le titre après un changement de page ; textes d'aide ≤ 75 caractères ; durées sur les jetons.
- DESIGN.md et .impeccable/design.json mis à jour (régénérés sans Impeccable).
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : theme.js, styles.css, App.js, ~70 composants et planner/*, DESIGN.md, versions.

## v352 — cadrans « Ligne d'atelier » et « Fiches suiveuses »

- Deux cadrans dans le catalogue de l'accueil, actifs sur aucun poste par défaut (« Disposer les cadrans » › « Ajouter un cadran »).
- Aucune clé localStorage ; données inchangées (dispositions dans planning/profiles.homeLayouts, comme avant) ; règles Firestore inchangées.
- Fichiers : components/RoleHome.js, demo/demoPages.js, versions.

## v353 — sept cadrans de plus, animations entre 150 et 300 ms

- Cadrans d'accueil : tableau des départs, écarts au planning initial, machines par chef / pays / gamme, fins de production à venir, prochaines arrivées (inactifs par défaut).
- Mouvement : jetons --e-dur-* entre 150 et 300 ms, signaux d'attention joués une fois, plus de transition sur la mise en page ; aucune bibliothèque d'animation.
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : components/RoleHome.js, styles.css, SharedUI.js, TurbinesHub.js, ManagerNav.js, WorkshopScreen.js, demo/demoPages.js, versions.

## v354 — corrections de sécurité (revue security-review)

- PDF de la checklist de debug : signature limitée à une image PNG / JPEG et échappée (XSS stockée corrigée).
- Fonction Odoo : la clé API n'est envoyée qu'à *.odoo.com ou aux domaines de ODOO_ALLOWED_HOSTS (functions/.env). **Redéployer les fonctions** : `firebase deploy --only functions` (après avoir créé functions/.env si l'Odoo n'est pas en *.odoo.com).
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : src/debugPdf.js (+test), functions/odoo.js, functions/test/odoo.test.js, functions/LISEZMOI.md, versions.

## v355 — l'accueil en widgets (maquette v354-cadrans-widgets validée)

- Nouveau composant components/WidgetBoard.js : grille de 4 colonnes (2 sous 900 px), tailles Petit 1×2, Moyen 2×2, Grand 2×4, Bandeau 4×2, Grand bandeau 4×4 (lignes de 112 px) ; mode édition (« Modifier l'accueil » ou appui long, propriétaire) ; glisser 1:1 avec animation FLIP ; piles ; galerie d'ajout avec aperçu ; clavier (Entrée, flèches, Suppr).
- Données : planning/profiles.homeLayouts[poste].widgets = [{ t, z } | { stack: [ids], z }] ; sans cette liste, la disposition est reprise de l'ancienne (cadrans par défaut + ajoutés − retirés, largeur → taille). Une seule écriture au lâcher. Règles Firestore inchangées.
- Sept petits widgets (RoleHome.js) : jour, nextDep, nProd, nDep30, nLate, nBanc, nShipped. Les pages KPI et Tests gardent Arrange.js.
- Aucune clé localStorage.
- Fichiers : components/WidgetBoard.js, components/RoleHome.js, styles.css, demo/demoPages.js, versions.

## v356 — audit apple-design de toutes les pages et pop-ups (lots 1 à 4)

- Galerie ?demo complétée (fiche d'un PJ, Modifications, Gestion des accès, Achats, Retards, Machines ORC, Fermetures, Personnes, Nouveautés).
- Gestes : barres du Gantt du planificateur en événements pointeur (doigt, stylet), collées au pointeur entre deux jours ; fiche d'un PJ en feuille (≤ 640 px) fermée en la tirant vers le bas par son en-tête (> 120 px ou geste rapide) ; détail de la charge du planificateur au toucher et au clavier.
- Retour à l'appui (styles.css) : éléments role=button / data-kbd enfoncés à 0,98, lignes voilées.
- Fenêtres et menus (motion.js) : un menu ouvert par un clic ou une touche reçoit le focus, flèches haut / bas, focus rendu à la fermeture de tout menu, liste ou bulle ; Échap ferme d'abord le volet ouvert dans la fiche d'un PJ ; bulle Présence collée à son bouton.
- Finitions : src/scrollMode.js `smooth()` (défilement doux coupé si réduire les animations) ; grands chiffres (≥ 28 px) resserrés à -0,02 em, police d'affichage pour les chiffres des KPI.
- Aucune clé localStorage ; données et règles Firestore inchangées.
- Fichiers : planner/PlannerGantt.js, planner/PlannerLoad.js, planner/PlannerLanes.js, components/RowDetail.js, TableView.js, CalendarView.js, GanttView.js, SavPage.js, TestsTab.js, KpiStory.js, KpiViews.js, ManagerPanel.js, WorkshopScreen.js, RoleHome.js, motion.js, scrollMode.js, styles.css, demo/demoPages.js, versions.

## v357 — la page Tests en widgets

- `WidgetArrange` (components/WidgetBoard.js) remplace `Arrange` : chaque enfant devient un widget ; disposition `planning/profiles.pageLayouts[id].widgets` (même ArrangeCtx qu'avant, propriétaire seul, bouton « Modifier la page »). Les anciennes dispositions Arrange (pos / order) ne sont plus lues : tailles par défaut au premier affichage.
- Tests › Par semaine : Au banc maintenant et Derniers résultats en Moyen côte à côte, Planning des bancs en « Pleine hauteur » (nouvelle taille `auto` : toute la largeur, lignes calculées d'après le contenu).
- KPI : la Synthèse n'a plus de cadrans disposables depuis la V281 (récit validé) ; KpiPilotage (inutilisé) passé lui aussi sur WidgetArrange.
- Aucune clé localStorage ; règles Firestore inchangées.
- Fichiers : components/WidgetBoard.js, TestsTab.js, KpiPilotage.js, styles.css, demo/demoPages.js, versions.

## v358 — les 4 lots de l'audit apple-design / taste-skill / UI-UX Pro Max

- Widgets (WidgetBoard.js) : « Annuler » 6 s après chaque modification, « Réinitialiser » (`onReset` → `widgets: null`), message 4 s, pile horizontale (points cliquables, ← →), widget sans contenu sans case, catalogue de la galerie construit à l'ouverture, plus de `overscroll-behavior: contain` dans les tuiles, boutons d'édition de 44 px au doigt.
- Accueil : « Ma semaine » = semaine suivante le week-end ; « expédiée depuis mai ».
- Téléphone : fiche de tests (fil des étapes en bande sous 720 px, livret empilé), SAV (bouton d'étape sur plusieurs lignes, ligne « À planifier »), onglets en piste sur une ligne (PlanSwitch défile), Calendrier › Mois (n° sans « PJ » + lettre d'étape, légende assortie), onglets de la fiche d'un PJ.
- Lisibilité : `Hl` éclaircit le surligneur quand son contraste avec le titre est inférieur à 4 (clair seulement) ; Liste (« Chef », « ＋ Client/NOBO » décollé) ; boutons pleins en double passés en secondaire (fiche de tests, PV, Nouveautés, SAV, Checklists « ✓ Enregistré ») ; Machines ORC (largeurs) ; planificateur (colonne Tâche 304 px) ; Gestion des accès (titre de niveau 2).
- KPI : `chartAnim()` (scrollMode.js) sur tous les graphiques recharts (300 ms, sans délai, coupé si réduire les animations) ; « Détail » replié sur tous les sous-onglets ; Semaines : 0 % en gris ; Charge « Toutes années » en mois réels ; charge sans heures = pas de donnée ; KPI du SAV en une teinte.
- Aucune clé localStorage ; données : `homeLayouts[poste].widgets` et `pageLayouts[id].widgets` peuvent valoir `null` (disposition d'origine) ; règles Firestore inchangées.
- Fichiers : components/WidgetBoard.js, RoleHome.js, HomeView.js, TestFiche.js, TestsTab.js, DebugChecklist.js, SavPage.js, PlanSwitch.js, CalendarMonth.js, RowDetail.js, SharedUI.js, TableView.js, TutoVideo.js, ChecklistsView.js, ManagerFiche.js, ManagerPanel.js, ManagerParts.js, MiniPie.js, KpiBilan.js, KpiStory.js, Series.js, AccessPage.js, planner/PlannerGantt.js, theme.js, scrollMode.js, styles.css, demo/DemoGallery.js, demo/demoPages.js, versions.

## v359 — widgets à la hauteur de leur contenu (maquette v359-accueil-avant-apres validée : « Go, applique »)

- WidgetBoard.js : la taille règle la largeur seulement (`WG_SIZES` s Petit · m Moyen · xl Large) ; hauteur = contenu (`fitRows`, lignes de 49 px + écart 14 px, 2 lignes au moins, mesurée à l'image suivante par ResizeObserver). Anciennes tailles lues sans perte (`WIDE` : l → m, xxl / auto → xl).
- Sur les 7 accueils de la galerie : tuiles à moitié vides 33 → 6 sur 42, listes coupées 4 → 0.
- RoleHome, TestsTab, KpiPilotage : tailles permises ramenées à s / m / xl.
- Aucune clé localStorage ; données et règles Firestore inchangées.
- Fichiers : components/WidgetBoard.js, RoleHome.js, TestsTab.js, KpiPilotage.js, styles.css, versions.

## v360 — trier la Liste d'un clic sur l'en-tête

- TableView.js : le nom de chaque colonne est un bouton (`SL`, `cycleSort`, classe `enogia-sort-lbl`) — 1er clic ↓ (décroissant), 2e ↑ (croissant), 3e = plus de tri ; flèche ↕ grise sinon ; `aria-sort` sur l'en-tête (N° PJ compris) ; tri par nombre de commentaires ajouté ; les anciens petits boutons de Début prod et Avancement remplacés par le même nom cliquable. L'entonnoir garde les filtres et les tris spéciaux (date la plus ancienne, dérive).
- Aucune clé localStorage ; données et règles Firestore inchangées.
- Fichiers : components/TableView.js, versions.

## v361 — besoins turbines plus compacts, besoins complets visibles

- TurbinesHub.js : logement (`Sock`) 50 → 40 px, 2 lignes (la 3e ligne « prévue / prochaine libre » passe dans la bulle) ; `Piece` : détail sur la ligne du libellé, référence 13 px ; cartes minmax 420 → 340 px, padding 6 / 8 px ; cartes de la galerie 157 → 134 px et 245 → 202 px.
- « À compléter » décochée par défaut : les besoins complets restent affichés. Clé localStorage **`enogia_nd_open`** (« 1 » = n'afficher que les besoins à compléter).
- Données et règles Firestore inchangées. Fichiers : components/TurbinesHub.js, versions.

## v362 — jalons d'arrivée et de départ au calendrier

- CalendarView.js : `MilestoneGlyph` (SVG, triangle = arrivée, losange = départ, couleurs `stagePalette`) ; `RowTrack` pose les repères contre le bord du jour (avant la barre / après), reçoit `viewL` / `viewR` / `stickL` : barre hors de la partie visible → rappel collé (sticky) « Arrivée jj/mm → » ou « ← Départ jj/mm » ; légende « Arrivée (réception) · Départ ».
- CalendarMonth.js : forme dans les plaques Arrivée / Départ (`onFill`) et dans la légende.
- Aucune clé localStorage ; données et règles Firestore inchangées. Fichiers : components/CalendarView.js, components/CalendarMonth.js, versions.

## v363 — fréquences par vitesse de turbine (checklist de debug)

- testFiche.js : `vibSpeeds`, `speedRange`, `freqStatus(val, plage)` (empty / norange / in / out, bornes comprises, une seule borne possible), `speedProgress` ; test `src/vibSpeeds.test.js`.
- Données (même document `planning/tests`, objets seulement) : `vibModel.speeds = [{ id, label }]`, `vibModel.ranges = { [turbine]: { [vitesse]: { min, max } } }` ; par PJ `plans[PJ].debug.spd = { [turbine]: { [vitesse]: "valeur" } }`.
- TestFiche.js : `SpeedTable` sous le bloc vibrations (`VibBlock model`), `FREQ_LOOK` ; ChecklistsView.js : vitesses + plages dans « Fréquences et vibrations » ; DebugChecklist.js : avancement « fréquences n / m » et données du PDF ; debugPdf.js : tableau `spd` (valeurs échappées par `x()`, classes `.in` / `.out`) ; TestsTab.js : étape en rouge si une fréquence est hors plage.
- Aucune clé localStorage ; règles Firestore inchangées. Galerie : vitesses fictives dans `demoData.js`.

## v364 — gestion des accueils par rôle

- components/HomeRoles.js (nouveau) : `HomeRoles` (rôles à gauche, actions, aperçu = `RoleHome` du rôle), `layoutModified`, `layoutCount`, `copyLayout` (widgets du rôle source, sinon ses widgets par défaut) ; « Partir de zéro » = `widgets: []` (askConfirm), « Rétablir » = `{}` ; Annuler 6 s.
- HomeView.js : bouton « Gérer les accueils par rôle » dans la ligne « Accueil de : » (point ambre = rôle modifié) ; clé localStorage **`enogia_home_manage`** (« 1 » = écran de gestion ouvert).
- WidgetBoard.js : galerie en choix multiple (`Choisir` / « Ajouter N widgets », `add(picks)`), bouton « ＋ Ajouter des widgets ».
- Données inchangées (`planning/profiles.homeLayouts[rôle]`, propriétaire) ; règles Firestore inchangées. Galerie : « Accueil · gestion par rôle » (`home-roles`).

## v365 — cloche : Vu, Traité, Plus tard (piste B)

- src/bellFeed.js (nouveau, testé `bellFeed.test.js`) : `buildFeed` (fil, reportés, traités, pastille), `markLocal`, `laterUntil` (lendemain 8 h), `dayLabel`.
- Mention : « Vu » / « Traité » écrits sur le commentaire (`seen` / `resolved`, via `resolveComment`, visibles de tous) ; une réaction de la personne citée = Traité (V319). Autres lignes et « Plus tard » : sur le poste, clé localStorage **`enogia_bell_<adresse>`** = `{ [clé]: { s: seen | done | later, at, until } }` (ménage après 60 jours).
- InboxPage.js réécrit (fil par jour, `FeedRow` : glisser au doigt, seuil 80 px) ; MentionBell.js : pastille = `buildFeed().red` + demandes à valider, marques passées au pop-up (`bell`) ; styles.css : `.e-bell-acts` (survol / focus, toujours visible si `hover: none`), `.e-bell-swipe` (au doigt).
- Règles Firestore inchangées. Galerie : « Cloche » interactive.

## v366 — bancs séparés, planning par banc, historiques validés

- src/benchModel.js (nouveau, testé `benchModel.test.js`) : `BENCHES`, `benchOf` (planificateur, sinon planning publié, sinon banc 1), `nextByBench` (n par banc, ordre de passage), `packRows` (sous-lignes sans chevauchement), `byMonth`.
- TestsTab.js : `BenchStrip` (un cadre par banc, `BenchCard`, 4 suivantes), `BenchGrid` réécrit (piste A : ligne par banc, zoom `enogia_bg_zoom` = 2w / 6w / 3m, texte des barres collé au bord visible, PJ sans période en pied, `details` « Tests validés » par mois, 3 mois puis « Afficher les mois précédents ») ; « Au banc maintenant » en pleine largeur par défaut.
- TurbinesHub.js (`NeedsView`) : `isValid` / `instOf`, besoins validés hors du fil dans `details` « Besoins validés » (« Voir la carte » = carte complète), carte extraite en `card(n)`, cartes ≥ 310 px ; case « À compléter » et clé `enogia_nd_open` retirées.
- Galerie : PJ906 validé (expédiée) dans `DEMO_TESTS`. Données et règles Firestore inchangées.

## v367 — fiches projet : dépliage automatique, EPC dans le rapport, clôturées réduites

- ManagerFiche.js : effet sur `selPj` (groupe du chef retiré de `folded`, dossier ajouté à `openCl`, ligne `data-pj` amenée à l'écran par `scrollBy` + `smooth()` seulement si hors de vue) ; clic sur la synthèse d'un dossier = le déplier ; chevron des dossiers = icône qui pivote ; `ItemsSection` : ouvertes (2 puis « Afficher les N autres ouvertes »), clôturées dans « Clôturées (N) » repliable (ligne compacte, « Rouvrir » = `statusPatch(x, "todo")`) ; rapport chef de projet ouvert sur le chef ORC (`orcChefsOf`).
- CdpReport.js : `chef` = `orcChefsOf(meta)[0]` (EPC : chef ORC), `epcChef` ; cdpPptx.js : « (chef EPC : …) » dans l'en-tête des fiches.
- styles.css : `.enogia-cl-in` (fondu 180 ms, coupé si réduire les animations).
- Aucune clé localStorage ; données et règles Firestore inchangées.

## v368 — rapport chef de projet (apple-design), bancs en deux jaunes

- reports/cdpPptx.js : `cap` / `capT` / en-têtes de tableaux en casse normale sans espacement (11 pt / 9 pt) ; tailles minimales 8,5–9 pt ; `itemRows` réécrit (ouvertes en entier, mitigation = `risk` en gras puis `measure`, échéance à droite, clôturées résumées « ✓ N clôturées · dernière le … ») ; `fitNote` renvoie `cut` ; `layout1(i)` (mise en page de la diapositive 1) ; `needsFull(i)` → diapositive « Textes complets de la fiche » (`pjSlideFull`) comptée dans `slidesForPj`.
- CdpReport.js : `infoOf` exporté ; mitigations avec `risk`, `measure`, `deadline`.
- TestsTab.js : `BENCH_C` = jaune des tests (banc 1) / mélange avec `T.amber500` (banc 2, `mixHex`), barres « en cours » et liseré des barres prévues à la couleur du banc, `GridLegend benches`.
- Fichiers de contrôle (hors dépôt) : maquettes-design/v368-rapport-cdp-avant.pptx, -apres.pptx, -apres-textes-longs.pptx (données fictives). Données et règles Firestore inchangées.
- Suite (vérifiée en exportant les diapositives par PowerPoint) : `clip` coupe à la fin d'un mot ; « Textes complets de la fiche » en deux colonnes continues (un seul bloc de texte par colonne).

## v369 — Cash in › Encaissements (saisie DAF) + widget « À encaisser »

- cashinModel.js : `toCollect(rows, today)` (factures émises non payées hors EPC, groupes late / week / later, encaissement prévu = facture + délai à défaut), `recentlyPaid`, `setEncReelle` (via `applyEdit` : statut et dates recalculés comme public/cashin.html) ; test `src/cashinCollect.test.js`.
- components/CashInEncaissements.js (nouveau) : liste, saisie de la date de paiement, « Annuler » 6 s, « Reçus ces 30 jours » ; écriture `saveEncReelle` = `runTransaction` sur `planning/cashin` (seul `encReelle` du jalon change ; le tableau complet reçoit la mise à jour par sa lecture temps réel).
- CashInTab.js : sélecteur « Tableau complet / Encaissements » (`sub`, `onSub`, `canEdit`) ; App.js : `cashSub` (clé localStorage **`enogia_cash_sub`**), `cashEdit` = Modifier sur Finance (sinon droits d'avant), `onOpenCash("enc")`.
- RoleHome.js : widget `encaisser` (catalogue « Gestion — Turbines et Cash in »).
- Droits : le DAF doit avoir « Modifier » sur Finance (rôle Direction par défaut, ou un rôle « DAF » à créer). Règles Firestore inchangées ; la restriction « seulement la date de paiement » est assurée par l'écran (les règles donnent Modifier sur tout le document).
- Galerie : « Cash in · encaissements » (`DEMO_CASHIN`, en mémoire). public/cashin.html inchangé.

## v370 — rôle DAF

- profiles.js : rôle `daf` « DAF » dans `ROLES` ; access.js : `DEFAULT_LEVELS.finance.daf = "w"`, `rolesOf` ajoute à une liste enregistrée les rôles intégrés manquants ; RoleHome.js : `HOME_DEFAULTS.daf` (encaisser, cash, kpis, departs) et phrase d'ouverture `roleLead("daf")` (factures émises à encaisser, en retard, cette semaine) ; test `src/dafRole.test.js`.
- **À faire par Gabriel** : 1) Gestion des accès › Personnes : donner le rôle « DAF » à la personne ; 2) Gestion des accès › Accès par page : vérifier Finance = Modifier pour DAF puis **Enregistrer** (les règles Firestore lisent les niveaux enregistrés dans `planning/access`, pas les valeurs par défaut du code) ; 3) les accès doivent être activés (« Activer les nouveaux accès ») : avant, le Cash in reste réservé au propriétaire et aux admins. Règles Firestore inchangées.
- Galerie : « Accueil · gestion par rôle » avec accès Finance et Cash in fictif (accueil DAF complet).

## v371 — export Excel du Cash in (taste + apple-design + UI/UX Pro Max)

- public/cashin.html (`exportXlsx`) : feuilles Synthèse (titre, date, 5 chiffres clés, tableau à partir de la ligne 7, total, PJ entièrement EPC en gris), Jalons (écarts repliés `outlineLevel` 1, EPC en gris, renvoi à la ligne), Cash par mois, PJ par mois ; en-têtes `C.head` clairs, filets fins, montants `#,##0 "€"` avec « – » pour zéro ; `sheetSetup` (paysage, une page de large, A3 pour Jalons, ligne d'en-tête répétée, pied « Page x / n ») ; bouton « Exporter en Excel » non plein, « Préparation… » pendant la génération ; fichier `Cash-in_AAAA-MM-JJ.xlsx`. `CASHIN_PAGE_VERSION` 371.
- Piège évité : `outlineProperties` + `fitToPage` sur une même feuille → ExcelJS écrit `sheetPr` dans le désordre et Excel refuse d'ouvrir le fichier (vérifié par ouverture dans Excel) ; `outlineProperties` n'est donc pas utilisé.
- Fichier de contrôle (hors dépôt) : maquettes-design/v371-cash-in-export.xlsx et .pdf (données fictives).

## v372 — besoins turbines compacts (apple-design)

- TurbinesHub.js : `Sock` sur une ligne de 36 px (icône + référence, libellé et détail dans la bulle), `Piece` sur une ligne ; carte = en-tête sans barre d'avancement, ligne des libellés (Turbine · Roue · Injecteur), une ligne par turbine + bouton rond « Marquer installée / Annuler l'installation », pied (pire écart des turbines non installées avec la disponibilité en bulle, « n / m pièces ») ; besoins validés : `reopen` (« Rouvrir », `installOps(…, false)` sur les turbines installées, confirmé) à la place de « Voir la carte » ; phrase d'aide de la barre retirée (dans la bulle des n° de priorité) ; `ProgBar`, `REF_ST` retirés.
- Galerie : page Turbines vivante en mémoire (attribuer, installer, rouvrir), jamais écrite en base.
- Données et règles Firestore inchangées.
- Test `needsView.test.js` adapté : état et détail des pièces lus dans les bulles (`title`), « Marquer installée » dans le nom du bouton rond, « n / m pièces » dans le pied.

## V373 — Besoins turbines : ordre à la poignée et place choisie dans une liste

Demandé : « le skill apple design peut faire mieux, surtout sur les petites flèches ou les numéros (5 maquettes) » ; maquette `maquettes-design/v373-besoins-ordre-5-pistes.html`, choix **A + E**.

- **A** : poignée ⋮⋮ (`.enogia-nd-grip`, `dnd.dragProps({ kind: "need", key })`, copie = la carte) ; chaque carte reçoit (`dropProps("need:" + key)`, contour `T.accentInk` au survol) → `placeNeed` → `placeNeedKey(needs, clé, cible)` (turbineNeeds.js, testé : avant si on monte, après si on descend) ; Alt + ↑ / ↓ = `moveNeed`.
- **E** : numéro discret (`.enogia-nd-rank`) → `RankPicker` (besoins du même mois, « avant / ici / après », « Rang global » = `setRank`, échange comme avant), Échap / clic à côté ferment.
- Retirés : flèches ▲ ▼ (`arrowB`), pastille noire et saisie `rankEdit`.
- Même document `planning/prodTurbines.ordre.besoins.keys` : règles inchangées.
- Fichiers : src/components/TurbinesHub.js, src/turbineNeeds.js, src/placeNeed.test.js.
- Clés localStorage : aucune.

## V374 — Cash in › Fiche du lundi, envoyée par le site

Demandé : « il part de l'artefact, je veux qu'il parte directement du site » ; maquette `maquettes-design/v375-fiche-lundi-G.html` (piste G : « une page sur l'année, une sur le mois en cours avec les retards, une sur le mois qui arrive »), « Oui, code G ».

- **Calculs** `src/cashWeekly.js` (testé) : `weeklyReport(cashin, aujourd'hui, envoi précédent)` — année (encaissé / facturé depuis janvier face à l'initial, fin d'année prévue, si les retards sont payés, courbe cumulée `curveGeom` / `curveSvg`), mois en cours (`monthView` : comme l'onglet « Cash par mois »), retards (onglet « Écarts » : `ecartKpis`, jalons en retard, comparaison avec lundi dernier `snapshotOf`), mois qui arrive (par semaine, jalons partis plus tard, à surveiller) ; `mailHtml` (tableaux, styles en ligne, texte échappé), `mailText`, `subject`, `cleanRecipients` (@enogia.com seulement).
- **Page** `src/components/CashInWeekly.js` : sous-page « Fiche du lundi » du Cash in (Admin sur Finance, sinon propriétaire / admins) — aperçu exact du mail, envoi automatique, destinataires, « M'envoyer un test », « Envoyer maintenant » (10 s pour annuler), état de la demande (« sans réponse du serveur » après 5 min), derniers envois. Galerie : « Cash in · fiche du lundi ».
- **Serveur** `functions/` : `cashWeeklyLundi` (lundi 7 h, Europe/Paris, production, si « on »), `cashWeeklyDemandeProd` / `cashWeeklyDemandeBeta` (à chaque nouvelle demande `ask`) ; `functions/weekly.js` : PDF A4 de 3 pages (pdfkit), courbe en PNG (resvg, sans texte), envoi SMTP Google Workspace (nodemailer) ; `functions/shared/*.mjs` recopiés par `node scripts/sync-functions.js` (lancé avant chaque déploiement, `firebase.json › predeploy` ; un test vérifie que les copies sont à jour). Tests `cd functions && npm test` (11).
- **Données** : `planning/cashinWeekly` (beta_ en bêta) = `{ on, recipients, ask, sent, history, last }`.
- **À faire par Gabriel** : 1) compte d'envoi Google Workspace + mot de passe d'application ; 2) `firebase functions:secrets:set MAIL_USER` et `MAIL_PASS` ; 3) `cd functions && npm install` ; 4) publier `firestore.rules` (document `cashinWeekly`) ; 5) `firebase deploy --only functions` ; 6) essai sur la bêta avec « M'envoyer un test ». Mode d'emploi : `functions/LISEZMOI.md`.
- Clés localStorage : `enogia_cash_sub` accepte « lundi ».
- Fichiers : src/cashWeekly.js (+ test), src/components/CashInWeekly.js, CashInTab.js, App.js, cashinData.js, demo/, scripts/sync-functions.js, functions/index.js, functions/weekly.js, functions/shared/, functions/package.json, functions/test/weekly.test.js, functions/LISEZMOI.md, firestore.rules, firebase.json.

## V375 — Encaissements : montant reçu différent du montant prévu

Demandé : « indiquer si on a reçu la somme mais différente de la somme prévue ; une case à côté pour mettre à jour une somme (de base ne rien changer) ».

- **Données** : nouveau champ facultatif `montantRecu` sur un jalon de `planning/cashin.rows` (absent = payé au montant prévu ; le champ `montant`, montant de la facture, n'est jamais modifié). La page Cash in (public/cashin.html) garde les champs qu'elle ne connaît pas : rien n'est perdu à l'enregistrement.
- **Modèle** (cashinModel.js, testé `montantRecu.test.js`) : `setEncReelle(rows, id, iso, today, recu)` (noté seulement s'il diffère du montant, effacé quand on remet à encaisser), `paidAmount(r)`, `paidGap(r)` ; l'encaissé de `groupStats` et de `monthly` (onglets Projets et Cash par mois du site) et de la fiche du lundi (`cashWeekly.js`) compte la somme reçue.
- **Page** (CashInEncaissements.js) : bouton discret « Montant différent ? » → case « Reçu » (montant prévu pré-rempli, écart en direct, « montant illisible » refusé, × ou Échap = garder le montant prévu), bouton « Encaissé aujourd'hui · 45 500 € », message et « Reçus ces 30 jours » avec l'écart.
- **Cash in (cashin.html, `CASHIN_PAGE_VERSION` 375)** : `paidAmt` dans les chiffres (Encaissé), Projets et Cash par mois ; mention « reçu … (écart) » sous le montant du jalon.
- **Fonctions** : `functions/shared` recopié (`node scripts/sync-functions.js`) — redéployer les fonctions (`firebase deploy --only functions`) pour que la fiche du lundi compte la somme reçue.
- Règles Firestore inchangées. Fichiers : src/cashinModel.js, src/cashWeekly.js, src/components/CashInEncaissements.js, public/cashin.html, src/cashinData.js, src/demo/demoPages.js, functions/shared/, src/montantRecu.test.js.

## V376 — Fiche du lundi : listes pratiques et commentaires

Demandé : « garder la première page ; sur le mois en cours, voir les factures émises, les encaissements prévus et les encaissements réels (avec les dates) ; mettre les commentaires si décrits dans l'outil ; pareil pour le mois prochain ».

- **Modèle** (`src/cashWeekly.js`, testé) : `monthLists(doc, mois, aujourd'hui, avecRetards)` → `factures` (émises dans le mois / à émettre, retards des mois précédents repris pour le mois en cours), `prevus` (paiements non reçus, retards en tête), `recus` (date, écart de date au prévu, montant reçu V375), totaux ; `commentOf(r)` = « Explication des écarts » (`note`) + « Causes du retard » (`causes`) du Cash in. `rep.cur.lists`, `rep.next.lists`.
- **Mail** : partie 1 inchangée ; parties 2 et 3 = une ligne de résumé (émis, à émettre, reçus, attendus, initial du mois) puis les listes, commentaire en italique sous le jalon. Les blocs Retards / Cette semaine / Par semaine / À surveiller sont retirés.
- **PDF** (`functions/weekly.js`) : page 1 inchangée ; pages 2 et 3 en listes (statut, PJ, jalon, client, date, montant, commentaire dessous) ; une liste trop longue continue sur une page « (suite) », pages numérotées à la fin ; caractères absents de la police du PDF retirés des commentaires (émojis).
- **Fonctions à redéployer** : `firebase deploy --only functions`.
- Fichiers : src/cashWeekly.js (+ test), functions/weekly.js, functions/shared/.

## V377 — SAV : une seule ligne pour les chefs de projet, règle des créneaux en direct

Demandé : « en tant que chef de projet, uniquement une ligne pour le SAV avec les créneaux déjà réservés (en bleu, plus de MES possible), en pointillé ceux où une intervention est possible suivant une règle définie par le responsable SAV, et quand il n'y a rien le CdP met sa date ; la règle liée au nombre de ressources disponibles, avec un réglage en direct ».

- **Règle** (`src/savModel.js`, testé) : `planning/sav.capa = { n, periods: [{ id, from, to, n }] }` — `capacityOn` (n absent = nombre de techniciens ; une période particulière le remplace, la plus basse si plusieurs) ; `slotDays` : une intervention datée (hors annulée) prend une ressource par technicien (au moins 1), une demande en attente en prend 1 ; état `full` / `some` / `free`.
- **Vue chef de projet** (`PlanningView`, SavPage.js) : une ligne « SAV / MES » — bleu plein « Complet », pointillé « N places », libre = rien ; clic sur un jour ouvré à venir non complet = demande d'intervention (`DemandeDialog` inchangé) ; « + » discret sur les jours libres ; légende. Les lignes par technicien et la ligne Demandes ne sont plus montrées aux chefs de projet.
- **Responsable SAV** : bouton « Règle des créneaux · N ressources » → `CapaPanel` (− / + enregistré après 0,35 s, « Revenir au nombre de techniciens », périodes particulières du / au / ressources, Retirer) ; sélecteur « Équipe / Vue chef de projet ».
- Même document `planning/sav` (écrit par l'équipe SAV) : règles Firestore inchangées. Galerie : SAV · planning (réglage en mémoire), SAV · chef de projet.
- Fichiers : src/savModel.js (+ test), src/components/SavPage.js, src/styles.css, src/demo/demoPages.js.

## V378 — Menu : rubriques repliables au clic

Demandé : « pouvoir déplier et replier dans le panneau à gauche les gros dossiers (police plus grosse) ; j'aimais bien le dépliage automatique et smooth mais pas un truc qui s'ouvre et se ferme quand je passe la souris dessus » + capture du bouton palette « il n'y a pas de texte ».

- App.js : en-têtes de rubrique (`NAV_TREE`) = boutons 14 px demi-gras (`aria-expanded`, chevron qui tourne), clic seulement ; état replié gardé sur le poste (`enogia_nav_grp_closed`) ; la rubrique de la page ouverte se déplie seule quand on y arrive (`activeGrp`) ; contenu qui apparaît en fondu (`.enogia-cl-in`, 180 ms, coupé si réduire les animations), aussi pour les sous-pages ; pastille rouge de la rubrique repliée = somme des pastilles de ses pages. Au téléphone (barre d'icônes), rien n'est masqué.
- ThemePicker : `withLabel` (icône + « Apparence », même style qu'« Écran atelier »), panneau ouvert à droite du menu large.
- Clé localStorage : `enogia_nav_grp_closed`. Fichiers : src/App.js, src/components/ThemePicker.js, src/styles.css.

## V379 — SAV : disponibilités de l'équipe

Demandé : « le système de ressources n'est pas complètement opérationnel : dans l'équipe, sélectionner ou non les personnes et avoir leur calendrier pour indiquer leurs jours off et leurs congés (un onglet) ; pour la vue chef de projet, pas le nombre de places ; les pointillés = MES possible sous réserve du type, de l'emplacement et de ce qu'il y a à faire ».

- **Données** : `planning/sav.dispo = { [nom]: { exclu, weekOff: [1–5], days: { AAAA-MM-JJ: "off" | "conge" } } }` — remplace la règle `capa` de la V377 (plus lue).
- **Modèle** (savModel.js, testé) : `unavailableWhy`, `isAvailable`, `availTechs`, `setAbsence` (jours ouvrés d'une période) ; `slotDays(inters, techs, demandes, jours, dispo)` : capacité = personnes sélectionnées et disponibles ; occupé = personnes disponibles en intervention + interventions sans personne disponible + demandes en attente.
- **Page** : sous-page « Disponibilités » (`DispoView`, équipe SAV seulement — Modifier / Admin ; jamais aux chefs de projet) : équipe (case « compte dans les ressources », jours off chaque semaine Lu–Ve, « ＋ Congés ou absence » du / au), calendrier 12 semaines (clic = off → congés → disponible, « • » = en intervention), ligne « Disponibles ». Planning (équipe) : jours d'absence rayés sur la ligne de chaque technicien ; bouton « Disponibilités · N aujourd'hui ». Vue chef de projet : « Complet » / « Possible sous réserve », sans nombre.
- access.js : sous-page `sav.dispo` ; App : menu SAV › Disponibilités. Même document `planning/sav` : règles Firestore inchangées. Galerie : « SAV · disponibilités ».
- Fichiers : src/savModel.js (+ test), src/components/SavPage.js, src/App.js, src/access.js, src/demo/demoPages.js.

## V380 — Cloche : Vu / Masquer / Plus tard sur les demandes à valider

Demandé (capture de la cloche, 278 demandes) : « je ne peux toujours pas supprimer les infos ni les marquer vues ».

- `src/bellFeed.js` (testé) : `actionKey(demande)` = identifiant + empreinte du contenu (nombre, titre, détail, éléments) ; `splitActions(demandes, marques)` → `open` / `seen` / `later` / `done` ; `actionsRed` = ce qui compte dans la pastille. Marques sur ce poste (`enogia_bell_<adresse>`, comme le fil de la V365).
- InboxPage : sous chaque demande, « ✓ Vu » (grisée, hors compte ; « Non vu » pour annuler), « Masquer » (jusqu'à ce que le contenu change), « Plus tard » (demain 8 h) ; « N masquées ou reportées · Afficher » → « Remettre ».
- MentionBell : prop `actions` (App lui passe `inboxActions`) → pastille rouge sans les demandes vues, masquées ou reportées.
- Fichiers : src/bellFeed.js (+ test), src/components/InboxPage.js, src/components/MentionBell.js, src/App.js, src/demo/demoPages.js.

## V381 — Menu : rubriques en couleur, sous-pages au clic

Demandé : « les titres du panneau à gauche doivent avoir une couleur différente ; le déploiement automatique des sous-dossiers ne fonctionne pas, est-ce normal ? » — non : en menu non épinglé, un clic sur une page à sous-pages l'ouvrait et refermait aussitôt le menu, on ne voyait jamais les sous-pages.

- App.js : en-têtes de rubrique en `NAV.group` (or dans le menu sombre) / `T.accentInk` (clair) ; une entrée à sous-pages ne referme plus le menu (`setNavPeek(false)` seulement sans sous-pages).
- Maquette `maquettes-design/v381-haut-de-page.html` (espace en haut des pages : A resserré, B titre dans la barre, C barre qui s'efface) en attente du choix.
- Fichiers : src/App.js.

## V382 — Le titre des pages dans la barre du haut

Demandé : « l'espace en haut de chaque page pourrait être réduit » ; maquette `maquettes-design/v381-haut-de-page.html`, option **B** choisie : « B, titre dans la barre ».

- `PageHead` (SharedUI.js) : sur le site, rendu dans la barre (`createPortal` vers `#enogia-bar-title`) — titre 22–28 px surligné, bulle « i » (`title` = phrase de la page, lue au survol, au clavier, au doigt par tips.js), `right` (sous-pages, boutons) ; pose `--page-accent` sur la barre (trait de 3 px de la couleur de la page) ; sans barre (galerie hors site, tests, `inline`) : en-tête sur place comme avant.
- App.js : barre `#enogia-bar` (56 px, fond plein, collée en haut, trait `--page-accent`), emplacement `#enogia-bar-title` après ☰ ; marge au-dessus du contenu 12 px ; focus sur le h1 de la barre au changement de page.
- ManagerPanel (Projets, Pilotage, Réglages…) et Gestion des accès : en-têtes faits à la main remplacés par `PageHead` (titre, phrase, sous-pages, boutons dans la barre).
- Galerie : barre du haut identique (le titre y monte).
- Fichiers : src/components/SharedUI.js, src/App.js, src/components/ManagerPanel.js, src/components/AccessPage.js, src/demo/DemoGallery.js.

## V383 — Demande de turbines SAV refaite

Demandé : « pouvoir mettre un nombre de turbines et dire sur quel PJ c'est associé ; hypothétique ou confirmée ; exemple PJ406 (3 ORC 180LT, 2 turbines par ORC), SAV406 demande 5 turbines sans savoir encore sur quelle machine : lier les turbines à un ORC ou laisser vide, à marquer par le SAV après l'intervention ; lier aux ticket et intervention SAV ; pouvoir revenir sur la demande ».

- **Données** : `planning/prodTurbines.besoins[id] = { label, pj, scope: "one" | "multi", orcs, qty, gamme, alloc: [ORC | ""], statut: "hypo" | "conf", ticket, inter, roue, inj, injB, date, note }` — l'ancien format `{ cfg }` reste lu.
- **Modèle** (turbineNeeds.js, testé) : `machinesOf(rows, pj)` (PJ406, PJ406-1…, pas PJ4061 ; turbines par ORC d'après la gamme), `proposeAlloc`, `savCfg`, `SAV_STATUTS` ; `buildNeeds` : besoin SAV avec `pj`, `statut`, `ticket`, `inter`, `slots[].machine` ; estimation des dates : les demandes confirmées d'abord ; `autoFill` ignore les hypothétiques.
- **Fenêtre** (`SavDialog`, TurbinesHub.js) : statut, PJ (liste du planning), n° SAV, date, un ORC / plusieurs ORC (cases), nombre et turbine 100 / 20 kW, « Proposer la répartition », ORC de chaque turbine (« À préciser »), ticket et intervention SAV (listes du SAV, filtrées sur le PJ ; saisie libre sans accès au SAV), roue, injecteur, bouchages, note. Carte : pastille Hypothétique (pointillé) / Confirmée, PJ · ticket · intervention, colonne « ORC » de chaque turbine (« à préciser » en ambre).
- **SAV** : `TurbLinks` dans le ticket et l'intervention (demandes liées : nombre, statut, ORC ou « N à lier »), « Ouvrir dans Turbines › Besoins ». Cloche : pas d'alerte de retard pour une demande hypothétique.
- Même document `planning/prodTurbines` : règles Firestore inchangées. Fichiers : src/turbineNeeds.js (+ test), src/components/TurbinesHub.js, src/components/SavPage.js, src/App.js.

## V384 — Turbines : ORC indiqués par le SAV, extract des besoins

Demandé : « ajoute la modification des ORC côté SAV (uniquement sur des ORC liés à des demandes d'intervention) ; pour aider le responsable des turbines, un extract des besoins (ORC / SAV) facile avec uniquement le type de turbine, le nombre, la date, SAV ou Prod ORC, la roue et l'injecteur ».

- **SAV** (SavPage.js, `TurbLinks`) : dans un ticket ou une intervention, pour chaque demande de turbines liée, une liste « ORC » par turbine (ORC choisis dans la demande, sinon ceux du PJ ; « À préciser ») — équipe SAV seulement (Modifier / Admin) ; `prodApi.setAlloc(id, alloc)` (useAppData.js) n'écrit que `besoins.<id>.alloc` (+ `allocAt`, `allocBy`).
- **Règles Firestore** : `prodTurbines` modifiable par l'équipe SAV (niveau Modifier sur SAV, ou rôle « SAV / MES » avant l'activation des accès) **seulement** sur le champ `besoins` — **à republier par Gabriel**.
- **Extract** : `needsExport(besoins)` (turbineNeeds.js, testé) ; `exportTurbineNeedsXlsx` (exportExcel.js, ExcelJS chargé à la demande) : feuille « Besoins turbines » (Type de turbine, Nombre, Date du besoin, SAV ou Prod ORC — « SAV (hypothétique) » pour une demande hypothétique —, Roue, Injecteur avec bouchages), en-tête figé, filtres, totaux par type ; bouton « Exporter les besoins (Excel) » dans la barre de Turbines › Besoins (besoins ouverts, hors clos). Fichier `Besoins_turbines_<date>.xlsx`.
- Fichiers : src/components/SavPage.js, src/useAppData.js, src/App.js, src/turbineNeeds.js (+ test), src/exportExcel.js, src/components/TurbinesHub.js, firestore.rules, src/demo/demoPages.js.

## V385 — Espaces, titre Turbines, fiche du lundi

Demandé : capture de la ligne « Affichage : Jours · Export Excel · Colonnes » — « pareil sur cet espace qui est de trop (faire la chasse aux espaces inutiles) » ; « il manque le titre sur l'espace Turbines » ; « rapport Cash in : les sommes en bas de chaque tableau et des graphiques (barres ou camembert) pour le mois en cours et le mois prochain, sans les commentaires » ; « le mail moins chargé : juste la courbe de l'année avec en gros encaissements mois en cours et mois prochain, pareil factures ».

- **SharedUI** : `BarTools` (portail vers `#enogia-bar-tools`, à droite du titre dans la barre ; sur place sans barre) ; `PageHeadOff` (contexte : un `PageHead` imbriqué ne s'affiche pas — Turbines › Production). App et galerie : emplacement `#enogia-bar-tools`.
- **Liste** (TableView) : la ligne d'outils disparaît (outils dans `BarTools`) ; il ne reste que « modifiés » quand il y en a.
- **Turbines** (TurbinesHub) : `PageHead` « Turbines » (sous-pages, chiffres, import) ; le titre « Production turbines » du kit n'est plus affiché en double.
- **Mail** (cashWeekly.js) : phrase, courbe de l'année, puis « Encaissements » et « Factures » en gros chiffres pour le mois en cours (reçus / attendus / en retard, émises / à émettre) et le mois prochain, initial et écart dessous ; plus de listes ni de commentaires (détail dans le PDF).
- **PDF** (functions/weekly.js) : barres de situation en tête des pages 2 et 3 (segments + trait de l'initial), « Total » sous chaque tableau, commentaires retirés. **Fonctions à redéployer** : `firebase deploy --only functions`.
- Fichiers : src/components/SharedUI.js, src/App.js, src/demo/DemoGallery.js, src/components/TableView.js, src/components/TurbinesHub.js, src/cashWeekly.js (+ test), functions/weekly.js, functions/shared/.

## V386 — Titres sans « i », demandes SAV closes

Demandé : « enlève le i à côté des titres » ; « la gestion des demandes closes n'est pas claire : le SAV doit juste indiquer après intervention où ils ont mis les turbines mais ne devrait pas rouvrir la tuile ».

- SharedUI (`BarHead`) : plus de bouton « i » ; la phrase de la page passe en `title` du titre.
- SavPage (`TurbLinks`) : les demandes closes (`done`) restent listées dans le ticket et l'intervention liés, avec la pastille « Close » et les listes « ORC » modifiables par l'équipe SAV (même écriture `setAlloc`).
- TurbinesHub (« Besoins clos ») : pour une demande SAV, listes « ORC » de chaque turbine (sans rouvrir) ; « Rouvrir » passe en bouton discret.
- Maquette `maquettes-design/v386-cartes-besoins.html` (cartes Besoins : A cartes repliables neutres, date en gros, gamme en clair, pop-up de priorité à droite ; B liste dépliable) en attente du choix.
- Fichiers : src/components/SharedUI.js, src/components/SavPage.js, src/components/TurbinesHub.js.

## V387 — Cartes Besoins turbines (piste A)

Demandé : « les tuiles ne sont pas à mon goût en clair et en sombre ; date de besoin pas assez claire, la gamme non plus ; le chiffre de la liste d'importance : un petit pop-up à droite pour montrer l'ordre ; les tuiles ne se déplient pas » ; maquette `maquettes-design/v386-cartes-besoins.html`, piste **A** choisie : « A, cartes ».

- TurbinesHub (`card`) : carte `T.card`, filet `T.line` (rouge si retard / problème), liseré gauche 4 px (`T.info600` ORC, `T.violet600` SAV) ; en-tête : poignée, rang (`.enogia-nd-rk`), bouton nom (PJ, nom, drapeau ; ORC / SAV, Hypothétique / Confirmée, gamme `cfg.l · gamme`, PJ · ticket · intervention), date 18 px + « dans N j » / « dépassé de N j » + marge turbine, chevron ; barre d'avancement (un segment par pièce : posée bleu, installée verte) ; corps déplié en fondu (`.enogia-cl-in`) : problèmes, turbines (inchangé), pied « N / M pièces posées » + Modifier la demande, Configuration, Clore.
- Ouverture : repliée par défaut, ouverte si en retard ou avec un problème ; choix gardé sur le poste (`enogia_nd_open2`).
- `RankPicker` : pop-up ancré à droite du numéro (à gauche s'il n'y a pas la place), ordre complet de priorité, ligne du besoin surlignée ; plus de « rang global » (toute la liste est là).
- Fichiers : src/components/TurbinesHub.js, src/needsView.test.js.

## V388 — Besoins turbines en lignes (piste B)

Demandé : « les tuiles des turbines Prod ORC et SAV ne sont pas belles, trop petites » ; maquette `maquettes-design/v388-cartes-besoins-4-pistes.html`, piste **B** choisie : « B avec la possibilité de réduire chaque tuile (mettre un bouton pour réduire tout) ».

- TurbinesHub (`card`) : ligne en grille `minmax(230px, 280px) 150px 1fr` (`.enogia-nd-row`) — colonne qui (poignée, rang, PJ 20 px, drapeau, flèche, client, ORC / SAV, statut SAV, gamme, PJ · ticket · intervention, barre d'avancement), colonne date (« Besoin le », date 28 px, année, « dans N j » / « dépassé de N j », marge), colonne pièces (en-têtes, turbines, pied).
- `Sock` 52 px sur deux lignes (pièce prévue en 15 px, indication dessous) ; `Piece` : référence 16 px (n° de turbine 15 px mono), détail dessous.
- Repliée : client, « Besoin le » et année masqués ; pièces résumées « N / M pièces posées » + premier problème (clic = déplier). Dépliée par défaut ; état gardé dans `enogia_nd_closed` (remplace `enogia_nd_open2`).
- Barre : « Tout réduire » / « Tout déplier » (besoins affichés).
- Sous 860 px : colonnes empilées.
- Fichiers : src/components/TurbinesHub.js.

## V389 — Jalons en losanges, Tests / Packaging justes

Demandé : « pourquoi j'ai des jalons de départ avant la fin des tests ? » ; « pourquoi des losanges et des barres pour l'arrivée ? je veux que des losanges ».

- Cause : la barre « Tests » allait jusqu'à `finProd` (fin du Packing) au lieu de `testsFin` ; là où le packing (ou les tests) finit après le départ publié, le losange de départ tombait dans la barre.
- CalendarView (`RowTrack`) : plus de segment « Réception » ; Tests = `tests` → `testsFin` ; Packaging = lendemain de `testsFin` → max(`finProd`, veille du départ) ; `depEarly` (départ < fin des tests / du packing) : losange au contour rouge + « avant la fin des tests / du packaging » ; losange de départ posé après la barre. `MilestoneGlyph` : arrivée = losange (couleur de l'arrivée), prop `warn`. Légende sans « Réception ».
- GanttView : barre du début de production à max(départ, `testsFin`, `finProd`) ; Tests jusqu'à `testsFin` ; « Packaging → départ » ; losanges d'arrivée et de départ (contour rouge si départ trop tôt) ; départ initial = losange vide ; légende Arrivée · Départ · Départ initial.
- Maquette `maquettes-design/v389-livret-4-pistes.html` (livret de configuration : A liste de contrôle, B pas à pas, C document annoté, D tableau des réglages) en attente du choix.
- Fichiers : src/components/CalendarView.js, src/components/GanttView.js.

## V390 — Livret de configuration pas à pas (piste B)

Demandé : « pas fan du livret manuel de configuration ORC et comment il rend en live, propose plusieurs maquettes » ; maquette `maquettes-design/v389-livret-4-pistes.html`, piste **B** choisie : « B, pas à pas ».

- TestFiche (`BookReader` réécrit) : fenêtre plein écran (`role=dialog`, `aria-modal`) — en-tête (Sommaire, titre · PJ, validées / OK / problèmes, « Étape N / M », Quitter), `ChapBand` (un segment par étape, vert OK, rouge problème ; clic = premier pas du chapitre), étape : fil (chapitre › sections), statut, titre 32 px, consigne en 18 px (`Blocks big`), images à droite ; pied : ‹ Précédente, commentaire (Entrée = enregistrer), Problème (P), OK, suivante (O), Suivante ›.
- Un geste : OK / Problème écrivent `{ s, v: true }` (`setStep`) ; OK passe à l'étape suivante ; Problème garde l'étape et met le focus sur le commentaire, « Suivante » refusée tant que le problème n'est pas décrit.
- Ouverture sur la première étape « À faire » (ou l'étape / le chapitre demandé). « Sommaire » = volet à gauche (filtres, liste, synthèse des problèmes, exports, reprise d'une session). Échap ferme le volet puis le livret.
- `StepCtl` (case + statut en 3 choix) et la double page retirés. Sous 760 px : image sous la consigne.
- Données inchangées (`plans[PJ].book.rows`) ; exports et PV inchangés.
- Fichiers : src/components/TestFiche.js, src/components/TestsTab.js (phrase), src/styles.css.

## V391 — Widgets : fermeture, Cash in, direction

Demandé : « je n'arrive pas à fermer certains widgets sur la home page ; rajouter en widget la courbe annuelle du Cash in et des widgets pour la direction ».

- Cause : `.e-wg-edit .e-wg-cell:active { transform: scale(.97) }` — à l'appui sur le « − », la tuile rétrécissait ; sur une tuile large, le bouton (au coin) se déplaçait d'environ 15 px et le relâcher tombait à côté : pas de clic. Corrigé par `:not(:has([data-wg-act]:active))` (styles.css).
- WidgetBoard : le brouillon est remis à zéro sur le contenu de la disposition (`JSON.stringify`), plus sur l'identité du tableau (la disposition par défaut est recalculée à chaque rendu).
- RoleHome : `CashCurve` (courbe de `curveGeom` de cashWeekly.js aux couleurs du thème, légende, mois) ; widgets `cashCurve` (Large / Moyen), `cashMonth`, `cashLate` (Cash in : visibles avec le droit Finance), `depQuarter`, `onTime` ; calculs `weeklyReport` (même chiffres que la fiche du lundi, hors EPC) ; catalogue « Gestion — Turbines et Cash in » et « Vue d'ensemble » ; `HOME_DEFAULTS.direction` (+ cashCurve, depQuarter, onTime) et `daf` (+ cashCurve, cashLate, cashMonth) — seulement pour un accueil jamais modifié.
- Fichiers : src/styles.css, src/components/WidgetBoard.js, src/components/RoleHome.js.

## V392 — Accueil chef de projet limité à ses PJ

Demandé : « les widgets doivent prendre en compte les PJ des chefs de projet ».

- HomeView : `rowsAll` / `openAll` (tout le parc) pour reconnaître la personne et son rôle ; puis `scope` (rôle `cdp` : PJ du chef affiché par le propriétaire, sinon mes PJ — profil, chef du PJ —, en cours et expédiés) → `rows`, `open`, `late`, `departs`, chiffres clés, parcours et widgets calculés sur ce périmètre ; les autres accueils inchangés.
- RoleHome : prop `scope` ; `cashDoc()` = Cash in limité aux jalons d'un PJ du périmètre (un jalon « PJ401/PJ402 » compte s'il touche l'un d'eux) pour Cash in, À encaisser, Cash in de l'année / du mois, Retards.
- Maquette `maquettes-design/v392-machines-orc-4-pistes.html` (Machines ORC : A tableau comme le Google Sheets, B fiche en onglets, C standards par gamme, D machine en blocs ; liens Turbines / Achats, kits extractibles) en attente du choix.
- Fichiers : src/components/HomeView.js, src/components/RoleHome.js.

## V393 — Passeport machine (lot 1)

Demandé : « La B est bien… à prendre comme un passeport qui vit et se remplit lors des phases de design, d'appro, de fab, tests, MES et SAV » puis « Oui lot 1 » ; maquette `maquettes-design/v393-passeport-machine.html`.

- `src/passport.js` (testé, passport.test.js) : `DEFAULT_ELEMENTS` (colonnes du « Tableau configuration machines » + composants du RAI ; groupe, choix, phase du réel — appro pour un élément acheté —, suivi achat / scope, suivi turbines), `elementsOf`, `gammeKey` (180LTV3 → 180LT), `stdOf`, `rowOf` / `passportRows` (prévu = cfg sinon standard ; `dev` = écart au standard ; réel { v, phase, src, by, at } ; `gap` = réel ≠ prévu, un réel plus précis n'en est pas un), `phaseProgress`, `setCfg` (valeur égale au standard = retirée), `setReal`, historique (300 lignes), `parseConfigTable` (onglet Tableau : TARGET = prévu, ACTUEL = réel fabrication), `parseReference` (onglet Référence), `importPlan` (n'écrase rien).
- Document `planning/machines` = { elements, standards, pass: { PJ: { cfg, real, hist } } } (`MACHINES_DOC_REF`, `BETA_DOCS`) ; `useMachines(on, auteur)` (useAppData.js : chaque PJ écrit en entier par `FieldPath`).
- `components/MachinePassport.js` : `MachinesHub` (Manager › Projets › Machines ORC : Passeport · S/N et états (ancien tableau) · Standards par gamme, `enogia_mach_sub`) ; passeport : liste (recherche, en cours / expédiées, fil des phases), en-tête, six phases cliquables, tableau par groupe (prévu / réel, édition sur place, source), historique, export CSV ; injecteur / roue / bouchages prévus repris de la fiche projet tant qu'ils n'y sont pas ; standards : gamme, standard, choix, phase, suivi achat + scope, suivi turbines, machines en écart, « ＋ Élément », import Excel (aperçu + confirmation). Écriture : admins (et Modifier / Admin sur Projets une fois les accès activés).
- **Règles Firestore** : `machines` écrit par les admins ou Modifier / Admin sur Projets — **à republier par Gabriel**.
- Galerie : Machines ORC avec un passeport en mémoire (`MachinesDemoCtx`).
- Maquette `maquettes-design/v393-rai-photos.html` (RAI d'après le modèle Excel, plan d'actions, validation par service, photos aux étapes clés, idées) en attente.
- Fichiers : src/passport.js, src/passport.test.js, src/components/MachinePassport.js, src/components/ManagerPanel.js, src/useAppData.js, src/appDocs.js, src/demo/demoPages.js, firestore.rules.

## V394 — Rapport d'acceptation interne (RAI)

Demandé : « après les tests on aura une RAI à rajouter avec le modèle suivant » (modèle Excel PJXXX-74X-RA001) puis « Oui, le RAI » ; maquette `maquettes-design/v393-rai-photos.html`.

- `src/rai.js` (testé, rai.test.js) : `RAI_SECTIONS` (composants reliés aux éléments du passeport, documentation, dossier qualité, inspection visuelle), `RAI_SIGNERS` (service + fonction, jamais de nom dans le code), `RAI_POLES`, `raiSection`, `raiVerdict` (non acceptée / avec réserves / acceptée), `compSn` (S/N du passeport d'abord), `setRow`, `addAction` / `setAction` / `delAction`, `sign`, `raiHtml` (PDF imprimable, valeurs échappées).
- Données : `planning/machines.rai[PJ] = { rows, actions, signs, config, ref, created }` (`saveRai` de `useMachines`).
- `components/RaiView.js` : sections à gauche (avancement, NOK, actions bloquantes, signatures), verdict en tête, informations (planning + passeport ; configuration du produit et référence saisissables), tableaux OK / NOK / S.O. avec S/N, emplacement réseau ou commentaire, « ＋ action » sur un NOK, plan d'actions (bloquant, pôle, valider / rouvrir, NC ClickUp, suppression confirmée), validation (signer depuis son compte : nom + date, remarque, retirer), « Exporter le RAI (PDF) ».
- Passeport (MachinePassport.js) : phase RAI entre Tests et MES (contrôles + signatures), vue « RAI » ; un S/N saisi dans le RAI est écrit dans le passeport par un admin (phase fabrication, source « RAI »), sinon gardé dans le RAI.
- **Règles Firestore** : `machines` — mise à jour du seul champ `rai` par tout compte ENOGIA — **à republier par Gabriel** (avec la règle V393).
- Photos : pas encore (choix du stockage à faire : Firebase Storage conseillé).
- Fichiers : src/rai.js, src/rai.test.js, src/components/RaiView.js, src/components/MachinePassport.js, src/useAppData.js, src/demo/demoPages.js, firestore.rules.

## V395 — Photos des machines (Firebase Storage)

Demandé : « il y a bien sûr plein de photos à prendre : intégrer des photos aux étapes clés » puis « Oui, Storage ».

- `src/photos.js` (testé, photos.test.js) : `PHOTO_STEPS` (étapes et photos attendues), `photoProgress`, `photosOfShot`, `freePhotos`, `safeImgUrl` (seules les adresses Firebase Storage entrent dans un document HTML), `shrinkImage` (JPEG 1 600 px / vignette 360 px dans le navigateur).
- Fichiers : Firebase Storage `machines/<beta_><PJ>/<id>.jpg` et `<id>_t.jpg` ; liste `planning/machines.photos[PJ]` (ajout / retrait atomiques `arrayUnion` / `arrayRemove`) — `uploadPhoto` / `deletePhoto` de `useMachines` (module `firebase/storage` chargé à la demande ; `app` exporté par firebase.js).
- `components/PhotosView.js` : onglet « Photos » du passeport — étapes à gauche (attendues prises), cases « ＋ Prendre la photo » (appareil photo de la tablette, `capture=environment`, plusieurs à la fois), photos libres, agrandissement (ouvrir l'original, supprimer avec confirmation : auteur ou admin).
- RAI : section « Photos » dans le PDF (`raiHtml({ photos })`, vignettes par étape, légendes échappées).
- **À faire par Gabriel** : activer Storage dans la console Firebase (projet enogia-planning, emplacement europe-west1), puis publier `storage.rules` (`firebase deploy --only storage`) et `firestore.rules` (champ `photos` du document machines écrit par tout compte ENOGIA, avec `rai`).
- `storage.rules` : comptes @enogia.com vérifiés ; dossier `machines/` ; JPEG < 4 Mo ; `firebase.json` : entrée `storage`.
- Galerie : photos en mémoire (adresses locales), aucun envoi.
- Fichiers : src/photos.js, src/photos.test.js, src/components/PhotosView.js, src/components/MachinePassport.js, src/components/RaiView.js, src/rai.js, src/useAppData.js, src/firebase.js, src/demo/demoPages.js, storage.rules, firestore.rules, firebase.json.

## V396 — Retour du kit achats (Achats-kit (7).jsx)

Demandé : « avant de continuer sur cette partie, intègre le nouveau kit achats ».

- `npm run import:achats` (kit parti de la page actuelle : import direct) — `Achats.js` 1 512 → 1 660 lignes.
- Fiches machine (`projets`) : `machine` = n° de machine choisi dans l'ordo (liste des machines du projet, une fiche par machine) ; plus de repli sur le n° de projet ; machine absente de l'ordo = erreur affichée, fiche conservée ; `familleOrc` des articles ORC (180LT, 180MT…) : seuls les modèles de la famille de la machine sont proposés.
- Vue « Par scope » (lecture seule, scopes N2 masquables, `enogia_achats_scn2`) ; `enogia_achats_vue` accepte « scopes ».
- Lignes : `livreSansPo` / `livreSansPoLe` (« Marquer livré sans PO », propriétaire de la page ; verrouille la ligne, affecter un PO l'efface) ; `params.scopeFournisseurs` (fournisseur par défaut d'un scope : LT et rétro-planning avant le choix de l'article) ; « Retirer le choix » d'une option (redevient à définir).
- Même document `planning/achats` : règles Firestore inchangées. Kit régénéré (`npm run kit:achats`).
- Fichiers : src/components/Achats.js.

## V397 — Passeport : liens Turbines et Achats (lots 2 et 3)

Demandé : « on peut reprendre le passeport et RAI ? ».

- passport.js (testé) : `SCOPE_OF` = scope Achats par défaut des éléments achetés (liste de départ des scopes d'Achats) ; élément « Turbines montées (n°) » ; `achatScopes(achatsDoc, pj)` (lignes de la fiche machine dont `machine` = PJ, par scope, statut d'après le PO — livré sans PO compris —, retards, n° de PO) ; `turbLive(turbineOf…)` (n° des turbines allouées / installées, roue, injecteur, bouchages) ; `liveRows` (réel saisi à la main d'abord, sinon réel « vivant » ; état d'achat par scope) ; `phaseProgress(…, live)` (un élément acheté dont toutes les lignes du scope sont livrées compte pour l'appro).
- MachinePassport.js : `MachinesHub` lit `planning/prodTurbines` et `planning/achats` (lecture seule, seulement sur la vue Passport) ; `turbineOf` (pjDossier) avec le calcul chargé à la demande (`useProdModel`) ; `AchatChip` sous le réel ; le RAI reçoit les réels vivants.
- rai.js : composant « Turbine » relié à l'élément `turbines`.
- Rien n'est écrit dans Turbines ni dans Achats ; les pages et les kits restent inchangés.
- Galerie : une fiche d'achats fictive (PJ902) et une turbine allouée au PJ901.
- Fichiers : src/passport.js, src/passport.test.js, src/rai.js, src/components/MachinePassport.js, src/demo/demoPages.js.

## V398 — Le RAI, feu vert du départ

Demandé : « Oui, feu vert » (idée 1 de la maquette v393-rai-photos).

- `src/raiStatus.js` (testé, raiStatus.test.js) : `setRaiDoc` / `useRai` (état partagé, App y dépose `planning/machines`), `raiGate(pj, départ, état)` → k ok / reserve / no / none, libellé, jours avant le départ, `alert` (départ dans ≤ 14 jours, `RAI_SOON`, sans RAI accepté ni avec réserves).
- App : `useMachines` lit le passeport ; `setEtatFor` → « Expédiée » sans RAI accepté (ou avec réserves) = `askConfirm` (« Expédiée quand même »).
- Liste (TableView) : `RaiMark` après la date de départ ; `TableView` = enveloppe qui se redessine avec `useRai`.
- Fiche d'un PJ (RowDetail) : ligne RAI sous les dates (hors expédiées).
- Accueil (RoleHome) : widget `raiDue` « RAI avant départ » (21 jours, triés par départ) ; ajouté aux accueils `cdp` et `direction` par défaut.
- Galerie : RAI fictifs (PJ902 avec réserves, PJ901 en cours).
- Fichiers : src/raiStatus.js, src/raiStatus.test.js, src/App.js, src/components/TableView.js, src/components/RowDetail.js, src/components/RoleHome.js, src/demo/demoPages.js.

## V399 — Passeport allégé (piste A)

Demandé : « la page passeport est beaucoup trop lourde et pas assez design pour l'utilisation (reprendre les 3 skills principaux) » ; maquette `maquettes-design/v399-passeport-allege.html` (constats : 2 395 px, 51 lignes ouvertes, 70 textes gris « renseigné en … », 7 cartes de phases, 3 niveaux de navigation), piste **A** choisie : « A, à traiter ».

- passport.js (testé) : `rowIssue` (rouge : réel ≠ prévu, non conforme, achat en retard ; ambre : design à définir — sauf élément facultatif `opt`, ex. « Autres modifications à faire » —, à commander) et `rowState` (livré, commandé, turbines allouées, conforme).
- MachinePassport.js : `Passport` réécrit — titre 28 px + identité sur une ligne + onglets (Passeport · RAI · Photos · Historique) ; fil des phases sur une ligne (cercles reliés, phase en cours, clic sur RAI = onglet RAI ; plus de filtre par phase) ; bloc « À traiter » (rouges d'abord) ; groupes repliés (avancement, nombre d'alertes, `enogia-cl-in`) ; `PassRow` en grille sur une ligne de 44 px (élément · prévu + « écart » · réel · état), valeur absente = « — », source et phase au survol ; export CSV en pied ; liste des machines : plaque, point rouge, phase en cours ; filtre En cours / Expédiées (la recherche couvre tout). Page de démonstration : 2 395 → ~1 090 px.
- Fichiers : src/passport.js, src/passport.test.js, src/components/MachinePassport.js.

## V400 — Achats / Appro : transport, livré sans PO, options retirées

Demandé (retours du responsable achats) : « remettre le warning Options à préciser quand une option est retirée » ; « déclarer une ligne livrée sans PO : c'est pour mon rôle dans le Cockpit » ; « pour les fournisseurs avec un LT transport, ajouter le transport à la PO (ex. date de livraison Odoo 29/01 + 5 jours ouvrés) ; idem pour le théorique, en jours ouvrés ».

- Achats.js : `addWorkDays` (exporté) ; `lineState` — `prevue` d'une PO = `dateLivraison` + `ltTransportJ` jours ouvrés (`prevueFour` = date chez le fournisseur), `auPlusTard` = cible − transport (jours ouvrés) − LT fournisseur ; libellés « jours ouvrés » (fiche fournisseur, rétro-planning) ; prop `admin` → `regulOk` (« Marquer livré sans PO » : propriétaire ou admin de la page) ; `planOf(…, retires)` + `config.retires` (choix retirés, facultatifs compris, « à préciser » jusqu'à un nouveau choix) dans `aPreciser`, la configuration et `appliquerConfig`.
- App : `admin` = Admin sur Achats (accès par rôle), sinon la liste d'accès de la page (responsable achats).
- Tests : achats.test.js (rétro-planning en jours ouvrés, livraison prévue d'une PO avec transport).
- Kit : consignes (signature `admin`, jours ouvrés, `config.retires`), aperçu avec `admin` ; kit régénéré.
- Fichiers : src/components/Achats.js, src/App.js, src/achats.test.js, scripts/achats-consignes.md, scripts/achats-kit.js.

## V401 — Passeport : Tests, MES / SAV, RAI dans la fiche de tests, dossier machine

Demandé : « reprendre le passeport et toutes les étapes liées » — choix : « utilisation des bons skills design pour rendre le passeport léger et facile », « Tests → passeport », « MES et SAV → passeport », « Dossier machine PDF ».

- `src/passportLive.js` (testé) : `testsLive(testsDoc, pj)` (livret ok / problèmes, checklist de debug, fréquences par vitesse, vibrations, tests FAT interne ; `bad` = à traiter) et `savLive(savDoc, pj)` (interventions réalisées / validées : mise en service, dernière intervention, `changes` = pièces changées → réel de l'élément, la plus récente l'emporte ; tickets ouverts).
- passport.js : groupes « Tests » et « MES et SAV » (éléments facultatifs, ajoutés aussi à une liste d'éléments enregistrée) ; `liveRows` — une pièce changée par le SAV après la saisie à la main l'emporte ; `rowIssue` reprend les `bad` ; `rowState` affiche la source d'un réel vivant.
- MachinePassport.js : lit aussi `planning/tests` et `planning/sav` (lecture seule) ; « À traiter » regroupé (`todoGroups` : un achat par scope, le design à compléter en une ligne, chaque ligne se déplie) ; pied de chaque groupe = sources (`groupSource`) ; bouton « Dossier machine (PDF) ».
- `src/dossierMachine.js` (testé) : `dossierHtml` — couverture, identité, configuration prévu / réel / source par sous-ensemble, RAI (verdict, plan d'actions, signatures), photos par étape ; valeurs échappées, images `safeImgUrl`.
- SavPage : section « Pièces changées (passeport) » de l'intervention (`PassChanges` : élément du passeport, nouvelle pièce, note) → `inters[id].changes` (même document `planning/sav`).
- TestsTab : étape 7 « RAI » de la fiche de tests (`RaiView`, même `planning/machines.rai`).
- `src/machinesCtx.js` : `MachinesDemoCtx` (galerie : passeport, RAI, tests et SAV en mémoire pour toutes les pages).
- Fichiers : src/passportLive.js, src/passportLive.test.js, src/dossierMachine.js, src/machinesCtx.js, src/passport.js, src/components/MachinePassport.js, src/components/SavPage.js, src/components/TestsTab.js, src/demo/demoPages.js, src/demo/DemoGallery.js.

## V402 — Passeport : page protégée, panneau de modification, lecture seule annoncée

Demandé : « quand je clique sur la page il ne se passe rien, tout est buggué (page passeport) ; aller plus loin dans le design, l'accessibilité et l'utilisation ».

- MachinePassport.js : `Passport` dans `PageGuard` (erreur limitée au passeport de la machine, « Réessayer ») ; calculs vivants protégés (`safe` autour de `turbineOf`, `turbLive`, `testsLive`, `savLive`, `achatScopes` : une source en erreur est ignorée avec un avertissement en console).
- `PassRow` : valeurs prévue / réelle = vrais boutons (`.enogia-pp-cell`, ≥ 36 px, 44 px au doigt, crayon au survol / focus, `aria-expanded`, nom accessible complet) ; plus de boutons désactivés en silence : en lecture seule, `notify` explique pourquoi ; pastille « Lecture seule » dans l'en-tête.
- `EditPanel` (remplace `EditBox`) : panneau pleine largeur sous la ligne, libellés visibles (valeur, phase, source), propositions (`datalist`), « Revenir au standard » / « Effacer », Entrée = enregistrer, Échap = annuler, focus rendu à la cellule ; le panneau reste ouvert si l'enregistrement échoue.
- styles.css : `.enogia-pp-cell` (survol, focus visible, doigt).
- Rappel : les règles Firestore V393–V395 (document `machines`) doivent être publiées, sinon l'enregistrement échoue sur le site.
- Fichiers : src/components/MachinePassport.js, src/styles.css.

## V403 — Passeport : les clics marchent de nouveau

Demandé : « la page bug toujours, aucun clic ne marche » (passeport, en bêta).

- Cause (constatée sur la bêta, `elementFromPoint`) : `a11yFallback` élargit la zone de clic des petits boutons (`data-hit` + `::after` en position absolue). Les boutons du fil des phases du passeport sont en `all: unset` : la position en ligne (`unset`) l'emporte sur `[data-hit] { position: relative }`, la pseudo-zone se calait sur un parent lointain et le dernier bouton (« SAV ») recouvrait toute la fiche.
- Correction : src/a11yFallback.js — pas de zone élargie sur un bouton dont le style en ligne donne une position autre que relative / absolute / fixed / sticky (test v403 dans src/a11yFallback.test.js). Seuls les 7 boutons des phases du passeport étaient touchés sur la bêta.
- Fichiers : src/a11yFallback.js, src/a11yFallback.test.js.

## V404 — Passeport complet, fiche de lancement de fab, réglages du passeport

Maquette `maquettes-design/v407-passeport-complet.html` validée (« Go, code-la ») ; demandé ensuite : « gardons au max l'effet passeport : au défilement, la page ne fait que défiler vers le bas ».

- `src/launchFab.js` (testé) : catalogue des composants (`DEFAULT_COMPONENTS`, `componentsOf`, sortes « choix » / « achat » / « option » avec « Non requis »), choix électriques (`ELEC_DEFAULT`, `elecListsOf`), dimensions par gamme (`dimsOf`), fiche `launch[PJ]` (`setLaunch`, `plugsOf` / `plugCount` sur 8 trous, `signLaunch` / `launchState` : 4 rôles, lancée quand tous ont signé), `offRef` (écart à la référence = avertissement seulement), `piecesArrived` (part des lignes livrées dans Achats / Appro, « Prêt à lancer » dès 90 %), `achatOfComp`, `phaseOfEtat`, `launchHtml` (PDF, valeurs échappées).
- `src/components/PassportFull.js` : passeport complet sur une page verticale (fil des phases collé à gauche, suit la lecture, emmène au clic ; « À traiter » en tête : commandes en retard ou à commander, tests en échec, tickets, RAI bloquant) ; valeurs modifiables sur place (choix à toucher, Entrée / Échap) ; fiche de lancement de fab repliable dans la phase Fabrication ; RAI, photos et historique dans le même défilement.
- `src/components/PassportSettings.js` : Réglages du passeport (composants en cartes + volet, référence turbine, dimensions et poids, choix électriques, import du tableau de configuration).
- MachinePassport.js : `MachinesHub` (Passeport · S/N et états · Réglages du passeport ; ancien `enogia_mach_sub` = `std` relu), liste des machines (point rouge = achat en retard, phase d'après l'état) ; ancien passeport ligne à ligne retiré.
- Droits : la fiche de lancement de fab et les valeurs du passeport sont remplies par le CdP du PJ (chef de projet ou chef ORC) et les admins ; les signatures par tout compte. **Règle Firestore** : champ `launch` du document `machines` écrit par tout compte ENOGIA (avec `rai` et `photos`) — **à republier par Gabriel**.
- Données : `planning/machines.launch`, `.components`, `.dims`, `.elecLists` (les dimensions et choix électriques sont à remplir une fois dans les Réglages du passeport).
- Fichiers : src/launchFab.js, src/launchFab.test.js, src/components/PassportFull.js, src/components/PassportSettings.js, src/components/MachinePassport.js, src/components/ManagerPanel.js, src/useAppData.js, src/demo/demoPages.js, src/styles.css, firestore.rules.

## V405 — SAV / MES › Compétences

Demandé : « je souhaite que tu rajoutes ces compétences SAV dans l'onglet SAV / MES » (page `competences-sav.html` fournie, faite comme artefact Claude).

- `public/competences-sav.html` : la page reprise telle quelle (doctype et encodage ajoutés) + un petit pont : `window.claude.use("db" | "user")` est fourni par la page parente.
- `src/savSkills.js` (testé) : `makeSkillsBridge` traduit les chemins de la page (`people/…`, `assess/…`, `objectives/…`, `snapshots/…`, `categories/…`, `view/<adresse>`, `selfeval/<adresse>`) vers trois sortes de documents Firestore — `planning/savSkills` (équipe, évaluations, objectifs, trimestres figés), `planning/savSkillsCat` (référentiel), `planning/savSkillsMe_<adresse>` (fiche visible par la personne + son auto-évaluation) ; `memoryBackend` pour la galerie et les tests ; compte = adresse ENOGIA, recherche d'un compte dans les profils.
- `src/components/SavSkills.js` : le cadre (clair / sombre transmis à la page), chargé à la demande ; SavPage : sous-page « Compétences » (`competences`) ; App : visible par l'équipe SAV (Modifier / Admin sur SAV) et le propriétaire ; gestion de toute l'équipe = Admin sur SAV ou propriétaire.
- **Données reprises** : rien n'est importé de l'artefact d'origine (sa base reste sur claude.ai) : équipe et référentiel à ressaisir, ou à importer plus tard.
- **Règles Firestore** (à republier par Gabriel) : `savSkills` et toutes les fiches `savSkillsMe_*` exclues de la lecture générale ; lecture / écriture par le propriétaire ou Admin sur SAV ; chacun lit `savSkillsMe_<son adresse>` et n'y écrit que `selfeval`. Avant l'activation des nouveaux accès, seul le propriétaire gère l'équipe.
- Fichiers : public/competences-sav.html, src/savSkills.js, src/savSkills.test.js, src/components/SavSkills.js, src/components/SavPage.js, src/App.js, src/demo/demoPages.js, firestore.rules.

## V406 — Passeport cliquable, Compétences SAV au format du site

Demandé : « le passeport a le même bug que tout à l'heure (rien ne fonctionne) et le système de compétences doit reprendre le même format que le site ».

- **Cause constatée sur la bêta** (`elementFromPoint`) : les boutons « Retirer » des pastilles (`.pp2-tags span button`, 22 px) recevaient la zone de clic élargie de `a11yFallback` (`data-hit` + `::after` absolu) alors que leur classe CSS (`all: unset`) annulait `position: relative` : la zone se calait sur un parent lointain et couvrait la page. La V403 ne regardait que le style en ligne.
- `src/a11yFallback.js` : pas de zone élargie si la **position calculée** du bouton reste `static` (classe CSS comprise) ; sonde `hitRuleOn` (la règle `[data-hit]` de styles.css est-elle chargée ?) pour que le contrôle ne joue pas dans les tests. styles.css : `position: relative` sur `.pp2-lhead`, `.pp2-x`, `.pp2-link`, `.pp2-tags span button`.
- Compétences SAV : `public/competences-sav.html` — polices du site (Cabinet Grotesk, Satoshi, JetBrains Mono via Fontshare / Google Fonts à la place de Barlow / IBM Plex), bloc `#cockpit-format` (casse normale, tailles 13–22 px, rayons 4 / 8 / 12, onglet actif et bouton principal en encre) ; `SavSkills.js` pose les couleurs du thème du site (`T.surface`, `T.card`, `T.ink900`, `T.accentInk`…) sur `<html>` du cadre, en clair et en sombre.
- Fichiers : src/a11yFallback.js, src/styles.css, public/competences-sav.html, src/components/SavSkills.js.

## V407 — Sous-pages d'Achats / Appro et de SAV / MES dans le menu

Demandé : « mettre bien les sous-pages dans le panel à gauche pour les achats et pour les SAV / MES (rajouter compétences) ».

- App.js : entrée **Achats / Appro** avec ses sous-pages (Projets, Synthèse Appro, PO, Fournisseurs, Articles, Nomenclatures, Configuration, Réglages — Réglages pour ceux qui modifient la page ou le propriétaire), état `achTab` (même clé `enogia_achats_tab` que la page), sous-page dans l'adresse (`&s=`) ; **SAV / MES** : sous-page Compétences ajoutée au menu.
- Achats.js (page du kit) : props facultatives `tab` / `onTab` (onglet piloté par le menu ; sans elles, la page garde son propre onglet). Consignes du kit mises à jour, **kit achats régénéré** (`kit-achats/`, à renvoyer au responsable achats).
- Fichiers : src/App.js, src/components/Achats.js, scripts/achats-consignes.md.

## V408 — Passeport machine en livre

Maquette `maquettes-design/v410-passeport-pages.html` validée (« Go, code-la » ; « c'est ça que je voulais : le défilement de gauche à droite »).

- `src/components/PassportBook.js` : couverture (identité, phase, départ, pièces arrivées, à traiter avec liens vers la page) puis une page par phase (Arrivée, Design, Appro / Achats, Fiche de lancement de fab, Fabrication et turbine, Tests, RAI, Départ, MES et SAV, Historique). **Tourner les pages** : position continue en pages, la page qui part pivote sur sa reliure (`rotateY`), la suivante arrive de droite ; glisser au doigt / à la souris (suivi 1:1 au-delà de 8 px horizontaux, le défilement vertical d'une page reste libre, élan projeté, une page par geste, résistance aux deux bouts, ressort amorti sans rebond), pavé tactile (deltaX), ‹ ›, ← →, puces ; pages cachées `inert` ; « réduire les animations » = changement net.
- Lignes groupées (`Row`) et **feuille par le bas** (`Sheet`, `aria-modal`, tirée vers le bas pour fermer) pour les valeurs du CdP (design, électrique, roue, injecteur, composants, version software).
- **Feuillets** (`Insert`) : fiche de lancement de fab par rubrique (`LaunchSheet only=…`, PassportFull.js) et RAI (`RaiView` + `PhotosView`). **RAI pré-rempli** : `raiPrefill` (launchFab.js) — référence · n° de PO d'Achats (par le scope des lignes du passeport), choix du CdP dans la fiche de lancement de fab, roue / injecteur ; puis Turbines, tests, SAV ; ce qui est saisi à la main l'emporte.
- MachinePassport.js : la vue Passeport affiche `PassportBook`. styles.css : bloc `.pb-*` (tous les boutons `all: unset` gardent `position: relative`).
- Fichiers : src/components/PassportBook.js, src/components/PassportFull.js, src/components/MachinePassport.js, src/launchFab.js, src/styles.css.

## V409 — Passeport en livre : flèches à portée, pages pleines

Retour bêta : « les flèches en haut sont trop loin, l'info au centre est perdue dans le vide ».

- PassportBook.js : flèches ‹ › et « n / N » groupées à côté du n° de PJ (`.pb-navg`), « Dossier machine (PDF) » en bouton secondaire à droite ; grandes flèches au bord de la page (`.pb-edge`, 64 px, au-delà de 1 000 px de large) ; page Fiche de lancement de fab = 8 cartes de rubrique (avancement + valeur clé ; un appui ouvre la rubrique) ; page RAI = cartes des sections (avancement).
- styles.css : contenu des pages jusqu'à 1 120 px, listes groupées sur deux colonnes (`minmax(380px, 1fr)`, une colonne sous 1 000 px).
- MachinePassport.js : le passeport ne déborde plus de sa colonne (bouton Dossier coupé à droite).
- Fichiers : src/components/PassportBook.js, src/components/MachinePassport.js, src/styles.css.

## V410 — Passeport premium, documents en pop-up, Machines ORC sans chargement

Demandé : « encore trop vide sur les côtés, retravailler le positionnement pour faire moins vide et plus premium ; quand j'ouvre un doc comme la fiche de lancement de fab, ça doit m'ouvrir sur la première page et je dois voir que c'est un pop-up ; quand j'arrive sur Machines ORC, je dois arriver en haut de la page sans chargement ».

- PassportBook.js : pages en deux colonnes — à gauche (`.pb-aside`, collée) grand n° de page, titre, état, avancement de la page (`STAT` : informations connues, points renseignés, lignes livrées, rubriques complètes, turbine et composants, étapes des tests, contrôles du RAI) ; à droite le contenu ; couverture en grand (titre jusqu'à 96 px, 4 chiffres). `Insert` = **pop-up** rendu dans `<body>` (fond voilé, fenêtre centrée 1 180 × 880 px, rayon 20, ×, Échap, clic à côté), rubriques numérotées « 1 / 8 », rubrique précédente / suivante et « Terminer » en bas ; « Ouvrir la fiche de lancement de fab » ouvre toujours la rubrique 1.
- useAppData.js : `useMachines` garde la dernière lecture (`MACH_CACHE`) — App lit déjà le document au démarrage, Machines ORC s'affiche sans « Chargement du passeport ».
- App.js : retour en haut de la page à chaque changement de page ou de sous-page du Manager ; Manager préchargé avec les autres pages lourdes.
- styles.css : `.pb-pin` en grille 290 px + contenu, listes sur deux colonnes dès 300 px, styles du pop-up (`.pb-pop*`, police du site transmise par `--pp-font`).
- Fichiers : src/components/PassportBook.js, src/useAppData.js, src/App.js, src/styles.css.

## V411 — Compétences SAV : l'enregistrement fonctionne

Signalé : « Enregistrement impossible : Function updateDoc() called with invalid data. Unsupported field value: a custom Object object (found in field people.p-… in document planning/savSkills) ».

- Cause : la page Compétences tourne dans un cadre (`public/competences-sav.html`) ; ses objets viennent d'une autre fenêtre JavaScript, leur prototype n'est pas `Object.prototype` de la page du Cockpit, et Firestore les refuse.
- `src/savSkills.js` : `plain` (recopie par JSON) avant chaque écriture du pont (`doc(…).set`) ; test v411 (`savSkills.test.js`).
- Fichiers : src/savSkills.js, src/savSkills.test.js.

## V412 — Compétences SAV : une vraie page du Cockpit

Demandé : « je veux que ça fonctionne comme les autres cadres et pages du Cockpit ».

- `src/savSkillsModel.js` (testé) : calculs repris de la page d'origine (niveau d'une catégorie d'après les compétences du manager, trimestres, objectifs par pas de 0,5, pré-remplissage depuis un score importé, trimestre figé, fiche miroir de la personne, écarts auto / manager).
- `src/useSavSkills.js` : lecture temps réel des mêmes documents que la V405 (`planning/savSkills`, `savSkillsCat`, `savSkillsMe_<adresse>`), écritures champ par champ (`updateDoc` + `FieldPath`, valeurs recopiées par JSON), base en mémoire pour la galerie.
- `src/components/SavSkillsPage.js` : vues Équipe · Fiche · Référentiel (`Segmented`, `btn`, `Pill`, `tableTh` / `tableTd`, `askConfirm`, `notify`), radars et courbes en SVG, pastilles 44 × 36 px avec `aria-label` ; fiche de la personne recalculée et réécrite seulement si elle change ; vue mémorisée `enogia_skills_view`.
- Retirés : `public/competences-sav.html`, `src/components/SavSkills.js`, `src/savSkills.js` (+ test). Règles Firestore inchangées (V405, toujours à publier).
- Fichiers : src/savSkillsModel.js (+ test), src/useSavSkills.js, src/components/SavSkillsPage.js, src/components/SavPage.js, src/styles.css.

## V413 — Suppressions par les admins, transports ClickUp, machines d'avant l'ordo

Demandé : « donner la possibilité aux admins de supprimer des éléments dans leurs pages (demandes des CdP pour intervention, création d'un PO dans les achats) » ; « intégrer dans les home pages l'avancement des demandes de transport ClickUp, et cliquer pour aller sur ClickUp » ; « des machines sont sorties avant l'ordo : les mettre dans le passeport sans infos d'ordo ni de tests, d'après les machines du SAV ».

- **SAV / MES** (`SavPage.js`) : admins de la page (`level` a) — corbeille sur chaque demande des chefs de projet (`onDelete`, `askConfirm`, `demApi.del`), « Supprimer du parc » dans la fiche du parc (`api.del("parc")`). Tickets et interventions l'étaient déjà.
- **Achats / Appro** (`Achats.js`) : admins de la page (`regulOk`) — `FormDialog delOk` (suppression même en lecture seule) ; ligne de PO Odoo supprimée et ajoutée à `params.poIgnores[id]` ; fiche machine verrouillée ou avec des PO attribués, ligne avec sous-lignes commandées. `functions/convert.js` : `plan` ignore `params.poIgnores` (test v413).
- **ClickUp** : `functions/clickup.js` (testé : `buildTransports`, `pjOf` ; liste SCCM › Logistique `38157935` ; demandes ouvertes + closes depuis 60 jours ; ni e-mail, ni téléphone, ni prix recopiés) et fonction `clickupTransports` (toutes les 15 min) → `planning/transports` et `planning/beta_transports` ; secret `CLICKUP_TOKEN`. Site : `src/transports.js` (testé : `transportList`, `stepOf`), `useTransports` (useAppData.js, `TRANSPORTS_DOC_REF`), cadran `transports` de `RoleHome` (chef de projet, direction, autres par défaut ; thème « Logistique — ClickUp »), liens `target=_blank`. Lecture ouverte à tout compte ENOGIA (règle générale), écriture par le serveur seul.
- **Passeport** : `src/legacyMachines.js` (testé : `legacyRows`) — machines de `planning/sav.parc` absentes du planning ; `MachinePassport.js` choix « Avant l'ordo » ; `PassportBook.js` `LEGACY_PAGES` (couverture, identité depuis le parc, design, turbine et composants, MES et SAV, historique).
- **À faire par Gabriel** : créer un jeton personnel ClickUp (Paramètres › Apps › API Token) puis `firebase functions:secrets:set CLICKUP_TOKEN` et `firebase deploy --only functions` (déploie aussi le filtre `poIgnores` de la synchro Odoo).
- Fichiers : src/components/SavPage.js, src/components/Achats.js, functions/convert.js, functions/clickup.js, functions/index.js, functions/package.json, functions/test/*, src/transports.js (+ test), src/useAppData.js, src/appDocs.js, src/components/RoleHome.js, src/components/HomeView.js, src/App.js, src/legacyMachines.js (+ test), src/components/MachinePassport.js, src/components/PassportBook.js, src/demo/demoPages.js.

## V414 — Demandes de transport en suivi colis (ClickUp LOGISTIQUE V2)

Demandé : lien de la liste « https://app.clickup.com/2618431/v/li/901524181433 », maquette avant déploiement (`maquettes-design/v414-transports-clickup.html`), choix « C, parcel tracking ».

- `functions/clickup.js` : liste SCCM › LOGISTIQUE V2 (`901524181433`), champs Projet(s) / Stock, Type de demande (Urgent), dates d'enlèvement et de livraison souhaitées / prévues / réelles, Transporteur, Nombre de colis, Demandeur ; trajet lu dans le nom (`routeOf` : « PJ | origine > destination | N colis ») ; terminé = colis livré ou clôture doc frn (`isDone`) ; jamais d'adresse, de contact, de valeur, de prix ni de détail douanier (test v414).
- `src/transports.js` : `TRACK`, `trackOf` (point 0–4, `bad` = infos demandées), `whenOf`, `pickupOf` / `deliveryOf`, tri : infos demandées, urgent, date d'enlèvement (test v414).
- `RoleHome.js` : `TrackSteps`, `TransportTrack`, `TransportCounts` (niveau du fichier) ; cadran `transports` tailles m / xl / l / s.
- **À faire par Gabriel** : jeton ClickUp (`firebase functions:secrets:set CLICKUP_TOKEN`), puis `firebase deploy --only functions` (Cloud Scheduler à accepter au premier déploiement).
- Fichiers : functions/clickup.js, functions/index.js, functions/test/clickup.test.js, src/transports.js (+ test), src/components/RoleHome.js, src/demo/demoPages.js.

## V415 — Passeport : choix rangés par grandeur, plus de référence turbine par gamme

Demandé : « classer par grandeur ou par alphabet les éléments » (capture : Tension 400 V, 415 V, 480 V, 690 V, 440 V) ; « il n'y a pas de standard par gamme de machine pour les turbines ».

- `src/launchFab.js` : `sortOpts` (tri naturel `localeCompare` numérique, doublons retirés) ; `elecListsOf` renvoie les listes triées.
- `PassportSettings.js` : `Tags` range à l'ajout et à l'affichage ; résumé et suggestions des composants triés ; section « Turbine : référence par gamme » et `setStd` retirés.
- `PassportBook.js` (volet de choix), `PassportFull.js` (`Choice` de la fiche de lancement de fab) : choix triés.
- `src/passport.js` : `TURB_STD_OFF` (éléments Turbines + turbine) — `stdOf` ne renvoie plus de référence turbine : plus d'avertissement « ≠ référence » sur roue / injecteur / bouchages, ni de « prévu » tiré d'un standard (données `standards` existantes gardées, non lues). Test v415 (launchFab.test.js).
- Fichiers : src/launchFab.js, src/passport.js, src/components/PassportSettings.js, src/components/PassportBook.js, src/components/PassportFull.js, src/launchFab.test.js.

## V416 — Demandes de transport : camion, avion ou bateau, infos d'envoi et détail au clic

Maquette `maquettes-design/v416-transports-plus.html` (« Go, code it »).

- `functions/clickup.js` : `modeOf` (liste « Mode de transport » si elle existe dans ClickUp, sinon déduit du nom, de la description et du commentaire : maritime / navire / conteneur / port / booking → bateau ; avion / aérien → avion ; sinon camion, `modeEst`) — le texte n'est pas recopié ; champs Export hors EU, Incoterm, Conditionnement, Poids total, Matière dangereuse, Code UN (`un`, libellé court). Test v416.
- `src/transports.js` : `MODE_LABEL`, `vehicleOf`, `gapOf` (dépassé de N j, +N j / −N j sur le souhaité), `metaOf`, `weightTxt`, `summaryOf`. Test v416.
- Icônes `truck`, `plane`, `boat` (Phosphor Truck, AirplaneTilt, Boat ; `node scripts/gen-icons.js`).
- `RoleHome.js` : `TrackSteps` (véhicule, pointillé vers « Livré » en route), `TransportTrack` (ligne d'infos, étiquettes, détail repliable, « Ouvrir dans ClickUp », fiche du PJ), `TransportSummary` ; styles.css `.enogia-veh-go` (300 ms, coupé si réduire les animations).
- **À faire** : ajouter une liste « Mode de transport » (Route / Aérien / Maritime / Express) au formulaire ClickUp LOGISTIQUE V2 pour un mode exact ; redéployer les fonctions (`firebase deploy --only functions`).
- Fichiers : functions/clickup.js, functions/test/clickup.test.js, scripts/gen-icons.js, src/iconPaths.js, src/transports.js (+ test), src/components/RoleHome.js, src/styles.css, src/demo/demoPages.js.

## V417 — Accueil chaque matin, « Ma vue », transports des PJ suivis, chiffres SAV allégés

Demandé : « quand les gens se connectent chaque jour, ça doit ouvrir sur la homepage (changer le nom) et la sortir des Opérations » ; « créer une vue uniquement pour moi » ; « widget transport : uniquement les PJ de l'ordo ou du parc SAV » ; « ne mettre les chiffres que sur Tickets et Interventions ».

- `App.js` : vue de départ — première ouverture du jour (`enogia_open_day`, date locale) = accueil, sauf lien vers une fiche (`&pj=`) ; libellé « Accueil » (VIEWS, menu, palette Ctrl K) ; groupe sans titre en tête de `NAV_TREE` (`g: ""` : pas de bouton de rubrique, jamais replié) ; `access.js` : page `home` = « Accueil ».
- **« Ma vue »** : poste `moi` (propriétaire seul, jamais dans `ROLES`) — `HomeView` : `autoRole` du propriétaire = `moi`, puce « Ma vue » en tête de « Accueil de : » et dans la gestion des accueils ; `HOME_DEFAULTS.moi` (chiffres, transports, alertes, RAI, Cash in, départs du trimestre, à l'heure, tests, turbines, charge, mentions, départs) ; disposition `planning/profiles.homeLayouts.moi` (« Modifier l'accueil »).
- Transports : `HomeView` filtre `transports.items` sur les PJ du planning et de `planning/sav.parc` (`parcPjs`, App).
- `SavPage.js` : grille des chiffres seulement si `sub` = tickets ou inters.
- Galerie : accueils du propriétaire sur `homeLayouts.moi`.
- Fichiers : src/App.js, src/access.js, src/components/HomeView.js, src/components/RoleHome.js, src/components/SavPage.js, src/demo/demoPages.js.

## V418 — Accueil plus vivant : fil « En direct », la journée, visages et tuiles colorées

Maquette `maquettes-design/v419-accueil-vivant.html`, pistes A + C (« A + C »).

- `src/liveFeed.js` (testé) : `buildFeed` — statuts de tests (`plans[PJ].stBy`, libellés du catalogue), affectations de testeurs, commentaires (hors privés), publications du planning (`changeLog`, plus gros décalage de départ), demandes de transport (`updatedAt`) ; 7 derniers jours ; `whenTxt` (« 10:42 », « hier 16:05 », « 17 nov »). Rien n'est écrit.
- `RoleHome.js` : cadrans `direct` (« En direct », `LiveFeed` : un événement arrivé pendant qu'on regarde s'éclaire 300 ms, `.enogia-feed-new`), `journee` (« La journée » : 3 jours ouvrés), `equipe` (« Au banc et cette semaine », `Face` = initiales en couleur), `surveiller` (« À surveiller ») ; `Ring` (anneau) sur « Prochain départ » ; trois compteurs dans « Aujourd'hui » ; chef de projet : fil limité à ses PJ. Par défaut en tête de « Ma vue », de la direction et du chef de projet ; thème « En direct — la journée » dans la galerie de widgets.
- `HomeView.js` : `cardS` = teinte pâle de l'étape (`color-mix` 7 % dans le fond de carte, liseré gardé) ; passe `comments` et `changeLog` (App).
- `functions/clickup.js` : `updatedAt` (heure exacte de la dernière mise à jour) — fonctions à redéployer.
- Fichiers : src/liveFeed.js (+ test), src/components/RoleHome.js, src/components/HomeView.js, src/App.js, src/styles.css, functions/clickup.js.

## V419 — Achats / Appro : délai de commande et délai de transport séparés dans le Gantt

Demandé (responsable achats) : « dans la vue Gantt, distinguer le LT transport et le LT commande pour les PO concernées — la PO finie le 29/01, puis 5 jours ouvrés de transport ; voir le délai de commande et le délai de transport ; garder le vert et le rouge ».

- `Achats.js` `renderGantt` : `four` = fin de la PO chez le fournisseur (`lineState().prevueFour`, date Odoo / saisie) ; si commande, fin de PO et livraison prévue sont connues : barre pleine `cde → four` (« Commande ») puis barre hachurée `four → liv` (« Transport », `ltT` jours ouvrés), même couleur (vert / rouge / gris si livrée) ; étiquette sous la jonction « PO jj/mm · +N j transport » ; ligne de 54 px ; légende mise à jour. Sans fin de PO : barre unique comme avant. Partie théorique inchangée.
- Galerie « Achats / Appro » : fiche PJ902 avec un fournisseur à 5 j ouvrés de transport, une PO à temps et une en retard.
- Fichiers : src/components/Achats.js, src/demo/demoPages.js. **Kit achats à régénérer** (`npm run kit:achats`) avant le prochain échange avec le responsable achats.

## V420 — Retour en haut de la première sous-page, Cash par PJ et par mois, paiements mensuels, planificateur allégé et buffers

- **Navigation** (App.js) : l'entrée principale du menu ouvre la première sous-page (Planning = Liste ; Tests, Turbines, Achats, SAV, Finance = première sous-page) et tout clic du menu remonte en haut (`window.scrollTo`).
- **Cash in** (public/cashin.html, `CASHIN_PAGE_VERSION` 420) : matrice « Cash par PJ et par mois » — case `l` (rouge) si un jalon non reçu est en retard ; nom du projet (`labels`) dans le survol, le titre et le tableau des fenêtres (`popTable`, `.pjn`) ; colonne **Mensualités** (`r.mens`, `parts`, `addMonths`) : montant ÷ mens chaque mois à partir de l'encaissement prévu dans `monthly()` et `matrixItems()` ; pas d'alerte « encaissement dépassé » pour un jalon mensuel (suivi par la finance). La fiche du lundi compte encore le jalon en une fois.
- **PJ457** : jalon 4 = montant total du loyer (24 × 11 200 € = 268 800 €), encaissement prévu = premier mois après la MES, Mensualités = 24 ; jalon 5 à la date de fin des 2 ans — à saisir dans le Cash in.
- **Planificateur** (PlannerGantt.js) : ressource retirée (menu « Phase » seul pour une tâche ajoutée), ligne « ＋ tâche » de 16 px (`ADD_H`).
- **Packing** (GanttView.js, CalendarView.js) : segment Packaging jusqu'à `finProd`, puis « Attente du départ » hachurée jusqu'au départ.
- **Buffers** (engine.js, Planner.js, PlannerGantt.js) : `steps[k].buf` (production, tests) réglé par gamme dans Modèles par gamme (tous les PJ de la gamme), `plan.bufOn` (« Buffers pris en compte », Affichage) — pris en compte : durée + buffer, la charge atelier ne compte pas les jours de buffer (`workedDays`, `workEnd`) ; sinon hachuré en pointillé après la tâche. Test v420 (engine.test.js).
- Fichiers : src/App.js, public/cashin.html, src/cashinData.js, src/planner/PlannerGantt.js, src/planner/Planner.js, src/planner/engine.js (+ test), src/components/GanttView.js, src/components/CalendarView.js.

## V421 — Cash in : statut « payé » forcé (projets EPC)

Demandé : « dans le Cash in, pouvoir forcer le statut sur les projets EPC pour dire si ça a été payé, sans prendre en compte le montant ou la date ; le but est que le jalon ne remonte plus dans le widget Livrable produit ».

- `public/cashin.html` (`CASHIN_PAGE_VERSION` 421) : `r.payeForce` — case « payé » dans la cellule Statut (aussi sur les jalons EPC), pastille « Payé (forcé) » ; `status()` = paid ; exclu de `kpis`, `monthKeys`, `monthly` (mensualités), `matrixItems`.
- `src/cashinLink.js` `statusOf` (paid forcé), `src/cashinModel.js` (`toCollect`, `plannedUntil`, `punctual`, `monthKeys`, `matrixItems`), `src/cashWeekly.js` (`live`) : jalons forcés exclus ; `node scripts/sync-functions.js` (copie functions/shared) — **fonctions à redéployer** pour la fiche du lundi.
- `src/cashinData.js` `produitItems` : jalons forcés exclus — la copie `planning/cashinProduit` est republiée au prochain enregistrement du Cash in.
- Tests v421 (cashinData.test.js, cashinCollect.test.js).
- Fichiers : public/cashin.html, src/cashinData.js, src/cashinLink.js, src/cashinModel.js, src/cashWeekly.js, functions/shared/*.

## V422 — SAV / MES : non dispo et congés, règle des équipes, réservations fermées à T0 + X semaines

Demandé : « dans le calendrier Disponibilités, le responsable SAV / MES choisit des jours de non dispo et / ou de congés (enlever le jour off) ; non dispo = un jour travaillé mais pas sur une intervention » ; « 4 gars, 2 équipes de 2 : les 2 équipes prises = pas réservable ; 3 sur 4 en intervention = sous réserve d'acceptation ; au moins 1 équipe ou 3 gars dispo = réservable » ; « bloquer à T0 + X semaines la réservation des CdP ».

- `src/savModel.js` (testé) : `DISPO_KINDS` nondispo / conge (ancien « off » lu comme non dispo), `weekOff` n'est plus lu ; `slotDays(…, team)` : une intervention sans personne et une demande en attente prennent une équipe ; état `free` (≥ une équipe libre), `some` (moins d'une équipe : sous réserve), `full` (personne) ; `SAV_TEAM` 2, `resaOf(doc)` = `planning/sav.resa = { lockWeeks, team }`, `lockUntil`.
- `SavPage.js` : Disponibilités — boutons « Off chaque semaine » retirés, clic sur un jour = non dispo → congés → disponible, période « Non dispo ou congés » ; panneau **Réservation par les chefs de projet** (`ResaPanel` : semaines fermées, taille d'équipe) ; Planning, vue chef de projet : jours fermés hachurés gris non cliquables (« Réservation fermée · à partir du … »), légende de la règle des équipes.
- **Kit Production turbines** régénéré pour Jérémie (`npm run kit:jeremie`, dossier kit-jeremie/).
- Fichiers : src/savModel.js (+ test), src/components/SavPage.js, src/demo/demoPages.js.
