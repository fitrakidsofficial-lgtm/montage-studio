import { NextResponse } from "next/server";
import { getUser } from "@/lib/server/auth";

export async function GET() {
  const user = await getUser();
  return NextResponse.json(
    { user },
    { status: user ? 200 : 401, headers: { "Cache-Control": "no-store" } },
  );
}
