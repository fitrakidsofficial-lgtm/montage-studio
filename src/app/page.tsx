"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { VideoProject } from "@/lib/types";
import {
  createProject,
  deleteProject,
  loadProjects,
  syncProjectsFromCloud,
} from "@/lib/project-store";
import {
  loadProfile,
  profileToBrandConfig,
  syncStudioWorkspaceFromCloud,
  type StudioProject,
} from "@/lib/studio-types";
import { apiJson, ApiClientError } from "@/lib/client-api";

export default function Home() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [workspaces, setWorkspaces] = useState<StudioProject[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const studio = await syncStudioWorkspaceFromCloud();
        if (cancelled) return;
        setWorkspaces(studio.projects);
        setSelectedWorkspaceId(studio.activeProjectId);
        const profile = loadProfile(studio.activeProjectId);
        const cloudProjects = await syncProjectsFromCloud(
          studio.activeProjectId,
          profileToBrandConfig(profile),
        );
        if (!cancelled) setProjects(cloudProjects);
      } catch (loadError) {
        if (loadError instanceof ApiClientError && loadError.status === 401) {
          router.replace("/login");
          return;
        }
        if (!cancelled) {
          setProjects(loadProjects());
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Synchronisation impossible",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const workspaceNames = useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.id, workspace.name])),
    [workspaces],
  );

  const handleCreate = () => {
    if (!selectedWorkspaceId) return;
    const project = createProject(
      "Nouveau montage",
      selectedWorkspaceId,
      profileToBrandConfig(loadProfile(selectedWorkspaceId)),
    );
    router.push(`/editor/${project.id}`);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Supprimer définitivement ce montage ?")) return;
    deleteProject(id);
    setProjects((current) => current.filter((project) => project.id !== id));
  };

  const logout = async () => {
    await apiJson("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        Synchronisation de tes projets...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-zinc-800 px-8 py-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Montage Studio</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Tes montages, marques et calendriers synchronisés en ligne
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/studio")}
            className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            Studio Planner
          </button>
          <button
            onClick={logout}
            className="border border-zinc-800 px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {error && (
          <div className="mb-5 rounded-xl border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-300">
            Mode local actif : {error}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-lg font-bold">Mes montages</h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedWorkspaceId}
              onChange={(event) => setSelectedWorkspaceId(event.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm"
              aria-label="Projet de marque du nouveau montage"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={!selectedWorkspaceId}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
            >
              + Nouveau montage
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-12 text-center">
            <div className="text-zinc-500 text-lg mb-4">Aucun montage</div>
            <button
              onClick={handleCreate}
              disabled={!selectedWorkspaceId}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-bold"
            >
              Créer mon premier montage
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer group"
                onClick={() => router.push(`/editor/${project.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 inline-flex rounded-full bg-purple-950 px-2 py-1 text-[10px] font-bold text-purple-300">
                      {project.studioProjectId
                        ? workspaceNames.get(project.studioProjectId) || "Projet archivé"
                        : "Ancien montage"}
                    </div>
                    <h3 className="font-bold group-hover:text-amber-400">
                      {project.name}
                    </h3>
                    <div className="text-xs text-zinc-500 mt-1 space-x-3">
                      <span className="capitalize">{project.style}</span>
                      <span>{project.mainVideoDurationSeconds.toFixed(0)}s</span>
                      <span>{project.cards.length} cards</span>
                      <span>{project.brolls.length} b-rolls</span>
                    </div>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(project.id);
                    }}
                    className="text-zinc-600 hover:text-red-400 text-xs"
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
