"use client";

import * as React from "react";

import {
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EraserIcon,
  FilterXIcon,
  ListChecksIcon,
  Loader2Icon,
  RadioTowerIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { HttpCodeBlock } from "@/components/http-code-block";
import { LinkTrafficDialog } from "@/components/link-traffic-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SortableHead } from "@/components/ui/sortable-head";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import { useStoredSortPreference } from "@/lib/sort-preference";
import type { TrafficDetail, TrafficExchange, TrafficHost, TrafficResp } from "@/lib/types";
import { cn } from "@/lib/utils";

function fmtTime(ts: string, locale: string) {
  const dateLocale = ({ zh: "zh-CN", pt: "pt-BR" } as Record<string, string>)[locale] ?? "en-US";
  return new Date(ts).toLocaleString(dateLocale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtBytes(n: number) {
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const v = n / 1024 ** i;
  return `${i === 0 ? v : v.toFixed(1)} ${units[i]}`;
}

function statusTone(status: number) {
  if (status >= 500) return "text-red-500";
  if (status >= 400) return "text-amber-500";
  if (status >= 300) return "text-blue-500";
  if (status >= 200) return "text-emerald-500";
  return "text-muted-foreground";
}

function MethodBadge({ method }: { method: string }) {
  return <Badge className="shrink-0 font-mono">{method}</Badge>;
}

function requestWithHost(raw: string, exchange: TrafficExchange): string {
  if (!raw.trim() || /^host\s*:/im.test(raw)) return raw;
  let host = exchange.host;
  try {
    host = new URL(exchange.url).host || host;
  } catch {
    // Relative or legacy URLs fall back to the indexed host.
  }
  const newline = raw.includes("\r\n") ? "\r\n" : "\n";
  const firstLineEnd = raw.indexOf(newline);
  if (firstLineEnd < 0) return `${raw}${newline}Host: ${host}`;
  return `${raw.slice(0, firstLineEnd + newline.length)}Host: ${host}${newline}${raw.slice(firstLineEnd + newline.length)}`;
}

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const PAGE_SIZES = [25, 50, 100, 200];
type HostCountSortDirection = "asc" | "desc";

const SORT_FIELDS = ["ts", "status", "resp_len"] as const;
type SortField = (typeof SORT_FIELDS)[number];
const SORT_STORAGE_KEY = "traffic-sort";

const STATUS_BUCKETS = ["2xx", "3xx", "4xx", "5xx"];

export default function TrafficPage() {
  const { locale } = useI18n();
  const [selectedFlows, setSelectedFlows] = React.useState<Set<string>>(() => new Set());
  const [linking, setLinking] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(50);
  const [host, setHost] = React.useState("");
  const [hostQ, setHostQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [queryQ, setQueryQ] = React.useState("");
  const [method, setMethod] = React.useState("all");

  const [body, setBody] = React.useState("");
  const [bodyQ, setBodyQ] = React.useState("");
  const [path, setPath] = React.useState("");
  const [pathQ, setPathQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [respMin, setRespMin] = React.useState("");
  const [respMinQ, setRespMinQ] = React.useState("");
  const [respMax, setRespMax] = React.useState("");
  const [respMaxQ, setRespMaxQ] = React.useState("");
  const [sort, setSort] = useStoredSortPreference<SortField>(SORT_STORAGE_KEY, SORT_FIELDS, "ts", "desc");

  const [traffic, setTraffic] = React.useState<TrafficResp | null>(null);
  const [selected, setSelected] = React.useState<TrafficExchange | null>(null);
  const [detail, setDetail] = React.useState<TrafficDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const [hosts, setHosts] = React.useState<TrafficHost[]>([]);
  const [selectedHosts, setSelectedHosts] = React.useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [hostCountSortDirection, setHostCountSortDirection] = React.useState<HostCountSortDirection>("desc");

  const [deleteMode, setDeleteMode] = React.useState<"filter" | "selected" | "all" | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [reloadTick, setReloadTick] = React.useState(0);

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        title: "Tráfego",
        subtitle: "Proxy de Captura Global · Todo o tráfego HTTP",
        recording: "Gravando",
        disabled: "Desativado",
        totalRecords: (n: number) => `Total de ${n} registros`,
        selectTargets: (n: number) => `Selecionar Alvos (${n})`,
        selectTargetsPrompt: "Selecionar Alvos…",
        batchDeleteTitle: "Exclusão em Lote por Alvo",
        sortPacketsDesc: "Ordenar por contagem de pacotes (decrescente)",
        sortPacketsAsc: "Ordenar por contagem de pacotes (crescente)",
        deselectAll: "Desmarcar todos",
        selectAll: "Selecionar todos",
        noTrafficRecords: "Nenhum registro de tráfego",
        deleteSelected: (n: number) => `Excluir Selecionados (${n})`,
        deleteTarget: "Excluir Este Alvo",
        deleteTargetDisabledTip: "Primeiro selecione um alvo à esquerda ou digite o host",
        purgeAll: "Limpar Tudo",
        purgeAllTip: "Excluir todo o tráfego e compactar armazenamento",
        purgeAllNoRecordsTip: "Não há registros de tráfego no momento",
        searchPlaceholder: "Buscar em tudo (URL / método / tipo / status…)",
        methodPlaceholder: "Método",
        allMethods: "Todos os Métodos",
        perPage: "/ página",
        advancedFilters: "Filtros Avançados",
        bodyPlaceholder: "Conteúdo da resposta (palavras-chave ≥3 caracteres)",
        pathPlaceholder: "Caminho (ex.: /api/user/…)",
        statusPlaceholder: "Código de status",
        allStatuses: "Todos os códigos",
        respLength: "Tamanho",
        respMinPlaceholder: "Mín(B)",
        respMaxPlaceholder: "Máx(B)",
        clearFilters: "Limpar Filtros",
        selectedFlows: (n: number) => `Selecionados: ${n}`,
        linkToFinding: "Associar à Vulnerabilidade",
        clearSelection: "Limpar Seleção",
        timeCol: "Horário",
        methodCol: "Método",
        statusCol: "Código",
        typeCol: "Tipo de Conteúdo",
        lenCol: "Tamanho",
        selectPageAria: "Selecionar tráfego desta página",
        selectRowAria: (id: string) => `Selecionar tráfego ${id}`,
        noMatchingTraffic: "Sem tráfego correspondente.",
        loadingTraffic: "Carregando…",
        requestTab: "Requisição Request",
        responseTab: "Resposta Response",
        loadingPacket: "Carregando dados…",
        packetLoadFailed: "(Não foi possível carregar os dados do pacote)",
        cancel: "Cancelar",
        confirmPurge: "Confirmar Limpeza",
        confirmDelete: "Confirmar Exclusão",
        purging: "Limpando…",
        deleting: "Excluindo…",
        purgedSuccess: (n: number, freed: string) => `Limpos ${n} registros de tráfego${freed}`,
        freedStorage: (bytes: number) => `, liberando ${fmtBytes(bytes)} de armazenamento`,
        purgeFailed: (msg: string) => `Falha ao limpar: ${msg}`,
        purgeAllTitle: "Limpar todos os registros de tráfego?",
        deleteSelectedTitle: (n: number) => `Excluir todo o tráfego dos ${n} alvos selecionados?`,
        deleteFilterTitle: "Excluir todo o tráfego deste alvo?",
        purgeAllDesc:
          "Serão excluídos permanentemente todos os registros de tráfego (incluindo requisição e resposta brutas), desconsiderando filtros atuais. Esta ação não pode ser desfeita. Evidências já vinculadas a vulnerabilidades são mantidas em armazenamento dedicado e não serão afetadas.",
        purgeAllNotice:
          "Após a limpeza, o armazenamento será compactado para liberar espaço em disco para o sistema; a captura de tráfego será brevemente pausada durante esta operação.",
        deleteSelectedDescPrefix: "Serão excluídos permanentemente todos os registros de tráfego dos ",
        deleteSelectedDescSuffix:
          " alvos selecionados (incluindo requisição e resposta brutas). Esta ação não pode ser desfeita.",
        deleteFilterDescPrefix: "Serão excluídos permanentemente todos os registros de tráfego cujo host contenha ",
        deleteFilterDescSuffix: " (incluindo requisição e resposta brutas). Esta ação não pode ser desfeita.",
      };
    }
    if (locale === "zh") {
      return {
        title: "流量",
        subtitle: "全局录制代理 · 所有 HTTP 往来",
        recording: "录制中",
        disabled: "已停用",
        totalRecords: (n: number) => `共 ${n} 条`,
        selectTargets: (n: number) => `选择目标（${n}）`,
        selectTargetsPrompt: "选择目标…",
        batchDeleteTitle: "按目标批量删除",
        sortPacketsDesc: "按数据包数量倒序",
        sortPacketsAsc: "按数据包数量正序",
        deselectAll: "取消全选",
        selectAll: "全选",
        noTrafficRecords: "暂无流量记录",
        deleteSelected: (n: number) => `删除选中（${n}）`,
        deleteTarget: "删除该目标",
        deleteTargetDisabledTip: "先在左侧选择目标或输入 host",
        purgeAll: "清空全部",
        purgeAllTip: "删除全部流量并压缩存储",
        purgeAllNoRecordsTip: "当前没有流量记录",
        searchPlaceholder: "搜索全部（URL / 方法 / 类型 / 状态码…）",
        methodPlaceholder: "方法",
        allMethods: "全部方法",
        perPage: "/ 页",
        advancedFilters: "高级筛选",
        bodyPlaceholder: "响应内容（正文关键词，≥3字）",
        pathPlaceholder: "路径（如 /api/user/…）",
        statusPlaceholder: "状态码",
        allStatuses: "全部状态码",
        respLength: "响应长度",
        respMinPlaceholder: "最小(B)",
        respMaxPlaceholder: "最大(B)",
        clearFilters: "清除筛选",
        selectedFlows: (n: number) => `已选 ${n} 条流量`,
        linkToFinding: "关联到漏洞",
        clearSelection: "清空选择",
        timeCol: "时间",
        methodCol: "方法",
        statusCol: "状态码",
        typeCol: "content-type",
        lenCol: "响应长度",
        selectPageAria: "选择本页流量",
        selectRowAria: (id: string) => `选择流量 ${id}`,
        noMatchingTraffic: "没有匹配的流量。",
        loadingTraffic: "加载中…",
        requestTab: "请求 Request",
        responseTab: "响应 Response",
        loadingPacket: "加载报文…",
        packetLoadFailed: "（无法加载报文）",
        cancel: "取消",
        confirmPurge: "确认清空",
        confirmDelete: "确认删除",
        purging: "清空中…",
        deleting: "删除中…",
        purgedSuccess: (n: number, freed: string) => `已清空 ${n} 条流量${freed}`,
        freedStorage: (bytes: number) => `，释放 ${fmtBytes(bytes)} 存储`,
        purgeFailed: (msg: string) => `清空失败：${msg}`,
        purgeAllTitle: "清空全部流量记录？",
        deleteSelectedTitle: (n: number) => `删除选中的 ${n} 个目标的全部流量？`,
        deleteFilterTitle: "删除该目标的全部流量？",
        purgeAllDesc:
          "将永久删除全部流量记录（含请求/响应原文），忽略当前的筛选条件，此操作不可撤销。已绑定到漏洞的流量证据保存在独立的证据库中，不受影响。",
        purgeAllNotice: "清空后会顺带压缩存储，把索引占用的磁盘空间还给系统；这期间流量录制会短暂暂停。",
        deleteSelectedDescPrefix: "将永久删除选中的 ",
        deleteSelectedDescSuffix: " 个目标的所有流量记录（含请求/响应原文），此操作不可撤销。",
        deleteFilterDescPrefix: "将永久删除 host 包含 ",
        deleteFilterDescSuffix: " 的所有流量记录（含请求/响应原文），此操作不可撤销。",
      };
    }
    return {
      title: "Traffic",
      subtitle: "Global Capture Proxy · All HTTP Traffic",
      recording: "Recording",
      disabled: "Disabled",
      totalRecords: (n: number) => `Total of ${n} records`,
      selectTargets: (n: number) => `Select Targets (${n})`,
      selectTargetsPrompt: "Select Targets…",
      batchDeleteTitle: "Batch Delete by Target",
      sortPacketsDesc: "Sort by packet count (descending)",
      sortPacketsAsc: "Sort by packet count (ascending)",
      deselectAll: "Deselect all",
      selectAll: "Select all",
      noTrafficRecords: "No traffic records",
      deleteSelected: (n: number) => `Delete Selected (${n})`,
      deleteTarget: "Delete Target",
      deleteTargetDisabledTip: "First select a target on the left or enter a host",
      purgeAll: "Purge All",
      purgeAllTip: "Delete all traffic and compact storage",
      purgeAllNoRecordsTip: "No traffic records currently",
      searchPlaceholder: "Search all (URL / method / type / status…)",
      methodPlaceholder: "Method",
      allMethods: "All Methods",
      perPage: "/ page",
      advancedFilters: "Advanced Filters",
      bodyPlaceholder: "Response body (keywords ≥3 chars)",
      pathPlaceholder: "Path (e.g. /api/user/…)",
      statusPlaceholder: "Status Code",
      allStatuses: "All Status Codes",
      respLength: "Length",
      respMinPlaceholder: "Min (B)",
      respMaxPlaceholder: "Max (B)",
      clearFilters: "Clear Filters",
      selectedFlows: (n: number) => `Selected: ${n}`,
      linkToFinding: "Link to Finding",
      clearSelection: "Clear Selection",
      timeCol: "Time",
      methodCol: "Method",
      statusCol: "Status",
      typeCol: "Content-Type",
      lenCol: "Length",
      selectPageAria: "Select traffic on this page",
      selectRowAria: (id: string) => `Select traffic ${id}`,
      noMatchingTraffic: "No matching traffic.",
      loadingTraffic: "Loading…",
      requestTab: "Request",
      responseTab: "Response",
      loadingPacket: "Loading packet…",
      packetLoadFailed: "(Unable to load packet)",
      cancel: "Cancel",
      confirmPurge: "Confirm Purge",
      confirmDelete: "Confirm Delete",
      purging: "Purging…",
      deleting: "Deleting…",
      purgedSuccess: (n: number, freed: string) => `Purged ${n} traffic record(s)${freed}`,
      freedStorage: (bytes: number) => `, reclaiming ${fmtBytes(bytes)} storage`,
      purgeFailed: (msg: string) => `Purge failed: ${msg}`,
      purgeAllTitle: "Purge all traffic records?",
      deleteSelectedTitle: (n: number) => `Delete all traffic for the ${n} selected targets?`,
      deleteFilterTitle: "Delete all traffic for this target?",
      purgeAllDesc:
        "Permanently delete all traffic records (including raw request and response data), ignoring active filters. This action cannot be undone. Evidence already attached to findings is preserved separately and will not be affected.",
      purgeAllNotice:
        "Storage compaction will run after purge to return disk space to the system; capture will be briefly paused during this operation.",
      deleteSelectedDescPrefix: "Permanently delete all traffic for the ",
      deleteSelectedDescSuffix:
        " selected targets (including raw request and response data). This action cannot be undone.",
      deleteFilterDescPrefix: "Permanently delete all traffic for hosts containing ",
      deleteFilterDescSuffix: " (including raw request and response data). This action cannot be undone.",
    };
  }, [locale]);

  React.useEffect(() => {
    const t = setTimeout(() => setHostQ(host.trim()), 300);
    return () => clearTimeout(t);
  }, [host]);
  React.useEffect(() => {
    const t = setTimeout(() => setQueryQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);
  React.useEffect(() => {
    const t = setTimeout(() => setBodyQ(body.trim()), 300);
    return () => clearTimeout(t);
  }, [body]);
  React.useEffect(() => {
    const t = setTimeout(() => setPathQ(path.trim()), 300);
    return () => clearTimeout(t);
  }, [path]);
  React.useEffect(() => {
    const t = setTimeout(() => setRespMinQ(respMin.trim()), 300);
    return () => clearTimeout(t);
  }, [respMin]);
  React.useEffect(() => {
    const t = setTimeout(() => setRespMaxQ(respMax.trim()), 300);
    return () => clearTimeout(t);
  }, [respMax]);

  const hasAdvancedFilter = Boolean(bodyQ || pathQ || respMinQ || respMaxQ) || statusFilter !== "all";
  const resetAdvancedFilters = () => {
    setBody("");
    setBodyQ("");
    setPath("");
    setPathQ("");
    setStatusFilter("all");
    setRespMin("");
    setRespMinQ("");
    setRespMax("");
    setRespMaxQ("");
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: filter changes reset pagination to page 0
  React.useEffect(() => {
    setPage(0);
  }, [hostQ, queryQ, method, size, bodyQ, pathQ, statusFilter, respMinQ, respMaxQ, sort]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadTick is an explicit manual trigger
  React.useEffect(() => {
    let alive = true;
    const load = () => {
      api
        .traffic(page, size, hostQ, method, queryQ, {
          body: bodyQ,
          path: pathQ,
          status: statusFilter,
          respMin: respMinQ,
          respMax: respMaxQ,
          sort: sort.field,
          order: sort.direction,
        })
        .then((r) => {
          if (alive) setTraffic(r);
        })
        .catch(() => {
          /* Keep last snapshot on error */
        });
      api
        .trafficHosts()
        .then((r) => {
          if (alive) setHosts(r.hosts ?? []);
        })
        .catch(() => {
          /* Keep last host list on error */
        });
    };
    load();
    const t = setInterval(() => {
      if (page !== 0) return;
      load();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [page, size, hostQ, method, queryQ, bodyQ, pathQ, statusFilter, respMinQ, respMaxQ, sort, reloadTick]);

  const allSelected = hosts.length > 0 && hosts.every((h) => selectedHosts.includes(h.host));
  const sortedHosts = React.useMemo(
    () =>
      [...hosts].sort((a, b) => {
        const countOrder = hostCountSortDirection === "asc" ? a.count - b.count : b.count - a.count;
        return countOrder || a.host.localeCompare(b.host);
      }),
    [hosts, hostCountSortDirection],
  );

  let deleteTitle = "";
  if (deleteMode === "all") {
    deleteTitle = strings.purgeAllTitle;
  } else if (deleteMode === "selected") {
    deleteTitle = strings.deleteSelectedTitle(selectedHosts.length);
  } else if (deleteMode === "filter") {
    deleteTitle = strings.deleteFilterTitle;
  }

  const confirmBtnText = deleteMode === "all" ? strings.confirmPurge : strings.confirmDelete;
  const inProgressText = deleteMode === "all" ? strings.purging : strings.deleting;

  const requestDelete = (mode: "filter" | "selected" | "all"): Promise<{ deleted: number; reclaimed?: number }> => {
    if (mode === "all") return api.trafficDeleteAll();
    if (mode === "selected") return api.trafficDeleteHosts(selectedHosts);
    return api.trafficDeleteHost(hostQ);
  };

  const confirmDelete = () => {
    if (!deleteMode) return;
    setDeleting(true);
    const mode = deleteMode;
    requestDelete(mode)
      .then((r) => {
        setDeleteMode(null);
        setSelected(null);
        setDetail(null);
        if (mode !== "filter") {
          setSelectedHosts([]);
          setPickerOpen(false);
        }
        if (mode === "all") {
          const reclaimed = r.reclaimed ?? 0;
          const freed = reclaimed > 0 ? strings.freedStorage(reclaimed) : "";
          toast.success(strings.purgedSuccess(r.deleted, freed));
        }
        setPage(0);
        setReloadTick((t) => t + 1);
      })
      .catch((e) => {
        if (mode === "all") toast.error(strings.purgeFailed((e as Error).message));
      })
      .finally(() => setDeleting(false));
  };

  React.useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    setDetail(null);
    api
      .trafficExchange(selected.id)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch(() => {
        if (alive) setDetail({ req: strings.packetLoadFailed, resp: "" });
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selected, strings.packetLoadFailed]);

  const toggleSort = (field: SortField) =>
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "desc" },
    );

  const exchanges = React.useMemo(() => traffic?.exchanges ?? [], [traffic]);
  const total = traffic?.total ?? exchanges.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const rangeStart = total === 0 ? 0 : page * size + 1;
  const rangeEnd = page * size + exchanges.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{strings.title}</h1>
          <p className="text-muted-foreground text-sm">{strings.subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
              traffic?.enabled
                ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "border-transparent bg-muted text-muted-foreground",
            )}
          >
            <RadioTowerIcon className="size-3.5" />
            {traffic?.enabled ? strings.recording : strings.disabled}
          </span>
          {traffic?.proxy && <span className="font-mono text-xs text-muted-foreground">{traffic.proxy}</span>}
          <span className="text-xs text-muted-foreground">{strings.totalRecords(traffic?.count ?? 0)}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <ListChecksIcon className="size-3.5" />
              {selectedHosts.length > 0 ? strings.selectTargets(selectedHosts.length) : strings.selectTargetsPrompt}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[calc(100vw-2rem)] p-0 data-open:animate-none data-closed:animate-none sm:w-80"
            align="start"
            collisionPadding={16}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">{strings.batchDeleteTitle}</span>
              <div className="flex items-center gap-1">
                {hosts.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setHostCountSortDirection((current) => (current === "desc" ? "asc" : "desc"))}
                        aria-label={
                          hostCountSortDirection === "desc" ? strings.sortPacketsDesc : strings.sortPacketsAsc
                        }
                      >
                        {hostCountSortDirection === "desc" ? <ArrowDownWideNarrowIcon /> : <ArrowUpNarrowWideIcon />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {hostCountSortDirection === "desc" ? strings.sortPacketsDesc : strings.sortPacketsAsc}
                    </TooltipContent>
                  </Tooltip>
                )}
                {hosts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSelectedHosts(allSelected ? [] : hosts.map((h) => h.host))}
                  >
                    {allSelected ? strings.deselectAll : strings.selectAll}
                  </Button>
                )}
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {hosts.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">{strings.noTrafficRecords}</div>
              ) : (
                sortedHosts.map((h, index) => (
                  <label
                    key={h.host}
                    htmlFor={`traffic-host-${index}`}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    <Checkbox
                      id={`traffic-host-${index}`}
                      checked={selectedHosts.includes(h.host)}
                      onCheckedChange={() =>
                        setSelectedHosts((prev) =>
                          prev.includes(h.host) ? prev.filter((x) => x !== h.host) : [...prev, h.host],
                        )
                      }
                    />
                    <span className="truncate font-mono">{h.host}</span>
                    <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{h.count}</span>
                  </label>
                ))
              )}
            </div>
            <div className="border-t p-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={selectedHosts.length === 0}
                onClick={() => {
                  setDeleteMode("selected");
                  setPickerOpen(false);
                }}
              >
                {strings.deleteSelected(selectedHosts.length)}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <div className="relative w-48">
          <Input placeholder="host…" value={host} onChange={(e) => setHost(e.target.value)} className="h-8" />
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="h-8"
          disabled={!hostQ || deleting}
          title={hostQ ? undefined : strings.deleteTargetDisabledTip}
          onClick={() => setDeleteMode("filter")}
        >
          <Trash2Icon className="size-3.5" />
          {strings.deleteTarget}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={!traffic?.count || deleting}
          title={traffic?.count ? strings.purgeAllTip : strings.purgeAllNoRecordsTip}
          onClick={() => setDeleteMode("all")}
        >
          <EraserIcon className="size-3.5" />
          {strings.purgeAll}
        </Button>
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={strings.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8"
          />
        </div>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder={strings.methodPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{strings.allMethods}</SelectItem>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(size)} onValueChange={(v) => setSize(Number(v))}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} {strings.perPage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {rangeStart}–{rangeEnd} / {total}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="tabular-nums">
            {page + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* Advanced filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
        <span className="pl-1 text-xs font-medium text-muted-foreground">{strings.advancedFilters}</span>
        <div className="relative w-56">
          <Input
            placeholder={strings.bodyPlaceholder}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="relative w-52">
          <Input
            placeholder={strings.pathPlaceholder}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="h-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue placeholder={strings.statusPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{strings.allStatuses}</SelectItem>
            {STATUS_BUCKETS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{strings.respLength}</span>
          <Input
            type="number"
            min={0}
            placeholder={strings.respMinPlaceholder}
            value={respMin}
            onChange={(e) => setRespMin(e.target.value)}
            className="h-8 w-24"
          />
          <span>–</span>
          <Input
            type="number"
            min={0}
            placeholder={strings.respMaxPlaceholder}
            value={respMax}
            onChange={(e) => setRespMax(e.target.value)}
            className="h-8 w-24"
          />
        </div>
        {hasAdvancedFilter ? (
          <Button variant="ghost" size="sm" className="h-8" onClick={resetAdvancedFilters}>
            <FilterXIcon className="size-3.5" />
            {strings.clearFilters}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{strings.selectedFlows(selectedFlows.size)}</span>
        <Button variant="outline" size="sm" disabled={selectedFlows.size === 0} onClick={() => setLinking(true)}>
          {strings.linkToFinding}
        </Button>
        {selectedFlows.size > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setSelectedFlows(new Set())}>
            {strings.clearSelection}
          </Button>
        ) : null}
      </div>

      {/* History table */}
      <div className="flex h-[calc(100vh-15rem)] min-h-0 flex-col">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden py-0">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label={strings.selectPageAria}
                      checked={exchanges.length > 0 && exchanges.every((e) => selectedFlows.has(e.id))}
                      onCheckedChange={(checked) =>
                        setSelectedFlows((previous) => {
                          const next = new Set(previous);
                          for (const e of exchanges) {
                            if (checked === true) next.add(e.id);
                            else next.delete(e.id);
                          }
                          return next;
                        })
                      }
                    />
                  </TableHead>
                  <SortableHead
                    field="ts"
                    label={strings.timeCol}
                    activeField={sort.field}
                    direction={sort.direction}
                    onSort={toggleSort}
                    className="w-36"
                  />
                  <TableHead className="w-44">host</TableHead>
                  <TableHead className="w-20">{strings.methodCol}</TableHead>
                  <TableHead>URL</TableHead>
                  <SortableHead
                    field="status"
                    label={strings.statusCol}
                    activeField={sort.field}
                    direction={sort.direction}
                    onSort={toggleSort}
                    className="w-20"
                  />
                  <TableHead className="w-36">{strings.typeCol}</TableHead>
                  <SortableHead
                    field="resp_len"
                    label={strings.lenCol}
                    activeField={sort.field}
                    direction={sort.direction}
                    onSort={toggleSort}
                    align="right"
                    className="w-24 text-right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchanges.map((e) => (
                  <TableRow
                    key={e.id}
                    className={cn("cursor-pointer", selected?.id === e.id && "bg-accent hover:bg-accent")}
                    onClick={() => setSelected(e)}
                  >
                    <TableCell>
                      <Checkbox
                        aria-label={strings.selectRowAria(e.id)}
                        checked={selectedFlows.has(e.id)}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={(checked) =>
                          setSelectedFlows((previous) => {
                            const next = new Set(previous);
                            if (checked === true) next.add(e.id);
                            else next.delete(e.id);
                            return next;
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {fmtTime(e.ts, locale)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.host}</TableCell>
                    <TableCell>
                      <MethodBadge method={e.method} />
                    </TableCell>
                    <TableCell className="max-w-0">
                      <span className="block truncate font-mono text-xs">{e.url}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("font-mono text-xs font-semibold tabular-nums", statusTone(e.status))}>
                        {e.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.content_type}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{fmtBytes(e.resp_len)}</TableCell>
                  </TableRow>
                ))}
                {exchanges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      {traffic === null ? strings.loadingTraffic : strings.noMatchingTraffic}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {linking ? (
        <LinkTrafficDialog
          trafficIds={[...selectedFlows]}
          onClose={() => setLinking(false)}
          onBound={() => setSelectedFlows(new Set())}
        />
      ) : null}
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full! max-w-none! gap-0 p-0 sm:w-[48rem]! sm:max-w-[48rem]!">
          {selected && (
            <>
              <SheetHeader className="border-b px-5 py-4">
                <div className="flex items-center gap-2 pr-8">
                  <MethodBadge method={selected.method} />
                  <Badge variant="secondary" className={cn("font-mono tabular-nums", statusTone(selected.status))}>
                    {selected.status}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {fmtTime(selected.ts, locale)}
                  </span>
                </div>
                <SheetTitle className="break-all font-mono">{selected.host}</SheetTitle>
                <SheetDescription className="break-all font-mono">{selected.url}</SheetDescription>
              </SheetHeader>
              <Tabs defaultValue="request" className="min-h-0 flex-1 gap-0">
                <TabsList className="mx-5 mt-4 grid w-auto grid-cols-2">
                  <TabsTrigger value="request">{strings.requestTab}</TabsTrigger>
                  <TabsTrigger value="response">{strings.responseTab}</TabsTrigger>
                </TabsList>
                <TabsContent value="request" className="min-h-0 overflow-auto">
                  {detailLoading ? (
                    <div className="flex items-center gap-2 p-5 text-xs text-muted-foreground">
                      <Loader2Icon className="size-3.5 animate-spin" />
                      {strings.loadingPacket}
                    </div>
                  ) : (
                    <HttpCodeBlock raw={requestWithHost(detail?.req ?? "", selected)} />
                  )}
                </TabsContent>
                <TabsContent value="response" className="min-h-0 overflow-auto">
                  {detailLoading ? (
                    <div className="flex items-center gap-2 p-5 text-xs text-muted-foreground">
                      <Loader2Icon className="size-3.5 animate-spin" />
                      {strings.loadingPacket}
                    </div>
                  ) : (
                    <HttpCodeBlock raw={detail?.resp ?? ""} />
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteMode !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteMode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "all" && (
                <>
                  {strings.purgeAllDesc}
                  <br />
                  <span className="text-muted-foreground">{strings.purgeAllNotice}</span>
                </>
              )}
              {deleteMode === "selected" && (
                <>
                  {strings.deleteSelectedDescPrefix}
                  <span className="font-semibold tabular-nums">{selectedHosts.length}</span>{" "}
                  {selectedHosts.length > 0 && (
                    <span className="font-mono">
                      ({selectedHosts.slice(0, 3).join(", ")}
                      {selectedHosts.length > 3 ? "…" : ""})
                    </span>
                  )}
                  {strings.deleteSelectedDescSuffix}
                </>
              )}
              {deleteMode === "filter" && (
                <>
                  {strings.deleteFilterDescPrefix}
                  <span className="font-mono font-semibold">{hostQ}</span>
                  {strings.deleteFilterDescSuffix}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{strings.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? inProgressText : confirmBtnText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
