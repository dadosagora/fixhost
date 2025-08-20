import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

type Props = {
  ticketId: string;
  currentUrls?: string[];
  onSaved?: (urls: string[]) => void;
};

export default function FixHostPhotoPicker({ ticketId, currentUrls = [], onSaved }: Props) {
  const MAX = 5;
  const [files, setFiles] = useState<File[]>([]);            // selecionadas (a enviar)
  const [existing, setExisting] = useState<string[]>(currentUrls); // já salvas
  const [busy, setBusy] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

  // ======= LOG VISÍVEL NA TELA =======
  const [logs, setLogs] = useState<string[]>([]);
  function log(msg: string, data?: any) {
    const text = data !== undefined ? `${msg} ${safeJson(data)}` : msg;
    console.log(text);
    setLogs(prev => [...prev, text].slice(-15));
  }
  function safeJson(v: any) {
    try { return JSON.stringify(v); } catch { return String(v); }
  }

  // =================== Utils ===================
  function withSafeName(f: File) {
    const ext = (f.type?.split("/")[1] || "jpg").replace("jpeg", "jpg");
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

  // =================== Seletor ===================
  function handlePicked(list: FileList | null, origem: "galeria" | "camera") {
    log("[handlePicked] origem =", origem);
    try {
      if (!list) { log("[handlePicked] list vazia"); return; }

      const incomingRaw = Array.from(list).map(withSafeName);
      log("[handlePicked] recebidos", incomingRaw.map(f => f.name));

      setFiles((prev) => {
        const existCount = Array.isArray(existing) ? existing.length : 0;
        const room = Math.max(0, MAX - (existCount + prev.length));
        const take = incomingRaw.slice(0, room);
        const merged = [...prev, ...take];
        log("[handlePicked] prev/incoming/merged", { prev: prev.length, incoming: take.length, merged: merged.length, existCount });
        return merged;
      });
    } finally {
      // 🔧 reset do input que foi usado — evita bug quando a ordem é galeria → câmera
      if (origem === "galeria" && galleryRef.current) { galleryRef.current.value = ""; log("[handlePicked] reset input galeria"); }
      if (origem === "camera"  && cameraRef.current)  { cameraRef.current.value  = ""; log("[handlePicked] reset input camera"); }
    }
  }

  // =================== Remoções ===================
  function removeSelected(idx: number) {
    log("[removeSelected] idx =", idx);
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function removeExisting(url: string) {
    if (busy) return;
    setBusy(true);
    log("[removeExisting] url =", url);
    try {
      // Extrai bucket e path a partir da URL pública
      const mark = "/object/public/";
      const i = url.indexOf(mark);
      if (i > -1) {
        const pathWithBucket = url.slice(i + mark.length);
        const slash = pathWithBucket.indexOf("/");
        const bucket = pathWithBucket.slice(0, slash);
        const path = pathWithBucket.slice(slash + 1);
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) { log("[removeExisting] Storage remove error", error.message || error); }
      }

      const newExisting = existing.filter((u) => u !== url);
      const { error: updErr } = await supabase.from("chamados").update({ fotos: newExisting }).eq("id", ticketId);
      if (updErr) throw updErr;

      setExisting(newExisting);
      onSaved?.(newExisting);
      alert("Foto removida.");
    } catch (e: any) {
      log("[removeExisting] ERRO", e?.message || e);
      alert("Não foi possível remover esta foto agora.");
    } finally {
      setBusy(false);
    }
  }

  // =================== Upload ===================
  async function uploadAll() {
    if (busy || files.length === 0) return;
    setBusy(true);
    log("[uploadAll] iniciando", files.length);
    try {
      // 1) comprime
      const compressed = await Promise.all(files.map((f) => compressImage(f)));
      log("[uploadAll] comprimidas", compressed.map(f => f.name));

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

      const settled = await Promise.allSettled(tasks);
      const okUrls = settled
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);

      log("[uploadAll] okUrls", okUrls);

      if (okUrls.length === 0) throw new Error("Falha ao enviar as fotos.");

      const merged = [...existing, ...okUrls].slice(0, MAX);
      const { error: updErr } = await supabase.from("chamados").update({ fotos: merged }).eq("id", ticketId);
      if (updErr) throw updErr;

      setExisting(merged);
      onSaved?.(merged);

      // limpa seleção e inputs
      setFiles([]);
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      log("[uploadAll] concluído, merged", merged);

      alert("Fotos enviadas com sucesso!");
    } catch (e: any) {
      log("[uploadAll] ERRO", e?.message || e);
      alert(e?.message || "Erro ao enviar fotos.");
    } finally {
      setBusy(false);
    }
  }

  // =================== UI ===================
  const wrap: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };
  const thumbBox: React.CSSProperties = {
    position: "relative",
    width: 112,
    height: 112,
    border: "1px solid #ccc",
    borderRadius: 8,
    overflow: "hidden",
    background: "#f7f7f7",
  };
  const imgCss: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
  const btn: React.CSSProperties = {
    padding: "8px 12px",
    border: "1px solid #999",
    borderRadius: 8,
    cursor: "pointer",
    background: "#fff",
  };
  const delBtn: React.CSSProperties = {
    position: "absolute",
    right: -8,
    top: -8,
    width: 32,
    height: 32,
    borderRadius: 18,
    border: "1px solid #999",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };

  const count = existing.length + files.length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ opacity: 0.8, fontSize: 14 }}>{count}/{MAX} fotos</div>

      {/* Seletores */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={btn}>
          Adicionar da galeria
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handlePicked(e.target.files, "galeria")}
            disabled={count >= MAX}
          />
        </label>

        <label style={btn}>
          Usar câmera
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handlePicked(e.target.files, "camera")}
            disabled={count >= MAX}
          />
        </label>

        <button
          onClick={uploadAll}
          disabled={busy || files.length === 0}
          style={{
            ...btn,
            background: busy || files.length === 0 ? "#eee" : "#000",
            color: busy || files.length === 0 ? "#666" : "#fff",
            borderColor: "#000",
          }}
        >
          {busy ? "Enviando..." : "Enviar fotos"}
        </button>
      </div>

      {/* Já no chamado (com 🗑️ remover depois de enviado) */}
      {existing.length > 0 && (
        <div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Já no chamado</div>
          <div style={wrap}>
            {existing.map((u) => (
              <div key={u} style={thumbBox}>
                <img src={u} style={imgCss} alt="" />
                <button title="Remover (apaga do chamado)" onClick={() => removeExisting(u)} style={delBtn}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A enviar (com ✕ remover antes de enviar) */}
      {files.length > 0 && (
        <div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>A enviar</div>
          <div style={wrap}>
            {files.map((f, idx) => {
              const url = URL.createObjectURL(f);
              return (
                <div key={f.name + f.lastModified} style={thumbBox}>
                  <img src={url} style={imgCss} alt="" onLoad={() => URL.revokeObjectURL(url)} />
                  <button title="Remover da seleção" onClick={() => removeSelected(idx)} style={delBtn}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====== LOGS NA TELA ====== */}
      <div style={{
        background: "#000",
        color: "#0f0",
        fontSize: "12px",
        padding: "6px",
        marginTop: "10px",
        maxHeight: "140px",
        overflowY: "auto",
        borderRadius: 6
      }}>
        {logs.length === 0 ? <div>(sem logs ainda)</div> : logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
