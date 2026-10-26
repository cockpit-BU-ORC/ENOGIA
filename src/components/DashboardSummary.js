import React, { useState, useMemo } from "react";
import { isPhone } from "../useIsPhone";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { T, FZ } from "../theme";
import { getPjMeta, ETAT_META, GAMME_COLORS, countShippedYTD } from "../pjMeta";
import { AnimatedNumber } from "./SharedUI";

// v176 : retour aux camemberts colorés (demandé), en version basse : anneau de 76 px + légende à côté, 4 valeurs + « Autres ».
// Bandeau de synthèse en haut de la page : nombre de machines expédiées depuis le 1er janvier +
// répartition de l'ensemble du portefeuille par gamme / pays / chef de projet / état. Les 4
// répartitions sont affichées en petits camemberts côte à côte (plutôt qu'un seul gros camembert
// avec des onglets pour changer de dimension) pour occuper l'espace horizontal disponible au lieu
// de laisser un grand vide à droite — demandé explicitement.
const SHIPPED_SINCE_LABEL="19/05/2026"; // date de la première machine du site
const DIMENSIONS=[
  {key:"gamme",label:"Gamme"},
  {key:"pays",label:"Pays"},
  {key:"chef",label:"Chef de projet"},
  {key:"etat",label:"État"},
];
const TOP_N=4;
// Palette douce des camemberts (demandée explicitement : « couleurs plus douces et légères ») — gammes et états gardent leurs couleurs propres.
const PALETTE=["#0D3B66","#A8D5E2","#F4D35E","#EE964B","#548C2F","#F95738","#FFD449","#104911","#F9A620"]; // v177 : nouvelle palette

export function DashboardSummary({data,allData,progress,changeLog,onOpenChanges}){
  // Le compteur "expédiées depuis le 1er janvier" doit rester lié au nombre réel d'unités
  // expédiées, jamais aux filtres actifs sur la liste (demandé explicitement) — il se calcule donc
  // sur allData (le jeu de données complet) plutôt que sur data (qui suit les filtres et sert aux
  // 4 camemberts de répartition ci-dessous).
  const fullData=allData||data;
  const [collapsed,setCollapsed]=useState(()=>{
    try{const v=localStorage.getItem("enogia-dashboard-collapsed");if(v==null)return isPhone();return v==="1";}catch(e){return false;}
  });
  const toggleCollapsed=()=>{
    setCollapsed(c=>{
      const next=!c;
      try{localStorage.setItem("enogia-dashboard-collapsed",next?"1":"0");}catch(e){}
      return next;
    });
  };

  // Compteur 100 % automatique (départs passés), compté depuis la première machine présente sur le
  // site : le 19/05/2026 (demandé : « garder la base auto … dire que c'est depuis le 19/05 »).
  const shippedYTD=useMemo(()=>countShippedYTD(fullData),[fullData]);


  // Une répartition (breakdown) par dimension, calculées ensemble pour les 4 petits camemberts.
  const breakdownsByDim=useMemo(()=>{
    const out={};
    DIMENSIONS.forEach(d=>{
      const counts={};
      data.forEach(r=>{
        if(r.etat==="SLOT_LIBRE")return; // un slot libre n'est pas une machine : il ne compte dans aucun KPI
        const meta=getPjMeta(r.pj,r);
        let key;
        if(d.key==="gamme")key=r.gamme||"Non renseigné";
        else if(d.key==="pays")key=meta.pays||"Non renseigné";
        else if(d.key==="chef")key=meta.chefProjet||"Non renseigné";
        else key=(ETAT_META[r.etat]&&ETAT_META[r.etat].label)||r.etat||"Non renseigné";
        counts[key]=(counts[key]||0)+1;
      });
      out[d.key]=Object.entries(counts).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
    });
    return out;
  },[data]);

  const etatColor=name=>{const e=Object.entries(ETAT_META).find(([,v])=>v.label===name);return e?e[1].bar:T.ink300;};
  const colorFor=(dimKey,name,i)=>dimKey==="gamme"&&GAMME_COLORS[name]?GAMME_COLORS[name]:dimKey==="etat"?etatColor(name):PALETTE[i%PALETTE.length];
  // 5 premières valeurs + « Autres » regroupées, pour que chaque bloc reste lisible d'un coup d'œil.
  const topOf=list=>{if(list.length<=TOP_N+1)return list;const rest=list.slice(TOP_N).reduce((a,x)=>a+x.value,0);return[...list.slice(0,TOP_N),{name:"Autres ("+(list.length-TOP_N)+")",value:rest,other:true}];};

  return(<div style={{paddingBottom:collapsed?12:16,marginBottom:16,borderBottom:"1px solid "+T.line,fontFamily:T.font}}>
    {/* Pas de carte ici : le bandeau est posé directement sur le fond de page (direction "Piste A"),
        séparé du reste par un simple filet. L'en-tête reste fixe, avec le contrôle d'affichage ancré à droite. */}
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <h2 style={{margin:0,fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk}}>Vue d'ensemble</h2>
      {collapsed&&<span style={{fontSize:FZ.sm,color:T.ink700}}><strong style={{color:T.teal600}}>{shippedYTD}</strong> expédiée{shippedYTD>1?"s":""} depuis le {SHIPPED_SINCE_LABEL}</span>}
      <button onClick={toggleCollapsed} title={collapsed?"Afficher la répartition":"Masquer la répartition"} aria-label={collapsed?"Afficher la répartition":"Masquer la répartition"} aria-expanded={!collapsed} style={{marginLeft:"auto",flexShrink:0,width:26,height:26,borderRadius:8,border:"none",background:"transparent",cursor:"pointer",color:T.ink300,display:"flex",alignItems:"center",justifyContent:"center"}}
        onMouseEnter={e=>{e.currentTarget.style.background=T.surface;}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{transform:collapsed?"rotate(180deg)":"rotate(0deg)",transition:"transform .18s ease"}}>
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </div>

    {!collapsed&&<div className="enogia-dash" style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap",marginTop:12}}>
      <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:120,flexShrink:0}}>
        <div style={{fontSize:"clamp(36px,4vw,46px)",fontWeight:300,letterSpacing:"-.03em",color:T.ink900,fontFamily:T.fontDisplay,lineHeight:.95,fontVariantNumeric:"tabular-nums"}}><AnimatedNumber value={shippedYTD}/></div>
        <div style={{fontSize:FZ.xs,color:T.ink500}}>machine{shippedYTD>1?"s":""} livrée{shippedYTD>1?"s":""}<br/>depuis le {SHIPPED_SINCE_LABEL}</div>
      </div>

      <div className="enogia-dash-sep" style={{width:3,alignSelf:"stretch",background:T.teal500,flexShrink:0,borderRadius:1}}/>

      {/* v176 (demandé : « la hauteur est trop importante, je préfère les camemberts avec les couleurs ») :
          un petit anneau coloré par répartition, légende à côté (et non dessous) pour limiter la hauteur. */}
      <div className="enogia-stagger" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"12px 24px",flex:1,minWidth:0}}>
        {DIMENSIONS.map(d=>{
          const all=breakdownsByDim[d.key],list=topOf(all),total=all.reduce((a,x)=>a+x.value,0);
          const pie=list.map((x,i)=>({...x,color:x.other?T.ink300:colorFor(d.key,x.name,i)}));
          return(<section key={d.key} aria-label={"Répartition par "+d.label.toLowerCase()} style={{minWidth:0,display:"flex",alignItems:"center",gap:12}}>
            <div role="img" aria-label={"Par "+d.label.toLowerCase()+" : "+all.map(x=>x.name+" "+x.value).join(", ")} style={{width:76,height:76,flexShrink:0}}>
              {total>0&&<ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={22} outerRadius={37} paddingAngle={pie.length>1?2:0} stroke="none" isAnimationActive={true} animationDuration={600}>
                    {pie.map(x=><Cell key={x.name} fill={x.color}/>)}
                  </Pie>
                  <Tooltip content={({active,payload})=>{
                    if(!active||!payload||!payload.length)return null;const p=payload[0];
                    return(<div style={{background:T.card,border:"1px solid "+T.line,borderRadius:8,padding:"4px 8px",fontSize:FZ.xs,fontFamily:T.font,color:T.ink900,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{width:7,height:7,borderRadius:2,background:p.payload&&p.payload.color,flexShrink:0}}/><span>{p.name}</span><strong>{p.value}</strong>
                    </div>);
                  }}/>
                </PieChart>
              </ResponsiveContainer>}
            </div>
            <div style={{minWidth:0,flex:1}}>
              <div style={{display:"flex",alignItems:"baseline",marginBottom:4}}>
                <h3 style={{margin:0,fontSize:FZ.xs,fontWeight:700,color:T.ink900}}>Par {d.label.toLowerCase()}</h3>
                <span style={{marginLeft:"auto",fontSize:FZ.xs,color:T.ink500,fontVariantNumeric:"tabular-nums"}}>{total}</span>
              </div>
              {total===0?<div style={{fontSize:FZ.xs,color:T.ink500}}>Aucune machine avec ces filtres.</div>:
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  {pie.map(x=><div key={x.name} style={{display:"flex",alignItems:"center",gap:6,fontSize:FZ.xs,color:T.ink700,lineHeight:1.35}}>
                    <span aria-hidden="true" style={{width:8,height:8,borderRadius:2,flexShrink:0,background:x.color}}/>
                    <span title={x.name} style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0}}>{x.name}</span>
                    <span style={{marginLeft:"auto",fontWeight:700,color:T.ink900,fontVariantNumeric:"tabular-nums"}}>{x.value}</span>
                  </div>)}
                </div>}
            </div>
          </section>);
        })}
      </div>
    </div>}
  </div>);
}
