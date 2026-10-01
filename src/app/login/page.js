"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Password salah!");
      }
    } catch (err) {
      setError("Gagal menghubungi server: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="card-elev border border-border w-full max-w-md p-8 dot-grid-bg relative overflow-hidden shadow-[var(--shadow-warm)] space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center space-x-3">
            <div className="traffic-lights">
              <span className="traffic-light red"></span>
              <span className="traffic-light yellow"></span>
              <span className="traffic-light green"></span>
            </div>
            <div className="h-4 w-px bg-border"></div>
            <span className="text-xs font-bold text-text-main">9router Auto-Combo</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30">
            Auth
          </span>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-surface-2 border border-border shadow-sm text-2xl mb-1">
            🔒
          </div>
          <h1 className="text-xl font-bold text-text-main">Login ke 9router</h1>
          <p className="text-xs text-text-muted">
            Masukkan master password 9router untuk mengakses dashboard auto-combo.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-main mb-1.5">
              Master Password
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password..."
              className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:border-brand-500 font-mono transition"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition shadow-sm hover:shadow-[var(--shadow-warm)] disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Memverifikasi..." : "Masuk Dashboard"}
          </button>
        </form>

        <div className="text-center">
          <span className="text-[11px] text-text-subtle">
            Terkoneksi langsung ke SQLite database 9router
          </span>
        </div>
      </div>
    </div>
  );
}
