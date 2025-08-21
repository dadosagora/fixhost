// src/layout/AppLayout.jsx
import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Topbar */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <button
            onClick={() => navigate("/app/dashboard")}
            className="flex items-center gap-2 font-semibold text-slate-900 hover:opacity-90"
            title="Ir para o Dashboard"
          >
            {/* Ícone simples */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l8 6v12a1 1 0 0 1-1 1h-5v-7H10v7H5a1 1 0 0 1-1-1V9l8-6z" />
            </svg>
            <span>Manutenção Cecomtur Hotel</span>
          </button>

          {/* Navegação principal */}
          <nav className="flex items-center gap-1">
            <TopLink to="/app/dashboard">Dashboard</TopLink>
            <TopLink to="/app/chamados">Chamados</TopLink>
            <TopLink to="/app/quartos">Quartos</TopLink>
            <TopLink to="/app/usuarios">Usuários</TopLink>
            {/* CTA principal sempre visível */}
            <button
              onClick={() => navigate("/app/chamados/novo")}
              className="ml-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-1.5 text-white text-sm shadow hover:bg-blue-700 active:scale-[0.98]"
              title="Abrir novo chamado"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>
              Novo Chamado
            </button>
          </nav>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* Rodapé */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between text-xs text-slate-500">
          <span>Desenvolvido por FixHost — direitos reservados</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

function TopLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-sm ${
          isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}
