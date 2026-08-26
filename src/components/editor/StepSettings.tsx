"use client";

import type { MutableRefObject } from "react";
import type { VideoProject } from "@/lib/types";

interface Props {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  zoomIntensity: number;
  setZoomIntensity: (v: number) => void;
  bgMusicFileRef: MutableRefObject<File | null>;
}

export function StepSettings({
  project,
  update,
  zoomIntensity,
  setZoomIntensity,
  bgMusicFileRef,
}: Props) {
  return (
    <>
      {/* Zoom intensity */}
      <div className="px-4 pt-4 pb-2">
        <label className="text-xs text-zinc-400 block mb-1">
          Intensite du zoom
        </label>
        <div className="flex items-center gap-2">
          {[
            { label: "Aucun", value: 1 },
            { label: "1.1x", value: 1.1 },
            { label: "1.15x", value: 1.15 },
            { label: "1.2x", value: 1.2 },
            { label: "1.3x", value: 1.3 },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setZoomIntensity(opt.value);
                if ((project.zooms ?? []).length > 0) {
                  update({
                    zooms: (project.zooms ?? []).map((z) => ({
                      ...z,
                      scale: opt.value,
                    })),
                  });
                }
              }}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                zoomIntensity === opt.value
                  ? "bg-teal-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background music */}
      <div className="px-4 pt-2 pb-2 space-y-2">
        <label className="text-xs text-zinc-400 block">Musique de fond</label>
        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 cursor-pointer text-xs text-zinc-300 transition-colors">
            <span>{project.bgMusicUrl ? "Changer" : "Ajouter un MP3"}</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  bgMusicFileRef.current = f;
                  const url = URL.createObjectURL(f);
                  update({ bgMusicUrl: url });
                }
              }}
            />
          </label>
          {project.bgMusicUrl && (
            <button
              onClick={() => update({ bgMusicUrl: null })}
              className="px-2 py-2 rounded bg-red-900/40 text-red-400 text-xs hover:bg-red-900/60"
            >
              Retirer
            </button>
          )}
        </div>
        {project.bgMusicUrl && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-16">
              Vol: {Math.round((project.bgMusicVolume ?? 0.15) * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={project.bgMusicVolume ?? 0.15}
              onChange={(e) =>
                update({ bgMusicVolume: parseFloat(e.target.value) })
              }
              className="flex-1 accent-teal-500"
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="p-4 text-xs text-zinc-600 space-y-1">
        <div>
          {project.mainVideoDurationSeconds.toFixed(1)}s - {project.fps}fps -{" "}
          {project.style}
        </div>
        <div>
          Zooms: {(project.zooms ?? []).length} | Coupures:{" "}
          {(project.silenceCuts ?? []).length} | Logo:{" "}
          {project.brand.logoUrl ? "OK" : "-"} | Outro:{" "}
          {project.outroVideoUrl ? "OK" : "-"}
        </div>
      </div>
    </>
  );
}
