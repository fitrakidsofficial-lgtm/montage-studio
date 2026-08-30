"use client";

import { TEMPLATE_PRESETS, type TemplatePreset } from "@/lib/template-presets";
import type { TemplateStyle } from "@/lib/types";

interface Props {
  value: TemplateStyle;
  selectedPresetId: string | null;
  onSelect: (preset: TemplatePreset) => void;
}

const STYLE_LABELS: Record<TemplateStyle, string> = {
  educatif: "Educatif",
  promo: "Promo",
  broll: "B-roll",
  opinion: "Avis communauté",
};

const STYLE_ORDER: TemplateStyle[] = ["educatif", "promo", "broll", "opinion"];

export function StylePicker({ value, selectedPresetId, onSelect }: Props) {
  return (
    <div className="space-y-5">
      {STYLE_ORDER.map((style) => {
        const presets = TEMPLATE_PRESETS.filter((p) => p.style === style);
        return (
          <div key={style}>
            <div
              className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                value === style ? "text-amber-400" : "text-zinc-500"
              }`}
            >
              {STYLE_LABELS[style]}
            </div>
            <div className="space-y-2">
              {presets.map((preset) => {
                const isActive = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelect(preset)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      isActive
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"
                    }`}
                  >
                    <div className="font-bold text-white text-sm">
                      {preset.name}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {preset.description}
                    </div>
                    {preset.cardSlots.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {preset.cardSlots.map((slot, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300"
                          >
                            {slot.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
