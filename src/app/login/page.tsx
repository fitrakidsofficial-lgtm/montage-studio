"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/client-api";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiJson(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace("/");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Connexion impossible",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-6 text-white flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">
            Montage Studio
          </p>
          <h1 className="mt-2 text-3xl font-black">
            {mode === "login" ? "Bon retour" : "Créer ton espace"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Retrouve Nourya, Projet IA et Mission Sourates sur tous tes appareils.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm text-zinc-400">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-amber-500"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Mot de passe
            <input
              type="password"
              minLength={10}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-amber-500"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-amber-600 px-4 py-3 font-bold hover:bg-amber-500 disabled:opacity-50"
          >
            {busy
              ? "Patiente..."
              : mode === "login"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode((current) => (current === "login" ? "register" : "login"));
            setError("");
          }}
          className="mt-5 w-full text-sm text-zinc-500 hover:text-white"
        >
          {mode === "login"
            ? "Pas encore de compte ? S’inscrire"
            : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </main>
  );
}
