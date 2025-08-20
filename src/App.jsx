// App.jsx — versão completa usando HashRouter e RoomPage
// Se o seu layout estiver em ./layout/AppLayout.jsx, troque a linha abaixo para:
// import AppLayout from "./layout/AppLayout";
import AppLayout from "./layout/AppLayout.jsx";

import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import RoomPage from "./pages/RoomPage"; // ← novo componente de Quartos

/** Protege rotas /app/* */
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

/** ---- STUB PAGES (simples, só para garantir renderização) ---- */
function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-500">Abertos</div>
          <div className="text-2xl font-bold">12</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-500">Em andamento</div>
          <div className="text-2xl font-bold">7</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-500">Atrasados</div>
          <div className="text-2xl font-bold">3</div>
        </div>
      </div>
    </div>
  );
}

function ChamadosPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Chamados</h2>
      <p className="text-gray-600 text-sm">Listagem/CRUD de chamados (placeholder).</p>
    </div>
  );
}

function UsuariosPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Usuários</h2>
      <p className="text-gray-600 text-sm">Gestão de usuários (placeholder).</p>
    </div>
  );
}
/** ---- FIM STUBS ---- */

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* pública */}
        <Route path="/login" element={<Login />} />

        {/* protegida */}
        <Route
          path="/app"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          {/* /app → Dashboard por padrão */}
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Rotas internas */}
          <Route path="chamados" element={<ChamadosPage />} />
          <Route path="quartos" element={<RoomPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />

          {/* fallback dentro de /app */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* fallback global */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </HashRouter>
  );
}
