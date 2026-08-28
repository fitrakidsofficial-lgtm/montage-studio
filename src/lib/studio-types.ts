/** Types for the Studio Planner (content planning, sequences, calendar) */

import { apiJson } from "./client-api";
import type { BrandConfig } from "./types";

// ── Studio Project (multi-brand) ──

export interface StudioProject {
  id: string;
  name: string;
  createdAt: number;
}

export interface StudioWorkspace {
  projects: StudioProject[];
  activeProjectId: string;
}

export interface CloudWorkspaceRecord {
  id: string;
  name: string;
  profile: CreatorProfile;
  sequences: ContentSequence[];
  dmConfig: Record<string, unknown>;
  instagramConfigured: boolean;
  tiktokConfigured: boolean;
  youtubeConfigured: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_STUDIO_PROJECT_NAMES = [
  "Nourya",
  "Projet IA",
  "Mission Sourates",
] as const;

function newStudioProject(name: string): StudioProject {
  return {
    id: `sp-${crypto.randomUUID()}`,
    name: name.trim(),
    createdAt: Date.now(),
  };
}

export function loadStudioProjects(): StudioProject[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("studio_projects");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStudioProjects(projects: StudioProject[]) {
  localStorage.setItem("studio_projects", JSON.stringify(projects));
}

export function createStudioProject(name: string): StudioProject {
  const project = newStudioProject(name);
  const all = loadStudioProjects();
  all.push(project);
  saveStudioProjects(all);
  return project;
}

export function deleteStudioProject(id: string) {
  saveStudioProjects(loadStudioProjects().filter((p) => p.id !== id));
  localStorage.removeItem(`studio_profile_${id}`);
  localStorage.removeItem(`studio_sequences_${id}`);
  if (getActiveProjectId() === id) {
    localStorage.removeItem("studio_active_project");
  }
}

export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("studio_active_project");
}

export function setActiveProjectId(id: string) {
  localStorage.setItem("studio_active_project", id);
}

/**
 * Creates the three requested brand workspaces on first use and restores the
 * last selected one afterwards. Legacy single-project data is assigned to
 * Mission Sourates so an existing setup is not lost during the migration.
 */
export function initializeStudioWorkspace(): StudioWorkspace {
  let projects = loadStudioProjects();

  if (projects.length === 0) {
    projects = DEFAULT_STUDIO_PROJECT_NAMES.map((name) =>
      newStudioProject(name),
    );
    saveStudioProjects(projects);

    const legacyTarget =
      projects.find((project) => project.name === "Mission Sourates") ??
      projects[0];
    const legacyProfile = localStorage.getItem("studio_profile");
    const legacySequences = localStorage.getItem("studio_sequences");
    if (legacyProfile) {
      localStorage.setItem(`studio_profile_${legacyTarget.id}`, legacyProfile);
    }
    if (legacySequences) {
      localStorage.setItem(
        `studio_sequences_${legacyTarget.id}`,
        legacySequences,
      );
    }
  }

  const storedActiveId = getActiveProjectId();
  const activeProjectId = projects.some(
    (project) => project.id === storedActiveId,
  )
    ? (storedActiveId as string)
    : projects[0].id;
  setActiveProjectId(activeProjectId);

  return { projects, activeProjectId };
}

// ── Creator Profile ──

export interface CreatorProfile {
  sector: string;
  customSector: string;
  style: string;
  tone: "tu" | "vous";
  keywords: string[];
  colors: string[];
  fonts: { heading: string; body: string };
  bio: string;
}

export const DEFAULT_PROFILE: CreatorProfile = {
  sector: "",
  customSector: "",
  style: "",
  tone: "tu",
  keywords: [],
  colors: ["#2E7D6C", "#C8972A", "#F28A4B", "#FAF4E8", "#123C43"],
  fonts: { heading: "Poppins", body: "Inter" },
  bio: "",
};

export function profileToBrandConfig(profile: CreatorProfile): BrandConfig {
  const colors = [...profile.colors, ...DEFAULT_PROFILE.colors].slice(0, 5);
  return {
    colors: {
      teal: colors[0],
      gold: colors[1],
      orange: colors[2],
      cream: colors[3],
      night: colors[4],
    },
    fonts: {
      title: profile.fonts.heading || "Poppins",
      body: profile.fonts.body || "Inter",
      arabic: "Noto Sans Arabic",
    },
    logoUrl: null,
  };
}

export const SECTORS = [
  "Education islamique",
  "Coaching",
  "Bien-etre",
  "Business",
  "Beaute",
  "Mode",
  "Fitness",
  "Cuisine",
  "Finance",
  "Marketing",
  "Immobilier",
  "Art",
  "Voyage",
  "Parentalite",
  "Tech",
] as const;

export const COMM_STYLES = [
  { id: "inspirant", label: "Inspirant" },
  { id: "expert", label: "Expert" },
  { id: "direct", label: "Direct" },
  { id: "bienveillant", label: "Bienveillant" },
  { id: "humoristique", label: "Humoristique" },
  { id: "authentique", label: "Authentique" },
  { id: "challenger", label: "Challenger" },
] as const;

export type ContentFormat = "carrousel" | "reel" | "story" | "image";

export interface TopicSuggestion {
  id: string;
  subject: string;
  hook: string;
  format: ContentFormat;
  formatScore: number;
  objective: string;
  reason: string;
}

export interface SlideContent {
  id: string;
  slideNumber: number;
  text: string;
  subtext?: string;
  color: string;
  fontSize: number;
}

export interface ContentSequence {
  id: string;
  subject: string;
  hook: string;
  cta: string;
  format: ContentFormat;
  slides: SlideContent[];
  caption: string;
  hashtags: string[];
  createdAt: number;
  scheduledDate?: string;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  contents: ContentSequence[];
}

// ── Scoped load/save (per project) ──

export function loadProfile(projectId?: string): CreatorProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  const key = projectId ? `studio_profile_${projectId}` : "studio_profile";
  const raw = localStorage.getItem(key);
  if (!raw) return DEFAULT_PROFILE;
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: CreatorProfile, projectId?: string) {
  const key = projectId ? `studio_profile_${projectId}` : "studio_profile";
  localStorage.setItem(key, JSON.stringify(profile));
  if (projectId) {
    await apiJson(`/api/workspaces/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify({ profile }),
    });
  }
}

export function loadSequences(projectId?: string): ContentSequence[] {
  if (typeof window === "undefined") return [];
  const key = projectId ? `studio_sequences_${projectId}` : "studio_sequences";
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSequences(
  sequences: ContentSequence[],
  projectId?: string,
) {
  const key = projectId ? `studio_sequences_${projectId}` : "studio_sequences";
  localStorage.setItem(key, JSON.stringify(sequences));
  if (projectId) {
    void apiJson(`/api/workspaces/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify({ sequences }),
    }).catch(() => undefined);
  }
}

function cacheCloudWorkspace(workspace: CloudWorkspaceRecord) {
  localStorage.setItem(
    `studio_profile_${workspace.id}`,
    JSON.stringify(workspace.profile),
  );
  localStorage.setItem(
    `studio_sequences_${workspace.id}`,
    JSON.stringify(workspace.sequences),
  );
}

function toStudioProject(workspace: CloudWorkspaceRecord): StudioProject {
  return {
    id: workspace.id,
    name: workspace.name,
    createdAt: Date.parse(workspace.createdAt) || Date.now(),
  };
}

async function migrateLocalWorkspaceData(remote: CloudWorkspaceRecord[]) {
  if (localStorage.getItem("studio_cloud_migrated_v1")) return remote;
  const local = loadStudioProjects();
  const updated = [...remote];

  for (const localProject of local) {
    let target = updated.find((item) => item.name === localProject.name);
    if (!target) {
      const created = await apiJson<{ workspace: CloudWorkspaceRecord }>(
        "/api/workspaces",
        { method: "POST", body: JSON.stringify({ name: localProject.name }) },
      );
      target = created.workspace;
      updated.push(target);
    }

    const profile = loadProfile(localProject.id);
    const sequences = loadSequences(localProject.id);
    const hasProfile = JSON.stringify(profile) !== JSON.stringify(DEFAULT_PROFILE);
    if (hasProfile || sequences.length > 0) {
      const result = await apiJson<{ workspace: CloudWorkspaceRecord }>(
        `/api/workspaces/${target.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ profile, sequences }),
        },
      );
      const index = updated.findIndex((item) => item.id === target?.id);
      updated[index] = result.workspace;
    }
  }
  localStorage.setItem("studio_cloud_migrated_v1", "1");
  return updated;
}

export async function syncStudioWorkspaceFromCloud(): Promise<StudioWorkspace> {
  const result = await apiJson<{ workspaces: CloudWorkspaceRecord[] }>(
    "/api/workspaces",
  );
  const workspaces = await migrateLocalWorkspaceData(result.workspaces);
  workspaces.forEach(cacheCloudWorkspace);
  const projects = workspaces.map(toStudioProject);
  saveStudioProjects(projects);
  const stored = getActiveProjectId();
  const activeProjectId = projects.some((project) => project.id === stored)
    ? (stored as string)
    : projects[0].id;
  setActiveProjectId(activeProjectId);
  return { projects, activeProjectId };
}

export async function createStudioProjectOnline(name: string) {
  const result = await apiJson<{ workspace: CloudWorkspaceRecord }>(
    "/api/workspaces",
    { method: "POST", body: JSON.stringify({ name }) },
  );
  cacheCloudWorkspace(result.workspace);
  return toStudioProject(result.workspace);
}

export async function renameStudioProjectOnline(id: string, name: string) {
  const result = await apiJson<{ workspace: CloudWorkspaceRecord }>(
    `/api/workspaces/${id}`,
    { method: "PATCH", body: JSON.stringify({ name }) },
  );
  return toStudioProject(result.workspace);
}

export async function duplicateStudioProjectOnline(id: string) {
  const result = await apiJson<{ workspace: CloudWorkspaceRecord }>(
    `/api/workspaces/${id}/duplicate`,
    { method: "POST" },
  );
  cacheCloudWorkspace(result.workspace);
  return toStudioProject(result.workspace);
}

export async function deleteStudioProjectOnline(id: string) {
  await apiJson(`/api/workspaces/${id}`, { method: "DELETE" });
  deleteStudioProject(id);
}

export async function restoreStudioProjectOnline(id: string) {
  const result = await apiJson<{ workspace: CloudWorkspaceRecord }>(
    `/api/workspaces/${id}/restore`,
    { method: "POST" },
  );
  cacheCloudWorkspace(result.workspace);
  return toStudioProject(result.workspace);
}

export async function importStudioProjectOnline(data: unknown) {
  const result = await apiJson<{ workspace: CloudWorkspaceRecord }>(
    "/api/workspaces/import",
    { method: "POST", body: JSON.stringify(data) },
  );
  cacheCloudWorkspace(result.workspace);
  return toStudioProject(result.workspace);
}
