import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY manquante" },
      { status: 500 },
    );
  }

  const { subtitles, words } = await req.json();

  if (!subtitles || subtitles.length === 0) {
    return NextResponse.json(
      { error: "Pas de sous-titres a corriger" },
      { status: 400 },
    );
  }

  // Build the text with segment indices for mapping back
  const segments = subtitles.map(
    (s: { text: string }, i: number) => `[${i}] ${s.text}`,
  );

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Tu es un correcteur expert de sous-titres generes par Whisper (transcription automatique).

ERREURS FREQUENTES DE WHISPER A CORRIGER:

FRANCAIS:
- Mots coupes ou fusionnes: "aujourdhui" → "aujourd'hui", "cest" → "c'est"
- Homophones: "ses/ces/c'est", "a/à", "ou/où", "et/est"
- Noms propres islamiques mal transcrits: "al fatiha" → "Al-Fatiha", "sourate" correct, "coran" → "Coran"
- Ponctuation manquante: ajouter majuscules en debut de phrase, points, virgules
- Repetitions de mots dues au begaiement ou au decoupage Whisper
- Chiffres et references: "sourate 2 verset 3" bien formatte

ARABE (CRITIQUE — Whisper tronque souvent l'arabe):
- Mots arabes TRONQUES ou COUPES: Whisper coupe souvent les mots arabes en fragments incomplets. Reconstitue le mot arabe COMPLET. Ex: "بسم" tout seul → "بِسْمِ اللَّهِ", "الرحم" → "الرَّحْمَنِ"
- Mots arabes FUSIONNES: separe les mots colles
- TOUJOURS ecrire les mots arabes EN ENTIER, jamais de fragment
- Ajouter le TASHKEEL (voyelles diacritiques) sur TOUS les mots arabes: fatha, kasra, damma, sukun, shadda, tanwin
- Si le contexte est coranique, utilise le texte EXACT du mushaf avec tashkeel complet
- Versets incomplets: si tu reconnais un verset du Coran, ecris-le EN ENTIER avec tashkeel
- Translitteration: "bismillah" → "بِسْمِ اللَّهِ", "al hamdoulillah" → "الْحَمْدُ لِلَّهِ"

REGLES:
- Garde le MEME SENS exact, ne reformule PAS
- Garde le style ORAL naturel (pas de langage soutenu)
- Garde EXACTEMENT ${subtitles.length} segments, meme ordre
- Si un segment est deja correct, renvoie-le tel quel
- Les mots arabes doivent etre COMPLETS et VOYELLES

Reponds UNIQUEMENT avec un tableau JSON de ${subtitles.length} strings corrigees.`,
        },
        {
          role: "user",
          content: `Voici ${subtitles.length} segments de sous-titres Whisper a corriger:\n\n${segments.join("\n")}`,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `OpenAI erreur: ${res.status} - ${text}` },
      { status: 502 },
    );
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "[]";

  try {
    const cleaned = raw
      .replace(/```json?\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const corrected: string[] = JSON.parse(cleaned);

    // Map corrections back to subtitles (keep timings)
    const fixedSubtitles = subtitles.map(
      (s: { start: number; end: number; text: string }, i: number) => ({
        ...s,
        text: corrected[i] ?? s.text,
      }),
    );

    // Update words if we have them — rebuild from corrected text
    let fixedWords = words;
    if (words && words.length > 0) {
      fixedWords = rebuildWords(fixedSubtitles, words);
    }

    return NextResponse.json({
      subtitles: fixedSubtitles,
      words: fixedWords,
    });
  } catch {
    return NextResponse.json(
      { error: "Reponse IA invalide", raw },
      { status: 500 },
    );
  }
}

/** Rebuild word-level data from corrected segments, preserving original timings */
function rebuildWords(
  subtitles: { start: number; end: number; text: string }[],
  originalWords: { word: string; start: number; end: number }[],
) {
  const result: { word: string; start: number; end: number }[] = [];

  for (const seg of subtitles) {
    const segWords = seg.text.split(/\s+/).filter(Boolean);
    // Find original words in this time range
    const origInRange = originalWords.filter(
      (w) => w.start >= seg.start - 0.1 && w.end <= seg.end + 0.1,
    );

    segWords.forEach((word, i) => {
      if (i < origInRange.length) {
        // Reuse original timing, replace text
        result.push({
          word,
          start: origInRange[i].start,
          end: origInRange[i].end,
        });
      } else {
        // Distribute evenly in segment
        const duration = seg.end - seg.start;
        const wordDur = duration / segWords.length;
        result.push({
          word,
          start: Math.round((seg.start + i * wordDur) * 100) / 100,
          end: Math.round((seg.start + (i + 1) * wordDur) * 100) / 100,
        });
      }
    });
  }

  return result;
}
