import { useSyncExternalStore } from "react";
import { subscribeCashin, cashinVersion } from "./cashinLink";
// Re-rend le composant quand le Cash in, les liaisons ou la liste des PJ de l'ordo changent.
export const useCashin = () => useSyncExternalStore(subscribeCashin, cashinVersion);
