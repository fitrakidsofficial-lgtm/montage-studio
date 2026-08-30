import type { VideoProject } from "@/lib/types";

export const OPINION_EPISODE_01_PROJECT_ID =
  "avis-communaute-episode-01-facecam-editable";

export function createOpinionEpisode01Project(
  studioProjectId: string | null,
): VideoProject {
  return {
    id: OPINION_EPISODE_01_PROJECT_ID,
    studioProjectId,
    name: "Avis communauté 01 — Étoile ou Terre ?",
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
    mainVideoUrl:
      "/opinion-series/01-illustration-verset-2/facecam-projet-livret.mp4",
    mainVideoDurationSeconds: 49.2,
    fps: 30,
    subtitles: [
      {
        start: 0,
        end: 3.3,
        text: "Je travaille sur un projet qui me tient réellement à cœur :",
      },
      {
        start: 3.3,
        end: 6.5,
        text: "créer un livret Mission Sourates, un vrai livret,",
      },
      {
        start: 6.5,
        end: 10.8,
        text: "pour aider les enfants à découvrir, comprendre et mémoriser les sourates de façon ludique.",
      },
      {
        start: 10.8,
        end: 14.45,
        text: "Mais je ne veux pas le créer, cette fois-ci, seule dans mon coin.",
      },
      {
        start: 14.45,
        end: 16.8,
        text: "Puisqu’il est destiné à vos enfants, à nos enfants,",
      },
      {
        start: 16.8,
        end: 19.16,
        text: "j’ai envie de le créer avec vous, et surtout avec eux.",
      },
      {
        start: 19.16,
        end: 23.35,
        text: "Régulièrement, je vais vous montrer plusieurs versions d’une page,",
      },
      {
        start: 23.35,
        end: 26.05,
        text: "d’une illustration ou d’une activité, et vous pourrez m’aider à choisir.",
      },
      {
        start: 26.64,
        end: 31.4,
        text: "On commence aujourd’hui avec la sourate Al-Fatiha, l’Ouverture.",
      },
      {
        start: 31.4,
        end: 34.85,
        text: "Pour illustrer l’expression « Seigneur des mondes », j’hésite entre deux images :",
      },
      {
        start: 34.85,
        end: 38.9,
        text: "la version A, l’étoile, et la version B, la Terre.",
      },
      {
        start: 38.9,
        end: 42.1,
        text: "Laquelle parle le mieux à votre enfant ?",
      },
      {
        start: 42.1,
        end: 44.8,
        text: "Demandez-lui et écrivez A ou B en commentaire.",
      },
      {
        start: 44.8,
        end: 48.32,
        text: "Votre choix participera vraiment à la création de ce livret.",
      },
      { start: 48.32, end: 49.2, text: "Je compte sur vous." },
    ],
    words: [],
    cards: [
      {
        id: "avis-01-choix-ab",
        type: "opinion-choice",
        startTime: 39.2,
        endTime: 44.8,
        content: {
          type: "opinion-choice",
          mode: "ab",
          eyebrow: "MISSION SOURATES · AVIS 01",
          question: "Laquelle parle le mieux à votre enfant ?",
          options: [
            {
              id: "a",
              label: "A · L’ÉTOILE",
              imageUrl:
                "/opinion-series/01-illustration-verset-2/option-a-etoile.png",
            },
            {
              id: "b",
              label: "B · LA TERRE",
              imageUrl:
                "/opinion-series/01-illustration-verset-2/option-b-terre.png",
            },
          ],
          cta: "ÉCRIVEZ A OU B EN COMMENTAIRE",
          footerText: "Demandez à votre enfant",
          revealMode: "sequential",
        },
      },
      {
        id: "avis-01-cta-final",
        type: "custom-text",
        startTime: 44.8,
        endTime: 49.2,
        content: {
          type: "custom-text",
          lines: [
            { text: "A OU B ?", fontSize: 92, color: "cream" },
            {
              text: "DEMANDEZ À VOTRE ENFANT",
              fontSize: 46,
              color: "gold",
            },
          ],
        },
      },
    ],
    brolls: [
      {
        id: "avis-01-livret",
        startTime: 3.8,
        endTime: 10.8,
        fileUrl:
          "/opinion-series/01-illustration-verset-2/contexte-a-page-etoile.png",
        mediaType: "image",
        layout: "centered-card",
        orientation: "portrait",
      },
      {
        id: "avis-01-entete-a",
        startTime: 19.16,
        endTime: 21.45,
        fileUrl: "/opinion-series/02-entete-page/option-a-entete-epuree.png",
        mediaType: "image",
        layout: "centered-card",
        orientation: "landscape",
      },
      {
        id: "avis-01-entete-b",
        startTime: 21.45,
        endTime: 23.75,
        fileUrl:
          "/opinion-series/02-entete-page/option-b-entete-kids-moderne.png",
        mediaType: "image",
        layout: "centered-card",
        orientation: "landscape",
      },
      {
        id: "avis-01-entete-c",
        startTime: 23.75,
        endTime: 26.4,
        fileUrl: "/opinion-series/02-entete-page/option-c-entete-arrondie.png",
        mediaType: "image",
        layout: "centered-card",
        orientation: "landscape",
      },
      {
        id: "avis-01-page-fatiha",
        startTime: 26.64,
        endTime: 31.4,
        fileUrl:
          "/opinion-series/01-illustration-verset-2/contexte-a-page-etoile.png",
        mediaType: "image",
        layout: "centered-card",
        orientation: "portrait",
      },
      {
        id: "avis-01-etoile",
        startTime: 34.85,
        endTime: 36.95,
        fileUrl: "/opinion-series/01-illustration-verset-2/option-a-etoile.png",
        mediaType: "image",
        layout: "centered-card",
        orientation: "portrait",
      },
      {
        id: "avis-01-terre",
        startTime: 36.95,
        endTime: 39.2,
        fileUrl: "/opinion-series/01-illustration-verset-2/option-b-terre.png",
        mediaType: "image",
        layout: "centered-card",
        orientation: "portrait",
      },
    ],
    outroVideoUrl: null,
    outroDurationSeconds: 0,
    zooms: [],
    silenceCuts: [],
    texteCles: [
      {
        time: 0.15,
        duration: 2.8,
        text: "MISSION SOURATES · AVIS 01",
      },
      {
        time: 19.2,
        duration: 2.5,
        text: "PLUSIEURS VERSIONS",
      },
    ],
    patternInterrupts: [],
    introText: null,
    introDuration: 3,
    captions: {
      youtube: {
        title: "Étoile ou Terre ? Aidez-nous à choisir",
        description:
          "Nous construisons le livret Mission Sourates avec vous et vos enfants. Pour illustrer « Seigneur des mondes », choisissez A, l’étoile, ou B, la Terre.",
        hashtags: ["MissionSourates", "FitraKids", "AlFatiha"],
      },
      instagram: {
        caption:
          "On construit le livret Mission Sourates avec vous ✨🌍 Demandez à votre enfant : A, l’étoile, ou B, la Terre ? Écrivez son choix en commentaire.",
        hashtags: ["MissionSourates", "FitraKids", "AlFatiha"],
      },
      tiktok: {
        caption:
          "A ou B ? Demandez à votre enfant ✨🌍 #MissionSourates #FitraKids #AlFatiha",
        hashtags: ["MissionSourates", "FitraKids", "AlFatiha"],
      },
    },
    bgMusicUrl: null,
    bgMusicVolume: 0,
    language: "fr",
    subtitleFontSize: 42,
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
    trailerCta: "Votez A ou B en commentaire.",
    fullVideoUrl: "",
    trailerVideoUrl: "",
  };
}
