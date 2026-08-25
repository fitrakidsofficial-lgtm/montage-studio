"use client";

import { useState, useCallback, useRef, lazy, Suspense } from "react";
import type { VideoProject, SubtitleSegment, SubtitleWord } from "@/lib/types";
import { TEMPLATE_PRESETS, type TemplatePreset } from "@/lib/template-presets";
import { CardEditor } from "./CardEditor";
import { useProjectState } from "./editor/useProjectState";
import { useAutoPilot } from "./editor/useAutoPilot";
import { StepBrolls } from "./editor/StepBrolls";
import { StepCaptions } from "./editor/StepCaptions";
import { StepSettings } from "./editor/StepSettings";

const PlayerPreview = lazy(() => import("./PlayerPreview"));

interface Props {
  initialProject: VideoProject;
}

export function Editor({ initialProject }: Props) {
  const { project, update, totalDuration } = useProjectState(initialProject);
  const [zoomIntensity, setZoomIntensity] = useState(1.15);
  const [showCards, setShowCards] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [fixingSubs, setFixingSubs] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [fillingCards, setFillingCards] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const {
    autoPilot,
    autoPilotStep,
    brollSuggestions,
    setBrollSuggestions,
    selectedPresetId,
    videoFileRef,
    audioFileRef,
    handleAutoPilot,
    handlePreset,
  } = useAutoPilot(project, update, zoomIntensity);

  // ── Upload video ──
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
    [update, videoFileRef],
  );

  // ── Transcribe via Whisper ──
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
      if (project.language && project.language !== "auto") {
        form.append("language", project.language);
      }
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
  }, [update, project.language, audioFileRef, videoFileRef]);

  // ── Fix subtitles ──
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

  // ── Paste text → instant subtitles ──
  const handlePasteText = useCallback(
    (text: string) => {
      const duration = project.mainVideoDurationSeconds || 60;
      const raw = text
        .split(/(?<=[.!?؟\n])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const sentences = raw.length > 0 ? raw : [text];
      const allWords = text.split(/\s+/).filter(Boolean);
      const totalWords = allWords.length;
      const timePerWord = duration / Math.max(totalWords, 1);

      const words: SubtitleWord[] = allWords.map((w, i) => ({
        word: w,
        start: Math.round(i * timePerWord * 100) / 100,
        end: Math.round((i + 1) * timePerWord * 100) / 100,
      }));

      const subtitles: SubtitleSegment[] = [];
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

  // ── Upload JSON subtitles ──
  const handleJsonDrop = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          const patch: Partial<VideoProject> = {};
          if (data.subtitles) patch.subtitles = data.subtitles;
          if (data.words) patch.words = data.words;
          update(patch);
        } catch {
          alert("Fichier JSON invalide");
        }
      };
      reader.readAsText(file);
    },
    [update],
  );

  // ── Drag handler ──
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (file.type.startsWith("video/")) handleMainVideo(file);
      else if (file.name.endsWith(".json")) handleJsonDrop(file);
    },
    [handleMainVideo, handleJsonDrop],
  );

  // ── Export MP4 ──
  const handleRender = useCallback(async () => {
    setRendering(true);
    setRenderUrl(null);
    try {
      const form = new FormData();
      const projectCopy = { ...project };
      // Strip blob URLs from JSON — files sent separately
      if (projectCopy.mainVideoUrl?.startsWith("blob:")) {
        projectCopy.mainVideoUrl = "__UPLOAD_MAIN__";
      }
      projectCopy.brolls = projectCopy.brolls.filter(
        (b) => !b.fileUrl.startsWith("blob:"),
      );
      if (projectCopy.bgMusicUrl?.startsWith("blob:")) {
        projectCopy.bgMusicUrl = null;
      }
      form.append("project", JSON.stringify(projectCopy));
      if (videoFileRef.current && project.mainVideoUrl?.startsWith("blob:")) {
        form.append("mainVideo", videoFileRef.current);
      }
      const res = await fetch("/api/render", {
        method: "POST",
        body: form,
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
  }, [project, videoFileRef]);

  const hasVideo = !!project.mainVideoUrl;
  const hasSubs = project.subtitles.length > 0 || project.words.length > 0;

  return (
    <div className="h-screen bg-zinc-950 text-white flex">
      {/* Left panel */}
      <div className="w-[420px] flex flex-col border-r border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <input
            value={project.name}
            onChange={(e) => update({ name: e.target.value })}
            className="bg-transparent text-lg font-bold text-white w-full outline-none"
            placeholder="Nom du montage"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: Video + Sous-titres */}
          <div
            className="p-4 border-b border-zinc-800"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">
              1. Ta video + sous-titres
            </div>

            {/* Language selector */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-zinc-500">Langue :</span>
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
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    (project.language ?? "auto") === opt.value
                      ? "bg-teal-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
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

            {hasVideo && !hasSubs && !autoPilot && (
              <button
                onClick={handleAutoPilot}
                className="mt-3 w-full bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white rounded-xl px-4 py-4 text-sm font-bold transition-all shadow-lg shadow-amber-900/30"
              >
                Montage auto (tout-en-un)
              </button>
            )}
            {autoPilot && (
              <div className="mt-3 rounded-xl border-2 border-amber-500 bg-amber-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                  <div className="text-sm text-amber-300 font-bold">
                    Auto-pilote en cours
                  </div>
                </div>
                <div className="text-xs text-amber-200/70">{autoPilotStep}</div>
              </div>
            )}

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
              </div>
            ) : null}

            {!hasVideo && (
              <div className="text-zinc-600 text-xs text-center mt-2">
                Glisse ta video ici
              </div>
            )}
          </div>

          {/* STEP 2: Template */}
          <div className="p-4 border-b border-zinc-800">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">
              2. Choisis ton template
            </div>
            {fillingCards && (
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-2 mb-2 text-xs text-amber-300">
                L&apos;IA remplit les cards avec ton contenu...
              </div>
            )}
            <div className="space-y-2">
              {TEMPLATE_PRESETS.map((preset) => {
                const isActive = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setFillingCards(true);
                      handlePreset(preset).finally(() =>
                        setFillingCards(false),
                      );
                    }}
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

          {/* STEP 3: Cards */}
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

          {/* STEP 4: B-rolls */}
          <StepBrolls
            project={project}
            update={update}
            brollSuggestions={brollSuggestions}
            setBrollSuggestions={setBrollSuggestions}
            stepNumber={project.cards.length > 0 ? 4 : 3}
          />

          {/* STEP 5: Captions */}
          {project.captions && <StepCaptions captions={project.captions} />}

          {/* Settings */}
          <StepSettings
            project={project}
            update={update}
            zoomIntensity={zoomIntensity}
            setZoomIntensity={setZoomIntensity}
          />
        </div>
      </div>

      {/* Right panel: Preview */}
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
