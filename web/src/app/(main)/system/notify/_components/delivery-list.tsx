"use client";

import * as React from "react";

import { RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import { statusMeta, toneClasses } from "@/lib/status";
import type { NotificationChannel, NotificationDelivery } from "@/lib/types";

// DeliveryList 是投递记录表：可按渠道与状态筛选，失败项可手动重发。

const I18N = {
  en: {
    loadFailed: "Failed to load delivery records: ",
    requeued: "Re-queued for delivery",
    retryFailed: "Retry failed: ",
    allChannels: "All Channels",
    allStates: "All States",
    refresh: "Refresh",
    totalCount: (tot: number) => `Total ${tot}`,
    colTime: "Time",
    colFinding: "Vulnerability",
    colChannel: "Channel",
    colState: "Status",
    colAttempts: "Attempts",
    colError: "Error",
    empty: "No delivery records found",
    loading: "Loading...",
    noTitle: "(Untitled)",
    statusChanged: "Status Changed",
    retryBtn: "Retry",
    prevPage: "Previous",
    nextPage: "Next",
  },
  pt: {
    loadFailed: "Falha ao carregar registros de entrega: ",
    requeued: "Reinserido na fila de entrega",
    retryFailed: "Falha ao reenviar: ",
    allChannels: "Todos os Canais",
    allStates: "Todos os Estados",
    refresh: "Atualizar",
    totalCount: (tot: number) => `Total de ${tot}`,
    colTime: "Hora",
    colFinding: "Vulnerabilidade",
    colChannel: "Canal",
    colState: "Status",
    colAttempts: "Tentativas",
    colError: "Erro",
    empty: "Nenhum registro de entrega encontrado",
    loading: "Carregando...",
    noTitle: "(Sem título)",
    statusChanged: "Status alterado",
    retryBtn: "Reenviar",
    prevPage: "Anterior",
    nextPage: "Próxima",
  },
  zh: {
    loadFailed: "读取投递记录失败：",
    requeued: "已重新入队",
    retryFailed: "重发失败：",
    allChannels: "全部渠道",
    allStates: "全部状态",
    refresh: "刷新",
    totalCount: (tot: number) => `共 ${tot} 条`,
    colTime: "时间",
    colFinding: "漏洞",
    colChannel: "渠道",
    colState: "状态",
    colAttempts: "尝试",
    colError: "错误",
    empty: "暂无投递记录",
    loading: "加载中…",
    noTitle: "（无标题）",
    statusChanged: "{t.statusChanged}",
    retryBtn: "重发",
    prevPage: "{t.prevPage}",
    nextPage: "{t.nextPage}",
  },
};

export function DeliveryList({ channels }: { channels: NotificationChannel[] }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;
  const [rows, setRows] = React.useState<NotificationDelivery[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [channelID, setChannelID] = React.useState<number | undefined>(undefined);
  const [state, setState] = React.useState<string | undefined>(undefined);
  const [loading, setLoading] = React.useState(false);
  const pageSize = 50;

  const load = React.useCallback(() => {
    setLoading(true);
    api
      .notifyDeliveries({ channelId: channelID, state, page, pageSize })
      .then((r) => {
        setRows(r.deliveries);
        setTotal(r.total);
      })
      .catch((e) => toast.error(t.loadFailed + (e as Error).message))
      .finally(() => setLoading(false));
  }, [channelID, state, page, t.loadFailed]);
  React.useEffect(() => {
    load();
  }, [load]);

  async function retry(id: number) {
    try {
      await api.notifyRetryDelivery(id);
      toast.success(t.requeued);
      load();
    } catch (e) {
      toast.error(t.retryFailed + (e as Error).message);
    }
  }

  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={channelID ? String(channelID) : "all"}
          onValueChange={(v) => {
            setPage(1);
            setChannelID(v === "all" ? undefined : Number(v));
          }}
        >
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder={t.allChannels} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allChannels}</SelectItem>
            {channels.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={state ?? "all"}
          onValueChange={(v) => {
            setPage(1);
            setState(v === "all" ? undefined : v);
          }}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder={t.allStates} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStates}</SelectItem>
            {["pending", "sending", "sent", "failed", "skipped"].map((s) => (
              <SelectItem key={s} value={s}>
                {statusMeta("delivery", s, locale).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCwIcon className={loading ? "animate-spin" : ""} /> {t.refresh}
        </Button>
        <span className="text-muted-foreground ml-auto text-xs">{t.totalCount(total)}</span>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">{t.colTime}</TableHead>
              <TableHead>{t.colFinding}</TableHead>
              <TableHead className="w-40">{t.colChannel}</TableHead>
              <TableHead className="w-24">{t.colState}</TableHead>
              <TableHead className="w-16">{t.colAttempts}</TableHead>
              <TableHead>{t.colError}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  {loading ? t.loading : t.empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatTime(d.created_at, locale)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={toneClasses[statusMeta("severity", d.severity).tone]}>
                        {statusMeta("severity", d.severity, locale).label}
                      </Badge>
                      <span className="truncate text-sm">{d.title || t.noTitle}</span>
                      {d.event_kind === "finding_status_changed" && (
                        <Badge variant="outline" className="shrink-0">
                          {t.statusChanged}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{d.channel_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={toneClasses[statusMeta("delivery", d.state).tone]}>
                      {statusMeta("delivery", d.state, locale).label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.attempts}</TableCell>
                  <TableCell className="text-muted-foreground max-w-md text-xs break-all">{d.last_error}</TableCell>
                  <TableCell>
                    {/* 只有失败/跳过的才给重发入口：已送达的重发会造成重复推送。 */}
                    {(d.state === "failed" || d.state === "skipped") && (
                      <Button size="sm" variant="outline" onClick={() => retry(d.id)}>
                        <RotateCcwIcon /> {t.retryBtn}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {maxPage > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t.prevPage}
          </Button>
          <span className="text-muted-foreground text-sm">
            {page} / {maxPage}
          </span>
          <Button size="sm" variant="outline" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>
            {t.nextPage}
          </Button>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string, locale: "en" | "pt" | "zh" = "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dateLocale = locale === "zh" ? "zh-CN" : locale === "pt" ? "pt-BR" : "en-US";
  return d.toLocaleString(dateLocale, { hour12: false });
}
