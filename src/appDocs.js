// v260 : sorti de App.js — documents Firestore du site (préfixe beta_ en bêta) et types de retard par défaut.
import { doc } from "firebase/firestore";
import { db } from "./firebase";

// ── Version bêta ────────────────────────────────────────────────────────────────────────────────────
// Build « bêta » (npm run deploy:beta) : mêmes écrans, mais TOUTES les données sont lues/écrites dans des documents
// distincts (préfixe beta_) → la production n'est jamais touchée par les essais. Le bouton du bandeau bêta copie la
// production vers la bêta. Build normal : préfixe vide, comportement strictement inchangé.
export const IS_BETA=process.env.REACT_APP_BETA==="1";
export const DOC_PFX=IS_BETA?"beta_":"";
if(IS_BETA&&typeof document!=="undefined")document.title="[BÊTA] Cockpit BU ORC";
export const BETA_DOCS=["current","initial","overrides","comments","pjMetaSync","pjMetaOverrides","delays","delayTypes","managerEmails","changeLog","cashin","cashinLinks","turbines","tests","profiles","prodTurbines","achats"];
export const DOC_REF=()=>doc(db,"planning",DOC_PFX+"current");
export const INITIAL_DOC_REF=()=>doc(db,"planning",DOC_PFX+"initial");
export const OVERRIDES_DOC_REF=()=>doc(db,"planning",DOC_PFX+"overrides");
export const COMMENTS_DOC_REF=()=>doc(db,"planning",DOC_PFX+"comments");
export const PJ_META_SYNC_DOC_REF=()=>doc(db,"planning",DOC_PFX+"pjMetaSync");
export const PJ_META_OVERRIDES_DOC_REF=()=>doc(db,"planning",DOC_PFX+"pjMetaOverrides");
export const DELAYS_DOC_REF=()=>doc(db,"planning",DOC_PFX+"delays");
export const DELAY_TYPES_DOC_REF=()=>doc(db,"planning",DOC_PFX+"delayTypes");
export const TURBINES_DOC_REF=()=>doc(db,"planning",DOC_PFX+"turbines"); // v146.22 : pool de turbines
export const PRODTURB_DOC_REF=()=>doc(db,"planning",DOC_PFX+"prodTurbines"); // v226 : Production turbines (directeur de production turbines + propriétaire)
export const TESTS_DOC_REF=()=>doc(db,"planning",DOC_PFX+"tests"); // v154 : testeurs, affectations aux périodes de tests, catalogue FAT
export const MANAGER_EMAILS_DOC_REF=()=>doc(db,"planning",DOC_PFX+"managerEmails");
export const ACHATS_DOC_REF=()=>doc(db,"planning",DOC_PFX+"achats"); // v262 : Achats / Appro (responsable achats + propriétaire)
export const PROFILES_DOC_REF=()=>doc(db,"planning",DOC_PFX+"profiles"); // v188 : rôle et PJ de chaque compte (Manager › Réglages › Personnes et rôles)

// Types de retard génériques par défaut — éditables depuis le panel Manager (onglet Retards)
export const DEFAULT_DELAY_TYPES=[
  "Retard paiement FNR","NC FNR","NC interne","Retard fournisseur",
  "Aléas planning client","Retard études","Manque de main d'œuvre","Autre",
];

