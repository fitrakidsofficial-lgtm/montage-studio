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

/**
 * Charte "Kids vidéo" — réservée aux reels.
 * Turquoise pop : contraste fort, couleurs hors palette YouTube (ni rouge, ni blanc, ni noir dominants).
 * Les clés restent celles de BrandConfig pour que tous les layers fonctionnent sans changement :
 *   teal  = le turquoise de fond      gold   = le jaune soleil (accents, chips)
 *   orange= le corail (pastilles)     cream  = le fond des cartes
 *   night = l'encre (texte, contours)
 */
export const MISSION_KIDS_VIDEO_BRAND: BrandConfig = {
  colors: {
    cream: "#FFF8EC",
    gold: "#FFC93C",
    orange: "#FF6B5A",
    teal: "#14B8A6",
    night: "#06333B",
  },
  fonts: {
    title: "'Luckiest Guy', 'Arial Rounded MT Bold', sans-serif",
    body: "'Itim', Arial, sans-serif",
    arabic: "'Noto Sans Arabic', 'Geeza Pro', sans-serif",
  },
  logoUrl: "/fitra-kids-logo.png",
};

/**
 * Charte "Kids vidéo — Toy Box" : orange + turquoise sur fond bleu-canard sombre.
 * Paire complémentaire au contraste le plus fort, hors palette YouTube.
 */
export const MISSION_KIDS_TOYBOX_BRAND: BrandConfig = {
  colors: {
    cream: "#FFF8EC",
    gold: "#FF9F1C",
    orange: "#FFBF69",
    teal: "#2EC4B6",
    night: "#1B3A47",
  },
  fonts: {
    title: "'Luckiest Guy', 'Arial Rounded MT Bold', sans-serif",
    body: "'Itim', Arial, sans-serif",
    arabic: "'Noto Sans Arabic', 'Geeza Pro', sans-serif",
  },
  logoUrl: "/fitra-kids-logo.png",
};

export const BRAND_PRESETS = [
  { id: "plateforme", name: "Plateforme", brand: FITRA_KIDS_BRAND },
  { id: "kids-turquoise", name: "Turquoise", brand: MISSION_KIDS_VIDEO_BRAND },
  { id: "kids-toybox", name: "Toy Box", brand: MISSION_KIDS_TOYBOX_BRAND },
] as const;


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

export type BrollLayout =
  | "auto"
  | "fullscreen"
  | "bottom-half"
  | "top-half"
  | "overlay"
  | "picture-in-picture"
  | "centered-card";

export interface BrollItem {
  id: string;
  startTime: number;
  endTime: number;
  fileUrl: string;
  mediaType: "image" | "video";
  /** Visual layout — "auto" lets the engine choose based on context */
  layout?: BrollLayout;
  /** Orientation hint for auto layout */
  orientation?: "portrait" | "landscape";
}

export interface VideoProject {
  id: string;
  /** Brand/workspace owning this montage. Null only for legacy local data. */
  studioProjectId: string | null;
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
  /** Auto-zoom keyframes */
  zooms: ZoomKeyframe[];
  /** Silence cuts (jump cuts) */
  silenceCuts: { start: number; end: number }[];
  /** Director: texte-cle overlays */
  texteCles: { time: number; duration: number; text: string }[];
  /** Director: pattern interrupts */
  patternInterrupts: { time: number; duration: number }[];
  /** Intro card */
  introText: string | null;
  introDuration: number;
  /** Social captions */
  captions: SocialCaptions | null;
  /** Background music */
  bgMusicUrl: string | null;
  bgMusicVolume: number;
  /** Transcription language */
  language: "auto" | "fr" | "ar" | "en";
  /** Subtitle styling */
  subtitleFontSize: number;
  subtitleFontFamily: string;
  /** Hook style */
  hookStyle: "overlay" | "card";
  /** CTA objective */
  ctaObjective:
    "engagement" | "save" | "share" | "subscribe" | "traffic" | "sale" | null;
  /** Cross-platform distribution: full video on YouTube, teaser elsewhere. */
  youtubeUrl: string;
  trailerDurationSeconds: number;
  trailerCta: string;
  fullVideoUrl: string;
  trailerVideoUrl: string;
}

export interface ZoomKeyframe {
  time: number;
  scale: number;
  duration: number;
}

export interface SocialCaptions {
  youtube: { title: string; description: string; hashtags: string[] };
  instagram: { caption: string; hashtags: string[] };
  tiktok: { caption: string; hashtags: string[] };
}

export function createDefaultProject(options?: {
  studioProjectId?: string | null;
  brand?: BrandConfig;
}): VideoProject {
  return {
    id: crypto.randomUUID(),
    studioProjectId: options?.studioProjectId ?? null,
    name: "Nouveau montage",
    style: "educatif",
    brand: options?.brand
      ? structuredClone(options.brand)
      : structuredClone(FITRA_KIDS_BRAND),
    mainVideoUrl: null,
    mainVideoDurationSeconds: 60,
    fps: 30,
    subtitles: [],
    words: [],
    cards: [],
    brolls: [],
    outroVideoUrl: "/outro-reel.MP4",
    outroDurationSeconds: 9,
    zooms: [],
    silenceCuts: [],
    texteCles: [],
    patternInterrupts: [],
    introText: null,
    introDuration: 3,
    captions: null,
    bgMusicUrl: null,
    bgMusicVolume: 0.15,
    language: "auto",
    subtitleFontSize: 72,
    subtitleFontFamily: "",
    hookStyle: "overlay",
    ctaObjective: null,
    youtubeUrl: "",
    trailerDurationSeconds: 30,
    trailerCta: "Voir la vidéo complète sur YouTube — lien en bio.",
    fullVideoUrl: "",
    trailerVideoUrl: "",
  };
}
