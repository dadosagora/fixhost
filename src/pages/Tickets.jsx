// src/pages/Tickets.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import FixHostPhotoPicker from "../components/FixHostPhotoPicker";

const STATUS = {
  OPEN: "em_aberto",
  INPROG: "em_processamento",
  DONE: "resolvido",
};

export default function Tickets() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isNew = location.pathname.endsWith("/novo") || location.pathname.endsWith("/new");
  const isView = !!id && !isNew;

  if (isNew) return <TicketNew onSaved={(newId) => navigate(`/app/chamados/${newId}`)} />;
  if (isView) return <TicketView id={id} />;

  return <TicketList />;
}

/* ========================= LISTA ========================= */
function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      setLoading(true);
      const { data, error } = await supabase
        .from("tickets")
        .select("id, title, description, status, priority, room_id, created_at")
        .order("created_at", { ascending: false });
      if (mounted) {
        setTickets(Array.isArray(data) ? data : []);
        setLoading(false);
      }
      if (error) console.error(error);
    }
    fetchAll();

    const ch = supabase
      .channel("tickets_list_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, fetchAll)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Chamados</h1>
          <p className="text-sm text-slate-500">Gerencie os chamados cadastrados.</p>
        </div>
        <button
          onClick={() => navigate("/app/chamados/novo")}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>
          Novo Chamado
        </button>
      </header>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Carregando...</div>
        ) : tickets.length === 0 ? (
          <div className="text-sm text-slate-500">Nenhum chamado encontrado.</div>
        ) : (
          <ul className="divide-y">
            {tickets.map((t) => (
              <li key={t.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/app/chamados/${t.id}`} className="font-medium hover:underline truncate">
                      {t.title || `Chamado #${t.id}`}
                    </Link>
                    <StatusBadge status={t.status || STATUS.OPEN} />
                    {t.priority && <PriorityBadge value={t.priority} />}
                  </div>
                  {t.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mt-1">{t.description}</p>
                  )}
                  <div className="text-xs text-slate-500 mt-1">
                    Criado em {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
                <Link
                  to={`/app/chamados/${t.id}`}
                  className="self-center text-sm border rounded-lg px-3 py-1 hover:bg-slate-50"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ========================= NOVO ========================= */
function TicketNew({ onSaved }) {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media"); // baixa | media | alta
  const [category, setCategory] = useState("Geral"); // ✅ padrão não-nulo
  const [selectedFloor, setSelectedFloor] = useState(""); // etapa 1
  const [selectedRoomId, setSelectedRoomId] = useState(null); // etapa 2 (bigint)

  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    async function fetchRooms() {
      setLoadingRooms(true);
      const { data, error } = await supabase
        .from("rooms")
        .select("id, code, floor")
        .order("floor", { ascending: true })
        .order("code", { ascending: true });
      if (mounted) {
        setRooms(Array.isArray(data) ? data : []);
        setLoadingRooms(false);
      }
      if (error) console.error(error);
    }
    fetchRooms();
    return () => { mounted = false; };
  }, []);

  const floorOptions = useMemo(() => {
    const vals = rooms.map((r) => (r.floor || "").trim()).filter(Boolean);
    return Array.from(new Set(vals)).sort((a, b) => a.localeCompare(b));
  }, [rooms]);

  const roomOptions = useMemo(() => {
    if (!selectedFloor) return [];
    return rooms.filter((r) => (r.floor || "").trim() === selectedFloor);
  }, [rooms, selectedFloor]);

  function onChangeFloor(value) {
    setSelectedFloor(value);
    setSelectedRoomId(null);
  }

  async function uploadPhotosIfAny(filesOrBlobs) {
    if (!filesOrBlobs || filesOrBlobs.length === 0) return [];
    const uploadedUrls = [];
    for (let i = 0; i < filesOrBlobs.length && i < 5; i++) {
      const file = filesOrBlobs[i];
      const ext = typeof file?.name === "string" && file.name.includes(".")
        ? file.name.split(".").pop()
        : "jpg";
      const path = `tickets/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;

      let toUpload = file;
      if (!(file instanceof Blob) && typeof file === "string" && file.startsWith("data:")) {
        const res = await fetch(file);
        toUpload = await res.blob();
      }

      const { error: upErr } = await supabase.storage.from("tickets").upload(path, toUpload, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw new Error(`Falha ao enviar imagem: ${upErr.message}`);

      const { data: pub } = supabase.storage.from("tickets").getPublicUrl(path);
      uploadedUrls.push(pub.publicUrl);
    }
    return uploadedUrls;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim()) {
      setErrorMsg("Informe o título.");
      return;
    }
    if (!selectedRoomId) {
      setErrorMsg("Selecione o local (andar/setor e número/identificação).");
      return;
    }

    try {
      setSaving(true);

      // garante bigint válido
      const roomId = Number(selectedRoomId);
      if (!Number.isFinite(roomId)) {
        throw new Error("ID do local inválido.");
        }

      const photoUrls = await uploadPhotosIfAny(photos);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status: STATUS.OPEN,
        room_id: roomId, // bigint
        category: (category ?? "").trim() || "Geral", // ✅ nunca null
        photos: photoUrls.length ? photoUrls : null,   // requer coluna jsonb 'photos'
      };

      const { data, error } = await supabase
        .from("tickets")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      onSaved?.(data.id);
    } catch (err) {
      console.error("Erro ao criar chamado:", err);
      setErrorMsg(err?.message || "Não foi possível salvar o chamado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Novo Chamado</h1>
          <p className="text-sm text-slate-500">Registre um novo chamado de manutenção.</p>
        </div>
      </header>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        {errorMsg && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Título */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Vazamento no banheiro"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </div>

          {/* Etapa 1: Andar / Setor / Local */}
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Andar / Setor / Local
            </label>
            {loadingRooms ? (
              <div className="text-sm text-slate-500">Carregando locais...</div>
            ) : (
              <select
                value={selectedFloor}
                onChange={(e) => onChangeFloor(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-slate-900/10"
                required
              >
                <option value="">Selecione</option>
                {floorOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            )}
          </div>

          {/* Etapa 2: Número / Identificação (filtrado) */}
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Número / Identificação
            </label>
            <select
              value={selectedRoomId ?? ""}
              onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-slate-900/10"
              required
              disabled={!selectedFloor}
            >
              <option value="">{selectedFloor ? "Selecione" : "Escolha um Andar/Setor primeiro"}</option>
              {roomOptions.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.code}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria (valor padrão "Geral") */}
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex.: Hidráulica, Elétrica, Marcenaria..."
              className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* Prioridade */}
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          {/* Descrição */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhe o problema, acesso, horários, observações..."
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* Fotos */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fotos (até 5) — câmera ou galeria
            </label>
            <FixHostPhotoPicker
              maxPhotos={5}
              value={photos}
              onChange={setPhotos}
            />
          </div>

          {/* Ações */}
          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white text-sm shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar Chamado"}
            </button>
            <Link to="/app/chamados" className="text-sm text-slate-600 hover:underline">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========================= VISUALIZAR ========================= */
function TicketView({ id }) {
  const [ticket, setTicket] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      const { data: t, error: e1 } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", id)
        .single();
      if (e1) console.error(e1);

      let r = null;
      if (t?.room_id) {
        const { data: roomData } = await supabase
          .from("rooms")
          .select("id, code, floor, notes")
          .eq("id", t.room_id)
          .single();
        r = roomData || null;
      }

      if (mounted) {
        setTicket(t || null);
        setRoom(r);
        setLoading(false);
      }
    }

    fetchData();

    const ch = supabase
      .channel("ticket_view_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `id=eq.${id}` }, fetchData)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [id]);

  if (loading) {
    return <div className="text-sm text-slate-500">Carregando...</div>;
  }
  if (!ticket) {
    return <div className="text-sm text-slate-500">Chamado não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            {ticket.title || `Chamado #${ticket.id}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StatusBadge status={ticket.status} />
            {ticket.priority && <PriorityBadge value={ticket.priority} />}
          </div>
        </div>
        <Link
          to="/app/chamados"
          className="text-sm border rounded-lg px-3 py-1 hover:bg-slate-50"
        >
          Voltar
        </Link>
      </header>

      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="text-sm text-slate-700">
          <span className="font-medium">Local:</span>{" "}
          {room ? `${room.floor} • ${room.code}` : "—"}
        </div>

        <div className="text-sm text-slate-700">
          <span className="font-medium">Categoria:</span>{" "}
          {ticket.category || "—"}
        </div>

        <div className="text-sm text-slate-600 whitespace-pre-wrap">
          {ticket.description || "Sem descrição."}
        </div>

        {Array.isArray(ticket.photos) && ticket.photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {ticket.photos.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                <img src={url} alt="" className="w-full h-32 object-cover rounded-lg border" />
              </a>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-500">
          Criado em {new Date(ticket.created_at).toLocaleString()}
          {ticket.updated_at ? ` · Atualizado em ${new Date(ticket.updated_at).toLocaleString()}` : ""}
        </div>
      </div>
    </div>
  );
}
