"use client";

import * as React from "react";

import {
  BotIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CopyIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { TablePagination } from "@/components/table-pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type {
  InterceptApprovalFilter,
  InterceptApprovalRow,
  InterceptAudit,
  InterceptDetail,
  InterceptPending,
  InterceptReviewInput,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const I18N = {
  en: {
    chatPrefix: "Chat #",
    taskPrefix: "Task ",
    locateAria: "Locate origin of approval #{id}: {label}",
    locateError: "Unable to locate corresponding execution",
    statusPending: "Pending",
    statusAllowed: "Allowed",
    statusDenied: "Denied",
    statusTimeout: "Timeout",
    modelDecisionBadge: "Model Decision",
    ruleDeletedOrUnrecorded: "Rule unrecorded or deleted",
    noReasonRecorded: "No reason recorded",
    copied: "Copied",
    copyFailed: "Copy failed, please select and copy manually",
    copyAria: "Copy {label}",
    unrecorded: "Unrecorded",
    truncatedContent: "Content truncated; above is the preserved fragment.",
    ctxUser: "User Message",
    ctxAssistant: "Agent Message",
    ctxToolUse: "Tool Request",
    ctxToolResult: "Tool Output",
    actAllow: "Allow",
    actAsk: "Request Human Approval",
    actDeny: "Deny",
    execNotStarted: "Not started",
    execNotExecuted: "Not executed",
    execAwaitingResult: "Allowed, awaiting execution result",
    execSucceeded: "Execution succeeded",
    execFailed: "Execution failed",
    execUnknown: "Execution result unknown",
    modelReviewContextTitle: "Model Review Context",
    modelReviewContextDesc:
      "Snapshot of input transmitted to the review model. Background context is for understanding the action; judgment relies on review policy.",
    legacyInputNotice: "This record uses legacy input format, retaining content originally transmitted.",
    currentPendingCall: "Current Call Under Review",
    bgUserMsg: "Background · User Message",
    bgWorkerIntentLegacy: "Background · Worker Intent Summary (Legacy)",
    bgUserMsgNote: "From current user message.",
    bgWorkerIntentNote: "Legacy Worker intent summary; modern review models no longer receive this content.",
    noBgMessage: "No background messages attached to this review.",
    currentTurnInputLegacy: "Current Turn Input (Legacy)",
    taskDescLegacy: "Task Description (Legacy)",
    taskGoalLegacy: "Task Goal (Legacy)",
    taskConstraintsLegacy: "Task Operational Constraints (Legacy)",
    workerIntentLegacy: "Worker Intent (Legacy)",
    workingDirectory: "Working Directory",
    noHistorySent: "No execution history or prior tool calls sent for this review.",
    historyProvidedTitle: "Historical Tool Calls Provided to Model (Legacy)",
    historyStatusSuccess: "Success",
    historyStatusFail: "Failed (may have partial side-effects)",
    historyArgs: "Historical Arguments",
    historyResult: "Historical Execution Output",
    noHistoryRecords: "No matching tool execution history provided.",
    historyTruncatedNotice: "History was limited by window; some entries truncated.",
    viewFullInputJson: "View Full Model Review Input JSON",
    modelReviewInputLabel: "Model Review Input",
    allowButton: "Allow",
    denyButton: "Deny",
    detailLoadFailed: "Failed to load details: ",
    retryDetail: "Retry Details",
    initialModelJudge: "Model Initial Judgment",
    initialRuleJudge: "Rule Initial Judgment",
    initialFallbackJudge: "Model Exception Fallback",
    toolRequestSuffix: "Tool Request",
    viewCommandContent: "View Command Content",
    commandContentLabel: "Command Content",
    executionResultLabel: "Execution Result: ",
    loadingText: "Loading...",
    reviewStatusHeader: "Review Status",
    approvalDecisionHeader: "Approval Decision",
    finalActionLabel: "Final Action: ",
    sourceLabel: "Source",
    requestedAtLabel: "Requested At",
    decidedAtLabel: "Decided At",
    ruleSnapshotLabel: "Rule Snapshot",
    judgeModelProfileLabel: "Judge Model Profile",
    noAuditAlert:
      "No audit snapshot preserved for this record; cannot restore original context, model decision, or execution output.",
    collapseContext: "Collapse Context",
    viewContextAndResult: "View Context & Execution Results",
    onlyDigestAlert:
      "Legacy record only preserved input digest fingerprint without full text; cannot restore original context. Modern records preserve full snapshots.",
    noInputAlert:
      "No review input preserved; may have been resolved directly by rules, encountered an error prior to invocation, or created in older versions.",
    viewAuditSnippetNotSent: "View Conversation Audit Snippet (not sent to model)",
    viewAuditSnippet: "View Conversation Audit Snippet",
    conversationTurnInputSnippet: "Conversation Turn Input (Audit Snippet)",
    visibleContextTitle: "Visible Conversation Context",
    visibleContextDesc:
      "Conversation record snippet captured at {time}. Actual content used by model is governed by 'Model Review Input'.",
    contextTruncatedNotice: "Only recent context preserved; partial content truncated.",
    noLinkedContext: "No correlated context recorded",
    execOutputLabel: "Execution Output",
    toolNotExecuted: "Tool not executed.",
    noExecOutputYet: "No execution output yet.",
    ambiguousCorrelationAlert:
      "Concurrent calls with identical parameters exist; unable to uniquely correlate tool invocation. Speculative results suppressed.",
    noUniqueIdAlert: "No unique tool invocation ID recorded.",
    toolUseIdLabel: "Tool Use ID: ",
    argsDigestLabel: "Argument Digest SHA-256: ",
    configDigestLabel: "Review Config Digest SHA-256: ",
    modelInputDigestLabel: "Model Input Digest SHA-256: ",
    executionEndedLabel: "Result Recorded At: ",
    expandDetailAria: "Expand details",
    colExpand: "Expand",
    colId: "#",
    colTool: "Tool",
    colSource: "Source",
    colRule: "Rule",
    colArgs: "Arguments",
    colStatus: "Status",
    colRequested: "Requested At",
    colDecided: "Decided At",
    toggleApprovalAria: "{action} approval #{id}",
    expandAction: "Expand",
    collapseAction: "Collapse",
    approvalDetailAria: "Approval Details #{id}",
    titleIntercept: "Command Interceptions",
    titleHistory: "Approval Records",
    pendingBadge: "Pending",
    refresh: "Refresh",
    headerDesc: "Expand records to review tool execution requests, decisions, contextual audit traces, and outputs.",
    filterGroupAria: "Approval Records Filter",
    filterStatusLabel: "Status",
    filterStatusAll: "All Statuses",
    filterSourceLabel: "Source",
    filterSourceAll: "All Sources",
    sourceModel: "Model Decision",
    sourceRule: "Rule Decision",
    sourceUnknown: "Unknown Source",
    clearFilters: "Clear Filters",
    recordsLoadFailed: "Failed to load records: ",
    pendingLoadFailed: "Failed to load pending queue: ",
    pendingSectionTitle: "Pending Approvals ({count})",
    pendingSectionHint: "Expand to allow or deny",
    pendingTableLabel: "Pending Approvals",
    filterResultTitle: "Filtered Records",
    allRecordsTitle: "All Records",
    emptyFilterTitle: "No approval records match filters",
    emptyAllTitle: "No approval records yet",
    emptyFilterDesc: "Adjust status/source filters or clear filters to view all records.",
    emptyAllDesc: "Records will appear here once interception rules or AI models evaluate tool execution requests.",
    recordsTableLabel: "Approval Records List",
    allowedSuccess: "Execution allowed",
    deniedSuccess: "Execution denied",
    rulePrefix: "Rule #",
  },
  pt: {
    chatPrefix: "Conversa #",
    taskPrefix: "Tarefa ",
    locateAria: "Localizar origem da aprovação #{id}: {label}",
    locateError: "Não foi possível localizar a execução correspondente",
    statusPending: "Pendente",
    statusAllowed: "Permitido",
    statusDenied: "Negado",
    statusTimeout: "Tempo Limite",
    modelDecisionBadge: "Decisão do Modelo",
    ruleDeletedOrUnrecorded: "Regra não registrada ou excluída",
    noReasonRecorded: "Nenhum motivo registrado",
    copied: "Copiado",
    copyFailed: "Falha ao copiar, selecione e copie manualmente",
    copyAria: "Copiar {label}",
    unrecorded: "Não registrado",
    truncatedContent: "Conteúdo truncado; acima está o fragmento preservado.",
    ctxUser: "Mensagem do Usuário",
    ctxAssistant: "Mensagem do Agente",
    ctxToolUse: "Requisição de Ferramenta",
    ctxToolResult: "Saída da Ferramenta",
    actAllow: "Permitir",
    actAsk: "Solicitar Aprovação Humana",
    actDeny: "Bloquear",
    execNotStarted: "Não iniciado",
    execNotExecuted: "Não executado",
    execAwaitingResult: "Permitido, aguardando resultado",
    execSucceeded: "Execução concluída com sucesso",
    execFailed: "Falha na execução",
    execUnknown: "Resultado de execução desconhecido",
    modelReviewContextTitle: "Contexto de Revisão do Modelo",
    modelReviewContextDesc:
      "Instantâneo da entrada enviada ao modelo de revisão. O contexto serve para compreender a ação; a decisão baseia-se na política de revisão.",
    legacyInputNotice: "Este registro usa o formato legado de entrada, retendo o conteúdo originalmente transmitido.",
    currentPendingCall: "Chamada Atual em Revisão",
    bgUserMsg: "Contexto · Mensagem do Usuário",
    bgWorkerIntentLegacy: "Contexto · Resumo de Intenção do Worker (Legado)",
    bgUserMsgNote: "Extraído da mensagem do usuário atual.",
    bgWorkerIntentNote: "Resumo de intenção do Worker legado; modelos modernos não recebem mais este conteúdo.",
    noBgMessage: "Nenhuma mensagem de contexto anexada a esta revisão.",
    currentTurnInputLegacy: "Entrada do Turno Atual (Legado)",
    taskDescLegacy: "Descrição da Tarefa (Legado)",
    taskGoalLegacy: "Meta da Tarefa (Legado)",
    taskConstraintsLegacy: "Restrições Operacionais da Tarefa (Legado)",
    workerIntentLegacy: "Intenção do Worker (Legado)",
    workingDirectory: "Diretório de Trabalho",
    noHistorySent: "Nenhum histórico de execução ou chamadas anteriores enviado para esta revisão.",
    historyProvidedTitle: "Chamadas Históricas de Ferramentas Fornecidas ao Modelo (Legado)",
    historyStatusSuccess: "Sucesso",
    historyStatusFail: "Falha (pode ter efeitos colaterais parciais)",
    historyArgs: "Argumentos Históricos",
    historyResult: "Saída Histórica de Execução",
    noHistoryRecords: "Nenhum histórico de execução correspondente fornecido.",
    historyTruncatedNotice: "Histórico limitado por janela; algumas entradas foram truncadas.",
    viewFullInputJson: "Ver JSON Completo de Entrada da Revisão",
    modelReviewInputLabel: "Entrada da Revisão do Modelo",
    allowButton: "Permitir",
    denyButton: "Recusar",
    detailLoadFailed: "Falha ao carregar detalhes: ",
    retryDetail: "Repetir Detalhes",
    initialModelJudge: "Decisão Inicial do Modelo",
    initialRuleJudge: "Decisão Inicial da Regra",
    initialFallbackJudge: "Fallback de Erro do Modelo",
    toolRequestSuffix: "Requisição de Ferramenta",
    viewCommandContent: "Ver Conteúdo do Comando",
    commandContentLabel: "Conteúdo do Comando",
    executionResultLabel: "Resultado da Execução: ",
    loadingText: "Carregando...",
    reviewStatusHeader: "Status da Revisão",
    approvalDecisionHeader: "Decisão de Aprovação",
    finalActionLabel: "Ação Final: ",
    sourceLabel: "Origem",
    requestedAtLabel: "Hora do Pedido",
    decidedAtLabel: "Hora da Decisão",
    ruleSnapshotLabel: "Instantâneo da Regra",
    judgeModelProfileLabel: "Perfil do Modelo Juiz",
    noAuditAlert:
      "Nenhum instantâneo de auditoria salvo; impossível restaurar o contexto original, decisão do modelo ou saída da execução.",
    collapseContext: "Recolher Contexto",
    viewContextAndResult: "Ver Contexto e Resultados da Execução",
    onlyDigestAlert:
      "Registro legado apenas preservou o resumo de impressão digital; não é possível restaurar o texto original. Registros modernos preservam instantâneos completos.",
    noInputAlert:
      "Nenhuma entrada de revisão preservada; pode ter sido decidida diretamente por regras ou gerada em versões legadas.",
    viewAuditSnippetNotSent: "Ver Trecho de Auditoria da Sessão (não enviado ao modelo)",
    viewAuditSnippet: "Ver Trecho de Auditoria da Sessão",
    conversationTurnInputSnippet: "Entrada do Turno da Sessão (Trecho de Auditoria)",
    visibleContextTitle: "Contexto Visível da Sessão",
    visibleContextDesc:
      "Trecho da sessão capturado em {time}. O conteúdo real usado pelo modelo é governado pela 'Entrada da Revisão do Modelo'.",
    contextTruncatedNotice: "Apenas contexto recente preservado; parte do conteúdo foi truncada.",
    noLinkedContext: "Nenhum contexto correlacionado registrado",
    execOutputLabel: "Saída da Execução",
    toolNotExecuted: "Ferramenta não executada.",
    noExecOutputYet: "Nenhuma saída de execução ainda.",
    ambiguousCorrelationAlert:
      "Existem chamadas simultâneas com parâmetros idênticos; impossível correlacionar de forma exclusiva a ferramenta. Resultados especulativos suprimidos.",
    noUniqueIdAlert: "Nenhum ID exclusivo de chamada de ferramenta registrado.",
    toolUseIdLabel: "ID da Chamada: ",
    argsDigestLabel: "Resumo dos Argumentos SHA-256: ",
    configDigestLabel: "Resumo da Configuração SHA-256: ",
    modelInputDigestLabel: "Resumo da Entrada do Modelo SHA-256: ",
    executionEndedLabel: "Resultado Gravado em: ",
    expandDetailAria: "Expandir detalhes",
    colExpand: "Expandir",
    colId: "#",
    colTool: "Ferramenta",
    colSource: "Origem",
    colRule: "Regra",
    colArgs: "Argumentos",
    colStatus: "Status",
    colRequested: "Hora do Pedido",
    colDecided: "Hora da Decisão",
    toggleApprovalAria: "{action} aprovação #{id}",
    expandAction: "Expandir",
    collapseAction: "Recolher",
    approvalDetailAria: "Detalhes da Aprovação #{id}",
    titleIntercept: "Interceptações de Comando",
    titleHistory: "Registros de Aprovação",
    pendingBadge: "Pendentes",
    refresh: "Atualizar",
    headerDesc: "Expanda registros para verificar requisições de ferramentas, decisões, auditoria e resultados.",
    filterGroupAria: "Filtro de Registros de Aprovação",
    filterStatusLabel: "Status",
    filterStatusAll: "Todos os Status",
    filterSourceLabel: "Origem",
    filterSourceAll: "Todas as Origens",
    sourceModel: "Decisão do Modelo",
    sourceRule: "Decisão da Regra",
    sourceUnknown: "Origem Desconhecida",
    clearFilters: "Limpar Filtros",
    recordsLoadFailed: "Falha ao carregar registros: ",
    pendingLoadFailed: "Falha ao carregar fila de pendências: ",
    pendingSectionTitle: "Aprovações Pendentes ({count})",
    pendingSectionHint: "Expanda para permitir ou recusar",
    pendingTableLabel: "Aprovações Pendentes",
    filterResultTitle: "Registros Filtrados",
    allRecordsTitle: "Todos os Registros",
    emptyFilterTitle: "Nenhum registro de aprovação corresponde aos filtros",
    emptyAllTitle: "Nenhum registro de aprovação ainda",
    emptyFilterDesc: "Ajuste os filtros de status/origem ou limpe os filtros para ver todos os registros.",
    emptyAllDesc: "Os registros aparecerão aqui assim que as regras ou o modelo avaliarem requisições de ferramentas.",
    recordsTableLabel: "Lista de Registros de Aprovação",
    allowedSuccess: "Execução permitida",
    deniedSuccess: "Execução recusada",
    rulePrefix: "Regra #",
  },
  zh: {
    chatPrefix: "对话 #",
    taskPrefix: "任务 ",
    locateAria: "定位审批 #{id} 的来源：{label}",
    locateError: "无法定位对应执行",
    statusPending: "待审批",
    statusAllowed: "已允许",
    statusDenied: "已拒绝",
    statusTimeout: "已超时",
    modelDecisionBadge: "模型判定",
    ruleDeletedOrUnrecorded: "规则未记录或已删除",
    noReasonRecorded: "未记录理由",
    copied: "已复制",
    copyFailed: "复制失败，请手动选择内容复制",
    copyAria: "复制{label}",
    unrecorded: "未记录",
    truncatedContent: "内容已截断，以上为保存的片段。",
    ctxUser: "用户消息",
    ctxAssistant: "Agent 消息",
    ctxToolUse: "工具请求",
    ctxToolResult: "工具输出",
    actAllow: "允许",
    actAsk: "转人工审批",
    actDeny: "拒绝",
    execNotStarted: "尚未执行",
    execNotExecuted: "未执行",
    execAwaitingResult: "已允许，等待执行结果",
    execSucceeded: "执行成功",
    execFailed: "执行失败",
    execUnknown: "执行结果未知",
    modelReviewContextTitle: "模型审查上下文",
    modelReviewContextDesc: "以下为本次实际发送给审查模型的输入快照。背景仅用于理解当前动作，裁决依据为审查策略。",
    legacyInputNotice: "此记录使用旧版输入，保留当时实际发送的内容。",
    currentPendingCall: "当前待审查调用",
    bgUserMsg: "背景 · 用户消息",
    bgWorkerIntentLegacy: "背景 · Worker 意图摘要（旧版）",
    bgUserMsgNote: "取自当前用户消息。",
    bgWorkerIntentNote: "这是旧版发送的 Worker 意图摘要；新版 Worker 审查不再发送此内容。",
    noBgMessage: "本次审查未附带背景消息。",
    currentTurnInputLegacy: "当前轮输入（旧版）",
    taskDescLegacy: "任务描述（旧版）",
    taskGoalLegacy: "任务目标（旧版）",
    taskConstraintsLegacy: "任务操作约束（旧版）",
    workerIntentLegacy: "Worker 意图（旧版）",
    workingDirectory: "工作目录",
    noHistorySent: "本次审查未发送历史调用或执行结果。",
    historyProvidedTitle: "当时提供给模型的历史调用（旧版）",
    historyStatusSuccess: "成功",
    historyStatusFail: "失败（可能有部分副作用）",
    historyArgs: "历史调用参数",
    historyResult: "历史执行结果",
    noHistoryRecords: "本次未提供可配对的历史工具执行记录。",
    historyTruncatedNotice: "历史为有限窗口，部分内容已截断。",
    viewFullInputJson: "查看完整模型审查输入 JSON",
    modelReviewInputLabel: "模型审查输入",
    allowButton: "允许",
    denyButton: "拒绝",
    detailLoadFailed: "详情加载失败：",
    retryDetail: "重试详情",
    initialModelJudge: "模型初判",
    initialRuleJudge: "规则初判",
    initialFallbackJudge: "模型异常回退",
    toolRequestSuffix: "工具请求",
    viewCommandContent: "查看命令内容",
    commandContentLabel: "命令内容",
    executionResultLabel: "执行结果：",
    loadingText: "加载中…",
    reviewStatusHeader: "审查状态",
    approvalDecisionHeader: "审批裁决",
    finalActionLabel: "最终动作：",
    sourceLabel: "来源",
    requestedAtLabel: "申请时间",
    decidedAtLabel: "决定时间",
    ruleSnapshotLabel: "规则快照",
    judgeModelProfileLabel: "审批模型配置",
    noAuditAlert: "此记录未保存审批详情快照，无法还原当时的上下文、模型初判和执行输出。",
    collapseContext: "收起上下文",
    viewContextAndResult: "查看上下文与执行结果",
    onlyDigestAlert:
      "此历史记录仅保存审查输入指纹，未保存输入原文，无法还原当时发给模型的上下文。新产生的模型裁决会保留输入快照。",
    noInputAlert: "此记录没有保存模型审查输入，可能由规则直接裁决、模型调用前发生异常或产生于旧版本。",
    viewAuditSnippetNotSent: "查看会话审计片段（未发送模型）",
    viewAuditSnippet: "查看会话审计片段",
    conversationTurnInputSnippet: "会话当前轮输入（审计片段）",
    visibleContextTitle: "可见会话上下文",
    visibleContextDesc: "保存于 {time} 的会话记录片段。模型实际使用的内容以“模型审查输入”为准。",
    contextTruncatedNotice: "仅保存最近的上下文，部分内容已截断。",
    noLinkedContext: "未记录可关联的上下文",
    execOutputLabel: "执行输出",
    toolNotExecuted: "工具未执行。",
    noExecOutputYet: "尚无执行输出",
    ambiguousCorrelationAlert: "存在相同参数的并发调用，无法唯一关联工具调用；本记录不展示推测的执行结果。",
    noUniqueIdAlert: "未记录可唯一关联的工具调用 ID。",
    toolUseIdLabel: "工具调用 ID：",
    argsDigestLabel: "参数摘要 SHA-256：",
    configDigestLabel: "审查配置指纹 SHA-256：",
    modelInputDigestLabel: "模型审查输入 SHA-256：",
    executionEndedLabel: "结果记录时间：",
    expandDetailAria: "展开详情",
    colExpand: "展开",
    colId: "#",
    colTool: "工具",
    colSource: "来源",
    colRule: "匹配规则",
    colArgs: "参数",
    colStatus: "状态",
    colRequested: "申请时间",
    colDecided: "决定时间",
    toggleApprovalAria: "{action}审批 #{id}",
    expandAction: "展开",
    collapseAction: "收起",
    approvalDetailAria: "审批详情 #{id}",
    titleIntercept: "拦截审批",
    titleHistory: "审批记录",
    pendingBadge: "待审批",
    refresh: "刷新",
    headerDesc: "展开记录查看工具请求和审批裁决，以及当时的位置与执行结果。",
    filterGroupAria: "审批记录筛选",
    filterStatusLabel: "审批状态",
    filterStatusAll: "全部状态",
    filterSourceLabel: "判定来源",
    filterSourceAll: "全部来源",
    sourceModel: "模型判定",
    sourceRule: "规则判定",
    sourceUnknown: "来源未知",
    clearFilters: "清除筛选",
    recordsLoadFailed: "记录加载失败：",
    pendingLoadFailed: "待审批加载失败：",
    pendingSectionTitle: "待处理（{count}）",
    pendingSectionHint: "展开后允许或拒绝",
    pendingTableLabel: "待处理审批",
    filterResultTitle: "筛选结果",
    allRecordsTitle: "全部记录",
    emptyFilterTitle: "没有符合筛选条件的审批记录",
    emptyAllTitle: "暂无审批记录",
    emptyFilterDesc: "请调整审批状态或判定来源，或清除筛选查看全部记录。",
    emptyAllDesc: "规则或模型作出审批决定后，记录将显示在这里。",
    recordsTableLabel: "审批记录列表",
    allowedSuccess: "已允许执行",
    deniedSuccess: "已拒绝执行",
    rulePrefix: "规则 #",
  },
};

function fmtTime(value: string | undefined, locale: "en" | "pt" | "zh") {
  if (!value) return "—";
  const dateLocale = locale === "zh" ? "zh-CN" : locale === "pt" ? "pt-BR" : "en-US";
  return new Date(value).toLocaleString(dateLocale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function source(row: InterceptApprovalRow) {
  if (row.decision_source) return row.decision_source;
  if (row.rule_id) return "rule";
  return row.reason?.startsWith("[模型]") || row.reason?.startsWith("[Model]") ? "model" : "unknown";
}

function originLabel(row: InterceptApprovalRow, locale: "en" | "pt" | "zh") {
  const t = I18N[locale] ?? I18N.en;
  if (row.task_id) return row.task_id;
  if (row.conversation_id) return `${t.chatPrefix}${row.conversation_id}`;
  return "—";
}

function ApprovalOrigin({
  row,
  detail = false,
  locale,
}: {
  row: InterceptApprovalRow;
  detail?: boolean;
  locale: "en" | "pt" | "zh";
}) {
  const t = I18N[locale] ?? I18N.en;
  const [locating, setLocating] = React.useState(false);
  const label = detail && row.task_id ? `${t.taskPrefix}${row.task_id}` : originLabel(row, locale);
  const query = new URLSearchParams({ approval: String(row.id) });
  let href: string | undefined;
  if (row.conversation_id) {
    query.set("c", String(row.conversation_id));
    href = `/chat?${query}`;
  } else if (row.task_id) {
    query.set("id", row.task_id);
    href = `/function/tasks/detail?${query}`;
  }
  return href ? (
    <a
      href={href}
      className="text-primary underline-offset-4 hover:underline"
      aria-label={t.locateAria.replace("{id}", String(row.id)).replace("{label}", label)}
      aria-busy={locating}
      onClick={async (e) => {
        e.stopPropagation();
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        if (locating) return;
        setLocating(true);
        try {
          await api.interceptExecution(row.id, row.conversation_id ?? undefined);
          window.location.assign(href);
        } catch (error) {
          toast.error((error as Error).message || t.locateError);
          setLocating(false);
        }
      }}
    >
      {label}
    </a>
  ) : (
    <span>{label}</span>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: "en" | "pt" | "zh" }) {
  const t = I18N[locale] ?? I18N.en;
  const labels: Record<string, string> = {
    pending: t.statusPending,
    allowed: t.statusAllowed,
    denied: t.statusDenied,
    timeout: t.statusTimeout,
  };
  let variant: "default" | "destructive" | "secondary" | "outline" = "outline";
  if (status === "allowed") variant = "default";
  if (status === "denied") variant = "destructive";
  if (status === "pending") variant = "secondary";
  return <Badge variant={variant}>{labels[status] ?? status}</Badge>;
}

function MatchCell({
  row,
  showReason = true,
  locale,
}: {
  row: InterceptApprovalRow;
  showReason?: boolean;
  locale: "en" | "pt" | "zh";
}) {
  const t = I18N[locale] ?? I18N.en;
  const reason = row.reason?.replace(/^(\[模型\]|\[Model\])\s*/, "");
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {source(row) === "model" ? (
        <Badge variant="outline">
          <BotIcon />
          {t.modelDecisionBadge}
        </Badge>
      ) : (
        <span className="truncate">{row.rule_name || t.ruleDeletedOrUnrecorded}</span>
      )}
      {showReason ? (
        <p className="truncate text-muted-foreground text-xs" title={reason}>
          {reason || t.noReasonRecorded}
        </p>
      ) : null}
    </div>
  );
}

function CodeBlock({
  label,
  text,
  truncated = false,
  locale,
}: {
  label: string;
  text: string;
  truncated?: boolean;
  locale: "en" | "pt" | "zh";
}) {
  const t = I18N[locale] ?? I18N.en;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  }
  return (
    <section className="flex min-w-0 flex-col gap-2" aria-label={label}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-muted-foreground text-xs">{label}</h3>
        {text ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t.copyAria.replace("{label}", label)}
            onClick={() => void copy()}
          >
            <CopyIcon />
          </Button>
        ) : null}
      </div>
      <pre className="max-h-80 min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 font-mono text-xs leading-6 [overflow-wrap:anywhere]">
        {text || t.unrecorded}
      </pre>
      {truncated ? <p className="text-muted-foreground text-xs">{t.truncatedContent}</p> : null}
    </section>
  );
}

function ModelReviewContext({ input, locale }: { input: InterceptReviewInput; locale: "en" | "pt" | "zh" }) {
  const t = I18N[locale] ?? I18N.en;
  const contextLabels: Record<string, string> = {
    user: t.ctxUser,
    assistant: t.ctxAssistant,
    text: t.ctxAssistant,
    tool_use: t.ctxToolUse,
    tool_result: t.ctxToolResult,
  };

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={t.modelReviewContextTitle}>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-sm">{t.modelReviewContextTitle}</h3>
        <p className="text-muted-foreground text-xs">
          {t.modelReviewContextDesc}
          {input.version < 4 ? t.legacyInputNotice : null}
        </p>
      </div>
      <CodeBlock
        label={t.currentPendingCall}
        text={JSON.stringify({ tool_name: input.tool_name, arguments: input.arguments }, null, 2)}
        locale={locale}
      />
      {input.version >= 2 ? (
        input.background ? (
          <div className="flex min-w-0 flex-col gap-2">
            <CodeBlock
              label={input.background.source === "user_message" ? t.bgUserMsg : t.bgWorkerIntentLegacy}
              text={input.background.text}
              truncated={input.background.truncated}
              locale={locale}
            />
            <p className="text-muted-foreground text-xs">
              {input.background.source === "user_message" ? t.bgUserMsgNote : t.bgWorkerIntentNote}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">{t.noBgMessage}</p>
        )
      ) : (
        <>
          {input.turn_input ? (
            <CodeBlock
              label={t.currentTurnInputLegacy}
              text={input.turn_input}
              truncated={input.background_truncated}
              locale={locale}
            />
          ) : null}
          {input.task ? (
            <>
              <CodeBlock
                label={t.taskDescLegacy}
                text={input.task.description}
                truncated={input.task.truncated}
                locale={locale}
              />
              <CodeBlock
                label={t.taskGoalLegacy}
                text={input.task.goal}
                truncated={input.task.truncated}
                locale={locale}
              />
              <CodeBlock
                label={t.taskConstraintsLegacy}
                text={JSON.stringify(input.task.constraints, null, 2)}
                locale={locale}
              />
            </>
          ) : null}
          {input.worker_intent ? (
            <CodeBlock
              label={t.workerIntentLegacy}
              text={input.worker_intent}
              truncated={input.background_truncated}
              locale={locale}
            />
          ) : null}
        </>
      )}
      {input.working_directory ? (
        <CodeBlock label={t.workingDirectory} text={input.working_directory} locale={locale} />
      ) : null}
      {input.version >= 3 ? (
        <p className="text-muted-foreground text-xs">{t.noHistorySent}</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          <h4 className="font-medium text-muted-foreground text-xs">{t.historyProvidedTitle}</h4>
          {input.history?.length ? (
            input.history.map((entry) => (
              <div key={entry.tool_use_id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                <p className="break-words font-medium text-xs">
                  {entry.tool} · {entry.status === "succeeded" ? t.historyStatusSuccess : t.historyStatusFail}
                </p>
                <CodeBlock
                  label={t.historyArgs}
                  text={entry.arguments_preview}
                  truncated={entry.truncated}
                  locale={locale}
                />
                <CodeBlock label={t.historyResult} text={entry.result} truncated={entry.truncated} locale={locale} />
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-xs">{t.noHistoryRecords}</p>
          )}
          {input.history_truncated ? <p className="text-muted-foreground text-xs">{t.historyTruncatedNotice}</p> : null}
        </div>
      )}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="self-start">
            <ChevronDownIcon data-icon="inline-start" />
            {t.viewFullInputJson}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <CodeBlock label={t.modelReviewInputLabel} text={JSON.stringify(input, null, 2)} locale={locale} />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

type Decide = (id: number, decision: "allowed" | "denied") => Promise<void>;

function DecisionActions({
  row,
  busy,
  decide,
  locale,
}: {
  row: InterceptApprovalRow;
  busy: boolean;
  decide: Decide;
  locale: "en" | "pt" | "zh";
}) {
  const t = I18N[locale] ?? I18N.en;
  if (row.status !== "pending") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={() => void decide(row.id, "allowed")}>
        <CheckIcon data-icon="inline-start" />
        {t.allowButton}
      </Button>
      <Button size="sm" variant="destructive" disabled={busy} onClick={() => void decide(row.id, "denied")}>
        <XIcon data-icon="inline-start" />
        {t.denyButton}
      </Button>
    </div>
  );
}

export function ApprovalDetail({
  row,
  busy,
  decide,
  revision,
  readOnly = false,
  defaultExpanded = false,
  onResolved,
}: {
  row: InterceptApprovalRow;
  busy: boolean;
  decide: Decide;
  revision: number;
  readOnly?: boolean;
  defaultExpanded?: boolean;
  onResolved?: (status: "allowed" | "denied" | "timeout") => void;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [detail, setDetail] = React.useState<InterceptDetail | null>(null);
  const [error, setError] = React.useState("");
  const [retry, setRetry] = React.useState(0);
  const [more, setMore] = React.useState(defaultExpanded);

  const actionLabels: Record<string, string> = {
    allow: t.actAllow,
    ask: t.actAsk,
    deny: t.actDeny,
  };

  const executionLabels: Record<InterceptAudit["execution_status"], string> = {
    not_started: t.execNotStarted,
    not_executed: t.execNotExecuted,
    awaiting_result: t.execAwaitingResult,
    succeeded: t.execSucceeded,
    failed: t.execFailed,
    unknown: t.execUnknown,
  };

  const contextLabels: Record<string, string> = {
    user: t.ctxUser,
    assistant: t.ctxAssistant,
    text: t.ctxAssistant,
    tool_use: t.ctxToolUse,
    tool_result: t.ctxToolResult,
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Status, refresh and retry invalidate details without closing the panel.
  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const next = await api.interceptDetail(row.id);
        if (cancelled) return;
        setDetail(next);
        setError("");
        if (next.status !== "pending") onResolved?.(next.status);
        if (next.status === "pending" || next.audit?.execution_status === "awaiting_result")
          timer = setTimeout(() => void load(), 5000);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || t.detailLoadFailed);
      }
    }
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [row.id, row.status, revision, retry, onResolved, t.detailLoadFailed]);

  const current = detail?.status === row.status ? detail : row;
  const audit = detail?.audit;
  let execution = audit ? executionLabels[audit.execution_status] : t.unrecorded;
  if (row.status === "pending") execution = t.execNotStarted;
  if (audit && audit.correlation !== "exact" && audit.effective_action === "allow") execution = t.noLinkedContext;
  const command = typeof row.tool_input?.command === "string" ? row.tool_input.command : undefined;
  let initialLabel = source(row) === "model" ? t.initialModelJudge : t.initialRuleJudge;
  if (audit?.model_fallback) initialLabel = t.initialFallbackJudge;

  return (
    <div className="flex min-w-0 flex-col gap-4 p-3 sm:p-5">
      <div className="grid min-w-0 gap-5 rounded-xl border bg-muted/20 p-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <CodeBlock
            label={`${current.agent_name || current.conv_agent_key || "Agent"} · ${t.toolRequestSuffix}`}
            text={JSON.stringify(row.tool_input ?? {}, null, 2)}
            locale={locale}
          />
          {command ? (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDownIcon data-icon="inline-start" />
                  {t.viewCommandContent}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <CodeBlock label={t.commandContentLabel} text={command} locale={locale} />
              </CollapsibleContent>
            </Collapsible>
          ) : null}
          <p className="text-muted-foreground text-xs">
            {t.executionResultLabel}
            <span className="text-foreground">{detail ? execution : t.loadingText}</span>
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:border-l lg:pl-5">
          <h3 className="font-medium text-muted-foreground text-xs">
            {current.status === "pending" ? t.reviewStatusHeader : t.approvalDecisionHeader}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={current.status} locale={locale} />
            <MatchCell row={current} showReason={false} locale={locale} />
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">
            {current.reason?.replace(/^(\[模型\]|\[Model\])\s*/, "") || t.noReasonRecorded}
          </p>
          {audit?.decision_reason ? <p className="text-sm">{audit.decision_reason}</p> : null}
          {audit?.effective_action ? (
            <p className="text-sm">
              {t.finalActionLabel}
              {actionLabels[audit.effective_action]}
            </p>
          ) : null}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
            <dt className="text-muted-foreground">{t.sourceLabel}</dt>
            <dd className="break-words">
              <ApprovalOrigin row={current} detail locale={locale} />
            </dd>
            <dt className="text-muted-foreground">{t.requestedAtLabel}</dt>
            <dd>{fmtTime(row.created_at, locale)}</dd>
            <dt className="text-muted-foreground">{t.decidedAtLabel}</dt>
            <dd>{fmtTime(current.decided_at, locale)}</dd>
            {audit?.rule_name ? (
              <>
                <dt className="text-muted-foreground">{t.ruleSnapshotLabel}</dt>
                <dd>{audit.rule_name}</dd>
              </>
            ) : null}
            {audit?.profile_id ? (
              <>
                <dt className="text-muted-foreground">{t.judgeModelProfileLabel}</dt>
                <dd>#{audit.profile_id}</dd>
              </>
            ) : null}
          </dl>
          {!readOnly ? <DecisionActions row={current} busy={busy} decide={decide} locale={locale} /> : null}
        </div>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {t.detailLoadFailed}
                {error}
              </span>
              <Button variant="outline" size="sm" onClick={() => setRetry((v) => v + 1)}>
                {t.retryDetail}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {!detail && !error ? <Skeleton className="h-8 w-60" /> : null}
      {detail && !audit ? (
        <Alert>
          <AlertDescription>{t.noAuditAlert}</AlertDescription>
        </Alert>
      ) : null}
      {audit ? (
        <Collapsible open={more} onOpenChange={setMore}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDownIcon data-icon="inline-start" className={cn(more && "rotate-180")} />
              {more ? t.collapseContext : t.viewContextAndResult}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="flex min-w-0 flex-col gap-5">
              {audit.model_input ? (
                <ModelReviewContext input={audit.model_input} locale={locale} />
              ) : (
                <Alert>
                  <AlertDescription>{audit.model_input_digest ? t.onlyDigestAlert : t.noInputAlert}</AlertDescription>
                </Alert>
              )}
              {audit.user_message || audit.context?.length ? (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDownIcon data-icon="inline-start" />
                      {audit.model_input && audit.model_input.version >= 3
                        ? t.viewAuditSnippetNotSent
                        : t.viewAuditSnippet}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="flex min-w-0 flex-col gap-3">
                      {audit.user_message ? (
                        <CodeBlock
                          label={t.conversationTurnInputSnippet}
                          text={audit.user_message}
                          truncated={audit.user_truncated}
                          locale={locale}
                        />
                      ) : null}
                      <section className="flex min-w-0 flex-col gap-3">
                        <h3 className="font-medium text-muted-foreground text-xs">{t.visibleContextTitle}</h3>
                        <p className="text-muted-foreground text-xs">
                          {t.visibleContextDesc.replace("{time}", fmtTime(audit.captured_at, locale))}
                        </p>
                        {audit.context_truncated ? (
                          <p className="text-muted-foreground text-xs">{t.contextTruncatedNotice}</p>
                        ) : null}
                        {audit.context?.length ? (
                          audit.context.map((entry, index) => (
                            <CodeBlock
                              key={`${entry.kind}-${entry.tool_use_id || index}`}
                              label={`${contextLabels[entry.kind] ?? entry.kind}${entry.tool ? ` · ${entry.tool}` : ""}${entry.is_error ? " · Error" : ""}`}
                              text={entry.text}
                              truncated={entry.truncated}
                              locale={locale}
                            />
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">{t.noLinkedContext}</p>
                        )}
                      </section>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
              <CodeBlock
                label={`${initialLabel}：${actionLabels[audit.initial_action] ?? audit.initial_action}`}
                text={audit.initial_reason.replace(/^(\[模型\]|\[Model\])\s*/, "")}
                locale={locale}
              />
              <CodeBlock
                label={t.execOutputLabel}
                text={
                  audit.output ?? (audit.execution_status === "not_executed" ? t.toolNotExecuted : t.noExecOutputYet)
                }
                truncated={audit.output_truncated}
                locale={locale}
              />
              {audit.correlation !== "exact" ? (
                <Alert>
                  <AlertDescription>
                    {audit.correlation === "ambiguous" ? t.ambiguousCorrelationAlert : t.noUniqueIdAlert}
                  </AlertDescription>
                </Alert>
              ) : null}
              <dl className="grid gap-2 text-muted-foreground text-xs [overflow-wrap:anywhere]">
                <div>
                  {t.toolUseIdLabel}
                  {audit.tool_use_id || t.unrecorded}
                </div>
                <div>
                  {t.argsDigestLabel}
                  {audit.input_digest}
                </div>
                <div>
                  {t.configDigestLabel}
                  {audit.config_digest || t.unrecorded}
                </div>
                {audit.model_input_digest ? (
                  <div>
                    {t.modelInputDigestLabel}
                    {audit.model_input_digest}
                  </div>
                ) : null}
                {audit.execution_ended_at ? (
                  <div>
                    {t.executionEndedLabel}
                    {fmtTime(audit.execution_ended_at, locale)}
                  </div>
                ) : null}
              </dl>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

const approvalBreakpoints = ["(min-width: 40rem)", "(min-width: 48rem)", "(min-width: 64rem)", "(min-width: 80rem)"];
function subscribeColumns(onChange: () => void) {
  const queries = approvalBreakpoints.map((query) => window.matchMedia(query));
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}
function visibleColumnCount() {
  const matches = approvalBreakpoints.map((query) => window.matchMedia(query).matches);
  return 3 + Number(matches[0]) + Number(matches[1]) + 2 * Number(matches[2]) + 2 * Number(matches[3]);
}
function serverColumnCount() {
  return 9;
}

function ApprovalTable({
  rows,
  busy,
  decide,
  revision,
  label,
  locale,
}: {
  rows: InterceptApprovalRow[];
  busy: boolean;
  decide: Decide;
  revision: number;
  label: string;
  locale: "en" | "pt" | "zh";
}) {
  const t = I18N[locale] ?? I18N.en;
  const [expanded, setExpanded] = React.useState<Set<number>>(() => new Set());
  const columns = React.useSyncExternalStore(subscribeColumns, visibleColumnCount, serverColumnCount);
  const prefix = React.useId();
  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return (
    <Table className="table-fixed" aria-label={label}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <span className="sr-only">{t.expandDetailAria}</span>
          </TableHead>
          <TableHead className="hidden w-14 sm:table-cell">{t.colId}</TableHead>
          <TableHead className="w-28">{t.colTool}</TableHead>
          <TableHead className="hidden md:table-cell">{t.colSource}</TableHead>
          <TableHead className="hidden lg:table-cell">{t.colRule}</TableHead>
          <TableHead className="hidden xl:table-cell">{t.colArgs}</TableHead>
          <TableHead className="w-24">{t.colStatus}</TableHead>
          <TableHead className="hidden w-36 lg:table-cell">{t.colRequested}</TableHead>
          <TableHead className="hidden w-36 xl:table-cell">{t.colDecided}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const open = expanded.has(row.id);
          const panelID = `${prefix}-${row.id}`;
          return (
            <React.Fragment key={row.id}>
              <TableRow
                data-state={open ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => toggle(row.id)}
              >
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.toggleApprovalAria
                      .replace("{action}", open ? t.collapseAction : t.expandAction)
                      .replace("{id}", String(row.id))}
                    aria-expanded={open}
                    aria-controls={open ? panelID : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(row.id);
                    }}
                  >
                    {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  </Button>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{row.id}</TableCell>
                <TableCell>
                  <code className="block truncate text-xs">{row.tool_name}</code>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-col gap-1">
                    <span className="truncate" title={originLabel(row, locale)}>
                      <ApprovalOrigin row={row} locale={locale} />
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {row.agent_name || row.conv_agent_key}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <MatchCell row={row} locale={locale} />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <code className="block truncate text-muted-foreground text-xs">{JSON.stringify(row.tool_input)}</code>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} locale={locale} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
                  {fmtTime(row.created_at, locale)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground text-xs xl:table-cell">
                  {fmtTime(row.decided_at, locale)}
                </TableCell>
              </TableRow>
              {open ? (
                <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                  <TableCell colSpan={columns} className="whitespace-normal p-0">
                    <section id={panelID} aria-label={t.approvalDetailAria.replace("{id}", String(row.id))}>
                      <ApprovalDetail row={row} busy={busy} decide={decide} revision={revision} />
                    </section>
                  </TableCell>
                </TableRow>
              ) : null}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function ApprovalRecords({ taskId }: { taskId?: string }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [rows, setRows] = React.useState<InterceptApprovalRow[]>([]);
  const [pendingRows, setPendingRows] = React.useState<InterceptPending[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const [filter, setFilter] = React.useState<InterceptApprovalFilter>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [pendingError, setPendingError] = React.useState("");
  const [deciding, setDeciding] = React.useState(false);
  const [revision, setRevision] = React.useState(0);
  const request = React.useRef(0);
  const decisionLock = React.useRef(false);
  const filterID = React.useId();
  const filtered = Boolean(filter.status || filter.decision_source);

  // biome-ignore lint/correctness/useExhaustiveDependencies: taskId intentionally resets pagination when scope changes.
  React.useEffect(() => {
    setPage(1);
  }, [taskId]);

  const load = React.useCallback(
    async (manual = false) => {
      const id = ++request.current;
      if (manual) setRefreshing(true);
      try {
        const [history, pendingRes] = await Promise.allSettled([
          taskId
            ? api.interceptTaskPage(taskId, page, pageSize, filter)
            : api.interceptHistoryPage(page, pageSize, filter),
          api.interceptPending(),
        ]);
        if (id !== request.current) return;
        if (history.status === "fulfilled") {
          setRows(history.value.items);
          setTotal(history.value.total);
          setError("");
        } else {
          setError((history.reason as Error).message || t.recordsLoadFailed);
        }
        if (pendingRes.status === "fulfilled") {
          setPendingRows(pendingRes.value);
          setPendingError("");
        } else {
          setPendingError((pendingRes.reason as Error).message || t.pendingLoadFailed);
        }
        if (manual) setRevision((v) => v + 1);
      } catch (e) {
        if (id === request.current) setError((e as Error).message || t.recordsLoadFailed);
      } finally {
        if (id === request.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [taskId, page, pageSize, filter, t.recordsLoadFailed, t.pendingLoadFailed],
  );
  const latestLoad = React.useRef(load);
  latestLoad.current = load;

  React.useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      request.current++;
      clearInterval(timer);
    };
  }, [load]);

  const changePageSize = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  const changeFilter = (next: InterceptApprovalFilter) => {
    request.current++;
    setFilter(next);
    setPage(1);
    setRows([]);
    setTotal(0);
    setError("");
    setLoading(true);
  };

  const decide: Decide = async (id, decision) => {
    if (decisionLock.current) return;
    decisionLock.current = true;
    setDeciding(true);
    try {
      await api.interceptDecide(id, decision);
      request.current++;
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status: decision, decided_at: new Date().toISOString() } : row)),
      );
      setPendingRows((prev) => prev.filter((row) => row.id !== id));
      setRevision((v) => v + 1);
      toast.success(decision === "allowed" ? t.allowedSuccess : t.deniedSuccess);
      await latestLoad.current(true);
    } catch (e) {
      toast.error((e as Error).message);
      await latestLoad.current(true);
    } finally {
      decisionLock.current = false;
      setDeciding(false);
    }
  };

  const historyById = new Map(rows.map((row) => [row.id, row]));
  const pending: InterceptApprovalRow[] = pendingRows
    .filter((row) => !taskId || row.task_id === taskId)
    .map((row) => ({
      conv_title: "",
      conv_agent_key: "",
      rule_name: row.rule_id ? `${t.rulePrefix}${row.rule_id}` : "",
      ...historyById.get(row.id),
      ...row,
    }));
  const title = taskId ? t.titleIntercept : t.titleHistory;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardListIcon className="size-5 text-muted-foreground" />
          <h1 className="font-semibold text-xl">{title}</h1>
          {pending.length ? (
            <Badge variant="secondary">
              {pending.length} {t.pendingBadge}
            </Badge>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading || refreshing}>
          <RefreshCwIcon data-icon="inline-start" className={cn(refreshing && "animate-spin")} />
          {t.refresh}
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">{t.headerDesc}</p>
      <FieldGroup className="flex-row flex-wrap items-end gap-3" aria-label={t.filterGroupAria}>
        <Field className="w-full sm:w-40">
          <FieldLabel htmlFor={`${filterID}-status`}>{t.filterStatusLabel}</FieldLabel>
          <Select
            value={filter.status ?? "all"}
            onValueChange={(value) =>
              changeFilter({
                ...filter,
                status: value === "all" ? undefined : (value as InterceptApprovalFilter["status"]),
              })
            }
          >
            <SelectTrigger id={`${filterID}-status`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t.filterStatusAll}</SelectItem>
                <SelectItem value="denied">{t.statusDenied}</SelectItem>
                <SelectItem value="pending">{t.statusPending}</SelectItem>
                <SelectItem value="allowed">{t.statusAllowed}</SelectItem>
                <SelectItem value="timeout">{t.statusTimeout}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-full sm:w-40">
          <FieldLabel htmlFor={`${filterID}-source`}>{t.filterSourceLabel}</FieldLabel>
          <Select
            value={filter.decision_source ?? "all"}
            onValueChange={(value) =>
              changeFilter({
                ...filter,
                decision_source: value === "all" ? undefined : (value as InterceptApprovalFilter["decision_source"]),
              })
            }
          >
            <SelectTrigger id={`${filterID}-source`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t.filterSourceAll}</SelectItem>
                <SelectItem value="model">{t.sourceModel}</SelectItem>
                <SelectItem value="rule">{t.sourceRule}</SelectItem>
                <SelectItem value="unknown">{t.sourceUnknown}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={() => changeFilter({})}>
            {t.clearFilters}
          </Button>
        ) : null}
      </FieldGroup>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {pendingError ? (
        <Alert variant="destructive">
          <AlertDescription>{pendingError}</AlertDescription>
        </Alert>
      ) : null}
      {pending.length ? (
        <section className="overflow-hidden rounded-xl border">
          <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3 font-medium text-sm">
            <ShieldAlertIcon className="size-4" />
            {t.pendingSectionTitle.replace("{count}", String(pending.length))}
            <span className="text-muted-foreground text-xs">{t.pendingSectionHint}</span>
          </div>
          <ApprovalTable
            rows={pending}
            busy={deciding}
            decide={decide}
            revision={revision}
            label={t.pendingTableLabel}
            locale={locale}
          />
        </section>
      ) : null}
      <section className="overflow-hidden rounded-xl border">
        <div className="border-b px-4 py-3 font-medium text-sm">
          {filtered ? t.filterResultTitle : t.allRecordsTitle} ({total})
        </div>
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}
        {!loading && !rows.length && !error ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardListIcon />
              </EmptyMedia>
              <EmptyTitle>{filtered ? t.emptyFilterTitle : t.emptyAllTitle}</EmptyTitle>
              <EmptyDescription>{filtered ? t.emptyFilterDesc : t.emptyAllDesc}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {rows.length ? (
          <ApprovalTable
            rows={rows}
            busy={deciding}
            decide={decide}
            revision={revision}
            label={t.recordsTableLabel}
            locale={locale}
          />
        ) : null}
        {!loading && !error ? (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={changePageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        ) : null}
      </section>
    </div>
  );
}
