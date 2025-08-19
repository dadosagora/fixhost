import React,{useEffect,useState} from 'react'
import Layout from '../layout/Layout'
import StatCard from '../components/StatCard'
import { supabase } from '../lib/supabase'
import { ResponsiveContainer,AreaChart,Area,XAxis,YAxis,Tooltip } from 'recharts'
export default function Dashboard(){
  const [stats,setStats]=useState({open:0,inprog:0,done30:0,sens:0})
  const [chartData,setChartData]=useState([])
  useEffect(()=>{(async()=>{
    const { data:tickets } = await supabase.from('tickets').select('*')
    const open=tickets?.filter(t=>t.status==='em_aberto').length||0
    const inprog=tickets?.filter(t=>t.status==='em_processamento').length||0
    const done30=tickets?.filter(t=>t.status==='resolvido').length||0
    const sens=tickets?.filter(t=>t.status!=='resolvido'&&(t.priority==='alta'||t.priority==='media')).length||0
    setStats({open,inprog,done30,sens})
    setChartData([{dia:'Hoje',abertos:open,resolvidos:done30}])
  })()},[])
  return (<Layout>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title="Em aberto" value={stats.open} hint="Chamados aguardando início"/>
      <StatCard title="Em processamento" value={stats.inprog} hint="Intervenções em curso"/>
      <StatCard title="Resolvidos (30d)" value={stats.done30} hint="Conclusões recentes"/>
      <StatCard title="SLAs sensíveis" value={stats.sens} hint="Prioridade média/alta"/>
    </div>
    <div className="rounded-2xl border bg-white p-4 shadow-sm mt-6">
      <div className="text-lg font-semibold mb-2">Volume de chamados (exemplo)</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}><XAxis dataKey="dia"/><YAxis/><Tooltip/>
            <Area type="monotone" dataKey="abertos" fillOpacity={0.2} strokeWidth={2}/>
            <Area type="monotone" dataKey="resolvidos" fillOpacity={0.2} strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div></Layout>)
}
