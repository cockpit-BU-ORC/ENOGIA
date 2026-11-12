import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { db, auth, ALLOWED_EMAIL_DOMAIN } from "./firebase";
import { setResolved as setCommentResolved, peopleOptions, userKey, chefAccount, withChef, lc as lcMention } from "./mentions";
import { profileOf, pjsOfProfile } from "./profiles";
import { PlanSwitch } from "./components/PlanSwitch";
import { myAccess, atLeast } from "./access";
import { TutoVideoModal, tutoActive, tutoSeen, markTutoSeen } from "./components/TutoVideo";
import { isEstimatePj } from "./changeDiff";
import { MentionCtx } from "./mentionContext";
import { MentionBell } from "./components/MentionBell";
import { testerOfEmail, assignmentsSince } from "./testPlan";
import { setDefaultComposants } from "./pjProgress";
import { doc, setDoc, getDoc, onSnapshot, updateDoc, FieldPath, deleteField } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "./styles.css";

import { T, setThemeMode, setDensity, D, mixHex, FZ, R, THEMES, DEFAULT_THEME, THEME_KEY, navTokens, stageSoft, stripeHues } from "./theme";
import { ThemePicker } from "./components/ThemePicker";
import { setSuperAdmin, isSuperAdmin, setOwner, CASH_FOR_ADMINS } from "./roles";
import { setOrdoPjs } from "./cashinLink";
import { getPjMeta, chefsOf, orcChefsOf, ALL_ETATS, ETAT_META, registerCustomEtats, registerEtatEdits, today, setSyncedPjMeta, setPjMetaOverrides, GAMME_OVERRIDE } from "./pjMeta";
import { weekStartOf } from "./parsers";
import { HomeView } from "./components/HomeView";
import { ProdDocCtx, buildNeeds } from "./turbineNeeds";
import { planSerials, registerSerialPlan, serialsDue } from "./serialNumbers";
import { assignSerialsFlow } from "./components/Series";
import { InboxPage } from "./components/InboxPage";
import { openMentionsFor, isSeenFor } from "./mentions";
import { PageGuard } from "./components/PageGuard";
import { ArrangeCtx } from "./components/Arrange"; // v235 : cadrans partagés, réglés par le propriétaire
import { backdropStyle } from "./pageBackdrop"; // v225 : un fond léger par page
import { useA11yFallback } from "./a11yFallback";
import { ManagerAccessNotice, PIN, NavIcon, Hl, EmptyState, LoadingSkeleton, PageHead, notify, Toaster } from "./components/SharedUI";
import { PjDialog, PjDialogCtx } from "./components/RowDetail";
import { listenPlan, savePlan, loadHistory, publishPlan, restorePublication, setDepartDate, clearPendingDeparts } from "./planner/store";
import { TableView } from "./components/TableView";
import { ManagerPalette } from "./components/ManagerNav";
import { LoginScreen, LoginTransition } from "./components/LoginScreen";
import { SITE_NAME, SITE_SCOPE, SITE_SUB, SITE_TITLE } from "./siteName";
import { DashboardSummary } from "./components/DashboardSummary";
import { normalizeEtat, buildProgress } from "./prodStages";
import { ReleasePopup, useUnseenReleases, mergeReleases } from "./components/ReleaseNotes";
import { ChangesPopup, ChangesBadge, useUnseenChanges, useChangeMarks, ChangeMarksContext } from "./components/ChangesNotice";
import { listenChangeLog } from "./changeLog";

// v260 : documents Firestore, bandeau bêta et identité du compte sortis de ce fichier (appDocs.js, components/AppChrome.js)
import { IS_BETA, DOC_PFX, DOC_REF, INITIAL_DOC_REF, OVERRIDES_DOC_REF, COMMENTS_DOC_REF, PJ_META_SYNC_DOC_REF, PJ_META_OVERRIDES_DOC_REF, DELAYS_DOC_REF, DELAY_TYPES_DOC_REF, MANAGER_EMAILS_DOC_REF, PROFILES_DOC_REF, DEFAULT_DELAY_TYPES } from "./appDocs";
import { BetaBanner, UserChip } from "./components/AppChrome";
import { useAccessDoc, useTurbineDoc, useTestsDoc, useProdTurbines, useDelays, useCashinSync, useAchats } from "./useAppData";
import { useListFilters, filterOptions, filterRows } from "./listFilters";
// v289 (lot G « rapidité ») : les grandes pages ne sont chargées qu'à leur première ouverture (paquet de départ allégé) ;
// en attendant, un squelette s'affiche dans la zone principale (Suspense).
const TestsTab = React.lazy(() => import("./components/TestsTab").then(m => ({ default: m.TestsTab })));
const TurbinesHub = React.lazy(() => import("./components/TurbinesHub").then(m => ({ default: m.TurbinesHub })));
const Achats = React.lazy(() => import("./components/Achats").then(m => ({ default: m.Achats })));
const CashInTab = React.lazy(() => import("./components/CashInTab").then(m => ({ default: m.CashInTab })));
const GanttView = React.lazy(() => import("./components/GanttView").then(m => ({ default: m.GanttView })));
const PlannerView = React.lazy(() => import("./planner/Planner").then(m => ({ default: m.PlannerView })));
const CommentsView = React.lazy(() => import("./components/CommentsView").then(m => ({ default: m.CommentsView })));
const CalendarView = React.lazy(() => import("./components/CalendarView").then(m => ({ default: m.CalendarView })));
const ManagerPanel = React.lazy(() => import("./components/ManagerPanel").then(m => ({ default: m.ManagerPanel })));
const ChangesView = React.lazy(() => import("./components/ChangesView").then(m => ({ default: m.ChangesView })));
const AccessPage = React.lazy(() => import("./components/AccessPage")); // v305 : Régler › Accès
const WorkshopScreen = React.lazy(() => import("./components/WorkshopScreen").then(m => ({ default: m.WorkshopScreen })));

const APP_BUILD_VERSION = "2026-11-12-v315-a-traiter-sn";

export default function App(){
  // Utilisateur connecté via Google, restreint aux comptes @enogia.com (null tant que non connecté).
  const [currentUser,setCurrentUser]=useState(null);
  const [authChecked,setAuthChecked]=useState(false);
  // v180 : données plus synchronisées (réseau coupé ou erreur Firestore) → bandeau explicite avec « Recharger ».
  const [syncLost,setSyncLost]=useState(false),[offline,setOffline]=useState(typeof navigator!=="undefined"&&navigator.onLine===false);
  const authUid=currentUser?currentUser.uid:null; // v252 : les lectures temps réel attendent la connexion (sinon refusées puis jamais relancées)
  useEffect(()=>{const on=()=>setOffline(false),off=()=>setOffline(true);window.addEventListener("online",on);window.addEventListener("offline",off);return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};},[]); // évite un flash de l'écran de connexion pendant la vérification initiale

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,user=>{
      // v179 : déconnexion forcée chaque jour (demandé) — une session ouverte un autre jour que celui-ci est fermée.
      // lastSignInTime ne change qu'à une vraie connexion (pas au rafraîchissement du jeton) : c'est donc bien « connecté aujourd'hui ».
      const signedDay=user&&user.metadata&&user.metadata.lastSignInTime?new Date(user.metadata.lastSignInTime).toDateString():null;
      if(user&&signedDay&&signedDay!==new Date().toDateString()){signOut(auth);setCurrentUser(null);setAuthChecked(true);return;}
      if(user&&user.email&&user.email.toLowerCase().endsWith("@"+ALLOWED_EMAIL_DOMAIN)){
        setCurrentUser(user);
      }else{
        if(user)signOut(auth); // compte connecté mais hors domaine autorisé : on déconnecte
        setCurrentUser(null);
      }
      setAuthChecked(true);
    });
    return ()=>unsub();
  },[]);
  // v179 : si le site reste ouvert, déconnexion à minuit (heure locale) — l'écran de connexion réapparaît.
  useEffect(()=>{
    if(!currentUser)return;
    const now=new Date(),midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,5);
    const t=setTimeout(()=>{signOut(auth);},Math.max(1000,midnight-now));
    return()=>clearTimeout(t);
  },[currentUser]);

  const loggedIn=!!currentUser;
  // Nom à utiliser automatiquement pour les commentaires/retards : celui du compte Google connecté.
  const authorName=currentUser?.displayName||currentUser?.email||"";

  // Popup de transition légère après la connexion, avant d'arriver sur le planning (demandé
  // explicitement) — déclenchée seulement sur un vrai clic "se connecter" depuis l'écran de
  // connexion, pas au chargement de la page quand une session était déjà active (sinon la popup
  // réapparaîtrait à chaque rafraîchissement). initialAuthResolvedRef distingue la toute première
  // résolution de onAuthStateChanged (restauration de session) d'un passage false→true ultérieur
  // (vraie connexion en cours de visite).
  const [justLoggedIn,setJustLoggedIn]=useState(false);
  const wasLoggedInRef=useRef(false);
  const initialAuthResolvedRef=useRef(false);
  useEffect(()=>{
    const wasLoggedIn=wasLoggedInRef.current;
    const isInitialResolution=!initialAuthResolvedRef.current;
    wasLoggedInRef.current=loggedIn;
    if(authChecked)initialAuthResolvedRef.current=true;
    if(loggedIn&&!wasLoggedIn&&!isInitialResolution){
      setJustLoggedIn(true);
      const t=setTimeout(()=>setJustLoggedIn(false),2200);
      return ()=>clearTimeout(t);
    }
  },[loggedIn,authChecked]);
  // "L'option de modifier [la fiche projet] doit être disponible uniquement par moi" — restreint à
  // l'email de connexion de Gabriel, pas à pinOk (que d'autres membres de la BU ORC peuvent aussi
  // avoir en entrant le code Manager). À AJUSTER si ce n'est pas exactement ton adresse @enogia.com.
  const OWNER_EMAILS=["gabriel.vincent@enogia.com"];
  const isOwner=!!(currentUser?.email&&OWNER_EMAILS.includes(currentUser.email.toLowerCase())); // v185 : propriétaire (seul à voir le Cash in)
  setOwner(isOwner);

  // v285 (audit croisé, lot B) : mode Clair / Sombre / Auto (= comme le système, par défaut). L'ancien « sombre » choisi est gardé.
  const [darkPref,setDarkPref]=useState(()=>{
    try{const p=localStorage.getItem("enogia_darkPref");if(p==="light"||p==="dark"||p==="system")return p;return localStorage.getItem("enogia_darkMode")==="1"?"dark":"system";}catch(e){return "system";}
  });
    const [sysDark,setSysDark]=useState(()=>{try{return !!window.matchMedia("(prefers-color-scheme: dark)").matches;}catch(e){return false;}});
  useEffect(()=>{const q=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;if(!q)return undefined;const on=e=>setSysDark(!!e.matches);if(q.addEventListener)q.addEventListener("change",on);else q.addListener(on);return()=>{if(q.removeEventListener)q.removeEventListener("change",on);else q.removeListener(on);};},[]);
  useEffect(()=>{try{localStorage.setItem("enogia_darkPref",darkPref);}catch(e){}},[darkPref]);
  const darkMode=darkPref==="system"?sysDark:darkPref==="dark";
  const setDarkMode=v=>setDarkPref(v===true?"dark":v===false?"light":v);
  // v139 : thème de couleurs (Marine, Forêt, Cuivre), mémorisé sur ce poste
  const [themeId,setThemeId]=useState(()=>{
    try{const t=localStorage.getItem(THEME_KEY);return THEMES[t]?t:DEFAULT_THEME;}catch(e){return DEFAULT_THEME;}
  });
  // v141 : densité (confortable / compacte, mémorisée sur ce poste) et mode présentation (propre à l'onglet : on n'y reste pas par mégarde)
  // v314 (revue, point 5 « la tablette et l'atelier sont des citoyens de seconde zone ») : densité « Auto » par défaut — confortable au doigt
  // (tablette, écran tactile : lignes et boutons de 44 px), compacte à la souris ; Confortable / Compacte restent au choix de chacun.
  const [density,setDensityState]=useState(()=>{try{const v=localStorage.getItem("enogia_density3");if(v==="auto"||v==="comfortable"||v==="compact")return v;return localStorage.getItem("enogia_density2")==="comfortable"?"comfortable":"auto";}catch(e){return "auto";}});
  const [coarse,setCoarse]=useState(()=>{try{return window.matchMedia("(pointer: coarse)").matches;}catch(e){return false;}});
  useEffect(()=>{let m;try{m=window.matchMedia("(pointer: coarse)");}catch(e){return undefined;}const f=()=>setCoarse(m.matches);if(m.addEventListener)m.addEventListener("change",f);return()=>{if(m.removeEventListener)m.removeEventListener("change",f);};},[]);
  const densityEff=density==="auto"?(coarse?"comfortable":"compact"):density;
  const [presentation,setPresentation]=useState(()=>{try{return sessionStorage.getItem("enogia_present")==="1";}catch(e){return false;}});
  setThemeMode(darkMode,themeId,presentation); // mute T en place avant que quoi que ce soit ne le lise pendant ce rendu
  const NAV=navTokens(); // v173 : couleurs du menu latéral (marine + repère jaune pour le thème Atelier)
  // v178 : en-tête qui s'efface en fondu quand on descend (seul le logo reste), et revient dès qu'on remonte ou en haut de page.
  const [hdrHidden,setHdrHidden]=useState(false);
  useEffect(()=>{
    let last=window.scrollY||0,raf=0;
    const on=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const y=window.scrollY||0;
      if(y<40)setHdrHidden(false);else if(y>last+6)setHdrHidden(true);else if(y<last-6)setHdrHidden(false);last=y;});};
    window.addEventListener("scroll",on,{passive:true});
    return()=>{window.removeEventListener("scroll",on);cancelAnimationFrame(raf);};
  },[]);
  setDensity(densityEff);
  useA11yFallback(); // v165 : étiquettes et zones cliquables de secours
  useEffect(()=>{try{localStorage.setItem("enogia_density3",density);}catch(e){}},[density]);
  useEffect(()=>{try{sessionStorage.setItem("enogia_present",presentation?"1":"0");}catch(e){}},[presentation]);
  useEffect(()=>{
    if(!presentation)return;
    const esc=e=>{if(e.key==="Escape"&&!document.querySelector('[role="dialog"]'))setPresentation(false);};
    document.addEventListener("keydown",esc);return()=>document.removeEventListener("keydown",esc);
  },[presentation]);
  useEffect(()=>{
    try{localStorage.setItem("enogia_darkMode",darkMode?"1":"0");localStorage.setItem(THEME_KEY,themeId);}catch(e){}
    // Contrôles natifs (barres de défilement, sélecteurs de date, listes déroulantes) et fond de page
    // suivent le thème ; variables CSS lues par les infobulles/légendes des graphiques (styles.css).
    const root=document.documentElement;
    root.style.colorScheme=darkMode?"dark":"light";
    document.body.classList.toggle("enogia-present",!!presentation); // v162 : masque les gestes de souris (⋯, Personnaliser) en présentation
    document.body.style.background=T.surface;
    root.style.setProperty("--e-card",T.card);
    root.style.setProperty("--e-line",T.line);
    root.style.setProperty("--e-ink900",T.ink900);
    root.style.setProperty("--e-ink700",T.ink700);
    root.style.setProperty("--e-ink300",T.ink300);
    root.style.setProperty("--e-accent",T.accent);
    root.style.setProperty("--e-ind-bg",T.mode==="dark"?T.teal600:T.teal500);root.style.setProperty("--e-ind-ink",T.mode==="dark"?"#0B1130":"#FFFFFF"); // v174 : survol des boutons d'action
    root.style.setProperty("--e-teal500",T.teal500);
    root.style.setProperty("--e-scroll",mixHex(T.surface,T.ink900,T.mode==="dark"?.32:.25)); // barres de défilement : teinte du thème (v141)
    root.style.setProperty("--e-scroll-hover",mixHex(T.surface,T.ink900,T.mode==="dark"?.5:.45));
    const mt=document.querySelector('meta[name="theme-color"]');if(mt)mt.setAttribute("content",T.mode==="dark"?T.surface:T.navy800);
  },[darkMode,themeId,presentation]);

  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [lastImport,setLastImport]=useState(null);
  const [initialData,setInitialData]=useState([]);
  const [initialImporting,setInitialImporting]=useState(false);
  const [lastInitialImport,setLastInitialImport]=useState(null);
  const [lastInitialAdd,setLastInitialAdd]=useState(null);
  const [view,setView]=useState(()=>{try{const v0=localStorage.getItem("enogia_view"),v=v0==="prodturb"?"turbines":v0;return ["home","table","gantt","calendar","changes","comments","tests","planner","cashin","turbines","prodturb","achats"].includes(v)?v:"home";}catch(e){return "home";}});
  useEffect(()=>{try{localStorage.setItem("enogia_view",view);}catch(e){}},[view]);
  useEffect(()=>{
    const h=e=>{
      if(e.key!=="t"&&e.key!=="T")return;
      if(e.metaKey||e.ctrlKey||e.altKey)return;
      const el=e.target,tag=el&&el.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||(el&&el.isContentEditable))return;
      window.dispatchEvent(new Event("enogia:today"));
    };
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[]);
  // Format du calendrier (mode semaine/jour, position, zoom) persisté en localStorage :
  // reste identique quand on quitte/revient sur l'onglet Calendrier, et même après rechargement de la page.
  const [calMode,setCalMode]=useState(()=>{
    try{return localStorage.getItem("enogia_calMode")||"week";}catch(e){return"week";}
  });
  const [calAnchor,setCalAnchor]=useState(()=>{
    try{const s=localStorage.getItem("enogia_calAnchor");if(s&&!isNaN(new Date(s)))return new Date(s);}catch(e){}
    return weekStartOf(today);
  });
  const [calDayAnchor,setCalDayAnchor]=useState(()=>{
    try{const s=localStorage.getItem("enogia_calDayAnchor");if(s&&!isNaN(new Date(s)))return new Date(s);}catch(e){}
    const d=new Date(today);d.setHours(0,0,0,0);return d;
  });
  const [calZoom,setCalZoom]=useState(()=>{
    // Valeur illisible (« NaN »…) ignorée : elle faisait planter l'onglet Calendrier à chaque ouverture.
    try{const n=parseInt(localStorage.getItem("enogia_calZoom"),10);if(Number.isFinite(n)&&n>=0)return n;}catch(e){}
    return 2; // dézoomé par défaut pour une vue d'ensemble plus large à l'ouverture
  });
  useEffect(()=>{
    try{
      localStorage.setItem("enogia_calMode",calMode);
      localStorage.setItem("enogia_calAnchor",calAnchor.toISOString());
      localStorage.setItem("enogia_calDayAnchor",calDayAnchor.toISOString());
      localStorage.setItem("enogia_calZoom",String(calZoom));
    }catch(e){}
  },[calMode,calAnchor,calDayAnchor,calZoom]);
  const [managerTab,setManagerTab]=useState("derives");
  const [managerJump,setManagerJump]=useState(null); // v152 : PJ à ouvrir dans la fiche Manager depuis la cloche @
  // v261 : filtres de la Liste (listFilters.js)
  const {selEtats,setSelEtats,selGammes,setSelGammes,selMoisArrivee,setSelMoisArrivee,selMoisTests,setSelMoisTests,selMoisFinProd,setSelMoisFinProd,selMoisDepart,setSelMoisDepart,selPJs,setSelPJs,selProjets,setSelProjets,selPays,setSelPays,selChefs,setSelChefs,onlyDrift,setOnlyDrift}=useListFilters();
  const [df,setDf]=useState("date");
  const [pinOkL,setPinOk]=useState(false); // droits d'avant : admins du Manager (liste « Accès Manager »)
  const [profiles,setProfiles]=useState({byEmail:{}}); // v188 (lu plus bas) ; v238 : les personnes ajoutées dans Personnes et rôles sont taguables ; v305 : déclaré ici (le rôle donne les accès)
  // v305 (page Régler › Accès) : une fois les nouveaux accès activés, chaque page s'ouvre selon le rôle de la personne (accMe[page] = n / r / w / a) ;
  // accMe = null tant qu'ils ne sont pas activés → droits d'avant. Le propriétaire reste seul super admin (a partout).
  const {accessDoc,saveAccess}=useAccessDoc(currentUser,authorName);
  const accMe=useMemo(()=>myAccess(accessDoc,currentUser?profileOf(profiles,currentUser.email).role:"",isOwner),[accessDoc,profiles,currentUser,isOwner]);
  const accAt=(page,min)=>!!accMe&&atLeast(accMe[page]||"n",min);
  const pinOk=accMe?(isOwner||accAt("planning","a")||accAt("projets","a")):pinOkL;
  // v185 : droits d'administration complets pour le propriétaire et les admins (accès Manager) — sauf le Cash in (isOwner).
  const canEditMeta=isOwner||pinOk||accAt("projets","w");
  // v210 : Cash in ouvrable aux admins (chefs de projet) ; v221 (demandé : « Planificateur, Cash in et Turbines restent visibles uniquement par moi pour l'instant ») :
  // réservé au propriétaire tant que CASH_FOR_ADMINS vaut false (le passer à true rouvre le Cash in aux admins, règles Firestore à ouvrir — DEPLOIEMENT v210).
  const canCash=accMe?accAt("finance","r"):(isOwner||(CASH_FOR_ADMINS&&pinOk));
  setSuperAdmin(canEditMeta); // pose le rôle avant que les composants ne le lisent (src/roles.js)
  const [progress,setProgress]=useState({});
  const [calSel,setCalSel]=useState(null),[calDay,setCalDay]=useState(null),[calTab,setCalTab]=useState("resume"); // v221 : jour cliqué dans le Calendrier (bouton « production ce jour » de la fiche)
  const [etatChoice,setEtatChoice]=useState({});
  const [releaseSelection,setReleaseSelection]=useState(null); // v146.16 : sélection en cours dans le catalogue des nouveautés
  const [releaseNotes,setReleaseNotes]=useState(null); // v146.10 : pop-up Nouveautés rédigé dans l'appli (Réglages › Nouveautés)
  const [clientPresence,setClientPresence]=useState({});
  const [closurePeriods,setClosurePeriods]=useState([]);
  const [compCatalog,setCompCatalog]=useState([]); // v150 : liste des major components gérée par les administrateurs
  const [certifs,setCertifs]=useState([]); // v146.23 : catalogue des certifications (nom + couleur)
  const [customEtats,setCustomEtats]=useState([]); // v146.18 : états créés dans le Manager
  const [etatEdits,setEtatEdits]=useState({}); // v230 : états intégrés renommés / recolorés
  const [overridesLoaded,setOverridesLoaded]=useState(false); // v146.19
  const [productionExclusions,setProductionExclusions]=useState({});
  const [comments,setComments]=useState({});
  const [delayTypes,setDelayTypes]=useState(DEFAULT_DELAY_TYPES);
  const [managerEmails,setManagerEmails]=useState([]);
  const [tableJumpPj,setTableJumpPj]=useState(null);
  const jumpToPj=useCallback(pj=>{setView("table");setTableJumpPj(pj);},[]);

  // v146 : l'espace Manager s'ouvre uniquement pour les adresses autorisées (liste « Accès Manager ») et le super admin ;
  // plus de clavier PIN à l'entrée. Le PIN ne sert plus qu'à confirmer certaines suppressions.
  useEffect(()=>{
    setPinOk(!!(currentUser?.email&&(managerEmails.some(e=>String(e).toLowerCase()===currentUser.email.toLowerCase())||isOwner))); // le propriétaire entre toujours ; un compte retiré de la liste perd l'accès
  },[currentUser,managerEmails,isOwner]);

  // Lecture temps réel depuis Firestore
  useEffect(()=>{
    if(!authUid)return undefined; // v252 : pas de lecture avant la connexion
    const unsub = onSnapshot(DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setData(d.rows || []);
        setLastImport(d.lastImport || null);
        setPendingDeparts(d.pendingDeparts || {}); // v312 : départs changés hors planificateur, à reporter dans le plan
      }
      setLoading(false);
      setSyncLost(false); // v252 : la lecture repart (après connexion) → le bandeau disparaît
    }, (err)=>{
      console.error("Erreur Firestore:", err);
      setLoading(false);
      setSyncLost(true); // v180 : l'écran affiche un bandeau au lieu de rester figé sans explication
    });
    return ()=>unsub();
  },[authUid]);

  // Journal des versions : écart entre l'ancienne et la nouvelle version à chaque import / publication
  const [changeLog,setChangeLog]=useState(null);
  useEffect(()=>{if(!authUid)return undefined;const unsub=listenChangeLog(setChangeLog);return ()=>unsub();},[authUid]);
  // v135 : modifications non vues (par personne et par poste) → pastille sur l'icône + message à la connexion
  const {unseen:unseenChanges,markSeen:markChangesSeen}=useUnseenChanges(changeLog,currentUser&&currentUser.email);
  const [noticeOpen,setNoticeOpen]=useState(false);
  const changeMarks=useChangeMarks(changeLog,currentUser&&currentUser.email); // v146.8 : repères « modifié » dans la Liste et le Calendrier
  const [onlyChanged,setOnlyChanged]=useState(false);
  // v146.9 : nouveautés de la version déployée, affichées une fois par personne et par poste (texte dans src/releaseNotes.js)
  const releasesAll=useMemo(()=>mergeReleases(releaseNotes),[releaseNotes]);
  const {unseen:unseenReleases,markSeen:markReleasesSeen}=useUnseenReleases(currentUser&&currentUser.email,!!isOwner,releasesAll); // lignes « réservées » = Cash in → propriétaire
  const [screenOpen,setScreenOpen]=useState(false); // v146.8 : écran atelier (diaporama plein écran)
  useEffect(()=>{try{if(loggedIn&&!justLoggedIn&&new URLSearchParams(window.location.search).get("ecran")==="1")setScreenOpen(true);}catch(e){}},[loggedIn,justLoggedIn]);
  // v146.7 : le message revient à CHAQUE chargement de la page tant qu'il n'est pas lu (Ctrl+R ne le fait plus disparaître) et s'affiche
  // en direct chez tous les connectés dès qu'un import / une publication arrive. « Plus tard » ne le masque que jusqu'à la prochaine actualisation.
  // Celui qui lance l'import ne reçoit pas son propre message.
  const dismissedAtRef=useRef(null);
  useEffect(()=>{
    if(!loggedIn||justLoggedIn||!unseenChanges.length)return;
    if(view==="changes")return;
    if(authorName&&unseenChanges.every(e=>e.by&&e.by===authorName)){markChangesSeen();return;}
    if(dismissedAtRef.current===unseenChanges[0].at)return;
    setNoticeOpen(true);
  },[loggedIn,justLoggedIn,view,unseenChanges,authorName]); // eslint-disable-line
  const closeNoticeLater=()=>{dismissedAtRef.current=unseenChanges[0]&&unseenChanges[0].at;setNoticeOpen(false);};
  // Onglet du navigateur : pastille tant que des modifications n'ont pas été lues
  useEffect(()=>{
    if(typeof document==="undefined")return;
    const base=(IS_BETA?"[BÊTA] ":"")+SITE_TITLE; // v183 : nom du site ; v220 : « ENOGIA – BU ORC » (plus de « · ENOGIA » en double)
    document.title=(unseenChanges.length&&loggedIn?"● ("+unseenChanges.length+") ":"")+base;
  },[unseenChanges.length,loggedIn]);
  useEffect(()=>{if(view==="changes"&&changeLog&&changeLog.length){markChangesSeen();setNoticeOpen(false);}},[view,changeLog]); // eslint-disable-line

  // Lecture temps réel du planning initial (figé, Manager uniquement)
  useEffect(()=>{
    if(!authUid)return undefined; // v252 : pas de lecture avant la connexion
    const unsub = onSnapshot(INITIAL_DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setInitialData(d.rows || []);
        setLastInitialImport(d.lastImport || null);
        setLastInitialAdd(d.lastAdd || null);
      }
    }, (err)=>{
      console.error("Erreur Firestore (initial):", err);
    });
    return ()=>unsub();
  },[authUid]);

  // Lecture temps réel des états choisis manuellement par le Manager (pas de calcul automatique)
  useEffect(()=>{
    if(!authUid)return undefined; // v252 : pas de lecture avant la connexion
    const unsub = onSnapshot(OVERRIDES_DOC_REF(), (snap)=>{
      if(!snap.metadata.fromCache)setOverridesLoaded(true); // v146.19 : le pop-up « nouveautés » attend la version serveur (sinon il s'ouvre puis se ferme)
      if(snap.exists()){
        const d = snap.data();
        setEtatChoice(d.etatChoice || {});
        setProgress(d.progress || {});
        setReleaseNotes(Array.isArray(d.releaseNotes)?d.releaseNotes:null);
        setReleaseSelection(d.releaseSelection||null);
        setClientPresence(d.clientPresence || {});
        setClosurePeriods(d.closurePeriods || []);
        { // v146.18 : états personnalisés (enregistrés avant le rendu) ; un nouvel état est visible d'emblée dans les filtres
          const list=Array.isArray(d.customEtats)?d.customEtats:[];
          const before=new Set(ALL_ETATS);
          registerEtatEdits(d.etatEdits||{});setEtatEdits(d.etatEdits||{}); // v230
          registerCustomEtats(list);
          const added=ALL_ETATS.filter(e=>!before.has(e));
          if(added.length)setSelEtats(prev=>new Set([...prev,...added]));
          setCustomEtats(list);
        }
        setCertifs(Array.isArray(d.certifCatalog)?d.certifCatalog:[]);
        {const cc=Array.isArray(d.composantCatalog)?d.composantCatalog:[];setDefaultComposants(cc);setCompCatalog(cc);}
        setProductionExclusions(d.productionExclusions || {});
      }
    }, (err)=>{
      console.error("Erreur Firestore (overrides):", err);
      setOverridesLoaded(true);
    });
    return ()=>unsub();
  },[authUid,setSelEtats]); // v261 : setSelEtats vient de useListFilters (stable)

  const setCompCatalogAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { composantCatalog:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement de la liste des composants : " + e.message);
      return false;
    }
  },[]);

  const setCertifsAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { certifCatalog:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement des certifications : " + e.message);
      return false;
    }
  },[]);
  const setEtatEditsAndSave=useCallback(async next=>{ // v230 : remplace tout l'objet (un état rétabli disparaît)
    try{
      await updateDoc(OVERRIDES_DOC_REF(), { etatEdits:next });
      return true;
    }catch(e){
      try{ await setDoc(OVERRIDES_DOC_REF(), { etatEdits:next }, { merge:true }); return true; }
      catch(e2){ console.error(e2); notify("Erreur lors de l'enregistrement des états : " + e2.message); return false; }
    }
  },[]);
  const setCustomEtatsAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { customEtats:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement des états : " + e.message);
      return false;
    }
  },[]);

  const setClosurePeriodsAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { closurePeriods:next }, { merge:true });
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement : " + e.message);
    }
  },[]);

  // Exclusion/réactivation de plusieurs jours d'un coup (clic-glisser dans le mini-calendrier Production).
  // On applique tous les jours en une seule écriture : des appels successifs repartiraient du même état « productionExclusions »
  // (fermeture figée) et seul le dernier jour serait enregistré (défaut de l'ancienne gestion « période »). entries = { pj: [dateIso, …] }.
  const setProductionExclusionDays=useCallback(async (entries,exclude)=>{
    const nextAll={...productionExclusions};
    Object.entries(entries).forEach(([pj,dates])=>{
      const cur=new Set(nextAll[pj]||[]);
      dates.forEach(d=>{if(exclude)cur.add(d);else cur.delete(d);});
      nextAll[pj]=[...cur].sort();
    });
    try{
      await setDoc(OVERRIDES_DOC_REF(), { productionExclusions:nextAll }, { merge:true });
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement : " + e.message);
    }
  },[productionExclusions]);

  // Lecture temps réel des commentaires par PJ
  useEffect(()=>{
    if(!authUid)return undefined; // v252 : pas de lecture avant la connexion
    const unsub = onSnapshot(COMMENTS_DOC_REF(), (snap)=>{
      if(snap.exists())setComments(snap.data().byPj || {});
    }, (err)=>{
      console.error("Erreur Firestore (comments):", err);
    });
    return ()=>unsub();
  },[authUid]);

  // Lecture temps réel du cache de synchro "Suivi ORC" (noms / pays / chefs de projet), partagé pour tous les utilisateurs
  // (Bouton « Sync depuis Suivi ORC » retiré du Manager pour l'instant — on garde seulement la lecture du cache déjà synchronisé.)
  useEffect(()=>{
    if(!authUid)return undefined; // v252 : pas de lecture avant la connexion
    const unsub = onSnapshot(PJ_META_SYNC_DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d=snap.data();
        setSyncedPjMeta(d.meta||{});
      }
    }, (err)=>{
      console.error("Erreur Firestore (pjMetaSync):", err);
    });
    return ()=>unsub();
  },[authUid]);

  // Lecture temps réel des corrections manuelles de fiche projet (nom/pays/chef), saisies dans l'app.
  // Prioritaires sur la synchro Suivi ORC — c'est la dernière main humaine sur la donnée.
  const [pjOverridesState,setPjOverridesState]=useState({});
  useEffect(()=>{
    if(!authUid)return undefined; // v252 : pas de lecture avant la connexion
    const unsub = onSnapshot(PJ_META_OVERRIDES_DOC_REF(), (snap)=>{
      const v=snap.exists()?(snap.data().meta||{}):{};
      setPjMetaOverrides(v);
      setPjOverridesState(v);
    }, (err)=>{
      console.error("Erreur Firestore (pjMetaOverrides):", err);
    });
    return ()=>unsub();
  },[authUid]);
  // V146.1 — Cash in lu en temps réel (super admin uniquement) : alimente les jalons de paiement des fiches, rapports CODIR / CDP et l'avancement.
  // Sans accès (autre compte, règles Firestore) : on vide le magasin, les jalons saisis à la main restent la référence.
  useCashinSync(canCash,currentUser); // v261 : Cash in en temps réel (useAppData.js)
  // N'écrit QUE les champs modifiés du PJ concerné (chemin meta.<PJ>.<champ>, valeur remplacée en bloc). Avant, on réécrivait
  // toute la table des PJ depuis l'état local : deux enregistrements rapprochés (saisie en série, collage de plusieurs
  // N° de série) pouvaient s'écraser l'un l'autre avec des valeurs périmées, et un feu effacé restait en base (fusion profonde).
  // En cas d'échec (document absent, règles…), on retombe sur l'ancienne écriture.
  const [savedAt,setSavedAt]=useState(null); // v123 : heure du dernier enregistrement d'infos projet réussi
  const savePjMetaOverride=useCallback(async (pj,fields)=>{
    try{
      const args=[];
      Object.entries(fields).forEach(([k,v])=>{args.push(new FieldPath("meta",pj,k),v===undefined?deleteField():v);});
      await updateDoc(PJ_META_OVERRIDES_DOC_REF(),...args);
      setSavedAt(new Date());
      return true;
    }catch(e0){
      const next={...pjOverridesState,[pj]:{...(pjOverridesState[pj]||{}),...fields}};
      try{
        await setDoc(PJ_META_OVERRIDES_DOC_REF(), { meta:next }, { merge:true });
        setSavedAt(new Date());
        return true;
      }catch(e){
        console.error(e);
        notify("Erreur lors de l'enregistrement des infos projet : " + e.message);
        return false;
      }
    }
  },[pjOverridesState]);

  // v146.18 : plusieurs PJ en UNE écriture ({PJ:{champ:valeur}}), pour la saisie groupée (actions, mitigations, statuts)
  const savePjMetaMulti=useCallback(async patches=>{
    const entries=Object.entries(patches||{});
    if(!entries.length)return true;
    try{
      const args=[];
      entries.forEach(([pj,fields])=>Object.entries(fields).forEach(([k,v])=>{args.push(new FieldPath("meta",pj,k),v===undefined?deleteField():v);}));
      await updateDoc(PJ_META_OVERRIDES_DOC_REF(),...args);
      setSavedAt(new Date());
      return true;
    }catch(e0){
      const next={...pjOverridesState};
      entries.forEach(([pj,fields])=>{next[pj]={...(next[pj]||{}),...fields};});
      try{await setDoc(PJ_META_OVERRIDES_DOC_REF(),{meta:next},{merge:true});setSavedAt(new Date());return true;}
      catch(e){console.error(e);notify("Erreur lors de l'enregistrement sur plusieurs projets : "+e.message);return false;}
    }
  },[pjOverridesState]);

  const addComment=useCallback(async (pj,author,text,linkedDate,isPrivate,mentions)=>{
    if(!author.trim()||!text.trim())return false;
    const current=comments[pj]||[];
    const mn=withChef(mentions,chefOfRef.current(pj).account,currentUser&&currentUser.email); // v154 : le chef de projet est toujours prévenu
    const next=[...current,{author:author.trim(),text:text.trim(),date:new Date().toISOString(),linkedDate:linkedDate||null,private:!!isPrivate,...(mn.length?{mentions:mn}:{})}];
    const nextAll={...comments,[pj]:next};
    try{
      await setDoc(COMMENTS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[comments,currentUser]);

  // v148 : la personne taguée marque la demande « traitée » (ou la rouvre)
  useEffect(()=>{if(view!=="manager")setManagerJump(null);},[view]);
  // v176 : bouton « Fiche synthèse » de la fiche projet (admins) — ouvre le PJ dans Manager › Fiche, comme la cloche des mentions.
  const pinOkRef=useRef(pinOk);pinOkRef.current=pinOk;
  useEffect(()=>{const h=e=>{const pj=e.detail&&e.detail.pj;if(!pj||!pinOkRef.current)return;setCalSel(null);setManagerJump({pj,n:Date.now()});setManagerTab("fiche");setView("manager");};window.addEventListener("enogia:openSynthese",h);return()=>window.removeEventListener("enogia:openSynthese",h);},[]);
  // v153 : registre des comptes déjà connectés au site (planning/knownUsers) → personnes que l'on peut taguer avec @
  const [knownUsers,setKnownUsers]=useState([]);
  useEffect(()=>{
    if(!currentUser||!currentUser.email)return;
    const ref=doc(db,"planning","knownUsers");
    const email=lcMention(currentUser.email);
    setDoc(ref,{byEmail:{[userKey(email)]:{email,name:currentUser.displayName||"",at:new Date().toISOString()}}},{merge:true}).catch(e=>console.warn("knownUsers (écriture) :",e&&e.message));
    return onSnapshot(ref,snap=>{const b=(snap.data()||{}).byEmail||{};setKnownUsers(Object.values(b));},e=>console.warn("knownUsers (lecture) :",e&&e.message));
  },[currentUser]);
  // v154 : chef de projet d'un PJ et son compte (s'il s'est déjà connecté ou s'il est manager déclaré) ; les managers ne sont plus proposés dans la saisie @
  const dataRef=useRef(data);dataRef.current=data;
  const peopleAll=useMemo(()=>peopleOptions(knownUsers,managerEmails,currentUser&&currentUser.email,currentUser&&currentUser.displayName,profiles),[knownUsers,managerEmails,currentUser,profiles]);
  const chefOfRef=useRef(()=>({name:"",account:null}));
  chefOfRef.current=pj=>{const row=dataRef.current.find(r=>r.pj===pj);const name=row?(getPjMeta(pj,row).chefProjet||""):"";return{name,account:chefAccount(name,peopleAll)};};
  const mentionCtx=useMemo(()=>({options:peopleOptions(knownUsers,[],currentUser&&currentUser.email,currentUser&&currentUser.displayName,profiles),me:lcMention(currentUser&&currentUser.email),chefOf:pj=>chefOfRef.current(pj)}),[knownUsers,currentUser,profiles]);
  const resolveComment=useCallback(async (pj,idx,email,on,field)=>{ // v271 : field = "seen" pour « Vu »
    const nextAll={...comments,[pj]:setCommentResolved(comments[pj]||[],idx,email,on,new Date().toISOString(),field||"resolved")};
    try{await setDoc(COMMENTS_DOC_REF(),{byPj:nextAll},{merge:true});return true;}
    catch(e){console.error(e);notify("Erreur lors de l'enregistrement : "+e.message);return false;}
  },[comments]);

  // Ajoute le même commentaire à plusieurs PJ à la fois (ex. décalage affectant toute une ligne de projets)
  const addCommentMulti=useCallback(async (pjList,author,text,linkedDate,isPrivate,mentions)=>{
    if(!author.trim()||!text.trim()||!pjList||pjList.length===0)return false;
    const groupId=pjList.length>1?(Date.now()+"-"+Math.random().toString(36).slice(2,7)):null;
    const nextAll={...comments};
    pjList.forEach(pj=>{
      const current=nextAll[pj]||comments[pj]||[];
      nextAll[pj]=[...current,{author:author.trim(),text:text.trim(),date:new Date().toISOString(),linkedDate:linkedDate||null,private:!!isPrivate,groupId,groupPjs:pjList.length>1?pjList:null,...(()=>{const mn=withChef(mentions,chefOfRef.current(pj).account,currentUser&&currentUser.email);return mn.length?{mentions:mn}:{};})()}];
    });
    try{
      await setDoc(COMMENTS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[comments,currentUser]);

  // v252 (demandé : « les admins peuvent supprimer des commentaires ») : plus de code Manager, une simple confirmation suffit
  const deleteComment=useCallback(async (pj,index)=>{
    if(!isSuperAdmin()){notify("La suppression est réservée aux admins.");return false;}
    const current=comments[pj]||[];
    const next=current.filter((_,i)=>i!==index);
    const nextAll={...comments,[pj]:next};
    try{
      await setDoc(COMMENTS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de la suppression : " + e.message);
      return false;
    }
  },[comments]);

  // Lecture temps réel des allocations de retard par PJ
  const delays=useDelays(authUid); // v261 : useAppData.js

  const {turbineDoc,saveTurbines}=useTurbineDoc(pinOk,authorName); // v261 : useAppData.js
  // v154 : Manager › Tests (testeurs, affectations, tests FAT) — v261 : useAppData.js
  const {testsDoc,testsLoaded,saveTests}=useTestsDoc(currentUser,authorName);
  // v188 : profils (rôle → accueil, PJ associés), lus par tous les comptes connectés, modifiés depuis le Manager
  useEffect(()=>{
    if(!currentUser)return undefined;
    return onSnapshot(PROFILES_DOC_REF(),snap=>{const d=snap.exists()?snap.data():{};setProfiles({...d,byEmail:d.byEmail&&typeof d.byEmail==="object"?d.byEmail:{}});},err=>console.warn("profiles (lecture) :",err&&err.message));
  },[currentUser]);
  // v229 : disposition de l'accueil d'un poste (réglée par le propriétaire, la même pour toutes les personnes du poste)
  // v235 : disposition des cadrans des autres pages (KPI › Synthèse, Tests…), partagée par tous, réglée par le propriétaire seul
  const savePageLayout=useCallback((id,lay)=>{setProfiles(p=>{const next={...p,pageLayouts:{...((p&&p.pageLayouts)||{}),[id]:lay}};setDoc(PROFILES_DOC_REF(),{pageLayouts:next.pageLayouts,updatedAt:new Date().toISOString(),updatedBy:authorName||""},{merge:true}).catch(e=>{console.error(e);notify("Erreur lors de l'enregistrement de la disposition : "+e.message);});return next;});},[authorName]);
  const arrangeCtx=useMemo(()=>({layouts:(profiles&&profiles.pageLayouts)||{},save:isOwner?savePageLayout:null}),[profiles,isOwner,savePageLayout]);
  const saveHomeLayout=useCallback((role,lay)=>{setProfiles(p=>{const next={...p,homeLayouts:{...((p&&p.homeLayouts)||{}),[role]:lay}};setDoc(PROFILES_DOC_REF(),{homeLayouts:next.homeLayouts,updatedAt:new Date().toISOString(),updatedBy:authorName||""},{merge:true}).catch(e=>{console.error(e);notify("Erreur lors de l'enregistrement de la disposition : "+e.message);});return next;});},[authorName]);
  // v242 : vidéo de présentation (profiles.tutoVideo) — proposée une fois à la connexion ; v243 : revue depuis la cloche (sans compteur) jusqu'à la date de fin
  const tutoCfg=profiles&&profiles.tutoVideo,tutoOn=tutoActive(tutoCfg);
  const [tutoOpen,setTutoOpen]=useState(false);
  // v252 (retour : « la vidéo de la première connexion ne pouvait pas se fermer ») : ouverte d'elle-même, tutoOpen valait déjà false ;
  // « Fermer » ne changeait donc aucun état et la page ne se redessinait pas. tutoClosedId retient la vidéo fermée dans cette session.
  const [tutoClosedId,setTutoClosedId]=useState(null);
  const closeTuto=useCallback(()=>{setTutoOpen(false);setTutoClosedId((tutoCfg&&tutoCfg.id)||"x");if(currentUser)markTutoSeen(tutoCfg,currentUser.email);},[tutoCfg,currentUser]);
  const saveProfiles=useCallback(async next=>{
    try{await setDoc(PROFILES_DOC_REF(),{...next,updatedAt:new Date().toISOString(),updatedBy:authorName||""});return true;}
    catch(e){console.error(e);notify("Erreur lors de l'enregistrement des profils : "+e.message);return false;}
  },[authorName]);
  // v188 : nouvelles affectations aux tests depuis le dernier « Vu » (mémorisé sur ce poste, par compte)
  const assignSeenKey="enogia_assign_seen_"+String((currentUser&&currentUser.email)||"").toLowerCase();
  const [assignSeen,setAssignSeen]=useState(()=>{try{return localStorage.getItem(assignSeenKey)||"";}catch(e){return "";}});
  useEffect(()=>{try{setAssignSeen(localStorage.getItem(assignSeenKey)||"");}catch(e){}},[assignSeenKey]);
  const myNewAssign=useMemo(()=>{const t=testerOfEmail(testsDoc,currentUser&&currentUser.email);return t?assignmentsSince(testsDoc,t.id,assignSeen):[];},[testsDoc,currentUser,assignSeen]);
  const seeAssign=()=>{const v=new Date().toISOString();setAssignSeen(v);try{localStorage.setItem(assignSeenKey,v);}catch(e){}};
  // v189 : tracés de signature des fiches de test, un document par PJ (planning/testsign_<PJ>) pour ne pas alourdir planning/tests
  const signApi=useMemo(()=>({
    load:async pj=>{const snap=await getDoc(doc(db,"planning",DOC_PFX+"testsign_"+pj));return snap.exists()?snap.data():{};},
    save:async(pj,key,entry)=>{try{await setDoc(doc(db,"planning",DOC_PFX+"testsign_"+pj),{[key]:entry},{merge:true});return true;}catch(e){console.error(e);notify("Erreur lors de l'enregistrement de la signature : "+e.message);return false;}},
  }),[]);
  // Page « Tests » (rail de gauche) : administrateurs + testeurs de la liste (adresse renseignée) ; les testeurs consultent seulement
  // v238 : le responsable des testeurs (rôle « resptest » dans Personnes et rôles) voit et renseigne les tests de tous les testeurs
  const isTestLead=accMe?accAt("tests","w"):(!!currentUser&&profileOf(profiles,currentUser.email).role==="resptest");
  const canSeeTests=!!((accMe?accAt("tests","r"):pinOk)||isTestLead||testerOfEmail(testsDoc,currentUser&&currentUser.email));
  const testsAdmin=accMe?accAt("tests","a"):pinOk;
  useEffect(()=>{if(view==="tests"&&testsLoaded&&!canSeeTests)setView("table");},[view,testsLoaded,canSeeTests]); // accès retiré ou ancien choix mémorisé
  // v226 : Production turbines — v261 : useAppData.js
  const {prodDoc,prodApi}=useProdTurbines(currentUser,authorName);
  const myMail=String((currentUser&&currentUser.email)||"").toLowerCase();
  const canProdTurbL=!!(isOwner||(prodDoc&&Array.isArray(prodDoc.access)&&prodDoc.access.map(x=>String(x).toLowerCase()).includes(myMail)));
  // v262 : Achats / Appro — propriétaire et adresses de sa liste « access » (Achats › Réglages)
  // v308 : sous-pages — subOk("page.sous-page") ; sans accès activés, tout est ouvert comme avant
  const subOk=id=>!accMe||atLeast(accMe[id]||"n","r");
  const canProdTurb=accMe?accAt("turbines","r"):canProdTurbL;
  const {achatsDoc,achatsApi}=useAchats(currentUser,authorName);
  const canAchatsL=!!(isOwner||(achatsDoc&&Array.isArray(achatsDoc.access)&&achatsDoc.access.map(x=>String(x).toLowerCase()).includes(myMail)));
  const canAchats=accMe?accAt("achats","r"):canAchatsL,achEdit=accMe?accAt("achats","w"):canAchatsL;
  const planOk=accMe?accAt("planning","r"):true,comOk=accMe?accAt("comments","r"):true;
  const projOk=accMe?accAt("projets","r"):pinOk,pilOk=accMe?accAt("pilotage","r"):pinOk,calOk=accMe?accAt("calprod","r"):pinOk,mgrOk=projOk||pilOk||calOk;

  // Lecture temps réel des types de retard génériques (configurables par le Manager)
  useEffect(()=>{
    if(!authUid)return undefined; // v252 : pas de lecture avant la connexion
    const unsub = onSnapshot(DELAY_TYPES_DOC_REF(), (snap)=>{
      if(snap.exists()&&Array.isArray(snap.data().types)&&snap.data().types.length>0){
        setDelayTypes(snap.data().types);
      }
    }, (err)=>{
      console.error("Erreur Firestore (delayTypes):", err);
    });
    return ()=>unsub();
  },[authUid]);

  // Lecture temps réel de la liste des emails autorisés à l'espace Manager
  useEffect(()=>{
    if(!authUid)return undefined; // v252 : pas de lecture avant la connexion
    const unsub = onSnapshot(MANAGER_EMAILS_DOC_REF(), (snap)=>{
      if(snap.exists()&&Array.isArray(snap.data().emails)){
        setManagerEmails(snap.data().emails);
      }
    }, (err)=>{
      console.error("Erreur Firestore (managerEmails):", err);
    });
    return ()=>unsub();
  },[authUid]);

  const setManagerEmailsAndSave=useCallback(async next=>{
    try{
      await setDoc(MANAGER_EMAILS_DOC_REF(), { emails:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement de la liste des accès Manager : " + e.message);
      return false;
    }
  },[]);

  const addDelayAllocation=useCallback(async (pj,type,days,note,author)=>{
    if(!type||!days||isNaN(days))return false;
    const current=delays[pj]||[];
    const entry={id:Date.now()+"-"+Math.random().toString(36).slice(2,7),type,days:Math.round(Number(days)),note:(note||"").trim(),author:(author||"").trim(),date:new Date().toISOString()};
    const nextAll={...delays,[pj]:[...current,entry]};
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement du retard : " + e.message);
      return false;
    }
  },[delays]);

  // Alloue la même cause de retard (même type, mêmes jours) à plusieurs PJ à la fois — ex. un décalage qui affecte toute une ligne de projets.
  // Les entrées partagent un groupId/groupPjs, exactement comme les commentaires groupés, pour un traçage identique.
  const addDelayAllocationMulti=useCallback(async (pjList,type,days,note,author)=>{
    if(!type||!days||isNaN(days)||!pjList||pjList.length===0)return false;
    const groupId=pjList.length>1?(Date.now()+"-"+Math.random().toString(36).slice(2,7)):null;
    const nextAll={...delays};
    pjList.forEach(pj=>{
      const current=nextAll[pj]||delays[pj]||[];
      nextAll[pj]=[...current,{id:Date.now()+"-"+Math.random().toString(36).slice(2,7)+"-"+pj,type,days:Math.round(Number(days)),note:(note||"").trim(),author:(author||"").trim(),date:new Date().toISOString(),groupId,groupPjs:pjList.length>1?pjList:null}];
    });
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement du retard : " + e.message);
      return false;
    }
  },[delays]);

  const deleteDelayAllocation=useCallback(async (pj,id,pin)=>{
    if(!isSuperAdmin()){notify("La suppression est réservée au super admin.");return false;}
    if(pin!==PIN){notify("Code incorrect.");return false;}
    const current=delays[pj]||[];
    const next=current.filter(d=>d.id!==id);
    const nextAll={...delays,[pj]:next};
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de la suppression : " + e.message);
      return false;
    }
  },[delays]);

  // Vrai fil de discussion sur une cause de retard précise (au-delà de la note initiale) :
  // suivi des relances, réponses fournisseur, etc. au fil du temps.
  const addDelayComment=useCallback(async (pj,delayId,author,text)=>{
    if(!author.trim()||!text.trim())return false;
    const current=delays[pj]||[];
    const next=current.map(d=>d.id===delayId?{...d,comments:[...(d.comments||[]),{author:author.trim(),text:text.trim(),date:new Date().toISOString()}]}:d);
    const nextAll={...delays,[pj]:next};
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[delays]);

  const deleteDelayComment=useCallback(async (pj,delayId,idx,pin)=>{
    if(!isSuperAdmin()){notify("La suppression est réservée au super admin.");return false;}
    if(pin!==PIN){notify("Code incorrect.");return false;}
    const current=delays[pj]||[];
    const next=current.map(d=>d.id===delayId?{...d,comments:(d.comments||[]).filter((_,i)=>i!==idx)}:d);
    const nextAll={...delays,[pj]:next};
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de la suppression : " + e.message);
      return false;
    }
  },[delays]);

  const setDelayTypesAndSave=useCallback(async next=>{
    try{
      await setDoc(DELAY_TYPES_DOC_REF(), { types:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement des types de retard : " + e.message);
      return false;
    }
  },[]);

  const setClientPresenceFor=useCallback(async (pj,value)=>{
    const next={...clientPresence,[pj]:value};
    try{
      await setDoc(OVERRIDES_DOC_REF(), { clientPresence:next }, { merge:true });
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement : " + e.message);
    }
  },[clientPresence]);

  // v146.10 : « Production ENOGIA » (PROD) est remplacée par Montage / Élec / Tests / Packaging ; l'ancien état est converti à l'affichage
  // d'après l'avancement saisi (< 40 % Montage, < 80 % Élec, < 90 % Tests, sinon Packaging).
  const etatChoiceEff=useMemo(()=>{const o={};Object.keys(etatChoice).forEach(k=>{o[k]=normalizeEtat(etatChoice[k],progress[k]);});return o;},[etatChoice,progress]);
  const setEtatFor=useCallback(async (pj,etat)=>{
    const next={...etatChoice,[pj]:etat};
    try{
      await setDoc(OVERRIDES_DOC_REF(), { etatChoice:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement : " + e.message);
      return false;
    }
  },[etatChoice]);
  const saveReleaseNotes=useCallback(async list=>{await setDoc(OVERRIDES_DOC_REF(), { releaseNotes:list }, { merge:true });},[]);
  // v146.16 : catalogue des nouveautés — la sélection est mémorisée sur le site courant ; la publication va dans le document de la PRODUCTION
  // (planning/overrides, sans préfixe « beta_ ») : sur le site bêta comme sur la production, c'est là que le pop-up est lu par les utilisateurs.
  const saveReleaseSelection=useCallback(async sel=>{await setDoc(OVERRIDES_DOC_REF(), { releaseSelection:sel }, { merge:true });},[]);
  const publishRelease=useCallback(async (rel,sel)=>{
    const ref=doc(db,"planning","overrides");
    const snap=await getDoc(ref);
    const prev=snap.exists()&&Array.isArray(snap.data().releaseNotes)?snap.data().releaseNotes:[];
    // une préparation (off) précédente est remplacée par la nouvelle ; la sélection suit pour pouvoir la retoucher depuis la production
    await setDoc(ref,{ releaseNotes:[rel,...prev.filter(r=>r&&r.id!==rel.id&&!(rel.replaceCode&&r.replaceCode&&r.off)).slice(0,9)], ...(sel?{releaseSelection:sel}:{}) },{ merge:true });
  },[]);
  const [savingProgress,setSavingProgress]=useState(false);
  const [progressSaved,setProgressSaved]=useState(false);
  const saveProgress=useCallback(async ()=>{
    setSavingProgress(true);
    try{
      await setDoc(OVERRIDES_DOC_REF(), { progress }, { merge:true });
      setProgressSaved(true);
      setTimeout(()=>setProgressSaved(false),2500);
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement : " + e.message);
    }
    setSavingProgress(false);
  },[progress]);

  // GARANTIE (demandé : « même si je fais un import de planning je souhaite que ça ne change rien » pour
  // les MAJ faites sur le site) : un import n'écrit QUE le document des lignes du planning (dates, noms
  // MS Project). Tout ce qui est saisi dans l'app — pays, chef de projet, nom, gamme (pjMetaOverrides),
  // état, avancement, présence aux tests, jours de production, retards, commentaires — vit dans des
  // documents Firestore séparés, clés par n° de PJ, et passe toujours PAR-DESSUS les données importées.
  // v217 (demandé : « quand je fais un import, ça vérifie automatiquement s'il y a de nouveaux projets ? ») : après l'import du
  // planning, les PJ absents du planning initial (base des dérives) sont signalés, avec un bouton pour les y ancrer.
  const [newVsInitial,setNewVsInitial]=useState(null),[initialAddFromImport,setInitialAddFromImport]=useState(null);
  const initialPjsRef=useRef(new Set()); initialPjsRef.current=new Set(initialData.map(r=>r.pj));
  // v231 (demandé : « je ne veux plus faire d'import MS Project, tout se fait sur le site ») : plus d'import du planning ;
  // le planning actuel (planning/current) est la référence et ne change plus que par « Publier » dans le Planificateur.

  const handleInitialImport=useCallback(async rows=>{
    setInitialImporting(true);
    try{
      const lastImportStr=new Date().toLocaleString("fr-FR");
      await setDoc(INITIAL_DOC_REF(), { rows, lastImport: lastImportStr });
      // Pas besoin de setInitialData ici : onSnapshot va le faire automatiquement
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'enregistrement du planning initial : " + e.message);
    }
    setInitialImporting(false);
  },[]);

  // AJOUT au planning initial (nouveau, ne remplace pas l'import initial ci-dessus) : n'ajoute que les
  // PJ absents — ceux déjà ancrés ne sont jamais modifiés. On relit le document juste avant d'écrire
  // (pas l'état local, qui peut être en retard) et on garde une copie de l'initial précédent.
  const handleInitialAdd=useCallback(async (newRows,fixRows=[])=>{
    setInitialImporting(true);
    try{
      const snap=await getDoc(INITIAL_DOC_REF());
      const cur=snap.exists()?snap.data():{};
      const curRows=cur.rows||[];
      const have=new Set(curRows.map(r=>r.pj));
      const stamp=new Date().toLocaleString("fr-FR");
      const added=newRows.filter(r=>!have.has(r.pj)).map(r=>({...r,anchoredAt:stamp}));
      // Correction explicite (cochée un par un) de PJ déjà ancrés : on remet les dates du fichier comme référence initiale
      const fixMap=new Map((fixRows||[]).filter(r=>have.has(r.pj)).map(r=>[r.pj,r]));
      if(added.length===0&&fixMap.size===0){setInitialImporting(false);return;}
      const nextRows=curRows.map(r=>fixMap.has(r.pj)?{...r,...fixMap.get(r.pj),anchoredAt:stamp,correctedAt:stamp}:r);
      try{await setDoc(doc(db,"planning",DOC_PFX+"initialBackup"),{rows:curRows,lastImport:cur.lastImport||null,savedAt:stamp,reason:"avant "+(added.length?"ajout de "+added.length+" projet(s)":"")+(added.length&&fixMap.size?" et ":"")+(fixMap.size?"correction de "+fixMap.size+" PJ":"")});}
      catch(e){console.warn("Sauvegarde de l'initial impossible (l'ajout continue, rien n'est écrasé) :",e);}
      await setDoc(INITIAL_DOC_REF(),{...cur,rows:[...nextRows,...added],lastImport:cur.lastImport||stamp,lastAdd:stamp});
    }catch(e){
      console.error(e);
      notify("Erreur lors de l'ajout au planning initial : "+e.message);
    }
    setInitialImporting(false);
  },[]);

  const {allPJs,allProjets,allPays,allChefs}=useMemo(()=>filterOptions(data),[data]); // v261 : listFilters.js

  // L'état affiché vient exclusivement du choix manuel du Manager (etatChoice), sinon "À définir"
  const initialByPj=useMemo(()=>{const m={};initialData.forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const dataWithOverrides=useMemo(()=>data.filter(r=>!(r&&isEstimatePj(r.pj))).map(r=>{ // v239 : les PJXX ne s'affichent nulle part
    const ini=initialByPj[r.pj];
    let drift=null;
    if(ini&&ini.depart&&r.depart){
      drift=Math.round((new Date(r.depart)-new Date(ini.depart))/86400000);
    }
    let etat=normalizeEtat(etatChoice[r.pj]||r.etat||"A_DEFINIR",progress[r.pj]);
    if(!ETAT_META[etat])etat="A_DEFINIR"; // état personnalisé supprimé depuis
    // Un slot libre n'est pas encore une machine : pas de gamme tant qu'on n'a pas désigné le projet.
    const gamme=etat==="SLOT_LIBRE"?"":((pjOverridesState[r.pj]&&pjOverridesState[r.pj].gamme)||GAMME_OVERRIDE[r.pj]||r.gamme);
    return{...r,etat,clientPresence:clientPresence[r.pj]||null,drift,gamme};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }),[data,etatChoice,progress,clientPresence,initialByPj,pjOverridesState,customEtats,etatEdits]); // customEtats / etatEdits : ETAT_META (global) change avec lui
  // Avancement effectif : calculé pour Montage / Élec / Tests / Packaging / Expédiée, saisi à la main pour les autres états.
  const progressEff=useMemo(()=>buildProgress(progress,dataWithOverrides),[progress,dataWithOverrides]);

  // V146.2 : liste des PJ de l'ordo (hors slots libres) pour le rapprochement Cash in ↔ ordo
  useEffect(()=>{const rows=dataWithOverrides.filter(r=>r&&r.pj&&r.etat!=="SLOT_LIBRE");const names={};rows.forEach(r=>{names[r.pj]=getPjMeta(r.pj,r).nomProjet||"";});setOrdoPjs(rows.map(r=>r.pj),names);},[dataWithOverrides]);
  const filtered=useMemo(()=>filterRows(dataWithOverrides,{selEtats,selGammes,selPJs,selProjets,selPays,selChefs,onlyDrift,onlyChanged,selMoisArrivee,selMoisTests,selMoisFinProd,selMoisDepart},changeMarks),[dataWithOverrides,selEtats,selGammes,selPJs,selProjets,selPays,selChefs,onlyDrift,onlyChanged,changeMarks,selMoisArrivee,selMoisTests,selMoisFinProd,selMoisDepart]);

  const VIEWS=[{id:"home",icon:"home",l:"Aujourd'hui"},{id:"table",icon:"list",l:"Liste"},{id:"gantt",icon:"gantt",l:"Gantt"},{id:"calendar",icon:"calendar",l:"Calendrier"},{id:"changes",icon:"changes",l:"Modifications"},{id:"comments",icon:"comments",l:"Commentaires"},...(canSeeTests?[{id:"tests",icon:"check",l:"Tests"}]:[]),...(isOwner?[{id:"planner",icon:"gantt",l:"Planificateur"}]:[]),...(canCash?[{id:"cashin",icon:"euro",l:"Cash in"}]:[]),...(canProdTurb?[{id:"turbines",icon:"gauge",l:"Turbines"}]:[]),...(canAchats?[{id:"achats",icon:"inbox",l:"Achats / Appro"}]:[])]; // v204 : planificateur réservé au propriétaire ; v217 (demandé : « Cash in et Turbines doivent ouvrir une nouvelle page, pas les pages du Manager ») : pages à part entière
  // v304 (maquette « menu par métier » validée) : un seul menu en trois rubriques — Travailler, Suivre, Régler. Planning réunit Liste,
  // Gantt, Calendrier, Planificateur et Modifications ; l'Espace Manager disparaît du menu : ses pages vont dans Projets, Pilotage et Régler.
  const PLANNING_VIEWS=["table","gantt","calendar","planner","changes"];
  const planViewOk=v=>v==="planner"?isOwner:subOk("planning."+v); // v308
  // v307 : sous-pages de Tests et de Turbines choisies depuis le menu ou le sélecteur de la page
  const [testsSub,setTestsSub]=useState("semaine");
  const [testsFocus,setTestsFocus]=useState(null);
  const [pendingDeparts,setPendingDeparts]=useState({}); // v312 // v310 : PJ à ouvrir dans Tests depuis sa fiche
  const [turbTab,setTurbTab]=useState(()=>{try{const v=localStorage.getItem("enogia_turbines_tab");return v==="orc"?"orc":"prod";}catch(e){return "prod";}});
  const lastPlanRef=useRef("table");/* v305 */if(PLANNING_VIEWS.includes(view))lastPlanRef.current=view;
  const firstPlanView=()=>["table","gantt","calendar","changes"].find(planViewOk)||"home";
  const turbEdit=accMe?atLeast(accMe["turbines."+turbTab]||"n","w"):canProdTurbL; // v308 : modifier la sous-page affichée
  const testsAllowed=["semaine","testers","catalog","checklists"].filter(id=>subOk("tests."+id)&&(id==="semaine"||id==="testers"||testsAdmin));
  const turbAllowed=["prod","orc"].filter(id=>subOk("turbines."+id));
  const MGR_SUB={fiche:"projets.fiche",hebdo:"projets.hebdo",serie:"projets.serie",orc:"projets.serie",derives:"pilotage.kpi",retards:"pilotage.retards",retardsKpi:"pilotage.retards"};
  const mgrHidden=accMe?Object.keys(MGR_SUB).filter(t=>!subOk(MGR_SUB[t])):[];
  const goMgr=t=>()=>{setManagerTab(t);setView("manager");};
  const mgrOn=tabs=>view==="manager"&&tabs.includes(managerTab);
  // v315 : S/N prévus d'après l'ordo (serialNumbers.js) — affichés partout tant qu'ils ne sont pas fixés
  const snPlan=useMemo(()=>planSerials(dataWithOverrides,r=>getPjMeta(r.pj,r)),[dataWithOverrides,pjOverridesState]); // eslint-disable-line react-hooks/exhaustive-deps -- relu quand les fiches changent
  registerSerialPlan(snPlan);
  // v315 (revue, point 6 « une seule boîte de réception ») : demandes à valider de la page « À traiter » (selon les droits)
  const inboxActions=useMemo(()=>{
    const out=[],todayK=new Date().toISOString().slice(0,10),fr=s=>s?String(s).slice(0,10).split("-").reverse().join("/"):"";
    if(canEditMeta&&savePjMetaOverride){const due=serialsDue(snPlan);if(due.length)out.push({id:"sn",n:due.length,primary:true,title:due.length+" machine"+(due.length>1?"s arrivées":" arrivée")+" sans S/N",detail:"S/N prévus d'après l'ordo (année d'arrivée · n° dans l'année · gamme). Une fois attribués, ils ne bougent plus.",
      items:due.map(x=>({pj:x.pj,text:x.missingCode?"gamme sans code : à saisir":x.sn})),cta:{label:"Attribuer les S/N",onClick:()=>assignSerialsFlow(due,savePjMetaOverride).then(n=>{if(n)notify(n+" S/N attribué"+(n>1?"s":"")+".","ok");})}});}
    const pend=Object.keys(pendingDeparts||{});
    if(isOwner&&pend.length)out.push({id:"dep",n:pend.length,tone:"warn",title:pend.length+" départ"+(pend.length>1?"s changés":" changé")+" hors planificateur",detail:"Ils seront repris dans le plan à l'ouverture du planificateur.",items:pend.map(pj=>({pj,text:fr(pendingDeparts[pj].date)+(pendingDeparts[pj].by?" · "+pendingDeparts[pj].by:"")})),cta:{label:"Ouvrir le planificateur",onClick:()=>setView("planner")}});
    if(canAchats&&achatsDoc&&achatsDoc.po){const late=Object.values(achatsDoc.po).filter(p=>p&&!p.annule&&p.statut!=="livre"&&p.dateLivraison&&String(p.dateLivraison).slice(0,10)<todayK);
      if(late.length)out.push({id:"po",n:late.length,tone:"warn",title:late.length+" commande"+(late.length>1?"s":"")+" (PO) en retard de livraison",detail:late.slice(0,6).map(p=>(p.numero||"PO")+" · prévue le "+fr(p.dateLivraison)).join(" · "),cta:{label:"Ouvrir Achats / Appro",onClick:()=>setView("achats")}});}
    if(canProdTurb&&prodDoc&&subOk("turbines.orc")){try{const lateN=buildNeeds(prodDoc,dataWithOverrides,x=>getPjMeta(x.pj,x)).needs.filter(n=>n.late);
      if(lateN.length)out.push({id:"turb",n:lateN.length,tone:"warn",title:lateN.length+" besoin"+(lateN.length>1?"s":"")+" turbine en retard",detail:"La turbine sera disponible après la date du besoin.",items:lateN.filter(n=>n.pj).map(n=>({pj:n.pj,text:"besoin le "+fr(n.date)})),cta:{label:"Ouvrir Turbines › Besoins",onClick:()=>{setTurbTab("orc");setView("turbines");}}});}catch(e){console.warn(e);}}
    return out;
  },[snPlan,canEditMeta,pendingDeparts,isOwner,canAchats,achatsDoc,canProdTurb,prodDoc,dataWithOverrides,accMe]); // eslint-disable-line react-hooks/exhaustive-deps
  const inboxN=useMemo(()=>{const me=mentionCtx.me;const m=me?openMentionsFor(comments,me).filter(x=>(pinOk||!x.c.private)&&!isSeenFor(x.c,me)).length:0;return m+(myNewAssign||[]).length+inboxActions.reduce((a,x)=>a+(x.n||1),0);},[comments,mentionCtx,pinOk,myNewAssign,inboxActions]);
  const NAV_TREE=[
    {g:"Opérations",items:[
      {id:"home",l:"Aujourd'hui",icon:"home",on:view==="home",go:()=>setView("home")},
      {id:"inbox",l:"À traiter",icon:"bell",on:view==="inbox",go:()=>setView("inbox")},
      ...(planOk?[{id:"planning",l:"Planning",icon:"gantt",on:PLANNING_VIEWS.includes(view),go:()=>setView(planViewOk(lastPlanRef.current)?lastPlanRef.current:firstPlanView()),badge:unseenChanges.length,
        subs:[["table","Liste"],["gantt","Gantt"],["calendar","Calendrier"],...(isOwner?[["planner","Planificateur"]]:[]),["changes","Modifications"]].filter(([id])=>planViewOk(id)).map(([id,l])=>({id,l,on:view===id,go:()=>setView(id)}))}]:[]),
      ...(canSeeTests?[{id:"tests",l:"Tests",icon:"check",on:view==="tests",go:()=>setView("tests"),
        subs:[["semaine","Par semaine"],["testers","Par testeur"],["catalog","Catalogue"],["checklists","Checklists"]].filter(([id])=>testsAllowed.includes(id)).map(([id,l])=>({id,l,on:view==="tests"&&testsSub===id,go:()=>{setTestsSub(id);setView("tests");}}))}]:[]),
      ...(canProdTurb?[{id:"turbines",l:"Turbines",icon:"gauge",on:view==="turbines",go:()=>setView("turbines"),
        subs:[["prod","Production"],["orc","Besoins ORC et SAV"]].filter(([id])=>turbAllowed.includes(id)).map(([id,l])=>({id,l,on:view==="turbines"&&turbTab===id,go:()=>{setTurbTab(id);setView("turbines");}}))}]:[]),
      ...(canAchats?[{id:"achats",l:"Achats / Appro",icon:"inbox",on:view==="achats",go:()=>setView("achats")}]:[])]},
    {g:"Gestion",items:[
      ...(projOk?[{id:"projets",l:"Projets",icon:"manager",on:mgrOn(["fiche","hebdo","serie","orc"]),go:goMgr(["fiche","hebdo","serie"].find(t=>!mgrHidden.includes(t))||"fiche"),
        subs:[["fiche","Fiches projet"],["hebdo","Point hebdo"],["serie","Machines ORC"]].filter(([id])=>!mgrHidden.includes(id)).map(([id,l])=>({id,l,on:mgrOn(id==="serie"?["serie","orc"]:[id]),go:goMgr(id)}))}]:[]),
      ...(canCash?[{id:"cashin",l:"Finance",icon:"euro",on:view==="cashin",go:()=>setView("cashin")}]:[]),
      ...(pilOk?[{id:"pilotage",l:"Pilotage",icon:"chart",on:mgrOn(["derives","retards","retardsKpi"]),go:goMgr((isOwner||accMe)&&!mgrHidden.includes("derives")?"derives":"retards"),
        subs:[...(isOwner||accMe?[["derives","KPI"]]:[]),["retards","Retards"]].filter(([id])=>!mgrHidden.includes(id)).map(([id,l])=>({id,l,on:mgrOn(id==="retards"?["retards","retardsKpi"]:[id]),go:goMgr(id)}))}]:[]),
      ...(comOk?[{id:"comments",l:"Commentaires",icon:"comments",on:view==="comments",go:()=>setView("comments")}]:[])]},
    {g:"Administration",items:[
      ...(calOk?[{id:"calprod",l:"Calendrier de production",icon:"calendar",on:mgrOn(["production","vacances"]),go:goMgr("production")}]:[]),
      ...(isOwner?[{id:"people",l:"Personnes et site",icon:"settings",on:mgrOn(["personnes","acces","nouveautes"]),go:goMgr("personnes")},{id:"access",l:"Accès",icon:"lock",on:view==="access",go:()=>setView("access")}]:[])]},
  ].filter(g=>g.items.length);

  // v159 : menu principal libellé (réductible, mémorisé) + recherche « Aller à… » (Ctrl K) sur toutes les pages
  // v191 (demandé : « l'onglet à gauche doit se masquer automatiquement ») : menu réduit par défaut, il s'ouvre par-dessus la page au survol
  // (ou au clavier) et se referme en sortant ; le bouton du bas l'épingle ouvert (enogia_nav_pin).
  // v195 (demandé : « garder la mini-barre en auto ; la flèche du bas ouvre la barre en entier ») : plus d'ouverture au survol.
  // La flèche ouvre le menu complet par-dessus la page ; il se replie seul quand on choisit une page ou quand la souris le quitte.
  const [navPeek,setNavPeek]=useState(false),navPeekT=useRef(0);
  // v204 : plan de l'onglet Planificateur (planning/plan, préfixe beta_ en bêta), lu seulement quand l'onglet est ouvert par le propriétaire
  const [planDoc,setPlanDoc]=useState(null),[planLoaded,setPlanLoaded]=useState(false);
  // v219 : le plan est aussi lu dans le Manager (charge des KPI d'après le planificateur)
  useEffect(()=>{if(!currentUser||!((isOwner&&view==="planner")||(pinOk&&(view==="manager"||view==="home"))))return undefined; // v229 : aussi l'accueil (charge atelier d'après le planificateur)
  return listenPlan(d=>{setPlanDoc(d);setPlanLoaded(true);});},[currentUser,isOwner,pinOk,view]);
  useEffect(()=>{if(view==="planner"&&currentUser&&!isOwner)setView("table");},[view,currentUser,isOwner]);
  useEffect(()=>{if(!currentUser)return;if(PLANNING_VIEWS.includes(view)&&planOk&&!planViewOk(view)){setView(firstPlanView());return;}if(view==="manager"&&mgrHidden.includes(managerTab)){const t=["fiche","hebdo","serie","derives","retards"].find(x=>!mgrHidden.includes(x));if(t&&mgrOk){setManagerTab(t);return;}}if(view==="tests"&&testsAllowed.length&&!testsAllowed.includes(testsSub))setTestsSub(testsAllowed[0]);if(view==="turbines"&&turbAllowed.length&&!turbAllowed.includes(turbTab))setTurbTab(turbAllowed[0]);if((view==="access"&&!isOwner)||(PLANNING_VIEWS.includes(view)&&!planOk)||(view==="comments"&&!comOk)||(view==="manager"&&!mgrOk)||(view==="cashin"&&!canCash)||(view==="turbines"&&prodDoc!==null&&!canProdTurb)||(view==="achats"&&achatsDoc!==null&&!canAchats))setView("home");},[view,currentUser,canCash,isOwner,prodDoc,canProdTurb,achatsDoc,canAchats,planOk,comOk,mgrOk]); // eslint-disable-line react-hooks/exhaustive-deps -- PLANNING_VIEWS est fixe
  const [cashFocusApp,setCashFocusApp]=useState(null); // v217 : PJ à afficher dans la page Cash in (depuis une fiche projet)
  // v231 (demandé : « toute machine déjà expédiée a déjà effectué ses tests ») : à l'affichage, une machine expédiée a ses tests
  // validés (forced.auto, « Machine expédiée ») ; rien n'est écrit en base (retiré par saveTests).
  // v254 (demandé : « quand mon projet, en tant que chef de projet, subit une modification, je devrais avoir une notification sur la cloche ») :
  // PJ dont je suis chef (rôle « chef de projet » de Personnes et rôles, ou mon nom en chef / chef ORC) touchés par une publication du
  // planning depuis mon dernier « Vu » (par défaut : 14 derniers jours). Comptés dans la pastille ; « Vu » les retire (mémorisé sur ce poste).
  const chgSeenKey="enogia_mypjchg_seen_"+String((currentUser&&currentUser.email)||"").toLowerCase();
  const [chgSeen,setChgSeen]=useState(()=>{try{return localStorage.getItem(chgSeenKey)||"";}catch(e){return "";}});
  useEffect(()=>{try{setChgSeen(localStorage.getItem(chgSeenKey)||"");}catch(e){}},[chgSeenKey]);
  const myPjChanges=useMemo(()=>{
    if(!currentUser||!Array.isArray(changeLog)||!changeLog.length)return [];
    const email=currentUser.email||"",pr=profileOf(profiles,email),low=s=>String(s||"").toLowerCase().trim();
    const mine=new Set(pr?pjsOfProfile(pr,dataWithOverrides):[]),nm=low((pr&&pr.name)||authorName);
    if(nm)dataWithOverrides.forEach(x=>{const m=getPjMeta(x.pj,x);if([...chefsOf(m),...orcChefsOf(m)].some(c=>low(c)===nm))mine.add(x.pj);});
    if(!mine.size)return [];
    const since=chgSeen||new Date(Date.now()-14*864e5).toISOString(),out=[];
    changeLog.forEach(e=>{if(!e||!e.at||e.at<=since)return;(e.pjs||[]).forEach(p=>{if(mine.has(p.pj)&&!out.some(o=>o.pj===p.pj))out.push({pj:p.pj,at:e.at,isNew:!!p.isNew,delta:p.departDelta||0,nom:p.nomProjet||""});});});
    return out;
  },[currentUser,changeLog,profiles,dataWithOverrides,authorName,chgSeen]);
  const seePjChanges=()=>{const v=new Date().toISOString();setChgSeen(v);try{localStorage.setItem(chgSeenKey,v);}catch(e){}};
  const testsView=useMemo(()=>{const plans={...((testsDoc&&testsDoc.plans)||{})};(dataWithOverrides||[]).forEach(r=>{if(!r||r.etat!=="SHIPPED")return;const p=plans[r.pj]||{};if(p.forced&&p.forced.at)return;plans[r.pj]={...p,forced:{at:String(r.depart||r.testsFin||r.tests||new Date().toISOString()).slice(0,10),by:"Machine expédiée",auto:true}};});return{...testsDoc,plans};},[testsDoc,dataWithOverrides]);
  // v312 (demandé : « changer les dates de départ directement sur Liste, Gantt ou Calendrier ; accès aux admins ») : admins du planning (pinOk)
  const onSetDepart=pinOk?(async(pj,iso)=>{try{await setDepartDate(pj,iso,authorName);notify("Départ de "+pj+" : "+iso.split("-").reverse().join("/")+". Il sera repris dans le planificateur.","ok");}catch(e){notify("Départ non enregistré : "+e.message);}}):null;
  const pjCtxTests=canSeeTests?testsView:null,pjCtx=useMemo(()=>({setDepart:onSetDepart,testsDoc:pjCtxTests,turbineDoc,prodDoc:canProdTurb&&subOk("turbines.orc")?prodDoc:null,achatsDoc:canAchats?achatsDoc:null,rows:dataWithOverrides,
    testsOk:canSeeTests&&testsAllowed.includes("semaine"),
    openPage:(v,sub)=>{if(v==="turbines"&&sub)setTurbTab(sub);if(v==="tests"){setTestsSub("semaine");if(sub)setTestsFocus({pj:sub,n:Date.now()});}setCalSel(null);setView(v);}}),[pjCtxTests,turbineDoc,canProdTurb,prodDoc,canAchats,achatsDoc,dataWithOverrides,accMe,canSeeTests,pinOk,authorName]); // eslint-disable-line react-hooks/exhaustive-deps -- v309 : turbine et achats dans la fiche d'un PJ // v203 : pastilles de la fiche d'un PJ // v196 : entrées du Manager affichées dans ce menu (fournies par ManagerPanel)
  const closePeek=delay=>{clearTimeout(navPeekT.current);navPeekT.current=setTimeout(()=>setNavPeek(false),delay||0);};
  // v306 (maquette v306-navigation, choix « 1 ») : menu masqué comme la barre des tâches Windows — caché, il glisse par-dessus la page
  // quand la souris touche le bord gauche (zone de 8 px), quand on clique ☰ ou avec Ctrl + B ; il se cache 0,35 s après qu'on l'a quitté.
  // « Épingler le menu » le garde ouvert à gauche (enogia_nav_pin2). Plus de barre d'icônes de 64 px.
  const [navPin,setNavPin0]=useState(()=>{try{return localStorage.getItem("enogia_nav_pin2")==="1";}catch(e){return false;}});
  const setNavPin=v=>{setNavPin0(v);try{localStorage.setItem("enogia_nav_pin2",v?"1":"0");}catch(e){}};
  const navOpen=navPin||navPeek;
  useEffect(()=>{const f=e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&String(e.key).toLowerCase()==="b"&&loggedIn&&!navPin){e.preventDefault();clearTimeout(navPeekT.current);setNavPeek(v=>!v);}};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f);},[loggedIn,navPin]);
  useEffect(()=>{const f=e=>{if(e.ctrlKey||e.metaKey||e.altKey||!["table","gantt","calendar","changes"].includes(view))return;const t=e.target,tag=t&&t.tagName;if(t&&(t.isContentEditable||/^(INPUT|SELECT|TEXTAREA)$/.test(tag)))return;if(document.querySelector('[aria-modal="true"]'))return;const v={"1":"table","2":"gantt","3":"calendar"}[e.key];if(v&&v!==view){e.preventDefault();setView(v);}};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f);},[view]); // v306 : touches 1, 2, 3 = Liste, Gantt, Calendrier
  // v306 : sous-pages d'une entrée dépliées au survol (en plus de celles de la page active)
  const [navHover,setNavHover]=useState(null),navHoverT=useRef(0);
  const navOverlay=!navPin;
  const navCompact=false; // dans l'espace Manager, un seul menu large : celui du Manager
  const [navPal,setNavPal]=useState(false);
  useEffect(()=>{const f=e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&String(e.key).toLowerCase()==="k"&&view!=="manager"&&loggedIn){e.preventDefault();setNavPal(o=>!o);}};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f);},[view,loggedIn]);
  const palettePjs=useMemo(()=>dataWithOverrides.filter(r=>r&&r.pj).map(r=>({pj:r.pj,etat:r.etat,nomProjet:getPjMeta(r.pj,r).nomProjet||""})),[dataWithOverrides]);
  const navGroups=NAV_TREE.map(g=>({label:g.g,entries:g.items.flatMap(it=>[{id:it.id,label:it.l,icon:it.icon,hint:"",go:it.go},...(it.subs||[]).map(sb=>({id:it.id+"-"+sb.id,label:it.l+" › "+sb.l,icon:it.icon,hint:"",go:sb.go}))])}));
  if(!authChecked)return null; // évite un flash de l'écran de connexion pendant la vérification initiale
  if(!loggedIn) return <LoginScreen/>;
  // Fond flouté réel (demandé explicitement : "un transparent flou ... la vision en flou derrière
  // de la première page") plutôt qu'un fond plat à formes décoratives : l'écran de connexion reste
  // monté en dessous, et LoginTransition n'est plus qu'un calque "verre dépoli" (backdrop-filter)
  // superposé par-dessus, qui laisse donc transparaître — flouté — ce qu'il y a vraiment derrière.
  if(justLoggedIn) return (<><LoginScreen/><LoginTransition name={authorName}/></>);

  return(<MentionCtx.Provider value={mentionCtx}><ChangeMarksContext.Provider value={changeMarks}><div className="enogia-fade-in enogia-shell" style={{fontFamily:T.font,fontSize:FZ.md,background:T.surface,minHeight:"100vh",color:T.ink900,display:"flex"}}>
    <style>{"*{box-sizing:border-box;}"}</style>
    <Toaster/>
    {presentation&&<button onClick={()=>setPresentation(false)} title="Quitter le mode présentation (Échap)" className="enogia-btn-tap" style={{position:"fixed",right:16,bottom:16,zIndex:10010,border:"none",borderRadius:999,padding:"8px 16px",background:T.ink900,color:T.surface,fontFamily:T.font,fontSize:FZ.xs,fontWeight:700,cursor:"pointer",boxShadow:T.shadowFloat}}>Mode présentation · Quitter (Échap)</button>}
    {screenOpen&&<React.Suspense fallback={null}><WorkshopScreen data={dataWithOverrides} productionExclusions={productionExclusions} closurePeriods={closurePeriods} changeLog={changeLog} darkMode={darkMode} onClose={()=>setScreenOpen(false)}/></React.Suspense>}
    {loggedIn&&!justLoggedIn&&!screenOpen&&overridesLoaded&&unseenReleases.length>0&&<ReleasePopup releases={unseenReleases} userName={authorName} onClose={markReleasesSeen}/>}
    {loggedIn&&!justLoggedIn&&!screenOpen&&tutoOn&&(tutoOpen||(overridesLoaded&&unseenReleases.length===0&&currentUser&&tutoClosedId!==((tutoCfg&&tutoCfg.id)||"x")&&!tutoSeen(tutoCfg,currentUser.email)))&&<TutoVideoModal cfg={tutoCfg} onClose={closeTuto}/>}
    {noticeOpen&&!screenOpen&&overridesLoaded&&!unseenReleases.length&&unseenChanges.length>0&&<ChangesPopup entries={unseenChanges} userName={authorName} onLater={closeNoticeLater} onRead={()=>{markChangesSeen();setNoticeOpen(false);}} onOpen={()=>{setNoticeOpen(false);setView("changes");}}/>}

    {/* ── Rail de navigation : icônes de vue + accès Manager + mode sombre ── */}
    <a href="#enogia-main" className="enogia-skip" onClick={e=>{e.preventDefault();const m=document.getElementById("enogia-main");if(m){m.focus();m.scrollIntoView&&m.scrollIntoView({block:"start"});}}}>Aller au contenu</a>
    {!navPin&&<div aria-hidden="true" onMouseEnter={()=>{clearTimeout(navPeekT.current);setNavPeek(true);}} style={{position:"fixed",left:0,top:0,bottom:0,width:8,zIndex:29}}/>}
    {!navPin&&!navPeek&&<span aria-hidden="true" style={{position:"fixed",left:0,top:"50%",transform:"translateY(-50%)",width:4,height:56,borderRadius:"0 4px 4px 0",background:NAV.mark==="currentColor"?T.accent:NAV.mark,opacity:.55,zIndex:29,pointerEvents:"none"}}/>}
    <div style={{width:navPin?216:0,flexShrink:0,position:"relative",zIndex:30}}>
    <nav className={"enogia-nav"+(NAV.industrial?" enogia-nav-ind":"")} aria-label="Pages" onMouseEnter={()=>clearTimeout(navPeekT.current)} onMouseLeave={()=>{clearTimeout(navHoverT.current);setNavHover(null);if(navPeek)closePeek(350);}} onKeyDown={e=>{if(e.key==="Escape"&&navPeek)setNavPeek(false);}} style={{width:216,boxShadow:navOverlay&&navPeek?"12px 0 40px rgba(0,0,0,.35)":"none",transform:navOpen?"none":"translateX(-100%)",visibility:navOpen?"visible":"hidden",transition:"transform .22s var(--e-ease), box-shadow .22s ease, visibility 0s linear "+(navOpen?"0s":".22s"),flexShrink:0,background:NAV.bg,borderRight:"1px solid "+NAV.border,display:"flex",flexDirection:"column",alignItems:navCompact?"center":"stretch",padding:navCompact?"16px 0":"16px 10px",gap:4,position:navPin?"sticky":"fixed",top:0,left:0,zIndex:30,height:"100vh",overflowY:"auto",overflowX:"hidden",scrollbarWidth:"none"}}>
      {/* v179 (demandé : « le logo en haut à gauche pour avoir le début de la page au même niveau ») : le logo ouvre le menu, en blanc sur le marine. */}
      <button type="button" onClick={()=>setView("home")} aria-label={SITE_TITLE+" — accueil"} title="Accueil" style={{border:"none",background:"transparent",cursor:"pointer",padding:navCompact?"2px 0 10px":"2px 10px 12px",display:"flex",justifyContent:navCompact?"center":"flex-start",alignItems:"center",minHeight:44}}>
        <span style={{display:"flex",flexDirection:"column",alignItems:navCompact?"center":"flex-start",gap:6,minWidth:0}}>
        <img src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="" aria-hidden="true" width="105" height="42" style={{height:navCompact?24:34,width:"auto",maxWidth:navCompact?44:170,objectFit:"contain",objectPosition:"left center",filter:NAV.industrial||darkMode?"brightness(0) invert(1)":"none"}}/>
        {!navCompact&&<span style={{textAlign:"left",lineHeight:1.25}}><span style={{display:"block",fontFamily:T.fontDisplay,fontWeight:800,fontSize:14,letterSpacing:".02em",color:NAV.industrial?"#FFFFFF":T.ink900}}>{SITE_NAME} <Hl color={NAV.industrial?NAV.mark:T.amber500} style={{fontWeight:800,whiteSpace:"nowrap"}}>{SITE_SCOPE}</Hl></span><span style={{display:"block",fontSize:11,color:NAV.ink,marginTop:2,whiteSpace:"normal"}}>{SITE_SUB}</span></span>}
        </span>
      </button>
      {NAV_TREE.map(({g,items})=><React.Fragment key={g}>
        {!navCompact&&<div className="enogia-nav-grp" style={{fontSize:12,fontWeight:700,color:NAV.group,fontFamily:T.font,padding:"12px 10px 4px",whiteSpace:"nowrap"}}>{g}</div>}
        {navCompact&&<div className="enogia-nav-grp" style={{width:18,height:1,background:NAV.industrial?"rgba(255,255,255,.18)":T.line,margin:"4px 0"}}/>}
        {items.map(it=>{const on=it.on,showSubs=(on||navHover===it.id)&&it.subs&&it.subs.length>1;return(<React.Fragment key={it.id}>
          <button className="enogia-nav-btn e-hov e-hov-ink" data-on={on?"1":"0"} onClick={()=>{if(coarse&&!on&&it.subs&&it.subs.length>1&&navHover!==it.id){setNavHover(it.id);return;}it.go();setNavPeek(false);}} title={it.l} aria-label={it.badge?it.l+", "+it.badge+" nouvelle"+(it.badge>1?"s":"")+" mise"+(it.badge>1?"s":"")+" à jour":it.l} aria-current={on?"page":undefined}
            style={{position:"relative",width:navCompact?40:"100%",height:40,borderRadius:navCompact?12:10,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:navCompact?"center":"flex-start",gap:12,padding:navCompact?0:"0 12px",background:on?NAV.bgOn:"transparent",color:on?NAV.inkOn:NAV.ink,fontFamily:T.font,fontSize:FZ.sm,fontWeight:on?700:500,whiteSpace:"nowrap",transition:"background .15s ease, color .15s ease","--nav-mark":NAV.mark,"--e-hov-bg":NAV.hover,"--e-hov-ink":NAV.hoverInk}}
            onMouseEnter={e=>{clearTimeout(navHoverT.current);if(it.subs&&it.subs.length>1){const id=it.id;navHoverT.current=setTimeout(()=>setNavHover(id),220);}}}
            onMouseLeave={()=>clearTimeout(navHoverT.current)}
            aria-expanded={it.subs&&it.subs.length>1?!!showSubs:undefined}>
            <NavIcon name={it.icon} size={19}/>{!navCompact&&<span className="enogia-nav-lab" style={{flex:1,textAlign:"left"}}>{it.l}</span>}{it.subs&&it.subs.length>1&&<span aria-hidden="true" style={{display:"inline-flex",opacity:.6,transform:showSubs?"rotate(0deg)":"rotate(-90deg)",transition:"transform .18s var(--e-ease)"}}><NavIcon name="chevronDown" size={13}/></span>}{it.id==="planning"&&<ChangesBadge n={unseenChanges.length}/>}{it.id==="inbox"&&inboxN>0&&<span aria-hidden="true" style={{minWidth:18,height:18,borderRadius:999,background:T.red600,color:T.card,fontSize:11,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 5px",fontFamily:T.font}}>{inboxN>99?"99+":inboxN}</span>}</button>
          {showSubs&&<div role="group" aria-label={"Pages de "+it.l} className="enogia-nav-subs" style={{display:"flex",flexDirection:"column",margin:"0 0 4px 30px",paddingLeft:8,borderLeft:"1px solid "+(NAV.industrial?"rgba(255,255,255,.16)":T.line)}}>
            {it.subs.map(sb=><button key={sb.id} type="button" className="enogia-nav-sub" onClick={()=>{sb.go();setNavPeek(false);}} aria-current={sb.on?"page":undefined}
              style={{border:"none",background:"transparent",textAlign:"left",cursor:"pointer",padding:"6px 8px",minHeight:30,borderRadius:8,fontFamily:T.font,fontSize:FZ.sm,fontWeight:sb.on?700:500,color:sb.on?NAV.inkOn:NAV.ink,whiteSpace:"nowrap"}}>{sb.l}</button>)}
          </div>}
        </React.Fragment>);})}
      </React.Fragment>)}
      <div style={{flex:1}}/>
      <button className="enogia-nav-btn e-hov" onClick={()=>setScreenOpen(true)} title="Écran atelier : diaporama plein écran pour un téléviseur" aria-label="Écran atelier" style={{width:navCompact?40:"100%",height:36,borderRadius:12,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:navCompact?"center":"flex-start",gap:12,padding:navCompact?0:"0 12px",background:"transparent",color:NAV.ink,fontFamily:T.font,fontSize:FZ.sm,fontWeight:500,whiteSpace:"nowrap","--e-hov-bg":NAV.hover}}><NavIcon name="screen" size={18}/>{!navCompact&&<span className="enogia-nav-lab">Écran atelier</span>}</button>
      <div style={{display:"flex",justifyContent:navCompact?"center":"flex-start",paddingLeft:navCompact?0:2}}><ThemePicker ink={NAV.industrial?NAV.ink:undefined} darkMode={darkMode} darkPref={darkPref} onDarkMode={setDarkMode} themeId={themeId} onPick={setThemeId} density={density} onDensity={setDensityState} presentation={presentation} onPresentation={setPresentation}/></div>
      <button type="button" className="enogia-nav-toggle" onClick={()=>{setNavPin(!navPin);setNavPeek(false);}} aria-pressed={navPin} title={navPin?"Masquer le menu au bord gauche":"Garder le menu ouvert"} style={{width:"100%",minHeight:32,marginTop:4,border:"1px solid "+(navPin?NAV.mark==="currentColor"?T.accent:NAV.mark:(NAV.industrial?"rgba(255,255,255,.18)":T.line)),background:navPin?(NAV.industrial?"rgba(244,211,94,.14)":T.accentSoft):(NAV.industrial?"transparent":T.card),borderRadius:8,display:"flex",justifyContent:"center",alignItems:"center",gap:8,color:navPin?NAV.inkOn:NAV.ink,cursor:"pointer",fontFamily:T.font,fontSize:FZ.xs,fontWeight:600}}><NavIcon name="pin" size={14}/>{navPin?"Détacher le menu":"Épingler le menu"}</button>
    </nav>
    </div>
    {navPal&&<ManagerPalette groups={navGroups} data={palettePjs} activeKey={view+":"} storageKey="enogia_nav_recent" onGo={f=>f()} onOpenPj={pj=>setCalSel(pj)} onClose={()=>setNavPal(false)}/>}

    {/* ── Colonne principale ── */}
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
      {IS_BETA&&<BetaBanner canCopy={isOwner}/>}

      {/* Barre de marque — fine, claire, sans dégradé : l'identité tient au logo + à la typo, pas à un bloc de couleur */}
      {/* v179 : le logo passe en haut du menu (même ligne de départ que la page) ; la barre ne garde que les outils, sans fond ni filet. */}
      <div role="banner" className={"enogia-bar"+(hdrHidden?" is-hidden":"")} style={{flexShrink:0,minHeight:44,display:"flex",alignItems:"center",gap:12,padding:"6px 28px 0",background:"transparent",flexWrap:"wrap",position:"sticky",top:0,zIndex:25,pointerEvents:hdrHidden?"none":"auto"}}>
        {!navPin&&<button type="button" onClick={()=>{clearTimeout(navPeekT.current);setNavPeek(v=>!v);}} aria-label="Menu (Ctrl + B)" title="Menu (Ctrl + B)" aria-expanded={navPeek} style={{border:"none",background:"transparent",width:34,height:34,borderRadius:8,display:"inline-grid",placeItems:"center",color:T.ink700,cursor:"pointer",marginLeft:-10}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>}
        <div className="enogia-bar-right" aria-hidden={hdrHidden?"true":undefined} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",opacity:hdrHidden?0:1,transform:hdrHidden?"translateY(-6px)":"none",visibility:hdrHidden?"hidden":"visible",transition:"opacity .25s ease, transform .25s var(--e-ease), visibility 0s linear "+(hdrHidden?".25s":"0s")}}>
          {pinOk&&<div className="enogia-bar-meta" style={{display:"flex",alignItems:"baseline",gap:10,fontSize:FZ.xs}}>
            {/* v233 (demandé : « supprimer ») : plus de « N unités · Mis à jour le … · N PJ modifiés » dans la barre */}
            {savedAt&&<span role="status" aria-live="polite" style={{color:T.emerald600||T.ink500,fontSize:FZ.xs,fontFamily:T.font,textAlign:"right"}}>✓ Enregistré à {String(savedAt.getHours()).padStart(2,"0")+":"+String(savedAt.getMinutes()).padStart(2,"0")}</span>}
          </div>}
          {currentUser&&<div className="enogia-hide-phone" style={{width:1,height:22,background:T.line}}/>}
          {currentUser&&<button onClick={()=>setNavPal(true)} title="Aller à… (Ctrl K)" aria-label="Aller à… (Ctrl K)" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:32,padding:0,border:"1px solid transparent",borderRadius:8,cursor:"pointer",background:"transparent",color:T.ink500}} onMouseEnter={e=>{e.currentTarget.style.background=T.surfaceAlt;e.currentTarget.style.color=T.ink900;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.ink500;}}><NavIcon name="search" size={18}/></button>}
          {currentUser&&<MentionBell onGoInbox={()=>setView("inbox")} extra={inboxActions.reduce((a,x)=>a+(x.n||1),0)} pjChanges={myPjChanges} onSeenPjChanges={seePjChanges} onOpenChanges={()=>setView("changes")} video={tutoOn?tutoCfg:null} onOpenVideo={()=>setTutoOpen(true)} assignments={myNewAssign} onSeenAssign={seeAssign} onOpenTests={()=>setView("tests")} comments={comments} me={mentionCtx.me} data={dataWithOverrides} resolveComment={resolveComment} canSeePrivate={pinOk} onOpen={(pj,tab)=>{setCalDay(null);setCalTab(tab||"resume");setCalSel(pj);}}/>} {/* v270 (demandé : « quand on clique sur une notification de commentaire, ouvrir la fiche pop-up à l’endroit des commentaires ») */}
          {currentUser&&<UserChip user={currentUser} onSignOut={()=>signOut(auth)} role={isOwner?"Super admin":accMe?null:pinOk?"Admin":null}/>}
        </div>
      </div>

      <PjDialogCtx.Provider value={pjCtx}><ProdDocCtx.Provider value={prodDoc}>
      <main id="enogia-main" tabIndex={-1} className="enogia-main" style={{padding:D.main,flex:1,outline:"none",...backdropStyle(view)}}><ArrangeCtx.Provider value={arrangeCtx}><React.Suspense fallback={<LoadingSkeleton/>}>
        {newVsInitial&&pinOk&&<div role="status" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12,padding:"10px 14px",borderRadius:12,background:T.teal100,color:T.teal600,fontFamily:T.font,fontSize:FZ.sm,fontWeight:600}}>
          <NavIcon name="pin" size={16}/>
          <span style={{flex:"1 1 320px"}}>{newVsInitial.pjs.length} PJ de cet import {newVsInitial.pjs.length>1?"ne sont pas":"n'est pas"} dans le planning initial : {newVsInitial.pjs.slice(0,6).join(", ")}{newVsInitial.pjs.length>6?"…":""}. Sans initial, leur dérive ne se calcule pas.</span>
          <button type="button" onClick={()=>{setInitialAddFromImport({rows:newVsInitial.rows,n:Date.now()});setNewVsInitial(null);setManagerTab(isOwner?"derives":"fiche");setView("manager");}} style={{border:"none",borderRadius:8,padding:"6px 12px",background:T.ink900,color:T.card,fontWeight:700,cursor:"pointer",fontFamily:T.font,minHeight:32}}>Les ancrer dans l'initial…</button>
          <button type="button" onClick={()=>setNewVsInitial(null)} style={{border:"1px solid "+T.line,borderRadius:8,padding:"6px 12px",background:T.card,color:T.ink700,fontWeight:700,cursor:"pointer",fontFamily:T.font,minHeight:32}}>Plus tard</button>
        </div>}
        {(syncLost||offline)&&<div role="alert" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12,padding:"10px 14px",borderRadius:12,background:T.amber100,borderLeft:"4px solid "+T.amber500,color:T.ink900,fontSize:FZ.sm,fontFamily:T.font}}>
          <NavIcon name="warning" size={18}/>
          <span style={{flex:1,minWidth:200}}>{offline?"Vous êtes hors ligne : les données affichées ne se mettent plus à jour.":"La connexion aux données a été interrompue : les informations affichées peuvent être anciennes."}</span>
          <button type="button" onClick={()=>window.location.reload()} className="enogia-btn-ind" style={{border:"1.5px solid "+T.teal500,background:"transparent",color:T.teal600,borderRadius:8,padding:"5px 12px",fontWeight:700,fontSize:FZ.xs,cursor:"pointer",fontFamily:T.font}}>Recharger</button>
        </div>}


    {loading?<div style={{position:"relative"}}><LoadingSkeleton variant={view==="home"?"home":undefined}/></div>:
    data.length===0?(
      <div className="enogia-float-in" style={{background:T.card,borderRadius:R.lg,boxShadow:T.shadowCard}}>
        <EmptyState icon="inbox" title="Aucune donnée pour l'instant" hint={pinOk?"Le planning se construit dans le Planificateur (Tests › Planificateur), puis « Publier ».":"Le planning sera visible dès qu'un administrateur l'aura importé."}/>
      </div>
    ):(
      <>
        {view==="manager"?(mgrOk?
          <div>
            <ManagerPanel hideTabs={mgrHidden} kpiOk={accMe?subOk("pilotage.kpi"):false} calOk={accMe?accAt("calprod","w"):false} planDoc={planDoc} initialAddFromImport={initialAddFromImport} changeLog={changeLog} data={dataWithOverrides} progress={progressEff} setProgress={setProgress} releases={releasesAll} saveReleaseNotes={saveReleaseNotes} releaseSelection={releaseSelection} saveReleaseSelection={saveReleaseSelection} publishRelease={publishRelease} isBeta={IS_BETA} initialData={initialData} lastInitialImport={lastInitialImport} lastInitialAdd={lastInitialAdd} onInitialImport={handleInitialImport} onInitialAdd={handleInitialAdd} initialImporting={initialImporting}
              etatChoice={etatChoiceEff} setEtatFor={setEtatFor} saveProgress={saveProgress} savingProgress={savingProgress} progressSaved={progressSaved}
              tab={managerTab} setTab={setManagerTab} jumpFiche={managerJump} clientPresence={clientPresence} setClientPresenceFor={setClientPresenceFor}
              closurePeriods={closurePeriods} setClosurePeriods={setClosurePeriodsAndSave}
              productionExclusions={productionExclusions} setProductionExclusionDays={setProductionExclusionDays} customEtats={customEtats} setCustomEtats={setCustomEtatsAndSave} etatEdits={etatEdits} setEtatEdits={setEtatEditsAndSave} certifs={certifs} setCertifs={setCertifsAndSave} compCatalog={compCatalog} setCompCatalog={setCompCatalogAndSave}
              comments={comments} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypesAndSave} addDelayAllocationMulti={addDelayAllocationMulti} deleteDelayAllocation={(pj,id)=>deleteDelayAllocation(pj,id,PIN)}
              turbineDoc={turbineDoc} saveTurbines={saveTurbines} onOpenCashPage={canCash?(pj=>{setCashFocusApp({pj,n:Date.now()});setView("cashin");}):null} managerEmails={managerEmails} setManagerEmails={setManagerEmailsAndSave} currentUserEmail={currentUser?.email} authorName={authorName} buildVersion={canEditMeta?APP_BUILD_VERSION:null} profiles={profiles} saveProfiles={saveProfiles} savePjMetaOverride={savePjMetaOverride} savePjMetaMulti={savePjMetaMulti} addCommentMulti={addCommentMulti} addComment={addComment} resolveComment={resolveComment} deleteComment={(pj,idx)=>deleteComment(pj,idx,PIN)}/>
          </div>
          :<ManagerAccessNotice email={currentUser?.email}/>)
        :(
          <div key={view} className="enogia-float-in">
            {/* allData (non filtré) pour le compteur "expédiées depuis le 1er janvier" : il ne doit
                jamais varier selon les filtres actifs sur la liste, demandé explicitement — seules
                les 4 répartitions en camembert, elles, continuent de suivre les filtres. */}
            {view!=="home"&&view!=="turbines"&&view!=="achats"&&(()=>{const v=VIEWS.find(x=>x.id===view);if(!v)return null; /* v262 : Production turbines et Achats / Appro ont leur propre en-tête (pages des kits) */
              const subs={planner:"Brouillon réservé à vous : déplacez, liez et forcez les PJ ; rien ne change pour les autres avant « Publier »",table:filtered.length+" machine"+(filtered.length>1?"s":"")+" affichée"+(filtered.length>1?"s":"")+" · "+((typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(hover: none)").matches)?"touchez":"survolez")+" un état ou un écart pour le détail",gantt:"Chaque machine, étape par étape · Ctrl + molette pour zoomer",calendar:"Arrivées, tests, fins de production et départs",changes:"Ce qui a changé à chaque mise à jour du planning",comments:"Les échanges, machine par machine",tests:"Plans d'essais et affectations des testeurs",cashin:"Encaissements et facturation des PJ",turbines:"Pool de turbines et attributions"};
              /* v183 : plus de sur-titre ; v185 : une couleur de trait par page (demandé) */const SS=stageSoft(),HH=stripeHues(),acc={table:SS.production.solid,gantt:SS.tests.solid,calendar:SS.finProd.solid,changes:T.ember500,comments:HH.note,tests:SS.arrivee.solid,planner:SS.production.solid,cashin:SS.finProd.solid,turbines:SS.depart.solid}[view];const inPlan=PLANNING_VIEWS.includes(view),PV=["table","gantt","calendar"].includes(view);
              return <PageHead title={PV?"Planning":v.l} sub={subs[view]} accent={acc} right={inPlan?<PlanSwitch label="Vue du planning" value={view} onGo={setView}
                views={[{id:"table",l:"Liste",icon:"list",key:"1"},{id:"gantt",l:"Gantt",icon:"gantt",key:"2"},{id:"calendar",l:"Calendrier",icon:"calendar",key:"3"}].filter(x=>planViewOk(x.id))}
                tools={[...(isOwner?[{id:"planner",l:"Planificateur",icon:"edit",hint:"Brouillon, puis « Publier »"}]:[]),...(planViewOk("changes")?[{id:"changes",l:"Modifications",icon:"changes",badge:unseenChanges.length,hint:"Ce qui a changé à chaque publication"}]:[])]}/>:undefined}/>;})()}
            {view==="inbox"&&currentUser&&<InboxPage me={mentionCtx.me} comments={comments} data={dataWithOverrides} resolveComment={resolveComment} canSeePrivate={pinOk} onOpen={(pj,tab)=>{setCalDay(null);setCalTab(tab||"resume");setCalSel(pj);}} actions={inboxActions} assignments={myNewAssign} onSeenAssign={seeAssign} onOpenTests={pj=>{setTestsSub("semaine");if(pj)setTestsFocus({pj,n:Date.now()});setView("tests");}} video={tutoOn?tutoCfg:null} onOpenVideo={()=>setTutoOpen(true)} pjChanges={myPjChanges} onSeenPjChanges={seePjChanges} onOpenChanges={()=>setView("changes")}/>}
            {view==="home"&&<HomeView pinOk={pinOk} testsDoc={canSeeTests?testsView:null} data={dataWithOverrides} comments={comments} myEmail={currentUser&&currentUser.email} myName={authorName} people={peopleAll} unseenChanges={unseenChanges} lastImport={lastImport} onOpenPj={setCalSel} onGo={setView} profiles={profiles} owner={isOwner} cash={canCash} turbineDoc={turbineDoc} onOpenCash={canCash?()=>setView("cashin"):null} prodDoc={prodDoc} canProdTurb={canProdTurb} productionExclusions={productionExclusions} plan={planDoc&&planDoc.plan} closurePeriods={closurePeriods} saveHomeLayout={isOwner?saveHomeLayout:null}/>}
            {view==="table"&&<DashboardSummary data={filtered} allData={dataWithOverrides} progress={progressEff} changeLog={changeLog} onOpenChanges={()=>setView("changes")}/>}
            {view==="table"&&<TableView data={filtered} progress={progressEff} df={df} setDf={setDf} onSetDepart={onSetDepart} setEtatFor={setEtatFor} setClientPresenceFor={setClientPresenceFor}
              selEtats={selEtats} setSelEtats={setSelEtats}
              selGammes={selGammes} setSelGammes={setSelGammes}
              allPJs={allPJs} selPJs={selPJs} setSelPJs={setSelPJs}
              allProjets={allProjets} selProjets={selProjets} setSelProjets={setSelProjets}
              allPays={allPays} selPays={selPays} setSelPays={setSelPays}
              allChefs={allChefs} selChefs={selChefs} setSelChefs={setSelChefs}
              selMoisArrivee={selMoisArrivee} setSelMoisArrivee={setSelMoisArrivee}
              selMoisTests={selMoisTests} setSelMoisTests={setSelMoisTests}
              selMoisFinProd={selMoisFinProd} setSelMoisFinProd={setSelMoisFinProd}
              selMoisDepart={selMoisDepart} setSelMoisDepart={setSelMoisDepart}
              comments={comments} addComment={addComment} deleteComment={deleteComment}
              pinOk={pinOk} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypesAndSave} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
              addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment}
              externalSel={tableJumpPj} setExternalSel={setTableJumpPj} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta} onlyDrift={onlyDrift} setOnlyDrift={setOnlyDrift} onlyChanged={onlyChanged} setOnlyChanged={setOnlyChanged}/>}
            {/* selEtats/selPJs (même état que la liste) pour afficher un filtre État + PJ directement
                dans la barre d'outils du Gantt (demandé explicitement) — partage le même état que la
                liste, donc filtrer ici filtre aussi la liste et inversement. */}
            {view==="gantt"&&<GanttView data={filtered} progress={progressEff} df={df}
              selEtats={selEtats} setSelEtats={setSelEtats} allPJs={allPJs} selPJs={selPJs} setSelPJs={setSelPJs}
              comments={comments} addComment={addComment} deleteComment={deleteComment}
              pinOk={pinOk} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypesAndSave} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
              addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta} closurePeriods={closurePeriods} productionExclusions={productionExclusions}/>}
            {/* Même filtre État + PJ que le Gantt (demandé explicitement : "le même format au même
                emplacement") — partage le même état que la liste/le Gantt, donc filtrer ici filtre
                aussi les autres vues et inversement. */}
            {view==="calendar"&&<CalendarView canEditDays={canEditMeta} setClosurePeriods={setClosurePeriodsAndSave} setProductionExclusionDays={setProductionExclusionDays} data={filtered} onSelectPj={(pj,day)=>{setCalSel(pj);setCalDay(day||null);}}
              mode={calMode} setMode={setCalMode} anchor={calAnchor} setAnchor={setCalAnchor}
              dayAnchor={calDayAnchor} setDayAnchor={setCalDayAnchor} closurePeriods={closurePeriods}
              productionExclusions={productionExclusions}
              zoomLevel={calZoom} setZoomLevel={setCalZoom}
              selEtats={selEtats} setSelEtats={setSelEtats} allPJs={allPJs} selPJs={selPJs} setSelPJs={setSelPJs}/>}
            {/* v204 (demandé : « un onglet uniquement pour moi, sous Tests ») : le module de planification (src/planner), brouillon séparé du planning ;
                « Publier » seul modifie le planning lu par tous. Liens entre PJ, dates imposées, une production / un banc à la fois, charge par semaine. */}
            {view==="access"&&isOwner&&<AccessPage profiles={profiles} saveProfiles={saveProfiles} accessDoc={accessDoc} saveAccess={saveAccess} people={peopleAll} ownerEmails={OWNER_EMAILS}/>}
            {view==="cashin"&&canCash&&<CashInTab authorName={authorName} focus={cashFocusApp} planRows={dataWithOverrides}/>}
            {view==="achats"&&canAchats&&<PageGuard name="Achats / Appro"><Achats doc={achatsDoc} api={achatsApi} rows={dataWithOverrides.map(r=>({pj:r.pj,nomProjet:getPjMeta(r.pj,r).nomProjet||"",gamme:r.gamme||"",etat:r.etat,arrivee:r.arrivee||null,depart:r.depart||null}))} canEdit={achEdit} owner={isOwner}/></PageGuard>}
            {/* v267 (demandé : « un seul onglet Turbines ») : production (seule saisie) + besoins des ORC (calculés) ; l'ancien pool n'est plus affiché */}
            {view==="turbines"&&canProdTurb&&<PageGuard name="Turbines"><TurbinesHub doc={prodDoc} api={prodApi} rows={dataWithOverrides} canEdit={turbEdit} owner={isOwner} tab={turbTab} onTab={setTurbTab} allowTabs={turbAllowed} savePjMeta={savePjMetaOverride}/></PageGuard>}
            {view==="planner"&&isOwner&&<PlannerView productionExclusions={productionExclusions} testers={testsDoc&&Array.isArray(testsDoc.testers)?testsDoc.testers:[]} planLoaded={planLoaded} planDoc={planDoc} rows={dataWithOverrides} closurePeriods={closurePeriods} authorName={authorName} pendingDeparts={pendingDeparts} onPendingApplied={clearPendingDeparts}
              onSavePlan={p=>savePlan(p,authorName)} onPublish={async(plan,note,announce)=>{const r=await publishPlan({plan,closurePeriods,productionExclusions,by:authorName,note,announce});/* v224 : un PJ publié depuis le planificateur et absent du planning initial → même bandeau qu’après un import (« Les ancrer dans l’initial ») */if(r&&r.rows&&initialPjsRef.current.size){const fresh=r.rows.filter(x=>x&&x.pj&&x.etat!=="SLOT_LIBRE"&&!isEstimatePj(x.pj)&&!initialPjsRef.current.has(x.pj));setNewVsInitial(fresh.length?{rows:r.rows,pjs:fresh.map(x=>x.pj)}:null);}return r;}} onLoadHistory={loadHistory} onRestorePublication={restorePublication}/>}
            {view==="tests"&&canSeeTests&&<TestsTab doc={testsView} save={saveTests} data={dataWithOverrides} certifs={certifs} canEdit={testsAdmin} lead={isTestLead} sub={testsSub} onSub={setTestsSub} allowSubs={testsAllowed} focusPj={testsFocus} me={currentUser&&currentUser.email} signApi={signApi}/>}
            {view==="changes"&&<ChangesView entries={changeLog} onOpenPj={jumpToPj}/>}
            {view==="comments"&&<CommentsView data={filtered} comments={comments} addComment={addComment} deleteComment={deleteComment}
              pinOk={pinOk} addCommentMulti={addCommentMulti} jumpToPj={jumpToPj} authorName={authorName} resolveComment={resolveComment}/>}
          </div>
        )}
      </>
    )}
    {/* v203 : fiche unique d'un PJ (même pop-up que la Liste et le Gantt) */}
    {calSel&&<PjDialog dayAction={calDay&&canEditMeta?(()=>{const off=((productionExclusions||{})[calSel]||[]).includes(calDay),lab=calDay.slice(8,10)+"/"+calDay.slice(5,7);return{off,label:off?"Rétablir la production le "+lab:"Pas de production le "+lab,hint:"Pour "+calSel+" seulement — le Gantt, la charge et le planificateur en tiennent compte",onToggle:()=>setProductionExclusionDays({[calSel]:[calDay]},!off)};})():null} pj={calSel} initialTab={calTab} resolveComment={resolveComment} data={dataWithOverrides} df={df} onClose={()=>{setCalSel(null);setCalDay(null);setCalTab("resume");}} comments={comments} addComment={addComment} deleteComment={deleteComment}
      pinOk={pinOk} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypesAndSave} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
      addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>}
      </React.Suspense></ArrangeCtx.Provider></main>
      </ProdDocCtx.Provider></PjDialogCtx.Provider>
    </div>
  </div></ChangeMarksContext.Provider></MentionCtx.Provider>);
}
