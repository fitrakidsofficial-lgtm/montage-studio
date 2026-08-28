import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { existsSync } from "fs";
import { writeFile, unlink } from "fs/promises";
import { createReadStream } from "fs";
import { tmpdir } from "os";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";

const execFileAsync = promisify(execFile);

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    await requireUser();
  } catch (error) {
    return apiError(error);
  }
  // Detect content type to parse correctly (FormData or JSON, never both)
  const contentType = req.headers.get("content-type") ?? "";
  let formData: FormData | null = null;
  let projectJson: Record<string, unknown> | null = null;
  let clipDurationSeconds: number | null = null;

  if (contentType.includes("multipart/form-data")) {
    formData = await req.formData();
    const projectRaw = formData.get("project") as string | null;
    if (projectRaw) {
      projectJson = JSON.parse(projectRaw);
    }
    const clipRaw = formData.get("clipDurationSeconds");
    if (typeof clipRaw === "string" && Number(clipRaw) > 0) {
      clipDurationSeconds = Math.min(Number(clipRaw), 60);
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

    const renderArgs = [
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
    ];
    if (clipDurationSeconds) {
      const fps = Number(projectJson.fps) || 30;
      const availableSeconds =
        Number(projectJson.mainVideoDurationSeconds) +
          (projectJson.outroVideoUrl
            ? Number(projectJson.outroDurationSeconds) || 0
            : 0) ||
        clipDurationSeconds;
      const trailerSeconds = Math.min(clipDurationSeconds, availableSeconds);
      renderArgs.push(
        "--frames",
        `0-${Math.max(0, Math.ceil(trailerSeconds * fps) - 1)}`,
      );
    }

    await execFileAsync(
      "npx",
      renderArgs,
      {
        cwd: process.cwd(),
        timeout: 280000,
        maxBuffer: 50 * 1024 * 1024,
      },
    );

    let url = `/renders/${outputFile}`;
    let cloudStored = false;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`renders/${outputFile}`, createReadStream(outputPath), {
        access: "public",
        contentType: "video/mp4",
        multipart: true,
      });
      url = blob.url;
      cloudStored = true;
    }
    return NextResponse.json({
      url,
      cloudStored,
      kind: clipDurationSeconds ? "trailer" : "full",
      message: clipDurationSeconds ? "Extrait terminé" : "Rendu terminé",
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
