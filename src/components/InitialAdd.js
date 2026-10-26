import React, { useState, useMemo } from "react";
import { T, FZ } from "../theme";
import { fmt } from "../parsers";
import { NavIcon } from "./SharedUI";

// Ajout de nouveaux projets au planning initial SANS toucher à ceux déjà ancrés.
// Le fichier importé (même format que l'import initial) sert uniquement à repérer les PJ qui ne
// sont pas encore dans l'initial : ceux-ci sont proposés à l'ancrage (avec les dates du fichier,
// cochables un par un) ; les PJ déjà présents sont ignorés, leurs dates initiales ne bougent jamais.
const d=v=>v?fmt(new Date(v)):"—";
const DATE_KEYS=["arrivee","tests","testsFin","finProd","depart"];
const day=v=>v?String(v instanceof Date?v.toISOString():v).slice(0,10):null;

export function InitialAddReview({parsed,initialData,onConfirm,onCancel,busy}){
  const known=useMemo(()=>{const m={};(initialData||[]).forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const fresh=useMemo(()=>parsed.filter(r=>!known[r.pj]).sort((a,b)=>a.pj.localeCompare(b.pj)),[parsed,known]);
  const kept=useMemo(()=>parsed.filter(r=>known[r.pj]),[parsed,known]);
  const changed=useMemo(()=>kept.filter(r=>DATE_KEYS.some(k=>day(r[k])!==day(known[r.pj][k]))).sort((a,b)=>a.pj.localeCompare(b.pj)),[kept,known]);
  const [fix,setFix]=useState(()=>new Set());   // PJ déjà ancrés dont on veut remettre les dates du fichier (rien de coché par défaut)
  const toggleFix=pj=>setFix(s=>{const n=new Set(s);n.has(pj)?n.delete(pj):n.add(pj);return n;});
  const fixChosen=changed.filter(r=>fix.has(r.pj));
  const [off,setOff]=useState(()=>new Set());
  const chosen=fresh.filter(r=>!off.has(r.pj));
  const toggle=pj=>setOff(s=>{const n=new Set(s);n.has(pj)?n.delete(pj):n.add(pj);return n;});
  const th={textAlign:"left",padding:"6px 8px",fontSize:FZ.xs,fontWeight:700,color:T.ink500,whiteSpace:"nowrap"};
  const td={padding:"8px 8px",fontSize:FZ.sm,color:T.ink700,whiteSpace:"nowrap"};
  return(<div onClick={onCancel} style={{position:"fixed",inset:0,background:"rgba(10,20,30,.45)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:T.font}}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,boxShadow:T.shadowLg,border:"1px solid "+T.line,width:"min(640px,100%)",maxHeight:"88vh",overflow:"auto",padding:"20px 20px"}}>
      <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.lg,color:T.ink900,display:"flex",alignItems:"center",gap:8}}><NavIcon name="pin" size={18}/>Ajouter à l'initial</div>
      <div style={{fontSize:FZ.sm,color:T.ink500,marginTop:6,lineHeight:1.5}}>
        {fresh.length>0
          ?<>{fresh.length} nouveau{fresh.length>1?"x":""} projet{fresh.length>1?"s":""} trouvé{fresh.length>1?"s":""} dans le fichier. Ils seront ancrés avec les dates ci-dessous.</>
          :<>Aucun nouveau projet : tous les PJ du fichier sont déjà dans le planning initial.</>}
      </div>
      {fresh.length>0&&<div style={{marginTop:12,border:"1px solid "+T.line,borderRadius:12,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.surface}}><th style={th}></th><th style={th}>PJ</th><th style={th}>Arrivée</th><th style={th}>Tests</th><th style={th}>Fin prod</th><th style={th}>Départ</th></tr></thead>
          <tbody>{fresh.map(r=>{const on=!off.has(r.pj);return(
            <tr key={r.pj} onClick={()=>toggle(r.pj)} style={{cursor:"pointer",borderTop:"1px solid "+T.surfaceAlt,opacity:on?1:.45}}>
              <td style={td}><input type="checkbox" checked={on} onChange={()=>toggle(r.pj)} onClick={e=>e.stopPropagation()}/></td>
              <td style={{...td,fontFamily:T.fontMono,fontWeight:600,color:T.ink900}}>{r.pj}</td>
              <td style={td}>{d(r.arrivee)}</td><td style={td}>{d(r.tests)}{r.testsFin?" → "+d(r.testsFin):""}</td><td style={td}>{d(r.finProd)}</td><td style={{...td,fontWeight:600}}>{d(r.depart)}</td>
            </tr>);})}</tbody>
        </table>
      </div>}
      {changed.length>0&&<div style={{marginTop:12}}>
        <div style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,marginBottom:6}}>Corriger l'initial de PJ déjà ancrés <span style={{fontWeight:500,color:T.ink500}}>({fixChosen.length} coché{fixChosen.length>1?"s":""} · ancien → fichier)</span></div>
        <div style={{border:"1px solid "+T.line,borderRadius:12,overflow:"auto",maxHeight:260}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:T.surface,position:"sticky",top:0}}><th style={th}></th><th style={th}>PJ</th><th style={th}>Arrivée</th><th style={th}>Tests</th><th style={th}>Fin prod</th><th style={th}>Départ</th></tr></thead>
            <tbody>{changed.map(r=>{const on=fix.has(r.pj);const o=known[r.pj];
              const cell=(k,bold)=>{const a=day(o[k]),b=day(r[k]);return a===b?<span>{d(r[k])}</span>:<span style={{color:T.amber600,fontWeight:700}}>{d(o[k])} → {d(r[k])}</span>;};
              return(<tr key={r.pj} onClick={()=>toggleFix(r.pj)} style={{cursor:"pointer",borderTop:"1px solid "+T.surfaceAlt,background:on?T.teal100:"transparent"}}>
                <td style={td}><input type="checkbox" checked={on} onChange={()=>toggleFix(r.pj)} onClick={e=>e.stopPropagation()}/></td>
                <td style={{...td,fontFamily:T.fontMono,fontWeight:600,color:T.ink900}}>{r.pj}</td>
                <td style={td}>{cell("arrivee")}</td><td style={td}>{cell("tests")}</td><td style={td}>{cell("finProd")}</td><td style={td}>{cell("depart")}</td>
              </tr>);})}</tbody>
          </table>
        </div>
        <div style={{marginTop:6,fontSize:FZ.xs,color:T.ink300}}>Une copie de l'initial actuel est sauvegardée avant toute modification.</div>
      </div>}
      <div style={{marginTop:12,fontSize:FZ.sm,color:T.ink500,lineHeight:1.55,display:"flex",gap:8,alignItems:"flex-start"}}>
        <span style={{color:T.teal600,display:"inline-flex",marginTop:2}}><NavIcon name="pin" size={13}/></span>
        <span><b>{kept.length}</b> PJ déjà ancrés {changed.length>0?<>— dont <b>{changed.length}</b> avec des dates différentes dans ce fichier. Ils restent inchangés sauf si vous cochez ci-dessous ceux dont vous voulez <b>remettre les dates du fichier</b> comme référence initiale.</>:<>sont conservés tels quels.</>}</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
        <button onClick={onCancel} style={{padding:"8px 16px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:T.ink700,fontWeight:600,fontSize:FZ.sm,cursor:"pointer",fontFamily:T.font}}>Annuler</button>
        <button disabled={busy||(chosen.length+fixChosen.length)===0} onClick={()=>onConfirm(chosen,fixChosen)} style={{padding:"8px 16px",borderRadius:8,border:"none",background:(chosen.length+fixChosen.length)===0?T.ink100:T.navy700,color:"#fff",fontWeight:700,fontSize:FZ.sm,cursor:(chosen.length+fixChosen.length)===0||busy?"default":"pointer",fontFamily:T.font,opacity:busy?.7:1}}>{busy?"Enregistrement…":[chosen.length?"Ancrer "+chosen.length+" nouveau"+(chosen.length>1?"x":""):"",fixChosen.length?"Corriger "+fixChosen.length+" PJ":""].filter(Boolean).join(" + ")||"Ancrer"}</button>
      </div>
    </div>
  </div>);
}
