"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sseUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import { MOCK } from "@/lib/mock/enabled";
import type { LogLine } from "@/lib/types";
import { cn } from "@/lib/utils";

// Mock demo: when mock is enabled, populate sample log entries.
const MOCK_LOGS: LogLine[] = [
  {
    seq: 1,
    ts: "2026-07-26T03:55:00Z",
    level: "info",
    tag: "engine",
    text: "CIRDAN ARTEX backend listening on :8787 (workers=3)",
  },
  {
    seq: 2,
    ts: "2026-07-26T03:55:01Z",
    level: "info",
    tag: "config",
    text: "LLM configured from DB: anthropic / claude-opus-4-8",
  },
  {
    seq: 3,
    ts: "2026-07-26T03:56:10Z",
    level: "info",
    tag: "planner",
    text: "task t-acme-web: iteration 3 plan generated, intent i-4",
  },
  {
    seq: 4,
    ts: "2026-07-26T03:57:00Z",
    level: "warn",
    tag: "guard",
    text: "block bash: target out.evil.example out of defined scope",
  },
  {
    seq: 5,
    ts: "2026-07-26T03:57:30Z",
    level: "info",
    tag: "work#1",
    text: "report_finding: Default Credentials (high) recorded",
  },
  {
    seq: 6,
    ts: "2026-07-26T03:58:20Z",
    level: "error",
    tag: "work#3",
    text: "intercept: mysqldump triggered high-risk rule, pending manual approval",
  },
];

const levelTone: Record<LogLine["level"], string> = {
  info: "text-foreground/80",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
};

const I18N = {
  en: {
    pageTitle: "System Logs",
    pageSubtitle: "Backend real-time log streams (planner / worker / database / proxy ...)",
    filterPlaceholder: "Filter (text / tag)...",
    all: "All",
    paused: "Paused",
    pause: "Pause",
    clear: "Clear",
    lines: "lines",
    warnings: "warnings",
    errors: "errors",
    loadOlder: "Load older history",
    loadingOlder: "Loading...",
    noLogs: "No logs matching criteria",
  },
  pt: {
    pageTitle: "Logs do Sistema",
    pageSubtitle: "Fluxo de logs em tempo real (planejador / executores / banco de dados / proxy ...)",
    filterPlaceholder: "Filtrar (texto / tag)...",
    all: "Todos",
    paused: "Pausado",
    pause: "Pausar",
    clear: "Limpar",
    lines: "linhas",
    warnings: "avisos",
    errors: "erros",
    loadOlder: "Carregar histórico anterior",
    loadingOlder: "Carregando...",
    noLogs: "Nenhum log correspondente aos critérios",
  },
  zh: {
    pageTitle: "系统日志",
    pageSubtitle: "后端实时日志流(planner / worker / 数据库 / 流量 …)",
    filterPlaceholder: "过滤(文本 / tag)…",
    all: "全部",
    paused: "已暂停",
    pause: "暂停",
    clear: "清空",
    lines: "行",
    warnings: "警告",
    errors: "错误",
    loadOlder: "加载更早历史",
    loadingOlder: "加载中…",
    noLogs: "暂无符合条件的日志",
  },
};

export default function LogsPage() {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [lines, setLines] = React.useState<LogLine[]>(() => (MOCK ? MOCK_LOGS : []));
  const [level, setLevel] = React.useState<"all" | LogLine["level"]>("all");
  const [q, setQ] = React.useState("");
  const [paused, setPaused] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const stick = React.useRef(true);
  const bottom = React.useRef<HTMLDivElement>(null);

  const minDbId = React.useMemo(() => {
    let min = 0;
    for (const l of lines) {
      if (l.db_id && (min === 0 || l.db_id < min)) min = l.db_id;
    }
    return min;
  }, [lines]);

  React.useEffect(() => {
    if (MOCK) return;
    const es = new EventSource(sseUrl("/api/logs/stream"));
    es.onmessage = (ev) => {
      try {
        const item = JSON.parse(ev.data) as LogLine;
        setLines((prev) => {
          if (prev.length && prev[prev.length - 1].seq === item.seq) return prev;
          const next = [...prev, item];
          return next.length > 2000 ? next.slice(-2000) : next;
        });
      } catch {
        // ignore parse error
      }
    };
    return () => es.close();
  }, []);

  async function loadOlderHistory() {
    if (loadingHistory) return;
    setLoadingHistory(true);
    try {
      const params = minDbId > 0 ? `?before=${minDbId}&limit=200` : "?limit=200";
      const res = await fetch(`/api/logs/history${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as { items: LogLine[]; has_more: boolean };
      if (data.items?.length) {
        setLines((prev) => {
          const minSeq = prev.reduce((m, l) => Math.min(m, l.seq ?? 0), 0);
          const older = data.items.map((l, i) => ({
            ...l,
            seq: minSeq - data.items.length + i,
          }));
          const merged = [...older, ...prev];
          const seen = new Set<number>();
          const deduped = merged.filter((l) => {
            if (!l.db_id) return true;
            if (seen.has(l.db_id)) return false;
            seen.add(l.db_id);
            return true;
          });
          return deduped.slice(-5000);
        });
      }
      setHasMore(data.has_more ?? false);
    } finally {
      setLoadingHistory(false);
    }
  }

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return lines.filter(
      (l) =>
        (level === "all" || l.level === level) &&
        (!needle || l.text.toLowerCase().includes(needle) || l.tag.toLowerCase().includes(needle)),
    );
  }, [lines, q, level]);

  React.useEffect(() => {
    if (filtered.length >= 0 && stick.current && !paused) {
      bottom.current?.scrollIntoView();
    }
  }, [filtered, paused]);

  const counts = React.useMemo(() => {
    let warn = 0;
    let error = 0;
    for (const l of lines) {
      if (l.level === "warn") warn++;
      else if (l.level === "error") error++;
    }
    return { warn, error, total: lines.length };
  }, [lines]);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t.pageTitle}</h1>
        <p className="text-muted-foreground text-sm">{t.pageSubtitle}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t.filterPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8 max-w-xs"
          />
          <div className="flex gap-1">
            {(["all", "info", "warn", "error"] as const).map((lv) => (
              <Button
                key={lv}
                size="sm"
                variant={level === lv ? "default" : "outline"}
                className="h-8"
                onClick={() => setLevel(lv)}
              >
                {lv === "all" ? t.all : lv}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant={paused ? "default" : "outline"}
            className="h-8"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? t.paused : t.pause}
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setLines([])}>
            {t.clear}
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {counts.total} {t.lines} ·{" "}
            <span className="text-amber-600 dark:text-amber-400">
              {counts.warn} {t.warnings}
            </span>{" "}
            ·{" "}
            <span className="text-red-600 dark:text-red-400">
              {counts.error} {t.errors}
            </span>
          </span>
        </div>

        <div
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          }}
          className="h-[calc(100vh-14rem)] overflow-auto rounded-lg border bg-card p-2 font-mono text-xs leading-relaxed"
        >
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={loadOlderHistory}
                disabled={loadingHistory}
              >
                {loadingHistory ? t.loadingOlder : t.loadOlder}
              </Button>
            </div>
          )}
          {filtered.length === 0 && <p className="text-muted-foreground py-6 text-center text-xs">{t.noLogs}</p>}
          {filtered.map((l) => (
            <div key={l.db_id ?? l.seq} className="flex gap-2">
              <span className="text-muted-foreground/60 select-none">{l.ts ? l.ts.slice(11, 19) : "--:--:--"}</span>
              <span className={cn("w-10 font-bold uppercase", levelTone[l.level])}>{l.level}</span>
              <span className="text-muted-foreground w-20 truncate">[{l.tag}]</span>
              <span className="flex-1 whitespace-pre-wrap break-all">{l.text}</span>
            </div>
          ))}
          <div ref={bottom} />
        </div>
      </div>
    </div>
  );
}
