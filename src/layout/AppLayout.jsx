// src/layout/AppLayout.jsx
import React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2">
          {/* Linha 1 (mobile): brand + CTA desktop */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Brand */}
            <div>
              <div className="text-sm sm:text-base font-semibold leading-tight">
                <span className="block">Manutenção</span>
                <span className="block">Cecomtur Hotel</span>
              </div>
            </div>

            {/* CTA (desktop) */}
            <button
              onClick={() => navigate("/app/chamados/novo")}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white text-sm shadow hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>
              Novo Chamado
            </button>
          </div>

          {/* Linha 2 (mobile): navegação em grade 2x2. No desktop vira inline */}
          <nav className="mt-2">
            {/* Desktop: inline */}
            <div className="hidden sm:flex gap-2">
              <TopLink to="/app/dashboard" active={isActive("/app/dashboard")}>
                Dashboard
              </TopLink>
              <TopLink to="/app/chamados" active={isActive("/app/chamados")}>
                Chamados
              </TopLink>
              <TopLink to="/app/quartos" active={isActive("/app/quartos")}>
                Quartos
              </TopLink>
              <TopLink to="/app/usuarios" active={isActive("/app/usuarios")}>
                Usuários
              </TopLink>
            </div>

            {/* Mobile: grade 2x2, tudo visível sem rolar */}
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              <TopLink to="/app/dashboard" active={isActive("/app/dashboard")} wide>
                Dashboard
              </TopLink>
              <TopLink to="/app/chamados" active={isActive("/app/chamados")} wide>
                Chamados
              </TopLink>
              <TopLink to="/app/quartos" active={isActive("/app/quartos")} wide>
                Quartos
              </TopLink>
              <TopLink to="/app/usuarios" active={isActive("/app/usuarios")} wide>
                Usuários
              </TopLink>
            </div>
          </nav>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Outlet />
      </main>

      {/* FAB mobile: texto completo */}
      <button
        onClick={() => navigate("/app/chamados/novo")}
        className="sm:hidden fixed bottom-4 right-4 rounded-full bg-blue-600 text-white shadow-lg px-4 py-3 text-sm active:scale-[0.98]"
        aria-label="Novo Chamado"
      >
        + Novo Chamado
      </button>

      {/* FOOTER */}
      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 text-center text-xs text-slate-500">
          Desenvolvido por FixHost — direitos reservados • {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

function TopLink({ to, active, children, wide = false }) {
  return (
    <NavLink
      to={to}
      className={
        (wide ? "w-full text-center " : "") +
        "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm " +
        (active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 border hover:bg-slate-50")
      }
    >
      {children}
    </NavLink>
  );
}
