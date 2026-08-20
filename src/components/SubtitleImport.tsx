"use client";

import { useCallback } from "react";
import type { SubtitleSegment, SubtitleWord } from "@/lib/types";

interface Props {
  subtitles: SubtitleSegment[];
  words: SubtitleWord[];
  onSubtitlesChange: (subs: SubtitleSegment[]) => void;
  onWordsChange: (words: SubtitleWord[]) => void;
}

export function SubtitleImport({
  subtitles,
  words,
  onSubtitlesChange,
  onWordsChange,
}: Props) {
  const handleJsonImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.subtitles) {
            onSubtitlesChange(data.subtitles);
          }
          if (data.words) {
            onWordsChange(data.words);
          }
        } catch {
          alert("Fichier JSON invalide");
        }
      };
      reader.readAsText(file);
    },
    [onSubtitlesChange, onWordsChange],
  );

  const addSubtitle = () => {
    const lastEnd =
      subtitles.length > 0 ? subtitles[subtitles.length - 1].end : 0;
    onSubtitlesChange([
      ...subtitles,
      { start: lastEnd, end: lastEnd + 3, text: "" },
    ]);
  };

  const updateSubtitle = (idx: number, field: Partial<SubtitleSegment>) => {
    const updated = subtitles.map((s, i) =>
      i === idx ? { ...s, ...field } : s,
    );
    onSubtitlesChange(updated);
  };

  const deleteSubtitle = (idx: number) => {
    onSubtitlesChange(subtitles.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {/* Import JSON */}
      <div className="flex gap-2">
        <label className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-center cursor-pointer text-zinc-300 transition-colors">
          <input
            type="file"
            accept=".json"
            onChange={handleJsonImport}
            className="hidden"
          />
          Importer JSON Whisper
        </label>
        <button
          onClick={addSubtitle}
          className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-bold"
        >
          + Manuel
        </button>
      </div>

      {words.length > 0 && (
        <div className="text-emerald-400 text-xs">
          {words.length} mots Whisper charges - surlignage mot-a-mot actif
        </div>
      )}

      {/* Subtitle list */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {subtitles.map((sub, idx) => (
          <div key={idx} className="bg-zinc-800 rounded-lg p-2 space-y-1">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={sub.start}
                onChange={(e) =>
                  updateSubtitle(idx, {
                    start: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                placeholder="Debut"
              />
              <input
                type="number"
                step="0.1"
                value={sub.end}
                onChange={(e) =>
                  updateSubtitle(idx, {
                    end: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                placeholder="Fin"
              />
              <input
                value={sub.text}
                onChange={(e) => updateSubtitle(idx, { text: e.target.value })}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                placeholder="Texte du sous-titre"
              />
              <button
                onClick={() => deleteSubtitle(idx)}
                className="text-red-400 text-xs hover:text-red-300"
              >
                X
              </button>
            </div>
          </div>
        ))}
      </div>

      {subtitles.length === 0 && (
        <div className="text-zinc-500 text-sm text-center py-2">
          Importe un JSON Whisper ou ajoute les sous-titres manuellement.
        </div>
      )}

      <div className="text-zinc-600 text-xs">
        {subtitles.length} segment{subtitles.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
