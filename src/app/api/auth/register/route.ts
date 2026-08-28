import { NextResponse } from "next/server";
import { createUser, setSession } from "@/lib/server/auth";
import { apiError, badRequest } from "@/lib/server/http";
import { listWorkspaces } from "@/lib/server/workspaces";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) return badRequest("Email et mot de passe requis");
    const user = await createUser(body.email, body.password);
    await listWorkspaces(user.id);
    await setSession(user);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
