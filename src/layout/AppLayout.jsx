// src/layout/AppLayout.jsx  ||  src/layout/Layout.jsx
import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AppLayout() {
  return (
    // 1 coluna no mobile; 2 colunas a partir de md
    <div className="min-h-dvh grid md:grid-cols-[220px_1fr]">
      {/* Cabeçalho/Sidebar (fica no topo no mobile) */}
      <aside className="bg-slate-900 text-white border-b border-slate-800 md:border-b-0 p-3 md:p-4 space-y-2 md:min-h-dvh">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo-32.png"
              alt="FixHost"
              className="w-6 h-6 rounded"
            />
            <h1 className="text-base md:text-lg font-semibold">FixHost</h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="shrink-0 bg-white/10 hover:bg-white/20 rounded px-2.5 py-1 text-xs md:text-sm"
            aria-label="Sair"
          >
            Sair
          </button>
        </div>

        {/* Navegação mais compacta */}
        <nav className="flex flex-wrap md:flex-col gap-2 md:gap-1">
          <NavLink
            to="/app/dashboard"
            className={({ isActive }) =>
              `px-2.5 py-1.5 rounded text-sm ${
                isActive ? "bg-slate-800" : "hover:bg-slate-800/60"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/app/chamados"
            className={({ isActive }) =>
              `px-2.5 py-1.5 rounded text-sm ${
                isActive ? "bg-slate-800" : "hover:bg-slate-800/60"
              }`
            }
          >
            Chamados
          </NavLink>
          <NavLink
            to="/app/quartos"
            className={({ isActive }) =>
              `px-2.5 py-1.5 rounded text-sm ${
                isActive ? "bg-slate-800" : "hover:bg-slate-800/60"
              }`
            }
          >
            Quartos
          </NavLink>
          <NavLink
            to="/app/usuarios"
            className={({ isActive }) =>
              `px-2.5 py-1.5 rounded text-sm ${
                isActive ? "bg-slate-800" : "hover:bg-slate-800/60"
              }`
            }
          >
            Usuários
          </NavLink>
        </nav>
      </aside>

      {/* Conteúdo */}
      <main className="bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
