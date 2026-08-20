/** Core types for the Montage Studio */

export interface BrandConfig {
  colors: {
    cream: string;
    gold: string;
    orange: string;
    teal: string;
    night: string;
  };
  fonts: {
    title: string;
    body: string;
    arabic: string;
  };
  logoUrl: string | null;
}

export const FITRA_KIDS_BRAND: BrandConfig = {
  colors: {
    cream: "#FAF4E8",
    gold: "#C8972A",
    orange: "#F28A4B",
    teal: "#2E7D6C",
    night: "#123C43",
  },
  fonts: {
    title: "'Luckiest Guy', 'Arial Rounded MT Bold', sans-serif",
    body: "'Itim', Arial, sans-serif",
    arabic: "'Noto Sans Arabic', 'Geeza Pro', sans-serif",
  },
  logoUrl: "/fitra-kids-logo.png",
};

export type TemplateStyle = "educatif" | "promo" | "broll";

export interface SubtitleWord {
  word: string;
  start: number;
  end: number;
}

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

export interface ConceptCard {
  id: string;
  type:
    | "root-letters"
    | "single-word"
    | "verse"
    | "family-recap"
    | "price-tag"
    | "feature-list"
    | "cta"
    | "custom-text";
  startTime: number;
  endTime: number;
  content: ConceptCardContent;
}

export type ConceptCardContent =
  | RootLettersContent
  | SingleWordContent
  | VerseContent
  | FamilyRecapContent
  | PriceTagContent
  | FeatureListContent
  | CtaContent
  | CustomTextContent;

export interface RootLettersContent {
  type: "root-letters";
  label: string; // e.g. "LA RACINE"
  letters: string[]; // e.g. ["س", "ن", "ن"]
}

export interface SingleWordContent {
  type: "single-word";
  label: string; // e.g. "UN MOT DE LA RACINE"
  arabic: string; // e.g. "سُنَّة"
  translation: string; // e.g. "LA SOUNNAH"
}

export interface VerseContent {
  type: "verse";
  surahLabel: string; // e.g. "SOURATE AL-MUNAFIQUN · 63:1"
  arabic: string;
  salawat?: string;
  translation: string;
}

export interface FamilyRecapContent {
  type: "family-recap";
  label: string;
  rootLetters?: string;
  words: { arabic: string; translation: string }[];
}

export interface PriceTagContent {
  type: "price-tag";
  headline: string;
  price: string;
  subtitle: string;
}

export interface FeatureListContent {
  type: "feature-list";
  title: string;
  features: string[];
}

export interface CtaContent {
  type: "cta";
  mainText: string;
  subText: string;
}

export interface CustomTextContent {
  type: "custom-text";
  lines: {
    text: string;
    fontSize: number;
    color: "cream" | "gold" | "orange" | "teal";
  }[];
}

export interface BrollItem {
  id: string;
  startTime: number;
  endTime: number;
  fileUrl: string;
  mediaType: "image" | "video";
}

export interface VideoProject {
  id: string;
  name: string;
  style: TemplateStyle;
  brand: BrandConfig;
  /** Main video (face cam / selfie) */
  mainVideoUrl: string | null;
  mainVideoDurationSeconds: number;
  fps: number;
  /** Subtitles */
  subtitles: SubtitleSegment[];
  words: SubtitleWord[];
  /** Concept cards */
  cards: ConceptCard[];
  /** B-roll overlays */
  brolls: BrollItem[];
  /** Outro video */
  outroVideoUrl: string | null;
  outroDurationSeconds: number;
}

export function createDefaultProject(): VideoProject {
  return {
    id: crypto.randomUUID(),
    name: "Nouveau montage",
    style: "educatif",
    brand: { ...FITRA_KIDS_BRAND },
    mainVideoUrl: null,
    mainVideoDurationSeconds: 60,
    fps: 30,
    subtitles: [],
    words: [],
    cards: [],
    brolls: [],
    outroVideoUrl: "/outro-reel.MP4",
    outroDurationSeconds: 9,
  };
}
