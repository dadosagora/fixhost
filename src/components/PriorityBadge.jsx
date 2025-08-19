import React from 'react'
const MAP={ baixa:{label:'Baixa',bg:'bg-slate-100',fg:'text-slate-700'},
media:{label:'Média',bg:'bg-amber-100',fg:'text-amber-800'},
alta:{label:'Alta',bg:'bg-rose-100',fg:'text-rose-700'} }
export default function PriorityBadge({value}){
  const p=MAP[value]||MAP.baixa
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.bg} ${p.fg}`}>{p.label}</span>
}
