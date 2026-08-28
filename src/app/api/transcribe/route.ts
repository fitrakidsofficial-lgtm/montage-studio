import { NextResponse } from "next/server";
import { getUser } from "@/lib/server/auth";

export const maxDuration = 120;
import { writeFile, unlink, readFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

export async function POST(req: Request) {
  if (!(await getUser())) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY manquante dans .env.local" },
      { status: 500 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const language = (formData.get("language") as string | null) ?? undefined;
  if (!file) {
    return NextResponse.json({ error: "Pas de fichier" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const inputPath = join(tmpdir(), `montage-${id}-input`);
  const outputPath = join(tmpdir(), `montage-${id}.mp3`);

  try {
    // Save uploaded file to temp
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    // Extract + compress audio with ffmpeg (mono, 64kbps, max 24MB)
    await execFileAsync("ffmpeg", [
      "-i",
      inputPath,
      "-vn", // no video
      "-ac",
      "1", // mono
      "-ar",
      "16000", // 16kHz (Whisper optimal)
      "-b:a",
      "64k", // 64kbps bitrate
      "-f",
      "mp3",
      "-y", // overwrite
      outputPath,
    ]);

    // Read compressed audio
    const audioBuffer = await readFile(outputPath);
    const audioBlob = new Blob([audioBuffer], { type: "audio/mp3" });
    const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mp3" });

    // Send to Whisper
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "audio.mp3");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "verbose_json");
    whisperForm.append("timestamp_granularities[]", "word");
    whisperForm.append("timestamp_granularities[]", "segment");
    if (language) {
      whisperForm.append("language", language);
    }

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Whisper API erreur: ${res.status} - ${text}` },
        { status: 502 },
      );
    }

    const data = await res.json();

    const subtitles = (data.segments ?? []).map(
      (seg: { start: number; end: number; text: string }) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text.trim(),
      }),
    );

    const words = (data.words ?? []).map(
      (w: { word: string; start: number; end: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      }),
    );

    return NextResponse.json({ subtitles, words });
  } catch (err) {
    return NextResponse.json(
      { error: `Erreur transcription: ${(err as Error).message}` },
      { status: 500 },
    );
  } finally {
    // Cleanup temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
