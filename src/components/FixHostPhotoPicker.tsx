import { useState, useRef } from "react";

type Props = {
  ticketId: string;
  currentUrls: string[];
  onSaved: (urls: string[]) => void;
};

export default function FixHostPhotoPicker({ ticketId, currentUrls, onSaved }: Props) {
  const MAX = 5;
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>(currentUrls || []);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const room = Math.max(0, MAX - (files.length + previewUrls.length));
    const slice = incoming.slice(0, room);

    const newPreviews = slice.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...slice]);
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  }

  function onPickGallery(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    // importante: limpa o input para permitir escolher novamente o mesmo arquivo depois
    if (galleryRef.current) galleryRef.current.value = "";
  }

  function onPickCamera(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    if (cameraRef.current) cameraRef.current.value = "";
  }

  function handleRemove(idx: number) {
    // remove da lista de previews e do array de files no mesmo índice
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    // ainda é simulação; só retorna as URLs locais para validar o fluxo
    console.log("Simulação de upload (teste). ticketId:", ticketId);
    onSaved(previewUrls);
    alert("Simulação concluída: fotos 'salvas' no estado.");
  }

  const count = previewUrls.length;
  const remaining = Math.max(0, MAX - count);

  const btn: React.CSSProperties = {
    padding: "8px 12px",
    border: "1px solid #999",
    borderRadius: 8,
    cursor: "pointer",
    background: "#fff",
  };

  const thumbWrap: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 };
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

        <button onClick={handleSave} style={{ ...btn, background: "#000", color: "#fff", borderColor: "#000" }}>
          Salvar (simulado)
        </button>
      </div>

      <div style={thumbWrap}>
        {previewUrls.map((url, idx) => (
          <div key={idx} style={thumbBox}>
            <img src={url} alt={`preview-${idx}`} style={imgCss} />
            <button onClick={() => handleRemove(idx)} title="Remover" style={delBtn}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
