import { NextResponse } from "next/server";

interface BrollSuggestion {
  keyword: string;
  startTime: number;
  endTime: number;
  reason: string;
}

interface DirectorKeyword {
  keyword: string;
  startTime: number;
  endTime: number;
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

  const { subtitles, duration, directorKeywords } = await req.json();
  if (!subtitles || subtitles.length === 0) {
    return NextResponse.json(
      { error: "Pas de sous-titres pour analyser" },
      { status: 400 },
    );
  }

  let suggestions: BrollSuggestion[];

  // If Director already provided keywords, use them directly
  if (directorKeywords && directorKeywords.length > 0) {
    suggestions = (directorKeywords as DirectorKeyword[]).map((dk) => ({
      keyword: dk.keyword,
      startTime: dk.startTime,
      endTime: dk.endTime,
      reason: "Suggere par le Director IA",
    }));
  } else {
    // Fallback: GPT suggests b-roll moments + keywords
    const transcript = subtitles
      .map(
        (s: { start: number; text: string }) =>
          `[${s.start.toFixed(1)}s] ${s.text}`,
      )
      .join("\n");

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
  }

  // Search Pexels for each keyword (images + videos) with scoring
  const results = await Promise.all(
    suggestions.map(async (s) => {
      const [images, videos] = await Promise.all([
        searchPexelsImages(s.keyword, pexelsKey),
        searchPexelsVideos(s.keyword, pexelsKey),
      ]);
      // Sort by score (best first)
      images.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      videos.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
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
  score?: number;
}

function scoreMedia(media: {
  width?: number;
  height?: number;
  duration?: number;
  type: "image" | "video";
}): number {
  let score = 0;
  // Portrait orientation preferred for 1080x1920
  if (media.width && media.height && media.height > media.width) score += 30;
  // Resolution quality
  if (media.width && media.width >= 1080) score += 20;
  // Video duration sweet spot (3-8s for b-roll)
  if (media.type === "video" && media.duration) {
    if (media.duration >= 3 && media.duration <= 8) score += 15;
    else if (media.duration >= 2 && media.duration <= 12) score += 8;
  }
  // Videos slightly preferred over images (more dynamic)
  if (media.type === "video") score += 10;
  return score;
}

async function searchPexelsImages(
  query: string,
  apiKey: string | undefined,
): Promise<PexelsMedia[]> {
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=portrait`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos ?? []).map(
      (p: {
        id: number;
        width: number;
        height: number;
        src: { medium: string; tiny: string };
        photographer: string;
      }) => ({
        id: p.id,
        url: p.src.medium,
        thumb: p.src.tiny,
        photographer: p.photographer,
        type: "image" as const,
        score: scoreMedia({
          width: p.width,
          height: p.height,
          type: "image",
        }),
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
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=8&orientation=portrait`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.videos ?? []).map(
      (v: {
        id: number;
        width: number;
        height: number;
        duration: number;
        image: string;
        video_files: { link: string; quality: string; width: number }[];
        user: { name: string };
      }) => {
        const file =
          v.video_files.find((f) => f.quality === "sd" && f.width <= 720) ??
          v.video_files[0];
        return {
          id: v.id,
          url: file?.link ?? "",
          thumb: v.image,
          photographer: v.user.name,
          type: "video" as const,
          score: scoreMedia({
            width: v.width,
            height: v.height,
            duration: v.duration,
            type: "video",
          }),
        };
      },
    );
  } catch {
    return [];
  }
}
