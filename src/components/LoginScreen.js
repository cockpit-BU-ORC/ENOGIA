import React, { useState, useEffect } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, ALLOWED_EMAIL_DOMAIN } from "../firebase";
import { T, FZ, navTokens } from "../theme";
import { NavIcon, Hl } from "./SharedUI";
import { SITE_NAME, SITE_SCOPE, SITE_SUB } from "../siteName";

export const ROBOTO="'Satoshi',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"; // v177 : Satoshi (nom de constante conservé)

// v179 — Écran de connexion refait dans la direction « Atelier » : panneau marine à gauche (logo, phrase d'accroche
// surlignée, ce que l'on trouve dans le site), connexion à droite en un seul clic (plus d'étape « Entrer »).
// Mêmes jetons que le site (police, couleurs, plaques) ; sur téléphone les deux panneaux s'empilent.
const USES=[
  ["gantt","Ordonnancement","Gantt, calendrier et liste de toutes les machines ORC."],
  ["gauge","Tests","Plan de tests, testeurs et présence client ou NOBO."],
  ["comments","Commentaires et retards","Mentions, causes de retard et synthèses projet."],
];

export function LoginScreen(){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const N=navTokens();
  const handleGoogleSignIn=async ()=>{
    setBusy(true);setError("");
    try{
      const result=await signInWithPopup(auth,googleProvider);
      const email=result.user.email||"";
      if(!email.toLowerCase().endsWith("@"+ALLOWED_EMAIL_DOMAIN)){
        await signOut(auth);
        setError("Accès réservé aux comptes @"+ALLOWED_EMAIL_DOMAIN+". Vous étiez connecté avec "+email+". Reconnectez-vous avec votre compte ENOGIA.");
      }
    }catch(e){
      if(!(e && e.code==="auth/popup-closed-by-user")){
        console.error(e);
        setError(e&&e.code==="auth/popup-blocked"?"La fenêtre de connexion a été bloquée par le navigateur. Autorisez les fenêtres pour ce site, puis réessayez.":"La connexion n'a pas abouti. Vérifiez votre réseau et réessayez.");
      }
    }
    setBusy(false);
  };
  return(
    <div className="enogia-login" style={{minHeight:"100dvh",display:"flex",flexWrap:"wrap",fontFamily:T.font,background:T.surface,color:T.ink900}}>
      {/* Panneau marine : identité + ce que contient le site */}
      <section aria-label="Présentation" className="enogia-login-side" style={{flex:"1 1 420px",minWidth:0,position:"relative",overflow:"hidden",background:N.industrial?N.bg:T.teal500,color:"#FFFFFF",padding:"40px clamp(24px,5vw,64px)",display:"flex",flexDirection:"column",gap:28}}>
        {/* v183 : fond léger — carte du monde en filigrane (blanc à 12 %), purement décorative */}
        <img src={process.env.PUBLIC_URL+"/world-map-bg.svg"} alt="" aria-hidden="true" style={{position:"absolute",right:"-18%",bottom:"-8%",width:"min(1100px,140%)",maxWidth:"none",opacity:.12,filter:"brightness(0) invert(1)",pointerEvents:"none",zIndex:0}}/>
        <img src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="ENOGIA" width="105" height="42" style={{position:"relative",height:40,width:"auto",alignSelf:"flex-start",filter:"brightness(0) invert(1)"}}/>
        <div style={{marginTop:"auto",position:"relative"}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:800,fontSize:16,letterSpacing:".02em",marginBottom:2}}>{SITE_NAME} <span style={{color:"#F4D35E"}}>– {SITE_SCOPE}</span></div>
          <div style={{fontSize:FZ.xs,color:"#C9D4E2",marginBottom:16}}>{SITE_SUB}</div>
          <h1 className="enogia-float-in" style={{margin:0,fontFamily:T.fontDisplay,fontWeight:500,fontSize:"clamp(30px,4vw,46px)",lineHeight:1.08,letterSpacing:"-.02em",maxWidth:560}}>
            Toutes les machines ORC, de l'<Hl color="#F4D35E">atelier</Hl> à la livraison.
          </h1>
        </div>
        <ul className="enogia-stagger" style={{position:"relative",listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:14,maxWidth:520}}>
          {USES.map(([ic,t,d])=>(
            <li key={t} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <span aria-hidden="true" style={{width:34,height:34,borderRadius:8,background:"rgba(255,255,255,.1)",color:"#F4D35E",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><NavIcon name={ic} size={19}/></span>
              <span><span style={{display:"block",fontWeight:700,fontSize:FZ.sm}}>{t}</span><span style={{display:"block",fontSize:FZ.sm,color:"#D6E2EE",lineHeight:1.45}}>{d}</span></span>
            </li>))}
        </ul>
        <div style={{position:"relative",fontSize:FZ.xs,color:"#B9C8D8",marginTop:"auto"}}>ENOGIA · 43, avenue de Boisbaudran, Marseille</div>
      </section>

      {/* Connexion */}
      <section aria-label="Connexion" style={{flex:"1 1 380px",minWidth:0,display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 24px"}}>
        <div className="enogia-modal-pop" style={{width:"100%",maxWidth:380}}>
          <h2 style={{margin:"0 0 6px",fontFamily:T.fontDisplay,fontWeight:500,fontSize:28,letterSpacing:"-.02em",color:T.ink900}}>Connexion</h2>
          <p style={{margin:"0 0 26px",fontSize:FZ.sm,color:T.ink500,lineHeight:1.5}}>Utilisez votre compte Google ENOGIA. La session se ferme chaque soir à minuit.</p>
          <button type="button" onClick={handleGoogleSignIn} disabled={busy} aria-busy={busy} className="enogia-btn-tap enogia-login-btn"
            style={{width:"100%",minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:T.card,color:T.ink900,border:"1.5px solid "+T.teal500,borderRadius:10,padding:"12px 16px",fontFamily:T.font,fontSize:FZ.md,fontWeight:700,cursor:busy?"progress":"pointer",opacity:busy?.75:1,transition:"background-color .15s ease, color .15s ease, transform .15s ease"}}>
            {busy?
              <span aria-hidden="true" style={{width:16,height:16,borderRadius:"50%",border:"2px solid "+T.line,borderTopColor:T.teal500,display:"inline-block",animation:"enogiaSpin .8s linear infinite"}}/>
              :<svg aria-hidden="true" viewBox="0 0 20 20" style={{width:19,height:19,flexShrink:0}}><path fill="#4285F4" d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.99-4.33 2.99-7.31z"/><path fill="#34A853" d="M10 20c2.7 0 4.96-.89 6.62-2.42l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H1.07v2.59A10 10 0 0 0 10 20z"/><path fill="#FBBC05" d="M4.41 11.9a6 6 0 0 1 0-3.8V5.51H1.07a10 10 0 0 0 0 8.98l3.34-2.59z"/><path fill="#EA4335" d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 10 0 10 10 0 0 0 1.07 5.51L4.41 8.1C5.2 5.74 7.4 3.98 10 3.98z"/></svg>}
            {busy?"Connexion…":"Continuer avec Google"}
          </button>
          {error&&<div role="alert" style={{marginTop:16,background:T.red100,borderLeft:"4px solid "+T.red500,borderRadius:8,padding:"10px 12px",color:T.red600,fontSize:FZ.sm,lineHeight:1.45}}>{error}</div>}
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:22,fontSize:FZ.xs,color:T.ink500,fontWeight:600}}>
            <NavIcon name="lock" size={14}/>Réservé aux comptes @{ALLOWED_EMAIL_DOMAIN}
          </div>
        </div>
      </section>
    </div>
  );
}

// v183 — Écran de transition après connexion, refait dans le style du site (demandé : l'ancien « verre dépoli » faisait kitsch) :
// fond marine du menu, logo, nom du site et sous-titre qui entrent l'un après l'autre (60 ms), barre or qui se remplit pendant
// l'attente, puis fondu de sortie juste avant l'arrivée sur le site (App retire l'écran à 2,2 s).
export function LoginTransition({name}){
  const firstName=(name||"").trim().split(/\s+/)[0]||"";
  const [leaving,setLeaving]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setLeaving(true),1950);return()=>clearTimeout(t);},[]);
  const N=navTokens();
  return(
    <div role="status" aria-live="polite" className={leaving?"enogia-overlay-out":"enogia-fade-in"} style={{position:"fixed",inset:0,zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",background:N.industrial?N.bg:T.teal500,color:"#FFFFFF",fontFamily:T.font,overflow:"hidden"}}>
      <img src={process.env.PUBLIC_URL+"/world-map-bg.svg"} alt="" aria-hidden="true" style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:"min(1500px,170vw)",maxWidth:"none",opacity:.1,filter:"brightness(0) invert(1)",pointerEvents:"none"}}/>
      <div className="enogia-tr" style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:14,width:"min(440px,calc(100vw - 48px))"}}>
        <img src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="ENOGIA" width="105" height="42" style={{height:44,width:"auto",filter:"brightness(0) invert(1)"}}/>
        <div>
          <div style={{fontFamily:T.fontDisplay,fontWeight:800,fontSize:"clamp(30px,5vw,40px)",letterSpacing:"-.01em",lineHeight:1.05}}><Hl color="#F4D35E">{SITE_NAME}</Hl> <span style={{fontWeight:500,color:"#C9D4E2"}}>– {SITE_SCOPE}</span></div>
          <div style={{fontSize:FZ.sm,color:"#C9D4E2",marginTop:6}}>{SITE_SUB}</div>
        </div>
        <div style={{fontSize:FZ.md,fontWeight:600}}>{firstName?"Bienvenue, "+firstName+".":"Bienvenue."} <span style={{fontWeight:400,color:"#C9D4E2"}}>Chargement du planning…</span></div>
        <div aria-hidden="true" style={{width:"100%",height:3,borderRadius:2,background:"rgba(255,255,255,.14)",overflow:"hidden"}}><div className="enogia-tr-bar" style={{height:"100%",background:"#F4D35E"}}/></div>
      </div>
    </div>
  );
}
