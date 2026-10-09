"use client";

import * as React from "react";

import { toast } from "sonner";

import { HttpCodeBlock } from "@/components/http-code-block";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { FindingTrafficDetail, TrafficDetail } from "@/lib/types";

const I18N = {
  en: {
    trafficEvidenceTitle: "Traffic Evidence #{id}",
    viewSnapshotDesc: "View request and response preserved during binding",
    tabRequest: "Request",
    tabResponse: "Response",
    bodyBytes: "Body {total} bytes",
    previewSuffix: " · Preview",
    downloadFullBody: "Download full {side} body",
    sideRequest: "request",
    sideResponse: "response",
    loadMoreBody: "Load More Content",
    previewTrafficTitle: "Preview Traffic",
    previewTrafficDesc: "Traffic ID: {id}. Full payload preserved upon binding.",
  },
  pt: {
    trafficEvidenceTitle: "Evidência de Tráfego #{id}",
    viewSnapshotDesc: "Visualizar requisição e resposta salvas na vinculação",
    tabRequest: "Requisição",
    tabResponse: "Resposta",
    bodyBytes: "Corpo {total} bytes",
    previewSuffix: " · Pré-visualização",
    downloadFullBody: "Baixar corpo completo da {side}",
    sideRequest: "requisição",
    sideResponse: "resposta",
    loadMoreBody: "Carregar Mais Conteúdo",
    previewTrafficTitle: "Pré-visualizar Tráfego",
    previewTrafficDesc: "ID de Tráfego: {id}. Dados completos salvos na vinculação.",
  },
  zh: {
    trafficEvidenceTitle: "流量证据 #{id}",
    viewSnapshotDesc: "查看绑定时保存的请求与响应",
    tabRequest: "请求 Request",
    tabResponse: "响应 Response",
    bodyBytes: "正文 {total} 字节",
    previewSuffix: " · 当前为预览",
    downloadFullBody: "下载完整{side}正文",
    sideRequest: "请求",
    sideResponse: "响应",
    loadMoreBody: "加载更多正文",
    previewTrafficTitle: "预览流量",
    previewTrafficDesc: "流量 ID：{id}。绑定时会保存完整正文。",
  },
};

export function TrafficEvidenceViewer({
  findingId,
  bindingId,
  contextTask,
  onClose,
}: {
  findingId: string;
  bindingId: string | null;
  contextTask?: string;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [detail, setDetail] = React.useState<FindingTrafficDetail | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!bindingId) return;
    let active = true;
    setDetail(null);
    setError("");
    api
      .findingTrafficDetail(findingId, bindingId, contextTask)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [findingId, bindingId, contextTask]);

  async function more(side: "request" | "response") {
    if (!detail || !bindingId) return;
    setBusy(true);
    try {
      const next = await api.findingTrafficBody(findingId, bindingId, side, detail[side].next_offset, contextTask);
      setDetail((current) =>
        current?.binding.id === bindingId
          ? { ...current, [side]: { ...next, content: current[side].content + next.content } }
          : current,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={bindingId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t.trafficEvidenceTitle.replace("{id}", String(bindingId))}</DialogTitle>
          <DialogDescription className="break-all">
            {detail?.binding.snapshot.url ?? t.viewSnapshotDesc}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : detail ? (
          <Tabs defaultValue="request">
            <TabsList>
              <TabsTrigger value="request">{t.tabRequest}</TabsTrigger>
              <TabsTrigger value="response">{t.tabResponse}</TabsTrigger>
            </TabsList>
            {(["request", "response"] as const).map((side) => (
              <TabsContent key={side} value={side}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t.bodyBytes.replace("{total}", detail[side].total.toLocaleString())}
                    {detail[side].truncated ? t.previewSuffix : ""}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void api
                        .downloadFindingTrafficBody(findingId, detail.binding.id, side, contextTask)
                        .catch((e: Error) => toast.error(e.message))
                    }
                  >
                    {t.downloadFullBody.replace("{side}", side === "request" ? t.sideRequest : t.sideResponse)}
                  </Button>
                </div>
                <HttpCodeBlock
                  raw={`${(side === "request" ? detail.binding.snapshot.req_head : detail.binding.snapshot.resp_head)?.trimEnd() ?? ""}\n\n${detail[side].content}`}
                />
                {detail[side].truncated && !detail[side].binary ? (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void more(side)}>
                    {t.loadMoreBody}
                  </Button>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <Skeleton className="h-56 w-full" />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CapturedTrafficViewer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [detail, setDetail] = React.useState<TrafficDetail | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    if (!id) return;
    let active = true;
    setDetail(null);
    setError("");
    api
      .trafficExchange(id)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Dialog
      open={id !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t.previewTrafficTitle}</DialogTitle>
          <DialogDescription>{t.previewTrafficDesc.replace("{id}", String(id))}</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : detail ? (
          <Tabs defaultValue="request">
            <TabsList>
              <TabsTrigger value="request">{t.tabRequest}</TabsTrigger>
              <TabsTrigger value="response">{t.tabResponse}</TabsTrigger>
            </TabsList>
            <TabsContent value="request">
              <HttpCodeBlock raw={detail.req} />
            </TabsContent>
            <TabsContent value="response">
              <HttpCodeBlock raw={detail.resp} />
            </TabsContent>
          </Tabs>
        ) : (
          <Skeleton className="h-56 w-full" />
        )}
      </DialogContent>
    </Dialog>
  );
}
