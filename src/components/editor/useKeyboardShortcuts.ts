"use client";

import { useEffect, useCallback } from "react";
import type { VideoProject } from "@/lib/types";
import type { SelectedElement } from "./Timeline";
import type { PlayerHandle } from "../PlayerPreview";

interface Deps {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  undo: () => void;
  redo: () => void;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  selectedElement: SelectedElement | null;
  setSelectedElement: (el: SelectedElement | null) => void;
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  showShortcuts: boolean;
  setShowShortcuts: (v: boolean) => void;
  handleSeek: (time: number) => void;
  playerHandleRef: React.RefObject<PlayerHandle | null>;
}

function deleteElement(
  project: VideoProject,
  update: (patch: Partial<VideoProject>) => void,
  sel: SelectedElement,
) {
  if (sel.type === "broll") {
    update({ brolls: project.brolls.filter((b) => b.id !== sel.id) });
  } else if (sel.type === "card") {
    update({ cards: project.cards.filter((c) => c.id !== sel.id) });
  } else if (sel.type === "zoom") {
    const idx = parseInt(sel.id);
    update({ zooms: (project.zooms ?? []).filter((_, i) => i !== idx) });
  } else if (sel.type === "texteCle") {
    const idx = parseInt(sel.id);
    update({
      texteCles: (project.texteCles ?? []).filter((_, i) => i !== idx),
    });
  } else if (sel.type === "patternInterrupt") {
    const idx = parseInt(sel.id);
    update({
      patternInterrupts: (project.patternInterrupts ?? []).filter(
        (_, i) => i !== idx,
      ),
    });
  }
}

export function duplicateElement(
  project: VideoProject,
  update: (patch: Partial<VideoProject>) => void,
  sel: SelectedElement,
  setSelectedElement: (el: SelectedElement | null) => void,
) {
  const offset = 2; // 2s offset for duplicate

  if (sel.type === "broll") {
    const broll = project.brolls.find((b) => b.id === sel.id);
    if (!broll) return;
    const dur = broll.endTime - broll.startTime;
    const newId = crypto.randomUUID();
    const newBroll = {
      ...broll,
      id: newId,
      startTime: broll.endTime + offset,
      endTime: broll.endTime + offset + dur,
    };
    update({ brolls: [...project.brolls, newBroll] });
    setSelectedElement({ type: "broll", id: newId, time: newBroll.startTime });
  } else if (sel.type === "card") {
    const card = project.cards.find((c) => c.id === sel.id);
    if (!card) return;
    const dur = card.endTime - card.startTime;
    const newId = crypto.randomUUID();
    const newCard = {
      ...card,
      id: newId,
      startTime: card.endTime + offset,
      endTime: card.endTime + offset + dur,
    };
    update({ cards: [...project.cards, newCard] });
    setSelectedElement({ type: "card", id: newId, time: newCard.startTime });
  } else if (sel.type === "zoom") {
    const idx = parseInt(sel.id);
    const zoom = (project.zooms ?? [])[idx];
    if (!zoom) return;
    const newZoom = { ...zoom, time: zoom.time + zoom.duration + offset };
    const newZooms = [...(project.zooms ?? []), newZoom];
    update({ zooms: newZooms });
    setSelectedElement({
      type: "zoom",
      id: String(newZooms.length - 1),
      time: newZoom.time,
    });
  } else if (sel.type === "texteCle") {
    const idx = parseInt(sel.id);
    const tc = (project.texteCles ?? [])[idx];
    if (!tc) return;
    const newTc = { ...tc, time: tc.time + tc.duration + offset };
    const newTcs = [...(project.texteCles ?? []), newTc];
    update({ texteCles: newTcs });
    setSelectedElement({
      type: "texteCle",
      id: String(newTcs.length - 1),
      time: newTc.time,
    });
  }
}

export function splitAtPlayhead(
  project: VideoProject,
  update: (patch: Partial<VideoProject>) => void,
  currentTime: number,
) {
  // Split any broll or card that spans the playhead
  let changed = false;

  const newBrolls = [...project.brolls];
  for (const b of project.brolls) {
    if (b.startTime < currentTime && b.endTime > currentTime + 0.5) {
      const newId = crypto.randomUUID();
      newBrolls.push({
        ...b,
        id: newId,
        startTime: currentTime,
        endTime: b.endTime,
      });
      const idx = newBrolls.findIndex((x) => x.id === b.id);
      if (idx >= 0) newBrolls[idx] = { ...b, endTime: currentTime };
      changed = true;
    }
  }

  const newCards = [...project.cards];
  for (const c of project.cards) {
    if (c.startTime < currentTime && c.endTime > currentTime + 0.5) {
      const newId = crypto.randomUUID();
      newCards.push({
        ...c,
        id: newId,
        startTime: currentTime,
        endTime: c.endTime,
      });
      const idx = newCards.findIndex((x) => x.id === c.id);
      if (idx >= 0) newCards[idx] = { ...c, endTime: currentTime };
      changed = true;
    }
  }

  if (changed) {
    update({ brolls: newBrolls, cards: newCards });
  }
}

export function useKeyboardShortcuts({
  project,
  update,
  undo,
  redo,
  currentTime,
  totalDuration,
  isPlaying,
  selectedElement,
  setSelectedElement,
  focusMode,
  setFocusMode,
  showShortcuts,
  setShowShortcuts,
  handleSeek,
  playerHandleRef,
}: Deps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Undo/Redo always work
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate — Cmd+D
      if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (selectedElement) {
          duplicateElement(
            project,
            update,
            selectedElement,
            setSelectedElement,
          );
        }
        return;
      }

      // Editing shortcuts — only when NOT typing
      if (isTyping) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          playerHandleRef.current?.toggle();
          break;
        case "l":
        case "L":
          e.preventDefault();
          if (!isPlaying) playerHandleRef.current?.toggle();
          break;
        case "j":
        case "J":
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 2));
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - (e.shiftKey ? 5 : 1)));
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSeek(
            Math.min(totalDuration, currentTime + (e.shiftKey ? 5 : 1)),
          );
          break;
        case "s":
        case "S":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            splitAtPlayhead(project, update, currentTime);
          }
          break;
        case "Delete":
        case "Backspace":
          if (selectedElement) {
            e.preventDefault();
            deleteElement(project, update, selectedElement);
            setSelectedElement(null);
          }
          break;
        case "Escape":
          if (showShortcuts) {
            setShowShortcuts(false);
          } else if (focusMode) {
            setFocusMode(false);
          } else if (selectedElement) {
            setSelectedElement(null);
          }
          break;
        case "f":
        case "F":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setFocusMode(!focusMode);
          }
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts(!showShortcuts);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    undo,
    redo,
    currentTime,
    totalDuration,
    isPlaying,
    selectedElement,
    setSelectedElement,
    focusMode,
    setFocusMode,
    showShortcuts,
    setShowShortcuts,
    handleSeek,
    playerHandleRef,
    project,
    update,
  ]);
}
