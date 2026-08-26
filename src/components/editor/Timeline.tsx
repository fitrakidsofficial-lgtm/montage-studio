"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { VideoProject } from "@/lib/types";

interface SelectedElement {
  type:
    | "broll"
    | "card"
    | "zoom"
    | "texteCle"
    | "patternInterrupt"
    | "silenceCut"
    | "subtitle";
  id: string;
  time: number;
}

interface Props {
  project: VideoProject;
  currentTime: number;
  totalDuration: number;
  selectedElement: SelectedElement | null;
  highlightedElement?: { type: string; id: string } | null;
  onSeek: (time: number) => void;
  onSelect: (element: SelectedElement | null) => void;
  onDragEnd?: (type: string, id: string, newStart: number) => void;
  onResizeEnd?: (
    type: string,
    id: string,
    newStart: number,
    newEnd: number,
  ) => void;
}

const TRACK_H = 28;
const LABEL_W = 78;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const SNAP_THRESHOLD_PX = 8;

const TC: Record<string, { bg: string; br: string; tx: string }> = {
  video: {
    bg: "bg-blue-900/60",
    br: "border-blue-600/60",
    tx: "text-blue-300",
  },
  broll: {
    bg: "bg-amber-900/60",
    br: "border-amber-600/60",
    tx: "text-amber-300",
  },
  cards: {
    bg: "bg-purple-900/60",
    br: "border-purple-600/60",
    tx: "text-purple-300",
  },
  effects: {
    bg: "bg-rose-900/60",
    br: "border-rose-600/60",
    tx: "text-rose-300",
  },
  subs: {
    bg: "bg-emerald-900/60",
    br: "border-emerald-600/60",
    tx: "text-emerald-300",
  },
  audio: {
    bg: "bg-cyan-900/60",
    br: "border-cyan-600/60",
    tx: "text-cyan-300",
  },
  hook: {
    bg: "bg-yellow-900/80",
    br: "border-yellow-500/60",
    tx: "text-yellow-300",
  },
  cta: {
    bg: "bg-orange-900/80",
    br: "border-orange-500/60",
    tx: "text-orange-300",
  },
  tcle: { bg: "bg-pink-900/60", br: "border-pink-500/60", tx: "text-pink-300" },
  flash: { bg: "bg-white/20", br: "border-white/40", tx: "text-white/70" },
};

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// ── Snap engine ──

function collectSnapPoints(
  project: VideoProject,
  totalDuration: number,
  currentTime: number,
  excludeId?: string,
): number[] {
  const pts = new Set<number>();
  pts.add(0);
  pts.add(totalDuration);
  pts.add(currentTime);
  for (const b of project.brolls) {
    if (b.id === excludeId) continue;
    pts.add(b.startTime);
    pts.add(b.endTime);
  }
  for (const c of project.cards) {
    if (c.id === excludeId) continue;
    pts.add(c.startTime);
    pts.add(c.endTime);
  }
  for (const z of project.zooms ?? []) pts.add(z.time);
  for (const t of project.texteCles ?? []) pts.add(t.time);
  return Array.from(pts);
}

function snapTime(
  time: number,
  snapPoints: number[],
  pxPerSecond: number,
): { time: number; snapped: boolean } {
  const thresholdSec = SNAP_THRESHOLD_PX / pxPerSecond;
  let best = time;
  let bestDist = Infinity;
  for (const sp of snapPoints) {
    const dist = Math.abs(time - sp);
    if (dist < bestDist && dist < thresholdSec) {
      best = sp;
      bestDist = dist;
    }
  }
  return { time: best, snapped: bestDist < Infinity && best !== time };
}

// ── Drag state ──

interface DragState {
  type: SelectedElement["type"];
  id: string;
  origStart: number;
  duration: number;
  mouseStartX: number;
  currentStart: number;
  snapped: boolean;
}

// ── Resize state ──

interface ResizeState {
  type: SelectedElement["type"];
  id: string;
  edge: "left" | "right";
  origStart: number;
  origEnd: number;
  mouseStartX: number;
  currentStart: number;
  currentEnd: number;
  snapped: boolean;
}

type TrackKey = "video" | "broll" | "cards" | "effects" | "subs" | "audio";

export function Timeline({
  project,
  currentTime,
  totalDuration,
  selectedElement,
  highlightedElement,
  onSeek,
  onSelect,
  onDragEnd,
  onResizeEnd,
}: Props) {
  const tracksRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<TrackKey>>(new Set());
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    l: number;
    w: number;
    snapped: boolean;
    trackIdx: number;
  } | null>(null);

  const pct = useCallback(
    (t: number) => Math.max(0, Math.min(100, (t / totalDuration) * 100)),
    [totalDuration],
  );

  const timeFromX = useCallback(
    (x: number, width: number) =>
      Math.max(0, Math.min(totalDuration, (x / width) * totalDuration)),
    [totalDuration],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) return;
      const el = tracksRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < 0) return;
      onSeek(timeFromX(x, rect.width));
    },
    [onSeek, timeFromX],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) =>
        Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z - e.deltaY * 0.005)),
      );
    }
  }, []);

  // ── Drag handlers ──

  const startDrag = useCallback(
    (
      e: React.MouseEvent,
      type: SelectedElement["type"],
      id: string,
      startTime: number,
      endTime: number,
      trackIdx: number,
    ) => {
      e.stopPropagation();
      e.preventDefault();
      if (!onDragEnd) return;
      const duration = endTime - startTime;
      dragRef.current = {
        type,
        id,
        origStart: startTime,
        duration,
        mouseStartX: e.clientX,
        currentStart: startTime,
        snapped: false,
      };
      onSelect({ type, id, time: startTime });

      const snapPoints = collectSnapPoints(
        project,
        totalDuration,
        currentTime,
        id,
      );

      const onMove = (me: MouseEvent) => {
        const drag = dragRef.current;
        const el = tracksRef.current;
        if (!drag || !el) return;
        const rect = el.getBoundingClientRect();
        const pxPerSec = rect.width / totalDuration;
        const deltaPx = me.clientX - drag.mouseStartX;
        const deltaSec = deltaPx / pxPerSec;
        let newStart = Math.max(
          0,
          Math.min(totalDuration - drag.duration, drag.origStart + deltaSec),
        );
        const { time: snappedStart, snapped } = snapTime(
          newStart,
          snapPoints,
          pxPerSec,
        );
        // Also try snapping the end
        const { time: snappedEnd } = snapTime(
          newStart + drag.duration,
          snapPoints,
          pxPerSec,
        );
        if (
          Math.abs(snappedEnd - (newStart + drag.duration)) <
          Math.abs(snappedStart - newStart)
        ) {
          newStart = snappedEnd - drag.duration;
        } else if (snapped) {
          newStart = snappedStart;
        }
        newStart = Math.max(
          0,
          Math.min(totalDuration - drag.duration, newStart),
        );
        drag.currentStart = newStart;
        drag.snapped = snapped;
        setDragPreview({
          l: pct(newStart),
          w: pct(drag.duration),
          snapped,
          trackIdx,
        });
      };

      const onUp = () => {
        const drag = dragRef.current;
        if (drag && Math.abs(drag.currentStart - drag.origStart) > 0.05) {
          onDragEnd(drag.type, drag.id, drag.currentStart);
        }
        dragRef.current = null;
        setDragPreview(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onDragEnd, onSelect, project, totalDuration, currentTime, pct],
  );

  // ── Resize handler ──
  const startResize = useCallback(
    (
      e: React.MouseEvent,
      edge: "left" | "right",
      type: SelectedElement["type"],
      id: string,
      startTime: number,
      endTime: number,
      trackIdx: number,
    ) => {
      e.stopPropagation();
      e.preventDefault();
      if (!onResizeEnd) return;
      resizeRef.current = {
        type,
        id,
        edge,
        origStart: startTime,
        origEnd: endTime,
        mouseStartX: e.clientX,
        currentStart: startTime,
        currentEnd: endTime,
        snapped: false,
      };

      const snapPoints = collectSnapPoints(
        project,
        totalDuration,
        currentTime,
        id,
      );
      const MIN_DURATION = 0.3;

      const onMove = (me: MouseEvent) => {
        const rs = resizeRef.current;
        const el = tracksRef.current;
        if (!rs || !el) return;
        const rect = el.getBoundingClientRect();
        const pxPerSec = rect.width / totalDuration;
        const deltaPx = me.clientX - rs.mouseStartX;
        const deltaSec = deltaPx / pxPerSec;

        if (rs.edge === "left") {
          let newStart = Math.max(0, rs.origStart + deltaSec);
          newStart = Math.min(newStart, rs.origEnd - MIN_DURATION);
          const { time: snapped, snapped: didSnap } = snapTime(
            newStart,
            snapPoints,
            pxPerSec,
          );
          if (didSnap && snapped < rs.origEnd - MIN_DURATION)
            newStart = snapped;
          rs.currentStart = newStart;
          rs.currentEnd = rs.origEnd;
          rs.snapped = didSnap;
        } else {
          let newEnd = Math.min(totalDuration, rs.origEnd + deltaSec);
          newEnd = Math.max(newEnd, rs.origStart + MIN_DURATION);
          const { time: snapped, snapped: didSnap } = snapTime(
            newEnd,
            snapPoints,
            pxPerSec,
          );
          if (didSnap && snapped > rs.origStart + MIN_DURATION)
            newEnd = snapped;
          rs.currentStart = rs.origStart;
          rs.currentEnd = newEnd;
          rs.snapped = didSnap;
        }

        setDragPreview({
          l: pct(rs.currentStart),
          w: pct(rs.currentEnd - rs.currentStart),
          snapped: rs.snapped,
          trackIdx,
        });
      };

      const onUp = () => {
        const rs = resizeRef.current;
        if (rs) {
          const changed =
            Math.abs(rs.currentStart - rs.origStart) > 0.05 ||
            Math.abs(rs.currentEnd - rs.origEnd) > 0.05;
          if (changed) {
            onResizeEnd(rs.type, rs.id, rs.currentStart, rs.currentEnd);
          }
        }
        resizeRef.current = null;
        setDragPreview(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onResizeEnd, project, totalDuration, currentTime, pct],
  );

  // Cleanup drag/resize listeners on unmount
  useEffect(() => {
    return () => {
      dragRef.current = null;
      resizeRef.current = null;
    };
  }, []);

  const markers = useMemo(() => {
    const baseStep = totalDuration <= 30 ? 5 : totalDuration <= 120 ? 10 : 30;
    const step = Math.max(1, Math.round(baseStep / zoom));
    const r: number[] = [];
    for (let t = 0; t <= totalDuration; t += step) r.push(t);
    return r;
  }, [totalDuration, zoom]);

  const isSel = (type: string, id: string) =>
    selectedElement?.type === type && selectedElement?.id === id;
  const isHl = (type: string, id: string) =>
    highlightedElement?.type === type && highlightedElement?.id === id;

  const toggleTrack = (key: TrackKey) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const cuts = project.silenceCuts ?? [];
  const trackVisible = (k: TrackKey) => !collapsed.has(k);

  // Track index for drag preview positioning
  let trackIdx = 0;

  return (
    <div className="w-full select-none flex flex-col h-full">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 px-2 pb-1 shrink-0">
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.5))}
          className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 text-[10px] transition-colors"
        >
          -
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="flex-1 accent-zinc-500 max-w-28"
        />
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.5))}
          className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 text-[10px] transition-colors"
        >
          +
        </button>
        <span className="text-[9px] text-zinc-600 w-7 text-right">
          {zoom.toFixed(1)}x
        </span>
      </div>

      {/* Scrollable timeline area */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden"
        onWheel={handleWheel}
      >
        <div className="flex" style={{ width: `${zoom * 100}%` }}>
          {/* Labels column */}
          <div className="shrink-0" style={{ width: LABEL_W }}>
            <div style={{ height: 20 }} />
            <TLabel
              text="Video"
              c={TC.video}
              k="video"
              collapsed={collapsed}
              onToggle={toggleTrack}
            />
            <TLabel
              text="B-roll"
              c={TC.broll}
              k="broll"
              collapsed={collapsed}
              onToggle={toggleTrack}
            />
            <TLabel
              text="Textes"
              c={TC.cards}
              k="cards"
              collapsed={collapsed}
              onToggle={toggleTrack}
            />
            <TLabel
              text="Effets"
              c={TC.effects}
              k="effects"
              collapsed={collapsed}
              onToggle={toggleTrack}
            />
            <TLabel
              text="Sous-titres"
              c={TC.subs}
              k="subs"
              collapsed={collapsed}
              onToggle={toggleTrack}
            />
            <TLabel
              text="Audio"
              c={TC.audio}
              k="audio"
              collapsed={collapsed}
              onToggle={toggleTrack}
            />
          </div>

          {/* Content column */}
          <div
            ref={tracksRef}
            className="flex-1 relative cursor-crosshair"
            onClick={handleClick}
          >
            {/* Ruler */}
            <div className="h-5 relative border-b border-zinc-800/40">
              {markers.map((t) => (
                <div
                  key={t}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${pct(t)}%`, bottom: 0 }}
                >
                  <span className="text-[9px] text-zinc-600 leading-none">
                    {fmt(t)}
                  </span>
                  <div className="w-px h-1 bg-zinc-700/50 mt-0.5" />
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: `${pct(currentTime)}%` }}
            >
              <div
                className="absolute top-0 bottom-0 -translate-x-[3px]"
                style={{
                  width: 6,
                  background:
                    "linear-gradient(to right, transparent, rgba(239,68,68,0.15), transparent)",
                }}
              />
              <div className="absolute top-0 bottom-0 -translate-x-px w-0.5 bg-red-500" />
              <div
                className="absolute -top-0.5 -translate-x-[5px]"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "7px solid rgb(239,68,68)",
                }}
              />
            </div>

            {/* Snap line (shown during drag) */}
            {dragPreview?.snapped && (
              <div
                className="absolute top-0 bottom-0 w-px bg-emerald-400/60 z-20 pointer-events-none"
                style={{ left: `${dragPreview.l}%` }}
              />
            )}

            {/* Silence cuts */}
            {cuts.map((c, i) => (
              <div
                key={`cut-${i}`}
                className="absolute bg-red-500/8 border-x border-red-500/20 z-10 pointer-events-none"
                style={{
                  left: `${pct(c.start)}%`,
                  width: `${pct(c.end) - pct(c.start)}%`,
                  top: 20,
                  bottom: 0,
                }}
              />
            ))}

            {/* Drag preview ghost */}
            {dragPreview && (
              <div
                className={`absolute rounded border-2 z-20 pointer-events-none ${dragPreview.snapped ? "border-emerald-400/70 bg-emerald-500/10" : "border-white/30 bg-white/5"}`}
                style={{
                  left: `${dragPreview.l}%`,
                  width: `${Math.max(dragPreview.w, 0.4)}%`,
                  top: 20 + dragPreview.trackIdx * (TRACK_H + 1),
                  height: TRACK_H,
                }}
              />
            )}

            {/* Track: Video */}
            {trackVisible("video") ? (
              <Track>
                {project.mainVideoUrl && (
                  <Blk
                    l={0}
                    w={pct(project.mainVideoDurationSeconds)}
                    c={TC.video}
                    label={fmt(project.mainVideoDurationSeconds)}
                    sel={false}
                    hl={false}
                  />
                )}
                {project.introText && (
                  <Blk
                    l={0}
                    w={pct(project.introDuration ?? 3)}
                    c={TC.hook}
                    label="Hook"
                    sel={false}
                    hl={false}
                  />
                )}
                {project.ctaObjective && (
                  <Blk
                    l={pct(
                      Math.max(
                        0,
                        totalDuration -
                          (project.outroVideoUrl
                            ? project.outroDurationSeconds + 3
                            : 3),
                      ),
                    )}
                    w={pct(3)}
                    c={TC.cta}
                    label="CTA"
                    sel={false}
                    hl={false}
                  />
                )}
              </Track>
            ) : (
              <CollapsedTrack />
            )}
            {(() => {
              trackIdx = trackVisible("video") ? 1 : 1;
              return null;
            })()}

            {/* Track: B-rolls — draggable + resizable */}
            {trackVisible("broll") ? (
              <Track>
                {project.brolls.map((b) => (
                  <Blk
                    key={b.id}
                    l={pct(b.startTime)}
                    w={pct(b.endTime - b.startTime)}
                    c={TC.broll}
                    label={b.mediaType === "video" ? "Vid" : "Img"}
                    thumb={
                      b.mediaType === "image" && !b.fileUrl.startsWith("blob:")
                        ? b.fileUrl
                        : undefined
                    }
                    sel={isSel("broll", b.id)}
                    hl={isHl("broll", b.id)}
                    draggable={!!onDragEnd}
                    resizable={!!onResizeEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({ type: "broll", id: b.id, time: b.startTime });
                    }}
                    onDragStart={(e) =>
                      startDrag(e, "broll", b.id, b.startTime, b.endTime, 1)
                    }
                    onResizeLeft={(e) =>
                      startResize(
                        e,
                        "left",
                        "broll",
                        b.id,
                        b.startTime,
                        b.endTime,
                        1,
                      )
                    }
                    onResizeRight={(e) =>
                      startResize(
                        e,
                        "right",
                        "broll",
                        b.id,
                        b.startTime,
                        b.endTime,
                        1,
                      )
                    }
                  />
                ))}
              </Track>
            ) : (
              <CollapsedTrack />
            )}

            {/* Track: Cards + TexteCles — draggable + resizable */}
            {trackVisible("cards") ? (
              <Track>
                {project.cards.map((card) => (
                  <Blk
                    key={card.id}
                    l={pct(card.startTime)}
                    w={pct(card.endTime - card.startTime)}
                    c={TC.cards}
                    label={card.type.replace(/-/g, " ").slice(0, 10)}
                    sel={isSel("card", card.id)}
                    hl={isHl("card", card.id)}
                    draggable={!!onDragEnd}
                    resizable={!!onResizeEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({
                        type: "card",
                        id: card.id,
                        time: card.startTime,
                      });
                    }}
                    onDragStart={(e) =>
                      startDrag(
                        e,
                        "card",
                        card.id,
                        card.startTime,
                        card.endTime,
                        2,
                      )
                    }
                    onResizeLeft={(e) =>
                      startResize(
                        e,
                        "left",
                        "card",
                        card.id,
                        card.startTime,
                        card.endTime,
                        2,
                      )
                    }
                    onResizeRight={(e) =>
                      startResize(
                        e,
                        "right",
                        "card",
                        card.id,
                        card.startTime,
                        card.endTime,
                        2,
                      )
                    }
                  />
                ))}
                {(project.texteCles ?? []).map((t, i) => (
                  <Blk
                    key={`tc-${i}`}
                    l={pct(t.time)}
                    w={pct(t.duration)}
                    c={TC.tcle}
                    label={t.text.slice(0, 8)}
                    sel={isSel("texteCle", String(i))}
                    hl={isHl("texteCle", String(i))}
                    draggable={!!onDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({
                        type: "texteCle",
                        id: String(i),
                        time: t.time,
                      });
                    }}
                    onDragStart={(e) =>
                      startDrag(
                        e,
                        "texteCle",
                        String(i),
                        t.time,
                        t.time + t.duration,
                        2,
                      )
                    }
                  />
                ))}
              </Track>
            ) : (
              <CollapsedTrack />
            )}

            {/* Track: Zooms + Pattern Interrupts */}
            {trackVisible("effects") ? (
              <Track>
                {(project.zooms ?? []).map((z, i) => (
                  <Blk
                    key={`z-${i}`}
                    l={pct(z.time)}
                    w={pct(z.duration)}
                    c={TC.effects}
                    label={`${z.scale}x`}
                    sel={isSel("zoom", String(i))}
                    hl={isHl("zoom", String(i))}
                    draggable={!!onDragEnd}
                    resizable={!!onResizeEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({ type: "zoom", id: String(i), time: z.time });
                    }}
                    onDragStart={(e) =>
                      startDrag(
                        e,
                        "zoom",
                        String(i),
                        z.time,
                        z.time + z.duration,
                        3,
                      )
                    }
                    onResizeLeft={(e) =>
                      startResize(
                        e,
                        "left",
                        "zoom",
                        String(i),
                        z.time,
                        z.time + z.duration,
                        3,
                      )
                    }
                    onResizeRight={(e) =>
                      startResize(
                        e,
                        "right",
                        "zoom",
                        String(i),
                        z.time,
                        z.time + z.duration,
                        3,
                      )
                    }
                  />
                ))}
                {(project.patternInterrupts ?? []).map((p, i) => (
                  <Blk
                    key={`pi-${i}`}
                    l={pct(p.time)}
                    w={Math.max(pct(p.duration), 0.8)}
                    c={TC.flash}
                    label="Flash"
                    sel={isSel("patternInterrupt", String(i))}
                    hl={isHl("patternInterrupt", String(i))}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({
                        type: "patternInterrupt",
                        id: String(i),
                        time: p.time,
                      });
                    }}
                  />
                ))}
              </Track>
            ) : (
              <CollapsedTrack />
            )}

            {/* Track: Subtitles */}
            {trackVisible("subs") ? (
              <Track>
                {project.subtitles.map((s, i) => (
                  <Blk
                    key={`sub-${i}`}
                    l={pct(s.start)}
                    w={pct(s.end - s.start)}
                    c={TC.subs}
                    label={s.text.slice(0, 20)}
                    sel={isSel("subtitle", String(i))}
                    hl={isHl("subtitle", String(i))}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({
                        type: "subtitle",
                        id: String(i),
                        time: s.start,
                      });
                    }}
                  />
                ))}
              </Track>
            ) : (
              <CollapsedTrack />
            )}

            {/* Track: Audio */}
            {trackVisible("audio") ? (
              <Track>
                {project.bgMusicUrl && (
                  <div
                    className={`absolute inset-0 rounded border ${TC.audio.bg} ${TC.audio.br}`}
                  >
                    <Waveform volume={project.bgMusicVolume ?? 0.15} />
                    <span
                      className={`absolute left-1 top-0.5 text-[9px] font-medium ${TC.audio.tx} z-10`}
                    >
                      Vol {Math.round((project.bgMusicVolume ?? 0.15) * 100)}%
                    </span>
                  </div>
                )}
              </Track>
            ) : (
              <CollapsedTrack />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function TLabel({
  text,
  c,
  k,
  collapsed,
  onToggle,
}: {
  text: string;
  c: { tx: string };
  k: TrackKey;
  collapsed: Set<TrackKey>;
  onToggle: (k: TrackKey) => void;
}) {
  const isCollapsed = collapsed.has(k);
  return (
    <div
      className={`flex items-center justify-end pr-2 gap-1 cursor-pointer hover:bg-zinc-800/30 transition-colors ${c.tx}`}
      style={{ height: isCollapsed ? 6 : TRACK_H + 2 }}
      onClick={() => onToggle(k)}
      title={isCollapsed ? `Afficher ${text}` : `Replier ${text}`}
    >
      {!isCollapsed && (
        <>
          <span className="text-[10px] text-zinc-600 select-none">
            {isCollapsed ? "+" : "-"}
          </span>
          <span className="text-[10px] font-medium select-none">{text}</span>
        </>
      )}
    </div>
  );
}

function Track({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative bg-zinc-900/30 rounded-sm my-px"
      style={{ height: TRACK_H }}
    >
      {children}
    </div>
  );
}

function CollapsedTrack() {
  return (
    <div className="bg-zinc-900/20 rounded-sm my-px" style={{ height: 6 }} />
  );
}

function Blk({
  l,
  w,
  c,
  label,
  sel,
  hl,
  thumb,
  draggable,
  resizable,
  onClick,
  onDragStart,
  onResizeLeft,
  onResizeRight,
}: {
  l: number;
  w: number;
  c: { bg: string; br: string; tx: string };
  label: string;
  sel: boolean;
  hl: boolean;
  thumb?: string;
  draggable?: boolean;
  resizable?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.MouseEvent) => void;
  onResizeLeft?: (e: React.MouseEvent) => void;
  onResizeRight?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={`absolute top-0.5 bottom-0.5 rounded border ${c.bg} ${
        sel
          ? "border-white ring-1 ring-white/40"
          : hl
            ? "border-amber-400 ring-1 ring-amber-400/50 animate-pulse"
            : c.br
      } flex items-center overflow-hidden transition-all group/blk ${
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } hover:brightness-125 hover:ring-1 hover:ring-white/20`}
      style={{ left: `${l}%`, width: `${Math.max(w, 0.4)}%` }}
      onClick={onClick}
      onMouseDown={draggable ? onDragStart : undefined}
      title={label}
    >
      {/* Left resize handle */}
      {resizable && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 opacity-0 group-hover/blk:opacity-100 transition-opacity bg-white/20 hover:bg-white/40 rounded-l"
          onMouseDown={onResizeLeft}
        />
      )}
      {/* Thumbnail for B-roll images */}
      {thumb && (
        <div className="w-5 h-full shrink-0 mr-0.5 overflow-hidden rounded-sm">
          <img
            src={thumb}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <span
        className={`text-[9px] font-medium ${c.tx} truncate leading-tight px-0.5`}
      >
        {label}
      </span>
      {/* Right resize handle */}
      {resizable && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 opacity-0 group-hover/blk:opacity-100 transition-opacity bg-white/20 hover:bg-white/40 rounded-r"
          onMouseDown={onResizeRight}
        />
      )}
    </div>
  );
}

/** Fake waveform visualization for the audio track */
function Waveform({ volume }: { volume: number }) {
  // Generate deterministic pseudo-random bars
  const bars = useMemo(() => {
    const count = 80;
    const result: number[] = [];
    let seed = 42;
    for (let i = 0; i < count; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const h = 0.15 + ((seed % 100) / 100) * 0.85;
      result.push(h * volume);
    }
    return result;
  }, [volume]);

  return (
    <div className="absolute inset-0 flex items-center gap-px px-1 opacity-60">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 min-w-0 bg-cyan-400/50 rounded-full"
          style={{ height: `${Math.max(h * 100, 8)}%` }}
        />
      ))}
    </div>
  );
}

export type { SelectedElement };
