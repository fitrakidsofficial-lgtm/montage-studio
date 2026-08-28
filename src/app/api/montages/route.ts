import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { listVideoProjects, saveVideoProject } from "@/lib/server/workspaces";
import type { VideoProject } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(
      { projects: await listVideoProjects(user.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { project: VideoProject };
    return NextResponse.json(
      { project: await saveVideoProject(user.id, body.project) },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
