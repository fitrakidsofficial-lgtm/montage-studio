"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  loadProfile,
  loadSequences,
  saveSequences,
  type ContentSequence,
  type SlideContent,
} from "@/lib/studio-types";

interface Props {
  projectId: string;
  sequence: ContentSequence | null;
  onBack: () => void;
}

const SLIDE_W = 360;
const SLIDE_H = 450;

export function SlideEditor({ projectId, sequence: initial, onBack }: Props) {
  const [seq, setSeq] = useState<ContentSequence | null>(initial);
  const [activeSlide, setActiveSlide] = useState(0);
  const [editingField, setEditingField] = useState<"text" | "subtext" | null>(
    null,
  );
  const [saved, setSaved] = useState(false);
  const profile = useMemo(() => loadProfile(projectId), [projectId]);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initial) {
      // Load latest sequence if none passed
      const all = loadSequences(projectId);
      if (all.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSeq(all[0]);
      }
    }
  }, [initial, projectId]);

  const colors = profile.colors;

  const updateSlide = useCallback(
    (idx: number, patch: Partial<SlideContent>) => {
      if (!seq) return;
      const slides = seq.slides.map((s, i) =>
        i === idx ? { ...s, ...patch } : s,
      );
      setSeq({ ...seq, slides });
    },
    [seq],
  );

  const handleSave = () => {
    if (!seq) return;
    const all = loadSequences(projectId);
    const idx = all.findIndex((s) => s.id === seq.id);
    if (idx >= 0) {
      all[idx] = seq;
    } else {
      all.unshift(seq);
    }
    saveSequences(all, projectId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!seq) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm mb-4">
          Aucune sequence selectionnee. Genere-en une dans l&apos;onglet
          Planifier.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          Retour au planificateur
        </button>
      </div>
    );
  }

  const slide = seq.slides[activeSlide];
  if (!slide) return null;

  const isFirst = activeSlide === 0;
  const isLast = activeSlide === seq.slides.length - 1;

  // Slide background based on position
  const getBg = (idx: number) => {
    if (idx === 0) return colors[0] || "#2E7D6C"; // hook = primary
    if (idx === seq.slides.length - 1) return colors[2] || "#F28A4B"; // CTA = accent
    return colors[3] || "#FAF4E8"; // content = light
  };

  const getTextColor = (idx: number) => {
    if (idx === 0 || idx === seq.slides.length - 1) return "#FFFFFF";
    return colors[4] || "#123C43";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-zinc-500 hover:text-white transition-colors mb-1"
          >
            &larr; Retour
          </button>
          <h2 className="text-lg font-bold">{seq.subject}</h2>
        </div>
        <button
          onClick={handleSave}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors ${
            saved
              ? "bg-emerald-600 text-white"
              : "bg-amber-600 hover:bg-amber-500 text-white"
          }`}
        >
          {saved ? "Sauvegarde" : "Sauvegarder"}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Slide preview */}
        <div className="flex-1">
          <div
            ref={canvasRef}
            className="mx-auto rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: SLIDE_W,
              height: SLIDE_H,
              backgroundColor: getBg(activeSlide),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              position: "relative",
            }}
          >
            {/* Slide number badge */}
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "rgba(0,0,0,0.2)",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 11,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 600,
              }}
            >
              {activeSlide + 1}/{seq.slides.length}
            </div>

            {/* Label */}
            {isFirst && (
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  background: colors[1] || "#C8972A",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 10,
                  color: "#fff",
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Hook
              </div>
            )}
            {isLast && (
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  background: colors[2] || "#F28A4B",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 10,
                  color: "#fff",
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                CTA
              </div>
            )}

            {/* Main text */}
            {editingField === "text" ? (
              <textarea
                autoFocus
                value={slide.text}
                onChange={(e) =>
                  updateSlide(activeSlide, { text: e.target.value })
                }
                onBlur={() => setEditingField(null)}
                style={{
                  background: "transparent",
                  border: "2px dashed rgba(255,255,255,0.3)",
                  borderRadius: 8,
                  color: getTextColor(activeSlide),
                  fontSize: slide.fontSize || 32,
                  fontFamily: profile.fonts.heading,
                  fontWeight: 700,
                  textAlign: "center",
                  lineHeight: 1.25,
                  width: "100%",
                  resize: "none",
                  outline: "none",
                }}
                rows={4}
              />
            ) : (
              <div
                onClick={() => setEditingField("text")}
                style={{
                  color: getTextColor(activeSlide),
                  fontSize: slide.fontSize || 32,
                  fontFamily: profile.fonts.heading,
                  fontWeight: 700,
                  textAlign: "center",
                  lineHeight: 1.25,
                  cursor: "text",
                }}
              >
                {slide.text || "Clique pour editer"}
              </div>
            )}

            {/* Subtext */}
            {(slide.subtext || editingField === "subtext") && (
              <div style={{ marginTop: 16, width: "100%" }}>
                {editingField === "subtext" ? (
                  <textarea
                    autoFocus
                    value={slide.subtext || ""}
                    onChange={(e) =>
                      updateSlide(activeSlide, { subtext: e.target.value })
                    }
                    onBlur={() => setEditingField(null)}
                    style={{
                      background: "transparent",
                      border: "1px dashed rgba(255,255,255,0.2)",
                      borderRadius: 6,
                      color: getTextColor(activeSlide),
                      opacity: 0.8,
                      fontSize: 16,
                      fontFamily: profile.fonts.body,
                      textAlign: "center",
                      width: "100%",
                      resize: "none",
                      outline: "none",
                    }}
                    rows={2}
                  />
                ) : (
                  <div
                    onClick={() => setEditingField("subtext")}
                    style={{
                      color: getTextColor(activeSlide),
                      opacity: 0.8,
                      fontSize: 16,
                      fontFamily: profile.fonts.body,
                      textAlign: "center",
                      cursor: "text",
                    }}
                  >
                    {slide.subtext}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Slide nav */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
              disabled={activeSlide === 0}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-sm disabled:opacity-30"
            >
              &larr;
            </button>
            <div className="flex gap-1.5">
              {seq.slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    i === activeSlide
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setActiveSlide(Math.min(seq.slides.length - 1, activeSlide + 1))
              }
              disabled={activeSlide === seq.slides.length - 1}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-sm disabled:opacity-30"
            >
              &rarr;
            </button>
          </div>
        </div>

        {/* Controls sidebar */}
        <div className="w-56 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Taille du texte
            </label>
            <input
              type="range"
              min={20}
              max={64}
              value={slide.fontSize || 32}
              onChange={(e) =>
                updateSlide(activeSlide, {
                  fontSize: parseInt(e.target.value),
                })
              }
              className="w-full accent-amber-500"
            />
            <div className="text-[10px] text-zinc-600 text-right">
              {slide.fontSize || 32}px
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Couleur de fond
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {colors.map((c, i) => (
                <button
                  key={i}
                  onClick={() => updateSlide(activeSlide, { color: c })}
                  className="w-8 h-8 rounded-lg border-2 transition-colors"
                  style={{
                    backgroundColor: c,
                    borderColor: slide.color === c ? "#fff" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {!slide.subtext && (
            <button
              onClick={() => {
                updateSlide(activeSlide, {
                  subtext: "Sous-texte...",
                });
                setEditingField("subtext");
              }}
              className="w-full py-2 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              + Ajouter un sous-texte
            </button>
          )}

          {/* Caption preview */}
          <div className="pt-3 border-t border-zinc-800">
            <label className="text-xs text-zinc-500 block mb-1">
              Caption Instagram
            </label>
            <textarea
              value={seq.caption}
              onChange={(e) => setSeq({ ...seq, caption: e.target.value })}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-[11px] text-zinc-400 resize-none"
            />
          </div>

          {/* Hashtags */}
          {seq.hashtags.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 block mb-1">
                Hashtags
              </label>
              <div className="text-[10px] text-zinc-600 leading-relaxed">
                {seq.hashtags.map((h) => `#${h}`).join(" ")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {seq.slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveSlide(i)}
            className={`shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${
              i === activeSlide ? "border-amber-500" : "border-zinc-800"
            }`}
            style={{ width: 100, height: 125 }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: getBg(i),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 8,
              }}
            >
              <div
                style={{
                  color: getTextColor(i),
                  fontSize: 9,
                  fontWeight: 600,
                  textAlign: "center",
                  lineHeight: 1.2,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {s.text}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
