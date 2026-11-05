import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { T, FZ, stageSoft } from "../theme";
import { SerieTag, getPjMeta, initials, GAMME_COLORS, ETAT_META, ALL_ETATS, ALL_GAMMES, MONTHS, today, PjPlate } from "../pjMeta";
import { fmt, toLocalISO, diffDays, weekStartOf } from "../parsers";
import { workDaysBetween } from "../workDays";
import { DropFilter, NavIcon, Select, notify } from "./SharedUI";
import { CARD, KpiRow, PieBlock, topSlices, EmptyNote, StatutTab, KpiAvancement, DelayInsights, DelaysTab, ProductionCalendarManager } from "./ManagerParts";
import { ProjectFileManager } from "./ManagerFiche";
import { EtatInfoButton } from "./ProdStagesUI";
import { ManagerRail, ManagerPalette, useRailCollapsed } from "./ManagerNav";
import { useIsPhone } from "../useIsPhone";
import { ReleaseManager } from "./ReleaseNotes";
import { PointHebdo } from "./PointHebdo";
import { InitialAddReview } from "./InitialAdd";
import { SanteTab } from "./Feux";
import { SerieTab } from "./Series";
import { planWeeks, loadWeeks } from "./KpiPilotage";
import { monthLab } from "./KpiHead";
import { KpiStory } from "./KpiStory";
import { weekNum } from "../kpiStory";
import { targetsOf, kpiMetrics } from "../kpiTargets";
import { KpiDerivesHead, KpiSemaines } from "./KpiViews";
import { KpiBilan } from "./KpiBilan";
import { isSuperAdmin, canCash, isOwner } from "../roles";
import { PeopleRoles } from "./PeopleRoles";
import { TutoVideoSettings } from "./TutoVideo";

// Filtre de période (mois et/ou année) réutilisable sur chaque graphique temporel
export function PeriodFilter({yearsAvailable,year,setYear,month,setMonth,showMonth=true}){
  return(<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
    <div style={{width:128}}><Select compact value={year||""} onChange={e=>setYear(e.target.value?+e.target.value:null)} options={[{value:"",label:"Toutes années"},...yearsAvailable.map(y=>({value:y,label:String(y)}))]}/></div>
    {showMonth&&<div style={{width:128}}><Select compact value={month==null?"":month} onChange={e=>setMonth(e.target.value===""?null:+e.target.value)} options={[{value:"",label:"Tous les mois"},...MONTHS.map((m,i)=>({value:i,label:m}))]}/></div>}
  </div>);
}
export function ManagerPanel({planDoc,initialAddFromImport,onOpenCashPage,onNav,profiles,saveProfiles,jumpFiche,changeLog,data,progress,setProgress,releases,saveReleaseNotes,releaseSelection,saveReleaseSelection,publishRelease,isBeta,initialData,lastInitialImport,lastInitialAdd,onInitialImport,onInitialAdd,initialImporting,etatChoice,setEtatFor,saveProgress,savingProgress,progressSaved,tab,setTab,clientPresence,setClientPresenceFor,closurePeriods,setClosurePeriods,customEtats,setCustomEtats,etatEdits,setEtatEdits,productionExclusions,setProductionExclusionDays,comments,delays,delayTypes,setDelayTypes,addDelayAllocationMulti,deleteDelayAllocation,managerEmails,setManagerEmails,currentUserEmail,authorName,buildVersion,savePjMetaOverride,savePjMetaMulti,addCommentMulti,addComment,resolveComment,deleteComment,turbineDoc,saveTurbines,certifs,setCertifs,compCatalog,setCompCatalog}){
  const [fEtat,setFEtat]=useState(new Set(ALL_ETATS));
  const [kpiStep,setKpiStep]=useState("depart");
  // v275 (demandé : « la répartition par sévérité est-elle seulement sur les machines expédiées ? je dois pouvoir choisir ») : toutes / en cours / expédiées
  const [codirScope,setCodirScope]=useState("all");
  // v276 (demandé : « Promesse vs Réalité : choisir les mois pris en compte ») — période sur le mois PROMIS (date du planning initial)
  // de l'étape ; vide = sans borne. Skill kpi-dashboard-design : période et méthode affichées sur la carte.
  const [codirFrom,setCodirFrom]=useState(""),[codirTo,setCodirTo]=useState("");
  const [kpiTab,setKpiTab]=useState("synthese"); // sous-onglet KPI par famille
  useEffect(()=>{if(kpiTab==="retards")setKpiTab("synthese");},[kpiTab]); // v217 : l'analyse des retards est passée dans Retards › Analyse
  const [fichePj,setFichePj]=useState(null); // v134 : PJ à ouvrir dans la fiche depuis le Point hebdo
  useEffect(()=>{if(jumpFiche&&jumpFiche.pj)setFichePj(jumpFiche);},[jumpFiche]);
  const [chargeYear,setChargeYear]=useState(null);
  const [satYear,setSatYear]=useState(null);
  const [satMonth,setSatMonth]=useState(null);
  const [driftMoisYear,setDriftMoisYear]=useState(null);
  const yearsInData=useMemo(()=>{
    const ys=new Set();
    data.forEach(r=>["arrivee","tests","finProd","depart"].forEach(k=>{if(r[k])ys.add(new Date(r[k]).getFullYear());}));
    return [...ys].sort();
  },[data]);
  const STEP_LABELS={arrivee:"Arrivée",tests:"Tests",finProd:"Fin de production",depart:"Départ"};
  const [fGamme,setFGamme]=useState(new Set(ALL_GAMMES));
  const fd=useMemo(()=>data.filter(r=>fEtat.has(r.etat)&&(r.etat==="SLOT_LIBRE"||fGamme.has(r.gamme))),[data,fEtat,fGamme]);
  // Les slots libres restent dans la liste, le statut et la charge atelier, mais ne comptent jamais dans les KPI ni les rapports.
  const fk=useMemo(()=>fd.filter(r=>r.etat!=="SLOT_LIBRE"),[fd]);
  const byMonth=Array(12).fill(0);fk.forEach(r=>{if(r.depart)byMonth[new Date(r.depart).getMonth()]++;});
  const maxBar=Math.max(...byMonth,1);
  const gammeCounts={};fk.forEach(r=>{if(r.gamme)gammeCounts[r.gamme]=(gammeCounts[r.gamme]||0)+1;});

  // ── Rapprochement Initial (figé) ↔ Révisé, par N° PJ ──────────
  const initialByPJ=useMemo(()=>{const m={};initialData.forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const driftRows=useMemo(()=>fk.map(r=>{
    const ini=initialByPJ[r.pj];
    const mk=k=>{
      const iv=ini?ini[k]:null;
      const rv=r[k];
      const delta=(iv&&rv)?diffDays(new Date(iv),new Date(rv)):null;
      return{ini:iv||null,rev:rv||null,delta};
    };
    return{pj:r.pj,gamme:r.gamme,etat:r.etat,hasInitial:!!ini,arrivee:mk("arrivee"),tests:mk("tests"),finProd:mk("finProd"),depart:mk("depart")};
  }),[fk,initialByPJ]);
  const mKey=v=>{if(!v)return "";const d=new Date(v);return isNaN(d)?"":d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");};
  const inPeriod=v=>{const k=mKey(v);if(!k)return !codirFrom&&!codirTo;return(!codirFrom||k>=codirFrom)&&(!codirTo||k<=codirTo);};
  const scoped=driftRows.filter(r=>r.hasInitial&&(codirScope==="all"||(codirScope==="shipped"?r.etat==="SHIPPED":r.etat!=="SHIPPED")));
  const comparable=scoped.filter(r=>inPeriod(r[kpiStep].ini));
  // mois proposés : ceux des dates initiales du portefeuille
  const codirMonths=[...new Set(scoped.flatMap(r=>["arrivee","tests","finProd","depart"].map(k=>mKey(r[k].ini)).filter(Boolean)))].sort();
  const mLab=k=>{const [y,m]=k.split("-");return MONTHS[+m-1]+" "+y;};
  // v275 (demandé : « un résumé des PJ tenus à date pour chaque étape, compact pour des captures PowerPoint ») : par étape, tenus (écart ≤ 0) / comparés
  const stepSummary=["arrivee","tests","finProd","depart"].map(k=>{const base=scoped.filter(r=>inPeriod(r[k].ini)),ds=base.map(r=>r[k].delta).filter(d=>d!=null),late=ds.filter(d=>d>0);
    return{k,l:STEP_LABELS[k],n:ds.length,ok:ds.length-late.length,late:late.length,pct:ds.length?Math.round((ds.length-late.length)/ds.length*100):null,avg:late.length?Math.round(late.reduce((a,b)=>a+b,0)/late.length):0,crit:late.filter(d=>d>30).length,
      worst:base.filter(r=>r[k].delta!=null&&r[k].delta>0).sort((a,b)=>b[k].delta-a[k].delta).slice(0,3).map(r=>r.pj+" +"+r[k].delta+"j")};});
  // v279 : objectifs et mesures des en-têtes KPI
  // v280 : période des objectifs (un mois ou plusieurs) — vide = tout le portefeuille / mois écoulé
  const [kpiFrom,setKpiFrom]=useState(""),[kpiTo,setKpiTo]=useState("");
  const kpiTg=targetsOf(profiles),kpiM=kpiMetrics(fk,driftRows,new Date(),kpiFrom,kpiTo);
  const kpiMonths=(()=>{const s=new Set();fk.forEach(r=>["arrivee","tests","finProd","depart"].forEach(k=>{const v=r[k];if(v){const d=new Date(v);if(!isNaN(d))s.add(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}}));return [...s].sort();})();
  const kpiSel={from:kpiFrom,to:kpiTo,set:(a,b)=>{setKpiFrom(a);setKpiTo(b);},months:kpiMonths};
  const perLab=kpiFrom||kpiTo?(kpiFrom===kpiTo?monthLab(kpiFrom):(kpiFrom?monthLab(kpiFrom):"début")+" → "+(kpiTo?monthLab(kpiTo):"fin")):"";
  const w4h=(()=>{try{const ws=loadWeeks(fk,closurePeriods,productionExclusions,175,planDoc&&planDoc.plan,4,new Date()) /* 175 h = CAPA_ATELIER_SEM, déclarée plus bas */;const h=ws.reduce((a,w)=>a+w.hours,0),c=ws.reduce((a,w)=>a+w.cap,0);return c?Math.round(h/c*100):null;}catch(e){return null;}})();
  // v281 : semaines de charge pour les récits KPI (planificateur si disponible, sinon planning ; 175 h = CAPA_ATELIER_SEM)
  const kpiWeeks=n=>{try{return loadWeeks(fk,closurePeriods,productionExclusions,175,planDoc&&planDoc.plan,n,new Date()).map(w=>({...w,lab:"S"+String(weekNum(new Date(w.a))).padStart(2,"0")}));}catch(e){return [];}};
  // v281 : les en-têtes V279 (KPI_HEADS) sont remplacés par les récits de KpiStory;
  // v275 (demandé : « plus de graphiques comme dans l'explorer : arrivées par mois, tests par mois… ») : jalons par mois, initial vs révisé, 12 mois glissants
  const monthsBy=(()=>{const base=new Date(today.getFullYear(),today.getMonth()-5,1),list=[];for(let i=0;i<12;i++){const d=new Date(base.getFullYear(),base.getMonth()+i,1);list.push({key:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"),mois:MONTHS[d.getMonth()]+(d.getMonth()===0||i===0?" "+String(d.getFullYear()).slice(2):"")});}
    const km=v=>{if(!v)return null;const d=new Date(v);return isNaN(d)?null:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");};
    return ["arrivee","tests","finProd","depart"].map(k=>({k,l:STEP_LABELS[k],data:list.map(m=>({mois:m.mois,initial:driftRows.filter(r=>(codirScope==="all"||(codirScope==="shipped"?r.etat==="SHIPPED":r.etat!=="SHIPPED"))&&km(r[k].ini)===m.key).length,revise:driftRows.filter(r=>(codirScope==="all"||(codirScope==="shipped"?r.etat==="SHIPPED":r.etat!=="SHIPPED"))&&km(r[k].rev)===m.key).length,now:m.key===today.getFullYear()+"-"+String(today.getMonth()+1).padStart(2,"0")}))}));})();
  const stepDeltas=comparable.map(r=>r[kpiStep].delta).filter(d=>d!=null);
  const lateCount=stepDeltas.filter(d=>d>0).length;
  const onTimeOrEarlyCount=stepDeltas.filter(d=>d<=0).length;
  const avgDelay=stepDeltas.length?Math.round(stepDeltas.reduce((a,b)=>a+b,0)/stepDeltas.length):null;
  const worstDrifts=[...comparable].filter(r=>r[kpiStep].delta!=null).sort((a,b)=>b[kpiStep].delta-a[kpiStep].delta).slice(0,5);
  const onTimeRate=stepDeltas.length?Math.round((onTimeOrEarlyCount/stepDeltas.length)*100):null;

  // ── AXE 1 : Promesse vs Réalité ────────────────────────────────
  // Jours de retard cumulés sur tout le portefeuille comparable (somme, pas moyenne), pour l'étape sélectionnée
  const totalDelayDays=stepDeltas.filter(d=>d>0).reduce((a,b)=>a+b,0);
  const totalGainDays=stepDeltas.filter(d=>d<0).reduce((a,b)=>a+Math.abs(b),0);
  // Occurrences par mois : initial (promesse) vs révisé (réalité), sur le même axe de mois (mois de la date INITIALE), pour l'étape sélectionnée
  const promiseVsReality=useMemo(()=>{
    const m={};
    comparable.forEach(r=>{
      const step=r[kpiStep];
      if(!step.ini)return;
      const mo=MONTHS[new Date(step.ini).getMonth()];
      if(!m[mo])m[mo]={mois:mo,promis:0,realise:0};
      m[mo].promis++;
      const revMo=step.rev?MONTHS[new Date(step.rev).getMonth()]:null;
      if(revMo===mo)m[mo].realise++;
    });
    const order=MONTHS;
    return order.filter(mo=>m[mo]).map(mo=>m[mo]);
  },[comparable,kpiStep]);

  // ── AXE 2 : Fiabilité de l'engagement ──────────────────────────
  const zeroDriftCount=stepDeltas.filter(d=>d===0).length;
  const reliabilityRate=stepDeltas.length?Math.round((zeroDriftCount/stepDeltas.length)*100):null;
  const driftBuckets=useMemo(()=>{
    const buckets=[
      {label:"À l'heure / avance",min:-Infinity,max:0,c:T.emerald500,n:0},
      {label:"Léger retard (1-15j)",min:0,max:15,c:T.amber500,n:0},
      {label:"Retard important (15-30j)",min:15,max:30,c:T.ember500,n:0},
      {label:"Retard critique (30j+)",min:30,max:Infinity,c:T.red500,n:0},
    ];
    stepDeltas.forEach(d=>{
      const b=buckets.find(b=>d>b.min&&d<=b.max)||(d<=0?buckets[0]:buckets[buckets.length-1]);
      if(b)b.n++;
    });
    return buckets.filter(b=>b.n>0);
  },[stepDeltas]);

  // ── AXE 3 : Trajectoire de la dérive (le retard s'aggrave-t-il ou se résorbe-t-il au fil des jalons ?) ─
  const trajectory=useMemo(()=>{
    const steps=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin prod"],["depart","Départ"]];
    return steps.map(([k,label])=>{
      const deltas=comparable.map(r=>r[k].delta).filter(d=>d!=null);
      const moyenne=deltas.length?Math.round((deltas.reduce((a,b)=>a+b,0)/deltas.length)*10)/10:null;
      return{jalon:label,moyenne};
    });
  },[comparable]);

  // ── Comparaison Initial vs Révisé par PJ — pour l'étape sélectionnée, en barres groupées ─
  // On exprime les deux dates en "jour de l'année" pour pouvoir les comparer visuellement sur un même axe
  const yearStart=new Date(today.getFullYear(),0,1);
  const dayOfYear=d=>Math.round((d-yearStart)/86400000);
  const pjCompareChart=useMemo(()=>{
    return comparable.filter(r=>r[kpiStep].ini&&r[kpiStep].rev).map(r=>({
      pj:r.pj,
      initial:dayOfYear(new Date(r[kpiStep].ini)),
      revise:dayOfYear(new Date(r[kpiStep].rev)),
      delta:r[kpiStep].delta,
      dateIni:r[kpiStep].ini,
      dateRev:r[kpiStep].rev,
    })).sort((a,b)=>a.initial-b.initial);
  },[comparable,kpiStep]); // eslint-disable-line react-hooks/exhaustive-deps -- dayOfYear est une fonction pure recréée à chaque rendu

  // ── Durée totale de production (Arrivée → Départ) : initial vs révisé ──
  const dureeCompare=useMemo(()=>{
    const rows=comparable.filter(r=>r.arrivee.ini&&r.depart.ini&&r.arrivee.rev&&r.depart.rev).map(r=>({
      pj:r.pj,
      dureeIni:diffDays(new Date(r.arrivee.ini),new Date(r.depart.ini)),
      dureeRev:diffDays(new Date(r.arrivee.rev),new Date(r.depart.rev)),
    }));
    const avgIni=rows.length?Math.round(rows.reduce((a,b)=>a+b.dureeIni,0)/rows.length):null;
    const avgRev=rows.length?Math.round(rows.reduce((a,b)=>a+b.dureeRev,0)/rows.length):null;
    return{rows,avgIni,avgRev,ecart:avgIni!=null&&avgRev!=null?avgRev-avgIni:null};
  },[comparable]);

  // ── Tableau détaillé : écart sur les 4 jalons pour chaque PJ comparable ──
  // ── Axe 1 : dérive moyenne par gamme ──────────────────────────
  const driftByGamme=useMemo(()=>{
    const m={};
    comparable.forEach(r=>{
      if(r.depart.delta==null||!r.gamme)return;
      if(!m[r.gamme])m[r.gamme]={sum:0,n:0};
      m[r.gamme].sum+=r.depart.delta;m[r.gamme].n++;
    });
    return Object.entries(m).map(([gamme,v])=>({gamme,moyenne:Math.round((v.sum/v.n)*10)/10,n:v.n})).sort((a,b)=>b.moyenne-a.moyenne);
  },[comparable]);

  // ── Axe 2 : dérive moyenne par mois de départ révisé ──────────
  const driftByMonth=useMemo(()=>{
    const m={};
    comparable.forEach(r=>{
      if(r.depart.delta==null||!r.depart.rev)return;
      const dt=new Date(r.depart.rev);
      if(driftMoisYear&&dt.getFullYear()!==driftMoisYear)return;
      const mo=MONTHS[dt.getMonth()];
      if(!m[mo])m[mo]={sum:0,n:0};
      m[mo].sum+=r.depart.delta;m[mo].n++;
    });
    return MONTHS.filter(mo=>m[mo]).map(mo=>({mois:mo,moyenne:Math.round((m[mo].sum/m[mo].n)*10)/10,n:m[mo].n}));
  },[comparable,driftMoisYear]);

  // ── Axe 4 : dérive moyenne par jalon (où le retard se creuse) ─
  const driftByMilestone=useMemo(()=>{
    const keys=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin prod"],["depart","Départ"]];
    return keys.map(([k,label])=>{
      const deltas=comparable.map(r=>r[k].delta).filter(d=>d!=null);
      const moyenne=deltas.length?Math.round((deltas.reduce((a,b)=>a+b,0)/deltas.length)*10)/10:null;
      return{jalon:label,moyenne,n:deltas.length};
    });
  },[comparable]);

  // ── Axe 5 : tendance — dérive moyenne mois par mois, dans l'ordre chronologique ─
  const driftTrend=useMemo(()=>{
    const order=["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
    return driftByMonth.slice().sort((a,b)=>order.indexOf(a.mois)-order.indexOf(b.mois));
  },[driftByMonth]);

  // ── Explorateur libre : dimension + métrique au choix ─────────
  const [exploreDim,setExploreDim]=useState("gamme");
  const [exploreMetric,setExploreMetric]=useState("count");
  const DIM_GETTERS={
    gamme:r=>r.gamme||"Sans gamme",
    etat:r=>ETAT_META[r.etat]?.label||r.etat,
    pays:r=>getPjMeta(r.pj,r).pays,
    chef:r=>initials(getPjMeta(r.pj,r).chefProjet),
    moisDepart:r=>r.depart?MONTHS[new Date(r.depart).getMonth()]:"—",
  };
  const exploreData=useMemo(()=>{
    const getter=DIM_GETTERS[exploreDim];
    const groups={};
    fd.forEach(r=>{
      const key=getter(r);
      if(!groups[key])groups[key]={key,count:0,driftSum:0,driftN:0,durSum:0,durN:0};
      groups[key].count++;
      const driftRow=driftRows.find(d=>d.pj===r.pj);
      if(driftRow&&driftRow.depart.delta!=null){groups[key].driftSum+=driftRow.depart.delta;groups[key].driftN++;}
      if(r.arrivee&&r.depart){const dur=diffDays(new Date(r.arrivee),new Date(r.depart));groups[key].durSum+=dur;groups[key].durN++;}
    });
    return Object.values(groups).map(g=>({
      key:g.key,
      count:g.count,
      drift:g.driftN?Math.round((g.driftSum/g.driftN)*10)/10:null,
      duree:g.durN?Math.round(g.durSum/g.durN):null,
    })).sort((a,b)=>b.count-a.count);
  },[fd,exploreDim,driftRows]); // eslint-disable-line react-hooks/exhaustive-deps -- DIM_GETTERS ne dépend que de ces valeurs
  const exploreMetricInfo={
    count:{key:"count",label:"Nombre de PJ",fmt:v=>v},
    drift:{key:"drift",label:"Dérive moyenne départ (j)",fmt:v=>v==null?"—":v},
    duree:{key:"duree",label:"Durée moyenne production (j)",fmt:v=>v==null?"—":v},
  };

  // ── Nouveaux KPI : volumétrie, durée moyenne, charge mensuelle ─
  const chargeByMonthMulti=useMemo(()=>{
    const steps=[["arrivee","Arrivée",T.teal500],["tests","Tests",T.amber500],["finProd","Fin prod",T.emerald500],["depart","Départ",T.red500]];
    const m={};
    MONTHS.forEach(mo=>{m[mo]={mois:mo};steps.forEach(([k,l])=>{m[mo][l]=0;});m[mo]["Production"]=0;});
    fd.forEach(r=>{
      steps.forEach(([k,l])=>{if(r[k]){const dt=new Date(r[k]);if(chargeYear&&dt.getFullYear()!==chargeYear)return;const mo=MONTHS[dt.getMonth()];m[mo][l]++;}});
      // Production : la machine est en fabrication ce mois-là si le mois chevauche [arrivée, fin prod]
      if(r.arrivee&&r.finProd){
        const start=new Date(r.arrivee),end=new Date(r.finProd);
        const targetYear=chargeYear||start.getFullYear();
        MONTHS.forEach((mo,mi)=>{
          const monthStart=new Date(targetYear,mi,1),monthEnd=new Date(targetYear,mi+1,1);
          if(start<monthEnd&&end>=monthStart)m[mo]["Production"]++;
        });
      }
    });
    return MONTHS.filter(mo=>Object.values(m[mo]).some(v=>typeof v==="number"&&v>0)).map(mo=>m[mo]);
  },[fd,chargeYear]);

  // ── Charge de travail Atelier / Autom par PJ (heures issues de l'import Excel) ──
  const CAPA_ATELIER_SEM=175; // capacité 500% (5 postes) × 35h/semaine
  const CAPA_AUTOM_SEM=35;    // 1 poste × 35h/semaine
  const workloadByPJ=useMemo(()=>{
    return fd.filter(r=>r.heuresAtelier||r.heuresAutom).map(r=>({
      pj:r.pj,gamme:r.gamme,
      heuresAtelier:r.heuresAtelier||0,
      heuresAutom:r.heuresAutom||0,
    })).sort((a,b)=>b.heuresAtelier-a.heuresAtelier);
  },[fd]);
  const totalHeuresAtelier=workloadByPJ.reduce((a,r)=>a+r.heuresAtelier,0);
  const totalHeuresAutom=workloadByPJ.reduce((a,r)=>a+r.heuresAutom,0);

  // Saturation hebdomadaire : répartit la charge Atelier sur [Arrivée→Fin prod] et Autom sur [Tests→TestsFin], semaine par semaine
  const saturationByWeek=useMemo(()=>{
    const weekly={}; // clé = lundi de la semaine en ISO, valeur = {atelier,autom}
    const addToWeeks=(start,end,totalHeures,type)=>{
      if(!start||!end||!totalHeures)return;
      const s=new Date(start),e=new Date(end);
      const totalMs=Math.max(e-s,86400000); // au moins 1 jour pour éviter division par 0
      let cur=weekStartOf(s);
      while(cur<=e){
        const weekEnd=new Date(cur);weekEnd.setDate(weekEnd.getDate()+7);
        const segStart=Math.max(cur,s),segEnd=Math.min(weekEnd,e);
        const overlapMs=Math.max(0,segEnd-segStart);
        const share=overlapMs/totalMs*totalHeures;
        const key=toLocalISO(cur);
        if(!weekly[key])weekly[key]={atelier:0,autom:0,weekStart:new Date(cur)};
        weekly[key][type]+=share;
        cur=weekEnd;
      }
    };
    // v213 : la charge atelier se répartit sur les jours ouvrés du PJ, hors fermetures et jours sans production
    const addWorkDays=(r,totalHeures)=>{
      const days=workDaysBetween(r.arrivee,r.finProd,closurePeriods,(productionExclusions||{})[r.pj]);if(!days.length||!totalHeures)return;
      days.forEach(k=>{const ws=weekStartOf(new Date(k+"T12:00:00")),key=toLocalISO(ws);if(!weekly[key])weekly[key]={atelier:0,autom:0,weekStart:new Date(ws)};weekly[key].atelier+=totalHeures/days.length;});
    };
    fd.forEach(r=>{
      if(r.arrivee&&r.finProd)addWorkDays(r,r.heuresAtelier);
      if(r.tests&&r.testsFin)addToWeeks(r.tests,r.testsFin,r.heuresAutom,"autom");
    });
    return Object.values(weekly)
      .filter(w=>(!satYear||w.weekStart.getFullYear()===satYear)&&(satMonth==null||w.weekStart.getMonth()===satMonth))
      .sort((a,b)=>a.weekStart-b.weekStart).map(w=>({
      semaine:fmt(w.weekStart),
      semaineMois:fmt(w.weekStart)+" "+MONTHS[w.weekStart.getMonth()],
      mois:MONTHS[w.weekStart.getMonth()],
      atelier:Math.round(w.atelier),
      autom:Math.round(w.autom),
      satAtelier:Math.round((w.atelier/CAPA_ATELIER_SEM)*100),
      satAutom:Math.round((w.autom/CAPA_AUTOM_SEM)*100),
    }));
  },[fd,satYear,satMonth,closurePeriods,productionExclusions]);

  const countByPays=useMemo(()=>{
    const m={};
    fk.forEach(r=>{const p=getPjMeta(r.pj,r).pays;m[p]=(m[p]||0)+1;});
    return Object.entries(m).map(([pays,n])=>({pays,n})).sort((a,b)=>b.n-a.n);
  },[fk]);

  // ── Navigation Manager : onglets horizontaux + sous-onglets par famille ──
  // « Il y a bcp de KPI… plusieurs petits onglets par famille de KPI ? » → un sous-onglet par famille.
  // v196 : une phrase sous le titre de chaque page du Manager
const PAGE_DESC={derives:"Synthèse, semaines à venir, dérives, charge et avancement de l'atelier",orc:"N° de série, chef de projet, pays, état et présence client / NOBO de chaque machine",calendrier:"Jours sans production par PJ et fermetures de l'atelier (aussi réglables depuis le Calendrier)",suivi:"Statut, état et santé des projets",retards:"Déclarer un retard et analyser ses causes",fiche:"Tout un projet sur une page, et le point de la semaine",hebdo:"Ce qui a changé cette semaine",turbines:"Pool de turbines et attributions",cash:"Encaissements et facturation (réservé)",reglages:"Personnes, rôles, accès et nouveautés du site"};
  // v212 (demandé : « regrouper le S/N sous l'onglet ORC avec statuts, état, chefs de projet et pays ; supprimer Suivi ; Point hebdo dans les fiches ;
  // supprimer Imports ; fusionner Accès Manager et Personnes et rôles ») :
  // v217 (demandé : « bien regrouper les pages entre elles si elles ont un rapport ») : Pilotage (KPI, Retards), Projets (Fiches projet,
  // Machines ORC), Réglages (Personnes et accès, Calendrier de production, Nouveautés). Cash in et Turbines sont des pages du site.
  const GROUP_OF={fiche:"fiche",hebdo:"fiche",derives:"derives",serie:"orc",orc:"orc",retards:"retards",retardsKpi:"retards",personnes:"reglages",vacances:"calendrier",production:"calendrier",nouveautes:"reglages"};
  const superAdmin=isSuperAdmin(),owner=canCash(),me=isOwner(); // v224 (demandé : « garder l'accès KPI uniquement pour moi comme Personnes et site ») : me = propriétaire seul → KPI, Personnes et site // v210 : « owner » = accès au Cash in (propriétaire ou admin) // v185 : superAdmin = propriétaire ou admin ; owner = propriétaire (Cash in) // v143 : seul le super admin voit l'onglet « Réglages » (changer le site) ; un admin n'a que les onglets d'usage
  // v158 : menu groupé (rail latéral) ; chaque entrée sait où aller. Cash in et Réglages : super admin seulement.
  const [railMin,setRailMin]=useRailCollapsed(),[palOpen,setPalOpen]=useState(false),phone=useIsPhone();
  // v178 : « fiche plein écran » — menu réduit aux icônes (sous-pages au survol) et liste des projets masquée en fondu.
  const [focusFiche,setFocusFiche]=useState(()=>{try{return localStorage.getItem("enogia_manager_focus")==="1";}catch(e){return false;}});
  useEffect(()=>{try{localStorage.setItem("enogia_manager_focus",focusFiche?"1":"0");}catch(e){}},[focusFiche]);
  const SUBS={
    derives:[["synthese","Synthèse"],["bilan","Bilan mensuel"],["semaines","Semaines"],["derives","Dérives"],["charge","Charge"],["avancement","Avancement"],["explorer","Explorer"]],
    fiche:[["fiche","Fiches projet"],["hebdo","Point hebdo"]],
    retards:[["retards","Déclarer"],["retardsKpi","Analyse"]],
    calendrier:[["production","Jours sans production"],["vacances","Fermetures de l'atelier"]],
    reglages:[["personnes","Personnes, rôles et accès"],["nouveautes","Nouveautés"]],
  };
  const group=GROUP_OF[tab]||"derives";
  useEffect(()=>{const old={orc:"serie",acces:"personnes",imports:"derives",sante:"fiche",suivi:"serie",statut:"serie",cash:"derives",turbines:"derives"}[tab];if(old){setTab(old);return;}if(!me&&(GROUP_OF[tab]||"derives")==="derives"){setTab("fiche");return;}if((!me&&GROUP_OF[tab]==="reglages")||(!superAdmin&&GROUP_OF[tab]==="calendrier")||(!owner&&GROUP_OF[tab]==="cash"))setTab(me?"derives":"fiche");},[superAdmin,owner,me,tab]); // eslint-disable-line react-hooks/exhaustive-deps -- GROUP_OF est fixe, setTab vient du parent ; v212 : anciens onglets mémorisés → leur nouvelle place // un admin qui arrive sur un onglet Réglages (ancien état mémorisé) est ramené aux KPI
  const subItems=SUBS[group]||null;
  const subValue=group==="derives"?kpiTab:tab;
  const onSub=id=>{if(group==="derives")setKpiTab(id);else setTab(id);};
  const goSub=(top,id)=>()=>{if(top==="derives"){setTab("derives");setKpiTab(id);}else setTab(id);};
  const entry=(id,label,icon,hint,extra)=>{const subs=SUBS[id]?SUBS[id].map(([sid,sl])=>({id:sid,label:sl,go:goSub(id,sid)})):null;return{id,label,icon,hint,subs,go:subs?subs[0].go:()=>setTab(id),...(extra||{})};};
  const navGroups=[
    {label:"Pilotage",entries:[...(me?[entry("derives","KPI","chart","synthèse dérives charge avancement",{lock:true})]:[]),entry("retards","Retards","warning","délais allocation")]},
    {label:"Projets",entries:[entry("fiche","Fiches projet","list","pj commentaires dates point hebdo semaine"),entry("orc","Machines ORC","gauge","n° de série statut état chef pays présence client nobo",{go:()=>setTab("serie")})]},
    ...(superAdmin?[{label:"Réglages",entries:[entry("calendrier","Calendrier de production","calendar","jours sans production fermetures vacances",{lock:true}),...(me?[entry("reglages","Personnes et site","lock","personnes rôles accès nouveautés",{lock:true})]:[])]}]:[]),
  ];
  const activeEntry=navGroups.flatMap(g=>g.entries).find(e=>e.id===group)||navGroups[0].entries[0];
  // v196 : publie les entrées du Manager vers le menu du site (une seule barre de navigation) ; retirées en quittant le Manager.
  const navKey=activeEntry.id+"|"+navGroups.map(g=>g.label+":"+g.entries.map(e=>e.id).join(",")).join(";");
  useEffect(()=>{if(onNav&&!phone)onNav({groups:navGroups,activeId:activeEntry.id});},[navKey,phone]); // eslint-disable-line
  useEffect(()=>()=>{if(onNav)onNav(null);},[]); // eslint-disable-line
  const palettePjs=useMemo(()=>(data||[]).filter(r=>r&&r.pj).map(r=>({pj:r.pj,etat:r.etat,nomProjet:getPjMeta(r.pj,r).nomProjet||""})),[data]);
  useEffect(()=>{const f=e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&String(e.key).toLowerCase()==="k"){e.preventDefault();setPalOpen(o=>!o);}};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f);},[]);
  const showFilters=tab==="derives"||tab==="statut";
  const [filtersOpen,setFiltersOpen]=useState(false);
  const nFilters=(fEtat.size<ALL_ETATS.length?1:0)+(fGamme.size<ALL_GAMMES.length?1:0);
  const hasInitial=initialData.length>0;
  const [pendingAdd,setPendingAdd]=useState(null); // lignes du fichier en cours d'examen pour l'ajout à l'initial
  useEffect(()=>{if(initialAddFromImport&&initialAddFromImport.rows)setPendingAdd(initialAddFromImport.rows);},[initialAddFromImport]); // v217 : depuis l'alerte « PJ absents de l'initial » après un import

  return(<div style={{display:"flex",flexDirection:phone?"column":"row",alignItems:phone?"stretch":"flex-start",gap:phone?10:16,fontFamily:T.font}}>
    {phone&&<ManagerRail groups={navGroups} activeId={activeEntry.id} activeSub={subValue} onGo={f=>f()} collapsed={railMin||focusFiche} setCollapsed={v=>{if(focusFiche&&!v)setFocusFiche(false);setRailMin(v);}} phone={phone}/>}
    {palOpen&&<ManagerPalette groups={navGroups} data={palettePjs} activeKey={activeEntry.id+":"+(activeEntry.subs?subValue:"")} onGo={f=>f()} onOpenPj={pj=>{setFichePj({pj,n:Date.now()});setTab("fiche");}} onClose={()=>setPalOpen(false)}/>}
    <div className="enogia-mgr-main" style={{flex:1,minWidth:0,width:"100%",display:"flex",flexDirection:"column",gap:12,"--mgr-th":T.surface,"--mgr-ink":T.ink500,"--mgr-line":T.line}}>
    {/* ── v196 (maquette validée) : en-tête commun à toutes les sous-pages — titre, une phrase, actions à droite ; sous-pages en onglets ;
         filtres repliés dans un bouton (nombre de filtres actifs). « Planning initial » est passé dans Réglages › Imports. ── */}
    <header className="enogia-mgr-head" style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:10,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 260px",minWidth:0}}>
          <h1 style={{margin:0,fontFamily:T.fontDisplay,fontSize:"clamp(24px,2.4vw,30px)",fontWeight:600,letterSpacing:"-.01em",color:T.ink900,lineHeight:1.15}}>{activeEntry.label}</h1>
          <div style={{fontSize:FZ.sm,color:T.ink500,marginTop:2}}>{PAGE_DESC[activeEntry.id]||""}</div>
        </div>
        {!phone&&tab==="fiche"&&<button type="button" className="enogia-btn-ind" onClick={()=>setFocusFiche(v=>!v)} aria-pressed={focusFiche} title={focusFiche?"Réafficher le menu complet et la liste des projets":"Replier le menu et la liste pour laisser toute la place à la fiche"}
        style={{display:"inline-flex",alignItems:"center",gap:6,height:30,padding:"0 10px",borderRadius:8,border:"1.5px solid "+T.teal500,background:focusFiche?(T.mode==="dark"?T.teal600:T.teal500):"transparent",color:focusFiche?(T.mode==="dark"?"#0B1130":"#FFFFFF"):T.teal600,fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font,whiteSpace:"nowrap"}}><NavIcon name="sidepanel" size={15}/>{focusFiche?"Afficher les colonnes":"Fiche plein écran"}</button>}
        {showFilters&&<button type="button" onClick={()=>setFiltersOpen(v=>!v)} aria-expanded={filtersOpen} style={{display:"inline-flex",alignItems:"center",gap:6,height:32,padding:"0 12px",borderRadius:8,border:"1px solid "+(nFilters?T.teal500:T.line),background:nFilters?T.teal100:T.card,color:nFilters?T.teal600:T.ink700,fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}><NavIcon name="layers" size={14}/>Filtres{nFilters?" · "+nFilters:""}</button>}
        <button type="button" onClick={()=>setPalOpen(true)} aria-label="Aller à… (Ctrl K)" style={{display:"inline-flex",alignItems:"center",gap:8,height:32,padding:"0 12px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink500,fontSize:FZ.xs,fontWeight:600,cursor:"pointer",fontFamily:T.font}}><NavIcon name="search" size={14}/>Aller à…<kbd style={{fontFamily:T.fontMono,fontSize:11,color:T.ink500,border:"1px solid "+T.line,borderRadius:4,padding:"0 4px"}}>Ctrl K</kbd></button>
      </div>
      {subItems&&<div role="tablist" aria-label={"Sous-pages : "+activeEntry.label} style={{display:"flex",gap:2,borderBottom:"1px solid "+T.line,overflowX:"auto"}}>
        {subItems.map(([id,l])=>{const on=subValue===id;return(
          <button key={id} type="button" role="tab" aria-selected={on} onClick={()=>onSub(id)} style={{border:"none",background:"transparent",borderBottom:"3px solid "+(on?T.ink900:"transparent"),marginBottom:-1,padding:"8px 14px",minHeight:36,fontSize:FZ.sm,fontWeight:on?700:600,color:on?T.ink900:T.ink500,cursor:"pointer",fontFamily:T.font,whiteSpace:"nowrap"}}>{l}</button>);})}
      </div>}
      {showFilters&&filtersOpen&&<div className="enogia-view-in" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",padding:"8px 10px",background:T.surface,border:"1px solid "+T.line,borderRadius:10}}>
        <DropFilter label="Statut" options={ALL_ETATS} selected={fEtat} onChange={setFEtat} getLabel={o=>ETAT_META[o]?.label||o}/>
        <EtatInfoButton/>
        <DropFilter label="Gamme" options={ALL_GAMMES} selected={fGamme} onChange={setFGamme}/>
        <button onClick={()=>{setFEtat(new Set(ALL_ETATS));setFGamme(new Set(ALL_GAMMES));}} title="Réinitialiser les filtres" style={{background:"none",border:"none",padding:"0 4px",minHeight:24,fontSize:FZ.xs,color:T.ink300,cursor:"pointer",textDecoration:"underline",fontFamily:T.font}}>Effacer</button>
        <span style={{fontSize:FZ.xs,color:T.ink500,fontWeight:500}}>{fk.length} unités</span>
      </div>}
    </header>

    <div key={tab+(tab==="derives"?"/"+kpiTab:"")} className="enogia-view-in" style={{minWidth:0}}>
    {/* v279 (skill kpi-dashboard-design, demandé : « tous les sous-onglets KPI, avec des objectifs chiffrés ») : chaque sous-onglet dit
        la question à laquelle il répond, sa période, sa méthode, et met ses chiffres face aux objectifs (réglables : « Objectifs ») */}
    {/* v281 (maquette « Refonte KPI » validée) : chaque sous-onglet commence par son récit — réponse, preuve (objectifs, graphique), à faire ;
        le contenu détaillé d'avant reste dessous comme « détail » */}
    {me&&tab==="derives"&&<KpiStory tab={kpiTab} rows={fk} driftRows={driftRows} targets={kpiTg} metrics={{...kpiM,charge:w4h}} saveTargets={saveProfiles?(o=>saveProfiles({...(profiles||{}),kpiTargets:o})):null} sel={kpiSel} periodLabel={perLab} scopeLabel={codirScope==="all"?"toutes les machines":codirScope==="shipped"?"machines expédiées":"machines en cours"}
      weeks6={kpiWeeks(6)} weeks8={kpiWeeks(8)} weeks12={kpiWeeks(12)} notes={(profiles&&profiles.monthNotes)||{}} stepSummary={stepSummary} comparable={comparable} kpiStep={kpiStep} stepLabels={STEP_LABELS} progress={progress||{}} onOpenPj={pj=>{setFichePj({pj,n:Date.now()});setTab("fiche");}}/>}
    {me&&tab==="derives"&&kpiTab!=="synthese"&&<div style={{fontSize:12,fontWeight:700,color:T.ink500,margin:"4px 0 8px",display:"flex",alignItems:"center",gap:8}}>Détail<span style={{flex:1,height:1,background:T.line}}/></div>}
    {/* v281 : l'ancien tableau de pilotage (KpiPilotage) est remplacé par le récit de la Synthèse ci-dessus */}

    {/* v274 : bilan mensuel — réalisé des deux derniers mois, objectifs du mois en cours et du suivant */}
    {me&&tab==="derives"&&kpiTab==="bilan"&&<KpiBilan rows={fk} initialByPJ={initialByPJ} profiles={profiles} saveProfiles={saveProfiles} onOpenPj={pj=>{setFichePj({pj,n:Date.now()});setTab("fiche");}}/>}
    {/* v246 (maquette C de Claude Design) : les 8 prochaines semaines — charge, départs, banc, à décider */}
    {me&&tab==="derives"&&kpiTab==="semaines"&&<KpiSemaines rows={fk} driftRows={driftRows} closurePeriods={closurePeriods} productionExclusions={productionExclusions} capaWeek={CAPA_ATELIER_SEM} plan={planDoc&&planDoc.plan} hasInitial={hasInitial} onOpenPj={pj=>{setFichePj({pj,n:Date.now()});setTab("fiche");}}/>}

    {/* v219 (demandé : « l'imbrication des KPI est un peu brouillonne ») : répartitions et explorateur sur leur propre sous-page */}
    {me&&tab==="derives"&&kpiTab==="explorer"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,380px),1fr))",gap:12}}>
        {countByPays.length>0&&<div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:4}}>Répartition par pays</div>
          <div style={{fontSize:FZ.sm,color:T.ink300,marginBottom:10}}>Destinations des machines du portefeuille</div>
          <PieBlock data={topSlices(countByPays.map(x=>({name:x.pays,value:x.n})),8)} unit=" PJ"/>
        </div>}

        <div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900}}>Explorateur libre</div>
              <div style={{fontSize:FZ.sm,color:T.ink300}}>Choisissez ce que vous voulez analyser</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <div style={{width:170}}><Select compact value={exploreDim} onChange={e=>setExploreDim(e.target.value)} options={[{value:"gamme",label:"Par gamme"},{value:"etat",label:"Par état"},{value:"pays",label:"Par pays"},{value:"chef",label:"Par chef de projet"},{value:"moisDepart",label:"Par mois de départ"}]}/></div>
              <div style={{width:200}}><Select compact value={exploreMetric} onChange={e=>setExploreMetric(e.target.value)} options={[{value:"count",label:"Nombre de PJ"},{value:"drift",label:"Dérive moyenne départ"},{value:"duree",label:"Durée moyenne production"}]}/></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(180,exploreData.length*34)}>
            <BarChart data={exploreData} layout="vertical" margin={{left:10,right:20}}>
              <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
              <XAxis type="number" tick={{fontSize:FZ.xs,fill:T.ink500}}/>
              <YAxis type="category" dataKey="key" width={100} tick={{fontSize:FZ.sm,fill:T.ink700,fontWeight:600}}/>
              <Tooltip formatter={(v,n,p)=>[v,exploreMetricInfo[exploreMetric].label]} contentStyle={{fontFamily:T.font,fontSize:FZ.sm,borderRadius:8}}/>
              <Bar dataKey={exploreMetric} radius={[0,2,2,0]} fill={T.violet500}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

      <div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:10}}>Départs par mois</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:84}}>
          {byMonth.map((n,i)=>{const iC=i===today.getMonth();return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{fontSize:FZ.sm,color:T.ink500,fontWeight:600}}>{n||""}</div>
            <div style={{width:"100%",height:n?(n/maxBar*60)+"px":"0",minHeight:n?4:0,background:i<today.getMonth()?T.ink100:iC?T.teal500:T.teal400,borderRadius:"3px 3px 0 0"}}/>
            <div style={{fontSize:FZ.sm,color:iC?T.teal600:T.ink300,fontWeight:iC?700:500}}>{MONTHS[i]}</div>
          </div>);})}
        </div>
      </div>
      <div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:10}}>Par gamme</div>
        <PieBlock data={topSlices(Object.entries(gammeCounts).map(([g,n])=>({name:g,value:n,color:GAMME_COLORS[g]})),8)} unit=" PJ"/>
      </div>
      </div>
    </div>}

    {me&&tab==="derives"&&kpiTab==="charge"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <PlanLoadCard weeks={planWeeks(planDoc&&planDoc.plan,closurePeriods,productionExclusions,12,weekStartOf(today))}/>
        {fd.length>0&&<div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line,gridColumn:"1 / -1"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:4}}>Charge prévisionnelle par étape et par mois</div>
              <div style={{fontSize:FZ.sm,color:T.ink300,marginBottom:10}}>Nombre de machines à chaque étape chaque mois — Production = machines en fabrication ce mois-là</div>
            </div>
            <PeriodFilter yearsAvailable={yearsInData} year={chargeYear} setYear={setChargeYear} showMonth={false}/>
          </div>
          {chargeByMonthMulti.length>0?<ResponsiveContainer width="100%" height={260}>
            <BarChart data={chargeByMonthMulti}>
              <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
              <XAxis dataKey="mois" tick={{fontSize:FZ.xs,fill:T.ink700,fontWeight:600}}/>
              <YAxis allowDecimals={false} tick={{fontSize:FZ.xs,fill:T.ink500}}/>
              <Tooltip contentStyle={{fontFamily:T.font,fontSize:FZ.sm,borderRadius:8}}/>
              <Legend wrapperStyle={{fontSize:FZ.sm}}/>
              <Bar dataKey="Arrivée" fill={stageSoft().arrivee.solid} radius={[2,2,0,0]}/>
              <Bar dataKey="Production" fill={stageSoft().production.solid} radius={[2,2,0,0]}/>
              <Bar dataKey="Tests" fill={stageSoft().tests.solid} radius={[2,2,0,0]}/>
              <Bar dataKey="Fin prod" fill={stageSoft().finProd.solid} radius={[2,2,0,0]}/>
              <Bar dataKey="Départ" fill={stageSoft().depart.solid} radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:FZ.sm}}>Aucune donnée pour cette période</div>}
        </div>}

        {workloadByPJ.length>0&&<div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line,gridColumn:"1 / -1"}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><NavIcon name="gauge" size={17}/>Charge de travail Atelier / Autom</div>
          <div style={{fontSize:FZ.sm,color:T.ink300,marginBottom:14}}>Heures de travail par PJ, issues du planning</div>

          <KpiRow items={[[totalHeuresAtelier+" h","Heures atelier",null,"total du portefeuille filtré"],[totalHeuresAutom+" h","Heures autom",null,"total du portefeuille filtré"],[workloadByPJ.length,"PJ avec charge connue",null,"heures issues de l'import"]]} min={150}/>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,380px),1fr))",gap:16}}>
            <div style={{background:T.surface,borderRadius:12,padding:12,overflow:"auto",maxHeight:380}}>
              <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,marginBottom:8}}>Détail par PJ</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:FZ.sm}}>
                <thead><tr style={{borderBottom:"1px solid "+T.line,position:"sticky",top:0,background:T.surface}}>
                  {["N° PJ","Gamme","Atelier","Autom"].map(h=><th key={h} style={{fontFamily:T.font,fontSize:12,fontWeight:500,color:T.ink500,padding:"6px 8px",textAlign:h==="N° PJ"||h==="Gamme"?"left":"right"}}>{h}</th>)}
                </tr></thead>
                <tbody>{workloadByPJ.map(r=>(
                  <tr key={r.pj} style={{borderBottom:"1px solid "+T.surfaceAlt}}>
                    <td style={{padding:"8px 8px",fontWeight:700,color:T.teal600}}>{r.pj} <SerieTag pj={r.pj}/></td>
                    <td style={{padding:"8px 8px",color:T.ink500}}>{r.gamme}</td>
                    <td style={{padding:"8px 8px",textAlign:"right",fontWeight:600,color:T.ink900,fontVariantNumeric:"tabular-nums"}}>{r.heuresAtelier} h</td>
                    <td style={{padding:"8px 8px",textAlign:"right",fontWeight:600,color:T.ink700,fontVariantNumeric:"tabular-nums"}}>{r.heuresAutom} h</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            {workloadByPJ.length>0&&<>
              <div style={{background:T.surface,borderRadius:12,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,marginBottom:4}}>Taux de saturation hebdomadaire</div>
                    <div style={{fontSize:FZ.xs,color:T.ink300,marginBottom:8}}>Atelier (capacité {CAPA_ATELIER_SEM}h/sem.) vs Autom (capacité {CAPA_AUTOM_SEM}h/sem.)</div>
                  </div>
                  <PeriodFilter yearsAvailable={yearsInData} year={satYear} setYear={setSatYear} month={satMonth} setMonth={setSatMonth}/>
                </div>
                {saturationByWeek.length>0?<ResponsiveContainer width="100%" height={220}>
                  <LineChart data={saturationByWeek}>
                    <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
                    <XAxis dataKey="semaineMois" tick={{fontSize:FZ.xs,fill:T.ink500}} angle={-35} textAnchor="end" height={55}/>
                    <YAxis tick={{fontSize:FZ.xs,fill:T.ink500}} tickFormatter={v=>v+"%"}/>
                    <Tooltip formatter={(v,n)=>[v+"%",n]} contentStyle={{fontFamily:T.font,fontSize:FZ.sm,borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:FZ.sm}}/>
                    <Line type="linear" dataKey="satAtelier" name="Atelier" stroke={stageSoft().production.solid} strokeWidth={2} dot={false}/>
                    <Line type="linear" dataKey="satAutom" name="Autom" stroke={T.amber600} strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:FZ.sm}}>Aucune donnée pour cette période</div>}
              </div>

              <div style={{background:T.surface,borderRadius:12,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,marginBottom:4}}>Heures de travail hebdomadaires</div>
                    <div style={{fontSize:FZ.xs,color:T.ink300,marginBottom:8}}>Volume brut d'heures Atelier et Autom, semaine par semaine</div>
                  </div>
                  <PeriodFilter yearsAvailable={yearsInData} year={satYear} setYear={setSatYear} month={satMonth} setMonth={setSatMonth}/>
                </div>
                {saturationByWeek.length>0?<ResponsiveContainer width="100%" height={220}>
                  <LineChart data={saturationByWeek}>
                    <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
                    <XAxis dataKey="semaineMois" tick={{fontSize:FZ.xs,fill:T.ink500}} angle={-35} textAnchor="end" height={55}/>
                    <YAxis tick={{fontSize:FZ.xs,fill:T.ink500}} tickFormatter={v=>v+"h"}/>
                    <Tooltip formatter={(v,n)=>[v+"h",n]} contentStyle={{fontFamily:T.font,fontSize:FZ.sm,borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:FZ.sm}}/>
                    <Line type="linear" dataKey="atelier" name="Atelier" stroke={stageSoft().production.solid} strokeWidth={2} dot={false}/>
                    <Line type="linear" dataKey="autom" name="Autom" stroke={T.amber600} strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:FZ.sm}}>Aucune donnée pour cette période</div>}
              </div>
            </>}
          </div>
        </div>}
      {fd.length===0&&<EmptyNote>Aucune donnée pour la sélection.</EmptyNote>}
    </div>}

    {pendingAdd&&<InitialAddReview parsed={pendingAdd} initialData={initialData} busy={initialImporting} onCancel={()=>setPendingAdd(null)} onConfirm={async(rows,fixRows)=>{await onInitialAdd(rows,fixRows);setPendingAdd(null);}}/>}

    {me&&tab==="derives"&&kpiTab==="derives"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* v246 (maquette B de Claude Design) : la réponse en titre, classement des dérives, départs du mois */}
      <KpiDerivesHead rows={fk} driftRows={driftRows} delays={delays} hasInitial={hasInitial} onOpenPj={pj=>{setFichePj({pj,n:Date.now()});setTab("fiche");}}/>
      {!hasInitial&&<div style={{background:T.amber100,color:T.amber600,borderRadius:12,padding:"16px 16px",fontSize:FZ.sm,display:"flex",alignItems:"center",gap:8}}><NavIcon name="warning" size={16}/>Aucun planning initial — les dérives ne peuvent pas être calculées. Après une publication du Planificateur, ancrez les PJ dans l'initial avec le bandeau proposé.</div>}
      {initialData.length>0&&<>
          <KpiRow items={[[avgDelay==null?"—":(avgDelay>0?"+":"")+avgDelay+"j","Retard moyen départ",avgDelay>0?T.red500:T.emerald500],[lateCount,"PJ en retard",T.red500],[onTimeOrEarlyCount,"PJ à l'heure / en avance",T.emerald500],[onTimeRate==null?"—":onTimeRate+"%","Taux de respect délais",onTimeRate>=70?T.emerald500:onTimeRate>=40?T.amber500:T.red500],[comparable.length,"PJ comparables",T.ink500]]}/>

        <div style={{background:T.card,borderRadius:16,padding:"16px 20px",border:"1px solid "+T.line}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:2}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,display:"flex",alignItems:"center",gap:8}}><NavIcon name="chart" size={19}/>Vue CODIR — Promesse vs Réalité</div>
              <div style={{fontSize:FZ.sm,color:T.ink500}}>Impact cumulé de l'écart entre le planning initial et le planning révisé</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,background:T.surface,borderRadius:12,padding:"6px 8px"}}>
              <span style={{fontSize:FZ.sm,color:T.ink500,fontWeight:600}}>Étape analysée :</span>
              <div role="group" aria-label="Étape analysée" style={{display:"flex",gap:4}}>
                {Object.entries(STEP_LABELS).map(([k,l])=><button key={k} onClick={()=>setKpiStep(k)} aria-pressed={kpiStep===k} style={{padding:"6px 12px",borderRadius:8,border:"none",background:kpiStep===k?T.teal500:T.card,color:kpiStep===k?"#fff":T.ink700,fontSize:FZ.sm,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
              </div>
            </div>
          </div>
          <div role="group" aria-label="Machines prises en compte" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",margin:"8px 0 10px"}}>
            <span style={{fontSize:12,color:T.ink500,fontWeight:600}}>Machines :</span>
            <div style={{display:"inline-flex",background:T.surfaceAlt,borderRadius:9,padding:2,gap:2}}>
              {[["all","Toutes"],["open","En cours"],["shipped","Expédiées"]].map(([k,l])=><button key={k} type="button" aria-pressed={codirScope===k} onClick={()=>setCodirScope(k)} style={{border:"none",borderRadius:7,minHeight:28,padding:"0 12px",fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:T.font,background:codirScope===k?T.card:"transparent",color:codirScope===k?T.ink900:T.ink500,boxShadow:codirScope===k?"0 1px 2px rgba(0,0,0,.08)":"none"}}>{l}</button>)}
            </div>
            <span style={{fontSize:12,color:T.ink500,fontWeight:600,marginLeft:8}}>Mois promis :</span>
            {/* v280 (signalé : « mois passé = 6/22 arrivées tenues alors que je n’en avais pas 22 de prévues ») : « Mois passés » prenait tous les mois jusqu’au mois dernier ; remplacé par des raccourcis d’un mois ou de quelques mois fermés */}{[["Mois dernier",mKey(new Date(today.getFullYear(),today.getMonth()-1,1)),mKey(new Date(today.getFullYear(),today.getMonth()-1,1))],["Mois en cours",mKey(today),mKey(today)],["3 derniers mois",mKey(new Date(today.getFullYear(),today.getMonth()-3,1)),mKey(new Date(today.getFullYear(),today.getMonth()-1,1))],["Année "+today.getFullYear(),today.getFullYear()+"-01",today.getFullYear()+"-12"],["Tout","",""]].map(([l,a,b])=>{const on=codirFrom===a&&codirTo===b;return <button key={l} type="button" aria-pressed={on} onClick={()=>{setCodirFrom(a);setCodirTo(b);}} style={{border:"1px solid "+(on?T.ink900:T.line),borderRadius:7,minHeight:28,padding:"0 10px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:T.font,background:on?T.ink900:T.card,color:on?T.card:T.ink700}}>{l}</button>;})}
            <label style={{fontSize:12,color:T.ink500,display:"inline-flex",alignItems:"center",gap:4}}>du<select value={codirFrom} onChange={e=>setCodirFrom(e.target.value)} style={{minHeight:28,borderRadius:7,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontSize:12,fontFamily:T.font}}><option value="">début</option>{codirMonths.map(k=><option key={k} value={k}>{mLab(k)}</option>)}</select></label>
            <label style={{fontSize:12,color:T.ink500,display:"inline-flex",alignItems:"center",gap:4}}>au<select value={codirTo} onChange={e=>setCodirTo(e.target.value)} style={{minHeight:28,borderRadius:7,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontSize:12,fontFamily:T.font}}><option value="">fin</option>{codirMonths.map(k=><option key={k} value={k}>{mLab(k)}</option>)}</select></label>
            <span style={{fontSize:12,color:T.ink500}}>{comparable.length} machine{comparable.length>1?"s":""} ({STEP_LABELS[kpiStep].toLowerCase()} promis{codirFrom||codirTo?" "+(codirFrom?"de "+mLab(codirFrom):"")+(codirTo?" à "+mLab(codirTo):""):""}) · s'applique à toute la vue CODIR</span>
          </div>
          {/* Résumé compact, prêt à capturer : une ligne par étape */}
          <div aria-label="PJ tenus à date par étape" style={{maxWidth:980,border:"1px solid "+T.line,borderRadius:10,overflow:"hidden",marginBottom:12,background:T.card}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,padding:"8px 12px",borderBottom:"1px solid "+T.line}}><b style={{fontSize:13.5,color:T.ink900}}>PJ tenus à date, par étape</b><span style={{fontSize:12,color:T.ink500}}>écart au planning initial ≤ 0 · {codirScope==="all"?"toutes les machines":codirScope==="shipped"?"machines expédiées":"machines en cours"}{codirFrom||codirTo?" · jalons promis "+(codirFrom?"de "+mLab(codirFrom)+" ":"")+(codirTo?"à "+mLab(codirTo):""):""} · {new Date().toLocaleDateString("fr-FR")}</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))"}}>
              {stepSummary.map((x,i)=><div key={x.k} style={{padding:"8px 12px",borderLeft:i?"1px solid "+T.line:"none"}}>
                <div style={{fontSize:12,fontWeight:600,color:T.ink500}}>{x.l}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:6}}><b style={{fontSize:22,fontVariantNumeric:"tabular-nums",color:x.pct==null?T.ink300:x.pct>=kpiTg.tenus?T.emerald600:x.pct>=kpiTg.tenus-20?T.amber600:T.red600}}>{x.pct==null?"—":x.pct+" %"}</b><span style={{fontSize:12.5,color:T.ink700,fontVariantNumeric:"tabular-nums"}}>{x.ok} / {x.n} tenus · objectif ≥ {kpiTg.tenus} %</span></div>
                <div aria-hidden="true" style={{height:5,borderRadius:3,background:T.red100,overflow:"hidden",margin:"4px 0"}}><div style={{height:"100%",width:(x.pct||0)+"%",background:T.emerald500}}/></div>
                <div style={{fontSize:12,color:T.ink500,fontVariantNumeric:"tabular-nums"}}>{x.late?x.late+" en retard · moy. +"+x.avg+" j"+(x.crit?" · "+x.crit+" > 30 j":""):"aucun retard"}</div>
                {x.worst.length>0&&<div style={{fontSize:11.5,color:T.red600,fontFamily:T.fontMono,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.worst.join(" · ")}</div>}
              </div>)}
            </div>
          </div>
          <KpiRow items={[[totalDelayDays+"j","Retard cumulé généré ("+STEP_LABELS[kpiStep]+")",T.red500],[totalGainDays+"j","Avance cumulée gagnée",T.emerald500],[reliabilityRate==null?"—":reliabilityRate+"%","PJ exactement à la date promise (écart 0)",T.teal500],[dureeCompare.ecart==null?"—":(dureeCompare.ecart>0?"+":"")+dureeCompare.ecart+"j","Écart durée moy. production",dureeCompare.ecart>0?T.red500:T.emerald500]]} min={170}/>

          {promiseVsReality.length>0&&<div style={{background:T.surface,borderRadius:12,padding:12,marginBottom:14}}>
            <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,marginBottom:8}}>{STEP_LABELS[kpiStep]} promis (initial) vs maintenus dans le mois (révisé)</div>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={promiseVsReality}>
                <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
                <XAxis dataKey="mois" tick={{fontSize:FZ.xs,fill:T.ink700,fontWeight:600}}/>
                <YAxis allowDecimals={false} tick={{fontSize:FZ.xs,fill:T.ink500}}/>
                <Tooltip contentStyle={{fontFamily:T.font,fontSize:FZ.sm,borderRadius:8}}/>
                <Legend wrapperStyle={{fontSize:FZ.sm}}/>
                <Line type="linear" dataKey="promis" name="Promis (initial)" stroke={T.ink300} strokeWidth={2} strokeDasharray="5 4" dot={false}/>
                <Line type="linear" dataKey="realise" name="Maintenu dans le mois" stroke={T.teal500} strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>}

          {pjCompareChart.length>0&&<div style={{background:T.surface,borderRadius:12,padding:12,marginBottom:12,maxHeight:460,overflowY:"auto"}}>
            <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,marginBottom:4}}>Date de {STEP_LABELS[kpiStep].toLowerCase()} par PJ — Initial vs Révisé</div>
            <div style={{fontSize:FZ.xs,color:T.ink300,marginBottom:12}}>Chaque ligne relie la date promise à la date réelle — la longueur et la couleur indiquent l'ampleur du glissement</div>
            {(()=>{
              const rowHd=20,labelW=78,leftPad=20,rightPad=20,topPad=24,bottomPad=4; // v275 : 34 → 20 px par PJ (cadran trop haut)
              const minD=Math.min(...pjCompareChart.map(p=>Math.min(p.initial,p.revise)));
              const maxD=Math.max(...pjCompareChart.map(p=>Math.max(p.initial,p.revise)));
              const pad=Math.max((maxD-minD)*0.08,3);
              const domainMin=minD-pad,domainMax=maxD+pad;
              const span=Math.max(domainMax-domainMin,1);
              const chartW=720;
              const plotW=chartW-labelW-leftPad-rightPad;
              const chartH=pjCompareChart.length*rowHd+topPad+bottomPad;
              const xOf=v=>labelW+leftPad+((v-domainMin)/span)*plotW;
              // graduations : un repère par début de mois dans la plage couverte
              const monthTicks=[];
              const dStart=new Date(yearStart);dStart.setDate(dStart.getDate()+Math.floor(domainMin));
              let curM=new Date(dStart.getFullYear(),dStart.getMonth(),1);
              const dEnd=new Date(yearStart);dEnd.setDate(dEnd.getDate()+Math.ceil(domainMax));
              while(curM<=dEnd){monthTicks.push(new Date(curM));curM=new Date(curM.getFullYear(),curM.getMonth()+1,1);}
              return(<div style={{overflowX:"auto"}}>
                <svg role="img" aria-label={"Date initiale et date révisée par PJ ("+STEP_LABELS[kpiStep]+") : "+pjCompareChart.filter(p=>p.delta>0).length+" en retard, "+pjCompareChart.filter(p=>p.delta<0).length+" en avance, sur "+pjCompareChart.length+" PJ"} width="100%" height={chartH} viewBox={"0 0 "+chartW+" "+chartH} preserveAspectRatio="xMinYMin meet" style={{minWidth:600,fontFamily:T.font}}>
                  {/* grille de fond : repères mensuels */}
                  {monthTicks.map((mt,i)=>{const dv=dayOfYear(mt);const x=xOf(dv);if(x<labelW||x>chartW-2)return null;return(
                    <g key={i}>
                      <line x1={x} x2={x} y1={topPad-6} y2={chartH-bottomPad} stroke={T.line} strokeWidth={1} strokeDasharray="3 3"/>
                      <text x={x} y={topPad-12} fontSize={11} fontWeight={700} fill={T.ink300} textAnchor="middle">{MONTHS[mt.getMonth()]}</text>
                    </g>
                  );})}
                  {/* lignes alternées pour la lisibilité */}
                  

                  {pjCompareChart.map((p,i)=>{
                    const y=topPad+i*rowHd+rowHd/2;
                    const x1=xOf(p.initial),x2=xOf(p.revise);
                    const late=p.delta>0;
                    const dotColor=late?T.red500:p.delta<0?T.emerald500:T.ink500;
                    const dIni=new Date(yearStart);dIni.setDate(dIni.getDate()+p.initial);
                    const dRev=new Date(yearStart);dRev.setDate(dRev.getDate()+p.revise);
                    return(<g key={p.pj}>
                      <text x={6} y={y+4} fontSize={11} fontWeight={700} fill={T.teal600}>{p.pj}</text>
                      <line x1={Math.min(x1,x2)} x2={Math.max(x1,x2)} y1={y} y2={y} stroke={dotColor} strokeWidth={2.5} strokeOpacity={0.35}/>
                      <circle cx={x1} cy={y} r={4} fill={T.card} stroke={T.ink300} strokeWidth={2}/>
                      <circle cx={x2} cy={y} r={4.5} fill={dotColor}/>
                      <text x={x2+8} y={y+4} fontSize={10} fontWeight={700} fill={dotColor} textAnchor="start">{p.delta===0?"=":(p.delta>0?"+":"")+p.delta+"j"}</text>
                    </g>);
                  })}
                </svg>
              </div>);
            })()}
            <div style={{display:"flex",gap:16,marginTop:12,paddingTop:12,borderTop:"1px solid "+T.line,flexWrap:"wrap"}}>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:FZ.sm,color:T.ink500}}><span style={{width:11,height:11,borderRadius:"50%",background:T.card,border:"2px solid "+T.ink300,display:"inline-block"}}/>Date initiale</span>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:FZ.sm,color:T.ink500}}><span style={{width:11,height:11,borderRadius:"50%",background:T.red500,display:"inline-block"}}/>Révisée — retard</span>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:FZ.sm,color:T.ink500}}><span style={{width:11,height:11,borderRadius:"50%",background:T.emerald500,display:"inline-block"}}/>Révisée — avance</span>
            </div>
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,380px),1fr))",gap:12,marginBottom:14}}>
            {driftBuckets.length>0&&<div style={{background:T.surface,borderRadius:12,padding:12}}>
              <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,marginBottom:8}}>Répartition par sévérité du retard</div>
              <PieBlock data={driftBuckets.filter(d=>d.n>0).map(d=>({name:d.label,value:d.n,color:d.c}))} unit=" PJ" size={120}/>
              <div style={{fontSize:12,color:T.ink500,marginTop:4}}>{STEP_LABELS[kpiStep]} · {codirScope==="all"?"toutes les machines":codirScope==="shipped"?"machines expédiées":"machines en cours"} ({stepDeltas.length})</div>
            </div>}

            {trajectory.some(t=>t.moyenne!=null)&&<div style={{background:T.surface,borderRadius:12,padding:12}}>
              <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,marginBottom:8}}>Trajectoire de la dérive le long de la chaîne</div>
              <div style={{fontSize:FZ.xs,color:T.ink300,marginBottom:6}}>Le retard s'aggrave-t-il ou se résorbe-t-il entre l'arrivée et le départ ?</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={trajectory}>
                  <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
                  <XAxis dataKey="jalon" tick={{fontSize:FZ.xs,fill:T.ink700,fontWeight:600}}/>
                  <YAxis tick={{fontSize:FZ.xs,fill:T.ink500}}/>
                  <Tooltip contentStyle={{fontFamily:T.font,fontSize:FZ.sm,borderRadius:8}}/>
                  <Line type="linear" dataKey="moyenne" stroke={stageSoft().production.solid} strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>}

            {dureeCompare.rows.length>0&&<div style={{background:T.surface,borderRadius:12,padding:12}}>
              <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,marginBottom:4}}>Durée de production : initial vs révisé</div>
              <div style={{fontSize:FZ.xs,color:T.ink300,marginBottom:8}}>Moyenne sur le portefeuille comparable (Arrivée → Départ)</div>
              <div style={{display:"flex",gap:20,alignItems:"baseline"}}>
                <div><div style={{fontFamily:T.fontDisplay,fontSize:FZ.xl,fontWeight:700,color:T.ink500}}>{dureeCompare.avgIni}j</div><div style={{fontSize:FZ.xs,color:T.ink300}}>Initial</div></div>
                <div style={{fontSize:FZ.lg,color:T.ink300}}>→</div>
                <div><div style={{fontFamily:T.fontDisplay,fontSize:FZ.xl,fontWeight:700,color:dureeCompare.ecart>0?T.red500:T.emerald500}}>{dureeCompare.avgRev}j</div><div style={{fontSize:FZ.xs,color:T.ink300}}>Révisé</div></div>
              </div>
            </div>}
          </div>
        </div>

        <div style={{background:T.card,borderRadius:16,padding:"14px 16px",border:"1px solid "+T.line}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap",marginBottom:8}}><b style={{fontSize:FZ.md,color:T.ink900}}>Jalons par mois</b><span style={{fontSize:12,color:T.ink500}}>12 mois (5 passés, le mois en cours, 6 à venir) · gris : planning initial · couleur : planning actuel</span></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))",gap:12}}>
            {monthsBy.map(g=><div key={g.k} style={{background:T.surface,borderRadius:10,padding:"8px 10px"}}>
              <div style={{fontSize:12.5,fontWeight:700,color:T.ink900,marginBottom:2}}>{g.k==="arrivee"?"Arrivées":g.k==="tests"?"Débuts de tests":g.k==="finProd"?"Fins de production":"Départs"} par mois <span style={{fontWeight:400,color:T.ink500}}>· {g.data.reduce((a,b)=>a+b.revise,0)} au total</span></div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={g.data} barGap={1} margin={{top:6,right:4,left:-26,bottom:0}}>
                  <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
                  <XAxis dataKey="mois" tick={{fontSize:10,fill:T.ink500}} interval={0} tickLine={false}/>
                  <YAxis allowDecimals={false} tick={{fontSize:10,fill:T.ink500}} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={{fontFamily:T.font,fontSize:12,borderRadius:8}} formatter={(v,n)=>[v,n==="initial"?"Planning initial":"Planning actuel"]}/>
                  <Bar dataKey="initial" fill={T.ink300} radius={[2,2,0,0]}/>
                  <Bar dataKey="revise" radius={[2,2,0,0]}>{g.data.map((d,i)=><Cell key={i} fill={d.now?T.amber500:(g.k==="depart"?stageSoft().depart.solid:g.k==="arrivee"?stageSoft().arrivee.solid:g.k==="tests"?stageSoft().tests.solid:stageSoft().finProd.solid)}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>)}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,380px),1fr))",gap:16}}>
          {driftByGamme.length>0&&<div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line}}>
            <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:4}}>Dérive moyenne par gamme</div>
            <div style={{fontSize:FZ.sm,color:T.ink300,marginBottom:10}}>Écart moyen (jours) entre départ initial et révisé, par gamme</div>
            <ResponsiveContainer width="100%" height={Math.max(180,driftByGamme.length*36)}>
              <BarChart data={driftByGamme} layout="vertical" margin={{left:10,right:20}}>
                <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
                <XAxis type="number" tick={{fontSize:FZ.xs,fill:T.ink500}}/>
                <YAxis type="category" dataKey="gamme" width={90} tick={{fontSize:FZ.sm,fill:T.ink700,fontWeight:600}}/>
                <Tooltip formatter={(v,n,p)=>[v+"j (n="+p.payload.n+")","Dérive moyenne"]} contentStyle={{fontFamily:T.font,fontSize:FZ.sm,borderRadius:8}}/>
                <Bar dataKey="moyenne" radius={[0,2,2,0]}>
                  {driftByGamme.map((d,i)=><Cell key={i} fill={d.moyenne>0?T.red500:T.emerald500}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>}

          {driftByMilestone.some(d=>d.moyenne!=null)&&<div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line}}>
            <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:4}}>Dérive moyenne par jalon</div>
            <div style={{fontSize:FZ.sm,color:T.ink300,marginBottom:10}}>Où le retard se creuse le plus dans la chaîne de production</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={driftByMilestone}>
                <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
                <XAxis dataKey="jalon" tick={{fontSize:FZ.sm,fill:T.ink700,fontWeight:600}}/>
                <YAxis tick={{fontSize:FZ.xs,fill:T.ink500}}/>
                <Tooltip formatter={(v,n,p)=>[v+"j (n="+p.payload.n+")","Dérive moyenne"]} contentStyle={{fontFamily:T.font,fontSize:FZ.sm,borderRadius:8}}/>
                <Bar dataKey="moyenne" radius={[2,2,0,0]}>
                  {driftByMilestone.map((d,i)=><Cell key={i} fill={d.moyenne>0?T.amber500:T.emerald500}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>}

          {comparable.length>0&&<div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:4}}>Dérive moyenne par mois de départ</div>
                <div style={{fontSize:FZ.sm,color:T.ink300,marginBottom:10}}>Périodes où les retards sont les plus fréquents — la situation s'améliore-t-elle dans le temps ?</div>
              </div>
              <div style={{width:128}}><Select compact value={driftMoisYear||""} onChange={e=>setDriftMoisYear(e.target.value?+e.target.value:null)} options={[{value:"",label:"Toutes années"},...yearsInData.map(y=>({value:y,label:String(y)}))]}/></div>
            </div>
            {driftTrend.length>0?<ResponsiveContainer width="100%" height={220}>
              <LineChart data={driftTrend}>
                <CartesianGrid vertical={false} stroke={T.line} strokeOpacity={0.7}/>
                <XAxis dataKey="mois" tick={{fontSize:FZ.xs,fill:T.ink700,fontWeight:600}}/>
                <YAxis tick={{fontSize:FZ.xs,fill:T.ink500}}/>
                <Tooltip formatter={(v,n,p)=>[v+"j (n="+p.payload.n+")","Dérive moyenne"]} contentStyle={{fontFamily:T.font,fontSize:FZ.sm,borderRadius:8}}/>
                <Line type="linear" dataKey="moyenne" stroke={stageSoft().production.solid} strokeWidth={2} dot={({cx,cy,payload})=><circle key={payload.mois} cx={cx} cy={cy} r={5} fill={payload.moyenne>0?T.red500:T.emerald500}/>}/>
              </LineChart>
            </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:FZ.sm}}>Aucune donnée pour cette période</div>}
          </div>}

        </div>

        {worstDrifts.length>0&&<div style={{background:T.card,borderRadius:12,padding:12,border:"1px solid "+T.line,maxWidth:520}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:8}}>Top 5 dérives — {STEP_LABELS[kpiStep]} (vs planning initial)</div>
          {worstDrifts.map(r=>{const d=r[kpiStep].delta;const c=d>0?T.red500:d<0?T.emerald500:T.ink500;return(
            <div key={r.pj} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+T.surface}}>
              <span style={{fontWeight:700,color:T.teal600,fontSize:FZ.sm,minWidth:85}}><PjPlate pj={r.pj}/><SerieTag pj={r.pj} style={{marginLeft:7}}/></span>
              <span style={{color:T.ink300,fontSize:FZ.xs,minWidth:50}}>{r.gamme}</span>
              <span style={{fontSize:FZ.sm,color:T.ink500}}>{fmt(r[kpiStep].ini?new Date(r[kpiStep].ini):null)} → {fmt(r[kpiStep].rev?new Date(r[kpiStep].rev):null)}</span>
              <span style={{marginLeft:"auto",fontWeight:800,fontSize:FZ.md,color:c}}>{d>0?"+":""}{d}j</span>
            </div>
          );})}
        </div>}

        <div style={{background:T.card,borderRadius:12,padding:0,border:"1px solid "+T.line,overflow:"auto"}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,padding:"16px 16px 0"}}>Détail par PJ — Initial vs Révisé</div>
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:10,tableLayout:"auto"}}>
            <thead><tr style={{borderBottom:"1px solid "+T.line}}>
              {["N° PJ","Gamme","Arrivée","Δ","Tests","Δ","Fin prod","Δ","Départ","Δ"].map((h,i)=><th key={i} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,color:T.ink500,fontSize:FZ.sm,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".03em"}}>{h}</th>)}
            </tr></thead>
            <tbody>{driftRows.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid "+T.surface,background:r.hasInitial?T.card:T.surface}}>
                <td style={{padding:"8px 12px",fontWeight:700,color:T.teal600,fontSize:FZ.md,whiteSpace:"nowrap"}}>{r.pj} <SerieTag pj={r.pj} size={11}/></td>
                <td style={{padding:"8px 12px",color:T.ink500,fontSize:FZ.md,whiteSpace:"nowrap"}}>{r.gamme}</td>
                {["arrivee","tests","finProd","depart"].map(k=>{const c=r[k];const d=c.delta;const col=d==null?T.ink300:d>0?T.red500:d<0?T.emerald500:T.ink500;return(<React.Fragment key={k}>
                  <td style={{padding:"8px 12px",fontSize:FZ.md,color:T.ink700,whiteSpace:"nowrap"}}>{c.rev?fmt(new Date(c.rev)):"—"}</td>
                  <td style={{padding:"8px 12px",fontSize:FZ.md,fontWeight:700,color:col,whiteSpace:"nowrap",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{d==null?"—":(d>0?"+":"")+d+" j"}</td>
                </React.Fragment>);})}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}
    </div>}

    {me&&tab==="derives"&&kpiTab==="avancement"&&<KpiAvancement rows={fk} progress={progress}/>}
    {tab==="retardsKpi"&&<DelayInsights delays={delays} delayTypes={delayTypes}/>}

    {tab==="sante"&&<SanteTab rows={fk} onSave={(pj,f)=>savePjMetaOverride&&savePjMetaOverride(pj,f)}/>}
    {tab==="statut"&&<StatutTab rows={fd} etatChoice={etatChoice} setEtatFor={setEtatFor} clientPresence={clientPresence} setClientPresenceFor={setClientPresenceFor} customEtats={customEtats||[]} setCustomEtats={superAdmin?setCustomEtats:null} etatEdits={etatEdits||{}} setEtatEdits={superAdmin?setEtatEdits:null} data={data}/>}
    {tab==="hebdo"&&<PointHebdo data={data} savePjMetaOverride={savePjMetaOverride} onOpenPj={pj=>{setFichePj({pj,n:Date.now()});setTab("fiche");}}/>}
    {tab==="fiche"&&<ProjectFileManager profiles={profiles} focus={focusFiche} compCatalog={compCatalog} setCompCatalog={setCompCatalog} managerEmails={managerEmails} currentUserEmail={currentUserEmail} resolveComment={resolveComment} certifs={certifs} setCertifs={setCertifs} openPj={fichePj&&fichePj.pj} openNonce={fichePj&&fichePj.n} lastChange={changeLog&&changeLog[0]} data={data} initialData={initialData} comments={comments} delays={delays} progress={progress} savePjMetaOverride={savePjMetaOverride} savePjMetaMulti={savePjMetaMulti} addCommentMulti={addCommentMulti} addComment={addComment} deleteComment={deleteComment} addDelayAllocationMulti={addDelayAllocationMulti} deleteDelayAllocation={deleteDelayAllocation} delayTypes={delayTypes} setDelayTypes={setDelayTypes} changeLog={changeLog} authorName={authorName} onOpenCash={onOpenCashPage?(pj=>onOpenCashPage(pj)):null}/>}
    {tab==="retards"&&<DelaysTab data={data} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypes} addDelayAllocationMulti={addDelayAllocationMulti} deleteDelayAllocation={deleteDelayAllocation} authorName={authorName}/>}
    {me&&tab==="personnes"&&<>
      <PeopleRoles profiles={profiles} saveProfiles={saveProfiles} data={data}/>
      <div style={{height:14}}/>
      <ManagerAccessManager managerEmails={managerEmails} setManagerEmails={setManagerEmails} currentUserEmail={currentUserEmail}/>
      {/* Nom du build : réservé au propriétaire (demandé : « uniquement visible par moi, dans l'onglet manager »). */}
      {buildVersion&&<div style={{...CARD,padding:"8px 12px",marginTop:14,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk}}>Version du site</span>
        <span style={{fontFamily:"monospace",fontSize:FZ.xs,fontWeight:600,color:T.ink700,background:T.ink100,borderRadius:8,padding:"3px 8px"}}>build {buildVersion}</span>
      </div>}
    </>}
    {me&&tab==="nouveautes"&&<><TutoVideoSettings profiles={profiles} saveProfiles={saveProfiles}/><ReleaseManager isBeta={!!isBeta} selection={releaseSelection} releases={releases||[]} onSaveSelection={saveReleaseSelection} onPublish={publishRelease} authorName={authorName}/></>}
    {/* v212 : l'onglet Imports est supprimé ; le repère « Planning initial » (ancrer de nouveaux PJ dans l'initial, base des dérives) est en tête des KPI › Synthèse */}
    {superAdmin&&tab==="derives"&&kpiTab==="synthese"&&<div style={{marginBottom:0}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"4px 4px 4px 12px",border:"1px solid "+(hasInitial?T.line:T.amber500),borderRadius:12,background:hasInitial?T.card:T.amber100}}>
        <span style={{color:hasInitial?T.teal600:T.amber600,display:"inline-flex"}}><NavIcon name={hasInitial?"pin":"warning"} size={13}/></span>
        <div style={{lineHeight:1.25}}>
          <div style={{fontSize:FZ.xs,fontWeight:700,color:T.ink900}}>Planning initial</div>
          <div style={{fontSize:FZ.xs,color:hasInitial?T.ink500:T.amber600}}>{hasInitial?initialData.length+" unités"+(lastInitialImport?" · "+lastInitialImport:" · figé")+(lastInitialAdd?" · ajout "+lastInitialAdd:""):"absent — dérives indisponibles"}</div>
        </div>
      </div>
      </div>}
    {tab==="serie"&&<SerieTab data={data} savePjMetaOverride={savePjMetaOverride} etatChoice={etatChoice} setEtatFor={setEtatFor} clientPresence={clientPresence} setClientPresenceFor={setClientPresenceFor} customEtats={customEtats||[]} setCustomEtats={superAdmin?setCustomEtats:null} etatEdits={etatEdits||{}} setEtatEdits={superAdmin?setEtatEdits:null}/>}
    {superAdmin&&tab==="vacances"&&<ClosurePeriodsManager closurePeriods={closurePeriods} setClosurePeriods={setClosurePeriods}/>}
    {superAdmin&&tab==="production"&&<ProductionCalendarManager data={data} productionExclusions={productionExclusions} setProductionExclusionDays={setProductionExclusionDays}/>}
    </div>
    </div>
  </div>);
}

// ── Liste des emails autorisés à l'espace Manager : accès automatique sans PIN pour ces comptes ──
function ManagerAccessManager({managerEmails,setManagerEmails,currentUserEmail}){
  const [newEmail,setNewEmail]=useState("");
  const [err,setErr]=useState("");

  const addEmail=()=>{
    const v=newEmail.trim().toLowerCase();
    if(!v)return;
    if(!v.endsWith("@enogia.com")){setErr("L'email doit être une adresse @enogia.com.");return;}
    if(managerEmails.includes(v)){setErr("Cet email est déjà dans la liste.");return;}
    setErr("");
    setManagerEmails([...managerEmails,v]);
    setNewEmail("");
  };
  const removeEmail=email=>{
    setManagerEmails(managerEmails.filter(e=>e!==email));
  };

  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div style={{background:T.card,borderRadius:12,padding:16,border:"1px solid "+T.line}}>
      <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:4}}>Accès automatique à l'espace Manager</div>
      <div style={{fontSize:FZ.sm,color:T.ink500,marginBottom:14,lineHeight:1.5}}>
        Les comptes Google listés ci-dessous entrent directement dans l'espace Manager après connexion, sans avoir besoin du code PIN. Le code PIN reste utilisable en secours pour tout le monde.
      </div>

      {managerEmails.length===0&&<div style={{background:T.amber100,color:T.amber600,borderRadius:8,padding:"8px 12px",fontSize:FZ.sm,marginBottom:14}}>
        Aucun email enregistré pour l'instant — tout le monde doit encore utiliser le code PIN pour accéder au Manager.
      </div>}

      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        {managerEmails.map(email=>(
          <div key={email} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:T.surface,borderRadius:8,padding:"8px 12px"}}>
            <span style={{fontSize:FZ.sm,color:T.ink700,fontWeight:600}}>{email}{email===currentUserEmail&&<span style={{marginLeft:8,fontSize:FZ.xs,color:T.teal600,background:T.teal100,borderRadius:4,padding:"1px 8px",fontWeight:700}}>vous</span>}</span>
            <button onClick={()=>removeEmail(email)} title="Retirer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:FZ.md,padding:0}}><NavIcon name="close" size={11}/></button>
          </div>
        ))}
        {managerEmails.length===0&&<div style={{color:T.ink300,fontSize:FZ.sm,textAlign:"center",padding:"8px 0"}}>Aucun email pour l'instant.</div>}
      </div>

      <div style={{display:"flex",gap:8}}>
        <input type="email" value={newEmail} onChange={e=>{setNewEmail(e.target.value);setErr("");}} onKeyDown={e=>{if(e.key==="Enter")addEmail();}}
          placeholder="prenom.nom@enogia.com" style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:FZ.sm,fontFamily:T.font,color:T.ink700}}/>
        <button onClick={addEmail} disabled={!newEmail.trim()} style={{padding:"8px 16px",borderRadius:8,border:"none",background:newEmail.trim()?T.teal500:T.surfaceAlt,color:newEmail.trim()?"#fff":T.ink300,fontSize:FZ.sm,fontWeight:700,cursor:newEmail.trim()?"pointer":"default",whiteSpace:"nowrap"}}>Ajouter</button>
      </div>
      {err&&<div style={{fontSize:FZ.sm,color:T.red500,marginTop:8}}>{err}</div>}
    </div>
  </div>);
}

export function ClosurePeriodsManager({closurePeriods,setClosurePeriods}){
  const [newStart,setNewStart]=useState("");
  const [newEnd,setNewEnd]=useState("");
  const [newLabel,setNewLabel]=useState("");
  const addPeriod=()=>{
    if(!newStart||!newEnd)return;
    if(newEnd<newStart){notify("La date de fin doit être après la date de début.");return;}
    const next=[...closurePeriods,{start:newStart,end:newEnd,label:newLabel.trim()||"Fermeture"}];
    setClosurePeriods(next);
    setNewStart("");setNewEnd("");setNewLabel("");
  };
  const removePeriod=i=>{
    const next=closurePeriods.filter((_,idx)=>idx!==i);
    setClosurePeriods(next);
  };
  return(<div style={{background:T.card,borderRadius:16,padding:20,border:"1px solid "+T.line,marginTop:16}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><NavIcon name="sun" size={17}/>Périodes de fermeture (vacances)</div>
    <div style={{fontSize:FZ.sm,color:T.ink500,marginBottom:14}}>
      Les semaines/jours concernés seront grisés dans le Calendrier pour tous les utilisateurs.
    </div>
    {closurePeriods.length>0&&<div style={{marginBottom:14}}>
      {closurePeriods.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+T.surface}}>
          <span style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,minWidth:120}}>{p.label}</span>
          <span style={{fontSize:FZ.sm,color:T.ink500}}>{fmt(new Date(p.start))} → {fmt(new Date(p.end))}</span>
          <button onClick={()=>removePeriod(i)} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:8,border:"none",background:T.surface,boxShadow:T.outline,color:T.red500,fontSize:FZ.sm,fontWeight:600,cursor:"pointer"}}><NavIcon name="close" size={11}/> Retirer</button>
        </div>
      ))}
    </div>}
    <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap",paddingTop:10,borderTop:closurePeriods.length>0?"1px solid "+T.line:"none"}}>
      <div>
        <label style={{fontSize:FZ.xs,color:T.ink500,fontWeight:600,display:"block",marginBottom:4}}>Libellé</label>
        <input type="text" value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Ex: Vacances été" style={{padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,width:140}}/>
      </div>
      <div>
        <label style={{fontSize:FZ.xs,color:T.ink500,fontWeight:600,display:"block",marginBottom:4}}>Du</label>
        <input type="date" value={newStart} onChange={e=>setNewStart(e.target.value)} style={{padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font}}/>
      </div>
      <div>
        <label style={{fontSize:FZ.xs,color:T.ink500,fontWeight:600,display:"block",marginBottom:4}}>Au</label>
        <input type="date" value={newEnd} onChange={e=>setNewEnd(e.target.value)} style={{padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font}}/>
      </div>
      <button onClick={addPeriod} disabled={!newStart||!newEnd} style={{padding:"8px 16px",borderRadius:8,border:"none",background:newStart&&newEnd?T.teal500:T.surfaceAlt,color:newStart&&newEnd?"#fff":T.ink300,fontSize:FZ.sm,fontWeight:700,cursor:newStart&&newEnd?"pointer":"default"}}>+ Ajouter</button>
    </div>
  </div>);
}

// v219 : charge atelier des 12 prochaines semaines d'après le planificateur (heures planifiées et capacité de chaque semaine)
function PlanLoadCard({weeks}){
  if(!weeks)return(<div style={{background:T.card,border:"1px solid "+T.line,borderRadius:10,padding:"12px 14px",fontSize:FZ.sm,color:T.ink500}}>La charge d'après le planificateur s'affiche ici dès qu'un plan existe (onglet Planificateur).</div>);
  const H=140,maxH=Math.max(1,...weeks.map(w=>Math.max(w.hours,w.cap)))*1.15;
  const wk=d=>{const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const n=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-n);const y=new Date(Date.UTC(x.getUTCFullYear(),0,1));return Math.ceil(((x-y)/86400000+1)/7);};
  const over=weeks.filter(w=>w.hours>w.cap+0.5).length;
  return(<section aria-label="Charge d'après le planificateur" style={{background:T.card,border:"1px solid "+T.line,borderRadius:10,padding:"12px 14px"}}>
    <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap",marginBottom:10}}><h3 style={{margin:0,fontSize:FZ.md,fontWeight:700,color:T.ink900}}>Charge atelier — 12 semaines</h3><span style={{fontSize:12,color:T.ink500}}>d'après le planificateur · trait = capacité de la semaine</span><span style={{marginLeft:"auto",fontSize:12.5,fontWeight:700,color:over?T.red500:T.emerald600}}>{over?over+" semaine"+(over>1?"s":"")+" en surcharge":"aucune surcharge"}</span></div>
    <div role="img" aria-label={weeks.map(w=>"S"+wk(w.a)+" "+w.hours+" h sur "+Math.round(w.cap)).join(", ")} style={{display:"flex",alignItems:"flex-end",gap:6,height:H,borderBottom:"1px solid "+T.line}}>
      {weeks.map(w=>{const h=Math.round(w.hours/maxH*H),c=Math.round(w.cap/maxH*H),o=w.hours>w.cap+0.5;return(<div key={w.key} title={"S"+wk(w.a)+" : "+w.hours+" h / "+Math.round(w.cap)+" h"} style={{flex:1,position:"relative",height:"100%",minWidth:0}}>
        <div style={{position:"absolute",left:0,right:0,bottom:0,height:Math.max(1,h),background:o?T.red500:stageSoft().production.solid,borderRadius:"2px 2px 0 0"}}/>
        <div style={{position:"absolute",left:-2,right:-2,bottom:c,borderTop:"2px dashed "+T.ink500}}/>
        <div style={{position:"absolute",left:0,right:0,bottom:Math.max(h,c)+4,textAlign:"center",fontSize:11,fontWeight:700,color:o?T.red500:T.ink700,fontVariantNumeric:"tabular-nums"}}>{w.hours}</div>
      </div>);})}
    </div>
    <div style={{display:"flex",gap:6,marginTop:4}}>{weeks.map(w=><span key={w.key} style={{flex:1,textAlign:"center",fontSize:11,color:T.ink500}}>S{wk(w.a)}</span>)}</div>
  </section>);
}
