import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import TicketUpdateModal from "../components/TicketUpdateModal";

const STATUS = { OPEN: "em_aberto", INPROG: "em_processamento", DONE: "resolvido" };
const BUCKET = "tickets";

function daysSinceLabel(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  return days === 0 ? "hoje" : `${days} dia${days > 1 ? "s" : ""}`;
}
function nextStatus(current) {
  if (current === STATUS.OPEN) return STATUS.INPROG;
  if (current === STATUS.INPROG) return STATUS.DONE;
  return STATUS.DONE;
}
function nextStatusLabel(current) {
  if (current === STATUS.OPEN) return "Processar";
  if (current === STATUS.INPROG) return "Resolver";
  return "Resolvido";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(STATUS.OPEN);
  const [mutatingId, setMutatingId] = useState(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTicket, setModalTicket] = useState(null);
  const [modalNext, setModalNext] = useState(null);

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

    const channel = supabase
      .channel("tickets_dashboard_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, fetchAll)
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

  function openAdvanceModal(t) {
    const ns = nextStatus(t.status || STATUS.OPEN);
    setModalTicket(t);
    setModalNext(ns);
    setModalOpen(true);
  }

  async function uploadUpdatePhotos(filesOrBlobs, ticketId) {
    if (!filesOrBlobs || filesOrBlobs.length === 0) return [];
    const out = [];
    for (let i = 0; i < filesOrBlobs.length && i < 5; i++) {
      const file = filesOrBlobs[i];
      const ext =
        typeof file?.name === "string" && file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const path = `updates/${ticketId}/${new Date().toISOString().slice(0, 10)}/${
        crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      }.${ext}`;

      let blob = file;
      if (!(file instanceof Blob) && typeof file === "string" && file.startsWith("data:")) {
        const res = await fetch(file);
        blob = await res.blob();
      }

      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw new Error(`Falha ao enviar imagem: ${error.message}`);

      const { data: pub } = await supabase.storage.from(BUCKET).getPublicUrl(path);
      out.push({ path, url: pub?.publicUrl || null });
    }
    return out;
  }

  async function submitAdvance({ note, photos }) {
    const t = modalTicket;
    const ns = modalNext;
    if (!t || !ns) return;

    try {
      setMutatingId(t.id);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData?.user;
      if (!user?.id) throw new Error("Sessão expirada. Faça login novamente.");

      const photosMeta = await uploadUpdatePhotos(photos, t.id);

      // histórico
      const payloadUpdate = {
        ticket_id: t.id,
        status_after: ns,
        note: note || null,
        photos: photosMeta.length ? photosMeta : null,
        created_by: user.id,
        created_by_email: user.email || null,
      };
      const { error: upErr } = await supabase.from("ticket_updates").insert(payloadUpdate);
      if (upErr) throw upErr;

      // muda status
      const { error: tErr } = await supabase
        .from("tickets")
        .update({ status: ns })
        .eq("id", t.id)
        .select("id")
        .single();
      if (tErr) throw tErr;

      setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: ns } : x)));
    } catch (e) {
      console.error(e);
      alert(e?.message || "Falha ao avançar status");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-semibold">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500">Visão geral dos chamados e ações rápidas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/app/chamados/novo")}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white text-sm shadow hover:bg-blue-700"
          >
            + Novo Chamado
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-red-600 text-sm hover:bg-red-50"
            title="Sair"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Em aberto" value={stats.open} hint="Aguardando início" />
        <StatCard title="Em processamento" value={stats.inprog} hint="Em andamento" />
        <StatCard title="Resolvidos" value={stats.done} hint="Encerrados" />
      </div>

      {/* Lista + filtros */}
      <div className="rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div className="text-base sm:text-lg font-semibold">Chamados</div>

          <div className="overflow-x-auto -mx-1">
            <div className="inline-flex rounded-lg border bg-white overflow-hidden mx-1">
              <FilterButton active={activeFilter === STATUS.OPEN} onClick={() => setActiveFilter(STATUS.OPEN)}>
                Em aberto
              </FilterButton>
              <FilterButton active={activeFilter === STATUS.INPROG} onClick={() => setActiveFilter(STATUS.INPROG)}>
                Em processamento
              </FilterButton>
              <FilterButton active={activeFilter === STATUS.DONE} onClick={() => setActiveFilter(STATUS.DONE)}>
                Resolvidos
              </FilterButton>
              <FilterButton active={!activeFilter} onClick={() => setActiveFilter(null)}>
                Todos
              </FilterButton>
            </div>
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

                {/* Ações rápidas */}
                <div className="flex flex-col sm:flex-row gap-2 self-center">
                  <Link
                    to={`/app/chamados/${t.id}`}
                    className="text-xs sm:text-sm rounded-lg px-3 py-1 border bg-white hover:bg-slate-50 text-slate-700 text-center"
                    title="Visualizar"
                  >
                    Visualizar
                  </Link>

                  <Link
                    to={`/app/chamados/${t.id}?edit=1`}
                    className="text-xs sm:text-sm rounded-lg px-3 py-1 border bg-white hover:bg-slate-50 text-slate-700 text-center"
                    title="Editar"
                  >
                    Editar
                  </Link>

                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAdvanceModal(t); }}
                    disabled={(t.status || STATUS.OPEN) === STATUS.DONE || mutatingId === t.id}
                    className="text-xs sm:text-sm rounded-lg px-3 py-1 border bg-white hover:bg-slate-50 disabled:opacity-60"
                    title={nextStatusLabel(t.status || STATUS.OPEN)}
                  >
                    {mutatingId === t.id ? "Atualizando..." : nextStatusLabel(t.status || STATUS.OPEN)}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de atualização */}
      <TicketUpdateModal
        open={modalOpen}
        title={modalTicket ? (modalNext === STATUS.DONE ? "Resolver chamado" : "Processar chamado") : "Atualizar chamado"}
        confirmLabel={modalTicket ? (modalNext === STATUS.DONE ? "Resolver" : "Processar") : "Salvar"}
        onClose={() => setModalOpen(false)}
        onSubmit={submitAdvance}
      />
    </div>
  );
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      className={`px-3 py-1.5 text-sm whitespace-nowrap ${
        active ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
