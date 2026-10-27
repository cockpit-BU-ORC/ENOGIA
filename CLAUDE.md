# Planning Ordonnancement / BU ORC — ENOGIA

Tableau de bord interne (React 18 + Create React App 5 + Firebase/Firestore) qui suit les machines ORC de la BU ORC. Propriétaire : Gabriel VINCENT (Head of Operations & Projects). Langue de travail : **français**, réponses courtes, on implémente directement.

## Règle n° 1 — le déploiement reste à Gabriel
- **Ne jamais** lancer `git push`, `npm run deploy`, `npm run deploy:beta`, `npm run predeploy*`, `node scripts/deploy.js`, ni `gh-pages`. Ces commandes sont aussi refusées dans `.claude/settings.json`.
- Les `git commit` locaux sont autorisés (message en français, une ligne de résumé, trailer `Co-Authored-By: Claude <noreply@anthropic.com>`).
- À la fin d'une version, dire simplement : « Je ne pousse pas : les N commits restent en local. Vous déployez vous-même avec `npm run deploy:beta` ou `npm run deploy`. » (N = commits non poussés.)
- Déploiement : `npm run deploy:beta` → GitHub Pages `/beta/` (données Firestore préfixées `beta_`) ; `npm run deploy` → production.

## Commandes
- Développement : `npm start`
- Build propre : `npm run build` (sous Windows cmd : `set CI=false&& npm run build`). Seuls les avertissements ESLint déjà existants sont tolérés : **aucun nouvel avertissement**.
- Tests : `set CI=true&& npx react-scripts test --watchAll=false` (127 tests / 17 suites attendus).
- Contraste : `npm run check:contrast` (doit afficher 0 échec ; le script lit les couleurs littérales de `theme.js` et `pjMeta.js`).

## À chaque version (V165, V166…)
1. Entrée **en tête** de `src/releaseNotes.js` (id unique `2026-MM-vNNN`, jamais réutilisé).
2. Entrée dans `src/releaseCatalog.js` et mise à jour de `src/releaseCatalog.test.js` (dernière version + titre « de la V146.5 à la VNNN »).
3. Section en bas de `DEPLOIEMENT.md` (ce qui change, clés `localStorage`, fichiers touchés).
4. `APP_BUILD_VERSION` dans `src/App.js`.
5. Build + tests + contraste, puis commit.

## Design (validé par Gabriel — ne pas défaire sans demande)
- **Nom du site (V183)** : « ORDO & OPS – BU ORC », sous-titre « Ordonnancement · Planning de production · Suivi des tests · Pilotage projets » — défini une seule fois dans `src/siteName.js`.
- **Thème par défaut (V185)** : « Ardoise » (`marine`, clé `enogia_theme3`) = clair gris froid d'Ardoise + sombre de l'ex-thème Atelier (accent or, menu marine à repère or). « Salle de contrôle » (`controle`) reste au choix. Le thème « Atelier » a été retiré (V183) ; sa description ci-dessous reste la référence pour les composants (plaques, filets, surligneur, sur-titres).
- **Titres de page (V185)** : une couleur de trait par page (`PageHead accent`) — Liste marine, Gantt or, Calendrier vert forêt, Modifications brun sable, Commentaires magenta, Tests bleu clair, accueil orange.
- **Accueils par rôle (V188)** : rôle de chaque compte dans Manager › Réglages › Personnes et rôles (`profiles.js`, doc `planning/profiles`) — direction, chef de projet, testeur, chef d'atelier ; blocs validés par Gabriel (`RoleHome.js`). Pas de fond sur l'accueil. Étiquettes en IBM Plex Sans (`T.fontLabel`).
- **Espace Manager (V196, maquette validée)** : un seul menu (le menu du site porte les rubriques du Manager via `onNav`, plus de rail sur ordinateur) ; en-tête commun (titre, phrase `PAGE_DESC`, actions à droite) ; sous-pages en onglets soulignés ; filtres repliés dans un bouton ; « Planning initial » dans Réglages › Imports ; liste des fiches en tiroir ; contenu limité à 1 440 px.
- **Rôles (V185)** : `isSuperAdmin()` = propriétaire OU admin (accès Manager) → mêmes droits ; `isOwner()` = propriétaire seul → Cash in uniquement.
- **Direction « Éditorial industriel » (V173, validée)** : ex-thème par défaut « Atelier » (`atelier`, clé `enogia_theme2`) — fond crème `#FAF7F1`, marine `#1B2A55` pour la structure (menu latéral marine avec repère jaune `#F3C35B`, filet épais sous les en-têtes, plaques `PjPlate` pour les n° de PJ), sur-titres en Satoshi gras ocre (casse normale depuis V177), grands titres et chiffres en Roboto léger (300), transitions courtes (fondu/glissement, chiffres qui se comptent, barres qui se remplissent ; `prefers-reduced-motion` respecté). Ne plus utiliser taste-skill comme direction principale (rendu jugé terne).
- Autres thèmes : « Ardoise » (`marine`) et **« Salle de contrôle »** (`controle`, V182 — 2e direction : ardoise dense pour l'écran d'atelier et la tablette) ; Forêt et Cuivre retirés (V176). **Néomorphisme abandonné** (V182) : jetons `panel`/`panelDim` (fonds), `outline`/`outlineSoft` (filets), `insetSm`/`inset` ; ne plus réintroduire d'ombres en relief. **Animations** (V181) : 150–300 ms, uniquement transform/opacity, `prefers-reduced-motion` respecté. Plaques de PJ sur fond clair (V176). Vue d'ensemble de la Liste en camemberts colorés compacts (V176). **Palette V177** (nuanciers de Gabriel) : étapes arrivée Light Blue `#A8D5E2`, production Regal Navy `#0D3B66`, tests Royal Gold `#F4D35E`, fin prod Forest Green `#548C2F`, départ Black Forest `#104911` ; vigilance Orange `#F9A620`, retard Tomato `#F95738` (texte `#B8331A`), Sandy Brown `#EE964B`, Mustard `#FFD449`, fond Cornsilk adouci `#FCF8EA` ; états, gammes et camemberts sur cette palette (`etatFromColor`, `GAMME_COLORS`). Mode sombre éclairci (surface `#1C2536`, carte `#27324A`).
- **Couleurs d'état (V192, palette A validée)** : Non commandée `#D62839`, Non désignée `#C77DFF`, Fabrication FNR `#E76F51`, Stockage externe `#8D99AE`, Montage méca `#1D3557`, Montage élec `#48CAE4`, Tests `#FFB703`, Packaging `#2A9D8F`, Expédiée `#2D6A4F`, Slot libre `#CED4DA` (les couleurs d'étape du Gantt / calendrier restent celles de la V177). Présence : étiquette d'atelier (filet, liseré bleu acier `#457B9D` client / rouge `#C1121F` NOBO, icône, date). Camemberts pays / chefs : palette catégorielle `#4E79A7 #F28E2B #E15759 #76B7B2 #59A14F #B07AA1 #EDC948 #FF9DA7 #9C755F`, sans total au centre.
- **Police (V177)** : Cabinet Grotesk (titres, chiffres, plaques) + Satoshi (texte), via Fontshare ; JetBrains Mono pour les identifiants ; Roboto seulement dans les rapports imprimés. **Icônes** : Phosphor (`@phosphor-icons/react`, via `NavIcon`). Densité **compacte** par défaut.
- Liseré coloré de 4 px sur le haut des cartes (`stripeBg`), couleur d'état aussi sur le texte (`etatInk`), en-tête de page commun (`PageHead`), bulles d'info au survol (`HoverPop`), menu latéral avec repère sur la page active.
- Les couleurs viennent des jetons (`T`, `stageSoft()`, `ETAT_META`) : pas de couleur codée en dur dans un composant.
- Avant un gros changement visuel : proposer une maquette et attendre le « go » de Gabriel.
- Skills de design à utiliser pour toute interface : `taste-skill` et `ui-ux-pro-max` (installés sur le compte). Les choix ci-dessus et les demandes explicites de Gabriel priment sur leurs règles.
- Accessibilité : `src/a11yFallback.js` complète les étiquettes manquantes, mais on étiquette à la source dans les nouveaux composants (aria-label, `label`, cibles ≥ 24 px).

## Données et rôles
- Firestore, préfixe `beta_` en bêta ; `planning/knownUsers`, mentions (`mentions.js`), rôles (`roles.js`, `pinOk`, `canEditMeta`, `OWNER_EMAILS`).
- Ne jamais écrire en base depuis un script sans accord explicite.

## Signature d'e-mail (uniquement pour des brouillons d'e-mail)
Gabriel VINCENT / Head of Operations & Projects
📞 +33 7 67 84 14 90
📍 43, avenue de Boisbaudran, 13015 Marseille
🌐 www.enogia.com
