import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import {
  getVideoProject,
  getYouTubeCredentials,
  logPublication,
} from "@/lib/server/workspaces";

export const maxDuration = 300;

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
      description?: string;
      privacyStatus?: "private" | "unlisted" | "public";
    };
    workspaceId = body.projectId;
    videoProjectId = body.videoProjectId;
    if (!workspaceId || !videoProjectId || !body.videoUrl?.startsWith("https://")) {
      throw Object.assign(new Error("Projet et vidéo cloud HTTPS requis"), {
        status: 400,
      });
    }
    const montage = await getVideoProject(user.id, videoProjectId);
    if (montage.studioProjectId !== workspaceId) {
      throw Object.assign(new Error("Montage rattaché à un autre projet"), {
        status: 400,
      });
    }
    const credentials = await getYouTubeCredentials(user.id, workspaceId);
    if (!credentials) {
      throw Object.assign(new Error("Connecte d’abord la chaîne YouTube"), {
        status: 400,
      });
    }
    const videoResponse = await fetch(body.videoUrl);
    if (!videoResponse.ok) {
      throw Object.assign(new Error("Vidéo cloud inaccessible"), { status: 400 });
    }
    const contentType = videoResponse.headers.get("content-type") || "video/mp4";
    const bytes = Buffer.from(await videoResponse.arrayBuffer());
    if (bytes.byteLength > 512 * 1024 * 1024) {
      throw Object.assign(new Error("Vidéo trop volumineuse pour cet envoi"), {
        status: 400,
      });
    }
    const metadata = {
      snippet: {
        title: (body.title || montage.name).slice(0, 100),
        description: (body.description || "").slice(0, 5000),
        categoryId: "27",
      },
      status: { privacyStatus: body.privacyStatus || "private" },
    };
    const session = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(bytes.byteLength),
          "X-Upload-Content-Type": contentType,
        },
        body: JSON.stringify(metadata),
      },
    );
    const uploadUrl = session.headers.get("location");
    if (!session.ok || !uploadUrl) {
      const detail = await session.text();
      throw Object.assign(new Error(`YouTube refuse l’envoi : ${detail.slice(0, 300)}`), {
        status: 400,
      });
    }
    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
      },
      body: bytes,
    });
    const result = (await upload.json()) as { id?: string; error?: { message?: string } };
    if (!upload.ok || !result.id) {
      throw Object.assign(new Error(result.error?.message || "Échec upload YouTube"), {
        status: 400,
      });
    }
    const youtubeUrl = `https://youtu.be/${result.id}`;
    await logPublication({
      ownerId,
      workspaceId,
      videoProjectId,
      platform: "youtube",
      mediaType: "VIDEO",
      externalId: result.id,
      permalink: youtubeUrl,
      status: "published",
    });
    return NextResponse.json({ success: true, videoId: result.id, youtubeUrl });
  } catch (error) {
    if (ownerId && workspaceId) {
      await logPublication({
        ownerId,
        workspaceId,
        videoProjectId,
        platform: "youtube",
        mediaType: "VIDEO",
        status: "failed",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }).catch(() => undefined);
    }
    return apiError(error);
  }
}
