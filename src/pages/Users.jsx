import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: "inspetor", id: "", username: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("name", { ascending: true });
    if (error) { console.error(error); return; }
    setUsers(data || []);
  }

  async function addUser(e) {
    e.preventDefault();
    if (!form.id || !form.username) { alert("Preencha Username e UUID."); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from("app_users").insert(form);
      if (error) { console.error(error); alert("Erro ao salvar: " + error.message); return; }
      setForm({ name: "", role: "inspetor", id: "", username: "" });
      await load();
      alert("Usuário adicionado ✅");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Usuários</h2>

      <div className="rounded-lg border bg-white p-3 text-sm text-slate-700">
        <div className="font-medium mb-1">Como preencher o UUID?</div>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Vá em <b>Supabase → Authentication → Users</b> e crie/convide o usuário.</li>
          <li>Copie o <b>ID (UUID)</b> que aparece na lista.</li>
          <li>Cole no campo <b>UUID</b> abaixo e clique <b>Adicionar</b>.</li>
        </ol>
      </div>

      <form onSubmit={addUser} className="bg-white border rounded-2xl p-4 shadow-sm grid gap-3 md:grid-cols-5">
        <input className="border rounded-lg px-3 py-2" placeholder="Nome"
          value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required/>
        <select className="border rounded-lg px-3 py-2" value={form.role}
          onChange={e=>setForm({...form, role:e.target.value})}>
          <option value="inspetor">inspetor</option>
          <option value="manutencao">manutencao</option>
          <option value="gestor">gestor</option>
        </select>
        <input className="border rounded-lg px-3 py-2" placeholder="Usuário (ex: joao)"
          value={form.username} onChange={e=>setForm({...form, username:e.target.value})} required/>
        <input className="border rounded-lg px-3 py-2" placeholder="UUID (Authentication → Users)"
          value={form.id} onChange={e=>setForm({...form, id:e.target.value})} required/>
        <button disabled={saving} className="bg-slate-900 text-white rounded-lg px-3 py-2">
          {saving ? "Salvando..." : "Adicionar"}
        </button>
      </form>

      <div className="rounded-2xl overflow-hidden border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Usuário</th>
              <th className="text-left p-3">Papel</th>
              <th className="text-left p-3">UUID</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3">{u.username || "—"}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3 text-xs">{u.id}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td className="p-3 text-center" colSpan={4}>Nenhum usuário.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

