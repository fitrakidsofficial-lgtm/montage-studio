import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { getWorkspace } from "@/lib/server/workspaces";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const workspace = await getWorkspace(user.id, id);
    const safeName = workspace.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    return new Response(
      JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          name: workspace.name,
          profile: workspace.profile,
          sequences: workspace.sequences,
          dmConfig: workspace.dmConfig,
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeName || "projet"}.json"`,
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
