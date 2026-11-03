// v261 : sorti de App.js — filtres de la Liste (état, options proposées, calcul de la liste filtrée). Même code qu'avant.
import { useState } from "react";
import { getPjMeta, chefsOf, ALL_GAMMES, ALL_ETATS, MONTHS, EXCLUDED_CHEFS } from "./pjMeta";

export function useListFilters(){
  const [selEtats,setSelEtats]=useState(new Set(ALL_ETATS.filter(e=>e!=="SLOT_LIBRE"&&e!=="SHIPPED"))); // slots libres et machines expédiées masqués de base (à cocher dans le filtre État)
  const [selGammes,setSelGammes]=useState(new Set(ALL_GAMMES));
  const [selMoisArrivee,setSelMoisArrivee]=useState(new Set(MONTHS));
  const [selMoisTests,setSelMoisTests]=useState(new Set(MONTHS));
  const [selMoisFinProd,setSelMoisFinProd]=useState(new Set(MONTHS));
  const [selMoisDepart,setSelMoisDepart]=useState(new Set(MONTHS));
  const [selPJs,setSelPJs]=useState(null);
  const [selProjets,setSelProjets]=useState(null);
  const [selPays,setSelPays]=useState(null);
  const [selChefs,setSelChefs]=useState(null);
  const [onlyDrift,setOnlyDrift]=useState(false); // v126 : « En dérive seulement » (départ plus tard que dans le planning initial)
  return {selEtats,setSelEtats,selGammes,setSelGammes,selMoisArrivee,setSelMoisArrivee,selMoisTests,setSelMoisTests,selMoisFinProd,setSelMoisFinProd,selMoisDepart,setSelMoisDepart,selPJs,setSelPJs,selProjets,setSelProjets,selPays,setSelPays,selChefs,setSelChefs,onlyDrift,setOnlyDrift};
}

// Valeurs proposées dans les filtres (PJ, projets, pays, chefs de projet)
export function filterOptions(data){
  const allPJs=[...new Set(data.map(r=>r.pj))].sort();
  const allProjets=[...new Set(data.map(r=>getPjMeta(r.pj,r).nomProjet))].sort();
  const allPays=[...new Set(data.map(r=>getPjMeta(r.pj,r).pays))].sort();
  // Mêmes noms exclus que dans le sélecteur d'édition (demandé explicitement : "enlever CMA et Clément Bablon du choix du chef
  // de projet") — n'affecte que la liste proposée au filtre, pas les projets déjà assignés à ces noms.
  const allChefs=[...new Set(data.map(r=>getPjMeta(r.pj,r).chefProjet))].filter(c=>!EXCLUDED_CHEFS.has(c)).sort();
  return {allPJs,allProjets,allPays,allChefs};
}

// f : sélections en cours ; changeMarks : repères « modifié » (filtre « Modifiés seulement »)
export function filterRows(rows,f,changeMarks){
  const {selEtats,selGammes,selPJs,selProjets,selPays,selChefs,onlyDrift,onlyChanged,selMoisArrivee,selMoisTests,selMoisFinProd,selMoisDepart}=f;
  return rows.filter(r=>{
    if(!selEtats.has(r.etat))return false;
    if(r.etat!=="SLOT_LIBRE"&&!selGammes.has(r.gamme))return false;
    if(selPJs&&!selPJs.has(r.pj))return false;
    const meta=getPjMeta(r.pj,r);
    if(selProjets&&!selProjets.has(meta.nomProjet))return false;
    if(selPays&&!selPays.has(meta.pays))return false;
    if(selChefs&&!(selChefs.has(meta.chefProjet)||chefsOf(meta).some(c=>selChefs.has(c))))return false; // v191 : tous les chefs du PJ
    if(onlyDrift&&!(r.drift>0))return false;
    if(onlyChanged&&!changeMarks.marks.has(r.pj))return false;
    if(selMoisArrivee.size<MONTHS.length){const m=r.arrivee?MONTHS[new Date(r.arrivee).getMonth()]:null;if(!m||!selMoisArrivee.has(m))return false;}
    if(selMoisTests.size<MONTHS.length){const m=r.tests?MONTHS[new Date(r.tests).getMonth()]:null;if(!m||!selMoisTests.has(m))return false;}
    if(selMoisFinProd.size<MONTHS.length){const m=r.finProd?MONTHS[new Date(r.finProd).getMonth()]:null;if(!m||!selMoisFinProd.has(m))return false;}
    if(selMoisDepart.size<MONTHS.length){const m=r.depart?MONTHS[new Date(r.depart).getMonth()]:null;if(!m||!selMoisDepart.has(m))return false;}
    return true;
  });
}
