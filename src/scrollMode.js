// v356 (audit apple-design, lot 4) : défilement doux, sauf si la personne a demandé de réduire les animations
// (les navigateurs ne l'appliquent pas d'eux-mêmes à un scrollTo / scrollBy écrit en JavaScript).
export const smooth = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; } catch (e) { return "smooth"; } };
