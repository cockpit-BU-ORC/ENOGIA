# Page « Achats / Appro » — marche à suivre

Le responsable achats fait évoluer le fond de la page sur son Claude ; Gabriel garde la forme du site et intègre ses retours. Même fonctionnement que la page Production turbines de Jérémie.

## 1. Mise en route (Gabriel, une fois)

1. **Publier les règles Firestore** : console Firebase › Firestore › Règles, coller le contenu de `firestore.rules` du dépôt, Publier (la ligne `achats` est nouvelle). Sans cela, la page s'affiche mais rien ne s'enregistre.
2. **Déployer** le site (`npm run deploy:beta` pour essayer, puis `npm run deploy`).
3. Ouvrir **Gestion › Achats / Appro › Réglages**, saisir l'adresse @enogia.com du responsable achats dans « Accès à la page ». Il voit alors la page dans son menu et peut la modifier. Régler aussi la marge (jours avant l'arrivée du PJ où un composant doit être là).

## 2. Envoyer le kit au responsable achats

1. Dans le dossier du site : `npm run kit:achats`. Le dossier `kit-achats/` contient :
   - `Achats-kit.jsx` — la page, à ouvrir dans Claude ;
   - `Consignes-pour-Claude.md` — les règles à coller au début de sa conversation ;
   - ce fichier.
2. Lui envoyer `Achats-kit.jsx` et `Consignes-pour-Claude.md` (mail, Teams). Le kit ne contient que des données d'exemple fictives.

## 3. Côté responsable achats (sur son Claude)

1. Nouvelle conversation sur claude.ai, joindre les deux fichiers, coller le contenu de `Consignes-pour-Claude.md` en premier message, puis : « Ouvre le kit comme artifact React. »
2. Demander les changements en français, un sujet à la fois (exemples : « ajoute une colonne Délai fournisseur dans Commandes », « dans Par PJ, regroupe les lignes par famille de composant », « ajoute un statut Partiellement reçu »). Vérifier le rendu dans l'aperçu, en clair et en sombre.
3. Quand c'est bon : demander à Claude de **rendre le fichier complet**, l'enregistrer sous `Achats-kit.jsx` et le renvoyer à Gabriel avec la liste des changements (et les nouveaux champs s'il y en a).
4. Toujours repartir du **dernier kit envoyé par Gabriel** : un kit plus ancien est refusé à l'intégration.

## 4. Intégrer un retour (Gabriel)

1. `npm run import:achats -- "C:\chemin\Achats-kit.jsx" --dry` : vérifie sans rien écrire (imports interdits, exports manquants, appels extérieurs, couleurs codées en dur, nouvelles collections, kit périmé).
2. Si c'est accepté : la même commande sans `--dry`.
3. `set CI=false&& npm run build`, `set CI=true&& npx react-scripts test --watchAll=false`, `npm run check:contrast`, puis vérifier la page en local (`npm start`) et committer.
4. `npm run kit:achats` et renvoyer le nouveau kit : c'est la nouvelle base pour la suite.

## Données

Document Firestore `planning/achats` (`planning/beta_achats` en bêta) : `composants`, `lignes`, `fournisseurs`, `params` (marge), `access` (adresses). Le planning n'est que lu. Ne jamais mettre de vraies données (fournisseurs, prix, collègues) dans le dépôt : il est public.
