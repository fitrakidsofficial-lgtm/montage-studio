import type { VideoProject } from "@/lib/types";

export const OPINION_EPISODE_02_PROJECT_ID =
  "avis-communaute-episode-02-position-textes";

const ASSET_ROOT = "/opinion-series/04-position-verset-traduction-explication";

export function createOpinionEpisode02Project(
  studioProjectId: string | null,
): VideoProject {
  return {
    id: OPINION_EPISODE_02_PROJECT_ID,
    studioProjectId,
    name: "Avis communauté 02 — Position des textes",
    style: "opinion",
    brand: {
      colors: {
        cream: "#F7FAF9",
        gold: "#F8B831",
        orange: "#C6611D",
        teal: "#1D776A",
        night: "#061A2A",
      },
      fonts: {
        title: "'Luckiest Guy', 'Arial Rounded MT Bold', sans-serif",
        body: "'Poppins', Arial, sans-serif",
        arabic: "'Noto Sans Arabic', 'Geeza Pro', sans-serif",
      },
      logoUrl: "/fitra-kids-logo.png",
    },
    mainVideoUrl: null,
    mainVideoDurationSeconds: 30,
    fps: 30,
    subtitles: [],
    words: [],
    cards: [
      {
        id: "avis-02-rituel-identite",
        type: "custom-text",
        startTime: 0,
        endTime: 1.2,
        content: {
          type: "custom-text",
          lines: [
            {
              text: "MISSION SOURATES · AVIS 02",
              fontSize: 58,
              color: "gold",
            },
          ],
        },
      },
      {
        id: "avis-02-rituel-promesse",
        type: "custom-text",
        startTime: 1.2,
        endTime: 2.6,
        content: {
          type: "custom-text",
          lines: [
            {
              text: "VOTRE AVIS CONSTRUIT LE LIVRET",
              fontSize: 68,
              color: "cream",
            },
          ],
        },
      },
      {
        id: "avis-02-rituel-question",
        type: "custom-text",
        startTime: 2.6,
        endTime: 5,
        content: {
          type: "custom-text",
          lines: [
            {
              text: "OÙ PLACER LE VERSET, LA TRADUCTION ET L’EXPLICATION ?",
              fontSize: 62,
              color: "orange",
            },
          ],
        },
      },
      {
        id: "avis-02-vote-abc",
        type: "opinion-choice",
        startTime: 20,
        endTime: 30,
        content: {
          type: "opinion-choice",
          mode: "abc",
          eyebrow: "MISSION SOURATES · AVIS 02",
          question: "Quelle page est la plus facile à lire pour votre enfant ?",
          options: [
            {
              id: "a",
              label: "A · LECTURE GUIDÉE",
              imageUrl: `${ASSET_ROOT}/page-complete-a-lecture-continue.png`,
            },
            {
              id: "b",
              label: "B · DEUX ZONES",
              imageUrl: `${ASSET_ROOT}/page-complete-b-deux-colonnes.png`,
            },
            {
              id: "c",
              label: "C · TROIS ÉTAPES",
              imageUrl: `${ASSET_ROOT}/page-complete-c-trois-zones.png`,
            },
          ],
          cta: "ÉCRIVEZ A, B OU C EN COMMENTAIRE",
          footerText: "Montrez les trois pages à votre enfant",
          revealMode: "sequential",
        },
      },
    ],
    brolls: [
      {
        id: "avis-02-planche-a",
        startTime: 5,
        endTime: 10,
        fileUrl: `${ASSET_ROOT}/page-complete-a-video.png`,
        mediaType: "image",
        layout: "fullscreen",
        orientation: "portrait",
      },
      {
        id: "avis-02-planche-b",
        startTime: 10,
        endTime: 15,
        fileUrl: `${ASSET_ROOT}/page-complete-b-video.png`,
        mediaType: "image",
        layout: "fullscreen",
        orientation: "portrait",
      },
      {
        id: "avis-02-planche-c",
        startTime: 15,
        endTime: 20,
        fileUrl: `${ASSET_ROOT}/page-complete-c-video.png`,
        mediaType: "image",
        layout: "fullscreen",
        orientation: "portrait",
      },
    ],
    outroVideoUrl: null,
    outroDurationSeconds: 0,
    zooms: [],
    silenceCuts: [],
    texteCles: [],
    patternInterrupts: [],
    introText: null,
    introDuration: 0,
    captions: {
      youtube: {
        title: "Où placer le verset, la traduction et l’explication ?",
        description:
          "Aidez-nous à choisir la mise en page du livret Mission Sourates avec votre enfant : A, B ou C ?",
        hashtags: ["MissionSourates", "FitraKids", "AlFatiha"],
      },
      instagram: {
        caption:
          "Nouvelle décision à prendre ensemble : quelle organisation aide le mieux votre enfant à lire et comprendre ? Montrez-lui A, B et C, puis écrivez son choix en commentaire.",
        hashtags: ["MissionSourates", "FitraKids", "AlFatiha"],
      },
      tiktok: {
        caption:
          "Votre enfant préfère A, B ou C ? #MissionSourates #FitraKids #AlFatiha",
        hashtags: ["MissionSourates", "FitraKids", "AlFatiha"],
      },
    },
    bgMusicUrl: null,
    bgMusicVolume: 0,
    language: "fr",
    subtitleFontSize: 44,
    subtitleFontFamily: "'Poppins', Arial, sans-serif",
    subtitlePosition: 120,
    hookPositionY: 180,
    logoX: 28,
    logoY: 28,
    logoSize: 180,
    cardOffsetY: 0,
    texteCleOffsetY: 0,
    hookStyle: "overlay",
    ctaObjective: null,
    youtubeUrl: "",
    trailerDurationSeconds: 30,
    trailerCta: "Votez A, B ou C en commentaire.",
    fullVideoUrl: "",
    trailerVideoUrl: "",
  };
}
