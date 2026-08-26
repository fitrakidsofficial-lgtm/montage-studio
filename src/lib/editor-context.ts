/**
 * Builds a rich editor context snapshot at the moment the user sends a message.
 * Used by AgentPanel → /api/agent-edit to resolve "ici", "ça", "celle-là".
 */
import type {
  VideoProject,
  SubtitleSegment,
  BrollItem,
  ConceptCard,
  ZoomKeyframe,
} from "./types";
import type { SelectedElement } from "@/components/editor/Timeline";

// ── Types ──

interface ActiveElements {
  broll: BrollItem | null;
  subtitle: SubtitleSegment | null;
  /** Pre-resolved index into project.subtitles — deterministic, never computed by LLM */
  subtitleIndex: number | null;
  card: ConceptCard | null;
  zoom: ZoomKeyframe | null;
  texteCle: { time: number; duration: number; text: string } | null;
  patternInterrupt: { time: number; duration: number } | null;
  hook: boolean;
  cta: boolean;
}

/** Deterministic target resolution — selection > playhead > nearby > null */
export interface ResolvedTarget {
  type: string;
  id?: string;
  time?: number;
  source: "selection" | "playhead" | "nearby" | "none";
}

interface TranscriptWindow {
  previous: SubtitleSegment | null;
  current: SubtitleSegment | null;
  next: SubtitleSegment | null;
}

interface NearbyEvent {
  type: string;
  time: number;
  id?: string;
  label: string;
  distance: number;
}

/** Density analysis around the playhead */
interface FocusWindow {
  start: number;
  end: number;
  brollCount: number;
  zoomCount: number;
  cardCount: number;
  texteCleCount: number;
  patternInterruptCount: number;
  silenceCutCount: number;
  subtitleCount: number;
  /** Average elements per second in the window */
  density: number;
  /** List of all elements in the window, sorted by time */
  elements: { type: string; time: number; id?: string; label: string }[];
}

export interface EditorContext {
  currentTime: number;
  currentFrame: number;
  fps: number;
  duration: number;
  isPlaying: boolean;

  selectedElement: SelectedElement | null;
  /** Deterministic target: selection > playhead > nearby > none */
  resolvedTarget: ResolvedTarget;

  activeAtPlayhead: ActiveElements;
  transcriptAroundPlayhead: TranscriptWindow;
  nearbyTimelineEvents: NearbyEvent[];
  focusWindow: FocusWindow;
}

// ── Helpers ──

function isActive(start: number, end: number, t: number): boolean {
  return t >= start - 0.05 && t <= end + 0.05;
}

function findActive<T extends { startTime: number; endTime: number }>(
  items: T[],
  t: number,
): T | null {
  return (
    items.find((item) => isActive(item.startTime, item.endTime, t)) ?? null
  );
}

function findActiveByTime<T extends { time: number; duration: number }>(
  items: T[],
  t: number,
): T | null {
  return (
    items.find((item) => isActive(item.time, item.time + item.duration, t)) ??
    null
  );
}

function inRange(t: number, start: number, end: number): boolean {
  return t >= start && t <= end;
}

// ── Main ──

export function getEditorContext(
  project: VideoProject,
  currentTime: number,
  currentFrame: number,
  isPlaying: boolean,
  selectedElement: SelectedElement | null,
): EditorContext {
  const t = currentTime;

  // Active elements at playhead
  const activeBroll = findActive(project.brolls, t);
  const activeSub =
    project.subtitles.find((s) => isActive(s.start, s.end, t)) ?? null;
  const activeCard = findActive(project.cards, t);
  const activeZoom = findActiveByTime(project.zooms ?? [], t);
  const activeTexteCle = findActiveByTime(project.texteCles ?? [], t);
  const activePI = findActiveByTime(project.patternInterrupts ?? [], t);

  const hookEnd = project.introDuration ?? 3;
  const isHookActive = !!project.introText && t <= hookEnd;

  const totalDuration =
    project.mainVideoDurationSeconds +
    (project.outroVideoUrl ? project.outroDurationSeconds : 0);
  const ctaStart =
    totalDuration -
    (project.outroVideoUrl ? project.outroDurationSeconds + 3 : 3);
  const isCtaActive =
    !!project.ctaObjective && t >= ctaStart && t <= ctaStart + 3;

  // Transcript window
  const subIdx = project.subtitles.findIndex((s) =>
    isActive(s.start, s.end, t),
  );
  const transcriptAroundPlayhead: TranscriptWindow = {
    previous: subIdx > 0 ? project.subtitles[subIdx - 1] : null,
    current: subIdx >= 0 ? project.subtitles[subIdx] : null,
    next:
      subIdx >= 0 && subIdx < project.subtitles.length - 1
        ? project.subtitles[subIdx + 1]
        : null,
  };

  if (!transcriptAroundPlayhead.current) {
    const prevIdx = project.subtitles.findLastIndex((s) => s.end <= t);
    const nextIdx = project.subtitles.findIndex((s) => s.start > t);
    transcriptAroundPlayhead.previous =
      prevIdx >= 0 ? project.subtitles[prevIdx] : null;
    transcriptAroundPlayhead.next =
      nextIdx >= 0 ? project.subtitles[nextIdx] : null;
  }

  // Nearby timeline events (within ±5s) — includes id for "celle d'après"
  const WINDOW = 5;
  const nearbyEvents: NearbyEvent[] = [];

  for (const b of project.brolls) {
    const d = Math.abs(b.startTime - t);
    if (d <= WINDOW)
      nearbyEvents.push({
        type: "broll",
        time: b.startTime,
        id: b.id,
        label: `B-roll ${b.mediaType} (${b.startTime.toFixed(1)}s-${b.endTime.toFixed(1)}s)`,
        distance: d,
      });
  }
  for (const z of project.zooms ?? []) {
    const d = Math.abs(z.time - t);
    if (d <= WINDOW)
      nearbyEvents.push({
        type: "zoom",
        time: z.time,
        label: `Zoom ${z.scale}x (${z.time.toFixed(1)}s)`,
        distance: d,
      });
  }
  for (const tc of project.texteCles ?? []) {
    const d = Math.abs(tc.time - t);
    if (d <= WINDOW)
      nearbyEvents.push({
        type: "texteCle",
        time: tc.time,
        label: `Texte "${tc.text}" (${tc.time.toFixed(1)}s)`,
        distance: d,
      });
  }
  for (const c of project.cards) {
    const d = Math.abs(c.startTime - t);
    if (d <= WINDOW)
      nearbyEvents.push({
        type: "card",
        time: c.startTime,
        id: c.id,
        label: `Card ${c.type} (${c.startTime.toFixed(1)}s)`,
        distance: d,
      });
  }

  nearbyEvents.sort((a, b) => a.distance - b.distance);

  // ── Focus Window: density analysis ±3s around playhead ──
  const FW_HALF = 3;
  const fwStart = Math.max(0, t - FW_HALF);
  const fwEnd = Math.min(totalDuration, t + FW_HALF);

  const fwElements: FocusWindow["elements"] = [];

  const fwBrolls = project.brolls.filter(
    (b) => b.startTime <= fwEnd && b.endTime >= fwStart,
  );
  for (const b of fwBrolls)
    fwElements.push({
      type: "broll",
      time: b.startTime,
      id: b.id,
      label: `B-roll ${b.mediaType}`,
    });

  const fwZooms = (project.zooms ?? []).filter((z) =>
    inRange(z.time, fwStart, fwEnd),
  );
  for (const z of fwZooms)
    fwElements.push({
      type: "zoom",
      time: z.time,
      label: `Zoom ${z.scale}x`,
    });

  const fwCards = project.cards.filter(
    (c) => c.startTime <= fwEnd && c.endTime >= fwStart,
  );
  for (const c of fwCards)
    fwElements.push({
      type: "card",
      time: c.startTime,
      id: c.id,
      label: `Card ${c.type}`,
    });

  const fwTC = (project.texteCles ?? []).filter((tc) =>
    inRange(tc.time, fwStart, fwEnd),
  );
  for (const tc of fwTC)
    fwElements.push({
      type: "texteCle",
      time: tc.time,
      label: `Texte "${tc.text}"`,
    });

  const fwPI = (project.patternInterrupts ?? []).filter((p) =>
    inRange(p.time, fwStart, fwEnd),
  );
  for (const p of fwPI)
    fwElements.push({
      type: "patternInterrupt",
      time: p.time,
      label: "Flash",
    });

  const fwCuts = (project.silenceCuts ?? []).filter(
    (c) => c.start <= fwEnd && c.end >= fwStart,
  );

  const fwSubs = project.subtitles.filter(
    (s) => s.start <= fwEnd && s.end >= fwStart,
  );

  fwElements.sort((a, b) => a.time - b.time);

  const windowDuration = fwEnd - fwStart;
  const totalElements =
    fwBrolls.length +
    fwZooms.length +
    fwCards.length +
    fwTC.length +
    fwPI.length +
    fwCuts.length;

  const focusWindow: FocusWindow = {
    start: fwStart,
    end: fwEnd,
    brollCount: fwBrolls.length,
    zoomCount: fwZooms.length,
    cardCount: fwCards.length,
    texteCleCount: fwTC.length,
    patternInterruptCount: fwPI.length,
    silenceCutCount: fwCuts.length,
    subtitleCount: fwSubs.length,
    density: windowDuration > 0 ? totalElements / windowDuration : 0,
    elements: fwElements,
  };

  // ── Deterministic target resolution ──
  // Priority: 1. selection  2. playhead active  3. nearest nearby  4. none
  let resolvedTarget: ResolvedTarget = {
    type: "none",
    source: "none",
  };

  if (selectedElement) {
    resolvedTarget = {
      type: selectedElement.type,
      id: selectedElement.id,
      time: selectedElement.time,
      source: "selection",
    };
  } else if (activeBroll) {
    resolvedTarget = {
      type: "broll",
      id: activeBroll.id,
      time: activeBroll.startTime,
      source: "playhead",
    };
  } else if (activeCard) {
    resolvedTarget = {
      type: "card",
      id: activeCard.id,
      time: activeCard.startTime,
      source: "playhead",
    };
  } else if (activeZoom) {
    resolvedTarget = {
      type: "zoom",
      time: activeZoom.time,
      source: "playhead",
    };
  } else if (activeTexteCle) {
    resolvedTarget = {
      type: "texteCle",
      time: activeTexteCle.time,
      source: "playhead",
    };
  } else if (activePI) {
    resolvedTarget = {
      type: "patternInterrupt",
      time: activePI.time,
      source: "playhead",
    };
  } else if (activeSub) {
    resolvedTarget = {
      type: "subtitle",
      time: activeSub.start,
      source: "playhead",
    };
  } else if (nearbyEvents.length > 0) {
    const nearest = nearbyEvents[0]; // already sorted by distance
    resolvedTarget = {
      type: nearest.type,
      id: nearest.id,
      time: nearest.time,
      source: "nearby",
    };
  }

  return {
    currentTime: t,
    currentFrame,
    fps: project.fps,
    duration: project.mainVideoDurationSeconds,
    isPlaying,

    selectedElement,
    resolvedTarget,

    activeAtPlayhead: {
      broll: activeBroll,
      subtitle: activeSub,
      subtitleIndex: subIdx >= 0 ? subIdx : null,
      card: activeCard,
      zoom: activeZoom,
      texteCle: activeTexteCle,
      patternInterrupt: activePI,
      hook: isHookActive,
      cta: isCtaActive,
    },

    transcriptAroundPlayhead,
    nearbyTimelineEvents: nearbyEvents.slice(0, 10),
    focusWindow,
  };
}
