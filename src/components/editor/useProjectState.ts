"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type { VideoProject } from "@/lib/types";
import { saveProject } from "@/lib/project-store";

const MAX_HISTORY = 50;

export function useProjectState(initialProject: VideoProject) {
  const [project, setProject] = useState<VideoProject>(initialProject);
  const historyRef = useRef<VideoProject[]>([initialProject]);
  const pointerRef = useRef(0);

  const update = useCallback((patch: Partial<VideoProject>, label?: string) => {
    setProject((prev) => {
      const next = { ...prev, ...patch };
      // Truncate any redo history beyond current pointer
      const history = historyRef.current.slice(0, pointerRef.current + 1);
      history.push(next);
      if (history.length > MAX_HISTORY) {
        history.shift();
      } else {
        pointerRef.current += 1;
      }
      historyRef.current = history;
      saveProject(next);
      return next;
    });
  }, []);

  // The refs intentionally back this imperative undo stack.
  // eslint-disable-next-line react-hooks/refs
  const canUndo = pointerRef.current > 0;
  // eslint-disable-next-line react-hooks/refs
  const canRedo = pointerRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (pointerRef.current <= 0) return;
    pointerRef.current -= 1;
    const prev = historyRef.current[pointerRef.current];
    setProject(prev);
    saveProject(prev);
  }, []);

  const redo = useCallback(() => {
    if (pointerRef.current >= historyRef.current.length - 1) return;
    pointerRef.current += 1;
    const next = historyRef.current[pointerRef.current];
    setProject(next);
    saveProject(next);
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

  return {
    project,
    update,
    cutTotal,
    totalDuration,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
