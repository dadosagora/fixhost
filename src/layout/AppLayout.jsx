import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AppLayout() {
  return (
    // 1 coluna no mobile; 2 colunas a partir de md
    <div className="min-h-dvh grid md:grid-cols-[260px_1fr]">
      <aside className="bg-gray-900 text-white p-4 space-y-3 md:min-h-dvh">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold">🏨 FixHost</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="shrink-0 bg-white/10 hover:bg-white/20 rounded px-3 py-1 text-sm"
          >
            Sair
          </button>
        </div>

        <nav className="flex md:flex-col gap-2 overflow-x-auto">
          <NavLink
            to="/app/dashboard"
            className={({ isActive }) =>
              `px-3 py-2 rounded whitespace-nowrap ${
                isActive ? "bg-gray-800" : "hover:bg-gray-800/60"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/app/chamados"
            className={({ isActive }) =>
              `px-3 py-2 rounded whitespace-nowrap ${
                isActive ? "bg-gray-800" : "hover:bg-gray-800/60"
              }`
            }
          >
            Chamados
          </NavLink>
          <NavLink
            to="/app/quartos"
            className={({ isActive }) =>
              `px-3 py-2 rounded whitespace-nowrap ${
                isActive ? "bg-gray-800" : "hover:bg-gray-800/60"
              }`
            }
          >
            Quartos
          </NavLink>
          <NavLink
            to="/app/usuarios"
            className={({ isActive }) =>
              `px-3 py-2 rounded whitespace-nowrap ${
                isActive ? "bg-gray-800" : "hover:bg-gray-800/60"
              }`
            }
          >
            Usuários
          </NavLink>
        </nav>
      </aside>

      <main className="bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
