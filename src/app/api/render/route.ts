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
  const formData = await req.formData();
  const projectRaw = formData.get("project") as string | null;

  // Backward compat: also accept JSON body
  let projectJson;
  if (projectRaw) {
    projectJson = JSON.parse(projectRaw);
  } else {
    const body = await req.json().catch(() => null);
    projectJson = body?.projectJson;
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
    // Handle uploaded main video file
    const mainVideoFile = formData.get("mainVideo") as File | null;
    if (mainVideoFile) {
      const videoPath = join(tmpdir(), `render-main-${Date.now()}.mp4`);
      const buffer = Buffer.from(await mainVideoFile.arrayBuffer());
      await writeFile(videoPath, buffer);
      tmpFiles.push(videoPath);
      projectJson.mainVideoUrl = videoPath;
    } else if (
      projectJson.mainVideoUrl === "__UPLOAD_MAIN__" ||
      projectJson.mainVideoUrl?.startsWith("blob:")
    ) {
      projectJson.mainVideoUrl = null;
    }

    // Strip any remaining blob URLs
    if (projectJson.brolls) {
      projectJson.brolls = projectJson.brolls.filter(
        (b: { fileUrl: string }) => !b.fileUrl.startsWith("blob:"),
      );
    }
    if (projectJson.bgMusicUrl?.startsWith("blob:")) {
      projectJson.bgMusicUrl = null;
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
