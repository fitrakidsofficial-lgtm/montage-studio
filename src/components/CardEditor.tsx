"use client";

import { useState } from "react";
import type { ConceptCard, ConceptCardContent } from "@/lib/types";

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
                      "cream" | "gold" | "orange" | "teal",
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
    </div>
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
          Aucune card. Choisis un type et clique "+ Ajouter".
        </div>
      )}
    </div>
  );
}
