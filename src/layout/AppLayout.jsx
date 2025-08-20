// src/layout/AppLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AppLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const linkBase =
    "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const linkActive = "bg-slate-700 text-white";
  const linkIdle = "text-slate-200 hover:bg-slate-700/60";

  const NavItems = ({ onClick }) => (
    <>
      <NavLink
        to="/app/dashboard"
        end
        onClick={onClick}
        className={({ isActive }) =>
          `${linkBase} ${isActive ? linkActive : linkIdle}`
        }
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/app/chamados"
        onClick={onClick}
        className={({ isActive }) =>
          `${linkBase} ${isActive ? linkActive : linkIdle}`
        }
      >
        Chamados
      </NavLink>
      <NavLink
        to="/app/quartos"
        onClick={onClick}
        className={({ isActive }) =>
          `${linkBase} ${isActive ? linkActive : linkIdle}`
        }
      >
        Quartos
      </NavLink>
      <NavLink
        to="/app/usuarios"
        onClick={onClick}
        className={({ isActive }) =>
          `${linkBase} ${isActive ? linkActive : linkIdle}`
        }
      >
        Usuários
      </NavLink>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg sm:text-xl font-bold truncate">🏨 FixHost</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-2">
              <NavItems />
            </nav>

            {/* Mobile actions */}
            <div className="flex items-center gap-2 sm:hidden">
              <button
                aria-label="Abrir menu"
                onClick={() => setOpen(true)}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                {/* ícone hambúrguer */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-900 text-sm font-medium hover:bg-white"
              >
                Sair
              </button>
            </div>

            {/* Desktop sair */}
            <button
              onClick={logout}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-md bg-slate-100 text-slate-900 text-sm font-medium hover:bg-white"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="sm:hidden bg-slate-900/95 border-t border-slate-800">
            <div className="max-w-6xl mx-auto px-3 py-3 flex flex-col gap-2">
              <NavItems onClick={() => setOpen(false)} />
              <button
                onClick={() => setOpen(false)}
                className="mt-1 self-start text-slate-300 underline text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
