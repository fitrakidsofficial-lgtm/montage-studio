/**
 * Jetons de mise en page de l'écran de quiz Mission Sourates.
 * Valeurs validées visuellement — voir content/reels/design/quiz-916.png et quiz-169.png.
 *
 * Un seul jeu de valeurs pour les deux formats : le 16:9 est le 9:16 multiplié
 * par SCALE_169. Ne jamais redéfinir une valeur d'un côté seulement.
 */

export const QUIZ_SCALE_169 = 0.72;

export const QUIZ_LAYOUT = {
  /** Zone sûre 9:16 — le bas est réservé à l'interface Instagram */
  safe916: { top: 150, side: 100, bottom: 268 },
  safe169: { top: 44, side: 70, bottom: 40 },

  /** Barre de progression des 10 questions */
  steps: { height: 18, gap: 9, border: 4 },

  /** Pastilles compteur / type / score */
  pill: { fontSize: 32, padTop: 11, padSide: 24, padBottom: 7, shadow: 6 },

  /** Titre de la question */
  question: { fontSize: 60, lineHeight: 1.05, stroke: 12, shadowY: 10, marginTop: 38 },

  /** Carte du mot arabe */
  hero: {
    marginTop: 38,
    padY: 18,
    padX: 30,
    border: 12,
    radius: 44,
    rotate: -1.2,
    arabicFontSize: 132,
    /** hauteur fixe : les métriques de Noto Sans Arabic créent sinon un vide sous le mot */
    arabicBoxHeight: 158,
  },

  /** Écart entre la carte du mot et la première réponse — valeur clé du rythme */
  heroToOptions: 175,

  /** Cartes réponses */
  option: {
    gap: 48,
    padY: 26,
    padX: 32,
    radius: 40,
    fontSize: 48,
    numSize: 78,
    numFontSize: 42,
    shadow: 12,
    /** inclinaison alternée : 1re carte +0.5°, 3e carte -0.5° */
    rotate: 0.5,
  },

  /** Barre de compte à rebours (3 secondes) */
  timer: { height: 50, border: 8, gap: 20, boltSize: 56 },

  /** Pied : score à gauche, signature à droite */
  foot: { marginTop: 34, logoSize: 54, fontSize: 28, letterSpacing: 0.24 },

  /** Fond */
  background: {
    dots: { size: 74, radius: 4, opacity: 0.13 },
    gradient: "radial-gradient(76% 46% at 50% 40%, {teal} 0%, {deep} 84%)",
  },

  /** Ombre portée commune : dure, jamais floue */
  shadow: "0 12px 0 rgba(0,0,0,.30)",
  shadowHero: "0 16px 0 rgba(0,0,0,.32)",
} as const;

export type QuizLayout = typeof QUIZ_LAYOUT;
