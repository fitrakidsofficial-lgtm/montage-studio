"use client";

import { useState, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import type { VideoProject, SubtitleSegment, SubtitleWord } from "@/lib/types";
import { saveProject } from "@/lib/project-store";
import {
  applyPreset,
  TEMPLATE_PRESETS,
  type TemplatePreset,
} from "@/lib/template-presets";
import { CardEditor } from "./CardEditor";
import { BrollGallery } from "./BrollGallery";

const PlayerPreview = lazy(() => import("./PlayerPreview"));

interface Props {
  initialProject: VideoProject;
}

export function Editor({ initialProject }: Props) {
  const [project, setProject] = useState<VideoProject>(initialProject);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [showBrolls, setShowBrolls] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [fixingSubs, setFixingSubs] = useState(false);
  const [searchingBrolls, setSearchingBrolls] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [brollSuggestions, setBrollSuggestions] = useState<
    {
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
    }[]
  >([]);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<File | null>(null);
  const audioFileRef = useRef<File | null>(null);

  const update = useCallback((patch: Partial<VideoProject>) => {
    setProject((prev) => {
      const next = { ...prev, ...patch };
      saveProject(next);
      return next;
    });
  }, []);

  const totalDuration = useMemo(
    () =>
      project.mainVideoDurationSeconds +
      (project.outroVideoUrl ? project.outroDurationSeconds : 0),
    [
      project.mainVideoDurationSeconds,
      project.outroDurationSeconds,
      project.outroVideoUrl,
    ],
  );

  // ── Step 1: Upload video ──
  const handleMainVideo = useCallback(
    (file: File) => {
      videoFileRef.current = file;
      const blobUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        update({
          mainVideoUrl: blobUrl,
          mainVideoDurationSeconds: video.duration,
        });
      };
      video.src = blobUrl;
    },
    [update],
  );

  // ── Paste text → instant subtitles ──
  const handlePasteText = useCallback(
    (text: string) => {
      const duration = project.mainVideoDurationSeconds || 60;

      // Split into sentences (. ! ? or newlines)
      const raw = text
        .split(/(?<=[.!?؟\n])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const sentences = raw.length > 0 ? raw : [text];

      // Build word list for the whole text
      const allWords = text.split(/\s+/).filter(Boolean);
      const totalWords = allWords.length;
      const timePerWord = duration / Math.max(totalWords, 1);

      // Generate word-level timing
      const words: { word: string; start: number; end: number }[] = [];
      allWords.forEach((w, i) => {
        words.push({
          word: w,
          start: Math.round(i * timePerWord * 100) / 100,
          end: Math.round((i + 1) * timePerWord * 100) / 100,
        });
      });

      // Generate segment-level timing from sentences
      const subtitles: { start: number; end: number; text: string }[] = [];
      let wordIndex = 0;
      sentences.forEach((sentence) => {
        const sentenceWords = sentence.split(/\s+/).filter(Boolean);
        const startWord = wordIndex;
        const endWord = Math.min(wordIndex + sentenceWords.length, totalWords);
        wordIndex = endWord;

        subtitles.push({
          start: words[startWord]?.start ?? 0,
          end: words[Math.max(endWord - 1, 0)]?.end ?? duration,
          text: sentence,
        });
      });

      update({ subtitles, words });
    },
    [project.mainVideoDurationSeconds, update],
  );

  // ── Auto-transcribe via Whisper ──
  const handleTranscribe = useCallback(async () => {
    const file = audioFileRef.current || videoFileRef.current;
    if (!file) {
      alert("Uploade ta video ou ton audio d'abord");
      return;
    }
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur de transcription");
        return;
      }
      update({ subtitles: data.subtitles, words: data.words });
    } catch (err) {
      alert("Erreur reseau: " + (err as Error).message);
    } finally {
      setTranscribing(false);
    }
  }, [update]);

  // ── Fix subtitles with AI ──
  const handleFixSubtitles = useCallback(async () => {
    if (project.subtitles.length === 0) return;
    setFixingSubs(true);
    try {
      const res = await fetch("/api/fix-subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtitles: project.subtitles,
          words: project.words,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        update({ subtitles: data.subtitles, words: data.words });
      } else {
        alert(data.error || "Erreur correction");
      }
    } catch (err) {
      alert("Erreur: " + (err as Error).message);
    } finally {
      setFixingSubs(false);
    }
  }, [project.subtitles, project.words, update]);

  // ── Suggest B-rolls with AI ──
  const handleSuggestBrolls = useCallback(async () => {
    if (project.subtitles.length === 0) return;
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
  }, [project.subtitles, project.mainVideoDurationSeconds]);

  // ── Export MP4 ──
  const handleRender = useCallback(async () => {
    setRendering(true);
    setRenderUrl(null);
    try {
      // Clean blob URLs for server-side render
      const cleanProject = {
        ...project,
        mainVideoUrl: project.mainVideoUrl?.startsWith("blob:")
          ? null
          : project.mainVideoUrl,
        brolls: project.brolls.filter((b) => !b.fileUrl.startsWith("blob:")),
      };
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectJson: cleanProject }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setRenderUrl(data.url);
      } else {
        alert(data.error || "Erreur de rendu");
      }
    } catch (err) {
      alert("Erreur: " + (err as Error).message);
    } finally {
      setRendering(false);
    }
  }, [project]);

  // ── Step 2: Upload subtitles JSON ──
  const handleJsonDrop = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          const patch: Partial<VideoProject> = {};
          if (data.subtitles)
            patch.subtitles = data.subtitles as SubtitleSegment[];
          if (data.words) patch.words = data.words as SubtitleWord[];
          update(patch);
        } catch {
          alert("Fichier JSON invalide");
        }
      };
      reader.readAsText(file);
    },
    [update],
  );

  // ── Step 3: Pick template → auto-fill cards with AI ──
  const [fillingCards, setFillingCards] = useState(false);

  const handlePreset = useCallback(
    async (preset: TemplatePreset) => {
      const cards = applyPreset(preset, project.mainVideoDurationSeconds);
      setSelectedPresetId(preset.id);
      update({ style: preset.style, cards });

      // If we have subtitles, ask AI to fill card content
      const transcript = project.subtitles.map((s) => s.text).join(" ");
      if (!transcript.trim() || preset.cardSlots.length === 0) return;

      setFillingCards(true);
      try {
        const cardTypes = preset.cardSlots.map((slot, i) => ({
          index: i,
          type: slot.type,
        }));
        const res = await fetch("/api/fill-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            templateId: preset.id,
            cardTypes,
          }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.cards)) {
          const filled = cards.map((card, i) => {
            const aiContent = data.cards[i];
            if (!aiContent) return card;
            return { ...card, content: { ...card.content, ...aiContent } };
          });
          update({ cards: filled });
        }
      } catch {
        // Silently fail — cards stay with empty placeholders
      } finally {
        setFillingCards(false);
      }
    },
    [project.mainVideoDurationSeconds, project.subtitles, update],
  );

  // ── Drag handler for video + json zone ──
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (file.type.startsWith("video/")) {
        handleMainVideo(file);
      } else if (file.name.endsWith(".json")) {
        handleJsonDrop(file);
      }
    },
    [handleMainVideo, handleJsonDrop],
  );

  const hasVideo = !!project.mainVideoUrl;
  const hasSubs = project.subtitles.length > 0 || project.words.length > 0;

  return (
    <div className="h-screen bg-zinc-950 text-white flex">
      {/* ── Left panel: simple flow ── */}
      <div className="w-[420px] flex flex-col border-r border-zinc-800">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <input
            value={project.name}
            onChange={(e) => update({ name: e.target.value })}
            className="bg-transparent text-lg font-bold text-white w-full outline-none"
            placeholder="Nom du montage"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── STEP 1: Video + Sous-titres ── */}
          <div
            className="p-4 border-b border-zinc-800"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">
              1. Ta video + sous-titres
            </div>

            <div className="flex gap-2">
              {/* Video button */}
              <button
                onClick={() => videoInputRef.current?.click()}
                className={`flex-1 rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                  hasVideo
                    ? "border-emerald-600 bg-emerald-900/20"
                    : "border-zinc-600 hover:border-amber-500"
                }`}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleMainVideo(f);
                  }}
                />
                <div className="text-2xl mb-1">{hasVideo ? "OK" : "+"}</div>
                <div
                  className={`text-xs ${hasVideo ? "text-emerald-400" : "text-zinc-400"}`}
                >
                  {hasVideo
                    ? `${project.mainVideoDurationSeconds.toFixed(0)}s`
                    : "Video"}
                </div>
              </button>
            </div>

            {/* Subtitle zone */}
            {hasSubs ? (
              <div className="mt-3 rounded-xl border-2 border-emerald-600 bg-emerald-900/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-emerald-400">
                    Sous-titres : {project.subtitles.length} segments,{" "}
                    {project.words.length} mots
                  </div>
                  <button
                    onClick={() => update({ subtitles: [], words: [] })}
                    className="text-xs text-zinc-500 hover:text-red-400"
                  >
                    refaire
                  </button>
                </div>
                <button
                  onClick={handleFixSubtitles}
                  disabled={fixingSubs}
                  className="mt-2 w-full bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-700 text-white rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                >
                  {fixingSubs
                    ? "Correction en cours..."
                    : "Corriger les sous-titres (IA)"}
                </button>
              </div>
            ) : hasVideo ? (
              <div className="mt-3 space-y-2">
                <button
                  onClick={handleTranscribe}
                  disabled={transcribing}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 text-white rounded-xl px-4 py-3 text-sm font-bold transition-colors"
                >
                  {transcribing
                    ? "Transcription en cours..."
                    : "Transcrire les sous-titres"}
                </button>
                {transcribing && (
                  <div className="text-xs text-zinc-500 text-center">
                    Whisper analyse l'audio de ta video...
                  </div>
                )}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,video/*,.mp3,.wav,.m4a"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      audioFileRef.current = f;
                      handleTranscribe();
                    }
                  }}
                />
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleJsonDrop(f);
                  }}
                />
              </div>
            ) : null}

            {!hasVideo && (
              <div className="text-zinc-600 text-xs text-center mt-2">
                Glisse ta video ici
              </div>
            )}
          </div>

          {/* ── STEP 2: Template ── */}
          <div className="p-4 border-b border-zinc-800">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">
              2. Choisis ton template
            </div>

            {fillingCards && (
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-2 mb-2 text-xs text-amber-300">
                L'IA remplit les cards avec ton contenu...
              </div>
            )}

            <div className="space-y-2">
              {TEMPLATE_PRESETS.map((preset) => {
                const isActive = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePreset(preset)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      isActive
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          preset.style === "educatif"
                            ? "bg-teal-900 text-teal-300"
                            : preset.style === "promo"
                              ? "bg-orange-900 text-orange-300"
                              : "bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {preset.style}
                      </span>
                      <span className="font-bold text-white text-sm">
                        {preset.name}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {preset.description}
                    </div>
                    {isActive && preset.cardSlots.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {preset.cardSlots.map((slot, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300"
                          >
                            {slot.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── STEP 3: Cards (depliable) ── */}
          {project.cards.length > 0 && (
            <div className="p-4 border-b border-zinc-800">
              <button
                onClick={() => setShowCards(!showCards)}
                className="w-full flex items-center justify-between"
              >
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                  3. Modifier les textes ({project.cards.length} cards)
                </div>
                <span className="text-zinc-500 text-sm">
                  {showCards ? "v" : ">"}
                </span>
              </button>
              {showCards && (
                <div className="mt-3">
                  <CardEditor
                    cards={project.cards}
                    onChange={(cards) => update({ cards })}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: B-rolls (depliable) ── */}
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={() => setShowBrolls(!showBrolls)}
              className="w-full flex items-center justify-between"
            >
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                {project.cards.length > 0 ? "4" : "3"}. B-rolls
                {project.brolls.length > 0 && ` (${project.brolls.length})`}
              </div>
              <span className="text-zinc-500 text-sm">
                {showBrolls ? "v" : ">"}
              </span>
            </button>
            {showBrolls && (
              <div className="mt-3 space-y-3">
                {/* AI suggest button */}
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

                {/* Suggestions gallery */}
                {brollSuggestions.length > 0 && (
                  <div className="space-y-4">
                    {brollSuggestions.map((suggestion, si) => (
                      <div
                        key={si}
                        className="bg-zinc-800/50 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-amber-400 font-bold">
                            {suggestion.keyword}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {suggestion.startTime.toFixed(1)}s -{" "}
                            {suggestion.endTime.toFixed(1)}s
                          </div>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {suggestion.reason}
                        </div>
                        {suggestion.images.length > 0 ||
                        suggestion.videos.length > 0 ? (
                          <div className="space-y-1.5">
                            {suggestion.images.length > 0 && (
                              <div>
                                <div className="text-[10px] text-zinc-500 mb-1">
                                  Images
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {suggestion.images.map((img) => (
                                    <button
                                      key={img.id}
                                      onClick={() => {
                                        update({
                                          brolls: [
                                            ...project.brolls,
                                            {
                                              id: crypto.randomUUID(),
                                              startTime: suggestion.startTime,
                                              endTime: suggestion.endTime,
                                              fileUrl: img.url,
                                              mediaType: "image",
                                            },
                                          ],
                                        });
                                        setBrollSuggestions((prev) =>
                                          prev.filter((_, i) => i !== si),
                                        );
                                      }}
                                      className="rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-500 transition-colors"
                                    >
                                      <img
                                        src={img.thumb}
                                        alt={suggestion.keyword}
                                        className="w-full h-20 object-cover"
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {suggestion.videos.length > 0 && (
                              <div>
                                <div className="text-[10px] text-zinc-500 mb-1">
                                  Videos
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {suggestion.videos.map((vid) => (
                                    <button
                                      key={vid.id}
                                      onClick={() => {
                                        update({
                                          brolls: [
                                            ...project.brolls,
                                            {
                                              id: crypto.randomUUID(),
                                              startTime: suggestion.startTime,
                                              endTime: suggestion.endTime,
                                              fileUrl: vid.url,
                                              mediaType: "video",
                                            },
                                          ],
                                        });
                                        setBrollSuggestions((prev) =>
                                          prev.filter((_, i) => i !== si),
                                        );
                                      }}
                                      className="rounded-lg overflow-hidden border-2 border-transparent hover:border-teal-500 transition-colors relative"
                                    >
                                      <img
                                        src={vid.thumb}
                                        alt={suggestion.keyword}
                                        className="w-full h-20 object-cover"
                                      />
                                      <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-[9px] text-white px-1 rounded">
                                        VID
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-zinc-600">
                            Pas de resultats (ajoute PEXELS_API_KEY dans
                            .env.local)
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setBrollSuggestions([])}
                      className="text-xs text-zinc-500 hover:text-zinc-400"
                    >
                      Fermer les suggestions
                    </button>
                  </div>
                )}

                {/* Manual upload */}
                <BrollGallery
                  brolls={project.brolls}
                  onChange={(brolls) => update({ brolls })}
                />
              </div>
            )}
          </div>

          {/* ── Status bar ── */}
          <div className="p-4 text-xs text-zinc-600 space-y-1">
            <div>
              {project.mainVideoDurationSeconds.toFixed(1)}s - {project.fps}fps
              - {project.style}
            </div>
            <div>
              Logo: {project.brand.logoUrl ? "OK" : "-"} | Outro:{" "}
              {project.outroVideoUrl ? "OK" : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: Preview ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900/50 p-8">
        <div className="text-xs text-zinc-500 mb-4 uppercase tracking-wider">
          Apercu en direct
        </div>
        <Suspense
          fallback={
            <div className="w-[360px] h-[640px] bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500">
              Chargement...
            </div>
          }
        >
          <PlayerPreview project={project} totalDuration={totalDuration} />
        </Suspense>

        {/* Export button */}
        <div className="mt-6 w-[360px] space-y-2">
          <button
            onClick={handleRender}
            disabled={rendering}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 text-white rounded-xl px-4 py-3 text-sm font-bold transition-colors"
          >
            {rendering ? "Rendu en cours..." : "Exporter MP4"}
          </button>
          {renderUrl && (
            <a
              href={renderUrl}
              download
              className="block w-full text-center bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl px-4 py-3 text-sm font-bold transition-colors"
            >
              Telecharger le MP4
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
