import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { T } from "../theme";
import { getPjMeta, SerieTag, CountryFlag, ETAT_META, PRESENCE_META, presenceKind, presenceDateText, today } from "../pjMeta";
import { diffDays } from "../parsers";
import { NavIcon } from "./SharedUI";
import { compPct, payPct, manualGlobal, montantOf, fmtEur, itemsOf, sortedItems } from "../pjProgress";
import { FEUX, FEU_LEVELS, feuxOf, worstFeu } from "./Feux";
import { penaltyCalc } from "../penalties";

// ── Rapport CODIR : page de garde, synthèse du portefeuille, puis une page éditoriale par PJ ────────────────
// Exporté en PDF par l'impression du navigateur (texte vectoriel, rien n'est envoyé ailleurs). Le papier est
// toujours clair, quel que soit le thème de l'appli. Les commentaires PRIVÉS ne sortent jamais dans le rapport.
// Direction artistique (v146.13) : gabarit ENOGIA « Template_slide » — bandeau photo avec plume et titre blanc, couleurs 004659 / 27A99E / E6F3F2,
// page de garde et page de contact à fond forêt ; Roboto pour le texte (police de l'appli), peu de cadres, feux à halo.
const RPT=f=>process.env.PUBLIC_URL+"/report/"+f;
const F_DISPLAY="'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const F_BODY=F_DISPLAY;
const C={ink:"#1F2A30",ink2:"#404040",mute:"#5F6B73",faint:"#68757D",hair:"#CFE3E1",wash:"#F1F8F7",navy:"#004659",navy2:"#0B5C73",navy3:"#2F7A8C",brass:"#1E8F85",accent:"#27A99E",pale:"#E6F3F2",orange:"#F1963B",red:"#D64541",amber:"#E3A008",green:"#2A9D6F"};
const FC={red:C.red,yellow:C.amber,green:C.green};
// v290 : couleurs de TEXTE (les couleurs de la marque, en texte, tombaient sous 4,5:1 : vert 3,4, ambre 2,3, bleu-vert 4,0)
const TX={red:"#B3322E",green:"#1D7350",amber:"#8A5A00",yellow:"#8A5A00",brass:"#146B63"};
const TINT={red:"#FBE9E7",yellow:"#FFF3C9",green:"#E3F4EC"};
const LEV={red:"À risque",yellow:"Vigilance",green:"Bon"};
const MSS=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin de production"],["depart","Départ"]];
const MONTHS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const PAGE_W=1123;                       // 297 mm à 96 dpi — sert au calcul de l'échelle de l'aperçu
const FIRST_ROWS=7,NEXT_ROWS=15;         // lignes du tableau de synthèse : 1re page / suivantes

const dOf=v=>v?new Date(v):null;
const fd=d=>d?d.getDate()+" "+MONTHS[d.getMonth()]+" "+d.getFullYear():"—";
const fdm=d=>d?d.getDate()+" "+MONTHS[d.getMonth()]:"—";
const sg=d=>d==null?"—":d===0?"=":(d>0?"+":"−")+Math.abs(d)+" j";
const plural=(n,a,b)=>n>1?b:a;
// Pénalités d'une fiche, prêtes à afficher : { txt, color, sub, amount } (amount = montant compté dans les totaux)
function penView(pen){
  if(pen&&pen.status==="inactive")return{txt:"non activées",color:C.faint,sub:"par le client",amount:0};
  if(!pen||pen.status==="off")return{txt:"—",color:C.faint,sub:"non paramétrées",amount:0};
  if(pen.status==="incomplete")return{txt:"à compléter",color:C.amber,sub:pen.missing.slice(0,2).join(", "),amount:0};
  const late=pen.lateDays>0;
  return{txt:pen.amount>0?fmtEur(pen.amount):"0 €",color:pen.amount>0?C.red:late?C.amber:C.green,
    sub:pen.amount>0?pen.lateDays+" j de retard · "+(pen.provisional?"à ce jour":"prévision")+(pen.capped?" · plafond":""):late?pen.lateDays+" j (franchise)":"dans les temps",amount:pen.amount||0};
}

// ── Petites briques ───────────────────────────────────────────────────────────────────────────────────────────
function Orb({lv,size=18}){
  if(!lv)return <span style={{width:size,height:size,borderRadius:"50%",border:"1.5px dashed "+C.faint,boxSizing:"border-box",display:"inline-block",flexShrink:0}}/>;
  const h=Math.round(size*.28);
  return <span style={{width:size,height:size,borderRadius:"50%",background:FC[lv],display:"inline-block",flexShrink:0,margin:h,boxShadow:"0 0 0 "+h+"px "+TINT[lv]}}/>;
}

// ── Données d'un PJ pour le rapport ───────────────────────────────────────────────────────────────────────────
function pjInfo(r,{initialByPj,comments,delays,progress}){
  const meta=getPjMeta(r.pj,r);
  const feux=feuxOf(meta);
  const ini=initialByPj[r.pj]||null;
  const dl=[...(delays?.[r.pj]||[])];
  const byType={};dl.forEach(d=>{byType[d.type]=(byType[d.type]||0)+(d.days||0);});
  const types=Object.entries(byType).sort((a,b)=>b[1]-a[1]);
  const cm=(comments?.[r.pj]||[]).filter(c=>!c.private).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const pv=progress&&progress[r.pj]!=null?progress[r.pj]:r.etat==="SHIPPED"?100:0;
  const dep=dOf(r.depart),tf=meta.contratTFin?dOf(meta.contratTFin):null,t0=meta.contratT0?dOf(meta.contratT0):null;
  const drift=ini&&ini.depart&&dep?diffDays(dOf(ini.depart),dep):null;
  const ecart=tf&&dep?diffDays(tf,dep):null;
  const notes=meta.notes||{};
  const pen=penView(penaltyCalc(meta,r.depart,today));
  return{pen,r,meta,feux,notes,ini,types,totalDelay:dl.reduce((a,d)=>a+(d.days||0),0),nDelays:dl.length,comments:cm,pv,dep,tf,t0,drift,ecart,worst:worstFeu(feux)};
}
const severity=i=>{const v=Object.values(i.feux);return v.filter(l=>l==="red").length*100+v.filter(l=>l==="yellow").length*10+(i.ecart>0?5:0);};

// ── Cadre de page ────────────────────────────────────────────────────────────────────────────────────────────
const Page=({children,bg})=><div className="codir-page" style={{width:"297mm",height:"210mm",background:bg||"#fff",display:"flex",flexDirection:"column",overflow:"hidden",boxSizing:"border-box",fontFamily:F_BODY,color:C.ink,margin:"0 auto 18px",boxShadow:"0 2px 14px rgba(15,25,50,.18)",position:"relative"}}>{children}</div>;
function Masthead({eyebrow,title,sub,right}){
  return(<>
    <div style={{height:"13mm",flexShrink:0,display:"flex",alignItems:"center",gap:"4mm",padding:"0 12mm",background:C.navy+" url("+RPT("banner.jpg")+") center/cover no-repeat",color:"#fff"}}>
      <img src={RPT("feather.png")} alt="" style={{height:"7mm",width:"auto"}}/>
      <div style={{flex:1,minWidth:0,fontFamily:F_DISPLAY,fontSize:14,fontWeight:700,letterSpacing:".04em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{eyebrow}</div>
      {right}
      <img src={RPT("logo.png")} alt="ENOGIA" style={{height:"6.5mm",width:"auto",marginLeft:"3mm"}}/>
    </div>
    <div style={{padding:"4.5mm 12mm 0",flexShrink:0,minWidth:0}}>
      <div style={{fontFamily:F_DISPLAY,fontSize:24,fontWeight:500,color:C.navy,lineHeight:1.1,letterSpacing:"-.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</div>
      {sub&&<div style={{fontSize:11,color:C.mute,marginTop:5,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>{sub}</div>}
    </div>
  </>);
}
function Footer({label,page,total,dark}){
  const c=dark?"rgba(255,255,255,.55)":C.faint;
  return(<div style={{height:"9mm",padding:"0 12mm",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:9.5,color:c,flexShrink:0}}>
    <span style={{fontWeight:700}}>ENOGIA · {label}</span><span>Confidentiel · <b style={{color:dark?"#fff":C.navy}}>{String(page).padStart(2,"0")}</b> / {String(total).padStart(2,"0")}</span>
  </div>);
}

// ── Page de garde ────────────────────────────────────────────────────────────────────────────────────────────
function CoverPage({label,all,page,total}){
  const risk=all.filter(i=>i.worst==="red").length,watch=all.filter(i=>i.worst==="yellow").length,soon=all.filter(i=>i.dep&&diffDays(today,i.dep)>=0&&diffDays(today,i.dep)<=30).length;
  const st=(v,l)=><div><div style={{fontFamily:F_DISPLAY,fontSize:36,fontWeight:500,color:"#fff",lineHeight:1}}>{v}</div><div style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,.6)",marginTop:8}}>{l}</div></div>;
  const Badges=()=><div style={{position:"absolute",right:"14mm",bottom:"9mm",display:"flex",alignItems:"center",gap:"3mm"}}><img src={RPT("badge-coq.png")} alt="" style={{height:"11mm"}}/><img src={RPT("badge-bpi.png")} alt="" style={{height:"12mm"}}/><img src={RPT("badge-aleno.png")} alt="" style={{height:"11mm"}}/></div>;
  return(<Page bg="#05323F">
    <div style={{position:"absolute",inset:0,background:"#05323F url("+RPT("cover-bg.jpg")+") center/cover no-repeat"}}/>
    <img src={RPT("wave.png")} alt="" style={{position:"absolute",left:0,top:"68mm",width:"100%",height:"92mm"}}/>
    <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",color:"#fff"}}>
      <div style={{marginTop:"28mm",fontSize:11,fontWeight:700,color:"#BFE6E2"}}>Revue de portefeuille · BU ORC</div>
      <div style={{fontFamily:F_DISPLAY,fontSize:60,fontWeight:700,lineHeight:1.05,marginTop:10,letterSpacing:"-.01em"}}>Comité de Direction</div>
      <div style={{fontSize:24,fontWeight:700,marginTop:12}}>{label.replace(/^CODIR du /,"")}</div>
      <div style={{display:"flex",gap:"14mm",marginTop:"11mm",padding:"4mm 10mm",borderRadius:12,background:"rgba(0,40,52,.55)"}}>
        {st(all.length,plural(all.length,"Projet suivi","Projets suivis"))}{st(risk,"À risque")}{st(watch,"En vigilance")}{st(soon,"Départs sous 30 j")}
      </div>
      <img src={RPT("logo.png")} alt="ENOGIA" style={{position:"absolute",left:"50%",bottom:"24mm",transform:"translateX(-50%)",height:"22mm",width:"auto"}}/>
      <div style={{position:"absolute",left:0,right:0,bottom:"11mm",fontSize:14,fontStyle:"italic"}}>Micro-turbomachinery for a more sustainable world</div>
    </div>
    <Badges/>
  </Page>);
}

// ── Page de contact (dernière page, gabarit « contact ») ──────────────────────────────────────────────────────
function ContactPage(){
  const L=(t,o={})=><div style={{fontSize:14,lineHeight:"9mm",...o}}>{t}</div>;
  return(<Page bg="#05323F">
    <div style={{position:"absolute",inset:0,background:"#05323F url("+RPT("cover-bg.jpg")+") center/cover no-repeat"}}/>
    <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",color:"#fff",paddingTop:"42mm"}}>
      <img src={RPT("logo.png")} alt="ENOGIA" style={{height:"26mm",width:"auto",marginBottom:"12mm"}}/>
      {L("Gabriel VINCENT / Head of Operations & Projects",{fontWeight:700})}
      {L("gabriel.vincent@enogia.com",{fontStyle:"italic"})}
      {L("+33 7 67 84 14 90")}
      <div style={{height:"6mm"}}/>
      {L("43, avenue de Boisbaudran, 13015 Marseille, France")}
      {L("+33(0)4 84 25 60 17 - info@enogia.com")}
      {L("www.enogia.com",{color:C.accent})}
    </div>
    <div style={{position:"absolute",right:"14mm",bottom:"9mm",display:"flex",alignItems:"center",gap:"3mm"}}><img src={RPT("badge-coq.png")} alt="" style={{height:"11mm"}}/><img src={RPT("badge-bpi.png")} alt="" style={{height:"12mm"}}/><img src={RPT("badge-aleno.png")} alt="" style={{height:"11mm"}}/></div>
  </Page>);
}

// ── v290 (lot F, maquette validée : « Go ») — patron des KPI : la réponse d'abord, ce qu'il faut décider, puis les preuves ──
// Échelle de texte : 36 (chiffre phare, n° de PJ) · 24 (réponse, titres) · 14 (sous-titres) · 11 (texte) · 9,5 (étiquettes) ;
// casse normale ; textes colorés en teinte foncée (txt), pastilles et barres aux couleurs de la marque.
function summarySentence(all){
  const risk=all.filter(i=>i.worst==="red").length,late=all.filter(i=>i.ecart>0).length;
  const soon=all.filter(i=>i.dep&&diffDays(today,i.dep)>=0&&diffDays(today,i.dep)<=30),soonLate=soon.filter(i=>(i.drift||0)>0||(i.ecart||0)>0).length;
  const n=all.length;
  return(<>Sur {n} {plural(n,"projet","projets")}, {risk?<span style={{color:TX.red,fontWeight:700}}>{risk} {plural(risk,"est à risque","sont à risque")}</span>:<span style={{color:TX.green,fontWeight:700}}>aucun n'est à risque</span>}
    {late?<> et <span style={{color:TX.red,fontWeight:700}}>{late} {plural(late,"part","partent")} après la date contractuelle</span></>:<> et aucun ne part après la date contractuelle</>}.
    {soon.length>0&&<> <b style={{color:C.navy}}>{soon.length} {plural(soon.length,"machine doit","machines doivent")} partir d'ici 30 jours</b>{soonLate?", dont "+soonLate+" avec retard":""}.</>}</>);
}
// « À décider aujourd'hui » : au plus 3 sujets — projets à risque au plus gros écart, puis la première cause de retard du portefeuille
function decisions(all){
  const out=[];
  const firstSentence=t=>{const s=String(t||"").trim().split(/(?<=[.!?])\s/)[0];return s.length>140?s.slice(0,139)+"…":s;};
  all.filter(i=>i.worst==="red").sort((a,b)=>Math.max(b.ecart||0,b.drift||0)-Math.max(a.ecart||0,a.drift||0)).slice(0,2).forEach(i=>{
    const parts=[];if(i.ecart>0)parts.push("+"+i.ecart+" j sur la MaD ORC");else if(i.drift>0)parts.push("+"+i.drift+" j sur le planning initial");
    if(i.types[0])parts.push(i.types[0][0].toLowerCase());
    const mit=sortedItems(itemsOf(i.meta,"mitigations")).find(x=>!x.done),gen=(i.notes.gen||"").trim();
    const ask=mit?firstSentence(mit.text):gen?firstSentence(gen):"décision à prendre";
    out.push({who:i.r.pj+" · "+(i.meta.nomProjet||""),text:(parts.length?parts.join(", ")+" — ":"")+ask});
  });
  const ty={};all.forEach(i=>i.types.forEach(([t,d])=>{if(!ty[t])ty[t]={d:0,n:0};ty[t].d+=d;ty[t].n++;}));
  const top=Object.entries(ty).sort((a,b)=>b[1].d-a[1].d)[0];
  if(top&&top[1].n>1)out.push({who:"Portefeuille",text:top[0]+" sur "+top[1].n+" PJ ("+top[1].d+" j de retard cumulés) : quelle réponse ?"});
  return out.slice(0,3);
}
function SummaryPage({chunk,idx,label,page,total,all,decEdits,onDecEdit}){
  const first=idx===0;
  const risk=all.filter(i=>i.worst==="red").length,late=all.filter(i=>i.ecart>0).length;
  const soon=all.filter(i=>i.dep&&diffDays(today,i.dep)>=0&&diffDays(today,i.dep)<=30).length;
  const tot=all.reduce((t,i)=>t+(montantOf(i.meta)||0),0),enc=all.reduce((t,i)=>t+(montantOf(i.meta)||0)*(payPct(i.meta,i.r.pj)||0)/100,0);
  const tp=all.reduce((t,i)=>t+i.pen.amount,0);
  const dec=first?decisions(all):[];
  const kpi=(v,l,c,n)=><div style={{flex:1,paddingLeft:n?16:0,borderLeft:n?"1px solid "+C.hair:"none"}}><div style={{fontFamily:F_DISPLAY,fontSize:36,fontWeight:500,color:c||C.navy,lineHeight:1,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{v}</div><div style={{fontSize:11,color:C.ink2,marginTop:4}}>{l}</div></div>;
  const COLS="88px minmax(140px,1.6fr) 84px 92px 76px 96px 168px";
  const th={fontSize:9.5,fontWeight:500,color:C.mute};
  return(<Page>
    <Masthead eyebrow={label} title={first?"Synthèse du portefeuille":"Synthèse du portefeuille (suite)"} sub={<span>{all.length} {plural(all.length,"projet","projets")} · classés du plus au moins critique</span>}/>
    <div style={{flex:1,minHeight:0,padding:"5mm 12mm 0",display:"flex",flexDirection:"column",gap:"4.5mm"}}>
      {first&&<>
        <div style={{fontFamily:F_DISPLAY,fontSize:24,fontWeight:500,lineHeight:1.25,color:C.ink,letterSpacing:"-.01em",maxWidth:"250mm"}}>{summarySentence(all)}</div>
        {dec.length>0&&<div style={{border:"1px solid "+C.hair,borderLeft:"4px solid "+C.red,borderRadius:6,padding:"8px 14px"}}>
          <div style={{fontSize:14,fontWeight:500,color:TX.red}}>À décider aujourd'hui</div>
          <ol style={{margin:"4px 0 0",paddingLeft:18}}>{dec.map((d,n)=><li key={n} style={{fontSize:11,lineHeight:1.5,color:C.ink,margin:"2px 0"}}>
            <b style={{color:C.navy}}>{d.who}</b> — <span contentEditable suppressContentEditableWarning title="Cliquez pour reformuler avant l'export" onBlur={e=>onDecEdit&&onDecEdit(n,e.currentTarget.innerText)} style={{outline:"none"}}>{decEdits&&decEdits[n]!=null?decEdits[n]:d.text}</span></li>)}</ol>
        </div>}
        <div style={{display:"flex"}}>
          {kpi(risk,"à risque (un feu rouge)",risk?TX.red:TX.green,0)}
          {kpi(late,"au-delà de la MaD ORC contractuelle",late?TX.red:TX.green,1)}
          {kpi(soon,"départs dans les 30 jours",null,1)}
          {tot>0?kpi(Math.round(enc/tot*100)+" %","des contrats encaissés · pénalités "+(tp>0?fmtEur(tp):"0 €"),null,1):kpi(tp>0?fmtEur(tp):"0 €","de pénalités comptées",tp>0?TX.red:null,1)}
        </div>
      </>}
      <div style={{flex:1,minHeight:0}}>
        <div style={{display:"grid",gridTemplateColumns:COLS,gap:8,alignItems:"end",padding:"0 6px 5px",borderBottom:"1px solid #9DB7B4"}}>
          <span style={th}>PJ</span><span style={th}>Projet</span><span style={{...th,textAlign:"right"}}>Départ</span><span style={{...th,textAlign:"right"}}>Écart au contrat</span><span style={{...th,textAlign:"right"}}>Production</span><span style={{...th,textAlign:"right"}}>Pénalités</span><span style={{...th,whiteSpace:"nowrap"}}>Planning · Cash · Risques · Client</span>
        </div>
        {chunk.map(i=>{const em=ETAT_META[i.r.etat]||ETAT_META["NOT ORDERED"];return(
          <div key={i.r.pj} style={{display:"grid",gridTemplateColumns:COLS,gap:8,alignItems:"center",padding:"5px 6px",fontSize:11,borderBottom:"1px solid #E1ECEB"}}>
            <span style={{fontWeight:700,color:C.navy}}>{i.r.pj}{i.meta.numSerie&&<div style={{fontSize:9.5,fontWeight:400,color:C.mute,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>S/N {i.meta.numSerie}</div>}</span>
            <span style={{minWidth:0}}><div style={{fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.meta.nomProjet}</div><div style={{fontSize:9.5,color:C.mute,display:"flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:"50%",background:em.text}}/>{em.label}{i.meta.pays&&i.meta.pays!=="—"?" · "+i.meta.pays:""}</div></span>
            <span style={{textAlign:"right",fontVariantNumeric:"tabular-nums",color:C.ink2}}>{i.dep?fdm(i.dep)+" "+String(i.dep.getFullYear()).slice(2):"—"}</span>
            <span style={{textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:i.ecart==null?C.mute:i.ecart>0?TX.red:TX.green}}>{i.ecart==null?"—":i.ecart===0?"=":sg(i.ecart)}</span>
            <span style={{textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{i.pv} %</span>
            <span style={{textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:i.pen.amount>0?700:400,color:i.pen.amount>0?TX.red:C.mute,whiteSpace:"nowrap"}}>{i.pen.txt}</span>
            <span style={{display:"flex",gap:2}}>{FEUX.map(([k])=><Orb key={k} lv={i.feux[k]||null} size={10}/>)}</span>
          </div>);})}
        <div style={{display:"flex",gap:14,fontSize:9.5,color:C.mute,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
          {FEU_LEVELS.map(([lv])=><span key={lv} style={{display:"inline-flex",alignItems:"center",gap:4}}><Orb lv={lv} size={7}/>{LEV[lv]}</span>)}
          <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Orb lv={null} size={9}/>Non évalué</span>
          <span style={{marginLeft:"auto"}}>Écart = départ prévu − MaD ORC contractuelle (fin hors transport)</span>
        </div>
      </div>
    </div>
    <Footer label={label} page={page} total={total}/>
  </Page>);
}

// ── Page d'un PJ : une phrase, puis où en est-on · ce qui coince · ce qu'on fait, et le contrat sur une ligne ──
function pjSentence(i){
  const r=i.r,em=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
  if(r.etat==="SHIPPED")return <>Expédiée{i.dep?<> le <b style={{color:C.navy}}>{fd(i.dep)}</b></>:null}{i.ecart>0?<>, <span style={{color:TX.red,fontWeight:700}}>{i.ecart} j après la MaD ORC contractuelle</span></>:null}.</>;
  return(<>{em.label}{i.dep?<>, départ le <b style={{color:C.navy}}>{fd(i.dep)}</b></>:null}
    {i.drift>0?<>, <span style={{color:TX.red,fontWeight:700}}>{i.drift} jours après le planning initial</span></>:i.drift<0?<>, <span style={{color:TX.green,fontWeight:700}}>{-i.drift} jours d'avance sur le planning initial</span></>:null}
    {i.ecart>0?<> et après la MaD ORC contractuelle (+{i.ecart} j)</>:null}.
    {i.types[0]?<> Cause principale : {i.types[0][0].toLowerCase()} ({i.types[0][1]} j).</>:null}
    {i.types[1]?<> Puis : {i.types[1][0].toLowerCase()} ({i.types[1][1]} j).</>:null}</>);
}
function PjPage({i,label,page,total}){
  const r=i.r,m=i.meta;
  const kind=presenceKind(r.clientPresence);
  const em=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
  const stat=(d,idx)=>{if(!d)return"none";if(d<=today)return"done";const prev=idx>0?dOf(r[MSS[idx-1][0]]):null;return(!prev||prev<=today)?"now":"next";};
  const wl=i.worst;
  const gen=(i.notes.gen||"").trim();
  const acts=sortedItems(itemsOf(m,"actions")),mits=sortedItems(itemsOf(m,"mitigations"));
  const todo=[...mits.filter(x=>!x.done).map(x=>({...x,mit:true})),...acts.filter(x=>!x.done)].slice(0,5),doneL=[...mits,...acts].filter(x=>x.done).slice(0,1);
  const colH=t=><div style={{fontSize:14,fontWeight:500,color:C.navy,margin:"0 0 6px",paddingBottom:4,borderBottom:"1px solid "+C.hair}}>{t}</div>;
  const line=(k,kc,children)=><div style={{display:"flex",gap:6,fontSize:11,lineHeight:1.45,margin:"3px 0"}}><span style={{flexShrink:0,width:10,fontWeight:700,color:kc}}>{k}</span><span style={{minWidth:0}}>{children}</span></div>;
  const reds=FEUX.filter(([k])=>i.feux[k]==="red").map(([,l])=>l.toLowerCase()),yel=FEUX.filter(([k])=>i.feux[k]==="yellow").map(([,l])=>l.toLowerCase());
  const cp=compPct(m),pp=payPct(m,r.pj),mt=montantOf(m);
  const strip=[["Contrat",mt?fmtEur(mt):"—",mt?C.navy:C.mute],["Encaissé",pp==null?"—":pp+" %",pp==null?C.mute:C.navy],["MaD ORC contractuelle",i.tf?fd(i.tf):"—",i.tf?C.navy:C.mute],[r.etat==="SHIPPED"?"Départ":"Fin projetée",i.dep?fd(i.dep):"—",i.ecart>0?TX.red:C.navy],["Pénalités",i.pen.txt,i.pen.amount>0?TX.red:C.mute]];
  return(<Page>
    <Masthead eyebrow={label} title={<span style={{display:"inline-flex",alignItems:"baseline",gap:14}}><span style={{fontSize:36,fontWeight:700,letterSpacing:"-.02em",whiteSpace:"nowrap"}}>{r.pj}</span><span style={{fontSize:14,fontWeight:500,color:C.ink2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{[m.nomProjet,r.gamme,m.numSerie?"S/N "+m.numSerie:null,m.chefProjet&&m.chefProjet!=="—"?"chef de projet : "+m.chefProjet:null].filter(Boolean).join(" · ")}</span></span>}
      sub={<><span style={{display:"inline-flex",alignItems:"center",gap:6,color:C.ink2}}><span style={{width:7,height:7,borderRadius:"50%",background:em.text}}/>{em.label}</span>{m.pays&&m.pays!=="—"&&<span style={{display:"inline-flex",alignItems:"center",gap:6}}><CountryFlag pays={m.pays} size={12}/>{m.pays}</span>}</>}
      right={wl?<span style={{display:"inline-flex",alignItems:"center",gap:4,background:TINT[wl],color:TX[wl==="yellow"?"amber":wl],borderRadius:999,padding:"3px 12px 3px 5px",fontSize:11,fontWeight:700}}><Orb lv={wl} size={7}/>&nbsp;{LEV[wl]}</span>:null}/>
    <div style={{flex:1,minHeight:0,padding:"4mm 12mm 0",display:"flex",flexDirection:"column",gap:"4.5mm"}}>
      <div style={{fontFamily:F_DISPLAY,fontSize:24,fontWeight:500,lineHeight:1.25,color:C.ink,letterSpacing:"-.01em"}}>{pjSentence(i)}</div>
      <div style={{flex:1,minHeight:0,overflow:"hidden",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"9mm"}}>
        <div style={{minWidth:0}}>
          {colH("Où en est-on")}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {MSS.map(([k,lab],n)=>{const d=dOf(r[k]),iv=i.ini?dOf(i.ini[k]):null,dl=d&&iv?diffDays(iv,d):null,st=stat(d,n);
              const mk=st==="done"?{background:C.navy2}:st==="now"?{background:"#fff",border:"3px solid "+C.brass}:{background:"#fff",border:"2px "+(st==="none"?"dashed ":"solid ")+C.faint};
              return(<div key={k} style={{textAlign:"center"}}>
                <div style={{width:14,height:14,borderRadius:"50%",boxSizing:"border-box",margin:"0 auto 4px",...mk}}/>
                <div style={{fontSize:9.5,color:C.mute}}>{lab}</div>
                <div style={{fontSize:11,color:C.ink,whiteSpace:"nowrap"}}>{fdm(d)}{k==="tests"&&r.testsFin?" → "+fdm(dOf(r.testsFin)):""}</div>
                {dl!=null&&dl!==0&&<div style={{fontSize:9.5,fontWeight:700,color:dl>0?TX.red:TX.green}}>{sg(dl)}</div>}
              </div>);})}
          </div>
          <div style={{marginTop:10}}>
            {line(i.pv>=100?"✓":"•",i.pv>=100?TX.green:C.mute,<>Production chez ENOGIA : {i.pv} %</>)}
            {kind&&line("•",C.mute,<>Présence aux tests : {PRESENCE_META[kind].label}{presenceDateText(r.clientPresence)?" · "+presenceDateText(r.clientPresence):""}</>)}
            {cp!=null&&line(cp>=100?"✓":"•",cp>=100?TX.green:C.mute,<>Composants majeurs : {cp} % réceptionnés</>)}
            {manualGlobal(m)!=null&&line("•",C.mute,<>Avancement global du projet : {manualGlobal(m)} %</>)}
          </div>
        </div>
        <div style={{minWidth:0}}>
          {colH("Ce qui coince")}
          {i.types.length===0&&reds.length===0&&yel.length===0&&<div style={{fontSize:11,color:C.mute}}>Aucun point signalé sur ce projet.</div>}
          {i.types.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 70px 32px",gap:"6px 10px",alignItems:"center",fontSize:11}}>
            {i.types.slice(0,4).map(([t,d])=><React.Fragment key={t}><span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t}</span><div style={{height:5,borderRadius:3,background:C.hair,overflow:"hidden"}}><div style={{width:d/i.types[0][1]*100+"%",height:"100%",background:C.red}}/></div><b style={{textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{d} j</b></React.Fragment>)}
          </div>}
          {i.types.length>4&&<div style={{fontSize:9.5,color:C.mute,marginTop:2}}>+ {i.types.length-4} autre{i.types.length-4>1?"s":""} {plural(i.types.length-4,"cause","causes")}</div>}
          <div style={{marginTop:8}}>
            {reds.length>0&&line("!",TX.red,<>À risque : {reds.join(", ")}</>)}
            {yel.length>0&&line("!",TX.amber,<>En vigilance : {yel.join(", ")}</>)}
            {!Object.keys(i.feux).length&&line("•",C.mute,<>Feux non évalués</>)}
          </div>
        </div>
        <div style={{minWidth:0}}>
          {colH("Ce qu'on fait")}
          {todo.length===0&&doneL.length===0&&!gen&&<div style={{fontSize:11,color:C.mute}}>Aucune action ni mitigation saisie.</div>}
          {todo.map(x=>line("•",x.mit?TX.red:TX.brass,<><span style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{x.mit?"Mitigation : ":""}{x.text}</span>{x.deadline&&<span style={{color:x.deadline<new Date().toISOString().slice(0,10)?TX.red:C.mute,fontWeight:x.deadline<new Date().toISOString().slice(0,10)?700:400}}> — avant le {fdm(dOf(x.deadline))}</span>}</>))}
          {doneL.map(x=>line("✓",TX.green,<><span style={{color:C.mute,textDecoration:"line-through"}}>{x.text}</span>{x.doneAt&&<span style={{color:TX.green}}> clôturé le {fdm(dOf(x.doneAt))}</span>}</>))}
          {gen&&<div style={{marginTop:10,borderLeft:"3px solid "+C.brass,paddingLeft:10,fontSize:11,lineHeight:1.45,color:C.ink,whiteSpace:"pre-wrap",display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>« {gen} » <span style={{color:C.mute}}>— commentaire général</span></div>}
        </div>
      </div>
      <div style={{display:"flex",borderTop:"1px solid "+C.hair,paddingTop:"3mm",flexShrink:0}}>
        {strip.map(([l,v,c],n)=><div key={l} style={{flex:1,minWidth:0,paddingLeft:n?12:0,borderLeft:n?"1px solid "+C.hair:"none"}}><div style={{fontSize:9.5,color:C.mute}}>{l}</div><div style={{fontFamily:F_DISPLAY,fontSize:14,fontWeight:500,color:c,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div>{l==="Pénalités"&&i.pen.amount>0&&<div style={{fontSize:9.5,color:C.mute,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.pen.sub}</div>}</div>)}
      </div>
    </div>
    <Footer label={label} page={page} total={total}/>
  </Page>);
}

// ── Dialogue : choix des PJ, aperçu, export PDF ─────────────────────────────────────────────────────────────
const PRINT_CSS=`@page{size:A4 landscape;margin:0}
@media print{
  html,body{background:#fff!important;margin:0!important}
  body>*:not(#codir-root){display:none!important}
  #codir-root{position:static!important;display:block!important;background:#fff!important;overflow:visible!important;height:auto!important}
  #codir-root .codir-noprint{display:none!important}
  #codir-root .codir-preview{overflow:visible!important;padding:0!important;background:#fff!important;height:auto!important;display:block!important}
  #codir-root .codir-pages{zoom:1!important}
  #codir-root .codir-page{margin:0!important;box-shadow:none!important;break-after:page;page-break-after:always;break-inside:avoid}
  #codir-root .codir-page:last-child{break-after:auto;page-break-after:auto}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}`;
export function CodirDialog({data,initialData,comments,delays,progress,initialPj,onClose}){
  const initialByPj=useMemo(()=>{const m={};(initialData||[]).forEach(x=>{m[x.pj]=x;});return m;},[initialData]);
  const infosAll=useMemo(()=>data.filter(r=>r.etat!=="SLOT_LIBRE").map(r=>pjInfo(r,{initialByPj,comments,delays,progress})),[data,initialByPj,comments,delays,progress]);
  const [sel,setSel]=useState(()=>initialPj?new Set([initialPj]):new Set(data.filter(r=>r.etat!=="SHIPPED"&&r.etat!=="SLOT_LIBRE").map(r=>r.pj)));
  const [q,setQ]=useState("");
  const [withCover,setWithCover]=useState(true);
  const [withSummary,setWithSummary]=useState(true);
  const [meeting,setMeeting]=useState(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");});
  const [scale,setScale]=useState(.7);
  const [decEdits,setDecEdits]=useState({}); // v290 : « À décider aujourd'hui » reformulé dans l'aperçu (imprimé tel quel, non enregistré)
  const prevRef=useRef(null);
  useEffect(()=>{
    const st=document.createElement("style");st.id="codir-print-style";st.textContent=PRINT_CSS;document.head.appendChild(st);
    const prevOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
    const onKey=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",onKey);
    return()=>{st.remove();document.body.style.overflow=prevOverflow;window.removeEventListener("keydown",onKey);};
  },[onClose]);
  useEffect(()=>{
    const el=prevRef.current;if(!el)return;
    const upd=()=>setScale(Math.max(.3,Math.min(1,(el.clientWidth-40)/PAGE_W)));
    upd();const ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(upd):null;ro&&ro.observe(el);return()=>ro&&ro.disconnect();
  },[]);
  const chosen=useMemo(()=>infosAll.filter(i=>sel.has(i.r.pj)).sort((a,b)=>severity(b)-severity(a)||a.r.pj.localeCompare(b.r.pj)),[infosAll,sel]);
  const listed=useMemo(()=>{const s=q.trim().toLowerCase();return infosAll.filter(i=>!s||i.r.pj.toLowerCase().includes(s)||(i.meta.nomProjet||"").toLowerCase().includes(s)||(i.meta.pays||"").toLowerCase().includes(s));},[infosAll,q]);
  const toggle=pj=>setSel(s=>{const n=new Set(s);n.has(pj)?n.delete(pj):n.add(pj);return n;});
  const setBy=f=>setSel(new Set(infosAll.filter(f).map(i=>i.r.pj)));
  const label="CODIR du "+new Date(meeting+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
  const chunks=[];if(chosen.length){chunks.push(chosen.slice(0,FIRST_ROWS));for(let k=FIRST_ROWS;k<chosen.length;k+=NEXT_ROWS)chunks.push(chosen.slice(k,k+NEXT_ROWS));}
  const nCov=withCover&&chosen.length?1:0;const nSum=withSummary?chunks.length:0;const total=nCov+nSum+chosen.length+nCov;
  const chip=(on)=>({border:"1px solid "+(on?T.teal500:T.line),background:on?T.teal100:"transparent",color:on?T.teal600:T.ink500,borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:T.font});
  return createPortal(
    <div id="codir-root" role="dialog" aria-modal="true" aria-label="Rapport CODIR" style={{position:"fixed",inset:0,zIndex:10050,background:T.surface,display:"flex",flexDirection:"column",fontFamily:T.font}}>
      <div className="codir-noprint" style={{display:"flex",alignItems:"center",gap:14,padding:"10px 18px",background:T.card,borderBottom:"1px solid "+T.line,flexWrap:"wrap"}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:14,color:T.ink900,display:"flex",alignItems:"center",gap:9}}><NavIcon name="chart" size={18}/>Rapport CODIR</div>
        <label style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:11,color:T.ink500,fontWeight:600}}>Date du CODIR<input type="date" value={meeting} onChange={e=>e.target.value&&setMeeting(e.target.value)} style={{padding:"4px 8px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontFamily:T.font,fontSize:11,colorScheme:T.mode==="dark"?"dark":"light"}}/></label>
        <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,color:T.ink500,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={withCover} onChange={e=>setWithCover(e.target.checked)}/>Page de garde</label>
        <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,color:T.ink500,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={withSummary} onChange={e=>setWithSummary(e.target.checked)}/>Page de synthèse</label>
        <span style={{marginLeft:"auto",fontSize:11,color:T.ink500}}>{chosen.length} projet{chosen.length>1?"s":""} · {total} page{total>1?"s":""}</span>
        <button disabled={total===0} onClick={()=>window.print()} style={{border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:14,fontFamily:T.font,color:"#fff",cursor:total?"pointer":"default",background:total?T.navy700:T.ink100}}>Exporter en PDF</button>
        <button onClick={onClose} style={{border:"1px solid "+T.line,borderRadius:8,padding:"7px 14px",fontWeight:700,fontSize:14,fontFamily:T.font,background:"transparent",color:T.ink700,cursor:"pointer"}}>Fermer</button>
      </div>
      <div style={{flex:1,minHeight:0,display:"flex"}}>
        <div className="codir-noprint" style={{width:290,flexShrink:0,borderRight:"1px solid "+T.line,background:T.card,display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{padding:10,borderBottom:"1px solid "+T.line}}>
            <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un PJ, projet, pays…" style={{width:"100%",boxSizing:"border-box",padding:"6px 10px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontSize:11,fontFamily:T.font}}/>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
              <button style={chip(false)} onClick={()=>setBy(()=>true)}>Tous</button>
              <button style={chip(false)} onClick={()=>setBy(i=>i.r.etat!=="SHIPPED")}>Hors expédiés</button>
              <button style={chip(false)} onClick={()=>setBy(i=>i.worst==="red")}>Feu rouge</button>
              <button style={chip(false)} onClick={()=>setBy(i=>i.worst==="red"||i.worst==="yellow")}>Rouge + jaune</button>
              <button style={chip(false)} onClick={()=>setSel(new Set())}>Aucun</button>
            </div>
            <div style={{fontSize:11,color:T.ink300,marginTop:6}}>{sel.size} sélectionné{sel.size>1?"s":""} sur {infosAll.length}</div>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {listed.map(i=>{const on=sel.has(i.r.pj);return(
              <label key={i.r.pj} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 12px",borderBottom:"1px solid "+T.surface,cursor:"pointer",background:on?T.teal100:"transparent"}}>
                <input type="checkbox" checked={on} onChange={()=>toggle(i.r.pj)}/>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontFamily:T.fontMono,fontWeight:700,fontSize:11,color:T.teal600,whiteSpace:"nowrap"}}>{i.r.pj}</span><SerieTag pj={i.r.pj} size={10}/><CountryFlag pays={i.meta.pays} size={11}/></div>
                  <div style={{fontSize:11,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.meta.nomProjet}</div>
                </div>
                <span style={{display:"inline-flex",gap:3}}>{FEUX.map(([k])=><span key={k} style={{width:7,height:7,borderRadius:"50%",background:i.feux[k]?FC[i.feux[k]]:T.ink100}}/>)}</span>
              </label>);})}
          </div>
        </div>
        <div ref={prevRef} className="codir-preview" style={{flex:1,minWidth:0,overflow:"auto",padding:"20px 20px 40px",background:T.mode==="dark"?"#161C24":"#E9EBEF"}}>
          {total===0?<div className="codir-noprint" style={{textAlign:"center",color:T.ink300,marginTop:80,fontSize:14}}>Sélectionnez au moins un projet à gauche.</div>:
          <div className="codir-pages" style={{zoom:scale,width:PAGE_W,margin:"0 auto"}}>
            {nCov>0&&<CoverPage label={label} all={chosen} page={1} total={total}/>}
            {withSummary&&chunks.map((ch,n)=><SummaryPage key={"s"+n} chunk={ch} idx={n} label={label} page={nCov+n+1} total={total} all={chosen} decEdits={decEdits} onDecEdit={(k,t)=>setDecEdits(e=>({...e,[k]:t}))}/>)}
            {chosen.map((i,n)=><PjPage key={i.r.pj} i={i} label={label} page={nCov+nSum+n+1} total={total}/>)}
            {nCov>0&&<ContactPage/>}
          </div>}
        </div>
      </div>
    </div>,document.body);
}
