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
          content: `Tu analyses un transcript video et tu proposes les 3 meilleurs templates de montage, classes du plus adapte au moins adapte.

Templates disponibles:
- "racine-arabe": contenu educatif sur une racine arabe (racine, mot, verset, famille) — 5 cards
- "racine-complete": version longue educative (racine, 3 mots, 2 versets, famille) — 8 cards
- "promo-standard": video promotionnelle (prix, features, CTA) — 4 cards
- "promo-campagne": campagne urgente (annonce, features, CTA inscription) — 3 cards
- "broll-simple": video simple avec sous-titres seulement — 0 cards
- "broll-educatif": video avec quelques cards educatives (racine, verset, famille) — 3 cards
- "enigme-mot": serie Mission Sourates — enigme sur le sens d'un mot arabe, 3 propositions, tic-tac, reveal — 5 cards
- "enigme-histoire": serie Mission Sourates — histoire/contexte de revelation d'une sourate, enigme puis recit — 5 cards
- "enigme-lecon": serie Mission Sourates — situation du quotidien de l'enfant reliee a une sourate — 5 cards
- "enigme-detail": serie Mission Sourates — le detail qui surprend le parent, verset a l'appui — 5 cards
- "cta-mission": clip de fin reutilisable (4 briques de la plateforme + mot-cle MISSION) — 2 cards

Criteres:
- Racines arabes, lettres, famille de mots → racine-arabe ou racine-complete
- Transcript long (>2min) avec beaucoup de mots arabes → racine-complete
- Prix, produit, offre, promotion → promo-standard
- Ton urgent, inscription, places limitees → promo-campagne
- Simple sans contenu structure → broll-simple
- Contenu educatif sans racine arabe → broll-educatif
- Question posee au spectateur, compte a rebours, tic-tac, "devine", "reponse dans 3 2 1" → une des enigme-*
- Enigme sur le sens d'un mot arabe → enigme-mot
- Recit du contexte de revelation, histoire d'une sourate → enigme-histoire
- Situation concrete d'enfant (ecole, jalousie, moquerie) reliee a une sourate → enigme-lecon
- Detail surprenant adresse au parent, "personne ne remarque" → enigme-detail
- Video courte uniquement d'appel a l'action vers la plateforme → cta-mission

Reponds UNIQUEMENT avec un JSON:
{
  "suggestions": [
    { "templateId": "...", "reason": "...", "confidence": 0.95 },
    { "templateId": "...", "reason": "...", "confidence": 0.6 },
    { "templateId": "...", "reason": "...", "confidence": 0.3 }
  ]
}

"reason" doit etre court (1 phrase), en francais.
"confidence" entre 0 et 1.
Toujours retourner exactement 3 suggestions differentes.`,
        },
        { role: "user", content: `Transcript:\n${transcript}` },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
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
    const parsed = JSON.parse(cleaned);

    // Support both old format (templateId) and new format (suggestions)
    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      return NextResponse.json(parsed);
    }
    // Fallback: old single-template format → wrap in suggestions
    return NextResponse.json({
      suggestions: [
        {
          templateId: parsed.templateId || "broll-simple",
          reason: parsed.reason || "Fallback",
          confidence: 1,
        },
      ],
    });
  } catch {
    return NextResponse.json({
      suggestions: [
        { templateId: "broll-simple", reason: "Fallback", confidence: 1 },
      ],
    });
  }
}
