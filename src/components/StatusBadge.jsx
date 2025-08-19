import React from 'react'
const MAP={ em_aberto:{label:'Em aberto',bg:'bg-red-100',fg:'text-red-700'},
em_processamento:{label:'Em processamento',bg:'bg-yellow-100',fg:'text-yellow-800'},
resolvido:{label:'Resolvido',bg:'bg-green-100',fg:'text-green-700'} }
export default function StatusBadge({status}){
  const s=MAP[status]||MAP.em_aberto
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.fg}`}>{s.label}</span>
}
