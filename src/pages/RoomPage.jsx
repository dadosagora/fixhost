// App.jsx — versão final com HashRouter e uso de RoomPage.jsx (singular)

// Se você renomeou o layout para AppLayout.jsx, troque a linha abaixo:
import AppLayout from "./layout/Layout";

import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

// Páginas reais do seu projeto
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import Users from "./pages/Users";
import RoomPage from "./pages/RoomPage"; // 👈 arquivo que você tem (singular)

/** Guard de rotas protegidas (/app/*) */
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

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<Login />} />

        {/* Protegida */}
        <Route
          path="/app"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          {/* /app → Dashboard por padrão */}
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Suas páginas */}
          <Route path="chamados" element={<Tickets />} />
          <Route path="quartos" element={<RoomPage />} /> {/* 👈 aqui usa RoomPage */}
          <Route path="usuarios" element={<Users />} />

          {/* Fallback dentro de /app */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Fallback global */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </HashRouter>
  );
}
