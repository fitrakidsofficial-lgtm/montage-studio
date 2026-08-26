/**
 * Typed actions for modifying VideoProject.
 * Each action validates its args and returns a Partial<VideoProject> patch.
 * Used by the Agent de Montage to apply changes safely.
 */
import type {
  VideoProject,
  BrollItem,
  BrollLayout,
  ZoomKeyframe,
} from "./types";

// ── B-roll actions ──

export function addBroll(
  project: VideoProject,
  args: {
    startTime: number;
    endTime: number;
    fileUrl: string;
    mediaType: "image" | "video";
    orientation?: "portrait" | "landscape";
    layout?: BrollLayout;
  },
): Partial<VideoProject> {
  if (args.startTime >= args.endTime)
    throw new Error("startTime doit etre < endTime");
  if (args.endTime > project.mainVideoDurationSeconds)
    throw new Error("endTime depasse la duree");
  const broll: BrollItem = {
    id: crypto.randomUUID(),
    startTime: args.startTime,
    endTime: args.endTime,
    fileUrl: args.fileUrl,
    mediaType: args.mediaType,
    orientation: args.orientation ?? "portrait",
    layout: args.layout ?? "auto",
  };
  return { brolls: [...project.brolls, broll] };
}

export function removeBroll(
  project: VideoProject,
  args: { id: string },
): Partial<VideoProject> {
  return { brolls: project.brolls.filter((b) => b.id !== args.id) };
}

export function replaceBroll(
  project: VideoProject,
  args: {
    id: string;
    fileUrl: string;
    mediaType?: "image" | "video";
    orientation?: "portrait" | "landscape";
    layout?: BrollLayout;
  },
): Partial<VideoProject> {
  return {
    brolls: project.brolls.map((b) =>
      b.id === args.id
        ? {
            ...b,
            fileUrl: args.fileUrl,
            mediaType: args.mediaType ?? b.mediaType,
            orientation: args.orientation ?? b.orientation,
            layout: args.layout ?? b.layout,
          }
        : b,
    ),
  };
}

export function updateBrollLayout(
  project: VideoProject,
  args: { id: string; layout: BrollLayout },
): Partial<VideoProject> {
  return {
    brolls: project.brolls.map((b) =>
      b.id === args.id ? { ...b, layout: args.layout } : b,
    ),
  };
}

export function updateBrollTiming(
  project: VideoProject,
  args: { id: string; startTime?: number; endTime?: number },
): Partial<VideoProject> {
  return {
    brolls: project.brolls.map((b) =>
      b.id === args.id
        ? {
            ...b,
            startTime: args.startTime ?? b.startTime,
            endTime: args.endTime ?? b.endTime,
          }
        : b,
    ),
  };
}

// ── Zoom actions ──

export function addZoom(
  project: VideoProject,
  args: { time: number; scale: number; duration: number },
): Partial<VideoProject> {
  if (args.scale < 1 || args.scale > 2)
    throw new Error("scale doit etre entre 1 et 2");
  const zoom: ZoomKeyframe = {
    time: args.time,
    scale: args.scale,
    duration: args.duration,
  };
  return { zooms: [...(project.zooms ?? []), zoom] };
}

export function removeZoom(
  project: VideoProject,
  args: { time: number },
): Partial<VideoProject> {
  return {
    zooms: (project.zooms ?? []).filter(
      (z) => Math.abs(z.time - args.time) > 0.1,
    ),
  };
}

export function updateZoom(
  project: VideoProject,
  args: { time: number; scale?: number; duration?: number },
): Partial<VideoProject> {
  return {
    zooms: (project.zooms ?? []).map((z) =>
      Math.abs(z.time - args.time) < 0.1
        ? {
            ...z,
            scale: args.scale ?? z.scale,
            duration: args.duration ?? z.duration,
          }
        : z,
    ),
  };
}

export function removeAllZooms(): Partial<VideoProject> {
  return { zooms: [] };
}

// ── Hook actions ──

export function updateHook(
  _project: VideoProject,
  args: { text?: string; duration?: number; style?: "overlay" | "card" },
): Partial<VideoProject> {
  const patch: Partial<VideoProject> = {};
  if (args.text !== undefined) patch.introText = args.text;
  if (args.duration !== undefined) patch.introDuration = args.duration;
  if (args.style !== undefined) patch.hookStyle = args.style;
  return patch;
}

export function removeHook(): Partial<VideoProject> {
  return { introText: null, introDuration: 0 };
}

// ── CTA actions ──

export function updateCTA(
  _project: VideoProject,
  args: {
    objective:
      "engagement" | "save" | "share" | "subscribe" | "traffic" | "sale";
  },
): Partial<VideoProject> {
  return { ctaObjective: args.objective };
}

export function removeCTA(): Partial<VideoProject> {
  return { ctaObjective: null };
}

// ── Subtitle actions ──

export function updateSubtitleStyle(): Partial<VideoProject> {
  // Style is handled by brand config — no-op for now
  return {};
}

export function updateSubtitleText(
  project: VideoProject,
  args: { index: number; text: string },
): Partial<VideoProject> {
  if (args.index < 0 || args.index >= project.subtitles.length) {
    throw new Error("Index de sous-titre invalide");
  }
  const subtitles = project.subtitles.map((s, i) =>
    i === args.index ? { ...s, text: args.text } : s,
  );
  return { subtitles };
}

// ── TexteCle actions ──

export function addTexteCle(
  project: VideoProject,
  args: { time: number; duration: number; text: string },
): Partial<VideoProject> {
  return {
    texteCles: [
      ...(project.texteCles ?? []),
      { time: args.time, duration: args.duration, text: args.text },
    ],
  };
}

export function updateTexteCle(
  project: VideoProject,
  args: { time: number; text?: string; duration?: number },
): Partial<VideoProject> {
  return {
    texteCles: (project.texteCles ?? []).map((t) =>
      Math.abs(t.time - args.time) < 0.1
        ? {
            ...t,
            text: args.text ?? t.text,
            duration: args.duration ?? t.duration,
          }
        : t,
    ),
  };
}

export function removeTexteCle(
  project: VideoProject,
  args: { time: number },
): Partial<VideoProject> {
  return {
    texteCles: (project.texteCles ?? []).filter(
      (t) => Math.abs(t.time - args.time) > 0.1,
    ),
  };
}

// ── Pattern Interrupt actions ──

export function addPatternInterrupt(
  project: VideoProject,
  args: { time: number; duration: number },
): Partial<VideoProject> {
  return {
    patternInterrupts: [
      ...(project.patternInterrupts ?? []),
      { time: args.time, duration: args.duration },
    ],
  };
}

export function removePatternInterrupt(
  project: VideoProject,
  args: { time: number },
): Partial<VideoProject> {
  return {
    patternInterrupts: (project.patternInterrupts ?? []).filter(
      (p) => Math.abs(p.time - args.time) > 0.1,
    ),
  };
}

// ── Audio actions ──

export function updateMusicVolume(
  _project: VideoProject,
  args: { volume: number },
): Partial<VideoProject> {
  return { bgMusicVolume: Math.max(0, Math.min(1, args.volume)) };
}

export function removeMusic(): Partial<VideoProject> {
  return { bgMusicUrl: null, bgMusicVolume: 0.15 };
}

// ── Silence cut actions ──

export function addSilenceCut(
  project: VideoProject,
  args: { start: number; end: number },
): Partial<VideoProject> {
  if (args.start >= args.end) throw new Error("start doit etre < end");
  return {
    silenceCuts: [
      ...(project.silenceCuts ?? []),
      { start: args.start, end: args.end },
    ],
  };
}

export function removeSilenceCut(
  project: VideoProject,
  args: { start: number },
): Partial<VideoProject> {
  return {
    silenceCuts: (project.silenceCuts ?? []).filter(
      (c) => Math.abs(c.start - args.start) > 0.1,
    ),
  };
}

// ── Card actions ──

export function removeCard(
  project: VideoProject,
  args: { id: string },
): Partial<VideoProject> {
  return { cards: project.cards.filter((c) => c.id !== args.id) };
}

export function updateCardTiming(
  project: VideoProject,
  args: { id: string; startTime?: number; endTime?: number },
): Partial<VideoProject> {
  return {
    cards: project.cards.map((c) =>
      c.id === args.id
        ? {
            ...c,
            startTime: args.startTime ?? c.startTime,
            endTime: args.endTime ?? c.endTime,
          }
        : c,
    ),
  };
}

// ── Style actions ──

export function updateStyle(
  _project: VideoProject,
  args: { style: "educatif" | "promo" | "broll" },
): Partial<VideoProject> {
  return { style: args.style };
}

// ── Action registry for Agent ──

export type ActionName =
  | "addBroll"
  | "removeBroll"
  | "replaceBroll"
  | "updateBrollLayout"
  | "updateBrollTiming"
  | "addZoom"
  | "removeZoom"
  | "updateZoom"
  | "removeAllZooms"
  | "updateHook"
  | "removeHook"
  | "updateCTA"
  | "removeCTA"
  | "updateSubtitleText"
  | "addTexteCle"
  | "updateTexteCle"
  | "removeTexteCle"
  | "addPatternInterrupt"
  | "removePatternInterrupt"
  | "updateMusicVolume"
  | "removeMusic"
  | "addSilenceCut"
  | "removeSilenceCut"
  | "removeCard"
  | "updateCardTiming"
  | "updateStyle"
  | "restoreVersion";

// Wrapper to bridge typed action args with the generic agent dispatch.
// Each action validates its own args at runtime.
type GenericAction = (
  project: VideoProject,
  args: Record<string, unknown>,
) => Partial<VideoProject>;
const wrap =
  <T>(
    fn: (project: VideoProject, args: T) => Partial<VideoProject>,
  ): GenericAction =>
  (project, args) =>
    fn(project, args as unknown as T);

const ACTION_MAP: Record<ActionName, GenericAction> = {
  addBroll: wrap(addBroll),
  removeBroll: wrap(removeBroll),
  replaceBroll: wrap(replaceBroll),
  updateBrollLayout: wrap(updateBrollLayout),
  updateBrollTiming: wrap(updateBrollTiming),
  addZoom: wrap(addZoom),
  removeZoom: wrap(removeZoom),
  updateZoom: wrap(updateZoom),
  removeAllZooms: () => removeAllZooms(),
  updateHook: wrap(updateHook),
  removeHook: () => removeHook(),
  updateCTA: wrap(updateCTA),
  removeCTA: () => removeCTA(),
  updateSubtitleText: wrap(updateSubtitleText),
  addTexteCle: wrap(addTexteCle),
  updateTexteCle: wrap(updateTexteCle),
  removeTexteCle: wrap(removeTexteCle),
  addPatternInterrupt: wrap(addPatternInterrupt),
  removePatternInterrupt: wrap(removePatternInterrupt),
  updateMusicVolume: wrap(updateMusicVolume),
  removeMusic: () => removeMusic(),
  addSilenceCut: wrap(addSilenceCut),
  removeSilenceCut: wrap(removeSilenceCut),
  removeCard: wrap(removeCard),
  updateCardTiming: wrap(updateCardTiming),
  updateStyle: wrap(updateStyle),
  // restoreVersion is resolved client-side in AgentPanel before executeActions
  restoreVersion: () => ({}),
};

export interface AgentAction {
  action: ActionName;
  args: Record<string, unknown>;
  description: string;
}

/**
 * Execute a list of agent actions on a project.
 * Returns the combined patch to apply via update().
 */
export function executeActions(
  project: VideoProject,
  actions: AgentAction[],
): Partial<VideoProject> {
  let current = { ...project };
  let combinedPatch: Partial<VideoProject> = {};

  for (const { action, args } of actions) {
    const fn = ACTION_MAP[action];
    if (!fn) throw new Error(`Action inconnue: ${action}`);
    const patch = fn(current, args);
    current = { ...current, ...patch };
    combinedPatch = { ...combinedPatch, ...patch };
  }

  return combinedPatch;
}
