import React, { useState, useMemo, useEffect, useRef } from "react";
import { isPhone } from "../useIsPhone";
import { EtatInfoButton } from "./ProdStagesUI";
import { T, FZF, stagePalette, stripeBg } from "../theme";
import { useMarks, NewMark } from "./ChangesNotice";
import { getPjMeta, presenceDates, PRESENCE_META, MONTHS_FULL, today, ETAT_META, ALL_ETATS, ProjectLabelCell } from "../pjMeta";
import { DropFilter, pressable } from "./SharedUI";
import { toLocalISO, weekStartOf } from "../parsers";
import { toggleClosedDay, isClosedDay } from "../workDays";
import { CalendarMonth } from "./CalendarMonth";

export function getWeekStatus(r,weekStart,weekEnd){
  const a=r.arrivee?new Date(r.arrivee):null;
  const t1=r.tests?new Date(r.tests):null;
  const t2=r.testsFin?new Date(r.testsFin):t1;
  const fp=r.finProd?new Date(r.finProd):null;
  const dp=r.depart?new Date(r.depart):null;
  if(!a&&!dp)return null;
  if(dp&&dp<weekStart)return null; // déjà parti, rien à afficher

  const within=d=>d&&d>=weekStart&&d<weekEnd;
  const overlaps=(s,e)=>s&&e&&s<weekEnd&&e>=weekStart;
  const milestones=[];
  if(within(a))milestones.push("Arrivée");
  if(within(t1)||within(t2)||overlaps(t1,t2))milestones.push("Tests");
  if(within(fp))milestones.push("Fin prod");
  if(within(dp))milestones.push("Départ");

  if(milestones.length>1)return milestones.join(" + ");
  if(milestones.length===1)return milestones[0];
  // "Production" uniquement entre l'arrivée et la fin de production (pas après)
  const p0=r.debutProd?new Date(r.debutProd):a; // v312 : avant le début de production, pas de « Production »
  if(p0&&p0<weekEnd&&(fp?fp>=weekStart:true)&&(dp?dp>=weekStart:true))return"Production";
  return null;
}
// v143 : couleurs d'étape dérivées du thème actif (theme.js › stagePalette) — mêmes teintes que le reste de la charte.
// Objet à accesseurs : relu à chaque rendu, donc suit le thème, le mode sombre et le mode présentation.
export const SEGMENT_STYLE=["Arrivée","Production","Tests","Fin prod","Départ"].reduce((o,k)=>{
  Object.defineProperty(o,k,{enumerable:true,get(){return stagePalette()[k];}});return o;
},{});

// v146.13 : plusieurs étapes dans la même case (ex. « Tests + Fin prod ») → la case est coupée en diagonale, une bande par étape (dans l'ordre),
// avec le texte en encre du thème (lisible sur toutes les teintes d'étape, vérifié par check:contrast).
export function stageFill(status){
  const P=stagePalette(),parts=String(status||"").split(" + ").filter(Boolean);
  const cols=parts.map(k=>(P[k]||P["Production"]).c);
  const st=P[parts[parts.length-1]]||P["Production"];
  if(cols.length<2)return{background:cols[0]||st.c,color:st.t,bold:st.bold};
  const n=cols.length;
  return{background:"linear-gradient(135deg,"+cols.map((c,i)=>c+" "+(i*100/n).toFixed(2)+"% "+((i+1)*100/n).toFixed(2)+"%").join(",")+")",color:T.ink900,bold:true};
}

// v172 : abréviations des étapes, pour les colonnes jour étroites (le mot entier reste affiché quand il tient).
export const STAGE_SHORT={"Arrivée":"Arr.","Production":"Prod","Tests":"Tests","Fin prod":"Fin","Départ":"Dép."};

export function getDayStatus(r,day,excludedDates){
  const dayEnd=new Date(day);dayEnd.setDate(dayEnd.getDate()+1);
  const status=getWeekStatus(r,day,dayEnd);
  if(!status)return null;
  const isWeekend=day.getDay()===0||day.getDay()===6;
  const isExcluded=excludedDates&&excludedDates.includes(toLocalISO(day));
  if(!isWeekend&&!isExcluded)return status;
  // Le week-end ou un jour exclu manuellement : pas de Production ni de Tests (le week-end seulement pour Tests), mais les jalons ponctuels restent affichés
  const milestones=status.split(" + ").filter(m=>{
    if(m==="Production")return false; // toujours exclu si week-end OU exclusion manuelle
    if(m==="Tests"&&isWeekend)return false;
    return true;
  });
  return milestones.length?milestones.join(" + "):null;
}
// v252 (maquette A « Semaines affinées » / « Mode Jours » du canevas Claude Design « Cockpit — Calendrier ») : la production devient une
// bande continue (bords arrondis seulement au début et à la fin de la suite, libellé « Production → date de fin » au début) ; les jalons
// (arrivée, tests, fin prod, départ) deviennent des pastilles ; la présence client / NOBO, deux ronds « C » / « N ».
const fdShort=v=>{const d=v?new Date(v):null;return d&&!isNaN(d)?String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0"):"";};
// v312 (maquette v312-calendrier-lignes, piste A1 « barre continue » validée) : une seule barre par machine, découpée en étapes collées
// (réception, production, tests, packaging), le nom et la date de fin écrits dedans ; « Arrivée jj/mm » avant la barre, « Départ jj/mm »
// après ; visite client / NOBO = étiquette au-dessus du jour ; jours sans production / atelier fermé hachurés. Le planning initial
// n'apparaît qu'avec le bouton « Planning initial » (trait pointillé + écart). La barre ne capte pas les clics : les cases dessous gardent
// leurs actions (fiche du PJ, options de production du jour).
const isoD=v=>{if(!v)return null;const d=new Date(v);return isNaN(d)?null:toLocalISO(d);};
const addIso=(iso,n)=>{const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return toLocalISO(d);};
function RowTrack({r,xOf,rowH,showIni,offDates,closedOf,totalW}){
  const S=SEGMENT_STYLE,arr=isoD(r.arrivee),p0=isoD(r.debutProd)||arr,tst=isoD(r.tests),fin=isoD(r.finProd),dep=isoD(r.depart),tEnd=isoD(r.testsFin)||tst;
  if(!arr&&!dep)return null;
  const segs=[];
  const push=(a,b,k,label)=>{if(a&&b&&b>=a)segs.push({a,b,k,label});};
  if(arr&&p0&&p0>arr)push(arr,addIso(p0,-1),"Arrivée","Réception");
  const pEnd=tst?addIso(tst,-1):fin||(dep?addIso(dep,-1):null);
  push(p0,pEnd,"Production","Production"+(pEnd?" · fin "+fdShort(pEnd):""));
  const tE=fin&&fin>=(tEnd||"")?fin:tEnd;
  if(tst)push(tst,tE,"Tests","Tests · fin "+fdShort(tE));
  if(tE&&dep&&addIso(tE,1)<=addIso(dep,-1))push(addIso(tE,1),addIso(dep,-1),"Fin prod","Packaging");
  const top=Math.round(rowH*0.38),h=Math.max(20,Math.round(rowH*0.4));
  const drift=Number(r.drift)||0,ini=showIni&&dep&&drift?addIso(dep,-drift):null;
  const vis=presenceDates(r.clientPresence);
  const box=(a,b)=>{const x0=xOf(a,false),x1=xOf(b,true);if(x1<=0||x0>=totalW)return null;return{l:Math.max(0,x0),w:Math.min(totalW,x1)-Math.max(0,x0),cutL:x0<0,cutR:x1>totalW};};
  const out=[];
  segs.forEach((s,i)=>{const bx=box(s.a,s.b);if(!bx)return;const st=S[s.k]||S["Production"];const first=i===0&&!bx.cutL,last=i===segs.length-1&&!bx.cutR;
    out.push(<div key={"s"+i} title={s.label+" ("+fdShort(s.a)+" → "+fdShort(s.b)+")"} style={{position:"absolute",left:bx.l,width:Math.max(2,bx.w),top,height:h,background:st.c,color:st.t,display:"flex",alignItems:"center",padding:"0 8px",boxSizing:"border-box",fontSize:FZF.xs,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
      borderRadius:(first?6:0)+"px "+(last?6:0)+"px "+(last?6:0)+"px "+(first?6:0)+"px",boxShadow:i>0&&!bx.cutL?"inset 2px 0 0 "+T.surface:"none"}}><span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{bx.cutL?"← ":""}{bx.w>46?s.label:""}</span></div>);});
  // jours sans production (ce PJ) et atelier fermé, sur la partie production de la barre
  (offDates||[]).forEach(d=>{if(!p0||!pEnd||d<p0||d>pEnd)return;const bx=box(d,d);if(!bx)return;out.push(<div key={"o"+d} title={"Pas de production le "+fdShort(d)} style={{position:"absolute",left:bx.l,width:bx.w,top,height:h,backgroundImage:"repeating-linear-gradient(135deg,rgba(255,255,255,.55) 0 3px,transparent 3px 7px)"}}/>);});
  (closedOf?closedOf(p0,pEnd):[]).forEach(d=>{const bx=box(d,d);if(!bx)return;out.push(<div key={"c"+d} title={"Atelier fermé le "+fdShort(d)} style={{position:"absolute",left:bx.l,width:bx.w,top,height:h,backgroundImage:"repeating-linear-gradient(135deg,rgba(255,255,255,.55) 0 3px,transparent 3px 7px)"}}/>);});
  const lab={position:"absolute",top,height:h,display:"flex",alignItems:"center",fontSize:FZF.xs,color:T.ink700,whiteSpace:"nowrap"};
  const start=segs[0]&&segs[0].a;
  if(start){const x=xOf(start,false);if(x>4&&x<totalW)out.push(<div key="la" style={{...lab,right:totalW-x+6}}>Arrivée&nbsp;<b style={{color:T.ink900}}>{fdShort(arr)}</b></div>);}
  if(dep){const lastB=segs.length?segs[segs.length-1].b:null,x=Math.max(xOf(addIso(dep,-1),true),lastB?xOf(lastB,true):-1);if(x>=0&&x<totalW-20)out.push(<div key="ld" style={{...lab,left:x+6}}>Départ&nbsp;<b style={{color:T.ink900}}>{fdShort(dep)}</b>{ini&&drift>0?<span style={{color:T.red600,fontWeight:700,marginLeft:4}}>+{drift} j</span>:null}</div>);}
  if(ini){const x=xOf(ini,false);if(x>=0&&x<totalW)out.push(<div key="ini" title={"Départ au planning initial : "+fdShort(ini)} style={{position:"absolute",left:x,top:2,bottom:2,borderLeft:"2px dashed "+T.ink500,opacity:.75}}/>,<div key="inil" style={{position:"absolute",left:x+3,bottom:1,fontSize:10.5,color:T.ink500,background:T.surface,padding:"0 3px",borderRadius:3,whiteSpace:"nowrap"}}>initial {fdShort(ini)}</div>);}
  let tagEnd=-1; // deux visites proches : la seconde étiquette se place après la première
  ["client","nobo"].map(k=>({k,d:isoD(vis[k])})).filter(v=>v.d).sort((p,q)=>p.d<q.d?-1:1).forEach(({k,d})=>{let x=xOf(d,false);if(x<0||x>=totalW)return;const m=PRESENCE_META[k];x=Math.max(x,tagEnd+4);tagEnd=x+2+(m.label.length+6)*6.6+14;
    out.push(<div key={"v"+k} title={m.label+" présent aux tests le "+fdShort(d)} style={{position:"absolute",left:x+2,top:Math.max(1,top-19),height:17,display:"flex",alignItems:"center",gap:4,padding:"0 6px",borderRadius:4,background:T.card,border:"1px solid "+T.line,boxShadow:"inset 3px 0 0 "+m.color,fontSize:11,fontWeight:700,color:m.ink||T.ink700,whiteSpace:"nowrap",zIndex:2}}>{m.label}<span style={{fontWeight:500,color:T.ink500}}>{fdShort(d)}</span></div>);});
  return out;
}
export function CalendarView({canEditDays,setClosurePeriods,setProductionExclusionDays,data,onSelectPj,mode,setMode,anchor,setAnchor,dayAnchor,setDayAnchor,closurePeriods,productionExclusions,zoomLevel:zoomRaw,setZoomLevel,selEtats,setSelEtats,allPJs,selPJs,setSelPJs}){
  const {marks}=useMarks();
  // v213 : un clic sur un jour (vue Jour, admins) ouvre ses options de production
  const [dayMenu,setDayMenu]=useState(null);
  // v310 : vue Mois (CalendarMonth) — mois affiché, 1er du mois
  const [monthD,setMonthD]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1);});
  const shiftMonth=n=>setMonthD(m=>new Date(m.getFullYear(),m.getMonth()+n,1));
  const [showIni,setShowIni]=useState(()=>{try{return localStorage.getItem("enogia_cal_ini")==="1";}catch(e){return false;}});
  const toggleIni=()=>setShowIni(v=>{try{localStorage.setItem("enogia_cal_ini",v?"0":"1");}catch(e){}return !v;});
  useEffect(()=>{if(!dayMenu)return undefined;const k=e=>{if(e.key==="Escape")setDayMenu(null);};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[dayMenu]);
  const isClosurePeriod=(colStart,colEnd)=>{
    if(!closurePeriods||!closurePeriods.length)return false;
    return closurePeriods.some(p=>{
      const ps=new Date(p.start),pe=new Date(p.end);pe.setHours(23,59,59,999);
      return colStart<pe&&colEnd>=ps;
    });
  };
  // Lignes agrandies (demandé explicitement : "agrandir la hauteur des lignes projets, ça
  // permettra d'écrire en diagonale") — donne la place verticale nécessaire au texte en diagonale
  // dans les cellules jour (voir plus bas). Encore un peu plus haut qu'avant (64→72) : les tuiles
  // sont de nouveau remplies et le mot complet doit toujours tenir, sans jamais être coupé.
  const rowH=58;
  // Bande "numéro de semaine" groupée (mode Jour uniquement, cf. plus bas) — décale d'autant les
  // lignes d'en-tête sticky qui suivent (Machine / en-tête semaine ou jour).
  const MONTH_H=26;
  const WEEK_BAND_H=18;
  const headerTop=MONTH_H+(mode==="day"?WEEK_BAND_H:0);
  // zoomLevel est désormais géré au niveau de App (props) pour persister quand on quitte/revient sur cet onglet
  // v170 : niveau 0 = 5 semaines (S-1, S, S+1…S+3) ; niveau 3 du mode Jour = 29 jours (J-7 → J+21). Voir HOME_ZOOM.
  const WEEK_COUNTS=[5,8,14,24,36];
  // Niveau "6" ajouté devant (demandé explicitement : "il faut dézoomer pour avoir une vision plus
  // claire") — colonnes jour nettement plus larges pour une vue moins chargée ; décale aussi le
  // niveau par défaut (App.js) vers des colonnes plus larges sans changer son code.
  const DAY_COUNTS=[9,14,21,29,35,52,84,168,252];
  const HOME_ZOOM=mode==="week"?0:3;
  const maxZoomLevel=mode==="week"?WEEK_COUNTS.length-1:DAY_COUNTS.length-1;
  // Zoom invalide (NaN, négatif) → niveau par défaut, sinon nWeeks/nDays indéfinis font planter l'en-tête.
  const zoomLevel=Number.isFinite(zoomRaw)&&zoomRaw>=0?Math.round(zoomRaw):2;
  const nWeeks=WEEK_COUNTS[Math.min(zoomLevel,WEEK_COUNTS.length-1)];
  const nDays=DAY_COUNTS[Math.min(zoomLevel,DAY_COUNTS.length-1)];
  // Le défilement horizontal ne marchait pas (demandé explicitement : "je n'arrive pas à voir les
  // prochaines semaines à droite") : seules nDays/nWeeks colonnes étaient générées, en largeur
  // flexible (1fr) — elles remplissaient donc toujours exactement l'écran, sans rien à faire défiler.
  // Désormais le niveau de zoom fixe le nombre de colonnes VISIBLES à l'écran (donc leur largeur en
  // px), et on génère une plage bien plus longue à défiler vers la droite.
  const TOTAL_WEEKS=60, TOTAL_DAYS=300;
  const [viewW,setViewW]=useState(1100);
  const [viewMeasured,setViewMeasured]=useState(false);
  const zoomIn=()=>setZoomLevel(Math.max(0,Math.min(maxZoomLevel,zoomLevel)-1));
  const zoomOut=()=>setZoomLevel(Math.min(maxZoomLevel,zoomLevel+1));

  const weeks=useMemo(()=>{
    const out=[];
    for(let i=0;i<TOTAL_WEEKS;i++){const s=new Date(anchor);s.setDate(s.getDate()+i*7);out.push(s);}
    return out;
  },[anchor,TOTAL_WEEKS]);
  const days=useMemo(()=>{
    const out=[];
    for(let i=0;i<TOTAL_DAYS;i++){const d=new Date(dayAnchor);d.setDate(d.getDate()+i);out.push(d);}
    return out;
  },[dayAnchor,TOTAL_DAYS]);

  const cols=mode==="week"?weeks:days;
  // v168 : 1re ligne de chaque PJ indexée une fois (remplace les data.find répétés, coûteux avec beaucoup de machines).
  const rowOf=useMemo(()=>{const m=new Map();data.forEach(r=>{if(!m.has(r.pj))m.set(r.pj,r);});return m;},[data]);
  const pjs=useMemo(()=>[...rowOf.keys()].sort((a,b)=>{
    const ra=rowOf.get(a),rb=rowOf.get(b);
    const da=ra&&ra.arrivee?new Date(ra.arrivee):new Date(9999,0,1);
    const db=rb&&rb.arrivee?new Date(rb.arrivee):new Date(9999,0,1);
    return da-db;
  }),[rowOf]);
  // Largeurs calées sur les MOTS LES PLUS LONGS (demandé : « les colonnes se mettent parfaitement avec
  // les mots les plus grands dans la ligne ») : on mesure le texte réel au canvas. Colonne « Machine » =
  // plus long « PJ + gamme » / nom de projet ; colonnes de dates = plus long mot d'étape (« Production »…).
  const measure=useMemo(()=>{
    let ctx=null;try{ctx=document.createElement("canvas").getContext("2d");}catch(e){}
    return (txt,font)=>{if(!ctx)return txt.length*7;ctx.font=font;return ctx.measureText(txt).width;};
  },[]);
  const LEFT_W=useMemo(()=>{
    let w=0;
    pjs.forEach(pj=>{
      const r=rowOf.get(pj);const m=getPjMeta(pj,r);
      const l1=8+7+measure(pj,"700 "+FZF.sm+"px "+T.fontMono)+7+measure(r?.gamme||"","700 "+FZF.xs+"px "+T.font)+12+(marks.get(pj)?60:0);
      const l2=15+17+measure(m.nomProjet||"","500 "+FZF.xs+"px "+T.font);
      w=Math.max(w,l1,l2);
    });
    if(isPhone())return 112; // téléphone : la colonne ne garde que PJ + pastille
    return Math.min(380,Math.max(200,Math.ceil(w+14*2+6)));
  },[pjs,rowOf,measure,marks]);
  const longestWordPx=useMemo(()=>{
    const f=mode==="week"?"700 "+FZF.sm+"px "+T.font:"700 "+FZF.xs+"px "+T.font;
    let w=0;Object.keys(SEGMENT_STYLE).forEach(k=>k.split(" ").forEach(word=>{w=Math.max(w,measure(word,f));}));
    return w;
  },[mode,measure]);
  const weekNum=d=>{const j=new Date(d.getFullYear(),0,1);return Math.ceil(((d-j)/86400000+j.getDay()+1)/7);};
  const todayWeekIdx=weeks.findIndex(w=>{const e=new Date(w);e.setDate(e.getDate()+7);return today>=w&&today<e;});
  const todayDayIdx=days.findIndex(d=>d.toDateString()===today.toDateString());
  const DAY_NAMES=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

  const scrollRef=React.useRef(null);
  // v167 : seules les cases visibles (+ une marge) sont dessinées. v168 : lignes aussi, et la position
  // de défilement est arrondie par paliers (SCROLL_Q) — la grille ne se redessine qu'en changeant de
  // palier, pas à chaque image ; la marge (VIEW_BUF) couvre largement un palier.
  const SCROLL_Q=240, VIEW_BUF=720;
  const [scrollPos,setScrollPos]=useState({x:0,y:0});
  const scrollX=scrollPos.x;
  const [viewH,setViewH]=useState(800);
  const rafRef=useRef(0);
  const onGridScroll=()=>{
    if(rafRef.current)return;
    rafRef.current=requestAnimationFrame(()=>{
      rafRef.current=0;const el=scrollRef.current;if(!el)return;
      const x=Math.floor(el.scrollLeft/SCROLL_Q)*SCROLL_Q,y=Math.floor(el.scrollTop/SCROLL_Q)*SCROLL_Q;
      setScrollPos(p=>p.x===x&&p.y===y?p:{x,y});
    });
  };
  useEffect(()=>()=>cancelAnimationFrame(rafRef.current),[]);
  useEffect(()=>{
    const el=scrollRef.current;
    if(!el)return;
    const measure=()=>{setViewW(el.clientWidth||1100);setViewH(el.clientHeight||800);setViewMeasured(true);};
    measure();
    if(typeof ResizeObserver==="undefined"){window.addEventListener("resize",measure);return ()=>window.removeEventListener("resize",measure);}
    const ro=new ResizeObserver(measure);
    ro.observe(el);
    return ()=>ro.disconnect();
  },[]);
  const visCount=mode==="week"?nWeeks:nDays;
  // Les colonnes doivent occuper TOUTE la largeur de la page (demandé explicitement : « les tuiles
  // prennent la totalité de la largeur ») : on répartit la largeur disponible exactement sur les
  // visCount colonnes visibles — jour ouvré = 1 part, week-end = 0,6 part — au lieu d'arrondir à
  // l'entier inférieur, ce qui laissait un vide à droite. Le minimum garde les mots lisibles.
  const WE_RATIO=0.6;
  // Cause du « ça ne prend toujours pas toute la page » : un plancher de largeur (92/110 px) forçait
  // les colonnes à dépasser dès que le zoom demandait trop de colonnes pour l'écran → la dernière
  // était coupée et la grille ne tombait jamais juste. Désormais on compte les poids EXACTS des
  // colonnes visibles (jours ouvrés 1, week-end 0,6) et, si l'écran est trop étroit pour le zoom
  // demandé, on affiche quelques colonnes de moins plutôt que de déborder.
  const WORD_COL=Math.ceil(longestWordPx+3*2+3*2+6); // inset de tuile + marge intérieure + filet
  // v172 : abréviations lisibles quand la colonne est trop étroite pour le mot entier (vue Jour sur 29 jours).
  const shortPx=useMemo(()=>{const f="700 "+FZF.xs+"px "+T.font;return Math.max(...Object.values(STAGE_SHORT).map(w=>measure(w,f)));},[measure]);
  const SHORT_COL=Math.ceil(shortPx+3*2+2*2+4);
  // v170 : en vue Jour, les colonnes peuvent descendre sous la largeur d'un mot (29 jours à l'écran) ;
  // la case ne garde alors que la couleur de l'étape, le détail reste dans l'infobulle.
  const MIN_COL=mode==="week"?WORD_COL:SHORT_COL;
  const avail=Math.max(200,viewW-LEFT_W);
  const weightOf=n=>mode==="week"?n:days.slice(0,n).reduce((a,d)=>a+((d.getDay()===0||d.getDay()===6)?WE_RATIO:1),0);
  let effCount=visCount;
  while(effCount>1&&avail/weightOf(effCount)<MIN_COL)effCount--;
  // v170 (demandé : « le jour J à gauche en gardant la semaine passée, à droite les 3 prochaines semaines ») :
  // la plage commence 7 jours (ou 1 semaine) avant aujourd'hui et le zoom revient à J-7 → J+21. Appliqué à
  // l'ouverture (une fois la largeur mesurée), au changement Semaine/Jour et sur « Aujourd'hui ».
  const centerOnToday=()=>{
    setZoomLevel(HOME_ZOOM);
    if(mode==="week"){const w=weekStartOf(today);w.setDate(w.getDate()-7);setAnchor(w);}
    else{const d=new Date(today);d.setHours(0,0,0,0);d.setDate(d.getDate()-7);setDayAnchor(d);}
    if(scrollRef.current)scrollRef.current.scrollLeft=0;
    setScrollPos(p=>p.x===0?p:{x:0,y:p.y});
  };
  const goToday=()=>{if(mode==="month"){const d=new Date();setMonthD(new Date(d.getFullYear(),d.getMonth(),1));return;}centerOnToday();};
  const goTodayRef=useRef(goToday);goTodayRef.current=goToday;
  useEffect(()=>{const h=()=>goTodayRef.current();window.addEventListener("enogia:today",h);return()=>window.removeEventListener("enogia:today",h);},[]);
  useEffect(()=>{if(viewMeasured)centerOnToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[viewMeasured,mode]);
  const unit=Math.floor((avail/weightOf(effCount))*100)/100;
  const colPx=unit;
  const wePx=Math.floor(unit*WE_RATIO*100)/100;
  // Plage de colonnes à dessiner [lo, hi] d'après le défilement horizontal.
  const colW=cols.map(c=>mode==="week"?colPx:((c.getDay()===0||c.getDay()===6)?wePx:colPx));
  const colX=[];colW.reduce((acc,w)=>{colX.push(acc);return acc+w;},0);
  const totalW=colX.length?colX[colX.length-1]+colW[colW.length-1]:0;
  const base0=cols.length?toLocalISO(cols[0]):null;
  const dayN=iso=>Math.round((new Date(iso+"T12:00:00")-new Date(base0+"T12:00:00"))/864e5);
  // x d'une date (début du jour, ou fin du jour si end) ; hors plage = au-delà des bords
  const xOf=(iso,end)=>{if(!base0)return 0;const n=dayN(iso)+(end?1:0);
    if(mode==="week"){const wi=Math.floor(n/7),f=(n-wi*7)/7;if(wi<0)return -1;if(wi>=cols.length)return totalW+1;return colX[wi]+f*colW[wi];}
    if(n<0)return -1;if(n>cols.length)return totalW+1;if(n===cols.length)return totalW;return colX[n];};
  const closedDays=(a,b)=>{if(!a||!b||!closurePeriods||!closurePeriods.length)return [];const o=[];for(let d=a;d<=b&&o.length<400;d=addIso(d,1))if(isClosedDay(closurePeriods,d))o.push(d);return o;};
  let lo=0;while(lo<cols.length-1&&colX[lo]+colW[lo]<scrollX-VIEW_BUF)lo++;
  let hi=lo;while(hi<cols.length-1&&colX[hi]<scrollX+viewW-LEFT_W+VIEW_BUF)hi++;
  // Lignes de la grille : 1 = mois, (2 = n° de semaine en mode Jour), puis en-tête, puis une ligne par machine.
  // Hauteur des lignes machine figée dans gridTemplateRows (case de rowH px + filet de 1 px), pour que les
  // lignes non dessinées gardent leur place et que la barre de défilement reste juste.
  const HEAD_ROW=mode==="day"?3:2;
  const ROW_PX=rowH+1;
  const r0=Math.max(0,Math.floor((scrollPos.y-VIEW_BUF)/ROW_PX));
  const r1=Math.min(pjs.length-1,Math.ceil((scrollPos.y+viewH+VIEW_BUF)/ROW_PX));
  // Page précédente / suivante : défile d'environ une largeur d'écran.
  const pageScroll=dir=>{if(scrollRef.current)scrollRef.current.scrollBy({left:dir*Math.round((viewW-LEFT_W)*0.85),behavior:"smooth"});};

  return(<div className="enogia-view-in" style={{background:stripeBg(T.teal500,T.surface,4),borderRadius:12,overflow:"hidden",border:"1px solid "+T.line,fontFamily:T.font}}>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderBottom:"1px solid "+T.line,background:T.surface,flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:4,background:T.surfaceAlt,borderRadius:8,padding:3}}>
        <button onClick={()=>setMode("week")} style={{padding:"6px 14px",borderRadius:8,border:"none",background:mode==="week"?(T.mode==="dark"?T.teal600:T.teal500):"transparent",color:mode==="week"?(T.mode==="dark"?"#0B1130":"#FFFFFF"):T.ink500,transition:"background-color .15s ease, color .15s ease",fontWeight:700,fontSize:FZF.md,cursor:"pointer",boxShadow:mode==="week"?T.shadowSm:"none"}}>Semaine</button>
        <button onClick={()=>setMode("day")} style={{padding:"6px 14px",borderRadius:8,border:"none",background:mode==="day"?(T.mode==="dark"?T.teal600:T.teal500):"transparent",color:mode==="day"?(T.mode==="dark"?"#0B1130":"#FFFFFF"):T.ink500,transition:"background-color .15s ease, color .15s ease",fontWeight:700,fontSize:FZF.md,cursor:"pointer",boxShadow:mode==="day"?T.shadowSm:"none"}}>Jour</button>
        <button onClick={()=>setMode("month")} style={{padding:"6px 14px",borderRadius:8,border:"none",background:mode==="month"?(T.mode==="dark"?T.teal600:T.teal500):"transparent",color:mode==="month"?(T.mode==="dark"?"#0B1130":"#FFFFFF"):T.ink500,transition:"background-color .15s ease, color .15s ease",fontWeight:700,fontSize:FZF.md,cursor:"pointer",boxShadow:mode==="month"?T.shadowSm:"none"}}>Mois</button>
      </div>
      <span style={{fontFamily:T.fontDisplay,fontWeight:300,fontSize:22,letterSpacing:"-.02em",color:T.ink900,minWidth:220,textAlign:"center",fontVariantNumeric:"tabular-nums"}}>
        {mode==="month"?MONTHS_FULL[monthD.getMonth()]+" "+monthD.getFullYear():mode==="week"
          ?"Sem. "+weekNum(weeks[0])+" → "+weekNum(weeks[Math.min(effCount,weeks.length)-1])+", "+weeks[0].getFullYear()
          :days[0].toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" → "+days[Math.min(effCount,days.length)-1].toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}
      </span>
      <div style={{display:"flex",gap:4}}>
        <button onClick={()=>mode==="month"?shiftMonth(-1):pageScroll(-1)} title={mode==="month"?"Mois précédent":"Période précédente"} style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:T.ink700,fontSize:FZF.md,fontWeight:700,cursor:"pointer"}}>‹</button>
        <button onClick={()=>mode==="month"?shiftMonth(1):pageScroll(1)} title={mode==="month"?"Mois suivant":"Période suivante"} style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:T.ink700,fontSize:FZF.md,fontWeight:700,cursor:"pointer"}}>›</button>
      </div>
      {/* Même filtre État + PJ que le Gantt, au même format et au même emplacement (demandé
          explicitement : "je veux le même format au même emplacement quelque chose de simple et
          discret") — partage le même état que la liste/le Gantt, donc filtrer ici filtre aussi les
          autres vues et inversement. */}
      <div style={{display:"flex",gap:8,marginLeft:"auto",alignItems:"center",flexWrap:"wrap"}}>
        {setSelEtats&&<DropFilter label="État" options={ALL_ETATS} selected={selEtats} onChange={setSelEtats} getLabel={o=>ETAT_META[o]?.label||o}/>}
        {setSelEtats&&<EtatInfoButton/>}
        {allPJs&&<DropFilter label="PJ" options={allPJs} selected={selPJs||new Set(allPJs)} onChange={setSelPJs}/>}
        {mode!=="month"&&<button type="button" onClick={toggleIni} aria-pressed={showIni} title="Afficher le départ prévu au planning initial et l'écart" style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+(showIni?T.teal500:T.line),background:showIni?T.teal100:"transparent",color:showIni?T.teal600:T.ink700,fontSize:FZF.sm,fontWeight:600,cursor:"pointer"}}>Planning initial</button>}
        {mode!=="month"&&<div style={{display:"flex",gap:4}}>
          <button onClick={zoomOut} disabled={zoomLevel>=maxZoomLevel} style={{padding:"5px 9px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:zoomLevel>=maxZoomLevel?T.ink300:T.ink700,fontSize:FZF.md,fontWeight:700,cursor:zoomLevel>=maxZoomLevel?"default":"pointer"}}>−</button>
          <button onClick={zoomIn} disabled={zoomLevel<=0} style={{padding:"5px 9px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:zoomLevel<=0?T.ink300:T.ink700,fontSize:FZF.md,fontWeight:700,cursor:zoomLevel<=0?"default":"pointer"}}>+</button>
        </div>}
        <button onClick={goToday} className="enogia-btn-ind" style={{padding:"5px 11px",borderRadius:8,border:"1.5px solid "+T.teal500,background:"transparent",color:T.teal600,fontSize:FZF.sm,fontWeight:700,cursor:"pointer"}}>Aujourd'hui</button>
      </div>
    </div>

    {mode==="month"?<CalendarMonth data={data} month={monthD} closurePeriods={closurePeriods} productionExclusions={productionExclusions} onSelectPj={onSelectPj}/>:<div ref={scrollRef} onScroll={onGridScroll}
      style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100dvh - 260px)"}}>
      <div style={{display:"grid",width:"max-content",minWidth:"100%",gridTemplateRows:MONTH_H+"px "+(mode==="day"?WEEK_BAND_H+"px ":"")+"auto"+(pjs.length?" repeat("+pjs.length+","+ROW_PX+"px)":""),gridTemplateColumns:LEFT_W+"px "+(mode==="week"
        ?"repeat("+cols.length+","+colPx+"px)"
        :cols.map(d=>(d.getDay()===0||d.getDay()===6)?wePx+"px":colPx+"px").join(" ")
      )}}>
        <div className="enogia-lblcell" style={{padding:"4px 14px",fontSize:FZF.sm,fontWeight:700,color:T.ink300,background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,position:"sticky",left:0,top:0,zIndex:12,height:MONTH_H,width:LEFT_W,minWidth:LEFT_W,maxWidth:LEFT_W,boxSizing:"border-box",gridColumn:1,gridRow:1}}/>
        {(()=>{
          // Regroupe les colonnes consécutives par mois pour afficher une bande "Mois Année" au-dessus
          const groups=[];
          cols.forEach((c,i)=>{
            const m=c.getMonth(),y=c.getFullYear();
            const last=groups[groups.length-1];
            if(last&&last.m===m&&last.y===y)last.span++;
            else groups.push({m,y,span:1,start:i});
          });
          return groups.map((g,gi)=>(
            <div key={gi} style={{gridColumn:(g.start+2)+" / span "+g.span,gridRow:1,padding:"2px 4px",textAlign:"center",fontSize:FZF.sm,fontWeight:700,color:g.m===today.getMonth()&&g.y===today.getFullYear()?T.teal600:T.ink500,background:g.m===today.getMonth()&&g.y===today.getFullYear()?T.teal100:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,position:"sticky",top:0,zIndex:10,height:MONTH_H,boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center"}}>{MONTHS_FULL[g.m]} {g.y}</div>
          ));
        })()}

        {/* Bande "numéro de semaine" séparée, une seule fois par semaine (mode Jour uniquement) —
            demandé explicitement : "séparer le numéro de semaine et le numéro du jour (regroupé le
            numéro de semaine en 1 fois)" plutôt que de le répéter dans chaque cellule de jour. */}
        {mode==="day"&&<div style={{background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,position:"sticky",left:0,top:MONTH_H,zIndex:12,height:WEEK_BAND_H,width:LEFT_W,minWidth:LEFT_W,maxWidth:LEFT_W,boxSizing:"border-box",gridColumn:1,gridRow:2}}/>}
        {mode==="day"&&(()=>{
          const wgroups=[];
          days.forEach((d,i)=>{
            const wn=weekNum(d),wy=d.getFullYear();
            const last=wgroups[wgroups.length-1];
            if(last&&last.wn===wn&&last.wy===wy)last.span++;
            else wgroups.push({wn,wy,span:1,start:i});
          });
          return wgroups.map((g,gi)=>(
            <div key={gi} style={{gridColumn:(g.start+2)+" / span "+g.span,gridRow:2,padding:"1px 4px",textAlign:"center",fontSize:FZF.xs,fontWeight:700,color:T.ink500,background:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,position:"sticky",top:MONTH_H,zIndex:9,height:WEEK_BAND_H,boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center"}}>S{g.wn}</div>
          ));
        })()}

        <div className="enogia-lblcell" style={{padding:"6px 14px",fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk,background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,position:"sticky",left:0,top:headerTop,zIndex:12,width:LEFT_W,minWidth:LEFT_W,maxWidth:LEFT_W,boxSizing:"border-box",gridColumn:1,gridRow:HEAD_ROW}}>Machine</div>
        {mode==="week"?weeks.map((w,wi)=>{
          const we=new Date(w);we.setDate(we.getDate()+7);
          const closed=isClosurePeriod(w,we);
          return(<div key={wi} style={{padding:"6px 4px",textAlign:"center",fontSize:FZF.sm,fontWeight:700,color:wi===todayWeekIdx?T.red600:closed?T.ink300:T.ink500,background:wi===todayWeekIdx?T.red100:closed?T.ink100:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:wi===todayWeekIdx?"inset 0 -3px 0 "+T.red500:"none",position:"sticky",top:headerTop,zIndex:10,gridColumn:wi+2,gridRow:HEAD_ROW}}>S{weekNum(w)}</div>);
        }):days.map((d,di)=>{
          const isWE=d.getDay()===0||d.getDay()===6;
          const dEnd=new Date(d);dEnd.setDate(dEnd.getDate()+1);
          const closed=isClosurePeriod(d,dEnd);
          return(<div key={di} {...(canEditDays&&!isWE?{role:"button",tabIndex:0,"aria-label":"Options de production du "+d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}),title:"Options de production de ce jour",onClick:e=>{const r=e.currentTarget.getBoundingClientRect();setDayMenu({iso:toLocalISO(d),x:r.left,y:r.bottom});},onKeyDown:e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();const r=e.currentTarget.getBoundingClientRect();setDayMenu({iso:toLocalISO(d),x:r.left,y:r.bottom});}}}:{})} style={{cursor:canEditDays&&!isWE?"pointer":undefined,padding:"3px 1px",textAlign:"center",background:di===todayDayIdx?T.red100:closed?T.ink100:isWE?T.ink100:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:di===todayDayIdx?"inset 0 -3px 0 "+T.red500:"none",position:"sticky",top:headerTop,zIndex:10,gridColumn:di+2,gridRow:HEAD_ROW}}>
            {/* Numéro de semaine retiré d'ici (demandé explicitement) : il vit désormais uniquement
                dans la bande groupée au-dessus. */}
            <div style={{fontSize:FZF.xs,fontWeight:600,lineHeight:1.2,color:di===todayDayIdx?T.red600:closed?T.ink300:T.ink300}}>{DAY_NAMES[d.getDay()]}</div>
            <div style={{fontSize:FZF.sm,fontWeight:700,lineHeight:1.25,color:di===todayDayIdx?T.red600:closed?T.ink300:T.ink700}}>{d.getDate()}</div>
          </div>);
        })}

        {pjs.slice(r0,r1+1).map((pj,k)=>{
          const pjIdx=r0+k;
          const r=rowOf.get(pj);
          const meta=getPjMeta(pj,r);
          const rowBg=T.surface;
          const row=HEAD_ROW+1+pjIdx;
          return(<React.Fragment key={pj}>
            {/* Même bloc "Projet" que le Gantt (demandé explicitement : "même type de projet entre le
                gantt et le calendrier, ça doit être un copier-coller") — composant partagé, voir
                pjMeta.js. */}
            <div className="enogia-lblcell" {...pressable(()=>onSelectPj&&onSelectPj(pj),{"aria-label":"Ouvrir la fiche "+pj})} style={{padding:"6px 14px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2,height:rowH,width:LEFT_W,minWidth:LEFT_W,maxWidth:LEFT_W,boxSizing:"border-box",borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,background:rowBg,position:"sticky",left:0,cursor:"pointer",overflow:"hidden",zIndex:5,gridColumn:1,gridRow:row}}>
              <ProjectLabelCell pj={pj} r={r} meta={meta} mark={marks.get(pj)?<NewMark mark={marks.get(pj)}/>:null}/>
            </div>
            {mode==="week"?weeks.slice(lo,hi+1).map((w,k)=>{
              const wi=lo+k,pos={gridColumn:wi+2,gridRow:row};
              const we=new Date(w);we.setDate(we.getDate()+7);
              const status=getWeekStatus(r,w,we);
              const isTodayCol=wi===todayWeekIdx;
              const closed=isClosurePeriod(w,we);
              const cellBg=closed?T.ink100:isTodayCol?T.red500+"12":rowBg;
              const todayEdge=isTodayCol?"inset 2px 0 0 "+T.red500+", inset -2px 0 0 "+T.red500:"none";
              if(!status)return<div key={wi} style={{...pos,height:rowH,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,background:cellBg,boxShadow:todayEdge}}/>;
              return(<div key={wi} className="e-hov" onClick={()=>onSelectPj&&onSelectPj(pj)} style={{"--e-hov-bg":T.teal100+"50",...pos,height:rowH,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:todayEdge,padding:3,cursor:"pointer",position:"relative",background:cellBg,transition:"background .12s ease"}}>
              </div>);
            }):days.slice(lo,hi+1).map((d,k)=>{
              const di=lo+k,pos={gridColumn:di+2,gridRow:row};
              const isWE=d.getDay()===0||d.getDay()===6;
              const status=getDayStatus(r,d,productionExclusions?.[pj]);
              const isTodayCol=di===todayDayIdx;
              const dEnd=new Date(d);dEnd.setDate(dEnd.getDate()+1);
              const closed=isClosurePeriod(d,dEnd);
              const cellBg=closed?T.ink100:isTodayCol?T.red500+"14":isWE?T.ink100:rowBg;
              const todayEdge=isTodayCol?"inset 2px 0 0 "+T.red500+", inset -2px 0 0 "+T.red500:"none";
              // v218 (demandé : « cliquer sur la tuile de la ligne et non sur le jour en haut ») : admins, jour ouvré de la période de production
              const inProdRange=r.arrivee&&r.finProd&&toLocalISO(d)>=toLocalISO(new Date(r.arrivee))&&toLocalISO(d)<=toLocalISO(new Date(r.finProd));
              const cellMenu=canEditDays&&!isWE&&inProdRange&&!closed?(e=>{e.stopPropagation();onSelectPj&&onSelectPj(pj,toLocalISO(d));}):null; // v221 : fiche du PJ + bouton « production ce jour »
              if(!status)return(<div key={di} className="enogia-cal-daycell" onClick={cellMenu||undefined} title={cellMenu?pj+" : fiche et production de ce jour":undefined} style={{cursor:cellMenu?"pointer":undefined,...pos,height:rowH,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,background:cellBg,boxShadow:todayEdge,position:"relative"}}/>);
              // Texte en diagonale (demandé explicitement : "agrandir la hauteur des lignes ... ça
              // permettra d'écrire en diagonale") pour que le mot complet tienne dans la colonne jour,
              // étroite. Centré au milieu de la tuile (pivot au centre, plutôt qu'ancré au coin
              // bas-gauche) et contenu dans la tuile (overflow:"hidden" sur le conteneur) — demandé
              // explicitement : "les étapes sont pas au milieu des tiles et dépassent de celles-ci".
              return(<div key={di} className="enogia-cal-daycell e-hov" onClick={cellMenu||(()=>onSelectPj&&onSelectPj(pj))} style={{"--e-hov-bg":T.teal100+"50",...pos,height:rowH,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:todayEdge,cursor:"pointer",background:cellBg,position:"relative",transition:"background .12s ease"}}>
              </div>);
            })}
            <div aria-hidden="true" style={{gridColumn:"2 / span "+cols.length,gridRow:row,position:"relative",height:rowH,pointerEvents:"none",zIndex:3}}>
              <RowTrack r={r} xOf={xOf} rowH={rowH} showIni={showIni} totalW={totalW} offDates={mode==="day"?(productionExclusions?.[pj]||[]):[]} closedOf={mode==="day"?closedDays:null}/>
            </div>
          </React.Fragment>);
        })}
      </div>
    </div>}

    {mode!=="month"&&<div style={{padding:"11px 18px",borderTop:"1px solid "+T.line,display:"flex",gap:16,flexWrap:"wrap",background:T.surface,alignItems:"center"}}>
      <span style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk}}>Étapes</span>
      {[["Arrivée","Réception"],["Production","Production"],["Tests","Tests"],["Fin prod","Packaging"]].map(([k,label])=><span key={k} style={{display:"flex",alignItems:"center",gap:6,fontSize:FZF.md}}>
        <span style={{width:14,height:14,borderRadius:4,background:SEGMENT_STYLE[k].c}}/>
        <span style={{color:T.ink700,fontWeight:500}}>{label}</span>
      </span>)}
      <span style={{display:"flex",alignItems:"center",gap:8,paddingLeft:16,borderLeft:"1px solid "+T.line,fontSize:FZF.md,color:T.ink700}}>
        {["client","nobo"].map(k=><span key={k} style={{display:"inline-flex",alignItems:"center",height:17,padding:"0 6px",borderRadius:4,background:T.card,border:"1px solid "+T.line,boxShadow:"inset 3px 0 0 "+PRESENCE_META[k].color,fontSize:11,fontWeight:700,color:PRESENCE_META[k].ink||T.ink700}}>{PRESENCE_META[k].label}</span>)}visite aux tests
      </span>
      <span style={{display:"flex",alignItems:"center",gap:6,paddingLeft:16,borderLeft:"1px solid "+T.line,fontSize:FZF.md,color:T.ink700}}><span style={{width:14,height:14,borderRadius:4,background:SEGMENT_STYLE["Production"].c,backgroundImage:"repeating-linear-gradient(135deg,rgba(255,255,255,.55) 0 3px,transparent 3px 7px)"}}/>sans production / atelier fermé</span>
      <span style={{fontSize:FZF.md,color:T.ink500,marginLeft:"auto"}}>Une barre par machine · « Planning initial » = départ prévu à l'origine · Clic = fiche</span>
    </div>}


  {dayMenu&&<DayProdMenu onOpenPj={onSelectPj} menu={dayMenu} data={data} closurePeriods={closurePeriods} productionExclusions={productionExclusions} setClosurePeriods={setClosurePeriods} setProductionExclusionDays={setProductionExclusionDays} onClose={()=>setDayMenu(null)}/>}
  </div>);
}




// v213 : options d'un jour — fermer / rouvrir l'atelier, ou retirer la production de certains PJ ce jour-là. Le Gantt et la charge en tiennent compte.
function DayProdMenu({menu,data,closurePeriods,productionExclusions,setClosurePeriods,setProductionExclusionDays,onClose,onOpenPj}){
  const k=menu.iso,d=new Date(k+"T12:00:00"),closed=isClosedDay(closurePeriods,k);
  const inProd=(data||[]).filter(r=>r&&r.pj&&r.arrivee&&r.finProd&&toLocalISO(new Date(r.arrivee))<=k&&k<=toLocalISO(new Date(r.finProd)));
  const ex=pj=>((productionExclusions||{})[pj]||[]).includes(k);
  const nEx=inProd.filter(r=>ex(r.pj)).length;
  const setAll=on=>{const m={};inProd.forEach(r=>{m[r.pj]=[k];});setProductionExclusionDays&&setProductionExclusionDays(m,on);};
  const W=320,left=Math.max(8,Math.min(menu.x,window.innerWidth-W-8)),top=Math.min(menu.y+4,window.innerHeight-120);
  const btn={border:"1px solid "+T.line,background:T.card,color:T.ink900,borderRadius:8,padding:"7px 10px",fontSize:FZF.sm,fontWeight:700,cursor:"pointer",fontFamily:T.font,minHeight:34,textAlign:"left"};
  return(<><div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1300}}/>
    <div role="dialog" aria-label={"Production du "+d.toLocaleDateString("fr-FR")} style={{position:"fixed",left,top,width:W,maxHeight:"min(70vh,520px)",overflow:"auto",zIndex:1301,background:T.card,color:T.ink900,border:"1px solid "+T.line,borderRadius:12,boxShadow:T.shadowFloat||T.shadowLg,padding:12,fontFamily:T.font}}>
      <div style={{fontWeight:700,fontSize:FZF.md,marginBottom:2}}>{d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</div>
      <div style={{fontSize:FZF.xs,color:T.ink500,marginBottom:10}}>{closed?"Atelier fermé ce jour.":"Jour travaillé."} Le Gantt et la charge en tiennent compte.</div>
      {menu.pj&&!closed&&<div style={{border:"1px solid "+T.line,borderRadius:8,padding:10,marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><b style={{fontFamily:T.fontMono||"monospace",fontSize:13}}>{menu.pj}</b><span style={{fontSize:12,color:ex(menu.pj)?T.red600:T.emerald600,fontWeight:700}}>{ex(menu.pj)?"pas de production ce jour":"en production ce jour"}</span></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button type="button" style={{...btn,color:ex(menu.pj)?T.emerald600:T.red600}} onClick={()=>{setProductionExclusionDays&&setProductionExclusionDays({[menu.pj]:[k]},!ex(menu.pj));onClose();}}>{ex(menu.pj)?"Rétablir la production ce jour":"Pas de production ce jour"}</button>
          {onOpenPj&&<button type="button" style={btn} onClick={()=>{onClose();onOpenPj(menu.pj);}}>Ouvrir la fiche</button>}
        </div>
      </div>}
      <button type="button" style={{...btn,width:"100%",color:closed?T.emerald600:T.red600}} onClick={()=>{setClosurePeriods&&setClosurePeriods(toggleClosedDay(closurePeriods,k));onClose();}}>{closed?"Rouvrir ce jour pour tout l'atelier":"Jour non travaillé pour tout l'atelier"}</button>
      {!closed&&inProd.length>0&&<div style={{marginTop:12}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}><b style={{fontSize:FZF.sm}}>Production ce jour</b><span style={{fontSize:FZF.xs,color:T.ink500}}>{inProd.length} PJ · {nEx} sans production</span></div>
        <div style={{display:"flex",gap:6,marginBottom:6}}><button type="button" style={btn} onClick={()=>setAll(true)}>Aucune production</button><button type="button" style={btn} onClick={()=>setAll(false)}>Tout rétablir</button></div>
        {inProd.map(r=><label key={r.pj} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 2px",fontSize:FZF.sm,cursor:"pointer",minHeight:30}}>
          <input type="checkbox" checked={!ex(r.pj)} onChange={e=>setProductionExclusionDays&&setProductionExclusionDays({[r.pj]:[k]},!e.target.checked)}/>
          <b style={{fontFamily:T.fontMono||"monospace",fontSize:12}}>{r.pj}</b><span style={{color:T.ink500,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getPjMeta(r.pj,r).nomProjet||""}</span>
          <span style={{marginLeft:"auto",fontSize:11,color:ex(r.pj)?T.red600:T.emerald600,fontWeight:700}}>{ex(r.pj)?"pas de prod.":"en prod."}</span></label>)}
      </div>}
      {!closed&&inProd.length===0&&<div style={{marginTop:10,fontSize:FZF.xs,color:T.ink500}}>Aucun PJ en production ce jour.</div>}
      {/* v292 (demandé : « warning sur le lien planificateur / calendrier / Gantt ») : ce qui change, et quand */}
      <div role="note" style={{marginTop:12,padding:"8px 10px",borderRadius:8,background:T.surfaceAlt,fontSize:FZF.xs,color:T.ink700,lineHeight:1.45}}>
        <b>Effet sur le planning.</b> Jour sans production : la date de fin ne bouge pas (le début peut reculer si c'est un premier jour de production), les heures se répartissent sur les autres jours de production (charge du Planificateur). Jour fermé pour l'atelier : le Planificateur décale les dates de son brouillon. Le Gantt, le Calendrier et la Liste ne changent qu'après « Publier » dans le Planificateur.
      </div>
    </div></>);
}
