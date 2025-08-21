// src/pages/RoomPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function RoomPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form de criação
  const [floor, setFloor] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");

  // Edição inline
  const [editId, setEditId] = useState(null);
  const [editFloor, setEditFloor] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchRooms();

    // Realtime: refaz fetch em qualquer mudança na tabela rooms
    const ch = supabase
      .channel("rooms_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, fetchRooms)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  async function fetchRooms() {
    setLoading(true);
    const { data, error } = await supabase
      .from("rooms")
      .select("id, code, floor, notes, created_at")
      .order("code", { ascending: true });

    if (error) console.error("Erro ao listar quartos:", error);
    setRooms(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!floor.trim() || !code.trim()) return;

    setSaving(true);
    const payload = {
      floor: floor.trim(),
      code: code.trim(),
      notes: notes.trim(),
    };

    const { data, error } = await supabase.from("rooms").insert(payload).select().single();
    setSaving(false);

    if (error) {
      console.error("Erro ao criar quarto/local:", error);
      alert("Não foi possível salvar. Veja o console para detalhes.");
      return;
    }

    // otimista
    setRooms((prev) => [data, ...prev]);
    setFloor("");
    setCode("");
    setNotes("");
  }

  function startEdit(r) {
    setEditId(r.id);
    setEditFloor(r.floor || "");
    setEditCode(r.code || "");
    setEditNotes(r.notes || "");
  }

  function cancelEdit() {
    setEditId(null);
    setEditFloor("");
    setEditCode("");
    setEditNotes("");
  }

  async function handleUpdate(id) {
    if (!editFloor.trim() || !editCode.trim()) return;

    setEditSaving(true);
    const patch = {
      floor: editFloor.trim(),
      code: editCode.trim(),
      notes: editNotes.trim(),
    };

    const prev = rooms;
    // otimista
    setRooms((list) =>
      list.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );

    const { error } = await supabase.from("rooms").update(patch).eq("id", id);
    setEditSaving(false);

    if (error) {
      console.error("Erro ao atualizar quarto/local:", error);
      alert("Não foi possível atualizar. Alterações desfeitas.");
      setRooms(prev); // rollback
      return;
    }

    cancelEdit();
  }

  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este quarto/local?")) return;

    const prev = rooms;
    // otimista
    setRooms((list) => list.filter((r) => r.id !== id));

    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) {
      console.error("Erro ao excluir quarto/local:", error);
      alert("Não foi possível excluir. Itens restaurados.");
      setRooms(prev); // rollback
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Quartos / Locais</h1>
          <p className="text-sm text-slate-500">
            Cadastre e gerencie quartos/locais de manutenção (ex.: Recepção, Restaurante, Fachada).
          </p>
        </div>
      </header>

      {/* Formulário de cadastro */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Novo quarto / local</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* ORDEM: Andar/Setor -> Número/Identificação -> Botão */}
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Andar / Setor / Local
            </label>
            <input
              type="text"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="Ex.: 2º andar, Recepção, Restaurante, Fachada"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Número / Identificação
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex.: 201, 101A, Fachada Leste"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </div>

          <div className="sm:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-white text-sm shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>

          {/* Observação */}
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observação
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Próximo ao elevador, área de difícil acesso..."
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Quartos / locais cadastrados</h2>
          <span className="text-xs text-slate-500">
            {loading ? "Carregando..." : `${rooms.length} itens`}
          </span>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Carregando...</div>
        ) : rooms.length === 0 ? (
          <div className="text-sm text-slate-500">Nenhum quarto/local cadastrado.</div>
        ) : (
          <ul className="divide-y">
            {rooms.map((r) => (
              <li key={r.id} className="py-3">
                {editId === r.id ? (
                  // === MODO EDIÇÃO (inline) ===
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Andar / Setor / Local
                      </label>
                      <input
                        type="text"
                        value={editFloor}
                        onChange={(e) => setEditFloor(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
                        required
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Número / Identificação
                      </label>
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
                        required
                      />
                    </div>
                    <div className="sm:col-span-1 flex items-end gap-2">
                      <button
                        onClick={() => handleUpdate(r.id)}
                        disabled={editSaving}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-white text-sm shadow hover:bg-slate-800 disabled:opacity-60"
                      >
                        {editSaving ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Observação
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                  </div>
                ) : (
                  // === MODO VISUALIZAÇÃO ===
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium">{r.code || "—"}</div>
                      <div className="text-sm text-slate-600">{r.floor || "Sem andar/setor"}</div>
                      {r.notes && <div className="text-sm text-slate-500 mt-1">{r.notes}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(r)}
                        className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
                        title="Editar"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 hover:border-red-200"
                        title="Excluir"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
