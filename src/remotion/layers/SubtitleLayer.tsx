import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { BrandConfig, SubtitleSegment, SubtitleWord } from "@/lib/types";

interface Props {
  subtitles: SubtitleSegment[];
  words: SubtitleWord[];
  brand: BrandConfig;
  hideAfter?: number;
  currentTime?: number;
  /** Custom font size override (default: 72, arabic: 78) */
  fontSize?: number;
  /** Custom font family override */
  fontFamily?: string;
}

/** Returns true if the string contains Arabic/Hebrew script characters */
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text,
  );
}

function mapWordsToSegment(
  text: string,
  segStart: number,
  segEnd: number,
  allWords: SubtitleWord[],
) {
  const corrected = text.split(/\s+/).filter(Boolean);
  const segW = allWords.filter(
    (w) => w.start >= segStart - 0.05 && w.end <= segEnd + 0.3,
  );
  const totalDuration = segEnd - segStart;
  const wordDuration = totalDuration / corrected.length;

  return corrected.map((word, i) => {
    const idx = Math.min(
      Math.round((i / corrected.length) * segW.length),
      segW.length - 1,
    );
    const wt = segW[idx];
    return {
      word,
      start: wt ? wt.start : segStart + i * wordDuration,
      end: wt ? wt.end : segStart + (i + 1) * wordDuration,
    };
  });
}

export function SubtitleLayer({
  subtitles,
  words,
  brand,
  hideAfter,
  currentTime,
  fontSize: fontSizeOverride,
  fontFamily: fontFamilyOverride,
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = currentTime ?? frame / fps;

  if (hideAfter !== undefined && time >= hideAfter) return null;
  if (subtitles.length === 0) return null;

  const active = subtitles.find((s) => time >= s.start && time < s.end);
  if (!active) return null;

  const hasWhisperWords = words.length > 0;
  const mapped = hasWhisperWords
    ? mapWordsToSegment(active.text, active.start, active.end, words)
    : active.text
        .split(/\s+/)
        .filter(Boolean)
        .map((word, i, arr) => {
          const dur = active.end - active.start;
          const wDur = dur / arr.length;
          return {
            word,
            start: active.start + i * wDur,
            end: active.start + (i + 1) * wDur,
          };
        });

  if (mapped.length === 0) return null;

  const local = time - active.start;
  const blockOpacity = Math.min(
    interpolate(local, [0, 0.15], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(time, [active.end - 0.15, active.end], [1, 0], {
      extrapolateLeft: "clamp",
    }),
  );

  const arabic = isArabic(active.text);

  const maxWordsPerLine = arabic ? 5 : 7;
  const lines: (typeof mapped)[] = [];
  if (mapped.length <= maxWordsPerLine) {
    lines.push(mapped);
  } else {
    const mid = Math.ceil(mapped.length / 2);
    lines.push(mapped.slice(0, mid), mapped.slice(mid));
  }

  return (
    <div
      style={{
        position: "absolute",
        left: arabic ? 50 : 30,
        right: arabic ? 50 : 30,
        bottom: 120,
        overflow: "visible",
        fontFamily:
          fontFamilyOverride ||
          (arabic ? brand.fonts.arabic : brand.fonts.body),
        fontSize:
          fontSizeOverride || (arabic ? 78 : mapped.length > 14 ? 62 : 72),
        fontWeight: arabic ? 700 : 400,
        lineHeight: arabic ? 1.6 : 1.35,
        textAlign: "center",
        direction: arabic ? "rtl" : "ltr",
        textShadow: "0 4px 12px rgba(0,0,0,.95), 0 0 32px rgba(0,0,0,.85)",
        opacity: blockOpacity,
      }}
    >
      {lines.map((lineWords, lineIdx) => (
        <div
          key={lineIdx}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            flexDirection: arabic ? "row-reverse" : "row",
            gap: arabic ? "4px 28px" : "4px 20px",
          }}
        >
          {lineWords.map((w, wIdx) => {
            const isCurrent = time >= w.start - 0.05 && time <= w.end + 0.1;
            const isPast = time > w.end + 0.1;

            let color: string;
            let opacity: number;

            if (isCurrent) {
              color = brand.colors.orange;
              opacity = 1;
            } else if (isPast) {
              color = brand.colors.cream;
              opacity = 1;
            } else {
              color = brand.colors.cream;
              opacity = 0.25;
            }

            return (
              <span
                key={`${lineIdx}-${wIdx}`}
                style={{
                  display: "inline-block",
                  color,
                  opacity,
                  transform: isCurrent ? "scale(1.06)" : "scale(1)",
                }}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
