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
          {/* redireciona raiz para o dashboard */}
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          {/* login público */}
          <Route path="/login" element={<Login />} />

          {/* app protegido + layout com navegação */}
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
            <Route path="tickets" element={<Tickets />} />
            <Route path="rooms" element={<RoomPage />} />
            <Route path="users" element={<Users />} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
