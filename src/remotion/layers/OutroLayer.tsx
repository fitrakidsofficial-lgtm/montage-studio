import {
  AbsoluteFill,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface Props {
  outroUrl: string;
  transitionSeconds?: number;
}

export function OutroLayer({ outroUrl, transitionSeconds = 0.4 }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeFrames = Math.round(transitionSeconds * fps);
  const opacity = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity, zIndex: 30 }}>
      <Video
        src={outroUrl}
        volume={(f) =>
          interpolate(f, [0, fadeFrames], [0, 1], {
            extrapolateRight: "clamp",
          })
        }
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
}
