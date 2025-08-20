import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import AppLayout from "./layout/AppLayout";
import Login from "./pages/Login";

/** Protege rotas /app/* */
function Protected({ children }: { children: JSX.Element }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<any>(null);

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

/** ---- STUB PAGES (troque pelos seus componentes quando quiser) ---- */
function DashboardPage() {
  // Mini “gráfico” fake só para confirmar renderização
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

      {/* gráfico simples em SVG apenas para validar que “carregou algo” */}
      <div className="bg-white border rounded p-4">
        <div className="mb-2 text-sm text-gray-600">Chamados por dia (fake)</div>
        <svg viewBox="0 0 300 100" className="w-full h-28">
          <polyline
            points="0,80 40,70 80,75 120,50 160,40 200,45 240,30 300,35"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={i} x1={i * 40 + 40} y1={95} x2={i * 40 + 40} y2={90} stroke="currentColor" />
          ))}
        </svg>
      </div>
    </div>
  );
}

function ChamadosPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Chamados</h2>
      <p className="text-gray-600 text-sm">
        Página de listagem/CRUD de chamados (substitua por suas telas reais).
      </p>
    </div>
  );
}

function QuartosPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Quartos</h2>
      <p className="text-gray-600 text-sm">Gestão de quartos (stub).</p>
    </div>
  );
}

function UsuariosPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Usuários</h2>
      <p className="text-gray-600 text-sm">Gestão de usuários (stub).</p>
    </div>
  );
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
          {/* /app -> Dashboard por padrão */}
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Demais rotas */}
          <Route path="chamados" element={<ChamadosPage />} />
          <Route path="quartos" element={<QuartosPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />

          {/* Fallback dentro de /app */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Fallback global */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
