// v289 (lot G « rapidité ») : sélecteur d'état et éditeur de présence sortis de ManagerParts.js, pour que la Liste
// ne charge pas les graphiques du Manager au démarrage. ManagerParts.js les ré-exporte (imports existants inchangés).
import React from "react";
import { T, FZ } from "../theme";
import { ETAT_META, ASSIGNABLE_ETATS, PRESENCE_META, presenceKind, presenceBg, presenceDates } from "../pjMeta";
import { fmt, toLocalISO } from "../parsers";
import { NavIcon } from "./SharedUI";
const NEW_ETAT="__NEW_ETAT__";
export function EtatSelect({value,onChange,onCreate,compact,pill}){
  const m=ETAT_META[value]||ETAT_META["A_DEFINIR"];
  const options=ASSIGNABLE_ETATS.includes(value)?ASSIGNABLE_ETATS:[value,...ASSIGNABLE_ETATS];
  // v333 (audit tablette) : pastille compacte (point + libellé coupé) ; la vraie liste est posée dessus, invisible : un toucher l ouvre
  if(pill)return(<span title={m.label} style={{position:"relative",display:"inline-flex",alignItems:"center",gap:6,maxWidth:118,minHeight:28,padding:"2px 10px 2px 8px",borderRadius:999,border:"1px solid "+m.text /* v349 : bord ≥ 3:1 (WCAG 1.4.11), encre de l'état */,background:m.bg,color:m.text,fontSize:FZ.xs,fontWeight:600,fontFamily:T.font,boxSizing:"border-box"}}>
    <i aria-hidden="true" style={{width:8,height:8,borderRadius:"50%",background:m.bar||m.text,flexShrink:0}}/>
    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{m.label}</span>
    <select aria-label={"État : "+m.label} value={value} onChange={e=>{if(e.target.value===NEW_ETAT){if(onCreate)onCreate();return;}onChange(e);}} style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",fontSize:16,border:"none",margin:0}}>
      {options.map(o=><option key={o} value={o} disabled={o===value&&!ASSIGNABLE_ETATS.includes(o)}>{(ETAT_META[o]||ETAT_META["A_DEFINIR"]).label}</option>)}
      {onCreate&&<option value={NEW_ETAT}>＋ Créer / gérer les états…</option>}
    </select></span>);
  return(<div style={{position:"relative",display:"inline-block"}}>
    <select aria-label="État de la machine" value={value} onChange={e=>{if(e.target.value===NEW_ETAT){if(onCreate)onCreate();return;}onChange(e);}} style={{appearance:"none",WebkitAppearance:"none",MozAppearance:"none",padding:compact?"2px 20px 2px 9px":"4px 24px 4px 12px",borderRadius:999,border:"1px solid "+m.text /* v349 : bord ≥ 3:1 (WCAG 1.4.11), encre de l'état */,background:m.bg,color:m.text,fontSize:FZ.xs,fontWeight:600,fontFamily:T.font,cursor:"pointer",minWidth:compact?0:150,maxWidth:"100%"}}>
      {options.map(o=><option key={o} value={o} disabled={o===value&&!ASSIGNABLE_ETATS.includes(o)} style={{background:T.card,color:T.ink900,fontWeight:600}}>{(ETAT_META[o]||ETAT_META["A_DEFINIR"]).label}</option>)}
      {onCreate&&<option value={NEW_ETAT} style={{background:T.card,color:T.teal600,fontWeight:600}}>＋ Créer / gérer les états…</option>}
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
      return(<button key={o.k||"none"} role="radio" aria-checked={on} onClick={()=>onChange(o.k)} style={{border:"none",cursor:"pointer",borderRadius:8,padding:"4px 8px",fontSize:FZ.xs,fontWeight:600,fontFamily:T.font,color:on?(o.k?PRESENCE_META[o.k].ink:T.ink900):T.ink500,background:on?(o.k?presenceBg(o.k):T.card):"transparent",boxShadow:on?(o.k&&!PRESENCE_META[o.k].color2?"inset 0 0 0 1px "+PRESENCE_META[o.k].color:T.shadowSm):"none",transition:"background .12s ease"}}>{o.label}</button>);
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
        {(kind==="both"?["client","nobo"]:[kind]).map(w=><label key={w} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:FZ.xs,fontWeight:600,color:PRESENCE_META[w].ink}}>
          <span style={{background:presenceBg(w),borderRadius:8,padding:"2px 8px"}}>{w==="client"?"Client":"NOBO"}</span>
          <input type="date" value={pDates[w]||""} min={minD||undefined} max={maxD||undefined} onChange={e=>onDate(w,e.target.value)}
            style={{padding:"3px 8px",borderRadius:8,border:"1.5px solid "+PRESENCE_META[w].color,fontSize:FZ.xs,fontFamily:T.font,color:T.ink700,fontWeight:600}}/>
        </label>)}
        <span style={{fontSize:FZ.xs,color:T.ink300}}>entre le {fmt(new Date(minD))} et le {fmt(new Date(maxD))}</span>
      </>)}
  </div>);
}

