import React,{useEffect,useMemo,useState} from 'react'
import Layout from '../layout/Layout'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
const CATS=['Elétrica','Hidráulica','Mobiliário','Climatização','Limpeza','Outros']
export default function Tickets(){
  const [tickets,setTickets]=useState([])
  const [rooms,setRooms]=useState([])
  const [filter,setFilter]=useState({q:'',status:'todos',priority:'todas'})
  const [creating,setCreating]=useState(false)
  const [detail,setDetail]=useState(null)
  const [form,setForm]=useState({room_id:'',category:CATS[0],priority:'media',title:'',description:''})
  const [comment,setComment]=useState('')
  useEffect(()=>{load()},[])
  async function load(){ const { data:rooms }=await supabase.from('rooms').select('*').order('code',{ascending:true}); setRooms(rooms||[])
    const { data:tickets }=await supabase.from('tickets').select('*').order('created_at',{ascending:false}); setTickets(tickets||[]) }
  const filtered=useMemo(()=>tickets.filter(t=>{
      const matchQ=(t.title+t.description+t.category).toLowerCase().includes(filter.q.toLowerCase())
      const matchS=filter.status==='todos'?true:t.status===filter.status
      const matchP=filter.priority==='todas'?true:t.priority===filter.priority
      return matchQ&&matchS&&matchP
  }),[tickets,filter])
  async function createTicket(e){
    e.preventDefault(); if(!form.room_id) return
    const dueHours=form.priority==='alta'?24:form.priority==='media'?48:72
    const user=(await supabase.auth.getUser()).data.user
    const { error } = await supabase.from('tickets').insert({...form,created_by:user.id,status:'em_aberto',due_at:new Date(Date.now()+dueHours*3600*1000).toISOString()})
    if(!error){ setCreating(false); setForm({room_id:'',category:CATS[0],priority:'media',title:'',description:''}); await load() }
  }
  async function updateStatus(ticket,newStatus){
    const { error } = await supabase.from('tickets').update({status:newStatus,closed_at:newStatus==='resolvido'?new Date().toISOString():null}).eq('id',ticket.id)
    if(!error){ await supabase.from('ticket_updates').insert({ticket_id:ticket.id,old_status:ticket.status,new_status:newStatus,comment:newStatus==='resolvido'?'Resolvido':'Status atualizado',created_by:(await supabase.auth.getUser()).data.user.id}); await load(); setDetail(null) }
  }
  async function addUpdate(ticket){ if(!comment) return; await supabase.from('ticket_updates').insert({ticket_id:ticket.id,comment,created_by:(await supabase.auth.getUser()).data.user.id}); setComment('') }
  return (<Layout>
    {!creating && !detail && (<div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <div className="flex items-center gap-2 w-full md:w-1/2">
          <input className="border rounded-lg px-3 py-2 w-full" placeholder="Buscar por título ou descrição" value={filter.q} onChange={e=>setFilter({...filter,q:e.target.value})}/>
        </div>
        <div className="flex items-center gap-2">
          <select className="border rounded-lg px-3 py-2" value={filter.status} onChange={e=>setFilter({...filter,status:e.target.value})}>
            <option value="todos">Todos os status</option><option value="em_aberto">Em aberto</option><option value="em_processamento">Em processamento</option><option value="resolvido">Resolvido</option>
          </select>
          <select className="border rounded-lg px-3 py-2" value={filter.priority} onChange={e=>setFilter({...filter,priority:e.target.value})}>
            <option value="todas">Todas prioridades</option><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
          </select>
          <button onClick={()=>setCreating(true)} className="bg-slate-900 text-white rounded-lg px-3 py-2">Novo chamado</button>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden border bg-white shadow-sm"><div className="overflow-x-auto">
        <table className="w-full text-sm"><thead className="bg-slate-50 text-slate-600">
          <tr><th className="text-left p-3">ID</th><th className="text-left p-3">Quarto</th><th className="text-left p-3">Título</th><th className="text-left p-3">Categoria</th><th className="text-left p-3">Prioridade</th><th className="text-left p-3">Status</th><th className="text-left p-3">Aberto em</th><th className="text-right p-3">Ações</th></tr>
        </thead><tbody>
          {filtered.map(t=>(<tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
            <td className="p-3">#{t.id}</td>
            <td className="p-3 font-medium">{rooms.find(r=>r.id===t.room_id)?.code||'—'}</td>
            <td className="p-3">{t.title||'—'}</td><td className="p-3">{t.category}</td>
            <td className="p-3"><PriorityBadge value={t.priority}/></td>
            <td className="p-3"><StatusBadge status={t.status}/></td>
            <td className="p-3">{new Date(t.created_at).toLocaleString()}</td>
            <td className="p-3 text-right">
              <div className="flex gap-2 justify-end">
                <button className="border rounded-lg px-3 py-1.5 text-sm" onClick={()=>setDetail(t)}>Ver</button>
                <button className="border rounded-lg px-3 py-1.5 text-sm" onClick={()=>updateStatus(t,'em_processamento')}>Processar</button>
                <button className="border rounded-lg px-3 py-1.5 text-sm" onClick={()=>updateStatus(t,'resolvido')}>Resolver</button>
              </div>
            </td>
          </tr>))}
        </tbody></table></div></div>
    </div>)}
    {creating && (<form onSubmit={createTicket} className="bg-white border rounded-2xl p-4 shadow-sm space-y-4">
      <div className="text-lg font-semibold">Novo chamado</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-sm text-slate-600">Quarto</label>
          <select className="border rounded-lg px-3 py-2 w-full" value={form.room_id} onChange={e=>setForm({...form,room_id:Number(e.target.value)})} required>
            <option value="">Selecione...</option>
            {rooms.map(r=><option key={r.id} value={r.id}>{r.code} — andar {r.floor}</option>)}
          </select></div>
        <div className="space-y-1"><label className="text-sm text-slate-600">Categoria</label>
          <select className="border rounded-lg px-3 py-2 w-full" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
            {CATS.map(c=><option key={c} value={c}>{c}</option>)}
          </select></div>
        <div className="space-y-1"><label className="text-sm text-slate-600">Prioridade</label>
          <select className="border rounded-lg px-3 py-2 w-full" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
            <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
          </select></div>
        <div className="space-y-1"><label className="text-sm text-slate-600">Título (opcional)</label>
          <input className="border rounded-lg px-3 py-2 w-full" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ex: Tomada solta"/>
        </div>
        <div className="md:col-span-2 space-y-1"><label className="text-sm text-slate-600">Descrição</label>
          <textarea rows={4} className="border rounded-lg px-3 py-2 w-full" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required/>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="border rounded-lg px-3 py-2" onClick={()=>setCreating(false)}>Cancelar</button>
        <button className="bg-slate-900 text-white rounded-lg px-3 py-2">Salvar chamado</button>
      </div>
    </form>)}
    {detail && (<div className="space-y-4">
      <button className="text-slate-600 underline" onClick={()=>setDetail(null)}>← Voltar</button>
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3"><div className="text-lg font-semibold">Chamado #{detail.id}</div><StatusBadge status={detail.status}/></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><div className="text-xs text-slate-500">Categoria</div><div className="font-medium">{detail.category}</div></div>
          <div><div className="text-xs text-slate-500">Prioridade</div><div className="font-medium"><PriorityBadge value={detail.priority}/></div></div>
          <div><div className="text-xs text-slate-500">Aberto em</div><div className="font-medium">{new Date(detail.created_at).toLocaleString()}</div></div>
          <div><div className="text-xs text-slate-500">Responsável</div><div className="font-medium">{detail.assignee_id||'—'}</div></div>
        </div>
        <div><div className="text-xs text-slate-500">Descrição</div><div className="font-medium text-slate-700">{detail.description||'—'}</div></div>
        <div className="flex flex-wrap gap-2">
          {detail.status!=='em_processamento'&&(<button className="border rounded-lg px-3 py-2" onClick={()=>updateStatus(detail,'em_processamento')}>Mover para processamento</button>)}
          {detail.status!=='resolvido'&&(<button className="bg-slate-900 text-white rounded-lg px-3 py-2" onClick={()=>updateStatus(detail,'resolvido')}>Resolver chamado</button>)}
        </div>
        <div className="pt-2 space-y-2"><div className="text-sm font-medium text-slate-700">Adicionar atualização</div>
          <div className="flex gap-2"><input className="border rounded-lg px-3 py-2 w-full" placeholder="Comentário" value={comment} onChange={e=>setComment(e.target.value)}/>
            <button className="border rounded-lg px-3 py-2" onClick={()=>addUpdate(detail)}>Enviar</button></div>
        </div>
      </div></div>)}
  </Layout>)
}
