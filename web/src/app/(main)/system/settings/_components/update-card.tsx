"use client";

import * as React from "react";

import {
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api, sseUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { UpdateCheck, UpdateProgress } from "@/lib/types";

const RESTART_TIMEOUT_MS = 180_000;

function humanSize(n?: number): string {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const I18N = {
  en: {
    checkFailed: "Check for update failed: ",
    foundNewVersion: "Found new version ",
    currentLatest: "Current version is up to date",
    updatedTo: "Updated to ",
    reloading: ", reloading page...",
    timeoutWaiting:
      "Service restart timed out. Check backend logs or confirm CIRDAN was started via start.sh / start.bat.",
    updateFailed: "Update failed: ",
    confirmUpdate: (v: string) =>
      `Update to ${v}?\n\nThe application will restart and any running tasks will be interrupted.\n`,
    dockerNotice:
      "\nNote: Docker container updates replace the binary only, not container toolchains (playwright/nmap). If tools changed, use docker compose pull.\n",
    preparing: "Preparing...",
    launchFailed: "Failed to start update: ",
    confirmRollback:
      "Rollback to previous version?\n\nThe application will restart and active tasks will be interrupted.\nNote: Database schema is not reverted; older versions might not read new data.",
    switchedToPrevious: "Switched to previous version, restarting...",
    rollbackFailed: "Rollback failed: ",
    title: "Version & Updates",
    description:
      "Check and install new versions from GitHub. Updating will restart the application; running tasks will be interrupted.",
    currentVersion: "Current Version",
    standalone: "Standalone",
    latestVersion: "Latest Version",
    releaseNotes: "Release Notes",
    cannotConnect: "Cannot connect to GitHub: ",
    proxyHint: " You can configure a global proxy above and retry.",
    assetMissing: (latest: string, os: string, arch: string, asset: string) =>
      `${latest} does not provide a release package for ${os}/${arch} (missing ${asset}); automatic update unavailable.`,
    willDownload: "Will download ",
    checksumNotice: ", verify SHA256, and smoke-test before replacing. On failure, current version is retained.",
    dockerWarning:
      "In Docker, in-app update only replaces the binary and reverts on container recreation. To upgrade tools, run docker compose pull cirdan && docker compose up -d.",
    restartingNotice: "Restarting and applying new version, please wait (page will refresh automatically)...",
    checkUpdateBtn: "Check Update",
    updateToBtn: (v: string) => `Update to ${v}`,
    updateNowBtn: "Update Now",
    rollbackBtn: "Rollback to Previous",
    oneClickNotice:
      "One-click updates rely on supervisor scripts. Start CIRDAN via start.sh (or start.bat on Windows); direct binary execution will not auto-restart.",
  },
  pt: {
    checkFailed: "Falha ao verificar atualizações: ",
    foundNewVersion: "Nova versão encontrada: ",
    currentLatest: "A versão atual já é a mais recente",
    updatedTo: "Atualizado para ",
    reloading: ", recarregando a página...",
    timeoutWaiting:
      "Tempo limite ao aguardar reinicialização. Verifique os logs do backend ou confirme se o CIRDAN foi iniciado via start.sh / start.bat.",
    updateFailed: "Falha na atualização: ",
    confirmUpdate: (v: string) =>
      `Atualizar para ${v}?\n\nO aplicativo será reiniciado e quaisquer tarefas em execução serão interrompidas.\n`,
    dockerNotice:
      "\nNota: Atualizações dentro do Docker substituem apenas o executável, sem atualizar ferramentas da imagem (playwright/nmap). Se houver novas dependências, use docker compose pull.\n",
    preparing: "Preparando...",
    launchFailed: "Falha ao iniciar atualização: ",
    confirmRollback:
      "Reverter para a versão anterior?\n\nO programa será reiniciado e tarefas ativas serão interrompidas.\nNota: A estrutura do banco de dados não é revertida.",
    switchedToPrevious: "Alternado para a versão anterior, reiniciando...",
    rollbackFailed: "Falha na reversão: ",
    title: "Versão & Atualizações",
    description:
      "Verifique e instale novas versões a partir do GitHub. A atualização reinicia o sistema e interrompe tarefas ativas.",
    currentVersion: "Versão Atual",
    standalone: "Executável Direto",
    latestVersion: "Última Versão",
    releaseNotes: "Notas de Versão",
    cannotConnect: "Não foi possível conectar ao GitHub: ",
    proxyHint: " Você pode configurar um proxy global acima e tentar novamente.",
    assetMissing: (latest: string, os: string, arch: string, asset: string) =>
      `${latest} não possui pacote de distribuição para ${os}/${arch} (ausente ${asset}); atualização automática indisponível.`,
    willDownload: "Será baixado ",
    checksumNotice:
      ", validado com SHA256 e testado antes da substituição. Em caso de falha, a versão atual é mantida.",
    dockerWarning:
      "No Docker, a atualização substitui apenas o binário e é perdida ao recriar o contêiner. Para atualizar as ferramentas completas, execute docker compose pull cirdan && docker compose up -d.",
    restartingNotice: "Reiniciando e aplicando a nova versão, aguarde (a página será recarregada automaticamente)...",
    checkUpdateBtn: "Verificar Atualizações",
    updateToBtn: (v: string) => `Atualizar para ${v}`,
    updateNowBtn: "Atualizar Agora",
    rollbackBtn: "Reverter para Anterior",
    oneClickNotice:
      "A atualização com 1 clique depende dos scripts de inicialização. Inicie o CIRDAN via start.sh (ou start.bat no Windows); ao executar o binário diretamente, ele não reiniciará sozinho.",
  },
  zh: {
    checkFailed: "检查更新失败：",
    foundNewVersion: "发现新版本 ",
    currentLatest: "当前已是最新版本",
    updatedTo: "已更新到 ",
    reloading: "，正在重新加载页面",
    timeoutWaiting: "等待服务重启超时。请检查后端日志，或确认 CIRDAN 是通过 start.sh / start.bat 启动的。",
    updateFailed: "更新失败：",
    confirmUpdate: (v: string) => `确定更新到 ${v}？\n\n更新会重启程序，正在运行的任务会被中断。\n`,
    dockerNotice:
      "\n注意：容器内更新只替换程序本身，不会更新镜像里的 playwright / nmap 等工具链；若新版本依赖新工具，请改用 docker compose pull。\n",
    preparing: "准备中…",
    launchFailed: "启动更新失败：",
    confirmRollback:
      "回滚到上一版本？\n\n程序会重启，正在运行的任务会被中断。\n注意：数据库结构不会回退，旧版本可能无法识别新版写入的数据。",
    switchedToPrevious: "已切换到上一版本，正在重启…",
    rollbackFailed: "回滚失败：",
    title: "版本与更新",
    description: "从 GitHub 检查并安装新版本。更新会重启程序，正在运行的任务会被中断。",
    currentVersion: "当前版本",
    standalone: "独立程序",
    latestVersion: "最新版本",
    releaseNotes: "更新日志",
    cannotConnect: "无法连接 GitHub：",
    proxyHint: "　可在上方配置全局代理后重试。",
    assetMissing: (latest: string, os: string, arch: string, asset: string) =>
      `${latest} 没有提供 ${os}/${arch} 的发布包（缺少 ${asset}），无法自动更新。`,
    willDownload: "将下载 ",
    checksumNotice: "，校验 SHA256 并冒烟测试后才会替换，失败自动保留当前版本。",
    dockerWarning:
      "Docker 下的更新只替换程序本身，不更新镜像里的 playwright / nmap 等工具链，且 docker compose up -d 重建容器后会退回镜像自带的版本。需要连镜像一起升级请执行 docker compose pull artex && docker compose up -d artex。",
    restartingNotice: "正在重启并应用新版本，请稍候（页面会自动刷新）…",
    checkUpdateBtn: "检查更新",
    updateToBtn: (v: string) => `更新到 ${v}`,
    updateNowBtn: "立即更新",
    rollbackBtn: "回滚到上一版本",
    oneClickNotice:
      "一键更新依赖守护脚本重启程序。请通过 start.sh（Windows 为 start.bat）启动 CIRDAN；直接运行二进制本体时，程序退出后不会被自动拉起。",
  },
};

export function UpdateCard() {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [info, setInfo] = React.useState<UpdateCheck | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [progress, setProgress] = React.useState<UpdateProgress | null>(null);
  const [restarting, setRestarting] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const check = React.useCallback(
    (quiet = false) => {
      setChecking(true);
      api
        .checkUpdate(!quiet)
        .then((r) => {
          setInfo(r);
          if (!quiet) {
            if (r.error) toast.error(t.checkFailed + r.error);
            else if (r.has_update) toast.success(`${t.foundNewVersion}${r.latest}`);
            else if (r.comparable) toast.success(t.currentLatest);
          }
        })
        .catch((e) => {
          if (!quiet) toast.error(t.checkFailed + (e as Error).message);
        })
        .finally(() => setChecking(false));
    },
    [t],
  );

  React.useEffect(() => {
    check(true);
  }, [check]);

  const waitForNewVersion = React.useCallback(
    async (fromVersion: string) => {
      setRestarting(true);
      const deadline = Date.now() + RESTART_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await sleep(2000);
        try {
          const r = await fetch("/api/health", { cache: "no-store" });
          if (r.ok) {
            const j = (await r.json()) as { version?: string };
            if (j.version && j.version !== fromVersion) {
              toast.success(`${t.updatedTo}${j.version}${t.reloading}`);
              await sleep(800);
              window.location.reload();
              return;
            }
          }
        } catch {
          // Retry window connection error expected
        }
      }
      setRestarting(false);
      toast.error(t.timeoutWaiting);
    },
    [t],
  );

  const openStream = React.useCallback(
    (fromVersion: string) => {
      const es = new EventSource(sseUrl("/api/update/stream"));
      es.onmessage = (ev) => {
        let p: UpdateProgress;
        try {
          p = JSON.parse(ev.data) as UpdateProgress;
        } catch {
          return;
        }
        setProgress(p);
        if (p.phase === "failed") {
          es.close();
          setBusy(false);
          toast.error(t.updateFailed + (p.error ?? p.message));
          return;
        }
        if (p.phase === "staged") {
          es.close();
          void waitForNewVersion(fromVersion);
        }
      };
      es.onerror = () => {
        es.close();
      };
      return es;
    },
    [t, waitForNewVersion],
  );

  const doUpdate = () => {
    if (!info) return;
    const from = info.current;
    const ok = window.confirm(t.confirmUpdate(info.latest ?? "") + (info.mode === "docker" ? t.dockerNotice : ""));
    if (!ok) return;

    setBusy(true);
    setProgress({ phase: "downloading", percent: 0, message: t.preparing });
    const es = openStream(from);
    api.applyUpdate().catch((e) => {
      es.close();
      setBusy(false);
      setProgress(null);
      toast.error(t.launchFailed + (e as Error).message);
    });
  };

  const doRollback = () => {
    if (!info) return;
    if (!window.confirm(t.confirmRollback)) return;
    const from = info.current;
    setBusy(true);
    api
      .rollbackUpdate()
      .then(() => {
        toast.success(t.switchedToPrevious);
        void waitForNewVersion(from);
      })
      .catch((e) => {
        setBusy(false);
        toast.error(t.rollbackFailed + (e as Error).message);
      });
  };

  const phase = progress?.phase;
  const showProgress = busy || restarting;
  const downloading = !restarting && phase === "downloading";
  const pct = downloading ? Math.max(progress?.percent ?? 0, 0) : 100;

  return (
    <Card className="mb-4 break-inside-avoid md:mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DownloadIcon className="size-4" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t.currentVersion}</span>
          <Badge variant="secondary" className="font-mono">
            {info?.current ?? "…"}
          </Badge>
          {info && (
            <>
              <Badge variant="outline" className="font-mono">
                {info.os}/{info.arch}
              </Badge>
              <Badge variant="outline">{info.mode === "docker" ? "Docker" : t.standalone}</Badge>
            </>
          )}
          {info?.latest && (
            <>
              <span className="text-muted-foreground">{t.latestVersion}</span>
              <Badge variant={info.has_update ? "default" : "secondary"} className="font-mono">
                {info.latest}
              </Badge>
            </>
          )}
          {info?.html_url && (
            <a
              href={info.html_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {t.releaseNotes} <ExternalLinkIcon className="size-3" />
            </a>
          )}
        </div>

        {info?.boot_notice && (
          <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            {info.boot_notice}
          </p>
        )}

        {info?.error && (
          <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            {t.cannotConnect}
            {info.error}
            {t.proxyHint}
          </p>
        )}

        {info && !info.comparable && info.reason && <p className="text-xs text-muted-foreground">{info.reason}</p>}

        {info?.has_update && info.asset_available === false && (
          <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            {t.assetMissing(info.latest ?? "", info.os ?? "", info.arch ?? "", info.asset ?? "")}
          </p>
        )}

        {info?.has_update && info.asset_available !== false && (
          <p className="text-xs text-muted-foreground">
            {t.willDownload} <span className="font-mono">{info.asset}</span>
            {info.size ? ` (${humanSize(info.size)})` : ""}
            {t.checksumNotice}
          </p>
        )}

        {info && !info.has_update && info.comparable && !info.error && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2Icon className="size-3.5 text-emerald-600" />
            {t.currentLatest}
          </p>
        )}

        {info?.mode === "docker" && info.has_update && (
          <p className="text-xs text-muted-foreground">{t.dockerWarning}</p>
        )}

        {showProgress && (
          <div className="space-y-1.5">
            <Progress value={pct} className={downloading ? undefined : "animate-pulse"} />
            <p className="text-xs text-muted-foreground">{restarting ? t.restartingNotice : progress?.message}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => check(false)} disabled={checking || busy || restarting}>
            <RefreshCwIcon className={checking ? "size-4 animate-spin" : "size-4"} />
            {t.checkUpdateBtn}
          </Button>
          <Button
            size="sm"
            onClick={doUpdate}
            disabled={busy || restarting || !info?.has_update || info?.asset_available === false}
          >
            <DownloadIcon className="size-4" />
            {info?.has_update && info.latest ? t.updateToBtn(info.latest) : t.updateNowBtn}
          </Button>
          {info?.has_backup && (
            <Button variant="ghost" size="sm" onClick={doRollback} disabled={busy || restarting}>
              <RotateCcwIcon className="size-4" />
              {t.rollbackBtn}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{t.oneClickNotice}</p>
      </CardContent>
    </Card>
  );
}
