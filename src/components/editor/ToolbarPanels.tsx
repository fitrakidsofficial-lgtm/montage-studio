"use client";

import { useState, useRef, type MutableRefObject } from "react";
import type { VideoProject } from "@/lib/types";
import { TEMPLATE_PRESETS, type TemplatePreset } from "@/lib/template-presets";
import { CardEditor } from "../CardEditor";
import { BrollGallery } from "../BrollGallery";

type PanelId =
  | "media"
  | "style"
  | "subtitles"
  | "texte"
  | "brolls"
  | "brand"
  | "audio"
  | null;

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
  activePanel: PanelId;
  // Media
  onUploadVideo: (file: File) => void;
  onTranscribe: () => void;
  onFixSubtitles: () => void;
  onAutoPilot: () => void;
  transcribing: boolean;
  fixingSubs: boolean;
  autoPilot: boolean;
  autoPilotStep: string;
  // Templates
  selectedPresetId: string | null;
  onPreset: (preset: TemplatePreset) => Promise<void>;
  fillingCards: boolean;
  // B-rolls
  brollSuggestions: BrollSuggestion[];
  setBrollSuggestions: (s: BrollSuggestion[]) => void;
  brollFilesRef: MutableRefObject<Map<string, File>>;
  // Audio
  bgMusicFileRef: MutableRefObject<File | null>;
  // Zoom
  zoomIntensity: number;
  setZoomIntensity: (v: number) => void;
}

export function ToolbarPanels({
  project,
  update,
  activePanel,
  onUploadVideo,
  onTranscribe,
  onFixSubtitles,
  onAutoPilot,
  transcribing,
  fixingSubs,
  autoPilot,
  autoPilotStep,
  selectedPresetId,
  onPreset,
  fillingCards,
  brollSuggestions,
  setBrollSuggestions,
  brollFilesRef,
  bgMusicFileRef,
  zoomIntensity,
  setZoomIntensity,
}: Props) {
  if (!activePanel) return null;

  return (
    <div className="w-72 border-r border-zinc-800/50 bg-zinc-900/30 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <h2 className="text-sm font-semibold text-zinc-200">
          {PANEL_TITLES[activePanel]}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activePanel === "media" && (
          <MediaPanel
            project={project}
            update={update}
            onUploadVideo={onUploadVideo}
            onTranscribe={onTranscribe}
            onAutoPilot={onAutoPilot}
            transcribing={transcribing}
            autoPilot={autoPilot}
            autoPilotStep={autoPilotStep}
          />
        )}
        {activePanel === "style" && (
          <StylePanel
            selectedPresetId={selectedPresetId}
            onPreset={onPreset}
            fillingCards={fillingCards}
          />
        )}
        {activePanel === "subtitles" && (
          <SubtitlesPanel
            project={project}
            update={update}
            onFixSubtitles={onFixSubtitles}
            fixingSubs={fixingSubs}
          />
        )}
        {activePanel === "texte" && (
          <TextePanel project={project} update={update} />
        )}
        {activePanel === "brolls" && (
          <BrollsPanel
            project={project}
            update={update}
            brollSuggestions={brollSuggestions}
            setBrollSuggestions={setBrollSuggestions}
            brollFilesRef={brollFilesRef}
          />
        )}
        {activePanel === "brand" && (
          <BrandPanel project={project} update={update} />
        )}
        {activePanel === "audio" && (
          <AudioPanel
            project={project}
            update={update}
            bgMusicFileRef={bgMusicFileRef}
            zoomIntensity={zoomIntensity}
            setZoomIntensity={setZoomIntensity}
          />
        )}
      </div>
    </div>
  );
}

const PANEL_TITLES: Record<string, string> = {
  media: "Media",
  style: "Style de montage",
  subtitles: "Sous-titres",
  texte: "Textes & Cards",
  brolls: "B-rolls",
  brand: "Marque",
  audio: "Audio & Effets",
};

// ── Panel: Media ──

function MediaPanel({
  project,
  update,
  onUploadVideo,
  onTranscribe,
  onAutoPilot,
  transcribing,
  autoPilot,
  autoPilotStep,
}: {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  onUploadVideo: (file: File) => void;
  onTranscribe: () => void;
  onAutoPilot: () => void;
  transcribing: boolean;
  autoPilot: boolean;
  autoPilotStep: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasVideo = !!project.mainVideoUrl;
  const hasSubs = project.subtitles.length > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Language */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">Langue</label>
        <div className="flex gap-1.5">
          {(
            [
              { label: "Auto", value: "auto" },
              { label: "FR", value: "fr" },
              { label: "AR", value: "ar" },
              { label: "EN", value: "en" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ language: opt.value })}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (project.language ?? "auto") === opt.value
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload */}
      <button
        onClick={() => inputRef.current?.click()}
        className={`w-full rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          hasVideo
            ? "border-emerald-600/50 bg-emerald-900/10"
            : "border-zinc-700 hover:border-zinc-500"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadVideo(f);
          }}
        />
        <div
          className={`text-sm ${hasVideo ? "text-emerald-400" : "text-zinc-400"}`}
        >
          {hasVideo
            ? `Video chargee (${project.mainVideoDurationSeconds.toFixed(0)}s)`
            : "Importer une video"}
        </div>
      </button>

      {/* Auto-pilot */}
      {hasVideo && !hasSubs && !autoPilot && (
        <button
          onClick={onAutoPilot}
          className="w-full bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500 text-white rounded-xl px-4 py-3.5 text-sm font-semibold transition-all"
        >
          Creer mon montage
        </button>
      )}

      {autoPilot && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-zinc-300 font-medium">
              Montage en cours
            </span>
          </div>
          <div className="text-xs text-zinc-500">{autoPilotStep}</div>
        </div>
      )}

      {/* Transcribe */}
      {hasVideo && !hasSubs && !autoPilot && (
        <button
          onClick={onTranscribe}
          disabled={transcribing}
          className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors"
        >
          {transcribing ? "Transcription..." : "Transcrire uniquement"}
        </button>
      )}
    </div>
  );
}

// ── Panel: Style ──

function StylePanel({
  selectedPresetId,
  onPreset,
  fillingCards,
}: {
  selectedPresetId: string | null;
  onPreset: (preset: TemplatePreset) => Promise<void>;
  fillingCards: boolean;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4 space-y-2">
      {fillingCards && (
        <div className="rounded-lg bg-zinc-800/60 px-3 py-2 text-xs text-zinc-400">
          L&apos;IA remplit les textes...
        </div>
      )}
      {TEMPLATE_PRESETS.map((preset) => {
        const isActive = selectedPresetId === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => {
              setLoading(true);
              onPreset(preset).finally(() => setLoading(false));
            }}
            disabled={loading}
            className={`w-full p-3 rounded-xl border text-left transition-all ${
              isActive
                ? "border-zinc-500 bg-zinc-800/80"
                : "border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  preset.style === "educatif"
                    ? "bg-teal-900/50 text-teal-400"
                    : preset.style === "promo"
                      ? "bg-orange-900/50 text-orange-400"
                      : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {preset.style}
              </span>
              <span className="font-medium text-zinc-200 text-sm">
                {preset.name}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {preset.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Panel: Subtitles ──

function SubtitlesPanel({
  project,
  update,
  onFixSubtitles,
  fixingSubs,
}: {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  onFixSubtitles: () => void;
  fixingSubs: boolean;
}) {
  const hasSubs = project.subtitles.length > 0;

  if (!hasSubs) {
    return (
      <div className="p-4 text-sm text-zinc-500">
        Importe une video et lance la transcription pour obtenir des
        sous-titres.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          {project.subtitles.length} segments, {project.words.length} mots
        </span>
        <button
          onClick={() => update({ subtitles: [], words: [] })}
          className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
        >
          Effacer
        </button>
      </div>

      <button
        onClick={onFixSubtitles}
        disabled={fixingSubs}
        className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
      >
        {fixingSubs ? "Correction..." : "Corriger (IA)"}
      </button>

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {project.subtitles.map((s, i) => (
          <div
            key={i}
            className="flex gap-2 items-start p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-[10px] text-zinc-600 mt-0.5 shrink-0 w-10">
              {s.start.toFixed(1)}s
            </span>
            <input
              value={s.text}
              onChange={(e) => {
                const subtitles = project.subtitles.map((sub, j) =>
                  j === i ? { ...sub, text: e.target.value } : sub,
                );
                update({ subtitles });
              }}
              className="flex-1 bg-transparent text-xs text-zinc-300 outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel: Texte / Cards ──

function TextePanel({
  project,
  update,
}: {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
}) {
  if (project.cards.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-500">
        Choisis un style de montage pour generer des cards automatiquement.
      </div>
    );
  }

  return (
    <div className="p-4">
      <CardEditor
        cards={project.cards}
        onChange={(cards) => update({ cards })}
      />
    </div>
  );
}

// ── Panel: B-rolls ──

function BrollsPanel({
  project,
  update,
  brollSuggestions,
  setBrollSuggestions,
  brollFilesRef,
}: {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  brollSuggestions: BrollSuggestion[];
  setBrollSuggestions: (s: BrollSuggestion[]) => void;
  brollFilesRef: MutableRefObject<Map<string, File>>;
}) {
  const [searching, setSearching] = useState(false);
  const hasSubs = project.subtitles.length > 0;

  const handleSuggest = async () => {
    if (!hasSubs) return;
    setSearching(true);
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
      if (res.ok && data.suggestions) setBrollSuggestions(data.suggestions);
    } catch {}
    setSearching(false);
  };

  return (
    <div className="p-4 space-y-3">
      {hasSubs && (
        <button
          onClick={handleSuggest}
          disabled={searching}
          className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
        >
          {searching ? "Recherche..." : "Suggerer des B-rolls (IA)"}
        </button>
      )}

      {/* Suggestions */}
      {brollSuggestions.length > 0 && (
        <div className="space-y-3">
          {brollSuggestions.map((s, si) => (
            <div
              key={si}
              className="rounded-lg bg-zinc-800/30 p-2.5 space-y-1.5"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs text-amber-400 font-medium">
                  {s.keyword}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {s.startTime.toFixed(1)}s
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[...s.images.slice(0, 3), ...s.videos.slice(0, 3)].map(
                  (media) => (
                    <button
                      key={media.id}
                      onClick={() => {
                        update({
                          brolls: [
                            ...project.brolls,
                            {
                              id: crypto.randomUUID(),
                              startTime: s.startTime,
                              endTime: s.endTime,
                              fileUrl: media.url,
                              mediaType: media.type,
                            },
                          ],
                        });
                        setBrollSuggestions(
                          brollSuggestions.filter((_, i) => i !== si),
                        );
                      }}
                      className="rounded overflow-hidden border border-transparent hover:border-zinc-500 transition-colors"
                    >
                      <img
                        src={media.thumb}
                        alt=""
                        className="w-full h-14 object-cover"
                      />
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BrollGallery
        brolls={project.brolls}
        onChange={(brolls) => update({ brolls })}
        brollFilesRef={brollFilesRef}
      />
    </div>
  );
}

// ── Panel: Brand ──

function BrandPanel({
  project,
  update,
}: {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Hook */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">
          Hook (accroche)
        </label>
        <input
          value={project.introText ?? ""}
          onChange={(e) => update({ introText: e.target.value || null })}
          placeholder="Texte d'accroche..."
          className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
        />
        <div className="flex gap-1.5 mt-1.5">
          {(["overlay", "card"] as const).map((s) => (
            <button
              key={s}
              onClick={() => update({ hookStyle: s })}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                project.hookStyle === s
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/60 text-zinc-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">
          Objectif CTA
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { value: null, label: "Aucun" },
              { value: "engagement", label: "Engagement" },
              { value: "save", label: "Enregistrer" },
              { value: "share", label: "Partager" },
              { value: "subscribe", label: "S'abonner" },
              { value: "traffic", label: "Trafic" },
              { value: "sale", label: "Vente" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value ?? "none"}
              onClick={() => update({ ctaObjective: opt.value })}
              className={`px-2 py-1.5 rounded-lg text-[11px] transition-colors ${
                project.ctaObjective === opt.value
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subtitle font size */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">
          Taille sous-titres
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={40}
            max={120}
            step={2}
            value={project.subtitleFontSize ?? 72}
            onChange={(e) =>
              update({ subtitleFontSize: Number(e.target.value) })
            }
            className="flex-1 accent-zinc-400"
          />
          <span className="text-xs text-zinc-400 w-8 text-right">
            {project.subtitleFontSize ?? 72}
          </span>
        </div>
      </div>

      {/* Subtitle font */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">
          Police sous-titres
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Defaut", value: "" },
            { label: "Itim", value: "'Itim', sans-serif" },
            { label: "Luckiest Guy", value: "'Luckiest Guy', sans-serif" },
            { label: "Arial", value: "Arial, sans-serif" },
            { label: "Impact", value: "Impact, sans-serif" },
            { label: "Georgia", value: "Georgia, serif" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ subtitleFontFamily: opt.value })}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                (project.subtitleFontFamily ?? "") === opt.value
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
              }`}
              style={opt.value ? { fontFamily: opt.value } : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">Logo</label>
        <div className="text-xs text-zinc-600">
          {project.brand.logoUrl ? "Logo actif" : "Aucun logo"}
        </div>
      </div>
    </div>
  );
}

// ── Panel: Audio & Effects ──

function AudioPanel({
  project,
  update,
  bgMusicFileRef,
  zoomIntensity,
  setZoomIntensity,
}: {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  bgMusicFileRef: MutableRefObject<File | null>;
  zoomIntensity: number;
  setZoomIntensity: (v: number) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Music */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">
          Musique de fond
        </label>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 cursor-pointer text-xs text-zinc-400 transition-colors">
          <span>{project.bgMusicUrl ? "Changer" : "Ajouter un MP3"}</span>
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                bgMusicFileRef.current = f;
                update({ bgMusicUrl: URL.createObjectURL(f) });
              }
            }}
          />
        </label>
        {project.bgMusicUrl && (
          <>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-zinc-500 w-10">
                {Math.round((project.bgMusicVolume ?? 0.15) * 100)}%
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
                className="flex-1 accent-zinc-400"
              />
            </div>
            <button
              onClick={() => update({ bgMusicUrl: null })}
              className="mt-1 text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
            >
              Retirer la musique
            </button>
          </>
        )}
      </div>

      {/* Zoom intensity */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">
          Intensite zoom
        </label>
        <div className="flex gap-1.5">
          {[
            { label: "Off", value: 1 },
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
              className={`flex-1 px-1 py-1.5 rounded-lg text-[11px] transition-colors ${
                zoomIntensity === opt.value
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/60 text-zinc-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="pt-2 border-t border-zinc-800/50 space-y-1 text-[11px] text-zinc-600">
        <div>Zooms: {(project.zooms ?? []).length}</div>
        <div>Coupures: {(project.silenceCuts ?? []).length}</div>
        <div>TexteCles: {(project.texteCles ?? []).length}</div>
        <div>
          Pattern Interrupts: {(project.patternInterrupts ?? []).length}
        </div>
      </div>
    </div>
  );
}

export type { PanelId, BrollSuggestion };
