import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import RoleGate from "../components/RoleGate";

export default function RoomPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", floor: 1, type: "standard", status: "livre", notes: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase.from("rooms").select("*").order("code", { ascending: true });
    if (error) { console.error(error); return; }
    setRooms(data || []);
  }

  async function createRoom(e) {
    e.preventDefault();
    if (!form.code) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("rooms").insert({
      code: form.code,
      floor: Number(form.floor) || 0,
      type: form.type,
      status: form.status,
      notes: form.notes || null,
      created_by: user?.id || null
    });
    setLoading(false);
    if (error) { console.error(error); alert("Erro ao salvar: " + error.message); return; }
    setShowForm(false);
    setForm({ code: "", floor: 1, type: "standard", status: "livre", notes: "" });
    await load();
    alert("Quarto criado ✅");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Quartos</h2>
        <RoleGate allow={["gestor"]}>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Novo quarto
          </button>
        </RoleGate>
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Número</th>
              <th className="p-2">Andar</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Status</th>
              <th className="p-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.id}</td>
                <td className="p-2 font-medium">{r.code}</td>
                <td className="p-2">{r.floor}</td>
                <td className="p-2">{r.type}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.notes || "—"}</td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr><td className="p-2" colSpan={6}>Nenhum quarto cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal simples */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-4 space-y-4">
            <div className="text-lg font-semibold">Novo quarto</div>
            <form onSubmit={createRoom} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">Número</label>
                  <input className="border rounded-lg px-3 py-2 w-full"
                    value={form.code} onChange={(e)=>setForm({...form, code:e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Andar</label>
                  <input type="number" className="border rounded-lg px-3 py-2 w-full"
                    value={form.floor} onChange={(e)=>setForm({...form, floor:e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Tipo</label>
                  <select className="border rounded-lg px-3 py-2 w-full"
                    value={form.type} onChange={(e)=>setForm({...form, type:e.target.value})}>
                    <option value="standard">standard</option>
                    <option value="luxo">luxo</option>
                    <option value="suite">suíte</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Status</label>
                  <select className="border rounded-lg px-3 py-2 w-full"
                    value={form.status} onChange={(e)=>setForm({...form, status:e.target.value})}>
                    <option value="livre">livre</option>
                    <option value="ocupado">ocupado</option>
                    <option value="manutencao">manutenção</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Notas (opcional)</label>
                <textarea rows={3} className="border rounded-lg px-3 py-2 w-full"
                  value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})}/>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="border rounded-lg px-3 py-2" onClick={()=>setShowForm(false)}>Cancelar</button>
                <button disabled={loading} className="bg-blue-600 text-white rounded-lg px-3 py-2">
                  {loading ? "Salvando..." : "Salvar quarto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
