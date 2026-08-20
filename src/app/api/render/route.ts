import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { existsSync } from "fs";

const execFileAsync = promisify(execFile);

export const maxDuration = 300;

export async function POST(req: Request) {
  const { projectJson } = await req.json();
  if (!projectJson) {
    return NextResponse.json({ error: "Pas de projet" }, { status: 400 });
  }

  const outputDir = join(process.cwd(), "public", "renders");
  const outputFile = `montage-${Date.now()}.mp4`;
  const outputPath = join(outputDir, outputFile);

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(outputDir, { recursive: true });
  }

  try {
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
  }
}
