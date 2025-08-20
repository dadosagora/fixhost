// src/layout/AppLayout.jsx  (ou Layout.jsx)
import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

/** Logo SVG embutida (sem dependência de arquivo) */
function LogoFixHost({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-label="FixHost"
      role="img"
    >
      <rect x="4" y="8" width="40" height="40" rx="6" fill="#1e40af" />
      <polygon points="4,20 24,6 44,20" fill="#ef4444" />
      <rect x="10" y="24" width="8" height="8" fill="#93c5fd" />
      <rect x="22" y="24" width="8" height="8" fill="#93c5fd" />
      <rect x="34" y="24" width="8" height="8" fill="#93c5fd" />
      <path d="M48 40 l10-10 a6 6 0 11-8-8 l-10 10" stroke="#1e3a8a" strokeWidth="6" fill="none" />
    </svg>
  );
}

export default function AppLayout() {
  return (
    // Cabeçalho 70% menor: p-2, elementos text-xs/sm, coluna reduzida
    <div className="min-h-dvh grid md:grid-cols-[200px_1fr]">
      <aside className="bg-slate-900 text-white border-b border-slate-800 md:border-b-0 p-2 md:p-3 space-y-2 md:min-h-dvh">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LogoFixHost size={18} />
            <h1 className="text-sm md:text-base font-semibold">FixHost</h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="shrink-0 bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-xs"
            aria-label="Sair"
          >
            Sair
          </button>
        </div>

        {/* Navegação compacta */}
        <nav className="flex flex-wrap md:flex-col gap-1">
          <NavLink
            to="/app/dashboard"
            className={({ isActive }) =>
              `px-2 py-1 rounded text-sm ${
                isActive ? "bg-slate-800" : "hover:bg-slate-800/60"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/app/chamados"
            className={({ isActive }) =>
              `px-2 py-1 rounded text-sm ${
                isActive ? "bg-slate-800" : "hover:bg-slate-800/60"
              }`
            }
          >
            Chamados
          </NavLink>
          <NavLink
            to="/app/quartos"
            className={({ isActive }) =>
              `px-2 py-1 rounded text-sm ${
                isActive ? "bg-slate-800" : "hover:bg-slate-800/60"
              }`
            }
          >
            Quartos
          </NavLink>
          <NavLink
            to="/app/usuarios"
            className={({ isActive }) =>
              `px-2 py-1 rounded text-sm ${
                isActive ? "bg-slate-800" : "hover:bg-slate-800/60"
              }`
            }
          >
            Usuários
          </NavLink>
        </nav>
      </aside>

      <main className="bg-gray-50 p-3 md:p-5">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
