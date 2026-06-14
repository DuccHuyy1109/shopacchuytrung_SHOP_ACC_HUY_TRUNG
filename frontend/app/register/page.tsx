"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import AuthShell, { AuthField } from "../components/AuthShell";
import { User, Lock, BadgeCheck, Phone, Mail, Rocket } from "../components/icons";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Mật khẩu phải từ 6 ký tự trở lên");
      return;
    }
    setLoading(true);
    try {
      await register({
        username: form.username,
        password: form.password,
        full_name: form.full_name || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      mode="register"
      title="Đăng ký tài khoản"
      subtitle="Acc khó mà shopacchuytrung lại có!"
      switchPrompt="Đã có tài khoản?"
      switchLabel="Đăng nhập"
      switchHref="/login"
    >
      <form onSubmit={submit} className="space-y-3.5">
        <AuthField
          Icon={User}
          value={form.username}
          onChange={(e) => set("username", e.target.value)}
          placeholder="Tên đăng nhập *"
          autoComplete="username"
          required
          minLength={3}
        />
        <AuthField
          Icon={Lock}
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="Mật khẩu * (tối thiểu 6 ký tự)"
          autoComplete="new-password"
          required
        />
        <AuthField
          Icon={BadgeCheck}
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          placeholder="Họ tên"
        />
        <AuthField
          Icon={Phone}
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="Số điện thoại (dùng Zalo)"
          inputMode="tel"
        />
        <AuthField
          Icon={Mail}
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="Email"
          autoComplete="email"
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
              <Rocket className="w-5 h-5" />
              Đăng ký ngay
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
