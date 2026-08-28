"use client";

import { useState, useEffect } from "react";
import {
  SECTORS,
  COMM_STYLES,
  DEFAULT_PROFILE,
  loadProfile,
  saveProfile,
  type CreatorProfile,
} from "@/lib/studio-types";

const FONT_OPTIONS = [
  "Poppins",
  "Inter",
  "Arial",
  "Georgia",
  "Trebuchet MS",
  "Verdana",
  "Impact",
  "Times New Roman",
  "Luckiest Guy",
  "Itim",
];

const PALETTE_PRESETS = [
  {
    id: "fitra",
    name: "Ma Charte",
    colors: ["#2E7D6C", "#C8972A", "#F28A4B", "#FAF4E8", "#123C43"],
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    colors: ["#FF6B35", "#F7C59F", "#EFEFD0", "#004E89", "#1A535C"],
  },
  {
    id: "emerald",
    name: "Emerald Mint",
    colors: ["#2EC4B6", "#CBF3F0", "#FFBF69", "#FF9F1C", "#011627"],
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    colors: ["#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8", "#03045E"],
  },
  {
    id: "lavender",
    name: "Rose & Lavender",
    colors: ["#E0AAFF", "#C77DFF", "#9D4EDD", "#7B2CBF", "#240046"],
  },
  {
    id: "dark",
    name: "Dark Premium",
    colors: ["#F8F9FA", "#E9ECEF", "#6C757D", "#343A40", "#212529"],
  },
  {
    id: "nature",
    name: "Nature Verte",
    colors: ["#606C38", "#283618", "#FEFAE0", "#DDA15E", "#BC6C25"],
  },
];

interface Props {
  projectId: string;
  projectName: string;
}

export function ProfileSetup({ projectId, projectName }: Props) {
  const [profile, setProfile] = useState<CreatorProfile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    // Branding is stored client-side and restored when the project changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile(projectId));
  }, [projectId]);

  const patch = (p: Partial<CreatorProfile>) => {
    setProfile((prev) => ({ ...prev, ...p }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaveError("");
    try {
      await saveProfile(profile, projectId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Sauvegarde impossible");
    }
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !profile.keywords.includes(kw)) {
      patch({ keywords: [...profile.keywords, kw] });
    }
    setKeywordInput("");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold mb-1">
          Branding de {projectName}
        </h2>
        <p className="text-sm text-zinc-500">
          Configure cette marque une seule fois. Elle sera rechargee
          automatiquement lorsque tu reviendras sur ce projet.
        </p>
      </div>

      {/* Secteur */}
      <section>
        <label className="text-sm font-medium text-zinc-300 block mb-2">
          Ton secteur d&apos;activite
        </label>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => patch({ sector: s })}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                profile.sector === s
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={profile.customSector}
          onChange={(e) => patch({ customSector: e.target.value, sector: "" })}
          placeholder="Ou precise ton secteur..."
          className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600"
        />
      </section>

      {/* Style de communication */}
      <section>
        <label className="text-sm font-medium text-zinc-300 block mb-2">
          Ton style de communication
        </label>
        <div className="flex flex-wrap gap-2">
          {COMM_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => patch({ style: s.id })}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                profile.style === s.id
                  ? "bg-teal-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Tutoiement / Vouvoiement */}
      <section>
        <label className="text-sm font-medium text-zinc-300 block mb-2">
          Tu t&apos;exprimes plutot...
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => patch({ tone: "tu" })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              profile.tone === "tu"
                ? "bg-amber-600 text-white"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            En tutoyant (tu/toi)
          </button>
          <button
            onClick={() => patch({ tone: "vous" })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              profile.tone === "vous"
                ? "bg-amber-600 text-white"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            En vouvoyant (vous)
          </button>
        </div>
      </section>

      {/* Mots-cles */}
      <section>
        <label className="text-sm font-medium text-zinc-300 block mb-2">
          Mots / expressions a reutiliser
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            placeholder="Ex: passion, reussite, halal..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600"
          />
          <button
            onClick={addKeyword}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            Ajouter
          </button>
        </div>
        {profile.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300"
              >
                {kw}
                <button
                  onClick={() =>
                    patch({
                      keywords: profile.keywords.filter((k) => k !== kw),
                    })
                  }
                  className="text-zinc-600 hover:text-red-400 ml-0.5"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Palette de couleurs */}
      <section>
        <label className="text-sm font-medium text-zinc-300 block mb-2">
          Palette de couleurs
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PALETTE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => patch({ colors: p.colors })}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                JSON.stringify(profile.colors) === JSON.stringify(p.colors)
                  ? "border-amber-500 bg-zinc-800"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
              }`}
            >
              <div className="flex gap-0.5">
                {p.colors.map((c, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span className="text-xs text-zinc-400">{p.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Polices */}
      <section>
        <label className="text-sm font-medium text-zinc-300 block mb-2">
          Polices
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-zinc-500 block mb-1">Titres</span>
            <div className="flex flex-wrap gap-1.5">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() =>
                    patch({ fonts: { ...profile.fonts, heading: f } })
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    profile.fonts.heading === f
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                  style={{ fontFamily: f }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-zinc-500 block mb-1">Corps</span>
            <div className="flex flex-wrap gap-1.5">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() =>
                    patch({ fonts: { ...profile.fonts, body: f } })
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    profile.fonts.body === f
                      ? "bg-teal-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                  style={{ fontFamily: f }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section>
        <label className="text-sm font-medium text-zinc-300 block mb-2">
          Bio / description courte
        </label>
        <textarea
          value={profile.bio}
          onChange={(e) => patch({ bio: e.target.value })}
          rows={3}
          placeholder="Ex: Formatrice en creation de contenus specialisee sur Instagram"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none"
        />
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
          saved
            ? "bg-emerald-600 text-white"
            : "bg-amber-600 hover:bg-amber-500 text-white"
        }`}
      >
        {saved
          ? `Branding de ${projectName} sauvegarde`
          : `Enregistrer le branding de ${projectName}`}
      </button>
      {saveError && <p className="text-sm text-red-400">{saveError}</p>}
    </div>
  );
}
