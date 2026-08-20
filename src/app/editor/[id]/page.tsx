"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { VideoProject } from "@/lib/types";
import { loadProject } from "@/lib/project-store";
import { Editor } from "@/components/Editor";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<VideoProject | null>(null);

  useEffect(() => {
    const id = params.id as string;
    const p = loadProject(id);
    if (!p) {
      router.push("/");
      return;
    }
    // Blob URLs don't survive page reload — clear stale ones
    if (p.mainVideoUrl?.startsWith("blob:")) {
      p.mainVideoUrl = null;
    }
    if (p.brand.logoUrl?.startsWith("blob:")) {
      p.brand.logoUrl = "/fitra-kids-logo.png";
    }
    p.brolls = p.brolls.filter((b) => !b.fileUrl.startsWith("blob:"));
    setProject(p);
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
