// v324 : contexte du document Production turbines, séparé de turbineNeeds.js (qui embarque la page ProdTurbines) pour ne pas
// l'ajouter au paquet de départ.
import { createContext } from "react";
export const ProdDocCtx = createContext(null);
