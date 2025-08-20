// src/pages/Tickets.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

const CATS = ["Elétrica","Hidráulica","Mobiliário","Climatização","Limpeza","Outros"];
const MAX_PHOTOS = 5;
const BUCKET_NAME = "chamados-fotos"; // bucket do Supabase

/** Comprime imagem no cliente (≈1280px, jpeg 0.7) */
async function compressImage(file, maxSize = 1280, quality = 0.7) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });

  let { width, height } = img;
  if (width > height && width > maxSize) { height = (maxSize / width) * height; width = maxSize; }
  else if (height > width && height > maxSize) { width = (maxSize / height) * width; height = maxSize; }
  else if (width === height && width > maxSize) { width = height = maxSize; }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
  return new File([blob], `${Date.now()}.jpg`, { type: "image/jpeg" });
}

/** Envia fotos ao Storage e retorna URLs públicas */
async function uploadPhotos(ticketId, files) {
  const urls = [];
  for (const f of files.slice(0, MAX_PHOTOS)) {
    const compressed = await compressImage(f);
    const path = `ticket_${ticketId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, compressed, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) throw new Error(error.message || "Falha no upload");
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

function Thumbs({ files }) {
  if (!files?.length) return null;
  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {Array.from(files).slice(0, MAX_PHOTOS).map((f, i) => (
        <img key={i} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 object-cover rounded border" />
      ))}
    </div>
  );
}

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState({ q: "", status: "todos", priority: "todas" });
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);

  const [form, setForm] = useState({ room_id: "", category: CATS[0], priority: "media", title: "", description: "" });
  const [newPhotos, setNewPhotos] = useState([]);        // fotos do formulário de criação
  const [comment, setComment] = useState("");
  const [detailPhotos, setDetailPhotos] = useState([]);  // fotos no painel de detalhe

  // refs pros inputs "invisíveis"
  const galleryCreateRef = useRef(null);
  const cameraCreateRef  = useRef(null);
  const galleryDetailRef = useRef(null);
  const cameraDetailRef  = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: roomsData } = await supabase.from("rooms").select("*").order("code", { ascending: true });
    setRooms(roomsData || []);
    const { data: ticketsData } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
    setTickets(ticketsData || []);
  }

  const filtered = useMemo(() => tickets.filter(t => {
    const matchQ = (t.title + t.description + t.category).toLowerCase().includes(filter.q.toLowerCase());
    const matchS = filter.status === "todos" ? true : t.status === filter.status;
    const matchP = filter.priority === "todas" ? true : t.priority === filter.priority;
    return matchQ && matchS && matchP;
  }), [tickets, filter]);

  function appendFiles(setter, current, fileList) {
    const incoming = Array.from(fileList || []);
    const merged = [...current, ...incoming].slice(0, MAX_PHOTOS);
    setter(merged);
  }

  async function createTicket(e) {
    e.preventDefault();
    if (!form.room_id) { alert("Selecione um quarto."); return; }

    const dueHours = form.priority === "alta" ? 24 : form.priority === "media" ? 48 : 72;
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.from("tickets")
      .insert({
        ...form,
        created_by: user.id,
        status: "em_aberto",
        due_at: new Date(Date.now() + dueHours * 3600 * 1000).toISOString(),
      })
      .select("id").single();

    if (error) { alert("Erro ao salvar: " + error.message); return; }

    if (newPhotos.length) {
      try {
        const urls = await uploadPhotos(data.id, newPhotos);
        for (const url of urls) {
          await supabase.from("ticket_updates").insert({
            ticket_id: data.id, comment: "Foto anexada", created_by: user.id, photo_url: url,
          });
        }
      } catch (err) {
        alert("Erro ao enviar fotos: " + err.message);
      }
    }

    setCreating(false);
    setForm({ room_id: "", category: CATS[0], priority: "media", title: "", description: "" });
    setNewPhotos([]);
    await load();
  }

  async function updateStatus(ticket, newStatus) {
    const { error } = await supabase.from("tickets")
      .update({ status: newStatus, closed_at: newStatus === "resolvido" ? new Date().toISOString() : null })
      .eq("id", ticket.id);
    if (error) { alert("Erro ao atualizar status: " + error.message); return; }

    await supabase.from("ticket_updates").insert({
      ticket_id: ticket.id,
      old_status: ticket.status,
      new_status: newStatus,
      comment: newStatus === "resolvido" ? "Resolvido" : "Status atualizado",
      created_by: (await supabase.auth.getUser()).data.user.id,
    });
    await load();
    setDetail(null);
  }

  async function addUpdate(ticket) {
    const { data: { user } } = await supabase.auth.getUser();

    if (comment.trim()) {
      const { error } = await supabase.from("ticket_updates")
        .insert({ ticket_id: ticket.id, comment, created_by: user.id });
      if (error) { alert("Erro ao adicionar comentário: " + error.message); return; }
    }

    if (detailPhotos.length) {
      try {
        const urls = await uploadPhotos(ticket.id, detailPhotos);
        for (const url of urls) {
          await supabase.from("ticket_updates").insert({
            ticket_id: ticket.id, comment: "Foto anexada", created_by: user.id, photo_url: url,
          });
        }
      } catch (err) { alert("Erro ao enviar fotos: " + err.message); }
    }

    setComment("");
    setDetailPhotos([]);
    alert("Atualização enviada ✅");
  }

  return (
    <div className="space-y-4">
      {/* LISTA / FILTROS */}
      {!creating && !detail && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Buscar por título ou descrição"
              value={filter.q}
              onChange={(e) => setFilter({ ...filter, q: e.target.value })}
            />
            <select
              className="border rounded-lg px-3 py-2"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="todos">Todos os status</option>
              <option value="em_aberto">Em aberto</option>
              <option value="em_processamento">Em processamento</option>
              <option value="resolvido">Resolvido</option>
            </select>
            <div className="flex gap-2">
              <select
                className="border rounded-lg px-3 py-2 flex-1"
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              >
                <option value="todas">Todas prioridades</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
              <button
                onClick={() => setCreating(true)}
                className="bg-slate-900 text-white rounded-lg px-3 py-2 shrink-0"
              >
                Novo chamado
              </button>
            </div>
          </div>

          {/* Cards mobile */}
          <ul className="md:hidden space-y-3">
            {filtered.map((t) => (
              <li key={t.id} className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">
                    #{t.id} • {rooms.find((r) => r.id === t.room_id)?.code || "—"}
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {t.category} • <PriorityBadge value={t.priority} />
                </div>
                <div className="text-sm mt-1">{t.title || "—"}</div>
                <div className="text-xs text-slate-500 mt-2">
                  {new Date(t.created_at).toLocaleString()}
                </div>
                <div className="flex gap-2 justify-end mt-3">
                  <button
                    className="border rounded-lg px-3 py-1.5 text-sm"
                    onClick={() => setDetail(t)}
                  >
                    Visualizar
                  </button>
                  <button
                    className="border rounded-lg px-3 py-1.5 text-sm"
                    onClick={() => updateStatus(t, "em_processamento")}
                  >
                    Resolvendo
                  </button>
                  <button
                    className="border rounded-lg px-3 py-1.5 text-sm"
                    onClick={() => updateStatus(t, "resolvido")}
                  >
                    Resolvido
                  </button>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="text-center text-sm text-slate-600">Nenhum chamado encontrado.</li>
            )}
          </ul>

          {/* Tabela desktop */}
          <div className="hidden md:block rounded-2xl overflow-hidden border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Quarto</th>
                    <th className="text-left p-3">Título</th>
                    <th className="text-left p-3">Categoria</th>
                    <th className="text-left p-3">Prioridade</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Aberto em</th>
                    <th className="text-right p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3">#{t.id}</td>
                      <td className="p-3 font-medium">{rooms.find((r) => r.id === t.room_id)?.code || "—"}</td>
                      <td className="p-3">{t.title || "—"}</td>
                      <td className="p-3">{t.category}</td>
                      <td className="p-3"><PriorityBadge value={t.priority} /></td>
                      <td className="p-3"><StatusBadge status={t.status} /></td>
                      <td className="p-3">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            className="border rounded-lg px-3 py-1.5 text-sm"
                            onClick={() => setDetail(t)}
                          >
                            Visualizar
                          </button>
                          <button
                            className="border rounded-lg px-3 py-1.5 text-sm"
                            onClick={() => updateStatus(t, "em_processamento")}
                          >
                            Resolvendo
                          </button>
                          <button
                            className="border rounded-lg px-3 py-1.5 text-sm"
                            onClick={() => updateStatus(t, "resolvido")}
                          >
                            Resolvido
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td className="p-3 text-center" colSpan={8}>
                        Nenhum chamado encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Formulário de criação */}
      {creating && (
        <form onSubmit={createTicket} className="bg-white border rounded-2xl p-4 shadow-sm space-y-4">
          <div className="text-lg font-semibold">Novo chamado</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Quarto</label>
              <select
                className="border rounded-lg px-3 py-2 w-full"
                value={form.room_id}
                onChange={(e) => setForm({ ...form, room_id: Number(e.target.value) })}
                required
              >
                <option value="">Selecione...</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — andar {r.floor}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-slate-600">Categoria</label>
              <select
                className="border rounded-lg px-3 py-2 w-full"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-slate-600">Prioridade</label>
              <select
                className="border rounded-lg px-3 py-2 w-full"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-slate-600">Título (opcional)</label>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Tomada solta"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-sm text-slate-600">Descrição</label>
              <textarea
                rows={4}
                className="border rounded-lg px-3 py-2 w-full"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            {/* FOTOS: dois botões (Galeria / Câmera) */}
            <div className="md:col-span-2">
              <label className="text-sm text-slate-600 block mb-1">Fotos (até 5)</label>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  className="border rounded-lg px-3 py-2"
                  onClick={() => galleryCreateRef.current?.click()}
                >
                  Escolher da galeria
                </button>
                <button
                  type="button"
                  className="border rounded-lg px-3 py-2"
                  onClick={() => cameraCreateRef.current?.click()}
                >
                  Tirar foto agora
                </button>
              </div>

              {/* inputs escondidos */}
              <input
                ref={galleryCreateRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => appendFiles(setNewPhotos, newPhotos, e.target.files)}
              />
              <input
                ref={cameraCreateRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => appendFiles(setNewPhotos, newPhotos, e.target.files)}
              />

              <Thumbs files={newPhotos} />
              <p className="text-xs text-slate-500 mt-1">
                As imagens serão comprimidas antes do envio.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="border rounded-lg px-3 py-2"
              onClick={() => { setCreating(false); setNewPhotos([]); }}
            >
              Cancelar
            </button>
            <button className="bg-slate-900 text-white rounded-lg px-3 py-2">
              Salvar chamado
            </button>
          </div>
        </form>
      )}

      {/* Detalhe */}
      {detail && (
        <div className="space-y-4">
          <button className="text-slate-600 underline" onClick={() => setDetail(null)}>
            ← Voltar
          </button>
          <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold">Chamado #{detail.id}</div>
              <StatusBadge status={detail.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Categoria</div>
                <div className="font-medium">{detail.category}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Prioridade</div>
                <div className="font-medium">
                  <PriorityBadge value={detail.priority} />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Aberto em</div>
                <div className="font-medium">{new Date(detail.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Responsável</div>
                <div className="font-medium">{detail.assignee_id || "—"}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Descrição</div>
              <div className="font-medium text-slate-700">{detail.description || "—"}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {detail.status !== "em_processamento" && (
                <button
                  className="border rounded-lg px-3 py-2"
                  onClick={() => updateStatus(detail, "em_processamento")}
                >
                  Resolvendo
                </button>
              )}
              {detail.status !== "resolvido" && (
                <button
                  className="bg-slate-900 text-white rounded-lg px-3 py-2"
                  onClick={() => updateStatus(detail, "resolvido")}
                >
                  Resolvido
                </button>
              )}
            </div>

            {/* Atualização + fotos */}
            <div className="pt-2 space-y-2">
              <div className="text-sm font-medium text-slate-700">Adicionar atualização</div>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Comentário"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  className="border rounded-lg px-3 py-2"
                  onClick={() => galleryDetailRef.current?.click()}
                >
                  Galeria
                </button>
                <button
                  type="button"
                  className="border rounded-lg px-3 py-2"
                  onClick={() => cameraDetailRef.current?.click()}
                >
                  Câmera
                </button>
              </div>

              {/* inputs escondidos */}
              <input
                ref={galleryDetailRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => appendFiles(setDetailPhotos, detailPhotos, e.target.files)}
              />
              <input
                ref={cameraDetailRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => appendFiles(setDetailPhotos, detailPhotos, e.target.files)}
              />

              <Thumbs files={detailPhotos} />

              <div className="flex justify-end">
                <button className="border rounded-lg px-3 py-2" onClick={() => addUpdate(detail)}>
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
                }
