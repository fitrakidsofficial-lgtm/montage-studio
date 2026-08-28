import { NextResponse } from "next/server";
import { authenticateUser, setSession } from "@/lib/server/auth";
import { apiError, badRequest } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) return badRequest("Email et mot de passe requis");
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
    const user = await authenticateUser(
      body.email,
      body.password,
      forwardedFor || "local",
    );
    await setSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}
