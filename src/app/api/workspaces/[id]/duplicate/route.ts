import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { duplicateWorkspace } from "@/lib/server/workspaces";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(
      { workspace: await duplicateWorkspace(user.id, id) },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
