// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

// Páginas
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import RoomPage from "./pages/RoomPage";
import Users from "./pages/Users";
import Login from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Raiz -> Dashboard */}
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          {/* Login público */}
          <Route path="/login" element={<Login />} />

          {/* Área autenticada */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* === Chamados (PT/EN) === */}
            {/* Lista */}
            <Route path="chamados" element={<Tickets />} />
            <Route path="tickets" element={<Tickets />} />
            {/* Novo */}
            <Route path="chamados/novo" element={<Tickets />} />
            <Route path="tickets/new" element={<Tickets />} />
            {/* Visualizar por ID */}
            <Route path="chamados/:id" element={<Tickets />} />
            <Route path="tickets/:id" element={<Tickets />} />

            {/* === Quartos (PT/EN) === */}
            <Route path="quartos" element={<RoomPage />} />
            <Route path="rooms" element={<RoomPage />} />

            {/* === Usuários (PT/EN) === */}
            <Route path="usuarios" element={<Users />} />
            <Route path="users" element={<Users />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

}
