import { NextResponse } from "next/server";
import { getUser } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!(await getUser())) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY manquante" },
      { status: 500 },
    );
  }

  const { transcript, style } = await req.json();
  if (!transcript) {
    return NextResponse.json({ error: "Pas de transcript" }, { status: 400 });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: `Tu generes des descriptions et hashtags optimises pour les reseaux sociaux.
Le contenu est educatif islamique pour enfants (marque Fitra Kids).
Style: ${style || "educatif"}

Genere pour chaque plateforme:
- YouTube Shorts: titre accrocheur + description + 10 hashtags
- Instagram Reels: legende engageante + 20 hashtags (mix populaires + niche)
- TikTok: texte court + 5-8 hashtags tendance

Reponds en JSON:
{
  "youtube": { "title": "...", "description": "...", "hashtags": ["..."] },
  "instagram": { "caption": "...", "hashtags": ["..."] },
  "tiktok": { "caption": "...", "hashtags": ["..."] }
}`,
        },
        { role: "user", content: `Transcript:\n${transcript}` },
      ],
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erreur OpenAI" }, { status: 502 });
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  try {
    const cleaned = raw
      .replace(/```json?\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch {
    return NextResponse.json(
      { error: "Reponse invalide", raw },
      { status: 500 },
    );
  }
}
