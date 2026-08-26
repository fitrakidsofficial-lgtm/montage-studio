import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { existsSync } from "fs";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

export const maxDuration = 300;

export async function POST(req: Request) {
  // Detect content type to parse correctly (FormData or JSON, never both)
  const contentType = req.headers.get("content-type") ?? "";
  let formData: FormData | null = null;
  let projectJson: Record<string, unknown> | null = null;

  if (contentType.includes("multipart/form-data")) {
    formData = await req.formData();
    const projectRaw = formData.get("project") as string | null;
    if (projectRaw) {
      projectJson = JSON.parse(projectRaw);
    }
  } else {
    // JSON body fallback
    const body = await req.json().catch(() => null);
    projectJson = body?.projectJson ?? body?.project ?? null;
  }

  if (!projectJson) {
    return NextResponse.json({ error: "Pas de projet" }, { status: 400 });
  }

  const outputDir = join(process.cwd(), "public", "renders");
  const outputFile = `montage-${Date.now()}.mp4`;
  const outputPath = join(outputDir, outputFile);
  const tmpFiles: string[] = [];

  if (!existsSync(outputDir)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Helper: save uploaded file to tmp
    async function saveTmp(file: File, prefix: string): Promise<string> {
      const ext = file.name.split(".").pop() || "bin";
      const path = join(tmpdir(), `render-${prefix}-${Date.now()}.${ext}`);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path, buffer);
      tmpFiles.push(path);
      return path;
    }

    // Handle uploaded main video
    if (formData) {
      const mainVideoFile = formData.get("mainVideo") as File | null;
      if (mainVideoFile) {
        projectJson.mainVideoUrl = await saveTmp(mainVideoFile, "main");
      }
    }
    if (
      projectJson.mainVideoUrl === "__UPLOAD_MAIN__" ||
      (typeof projectJson.mainVideoUrl === "string" &&
        projectJson.mainVideoUrl.startsWith("blob:"))
    ) {
      projectJson.mainVideoUrl = null;
    }

    // Handle uploaded bgMusic
    if (formData) {
      const bgMusicFile = formData.get("bgMusic") as File | null;
      if (bgMusicFile) {
        projectJson.bgMusicUrl = await saveTmp(bgMusicFile, "bgmusic");
      }
    }
    if (
      projectJson.bgMusicUrl === "__UPLOAD_BGMUSIC__" ||
      (typeof projectJson.bgMusicUrl === "string" &&
        projectJson.bgMusicUrl.startsWith("blob:"))
    ) {
      projectJson.bgMusicUrl = null;
    }

    // Handle uploaded broll files
    if (projectJson.brolls && Array.isArray(projectJson.brolls)) {
      for (const broll of projectJson.brolls as {
        id: string;
        fileUrl: string;
      }[]) {
        if (broll.fileUrl.startsWith("__UPLOAD_BROLL_") && formData) {
          const brollId = broll.fileUrl
            .replace("__UPLOAD_BROLL_", "")
            .replace("__", "");
          const brollFile = formData.get(`broll_${brollId}`) as File | null;
          if (brollFile) {
            broll.fileUrl = await saveTmp(brollFile, `broll-${brollId}`);
          } else {
            broll.fileUrl = "";
          }
        }
      }
      // Strip unresolved blob/empty URLs
      projectJson.brolls = (projectJson.brolls as { fileUrl: string }[]).filter(
        (b) => b.fileUrl && !b.fileUrl.startsWith("blob:"),
      );
    }

    const props = JSON.stringify({ project: projectJson });

    await execFileAsync(
      "npx",
      [
        "remotion",
        "render",
        "src/remotion/index.ts",
        "MontageStudio",
        outputPath,
        "--props",
        props,
        "--codec",
        "h264",
        "--image-format",
        "jpeg",
        "--quality",
        "80",
      ],
      {
        cwd: process.cwd(),
        timeout: 280000,
        maxBuffer: 50 * 1024 * 1024,
      },
    );

    return NextResponse.json({
      url: `/renders/${outputFile}`,
      message: "Rendu termine",
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Erreur rendu: ${(err as Error).message}` },
      { status: 500 },
    );
  } finally {
    // Cleanup temp files
    for (const f of tmpFiles) {
      await unlink(f).catch(() => {});
    }
  }
}
