"use client";

import * as React from "react";

import {
  ActivityIcon,
  AlertTriangleIcon,
  BugIcon,
  CheckIcon,
  ClockIcon,
  CoinsIcon,
  ListChecksIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TargetIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type {
  AssetInterceptKind,
  AssetInterceptRule,
  Finding,
  ModelTokenStat,
  Stats,
  Task,
  TaskConstraint,
  TaskGoal,
  TaskNode,
  TaskScopeRow,
} from "@/lib/types";

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function cacheHitRate(cacheRead: number, input: number): string {
  if (input <= 0) return "—";
  return Math.round((cacheRead / input) * 100) + "%";
}

function scopeValue(row: TaskScopeRow, companyFallback: (id: string | number) => string): string {
  if (row.value) return row.value;
  if (row.domain) return row.domain;
  if (row.net) return row.net;
  if (row.company_id) return row.company_name?.trim() ? row.company_name : companyFallback(row.company_id);
  return "—";
}

function getScopeKindLabels(locale: string): Record<TaskScopeRow["kind"], string> {
  if (locale === "pt") {
    return {
      company: "Empresa",
      root_domain: "Domínio raiz",
      subdomain: "Subdomínio",
      ip: "IP",
      cidr: "Faixa CIDR",
      icp: "Registro / ICP",
      keyword: "Palavra-chave",
    };
  }
  if (locale === "zh") {
    return {
      company: "公司",
      root_domain: "根域名",
      subdomain: "子域名",
      ip: "IP",
      cidr: "网段",
      icp: "ICP",
      keyword: "关键词",
    };
  }
  return {
    company: "Company",
    root_domain: "Root Domain",
    subdomain: "Subdomain",
    ip: "IP",
    cidr: "CIDR Subnet",
    icp: "ICP / Registry",
    keyword: "Keyword",
  };
}

function getScopeSourceLabels(locale: string): Record<TaskScopeRow["source"], string> {
  if (locale === "pt") {
    return {
      auto: "Automático",
      agent: "Agent",
      manual: "Manual",
    };
  }
  if (locale === "zh") {
    return {
      auto: "自动",
      agent: "Agent",
      manual: "手动",
    };
  }
  return {
    auto: "Auto",
    agent: "Agent",
    manual: "Manual",
  };
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="gap-1.5">
      <CardHeader className="pb-0">
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" /> {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {sub && <CardContent className="text-xs text-muted-foreground">{sub}</CardContent>}
    </Card>
  );
}

export function OverviewTab({ taskId }: { taskId: string }) {
  const { locale } = useI18n();
  const [task, setTask] = React.useState<Task | null>(null);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [intents, setIntents] = React.useState<TaskNode[]>([]);
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [coverage, setCoverage] = React.useState<{
    enabled: boolean;
    scope_rows: number;
    denominator: number;
    tested: number;
    pct: number | null;
    by_type: { type: string; total: number; tested: number }[];
  } | null>(null);
  const [rerunning, setRerunning] = React.useState<Set<string>>(new Set());

  const [scope, setScope] = React.useState<TaskScopeRow[]>([]);
  const [scopeKind, setScopeKind] = React.useState<TaskScopeRow["kind"]>("root_domain");
  const [scopeValueInput, setScopeValueInput] = React.useState("");
  const [scopeBusy, setScopeBusy] = React.useState(false);
  const [scopeErr, setScopeErr] = React.useState("");
  const [modelTokens, setModelTokens] = React.useState<ModelTokenStat[]>([]);

  const [goals, setGoals] = React.useState<TaskGoal[]>([]);
  const [goalText, setGoalText] = React.useState("");
  const [goalVuln, setGoalVuln] = React.useState("");
  const [goalBusy, setGoalBusy] = React.useState(false);
  const [goalErr, setGoalErr] = React.useState("");
  const [editingGoalId, setEditingGoalId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");
  const [editVuln, setEditVuln] = React.useState("");

  const [constraints, setConstraints] = React.useState<TaskConstraint[]>([]);
  const [conText, setConText] = React.useState("");
  const [conKind, setConKind] = React.useState<TaskConstraint["kind"]>("deny");
  const [conBusy, setConBusy] = React.useState(false);
  const [conErr, setConErr] = React.useState("");
  const [editingConId, setEditingConId] = React.useState<string | null>(null);
  const [editConText, setEditConText] = React.useState("");
  const [editConKind, setEditConKind] = React.useState<TaskConstraint["kind"]>("deny");

  const scopeKindLabels = React.useMemo(() => getScopeKindLabels(locale), [locale]);
  const scopeSourceLabels = React.useMemo(() => getScopeSourceLabels(locale), [locale]);

  const labels = React.useMemo(() => {
    switch (locale) {
      case "pt":
        return {
          companyFallback: (id: string | number) => `Empresa #${id}`,
          taskDescTitle: "Descrição e Objetivos da Tarefa",
          description: "Descrição",
          targetGoal: "Objetivo",
          goalMgmtTitle: "Gerenciamento de Metas",
          goalMgmtDesc: (count: number) =>
            `(Metas verificáveis, ${count} no total; alterações notificam o planejador e retomam a execução)`,
          addGoalPlaceholder: "Nova meta, ex.: 'Obter acesso administrativo via IDOR'",
          vulnClassPlaceholder: "Classe de vuln. (opcional)",
          addBtn: "Adicionar",
          noGoals:
            "Nenhuma meta definida. Quando adicionadas, o planejador gera intenções de exploração para cumpri-las.",
          constraintsTitle: "Restrições Operacionais",
          constraintsDesc: (count: number) =>
            `(Define limites do planner/worker, ${count} no total; alterações entram em vigor no próximo ciclo)`,
          deny: "Bloquear",
          allow: "Permitir",
          conPlaceholder: "Ex.: 'Testar apenas a porta atual, não escanear outras portas'",
          noConstraints:
            "Nenhuma restrição definida. Extraída automaticamente na criação ou configurada aqui para limitar ações permitidas/bloqueadas.",
          coverageTitle: "Cobertura de Ativos",
          coverageRough: "(Estimativa aproximada, para referência)",
          coverageProgress: (tested: number, total: number) => `Testados ${tested} / No escopo ${total}`,
          tokensTitle: "Consumo de Tokens LLM",
          tokensCalls: (count: number) => `(Por modelo, ${count} chamadas no total)`,
          tokensInput: "Entrada",
          tokensOutput: "Saída",
          tokensCacheRead: "Leitura de cache",
          tokensHitRate: "Taxa de acerto",
          thModel: "Modelo",
          thCalls: "Chamadas",
          thInput: "Entrada",
          thOutput: "Saída",
          thCacheRead: "Cache",
          thHitRate: "Taxa de acerto",
          noTokens: "Nenhum consumo de LLM registrado ainda.",
          scopeTitle: "Escopo de Teste",
          scopeDesc: (count: number) => `(Denominador de cobertura + limites de autorização, ${count} no total)`,
          inherited: "Herdado",
          noScope:
            "Nenhum escopo de teste definido. Os itens adicionados servem como base para a métrica de cobertura.",
          heartbeatTitle: "Atividade & Estado",
          engineState: "Estado do Motor",
          activeWorkers: "Workers Ativos",
          lastActivity: "Última Atividade",
          goalsCounter: (met: number, total: number) => `Metas ${met}/${total}`,
          completedAt: "Concluído em",
          inFlightIntents: "Intenções em Andamento",
          noInFlight: "Nenhuma intenção em andamento",
          requiresAttention: "Atenção Necessária",
          confirmedFindings: "Vulnerabilidades Confirmadas",
          executing: "Em Execução",
          frontierPending: "Fila Frontier",
          blockedIntents: "Intenções Bloqueadas",
          recentFindings: "Descobertas Recentes",
          noFindingsYet: "Nenhuma descoberta até o momento",
          blockedCardTitle: "Intenções Bloqueadas ou com Erro",
          blockedCardDesc: (count: number) => `(${count} no total, reexecutável)`,
          rerunAll: "Reexecutar Tudo",
          rerun: "Reexecutar",
          showingFirst20: (rem: number) =>
            `Exibindo as primeiras 20. Clique em "Reexecutar Tudo" para processar as restantes ${rem}.`,
          statPending: "Intenções Pendentes",
          statPendingSub: "fila frontier aberta",
          statConfirmed: "Descobertas Confirmadas",
          statConfirmedSub: "nesta tarefa",
          statTotal: "Total de Intenções",
          statTotalSub: "todas as intenções da tarefa",
          dateTimeLocale: "pt-BR",
        };
      case "zh":
        return {
          companyFallback: (id: string | number) => `企业 #${id}`,
          taskDescTitle: "任务描述与目标",
          description: "描述",
          targetGoal: "目标",
          goalMgmtTitle: "目标管理",
          goalMgmtDesc: (count: number) => `（最终可核验的目标，共 ${count} 条；新增/修改会通知规划者并复活任务）`,
          addGoalPlaceholder: "新增目标，如『拿到管理员账号的越权访问』",
          vulnClassPlaceholder: "漏洞类(可选)",
          addBtn: "添加",
          noGoals: "暂无目标，添加后规划者会据此派发探索意图并判定达成。",
          constraintsTitle: "操作约束",
          constraintsDesc: (count: number) => `（框定 planner/worker 的探索边界，共 ${count} 条；改动下一轮规划生效）`,
          deny: "禁止",
          allow: "允许",
          conPlaceholder: "一条操作约束，如『仅测当前端口，不扫其他端口』",
          noConstraints:
            "暂无操作约束。建任务时会自动从描述/目标抽取；也可在此手动增删改，用来框定「允许/禁止做哪些操作」。",
          coverageTitle: "资产测试覆盖度",
          coverageRough: "（粗估，仅供参考）",
          coverageProgress: (tested: number, total: number) => `已测 ${tested} / 范围内 ${total}`,
          tokensTitle: "LLM Token 用量",
          tokensCalls: (count: number) => `（按模型统计，共 ${count} 次调用）`,
          tokensInput: "输入",
          tokensOutput: "输出",
          tokensCacheRead: "缓存读",
          tokensHitRate: "缓存命中率",
          thModel: "模型",
          thCalls: "调用",
          thInput: "输入",
          thOutput: "输出",
          thCacheRead: "缓存读",
          thHitRate: "命中率",
          noTokens: "暂无 LLM 用量（任务尚未产生调用，或记录仍在此写入）。",
          scopeTitle: "测试范围",
          scopeDesc: (count: number) => `（覆盖度分母 + 授权边界，共 ${count} 条）`,
          inherited: "继承",
          noScope: "暂无测试范围，添加后可作为资产覆盖度的分母。",
          heartbeatTitle: "心跳",
          engineState: "引擎态",
          activeWorkers: "运行中 Worker",
          lastActivity: "最近活动",
          goalsCounter: (met: number, total: number) => `目标 ${met}/${total}`,
          completedAt: "完成时间",
          inFlightIntents: "进行中意图",
          noInFlight: "暂无进行中意图",
          requiresAttention: "需要关注",
          confirmedFindings: "确认漏洞",
          executing: "执行中",
          frontierPending: "frontier 待领",
          blockedIntents: "被拦意图",
          recentFindings: "最近发现",
          noFindingsYet: "暂无发现",
          blockedCardTitle: "被拦/出错意图",
          blockedCardDesc: (count: number) => `（共 ${count} 条，可重跑）`,
          rerunAll: "全部重跑",
          rerun: "重跑",
          showingFirst20: (rem: number) => `仅显示前 20 条，点「全部重跑」处理剩余 ${rem} 条。`,
          statPending: "待领意图",
          statPendingSub: "frontier 开放",
          statConfirmed: "确认发现",
          statConfirmedSub: "本任务",
          statTotal: "意图总数",
          statTotalSub: "本任务全部意图",
          dateTimeLocale: "zh-CN",
        };
      default:
        return {
          companyFallback: (id: string | number) => `Company #${id}`,
          taskDescTitle: "Task Description & Objectives",
          description: "Description",
          targetGoal: "Target Goal",
          goalMgmtTitle: "Goal Management",
          goalMgmtDesc: (count: number) =>
            `(Verifiable end goals, ${count} total; additions/edits notify planner and resume task)`,
          addGoalPlaceholder: "New goal, e.g. 'Gain administrative privileges via IDOR'",
          vulnClassPlaceholder: "Vuln Class (optional)",
          addBtn: "Add",
          noGoals: "No goals defined. When added, the planner dispatches exploration intents and evaluates completion.",
          constraintsTitle: "Operational Constraints",
          constraintsDesc: (count: number) =>
            `(Defines planner/worker exploration boundaries, ${count} total; changes take effect next round)`,
          deny: "Deny",
          allow: "Allow",
          conPlaceholder: "Constraint, e.g. 'Test only current port, do not port-scan'",
          noConstraints:
            "No operational constraints defined. Automatically extracted on task creation or edited manually here.",
          coverageTitle: "Asset Coverage",
          coverageRough: "(Rough estimate, for reference)",
          coverageProgress: (tested: number, total: number) => `Tested ${tested} / In Scope ${total}`,
          tokensTitle: "LLM Token Usage",
          tokensCalls: (count: number) => `(By model, ${count} calls total)`,
          tokensInput: "Input",
          tokensOutput: "Output",
          tokensCacheRead: "Cache Read",
          tokensHitRate: "Cache Hit Rate",
          thModel: "Model",
          thCalls: "Calls",
          thInput: "Input",
          thOutput: "Output",
          thCacheRead: "Cache Read",
          thHitRate: "Hit Rate",
          noTokens: "No LLM token consumption recorded yet.",
          scopeTitle: "Testing Scope",
          scopeDesc: (count: number) => `(Coverage denominator + authorization boundaries, ${count} total)`,
          inherited: "Inherited",
          noScope: "No testing scope defined. Added items serve as the denominator for asset coverage.",
          heartbeatTitle: "Heartbeat & Activity",
          engineState: "Engine State",
          activeWorkers: "Active Workers",
          lastActivity: "Last Activity",
          goalsCounter: (met: number, total: number) => `Goals ${met}/${total}`,
          completedAt: "Completed At",
          inFlightIntents: "In-flight Intents",
          noInFlight: "No in-flight intents",
          requiresAttention: "Requires Attention",
          confirmedFindings: "Confirmed Findings",
          executing: "In-flight",
          frontierPending: "Frontier pending",
          blockedIntents: "Blocked intents",
          recentFindings: "Recent Findings",
          noFindingsYet: "No findings yet",
          blockedCardTitle: "Blocked / Errored Intents",
          blockedCardDesc: (count: number) => `(${count} total, rerun supported)`,
          rerunAll: "Rerun All",
          rerun: "Rerun",
          showingFirst20: (rem: number) => `Showing first 20. Click "Rerun All" to process the remaining ${rem}.`,
          statPending: "Pending Intents",
          statPendingSub: "frontier open",
          statConfirmed: "Confirmed Findings",
          statConfirmedSub: "this task",
          statTotal: "Total Intents",
          statTotalSub: "all task intents",
          dateTimeLocale: "en-US",
        };
    }
  }, [locale]);

  const loadTokens = React.useCallback(async () => {
    try {
      const resp = await api.tokensByModel(taskId);
      setModelTokens(resp.models);
    } catch {
      // ignore
    }
  }, [taskId]);

  const loadScope = React.useCallback(async () => {
    try {
      const resp = await api.taskScope(taskId);
      setScope(resp.scope);
    } catch {
      // ignore
    }
  }, [taskId]);

  const loadGoals = React.useCallback(async () => {
    try {
      const resp = await api.taskGoals(taskId);
      setGoals(resp.goals);
    } catch {
      // ignore
    }
  }, [taskId]);

  const addGoal = async () => {
    const text = goalText.trim();
    if (!text) return;
    setGoalBusy(true);
    setGoalErr("");
    try {
      await api.addGoal(taskId, text, goalVuln.trim() || undefined);
      setGoalText("");
      setGoalVuln("");
      await loadGoals();
    } catch (e) {
      setGoalErr(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setGoalBusy(false);
    }
  };

  const startEditGoal = (g: TaskGoal) => {
    setEditingGoalId(g.id);
    setEditText(g.text);
    setEditVuln(g.vulnclass ?? "");
  };

  const cancelEditGoal = () => {
    setEditingGoalId(null);
    setEditText("");
    setEditVuln("");
  };

  const saveEditGoal = async (g: TaskGoal) => {
    const text = editText.trim();
    if (!text) return;
    setGoalBusy(true);
    setGoalErr("");
    try {
      await api.updateGoal(taskId, g.id, text, editVuln.trim() || undefined);
      cancelEditGoal();
      await loadGoals();
    } catch (e) {
      setGoalErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setGoalBusy(false);
    }
  };

  const removeGoal = async (g: TaskGoal) => {
    setGoals((prev) => prev.filter((x) => x.id !== g.id));
    try {
      await api.deleteGoal(taskId, g.id);
    } catch {
      await loadGoals();
    }
  };

  const loadConstraints = React.useCallback(async () => {
    try {
      const resp = await api.taskConstraints(taskId);
      setConstraints(resp.constraints);
    } catch {
      // ignore
    }
  }, [taskId]);

  const addConstraint = async () => {
    const text = conText.trim();
    if (!text) return;
    setConBusy(true);
    setConErr("");
    try {
      await api.addConstraint(taskId, text, conKind);
      setConText("");
      await loadConstraints();
    } catch (e) {
      setConErr(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setConBusy(false);
    }
  };

  const startEditConstraint = (c: TaskConstraint) => {
    setEditingConId(c.id);
    setEditConText(c.text);
    setEditConKind(c.kind);
  };

  const cancelEditConstraint = () => {
    setEditingConId(null);
    setEditConText("");
    setEditConKind("deny");
  };

  const saveEditConstraint = async (c: TaskConstraint) => {
    const text = editConText.trim();
    if (!text) return;
    setConBusy(true);
    setConErr("");
    try {
      await api.updateConstraint(taskId, c.id, text, editConKind);
      cancelEditConstraint();
      await loadConstraints();
    } catch (e) {
      setConErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setConBusy(false);
    }
  };

  const removeConstraint = async (c: TaskConstraint) => {
    setConstraints((prev) => prev.filter((x) => x.id !== c.id));
    try {
      await api.deleteConstraint(taskId, c.id);
    } catch {
      await loadConstraints();
    }
  };

  const addScope = async () => {
    const value = scopeValueInput.trim();
    if (!value) return;
    setScopeBusy(true);
    setScopeErr("");
    try {
      await api.addTaskScope(taskId, scopeKind, value);
      setScopeValueInput("");
      await loadScope();
    } catch (e) {
      setScopeErr(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setScopeBusy(false);
    }
  };

  const removeScope = async (row: TaskScopeRow) => {
    setScope((prev) => prev.filter((s) => s.id !== row.id));
    try {
      await api.deleteTaskScope(taskId, row.id);
    } catch {
      await loadScope();
    }
  };

  const markRerun = (key: string, on: boolean) =>
    setRerunning((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const rerunOne = async (id: string) => {
    markRerun(id, true);
    try {
      await api.rerunIntent(taskId, id);
      setIntents((prev) => prev.map((i) => (i.id === id ? { ...i, state: "open" } : i)));
    } catch {
      // ignore
    } finally {
      markRerun(id, false);
    }
  };

  const rerunAll = async () => {
    markRerun("__all__", true);
    try {
      await api.rerunBlocked(taskId);
      setIntents((prev) => prev.map((i) => (i.state === "blocked" ? { ...i, state: "open" } : i)));
    } catch {
      // ignore
    } finally {
      markRerun("__all__", false);
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    let loading = false;

    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const [taskResp, statsResp, intentsResp, findingsResp] = await Promise.all([
          api.task(taskId),
          api.stats(taskId),
          api.intents(taskId),
          api.findings(taskId),
        ]);
        if (cancelled) return;
        const activeTask = statsResp.active_task;
        setTask(
          activeTask
            ? {
                ...taskResp,
                in_flight: activeTask.in_flight,
                goals_total: activeTask.goals_total,
                goals_met: activeTask.goals_met,
                engine_mode: statsResp.engine_mode ?? activeTask.engine_mode,
                paused: activeTask.paused,
              }
            : taskResp,
        );
        setStats(statsResp);
        setIntents(intentsResp);
        setFindings(findingsResp);
        api
          .taskCoverage(taskId)
          .then((c) => {
            if (!cancelled) setCoverage(c);
          })
          .catch(() => {
            // ignore transient error
          });
      } catch {
        // ignore
      } finally {
        loading = false;
      }
    };

    void load();
    void loadScope();
    void loadTokens();
    void loadGoals();
    void loadConstraints();
    const timer = setInterval(() => {
      void load();
      void loadTokens();
      void loadGoals();
      void loadConstraints();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [taskId, loadScope, loadTokens, loadGoals, loadConstraints]);

  const running = intents.filter((i) => i.state === "running");
  const open = intents.filter((i) => i.state === "open");
  const blocked = intents.filter((i) => i.state === "blocked");
  const taskFindings = findings.filter((f) => f.task_id === taskId);
  const goalsPct = task?.goals_total ? Math.round(((task.goals_met ?? 0) / task.goals_total) * 100) : 0;

  const tokenTotals = modelTokens.reduce(
    (acc, m) => {
      acc.input += m.input_tokens;
      acc.output += m.output_tokens;
      acc.cacheRead += m.cache_read_tokens;
      acc.cacheWrite += m.cache_write_tokens;
      acc.calls += m.calls;
      return acc;
    },
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Task Description and Target Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TargetIcon className="size-4 text-primary" /> {labels.taskDescTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-medium text-muted-foreground">{labels.description}</div>
            <p className="text-sm whitespace-pre-wrap break-words">{task?.description?.trim() || "—"}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-medium text-muted-foreground">{labels.targetGoal}</div>
            <p className="text-sm whitespace-pre-wrap break-words">{task?.goal?.trim() || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Goal Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecksIcon className="size-4 text-primary" /> {labels.goalMgmtTitle}
            <span className="text-muted-foreground text-xs font-normal">{labels.goalMgmtDesc(goals.length)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-7 min-w-56 flex-1 text-sm"
              placeholder={labels.addGoalPlaceholder}
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addGoal();
              }}
              disabled={goalBusy}
            />
            <Input
              className="h-7 w-32 text-sm"
              placeholder={labels.vulnClassPlaceholder}
              value={goalVuln}
              onChange={(e) => setGoalVuln(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addGoal();
              }}
              disabled={goalBusy}
            />
            <Button size="sm" variant="outline" disabled={goalBusy || !goalText.trim()} onClick={() => void addGoal()}>
              <PlusIcon className="size-3.5" /> {labels.addBtn}
            </Button>
            {goalErr && <span className="text-xs text-red-500">{goalErr}</span>}
          </div>

          {goals.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {goals.map((g) =>
                editingGoalId === g.id ? (
                  <div key={g.id} className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5">
                    <Input
                      className="h-7 min-w-56 flex-1 text-sm"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveEditGoal(g);
                        if (e.key === "Escape") cancelEditGoal();
                      }}
                      disabled={goalBusy}
                      autoFocus
                    />
                    <Input
                      className="h-7 w-32 text-sm"
                      placeholder={labels.vulnClassPlaceholder}
                      value={editVuln}
                      onChange={(e) => setEditVuln(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveEditGoal(g);
                        if (e.key === "Escape") cancelEditGoal();
                      }}
                      disabled={goalBusy}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-1.5"
                      disabled={goalBusy || !editText.trim()}
                      onClick={() => void saveEditGoal(g)}
                    >
                      <CheckIcon className="size-3.5 text-emerald-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-1.5"
                      disabled={goalBusy}
                      onClick={cancelEditGoal}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div key={g.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                    <StatusBadge domain="goal" value={g.state} />
                    <span className="min-w-0 flex-1 break-words">{g.text}</span>
                    {g.vulnclass && (
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                        {g.vulnclass}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-1.5"
                      disabled={goalBusy}
                      onClick={() => startEditGoal(g)}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-1.5"
                      disabled={goalBusy}
                      onClick={() => void removeGoal(g)}
                    >
                      <Trash2Icon className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{labels.noGoals}</p>
          )}
        </CardContent>
      </Card>

      {/* Operational Constraints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlertIcon className="size-4 text-amber-500" /> {labels.constraintsTitle}
            <span className="text-muted-foreground text-xs font-normal">
              {labels.constraintsDesc(constraints.length)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              size="sm"
              value={conKind}
              onChange={(e) => setConKind(e.target.value as TaskConstraint["kind"])}
            >
              <NativeSelectOption value="deny">{labels.deny}</NativeSelectOption>
              <NativeSelectOption value="allow">{labels.allow}</NativeSelectOption>
            </NativeSelect>
            <Input
              className="h-7 min-w-56 flex-1 text-sm"
              placeholder={labels.conPlaceholder}
              value={conText}
              onChange={(e) => setConText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addConstraint();
              }}
              disabled={conBusy}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={conBusy || !conText.trim()}
              onClick={() => void addConstraint()}
            >
              <PlusIcon className="size-3.5" /> {labels.addBtn}
            </Button>
            {conErr && <span className="text-xs text-red-500">{conErr}</span>}
          </div>

          {constraints.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {constraints.map((c) =>
                editingConId === c.id ? (
                  <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5">
                    <NativeSelect
                      size="sm"
                      value={editConKind}
                      onChange={(e) => setEditConKind(e.target.value as TaskConstraint["kind"])}
                    >
                      <NativeSelectOption value="deny">{labels.deny}</NativeSelectOption>
                      <NativeSelectOption value="allow">{labels.allow}</NativeSelectOption>
                    </NativeSelect>
                    <Input
                      className="h-7 min-w-56 flex-1 text-sm"
                      value={editConText}
                      onChange={(e) => setEditConText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveEditConstraint(c);
                        if (e.key === "Escape") cancelEditConstraint();
                      }}
                      disabled={conBusy}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-1.5"
                      disabled={conBusy || !editConText.trim()}
                      onClick={() => void saveEditConstraint(c)}
                    >
                      <CheckIcon className="size-3.5 text-emerald-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-1.5"
                      disabled={conBusy}
                      onClick={cancelEditConstraint}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div key={c.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                        c.kind === "allow"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/15 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {c.kind === "allow" ? labels.allow : labels.deny}
                    </span>
                    <span className="min-w-0 flex-1 break-words">{c.text}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-1.5"
                      disabled={conBusy}
                      onClick={() => startEditConstraint(c)}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-1.5"
                      disabled={conBusy}
                      onClick={() => void removeConstraint(c)}
                    >
                      <Trash2Icon className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{labels.noConstraints}</p>
          )}
        </CardContent>
      </Card>

      <TaskInterceptRulesCard taskId={taskId} locale={locale} />

      {coverage && coverage.enabled && coverage.scope_rows > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TargetIcon className="size-4 text-emerald-500" /> {labels.coverageTitle}
              <span className="text-muted-foreground text-xs font-normal">{labels.coverageRough}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold tabular-nums">
                {coverage.pct != null ? Math.round(coverage.pct * 100) + "%" : "—"}
              </span>
              <span className="text-muted-foreground text-sm">
                {labels.coverageProgress(coverage.tested, coverage.denominator)}
              </span>
            </div>
            {coverage.pct != null && <Progress value={Math.round(coverage.pct * 100)} />}
            {coverage.by_type.length > 0 && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                {coverage.by_type.map((b) => (
                  <span key={b.type} className="bg-muted rounded px-1.5 py-0.5">
                    <span className="text-muted-foreground">{b.type}</span>{" "}
                    <span className="tabular-nums font-medium">
                      {b.tested}/{b.total}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* LLM Token Consumption */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CoinsIcon className="size-4 text-amber-500" /> {labels.tokensTitle}
            <span className="text-muted-foreground text-xs font-normal">{labels.tokensCalls(tokenTotals.calls)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {modelTokens.length > 0 ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <span className="tabular-nums">
                  <span className="text-muted-foreground">{labels.tokensInput} </span>
                  <span className="font-semibold">{fmtTokens(tokenTotals.input)}</span>
                </span>
                <span className="tabular-nums">
                  <span className="text-muted-foreground">{labels.tokensOutput} </span>
                  <span className="font-semibold">{fmtTokens(tokenTotals.output)}</span>
                </span>
                <span className="tabular-nums">
                  <span className="text-muted-foreground">{labels.tokensCacheRead} </span>
                  <span className="font-semibold">{fmtTokens(tokenTotals.cacheRead)}</span>
                </span>
                <span className="tabular-nums">
                  <span className="text-muted-foreground">{labels.tokensHitRate} </span>
                  <span className="font-semibold text-emerald-500">
                    {cacheHitRate(tokenTotals.cacheRead, tokenTotals.input)}
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs">
                      <th className="py-1.5 pr-3 font-medium">{labels.thModel}</th>
                      <th className="py-1.5 pr-3 text-right font-medium">{labels.thCalls}</th>
                      <th className="py-1.5 pr-3 text-right font-medium">{labels.thInput}</th>
                      <th className="py-1.5 pr-3 text-right font-medium">{labels.thOutput}</th>
                      <th className="py-1.5 pr-3 text-right font-medium">{labels.thCacheRead}</th>
                      <th className="py-1.5 text-right font-medium">{labels.thHitRate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelTokens.map((m) => (
                      <tr key={m.model} className="border-b last:border-0">
                        <td className="max-w-[16rem] truncate py-1.5 pr-3 font-mono text-xs" title={m.model}>
                          {m.model}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{m.calls}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmtTokens(m.input_tokens)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmtTokens(m.output_tokens)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmtTokens(m.cache_read_tokens)}</td>
                        <td className="py-1.5 text-right tabular-nums text-emerald-500">
                          {cacheHitRate(m.cache_read_tokens, m.input_tokens)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{labels.noTokens}</p>
          )}
        </CardContent>
      </Card>

      {/* Scope */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheckIcon className="size-4 text-emerald-500" /> {labels.scopeTitle}
            <span className="text-muted-foreground text-xs font-normal">{labels.scopeDesc(scope.length)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              size="sm"
              value={scopeKind}
              onChange={(e) => setScopeKind(e.target.value as TaskScopeRow["kind"])}
            >
              <NativeSelectOption value="root_domain">{scopeKindLabels.root_domain}</NativeSelectOption>
              <NativeSelectOption value="subdomain">{scopeKindLabels.subdomain}</NativeSelectOption>
              <NativeSelectOption value="ip">IP</NativeSelectOption>
              <NativeSelectOption value="cidr">{scopeKindLabels.cidr}</NativeSelectOption>
              <NativeSelectOption value="icp">{scopeKindLabels.icp}</NativeSelectOption>
              <NativeSelectOption value="keyword">{scopeKindLabels.keyword}</NativeSelectOption>
              <NativeSelectOption value="company">{scopeKindLabels.company}</NativeSelectOption>
            </NativeSelect>
            <Input
              className="h-7 w-56 text-sm"
              placeholder={
                scopeKind === "company"
                  ? "example-company"
                  : scopeKind === "ip" || scopeKind === "cidr"
                    ? "10.0.0.1 or 10.0.0.0/24"
                    : "example.com"
              }
              value={scopeValueInput}
              onChange={(e) => setScopeValueInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addScope();
              }}
              disabled={scopeBusy}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={scopeBusy || !scopeValueInput.trim()}
              onClick={() => void addScope()}
            >
              <PlusIcon className="size-3.5" /> {labels.addBtn}
            </Button>
            {scopeErr && <span className="text-xs text-red-500">{scopeErr}</span>}
          </div>

          {scope.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {scope.map((row) => (
                <div key={row.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                  <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                    {scopeKindLabels[row.kind]}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {scopeValue(row, labels.companyFallback)}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">{scopeSourceLabels[row.source]}</span>
                  {row.task_id.toString() === taskId ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-1.5"
                      onClick={() => void removeScope(row)}
                    >
                      <Trash2Icon className="size-3.5 text-red-500" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground shrink-0 text-xs">{labels.inherited}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{labels.noScope}</p>
          )}
        </CardContent>
      </Card>

      {/* Heartbeat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="size-4 text-blue-500" /> {labels.heartbeatTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">{labels.engineState}</div>
            <StatusBadge
              domain="engine"
              value={stats?.engine_mode ?? task?.engine_mode ?? "idle"}
              dot
              className="mt-1"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{labels.activeWorkers}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{running.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{labels.lastActivity}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-sm">
              <ClockIcon className="size-3.5" />
              {task?.last_activity ? new Date(task.last_activity).toLocaleTimeString(labels.dateTimeLocale) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {labels.goalsCounter(task?.goals_met ?? 0, task?.goals_total ?? 0)}
            </div>
            <Progress value={goalsPct} className="mt-2" />
          </div>
          {task?.completed_unix && task.completed_unix > 0 ? (
            <div>
              <div className="text-xs text-muted-foreground">{labels.completedAt}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-sm">
                <ClockIcon className="size-3.5" />
                {new Date(task.completed_unix * 1000).toLocaleString(labels.dateTimeLocale)}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Work set */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TargetIcon className="size-4" /> {labels.inFlightIntents}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {running.slice(0, 6).map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <StatusBadge domain="intent" value={i.state} />
                <span className="min-w-0 flex-1 truncate">{i.payload}</span>
              </div>
            ))}
            {running.length === 0 && <p className="text-sm text-muted-foreground">{labels.noInFlight}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangleIcon className="size-4 text-amber-500" /> {labels.requiresAttention}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-2xl font-semibold tabular-nums text-red-600">{taskFindings.length}</div>
              <div className="text-xs text-muted-foreground">{labels.confirmedFindings}</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-blue-600">{running.length}</div>
              <div className="text-xs text-muted-foreground">{labels.executing}</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">{open.length}</div>
              <div className="text-xs text-muted-foreground">{labels.frontierPending}</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-red-600">{blocked.length}</div>
              <div className="text-xs text-muted-foreground">{labels.blockedIntents}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BugIcon className="size-4 text-red-500" /> {labels.recentFindings}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {taskFindings.slice(0, 6).map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-sm">
                <StatusBadge domain="severity" value={f.severity} dot />
                <span className="min-w-0 flex-1 truncate">{f.summary}</span>
              </div>
            ))}
            {taskFindings.length === 0 && <p className="text-sm text-muted-foreground">{labels.noFindingsYet}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Blocked intents */}
      {blocked.length > 0 && (
        <Card className="border-red-500/30">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangleIcon className="size-4 text-red-500" /> {labels.blockedCardTitle}
              <span className="text-xs font-normal text-muted-foreground">
                {labels.blockedCardDesc(blocked.length)}
              </span>
            </CardTitle>
            <Button size="sm" variant="outline" disabled={rerunning.has("__all__")} onClick={() => void rerunAll()}>
              <RefreshCwIcon className={`size-3.5 ${rerunning.has("__all__") ? "animate-spin" : ""}`} />
              {labels.rerunAll}
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {blocked.slice(0, 20).map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <StatusBadge domain="intent" value={i.state} />
                <span className="min-w-0 flex-1 truncate">{i.payload}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 px-2 text-xs"
                  disabled={rerunning.has(i.id)}
                  onClick={() => void rerunOne(i.id)}
                >
                  <RefreshCwIcon className={`size-3 ${rerunning.has(i.id) ? "animate-spin" : ""}`} />
                  {labels.rerun}
                </Button>
              </div>
            ))}
            {blocked.length > 20 && (
              <p className="text-xs text-muted-foreground">{labels.showingFirst20(blocked.length - 20)}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={labels.statPending} value={open.length} icon={ShieldCheckIcon} sub={labels.statPendingSub} />
        <StatCard
          label={labels.statConfirmed}
          value={taskFindings.length}
          icon={BugIcon}
          sub={labels.statConfirmedSub}
        />
        <StatCard label={labels.statTotal} value={intents.length} icon={AlertTriangleIcon} sub={labels.statTotalSub} />
      </div>
    </div>
  );
}

function getTaskRuleKindOptions(locale: string): { value: AssetInterceptKind; label: string; placeholder: string }[] {
  const isPt = locale === "pt";
  const isZh = locale === "zh";

  return [
    {
      value: "exact_domain",
      label: isPt ? "Domínio (exato)" : isZh ? "域名(全等)" : "Domain (exact)",
      placeholder: "example.com",
    },
    { value: "exact_ip", label: isPt ? "IP (exato)" : isZh ? "IP(全等)" : "IP (exact)", placeholder: "203.0.113.10" },
    {
      value: "exact_url",
      label: isPt ? "URL (exata)" : isZh ? "URL(全等)" : "URL (exact)",
      placeholder: "https://example.com/login",
    },
    {
      value: "fuzzy_domain",
      label: isPt ? "Domínio (coringa)" : isZh ? "域名(模糊)" : "Domain (wildcard)",
      placeholder: ".gov.br",
    },
    { value: "fuzzy_ip", label: isPt ? "IP (prefixo)" : isZh ? "IP(模糊)" : "IP (prefix)", placeholder: "203.0.113." },
    { value: "fuzzy_url", label: isPt ? "URL (parcial)" : isZh ? "URL(模糊)" : "URL (partial)", placeholder: "/admin" },
    { value: "cidr", label: isPt ? "Faixa CIDR" : isZh ? "CIDR 网段" : "CIDR Subnet", placeholder: "192.168.0.0/16" },
  ];
}

function TaskInterceptRulesCard({ taskId, locale }: { taskId: string; locale: string }) {
  const [rules, setRules] = React.useState<AssetInterceptRule[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [newAction, setNewAction] = React.useState<"block" | "allow">("block");
  const [newKind, setNewKind] = React.useState<AssetInterceptKind>("fuzzy_domain");
  const [newPattern, setNewPattern] = React.useState("");
  const [newNote, setNewNote] = React.useState("");
  const [editId, setEditId] = React.useState<number | null>(null);
  const [editAction, setEditAction] = React.useState<"block" | "allow">("block");
  const [editKind, setEditKind] = React.useState<AssetInterceptKind>("fuzzy_domain");
  const [editPattern, setEditPattern] = React.useState("");
  const [editNote, setEditNote] = React.useState("");

  const kindOptions = React.useMemo(() => getTaskRuleKindOptions(locale), [locale]);
  const kindLabel = React.useMemo(
    () => Object.fromEntries(kindOptions.map((o) => [o.value, o.label])) as Record<AssetInterceptKind, string>,
    [kindOptions],
  );

  const labels = React.useMemo(() => {
    switch (locale) {
      case "pt":
        return {
          title: "Interceptação & Lista de Permissões de Ativos",
          desc: (count: number) => `(Válido apenas nesta tarefa; bloqueio prioritário, ${count} no total)`,
          block: "Bloquear",
          allow: "Permitir",
          notePlaceholder: "Nota (opcional)",
          addBtn: "Adicionar",
          emptyRules:
            "Nenhuma regra no nível da tarefa configurada. 'Bloquear' impede o teste; 'Permitir' atua como lista de permissões restrita.",
        };
      case "zh":
        return {
          title: "任务级资产拦截 / 允许",
          desc: (count: number) => `（仅本任务生效，不进全局；先拦截后允许，共 ${count} 条）`,
          block: "拦截",
          allow: "允许",
          notePlaceholder: "备注(可选)",
          addBtn: "添加",
          emptyRules:
            "暂无任务级规则。「拦截」命中即禁止测试；「允许」为白名单——配置后本任务只允许命中允许规则的资产（未配置则不启用白名单）。",
        };
      default:
        return {
          title: "Task Asset Intercept & Whitelist",
          desc: (count: number) => `(Applies to this task only; block prioritized before allow, ${count} total)`,
          block: "Block",
          allow: "Allow",
          notePlaceholder: "Note (optional)",
          addBtn: "Add",
          emptyRules:
            "No task-level intercept rules configured. 'Block' prevents testing; 'Allow' acts as a strict whitelist.",
        };
    }
  }, [locale]);

  const load = React.useCallback(async () => {
    try {
      setRules(await api.taskInterceptRules(taskId));
    } catch {
      // ignore
    }
  }, [taskId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!newPattern.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await api.createTaskInterceptRule(taskId, {
        action: newAction,
        kind: newKind,
        pattern: newPattern.trim(),
        note: newNote.trim(),
        enabled: true,
      });
      setNewPattern("");
      setNewNote("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(r: AssetInterceptRule) {
    setEditId(r.id);
    setEditAction(r.action ?? "block");
    setEditKind(r.kind);
    setEditPattern(r.pattern);
    setEditNote(r.note);
    setErr("");
  }

  async function saveEdit(r: AssetInterceptRule) {
    if (!editPattern.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await api.updateTaskInterceptRule(taskId, r.id, {
        action: editAction,
        kind: editKind,
        pattern: editPattern.trim(),
        note: editNote.trim(),
        enabled: r.enabled,
      });
      setEditId(null);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: AssetInterceptRule) {
    setRules((prev) => prev.filter((x) => x.id !== r.id));
    try {
      await api.deleteTaskInterceptRule(taskId, r.id);
    } catch {
      await load();
    }
  }

  async function toggle(r: AssetInterceptRule) {
    setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)));
    try {
      await api.toggleTaskInterceptRule(taskId, r.id, !r.enabled);
    } catch {
      await load();
    }
  }

  const placeholder = kindOptions.find((o) => o.value === newKind)?.placeholder ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheckIcon className="size-4 text-sky-500" /> {labels.title}
          <span className="text-muted-foreground text-xs font-normal">{labels.desc(rules.length)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect size="sm" value={newAction} onChange={(e) => setNewAction(e.target.value as "block" | "allow")}>
            <NativeSelectOption value="block">{labels.block}</NativeSelectOption>
            <NativeSelectOption value="allow">{labels.allow}</NativeSelectOption>
          </NativeSelect>
          <NativeSelect size="sm" value={newKind} onChange={(e) => setNewKind(e.target.value as AssetInterceptKind)}>
            {kindOptions.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input
            className="h-7 min-w-56 flex-1 text-sm"
            placeholder={placeholder}
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
            disabled={busy}
          />
          <Input
            className="h-7 w-36 text-sm"
            placeholder={labels.notePlaceholder}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            disabled={busy}
          />
          <Button size="sm" variant="outline" disabled={busy || !newPattern.trim()} onClick={() => void add()}>
            <PlusIcon className="size-3.5" /> {labels.addBtn}
          </Button>
          {err && <span className="text-xs text-red-500">{err}</span>}
        </div>

        {rules.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {rules.map((r) =>
              editId === r.id ? (
                <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5">
                  <NativeSelect
                    size="sm"
                    value={editAction}
                    onChange={(e) => setEditAction(e.target.value as "block" | "allow")}
                  >
                    <NativeSelectOption value="block">{labels.block}</NativeSelectOption>
                    <NativeSelectOption value="allow">{labels.allow}</NativeSelectOption>
                  </NativeSelect>
                  <NativeSelect
                    size="sm"
                    value={editKind}
                    onChange={(e) => setEditKind(e.target.value as AssetInterceptKind)}
                  >
                    {kindOptions.map((o) => (
                      <NativeSelectOption key={o.value} value={o.value}>
                        {o.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Input
                    className="h-7 min-w-56 flex-1 text-sm"
                    value={editPattern}
                    onChange={(e) => setEditPattern(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveEdit(r);
                      if (e.key === "Escape") setEditId(null);
                    }}
                    disabled={busy}
                    autoFocus
                  />
                  <Input
                    className="h-7 w-36 text-sm"
                    placeholder={labels.notePlaceholder}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    disabled={busy}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 shrink-0 px-1.5"
                    disabled={busy || !editPattern.trim()}
                    onClick={() => void saveEdit(r)}
                  >
                    <CheckIcon className="size-3.5 text-emerald-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 shrink-0 px-1.5"
                    disabled={busy}
                    onClick={() => setEditId(null)}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div key={r.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                      r.action === "allow"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {r.action === "allow" ? labels.allow : labels.block}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">{kindLabel[r.kind]}</span>
                  <code className="bg-muted min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-xs">{r.pattern}</code>
                  {r.note && (
                    <span className="text-muted-foreground max-w-[120px] shrink-0 truncate text-xs">{r.note}</span>
                  )}
                  <Switch checked={r.enabled} onCheckedChange={() => void toggle(r)} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 shrink-0 px-1.5"
                    disabled={busy}
                    onClick={() => startEdit(r)}
                  >
                    <PencilIcon className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 shrink-0 px-1.5"
                    disabled={busy}
                    onClick={() => void remove(r)}
                  >
                    <Trash2Icon className="size-3.5 text-red-500" />
                  </Button>
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{labels.emptyRules}</p>
        )}
      </CardContent>
    </Card>
  );
}
