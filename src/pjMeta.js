import React from "react";
import { T, FZ, mixHex } from "./theme";

// Corrections manuelles de gamme, prioritaires sur ce qui est importé/deviné — s'appliquent immédiatement, sans réimport.
export const GAMME_OVERRIDE={
  "PJ503":"100LTV3",
};

export const PJ_META={
  "PJ376":{nomProjet:"GAEC - ADELINE",pays:"France",chefProjet:"Clément MARTOUZET"},
  "PJ382-40":{nomProjet:"SHEFFIELD",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ382-180":{nomProjet:"SHEFFIELD",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ394-4":{nomProjet:"MUNSTER",pays:"Allemagne",chefProjet:"Gabriel VINCENT"},
  "PJ399":{nomProjet:"KALAHARI",pays:"Zambie",chefProjet:"Gabriel VINCENT"},
  "PJ405-3":{nomProjet:"CDA Z34",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ405-4":{nomProjet:"CDA Z34",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ420":{nomProjet:"ST GOBAIN",pays:"France",chefProjet:"Clément MARTOUZET"},
  "PJ421-180LT":{nomProjet:"PERENCO",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ421-180MT":{nomProjet:"PERENCO",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ429":{nomProjet:"HERLIES",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ430":{nomProjet:"AATF - PYROGENESYS",pays:"Nigeria",chefProjet:"Gabriel VINCENT"},
  "PJ432":{nomProjet:"ATAL - SHATIN",pays:"Hong Kong",chefProjet:"Emmy BOURELLY"},
  "PJ437":{nomProjet:"KYUSHU - BEPPU CITY",pays:"Japon",chefProjet:"Clément MARTOUZET"},
  "PJ438":{nomProjet:"ONOMICHI",pays:"Japon",chefProjet:"Gabriel VINCENT"},
  "PJ446-1":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-2":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-3":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-4":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-5":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-6":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-7":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-8":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-9":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-10":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-11":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-12":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ449":{nomProjet:"ADUNA - KELSEN",pays:"Espagne",chefProjet:"Emmy BOURELLY"},
  "PJ456":{nomProjet:"ADDFIELD",pays:"UK",chefProjet:"Emmy BOURELLY"},
  "PJ457":{nomProjet:"GUACAMAYA",pays:"Colombie",chefProjet:"Gabriel VINCENT"},
  "PJ460-1":{nomProjet:"ULMATEC  CLV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ460-2":{nomProjet:"ULMATEC  CLV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ461-1":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-2":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-3":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-4":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-5":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ462-1":{nomProjet:"ULMATEC OCV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ462-2":{nomProjet:"ULMATEC OCV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ468-1":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-2":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-3":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-4":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-5":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-6":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ472":{nomProjet:"HANNES",pays:"Islande",chefProjet:"Emmy BOURELLY"},
  "PJ473":{nomProjet:"RIMS",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ479-1":{nomProjet:"EDF PEI",pays:"FR-La Réunion",chefProjet:"Clément MARTOUZET"},
  "PJ479-2":{nomProjet:"EDF PEI",pays:"FR-La Réunion",chefProjet:"Clément MARTOUZET"},
  "PJ485":{nomProjet:"BIOSORRA",pays:"Kenya",chefProjet:"Clément MARTOUZET"},
  "PJ486":{nomProjet:"ALBRET",pays:"France",chefProjet:"Emmy BOURELLY"},
  "PJ493-1":{nomProjet:"CDA E36",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ493-2":{nomProjet:"CDA E36",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ494-1":{nomProjet:"CDA F36",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ494-2":{nomProjet:"CDA F36",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ488":{nomProjet:"KAGOSHIMA",pays:"Japon",chefProjet:"Gabriel VINCENT"},
  "PJ502":{nomProjet:"GRADIENT",pays:"Oman",chefProjet:"Emmy BOURELLY"},
  "PJ503":{nomProjet:"NOYA 1",pays:"Japon",chefProjet:"Gabriel VINCENT"},
  "PJ505":{nomProjet:"NOYA 2",pays:"Japon",chefProjet:"Gabriel VINCENT"},
  "PJ476":{nomProjet:"KBS-WP1 (études)",pays:"UK",chefProjet:"Clément BABLON"},
};
// Rempli en mémoire à la connexion, à partir du document Firestore "planning/pjMetaSync"
// (alimenté par le bouton "Sync depuis Suivi ORC" dans l'onglet Manager). Prioritaire sur PJ_META.
export let SYNCED_PJ_META={};
// Corrections manuelles de fiche projet (nom/pays/chef) saisies dans l'app elle-même, stockées dans
// le document Firestore "planning/pjMetaOverrides". Prioritaires sur la synchro Suivi ORC — c'est la
// dernière main humaine sur la donnée.
export let PJ_META_OVERRIDES={};
export function setPjMetaOverrides(v){ PJ_META_OVERRIDES = v || {}; }
export function getPjMeta(pj,row){
  const synced=SYNCED_PJ_META[pj];
  const override=PJ_META_OVERRIDES[pj];
  const base=PJ_META[pj]||(()=>{
    const prefix=pj.split("-")[0];
    const fallbackKey=Object.keys(PJ_META).find(k=>k.split("-")[0]===prefix);
    return fallbackKey?PJ_META[fallbackKey]:{nomProjet:"—",pays:"—",chefProjet:"—"};
  })();
  const merged={...base,...(synced||{}),...(override||{})};
  // Si le nom n'est toujours pas renseigné, on utilise celui extrait de l'Excel à l'import (ex: "PJ503 - NOYA 1")
  if((!merged.nomProjet||merged.nomProjet==="—")&&row&&row.nomProjet){
    return{...merged,nomProjet:row.nomProjet};
  }
  return merged;
}
// Teintes dédiées aux avatars "chef de projet" — volontairement distinctes des couleurs de statut
// (vert=expédiée, ambre/rouge=alerte de dérive) pour qu'un avatar ne soit jamais lu comme un signal
// d'état. Construit à partir des tokens de thème (donc cohérent clair/sombre), jamais emerald/amber/red.
export function personTint(name){
  const tints=[[T.teal500,T.teal100],[T.violet500,T.violet100],[T.ember500,T.ember100],[T.ink700,T.ink100],[T.navy600,T.surfaceAlt]];
  let h=0;const s=name||"";
  for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;
  return tints[h%tints.length];
}
export function initials(name){
  if(!name||name==="—")return"—";
  const parts=name.trim().split(/\s+/);
  if(parts.length<2)return name.slice(0,3).toUpperCase();
  const prenom=parts[0],nom=parts[parts.length-1];
  return(prenom[0]+nom.slice(0,2)).toUpperCase();
}
// Horodatage relatif ("il y a 2h", "hier"...) — utilisé par tous les fils de commentaires.
export function relTime(iso){
  const d=new Date(iso);
  const diffMin=Math.floor((Date.now()-d.getTime())/60000);
  if(diffMin<1)return "à l'instant";
  if(diffMin<60)return "il y a "+diffMin+" min";
  const h=Math.floor(diffMin/60);
  if(h<24)return "il y a "+h+"h";
  const days=Math.floor(h/24);
  if(days===1)return "hier";
  if(days<7)return "il y a "+days+"j";
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:d.getFullYear()!==new Date().getFullYear()?"numeric":undefined});
}
// Avatar rond (initiales) partagé par tous les fils de commentaires (demandé explicitement : une
// refonte façon "chat Gmail" partout — page Commentaires, fiche projet, popup calendrier — avec le
// même composant pour garantir un rendu identique.
export function Avatar({name,tint,size}){
  const s=size||30;
  return(
    <div style={{width:s,height:s,borderRadius:"50%",background:tint||T.teal500,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:s*0.37,fontWeight:700,flexShrink:0,fontFamily:T.font}}>
      {initials(name)}
    </div>
  );
}
export const COUNTRY_ISO={
  "France":"fr","UK":"gb","Nigeria":"ng","Corée":"kr","Espagne":"es",
  "Singapore":"sg","Norvège":"no","Islande":"is","Kenya":"ke",
  "FR-La Réunion":"re","Japon":"jp","Oman":"om",
  "Allemagne":"de","Zambie":"zm","Hong Kong":"hk","Colombie":"co",
  // Liste complétée (demandé explicitement : "rajouter une liste de pays complet pour faire le lien
  // avec les drapeaux") — couvre la quasi-totalité des pays du monde (noms français), pour qu'un
  // nouveau pays de projet ait toujours un drapeau disponible sans retoucher le code. Les 16 entrées
  // ci-dessus (déjà utilisées par des projets existants) ne sont pas touchées/renommées.
  "Afghanistan":"af","Afrique du Sud":"za","Albanie":"al","Algérie":"dz","Andorre":"ad","Angola":"ao",
  "Arabie Saoudite":"sa","Argentine":"ar","Arménie":"am","Australie":"au","Autriche":"at","Azerbaïdjan":"az",
  "Bahamas":"bs","Bahreïn":"bh","Bangladesh":"bd","Barbade":"bb","Belgique":"be","Belize":"bz",
  "Bénin":"bj","Bhoutan":"bt","Biélorussie":"by","Birmanie":"mm","Bolivie":"bo","Bosnie-Herzégovine":"ba",
  "Botswana":"bw","Brésil":"br","Brunei":"bn","Bulgarie":"bg","Burkina Faso":"bf","Burundi":"bi",
  "Cambodge":"kh","Cameroun":"cm","Canada":"ca","Cap-Vert":"cv","Chili":"cl","Chine":"cn","Chypre":"cy",
  "Costa Rica":"cr","Côte d'Ivoire":"ci","Croatie":"hr","Cuba":"cu","Danemark":"dk","Djibouti":"dj",
  "Dominique":"dm","Égypte":"eg","Émirats Arabes Unis":"ae","Équateur":"ec","Érythrée":"er","Estonie":"ee",
  "Eswatini":"sz","États-Unis":"us","Éthiopie":"et","Fidji":"fj","Finlande":"fi","Gabon":"ga","Gambie":"gm",
  "Géorgie":"ge","Ghana":"gh","Grèce":"gr","Grenade":"gd","Guatemala":"gt","Guinée":"gn",
  "Guinée équatoriale":"gq","Guinée-Bissau":"gw","Guyana":"gy","Haïti":"ht","Honduras":"hn","Hongrie":"hu",
  "Inde":"in","Indonésie":"id","Irak":"iq","Iran":"ir","Irlande":"ie","Israël":"il","Italie":"it",
  "Jamaïque":"jm","Jordanie":"jo","Kazakhstan":"kz","Kirghizistan":"kg","Kiribati":"ki","Koweït":"kw",
  "Laos":"la","Lesotho":"ls","Lettonie":"lv","Liban":"lb","Liberia":"lr","Libye":"ly","Liechtenstein":"li",
  "Lituanie":"lt","Luxembourg":"lu","Macao":"mo","Macédoine du Nord":"mk","Madagascar":"mg","Malaisie":"my",
  "Malawi":"mw","Maldives":"mv","Mali":"ml","Malte":"mt","Maroc":"ma","Maurice":"mu","Mauritanie":"mr",
  "Mexique":"mx","Micronésie":"fm","Moldavie":"md","Monaco":"mc","Mongolie":"mn","Monténégro":"me",
  "Mozambique":"mz","Namibie":"na","Nauru":"nr","Népal":"np","Nicaragua":"ni","Niger":"ne",
  "Nouvelle-Zélande":"nz","Ouganda":"ug","Ouzbékistan":"uz","Pakistan":"pk","Palaos":"pw","Panama":"pa",
  "Papouasie-Nouvelle-Guinée":"pg","Paraguay":"py","Pays-Bas":"nl","Pérou":"pe","Philippines":"ph",
  "Pologne":"pl","Portugal":"pt","Qatar":"qa","République Centrafricaine":"cf",
  "République Démocratique du Congo":"cd","République Dominicaine":"do","République du Congo":"cg",
  "République Tchèque":"cz","Roumanie":"ro","Russie":"ru","Rwanda":"rw","Saint-Kitts-et-Nevis":"kn",
  "Saint-Marin":"sm","Saint-Vincent-et-les-Grenadines":"vc","Sainte-Lucie":"lc","Salvador":"sv",
  "Samoa":"ws","São Tomé-et-Principe":"st","Sénégal":"sn","Serbie":"rs","Seychelles":"sc",
  "Sierra Leone":"sl","Slovaquie":"sk","Slovénie":"si","Somalie":"so","Soudan":"sd","Soudan du Sud":"ss",
  "Sri Lanka":"lk","Suède":"se","Suisse":"ch","Suriname":"sr","Syrie":"sy","Taïwan":"tw",
  "Tadjikistan":"tj","Tanzanie":"tz","Tchad":"td","Thaïlande":"th","Timor Oriental":"tl","Togo":"tg",
  "Tonga":"to","Trinité-et-Tobago":"tt","Tunisie":"tn","Turkménistan":"tm","Turquie":"tr","Tuvalu":"tv",
  "Ukraine":"ua","Uruguay":"uy","Vanuatu":"vu","Vatican":"va","Venezuela":"ve","Vietnam":"vn","Yémen":"ye",
};
// Liste triée des pays connus (ceux pour lesquels on a un drapeau) — utilisée pour la liste
// déroulante "Pays" dans la fiche projet, afin que le drapeau se mette à jour automatiquement et
// systématiquement dès qu'on choisit un pays dans la liste (demandé explicitement), plutôt que de
// dépendre d'un texte libre qui ne correspond pas toujours exactement à une clé de COUNTRY_ISO.
export const ALL_PAYS=Object.keys(COUNTRY_ISO).sort();
export function driftColor(drift){
  if(drift==null||drift<=0)return null; // pas de décalage ou en avance : pas de pastille
  if(drift<=5)return T.amber500;
  if(drift<=15)return T.ember500;
  return T.red500;
}
export function DriftDot({drift,size}){
  const c=driftColor(drift);
  if(!c)return null;
  const s=size||9;
  return <span title={"Décalage vs planning initial : +"+drift+"j"} style={{display:"inline-block",width:s,height:s,borderRadius:"50%",background:c,flexShrink:0,boxShadow:"0 0 0 2px #fff"}}/>;
}
export function PersonIcon({size,color}){
  const s=size||14;
  return(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
    <circle cx="12" cy="7.5" r="4.5" fill={color||"currentColor"}/>
    <path d="M4 21c0-4.42 3.58-8 8-8s8 3.58 8 8" fill={color||"currentColor"}/>
  </svg>);
}
// Présence aux tests — demandé : « choisir si c'est le client, le NOBO ou les 2 avec un système de
// couleur ». Une couleur par présence (client = violet, NOBO = vert) ; « les deux » combine les deux
// teintes (dégradé net 50/50) pour se lire d'un coup d'œil sans lire le texte. Getters : T est muté
// au changement de thème, une constante figée garderait les couleurs claires en mode sombre.
export const PRESENCE_KINDS=["client","nobo","both"];
// Teintes demandées « légères » : client = violet doux, NOBO = orange doux. « color » = liseré/accent
// (moyen), « bg » = fond pastel de la pastille, « ink » = texte foncé lisible sur le pastel (clair ou sombre).
export const PRESENCE_META={
  client:{key:"client",label:"Client",short:"Client",color:"#457B9D",bg:"#DCE8F0",ink:"#1F4A63"}, // v192 : bleu acier
  nobo:{key:"nobo",label:"NOBO",short:"NOBO",color:"#C1121F",bg:"#F6D9DB",ink:"#8A0F18"}, // v192 : rouge organisme
  both:{key:"both",label:"Client + NOBO",short:"Les deux",color:"#457B9D",color2:"#C1121F",bg:"#DCE8F0",bg2:"#F6D9DB",ink:"#1F4A63"},
};
// Anciennes saisies (« present:true » sans « who », faites avant ce choix) = les deux, comme
// l'ancien libellé « Client/NOBO présent » — aucune donnée n'est perdue ni réécrite.
export function presenceKind(cp){
  if(!cp||!cp.present)return null;
  return PRESENCE_KINDS.includes(cp.who)?cp.who:"both";
}
// v146.11 : une date pour le client ET une date pour NOBO. { present, who, dateClient, dateNobo } ; « date » (ancien champ, = la plus proche)
// reste renseigné pour les anciens affichages et sert de valeur de repli.
export function presenceDates(cp){
  if(!cp||!cp.present)return {};
  const k=presenceKind(cp),base=cp.date||"",o={};
  if(k==="client"||k==="both")o.client=cp.dateClient||base;
  if(k==="nobo"||k==="both")o.nobo=cp.dateNobo||base;
  return o;
}
export function presenceFirstDate(cp){return Object.values(presenceDates(cp)).filter(Boolean).sort()[0]||"";}
const fdmIso=d=>String(d).slice(8,10)+"/"+String(d).slice(5,7);
// « 21/10 » ou « C 21/10 · N 23/10 » quand les deux dates diffèrent
export function presenceDateText(cp){
  const d=presenceDates(cp),c=d.client,n=d.nobo;
  if(c&&n&&c!==n)return "C "+fdmIso(c)+" · N "+fdmIso(n);
  const one=c||n;return one?fdmIso(one):"";
}
// Type de présence (client / nobo / both) correspondant aux dates qui vérifient pred ; null si aucune
export function presenceKindAt(cp,pred){
  const d=presenceDates(cp),hit=["client","nobo"].filter(k=>d[k]&&pred(d[k]));
  return hit.length===2?"both":hit[0]||null;
}
export function presenceBg(kind){
  const m=PRESENCE_META[kind];
  return m.bg2?"linear-gradient(90deg,"+m.bg+" 0%,"+m.bg+" 50%,"+m.bg2+" 50%,"+m.bg2+" 100%)":m.bg;
}
// Ceinture de la tuile (calendrier) : un seul liseré plein, ou deux demi-liserés pour « les deux ».
export function presenceRing(kind){
  const m=PRESENCE_META[kind];
  return m.color2?"inset 4px 0 0 "+m.color+", inset -4px 0 0 "+m.color2:"inset 0 0 0 2px "+m.color;
}
// v192 (option 1 validée) : étiquette d'atelier — fond de carte, filet, liseré coloré à gauche (bleu acier = client,
// rouge = NOBO), icône (personne / bouclier), libellé et date ; « Client + NOBO » = deux étiquettes côte à côte.
function ShieldIcon({size,color}){
  return <svg width={size} height={size} viewBox="0 0 256 256" fill={color||"currentColor"} aria-hidden="true" style={{flexShrink:0}}><path d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z"/></svg>;
}
export function PresenceChip({kind,date,dates,compact,fontSize,tiny,short}){
  if(!kind)return null;
  const fs=fontSize||(compact?11:12);
  const parts=kind==="both"?["client","nobo"]:[kind];
  const dOf=k=>{const d=(dates&&dates[k])||date;return d?fdmIso(d):"";};
  const title="Présence "+PRESENCE_META[kind].label+" aux tests"+parts.map(k=>dOf(k)?" — "+PRESENCE_META[k].label+" le "+dOf(k):"").join("");
  return(<span title={title} style={{display:"inline-flex",alignItems:"center",gap:4,flexShrink:0}}>
    {parts.map(k=>{const m=PRESENCE_META[k],d=!compact&&!tiny?dOf(k):"";return(
      <span key={k} style={{display:"inline-flex",alignItems:"center",gap:4,background:T.card,color:T.ink900,border:"1px solid "+T.ink300,borderLeft:"4px solid "+m.color,borderRadius:3,padding:"0 6px 0 4px",fontFamily:T.fontLabel,fontSize:fs,fontWeight:600,lineHeight:(fs+6)+"px",whiteSpace:"nowrap"}}>
        {!short&&(k==="nobo"?<ShieldIcon size={fs+1} color={m.color}/>:<PersonIcon size={fs+1} color={m.color}/>)}{short?(k==="client"?"C":"N"):m.short}{d?" "+d:""}
      </span>);})}
  </span>);
}
// SVG vectoriel (plus la miniature PNG h20, qui devenait floue en l'agrandissant) — demandé
// explicitement ("les drapeaux à gauche ne sont pas assez clairs") : flagcdn fournit le même
// drapeau en vecteur net à n'importe quelle taille, sans changer de fournisseur ni ajouter de
// dépendance.
export function CountryFlag({pays,size}){
  const iso=COUNTRY_ISO[pays];
  const h=size||14;
  if(!iso)return null;
  return <img src={"https://flagcdn.com/"+iso+".svg"} alt={pays} style={{height:h,width:"auto",minWidth:h*1.3,borderRadius:4,verticalAlign:"middle",boxShadow:"0 0 0 1px rgba(0,0,0,.06)",background:T.surfaceAlt,objectFit:"cover"}}
    onError={e=>{e.target.style.display="none";}}/>;
}

// Palette de gammes volontairement sourdes (tons rompus plutôt que couleurs vives) pour un rendu plus classe, à
// l'identique en clair/sombre puisqu'utilisée uniquement comme petit point indicateur, jamais en aplat.
// v177 : gammes sur la nouvelle palette.
export const GAMME_COLORS={"180LTV3":"#0D3B66","180MT":"#A8D5E2","100LTV3":"#FFD449","40LTV2R":"#EE964B","100MT":"#548C2F","40LTV3":"#F9A620","20LTV3":"#F95738","10LTV3":"#104911","100LTV2R":"#F4D35E","CONTENEUR":"#8A97A6"};
// Couleurs d'état sensibles au thème : T est muté en place au changement de mode, mais un objet figé
// à l'import garderait les valeurs claires — d'où les accesseurs (lus à chaque rendu). En sombre : fonds
// teintés très foncés + texte clair, au lieu des pastels clairs qui éblouissaient.
// v164 : couleur d'état utilisable comme TEXTE sur une carte (clair : encre foncée de la teinte ; sombre : teinte éclaircie).
export const etatInk=etat=>{const m=ETAT_META[etat]||ETAT_META["NOT ORDERED"];return T.mode==="dark"?m.bar:m.text;};
const etatThemed=(light,dark,label)=>({
  get bg(){return(T.mode==="dark"?dark:light).bg;},
  get text(){return(T.mode==="dark"?dark:light).text;},
  get border(){return(T.mode==="dark"?dark:light).border;},
  get bar(){return T.mode==="dark"?dark.bar:mixHex(light.bar,T.card,.06);}, // v144 : point et camembert plus doux en clair
  label,
});
// v177 : outils de contraste remontés ici — ETAT_META les utilise dès le chargement (via etatColors).
const lum=h=>{const p=String(h).replace("#","");const c=[0,2,4].map(i=>parseInt(p.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2];};
export const contrastRatio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const readable=(color,bg,toward)=>{for(let t=.3;t<=1.001;t+=.05){const c=mixHex(color,toward,t);if(contrastRatio(c,bg)>=4.6)return c;}return toward;};
// v192 : en sombre, la barre / le point d'état est éclairci jusqu'à 3:1 sur la surface sombre (un marine foncé disparaissait).
const visibleOn=(color,bg)=>{for(let t=.12;t<=1.001;t+=.04){const c=mixHex(color,"#ffffff",t);if(contrastRatio(c,bg)>=3)return c;}return "#ffffff";};
export function etatColors(color){
  const c=/^#[0-9a-f]{6}$/i.test(color||"")?color:"#6b7f99";
  const lbg=mixHex(c,"#ffffff",.8),dbg=mixHex(c,"#101826",.64);
  return{light:{bg:lbg,text:readable(c,lbg,"#000000"),border:mixHex(c,"#ffffff",.5),bar:c},dark:{bg:dbg,text:readable(c,dbg,"#ffffff"),border:mixHex(c,"#101826",.3),bar:visibleOn(c,"#1C2536")}};
}
const etatFromColor=(c,label)=>{const k=etatColors(c);const o=etatThemed(k.light,k.dark,label);Object.defineProperty(o,"base",{value:c});return o;};
export const ETAT_META={
  // v162 : palette B (teintes franches : fond = 18 % de la couleur en clair, point/liseré = couleur pleine). Ancien : v146.10 : teintes plus soutenues (fonds, liserés et texte un cran plus foncés). « Production ENOGIA » est remplacée par les 4 étapes de production.
  // v177 : nouvelle palette (Regal Navy, Light Blue, Royal Gold, Forest Green, Black Forest, Sandy Brown, Mustard, Tomato, Orange) — dérivée par etatColors().
  // v192 (palette A validée) : rouge / lilas / orange brûlé avant production, bleus pour le montage, or pour les tests, sarcelle puis vert foncé pour la fin.
  "SHIPPED":etatFromColor("#2D6A4F","Expédiée"),
  "MONTAGE":etatFromColor("#1D3557","Montage Méca"),
  "ELEC":etatFromColor("#48CAE4","Montage Élec"),
  "TESTS":etatFromColor("#FFB703","Tests"),
  "PACKAGING":etatFromColor("#2A9D8F","Packaging"),
  "En fabrication":etatFromColor("#E76F51","Fabrication/Montage Fournisseurs"), // v228 / v230 (demandé) : l’ORC (armoire et skid) est fabriqué / monté chez les fournisseurs
  "STOCKAGE_EXT":etatFromColor("#8D99AE","Stockage Externe"),
  "NOT ORDERED":etatFromColor("#D62839","Non commandée"),
  "NON_DESIGNEE":etatFromColor("#C77DFF","Design en cours"), // v228 (demandé) : design de l’ORC pas complètement défini, commande impossible
  "SLOT_LIBRE":etatFromColor("#CED4DA","Slot libre"),
  "A_DEFINIR":{get bg(){return T.surfaceAlt;},get text(){return T.ink500;},get border(){return T.ink100;},get bar(){return T.ink300;},label:"À définir"},
};
export const ALL_ETATS=Object.keys(ETAT_META);
// ── v230 (demandé : « pouvoir modifier les états existants ») : nom, couleur et explication des états intégrés, modifiables par les
// admins (Gérer les états). Stockés dans planning/overrides.etatEdits : { [id]: { label, color, desc } } ; « Rétablir » revient à l'origine.
const ETAT_ORIG={...ETAT_META};
export const ETAT_EDITS={};
export const etatOrig=id=>ETAT_ORIG[id]?{label:ETAT_ORIG[id].label,color:ETAT_ORIG[id].base||""}:null;
export function registerEtatEdits(map){
  Object.keys(ETAT_EDITS).forEach(k=>{delete ETAT_EDITS[k];ETAT_META[k]=ETAT_ORIG[k];});
  Object.entries(map&&typeof map==="object"?map:{}).forEach(([id,e])=>{
    const o=ETAT_ORIG[id];if(!o||!o.base||!e)return;
    const label=String(e.label||"").trim()||o.label,color=/^#[0-9a-f]{6}$/i.test(e.color||"")?e.color:o.base;
    ETAT_META[id]=etatFromColor(color,label);ETAT_EDITS[id]={label:String(e.label||"").trim(),color:e.color||"",desc:String(e.desc||"").trim()};
  });
}
export const ASSIGNABLE_ETATS=ALL_ETATS.filter(e=>e!=="A_DEFINIR");

// ── v146.18 : états créés par l'utilisateur (Manager › Réglages › États). Stockés dans planning/overrides.customEtats : [{id,label,color}].
// ETAT_META / ALL_ETATS / ASSIGNABLE_ETATS sont complétés sur place : tous les écrans qui les lisent voient les nouveaux états.
let CUSTOM_IDS=[];
export function registerCustomEtats(list){
  CUSTOM_IDS.forEach(id=>{delete ETAT_META[id];});
  CUSTOM_IDS=[];
  (Array.isArray(list)?list:[]).forEach(e=>{
    if(!e||!e.id||!e.label||ETAT_META[e.id])return;
    const k=etatColors(e.color);ETAT_META[e.id]=etatThemed(k.light,k.dark,String(e.label));CUSTOM_IDS.push(e.id);
  });
  ALL_ETATS.length=0;Object.keys(ETAT_META).forEach(k=>ALL_ETATS.push(k));
  ASSIGNABLE_ETATS.length=0;ALL_ETATS.filter(e=>e!=="A_DEFINIR").forEach(k=>ASSIGNABLE_ETATS.push(k));
  return[...CUSTOM_IDS];
}
export const isCustomEtat=id=>CUSTOM_IDS.includes(id);

// Bloc "Projet" partagé entre le Gantt et le Calendrier (demandé explicitement : "je dois avoir les
// même type de projet entre le gantt et le calendrier ça doit être un copier coller") — un seul
// composant utilisé aux deux endroits évite que les deux colonnes ne puissent plus diverger par la
// suite. Pastille = couleur de l'État (comme la liste), pas la couleur cyclique par machine.
// Numéro de série de la machine (saisi dans Manager › Réglages › N° de série, champ numSerie de la fiche projet).
// Étiquette discrète affichée à côté du numéro de PJ partout où il apparaît ; rien si non renseigné.
export function SerieTag({pj,size=10.5,style}){
  const n=(getPjMeta(pj)||{}).numSerie;
  if(!n)return null;
  return <span title={"N° de série : "+n} style={{display:"inline-block",fontVariantNumeric:"tabular-nums",fontSize:size,fontWeight:600,color:T.ink500,background:T.surfaceAlt,borderRadius:4,padding:"0 6px",lineHeight:"17px",whiteSpace:"nowrap",flexShrink:1,minWidth:0,maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",...style}}>S/N {n}</span>;
}
// v173-v176 : plaque de n° de PJ (plaque signalétique de machine) — police d'identifiant ; v176 : fond clair + filet au lieu du marine plein (jugé « bizarre »).
export function PjPlate({pj,size="sm",style}){
  return <span className="enogia-plate" style={{fontFamily:T.fontDisplay,fontWeight:800,fontSize:size==="lg"?15:13,lineHeight:1,letterSpacing:".02em",background:T.surfaceAlt,color:T.ink900,border:"1px solid "+T.line,padding:size==="lg"?"5px 8px":"3px 7px",borderRadius:3,whiteSpace:"nowrap",display:"inline-block",flexShrink:0,fontVariantNumeric:"tabular-nums",...style}}>{pj}</span>;
}
export function ProjectLabelCell({pj,r,meta,mark}){
  const c=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
  // Le numéro de PJ et le nom du projet doivent TOUJOURS être lisibles (demandé explicitement) :
  // 1re ligne = pastille d'état + code + gamme, 2e ligne = drapeau + nom du projet sur toute la largeur
  // (la gamme n'est plus collée au nom, c'est elle qui faisait tronquer le nom). Infobulle = nom complet.
  // v146.13 : 3 lignes, plus rien n'est tronqué — la colonne s'élargit au besoin (voir LEFT_W du Calendrier).
  // Ligne 1 = pastille + code PJ + gamme + repère « modifié » ; ligne 2 = drapeau + nom du projet en entier ; ligne 3 = N° de série.
  const sn=(meta&&meta.numSerie)||(getPjMeta(pj)||{}).numSerie;
  return(<>
    <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
      {/* v174 : n° de PJ en plaque, liseré intérieur à la couleur de l'état (remplace la pastille ronde). */}
      <PjPlate pj={pj} style={{boxShadow:"inset 3px 0 0 "+c.bar,paddingLeft:9}}/>
      {r.gamme&&<span className="enogia-hide-phone" title={"Gamme "+r.gamme} style={{fontSize:FZ.xs,fontWeight:700,color:T.ink700,background:T.surfaceAlt,borderRadius:4,padding:"0 6px",lineHeight:"16px",whiteSpace:"nowrap",flexShrink:0}}>{r.gamme}</span>}
      {mark&&<span style={{marginLeft:"auto",flexShrink:0}}>{mark}</span>}
    </div>
    <div title={meta.nomProjet||""} style={{display:"flex",alignItems:"center",gap:6,paddingLeft:15,minWidth:0}}>
      <CountryFlag pays={meta.pays} size={11}/>
      <span style={{fontSize:FZ.xs,fontWeight:500,color:T.ink700,whiteSpace:"nowrap",minWidth:0,overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.25}}>{meta.nomProjet}</span>
    </div>
    {sn&&<div style={{paddingLeft:15,fontVariantNumeric:"tabular-nums",fontSize:11,fontWeight:600,color:T.ink500,whiteSpace:"nowrap",lineHeight:1.2}}>S/N {sn}</div>}
  </>);
}
export const ALL_GAMMES=Object.keys(GAMME_COLORS);
export const MONTHS=["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
export const MONTHS_FULL=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
export const today=new Date();
// Machines livrées depuis le 1er janvier (calcul automatique : départ passé dans l'année en cours).
export function countShippedYTD(rows){
  const y=today.getFullYear();
  return rows.filter(r=>r.depart&&new Date(r.depart).getFullYear()===y&&new Date(r.depart)<=today).length;
}


// Noms à ne plus proposer dans les listes de choix "Chef de projet" (référentiel/synchro obsolète),
// demandé explicitement — ne touche pas les projets déjà assignés à ces noms, seulement ce qu'on
// propose désormais au choix (EditMetaForm garde une option de secours pour la valeur déjà en place
// si jamais elle n'est plus dans la liste).
// Comparaison normalisée (accents/casse/espaces) : "Clément Bablon" était toujours visible après une
// première exclusion littérale — la valeur synchronisée depuis Suivi ORC ne correspondait
// probablement pas caractère pour caractère (accent, casse ou espace différents).
function normChefName(s){
  return(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim().replace(/\s+/g," ");
}
const EXCLUDED_CHEFS_NORM=new Set(["CMA","Clément Bablon"].map(normChefName));
export const EXCLUDED_CHEFS={has:name=>EXCLUDED_CHEFS_NORM.has(normChefName(name))};

// Liste des chefs de projet connus (prénom + nom), pour une liste déroulante dans la fiche
// projet plutôt qu'un champ texte libre — fusionne le référentiel figé, la synchro Suivi ORC
// et les corrections manuelles, donc fonction (pas une const) puisque ces deux dernières sources
// changent en cours de session.
// v191 : plusieurs chefs de projet par PJ (chefProjet + chefsExtra) et projet EPC (epc) avec son chef de projet ORC (chefOrc).
const clean=c=>{const v=String(c||"").trim();return v&&v!=="—"?v:"";};
// v197 (demandé) : projet EPC avec un chef de projet ORC → c'est lui qui figure dans les listes et regroupements, à la place du chef classique.
export function chefsOf(meta){const m=meta||{},orc=m.epc?clean(m.chefOrc):"";const out=[orc||clean(m.chefProjet),...(Array.isArray(m.chefsExtra)?m.chefsExtra.map(clean):[])].filter(Boolean);return [...new Set(out)];}
export const isEpc=meta=>!!(meta&&meta.epc);
export function EpcTag({meta,short}){
  if(!isEpc(meta))return null;
  const orc=clean(meta.chefOrc);
  return <span title={"Projet EPC"+(orc?" · chef de projet ORC : "+orc:"")} style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:T.fontLabel,fontSize:11,fontWeight:700,lineHeight:"16px",padding:"0 6px",borderRadius:4,background:T.violet100,color:T.violet600,border:"1px solid "+T.violet500,whiteSpace:"nowrap",flexShrink:0}}>EPC{!short&&orc?<span style={{fontWeight:500}}>· {orc}</span>:null}</span>;
}
export function getAllChefs(){
  const set=new Set();
  [PJ_META,SYNCED_PJ_META,PJ_META_OVERRIDES].forEach(src=>Object.values(src).forEach(m=>{chefsOf(m).forEach(c=>set.add(c));}));
  return [...set].filter(c=>!EXCLUDED_CHEFS.has(c)).sort();
}

export function setSyncedPjMeta(v){ SYNCED_PJ_META = v || {}; }
