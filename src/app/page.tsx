"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { VideoProject } from "@/lib/types";
import {
  loadProjects,
  createProject,
  deleteProject,
} from "@/lib/project-store";

export default function Home() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const router = useRouter();

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const handleCreate = () => {
    const project = createProject("Nouveau montage");
    router.push(`/editor/${project.id}`);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    setProjects(loadProjects());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-zinc-800 px-8 py-6">
        <h1 className="text-2xl font-bold">Montage Studio</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Cree tes montages video a partir de tes templates
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Mes projets</h2>
          <button
            onClick={handleCreate}
            className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            + Nouveau montage
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-12 text-center">
            <div className="text-zinc-500 text-lg mb-4">
              Aucun projet pour le moment
            </div>
            <button
              onClick={handleCreate}
              className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Creer mon premier montage
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer group"
                onClick={() => router.push(`/editor/${p.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors">
                      {p.name}
                    </h3>
                    <div className="text-xs text-zinc-500 mt-1 space-x-3">
                      <span className="capitalize">{p.style}</span>
                      <span>{p.mainVideoDurationSeconds.toFixed(0)}s</span>
                      <span>{p.cards.length} cards</span>
                      <span>{p.brolls.length} b-rolls</span>
                      <span>{p.subtitles.length} sous-titres</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id);
                    }}
                    className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
