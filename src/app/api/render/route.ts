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

export const maxDuration = 1800;

const SKIP_URL_RESOLVE = /^\/(?:private|var|tmp|Users|renders)\//;

/**
 * The editor stores public media as Next.js paths such as `/images/foo.png`.
 * Remotion renders from its own origin, so those paths otherwise point at its
 * bundle server and return 404. Resolve URL-like project fields against the
 * Studio request origin while preserving uploaded temporary filesystem paths.
 */
function resolveProjectMediaUrls(
  value: unknown,
  origin: string,
  key = "",
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveProjectMediaUrls(item, origin, key));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        resolveProjectMediaUrls(childValue, origin, childKey),
      ]),
    );
  }
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !SKIP_URL_RESOLVE.test(value) &&
    /(?:url|src)$/i.test(key)
  ) {
    return new URL(value, origin).toString();
  }
  return value;
}

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
    // Helper: save uploaded file to public/renders/ so Remotion can serve it
    async function saveTmp(file: File, prefix: string): Promise<string> {
      const ext = file.name.split(".").pop() || "bin";
      const filename = `render-${prefix}-${Date.now()}.${ext}`;
      const absPath = join(outputDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(absPath, buffer);
      tmpFiles.push(absPath);
      // Return a URL path that Remotion's server can serve from public/
      return `/renders/${filename}`;
    }

    // Helper: convert MOV/HEVC to H.264 MP4 via ffmpeg (Chromium can't play HEVC)
    async function convertToMp4(inputUrlPath: string): Promise<string> {
      const inputAbsPath = join(
        process.cwd(),
        "public",
        inputUrlPath.replace(/^\//, ""),
      );
      const mp4Filename = inputUrlPath
        .replace(/\.[^.]+$/, ".mp4")
        .replace(/^\/renders\//, "");
      const mp4AbsPath = join(outputDir, mp4Filename);
      const mp4UrlPath = `/renders/${mp4Filename}`;

      // Skip if already mp4 with same path
      if (inputAbsPath === mp4AbsPath) return inputUrlPath;

      await execFileAsync(
        "ffmpeg",
        [
          "-i",
          inputAbsPath,
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          "-y",
          mp4AbsPath,
        ],
        { timeout: 5 * 60 * 1000 },
      );

      tmpFiles.push(mp4AbsPath);
      return mp4UrlPath;
    }

    // Handle uploaded main video
    if (formData) {
      const mainVideoFile = formData.get("mainVideo") as File | null;
      if (mainVideoFile) {
        console.log(
          `[render] Saving main video: ${mainVideoFile.name} (${(mainVideoFile.size / 1024 / 1024).toFixed(1)} MB)`,
        );
        let videoUrl = await saveTmp(mainVideoFile, "main");
        // Auto-convert non-mp4 videos (MOV, MKV, etc.) to H.264 MP4
        if (!/\.mp4$/i.test(mainVideoFile.name)) {
          console.log("[render] Converting to MP4 via ffmpeg...");
          videoUrl = await convertToMp4(videoUrl);
          console.log("[render] Conversion done:", videoUrl);
        }
        projectJson.mainVideoUrl = videoUrl;
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

    const origin = new URL(req.url).origin;
    const renderProject = resolveProjectMediaUrls(projectJson, origin);
    const props = JSON.stringify({ project: renderProject });

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
            : 0) || clipDurationSeconds;
      const trailerSeconds = Math.min(clipDurationSeconds, availableSeconds);
      renderArgs.push(
        "--frames",
        `0-${Math.max(0, Math.ceil(trailerSeconds * fps) - 1)}`,
      );
    }

    console.log("[render] Starting Remotion render...", renderArgs.join(" "));
    await execFileAsync("npx", renderArgs, {
      cwd: process.cwd(),
      timeout: 30 * 60 * 1000,
      maxBuffer: 50 * 1024 * 1024,
    });
    console.log("[render] Render complete:", outputPath);

    let url = `/renders/${outputFile}`;
    let cloudStored = false;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(
        `renders/${outputFile}`,
        createReadStream(outputPath),
        {
          access: "public",
          contentType: "video/mp4",
          multipart: true,
        },
      );
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
    const renderError = err as Error & { stderr?: string; stdout?: string };
    const usefulDetails = (renderError.stderr || renderError.stdout || "")
      .trim()
      .split("\n")
      .slice(-12)
      .join("\n");
    console.error("Remotion render failed", renderError);
    return NextResponse.json(
      {
        error: usefulDetails
          ? `Erreur rendu:\n${usefulDetails}`
          : `Erreur rendu: ${renderError.message}`,
      },
      { status: 500 },
    );
  } finally {
    // Cleanup temp files
    for (const f of tmpFiles) {
      await unlink(f).catch(() => {});
    }
  }
}
