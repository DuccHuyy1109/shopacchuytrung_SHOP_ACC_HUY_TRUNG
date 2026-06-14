"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import AuthShell, { AuthField } from "../components/AuthShell";
import { User, Lock, Flame } from "../components/icons";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(username, password);
      router.push(u.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      mode="login"
      title="Đăng nhập"
      subtitle="Acc giá mềm nhất thị trường!"
      switchPrompt="Chưa có tài khoản?"
      switchLabel="Đăng ký ngay"
      switchHref="/register"
    >
      <form onSubmit={submit} className="space-y-3.5">
        <AuthField
          Icon={User}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Tên đăng nhập"
          autoComplete="username"
          required
        />
        <AuthField
          Icon={Lock}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          autoComplete="current-password"
          required
        />

        {error && (
          <div className="text-sm text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-fire w-full justify-center disabled:opacity-60"
        >
          {loading ? (
            "Đang xử lý..."
          ) : (
            <>
              <Flame className="w-5 h-5" />
              Đăng nhập
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
