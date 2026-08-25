import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { BrollItem } from "@/lib/types";

interface Props {
  brolls: BrollItem[];
  currentTime?: number;
}

function fade(time: number, start: number, end: number, edge = 0.3) {
  return Math.min(
    interpolate(time, [start, start + edge], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(time, [end - edge, end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
}

export function BrollLayer({ brolls, currentTime }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = currentTime ?? frame / fps;

  const active = brolls.find((b) => time >= b.startTime && time < b.endTime);
  if (!active) return null;

  const opacity = fade(time, active.startTime, active.endTime);
  const progress =
    (time - active.startTime) / (active.endTime - active.startTime);
  const scale = interpolate(progress, [0, 1], [1.02, 1.12]);

  if (active.mediaType === "video") {
    return (
      <AbsoluteFill style={{ opacity }}>
        <Video
          src={active.fileUrl}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.08), transparent 55%, rgba(0,0,0,.64))",
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={active.fileUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,.08), transparent 55%, rgba(0,0,0,.64))",
        }}
      />
    </AbsoluteFill>
  );
}
