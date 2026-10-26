import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { db, auth, ALLOWED_EMAIL_DOMAIN } from "./firebase";
import { setResolved as setCommentResolved, peopleOptions, userKey, chefAccount, withChef, lc as lcMention } from "./mentions";
import { MentionCtx } from "./mentionContext";
import { MentionBell } from "./components/MentionBell";
import { TestsTab } from "./components/TestsTab";
import { testerOfEmail } from "./testPlan";
import { setDefaultComposants } from "./pjProgress";
import { doc, setDoc, getDoc, onSnapshot, updateDoc, FieldPath, deleteField } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "./styles.css";

import { T, setThemeMode, setDensity, D, mixHex, FZ, R, THEMES, DEFAULT_THEME } from "./theme";
import { ThemePicker } from "./components/ThemePicker";
import { setSuperAdmin, isSuperAdmin } from "./roles";
import { setCashinDoc, setCashinLinks, setOrdoPjs, getCashinDoc, getCashinLinks, getOrdoPjs, cashGroupsFor } from "./cashinLink";
import { useCashin } from "./useCashin";
import { CASHIN_DOC_REF, CASHIN_LINKS_REF, CASHIN_SHARED_REF, buildSharedCashin } from "./cashinData";
import { getPjMeta, ALL_GAMMES, ALL_ETATS, ETAT_META, registerCustomEtats, MONTHS, today, setSyncedPjMeta, setPjMetaOverrides, GAMME_OVERRIDE, EXCLUDED_CHEFS } from "./pjMeta";
import { weekStartOf } from "./parsers";
import { HomeView } from "./components/HomeView";
import { useA11yFallback } from "./a11yFallback";
import { ImportButton, ManagerAccessNotice, PIN, NavIcon, EmptyState, LoadingSkeleton, PageHead } from "./components/SharedUI";
import { GanttView } from "./components/GanttView";
import { ProjectModal } from "./components/ProjectModal";
import { CommentsView } from "./components/CommentsView";
import { TableView } from "./components/TableView";
import { CalendarView } from "./components/CalendarView";
import { ManagerPanel } from "./components/ManagerPanel";
import { ManagerPalette } from "./components/ManagerNav";
import { LoginScreen, LoginTransition } from "./components/LoginScreen";
import { DashboardSummary } from "./components/DashboardSummary";
import { ChangesView } from "./components/ChangesView";
import { WorkshopScreen } from "./components/WorkshopScreen";
import { normalizeEtat, buildProgress } from "./prodStages";
import { ReleasePopup, useUnseenReleases, mergeReleases } from "./components/ReleaseNotes";
import { ChangesPopup, ChangesBadge, useUnseenChanges, useChangeMarks, ChangeMarksContext } from "./components/ChangesNotice";
import { buildEntry, appendChangeLog, listenChangeLog } from "./changeLog";
import { saveBackup } from "./importBackups";

// ── Version bêta ────────────────────────────────────────────────────────────────────────────────────
// Build « bêta » (npm run deploy:beta) : mêmes écrans, mais TOUTES les données sont lues/écrites dans des documents
// distincts (préfixe beta_) → la production n'est jamais touchée par les essais. Le bouton du bandeau bêta copie la
// production vers la bêta. Build normal : préfixe vide, comportement strictement inchangé.
const IS_BETA=process.env.REACT_APP_BETA==="1";
const DOC_PFX=IS_BETA?"beta_":"";
if(IS_BETA&&typeof document!=="undefined")document.title="[BÊTA] Planning Ordonnancement ENOGIA";
const BETA_DOCS=["current","initial","overrides","comments","pjMetaSync","pjMetaOverrides","delays","delayTypes","managerEmails","changeLog","cashin","cashinLinks","turbines","tests"];
const DOC_REF=()=>doc(db,"planning",DOC_PFX+"current");
const INITIAL_DOC_REF=()=>doc(db,"planning",DOC_PFX+"initial");
const OVERRIDES_DOC_REF=()=>doc(db,"planning",DOC_PFX+"overrides");
const COMMENTS_DOC_REF=()=>doc(db,"planning",DOC_PFX+"comments");
const PJ_META_SYNC_DOC_REF=()=>doc(db,"planning",DOC_PFX+"pjMetaSync");
const PJ_META_OVERRIDES_DOC_REF=()=>doc(db,"planning",DOC_PFX+"pjMetaOverrides");
const DELAYS_DOC_REF=()=>doc(db,"planning",DOC_PFX+"delays");
const DELAY_TYPES_DOC_REF=()=>doc(db,"planning",DOC_PFX+"delayTypes");
const TURBINES_DOC_REF=()=>doc(db,"planning",DOC_PFX+"turbines"); // v146.22 : pool de turbines
const TESTS_DOC_REF=()=>doc(db,"planning",DOC_PFX+"tests"); // v154 : testeurs, affectations aux périodes de tests, catalogue FAT
const MANAGER_EMAILS_DOC_REF=()=>doc(db,"planning",DOC_PFX+"managerEmails");

// Types de retard génériques par défaut — éditables depuis le panel Manager (onglet Retards)
const DEFAULT_DELAY_TYPES=[
  "Retard paiement FNR","NC FNR","NC interne","Retard fournisseur",
  "Aléas planning client","Retard études","Manque de main d'œuvre","Autre",
];

const APP_BUILD_VERSION = "2026-10-26-v170-calendrier-clavier";

// Bandeau de la version bêta + copie « production → bêta » (écrase les données de la bêta, jamais celles de la production).
function BetaBanner({canCopy}){
  const [st,setSt]=useState("");
  const copy=async()=>{
    if(!window.confirm("Copier les données de la PRODUCTION vers la BÊTA ?\n\nLes données actuelles de la bêta seront remplacées. La production n'est pas modifiée."))return;
    setSt("Copie en cours…");let n=0;
    try{
      for(const name of BETA_DOCS){const snap=await getDoc(doc(db,"planning",name));if(snap.exists()){await setDoc(doc(db,"planning","beta_"+name),snap.data());n++;}}
      setSt("✓ "+n+" documents copiés depuis la production");
    }catch(e){console.error(e);setSt("Échec de la copie : "+e.message);}
    setTimeout(()=>setSt(""),8000);
  };
  return(<div style={{flexShrink:0,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",padding:"6px 28px",background:T.amber600,color:T.mode==="dark"?"#1B1405":"#fff",fontSize:FZ.sm,fontWeight:700,fontFamily:T.font}}>
    <span style={{letterSpacing:".08em"}}>VERSION BÊTA</span>
    <span style={{fontWeight:500,opacity:.95}}>Données de test séparées : rien de ce que vous faites ici n'affecte la production.</span>
    {canCopy&&<button onClick={copy} style={{marginLeft:"auto",padding:"4px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,.7)",background:"rgba(255,255,255,.15)",color:"#fff",fontWeight:700,fontSize:FZ.xs,cursor:"pointer",fontFamily:T.font}}>Copier la production vers la bêta</button>}
    {st&&<span style={{fontWeight:600}}>{st}</span>}
  </div>);
}

export default function App(){
  // Utilisateur connecté via Google, restreint aux comptes @enogia.com (null tant que non connecté).
  const [currentUser,setCurrentUser]=useState(null);
  const [authChecked,setAuthChecked]=useState(false); // évite un flash de l'écran de connexion pendant la vérification initiale

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,user=>{
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
  const canEditMeta=!!(currentUser?.email&&OWNER_EMAILS.includes(currentUser.email.toLowerCase())); // = super admin (v143)
  setSuperAdmin(canEditMeta); // pose le rôle avant que les composants ne le lisent (src/roles.js)

  const [darkMode,setDarkMode]=useState(()=>{
    try{return localStorage.getItem("enogia_darkMode")==="1";}catch(e){return false;}
  });
  // v139 : thème de couleurs (Marine, Forêt, Cuivre), mémorisé sur ce poste
  const [themeId,setThemeId]=useState(()=>{
    try{const t=localStorage.getItem("enogia_theme");return THEMES[t]?t:DEFAULT_THEME;}catch(e){return DEFAULT_THEME;}
  });
  // v141 : densité (confortable / compacte, mémorisée sur ce poste) et mode présentation (propre à l'onglet : on n'y reste pas par mégarde)
  const [density,setDensityState]=useState(()=>{try{return localStorage.getItem("enogia_density2")==="comfortable"?"comfortable":"compact";}catch(e){return "compact";}});
  const [presentation,setPresentation]=useState(()=>{try{return sessionStorage.getItem("enogia_present")==="1";}catch(e){return false;}});
  setThemeMode(darkMode,themeId,presentation); // mute T en place avant que quoi que ce soit ne le lise pendant ce rendu
  setDensity(density);
  useA11yFallback(); // v165 : étiquettes et zones cliquables de secours
  useEffect(()=>{try{localStorage.setItem("enogia_density2",density);}catch(e){}},[density]);
  useEffect(()=>{try{sessionStorage.setItem("enogia_present",presentation?"1":"0");}catch(e){}},[presentation]);
  useEffect(()=>{
    if(!presentation)return;
    const esc=e=>{if(e.key==="Escape"&&!document.querySelector('[role="dialog"]'))setPresentation(false);};
    document.addEventListener("keydown",esc);return()=>document.removeEventListener("keydown",esc);
  },[presentation]);
  useEffect(()=>{
    try{localStorage.setItem("enogia_darkMode",darkMode?"1":"0");localStorage.setItem("enogia_theme",themeId);}catch(e){}
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
    root.style.setProperty("--e-teal500",T.teal500);
    root.style.setProperty("--e-scroll",mixHex(T.surface,T.ink900,T.mode==="dark"?.32:.25)); // barres de défilement : teinte du thème (v141)
    root.style.setProperty("--e-scroll-hover",mixHex(T.surface,T.ink900,T.mode==="dark"?.5:.45));
    const mt=document.querySelector('meta[name="theme-color"]');if(mt)mt.setAttribute("content",T.mode==="dark"?T.surface:T.navy800);
  },[darkMode,themeId,presentation]);

  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [importing,setImporting]=useState(false);
  const [lastImport,setLastImport]=useState(null);
  const [initialData,setInitialData]=useState([]);
  const [initialImporting,setInitialImporting]=useState(false);
  const [lastInitialImport,setLastInitialImport]=useState(null);
  const [lastInitialAdd,setLastInitialAdd]=useState(null);
  const [view,setView]=useState(()=>{try{const v=localStorage.getItem("enogia_view");return ["home","table","gantt","calendar","changes","comments","tests"].includes(v)?v:"home";}catch(e){return "home";}});
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
  const [selEtats,setSelEtats]=useState(new Set(ALL_ETATS.filter(e=>e!=="SLOT_LIBRE"&&e!=="SHIPPED"))); // slots libres et machines expédiées masqués de base (à cocher dans le filtre État)
  const [selGammes,setSelGammes]=useState(new Set(ALL_GAMMES));
  const [selMoisArrivee,setSelMoisArrivee]=useState(new Set(MONTHS));
  const [selMoisTests,setSelMoisTests]=useState(new Set(MONTHS));
  const [selMoisFinProd,setSelMoisFinProd]=useState(new Set(MONTHS));
  const [selMoisDepart,setSelMoisDepart]=useState(new Set(MONTHS));
  const [selPJs,setSelPJs]=useState(null);
  const [selProjets,setSelProjets]=useState(null);
  const [selPays,setSelPays]=useState(null);
  const [selChefs,setSelChefs]=useState(null);
  const [onlyDrift,setOnlyDrift]=useState(false); // v126 : « En dérive seulement » (départ plus tard que dans le planning initial)
  const [df,setDf]=useState("date");
  const [pinOk,setPinOk]=useState(false);
  const [progress,setProgress]=useState({});
  const [calSel,setCalSel]=useState(null);
  const [etatChoice,setEtatChoice]=useState({});
  const [releaseSelection,setReleaseSelection]=useState(null); // v146.16 : sélection en cours dans le catalogue des nouveautés
  const [releaseNotes,setReleaseNotes]=useState(null); // v146.10 : pop-up Nouveautés rédigé dans l'appli (Réglages › Nouveautés)
  const [clientPresence,setClientPresence]=useState({});
  const [closurePeriods,setClosurePeriods]=useState([]);
  const [compCatalog,setCompCatalog]=useState([]); // v150 : liste des major components gérée par les administrateurs
  const [certifs,setCertifs]=useState([]); // v146.23 : catalogue des certifications (nom + couleur)
  const [customEtats,setCustomEtats]=useState([]); // v146.18 : états créés dans le Manager
  const [overridesLoaded,setOverridesLoaded]=useState(false); // v146.19
  const [turbineDoc,setTurbineDoc]=useState({turbines:[],wheelNames:[],injectorNames:[]}); // v146.22
  const [productionExclusions,setProductionExclusions]=useState({});
  const [comments,setComments]=useState({});
  const [delays,setDelays]=useState({});
  const [delayTypes,setDelayTypes]=useState(DEFAULT_DELAY_TYPES);
  const [managerEmails,setManagerEmails]=useState([]);
  const [tableJumpPj,setTableJumpPj]=useState(null);
  const jumpToPj=useCallback(pj=>{setView("table");setTableJumpPj(pj);},[]);

  // v146 : l'espace Manager s'ouvre uniquement pour les adresses autorisées (liste « Accès Manager ») et le super admin ;
  // plus de clavier PIN à l'entrée. Le PIN ne sert plus qu'à confirmer certaines suppressions.
  useEffect(()=>{
    setPinOk(!!(currentUser?.email&&(managerEmails.some(e=>String(e).toLowerCase()===currentUser.email.toLowerCase())||canEditMeta))); // le super admin entre toujours ; un compte retiré de la liste perd l'accès
  },[currentUser,managerEmails,canEditMeta]);

  // Lecture temps réel depuis Firestore
  useEffect(()=>{
    const unsub = onSnapshot(DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setData(d.rows || []);
        setLastImport(d.lastImport || null);
      }
      setLoading(false);
    }, (err)=>{
      console.error("Erreur Firestore:", err);
      setLoading(false);
    });
    return ()=>unsub();
  },[]);

  // Journal des versions : écart entre l'ancienne et la nouvelle version à chaque import / publication
  const [changeLog,setChangeLog]=useState(null);
  useEffect(()=>{const unsub=listenChangeLog(setChangeLog);return ()=>unsub();},[]);
  // v135 : modifications non vues (par personne et par poste) → pastille sur l'icône + message à la connexion
  const {unseen:unseenChanges,markSeen:markChangesSeen}=useUnseenChanges(changeLog,currentUser&&currentUser.email);
  const [noticeOpen,setNoticeOpen]=useState(false);
  const changeMarks=useChangeMarks(changeLog,currentUser&&currentUser.email); // v146.8 : repères « modifié » dans la Liste et le Calendrier
  const [onlyChanged,setOnlyChanged]=useState(false);
  // v146.9 : nouveautés de la version déployée, affichées une fois par personne et par poste (texte dans src/releaseNotes.js)
  const releasesAll=useMemo(()=>mergeReleases(releaseNotes),[releaseNotes]);
  const {unseen:unseenReleases,markSeen:markReleasesSeen}=useUnseenReleases(currentUser&&currentUser.email,!!canEditMeta,releasesAll);
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
    const base=IS_BETA?"[BÊTA] Planning Ordonnancement ENOGIA":"Planning Ordonnancement ENOGIA 2026";
    document.title=(unseenChanges.length&&loggedIn?"● ("+unseenChanges.length+") ":"")+base;
  },[unseenChanges.length,loggedIn]);
  useEffect(()=>{if(view==="changes"&&changeLog&&changeLog.length){markChangesSeen();setNoticeOpen(false);}},[view,changeLog]); // eslint-disable-line

  // Lecture temps réel du planning initial (figé, Manager uniquement)
  useEffect(()=>{
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
  },[]);

  // Lecture temps réel des états choisis manuellement par le Manager (pas de calcul automatique)
  useEffect(()=>{
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
  },[]);

  const setCompCatalogAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { composantCatalog:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement de la liste des composants : " + e.message);
      return false;
    }
  },[]);

  const setCertifsAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { certifCatalog:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement des certifications : " + e.message);
      return false;
    }
  },[]);
  const setCustomEtatsAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { customEtats:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement des états : " + e.message);
      return false;
    }
  },[]);

  const setClosurePeriodsAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { closurePeriods:next }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
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
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  },[productionExclusions]);

  // Lecture temps réel des commentaires par PJ
  useEffect(()=>{
    const unsub = onSnapshot(COMMENTS_DOC_REF(), (snap)=>{
      if(snap.exists())setComments(snap.data().byPj || {});
    }, (err)=>{
      console.error("Erreur Firestore (comments):", err);
    });
    return ()=>unsub();
  },[]);

  // Lecture temps réel du cache de synchro "Suivi ORC" (noms / pays / chefs de projet), partagé pour tous les utilisateurs
  // (Bouton « Sync depuis Suivi ORC » retiré du Manager pour l'instant — on garde seulement la lecture du cache déjà synchronisé.)
  useEffect(()=>{
    const unsub = onSnapshot(PJ_META_SYNC_DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d=snap.data();
        setSyncedPjMeta(d.meta||{});
      }
    }, (err)=>{
      console.error("Erreur Firestore (pjMetaSync):", err);
    });
    return ()=>unsub();
  },[]);

  // Lecture temps réel des corrections manuelles de fiche projet (nom/pays/chef), saisies dans l'app.
  // Prioritaires sur la synchro Suivi ORC — c'est la dernière main humaine sur la donnée.
  const [pjOverridesState,setPjOverridesState]=useState({});
  useEffect(()=>{
    const unsub = onSnapshot(PJ_META_OVERRIDES_DOC_REF(), (snap)=>{
      const v=snap.exists()?(snap.data().meta||{}):{};
      setPjMetaOverrides(v);
      setPjOverridesState(v);
    }, (err)=>{
      console.error("Erreur Firestore (pjMetaOverrides):", err);
    });
    return ()=>unsub();
  },[]);
  // V146.1 — Cash in lu en temps réel (super admin uniquement) : alimente les jalons de paiement des fiches, rapports CODIR / CDP et l'avancement.
  // Sans accès (autre compte, règles Firestore) : on vide le magasin, les jalons saisis à la main restent la référence.
  const [,setCashinVer]=useState(0);
  const cashStoreVer=useCashin();
  const lastSharedRef=useRef("");
  useEffect(()=>{
    // V146.12 — Administrateurs (pas le super admin) : le Cash in arrive par la copie réduite publiée par le super admin (lecture seule).
    if(canEditMeta||!pinOk){ if(!canEditMeta){ setCashinDoc(null); setCashinLinks(null); setCashinVer(v=>v+1); } return; }
    const unsub = onSnapshot(CASHIN_SHARED_REF(), (snap)=>{
      const d=snap.exists()?snap.data():null;
      setCashinDoc(d&&Array.isArray(d.rows)?{rows:d.rows,labels:d.labels||{},totals:d.totals||{},owners:{},updatedAt:d.updatedAt||null}:null);
      setCashinLinks(d&&d.links?d.links:{});
      setCashinVer(v=>v+1);
    }, (err)=>{ console.warn("Cash in partagé indisponible :", err&&err.code); setCashinDoc(null); setCashinLinks({}); setCashinVer(v=>v+1); });
    return ()=>unsub();
  },[canEditMeta,pinOk]);
  // Super admin : publie (avec un léger délai, seulement si le contenu a changé) la copie réduite du Cash in pour les administrateurs.
  useEffect(()=>{
    if(!canEditMeta) return;
    const d=getCashinDoc(); if(!d) return;
    const ordo=getOrdoPjs(); if(!ordo.length) return;
    const keys=new Set(); ordo.forEach(pj=>cashGroupsFor(pj).forEach(g=>keys.add(g.pj)));
    const payload=buildSharedCashin(d,getCashinLinks(),keys);
    const h=JSON.stringify(payload);
    if(h===lastSharedRef.current) return;
    const t=setTimeout(()=>{
      setDoc(CASHIN_SHARED_REF(),{...payload,updatedAt:new Date().toISOString(),updatedBy:(currentUser&&currentUser.email)||""})
        .then(()=>{lastSharedRef.current=h;}).catch(e=>console.warn("Publication du Cash in pour les admins impossible :", e&&e.code));
    },2000);
    return ()=>clearTimeout(t);
  },[canEditMeta,cashStoreVer]); // eslint-disable-line
  useEffect(()=>{
    if(!canEditMeta){ return; }
    const unsub = onSnapshot(CASHIN_DOC_REF(), (snap)=>{
      setCashinDoc(snap.exists()?snap.data():null); setCashinVer(v=>v+1);
    }, (err)=>{
      console.error("Erreur Firestore (cashin):", err);
      setCashinDoc(null); setCashinVer(v=>v+1);
    });
    const unsubL = onSnapshot(CASHIN_LINKS_REF(), (snap)=>{
      setCashinLinks(snap.exists()?(snap.data().links||{}):{}); setCashinVer(v=>v+1);
    }, (err)=>{
      console.error("Erreur Firestore (cashinLinks):", err);
      setCashinLinks({}); setCashinVer(v=>v+1);
    });
    return ()=>{unsub();unsubL();};
  },[canEditMeta]);
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
        alert("Erreur lors de l'enregistrement des infos projet : " + e.message);
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
      catch(e){console.error(e);alert("Erreur lors de l'enregistrement sur plusieurs projets : "+e.message);return false;}
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
      alert("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[comments,currentUser]);

  // v148 : la personne taguée marque la demande « traitée » (ou la rouvre)
  useEffect(()=>{if(view!=="manager")setManagerJump(null);},[view]);
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
  const peopleAll=useMemo(()=>peopleOptions(knownUsers,managerEmails,currentUser&&currentUser.email,currentUser&&currentUser.displayName),[knownUsers,managerEmails,currentUser]);
  const chefOfRef=useRef(()=>({name:"",account:null}));
  chefOfRef.current=pj=>{const row=dataRef.current.find(r=>r.pj===pj);const name=row?(getPjMeta(pj,row).chefProjet||""):"";return{name,account:chefAccount(name,peopleAll)};};
  const mentionCtx=useMemo(()=>({options:peopleOptions(knownUsers,[],currentUser&&currentUser.email,currentUser&&currentUser.displayName),me:lcMention(currentUser&&currentUser.email),chefOf:pj=>chefOfRef.current(pj)}),[knownUsers,currentUser]);
  const resolveComment=useCallback(async (pj,idx,email,on)=>{
    const nextAll={...comments,[pj]:setCommentResolved(comments[pj]||[],idx,email,on,new Date().toISOString())};
    try{await setDoc(COMMENTS_DOC_REF(),{byPj:nextAll},{merge:true});return true;}
    catch(e){console.error(e);alert("Erreur lors de l'enregistrement : "+e.message);return false;}
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
      alert("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[comments,currentUser]);

  const deleteComment=useCallback(async (pj,index,pin)=>{
    if(!isSuperAdmin()){alert("La suppression est réservée au super admin.");return false;}
    if(pin!==PIN){alert("Code incorrect.");return false;}
    const current=comments[pj]||[];
    const next=current.filter((_,i)=>i!==index);
    const nextAll={...comments,[pj]:next};
    try{
      await setDoc(COMMENTS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de la suppression : " + e.message);
      return false;
    }
  },[comments]);

  // Lecture temps réel des allocations de retard par PJ
  useEffect(()=>{
    const unsub = onSnapshot(DELAYS_DOC_REF(), (snap)=>{
      if(snap.exists())setDelays(snap.data().byPj || {});
    }, (err)=>{
      console.error("Erreur Firestore (delays):", err);
    });
    return ()=>unsub();
  },[]);

  // v146.22 : pool de turbines (Manager uniquement)
  useEffect(()=>{
    if(!pinOk)return undefined;
    const unsub=onSnapshot(TURBINES_DOC_REF(),snap=>{
      const d=snap.exists()?snap.data():{};
      setTurbineDoc({...d,turbines:Array.isArray(d.turbines)?d.turbines:[],wheelNames:Array.isArray(d.wheelNames)?d.wheelNames:[],injectorNames:Array.isArray(d.injectorNames)?d.injectorNames:[]});
    },err=>console.error("Erreur Firestore (turbines):",err));
    return ()=>unsub();
  },[pinOk]);
  // v154 : Manager › Tests (testeurs, affectations, tests FAT)
  const [testsDoc,setTestsDoc]=useState({testers:[],plans:{}});
  const [testsLoaded,setTestsLoaded]=useState(false);
  useEffect(()=>{
    if(!currentUser)return undefined;
    const unsub=onSnapshot(TESTS_DOC_REF(),snap=>{const d=snap.exists()?snap.data():{};setTestsDoc({...d,testers:Array.isArray(d.testers)?d.testers:[],plans:d.plans&&typeof d.plans==="object"?d.plans:{}});setTestsLoaded(true);},err=>{console.error("Erreur Firestore (tests):",err);setTestsLoaded(true);});
    return ()=>unsub();
  },[currentUser]);
  // Page « Tests » (rail de gauche) : administrateurs + testeurs de la liste (adresse renseignée) ; les testeurs consultent seulement
  const canSeeTests=!!(pinOk||testerOfEmail(testsDoc,currentUser&&currentUser.email));
  useEffect(()=>{if(view==="tests"&&testsLoaded&&!canSeeTests)setView("table");},[view,testsLoaded,canSeeTests]); // accès retiré ou ancien choix mémorisé
  const saveTests=useCallback(async next=>{
    try{await setDoc(TESTS_DOC_REF(),{...next,updatedAt:new Date().toISOString(),updatedBy:authorName||""});return true;}
    catch(e){console.error(e);alert("Erreur lors de l'enregistrement des tests : "+e.message);return false;}
  },[authorName]);
  const saveTurbines=useCallback(async next=>{
    try{await setDoc(TURBINES_DOC_REF(),{...next,updatedAt:new Date().toISOString(),updatedBy:authorName||""});return true;}
    catch(e){console.error(e);alert("Erreur lors de l'enregistrement des turbines : "+e.message);return false;}
  },[authorName]);

  // Lecture temps réel des types de retard génériques (configurables par le Manager)
  useEffect(()=>{
    const unsub = onSnapshot(DELAY_TYPES_DOC_REF(), (snap)=>{
      if(snap.exists()&&Array.isArray(snap.data().types)&&snap.data().types.length>0){
        setDelayTypes(snap.data().types);
      }
    }, (err)=>{
      console.error("Erreur Firestore (delayTypes):", err);
    });
    return ()=>unsub();
  },[]);

  // Lecture temps réel de la liste des emails autorisés à l'espace Manager
  useEffect(()=>{
    const unsub = onSnapshot(MANAGER_EMAILS_DOC_REF(), (snap)=>{
      if(snap.exists()&&Array.isArray(snap.data().emails)){
        setManagerEmails(snap.data().emails);
      }
    }, (err)=>{
      console.error("Erreur Firestore (managerEmails):", err);
    });
    return ()=>unsub();
  },[]);

  const setManagerEmailsAndSave=useCallback(async next=>{
    try{
      await setDoc(MANAGER_EMAILS_DOC_REF(), { emails:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement de la liste des accès Manager : " + e.message);
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
      alert("Erreur lors de l'enregistrement du retard : " + e.message);
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
      alert("Erreur lors de l'enregistrement du retard : " + e.message);
      return false;
    }
  },[delays]);

  const deleteDelayAllocation=useCallback(async (pj,id,pin)=>{
    if(!isSuperAdmin()){alert("La suppression est réservée au super admin.");return false;}
    if(pin!==PIN){alert("Code incorrect.");return false;}
    const current=delays[pj]||[];
    const next=current.filter(d=>d.id!==id);
    const nextAll={...delays,[pj]:next};
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de la suppression : " + e.message);
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
      alert("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[delays]);

  const deleteDelayComment=useCallback(async (pj,delayId,idx,pin)=>{
    if(!isSuperAdmin()){alert("La suppression est réservée au super admin.");return false;}
    if(pin!==PIN){alert("Code incorrect.");return false;}
    const current=delays[pj]||[];
    const next=current.map(d=>d.id===delayId?{...d,comments:(d.comments||[]).filter((_,i)=>i!==idx)}:d);
    const nextAll={...delays,[pj]:next};
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de la suppression : " + e.message);
      return false;
    }
  },[delays]);

  const setDelayTypesAndSave=useCallback(async next=>{
    try{
      await setDoc(DELAY_TYPES_DOC_REF(), { types:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement des types de retard : " + e.message);
      return false;
    }
  },[]);

  const setClientPresenceFor=useCallback(async (pj,value)=>{
    const next={...clientPresence,[pj]:value};
    try{
      await setDoc(OVERRIDES_DOC_REF(), { clientPresence:next }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
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
      alert("Erreur lors de l'enregistrement : " + e.message);
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
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
    setSavingProgress(false);
  },[progress]);

  // GARANTIE (demandé : « même si je fais un import de planning je souhaite que ça ne change rien » pour
  // les MAJ faites sur le site) : un import n'écrit QUE le document des lignes du planning (dates, noms
  // MS Project). Tout ce qui est saisi dans l'app — pays, chef de projet, nom, gamme (pjMetaOverrides),
  // état, avancement, présence aux tests, jours de production, retards, commentaires — vit dans des
  // documents Firestore séparés, clés par n° de PJ, et passe toujours PAR-DESSUS les données importées.
  const handleImport=useCallback(async (rows,indice)=>{
    setImporting(true);
    try{
      const lastImportStr=new Date().toLocaleString("fr-FR");
      // ancienne version relue juste avant d'écrire (pas l'état local, qui peut être en retard) : sert à l'onglet « Modifications »
      let before=null;
      try{const s0=await getDoc(DOC_REF());if(s0.exists())before=s0.data();}catch(e){console.warn("Lecture de l'ancienne version impossible :",e);}
      // v145 : copie de sécurité de l'ancien planning AVANT d'écraser (14 dernières gardées, restaurables dans Réglages › Imports).
      // Si la copie échoue (réseau, droits Firestore), on demande avant d'importer sans filet.
      try{await saveBackup(before,{by:authorName||"",reason:"import"});}
      catch(e){
        console.warn("Copie de sécurité impossible :",e);
        if(!window.confirm("La copie de sécurité de l'ancien planning n'a pas pu être enregistrée ("+(e&&e.message?e.message:"erreur inconnue")+").\n\nImporter quand même, sans possibilité de revenir en arrière ?")){setImporting(false);return;}
      }
      await setDoc(DOC_REF(), { rows, lastImport: lastImportStr, indice: indice||"" });
      if(before&&Array.isArray(before.rows)&&before.rows.length){
        try{
          await appendChangeLog(buildEntry(before.rows,rows,{source:"import",by:authorName||"",indice:indice||"",label:lastImportStr,prevLabel:before.lastImport||"",prevIndice:before.indice||""}));
          setView("changes");
        }catch(e){console.warn("Journal des modifications non enregistré (l'import est bien fait) :",e);}
      }
      setSelPJs(rows.length?new Set(rows.map(r=>r.pj)):null);
      // Pas besoin de setData ici : onSnapshot va le faire automatiquement pour tout le monde
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
    setImporting(false);
  },[authorName]);

  const handleInitialImport=useCallback(async rows=>{
    setInitialImporting(true);
    try{
      const lastImportStr=new Date().toLocaleString("fr-FR");
      await setDoc(INITIAL_DOC_REF(), { rows, lastImport: lastImportStr });
      // Pas besoin de setInitialData ici : onSnapshot va le faire automatiquement
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement du planning initial : " + e.message);
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
      alert("Erreur lors de l'ajout au planning initial : "+e.message);
    }
    setInitialImporting(false);
  },[]);

  const allPJs=useMemo(()=>[...new Set(data.map(r=>r.pj))].sort(),[data]);
  const allProjets=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj,r).nomProjet))].sort(),[data]);
  const allPays=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj,r).pays))].sort(),[data]);
  // Mêmes noms exclus que dans le sélecteur d'édition (demandé explicitement : "enlever CMA et
  // Clément Bablon du choix du chef de projet") — n'affecte que la liste proposée au filtre, pas
  // les projets déjà assignés à ces noms.
  const allChefs=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj,r).chefProjet))].filter(c=>!EXCLUDED_CHEFS.has(c)).sort(),[data]);

  // L'état affiché vient exclusivement du choix manuel du Manager (etatChoice), sinon "À définir"
  const initialByPj=useMemo(()=>{const m={};initialData.forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const dataWithOverrides=useMemo(()=>data.map(r=>{
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
  }),[data,etatChoice,progress,clientPresence,initialByPj,pjOverridesState,customEtats]); // customEtats : ETAT_META (global) change avec lui
  // Avancement effectif : calculé pour Montage / Élec / Tests / Packaging / Expédiée, saisi à la main pour les autres états.
  const progressEff=useMemo(()=>buildProgress(progress,dataWithOverrides),[progress,dataWithOverrides]);

  // V146.2 : liste des PJ de l'ordo (hors slots libres) pour le rapprochement Cash in ↔ ordo
  useEffect(()=>{const rows=dataWithOverrides.filter(r=>r&&r.pj&&r.etat!=="SLOT_LIBRE");const names={};rows.forEach(r=>{names[r.pj]=getPjMeta(r.pj,r).nomProjet||"";});setOrdoPjs(rows.map(r=>r.pj),names);},[dataWithOverrides]);
  const filtered=useMemo(()=>dataWithOverrides.filter(r=>{
    if(!selEtats.has(r.etat))return false;
    if(r.etat!=="SLOT_LIBRE"&&!selGammes.has(r.gamme))return false;
    if(selPJs&&!selPJs.has(r.pj))return false;
    const meta=getPjMeta(r.pj,r);
    if(selProjets&&!selProjets.has(meta.nomProjet))return false;
    if(selPays&&!selPays.has(meta.pays))return false;
    if(selChefs&&!selChefs.has(meta.chefProjet))return false;
    if(onlyDrift&&!(r.drift>0))return false;
    if(onlyChanged&&!changeMarks.marks.has(r.pj))return false;
    if(selMoisArrivee.size<MONTHS.length){const m=r.arrivee?MONTHS[new Date(r.arrivee).getMonth()]:null;if(!m||!selMoisArrivee.has(m))return false;}
    if(selMoisTests.size<MONTHS.length){const m=r.tests?MONTHS[new Date(r.tests).getMonth()]:null;if(!m||!selMoisTests.has(m))return false;}
    if(selMoisFinProd.size<MONTHS.length){const m=r.finProd?MONTHS[new Date(r.finProd).getMonth()]:null;if(!m||!selMoisFinProd.has(m))return false;}
    if(selMoisDepart.size<MONTHS.length){const m=r.depart?MONTHS[new Date(r.depart).getMonth()]:null;if(!m||!selMoisDepart.has(m))return false;}
    return true;
  }),[dataWithOverrides,selEtats,selGammes,selPJs,allPJs,selProjets,allProjets,selPays,allPays,selChefs,allChefs,onlyDrift,onlyChanged,changeMarks,selMoisArrivee,selMoisTests,selMoisFinProd,selMoisDepart]);

  const VIEWS=[{id:"home",icon:"home",l:"Aujourd'hui"},{id:"table",icon:"list",l:"Liste"},{id:"gantt",icon:"gantt",l:"Gantt"},{id:"calendar",icon:"calendar",l:"Calendrier"},{id:"changes",icon:"changes",l:"Modifications"},{id:"comments",icon:"comments",l:"Commentaires"},...(canSeeTests?[{id:"tests",icon:"check",l:"Tests"}]:[])];

  // v159 : menu principal libellé (réductible, mémorisé) + recherche « Aller à… » (Ctrl K) sur toutes les pages
  const [navMin,setNavMinS]=useState(()=>{try{return localStorage.getItem("enogia_nav_min")==="1";}catch(e){return false;}});
  const setNavMin=v=>{setNavMinS(v);try{localStorage.setItem("enogia_nav_min",v?"1":"0");}catch(e){}};
  const navCompact=navMin||view==="manager"; // dans l'espace Manager, un seul menu large : celui du Manager
  const [navPal,setNavPal]=useState(false);
  useEffect(()=>{const f=e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&String(e.key).toLowerCase()==="k"&&view!=="manager"&&loggedIn){e.preventDefault();setNavPal(o=>!o);}};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f);},[view,loggedIn]);
  const palettePjs=useMemo(()=>dataWithOverrides.filter(r=>r&&r.pj).map(r=>({pj:r.pj,etat:r.etat,nomProjet:getPjMeta(r.pj,r).nomProjet||""})),[dataWithOverrides]);
  const goManager=()=>{setManagerTab("fiche");setView("manager");};
  const navGroups=[{label:"Pages",entries:VIEWS.map(v=>({id:v.id,label:v.l,icon:v.icon,hint:"",go:()=>setView(v.id)}))},...(pinOk?[{label:"Admin",entries:[{id:"manager",label:"Espace Manager",icon:"manager",hint:"kpi fiche retards réglages suivi turbines cash",go:goManager}]}]:[])];
  if(!authChecked)return null; // évite un flash de l'écran de connexion pendant la vérification initiale
  if(!loggedIn) return <LoginScreen/>;
  // Fond flouté réel (demandé explicitement : "un transparent flou ... la vision en flou derrière
  // de la première page") plutôt qu'un fond plat à formes décoratives : l'écran de connexion reste
  // monté en dessous, et LoginTransition n'est plus qu'un calque "verre dépoli" (backdrop-filter)
  // superposé par-dessus, qui laisse donc transparaître — flouté — ce qu'il y a vraiment derrière.
  if(justLoggedIn) return (<><LoginScreen/><LoginTransition name={authorName}/></>);

  return(<MentionCtx.Provider value={mentionCtx}><ChangeMarksContext.Provider value={changeMarks}><div className="enogia-fade-in enogia-shell" style={{fontFamily:T.font,fontSize:FZ.md,background:T.surface,minHeight:"100vh",color:T.ink900,display:"flex"}}>
    <style>{"*{box-sizing:border-box;}"}</style>
    {presentation&&<button onClick={()=>setPresentation(false)} title="Quitter le mode présentation (Échap)" className="enogia-btn-tap" style={{position:"fixed",right:16,bottom:16,zIndex:10010,border:"none",borderRadius:999,padding:"8px 16px",background:T.ink900,color:T.surface,fontFamily:T.font,fontSize:FZ.xs,fontWeight:700,cursor:"pointer",boxShadow:T.shadowFloat}}>Mode présentation · Quitter (Échap)</button>}
    {screenOpen&&<WorkshopScreen data={dataWithOverrides} productionExclusions={productionExclusions} closurePeriods={closurePeriods} changeLog={changeLog} darkMode={darkMode} onClose={()=>setScreenOpen(false)}/>}
    {loggedIn&&!justLoggedIn&&!screenOpen&&overridesLoaded&&unseenReleases.length>0&&<ReleasePopup releases={unseenReleases} userName={authorName} onClose={markReleasesSeen}/>}
    {noticeOpen&&!screenOpen&&overridesLoaded&&!unseenReleases.length&&unseenChanges.length>0&&<ChangesPopup entries={unseenChanges} userName={authorName} onLater={closeNoticeLater} onRead={()=>{markChangesSeen();setNoticeOpen(false);}} onOpen={()=>{setNoticeOpen(false);setView("changes");}}/>}

    {/* ── Rail de navigation : icônes de vue + accès Manager + mode sombre ── */}
    <a href="#enogia-main" className="enogia-skip" onClick={e=>{e.preventDefault();const m=document.getElementById("enogia-main");if(m){m.focus();m.scrollIntoView&&m.scrollIntoView({block:"start"});}}}>Aller au contenu</a>
    <nav className="enogia-nav" aria-label="Pages" style={{width:navCompact?64:216,transition:"width .28s var(--e-ease)",flexShrink:0,background:T.card,borderRight:"1px solid "+T.line,display:"flex",flexDirection:"column",alignItems:navCompact?"center":"stretch",padding:navCompact?"16px 0":"16px 10px",gap:4,position:"sticky",top:0,zIndex:30,height:"100vh",overflowY:"auto",overflowX:"hidden",scrollbarWidth:"none"}}>
      {/* Plus de logo ici (demandé explicitement : trop petit pour être lisible) — il ne reste
          qu'au seul endroit où il est bien lisible, agrandi, dans l'en-tête. */}
      {[["Planning",["home","table","gantt","calendar"]],["Suivi",["changes","comments","tests"]]].map(([gl,ids])=>{const items=VIEWS.filter(v=>ids.includes(v.id));if(!items.length)return null;return(<React.Fragment key={gl}>
        {!navCompact&&<div className="enogia-nav-grp" style={{fontSize:11,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase",color:T.ink500,padding:"10px 10px 3px",whiteSpace:"nowrap"}}>{gl}</div>}
        {navCompact&&<div className="enogia-nav-grp" style={{width:18,height:1,background:T.line,margin:"4px 0"}}/>}
        {items.map(v=>{const on=view===v.id;const ttl=v.id==="changes"&&unseenChanges.length?"Modifications — "+unseenChanges.length+" nouvelle"+(unseenChanges.length>1?"s":"")+" version"+(unseenChanges.length>1?"s":""):v.l;return(
          <button key={v.id} className="enogia-nav-btn" onClick={()=>setView(v.id)} title={ttl} aria-label={v.id==="changes"&&unseenChanges.length?"Modifications, "+unseenChanges.length+" nouvelle"+(unseenChanges.length>1?"s":""):v.l} aria-current={on?"page":undefined}
            style={{position:"relative",width:navCompact?40:"100%",height:40,borderRadius:navCompact?12:10,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:navCompact?"center":"flex-start",gap:12,padding:navCompact?0:"0 12px",background:on?T.teal100:"transparent",color:on?T.teal600:T.ink500,fontFamily:T.font,fontSize:FZ.sm,fontWeight:on?700:500,whiteSpace:"nowrap",transition:"background .15s ease, color .15s ease"}}
            onMouseEnter={e=>{if(!on){e.currentTarget.style.background=T.surface;e.currentTarget.style.color=T.ink900;}}}
            onMouseLeave={e=>{if(!on){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.ink500;}}}>
            <NavIcon name={v.icon} size={19}/>{!navCompact&&<span className="enogia-nav-lab" style={{flex:1,textAlign:"left"}}>{v.l}</span>}{v.id==="changes"&&<ChangesBadge n={unseenChanges.length}/>}</button>);})}
      </React.Fragment>);})}
      <div style={{flex:1}}/>
      <button className="enogia-nav-btn" onClick={()=>setScreenOpen(true)} title="Écran atelier : diaporama plein écran pour un téléviseur" aria-label="Écran atelier" style={{width:navCompact?40:"100%",height:36,borderRadius:12,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:navCompact?"center":"flex-start",gap:12,padding:navCompact?0:"0 12px",background:"transparent",color:T.ink500,fontFamily:T.font,fontSize:FZ.sm,fontWeight:500,whiteSpace:"nowrap"}}
        onMouseEnter={e=>{e.currentTarget.style.background=T.surface;}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}><NavIcon name="screen" size={18}/>{!navCompact&&<span className="enogia-nav-lab">Écran atelier</span>}</button>
      <div style={{display:"flex",justifyContent:navCompact?"center":"flex-start",paddingLeft:navCompact?0:2}}><ThemePicker darkMode={darkMode} onDarkMode={setDarkMode} themeId={themeId} onPick={setThemeId} density={density} onDensity={setDensityState} presentation={presentation} onPresentation={setPresentation}/></div>
      {view!=="manager"&&<button className="enogia-nav-toggle" onClick={()=>setNavMin(!navMin)} aria-label={navMin?"Agrandir le menu":"Réduire le menu"} title={navMin?"Agrandir le menu":"Réduire le menu"} style={{width:navCompact?40:"100%",height:30,marginTop:4,border:"1px solid "+T.line,background:T.card,borderRadius:9,display:"flex",justifyContent:"center",alignItems:"center",color:T.ink500,cursor:"pointer",alignSelf:"center"}}><span style={{display:"inline-flex",transform:"rotate("+(navMin?"-90deg":"90deg")+")",transition:"transform .28s var(--e-ease)"}}><NavIcon name="chevronDown" size={14}/></span></button>}
    </nav>
    {navPal&&<ManagerPalette groups={navGroups} data={palettePjs} activeKey={view+":"} storageKey="enogia_nav_recent" onGo={f=>f()} onOpenPj={pj=>setCalSel(pj)} onClose={()=>setNavPal(false)}/>}

    {/* ── Colonne principale ── */}
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
      {IS_BETA&&<BetaBanner canCopy={canEditMeta}/>}

      {/* Barre de marque — fine, claire, sans dégradé : l'identité tient au logo + à la typo, pas à un bloc de couleur */}
      <div className="enogia-bar" style={{flexShrink:0,minHeight:60,display:"flex",alignItems:"center",gap:16,padding:"8px 28px",background:T.card,borderBottom:"1px solid "+T.line,flexWrap:"wrap"}}>
        {/* Le fichier logo d'origine a énormément de marge transparente autour du dessin réel
            (~24% de sa hauteur seulement est visible) : l'agrandir ne suffisait donc pas, il
            paraissait toujours minuscule. enogia-logo-color-crop.svg est recadré au plus près
            du dessin (mark + "enogia"), donc la même hauteur rend un logo visuellement ~3x
            plus grand qu'avant, comme demandé — sans avoir à démesurer toute la barre d'en-tête. */}
        <img className="enogia-logo" src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="ENOGIA" width="105" height="42" style={{height:42,width:"auto",objectFit:"contain",flexShrink:0,filter:darkMode?"brightness(0) invert(1)":"none"}}/>
        <div className="enogia-hide-phone" style={{width:1,height:26,background:T.teal400,opacity:.35,flexShrink:0}}/>
        {/* Fraunces (empattements fins) : même police que tous les autres titres/intitulés de
            section de l'appli (ManagerPanel, fiche projet, etc.) — déjà "la police utilisée partout"
            pour un titre, donc inchangée ici. Couleur passée en bleu acier foncé (T.teal600, plus
            sombre que le gris-noir T.ink900 d'avant, demandé explicitement : "le titre doit être plus
            sombre") et tracking aligné sur celui des intitulés de section (.03em) pour que ce titre se
            lise comme le même registre typographique que le reste, pas comme une police à part. */}
        <div style={{display:"flex",flexDirection:"column",gap:1}}>
          {/* Taille augmentée (demandé explicitement : "police plus grande") — police Roboto en
              attendant la confirmation (Roboto ou Abel, les deux proposées) ; bleu acier foncé déjà en
              place. "Production" retiré du sous-titre, qui ne garde que "BU ORC" (demandé
              explicitement). */}
          <div className="enogia-title" style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:FZ.xl,color:T.teal600,letterSpacing:".01em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Planning Ordonnancement</div>
          <span style={{fontFamily:T.fontDisplay,fontSize:FZ.xs,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:T.teal500,whiteSpace:"nowrap"}}>BU ORC</span>
        </div>
        <div className="enogia-bar-right" style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div className="enogia-bar-meta" style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1}}>
            {loading?<span className="enogia-skeleton" aria-label="Chargement" style={{display:"inline-block",width:84,height:16}}/>:<span style={{color:T.ink700,fontSize:FZ.sm,fontWeight:600,fontFamily:T.font}}>{data.length+" unités"}</span>}
            {!loading&&lastImport&&<button onClick={()=>setView("changes")} title="Voir ce qui a bougé avec ce dernier import" style={{border:"none",background:"transparent",padding:0,cursor:"pointer",color:T.ink700,fontWeight:600,fontSize:FZ.xs,fontFamily:T.font,textAlign:"right"}}>Dernier import {lastImport}{changeLog&&changeLog[0]&&changeLog[0].stats?" · "+changeLog[0].stats.nPj+" PJ modifié"+(changeLog[0].stats.nPj>1?"s":""):""} ›</button>}
            {savedAt&&<span role="status" aria-live="polite" style={{color:T.emerald600||T.ink500,fontSize:FZ.xs,fontFamily:T.font,textAlign:"right"}}>✓ Enregistré à {String(savedAt.getHours()).padStart(2,"0")+":"+String(savedAt.getMinutes()).padStart(2,"0")}</span>}
          </div>
          {pinOk&&<ImportButton
            onImport={handleImport}
            busy={importing}
            hasExisting={data.length>0}
            confirmMessage={"Un planning révisé a déjà été importé"+(lastImport?(" le "+lastImport):"")+" ("+data.length+" unités).\n\nCet import va remplacer les données pour tous les visiteurs du site.\n\nÊtes-vous sûr de vouloir continuer ?"}
          />}
          {currentUser&&<div className="enogia-hide-phone" style={{width:1,height:22,background:T.line}}/>}
          {currentUser&&<button onClick={()=>setNavPal(true)} title="Aller à… (Ctrl K)" aria-label="Aller à… (Ctrl K)" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:32,padding:0,border:"1px solid transparent",borderRadius:9,cursor:"pointer",background:"transparent",color:T.ink500}} onMouseEnter={e=>{e.currentTarget.style.background=T.surfaceAlt;e.currentTarget.style.color=T.ink900;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.ink500;}}><NavIcon name="search" size={18}/></button>}
          {currentUser&&<MentionBell comments={comments} me={mentionCtx.me} data={dataWithOverrides} resolveComment={resolveComment} canSeePrivate={pinOk} onOpen={pj=>{if(pinOk){setManagerJump({pj,n:Date.now()});setManagerTab("fiche");setView("manager");}else jumpToPj(pj);}}/>}
          <button onClick={()=>{setManagerTab("fiche");setView("manager");}} title="Espace Manager" aria-label="Espace Manager" aria-pressed={view==="manager"} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:32,padding:0,border:"1px solid "+(view==="manager"?T.teal500+"66":"transparent"),borderRadius:9,cursor:"pointer",background:view==="manager"?T.teal100:"transparent",color:view==="manager"?T.teal600:T.ink500,transition:"background .15s ease, color .15s ease"}} onMouseEnter={e=>{if(view!=="manager"){e.currentTarget.style.background=T.surfaceAlt;e.currentTarget.style.color=T.ink900;}}} onMouseLeave={e=>{if(view!=="manager"){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.ink500;}}}><NavIcon name="manager" size={19}/></button>
          {currentUser&&<UserChip user={currentUser} onSignOut={()=>signOut(auth)} role={canEditMeta?"Super admin":pinOk?"Admin":null}/>}
        </div>
      </div>

      <main id="enogia-main" tabIndex={-1} className="enogia-main" style={{padding:D.main,flex:1,outline:"none"}}>


    {loading?<div style={{position:"relative"}}><LoadingSkeleton variant={view==="home"?"home":undefined}/></div>:
    data.length===0?(
      <div className="enogia-float-in" style={{background:T.card,borderRadius:R.lg,boxShadow:T.shadowCard}}>
        <EmptyState icon="inbox" title="Aucune donnée pour l'instant" hint={pinOk?"Importe un planning MS Project pour faire apparaître les projets ici.":"Le planning sera visible dès qu'un administrateur l'aura importé."}/>
      </div>
    ):(
      <>
        {view==="manager"?(pinOk?
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontFamily:T.fontDisplay,fontWeight:600,color:T.ink900,fontSize:FZ.lg,display:"flex",alignItems:"center",gap:8}}><NavIcon name="manager" size={20}/>Espace Manager</span>
            </div>
            <ManagerPanel changeLog={changeLog} data={dataWithOverrides} progress={progressEff} setProgress={setProgress} releases={releasesAll} saveReleaseNotes={saveReleaseNotes} releaseSelection={releaseSelection} saveReleaseSelection={saveReleaseSelection} publishRelease={publishRelease} isBeta={IS_BETA} initialData={initialData} lastInitialImport={lastInitialImport} lastInitialAdd={lastInitialAdd} onInitialImport={handleInitialImport} onInitialAdd={handleInitialAdd} initialImporting={initialImporting}
              etatChoice={etatChoiceEff} setEtatFor={setEtatFor} saveProgress={saveProgress} savingProgress={savingProgress} progressSaved={progressSaved}
              tab={managerTab} setTab={setManagerTab} jumpFiche={managerJump} clientPresence={clientPresence} setClientPresenceFor={setClientPresenceFor}
              closurePeriods={closurePeriods} setClosurePeriods={setClosurePeriodsAndSave}
              productionExclusions={productionExclusions} setProductionExclusionDays={setProductionExclusionDays} customEtats={customEtats} setCustomEtats={setCustomEtatsAndSave} certifs={certifs} setCertifs={setCertifsAndSave} compCatalog={compCatalog} setCompCatalog={setCompCatalogAndSave}
              comments={comments} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypesAndSave} addDelayAllocationMulti={addDelayAllocationMulti} deleteDelayAllocation={(pj,id)=>deleteDelayAllocation(pj,id,PIN)}
              turbineDoc={turbineDoc} saveTurbines={saveTurbines} managerEmails={managerEmails} setManagerEmails={setManagerEmailsAndSave} currentUserEmail={currentUser?.email} authorName={authorName} buildVersion={canEditMeta?APP_BUILD_VERSION:null} savePjMetaOverride={savePjMetaOverride} savePjMetaMulti={savePjMetaMulti} addCommentMulti={addCommentMulti} addComment={addComment} resolveComment={resolveComment} deleteComment={(pj,idx)=>deleteComment(pj,idx,PIN)}/>
          </div>
          :<ManagerAccessNotice email={currentUser?.email}/>)
        :(
          <div key={view} className="enogia-float-in">
            {/* allData (non filtré) pour le compteur "expédiées depuis le 1er janvier" : il ne doit
                jamais varier selon les filtres actifs sur la liste, demandé explicitement — seules
                les 4 répartitions en camembert, elles, continuent de suivre les filtres. */}
            {view!=="home"&&(()=>{const v=VIEWS.find(x=>x.id===view);if(!v)return null;
              const grp=["table","gantt","calendar"].includes(view)?"Planning":"Suivi";
              const subs={table:filtered.length+" machine"+(filtered.length>1?"s":"")+" affichée"+(filtered.length>1?"s":"")+" · survolez un état ou un écart pour le détail",gantt:"Chaque machine, étape par étape · Ctrl + molette pour zoomer",calendar:"Arrivées, tests, fins de production et départs",changes:"Ce qui a changé à chaque mise à jour du planning",comments:"Les échanges, machine par machine",tests:"Plans d'essais et affectations des testeurs"};
              return <PageHead kicker={grp} title={v.l} sub={subs[view]}/>;})()}
            {view==="home"&&<HomeView pinOk={pinOk} testsDoc={canSeeTests?testsDoc:null} data={dataWithOverrides} comments={comments} myEmail={currentUser&&currentUser.email} myName={authorName} people={peopleAll} unseenChanges={unseenChanges} lastImport={lastImport} onOpenPj={setCalSel} onGo={setView}/>}
            {view==="table"&&<DashboardSummary data={filtered} allData={dataWithOverrides} progress={progressEff} changeLog={changeLog} onOpenChanges={()=>setView("changes")}/>}
            {view==="table"&&<TableView data={filtered} progress={progressEff} df={df} setDf={setDf} setEtatFor={setEtatFor} setClientPresenceFor={setClientPresenceFor}
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
              addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>}
            {/* Même filtre État + PJ que le Gantt (demandé explicitement : "le même format au même
                emplacement") — partage le même état que la liste/le Gantt, donc filtrer ici filtre
                aussi les autres vues et inversement. */}
            {view==="calendar"&&<CalendarView data={filtered} onSelectPj={setCalSel}
              mode={calMode} setMode={setCalMode} anchor={calAnchor} setAnchor={setCalAnchor}
              dayAnchor={calDayAnchor} setDayAnchor={setCalDayAnchor} closurePeriods={closurePeriods}
              productionExclusions={productionExclusions}
              zoomLevel={calZoom} setZoomLevel={setCalZoom}
              selEtats={selEtats} setSelEtats={setSelEtats} allPJs={allPJs} selPJs={selPJs} setSelPJs={setSelPJs}/>}
            {view==="tests"&&canSeeTests&&<TestsTab doc={testsDoc} save={saveTests} data={dataWithOverrides} certifs={certifs} canEdit={pinOk} me={currentUser&&currentUser.email}/>}
            {view==="changes"&&<ChangesView entries={changeLog} onOpenPj={jumpToPj}/>}
            {view==="comments"&&<CommentsView data={filtered} comments={comments} addComment={addComment} deleteComment={deleteComment}
              pinOk={pinOk} addCommentMulti={addCommentMulti} jumpToPj={jumpToPj} authorName={authorName}/>}
          </div>
        )}
      </>
    )}
    {calSel&&<ProjectModal pj={calSel} data={dataWithOverrides} df={df} onClose={()=>setCalSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}
      pinOk={pinOk} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypesAndSave} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
      addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>}
      </main>
    </div>
  </div></ChangeMarksContext.Provider></MentionCtx.Provider>);
}

// ── Identité de l'utilisateur connecté, en haut de l'appli : on voit tout de suite
// sous quel compte on est, avec un accès direct à la déconnexion. ──
function UserChip({user,onSignOut,role}){
  const [open,setOpen]=useState(false);
  const ref=React.useRef(null);
  useEffect(()=>{
    const onClick=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",onClick);
    return ()=>document.removeEventListener("mousedown",onClick);
  },[]);
  const name=user.displayName||user.email;
  const initial=(name||"?").trim().charAt(0).toUpperCase();
  return(<div ref={ref} style={{position:"relative"}}>
    <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,background:T.surfaceAlt,border:"none",borderRadius:999,padding:"4px 12px 4px 6px",cursor:"pointer",color:T.ink900}}>
      <span style={{width:26,height:26,borderRadius:"50%",background:T.teal500,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:FZ.sm,fontWeight:700,flexShrink:0}}>{initial}</span>
      <span className="enogia-user-name" style={{fontSize:FZ.sm,fontWeight:600,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:T.ink900}}>{name}</span>
    </button>
    {open&&<div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:T.card,borderRadius:12,boxShadow:T.shadowLg,padding:8,minWidth:200,zIndex:50}}>
      <div style={{padding:"6px 8px 8px",borderBottom:"1px solid "+T.line,marginBottom:6}}>
        <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
        <div style={{fontSize:FZ.xs,color:T.ink500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
        {role&&<div style={{marginTop:4,display:"inline-block",fontSize:FZ.xs,fontWeight:700,color:role==="Super admin"?"#fff":T.teal600,background:role==="Super admin"?T.teal500:T.teal100,borderRadius:999,padding:"1px 8px"}}>{role}</div>}
      </div>
      <button onClick={onSignOut} style={{width:"100%",display:"flex",alignItems:"center",gap:8,background:"none",border:"none",borderRadius:8,padding:"8px 8px",fontSize:FZ.sm,fontWeight:600,color:T.red500,cursor:"pointer",textAlign:"left"}}><NavIcon name="logout" size={15}/>Se déconnecter</button>
    </div>}
  </div>);
}
