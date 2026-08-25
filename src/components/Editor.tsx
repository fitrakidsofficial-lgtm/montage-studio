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
  const [autoPilot, setAutoPilot] = useState(false);
  const [autoPilotStep, setAutoPilotStep] = useState("");
  const [showCaptions, setShowCaptions] = useState(false);
  const [zoomIntensity, setZoomIntensity] = useState(1.15);
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

  const cutTotal = useMemo(
    () =>
      (project.silenceCuts ?? []).reduce(
        (sum, c) => sum + (c.end - c.start),
        0,
      ),
    [project.silenceCuts],
  );

  const totalDuration = useMemo(
    () =>
      project.mainVideoDurationSeconds -
      cutTotal +
      (project.outroVideoUrl ? project.outroDurationSeconds : 0),
    [
      project.mainVideoDurationSeconds,
      cutTotal,
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

  // ── Detect silence cuts from word timestamps ──
  const detectSilenceCuts = useCallback(
    (words: { start: number; end: number }[]) => {
      const cuts: { start: number; end: number }[] = [];
      for (let i = 1; i < words.length; i++) {
        const gap = words[i].start - words[i - 1].end;
        if (gap > 1.5) {
          cuts.push({
            start: words[i - 1].end + 0.2,
            end: words[i].start - 0.2,
          });
        }
      }
      return cuts;
    },
    [],
  );

  // ── Detect zoom keyframes from emphasis words ──
  const detectZooms = useCallback(
    (
      subtitles: { start: number; end: number; text: string }[],
      duration: number,
    ) => {
      if (zoomIntensity <= 1) return [];
      const zooms: { time: number; scale: number; duration: number }[] = [];
      const targets = [0.25, 0.5, 0.75];
      targets.forEach((ratio) => {
        const targetTime = ratio * duration;
        const closest = subtitles.reduce((best, seg) => {
          const dist = Math.abs(seg.start - targetTime);
          const bestDist = Math.abs(best.start - targetTime);
          return dist < bestDist ? seg : best;
        }, subtitles[0]);
        if (closest) {
          zooms.push({
            time: closest.start,
            scale: zoomIntensity,
            duration: Math.min(closest.end - closest.start, 3),
          });
        }
      });
      return zooms;
    },
    [zoomIntensity],
  );

  // ── Generate intro text from transcript ──
  const generateIntro = useCallback(
    async (transcript: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/fill-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            templateId: "intro",
            cardTypes: [{ index: 0, type: "custom-text" }],
          }),
        });
        const data = await res.json();
        if (res.ok && data.cards?.[0]?.lines?.[0]?.text) {
          return data.cards[0].lines[0].text;
        }
      } catch {}
      return null;
    },
    [],
  );

  // ── Generate social captions ──
  const generateCaptions = useCallback(
    async (transcript: string, style: string) => {
      try {
        const res = await fetch("/api/generate-caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, style }),
        });
        const data = await res.json();
        if (res.ok && data.youtube) {
          return data;
        }
      } catch {}
      return null;
    },
    [],
  );

  // ── AUTO-PILOTE: everything in one click ──
  const handleAutoPilot = useCallback(async () => {
    const file = audioFileRef.current || videoFileRef.current;
    if (!file) {
      alert("Uploade ta video d'abord");
      return;
    }

    setAutoPilot(true);

    try {
      // Step 1: Transcribe
      setAutoPilotStep("Transcription Whisper...");
      const form = new FormData();
      form.append("file", file, file.name);
      const transcRes = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      const transcData = await transcRes.json();
      if (!transcRes.ok) throw new Error(transcData.error);
      update({ subtitles: transcData.subtitles, words: transcData.words });

      // Step 2: Fix subtitles
      setAutoPilotStep("Correction des sous-titres...");
      const fixRes = await fetch("/api/fix-subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtitles: transcData.subtitles,
          words: transcData.words,
        }),
      });
      const fixData = await fixRes.json();
      if (fixRes.ok) {
        update({ subtitles: fixData.subtitles, words: fixData.words });
      }

      const finalSubs = fixRes.ok ? fixData.subtitles : transcData.subtitles;
      const finalWords = fixRes.ok ? fixData.words : transcData.words;
      const transcript = finalSubs
        .map((s: { text: string }) => s.text)
        .join(" ");

      // Step 3: Detect best template
      setAutoPilotStep("Detection du template...");
      const detectRes = await fetch("/api/auto-detect-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const detectData = await detectRes.json();
      const templateId = detectData.templateId || "broll-simple";
      const preset = TEMPLATE_PRESETS.find((p) => p.id === templateId);

      if (preset) {
        const cards = applyPreset(preset, project.mainVideoDurationSeconds);
        setSelectedPresetId(preset.id);
        update({ style: preset.style, cards });

        // Step 4: Fill cards with AI
        if (preset.cardSlots.length > 0 && transcript.trim()) {
          setAutoPilotStep("Remplissage des cards...");
          const cardTypes = preset.cardSlots.map((slot, i) => ({
            index: i,
            type: slot.type,
          }));
          const fillRes = await fetch("/api/fill-cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transcript,
              templateId: preset.id,
              cardTypes,
            }),
          });
          const fillData = await fillRes.json();
          if (fillRes.ok && Array.isArray(fillData.cards)) {
            const filled = cards.map((card, i) => {
              const aiContent = fillData.cards[i];
              if (!aiContent) return card;
              return { ...card, content: { ...card.content, ...aiContent } };
            });
            update({ cards: filled });
          }
        }
      }

      // Step 5: Detect silence cuts
      setAutoPilotStep("Detection des silences...");
      const silenceCuts = detectSilenceCuts(finalWords);
      update({ silenceCuts });

      // Step 6: Auto-zoom
      setAutoPilotStep("Ajout des zooms...");
      const zooms = detectZooms(finalSubs, project.mainVideoDurationSeconds);
      update({ zooms });

      // Step 7: Suggest B-rolls
      setAutoPilotStep("Recherche de B-rolls...");
      try {
        const brollRes = await fetch("/api/suggest-brolls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subtitles: finalSubs,
            duration: project.mainVideoDurationSeconds,
          }),
        });
        const brollData = await brollRes.json();
        if (brollRes.ok && brollData.suggestions) {
          setBrollSuggestions(brollData.suggestions);
          // Auto-add first image of each suggestion
          const autoBrolls = brollData.suggestions
            .filter((s: { images: { url: string }[] }) => s.images.length > 0)
            .map(
              (s: {
                startTime: number;
                endTime: number;
                images: { url: string }[];
              }) => ({
                id: crypto.randomUUID(),
                startTime: s.startTime,
                endTime: s.endTime,
                fileUrl: s.images[0].url,
                mediaType: "image" as const,
              }),
            );
          if (autoBrolls.length > 0) {
            update({ brolls: autoBrolls });
          }
        }
      } catch {}

      // Step 8: Generate captions
      setAutoPilotStep("Generation des descriptions...");
      const captions = await generateCaptions(
        transcript,
        preset?.style || "educatif",
      );
      if (captions) {
        update({ captions });
      }

      // Step 9: Generate intro
      setAutoPilotStep("Generation de l'intro...");
      const introText = await generateIntro(transcript);
      if (introText) {
        update({ introText, introDuration: 3 });
      }

      setAutoPilotStep("Montage termine !");
    } catch (err) {
      alert("Erreur auto-pilote: " + (err as Error).message);
    } finally {
      setTimeout(() => {
        setAutoPilot(false);
        setAutoPilotStep("");
      }, 2000);
    }
  }, [
    project.mainVideoDurationSeconds,
    update,
    detectSilenceCuts,
    detectZooms,
    generateCaptions,
    generateIntro,
  ]);

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

            {/* Auto-pilote */}
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

          {/* ── STEP 5: Captions (depliable) ── */}
          {project.captions && (
            <div className="p-4 border-b border-zinc-800">
              <button
                onClick={() => setShowCaptions(!showCaptions)}
                className="w-full flex items-center justify-between"
              >
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                  5. Descriptions et hashtags
                </div>
                <span className="text-zinc-500 text-sm">
                  {showCaptions ? "v" : ">"}
                </span>
              </button>
              {showCaptions && (
                <div className="mt-3 space-y-3">
                  {/* YouTube */}
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <div className="text-[10px] text-red-400 font-bold mb-1">
                      YouTube Shorts
                    </div>
                    <div className="text-xs text-white font-bold mb-1">
                      {project.captions.youtube.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 mb-1">
                      {project.captions.youtube.description}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {project.captions.youtube.hashtags.join(" ")}
                    </div>
                  </div>
                  {/* Instagram */}
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <div className="text-[10px] text-pink-400 font-bold mb-1">
                      Instagram Reels
                    </div>
                    <div className="text-[11px] text-zinc-300 mb-1">
                      {project.captions.instagram.caption}
                    </div>
                    <div className="text-[10px] text-zinc-500 break-all">
                      {project.captions.instagram.hashtags.join(" ")}
                    </div>
                  </div>
                  {/* TikTok */}
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <div className="text-[10px] text-cyan-400 font-bold mb-1">
                      TikTok
                    </div>
                    <div className="text-[11px] text-zinc-300 mb-1">
                      {project.captions.tiktok.caption}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {project.captions.tiktok.hashtags.join(" ")}
                    </div>
                  </div>
                  {/* Copy buttons */}
                  <div className="flex gap-2">
                    {(["youtube", "instagram", "tiktok"] as const).map(
                      (platform) => (
                        <button
                          key={platform}
                          onClick={() => {
                            const c = project.captions!;
                            const text =
                              platform === "youtube"
                                ? `${c.youtube.title}\n\n${c.youtube.description}\n\n${c.youtube.hashtags.join(" ")}`
                                : platform === "instagram"
                                  ? `${c.instagram.caption}\n\n${c.instagram.hashtags.join(" ")}`
                                  : `${c.tiktok.caption} ${c.tiktok.hashtags.join(" ")}`;
                            navigator.clipboard.writeText(text);
                          }}
                          className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors"
                        >
                          Copier {platform}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Zoom intensity ── */}
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

          {/* ── Background music ── */}
          <div className="px-4 pt-2 pb-2 space-y-2">
            <label className="text-xs text-zinc-400 block">
              Musique de fond
            </label>
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

          {/* ── Status bar ── */}
          <div className="p-4 text-xs text-zinc-600 space-y-1">
            <div>
              {project.mainVideoDurationSeconds.toFixed(1)}s - {project.fps}fps
              - {project.style}
            </div>
            <div>
              Zooms: {(project.zooms ?? []).length} | Coupures:{" "}
              {(project.silenceCuts ?? []).length} | Logo:{" "}
              {project.brand.logoUrl ? "OK" : "-"} | Outro:{" "}
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
