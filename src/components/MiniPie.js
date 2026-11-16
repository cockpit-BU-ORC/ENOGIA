// v289 (lot G « rapidité ») : petit camembert de la vue d'ensemble de la Liste, chargé seulement quand on déplie
// « Répartitions » (la bibliothèque de graphiques ne fait plus partie du paquet de départ).
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { T, FZ } from "../theme";
import { chartAnim } from "../scrollMode";

export default function MiniPie({ pie, di }) {
  return (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie {...chartAnim()} data={pie} dataKey="value" nameKey="name" innerRadius={22} outerRadius={37} paddingAngle={pie.length>1?2:0} stroke="none" isAnimationActive={true} animationBegin={120+di*120} animationDuration={600} animationEasing="ease-out">
                    {pie.map(x=><Cell key={x.name} fill={x.color}/>)}
                  </Pie>
                  <Tooltip content={({active,payload})=>{
                    if(!active||!payload||!payload.length)return null;const p=payload[0];
                    return(<div style={{background:T.card,border:"1px solid "+T.line,borderRadius:8,padding:"4px 8px",fontSize:FZ.xs,fontFamily:T.font,color:T.ink900,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{width:7,height:7,borderRadius:4,background:p.payload&&p.payload.color,flexShrink:0}}/><span>{p.name}</span><strong>{p.value}</strong>
                    </div>);
                  }}/>
                </PieChart>
              </ResponsiveContainer>
  );
}
