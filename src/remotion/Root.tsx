import { Composition } from "remotion";
import { UniversalTemplate } from "./UniversalTemplate";
import type { VideoProject } from "@/lib/types";
import { createDefaultProject } from "@/lib/types";

export const RemotionRoot: React.FC = () => {
  const defaultProject = createDefaultProject();

  return (
    <Composition
      id="MontageStudio"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={UniversalTemplate as any}
      defaultProps={{ project: defaultProject }}
      durationInFrames={Math.round(
        (defaultProject.mainVideoDurationSeconds +
          defaultProject.outroDurationSeconds) *
          defaultProject.fps,
      )}
      fps={defaultProject.fps}
      width={1080}
      height={1920}
    />
  );
};
