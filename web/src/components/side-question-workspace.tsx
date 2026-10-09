"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { ArrowUpIcon, MessageCircleQuestionIcon, SquareIcon, Trash2Icon, XIcon } from "lucide-react";

import { Markdown } from "@/components/markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SideQuestions } from "@/hooks/use-side-questions";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";

type ComposerLayout = "inline" | "stacked";

const I18N = {
  en: {
    sideQuestion: "Side Question",
    sideQuestionTitle: "/btw Side Question",
    panelAriaLabel: "Side Question Panel",
    clearHistoryAria: "Clear side history",
    closePanelAria: "Close side panel",
    contextUpdatedAt: (time: string) => `Context updated at ${time}`,
    availableAfterFirstRun: "Available after the main agent runs for the first time",
    loadEarlier: "Load earlier side questions",
    emptyTitle: "Ask a question anytime",
    emptyDescription: "Answers based on current agent context while the main task continues running.",
    contextPrefix: (time: string) => `Context ${time}`,
    recentExchanges: (count: number) => `Last ${count} Q&A exchange(s)`,
    includesHistorySummary: " · Includes earlier summary",
    usesSnapshotSummary: " · Uses main context summary",
    questionAria: "Side question",
    questionPlaceholder: "Ask about current context…",
    standaloneQaHint: "Standalone Q&A · No tool execution",
    stopAnswerAria: "Stop side answer",
    sendQuestionAria: "Send side question",
    clearDialogTitle: "Clear side history?",
    clearDialogDescription:
      "Delete side questions for the current agent and stop active generation. Main conversation and context snapshots are preserved.",
    cancel: "Cancel",
    clearHistory: "Clear History",
    drawerDescription: (lbl: string) => `Standalone Q&A for ${lbl}`,
    status: {
      running: "Answering",
      completed: "Completed",
      failed: "Failed",
      cancelled: "Stopped",
      interrupted: "Interrupted",
    },
    phases: {
      preparing: "Preparing context…",
      summarizing_history: "Summarizing earlier side Q&A…",
      compressing_snapshot: "Compressing side context snapshot…",
      retrying: "Context limit exceeded, retrying with reduction…",
      answering: "Answering…",
    },
  },
  pt: {
    sideQuestion: "Pergunta Paralela",
    sideQuestionTitle: "/btw Pergunta Paralela",
    panelAriaLabel: "Painel de Perguntas Paralelas",
    clearHistoryAria: "Limpar histórico paralelo",
    closePanelAria: "Fechar painel paralelo",
    contextUpdatedAt: (time: string) => `Contexto atualizado em ${time}`,
    availableAfterFirstRun: "Disponível após a primeira execução do agente principal",
    loadEarlier: "Carregar perguntas anteriores",
    emptyTitle: "Faça uma pergunta a qualquer momento",
    emptyDescription: "Responde com base no contexto atual do agente enquanto a tarefa principal continua.",
    contextPrefix: (time: string) => `Contexto ${time}`,
    recentExchanges: (count: number) => `Últimas ${count} perguntas e respostas`,
    includesHistorySummary: " · Inclui resumo anterior",
    usesSnapshotSummary: " · Usa resumo do contexto principal",
    questionAria: "Pergunta paralela",
    questionPlaceholder: "Pergunte sobre o contexto atual…",
    standaloneQaHint: "Perguntas isoladas · Sem execução de ferramentas",
    stopAnswerAria: "Parar resposta paralela",
    sendQuestionAria: "Enviar pergunta paralela",
    clearDialogTitle: "Limpar histórico paralelo?",
    clearDialogDescription:
      "Exclui as perguntas paralelas do agente atual e interrompe a geração em andamento. A conversa principal e os instantâneos são mantidos.",
    cancel: "Cancelar",
    clearHistory: "Limpar Histórico",
    drawerDescription: (lbl: string) => `Perguntas e respostas isoladas para ${lbl}`,
    status: {
      running: "Respondendo",
      completed: "Concluído",
      failed: "Falhou",
      cancelled: "Interrompido",
      interrupted: "Interrompido",
    },
    phases: {
      preparing: "Preparando contexto…",
      summarizing_history: "Resumindo perguntas e respostas anteriores…",
      compressing_snapshot: "Comprimindo instantâneo do contexto paralelo…",
      retrying: "Limite de contexto excedido, tentando novamente reduzido…",
      answering: "Respondendo…",
    },
  },
  zh: {
    sideQuestion: "旁路提问",
    sideQuestionTitle: "/btw 旁路提问",
    panelAriaLabel: "旁路提问面板",
    clearHistoryAria: "清空旁路历史",
    closePanelAria: "关闭旁路面板",
    contextUpdatedAt: (time: string) => `上下文更新于 ${time}`,
    availableAfterFirstRun: "主 Agent 首次运行后即可提问",
    loadEarlier: "加载更早的旁路问答",
    emptyTitle: "随时问一个问题",
    emptyDescription: "根据当前 Agent 的上下文回答，主任务继续运行。",
    contextPrefix: (time: string) => `上下文 ${time}`,
    recentExchanges: (count: number) => `最近 ${count} 组问答原文`,
    includesHistorySummary: " · 含早期问答摘要",
    usesSnapshotSummary: " · 使用主上下文摘要",
    questionAria: "旁路问题",
    questionPlaceholder: "询问当前上下文…",
    standaloneQaHint: "独立问答 · 无工具执行",
    stopAnswerAria: "停止旁路回答",
    sendQuestionAria: "发送旁路问题",
    clearDialogTitle: "清空旁路历史？",
    clearDialogDescription: "删除当前 Agent 的旁路问答，并停止正在生成的旁路回答。主会话和上下文快照会保留。",
    cancel: "取消",
    clearHistory: "清空历史",
    drawerDescription: (lbl: string) => `${lbl} 的独立问答`,
    status: {
      running: "回答中",
      completed: "已完成",
      failed: "失败",
      cancelled: "已停止",
      interrupted: "已中断",
    },
    phases: {
      preparing: "正在准备上下文…",
      summarizing_history: "正在整理早期旁路问答…",
      compressing_snapshot: "正在压缩旁路上下文副本…",
      retrying: "模型上下文超限，正在缩减后重试…",
      answering: "正在回答…",
    },
  },
};

const DATE_LOCALES: Record<string, string> = {
  zh: "zh-CN",
  pt: "pt-BR",
  en: "en-US",
};

export function SideQuestionButton({ side }: { side: SideQuestions }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  if (!side.enabled) return null;
  return (
    <Button variant="outline" size="sm" onClick={() => side.setOpen(true)} title={t.sideQuestionTitle}>
      <MessageCircleQuestionIcon data-icon="inline-start" />
      {t.sideQuestion}
    </Button>
  );
}

function SidePanel({
  side,
  label,
  composerLayout,
}: {
  side: SideQuestions;
  label: string;
  composerLayout: ComposerLayout;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;
  const dateLocale = DATE_LOCALES[locale] ?? "en-US";

  const inlineComposer = composerLayout === "inline";
  const [confirm, setConfirm] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const tail = side.items.at(-1);
  // biome-ignore lint/correctness/useExhaustiveDependencies: New cumulative text scrolls only readers who remain at the bottom.
  useEffect(() => {
    if (pinned.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [tail?.answer, tail?.id]);
  const status = t.status;
  return (
    <section className="flex h-full min-h-0 flex-col bg-background" aria-label={t.panelAriaLabel}>
      <div className="flex items-center gap-2 border-b p-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {t.sideQuestion} <span className="text-muted-foreground">/btw</span>
          </p>
          <p className="truncate text-muted-foreground text-xs">{label}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setConfirm(true)}
          disabled={!side.items.length || side.busy}
          aria-label={t.clearHistoryAria}
        >
          <Trash2Icon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => side.setOpen(false)} aria-label={t.closePanelAria}>
          <XIcon />
        </Button>
      </div>
      <div className="border-b px-3 py-2 text-muted-foreground text-xs">
        {side.snapshot ? (
          <>
            <p>{side.snapshot.model.model}</p>
            <p>{t.contextUpdatedAt(new Date(side.snapshot.captured_at).toLocaleString(dateLocale))}</p>
          </>
        ) : (
          t.availableAfterFirstRun
        )}
      </div>
      <div
        ref={viewport}
        onScroll={(event) => {
          const el = event.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto p-3"
      >
        {side.nextCursor > 0 && (
          <Button variant="ghost" size="sm" onClick={() => void side.load(side.nextCursor)}>
            {t.loadEarlier}
          </Button>
        )}
        {side.loading && <Skeleton className="h-16 w-full" />}
        {!side.loading && side.items.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t.emptyTitle}</EmptyTitle>
              <EmptyDescription>{t.emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        <div className="flex flex-col gap-5">
          {side.items.map((item) => (
            <article key={item.id} className="flex min-w-0 flex-col gap-2">
              <div className="whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-sm">{item.question}</div>
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                <Badge variant="secondary">{status[item.status]}</Badge>
                <span className="truncate">{item.model.model}</span>
                <time dateTime={item.snapshot_at} title={new Date(item.snapshot_at).toLocaleString(dateLocale)}>
                  {t.contextPrefix(new Date(item.snapshot_at).toLocaleTimeString(dateLocale))}
                </time>
              </div>
              {item.context?.estimated_input_tokens != null && (
                <p className="text-muted-foreground text-xs">
                  {t.recentExchanges(item.context.recent_exchanges)}
                  {item.context.history_summarized && t.includesHistorySummary}
                  {item.context.snapshot_summarized && t.usesSnapshotSummary}
                </p>
              )}
              {item.answer && <Markdown text={item.answer} />}
              {!item.answer && item.status === "running" && (
                <p role="status" className="text-muted-foreground text-sm">
                  {t.phases[item.context?.phase ?? "answering"]}
                </p>
              )}
              {item.error && (
                <Alert variant="destructive">
                  <AlertDescription>{item.error}</AlertDescription>
                </Alert>
              )}
            </article>
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t p-3">
        {(side.error || side.snapshot?.reason) && (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>{side.error || side.snapshot?.reason}</AlertDescription>
          </Alert>
        )}
        <InputGroup className={inlineComposer ? "min-h-10" : "min-h-9"}>
          <InputGroupTextarea
            rows={1}
            className={cn("overflow-y-auto", inlineComposer ? "max-h-40 min-h-0" : "max-h-36 min-h-9")}
            aria-label={t.questionAria}
            placeholder={t.questionPlaceholder}
            value={side.draft}
            maxLength={4000}
            disabled={side.busy}
            onChange={(event) => side.setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void side.ask(side.draft);
              }
            }}
          />
          <InputGroupAddon align={inlineComposer ? "inline-end" : "block-end"}>
            {!inlineComposer && <span className="text-muted-foreground text-xs">{t.standaloneQaHint}</span>}
            {side.running ? (
              <InputGroupButton
                className="ml-auto"
                variant="destructive"
                size="icon-xs"
                onClick={() => void side.stop()}
                aria-label={t.stopAnswerAria}
              >
                <SquareIcon />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                className="ml-auto"
                variant="default"
                size="icon-xs"
                onClick={() => void side.ask(side.draft)}
                disabled={side.busy || !side.draft.trim() || !side.snapshot?.available}
                aria-label={t.sendQuestionAria}
              >
                <ArrowUpIcon />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </div>
      {inlineComposer && (
        <div className="shrink-0 truncate px-3 pt-0.5 pb-1 text-muted-foreground text-xs">{t.standaloneQaHint}</div>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.clearDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.clearDialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void side.clear()}>{t.clearHistory}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function SideQuestionWorkspace({
  side,
  label,
  children,
  composerLayout = "stacked",
}: {
  side: SideQuestions;
  label: string;
  children: ReactNode;
  composerLayout?: ComposerLayout;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;
  const mobile = useIsMobile();

  return (
    <>
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 min-w-0 flex-1">
        <ResizablePanel id="main-conversation" minSize="35%" className="flex min-h-0 min-w-0 flex-col">
          {children}
        </ResizablePanel>
        {side.open && side.enabled && !mobile && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel id="side-question" defaultSize="38%" minSize="280px" maxSize="65%">
              <SidePanel side={side} label={label} composerLayout={composerLayout} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      <Drawer open={mobile && side.open && side.enabled} onOpenChange={side.setOpen}>
        <DrawerContent className="h-[85svh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{t.sideQuestion}</DrawerTitle>
            <DrawerDescription>{t.drawerDescription(label)}</DrawerDescription>
          </DrawerHeader>
          <SidePanel side={side} label={label} composerLayout={composerLayout} />
        </DrawerContent>
      </Drawer>
    </>
  );
}
