// src/layout/AppLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AppLayout() {
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const linkBase =
    "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const linkActive = "bg-slate-700 text-white";
  const linkIdle = "text-slate-200 hover:bg-slate-700/60";

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

            {/* Nav (rolável no mobile) */}
            <nav className="flex-1 mx-2 overflow-x-auto">
              <ul className="flex items-center gap-1 sm:gap-2 w-max">
                <li>
                  <NavLink
                    to="/app/dashboard"
                    end
                    className={({ isActive }) =>
                      `${linkBase} ${isActive ? linkActive : linkIdle}`
                    }
                  >
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/chamados"
                    className={({ isActive }) =>
                      `${linkBase} ${isActive ? linkActive : linkIdle}`
                    }
                  >
                    Chamados
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/quartos"
                    className={({ isActive }) =>
                      `${linkBase} ${isActive ? linkActive : linkIdle}`
                    }
                  >
                    Quartos
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/usuarios"
                    className={({ isActive }) =>
                      `${linkBase} ${isActive ? linkActive : linkIdle}`
                    }
                  >
                    Usuários
                  </NavLink>
                </li>
              </ul>
            </nav>

            {/* Sair */}
            <button
              onClick={logout}
              className="shrink-0 px-3 py-1.5 rounded-md bg-slate-100 text-slate-900 text-sm font-medium hover:bg-white"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
