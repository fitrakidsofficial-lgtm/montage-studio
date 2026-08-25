import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY manquante" },
      { status: 500 },
    );
  }

  const { transcript } = await req.json();
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
          content: `Tu analyses un transcript video et tu determines le meilleur template de montage.

Templates disponibles:
- "racine-arabe": contenu educatif sur une racine arabe (racine, mot, verset, famille)
- "racine-complete": version longue educative (racine, 3 mots, 2 versets, famille)
- "promo-standard": video promotionnelle (prix, features, CTA)
- "promo-campagne": campagne urgente (annonce, features, CTA)
- "broll-simple": video simple avec sous-titres seulement
- "broll-educatif": video avec quelques cards educatives

Criteres:
- Si le transcript parle de racines arabes, lettres, famille de mots → racine-arabe ou racine-complete
- Si le transcript est long (>2min de contenu) avec beaucoup de mots arabes → racine-complete
- Si le transcript parle de prix, produit, offre, promotion → promo-standard
- Si le transcript a un ton urgent, inscription, places limitees → promo-campagne
- Si le transcript est simple sans contenu structure → broll-simple
- Si le transcript a du contenu educatif mais pas de racine → broll-educatif

Reponds UNIQUEMENT avec un JSON: {"templateId": "...", "reason": "..."}`,
        },
        { role: "user", content: `Transcript:\n${transcript}` },
      ],
      temperature: 0.1,
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
    return NextResponse.json({
      templateId: "broll-simple",
      reason: "Fallback",
    });
  }
}
