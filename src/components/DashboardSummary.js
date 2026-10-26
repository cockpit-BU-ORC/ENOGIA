import React, { useState, useMemo } from "react";
import { isPhone } from "../useIsPhone";
import { T, FZ } from "../theme";
import { getPjMeta, ETAT_META, countShippedYTD } from "../pjMeta";
import { AnimatedNumber } from "./SharedUI";

// v171 (maquette validée) : les 4 répartitions passent de camemberts à des barres horizontales triées (une teinte),
// l'état en une barre découpée aux couleurs d'état ; 5 valeurs max par dimension + « Autres ».
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
const TOP_N=5;

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
  // 5 premières valeurs + « Autres » regroupées, pour que chaque bloc reste lisible d'un coup d'œil.
  const topOf=list=>{if(list.length<=TOP_N+1)return list;const rest=list.slice(TOP_N).reduce((a,x)=>a+x.value,0);return[...list.slice(0,TOP_N),{name:"Autres ("+(list.length-TOP_N)+")",value:rest,other:true}];};

  return(<div style={{paddingBottom:collapsed?14:22,marginBottom:22,borderBottom:"1px solid "+T.line,fontFamily:T.font}}>
    {/* Pas de carte ici : le bandeau est posé directement sur le fond de page (direction "Piste A"),
        séparé du reste par un simple filet. L'en-tête reste fixe, avec le contrôle d'affichage ancré à droite. */}
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <h2 style={{margin:0,fontFamily:T.fontMono,fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.accentInk}}>Vue d'ensemble</h2>
      {collapsed&&<span style={{fontSize:FZ.sm,color:T.ink700}}><strong style={{color:T.teal600}}>{shippedYTD}</strong> expédiée{shippedYTD>1?"s":""} depuis le {SHIPPED_SINCE_LABEL}</span>}
      <button onClick={toggleCollapsed} title={collapsed?"Afficher la répartition":"Masquer la répartition"} aria-label={collapsed?"Afficher la répartition":"Masquer la répartition"} aria-expanded={!collapsed} style={{marginLeft:"auto",flexShrink:0,width:26,height:26,borderRadius:8,border:"none",background:"transparent",cursor:"pointer",color:T.ink300,display:"flex",alignItems:"center",justifyContent:"center"}}
        onMouseEnter={e=>{e.currentTarget.style.background=T.surface;}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{transform:collapsed?"rotate(180deg)":"rotate(0deg)",transition:"transform .18s ease"}}>
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </div>

    {!collapsed&&<div className="enogia-dash" style={{display:"flex",alignItems:"center",gap:28,flexWrap:"wrap",marginTop:18}}>
      <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:150,flexShrink:0}}>
        <div style={{fontSize:"clamp(44px,5vw,60px)",fontWeight:300,letterSpacing:"-.03em",color:T.ink900,fontFamily:T.fontDisplay,lineHeight:.95,fontVariantNumeric:"tabular-nums"}}><AnimatedNumber value={shippedYTD}/></div>
        <div style={{fontSize:FZ.sm,color:T.ink500}}>machine{shippedYTD>1?"s":""} livrée{shippedYTD>1?"s":""}<br/>depuis le {SHIPPED_SINCE_LABEL}</div>
      </div>

      <div className="enogia-dash-sep" style={{width:3,alignSelf:"stretch",background:T.teal500,flexShrink:0,borderRadius:1}}/>

      <div className="enogia-stagger" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"16px 28px",flex:1,minWidth:0}}>
        {DIMENSIONS.map(d=>{
          const all=breakdownsByDim[d.key],list=topOf(all),total=all.reduce((a,x)=>a+x.value,0),max=Math.max(1,...list.map(x=>x.value));
          return(<section key={d.key} aria-label={"Répartition par "+d.label.toLowerCase()} style={{minWidth:0}}>
            <div style={{display:"flex",alignItems:"baseline",marginBottom:8}}>
              <h3 style={{margin:0,fontSize:FZ.sm,fontWeight:500,color:T.ink900}}>Par {d.label.toLowerCase()}</h3>
              <span style={{marginLeft:"auto",fontSize:FZ.xs,color:T.ink500,fontVariantNumeric:"tabular-nums"}}>{total}</span>
            </div>
            {total===0?<div style={{fontSize:FZ.xs,color:T.ink500}}>Aucune machine avec ces filtres.</div>:d.key==="etat"?(<>
              {/* État : une barre découpée (part de chaque état), aux couleurs d'état. */}
              <div role="img" aria-label={all.map(x=>x.name+" "+x.value).join(", ")} className="enogia-bar-fill" style={{display:"flex",height:12,gap:3,marginBottom:8}}>
                {all.map(x=><div key={x.name} title={x.name+" : "+x.value} style={{flex:x.value,background:etatColor(x.name),borderRadius:2}}/>)}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {list.map(x=><div key={x.name} style={{display:"flex",alignItems:"center",gap:7,fontSize:FZ.xs,color:T.ink700}}>
                  <span aria-hidden="true" style={{width:8,height:8,borderRadius:2,flexShrink:0,background:x.other?T.ink100:etatColor(x.name)}}/>
                  <span title={x.name} style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0}}>{x.name}</span>
                  <span style={{marginLeft:"auto",fontWeight:700,color:T.ink900,fontVariantNumeric:"tabular-nums"}}>{x.value}</span>
                </div>)}
              </div>
            </>):(
              /* Gamme, pays, chef de projet : classement en barres horizontales triées, une seule teinte. */
              <div style={{display:"grid",gridTemplateColumns:"minmax(0,max-content) minmax(40px,1fr) max-content",alignItems:"center",gap:"5px 8px"}}>
                {list.map(x=><React.Fragment key={x.name}>
                  <span title={x.name} style={{fontSize:FZ.xs,color:T.ink700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:140}}>{x.name}</span>
                  <span aria-hidden="true" style={{height:10,borderRadius:2,background:T.surfaceAlt,overflow:"hidden"}}><span className="enogia-bar-fill" style={{display:"block",height:"100%",width:(x.value/max*100)+"%",background:x.other?T.ink300:T.teal500}}/></span>
                  <span style={{fontSize:FZ.xs,fontWeight:700,color:T.ink900,fontVariantNumeric:"tabular-nums",textAlign:"right"}}>{x.value}</span>
                </React.Fragment>)}
              </div>
            )}
          </section>);
        })}
      </div>
    </div>}
  </div>);
}
