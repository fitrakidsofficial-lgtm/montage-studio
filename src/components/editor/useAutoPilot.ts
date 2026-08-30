"use client";

import { useState, useCallback, useRef } from "react";
import type { VideoProject, SubtitleSegment, ConceptCard } from "@/lib/types";
import {
  applyPreset,
  TEMPLATE_PRESETS,
  type TemplatePreset,
} from "@/lib/template-presets";

/* ── Sync card timing with transcript ── */

/** Normalize text: lowercase, no accents, no punctuation */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

/**
 * Search patterns for each card type.
 * Each pattern group is tried in order. First match wins.
 * Patterns are searched in subtitle text (normalized).
 */
function getSearchPatterns(content: ConceptCard["content"]): string[][] {
  switch (content.type) {
    case "root-letters":
      // Priority 1: "trois lettres" / "les lettres"
      // Priority 2: "racine" / "la racine"
      // Priority 3: letter names (nun, sad, ha, sin, etc.)
      return [
        ["trois lettres", "les lettres", "ces lettres"],
        ["la racine", "racine"],
      ];
    case "single-word": {
      // Search for the French translation words in the narration
      const translationWords = norm(content.translation)
        .split(/\s+/)
        .filter((w) => w.length > 3);
      return [
        translationWords, // exact translation words
        ["ce mot", "un mot", "le mot"], // generic word introduction
      ];
    }
    case "verse": {
      // Search for surah reference
      const surahWords = norm(content.surahLabel)
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["sourate", "verset"].includes(w));
      return [
        surahWords, // surah name (e.g. "araf", "fatiha")
        ["sourate", "verset", "le verset", "ce verset"],
        ["dit allah", "dans le coran"],
      ];
    }
    case "family-recap":
      return [
        ["meme famille", "meme racine", "tous ces mots"],
        ["famille", "appartiennent"],
        ["meme idee", "idee commune"],
      ];
    case "custom-text":
      return [
        ["souviens", "retiens", "conclusion", "resume"],
        ["decouvrir", "secret", "debut"],
      ];
    default:
      return [];
  }
}

/**
 * Find the best timestamp for a card by searching subtitle text.
 * Searches subtitle groups in priority order.
 * afterTime: only match mentions AFTER this time (prevents reusing same moment).
 */
function findBestMention(
  patterns: string[][],
  subs: SubtitleSegment[],
  afterTime: number,
): number | null {
  for (const group of patterns) {
    for (const pattern of group) {
      // Search subtitles after afterTime first
      for (const sub of subs) {
        if (sub.start <= afterTime) continue;
        if (norm(sub.text).includes(pattern)) {
          return sub.start;
        }
      }
    }
  }
  // Fallback: search without afterTime constraint
  for (const group of patterns) {
    for (const pattern of group) {
      for (const sub of subs) {
        if (norm(sub.text).includes(pattern)) {
          return sub.start;
        }
      }
    }
  }
  return null;
}

/** Default card durations by type (seconds) */
const CARD_DURATIONS: Record<string, number> = {
  "root-letters": 4,
  "single-word": 4,
  verse: 7,
  "family-recap": 8,
  "custom-text": 5,
  cta: 4,
  "price-tag": 4,
  "feature-list": 6,
  "opinion-choice": 8,
};

/**
 * Sync card timing to transcript: place each card when its content
 * is actually mentioned in the narration (using Whisper timestamps).
 */
function syncCardTiming(
  cards: ConceptCard[],
  subs: SubtitleSegment[],
  _words: { word: string; start: number; end: number }[],
  totalDuration: number,
): ConceptCard[] {
  if (!subs || subs.length === 0) return cards;

  let lastEndTime = -1;
  const synced: ConceptCard[] = [];

  for (const card of cards) {
    const patterns = getSearchPatterns(card.content);
    if (patterns.length === 0) {
      synced.push(card);
      lastEndTime = Math.max(lastEndTime, card.endTime);
      continue;
    }

    const mention = findBestMention(patterns, subs, lastEndTime);
    if (mention === null) {
      synced.push(card);
      lastEndTime = Math.max(lastEndTime, card.endTime);
      continue;
    }

    const duration = CARD_DURATIONS[card.content.type] ?? 4;
    const startTime = Math.max(0, mention - 0.5);
    const endTime = Math.min(totalDuration, startTime + duration);

    synced.push({ ...card, startTime, endTime });
    lastEndTime = endTime;
  }

  // Final pass: prevent overlaps
  for (let i = 1; i < synced.length; i++) {
    const prev = synced[i - 1];
    if (synced[i].startTime < prev.endTime + 0.5) {
      const dur = synced[i].endTime - synced[i].startTime;
      synced[i] = {
        ...synced[i],
        startTime: prev.endTime + 0.5,
        endTime: Math.min(totalDuration, prev.endTime + 0.5 + dur),
      };
    }
  }

  return synced;
}

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

export interface TemplateSuggestion {
  templateId: string;
  reason: string;
  confidence: number;
  preset: TemplatePreset;
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
  const [templateSuggestions, setTemplateSuggestions] = useState<
    TemplateSuggestion[] | null
  >(null);
  const [waitingForTemplate, setWaitingForTemplate] = useState(false);

  const videoFileRef = useRef<File | null>(null);
  const audioFileRef = useRef<File | null>(null);
  const bgMusicFileRef = useRef<File | null>(null);
  const brollFilesRef = useRef<Map<string, File>>(new Map());

  // Stash transcription results for use after template selection
  const transcriptDataRef = useRef<{
    finalSubs: SubtitleSegment[];
    finalWords: { word: string; start: number; end: number }[];
    transcript: string;
  } | null>(null);

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

  // ── Phase 1: Transcribe + detect templates → show suggestions ──
  const handleAutoPilot = useCallback(async () => {
    const file = audioFileRef.current || videoFileRef.current;
    if (!file) {
      alert("Uploade ta video d'abord");
      return;
    }

    setAutoPilot(true);
    setTemplateSuggestions(null);

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

      // Stash for phase 2
      transcriptDataRef.current = { finalSubs, finalWords, transcript };

      // Step 3: Detect templates → propose 3 suggestions
      setAutoPilotStep("Analyse du contenu...");
      const detectRes = await fetch("/api/auto-detect-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const detectData = await detectRes.json();

      const rawSuggestions: {
        templateId: string;
        reason: string;
        confidence: number;
      }[] = detectData.suggestions ?? [
        {
          templateId: detectData.templateId || "broll-simple",
          reason: detectData.reason || "",
          confidence: 1,
        },
      ];

      // Resolve presets
      const resolved: TemplateSuggestion[] = rawSuggestions
        .map((s) => {
          const preset = TEMPLATE_PRESETS.find((p) => p.id === s.templateId);
          if (!preset) return null;
          return { ...s, preset };
        })
        .filter((s): s is TemplateSuggestion => s !== null);

      // If only 1 suggestion or all same, add fallbacks
      const usedIds = new Set(resolved.map((s) => s.templateId));
      if (resolved.length < 3) {
        for (const p of TEMPLATE_PRESETS) {
          if (resolved.length >= 3) break;
          if (!usedIds.has(p.id)) {
            resolved.push({
              templateId: p.id,
              reason: p.description,
              confidence: 0.1,
              preset: p,
            });
            usedIds.add(p.id);
          }
        }
      }

      setTemplateSuggestions(resolved.slice(0, 3));
      setAutoPilotStep("Choisis un template");
      setWaitingForTemplate(true);
    } catch (err) {
      alert("Erreur auto-pilote: " + (err as Error).message);
      setAutoPilot(false);
      setAutoPilotStep("");
    }
  }, [project.language, update]);

  // ── Phase 2: User picked a template → continue montage ──
  const continueWithTemplate = useCallback(
    async (preset: TemplatePreset) => {
      const data = transcriptDataRef.current;
      if (!data) return;

      setWaitingForTemplate(false);
      setTemplateSuggestions(null);
      const { finalSubs, finalWords, transcript } = data;

      try {
        // Apply template
        const cards = applyPreset(preset, project.mainVideoDurationSeconds);
        setSelectedPresetId(preset.id);
        update({ style: preset.style, cards });

        // Fill cards with AI
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
            // Sync card timing with transcript
            setAutoPilotStep("Synchronisation des cards...");
            const synced = syncCardTiming(
              filled,
              finalSubs,
              finalWords,
              project.mainVideoDurationSeconds,
            );
            update({ cards: synced });
          }
        }

        // Director IA
        setAutoPilotStep("Analyse editoriale (Director IA)...");
        const currentStyle = preset.style;
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
            const zooms: { time: number; scale: number; duration: number }[] =
              [];
            const silenceCuts: { start: number; end: number }[] = [];
            const texteCles: {
              time: number;
              duration: number;
              text: string;
            }[] = [];
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
                  silenceCuts.push({ start: d.time, end: d.time + d.duration });
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

            // Search B-rolls
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
                // Store suggestions for user to pick — don't auto-add
                setBrollSuggestions(brollData.suggestions);
              }
            }
          }
        } catch {
          const silenceCuts = detectSilenceCuts(finalWords);
          const zooms = detectZooms(
            finalSubs,
            project.mainVideoDurationSeconds,
          );
          update({ silenceCuts, zooms });
        }

        // Generate captions
        setAutoPilotStep("Generation des descriptions...");
        const captions = await generateCaptions(transcript, currentStyle);
        if (captions) {
          update({ captions });
        }

        // Generate hook + CTA
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
        transcriptDataRef.current = null;
        setTimeout(() => {
          setAutoPilot(false);
          setAutoPilotStep("");
        }, 2000);
      }
    },
    [
      project.mainVideoDurationSeconds,
      update,
      zoomIntensity,
      detectSilenceCuts,
      detectZooms,
      generateCaptions,
      generateIntro,
    ],
  );

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
          // Sync card timing with transcript
          const synced = syncCardTiming(
            filled,
            project.subtitles,
            project.words ?? [],
            project.mainVideoDurationSeconds,
          );
          update({ cards: synced });
        }
      } catch {}
    },
    [
      project.mainVideoDurationSeconds,
      project.subtitles,
      project.words,
      update,
    ],
  );

  return {
    autoPilot,
    autoPilotStep,
    brollSuggestions,
    setBrollSuggestions,
    selectedPresetId,
    setSelectedPresetId,
    templateSuggestions,
    waitingForTemplate,
    videoFileRef,
    audioFileRef,
    bgMusicFileRef,
    brollFilesRef,
    handleAutoPilot,
    handlePreset,
    continueWithTemplate,
  };
}
