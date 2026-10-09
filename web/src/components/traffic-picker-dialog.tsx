"use client";

import * as React from "react";

import { toast } from "sonner";

import { CapturedTrafficViewer } from "@/components/traffic-evidence-viewer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { FindingTrafficBinding, TrafficResp } from "@/lib/types";

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

const I18N = {
  en: {
    boundSuccess: (count: number) => `Bound ${count} traffic flow(s)`,
    title: "Bind Traffic",
    description:
      "Filter and select multiple requests/responses; selections are retained across pages. Configure roles, notes, and ordering after binding.",
    targetHost: "Target Host",
    hostPlaceholder: "Domain or IP",
    methodLabel: "HTTP Method",
    allMethods: "All Methods",
    keywordsLabel: "Keywords",
    queryPlaceholder: "URL / Body keywords",
    selectPageAria: "Select unbound traffic on this page",
    selectTrafficAria: (id: string) => `Select traffic ${id}`,
    methodUrlHeader: "Method / URL",
    timeHeader: "Time",
    statusCodeHeader: "Status",
    actionsHeader: "Actions",
    boundBadge: "Bound",
    previewBtn: "Preview",
    loading: "Loading…",
    noMatching: "No matching traffic",
    selectedSummary: (selected: number, total: number) => `Selected ${selected} · Total ${total}`,
    prevPage: "Previous",
    pageCounter: (page: number) => `Page ${page}`,
    nextPage: "Next",
    cancel: "Cancel",
    saving: "Saving…",
    saveBtn: (count: number) => `Bind ${count} traffic flow(s)`,
  },
  pt: {
    boundSuccess: (count: number) => `${count} fluxo(s) de tráfego vinculado(s)`,
    title: "Vincular Tráfego",
    description:
      "Filtre e selecione múltiplas requisições/respostas; as seleções persistem entre páginas. Configure funções, notas e ordem após vincular.",
    targetHost: "Host de Destino",
    hostPlaceholder: "Domínio ou IP",
    methodLabel: "Método HTTP",
    allMethods: "Todos os Métodos",
    keywordsLabel: "Palavras-chave",
    queryPlaceholder: "URL / Palavras-chave no corpo",
    selectPageAria: "Selecionar tráfego não vinculado nesta página",
    selectTrafficAria: (id: string) => `Selecionar tráfego ${id}`,
    methodUrlHeader: "Método / URL",
    timeHeader: "Horário",
    statusCodeHeader: "Status",
    actionsHeader: "Ações",
    boundBadge: "Vinculado",
    previewBtn: "Pré-visualizar",
    loading: "Carregando…",
    noMatching: "Nenhum tráfego correspondente",
    selectedSummary: (selected: number, total: number) => `Selecionado(s) ${selected} · Total ${total}`,
    prevPage: "Anterior",
    pageCounter: (page: number) => `Página ${page}`,
    nextPage: "Próxima",
    cancel: "Cancelar",
    saving: "Salvando…",
    saveBtn: (count: number) => `Vincular ${count} fluxo(s) de tráfego`,
  },
  zh: {
    boundSuccess: (count: number) => `已绑定 ${count} 条流量`,
    title: "绑定流量",
    description: "筛选并多选请求/响应，已选记录会跨页保留。绑定后可设置用途、说明和顺序。",
    targetHost: "目标 host",
    hostPlaceholder: "域名或 IP",
    methodLabel: "请求方法",
    allMethods: "全部方法",
    keywordsLabel: "关键词",
    queryPlaceholder: "URL / 正文关键词",
    selectPageAria: "选择本页未绑定流量",
    selectTrafficAria: (id: string) => `选择流量 ${id}`,
    methodUrlHeader: "方法 / URL",
    timeHeader: "时间",
    statusCodeHeader: "状态码",
    actionsHeader: "操作",
    boundBadge: "已绑定",
    previewBtn: "预览",
    loading: "加载中…",
    noMatching: "没有匹配的流量",
    selectedSummary: (selected: number, total: number) => `已选 ${selected} 条 · 共 ${total} 条`,
    prevPage: "上一页",
    pageCounter: (page: number) => `第 ${page} 页`,
    nextPage: "下一页",
    cancel: "取消",
    saving: "保存中…",
    saveBtn: (count: number) => `绑定 ${count} 条流量`,
  },
};

const DATE_LOCALES: Record<string, string> = {
  zh: "zh-CN",
  pt: "pt-BR",
  en: "en-US",
};

export function TrafficPickerDialog({
  findingId,
  contextTask,
  bound,
  onClose,
  onBound,
}: {
  findingId: string;
  contextTask?: string;
  bound: FindingTrafficBinding[];
  onClose: () => void;
  onBound: () => void;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;
  const dateLocale = DATE_LOCALES[locale] ?? "en-US";

  const [host, setHost] = React.useState("");
  const [method, setMethod] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [data, setData] = React.useState<TrafficResp | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [preview, setPreview] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const alreadyBound = new Set(bound.map((b) => b.snapshot.source_traffic_id));

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      api
        .traffic(page, 25, host, method === "all" ? "" : method, query)
        .then((d) => {
          if (active) setData(d);
        })
        .catch((e: Error) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, host, method, query]);

  const rows = data?.exchanges ?? [];
  const selectable = rows.filter((e) => !alreadyBound.has(e.id));
  function toggle(id: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.bindFindingTraffic(
        findingId,
        [...selected].map((traffic_id) => ({ traffic_id })),
        contextTask,
      );
      toast.success(t.boundSuccess(selected.size));
      onBound();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="flex flex-col gap-3 sm:flex-row">
            <Field>
              <FieldLabel htmlFor="evidence-host">{t.targetHost}</FieldLabel>
              <Input
                id="evidence-host"
                value={host}
                placeholder={t.hostPlaceholder}
                onChange={(e) => {
                  setHost(e.target.value);
                  setPage(0);
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="evidence-method">{t.methodLabel}</FieldLabel>
              <Select
                value={method}
                onValueChange={(v) => {
                  setMethod(v);
                  setPage(0);
                }}
              >
                <SelectTrigger id="evidence-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{t.allMethods}</SelectItem>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="evidence-query">{t.keywordsLabel}</FieldLabel>
              <Input
                id="evidence-query"
                value={query}
                placeholder={t.queryPlaceholder}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </Field>
          </FieldGroup>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="max-h-[45vh] overflow-auto rounded-md border" aria-busy={loading}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      aria-label={t.selectPageAria}
                      disabled={loading || busy || selectable.length === 0}
                      checked={selectable.length > 0 && selectable.every((e) => selected.has(e.id))}
                      onCheckedChange={(checked) =>
                        setSelected((previous) => {
                          const next = new Set(previous);
                          for (const e of selectable) {
                            if (checked === true) next.add(e.id);
                            else next.delete(e.id);
                          }
                          return next;
                        })
                      }
                    />
                  </TableHead>
                  <TableHead>{t.methodUrlHeader}</TableHead>
                  <TableHead>{t.timeHeader}</TableHead>
                  <TableHead>{t.statusCodeHeader}</TableHead>
                  <TableHead>{t.actionsHeader}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Checkbox
                        aria-label={t.selectTrafficAria(e.id)}
                        checked={selected.has(e.id) || alreadyBound.has(e.id)}
                        disabled={busy || loading || alreadyBound.has(e.id)}
                        onCheckedChange={(checked) => toggle(e.id, checked === true)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">
                        {e.method} {e.url}
                      </span>
                      {alreadyBound.has(e.id) ? <Badge variant="secondary">{t.boundBadge}</Badge> : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(e.ts).toLocaleString(dateLocale)}
                    </TableCell>
                    <TableCell>{e.status}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setPreview(e.id)}>
                        {t.previewBtn}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center">
                      {loading ? t.loading : t.noMatching}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">{t.selectedSummary(selected.size, data?.total ?? 0)}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                {t.prevPage}
              </Button>
              <span className="text-xs">{t.pageCounter(page + 1)}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || (page + 1) * 25 >= (data?.total ?? 0)}
                onClick={() => setPage((p) => p + 1)}
              >
                {t.nextPage}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button disabled={busy || selected.size === 0} onClick={() => void save()}>
              {busy ? t.saving : t.saveBtn(selected.size)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CapturedTrafficViewer id={preview} onClose={() => setPreview(null)} />
    </>
  );
}
