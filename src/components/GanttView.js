import React, { useState, useEffect, useMemo, useRef } from "react";
import { isPhone } from "../useIsPhone";
import { EtatInfoButton } from "./ProdStagesUI";
import { T, FZF, mixHex, ganttSoft, stageSoft, stripeBg } from "../theme";
import { fmt } from "../parsers";
import { getPjMeta, ETAT_META, ALL_ETATS, MONTHS, today, ProjectLabelCell } from "../pjMeta";
import { DropFilter, NavIcon, pressable } from "./SharedUI";
import { PjDialog } from "./RowDetail";
import { gapRanges } from "../workDays";

// Couleurs lues à chaque rendu (accesseurs) : un tableau figé à l'import garderait le thème clair.
export const PHASES=[
  // v144 : pastel. c = trait doux (anneau, liseré), bg = aplat clair, ink = texte foncé. Pas de rouge : réservé au retard.
  {k:"arrivee",l:"A",get c(){return ganttSoft().arrivee.ring;},get bg(){return ganttSoft().arrivee.bg;},get ink(){return ganttSoft().arrivee.ink;},get tbg(){return stageSoft().arrivee.bg;},get tink(){return stageSoft().arrivee.ink;},t:"Arrivée"},
  {k:"tests",l:"T",get c(){return ganttSoft().tests.ring;},get bg(){return ganttSoft().tests.bg;},get ink(){return ganttSoft().tests.ink;},get tbg(){return stageSoft().tests.bg;},get tink(){return stageSoft().tests.ink;},t:"Tests"},
  {k:"finProd",l:"F",get c(){return ganttSoft().finProd.ring;},get bg(){return ganttSoft().finProd.bg;},get ink(){return ganttSoft().finProd.ink;},get tbg(){return stageSoft().finProd.bg;},get tink(){return stageSoft().finProd.ink;},t:"Fin prod"},
  {k:"depart",l:"D",get c(){return ganttSoft().depart.ring;},get bg(){return ganttSoft().depart.bg;},get ink(){return ganttSoft().depart.ink;},get tbg(){return stageSoft().depart.bg;},get tink(){return stageSoft().depart.ink;},t:"Départ"},
];

// v171 (maquette validée) : une teinte unie par palier d'écart vs planning initial, au lieu du dégradé continu.
//   ≤ 3 j (ou en avance) = vert · 4 à 10 j = orange · > 10 j = rouge · pas de planning initial = gris.
export const DRIFT_LEVELS=()=>[
  {id:"ok",label:"À l'heure ou en avance (≤ 3 j)",c:T.emerald500},
  {id:"warn",label:"Retard de 4 à 10 j",c:T.amber500},
  {id:"late",label:"Retard de plus de 10 j",c:T.red500},
  {id:"none",label:"Pas de planning initial",c:T.ink300},
];
export function driftColor(d){
  const L=DRIFT_LEVELS();
  if(d==null)return L[3].c;
  return d>10?L[2].c:d>3?L[1].c:L[0].c;
}

// selEtats/selPJs (demandé explicitement : "mettre en place un système de filtre pour enlever
// certain PJ ou certain état") — même état que la liste (App.js), donc filtrer ici filtre aussi la
// liste et inversement, sans dupliquer la logique de filtrage.
export function GanttView({data,progress,df,selEtats,setSelEtats,allPJs,selPJs,setSelPJs,comments,addComment,deleteComment,pinOk,delays,delayTypes,setDelayTypes,addDelayAllocation,deleteDelayAllocation,addDelayComment,deleteDelayComment,authorName,savePjMetaOverride,canEditMeta,closurePeriods,productionExclusions}){
  const [sel,setSel]=useState(null);
  const [tip,setTip]=useState(null); // v142 : infobulle propre (PJ survolé + position)
  const todayYear=today.getFullYear();
  // Plage dynamique : couvre toujours l'année en cours, étendue si des machines
  // ont des jalons avant/après (ex. départ en janvier de l'année suivante).
  const {yearStart,yearEnd}=useMemo(()=>{
    let min=null,max=null;
    data.forEach(r=>{
      [r.arrivee,r.tests,r.testsFin,r.finProd,r.depart].forEach(v=>{
        if(!v)return;const dt=new Date(v);
        if(!min||dt<min)min=dt;
        if(!max||dt>max)max=dt;
      });
    });
    let s=min?new Date(min.getFullYear(),0,1):new Date(todayYear,0,1);
    let e=max?new Date(max.getFullYear(),11,31):new Date(todayYear,11,31);
    if(s>new Date(todayYear,0,1))s=new Date(todayYear,0,1);
    if(e<new Date(todayYear,11,31))e=new Date(todayYear,11,31);
    return{yearStart:s,yearEnd:e};
  },[data,todayYear]);
  const totalDays=Math.round((yearEnd-yearStart)/86400000)+1;
  const months=useMemo(()=>{
    const out=[];
    let cur=new Date(yearStart.getFullYear(),yearStart.getMonth(),1);
    const end=new Date(yearEnd.getFullYear(),yearEnd.getMonth(),1);
    while(cur<=end){out.push(new Date(cur));cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);}
    return out;
  },[yearStart,yearEnd]);
  const multiYear=yearStart.getFullYear()!==yearEnd.getFullYear();
  // Dézoom par défaut (demandé explicitement : "voir 6 mois en une fois") — niveau 6px/jour ajouté
  // sous l'ancien minimum (10), et utilisé comme valeur de départ plutôt que le niveau médian.
  const ZOOM_LEVELS=[6,10,14,18,26,36,50];
  const ZMIN=4,ZMAX=56;
  const [dayW,setDayW]=useState(ZOOM_LEVELS[0]); // px par jour — ajustable via les boutons ou Ctrl + molette (v162 : zoom continu, centré sur le curseur)
  // Mémorise le jour actuellement affiché à gauche de l'écran avant de changer le zoom,
  // pour recentrer la vue sur la même période après — sinon zoomer fait "sauter" le planning.
  const anchorDayRef=React.useRef(null); // {day, off} : jour qui doit rester sous le même repère (off px du bord gauche de la frise)
  const captureAnchor=(off=0)=>{if(scrollRef.current)anchorDayRef.current={day:(scrollRef.current.scrollLeft+off)/dayW,off};};
  const clampZ=w=>Math.round(Math.max(ZMIN,Math.min(ZMAX,w))*10)/10;
  const zoomOut=()=>{captureAnchor();setDayW(w=>clampZ(w/1.28));};
  const zoomIn=()=>{captureAnchor();setDayW(w=>clampZ(w*1.28));};
  // v146.13 : colonne Projet calée sur le texte réel (nom complet visible), comme dans le Calendrier.
  const colW=useMemo(()=>{
    let ctx=null;try{ctx=document.createElement("canvas").getContext("2d");}catch(e){}
    const ms=(t,f)=>{if(!ctx)return String(t).length*7;ctx.font=f;return ctx.measureText(t).width;};
    let w=0;
    data.forEach(r=>{const m=getPjMeta(r.pj,r);
      const l1=8+7+ms(r.pj,"700 "+FZF.sm+"px "+T.fontMono)+7+ms(r.gamme||"","700 "+FZF.xs+"px "+T.font)+12+60;
      const l2=15+17+ms(m.nomProjet||"","500 "+FZF.xs+"px "+T.font);
      w=Math.max(w,l1,l2);});
    if(isPhone())return 124; // téléphone : PJ + pastille seulement, la frise garde la place
    return Math.min(380,Math.max(240,Math.ceil(w+16*2+6)));
  },[data]);
  const endPad=Math.round((typeof window!=="undefined"?window.innerWidth:1400)/2);
  const rowH=60; // v184 : lignes un peu plus hautes (maquette validée)
  // En-tête à 3 bandes — mois, puis numéro de semaine ("SXX", demandé explicitement : "rajouter les
  // SXX (numéro de semaine) dans la page gantt"), puis le repère jour existant — plutôt que de
  // remplacer ce dernier, pour ne pas perdre le détail jour tout en ajoutant le numéro de semaine.
  // v251 (maquette A « Gantt épuré » de Claude Design, choisie par Gabriel) : en-tête sur deux bandes seulement — le mois en gras,
  // puis la semaine et la date de son lundi sur une seule ligne (« S45 · 2 ») ; l'ancienne bande des jours est fusionnée.
  const MONTH_BAND_H=26, WEEK_NUM_BAND_H=22;
  const HEADER_H=MONTH_BAND_H+WEEK_NUM_BAND_H;
  // Même formule que CalendarView (weekNum) — numéro ISO-like de semaine à partir du 1er janvier.
  const weekNum=d=>{const j=new Date(d.getFullYear(),0,1);return Math.ceil(((d-j)/86400000+j.getDay()+1)/7);};
  const scrollRef=React.useRef(null);
  const topScrollRef=React.useRef(null);
  const dayOf=d=>Math.round((d-yearStart)/86400000);
  const xOf=d=>dayOf(d)*dayW;

  // Centre un point x (px) dans la zone visible du planning (la colonne PJ de gauche, collée, n'en fait
  // pas partie) — demandé : « les centrer sur la date du jour ».
  const centerTarget=x=>Math.max(0,x-((scrollRef.current?scrollRef.current.clientWidth:1000)-colW)/2);

  // positionne le scroll sur "aujourd'hui" au premier rendu
  useEffect(()=>{
    if(scrollRef.current){
      const target=centerTarget(xOf(today)+dayW/2);
      scrollRef.current.scrollLeft=target;
      if(topScrollRef.current)topScrollRef.current.scrollLeft=target;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // recentre la vue sur la même période après un changement de zoom (dayW)
  useEffect(()=>{
    if(anchorDayRef.current==null)return;
    const target=Math.max(0,anchorDayRef.current.day*dayW-anchorDayRef.current.off);
    if(scrollRef.current)scrollRef.current.scrollLeft=target;
    if(topScrollRef.current)topScrollRef.current.scrollLeft=target;
  },[dayW]);

  // Ctrl + molette (ou pincement du pavé tactile) : zoom continu centré sur le curseur
  const dayWRef=useRef(dayW);dayWRef.current=dayW;
  useEffect(()=>{
    const el=scrollRef.current;if(!el)return undefined;
    const onWheel=e=>{
      if(!(e.ctrlKey||e.metaKey))return;
      e.preventDefault();
      const rect=el.getBoundingClientRect();
      const off=Math.max(0,e.clientX-rect.left-colW);
      anchorDayRef.current={day:(el.scrollLeft+off)/dayWRef.current,off};
      const f=Math.exp(-e.deltaY*0.0022);
      setDayW(w=>clampZ(w*f));
    };
    el.addEventListener("wheel",onWheel,{passive:false});
    return()=>el.removeEventListener("wheel",onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[colW]);

  // synchronisation bidirectionnelle entre la barre de scroll du haut (factice) et le contenu réel
  const syncFromTop=()=>{if(scrollRef.current&&topScrollRef.current)scrollRef.current.scrollLeft=topScrollRef.current.scrollLeft;};
  const syncFromBottom=()=>{if(scrollRef.current&&topScrollRef.current)topScrollRef.current.scrollLeft=scrollRef.current.scrollLeft;};

  const scrollToDay=dIdx=>{
    if(scrollRef.current){
      const target=centerTarget(dIdx*dayW+dayW/2);
      scrollRef.current.scrollTo({left:target,behavior:"smooth"});
      if(topScrollRef.current)topScrollRef.current.scrollTo({left:target,behavior:"smooth"});
    }
  };

  const scrollTodayRef=useRef(null);scrollTodayRef.current=()=>scrollToDay(dayOf(today));
  useEffect(()=>{const h=()=>scrollTodayRef.current&&scrollTodayRef.current();window.addEventListener("enogia:today",h);return()=>window.removeEventListener("enogia:today",h);},[]);

  // graduations : un repère par début de semaine (lundi)
  const weekMarks=useMemo(()=>{
    const marks=[];
    let cur=new Date(yearStart);
    while(cur.getDay()!==1)cur=new Date(cur.getTime()+86400000);
    while(cur<=yearEnd){marks.push(new Date(cur));cur=new Date(cur.getTime()+7*86400000);}
    return marks;
  },[yearStart,yearEnd]);

  const bpct=(as,bs)=>{if(!as||!bs)return null;const a=new Date(as),b=new Date(bs);return{left:xOf(a),width:Math.max(xOf(b)-xOf(a),6)};};
  // Hauteur calculée explicitement (plutôt que de laisser le flex/sticky la déduire du contenu) —
  // le trait "aujourd'hui" s'appuyait sur bottom:0, qui ne retombait pas toujours exactement en bas
  // de la dernière ligne ("le trait rouge ne va pas au bout") ; une hauteur numérique garantit que
  // la colonne de gauche, la zone du planning et le trait font tous exactement la même hauteur.
  const GROUP_H=34;
  const [grouped,setGroupedS]=useState(()=>{try{return localStorage.getItem("enogia_gantt_group")==="1";}catch(e){return false;}});
  const setGrouped=v=>{setGroupedS(v);try{localStorage.setItem("enogia_gantt_group",v?"1":"0");}catch(e){}};
  // v162 : regroupement par projet (en-tête de groupe + étendue arrivée → départ du projet)
  const items=useMemo(()=>{
    if(!grouped)return data.map(r=>({r}));
    const m=new Map();
    data.forEach(r=>{const n=getPjMeta(r.pj,r).nomProjet;const k=n&&n!=="—"?n:"Sans nom de projet";if(!m.has(k))m.set(k,[]);m.get(k).push(r);});
    const out=[];
    [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0],"fr")).forEach(([k,rs])=>{
      const arr=rs.map(r=>r.arrivee).filter(Boolean).sort()[0]||null;
      const dep=rs.map(r=>r.depart).filter(Boolean).sort().slice(-1)[0]||null;
      out.push({g:k,n:rs.length,from:arr,to:dep});
      rs.forEach(r=>out.push({r}));
    });
    return out;
  },[data,grouped]);
  const ganttH=HEADER_H+items.reduce((n,it)=>n+(it.g?GROUP_H:rowH),0);

  return(<div className="enogia-view-in" style={{background:stripeBg(T.teal500,T.surface,4),borderRadius:12,overflow:"hidden",border:"1px solid "+T.line,fontFamily:T.font}}>
    <div style={{display:"flex",gap:10,padding:"14px 18px",borderBottom:"1px solid "+T.line,alignItems:"center",flexWrap:"wrap",background:T.surface}}>
      <span style={{fontSize:FZF.md,fontWeight:600,color:T.ink700,fontVariantNumeric:"tabular-nums"}}>{multiYear?yearStart.getFullYear()+" – "+yearEnd.getFullYear():yearStart.getFullYear()}</span>
      {/* Plus petite + italique (demandé explicitement) : une note d'usage secondaire, pas un titre. */}
      <span style={{fontSize:FZF.sm,color:T.ink500}}>Molette pour défiler · Ctrl + molette pour zoomer · cliquez une ligne pour la fiche projet</span>
      {/* Filtres État + PJ (demandé explicitement : "système de filtre pour enlever certain PJ ou
          certain état") — même état que la liste (App.js), donc filtrer ici filtre aussi la liste. */}
      <div style={{display:"flex",gap:8,marginLeft:"auto",alignItems:"center",flexWrap:"wrap"}}>
        {setSelEtats&&<DropFilter label="État" options={ALL_ETATS} selected={selEtats} onChange={setSelEtats} getLabel={o=>ETAT_META[o]?.label||o}/>}
        {setSelEtats&&<EtatInfoButton/>}
        {allPJs&&<DropFilter label="PJ" options={allPJs} selected={selPJs||new Set(allPJs)} onChange={setSelPJs}/>}
        <button type="button" onClick={()=>setGrouped(!grouped)} aria-pressed={grouped} title="Regrouper les lignes par projet"
          style={{padding:"5px 11px",borderRadius:7,border:"1px solid "+(grouped?T.teal400:T.line),background:grouped?(T.mode==="dark"?T.teal600:T.teal500):"transparent",color:grouped?(T.mode==="dark"?"#0B1130":"#FFFFFF"):T.ink700,fontSize:FZF.sm,fontWeight:700,cursor:"pointer",transition:"background-color .15s ease, color .15s ease",display:"inline-flex",alignItems:"center",gap:6}}><NavIcon name="layers" size={15}/>Par projet</button>
        <div style={{display:"flex",gap:4}}>
          <button onClick={zoomOut} disabled={dayW<=ZMIN} style={{padding:"5px 9px",borderRadius:7,border:"1px solid "+T.line,background:"transparent",color:dayW<=ZMIN?T.ink300:T.ink700,fontSize:FZF.md,fontWeight:700,cursor:dayW<=ZMIN?"default":"pointer"}}>−</button>
          <button onClick={zoomIn} disabled={dayW>=ZMAX} style={{padding:"5px 9px",borderRadius:7,border:"1px solid "+T.line,background:"transparent",color:dayW>=ZMAX?T.ink300:T.ink700,fontSize:FZF.md,fontWeight:700,cursor:dayW>=ZMAX?"default":"pointer"}}>+</button>
        </div>
        <button onClick={()=>scrollToDay(dayOf(today))} className="enogia-btn-ind" style={{padding:"5px 11px",borderRadius:7,border:"1.5px solid "+T.teal500,background:"transparent",color:T.teal600,fontSize:FZF.sm,fontWeight:700,cursor:"pointer"}}>Aujourd'hui</button>
      </div>
    </div>

    <div ref={topScrollRef} onScroll={syncFromTop} style={{overflowX:"auto",overflowY:"hidden",height:16}}>
      <div style={{width:colW+totalDays*dayW+endPad,height:1}}/>
    </div>

    <div ref={scrollRef} onScroll={syncFromBottom} style={{display:"flex",overflowX:"auto",overflowY:"auto",maxHeight:"calc(100dvh - 300px)",position:"relative"}}>
      <div style={{width:colW,height:ganttH,flexShrink:0,position:"sticky",left:0,zIndex:8,background:T.surface,borderRight:"1px solid "+T.line,boxShadow:"2px 0 6px rgba(15,40,60,.04)"}}>
        <div className="enogia-lblcell" style={{height:HEADER_H,padding:"0 16px",display:"flex",alignItems:"center",fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk,borderBottom:"1px solid "+T.line,background:T.surface,position:"sticky",top:0,zIndex:9}}>Machine</div>
        {items.map((it,ri)=>{
          if(it.g)return(<div key={"g"+ri} className="enogia-lblcell" style={{height:GROUP_H,boxSizing:"border-box",padding:"0 16px",display:"flex",alignItems:"center",gap:8,background:T.surfaceAlt,borderBottom:"1px solid "+T.line,fontSize:FZF.sm,fontWeight:700,color:T.ink700,overflow:"hidden"}}>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.g}</span><span style={{fontWeight:600,color:T.ink500,flexShrink:0}}>{it.n}</span></div>);
          const r=it.r;
          const meta=getPjMeta(r.pj,r);
          const isSel=sel===r.pj;
          return(<div key={ri} className="enogia-lblcell" {...pressable(()=>setSel(isSel?null:r.pj),{"aria-pressed":isSel})} style={{height:rowH,boxSizing:"border-box",padding:"6px 16px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2,borderBottom:"1px solid "+T.surfaceAlt,borderLeft:"3px solid "+(isSel?T.teal500:"transparent"),background:isSel?T.surfaceAlt:"transparent",cursor:"pointer",transition:"background .12s ease, border-color .12s ease"}}
            onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=T.surfaceAlt;}}
            onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background="transparent";}}>
            <ProjectLabelCell pj={r.pj} r={r} meta={meta}/>
          </div>);
        })}
      </div>

      {/* Sans overflow:"hidden" ici (retiré) : un ancestor avec overflow≠visible — même "hidden" —
          devient lui-même le conteneur de référence pour tout position:sticky à l'intérieur, donc
          l'en-tête mois/semaines ci-dessous ne restait plus accroché au défilement réel (celui du
          conteneur englobant, scrollRef) mais à cette boîte-ci, qui ne défile jamais elle-même
          ("il faut que les mois ... restent figés" — régression introduite par le correctif précédent
          contre le débordement des marqueurs). Les marqueurs ne peuvent de toute façon pas avoir une
          position x négative (xOf est calculé à partir de yearStart, qui couvre toujours la date la
          plus ancienne), donc ce correctif n'était pas nécessaire pour eux. */}
      <div style={{position:"relative",width:totalDays*dayW,height:ganttH,flexShrink:0}}>
        {/* en-tête mois + numéro de semaine + semaines (repère jour) */}
        <div style={{height:HEADER_H,position:"sticky",top:0,zIndex:7,borderBottom:"1px solid "+T.line,background:T.surface}}>
          {months.map((ms,mi)=>{const me=new Date(ms.getFullYear(),ms.getMonth()+1,1);const w=(xOf(me)-xOf(ms));const isCur=ms.getFullYear()===todayYear&&ms.getMonth()===today.getMonth();
            return(<div key={mi} style={{position:"absolute",left:xOf(ms),width:w,top:0,height:MONTH_BAND_H,display:"flex",alignItems:"flex-end",justifyContent:"flex-start",padding:"0 8px 2px",boxSizing:"border-box",overflow:"hidden",whiteSpace:"nowrap",fontSize:FZF.md,fontWeight:700,color:isCur?T.ink900:T.ink700,borderLeft:"1px solid "+T.line,background:isCur?T.teal100:"transparent"}}>{MONTHS[ms.getMonth()]}{multiYear?" "+ms.getFullYear():""}</div>);
          })}
          {/* Bande "SXX" (demandé explicitement), une fois par semaine, séparée du repère jour
              ci-dessous plutôt que de le remplacer. */}
          {weekMarks.map((wm,wi)=>(
            <div key={wi} title={"Semaine "+weekNum(wm)+" — lundi "+fmt(wm)} style={{position:"absolute",left:xOf(wm),top:MONTH_BAND_H,height:WEEK_NUM_BAND_H,width:dayW*7,display:"flex",alignItems:"center",justifyContent:"center",gap:3,fontSize:FZF.xs,whiteSpace:"nowrap",overflow:"hidden",borderLeft:"1px solid "+T.surfaceAlt,fontVariantNumeric:"tabular-nums"}}><b style={{color:T.ink500}}>S{weekNum(wm)}</b>{dayW*7>=46&&<span style={{color:T.ink300}}>· {wm.getDate()}</span>}</div>
          ))}
        </div>

        {/* lignes de fond + grille */}
        {items.map((it,ri)=>{
          if(it.g){const gb=bpct(it.from,it.to);return(<div key={"g"+ri} style={{height:GROUP_H,boxSizing:"border-box",position:"relative",background:T.surfaceAlt,borderBottom:"1px solid "+T.line}}>
            {gb&&<div aria-hidden="true" style={{position:"absolute",left:gb.left,width:gb.width,top:"50%",height:6,transform:"translateY(-50%)",borderRadius:3,background:mixHex(T.surfaceAlt,T.ink500,.45)}}/>}
          </div>);}
          const r=it.r;
          const c=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
          const mb=bpct(r.arrivee,r.depart);
          const isSel=sel===r.pj;
          return(<div key={ri} onClick={()=>setSel(isSel?null:r.pj)} onMouseMove={e=>setTip({r,x:e.clientX,y:e.clientY})} onMouseLeave={()=>setTip(null)} style={{height:rowH,boxSizing:"border-box",position:"relative",borderBottom:"1px solid "+T.surfaceAlt,background:isSel?T.surfaceAlt:"transparent",cursor:"pointer"}}>
            {weekMarks.map((wm,wi)=><div key={wi} style={{position:"absolute",left:xOf(wm),top:0,bottom:0,width:1,background:T.surfaceAlt}}/>)}
            {months.map((ms,mi)=><div key={mi} style={{position:"absolute",left:xOf(ms),top:0,bottom:0,width:1,background:T.line}}/>)}
            {/* v184 (maquette validée, « le Gantt est illisible ») : une barre par machine découpée par étape —
                production (arrivée → tests), tests (tests → fin prod), fin de prod (fin prod → départ) —, l'écart écrit en clair
                au bout de la barre, le planning initial en pointillés dessous. Plus de pastilles A/T/F/D superposées. */}
            {mb&&(()=>{
              const S=stageSoft(),dOf=v=>v?new Date(v):null,arr=dOf(r.arrivee),dep=dOf(r.depart),tst=dOf(r.tests),fin=dOf(r.finProd);
              const prevision=r.etat==="NOT ORDERED";
              const cuts=[[arr,tst||fin||dep,S.production.solid,"Production"],[tst,fin||dep,S.tests.solid,"Tests"],[fin,dep,S.finProd.solid,"Fin de prod → départ"]].filter(([x,y])=>x&&y&&y>x);
              const total=Math.max(1,dep-arr);
              const ini=r.drift?bpct(r.arrivee,new Date(new Date(r.depart).getTime()-r.drift*86400000)):null;
              const lvl=r.drift==null?null:r.drift>10?"late":r.drift>3?"warn":"ok";
              const pill=lvl==="late"?{bg:T.red100,fg:T.red600}:lvl==="warn"?{bg:T.amber100,fg:T.amber600}:lvl==="ok"?{bg:T.emerald100,fg:T.emerald600}:null;
              const txt=r.drift==null?null:r.drift===0?"à l'heure":(r.drift>0?"+":"−")+Math.abs(r.drift)+" j";
              return <>
                <div className="enogia-bar-fill" role="img" aria-label={r.pj+" : "+(prevision?"dates prévisionnelles":cuts.map(c=>c[3]).join(", "))+(txt?" ; écart "+txt:"")}
                  style={{position:"absolute",left:mb.left,width:mb.width,top:"50%",transform:"translateY(-50%)",marginTop:-4,height:18,display:"flex",borderRadius:4,overflow:"hidden",zIndex:1,animationDelay:Math.min(ri,14)*30+"ms",
                    border:prevision?"1.5px dashed "+T.ink300:"none",background:prevision?"transparent":T.ink100,boxSizing:"border-box"}}>
                  {!prevision&&cuts.map(([x,y,col,lab],k)=><div key={k} title={lab} style={{flex:"0 0 "+((y-x)/total*100)+"%",background:col}}/>)}
                </div>
                {/* v213 : jours non travaillés (fermeture de l'atelier, ou pas de production pour ce PJ) : la barre est coupée */}
                {!prevision&&gapRanges(r.arrivee,r.depart,closurePeriods,(productionExclusions||{})[r.pj]).filter(g=>g.kind==="closed"||(fin?new Date(g.to+"T12:00:00")<=fin:true)).map(g=>{const x0=xOf(new Date(g.from+"T00:00:00")),x1=xOf(new Date(g.to+"T00:00:00"))+dayW;return <div key={g.from} title={(g.kind==="closed"?"Atelier fermé":"Pas de production")+" : "+g.from.split("-").reverse().join("/")+(g.to!==g.from?" → "+g.to.split("-").reverse().join("/"):"")}
                  style={{position:"absolute",left:x0,width:Math.max(2,x1-x0),top:"50%",transform:"translateY(-50%)",marginTop:-4,height:22,zIndex:2,background:T.surface,backgroundImage:"repeating-linear-gradient(135deg,"+T.line+" 0 2px,transparent 2px 5px)",borderLeft:"1px solid "+T.line,borderRight:"1px solid "+T.line,boxSizing:"border-box"}}/>;})}
                {/* v251 (maquette A) : le départ prévu au planning initial = losange gris ; un pointillé de la couleur de l'écart le relie
                    au départ actuel (glissement), au lieu de toute la barre initiale en pointillés */}
                {ini&&(()=>{const xi=ini.left+ini.width,xd=mb.left+mb.width,a=Math.min(xi,xd),w=Math.abs(xd-xi),col=lvl==="late"?T.red500:lvl==="warn"?T.amber600:T.emerald600;return <>
                  {w>2&&<div aria-hidden="true" style={{position:"absolute",left:a,width:w,top:"50%",marginTop:12,height:0,borderTop:"2px dotted "+col,zIndex:2}}/>}
                  <div title={"Départ prévu au planning initial : "+fmt(new Date(new Date(r.depart).getTime()-r.drift*86400000))} style={{position:"absolute",left:xi-5,top:"50%",marginTop:7,width:10,height:10,background:T.ink500,transform:"rotate(45deg)",zIndex:3,boxShadow:"0 0 0 1.5px "+T.card}}/>
                </>;})()}
                {(txt||prevision)&&<span style={{position:"absolute",left:mb.left+mb.width+8,top:"50%",transform:"translateY(-50%)",marginTop:-4,zIndex:4,whiteSpace:"nowrap",fontSize:FZF.xs,fontWeight:700,padding:"1px 8px",borderRadius:999,fontVariantNumeric:"tabular-nums",
                  background:prevision?"transparent":pill?pill.bg:"transparent",color:prevision?T.ink500:pill?pill.fg:T.ink500}}>{prevision?"dates prévisionnelles":txt}</span>}
              </>;})()}
          </div>);
        })}

        {/* ligne "aujourd'hui" — hauteur explicite (ganttH-HEADER_H) plutôt que bottom:0, pour être
            sûr qu'elle descend exactement jusqu'à la dernière ligne quel que soit le nombre de PJ. */}
        <div style={{position:"absolute",left:xOf(today)-1,top:HEADER_H,height:ganttH-HEADER_H,width:2,background:T.red500,zIndex:3,pointerEvents:"none"}}/>
        {/* v142 : repère « aujourd'hui » net : trait plein + pastille datée posée sur le bord de l'en-tête. */}
        <div style={{position:"absolute",left:xOf(today),top:HEADER_H-10,transform:"translateX(-50%)",zIndex:9,pointerEvents:"none",background:T.redFill,color:"#fff",fontSize:FZF.xs,fontWeight:700,padding:"2px 8px",borderRadius:999,whiteSpace:"nowrap",boxShadow:T.shadowFlat}}>Aujourd'hui · {fmt(today)}</div>
      </div>
      {/* Marge de fin : sans elle, « aujourd'hui » ne peut pas être centré quand il est proche de la fin de la plage. */}
      <div style={{width:endPad,height:1,flexShrink:0}}/>
    </div>


    {/* v184 : légende de la maquette validée */}
    <div style={{padding:"10px 18px",borderTop:"1px solid "+T.line,display:"flex",gap:"6px 18px",flexWrap:"wrap",alignItems:"center",background:T.surface,fontSize:FZF.sm,color:T.ink700}}>
      {[["Production",stageSoft().production.solid],["Tests",stageSoft().tests.solid],["Fin de prod → départ",stageSoft().finProd.solid]].map(([l,c])=><span key={l} style={{display:"inline-flex",alignItems:"center",gap:6}}><span aria-hidden="true" style={{width:18,height:10,borderRadius:2,background:c}}/>{l}</span>)}
      <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span aria-hidden="true" style={{width:9,height:9,background:T.ink500,transform:"rotate(45deg)"}}/>Départ initial</span>
      <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span aria-hidden="true" style={{width:18,height:0,borderTop:"2px dotted "+T.red500}}/>Glissement</span>
      <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span aria-hidden="true" style={{width:2,height:12,background:T.red500}}/>Aujourd'hui</span>
      <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span aria-hidden="true" style={{width:18,height:10,borderRadius:2,border:"1.5px dashed "+T.ink300,boxSizing:"border-box"}}/>Dates prévisionnelles</span>
      <span style={{marginLeft:"auto",color:T.ink500}}>Écart : <b style={{color:T.emerald600}}>à l'heure</b> · <b style={{color:T.amber600}}>4 à 10 j</b> · <b style={{color:T.red600}}>plus de 10 j</b></span>
    </div>

    {tip&&(()=>{
      const r=tip.r,meta=getPjMeta(r.pj,r),W=270,left=Math.min(tip.x+16,(typeof window!=="undefined"?window.innerWidth:1400)-W-12),top=Math.max(8,Math.min(tip.y+16,(typeof window!=="undefined"?window.innerHeight:800)-270));
      const dc=driftColor(r.drift),iniDep=r.drift!=null&&r.depart?new Date(new Date(r.depart).getTime()-r.drift*86400000):null;
      return(<div role="tooltip" style={{position:"fixed",left,top,width:W,zIndex:10030,pointerEvents:"none",background:T.card,color:T.ink900,borderRadius:12,boxShadow:T.shadowFloat,padding:"10px 12px",fontFamily:T.font}}>
        <div style={{fontSize:FZF.md,fontWeight:700,lineHeight:1.2}}>{r.pj}<span style={{fontWeight:500,color:T.ink500,fontSize:FZF.sm}}>{meta&&meta.nomProjet?"  "+meta.nomProjet:""}</span></div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6,flexWrap:"wrap",fontSize:FZF.xs,color:T.ink500}}>
          {ETAT_META[r.etat]&&<span style={{display:"inline-flex",alignItems:"center",gap:5,fontWeight:600,color:T.ink700}}><span aria-hidden="true" style={{width:8,height:8,borderRadius:"50%",background:ETAT_META[r.etat].bar}}/>{ETAT_META[r.etat].label}</span>}
          {meta&&meta.chefProjet&&meta.chefProjet!=="—"&&<span>· {meta.chefProjet}</span>}
          {r.gamme&&<span>· {r.gamme}</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",columnGap:10,rowGap:4,marginTop:8,fontSize:FZF.sm,alignItems:"center"}}>
          {PHASES.map(ph=>{const dt=r[ph.k];return(<React.Fragment key={ph.k}>
            <span style={{display:"flex",alignItems:"center",gap:6,color:T.ink700}}><span style={{width:10,height:10,borderRadius:"50%",border:"2px solid "+ph.c,background:ph.bg}}/>{ph.t}</span>
            <span style={{textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:600}}>{dt?fmt(new Date(dt))+(ph.k==="tests"&&r.testsFin?" → "+fmt(new Date(r.testsFin)):""):"—"}</span>
          </React.Fragment>);})}
        </div>
        <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:FZF.sm}}>
          <span style={{color:T.ink500}}>vs planning initial</span>
          <span style={{fontWeight:700,color:r.drift==null?T.ink500:r.drift>0?T.red600:r.drift<0?T.emerald600:T.info600}}>
            {r.drift==null?"pas d'initial":r.drift===0?"dans les temps":(r.drift>0?"+":"−")+Math.abs(r.drift)+" j"+(iniDep?" (départ initial "+fmt(iniDep)+")":"")}
          </span>
        </div>
        <div aria-hidden="true" style={{marginTop:8,height:4,borderRadius:4,background:dc}}/>
      </div>);
    })()}

    {sel&&<PjDialog pj={sel} data={data} df={df} onClose={()=>setSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}
      pinOk={pinOk} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
      addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>}
  </div>);
}

