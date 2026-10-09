"use client";

import * as React from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ArrowLeftIcon, ArrowUpRightIcon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import { FindingRetestPanel } from "@/components/finding-retest-panel";
import { FindingTrafficPanel } from "@/components/finding-traffic-panel";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import { statusMeta } from "@/lib/status";
import type { Finding, FindingStatus, Severity } from "@/lib/types";

import { FindingLineageView } from "./lineage";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const FINDING_STATUSES: FindingStatus[] = [
  "pending",
  "in_progress",
  "confirmed",
  "resolved",
  "fixed",
  "false_positive",
  "ignored",
  "duplicate",
  "risk_accepted",
];

function resolveLocale(): string {
  if (typeof document === "undefined") return "en-US";
  const cookie = document.cookie
    .split("; ")
    .find((r) => r.startsWith("cirdan_locale="))
    ?.split("=")[1];
  if (cookie === "pt") return "pt-BR";
  if (cookie === "zh") return "zh-CN";
  return "en-US";
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString(resolveLocale());
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-col items-end gap-1 text-right text-sm">{children}</div>
    </div>
  );
}

function FindingDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const contextTaskId = searchParams.get("context_task") ?? "";
  const [finding, setFinding] = React.useState<Finding | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [tab, setTab] = React.useState("overview");
  const { locale, d } = useI18n();

  const load = React.useCallback(() => {
    if (!id) {
      setLoaded(true);
      return;
    }
    api
      .getFinding(id, contextTaskId || undefined)
      .then((f) => setFinding(f))
      .catch(() => setFinding(null))
      .finally(() => setLoaded(true));
  }, [contextTaskId, id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const changeSeverity = React.useCallback(
    async (next: Severity) => {
      if (!finding || finding.inherited || next === finding.severity) return;
      const prev = finding.severity;
      setFinding({ ...finding, severity: next });
      try {
        const updated = await api.setFindingSeverity(id, next);
        setFinding(updated);
        toast.success(
          locale === "pt"
            ? `Gravidade alterada para "${statusMeta("severity", next, locale).label}"`
            : locale === "zh"
              ? `严重等级已改为「${statusMeta("severity", next, locale).label}」`
              : `Severity updated to "${statusMeta("severity", next, locale).label}"`,
        );
      } catch (e) {
        setFinding((cur) => (cur ? { ...cur, severity: prev } : cur));
        toast.error(
          (locale === "pt" ? "Falha ao atualizar: " : locale === "zh" ? "更新失败：" : "Update failed: ") +
            (e as Error).message,
        );
      }
    },
    [finding, id, locale],
  );

  const changeStatus = React.useCallback(
    async (next: FindingStatus) => {
      if (!finding || finding.inherited || next === finding.status) return;
      const prev = finding.status;
      setFinding({ ...finding, status: next });
      try {
        const updated = await api.setFindingStatus(id, next);
        setFinding(updated);
        toast.success(
          locale === "pt"
            ? `Status alterado para "${statusMeta("finding", next, locale).label}"`
            : locale === "zh"
              ? `处理状态已改为「${statusMeta("finding", next, locale).label}」`
              : `Status updated to "${statusMeta("finding", next, locale).label}"`,
        );
      } catch (e) {
        setFinding((cur) => (cur ? { ...cur, status: prev } : cur));
        toast.error(
          (locale === "pt" ? "Falha ao atualizar: " : locale === "zh" ? "更新失败：" : "Update failed: ") +
            (e as Error).message,
        );
      }
    },
    [finding, id, locale],
  );

  if (!finding) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-muted-foreground">
          {loaded
            ? locale === "pt"
              ? `Vulnerabilidade não encontrada: ${id}`
              : locale === "zh"
                ? `未找到发现 ${id}`
                : `Finding not found: ${id}`
            : d.common.loading}
        </p>
        {loaded && (
          <Button asChild variant="outline">
            <Link href="/function/findings">
              <ArrowLeftIcon />{" "}
              {locale === "pt" ? "Voltar para vulnerabilidades" : locale === "zh" ? "返回发现列表" : "Back to findings"}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  const title =
    finding.name ||
    finding.vulnclass ||
    (locale === "pt" ? "Não categorizado" : locale === "zh" ? "未分类" : "Uncategorized");

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col gap-0">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-background/95 px-4 py-2.5 backdrop-blur lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Button asChild variant="ghost" size="icon" className="size-7">
            <Link
              href="/function/findings"
              title={locale === "pt" ? "Voltar para vulnerabilidades" : "Back to findings"}
            >
              <ArrowLeftIcon />
            </Link>
          </Button>
          <ShieldAlertIcon className="size-4 text-muted-foreground" />
          <h1 className="max-w-md truncate text-sm font-semibold" title={title}>
            {title}
          </h1>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">#{finding.id}</code>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <StatusBadge domain="severity" value={finding.severity} dot />
          <StatusBadge domain="finding" value={finding.status} dot />
          {finding.inherited && finding.source_task_id && (
            <Badge variant="outline">
              {locale === "pt"
                ? `Origem: Tarefa #${finding.source_task_id} · Somente leitura`
                : locale === "zh"
                  ? `来源任务 #${finding.source_task_id} · 只读`
                  : `Source: Task #${finding.source_task_id} · Read-only`}
            </Badge>
          )}
        </div>
        <TabsList>
          <TabsTrigger value="overview">
            {locale === "pt" ? "Visão Geral" : locale === "zh" ? "概览" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="lineage">
            {locale === "pt" ? "Linhagem de Ataque" : locale === "zh" ? "链路图" : "Attack Lineage"}
          </TabsTrigger>
        </TabsList>
      </header>

      {/* Tab content */}
      <div className="flex-1 p-4 lg:p-6">
        <TabsContent value="overview" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left column */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {locale === "pt" ? "Resumo Executivo" : locale === "zh" ? "摘要" : "Executive Summary"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {finding.summary ||
                      (locale === "pt"
                        ? "(Nenhum resumo disponível)"
                        : locale === "zh"
                          ? "（无摘要）"
                          : "(No summary available)")}
                  </p>
                </CardContent>
              </Card>
              <FindingRetestPanel key={id} findingId={id} readOnly={finding.inherited} onCompleted={load} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {locale === "pt"
                      ? "Evidência / PoC"
                      : locale === "zh"
                        ? "证据 / PoC"
                        : "Evidence / Proof of Concept"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {finding.evidence ? (
                    <pre className="max-h-[46vh] overflow-auto rounded-md bg-muted px-3 py-2 font-mono text-xs whitespace-pre-wrap">
                      {finding.evidence}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {locale === "pt"
                        ? "(Nenhuma evidência anexada)"
                        : locale === "zh"
                          ? "（无证据）"
                          : "(No evidence provided)"}
                    </p>
                  )}
                </CardContent>
              </Card>
              <FindingTrafficPanel
                key={id}
                findingId={id}
                contextTask={contextTaskId || undefined}
                readOnly={finding.inherited}
                onChanged={load}
              />
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-sm">
                    {locale === "pt"
                      ? "Relatório Técnico Detalhado"
                      : locale === "zh"
                        ? "详细报告"
                        : "Detailed Technical Report"}
                  </CardTitle>
                  {finding.report && (
                    <CopyButton
                      text={finding.report}
                      successMessage={
                        locale === "pt"
                          ? "Relatório copiado com sucesso"
                          : locale === "zh"
                            ? "已复制详细报告"
                            : "Report copied to clipboard"
                      }
                    />
                  )}
                </CardHeader>
                <CardContent>
                  {finding.report_stale ? (
                    <Alert>
                      <AlertDescription>
                        {locale === "pt"
                          ? "O tráfego de evidências foi alterado; o relatório técnico precisa ser atualizado."
                          : locale === "zh"
                            ? "流量证据已变更，详细报告待更新。"
                            : "Traffic evidence has been updated; the technical report is pending refresh."}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {finding.report ? (
                    <Markdown text={finding.report} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {locale === "pt"
                        ? "Nenhum relatório técnico disponível."
                        : locale === "zh"
                          ? "暂无详细报告。"
                          : "No detailed report available."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <Card className="h-fit lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle className="text-sm">{d.common.status}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {/* ID */}
                <FieldRow label="ID">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    #{finding.id}
                  </code>
                </FieldRow>

                {/* Severity */}
                <FieldRow label={d.common.severity}>
                  {finding.inherited ? (
                    <StatusBadge domain="severity" value={finding.severity} dot />
                  ) : (
                    <Select value={finding.severity} onValueChange={(v) => changeSeverity(v as Severity)}>
                      <SelectTrigger size="sm" className="h-7 w-auto border-none px-1 shadow-none focus-visible:ring-0">
                        <StatusBadge domain="severity" value={finding.severity} dot />
                      </SelectTrigger>
                      <SelectContent position="popper" align="end">
                        <SelectGroup>
                          {SEVERITIES.map((sv) => (
                            <SelectItem key={sv} value={sv}>
                              {statusMeta("severity", sv, locale).label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </FieldRow>

                {/* Status */}
                <FieldRow label={d.common.status}>
                  {finding.inherited ? (
                    <StatusBadge domain="finding" value={finding.status} dot />
                  ) : (
                    <Select value={finding.status} onValueChange={(v) => changeStatus(v as FindingStatus)}>
                      <SelectTrigger size="sm" className="h-7 w-auto border-none px-1 shadow-none focus-visible:ring-0">
                        <StatusBadge domain="finding" value={finding.status} dot />
                      </SelectTrigger>
                      <SelectContent position="popper" align="end">
                        <SelectGroup>
                          {FINDING_STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {statusMeta("finding", st, locale).label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </FieldRow>

                {/* Category */}
                <FieldRow
                  label={locale === "pt" ? "Categoria / Tipo" : locale === "zh" ? "漏洞类型" : "Category / Type"}
                >
                  {finding.vulnclass ? (
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{finding.vulnclass}</code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </FieldRow>

                {/* Affected Assets */}
                <FieldRow
                  label={locale === "pt" ? "Ativos Afetados" : locale === "zh" ? "涉及资产" : "Affected Assets"}
                >
                  {finding.assets && finding.assets.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {finding.assets.map((a) => (
                        <code
                          key={a.id}
                          className="max-w-[16rem] truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                          title={`${a.type} · ${a.label}`}
                        >
                          {a.label}
                        </code>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </FieldRow>

                {/* Task */}
                <FieldRow label={d.nav.tasks}>
                  {finding.task_id ? (
                    <Link
                      href={`/function/tasks/detail?id=${finding.task_id}`}
                      className="inline-flex max-w-[16rem] items-center gap-1 text-primary hover:underline"
                      title={finding.task_description}
                    >
                      <span className="truncate">{finding.task_description || `#${finding.task_id}`}</span>
                      <ArrowUpRightIcon className="size-3 shrink-0" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      — {locale === "pt" ? "(Tarefa excluída)" : locale === "zh" ? "（任务已删除）" : "(Deleted task)"}
                    </span>
                  )}
                </FieldRow>

                {/* Time */}
                <FieldRow label={locale === "pt" ? "Data/Hora" : locale === "zh" ? "发现时间" : "Discovered At"}>
                  <span className="tabular-nums">{fmtTime(finding.ts)}</span>
                </FieldRow>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lineage */}
        <TabsContent value="lineage" className="mt-0">
          <FindingLineageView findingId={finding.id} />
        </TabsContent>
      </div>
    </Tabs>
  );
}

export default function FindingDetailPage() {
  return (
    <React.Suspense fallback={null}>
      <FindingDetailInner />
    </React.Suspense>
  );
}
