// v260 : sorti de App.js — bandeau de la version bêta et identité du compte connecté (en-tête).
import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { T, FZ } from "../theme";
import { BETA_DOCS } from "../appDocs";
import { NavIcon } from "./SharedUI";
import { askConfirm } from "../confirm";

// Bandeau de la version bêta + copie « production → bêta » (écrase les données de la bêta, jamais celles de la production).
export function BetaBanner({canCopy}){
  const [st,setSt]=useState("");
  const copy=async()=>{
    if(!(await askConfirm({title:"Copier la production vers la bêta ?",message:"Les données actuelles de la bêta seront remplacées. La production n'est pas modifiée.",confirmLabel:"Remplacer la bêta",danger:true})))return;
    setSt("Copie en cours…");let n=0;
    try{
      for(const name of BETA_DOCS){const snap=await getDoc(doc(db,"planning",name));if(snap.exists()){await setDoc(doc(db,"planning","beta_"+name),snap.data());n++;}}
      setSt("✓ "+n+" documents copiés depuis la production");
    }catch(e){console.error(e);setSt("Échec de la copie : "+e.message);}
    setTimeout(()=>setSt(""),8000);
  };
  return(<div style={{flexShrink:0,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",padding:"6px 28px",background:T.amber600,color:T.mode==="dark"?"#1B1405":"#fff",fontSize:FZ.sm,fontWeight:600,fontFamily:T.font}}>
    <span style={{letterSpacing:".08em"}}>VERSION BÊTA</span>
    <span style={{fontWeight:500,opacity:.95}}>Données de test séparées : rien de ce que vous faites ici n'affecte la production.</span>
    {canCopy&&<button onClick={copy} style={{marginLeft:"auto",padding:"4px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,.7)",background:"rgba(255,255,255,.15)",color:"#fff",fontWeight:600,fontSize:FZ.xs,cursor:"pointer",fontFamily:T.font}}>Copier la production vers la bêta</button>}
    {st&&<span style={{fontWeight:600}}>{st}</span>}
  </div>);
}


// ── Identité de l'utilisateur connecté, en haut de l'appli : on voit tout de suite
// sous quel compte on est, avec un accès direct à la déconnexion. ──
export function UserChip({user,onSignOut,role}){
  const [open,setOpen]=useState(false);
  const ref=React.useRef(null);
  useEffect(()=>{
    const onClick=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",onClick);
    return ()=>document.removeEventListener("mousedown",onClick);
  },[]);
  const name=user.displayName||user.email;
  const initial=(name||"?").trim().charAt(0).toUpperCase();
  return(<div ref={ref} style={{position:"relative"}}>
    <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,background:T.surfaceAlt,border:"none",borderRadius:999,padding:"4px 12px 4px 6px",cursor:"pointer",color:T.ink900}}>
      <span style={{width:26,height:26,borderRadius:"50%",background:T.teal500,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:FZ.sm,fontWeight:600,flexShrink:0}}>{initial}</span>
      <span className="enogia-user-name" style={{fontSize:FZ.sm,fontWeight:600,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:T.ink900}}>{name}</span>
    </button>
    {open&&<div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:T.card,borderRadius:12,boxShadow:T.shadowLg,padding:8,minWidth:200,zIndex:50}}>
      <div style={{padding:"6px 8px 8px",borderBottom:"1px solid "+T.line,marginBottom:6}}>
        <div style={{fontSize:FZ.sm,fontWeight:600,color:T.ink900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
        <div style={{fontSize:FZ.xs,color:T.ink500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
        {role&&<div style={{marginTop:4,display:"inline-block",fontSize:FZ.xs,fontWeight:600,color:role==="Super admin"?"#fff":T.teal600,background:role==="Super admin"?T.teal500:T.teal100,borderRadius:999,padding:"1px 8px"}}>{role}</div>}
      </div>
      <button onClick={onSignOut} style={{width:"100%",display:"flex",alignItems:"center",gap:8,background:"none",border:"none",borderRadius:8,padding:"8px 8px",fontSize:FZ.sm,fontWeight:600,color:T.red500,cursor:"pointer",textAlign:"left"}}><NavIcon name="logout" size={15}/>Se déconnecter</button>
    </div>}
  </div>);
}

