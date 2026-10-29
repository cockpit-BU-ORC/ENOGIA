# Consignes pour Claude — page « Production turbines » (site ENOGIA – BU ORC)

À coller au début de la conversation, avec le fichier `ProdTurbines-kit.jsx`.

---

Tu travailles sur la page **Production turbines** du site interne ENOGIA – BU ORC. Le fichier joint `ProdTurbines-kit.jsx` est un **kit** : il s'ouvre comme artifact React et reproduit le site (thème, en-tête de page, icônes) pour que je voie le rendu. Gabriel réintègre ensuite automatiquement mon travail dans le site : respecte ces règles à la lettre, sinon l'intégration est refusée.

1. **Ouvre le fichier tel quel comme artifact React**, sans le réécrire, puis fais uniquement les modifications que je demande.
2. **Ne modifie que ce qui est entre** `// ===== DÉBUT PAGE` et `// ===== FIN PAGE =====`. Le reste (thème recopié, `PageHead`, `NavIcon`, aperçu `KitPreview`, données d'exemple) ne doit pas changer.
3. **Pas d'`import`** dans la partie modifiable, pas de nouvelle bibliothèque, pas de Tailwind : seulement React (`useState`, `useEffect`, `useMemo`, `useRef`) et ce qui existe déjà dans le fichier (`T`, `FZF`, `stageSoft()`, `alertSoft()`, `PageHead`, `NavIcon`).
4. **Couleurs** : uniquement les jetons du thème — `T.card`, `T.surface`, `T.surfaceAlt`, `T.line`, `T.ink900` / `ink700` / `ink500` / `ink300`, `T.red500` / `red600` / `redFill`, et les couleurs de phase de `phaseColors()`. **Aucune couleur codée en dur** (`#...`, `rgb(...)`) : la page doit marcher en clair et en sombre (bouton « Mode sombre » de l'aperçu).
5. **Polices et tailles** : `T.font` (texte), `T.fontDisplay` (titres, chiffres), `T.fontMono` (numéros) ; tailles `FZF.xs` / `sm` / `md` / `lg`. Chiffres en `fontVariantNumeric: "tabular-nums"`.
6. **Données** : ne passe que par `api.put(collection, id, data)`, `api.del(collection, id)`, `api.setParams(p)`, `api.setAccess(liste)`. Pas de `localStorage` pour les données, pas de `window.claude`. Garde les collections `turbines`, `arbres`, `pieces`, `roues`, `injecteurs`, `params`, `access` et les champs existants ; si tu en ajoutes un, dis-le clairement dans ta réponse (Gabriel doit le savoir).
7. **Garde exportés** `ProdTurbines`, `makeModel`, `moveTurbine`, `EMPTY_PROD`, `T_STEPS`, `A_STEPS` (le site les teste).
8. **Style du site** : cartes plates (bordure fine `T.line`, rayon 10, pas d'ombre sauf fenêtres et menus), boutons sobres, textes en français, phrases courtes, pas d'emoji, cibles cliquables d'au moins 24 px, `aria-label` sur les boutons-icônes, animations courtes (150–300 ms) seulement si utiles.
9. **À la fin, rends le fichier COMPLET** (du premier au dernier caractère, repères compris) dans un seul bloc de code ou en téléchargement, et liste en 3 à 5 lignes ce que tu as changé.
