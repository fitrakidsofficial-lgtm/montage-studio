import { randomUUID } from "node:crypto";
import {
  DEFAULT_PROFILE,
  DEFAULT_STUDIO_PROJECT_NAMES,
  type ContentSequence,
  type CreatorProfile,
} from "@/lib/studio-types";
import type { BrandConfig, VideoProject } from "@/lib/types";
import { db, ensureSchema } from "./db";
import { decryptJson, encryptJson } from "./crypto";

export interface InstagramCredentials {
  accessToken: string;
  userId: string;
}

export interface TikTokCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  openId?: string;
  scope?: string;
}

export interface YouTubeCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  channelId?: string;
}

export interface WorkspaceRecord {
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

interface WorkspaceRow {
  id: string;
  name: string;
  profile: CreatorProfile;
  sequences: ContentSequence[];
  dm_config: Record<string, unknown>;
  instagram_config: string | null;
  tiktok_config: string | null;
  youtube_config: string | null;
  created_at: Date;
  updated_at: Date;
}

function normalizeProfile(profile: Partial<CreatorProfile> | null | undefined) {
  return {
    ...DEFAULT_PROFILE,
    ...(profile ?? {}),
    colors: Array.isArray(profile?.colors)
      ? profile.colors.slice(0, 5)
      : DEFAULT_PROFILE.colors,
    fonts: { ...DEFAULT_PROFILE.fonts, ...(profile?.fonts ?? {}) },
  } satisfies CreatorProfile;
}

export function profileToBrand(profile: CreatorProfile): BrandConfig {
  const colors = [...profile.colors, ...DEFAULT_PROFILE.colors].slice(0, 5);
  return {
    colors: {
      teal: colors[0] ?? "#2E7D6C",
      gold: colors[1] ?? "#C8972A",
      orange: colors[2] ?? "#F28A4B",
      cream: colors[3] ?? "#FAF4E8",
      night: colors[4] ?? "#123C43",
    },
    fonts: {
      title: profile.fonts.heading || "Luckiest Guy",
      body: profile.fonts.body || "Itim",
      arabic: "Noto Sans Arabic",
    },
    logoUrl: null,
  };
}

function serializeWorkspace(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    profile: normalizeProfile(row.profile),
    sequences: Array.isArray(row.sequences) ? row.sequences : [],
    dmConfig: row.dm_config ?? {},
    instagramConfigured: Boolean(row.instagram_config),
    tiktokConfigured: Boolean(row.tiktok_config),
    youtubeConfigured: Boolean(row.youtube_config),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createWorkspace(
  ownerId: string,
  name: string,
  data?: {
    profile?: Partial<CreatorProfile>;
    sequences?: ContentSequence[];
    dmConfig?: Record<string, unknown>;
  },
) {
  await ensureSchema();
  const trimmedName = name.trim();
  if (!trimmedName) throw Object.assign(new Error("Nom requis"), { status: 400 });
  const id = randomUUID();
  const rows = await db()<WorkspaceRow[]>`
    insert into montage_workspaces (
      id, owner_id, name, profile, sequences, dm_config
    ) values (
      ${id},
      ${ownerId},
      ${trimmedName},
      ${db().json(JSON.parse(JSON.stringify(normalizeProfile(data?.profile))))},
      ${db().json(JSON.parse(JSON.stringify(data?.sequences ?? [])))},
      ${db().json(JSON.parse(JSON.stringify(data?.dmConfig ?? {})))}
    )
    returning id, name, profile, sequences, dm_config, instagram_config,
      tiktok_config, youtube_config,
      created_at, updated_at
  `;
  return serializeWorkspace(rows[0]);
}

export async function listWorkspaces(ownerId: string) {
  await ensureSchema();
  let rows = await db()<WorkspaceRow[]>`
    select id, name, profile, sequences, dm_config, instagram_config,
      tiktok_config, youtube_config,
      created_at, updated_at
    from montage_workspaces
    where owner_id = ${ownerId} and deleted_at is null
    order by created_at asc
  `;
  if (rows.length === 0) {
    for (const name of DEFAULT_STUDIO_PROJECT_NAMES) {
      await createWorkspace(ownerId, name);
    }
    rows = await db()<WorkspaceRow[]>`
      select id, name, profile, sequences, dm_config, instagram_config,
        tiktok_config, youtube_config,
        created_at, updated_at
      from montage_workspaces
      where owner_id = ${ownerId} and deleted_at is null
      order by created_at asc
    `;
  }
  return rows.map(serializeWorkspace);
}

export async function getWorkspace(ownerId: string, id: string) {
  await ensureSchema();
  const rows = await db()<WorkspaceRow[]>`
    select id, name, profile, sequences, dm_config, instagram_config,
      tiktok_config, youtube_config,
      created_at, updated_at
    from montage_workspaces
    where id = ${id} and owner_id = ${ownerId} and deleted_at is null
    limit 1
  `;
  if (!rows[0]) throw Object.assign(new Error("Projet introuvable"), { status: 404 });
  return serializeWorkspace(rows[0]);
}

export async function updateWorkspace(
  ownerId: string,
  id: string,
  patch: {
    name?: string;
    profile?: Partial<CreatorProfile>;
    sequences?: ContentSequence[];
    dmConfig?: Record<string, unknown>;
  },
) {
  const current = await getWorkspace(ownerId, id);
  const name = patch.name?.trim() || current.name;
  const profile = patch.profile
    ? normalizeProfile({ ...current.profile, ...patch.profile })
    : current.profile;
  const sequences = patch.sequences ?? current.sequences;
  const dmConfig = patch.dmConfig ?? current.dmConfig;
  const rows = await db()<WorkspaceRow[]>`
    update montage_workspaces
    set name = ${name},
        profile = ${db().json(JSON.parse(JSON.stringify(profile)))},
        sequences = ${db().json(JSON.parse(JSON.stringify(sequences)))},
        dm_config = ${db().json(JSON.parse(JSON.stringify(dmConfig)))},
        updated_at = now()
    where id = ${id} and owner_id = ${ownerId} and deleted_at is null
    returning id, name, profile, sequences, dm_config, instagram_config,
      tiktok_config, youtube_config,
      created_at, updated_at
  `;

  if (patch.profile) {
    const brand = profileToBrand(profile);
    await db()`
      update montage_video_projects
      set data = jsonb_set(
        data,
        '{brand}',
        ${db().json(JSON.parse(JSON.stringify(brand)))}::jsonb,
        true
      ),
          updated_at = now()
      where workspace_id = ${id} and owner_id = ${ownerId}
    `;
  }
  return serializeWorkspace(rows[0]);
}

export async function deleteWorkspace(ownerId: string, id: string) {
  await ensureSchema();
  const countRows = await db()<[{ count: string }]>`
    select count(*)::text as count
    from montage_workspaces
    where owner_id = ${ownerId} and deleted_at is null
  `;
  if (Number(countRows[0].count) <= 1) {
    throw Object.assign(new Error("Le dernier projet ne peut pas etre supprime"), {
      status: 400,
    });
  }
  const result = await db()`
    update montage_workspaces
    set deleted_at = now(), updated_at = now()
    where id = ${id} and owner_id = ${ownerId} and deleted_at is null
    returning id
  `;
  if (result.length === 0) {
    throw Object.assign(new Error("Projet introuvable"), { status: 404 });
  }
}

export async function duplicateWorkspace(ownerId: string, id: string) {
  const source = await getWorkspace(ownerId, id);
  const duplicate = await createWorkspace(ownerId, `${source.name} - copie`, {
    profile: source.profile,
    sequences: source.sequences.map((sequence) => ({
      ...sequence,
      id: `seq-${randomUUID()}`,
      createdAt: Date.now(),
    })),
    dmConfig: source.dmConfig,
  });
  const projects = (await listVideoProjects(ownerId)).filter(
    (project) => project.studioProjectId === id,
  );
  for (const project of projects) {
    await saveVideoProject(ownerId, {
      ...project,
      id: randomUUID(),
      name: `${project.name} - copie`,
      studioProjectId: duplicate.id,
    });
  }
  return duplicate;
}

export async function restoreWorkspace(ownerId: string, id: string) {
  await ensureSchema();
  const rows = await db()<WorkspaceRow[]>`
    update montage_workspaces
    set deleted_at = null, updated_at = now()
    where id = ${id} and owner_id = ${ownerId} and deleted_at is not null
    returning id, name, profile, sequences, dm_config, instagram_config,
      tiktok_config, youtube_config,
      created_at, updated_at
  `;
  if (!rows[0]) throw Object.assign(new Error("Projet introuvable"), { status: 404 });
  return serializeWorkspace(rows[0]);
}

export async function setInstagramCredentials(
  ownerId: string,
  id: string,
  credentials: InstagramCredentials,
) {
  await getWorkspace(ownerId, id);
  if (!credentials.accessToken.trim() || !credentials.userId.trim()) {
    throw Object.assign(new Error("Token et identifiant Instagram requis"), {
      status: 400,
    });
  }
  await db()`
    update montage_workspaces
    set instagram_config = ${encryptJson(credentials)}, updated_at = now()
    where id = ${id} and owner_id = ${ownerId} and deleted_at is null
  `;
}

export async function getInstagramCredentials(ownerId: string, id: string) {
  await ensureSchema();
  const rows = await db()<[{ instagram_config: string | null }]>`
    select instagram_config
    from montage_workspaces
    where id = ${id} and owner_id = ${ownerId} and deleted_at is null
    limit 1
  `;
  if (!rows[0]) throw Object.assign(new Error("Projet introuvable"), { status: 404 });
  return rows[0].instagram_config
    ? decryptJson<InstagramCredentials>(rows[0].instagram_config)
    : null;
}

export async function setTikTokCredentials(
  ownerId: string,
  id: string,
  credentials: TikTokCredentials,
) {
  await getWorkspace(ownerId, id);
  if (!credentials.accessToken.trim()) {
    throw Object.assign(new Error("Token TikTok requis"), { status: 400 });
  }
  await db()`
    update montage_workspaces
    set tiktok_config = ${encryptJson(credentials)}, updated_at = now()
    where id = ${id} and owner_id = ${ownerId} and deleted_at is null
  `;
}

export async function getTikTokCredentials(ownerId: string, id: string) {
  await ensureSchema();
  const rows = await db()<[{ tiktok_config: string | null }]>`
    select tiktok_config
    from montage_workspaces
    where id = ${id} and owner_id = ${ownerId} and deleted_at is null
    limit 1
  `;
  if (!rows[0]) throw Object.assign(new Error("Projet introuvable"), { status: 404 });
  const credentials = rows[0].tiktok_config
    ? decryptJson<TikTokCredentials>(rows[0].tiktok_config)
    : null;
  if (
    credentials?.refreshToken &&
    credentials.expiresAt &&
    credentials.expiresAt <= Date.now() + 60_000 &&
    process.env.TIKTOK_CLIENT_KEY &&
    process.env.TIKTOK_CLIENT_SECRET
  ) {
    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: credentials.refreshToken,
      }),
    });
    const refreshed = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      open_id?: string;
      scope?: string;
    };
    if (response.ok && refreshed.access_token) {
      const next: TikTokCredentials = {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? credentials.refreshToken,
        expiresAt: Date.now() + (refreshed.expires_in ?? 86_400) * 1000,
        openId: refreshed.open_id ?? credentials.openId,
        scope: refreshed.scope ?? credentials.scope,
      };
      await setTikTokCredentials(ownerId, id, next);
      return next;
    }
  }
  return credentials;
}

export async function setYouTubeCredentials(
  ownerId: string,
  id: string,
  credentials: YouTubeCredentials,
) {
  await getWorkspace(ownerId, id);
  await db()`
    update montage_workspaces
    set youtube_config = ${encryptJson(credentials)}, updated_at = now()
    where id = ${id} and owner_id = ${ownerId} and deleted_at is null
  `;
}

export async function getYouTubeCredentials(ownerId: string, id: string) {
  await ensureSchema();
  const rows = await db()<[{ youtube_config: string | null }]>`
    select youtube_config
    from montage_workspaces
    where id = ${id} and owner_id = ${ownerId} and deleted_at is null
    limit 1
  `;
  if (!rows[0]) throw Object.assign(new Error("Projet introuvable"), { status: 404 });
  if (!rows[0].youtube_config) return null;
  const credentials = decryptJson<YouTubeCredentials>(rows[0].youtube_config);
  if (credentials.expiresAt > Date.now() + 60_000) return credentials;
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Configuration développeur YouTube manquante");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const token = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !token.access_token) {
    throw Object.assign(
      new Error(token.error_description || "Reconnexion YouTube requise"),
      { status: 400 },
    );
  }
  const refreshed = {
    ...credentials,
    accessToken: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };
  await setYouTubeCredentials(ownerId, id, refreshed);
  return refreshed;
}

export async function listVideoProjects(ownerId: string) {
  await ensureSchema();
  const rows = await db()<
    { id: string; workspace_id: string | null; data: VideoProject }[]
  >`
    select id, workspace_id, data
    from montage_video_projects
    where owner_id = ${ownerId}
    order by updated_at desc
  `;
  return rows.map((row) => normalizeVideoProject(row.data, row.id, row.workspace_id));
}

function normalizeVideoProject(
  project: VideoProject,
  id: string,
  workspaceId: string | null,
): VideoProject {
  return {
    ...project,
    id,
    studioProjectId: workspaceId,
    youtubeUrl: project.youtubeUrl ?? "",
    trailerDurationSeconds: project.trailerDurationSeconds ?? 30,
    trailerCta:
      project.trailerCta ?? "Voir la vidéo complète sur YouTube — lien en bio.",
    fullVideoUrl: project.fullVideoUrl ?? "",
    trailerVideoUrl: project.trailerVideoUrl ?? "",
  };
}

export async function getVideoProject(ownerId: string, id: string) {
  await ensureSchema();
  const rows = await db()<
    { id: string; workspace_id: string | null; data: VideoProject }[]
  >`
    select id, workspace_id, data
    from montage_video_projects
    where id = ${id} and owner_id = ${ownerId}
    limit 1
  `;
  if (!rows[0]) throw Object.assign(new Error("Montage introuvable"), { status: 404 });
  return normalizeVideoProject(
    rows[0].data,
    rows[0].id,
    rows[0].workspace_id,
  );
}

export async function saveVideoProject(ownerId: string, project: VideoProject) {
  await ensureSchema();
  const workspaceId = project.studioProjectId ?? null;
  if (workspaceId) await getWorkspace(ownerId, workspaceId);
  const data = { ...project, studioProjectId: workspaceId };
  await db()`
    insert into montage_video_projects (id, owner_id, workspace_id, data)
    values (
      ${project.id}, ${ownerId}, ${workspaceId},
      ${db().json(JSON.parse(JSON.stringify(data)))}
    )
    on conflict (id) do update
    set workspace_id = excluded.workspace_id,
        data = excluded.data,
        updated_at = now()
    where montage_video_projects.owner_id = ${ownerId}
  `;
  return data;
}

export async function deleteVideoProject(ownerId: string, id: string) {
  await ensureSchema();
  await db()`
    delete from montage_video_projects
    where id = ${id} and owner_id = ${ownerId}
  `;
}

export async function logPublication(input: {
  ownerId: string;
  workspaceId: string;
  videoProjectId?: string;
  mediaType: string;
  platform?: "instagram" | "tiktok" | "youtube";
  externalId?: string;
  permalink?: string;
  status: "published" | "failed";
  error?: string;
}) {
  await ensureSchema();
  await db()`
    insert into montage_publications (
      id, owner_id, workspace_id, video_project_id, platform, media_type,
      external_id, permalink, status, error
    ) values (
      ${randomUUID()}, ${input.ownerId}, ${input.workspaceId},
      ${input.videoProjectId ?? null}, ${input.platform ?? "instagram"},
      ${input.mediaType},
      ${input.externalId ?? null}, ${input.permalink ?? null}, ${input.status},
      ${input.error ?? null}
    )
  `;
}
