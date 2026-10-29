import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { T, FZF as FZ, D, statusSoft, stripeBg, stripeHues } from "../theme";
import { SerieTag, getPjMeta, CountryFlag, Avatar, GAMME_COLORS, ETAT_META, etatInk, PresenceChip, PRESENCE_META, presenceKind, presenceDates, presenceFirstDate, today, PjPlate, chefsOf, EpcTag } from "../pjMeta";
import { ChefsEpcEditor } from "./ChefsEpc";
import { fmt, diffDays } from "../parsers";
import { Badge, NavIcon, EmptyState, SuperOnly, pressable } from "./SharedUI";
import { CARD, EmptyNote, PieBlock, getDelayColors } from "./ManagerParts";
import { cashSummary, STATUS_LABEL, getCashinDoc } from "../cashinLink";
import { useCashin } from "../useCashin";
import { isSuperAdmin } from "../roles";
import { profileOf, pjsOfProfile } from "../profiles";
import { CdpDialog } from "./CdpReport";
import { CompCatalogDialog } from "./CompCatalog";
import { MentionPicker, MentionTextarea } from "./MentionPicker";
import { useMentions } from "../mentionContext";
import { typedMentions, mentionsOf, isOpenFor, isResolvedFor, countOpenFor, nameFromEmail, lc } from "../mentions";
import { CodirDialog } from "./CodirReport";
import { CashLinksDialog } from "./CashLinks";
import { MultiApplyDialog } from "./MultiApply";
import { ITEM_STATUS, itemStatus, statusPatch, mitText, mitParts, COMP_STEPS, itemsOf, sortedItems, composantsOf, getDefaultComposants, paiementsOf, compPct, payPct, globalProgress, montantOf, fmtEur } from "../pjProgress";
import { FicheContratPanel, CertifTag } from "./FicheContrat";
import { FEUX, FeuPicker, feuxOf, worstFeu, feuColor, feuText, feuLabel, NOTE_MAX, useRedGate, redNeeds } from "./Feux";

// ── Fiche projet (Manager) ─────────────────────────────────────────────────────────────────────
// Demandé : « la fiche projet manque cruellement de style, fais-nous une fiche plus dense en
// information ». Tout ce qu'on sait d'un PJ tient maintenant sur un seul écran : bandeau d'identité,
// tuiles chiffrées, frise des 4 jalons (initial / révisé / écart), présence aux tests, retards par
// cause et fil de commentaires. Aucune donnée nouvelle : tout vient des lignes déjà chargées.
const MS=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin de prod"],["depart","Départ"]];
const dOf=v=>v?new Date(v):null;
const fmtLong=d=>d?d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}):"—";
const driftColor=d=>d==null?T.ink300:d>0?T.red500:d<0?T.emerald600:T.ink500;
const signed=d=>d==null?"—":(d>0?"+":"")+d+"j";

// Mise en page éditoriale (même langage visuel que le rapport CODIR) : une grande carte unique, des blocs
// séparés par un filet fin, des chiffres généreux, un seul accent (laiton). Les textes saisis ici
// (commentaires de feux / d'indicateurs, actions de la semaine) sont repris tels quels dans les rapports (CODIR, chef de projet).
const Cap=({children,style})=><div style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk,...style}}>{children}</div>;
function Section({title,right,children,style}){
  // v129 : sous-titre de bloc (niveau 2) — la phrase en gras, sans majuscules ; le cadre thématique (Frame) porte le niveau 1.
  return(<div style={{minWidth:0,...style}}>
    {(title||right)&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
      {title&&<span style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900,whiteSpace:"nowrap",flexShrink:0}}>{title}</span>}
      <span style={{flex:1,height:1,background:T.line,minWidth:8}}/>
      {right&&<span style={{minWidth:0,maxWidth:"88%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block"}}>{right}</span>}
    </div>}
    {children}
  </div>);
}
// v129 : cadre par thème (Pilotage, Planning, Suivi…). Fond crème, filet, coin arrondi ; les tuiles à l'intérieur sont blanches.
function Frame({title,sub,right,children,style}){
  return(<section aria-label={title} style={{background:T.surface,border:"1px solid "+T.line,borderRadius:16,padding:D.mode==="compact"?"6px 10px 8px":"8px 12px 12px",display:"flex",flexDirection:"column",gap:D.mode==="compact"?4:8,minWidth:0,...style}}>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <span aria-hidden="true" style={{width:4,alignSelf:"stretch",minHeight:18,borderRadius:4,background:T.accent,flexShrink:0}}/>
      <span style={{fontSize:FZ.md,fontWeight:700,letterSpacing:"-.01em",color:T.ink900}}>{title}</span>
      {sub&&<span style={{fontSize:FZ.xs,color:T.ink500}}>{sub}</span>}
      {right&&<span style={{marginLeft:"auto",display:"inline-flex",alignItems:"center"}}>{right}</span>}
    </div>
    {children}
  </section>);
}
// v146.29 : une zone = plusieurs colonnes verticales côte à côte (3 ou 4 sections), qui s'empilent sur écran étroit
const Cols=({children,min=300})=><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax("+min+"px,1fr))",gap:D.mode==="compact"?8:14,alignItems:"start",minWidth:0}}>{children}</div>;
const Col=({children})=><div style={{display:"flex",flexDirection:"column",gap:D.mode==="compact"?8:12,minWidth:0}}>{children}</div>;
const Big=({children,color})=><div style={{fontFamily:T.font,fontSize:FZ.lg,fontWeight:500,letterSpacing:"-.02em",lineHeight:1,color:color||T.ink900,whiteSpace:"nowrap"}}>{children}</div>;

function ProgressBar({value,height=8,color}){
  const c=color||(value>=100?T.emerald500:value>=50?T.teal500:T.amber500);
  return(<div style={{background:T.surfaceAlt,borderRadius:999,height,overflow:"hidden",width:"100%"}}><div className="enogia-bar-fill" style={{width:Math.max(0,Math.min(100,value))+"%",height:"100%",background:c,borderRadius:999}}/></div>);
}
function Donut({v,size=42}){
  const r=(size-8)/2,c=2*Math.PI*r,m=size/2,col=v>=100?T.emerald500:T.teal500;
  return(<svg width={size} height={size} viewBox={"0 0 "+size+" "+size} style={{flexShrink:0}}>
    <circle cx={m} cy={m} r={r} fill="none" stroke={T.surfaceAlt} strokeWidth="6"/>
    {v>0&&<circle className="enogia-ring" cx={m} cy={m} r={r} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeDasharray={(c*Math.min(100,v)/100)+" "+c} transform={"rotate(-90 "+m+" "+m+")"}/>}
    <text x={m} y={m} textAnchor="middle" dominantBaseline="central" fontFamily={T.font} fontSize={size*.27} fontWeight="600" fill={T.ink900}>{v}%</text>
  </svg>);
}

// Zone de commentaire : enregistrée à la sortie du champ (ou Ctrl/Cmd+Entrée), Échap annule.
// Vide = discrète (pointillés) ; remplie = filet laiton. Le texte vide efface la note.
function NoteField({value,onSave,placeholder,max=NOTE_MAX,big}){
  const [v,setV]=useState(value||"");const [foc,setFoc]=useState(false);const [st,setSt]=useState("");
  useEffect(()=>{if(!foc)setV(value||"");},[value,foc]);
  const commit=async()=>{const t=v.trim();if(t===(value||"").trim()){setV(value||"");return;}setSt("…");const ok=await onSave(t);setSt(ok===false?"échec":"enregistré ✓");setTimeout(()=>setSt(""),1600);};
  const filled=!!(v||value);
  const ref=useRef(null);
  // Hauteur automatique : le champ s'agrandit avec le texte (rien de tronqué à l'écran).
  useLayoutEffect(()=>{const el=ref.current;if(!el)return;el.style.height="auto";el.style.height=(el.scrollHeight+2)+"px";},[v,foc]);
  return(<div style={{marginTop:4}}>
    <textarea ref={ref} value={v} maxLength={max} rows={1} placeholder={placeholder||"＋ Commentaire de synthèse"}
      onFocus={()=>setFoc(true)} onBlur={()=>{setFoc(false);commit();}} onChange={e=>setV(e.target.value)}
      onKeyDown={e=>{if(e.key==="Escape"){setV(value||"");e.currentTarget.blur();}else if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))e.currentTarget.blur();}}
      style={{width:"100%",boxSizing:"border-box",resize:"none",fontFamily:T.font,fontSize:big?FZ.sm:FZ.xs,lineHeight:1.4,color:T.ink700,background:foc?T.card:T.accent+(filled?"1c":"0d"),
        border:"1px "+(filled||foc?"solid":"dashed")+" "+(foc?T.teal500:filled?"transparent":T.accent+"88"),borderLeft:filled&&!foc?"3px solid "+T.accent:undefined,borderRadius:8,padding:big?"5px 10px":"2px 8px",outline:"none",display:"block"}}/>
    {(foc||st)&&<div style={{fontSize:FZ.xs,color:T.ink300,textAlign:"right",marginTop:2}}>{st||v.length+"/"+max+" · Échap pour annuler"}</div>}
  </div>);
}

// Frise des 4 jalons : un repère par étape (✓ passé, anneau laiton = en cours), date révisée en grand,
// date initiale barrée si elle a bougé, et l'écart en pastille (rouge = glissement).
function Timeline({r,ini,kind}){
  return(<div style={{position:"relative",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))"}}>
    <div style={{position:"absolute",left:"12.5%",right:"12.5%",top:7,height:2,background:T.line}}/>
    {MS.map(([k,label],i)=>{
      const rv=dOf(r[k]);const iv=ini?dOf(ini[k]):null;
      const delta=rv&&iv?diffDays(iv,rv):null;
      const past=rv&&rv<=today;
      const next=!past&&rv&&(i===0||(dOf(r[MS[i-1][0]])||0)<=today);
      const mk=past?{background:T.navy700,border:"2px solid "+T.navy700}:next?{background:T.card,border:"3px solid "+T.accent,boxShadow:"0 0 0 4px "+T.accent+"33"}:{background:T.card,border:"2px solid "+(rv?T.ink300:T.line)};
      return(<div key={k} style={{position:"relative",textAlign:"center",padding:"0 6px",minWidth:0}}>
        <div style={{width:16,height:16,borderRadius:"50%",boxSizing:"border-box",margin:"0 auto 4px",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:FZ.xs,fontWeight:800,...mk}}>{past?"✓":""}</div>
        <Cap>{label}</Cap>
        <div style={{fontSize:FZ.sm,fontWeight:600,color:T.ink900,marginTop:2,whiteSpace:"nowrap",letterSpacing:"-.01em"}}>{rv?fmtLong(rv):"—"}</div>
        {k==="tests"&&r.testsFin&&<div style={{fontSize:FZ.xs,color:T.ink300,marginTop:1}}>→ {fmtLong(dOf(r.testsFin))}</div>}
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:2,minHeight:16}}>
          {iv&&delta!==0&&<span style={{fontSize:FZ.xs,color:T.ink300,textDecoration:"line-through"}}>{fmt(iv)}</span>}
          {delta!=null&&delta!==0&&<span style={{fontSize:FZ.xs,fontWeight:800,color:driftColor(delta),background:delta>0?T.red100:T.emerald100,borderRadius:999,padding:"1px 8px"}}>{signed(delta)}</span>}
          {delta===0&&<span style={{fontSize:FZ.xs,fontWeight:700,color:T.emerald600}}>conforme</span>}
        </div>
        {k==="tests"&&kind&&<div style={{marginTop:4}}><PresenceChip kind={kind} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} compact/></div>}
      </div>);
    })}
  </div>);
}


// ── Écriture dans la fiche (accès Manager) : ajouter / supprimer commentaires et causes de retard ──
// Mêmes fonctions et mêmes données que la fiche du tableau et l'onglet Retards, rien de nouveau côté stockage.
// Getters : les couleurs suivent le thème (clair / sombre) à chaque rendu au lieu d'être figées à l'import.
const FIELD={padding:"4px 8px",borderRadius:8,get border(){return "1px solid "+T.line;},get background(){return T.card;},get color(){return T.ink900;},fontSize:FZ.xs,get fontFamily(){return T.font;},minWidth:0};
const BTN=(on)=>({border:"none",borderRadius:8,padding:"6px 12px",fontSize:FZ.xs,fontWeight:700,fontFamily:T.font,cursor:on?"pointer":"default",background:on?T.navy700:T.ink100,color:"#fff",flexShrink:0});
function CommentComposer({onAdd,options,me,info,pj}){
  const [text,setText]=useState("");const [priv,setPriv]=useState(false);const [busy,setBusy]=useState(false);
  const ok=text.trim().length>0&&!busy;
  const tagged=typedMentions(text,options);
  const submit=async()=>{if(!ok)return;setBusy(true);const done=await onAdd(text,priv,tagged.map(o=>o.email));setBusy(false);if(done){setText("");}};
  return(<div style={{marginBottom:8,background:T.card,borderRadius:12,padding:8}}>
    <MentionTextarea options={options} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))submit();}} rows={2} placeholder="Écrire un commentaire… (utilisez les puces @ pour taguer un manager)" style={{...FIELD,width:"100%",resize:"vertical",boxSizing:"border-box"}}/>
    <MentionPicker text={text} options={options} pjs={[pj]}/>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:6,flexWrap:"wrap"}}>
      <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:FZ.xs,color:priv?T.amber600:T.ink500,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={priv} onChange={e=>setPriv(e.target.checked)}/>Privé (visible des seuls accès Manager)</label>
      <button onClick={submit} disabled={!ok} style={BTN(ok)}>{busy?"Envoi…":"Publier"}</button>
    </div>
  </div>);
}
function DelayComposer({types,onAdd,onNewType}){
  const [type,setType]=useState((types&&types[0])||"");const [days,setDays]=useState("");const [note,setNote]=useState("");const [busy,setBusy]=useState(false);
  const [creating,setCreating]=useState(false);const [newType,setNewType]=useState(""); // v146.14 : créer une cause de retard sans quitter la fiche
  const NEW="__new__";
  const n=Number(days);const ok=!!type&&days!==""&&!isNaN(n)&&n!==0&&!busy;
  const submit=async()=>{if(!ok)return;setBusy(true);const done=await onAdd(type,n,note);setBusy(false);if(done){setDays("");setNote("");}};
  const createType=async()=>{const v=newType.trim();if(!v)return;if(!(types||[]).includes(v)&&onNewType)await onNewType([...(types||[]),v]);setType(v);setNewType("");setCreating(false);};
  return(<div style={{marginBottom:8,background:T.card,borderRadius:12,padding:8,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
    {creating?<>
      <input autoFocus type="text" value={newType} maxLength={60} onChange={e=>setNewType(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createType();if(e.key==="Escape")setCreating(false);}} placeholder="Nom de la nouvelle cause de retard" style={{...FIELD,flex:"1 1 200px"}}/>
      <button onClick={createType} disabled={!newType.trim()} style={BTN(!!newType.trim())}>Créer la cause</button>
      <button onClick={()=>{setCreating(false);setNewType("");}} style={{border:"none",background:"transparent",color:T.ink500,cursor:"pointer",fontFamily:T.font,fontSize:FZ.sm,fontWeight:600}}>Annuler</button>
    </>:<>
      <select value={type} onChange={e=>{if(e.target.value===NEW)setCreating(true);else setType(e.target.value);}} style={{...FIELD,flex:"1 1 150px"}}>{(types||[]).map(t=><option key={t} value={t}>{t}</option>)}{onNewType&&<option value={NEW}>＋ Nouvelle cause…</option>}</select>
      <input type="number" value={days} onChange={e=>setDays(e.target.value)} placeholder="jours" style={{...FIELD,width:70}}/>
      <input type="text" value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submit();}} placeholder="Précision (facultatif)" style={{...FIELD,flex:"2 1 160px"}}/>
      <button onClick={submit} disabled={!ok} style={BTN(ok)}>{busy?"…":"Ajouter"}</button>
    </>}
  </div>);
}
const TrashBtn=({onClick,title})=><SuperOnly><button onClick={onClick} title={title} style={{border:"none",background:"transparent",color:T.ink300,cursor:"pointer",fontSize:FZ.md,lineHeight:1,padding:"0 3px"}} onMouseEnter={e=>e.currentTarget.style.color=T.red500} onMouseLeave={e=>e.currentTarget.style.color=T.ink300}><NavIcon name="close" size={11}/></button></SuperOnly>;

// ── Statut global : 4 feux de confiance (planning / cash / risques / communication client) ──────────
// v124 : seuls les axes évalués ont leur carte (avec commentaire) ; les axes « Non évalué » sont repliés sur une seule ligne
// qui garde le sélecteur de feu, donc rien n'est perdu et l'évaluation reste à un clic.
function StatutGlobal({meta,pj,onSave,onNote}){
  const gate=useRedGate((_pj,patch)=>onSave(patch)); // rouge = commentaire obligatoire (+ plan de mitigation pour le Planning)
  const f=feuxOf(meta);
  const w=worstFeu(f);
  const notes=meta.notes||{};
  const ev=FEUX.filter(([k])=>f[k]),ne=FEUX.filter(([k])=>!f[k]);
  return(<Section title="Statut global" right={<span style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap"}}>{gate.dialog}{meta.feuxAt?"évalué le "+fmt(new Date(meta.feuxAt)):"non évalué"}{w?" · pire niveau : "+feuLabel(w).toLowerCase():""}</span>}>
    {ev.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8,alignItems:"stretch"}}>
      {ev.map(([k,lab])=>{const lv=f[k];return(
        <div key={k} className="enogia-pilot-card" style={{background:T.card,borderRadius:8,padding:"6px 8px",minWidth:0,display:"flex",flexDirection:"column"}}>
          <Cap>{lab}</Cap>
          <div style={{marginTop:3,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <span style={{fontSize:FZ.sm,fontWeight:600,color:feuText(lv),letterSpacing:"-.01em"}}>{feuLabel(lv)}</span>
            <FeuPicker value={lv} onChange={v=>gate.ask(pj,meta,k,v)} size={16}/>
          </div>
          <NoteField value={notes[k]} onSave={t=>lv==="red"&&!String(t||"").trim()?false:onNote(k,t)} placeholder={lv==="red"?"Commentaire obligatoire (statut à risque)":"＋ Commentaire de synthèse"}/>
          {lv==="red"&&redNeeds(meta,k).length>0&&<div role="alert" style={{marginTop:3,fontSize:FZ.xs,fontWeight:700,color:T.red600}}>À renseigner : {redNeeds(meta,k).join(" et ")}</div>}
        </div>);})}
    </div>}
    {ne.length>0&&<div role="group" aria-label="Axes non évalués" style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"2px 18px",marginTop:ev.length?8:0,padding:"3px 8px",borderRadius:8,background:T.card}}>
      <Cap>{ev.length?"Non évalués":"Aucun axe évalué"}</Cap>
      {ne.map(([k,lab])=>(<span key={k} style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:FZ.xs,color:T.ink500}}>{lab}<FeuPicker value={null} onChange={v=>gate.ask(pj,meta,k,v)} size={16}/></span>))}
    </div>}
  </Section>);
}

// ── v124 : synthèse de tête de fiche — trois chiffres pour répondre à « où en est ce PJ ? » avant de lire le détail ──
// Départ (date + écart au planning initial), prochain jalon, ce qui reste à traiter (actions + mitigations ouvertes).
function Synthese({r,ini,meta}){
  useCashin();
  const pays=paiementsOf(meta,r.pj),cs=cashSummary(pays); // V146.1 : tuile « Prochain paiement » seulement quand le Cash in est lié
  const dp=dOf(r.depart),di=ini?dOf(ini.depart):null;
  const drift=di&&dp?diffDays(di,dp):null;
  const nxt=MS.map(([k,l])=>[l,dOf(r[k])]).find(([,d])=>d&&d>today);
  const nA=itemsOf(meta,"actions").filter(x=>!x.done).length,nM=itemsOf(meta,"mitigations").filter(x=>!x.done).length;
  const tile=(label,main,sub,col,soft,wide)=>(<div style={{gridColumn:wide?"1 / -1":undefined,background:soft?stripeBg(soft.ring,soft.bg,3):stripeBg(stripeHues().brand,T.card,3),border:soft?"1px solid "+soft.ring:"none",borderRadius:8,padding:"9px 8px 6px",minWidth:0}}>
    <Cap style={soft?{color:soft.ink}:undefined}>{label}</Cap>
    <div style={{fontSize:FZ.md,fontWeight:700,letterSpacing:"-.01em",lineHeight:"22px",marginTop:1,color:soft?soft.ink:(col||T.ink900),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{main}</div>
    <div style={{fontSize:FZ.xs,color:soft?soft.ink:T.ink500,marginTop:1,lineHeight:1.3}}>{sub}</div>
  </div>);
  const SS=statusSoft();
  let payTile=null;
  if(cs){
    if(cs.lateN>0)payTile=tile("Prochain paiement",fmtEur(cs.late),"en retard · "+cs.lateN+" jalon"+(cs.lateN>1?"s":"")+(cs.next&&cs.next.k!=="late"?" · puis "+cs.next.due.kind+" "+fmt(new Date(cs.next.due.date+"T00:00:00")):""),null,SS.late,true);
    else if(cs.next){const dd=cs.next.due.days;payTile=tile("Prochain paiement",fmtEur(cs.next.montant),cs.next.due.kind+" "+fmt(new Date(cs.next.due.date+"T00:00:00"))+" · "+(dd<0?Math.abs(dd)+" j de retard":dd===0?"aujourd'hui":"dans "+dd+" j"),null,cs.next.tone==="warn"||dd<=15?SS.warn:null,true);}
    else payTile=tile("Prochain paiement",cs.allEpc?"EPC":"Soldé",cs.allEpc?"pas de suivi de paiement":"tous les jalons sont encaissés",null,cs.allEpc?null:SS.paid,true);
  }
  return(<div role="group" aria-label="Synthèse du projet" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6}}>
    {tile("Départ",dp?fmtLong(dp):"—",drift==null?"pas de planning initial":drift===0?"conforme au planning initial":Math.abs(drift)+" j "+(drift>0?"de retard":"d'avance")+" sur l'initial",drift>0?T.red500:drift<0?T.emerald600:null)}
    {tile("Prochain jalon",nxt?fmt(nxt[1]):"Aucun",nxt?nxt[0]+" · dans "+diffDays(today,nxt[1])+" j":"tous les jalons sont passés")}
    {tile("À traiter",nA+nM,nA+nM===0?"rien d'ouvert":nA+" action"+(nA>1?"s":"")+" · "+nM+" mitigation"+(nM>1?"s":""),nA+nM>0?T.amber600:null)}
    {payTile}
  </div>);
}

// ── Contrat & échéances (T0 / Tfin contractuels) ────────────────────────────────────────────────
// Demandé : pouvoir saisir, pour chaque PJ, les dates contractuelles (T0 = début, Tfin = fin) — par
// tous les accès Manager. Stockées avec les autres corrections de fiche projet (planning/pjMetaOverrides,
// champs contratT0 / contratTFin), donc jamais écrasées par un import MS Project. La fin projetée est le
// départ prévu du planning à jour ; l'écart avec Tfin est en rouge quand le départ dépasse le contrat.
// Les futurs champs de reporting (confiance planning / finance / risques / communication client) viendront
// s'ajouter dans le même emplacement.
function DateField({label,value,onSave,hint}){
  const [v,setV]=useState(value||"");
  React.useEffect(()=>{setV(value||"");},[value]);
  const dirty=(v||"")!==(value||"");
  return(<div style={{minWidth:0}}>
    <div style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk}}>{label}</div>
    <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
      <input type="date" value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{if(dirty)onSave(v||null);}}
        onKeyDown={e=>{if(e.key==="Enter"&&dirty){onSave(v||null);e.currentTarget.blur();}}}
        style={{padding:"4px 8px",borderRadius:8,border:"1.5px solid "+(dirty?T.teal500:T.line),background:T.card,color:T.ink900,fontSize:FZ.sm,fontWeight:700,fontFamily:T.font,colorScheme:T.mode==="dark"?"dark":"light",minWidth:0,width:"100%",maxWidth:150}}/>
      {value&&<button title="Effacer" onClick={()=>onSave(null)} style={{border:"none",background:"transparent",color:T.ink300,cursor:"pointer",fontSize:FZ.md,lineHeight:1,padding:"0 2px"}}><NavIcon name="close" size={11}/></button>}
    </div>
    {hint&&<div style={{fontSize:FZ.xs,color:T.ink300,marginTop:2}}>{hint}</div>}
  </div>);
}
function MontantField({value,onSave}){
  const [v,setV]=useState(value==null?"":String(value));
  useEffect(()=>{setV(value==null?"":String(value));},[value]);
  const num=v===""?null:Number(String(v).replace(/\s/g,"").replace(",","."));
  const dirty=(num||null)!==(value||null);
  const commit=()=>{if(!dirty||(num!=null&&(isNaN(num)||num<0)))return;onSave(num);};
  return(<div style={{minWidth:0}}>
    <div style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk}}>Montant global</div>
    <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
      <input type="text" inputMode="decimal" value={v} onChange={e=>setV(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}} placeholder="0"
        style={{padding:"4px 8px",borderRadius:8,border:"1.5px solid "+(dirty?T.teal500:T.line),background:T.card,color:T.ink900,fontSize:FZ.sm,fontWeight:700,fontFamily:T.font,minWidth:0,width:"100%",maxWidth:120,textAlign:"right"}}/>
      <span style={{fontSize:FZ.sm,fontWeight:700,color:T.ink500}}>€</span>
    </div>
    <div style={{fontSize:FZ.xs,color:T.ink300,marginTop:2}}>{value?fmtEur(value):"non renseigné"}</div>
  </div>);
}
function ContratSection({r,meta,onSave,onNote}){
  const t0=meta.contratT0||"",tf=meta.contratTFin||"";
  const dT0=dOf(t0),dTf=dOf(tf),dep=dOf(r.depart);
  const ecart=dTf&&dep?diffDays(dTf,dep):null;     // + = départ prévu après la fin contractuelle
  const duree=dT0&&dTf?diffDays(dT0,dTf):null;
  const bad=dT0&&dTf&&dTf<dT0;
  // Frise : T0 → Tfin (contrat) puis dépassement éventuel jusqu'au départ prévu ; repère « aujourd'hui »
  const pts=[dT0||dOf(r.arrivee),dTf,dep,today].filter(Boolean);
  const lo=pts.length?Math.min(...pts.map(d=>+d)):+today,hi=pts.length?Math.max(...pts.map(d=>+d)):+today;
  const span=Math.max(hi-lo,86400000*7);
  const pos=d=>d?Math.max(0,Math.min(100,(+d-lo)/span*100)):null;
  const a=pos(dT0||dOf(r.arrivee)),b=pos(dTf),c=pos(dep),n=pos(today);
  const late=ecart!=null&&ecart>0;
  const shipped=r.etat==="SHIPPED",endLab=shipped?"Tf final":"Fin projetée";   // projet expédié : la fin projetée devient le Tf final
  return(<Section title="Contrat & roadmap" right={<span style={{fontSize:FZ.xs,color:T.ink500}}><Gloss t="MaD ORC : mise à disposition de l'ORC, c'est-à-dire la fin contractuelle, hors transport vers le site client">MaD ORC</Gloss> = hors transport · Livraison = transport inclus</span>}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(112px,1fr))",gap:8,alignItems:"start"}}>
      <MontantField value={montantOf(meta)} onSave={n=>onSave({montantContrat:n})}/>
      <DateField label="T0 · début" value={t0} onSave={v=>onSave({contratT0:v})} hint={dT0?"":"non renseigné"}/>
      <DateField label="MaD ORC" value={tf} onSave={v=>onSave({contratTFin:v})} hint={dTf?"fin contractuelle, hors transport":"non renseignée"}/>
      <DateField label="Livraison contr." value={meta.contratLivr||""} onSave={v=>onSave({contratLivr:v||undefined})} hint={meta.contratLivr?"transport inclus":"non renseignée"}/>
      <DateField label="Livraison prévue" value={meta.livrPrevue||""} onSave={v=>onSave({livrPrevue:v||undefined})} hint={meta.livrPrevue?"":"à saisir"}/>
      <div style={{minWidth:0}}>
        <div style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk}}>{endLab}</div>
        <div style={{fontWeight:600,fontSize:FZ.sm,letterSpacing:"-.01em",color:late?T.red500:T.ink900,marginTop:4}}>{dep?fmt(dep):"—"}</div>
        <div style={{fontSize:FZ.xs,color:T.ink300,marginTop:2}}>{shipped?"départ effectif":"départ prévu du planning"}</div>
      </div>
      <div style={{minWidth:0}}>
        <div style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk}}>Écart vs MaD ORC</div>
        <div style={{fontWeight:600,fontSize:FZ.sm,letterSpacing:"-.01em",color:ecart==null?T.ink300:late?T.red500:T.emerald600,marginTop:4}}>{ecart==null?"—":ecart===0?"dans les temps":signed(ecart)}</div>
        <div style={{fontSize:FZ.xs,color:T.ink300,marginTop:2}}>{duree!=null?"durée contrat "+duree+" j":bad?"MaD ORC avant T0 ?":"renseignez T0 et MaD ORC"}</div>
      </div>
    </div>
    {bad&&<div style={{marginTop:8,fontSize:FZ.xs,color:T.amber600,background:T.amber100,borderRadius:8,padding:"4px 8px",display:"inline-flex",alignItems:"center",gap:6}}><NavIcon name="warning" size={12}/>La date de MaD ORC est avant le début : vérifiez la saisie.</div>}
    {(dTf||dT0)&&<div style={{marginTop:6,position:"relative",height:52}}>
      <div style={{position:"absolute",left:0,right:0,top:20,height:6,background:T.surfaceAlt,borderRadius:8}}/>
      {a!=null&&b!=null&&b>a&&<div style={{position:"absolute",left:a+"%",width:(b-a)+"%",top:20,height:6,background:T.teal500,borderRadius:8}}/>}
      {b!=null&&c!=null&&c>b&&<div style={{position:"absolute",left:b+"%",width:(c-b)+"%",top:20,height:6,background:T.red500,borderRadius:8}} title={"Dépassement "+(ecart)+" j"}/>}
      {/* repères : MaD ORC au-dessus de la barre, T0 et fin projetée en dessous → jamais de texte superposé même quand les dates sont proches */}
      {[[a,"T0",T.teal600,false],[b,"MaD ORC",T.navy700,true],[c,shipped?"Tf final":"Fin proj.",late?T.red500:T.ink700,false]].map(([x,lab,col,above],i)=>x==null?null:
        <React.Fragment key={i}>
          <div style={{position:"absolute",left:x+"%",top:above?13:17,height:above?14:18,width:2,background:col,transform:"translateX(-1px)"}}/>
          <div style={{position:"absolute",left:x+"%",top:above?0:36,transform:x>88?"translateX(-100%)":x<12?"none":"translateX(-50%)",fontSize:FZ.xs,fontWeight:800,color:col,whiteSpace:"nowrap",lineHeight:"12px"}}>{lab}</div>
        </React.Fragment>)}
      {n!=null&&<div title="Aujourd'hui" style={{position:"absolute",left:n+"%",top:19,width:10,height:10,borderRadius:"50%",background:T.card,border:"2px solid "+T.ember500,transform:"translateX(-50%)"}}/>}
    </div>}
    <NoteField value={(meta.notes||{}).ct} onSave={t=>onNote("ct",t)} placeholder="＋ Commentaire sur la MaD ORC / l'écart avec le contrat"/>
  </Section>);
}


// ── Actions de la semaine / Plans de mitigation : listes de puces, clôturables avec une date ───────────────────
// Chaque puce se coche pour être clôturée (date du jour par défaut, modifiable). Les puces clôturées passent en bas,
// barrées. Stockage : meta.actions / meta.mitigations (corrections de fiche, jamais écrasées par un import).
const isoWeek=d=>{const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y0)/86400000+1)/7);};
export const todayIso=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
// Date de saisie d'une puce (JJ/MM/AA, avec l'heure en infobulle). Les puces reprises de l'ancien texte libre (id « l0 », « l1 »…)
// n'ont pas de vraie date de saisie : on n'affiche rien plutôt qu'une date approximative.
export const enteredOn=x=>{if(!x||!x.createdAt||/^l\d+$/.test(x.id))return null;const d=new Date(x.createdAt);if(isNaN(d))return null;
  return{short:d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit"}),full:d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})+" à "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})};};
// v146.19 — Chaque ligne est structurée : action = [action · état · date] ; mitigation = [risque · ce qu'on fait pour l'éviter · état · date].
const ST_COLOR={get todo(){return T.ink500;},get doing(){return T.info500;},get blocked(){return T.red500;},get done(){return T.emerald600;}};
const Lab=({label,children,grow=180})=><label style={{display:"flex",flexDirection:"column",gap:2,flex:"1 1 "+grow+"px",minWidth:0}}><span style={{fontSize:FZ.xs,fontWeight:700,color:T.ink500}}>{label}</span>{children}</label>;
const StatusSelect=({value,onChange,label})=><select value={value} onChange={e=>onChange(e.target.value)} aria-label={label} style={{...FIELD,fontWeight:700,padding:"3px 6px",color:ST_COLOR[value],border:"1.5px solid "+ST_COLOR[value]}}>{ITEM_STATUS.map(([k,l])=><option key={k} value={k} style={{background:T.card,color:T.ink900}}>{l}</option>)}</select>;
function ItemsSection({title,kind,meta,field,atKey,color,showWeek,onSave,onGroup}){
  const mit=kind==="mitigations";
  const src=itemsOf(meta,field);const key=JSON.stringify(src);
  const [items,setItems]=useState(src);
  const [a,setA]=useState(""),[b,setB]=useState(""),[nd,setNd]=useState(""),[ns,setNs]=useState("todo"); // a = action ou risque, b = mesure
  useEffect(()=>{setItems(src);},[key]); // eslint-disable-line
  const save=next=>{setItems(next);onSave({[field]:next,[atKey]:new Date().toISOString()});};
  const patch=(id,f)=>{
    save(items.map(x=>x.id===id?{...x,...f}:x));
    // une ligne saisie sur plusieurs projets peut être clôturée / rouverte d'un coup sur les autres
    const x=items.find(i=>i.id===id);
    if(onGroup&&x&&x.groupId&&Array.isArray(x.groupPjs)&&x.groupPjs.length>1&&("done" in f)&&window.confirm("Cette ligne a été saisie sur "+x.groupPjs.length+" projets ("+x.groupPjs.join(", ")+").\nL'appliquer aussi aux autres ?"))onGroup(x,field,atKey,f);
  };
  const canAdd=!!a.trim()&&(!mit||!!b.trim())&&!!nd;
  const add=()=>{
    if(!canAdd)return;
    const base={id:"i"+Date.now().toString(36)+Math.random().toString(36).slice(2,4),createdAt:new Date().toISOString(),deadline:nd,...statusPatch(null,ns,todayIso())};
    save([...items,mit?{...base,risk:a.trim(),measure:b.trim(),text:mitText(a,b)}:{...base,text:a.trim()}]);
    setA("");setB("");setNd("");setNs("todo");
  };
  const at=meta[atKey]?new Date(meta[atKey]):null;
  const open=items.filter(x=>!x.done).length,closed=items.length-open;
  const list=sortedItems(items);
  const inp=(val,onCommit,ph,x)=><input defaultValue={val} key={x.id+"|"+val} placeholder={ph} onBlur={e=>{const t=e.target.value.trim();if(t&&t!==val)onCommit(t);else if(!t)e.target.value=val;}} style={{...FIELD,width:"100%",boxSizing:"border-box",fontWeight:x.done?400:600,color:x.done?T.ink300:T.ink900,textDecoration:x.done?"line-through":"none"}}/>;
  const dateIn=(val,onCh,ex)=><input type="date" value={val||""} onChange={e=>onCh(e.target.value)} style={{...FIELD,colorScheme:T.mode==="dark"?"dark":"light",...ex}}/>;
  return(<Section title={title} right={<span style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"normal",textAlign:"right"}}>{items.length?open+" ouverte"+(open>1?"s":"")+" · "+closed+" clôturée"+(closed>1?"s":""):"aucune"}{at?" · maj "+fmt(at)+(showWeek?" · S"+isoWeek(at):""):""}</span>}>
    {list.map(x=>{
      const st=itemStatus(x),p=mit?mitParts(x):null,late=!x.done&&!!x.deadline&&x.deadline<todayIso(),none=!x.done&&!x.deadline;
      return(<div key={x.id} style={{display:"flex",flexDirection:"column",gap:5,padding:"6px 8px",borderRadius:8,background:x.done?"transparent":color+"12",borderLeft:"3px solid "+(x.done?T.line:color),marginBottom:4}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {mit?<>
            <Lab label="Risque">{inp(p.risk,t=>patch(x.id,{risk:t,text:mitText(t,p.measure)}),"Quel risque ?",x)}</Lab>
            <Lab label="Ce qu'on fait pour l'éviter">{inp(p.measure,t=>patch(x.id,{measure:t,text:mitText(p.risk,t)}),"Mesure, responsable…",x)}</Lab>
          </>:<Lab label="Action" grow={260}>{inp(x.text,t=>patch(x.id,{text:t}),"Qui fait quoi ?",x)}</Lab>}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"4px 12px"}}>
          <label style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:FZ.xs,fontWeight:700,color:T.ink500}}>État<StatusSelect value={st} label={"État : "+(mit?p.risk:x.text)} onChange={v=>patch(x.id,statusPatch(x,v,todayIso()))}/></label>
          <label style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:FZ.xs,fontWeight:700,color:late||none?T.red600:T.ink500}} title={none?"Pas d'échéance : à renseigner":late?"Échéance dépassée":"Échéance"}>{late?"En retard · ":"Date"}{dateIn(x.deadline,v=>v&&patch(x.id,{deadline:v}),{width:128,border:"1px solid "+(late||none?T.red500:T.line)})}</label>
          {x.done&&<label style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:FZ.xs,fontWeight:700,color:T.emerald600}}>clôturée le{dateIn(x.doneAt,v=>v&&patch(x.id,{doneAt:v}),{width:128,fontWeight:700})}</label>}
          {x.groupId&&Array.isArray(x.groupPjs)&&x.groupPjs.length>1&&<span title={"Saisie commune à "+x.groupPjs.join(", ")} style={{fontSize:FZ.xs,fontWeight:700,color:T.ink500,border:"1px solid "+T.line,borderRadius:999,padding:"0 7px",whiteSpace:"nowrap"}}>× {x.groupPjs.length} PJ</span>}
          {enteredOn(x)&&<i title={"Saisie le "+enteredOn(x).full} style={{fontSize:FZ.xs,fontStyle:"italic",fontWeight:400,color:T.ink500,whiteSpace:"nowrap"}}>saisie {enteredOn(x).short}</i>}
          <span style={{marginLeft:"auto"}}><TrashBtn title="Supprimer cette ligne" onClick={()=>save(items.filter(i=>i.id!==x.id))}/></span>
        </div>
      </div>);
    })}
    <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:items.length?6:0,padding:"8px 10px",border:"1px dashed "+T.line,borderRadius:8}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {mit?<>
          <Lab label="Risque"><input value={a} onChange={e=>setA(e.target.value)} placeholder="Quel risque ?" style={FIELD}/></Lab>
          <Lab label="Ce qu'on fait pour l'éviter"><input value={b} onChange={e=>setB(e.target.value)} placeholder="Mesure, responsable…" style={FIELD}/></Lab>
        </>:<Lab label="Action" grow={260}><input value={a} onChange={e=>setA(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder="Qui fait quoi ?" style={FIELD}/></Lab>}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"4px 12px"}}>
        <label style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:FZ.xs,fontWeight:700,color:T.ink500}}>État<StatusSelect value={ns} onChange={setNs} label="État de la nouvelle ligne"/></label>
        <label style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:FZ.xs,fontWeight:700,color:T.ink500}}>Date{dateIn(nd,setNd,{width:128,border:"1px solid "+(a.trim()&&!nd?T.red500:T.line)})}</label>
        <button onClick={add} disabled={!canAdd} title={!canAdd?(mit?"Renseignez le risque, la mesure et la date":"Renseignez l'action et la date"):undefined} style={{...BTN(canAdd),marginLeft:"auto"}}>Ajouter</button>
      </div>
    </div>
  </Section>);
}
const ActionsSection=({meta,onSave,onGroup})=><ItemsSection kind="actions" onGroup={onGroup} title="Actions de la semaine" meta={meta} field="actions" atKey="semAt" color={T.accent} showWeek onSave={onSave}/>;
const MitigationSection=({meta,onSave,onGroup})=><ItemsSection kind="mitigations" onGroup={onGroup} title="Plans de mitigation" meta={meta} field="mitigations" atKey="mitAt" color={T.red500} onSave={onSave}/>;

// ── Depuis le dernier import : ce qui a bougé pour ce PJ entre les deux dernières versions du planning ──
function LastChange({entry,pj}){
  if(!entry)return null;
  const p=(entry.pjs||[]).find(x=>x.pj===pj);
  const when=new Date(entry.at).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  const L={arrivee:"Arrivée",tests:"Tests",testsFin:"Fin tests",finProd:"Fin de prod.",depart:"Départ"};
  const short=v=>v?v.slice(8,10)+"/"+v.slice(5,7):"—";
  return(<Section title="Depuis le dernier import" right={<span style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap"}}>import du {when}</span>}>
    {!p?<div style={{fontSize:FZ.sm,color:T.emerald600,fontWeight:600}}>✓ Aucun changement pour ce PJ.</div>:p.isNew?<div style={{fontSize:FZ.sm,color:T.amber600,fontWeight:700}}>Nouveau PJ dans cette version.</div>:
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {Object.entries(p.d||{}).map(([f,c])=>{const dl=c.delta;const col=dl==null?T.amber600:dl>0?T.red500:T.emerald600;const bg=dl==null?T.amber100:dl>0?T.red100:T.emerald100;
        return(<span key={f} title={short(c.from)+" → "+short(c.to)} style={{background:bg,color:col,borderRadius:8,padding:"4px 8px",fontSize:FZ.xs,fontWeight:700}}>{L[f]} {dl==null?(c.to?"défini":"retiré"):(dl>0?"+":"−")+Math.abs(dl)+" j"} <span style={{fontWeight:500,opacity:.8}}>({short(c.from)} → {short(c.to)})</span></span>);})}
      {p.hours&&p.hours.at&&<span style={{background:T.card,color:T.ink700,borderRadius:8,padding:"4px 8px",fontSize:FZ.xs,fontWeight:700}}>Heures atelier {p.hours.at.from} → {p.hours.at.to} h</span>}
      {p.hours&&p.hours.au&&<span style={{background:T.card,color:T.ink700,borderRadius:8,padding:"4px 8px",fontSize:FZ.xs,fontWeight:700}}>Heures autom {p.hours.au.from} → {p.hours.au.to} h</span>}
    </div>}
  </Section>);
}

// ── Gros composants : une ligne par composant, une colonne par étape (désigné / commandé / réceptionné (reçu à ENOGIA ou installé)) ──
// Terme de jargon avec définition au survol et au focus clavier (v123).
const Gloss=({t,children})=><abbr title={t} tabIndex={0} style={{textDecoration:"underline dotted",textUnderlineOffset:2,cursor:"help"}}>{children}</abbr>;
const CHK={width:20,height:20,accentColor:T.teal500,cursor:"pointer",margin:2};
// Une couleur par étape : désigné (ambre) → commandé (bleu) → installé (vert). Cases personnalisées : contour dans la couleur de l'étape, plein une fois cochées.
const STEP_COLOR={get des(){return T.amber500;},get cmd(){return T.info500;},get inst(){return T.emerald500;}};
const stepColor=f=>STEP_COLOR[f]||T.teal500;
const CHECK_SVG="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
const stepBox=(f,on,size=20)=>({appearance:"none",WebkitAppearance:"none",width:size,height:size,margin:2,borderRadius:4,cursor:"pointer",boxSizing:"border-box",border:"2px solid "+stepColor(f),background:on?stepColor(f):"transparent",backgroundImage:on?CHECK_SVG:"none",backgroundSize:"85%",backgroundRepeat:"no-repeat",backgroundPosition:"center",transition:"background .12s ease"});
function ComposantsSection({meta,onSave,catalog,setCatalog,pjsToComplete,onApplyAll}){
  const list=composantsOf(meta);const pct=compPct(meta);const [nl,setNl]=useState("");const [catOpen,setCatOpen]=useState(false);
  const missing=(catalog||[]).filter(c=>!list.some(x=>x.label.toLowerCase()===c.toLowerCase())); // composants de la liste générale absents de cette fiche
  const save=next=>onSave({composants:next});
  // v146.18 : une pièce réceptionnée a forcément été designée et commandée → cocher « Réceptionné » coche aussi Design et PO
  const toggle=(id,f)=>save(list.map(c=>c.id===id?{...c,[f]:!c[f],...(f==="inst"&&!c.inst?{des:true,cmd:true}:{})}:c));
  const colAll=f=>{const all=list.length>0&&list.every(c=>c[f]);save(list.map(c=>({...c,[f]:!all,...(f==="inst"&&!all?{des:true,cmd:true}:{})})));};
  const add=()=>{const t=nl.trim();if(!t)return;save([...list,{id:"c"+Date.now().toString(36),label:t,des:false,cmd:false,inst:false}]);setNl("");};
  const done=list.reduce((a,c)=>a+COMP_STEPS.filter(([f])=>c[f]).length,0);
  const GRID="minmax(90px,1fr) 64px 64px 108px 22px";
  return(<Section title="Major components" right={<span style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap"}}>{done} / {list.length*COMP_STEPS.length} cases · {pct==null?"non démarré":pct+"%"}</span>}>
    <div style={{marginBottom:6}}><ProgressBar value={pct||0} height={5}/></div>
    <div style={{border:"1px solid "+T.line,borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:GRID,background:T.card,alignItems:"center",padding:"4px 8px",gap:4}}>
        <Cap>Composant</Cap>
        {COMP_STEPS.map(([f,l])=><button key={f} onClick={()=>colAll(f)} title={"Cocher / décocher toute la colonne « "+l+" »"+(f==="inst"?" — pièce reçue à ENOGIA ou installée sur la machine":"")} style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk,border:"none",background:"transparent",cursor:"pointer",padding:0,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}><span style={{width:7,height:7,borderRadius:4,background:stepColor(f)}}/>{l}</button>)}
        <span/>
      </div>
      {list.map(c=>{const all=COMP_STEPS.every(([f])=>c[f]);return(<div key={c.id} style={{display:"grid",gridTemplateColumns:GRID,alignItems:"center",padding:"3px 8px",gap:4,borderTop:"1px solid "+T.line,background:all?T.emerald100:"transparent"}}>
        <input defaultValue={c.label} key={c.id+c.label} title="Renommer ce composant (administrateurs)" aria-label={"Nom du composant : "+c.label} onBlur={e=>{const t=e.target.value.trim();if(t&&t!==c.label)save(list.map(x=>x.id===c.id?{...x,label:t}:x));else if(!t)e.target.value=c.label;}} onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}} style={{...FIELD,fontSize:FZ.xs,fontWeight:600,color:T.ink900,background:"transparent",border:"1px solid transparent",padding:"1px 4px",minWidth:0,width:"100%",textOverflow:"ellipsis"}}/>
        {COMP_STEPS.map(([f,l])=><span key={f} style={{textAlign:"center"}}><input type="checkbox" checked={!!c[f]} onChange={()=>toggle(c.id,f)} style={stepBox(f,!!c[f])} aria-label={c.label+" "+l}/></span>)}
        <TrashBtn title="Retirer ce composant" onClick={()=>save(list.filter(x=>x.id!==c.id))}/>
      </div>);})}
      {list.length===0&&<EmptyState compact icon="inbox" title="Aucun composant" hint="Ajoutez-en un ci-dessous."/>}
    </div>
    <div style={{display:"flex",gap:6,marginTop:6}}>
      <input value={nl} onChange={e=>setNl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder="＋ Ajouter un composant (ex. Vanne, Bac à huile…) — nom modifiable, ✕ pour retirer" style={{...FIELD,flex:1,padding:"3px 8px"}}/>
      <button onClick={add} disabled={!nl.trim()} style={BTN(!!nl.trim())}>Ajouter</button>
    </div>
    {(missing.length>0||setCatalog)&&<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:6}}>
      {missing.length>0&&<span style={{fontSize:FZ.xs,fontWeight:700,color:T.ink500}}>De la liste :</span>}
      {missing.map(c=><button key={c} type="button" onClick={()=>save([...list,{id:"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),label:c,des:false,cmd:false,inst:false}])} style={{border:"1px dashed "+T.teal500,background:T.teal100,color:T.teal600,borderRadius:999,padding:"1px 9px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>＋ {c}</button>)}
      {setCatalog&&<button type="button" onClick={()=>setCatOpen(true)} style={{marginLeft:"auto",border:"1px solid "+T.line,background:T.card,color:T.ink700,borderRadius:8,padding:"2px 9px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>Gérer la liste des composants</button>}
    </div>}
    {catOpen&&<CompCatalogDialog catalog={catalog} setCatalog={setCatalog} nPj={pjsToComplete?pjsToComplete.total:0} missingCount={pjsToComplete?pjsToComplete.missing:0} onApplyAll={onApplyAll} onClose={()=>setCatOpen(false)}/>}
  </Section>);
}

// ── Jalons de paiement : case à cocher par jalon + barre d'avancement (pondérée par le % du contrat) ──
const PAY_SUGGEST=["Acompte à la commande","Avant expédition","Livraison","Mise en service","Solde"];
// V146.1 : quand le PJ figure dans le Cash in (super admin), les jalons viennent de là, en lecture seule, avec les statuts colorés.
const fd=iso=>iso?fmt(new Date(iso+"T00:00:00")):"—";
function PaiementsLinked({items,onOpenCash,pj,onLinks}){
  const SS=statusSoft(),cs=cashSummary(items),pct=payPct({},pj),live=items.filter(p=>!p.epc);
  const groups=[];items.forEach(p=>{let g=groups.find(x=>x.k===p.group);if(!g){g={k:p.group,label:p.groupLabel,l:[]};groups.push(g);}g.l.push(p);});
  const chip=p=>{
    if(p.epc)return null;
    if(p.done)return p.doneAt?"payé le "+fd(p.doneAt):"payé";
    if(p.k==="late")return p.retard+" j de retard";
    if(p.k==="tobill"&&p.retard>0)return "à facturer depuis "+p.retard+" j";
    if(p.due&&p.due.days>=0&&p.due.days<=15)return p.due.kind+(p.due.days===0?" aujourd'hui":" dans "+p.due.days+" j");
    return null;
  };
  return(<Section title="Jalons de paiement" right={<span style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap"}}>Source : Cash in{cs&&!cs.allEpc?" · "+live.filter(p=>p.done).length+"/"+live.length+" payés · "+pct+"% · "+fmtEur(cs.paid)+" sur "+fmtEur(cs.total):""}</span>}>
    {live.length>0&&<div style={{marginBottom:6}}><ProgressBar value={pct||0} height={5}/></div>}
    {groups.map(g=>(<div key={g.k} style={{marginBottom:4}}>
      {(groups.length>1||g.l.some(x=>x.split>1))&&<div style={{fontSize:FZ.xs,fontWeight:700,color:T.ink500,margin:"4px 0 3px"}}>{g.k}{g.label?" · "+g.label:""}{g.l.some(x=>x.split>1)?" · jalons répartis sur "+g.l.find(x=>x.split>1).split+" PJ (÷ "+g.l.find(x=>x.split>1).split+")":""}</div>}
      {g.l.map(p=>{const c=SS[p.epc?"epc":p.tone]||SS.future,ch=chip(p);
        return(<div key={p.id} style={{padding:"5px 8px",borderRadius:8,background:c.bg,border:"1px solid "+c.ring,color:c.ink,marginBottom:3,opacity:p.epc?.75:1}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8}}>
            <span style={{flex:1,minWidth:0,fontWeight:700,fontSize:FZ.sm,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={p.label}>{p.label}</span>
            <span style={{fontSize:FZ.xs,fontWeight:700,whiteSpace:"nowrap"}}>{p.pct!=null?p.pct+" % · ":""}{fmtEur(p.montant)}</span>
          </div>
          <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap",fontSize:FZ.xs,marginTop:1}}>
            <span style={{fontWeight:700}}>{p.epc?"EPC":STATUS_LABEL[p.tone]||STATUS_LABEL[p.k]}{ch?" · "+ch:""}</span>
            {!p.epc&&<span style={{opacity:.85}}>fact. {fd(p.factReelle||p.factPrevue)} · enc. {fd(p.encReelle||p.encPrevue)}</span>}
            {p.shared&&<span style={{fontWeight:700}} title="Le même paiement apparaît sur chacune de ces machines : ne pas additionner les montants">⇄ commun à {p.sharedN} machines — ne pas additionner</span>}
            {p.ref&&<span style={{opacity:.85}}>{p.ref}</span>}
          </div>
        </div>);})}
    </div>))}
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:4}}>
      {onOpenCash&&<button onClick={()=>onOpenCash(pj)} style={BTN(true)}>Ouvrir dans Cash in</button>}
      {onLinks&&<button onClick={onLinks} style={{...BTN(false),border:"1px solid "+T.line,background:T.card,color:T.ink900}}>Modifier la liaison</button>}
      <span style={{fontSize:FZ.xs,color:T.ink300}}>Lecture seule : les dates et statuts se modifient dans l'onglet Cash in.</span>
    </div>
  </Section>);
}
function PaiementsSection({meta,onSave,pj,onOpenCash,authorName}){
  useCashin();
  const [dlg,setDlg]=useState(false);
  const sup=!!onOpenCash&&!!getCashinDoc(); // super admin avec un Cash in chargé
  const linked=paiementsOf(meta,pj).filter(p=>p.linked);
  const dialog=dlg&&<CashLinksDialog focusPj={pj} authorName={authorName} onClose={()=>setDlg(false)}/>;
  if(linked.length)return <>{dialog}<PaiementsLinked items={linked} onOpenCash={onOpenCash} pj={pj} onLinks={sup?()=>setDlg(true):null}/></>;
  return <>{dialog}<PaiementsManual meta={meta} onSave={onSave} extra={sup?<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6,fontSize:FZ.xs,color:T.ink500}}>
    <span>Ce PJ n'est lié à aucun PJ du Cash in.</span><button onClick={()=>setDlg(true)} style={BTN(true)}>Lier à un PJ du Cash in</button></div>:null}/></>;
}
function PaiementsManual({meta,onSave,extra}){
  const src=paiementsOf(meta);
  const [items,setItems]=useState(src);const key=JSON.stringify(src);
  useEffect(()=>{setItems(src);},[key]); // eslint-disable-line
  const [lab,setLab]=useState("");const [pc,setPc]=useState("");
  const save=next=>{setItems(next);onSave({paiements:next});};
  const mt=montantOf(meta);const pct=payPct({paiements:items});const tot=items.reduce((a,p)=>a+(Number(p.pct)||0),0);
  const add=()=>{const t=lab.trim();if(!t)return;save([...items,{id:"p"+Date.now().toString(36),label:t,pct:pc===""?null:Number(pc),done:false,doneAt:null}]);setLab("");setPc("");};
  const patch=(id,f)=>save(items.map(p=>p.id===id?{...p,...f}:p));
  return(<Section title="Jalons de paiement" right={<span style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap"}}>{items.length?items.filter(p=>p.done).length+"/"+items.length+(tot>0?" · "+pct+"%":"")+(mt&&tot>0?" · "+fmtEur(mt*pct/100):""):"aucun jalon"}</span>}>
    {extra}
    {items.length>0&&<div style={{marginBottom:6}}><ProgressBar value={pct||0} height={5}/></div>}
    {items.map(p=>(<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 8px",borderRadius:8,background:p.done?T.emerald100:T.card,marginBottom:3}}>
      <input type="checkbox" checked={!!p.done} onChange={()=>patch(p.id,{done:!p.done,doneAt:!p.done?new Date().toISOString():null})} style={{...CHK,accentColor:T.emerald500}} aria-label={"Jalon payé : "+p.label}/>
      <input defaultValue={p.label} key={p.id+p.label} onBlur={e=>{const t=e.target.value.trim();if(t&&t!==p.label)patch(p.id,{label:t});}} style={{...FIELD,flex:1,fontWeight:600,background:"transparent",border:"1px solid transparent"}}/>
      <span style={{display:"inline-flex",alignItems:"center",gap:3}}><input type="number" min="0" max="100" defaultValue={p.pct==null?"":p.pct} key={p.id+"p"+p.pct} onBlur={e=>{const v=e.target.value===""?null:Number(e.target.value);if(v!==p.pct)patch(p.id,{pct:v});}} placeholder="%" style={{...FIELD,width:50,boxSizing:"border-box",textAlign:"right"}}/><span style={{fontSize:FZ.xs,color:T.ink300}}>%</span></span>
      <span style={{fontSize:FZ.xs,color:p.done?T.emerald600:T.ink300,width:86,textAlign:"right",whiteSpace:"nowrap",fontWeight:mt&&p.pct?600:400}}>{mt&&p.pct?fmtEur(mt*Number(p.pct)/100):(p.done&&p.doneAt?fmt(new Date(p.doneAt)):"")}</span>
      <TrashBtn title="Supprimer ce jalon" onClick={()=>save(items.filter(x=>x.id!==p.id))}/>
    </div>))}
    {tot>0&&Math.round(tot)!==100&&<div style={{fontSize:FZ.xs,color:T.amber600,marginBottom:4}}>Somme des jalons : {tot} % (le total attendu est 100 %).</div>}
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      <input list="pay-suggest" value={lab} onChange={e=>setLab(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder="＋ Nouveau jalon (ex. Acompte à la commande)" style={{...FIELD,flex:"1 1 220px"}}/>
      <datalist id="pay-suggest">{PAY_SUGGEST.map(x=><option key={x} value={x}/>)}</datalist>
      <input type="number" min="0" max="100" value={pc} onChange={e=>setPc(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder="% contrat" style={{...FIELD,width:90}}/>
      <button onClick={add} disabled={!lab.trim()} style={BTN(!!lab.trim())}>Ajouter</button>
    </div>
  </Section>);
}

// Avancement global : avancement du projet de la signature à la mise en service, saisi à la main (pas de formule).
function GlobalTile({gp,onSave}){
  const [v,setV]=useState(gp.set?String(gp.global):"");
  useEffect(()=>{setV(gp.set?String(gp.global):"");},[gp.global,gp.set]);
  const commit=()=>{
    if(v===""){if(gp.set&&onSave)onSave({avGlobal:null});return;}
    const n=Math.max(0,Math.min(100,Math.round(Number(v))));
    if(isNaN(n)){setV(gp.set?String(gp.global):"");return;}
    setV(String(n));if((!gp.set||n!==gp.global)&&onSave)onSave({avGlobal:n});
  };
  return(<div style={{display:"flex",alignItems:"center",gap:8}} title={"Volets : "+gp.parts.map(x=>x.label+" "+x.v+"%").join(" · ")}>
    <Donut v={gp.global}/>
    <div style={{minWidth:0}}>
      {onSave?<span style={{display:"inline-flex",alignItems:"center",gap:3}}>
        <input type="number" min={0} max={100} step={5} value={v} placeholder="—" onChange={e=>setV(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}} aria-label="Avancement global (%)" style={{width:58,padding:"3px 6px",borderRadius:8,border:"1.5px solid "+(gp.set?T.teal500:T.line),background:T.card,color:T.ink900,fontSize:FZ.sm,fontWeight:700,fontFamily:T.font,textAlign:"right"}}/>
        <span style={{fontSize:FZ.xs,color:T.ink500,fontWeight:700}}>%</span>
      </span>:null}
      <div style={{fontSize:FZ.xs,color:T.ink300,marginTop:3,lineHeight:1.3}}>{gp.set?"signature → mise en service":"à saisir : signature → MES"}</div>
    </div>
  </div>);
}

// v190 — vue d'ensemble d'un chef de projet : tous ses PJ en cartes (étape, gamme, pays, écart, avancement, prochain jalon).
// v224 (demandé : « faire un résumé sur les fiches globales des projets multiples ») : en tête de la fiche commune d'un PJ
// à plusieurs machines (PJ461-1, -2…) — projet, chiffres clés, répartition des états, jalons du premier au dernier, derniers messages.
function ProjectSummary({rows,pvOf,comments,delays,onPick}){
  const t0=new Date(today);t0.setHours(0,0,0,0);
  const m0=getPjMeta(rows[0].pj,rows[0]);
  const chefs=[...new Set(rows.flatMap(x=>chefsOf(getPjMeta(x.pj,x))))].filter(Boolean);
  const gammes=[...new Set(rows.map(x=>x.gamme).filter(Boolean))];
  const shipped=rows.filter(x=>x.etat==="SHIPPED").length,open=rows.filter(x=>x.etat!=="SHIPPED");
  const avg=rows.length?Math.round(rows.reduce((a,x)=>a+pvOf(x),0)/rows.length):0;
  const maxDrift=open.reduce((a,x)=>Math.max(a,x.drift||0),0);
  const dels=rows.flatMap(x=>(delays&&delays[x.pj])||[]),delDays=dels.reduce((a,d)=>a+(d.days||0),0);
  const fats=open.filter(x=>{const pd=presenceDates(x.clientPresence);const d=pd.client||pd.nobo;return presenceKind(x.clientPresence)&&(!d||new Date(d)>=t0);}).length;
  const byEtat={};rows.forEach(x=>{byEtat[x.etat]=(byEtat[x.etat]||0)+1;});
  const etats=Object.entries(byEtat).sort((a,b)=>b[1]-a[1]);
  const span=k=>{const L=rows.map(x=>x[k]?new Date(x[k]):null).filter(d=>d&&!isNaN(d)).sort((a,b)=>a-b);return L.length?[L[0],L[L.length-1]]:null;};
  const jalons=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin de production"],["depart","Départ"]].map(([k,l])=>[l,span(k)]);
  const msgs=rows.flatMap(x=>((comments&&comments[x.pj])||[]).filter(c=>!c.private).map(c=>({...c,pj:x.pj}))).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
  const kpi=(l,v,sub,tone)=>(<div style={{minWidth:0}}>
    <div style={{fontSize:12,color:T.ink500}}>{l}</div>
    <div style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:500,lineHeight:1.1,color:tone||T.ink900,fontVariantNumeric:"tabular-nums"}}>{v}</div>
    {sub&&<div style={{fontSize:FZ.xs,color:T.ink500}}>{sub}</div>}
  </div>);
  return(<section aria-label="Résumé du projet" style={{border:"1px solid "+T.line,borderRadius:10,padding:"12px 14px",marginBottom:12,background:T.card}}>
    <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap",marginBottom:10}}>
      <h3 style={{margin:0,fontSize:FZ.md,fontWeight:700,color:T.ink900}}>Résumé du projet</h3>
      <span style={{fontSize:FZ.sm,color:T.ink500}}>{[m0.nomProjet&&m0.nomProjet!=="—"?m0.nomProjet:null,m0.pays,gammes.join(", "),chefs.length?"Chef"+(chefs.length>1?"s":"")+" : "+chefs.join(", "):null].filter(Boolean).join(" · ")}</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:12}}>
      {kpi("Machines",rows.length,shipped?shipped+" expédiée"+(shipped>1?"s":""):open.length+" en cours")}
      {kpi("Avancement moyen",avg+" %")}
      {kpi("Plus grande dérive",maxDrift>0?"+"+maxDrift+" j":"0 j",maxDrift>0?"sur le départ initial":"à l'heure",maxDrift>10?T.red600:maxDrift>0?T.amber600:null)}
      {kpi("Retards déclarés",delDays+" j",dels.length+" déclaration"+(dels.length>1?"s":""))}
      {kpi("FAT client / NOBO",fats,"à venir")}
    </div>
    <div style={{fontSize:12,color:T.ink500,marginBottom:4}}>États des machines</div>
    <div role="img" aria-label={etats.map(([e,n])=>n+" "+(ETAT_META[e]||{label:e}).label).join(", ")} style={{display:"flex",height:10,borderRadius:3,overflow:"hidden",gap:2,marginBottom:6}}>
      {etats.map(([e,n])=><span key={e} style={{flex:n,background:(ETAT_META[e]||ETAT_META["NOT ORDERED"]).bar}}/>)}
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:"4px 14px",fontSize:FZ.xs,color:T.ink700,marginBottom:12}}>
      {etats.map(([e,n])=><span key={e} style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:2,background:(ETAT_META[e]||ETAT_META["NOT ORDERED"]).bar}}/>{(ETAT_META[e]||{label:e}).label} <b style={{fontVariantNumeric:"tabular-nums"}}>{n}</b></span>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:14}}>
      <div>
        <div style={{fontSize:12,color:T.ink500,marginBottom:4}}>Jalons (première → dernière machine)</div>
        {jalons.map(([l,sp])=><div key={l} style={{display:"flex",justifyContent:"space-between",gap:10,minHeight:30,alignItems:"center",borderTop:"1px solid "+T.line,fontSize:FZ.sm}}>
          <span style={{color:T.ink700}}>{l}</span>
          <span style={{fontVariantNumeric:"tabular-nums",color:sp?T.ink900:T.ink300}}>{sp?(sp[0].getTime()===sp[1].getTime()?fmt(sp[0]):fmt(sp[0])+" → "+fmt(sp[1])):"—"}</span>
        </div>)}
      </div>
      <div>
        <div style={{fontSize:12,color:T.ink500,marginBottom:4}}>Derniers messages</div>
        {msgs.length===0?<div style={{fontSize:FZ.sm,color:T.ink300,borderTop:"1px solid "+T.line,paddingTop:6}}>Aucun message sur ces machines.</div>:
          msgs.map((c,i)=><button type="button" key={i} onClick={()=>onPick(c.pj)} style={{display:"flex",gap:8,alignItems:"flex-start",width:"100%",textAlign:"left",border:"none",borderTop:"1px solid "+T.line,background:"transparent",padding:"6px 0",cursor:"pointer",fontFamily:T.font,color:T.ink900}}>
            <PjPlate pj={c.pj}/>
            <span style={{minWidth:0,flex:1}}><span style={{fontSize:FZ.xs,color:T.ink500}}>{c.author||""}{c.date?" · "+fmt(new Date(c.date)):""}</span><span style={{display:"block",fontSize:FZ.sm,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.text}</span></span>
          </button>)}
      </div>
    </div>
  </section>);
}

function ChefOverview({name,rows,pvOf,onPick,onClose,summary}){
  const t0=new Date(today);t0.setHours(0,0,0,0);
  const open=rows.filter(x=>x.etat!=="SHIPPED"),late=open.filter(x=>x.drift>0).length;
  const fats=open.filter(x=>{const pd=presenceDates(x.clientPresence);const d=pd.client||pd.nobo;return presenceKind(x.clientPresence)&&(!d||new Date(d)>=t0);}).length;
  const nextOf=x=>{const L=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin prod"],["depart","Départ"]].map(([k,l])=>[l,x[k]?new Date(x[k]):null]).filter(([,d])=>d&&d>=t0).sort((a,b)=>a[1]-b[1]);return L[0]||null;};
  const sorted=rows.slice().sort((a,b)=>(a.etat==="SHIPPED")-(b.etat==="SHIPPED")||(b.drift||0)-(a.drift||0));
  return(<div className="enogia-view-in" style={{...CARD,padding:16}}>
    <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <Avatar name={name} size={26}/>
      <h2 style={{margin:0,fontFamily:T.fontDisplay,fontSize:FZ.xl,fontWeight:600,color:T.ink900}}>{name}</h2>
      <span style={{fontSize:FZ.sm,color:T.ink500}}>{rows.length} projet{rows.length>1?"s":""} · {open.length} en cours · <b style={{color:late?T.red500:T.ink700}}>{late} en retard</b>{fats?" · "+fats+" FAT client/NOBO à venir":""}</span>
      <span style={{marginLeft:"auto",display:"inline-flex",gap:6}}>
        {sorted[0]&&<button type="button" onClick={()=>onPick(sorted[0].pj)} style={{border:"1px solid "+T.line,background:T.card,color:T.ink700,borderRadius:8,minHeight:30,padding:"0 10px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>Ouvrir la 1re fiche</button>}
        <button type="button" onClick={onClose} aria-label="Fermer la vue d'ensemble" style={{border:"none",background:T.surface,color:T.ink700,borderRadius:8,width:30,height:30,cursor:"pointer"}}><NavIcon name="close" size={11}/></button>
      </span>
    </div>
    {summary&&<ProjectSummary rows={rows} pvOf={pvOf} comments={summary.comments} delays={summary.delays} onPick={onPick}/>}
    <div className="enogia-stagger" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10}}>
      {sorted.map(x=>{const m=getPjMeta(x.pj,x),ec=ETAT_META[x.etat]||ETAT_META["NOT ORDERED"],pv=pvOf(x),nx=nextOf(x),edge=x.etat!=="SHIPPED"&&x.drift>10?T.red500:ec.bar;return(
        <div key={x.pj} {...pressable(()=>onPick(x.pj),{"aria-label":"Ouvrir la fiche "+x.pj})} className="enogia-test-card" style={{background:T.card,border:"1px solid "+T.line,borderTop:"4px solid "+edge,borderRadius:"0 0 10px 10px",padding:"10px 12px",cursor:"pointer",minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><PjPlate pj={x.pj}/><EpcTag meta={m} short/>{x.gamme&&<span style={{fontFamily:T.fontLabel,fontSize:12,fontWeight:600,color:T.ink700}}>{x.gamme}</span>}<span style={{marginLeft:"auto"}}><CountryFlag pays={m.pays} size={13}/></span></div>
          <div title={m.nomProjet||""} style={{margin:"6px 0 2px",fontSize:FZ.sm,fontWeight:700,color:T.ink900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nomProjet&&m.nomProjet!=="—"?m.nomProjet:"—"}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:FZ.xs,color:T.ink500,flexWrap:"wrap"}}>
            <span style={{color:etatInk(x.etat),fontWeight:700}}>{ec.label}</span>
            {x.etat!=="SHIPPED"&&x.drift>0&&<span style={{fontFamily:T.fontLabel,fontWeight:600,color:x.drift>10?T.red600:T.amber600}}>+{x.drift} j</span>}
            <span style={{marginLeft:"auto",fontVariantNumeric:"tabular-nums"}}>{nx?nx[0]+" "+fmt(nx[1]):x.depart?"Départ "+fmt(new Date(x.depart)):""}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}><div style={{flex:1}}><ProgressBar value={pv} height={4} color={ec.bar}/></div><span style={{fontSize:FZ.xs,fontWeight:700,color:etatInk(x.etat),fontVariantNumeric:"tabular-nums"}}>{pv}%</span></div>
        </div>);})}
    </div>
  </div>);
}

export function ProjectFileManager({profiles,focus,compCatalog,setCompCatalog,managerEmails,currentUserEmail,resolveComment,certifs,setCertifs,openPj,openNonce,lastChange,data,initialData,comments,delays,progress,savePjMetaOverride,savePjMetaMulti,addCommentMulti,addComment,deleteComment,addDelayAllocationMulti,deleteDelayAllocation,delayTypes,setDelayTypes,changeLog,authorName,onOpenCash}){
  const [search,setSearch]=useState("");
  // v164 : colonne de gauche redimensionnable (glisser la poignée) et réductible en mini-liste (n° de PJ + état), mémorisées sur ce poste
  const [listW,setListW]=useState(()=>{try{const v=parseInt(localStorage.getItem("enogia_mlist_w"),10);return v>=220&&v<=640?v:340;}catch(e){return 340;}});
  const [listMini,setListMini]=useState(()=>{try{return localStorage.getItem("enogia_mlist_mini")==="1";}catch(e){return false;}});
  useEffect(()=>{try{localStorage.setItem("enogia_mlist_w",String(listW));localStorage.setItem("enogia_mlist_mini",listMini?"1":"0");}catch(e){}},[listW,listMini]);
  const startDrag=e=>{
    e.preventDefault();const x0=e.clientX,w0=listW;
    const mv=ev=>setListW(Math.max(220,Math.min(640,w0+(ev.clientX-x0))));
    const up=()=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);document.body.style.userSelect="";};
    document.body.style.userSelect="none";window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);
  };
  const onHandleKey=e=>{if(e.key==="ArrowLeft")setListW(w=>Math.max(220,w-24));else if(e.key==="ArrowRight")setListW(w=>Math.min(640,w+24));};
  const [showSlots,setShowSlots]=useState(false); // les slots libres sont masqués de base
  const [chefEdit,setChefEdit]=useState(false); // v191 : édition des autres chefs / EPC / chef ORC
  const [showShipped,setShowShipped]=useState(false); // v191 : machines expédiées masquées de base (demandé)
  // v190 (maquette A validée) : liste regroupée par chef de projet ; un clic sur le nom affiche toutes ses fiches d'un coup.
  const [groupBy,setGroupBy]=useState(()=>{try{const v=localStorage.getItem("enogia_mlist_group");return ["chef","all","mine"].includes(v)?v:"chef";}catch(e){return "chef";}});
  useEffect(()=>{try{localStorage.setItem("enogia_mlist_group",groupBy);}catch(e){}},[groupBy]);
  const [folded,setFolded]=useState(()=>new Set()),[chefView,setChefView]=useState(null);
  const toggleFold=k=>setFolded(f=>{const n=new Set(f);if(n.has(k))n.delete(k);else n.add(k);return n;});
  const [showLegend,setShowLegend]=useState(false); // v123 : la légende des commentaires est repliée de base
  const [selPj,setSelPj]=useState((data.find(x=>x.etat!=="SLOT_LIBRE"&&x.etat!=="SHIPPED")||data.find(x=>x.etat!=="SLOT_LIBRE")||data[0]||{}).pj||null);
  useEffect(()=>{setChefEdit(false);},[selPj]); // eslint-disable-line
  const [showPrivate,setShowPrivate]=useState(false),[onlyMine,setOnlyMine]=useState(false); // v151 : les commentaires privés sont masqués à l'ouverture d'un PJ, affichés sur demande
  const [multiOpen,setMultiOpen]=useState(false); // v146.18 : saisie sur plusieurs projets
  const [cdpOpen,setCdpOpen]=useState(false),[codirOpen,setCodirOpen]=useState(false); // v146.14 : rapports générés depuis la fiche projet (CODIR : super admin seulement)
  // v138 : le fil de commentaires est replié par défaut (une ligne : dernier message) ; le choix est gardé sur ce poste
  const [threadOpen,setThreadOpen]=useState(()=>{try{return localStorage.getItem("enogia_ficheThread")==="1";}catch(e){return false;}});
  const toggleThread=()=>setThreadOpen(v=>{const n=!v;try{localStorage.setItem("enogia_ficheThread",n?"1":"0");}catch(e){}return n;});
  // v134 : ouverture d'un PJ demandée depuis le Point hebdo
  useEffect(()=>{if(openPj)setSelPj(openPj);},[openPj,openNonce]); // eslint-disable-line
  const pendingNotes=useRef({});   // dernières notes envoyées (évite d'écraser une note par une autre si deux sauvegardes se suivent)
  const initialByPj=useMemo(()=>{const m={};(initialData||[]).forEach(x=>{m[x.pj]=x;});return m;},[initialData]);
  const pvOf=row=>progress&&progress[row.pj]!=null?progress[row.pj]:row.etat==="SHIPPED"?100:0;
  const filteredList=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const base=data.filter(row=>(showSlots||row.etat!=="SLOT_LIBRE")&&(showShipped||row.etat!=="SHIPPED"));
    if(!q)return base;
    return base.filter(row=>{
      const m=getPjMeta(row.pj,row);
      return row.pj.toLowerCase().includes(q)||(m.nomProjet||"").toLowerCase().includes(q)||(m.pays||"").toLowerCase().includes(q)||(m.chefProjet||"").toLowerCase().includes(q)||(row.gamme||"").toLowerCase().includes(q);
    });
  },[data,search,showSlots,showShipped]);
  const myPjs=useMemo(()=>{const pr=profileOf(profiles,currentUserEmail);const set=new Set(pjsOfProfile(pr,data));const nm=lc(pr.name||nameFromEmail(currentUserEmail||""));data.forEach(x=>{if(nm&&chefsOf(getPjMeta(x.pj,x)).some(c=>lc(c)===nm))set.add(x.pj);});return set;},[profiles,currentUserEmail,data]);
  const chefOfRow=row=>chefsOf(getPjMeta(row.pj,row))[0]||"";
  const groups=useMemo(()=>{
    if(groupBy==="mine")return [{key:"mine",head:null,rows:filteredList.filter(x=>myPjs.has(x.pj))}];
    if(groupBy!=="chef")return [{key:"all",head:null,rows:filteredList}];
    const m=new Map();filteredList.forEach(x=>{const cs=chefsOf(getPjMeta(x.pj,x));(cs.length?cs:["Sans chef de projet"]).forEach(c=>{if(!m.has(c))m.set(c,[]);m.get(c).push(x);});}); // v191 : un PJ figure chez chacun de ses chefs
    return [...m.entries()].sort((a,b)=>a[0]==="Sans chef de projet"?1:b[0]==="Sans chef de projet"?-1:a[0].localeCompare(b[0],"fr")).map(([c,rows])=>({key:"c:"+c,head:c,rows,late:rows.filter(x=>x.drift>0&&x.etat!=="SHIPPED").length}));
  },[filteredList,groupBy,myPjs]); // eslint-disable-line
  const pick=pj=>{setSelPj(pj);setChefView(null);setClusterView(null);};
  // v221 (demandé : « regrouper en synthèse certains PJ qui sont les mêmes (PJ461-1, -2…) ») : machines d'un même PJ regroupées dans la liste
  const [clusterOn,setClusterOn]=useState(()=>{try{return localStorage.getItem("enogia_mlist_cluster")!=="0";}catch(e){return true;}});
  useEffect(()=>{try{localStorage.setItem("enogia_mlist_cluster",clusterOn?"1":"0");}catch(e){}},[clusterOn]);
  const [clusterView,setClusterView]=useState(null),[openCl,setOpenCl]=useState(()=>new Set());
  const baseOf=pj=>{const m=/^(PJ\s*\d+)[-_ ]/i.exec(String(pj||""));return m?m[1].toUpperCase():null;};
  const clusterRows=list=>{if(!clusterOn)return list.map(row=>({base:row.pj,rows:[row]}));const out=[],idx={};list.forEach(row=>{const b=baseOf(row.pj);if(!b){out.push({base:row.pj,rows:[row]});return;}if(idx[b]==null){idx[b]=out.length;out.push({base:b,rows:[]});}out[idx[b]].rows.push(row);});return out;};
  const r=data.find(x=>x.pj===selPj);
  const meta=r?getPjMeta(r.pj,r):null;
  // v146.18 : applique la clôture / réouverture d'une ligne commune aux autres projets du même envoi (même groupId)
  const groupPatch=(x,field,atKey,f)=>{
    if(!savePjMetaMulti)return;
    const patches={},now=new Date().toISOString();
    x.groupPjs.filter(pj=>pj!==(r&&r.pj)).forEach(pj=>{
      const row=data.find(d=>d.pj===pj);if(!row)return;
      const list=itemsOf(getPjMeta(pj,row),field);
      if(list.some(i=>i.groupId===x.groupId))patches[pj]={[field]:list.map(i=>i.groupId===x.groupId?{...i,...f}:i),[atKey]:now};
    });
    savePjMetaMulti(patches);
  };
  const ini=r?initialByPj[r.pj]:null;
  const pjComments=useMemo(()=>{
    if(!r)return[];
    return (comments?.[r.pj]||[]).map((c,i)=>({...c,_idx:i})).sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[comments,r]);
  const pjDelays=useMemo(()=>{
    if(!r)return[];
    return [...(delays?.[r.pj]||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[delays,r]);
  const totalDelayDays=pjDelays.reduce((a,d)=>a+(d.days||0),0);
  const byType=useMemo(()=>{
    const m={};pjDelays.forEach(d=>{m[d.type]=(m[d.type]||0)+(d.days||0);});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[pjDelays]);
  const nPrivate=pjComments.filter(c=>c.private).length;
  const me=lc(currentUserEmail);
  const mentionOpts=useMentions().options; // v153 : tous les comptes déjà connectés au site (App)
  // v150 : liste générale des composants (gérée par les admins) et PJ en cours dont la liste est à compléter
  const compList=getDefaultComposants();
  const compTodo=useMemo(()=>{const act=data.filter(x=>x.etat!=="SHIPPED"&&x.etat!=="SLOT_LIBRE");const miss=act.filter(x=>{const l=composantsOf(getPjMeta(x.pj,x));return Array.isArray(getPjMeta(x.pj,x).composants)&&compList.some(c=>!l.some(y=>y.label.toLowerCase()===c.toLowerCase()));});return{total:act.length,missing:miss.length};},[data,compList]); // eslint-disable-line
  const applyCompAll=async list=>{
    if(!savePjMetaMulti)return false;
    const patches={};
    data.filter(x=>x.etat!=="SHIPPED"&&x.etat!=="SLOT_LIBRE").forEach(x=>{
      const m=getPjMeta(x.pj,x);if(!Array.isArray(m.composants))return;
      const miss=list.filter(c=>!m.composants.some(y=>y.label.toLowerCase()===c.toLowerCase()));
      if(miss.length)patches[x.pj]={composants:[...m.composants,...miss.map((c,i)=>({id:"c"+Date.now().toString(36)+i,label:c,des:false,cmd:false,inst:false}))]};
    });
    const n=Object.keys(patches).length;if(!n)return 0;
    return (await savePjMetaMulti(patches))?n:false;
  };
  const nameOf=e=>{const o=mentionOpts.find(x=>x.email===lc(e));return o?o.name:nameFromEmail(e);};
  const nMine=countOpenFor(pjComments,me);
  const publicComments=pjComments.filter(c=>!c.private);
  const shownComments=onlyMine?pjComments.filter(c=>mentionsOf(c).includes(me)):showPrivate?pjComments:publicComments;
  // v151 : chaque PJ s'ouvre avec les privés masqués
  useEffect(()=>{setShowPrivate(false);setOnlyMine(false);},[selPj]);

  // Chiffres clés calculés à partir des jalons
  const kpi=useMemo(()=>{
    if(!r)return null;
    const a=dOf(r.arrivee),t=dOf(r.tests),tf=dOf(r.testsFin),fp=dOf(r.finProd),dp=dOf(r.depart);
    const di=ini?dOf(ini.depart):null;
    return{
      pv:pvOf(r),
      driftDepart:di&&dp?diffDays(di,dp):null,
      atelier:a&&dp?diffDays(a,dp):null,
      tests:t?(tf?diffDays(t,tf)+1:1):null,
      toDepart:dp?diffDays(today,dp):null,
      prod:a&&fp?diffDays(a,fp):null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[r,ini,progress]);

  const saveNote=async(key,text)=>{
    if(!savePjMetaOverride||!r)return false;
    const base=pendingNotes.current[r.pj]||(meta&&meta.notes)||{};
    const next={...base,[key]:text||""};
    pendingNotes.current[r.pj]=next;
    try{await savePjMetaOverride(r.pj,{notes:next,notesAt:new Date().toISOString()});return true;}
    catch(e){return false;}
    finally{setTimeout(()=>{if(pendingNotes.current[r.pj]===next)delete pendingNotes.current[r.pj];},1200);}
  };
  const notes=(meta&&meta.notes)||{};
  const gp=r&&meta?globalProgress(r,meta,progress):null;
  const worst=meta?worstFeu(feuxOf(meta)):null;
  const kind=r?presenceKind(r.clientPresence):null;
  const gc=r?(GAMME_COLORS[r.gamme]||T.teal500):T.teal500;

  return(<div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap",justifyContent:"flex-start"}}>
    {multiOpen&&savePjMetaMulti&&<MultiApplyDialog data={data} currentPj={r&&r.pj} savePjMetaMulti={savePjMetaMulti} addCommentMulti={addCommentMulti} addDelayAllocationMulti={addDelayAllocationMulti} delayTypes={delayTypes} authorName={authorName} onClose={()=>setMultiOpen(false)}/>}
    {cdpOpen&&<CdpDialog certifs={certifs} data={data} initialData={initialData} delays={delays} comments={comments} progress={progress} changeLog={changeLog} initialChef={meta&&meta.chefProjet&&meta.chefProjet!=="—"?meta.chefProjet:undefined} onClose={()=>setCdpOpen(false)}/>}
    {codirOpen&&isSuperAdmin()&&<CodirDialog data={data} initialData={initialData} comments={comments} delays={delays} progress={progress} initialPj={r&&r.pj} onClose={()=>setCodirOpen(false)}/>}
    {/* ── Liste : avancement, état et compteurs visibles sans ouvrir la fiche ── */}
    <div className="enogia-mlist" aria-hidden={focus?"true":undefined} style={{...CARD,width:focus?0:listMini?44:listW,opacity:focus?0:1,pointerEvents:focus?"none":"auto",visibility:focus?"hidden":"visible",padding:focus?0:CARD.padding,borderWidth:focus?0:undefined,marginRight:focus?-12:0,transition:"opacity .22s ease, visibility 0s linear "+(focus?".22s":"0s"),flexShrink:0,maxHeight:"calc(100dvh - 200px)",minHeight:300,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:8,borderBottom:"1px solid "+T.line}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:listMini?0:6,justifyContent:listMini?"center":"flex-end"}}>
          {!listMini&&<span style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.accentInk,marginRight:"auto"}}>Projets</span>}
          {listMini&&<button type="button" onClick={()=>setListMini(false)} aria-label="Ouvrir la liste des projets" title="Ouvrir la liste des projets" style={{border:"none",background:"transparent",color:T.ink700,cursor:"pointer",writingMode:"vertical-rl",transform:"rotate(180deg)",fontFamily:T.font,fontSize:FZ.xs,fontWeight:700,padding:"10px 0",minHeight:120,letterSpacing:".04em"}}>Projets · {filteredList.length}</button>}
          <button type="button" onClick={()=>setListMini(v=>!v)} aria-label={listMini?"Agrandir la liste":"Réduire la liste"} title={listMini?"Agrandir la liste":"Réduire la liste pour laisser plus de place à la fiche"} style={{border:"1px solid "+T.line,background:"transparent",color:T.ink500,borderRadius:8,width:28,height:28,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",padding:0}}><span style={{display:"inline-flex",transform:"rotate("+(listMini?"-90deg":"90deg")+")"}}><NavIcon name="chevronDown" size={15}/></span></button>
        </div>
        {!listMini&&<input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un PJ, projet, pays, chef, gamme…" style={{width:"100%",padding:"6px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.xs,fontFamily:T.font,color:T.ink700,boxSizing:"border-box"}}/>}
        {!listMini&&<div style={{fontSize:FZ.xs,color:T.ink300,marginTop:4,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}><span>{filteredList.length} PJ</span><span style={{display:"inline-flex",gap:10}}><label style={{display:"inline-flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="checkbox" checked={showShipped} onChange={e=>setShowShipped(e.target.checked)}/>Expédiées</label><label style={{display:"inline-flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="checkbox" checked={showSlots} onChange={e=>setShowSlots(e.target.checked)}/>Slots libres</label></span></div>}
        {!listMini&&<div role="tablist" aria-label="Regrouper la liste" style={{display:"flex",gap:2,marginTop:6,background:T.surface,borderRadius:8,padding:2}}>
          {[["chef","Par chef"],["all","Tous"],["mine","Mes PJ"]].map(([id,l])=><button key={id} type="button" role="tab" aria-selected={groupBy===id} onClick={()=>setGroupBy(id)} style={{flex:1,border:"none",borderRadius:6,minHeight:26,fontSize:FZ.xs,fontWeight:700,fontFamily:T.font,cursor:"pointer",background:groupBy===id?T.card:"transparent",color:groupBy===id?T.teal600:T.ink500,boxShadow:groupBy===id?T.shadowSm:"none"}}>{l}{id==="mine"&&myPjs.size?" "+myPjs.size:""}</button>)}
        </div>}
      </div>
      <div style={{overflowY:"auto",overflowX:"hidden",flex:1}}>
        {groups.map(g=>(<React.Fragment key={g.key}>
        {g.head&&!listMini&&(
          <div style={{display:"flex",alignItems:"center",gap:4,padding:"4px 6px",background:chefView===g.head?T.teal100:T.surface,borderBottom:"1px solid "+T.line,position:"sticky",top:0,zIndex:1}}>
            <button type="button" onClick={()=>toggleFold(g.key)} aria-expanded={!folded.has(g.key)} aria-label={(folded.has(g.key)?"Déplier ":"Replier ")+g.head} style={{border:"none",background:"transparent",cursor:"pointer",color:T.ink500,minWidth:24,minHeight:24,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:0}}><span style={{display:"inline-flex",transform:folded.has(g.key)?"rotate(-90deg)":"none",transition:"transform .15s ease"}}><NavIcon name="chevronDown" size={13}/></span></button>
            <button type="button" onClick={()=>setChefView(g.head)} title={"Voir tous les projets de "+g.head} style={{flex:1,minWidth:0,border:"none",background:"transparent",cursor:"pointer",textAlign:"left",padding:"2px 0",fontFamily:T.font,fontSize:FZ.sm,fontWeight:700,color:T.ink900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.head}</button>
            {g.late>0&&<span title="En retard sur l'initial" style={{fontFamily:T.fontLabel,fontSize:11,fontWeight:600,color:T.red600,background:T.red100,borderRadius:999,padding:"0 6px"}}>{g.late} en retard</span>}
            <span style={{fontSize:FZ.xs,fontWeight:700,color:T.ink500,fontVariantNumeric:"tabular-nums"}}>{g.rows.length}</span>
          </div>)}
        {(!g.head||!folded.has(g.key))&&(()=>{const rowEl=(row,sub)=>{
          const m=getPjMeta(row.pj,row);
          const nCom=(comments?.[row.pj]||[]).length;
          const nDel=(delays?.[row.pj]||[]).length;
          const pk=presenceKind(row.clientPresence);
          const sel=selPj===row.pj;
          const ec=(ETAT_META[row.etat]||ETAT_META["NOT ORDERED"]);
          const pv=pvOf(row);
          if(listMini)return null; // v196 : liste en tiroir — repliée, seule la languette « Projets » reste
          return(<div key={row.pj} {...pressable(()=>pick(row.pj),{"aria-current":sel?"true":undefined})} style={{padding:sub?"6px 8px 6px 24px":"6px 8px 6px 8px",cursor:"pointer",background:sel?T.teal100:"transparent",borderLeft:"3px solid "+(sel?T.teal500:"transparent"),borderBottom:"1px solid "+T.line}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:ec.bar,flexShrink:0}} title={ec.label}/>
              <span style={{fontWeight:700,fontVariantNumeric:"tabular-nums",color:etatInk(row.etat),fontSize:FZ.sm,whiteSpace:"nowrap",flexShrink:0}}><PjPlate pj={row.pj}/></span>
              <CountryFlag pays={m.pays} size={12}/>
              <span style={{marginLeft:"auto",fontSize:FZ.xs,color:T.ink300,display:"inline-flex",alignItems:"center",gap:8}}>
                {pk&&<span title={"Présence aux tests : "+pk} style={{width:8,height:8,borderRadius:"50%",background:pk==="both"?"linear-gradient(90deg,"+PRESENCE_META.both.color+" 50%,"+PRESENCE_META.both.color2+" 50%)":PRESENCE_META[pk].color}}/>}
                {me&&countOpenFor(comments?.[row.pj],me)>0&&<span title="Demandes qui vous citent, à traiter" style={{background:T.violet100,color:T.violet600,border:"1px solid "+T.violet500,borderRadius:999,padding:"0 6px",fontWeight:800}}>@ {countOpenFor(comments?.[row.pj],me)}</span>}
                {nCom>0&&<span style={{display:"inline-flex",alignItems:"center",gap:2}}><NavIcon name="comments" size={11}/>{nCom}</span>}
                {nDel>0&&<span style={{display:"inline-flex",alignItems:"center",gap:2,color:T.red500}}><NavIcon name="clock" size={11}/>{nDel}</span>}
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,minWidth:0}}><SerieTag pj={row.pj} size={10}/><EpcTag meta={m} short/><span style={{fontSize:FZ.xs,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0,flex:1}}>{m.nomProjet}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
              <div style={{flex:1}}><ProgressBar value={pv} height={3} color={ec.bar}/></div>
              <span style={{fontSize:FZ.xs,fontWeight:700,color:etatInk(row.etat),width:30,textAlign:"right"}}>{pv}%</span>
              <span style={{fontSize:FZ.xs,color:T.ink300}}>{row.depart?fmt(new Date(row.depart)):"—"}</span>
            </div>
          </div>);
};
          return clusterRows(g.rows).map(cl=>{
            if(cl.rows.length<2)return rowEl(cl.rows[0],false);
            if(listMini)return null;
            const open=openCl.has(g.key+cl.base),m0=getPjMeta(cl.rows[0].pj,cl.rows[0]),act=clusterView&&clusterView.key===g.key+cl.base;
            const pvAvg=Math.round(cl.rows.reduce((t,x)=>t+pvOf(x),0)/cl.rows.length);
            return(<React.Fragment key={"cl"+g.key+cl.base}>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",borderBottom:"1px solid "+T.line,background:act?T.teal100:"transparent"}}>
                <button type="button" onClick={()=>setOpenCl(s0=>{const n=new Set(s0);const k=g.key+cl.base;if(n.has(k))n.delete(k);else n.add(k);return n;})} aria-expanded={open} aria-label={(open?"Replier ":"Déplier ")+cl.base} style={{border:"none",background:"transparent",cursor:"pointer",color:T.ink500,minWidth:24,minHeight:24,fontSize:12}}>{open?"▾":"▸"}</button>
                <button type="button" onClick={()=>{setChefView(null);setClusterView({key:g.key+cl.base,label:cl.base+(m0.nomProjet?" · "+m0.nomProjet:"")+" ("+cl.rows.length+" machines)",rows:cl.rows});}} title={"Synthèse commune des "+cl.rows.length+" machines de "+cl.base} style={{flex:1,minWidth:0,border:"none",background:"transparent",cursor:"pointer",textAlign:"left",padding:"2px 0",fontFamily:T.font,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontFamily:T.fontMono,fontWeight:700,fontSize:FZ.sm,color:T.ink900}}>{cl.base}</span>
                  <span style={{fontSize:FZ.xs,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0}}>{m0.nomProjet||""}</span>
                  <span style={{marginLeft:"auto",fontSize:FZ.xs,fontWeight:700,color:T.ink700,background:T.surfaceAlt,borderRadius:999,padding:"0 8px",whiteSpace:"nowrap"}}>{cl.rows.length} machines · {pvAvg}%</span>
                </button>
              </div>
              {open&&cl.rows.map(row=>rowEl(row,true))}
            </React.Fragment>);
          });})()}</React.Fragment>))}
        {!listMini&&<label style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",fontSize:FZ.xs,color:T.ink700,fontWeight:600,cursor:"pointer",borderTop:"1px solid "+T.line}}><input type="checkbox" checked={clusterOn} onChange={e=>setClusterOn(e.target.checked)}/>Regrouper les machines d'un même PJ (PJ461-1, -2…)</label>}
        {filteredList.length===0&&<EmptyNote>Aucun résultat.</EmptyNote>}
        {groupBy==="mine"&&filteredList.length>0&&groups[0].rows.length===0&&<EmptyNote>Aucun PJ à votre nom. Associez vos PJ dans Réglages › Personnes et rôles.</EmptyNote>}
      </div>
    </div>

    {!listMini&&!focus&&<div className="enogia-mhandle" role="separator" aria-orientation="vertical" aria-label="Redimensionner la liste (flèches gauche/droite)" tabIndex={0} onPointerDown={startDrag} onKeyDown={onHandleKey} onDoubleClick={()=>setListW(340)} title="Glisser pour élargir ou réduire la liste · double-clic : taille d'origine"
      style={{width:10,alignSelf:"stretch",minHeight:300,margin:"0 -6px",cursor:"col-resize",flexShrink:0,display:"flex",justifyContent:"center",touchAction:"none"}}><span style={{width:3,borderRadius:2,background:T.line,margin:"8px 0"}}/></div>}
    <div style={{flex:"1 1 560px",minWidth:340,maxWidth:"none"}}>
      {/* v146.15 : les rapports se lancent depuis une barre AU-DESSUS de la fiche, pas dedans (lecture de la synthèse) */}
      {clusterView&&!chefView&&<ChefOverview name={clusterView.label} rows={clusterView.rows} pvOf={pvOf} onPick={pick} onClose={()=>setClusterView(null)} summary={{comments,delays}}/>}
      {chefView&&<ChefOverview name={chefView} rows={(groups.find(g=>g.head===chefView)||{rows:data.filter(x=>x.etat!=="SLOT_LIBRE"&&x.etat!=="SHIPPED"&&(chefsOf(getPjMeta(x.pj,x)).includes(chefView)||(!chefOfRow(x)&&chefView==="Sans chef de projet")))}).rows} pvOf={pvOf} onPick={pick} onClose={()=>setChefView(null)}/>}
      {!chefView&&!clusterView&&r&&<div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,flexWrap:"wrap",marginBottom:8}}>
        <span style={{fontSize:FZ.xs,color:T.ink300,marginRight:"auto"}}>Rapports pour {r.pj}</span>
        {savePjMetaMulti&&<button onClick={()=>setMultiOpen(true)} title="Ajouter une action, un plan de mitigation, un commentaire ou un statut à plusieurs projets en une fois" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",border:"1px solid "+T.line,borderRadius:10,background:T.card,color:T.ink700,fontWeight:700,fontSize:FZ.xs,fontFamily:T.font,cursor:"pointer"}}>＋ Sur plusieurs projets…</button>}
        <button onClick={()=>setCdpOpen(true)} title="Générer le rapport PowerPoint du chef de projet" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",border:"1px solid "+T.line,borderRadius:10,background:T.card,color:T.ink700,fontWeight:700,fontSize:FZ.xs,fontFamily:T.font,cursor:"pointer"}}><NavIcon name="chart" size={13}/>Rapport chef de projet</button>
        {isSuperAdmin()&&<button onClick={()=>setCodirOpen(true)} title="Générer la synthèse CODIR (PDF)" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",border:"none",borderRadius:10,background:T.navy700,color:"#fff",fontWeight:700,fontSize:FZ.xs,fontFamily:T.font,cursor:"pointer"}}><NavIcon name="chart" size={13}/>Rapport CODIR</button>}
      </div>}
      {(chefView||clusterView)?null:!r?<div style={{...CARD,padding:28,textAlign:"center",color:T.ink300}}>Sélectionnez un PJ dans la liste.</div>:
      <div key={r.pj} className="enogia-view-in enogia-mcard" style={{...CARD,overflow:"hidden",display:"flex",flexDirection:"column",height:"calc(100dvh - 244px)",minHeight:420}}>
        <div style={{height:4,flexShrink:0,background:T.navy800,position:"relative"}}><span style={{position:"absolute",left:26,top:0,bottom:0,width:56,background:T.accent}}/></div>
        {/* v134 : la fiche prend la hauteur de l'écran ; elle défile à l'intérieur, l'en-tête (PJ, état, statut) reste figé en haut */}
        <div className="enogia-mcard-in" style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:12,flex:1,minHeight:0,overflowY:"auto",overflowX:"hidden"}}>

        {/* ── En-tête : identité, avancement, message clé ── */}
        <div style={{position:"sticky",top:0,zIndex:8,background:T.card,padding:"12px 16px 8px",margin:"0 -16px",borderBottom:"1px solid "+T.line}}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{minWidth:0,flex:"1 1 300px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span style={{fontSize:FZ.xl,fontWeight:700,letterSpacing:"-.02em",lineHeight:1,color:T.ink900,whiteSpace:"nowrap",flexShrink:0}}><PjPlate pj={r.pj} size="lg"/></span>
                {r.gamme&&<span style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:FZ.md,fontWeight:500,letterSpacing:"-.01em",lineHeight:1,color:T.ink700,whiteSpace:"nowrap"}}><span style={{width:9,height:9,borderRadius:"50%",background:gc,flexShrink:0}}/>{r.gamme}</span>}
                <SerieTag pj={r.pj} size={12} style={{alignSelf:"center",padding:"1px 8px",lineHeight:"18px",borderRadius:8}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:4,fontSize:FZ.sm,fontWeight:500,color:T.ink500}}>
                <span>{meta.nomProjet}</span>
                {chefsOf(meta).map(c=><span key={c} style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:FZ.xs,fontWeight:400}}><Avatar name={c} size={16}/>{c}{meta.epc&&c===meta.chefOrc?" (ORC)":""}</span>)}
                <EpcTag meta={meta}/>
                {isSuperAdmin()&&savePjMetaOverride&&<button type="button" onClick={()=>setChefEdit(v=>!v)} aria-expanded={chefEdit} style={{border:"none",background:"transparent",color:T.teal600,fontSize:FZ.xs,fontWeight:700,cursor:"pointer",minHeight:24,fontFamily:T.font}}>Chefs / EPC</button>}
              </div>
              {chefEdit&&<ChefsEpcEditor meta={meta} onSave={f=>savePjMetaOverride(r.pj,f)} onCancel={()=>setChefEdit(false)}/>}
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:5,fontSize:FZ.xs,color:T.ink500}}>
                <Badge etat={r.etat}/>
                <CertifTag r={r} meta={meta} rows={data} getMeta={getPjMeta} save={savePjMetaOverride&&savePjMetaMulti?(f=>savePjMetaOverride(r.pj,f)):null} saveMulti={savePjMetaMulti} certifs={certifs||[]} setCertifs={setCertifs||(async()=>false)}/>
                {meta.pays&&meta.pays!=="—"&&<span style={{display:"inline-flex",alignItems:"center",gap:6}}><CountryFlag pays={meta.pays} size={13}/>{meta.pays}</span>}
                {kind?<PresenceChip kind={kind} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} fontSize={11.5}/>:<span style={{fontSize:FZ.xs,color:T.ink300}}>Pas de présence aux tests</span>}
              </div>
            </div>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              {worst&&<span style={{display:"inline-flex",alignItems:"center",gap:8,background:feuColor(worst)+"22",color:feuText(worst),borderRadius:999,padding:"4px 12px 4px 8px",fontSize:FZ.xs,fontWeight:800}}><span style={{width:9,height:9,borderRadius:"50%",background:feuColor(worst)}}/>Statut global : {feuLabel(worst)}</span>}
            </div>
          </div>
        </div>

        {/* ══ v146.28 : une zone par domaine, pleine largeur, empilées : Pilotage, Planning, Finance, Suivi ══ */}
        <div style={{display:"flex",flexDirection:"column",gap:D.mode==="compact"?8:12,minWidth:0}}>
        {/* ══ Cadre « Pilotage » (v129) : synthèse, commentaire général, statut global, indicateurs ══ */}
        <Frame title="Pilotage" sub="Où en est ce projet" style={{gap:8}}>
        <Cols>
<Col>
        {/* v178 : en-tête aligné sur « Statut global » et « Indicateurs clés » (les trois colonnes commencent au même niveau). */}
        <Section title="Synthèse"><Synthese r={r} ini={ini} meta={meta}/></Section>

        {/* ── Légende : les deux types de commentaires (v123 : repliée, un clic sur « ? » l'affiche) ── */}
        {savePjMetaOverride&&<div style={{marginTop:-6}}>
          <button type="button" onClick={()=>setShowLegend(v=>!v)} aria-expanded={showLegend} style={{border:"none",background:"transparent",padding:"4px 0",minHeight:24,cursor:"pointer",color:T.ink500,fontSize:FZ.xs,fontFamily:T.font,display:"inline-flex",alignItems:"center",gap:6}}>
            <span aria-hidden="true" style={{width:16,height:16,borderRadius:"50%",border:"1.5px solid "+T.ink500,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:FZ.xs,fontWeight:700}}>?</span>{showLegend?"Masquer la légende des commentaires":"Légende des commentaires"}
          </button>
          {showLegend&&<div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center",fontSize:FZ.xs,color:T.ink500,marginTop:4}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:14,height:10,borderRadius:4,background:T.accent+"14",border:"1px dashed "+T.accent+"99",borderLeft:"3px solid "+T.accent}}/><b style={{color:T.ink700}}>Commentaire de synthèse</b> : cadres laiton, repris dans le rapport CdP (CODIR : commentaire général seul)</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:14,height:10,borderRadius:4,background:T.card,borderLeft:"3px solid "+T.teal500}}/><b style={{color:T.ink700}}>Fil de commentaires</b> : discussion en bas de fiche, hors synthèse (repris dans le rapport CdP)</span>
          </div>}
        </div>}

        {/* ── Commentaire général : le seul commentaire repris dans le CODIR ── */}
        {savePjMetaOverride&&<Section title="Commentaire général" right={<span style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap"}}>repris dans le CODIR et le rapport chef de projet</span>}>
          <NoteField big max={400} value={notes.gen} onSave={t=>saveNote("gen",t)} placeholder="＋ Commentaire général sur le projet (synthèse en 2-3 lignes)"/>
        </Section>}

</Col>
<Col>
        {/* ── Statut global : 4 feux + explication de chacun ── */}
        {savePjMetaOverride?<StatutGlobal meta={meta} pj={r.pj} onSave={f=>savePjMetaOverride(r.pj,f)} onNote={saveNote}/>:null}

</Col>
<Col>
        {/* ── Indicateurs clés + explication de chacun ── */}
        <Section title="Indicateurs clés" right={<span style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap"}}>{kpi.toDepart==null?"":(kpi.toDepart>=0?"J-"+kpi.toDepart+" avant départ":"départ dépassé de "+Math.abs(kpi.toDepart)+" j")}{kpi.atelier!=null?" · séjour atelier "+kpi.atelier+" j":""}{kpi.tests!=null?" · fenêtre tests "+kpi.tests+" j":""}</span>}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,alignItems:"stretch"}}>
            {[
              ["gl","Avancement global",<GlobalTile gp={gp} onSave={savePjMetaOverride?f=>savePjMetaOverride(r.pj,f):null}/>,null],
              ["av","Avancement production",<div style={{display:"flex",alignItems:"center",gap:8}}><Donut v={kpi.pv}/><span style={{fontSize:FZ.xs,color:T.ink300,lineHeight:1.35}}>{r.etat==="SHIPPED"?"expédié":"production chez ENOGIA"}</span></div>,null],
              ["dr","Dérive du départ",<Big color={kpi.driftDepart>0?T.red500:kpi.driftDepart<0?T.emerald600:T.ink900}>{ini?signed(kpi.driftDepart):"—"}</Big>,ini?(kpi.driftDepart===0?"conforme au planning initial":"initial : "+fmtLong(dOf(ini.depart))):"pas de planning initial"],
              ["rt","Retards déclarés",<Big color={totalDelayDays>0?T.red500:T.ink900}>{totalDelayDays>0?totalDelayDays+" j":"0"}</Big>,totalDelayDays>0?pjDelays.length+" cause"+(pjDelays.length>1?"s":"")+" consignée"+(pjDelays.length>1?"s":""):"aucun retard consigné"],
            ].map(([k,lab,val,sub])=>
              <div key={k} className="enogia-pilot-card" style={{background:T.card,borderRadius:8,padding:"6px 8px",minWidth:0,display:"flex",flexDirection:"column"}}>
                <Cap style={{marginBottom:4}}>{lab}</Cap>{val}
                {sub&&<div style={{fontSize:FZ.xs,color:T.ink300,marginTop:3}}>{sub}</div>}
                {savePjMetaOverride&&<NoteField value={notes[k]} onSave={t=>saveNote(k,t)} placeholder="＋ Commentaire de synthèse"/>}
              </div>)}
          </div>
        </Section>
</Col>
        </Cols>
        </Frame>
        <Frame title="Planning" sub="Jalons, contrat, dernier import">
        <Cols>
<Col>
        {/* ── Jalons ── */}
        <Section title="Jalons" right={<span style={{fontSize:FZ.xs,color:T.ink300,whiteSpace:"nowrap"}}>révisé · initial barré · écart</span>}>
          <Timeline r={r} ini={ini} kind={kind}/>
        </Section>

</Col>
<Col>
        {/* ── Contrat & roadmap (T0 / Tfin) ── */}
        {savePjMetaOverride?<ContratSection r={r} meta={meta} onSave={f=>savePjMetaOverride(r.pj,f)} onNote={saveNote}/>:null}
</Col>
<Col>
        {/* ── Depuis le dernier import ── */}
        <LastChange entry={lastChange} pj={r.pj}/>

</Col>
        </Cols>
        </Frame>
        {/* ── Finance : prix de la fiche, pénalités, composants et paiements ── */}
        {savePjMetaOverride&&<Frame title="Finance" sub="Prix de la fiche, pénalités, composants et paiements">
        <Cols>
<Col>
        {savePjMetaMulti?<FicheContratPanel key={"p"+r.pj} part="contrat" r={r} meta={meta} rows={data} getMeta={getPjMeta} today={today} save={f=>savePjMetaOverride(r.pj,f)} saveMulti={savePjMetaMulti}/>:null}
</Col>
<Col>
        {/* ── Gros composants (désigné / commandé / réceptionné (reçu à ENOGIA ou installé)) ── */}
        {savePjMetaOverride&&<ComposantsSection meta={meta} onSave={f=>savePjMetaOverride(r.pj,f)} catalog={compList} setCatalog={setCompCatalog} pjsToComplete={compTodo} onApplyAll={applyCompAll}/>}

</Col>
<Col>
        {/* ── Jalons de paiement ── */}
        {savePjMetaOverride&&<PaiementsSection meta={meta} pj={r.pj} onOpenCash={onOpenCash} authorName={authorName} onSave={f=>savePjMetaOverride(r.pj,f)}/>}

</Col>
        </Cols>
        </Frame>}
        {savePjMetaOverride&&<Frame title="Suivi" sub="Actions, mitigation, retards et commentaires">
        <Cols>
<Col>

        {/* ── Actions de la semaine ── */}
        {savePjMetaOverride&&<ActionsSection meta={meta} onSave={f=>savePjMetaOverride(r.pj,f)} onGroup={groupPatch}/>}

</Col>
<Col>
        {/* ── Plans de mitigation ── */}
        {savePjMetaOverride&&<MitigationSection meta={meta} onSave={f=>savePjMetaOverride(r.pj,f)} onGroup={groupPatch}/>}

</Col>
<Col>
        {/* ── Retards ── */}
            <Section title={"Retards"+(pjDelays.length?" ("+pjDelays.length+")":"")} right={totalDelayDays>0&&<span style={{fontSize:FZ.xs,fontWeight:800,color:T.red500,background:T.red100,borderRadius:8,padding:"2px 8px"}}>{totalDelayDays} j</span>}>
            <Section>
              {addDelayAllocationMulti&&<DelayComposer key={r.pj} types={delayTypes} onNewType={setDelayTypes} onAdd={(t,d,n)=>addDelayAllocationMulti([r.pj],t,d,n,authorName)}/>}
              {pjDelays.length===0?<div style={{color:T.ink300,fontSize:FZ.sm}}>Aucune cause de retard enregistrée.</div>:<>
                <div style={{marginBottom:6}}>
                  <PieBlock size={64} unit="j" sub="de retard" data={byType.map(([type,days])=>{const dc=getDelayColors();const ix=(delayTypes||[]).indexOf(type);return{name:type,value:days,color:dc[(ix<0?(delayTypes||[]).length:ix)%dc.length]};})}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:130,overflowY:"auto"}}>
                  {pjDelays.map(d=>{
                    const others=d.groupPjs?d.groupPjs.filter(p=>p!==r.pj):[];
                    return(<div key={d.id} style={{background:T.card,borderRadius:8,padding:"4px 8px",borderLeft:"3px solid "+T.red500}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,color:T.ink900,fontSize:FZ.xs,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{d.type} — {d.days}j{others.length>0&&<span style={{fontSize:FZ.xs,color:T.violet600,background:T.violet100,borderRadius:4,padding:"1px 8px",fontWeight:700}}>aussi : {others.join(", ")}</span>}</span>
                        <span style={{fontSize:FZ.xs,color:T.ink300,display:"inline-flex",alignItems:"center",gap:4}}>{d.author} · {new Date(d.date).toLocaleDateString("fr-FR")}{deleteDelayAllocation&&<TrashBtn title="Supprimer cette cause de retard" onClick={()=>{if(window.confirm("Supprimer cette cause de retard ("+d.type+", "+d.days+" j) ?"))deleteDelayAllocation(r.pj,d.id);}}/>}</span>
                      </div>
                      {d.note&&<div style={{fontSize:FZ.xs,color:T.ink500,marginTop:2}}>{d.note}</div>}
                    </div>);
                  })}
                </div>
              </>}
            </Section>
            </Section>

</Col>
<Col>
                    <Section title="Fil de commentaires" right={<span style={{display:"inline-flex",alignItems:"center",gap:8}}><button type="button" onClick={toggleThread} aria-expanded={threadOpen} style={{border:"1px solid "+T.line,background:T.card,color:T.ink700,borderRadius:8,padding:"2px 8px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>{threadOpen?"Replier":"Ouvrir"}</button><span style={{fontSize:FZ.xs,color:T.ink500}}>{(showPrivate?pjComments:publicComments).length} message{(showPrivate?pjComments:publicComments).length>1?"s":""}</span>{mentionOpts.length>0&&me&&pjComments.some(c=>mentionsOf(c).includes(me))&&<button onClick={()=>setOnlyMine(v=>!v)} style={{border:"1px solid "+(onlyMine||nMine>0?T.violet500:T.line),background:onlyMine?T.violet100:"transparent",color:onlyMine||nMine>0?T.violet600:T.ink500,borderRadius:8,padding:"2px 8px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>@ Pour moi{nMine>0?" ("+nMine+" à traiter)":""}</button>}{nPrivate>0&&<button onClick={()=>setShowPrivate(v=>!v)} aria-pressed={showPrivate} title={showPrivate?"Masquer les commentaires privés":"Afficher les commentaires privés (BU ORC uniquement)"} style={{border:"1px solid "+(showPrivate?T.amber500:T.line),background:showPrivate?T.amber100:"transparent",color:showPrivate?T.amber600:T.ink500,borderRadius:8,padding:"2px 8px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>{showPrivate?"Masquer les privés":"Afficher les privés ("+nPrivate+")"}</button>}<span style={{fontSize:FZ.xs,color:T.ink300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{threadOpen?"Discussion entre managers, propre à ce projet":((showPrivate?pjComments:publicComments).length?(()=>{const c=publicComments[0]||pjComments[0];const t=(c.private?"(privé) ":"")+c.author+" : "+String(c.text||"").replace(/\s+/g," ");return t.length>90?t.slice(0,89)+"…":t;})():"Aucun message pour l'instant")}</span></span>}>
              {threadOpen&&<>
              <div style={{fontSize:FZ.xs,color:T.ink500,marginBottom:2,lineHeight:1.45}}>Écrivez ici pour échanger avec les autres managers : chaque message est daté et signé ; taguez un manager (@) pour qu'il suive une demande précise. <b>Ces messages ne font pas partie de la synthèse ci-dessus</b> ; seuls les derniers messages non privés peuvent être joints au CODIR.</div>
              {addComment&&<CommentComposer key={r.pj} pj={r.pj} options={mentionOpts} me={me} info={{pj:r.pj,projet:getPjMeta(r.pj,r).nomProjet,author:authorName||"Manager"}} onAdd={(t,pv,mn)=>addComment(r.pj,authorName||"Manager",t,null,pv,mn)}/>}
              {shownComments.length===0?<div style={{color:T.ink300,fontSize:FZ.sm}}>{onlyMine?"Aucun message ne vous cite.":nPrivate>0&&!showPrivate?"Aucun message public — "+nPrivate+" privé"+(nPrivate>1?"s":"")+" masqué"+(nPrivate>1?"s":"")+".":"Aucun message pour l'instant."}</div>:
                <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:230,overflowY:"auto"}}>
                  {shownComments.map(c=>{
                    const others=c.groupPjs?c.groupPjs.filter(p=>p!==r.pj):[];
                    const mine=isOpenFor(c,me),mn=mentionsOf(c);
                    return(<div key={c._idx} style={{background:c.private?T.amber100:mine?T.violet100:T.card,borderRadius:8,padding:"4px 8px",borderLeft:"3px solid "+(c.private?T.amber500:mn.length?T.violet500:T.teal500)}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,color:T.teal600,fontSize:FZ.xs,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{c.author}{c.private&&<span style={{fontSize:FZ.xs,color:T.amber600,background:T.amber100,borderRadius:4,padding:"1px 6px",fontWeight:700}}>Privé</span>}{others.length>0&&<span style={{fontSize:FZ.xs,color:T.violet600,background:T.violet100,borderRadius:4,padding:"1px 6px",fontWeight:700}}>aussi : {others.join(", ")}</span>}</span>
                        <span style={{fontSize:FZ.xs,color:T.ink300,display:"inline-flex",alignItems:"center",gap:4}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}{deleteComment&&<TrashBtn title="Supprimer ce commentaire" onClick={()=>{if(window.confirm("Supprimer ce commentaire ?"))deleteComment(r.pj,c._idx);}}/>}</span>
                      </div>
                      <div style={{fontSize:FZ.xs,color:T.ink700,whiteSpace:"pre-wrap",marginTop:2}}>{c.text}</div>
                      {mn.length>0&&<div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginTop:4}}>
                        {mn.map(e=>{const done=isResolvedFor(c,e);return(<span key={e} title={done?"Traité":"À traiter"} style={{fontSize:FZ.xs,fontWeight:700,borderRadius:999,padding:"1px 8px",background:done?T.emerald100:T.violet100,color:done?T.emerald600:T.violet600,border:"1px solid "+(done?T.emerald500:T.violet500)}}>{done?"✓ ":"@ "}{nameOf(e)}{done?" · traité":""}</span>);})}
                        {mn.includes(me)&&resolveComment&&<button type="button" onClick={()=>resolveComment(r.pj,c._idx,me,!isResolvedFor(c,me))} style={{border:"1px solid "+T.line,background:T.card,color:T.ink700,borderRadius:8,padding:"1px 8px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>{isResolvedFor(c,me)?"Rouvrir":"Marquer traité ✓"}</button>}
                      </div>}
                      {c.linkedDate&&<div style={{marginTop:4,fontSize:FZ.xs,color:T.ink500,fontWeight:600}}>Lié au {fmt(new Date(c.linkedDate))}</div>}
                    </div>);
                  })}
                </div>}
              </>}
            </Section>
</Col>
        </Cols>
        </Frame>}
        </div>
        </div>
      </div>}
    </div>
  </div>);
}
