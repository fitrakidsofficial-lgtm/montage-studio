"use client";

import { useState } from "react";
import type {
  ConceptCard,
  ConceptCardContent,
  OpinionChoiceContent,
  OpinionChoiceOption,
} from "@/lib/types";

interface Props {
  cards: ConceptCard[];
  onChange: (cards: ConceptCard[]) => void;
}

const CARD_TYPES = [
  { id: "root-letters", label: "Lettres racine" },
  { id: "single-word", label: "Mot arabe" },
  { id: "verse", label: "Verset" },
  { id: "family-recap", label: "Famille de mots" },
  { id: "price-tag", label: "Prix" },
  { id: "feature-list", label: "Liste features" },
  { id: "cta", label: "Call to action" },
  { id: "custom-text", label: "Texte libre" },
  { id: "opinion-choice", label: "Avis communauté" },
] as const;

function defaultContent(type: ConceptCardContent["type"]): ConceptCardContent {
  switch (type) {
    case "root-letters":
      return { type, label: "LA RACINE", letters: ["", "", ""] };
    case "single-word":
      return {
        type,
        label: "UN MOT DE LA RACINE",
        arabic: "",
        translation: "",
      };
    case "verse":
      return { type, surahLabel: "", arabic: "", translation: "" };
    case "family-recap":
      return {
        type,
        label: "LA FAMILLE",
        words: [{ arabic: "", translation: "" }],
      };
    case "price-tag":
      return { type, headline: "", price: "", subtitle: "" };
    case "feature-list":
      return { type, title: "TOUT EST INCLUS", features: [""] };
    case "cta":
      return { type, mainText: "", subText: "" };
    case "custom-text":
      return {
        type,
        lines: [{ text: "", fontSize: 72, color: "cream" as const }],
      };
    case "opinion-choice":
      return {
        type,
        mode: "ab" as const,
        eyebrow: "J'AI BESOIN DE TON AVIS",
        question: "QUELLE VERSION TU PRÉFÈRES ?",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        cta: "A OU B ? ÉCRIS TA RÉPONSE EN COMMENTAIRE",
        footerText:
          "La version gagnante sera utilisée dans le livret Mission Sourates.",
        revealMode: "sequential" as const,
      };
  }
}

function CardForm({
  card,
  onUpdate,
  onDelete,
}: {
  card: ConceptCard;
  onUpdate: (c: ConceptCard) => void;
  onDelete: () => void;
}) {
  const c = card.content;

  const updateField = (field: string, value: string | number) => {
    onUpdate({
      ...card,
      content: { ...card.content, [field]: value } as ConceptCardContent,
    });
  };

  return (
    <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-amber-400 font-bold uppercase">
          {CARD_TYPES.find((t) => t.id === c.type)?.label}
        </span>
        <button
          onClick={onDelete}
          className="text-red-400 text-xs hover:text-red-300"
        >
          Supprimer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-zinc-500">Debut (s)</label>
          <input
            type="number"
            step="0.1"
            value={card.startTime}
            onChange={(e) =>
              onUpdate({ ...card, startTime: parseFloat(e.target.value) || 0 })
            }
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500">Fin (s)</label>
          <input
            type="number"
            step="0.1"
            value={card.endTime}
            onChange={(e) =>
              onUpdate({ ...card, endTime: parseFloat(e.target.value) || 0 })
            }
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>
      </div>

      {c.type === "root-letters" && (
        <>
          <input
            value={c.label}
            onChange={(e) => updateField("label", e.target.value)}
            placeholder="Titre (ex: LA RACINE)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
          <div className="flex gap-2">
            {c.letters.map((l, i) => (
              <input
                key={i}
                value={l}
                onChange={(e) => {
                  const newLetters = [...c.letters];
                  newLetters[i] = e.target.value;
                  onUpdate({
                    ...card,
                    content: { ...c, letters: newLetters },
                  });
                }}
                placeholder={`Lettre ${i + 1}`}
                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-center text-xl"
                dir="rtl"
              />
            ))}
          </div>
        </>
      )}

      {c.type === "single-word" && (
        <>
          <input
            value={c.label}
            onChange={(e) => updateField("label", e.target.value)}
            placeholder="Titre"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
          <input
            value={c.arabic}
            onChange={(e) => updateField("arabic", e.target.value)}
            placeholder="Texte arabe"
            dir="rtl"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-lg text-white"
          />
          <input
            value={c.translation}
            onChange={(e) => updateField("translation", e.target.value)}
            placeholder="Traduction"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </>
      )}

      {c.type === "verse" && (
        <>
          <input
            value={c.surahLabel}
            onChange={(e) => updateField("surahLabel", e.target.value)}
            placeholder="Sourate (ex: SOURATE AL-FATIHA)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
          <textarea
            value={c.arabic}
            onChange={(e) => updateField("arabic", e.target.value)}
            placeholder="Verset en arabe"
            dir="rtl"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-lg text-white h-20"
          />
          <input
            value={c.translation}
            onChange={(e) => updateField("translation", e.target.value)}
            placeholder="Traduction"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </>
      )}

      {c.type === "price-tag" && (
        <>
          <input
            value={c.headline}
            onChange={(e) => updateField("headline", e.target.value)}
            placeholder="Titre (ex: 8 SOURATES)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
          <input
            value={c.price}
            onChange={(e) => updateField("price", e.target.value)}
            placeholder="Prix (ex: 49 euros)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
          <input
            value={c.subtitle}
            onChange={(e) => updateField("subtitle", e.target.value)}
            placeholder="Sous-titre"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </>
      )}

      {c.type === "cta" && (
        <>
          <input
            value={c.mainText}
            onChange={(e) => updateField("mainText", e.target.value)}
            placeholder="Texte principal"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
          <input
            value={c.subText}
            onChange={(e) => updateField("subText", e.target.value)}
            placeholder="Sous-texte"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
        </>
      )}

      {c.type === "feature-list" && (
        <>
          <input
            value={c.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Titre"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
          {c.features.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={f}
                onChange={(e) => {
                  const newFeatures = [...c.features];
                  newFeatures[i] = e.target.value;
                  onUpdate({
                    ...card,
                    content: { ...c, features: newFeatures },
                  });
                }}
                placeholder={`Feature ${i + 1}`}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
              />
              {c.features.length > 1 && (
                <button
                  onClick={() => {
                    const newFeatures = c.features.filter((_, fi) => fi !== i);
                    onUpdate({
                      ...card,
                      content: { ...c, features: newFeatures },
                    });
                  }}
                  className="text-red-400 text-xs"
                >
                  X
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              onUpdate({
                ...card,
                content: { ...c, features: [...c.features, ""] },
              });
            }}
            className="text-amber-400 text-xs"
          >
            + Ajouter feature
          </button>
        </>
      )}

      {c.type === "family-recap" && (
        <>
          <input
            value={c.label}
            onChange={(e) => updateField("label", e.target.value)}
            placeholder="Titre"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          />
          {c.words.map((w, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={w.arabic}
                onChange={(e) => {
                  const newWords = [...c.words];
                  newWords[i] = { ...w, arabic: e.target.value };
                  onUpdate({ ...card, content: { ...c, words: newWords } });
                }}
                placeholder="Arabe"
                dir="rtl"
                className="w-1/2 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
              />
              <input
                value={w.translation}
                onChange={(e) => {
                  const newWords = [...c.words];
                  newWords[i] = { ...w, translation: e.target.value };
                  onUpdate({ ...card, content: { ...c, words: newWords } });
                }}
                placeholder="Traduction"
                className="w-1/2 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
              />
            </div>
          ))}
          <button
            onClick={() => {
              onUpdate({
                ...card,
                content: {
                  ...c,
                  words: [...c.words, { arabic: "", translation: "" }],
                },
              });
            }}
            className="text-amber-400 text-xs"
          >
            + Ajouter mot
          </button>
        </>
      )}

      {c.type === "custom-text" && (
        <>
          {c.lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={line.text}
                onChange={(e) => {
                  const newLines = [...c.lines];
                  newLines[i] = { ...line, text: e.target.value };
                  onUpdate({ ...card, content: { ...c, lines: newLines } });
                }}
                placeholder="Texte"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
              />
              <select
                value={line.color}
                onChange={(e) => {
                  const newLines = [...c.lines];
                  newLines[i] = {
                    ...line,
                    color: e.target.value as
                      | "cream"
                      | "gold"
                      | "orange"
                      | "teal",
                  };
                  onUpdate({ ...card, content: { ...c, lines: newLines } });
                }}
                className="bg-zinc-900 border border-zinc-700 rounded px-1 py-1 text-xs text-white"
              >
                <option value="cream">Cream</option>
                <option value="gold">Gold</option>
                <option value="orange">Orange</option>
                <option value="teal">Teal</option>
              </select>
            </div>
          ))}
          <button
            onClick={() => {
              onUpdate({
                ...card,
                content: {
                  ...c,
                  lines: [
                    ...c.lines,
                    { text: "", fontSize: 72, color: "cream" as const },
                  ],
                },
              });
            }}
            className="text-amber-400 text-xs"
          >
            + Ajouter ligne
          </button>
        </>
      )}

      {c.type === "opinion-choice" && (
        <OpinionChoiceForm card={card} content={c} onUpdate={onUpdate} />
      )}
    </div>
  );
}

function OpinionChoiceForm({
  card,
  content,
  onUpdate,
}: {
  card: ConceptCard;
  content: OpinionChoiceContent;
  onUpdate: (c: ConceptCard) => void;
}) {
  const patch = (fields: Partial<OpinionChoiceContent>) => {
    onUpdate({
      ...card,
      content: { ...content, ...fields } as ConceptCardContent,
    });
  };

  const updateOption = (
    index: number,
    fields: Partial<OpinionChoiceOption>,
  ) => {
    const newOptions = [...content.options];
    newOptions[index] = { ...newOptions[index], ...fields };
    patch({ options: newOptions });
  };

  const handleImageSelect = (index: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      updateOption(index, { imageUrl: url });
    };
    input.click();
  };

  return (
    <>
      <div>
        <label className="text-xs text-zinc-500">Mode</label>
        <select
          value={content.mode}
          onChange={(e) => {
            const mode = e.target.value as OpinionChoiceContent["mode"];
            let options = content.options;
            if (mode === "abc" && options.length < 3) {
              options = [...options, { id: "c", label: "C" }];
            } else if (
              (mode === "ab" || mode === "avec-sans") &&
              options.length > 2
            ) {
              options = options.slice(0, 2);
            }
            if (mode === "avec-sans") {
              options = options.map((o, i) => ({
                ...o,
                label: i === 0 ? "AVEC" : "SANS",
              }));
            }
            patch({ mode, options });
          }}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
        >
          <option value="ab">A ou B</option>
          <option value="abc">A, B ou C</option>
          <option value="avec-sans">Avec ou sans</option>
          <option value="resultat">Résultat du vote</option>
        </select>
      </div>

      <input
        value={content.eyebrow}
        onChange={(e) => patch({ eyebrow: e.target.value })}
        placeholder="Accroche (ex: J'AI BESOIN DE TON AVIS)"
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
      />

      <input
        value={content.question}
        onChange={(e) => patch({ question: e.target.value })}
        placeholder="Question principale"
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
      />

      <input
        value={content.cta}
        onChange={(e) => patch({ cta: e.target.value })}
        placeholder="CTA (appel à l'action)"
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
      />

      <input
        value={content.footerText || ""}
        onChange={(e) => patch({ footerText: e.target.value })}
        placeholder="Texte secondaire (optionnel)"
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
      />

      <div>
        <label className="text-xs text-zinc-500">Révélation</label>
        <select
          value={content.revealMode}
          onChange={(e) =>
            patch({
              revealMode: e.target.value as "simultaneous" | "sequential",
            })
          }
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
        >
          <option value="sequential">Séquentielle (une par une)</option>
          <option value="simultaneous">Simultanée (toutes ensemble)</option>
        </select>
      </div>

      <div className="space-y-2 pt-2 border-t border-zinc-700">
        <span className="text-xs font-bold text-zinc-400 uppercase">
          Options
        </span>
        {content.options.map((opt, i) => (
          <div key={opt.id} className="bg-zinc-900 rounded-lg p-3 space-y-2">
            <input
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value })}
              placeholder={`Libellé option ${i + 1}`}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            />
            <div className="flex items-center gap-2">
              {opt.imageUrl ? (
                <>
                  <img
                    src={opt.imageUrl}
                    alt={opt.label}
                    className="w-16 h-16 object-contain rounded bg-zinc-800"
                  />
                  <button
                    onClick={() => handleImageSelect(i)}
                    className="text-amber-400 text-xs"
                  >
                    Remplacer
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleImageSelect(i)}
                  className="text-amber-400 text-xs bg-zinc-800 px-3 py-1.5 rounded"
                >
                  Choisir une image
                </button>
              )}
            </div>
            {content.mode === "resultat" && (
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="radio"
                  name="winner"
                  checked={content.winnerId === opt.id}
                  onChange={() => patch({ winnerId: opt.id })}
                />
                Version gagnante
              </label>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function CardEditor({ cards, onChange }: Props) {
  const [newType, setNewType] =
    useState<ConceptCardContent["type"]>("root-letters");

  const addCard = () => {
    const card: ConceptCard = {
      id: crypto.randomUUID(),
      type: newType,
      startTime: 0,
      endTime: 3,
      content: defaultContent(newType),
    };
    onChange([...cards, card]);
  };

  const updateCard = (updated: ConceptCard) => {
    onChange(cards.map((c) => (c.id === updated.id ? updated : c)));
  };

  const deleteCard = (id: string) => {
    onChange(cards.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={newType}
          onChange={(e) =>
            setNewType(e.target.value as ConceptCardContent["type"])
          }
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-sm text-white"
        >
          {CARD_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          onClick={addCard}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-sm font-bold"
        >
          + Ajouter
        </button>
      </div>

      {cards
        .sort((a, b) => a.startTime - b.startTime)
        .map((card) => (
          <CardForm
            key={card.id}
            card={card}
            onUpdate={updateCard}
            onDelete={() => deleteCard(card.id)}
          />
        ))}

      {cards.length === 0 && (
        <div className="text-zinc-500 text-sm text-center py-4">
          Aucune card. Choisis un type et clique « + Ajouter ».
        </div>
      )}
    </div>
  );
}
