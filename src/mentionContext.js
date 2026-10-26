// v152 — personnes que l'on peut taguer (managers déclarés) et adresse de l'utilisateur, fournies par App à tous les fils de commentaires.
import { createContext, useContext } from "react";
export const MentionCtx = createContext({ options: [], me: "" });
export const useMentions = () => useContext(MentionCtx);
