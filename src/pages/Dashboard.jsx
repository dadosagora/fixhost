import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

const STATUS = {
  OPEN: "em_aberto",
  INPROG: "em_processamento",
  DONE: "resolvido",
};

// Helper: "há X dias" (0 => "hoje")
function daysSinceLabel(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const ms = Date.now() - d.getTime();
  const days = Math.max(0, Math.floor(ms / 86400000));
  return days === 0 ? "hoje" : `${days} dia${days > 1 ? "s" : ""}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(STATUS.OPEN); // default: em aberto

  useEffect(() => {
    let mounted = true;

    async function fetchAll() {
      setLoading(true);
      const [roomsRes, ticketsRes] = await Promise.all([
        supabase.from("rooms").select("*").order("code", { ascending: true }),
        supabase
          .from("tickets")
          .select("id, title, description, status, priority, room_id, category, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (mounted) {
        setRooms(roomsRes.data || []);
        setTickets(Array.isArray(ticketsRes.data) ? ticketsRes.data : []);
        setLoading(false);
      }
    }

    fetchAll();

    // Realtime
    const channel = supabase
      .channel("tickets_dashboard_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        fetchAll
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    return tickets.reduce(
      (acc, t) => {
        const s = t.status || STATUS.OPEN;
        if (s === STATUS.OPEN) acc.open += 1;
        else if (s === STATUS.INPROG) acc.inprog += 1;
        else if (s === STATUS.DONE) acc.done += 1;
        return acc;
      },
      { open: 0, inprog: 0, done: 0 }
    );
  }, [tickets]);

  const filtered = useMemo(() => {
    if (!activeFilter) return tickets;
    return tickets.filter((t) => (t.status || STATUS.OPEN) === activeFilter);
  }, [tickets, activeFilter]);

  const roomCode = (id) => rooms.find((r) => r.id === id)?.code || "—";

  return (
    <div className="space-y-6">
      {/* Cabeçalho + ação principal */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão geral dos chamados e ações rápidas.</p>
        </div>

        {/* Botão principal: Novo Chamado */}
        <button
          onClick={() => navigate("/app/chamados/novo")}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>
          Novo Chamado
        </button>
      </div>

      {/* Cards de estatística */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Em aberto" value={stats.open} hint="Aguardando início" />
        <StatCard title="Em processamento" value={stats.inprog} hint="Em andamento" />
        <StatCard title="Resolvidos" value={stats.done} hint="Encerrados" />
      </div>

      {/* Filtros + Lista de chamados */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-lg font-semibold">Chamados</div>

          <div className="inline-flex rounded-lg border overflow-hidden">
            <FilterButton
              active={activeFilter === STATUS.OPEN}
              onClick={() => setActiveFilter(STATUS.OPEN)}
            >
              Em aberto
            </FilterButton>
            <FilterButton
              active={activeFilter === STATUS.INPROG}
              onClick={() => setActiveFilter(STATUS.INPROG)}
            >
              Em processamento
            </FilterButton>
            <FilterButton
              active={activeFilter === STATUS.DONE}
              onClick={() => setActiveFilter(STATUS.DONE)}
            >
              Resolvidos
            </FilterButton>
            <FilterButton
              active={!activeFilter}
              onClick={() => setActiveFilter(null)}
            >
              Todos
            </FilterButton>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">Nenhum chamado para este filtro.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((t) => (
              <li key={t.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/app/chamados/${t.id}`}
                      className="font-medium hover:underline truncate"
                    >
                      {t.title || `Chamado #${t.id}`}
                    </Link>
                    <StatusBadge status={t.status || STATUS.OPEN} />
                    {t.priority && <PriorityBadge value={t.priority} />}
                  </div>

                  <div className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {t.category ? `${t.category} • ` : ""}{t.description || "Sem descrição"}
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Quarto: {roomCode(t.room_id)} · Criado em {new Date(t.created_at).toLocaleString()}
                    {t.status !== STATUS.DONE && <> · Aberto há {daysSinceLabel(t.created_at)}</>}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/app/chamados/${t.id}`)}
                  className="self-center text-sm border rounded-lg px-3 py-1 hover:bg-slate-50"
                >
                  Abrir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      className={`px-3 py-1.5 text-sm ${
        active ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
