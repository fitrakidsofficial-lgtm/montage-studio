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

  const {
    subject,
    format = "carrousel",
    profile,
    slidesCount = 7,
  } = await req.json();

  if (!subject) {
    return NextResponse.json({ error: "subject requis" }, { status: 400 });
  }

  const sector = profile?.customSector || profile?.sector || "";
  const style = profile?.style || "bienveillant";
  const tone = profile?.tone === "vous" ? "vouvoiement" : "tutoiement";
  const keywords = (profile?.keywords || []).join(", ");

  const prompt = `Tu es un expert en creation de contenu Instagram.

CONTEXTE CREATEUR :
- Secteur : ${sector || "Non precise"}
- Style : ${style}
- Ton : ${tone}
${keywords ? `- Mots-cles : ${keywords}` : ""}

MISSION : Genere une sequence de ${slidesCount} slides pour un ${format} Instagram sur le sujet :
"${subject}"

REGLES :
- Slide 1 = HOOK (accroche percutante qui donne envie de swiper)
- Slides 2 a ${slidesCount - 1} = CONTENU (valeur, etapes, conseils, revelations)
- Derniere slide = CTA (appel a l'action clair)
- Chaque slide : texte court (max 30 mots), impactant
- Utilise le ${tone}
- Style ${style}

Genere aussi :
- Une caption Instagram complete (avec emojis et hashtags)
- 10 hashtags pertinents

Reponds en JSON strict :
{
  "hook": "la premiere phrase d'accroche",
  "cta": "le CTA de la derniere slide",
  "slides": [
    {
      "slideNumber": 1,
      "text": "texte principal de la slide",
      "subtext": "sous-texte optionnel (explication courte)"
    }
  ],
  "caption": "la caption Instagram complete",
  "hashtags": ["hashtag1", "hashtag2"]
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
        temperature: 0.8,
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

    const sequence = {
      id: `seq-${Date.now()}`,
      subject,
      hook: parsed.hook || "",
      cta: parsed.cta || "",
      format,
      slides: (parsed.slides || []).map(
        (s: Record<string, unknown>, i: number) => ({
          id: `slide-${Date.now()}-${i}`,
          slideNumber: i + 1,
          text: s.text || "",
          subtext: s.subtext || "",
          color: "#2E7D6C",
          fontSize: 48,
        }),
      ),
      caption: parsed.caption || "",
      hashtags: parsed.hashtags || [],
      createdAt: Date.now(),
    };

    return NextResponse.json({ sequence });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
