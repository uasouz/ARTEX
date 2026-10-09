// Centralised status → color/label semantics, reused across the whole app.
// Spec §8.3: 意图 / 覆盖 / 任务 / 严重度 each have a consistent color set.

import { getClientCookie } from "./cookie.client";

export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "rose" | "violet" | "slate";

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  red: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  rose: "bg-rose-600 text-white border-rose-600 dark:bg-rose-600 dark:text-white",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  slate: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export const toneDot: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  rose: "bg-white",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
};

export interface StatusMeta {
  label: string;
  tone: Tone;
}

type LocalizedLabel = {
  en: string;
  pt: string;
  zh: string;
};

interface LocalizedStatusMeta {
  label: LocalizedLabel;
  tone: Tone;
}

const intent: Record<string, LocalizedStatusMeta> = {
  open: { label: { en: "Pending", pt: "Pendente", zh: "待领" }, tone: "slate" },
  running: { label: { en: "Running", pt: "Em Execução", zh: "执行中" }, tone: "blue" },
  paused: { label: { en: "Paused", pt: "Pausado", zh: "已暂停" }, tone: "amber" },
  done: { label: { en: "Completed", pt: "Concluído", zh: "已完成" }, tone: "green" },
  blocked: { label: { en: "Failed", pt: "Falha", zh: "执行出错" }, tone: "red" },
  exhausted: { label: { en: "Budget Exhausted", pt: "Limite Atingido", zh: "预算耗尽" }, tone: "violet" },
  stopped: { label: { en: "Stopped", pt: "Interrompido", zh: "已停止" }, tone: "slate" },
  deleted: { label: { en: "Deleted", pt: "Excluído", zh: "已删除" }, tone: "slate" },
};

const task: Record<string, LocalizedStatusMeta> = {
  created: { label: { en: "Created", pt: "Criado", zh: "已创建" }, tone: "slate" },
  queued: { label: { en: "Queued", pt: "Na Fila", zh: "排队中" }, tone: "amber" },
  running: { label: { en: "Running", pt: "Em Execução", zh: "运行中" }, tone: "blue" },
  paused: { label: { en: "Paused", pt: "Pausado", zh: "已暂停" }, tone: "amber" },
  done: { label: { en: "Completed", pt: "Concluído", zh: "已完成" }, tone: "green" },
  failed: { label: { en: "Failed", pt: "Falhou", zh: "失败" }, tone: "red" },
  timeout: { label: { en: "Timed Out", pt: "Expirado", zh: "已超时" }, tone: "amber" },
};

const severity: Record<string, LocalizedStatusMeta> = {
  critical: { label: { en: "Critical", pt: "Crítica", zh: "严重" }, tone: "rose" },
  high: { label: { en: "High", pt: "Alta", zh: "高危" }, tone: "red" },
  medium: { label: { en: "Medium", pt: "Média", zh: "中危" }, tone: "amber" },
  low: { label: { en: "Low", pt: "Baixa", zh: "低危" }, tone: "slate" },
};

const finding: Record<string, LocalizedStatusMeta> = {
  pending: { label: { en: "Pending", pt: "Pendente", zh: "待处理" }, tone: "amber" },
  in_progress: { label: { en: "In Progress", pt: "Em Tratamento", zh: "处理中" }, tone: "blue" },
  confirmed: { label: { en: "Confirmed", pt: "Confirmado", zh: "已确认" }, tone: "red" },
  resolved: { label: { en: "Resolved", pt: "Resolvido", zh: "已处理" }, tone: "green" },
  fixed: { label: { en: "Fixed", pt: "Corrigido", zh: "已修复" }, tone: "green" },
  false_positive: { label: { en: "False Positive", pt: "Falso Positivo", zh: "误报" }, tone: "slate" },
  ignored: { label: { en: "Ignored", pt: "Ignorado", zh: "忽略" }, tone: "neutral" },
  duplicate: { label: { en: "Duplicate", pt: "Duplicado", zh: "重复" }, tone: "neutral" },
  risk_accepted: { label: { en: "Risk Accepted", pt: "Risco Aceito", zh: "风险接受" }, tone: "violet" },
};

const engine: Record<string, LocalizedStatusMeta> = {
  exploring: { label: { en: "Exploring", pt: "Explorando", zh: "探索中" }, tone: "blue" },
  paused: { label: { en: "Paused", pt: "Pausado", zh: "已暂停" }, tone: "amber" },
  stalled: { label: { en: "Stalled", pt: "Travado", zh: "停滞" }, tone: "red" },
  idle: { label: { en: "Idle", pt: "Inativo", zh: "空闲" }, tone: "neutral" },
};

const goal: Record<string, LocalizedStatusMeta> = {
  open: { label: { en: "In Progress", pt: "Em Aberto", zh: "进行中" }, tone: "blue" },
  met: { label: { en: "Achieved", pt: "Atingido", zh: "已达成" }, tone: "green" },
  abandoned: { label: { en: "Abandoned", pt: "Abandonado", zh: "已放弃" }, tone: "slate" },
};

const audit: Record<string, LocalizedStatusMeta> = {
  allow: { label: { en: "Allow", pt: "Permitir", zh: "放行" }, tone: "green" },
  block: { label: { en: "Block", pt: "Bloquear", zh: "拦截" }, tone: "red" },
};

const node: Record<string, LocalizedStatusMeta> = {
  observed: { label: { en: "Observed", pt: "Observado", zh: "观测" }, tone: "slate" },
  confirmed: { label: { en: "Confirmed", pt: "Confirmado", zh: "确认" }, tone: "green" },
  tombstoned: { label: { en: "Deprecated", pt: "Descartado", zh: "废弃" }, tone: "neutral" },
};

const delivery: Record<string, LocalizedStatusMeta> = {
  pending: { label: { en: "Pending", pt: "Pendente", zh: "待发送" }, tone: "amber" },
  sending: { label: { en: "Sending", pt: "Enviando", zh: "发送中" }, tone: "blue" },
  sent: { label: { en: "Delivered", pt: "Entregue", zh: "已送达" }, tone: "green" },
  failed: { label: { en: "Failed", pt: "Falhou", zh: "失败" }, tone: "red" },
  skipped: { label: { en: "Skipped", pt: "Ignorado", zh: "已跳过" }, tone: "neutral" },
};

const maps = {
  intent,
  task,
  severity,
  finding,
  engine,
  goal,
  audit,
  node,
  delivery,
} as const;

export type StatusDomain = keyof typeof maps;

function resolveLocale(): "en" | "pt" | "zh" {
  if (typeof document === "undefined") return "en";
  const saved = getClientCookie("cirdan_locale");
  if (saved === "pt" || saved === "zh" || saved === "en") return saved;
  const local = typeof window !== "undefined" ? localStorage.getItem("cirdan_locale") : null;
  if (local === "pt" || local === "zh" || local === "en") return local;
  return "en";
}

export function statusMeta(domain: StatusDomain, key: string, targetLocale?: "en" | "pt" | "zh"): StatusMeta {
  const item = (maps[domain] as Record<string, LocalizedStatusMeta | undefined>)[key];
  if (!item) {
    return { label: key, tone: "neutral" };
  }
  const lang = targetLocale ?? resolveLocale();
  return {
    label: item.label[lang] ?? item.label.en ?? key,
    tone: item.tone,
  };
}
