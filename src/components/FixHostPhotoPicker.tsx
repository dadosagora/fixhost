import React, { useRef } from "react";

/**
 * Seletor de fotos simples e confiável:
 * - Abre câmera/galeria no mobile (capture="environment")
 * - Aceita múltiplas imagens
 * - Mostra prévias e permite remover
 * - Entrega ao pai um array de strings "data:*" (base64)
 *   -> o nosso form já converte "data:*" para Blob antes do upload
 */
export default function FixHostPhotoPicker({
  value = [],
  onChange = () => {},
  maxPhotos = 5,
}) {
  const inputRef = useRef(null);

  async function filesToDataUrls(files) {
    const tasks = Array.from(files).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        })
    );
    return Promise.all(tasks);
  }

  async function handlePick(e) {
    const files = e.target.files || [];
    if (!files.length) return;

    const remaining = Math.max(0, maxPhotos - value.length);
    const slice = Array.from(files).slice(0, remaining);
    const dataUrls = await filesToDataUrls(slice);
    onChange([...value, ...dataUrls]);

    // permite selecionar a mesma foto novamente se quiser
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(idx) {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  }

  const disabled = value.length >= maxPhotos;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handlePick}
          className="block w-full text-sm"
          disabled={disabled}
        />
        {disabled && (
          <span className="text-xs text-slate-500">
            Máx. de {maxPhotos} fotos atingido
          </span>
        )}
      </div>

      {Array.isArray(value) && value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {value.map((src, idx) => (
            <div key={idx} className="relative">
              <img
                src={typeof src === "string" ? src : ""}
                alt=""
                className="w-full h-24 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute -top-2 -right-2 rounded-full bg-white border shadow px-2 py-0.5 text-xs"
                aria-label="Remover foto"
                title="Remover"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
