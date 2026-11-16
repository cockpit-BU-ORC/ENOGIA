// v356 (audit apple-design, lot 4) : défilement doux, sauf si la personne a demandé de réduire les animations
// (les navigateurs ne l'appliquent pas d'eux-mêmes à un scrollTo / scrollBy écrit en JavaScript).
// v358 (audit) : animation des graphiques recharts — 300 ms sans délai (la bibliothèque met 1,5 s après 0,4 s d'attente par défaut)
export const chartAnim = () => { let calm = false; try { calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* rien */ } return { isAnimationActive: !calm, animationDuration: 300, animationBegin: 0, animationEasing: "ease-out" }; };
export const smooth = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; } catch (e) { return "smooth"; } };
