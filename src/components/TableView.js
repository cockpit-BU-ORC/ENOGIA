import React, { useState, useLayoutEffect, useRef, useEffect } from "react";
import { T, FZ, D, mixHex } from "../theme";
import { useMarks, NewMark } from "./ChangesNotice";
import { EtatInfoButton } from "./ProdStagesUI";
import { getPjMeta, initials, personTint, DriftDot, PresenceChip, presenceKind, presenceDates, presenceFirstDate, CountryFlag, ETAT_META, ALL_ETATS, ALL_GAMMES, GAMME_COLORS, MONTHS, today } from "../pjMeta";
import { diffDays, fmtMode } from "../parsers";
import { HoverPop, useSheetJS, Badge, DropFilter, NavIcon, useCloseOnSignal, EmptyState, pressable } from "./SharedUI";
import { ProjectModal } from "./ProjectModal";
import { RowMenu } from "./RowMenu";
import { EtatPopBody, DriftPopBody, AvPopBody } from "./RowPops";
import { useDetailMode } from "../detailMode";
import { EtatSelect, PresenceEditor } from "./ManagerParts";
import { exportPlanningXlsx } from "../exportExcel";
import { useIsPhone } from "../useIsPhone";

export const TABLE_COLUMNS=[
  {id:"serie",label:"N° de série (sous le PJ)"},
  {id:"projet",label:"Projet"},
  {id:"commentaires",label:"Commentaires"},
  {id:"pays",label:"Pays"},
  {id:"chef",label:"Chef de projet"},
  {id:"gamme",label:"Gamme"},
  {id:"etat",label:"État"},
  {id:"arrivee",label:"Arrivée"},
  {id:"tests",label:"Tests"},
  {id:"finprod",label:"Fin prod"},
  {id:"depart",label:"Départ"},
  {id:"avancement",label:"Avancement"},
];
export function ColumnPicker({hidden,setHidden}){
  const [open,setOpen]=useState(false);
  useCloseOnSignal(setOpen);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const toggle=id=>{const s=new Set(hidden);s.has(id)?s.delete(id):s.add(id);setHidden(s);};
  const openMenu=()=>{
    if(btnRef.current){const r=btnRef.current.getBoundingClientRect();setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-230)});}
    setOpen(v=>!v);
  };
  return(<span style={{position:"relative",display:"inline-block"}}>
    <button ref={btnRef} onClick={openMenu} style={{padding:"6px 12px",borderRadius:8,border:"none",background:hidden.size>0?T.teal100:T.card,color:hidden.size>0?T.teal600:T.ink700,fontSize:FZ.xs,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:hidden.size>0?T.neuInSm:T.neuOutSm}}><span style={{color:T.teal500,display:"flex"}}><NavIcon name="settings" size={12}/></span>Colonnes{hidden.size>0?" ("+(TABLE_COLUMNS.length-hidden.size)+"/"+TABLE_COLUMNS.length+")":""}</button>
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
      <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:12,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,minWidth:200,maxHeight:340,overflowY:"auto",fontFamily:T.font}}>
        <div style={{padding:"8px 12px",fontSize:FZ.sm,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".03em",borderBottom:"1px solid "+T.line,background:T.surface}}>Colonnes visibles</div>
        {TABLE_COLUMNS.map(c=>{const visible=!hidden.has(c.id);return(
          <div key={c.id} {...pressable(()=>toggle(c.id),{role:"checkbox","aria-checked":visible})} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderBottom:"1px solid "+T.surface}}>
            <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(visible?T.teal500:T.ink100),background:visible?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{visible&&<span style={{color:"#fff",fontSize:FZ.sm,fontWeight:700}}>✓</span>}</div>
            <span style={{fontSize:FZ.md,color:T.ink700,fontWeight:visible?600:400}}>{c.label}</span>
          </div>
        );})}
      </div>
    </>}
  </span>);
}
// Sélecteur d'affichage des dates (Jours / Semaines / Mois), déplacé ici depuis l'en-tête
// global de l'application (qui ne doit plus porter que le titre) — se présente comme les
// autres réglages de la vue liste (bouton + menu flottant, même famille que ColumnPicker).
export function DateFormatPicker({df,setDf}){
  const [open,setOpen]=useState(false);
  useCloseOnSignal(setOpen);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const LABELS={date:"Jours",semaine:"Semaines",mois:"Mois"};
  const openMenu=()=>{
    if(btnRef.current){const r=btnRef.current.getBoundingClientRect();setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-170)});}
    setOpen(v=>!v);
  };
  return(<span style={{position:"relative",display:"inline-block"}}>
    <button ref={btnRef} onClick={openMenu} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.card,color:T.ink700,fontSize:FZ.xs,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:T.neuOutSm}}>
      <span style={{color:T.teal500,display:"flex"}}><NavIcon name="calendar" size={12}/></span>Affichage : {LABELS[df]}
    </button>
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
      <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:12,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,minWidth:150,overflow:"hidden",fontFamily:T.font}}>
        {Object.entries(LABELS).map(([k,l])=><div key={k} {...pressable(()=>{setDf(k);setOpen(false);},{role:"radio","aria-checked":df===k})} style={{padding:"8px 12px",cursor:"pointer",fontSize:FZ.sm,fontWeight:df===k?700:500,color:df===k?T.teal600:T.ink700,background:df===k?T.teal100:"transparent"}}>{l}</div>)}
      </div>
    </>}
  </span>);
}
// Gamme/Projet/Pays élargis (ils étaient tronqués par l'ellipsis vu leur contenu — "Ajuster
// automatiquement les colonnes pour qu'on puisse voir toutes les données") ; État réduit en
// contrepartie car le badge est déjà compact depuis la réduction de sa police.
// Colonnes de dates élargies : avec l'année (« 20/10/26 ») elles étaient tronquées par « … » (demandé : « dans l'onglet liste on ne voit pas l'année »).
// Hauteur de ligne FIXE : toutes les lignes ont la même hauteur, quel que soit leur contenu (pastilles, noms longs…).
// Écran à échelle fractionnaire (zoom navigateur 90 %/110 %, Windows 125 %/150 %) : une ligne de 52 px CSS ne fait
// pas un nombre entier de pixels écran, donc les barres d'avancement tombaient tantôt pile sur un pixel (nettes,
// plus épaisses), tantôt entre deux (floues, plus fines). On cale hauteur de ligne, de piste et de barre sur des
// pixels écran entiers pour que toutes les lignes soient dessinées de façon identique.
function useDpr(){
  const [d,setD]=useState(()=>(typeof window!=="undefined"&&window.devicePixelRatio)||1);
  React.useEffect(()=>{const f=()=>setD(window.devicePixelRatio||1);window.addEventListener("resize",f);return()=>window.removeEventListener("resize",f);},[]);
  return d;
}
export const DEFAULT_COL_WIDTHS_PCT={pj:7,serie:7,projet:13,pays:8,chef:5,gamme:7,etat:8,arrivee:8,tests:16,finprod:8,depart:8,avancement:7,commentaires:5};
export function ResizeHandle({colId,nextColId,colWidths,setColWidths,order,userSized,markSized}){
  const onMouseDown=e=>{
    e.preventDefault();
    const startX=e.clientX;
    const table=e.target.closest("table");
    const tableW=table?table.getBoundingClientRect().width:1000;
    // Tant que l'utilisateur n'a rien redimensionné, les colonnes sont élastiques (sans largeur
    // imposée). Au premier glissement on fige les largeurs réellement affichées (en %) pour que
    // la colonne tirée suive exactement la souris.
    let base=colWidths;
    if(!userSized&&order&&table){
      const ths=[...table.querySelectorAll("thead th")];
      base={...colWidths};
      order.forEach((id,i)=>{if(ths[i])base[id]=ths[i].getBoundingClientRect().width/tableW*100;});
      setColWidths(base);
      markSized&&markSized();
    }
    const startW=base[colId];
    const startNextW=nextColId?base[nextColId]:null;
    const onMove=ev=>{
      const deltaPct=((ev.clientX-startX)/tableW)*100;
      setColWidths(w=>{
        const next={...w};
        const newW=Math.max(5,startW+deltaPct);
        if(nextColId&&startNextW!=null){
          // Transfère la largeur entre la colonne courante et la suivante, la somme totale reste constante
          const newNextW=Math.max(5,startNextW-deltaPct);
          const actualDelta=newW-startW;
          next[colId]=startW+actualDelta;
          next[nextColId]=startNextW-actualDelta;
        }else{
          next[colId]=newW;
        }
        return next;
      });
    };
    const onUp=()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };
  return <div onMouseDown={onMouseDown} style={{position:"absolute",right:-3,top:0,bottom:0,width:6,cursor:"col-resize",zIndex:3}}/>;
}
// Édition directe depuis la Liste (admins) : la pastille de présence ouvre un petit éditeur flottant
// (choix client / NOBO / les deux + une date par partie, bornée à la période de tests).
function PresenceCell({r,tight,onChange}){
  const [pos,setPos]=useState(null);
  const kind=presenceKind(r.clientPresence);
  useEffect(()=>{
    if(!pos)return;
    const k=e=>{if(e.key==="Escape")setPos(null);};
    window.addEventListener("keydown",k);
    return()=>window.removeEventListener("keydown",k);
  },[pos]);
  const open=e=>{
    e.stopPropagation();
    const b=e.currentTarget.getBoundingClientRect();
    const W=Math.min(460,window.innerWidth-16);
    setPos({left:Math.max(8,Math.min(b.left,window.innerWidth-W-8)),top:b.bottom+6>window.innerHeight-170?Math.max(8,b.top-150):b.bottom+6,W});
  };
  return(<span onClick={e=>e.stopPropagation()} style={{flexShrink:0,display:"inline-flex"}}>
    <button onClick={open} title={kind?"Modifier la présence client / NOBO":"Ajouter une présence client / NOBO"} aria-label="Modifier la présence client / NOBO" style={{border:kind?"none":"1px dashed "+T.line,background:"transparent",padding:kind?0:"1px 6px",borderRadius:999,cursor:"pointer",display:"inline-flex",alignItems:"center",color:T.ink300,fontSize:11,fontWeight:700,fontFamily:T.font,lineHeight:1.4}}>
      {kind
        ?<PresenceChip kind={kind} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} compact tiny short={tight} fontSize={10.5}/>
        :<span>＋ Client/NOBO</span>}
    </button>
    {pos&&<>
      <div onClick={e=>{e.stopPropagation();setPos(null);}} style={{position:"fixed",inset:0,zIndex:9998}}/>
      <div role="dialog" aria-label={"Présence client / NOBO — "+r.pj} style={{position:"fixed",left:pos.left,top:pos.top,width:pos.W,zIndex:9999,background:T.card,border:"1px solid "+T.line,borderRadius:12,boxShadow:T.shadowLg||"0 12px 32px rgba(15,23,42,.18)",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <span style={{fontSize:FZ.sm,fontWeight:800,color:T.ink900}}>Présence aux tests · <span style={{fontFamily:T.fontMono,color:T.teal600}}>{r.pj}</span></span>
          <button onClick={()=>setPos(null)} aria-label="Fermer" style={{border:"none",background:"transparent",cursor:"pointer",color:T.ink500,fontSize:FZ.sm,fontWeight:800,padding:"0 4px",display:"inline-flex"}}><NavIcon name="close" size={14}/></button>
        </div>
        <PresenceEditor r={r} presence={r.clientPresence} onChange={onChange}/>
      </div>
    </>}
  </span>);
}

export function TableView({data,progress,df,setDf,selEtats,setSelEtats,selGammes,setSelGammes,allPJs,selPJs,setSelPJs,allProjets,selProjets,setSelProjets,allPays,selPays,setSelPays,allChefs,selChefs,setSelChefs,selMoisArrivee,setSelMoisArrivee,selMoisTests,setSelMoisTests,selMoisFinProd,setSelMoisFinProd,selMoisDepart,setSelMoisDepart,comments,addComment,deleteComment,pinOk,delays,delayTypes,setDelayTypes,addDelayAllocation,deleteDelayAllocation,addDelayComment,deleteDelayComment,externalSel,setExternalSel,authorName,savePjMetaOverride,canEditMeta,onlyDrift,setOnlyDrift,onlyChanged,setOnlyChanged,setEtatFor,setClientPresenceFor}){
  const {marks,clear:clearMarks}=useMarks();
  const [selInternal,setSelInternal]=useState(null);
  const panelRef=useRef(null);
  const sel=externalSel!==undefined?externalSel:selInternal;
  const setSel=setExternalSel||setSelInternal;
  const [rowMenu,setRowMenu]=useState(null); // v162 : menu d'actions rapides {pj,x,y}
  const closeRowMenu=React.useCallback(()=>setRowMenu(null),[]);
  const focusComment=()=>{let n=0;const t=setInterval(()=>{const el=document.querySelector("textarea");n++;if(el){clearInterval(t);try{el.scrollIntoView({block:"center",behavior:"smooth"});el.focus({preventScroll:true});}catch(e){}}else if(n>12)clearInterval(t);},120);};
  // Téléphone : la fiche s'ouvre sous le tableau — on y amène l'écran au toucher d'une ligne.
  useEffect(()=>{if(sel&&typeof window!=="undefined"&&window.innerWidth<=700&&panelRef.current)panelRef.current.scrollIntoView({behavior:"smooth",block:"start"});},[sel]);
  // Volet de droite (fiche projet) réductible (demandé explicitement) — mémorisé entre les visites.
  const phone=useIsPhone();
  const [detailMode]=useDetailMode(); // v159 : fiche en volet à droite ou en pop-up central (choix personnel)
  const popupMode=detailMode==="popup";
  const [panelCollapsed,setPanelCollapsed]=useState(()=>{try{return localStorage.getItem("enogia_panelCollapsed")==="1";}catch(e){return false;}});
  const togglePanel=()=>setPanelCollapsed(v=>{const n=!v;try{localStorage.setItem("enogia_panelCollapsed",n?"1":"0");}catch(e){}return n;});
  const [hiddenCols,setHiddenCols]=useState(new Set());
  const [colWidths,setColWidths]=useState(DEFAULT_COL_WIDTHS_PCT);
  // Responsive : par défaut les colonnes sont élastiques (aucune largeur imposée) et se partagent
  // toute la largeur disponible ; elles ne reçoivent une largeur fixe (en %) qu'une fois
  // redimensionnées à la main.
  const [userSized,setUserSized]=useState(false);
  // Densité selon la largeur réellement disponible pour la liste (varie avec la taille de l'écran
  // et la présence du volet de droite) : l'espacement horizontal se resserre avant que les
  // colonnes ne débordent.
  const dpr=useDpr();
  const rowH=Math.round(D.row*dpr)/dpr;
  const barDev=Math.max(2,Math.round(3*dpr));let boxDev=Math.round(20*dpr);if((boxDev-barDev)%2)boxDev+=1;   // même parité => barre centrée sur un pixel entier
  const listRef=React.useRef(null);
  const [listW,setListW]=useState(1200);
  React.useEffect(()=>{
    const el=listRef.current;if(!el)return;
    const upd=()=>setListW(Math.round(el.getBoundingClientRect().width));
    upd();
    if(typeof ResizeObserver==="undefined"){window.addEventListener("resize",upd);return()=>window.removeEventListener("resize",upd);}
    const ro=new ResizeObserver(upd);ro.observe(el);return()=>ro.disconnect();
  },[]);
  // Colonne N° PJ figée à gauche : ombre légère dès que le tableau défile horizontalement.
  const [scrolledX,setScrolledX]=useState(false);
  // v126 : tri de la liste, « En dérive seulement » (état dans App : il suit aussi le Gantt et le calendrier, comme les autres filtres)
  // et vues enregistrées. Le tri ne change que l'ordre d'affichage, jamais les données.
  // v146.12 : le tri se choisit directement dans les flèches des en-têtes (plus de menu « Tri » en haut à gauche).
  // sort = {col, dir}. dir : "asc" | "desc" | "drift" (colonne Départ : les plus en retard d'abord). Sans tri : ordre du planning.
  const [sort,setSort]=useState({col:null,dir:null});
  const ariaSort=col=>sort.col===col&&sort.dir?(sort.dir==="asc"?"ascending":"descending"):undefined; // v164 : tri annoncé aux lecteurs d'écran
  const setColSort=col=>dir=>setSort(dir?{col,dir}:{col:null,dir:null});
  const sortOf=col=>({active:sort.col===col?sort.dir:null,onChange:setColSort(col)});
  const rows=React.useMemo(()=>{
    if(!sort.col||!sort.dir)return data;
    const T0=v=>v?new Date(v).getTime():null;
    const GET={
      pj:r=>r.pj,
      projet:r=>getPjMeta(r.pj,r).nomProjet,
      pays:r=>getPjMeta(r.pj,r).pays,
      chef:r=>getPjMeta(r.pj,r).chefProjet,
      gamme:r=>r.gamme,
      etat:r=>{const i=ALL_ETATS.indexOf(r.etat);return i<0?null:i;},
      arrivee:r=>T0(r.arrivee),tests:r=>T0(r.tests),finprod:r=>T0(r.finProd),depart:r=>T0(r.depart),
      avancement:r=>progress[r.pj]
    };
    const g=GET[sort.col];if(!g)return data;
    const a=[...data];
    const DATE_COLS={arrivee:r=>[T0(r.arrivee),T0(r.arrivee)],tests:r=>{const a=T0(r.tests);return [a,T0(r.testsFin)??a];},finprod:r=>[T0(r.finProd),T0(r.finProd)],depart:r=>[T0(r.depart),T0(r.depart)]};
    if(DATE_COLS[sort.col]&&sort.dir==="asc"){
      // v146.14 « Prochaine date d'abord » : ce qui arrive en premier dans le calendrier à partir d'aujourd'hui (en cours ou à venir, le plus proche en tête),
      // puis les dates passées (la plus récente d'abord), puis les PJ sans date. Pour les tests, un passage au banc en cours compte comme à venir.
      const rg=DATE_COLS[sort.col],dep=r=>T0(r.depart)??8.64e15;
      const now=new Date(today).setHours(0,0,0,0);
      const grp=r=>{const [s0,e0]=rg(r);return s0==null?2:(e0>=now?0:1);};
      a.sort((x,y)=>{const gx=grp(x),gy=grp(y);if(gx!==gy)return gx-gy;
        const [x0,x1]=rg(x),[y0,y1]=rg(y);
        if(gx===0)return (x0-y0)||(x1-y1)||(dep(x)-dep(y));
        if(gx===1)return (y1-x1)||(y0-x0);
        return dep(x)-dep(y);});
      return a;
    }
    if(DATE_COLS[sort.col]&&sort.dir==="old"){
      a.sort((x,y)=>{const vx=g(x),vy=g(y);if(vx==null||vy==null)return vx==null&&vy==null?0:(vx==null?1:-1);return vx-vy;});return a;
    }
    if(sort.dir==="drift"){
      const dr=r=>r.drift==null?-1e9:r.drift,dep=r=>T0(r.depart)??8.64e15;
      a.sort((x,y)=>(dr(y)-dr(x))||(dep(x)-dep(y)));return a;
    }
    const sgn=sort.dir==="desc"?-1:1;
    a.sort((x,y)=>{
      const vx=g(x),vy=g(y);
      const nx=vx==null||vx==="",ny=vy==null||vy==="";
      if(nx||ny)return nx&&ny?0:(nx?1:-1); // les valeurs vides restent toujours en bas
      const c=typeof vx==="number"&&typeof vy==="number"?vx-vy:String(vx).localeCompare(String(vy),"fr",{numeric:true,sensitivity:"base"});
      return c*sgn;
    });
    return a;
  },[data,sort,progress]);
  const baseView=()=>({etats:ALL_ETATS.filter(e=>e!=="SLOT_LIBRE"),gammes:[...ALL_GAMMES],pjs:null,projets:null,pays:null,chefs:null,mArr:[...MONTHS],mTests:[...MONTHS],mFin:[...MONTHS],mDep:[...MONTHS],drift:false,sort:"none"});
  const applyView=st=>{
    const b=baseView(),S=(a,d)=>new Set(a||d),N=a=>a?new Set(a):null;
    setSelEtats&&setSelEtats((()=>{const e=S(st.etats,b.etats);if(e.has("PROD")){e.delete("PROD");["MONTAGE","ELEC","TESTS","PACKAGING"].forEach(x=>e.add(x));}return e;})());setSelGammes&&setSelGammes(S(st.gammes,b.gammes));
    setSelPJs&&setSelPJs(N(st.pjs));setSelProjets&&setSelProjets(N(st.projets));setSelPays&&setSelPays(N(st.pays));setSelChefs&&setSelChefs(N(st.chefs));
    setSelMoisArrivee&&setSelMoisArrivee(S(st.mArr,b.mArr));setSelMoisTests&&setSelMoisTests(S(st.mTests,b.mTests));setSelMoisFinProd&&setSelMoisFinProd(S(st.mFin,b.mFin));setSelMoisDepart&&setSelMoisDepart(S(st.mDep,b.mDep));
    setOnlyDrift&&setOnlyDrift(false);setSort({col:null,dir:null});
  };
  const PX=listW>=1280?16:listW>=1100?10:listW>=900?7:4;
  const tight=listW<1280;
  const FS=listW<900?FZ.xs:FZ.sm; // police des cellules : un cran plus petite quand la liste est très étroite
  useSheetJS();
  // v130 : la liste doit tenir dans sa largeur sans défilement horizontal. Le N° de série passe sous le N° PJ, le pays devient un drapeau ;
  // si cela ne suffit pas, les colonnes les moins importantes sont masquées une à une, automatiquement, jusqu'à ce que tout tienne (mesure réelle
  // du tableau, pas une estimation). Elles reviennent d'elles-mêmes dès qu'il y a de la place (volet de droite réduit, écran plus large).
  const AUTO_ORDER=["arrivee","finprod","chef","gamme","pays","commentaires","tests","avancement"];
  const boxRef=React.useRef(null);
  const fitKey=listW+"|"+data.length+"|"+[...hiddenCols].sort().join(",")+"|"+df+"|"+(userSized?"u":"a");
  const [fit,setFit]=useState({key:"",n:0});
  const nAuto=fit.key===fitKey?fit.n:0;
  const autoCols=AUTO_ORDER.filter(id=>!hiddenCols.has(id));
  const autoHide=new Set(autoCols.slice(0,nAuto));
  useLayoutEffect(()=>{
    const el=boxRef.current;if(!el)return;
    if(el.scrollWidth>el.clientWidth+1&&nAuto<autoCols.length)setFit({key:fitKey,n:nAuto+1});
    else if(fit.key!==fitKey)setFit({key:fitKey,n:nAuto});
  });
  const show=id=>!hiddenCols.has(id)&&!autoHide.has(id);
  const cw=id=>userSized?(colWidths[id]||DEFAULT_COL_WIDTHS_PCT[id])+"%":undefined;
  // v128 : vrai tableau Excel aux couleurs du site (ExcelJS) ; l'ancien export simple (SheetJS) reste en secours si la bibliothèque
  // ne peut pas se charger (hors ligne, réseau filtré). Il exporte ce qui est affiché : filtres et tri compris.
  const exportToExcel=async()=>{
    const clean=v=>!v||v==="—"?"":v;
    const recs=rows.map(r=>{const meta=getPjMeta(r.pj,r);const pv=progress[r.pj];return{pj:r.pj,serie:meta.numSerie||"",projet:clean(meta.nomProjet),pays:clean(meta.pays),chef:clean(meta.chefProjet),gamme:r.gamme||"",etat:r.etat,etatLabel:ETAT_META[r.etat]?.label||r.etat||"",arrivee:r.arrivee,testsDebut:r.tests,testsFin:r.testsFin,finProd:r.finProd,depart:r.depart,drift:r.drift==null?null:r.drift,avancement:pv!=null&&pv!==""&&!isNaN(Number(pv))?Number(pv):null};});
    try{await exportPlanningXlsx(recs);}catch(e){exportSimple();}
  };
  const exportSimple=()=>{
    if(!window.XLSX){alert("Librairie Excel en cours de chargement, réessayez dans 2 secondes.");return;}
    const headers=["N° PJ","N° de série","Projet","Pays","Chef de Projet","Gamme","État","Arrivée","Tests","Fin prod","Départ","Avancement (%)"];
    const xrows=rows.map(r=>{
      const meta=getPjMeta(r.pj,r);
      const pval=progress[r.pj];
      return [
        r.pj,
        meta.numSerie||"",
        meta.nomProjet,
        meta.pays,
        meta.chefProjet,
        r.gamme||"",
        ETAT_META[r.etat]?.label||r.etat||"",
        r.arrivee?new Date(r.arrivee).toLocaleDateString("fr-FR"):"",
        (r.tests?new Date(r.tests).toLocaleDateString("fr-FR"):"")+(r.testsFin?" → "+new Date(r.testsFin).toLocaleDateString("fr-FR"):""),
        r.finProd?new Date(r.finProd).toLocaleDateString("fr-FR"):"",
        r.depart?new Date(r.depart).toLocaleDateString("fr-FR"):"",
        pval!=null?pval:""
      ];
    });
    const ws=window.XLSX.utils.aoa_to_sheet([headers,...xrows]);
    ws["!cols"]=headers.map(()=>({wch:17}));
    const wb=window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb,ws,"Planning");
    const dateStr=new Date().toLocaleDateString("fr-FR").replaceAll("/","-");
    window.XLSX.writeFile(wb,"Planning_Enogia_"+dateStr+".xlsx");
  };
  // Liste ordonnée des colonnes actuellement visibles, pour savoir quelle est "la suivante" lors du redimensionnement
  const visibleColOrder=["pj","projet","pays","chef","gamme","etat","arrivee","tests","finprod","depart","avancement","commentaires"].filter(id=>id==="pj"||show(id));
  const allColOrder=["pj","projet","pays","chef","gamme","etat","arrivee","tests","finprod","depart","avancement","commentaires"].filter(id=>id==="pj"||show(id));
  const nextVisible=id=>{const i=visibleColOrder.indexOf(id);return i>=0&&i<visibleColOrder.length-1?visibleColOrder[i+1]:null;};
  // v162 : ni zébrage ni fond de survol global (liseré + teinte d état par ligne)
  const thBase={padding:(D.cellY+2)+"px "+PX+"px",textAlign:"left",fontWeight:600,color:T.ink500,fontSize:FZ.xs,lineHeight:1.25,whiteSpace:"normal",position:"sticky",top:0,zIndex:10,background:T.surface,borderBottom:"1px solid "+T.line,backgroundClip:"padding-box",overflow:"hidden",verticalAlign:"middle",boxShadow:"1px 0 0 0 "+T.surfaceAlt}; // v146.21 : l'ombre de 1 px recouvre le filet sombre qui apparaissait entre deux en-têtes (arrondis de largeur)
  // Pas de cadre ni de carte ici (demandé explicitement : trop de bordures plus foncées que le
  // crème, ça faisait "bizarre") — aucun fond propre sur ce bloc, ni sur la barre d'outils, ni
  // sur l'en-tête du tableau, ni sur les lignes par défaut : tout reste au même crème que la
  // page. Seuls les boutons de la barre d'outils gardent un fond blanc (affordance de clic), et
  // un unique filet fin sépare la barre d'outils du tableau — le reste ne s'appuie que sur
  // l'espacement, pas sur des traits.
  // Mise en page à deux colonnes : la liste (qui peut rétrécir) + la fiche projet persistante à
  // droite (qui se met à jour au clic sur une ligne, demandé explicitement — plus de pop-up qui
  // s'ouvre/se ferme). flexWrap fait repasser la fiche sous le tableau sur un écran étroit plutôt
  // que de l'écraser, pour rester responsive.
  // alignItems par défaut (stretch, pas flex-start) : la colonne de droite doit être aussi haute
  // que la liste pour que son panneau "position:sticky" ait la place de suivre le défilement sur
  // toute la hauteur de la liste, plutôt que de décrocher après le premier écran — demandé
  // explicitement ("ça doit être un élément qui suit le défilement vers le bas").
  return(<div style={{display:"flex",gap:16,flexWrap:"wrap",fontFamily:T.font}}>
  <div ref={listRef} style={{flex:"3 1 640px",minWidth:0}}>
    <div style={{padding:"12px 4px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        {setOnlyChanged&&marks.size>0&&<span style={{display:"inline-flex",alignItems:"center",gap:6}}>
          <button onClick={()=>setOnlyChanged(!onlyChanged)} aria-pressed={!!onlyChanged} title="N'afficher que les PJ touchés par les derniers imports (depuis votre dernière lecture)"
            style={{padding:"6px 12px",borderRadius:8,border:"none",minHeight:28,background:onlyChanged?T.teal100:T.card,color:onlyChanged?T.teal600:T.ink700,fontSize:FZ.xs,fontWeight:600,cursor:"pointer",boxShadow:T.neuOutSm,fontFamily:T.font}}>{onlyChanged?"✓ ":""}Modifiés ({marks.size})</button>
          <button onClick={()=>{clearMarks();setOnlyChanged(false);}} title="Retire les repères « modifié » de la Liste et du Calendrier" style={{padding:"4px 8px",borderRadius:8,border:"none",background:"transparent",color:T.ink500,fontSize:FZ.xs,fontWeight:600,cursor:"pointer",fontFamily:T.font,textDecoration:"underline"}}>Tout marquer comme vu</button>
        </span>}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      {setDf&&<DateFormatPicker df={df} setDf={setDf}/>}
      <button onClick={exportToExcel} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.card,color:T.ink700,fontSize:FZ.xs,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:T.neuOutSm,transition:"box-shadow .15s ease"}}
        onMouseDown={e=>e.currentTarget.style.boxShadow=T.neuInSm} onMouseUp={e=>e.currentTarget.style.boxShadow=T.neuOutSm} onMouseLeave={e=>e.currentTarget.style.boxShadow=T.neuOutSm}><span style={{color:T.teal500,display:"flex"}}><NavIcon name="download" size={12}/></span><span className="enogia-hide-phone">Export Excel</span></button>
      <ColumnPicker hidden={hiddenCols} setHidden={setHiddenCols}/>
      </div>
    </div>
    {autoHide.size>0&&!phone&&<div role="status" style={{padding:"0 4px 8px",fontSize:FZ.xs,color:T.ink500,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <span>{autoHide.size} colonne{autoHide.size>1?"s":""} masquée{autoHide.size>1?"s":""} faute de place ({autoCols.slice(0,nAuto).map(id=>TABLE_COLUMNS.find(c=>c.id===id)?.label||id).join(", ")}).</span>
      {!panelCollapsed&&!popupMode&&<button onClick={togglePanel} style={{border:"none",background:"transparent",color:T.teal600,fontWeight:700,fontSize:FZ.xs,cursor:"pointer",padding:0,fontFamily:T.font,textDecoration:"underline"}}>Réduire le volet de droite pour les afficher</button>}
    </div>}
    {rows.length===0&&<EmptyState compact icon="search" title={onlyDrift?"Aucun PJ en dérive avec les filtres actuels.":"Aucun PJ ne correspond aux filtres actuels."} action="Tout afficher" onAction={()=>applyView(baseView())}/>}
    <div ref={boxRef} onScroll={e=>{const v=e.currentTarget.scrollLeft>0;if(v!==scrolledX)setScrolledX(v);}} style={{overflow:"auto",maxHeight:"calc(100dvh - 170px)",minHeight:240,padding:"0 4px"}}>
    {/* tableLayout:"auto" (plus "fixed") : les largeurs de colonnes ci-dessous ne sont plus que des
        points de départ — le navigateur élargit automatiquement une colonne si son contenu ne
        rentre pas, au lieu de le tronquer avec "..." ("ajuster automatiquement les colonnes pour
        qu'on puisse voir toutes les données"). Le défilement horizontal du conteneur parent prend
        le relais si la somme dépasse la largeur visible. */}
    <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto",fontVariantNumeric:"tabular-nums"}}>
      <colgroup>
        <col style={{width:cw("pj")}}/>
        {show("projet")&&<col style={{width:cw("projet")}}/>}
        {show("pays")&&<col style={{width:cw("pays")}}/>}
        {show("chef")&&<col style={{width:cw("chef")}}/>}
        {show("gamme")&&<col style={{width:cw("gamme")}}/>}
        {show("etat")&&<col style={{width:cw("etat")}}/>}
        {show("arrivee")&&<col style={{width:cw("arrivee")}}/>}
        {show("tests")&&<col style={{width:cw("tests")}}/>}
        {show("finprod")&&<col style={{width:cw("finprod")}}/>}
        {show("depart")&&<col style={{width:cw("depart")}}/>}
        {show("avancement")&&<col style={{width:cw("avancement")}}/>}
        {show("commentaires")&&<col style={{width:cw("commentaires")}}/>}
      </colgroup>
      <thead className="enogia-thead"><tr>
        <th style={{...thBase,left:0,zIndex:12,boxShadow:scrolledX?"4px 0 6px -4px rgba(15,40,60,.22)":"1px 0 0 0 "+T.surfaceAlt}}>N° PJ {allPJs&&<DropFilter label="" icon sort={{...sortOf("pj"),asc:"Croissant",desc:"Décroissant"}} options={allPJs} selected={selPJs||new Set(allPJs)} onChange={setSelPJs}/>}<ResizeHandle colId="pj" nextColId={nextVisible("pj")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>
        {show("projet")&&<th aria-sort={ariaSort("projet")} style={thBase}>Projet {allProjets&&<DropFilter label="" icon sort={{...sortOf("projet"),asc:"A → Z",desc:"Z → A"}} options={allProjets} selected={selProjets||new Set(allProjets)} onChange={setSelProjets}/>}<ResizeHandle colId="projet" nextColId={nextVisible("projet")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("pays")&&<th aria-sort={ariaSort("pays")} style={thBase}>Pays {allPays&&<DropFilter label="" icon sort={{...sortOf("pays"),asc:"A → Z",desc:"Z → A"}} options={allPays} selected={selPays||new Set(allPays)} onChange={setSelPays}/>}<ResizeHandle colId="pays" nextColId={nextVisible("pays")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("chef")&&<th aria-sort={ariaSort("chef")} style={thBase}>Chef de projet {allChefs&&<DropFilter label="" icon sort={{...sortOf("chef"),asc:"A → Z",desc:"Z → A"}} options={allChefs} selected={selChefs||new Set(allChefs)} onChange={setSelChefs} getLabel={o=>initials(o)+" — "+o}/>}<ResizeHandle colId="chef" nextColId={nextVisible("chef")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("gamme")&&<th aria-sort={ariaSort("gamme")} style={thBase}>Gamme {setSelGammes&&<DropFilter label="" icon sort={{...sortOf("gamme"),asc:"A → Z",desc:"Z → A"}} options={ALL_GAMMES} selected={selGammes} onChange={setSelGammes}/>}<ResizeHandle colId="gamme" nextColId={nextVisible("gamme")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("etat")&&<th aria-sort={ariaSort("etat")} style={thBase}><span style={{whiteSpace:"nowrap"}}>État {setSelEtats&&<DropFilter label="" icon sort={{...sortOf("etat"),asc:"Ordre d'avancement",desc:"Ordre inverse"}} options={ALL_ETATS} selected={selEtats} onChange={setSelEtats} getLabel={o=>ETAT_META[o]?.label||o}/>}{setSelEtats&&<EtatInfoButton style={{marginLeft:4,verticalAlign:"middle"}}/>}</span><ResizeHandle colId="etat" nextColId={nextVisible("etat")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("arrivee")&&<th aria-sort={ariaSort("arrivee")} style={thBase}>Arrivée {setSelMoisArrivee&&<DropFilter label="" icon sort={{...sortOf("arrivee"),asc:"Prochaine date d'abord (à venir)",desc:"Date la plus tardive d'abord",extra:[{id:"old",label:"Date la plus ancienne d'abord"}]}} options={MONTHS} selected={selMoisArrivee} onChange={setSelMoisArrivee}/>}<ResizeHandle colId="arrivee" nextColId={nextVisible("arrivee")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("tests")&&<th aria-sort={ariaSort("tests")} style={thBase}>Tests {setSelMoisTests&&<DropFilter label="" icon sort={{...sortOf("tests"),asc:"Prochaine date d'abord (à venir)",desc:"Date la plus tardive d'abord",extra:[{id:"old",label:"Date la plus ancienne d'abord"}]}} options={MONTHS} selected={selMoisTests} onChange={setSelMoisTests}/>}<ResizeHandle colId="tests" nextColId={nextVisible("tests")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("finprod")&&<th aria-sort={ariaSort("finprod")} style={thBase}>Fin prod {setSelMoisFinProd&&<DropFilter label="" icon sort={{...sortOf("finprod"),asc:"Prochaine date d'abord (à venir)",desc:"Date la plus tardive d'abord",extra:[{id:"old",label:"Date la plus ancienne d'abord"}]}} options={MONTHS} selected={selMoisFinProd} onChange={setSelMoisFinProd}/>}<ResizeHandle colId="finprod" nextColId={nextVisible("finprod")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("depart")&&<th aria-sort={ariaSort("depart")} style={thBase}>Départ {setSelMoisDepart&&<DropFilter label="" icon sort={{...sortOf("depart"),asc:"Prochaine date d'abord (à venir)",desc:"Date la plus tardive d'abord",extra:[{id:"old",label:"Date la plus ancienne d'abord"},{id:"drift",label:"Plus en retard d'abord (dérive)"}]}} options={MONTHS} selected={selMoisDepart} onChange={setSelMoisDepart}/>}<ResizeHandle colId="depart" nextColId={nextVisible("depart")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("avancement")&&<th aria-sort={ariaSort("avancement")} style={thBase}>{tight?"Avanc.":"Avancement"} <span title="Cet avancement (%) reflète uniquement la production chez ENOGIA. Il ne prend pas en compte l'avancement chez les fournisseurs." style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:16,height:16,borderRadius:"50%",background:T.ink300,color:"#fff",fontSize:FZ.xs,fontWeight:700,fontStyle:"italic",cursor:"help",verticalAlign:"middle"}}>i</span>{" "}<button type="button" onClick={e=>{e.stopPropagation();const d=sort.col==="avancement"?sort.dir:null;setColSort("avancement")(d==null?"desc":d==="desc"?"asc":null);}} title="Trier par avancement (cliquer pour changer le sens)" aria-label="Trier par avancement"
          style={{padding:"2px 4px",borderRadius:8,border:"none",background:sort.col==="avancement"?T.teal100:"transparent",color:sort.col==="avancement"?T.teal600:T.ink300,fontSize:FZ.xs,fontWeight:800,cursor:"pointer",verticalAlign:"middle",lineHeight:1,fontFamily:T.font}}>{sort.col==="avancement"?(sort.dir==="desc"?"↓":"↑"):"↕"}</button><ResizeHandle colId="avancement" nextColId={nextVisible("avancement")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
        {show("commentaires")&&<th aria-sort={ariaSort("commentaires")} style={thBase} title="Commentaires">{tight?<NavIcon name="comments" size={13}/>:"Commentaires"}<ResizeHandle colId="commentaires" nextColId={nextVisible("commentaires")} colWidths={colWidths} setColWidths={setColWidths} order={allColOrder} userSized={userSized} markSized={()=>setUserSized(true)}/></th>}
      </tr></thead>
      <tbody>{rows.map((r,i)=>{
        const dl=r.depart?diffDays(today,new Date(r.depart)):null;
        const urgent=dl!=null&&dl>=0&&dl<=30;
        const done=r.etat==="SHIPPED";
        const pval=progress[r.pj];
        const meta=getPjMeta(r.pj,r);
        const isSel=sel===r.pj;
        // Même fond que la page (T.surface) par défaut, plutôt qu'une carte blanche — demandé
        // explicitement pour que la liste et la page ne fassent plus qu'un seul aplat.
        const rowBg=isSel?T.teal100:T.surface; // v162 : plus de zébrage ; liseré + teinte 7 % de la couleur d'état au survol
        const rk=(ETAT_META[r.etat]||ETAT_META["NOT ORDERED"]).bar, tintBg=mixHex(T.surface,rk,T.mode==="dark"?.12:.07);
        const [avTint,avTintBg]=personTint(meta.chefProjet);
        return(<tr key={i} onClick={()=>setSel(sel===r.pj?null:r.pj)} onContextMenu={e=>{e.preventDefault();setRowMenu({pj:r.pj,x:e.clientX,y:e.clientY});}} style={{height:rowH,borderLeft:"3px solid "+(isSel?T.teal500:"transparent"),cursor:"pointer",background:rowBg,transition:"background .12s ease, border-color .12s ease"}}
          onMouseEnter={e=>{if(!isSel){e.currentTarget.style.background=tintBg;e.currentTarget.style.borderLeftColor=rk;}}}
          onMouseLeave={e=>{if(!isSel){e.currentTarget.style.background=rowBg;e.currentTarget.style.borderLeftColor="transparent";}}}>
          <td style={{padding:D.cellY+"px "+PX+"px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",position:"sticky",left:0,zIndex:5,background:"inherit",boxShadow:scrolledX?"4px 0 6px -4px rgba(15,40,60,.22)":"none"}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
              <span style={{fontVariantNumeric:"tabular-nums",fontWeight:500,color:T.ink900,fontSize:FS}}>{r.pj}</span>
              {r.drift>0?<HoverPop width={250} render={()=><DriftPopBody r={r} df={df}/>}><DriftDot drift={r.drift}/></HoverPop>:null}
              <NewMark mark={marks.get(r.pj)}/>
              <button type="button" className="enogia-rowact" aria-label={"Actions pour "+r.pj} aria-haspopup="menu" aria-expanded={!!rowMenu&&rowMenu.pj===r.pj} title="Actions rapides (clic droit)"
                onClick={e=>{e.stopPropagation();const b=e.currentTarget.getBoundingClientRect();setRowMenu({pj:r.pj,x:b.left,y:b.bottom+4});}}
                style={{border:"none",background:"transparent",color:T.ink500,cursor:"pointer",padding:2,borderRadius:6,display:"inline-flex",lineHeight:0}}><NavIcon name="more" size={16}/></button>
            </span>
            {!hiddenCols.has("serie")&&meta.numSerie&&<div title={"N° de série : "+meta.numSerie} style={{fontVariantNumeric:"tabular-nums",fontSize:FZ.xs,color:T.ink500,lineHeight:1.25,marginTop:1,overflow:"hidden",textOverflow:"ellipsis"}}>{meta.numSerie}</div>}
          </td>
          {show("projet")&&<td style={{padding:D.cellY+"px "+PX+"px",color:T.ink900,fontSize:FS,fontWeight:600,letterSpacing:"-.005em",lineHeight:1.3,minWidth:tight?84:110}}><div title={meta.nomProjet} style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",overflowWrap:"break-word"}}>{meta.nomProjet}</div></td>}
          {show("pays")&&<td style={{padding:D.cellY+"px "+PX+"px",color:T.ink500,fontSize:FS,lineHeight:1.25}}><span title={meta.pays} style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{flexShrink:0,display:"inline-flex"}}><CountryFlag pays={meta.pays} size={14}/></span>{!tight&&<span>{meta.pays}</span>}</span></td>}
          {show("chef")&&<td style={{padding:D.cellY+"px "+PX+"px",whiteSpace:"nowrap",textAlign:"center"}}>
            <span title={meta.chefProjet} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:avTintBg,color:avTint,fontSize:FZ.xs,fontWeight:700,flexShrink:0}}>{initials(meta.chefProjet)}</span>
          </td>}
          {show("gamme")&&<td style={{padding:D.cellY+"px "+PX+"px",color:T.ink500,fontSize:FS,whiteSpace:"nowrap"}}><span style={{display:"inline-flex",alignItems:"center",gap:8}}><span style={{width:7,height:7,borderRadius:"50%",background:GAMME_COLORS[r.gamme]||T.ink300,flexShrink:0}}/>{r.gamme}</span></td>}
          {show("etat")&&<td style={{padding:D.cellY+"px "+PX+"px"}}>{pinOk&&setEtatFor?<HoverPop width={270} render={()=><EtatPopBody r={r} df={df}/>} style={{display:"inline-block"}}><span onClick={e=>e.stopPropagation()} style={{display:"inline-block",maxWidth:"100%"}}><EtatSelect compact value={r.etat} onChange={e=>setEtatFor(r.pj,e.target.value)}/></span></HoverPop>:<HoverPop width={270} render={()=><EtatPopBody r={r} df={df}/>}><Badge etat={r.etat} wrap={tight}/></HoverPop>}</td>}
          {show("arrivee")&&<td style={{padding:D.cellY+"px "+PX+"px",color:T.ink700,fontSize:FS,whiteSpace:"nowrap"}}>{fmtMode(r.arrivee?new Date(r.arrivee):null,df)}</td>}
          {show("tests")&&<td style={{padding:D.cellY+"px "+PX+"px",color:T.ink700,fontSize:FS,lineHeight:1.3}}>
            {/* Dates qui peuvent passer sur 2 lignes (début → / fin) quand la place manque, pastille de présence à droite : la hauteur de ligne reste fixe. */}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {tight
                ?<span style={{minWidth:0,display:"block"}}><div style={{whiteSpace:"nowrap"}}>{r.tests?fmtMode(new Date(r.tests),df):"—"}</div>{r.testsFin&&<div style={{whiteSpace:"nowrap"}}><span style={{color:T.ink300}}>→</span> {fmtMode(new Date(r.testsFin),df)}</div>}</span>
                :<span style={{minWidth:0,flexShrink:0,whiteSpace:"nowrap"}}><span style={{whiteSpace:"nowrap"}}>{r.tests?fmtMode(new Date(r.tests),df):"—"}</span>{r.testsFin&&<>{" "}<span style={{color:T.ink300}}>→</span>{" "}<span style={{whiteSpace:"nowrap"}}>{fmtMode(new Date(r.testsFin),df)}</span></>}</span>}
              {pinOk&&setClientPresenceFor
                ?<PresenceCell r={r} tight={tight} onChange={v=>setClientPresenceFor(r.pj,v)}/>
                :presenceKind(r.clientPresence)&&<span style={{flexShrink:0,display:"inline-flex"}}><PresenceChip kind={presenceKind(r.clientPresence)} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} compact tiny short={tight} fontSize={10.5}/></span>}
            </div>
          </td>}
          {show("finprod")&&<td style={{padding:D.cellY+"px "+PX+"px",color:T.ink700,fontSize:FS,whiteSpace:"nowrap"}}>{fmtMode(r.finProd?new Date(r.finProd):null,df)}</td>}
          {show("depart")&&<td style={{padding:D.cellY+"px "+PX+"px",fontWeight:600,color:done?T.emerald600:urgent?T.amber600:T.ink900,fontSize:FS,whiteSpace:"nowrap"}}>{r.drift!=null&&r.drift!==0?<HoverPop width={250} render={()=><DriftPopBody r={r} df={df}/>}><span>{fmtMode(r.depart?new Date(r.depart):null,df)}<span style={{marginLeft:6,fontSize:FZ.xs,fontWeight:700,color:r.drift>0?T.red500:T.emerald600}}>{r.drift>0?"+":""}{r.drift} j</span></span></HoverPop>:fmtMode(r.depart?new Date(r.depart):null,df)}</td>}
          {show("avancement")&&<td style={{padding:D.cellY+"px "+PX+"px",whiteSpace:"nowrap",overflow:"hidden"}}>
            {/* Même gabarit sur chaque ligne (piste + valeur à largeur fixe), avec ou sans valeur saisie :
                sinon les lignes sans avancement ("—") n'ont pas la même hauteur/alignement que les autres. */}
            <HoverPop width={240} render={()=><AvPopBody pval={pval} etat={r.etat}/>} style={{display:"flex"}}><div style={{display:"flex",alignItems:"center",gap:8,height:boxDev/dpr}}>
              <svg data-avbar="1" width={tight?30:44} height={barDev/dpr} viewBox={"0 0 "+(tight?30:44)+" "+(barDev/dpr)} style={{flex:"none",display:"block"}} aria-hidden="true">
                <rect x="0" y="0" width={tight?30:44} height={barDev/dpr} rx={barDev/dpr/2} fill={T.surfaceAlt}/>
                {pval!=null&&pval>0&&<rect x="0" y="0" width={Math.max(barDev/dpr,(tight?30:44)*Math.min(100,pval)/100)} height={barDev/dpr} rx={barDev/dpr/2} fill={pval>=100?T.emerald500:pval>=50?T.teal500:T.amber500}/>}
              </svg>
              <span style={{flex:"none",minWidth:34,textAlign:"right",fontVariantNumeric:"tabular-nums",lineHeight:"20px",fontSize:FS,fontWeight:600,color:pval!=null?T.ink500:T.ink300}}>{pval!=null?pval+"%":"—"}</span>
            </div></HoverPop>
          </td>}
          {show("commentaires")&&<td style={{padding:D.cellY+"px "+PX+"px",whiteSpace:"nowrap"}}>
            {(()=>{const n=(comments?.[r.pj]||[]).length;return n>0?
              <span style={{display:"inline-flex",alignItems:"center",gap:4,color:T.ink500,fontSize:FS,fontWeight:600}}><NavIcon name="comments" size={11}/>{n}</span>
              :<span style={{color:T.ink100,fontSize:FS}}>—</span>;})()}
          </td>}
        </tr>);
      })}</tbody>
    </table>
    </div>
  </div>
  {/* flex:"2 1 300px" + maxWidth: colonne nettement plus étroite que la liste, et qui peut
      rétrécir jusqu'à 300px avant de repasser à la ligne — demandé explicitement ("la réduire
      en taille aussi pour que cela soit responsive"). */}
  {popupMode?(sel&&<ProjectModal pj={sel} data={data} df={df} onClose={()=>setSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}
      pinOk={pinOk} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
      addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>)
  :phone&&!sel?null:panelCollapsed&&!phone?
    <div style={{flex:"0 0 36px",position:"sticky",top:16,alignSelf:"flex-start"}}>
      <button onClick={togglePanel} title="Afficher le volet de droite" style={{width:36,height:36,borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:FZ.md,fontWeight:700}}>‹</button>
    </div>
  :<div ref={panelRef} className="enogia-panel" style={{flex:"2 1 300px",maxWidth:340,minWidth:260,scrollMarginTop:12}}>
    <div className="enogia-hide-phone" style={{display:"flex",justifyContent:"flex-end",marginBottom:6}}>
      <button onClick={togglePanel} title="Réduire le volet" style={{height:26,padding:"0 8px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:T.ink500,cursor:"pointer",fontSize:FZ.xs,fontWeight:700}}>Réduire ›</button>
    </div>
    <ProjectModal inline pj={sel} data={data} df={df} onClose={()=>setSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}
      pinOk={pinOk} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
      addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>
  </div>}
  {rowMenu&&(()=>{const mr=data.find(x=>x.pj===rowMenu.pj);return <RowMenu pj={rowMenu.pj} x={rowMenu.x} y={rowMenu.y} etat={mr&&mr.etat} canSetEtat={!!(pinOk&&setEtatFor)}
    onOpen={()=>setSel(rowMenu.pj)} onComment={()=>{setSel(rowMenu.pj);focusComment();}} onSetEtat={id=>setEtatFor(rowMenu.pj,id)} onClose={closeRowMenu}/>;})()}
  </div>);
}
