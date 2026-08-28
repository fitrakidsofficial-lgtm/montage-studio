"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileSetup } from "@/components/studio/ProfileSetup";
import { ContentPlanner } from "@/components/studio/ContentPlanner";
import { Calendar } from "@/components/studio/Calendar";
import { SlideEditor } from "@/components/studio/SlideEditor";
import {
  createStudioProjectOnline,
  deleteStudioProjectOnline,
  duplicateStudioProjectOnline,
  importStudioProjectOnline,
  renameStudioProjectOnline,
  restoreStudioProjectOnline,
  saveStudioProjects,
  setActiveProjectId,
  syncStudioWorkspaceFromCloud,
  type ContentSequence,
  type StudioProject,
  type StudioWorkspace as StudioWorkspaceState,
} from "@/lib/studio-types";
import { ApiClientError } from "@/lib/client-api";

const TABS = [
  { id: "profil", label: "Branding" },
  { id: "planifier", label: "Planifier" },
  { id: "calendrier", label: "Calendrier" },
  { id: "slides", label: "Carrousels" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function StudioWorkspace({ project }: { project: StudioProject }) {
  const [tab, setTab] = useState<TabId>("planifier");
  const [editingSequence, setEditingSequence] =
    useState<ContentSequence | null>(null);

  return (
    <>
      <div className="border-b border-zinc-800 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                if (item.id !== "slides") setEditingSequence(null);
              }}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === item.id
                  ? "border-amber-500 text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <p className="text-xs text-emerald-200">
            Espace actif : <strong>{project.name}</strong>. Son branding, ses
            contenus et son calendrier sont isoles des autres projets.
          </p>
        </div>

        {tab === "profil" && (
          <ProfileSetup
            projectId={project.id}
            projectName={project.name}
          />
        )}
        {tab === "planifier" && (
          <ContentPlanner
            projectId={project.id}
            onEditSlides={(sequence) => {
              setEditingSequence(sequence);
              setTab("slides");
            }}
          />
        )}
        {tab === "calendrier" && <Calendar projectId={project.id} />}
        {tab === "slides" && (
          <SlideEditor
            projectId={project.id}
            sequence={editingSequence}
            onBack={() => setTab("planifier")}
          />
        )}
      </div>
    </>
  );
}

export default function StudioPage() {
  const [workspace, setWorkspace] = useState<StudioWorkspaceState | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deletedProject, setDeletedProject] = useState<StudioProject | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    void syncStudioWorkspaceFromCloud()
      .then(setWorkspace)
      .catch((loadError: unknown) => {
        if (loadError instanceof ApiClientError && loadError.status === 401) {
          router.replace("/login");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Chargement impossible");
      });
  }, [router]);

  if (!workspace) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex flex-col gap-3 items-center justify-center">
        <p>{error || "Chargement du Studio Planner..."}</p>
        {error && (
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  const activeProject =
    workspace.projects.find(
      (project) => project.id === workspace.activeProjectId,
    ) ?? workspace.projects[0];

  const selectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setWorkspace((current) =>
      current ? { ...current, activeProjectId: projectId } : current,
    );
  };

  const updateWorkspace = (projects: StudioProject[], activeProjectId: string) => {
    saveStudioProjects(projects);
    setActiveProjectId(activeProjectId);
    setWorkspace({ projects, activeProjectId });
  };

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const project = await createStudioProjectOnline(name);
      updateWorkspace([...workspace.projects, project], project.id);
      setNewProjectName("");
      setIsCreating(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  };

  const removeActiveProject = async () => {
    if (workspace.projects.length <= 1) return;
    if (
      !window.confirm(
        `Supprimer ${activeProject.name} et toutes ses sequences du Studio Planner ?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteStudioProjectOnline(activeProject.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Suppression impossible");
      setBusy(false);
      return;
    }
    const projects = workspace.projects.filter((project) => project.id !== activeProject.id);
    const activeProjectId = projects[0].id;
    updateWorkspace(projects, activeProjectId);
    setDeletedProject(activeProject);
    setBusy(false);
  };

  const renameActiveProject = async () => {
    const name = window.prompt("Nouveau nom du projet", activeProject.name)?.trim();
    if (!name || name === activeProject.name) return;
    setBusy(true);
    try {
      const renamed = await renameStudioProjectOnline(activeProject.id, name);
      updateWorkspace(
        workspace.projects.map((project) =>
          project.id === renamed.id ? renamed : project,
        ),
        renamed.id,
      );
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Renommage impossible");
    } finally {
      setBusy(false);
    }
  };

  const duplicateActiveProject = async () => {
    setBusy(true);
    setError("");
    try {
      const duplicate = await duplicateStudioProjectOnline(activeProject.id);
      updateWorkspace([...workspace.projects, duplicate], duplicate.id);
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Duplication impossible");
    } finally {
      setBusy(false);
    }
  };

  const restoreDeletedProject = async () => {
    if (!deletedProject) return;
    setBusy(true);
    try {
      const restored = await restoreStudioProjectOnline(deletedProject.id);
      updateWorkspace([...workspace.projects, restored], restored.id);
      setDeletedProject(null);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Restauration impossible");
    } finally {
      setBusy(false);
    }
  };

  const importProject = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const data: unknown = JSON.parse(await file.text());
      const imported = await importStudioProjectOnline(data);
      updateWorkspace([...workspace.projects, imported], imported.id);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import impossible");
    } finally {
      setBusy(false);
      if (importInput.current) importInput.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-zinc-500 hover:text-white transition-colors text-sm"
            >
              Montage Studio
            </Link>
            <span className="text-zinc-700">/</span>
            <h1 className="text-lg font-bold">Studio Planner</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              Projet actif
            </span>
            <select
              value={activeProject.id}
              onChange={(event) => selectProject(event.target.value)}
              className="min-w-44 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-amber-500"
              aria-label="Choisir le projet actif"
            >
              {workspace.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsCreating((current) => !current)}
              className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-500"
            >
              + Nouveau projet
            </button>
            <button
              onClick={renameActiveProject}
              disabled={busy}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white disabled:opacity-40"
            >
              Renommer
            </button>
            <button
              onClick={duplicateActiveProject}
              disabled={busy}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white disabled:opacity-40"
            >
              Dupliquer
            </button>
            <a
              href={`/api/workspaces/${activeProject.id}/export`}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Exporter
            </a>
            <button
              onClick={() => importInput.current?.click()}
              disabled={busy}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white disabled:opacity-40"
            >
              Importer
            </button>
            <input
              ref={importInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importProject(file);
              }}
            />
            <button
              onClick={removeActiveProject}
              disabled={workspace.projects.length <= 1 || busy}
              className="rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-500 transition-colors hover:border-red-900 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Supprimer
            </button>
          </div>
        </div>

        {isCreating && (
          <form
            onSubmit={createProject}
            className="mt-4 ml-auto flex max-w-md gap-2"
          >
            <input
              autoFocus
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Nom du projet ou de la marque"
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!newProjectName.trim() || busy}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Creer
            </button>
          </form>
        )}
      </header>

      {(error || deletedProject) && (
        <div className="mx-auto mt-4 flex max-w-5xl items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
          <span className={error ? "text-red-400" : "text-zinc-300"}>
            {error || `${deletedProject?.name} a été archivé.`}
          </span>
          {deletedProject && (
            <button
              onClick={restoreDeletedProject}
              disabled={busy}
              className="font-bold text-amber-400 hover:text-amber-300"
            >
              Annuler la suppression
            </button>
          )}
        </div>
      )}

      <StudioWorkspace key={activeProject.id} project={activeProject} />
    </div>
  );
}
