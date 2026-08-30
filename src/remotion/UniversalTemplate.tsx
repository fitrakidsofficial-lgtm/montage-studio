import { useRef, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Video,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  delayRender,
  continueRender,
  staticFile,
} from "remotion";
import type { VideoProject } from "@/lib/types";
import { SubtitleLayer } from "./layers/SubtitleLayer";
import { BrollLayer } from "./layers/BrollLayer";
import { ConceptCardLayer } from "./layers/ConceptCardLayer";
import { HookLayer } from "./layers/HookLayer";
import { CtaLayer } from "./layers/CtaLayer";
import { LogoLayer } from "./layers/LogoLayer";
import { OutroLayer } from "./layers/OutroLayer";
import { TexteCleLayer } from "./layers/TexteCleLayer";
import { PatternInterruptLayer } from "./layers/PatternInterruptLayer";

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
  const prevFrameRef = useRef(-1);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const targetTime = seekTime ?? frame / fps;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const prevFrame = prevFrameRef.current;
    prevFrameRef.current = frame;

    // Detect if Remotion is actively advancing frames (playing)
    const frameDelta = frame - prevFrame;
    const isAdvancing = prevFrame >= 0 && frameDelta > 0 && frameDelta <= 2;

    // Sync position — tighter threshold for better audio sync
    const drift = Math.abs(v.currentTime - targetTime);
    if (drift > 0.15) {
      v.currentTime = targetTime;
    }

    // Volume
    v.volume = Math.max(0, Math.min(1, volume));
    v.muted = volume <= 0;

    // Play/pause sync
    if (isAdvancing && v.paused) {
      v.play().catch(() => {});
    } else if (!isAdvancing && !v.paused) {
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

export const FONTS_TO_LOAD = [
  { family: "Itim", local: "fonts/itim-latin.woff2" },
  { family: "Luckiest Guy", local: "fonts/luckiest-guy-latin.woff2" },
  { family: "Noto Sans Arabic", local: "fonts/noto-arabic.woff2" },
];

/** Load all project fonts via FontFace API. Works in both Player and Remotion render. */
export async function loadProjectFonts() {
  // Always force-load from local files — no shortcuts
  await Promise.all(
    FONTS_TO_LOAD.map(async ({ family, local }) => {
      try {
        const face = new FontFace(family, `url(${staticFile(local)})`);
        const loaded = await face.load();
        document.fonts.add(loaded);
      } catch {
        // Font may already be loaded, continue
      }
    }),
  );
  // Wait for all fonts to be ready
  await document.fonts.ready;
}

function useFontLoader() {
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    loadProjectFonts()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
}

interface Props {
  project: VideoProject;
}

export function UniversalTemplate({ project }: Props) {
  useFontLoader();
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

      {/* B-roll layer — pass context for auto layout */}
      <BrollLayer
        brolls={project.brolls}
        currentTime={sourceTime}
        hasSubtitle={project.subtitles.some(
          (s) => sourceTime >= s.start && sourceTime < s.end,
        )}
        hasTexteCle={(project.texteCles ?? []).some(
          (t) => sourceTime >= t.time && sourceTime < t.time + t.duration,
        )}
        hasOverlay={
          (!!project.introText && sourceTime <= (project.introDuration ?? 3)) ||
          (!!project.ctaObjective && sourceTime >= contentEnd - 3)
        }
      />

      {/* Concept cards */}
      <ConceptCardLayer
        cards={project.cards}
        brand={project.brand}
        style={project.style}
        currentTime={sourceTime}
        words={project.words}
        brolls={project.brolls}
        offsetY={project.cardOffsetY}
      />

      {/* Logo */}
      <LogoLayer
        brand={project.brand}
        x={project.logoX}
        y={project.logoY}
        size={project.logoSize}
      />

      {/* Hook (behind subtitles so text stays visible) */}
      {project.introText && (
        <Sequence
          from={0}
          durationInFrames={Math.round((project.introDuration ?? 3) * fps)}
        >
          <HookLayer
            text={project.introText}
            brand={project.brand}
            style={project.hookStyle ?? "overlay"}
            positionY={project.hookPositionY}
          />
        </Sequence>
      )}

      {/* CTA before outro */}
      {project.ctaObjective && (
        <Sequence
          from={Math.round(Math.max(0, outroStart - 3) * fps)}
          durationInFrames={Math.round(3 * fps)}
        >
          <CtaLayer objective={project.ctaObjective} brand={project.brand} />
        </Sequence>
      )}

      {/* Texte-cle overlays (Director) */}
      <TexteCleLayer
        texteCles={project.texteCles ?? []}
        brand={project.brand}
        currentTime={sourceTime}
        cards={project.cards}
        offsetY={project.texteCleOffsetY}
      />

      {/* Pattern interrupts (Director) */}
      <PatternInterruptLayer
        interrupts={project.patternInterrupts ?? []}
        currentTime={sourceTime}
      />

      {/* Subtitles */}
      <SubtitleLayer
        subtitles={project.subtitles}
        words={project.words}
        brand={project.brand}
        hideAfter={project.outroVideoUrl ? outroStart + 0.5 : undefined}
        currentTime={sourceTime}
        fontSize={project.subtitleFontSize || undefined}
        fontFamily={project.subtitleFontFamily || undefined}
        position={project.subtitlePosition || undefined}
      />

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
