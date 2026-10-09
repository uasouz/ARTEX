"use client";

import * as React from "react";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpToLineIcon,
  BugIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CompassIcon,
  FlagIcon,
  FlaskConicalIcon,
  LayersIcon,
  LightbulbIcon,
  type LucideIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  TargetIcon,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import { type Tone, toneClasses, toneDot } from "@/lib/status";
import { taskAssetTypeLabel } from "@/lib/task-assets";
import type { Edge, ExploreKind, FindingAsset, NewAssetType, TaskNode } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [20, 50, 100];
const POLL_MS = 8000;

type KindMeta = { label: string; icon: LucideIcon; dot: string; chip: string };

function getKindMeta(locale: string): Record<string, KindMeta> {
  const labels: Record<string, Record<string, string>> = {
    pt: {
      begin: "Início",
      task: "Tarefa raiz",
      goal: "Objetivo",
      intent: "Intenção",
      fact: "Fato",
      finding: "Vulnerabilidade",
      hint: "Dica",
      digest: "Resumo",
    },
    zh: {
      begin: "起点",
      task: "根任务",
      goal: "目标",
      intent: "意图",
      fact: "事实",
      finding: "漏洞",
      hint: "提示",
      digest: "压缩",
    },
    en: {
      begin: "Origin",
      task: "Root Task",
      goal: "Goal",
      intent: "Intent",
      fact: "Fact",
      finding: "Finding",
      hint: "Hint",
      digest: "Digest",
    },
  };

  const current = labels[locale] ?? labels.en;

  return {
    begin: {
      label: current.begin,
      icon: FlagIcon,
      dot: "bg-slate-500",
      chip: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    },
    task: {
      label: current.task,
      icon: FlagIcon,
      dot: "bg-slate-500",
      chip: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    },
    goal: {
      label: current.goal,
      icon: TargetIcon,
      dot: "bg-emerald-500",
      chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    intent: {
      label: current.intent,
      icon: CompassIcon,
      dot: "bg-blue-500",
      chip: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    },
    fact: {
      label: current.fact,
      icon: FlaskConicalIcon,
      dot: "bg-amber-500",
      chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    finding: {
      label: current.finding,
      icon: BugIcon,
      dot: "bg-rose-500",
      chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    },
    hint: {
      label: current.hint,
      icon: LightbulbIcon,
      dot: "bg-violet-500",
      chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
    digest: {
      label: current.digest,
      icon: LayersIcon,
      dot: "bg-teal-500",
      chip: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    },
  };
}

const FILTER_KINDS: ExploreKind[] = ["goal", "intent", "fact", "finding", "hint", "digest"];

function getRelLabel(locale: string): Record<string, string> {
  if (locale === "pt") {
    return {
      spawns: "Gera",
      derived_from: "Derivado de",
      yields: "Produz",
      proves: "Comprova",
      covers: "Abrange",
    };
  }
  if (locale === "zh") {
    return {
      spawns: "派生",
      derived_from: "意图链",
      yields: "产出",
      proves: "证明",
      covers: "压缩",
    };
  }
  return {
    spawns: "Spawns",
    derived_from: "Derived from",
    yields: "Yields",
    proves: "Proves",
    covers: "Covers",
  };
}

function getStateMeta(locale: string): Record<string, Record<string, { label: string; tone: Tone }>> {
  if (locale === "pt") {
    return {
      fact: {
        origin: { label: "Início", tone: "slate" },
        confirmed: { label: "Confirmado", tone: "green" },
        dismissed: { label: "Rejeitado", tone: "slate" },
      },
      finding: {
        confirmed: { label: "Confirmado", tone: "red" },
        dismissed: { label: "Descartado", tone: "slate" },
      },
      hint: {
        active: { label: "Pendente", tone: "violet" },
        consumed: { label: "Adotado", tone: "slate" },
      },
      digest: {
        active: { label: "Ativo", tone: "green" },
        superseded: { label: "Substituído", tone: "slate" },
      },
    };
  }
  if (locale === "zh") {
    return {
      fact: {
        origin: { label: "起点", tone: "slate" },
        confirmed: { label: "已确认", tone: "green" },
        dismissed: { label: "已否定", tone: "slate" },
      },
      finding: {
        confirmed: { label: "已确认", tone: "red" },
        dismissed: { label: "已排除", tone: "slate" },
      },
      hint: {
        active: { label: "待采纳", tone: "violet" },
        consumed: { label: "已采纳", tone: "slate" },
      },
      digest: {
        active: { label: "生效中", tone: "green" },
        superseded: { label: "已替代", tone: "slate" },
      },
    };
  }
  return {
    fact: {
      origin: { label: "Origin", tone: "slate" },
      confirmed: { label: "Confirmed", tone: "green" },
      dismissed: { label: "Dismissed", tone: "slate" },
    },
    finding: {
      confirmed: { label: "Confirmed", tone: "red" },
      dismissed: { label: "Excluded", tone: "slate" },
    },
    hint: {
      active: { label: "Pending", tone: "violet" },
      consumed: { label: "Adopted", tone: "slate" },
    },
    digest: {
      active: { label: "Active", tone: "green" },
      superseded: { label: "Superseded", tone: "slate" },
    },
  };
}

function viewKind(n: TaskNode): string {
  return n.type === "fact" && n.state === "origin" ? "begin" : n.type;
}

const SUMMARY_FIELDS: Record<string, string[]> = {
  begin: ["summary", "description"],
  task: ["summary", "description"],
  goal: ["text"],
  intent: ["summary"],
  fact: ["summary"],
  finding: ["name", "summary"],
  hint: ["text", "summary"],
  digest: ["body", "summary"],
};

function summaryOf(n: TaskNode): string {
  const raw = n.payload ?? "";
  if (!raw.trim()) return "";
  for (const field of SUMMARY_FIELDS[viewKind(n)] ?? []) {
    try {
      const obj: unknown = JSON.parse(raw);
      if (obj && typeof obj === "object") {
        const v = (obj as Record<string, unknown>)[field];
        if (typeof v === "string" && v.trim()) return v;
      }
    } catch {
      return raw;
    }
  }
  return raw;
}

function prettyPayload(raw?: string, emptyLabel = "(No payload)"): string {
  if (!raw?.trim()) return emptyLabel;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function relTime(ts: number, now: number, locale: string): string {
  if (!now || !ts) return "";
  const sec = Math.max(0, (now - ts) / 1000);
  if (locale === "pt") {
    if (sec < 60) return "agora mesmo";
    if (sec < 3600) return `há ${Math.floor(sec / 60)}m`;
    if (sec < 86400) return `há ${Math.floor(sec / 3600)}h`;
    return `há ${Math.floor(sec / 86400)}d`;
  }
  if (locale === "zh") {
    if (sec < 60) return "刚刚";
    if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`;
    if (sec < 86400) return `${Math.floor(sec / 3600)} 小时前`;
    return `${Math.floor(sec / 86400)} 天前`;
  }
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function NodeStateBadge({ node, locale }: { node: TaskNode; locale: string }) {
  if (node.type === "goal") return <StatusBadge domain="goal" value={node.state} dot />;
  if (node.type === "intent") return <StatusBadge domain="intent" value={node.state} dot />;
  const stateMeta = getStateMeta(locale);
  const meta = stateMeta[node.type]?.[node.state];
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[meta.tone],
      )}
    >
      <span className={cn("size-1.5 rounded-full", toneDot[meta.tone])} />
      {meta.label}
    </span>
  );
}

function KindChip({ kind, locale }: { kind: string; locale: string }) {
  const kindMeta = getKindMeta(locale);
  const meta = kindMeta[kind] ?? kindMeta.fact;
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", meta.chip)}>{meta.label}</span>
  );
}

function AssetList({ assets, dense = false, title }: { assets: FindingAsset[]; dense?: boolean; title: string }) {
  const { locale } = useI18n();
  if (assets.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
        {title} · {assets.length}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {assets.map((a) => {
          const typeLabel = taskAssetTypeLabel(a.type as NewAssetType, locale) ?? a.type;
          return (
            <li
              key={a.id}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-0.5",
                dense && "text-xs",
              )}
              title={`${typeLabel} · ${a.label}`}
            >
              <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground">{typeLabel}</span>
              <code className="truncate font-mono text-xs">{a.label}</code>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RelatedNodeCard({
  node,
  assets,
  locale,
  labels,
}: {
  node: TaskNode;
  assets: FindingAsset[];
  locale: string;
  labels: {
    typePrefix: string;
    sourcePrefix: string;
    noSummary: string;
    noPayload: string;
    assetsTitle: string;
    dateTimeLocale: string;
  };
}) {
  const kind = viewKind(node);
  const kindMeta = getKindMeta(locale);
  const meta = kindMeta[kind] ?? kindMeta.fact;
  const ts = Date.parse(node.ts);
  const summary = summaryOf(node);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <KindChip kind={kind} locale={locale} />
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">#{node.id}</code>
        <NodeStateBadge node={node} locale={locale} />
        {node.priority > 0 && (kind === "goal" || kind === "intent") && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">P{node.priority}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          {labels.typePrefix} {meta.label}
        </span>
        <span>
          {labels.sourcePrefix} {node.origin || "system"}
        </span>
        <span>{Number.isNaN(ts) ? node.ts : new Date(ts).toLocaleString(labels.dateTimeLocale)}</span>
      </div>
      <p className="line-clamp-4 text-xs break-words">{summary || labels.noSummary}</p>
      <AssetList assets={assets} dense title={labels.assetsTitle} />
      <pre className="max-h-40 overflow-auto rounded border bg-muted/40 p-2 font-mono text-[11px] whitespace-pre-wrap">
        {prettyPayload(node.payload, labels.noPayload)}
      </pre>
    </div>
  );
}

function RelatedList({
  title,
  rows,
  refs,
  assets,
  locale,
  labels,
}: {
  title: string;
  rows: Array<{ rel: string; id: string }>;
  refs: Record<string, TaskNode>;
  assets: Record<string, FindingAsset[]>;
  locale: string;
  labels: {
    nodePrefix: string;
    typePrefix: string;
    sourcePrefix: string;
    noSummary: string;
    noPayload: string;
    assetsTitle: string;
    dateTimeLocale: string;
  };
}) {
  if (rows.length === 0) return null;
  const relLabels = getRelLabel(locale);

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const node = refs[row.id];
          return (
            <li key={`${row.rel}-${row.id}`} className="flex min-w-0 items-center gap-2 text-xs">
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                {relLabels[row.rel] ?? row.rel}
              </span>
              {node ? (
                <HoverCard openDelay={150} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      className="flex min-w-0 cursor-help items-center gap-2 text-left hover:underline"
                    >
                      <KindChip kind={viewKind(node)} locale={locale} />
                      <span className="truncate">{summaryOf(node) || `${labels.nodePrefix} #${node.id}`}</span>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent align="start" className="w-96">
                    <RelatedNodeCard node={node} assets={assets[node.id] ?? []} locale={locale} labels={labels} />
                  </HoverCardContent>
                </HoverCard>
              ) : (
                <span className="text-muted-foreground">
                  {labels.nodePrefix} #{row.id}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BroadcastRow({
  node,
  edges,
  refs,
  assets,
  now,
  fresh,
  locale,
  labels,
}: {
  node: TaskNode;
  edges: Edge[];
  refs: Record<string, TaskNode>;
  assets: Record<string, FindingAsset[]>;
  now: number;
  fresh: boolean;
  locale: string;
  labels: {
    nodePrefix: string;
    typePrefix: string;
    sourcePrefix: string;
    noSummary: string;
    noPayload: string;
    assetsTitle: string;
    dateTimeLocale: string;
    newBadge: string;
    deleteReason: string;
    upstreamTitle: string;
    downstreamTitle: string;
  };
}) {
  const [open, setOpen] = React.useState(false);
  const kind = viewKind(node);
  const kindMeta = getKindMeta(locale);
  const meta = kindMeta[kind] ?? kindMeta.fact;
  const Icon = meta.icon;
  const ts = Date.parse(node.ts);
  const summary = summaryOf(node);
  const upstream = edges.filter((e) => e.dst === node.id).map((e) => ({ rel: e.rel, id: e.src }));
  const downstream = edges.filter((e) => e.src === node.id).map((e) => ({ rel: e.rel, id: e.dst }));

  const clockFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(labels.dateTimeLocale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [labels.dateTimeLocale],
  );

  return (
    <div className={cn("relative grid grid-cols-[4.5rem_1.75rem_1fr] gap-x-2", fresh && "bg-primary/5")}>
      {/* Time column */}
      <div className="py-3 text-right text-xs text-muted-foreground tabular-nums">
        <div>{Number.isNaN(ts) ? "--:--:--" : clockFmt.format(ts)}</div>
        <div className="text-[11px] opacity-70">{relTime(ts, now, locale)}</div>
      </div>

      {/* Timeline marker */}
      <div className="relative flex justify-center">
        <span className="absolute inset-y-0 w-px bg-border" />
        <span
          className={cn(
            "relative mt-3.5 flex size-6 items-center justify-center rounded-full text-white ring-4 ring-background",
            meta.dot,
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 border-b py-3 pr-1 last:border-b-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full min-w-0 items-start gap-2 text-left"
        >
          <ChevronRightIcon
            className={cn("mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <KindChip kind={kind} locale={locale} />
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">#{node.id}</code>
              <NodeStateBadge node={node} locale={locale} />
              {node.priority > 0 && (kind === "goal" || kind === "intent") && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">P{node.priority}</span>
              )}
              {fresh && (
                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {labels.newBadge}
                </span>
              )}
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{node.origin || "system"}</span>
            </div>
            <p className={cn("mt-1 text-sm", !open && "line-clamp-2")}>
              {summary || `${labels.nodePrefix} #${node.id}`}
            </p>
          </div>
        </button>

        {open && (
          <div className="mt-2 ml-5 flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {labels.nodePrefix} <code className="font-mono">#{node.id}</code>
              </span>
              <span>
                {labels.typePrefix} {meta.label}
              </span>
              <span>
                {labels.sourcePrefix} {node.origin || "system"}
              </span>
              <span>{Number.isNaN(ts) ? node.ts : new Date(ts).toLocaleString(labels.dateTimeLocale)}</span>
            </div>
            {node.state === "deleted" && node.delete_reason && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
                <span className="font-medium text-destructive">{labels.deleteReason}</span>
                <span className="ml-2 break-words text-muted-foreground">{node.delete_reason}</span>
              </div>
            )}
            <AssetList assets={assets[node.id] ?? []} title={labels.assetsTitle} />
            {(upstream.length > 0 || downstream.length > 0) && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <RelatedList
                  title={labels.upstreamTitle}
                  rows={upstream}
                  refs={refs}
                  assets={assets}
                  locale={locale}
                  labels={labels}
                />
                <RelatedList
                  title={labels.downstreamTitle}
                  rows={downstream}
                  refs={refs}
                  assets={assets}
                  locale={locale}
                  labels={labels}
                />
              </div>
            )}
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">payload</div>
              <pre className="max-h-64 overflow-auto rounded-md border bg-background p-3 font-mono text-xs whitespace-pre-wrap">
                {prettyPayload(node.payload, labels.noPayload)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BroadcastTab({ taskId }: { taskId: string }) {
  const { locale } = useI18n();
  const [kinds, setKinds] = React.useState<ExploreKind[]>([]);
  const [queryInput, setQueryInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [order, setOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(20);
  const [live, setLive] = React.useState(true);

  const [items, setItems] = React.useState<TaskNode[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [refs, setRefs] = React.useState<Record<string, TaskNode>>({});
  const [assets, setAssets] = React.useState<Record<string, FindingAsset[]>>({});
  const [total, setTotal] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const [freshIDs, setFreshIDs] = React.useState<Set<string>>(new Set());
  const [pending, setPending] = React.useState(0);
  const [now, setNow] = React.useState(0);

  const seenRef = React.useRef<Set<string>>(new Set());
  const baselineRef = React.useRef<number | null>(null);
  const streamRef = React.useRef("");
  const atLive = page === 1 && order === "desc";

  const labels = React.useMemo(() => {
    switch (locale) {
      case "pt":
        return {
          nodePrefix: "Nó",
          typePrefix: "Tipo:",
          sourcePrefix: "Origem:",
          noSummary: "(Sem resumo)",
          noPayload: "(Sem payload)",
          assetsTitle: "Ativos envolvidos",
          dateTimeLocale: "pt-BR",
          newBadge: "NOVO",
          deleteReason: "Motivo da exclusão",
          upstreamTitle: "Origem · Antecessores",
          downstreamTitle: "Destino · Sucessores",
          searchPlaceholder: "Buscar conteúdo / origem / ID do nó",
          searchAria: "Pesquisar transmissão",
          clearFilters: "Limpar",
          orderNewest: "Mais recentes primeiro",
          orderOldest: "Mais antigos primeiro",
          orderAriaDesc: "Mais recentes primeiro, clique para alternar para mais antigos",
          orderAriaAsc: "Mais antigos primeiro, clique para alternar para mais recentes",
          autoRefresh: "Atualização automática",
          paused: "Pausado",
          pauseAria: "Pausar atualização automática",
          resumeAria: "Retomar atualização automática",
          pendingNotice: (count: number | string) => `${count} novas transmissões · Ir para o topo`,
          noMatching: "Nenhuma transmissão correspondente aos filtros.",
          noNodesYet: "Esta tarefa ainda não gerou nós de exploração.",
          unknownDate: "Data desconhecida",
          perPage: "por página",
          prevPage: "Página anterior",
          nextPage: "Próxima página",
        };
      case "zh":
        return {
          nodePrefix: "节点",
          typePrefix: "类型",
          sourcePrefix: "来源",
          noSummary: "（无摘要）",
          noPayload: "（无 payload）",
          assetsTitle: "涉及资产",
          dateTimeLocale: "zh-CN",
          newBadge: "新",
          deleteReason: "删除原因",
          upstreamTitle: "上游 · 由此而来",
          downstreamTitle: "下游 · 由此产生",
          searchPlaceholder: "搜索内容 / 来源 / 节点 id",
          searchAria: "搜索播报",
          clearFilters: "清除",
          orderNewest: "最新在前",
          orderOldest: "最早在前",
          orderAriaDesc: "当前最新在前，点击改为最早在前",
          orderAriaAsc: "当前最早在前，点击改为最新在前",
          autoRefresh: "自动刷新",
          paused: "已暂停",
          pauseAria: "暂停自动刷新",
          resumeAria: "恢复自动刷新",
          pendingNotice: (count: number | string) => `${count} 条新播报 · 回到最新`,
          noMatching: "没有符合条件的播报。",
          noNodesYet: "这个任务还没有产生探索节点。",
          unknownDate: "未知日期",
          perPage: "/ 页",
          prevPage: "上一页",
          nextPage: "下一页",
        };
      default:
        return {
          nodePrefix: "Node",
          typePrefix: "Type:",
          sourcePrefix: "Source:",
          noSummary: "(No summary)",
          noPayload: "(No payload)",
          assetsTitle: "Involved Assets",
          dateTimeLocale: "en-US",
          newBadge: "NEW",
          deleteReason: "Delete Reason",
          upstreamTitle: "Upstream · Origin",
          downstreamTitle: "Downstream · Produced",
          searchPlaceholder: "Search content / source / node ID",
          searchAria: "Search broadcast",
          clearFilters: "Clear",
          orderNewest: "Newest first",
          orderOldest: "Oldest first",
          orderAriaDesc: "Currently newest first, click for oldest first",
          orderAriaAsc: "Currently oldest first, click for newest first",
          autoRefresh: "Auto-refresh",
          paused: "Paused",
          pauseAria: "Pause auto-refresh",
          resumeAria: "Resume auto-refresh",
          pendingNotice: (count: number | string) => `${count} new broadcasts · Return to latest`,
          noMatching: "No matching broadcasts.",
          noNodesYet: "This task has not generated any exploration nodes yet.",
          unknownDate: "Unknown date",
          perPage: "/ page",
          prevPage: "Previous page",
          nextPage: "Next page",
        };
    }
  }, [locale]);

  React.useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setQuery(queryInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [queryInput]);

  React.useEffect(() => {
    let alive = true;
    let rendered = false;
    const stream = `${taskId}|${kinds.join(",")}|${query}|${order}`;
    if (streamRef.current !== stream) {
      streamRef.current = stream;
      seenRef.current = new Set();
      baselineRef.current = null;
      setPending(0);
    }
    const load = () =>
      api
        .explorationNodes(taskId, { page, size, kinds, q: query, order })
        .then((r) => {
          if (!alive) return;
          if (atLive || !rendered) {
            rendered = true;
            setItems(r.items);
            setEdges(r.edges);
            setRefs(r.refs);
            setAssets(r.assets);
          }
          setTotal(r.total);
          if (atLive) {
            const seen = seenRef.current;
            setFreshIDs(seen.size === 0 ? new Set() : new Set(r.items.filter((n) => !seen.has(n.id)).map((n) => n.id)));
            seenRef.current = new Set(r.items.map((n) => n.id));
            baselineRef.current = r.total;
            setPending(0);
          } else {
            const base = baselineRef.current;
            setPending(base === null ? 0 : Math.max(0, r.total - base));
          }
          setLoaded(true);
        })
        .catch(() => {
          // Keep last good state on transient polling error
        });
    void load();
    if (!live) {
      return () => {
        alive = false;
      };
    }
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [taskId, page, size, kinds, query, order, live, atLive]);

  const toggleKind = (kind: ExploreKind) => {
    setKinds((cur) => (cur.includes(kind) ? cur.filter((k) => k !== kind) : [...cur, kind]));
    setPage(1);
  };

  const backToLive = () => {
    setPage(1);
    setOrder("desc");
    setPending(0);
  };

  const nodeIndex = React.useMemo(() => {
    const idx: Record<string, TaskNode> = { ...refs };
    for (const n of items) idx[n.id] = n;
    return idx;
  }, [refs, items]);

  const pageCount = Math.max(1, Math.ceil(total / size));
  const start = total === 0 ? 0 : (page - 1) * size + 1;
  const end = (page - 1) * size + items.length;

  React.useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const dayFmt = React.useMemo(
    () => new Intl.DateTimeFormat(labels.dateTimeLocale, { month: "long", day: "numeric", weekday: "short" }),
    [labels.dateTimeLocale],
  );

  const groups: Array<{ day: string; rows: TaskNode[] }> = [];
  for (const node of items) {
    const ts = Date.parse(node.ts);
    const day = Number.isNaN(ts) ? labels.unknownDate : dayFmt.format(ts);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(node);
    else groups.push({ day, rows: [node] });
  }

  const kindMeta = getKindMeta(locale);

  return (
    <Card className="overflow-hidden py-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="h-8 pl-8"
            aria-label={labels.searchAria}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {FILTER_KINDS.map((kind) => {
            const meta = kindMeta[kind];
            const active = kinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                onClick={() => toggleKind(kind)}
                aria-pressed={active}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                  active ? meta.chip : "border-transparent text-muted-foreground hover:bg-accent",
                )}
              >
                {meta.label}
              </button>
            );
          })}
          {kinds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setKinds([]);
                setPage(1);
              }}
            >
              {labels.clearFilters}
            </Button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setOrder((o) => (o === "desc" ? "asc" : "desc"));
              setPage(1);
            }}
            aria-label={order === "desc" ? labels.orderAriaDesc : labels.orderAriaAsc}
          >
            {order === "desc" ? <ArrowDownIcon /> : <ArrowUpIcon />}
            {order === "desc" ? labels.orderNewest : labels.orderOldest}
          </Button>
          <Button
            variant={live ? "outline" : "secondary"}
            size="sm"
            className="h-8"
            onClick={() => setLive((v) => !v)}
            aria-label={live ? labels.pauseAria : labels.resumeAria}
          >
            {live ? <PauseIcon /> : <PlayIcon />}
            {live ? labels.autoRefresh : labels.paused}
          </Button>
        </div>
      </div>

      {/* Pending broadcast banner */}
      {!atLive && pending > 0 && (
        <button
          type="button"
          onClick={backToLive}
          className="flex w-full items-center justify-center gap-1.5 border-b bg-primary/10 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
        >
          <ArrowUpToLineIcon className="size-3.5" />
          {labels.pendingNotice(pending > 99 ? "99+" : pending)}
        </button>
      )}

      <CardContent className="px-4 py-0">
        {!loaded ? (
          <div className="flex flex-col gap-3 py-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {query || kinds.length > 0 ? labels.noMatching : labels.noNodesYet}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.day}>
              <div className="py-2 pl-[6.25rem] text-xs font-medium text-muted-foreground">{group.day}</div>
              {group.rows.map((node) => (
                <BroadcastRow
                  key={node.id}
                  node={node}
                  edges={edges}
                  refs={nodeIndex}
                  assets={assets}
                  now={now}
                  fresh={freshIDs.has(node.id)}
                  locale={locale}
                  labels={labels}
                />
              ))}
            </div>
          ))
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground">
        <Select
          value={String(size)}
          onValueChange={(v) => {
            setSize(Number(v));
            setPage(1);
          }}
        >
          <SelectTrigger size="sm" className="h-7 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} {labels.perPage}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="tabular-nums">
          {start}–{end} / {total}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label={labels.prevPage}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="tabular-nums">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            aria-label={labels.nextPage}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
