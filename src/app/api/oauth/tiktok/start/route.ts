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
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) throw new Error("TIKTOK_CLIENT_KEY manquante");
    const redirectUri =
      process.env.TIKTOK_REDIRECT_URI || `${url.origin}/api/oauth/tiktok/callback`;
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
    const authorize = new URL("https://www.tiktok.com/v2/auth/authorize/");
    authorize.search = new URLSearchParams({
      client_key: clientKey,
      response_type: "code",
      scope: "user.info.basic,video.publish,video.upload",
      redirect_uri: redirectUri,
      state,
    }).toString();
    return NextResponse.redirect(authorize);
  } catch (error) {
    return apiError(error);
  }
}
