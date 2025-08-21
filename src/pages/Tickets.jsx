import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import FixHostPhotoPicker from "../components/FixHostPhotoPicker";

const STATUS = { OPEN: "em_aberto", INPROG: "em_processamento", DONE: "resolvido" };
const BUCKET = "tickets";

// Helpers
function daysSinceLabel(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const ms = Date.now() - d.getTime();
  const days = Math.max(0, Math.floor(ms / 86400000));
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
function extractPathFromSupabaseUrl(url) {
  if (typeof url !== "string") return null;
  let m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (m) return { bucket: m[1], path: m[2] };
  m = url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)\?/);
  if (m) return { bucket: m[1], path: m[2] };
  return null;
}

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
  const [mutatingId, setMutatingId] = useState(null);
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

  async function handleAdvance(t) {
    if (!t?.id) return;
    const current = t.status || STATUS.OPEN;
    if (current === STATUS.DONE) return;
    const ns = nextStatus(current);

    try {
      setMutatingId(t.id);

      // otimista
      setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: ns } : x)));

      const { error } = await supabase
        .from("tickets")
        .update({ status: ns, updated_at: new Date().toISOString() })
        .eq("id", t.id)
        .select("id")
        .single();

      if (error) {
        // desfaz otimista
        setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: current } : x)));
        console.error(error);
        alert(`Não foi possível atualizar o status: ${error.message}`);
      }
    } catch (e) {
      setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)));
      console.error(e);
      alert(`Falha ao processar: ${e.message}`);
    } finally {
      setMutatingId(null);
    }
  }

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
                    {t.status !== STATUS.DONE && <> · Aberto há {daysSinceLabel(t.created_at)}</>}
                  </div>
                </div>

                {/* Ações rápidas */}
                <div className="flex flex-col sm:flex-row gap-2 self-center">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdvance(t); }}
                    disabled={(t.status || STATUS.OPEN) === STATUS.DONE || mutatingId === t.id}
                    className="text-xs sm:text-sm rounded-lg px-3 py-1 border bg-white hover:bg-slate-50 disabled:opacity-60"
                    title={nextStatusLabel(t.status || STATUS.OPEN)}
                  >
                    {mutatingId === t.id ? "Atualizando..." : nextStatusLabel(t.status || STATUS.OPEN)}
                  </button>
                  <Link
                    to={`/app/chamados/${t.id}?edit=1`}
                    className="text-xs sm:text-sm rounded-lg px-3 py-1 border bg-white hover:bg-slate-50 text-slate-700 text-center"
                    title="Editar"
                  >
                    Editar
                  </Link>
                </div>
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
  const [priority, setPriority] = useState("media");
  const [category, setCategory] = useState("Geral");
  const [selectedFloor, setSelectedFloor] = useState("");
  thead 
  const [selectedRoomId, setSelectedRoomId] = useState(null);

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

  // Upload + metadata {path, url}
  async function uploadPhotosIfAny(filesOrBlobs) {
    if (!filesOrBlobs || filesOrBlobs.length === 0) return [];
    const uploaded = [];
    for (let i = 0; i < filesOrBlobs.length && i < 5; i++) {
      const file = filesOrBlobs[i];
      const ext =
        typeof file?.name === "string" && file.name.includes(".")
          ? file.name.split(".").pop()
          : "jpg";
      const path = `${new Date().toISOString().slice(0, 10)}/${
        crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      }.${ext}`;

      let toUpload = file;
      if (!(file instanceof Blob) && typeof file === "string" && file.startsWith("data:")) {
        const res = await fetch(file);
        toUpload = await res.blob();
      }

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, toUpload, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw new Error(`Falha ao enviar imagem: ${upErr.message}`);

      const { data: pub } = await supabase.storage.from(BUCKET).getPublicUrl(path);
      uploaded.push({ path, url: pub?.publicUrl || null });
    }
    return uploaded;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim()) return setErrorMsg("Informe o título.");
    if (!selectedRoomId) return setErrorMsg("Selecione o local (andar/setor e número/identificação).");

    try {
      setSaving(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData?.user;
      if (!user?.id) throw new Error("Sessão expirada. Faça login novamente.");

      const roomId = Number(selectedRoomId);
      if (!Number.isFinite(roomId)) throw new Error("ID do local inválido.");

      const photosMeta = await uploadPhotosIfAny(photos);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status: STATUS.OPEN,
        room_id: roomId,
        category: (category ?? "").trim() || "Geral",
        photos: photosMeta.length ? photosMeta : null,
        created_by: user.id,
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

          {/* Etapa 1 */}
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

          {/* Etapa 2 */}
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

          {/* Categoria */}
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
            <FixHostPhotoPicker maxPhotos={5} value={photos} onChange={setPhotos} />
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

/* ========================= VISUALIZAR / EDITAR ========================= */
function TicketView({ id }) {
  const [ticket, setTicket] = useState(null);
  const [room, setRoom] = useState(null);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoWarn, setPhotoWarn] = useState(false);
  const [searchParams] = useSearchParams();

  // edição
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "",
    priority: "media",
    status: STATUS.OPEN,
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsEditing(searchParams.get("edit") === "1");
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      const { data: t } = await supabase.from("tickets").select("*").eq("id", id).single();

      let r = null;
      if (t?.room_id) {
        const { data: roomData } = await supabase
          .from("rooms").select("id, code, floor, notes").eq("id", t.room_id).single();
        r = roomData || null;
      }

      async function resolvePhotos(input) {
        if (!Array.isArray(input) || input.length === 0) return [];
        const out = await Promise.all(input.map(async (item) => {
          if (typeof item === "string") {
            if (item.startsWith("http")) {
              const parsed = extractPathFromSupabaseUrl(item);
              if (parsed?.bucket && parsed?.path) {
                const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60 * 24 * 7);
                if (!error && data?.signedUrl) return data.signedUrl;
              }
              return item;
            }
            const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(item, 60 * 60 * 24 * 7);
            return error ? null : data?.signedUrl || null;
          }
          if (item && typeof item === "object") {
            if (item.url && String(item.url).startsWith("http")) {
              const parsed = extractPathFromSupabaseUrl(item.url);
              if (parsed?.bucket && parsed?.path) {
                const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60 * 24 * 7);
                if (!error && data?.signedUrl) return data.signedUrl;
              }
              return item.url;
            }
            if (item.path) {
              const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(item.path, 60 * 60 * 24 * 7);
              return error ? null : data?.signedUrl || null;
            }
          }
          return null;
        }));
        return out.filter(Boolean);
      }

      const urls = await resolvePhotos(t?.photos);

      if (mounted) {
        setTicket(t || null);
        setRoom(r);
        setPhotoUrls(urls);
        setPhotoWarn(Array.isArray(t?.photos) && t.photos.length > 0 && urls.length === 0);
        setForm({
          title: t?.title || "",
          category: t?.category || "",
          priority: t?.priority || "media",
          status: t?.status || STATUS.OPEN,
          description: t?.description || "",
        });
        setLoading(false);
      }
    }

    fetchData();

    const ch = supabase
      .channel("ticket_view_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `id=eq.${id}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      mounted = false;
    };
  }, [id]);

  async function saveEdit() {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("tickets")
        .update({
          title: form.title.trim(),
          category: (form.category ?? "").trim(),
          priority: form.priority,
          status: form.status,
          description: form.description.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert(e.message || "Falha ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  async function advanceFromView() {
    const current = form.status;
    if (current === STATUS.DONE) return;
    const ns = nextStatus(current);
    try {
      setSaving(true);
      // otimista
      setForm((f) => ({ ...f, status: ns }));
      const { error } = await supabase
        .from("tickets")
        .update({ status: ns, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id")
        .single();
      if (error) {
        setForm((f) => ({ ...f, status: current }));
        alert(`Não foi possível atualizar o status: ${error.message}`);
      }
    } catch (e) {
      setForm((f) => ({ ...f, status: current }));
      alert(`Falha ao processar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Carregando...</div>;
  if (!ticket) return <div className="text-sm text-slate-500">Chamado não encontrado.</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            {ticket.title || `Chamado #${ticket.id}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StatusBadge status={form.status} />
            {ticket.priority && <PriorityBadge value={form.priority} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm border rounded-lg px-3 py-1 hover:bg-slate-50"
            >
              Editar
            </button>
          )}
          <Link
            to="/app/chamados"
            className="text-sm border rounded-lg px-3 py-1 hover:bg-slate-50"
          >
            Voltar
          </Link>
        </div>
      </header>

      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="text-sm text-slate-700">
          <span className="font-medium">Local:</span>{" "}
          {room ? `${room.floor} • ${room.code}` : "—"}
        </div>

        {!isEditing ? (
          <>
            <div className="text-sm text-slate-700">
              <span className="font-medium">Categoria:</span> {form.category || "—"}
            </div>
            <div className="text-sm text-slate-600 whitespace-pre-wrap">
              {form.description || "Sem descrição."}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prioridade</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
                >
                  <option value={STATUS.OPEN}>Em aberto</option>
                  <option value={STATUS.INPROG}>Em processamento</option>
                  <option value={STATUS.DONE}>Resolvido</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-lg bg-blue-600 text-white text-sm px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg border text-sm px-4 py-2 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {/* Fotos */}
        {photoUrls.length > 0 && !isEditing && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {photoUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                <img src={url} alt="" loading="lazy" className="w-full h-32 object-cover rounded-lg border" />
              </a>
            ))}
          </div>
        )}

        {photoWarn && !isEditing && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Não foi possível exibir as fotos. Verifique as permissões de leitura do bucket “{BUCKET}”.
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); advanceFromView(); }}
            disabled={form.status === STATUS.DONE || saving}
            className="rounded-lg border text-sm px-3 py-1 hover:bg-slate-50 disabled:opacity-60"
            title={nextStatusLabel(form.status)}
          >
            {saving ? "Atualizando..." : nextStatusLabel(form.status)}
          </button>
          <div className="ml-auto text-xs text-slate-500">
            Criado em {new Date(ticket.created_at).toLocaleString()}
            {ticket.updated_at ? ` · Atualizado em ${new Date(ticket.updated_at).toLocaleString()}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
