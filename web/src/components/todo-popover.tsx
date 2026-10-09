"use client";

import * as React from "react";

import { ListTodo } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";

const I18N = {
  en: {
    parseErr: "Failed to parse Todo",
    noTodo: "No Todo in this session",
    viewTodo: "View recent Todo",
    recentTodo: "Recent Todo",
    loading: " · Loading...",
    empty: "(Empty)",
  },
  pt: {
    parseErr: "Falha ao processar Todo",
    noTodo: "Sem Todo nesta sessão",
    viewTodo: "Ver Todo recente",
    recentTodo: "Todo Recente",
    loading: " · Carregando...",
    empty: "(Vazio)",
  },
  zh: {
    parseErr: "解析 Todo 失败",
    noTodo: "本会话暂无 Todo",
    viewTodo: "查看最近 Todo",
    recentTodo: "最近 Todo",
    loading: " · 加载中…",
    empty: "（空）",
  },
};

export function TodoPopover({
  seq,
  fetchDetail,
}: {
  seq: number | null;
  fetchDetail: (seq: number) => Promise<string>;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [open, setOpen] = React.useState(false);
  const [todos, setTodos] = React.useState<{ content: string; status: string }[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async () => {
    if (seq == null) return;
    setLoading(true);
    setErr("");
    try {
      const detail = await fetchDetail(seq);
      const start = detail.indexOf("{");
      const parsed = JSON.parse(start >= 0 ? detail.slice(start) : detail);
      setTodos(Array.isArray(parsed?.todos) ? parsed.todos : []);
    } catch {
      setErr(t.parseErr);
      setTodos(null);
    } finally {
      setLoading(false);
    }
  }, [seq, fetchDetail, t.parseErr]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const disabled = seq == null;
  const MARK: Record<string, string> = { pending: "☐", in_progress: "▶", completed: "✔" };
  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={disabled ? t.noTodo : t.viewTodo}
          className="text-muted-foreground/70 hover:text-primary flex items-center gap-0.5 text-xs disabled:pointer-events-none disabled:opacity-40"
        >
          <ListTodo className="size-3" />
          Todo
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-80 w-80 overflow-auto p-2">
        <p className="text-muted-foreground px-1 pb-1 text-[11px] font-medium">
          {t.recentTodo}
          {loading ? t.loading : ""}
        </p>
        {err && <p className="text-destructive px-1 text-xs">{err}</p>}
        {todos && todos.length === 0 && !loading && <p className="text-muted-foreground px-1 text-xs">{t.empty}</p>}
        <ul className="space-y-0.5">
          {(todos ?? []).map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: todo index is acceptable
            <li
              key={`${i}:${item.content}`}
              className={cn(
                "flex gap-1.5 px-1 text-xs",
                item.status === "completed" && "text-muted-foreground line-through",
              )}
            >
              <span className="shrink-0">{MARK[item.status] ?? "☐"}</span>
              <span className="break-words">{item.content}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
