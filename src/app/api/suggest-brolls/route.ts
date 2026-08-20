import { NextResponse } from "next/server";

interface BrollSuggestion {
  keyword: string;
  startTime: number;
  endTime: number;
  reason: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY manquante" },
      { status: 500 },
    );
  }

  const { subtitles, duration } = await req.json();
  if (!subtitles || subtitles.length === 0) {
    return NextResponse.json(
      { error: "Pas de sous-titres pour analyser" },
      { status: 400 },
    );
  }

  const transcript = subtitles
    .map(
      (s: { start: number; text: string }) =>
        `[${s.start.toFixed(1)}s] ${s.text}`,
    )
    .join("\n");

  // Step 1: GPT suggests b-roll moments + keywords
  const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu analyses un transcript video et tu suggeres des b-rolls (images d'illustration) a inserer.
Pour chaque moment cle, donne:
- Un mot-cle de recherche en ANGLAIS (pour Pexels: nature, mosque, quran, desert, sunset, prayer, family, etc.)
- Le timing (debut/fin en secondes)
- La raison

Choisis 3-5 moments maximum. Pas trop de b-rolls.
Reponds UNIQUEMENT en JSON: [{"keyword":"...","startTime":X,"endTime":Y,"reason":"..."},...]`,
        },
        {
          role: "user",
          content: `Video de ${duration}s. Transcript:\n${transcript}`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!gptRes.ok) {
    const text = await gptRes.text();
    return NextResponse.json(
      { error: `OpenAI erreur: ${gptRes.status} - ${text}` },
      { status: 502 },
    );
  }

  const gptData = await gptRes.json();
  const raw = gptData.choices?.[0]?.message?.content ?? "[]";

  let suggestions: BrollSuggestion[];
  try {
    const cleaned = raw
      .replace(/```json?\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    suggestions = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "Reponse IA invalide", raw },
      { status: 500 },
    );
  }

  // Step 2: Search Pexels for each keyword (images + videos)
  const results = await Promise.all(
    suggestions.map(async (s) => {
      const [images, videos] = await Promise.all([
        searchPexelsImages(s.keyword, pexelsKey),
        searchPexelsVideos(s.keyword, pexelsKey),
      ]);
      return { ...s, images, videos };
    }),
  );

  return NextResponse.json({ suggestions: results });
}

interface PexelsMedia {
  id: number;
  url: string;
  thumb: string;
  photographer: string;
  type: "image" | "video";
}

async function searchPexelsImages(
  query: string,
  apiKey: string | undefined,
): Promise<PexelsMedia[]> {
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos ?? []).map(
      (p: {
        id: number;
        src: { medium: string; tiny: string };
        photographer: string;
      }) => ({
        id: p.id,
        url: p.src.medium,
        thumb: p.src.tiny,
        photographer: p.photographer,
        type: "image" as const,
      }),
    );
  } catch {
    return [];
  }
}

async function searchPexelsVideos(
  query: string,
  apiKey: string | undefined,
): Promise<PexelsMedia[]> {
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.videos ?? []).map(
      (v: {
        id: number;
        image: string;
        video_files: { link: string; quality: string; width: number }[];
        user: { name: string };
      }) => {
        // Pick SD quality file for b-roll (smaller, faster)
        const file =
          v.video_files.find((f) => f.quality === "sd" && f.width <= 720) ??
          v.video_files[0];
        return {
          id: v.id,
          url: file?.link ?? "",
          thumb: v.image,
          photographer: v.user.name,
          type: "video" as const,
        };
      },
    );
  } catch {
    return [];
  }
}
