"use client";

import { useState } from "react";
import type { SocialCaptions } from "@/lib/types";

interface Props {
  captions: SocialCaptions;
}

export function StepCaptions({ captions }: Props) {
  const [showCaptions, setShowCaptions] = useState(false);

  return (
    <div className="p-4 border-b border-zinc-800">
      <button
        onClick={() => setShowCaptions(!showCaptions)}
        className="w-full flex items-center justify-between"
      >
        <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
          5. Descriptions et hashtags
        </div>
        <span className="text-zinc-500 text-sm">
          {showCaptions ? "v" : ">"}
        </span>
      </button>
      {showCaptions && (
        <div className="mt-3 space-y-3">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-[10px] text-red-400 font-bold mb-1">
              YouTube Shorts
            </div>
            <div className="text-xs text-white font-bold mb-1">
              {captions.youtube.title}
            </div>
            <div className="text-[11px] text-zinc-400 mb-1">
              {captions.youtube.description}
            </div>
            <div className="text-[10px] text-zinc-500">
              {captions.youtube.hashtags.join(" ")}
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-[10px] text-pink-400 font-bold mb-1">
              Instagram Reels
            </div>
            <div className="text-[11px] text-zinc-300 mb-1">
              {captions.instagram.caption}
            </div>
            <div className="text-[10px] text-zinc-500 break-all">
              {captions.instagram.hashtags.join(" ")}
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-[10px] text-cyan-400 font-bold mb-1">
              TikTok
            </div>
            <div className="text-[11px] text-zinc-300 mb-1">
              {captions.tiktok.caption}
            </div>
            <div className="text-[10px] text-zinc-500">
              {captions.tiktok.hashtags.join(" ")}
            </div>
          </div>
          <div className="flex gap-2">
            {(["youtube", "instagram", "tiktok"] as const).map((platform) => (
              <button
                key={platform}
                onClick={() => {
                  const text =
                    platform === "youtube"
                      ? `${captions.youtube.title}\n\n${captions.youtube.description}\n\n${captions.youtube.hashtags.join(" ")}`
                      : platform === "instagram"
                        ? `${captions.instagram.caption}\n\n${captions.instagram.hashtags.join(" ")}`
                        : `${captions.tiktok.caption} ${captions.tiktok.hashtags.join(" ")}`;
                  navigator.clipboard.writeText(text);
                }}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors"
              >
                Copier {platform}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
