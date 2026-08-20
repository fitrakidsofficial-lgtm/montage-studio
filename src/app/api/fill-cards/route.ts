import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY manquante" },
      { status: 500 },
    );
  }

  const { transcript, templateId, cardTypes } = await req.json();

  if (!transcript || !cardTypes || cardTypes.length === 0) {
    return NextResponse.json(
      { error: "transcript et cardTypes requis" },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(transcript, templateId, cardTypes);

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
          content: `Tu es un linguiste arabe specialise dans le contenu educatif islamique.
Tu extrais du transcript les informations demandees pour remplir des cards de montage video.

REGLES STRICTES:
- Reponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires
- Pour l'arabe, utilise l'ecriture arabe avec les voyelles completes (tashkeel/harakat)
- Si une info n'est pas dans le transcript, laisse le champ vide ""
- N'INVENTE RIEN: extrait uniquement ce qui est dit dans le transcript
- Pour les familles de mots: verifie que chaque mot partage REELLEMENT la meme racine trilittere arabe
- Ne confonds pas des mots qui se ressemblent phonetiquement mais qui ont des racines differentes`,
        },
        { role: "user", content: prompt },
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
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/```json?\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const cards = JSON.parse(cleaned);
    return NextResponse.json({ cards });
  } catch {
    return NextResponse.json(
      { error: "Reponse IA invalide", raw },
      { status: 500 },
    );
  }
}

function buildPrompt(
  transcript: string,
  templateId: string,
  cardTypes: { index: number; type: string }[],
): string {
  const typeInstructions: Record<string, string> = {
    "root-letters": `{
  "type": "root-letters",
  "label": "LA RACINE",
  "letters": ["lettre1", "lettre2", "lettre3"]
}
Extrais les 3 lettres racines arabes mentionnees dans le transcript.`,

    "single-word": `{
  "type": "single-word",
  "label": "UN MOT DE LA RACINE",
  "arabic": "mot arabe avec voyelles",
  "translation": "TRADUCTION EN MAJUSCULES"
}
Extrais un mot arabe de la racine et sa traduction.`,

    verse: `{
  "type": "verse",
  "surahLabel": "SOURATE NOM \u00B7 numero:verset",
  "arabic": "texte arabe du verset",
  "translation": "traduction francaise"
}
Extrais le verset coranique mentionne.`,

    "family-recap": `{
  "type": "family-recap",
  "label": "UNE MEME FAMILLE",
  "rootLetters": "x x x",
  "words": [{"arabic": "mot1", "translation": "trad1"}, ...]
}
Extrais UNIQUEMENT les mots qui partagent la MEME RACINE arabe (meme 3 lettres racines).
ATTENTION: ne mets que des mots explicitement mentionnes dans le transcript ET qui derivent reellement de la meme racine trilittere.
Si un mot n'est pas de la meme racine, NE L'INCLUS PAS meme s'il est mentionne dans le transcript.
2-4 mots maximum.`,

    "price-tag": `{
  "type": "price-tag",
  "headline": "TITRE DU PRODUIT",
  "price": "prix",
  "subtitle": "sous-titre"
}
Extrais le produit, le prix et le sous-titre.`,

    "feature-list": `{
  "type": "feature-list",
  "title": "TITRE",
  "features": ["feature1", "feature2", ...]
}
Extrais la liste des fonctionnalites/avantages mentionnes.`,

    cta: `{
  "type": "cta",
  "mainText": "TEXTE PRINCIPAL",
  "subText": "sous-texte"
}
Extrais l'appel a l'action final.`,

    "custom-text": `{
  "type": "custom-text",
  "lines": [{"text": "TEXTE", "fontSize": 72, "color": "gold"}]
}
Extrais le message cle / conclusion.`,
  };

  const cardRequests = cardTypes
    .map((ct) => {
      const inst = typeInstructions[ct.type] || typeInstructions["custom-text"];
      return `Card ${ct.index} (type: ${ct.type}):\n${inst}`;
    })
    .join("\n\n");

  return `Voici le transcript d'une video (template: ${templateId}):

---
${transcript}
---

Remplis chaque card avec le contenu extrait du transcript.
Reponds avec un tableau JSON de ${cardTypes.length} objets, un par card, dans l'ordre:

${cardRequests}

Reponds UNIQUEMENT avec le tableau JSON.`;
}
