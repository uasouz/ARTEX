"use client";

import * as React from "react";

import Link from "next/link";

import { RotateCcwIcon } from "lucide-react";

import { FindingRetestDialog } from "@/components/finding-retest-dialog";
import { Markdown } from "@/components/markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { FindingRetest } from "@/lib/types";

const I18N = {
  en: {
    title: "Vulnerability Retest",
    description: "Verify the current state in an isolated session, keeping conclusions and evidence for each retest.",
    viewActiveRetestSession: "View active retest session",
    retesting: "Retesting",
    triggerRetest: "Trigger Retest",
    loadFailed: "Failed to load retest history: ",
    retry: "Retry",
    emptyTitle: "No Retest History",
    emptyDescription: "Once the fix is deployed, trigger a retest to compare fresh evidence against previous findings.",
    viewSession: "View Session",
    sessionDeleted: "Session deleted",
    notesPrefix: "Additional Notes: ",
    evidenceSummary: "Retest Evidence",
    statusLabels: {
      pending: "Pending",
      running: "Retesting",
      completed: "Completed",
      failed: "Retest Failed",
      stopped: "Stopped",
    },
    verdictLabels: {
      reproduced: "Still Reproducible",
      fixed: "Remediated",
      inconclusive: "Inconclusive",
    },
  },
  pt: {
    title: "Reteste de Vulnerabilidade",
    description: "Verifique o estado atual em uma sessão isolada, mantendo conclusões e evidências de cada reteste.",
    viewActiveRetestSession: "Ver sessão de reteste em andamento",
    retesting: "Em reteste",
    triggerRetest: "Iniciar Reteste",
    loadFailed: "Falha ao carregar histórico de retestes: ",
    retry: "Tentar novamente",
    emptyTitle: "Nenhum Histórico de Reteste",
    emptyDescription: "Assim que a correção for aplicada, inicie um reteste para comparar novas evidências.",
    viewSession: "Ver Sessão",
    sessionDeleted: "Sessão excluída",
    notesPrefix: "Notas Adicionais: ",
    evidenceSummary: "Evidências do Reteste",
    statusLabels: {
      pending: "Pendente",
      running: "Em reteste",
      completed: "Concluído",
      failed: "Falha no Reteste",
      stopped: "Interrompido",
    },
    verdictLabels: {
      reproduced: "Ainda Reprodutível",
      fixed: "Corrigido",
      inconclusive: "Inconclusivo",
    },
  },
  zh: {
    title: "漏洞复测",
    description: "在独立会话中验证当前状态，保留每次复测的结论与证据。",
    viewActiveRetestSession: "查看正在进行的复测会话",
    retesting: "复测中",
    triggerRetest: "发起复测",
    loadFailed: "加载复测记录失败：",
    retry: "重试",
    emptyTitle: "暂无复测记录",
    emptyDescription: "修复部署完成后，可发起复测并比较新旧证据。",
    viewSession: "查看会话",
    sessionDeleted: "会话已删除",
    notesPrefix: "补充说明：",
    evidenceSummary: "复测证据",
    statusLabels: {
      pending: "等待启动",
      running: "复测中",
      completed: "已完成",
      failed: "复测失败",
      stopped: "已停止",
    },
    verdictLabels: {
      reproduced: "仍可复现",
      fixed: "已修复",
      inconclusive: "无法确认",
    },
  },
};

const DATE_LOCALES: Record<string, string> = {
  zh: "zh-CN",
  pt: "pt-BR",
  en: "en-US",
};

function active(r: FindingRetest) {
  return r.status === "pending" || r.status === "running";
}

export function FindingRetestPanel({
  findingId,
  findingName,
  readOnly = false,
  onCompleted,
}: {
  findingId: string;
  findingName?: string;
  readOnly?: boolean;
  onCompleted?: () => void;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;
  const dateLocale = DATE_LOCALES[locale] ?? "en-US";

  const [items, setItems] = React.useState<FindingRetest[] | null>(null);
  const [error, setError] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const requestSeq = React.useRef(0);
  const previousItems = React.useRef<FindingRetest[]>([]);

  const load = React.useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const rows = await api.findingRetests(findingId);
      if (seq !== requestSeq.current) return;
      const completed = previousItems.current.some(
        (item) => active(item) && rows.some((row) => row.id === item.id && !active(row)),
      );
      previousItems.current = rows;
      setItems(rows);
      setError("");
      if (completed) onCompleted?.();
    } catch (e) {
      if (seq === requestSeq.current) setError((e as Error).message);
    }
  }, [findingId, onCompleted]);

  React.useEffect(() => {
    void load();
    return () => {
      requestSeq.current++;
    };
  }, [load]);

  React.useEffect(() => {
    if (error || !items?.some(active)) return;
    const timer = setTimeout(() => void load(), 3000);
    return () => clearTimeout(timer);
  }, [error, items, load]);

  const running = items?.find(active);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>
        {running?.conversation_id != null ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/chat?c=${running.conversation_id}`} title={t.viewActiveRetestSession}>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              {t.retesting}
            </Link>
          </Button>
        ) : null}
        {!running && !readOnly ? (
          <Button size="sm" onClick={() => setOpen(true)} disabled={items === null || !!error}>
            <RotateCcwIcon data-icon="inline-start" />
            {t.triggerRetest}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {t.loadFailed}
              {error}
              <Button variant="outline" size="sm" onClick={() => void load()}>
                {t.retry}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {!error && items === null ? <Skeleton className="h-16 w-full" /> : null}
        {!error && items?.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t.emptyTitle}</EmptyTitle>
              <EmptyDescription>{t.emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {!error && items
          ? items.map((item) => (
              <div key={item.id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={item.status === "completed" && item.verdict === "reproduced" ? "destructive" : "secondary"}
                  >
                    {item.status === "completed" && item.verdict
                      ? t.verdictLabels[item.verdict]
                      : t.statusLabels[item.status]}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    #{item.id} · {new Date(item.created_at).toLocaleString(dateLocale)}
                  </span>
                  {item.conversation_id != null ? (
                    <Button asChild variant="ghost" size="sm" className="ml-auto">
                      <Link href={`/chat?c=${item.conversation_id}`}>{t.viewSession}</Link>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">{t.sessionDeleted}</span>
                  )}
                </div>
                {item.status === "completed" && item.summary ? (
                  <p className="whitespace-pre-wrap break-words text-sm">{item.summary}</p>
                ) : null}
                {item.error ? (
                  <p className="whitespace-pre-wrap break-words text-destructive text-sm">{item.error}</p>
                ) : null}
                {item.notes ? (
                  <p className="whitespace-pre-wrap break-words text-muted-foreground text-xs">
                    {t.notesPrefix}
                    {item.notes}
                  </p>
                ) : null}
                {item.status === "completed" && item.evidence ? (
                  <details className="min-w-0">
                    <summary className="cursor-pointer text-sm">{t.evidenceSummary}</summary>
                    <div className="mt-3 overflow-x-auto">
                      <Markdown text={item.evidence} />
                    </div>
                  </details>
                ) : null}
              </div>
            ))
          : null}
      </CardContent>
      {open ? (
        <FindingRetestDialog
          findingId={findingId}
          findingName={findingName}
          onClose={() => setOpen(false)}
          onStarted={(retest) => {
            requestSeq.current++;
            const rows = [retest, ...previousItems.current.filter((item) => item.id !== retest.id)];
            previousItems.current = rows;
            setItems(rows);
            setError("");
            void load();
          }}
        />
      ) : null}
    </Card>
  );
}
