import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { decryptJson } from "@/lib/server/crypto";
import { apiError } from "@/lib/server/http";
import { setTikTokCredentials } from "@/lib/server/workspaces";

interface TikTokState {
  userId: string;
  workspaceId: string;
  returnTo: string;
  expiresAt: number;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const stateValue = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error_description");
    if (oauthError) throw Object.assign(new Error(oauthError), { status: 400 });
    if (!code || !stateValue) {
      throw Object.assign(new Error("Réponse TikTok incomplète"), { status: 400 });
    }
    const state = decryptJson<TikTokState>(stateValue);
    if (state.userId !== user.id || state.expiresAt < Date.now()) {
      throw Object.assign(new Error("Autorisation TikTok expirée"), { status: 400 });
    }
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) {
      throw new Error("Identifiants développeur TikTok manquants");
    }
    const redirectUri =
      process.env.TIKTOK_REDIRECT_URI || `${url.origin}/api/oauth/tiktok/callback`;
    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const token = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      open_id?: string;
      scope?: string;
      error_description?: string;
    };
    if (!response.ok || !token.access_token) {
      throw Object.assign(
        new Error(token.error_description || "Connexion TikTok refusée"),
        { status: 400 },
      );
    }
    await setTikTokCredentials(user.id, state.workspaceId, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in ?? 86_400) * 1000,
      openId: token.open_id,
      scope: token.scope,
    });
    const redirect = new URL(state.returnTo, url.origin);
    redirect.searchParams.set("tiktok", "connected");
    return NextResponse.redirect(redirect);
  } catch (error) {
    return apiError(error);
  }
}
