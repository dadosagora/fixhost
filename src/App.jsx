// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

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
          {/* raiz -> dashboard */}
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          {/* login público */}
          <Route path="/login" element={<Login />} />

          {/* área protegida */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* index de /app -> dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* rotas oficiais */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* --- ALIAS PT/EN para manter compatibilidade com o layout --- */}
            {/* Chamados */}
            <Route path="chamados" element={<Tickets />} />
            <Route path="tickets" element={<Tickets />} />

            {/* Quartos */}
            <Route path="quartos" element={<RoomPage />} />
            <Route path="rooms" element={<RoomPage />} />

            {/* Usuários */}
            <Route path="usuarios" element={<Users />} />
            <Route path="users" element={<Users />} />
          </Route>

          {/* fallback geral */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
