import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import AppLayout from "./layout/AppLayout"; // ou "./layout/Layout" se for o seu nome
import Login from "./pages/Login";

/* Guard para /app */
function Protected({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="p-6">Carregando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

/* ---- STUBS com conteúdo ---- */
function Card({ label, value }) {
  return (
    <div className="bg-white border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Abertos" value="12" />
        <Card label="Em andamento" value="7" />
        <Card label="Atrasados" value="3" />
      </div>
      <div className="bg-white border rounded p-4">
        <div className="mb-2 text-sm text-gray-600">Chamados por dia (demo)</div>
        <svg viewBox="0 0 300 100" className="w-full h-28">
          <polyline
            points="0,80 40,70 80,75 120,50 160,40 200,45 240,30 300,35"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
      </div>
    </div>
  );
}

function ChamadosPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chamados</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
          Novo chamado
        </button>
      </div>
      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Título</th>
              <th className="p-2">Local</th>
              <th className="p-2">Prioridade</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-2">101</td>
              <td className="p-2">Torneira pingando</td>
              <td className="p-2">Apto 203</td>
              <td className="p-2">média</td>
              <td className="p-2">aberto</td>
            </tr>
            <tr className="border-t">
              <td className="p-2">102</td>
              <td className="p-2">Ar-cond. barulhento</td>
              <td className="p-2">Apto 510</td>
              <td className="p-2">alta</td>
              <td className="p-2">em_andamento</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        (Demo) Em breve esta tela puxa os dados reais do Supabase.
      </p>
    </div>
  );
}

function QuartosPage() {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Quartos</h2>
      <div className="bg-white border rounded p-4 text-sm text-gray-600">
        Em breve: cadastro de quartos, status de ocupação e histórico de manutenção.
      </div>
    </div>
  );
}

function UsuariosPage() {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Usuários</h2>
      <div className="bg-white border rounded p-4 text-sm text-gray-600">
        Em breve: lista de usuários, papéis (gestor, técnico, recepção) e convites.
      </div>
    </div>
  );
}
/* ---- FIM STUBS ---- */

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="chamados" element={<ChamadosPage />} />
          <Route path="quartos" element={<QuartosPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </HashRouter>
  );
}
