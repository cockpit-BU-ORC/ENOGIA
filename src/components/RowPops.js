import React from "react";
import { T, FZ } from "../theme";
import { ETAT_META } from "../pjMeta";
import { fmtMode } from "../parsers";
import { STAGES } from "../prodStages";

// ── v162 : contenus des bulles de la liste (survol d'État, d'écart de départ et d'Avancement) ─────────────────────────
// Rien de nouveau n'est calculé ici : on ne fait que « déplier » ce que la ligne contient déjà.
const kick={fontSize:FZ.xs,fontWeight:600,letterSpacing: ".01em",color:T.ink500,marginBottom:8};
const d2=(d,df)=>d?fmtMode(new Date(d),df):"—";

export function EtatPopBody({r,df}){
  const order=STAGES.map(s=>s.id);
  const cur=r.etat==="SHIPPED"?order.length:order.indexOf(r.etat);
  const started=cur>=0;
  const dates={MONTAGE:null,ELEC:null,TESTS:r.tests,PACKAGING:r.finProd};
  const meta=ETAT_META[r.etat];
  return(<div>
    <div style={kick}>Étapes de la machine</div>
    {STAGES.map((s,i)=>{
      const done=started&&i<cur, now=started&&i===cur;
      const c=ETAT_META[s.id]?.bar||T.teal500;
      return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0",opacity:started&&!done&&!now?.55:1}}>
        <span style={{width:18,height:18,borderRadius:"50%",flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,background:done||now?c:"transparent",color:done||now?T.onFill:T.ink500,border:"1.5px solid "+(done||now?c:T.line)}}>{done?"✓":i+1}</span>
        <span style={{flex:1,fontWeight:now?600:500}}>{s.label}</span>
        <span style={{fontVariantNumeric:"tabular-nums",color:T.ink500,fontSize:FZ.xs}}>{dates[s.id]?d2(dates[s.id],df):""}</span>
      </div>);
    })}
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0",opacity:r.etat==="SHIPPED"?1:.55}}>
      <span style={{width:18,height:18,borderRadius:"50%",flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,background:r.etat==="SHIPPED"?ETAT_META.SHIPPED.bar:"transparent",color:r.etat==="SHIPPED"?T.onFill:T.ink500,border:"1.5px solid "+(r.etat==="SHIPPED"?ETAT_META.SHIPPED.bar:T.line)}}>{r.etat==="SHIPPED"?"✓":5}</span>
      <span style={{flex:1,fontWeight:r.etat==="SHIPPED"?600:500}}>Expédiée</span>
      <span style={{fontVariantNumeric:"tabular-nums",color:T.ink500,fontSize:FZ.xs}}>{d2(r.depart,df)}</span>
    </div>
    {!started&&r.etat!=="SHIPPED"&&<div style={{marginTop:6,color:T.ink500,fontSize:FZ.xs}}>État actuel : <b style={{color:T.ink900}}>{meta?.label||r.etat}</b> — production pas encore démarrée.</div>}
    {r.arrivee&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,color:T.ink500,fontSize:FZ.xs}}>Arrivée prévue le <b style={{color:T.ink900}}>{d2(r.arrivee,df)}</b></div>}
  </div>);
}

export function DriftPopBody({r,df}){
  const dr=r.drift;
  const init=r.depart&&dr!=null?new Date(new Date(r.depart).getTime()-dr*864e5):null;
  const late=dr>0, early=dr<0;
  const col=late?T.red500:early?T.emerald600:T.ink500;
  return(<div>
    <div style={kick}>Départ usine</div>
    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}>
      <span style={{fontSize:FZ.xxl,fontWeight:600,color:col,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{dr==null||dr===0?"0":(dr>0?"+":"")+dr}</span>
      <span style={{color:T.ink500}}>jour{Math.abs(dr)>1?"s":""} {late?"de retard":early?"d'avance":"d'écart"}</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px"}}>
      <span style={{color:T.ink500}}>Prévu initialement</span><b style={{textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{init?fmtMode(init,df):"—"}</b>
      <span style={{color:T.ink500}}>Prévu aujourd'hui</span><b style={{textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{d2(r.depart,df)}</b>
    </div>
  </div>);
}

export function AvPopBody({pval,etat}){
  const p=pval==null||isNaN(Number(pval))?null:Math.max(0,Math.min(100,Number(pval)));
  const seg=[["Mécanique",0,40],["Électrique",40,80],["Tests & packaging",80,100]];
  return(<div>
    <div style={kick}>Avancement de production</div>
    {p==null?<div style={{color:T.ink500}}>Pas encore d'avancement renseigné.</div>:seg.map(([l,a,b])=>{
      const f=Math.max(0,Math.min(1,(p-a)/(b-a)));
      return(<div key={l} style={{marginBottom:7}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span>{l}</span><span style={{fontVariantNumeric:"tabular-nums",color:T.ink500}}>{Math.round(f*100)}%</span></div>
        <div style={{height:5,borderRadius:4,background:T.surfaceAlt,overflow:"hidden"}}><div style={{width:f*100+"%",height:"100%",background:f>=1?T.emerald500:T.teal500,borderRadius:4}}/></div>
      </div>);
    })}
    <div style={{marginTop:6,paddingTop:8,borderTop:"1px solid "+T.line,color:T.ink500,fontSize:FZ.xs}}>Déduit de l'état de la machine ({ETAT_META[etat]?.label||etat}).</div>
  </div>);
}
