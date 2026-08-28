import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import {
  getTikTokCredentials,
  getVideoProject,
  logPublication,
} from "@/lib/server/workspaces";

export async function POST(request: Request) {
  let ownerId: string | undefined;
  let workspaceId: string | undefined;
  let videoProjectId: string | undefined;
  try {
    const user = await requireUser();
    ownerId = user.id;
    const body = (await request.json()) as {
      projectId?: string;
      videoProjectId?: string;
      videoUrl?: string;
      title?: string;
      privacyLevel?: string;
    };
    workspaceId = body.projectId;
    videoProjectId = body.videoProjectId;
    if (!workspaceId || !videoProjectId) {
      throw Object.assign(new Error("Projet et montage requis"), { status: 400 });
    }
    if (!body.videoUrl?.startsWith("https://")) {
      throw Object.assign(new Error("URL vidéo publique HTTPS requise"), {
        status: 400,
      });
    }
    const montage = await getVideoProject(user.id, videoProjectId);
    if (montage.studioProjectId !== workspaceId) {
      throw Object.assign(new Error("Montage rattaché à un autre projet"), {
        status: 400,
      });
    }
    const credentials = await getTikTokCredentials(user.id, workspaceId);
    if (!credentials) {
      throw Object.assign(new Error("Configure d’abord TikTok pour ce projet"), {
        status: 400,
      });
    }
    const response = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: body.title?.slice(0, 2200) ?? "",
            privacy_level: body.privacyLevel,
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: body.videoUrl,
          },
        }),
      },
    );
    const result = (await response.json()) as {
      data?: { publish_id?: string };
      error?: { code?: string; message?: string };
    };
    if (!response.ok || result.error?.code !== "ok" || !result.data?.publish_id) {
      throw Object.assign(
        new Error(result.error?.message || result.error?.code || "Erreur TikTok"),
        { status: 400 },
      );
    }
    await logPublication({
      ownerId,
      workspaceId,
      videoProjectId,
      platform: "tiktok",
      mediaType: "VIDEO",
      externalId: result.data.publish_id,
      status: "published",
    });
    return NextResponse.json({
      success: true,
      publishId: result.data.publish_id,
      message: "Extrait envoyé à TikTok",
    });
  } catch (error) {
    if (ownerId && workspaceId) {
      await logPublication({
        ownerId,
        workspaceId,
        videoProjectId,
        platform: "tiktok",
        mediaType: "VIDEO",
        status: "failed",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }).catch(() => undefined);
    }
    return apiError(error);
  }
}
