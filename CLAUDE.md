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
- Tests : `set CI=true&& npx react-scripts test --watchAll=false` (113 tests / 16 suites attendus).
- Contraste : `npm run check:contrast` (doit afficher 0 échec ; le script lit les couleurs littérales de `theme.js` et `pjMeta.js`).

## À chaque version (V165, V166…)
1. Entrée **en tête** de `src/releaseNotes.js` (id unique `2026-MM-vNNN`, jamais réutilisé).
2. Entrée dans `src/releaseCatalog.js` et mise à jour de `src/releaseCatalog.test.js` (dernière version + titre « de la V146.5 à la VNNN »).
3. Section en bas de `DEPLOIEMENT.md` (ce qui change, clés `localStorage`, fichiers touchés).
4. `APP_BUILD_VERSION` dans `src/App.js`.
5. Build + tests + contraste, puis commit.

## Design (validé par Gabriel — ne pas défaire sans demande)
- **Direction « Éditorial industriel » (V173, validée)** : thème par défaut « Atelier » (`atelier`, clé `enogia_theme2`) — fond crème `#FAF7F1`, marine `#1B2A55` pour la structure (menu latéral marine avec repère jaune `#F3C35B`, filet épais sous les en-têtes, plaques `PjPlate` pour les n° de PJ), sur-titres en JetBrains Mono ocre, grands titres et chiffres en Roboto léger (300), transitions courtes (fondu/glissement, chiffres qui se comptent, barres qui se remplissent ; `prefers-reduced-motion` respecté). Ne plus utiliser taste-skill comme direction principale (rendu jugé terne).
- Autre thème conservé : « Ardoise » (`marine`) ; Forêt et Cuivre retirés (V176). Plaques de PJ sur fond clair (V176). Vue d'ensemble de la Liste en camemberts colorés compacts (V176). **Palette B** : étapes violet `#7C4DDB`, bleu `#1D63E0`, turquoise `#0C8AA8`, vert `#0F9D74`, vert vif `#4CA81E` ; alerte `#E08A00`, retard `#DC2626`, note `#C026A3`, marque `#1B2A55`. Mode sombre éclairci (surface `#1C2536`, carte `#27324A`).
- **Roboto partout** (JetBrains Mono pour les identifiants). Densité **compacte** par défaut.
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
