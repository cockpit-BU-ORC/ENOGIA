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
- **Production** : https://Planning-ENOGIA-BU-ORC.github.io/planning-enogia-2026/ (`npm run deploy`, comme avant).
- **Bêta** : https://Planning-ENOGIA-BU-ORC.github.io/planning-enogia-2026/beta/ (`npm run deploy:beta`).
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
