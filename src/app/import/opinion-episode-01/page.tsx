"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/client-api";
import { loadProject, saveProject } from "@/lib/project-store";
import { loadStudioProjects } from "@/lib/studio-types";
import type { VideoProject } from "@/lib/types";
import {
  createOpinionEpisode01Project,
  OPINION_EPISODE_01_PROJECT_ID,
} from "@/lib/templates/opinion-episode-01";

export default function ImportOpinionEpisode01Page() {
  const router = useRouter();
  const [message, setMessage] = useState(
    "Préparation du montage éditable…",
  );

  useEffect(() => {
    let cancelled = false;

    async function importProject() {
      const routeToEditor = () => {
        if (!cancelled) {
          router.replace(`/editor/${OPINION_EPISODE_01_PROJECT_ID}`);
        }
      };

      const localProject = loadProject(OPINION_EPISODE_01_PROJECT_ID);
      if (localProject) {
        setMessage("Ouverture du montage existant…");
        routeToEditor();
        return;
      }

      try {
        const cloud = await apiJson<{ project: VideoProject }>(
          `/api/montages/${OPINION_EPISODE_01_PROJECT_ID}`,
        );
        saveProject(cloud.project);
        setMessage("Montage retrouvé. Ouverture…");
        routeToEditor();
        return;
      } catch {
        // The project does not exist yet, or the studio is in local mode.
      }

      const missionSourates = loadStudioProjects().find(
        (workspace) => workspace.name === "Mission Sourates",
      );
      const project = createOpinionEpisode01Project(
        missionSourates?.id ?? null,
      );
      saveProject(project);

      try {
        await apiJson("/api/montages", {
          method: "POST",
          body: JSON.stringify({ project }),
        });
        setMessage("Montage créé et synchronisé. Ouverture…");
      } catch {
        setMessage("Montage créé en mode local. Ouverture…");
      }

      routeToEditor();
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
          Mission Sourates · Avis 01
        </div>
        <h1 className="text-2xl font-black">Étoile ou Terre ?</h1>
        <p className="mt-3 text-zinc-400">{message}</p>
      </div>
    </main>
  );
}
