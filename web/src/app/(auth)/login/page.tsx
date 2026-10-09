"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { AlertTriangle, ShieldCheck } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/i18n-context";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const termsBodyRef = useRef<HTMLDivElement>(null);

  const { locale, d } = useI18n();

  const t = useMemo(() => {
    if (locale === "pt") {
      return {
        checking: "Verificando status da sessão...",
        signIn: "Entrar",
        welcome: "Bem-vindo ao CIRDAN ARTEX. Insira sua senha para acessar a plataforma.",
        username: "Usuário",
        password: "Senha",
        placeholderPassword: "Digite sua senha",
        agreePrefix: "Li e concordo com os",
        termsLink: "Termos de Uso e Responsabilidade",
        errorEmptyTerms: "Por favor, leia e aceite os Termos de Uso.",
        errorInvalid: "Usuário ou senha incorretos",
        errorBackend: "Não foi possível conectar ao servidor backend",
        signingIn: "Entrando...",
        termsTitle: "Termos de Uso e Isenção de Responsabilidade",
        termsSubtitle: "Versão v1.0 · CIRDAN ARTEX · Leia atentamente antes de prosseguir",
        scrollToBottom: "Role até o final do documento para confirmar",
        scrolledToBottom: "Você visualizou todos os termos",
        agreeButton: "Li e concordo com todos os termos",
      };
    }
    if (locale === "zh") {
      return {
        checking: "正在检查登录状态…",
        signIn: "登录",
        welcome: "欢迎回来，请输入密码以继续使用 CIRDAN ARTEX",
        username: "用户名",
        password: "密码",
        placeholderPassword: "请输入密码",
        agreePrefix: "我已阅读并同意",
        termsLink: "《使用须知》",
        errorEmptyTerms: "请先阅读并同意《使用须知》",
        errorInvalid: "用户名或密码错误",
        errorBackend: "无法连接到后端服务",
        signingIn: "登录中...",
        termsTitle: "ARTEX 使用须知与免责声明",
        termsSubtitle: "版本 v1.0 · 生效日期 2026-09-18 · 请在登录前完整阅读以下全部条款",
        scrollToBottom: "请将条款滚动至底部后再确认",
        scrolledToBottom: "您已浏览全部条款",
        agreeButton: "我已阅读并同意全部条款",
      };
    }
    return {
      checking: "Checking session status...",
      signIn: "Sign In",
      welcome: "Welcome to CIRDAN ARTEX. Please enter your password to continue.",
      username: "Username",
      password: "Password",
      placeholderPassword: "Enter your password",
      agreePrefix: "I have read and agree to the",
      termsLink: "Terms of Use & Disclaimer",
      errorEmptyTerms: "Please read and agree to the Terms of Use first.",
      errorInvalid: "Invalid username or password",
      errorBackend: "Unable to connect to the backend service",
      signingIn: "Signing in...",
      termsTitle: "CIRDAN ARTEX Terms of Use & Disclaimer",
      termsSubtitle: "Version v1.0 · CIRDAN Security Operations · Read thoroughly before logging in",
      scrollToBottom: "Please scroll to the bottom of the terms to confirm",
      scrolledToBottom: "You have viewed all terms",
      agreeButton: "I have read and agree to all terms",
    };
  }, [locale]);

  function handleTermsScroll() {
    const el = termsBodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadToEnd(true);
  }

  useEffect(() => {
    if (!termsOpen) return;
    setReadToEnd(false);
    const el = termsBodyRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) setReadToEnd(true);
  }, [termsOpen]);

  useEffect(() => {
    const token = auth.getToken();
    if (token) {
      auth.setToken(token);
      window.location.replace("/function/tasks");
      return;
    }
    api
      .authStatus()
      .then(({ initialized }) => {
        if (!initialized) router.replace("/setup");
      })
      .catch(() => setError(t.errorBackend))
      .finally(() => setChecking(false));
  }, [router, t.errorBackend]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError(t.errorEmptyTerms);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token } = await api.login("ARTEX", password);
      auth.setToken(token);
      window.location.replace("/function/tasks");
    } catch {
      setError(t.errorInvalid);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center text-muted-foreground">
        {t.checking}
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh">
      {/* Top right language switcher */}
      <div className="absolute right-4 top-4 z-50">
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
        <div className="mt-8 text-primary-foreground text-center">
          <h1 className="text-xl font-bold tracking-tight">{d.brand.name}</h1>
          <p className="mt-1 text-xs text-primary-foreground/80 max-w-xs">{d.brand.tagline}</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-medium tracking-tight">{t.signIn}</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">{t.welcome}</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t.username}</Label>
              <Input id="username" value="ARTEX" readOnly className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.placeholderPassword}
                autoFocus
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="agree-terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="agree-terms" className="text-sm font-normal leading-relaxed text-muted-foreground">
                {t.agreePrefix}{" "}
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="mx-0.5 font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t.termsLink}
                </button>
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !password || !agreed}>
              {loading ? t.signingIn : t.signIn}
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="flex-row items-center gap-3 border-b px-6 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base">{t.termsTitle}</DialogTitle>
              <p className="text-xs text-muted-foreground">{t.termsSubtitle}</p>
            </div>
          </DialogHeader>

          <div
            ref={termsBodyRef}
            onScroll={handleTermsScroll}
            className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted-foreground"
          >
            <p className="rounded-lg border bg-muted/40 p-3 text-foreground/80">
              {locale === "pt" ? (
                <>
                  Estes Termos de Uso e Responsabilidade estabelecem as diretrizes operacionais para o uso da plataforma
                  <b> CIRDAN ARTEX</b>. A plataforma destina-se a avaliações de segurança cibernética e red teaming em
                  ambientes previamente autorizados.
                  <span className="font-medium text-foreground block mt-1">
                    Ao acessar ou operar este sistema, você confirma que possui autorização formal por escrito dos
                    proprietários dos ativos e concorda integralmente com as diretrizes de conformidade aplicáveis
                    (incluindo LGPD e normas setoriais).
                  </span>
                </>
              ) : locale === "zh" ? (
                <>
                  本《使用须知与免责声明》是您使用本软件所达成的约定。请在充分理解各项条款，特别是在合法授权范围内进行自动化评估。
                  <span className="font-medium text-foreground block mt-1">
                    一旦您访问或使用本软件，即视为您已阅读、理解并同意接受全部约束。
                  </span>
                </>
              ) : (
                <>
                  These Terms of Use & Operational Security Guidelines govern the authorized use of the
                  <b> CIRDAN ARTEX</b> platform. This tool is designed strictly for authorized penetration testing,
                  vulnerability assessments, and simulated adversary engagements.
                  <span className="font-medium text-foreground block mt-1">
                    By accessing or executing operations within this platform, you certify that explicit written
                    authorization has been granted for all target scopes and that all activities comply with applicable
                    laws and regulatory frameworks.
                  </span>
                </>
              )}
            </p>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  1
                </span>
                {locale === "pt"
                  ? "1. Escopo Autorizado & Regras de Engajamento"
                  : locale === "zh"
                    ? "第一条 · 授权使用范围"
                    : "1. Authorized Scope & Rules of Engagement"}
              </h4>
              <p className="pl-7">
                {locale === "pt"
                  ? "Todas as verificações automatizadas e explorações devem ser conduzidas estritamente dentro dos limites e janelas de teste acordados no contrato de prestação de serviços."
                  : locale === "zh"
                    ? "本系统仅供在获得明确许可与授权的网络资产范围内进行安全性评估与防御验证。"
                    : "All automated security assessments and scans must strictly target in-scope assets explicitly defined in active Statements of Work (SoW) or enterprise contracts."}
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="flex items-center gap-2 font-medium text-destructive">
                <span className="flex size-5 items-center justify-center rounded-md bg-destructive/10 text-xs font-semibold text-destructive">
                  2
                </span>
                <AlertTriangle className="size-4" />
                {locale === "pt"
                  ? "2. Ações Estritamente Proibidas"
                  : locale === "zh"
                    ? "第二条 · 禁止行为"
                    : "2. Prohibited Activities"}
              </h4>
              <ul className="ml-7 list-decimal space-y-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 pl-8 text-foreground/80 marker:text-destructive/70">
                <li>
                  {locale === "pt"
                    ? "Ataques intencionais de negação de serviço (DoS/DDoS) ou exfiltração não autorizada de dados confidenciais."
                    : locale === "zh"
                      ? "严禁对未经授权的第三方目标发起扫描、拒绝服务或破坏性活动。"
                      : "Executing intentional denial-of-service (DoS/DDoS) attacks or destructive data manipulation."}
                </li>
                <li>
                  {locale === "pt"
                    ? "Operações em ativos fora do escopo definido sem aprovação explícita do cliente."
                    : locale === "zh"
                      ? "严禁利用本系统从事任何违法侵入或未授权活动。"
                      : "Scanning or assessing unverified external systems without proper authorization."}
                </li>
              </ul>
            </section>
          </div>

          <DialogFooter className="mx-0 mb-0 flex-col items-stretch gap-2 rounded-b-xl px-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{readToEnd ? t.scrolledToBottom : t.scrollToBottom}</p>
            <DialogClose asChild>
              <Button
                type="button"
                disabled={!readToEnd}
                onClick={() => {
                  setAgreed(true);
                  setError("");
                }}
              >
                {t.agreeButton}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
