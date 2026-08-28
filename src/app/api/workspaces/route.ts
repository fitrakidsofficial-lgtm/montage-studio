import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError, badRequest } from "@/lib/server/http";
import { createWorkspace, listWorkspaces } from "@/lib/server/workspaces";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(
      { workspaces: await listWorkspaces(user.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { name?: string };
    if (!body.name) return badRequest("Nom requis");
    return NextResponse.json(
      { workspace: await createWorkspace(user.id, body.name) },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
