import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

type Props = {
  ticketId: string;
  currentUrls?: string[];             // URLs já salvas no chamado (campo "fotos" na tabela)
  onSaved?: (urls: string[]) => void; // callback após salvar
};

export default function FixHostPhotoPicker({ ticketId, currentUrls = [], onSaved }: Props) {
  const MAX = 5;

  // fotos novas (File) antes de enviar
  const [files, setFiles] = useState<File[]>([]);
  // fotos já salvas (URLs públicas)
  const [existing, setExisting] = useState<string[]>(currentUrls || []);
  const [busy, setBusy] = useState(false);

  // 2 inputs separados: galeria (sem capture) e câmera (com capture)
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

  // mantém sincronizado se o pai atualizar currentUrls
  useEffect(() => {
    setExisting(Array.isArray(currentUrls) ? currentUrls : []);
  }, [currentUrls]);

  // ===== Utils =====
  function withSafeName(f: File) {
    const ext = (f.type?.split("/")[1] || "jpg").replace("jpeg","jpg");
    const safe = f.name && f.name.trim().length ? f.name : `${crypto.randomUUID()}.${ext}`;
    return new File([f], safe, { type: f.type || "image/jpeg", lastModified: Date.now() });
  }

  async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<File> {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, w, h);

    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", quality)
    );
    const name = file.name.replace(/\.(png|jpg|jpeg|webp|heic|heif)$/i, ".jpg");
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  }

  // ===== Seleção de fotos (corrige galeria → câmera com reset do input usado) =====
  function addFiles(list: FileList | null, origem: "galeria" | "camera") {
    if (!list) return;
    const incoming = Array.from(list).map(withSafeName);

    // limite considera já salvas + as ainda não enviadas
    setFiles((prev) => {
      const room = Math.max(0, MAX - (existing.length + prev.length));
      const take = incoming.slice(0, room);
      return [...prev, ...take];
    });

    if (origem === "galeria" && galleryRef.current) galleryRef.current.value = "";
    if (origem === "camera"  && cameraRef.current)  cameraRef.current.value  = "";
  }

  function onPickGallery(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files, "galeria");
  }

  function onPickCamera(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files, "camera");
  }

  // ===== Remover antes de enviar =====
  function removeSelected(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ===== Remover já salvo (apaga do storage e da tabela) =====
  async function removeExisting(url: string) {
    if (busy) return;
    setBusy(true);
    try {
      // tenta deletar do storage usando a URL pública
      const mark = "/object/public/";
      const i = url.indexOf(mark);
      if (i > -1) {
        const pathWithBucket = url.slice(i + mark.length);
        const slash = pathWithBucket.indexOf("/");
        const bucket = pathWithBucket.slice(0, slash);
        const path = pathWithBucket.slice(slash + 1);
        await supabase.storage.from(bucket).remove([path]);
      }

      const newExisting = existing.filter((u) => u !== url);
      const { error: updErr } = await supabase
        .from("chamados")
        .update({ fotos: newExisting })
        .eq("id", ticketId);
      if (updErr) throw updErr;

      setExisting(newExisting);
      onSaved?.(newExisting);
      alert("Foto removida.");
    } catch (e) {
      console.error(e);
      alert("Não foi possível remover esta foto agora.");
    } finally {
      setBusy(false);
    }
  }

  // ===== Upload =====
  async function uploadAll() {
    if (busy || files.length === 0) return;
    setBusy(true);
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f)));

      const bucket = "chamados-fotos";
      const tasks = compressed.map(async (file) => {
        const ext = (file.type?.split("/")[1] || "jpg").replace("jpeg","jpg");
        const path = `${ticketId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl as string;
      });

      const settled = await Promise.allSettled(tasks);
      const okUrls = settled
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);

      if (okUrls.length === 0) throw new Error("Falha ao enviar as fotos.");

      const merged = [...existing, ...okUrls].slice(0, MAX);
      const { error: updErr } = await supabase
        .from("chamados")
        .update({ fotos: merged })
        .eq("id", ticketId);
      if (updErr) throw updErr;

      setExisting(merged);
      onSaved?.(merged);

      // limpa seleção e inputs
      setFiles([]);
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";

      alert("Fotos enviadas com sucesso!");
    } catch (e: any) {
      console.error("[uploadAll] ERRO:", e);
      alert(e?.message || "Erro ao enviar fotos.");
    } finally {
      setBusy(false);
    }
  }

  // ===== UI =====
  const wrap: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };
  const thumbBox: React.CSSProperties = {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #ddd",
    background: "#f7f7f7",
  };
  const imgCss: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  const btn: React.CSSProperties = {
    padding: "8px 12px",
    border: "1px solid #999",
    borderRadius: 8,
    cursor: "pointer",
    background: "#fff",
  };
  const delBtn: React.CSSProperties = {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    border: "1px solid #999",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };

  const count = existing.length + files.length;
  const remaining = Math.max(0, MAX - count);

  return (
    <div>
      <h2>FixHostPhotoPicker</h2>
      <div style={{ opacity: 0.8, marginBottom: 8 }}>
        {count}/{MAX} fotos {remaining === 0 ? " (limite atingido)" : ""}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Botão GALERIA (sem capture) */}
        <label style={btn}>
          Adicionar da galeria
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={onPickGallery}
            disabled={remaining === 0}
          />
        </label>

        {/* Botão CÂMERA (com capture) */}
        <label style={btn}>
          Usar câmera
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={onPickCamera}
            disabled={remaining === 0}
          />
        </label>

        <button
          onClick={uploadAll}
          disabled={busy || files.length === 0}
          style={{ ...btn, background: busy || files.length === 0 ? "#eee" : "#000", color: busy || files.length === 0 ? "#666" : "#fff", borderColor: "#000" }}
        >
          {busy ? "Enviando..." : "Enviar fotos"}
        </button>
      </div>

      {/* Já salvas */}
      {existing.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Já no chamado</div>
          <div style={wrap}>
            {existing.map((u) => (
              <div key={u} style={thumbBox}>
                <img src={u} alt="" style={imgCss} />
                <button title="Remover (apaga do chamado)" onClick={() => removeExisting(u)} style={delBtn}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selecionadas (antes de enviar) */}
      {files.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>A enviar</div>
          <div style={wrap}>
            {files.map((f, idx) => {
              const url = URL.createObjectURL(f);
              return (
                <div key={f.name + f.lastModified} style={thumbBox}>
                  <img src={url} alt="" style={imgCss} onLoad={() => URL.revokeObjectURL(url)} />
                  <button title="Remover da seleção" onClick={() => removeSelected(idx)} style={delBtn}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
