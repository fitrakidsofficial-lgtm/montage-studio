"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { VideoProject } from "@/lib/types";
import { loadProject, loadProjectFromCloud } from "@/lib/project-store";
import { ApiClientError } from "@/lib/client-api";
import { Editor } from "@/components/Editor";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<VideoProject | null>(null);

  useEffect(() => {
    const id = params.id as string;
    let cancelled = false;
    void loadProjectFromCloud(id)
      .catch((loadError: unknown) => {
        if (loadError instanceof ApiClientError && loadError.status === 401) {
          router.replace("/login");
          return null;
        }
        return loadProject(id);
      })
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) {
          router.replace("/");
          return;
        }
        const cleanProject = structuredClone(loaded);
        // Blob URLs don't survive page reload — clear stale ones.
        if (cleanProject.mainVideoUrl?.startsWith("blob:")) {
          cleanProject.mainVideoUrl = null;
        }
        if (cleanProject.brand.logoUrl?.startsWith("blob:")) {
          cleanProject.brand.logoUrl = "/fitra-kids-logo.png";
        }
        cleanProject.brolls = cleanProject.brolls.filter(
          (broll) => !broll.fileUrl.startsWith("blob:"),
        );
        setProject(cleanProject);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  if (!project) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        Chargement...
      </div>
    );
  }

  return <Editor initialProject={project} />;
}
