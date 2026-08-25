"use client";

import { useState, useCallback, useMemo } from "react";
import type { VideoProject } from "@/lib/types";
import { saveProject } from "@/lib/project-store";

export function useProjectState(initialProject: VideoProject) {
  const [project, setProject] = useState<VideoProject>(initialProject);

  const update = useCallback((patch: Partial<VideoProject>) => {
    setProject((prev) => {
      const next = { ...prev, ...patch };
      saveProject(next);
      return next;
    });
  }, []);

  const cutTotal = useMemo(
    () =>
      (project.silenceCuts ?? []).reduce(
        (sum, c) => sum + (c.end - c.start),
        0,
      ),
    [project.silenceCuts],
  );

  const totalDuration = useMemo(
    () =>
      project.mainVideoDurationSeconds -
      cutTotal +
      (project.outroVideoUrl ? project.outroDurationSeconds : 0),
    [
      project.mainVideoDurationSeconds,
      cutTotal,
      project.outroDurationSeconds,
      project.outroVideoUrl,
    ],
  );

  return { project, update, cutTotal, totalDuration };
}
