"use client";

import { type VideoProject, createDefaultProject } from "@/lib/types";

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
}

export function deleteProject(id: string) {
  saveProjects(loadProjects().filter((p) => p.id !== id));
}

export function createProject(name: string): VideoProject {
  const project = createDefaultProject();
  project.name = name;
  saveProject(project);
  return project;
}
