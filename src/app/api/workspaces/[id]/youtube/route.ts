import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { getYouTubeCredentials } from "@/lib/server/workspaces";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const credentials = await getYouTubeCredentials(user.id, id);
    return NextResponse.json({
      configured: Boolean(credentials),
      channelId: credentials?.channelId,
    });
  } catch (error) {
    return apiError(error);
  }
}
