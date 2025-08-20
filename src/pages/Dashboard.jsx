import React, { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState({ open: 0, inprog: 0, pending: 0 });

  useEffect(() => {
    (async () => {
      // Busca simples; ajuste se quiser filtrar por data etc.
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select("*");

      if (error) {
        console.error(error);
        return;
      }

      // Status válidos no seu schema:
      // 'aberto','triagem','em_andamento','pendente','resolvido','fechado'
      const open = tickets?.filter((t) => t.status === "aberto").length || 0;
      const inprog =
        tickets?.filter((t) => t.status === "em_andamento").length || 0;
      const pending =
        tickets?.filter((t) => t.status === "pendente").length || 0;

      setStats({ open, inprog, pending });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Abertos" value={stats.open} hint="Chamados aguardando início" />
        <StatCard title="Em andamento" value={stats.inprog} hint="Intervenções em curso" />
        <StatCard title="Pendentes" value={stats.pending} hint="Aguardando ação/peças" />
      </div>

      {/* gráfico bem simples em SVG para não depender de lib extra */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold mb-2">Chamados por status (exemplo)</div>
        <div className="h-40">
          <svg viewBox="0 0 320 120" className="w-full h-full">
            {/* Eixo */}
            <line x1="20" y1="100" x2="300" y2="100" stroke="currentColor" strokeWidth="1" />
            {/* Barras simples */}
            <rect x="40" y={100 - stats.open * 6} width="40" height={stats.open * 6} rx="4" />
            <rect x="140" y={100 - stats.inprog * 6} width="40" height={stats.inprog * 6} rx="4" />
            <rect x="240" y={100 - stats.pending * 6} width="40" height={stats.pending * 6} rx="4" />
            {/* Labels */}
            <text x="60" y="112" textAnchor="middle" fontSize="12">Abertos</text>
            <text x="160" y="112" textAnchor="middle" fontSize="12">Em andamento</text>
            <text x="260" y="112" textAnchor="middle" fontSize="12">Pendentes</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
