"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Activity, InterceptExecution } from "@/lib/types";

const I18N = {
  en: {
    sourceMismatch: "Approval source does not match current session",
    locateFailed: "Unable to locate original execution",
    notFoundInSessionDeleted: "Corresponding tool call not found in session, record may have been deleted",
    notFoundInSession: "Corresponding tool call not found in session",
    unableToLocate: (err: string) => `Unable to locate: ${err}`,
    expandedToolCall: (id: number) => `Expanded tool call for approval #${id}`,
    loadingPosition: (id: number) => `Loading conversation position for approval #${id}…`,
    retry: "Retry",
    dismiss: "Dismiss",
  },
  pt: {
    sourceMismatch: "A origem da aprovação não corresponde à sessão atual",
    locateFailed: "Não foi possível localizar a execução original",
    notFoundInSessionDeleted:
      "Chamada de ferramenta correspondente não encontrada na sessão, o registro pode ter sido excluído",
    notFoundInSession: "Chamada de ferramenta correspondente não encontrada na sessão",
    unableToLocate: (err: string) => `Não foi possível localizar: ${err}`,
    expandedToolCall: (id: number) => `Chamada de ferramenta expandida para a aprovação #${id}`,
    loadingPosition: (id: number) => `Carregando posição da conversa para a aprovação #${id}…`,
    retry: "Tentar novamente",
    dismiss: "Cancelar",
  },
  zh: {
    sourceMismatch: "审批来源与当前会话不一致",
    locateFailed: "无法定位原始执行",
    notFoundInSessionDeleted: "会话中未找到对应工具调用，记录可能已删除",
    notFoundInSession: "会话中未找到对应工具调用",
    unableToLocate: (err: string) => `无法定位：${err}`,
    expandedToolCall: (id: number) => `已展开审批 #${id} 对应的工具调用`,
    loadingPosition: (id: number) => `正在加载审批 #${id} 所在的对话位置…`,
    retry: "重试定位",
    dismiss: "取消定位",
  },
};

// Resolve one exact persisted call, independently of transcript pagination.
export function useApprovalFocus({ taskId, conversationId }: { taskId?: string; conversationId?: number }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [state, setState] = React.useState<{
    id: number;
    source?: InterceptExecution;
    error?: string;
    loading: boolean;
  } | null>(null);
  const [revision, setRevision] = React.useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the explicit retry trigger.
  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = Number(q.get("approval"));
    const matches = conversationId ? q.get("c") === String(conversationId) : q.get("id") === taskId;
    if (!matches || !Number.isSafeInteger(id) || id <= 0) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ id, loading: true });
    api
      .interceptExecution(id, conversationId)
      .then((source) => {
        if (cancelled) return;
        if (
          conversationId
            ? source.conversation_id !== conversationId
            : source.task_id !== taskId || source.conversation_id != null
        ) {
          throw new Error(t.sourceMismatch);
        }
        setState({ id, source, loading: false });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            id,
            error: (e as Error).message || t.locateFailed,
            loading: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, conversationId, revision, t]);

  const close = React.useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("approval");
    window.history.replaceState(null, "", url);
    setState(null);
  }, []);

  return { state, close, retry: () => setRevision((v) => v + 1) };
}

type HistoryPage = { items: Activity[]; hasMore: boolean };

// Fill the existing transcript continuously back to the call, preserving all
// intervening messages. Never splice an isolated call into a paginated history.
export function useApprovalHistory(
  source: InterceptExecution | undefined,
  loaded: boolean,
  items: Activity[],
  loadPage: (before: number) => Promise<HistoryPage>,
  mergePage: (page: HistoryPage) => void,
) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const itemsRef = React.useRef(items);
  itemsRef.current = items;
  const [result, setResult] = React.useState<{
    source: InterceptExecution;
    error?: string;
  }>();

  React.useEffect(() => {
    if (!source || !loaded) return;
    let cancelled = false;
    void (async () => {
      let current = itemsRef.current;
      let before = current[0]?.seq ?? 0;
      while (!current.some((a) => a.seq === source.seq && a.kind === "tool_use")) {
        const page = await loadPage(before);
        if (cancelled) return;
        if (!page.items.length || (before > 0 && page.items[0].seq >= before)) {
          throw new Error(t.notFoundInSessionDeleted);
        }
        mergePage(page);
        current = page.items;
        before = current[0].seq;
        if (!page.hasMore && !current.some((a) => a.seq === source.seq)) {
          throw new Error(t.notFoundInSession);
        }
      }
      if (!cancelled) setResult({ source });
    })().catch((error) => {
      if (!cancelled) setResult({ source, error: (error as Error).message });
    });
    return () => {
      cancelled = true;
    };
  }, [source, loaded, loadPage, mergePage, t]);

  return {
    ready: !!source && result?.source === source && !result.error,
    error: result?.source === source ? result?.error : undefined,
  };
}

export function ApprovalExecutionFocus({
  focus,
  history,
}: {
  focus: ReturnType<typeof useApprovalFocus>;
  history: ReturnType<typeof useApprovalHistory>;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const { state } = focus;
  if (!state) return null;
  const error = state.error || history.error;

  let message = t.loadingPosition(state.id);
  if (error) {
    message = t.unableToLocate(error);
  } else if (history.ready) {
    message = t.expandedToolCall(state.id);
  }

  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs"
    >
      <span className={error ? "text-destructive" : "text-muted-foreground"}>{message}</span>
      <div className="flex gap-2">
        {error ? (
          <Button size="sm" variant="outline" onClick={focus.retry}>
            {t.retry}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={focus.close}>
          {t.dismiss}
        </Button>
      </div>
    </div>
  );
}
