import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import {
  deleteVideoProject,
  getVideoProject,
  saveVideoProject,
} from "@/lib/server/workspaces";
import type { VideoProject } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ project: await getVideoProject(user.id, id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await request.json()) as { project: VideoProject };
    if (body.project.id !== id) {
      return NextResponse.json({ error: "Identifiant incoherent" }, { status: 400 });
    }
    return NextResponse.json({ project: await saveVideoProject(user.id, body.project) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteVideoProject(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
