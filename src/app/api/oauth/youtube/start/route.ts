import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { encryptJson } from "@/lib/server/crypto";
import { apiError } from "@/lib/server/http";
import { getWorkspace } from "@/lib/server/workspaces";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId");
    const returnTo = url.searchParams.get("returnTo") || "/studio";
    if (!workspaceId) {
      throw Object.assign(new Error("Projet requis"), { status: 400 });
    }
    await getWorkspace(user.id, workspaceId);
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    if (!clientId) throw new Error("YOUTUBE_CLIENT_ID manquante");
    const redirectUri =
      process.env.YOUTUBE_REDIRECT_URI || `${url.origin}/api/oauth/youtube/callback`;
    const safeReturnTo =
      returnTo.startsWith("/editor/") || returnTo === "/studio"
        ? returnTo
        : "/studio";
    const state = encryptJson({
      userId: user.id,
      workspaceId,
      returnTo: safeReturnTo,
      expiresAt: Date.now() + 10 * 60_000,
    });
    const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorize.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    }).toString();
    return NextResponse.redirect(authorize);
  } catch (error) {
    return apiError(error);
  }
}
