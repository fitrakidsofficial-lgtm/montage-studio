import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { decryptJson } from "@/lib/server/crypto";
import { apiError } from "@/lib/server/http";
import { setYouTubeCredentials } from "@/lib/server/workspaces";

interface YouTubeState {
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
    if (!code || !stateValue) {
      throw Object.assign(new Error("Réponse Google incomplète"), { status: 400 });
    }
    const state = decryptJson<YouTubeState>(stateValue);
    if (state.userId !== user.id || state.expiresAt < Date.now()) {
      throw Object.assign(new Error("Autorisation YouTube expirée"), { status: 400 });
    }
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Identifiants développeur YouTube manquants");
    }
    const redirectUri =
      process.env.YOUTUBE_REDIRECT_URI || `${url.origin}/api/oauth/youtube/callback`;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
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
      error_description?: string;
    };
    if (!response.ok || !token.access_token || !token.refresh_token) {
      throw Object.assign(
        new Error(token.error_description || "Connexion YouTube refusée"),
        { status: 400 },
      );
    }
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    const channels = (await channelResponse.json()) as { items?: { id: string }[] };
    await setYouTubeCredentials(user.id, state.workspaceId, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      channelId: channels.items?.[0]?.id,
    });
    const redirect = new URL(state.returnTo, url.origin);
    redirect.searchParams.set("youtube", "connected");
    return NextResponse.redirect(redirect);
  } catch (error) {
    return apiError(error);
  }
}
