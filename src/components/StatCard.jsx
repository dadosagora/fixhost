import React from 'react'
export default function StatCard({title,value,hint}){
  return (<div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="text-sm text-slate-500">{title}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
    {hint&&<div className="text-xs text-slate-500 mt-1">{hint}</div>}
  </div>)
}
