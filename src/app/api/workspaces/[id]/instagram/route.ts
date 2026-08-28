import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError, badRequest } from "@/lib/server/http";
import {
  getInstagramCredentials,
  setInstagramCredentials,
} from "@/lib/server/workspaces";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const credentials = await getInstagramCredentials(user.id, id);
    return NextResponse.json({ configured: Boolean(credentials), userId: credentials?.userId });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await request.json()) as { accessToken?: string; userId?: string };
    if (!body.accessToken || !body.userId) return badRequest("Token et identifiant requis");
    await setInstagramCredentials(user.id, id, {
      accessToken: body.accessToken,
      userId: body.userId,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
