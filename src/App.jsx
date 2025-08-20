import { HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import AppLayout from "./layout/AppLayout"; // ou "./layout/Layout"
import Login from "./pages/Login";

/* ===== Guard para /app ===== */
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

/* ===== Dashboard: contadores reais + gráfico simples ===== */
function Card({ label, value }) {
  return (
    <div className="bg-white border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Bars({ data }) {
  // data: [{label, value}]
  const max = Math.max(1, ...data.map(d => d.value || 0));
  return (
    <div className="bg-white border rounded p-4">
      <div className="mb-3 text-sm text-gray-600">Chamados por status</div>
      <div className="grid grid-cols-3 gap-4 items-end h-40">
        {data.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-1">
            <div
              className="w-10 bg-blue-600 rounded"
              style={{ height: `${(d.value / max) * 100}%` }}
              title={`${d.label}: ${d.value}`}
            />
            <div className="text-xs text-gray-600">{d.label}</div>
            <div className="text-xs font-medium">{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const [counts, setCounts] = useState({ abertos: 0, andamento: 0, atrasados: 0 });

  useEffect(() => {
    (async () => {
      // Faz 3 contagens simples usando filtros de status
      async function countStatus(status) {
        const { count } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", status);
