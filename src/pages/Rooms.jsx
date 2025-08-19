import React,{useEffect,useState} from 'react'
import Layout from '../layout/Layout'
import { supabase } from '../lib/supabase'
export default function Rooms(){
  const [rooms,setRooms]=useState([])
  const [form,setForm]=useState({code:'',floor:'',notes:''})
  useEffect(()=>{load()},[])
  async function load(){ const { data } = await supabase.from('rooms').select('*').order('code',{ascending:true}); setRooms(data||[]) }
  async function addRoom(e){ e.preventDefault(); await supabase.from('rooms').insert(form); setForm({code:'',floor:'',notes:''}); await load() }
  return (<Layout>
    <div className="flex items-center justify-between mb-3"><div className="text-lg font-semibold">Quartos cadastrados</div></div>
    <form onSubmit={addRoom} className="bg-white border rounded-2xl p-4 shadow-sm mb-4 grid gap-3 md:grid-cols-3">
      <input className="border rounded-lg px-3 py-2" placeholder="Código (ex: 101)" value={form.code} onChange={e=>setForm({...form,code:e.target.value})} required/>
      <input className="border rounded-lg px-3 py-2" placeholder="Andar" value={form.floor} onChange={e=>setForm({...form,floor:e.target.value})}/>
      <input className="border rounded-lg px-3 py-2 md:col-span-1" placeholder="Observações" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
      <button className="bg-slate-900 text-white rounded-lg px-3 py-2 md:col-span-3 w-full md:w-auto">Adicionar quarto</button>
    </form>
    <div className="rounded-2xl overflow-hidden border bg-white shadow-sm">
      <table className="w-full text-sm"><thead className="bg-slate-50 text-slate-600">
        <tr><th className="text-left p-3">Código</th><th className="text-left p-3">Andar</th><th className="text-left p-3">Observações</th></tr></thead>
        <tbody>{rooms.map(r=>(<tr key={r.id} className="border-b last:border-0"><td className="p-3 font-medium">{r.code}</td><td className="p-3">{r.floor}</td><td className="p-3">{r.notes||'—'}</td></tr>))}</tbody>
      </table></div></Layout>)
}
