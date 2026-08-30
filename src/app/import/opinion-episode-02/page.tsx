"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/client-api";
import { loadProject, saveProject } from "@/lib/project-store";
import { loadStudioProjects } from "@/lib/studio-types";
import type { VideoProject } from "@/lib/types";
import {
  createOpinionEpisode02Project,
  OPINION_EPISODE_02_PROJECT_ID,
} from "@/lib/templates/opinion-episode-02";

export default function ImportOpinionEpisode02Page() {
  const router = useRouter();
  const [message, setMessage] = useState("Préparation de l’épisode 2…");

  useEffect(() => {
    let cancelled = false;
    const openEditor = () => {
      if (!cancelled) {
        router.replace(`/editor/${OPINION_EPISODE_02_PROJECT_ID}`);
      }
    };

    async function importProject() {
      const reset = new URLSearchParams(window.location.search).has("reset");
      const local = loadProject(OPINION_EPISODE_02_PROJECT_ID);
      if (!reset && local) {
        setMessage("Ouverture du brouillon existant…");
        openEditor();
        return;
      }

      if (!reset) {
        try {
          const cloud = await apiJson<{ project: VideoProject }>(
            `/api/montages/${OPINION_EPISODE_02_PROJECT_ID}`,
          );
          saveProject(cloud.project);
          setMessage("Épisode retrouvé. Ouverture…");
          openEditor();
          return;
        } catch {
          // Create the reusable draft below.
        }
      }

      const missionSourates = loadStudioProjects().find(
        (workspace) => workspace.name === "Mission Sourates",
      );
      const project = createOpinionEpisode02Project(
        missionSourates?.id ?? null,
      );
      saveProject(project);

      try {
        await apiJson("/api/montages", {
          method: "POST",
          body: JSON.stringify({ project }),
        });
        setMessage("Brouillon créé et synchronisé. Ouverture…");
      } catch {
        setMessage("Brouillon créé en mode local. Ouverture…");
      }
      openEditor();
    }

    void importProject();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
        <div className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
          Mission Sourates · Avis 02
        </div>
        <h1 className="text-2xl font-black">Position des textes</h1>
        <p className="mt-3 text-zinc-400">{message}</p>
      </div>
    </main>
  );
}
