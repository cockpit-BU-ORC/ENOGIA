import React, { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, ALLOWED_EMAIL_DOMAIN } from "../firebase";
import { T, FZ, navTokens } from "../theme";
import { NavIcon, Hl } from "./SharedUI";

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
      <section aria-label="Présentation" className="enogia-login-side" style={{flex:"1 1 420px",minWidth:0,background:N.industrial?N.bg:T.teal500,color:"#FFFFFF",padding:"40px clamp(24px,5vw,64px)",display:"flex",flexDirection:"column",gap:28}}>
        <img src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="ENOGIA" width="105" height="42" style={{height:40,width:"auto",alignSelf:"flex-start",filter:"brightness(0) invert(1)"}}/>
        <div style={{marginTop:"auto"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#F4D35E",marginBottom:10}}>BU ORC</div>
          <h1 className="enogia-float-in" style={{margin:0,fontFamily:T.fontDisplay,fontWeight:500,fontSize:"clamp(30px,4vw,46px)",lineHeight:1.08,letterSpacing:"-.02em",maxWidth:560}}>
            Toutes les machines ORC, de l'<Hl color="#F4D35E">atelier</Hl> à la livraison.
          </h1>
        </div>
        <ul className="enogia-stagger" style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:14,maxWidth:520}}>
          {USES.map(([ic,t,d])=>(
            <li key={t} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <span aria-hidden="true" style={{width:34,height:34,borderRadius:8,background:"rgba(255,255,255,.1)",color:"#F4D35E",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><NavIcon name={ic} size={19}/></span>
              <span><span style={{display:"block",fontWeight:700,fontSize:FZ.sm}}>{t}</span><span style={{display:"block",fontSize:FZ.sm,color:"#D6E2EE",lineHeight:1.45}}>{d}</span></span>
            </li>))}
        </ul>
        <div style={{fontSize:FZ.xs,color:"#B9C8D8",marginTop:"auto"}}>ENOGIA · 43, avenue de Boisbaudran, Marseille</div>
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

// Popup de transition, affichée après la connexion réussie et avant d'arriver sur le planning
// (demandé explicitement) — logo (agrandi) qui pulse + message de bienvenue (agrandi) avec le
// prénom du compte Google connecté. Remplace le fond clair à formes décoratives (jugé pas assez
// joli) par un vrai calque "verre dépoli" : App.js laisse désormais l'écran de connexion monté en
// dessous (au lieu de le démonter), et ce composant ne dessine plus qu'un voile clair translucide
// avec backdrop-filter:blur — on voit donc réellement, flouté, ce qu'il y a derrière, plutôt qu'un
// décor plat qui l'imite.
export function LoginTransition({name}){
  const firstName=(name||"").trim().split(/\s+/)[0]||"";
  return(
    <div className="enogia-fade-in" style={{position:"fixed",inset:0,zIndex:10000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.mode==="dark"?"rgba(15,20,25,.6)":"rgba(253,251,246,.55)",backdropFilter:"blur(26px) saturate(1.15)",WebkitBackdropFilter:"blur(26px) saturate(1.15)",fontFamily:ROBOTO}}>
      <img src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="ENOGIA" style={{height:132,width:"auto",marginBottom:28,filter:T.mode==="dark"?"brightness(0) invert(1)":"drop-shadow(0 8px 24px rgba(18,27,48,.16))",animation:"enogiaLogoPulse 1.3s ease-in-out infinite"}}/>
      {firstName&&<div className="enogia-float-in" style={{fontSize:FZ.xl,fontWeight:700,color:T.teal600,letterSpacing:".005em",textShadow:T.mode==="dark"?"none":"0 1px 0 rgba(255,255,255,.6)"}}>Bienvenue, {firstName}</div>}
      {/* Phrase d'accroche sur le suivi de projet, demandée explicitement, en plus du message de
          bienvenue. */}
      <div className="enogia-float-in" style={{fontSize:FZ.md,color:T.ink500,marginTop:8,textShadow:T.mode==="dark"?"none":"0 1px 0 rgba(255,255,255,.6)"}}>Le suivi de vos projets, à jour en temps réel.</div>
    </div>
  );
}
