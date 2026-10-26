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
