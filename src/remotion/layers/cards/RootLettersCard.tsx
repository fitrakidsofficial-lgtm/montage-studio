import { interpolate } from "remotion";
import type { BrandConfig, RootLettersContent } from "@/lib/types";

// Match Arabic letter names spoken in French/transliteration/phonetic
// Covers: standard, French accented, Whisper transcription variants
const LETTER_NAME_PATTERNS: Record<string, RegExp> = {
  ن: /\bn[oua]+n\b/i,
  ص: /\bs[aoe]+d\b/i,
  ح: /\bh[ae]a?\b/i,
  ر: /\br[ae]a?\b/i,
  ع: /\b[ae](?:y|i)ne?\b/i,
  ل: /\bl[ae]m+\b/i,
  م: /\bm[iey]+m\b/i,
  ب: /\bb[ae]a?\b/i,
  ت: /\bt[ae]a?\b/i,
  ث: /\bth[ae]a?\b/i,
  ج: /\bj[iey]+m\b/i,
  خ: /\bkh[ae]a?\b/i,
  د: /\bd[ae]l\b/i,
  ذ: /\bdh?[ae]l\b/i,
  ز: /\bz[ae](?:y|i)n?e?\b/i,
  س: /\bs[iey]+n[e]?\b/i,
  ش: /\bsh?[iey]+n[e]?\b/i,
  ط: /\bt[aoe]+\b/i,
  ظ: /\bdh?[aoe]+\b/i,
  غ: /\bgh[ae](?:y|i)n[e]?\b/i,
  ف: /\bf[ae]a?\b/i,
  ق: /\bq[aoe]+f\b/i,
  ك: /\bk[ae]f\b/i,
  و: /\bw[ae]+w\b/i,
  ه: /\bh[ae]a?\b/i,
  ي: /\by[ae]a?\b/i,
  أ: /\bal[ie]f[e]?\b/i,
  ا: /\bal[ie]f[e]?\b/i,
};

function findLetterTimings(
  letters: string[],
  words: { word: string; start: number; end: number }[],
  cardStart: number,
  cardEnd: number,
): (number | null)[] {
  const cardWords = words.filter(
    (w) => w.start >= cardStart - 0.5 && w.end <= cardEnd + 0.5,
  );

  // Track used words to avoid double-matching
  const usedIndices = new Set<number>();

  return letters.map((letter) => {
    const pattern = LETTER_NAME_PATTERNS[letter];
    if (!pattern) return null;
    const matchIdx = cardWords.findIndex(
      (w, i) => !usedIndices.has(i) && pattern.test(w.word),
    );
    if (matchIdx === -1) return null;
    usedIndices.add(matchIdx);
    return cardWords[matchIdx].start;
  });
}

export function RootLettersCard({
  content,
  brand,
  time,
  startTime,
  endTime,
  words,
}: {
  content: RootLettersContent;
  brand: BrandConfig;
  time: number;
  startTime: number;
  endTime: number;
  words?: { word: string; start: number; end: number }[];
}) {
  const voiceTimings = words
    ? findLetterTimings(content.letters, words, startTime, endTime)
    : content.letters.map(() => null);

  return (
    <>
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.gold,
          fontSize: 50,
          letterSpacing: 3,
        }}
      >
        {content.label}
      </div>
      <div
        dir="rtl"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 60,
          marginTop: 60,
        }}
      >
        {content.letters.map((l, i) => {
          const voiceTime = voiceTimings[i];
          const hasSync = voiceTime !== null;
          const appearTime = hasSync ? voiceTime : startTime + i * 0.4;
          const fadeDur = 0.25;

          const letterOpacity = interpolate(
            time,
            [appearTime, appearTime + fadeDur],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const letterScale = interpolate(
            time,
            [appearTime, appearTime + fadeDur],
            [0.5, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          const isActive =
            hasSync && time >= appearTime && time < appearTime + 0.6;
          const glowIntensity = isActive
            ? interpolate(
                time,
                [appearTime, appearTime + 0.15, appearTime + 0.6],
                [0, 1, 0.3],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )
            : letterOpacity > 0.5
              ? 0.3
              : 0;

          return (
            <span
              key={i}
              style={{
                fontFamily: brand.fonts.arabic,
                fontSize: 160,
                fontWeight: 700,
                color: isActive ? brand.colors.orange : brand.colors.cream,
                opacity: letterOpacity,
                transform: `scale(${isActive ? letterScale * 1.08 : letterScale})`,
                textShadow: `0 0 ${40 + glowIntensity * 40}px rgba(242,138,75,${0.3 + glowIntensity * 0.5})`,
                transition: "color 0.15s ease",
              }}
            >
              {l}
            </span>
          );
        })}
      </div>
    </>
  );
}
