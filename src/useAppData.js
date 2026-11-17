// v261 : sorti de App.js — lectures Firestore temps réel et enregistrements de quelques documents (turbines, tests, Production
// turbines, retards, Cash in). Même code qu'avant, regroupé par document ; App.js n'appelle plus que ces crochets.
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { onSnapshot, setDoc, updateDoc, deleteField, getDoc } from "firebase/firestore";
import { TESTBOOK_DOC_REF, TESTBOOK_IMG_REF, TURBINES_DOC_REF, TESTS_DOC_REF, PRODTURB_DOC_REF, DELAYS_DOC_REF, ACHATS_DOC_REF, ACCESS_DOC_REF, SAV_DOC_REF, SAV_DEM_DOC_REF } from "./appDocs";
import { notify } from "./components/SharedUI";
import { setCashinDoc, setCashinLinks, getCashinDoc, getCashinLinks, getOrdoPjs, cashGroupsFor } from "./cashinLink";
import { CASHIN_DOC_REF, CASHIN_LINKS_REF, CASHIN_SHARED_REF, CASHIN_PRODUIT_REF, buildSharedCashin } from "./cashinData";
import { useCashin } from "./useCashin";

// v305 : accès par page (planning/access) — lu par tous les comptes connectés (le menu en dépend), écrit par le super admin seul
export function useAccessDoc(currentUser, authorName) {
  const [accessDoc,setAccessDoc]=useState(null);
  useEffect(()=>{
    if(!currentUser)return undefined;
    return onSnapshot(ACCESS_DOC_REF(),snap=>setAccessDoc(snap.exists()?snap.data():{}),err=>{console.warn("access (lecture) :",err&&err.message);setAccessDoc({});});
  },[currentUser]);
  const saveAccess=useCallback(async next=>{
    try{await setDoc(ACCESS_DOC_REF(),{...next,at:new Date().toISOString(),by:authorName||""});return true;}
    catch(e){console.error(e);notify("Accès non enregistrés : "+e.message);return false;}
  },[authorName]);
  return {accessDoc,saveAccess};
}

// Pool de turbines : lu par le Manager (pinOk), enregistré en bloc
export function useTurbineDoc(pinOk, authorName) {
  const [turbineDoc,setTurbineDoc]=useState({turbines:[],wheelNames:[],injectorNames:[]}); // v146.22
  // v146.22 : pool de turbines (Manager uniquement)
  useEffect(()=>{
    if(!pinOk)return undefined;
    const unsub=onSnapshot(TURBINES_DOC_REF(),snap=>{
      const d=snap.exists()?snap.data():{};
      setTurbineDoc({...d,turbines:Array.isArray(d.turbines)?d.turbines:[],wheelNames:Array.isArray(d.wheelNames)?d.wheelNames:[],injectorNames:Array.isArray(d.injectorNames)?d.injectorNames:[]});
    },err=>console.error("Erreur Firestore (turbines):",err));
    return ()=>unsub();
  },[pinOk]);
  const saveTurbines=useCallback(async next=>{
    try{await setDoc(TURBINES_DOC_REF(),{...next,updatedAt:new Date().toISOString(),updatedBy:authorName||""});return true;}
    catch(e){console.error(e);notify("Erreur lors de l'enregistrement des turbines : "+e.message);return false;}
  },[authorName]);
  return { turbineDoc, saveTurbines };
}

// Tests (testeurs, affectations, catalogue FAT) : lus par tous les comptes connectés
export function useTestsDoc(currentUser, authorName) {
  const [testsDoc,setTestsDoc]=useState({testers:[],plans:{}});
  const [testsLoaded,setTestsLoaded]=useState(false);
  useEffect(()=>{
    if(!currentUser)return undefined;
    const unsub=onSnapshot(TESTS_DOC_REF(),snap=>{const d=snap.exists()?snap.data():{};setTestsDoc({...d,testers:Array.isArray(d.testers)?d.testers:[],plans:d.plans&&typeof d.plans==="object"?d.plans:{}});setTestsLoaded(true);},err=>{console.error("Erreur Firestore (tests):",err);setTestsLoaded(true);});
    return ()=>unsub();
  },[currentUser]);
  const saveTests=useCallback(async next=>{
    // v231 : la validation automatique des machines expédiées (testsView) n'est jamais écrite en base
    if(next&&next.plans){const plans={};Object.entries(next.plans).forEach(([pj,p])=>{plans[pj]=p&&p.forced&&p.forced.auto?{...p,forced:null}:p;});next={...next,plans};}
    try{await setDoc(TESTS_DOC_REF(),{...next,updatedAt:new Date().toISOString(),updatedBy:authorName||""});return true;}
    catch(e){console.error(e);notify("Erreur lors de l'enregistrement des tests : "+e.message);return false;}
  },[authorName]);
  return { testsDoc, testsLoaded, saveTests };
}

// Production turbines : document + opérations élément par élément
export function useProdTurbines(currentUser, authorName) {
  // v226 : Production turbines — lue par tous les comptes connectés (pour savoir qui y a accès), modifiée élément par élément
  const [prodDoc,setProdDoc]=useState(null);
  useEffect(()=>{
    if(!currentUser)return undefined;
    return onSnapshot(PRODTURB_DOC_REF(),snap=>setProdDoc(snap.exists()?snap.data():{}),err=>{console.warn("prodTurbines (lecture) :",err&&err.message);setProdDoc({});});
  },[currentUser]);
  const prodApi=useMemo(()=>{
    const stamp=()=>({updatedAt:new Date().toISOString(),updatedBy:authorName||""});
    const fail=e=>{console.error(e);notify("Erreur lors de l'enregistrement (Production turbines) : "+e.message);return false;};
    const setField=async(k,v)=>{try{await updateDoc(PRODTURB_DOC_REF(),{[k]:v,...stamp()});}catch(e){await setDoc(PRODTURB_DOC_REF(),{[k]:v,...stamp()},{merge:true});}return true;};
    return{
      put:async(c,id,data)=>{try{await setDoc(PRODTURB_DOC_REF(),{[c]:{[id]:data},...stamp()},{merge:true});const cur=(prodDoc&&prodDoc[c]&&prodDoc[c][id])||{};const gone=Object.keys(cur).filter(k=>!(k in data));if(gone.length)await updateDoc(PRODTURB_DOC_REF(),Object.fromEntries(gone.map(k=>[c+"."+id+"."+k,deleteField()])));return true;}catch(e){return fail(e);}},
      del:async(c,id)=>{try{await updateDoc(PRODTURB_DOC_REF(),{[c+"."+id]:deleteField(),...stamp()});return true;}catch(e){return fail(e);}},
      setParams:async p=>{try{return await setField("params",p);}catch(e){return fail(e);}},
      // v384 : l'équipe SAV indique l'ORC de chaque turbine d'une demande liée à son ticket / intervention (seul ce champ change)
      setAlloc:async(id,alloc)=>{try{await updateDoc(PRODTURB_DOC_REF(),{["besoins."+id+".alloc"]:alloc,["besoins."+id+".allocAt"]:new Date().toISOString(),["besoins."+id+".allocBy"]:authorName||"",...stamp()});return true;}catch(e){return fail(e);}},
      setAccess:async list=>{try{return await setField("access",list);}catch(e){return fail(e);}},
    };
  },[authorName,prodDoc]); // eslint-disable-line react-hooks/exhaustive-deps
  return { prodDoc, prodApi };
}

// Retards déclarés (par PJ), lus après la connexion
export function useDelays(authUid) {
  const [delays,setDelays]=useState({});
  useEffect(()=>{
    if(!authUid)return undefined; // v252 : pas de lecture avant la connexion
    const unsub = onSnapshot(DELAYS_DOC_REF(), (snap)=>{
      if(snap.exists())setDelays(snap.data().byPj || {});
    }, (err)=>{
      console.error("Erreur Firestore (delays):", err);
    });
    return ()=>unsub();
  },[authUid]);
  return delays;
}

// Cash in : magasin partagé (cashinLink) alimenté en temps réel pour le propriétaire et les admins, copie réduite publiée pour les autres
// v326 : SAV / MES — deux documents lus en temps réel par les comptes connectés ; écritures élément par élément (fusion)
//   planning/sav : tickets, inters, parc (+ techs) — équipe SAV ; planning/savDemandes : items (demandes des chefs de projet)
export function useSav(currentUser, authorName) {
  const [savDoc, setSavDoc] = useState(null), [demDoc, setDemDoc] = useState(null);
  useEffect(() => { if (!currentUser) return undefined;
    const u1 = onSnapshot(SAV_DOC_REF(), s => setSavDoc(s.exists() ? s.data() : {}), e => { console.warn("sav (lecture) :", e && e.message); setSavDoc({}); });
    const u2 = onSnapshot(SAV_DEM_DOC_REF(), s => setDemDoc(s.exists() ? s.data() : {}), e => { console.warn("savDemandes (lecture) :", e && e.message); setDemDoc({}); });
    return () => { u1(); u2(); }; }, [currentUser]);
  const mk = useCallback((R, label, docNow) => {
    const stamp = () => ({ updatedAt: new Date().toISOString(), updatedBy: authorName || "" });
    const fail = e => { console.error(e); notify("Erreur lors de l'enregistrement (" + label + ") : " + e.message); return false; };
    return {
      put: async (c, id, data) => { try { await setDoc(R(), { [c]: { [id]: data }, ...stamp() }, { merge: true }); const cur = (docNow && docNow[c] && docNow[c][id]) || {}; const gone = Object.keys(cur).filter(k => !(k in data)); if (gone.length) await updateDoc(R(), Object.fromEntries(gone.map(k => [c + "." + id + "." + k, deleteField()]))); return true; } catch (e) { return fail(e); } },
      del: async (c, id) => { try { await updateDoc(R(), { [c + "." + id]: deleteField(), ...stamp() }); return true; } catch (e) { return fail(e); } },
      setField: async (k, v) => { try { await setDoc(R(), { [k]: v, ...stamp() }, { merge: true }); return true; } catch (e) { return fail(e); } },
      merge: async obj => { try { await setDoc(R(), { ...obj, ...stamp() }, { merge: true }); return true; } catch (e) { return fail(e); } }, // v330 : reprise de l'historique SAV
    };
  }, [authorName]);
  const savApi = useMemo(() => mk(SAV_DOC_REF, "SAV", savDoc), [mk, savDoc]);
  const demApi = useMemo(() => mk(SAV_DEM_DOC_REF, "demandes SAV", demDoc), [mk, demDoc]);
  return { savDoc, demDoc, savApi, demApi };
}

// v323 : jalons « Produit » du Cash in (copie réduite) — lus par tout compte connecté, pour l'accueil du responsable produit
// v337 (D13) : livret de configuration — planning/testbook = { title, ref, chapters, images: { "media/image3.png": clé }, at, by } ;
// images dans planning/testbook_img_<clé> = { data: "data:image/jpeg;base64,…" } (lues à la demande, gardées en mémoire)
const bookImgCache = {};
export function useTestBook(currentUser, authorName) {
  const [book, setBook] = useState(null);
  useEffect(() => { if (!currentUser) return undefined;
    return onSnapshot(TESTBOOK_DOC_REF(), s => setBook(s.exists() ? s.data() : { chapters: [] }), e => { console.warn("testbook (lecture) :", e && e.message); setBook({ chapters: [] }); }); }, [currentUser]);
  const api = useMemo(() => ({
    loadImg: async k => { if (!k) return null; if (bookImgCache[k] !== undefined) return bookImgCache[k]; try { const s = await getDoc(TESTBOOK_IMG_REF(k)); bookImgCache[k] = s.exists() ? s.data().data || null : null; } catch (e) { bookImgCache[k] = null; } return bookImgCache[k]; },
    // images d'abord (une par document), puis le texte : un livret à moitié importé ne s'affiche jamais
    save: async (b, imgs, onStep) => {
      try { let i = 0; for (const [k, data] of Object.entries(imgs || {})) { await setDoc(TESTBOOK_IMG_REF(k), { data, at: new Date().toISOString() }); bookImgCache[k] = data; i++; if (onStep) onStep(i); }
        await setDoc(TESTBOOK_DOC_REF(), { ...b, at: new Date().toISOString(), by: authorName || "" }); notify("Livret enregistré", "ok"); return true; }
      catch (e) { console.error(e); notify("Enregistrement du livret impossible : " + (e && e.message), "warn"); return false; } },
  }), [authorName]);
  return { book, bookApi: api };
}
export function useCashinProduit(currentUser) {
  const [doc, setDoc0] = useState(null);
  useEffect(() => { if (!currentUser) return undefined;
    return onSnapshot(CASHIN_PRODUIT_REF(), s => setDoc0(s.exists() ? s.data() : { items: [] }), e => { console.warn("cashinProduit (lecture) :", e && e.message); setDoc0(null); }); }, [currentUser]);
  return doc;
}
export function useCashinSync(canCash, currentUser) {
  const [,setCashinVer]=useState(0);
  const cashStoreVer=useCashin();
  const lastSharedRef=useRef("");
  // v210 : propriétaire et admins lisent le Cash in complet (ci-dessous) ; les autres comptes n'y ont pas accès.
  useEffect(()=>{ if(canCash) return; setCashinDoc(null); setCashinLinks(null); setCashinVer(v=>v+1); },[canCash]);
  // Super admin : publie (avec un léger délai, seulement si le contenu a changé) la copie réduite du Cash in pour les administrateurs.
  useEffect(()=>{
    if(!canCash) return;
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
  },[canCash,cashStoreVer]); // eslint-disable-line
  useEffect(()=>{
    if(!canCash){ return; }
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
  },[canCash]);
}

// v262 : Achats / Appro — même principe que Production turbines : lu par les comptes connectés (pour savoir qui a accès),
// écrit élément par élément (fusion) par le propriétaire et les adresses de la liste « access » (règles Firestore)
export function useAchats(currentUser, authorName) {
  const [achatsDoc, setAchatsDoc] = useState(null);
  useEffect(() => {
    if (!currentUser) return undefined;
    return onSnapshot(ACHATS_DOC_REF(), snap => setAchatsDoc(snap.exists() ? snap.data() : {}), err => { console.warn("achats (lecture) :", err && err.message); setAchatsDoc({}); });
  }, [currentUser]);
  const achatsApi = useMemo(() => {
    const R = ACHATS_DOC_REF, stamp = () => ({ updatedAt: new Date().toISOString(), updatedBy: authorName || "" });
    const fail = e => { console.error(e); notify("Erreur lors de l'enregistrement (Achats / Appro) : " + e.message); return false; };
    const setField = async (k, v) => { try { await updateDoc(R(), { [k]: v, ...stamp() }); } catch (e) { await setDoc(R(), { [k]: v, ...stamp() }, { merge: true }); } return true; };
    return {
      put: async (c, id, data) => { try { await setDoc(R(), { [c]: { [id]: data }, ...stamp() }, { merge: true }); const cur = (achatsDoc && achatsDoc[c] && achatsDoc[c][id]) || {}; const gone = Object.keys(cur).filter(k => !(k in data)); if (gone.length) await updateDoc(R(), Object.fromEntries(gone.map(k => [c + "." + id + "." + k, deleteField()]))); return true; } catch (e) { return fail(e); } },
      del: async (c, id) => { try { await updateDoc(R(), { [c + "." + id]: deleteField(), ...stamp() }); return true; } catch (e) { return fail(e); } },
      setParams: async p => { try { return await setField("params", p); } catch (e) { return fail(e); } },
      setAccess: async list => { try { return await setField("access", list); } catch (e) { return fail(e); } },
    };
  }, [authorName, achatsDoc]);
  return { achatsDoc, achatsApi };
}
