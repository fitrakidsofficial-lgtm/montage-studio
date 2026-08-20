"use client";

import { useCallback } from "react";

interface Props {
  accept: string;
  label: string;
  onFile: (url: string, file: File) => void;
  currentUrl?: string | null;
}

export function FileUpload({ accept, label, onFile, currentUrl }: Props) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        onFile(url, file);
      }
    },
    [onFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        onFile(url, file);
      }
    },
    [onFile],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-zinc-600 rounded-xl p-6 text-center cursor-pointer hover:border-amber-500 transition-colors"
    >
      <label className="cursor-pointer block">
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        {currentUrl ? (
          <div className="text-emerald-400 text-sm">
            Fichier charge - cliquer pour remplacer
          </div>
        ) : (
          <div>
            <div className="text-zinc-400 text-lg mb-1">{label}</div>
            <div className="text-zinc-500 text-sm">
              Glisser-deposer ou cliquer
            </div>
          </div>
        )}
      </label>
    </div>
  );
}
