import React, { useState, useMemo, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { T, FZ, inkOn } from "../theme";
import { SerieTag, getPjMeta, ETAT_META, ASSIGNABLE_ETATS, Avatar, relTime, PRESENCE_META, presenceKind, presenceBg, presenceDates, PjPlate } from "../pjMeta";
import { fmt, toLocalISO } from "../parsers";
import { EtatsDialog } from "./EtatsDialog";
import { Select, NavIcon, PjChecklist, DelayScopeNote, EmptyState, SuperOnly, NewDelayType } from "./SharedUI";

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Briques de la refonte de la page Manager (« un sacré coup de jeune ») : même langage visuel partout
// — cartes à bordure fine, titres sobres, tuiles KPI compactes, saisie au plus près de la donnée.
// ─────────────────────────────────────────────────────────────────────────────────────────────

// Accesseurs (et non valeurs figées) : ces objets sont créés une seule fois à l'import, avant que le
// thème sombre ne soit appliqué — des valeurs fixes resteraient blanches en mode sombre.
export const CARD={get background(){return T.card;},borderRadius:10,get border(){return "1px solid "+T.line;}};
export const H_TITLE={get fontFamily(){return T.fontDisplay;},fontWeight:600,fontSize:FZ.md,get color(){return T.ink900;}};
export const H_SUB={fontSize:FZ.xs,get color(){return T.ink300;},marginTop:2};

// Camembert + légende (remplace les barres de répartition) : data = [{name,value,color}], unit = suffixe de la valeur.
// Le centre affiche le total ; la légende donne valeur et pourcentage de chaque part.
export function PieBlock({data,unit="",size=150,centerLabel,sub}){
  const total=data.reduce((a,d)=>a+d.value,0);
  if(!total)return null;
  return(<div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
    <div role="img" aria-label={data.map(d=>d.name+" : "+d.value+unit).join(", ")} style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={size*.38} outerRadius={size*.5} paddingAngle={data.length>1?2:0} stroke="none">
            {data.map((d,i)=><Cell key={d.name+i} fill={d.color}/>)}
          </Pie>
          <Tooltip content={({active,payload})=>{
            if(!active||!payload||!payload.length)return null;const p=payload[0];
            return(<div style={{background:T.card,border:"1px solid "+T.line,borderRadius:8,padding:"4px 8px",fontSize:FZ.xs,fontFamily:T.font,color:T.ink900,boxShadow:T.shadowSm,display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:p.payload&&p.payload.color,flexShrink:0}}/><span>{p.name}</span><strong>{p.value}{unit}</strong>
            </div>);
          }}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        {centerLabel!=null&&centerLabel!==""&&<span style={{fontFamily:T.fontDisplay,fontSize:size*.19,fontWeight:700,color:T.ink900,lineHeight:1}}>{centerLabel}</span>}
        {centerLabel!=null&&centerLabel!==""&&sub&&size>=120&&<span style={{fontSize:FZ.xs,color:T.ink300,marginTop:2}}>{sub}</span>} {/* petit anneau : le trou ne peut pas porter une ligne de 12 px, le libellé reste dans la légende */}
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:150,flex:1}}>
      {data.map((d,i)=>(<div key={d.name+i} style={{display:"flex",alignItems:"center",gap:8,fontSize:FZ.xs}}>
        <span style={{width:9,height:9,borderRadius:"50%",background:d.color,flexShrink:0}}/>
        <span style={{color:T.ink700,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0}} title={d.name}>{d.name}</span>
        <span style={{marginLeft:"auto",fontWeight:700,color:T.ink900,whiteSpace:"nowrap"}}>{d.value}{unit}<span style={{color:T.ink300,fontWeight:500}}> · {Math.round(d.value/total*100)}%</span></span>
      </div>))}
    </div>
  </div>);
}

// v219 : palette catégorielle des camemberts (validée V192) et découpage « N plus grands + autres »
export const CAT_COLORS=["#4E79A7","#F28E2B","#E15759","#76B7B2","#59A14F","#B07AA1","#EDC948","#FF9DA7","#9C755F"];
export function topSlices(list,n=6,colors){const all=(list||[]).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);const top=all.slice(0,n).map((x,i)=>({...x,color:x.color||(colors||CAT_COLORS)[i%(colors||CAT_COLORS).length]}));const rest=all.slice(n).reduce((a,x)=>a+x.value,0);if(rest>0)top.push({name:"Autres ("+(all.length-n)+")",value:rest,color:T.ink300});return top;}
// Rangée de chiffres KPI : items = [[valeur, libellé, couleur, explication?]]
// v216 (règles de la Synthèse V215, ui-ux-pro-max + taste) : libellé au-dessus en gris, chiffre 28 px en encre ; la couleur ne sert
// que pour dire « mauvais » (rouge) ou « bon » (vert) — les autres couleurs d'accent ne s'affichent plus.
export function KpiRow({items,min=150}){
  return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,"+min+"px),1fr))",gap:8}}>
    {items.map(([v,l,c,sub])=>{const tone=c===T.red500||c===T.red600?T.red500:c===T.emerald500||c===T.emerald600?T.emerald600:T.ink900;return(
      <div key={l} style={{background:T.card,border:"1px solid "+T.line,borderRadius:10,padding:"12px 14px",minWidth:0}}>
        <div style={{fontSize:12.5,color:T.ink500,fontFamily:T.fontLabel}}>{l}</div>
        <div style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:600,color:tone,lineHeight:1.15,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{v}</div>
        {sub&&<div style={{fontSize:12,color:T.ink500,marginTop:4}}>{sub}</div>}
      </div>);})}
  </div>);
}
// v216 : classement en barres horizontales triées, une seule couleur, valeur à droite en chiffres tabulaires
export function RankBars({items,unit="",color,max=10,onPick}){
  const list=(items||[]).slice(0,max),top=Math.max(1,...list.map(x=>x.value));
  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    {list.map(x=>(<div key={x.label} {...(onPick?{role:"button",tabIndex:0,onClick:()=>onPick(x),onKeyDown:e=>{if(e.key==="Enter")onPick(x);}}:{})} style={{display:"grid",gridTemplateColumns:"minmax(90px,30%) minmax(0,1fr) 64px",alignItems:"center",gap:10,minHeight:28,cursor:onPick?"pointer":"default"}}>
      <span title={x.label} style={{fontSize:FZ.sm,color:T.ink900,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.label}</span>
      <span style={{height:10,background:T.surfaceAlt,borderRadius:2,overflow:"hidden"}}><span className="enogia-bar-fill" style={{display:"block",width:(x.value/top*100)+"%",height:"100%",background:color||T.navy600}}/></span>
      <span style={{textAlign:"right",fontSize:FZ.sm,fontWeight:700,color:T.ink900,fontVariantNumeric:"tabular-nums"}}>{x.value}{unit}</span>
    </div>))}
    {(items||[]).length>max&&<div style={{fontSize:12,color:T.ink500}}>+ {(items||[]).length-max} autres</div>}
  </div>);
}

// Petit message vide, réutilisé partout
export function EmptyNote({children,icon}){
  return(<EmptyState compact icon={icon||(/résultat|ne correspond/i.test(String(children))?"search":"inbox")} title={children}/>);
}

// ── SUIVI › STATUT & ÉTAT ──────────────────────────────────────────────────────────────────────
// Tableau dense : une ligne par PJ — l'état se choisit dans une pastille déroulante colorée, la présence
// client / NOBO aux tests est un petit interrupteur ; la date n'apparaît que lorsque la présence est cochée.
const NEW_ETAT="__NEW_ETAT__";
export function EtatSelect({value,onChange,onCreate,compact}){
  const m=ETAT_META[value]||ETAT_META["A_DEFINIR"];
  const options=ASSIGNABLE_ETATS.includes(value)?ASSIGNABLE_ETATS:[value,...ASSIGNABLE_ETATS];
  return(<div style={{position:"relative",display:"inline-block"}}>
    <select value={value} onChange={e=>{if(e.target.value===NEW_ETAT){if(onCreate)onCreate();return;}onChange(e);}} style={{appearance:"none",WebkitAppearance:"none",MozAppearance:"none",padding:compact?"2px 20px 2px 9px":"4px 24px 4px 12px",borderRadius:999,border:"1px solid "+m.border,background:m.bg,color:m.text,fontSize:FZ.xs,fontWeight:700,fontFamily:T.font,cursor:"pointer",minWidth:compact?0:150,maxWidth:"100%"}}>
      {options.map(o=><option key={o} value={o} disabled={o===value&&!ASSIGNABLE_ETATS.includes(o)} style={{background:T.card,color:T.ink900,fontWeight:600}}>{(ETAT_META[o]||ETAT_META["A_DEFINIR"]).label}</option>)}
      {onCreate&&<option value={NEW_ETAT} style={{background:T.card,color:T.teal600,fontWeight:800}}>＋ Créer / gérer les états…</option>}
    </select>
    <span style={{position:"absolute",right:compact?7:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:m.text,opacity:.7}}><NavIcon name="chevronDown" size={10}/></span>
  </div>);
}

// Choix de la présence aux tests — demandé : « client, NOBO ou les 2 avec un système de couleur ».
// Contrôle segmenté : chaque option prend SA couleur quand elle est active (même code couleur que
// les pastilles du calendrier, de la liste et de la fiche), « Aucun » reste neutre.
export function PresencePicker({kind,onChange}){
  const opts=[{k:null,label:"Aucun"},{k:"client",label:"Client"},{k:"nobo",label:"NOBO"},{k:"both",label:"Les deux"}];
  return(<div role="radiogroup" aria-label="Présence aux tests" style={{display:"inline-flex",background:T.surface,border:"1px solid "+T.line,borderRadius:8,padding:2,gap:2,flexShrink:0}}>
    {opts.map(o=>{
      const on=(kind||null)===o.k;
      return(<button key={o.k||"none"} role="radio" aria-checked={on} onClick={()=>onChange(o.k)} style={{border:"none",cursor:"pointer",borderRadius:8,padding:"4px 8px",fontSize:FZ.xs,fontWeight:700,fontFamily:T.font,color:on?(o.k?PRESENCE_META[o.k].ink:T.ink900):T.ink500,background:on?(o.k?presenceBg(o.k):T.card):"transparent",boxShadow:on?(o.k&&!PRESENCE_META[o.k].color2?"inset 0 0 0 1px "+PRESENCE_META[o.k].color:T.shadowSm):"none",transition:"background .12s ease"}}>{o.label}</button>);
    })}
  </div>);
}

// Éditeur complet de la présence client / NOBO d'un PJ : choix (Aucun / Client / NOBO / Les deux) + une date
// par partie, bornée à la période de tests. Utilisé dans Manager › Statut ET directement dans la Liste.
export function PresenceEditor({r,presence,onChange}){
  const pres=presence||{present:false,date:""};
  const kind=presenceKind(pres);
  const minD=r.tests?toLocalISO(new Date(r.tests)):null;
  const maxD=r.testsFin?toLocalISO(new Date(r.testsFin)):minD;
  const noTests=!minD;
  const pDates=presenceDates(pres);
  // Une date pour le client et une date pour NOBO, chacune dans la période de tests ; « date » (la plus proche) reste renseignée pour les anciens affichages.
  const onDate=(who,v)=>{
    let x=v||"";
    if(x&&minD&&x<minD)x=minD;
    if(x&&maxD&&x>maxD)x=maxD;
    const nd={client:pDates.client||"",nobo:pDates.nobo||"",[who]:x};
    const first=[kind==="nobo"?"":nd.client,kind==="client"?"":nd.nobo].filter(Boolean).sort()[0]||"";
    onChange({...pres,dateClient:nd.client,dateNobo:nd.nobo,date:first});
  };
  return(<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",minWidth:0}}>
    <PresencePicker kind={kind} onChange={k=>onChange(k?{...pres,present:true,who:k}:{...pres,present:false})}/>
    {kind&&(noTests
      ?<span style={{fontSize:FZ.xs,color:T.red500,fontWeight:600}}>Période de tests non définie — date impossible</span>
      :<>
        {(kind==="both"?["client","nobo"]:[kind]).map(w=><label key={w} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:FZ.xs,fontWeight:700,color:PRESENCE_META[w].ink}}>
          <span style={{background:presenceBg(w),borderRadius:6,padding:"2px 8px"}}>{w==="client"?"Client":"NOBO"}</span>
          <input type="date" value={pDates[w]||""} min={minD||undefined} max={maxD||undefined} onChange={e=>onDate(w,e.target.value)}
            style={{padding:"3px 8px",borderRadius:8,border:"1.5px solid "+PRESENCE_META[w].color,fontSize:FZ.xs,fontFamily:T.font,color:T.ink700,fontWeight:600}}/>
        </label>)}
        <span style={{fontSize:FZ.xs,color:T.ink300}}>entre le {fmt(new Date(minD))} et le {fmt(new Date(maxD))}</span>
      </>)}
  </div>);
}

export function StatutTab({rows,etatChoice,setEtatFor,clientPresence,setClientPresenceFor,customEtats,setCustomEtats,etatEdits,setEtatEdits,data}){
  const COLS="130px 150px 84px 180px 1fr";
  const [etatsOpen,setEtatsOpen]=useState(false);
  return(<div style={{...CARD,overflow:"hidden"}}>
    {etatsOpen&&setCustomEtats&&<EtatsDialog onClose={()=>setEtatsOpen(false)} customEtats={customEtats||[]} setCustomEtats={setCustomEtats} etatEdits={etatEdits||{}} setEtatEdits={setEtatEdits} data={data||rows}/>}
    <div style={{padding:"12px 16px 8px"}}>
      <div style={H_TITLE}>Statut & état des machines</div>
      <div style={H_SUB}>L'état choisi ici est celui affiché partout sur le site, immédiatement visible par tous. En Montage, Élec, Tests, Packaging et Expédiée, l'avancement de production s'en déduit automatiquement (voir le « i » des filtres d'état).</div>
    </div>
    <div style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk,display:"grid",gridTemplateColumns:COLS,gap:12,padding:"8px 16px",background:T.surface,borderTop:"1px solid "+T.line,borderBottom:"1px solid "+T.line}}>
      <span>PJ</span><span>S/N</span><span>Gamme</span><span>État</span><span>Présence client / NOBO aux tests</span>
    </div>
    {rows.length===0&&<EmptyNote>Aucun PJ à afficher.</EmptyNote>}
    {rows.map(r=>{
      const current=etatChoice[r.pj]||"A_DEFINIR";
      const presence=clientPresence[r.pj]||{present:false,date:""};
      const meta=getPjMeta(r.pj,r);
      return(<div key={r.pj} style={{display:"grid",gridTemplateColumns:COLS,gap:12,alignItems:"center",padding:"8px 16px",borderBottom:"1px solid "+T.surface}}
        onMouseEnter={e=>e.currentTarget.style.background=T.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:T.fontMono,fontWeight:700,fontSize:FZ.sm,color:T.teal600,whiteSpace:"nowrap"}}><PjPlate pj={r.pj}/></div>
          <div title={meta.nomProjet||""} style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{meta.nomProjet||""}</div>
        </div>
        <div style={{minWidth:0}}><SerieTag pj={r.pj} style={{verticalAlign:"middle"}}/></div>
        <span style={{fontSize:FZ.xs,color:T.ink500}}>{r.gamme||"—"}</span>
        <EtatSelect value={current} onChange={e=>setEtatFor(r.pj,e.target.value)} onCreate={setCustomEtats?()=>setEtatsOpen(true):null}/>
        <PresenceEditor r={r} presence={presence} onChange={v=>setClientPresenceFor(r.pj,v)}/>
      </div>);
    })}
  </div>);
}

// ── KPI › AVANCEMENT ───────────────────────────────────────────────────────────────────────────
export function KpiAvancement({rows,progress}){
  const pvOf=r=>progress[r.pj]!=null?progress[r.pj]:r.etat==="SHIPPED"?100:0;
  const vals=rows.map(r=>({r,pv:pvOf(r)}));
  const avg=vals.length?Math.round(vals.reduce((a,x)=>a+x.pv,0)/vals.length):0;
  const done=vals.filter(x=>x.pv>=100).length;
  const running=vals.filter(x=>x.pv>0&&x.pv<100).length;
  const notStarted=vals.filter(x=>x.pv===0).length;
  const byGamme=useMemo(()=>{
    const m={};
    vals.forEach(({r,pv})=>{if(!r.gamme)return;if(!m[r.gamme])m[r.gamme]={sum:0,n:0};m[r.gamme].sum+=pv;m[r.gamme].n++;});
    return Object.entries(m).map(([g,v])=>({g,avg:Math.round(v.sum/v.n),n:v.n})).sort((a,b)=>b.avg-a.avg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[rows,progress]);
  const running20=vals.filter(x=>x.pv>0&&x.pv<100).sort((a,b)=>a.pv-b.pv).slice(0,8);
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <KpiRow items={[[avg+" %","Avancement moyen",null,"moyenne des % saisis"],[done,"PJ terminés",null,"avancement 100 %"],[running,"PJ en cours",null,"entre 1 et 99 %"],[notStarted,"PJ non démarrés",null,"avancement 0 %"]]}/>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <div style={{...CARD,padding:16,flex:"1 1 340px"}}>
        <div style={H_TITLE}>Avancement moyen par gamme</div>
        <div style={{...H_SUB,marginBottom:12}}>Moyenne des % saisis, PJ de la sélection</div>
        {byGamme.length===0?<EmptyNote>Aucune donnée.</EmptyNote>:byGamme.map(x=>(
          <div key={x.g} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{width:80,fontSize:FZ.sm,fontWeight:700,color:T.ink700,flexShrink:0}}>{x.g}</span>
            <div style={{flex:1,background:T.surfaceAlt,borderRadius:8,height:10,overflow:"hidden"}}><div className="enogia-bar-fill" style={{width:x.avg+"%",height:"100%",background:T.teal500,borderRadius:8}}/></div>
            <span style={{width:70,textAlign:"right",fontSize:FZ.xs,fontWeight:700,color:T.ink900}}>{x.avg}% <span style={{color:T.ink300,fontWeight:500}}>({x.n})</span></span>
          </div>
        ))}
      </div>
      <div style={{...CARD,padding:16,flex:"1 1 340px"}}>
        <div style={H_TITLE}>En cours — les moins avancés</div>
        <div style={{...H_SUB,marginBottom:12}}>Les PJ démarrés mais encore loin de la fin</div>
        {running20.length===0?<EmptyNote>Aucun PJ en cours.</EmptyNote>:running20.map(({r,pv})=>(
          <div key={r.pj} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{width:92,fontFamily:T.fontMono,fontSize:FZ.xs,fontWeight:700,color:T.teal600,flexShrink:0}}><PjPlate pj={r.pj}/></span>
            <div style={{flex:1,background:T.surfaceAlt,borderRadius:8,height:10,overflow:"hidden"}}><div className="enogia-bar-fill" style={{width:pv+"%",height:"100%",background:pv>=50?T.teal500:T.amber500,borderRadius:8}}/></div>
            <span style={{width:40,textAlign:"right",fontSize:FZ.xs,fontWeight:700,color:T.ink900}}>{pv}%</span>
          </div>
        ))}
      </div>
    </div>
  </div>);
}

// ── RETARDS ────────────────────────────────────────────────────────────────────────────────────
export const getDelayColors=()=>[T.red500,T.amber500,T.violet500,T.teal500,T.ember500,T.emerald500,T.navy600,T.ink500];

// Vue d'analyse (onglet KPI › Retards) : répartition par cause + PJ qui concentrent le plus de retard
export function DelayInsights({delays,delayTypes}){
  const allEntries=useMemo(()=>{
    const out=[];
    Object.entries(delays||{}).forEach(([pj,list])=>(list||[]).forEach(d=>out.push({...d,pj})));
    return out;
  },[delays]);
  const byType=useMemo(()=>{
    const m={};
    allEntries.forEach(e=>{m[e.type]=(m[e.type]||0)+(e.days||0);});
    return Object.entries(m).map(([type,days])=>({type,days})).sort((a,b)=>b.days-a.days);
  },[allEntries]);
  const byPj=useMemo(()=>{
    const m={};
    allEntries.forEach(e=>{m[e.pj]=(m[e.pj]||0)+(e.days||0);});
    return Object.entries(m).map(([pj,days])=>({pj,days})).sort((a,b)=>b.days-a.days).slice(0,10);
  },[allEntries]);
  const totalDays=allEntries.reduce((a,e)=>a+(e.days||0),0);
  const pjCount=new Set(allEntries.map(e=>e.pj)).size;
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <KpiRow items={[[totalDays+" j","Jours de retard alloués",totalDays?T.red500:null,"toutes causes"],[allEntries.length,"Retards enregistrés",null,"déclarations"],[pjCount,"PJ concernés",null,"au moins un retard"],[byType.length,"Causes utilisées",null,byType[0]?"1re : "+byType[0].type:"aucune"]]}/>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <div style={{...CARD,padding:16,flex:"1 1 340px"}}>
        <div style={H_TITLE}>Répartition par cause</div>
        <div style={{...H_SUB,marginBottom:12}}>Qu'est-ce qui génère le plus de retard sur le portefeuille ?</div>
        {byType.length===0?<EmptyNote>Aucun retard enregistré pour l'instant.</EmptyNote>:<PieBlock data={topSlices(byType.map(t=>({name:t.type,value:t.days})),6)} unit=" j"/>}
      </div>
      <div style={{...CARD,padding:16,flex:"1 1 340px"}}>
        <div style={H_TITLE}>Retard par PJ — jours cumulés</div>
        <div style={{...H_SUB,marginBottom:12}}>Les projets qui concentrent le plus de retard, toutes causes confondues</div>
        {byPj.length===0?<EmptyNote>Aucune donnée.</EmptyNote>:<PieBlock data={topSlices(byPj.map(p=>({name:p.pj,value:p.days})),6)} unit=" j"/>}
      </div>
    </div>
  </div>);
}

// Saisie d'un retard : « sur la gestion des retards, c'est pas très friendly pour mettre un commentaire de cause »
// → un formulaire en 4 gestes (PJ · cause en pastilles · durée en raccourcis · commentaire libre) à gauche,
// et à droite le fil chronologique de tout ce qui a été déclaré (auteur, date relative, cause, commentaire).
export function DelaysTab({data,delays,delayTypes,setDelayTypes,addDelayAllocationMulti,deleteDelayAllocation,authorName}){
  const [multiMode,setMultiMode]=useState(false);
  const [selPj,setSelPj]=useState("");
  const [selPjs,setSelPjs]=useState(new Set());
  const [type,setType]=useState("");
  const [days,setDays]=useState("");
  const [note,setNote]=useState("");
  const [authorInput,setAuthorInput]=useState("");
  const [ok,setOk]=useState(false);
  const [saving,setSaving]=useState(false);
  const [filterPj,setFilterPj]=useState("");
  const [confirmId,setConfirmId]=useState(null);
  const [showTypes,setShowTypes]=useState(false);
  const [newType,setNewType]=useState("");
  const [drawerOpen,setDrawerOpen]=useState(false);
  // v168 : tiroir accessible — le focus y entre à l'ouverture, Échap le ferme, le focus revient ensuite où il était.
  const drawerRef=useRef(null);
  useEffect(()=>{
    if(!drawerOpen)return;
    const back=document.activeElement;
    if(drawerRef.current)drawerRef.current.focus();
    const onKey=e=>{if(e.key==="Escape")setDrawerOpen(false);};
    window.addEventListener("keydown",onKey);
    return()=>{window.removeEventListener("keydown",onKey);if(back&&back.focus)back.focus();};
  },[drawerOpen]);
  const [view,setView]=useState("cause"); // « cause » | « pj » | « fil »
  const author=(authorName||authorInput||"").trim();
  const colorOf=t=>{const i=delayTypes.indexOf(t);{const dc=getDelayColors();return dc[(i<0?delayTypes.length:i)%dc.length];}};

  const pjList=multiMode?[...selPjs]:(selPj?[selPj]:[]);
  const n=Math.round(Number(days));
  const missing=[];
  if(pjList.length===0)missing.push(multiMode?"au moins un PJ":"un PJ");
  if(!type)missing.push("une cause");
  if(!days||isNaN(n)||n<=0)missing.push("une durée");
  if(!author)missing.push("votre nom");
  const canSubmit=missing.length===0&&!saving;

  const submit=async()=>{
    if(!canSubmit)return;
    setSaving(true);
    const done=await addDelayAllocationMulti(pjList,type,n,note,author);
    setSaving(false);
    if(done){
      setDays("");setNote("");setOk(true);
      if(multiMode)setSelPjs(new Set());
      setTimeout(()=>{setOk(false);setDrawerOpen(false);},900);
    }
  };

  const feed=useMemo(()=>{
    const out=[];
    Object.entries(delays||{}).forEach(([pj,list])=>(list||[]).forEach(d=>out.push({...d,pj})));
    return out.filter(e=>!filterPj||e.pj===filterPj).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  },[delays,filterPj]);
  const feedDays=feed.reduce((a,e)=>a+(e.days||0),0);

  const addType=()=>{
    const v=newType.trim();
    if(!v||delayTypes.includes(v))return;
    setDelayTypes([...delayTypes,v]);setNewType("");
  };
  const removeType=t=>{if(delayTypes.length<=1)return;setDelayTypes(delayTypes.filter(x=>x!==t));if(type===t)setType("");};

  const label={fontSize:FZ.xs,fontWeight:700,color:T.ink500,marginBottom:6,display:"block"};
  const pjOptions=[{value:"",label:"Choisir un PJ…"},...data.map(d=>{const m=getPjMeta(d.pj,d);return{value:d.pj,label:d.pj+(m.nomProjet?" — "+m.nomProjet:"")};})];

  // ── Vue Kanban (demandé : « une vue plus UX/UI comme un Kanban ») ────────────────────────────
  // Une colonne par CAUSE (ou par PJ) : on voit d'un coup d'œil où se concentrent les jours perdus.
  // Le « + » d'une colonne ouvre le formulaire (tiroir) déjà prérempli avec la cause / le PJ.
  const meta=pj=>getPjMeta(pj,data.find(d=>d.pj===pj));
  const causeCols=useMemo(()=>{
    const types=[...delayTypes];
    feed.forEach(e=>{if(!types.includes(e.type))types.push(e.type);});
    return types.map(t=>{const items=feed.filter(e=>e.type===t);return{key:t,title:t,items,days:items.reduce((a,e)=>a+(e.days||0),0)};});
  },[feed,delayTypes]);
  const pjCols=useMemo(()=>{
    const m={};feed.forEach(e=>{(m[e.pj]=m[e.pj]||[]).push(e);});
    return Object.entries(m).map(([pj,items])=>({key:pj,title:pj,pj,items,days:items.reduce((a,e)=>a+(e.days||0),0)})).sort((a,b)=>b.days-a.days);
  },[feed]);
  const cols=view==="pj"?pjCols:causeCols;
  const openForm=(preset={})=>{
    setMultiMode(false);
    if(preset.pj!==undefined)setSelPj(preset.pj);
    if(preset.type!==undefined)setType(preset.type);
    setDrawerOpen(true);
  };
  const seg=on=>({padding:"4px 12px",borderRadius:8,border:"none",background:on?T.card:"transparent",boxShadow:on?T.shadowSm:"none",color:on?T.teal600:T.ink500,fontWeight:on?700:600,fontSize:FZ.sm,cursor:"pointer",fontFamily:T.font});
  const card=(e,byPj)=>{
    const c=colorOf(e.type);const ask=confirmId===e.id;const m=meta(e.pj);
    return(<div key={e.pj+"-"+e.id} style={{background:T.card,border:"1px solid "+T.line,borderLeft:"3px solid "+c,borderRadius:12,padding:"8px 12px",boxShadow:T.shadowSm}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {byPj
          ?<span style={{display:"inline-flex",alignItems:"center",gap:4,background:T.surface,borderRadius:999,padding:"1px 8px 1px 8px",fontSize:FZ.xs,fontWeight:700,color:T.ink700}}><span style={{width:7,height:7,borderRadius:"50%",background:c}}/>{e.type}</span>
          :<span style={{fontFamily:T.fontMono,fontWeight:800,fontSize:FZ.sm,color:T.teal600}}><PjPlate pj={e.pj}/></span>}
        {!byPj&&<SerieTag pj={e.pj}/>}
        <span style={{fontSize:FZ.sm,fontWeight:800,color:T.red500,background:T.red100,borderRadius:8,padding:"0 8px"}}>+{e.days}j</span>
        {e.groupPjs&&e.groupPjs.length>1&&<span title={e.groupPjs.join(", ")} style={{fontSize:FZ.xs,color:T.violet600,background:T.violet100,borderRadius:8,padding:"1px 6px",fontWeight:700}}>×{e.groupPjs.length}</span>}
        <span style={{marginLeft:"auto"}}>
          {ask
            ?<span style={{display:"inline-flex",gap:4,alignItems:"center"}}><button onClick={async()=>{await deleteDelayAllocation(e.pj,e.id);setConfirmId(null);}} style={{border:"none",background:T.redFill,color:"#fff",borderRadius:8,fontSize:FZ.xs,fontWeight:700,padding:"1px 8px",cursor:"pointer"}}>Supprimer ?</button><button onClick={()=>setConfirmId(null)} style={{border:"none",background:"none",color:T.ink300,fontSize:FZ.xs,cursor:"pointer"}}>Non</button></span>
            :<SuperOnly><button onClick={()=>setConfirmId(e.id)} title="Supprimer ce retard" style={{border:"none",background:"none",color:T.ink300,fontSize:FZ.xs,cursor:"pointer",padding:0}}><NavIcon name="close" size={11}/></button></SuperOnly>}
        </span>
      </div>
      {!byPj&&m.nomProjet&&<div style={{fontSize:FZ.xs,color:T.ink500,marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nomProjet}</div>}
      {e.note&&<div style={{fontSize:FZ.xs,color:T.ink700,marginTop:6,lineHeight:1.4,whiteSpace:"pre-wrap",wordBreak:"break-word",display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}} title={e.note}>{e.note}</div>}
      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:FZ.xs,color:T.ink300}}><Avatar name={e.author||"?"} size={16}/><span style={{fontWeight:600,color:T.ink500}}>{e.author||"Anonyme"}</span><span>· {e.date?relTime(e.date):""}</span></div>
    </div>);
  };

  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    {/* ── Barre : titre, bascule de vue, filtre PJ, bouton « Déclarer » ── */}
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <div>
        <div style={H_TITLE}>Retards déclarés</div>
        <div style={H_SUB}>{feed.length} retard{feed.length>1?"s":""} · <b style={{color:feedDays>0?T.red500:T.ink500}}>{feedDays} jour{feedDays>1?"s":""}</b> au total</div>
      </div>
      <div style={{display:"inline-flex",gap:2,padding:3,background:T.surface,border:"1px solid "+T.line,borderRadius:12}}>
        <button onClick={()=>setView("cause")} style={seg(view==="cause")}>Par cause</button>
        <button onClick={()=>setView("pj")} style={seg(view==="pj")}>Par PJ</button>
        <button onClick={()=>setView("fil")} style={seg(view==="fil")}>Fil</button>
      </div>
      <div style={{width:190}}>
        <Select compact value={filterPj} onChange={e=>setFilterPj(e.target.value)} options={[{value:"",label:"Tous les PJ"},...data.map(d=>({value:d.pj,label:d.pj}))]}/>
      </div>
      <button onClick={()=>openForm(filterPj?{pj:filterPj}:{})} style={{marginLeft:"auto",padding:"8px 16px",borderRadius:12,border:"none",background:T.teal500,color:"#fff",fontSize:FZ.sm,fontWeight:700,cursor:"pointer",fontFamily:T.font,boxShadow:T.shadowSm}}>+ Déclarer un retard</button>
    </div>

    {view==="fil"
      ?<div style={{...CARD,padding:16,maxWidth:760}}>
        <div style={{maxHeight:"calc(100dvh - 300px)",minHeight:160,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,paddingRight:2}}>
          {feed.length===0&&<EmptyNote>Aucun retard déclaré{filterPj?" pour ce PJ":""}.</EmptyNote>}
          {feed.map(e=>card(e,false))}
        </div>
      </div>
      :<div style={{display:"flex",gap:12,overflowX:"auto",alignItems:"flex-start",paddingBottom:8}}>
        {cols.length===0&&<EmptyNote>Aucun retard déclaré{filterPj?" pour ce PJ":""}.</EmptyNote>}
        {cols.map(col=>{
          const c=view==="pj"?T.red500:colorOf(col.key);
          const mm=view==="pj"?meta(col.pj):null;
          return(<div key={col.key} style={{width:268,flexShrink:0,background:T.surfaceAlt,borderRadius:12,display:"flex",flexDirection:"column",maxHeight:"calc(100dvh - 290px)",minHeight:120}}>
            <div style={{padding:"8px 12px 8px",borderBottom:"2px solid "+c,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <div style={{minWidth:0,flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                  {view==="pj"?<span style={{fontFamily:T.fontMono,fontWeight:800,fontSize:FZ.sm,color:T.teal600}}><PjPlate pj={col.pj}/><SerieTag pj={col.pj} style={{marginLeft:7}}/></span>
                    :<><span style={{width:9,height:9,borderRadius:"50%",background:c,flexShrink:0}}/><span style={{fontWeight:700,fontSize:FZ.sm,color:T.ink900,overflowWrap:"anywhere"}}>{col.title}</span></>}
                </div>
                <div style={{fontSize:FZ.xs,color:T.ink500,marginTop:2,overflowWrap:"anywhere"}}>{view==="pj"?(mm.nomProjet||""):col.items.length+" retard"+(col.items.length>1?"s":"")}{view==="pj"?" · "+col.items.length+" retard"+(col.items.length>1?"s":""):""}</div>
              </div>
              <span style={{fontFamily:T.fontDisplay,fontWeight:800,fontSize:FZ.md,color:col.days>0?T.red500:T.ink300,flexShrink:0}}>{col.days}j</span>
              <button onClick={()=>openForm(view==="pj"?{pj:col.pj}:{type:col.key})} title="Ajouter un retard ici" style={{width:24,height:24,borderRadius:8,border:"none",background:T.card,color:T.ink900,fontSize:FZ.md,fontWeight:700,cursor:"pointer",flexShrink:0}}>+</button>
            </div>
            <div style={{padding:8,display:"flex",flexDirection:"column",gap:8,overflowY:"auto",minHeight:0}}>
              {col.items.length===0&&<div style={{color:T.ink300,fontSize:FZ.xs,textAlign:"center",padding:"12px 6px"}}>Aucun retard.</div>}
              {col.items.map(e=>card(e,view==="pj"))}
            </div>
          </div>);
        })}
      </div>}

    {drawerOpen&&<>
      <div aria-hidden="true" onClick={()=>setDrawerOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",zIndex:9998}}/>
    <div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="enogia-delay-title" tabIndex={-1} style={{...CARD,outline:"none",position:"fixed",top:0,right:0,bottom:0,width:"min(470px,100vw)",boxSizing:"border-box",overflowY:"auto",zIndex:9999,borderRadius:"16px 0 0 16px",boxShadow:T.shadowLg,padding:20,display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          <div id="enogia-delay-title" style={H_TITLE}>Déclarer un retard</div>
          <div style={H_SUB}>Quel PJ, pourquoi, de combien de jours — et ce qu'il s'est passé.</div>
        </div>
        <button onClick={()=>setDrawerOpen(false)} title="Fermer" aria-label="Fermer" style={{width:30,height:30,borderRadius:8,border:"none",background:T.surface,color:T.ink500,fontSize:FZ.md,cursor:"pointer"}}><NavIcon name="close" size={11}/></button>
      </div>

      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={label}>{multiMode?"PJ concernés":"PJ"}</span>
          <button onClick={()=>{setMultiMode(m=>!m);}} style={{background:"none",border:"none",color:T.teal600,fontSize:FZ.xs,fontWeight:700,cursor:"pointer",padding:0,marginBottom:6}}>{multiMode?"← Un seul PJ":"Plusieurs PJ (décalage groupé)"}</button>
        </div>
        {multiMode?<PjChecklist data={data} selected={selPjs} onChange={setSelPjs} maxHeight={180}/>
          :<Select value={selPj} onChange={e=>setSelPj(e.target.value)} options={pjOptions}/>}
      </div>

      <div>
        <span style={label}>Cause du retard</span>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {delayTypes.map(t=>{const on=type===t;const c=colorOf(t);return(
            <button key={t} onClick={()=>setType(on?"":t)} aria-pressed={on} style={{padding:"6px 12px",borderRadius:999,border:"1.5px solid "+(on?c:T.line),background:on?c:T.card,color:on?inkOn(c):T.ink700,fontSize:FZ.xs,fontWeight:600,cursor:"pointer",fontFamily:T.font,transition:"background-color .12s ease, border-color .12s ease, color .12s ease"}}>{t}</button>
          );})}
          <NewDelayType types={delayTypes} onCreate={setDelayTypes} onCreated={setType}/>
        </div>
      </div>

      <div>
        <span style={label}>Durée du retard</span>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          {[1,2,3,5,10,15].map(v=>{const on=n===v&&String(days)===String(v);return(
            <button key={v} onClick={()=>setDays(String(v))} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+(on?T.teal500:T.line),background:on?T.teal100:T.card,color:on?T.teal600:T.ink700,fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>{v} j</button>
          );})}
          <input type="number" min="1" value={days} onChange={e=>setDays(e.target.value)} placeholder="Autre" style={{width:70,padding:"6px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink700}}/>
          <span style={{fontSize:FZ.xs,color:T.ink500}}>jours</span>
        </div>
      </div>

      <DelayScopeNote/>

      <div>
        <span style={label}>Commentaire <span style={{fontWeight:500,color:T.ink300}}>(optionnel)</span></span>
        <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={300} placeholder="Que s'est-il passé ? Ex. : échangeurs livrés avec 2 semaines de retard par le fournisseur…"
          style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink700,resize:"vertical",lineHeight:1.45}}/>
        <div style={{fontSize:FZ.xs,color:T.ink300,textAlign:"right",marginTop:2}}>{note.length}/300</div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        {authorName
          ?<span style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:FZ.sm,color:T.ink700,fontWeight:600}}><Avatar name={authorName} size={24}/>{authorName}</span>
          :<input type="text" value={authorInput} onChange={e=>setAuthorInput(e.target.value)} placeholder="Votre nom" maxLength={40} style={{width:140,padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink700}}/>}
        <button onClick={submit} disabled={!canSubmit} style={{marginLeft:"auto",padding:"8px 20px",borderRadius:8,border:"none",background:canSubmit?T.teal500:T.surfaceAlt,color:canSubmit?"#fff":T.ink300,fontSize:FZ.sm,fontWeight:700,cursor:canSubmit?"pointer":"default",fontFamily:T.font}}>
          {saving?"Enregistrement…":ok?"✓ Enregistré":"Enregistrer le retard"}
        </button>
      </div>
      {missing.length>0&&<div style={{fontSize:FZ.xs,color:T.ink300,marginTop:-8}}>Il manque : {missing.join(" · ")}</div>}

      <div style={{borderTop:"1px solid "+T.line,paddingTop:12}}>
        <button onClick={()=>setShowTypes(v=>!v)} style={{background:"none",border:"none",padding:0,fontSize:FZ.xs,fontWeight:700,color:T.ink500,cursor:"pointer",fontFamily:T.font}}>{showTypes?"▾":"▸"} Gérer les causes proposées ({delayTypes.length})</button>
        {showTypes&&<div style={{marginTop:10}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            {delayTypes.map(t=>(
              <span key={t} style={{display:"inline-flex",alignItems:"center",gap:6,background:T.surface,borderRadius:999,padding:"4px 8px 4px 12px",fontSize:FZ.xs,color:T.ink700,fontWeight:600}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:colorOf(t)}}/>{t}
                <SuperOnly><button onClick={()=>removeType(t)} disabled={delayTypes.length<=1} title="Supprimer cette cause" style={{background:"none",border:"none",color:T.ink300,cursor:delayTypes.length<=1?"default":"pointer",fontSize:FZ.xs,padding:0}}><NavIcon name="close" size={11}/></button></SuperOnly>
              </span>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input type="text" value={newType} onChange={e=>setNewType(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addType();}} placeholder="Nouvelle cause…" maxLength={60} style={{flex:1,padding:"6px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink700}}/>
            <button onClick={addType} disabled={!newType.trim()} style={{padding:"6px 12px",borderRadius:8,border:"none",background:newType.trim()?T.teal500:T.surfaceAlt,color:newType.trim()?"#fff":T.ink300,fontSize:FZ.xs,fontWeight:700,cursor:newType.trim()?"pointer":"default"}}>Ajouter</button>
          </div>
        </div>}
      </div>
    </div>

    </>}
  </div>);
}

// ── RÉGLAGES › PRODUCTION ──────────────────────────────────────────────────────────────────────
// Nouveau système (« sur la page production il faut créer un autre système de gestion ») : un mini-calendrier
// mensuel sur la période de production du PJ. Un clic exclut/réactive un jour, un clic-glisser traite toute une
// période ; « Tous les PJ » applique le geste à l'ensemble des PJ dont la production couvre le jour (férié, pont…).
const DOW=["L","M","M","J","V","S","D"];
const dayStart=v=>{const d=new Date(v);return new Date(d.getFullYear(),d.getMonth(),d.getDate());};

export function ProductionCalendarManager({data,productionExclusions,setProductionExclusionDays}){
  const [selectedPj,setSelectedPj]=useState("");
  const [allMode,setAllMode]=useState(false);
  const [drag,setDrag]=useState(null); // {a,b,mode}
  const dragRef=useRef(null);

  const withRange=useMemo(()=>data.filter(r=>r.arrivee&&r.finProd).map(r=>({pj:r.pj,start:dayStart(r.arrivee),end:dayStart(r.finProd)})),[data]);
  const targets=useMemo(()=>allMode?withRange:withRange.filter(r=>r.pj===selectedPj),[allMode,withRange,selectedPj]);
  const selectedHasNoRange=!allMode&&selectedPj&&targets.length===0;

  const range=useMemo(()=>{
    if(targets.length===0)return null;
    return{start:new Date(Math.min(...targets.map(t=>t.start))),end:new Date(Math.max(...targets.map(t=>t.end)))};
  },[targets]);

  const applicablePjs=d=>{
    if(d.getDay()===0||d.getDay()===6)return[];
    return targets.filter(t=>d>=t.start&&d<=t.end).map(t=>t.pj);
  };
  const stateOf=(iso,d)=>{
    if(d.getDay()===0||d.getDay()===6)return"we";
    const pjs=applicablePjs(d);
    if(pjs.length===0)return"out";
    const off=pjs.filter(pj=>(productionExclusions[pj]||[]).includes(iso)).length;
    return off===0?"on":off===pjs.length?"off":"part";
  };

  const apply=(a,b,mode)=>{
    const lo=a<b?a:b,hi=a<b?b:a;
    const entries={};
    let d=new Date(lo+"T00:00:00");const end=new Date(hi+"T00:00:00");
    while(d<=end){
      const iso=toLocalISO(d);
      applicablePjs(d).forEach(pj=>{(entries[pj]=entries[pj]||[]).push(iso);});
      d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
    }
    if(Object.keys(entries).length>0)setProductionExclusionDays(entries,mode==="exclude");
  };
  // Le relâchement de la souris peut survenir hors d'un jour : on l'écoute au niveau de la fenêtre.
  const applyRef=useRef(apply);
  applyRef.current=apply;
  useEffect(()=>{
    const up=()=>{
      const dg=dragRef.current;
      if(!dg)return;
      dragRef.current=null;setDrag(null);
      applyRef.current(dg.a,dg.b,dg.mode);
    };
    window.addEventListener("mouseup",up);
    return()=>window.removeEventListener("mouseup",up);
  },[]);

  const startDrag=(iso,st)=>{
    const dg={a:iso,b:iso,mode:st==="off"?"include":"exclude"};
    dragRef.current=dg;setDrag(dg);
  };
  const overDay=iso=>{
    if(!dragRef.current)return;
    dragRef.current={...dragRef.current,b:iso};setDrag(dragRef.current);
  };
  const inDrag=iso=>{
    if(!drag)return false;
    const lo=drag.a<drag.b?drag.a:drag.b,hi=drag.a<drag.b?drag.b:drag.a;
    return iso>=lo&&iso<=hi;
  };

  const months=useMemo(()=>{
    if(!range)return[];
    const out=[];
    let m=new Date(range.start.getFullYear(),range.start.getMonth(),1);
    while(m<=range.end){out.push(new Date(m));m=new Date(m.getFullYear(),m.getMonth()+1,1);}
    return out;
  },[range]);

  const excluded=!allMode?(productionExclusions[selectedPj]||[]):[];
  const pjOptions=[{value:"",label:"Choisir un PJ…"},...data.map(d=>({value:d.pj,label:d.pj}))];

  const palette={
    on:{background:T.teal100,color:T.teal600,fontWeight:600,cursor:"pointer"},
    off:{background:T.red100,color:T.red600,fontWeight:700,textDecoration:"line-through",cursor:"pointer"},
    part:{background:T.amber100,color:T.amber600,fontWeight:700,cursor:"pointer"},
    out:{color:T.ink100,cursor:"default"},
    we:{color:T.ink300,background:"transparent",cursor:"default",opacity:.55},
  };

  return(<div style={{...CARD,padding:16}}>
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:14}}>
      <div>
        <div style={H_TITLE}>Calendrier de production</div>
        <div style={H_SUB}>Désactivez les jours sans activité (férié, pont, arrêt) : ils disparaissent de la vue « Production » du Calendrier.</div>
      </div>
      <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:FZ.xs,fontWeight:600,color:T.ink700,cursor:"pointer"}}>
          <input type="checkbox" checked={allMode} onChange={e=>setAllMode(e.target.checked)}/> Tous les PJ
        </label>
        {!allMode&&<div style={{width:190}}><Select value={selectedPj} onChange={e=>setSelectedPj(e.target.value)} options={pjOptions}/></div>}
      </div>
    </div>

    {!allMode&&!selectedPj&&<EmptyNote>Choisissez un PJ — ou cochez « Tous les PJ » — pour afficher son calendrier de production.</EmptyNote>}
    {selectedHasNoRange&&<div style={{fontSize:FZ.sm,color:T.red500}}>Période de production non définie (Arrivée / Fin de prod manquante) pour ce PJ.</div>}

    {range&&<>
      <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:12,fontSize:FZ.xs,color:T.ink500}}>
        <span>Production du <b style={{color:T.ink700}}>{fmt(range.start)}</b> au <b style={{color:T.ink700}}>{fmt(range.end)}</b>{allMode?" ("+targets.length+" PJ)":""}</span>
        <span style={{color:T.ink300}}>Clic = exclure / réactiver un jour · clic-glisser = toute une période</span>
        <span style={{marginLeft:"auto",display:"flex",gap:12}}>
          {[["on","Jour de prod"],["off","Désactivé"],...(allMode?[["part","Partiel"]]:[]),["we","Week-end"]].map(([k,l])=>(
            <span key={k} style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:12,height:12,borderRadius:4,background:k==="on"?T.teal100:k==="off"?T.red100:k==="part"?T.amber100:T.surfaceAlt}}/>{l}</span>
          ))}
        </span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:12,userSelect:"none"}}>
        {months.map(m=>{
          const y=m.getFullYear(),mo=m.getMonth();
          const nDays=new Date(y,mo+1,0).getDate();
          const lead=(new Date(y,mo,1).getDay()+6)%7;
          const cells=[];
          for(let i=0;i<lead;i++)cells.push(null);
          for(let d=1;d<=nDays;d++)cells.push(new Date(y,mo,d));
          return(<div key={y+"-"+mo} style={{border:"1px solid "+T.line,borderRadius:12,padding:8}}>
            <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,textTransform:"capitalize",marginBottom:6}}>{m.toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
              {DOW.map((l,i)=><div key={i} style={{textAlign:"center",fontSize:FZ.xs,fontWeight:700,color:T.ink300,paddingBottom:2}}>{l}</div>)}
              {cells.map((d,i)=>{
                if(!d)return<div key={"b"+i}/>;
                const iso=toLocalISO(d);
                const st=stateOf(iso,d);
                const clickable=st==="on"||st==="off"||st==="part";
                const dragging=clickable&&inDrag(iso);
                return(<div key={iso}
                  onMouseDown={clickable?e=>{e.preventDefault();startDrag(iso,st);}:undefined}
                  onMouseEnter={clickable?()=>overDay(iso):undefined}
                  style={{height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,fontSize:FZ.xs,...palette[st],outline:dragging?"2px solid "+(drag.mode==="exclude"?T.red500:T.teal500):"none",outlineOffset:-2}}>
                  {d.getDate()}
                </div>);
              })}
            </div>
          </div>);
        })}
      </div>

      {!allMode&&<div style={{marginTop:16}}>
        <div style={{fontSize:FZ.xs,fontWeight:700,color:T.ink700,marginBottom:8}}>Jours désactivés ({excluded.length})</div>
        {excluded.length===0?<div style={{fontSize:FZ.sm,color:T.ink300}}>Aucun jour exclu pour ce PJ.</div>:
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {[...excluded].sort().map(iso=>(
              <span key={iso} style={{display:"inline-flex",alignItems:"center",gap:6,background:T.red100,color:T.red600,borderRadius:999,padding:"3px 8px 3px 12px",fontSize:FZ.xs,fontWeight:600}}>
                {fmt(new Date(iso+"T00:00:00"))}
                <button onClick={()=>setProductionExclusionDays({[selectedPj]:[iso]},false)} title="Réactiver ce jour" style={{background:"none",border:"none",color:T.red500,cursor:"pointer",fontSize:FZ.xs,padding:0}}><NavIcon name="close" size={11}/></button>
              </span>
            ))}
          </div>}
      </div>}
    </>}
  </div>);
}
