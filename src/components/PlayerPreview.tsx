"use client";

import { useMemo } from "react";
import { Player } from "@remotion/player";
import { UniversalTemplate } from "@/remotion/UniversalTemplate";
import type { VideoProject } from "@/lib/types";

interface Props {
  project: VideoProject;
  totalDuration: number;
}

export default function PlayerPreview({ project, totalDuration }: Props) {
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

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
      <Player
        key={playerKey}
        component={UniversalTemplate}
        inputProps={{ project }}
        durationInFrames={durationInFrames}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={project.fps}
        style={{ width: 360, height: 640 }}
        controls
        loop
        autoPlay={false}
      />
    </div>
  );
}
