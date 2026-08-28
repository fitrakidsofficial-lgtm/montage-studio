/**
 * Mission Sourates — les 32 épisodes de la série "L'Énigme du jour".
 *
 * 8 sourates en ligne × 4 séries (mot / histoire / leçon / détail).
 * Structure de chaque reel : hook → énigme (3 propositions) → tic-tac 5 s
 * → reveal → le fond → CTA "COMMENTE : MISSION".
 *
 * NOTE : les champs `arabic` et `translation` des cards `verse` sont volontairement
 * laissés vides. Colle le verset depuis ta source validée (Ibn Kathīr) avant de rendre.
 */

import type { ConceptCard } from "./types";
import { applyPreset, TEMPLATE_PRESETS } from "./template-presets";

export type SerieId = "mot" | "histoire" | "lecon" | "detail";

export const SERIE_LABELS: Record<SerieId, string> = {
  mot: "① Devine le mot",
  histoire: "② L'histoire derrière",
  lecon: "③ Ça change quoi aujourd'hui",
  detail: "④ Le détail que personne ne remarque",
};

export const SERIE_PRESET: Record<SerieId, string> = {
  mot: "enigme-mot",
  histoire: "enigme-histoire",
  lecon: "enigme-lecon",
  detail: "enigme-detail",
};

export const SOURATES = [
  "Al-Fatiha",
  "An-Nas",
  "Al-Falaq",
  "Al-Ikhlas",
  "Al-Masad",
  "An-Nasr",
  "Al-Kafirun",
  "Al-Kawthar",
] as const;

export type SourateName = (typeof SOURATES)[number];

export interface SourateEpisode {
  id: string;
  num: number;
  sourate: SourateName;
  serie: SerieId;
  presetId: string;
  /** Phrase d'accroche, 0-3 s */
  hook: string;
  /** La question posée avant le tic-tac */
  question: string;
  options: [string, string, string];
  /** Index de la bonne réponse (0, 1 ou 2) */
  reponse: 0 | 1 | 2;
  /** Reveal — mot arabe et sens */
  reveal: { label: string; arabic: string; translation: string };
  /** Référence du verset à afficher */
  surahLabel: string;
  /** Les deux lignes fortes après le reveal */
  punch: [string, string];
}

export const MISSION_SOURATES_EPISODES: SourateEpisode[] = [
  // ─── AL-FATIHA ───
  {
    id: "01-fatiha-mot",
    num: 1,
    sourate: "Al-Fatiha",
    serie: "mot",
    presetId: "enigme-mot",
    hook: "Il la récite 17 fois par jour. Seigneur de quoi, exactement ?",
    question: "« Rabbi-l-'alamin » : Seigneur de quoi ?",
    options: ["des hommes", "des mondes", "des croyants"],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "الْعَالَمِينَ",
      translation: "LES MONDES",
    },
    surahLabel: "SOURATE AL-FATIHA · 1:2",
    punch: [
      "Pas seulement de nous.",
      "Des anges, des animaux, des étoiles — de tout ce qui existe.",
    ],
  },
  {
    id: "02-fatiha-histoire",
    num: 2,
    sourate: "Al-Fatiha",
    serie: "histoire",
    presetId: "enigme-histoire",
    hook: "Une sourate du Coran est une conversation. Laquelle ?",
    question: "Dans quelle sourate Allah répond-il verset par verset ?",
    options: ["Al-Ikhlas", "Al-Fatiha", "An-Nas"],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "الْفَاتِحَة",
      translation: "AL-FATIHA",
    },
    surahLabel: "SOURATE AL-FATIHA · 1:1-7",
    punch: [
      "Ton enfant parle. Et on lui répond.",
      "Rapporté dans un hadith qudsi (Muslim).",
    ],
  },
  {
    id: "03-fatiha-lecon",
    num: 3,
    sourate: "Al-Fatiha",
    serie: "lecon",
    presetId: "enigme-lecon",
    hook: "Combien de fois par jour ton enfant demande « guide-nous » ?",
    question: "Combien de fois par jour, au minimum ?",
    options: ["5 fois", "17 fois", "3 fois"],
    reponse: 1,
    reveal: {
      label: "CE QU'IL DEMANDE",
      arabic: "اهْدِنَا",
      translation: "GUIDE-NOUS",
    },
    surahLabel: "SOURATE AL-FATIHA · 1:6",
    punch: [
      "17 fois par jour, il demande une chose.",
      "Est-ce qu'il sait qu'il la demande ?",
    ],
  },
  {
    id: "04-fatiha-detail",
    num: 4,
    sourate: "Al-Fatiha",
    serie: "detail",
    presetId: "enigme-detail",
    hook: "Au milieu d'Al-Fatiha, la phrase change complètement de forme.",
    question: "Qu'est-ce qui change au 5e verset ?",
    options: [
      "on passe au pluriel",
      "on passe de « Il » à « Toi »",
      "on change de sujet",
    ],
    reponse: 1,
    reveal: {
      label: "LE BASCULEMENT",
      arabic: "إِيَّاكَ نَعْبُدُ",
      translation: "C'EST TOI QUE NOUS ADORONS",
    },
    surahLabel: "SOURATE AL-FATIHA · 1:5",
    punch: [
      "On parle d'Allah… puis on parle à Allah.",
      "Et on dit « nous », jamais « je ».",
    ],
  },

  // ─── AN-NAS ───
  {
    id: "05-nas-mot",
    num: 5,
    sourate: "An-Nas",
    serie: "mot",
    presetId: "enigme-mot",
    hook: "Un mot d'An-Nas décrit exactement ce qui se passe dans sa tête.",
    question: "« Al-waswas al-khannas », c'est qui ?",
    options: [
      "le voleur",
      "celui qui chuchote puis se cache",
      "le menteur",
    ],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "الْوَسْوَاسِ الْخَنَّاسِ",
      translation: "LE CHUCHOTEUR QUI SE RETIRE",
    },
    surahLabel: "SOURATE AN-NAS · 114:4",
    punch: [
      "Il ne crie pas. Il chuchote.",
      "Et dès qu'on nomme Allah, il recule.",
    ],
  },
  {
    id: "06-nas-histoire",
    num: 6,
    sourate: "An-Nas",
    serie: "histoire",
    presetId: "enigme-histoire",
    hook: "Deux sourates forment un bouclier. Lesquelles ?",
    question: "Quelles sourates appelle-t-on « les deux protectrices » ?",
    options: [
      "Al-Fatiha et Al-Ikhlas",
      "Al-Falaq et An-Nas",
      "Al-Kawthar et An-Nasr",
    ],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "الْمُعَوِّذَتَانِ",
      translation: "AL-MU'AWWIDHATAN",
    },
    surahLabel: "SOURATES AL-FALAQ ET AN-NAS · 113-114",
    punch: [
      "Deux sourates, un seul bouclier.",
      "Récitées chaque soir, avant de dormir.",
    ],
  },
  {
    id: "07-nas-lecon",
    num: 7,
    sourate: "An-Nas",
    serie: "lecon",
    presetId: "enigme-lecon",
    hook: "« Prends-le, personne ne te voit. » Cette voix a un nom.",
    question: "Comment le Coran appelle-t-il cette petite voix ?",
    options: ["le doute", "le waswas", "la colère"],
    reponse: 1,
    reveal: {
      label: "ÇA PORTE UN NOM",
      arabic: "الْوَسْوَاس",
      translation: "LE CHUCHOTEMENT",
    },
    surahLabel: "SOURATE AN-NAS · 114:4-5",
    punch: [
      "La phrase dans la tête avant la bêtise.",
      "Le Coran lui a donné un nom il y a 14 siècles.",
    ],
  },
  {
    id: "08-nas-detail",
    num: 8,
    sourate: "An-Nas",
    serie: "detail",
    presetId: "enigme-detail",
    hook: "Avant de demander protection, on nomme Allah plusieurs fois.",
    question: "Combien de fois, au début d'An-Nas ?",
    options: ["une fois", "trois fois", "deux fois"],
    reponse: 1,
    reveal: {
      label: "TROIS NOMS",
      arabic: "رَبِّ · مَلِكِ · إِلَٰهِ",
      translation: "SEIGNEUR · ROI · DIEU",
    },
    surahLabel: "SOURATE AN-NAS · 114:1-3",
    punch: [
      "On rappelle qui Il est avant de demander.",
      "Et le mal peut venir des jinns comme des humains.",
    ],
  },

  // ─── AL-FALAQ ───
  {
    id: "09-falaq-mot",
    num: 9,
    sourate: "Al-Falaq",
    serie: "mot",
    presetId: "enigme-mot",
    hook: "Le titre de cette sourate décrit un lever de soleil.",
    question: "« Al-Falaq », ça veut dire quoi ?",
    options: [
      "la nuit",
      "la fente d'où sort la lumière",
      "l'étoile",
    ],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "الْفَلَق",
      translation: "L'AUBE QUI FEND LA NUIT",
    },
    surahLabel: "SOURATE AL-FALAQ · 113:1",
    punch: [
      "Un mot qui décrit la lumière déchirant le noir.",
      "Tout est déjà dans le titre.",
    ],
  },
  {
    id: "10-falaq-histoire",
    num: 10,
    sourate: "Al-Falaq",
    serie: "histoire",
    presetId: "enigme-histoire",
    hook: "Cette sourate nomme précisément ce dont on demande protection.",
    question: "Lequel de ces maux vient du cœur des gens ?",
    options: ["l'obscurité", "l'envie", "la peur"],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "حَاسِدٍ إِذَا حَسَدَ",
      translation: "L'ENVIEUX QUAND IL ENVIE",
    },
    surahLabel: "SOURATE AL-FALAQ · 113:5",
    punch: [
      "Trois maux nommés dans cinq versets.",
      "Le dernier ne vient pas du dehors.",
    ],
  },
  {
    id: "11-falaq-lecon",
    num: 11,
    sourate: "Al-Falaq",
    serie: "lecon",
    presetId: "enigme-lecon",
    hook: "Son copain a un vélo neuf. Il voudrait qu'il le casse.",
    question: "Ce qu'il ressent, ça s'appelle comment ?",
    options: ["la colère", "l'envie (hasad)", "la tristesse"],
    reponse: 1,
    reveal: {
      label: "ÇA PORTE UN NOM",
      arabic: "الْحَسَد",
      translation: "L'ENVIE",
    },
    surahLabel: "SOURATE AL-FALAQ · 113:5",
    punch: [
      "Il le ressent sans savoir le nommer.",
      "Le Coran met un mot dessus — et une protection.",
    ],
  },
  {
    id: "12-falaq-detail",
    num: 12,
    sourate: "Al-Falaq",
    serie: "detail",
    presetId: "enigme-detail",
    hook: "On demande protection contre le noir. À qui, exactement ?",
    question: "Le premier verset nomme Allah comment ?",
    options: [
      "le Seigneur des hommes",
      "le Seigneur de l'aube",
      "le Seigneur des mondes",
    ],
    reponse: 1,
    reveal: {
      label: "LE NOM CHOISI",
      arabic: "رَبِّ الْفَلَق",
      translation: "LE SEIGNEUR DE L'AUBE",
    },
    surahLabel: "SOURATE AL-FALAQ · 113:1",
    punch: [
      "La réponse est déjà dans la question.",
      "On demande au Seul qui fait sortir la lumière du noir.",
    ],
  },

  // ─── AL-IKHLAS ───
  {
    id: "13-ikhlas-mot",
    num: 13,
    sourate: "Al-Ikhlas",
    serie: "mot",
    presetId: "enigme-mot",
    hook: "Un mot arabe qu'il faut une phrase entière pour traduire.",
    question: "« As-Samad », ça veut dire quoi ?",
    options: [
      "le grand",
      "Celui qui n'a besoin de rien et dont tout dépend",
      "l'éternel",
    ],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "الصَّمَد",
      translation: "CELUI DONT TOUT DÉPEND",
    },
    surahLabel: "SOURATE AL-IKHLAS · 112:2",
    punch: [
      "Un seul mot en arabe.",
      "Une phrase entière en français.",
    ],
  },
  {
    id: "14-ikhlas-histoire",
    num: 14,
    sourate: "Al-Ikhlas",
    serie: "histoire",
    presetId: "enigme-histoire",
    hook: "Cette sourate est la réponse à une question qu'on a posée.",
    question: "Quelle question a-t-on posée au Prophète ﷺ ?",
    options: [
      "« Où est ton Seigneur ? »",
      "« Décris-nous ton Seigneur »",
      "« Qui t'a envoyé ? »",
    ],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "قُلْ هُوَ اللَّهُ أَحَد",
      translation: "DIS : IL EST ALLAH, UNIQUE",
    },
    surahLabel: "SOURATE AL-IKHLAS · 112:1",
    punch: [
      "On a demandé. Allah a répondu.",
      "Quatre versets. Rien de plus.",
    ],
  },
  {
    id: "15-ikhlas-lecon",
    num: 15,
    sourate: "Al-Ikhlas",
    serie: "lecon",
    presetId: "enigme-lecon",
    hook: "À l'école, on lui demande : « c'est qui, ton Dieu ? »",
    question: "Quelle sourate est déjà la réponse ?",
    options: ["Al-Fatiha", "Al-Ikhlas", "An-Nas"],
    reponse: 1,
    reveal: {
      label: "SA RÉPONSE",
      arabic: "الْإِخْلَاص",
      translation: "AL-IKHLAS",
    },
    surahLabel: "SOURATE AL-IKHLAS · 112:1-4",
    punch: [
      "Il a déjà la réponse dans la bouche.",
      "Il lui manque juste le sens.",
    ],
  },
  {
    id: "16-ikhlas-detail",
    num: 16,
    sourate: "Al-Ikhlas",
    serie: "detail",
    presetId: "enigme-detail",
    hook: "Quatre versets. Et une valeur que personne n'imagine.",
    question: "Al-Ikhlas équivaut à quelle part du Coran ?",
    options: ["un dixième", "un tiers", "la moitié"],
    reponse: 1,
    reveal: {
      label: "UN TIERS DU CORAN",
      arabic: "ثُلُثُ الْقُرْآن",
      translation: "RAPPORTÉ PAR AL-BUKHARI",
    },
    surahLabel: "SOURATE AL-IKHLAS · 112:1-4",
    punch: [
      "Quatre versets. Ton enfant les connaît déjà.",
      "Il ne sait juste pas ce qu'il porte.",
    ],
  },

  // ─── AL-MASAD ───
  {
    id: "17-masad-mot",
    num: 17,
    sourate: "Al-Masad",
    serie: "mot",
    presetId: "enigme-mot",
    hook: "« Hammalat al-hatab » — un surnom, pas un métier.",
    question: "« Hammalat al-hatab », ça veut dire quoi ?",
    options: ["la cuisinière", "la porteuse de bois", "la marchande"],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "حَمَّالَةَ الْحَطَب",
      translation: "LA PORTEUSE DE BOIS",
    },
    surahLabel: "SOURATE AL-MASAD · 111:4",
    punch: [
      "Elle transportait des épines.",
      "Pour les jeter sur le chemin du Prophète ﷺ.",
    ],
  },
  {
    id: "18-masad-histoire",
    num: 18,
    sourate: "Al-Masad",
    serie: "histoire",
    presetId: "enigme-histoire",
    hook: "Cet homme était de la famille du Prophète ﷺ. Et pourtant.",
    question: "Qui était-il ?",
    options: ["Abu Jahl", "Abu Lahab", "Abu Sufyan"],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "أَبُو لَهَب",
      translation: "ABU LAHAB, SON ONCLE",
    },
    surahLabel: "SOURATE AL-MASAD · 111:1",
    punch: [
      "Même famille. Même sang.",
      "Et une sourate entière porte sa fin.",
    ],
  },
  {
    id: "19-masad-lecon",
    num: 19,
    sourate: "Al-Masad",
    serie: "lecon",
    presetId: "enigme-lecon",
    hook: "« C'est bon, mon cousin me couvrira. »",
    question: "Qu'est-ce qui compte, d'après Al-Masad ?",
    options: ["la famille", "les actes", "la richesse"],
    reponse: 1,
    reveal: {
      label: "CE QUI RESTE",
      arabic: "مَا كَسَب",
      translation: "CE QU'IL A ACQUIS",
    },
    surahLabel: "SOURATE AL-MASAD · 111:2",
    punch: [
      "Ni sa fortune ni sa famille ne l'ont sauvé.",
      "Ni lui, ni toi, ni moi.",
    ],
  },
  {
    id: "20-masad-detail",
    num: 20,
    sourate: "Al-Masad",
    serie: "detail",
    presetId: "enigme-detail",
    hook: "Cette sourate annonce la fin d'un homme… de son vivant.",
    question: "Pourquoi c'est énorme ?",
    options: [
      "il ne l'a jamais entendue",
      "il n'avait qu'à dire « je crois » pour la démentir",
      "elle a été révélée après sa mort",
    ],
    reponse: 1,
    reveal: {
      label: "IL NE L'A JAMAIS FAIT",
      arabic: "تَبَّتْ يَدَا أَبِي لَهَب",
      translation: "SOURATE AL-MASAD",
    },
    surahLabel: "SOURATE AL-MASAD · 111:1-5",
    punch: [
      "Une phrase aurait suffi à contredire le Coran.",
      "Elle n'a jamais été prononcée.",
    ],
  },

  // ─── AN-NASR ───
  {
    id: "21-nasr-mot",
    num: 21,
    sourate: "An-Nasr",
    serie: "mot",
    presetId: "enigme-mot",
    hook: "Un seul mot dit à quelle vitesse les gens sont entrés en Islam.",
    question: "« Afwajan », ça veut dire quoi ?",
    options: ["un par un", "par vagues entières", "en secret"],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "أَفْوَاجًا",
      translation: "PAR GROUPES, PAR VAGUES",
    },
    surahLabel: "SOURATE AN-NASR · 110:2",
    punch: [
      "Pas un par un.",
      "Des foules entières, en même temps.",
    ],
  },
  {
    id: "22-nasr-histoire",
    num: 22,
    sourate: "An-Nasr",
    serie: "histoire",
    presetId: "enigme-histoire",
    hook: "La plus grande victoire — et la sourate ne parle pas de fête.",
    question: "De quoi parle An-Nasr après la victoire ?",
    options: ["de la fête", "du pardon", "du partage"],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "وَاسْتَغْفِرْهُ",
      translation: "ET DEMANDE-LUI PARDON",
    },
    surahLabel: "SOURATE AN-NASR · 110:3",
    punch: [
      "Trois versets pour la plus grande victoire.",
      "Et pas un mot de célébration.",
    ],
  },
  {
    id: "23-nasr-lecon",
    num: 23,
    sourate: "An-Nasr",
    serie: "lecon",
    presetId: "enigme-lecon",
    hook: "Il rentre avec 20/20. Il dit quoi en premier ?",
    question: "Qu'est-ce qu'An-Nasr lui apprend à dire ?",
    options: ["« j'ai réussi »", "« alhamdulillah »", "« c'était facile »"],
    reponse: 1,
    reveal: {
      label: "CE QU'ON DIT",
      arabic: "فَسَبِّحْ بِحَمْدِ رَبِّك",
      translation: "GLORIFIE TON SEIGNEUR PAR LA LOUANGE",
    },
    surahLabel: "SOURATE AN-NASR · 110:3",
    punch: [
      "Réussir sans se vanter.",
      "C'est écrit dans une sourate de trois versets.",
    ],
  },
  {
    id: "24-nasr-detail",
    num: 24,
    sourate: "An-Nasr",
    serie: "detail",
    presetId: "enigme-detail",
    hook: "Au sommet de la victoire, l'ordre donné surprend tout le monde.",
    question: "Quel ordre est donné ?",
    options: ["remercier", "demander pardon", "célébrer"],
    reponse: 1,
    reveal: {
      label: "L'ORDRE",
      arabic: "وَاسْتَغْفِرْه",
      translation: "DEMANDE PARDON",
    },
    surahLabel: "SOURATE AN-NASR · 110:3",
    punch: [
      "Personne n'attend ça à ce moment-là.",
      "Ibn Abbas y a lu autre chose encore (al-Bukhari).",
    ],
  },

  // ─── AL-KAFIRUN ───
  {
    id: "25-kafirun-mot",
    num: 25,
    sourate: "Al-Kafirun",
    serie: "mot",
    presetId: "enigme-mot",
    hook: "Un mot qu'il utilisera toute sa vie, sans le savoir.",
    question: "« Din », dans « lakum dinukum », ça veut dire quoi ?",
    options: ["la maison", "la religion, la voie", "le pays"],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "دِين",
      translation: "LA VOIE, LA RELIGION",
    },
    surahLabel: "SOURATE AL-KAFIRUN · 109:6",
    punch: [
      "« À vous votre voie, à moi la mienne. »",
      "Une phrase pour toute une vie.",
    ],
  },
  {
    id: "26-kafirun-histoire",
    num: 26,
    sourate: "Al-Kafirun",
    serie: "histoire",
    presetId: "enigme-histoire",
    hook: "On a proposé un marché au Prophète ﷺ. Lequel ?",
    question: "Que lui a-t-on proposé ?",
    options: [
      "de l'argent",
      "d'adorer chacun le dieu de l'autre à tour de rôle",
      "de quitter La Mecque",
    ],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "لَا أَعْبُدُ مَا تَعْبُدُون",
      translation: "JE N'ADORE PAS CE QUE VOUS ADOREZ",
    },
    surahLabel: "SOURATE AL-KAFIRUN · 109:2",
    punch: [
      "La sourate entière est un refus.",
      "Ferme, et sans une insulte.",
    ],
  },
  {
    id: "27-kafirun-lecon",
    num: 27,
    sourate: "Al-Kafirun",
    serie: "lecon",
    presetId: "enigme-lecon",
    hook: "« Viens, juste une fois, personne ne le saura. »",
    question: "Al-Kafirun lui apprend à répondre comment ?",
    options: [
      "en se fâchant",
      "avec respect, mais non",
      "en ne répondant pas",
    ],
    reponse: 1,
    reveal: {
      label: "SA RÉPONSE",
      arabic: "لَكُمْ دِينُكُمْ وَلِيَ دِين",
      translation: "À VOUS VOTRE VOIE, À MOI LA MIENNE",
    },
    surahLabel: "SOURATE AL-KAFIRUN · 109:6",
    punch: [
      "On peut être poli et ferme.",
      "Ce n'est pas contradictoire.",
    ],
  },
  {
    id: "28-kafirun-detail",
    num: 28,
    sourate: "Al-Kafirun",
    serie: "detail",
    presetId: "enigme-detail",
    hook: "La même idée est répétée quatre fois. Ce n'est pas un hasard.",
    question: "Pourquoi cette répétition ?",
    options: [
      "pour la mémorisation",
      "pour fermer toutes les portes",
      "pour le rythme",
    ],
    reponse: 1,
    reveal: {
      label: "AUCUNE BRÈCHE",
      arabic: "وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُد",
      translation: "NI VOUS N'ADOREZ CE QUE J'ADORE",
    },
    surahLabel: "SOURATE AL-KAFIRUN · 109:1-6",
    punch: [
      "Le présent, le futur, moi, vous.",
      "Toutes les portes fermées, une par une.",
    ],
  },

  // ─── AL-KAWTHAR ───
  {
    id: "29-kawthar-mot",
    num: 29,
    sourate: "Al-Kawthar",
    serie: "mot",
    presetId: "enigme-mot",
    hook: "Le mot est construit sur l'idée de « beaucoup ». Beaucoup de quoi ?",
    question: "« Al-Kawthar », ça veut dire quoi ?",
    options: ["la patience", "l'abondance immense", "la lumière"],
    reponse: 1,
    reveal: {
      label: "LA RÉPONSE",
      arabic: "الْكَوْثَر",
      translation: "L'ABONDANCE IMMENSE",
    },
    surahLabel: "SOURATE AL-KAWTHAR · 108:1",
    punch: [
      "Tellement immense que le mot lui-même",
      "est bâti sur la racine de « beaucoup ».",
    ],
  },
  {
    id: "30-kawthar-histoire",
    num: 30,
    sourate: "Al-Kawthar",
    serie: "histoire",
    presetId: "enigme-histoire",
    hook: "On a insulté le Prophète ﷺ. Allah a répondu en trois versets.",
    question: "Que lui a-t-on dit ?",
    options: [
      "qu'il était pauvre",
      "qu'il était « abtar », sans avenir",
      "qu'il était seul",
    ],
    reponse: 1,
    reveal: {
      label: "L'INSULTE",
      arabic: "الْأَبْتَر",
      translation: "CELUI QUI EST COUPÉ, SANS POSTÉRITÉ",
    },
    surahLabel: "SOURATE AL-KAWTHAR · 108:3",
    punch: [
      "Ses fils étaient morts.",
      "Et on est venu le lui jeter au visage.",
    ],
  },
  {
    id: "31-kawthar-lecon",
    num: 31,
    sourate: "Al-Kawthar",
    serie: "lecon",
    presetId: "enigme-lecon",
    hook: "On se moque de lui pour ce qu'il n'a pas.",
    question: "Qu'est-ce qu'Al-Kawthar lui répond ?",
    options: [
      "de se venger",
      "que sa valeur n'est pas là",
      "de ne rien dire",
    ],
    reponse: 1,
    reveal: {
      label: "CE QU'IL REÇOIT",
      arabic: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَر",
      translation: "NOUS T'AVONS DONNÉ L'ABONDANCE",
    },
    surahLabel: "SOURATE AL-KAWTHAR · 108:1",
    punch: [
      "Ce qu'on te retire",
      "n'est pas là où se joue ta valeur.",
    ],
  },
  {
    id: "32-kawthar-detail",
    num: 32,
    sourate: "Al-Kawthar",
    serie: "detail",
    presetId: "enigme-detail",
    hook: "La plus courte sourate du Coran. Et la plus grande promesse.",
    question: "Combien de versets contient Al-Kawthar ?",
    options: ["cinq", "trois", "quatre"],
    reponse: 1,
    reveal: {
      label: "TROIS VERSETS",
      arabic: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَر",
      translation: "C'EST TON ENNEMI QUI EST SANS AVENIR",
    },
    surahLabel: "SOURATE AL-KAWTHAR · 108:3",
    punch: [
      "Trois versets. Et l'insulte est retournée",
      "contre celui qui l'avait lancée.",
    ],
  },
];

/** Les épisodes d'une sourate donnée. */
export function episodesForSourate(sourate: SourateName): SourateEpisode[] {
  return MISSION_SOURATES_EPISODES.filter((e) => e.sourate === sourate);
}

/**
 * Construit les cards d'un épisode : applique son preset, puis remplit
 * l'énigme, le reveal, la référence du verset et les phrases fortes.
 * Les cards `feature-list` et `cta` gardent le contenu du preset.
 */
export function applyEpisode(
  episode: SourateEpisode,
  videoDurationSeconds: number,
): ConceptCard[] {
  const preset = TEMPLATE_PRESETS.find((p) => p.id === episode.presetId);
  if (!preset) return [];

  const cards = applyPreset(preset, videoDurationSeconds);

  // Les blocs "custom-text" du preset, dans l'ordre où ils apparaissent.
  const enigmeLines = [
    { text: episode.question, fontSize: 56, color: "teal" as const },
    // Toutes les propositions en cream : la bonne réponse ne doit PAS
    // être identifiable avant le reveal.
    ...episode.options.map((opt, i) => ({
      text: `${i + 1} · ${opt}`,
      fontSize: 48,
      color: "cream" as const,
    })),
  ];
  const punchLines = [
    { text: episode.punch[0], fontSize: 64, color: "gold" as const },
    { text: episode.punch[1], fontSize: 44, color: "cream" as const },
  ];
  const revealLines = [
    { text: episode.reveal.translation, fontSize: 80, color: "gold" as const },
  ];

  const textQueue =
    episode.serie === "histoire"
      ? [enigmeLines, revealLines, punchLines]
      : [enigmeLines, punchLines];
  let textIndex = 0;

  return cards.map((card) => {
    if (card.content.type === "custom-text") {
      const lines = textQueue[textIndex++];
      if (!lines) return card;
      return { ...card, content: { ...card.content, lines } };
    }
    if (card.content.type === "single-word") {
      return {
        ...card,
        content: {
          ...card.content,
          label: episode.reveal.label,
          arabic: episode.reveal.arabic,
          translation: episode.reveal.translation,
        },
      };
    }
    if (card.content.type === "verse") {
      return {
        ...card,
        content: { ...card.content, surahLabel: episode.surahLabel },
      };
    }
    return card;
  });
}
