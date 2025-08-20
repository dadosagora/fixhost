import { HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import AppLayout from "./layout/AppLayout"; // ou "./layout/Layout"
import Login from "./pages/Login";

/* ===== Guard para /app ===== */
function Protected({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="p-6">Carregando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

/* ===== Dashboard: contadores reais + gráfico simples ===== */
function Card({ label, value }) {
  return (
    <div className="bg-white border rounded p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Bars({ data }) {
  // data: [{label, value}]
  const max = Math.max(1, ...data.map(d => d.value || 0));
  return (
    <div className="bg-white border rounded p-4">
      <div className="mb-3 text-sm text-gray-600">Chamados por status</div>
      <div className="grid grid-cols-3 gap-4 items-end h-40">
        {data.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-1">
            <div
              className="w-10 bg-blue-600 rounded"
              style={{ height: `${(d.value / max) * 100}%` }}
              title={`${d.label}: ${d.value}`}
            />
            <div className="text-xs text-gray-600">{d.label}</div>
            <div className="text-xs font-medium">{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const [counts, setCounts] = useState({ abertos: 0, andamento: 0, atrasados: 0 });

  useEffect(() => {
    (async () => {
      // Faz 3 contagens simples usando filtros de status
      async function countStatus(status) {
        const { count } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", status);
        return count || 0;
      }
      const [aberto, em_andamento, pendente] = await Promise.all([
        countStatus("aberto"),
        countStatus("em_andamento"),
        countStatus("pendente"),
      ]);
      setCounts({ abertos: aberto, andamento: em_andamento, atrasados: pendente });
    })();
  }, []);

  const chart = useMemo(
    () => [
      { label: "Abertos", value: counts.abertos },
      { label: "Em andamento", value: counts.andamento },
      { label: "Pendentes", value: counts.atrasados },
    ],
    [counts]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg md:text-xl font-semibold">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Abertos" value={counts.abertos} />
        <Card label="Em andamento" value={counts.andamento} />
        <Card label="Pendentes" value={counts.atrasados} />
      </div>
      <Bars data={chart} />
    </div>
  );
}

/* ===== Chamados: lista real + botão “Novo” funcionando ===== */
function ChamadosPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id,title,priority,status,location,created_at")
        .order("created_at", { ascending: false });
      setRows(data || []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold">Chamados</h2>
        <button
          onClick={() => nav("/app/chamados/novo")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
        >
          Novo chamado
        </button>
      </div>

      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Título</th>
              <th className="p-2">Local</th>
              <th className="p-2">Prioridade</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.title}</td>
                <td className="p-2">{r.location || "-"}</td>
                <td className="p-2 capitalize">{r.priority}</td>
                <td className="p-2 capitalize">{r.status.replace("_", " ")}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Nenhum chamado encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== Form de novo chamado (salva no Supabase) ===== */
function ChamadoNewPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", priority: "media", location: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada. Faça login novamente.");
      setSaving(false);
      return;
    }
    const { error: e, data } = await supabase
      .from("tickets")
      .insert({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        location: form.location || null,
        created_by: user.id,
      })
      .select()
      .single();
    setSaving(false);
    if (e) {
      setError(e.message || "Não foi possível salvar.");
    } else {
      nav("/app/chamados"); // volta para a lista
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      <h2 className="text-lg md:text-xl font-semibold">Novo chamado</h2>
      <input
        className="w-full border rounded px-3 py-2"
        placeholder="Título"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />
      <textarea
        className="w-full border rounded px-3 py-2"
        placeholder="Descrição (opcional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <div className="flex gap-3">
        <select
          className="border rounded px-3 py-2"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          <option value="baixa">baixa</option>
          <option value="media">media</option>
          <option value="alta">alta</option>
          <option value="critica">critica</option>
        </select>
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Local (ex.: Apto 203)"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button
        onClick={submit}
        disabled={saving || !form.title.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded"
      >
        {saving ? "Salvando..." : "Salvar chamado"}
      </button>
    </div>
  );
}

/* ===== Páginas placeholder ===== */
function QuartosPage() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg md:text-xl font-semibold">Quartos</h2>
      <div className="bg-white border rounded p-4 text-sm text-gray-600">
        Em breve: cadastro de quartos, status de ocupação e histórico de manutenção.
      </div>
    </div>
  );
}

function UsuariosPage() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg md:text-xl font-semibold">Usuários</h2>
      <div className="bg-white border rounded p-4 text-sm text-gray-600">
        Em breve: lista de usuários, papéis (gestor, técnico, recepção) e convites.
      </div>
    </div>
  );
}

/* ===== Rotas ===== */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="chamados" element={<ChamadosPage />} />
          <Route path="chamados/novo" element={<ChamadoNewPage />} />
          <Route path="quartos" element={<QuartosPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </HashRouter>
  );
}
