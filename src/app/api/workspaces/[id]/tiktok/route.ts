import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError, badRequest } from "@/lib/server/http";
import {
  getTikTokCredentials,
  setTikTokCredentials,
} from "@/lib/server/workspaces";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const credentials = await getTikTokCredentials(user.id, id);
    if (!credentials) return NextResponse.json({ configured: false });
    const response = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      },
    );
    const result = (await response.json()) as {
      data?: { privacy_level_options?: string[]; creator_nickname?: string };
      error?: { code?: string; message?: string };
    };
    return NextResponse.json({
      configured: true,
      valid: response.ok && result.error?.code === "ok",
      privacyOptions: result.data?.privacy_level_options ?? [],
      nickname: result.data?.creator_nickname,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await request.json()) as { accessToken?: string };
    if (!body.accessToken) return badRequest("Token TikTok requis");
    await setTikTokCredentials(user.id, id, { accessToken: body.accessToken });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
