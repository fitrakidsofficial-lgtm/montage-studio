"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { VideoProject } from "@/lib/types";
import { executeActions, type AgentAction } from "@/lib/project-actions";
import { getEditorContext } from "@/lib/editor-context";
import type { SelectedElement } from "./Timeline";

interface ActionResult {
  action: AgentAction;
  success: boolean;
  error?: string;
}

interface AttachedImage {
  id: string;
  dataUrl: string;
  name: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: AttachedImage[];
  actions?: AgentAction[];
  applied?: boolean;
  actionResults?: ActionResult[];
}

// ── Element version history (deterministic restore for "remets la première") ──

interface ElementVersion {
  /** What changed */
  field: string;
  /** Value before the action */
  before: unknown;
  /** Value after the action */
  after: unknown;
  /** Full action for replay */
  action: AgentAction;
}

/** Per-element modification history, keyed by elementId or type+time */
type ElementHistory = Map<string, ElementVersion[]>;

function getElementKey(action: AgentAction): string | null {
  const args = action.args as Record<string, unknown>;
  if (args.id && typeof args.id === "string") return args.id;
  if (typeof args.time === "number") return `${action.action}@${args.time}`;
  if (typeof args.index === "number") return `subtitle@${args.index}`;
  return null;
}

function captureVersions(
  project: VideoProject,
  action: AgentAction,
): ElementVersion | null {
  const args = action.args as Record<string, unknown>;
  switch (action.action) {
    case "replaceBroll": {
      const broll = project.brolls.find((b) => b.id === args.id);
      if (!broll) return null;
      return {
        field: "fileUrl",
        before: broll.fileUrl,
        after: args.fileUrl,
        action,
      };
    }
    case "updateSubtitleText": {
      const idx = args.index as number;
      const sub = project.subtitles[idx];
      if (!sub) return null;
      return { field: "text", before: sub.text, after: args.text, action };
    }
    case "updateZoom": {
      const zoom = (project.zooms ?? []).find(
        (z) => Math.abs(z.time - (args.time as number)) < 0.1,
      );
      if (!zoom) return null;
      return {
        field: "scale",
        before: zoom.scale,
        after: args.scale ?? zoom.scale,
        action,
      };
    }
    case "updateTexteCle": {
      const tc = (project.texteCles ?? []).find(
        (t) => Math.abs(t.time - (args.time as number)) < 0.1,
      );
      if (!tc) return null;
      return {
        field: "text",
        before: tc.text,
        after: args.text ?? tc.text,
        action,
      };
    }
    default:
      return null;
  }
}

/** Format a single action result for display */
function formatActionResult(r: ActionResult): string {
  const a = r.action;
  const args = a.args as Record<string, unknown>;
  const time =
    typeof args.time === "number" ? ` · ${args.time.toFixed(1)}s` : "";
  const start =
    typeof args.startTime === "number"
      ? ` · ${args.startTime.toFixed(1)}s`
      : "";
  const icon = r.success ? "\u2713" : "\u26A0";

  const labels: Record<string, string> = {
    addBroll: `B-roll ajoute${start}`,
    removeBroll: "B-roll supprime",
    replaceBroll: "B-roll remplace",
    updateBrollLayout: `Layout ${args.layout ?? ""}`,
    updateBrollTiming: `Timing B-roll${start}`,
    addZoom: `Zoom ajoute${time}`,
    removeZoom: `Zoom supprime${time}`,
    updateZoom: `Zoom modifie${time}`,
    removeAllZooms: "Tous les zooms supprimes",
    updateHook: "Hook modifie",
    removeHook: "Hook supprime",
    updateCTA: `CTA ${args.objective ?? ""}`,
    removeCTA: "CTA supprime",
    updateSubtitleText: `Sous-titre [${args.index}] modifie`,
    addTexteCle: `Texte cle ajoute${time}`,
    updateTexteCle: `Texte cle modifie${time}`,
    removeTexteCle: `Texte cle supprime${time}`,
    addPatternInterrupt: `Pattern interrupt${time}`,
    removePatternInterrupt: `Pattern interrupt supprime${time}`,
    updateMusicVolume: `Volume ${args.volume}`,
    removeMusic: "Musique supprimee",
    addSilenceCut: `Coupe silence${start}`,
    removeSilenceCut: `Coupe silence supprimee`,
    removeCard: "Carte supprimee",
    updateCardTiming: `Timing carte${start}`,
    updateStyle: `Style ${args.style ?? ""}`,
    restoreVersion: "Version restauree",
  };

  const label = labels[a.action] ?? a.description;
  return r.success
    ? `${icon} ${label}`
    : `${icon} ${label} — ${r.error ?? "echec"}`;
}

/** Execute actions one by one, tracking success/failure per action */
function executeActionsTransactional(
  project: VideoProject,
  actions: AgentAction[],
): { patch: Partial<VideoProject>; results: ActionResult[] } {
  let current = { ...project };
  let combinedPatch: Partial<VideoProject> = {};
  const results: ActionResult[] = [];

  for (const action of actions) {
    try {
      const patch = executeActions(current, [action]);
      current = { ...current, ...patch };
      combinedPatch = { ...combinedPatch, ...patch };
      results.push({ action, success: true });
    } catch (err) {
      results.push({ action, success: false, error: (err as Error).message });
    }
  }

  return { patch: combinedPatch, results };
}

/** Build a summary of version history for elements that have been modified */
function buildVersionSummary(
  history: ElementHistory,
): { elementId: string; versions: { index: number; value: unknown }[] }[] {
  const result: {
    elementId: string;
    versions: { index: number; value: unknown }[];
  }[] = [];
  for (const [key, versions] of history) {
    if (versions.length === 0) continue;
    const vList: { index: number; value: unknown }[] = [
      { index: 0, value: versions[0].before },
    ];
    versions.forEach((v, i) => vList.push({ index: i + 1, value: v.after }));
    result.push({ elementId: key, versions: vList });
  }
  return result;
}

// ── Visual intent detector ──
// Keyword-based, runs locally, no LLM call.
const VISUAL_KEYWORDS = [
  "moche",
  "laid",
  "bizarre",
  "flou",
  "pixeli",
  "sombre",
  "clair",
  "cadrage",
  "cadre",
  "rendu",
  "qualite",
  "resolution",
  "trop bas",
  "trop haut",
  "trop gros",
  "trop petit",
  "trop charge",
  "on ne voit",
  "on voit pas",
  "pas lisible",
  "illisible",
  "couleur",
  "contraste",
  "luminosi",
  "IA",
  "artificiel",
  "fake",
  "generee",
  "transition",
  "coupure",
  "glitch",
  "image est",
  "photo est",
  "visuel",
  "esthetique",
  "style visuel",
  "look",
];

function needsVisualContext(text: string): boolean {
  const lower = text.toLowerCase();
  return VISUAL_KEYWORDS.some((kw) => lower.includes(kw));
}

type AgentState =
  | "idle"
  | "thinking"
  | "analyzing-frame"
  | "applying"
  | "confirmed"
  | "failed";

const AGENT_STATE_LABELS: Record<AgentState, string> = {
  idle: "",
  thinking: "Reflexion en cours...",
  "analyzing-frame": "Analyse de l'image...",
  applying: "Application des modifications...",
  confirmed: "",
  failed: "",
};

/** Extract timecode from an action's args for seek */
function getActionTimecode(action: AgentAction): number | null {
  const args = action.args as Record<string, unknown>;
  if (typeof args.startTime === "number") return args.startTime;
  if (typeof args.time === "number") return args.time;
  return null;
}

/** Extract selection info from an action for auto-select */
function getActionSelection(action: AgentAction): SelectedElement | null {
  const args = action.args as Record<string, unknown>;
  const a = action.action;
  if (
    (a === "addBroll" ||
      a === "removeBroll" ||
      a === "replaceBroll" ||
      a === "updateBrollLayout" ||
      a === "updateBrollTiming") &&
    typeof args.id === "string"
  ) {
    return {
      type: "broll",
      id: args.id,
      time: (args.startTime as number) ?? 0,
    };
  }
  if (
    (a === "addZoom" || a === "removeZoom" || a === "updateZoom") &&
    typeof args.time === "number"
  ) {
    return { type: "zoom", id: "0", time: args.time };
  }
  if (
    (a === "removeCard" || a === "updateCardTiming") &&
    typeof args.id === "string"
  ) {
    return {
      type: "card",
      id: args.id,
      time: (args.startTime as number) ?? 0,
    };
  }
  return null;
}

interface Props {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  undo: () => void;
  currentTime: number;
  currentFrame: number;
  isPlaying: boolean;
  selectedElement: SelectedElement | null;
  onSeek: (time: number) => void;
  onSelectElement: (el: SelectedElement | null) => void;
  onHighlight: (el: { type: string; id: string } | null) => void;
  captureFrame: () => string | null;
  onCollapse?: () => void;
}

export function AgentPanel({
  project,
  update,
  undo,
  currentTime,
  currentFrame,
  isPlaying,
  selectedElement,
  onSeek,
  onSelectElement,
  onHighlight,
  captureFrame,
  onCollapse,
}: Props) {
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Pret a monter. Dis-moi quoi changer.",
    },
  ]);
  const [input, setInput] = useState("");
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const elementHistoryRef = useRef<ElementHistory>(new Map());

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleImageAttach = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedImages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              dataUrl: reader.result as string,
              name: file.name,
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    },
    [],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedImages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              dataUrl: reader.result as string,
              name: "screenshot.png",
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && attachedImages.length === 0) return;
    if (loading) return;

    const currentImages = [...attachedImages];
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || "(image jointe)",
      images: currentImages.length > 0 ? currentImages : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedImages([]);
    setLoading(true);

    // Images attached by user force visual context
    const hasUserImages = currentImages.length > 0;
    const isVisual = hasUserImages || needsVisualContext(text);
    setAgentState(isVisual ? "analyzing-frame" : "thinking");

    // Build rich editor context at send time
    const editorContext = getEditorContext(
      project,
      currentTime,
      currentFrame,
      isPlaying,
      selectedElement,
    );

    // Capture frame for visual intent — graceful null on CORS/failure
    let frameDataUrl: string | null = null;
    if (isVisual && !hasUserImages) {
      try {
        frameDataUrl = captureFrame();
      } catch {
        frameDataUrl = null;
      }
    }
    // User-attached images take priority
    const userImageDataUrls = currentImages.map((img) => img.dataUrl);

    try {
      const res = await fetch("/api/agent-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          editorContext,
          resolvedTarget: editorContext.resolvedTarget,
          elementVersions: buildVersionSummary(elementHistoryRef.current),
          visualIntent: isVisual,
          frameImage: hasUserImages
            ? userImageDataUrls[0]
            : isVisual
              ? frameDataUrl
              : undefined,
          userImages:
            userImageDataUrls.length > 1
              ? userImageDataUrls.slice(1)
              : undefined,
          project: {
            style: project.style,
            duration: project.mainVideoDurationSeconds,
            subtitles: project.subtitles.slice(0, 30),
            brolls: project.brolls.map((b) => ({
              id: b.id,
              startTime: b.startTime,
              endTime: b.endTime,
              mediaType: b.mediaType,
              fileUrl: b.fileUrl.startsWith("blob:") ? "(local)" : b.fileUrl,
            })),
            zooms: project.zooms ?? [],
            texteCles: project.texteCles ?? [],
            patternInterrupts: project.patternInterrupts ?? [],
            cards: project.cards.map((c) => ({
              id: c.id,
              type: c.type,
              startTime: c.startTime,
              endTime: c.endTime,
            })),
            silenceCuts: project.silenceCuts ?? [],
            introText: project.introText,
            hookStyle: project.hookStyle,
            ctaObjective: project.ctaObjective,
            bgMusicUrl: project.bgMusicUrl ? "(present)" : null,
            bgMusicVolume: project.bgMusicVolume,
          },
          history: messages.slice(-8).map((m) => {
            // Include action details in assistant messages for referent tracking
            let content = m.content;
            if (m.role === "assistant" && m.actions && m.actions.length > 0) {
              const actionSummary = m.actions
                .map(
                  (a) =>
                    `[ACTION: ${a.action}(${JSON.stringify(a.args)}) — ${a.description}]`,
                )
                .join("\n");
              content += `\n\n${actionSummary}`;
            }
            return { role: m.role, content };
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.error || "Erreur de l'agent",
          },
        ]);
        return;
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
        actions: data.actions,
        applied: false,
      };

      // Handle restoreVersion deterministically — resolve from local history
      let finalActions: AgentAction[] = data.actions ?? [];
      if (
        finalActions.length === 1 &&
        finalActions[0].action === "restoreVersion"
      ) {
        const rv = finalActions[0].args as {
          elementId: string;
          versionIndex: number;
        };
        const versions = elementHistoryRef.current.get(rv.elementId);
        if (versions && rv.versionIndex >= 0) {
          if (rv.versionIndex === 0) {
            // Restore original (before first modification)
            const original = versions[0]?.before;
            if (original !== undefined) {
              finalActions = [
                {
                  action: "replaceBroll" as const,
                  args: { id: rv.elementId, fileUrl: original },
                  description: `Restauration version originale`,
                },
              ];
            }
          } else if (rv.versionIndex <= versions.length) {
            const target = versions[rv.versionIndex - 1]?.after;
            if (target !== undefined) {
              finalActions = [
                {
                  action: "replaceBroll" as const,
                  args: { id: rv.elementId, fileUrl: target },
                  description: `Restauration version ${rv.versionIndex}`,
                },
              ];
            }
          }
        }
      }

      // Auto-apply up to 5 coherent actions, preview for larger batches
      if (finalActions.length > 0 && finalActions.length <= 5) {
        setAgentState("applying");

        // Track versions BEFORE applying
        for (const action of finalActions) {
          const version = captureVersions(project, action);
          if (version) {
            const key = getElementKey(action);
            if (key) {
              const existing = elementHistoryRef.current.get(key) ?? [];
              existing.push(version);
              elementHistoryRef.current.set(key, existing);
            }
          }
        }
        const { patch, results } = executeActionsTransactional(
          project,
          finalActions,
        );
        const succeeded = results.filter((r) => r.success).length;
        if (succeeded > 0) {
          update(patch);
          assistantMsg.applied = true;
          setAgentState("confirmed");

          // Post-action: seek to first successful action's timecode
          const firstOk = results.find((r) => r.success);
          if (firstOk) {
            const tc = getActionTimecode(firstOk.action);
            if (tc !== null) onSeek(tc);
            const sel = getActionSelection(firstOk.action);
            if (sel) onSelectElement(sel);
            // Highlight in timeline
            const key = getElementKey(firstOk.action);
            const args = firstOk.action.args as Record<string, unknown>;
            if (key) {
              const hlType = firstOk.action.action.includes("Broll")
                ? "broll"
                : firstOk.action.action.includes("Zoom")
                  ? "zoom"
                  : firstOk.action.action.includes("Card")
                    ? "card"
                    : firstOk.action.action.includes("Subtitle")
                      ? "subtitle"
                      : firstOk.action.action.includes("TexteCle")
                        ? "texteCle"
                        : null;
              if (hlType) {
                const hlId =
                  typeof args.id === "string" ? args.id : String(key);
                onHighlight({ type: hlType, id: hlId });
                setTimeout(() => onHighlight(null), 2500);
              }
            }
          }
        } else {
          setAgentState("failed");
        }
        assistantMsg.actionResults = results;
      } else {
        setAgentState("idle");
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setAgentState("failed");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Erreur reseau: ${(err as Error).message}`,
        },
      ]);
    } finally {
      setLoading(false);
      // Reset state after short delay so confirmed/failed is visible
      setTimeout(() => setAgentState((s) => (s !== "idle" ? "idle" : s)), 3000);
    }
  }, [
    input,
    attachedImages,
    loading,
    project,
    update,
    currentTime,
    currentFrame,
    isPlaying,
    selectedElement,
    captureFrame,
    onSeek,
    onSelectElement,
    onHighlight,
    messages,
  ]);

  const applyActions = useCallback(
    (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg?.actions || msg.applied) return;
      const { patch, results } = executeActionsTransactional(
        project,
        msg.actions,
      );
      const succeeded = results.filter((r) => r.success).length;
      const statusLines = results.map(formatActionResult);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                applied: succeeded > 0,
                actionResults: results,
                content: m.content + "\n\n" + statusLines.join("\n"),
              }
            : m,
        ),
      );
      if (succeeded > 0) update(patch);
    },
    [messages, project, update],
  );

  const handleUndo = useCallback(() => {
    undo();
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Derniere modification annulee.",
      },
    ]);
  }, [undo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Parse timecodes in agent messages for clickable seek
  const renderContent = useCallback(
    (content: string) => {
      // Match patterns like "12.4s", "à 17.8s", "17.8 s"
      const parts = content.split(/(\d+\.?\d*\s?s\b)/g);
      return parts.map((part, i) => {
        const match = part.match(/^(\d+\.?\d*)\s?s$/);
        if (match) {
          const time = parseFloat(match[1]);
          return (
            <button
              key={i}
              onClick={() => onSeek(time)}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
            >
              {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      });
    },
    [onSeek],
  );

  // Format playhead indicator
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  };

  // Quick action chips
  const quickActions = [
    { label: "Ajouter zoom ici", msg: "Ajoute un zoom a ce moment" },
    { label: "Couper les silences", msg: "Detecte et coupe les silences" },
    { label: "Changer le hook", msg: "Propose un meilleur hook" },
    { label: "Ajouter B-roll", msg: "Suggere un B-roll pour ce passage" },
  ];

  const handleQuickAction = useCallback((msg: string) => {
    setInput(msg);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800/50 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full transition-colors ${
            agentState === "idle"
              ? "bg-emerald-500"
              : agentState === "confirmed"
                ? "bg-emerald-400 animate-pulse"
                : agentState === "failed"
                  ? "bg-red-500"
                  : "bg-amber-400 animate-pulse"
          }`}
        />
        <span className="text-xs font-semibold text-zinc-300 flex-1">
          {agentState === "idle"
            ? "Pret"
            : agentState === "confirmed"
              ? "Fait"
              : agentState === "failed"
                ? "Echec"
                : AGENT_STATE_LABELS[agentState] || "En cours..."}
        </span>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
            title="Reduire"
          >
            &rsaquo;
          </button>
        )}
      </div>

      {/* Playhead context bar */}
      <div className="px-4 py-2 border-b border-zinc-800/30 bg-zinc-900/40">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-zinc-500 font-mono">
            {formatTime(currentTime)}
          </span>
          {isPlaying && (
            <span className="text-emerald-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              lecture
            </span>
          )}
        </div>
        {/* Show what's active at playhead */}
        <div className="flex flex-wrap gap-1 mt-1">
          {(() => {
            const ctx = getEditorContext(
              project,
              currentTime,
              currentFrame,
              isPlaying,
              selectedElement,
            );
            const tags: { label: string; color: string }[] = [];
            if (ctx.activeAtPlayhead.broll)
              tags.push({
                label: `B-roll ${ctx.activeAtPlayhead.broll.mediaType}`,
                color: "text-amber-400 bg-amber-900/30",
              });
            if (ctx.activeAtPlayhead.subtitle)
              tags.push({
                label: ctx.activeAtPlayhead.subtitle.text.slice(0, 20),
                color: "text-emerald-400 bg-emerald-900/30",
              });
            if (ctx.activeAtPlayhead.card)
              tags.push({
                label: `Card ${ctx.activeAtPlayhead.card.type}`,
                color: "text-purple-400 bg-purple-900/30",
              });
            if (ctx.activeAtPlayhead.zoom)
              tags.push({
                label: `Zoom ${ctx.activeAtPlayhead.zoom.scale}x`,
                color: "text-rose-400 bg-rose-900/30",
              });
            if (ctx.activeAtPlayhead.texteCle)
              tags.push({
                label: ctx.activeAtPlayhead.texteCle.text.slice(0, 15),
                color: "text-pink-400 bg-pink-900/30",
              });
            if (ctx.activeAtPlayhead.hook)
              tags.push({
                label: "Hook",
                color: "text-yellow-400 bg-yellow-900/30",
              });
            if (ctx.activeAtPlayhead.cta)
              tags.push({
                label: "CTA",
                color: "text-orange-400 bg-orange-900/30",
              });
            if (tags.length === 0)
              tags.push({
                label: "Video principale",
                color: "text-blue-400 bg-blue-900/30",
              });
            return tags.map((tag) => (
              <span
                key={tag.label}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tag.color}`}
              >
                {tag.label}
              </span>
            ));
          })()}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-lg px-2.5 py-1.5 text-[12px] leading-snug ${
                msg.role === "user"
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/60 text-zinc-300"
              }`}
            >
              {/* User-attached images */}
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {msg.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full max-w-[200px] rounded border border-zinc-600/50"
                    />
                  ))}
                </div>
              )}
              <div className="whitespace-pre-wrap">
                {msg.role === "assistant"
                  ? renderContent(
                      msg.actionResults
                        ? msg.content.split("\n\n").slice(0, -1).join("\n\n") ||
                            msg.content
                        : msg.content,
                    )
                  : msg.content}
              </div>

              {/* Structured action results */}
              {msg.actionResults && msg.actionResults.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-700/30 space-y-1">
                  {msg.actionResults.map((r, i) => {
                    const tc = getActionTimecode(r.action);
                    return (
                      <div
                        key={i}
                        className={`text-[11px] flex items-center gap-1.5 ${
                          r.success ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        <span>{formatActionResult(r)}</span>
                        {r.success && tc !== null && (
                          <button
                            onClick={() => onSeek(tc)}
                            className="text-[10px] text-zinc-500 hover:text-emerald-400 underline underline-offset-2 transition-colors"
                          >
                            Voir
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {/* Global Annuler for applied actions */}
                  {msg.applied && (
                    <button
                      onClick={handleUndo}
                      className="mt-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              )}

              {/* Action buttons for pending proposals (>5 actions) */}
              {msg.actions &&
                msg.actions.length > 5 &&
                !msg.applied &&
                !msg.actionResults && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-700/50">
                    <button
                      onClick={() => applyActions(msg.id)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Appliquer ({msg.actions.length})
                    </button>
                    <button
                      onClick={handleUndo}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                )}

              {/* Simple undo for applied without structured results */}
              {msg.applied && !msg.actionResults && (
                <button
                  onClick={handleUndo}
                  className="mt-1.5 text-[11px] text-zinc-500 hover:text-zinc-400 transition-colors"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loading state — shows actual work description */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800/60 rounded-xl px-3 py-2.5 text-[12px] text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>
                  {AGENT_STATE_LABELS[agentState] || "Reflexion en cours..."}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {selectedElement && (
        <div className="px-3 py-1 border-t border-zinc-800/50 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-[10px] text-zinc-500">
            {selectedElement.type} a {selectedElement.time.toFixed(1)}s
          </span>
        </div>
      )}

      {/* Quick actions — always visible when idle */}
      {!loading && (
        <div className="px-3 py-1.5 border-t border-zinc-800/30 flex flex-wrap gap-1.5">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              onClick={() => handleQuickAction(qa.msg)}
              className="px-2.5 py-2 min-h-[44px] rounded-lg bg-zinc-800/60 text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60 active:bg-zinc-600/60 transition-colors touch-manipulation"
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-2.5 border-t border-zinc-800/50">
        {/* Attached image previews */}
        {attachedImages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachedImages.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-16 h-16 object-cover rounded border border-zinc-700"
                />
                <button
                  onClick={() =>
                    setAttachedImages((prev) =>
                      prev.filter((i) => i.id !== img.id),
                    )
                  }
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[9px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-1.5 items-end">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageAttach}
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-11 h-11 shrink-0 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 rounded-lg transition-colors touch-manipulation flex items-center justify-center"
            title="Joindre une photo"
          >
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Modifier quoi..."
            rows={1}
            className="flex-1 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 resize-none outline-none focus:border-zinc-600 transition-colors min-h-[44px]"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachedImages.length === 0) || loading}
            className="w-11 h-11 shrink-0 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 disabled:opacity-40 text-white rounded-lg text-sm transition-colors touch-manipulation flex items-center justify-center"
          >
            &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
