import type { ConceptCard, TemplateStyle } from "./types";

export interface TemplatePreset {
  id: string;
  style: TemplateStyle;
  name: string;
  description: string;
  cardSlots: CardSlot[];
}

interface CardSlot {
  type: ConceptCard["type"];
  startRatio: number;
  endRatio: number;
  content: ConceptCard["content"];
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  // ─── EDUCATIF ───
  {
    id: "racine-arabe",
    style: "educatif",
    name: "Racine arabe",
    description: "Racine, mot, verset, famille de mots, conclusion",
    cardSlots: [
      {
        type: "root-letters",
        startRatio: 0.12,
        endRatio: 0.15,
        content: {
          type: "root-letters",
          label: "LA RACINE",
          letters: ["", "", ""],
        },
      },
      {
        type: "single-word",
        startRatio: 0.18,
        endRatio: 0.21,
        content: {
          type: "single-word",
          label: "UN MOT DE LA RACINE",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "verse",
        startRatio: 0.24,
        endRatio: 0.29,
        content: {
          type: "verse",
          surahLabel: "",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "single-word",
        startRatio: 0.34,
        endRatio: 0.38,
        content: {
          type: "single-word",
          label: "DEUXIEME MOT",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "family-recap",
        startRatio: 0.5,
        endRatio: 0.56,
        content: {
          type: "family-recap",
          label: "UNE MEME FAMILLE",
          rootLetters: "",
          words: [
            { arabic: "", translation: "" },
            { arabic: "", translation: "" },
            { arabic: "", translation: "" },
          ],
        },
      },
      {
        type: "custom-text",
        startRatio: 0.92,
        endRatio: 0.96,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 72, color: "gold" },
            { text: "", fontSize: 48, color: "cream" },
          ],
        },
      },
    ],
  },
  {
    id: "racine-complete",
    style: "educatif",
    name: "Racine complete",
    description:
      "Version longue: racine, 3 mots, 2 versets, famille, conclusion",
    cardSlots: [
      {
        type: "root-letters",
        startRatio: 0.1,
        endRatio: 0.13,
        content: {
          type: "root-letters",
          label: "LA RACINE",
          letters: ["", "", ""],
        },
      },
      {
        type: "verse",
        startRatio: 0.14,
        endRatio: 0.19,
        content: {
          type: "verse",
          surahLabel: "",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "single-word",
        startRatio: 0.24,
        endRatio: 0.28,
        content: {
          type: "single-word",
          label: "PREMIER MOT",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "single-word",
        startRatio: 0.35,
        endRatio: 0.39,
        content: {
          type: "single-word",
          label: "DEUXIEME MOT",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "family-recap",
        startRatio: 0.44,
        endRatio: 0.52,
        content: {
          type: "family-recap",
          label: "UNE MEME FAMILLE",
          rootLetters: "",
          words: [
            { arabic: "", translation: "" },
            { arabic: "", translation: "" },
            { arabic: "", translation: "" },
          ],
        },
      },
      {
        type: "single-word",
        startRatio: 0.58,
        endRatio: 0.62,
        content: {
          type: "single-word",
          label: "TROISIEME MOT",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "verse",
        startRatio: 0.65,
        endRatio: 0.7,
        content: {
          type: "verse",
          surahLabel: "",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "custom-text",
        startRatio: 0.88,
        endRatio: 0.94,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 72, color: "gold" },
            { text: "", fontSize: 48, color: "cream" },
          ],
        },
      },
    ],
  },

  // ─── ÉNIGMES MISSION SOURATES ───
  // Format signature : hook → énigme (3 propositions) → tic-tac 5s → reveal → le fond → CTA MISSION
  {
    id: "enigme-mot",
    style: "educatif",
    name: "① Énigme — Devine le mot",
    description: "Mot arabe caché, 3 propositions, tic-tac, reveal, CTA MISSION",
    cardSlots: [
      {
        type: "custom-text",
        startRatio: 0.06,
        endRatio: 0.24,
        content: {
          type: "custom-text",
          lines: [
            { text: "IL RÉCITE CE MOT. IL VEUT DIRE QUOI ?", fontSize: 56, color: "teal" },
            { text: "1 · ", fontSize: 48, color: "cream" },
            { text: "2 · ", fontSize: 48, color: "cream" },
            { text: "3 · ", fontSize: 48, color: "cream" },
          ],
        },
      },
      {
        type: "single-word",
        startRatio: 0.26,
        endRatio: 0.4,
        content: {
          type: "single-word",
          label: "LA RÉPONSE",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "custom-text",
        startRatio: 0.55,
        endRatio: 0.7,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 64, color: "gold" },
            { text: "", fontSize: 44, color: "cream" },
          ],
        },
      },
      {
        type: "feature-list",
        startRatio: 0.72,
        endRatio: 0.84,
        content: {
          type: "feature-list",
          title: "DANS MISSION SOURATES",
          features: [
            "Le livre interactif du contexte",
            "L'épreuve audio immersive",
            "Le quiz",
            "La carte mentale",
          ],
        },
      },
      {
        type: "cta",
        startRatio: 0.87,
        endRatio: 0.97,
        content: {
          type: "cta",
          mainText: "COMMENTE : MISSION",
          subText: "8 sourates · quiz gratuit · lien en bio",
        },
      },
    ],
  },
  {
    id: "enigme-histoire",
    style: "educatif",
    name: "② Énigme — L'histoire derrière",
    description: "Récit du contexte : énigme, reveal, verset, leçon, CTA MISSION",
    cardSlots: [
      {
        type: "custom-text",
        startRatio: 0.06,
        endRatio: 0.24,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 56, color: "teal" },
            { text: "1 · ", fontSize: 48, color: "cream" },
            { text: "2 · ", fontSize: 48, color: "cream" },
            { text: "3 · ", fontSize: 48, color: "cream" },
          ],
        },
      },
      {
        type: "custom-text",
        startRatio: 0.26,
        endRatio: 0.34,
        content: {
          type: "custom-text",
          lines: [{ text: "", fontSize: 80, color: "gold" }],
        },
      },
      {
        type: "verse",
        startRatio: 0.4,
        endRatio: 0.55,
        content: {
          type: "verse",
          surahLabel: "",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "custom-text",
        startRatio: 0.66,
        endRatio: 0.8,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 64, color: "orange" },
            { text: "", fontSize: 44, color: "cream" },
          ],
        },
      },
      {
        type: "cta",
        startRatio: 0.87,
        endRatio: 0.97,
        content: {
          type: "cta",
          mainText: "COMMENTE : MISSION",
          subText: "8 sourates · quiz gratuit · lien en bio",
        },
      },
    ],
  },
  {
    id: "enigme-lecon",
    style: "educatif",
    name: "③ Énigme — Ça change quoi aujourd'hui",
    description: "Situation du quotidien, le mot du Coran, verset, application, CTA",
    cardSlots: [
      {
        type: "custom-text",
        startRatio: 0.06,
        endRatio: 0.24,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 56, color: "teal" },
            { text: "1 · ", fontSize: 48, color: "cream" },
            { text: "2 · ", fontSize: 48, color: "cream" },
            { text: "3 · ", fontSize: 48, color: "cream" },
          ],
        },
      },
      {
        type: "single-word",
        startRatio: 0.26,
        endRatio: 0.38,
        content: {
          type: "single-word",
          label: "ÇA PORTE UN NOM",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "verse",
        startRatio: 0.44,
        endRatio: 0.58,
        content: {
          type: "verse",
          surahLabel: "",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "custom-text",
        startRatio: 0.66,
        endRatio: 0.8,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 64, color: "gold" },
            { text: "", fontSize: 44, color: "cream" },
          ],
        },
      },
      {
        type: "cta",
        startRatio: 0.87,
        endRatio: 0.97,
        content: {
          type: "cta",
          mainText: "COMMENTE : MISSION",
          subText: "8 sourates · quiz gratuit · lien en bio",
        },
      },
    ],
  },
  {
    id: "enigme-detail",
    style: "educatif",
    name: "④ Énigme — Le détail que personne ne remarque",
    description: "Série qui parle au parent : énigme, verset, révélation, offre, CTA",
    cardSlots: [
      {
        type: "custom-text",
        startRatio: 0.05,
        endRatio: 0.22,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 56, color: "teal" },
            { text: "1 · ", fontSize: 48, color: "cream" },
            { text: "2 · ", fontSize: 48, color: "cream" },
            { text: "3 · ", fontSize: 48, color: "cream" },
          ],
        },
      },
      {
        type: "verse",
        startRatio: 0.28,
        endRatio: 0.44,
        content: {
          type: "verse",
          surahLabel: "",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "custom-text",
        startRatio: 0.48,
        endRatio: 0.62,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 72, color: "gold" },
            { text: "", fontSize: 44, color: "cream" },
          ],
        },
      },
      {
        type: "feature-list",
        startRatio: 0.7,
        endRatio: 0.84,
        content: {
          type: "feature-list",
          title: "DANS MISSION SOURATES",
          features: [
            "Le livre interactif du contexte",
            "L'épreuve audio immersive",
            "Le quiz",
            "La carte mentale",
          ],
        },
      },
      {
        type: "cta",
        startRatio: 0.87,
        endRatio: 0.97,
        content: {
          type: "cta",
          mainText: "COMMENTE : MISSION",
          subText: "8 sourates · quiz gratuit · lien en bio",
        },
      },
    ],
  },

  // ─── PROMO ───
  {
    id: "cta-mission",
    style: "promo",
    name: "CTA Mission Sourates",
    description: "Clip de fin réutilisable : les 4 briques + mot-clé MISSION",
    cardSlots: [
      {
        type: "feature-list",
        startRatio: 0.1,
        endRatio: 0.55,
        content: {
          type: "feature-list",
          title: "DANS MISSION SOURATES",
          features: [
            "Le livre interactif du contexte",
            "L'épreuve audio immersive",
            "Le quiz",
            "La carte mentale",
          ],
        },
      },
      {
        type: "cta",
        startRatio: 0.6,
        endRatio: 0.95,
        content: {
          type: "cta",
          mainText: "COMMENTE : MISSION",
          subText: "8 sourates · une nouvelle chaque mois · quiz gratuit",
        },
      },
    ],
  },

  {
    id: "promo-standard",
    style: "promo",
    name: "Promo standard",
    description: "Prix, features, CTA",
    cardSlots: [
      {
        type: "price-tag",
        startRatio: 0.35,
        endRatio: 0.45,
        content: {
          type: "price-tag",
          headline: "",
          price: "",
          subtitle: "",
        },
      },
      {
        type: "feature-list",
        startRatio: 0.46,
        endRatio: 0.58,
        content: {
          type: "feature-list",
          title: "TOUT EST INCLUS",
          features: ["", "", "", ""],
        },
      },
      {
        type: "price-tag",
        startRatio: 0.75,
        endRatio: 0.84,
        content: {
          type: "price-tag",
          headline: "",
          price: "",
          subtitle: "",
        },
      },
      {
        type: "cta",
        startRatio: 0.88,
        endRatio: 0.96,
        content: {
          type: "cta",
          mainText: "",
          subText: "",
        },
      },
    ],
  },
  {
    id: "promo-campagne",
    style: "promo",
    name: "Campagne urgence",
    description: "Annonce, features, CTA inscription",
    cardSlots: [
      {
        type: "custom-text",
        startRatio: 0.05,
        endRatio: 0.15,
        content: {
          type: "custom-text",
          lines: [
            { text: "", fontSize: 56, color: "teal" },
            { text: "", fontSize: 72, color: "orange" },
          ],
        },
      },
      {
        type: "feature-list",
        startRatio: 0.4,
        endRatio: 0.55,
        content: {
          type: "feature-list",
          title: "",
          features: ["", "", ""],
        },
      },
      {
        type: "cta",
        startRatio: 0.85,
        endRatio: 0.96,
        content: {
          type: "cta",
          mainText: "",
          subText: "",
        },
      },
    ],
  },

  // ─── BROLL ───
  {
    id: "broll-simple",
    style: "broll",
    name: "B-roll simple",
    description: "Video + sous-titres, pas de cards",
    cardSlots: [],
  },
  {
    id: "broll-educatif",
    style: "broll",
    name: "B-roll + cards",
    description: "Video avec racine, verset et famille",
    cardSlots: [
      {
        type: "root-letters",
        startRatio: 0.1,
        endRatio: 0.14,
        content: {
          type: "root-letters",
          label: "LA RACINE",
          letters: ["", "", ""],
        },
      },
      {
        type: "verse",
        startRatio: 0.25,
        endRatio: 0.32,
        content: {
          type: "verse",
          surahLabel: "",
          arabic: "",
          translation: "",
        },
      },
      {
        type: "family-recap",
        startRatio: 0.6,
        endRatio: 0.7,
        content: {
          type: "family-recap",
          label: "UNE MEME FAMILLE",
          words: [
            { arabic: "", translation: "" },
            { arabic: "", translation: "" },
            { arabic: "", translation: "" },
          ],
        },
      },
    ],
  },
];

export function applyPreset(
  preset: TemplatePreset,
  videoDurationSeconds: number,
): ConceptCard[] {
  return preset.cardSlots.map((slot) => ({
    id: crypto.randomUUID(),
    type: slot.type,
    startTime: Math.round(slot.startRatio * videoDurationSeconds * 10) / 10,
    endTime: Math.round(slot.endRatio * videoDurationSeconds * 10) / 10,
    content: structuredClone(slot.content),
  }));
}
