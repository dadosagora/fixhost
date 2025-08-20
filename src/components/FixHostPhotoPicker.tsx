import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// === CONFIG ===
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

/**
 * Componente para selecionar, visualizar, remover e enviar até 5 fotos para um chamado.
 * Corrige o problema de upload misto (galeria + câmera) usando merge funcional de estado,
 * reset do input após cada seleção e nomes únicos por arquivo.
 */
export default function FixHostPhotoPicker({
  ticketId,
  currentUrls = [],
  onSaved,
}: {
  ticketId: string;
  currentUrls?: string[];
  onSaved?: (urls: string[]) => void;
}) {
  const MAX = 5;
  const [files, setFiles] = useState<File[]>([]); // fotos ainda não enviadas
  const [existing, setExisting] = useState<string[]>(currentUrls); // URLs já salvas no chamado
  const [busy, setBusy] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Quantas ainda posso adicionar considerando as já salvas e as selecionadas
  const remaining = Math.max(0, MAX - (existing.length + files.length));

  // Normaliza nome (alguns blobs da câmera não tem name)
  function withSafeName(f: File) {
    const ext = (f.type?.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const safe = f.name && f.name.trim().length > 0 ? f.name : `${crypto.randomUUID()}.${ext}`;
    return new File([f], safe, { type: f.type || "image/jpeg", lastModified: Date.now() });
  }

  // Comprime imagem para reduzir tamanho
  async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<File> {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, w, h);

    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", quality)
    );
    const name = file.name.replace(/\.(png|jpg|jpeg|webp|heic|heif)$/i, ".jpg");
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  }

  // 🔧 Importante: passamos a origem ("galeria" | "camera") para resetar o input usado
  function handlePicked(list: FileList | null, origem: "galeria" | "camera") {
    if (!list || remaining === 0) {
      // mesmo que não use, zera o input para evitar bug de re-seleção
      if (origem === "galeria" && galleryRef.current) galleryRef.current.value = "";
      if (origem === "camera" && cameraRef.current) cameraRef.current.value = "";
      return;
    }

    const incoming = Array.from(list).map(withSafeName);

    // MERGE FUNCIONAL → não sobrescreve seleção anterior (resolve upload misto)
    setFiles((prev) => {
      const existCount = Array.isArray(existing) ? existing.length : 0;
      const room = Math.max(0, MAX - (existCount + prev.length));
      const take = incoming.slice(0, room);
      return [...prev, ...take];
    });

    // 🔄 reset do input que foi usado — evita bug quando a ordem é galeria → câmera
    if (origem === "galeria" && galleryRef.current) galleryRef.current.value = "";
    if (origem === "camera" && cameraRef.current) cameraRef.current.value = "";
  }

  function removeSelected(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function removeExisting(url: string) {
    if (busy) return;
    setBusy(true);
    try {
      // tenta extrair o caminho do arquivo a partir da URL pública (formato Supabase)
      // URL tipicamente contém /object/public/<bucket>/<path>
      const parts = url.split("/object/public/");
      if (parts.length === 2) {
        const pathWithBucket = parts[1];
        const firstSlash = pathWithBucket.indexOf("/");
        const bucket = pathWithBucket.slice(0, firstSlash);
        const path = pathWithBucket.slice(firstSlash + 1);
        await supabase.storage.from(bucket).remove([path]);
      }
      const newExisting = existing.filter((u) => u !== url);
      await saveUrls([...newExisting]);
      setExisting(newExisting);
    } catch (e) {
      console.error(e);
      alert("Não foi possível remover esta foto agora.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUrls(urls: string[]) {
    const { error } = await supabase.from("chamados").update({ fotos: urls }).eq("id", ticketId);
    if (error) throw error;
    onSaved?.(urls);
  }

  async function uploadAll() {
    if (busy || files.length === 0) return;
    setBusy(true);
    try {
      // 1) comprime
      const compressed = await Promise.all(files.map((f) => compressImage(f)));
      // 2) sobe com nomes/paths únicos
      const bucket = "chamados-fotos";
      const tasks = compressed.map(async (file) => {
        const ext = (file.type?.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const path = `${ticketId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl as string;
      });

      const results = await Promise.allSettled(tasks);
      const ok = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<string>[];
      const okUrls = ok.map((r) => r.value);
      if (okUrls.length === 0) throw new Error("Falha ao enviar as fotos.");

      const merged = [...existing, ...okUrls].slice(0, MAX);
      await saveUrls(merged);
      setExisting(merged);
      // limpa seleção
      setFiles([]);
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      alert("Fotos enviadas com sucesso!");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao enviar fotos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm opacity-80">
        {existing.length + files.length}/{MAX} fotos
      </div>

      {/* Seletores */}
      <div className="flex gap-3 items-center">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer">
          <span>Adicionar da galeria</span>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handlePicked(e.target.files, "galeria")}
            disabled={remaining === 0}
          />
        </label>

        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer">
          <span>Usar câmera</span>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePicked(e.target.files, "camera")}
            disabled={remaining === 0}
          />
        </label>

        <button
          onClick={uploadAll}
          disabled={busy || files.length === 0}
          className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-50"
        >
          {busy ? "Enviando..." : "Enviar fotos"}
        </button>
      </div>

      {/* Prévias: existentes (já salvas) com botão de lixeira */}
      {existing.length > 0 && (
        <div>
          <div className="text-sm mb-2">Já no chamado</div>
          <div className="flex flex-wrap gap-3">
            {existing.map((u) => (
              <div key={u} className="relative">
                <img src={u} className="w-24 h-24 object-cover rounded-lg border" />
                <button
                  title="Remover"
                  onClick={() => removeExisting(u)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border shadow flex items-center justify-center"
                >
                  <span className="text-xs">🗑️</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prévias: selecionadas (ainda não enviadas) com botão de X */}
      {files.length > 0 && (
        <div>
          <div className="text-sm mb-2">A enviar</div>
          <div className="flex flex-wrap gap-3">
            {files.map((f, idx) => {
              const url = URL.createObjectURL(f);
              return (
                <div key={f.name + f.lastModified} className="relative">
                  <img
                    src={url}
                    className="w-24 h-24 object-cover rounded-lg border"
                    onLoad={() => URL.revokeObjectURL(url)}
                  />
                  <button
                    title="Remover"
                    onClick={() => removeSelected(idx)}
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border shadow flex items-center justify-center"
                  >
                    <span className="text-xs">✕</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
