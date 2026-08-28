import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError, badRequest } from "@/lib/server/http";
import { createWorkspace } from "@/lib/server/workspaces";
import type { ContentSequence, CreatorProfile } from "@/lib/studio-types";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      name?: string;
      profile?: Partial<CreatorProfile>;
      sequences?: ContentSequence[];
      dmConfig?: Record<string, unknown>;
    };
    if (!body.name || !body.profile || !Array.isArray(body.sequences)) {
      return badRequest("Fichier projet invalide");
    }
    const workspace = await createWorkspace(user.id, body.name, {
      profile: body.profile,
      sequences: body.sequences,
      dmConfig: body.dmConfig,
    });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
