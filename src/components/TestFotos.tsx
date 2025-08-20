import { useState, useRef } from "react";

export default function TestFotos() {
  const [files, setFiles] = useState<File[]>([]);
  const galRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  function handlePicked(list: FileList | null, origem: "galeria" | "camera") {
    if (!list) return;
    const incoming = Array.from(list).map((f) => {
      // dá nome se vier sem name
      const ext = (f.type?.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const name = f.name && f.name.trim().length ? f.name : `${crypto.randomUUID()}.${ext}`;
      return new File([f], name, { type: f.type || "image/jpeg", lastModified: Date.now() });
    });
    console.log(`[${origem}] adicionando`, incoming.map(f => f.name));
    // MERGE — não substitui a seleção anterior
    setFiles((prev) => [...prev, ...incoming].slice(0, 5));
  }

  function removeSelected(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Teste de Fotos (sem Supabase)</h3>
      <p>{files.length}/5 fotos selecionadas</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <label style={{ padding: "8px 12px", border: "1px solid #999", borderRadius: 8, cursor: "pointer" }}>
          Adicionar da galeria
          <input
            ref={galRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handlePicked(e.target.files, "galeria")}
          />
        </label>

        <label style={{ padding: "8px 12px", border: "1px solid #999", borderRadius: 8, cursor: "pointer" }}>
          Usar câmera
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handlePicked(e.target.files, "camera")}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {files.map((f, idx) => {
          const url = URL.createObjectURL(f);
          return (
            <div key={f.name + f.lastModified} style={{ position: "relative" }}>
              <img
                src={url}
                width={120}
                height={120}
                style={{ objectFit: "cover", borderRadius: 8, border: "1px solid #ccc" }}
                onLoad={() => URL.revokeObjectURL(url)}
              />
              <button
                onClick={() => removeSelected(idx)}
                style={{
                  position: "absolute",
                  right: -8,
                  top: -8,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  border: "1px solid #999",
                  background: "#fff",
                  cursor: "pointer",
                }}
                title="Remover antes de enviar"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
