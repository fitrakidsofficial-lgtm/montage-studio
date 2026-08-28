import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { restoreWorkspace } from "@/lib/server/workspaces";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ workspace: await restoreWorkspace(user.id, id) });
  } catch (error) {
    return apiError(error);
  }
}
