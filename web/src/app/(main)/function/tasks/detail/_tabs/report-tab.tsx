"use client";

import * as React from "react";

import { CheckIcon, CopyIcon, FileTextIcon } from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";

export function ReportTab({ taskId }: { taskId: string }) {
  const { locale } = useI18n();
  const [report, setReport] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  const labels = React.useMemo(() => {
    switch (locale) {
      case "pt":
        return {
          empty: "Nenhum relatório gerado para esta tarefa",
          title: "Relatório de Teste de Intrusão (Markdown)",
          copy: "Copiar",
          copySuccess: "Relatório copiado para a área de transferência",
          copyFailed: "Falha ao copiar: ",
        };
      case "zh":
        return {
          empty: "暂无报告",
          title: "渗透测试报告（Markdown）",
          copy: "复制",
          copySuccess: "报告已复制到剪贴板",
          copyFailed: "复制失败：",
        };
      default:
        return {
          empty: "No report generated yet",
          title: "Security Assessment Report (Markdown)",
          copy: "Copy",
          copySuccess: "Report copied to clipboard",
          copyFailed: "Failed to copy: ",
        };
    }
  }, [locale]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .report(taskId, locale)
      .then((res) => {
        if (cancelled) return;
        setReport(res || null);
      })
      .catch(() => {
        if (!cancelled) setReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, locale]);

  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      toast.success(labels.copySuccess);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error(`${labels.copyFailed}${(e as Error).message}`);
    }
  };

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  } else if (report) {
    content = (
      <div className="overflow-x-auto">
        <Markdown text={report} />
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-16 text-muted-foreground text-sm">
        <FileTextIcon className="size-8 opacity-40" />
        {labels.empty}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileTextIcon className="size-4" /> {labels.title}
        </CardTitle>
        <div className="flex gap-2">
          {report && (
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <CheckIcon /> : <CopyIcon />} {labels.copy}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
