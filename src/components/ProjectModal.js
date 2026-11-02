import React, { useState, useEffect } from "react";
import { T, FZF as FZ, stripeBg, stripeHues, stageSoft, inkOn } from "../theme";
import { SerieTag, getPjMeta, PresenceChip, presenceKind, presenceDates, presenceFirstDate, CountryFlag, MONTHS_FULL, today, ALL_GAMMES, getAllChefs, ALL_PAYS, relTime, Avatar, ETAT_META, chefsOf, EpcTag, orcSupportOf } from "../pjMeta";
import { ChefsEpcFields, chefsEpcOf } from "./ChefsEpc";
import { fmt, fmtMode } from "../parsers";
import { MentionPicker, MentionTextarea } from "./MentionPicker";
import { useMentions } from "../mentionContext";
import { typedMentions } from "../mentions";
import { Badge, NavIcon, Select, DelayScopeNote, EmptyState, SuperOnly, NewDelayType, PjPlate } from "./SharedUI";
import { PHASES } from "./GanttView";
import { useDetailMode } from "../detailMode";

// La fiche projet (panneau de droite) doit rester "blanche mate entièrement" (demandé
// explicitement) : les sous-blocs internes (onglets, cartes de phase, commentaires...)
// utilisaient T.surface/T.surfaceAlt, c'est-à-dire le crème de la page — remplacé par T.panel/
// T.panelDim (un gris neutre), pour que l'ensemble du panneau reste sur un registre blanc/gris,
// sans crème. Ce sont des tokens de thème (plutôt que des constantes figées comme avant) pour
// rester cohérents en mode sombre ("mettre le mode sombre en adéquation avec le mode clair").

// placeholder affiché par la fiche persistante (mode inline) quand aucune ligne n'est sélectionnée —
// garde la même largeur/chrome que la fiche remplie pour que la mise en page ne saute pas.
function InlinePanelPlaceholder(){
  return(<div style={{position:"sticky",top:16,width:"100%",boxShadow:T.shadowCard,borderRadius:12,background:T.card,fontFamily:T.font,boxSizing:"border-box"}}>
    <EmptyState compact icon="list" title="Aucun PJ sélectionné" hint="Sélectionnez une ligne du tableau pour afficher le détail du projet ici."/>
  </div>);
}

export function ProjectModal({pj,data,df,onClose,comments,addComment,deleteComment,pinOk,delays,delayTypes,setDelayTypes,addDelayAllocation,deleteDelayAllocation,addDelayComment,deleteDelayComment,authorName,savePjMetaOverride,inline,canEditMeta,embedded}){
  const [editingMeta,setEditingMeta]=useState(false);
  const [detailMode,setDetailMode]=useDetailMode();
  const center=!inline&&!embedded&&detailMode==="popup"; // v159 : fenêtre centrale au choix de la personne
  const [tab,setTab]=useState("apercu");
  // Fermeture au clavier (Échap) — demandé explicitement, pour la fiche en mode "popup" (Gantt,
  // Calendrier) ; avant tout retour anticipé pour respecter l'ordre des hooks React. Le mode inline
  // (liste) n'a pas de popup à fermer, mais laisser l'écouteur actif ne fait rien de gênant.
  useEffect(()=>{
    if(!pj||!onClose)return;
    const onKey=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[pj,onClose]);
  const r=pj?data.find(x=>x.pj===pj):null;
  const dates=r?PHASES.map(ph=>({...ph,date:r[ph.k]?new Date(r[ph.k]):null})).filter(p=>p.date):[];
  // Mode "inline" (demandé explicitement) : fiche persistante à côté de la liste plutôt qu'un
  // panneau qui s'ouvre/se ferme par-dessus la page. Sans sélection valide, on affiche un état
  // vide de même gabarit plutôt que de ne rien rendre, pour que la colonne ne disparaisse pas.
  if(!r||dates.length===0){
    if(inline)return <InlinePanelPlaceholder/>;
    if(embedded)return <div style={{padding:"10px 16px",fontSize:FZ.sm,color:T.ink500}}>Pas encore de dates pour ce PJ.</div>;
    return null;
  }
  const meta=getPjMeta(pj,r);
  const minD=new Date(Math.min(...dates.map(d=>d.date)));
  const maxD=new Date(Math.max(...dates.map(d=>d.date)));
  // mois à afficher : du mois de la première étape au mois de la dernière (max 3 pour rester lisible)
  const months=[];
  let cur=new Date(minD.getFullYear(),minD.getMonth(),1);
  const end=new Date(maxD.getFullYear(),maxD.getMonth(),1);
  while(cur<=end&&months.length<3){months.push(new Date(cur));cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);}

  const evByDay=(y,m)=>{
    const map={};
    dates.forEach(d=>{if(d.date.getFullYear()===y&&d.date.getMonth()===m){const day=d.date.getDate();if(!map[day])map[day]=[];map[day].push(d);}});
    return map;
  };

  // Mode inline (demandé explicitement) : fiche toujours présente à côté de la liste, qui se met
  // à jour au clic sur une ligne, plutôt qu'un panneau qui s'ouvre/se ferme par-dessus la page.
  // Pas de fond assombri, pas de position fixe, pas d'animation : c'est un simple bloc du flux de
  // page (position:sticky pour rester visible pendant le scroll de la liste), plus petit et dont
  // la largeur s'adapte (responsive) à la place disponible à côté du tableau.
  const pad=18,fp=center?pad+4:pad; // fp : marge intérieure réelle (barre d'actions collée au bas)
  // height:"100%" ici (avec le parent étiré en pleine hauteur de la liste dans TableView) : c'est
  // ce qui donne au panneau position:sticky ci-dessous assez de hauteur de défilement pour suivre
  // la page jusqu'en bas, au lieu de décrocher après le premier écran.
  // Plus de voile sombre derrière le panneau en mode popup (Gantt/Calendrier) — demandé
  // explicitement ("que cela ne grise pas l'arrière-plan") : le calque reste présent (zone
  // cliquable pour fermer en cliquant à l'extérieur) mais transparent.
  const body=()=>(<>
      {/* v190 (maquette B validée) : en-tête sur une ligne, parcours en 5 étapes (étape en cours encadrée, écart au départ),
          4 chiffres clés, onglets, actions en bas. */}
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
        {!embedded&&<><PjPlate pj={pj} size="lg"/>
        <Badge etat={r.etat}/></>}
        <EpcTag meta={meta}/>
        {r.gamme&&<span style={{fontFamily:T.fontLabel,fontSize:12,fontWeight:600,color:T.ink700,border:"1px solid "+T.line,borderRadius:6,padding:"1px 7px"}}>{r.gamme}</span>}
        {!editingMeta&&meta.nomProjet&&meta.nomProjet!=="—"&&<span style={{fontFamily:T.fontDisplay,fontSize:20,fontWeight:600,letterSpacing:"-.01em",color:T.ink900,minWidth:0,lineHeight:1.15,flex:"1 1 140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={meta.nomProjet}>{meta.nomProjet}</span>}
        <span style={{display:"inline-flex",gap:6,alignItems:"center",marginLeft:"auto",flexShrink:0}}>
          {!embedded&&<button onClick={()=>setDetailMode(detailMode==="popup"?"panel":"popup")} title={detailMode==="popup"?"Afficher les fiches dans un volet à droite":"Afficher les fiches dans une fenêtre centrale"} aria-label={detailMode==="popup"?"Passer en volet latéral":"Passer en pop-up central"} style={{background:T.panel,border:"none",borderRadius:8,height:30,padding:"0 9px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",color:T.ink700,display:"inline-flex",alignItems:"center",gap:6,fontFamily:T.font}}><NavIcon name={detailMode==="popup"?"sidepanel":"popup"} size={13}/>{detailMode==="popup"?"Volet":"Pop-up"}</button>}
          <button onClick={onClose} title={inline?"Désélectionner":"Fermer"} aria-label={inline?"Désélectionner":"Fermer"} style={{background:T.panel,border:"none",borderRadius:8,width:30,height:30,fontSize:FZ.md,cursor:"pointer",color:T.ink700,flexShrink:0}}><NavIcon name="close" size={11}/></button>
        </span>
      </div>
      {editingMeta
        ?<EditMetaForm meta={meta} gamme={r.gamme} onCancel={()=>setEditingMeta(false)} onSave={async fields=>{const ok=await savePjMetaOverride(pj,fields);if(ok)setEditingMeta(false);}}/>
        :<div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",fontSize:FZ.xs,color:T.ink500,marginBottom:12}}>
          {meta.pays&&meta.pays!=="—"&&<span style={{display:"inline-flex",alignItems:"center",gap:5}}><CountryFlag pays={meta.pays} size={13}/>{meta.pays}</span>}
          {chefsOf(meta).map(c=><span key={c} style={{display:"inline-flex",alignItems:"center",gap:5}}><Avatar name={c} size={16}/>{c}</span>)}
          {orcSupportOf(meta)&&<span title="Chef de projet ORC en soutien du chef de projet EPC">soutien ORC : {orcSupportOf(meta)}</span>}
          <SerieTag pj={pj} size={11}/>
          {presenceKind(r.clientPresence)&&<PresenceChip kind={presenceKind(r.clientPresence)} date={presenceFirstDate(r.clientPresence)} dates={presenceDates(r.clientPresence)} compact tiny/>}
          {canEditMeta&&savePjMetaOverride&&<button onClick={()=>setEditingMeta(true)} title="Modifier le nom, le pays, le chef de projet, la gamme" style={{background:"transparent",border:"none",padding:"2px 4px",minHeight:24,fontSize:FZ.xs,fontWeight:700,color:T.teal600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4,fontFamily:T.font}}><NavIcon name="edit" size={12}/>Modifier</button>}
        </div>}
      {(()=>{
        const S=stageSoft(),d=k=>r[k]?new Date(r[k]):null,t0=new Date(today);t0.setHours(0,0,0,0);
        const steps=[["arrivee","Arrivée",d("arrivee"),S.arrivee],["production","Production",d("arrivee"),S.production],["tests","Tests",d("tests"),S.tests],["finProd","Fin prod",d("finProd"),S.finProd],["depart","Départ",d("depart"),S.depart]];
        const reached=i=>{const x=steps[i][2];return !!x&&x<=t0;};
        let curI=-1;steps.forEach((st,i)=>{if(i>0&&reached(i))curI=i;else if(i===1&&reached(0))curI=Math.max(curI,1);});
        if(r.etat==="SHIPPED")curI=4;
        const next=steps.find((st,i)=>i!==1&&st[2]&&st[2]>t0);
        const nDays=next?Math.round((next[2]-t0)/86400000):null;
        const pd=presenceDates(r.clientPresence),pres=pd.client||pd.nobo;
        const nCom=(comments?.[pj]||[]).filter(c=>!c.private).length;
        const Num=({l,v,c})=><div style={{background:T.panel,borderRadius:10,padding:"7px 10px",minWidth:0}}><div style={{fontFamily:T.fontLabel,fontSize:12,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l}</div><div style={{fontFamily:T.fontDisplay,fontSize:17,fontWeight:600,color:c||T.ink900,fontVariantNumeric:"tabular-nums",lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div></div>;
        return(<>
          <div role="list" aria-label="Parcours de la machine" style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:3,marginBottom:10}}>
            {steps.map(([k,l,dt,tone],i)=>{const done=i<curI||(i===curI&&i===4),on=i===curI&&i!==4,fill=done||on;return(
              <div role="listitem" key={k} className="enogia-bar-fill" aria-current={on?"step":undefined} style={{background:fill?tone.solid:T.panel,color:fill?inkOn(tone.solid):T.ink500,borderRadius:i===0?"6px 0 0 6px":i===4?"0 6px 6px 0":0,padding:"5px 4px",textAlign:"center",minWidth:0,outline:on?"2px solid "+T.ink900:"none",outlineOffset:-2}}>
                <div style={{fontFamily:T.fontLabel,fontSize:11,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l}</div>
                <div style={{fontSize:FZ.xs,fontWeight:700,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{k==="production"?"":dt?fmtMode(dt,df):"—"}{k==="depart"&&r.drift>0?" +"+r.drift+" j":""}</div>
                {on&&<div style={{fontFamily:T.fontLabel,fontSize:11,fontWeight:600}}>en cours</div>}
              </div>);})}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:6,marginBottom:14}}>
            <Num l="Prochain jalon" v={next?next[1]+(nDays!=null?(nDays===0?" · auj.":" · "+nDays+" j"):""):"—"}/>
            <Num l="Écart initial" v={r.drift>0?"+"+r.drift+" j":r.drift<0?r.drift+" j":"à l'heure"} c={r.drift>10?T.red500:r.drift>0?T.amber600:T.emerald600}/>
            <Num l="Client / NOBO" v={presenceKind(r.clientPresence)?(pd.client&&pd.nobo?"Les deux":pd.nobo?"NOBO":"Client")+(pres?" · "+fmtMode(new Date(pres),df):""):"Non"}/>
            <Num l="Commentaires" v={nCom}/>
          </div>
        </>);
      })()}

      {/* ── Onglets : séparer la vue d'ensemble des commentaires évite d'avoir à
          descendre tout le panneau pour trouver/écrire un commentaire. ── */}
      <div role="tablist" aria-label="Sections de la fiche" style={{display:"flex",gap:4,marginBottom:14,borderBottom:"1px solid "+T.line}}>
        {[
          {key:"apercu",label:"Aperçu",icon:"calendar"},
          {key:"commentaires",label:"Commentaires",icon:"comments",count:(comments?.[pj]||[]).filter(c=>!c.private).length},
          ...(pinOk&&delayTypes?[{key:"retards",label:"Retards",icon:"clock",count:(delays?.[pj]||[]).length}]:[]),
        ].map(t=><button key={t.key} role="tab" aria-selected={tab===t.key} onClick={()=>setTab(t.key)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"9px 6px",marginBottom:-1,border:"none",borderBottom:"3px solid "+(tab===t.key?T.teal500:"transparent"),borderRadius:0,cursor:"pointer",background:"transparent",color:tab===t.key?T.ink900:T.ink500,fontSize:FZ.xs,fontWeight:700,transition:"border-color .18s ease,color .15s ease"}}>
          <NavIcon name={t.icon} size={12}/>{t.label}{t.count>0&&<span style={{fontSize:FZ.xs,fontWeight:700,color:tab===t.key?"#fff":T.ink500,background:tab===t.key?T.teal500:T.ink100,borderRadius:999,padding:"1px 6px"}}>{t.count}</span>}
        </button>)}
      </div>

      {tab==="apercu"&&<>
        {(()=>{const L=(comments?.[pj]||[]).filter(c=>!c.private);const c=L.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).pop();return c?(
          <button type="button" onClick={()=>setTab("commentaires")} style={{display:"block",width:"100%",textAlign:"left",background:T.panel,border:"none",borderRadius:10,padding:"8px 10px",marginBottom:14,cursor:"pointer",fontFamily:T.font,color:T.ink700,fontSize:FZ.xs,lineHeight:1.45}}>
            <span style={{color:T.ink500}}>Dernier commentaire · {c.author||"—"} · {relTime(c.date)} : </span>« {String(c.text||"").replace(/\s+/g," ").slice(0,160)}{String(c.text||"").length>160?"…":""} »
          </button>):null;})()}
        {!embedded&&<><div style={{display:"grid",gridTemplateColumns:"repeat("+months.length+",minmax(0,1fr))",gap:8}}>
          {months.map((mo,mi)=>{
            const y=mo.getFullYear(),m=mo.getMonth();
            const de=evByDay(y,m);
            const fd=new Date(y,m,1).getDay();
            const adj=(fd+6)%7;
            const dim=new Date(y,m+1,0).getDate();
            const cells=[...Array(adj).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
            return(<div key={mi} style={{minWidth:0}}>
              <div style={{textAlign:"center",fontWeight:700,fontSize:FZ.xs,color:T.ink900,marginBottom:8}}>{MONTHS_FULL[m]} {y}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:2}}>
                {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:FZ.xs,fontWeight:700,color:T.ink300}}>{d}</div>)}
                {cells.map((day,ci)=>{
                  if(!day)return<div key={"e"+ci}/>;
                  const evs=de[day]||[];
                  const isToday=day===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
                  return(<div key={day} style={{aspectRatio:"1",borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:FZ.xs,fontWeight:evs.length?700:500,color:evs.length?evs[0].ink:isToday?T.teal600:T.ink700,background:evs.length?evs[0].bg:isToday?T.teal100:"transparent",border:evs.length?"1.5px solid "+evs[0].c:isToday?"1.5px solid "+T.teal400:"none",position:"relative"}}>
                    {day}
                    {evs.length>1&&<div style={{position:"absolute",bottom:1,right:2,fontSize:FZ.xs,color:evs[0].ink}}>+{evs.length-1}</div>}
                  </div>);
                })}
              </div>
            </div>);
          })}
        </div>

        <div style={{display:"flex",gap:12,marginTop:18,paddingTop:14,borderTop:"1px solid "+T.line,flexWrap:"wrap"}}>
          {PHASES.map(ph=><span key={ph.k} style={{display:"flex",alignItems:"center",gap:4,fontSize:FZ.xs}}><span style={{width:13,height:13,borderRadius:4,background:ph.bg,border:"1.5px solid "+ph.c}}/><span style={{color:T.ink500}}>{ph.t}</span></span>)}
        </div>
        </>}
      </>}

      {tab==="commentaires"&&<ProjectComments pj={pj} comments={comments?.[pj]||[]} addComment={addComment} deleteComment={deleteComment} pinOk={pinOk} authorName={authorName}/>}
      {tab==="retards"&&pinOk&&delayTypes&&<DelayAllocations pj={pj} delays={delays?.[pj]||[]} delayTypes={delayTypes} setDelayTypes={setDelayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation} addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName}/>}
      <div style={embedded?{marginTop:12,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}:{position:"sticky",bottom:-fp,margin:"16px -"+fp+"px -"+fp+"px",padding:"10px "+fp+"px",background:T.card,borderTop:"1px solid "+T.line,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",zIndex:3}}>
        <button type="button" onClick={()=>setTab("commentaires")} className="enogia-btn-ind" style={{background:"transparent",border:"1px solid "+T.line,borderRadius:8,minHeight:30,padding:"0 10px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",color:T.ink700,display:"inline-flex",alignItems:"center",gap:6,fontFamily:T.font}}><NavIcon name="comments" size={13}/>Commenter</button>
        {pinOk&&delayTypes&&<button type="button" onClick={()=>setTab("retards")} className="enogia-btn-ind" style={{background:"transparent",border:"1px solid "+T.line,borderRadius:8,minHeight:30,padding:"0 10px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",color:T.ink700,display:"inline-flex",alignItems:"center",gap:6,fontFamily:T.font}}><NavIcon name="clock" size={13}/>Déclarer un retard</button>}
        {pinOk&&<button type="button" className="enogia-btn-ind" onClick={()=>{try{window.dispatchEvent(new CustomEvent("enogia:openSynthese",{detail:{pj}}));}catch(e){}if(onClose)onClose();}} title="Ouvrir la fiche synthèse de ce PJ (Manager)" style={{marginLeft:"auto",background:T.ink900,border:"none",borderRadius:8,minHeight:30,padding:"0 12px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",color:T.card,display:"inline-flex",alignItems:"center",gap:6,fontFamily:T.font,whiteSpace:"nowrap"}}><NavIcon name="arrow" size={13}/>Fiche synthèse</button>}
      </div>

  </>);
  // v199 : sous la ligne de la Liste, la fiche est un simple bloc déplié (liseré de l'état à gauche, fond légèrement teinté)
  if(embedded)return(<div className="enogia-row-open" style={{padding:"10px 16px 12px",background:T.surface,borderLeft:"3px solid "+(((r&&ETAT_META[r.etat])||{}).bar||T.teal500),fontFamily:T.font}}>{body()}</div>);
  return(<div className={inline?"":"enogia-panel-backdrop"} onClick={inline?undefined:onClose} style={inline?{width:"100%",height:"100%"}:center?{position:"fixed",inset:0,background:"rgba(8,12,28,.45)",backdropFilter:"blur(3px)",WebkitBackdropFilter:"blur(3px)",zIndex:9998,fontFamily:T.font,display:"flex",alignItems:"center",justifyContent:"center",padding:16}:{position:"fixed",inset:0,background:"transparent",zIndex:9998,fontFamily:T.font}}>
    <div role={inline?undefined:"dialog"} aria-modal={inline?undefined:"true"} aria-label={inline?undefined:"Fiche "+pj} className={inline?"":center?"enogia-pop-in":"enogia-panel-slide"} onClick={inline?undefined:e=>e.stopPropagation()} style={inline?{position:"sticky",top:16,width:"100%",maxHeight:"calc(100dvh - 32px)",background:stripeBg(((r&&ETAT_META[r.etat])||{}).bar||stripeHues().brand,T.card,4),padding:pad,overflowY:"auto",border:"1px solid "+T.line,borderRadius:12,boxSizing:"border-box"}:center?{position:"relative",width:"min(600px,100%)",maxHeight:"min(90vh,860px)",background:stripeBg(((r&&ETAT_META[r.etat])||{}).bar||stripeHues().brand,T.card,4),padding:pad+4,overflowY:"auto",border:"1px solid "+T.line,borderRadius:16,boxShadow:"0 24px 70px rgba(0,0,0,.35)",boxSizing:"border-box"}:{position:"fixed",top:0,right:0,bottom:0,width:"min(440px,100vw)",background:stripeBg(((r&&ETAT_META[r.etat])||{}).bar||stripeHues().brand,T.card,4),padding:pad,overflowY:"auto",boxShadow:"-10px 0 36px rgba(12,36,54,.28)"}}>
      {body()}
    </div>
  </div>);
}

// ── Édition rapide des infos projet (nom / pays / chef de projet / gamme) depuis la fiche ──
export function EditMetaForm({meta,gamme,onSave,onCancel}){
  const [nomProjet,setNomProjet]=useState(meta.nomProjet||"");
  const [pays,setPays]=useState(meta.pays||"");
  const [chefProjet,setChefProjet]=useState(meta.chefProjet||"");
  const [gammeVal,setGammeVal]=useState(gamme||"");
  const [extra,setExtra]=useState(()=>chefsEpcOf(meta)); // v191 : autres chefs, EPC, chef ORC
  const allChefs=getAllChefs();
  const [saving,setSaving]=useState(false);
  const submit=async ()=>{
    setSaving(true);
    await onSave({nomProjet:nomProjet.trim(),pays:pays.trim(),chefProjet:chefProjet.trim(),gamme:gammeVal,chefsExtra:extra.chefsExtra.filter(c=>c!==chefProjet.trim()),epc:extra.epc,chefOrc:extra.epc?extra.chefOrc.trim():""});
    setSaving(false);
  };
  const fieldStyle={padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink900,background:T.card};
  return(<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:6,maxWidth:420}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:FZ.xs,fontWeight:600,color:T.ink500}}>Nom du projet
        <input type="text" value={nomProjet} onChange={e=>setNomProjet(e.target.value)} style={fieldStyle}/>
      </label>
      <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:FZ.xs,fontWeight:600,color:T.ink500}}>Pays
        {/* Liste déroulante (plutôt qu'un texte libre) — le drapeau se met à jour automatiquement
            dès qu'on choisit un pays (demandé explicitement), garanti puisqu'on ne peut plus taper
            une orthographe qui ne correspond à aucun drapeau connu. */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <CountryFlag pays={pays} size={16}/>
          <select value={pays} onChange={e=>setPays(e.target.value)} style={{...fieldStyle,flex:1}}>
            {!ALL_PAYS.includes(pays)&&pays&&<option value={pays}>{pays}</option>}
            {ALL_PAYS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </label>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:FZ.xs,fontWeight:600,color:T.ink500}}>Chef de projet
        {/* Liste déroulante (plutôt qu'un texte libre) construite à partir des chefs de projet
            connus (référentiel + synchro Suivi ORC + corrections manuelles), déjà stockés en
            "Prénom NOM" complet — demandé explicitement. */}
        {/* v195 : nom libre (nouveau chef possible) avec la liste des chefs connus en suggestion */}
        <input list="enogia-chef-main" value={chefProjet} onChange={e=>setChefProjet(e.target.value)} placeholder="Nom du chef de projet" style={fieldStyle}/>
        <datalist id="enogia-chef-main">{allChefs.map(c=><option key={c} value={c}/>)}</datalist>
      </label>
      <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:FZ.xs,fontWeight:600,color:T.ink500}}>Gamme
        <select value={gammeVal} onChange={e=>setGammeVal(e.target.value)} style={fieldStyle}>
          {!ALL_GAMMES.includes(gammeVal)&&gammeVal&&<option value={gammeVal}>{gammeVal}</option>}
          {ALL_GAMMES.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
      </label>
    </div>
    <ChefsEpcFields value={extra} onChange={setExtra} mainChef={chefProjet}/>
    <div style={{display:"flex",gap:8,marginTop:2}}>
      <button onClick={submit} disabled={saving} style={{padding:"8px 16px",borderRadius:8,border:"none",background:T.teal500,color:"#fff",fontSize:FZ.sm,fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?.6:1}}>{saving?"Enregistrement…":"Enregistrer"}</button>
      <button onClick={onCancel} style={{padding:"8px 12px",borderRadius:8,border:"none",background:T.panel,color:T.ink700,fontSize:FZ.sm,fontWeight:600,cursor:"pointer"}}>Annuler</button>
    </div>
  </div>);
}

export function ProjectComments({pj,comments,addComment,deleteComment,pinOk,authorName}){
  const [authorInput,setAuthorInput]=useState("");
  const author=authorName||authorInput;
  const [text,setText]=useState("");
  const [isPrivate,setIsPrivate]=useState(false);
  const mctx=useMentions();
  const [showPrivate,setShowPrivate]=useState(false); // v151 : privés masqués à l'ouverture d'un PJ, affichés sur demande
  useEffect(()=>{setShowPrivate(false);},[pj]);
  const [err,setErr]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null); // index original du commentaire à supprimer
  const [pinInput,setPinInput]=useState("");
  const submit=async ()=>{
    if(!author.trim()){setErr("Le nom est obligatoire pour publier un commentaire.");return;}
    if(!text.trim())return;
    setErr("");
    const tagged=typedMentions(text,mctx.options);
    const ok=await addComment(pj,author,text,null,isPrivate,tagged.map(o=>o.email));
    if(ok){setText("");setIsPrivate(false);}
  };
  const confirmDelete=async ()=>{
    const ok=await deleteComment(pj,deleteTarget,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };
  const withIndex=comments.map((c,i)=>({...c,_idx:i}));
  const nPriv=pinOk?withIndex.filter(c=>c.private).length:0;
  const visible=pinOk&&showPrivate?withIndex:withIndex.filter(c=>!c.private);
  const sorted=[...visible].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return(<div>
    {/* Composeur toujours en haut, dans son propre cadre : on écrit un commentaire
        sans avoir à chercher où, ni à faire défiler le fil existant. */}
    <div style={{background:T.panel,borderRadius:12,padding:12,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8,flexWrap:"wrap"}}>
        {authorName?
          <span style={{fontSize:FZ.xs,color:T.ink500}}>En tant que <strong style={{color:T.ink700}}>{authorName}</strong></span>
          :<input type="text" value={authorInput} onChange={e=>{setAuthorInput(e.target.value);setErr("");}} placeholder="Votre nom (obligatoire)" maxLength={40}
            style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:FZ.sm,fontFamily:T.font,color:T.ink700}}/>}
        {pinOk?<label style={{display:"flex",alignItems:"center",gap:6,fontSize:FZ.xs,color:T.ink500,fontWeight:600,cursor:"pointer"}}>
          <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)}/> Privé (BU ORC uniquement)
        </label>:<span/>}
      </div>
      {err&&<div style={{fontSize:FZ.sm,color:T.red500,marginBottom:6}}>{err}</div>}
      <MentionTextarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ajouter un commentaire..." rows={3} maxLength={1000}
        style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink700,resize:"vertical",width:"100%",boxSizing:"border-box",background:T.card}}/>
      <MentionPicker text={text} pjs={[pj]}/>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
        <button onClick={submit} disabled={!text.trim()} style={{padding:"8px 16px",borderRadius:8,border:"none",background:text.trim()?T.teal500:T.panelDim,color:text.trim()?"#fff":T.ink300,fontSize:FZ.sm,fontWeight:700,cursor:text.trim()?"pointer":"default"}}>Publier</button>
      </div>
    </div>

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:8}}>
      <span style={{fontSize:FZ.xs,fontWeight:600,color:T.ink500}}>{sorted.length} commentaire{sorted.length!==1?"s":""}</span>
      {nPriv>0&&<button onClick={()=>setShowPrivate(v=>!v)} aria-pressed={showPrivate} style={{border:"1px solid "+(showPrivate?T.amber500:T.line),background:showPrivate?T.amber100:"transparent",color:showPrivate?T.amber600:T.ink500,borderRadius:8,padding:"2px 8px",fontSize:FZ.xs,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>{showPrivate?"Masquer les privés":"Afficher les privés ("+nPriv+")"}</button>}
    </div>
    {/* Refonte "chat" (demandé explicitement : "je vois ça plus comme un chat gmail") — avatar +
        bloc aligné à gauche, même registre que la page Commentaires dédiée. */}
    {sorted.length>0?<div style={{display:"flex",flexDirection:"column",gap:12,maxHeight:430,overflowY:"auto",paddingRight:2}}>
      {sorted.map(c=>(
        <div key={c._idx} style={{display:"flex",gap:8}}>
          <Avatar name={c.author} tint={c.private?T.amber500:T.teal500} size={28}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap",marginBottom:2}}>
              <span style={{fontWeight:700,color:T.ink700,fontSize:FZ.sm}}>{c.author}</span>
              {c.private&&<span style={{fontSize:FZ.xs,color:T.amber600,background:T.amber100,borderRadius:4,padding:"1px 6px",fontWeight:700,letterSpacing:".01em"}}>Privé</span>}
              {c.groupPjs&&<span title={"Commentaire groupé : "+c.groupPjs.join(", ")} style={{fontSize:FZ.xs,color:T.violet600,background:T.violet100,borderRadius:4,padding:"1px 6px",fontWeight:700}}>groupé ×{c.groupPjs.length}</span>}
              <span style={{fontSize:FZ.xs,color:T.ink300}}>{relTime(c.date)}</span>
              <SuperOnly><button onClick={()=>{setDeleteTarget(c._idx);setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink100,cursor:"pointer",fontSize:FZ.xs,padding:0,marginLeft:2}}><NavIcon name="close" size={11}/></button></SuperOnly>
            </div>
            <div style={{background:c.private?T.amber100:T.panel,borderRadius:"3px 12px 12px 12px",padding:"8px 12px",display:"inline-block",maxWidth:"100%",fontSize:FZ.xs,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
            {c.linkedDate&&<div style={{marginTop:5,fontSize:FZ.xs,color:T.ink500,fontWeight:600}}>Lié au {fmt(new Date(c.linkedDate))}</div>}
            {deleteTarget===c._idx&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:FZ.sm,fontWeight:700,color:T.ink900}}>Supprimer ce commentaire ?</span>
              <button onClick={confirmDelete} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.redFill,color:"#fff",fontSize:FZ.sm,fontWeight:700,cursor:"pointer"}}>Confirmer la suppression</button>
              <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.panel,boxShadow:T.outline,color:T.ink700,fontSize:FZ.sm,cursor:"pointer"}}>Annuler</button>
            </div>}
          </div>
        </div>
      ))}
    </div>:<div style={{textAlign:"center",color:T.ink300,fontSize:FZ.sm,padding:"20px 0"}}>Aucun commentaire pour l'instant sur ce PJ.</div>}
  </div>);
}

// ── Allocation des jours de retard par cause générique, pour un PJ donné (visible Manager uniquement) ──
export function DelayAllocations({pj,delays,delayTypes,setDelayTypes,addDelayAllocation,deleteDelayAllocation,addDelayComment,deleteDelayComment,authorName}){
  const [type,setType]=useState(delayTypes[0]||"");
  const [days,setDays]=useState("");
  const [note,setNote]=useState("");
  const [authorInput,setAuthorInput]=useState("");
  const author=authorName||authorInput;
  const [err,setErr]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [pinInput,setPinInput]=useState("");
  const [openThread,setOpenThread]=useState(null); // id du retard dont le fil de discussion est ouvert
  const submit=async ()=>{
    if(!author.trim()){setErr("Le nom est obligatoire.");return;}
    if(!type){setErr("Choisissez un type de retard.");return;}
    const n=Number(days);
    if(!days||isNaN(n)||n<=0){setErr("Indiquez un nombre de jours valide.");return;}
    setErr("");
    const ok=await addDelayAllocation(pj,type,n,note,author);
    if(ok){setDays("");setNote("");}
  };
  const confirmDelete=async ()=>{
    const ok=await deleteDelayAllocation(pj,deleteTarget,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };
  const byType={};
  delays.forEach(d=>{byType[d.type]=(byType[d.type]||0)+(d.days||0);});
  return(<div style={{marginTop:20,paddingTop:16,borderTop:"1px solid "+T.line}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:FZ.md,color:T.ink900,marginBottom:10}}>⏱️ Causes de retard ({delays.length})</div>
    {Object.keys(byType).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
      {Object.entries(byType).map(([t,d])=><span key={t} style={{background:T.panel,borderRadius:8,padding:"4px 8px",fontSize:FZ.sm,color:T.ink700,fontWeight:600}}>{t} · {d}j</span>)}
    </div>}
    {authorName&&<div style={{fontSize:FZ.xs,color:T.ink500,marginBottom:8}}>En tant que <strong style={{color:T.ink700}}>{authorName}</strong></div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:10}}>
      {/* Liste déroulante premium (demandé explicitement : "manque de premium sur le choix de
          liste" près des commentaires/retards) — même habillage que le reste de l'appli. */}
      <div style={{display:"flex",flexDirection:"column",gap:6,minWidth:0}}><Select value={type} onChange={e=>setType(e.target.value)} options={delayTypes}/><NewDelayType types={delayTypes} onCreate={setDelayTypes} onCreated={setType}/></div>
      <input type="number" min="1" value={days} onChange={e=>{setDays(e.target.value);setErr("");}} placeholder="Jours" style={{padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink700}}/>
      {!authorName&&<input type="text" value={authorInput} onChange={e=>{setAuthorInput(e.target.value);setErr("");}} placeholder="Votre nom" maxLength={40} style={{padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink700}}/>}
    </div>
    <DelayScopeNote/>
    {/* Zone de note agrandie (textarea, plus input une ligne) — demandé explicitement ("plus de
        place pour les notes") : une note comme "Des absences en production et un test de pression
        capricieux." tenait à peine dans l'ancien champ. */}
    <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optionnel)" rows={2} maxLength={300} style={{width:"100%",padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink700,resize:"vertical",boxSizing:"border-box",marginBottom:8,background:T.card}}/>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
      <button onClick={submit} style={{padding:"8px 16px",borderRadius:8,border:"none",background:T.teal500,color:"#fff",fontSize:FZ.sm,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Allouer</button>
    </div>
    {err&&<div style={{fontSize:FZ.sm,color:T.red500,marginBottom:8}}>{err}</div>}
    {delays.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:220,overflowY:"auto"}}>
      {[...delays].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(d=>(
        <div key={d.id} style={{background:T.panel,borderRadius:12,padding:"8px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
            <span style={{fontWeight:700,color:T.ink900,fontSize:FZ.sm}}>{d.type} — {d.days}j</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:FZ.xs,color:T.ink300}}>{d.author} · {new Date(d.date).toLocaleDateString("fr-FR")}</span>
              <SuperOnly><button onClick={()=>{setDeleteTarget(d.id);setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:FZ.sm,padding:0}}><NavIcon name="close" size={11}/></button></SuperOnly>
            </div>
          </div>
          {d.note&&<div style={{fontSize:FZ.sm,color:T.ink500,marginTop:3}}>{d.note}</div>}
          {addDelayComment&&<button onClick={()=>setOpenThread(openThread===d.id?null:d.id)} style={{marginTop:6,background:"none",border:"none",padding:0,color:T.teal600,fontSize:FZ.xs,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            {(d.comments||[]).length>0?(d.comments.length+" réponse"+(d.comments.length>1?"s":"")):"Répondre"}
          </button>}
          {openThread===d.id&&<DelayThread d={d} pj={pj} authorName={authorName} addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment}/>}
          {deleteTarget===d.id&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"6px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,width:120}}/>
            <button onClick={confirmDelete} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.redFill,color:"#fff",fontSize:FZ.sm,fontWeight:700,cursor:"pointer"}}>Confirmer</button>
            <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.panel,boxShadow:T.outline,color:T.ink700,fontSize:FZ.sm,cursor:"pointer"}}>Annuler</button>
          </div>}
        </div>
      ))}
    </div>}
  </div>);
}

// ── Fil de discussion d'une cause de retard précise (relances, réponses fournisseur…) ──
function DelayThread({d,pj,authorName,addDelayComment,deleteDelayComment}){
  const [authorInput,setAuthorInput]=useState("");
  const author=authorName||authorInput;
  const [text,setText]=useState("");
  const [delTarget,setDelTarget]=useState(null);
  const [pin,setPin]=useState("");
  const send=async ()=>{
    if(!author.trim()||!text.trim())return;
    const ok=await addDelayComment(pj,d.id,author,text);
    if(ok)setText("");
  };
  const confirmDelete=async idx=>{
    const ok=await deleteDelayComment(pj,d.id,idx,pin);
    if(ok){setDelTarget(null);setPin("");}
  };
  return(<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",flexDirection:"column",gap:8}}>
    {(d.comments||[]).map((c,i)=>(
      <div key={i} style={{background:T.card,borderRadius:8,padding:"8px 8px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
          <span style={{fontWeight:700,color:T.teal600,fontSize:FZ.xs}}>{c.author}</span>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:FZ.xs,color:T.ink300}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
            {deleteDelayComment&&<SuperOnly><button onClick={()=>{setDelTarget(i);setPin("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:FZ.xs,padding:0}}><NavIcon name="close" size={11}/></button></SuperOnly>}
          </div>
        </div>
        <div style={{fontSize:FZ.sm,color:T.ink700,whiteSpace:"pre-wrap",marginTop:2}}>{c.text}</div>
        {delTarget===i&&<div style={{marginTop:6,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Code Manager" style={{padding:"4px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.xs,fontFamily:T.font,width:110}}/>
          <button onClick={()=>confirmDelete(i)} style={{padding:"4px 8px",borderRadius:8,border:"none",background:T.redFill,color:"#fff",fontSize:FZ.xs,fontWeight:700,cursor:"pointer"}}>Confirmer</button>
          <button onClick={()=>setDelTarget(null)} style={{padding:"4px 8px",borderRadius:8,border:"none",background:T.panelDim,color:T.ink700,fontSize:FZ.xs,cursor:"pointer"}}>Annuler</button>
        </div>}
      </div>
    ))}
    <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
      {!authorName&&<input type="text" value={authorInput} onChange={e=>setAuthorInput(e.target.value)} placeholder="Nom" maxLength={40} style={{width:90,padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.xs,fontFamily:T.font,color:T.ink700}}/>}
      <input type="text" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} placeholder="Répondre sur ce retard... (Entrée pour envoyer)" maxLength={500} style={{flex:1,padding:"8px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.xs,fontFamily:T.font,color:T.ink700}}/>
      <button onClick={send} disabled={!text.trim()||!author.trim()} style={{padding:"8px 12px",borderRadius:8,border:"none",background:text.trim()&&author.trim()?T.teal500:T.panelDim,color:text.trim()&&author.trim()?"#fff":T.ink300,fontSize:FZ.xs,fontWeight:700,cursor:text.trim()&&author.trim()?"pointer":"default"}}>Envoyer</button>
    </div>
  </div>);
}

