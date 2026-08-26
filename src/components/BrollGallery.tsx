"use client";

import { useCallback, type MutableRefObject } from "react";
import type { BrollItem, BrollLayout } from "@/lib/types";

const LAYOUT_OPTIONS: { value: BrollLayout; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "fullscreen", label: "Plein ecran" },
  { value: "bottom-half", label: "Bas" },
  { value: "top-half", label: "Haut" },
  { value: "overlay", label: "Overlay" },
  { value: "picture-in-picture", label: "PIP" },
  { value: "centered-card", label: "Carte" },
];

interface Props {
  brolls: BrollItem[];
  onChange: (brolls: BrollItem[]) => void;
  brollFilesRef?: MutableRefObject<Map<string, File>>;
}

export function BrollGallery({ brolls, onChange, brollFilesRef }: Props) {
  const handleFiles = useCallback(
    (files: FileList) => {
      const newBrolls: BrollItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith("video/");
        const id = crypto.randomUUID();
        if (brollFilesRef) {
          brollFilesRef.current.set(id, file);
        }
        newBrolls.push({
          id,
          startTime: 0,
          endTime: 3,
          fileUrl: url,
          mediaType: isVideo ? "video" : "image",
        });
      }
      onChange([...brolls, ...newBrolls]);
    },
    [brolls, onChange, brollFilesRef],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const updateBroll = (id: string, field: Partial<BrollItem>) => {
    onChange(brolls.map((b) => (b.id === id ? { ...b, ...field } : b)));
  };

  const deleteBroll = (id: string) => {
    onChange(brolls.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-zinc-600 rounded-xl p-4 text-center cursor-pointer hover:border-amber-500 transition-colors"
      >
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="text-zinc-400 text-sm">
            Deposer images ou videos b-roll ici
          </div>
        </label>
      </div>

      {/* Broll list */}
      {brolls
        .sort((a, b) => a.startTime - b.startTime)
        .map((b) => (
          <div
            key={b.id}
            className="bg-zinc-800 rounded-lg p-3 flex gap-3 items-start"
          >
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900">
              {b.mediaType === "image" ? (
                <img
                  src={b.fileUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={b.fileUrl}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
            </div>

            {/* Timing */}
            <div className="flex-1 space-y-1">
              <div className="flex gap-2">
                <div>
                  <label className="text-xs text-zinc-500">Debut (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={b.startTime}
                    onChange={(e) =>
                      updateBroll(b.id, {
                        startTime: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Fin (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={b.endTime}
                    onChange={(e) =>
                      updateBroll(b.id, {
                        endTime: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                  />
                </div>
              </div>
              <div className="text-xs text-zinc-500">
                {b.mediaType === "video" ? "Video" : "Image"} -{" "}
                {(b.endTime - b.startTime).toFixed(1)}s
              </div>
              {/* Layout selector */}
              <div className="flex flex-wrap gap-1 mt-1">
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateBroll(b.id, { layout: opt.value })}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                      (b.layout ?? "auto") === opt.value
                        ? "bg-amber-700/60 text-amber-200"
                        : "bg-zinc-700/40 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={() => deleteBroll(b.id)}
              className="text-red-400 text-xs hover:text-red-300 mt-1"
            >
              X
            </button>
          </div>
        ))}

      {brolls.length === 0 && (
        <div className="text-zinc-500 text-sm text-center py-2">
          Aucun b-roll. Depose tes images/videos ci-dessus.
        </div>
      )}
    </div>
  );
}
