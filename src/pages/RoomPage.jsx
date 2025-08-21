// src/pages/RoomPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function RoomPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campos do formulário
  const [floor, setFloor] = useState(""); // agora texto (andar/setor/local)
  const [code, setCode] = useState("");   // agora texto (nº/identificação)

  useEffect(() => {
    fetchRooms();
    // opcional: realtime para aparecer assim que cadastrar
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
      .select("id, code, floor, created_at")
      .order("code", { ascending: true });
    if (error) {
      console.error("Erro ao listar quartos:", error);
    }
    setRooms(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!floor.trim() || !code.trim()) return;

    setSaving(true);
    const payload = {
      // Mantém o mesmo nome de colunas já usados no app:
      // floor: texto (ex.: "2º andar", "Recepção")
      // code: texto (ex.: "201", "Fachada Leste")
      floor: floor.trim(),
      code: code.trim(),
    };

    const { error } = await supabase.from("rooms").insert(payload);
    setSaving(false);

    if (error) {
      console.error("Erro ao criar quarto:", error);
      alert("Não foi possível salvar. Veja o console para detalhes.");
      return;
    }

    // limpa o formulário e recarrega
    setFloor("");
    setCode("");
    fetchRooms();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Quartos / Locais</h1>
          <p className="text-sm text-slate-500">
            Cadastre quartos ou locais de manutenção (ex.: Recepção, Restaurante, Fachada).
          </p>
        </div>
      </header>

      {/* Formulário de cadastro */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Novo quarto / local</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* ORDEM INVERTIDA: primeiro ANDAR/SETOR (texto), depois NÚMERO/ID (texto) */}
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Andar / Setor / Local
            </label>
            <input
              type="text"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="Ex.: 2º andar, Recepção, Restaurante, Fachada"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
              <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {r.code || "—"}
                  </div>
                  <div className="text-sm text-slate-600">
                    {r.floor || "Sem andar/setor"}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
