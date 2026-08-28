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

  const { profile, count = 5 } = await req.json();

  if (!profile?.sector && !profile?.customSector) {
    return NextResponse.json(
      { error: "Profil requis (au moins un secteur)" },
      { status: 400 },
    );
  }

  const sector = profile.customSector || profile.sector;
  const style = profile.style || "bienveillant";
  const tone = profile.tone === "vous" ? "vouvoiement" : "tutoiement";
  const keywords = (profile.keywords || []).join(", ");

  const prompt = `Tu es un expert en strategie de contenu Instagram.

Profil du createur :
- Secteur : ${sector}
- Style : ${style}
- Ton : ${tone}
- Bio : ${profile.bio || "Non renseignee"}
${keywords ? `- Mots-cles a integrer : ${keywords}` : ""}

Genere ${count} idees de contenu Instagram. Pour chaque idee, recommande le meilleur format avec un score.

FORMATS possibles :
- carrousel (score 1-5) : ideal pour eduquer, listes, etapes
- reel (score 1-5) : ideal pour capter l'attention, tendances
- story (score 1-5) : ideal pour proximite, quotidien, sondages
- image (score 1-5) : ideal pour citations, annonces

OBJECTIFS possibles : engagement, visibilite, conversion, communaute, autorite

Reponds en JSON strict :
{
  "topics": [
    {
      "subject": "le sujet",
      "hook": "l'accroche (premiere phrase qui capte)",
      "format": "carrousel",
      "formatScore": 5,
      "objective": "engagement",
      "reason": "pourquoi ce format est le meilleur pour ce sujet"
    }
  ]
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Pas de reponse de l'IA" },
        { status: 500 },
      );
    }

    const parsed = JSON.parse(content);
    const topics = (parsed.topics || []).map(
      (t: Record<string, unknown>, i: number) => ({
        id: `topic-${Date.now()}-${i}`,
        ...t,
      }),
    );

    return NextResponse.json({ topics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
