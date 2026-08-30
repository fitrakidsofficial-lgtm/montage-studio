import { Composition } from "remotion";
import { UniversalTemplate } from "./UniversalTemplate";
import { PresentationMS, TOTAL_FRAMES } from "./PresentationMS";
import type { VideoProject } from "@/lib/types";
import { createDefaultProject } from "@/lib/types";
import {
  OpinionEpisode01,
  OPINION_EPISODE_01_FRAMES,
} from "./OpinionEpisode01";
import {
  OpinionEpisode01Facecam,
  OPINION_EPISODE_01_FACECAM_FRAMES,
} from "./OpinionEpisode01Facecam";
import "./fonts.css";

export const RemotionRoot: React.FC = () => {
  const defaultProject = createDefaultProject();

  return (
    <>
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
        calculateMetadata={({ props }) => {
          const project = (props as { project: VideoProject }).project;
          const cutDuration = (project.silenceCuts ?? []).reduce(
            (total, cut) => total + Math.max(0, cut.end - cut.start),
            0,
          );
          const seconds =
            Math.max(0.1, project.mainVideoDurationSeconds - cutDuration) +
            (project.outroVideoUrl ? project.outroDurationSeconds : 0);
          return {
            durationInFrames: Math.max(1, Math.round(seconds * project.fps)),
            fps: project.fps,
          };
        }}
        fps={defaultProject.fps}
        width={1080}
        height={1920}
      />
      <Composition
        id="PresentationMS"
        component={PresentationMS}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="AvisCommunaute-Episode01-EtoileOuTerre"
        component={OpinionEpisode01}
        durationInFrames={OPINION_EPISODE_01_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="AvisCommunaute-Episode01-Facecam"
        component={OpinionEpisode01Facecam}
        durationInFrames={OPINION_EPISODE_01_FACECAM_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
