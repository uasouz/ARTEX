"use client";

import * as React from "react";

import { BotIcon, ListFilterIcon, PencilIcon, PlusIcon, ShieldAlertIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type {
  InterceptAction,
  InterceptRule,
  JudgeConfig,
  JudgeDayUsage,
  JudgeUsage,
  LLMProfile,
  Tool,
} from "@/lib/types";

const I18N = {
  en: {
    title: "Command Interception",
    desc: "Match tool execution against interception rules before execution; unhandled commands fall back to AI model evaluation.",
    scopeTitle: "Interception Scope",
    scopeEmpty: "No tools enabled — interception rules and AI judge will not apply",
    toolsUnit: "tools",
    adjustScope: "Adjust Scope",
    rulesTab: "Interception Rules",
    judgeTab: "Model Configuration",
    priorityHint: "Evaluated in descending order of priority; the first matched rule takes effect.",
    newRule: "New Rule",
    loading: "Loading...",
    noRules: "No rules configured",
    createFirstRule: "Create First Rule",
    colPriority: "Priority",
    colName: "Name",
    colTarget: "Target",
    colType: "Type",
    colPattern: "Pattern",
    colAction: "Action",
    colEnabled: "Enabled",
    targetToolName: "Tool Name",
    targetToolInput: "Input Content",
    typeRegex: "Regex",
    typeString: "String",
    actionAllow: "Allow",
    actionDeny: "Deny",
    actionAsk: "Request",
    editRule: "Edit Rule",
    priorityDesc: "Higher numbers match first; the first matched rule takes effect, subsequent rules are skipped.",
    nameLabel: "Name",
    namePlaceholder: "Enter rule name",
    priorityLabel: "Priority (higher evaluated first)",
    matchTargetLabel: "Match Target",
    targetToolNameOption: "Tool Name (tool_name)",
    targetToolInputOption: "Input Content (tool_input JSON)",
    matchTypeLabel: "Match Type",
    typeStringOption: "Substring Match",
    typeRegexOption: "Regular Expression",
    patternLabel: "Pattern",
    regexInvalid: "Invalid regular expression syntax",
    regexGoWarn: "Contains Go RE2 syntax (e.g. (?i)); preview unavailable in browser, verified by backend.",
    actionLabel: "Action Policy",
    actionAllowOption: "Allow — execute directly, skip remaining rules",
    actionDenyOption: "Deny — block execution, return rejection to model",
    actionAskOption: "Request User Approval — pause for review",
    denyMsgLabel: "Rejection Message (returned to model)",
    askMsgLabel: "Approval Note (optional)",
    denyPlaceholder: "Operation blocked by security policy",
    enableTimeout: "Enable Approval Timeout",
    timeoutDesc: "Automatically resolve after timeout without indefinite waiting",
    timeoutSec: "Timeout (seconds)",
    timeoutAction: "Timeout Action",
    autoDeny: "Auto Deny",
    autoAllow: "Auto Allow",
    enableThisRule: "Enable this rule",
    cancel: "Cancel",
    saving: "Saving...",
    save: "Save",
    nameEmptyErr: "Name cannot be empty",
    patternEmptyErr: "Pattern cannot be empty",
    ruleUpdated: "Rule updated successfully",
    ruleCreated: "Rule created successfully",
    ruleDeleted: "Rule deleted",
    scopeDialogTitle: "Interception Scope",
    scopeDialogDesc: "Only enabled tools enter rule evaluation; unmonitored tools execute directly.",
    scopeSaved: "Interception scope saved",
    loadFailed: "Failed to load",
    loadRulesFailed: "Failed to load interception rules",
    groupExec: "Execution",
    groupWrite: "Write / Edit",
    groupSystem: "System Tools",
    groupCustom: "Custom Tools",
    bashDesc: "Execute commands inside shell environment",
    webFetchDesc: "Make HTTP/HTTPS requests (with proxy support)",
    webSearchDesc: "Web search query",
    shellOpenDesc: "Open persistent PTY interactive session",
    shellSendDesc: "Send input to interactive session",
    shellReadDesc: "Read output from interactive session",
    shellCloseDesc: "Close interactive session",
    shellListDesc: "List all active interactive sessions",
    writeDesc: "Write file content",
    editDesc: "Edit file (exact replacement)",
    multiEditDesc: "Batch file editing",
    judgeTitle: "AI Model Judge",
    judgeDesc:
      "Commands within the interception scope that match no specific rules are evaluated semantically by the judge model (allow / human review / block).",
    enabledText: "Enabled",
    disabledText: "Disabled",
    tokenUsageTitle: "Judge Token Consumption",
    tokenUsageDesc:
      "Cumulative tokens used by the AI fallback judge (worker=judge), isolated from agent execution metrics.",
    refresh: "Refresh",
    statCalls: "Judge Calls",
    statInput: "Input Tokens",
    statOutput: "Output Tokens",
    statCacheRead: "Cache Read",
    statCacheWrite: "Cache Write",
    last30Days: "Last 30 days consumption (Input + Output)",
    callsUnit: "calls",
    promptTitle: "Judge Prompt",
    promptDesc: "The AI evaluates ALLOW / ASK / DENY based on this prompt. Directly editable.",
    restoreDefaultPrompt: "Reset to Default Template",
    promptPlaceholder: "Leave blank to use built-in template",
    characters: "chars",
    judgeParams: "Judge Model & Policy",
    judgeModelLabel: "Judge Model",
    followActive: "Follow Active Agent Profile",
    judgeTimeoutLabel: "Judge Timeout (seconds)",
    failActionLabel: "On Judge Failure (error / timeout / parse error)",
    humanApprovalTitle: "Human Review (when model yields ASK)",
    askTimeoutLabel: "Approval Wait Timeout (seconds)",
    askTimeoutActionLabel: "Default Action After Timeout",
    saveConfig: "Save Configuration",
    configSaved: "Judge configuration saved",
    promptReset: "Default template restored",
    loadJudgeFailed: "Failed to load judge configuration: ",
    saveFailed: "Failed to save: ",
    restoreFailed: "Failed to restore: ",
  },
  pt: {
    title: "Interceptação de Comandos",
    desc: "Valide a execução de ferramentas com regras de segurança antes da execução; comandos sem correspondência passam por julgamento de IA.",
    scopeTitle: "Escopo de Interceptação",
    scopeEmpty: "Nenhuma ferramenta habilitada — regras de interceptação e juiz de IA não terão efeito",
    toolsUnit: "ferramentas",
    adjustScope: "Ajustar Escopo",
    rulesTab: "Regras de Interceptação",
    judgeTab: "Configuração do Modelo",
    priorityHint: "Avaliadas por ordem decrescente de prioridade; a primeira regra correspondente entra em vigor.",
    newRule: "Nova Regra",
    loading: "Carregando...",
    noRules: "Nenhuma regra configurada",
    createFirstRule: "Criar Primeira Regra",
    colPriority: "Prioridade",
    colName: "Nome",
    colTarget: "Alvo",
    colType: "Tipo",
    colPattern: "Padrão",
    colAction: "Ação",
    colEnabled: "Ativo",
    targetToolName: "Nome da Ferramenta",
    targetToolInput: "Conteúdo de Entrada",
    typeRegex: "Regex",
    typeString: "String",
    actionAllow: "Permitir",
    actionDeny: "Bloquear",
    actionAsk: "Solicitar",
    editRule: "Editar Regra",
    priorityDesc:
      "Prioridade maior avaliada primeiro; a primeira correspondência tem efeito e as demais são ignoradas.",
    nameLabel: "Nome",
    namePlaceholder: "Dê um nome à regra",
    priorityLabel: "Prioridade (maior avaliada primeiro)",
    matchTargetLabel: "Alvo de Correspondência",
    targetToolNameOption: "Nome da ferramenta (tool_name)",
    targetToolInputOption: "Conteúdo de entrada (JSON tool_input)",
    matchTypeLabel: "Tipo de Correspondência",
    typeStringOption: "Contém texto",
    typeRegexOption: "Expressão Regular",
    patternLabel: "Padrão",
    regexInvalid: "Sintaxe de expressão regular inválida",
    regexGoWarn: "Contém sintaxe Go RE2 (ex: (?i)); não verificável no navegador, validado pelo servidor.",
    actionLabel: "Política de Ação",
    actionAllowOption: "Permitir — executar diretamente, ignorar regras subsequentes",
    actionDenyOption: "Bloquear — interromper execução, retornar rejeição ao modelo",
    actionAskOption: "Solicitar Aprovação do Usuário — aguardar aprovação",
    denyMsgLabel: "Mensagem de Recusa (retornada ao modelo)",
    askMsgLabel: "Observação para Aprovação (opcional)",
    denyPlaceholder: "Operação bloqueada pela política de segurança",
    enableTimeout: "Habilitar Tempo Limite de Aprovação",
    timeoutDesc: "Resolução automática após o tempo limite sem espera indefinida",
    timeoutSec: "Tempo Limite (segundos)",
    timeoutAction: "Ação após Tempo Limite",
    autoDeny: "Bloqueio Automático",
    autoAllow: "Permissão Automática",
    enableThisRule: "Ativar esta regra",
    cancel: "Cancelar",
    saving: "Salvando...",
    save: "Salvar",
    nameEmptyErr: "O nome não pode estar vazio",
    patternEmptyErr: "O padrão não pode estar vazio",
    ruleUpdated: "Regra atualizada com sucesso",
    ruleCreated: "Regra criada com sucesso",
    ruleDeleted: "Regra excluída",
    scopeDialogTitle: "Escopo de Interceptação",
    scopeDialogDesc:
      "Apenas ferramentas habilitadas passam pelas regras; outras ferramentas são liberadas diretamente.",
    scopeSaved: "Escopo de interceptação salvo",
    loadFailed: "Falha ao carregar",
    loadRulesFailed: "Falha ao carregar regras de interceptação",
    groupExec: "Execução",
    groupWrite: "Escrita / Edição",
    groupSystem: "Ferramentas do Sistema",
    groupCustom: "Ferramentas Personalizadas",
    bashDesc: "Executar comandos no ambiente shell",
    webFetchDesc: "Fazer requisições HTTP/HTTPS (com suporte a proxy)",
    webSearchDesc: "Busca na web",
    shellOpenDesc: "Abrir sessão interativa PTY persistente",
    shellSendDesc: "Enviar entrada para sessão interativa",
    shellReadDesc: "Ler saída de sessão interativa",
    shellCloseDesc: "Fechar sessão interativa",
    shellListDesc: "Listar todas as sessões interativas ativas",
    writeDesc: "Gravar conteúdo de arquivo",
    editDesc: "Editar arquivo (substituição exata)",
    multiEditDesc: "Edição em lote de arquivos",
    judgeTitle: "Juiz de Modelo IA",
    judgeDesc:
      "Comandos no escopo de interceptação que não correspondam a regras específicas são avaliados semanticamente pelo modelo (permitir / revisão humana / bloquear).",
    enabledText: "Ativado",
    disabledText: "Desativado",
    tokenUsageTitle: "Consumo de Tokens do Juiz",
    tokenUsageDesc: "Tokens cumulativos consumidos pelo juiz de IA (worker=judge), isolados das métricas dos agentes.",
    refresh: "Atualizar",
    statCalls: "Chamadas do Juiz",
    statInput: "Tokens de Entrada",
    statOutput: "Tokens de Saída",
    statCacheRead: "Leitura de Cache",
    statCacheWrite: "Escrita de Cache",
    last30Days: "Consumo dos últimos 30 dias (Entrada + Saída)",
    callsUnit: "chamadas",
    promptTitle: "Prompt do Juiz",
    promptDesc: "O modelo avalia ALLOW / ASK / DENY com base neste prompt. Diretamente editável.",
    restoreDefaultPrompt: "Restaurar Modelo Padrão",
    promptPlaceholder: "Deixe em branco para usar o modelo integrado",
    characters: "caracteres",
    judgeParams: "Modelo e Políticas do Juiz",
    judgeModelLabel: "Modelo Juiz",
    followActive: "Seguir Perfil Ativo do Agente",
    judgeTimeoutLabel: "Tempo Limite do Julgamento (segundos)",
    failActionLabel: "Em caso de Falha do Juiz (erro / timeout / parsing)",
    humanApprovalTitle: "Aprovação Humana (quando modelo indicar ASK)",
    askTimeoutLabel: "Tempo Limite de Espera para Aprovação (segundos)",
    askTimeoutActionLabel: "Ação Padrão após Tempo Limite",
    saveConfig: "Salvar Configuração",
    configSaved: "Configuração do juiz salva",
    promptReset: "Modelo padrão restaurado",
    loadJudgeFailed: "Falha ao carregar configuração do juiz: ",
    saveFailed: "Falha ao salvar: ",
    restoreFailed: "Falha ao restaurar: ",
  },
  zh: {
    title: "命令拦截",
    desc: "工具执行前先按拦截规则匹配；未命中的命令可交由模型兜底判定",
    scopeTitle: "拦截范围",
    scopeEmpty: "未启用任何工具 — 拦截规则与模型兜底均不会生效",
    toolsUnit: "个工具",
    adjustScope: "调整范围",
    rulesTab: "拦截规则",
    judgeTab: "模型配置",
    priorityHint: "按优先级（数字越大越先）逐条匹配，首条命中的规则生效",
    newRule: "新建规则",
    loading: "加载中…",
    noRules: "暂无规则",
    createFirstRule: "新建第一条规则",
    colPriority: "优先级",
    colName: "名称",
    colTarget: "目标",
    colType: "类型",
    colPattern: "模式",
    colAction: "策略",
    colEnabled: "启用",
    targetToolName: "工具名",
    targetToolInput: "输入内容",
    typeRegex: "正则",
    typeString: "字符串",
    actionAllow: "允许",
    actionDeny: "禁止",
    actionAsk: "申请",
    editRule: "编辑规则",
    priorityDesc: "优先级越大越先匹配；首条命中规则生效，后续跳过",
    nameLabel: "名称",
    namePlaceholder: "给规则起个名字",
    priorityLabel: "优先级（数字越大越先匹配）",
    matchTargetLabel: "匹配目标",
    targetToolNameOption: "工具名（tool_name）",
    targetToolInputOption: "输入内容（tool_input JSON）",
    matchTypeLabel: "匹配类型",
    typeStringOption: "字符串包含",
    typeRegexOption: "正则表达式",
    patternLabel: "模式",
    regexInvalid: "正则表达式语法无效",
    regexGoWarn: "包含 Go RE2 扩展语法（如 (?i)），浏览器无法预览，提交后由服务端验证",
    actionLabel: "拦截策略",
    actionAllowOption: "允许 — 直接放行，跳过后续规则",
    actionDenyOption: "禁止 — 阻断，返回拒绝消息给模型",
    actionAskOption: "向用户申请 — 等待审批",
    denyMsgLabel: "拒绝消息（返回给模型）",
    askMsgLabel: "审批说明（可选）",
    denyPlaceholder: "操作被安全策略阻断",
    enableTimeout: "启用审批超时",
    timeoutDesc: "超时后自动处置，不再等待",
    timeoutSec: "超时时间（秒）",
    timeoutAction: "超时动作",
    autoDeny: "自动拒绝",
    autoAllow: "自动允许",
    enableThisRule: "启用此规则",
    cancel: "取消",
    saving: "保存中…",
    save: "保存",
    nameEmptyErr: "名称不能为空",
    patternEmptyErr: "模式不能为空",
    ruleUpdated: "规则已更新",
    ruleCreated: "规则已创建",
    ruleDeleted: "规则已删除",
    scopeDialogTitle: "拦截范围",
    scopeDialogDesc: "只有启用拦截的工具才会进入规则匹配；其余工具直接放行",
    scopeSaved: "拦截范围已保存",
    loadFailed: "加载失败: ",
    loadRulesFailed: "加载拦截规则失败",
    groupExec: "执行类",
    groupWrite: "写入/编辑类",
    groupSystem: "系统工具",
    groupCustom: "自定义工具",
    bashDesc: "在 shell 中执行命令",
    webFetchDesc: "发起 HTTP/HTTPS 请求（含代理支持）",
    webSearchDesc: "网络搜索",
    shellOpenDesc: "开启持久 PTY 交互会话",
    shellSendDesc: "向交互会话发送输入",
    shellReadDesc: "读取交互会话输出",
    shellCloseDesc: "关闭交互会话",
    shellListDesc: "列出所有交互会话",
    writeDesc: "写入文件",
    editDesc: "编辑文件（精确替换）",
    multiEditDesc: "批量编辑文件",
    judgeTitle: "模型兜底审批",
    judgeDesc: "在拦截范围内、且没有任何拦截规则命中的命令，才由模型做语义判断（放行 / 转人工 / 拦截）",
    enabledText: "已启用",
    disabledText: "未启用",
    tokenUsageTitle: "审批 Token 消耗",
    tokenUsageDesc: "模型兜底审批累计用量，单独计量(worker=judge)，不与各模型配置的统计混在一起",
    refresh: "刷新",
    statCalls: "审批调用",
    statInput: "输入 Token",
    statOutput: "输出 Token",
    statCacheRead: "缓存读",
    statCacheWrite: "缓存写",
    last30Days: "近 30 天每日消耗(输入 + 输出)",
    callsUnit: "次",
    promptTitle: "审批提示词",
    promptDesc: "模型据此判定 ALLOW / ASK / DENY，可直接编辑",
    restoreDefaultPrompt: "恢复默认模板",
    promptPlaceholder: "留空使用内置模板",
    characters: "字",
    judgeParams: "判定模型与策略",
    judgeModelLabel: "审批模型",
    followActive: "跟随激活配置",
    judgeTimeoutLabel: "模型判定超时（秒）",
    failActionLabel: "模型失败时（出错 / 超时 / 无法解析）",
    humanApprovalTitle: "人工审批（模型判为「转人工」时）",
    askTimeoutLabel: "审批等待超时（秒）",
    askTimeoutActionLabel: "超时后默认动作",
    saveConfig: "保存配置",
    configSaved: "模型兜底配置已保存",
    promptReset: "已恢复内置默认模板",
    loadJudgeFailed: "加载模型兜底配置失败: ",
    saveFailed: "保存失败: ",
    restoreFailed: "恢复失败: ",
  },
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function JudgeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function JudgeSparkbars({ daily, callsUnit }: { daily: JudgeDayUsage[]; callsUnit: string }) {
  const max = Math.max(1, ...daily.map((d) => d.input_tokens + d.output_tokens));
  return (
    <div className="flex h-16 items-end gap-0.5">
      {daily.map((d) => {
        const total = d.input_tokens + d.output_tokens;
        const h = Math.max(2, Math.round((total / max) * 100));
        return (
          <div
            key={d.date}
            title={`${d.date} · ${d.calls} ${callsUnit} · ${fmtTokens(total)} tokens`}
            className="min-w-[2px] flex-1 rounded-sm bg-violet-500/60 hover:bg-violet-500"
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}

function sdkTool(key: string, description: string): Tool {
  return { key, system: true, description, schema: {}, agents: [], enabled: true, kind: "builtin" };
}

function getSdkTools(locale: "en" | "pt" | "zh") {
  const t = I18N[locale] ?? I18N.en;
  const exec: Tool[] = [
    sdkTool("Bash", t.bashDesc),
    sdkTool("WebFetch", t.webFetchDesc),
    sdkTool("web_search", t.webSearchDesc),
    sdkTool("shell_open", t.shellOpenDesc),
    sdkTool("shell_send", t.shellSendDesc),
    sdkTool("shell_read", t.shellReadDesc),
    sdkTool("shell_close", t.shellCloseDesc),
    sdkTool("shell_list", t.shellListDesc),
  ];
  const write: Tool[] = [
    sdkTool("Write", t.writeDesc),
    sdkTool("Edit", t.editDesc),
    sdkTool("MultiEdit", t.multiEditDesc),
  ];
  return { exec, write };
}

function groupTools(dbTools: Tool[], locale: "en" | "pt" | "zh") {
  const t = I18N[locale] ?? I18N.en;
  const { exec, write } = getSdkTools(locale);
  const sdkKeys = new Set([...exec, ...write].map((item) => item.key));
  const sys: Tool[] = [];
  const custom: Tool[] = [];
  for (const tool of dbTools) {
    if (sdkKeys.has(tool.key)) continue;
    if (tool.system) sys.push(tool);
    else custom.push(tool);
  }
  return [
    { label: t.groupExec, tools: exec },
    { label: t.groupWrite, tools: write },
    { label: t.groupSystem, tools: sys },
    { label: t.groupCustom, tools: custom },
  ].filter((g) => g.tools.length > 0);
}

type RuleForm = {
  name: string;
  enabled: boolean;
  priority: number;
  match_target: "tool_name" | "tool_input";
  match_type: "string" | "regex";
  pattern: string;
  action: InterceptAction;
  message: string;
  timeout_enabled: boolean;
  timeout_seconds: number;
  timeout_action: "deny" | "allow";
};

const defaultForm = (): RuleForm => ({
  name: "",
  enabled: true,
  priority: 0,
  match_target: "tool_name",
  match_type: "string",
  pattern: "",
  action: "deny",
  message: "",
  timeout_enabled: true,
  timeout_seconds: 60,
  timeout_action: "deny",
});

function ActionBadge({ action, locale }: { action: InterceptAction; locale: "en" | "pt" | "zh" }) {
  const t = I18N[locale] ?? I18N.en;
  if (action === "allow") return <Badge variant="secondary">{t.actionAllow}</Badge>;
  if (action === "deny") return <Badge variant="destructive">{t.actionDeny}</Badge>;
  return (
    <Badge variant="outline" className="border-amber-400 text-amber-600">
      {t.actionAsk}
    </Badge>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

const FOLLOW_ACTIVE = "0";

const defaultJudge = (): JudgeConfig => ({
  enabled: false,
  profile_id: 0,
  prompt: "",
  timeout_seconds: 15,
  fail_action: "allow",
  ask_timeout_seconds: 300,
  ask_timeout_action: "deny",
});

function JudgeCard({ locale }: { locale: "en" | "pt" | "zh" }) {
  const t = I18N[locale] ?? I18N.en;
  const [cfg, setCfg] = React.useState<JudgeConfig>(defaultJudge());
  const [profiles, setProfiles] = React.useState<LLMProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [usage, setUsage] = React.useState<JudgeUsage | null>(null);

  const loadUsage = React.useCallback(async () => {
    try {
      setUsage(await api.interceptJudgeUsage(30));
    } catch {
      // Ignored
    }
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [j, ps] = await Promise.all([api.interceptGetJudgeConfig(), api.llmProfiles()]);
      setCfg(j);
      setProfiles(ps);
    } catch (e) {
      toast.error(t.loadJudgeFailed + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [t.loadJudgeFailed]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (cfg.enabled) void loadUsage();
  }, [cfg.enabled, loadUsage]);

  function patch(p: Partial<JudgeConfig>) {
    setCfg((c) => ({ ...c, ...p }));
  }

  async function save() {
    setSaving(true);
    try {
      await api.interceptSetJudgeConfig(cfg);
      toast.success(t.configSaved);
      await load();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function restorePrompt() {
    setSaving(true);
    try {
      await api.interceptSetJudgeConfig({ ...cfg, prompt: "" });
      const j = await api.interceptGetJudgeConfig();
      setCfg(j);
      toast.success(t.promptReset);
    } catch (e) {
      toast.error(t.restoreFailed + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
          cfg.enabled ? "border-violet-400/50 bg-violet-50/40 dark:bg-violet-950/20" : "bg-muted/40"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <BotIcon className={`h-5 w-5 shrink-0 ${cfg.enabled ? "text-violet-600" : "text-muted-foreground"}`} />
          <div>
            <p className="text-sm font-semibold leading-tight">{t.judgeTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.judgeDesc}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">{cfg.enabled ? t.enabledText : t.disabledText}</span>
          <Switch checked={cfg.enabled} disabled={loading} onCheckedChange={(v) => patch({ enabled: v })} />
        </div>
      </div>

      {cfg.enabled && usage && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t.tokenUsageTitle}</p>
                <p className="text-xs text-muted-foreground">{t.tokenUsageDesc}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={loadUsage}>
                {t.refresh}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <JudgeStat label={t.statCalls} value={usage.calls.toLocaleString()} />
              <JudgeStat label={t.statInput} value={fmtTokens(usage.input_tokens)} />
              <JudgeStat label={t.statOutput} value={fmtTokens(usage.output_tokens)} />
              <JudgeStat label={t.statCacheRead} value={fmtTokens(usage.cache_read_tokens)} />
              <JudgeStat label={t.statCacheWrite} value={fmtTokens(usage.cache_write_tokens)} />
            </div>
            {usage.daily.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{t.last30Days}</p>
                <JudgeSparkbars daily={usage.daily} callsUnit={t.callsUnit} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {cfg.enabled && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardContent className="flex h-full flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.promptTitle}</p>
                  <p className="text-xs text-muted-foreground">{t.promptDesc}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={restorePrompt} disabled={saving}>
                  {t.restoreDefaultPrompt}
                </Button>
              </div>
              <Textarea
                className="min-h-[22rem] flex-1 resize-none font-mono text-xs leading-relaxed"
                value={cfg.prompt}
                onChange={(e) => patch({ prompt: e.target.value })}
                placeholder={t.promptPlaceholder}
                spellCheck={false}
              />
              <p className="text-right text-[11px] text-muted-foreground">
                {cfg.prompt.length} {t.characters}
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="space-y-5 p-4">
              <div className="space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.judgeParams}
                </p>
                <Field label={t.judgeModelLabel}>
                  <Select value={String(cfg.profile_id || 0)} onValueChange={(v) => patch({ profile_id: Number(v) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FOLLOW_ACTIVE}>{t.followActive}</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t.judgeTimeoutLabel}>
                  <Input
                    type="number"
                    min={1}
                    value={cfg.timeout_seconds}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (n > 0) patch({ timeout_seconds: n });
                    }}
                  />
                </Field>
                <Field label={t.failActionLabel}>
                  <Select
                    value={cfg.fail_action}
                    onValueChange={(v) => patch({ fail_action: v as JudgeConfig["fail_action"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">{t.actionAllow}</SelectItem>
                      <SelectItem value="ask">{t.actionAsk}</SelectItem>
                      <SelectItem value="deny">{t.actionDeny}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.humanApprovalTitle}
                </p>
                <Field label={t.askTimeoutLabel}>
                  <Input
                    type="number"
                    min={5}
                    value={cfg.ask_timeout_seconds}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (n > 0) patch({ ask_timeout_seconds: n });
                    }}
                  />
                </Field>
                <Field label={t.askTimeoutActionLabel}>
                  <Select
                    value={cfg.ask_timeout_action}
                    onValueChange={(v) => patch({ ask_timeout_action: v as JudgeConfig["ask_timeout_action"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deny">{t.autoDeny}</SelectItem>
                      <SelectItem value="allow">{t.autoAllow}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving || loading}>
          {saving ? t.saving : t.saveConfig}
        </Button>
      </div>
    </div>
  );
}

export default function InterceptPage() {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [rules, setRules] = React.useState<InterceptRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<InterceptRule | null>(null);
  const [form, setForm] = React.useState<RuleForm>(defaultForm());
  const [saving, setSaving] = React.useState(false);
  const [regexErr, setRegexErr] = React.useState("");
  const [regexWarn, setRegexWarn] = React.useState(false);

  const [scopeOpen, setScopeOpen] = React.useState(false);
  const [allTools, setAllTools] = React.useState<Tool[]>([]);
  const [enabledTools, setEnabledTools] = React.useState<Set<string>>(new Set());
  const [scopeLoading, setScopeLoading] = React.useState(false);
  const [scopeSaving, setScopeSaving] = React.useState(false);
  const [scopeTools, setScopeTools] = React.useState<string[]>([]);

  const loadScope = React.useCallback(async () => {
    try {
      const cfg = await api.interceptGetToolConfig();
      setScopeTools(cfg.enabled_tools);
    } catch {
      // Ignored
    }
  }, []);

  const load = React.useCallback(async () => {
    try {
      const r = await api.interceptRules();
      setRules(r);
    } catch {
      toast.error(t.loadRulesFailed);
    } finally {
      setLoading(false);
    }
  }, [t.loadRulesFailed]);

  React.useEffect(() => {
    void load();
    void loadScope();
  }, [load, loadScope]);

  React.useEffect(() => {
    if (form.match_type !== "regex" || !form.pattern) {
      setRegexErr("");
      setRegexWarn(false);
      return;
    }
    try {
      new RegExp(form.pattern);
      setRegexErr("");
      setRegexWarn(false);
    } catch {
      setRegexErr("");
      setRegexWarn(true);
    }
  }, [form.pattern, form.match_type]);

  function set(patch: Partial<RuleForm>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function openNew() {
    setEditing(null);
    setForm(defaultForm());
    setRegexErr("");
    setOpen(true);
  }

  function openEdit(rule: InterceptRule) {
    setEditing(rule);
    setForm({
      name: rule.name,
      enabled: rule.enabled,
      priority: rule.priority,
      match_target: rule.match_target,
      match_type: rule.match_type,
      pattern: rule.pattern,
      action: rule.action,
      message: rule.message,
      timeout_enabled: rule.timeout_enabled,
      timeout_seconds: rule.timeout_seconds,
      timeout_action: rule.timeout_action,
    });
    setRegexErr("");
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error(t.nameEmptyErr);
      return;
    }
    if (!form.pattern.trim()) {
      toast.error(t.patternEmptyErr);
      return;
    }
    if (regexErr) {
      toast.error(t.regexInvalid);
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateInterceptRule(editing.id, form);
        toast.success(t.ruleUpdated);
      } else {
        await api.createInterceptRule(form);
        toast.success(t.ruleCreated);
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteInterceptRule(id);
      toast.success(t.ruleDeleted);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleToggle(rule: InterceptRule) {
    try {
      await api.toggleInterceptRule(rule.id, !rule.enabled);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function openScope() {
    setScopeOpen(true);
    setScopeLoading(true);
    try {
      const [tools, cfg] = await Promise.all([api.tools(), api.interceptGetToolConfig()]);
      setAllTools(tools);
      setEnabledTools(new Set(cfg.enabled_tools));
    } catch (e) {
      toast.error(t.loadFailed + (e as Error).message);
    } finally {
      setScopeLoading(false);
    }
  }

  function toggleTool(key: string, val: boolean) {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (val) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function saveScope() {
    setScopeSaving(true);
    try {
      await api.interceptSetToolConfig([...enabledTools]);
      toast.success(t.scopeSaved);
      setScopeTools([...enabledTools]);
      setScopeOpen(false);
    } catch (e) {
      toast.error(t.loadFailed + (e as Error).message);
    } finally {
      setScopeSaving(false);
    }
  }

  const toolGroups = React.useMemo(() => groupTools(allTools, locale), [allTools, locale]);

  return (
    <div className="flex flex-1 flex-col gap-5 p-6">
      <div className="flex items-center gap-2.5">
        <ShieldAlertIcon className="h-5 w-5 shrink-0" />
        <div>
          <h1 className="text-lg font-semibold leading-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.desc}</p>
        </div>
      </div>

      <div
        className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 ${
          scopeTools.length === 0 ? "border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20" : "bg-muted/40"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <ListFilterIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 font-medium">{t.scopeTitle}</span>
          {scopeTools.length === 0 ? (
            <span className="text-amber-700 dark:text-amber-500">{t.scopeEmpty}</span>
          ) : (
            <>
              <Badge variant="secondary" className="shrink-0">
                {scopeTools.length} {t.toolsUnit}
              </Badge>
              <span className="truncate text-muted-foreground" title={scopeTools.join(", ")}>
                {scopeTools.join(", ")}
              </span>
            </>
          )}
        </div>
        <Button
          variant={scopeTools.length === 0 ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={openScope}
        >
          <ListFilterIcon className="h-4 w-4" />
          {t.adjustScope}
        </Button>
      </div>

      <Tabs defaultValue="rules" className="flex-1">
        <TabsList>
          <TabsTrigger value="rules">{t.rulesTab}</TabsTrigger>
          <TabsTrigger value="judge">{t.judgeTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{t.priorityHint}</p>
            <Button onClick={openNew} size="sm" className="shrink-0">
              <PlusIcon className="h-4 w-4" />
              {t.newRule}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <p className="p-6 text-sm text-muted-foreground">{t.loading}</p>
              ) : rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <ShieldAlertIcon className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{t.noRules}</p>
                  <Button size="sm" variant="outline" onClick={openNew}>
                    <PlusIcon className="h-4 w-4" />
                    {t.createFirstRule}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[72px]">{t.colPriority}</TableHead>
                      <TableHead>{t.colName}</TableHead>
                      <TableHead className="w-[90px]">{t.colTarget}</TableHead>
                      <TableHead className="w-[80px]">{t.colType}</TableHead>
                      <TableHead>{t.colPattern}</TableHead>
                      <TableHead className="w-[72px]">{t.colAction}</TableHead>
                      <TableHead className="w-[64px] text-center">{t.colEnabled}</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id} className={!rule.enabled ? "opacity-40" : ""}>
                        <TableCell>
                          <span className="font-mono text-xs tabular-nums">{rule.priority}</span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {rule.match_target === "tool_name" ? t.targetToolName : t.targetToolInput}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {rule.match_type === "regex" ? t.typeRegex : t.typeString}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <code className="block truncate rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {rule.pattern}
                          </code>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={rule.action} locale={locale} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={rule.enabled} onCheckedChange={() => handleToggle(rule)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(rule)}>
                              <PencilIcon className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(rule.id)}
                            >
                              <Trash2Icon className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="judge" className="mt-4">
          <JudgeCard locale={locale} />
        </TabsContent>
      </Tabs>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{editing ? t.editRule : t.newRule}</SheetTitle>
            <SheetDescription className="text-xs">{t.priorityDesc}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
            <Field label={t.nameLabel}>
              <Input
                placeholder={t.namePlaceholder}
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>

            <Field label={t.priorityLabel}>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => set({ priority: parseInt(e.target.value, 10) || 0 })}
              />
            </Field>

            <Separator />

            <Field label={t.matchTargetLabel}>
              <Select
                value={form.match_target}
                onValueChange={(v) => set({ match_target: v as RuleForm["match_target"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tool_name">{t.targetToolNameOption}</SelectItem>
                  <SelectItem value="tool_input">{t.targetToolInputOption}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label={t.matchTypeLabel}>
              <Select value={form.match_type} onValueChange={(v) => set({ match_type: v as RuleForm["match_type"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">{t.typeStringOption}</SelectItem>
                  <SelectItem value="regex">{t.typeRegexOption}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label={t.patternLabel}>
              <Input
                placeholder={form.match_type === "regex" ? "^Bash$" : "rm -rf"}
                value={form.pattern}
                onChange={(e) => set({ pattern: e.target.value })}
                className={regexErr ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {regexErr && <p className="text-xs text-destructive mt-1">{regexErr}</p>}
              {regexWarn && <p className="text-xs text-amber-600 mt-1">{t.regexGoWarn}</p>}
            </Field>

            <Separator />

            <Field label={t.actionLabel}>
              <Select value={form.action} onValueChange={(v) => set({ action: v as InterceptAction })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">{t.actionAllowOption}</SelectItem>
                  <SelectItem value="deny">{t.actionDenyOption}</SelectItem>
                  <SelectItem value="ask">{t.actionAskOption}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {form.action !== "allow" && (
              <Field label={form.action === "deny" ? t.denyMsgLabel : t.askMsgLabel}>
                <Textarea
                  placeholder={form.action === "deny" ? t.denyPlaceholder : ""}
                  value={form.message}
                  onChange={(e) => set({ message: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </Field>
            )}

            {form.action === "ask" && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.enableTimeout}</p>
                    <p className="text-xs text-muted-foreground">{t.timeoutDesc}</p>
                  </div>
                  <Switch checked={form.timeout_enabled} onCheckedChange={(v) => set({ timeout_enabled: v })} />
                </div>
                {form.timeout_enabled && (
                  <div className="flex items-end gap-3">
                    <Field label={t.timeoutSec}>
                      <Input
                        type="number"
                        min={5}
                        className="w-28"
                        value={form.timeout_seconds}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (n > 0) set({ timeout_seconds: n });
                        }}
                      />
                    </Field>
                    <Field label={t.timeoutAction}>
                      <Select
                        value={form.timeout_action}
                        onValueChange={(v) => set({ timeout_action: v as "deny" | "allow" })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deny">{t.autoDeny}</SelectItem>
                          <SelectItem value="allow">{t.autoAllow}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}
              </>
            )}

            <Separator />

            <div className="flex items-center gap-3">
              <Switch id="rule-enabled" checked={form.enabled} onCheckedChange={(v) => set({ enabled: v })} />
              <Label htmlFor="rule-enabled" className="cursor-pointer">
                {t.enableThisRule}
              </Label>
            </div>
          </div>

          <SheetFooter className="border-t px-6 py-4 flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving || !!regexErr}>
              {saving ? t.saving : t.save}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <DialogContent
          className="sm:max-w-lg flex flex-col overflow-hidden p-0 gap-0"
          style={{ maxHeight: "min(80vh, 560px)" }}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <ListFilterIcon className="h-4 w-4" />
              {t.scopeDialogTitle}
            </DialogTitle>
            <DialogDescription className="text-xs">{t.scopeDialogDesc}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
            {scopeLoading ? (
              <p className="text-sm text-muted-foreground py-4">{t.loading}</p>
            ) : (
              toolGroups.map((group, gi) => (
                <div key={group.label}>
                  {gi > 0 && <Separator className="mb-5" />}
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.tools.map((item) => (
                      <div key={item.key} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                        <Switch
                          id={`scope-${item.key}`}
                          checked={enabledTools.has(item.key)}
                          onCheckedChange={(v) => toggleTool(item.key, v)}
                        />
                        <Label htmlFor={`scope-${item.key}`} className="flex-1 min-w-0 cursor-pointer">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm">{item.key}</span>
                            {item.kind && item.kind !== "builtin" && (
                              <Badge variant="outline" className="px-1 py-0 text-[10px]">
                                {item.kind}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 border-t px-6 py-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setScopeOpen(false)}>
              {t.cancel}
            </Button>
            <Button size="sm" onClick={saveScope} disabled={scopeSaving || scopeLoading}>
              {scopeSaving ? t.saving : t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
