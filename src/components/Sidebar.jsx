import React from 'react'
import { Link,useLocation } from 'react-router-dom'
function NavItem({to,label}){
  const loc=useLocation()
  const active=loc.pathname===to
  return (<Link to={to} className={`block px-3 py-2 rounded-xl text-sm ${active?'bg-slate-100 text-slate-900':'text-slate-600 hover:bg-slate-50'}`}>{label}</Link>)
}
export default function Sidebar(){
  return (<div className="w-full md:w-64 border-r bg-white p-3 sticky top-14 h-[calc(100vh-56px)] overflow-auto">
    <div className="space-y-1">
      <NavItem to="/" label="Dashboard"/>
      <NavItem to="/tickets" label="Chamados"/>
      <NavItem to="/rooms" label="Quartos"/>
      <NavItem to="/users" label="Usuários"/>
    </div></div>)
}
