import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import {
  deleteWorkspace,
  getWorkspace,
  updateWorkspace,
} from "@/lib/server/workspaces";
import type { ContentSequence, CreatorProfile } from "@/lib/studio-types";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return NextResponse.json({ workspace: await getWorkspace(user.id, id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      profile?: Partial<CreatorProfile>;
      sequences?: ContentSequence[];
      dmConfig?: Record<string, unknown>;
    };
    return NextResponse.json({ workspace: await updateWorkspace(user.id, id, body) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await deleteWorkspace(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
