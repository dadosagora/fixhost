import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

type Props = {
  ticketId: string;           // UUID do chamado
  currentUrls?: string[];     // URLs já salvas no chamado
  onSaved?: (urls: string[]) => void;
};

type LocalFile = {
  file: File;
  previewUrl: string;         // URL estável até remover/enviar
};

const MAX = 5;
const BUCKET = "chamados-fotos";
const TABLE_NAME = "chamados";

/** Util: lê um File como dataURL */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error || new Error("FileReader error"));
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

/** Converte via <img> para JPEG (compatível com Android/iOS) */
async function imgToJpegViaTag(file: File, maxSide = 1600, quality = 0.8): Promise<File> {
  const dataURL = await readAsDataURL(file);
  const img = new Image();
  img.decoding = "sync";
  img.loading = "eager";
  img.src = dataURL;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Falha ao carregar <img>"));
  });

  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob falhou"))), "image/jpeg", quality)
  );

  const name = file.name.replace(/\.(png|jpg|jpeg|webp|heic|heif)$/i, ".jpg");
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

/** Compressão segura: tenta ImageBitmap → <img> → fallback original */
async function compressSafeToJpeg(file: File, maxSide = 1600, quality = 0.8): Promise<File> {
  const type = (file.type || "").toLowerCase();
  const looksSupported = /jpeg|jpg|png|webp/.test(type);
  if (!looksSupported) {
    // HEIC/HEIF e afins → envia original (Supabase aceita)
    return file;
  }

  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, w, h);

    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob falhou"))), "image/jpeg", quality)
    );
    const name = file.name.replace(/\.(png|jpg|jpeg|webp|heic|heif)$/i, ".jpg");
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    try {
      return await imgToJpegViaTag(file, maxSide, quality);
    } catch {
      return file;
    }
  }
}

/** Garante nome/tipo e evita sumiço de seleção entre galeria e câmera */
function withSafeName(f: File) {
  const ext = (f.type?.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const safe = f.name && f.name.trim().length ? f.name : `${crypto.randomUUID()}.${ext}`;
  return new File([f], safe, { type: f.type || "image/jpeg", lastModified: Date.now() });
}

export default function FixHostPhotoPicker({ ticketId, currentUrls = [], onSaved }: Props) {
  const [pending, setPending] = useState<LocalFile[]>([]);
  const [existing, setExisting] = useState<string[]>(currentUrls || []);
  const [busy, setBusy] = useState(false);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setExisting(Array.isArray(currentUrls) ? currentUrls : []);
  }, [currentUrls]);

  // ---------- seleção ----------
  function addFiles(list: FileList | null, origem: "galeria" | "camera") {
    if (!list) return;
    const incoming = Array.from(list).map(withSafeName);
    setPending((prev) => {
      const room = Math.max(0, MAX - (existing.length + prev.length));
      const take = incoming.slice(0, room).map((f) => ({
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));
      return [...prev, ...take];
    });
    if (origem === "galeria" && galleryRef.current) galleryRef.current.value = "";
    if (origem === "camera" && cameraRef.current) cameraRef.current.value = "";
  }

  function onPickGallery(e: React.ChangeEvent<HTMLInputElement>) { addFiles(e.target.files, "galeria"); }
  function onPickCamera(e: React.ChangeEvent<HTMLInputElement>) { addFiles(e.target.files, "camera"); }

  // ---------- remover ----------
  function removeSelected(idx: number) {
    setPending((prev) => {
      const clone = [...prev];
      const item = clone[idx];
      if (item) URL.revokeObjectURL(item.previewUrl);
      clone.splice(idx, 1);
      return clone;
    });
  }

  async function removeExisting(url: string) {
    if (busy) return;
    setBusy(true);
    try {
      // remove do Storage
      const mark = "/object/public/";
      const i = url.indexOf(mark);
      if (i > -1) {
        const pathWithBucket = url.slice(i + mark.length);
        const slash = pathWithBucket.indexOf("/");
        const bucket = pathWithBucket.slice(0, slash);
        const path = pathWithBucket.slice(slash + 1);
        await supabase.storage.from(bucket).remove([path]);
      }

      // atualiza tabela
      const newExisting = existing.filter((u) => u !== url);
      const { error: updErr } = await supabase
        .from(TABLE_NAME)
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

  // ---------- upload ----------
  async function uploadAll() {
    if (busy || pending.length === 0) return;
    setBusy(true);
    try {
      const prepared = await Promise.all(pending.map((p) => compressSafeToJpeg(p.file)));

      // pasta do chamado = ticketId (oficial)
      const basePath = ticketId;

      const tasks = prepared.map(async (file) => {
        const type = file.type || "image/jpeg";
        const ext = (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const path = `${basePath}/${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: type,
          upsert: false,
        });
        if (upErr) throw upErr;

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return data.publicUrl as string;
      });

      const settled = await Promise.allSettled(tasks);
      const okUrls = settled
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);

      if (okUrls.length === 0) throw new Error("Falha ao enviar as fotos.");

      const merged = [...existing, ...okUrls].slice(0, MAX);

      // grava na tabela (produção)
      const { error: updErr } = await supabase
        .from(TABLE_NAME)
        .update({ fotos: merged })
        .eq("id", ticketId);
      if (updErr) throw updErr;

      // limpa previews e estado
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPending([]);
      setExisting(merged);
      onSaved?.(merged);

      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      alert("Fotos enviadas e salvas com sucesso!");
    } catch (e: any) {
      console.error("[uploadAll] ERRO:", e);
      alert(e?.message || "Erro ao enviar fotos.");
    } finally {
      setBusy(false);
    }
  }

  // ---------- UI (igual ao layout que você gostou) ----------
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

  const count = existing.length + pending.length;
  const remaining = Math.max(0, MAX - count);

  return (
    <div>
      <h2>FixHostPhotoPicker</h2>
      <div style={{ opacity: 0.8, marginBottom: 8 }}>
        {count}/{MAX} fotos {remaining === 0 ? " (limite atingido)" : ""}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
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
          disabled={busy || pending.length === 0}
          style={{
            ...btn,
            background: busy || pending.length === 0 ? "#eee" : "#000",
            color: busy || pending.length === 0 ? "#666" : "#fff",
            borderColor: "#000",
          }}
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
                <button title="Remover (apaga do chamado)" onClick={() => removeExisting(u)} style={delBtn}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A enviar */}
      {pending.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>A enviar</div>
          <div style={wrap}>
            {pending.map((p, idx) => (
              <div key={p.file.name + p.file.lastModified + idx} style={thumbBox}>
                <img src={p.previewUrl} alt="" style={imgCss} />
                <button title="Remover da seleção" onClick={() => removeSelected(idx)} style={delBtn}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
