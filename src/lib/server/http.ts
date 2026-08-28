import { NextResponse } from "next/server";
import { UnauthorizedError } from "./auth";

export function apiError(error: unknown) {
  const status =
    error instanceof UnauthorizedError
      ? error.status
      : error && typeof error === "object" && "status" in error
        ? Number(error.status)
        : 500;
  if (status >= 500) console.error(error);
  const message =
    status >= 500
      ? "Erreur interne du serveur"
      : error instanceof Error
        ? error.message
        : "Erreur inconnue";
  return NextResponse.json({ error: message }, { status });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
