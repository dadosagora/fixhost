import React, { useState } from "react";
import FixHostPhotoPicker from "./FixHostPhotoPicker";

/**
 * Modal simples para coletar observação + fotos quando avançar status.
 * Props:
 *  - open: boolean
 *  - title: string (ex.: "Processar chamado" / "Resolver chamado")
 *  - confirmLabel: string (ex.: "Processar" / "Resolver")
 *  - onClose: () => void
 *  - onSubmit: async ({ note, photos }) => void
 */
export default function TicketUpdateModal({
  open,
  title = "Atualizar chamado",
  confirmLabel = "Salvar",
  onClose,
  onSubmit,
}) {
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      setSaving(true);
      await onSubmit({ note: note.trim(), photos });
      onClose?.();
    } catch (e2) {
      setErr(e2?.message || "Falha ao salvar atualização");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg border px-2 py-1 text-sm hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observação
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: Feita compra de peças, aguardando chegar..."
              className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fotos (opcional)
            </label>
            <FixHostPhotoPicker maxPhotos={5} value={photos} onChange={setPhotos} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
