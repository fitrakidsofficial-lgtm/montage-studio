import { useRef, useEffect } from "react";
import {
  AbsoluteFill,
  Audio,
  Video,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VideoProject } from "@/lib/types";
import { SubtitleLayer } from "./layers/SubtitleLayer";
import { BrollLayer } from "./layers/BrollLayer";
import { ConceptCardLayer } from "./layers/ConceptCardLayer";
import { IntroLayer } from "./layers/IntroLayer";
import { LogoLayer } from "./layers/LogoLayer";
import { OutroLayer } from "./layers/OutroLayer";

/**
 * Remap output time → source time by skipping silence cuts.
 * Output timeline is shorter; this maps back to the original video time.
 */
function remapTime(
  outputTime: number,
  cuts: { start: number; end: number }[],
): number {
  if (!cuts || cuts.length === 0) return outputTime;
  const sorted = [...cuts].sort((a, b) => a.start - b.start);
  let sourceTime = outputTime;
  for (const cut of sorted) {
    if (sourceTime >= cut.start) {
      sourceTime += cut.end - cut.start;
    } else {
      break;
    }
  }
  return sourceTime;
}

/** Native <video> synced to Remotion's frame clock (play/pause aware) */
function SyncedVideo({
  src,
  volume,
  seekTime,
}: {
  src: string;
  volume: number;
  seekTime?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastFrameRef = useRef(0);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const targetTime = seekTime ?? frame / fps;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const isPlaying = frame !== lastFrameRef.current;
    lastFrameRef.current = frame;

    // Sync position if drifted > 0.3s
    if (Math.abs(v.currentTime - targetTime) > 0.3) {
      v.currentTime = targetTime;
    }

    // Volume
    v.volume = Math.max(0, Math.min(1, volume));
    v.muted = volume <= 0;

    // Play/pause sync
    if (isPlaying && v.paused) {
      v.play().catch(() => {});
    } else if (!isPlaying && !v.paused) {
      v.pause();
    }
  });

  return (
    <video
      ref={videoRef}
      src={src}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
      playsInline
    />
  );
}

interface Props {
  project: VideoProject;
}

export function UniversalTemplate({ project }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  // Remap output time to source video time (skips silence cuts)
  const cuts = project.silenceCuts ?? [];
  const sourceTime = remapTime(time, cuts);

  const cutTotal = cuts.reduce((sum, c) => sum + (c.end - c.start), 0);
  const contentEnd = project.mainVideoDurationSeconds - cutTotal;
  const outroTransition = 0.4;
  const outroStart = contentEnd - outroTransition;

  // Fade out main video audio when outro starts
  const mainVolume = project.outroVideoUrl
    ? interpolate(time, [outroStart, contentEnd], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // Auto-zoom: find active zoom keyframe (uses source time)
  let zoomScale = 1;
  if (project.zooms && project.zooms.length > 0) {
    for (const z of project.zooms) {
      if (sourceTime >= z.time && sourceTime < z.time + z.duration) {
        const progress = (sourceTime - z.time) / z.duration;
        // Ease in-out
        const ease =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        zoomScale = interpolate(ease, [0, 0.5, 1], [1, z.scale, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        break;
      }
    }
  }

  return (
    <AbsoluteFill
      style={{
        background: project.mainVideoUrl
          ? "#050505"
          : `linear-gradient(160deg, ${project.brand.colors.night} 0%, ${project.brand.colors.teal} 50%, ${project.brand.colors.night} 100%)`,
      }}
    >
      {/* Main video (face cam) with auto-zoom */}
      <AbsoluteFill
        style={{
          transform: `scale(${zoomScale})`,
          transformOrigin: "center center",
        }}
      >
        {project.mainVideoUrl ? (
          project.mainVideoUrl.startsWith("blob:") ? (
            <SyncedVideo
              src={project.mainVideoUrl}
              volume={mainVolume}
              seekTime={sourceTime}
            />
          ) : (
            <Video
              src={project.mainVideoUrl}
              volume={mainVolume}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.15,
            }}
          >
            <div
              style={{
                fontSize: 120,
                fontFamily: project.brand.fonts.title,
                color: project.brand.colors.cream,
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              PREVIEW
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>

      {/* Gradient overlay */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,.18), transparent 22%, transparent 67%, rgba(0,0,0,.58))",
        }}
      />

      {/* B-roll layer */}
      <BrollLayer brolls={project.brolls} currentTime={sourceTime} />

      {/* Concept cards */}
      <ConceptCardLayer
        cards={project.cards}
        brand={project.brand}
        style={project.style}
        currentTime={sourceTime}
      />

      {/* Logo */}
      <LogoLayer brand={project.brand} />

      {/* Subtitles */}
      <SubtitleLayer
        subtitles={project.subtitles}
        words={project.words}
        brand={project.brand}
        hideAfter={project.outroVideoUrl ? outroStart + 0.5 : undefined}
        currentTime={sourceTime}
      />

      {/* Intro */}
      {project.introText && (
        <Sequence
          from={0}
          durationInFrames={Math.round(project.introDuration * fps)}
        >
          <IntroLayer text={project.introText} brand={project.brand} />
        </Sequence>
      )}

      {/* Background music */}
      {project.bgMusicUrl && (
        <Audio
          src={project.bgMusicUrl}
          volume={project.bgMusicVolume ?? 0.15}
          loop
        />
      )}

      {/* Outro */}
      {project.outroVideoUrl && (
        <Sequence
          from={Math.round(outroStart * fps)}
          durationInFrames={Math.round(project.outroDurationSeconds * fps)}
        >
          <OutroLayer outroUrl={project.outroVideoUrl} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}
