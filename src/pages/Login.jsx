import React,{useState} from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'   // NOVO

export default function Login(){
  const [username,setUsername]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const navigate = useNavigate()                 // NOVO

  const onSubmit=async(e)=>{
    e.preventDefault(); setLoading(true); setError('')
    const email = `${username}@hotel.local`.toLowerCase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate('/')                               // NOVO: vai para o Dashboard
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded-2xl shadow-sm w-full max-w-sm space-y-4 border">
        <div className="text-lg font-semibold">Entrar</div>
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded">{error}</div>}
        <div className="space-y-1">
          <label className="text-sm text-slate-600">Usuário</label>
          <input value={username} onChange={e=>setUsername(e.target.value.trim())} className="w-full border rounded-lg px-3 py-2" placeholder="ex.: admin" required />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600">Senha</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="********" required />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white rounded-lg py-2 hover:opacity-90 disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
