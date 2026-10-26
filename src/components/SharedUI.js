import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { T, FZ, R } from "../theme";
import { isSuperAdmin } from "../roles";
import { ETAT_META, getPjMeta, SerieTag } from "../pjMeta";
import { parseMSProjectRows } from "../parsers";

export function useSheetJS(){
  const [ready,setReady]=useState(!!window.XLSX);
  useEffect(()=>{
    if(window.XLSX){setReady(true);return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=()=>setReady(true);
    document.head.appendChild(s);
  },[]);
  return ready;
}

// Réduit encore (demandé explicitement : "réduire la police pour l'état") — la pastille garde son
// fond/bordure propres mais passe sous la taille du reste des colonnes du tableau.
// Mention demandée à chaque saisie de retard : « en rouge et italique, en petit, que ce retard peut
// mettre en retard uniquement les PJ après » (+ petite icône de danger).
export function DelayScopeNote(){
  return(<div style={{display:"flex",alignItems:"flex-start",gap:4,fontSize:FZ.xs,fontStyle:"italic",color:T.red500,lineHeight:1.35,margin:"2px 0 6px"}}>
    <span style={{display:"inline-flex",flexShrink:0,marginTop:1}}><NavIcon name="warning" size={12}/></span>
    <span>Attention : ce retard ne peut décaler que les PJ planifiés après celui-ci, jamais ceux d'avant.</span>
  </div>);
}

export function Badge({etat,wrap}){const c=ETAT_META[etat]||ETAT_META["NOT ORDERED"];const urgent=etat==="NOT ORDERED";return <span className={urgent?"enogia-pulse-urgent":""} style={{background:c.bg,color:c.text,border:"1px solid "+c.border,borderRadius:wrap?14:20,padding:"2.5px 8px 2.5px 8px",fontSize:FZ.xs,fontWeight:600,letterSpacing:".01em",display:"inline-flex",alignItems:"center",gap:4,maxWidth:"100%",boxSizing:"border-box"}}><span style={{width:6,height:6,borderRadius:"50%",background:c.bar,flexShrink:0}}/><span style={wrap?{lineHeight:1.2,overflowWrap:"break-word",minWidth:0}:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.label||etat}</span></span>;}

// v139.1 : un seul menu flottant à la fois. Tout composant qui ouvre l'un d'eux (ou un panneau) envoie « enogia:closemenus » : les autres se ferment.
export const closeAllMenus=()=>{try{window.dispatchEvent(new Event("enogia:closemenus"));}catch(e){}};
export function useCloseOnSignal(setOpen){
  useEffect(()=>{const f=()=>setOpen(false);window.addEventListener("enogia:closemenus",f);return()=>window.removeEventListener("enogia:closemenus",f);},[setOpen]);
}
// v170 : rend une zone cliquable utilisable au clavier (Tab puis Entrée ou Espace), avec son rôle et son état.
export const pressable=(fn,extra={})=>({role:"button",tabIndex:0,onClick:fn,onKeyDown:e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fn(e);}},...extra});
export function DropFilter({label,options,selected,onChange,getLabel,icon,sort}){
  const [open,setOpen]=useState(false);
  useCloseOnSignal(setOpen);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const all=options.every(o=>selected.has(o));
  const none=options.every(o=>!selected.has(o));
  const toggle=o=>{const s=new Set(selected);s.has(o)?s.delete(o):s.add(o);onChange(s);};
  const disp=o=>getLabel?getLabel(o):o;
  const openMenu=()=>{
    if(btnRef.current){
      const r=btnRef.current.getBoundingClientRect();
      setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-230)});
    }
    setOpen(v=>!v);
  };
  return(
    <span style={{position:"relative",display:"inline-block"}} onClick={e=>e.stopPropagation()}>
      {/* Bouton resserré (demandé explicitement : "les filtres ... sont trop grandes ... plus
          discret") — mêmes proportions sur le Gantt et le Calendrier (et ici, partout où ce
          composant est utilisé). */}
      <button ref={btnRef} onClick={openMenu} style={icon?{padding:"2px 4px",borderRadius:8,border:"none",background:(!all||(sort&&sort.active))?T.teal100:"transparent",color:(!all||(sort&&sort.active))?T.teal600:T.ink300,fontSize:FZ.xs,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3,verticalAlign:"middle",marginLeft:4}:{padding:"4px 8px",borderRadius:8,border:"1px solid "+(!all||open?T.teal500:T.line),background:!all?T.teal100:T.card,color:!all?T.teal600:T.ink700,fontSize:FZ.xs,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",fontFamily:T.font,transition:"border-color .15s"}}>
        {icon?(<>{!all&&selected.size}{sort&&sort.active&&<span aria-hidden="true" style={{fontSize:FZ.xs,fontWeight:800,color:T.teal600,lineHeight:1}}>{sort.active==="desc"?"↓":"↑"}</span>}<NavIcon name="chevronDown" size={10}/></>):(<>{label}{!all?" ("+selected.size+")":""}<NavIcon name="chevronDown" size={11}/></>)}
      </button>
      {/* Popover affiné (demandé explicitement : "les filtres sur les colonnes sont grossiers quand
          on clique dessus, la police est trop grande") — police et cases à cocher réduites, coins et
          ombre resserrés pour rester dans le même registre que le reste de l'appli. */}
      {open&&createPortal(<>
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
        <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:12,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,minWidth:190,maxHeight:300,display:"flex",flexDirection:"column",fontFamily:T.font}}>
          {sort&&<div role="group" aria-label="Trier" style={{display:"flex",flexDirection:"column",borderBottom:"1px solid "+T.line,flexShrink:0,padding:"4px 0",background:T.card,borderRadius:"10px 10px 0 0"}}>
            {[{id:"asc",label:sort.asc||"Du plus petit au plus grand",arrow:"↑"},{id:"desc",label:sort.desc||"Du plus grand au plus petit",arrow:"↓"},...(sort.extra||[]).map(x=>({...x,arrow:"↓"}))].map(o=>{const on=sort.active===o.id;return(
              <div key={o.id} role="button" tabIndex={0} aria-pressed={on} onClick={()=>{sort.onChange(on?null:o.id);}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();sort.onChange(on?null:o.id);}}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",cursor:"pointer",background:on?T.teal100:"transparent"}}>
                <span aria-hidden="true" style={{width:13,textAlign:"center",fontSize:FZ.xs,fontWeight:800,color:on?T.teal600:T.ink500}}>{o.arrow}</span>
                <span style={{fontSize:FZ.xs,color:on?T.teal600:T.ink700,fontWeight:on?700:500}}>{o.label}</span>
              </div>);})}
          </div>}
          <div {...pressable(()=>onChange(all?new Set():new Set(options)),{role:"checkbox","aria-checked":all})} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderBottom:"1px solid "+T.line,background:T.surface,flexShrink:0,borderRadius:"10px 10px 0 0"}}>
            <div style={{width:13,height:13,borderRadius:4,border:"1.5px solid "+(all?T.teal500:T.ink100),background:all?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {all&&<span style={{color:"#fff",fontSize:FZ.xs,fontWeight:700}}>✓</span>}
              {!all&&!none&&<span style={{color:T.teal600,fontSize:FZ.xs,fontWeight:700}}>—</span>}
            </div>
            <span style={{fontSize:FZ.xs,fontWeight:700,color:T.ink700}}>Tout sélectionner</span>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {options.map(o=>{const a=selected.has(o);return(
              <div key={o} {...pressable(()=>toggle(o),{role:"checkbox","aria-checked":a})} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",cursor:"pointer",background:a?T.teal100:T.card,borderBottom:"1px solid "+T.surface}}>
                <div style={{width:13,height:13,borderRadius:4,border:"1.5px solid "+(a?T.teal500:T.ink100),background:a?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{a&&<span style={{color:"#fff",fontSize:FZ.xs,fontWeight:700}}>✓</span>}</div>
                <span style={{fontSize:FZ.xs,color:T.ink700,fontWeight:a?600:400}}>{disp(o)}</span>
              </div>
            );})}
          </div>
          <div style={{padding:"8px 12px",borderTop:"1px solid "+T.line,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.surface,flexShrink:0,borderRadius:"0 0 10px 10px"}}>
            <span style={{fontSize:FZ.xs,color:T.ink500,fontWeight:500}}>{selected.size}/{options.length}</span>
            <button onClick={()=>setOpen(false)} style={{padding:"4px 12px",borderRadius:8,border:"none",background:T.teal500,color:"#fff",fontSize:FZ.xs,fontWeight:700,cursor:"pointer"}}>OK</button>
          </div>
        </div>
      </>,document.body)}
    </span>
  );
}

// Liste déroulante "premium" (demandé explicitement : près des commentaires/retards, le choix de
// liste "manque de premium") — un <select> natif reste dessous pour l'accessibilité et le picker
// natif mobile, mais son rendu par défaut (flèche système, look plat) est masqué et remplacé par le
// même habillage que le reste de l'appli (bordure fine, coins arrondis, chevron maison).
export function Select({value,onChange,options,getLabel,placeholder,style,compact}){
  const disp=o=>getLabel?getLabel(o):o;
  return(
    <div style={{position:"relative",display:"inline-block",width:style?.width||"100%"}}>
      <select value={value} onChange={onChange} style={{appearance:"none",WebkitAppearance:"none",MozAppearance:"none",width:"100%",padding:compact?"4px 26px 4px 9px":"8px 30px 8px 11px",borderRadius:8,border:"1px solid "+T.line,fontSize:compact?FZ.xs:FZ.sm,fontWeight:600,fontFamily:T.font,color:T.ink700,background:T.card,cursor:"pointer",...style}}>
        {placeholder&&<option value="" disabled>{placeholder}</option>}
        {options.map(o=>(typeof o==="object"?<option key={o.value} value={o.value}>{o.label}</option>:<option key={o} value={o}>{disp(o)}</option>))}
      </select>
      <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:T.ink300}}><NavIcon name="chevronDown" size={11}/></span>
    </div>
  );
}

// ── Liste de PJ à cocher, toujours visible (pas un menu déroulant caché) — utilisée partout où on
// doit choisir plusieurs PJ à la fois : commentaires groupés, allocation de retard groupée, etc.
export function PjChecklist({data,selected,onChange,maxHeight=220}){
  const [search,setSearch]=useState("");
  const q=search.trim().toLowerCase();
  const filtered=q?data.filter(d=>{
    const meta=getPjMeta(d.pj,d);
    return d.pj.toLowerCase().includes(q)||(meta.nomProjet||"").toLowerCase().includes(q);
  }):data;
  const toggle=pj=>{const s=new Set(selected);s.has(pj)?s.delete(pj):s.add(pj);onChange(s);};
  const allChecked=filtered.length>0&&filtered.every(d=>selected.has(d.pj));
  const toggleAll=()=>{
    const s=new Set(selected);
    if(allChecked)filtered.forEach(d=>s.delete(d.pj));
    else filtered.forEach(d=>s.add(d.pj));
    onChange(s);
  };
  return(<div style={{border:"1px solid "+T.line,borderRadius:12,background:T.card,overflow:"hidden"}}>
    <div style={{padding:8,borderBottom:"1px solid "+T.line,display:"flex",gap:8,alignItems:"center",background:T.surface}}>
      <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un PJ, un projet..." style={{flex:1,padding:"6px 8px",borderRadius:8,border:"1px solid "+T.line,fontSize:FZ.sm,fontFamily:T.font,color:T.ink700,background:T.card}}/>
      <span style={{fontSize:FZ.xs,color:T.ink500,fontWeight:700,whiteSpace:"nowrap"}}>{selected.size} sélectionné{selected.size!==1?"s":""}</span>
    </div>
    <div {...pressable(toggleAll,{role:"checkbox","aria-checked":allChecked})} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 8px",cursor:"pointer",borderBottom:"1px solid "+T.line}}>
      <div style={{width:15,height:15,borderRadius:4,border:"1.5px solid "+(allChecked?T.teal500:T.ink100),background:allChecked?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{allChecked&&<span style={{color:"#fff",fontSize:FZ.xs,fontWeight:700}}>✓</span>}</div>
      <span style={{fontSize:FZ.xs,fontWeight:700,color:T.ink700}}>Tout sélectionner{q?" (résultats filtrés)":""}</span>
    </div>
    <div style={{maxHeight,overflowY:"auto"}}>
      {filtered.map(d=>{
        const meta=getPjMeta(d.pj,d);
        const checked=selected.has(d.pj);
        return(<div key={d.pj} {...pressable(()=>toggle(d.pj),{role:"checkbox","aria-checked":checked})} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 8px",cursor:"pointer",background:checked?T.teal100:"transparent",borderBottom:"1px solid "+T.surface}}>
          <div style={{width:15,height:15,borderRadius:4,border:"1.5px solid "+(checked?T.teal500:T.ink100),background:checked?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:"#fff",fontSize:FZ.xs,fontWeight:700}}>✓</span>}</div>
          <span style={{fontWeight:700,color:T.ink900,fontSize:FZ.sm,fontFamily:T.fontMono,flexShrink:0}}>{d.pj}</span><SerieTag pj={d.pj}/>
          <span style={{fontSize:FZ.xs,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{meta.nomProjet}</span>
        </div>);
      })}
      {filtered.length===0&&<div style={{padding:12,textAlign:"center",color:T.ink300,fontSize:FZ.xs}}>Aucun résultat.</div>}
    </div>
  </div>);
}


export const PIN="2214";
export function PinGate({onUnlock}){
  const [v,setV]=useState("");const [err,setErr]=useState(false);
  const check=()=>{if(v===PIN)onUnlock();else{setErr(true);setV("");setTimeout(()=>setErr(false),1200);}};
  return(<div style={{background:T.card,borderRadius:16,padding:36,maxWidth:300,margin:"40px auto",boxShadow:T.shadowLg,textAlign:"center",fontFamily:T.font}}>
    <div style={{width:48,height:48,margin:"0 auto 14px",borderRadius:12,background:T.surface,boxShadow:T.neuInSm,color:T.teal600,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon name="lock" size={22}/></div>
    <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.lg,color:T.ink900,marginBottom:18}}>Accès Manager</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:190,margin:"0 auto 14px"}}>
      {[1,2,3,4,5,6,7,8,9,"","0","⌫"].map((k,i)=><button key={i} onClick={()=>{if(k==="⌫")setV(x=>x.slice(0,-1));else if(k!=="")setV(x=>x.length<4?x+k:x);}} style={{height:48,borderRadius:12,border:"none",background:k===""?"transparent":T.surface,boxShadow:k===""?"none":T.neuOutSm,fontSize:FZ.lg,fontWeight:600,cursor:k===""?"default":"pointer",color:T.ink900,transition:"box-shadow .1s ease"}}
        onMouseDown={e=>{if(k!=="")e.currentTarget.style.boxShadow=T.neuInSm;}}
        onMouseUp={e=>{if(k!=="")e.currentTarget.style.boxShadow=T.neuOutSm;}}
        onMouseLeave={e=>{if(k!=="")e.currentTarget.style.boxShadow=T.neuOutSm;}}>{k}</button>)}
    </div>
    <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:12}}>{[0,1,2,3].map(i=><div key={i} style={{width:11,height:11,borderRadius:"50%",background:i<v.length?T.teal500:T.ink100}}/>)}</div>
    {err&&<div style={{color:T.red500,fontSize:FZ.md,marginBottom:8,fontWeight:600}}>Code incorrect</div>}
    <button onClick={check} disabled={v.length<4} style={{padding:"8px 28px",background:v.length<4?T.ink100:T.teal500,color:v.length<4?T.ink300:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:FZ.md,cursor:v.length<4?"default":"pointer"}}>Valider</button>
  </div>);
}


// v146 : plus de clavier PIN pour entrer dans l'espace Manager. L'accès se fait uniquement par adresse mail
// (liste « Accès Manager » + super admin). Cet écran s'affiche aux autres comptes.
export function ManagerAccessNotice({email}){
  return(<div role="status" style={{background:T.card,borderRadius:16,padding:"32px 28px",maxWidth:420,margin:"40px auto",boxShadow:T.shadowLg,textAlign:"center",fontFamily:T.font}}>
    <div style={{width:48,height:48,margin:"0 auto 14px",borderRadius:12,background:T.surface,boxShadow:T.neuInSm,color:T.teal600,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon name="lock" size={22}/></div>
    <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:FZ.lg,color:T.ink900,marginBottom:8}}>Espace Manager réservé</div>
    <div style={{fontSize:FZ.md,color:T.ink700,lineHeight:1.5}}>
      {email?<>Votre adresse <b>{email}</b> n'est pas dans la liste « Accès Manager ».</>:<>Connectez-vous avec votre adresse pour accéder à cet espace.</>}
      {" "}Demandez au super admin de l'ajouter.
    </div>
  </div>);
}

export function ImportButton({onImport, busy, label, accent, helpText, warnText, confirmMessage, hasExisting, inputId, iconOnly, iconGlyph}){
  const [open,setOpen]=useState(false);
  useCloseOnSignal(setOpen);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const [err,setErr]=useState("");
  useSheetJS();
  const fileInputId=inputId||"msp-file";
  const btnLabel=label||"Importer un planning MS Project";
  const bg=accent||T.navy700;
  const openMenu=()=>{
    if(btnRef.current){
      const r=btnRef.current.getBoundingClientRect();
      setPos({top:r.bottom+8,left:Math.min(r.left,window.innerWidth-338)});
    }
    setOpen(v=>!v);
  };

  const proceedImport=parsed=>{
    if(hasExisting&&confirmMessage){
      const ok=window.confirm(confirmMessage);
      if(!ok)return false;
    }
    onImport(parsed,"");
    return true;
  };

  const handleFile=async file=>{
    setErr("");
    try{
      if(file.name.endsWith(".xlsx")||file.name.endsWith(".xls")){
        if(!window.XLSX){setErr("Librairie Excel en cours de chargement, réessayez dans 2s.");return;}
        const buf=await file.arrayBuffer();
        const wb=window.XLSX.read(buf,{type:"array"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,raw:false});
        // Feuille optionnelle "Table_affectation" : charge de travail par tâche/ressource (Atelier/Autom)
        const affSheetName=wb.SheetNames.find(n=>n.toLowerCase().includes("affectation"));
        const affRows=affSheetName?window.XLSX.utils.sheet_to_json(wb.Sheets[affSheetName],{header:1,raw:false}):null;
        const parsed=parseMSProjectRows(rows,affRows);
        if(!parsed||parsed.length===0){setErr("Aucun PJ reconnu. Vérifiez les colonnes Nom / Début / Niveau hiérarchique.");return;}
        if(proceedImport(parsed))setOpen(false);
      } else {
        const text=await file.text();
        const rows=text.trim().split("\n").map(l=>l.split("\t"));
        const parsed=parseMSProjectRows(rows);
        if(!parsed||parsed.length===0){setErr("Aucun PJ reconnu dans ce fichier texte.");return;}
        if(proceedImport(parsed))setOpen(false);
      }
    }catch(e){setErr("Erreur de lecture : "+e.message);}
  };

  return(<div style={{position:"relative",fontFamily:T.font}}>
    <button ref={btnRef} onClick={openMenu} disabled={busy} aria-label={btnLabel} title={iconOnly?btnLabel:undefined} style={iconOnly?{width:26,height:26,borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:T.ink500,fontWeight:700,fontSize:FZ.md,lineHeight:1,cursor:busy?"default":"pointer",opacity:busy?.6:1,display:"flex",alignItems:"center",justifyContent:"center",padding:0}:{padding:"4px 8px",borderRadius:8,border:"none",background:bg,color:"#fff",fontWeight:700,fontSize:FZ.xs,cursor:busy?"default":"pointer",opacity:busy?.6:1,display:"flex",alignItems:"center",gap:4,boxShadow:T.shadowSm,transition:"transform .12s ease, box-shadow .12s ease"}}
      onMouseEnter={e=>{if(!busy){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=T.shadowMd;}}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
      {iconOnly?(busy?"…":(iconGlyph||"⋯")):busy?<span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:"50%",border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",display:"inline-block",animation:"enogiaSpin .8s linear infinite"}}/>Mise à jour...</span>:<span style={{display:"inline-flex",alignItems:"center",gap:4}}><NavIcon name="upload" size={10}/><span className="enogia-import-label">{btnLabel}</span></span>}
    </button>
    {open&&!busy&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
      <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:16,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,width:320,padding:16}}>
      <div style={{fontWeight:700,fontSize:FZ.lg,color:T.ink900,marginBottom:8}}>{btnLabel}</div>
      <div style={{fontSize:FZ.md,color:T.ink500,marginBottom:14,lineHeight:1.6}}>
        {helpText||(<>Export Excel (.xlsx) avec colonnes <b>Nom, Début, Niveau hiérarchique</b>.<br/>Niveau 1 = PJ · Niveau 2 = Arrivée / Tests / Fin de production / Départ.</>)}
      </div>
      <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
        style={{border:"2px dashed "+T.ink100,borderRadius:12,padding:"24px 16px",background:T.surface,textAlign:"center",cursor:"pointer",marginBottom:12}}
        onClick={()=>document.getElementById(fileInputId).click()}>
        <div style={{marginBottom:6,color:T.ink500,display:"flex",justifyContent:"center"}}><NavIcon name="upload" size={30}/></div>
        <div style={{fontSize:FZ.md,color:T.ink700,fontWeight:500}}>Glisser-déposer ou cliquer</div>
        <input id={fileInputId} type="file" accept=".xlsx,.xls,.txt,.tsv" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)handleFile(f);}}/>
      </div>
      {err&&<div style={{color:T.red500,fontSize:FZ.md,background:T.red100,padding:"8px 12px",borderRadius:8,marginBottom:10,fontWeight:500}}>{err}</div>}
      <div style={{fontSize:FZ.sm,color:T.ink300,lineHeight:1.5,display:"flex",alignItems:"center",gap:6}}>{warnText||<><NavIcon name="warning" size={13}/>Remplace les données pour tous les visiteurs du site.</>}</div>
    </div>
    </>}
  </div>);
}


// ── Icônes de navigation vectorielles (identité "instrument technique", pas d'emoji) ──
export function NavIcon({name,size=18}){
  const p={width:size,height:size,viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round"};
  switch(name){
    case"edit":return(<svg {...p}><path d="M13.5 3.8a1.9 1.9 0 0 1 2.7 2.7L7 15.7l-3.7.9.9-3.7z"/><path d="M12 5.3l2.7 2.7"/></svg>);
    case"trash":return(<svg {...p}><path d="M3.5 5.5h13"/><path d="M8 5.5V3.8h4v1.7"/><path d="M5 5.5l.8 10.2h8.4L15 5.5"/><path d="M8.5 9v4.2M11.5 9v4.2"/></svg>);
    case"bell":return(<svg {...p}><path d="M5 14.5V9a5 5 0 0 1 10 0v5.5l1.2 1H3.8z"/><path d="M8.3 17.5h3.4"/></svg>);
    case"home":return(<svg {...p}><path d="M3.5 9.2 10 3.5l6.5 5.7"/><path d="M5 8.4V16h3.6v-4.2h2.8V16H15V8.4"/></svg>);
    case"more":return(<svg {...p} fill="currentColor" stroke="none"><circle cx="4.5" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="15.5" cy="10" r="1.5"/></svg>);
    case"copy":return(<svg {...p}><rect x="7" y="7" width="9.5" height="9.5" rx="2"/><path d="M13 7V5.5A2 2 0 0 0 11 3.5H5.5a2 2 0 0 0-2 2V11a2 2 0 0 0 2 2H7"/></svg>);
    case"arrow":return(<svg {...p}><path d="M4 10h11"/><path d="M11 5.5 15.5 10 11 14.5"/></svg>);
    case"at":return(<svg {...p}><circle cx="10" cy="10" r="3"/><path d="M13 10v1.2a2 2 0 0 0 4 0V10a7 7 0 1 0-2.8 5.6"/></svg>);
    case"flag":return(<svg {...p}><path d="M5 17V3.5"/><path d="M5 4h9l-1.8 3L14 10H5"/></svg>);
    case"palette":return(<svg {...p}><path d="M10 2.5a7.5 7.5 0 1 0 0 15c1.1 0 1.7-.8 1.7-1.6 0-.5-.3-.9-.5-1.3-.3-.4-.4-.8-.4-1.2 0-.9.7-1.6 1.6-1.6h1.7a3 3 0 0 0 3-3C17.1 5.6 14 2.5 10 2.5z"/><circle cx="6.2" cy="9.3" r=".9"/><circle cx="8.6" cy="5.9" r=".9"/><circle cx="12.4" cy="5.9" r=".9"/></svg>);
    case"changes":return(<svg {...p}><path d="M3.5 6.5h11"/><path d="M11.5 3.5l3 3-3 3"/><path d="M16.5 13.5h-11"/><path d="M8.5 10.5l-3 3 3 3"/></svg>);
    case"list":return(<svg {...p}><rect x="2.5" y="3.5" width="3" height="3" rx=".5"/><line x1="8" y1="5" x2="17.5" y2="5"/><rect x="2.5" y="8.5" width="3" height="3" rx=".5"/><line x1="8" y1="10" x2="17.5" y2="10"/><rect x="2.5" y="13.5" width="3" height="3" rx=".5"/><line x1="8" y1="15" x2="17.5" y2="15"/></svg>);
    case"gantt":return(<svg {...p}><line x1="3" y1="4" x2="10" y2="4"/><line x1="3" y1="8" x2="16" y2="8"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="3" y1="16" x2="13.5" y2="16"/></svg>);
    case"calendar":return(<svg {...p}><rect x="2.5" y="4" width="15" height="13.5" rx="2"/><line x1="2.5" y1="8" x2="17.5" y2="8"/><line x1="6" y1="2.3" x2="6" y2="5.5"/><line x1="14" y1="2.3" x2="14" y2="5.5"/><line x1="6" y1="11.5" x2="6" y2="11.5"/><line x1="10" y1="11.5" x2="10" y2="11.5"/><line x1="14" y1="11.5" x2="14" y2="11.5"/></svg>);
    case"comments":return(<svg {...p}><path d="M3 5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2v-6z"/></svg>);
    case"screen":return(<svg {...p}><rect x="2.5" y="3.5" width="15" height="10" rx="1.8"/><line x1="7" y1="16.5" x2="13" y2="16.5"/><line x1="10" y1="13.5" x2="10" y2="16.5"/></svg>);
    case"euro":return(<svg {...p}><path d="M14.8 5.2A6 6 0 1 0 14.8 14.8"/><line x1="3" y1="8.4" x2="11.2" y2="8.4"/><line x1="3" y1="11.6" x2="11.2" y2="11.6"/></svg>);
    case"sidepanel":return(<svg {...p}><rect x="2.5" y="3.5" width="15" height="13" rx="2"/><line x1="12" y1="3.5" x2="12" y2="16.5"/></svg>);
    case"popup":return(<svg {...p}><rect x="2.5" y="3.5" width="15" height="13" rx="2"/><rect x="6" y="7" width="8" height="6.5" rx="1.2"/></svg>);
    case"manager":return(<svg {...p}><path d="M10 2.5 16.5 5v4.6c0 3.9-2.7 6.7-6.5 7.9-3.8-1.2-6.5-4-6.5-7.9V5L10 2.5z"/><path d="M7.2 9.9l2 2 3.6-3.9"/></svg>);
    case"lock":return(<svg {...p}><rect x="4" y="9" width="12" height="8.5" rx="2"/><path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3"/></svg>);
    case"layers":return(<svg {...p}><path d="M10 2.5 17.5 7 10 11.5 2.5 7 10 2.5z"/><path d="M2.5 11 10 15.5 17.5 11"/></svg>);
    case"gauge":return(<svg {...p}><path d="M3 13a7 7 0 1 1 14 0"/><line x1="10" y1="13" x2="13.2" y2="9"/><line x1="10" y1="13" x2="10" y2="13"/></svg>);
    case"check":return(<svg {...p}><circle cx="10" cy="10" r="7.2"/><path d="M6.7 10.2l2.2 2.2 4.4-4.6"/></svg>);
    case"chart":return(<svg {...p}><line x1="3" y1="17" x2="17" y2="17"/><rect x="5" y="10" width="3" height="7" rx=".5"/><rect x="9.5" y="6" width="3" height="11" rx=".5"/><rect x="14" y="12" width="3" height="5" rx=".5"/></svg>);
    case"tag":return(<svg {...p}><path d="M10.5 3H4a1 1 0 0 0-1 1v6.5a1 1 0 0 0 .3.7l8 8a1 1 0 0 0 1.4 0l6.5-6.5a1 1 0 0 0 0-1.4l-8-8a1 1 0 0 0-.7-.3z"/><circle cx="7" cy="7" r="1.2"/></svg>);
    case"warning":return(<svg {...p}><path d="M10 3.5 18 16.5H2L10 3.5z"/><line x1="10" y1="8.5" x2="10" y2="12"/><circle cx="10" cy="14.3" r=".2" fill="currentColor"/></svg>);
    case"upload":return(<svg {...p}><path d="M10 13V4"/><path d="M6.5 7.5 10 4l3.5 3.5"/><path d="M4 14v1.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V14"/></svg>);
    case"pin":return(<svg {...p}><path d="M10 17.5S15 12.4 15 8.5a5 5 0 0 0-10 0C5 12.4 10 17.5 10 17.5z"/><circle cx="10" cy="8.5" r="1.8"/></svg>);
    case"sun":return(<svg {...p}><circle cx="10" cy="10" r="3.5"/><line x1="10" y1="2.5" x2="10" y2="4.3"/><line x1="10" y1="15.7" x2="10" y2="17.5"/><line x1="2.5" y1="10" x2="4.3" y2="10"/><line x1="15.7" y1="10" x2="17.5" y2="10"/><line x1="5" y1="5" x2="6.2" y2="6.2"/><line x1="13.8" y1="13.8" x2="15" y2="15"/><line x1="15" y1="5" x2="13.8" y2="6.2"/><line x1="6.2" y1="13.8" x2="5" y2="15"/></svg>);
    case"factory":return(<svg {...p}><path d="M3 17V9l4 2.5V9l4 2.5V7l6 3v7z"/><line x1="3" y1="17" x2="17" y2="17"/></svg>);
    case"sunSm":return(<svg {...p}><circle cx="10" cy="10" r="3.2"/><line x1="10" y1="3" x2="10" y2="4.5"/><line x1="10" y1="15.5" x2="10" y2="17"/><line x1="3" y1="10" x2="4.5" y2="10"/><line x1="15.5" y1="10" x2="17" y2="10"/></svg>);
    case"moon":return(<svg {...p}><path d="M16 11.5A6.5 6.5 0 1 1 8.5 4a5.2 5.2 0 0 0 7.5 7.5z"/></svg>);
    case"download":return(<svg {...p}><path d="M10 3v9"/><path d="M6.5 8.5 10 12l3.5-3.5"/><path d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14"/></svg>);
    case"inbox":return(<svg {...p}><path d="M3 10h4.2l1.3 2.4h2.9L12.7 10H17"/><rect x="3" y="10" width="14" height="6.5" rx="1.5"/><path d="M6 10 8 4h4l2 6"/></svg>);
    case"logout":return(<svg {...p}><path d="M8 17H4.5a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 4.5 3H8"/><path d="M13 14l4-4-4-4"/><line x1="17" y1="10" x2="7.5" y2="10"/></svg>);
    case"clock":return(<svg {...p}><circle cx="10" cy="10" r="7.2"/><path d="M10 5.8V10l3 2"/></svg>);
    case"settings":return(<svg {...p}><circle cx="10" cy="10" r="2.6"/><path d="M10 2.8v2.4M10 14.8v2.4M4.2 6.1l2 1.2M13.8 12.7l2 1.2M2.8 10h2.4M14.8 10h2.4M4.2 13.9l2-1.2M13.8 7.3l2-1.2"/></svg>);
    case"save":return(<svg {...p}><path d="M4 4h9l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M7 4v4h6V4"/><rect x="6.5" y="11.5" width="7" height="5"/></svg>);
    case"search":return(<svg {...p}><circle cx="9" cy="9" r="5.5"/><line x1="13.2" y1="13.2" x2="17" y2="17"/></svg>);
    case"close":return(<svg {...p}><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>);
    case"chevronDown":return(<svg {...p}><polyline points="5 7.5 10 12.5 15 7.5"/></svg>);
    default:return null;
  }
}


// ── v140 : un seul style d'état vide (petit pictogramme du même jeu d'icônes + message + action facultative) ─────────────
// icon : "inbox" (rien pour l'instant) · "search" (aucun résultat pour ces filtres) · "check" (tout est à jour) · "comments"…
// compact : pour l'intérieur d'une colonne ou d'un cadre ; sinon version « page ».
export function EmptyState({icon="inbox",title,hint,action,onAction,compact=false,tone}){
  const col=tone==="ok"?T.emerald600:T.ink300;
  const bg=tone==="ok"?T.emerald100:T.surfaceAlt;
  return(<div role="status" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",gap:compact?4:8,padding:compact?"16px 8px":"40px 16px",fontFamily:T.font}}>
    <span aria-hidden="true" style={{width:compact?32:44,height:compact?32:44,borderRadius:R.md,background:bg,color:col,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:compact?2:4}}><NavIcon name={icon} size={compact?16:22}/></span>
    {title&&<div style={{fontSize:compact?FZ.sm:FZ.md,fontWeight:600,color:T.ink700,lineHeight:1.35}}>{title}</div>}
    {hint&&<div style={{fontSize:FZ.xs,color:T.ink500,lineHeight:1.4,maxWidth:380}}>{hint}</div>}
    {action&&<button onClick={onAction} className="enogia-btn-tap" style={{marginTop:4,border:"none",background:"transparent",color:T.teal600,fontWeight:700,fontSize:FZ.xs,cursor:"pointer",fontFamily:T.font,padding:"4px 8px",borderRadius:R.sm,textDecoration:"underline"}}>{action}</button>}
  </div>);
}

// ── v140 : squelette de chargement (gris animé) à la place d'un écran vide ou d'un cercle qui tourne ─────────────────────
// Reprend la forme de la page Liste : barre d'outils, en-tête de tableau, lignes, volet de droite.
export function LoadingSkeleton({rows=9,variant}){
  const bar=(w,h=12,extra)=><span className="enogia-skeleton" style={{display:"block",width:w,height:h,borderRadius:R.sm,...extra}}/>;
  if(variant==="home")return(<div role="status" aria-label="Chargement des données" aria-busy="true" style={{display:"flex",flexDirection:"column",gap:12,fontFamily:T.font}}>
    <div style={{display:"flex",gap:12,alignItems:"baseline",marginBottom:4}}>{bar(220,26)}{bar(120,14)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
      {[0,1,2,3,4].map(i=><div key={i} style={{gridColumn:i===0?"span 2":"auto",minHeight:112,padding:"16px 18px",borderRadius:R.lg,boxShadow:T.shadowCard,background:T.card,display:"flex",flexDirection:"column",gap:12}}>{bar("45%",11)}{bar(i===0?72:44,i===0?40:28)}</div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:12}}>
      {[0,1,2].map(i=><div key={i} style={{minHeight:170,padding:"16px 18px",borderRadius:R.lg,boxShadow:T.shadowCard,background:T.card,display:"flex",flexDirection:"column",gap:12}}>{bar("38%",11)}{bar("92%",14)}{bar("78%",14)}{bar("85%",14)}</div>)}
    </div>
  </div>);
  return(<div role="status" aria-label="Chargement des données" aria-busy="true" style={{display:"flex",gap:16,flexWrap:"wrap",fontFamily:T.font}}>
    <div style={{flex:"3 1 640px",minWidth:0}}>
      <div style={{display:"flex",gap:8,padding:"12px 4px"}}>{bar(150,28,{borderRadius:R.sm})}{bar(110,28)}{bar(90,28)}</div>
      <div style={{display:"flex",gap:16,padding:"10px 12px",background:T.surfaceAlt,borderRadius:R.sm,marginBottom:4,overflow:"hidden"}}>
        {[60,160,70,90,80,90,90,70].map((w,i)=><span key={i} style={{flex:i===1?"1 1 160px":"0 0 "+w+"px"}}>{bar(w*0.7,10)}</span>)}
      </div>
      {Array.from({length:rows}).map((_,i)=><div key={i} style={{display:"flex",gap:16,padding:"14px 12px",alignItems:"center",borderBottom:"1px solid "+T.surfaceAlt,opacity:1-i*0.07,overflow:"hidden"}}>
        {[60,160,70,90,80,90,90,70].map((w,j)=><span key={j} style={{flex:j===1?"1 1 160px":"0 0 "+w+"px"}}>{bar(j===1?"80%":w*(0.6+((i*7+j*3)%4)*0.1),12)}</span>)}
      </div>)}
    </div>
    <div style={{flex:"2 1 300px",maxWidth:340,minWidth:260,paddingTop:36}}>
      <div style={{padding:16,borderRadius:R.lg,boxShadow:T.shadowCard,background:T.card,display:"flex",flexDirection:"column",gap:12}}>
        {bar("55%",20)}{bar("80%",12)}{bar("100%",64,{borderRadius:R.md})}{bar("100%",64,{borderRadius:R.md})}{bar("70%",12)}
      </div>
    </div>
    <span style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0 0 0 0)"}}>Chargement…</span>
  </div>);
}

// v143 : n'affiche son contenu que pour le super admin (boutons de suppression, réglages du site).
// v146.14 : créer une nouvelle cause de retard là où l'on choisit une cause (fiche, fenêtre projet, onglet Retards).
// onCreate(listeComplète) écrit la liste dans Firestore (delayTypes) ; onCreated(nom) sélectionne la nouvelle cause.
export function NewDelayType({types,onCreate,onCreated,style}){
  const [open,setOpen]=useState(false),[v,setV]=useState(""),[busy,setBusy]=useState(false);
  if(!onCreate)return null;
  const go=async()=>{const n=v.trim();if(!n||busy)return;setBusy(true);try{if(!(types||[]).some(t=>String(t).toLowerCase()===n.toLowerCase()))await onCreate([...(types||[]),n]);onCreated&&onCreated(n);setV("");setOpen(false);}finally{setBusy(false);}};
  const base={fontFamily:T.font,fontSize:FZ.xs,fontWeight:700,cursor:"pointer"};
  if(!open)return <button type="button" onClick={()=>setOpen(true)} style={{...base,padding:"5px 11px",borderRadius:999,border:"1.5px dashed "+T.teal500,background:"transparent",color:T.teal600,...style}}>＋ Nouvelle cause</button>;
  return <span style={{display:"inline-flex",gap:6,alignItems:"center",flexWrap:"wrap",...style}}>
    <input autoFocus type="text" value={v} maxLength={60} onChange={e=>setV(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();go();}if(e.key==="Escape")setOpen(false);}} placeholder="Nom de la cause" style={{padding:"5px 9px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontSize:FZ.sm,fontFamily:T.font,minWidth:150}}/>
    <button type="button" onClick={go} disabled={!v.trim()||busy} style={{...base,padding:"5px 11px",borderRadius:8,border:"none",background:v.trim()?T.teal500:T.surfaceAlt,color:v.trim()?"#fff":T.ink300}}>Créer</button>
    <button type="button" onClick={()=>{setOpen(false);setV("");}} style={{...base,padding:"5px 6px",border:"none",background:"transparent",color:T.ink500,fontWeight:600}}>Annuler</button>
  </span>;
}

export function SuperOnly({children}){ return isSuperAdmin()?<>{children}</>:null; }

// v162 — nombre qui « monte » jusqu'à sa valeur (1re apparition et à chaque changement). Chiffres tabulaires pour éviter tout saut de largeur.
// Respecte « réduire les animations » : dans ce cas la valeur est affichée directement.
export function AnimatedNumber({value,duration=700,style}){
  const target=Number(value)||0;
  const [shown,setShown]=React.useState(()=>{try{if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return target;}catch(e){}return 0;});
  const fromRef=React.useRef(shown);
  React.useEffect(()=>{
    const from=fromRef.current;
    if(from===target)return undefined;
    let raf=0,t0=null;
    const step=t=>{
      if(t0==null)t0=t;
      const k=Math.min(1,(t-t0)/duration),e=1-Math.pow(1-k,3);
      const v=Math.round(from+(target-from)*e);
      fromRef.current=v;setShown(v);
      if(k<1)raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(raf);
  },[target,duration]);
  return <span style={{fontVariantNumeric:"tabular-nums",...style}}>{shown}</span>;
}

// ── v162 : bulle d'info au survol (portail, clavier OK) ─────────────────────────────────────────────────────────────────
// Enveloppe n'importe quel élément ; `render()` n'est appelé qu'à l'ouverture. Délai 220 ms pour ne pas clignoter en
// parcourant la liste ; se ferme à la sortie, au scroll, à Échap. Inactive sur écran tactile (pas de survol).
export function HoverPop({render,children,delay=220,width=260,style,disabled}){
  const [pos,setPos]=useState(null);
  const ref=React.useRef(null), timer=React.useRef(null);
  const close=()=>{clearTimeout(timer.current);setPos(null);};
  const open=()=>{
    if(disabled)return;
    clearTimeout(timer.current);
    timer.current=setTimeout(()=>{
      const el=ref.current;if(!el)return;
      const b=el.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight;
      const left=Math.max(8,Math.min(vw-width-8,b.left));
      const below=vh-b.bottom>200||b.top<200;
      setPos(below?{left,top:b.bottom+6}:{left,bottom:vh-b.top+6});
    },delay);
  };
  useEffect(()=>{
    if(!pos)return;
    const k=e=>{if(e.key==="Escape")close();};
    window.addEventListener("scroll",close,true);window.addEventListener("keydown",k);
    return()=>{window.removeEventListener("scroll",close,true);window.removeEventListener("keydown",k);};
  },[pos]);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  return(<>
    <span ref={ref} onMouseEnter={open} onMouseLeave={close} onMouseDown={close} onFocus={open} onBlur={close} style={{display:"inline-flex",maxWidth:"100%",...style}}>{children}</span>
    {pos&&createPortal(
      <div role="tooltip" style={{position:"fixed",zIndex:2600,left:pos.left,top:pos.top,bottom:pos.bottom,width,padding:"12px 14px",borderRadius:R.md,background:T.card,color:T.ink900,border:"1px solid "+T.line,boxShadow:"0 12px 32px rgba(10,20,40,.22), 0 2px 6px rgba(10,20,40,.12)",fontSize:FZ.sm,lineHeight:1.4,pointerEvents:"none",animation:"enogiaFadeInUp .14s ease-out"}}>{render()}</div>,
      document.body)}
  </>);
}

// ── v162 : en-tête de page commun (kicker en capitales espacées + titre) — même gabarit sur toutes les vues ──────────────
export function PageHead({kicker,title,sub,right,style}){
  return(<div style={{display:"flex",alignItems:"flex-end",gap:12,flexWrap:"wrap",marginBottom:14,...style}}>
    <div style={{minWidth:0,flex:1}}>
      {kicker&&<div style={{fontSize:FZ.xs,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:T.ink500,marginBottom:4}}>{kicker}</div>}
      <h1 style={{margin:0,fontFamily:T.fontDisplay,fontSize:FZ.xl,fontWeight:700,letterSpacing:"-.01em",color:T.ink900,lineHeight:1.15}}>{title}</h1>
      {sub&&<div style={{fontSize:FZ.sm,color:T.ink500,marginTop:3}}>{sub}</div>}
    </div>
    {right}
  </div>);
}
