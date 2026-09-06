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
    name: "Avis communauté 02 — Disposition des versets",
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
    mainVideoUrl: `${ASSET_ROOT}/facecam-avis-02-disposition-versets.mp4`,
    mainVideoDurationSeconds: 48.8,
    fps: 30,
    subtitles: [
      {
        start: 0,
        end: 2.42,
        text: "Ne scrollez surtout pas, on continue",
      },
      {
        start: 2.42,
        end: 4.16,
        text: "de construire ensemble le livret Mission Sourates.",
      },
      {
        start: 4.56,
        end: 8.96,
        text: "Aujourd’hui, j’ai besoin de votre avis par rapport à la fiche sourate.",
      },
      {
        start: 9.14,
        end: 12.1,
        text: "Je vous montre le même contenu, présenté de trois façons différentes.",
      },
      {
        start: 12.82,
        end: 15.12,
        text: "Version A : chaque verset se lit de haut en bas :",
      },
      {
        start: 15.24,
        end: 17.84,
        text: "l’arabe, la traduction française et la petite explication.",
      },
      {
        start: 18.68,
        end: 23.94,
        text: "Version B : les versets sont répartis sur deux colonnes pour en voir plusieurs en même temps.",
      },
      {
        start: 24.54,
        end: 29.82,
        text: "Version C : l’explication à gauche, la traduction au milieu et le verset en arabe à droite.",
      },
      {
        start: 30.08,
        end: 34.44,
        text: "Laquelle aide le mieux votre enfant à lire, à comprendre et à se repérer dans la page ?",
      },
      {
        start: 34.9,
        end: 37.1,
        text: "Montrez-lui les trois versions sans l’influencer.",
      },
      {
        start: 37.66,
        end: 39.78,
        text: "Écrivez-moi A, B ou C en commentaire.",
      },
      {
        start: 40.02,
        end: 43.94,
        text: "Et pour découvrir Mission Sourates dès maintenant,",
      },
      {
        start: 43.94,
        end: 47.22,
        text: "la plateforme vous attend avec huit sourates déjà prêtes et complètes.",
      },
      { start: 47.34, end: 48.04, text: "Le lien est dans ma bio." },
    ],
    words: [],
    cards: [
      {
        id: "avis-02-vote-abc",
        type: "opinion-choice",
        startTime: 30.08,
        endTime: 40.02,
        content: {
          type: "opinion-choice",
          mode: "abc",
          eyebrow: "MISSION SOURATES · AVIS 02",
          question: "Quelle page aide le mieux votre enfant ?",
          options: [
            {
              id: "a",
              label: "A · DE HAUT EN BAS",
              imageUrl: `${ASSET_ROOT}/page-complete-a-lecture-continue.png`,
            },
            {
              id: "b",
              label: "B · DEUX COLONNES",
              imageUrl: `${ASSET_ROOT}/page-complete-b-deux-colonnes.png`,
            },
            {
              id: "c",
              label: "C · TROIS ZONES ALIGNÉES",
              imageUrl: `${ASSET_ROOT}/page-complete-c-trois-zones.png`,
            },
          ],
          cta: "ÉCRIVEZ A, B OU C EN COMMENTAIRE",
          footerText: "Montrez les trois pages à votre enfant",
          revealMode: "sequential",
        },
      },
      {
        id: "avis-02-cta-plateforme",
        type: "custom-text",
        startTime: 40.02,
        endTime: 48.8,
        content: {
          type: "custom-text",
          lines: [
            { text: "8 SOURATES COMPLÈTES", fontSize: 86, color: "cream" },
            {
              text: "DÉJÀ PRÊTES SUR LA PLATEFORME",
              fontSize: 46,
              color: "gold",
            },
            { text: "VOIR LA PLATEFORME · LIEN EN BIO", fontSize: 42, color: "orange" },
          ],
        },
      },
    ],
    brolls: [
      {
        id: "avis-02-apercu-complet",
        startTime: 9.14,
        endTime: 12.1,
        fileUrl: `${ASSET_ROOT}/comparatif-pages-completes-a-b-c.png`,
        mediaType: "image",
        layout: "centered-card",
        orientation: "landscape",
      },
      {
        id: "avis-02-planche-a",
        startTime: 12.82,
        endTime: 18.68,
        fileUrl: `${ASSET_ROOT}/page-complete-a-video.png`,
        mediaType: "image",
        layout: "fullscreen",
        orientation: "portrait",
      },
      {
        id: "avis-02-planche-b",
        startTime: 18.68,
        endTime: 24.54,
        fileUrl: `${ASSET_ROOT}/page-complete-b-video.png`,
        mediaType: "image",
        layout: "fullscreen",
        orientation: "portrait",
      },
      {
        id: "avis-02-planche-c",
        startTime: 24.54,
        endTime: 30.08,
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
    texteCles: [
      { time: 0.15, duration: 2.8, text: "MISSION SOURATES · AVIS 02" },
      { time: 9.14, duration: 2.4, text: "3 FAÇONS DE LIRE" },
    ],
    patternInterrupts: [],
    introText: null,
    introDuration: 3,
    captions: {
      youtube: {
        title: "Votre enfant lit mieux quelle version : A, B ou C ?",
        description:
          "Aidez-nous à choisir la disposition des versets du livret Mission Sourates. Montrez les trois pages à votre enfant et notez A, B ou C en commentaire.",
        hashtags: ["MissionSourates", "FitraKids", "AlFatiha"],
      },
      instagram: {
        caption:
          "Même contenu, trois façons de le lire. Laquelle aide le mieux votre enfant à lire, comprendre et se repérer : A, B ou C ? Demandez-lui sans l’influencer et écrivez son choix en commentaire. La plateforme Mission Sourates propose déjà 8 sourates complètes — lien en bio.",
        hashtags: ["MissionSourates", "FitraKids", "AlFatiha"],
      },
      tiktok: {
        caption:
          "A, B ou C : quelle page aide le mieux votre enfant ? 8 sourates complètes sont déjà disponibles. #MissionSourates #FitraKids #AlFatiha",
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
    trailerDurationSeconds: 48.8,
    trailerCta: "Votez A, B ou C puis découvrez les 8 sourates sur la plateforme.",
    fullVideoUrl: "",
    trailerVideoUrl: "",
  };
}
