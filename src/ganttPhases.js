// v350 (audit de performance) : jalons du Gantt dans un petit module — la fenêtre projet les importait depuis GanttView, ce qui
// chargeait tout le Gantt au démarrage.
import { ganttSoft, stageSoft } from "./theme";

export const PHASES=[
  // v144 : pastel. c = trait doux (anneau, liseré), bg = aplat clair, ink = texte foncé. Pas de rouge : réservé au retard.
  {k:"arrivee",l:"A",get c(){return ganttSoft().arrivee.ring;},get bg(){return ganttSoft().arrivee.bg;},get ink(){return ganttSoft().arrivee.ink;},get tbg(){return stageSoft().arrivee.bg;},get tink(){return stageSoft().arrivee.ink;},t:"Arrivée"},
  {k:"tests",l:"T",get c(){return ganttSoft().tests.ring;},get bg(){return ganttSoft().tests.bg;},get ink(){return ganttSoft().tests.ink;},get tbg(){return stageSoft().tests.bg;},get tink(){return stageSoft().tests.ink;},t:"Tests"},
  {k:"finProd",l:"F",get c(){return ganttSoft().finProd.ring;},get bg(){return ganttSoft().finProd.bg;},get ink(){return ganttSoft().finProd.ink;},get tbg(){return stageSoft().finProd.bg;},get tink(){return stageSoft().finProd.ink;},t:"Fin prod"},
  {k:"depart",l:"D",get c(){return ganttSoft().depart.ring;},get bg(){return ganttSoft().depart.bg;},get ink(){return ganttSoft().depart.ink;},get tbg(){return stageSoft().depart.bg;},get tink(){return stageSoft().depart.ink;},t:"Départ"},
];
