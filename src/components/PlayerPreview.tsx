"use client";

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Player, type PlayerRef } from "@remotion/player";
import {
  UniversalTemplate,
  loadProjectFonts,
} from "@/remotion/UniversalTemplate";
import type { VideoProject } from "@/lib/types";

export type PreviewClickZone =
  | "subtitle"
  | "card"
  | "hook"
  | "cta"
  | "broll"
  | null;

interface Props {
  project: VideoProject;
  totalDuration: number;
  onTimeUpdate?: (timeSeconds: number, frame: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onZoneClick?: (zone: PreviewClickZone) => void;
}

export interface PlayerHandle {
  seekTo: (timeSeconds: number) => void;
  getCurrentFrame: () => number;
  isPlaying: () => boolean;
  toggle: () => void;
  captureFrame: () => string | null;
}

/** Detect which visual zone is active at a given time */
function detectZoneAtTime(
  project: VideoProject,
  time: number,
  totalDuration: number,
): PreviewClickZone {
  // Check cards first (most specific)
  const activeCard = project.cards.find(
    (c) => time >= c.startTime && time < c.endTime,
  );
  if (activeCard) return "card";

  // Check hook (intro)
  if (project.introText && time < (project.introDuration ?? 3)) return "hook";

  // Check CTA
  const cuts = project.silenceCuts ?? [];
  const cutTotal = cuts.reduce((s, c) => s + (c.end - c.start), 0);
  const contentEnd = project.mainVideoDurationSeconds - cutTotal;
  if (project.ctaObjective && time >= contentEnd - 3) return "cta";

  // Check B-roll
  const activeBroll = project.brolls.find(
    (b) => time >= b.startTime && time < b.endTime,
  );
  if (activeBroll) return "broll";

  // Check subtitle
  const activeSub = project.subtitles.find(
    (s) => time >= s.start && time < s.end,
  );
  if (activeSub) return "subtitle";

  return null;
}

const PlayerPreview = forwardRef<PlayerHandle, Props>(function PlayerPreview(
  { project, totalDuration, onTimeUpdate, onPlayingChange, onZoneClick },
  ref,
) {
  const playerRef = useRef<PlayerRef>(null);
  const playingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontsReady, setFontsReady] = useState(false);

  // Load fonts before rendering Player
  useEffect(() => {
    loadProjectFonts()
      .then(() => {
        console.log(
          "[Fonts] All loaded. Itim check:",
          document.fonts.check("16px Itim"),
        );
        setFontsReady(true);
      })
      .catch((e) => {
        console.warn("[Fonts] Load error:", e);
        setFontsReady(true);
      });
  }, []);
  const [playerSize, setPlayerSize] = useState({ w: 360, h: 640 });

  const durationInFrames = Math.max(
    Math.round(totalDuration * project.fps),
    project.fps,
  );

  // Force Player re-mount when structure changes significantly
  const playerKey = useMemo(
    () =>
      [
        project.style,
        project.fps,
        project.cards.length,
        project.brolls.length,
        project.subtitles.length,
        project.mainVideoUrl ? "v" : "no",
        durationInFrames,
      ].join("-"),
    [
      project.style,
      project.fps,
      project.cards.length,
      project.brolls.length,
      project.subtitles.length,
      project.mainVideoUrl,
      durationInFrames,
    ],
  );

  // Expose imperative handle for parent
  useImperativeHandle(
    ref,
    () => ({
      seekTo: (timeSeconds: number) => {
        const frame = Math.round(timeSeconds * project.fps);
        playerRef.current?.seekTo(frame);
      },
      getCurrentFrame: () => {
        return playerRef.current?.getCurrentFrame() ?? 0;
      },
      isPlaying: () => playingRef.current,
      toggle: () => {
        if (playingRef.current) {
          playerRef.current?.pause();
        } else {
          playerRef.current?.play();
        }
      },
      captureFrame: () => {
        const container = playerRef.current?.getContainerNode();
        if (!container) return null;
        const canvas = container.querySelector("canvas");
        if (canvas) return canvas.toDataURL("image/jpeg", 0.7);
        // Fallback: try to capture from video element
        const video = container.querySelector("video");
        if (!video) return null;
        const c = document.createElement("canvas");
        c.width = 360;
        c.height = 640;
        const ctx = c.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, 360, 640);
        return c.toDataURL("image/jpeg", 0.7);
      },
    }),
    [project.fps],
  );

  // Sync time updates from Remotion Player to parent
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  const handleTimeUpdate = useCallback(
    (e: { detail: { frame: number } }) => {
      const frame = e.detail.frame;
      const time = frame / project.fps;
      onTimeUpdateRef.current?.(time, frame);
    },
    [project.fps],
  );

  const handlePlay = useCallback(() => {
    playingRef.current = true;
    onPlayingChangeRef.current?.(true);
  }, []);

  const handlePause = useCallback(() => {
    playingRef.current = false;
    onPlayingChangeRef.current?.(false);
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    player.addEventListener("timeupdate", handleTimeUpdate);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);

    return () => {
      player.removeEventListener("timeupdate", handleTimeUpdate);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, [playerKey, handleTimeUpdate, handlePlay, handlePause]);

  // Responsive sizing: fill container height with 9:16 ratio
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const availH = el.clientHeight - 32; // padding
      const h = Math.max(400, Math.min(availH, 900));
      const w = Math.round(h * (9 / 16));
      setPlayerSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handlePreviewClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onZoneClick) return;
      // Don't intercept clicks on the controls bar (bottom ~40px)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      if (clickY > rect.height - 40) return;

      const time =
        (playerRef.current?.getCurrentFrame() ?? 0) / (project.fps || 30);
      const zone = detectZoneAtTime(project, time, totalDuration);
      if (zone) {
        onZoneClick(zone);
      }
    },
    [onZoneClick, project, totalDuration],
  );

  if (!fontsReady) {
    return (
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 flex items-center justify-center bg-zinc-900"
        style={{ width: playerSize.w, height: playerSize.h }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
      onClick={handlePreviewClick}
    >
      <Player
        ref={playerRef}
        key={playerKey}
        component={UniversalTemplate}
        inputProps={{ project }}
        durationInFrames={durationInFrames}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={project.fps}
        style={{ width: playerSize.w, height: playerSize.h }}
        controls
        loop
        autoPlay={false}
      />
    </div>
  );
});

export default PlayerPreview;
