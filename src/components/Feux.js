import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { T, FZ } from "../theme";
import { getPjMeta, CountryFlag, SerieTag } from "../pjMeta";
import { fmt, diffDays } from "../parsers";
import { CARD, EmptyNote } from "./ManagerParts";
import { itemsOf, mitText } from "../pjProgress";

// ── Niveau de confiance par PJ : 4 feux (comme « Overall Project Status » du reporting PowerPoint) ──
// planning · cash in · risques / problèmes · communication client. Un feu = rouge (à risque),
// jaune (vigilance) ou vert (bon) ; pas de feu = non renseigné. Stocké par PJ dans
// planning/pjMetaOverrides (champs feux + feuxAt), donc jamais écrasé par un import MS Project.
export const FEUX=[["planning","Planning"],["cash","Cash in"],["risques","Risques / Problèmes"],["com","Communication client"]];
// Commentaires d'explication saisis dans la fiche synthèse (meta.notes) et repris dans le rapport CODIR :
// « sem » = actions de la semaine ; les autres clés accompagnent un feu ou un indicateur chiffré.
export const NOTE_LABELS={gen:"Commentaire général",sem:"Actions de la semaine",mit:"Plans de mitigation",gl:"Avancement global",planning:"Planning",cash:"Cash in",risques:"Risques / Problèmes",com:"Communication client",av:"Avancement",dr:"Dérive du départ",rt:"Retards",ct:"Contrat"};
export const NOTE_ORDER=["gen","sem","mit","planning","cash","risques","com","gl","av","dr","rt","ct"];
export const NOTE_MAX=200;
export const FEU_LEVELS=[["red","À risque"],["yellow","Vigilance"],["green","Bon"]];
// v123 : un seul orange pour « Vigilance » (T.amber500, 3,2:1 sur blanc : seuil des éléments graphiques) ;
// pour du TEXTE on prend feuText (amber600, 5,4:1) car l'ancien jaune #E3B505 n'atteignait que 1,9:1.
export const feuColor=l=>l==="red"?T.red500:l==="yellow"?T.amber500:l==="green"?T.emerald500:T.ink100;
export const feuText=l=>l==="yellow"?T.amber600:feuColor(l);
// Forme propre à chaque niveau pour ne pas dépendre de la seule couleur : carré (à risque), losange (vigilance), rond (bon).
const feuShape=(lv,size)=>lv==="red"?{width:size,height:size,borderRadius:Math.max(3,size/5)}:lv==="yellow"?{width:Math.round(size*.78),height:Math.round(size*.78),borderRadius:4,transform:"rotate(45deg)"}:{width:size,height:size,borderRadius:"50%"};
export const feuLabel=l=>(FEU_LEVELS.find(x=>x[0]===l)||[0,"Non renseigné"])[1];
export const feuxOf=meta=>(meta&&meta.feux)||{};
const RANK={red:3,yellow:2,green:1};
export const worstFeu=f=>Object.values(f||{}).reduce((w,l)=>(RANK[l]||0)>(RANK[w]||0)?l:w,null);
export const patchFeu=(meta,key,level)=>{
  const next={...feuxOf(meta)};
  if(level)next[key]=level;else delete next[key];
  const d=new Date();
  return{feux:next,feuxAt:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
};


// ── v146.12 : un feu « À risque » (rouge) exige un commentaire ; pour le Planning, un plan de mitigation en plus ────────────
// ask(pj, meta, axe, niveau) applique directement tout niveau autre que rouge ; pour le rouge il ouvre la fenêtre ci-dessous et
// n'enregistre qu'une fois le commentaire (et le plan de mitigation du Planning) saisi — le tout en UNE écriture.
export const openMitigations=meta=>itemsOf(meta,"mitigations").filter(x=>!x.done);
export const redNeeds=(meta,axis)=>{
  const out=[];const note=String(((meta&&meta.notes)||{})[axis]||"").trim();
  if(!note)out.push("un commentaire");
  if(axis==="planning"&&!openMitigations(meta).length)out.push("un plan de mitigation");
  return out;
};
export function useRedGate(onSave){
  const [pend,setPend]=useState(null);
  const ask=(pj,meta,axis,lv)=>{
    if(lv!=="red"){onSave(pj,patchFeu(meta,axis,lv));return;}
    if(feuxOf(meta)[axis]==="red")return;
    setPend({pj,meta,axis});
  };
  const dialog=pend?<RedGateDialog key={pend.pj+pend.axis} pj={pend.pj} meta={pend.meta} axis={pend.axis} onCancel={()=>setPend(null)} onConfirm={({comment,mitigation})=>{
    const {pj,meta,axis}=pend;const now=new Date().toISOString();
    const patch={...patchFeu(meta,axis,"red"),notes:{...((meta&&meta.notes)||{}),[axis]:comment},notesAt:now};
    if(mitigation){patch.mitigations=[...itemsOf(meta,"mitigations"),{id:"i"+Date.now().toString(36)+Math.random().toString(36).slice(2,4),risk:mitigation.risk,measure:mitigation.measure,text:mitText(mitigation.risk,mitigation.measure),deadline:mitigation.deadline,status:"todo",createdAt:now,done:false,doneAt:null,from:axis}];patch.mitAt=now;}
    setPend(null);onSave(pj,patch);
  }}/>:null;
  return{ask,dialog};
}
function RedGateDialog({pj,meta,axis,onCancel,onConfirm}){
  const lab=(FEUX.find(x=>x[0]===axis)||[0,axis])[1];
  const [comment,setComment]=useState(String(((meta&&meta.notes)||{})[axis]||""));
  const [risk,setRisk]=useState(""),[measure,setMeasure]=useState(""),[mdate,setMdate]=useState("");
  const open=openMitigations(meta);
  const needMit=axis==="planning"&&!open.length;
  const ok=!!comment.trim()&&(!needMit||(!!risk.trim()&&!!measure.trim()&&!!mdate));
  const ref=useRef(null);
  useEffect(()=>{if(ref.current)ref.current.focus();const k=e=>{if(e.key==="Escape")onCancel();};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[]); // eslint-disable-line
  const box={width:"100%",boxSizing:"border-box",fontFamily:T.font,fontSize:FZ.sm,lineHeight:1.4,color:T.ink900,background:T.surface,border:"1px solid "+T.line,borderRadius:8,padding:"7px 10px"};
  return createPortal(<div role="dialog" aria-modal="true" aria-label={"Statut à risque : "+lab} onClick={onCancel} style={{position:"fixed",inset:0,zIndex:20020,background:"rgba(10,16,28,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:12,boxShadow:T.shadowLg,border:"1px solid "+T.line,width:"min(480px,100%)",maxHeight: "92dvh",overflowY:"auto",fontFamily:T.font}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.line,display:"flex",alignItems:"center",gap:10}}>
        <span style={{width:14,height:14,borderRadius:4,background:T.red500,flexShrink:0}}/>
        <div style={{minWidth:0}}><div style={{fontSize:FZ.md||FZ.sm,fontWeight:600,color:T.ink900}}>{lab} : à risque</div><div style={{fontSize:FZ.xs,color:T.ink500}}>{pj}{meta&&meta.nomProjet?" · "+meta.nomProjet:""}</div></div>
      </div>
      <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12}}>
        <label style={{display:"block",fontSize:FZ.xs,fontWeight:500,color:T.ink700}}>Commentaire (obligatoire) — pourquoi ce statut ?
          <textarea ref={ref} value={comment} maxLength={NOTE_MAX} rows={3} onChange={e=>setComment(e.target.value)} placeholder="Cause, impact, échéance…" style={{...box,marginTop:4,resize:"vertical"}}/>
          <span style={{display:"block",textAlign:"right",fontSize:FZ.xs,color:T.ink300,fontWeight:500}}>{comment.length}/{NOTE_MAX}</span>
        </label>
        {axis==="planning"&&(needMit
          ?<div style={{display:"flex",flexDirection:"column",gap:8,padding:"10px",border:"1px solid "+T.line,borderRadius:8}}>
            <div style={{fontSize:FZ.xs,fontWeight:500,color:T.ink700}}>Plan de mitigation associé (obligatoire)</div>
            <label style={{fontSize:FZ.xs,fontWeight:500,color:T.ink500}}>Risque<input value={risk} onChange={e=>setRisk(e.target.value)} placeholder="Quel risque ?" style={{...box,marginTop:3}}/></label>
            <label style={{fontSize:FZ.xs,fontWeight:500,color:T.ink500}}>Ce qu'on fait pour l'éviter<input value={measure} onChange={e=>setMeasure(e.target.value)} placeholder="Mesure, responsable…" style={{...box,marginTop:3}}/></label>
            <label style={{fontSize:FZ.xs,fontWeight:500,color:T.ink500}}>Date<input type="date" value={mdate} onChange={e=>setMdate(e.target.value)} style={{...box,marginTop:3,width:"auto",colorScheme:T.mode==="dark"?"dark":"light"}}/></label>
          </div>
          :<div style={{fontSize:FZ.xs,color:T.ink500,background:T.surface,borderRadius:8,padding:"8px 10px"}}>Plan de mitigation : {open.length} ouvert{open.length>1?"s":""} sur ce projet (« {(open[0].text||"").slice(0,70)}{(open[0].text||"").length>70?"…":""} »). C'est celui qui accompagne ce statut ; vous pourrez en ajouter dans la fiche.</div>)}
      </div>
      <div style={{padding:"12px 18px",borderTop:"1px solid "+T.line,display:"flex",justifyContent:"flex-end",gap:8}}>
        <button type="button" onClick={onCancel} style={{padding:"7px 14px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink700,fontWeight:600,fontSize:FZ.sm,cursor:"pointer",fontFamily:T.font}}>Annuler</button>
        <button type="button" disabled={!ok} onClick={()=>onConfirm({comment:comment.trim(),mitigation:needMit?{risk:risk.trim(),measure:measure.trim(),deadline:mdate}:null})} style={{padding:"7px 16px",borderRadius:8,border:"none",background:ok?T.red500:T.line,color:ok?T.onFill:T.ink300,fontWeight:600,fontSize:FZ.sm,cursor:ok?"pointer":"not-allowed",fontFamily:T.font}}>Passer à risque</button>
      </div>
    </div>
  </div>,document.body);
}

// Trois pastilles cliquables ; recliquer sur la pastille choisie remet « non renseigné ».
export function FeuPicker({value,onChange,size=16,disabled}){
  return(<span style={{display:"inline-flex",alignItems:"center",gap:6}}>
    {FEU_LEVELS.map(([lv,lab])=>{
      const on=value===lv;const c=feuColor(lv);const sh=feuShape(lv,size);
      return(<button key={lv} type="button" disabled={disabled} title={lab+(on?" (cliquer pour effacer)":"")} aria-label={lab} aria-pressed={on} onClick={()=>onChange(on?null:lv)}
        style={{width:size+8,height:size+8,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",padding:0,cursor:disabled?"default":"pointer",opacity:value&&!on?.35:1}}>
        <span style={{...sh,boxSizing:"border-box",border:"2px solid "+c,background:on?c:"transparent",boxShadow:on?"0 0 0 3px "+c+"33":"none",transition:"background-color var(--e-dur-micro) ease, box-shadow var(--e-dur-micro) ease",display:"block"}}/>
      </button>);
    })}
  </span>);
}
export function FeuDot({value,size=12}){
  const sh=feuShape(value,size);
  return <span title={feuLabel(value)} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size}}><span style={{...sh,display:"block",background:value?feuColor(value):"transparent",border:"2px solid "+feuColor(value),boxSizing:"border-box"}}/></span>;
}

// ── Vue d'ensemble : tous les PJ × 4 feux, édition directe ──────────────────────────────────────────
export function SanteTab({rows,onSave}){
  const gate=useRedGate(onSave);
  const [hideEmpty,setHideEmpty]=useState(false);
  const metaOf=r=>getPjMeta(r.pj,r);
  const list=useMemo(()=>{
    const l=rows.map(r=>{const m=getPjMeta(r.pj,r);return{r,m,f:feuxOf(m)};});
    const sev=x=>{const v=Object.values(x.f);return v.filter(l=>l==="red").length*100+v.filter(l=>l==="yellow").length*10;};
    l.sort((a,b)=>sev(b)-sev(a)||a.r.pj.localeCompare(b.r.pj));
    return hideEmpty?l.filter(x=>Object.keys(x.f).length>0):l;
  },[rows,hideEmpty]);
  const counts=FEUX.map(([k])=>{const c={red:0,yellow:0,green:0,none:0};rows.forEach(r=>{const l=feuxOf(metaOf(r))[k];c[l||"none"]++;});return c;});
  const COLS="minmax(150px,1.3fr) 150px repeat(4,minmax(96px,1fr)) minmax(90px,.8fr) 78px";
  return(<div style={{...CARD,overflow:"hidden"}}>{gate.dialog}
    <div style={{padding:"12px 16px 8px",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
      <div>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.md,color:T.ink900}}>Santé des projets</div>
        <div style={{fontSize:FZ.sm,color:T.ink500,marginTop:2}}>Niveau de confiance par projet : cliquez sur un feu pour le fixer, recliquez pour l'effacer. Les projets les plus à risque sont en tête.</div>
      </div>
      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",fontSize:FZ.xs,color:T.ink500,fontWeight:500}}>
        {FEU_LEVELS.map(([lv,lab])=><span key={lv} style={{display:"inline-flex",alignItems:"center",gap:4}}><FeuDot value={lv} size={11}/>{lab}</span>)}
        <button onClick={()=>setHideEmpty(v=>!v)} style={{border:"1px solid "+(hideEmpty?T.teal500:T.line),background:hideEmpty?T.teal100:"transparent",color:hideEmpty?T.teal600:T.ink500,borderRadius:8,padding:"4px 8px",fontSize:FZ.xs,fontWeight:500,cursor:"pointer",fontFamily:T.font}}>Seulement les projets évalués</button>
      </div>
    </div>
    <div style={{overflowX:"auto"}}>
      <div style={{minWidth:920}}>
        <div style={{display:"grid",gridTemplateColumns:COLS,gap:12,padding:"8px 16px",background:T.surface,borderTop:"1px solid "+T.line,borderBottom:"1px solid "+T.line,fontSize:FZ.xs,fontWeight:500,color:T.ink300,letterSpacing: ".01em",alignItems:"end"}}>
          <span>PJ</span><span>S/N</span>
          {FEUX.map(([k,lab],i)=><span key={k} style={{lineHeight:1.2}}>{lab}
            <span style={{display:"flex",gap:8,marginTop:3,textTransform:"none",letterSpacing:0,fontWeight:600}}>
              {["red","yellow","green"].map(lv=><span key={lv} style={{color:feuText(lv)}}>{counts[i][lv]}</span>)}
              <span style={{color:T.ink300}}>· {counts[i].none} ?</span>
            </span></span>)}
          <span>Écart vs MaD ORC</span><span style={{textAlign:"right"}}>MAJ</span>
        </div>
        {list.length===0&&<EmptyNote>{hideEmpty?"Aucun projet évalué pour le moment.":"Aucun PJ à afficher."}</EmptyNote>}
        {list.map(({r,m,f})=>{
          const tf=m.contratTFin?new Date(m.contratTFin):null;const dep=r.depart?new Date(r.depart):null;
          const ec=tf&&dep?diffDays(tf,dep):null;
          return(<div key={r.pj} className="e-hov" style={{display:"grid",gridTemplateColumns:COLS,gap:12,alignItems:"center",padding:"8px 16px",borderBottom:"1px solid "+T.surface,"--e-hov-bg":T.surface}}>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontFamily:T.fontMono,fontWeight:600,fontSize:FZ.sm,color:T.teal600}}>{r.pj}</span><CountryFlag pays={m.pays} size={11}/></div>
              <div title={m.nomProjet||""} style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nomProjet||""}</div>
            </div>
            <div style={{minWidth:0}}><SerieTag pj={r.pj} style={{verticalAlign:"middle"}}/></div>
            {FEUX.map(([k])=><FeuPicker key={k} value={f[k]||null} onChange={lv=>gate.ask(r.pj,m,k,lv)}/>)}
            <span style={{fontSize:FZ.xs,fontWeight:500,color:ec==null?T.ink300:ec>0?T.red500:T.emerald600}}>{ec==null?(tf?"—":"MaD ORC non saisie"):ec===0?"dans les temps":(ec>0?"+":"")+ec+"j"}</span>
            <span style={{fontSize:FZ.xs,color:T.ink300,textAlign:"right"}}>{m.feuxAt?fmt(new Date(m.feuxAt)):"—"}</span>
          </div>);
        })}
      </div>
    </div>
  </div>);
}
