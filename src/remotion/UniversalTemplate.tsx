import { useRef, useEffect } from "react";
import {
  AbsoluteFill,
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
import { LogoLayer } from "./layers/LogoLayer";
import { OutroLayer } from "./layers/OutroLayer";

/** Native <video> synced to Remotion's frame clock (play/pause aware) */
function SyncedVideo({ src, volume }: { src: string; volume: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastFrameRef = useRef(0);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const targetTime = frame / fps;

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

  const contentEnd = project.mainVideoDurationSeconds;
  const outroTransition = 0.4;
  const outroStart = contentEnd - outroTransition;

  // Fade out main video audio when outro starts
  const mainVolume = project.outroVideoUrl
    ? interpolate(time, [outroStart, contentEnd], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <AbsoluteFill
      style={{
        background: project.mainVideoUrl
          ? "#050505"
          : `linear-gradient(160deg, ${project.brand.colors.night} 0%, ${project.brand.colors.teal} 50%, ${project.brand.colors.night} 100%)`,
      }}
    >
      {/* Main video (face cam) */}
      {project.mainVideoUrl ? (
        project.mainVideoUrl.startsWith("blob:") ? (
          <SyncedVideo src={project.mainVideoUrl} volume={mainVolume} />
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

      {/* Gradient overlay */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,.18), transparent 22%, transparent 67%, rgba(0,0,0,.58))",
        }}
      />

      {/* B-roll layer */}
      <BrollLayer brolls={project.brolls} />

      {/* Concept cards */}
      <ConceptCardLayer
        cards={project.cards}
        brand={project.brand}
        style={project.style}
      />

      {/* Logo */}
      <LogoLayer brand={project.brand} />

      {/* Subtitles */}
      <SubtitleLayer
        subtitles={project.subtitles}
        words={project.words}
        brand={project.brand}
        hideAfter={project.outroVideoUrl ? outroStart + 0.5 : undefined}
      />

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
