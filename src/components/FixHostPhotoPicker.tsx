import { useState } from "react";

type Props = {
  ticketId: string;
  currentUrls: string[];
  onSaved: (urls: string[]) => void;
};

export default function FixHostPhotoPicker({ ticketId, currentUrls, onSaved }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>(currentUrls);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
    if (files.length + selectedFiles.length > 5) {
      alert("Máximo de 5 fotos.");
      return;
    }
    setFiles((prev) => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    console.log("Simulação de upload para Supabase, ticketId:", ticketId);
    onSaved(previewUrls);
  };

  return (
    <div>
      <h2>FixHostPhotoPicker</h2>
      <input
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={handleFileChange}
      />

      <div style={{ display: "flex", flexWrap: "wrap", marginTop: 12, gap: 12 }}>
        {previewUrls.map((url, index) => (
          <div key={index} style={{ position: "relative" }}>
            <img
              src={url}
              alt={`preview-${index}`}
              style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }}
            />
            <button
              onClick={() => handleRemove(index)}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                background: "red",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: 24,
                height: 24,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button onClick={handleSave} style={{ marginTop: 12 }}>
        Salvar Fotos
      </button>
    </div>
  );
}

