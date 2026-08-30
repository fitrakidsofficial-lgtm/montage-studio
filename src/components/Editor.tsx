"use client";

import { useState, useCallback, useRef, lazy, Suspense } from "react";
import type { VideoProject } from "@/lib/types";
import { useProjectState } from "./editor/useProjectState";
import { useAutoPilot } from "./editor/useAutoPilot";
import {
  useKeyboardShortcuts,
  duplicateElement,
} from "./editor/useKeyboardShortcuts";
import { Timeline, type SelectedElement } from "./editor/Timeline";
import { AgentPanel } from "./editor/AgentPanel";
import { PropertyPanel } from "./editor/PropertyPanel";
import { ToolbarPanels, type PanelId } from "./editor/ToolbarPanels";
import type { PlayerHandle, PreviewClickZone } from "./PlayerPreview";
import { applyEpisode } from "@/lib/mission-sourates-episodes";

const PlayerPreview = lazy(() => import("./PlayerPreview"));

interface Props {
  initialProject: VideoProject;
}

// Inline SVG icon paths (Lucide-style, 24x24 viewBox)
const ICONS: Record<string, string> = {
  media:
    "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  style: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  subtitles: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  texte: "M4 7V4h16v3M9 20h6M12 4v16",
  brolls:
    "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
  brand: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  audio:
    "M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z",
  publish: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
};

function ToolbarIcon({ id }: { id: string }) {
  const d = ICONS[id];
  if (!d)
    return <span className="text-xs font-semibold">{id[0].toUpperCase()}</span>;
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const TOOLBAR_ITEMS: { id: Exclude<PanelId, null>; label: string }[] = [
  { id: "media", label: "Media" },
  { id: "style", label: "Style" },
  { id: "subtitles", label: "Sous-titres" },
  { id: "texte", label: "Texte" },
  { id: "brolls", label: "B-rolls" },
  { id: "brand", label: "Marque" },
  { id: "audio", label: "Audio" },
  { id: "publish", label: "Publier" },
];

// Shortcuts reference
const SHORTCUTS = [
  { key: "Espace / K", desc: "Lecture / Pause" },
  { key: "J", desc: "Reculer 2s" },
  { key: "L", desc: "Avancer" },
  { key: "\u2190 / \u2192", desc: "Reculer / Avancer 1s" },
  { key: "Shift + \u2190/\u2192", desc: "Reculer / Avancer 5s" },
  { key: "Suppr", desc: "Supprimer selection" },
  { key: "Cmd+D", desc: "Dupliquer selection" },
  { key: "S", desc: "Couper au playhead" },
  { key: "F", desc: "Mode Focus" },
  { key: "Echap", desc: "Quitter Focus / Deselectionner" },
  { key: "Ctrl+Z", desc: "Annuler" },
  { key: "Ctrl+Shift+Z", desc: "Retablir" },
  { key: "?", desc: "Raccourcis" },
];

export function Editor({ initialProject }: Props) {
  const { project, update, totalDuration, undo, redo, canUndo, canRedo } =
    useProjectState(initialProject);
  const [zoomIntensity, setZoomIntensity] = useState(1.15);
  const [transcribing, setTranscribing] = useState(false);
  const [fixingSubs, setFixingSubs] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderKind, setRenderKind] = useState<"full" | "trailer">("full");
  const [fillingCards, setFillingCards] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId>("media");
  const [selectedElement, setSelectedElement] =
    useState<SelectedElement | null>(null);
  const [showAgent, setShowAgent] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<{
    type: string;
    id: string;
  } | null>(null);

  // ── Playhead: single source of truth from Remotion Player ──
  const [currentTime, setCurrentTime] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerHandleRef = useRef<PlayerHandle>(null);

  const handleTimeUpdate = useCallback((time: number, frame: number) => {
    setCurrentTime(time);
    setCurrentFrame(frame);
  }, []);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // ── Seek: update Player (source of truth), which fires onTimeUpdate back ──
  const handleSeek = useCallback(
    (time: number) => {
      setCurrentTime(time);
      setCurrentFrame(Math.round(time * (project.fps || 30)));
      playerHandleRef.current?.seekTo(time);
    },
    [project.fps],
  );

  // ── Click on preview element → open corresponding panel ──
  const handleZoneClick = useCallback((zone: PreviewClickZone) => {
    const ZONE_TO_PANEL: Record<NonNullable<PreviewClickZone>, PanelId> = {
      subtitle: "subtitles",
      card: "texte",
      hook: "brand",
      cta: "brand",
      broll: "brolls",
    };
    if (zone) setActivePanel(ZONE_TO_PANEL[zone]);
  }, []);

  // Keyboard shortcuts (extracted hook with Cmd+D duplicate and S split)
  useKeyboardShortcuts({
    project,
    update,
    undo,
    redo,
    currentTime,
    totalDuration,
    isPlaying,
    selectedElement,
    setSelectedElement,
    focusMode,
    setFocusMode,
    showShortcuts,
    setShowShortcuts,
    handleSeek,
    playerHandleRef,
  });

  // ── Handlers for PropertyPanel actions ──
  const handleDeleteSelected = useCallback(() => {
    if (!selectedElement) return;
    const sel = selectedElement;
    if (sel.type === "broll") {
      update({ brolls: project.brolls.filter((b) => b.id !== sel.id) });
    } else if (sel.type === "card") {
      update({ cards: project.cards.filter((c) => c.id !== sel.id) });
    } else if (sel.type === "zoom") {
      const idx = parseInt(sel.id);
      update({ zooms: (project.zooms ?? []).filter((_, i) => i !== idx) });
    } else if (sel.type === "texteCle") {
      const idx = parseInt(sel.id);
      update({
        texteCles: (project.texteCles ?? []).filter((_, i) => i !== idx),
      });
    } else if (sel.type === "patternInterrupt") {
      const idx = parseInt(sel.id);
      update({
        patternInterrupts: (project.patternInterrupts ?? []).filter(
          (_, i) => i !== idx,
        ),
      });
    }
    setSelectedElement(null);
  }, [selectedElement, project, update]);

  const handleDuplicateSelected = useCallback(() => {
    if (!selectedElement) return;
    duplicateElement(project, update, selectedElement, setSelectedElement);
  }, [selectedElement, project, update]);

  const {
    autoPilot,
    autoPilotStep,
    brollSuggestions,
    setBrollSuggestions,
    selectedPresetId,
    setSelectedPresetId,
    templateSuggestions,
    waitingForTemplate,
    videoFileRef,
    audioFileRef,
    bgMusicFileRef,
    brollFilesRef,
    handleAutoPilot,
    handlePreset,
    continueWithTemplate,
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

  // ── Transcribe ──
  const handleTranscribe = useCallback(async () => {
    const file = audioFileRef.current || videoFileRef.current;
    if (!file) return;
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
      if (res.ok) update({ subtitles: data.subtitles, words: data.words });
    } catch {}
    setTranscribing(false);
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
      if (res.ok) update({ subtitles: data.subtitles, words: data.words });
    } catch {}
    setFixingSubs(false);
  }, [project.subtitles, project.words, update]);

  // ── Export MP4 ──
  const [renderStatus, setRenderStatus] = useState("");
  const handleRender = useCallback(
    async (mode: "full" | "trailer") => {
      // Check video file is available before starting
      if (project.mainVideoUrl?.startsWith("blob:") && !videoFileRef.current) {
        alert(
          "Le fichier vidéo a été perdu. Ré-importe ta vidéo avant de lancer le rendu.",
        );
        return;
      }
      setRendering(true);
      setRenderUrl(null);
      setRenderKind(mode);
      setRenderStatus("Préparation...");
      try {
        const form = new FormData();
        const projectCopy = { ...project, brolls: [...project.brolls] };

        if (projectCopy.mainVideoUrl?.startsWith("blob:"))
          projectCopy.mainVideoUrl = "__UPLOAD_MAIN__";
        if (videoFileRef.current && project.mainVideoUrl?.startsWith("blob:"))
          form.append("mainVideo", videoFileRef.current);

        projectCopy.brolls = projectCopy.brolls.map((b) => {
          if (b.fileUrl.startsWith("blob:")) {
            const file = brollFilesRef.current.get(b.id);
            if (file) {
              form.append(`broll_${b.id}`, file);
              return { ...b, fileUrl: `__UPLOAD_BROLL_${b.id}__` };
            }
          }
          return b;
        });
        projectCopy.brolls = projectCopy.brolls.filter(
          (b) => !b.fileUrl.startsWith("blob:"),
        );

        if (projectCopy.bgMusicUrl?.startsWith("blob:")) {
          if (bgMusicFileRef.current) {
            form.append("bgMusic", bgMusicFileRef.current);
            projectCopy.bgMusicUrl = "__UPLOAD_BGMUSIC__";
          } else {
            projectCopy.bgMusicUrl = null;
          }
        }

        form.append("project", JSON.stringify(projectCopy));
        if (mode === "trailer") {
          form.append(
            "clipDurationSeconds",
            String(project.trailerDurationSeconds ?? 30),
          );
        }
        setRenderStatus("Upload vidéo...");
        const res = await fetch("/api/render", {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(30 * 60 * 1000),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setRenderUrl(data.url);
          setRenderStatus("");
          update(
            mode === "trailer"
              ? { trailerVideoUrl: data.url }
              : { fullVideoUrl: data.url },
          );
        } else {
          setRenderStatus("");
          alert(data.error || "Erreur de rendu");
        }
      } catch (err) {
        setRenderStatus("");
        const msg = (err as Error).message;
        if (msg.includes("abort") || msg.includes("timeout")) {
          alert(
            "Le rendu a pris trop de temps (> 30 min). Essaie un extrait plus court.",
          );
        } else {
          alert("Erreur: " + msg);
        }
      }
      setRendering(false);
    },
    [project, videoFileRef, bgMusicFileRef, brollFilesRef, update],
  );

  // ── Drag & drop video ──
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("video/")) handleMainVideo(file);
    },
    [handleMainVideo],
  );

  // ── Drag & drop on timeline ──
  const handleDragEnd = useCallback(
    (type: string, id: string, newStart: number) => {
      if (type === "broll") {
        const b = project.brolls.find((x) => x.id === id);
        if (!b) return;
        const dur = b.endTime - b.startTime;
        update({
          brolls: project.brolls.map((x) =>
            x.id === id
              ? { ...x, startTime: newStart, endTime: newStart + dur }
              : x,
          ),
        });
      } else if (type === "card") {
        const c = project.cards.find((x) => x.id === id);
        if (!c) return;
        const dur = c.endTime - c.startTime;
        update({
          cards: project.cards.map((x) =>
            x.id === id
              ? { ...x, startTime: newStart, endTime: newStart + dur }
              : x,
          ),
        });
      } else if (type === "zoom") {
        const idx = parseInt(id);
        update({
          zooms: (project.zooms ?? []).map((z, i) =>
            i === idx ? { ...z, time: newStart } : z,
          ),
        });
      } else if (type === "texteCle") {
        const idx = parseInt(id);
        update({
          texteCles: (project.texteCles ?? []).map((t, i) =>
            i === idx ? { ...t, time: newStart } : t,
          ),
        });
      }
    },
    [project.brolls, project.cards, project.zooms, project.texteCles, update],
  );

  // ── Resize on timeline ──
  const handleResizeEnd = useCallback(
    (type: string, id: string, newStart: number, newEnd: number) => {
      if (type === "broll") {
        update({
          brolls: project.brolls.map((x) =>
            x.id === id ? { ...x, startTime: newStart, endTime: newEnd } : x,
          ),
        });
      } else if (type === "card") {
        update({
          cards: project.cards.map((x) =>
            x.id === id ? { ...x, startTime: newStart, endTime: newEnd } : x,
          ),
        });
      } else if (type === "zoom") {
        const idx = parseInt(id);
        update({
          zooms: (project.zooms ?? []).map((z, i) =>
            i === idx
              ? { ...z, time: newStart, duration: newEnd - newStart }
              : z,
          ),
        });
      } else if (type === "texteCle") {
        const idx = parseInt(id);
        update({
          texteCles: (project.texteCles ?? []).map((t, i) =>
            i === idx
              ? { ...t, time: newStart, duration: newEnd - newStart }
              : t,
          ),
        });
      }
    },
    [project.brolls, project.cards, project.zooms, project.texteCles, update],
  );

  const hasVideo = !!project.mainVideoUrl;
  const hasSubs = project.subtitles.length > 0;

  // ── Welcome screen (no video yet) ──
  if (!hasVideo && !autoPilot) {
    return (
      <div
        className="h-screen bg-zinc-950 flex items-center justify-center px-4"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-bold text-white mb-1">Montage Studio</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Importe une video, l’IA s’occupe du montage.
          </p>

          {/* Steps preview */}
          <div className="flex justify-center gap-6 mb-8 text-[11px] text-zinc-600">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                1
              </div>
              <span>Importer</span>
            </div>
            <div className="flex items-center text-zinc-700 -mt-2">&#8594;</div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                2
              </div>
              <span>Montage auto</span>
            </div>
            <div className="flex items-center text-zinc-700 -mt-2">&#8594;</div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                3
              </div>
              <span>Ajuster avec l’IA</span>
            </div>
            <div className="flex items-center text-zinc-700 -mt-2">&#8594;</div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                4
              </div>
              <span>Exporter</span>
            </div>
          </div>

          {/* Language */}
          <div className="flex justify-center gap-1.5 mb-6">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  (project.language ?? "auto") === opt.value
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="block cursor-pointer">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleMainVideo(f);
              }}
            />
            <div className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-2xl p-10 md:p-12 transition-colors group">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto text-zinc-600 group-hover:text-zinc-400 transition-colors mb-3"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                Glisse ta video ici ou clique pour importer
              </div>
              <div className="text-[11px] text-zinc-600 mt-1">
                MP4, MOV, WebM
              </div>
            </div>
          </label>

          <input
            value={project.name}
            onChange={(e) => update({ name: e.target.value })}
            className="mt-6 bg-transparent text-center text-sm text-zinc-500 w-full outline-none placeholder-zinc-700"
            placeholder="Nom du montage"
          />
        </div>
      </div>
    );
  }

  // ── Main editor layout ──

  // Focus mode: hide panels, maximize preview
  if (focusMode) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
        {/* Minimal top bar */}
        <div className="h-10 border-b border-zinc-800/50 flex items-center px-4 shrink-0">
          <span className="text-xs text-zinc-500 flex-1">
            Mode Focus — Echap ou F pour revenir
          </span>
          <button
            onClick={() => setFocusMode(false)}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Quitter
          </button>
        </div>
        <div
          className="flex-1 flex items-center justify-center bg-zinc-950 min-h-0"
          onDoubleClick={() => setFocusMode(false)}
        >
          <Suspense
            fallback={
              <div className="w-[360px] h-[640px] bg-zinc-800/30 rounded-2xl animate-pulse" />
            }
          >
            <PlayerPreview
              ref={playerHandleRef}
              project={project}
              totalDuration={totalDuration}
              onTimeUpdate={handleTimeUpdate}
              onPlayingChange={handlePlayingChange}
              onZoneClick={handleZoneClick}
            />
          </Suspense>
        </div>
        {/* Compact timeline */}
        <div className="h-32 border-t border-zinc-800/50 bg-zinc-900/30 shrink-0 px-2 py-1">
          <Timeline
            project={project}
            currentTime={currentTime}
            totalDuration={totalDuration}
            selectedElement={selectedElement}
            highlightedElement={highlightedElement}
            onSeek={handleSeek}
            onSelect={setSelectedElement}
            onDragEnd={handleDragEnd}
            onResizeEnd={handleResizeEnd}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* TOP BAR */}
      <div className="h-11 md:h-12 border-b border-zinc-800/50 flex items-center px-3 md:px-4 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <span className="text-xs md:text-sm font-semibold text-zinc-400 shrink-0">
            Studio
          </span>
          <span className="text-zinc-700 hidden md:inline">/</span>
          <input
            value={project.name}
            onChange={(e) => update({ name: e.target.value })}
            className="bg-transparent text-xs md:text-sm text-zinc-300 outline-none w-24 md:w-48 min-w-0"
            placeholder="Nom"
          />
          {autoPilot && (
            <span className="text-[10px] md:text-[11px] text-emerald-500 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="hidden md:inline">{autoPilotStep}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Undo / Redo — hidden on mobile */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="hidden md:block px-2 py-1 text-xs text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
            title="Annuler (Ctrl+Z)"
          >
            Annuler
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="hidden md:block px-2 py-1 text-xs text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
            title="Retablir (Ctrl+Shift+Z)"
          >
            Retablir
          </button>

          <div className="w-px h-5 bg-zinc-800 mx-1 hidden md:block" />

          {/* Focus mode — hidden on mobile */}
          <button
            onClick={() => setFocusMode(true)}
            className="hidden md:block px-2 py-1 text-xs text-zinc-500 hover:text-white transition-colors"
            title="Mode Focus (F)"
          >
            Focus
          </button>

          <div className="w-px h-5 bg-zinc-800 mx-1 hidden md:block" />

          {/* Export — always visible but compact on mobile */}
          <button
            onClick={() => void handleRender("full")}
            disabled={rendering}
            className="hidden md:block px-4 py-1.5 bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 rounded-lg text-xs font-semibold transition-colors"
          >
            {rendering ? renderStatus || "Rendu en cours..." : "Exporter"}
          </button>
          <button
            onClick={() => void handleRender("trailer")}
            disabled={rendering}
            className="hidden md:block px-3 py-1.5 border border-cyan-800 text-cyan-300 hover:bg-cyan-950 disabled:opacity-40 rounded-lg text-xs font-semibold transition-colors"
          >
            {rendering && renderKind === "trailer"
              ? "Extrait..."
              : `Extrait ${project.trailerDurationSeconds ?? 30}s`}
          </button>
          {renderUrl && (
            <a
              href={renderUrl}
              download
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Telecharger
            </a>
          )}
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Icon toolbar — hidden on mobile */}
        <div className="hidden md:flex w-12 border-r border-zinc-800/50 flex-col items-center py-3 gap-1 shrink-0">
          {TOOLBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                setActivePanel(activePanel === item.id ? null : item.id)
              }
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                activePanel === item.id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50"
              }`}
              title={item.label}
            >
              <ToolbarIcon id={item.id} />
            </button>
          ))}
        </div>

        {/* Left: Panel content — hidden on mobile, overlay on tablet */}
        {activePanel && (
          <div className="hidden md:block lg:contents">
            <ToolbarPanels
              project={project}
              update={update}
              activePanel={activePanel}
              onUploadVideo={handleMainVideo}
              onTranscribe={handleTranscribe}
              onFixSubtitles={handleFixSubtitles}
              onAutoPilot={handleAutoPilot}
              transcribing={transcribing}
              fixingSubs={fixingSubs}
              autoPilot={autoPilot}
              autoPilotStep={autoPilotStep}
              selectedPresetId={selectedPresetId}
              onPreset={async (preset) => {
                setFillingCards(true);
                await handlePreset(preset).finally(() =>
                  setFillingCards(false),
                );
              }}
              onEpisode={(episode) => {
                const cards = applyEpisode(
                  episode,
                  project.mainVideoDurationSeconds,
                );
                setSelectedPresetId(episode.presetId);
                update({ style: "educatif", cards });
              }}
              fillingCards={fillingCards}
              brollSuggestions={brollSuggestions}
              setBrollSuggestions={setBrollSuggestions}
              brollFilesRef={brollFilesRef}
              bgMusicFileRef={bgMusicFileRef}
              zoomIntensity={zoomIntensity}
              setZoomIntensity={setZoomIntensity}
            />
          </div>
        )}

        {/* Center: Preview — takes all available space */}
        <div
          className="flex-1 flex flex-col items-center justify-center bg-zinc-900/20 min-w-0 md:min-w-[380px] relative"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDoubleClick={() => setFocusMode(true)}
        >
          {/* "Creer mon montage" overlay */}
          {hasVideo && !hasSubs && !autoPilot && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
              <button
                onClick={handleAutoPilot}
                className="px-6 py-3 md:px-8 md:py-4 bg-white text-zinc-900 hover:bg-zinc-200 rounded-2xl text-sm md:text-base font-bold transition-all shadow-xl"
              >
                Creer mon montage
              </button>
            </div>
          )}

          {/* Template picker overlay — shown after transcription, user picks a template */}
          {waitingForTemplate && templateSuggestions && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md">
              <div className="w-full max-w-xl px-4">
                <h2 className="text-base font-semibold text-white text-center mb-1">
                  Quel style de montage ?
                </h2>
                <p className="text-xs text-zinc-500 text-center mb-5">
                  L’IA a analyse ton contenu. Choisis le template qui correspond
                  le mieux.
                </p>
                <div className="flex flex-col gap-3">
                  {templateSuggestions.map((s, i) => (
                    <button
                      key={s.templateId}
                      onClick={() => continueWithTemplate(s.preset)}
                      className={`group relative text-left px-4 py-3 rounded-xl border transition-all ${
                        i === 0
                          ? "border-white/30 bg-zinc-800/80 hover:bg-zinc-700/80"
                          : "border-zinc-700/50 bg-zinc-800/40 hover:bg-zinc-800/70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">
                          {s.preset.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {Math.round(s.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug mb-1.5">
                        {s.preset.description}
                      </p>
                      {/* Mini timeline mockup */}
                      <div className="relative h-5 bg-zinc-900/80 rounded my-2 overflow-hidden">
                        {/* Video bar */}
                        <div className="absolute inset-0 bg-zinc-700/30 rounded" />
                        {s.preset.cardSlots.length === 0 ? (
                          <div className="absolute inset-y-0 left-1 right-1 flex items-center">
                            <span className="text-[8px] text-zinc-500 italic">
                              sous-titres seulement
                            </span>
                          </div>
                        ) : (
                          s.preset.cardSlots.map((slot, si) => {
                            const colors: Record<string, string> = {
                              "root-letters": "bg-amber-500/70",
                              "single-word": "bg-sky-500/70",
                              verse: "bg-emerald-500/70",
                              "family-recap": "bg-purple-500/70",
                              "custom-text": "bg-zinc-400/60",
                              cta: "bg-rose-500/70",
                              "price-tag": "bg-orange-500/70",
                              "feature-list": "bg-teal-500/70",
                            };
                            const labels: Record<string, string> = {
                              "root-letters": "ر",
                              "single-word": "ك",
                              verse: "آ",
                              "family-recap": "ع",
                              "custom-text": "T",
                              cta: "CTA",
                              "price-tag": "$",
                              "feature-list": "F",
                            };
                            return (
                              <div
                                key={si}
                                className={`absolute top-0.5 bottom-0.5 rounded-sm flex items-center justify-center ${colors[slot.type] ?? "bg-zinc-500/50"}`}
                                style={{
                                  left: `${slot.startRatio * 100}%`,
                                  width: `${Math.max((slot.endRatio - slot.startRatio) * 100, 2)}%`,
                                }}
                                title={slot.type}
                              >
                                <span className="text-[7px] font-bold text-white/80 leading-none">
                                  {labels[slot.type] ?? "?"}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 italic">
                        {s.reason}
                      </p>
                      {/* Confidence bar */}
                      <div className="mt-2 h-0.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/60 rounded-full transition-all"
                          style={{
                            width: `${Math.round(s.confidence * 100)}%`,
                          }}
                        />
                      </div>
                      {i === 0 && (
                        <span className="absolute -top-2 right-3 px-2 py-0.5 bg-white text-zinc-900 text-[9px] font-bold rounded-full uppercase tracking-wider">
                          Recommande
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* B-roll picker overlay — after auto-pilot, user picks visuals */}
          {!autoPilot && !waitingForTemplate && brollSuggestions.length > 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md overflow-auto">
              <div className="w-full max-w-lg px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Choisis tes visuels
                    </h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {brollSuggestions.length} moment
                      {brollSuggestions.length > 1 ? "s" : ""} a illustrer —
                      clique sur une image ou passe
                    </p>
                  </div>
                  <button
                    onClick={() => setBrollSuggestions([])}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors"
                  >
                    Tout passer
                  </button>
                </div>

                <div className="space-y-4">
                  {brollSuggestions.map((s, si) => {
                    const allMedia = [
                      ...s.images.slice(0, 6),
                      ...s.videos.slice(0, 4),
                    ];
                    return (
                      <div
                        key={si}
                        className="rounded-xl bg-zinc-800/60 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-amber-400">
                              {s.keyword}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-mono">
                              {s.startTime.toFixed(1)}s — {s.endTime.toFixed(1)}
                              s
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setBrollSuggestions(
                                brollSuggestions.filter((_, i) => i !== si),
                              )
                            }
                            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                          >
                            Passer
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic">
                          {s.reason}
                        </p>
                        <div className="grid grid-cols-5 gap-1.5">
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
                              className="group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-400 transition-all aspect-[3/4]"
                            >
                              <img
                                src={media.thumb}
                                alt={s.keyword}
                                className="w-full h-full object-cover"
                              />
                              {media.type === "video" && (
                                <span className="absolute top-1 left-1 bg-black/70 text-[8px] text-white px-1.5 py-0.5 rounded font-medium">
                                  VIDEO
                                </span>
                              )}
                              <span className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/20 transition-colors flex items-center justify-center">
                                <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-zinc-900 text-lg font-bold">
                                  +
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <Suspense
            fallback={
              <div className="w-[240px] h-[427px] md:w-[300px] md:h-[533px] bg-zinc-800/30 rounded-2xl animate-pulse" />
            }
          >
            <PlayerPreview
              ref={playerHandleRef}
              project={project}
              totalDuration={totalDuration}
              onTimeUpdate={handleTimeUpdate}
              onPlayingChange={handlePlayingChange}
              onZoneClick={handleZoneClick}
            />
          </Suspense>
        </div>

        {/* Right panel: PropertyPanel when element selected, otherwise AgentPanel */}
        {showAgent || selectedElement ? (
          <>
            {/* Backdrop on mobile */}
            <div
              className="fixed inset-0 bg-black/40 z-30 md:hidden animate-[fadeIn_150ms_ease-out]"
              onClick={() => {
                setShowAgent(false);
                setSelectedElement(null);
              }}
            />
            <div className="fixed right-0 top-11 bottom-0 w-80 z-40 animate-[slideInRight_200ms_ease-out] md:animate-none md:relative md:top-auto md:bottom-auto md:z-auto md:w-72 min-w-[260px] max-w-[340px] border-l border-zinc-800/50 bg-zinc-900 md:bg-zinc-900/20 shrink-0 flex flex-col">
              {selectedElement ? (
                <PropertyPanel
                  project={project}
                  update={update}
                  selectedElement={selectedElement}
                  onDeselect={() => setSelectedElement(null)}
                  onDuplicate={handleDuplicateSelected}
                  onDelete={handleDeleteSelected}
                />
              ) : (
                <AgentPanel
                  project={project}
                  update={update}
                  undo={undo}
                  currentTime={currentTime}
                  currentFrame={currentFrame}
                  isPlaying={isPlaying}
                  selectedElement={selectedElement}
                  onSeek={handleSeek}
                  onSelectElement={setSelectedElement}
                  onHighlight={setHighlightedElement}
                  captureFrame={() =>
                    playerHandleRef.current?.captureFrame() ?? null
                  }
                  onCollapse={() => setShowAgent(false)}
                />
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => setShowAgent(true)}
            className="w-10 border-l border-zinc-800/50 bg-zinc-900/20 shrink-0 flex items-center justify-center hover:bg-zinc-800/40 transition-colors"
            title="Ouvrir l'agent (A)"
          >
            <span className="text-zinc-500 text-xs font-semibold [writing-mode:vertical-lr]">
              Agent
            </span>
          </button>
        )}
      </div>

      {/* BOTTOM: Timeline — hidden on mobile, compact on tablet */}
      <div className="hidden md:block h-40 lg:h-52 border-t border-zinc-800/50 bg-zinc-900/30 shrink-0 px-2 py-1">
        <Timeline
          project={project}
          currentTime={currentTime}
          totalDuration={totalDuration}
          selectedElement={selectedElement}
          highlightedElement={highlightedElement}
          onSeek={handleSeek}
          onSelect={setSelectedElement}
          onDragEnd={handleDragEnd}
          onResizeEnd={handleResizeEnd}
        />
      </div>

      {/* Mobile bottom bar — visible only on mobile */}
      <div className="flex md:hidden h-12 border-t border-zinc-800/50 bg-zinc-900/50 shrink-0 items-center justify-around px-2">
        <button
          onClick={() => playerHandleRef.current?.toggle()}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          {isPlaying ? "||" : "\u25B6"}
        </button>
        <span className="text-[11px] text-zinc-500 font-mono">
          {Math.floor(currentTime / 60)}:
          {String(Math.floor(currentTime % 60)).padStart(2, "0")}
        </span>
        <button
          onClick={() => setShowAgent((s) => !s)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors ${showAgent ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}
        >
          AI
        </button>
        <button
          onClick={() => void handleRender("full")}
          disabled={rendering}
          className="px-3 py-1.5 bg-white text-zinc-900 rounded-lg text-xs font-semibold disabled:opacity-40"
        >
          {rendering ? "..." : "Export"}
        </button>
      </div>

      {/* Shortcuts overlay */}
      {showShortcuts && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50 animate-[fadeIn_150ms_ease-out]"
            onClick={() => setShowShortcuts(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-6 w-80 pointer-events-auto animate-[slideInUp_200ms_ease-out] shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">
                  Raccourcis clavier
                </h2>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="text-zinc-500 hover:text-white text-xs transition-colors"
                >
                  Fermer
                </button>
              </div>
              <div className="space-y-2">
                {SHORTCUTS.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="text-zinc-400">{s.desc}</span>
                    <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 text-[11px] font-mono">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
