"use client";

import { useEffect, useState, useRef, type MutableRefObject } from "react";
import { BRAND_PRESETS, type VideoProject } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { TEMPLATE_PRESETS, type TemplatePreset } from "@/lib/template-presets";
import {
  MISSION_SOURATES_EPISODES,
  SERIE_LABELS,
  SOURATES,
  type SerieId,
  type SourateEpisode,
  type SourateName,
} from "@/lib/mission-sourates-episodes";
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
  | "publish"
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
  onEpisode: (episode: SourateEpisode) => void;
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
  onEpisode,
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
            onEpisode={onEpisode}
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
        {activePanel === "publish" && (
          <PublishPanel project={project} update={update} />
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
  publish: "Publier",
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
  onEpisode,
  fillingCards,
}: {
  selectedPresetId: string | null;
  onPreset: (preset: TemplatePreset) => Promise<void>;
  onEpisode: (episode: SourateEpisode) => void;
  fillingCards: boolean;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4 space-y-2">
      <EpisodePicker onEpisode={onEpisode} />
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

// ── Episodes Mission Sourates ──

function EpisodePicker({
  onEpisode,
}: {
  onEpisode: (episode: SourateEpisode) => void;
}) {
  const [sourate, setSourate] = useState<SourateName>(SOURATES[0]);
  const [serie, setSerie] = useState<SerieId>("mot");

  const episode = MISSION_SOURATES_EPISODES.find(
    (e) => e.sourate === sourate && e.serie === serie,
  );

  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-3 space-y-2 mb-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
        Épisodes Mission Sourates
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={sourate}
          onChange={(e) => setSourate(e.target.value as SourateName)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200"
        >
          {SOURATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={serie}
          onChange={(e) => setSerie(e.target.value as SerieId)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200"
        >
          {(Object.keys(SERIE_LABELS) as SerieId[]).map((s) => (
            <option key={s} value={s}>
              {SERIE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      {episode && (
        <div className="text-[11px] text-zinc-400 leading-snug">
          <span className="text-zinc-500">#{episode.num}</span> {episode.hook}
        </div>
      )}
      <button
        onClick={() => episode && onEpisode(episode)}
        disabled={!episode}
        className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg px-3 py-2 text-xs font-bold transition-colors"
      >
        Charger l&apos;épisode
      </button>
      <div className="text-[10px] text-zinc-600 leading-snug">
        Remplit l&apos;énigme, le reveal et le CTA. Les versets restent à coller
        depuis ta source.
      </div>
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

      {/* Suggestions — user picks before adding */}
      {brollSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">
              {brollSuggestions.length} suggestion
              {brollSuggestions.length > 1 ? "s" : ""} — clique pour ajouter
            </span>
            <button
              onClick={() => setBrollSuggestions([])}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Tout fermer
            </button>
          </div>
          {brollSuggestions.map((s, si) => {
            const allMedia = [...s.images.slice(0, 4), ...s.videos.slice(0, 4)];
            return (
              <div
                key={si}
                className="rounded-lg bg-zinc-800/30 p-2.5 space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs text-amber-400 font-medium">
                    {s.keyword}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {s.startTime.toFixed(1)}s — {s.endTime.toFixed(1)}s
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 italic leading-snug">
                  {s.reason}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {allMedia.map((media) => (
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
                      className="group relative rounded overflow-hidden border-2 border-transparent hover:border-amber-500 transition-colors"
                    >
                      <img
                        src={media.thumb}
                        alt={s.keyword}
                        className="w-full h-16 object-cover"
                      />
                      {media.type === "video" && (
                        <span className="absolute top-0.5 right-0.5 bg-black/60 text-[8px] text-white px-1 rounded">
                          VID
                        </span>
                      )}
                      <span className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/20 transition-colors flex items-center justify-center">
                        <span className="text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          +
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {allMedia[0]?.photographer && (
                  <div className="text-[9px] text-zinc-600">
                    par {allMedia[0].photographer}
                  </div>
                )}
              </div>
            );
          })}
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
      {/* Charte */}
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">Charte</label>
        <div className="flex gap-1.5">
          {BRAND_PRESETS.map((b) => {
            const active = project.brand.colors.teal === b.brand.colors.teal;
            return (
              <button
                key={b.id}
                onClick={() => update({ brand: { ...b.brand } })}
                className={`flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] transition-colors ${
                  active
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="flex gap-0.5">
                  {[
                    b.brand.colors.teal,
                    b.brand.colors.gold,
                    b.brand.colors.orange,
                  ].map((c) => (
                    <span
                      key={c}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                {b.name}
              </button>
            );
          })}
        </div>
      </div>

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

// ── Panel: Publish ──

function PublishPanel({
  project,
  update,
}: {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    mediaId?: string;
    permalink?: string;
  } | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState(
    project.captions?.instagram?.caption || "",
  );
  const [mediaType, setMediaType] = useState<
    "REELS" | "STORIES" | "IMAGE" | "CAROUSEL"
  >("REELS");
  const [carouselUrls, setCarouselUrls] = useState("");
  const [instagramUserId, setInstagramUserId] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [instagramConfigured, setInstagramConfigured] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [tiktokConfigured, setTikTokConfigured] = useState(false);
  const [tiktokPrivacyOptions, setTikTokPrivacyOptions] = useState<string[]>([]);
  const [tiktokPrivacy, setTikTokPrivacy] = useState("");
  const [tiktokPublishing, setTikTokPublishing] = useState(false);
  const [tiktokResult, setTikTokResult] = useState("");
  const [youtubeConfigured, setYouTubeConfigured] = useState(false);
  const [youtubePublishing, setYouTubePublishing] = useState(false);
  const [youtubePrivacy, setYouTubePrivacy] = useState<
    "private" | "unlisted" | "public"
  >("private");
  const [youtubeResult, setYouTubeResult] = useState("");

  const [dmKeyword, setDmKeyword] = useState("");
  const [dmMessage, setDmMessage] = useState("");
  const [dmButtonTitle, setDmButtonTitle] = useState("");
  const [dmButtonUrl, setDmButtonUrl] = useState("");
  const [dmSaved, setDmSaved] = useState(false);
  const publishMediaUrl = mediaUrl || project.trailerVideoUrl || "";

  useEffect(() => {
    if (!project.studioProjectId) return;
    const workspaceId = project.studioProjectId;
    void Promise.all([
      apiJson<{
        workspace: {
          dmConfig?: {
            keyword?: string;
            message?: string;
            buttonTitle?: string;
            buttonUrl?: string;
          };
        };
      }>(`/api/workspaces/${workspaceId}`),
      apiJson<{ configured: boolean; userId?: string }>(
        `/api/workspaces/${workspaceId}/instagram`,
      ),
      apiJson<{
        configured: boolean;
        valid?: boolean;
        privacyOptions?: string[];
      }>(`/api/workspaces/${workspaceId}/tiktok`),
      apiJson<{ configured: boolean }>(
        `/api/workspaces/${workspaceId}/youtube`,
      ),
    ])
      .then(
        ([workspaceResult, instagramResult, tiktokResult, youtubeResult]) => {
        const dm = workspaceResult.workspace.dmConfig ?? {};
        setDmKeyword(dm.keyword ?? "");
        setDmMessage(dm.message ?? "");
        setDmButtonTitle(dm.buttonTitle ?? "");
        setDmButtonUrl(dm.buttonUrl ?? "");
        setInstagramConfigured(instagramResult.configured);
        setInstagramUserId(instagramResult.userId ?? "");
        setTikTokConfigured(Boolean(tiktokResult.configured && tiktokResult.valid));
        const options = tiktokResult.privacyOptions ?? [];
        setTikTokPrivacyOptions(options);
        setTikTokPrivacy(options[0] ?? "");
        setYouTubeConfigured(youtubeResult.configured);
        },
      )
      .catch(() => undefined);
  }, [project.studioProjectId]);

  const handlePublish = async () => {
    if (mediaType === "CAROUSEL") {
      const urls = carouselUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);
      if (urls.length < 2) return;
      setPublishing(true);
      setResult(null);
      try {
        const res = await fetch("/api/publish-instagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.studioProjectId,
            videoProjectId: project.id,
            imageUrls: urls,
            caption,
            mediaType,
          }),
        });
        setResult(await res.json());
      } catch {
        setResult({ error: "Erreur reseau" });
      } finally {
        setPublishing(false);
      }
      return;
    }

    if (!publishMediaUrl) return;
    setPublishing(true);
    setResult(null);
    try {
      const res = await fetch("/api/publish-instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.studioProjectId,
          videoProjectId: project.id,
          mediaUrl: publishMediaUrl,
          caption,
          mediaType,
        }),
      });
      setResult(await res.json());
    } catch {
      setResult({ error: "Erreur reseau" });
    } finally {
      setPublishing(false);
    }
  };

  const saveDmConfig = async () => {
    if (!project.studioProjectId) return;
    await apiJson(`/api/workspaces/${project.studioProjectId}`, {
      method: "PATCH",
      body: JSON.stringify({
        dmConfig: {
          keyword: dmKeyword,
          message: dmMessage,
          buttonTitle: dmButtonTitle,
          buttonUrl: dmButtonUrl,
        },
      }),
    });
    setDmSaved(true);
    window.setTimeout(() => setDmSaved(false), 2000);
  };

  const saveInstagramAccount = async () => {
    if (!project.studioProjectId || !instagramUserId || !instagramToken) return;
    await apiJson(`/api/workspaces/${project.studioProjectId}/instagram`, {
      method: "PUT",
      body: JSON.stringify({
        userId: instagramUserId,
        accessToken: instagramToken,
      }),
    });
    setInstagramToken("");
    setInstagramConfigured(true);
    setAccountSaved(true);
    window.setTimeout(() => setAccountSaved(false), 2000);
  };

  const connectTikTok = () => {
    if (!project.studioProjectId) return;
    const search = new URLSearchParams({
      workspaceId: project.studioProjectId,
      returnTo: `/editor/${project.id}`,
    });
    // OAuth must perform a full document navigation to the provider redirect.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/oauth/tiktok/start?${search}`);
  };

  const connectYouTube = () => {
    if (!project.studioProjectId) return;
    const search = new URLSearchParams({
      workspaceId: project.studioProjectId,
      returnTo: `/editor/${project.id}`,
    });
    // OAuth must perform a full document navigation to the provider redirect.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/oauth/youtube/start?${search}`);
  };

  const publishYouTube = async () => {
    if (!project.studioProjectId || !project.fullVideoUrl) return;
    setYouTubePublishing(true);
    setYouTubeResult("");
    try {
      const youtube = project.captions?.youtube;
      const response = await apiJson<{ youtubeUrl: string }>(
        "/api/publish-youtube",
        {
          method: "POST",
          body: JSON.stringify({
            projectId: project.studioProjectId,
            videoProjectId: project.id,
            videoUrl: project.fullVideoUrl,
            title: youtube?.title || project.name,
            description: [
              youtube?.description,
              ...(youtube?.hashtags ?? []).map((tag) => `#${tag}`),
            ]
              .filter(Boolean)
              .join("\n\n"),
            privacyStatus: youtubePrivacy,
          }),
        },
      );
      update({ youtubeUrl: response.youtubeUrl });
      setYouTubeResult("Vidéo complète publiée sur YouTube");
    } catch (publishError) {
      setYouTubeResult(
        publishError instanceof Error ? publishError.message : "Erreur YouTube",
      );
    } finally {
      setYouTubePublishing(false);
    }
  };

  const publishTikTok = async () => {
    if (!project.studioProjectId || !publishMediaUrl || !tiktokPrivacy) return;
    setTikTokPublishing(true);
    setTikTokResult("");
    try {
      const title = [
        project.captions?.tiktok?.caption,
        project.trailerCta,
        project.youtubeUrl,
      ]
        .filter(Boolean)
        .join("\n");
      const response = await apiJson<{ message: string }>("/api/publish-tiktok", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.studioProjectId,
          videoProjectId: project.id,
          videoUrl: publishMediaUrl,
          title,
          privacyLevel: tiktokPrivacy,
        }),
      });
      setTikTokResult(response.message);
    } catch (publishError) {
      setTikTokResult(
        publishError instanceof Error ? publishError.message : "Erreur TikTok",
      );
    } finally {
      setTikTokPublishing(false);
    }
  };

  const dmConfigJson = {
    trigger: "story reply",
    keywords: dmKeyword ? [dmKeyword.toUpperCase()] : [],
    dmMessage: dmMessage,
    buttons:
      dmButtonTitle && dmButtonUrl
        ? [{ type: "url", title: dmButtonTitle, url: dmButtonUrl }]
        : [],
  };

  return (
    <div className="p-4 space-y-5">
      <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-200">
          Vidéo complète → extraits
        </h3>
        <p className="mt-2 text-[11px] leading-relaxed text-cyan-300/70">
          Publie d’abord la version complète sur YouTube, puis partage seulement
          le début sur Instagram et TikTok avec un appel vers YouTube.
        </p>
        <div className="mt-3 rounded-lg border border-cyan-900/70 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-100">Chaîne YouTube</span>
            <span className="text-[10px] text-cyan-400">
              {youtubeConfigured ? "Connectée" : "Non connectée"}
            </span>
          </div>
          {!youtubeConfigured ? (
            <button
              onClick={connectYouTube}
              disabled={!project.studioProjectId}
              className="w-full rounded-lg bg-red-600 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              Se connecter avec YouTube
            </button>
          ) : (
            <>
              <select
                value={youtubePrivacy}
                onChange={(event) =>
                  setYouTubePrivacy(
                    event.target.value as "private" | "unlisted" | "public",
                  )
                }
                className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-xs text-white"
              >
                <option value="private">Privée</option>
                <option value="unlisted">Non répertoriée</option>
                <option value="public">Publique</option>
              </select>
              <button
                onClick={() => void publishYouTube()}
                disabled={
                  youtubePublishing || !project.fullVideoUrl?.startsWith("https://")
                }
                className="w-full rounded-lg bg-red-600 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                {youtubePublishing
                  ? "Envoi YouTube..."
                  : "Publier la vidéo complète"}
              </button>
            </>
          )}
          {!project.fullVideoUrl?.startsWith("https://") && (
            <p className="mt-2 text-[10px] text-cyan-300/60">
              Utilise d’abord « Exporter » pour créer la vidéo complète cloud.
            </p>
          )}
          {youtubeResult && (
            <p className="mt-2 text-[10px] text-cyan-200">{youtubeResult}</p>
          )}
        </div>
        <label className="mt-3 block text-xs text-zinc-500">
          Lien YouTube complet
        </label>
        <input
          type="url"
          value={project.youtubeUrl ?? ""}
          onChange={(event) => update({ youtubeUrl: event.target.value })}
          placeholder="https://youtu.be/..."
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white"
        />
        <label className="mt-3 block text-xs text-zinc-500">
          Durée de l’extrait
        </label>
        <select
          value={project.trailerDurationSeconds ?? 30}
          onChange={(event) =>
            update({ trailerDurationSeconds: Number(event.target.value) })
          }
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white"
        >
          {[15, 30, 45, 60].map((seconds) => (
            <option key={seconds} value={seconds}>
              {seconds} secondes
            </option>
          ))}
        </select>
        <label className="mt-3 block text-xs text-zinc-500">
          Appel à l’action
        </label>
        <textarea
          value={project.trailerCta ?? ""}
          onChange={(event) => update({ trailerCta: event.target.value })}
          rows={2}
          className="mt-1 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white"
        />
        <button
          onClick={() => {
            const text = [project.trailerCta, project.youtubeUrl]
              .filter(Boolean)
              .join("\n");
            void navigator.clipboard.writeText(text);
          }}
          disabled={!project.youtubeUrl}
          className="mt-2 w-full rounded-lg border border-cyan-900 py-2 text-xs font-bold text-cyan-300 disabled:opacity-40"
        >
          Copier le CTA YouTube
        </button>
      </div>

      {/* ── Section 1: Publier sur Instagram ── */}
      <div>
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
          Publier sur Instagram
        </h3>

        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Compte du projet</span>
            <span
              className={`text-[10px] ${
                instagramConfigured ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {instagramConfigured ? "Configuré" : "À configurer"}
            </span>
          </div>
          <input
            value={instagramUserId}
            onChange={(event) => setInstagramUserId(event.target.value)}
            placeholder="Instagram User ID"
            className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white"
          />
          <input
            type="password"
            value={instagramToken}
            onChange={(event) => setInstagramToken(event.target.value)}
            placeholder={instagramConfigured ? "Nouveau token (pour remplacer)" : "Access token Meta"}
            className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white"
          />
          <button
            onClick={saveInstagramAccount}
            disabled={!project.studioProjectId || !instagramUserId || !instagramToken}
            className="w-full rounded-lg bg-zinc-800 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
          >
            {accountSaved ? "Compte enregistré" : "Enregistrer pour ce projet"}
          </button>
        </div>

        <label className="text-xs text-zinc-500 block mb-1">Format</label>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {(["REELS", "STORIES", "IMAGE", "CAROUSEL"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMediaType(t)}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                mediaType === t
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "REELS"
                ? "Reel"
                : t === "STORIES"
                  ? "Story"
                  : t === "CAROUSEL"
                    ? "Carrousel"
                    : "Image"}
            </button>
          ))}
        </div>

        {mediaType === "CAROUSEL" ? (
          <>
            <label className="text-xs text-zinc-500 block mb-1">
              URLs des images (1 par ligne, min 2)
            </label>
            <textarea
              value={carouselUrls}
              onChange={(e) => setCarouselUrls(e.target.value)}
              rows={5}
              placeholder={
                "https://slide-1.jpg\nhttps://slide-2.jpg\nhttps://slide-3.jpg"
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none mb-3 font-mono"
            />
            <div className="text-[10px] text-zinc-600 mb-2">
              {carouselUrls.split("\n").filter((u) => u.trim()).length} slides
            </div>
          </>
        ) : (
          <>
            <label className="text-xs text-zinc-500 block mb-1">
              URL du media (publique HTTPS)
            </label>
            <input
              type="url"
              value={publishMediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 mb-3"
            />
          </>
        )}

        <label className="text-xs text-zinc-500 block mb-1">Caption</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          placeholder="Ta caption + #hashtags"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none mb-3"
        />

        <button
          onClick={handlePublish}
          disabled={
            publishing ||
            !project.studioProjectId ||
            !instagramConfigured ||
            (mediaType === "CAROUSEL"
              ? carouselUrls.split("\n").filter((u) => u.trim()).length < 2
              : !publishMediaUrl)
          }
          className="w-full py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white"
        >
          {publishing ? "Publication en cours..." : "Publier sur Instagram"}
        </button>

        {result && (
          <div
            className={`mt-2 p-2.5 rounded-lg text-xs ${
              result.success
                ? "bg-emerald-900/40 text-emerald-300"
                : "bg-red-900/40 text-red-300"
            }`}
          >
            {result.success ? (
              <>
                <div>Publie (ID: {result.mediaId})</div>
                {result.permalink && (
                  <a
                    href={result.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline mt-1 block text-emerald-400"
                  >
                    Voir sur Instagram
                  </a>
                )}
              </>
            ) : (
              result.error
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-800/50">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Publier l’extrait sur TikTok
          </h3>
          <span
            className={`text-[10px] ${
              tiktokConfigured ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {tiktokConfigured ? "Connecté" : "Non connecté"}
          </span>
        </div>
        {!tiktokConfigured ? (
          <button
            onClick={connectTikTok}
            disabled={!project.studioProjectId}
            className="w-full rounded-xl bg-white py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-40"
          >
            Se connecter avec TikTok
          </button>
        ) : (
          <>
            <label className="mb-1 block text-xs text-zinc-500">Visibilité</label>
            <select
              value={tiktokPrivacy}
              onChange={(event) => setTikTokPrivacy(event.target.value)}
              className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white"
            >
              {tiktokPrivacyOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <button
              onClick={() => void publishTikTok()}
              disabled={
                tiktokPublishing ||
                !publishMediaUrl.startsWith("https://") ||
                !tiktokPrivacy
              }
              className="w-full rounded-xl bg-white py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-40"
            >
              {tiktokPublishing ? "Envoi..." : "Publier l’extrait sur TikTok"}
            </button>
          </>
        )}
        {tiktokResult && (
          <p className="mt-2 rounded-lg bg-zinc-800 p-2 text-xs text-zinc-300">
            {tiktokResult}
          </p>
        )}
        <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
          TikTok exige une URL vidéo HTTPS sur un domaine vérifié dans ton app
          développeur. Les exports cloud du Studio sont prévus pour cela.
        </p>
      </div>

      {/* ── Section 3: Auto-DM config ── */}
      <div className="pt-4 border-t border-zinc-800/50">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
          Auto-DM (Story Reply)
        </h3>
        <p className="text-[11px] text-zinc-600 mb-3">
          Quand quelqu&apos;un repond a ta story avec le mot-cle, envoie un DM
          automatique avec un bouton.
        </p>

        <label className="text-xs text-zinc-500 block mb-1">Mot-cle</label>
        <input
          type="text"
          value={dmKeyword}
          onChange={(e) => setDmKeyword(e.target.value)}
          placeholder="ex: LIEN"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 mb-2.5 uppercase"
        />

        <label className="text-xs text-zinc-500 block mb-1">
          Message du DM
        </label>
        <textarea
          value={dmMessage}
          onChange={(e) => setDmMessage(e.target.value)}
          rows={3}
          placeholder="Merci ! Voici ton lien..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none mb-2.5"
        />

        <label className="text-xs text-zinc-500 block mb-1">
          Titre du bouton
        </label>
        <input
          type="text"
          value={dmButtonTitle}
          onChange={(e) => setDmButtonTitle(e.target.value)}
          placeholder="ex: Decouvrir"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 mb-2.5"
        />

        <label className="text-xs text-zinc-500 block mb-1">
          URL du bouton
        </label>
        <input
          type="url"
          value={dmButtonUrl}
          onChange={(e) => setDmButtonUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 mb-3"
        />

        <button
          onClick={() => void saveDmConfig()}
          className="w-full py-2 rounded-xl font-bold text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          {dmSaved ? "Sauvegarde" : "Sauvegarder la config"}
        </button>

        {/* Config JSON preview */}
        {dmKeyword && (
          <div className="mt-3 bg-zinc-950 rounded-lg p-3 border border-zinc-800">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <pre className="text-[10px] text-zinc-400 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(dmConfigJson, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export type { PanelId, BrollSuggestion };
