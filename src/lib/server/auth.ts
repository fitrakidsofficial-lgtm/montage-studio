import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { db, ensureSchema } from "./db";

const COOKIE_NAME = "montage_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

export interface AuthUser {
  id: string;
  email: string;
}

interface SessionPayload extends AuthUser {
  exp: number;
}

export class UnauthorizedError extends Error {
  status = 401;
}

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("AUTH_SECRET doit contenir au moins 24 caracteres");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.id || !payload.email || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateCredentials(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw Object.assign(new Error("Adresse email invalide"), { status: 400 });
  }
  if (password.length < 10) {
    throw Object.assign(
      new Error("Le mot de passe doit contenir au moins 10 caracteres"),
      { status: 400 },
    );
  }
  return normalized;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltValue, hashValue] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const actual = scryptSync(
    password,
    Buffer.from(saltValue, "base64url"),
    expected.length,
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createUser(email: string, password: string) {
  await ensureSchema();
  const normalized = validateCredentials(email, password);
  const user: AuthUser = { id: randomUUID(), email: normalized };
  try {
    await db()`
      insert into montage_users (id, email, password_hash)
      values (${user.id}, ${user.email}, ${hashPassword(password)})
    `;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw Object.assign(
        new Error("Un compte existe deja avec cette adresse"),
        { status: 400 },
      );
    }
    throw error;
  }
  return user;
}

export async function authenticateUser(
  email: string,
  password: string,
  fingerprint = "unknown",
) {
  await ensureSchema();
  const normalized = normalizeEmail(email);
  const rateKey = createHash("sha256")
    .update(`${normalized}|${fingerprint}`)
    .digest("hex");
  const attempts = await db()<[{ count: string }]>`
    select count(*)::text as count
    from montage_auth_attempts
    where rate_key = ${rateKey}
      and attempted_at > now() - interval '15 minutes'
  `;
  if (Number(attempts[0].count) >= 10) {
    throw Object.assign(
      new Error("Trop de tentatives. Réessaie dans 15 minutes."),
      { status: 429 },
    );
  }
  const rows = await db()<
    { id: string; email: string; password_hash: string }[]
  >`
    select id, email, password_hash
    from montage_users
    where email = ${normalized}
    limit 1
  `;
  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) {
    await db()`
      insert into montage_auth_attempts (rate_key) values (${rateKey})
    `;
    throw new UnauthorizedError("Email ou mot de passe incorrect");
  }
  await db()`delete from montage_auth_attempts where rate_key = ${rateKey}`;
  return { id: row.id, email: row.email } satisfies AuthUser;
}

export async function setSession(user: AuthUser) {
  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_NAME,
    encodeSession({
      ...user,
      exp: Date.now() + SESSION_DURATION_SECONDS * 1000,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
      priority: "high",
    },
  );
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = decodeSession(token);
  return session ? { id: session.id, email: session.email } : null;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) throw new UnauthorizedError("Authentification requise");
  return user;
}

export function encryptionKey() {
  return createHash("sha256").update(authSecret()).digest();
}
