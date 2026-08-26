import { AbsoluteFill, interpolate } from "remotion";

interface PatternInterrupt {
  time: number;
  duration: number;
}

interface Props {
  interrupts: PatternInterrupt[];
  currentTime: number;
}

export function PatternInterruptLayer({ interrupts, currentTime }: Props) {
  if (!interrupts || interrupts.length === 0) return null;

  const active = interrupts.find(
    (p) => currentTime >= p.time && currentTime < p.time + p.duration,
  );
  if (!active) return null;

  const elapsed = currentTime - active.time;
  const progress = elapsed / active.duration;

  // Quick white flash that fades
  const opacity = interpolate(progress, [0, 0.15, 0.5, 1], [0.7, 0.4, 0.1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "white",
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
}
