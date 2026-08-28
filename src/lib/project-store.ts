"use client";

import { type VideoProject, createDefaultProject } from "@/lib/types";
import type { BrandConfig } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

const STORAGE_KEY = "montage-studio-projects";

export function loadProjects(): VideoProject[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjects(projects: VideoProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function loadProject(id: string): VideoProject | null {
  return loadProjects().find((p) => p.id === id) ?? null;
}

export function saveProject(project: VideoProject) {
  const projects = loadProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  saveProjects(projects);
  scheduleCloudSave(project);
}

export function deleteProject(id: string) {
  saveProjects(loadProjects().filter((p) => p.id !== id));
  void apiJson(`/api/montages/${id}`, { method: "DELETE" }).catch(
    () => undefined,
  );
}

export function createProject(
  name: string,
  studioProjectId?: string,
  brand?: BrandConfig,
): VideoProject {
  const project = createDefaultProject({ studioProjectId, brand });
  project.name = name;
  saveProject(project);
  return project;
}

const cloudSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleCloudSave(project: VideoProject) {
  if (typeof window === "undefined") return;
  const previous = cloudSaveTimers.get(project.id);
  if (previous) clearTimeout(previous);
  cloudSaveTimers.set(
    project.id,
    setTimeout(() => {
      cloudSaveTimers.delete(project.id);
      void apiJson(`/api/montages/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({ project }),
      }).catch(() => undefined);
    }, 500),
  );
}

export async function syncProjectsFromCloud(
  fallbackWorkspaceId?: string,
  fallbackBrand?: BrandConfig,
) {
  const local = loadProjects();
  const result = await apiJson<{ projects: VideoProject[] }>("/api/montages");
  if (result.projects.length === 0 && local.length > 0) {
    const migrated = local.map((project) => ({
      ...project,
      studioProjectId: project.studioProjectId ?? fallbackWorkspaceId ?? null,
      brand: project.brand ?? fallbackBrand,
    }));
    await Promise.all(
      migrated.map((project) =>
        apiJson("/api/montages", {
          method: "POST",
          body: JSON.stringify({ project }),
        }),
      ),
    );
    saveProjects(migrated);
    return migrated;
  }
  saveProjects(result.projects);
  return result.projects;
}

export async function loadProjectFromCloud(id: string) {
  const result = await apiJson<{ project: VideoProject }>(`/api/montages/${id}`);
  const local = loadProjects();
  const index = local.findIndex((project) => project.id === id);
  if (index >= 0) local[index] = result.project;
  else local.push(result.project);
  saveProjects(local);
  return result.project;
}
