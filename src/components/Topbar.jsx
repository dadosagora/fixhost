import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
export default function Topbar(){
  const { profile } = useAuth()
  return (<div className="h-14 border-b bg-white flex items-center px-4 gap-3 sticky top-0 z-30">
    <div className="font-semibold">🏨 Hotel — Manutenções</div>
    <div className="text-slate-400">/</div><div className="text-slate-600">MVP</div>
    <div className="ml-auto flex items-center gap-3">
      <div className="text-sm text-slate-600">{profile?`${profile.name} • ${profile.role}`:''}</div>
      <button onClick={()=>supabase.auth.signOut()} className="border px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50">Sair</button>
    </div></div>)
}
