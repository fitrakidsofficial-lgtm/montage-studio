"use client";

import { useState, useEffect } from "react";
import {
  loadProfile,
  loadSequences,
  saveSequences,
  type CreatorProfile,
  type TopicSuggestion,
  type ContentSequence,
  type ContentFormat,
} from "@/lib/studio-types";

const FORMAT_LABELS: Record<ContentFormat, string> = {
  carrousel: "Carrousel",
  reel: "Reel",
  story: "Story",
  image: "Image",
};

const FORMAT_COLORS: Record<ContentFormat, string> = {
  carrousel: "bg-purple-600",
  reel: "bg-pink-600",
  story: "bg-amber-600",
  image: "bg-teal-600",
};

interface Props {
  projectId: string;
  onEditSlides: (seq: ContentSequence) => void;
}

export function ContentPlanner({ projectId, onEditSlides }: Props) {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [sequences, setSequences] = useState<ContentSequence[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [customFormat, setCustomFormat] = useState<ContentFormat>("carrousel");
  const [slidesCount, setSlidesCount] = useState(7);

  useEffect(() => {
    // Restore the selected brand workspace after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile(projectId));
    setSequences(loadSequences(projectId));
  }, [projectId]);

  const suggestTopics = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch("/api/studio/suggest-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (data.topics) setTopics(data.topics);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const generateSequence = async (subject: string, format: ContentFormat) => {
    if (!profile) return;
    setGenerating(subject);
    try {
      const res = await fetch("/api/studio/generate-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, format, profile, slidesCount }),
      });
      const data = await res.json();
      if (data.sequence) {
        const updated = [data.sequence, ...sequences];
        setSequences(updated);
        saveSequences(updated, projectId);
        onEditSlides(data.sequence);
      }
    } catch {
      // silent
    } finally {
      setGenerating(null);
    }
  };

  const deleteSequence = (id: string) => {
    const updated = sequences.filter((s) => s.id !== id);
    setSequences(updated);
    saveSequences(updated, projectId);
  };

  const noProfile = !profile?.sector && !profile?.customSector;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-1">Planifier du contenu</h2>
        <p className="text-sm text-zinc-500">
          Donne un sujet, l&apos;IA ecrit la sequence slide par slide.
        </p>
      </div>

      {noProfile && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4 text-sm text-amber-300">
          Configure ton branding d&apos;abord (onglet Branding) pour que
          l&apos;IA adapte le contenu a ton style.
        </div>
      )}

      {/* Sujet personnalise */}
      <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-300 mb-3">
          1. Donne un sujet
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customSubject.trim()) {
                generateSequence(customSubject.trim(), customFormat);
              }
            }}
            placeholder="Ex: 5 habitudes du matin pour etre productif"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600"
          />
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-zinc-500">Format :</span>
          <div className="flex gap-1.5">
            {(Object.entries(FORMAT_LABELS) as [ContentFormat, string][]).map(
              ([k, v]) => (
                <button
                  key={k}
                  onClick={() => setCustomFormat(k)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    customFormat === k
                      ? `${FORMAT_COLORS[k]} text-white`
                      : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {v}
                </button>
              ),
            )}
          </div>
          <span className="text-xs text-zinc-500 ml-auto">Slides :</span>
          <div className="flex gap-1">
            {[4, 5, 7, 10].map((n) => (
              <button
                key={n}
                onClick={() => setSlidesCount(n)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  slidesCount === n
                    ? "bg-amber-600 text-white"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (customSubject.trim()) {
              generateSequence(customSubject.trim(), customFormat);
            }
          }}
          disabled={!customSubject.trim() || generating !== null}
          className="w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white transition-colors disabled:opacity-40"
        >
          {generating
            ? "Generation en cours..."
            : "Generer la sequence automatiquement"}
        </button>
      </section>

      {/* Suggestions IA */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-300">
            2. Ou laisse l&apos;IA suggerer
          </h3>
          <button
            onClick={suggestTopics}
            disabled={loading || noProfile}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-40"
          >
            {loading ? "Chargement..." : "Suggerer des sujets"}
          </button>
        </div>

        {topics.length > 0 && (
          <div className="grid gap-2">
            {topics.map((t) => (
              <div
                key={t.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${FORMAT_COLORS[t.format]}`}
                      >
                        {FORMAT_LABELS[t.format]}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {t.objective}
                      </span>
                      <div className="flex gap-0.5 ml-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              i < t.formatScore ? "bg-amber-500" : "bg-zinc-800"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-white mb-0.5">
                      {t.subject}
                    </div>
                    <div className="text-xs text-zinc-500 italic">
                      &ldquo;{t.hook}&rdquo;
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1">
                      {t.reason}
                    </div>
                  </div>
                  <button
                    onClick={() => generateSequence(t.subject, t.format)}
                    disabled={generating !== null}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-40"
                  >
                    {generating === t.subject ? "..." : "Generer"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sequences generees */}
      {sequences.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-zinc-300 mb-3">
            Mes sequences ({sequences.length})
          </h3>
          <div className="grid gap-2">
            {sequences.map((seq) => (
              <div
                key={seq.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${FORMAT_COLORS[seq.format]}`}
                    >
                      {FORMAT_LABELS[seq.format]}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {seq.subject}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onEditSlides(seq)}
                      className="px-3 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    >
                      Editer
                    </button>
                    <button
                      onClick={() => deleteSequence(seq.id)}
                      className="px-2 py-1 rounded-lg text-xs text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      x
                    </button>
                  </div>
                </div>
                <div className="flex gap-1">
                  {seq.slides.map((s) => (
                    <div
                      key={s.id}
                      className="flex-1 h-2 rounded-full bg-zinc-700"
                      title={`Slide ${s.slideNumber}: ${s.text.slice(0, 40)}`}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-zinc-600 mt-1.5">
                  {seq.slides.length} slides &middot;{" "}
                  {new Date(seq.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
