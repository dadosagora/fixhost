import React,{useEffect,useState} from 'react'
import Layout from '../layout/Layout'
import { supabase } from '../lib/supabase'
export default function Users(){
  const [users,setUsers]=useState([])
  const [form,setForm]=useState({name:'',role:'inspetor',id:'',username:''})
  useEffect(()=>{load()},[])
  async function load(){ const { data } = await supabase.from('app_users').select('*').order('name',{ascending:true}); setUsers(data||[]) }
  async function addUser(e){ e.preventDefault(); if(!form.id||!form.username) return; await supabase.from('app_users').insert(form); setForm({name:'',role:'inspetor',id:'',username:''}); await load() }
  return (<Layout>
    <div className="flex items-center justify-between mb-3"><div className="text-lg font-semibold">Usuários</div></div>
    <form onSubmit={addUser} className="bg-white border rounded-2xl p-4 shadow-sm mb-4 grid gap-3 md:grid-cols-5">
      <input className="border rounded-lg px-3 py-2" placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
      <select className="border rounded-lg px-3 py-2" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
        <option value="inspetor">inspetor</option><option value="manutencao">manutencao</option><option value="gestor">gestor</option>
      </select>
      <input className="border rounded-lg px-3 py-2" placeholder="Usuário (ex: joao)" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required/>
      <input className="border rounded-lg px-3 py-2" placeholder="UUID (Authentication → Users)" value={form.id} onChange={e=>setForm({...form,id:e.target.value})} required/>
      <button className="bg-slate-900 text-white rounded-lg px-3 py-2">Adicionar</button>
    </form>
    <div className="rounded-2xl overflow-hidden border bg-white shadow-sm">
      <table className="w-full text-sm"><thead className="bg-slate-50 text-slate-600">
        <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Usuário</th><th className="text-left p-3">Papel</th><th className="text-left p-3">UUID</th></tr></thead>
        <tbody>{users.map(u=>(<tr key={u.id} className="border-b last:border-0">
          <td className="p-3 font-medium">{u.name}</td><td className="p-3">{u.username||'—'}</td><td className="p-3">{u.role}</td><td className="p-3 text-xs">{u.id}</td>
        </tr>))}</tbody></table>
    </div></Layout>)
}
