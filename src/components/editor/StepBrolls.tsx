"use client";

import { useState, useRef, type MutableRefObject } from "react";
import type { VideoProject } from "@/lib/types";
import { BrollGallery } from "../BrollGallery";

interface BrollSuggestion {
  keyword: string;
  startTime: number;
  endTime: number;
  reason: string;
  images: {
    id: number;
    url: string;
    thumb: string;
    photographer: string;
    type: "image" | "video";
  }[];
  videos: {
    id: number;
    url: string;
    thumb: string;
    photographer: string;
    type: "image" | "video";
  }[];
}

interface Props {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  brollSuggestions: BrollSuggestion[];
  setBrollSuggestions: (s: BrollSuggestion[]) => void;
  stepNumber: number;
  brollFilesRef: MutableRefObject<Map<string, File>>;
}

export function StepBrolls({
  project,
  update,
  brollSuggestions,
  setBrollSuggestions,
  stepNumber,
  brollFilesRef,
}: Props) {
  const [showBrolls, setShowBrolls] = useState(false);
  const [searchingBrolls, setSearchingBrolls] = useState(false);
  const hasSubs = project.subtitles.length > 0;

  const handleSuggestBrolls = async () => {
    if (!hasSubs) return;
    setSearchingBrolls(true);
    try {
      const res = await fetch("/api/suggest-brolls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtitles: project.subtitles,
          duration: project.mainVideoDurationSeconds,
        }),
      });
      const data = await res.json();
      if (res.ok && data.suggestions) {
        setBrollSuggestions(data.suggestions);
        setShowBrolls(true);
      } else {
        alert(data.error || "Erreur suggestions B-rolls");
      }
    } catch (err) {
      alert("Erreur: " + (err as Error).message);
    } finally {
      setSearchingBrolls(false);
    }
  };

  return (
    <div className="p-4 border-b border-zinc-800">
      <button
        onClick={() => setShowBrolls(!showBrolls)}
        className="w-full flex items-center justify-between"
      >
        <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
          {stepNumber}. B-rolls
          {project.brolls.length > 0 && ` (${project.brolls.length})`}
        </div>
        <span className="text-zinc-500 text-sm">{showBrolls ? "v" : ">"}</span>
      </button>
      {showBrolls && (
        <div className="mt-3 space-y-3">
          {hasSubs && (
            <button
              onClick={handleSuggestBrolls}
              disabled={searchingBrolls}
              className="w-full bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-700 text-white rounded-xl px-4 py-3 text-sm font-bold transition-colors"
            >
              {searchingBrolls
                ? "Recherche en cours..."
                : "Suggerer des B-rolls (IA)"}
            </button>
          )}

          {brollSuggestions.length > 0 && (
            <BrollSuggestionsPanel
              suggestions={brollSuggestions}
              project={project}
              update={update}
              onDismiss={(si) =>
                setBrollSuggestions(brollSuggestions.filter((_, i) => i !== si))
              }
              onClose={() => setBrollSuggestions([])}
            />
          )}

          <BrollGallery
            brolls={project.brolls}
            onChange={(brolls) => update({ brolls })}
            brollFilesRef={brollFilesRef}
          />
        </div>
      )}
    </div>
  );
}

function PreviewThumb({
  thumb,
  fullUrl,
  alt,
  isVideo,
  onClick,
}: {
  thumb: string;
  fullUrl: string;
  alt: string;
  isVideo: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`rounded-lg overflow-hidden border-2 transition-colors relative ${
        isVideo
          ? "border-transparent hover:border-teal-500"
          : "border-transparent hover:border-amber-500"
      }`}
    >
      <img src={thumb} alt={alt} className="w-full h-20 object-cover" />
      {isVideo && (
        <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-[9px] text-white px-1 rounded">
          VIDEO
        </div>
      )}
      {/* Hover preview */}
      {hover && (
        <div
          className="fixed z-[999] pointer-events-none"
          style={{
            top: (ref.current?.getBoundingClientRect().top ?? 0) - 320,
            left: Math.max(
              8,
              (ref.current?.getBoundingClientRect().left ?? 0) - 80,
            ),
          }}
        >
          <div
            className="bg-zinc-900 border border-zinc-600 rounded-xl shadow-2xl overflow-hidden"
            style={{ width: 300, height: 300 }}
          >
            {isVideo ? (
              <video
                src={fullUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <img
                src={fullUrl}
                alt={alt}
                className="w-full h-full object-contain bg-black"
              />
            )}
          </div>
          <div className="text-center text-[10px] text-zinc-400 mt-1 bg-zinc-900/90 rounded px-2 py-0.5">
            Clique pour ajouter
          </div>
        </div>
      )}
    </button>
  );
}

function BrollSuggestionsPanel({
  suggestions,
  project,
  update,
  onDismiss,
  onClose,
}: {
  suggestions: BrollSuggestion[];
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  onDismiss: (index: number) => void;
  onClose: () => void;
}) {
  const addBroll = (
    si: number,
    suggestion: BrollSuggestion,
    url: string,
    mediaType: "image" | "video",
  ) => {
    update({
      brolls: [
        ...project.brolls,
        {
          id: crypto.randomUUID(),
          startTime: suggestion.startTime,
          endTime: suggestion.endTime,
          fileUrl: url,
          mediaType,
        },
      ],
    });
    onDismiss(si);
  };

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion, si) => (
        <div key={si} className="bg-zinc-800/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-amber-400 font-bold">
              {suggestion.keyword}
            </div>
            <div className="text-[10px] text-zinc-500">
              {suggestion.startTime.toFixed(1)}s -{" "}
              {suggestion.endTime.toFixed(1)}s
            </div>
          </div>
          <div className="text-[11px] text-zinc-400">{suggestion.reason}</div>
          {suggestion.images.length > 0 || suggestion.videos.length > 0 ? (
            <div className="space-y-1.5">
              {suggestion.images.length > 0 && (
                <div>
                  <div className="text-[10px] text-zinc-500 mb-1">Images</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {suggestion.images.map((img) => (
                      <PreviewThumb
                        key={img.id}
                        thumb={img.thumb}
                        fullUrl={img.url}
                        alt={suggestion.keyword}
                        isVideo={false}
                        onClick={() =>
                          addBroll(si, suggestion, img.url, "image")
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
              {suggestion.videos.length > 0 && (
                <div>
                  <div className="text-[10px] text-zinc-500 mb-1">Videos</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {suggestion.videos.map((vid) => (
                      <PreviewThumb
                        key={vid.id}
                        thumb={vid.thumb}
                        fullUrl={vid.url}
                        alt={suggestion.keyword}
                        isVideo
                        onClick={() =>
                          addBroll(si, suggestion, vid.url, "video")
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-zinc-600">
              Pas de resultats (ajoute PEXELS_API_KEY dans .env.local)
            </div>
          )}
        </div>
      ))}
      <button
        onClick={onClose}
        className="text-xs text-zinc-500 hover:text-zinc-400"
      >
        Fermer les suggestions
      </button>
    </div>
  );
}
