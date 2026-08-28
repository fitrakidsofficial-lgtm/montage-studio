import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;
let schemaPromise: Promise<void> | undefined;

export function db() {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquante");
  }
  client ??= postgres(connectionString, {
    max: 4,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
    ssl: connectionString.includes("sslmode=") ? undefined : "require",
  });
  return client;
}

export function ensureSchema() {
  schemaPromise ??= (async () => {
    const sql = db();
    await sql`
      create table if not exists montage_users (
        id text primary key,
        email text not null unique,
        password_hash text not null,
        created_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists montage_workspaces (
        id text primary key,
        owner_id text not null references montage_users(id) on delete cascade,
        name text not null,
        profile jsonb not null default '{}'::jsonb,
        sequences jsonb not null default '[]'::jsonb,
        dm_config jsonb not null default '{}'::jsonb,
        instagram_config text,
        tiktok_config text,
        youtube_config text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        deleted_at timestamptz
      )
    `;
    await sql`
      create table if not exists montage_auth_attempts (
        id bigserial primary key,
        rate_key text not null,
        attempted_at timestamptz not null default now()
      )
    `;
    await sql`
      create index if not exists montage_auth_attempts_rate_idx
      on montage_auth_attempts(rate_key, attempted_at desc)
    `;
    await sql`
      alter table montage_workspaces
      add column if not exists deleted_at timestamptz
    `;
    await sql`
      alter table montage_workspaces
      add column if not exists tiktok_config text
    `;
    await sql`
      alter table montage_workspaces
      add column if not exists youtube_config text
    `;
    await sql`
      create index if not exists montage_workspaces_owner_idx
      on montage_workspaces(owner_id, created_at)
    `;
    await sql`
      create table if not exists montage_video_projects (
        id text primary key,
        owner_id text not null references montage_users(id) on delete cascade,
        workspace_id text references montage_workspaces(id) on delete set null,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
    await sql`
      create index if not exists montage_video_projects_owner_idx
      on montage_video_projects(owner_id, updated_at desc)
    `;
    await sql`
      create table if not exists montage_publications (
        id text primary key,
        owner_id text not null references montage_users(id) on delete cascade,
        workspace_id text references montage_workspaces(id) on delete set null,
        video_project_id text references montage_video_projects(id) on delete set null,
        platform text not null,
        media_type text not null,
        external_id text,
        permalink text,
        status text not null,
        error text,
        created_at timestamptz not null default now()
      )
    `;
  })().catch((error) => {
    schemaPromise = undefined;
    throw error;
  });
  return schemaPromise;
}
