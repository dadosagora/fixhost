import React from 'react'
import Topbar from '../components/Topbar'
import Sidebar from '../components/Sidebar'
export default function Layout({children}){
  return (<div className="min-h-screen bg-slate-50 text-slate-900">
    <Topbar/>
    <div className="grid grid-cols-1 md:grid-cols-[256px_1fr] max-w-7xl mx-auto">
      <Sidebar/><main className="p-4 md:p-6">{children}</main>
    </div></div>)
}
