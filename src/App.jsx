import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import AppLayout from "./layout/AppLayout";
import Login from "./pages/Login";

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

/** ---- STUB PAGES ---- */
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
  return <h2 className="text-xl font-semibold">Chamados</h2>;
}
function QuartosPage() {
  return <h2 className="text-xl font-semibold">Quartos</h2>;
}
function UsuariosPage() {
  return <h2 className="text-xl font-semibold">Usuários</h2>;
}
/** ---- FIM STUBS ---- */

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login público */}
        <Route path="/login" element={<Login />} />

        {/* Área protegida */}
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

        {/* Fallback global */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
