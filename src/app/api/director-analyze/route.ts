import { NextResponse } from "next/server";

export const maxDuration = 60;

interface DirectorDecision {
  time: number;
  duration: number;
  action:
    | "zoom"
    | "broll"
    | "jump-cut"
    | "texte-cle"
    | "pattern-interrupt"
    | "plan-principal";
  intensity?: number;
  keyword?: string;
  text?: string;
  reason: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY manquante" },
      { status: 500 },
    );
  }

  const { subtitles, words, duration, style } = await req.json();

  if (!subtitles || subtitles.length === 0) {
    return NextResponse.json({ error: "Pas de sous-titres" }, { status: 400 });
  }

  const segments = subtitles
    .map(
      (s: { start: number; end: number; text: string }, i: number) =>
        `[${s.start.toFixed(1)}s-${s.end.toFixed(1)}s] ${s.text}`,
    )
    .join("\n");

  // Detect silence gaps from words
  const silenceGaps: string[] = [];
  if (words && words.length > 1) {
    for (let i = 1; i < words.length; i++) {
      const gap = words[i].start - words[i - 1].end;
      if (gap > 1.5) {
        silenceGaps.push(
          `Silence: ${words[i - 1].end.toFixed(1)}s-${words[i].start.toFixed(1)}s (${gap.toFixed(1)}s)`,
        );
      }
    }
  }

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
          content: `Tu es un realisateur expert en montage de videos courtes (Reels/Shorts/TikTok).
Tu analyses un transcript avec timecodes et decides quels effets de montage appliquer a chaque moment.

REGLES DE RYTHME:
- Pattern interrupt toutes les 8-12 secondes pour maintenir l'attention
- Ne JAMAIS mettre 2 effets identiques consecutifs
- Les zooms doivent tomber sur des mots-cles ou des moments d'emphase, PAS a intervalles fixes
- Les B-rolls illustrent des concepts concrets mentionnes dans la parole
- Les jump-cuts eliminent les hesitations et silences
- Les textes-cles affichent 1-3 mots importants en grand
- "plan-principal" = laisser la video telle quelle (visage qui parle)

ACTIONS DISPONIBLES:
- "zoom": reframe/zoom sur le visage (intensity: 1.1-1.3)
- "broll": inserer une image/video illustrative (keyword: mot-cle anglais pour Pexels)
- "jump-cut": couper un silence ou une hesitation
- "texte-cle": afficher un mot/phrase important en overlay (text: le texte)
- "pattern-interrupt": changement visuel pour relancer l'attention
- "plan-principal": ne rien faire, laisser le plan actuel

Style de la video: ${style}
Duree totale: ${duration}s

Reponds UNIQUEMENT avec un tableau JSON de decisions. Chaque decision:
{ "time": number, "duration": number, "action": string, "intensity?": number, "keyword?": string, "text?": string, "reason": string }

Objectif: un montage dynamique sans etre surchage. 6-10 decisions pour une video de 60s.`,
        },
        {
          role: "user",
          content: `Transcript avec timecodes:\n${segments}${silenceGaps.length > 0 ? `\n\nSilences detectes:\n${silenceGaps.join("\n")}` : ""}`,
        },
      ],
      temperature: 0.3,
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
    const decisions: DirectorDecision[] = JSON.parse(cleaned);

    return NextResponse.json({ decisions });
  } catch {
    return NextResponse.json(
      { error: "Reponse IA invalide", raw },
      { status: 500 },
    );
  }
}
