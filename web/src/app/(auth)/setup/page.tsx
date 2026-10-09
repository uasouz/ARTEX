"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/i18n-context";

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const { locale } = useI18n();

  const t = useMemo(() => {
    if (locale === "pt") {
      return {
        unableToVerify: "Não foi possível verificar o status de inicialização",
        initTitle: "Inicializar Senha de Administrador",
        serviceUnavailableDesc:
          "O backend ou banco de dados está temporariamente indisponível. Para evitar sobrescrever uma senha existente, a inicialização foi pausada. Restaure o serviço e tente novamente.",
        welcomeDesc:
          "Bem-vindo ao CIRDAN ARTEX. Por favor, defina uma senha de administrador para sua conta (pelo menos 8 caracteres).",
        retry: "Tentar novamente",
        newPassword: "Nova Senha",
        passwordPlaceholder: "Pelo menos 8 caracteres",
        confirmPassword: "Confirmar Senha",
        confirmPlaceholder: "Digite a senha novamente",
        passwordsMismatch: "As senhas não coincidem",
        passwordTooShort: "A senha deve ter pelo menos 8 caracteres",
        failedToConnect: "Não foi possível conectar ao serviço de backend",
        initFailed: "Falha na inicialização",
        saving: "Salvando...",
        submitBtn: "Definir Senha e Entrar",
      };
    }
    if (locale === "zh") {
      return {
        unableToVerify: "无法确认初始化状态",
        initTitle: "初始化密码",
        serviceUnavailableDesc:
          "后端或数据库暂时不可用。为避免覆盖实例上已有的密码，初始化入口已临时关闭——请恢复服务后重试。",
        welcomeDesc: "首次使用 CIRDAN ARTEX，请为账户设置一个登录密码（至少 8 位）",
        retry: "重试",
        newPassword: "新密码",
        passwordPlaceholder: "至少 8 位",
        confirmPassword: "确认密码",
        confirmPlaceholder: "再次输入密码",
        passwordsMismatch: "两次输入的密码不一致",
        passwordTooShort: "密码长度至少 8 位",
        failedToConnect: "无法连接到后端服务",
        initFailed: "初始化失败",
        saving: "保存中...",
        submitBtn: "设置密码并登录",
      };
    }
    return {
      unableToVerify: "Unable to verify initialization status",
      initTitle: "Initialize Administrator Password",
      serviceUnavailableDesc:
        "The backend or database service is temporarily unavailable. Setup has been paused to prevent overwriting existing configurations. Please restore the service and retry.",
      welcomeDesc: "Welcome to CIRDAN ARTEX. Set an administrator password for your account (at least 8 characters).",
      retry: "Retry",
      newPassword: "New Password",
      passwordPlaceholder: "At least 8 characters",
      confirmPassword: "Confirm Password",
      confirmPlaceholder: "Re-enter password",
      passwordsMismatch: "Passwords do not match",
      passwordTooShort: "Password must be at least 8 characters",
      failedToConnect: "Unable to connect to backend service",
      initFailed: "Initialization failed",
      saving: "Saving...",
      submitBtn: "Set Password & Sign In",
    };
  }, [locale]);

  useEffect(() => {
    api
      .authStatus()
      .then(({ initialized }) => {
        if (initialized) router.replace("/login");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t.failedToConnect);
        setUnavailable(true);
      })
      .finally(() => setChecking(false));
  }, [router, t.failedToConnect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t.passwordsMismatch);
      return;
    }
    if (password.length < 8) {
      setError(t.passwordTooShort);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token } = await api.initPassword(password);
      auth.setToken(token);
      router.replace("/function/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.initFailed);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <div className="relative flex h-dvh">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Left panel */}
      <div className="hidden flex-col items-center justify-center bg-primary p-12 text-center lg:flex lg:w-1/3">
        <div className="relative flex items-center justify-center">
          <div className="absolute size-80 rounded-full border border-primary-foreground/10" />
          <div className="absolute size-60 rounded-full border border-primary-foreground/15" />
          <div className="absolute size-40 rounded-full border border-primary-foreground/20" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CIRDAN ARTEX" width={160} height={160} className="relative brightness-0 invert" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-medium tracking-tight">{unavailable ? t.unableToVerify : t.initTitle}</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              {unavailable ? t.serviceUnavailableDesc : t.welcomeDesc}
            </p>
          </div>
          {unavailable ? (
            <div className="flex flex-col gap-4">
              {error && <p className="text-center text-sm text-destructive">{error}</p>}
              <Button type="button" className="w-full" onClick={() => window.location.reload()}>
                {t.retry}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">{t.newPassword}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  autoFocus
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">{t.confirmPassword}</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t.confirmPlaceholder}
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !password || !confirm}>
                {loading ? t.saving : t.submitBtn}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
