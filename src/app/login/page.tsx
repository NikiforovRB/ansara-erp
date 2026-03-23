"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useTheme } from "@/components/theme-provider";
import ansaraBlack from "@/icons/ANSARA-black.svg";
import ansaraLogo from "@/icons/ANSARA.svg";

export default function LoginPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login, password }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: string;
    };
    setBusy(false);
    if (!res.ok) {
      const hint = data.details ? ` (${data.details})` : "";
      setError((data.error ?? "Ошибка входа") + hint);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="relative mx-auto h-8 w-[140px]">
          <Image
            src={theme === "dark" ? ansaraLogo : ansaraBlack}
            alt="ANSARA"
            fill
            className="object-contain"
            unoptimized
            priority
          />
        </div>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">Вход для сотрудников</p>
        <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
          <div>
            <label className="text-xs text-[var(--muted)]">Логин</label>
            <input
              className="form-input mt-1"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">Пароль</label>
            <input
              type="password"
              className="form-input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-[#0f68e4] py-2 text-sm font-medium text-white transition-colors hover:bg-[#2c7bea] disabled:opacity-40"
          >
            {busy ? "…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
