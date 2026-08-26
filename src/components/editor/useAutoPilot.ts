"use client";

import { useState, useCallback, useRef } from "react";
import type { VideoProject, SubtitleSegment } from "@/lib/types";
import {
  applyPreset,
  TEMPLATE_PRESETS,
  type TemplatePreset,
} from "@/lib/template-presets";

interface BrollSuggestion {
  keyword: string;
  startTime: number;
  endTime: number;
  reason: string;
  images: {
    id: number;
    url: string;
    thumb: string;
    photographer: string;
    type: "image" | "video";
  }[];
  videos: {
    id: number;
    url: string;
    thumb: string;
    photographer: string;
    type: "image" | "video";
  }[];
}

export function useAutoPilot(
  project: VideoProject,
  update: (patch: Partial<VideoProject>) => void,
  zoomIntensity: number,
) {
  const [autoPilot, setAutoPilot] = useState(false);
  const [autoPilotStep, setAutoPilotStep] = useState("");
  const [brollSuggestions, setBrollSuggestions] = useState<BrollSuggestion[]>(
    [],
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const videoFileRef = useRef<File | null>(null);
  const audioFileRef = useRef<File | null>(null);
  const bgMusicFileRef = useRef<File | null>(null);
  const brollFilesRef = useRef<Map<string, File>>(new Map());

  const detectSilenceCuts = useCallback(
    (words: { start: number; end: number }[]) => {
      const cuts: { start: number; end: number }[] = [];
      for (let i = 1; i < words.length; i++) {
        const gap = words[i].start - words[i - 1].end;
        if (gap > 1.5) {
          cuts.push({
            start: words[i - 1].end + 0.2,
            end: words[i].start - 0.2,
          });
        }
      }
      return cuts;
    },
    [],
  );

  const detectZooms = useCallback(
    (subtitles: SubtitleSegment[], duration: number) => {
      if (zoomIntensity <= 1) return [];
      const zooms: { time: number; scale: number; duration: number }[] = [];
      const targets = [0.25, 0.5, 0.75];
      targets.forEach((ratio) => {
        const targetTime = ratio * duration;
        const closest = subtitles.reduce((best, seg) => {
          const dist = Math.abs(seg.start - targetTime);
          const bestDist = Math.abs(best.start - targetTime);
          return dist < bestDist ? seg : best;
        }, subtitles[0]);
        if (closest) {
          zooms.push({
            time: closest.start,
            scale: zoomIntensity,
            duration: Math.min(closest.end - closest.start, 3),
          });
        }
      });
      return zooms;
    },
    [zoomIntensity],
  );

  const generateIntro = useCallback(
    async (transcript: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/fill-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            templateId: "intro",
            cardTypes: [{ index: 0, type: "custom-text" }],
          }),
        });
        const data = await res.json();
        if (res.ok && data.cards?.[0]?.lines?.[0]?.text) {
          return data.cards[0].lines[0].text;
        }
      } catch {}
      return null;
    },
    [],
  );

  const generateCaptions = useCallback(
    async (transcript: string, style: string) => {
      try {
        const res = await fetch("/api/generate-caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, style }),
        });
        const data = await res.json();
        if (res.ok && data.youtube) {
          return data;
        }
      } catch {}
      return null;
    },
    [],
  );

  const handleAutoPilot = useCallback(async () => {
    const file = audioFileRef.current || videoFileRef.current;
    if (!file) {
      alert("Uploade ta video d'abord");
      return;
    }

    setAutoPilot(true);

    try {
      // Step 1: Transcribe
      setAutoPilotStep("Transcription Whisper...");
      const form = new FormData();
      form.append("file", file, file.name);
      if (project.language && project.language !== "auto") {
        form.append("language", project.language);
      }
      const transcRes = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      const transcData = await transcRes.json();
      if (!transcRes.ok) throw new Error(transcData.error);
      update({ subtitles: transcData.subtitles, words: transcData.words });

      // Step 2: Fix subtitles
      setAutoPilotStep("Correction des sous-titres...");
      const fixRes = await fetch("/api/fix-subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtitles: transcData.subtitles,
          words: transcData.words,
        }),
      });
      const fixData = await fixRes.json();
      if (fixRes.ok) {
        update({ subtitles: fixData.subtitles, words: fixData.words });
      }

      const finalSubs = fixRes.ok ? fixData.subtitles : transcData.subtitles;
      const finalWords = fixRes.ok ? fixData.words : transcData.words;
      const transcript = finalSubs
        .map((s: { text: string }) => s.text)
        .join(" ");

      // Step 3: Detect best template
      setAutoPilotStep("Detection du template...");
      const detectRes = await fetch("/api/auto-detect-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const detectData = await detectRes.json();
      const templateId = detectData.templateId || "broll-simple";
      const preset = TEMPLATE_PRESETS.find((p) => p.id === templateId);

      if (preset) {
        const cards = applyPreset(preset, project.mainVideoDurationSeconds);
        setSelectedPresetId(preset.id);
        update({ style: preset.style, cards });

        // Step 4: Fill cards with AI
        if (preset.cardSlots.length > 0 && transcript.trim()) {
          setAutoPilotStep("Remplissage des cards...");
          const cardTypes = preset.cardSlots.map((slot, i) => ({
            index: i,
            type: slot.type,
          }));
          const fillRes = await fetch("/api/fill-cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transcript,
              templateId: preset.id,
              cardTypes,
            }),
          });
          const fillData = await fillRes.json();
          if (fillRes.ok && Array.isArray(fillData.cards)) {
            const filled = cards.map((card, i) => {
              const aiContent = fillData.cards[i];
              if (!aiContent) return card;
              return { ...card, content: { ...card.content, ...aiContent } };
            });
            update({ cards: filled });
          }
        }
      }

      // Step 5: Crunchy Director — AI-driven editing decisions
      setAutoPilotStep("Analyse editoriale (Director IA)...");
      const currentStyle = preset?.style || "educatif";
      try {
        const dirRes = await fetch("/api/director-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subtitles: finalSubs,
            words: finalWords,
            duration: project.mainVideoDurationSeconds,
            style: currentStyle,
          }),
        });
        const dirData = await dirRes.json();
        if (dirRes.ok && Array.isArray(dirData.decisions)) {
          // Convert director decisions to project data
          const zooms: { time: number; scale: number; duration: number }[] = [];
          const silenceCuts: { start: number; end: number }[] = [];
          const texteCles: { time: number; duration: number; text: string }[] =
            [];
          const patternInterrupts: { time: number; duration: number }[] = [];
          const brollKeywords: {
            keyword: string;
            startTime: number;
            endTime: number;
          }[] = [];

          for (const d of dirData.decisions) {
            switch (d.action) {
              case "zoom":
                zooms.push({
                  time: d.time,
                  scale: d.intensity ?? zoomIntensity,
                  duration: d.duration,
                });
                break;
              case "jump-cut":
                silenceCuts.push({
                  start: d.time,
                  end: d.time + d.duration,
                });
                break;
              case "broll":
                if (d.keyword) {
                  brollKeywords.push({
                    keyword: d.keyword,
                    startTime: d.time,
                    endTime: d.time + d.duration,
                  });
                }
                break;
              case "texte-cle":
                if (d.text) {
                  texteCles.push({
                    time: d.time,
                    duration: d.duration,
                    text: d.text,
                  });
                }
                break;
              case "pattern-interrupt":
                patternInterrupts.push({
                  time: d.time,
                  duration: d.duration,
                });
                break;
            }
          }

          update({ zooms, silenceCuts, texteCles, patternInterrupts });

          // Step 6: Search B-rolls using Director keywords + Pexels
          if (brollKeywords.length > 0) {
            setAutoPilotStep("Recherche de B-rolls...");
            const brollRes = await fetch("/api/suggest-brolls", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subtitles: finalSubs,
                duration: project.mainVideoDurationSeconds,
                directorKeywords: brollKeywords,
              }),
            });
            const brollData = await brollRes.json();
            if (brollRes.ok && brollData.suggestions) {
              setBrollSuggestions(brollData.suggestions);
              const autoBrolls = brollData.suggestions
                .filter((s: BrollSuggestion) => s.images.length > 0)
                .map((s: BrollSuggestion) => ({
                  id: crypto.randomUUID(),
                  startTime: s.startTime,
                  endTime: s.endTime,
                  fileUrl: s.images[0].url,
                  mediaType: "image" as const,
                }));
              if (autoBrolls.length > 0) {
                update({ brolls: autoBrolls });
              }
            }
          }
        }
      } catch {
        // Fallback to naive detection if Director fails
        const silenceCuts = detectSilenceCuts(finalWords);
        const zooms = detectZooms(finalSubs, project.mainVideoDurationSeconds);
        update({ silenceCuts, zooms });
      }

      // Step 7: Generate captions
      setAutoPilotStep("Generation des descriptions...");
      const captions = await generateCaptions(transcript, currentStyle);
      if (captions) {
        update({ captions });
      }

      // Step 8: Generate hook + auto CTA
      setAutoPilotStep("Generation du hook...");
      const introText = await generateIntro(transcript);
      const ctaObjective =
        currentStyle === "educatif"
          ? "save"
          : currentStyle === "promo"
            ? "traffic"
            : "engagement";
      if (introText) {
        update({
          introText,
          introDuration: 2.5,
          hookStyle: "overlay",
          ctaObjective: ctaObjective as "save" | "traffic" | "engagement",
        });
      } else {
        update({
          ctaObjective: ctaObjective as "save" | "traffic" | "engagement",
        });
      }

      setAutoPilotStep("Montage termine !");
    } catch (err) {
      alert("Erreur auto-pilote: " + (err as Error).message);
    } finally {
      setTimeout(() => {
        setAutoPilot(false);
        setAutoPilotStep("");
      }, 2000);
    }
  }, [
    project.mainVideoDurationSeconds,
    project.language,
    update,
    detectSilenceCuts,
    detectZooms,
    generateCaptions,
    generateIntro,
  ]);

  const handlePreset = useCallback(
    async (preset: TemplatePreset) => {
      const cards = applyPreset(preset, project.mainVideoDurationSeconds);
      setSelectedPresetId(preset.id);
      update({ style: preset.style, cards });

      const transcript = project.subtitles.map((s) => s.text).join(" ");
      if (!transcript.trim() || preset.cardSlots.length === 0) return;

      try {
        const cardTypes = preset.cardSlots.map((slot, i) => ({
          index: i,
          type: slot.type,
        }));
        const res = await fetch("/api/fill-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            templateId: preset.id,
            cardTypes,
          }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.cards)) {
          const filled = cards.map((card, i) => {
            const aiContent = data.cards[i];
            if (!aiContent) return card;
            return { ...card, content: { ...card.content, ...aiContent } };
          });
          update({ cards: filled });
        }
      } catch {}
    },
    [project.mainVideoDurationSeconds, project.subtitles, update],
  );

  return {
    autoPilot,
    autoPilotStep,
    brollSuggestions,
    setBrollSuggestions,
    selectedPresetId,
    setSelectedPresetId,
    videoFileRef,
    audioFileRef,
    bgMusicFileRef,
    brollFilesRef,
    handleAutoPilot,
    handlePreset,
  };
}
