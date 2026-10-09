"use client";

import * as React from "react";

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Loader2Icon,
  RadioIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { LLMRecordDetail, LLMRecordItem, LLMTask } from "@/lib/types";
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

function fmtLatency(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function tryFormatJSON(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function CopyButton({ text }: { text: string }) {
  const { locale } = useI18n();
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const tooltip = React.useMemo(() => {
    if (locale === "pt") return copied ? "Copiado" : "Copiar conteúdo";
    if (locale === "zh") return copied ? "已复制" : "复制内容";
    return copied ? "Copied" : "Copy content";
  }, [copied, locale]);

  const disabled = !text;
  const copy = async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* unsupported fallback */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button variant="ghost" size="icon" className="size-5 shrink-0" disabled={disabled} title={tooltip} onClick={copy}>
      {copied ? <CheckIcon className="size-3 text-emerald-600" /> : <CopyIcon className="size-3" />}
    </Button>
  );
}

const PAGE_SIZES = [25, 50, 100];

export default function LLMRecordsPage() {
  const { locale } = useI18n();
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(50);
  const [session, setSession] = React.useState("");
  const [sessionQ, setSessionQ] = React.useState("");
  const [model, setModel] = React.useState("");

  const [records, setRecords] = React.useState<LLMRecordItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [recEnabled, setRecEnabled] = React.useState(false);
  const [recBusy, setRecBusy] = React.useState(false);

  const [selected, setSelected] = React.useState<LLMRecordItem | null>(null);
  const [detail, setDetail] = React.useState<LLMRecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [rawView, setRawView] = React.useState(false);

  const [tasks, setTasks] = React.useState<LLMTask[]>([]);
  const [pickedTask, setPickedTask] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [reloadTick, setReloadTick] = React.useState(0);

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        title: "Gravação LLM",
        searchSession: "Buscar Session ID...",
        modelPlaceholder: "Model",
        selectTask: "Selecionar tarefa…",
        noTasks: "Nenhuma tarefa registrada",
        deleteTaskCalls: "Excluir conversas da tarefa",
        deleteTaskCallsDisabledTip: "Primeiro selecione uma tarefa acima",
        perPage: "/ página",
        recording: "Gravando",
        recordingOff: "Desativado",
        timeCol: "Horário",
        taskCol: "Tarefa",
        workerCol: "Worker",
        profileCol: "Profile",
        modelCol: "Model",
        latencyCol: "Latência",
        tokensCol: "Tokens",
        statusCol: "Status",
        noRecords: "Nenhum registro de chamada LLM",
        taskTag: (id: string) => `Tarefa #${id}`,
        rawBtn: "Original",
        rawBtnTipHas: "Visualizar HTTP original trocado com o provider",
        rawBtnTipNone: "Este registro foi gravado antes do recurso de captura bruta, sem dados brutos",
        reqSection: "Request",
        reqSectionRaw: "Request · Original",
        respSection: "Response",
        respSectionRaw: "Response · Original (SSE)",
        loading: "Carregando…",
        empty: "(vazio)",
        deleteConfirmTitle: (task: string) => `Excluir todas as chamadas LLM da tarefa "${task}"?`,
        deleteConfirmDesc:
          "Todos os registros de chamadas LLM desta tarefa (incluindo requisição/resposta originais) serão excluídos permanentemente. Esta ação não pode ser desfeita.",
        cancel: "Cancelar",
        confirmDelete: "Confirmar exclusão",
        deleting: "Excluindo…",
      };
    }
    if (locale === "zh") {
      return {
        title: "LLM 录制",
        searchSession: "搜索 Session ID...",
        modelPlaceholder: "Model",
        selectTask: "选择任务…",
        noTasks: "暂无任务记录",
        deleteTaskCalls: "删除任务对话",
        deleteTaskCallsDisabledTip: "先在上方选择任务",
        perPage: "/ 页",
        recording: "录制中",
        recordingOff: "已关闭",
        timeCol: "时间",
        taskCol: "任务",
        workerCol: "Worker",
        profileCol: "Profile",
        modelCol: "Model",
        latencyCol: "延迟",
        tokensCol: "Tokens",
        statusCol: "状态",
        noRecords: "暂无 LLM 调用记录",
        taskTag: (id: string) => `任务 #${id}`,
        rawBtn: "原文",
        rawBtnTipHas: "查看与 provider 实际收发的 HTTP 原文",
        rawBtnTipNone: "该记录录制于此功能上线前，无原文",
        reqSection: "Request",
        reqSectionRaw: "Request · 原文",
        respSection: "Response",
        respSectionRaw: "Response · 原文（SSE）",
        loading: "加载…",
        empty: "（空）",
        deleteConfirmTitle: (task: string) => `删除任务「${task}」的全部 LLM 对话？`,
        deleteConfirmDesc: "将永久删除该任务的所有 LLM 调用记录（含请求/响应原文），此操作不可撤销。",
        cancel: "取消",
        confirmDelete: "确认删除",
        deleting: "删除中…",
      };
    }
    return {
      title: "LLM Records",
      searchSession: "Search Session ID...",
      modelPlaceholder: "Model",
      selectTask: "Select task…",
      noTasks: "No task records",
      deleteTaskCalls: "Delete Task Dialogs",
      deleteTaskCallsDisabledTip: "Select a task above first",
      perPage: "/ page",
      recording: "Recording",
      recordingOff: "Off",
      timeCol: "Time",
      taskCol: "Task",
      workerCol: "Worker",
      profileCol: "Profile",
      modelCol: "Model",
      latencyCol: "Latency",
      tokensCol: "Tokens",
      statusCol: "Status",
      noRecords: "No LLM invocation records",
      taskTag: (id: string) => `Task #${id}`,
      rawBtn: "Raw",
      rawBtnTipHas: "View original raw HTTP exchanged with provider",
      rawBtnTipNone: "This record was captured before raw logging was enabled, no raw data",
      reqSection: "Request",
      reqSectionRaw: "Request · Raw",
      respSection: "Response",
      respSectionRaw: "Response · Raw (SSE)",
      loading: "Loading…",
      empty: "(empty)",
      deleteConfirmTitle: (task: string) => `Delete all LLM calls for task "${task}"?`,
      deleteConfirmDesc:
        "All LLM call records for this task (including raw request/response) will be permanently deleted. This action cannot be undone.",
      cancel: "Cancel",
      confirmDelete: "Confirm Delete",
      deleting: "Deleting…",
    };
  }, [locale]);

  const hasRaw = !!(detail?.raw_request || detail?.raw_response);
  const showRaw = rawView && hasRaw;

  let reqText = "";
  if (showRaw) {
    reqText = detail?.raw_request ? tryFormatJSON(detail.raw_request) : "";
  } else {
    reqText = detail?.request_body ? tryFormatJSON(detail.request_body) : "";
  }

  let respText = "";
  if (showRaw) {
    respText = detail?.raw_response ?? "";
  } else {
    respText = detail?.response_body ? tryFormatJSON(detail.response_body) : "";
  }

  React.useEffect(() => {
    let alive = true;
    api
      .settings()
      .then((s) => {
        if (alive) setRecEnabled(!!s.llm_record);
      })
      .catch(() => {
        /* ignore settings error */
      });
    return () => {
      alive = false;
    };
  }, []);

  const toggleRecording = async (on: boolean) => {
    setRecBusy(true);
    setRecEnabled(on);
    try {
      const s = await api.setSettings({ llm_record: on });
      setRecEnabled(!!s.llm_record);
    } catch {
      setRecEnabled(!on);
    } finally {
      setRecBusy(false);
    }
  };

  React.useEffect(() => {
    const t = setTimeout(() => setSessionQ(session.trim()), 300);
    return () => clearTimeout(t);
  }, [session]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: filter change resets pagination
  React.useEffect(() => {
    setPage(0);
  }, [sessionQ, model, size, pickedTask]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadTick triggers intentional refetch
  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .llmRecords({
        model: model || undefined,
        session: sessionQ || undefined,
        task: pickedTask || undefined,
        page,
        size,
      })
      .then((r) => {
        if (!alive) return;
        setRecords(r.records ?? []);
        setTotal(r.total ?? 0);
      })
      .catch(() => {
        /* ignore fetch error */
      })
      .finally(() => alive && setLoading(false));
    api
      .llmTasks()
      .then((r) => {
        if (alive) setTasks(r.tasks ?? []);
      })
      .catch(() => {
        /* ignore tasks error */
      });
    return () => {
      alive = false;
    };
  }, [page, size, sessionQ, model, pickedTask, reloadTick]);

  const confirmDelete = () => {
    setDeleting(true);
    api
      .llmRecordsDeleteTask(pickedTask)
      .then(() => {
        setDeleteOpen(false);
        setSelected(null);
        setDetail(null);
        setPickedTask("");
        setPage(0);
        setReloadTick((t) => t + 1);
      })
      .catch(() => {
        /* ignore delete error */
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
      .llmRecordDetail(selected.id)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch(() => {
        /* ignore detail error */
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selected]);

  const totalPages = Math.max(1, Math.ceil(total / size));
  const rangeStart = total === 0 ? 0 : page * size + 1;
  const rangeEnd = page * size + records.length;

  const renderTableBody = () => {
    if (loading && records.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="py-12 text-center">
            <Loader2Icon className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </TableCell>
        </TableRow>
      );
    }
    if (records.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
            {strings.noRecords}
          </TableCell>
        </TableRow>
      );
    }
    return records.map((rec) => (
      <TableRow
        key={rec.id}
        className={cn("cursor-pointer", selected?.id === rec.id && "bg-accent hover:bg-accent")}
        onClick={() => setSelected(rec)}
      >
        <TableCell className="text-xs text-muted-foreground tabular-nums">{fmtTime(rec.ts, locale)}</TableCell>
        <TableCell className="text-xs font-mono text-muted-foreground">
          {rec.task_id ? `#${rec.task_id}` : "-"}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs font-mono">
            {rec.worker || "-"}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="text-xs">{rec.profile_name || "-"}</span>
        </TableCell>
        <TableCell>
          <span className="text-xs font-mono">{rec.model || "-"}</span>
        </TableCell>
        <TableCell>
          <span className={cn("text-xs", rec.latency_ms > 30000 && "text-amber-500")}>
            {fmtLatency(rec.latency_ms)}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-xs">
            {fmtTokens(rec.input_tokens)} / {fmtTokens(rec.output_tokens)}
          </span>
        </TableCell>
        <TableCell>
          {rec.status === "ok" ? (
            <Badge variant="secondary" className="text-xs text-emerald-600">
              OK
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <RadioIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">{strings.title}</h1>
          <Badge variant="secondary">{total}</Badge>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={strings.searchSession}
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="h-8 pl-8"
          />
        </div>
        <Input
          placeholder={strings.modelPlaceholder}
          className="h-8 w-48"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <Select value={pickedTask} onValueChange={setPickedTask}>
          <SelectTrigger size="sm" className="w-56">
            <SelectValue placeholder={strings.selectTask} />
          </SelectTrigger>
          <SelectContent>
            {tasks.length === 0 ? (
              <SelectItem value="__none__" disabled>
                {strings.noTasks}
              </SelectItem>
            ) : (
              tasks.map((t) => (
                <SelectItem key={t.task_id} value={t.task_id}>
                  <span className="font-mono">#{t.task_id}</span>
                  <span className="ml-2 text-muted-foreground">({t.count})</span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          variant="destructive"
          size="sm"
          className="h-8"
          disabled={!pickedTask || deleting}
          title={pickedTask ? undefined : strings.deleteTaskCallsDisabledTip}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2Icon className="size-3.5" />
          {strings.deleteTaskCalls}
        </Button>
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

        {/* Recording on/off */}
        <div className="flex items-center gap-2 rounded-md border px-2.5 py-1">
          <Switch
            id="llm-rec-toggle"
            size="sm"
            checked={recEnabled}
            onCheckedChange={toggleRecording}
            disabled={recBusy}
          />
          <label
            htmlFor="llm-rec-toggle"
            className={cn(
              "cursor-pointer text-xs font-medium select-none",
              recEnabled ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {recEnabled ? strings.recording : strings.recordingOff}
          </label>
        </div>

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
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* History table + inline detail */}
      <div className="flex h-[calc(100vh-13rem)] min-h-0 flex-col gap-3">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden py-0">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-[130px]">{strings.timeCol}</TableHead>
                  <TableHead className="w-[60px]">{strings.taskCol}</TableHead>
                  <TableHead className="w-[90px]">{strings.workerCol}</TableHead>
                  <TableHead className="w-[100px]">{strings.profileCol}</TableHead>
                  <TableHead className="w-[140px]">{strings.modelCol}</TableHead>
                  <TableHead className="w-[70px]">{strings.latencyCol}</TableHead>
                  <TableHead className="w-[90px]">{strings.tokensCol}</TableHead>
                  <TableHead className="w-[60px]">{strings.statusCol}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>
        </Card>

        {/* Inline detail panel */}
        {selected && (
          <Card className="flex h-[42%] min-h-0 flex-col overflow-hidden py-0">
            {/* Detail header */}
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Badge variant="outline" className="text-xs font-mono">
                #{selected.id}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {selected.profile_name || "-"}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {selected.model || "-"}
              </Badge>
              {selected.task_id && (
                <Badge variant="outline" className="text-xs font-mono">
                  {strings.taskTag(String(selected.task_id))}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{fmtTime(selected.ts, locale)}</span>
              <span className={cn("text-xs", selected.latency_ms > 30000 && "text-amber-500")}>
                {fmtLatency(selected.latency_ms)}
              </span>
              {selected.status === "ok" ? (
                <Badge variant="secondary" className="text-xs text-emerald-600">
                  OK
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Error
                </Badge>
              )}
              <Button
                variant={showRaw ? "secondary" : "ghost"}
                size="sm"
                className="ml-auto h-7 shrink-0 text-xs"
                disabled={!hasRaw}
                title={hasRaw ? strings.rawBtnTipHas : strings.rawBtnTipNone}
                onClick={() => setRawView((v) => !v)}
              >
                {strings.rawBtn}
              </Button>
              <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setSelected(null)}>
                <XIcon />
              </Button>
            </div>
            {/* Request / Response split */}
            <div className="grid min-h-0 flex-1 grid-cols-2 divide-x">
              <div className="flex min-h-0 min-w-0 flex-col">
                <div className="flex items-center gap-2 border-b py-0.5 pr-1.5 pl-3 text-[11px] font-medium text-muted-foreground">
                  <span>{showRaw ? strings.reqSectionRaw : strings.reqSection}</span>
                  <CopyButton text={reqText || ""} />
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {detailLoading ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                      <Loader2Icon className="size-3.5 animate-spin" />
                      {strings.loading}
                    </div>
                  ) : (
                    <pre className="p-3 font-mono text-xs break-all whitespace-pre-wrap">
                      {reqText || strings.empty}
                    </pre>
                  )}
                </div>
              </div>
              <div className="flex min-h-0 min-w-0 flex-col">
                <div className="flex items-center gap-2 border-b py-0.5 pr-1.5 pl-3 text-[11px] font-medium text-muted-foreground">
                  <span>{showRaw ? strings.respSectionRaw : strings.respSection}</span>
                  <CopyButton text={respText || ""} />
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {detailLoading ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                      <Loader2Icon className="size-3.5 animate-spin" />
                      {strings.loading}
                    </div>
                  ) : (
                    <pre
                      className={cn(
                        "p-3 font-mono text-xs break-all whitespace-pre-wrap",
                        selected.status !== "ok" && "text-red-600 dark:text-red-400",
                      )}
                    >
                      {respText || strings.empty}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.deleteConfirmTitle(pickedTask)}</AlertDialogTitle>
            <AlertDialogDescription>{strings.deleteConfirmDesc}</AlertDialogDescription>
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
              {deleting ? strings.deleting : strings.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
