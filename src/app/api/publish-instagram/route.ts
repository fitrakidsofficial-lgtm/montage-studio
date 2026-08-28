import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import {
  getInstagramCredentials,
  getVideoProject,
  logPublication,
} from "@/lib/server/workspaces";

const GRAPH_VERSION = "v21.0";
const MEDIA_TYPES = ["REELS", "STORIES", "IMAGE", "CAROUSEL"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

async function graphFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${path}`,
    init,
  );
  return response.json() as Promise<T & { error?: { message?: string } }>;
}

function graphFailure(message = "Erreur Instagram") {
  return Object.assign(new Error(message), { status: 400 });
}

async function waitReady(containerId: string, token: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const data = await graphFetch<{ status_code?: string }>(
      `${containerId}?fields=status_code&access_token=${token}`,
    );
    const status = data.status_code || "FINISHED";
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw graphFailure(`Conteneur Instagram ${status.toLowerCase()}`);
    }
  }
  throw graphFailure("Instagram traite encore le média après 90 secondes");
}

async function publishCarousel(input: {
  userId: string;
  token: string;
  imageUrls: string[];
  caption: string;
}) {
  if (input.imageUrls.length < 2 || input.imageUrls.length > 10) {
    throw graphFailure("Un carrousel doit contenir entre 2 et 10 images");
  }
  const childIds: string[] = [];
  for (const imageUrl of input.imageUrls) {
    const child = await graphFetch<{ id?: string }>(`${input.userId}/media`, {
      method: "POST",
      body: new URLSearchParams({
        image_url: imageUrl,
        is_carousel_item: "true",
        access_token: input.token,
      }),
    });
    if (child.error || !child.id) throw graphFailure(child.error?.message);
    childIds.push(child.id);
  }
  await Promise.all(childIds.map((id) => waitReady(id, input.token)));

  const parent = await graphFetch<{ id?: string }>(`${input.userId}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "CAROUSEL",
      caption: input.caption,
      children: childIds.join(","),
      access_token: input.token,
    }),
  });
  if (parent.error || !parent.id) throw graphFailure(parent.error?.message);
  await waitReady(parent.id, input.token);
  const publication = await graphFetch<{ id?: string }>(
    `${input.userId}/media_publish`,
    {
      method: "POST",
      body: new URLSearchParams({
        creation_id: parent.id,
        access_token: input.token,
      }),
    },
  );
  if (publication.error || !publication.id) {
    throw graphFailure(publication.error?.message);
  }
  return { id: publication.id, permalink: undefined as string | undefined };
}

async function publishSingle(input: {
  userId: string;
  token: string;
  mediaUrl: string;
  caption: string;
  mediaType: Exclude<MediaType, "CAROUSEL">;
}) {
  if (!input.mediaUrl.startsWith("https://")) {
    throw graphFailure("Le média doit avoir une URL publique HTTPS");
  }
  const params = new URLSearchParams({
    access_token: input.token,
    caption: input.caption,
  });
  if (input.mediaType === "REELS") {
    params.set("media_type", "REELS");
    params.set("video_url", input.mediaUrl);
    params.set("share_to_feed", "true");
  } else if (input.mediaType === "STORIES") {
    params.set("media_type", "STORIES");
    params.set(
      /\.(mp4|mov|webm)(\?|$)/i.test(input.mediaUrl) ? "video_url" : "image_url",
      input.mediaUrl,
    );
  } else {
    params.set("image_url", input.mediaUrl);
  }

  const container = await graphFetch<{ id?: string }>(`${input.userId}/media`, {
    method: "POST",
    body: params,
  });
  if (container.error || !container.id) throw graphFailure(container.error?.message);
  if (input.mediaType === "REELS" || input.mediaType === "STORIES") {
    await waitReady(container.id, input.token);
  }
  const publication = await graphFetch<{ id?: string }>(
    `${input.userId}/media_publish`,
    {
      method: "POST",
      body: new URLSearchParams({
        creation_id: container.id,
        access_token: input.token,
      }),
    },
  );
  if (publication.error || !publication.id) {
    throw graphFailure(publication.error?.message);
  }
  const metadata: { permalink?: string } = await graphFetch<{
    permalink?: string;
  }>(
    `${publication.id}?fields=permalink&access_token=${input.token}`,
  ).catch(() => ({}));
  return { id: publication.id, permalink: metadata.permalink };
}

export async function POST(request: Request) {
  let ownerId: string | undefined;
  let workspaceId: string | undefined;
  let videoProjectId: string | undefined;
  let mediaType: MediaType = "REELS";
  try {
    const user = await requireUser();
    ownerId = user.id;
    const body = (await request.json()) as {
      projectId?: string;
      videoProjectId?: string;
      mediaUrl?: string;
      imageUrls?: string[];
      caption?: string;
      mediaType?: string;
    };
    if (!body.projectId) throw graphFailure("Projet de marque requis");
    workspaceId = body.projectId;
    videoProjectId = body.videoProjectId;
    if (!MEDIA_TYPES.includes(body.mediaType as MediaType)) {
      throw graphFailure("Format Instagram invalide");
    }
    mediaType = body.mediaType as MediaType;
    if (videoProjectId) {
      const montage = await getVideoProject(user.id, videoProjectId);
      if (montage.studioProjectId !== workspaceId) {
        throw graphFailure("Ce montage n’appartient pas au projet sélectionné");
      }
    }
    const credentials = await getInstagramCredentials(user.id, workspaceId);
    if (!credentials) {
      throw graphFailure("Configure d’abord le compte Instagram de ce projet");
    }
    const caption = body.caption?.slice(0, 2200) ?? "";
    const publication =
      mediaType === "CAROUSEL"
        ? await publishCarousel({
            ...credentials,
            token: credentials.accessToken,
            imageUrls: body.imageUrls ?? [],
            caption,
          })
        : await publishSingle({
            ...credentials,
            token: credentials.accessToken,
            mediaUrl: body.mediaUrl ?? "",
            caption,
            mediaType,
          });
    await logPublication({
      ownerId,
      workspaceId,
      videoProjectId,
      mediaType,
      externalId: publication.id,
      permalink: publication.permalink,
      status: "published",
    });
    return NextResponse.json({
      success: true,
      mediaId: publication.id,
      permalink: publication.permalink,
      message: `Publié sur Instagram (${mediaType})`,
    });
  } catch (error) {
    if (ownerId && workspaceId) {
      await logPublication({
        ownerId,
        workspaceId,
        videoProjectId,
        mediaType,
        status: "failed",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }).catch(() => undefined);
    }
    return apiError(error);
  }
}
