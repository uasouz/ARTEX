"use client";

import * as React from "react";

import {
  EyeIcon,
  GitCompareIcon,
  InfoIcon,
  PencilIcon,
  RotateCcwIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type {
  Agent,
  AgentDetail,
  AgentTrigger,
  MCPServer,
  PromptVar,
  PromptVersion,
  Settings,
  SkillItem,
  Tool,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const I18N = {
  en: {
    agentNotFound: "Agent not found: ",
    tabPrompt: "Config & Prompt",
    tabWrapup: "Wrap-up Prompt",
    tabMcp: "MCP",
    tabSkill: "Skill",
    tabTools: "Tools",
    tabTriggers: "Triggers",
    defaultModelLabel: "Default Model (LLM Profile)",
    followGlobalActive: "Follow Task / Global Active Profile",
    defaultSuffix: " · Default",
    llmProfileHint:
      "Bind a fixed LLM profile to this Agent (takes effect on Save). Priority: Agent binding > Task/Session override > Global active.",
    maxTurnsLabel: "Max Loops (0 = unlimited)",
    runSecsLabel: "Max Run Duration (seconds, 0 = unlimited)",
    saveConfig: "Save Config",
    configSaved: "Runtime config saved (applied immediately)",
    webSearchLabel: "Web Search",
    webSearchEnabledHint:
      "When enabled for this Agent (save to apply), the web_search tool is available for live research.",
    webSearchDisabledHint: "Web Search must first be enabled and configured with a provider in System Settings.",
    interactiveShellLabel: "Interactive Shell",
    interactiveShellHint:
      "When enabled for this Agent (save to apply), persistent PTY session tools (shell_open/send/read/close/list) can drive interactive CLI utilities (msfconsole, SSH, REPL).",
    variablesLabel: "Variables (click to insert placeholder, populated at runtime)",
    noVariables: "(No variables)",
    examplePrefix: "Example: ",
    promptPlaceholder: "Leave blank to use built-in default prompt",
    previewRender: "Preview Render",
    renderPreviewTitle: "Render Preview",
    renderPreviewDesc: "All {{.Var}} placeholders have been replaced with sample backend values.",
    saveAsNewVer: "Save as New Version",
    resetDefault: "Reset Default",
    versionHistory: "Version History",
    currentBadge: "Current",
    noSavedVersions: "(No saved versions, using built-in default)",
    noNote: "(No note)",
    emptyTemplate: "(Empty)",
    compareWithCurrent: "Compare with Current",
    loadIntoEditor: "Load into Editor",
    loadedVerMsg: "Loaded v{ver} into editor. Review and click 'Save as New Version'.",
    diffTitle: "Version Comparison: v{old} → v{new} (Current)",
    diffDeleted: "- Removed",
    diffAdded: "+ Added",
    renderErr: "Render error: ",
    previewErr: "Preview failed: ",
    savedAsVer: "Saved as version v{ver}",
    saveFailed: "Save failed: ",
    resetToBuiltin: "Reset to built-in default (v{ver})",
    resetFailed: "Reset failed: ",
    wrapupIntro:
      "When this Agent is terminated due to timeout or exhausting steps, the system injects this wrap-up prompt to run a final cycle: persisting uncommitted data and providing a coherent conclusion. Leave blank to use built-in default.",
    wrapupTextLabel: "Wrap-up Prompt Body",
    customBadge: "Custom",
    useDefaultBadge: "Built-in Default",
    wrapupPlaceholder: "Leave blank to use built-in default wrap-up prompt",
    wrapupTurnsLabel: "Wrap-up Turns (max rounds in wrap-up phase; 0 = use built-in default {default} turns)",
    save: "Save",
    wrapupSaved: "Wrap-up config saved (takes effect on next run)",
    clearedToDefault: "Cleared, will use built-in default",
    builtinDefaultRef: "Built-in Default (Read-only reference)",
    taskTimeoutWrapupIntro:
      "Task Timeout Wrap-up (separate from per-run wrap-up): injected when the entire task reaches its timeout limit. Leave blank to use built-in default.",
    taskTimeoutWrapupLabel: "Task Timeout Wrap-up Prompt Body",
    taskTimeoutWrapupPlaceholder: "Leave blank to use built-in default task timeout wrap-up prompt",
    taskTimeoutSaved: "Task timeout wrap-up config saved (takes effect on next run)",
    mcpDesc: "Select MCP servers visible to this Agent.",
    noMcp: "(No MCP servers)",
    skillDesc: "Select Skills visible to this Agent.",
    noSkills: "(No Skills)",
    toolsDesc: "Select built-in tools bound to this Agent.",
    noTools: "(No tools)",
    trafficBadge: "Traffic",
    disabledBadge: "Disabled",
    needTrafficCapture: "Requires Traffic Capture",
    mcpVisibilityMsg: "MCP '{name}' visibility {status}",
    skillVisibilityMsg: "Skill '{name}' visibility {status}",
    toolBoundMsg: "Tool '{name}' {status}",
    boundStatus: "bound",
    unboundStatus: "unbound",
    enabledStatus: "enabled",
    disabledStatus: "disabled",
    triggersIntro:
      "Triggers automate this custom Agent: each trigger launches a new conversation session (visible in Chat). Multiple conditions can be selected; contextual details are automatically appended.",
    triggerStrategyTitle: "Trigger Execution Strategy (queuing and concurrency behavior)",
    runModeLabel: "Run Mode",
    serialMode: "Serial (queue, one by one)",
    parallelMode: "Parallel (concurrent sessions)",
    mergeModeLabel: "Merge Mode",
    mergeByTask: "Merge by Task",
    mergeAll: "Merge All into One",
    mergeNone: "Do Not Merge",
    maxParallelLabel: "Max Concurrency (0 = unlimited)",
    parallelDesc:
      "Parallel: every trigger immediately starts a new concurrent session. Triggers exceeding max concurrency queue up for available slots.",
    serialByTaskDesc:
      "Serial · Merge by Task: one active session per agent; queued triggers for the same task merge into a single session.",
    serialAllDesc:
      "Serial · Merge All: one active session per agent; dequeuing merges all currently pending triggers into a single session.",
    serialNoneDesc:
      "Serial · No Merge: one active session per agent; each trigger executes in its own distinct session sequentially.",
    editTriggerTitle: "Edit Trigger #{id} (click 'Save Changes' to apply)",
    newTriggerTitle: "Add Trigger (each condition accepts custom user message)",
    checkInterval: "Scheduled Interval",
    every: "Every",
    secondsUnit: "seconds",
    intervalPlaceholder: "Message sent upon interval, e.g. Inspect all pending tasks",
    checkFinding: "Trigger on Finding Discovered",
    findingPlaceholder: "Message sent when a finding is discovered (system appends task & finding details)",
    checkGoal: "Trigger on Goal Met",
    goalPlaceholder: "Message sent when a goal is met (system appends task & completed goal details)",
    checkTimeout: "Trigger on Task Timeout",
    timeoutPlaceholder: "Message sent when a task times out (system appends task ID & objectives)",
    checkToolCall: "Trigger on Tool Execution",
    toolCallDesc: "Select tools to monitor (at least one). Triggers upon tool completion. Selected: {count}.",
    noToolsList: "(Tool list empty)",
    toolCallPlaceholder: "Message sent upon tool call (system appends task info, inputs, and outputs)",
    checkTaskCreate: "Trigger on Task Created",
    taskCreatePlaceholder: "Message sent upon task creation (system appends task ID and objectives)",
    saveChanges: "Save Changes",
    addTrigger: "Add Trigger",
    cancelEdit: "Cancel Edit",
    existingTriggers: "Configured Triggers",
    noExistingTriggers: "(None)",
    everySecFmt: "Every {sec}s",
    findingCond: "Finding Discovered",
    goalCond: "Goal Met",
    timeoutCond: "Task Timeout",
    toolCallCond: "Tool Call ({count})",
    taskCreateCond: "Task Created",
    noConditions: "(No conditions)",
    timedPrefix: "Interval: ",
    findingPrefix: "Finding: ",
    goalPrefix: "Goal: ",
    timeoutPrefix: "Timeout: ",
    taskCreatePrefix: "Task Created: ",
    toolPrefix: "Tool: ",
    msgPrefix: "Message: ",
    edit: "Edit",
    delete: "Delete",
    delFailed: "Delete failed: ",
    needConditionErr: "Please select at least one trigger condition",
    needToolErr: "Tool call trigger requires selecting at least one tool",
    triggerUpdated: "Trigger updated successfully",
    triggerAdded: "Trigger added successfully",
  },
  pt: {
    agentNotFound: "Agente não encontrado: ",
    tabPrompt: "Configuração e Prompt",
    tabWrapup: "Prompt de Encerramento",
    tabMcp: "MCP",
    tabSkill: "Skill",
    tabTools: "Ferramentas",
    tabTriggers: "Gatilhos",
    defaultModelLabel: "Modelo Padrão (Perfil LLM)",
    followGlobalActive: "Seguir Tarefa / Perfil Ativo Global",
    defaultSuffix: " · Padrão",
    llmProfileHint:
      "Vincule um perfil LLM fixo a este Agente (entra em vigor ao Salvar). Prioridade: Vínculo do agente > Tarefa/Sessão > Perfil ativo global.",
    maxTurnsLabel: "Máximo de Ciclos (0 = ilimitado)",
    runSecsLabel: "Duração Máxima (segundos, 0 = ilimitado)",
    saveConfig: "Salvar Configuração",
    configSaved: "Configuração de execução salva (aplicada imediatamente)",
    webSearchLabel: "Pesquisa na Web",
    webSearchEnabledHint:
      "Quando ativado para este Agente (salve para aplicar), a ferramenta web_search fica disponível.",
    webSearchDisabledHint: "A pesquisa na web deve ser habilitada e configurada em Configurações do Sistema primeiro.",
    interactiveShellLabel: "Shell Interativo",
    interactiveShellHint:
      "Quando ativado para este Agente (salve para aplicar), ferramentas de sessão PTY persistente (shell_open/send/read/close/list) podem controlar CLI interativo (msfconsole, SSH, REPL).",
    variablesLabel: "Variáveis (clique para inserir marcador, substituído em tempo de execução)",
    noVariables: "(Sem variáveis)",
    examplePrefix: "Exemplo: ",
    promptPlaceholder: "Deixe em branco para usar o prompt padrão integrado",
    previewRender: "Pré-visualizar Renderização",
    renderPreviewTitle: "Pré-visualização Renderizada",
    renderPreviewDesc: "Todos os marcadores {{.Var}} foram substituídos por valores de exemplo pelo backend.",
    saveAsNewVer: "Salvar como Nova Versão",
    resetDefault: "Restaurar Padrão",
    versionHistory: "Histórico de Versões",
    currentBadge: "Atual",
    noSavedVersions: "(Nenhuma versão salva, usando padrão integrado)",
    noNote: "(Sem observações)",
    emptyTemplate: "(Vazio)",
    compareWithCurrent: "Comparar com Atual",
    loadIntoEditor: "Carregar no Editor",
    loadedVerMsg: "Versão v{ver} carregada no editor. Revise e clique em 'Salvar como Nova Versão'.",
    diffTitle: "Comparação de Versões: v{old} → v{new} (Atual)",
    diffDeleted: "- Removido",
    diffAdded: "+ Adicionado",
    renderErr: "Erro de renderização: ",
    previewErr: "Falha na pré-visualização: ",
    savedAsVer: "Salvo como versão v{ver}",
    saveFailed: "Falha ao salvar: ",
    resetToBuiltin: "Restaurado para padrão integrado (v{ver})",
    resetFailed: "Falha ao restaurar: ",
    wrapupIntro:
      "Quando este Agente é encerrado por tempo limite ou esgotamento de etapas, o sistema injeta este prompt de encerramento para salvar dados não persistidos e fornecer uma conclusão. Deixe em branco para usar o padrão.",
    wrapupTextLabel: "Texto do Prompt de Encerramento",
    customBadge: "Personalizado",
    useDefaultBadge: "Padrão Integrado",
    wrapupPlaceholder: "Deixe em branco para usar o prompt de encerramento padrão integrado",
    wrapupTurnsLabel: "Turnos de Encerramento (máximo de rodadas na fase de encerramento; 0 = padrão {default} turnos)",
    save: "Salvar",
    wrapupSaved: "Configuração de encerramento salva (entra em vigor na próxima execução)",
    clearedToDefault: "Limpo, usará o padrão integrado",
    builtinDefaultRef: "Padrão Integrado (Referência somente leitura)",
    taskTimeoutWrapupIntro:
      "Encerramento por Tempo Limite da Tarefa (separado do encerramento por execução): injetado quando a tarefa completa atinge o tempo limite. Deixe em branco para usar o padrão.",
    taskTimeoutWrapupLabel: "Texto do Prompt de Encerramento por Tempo Limite da Tarefa",
    taskTimeoutWrapupPlaceholder: "Deixe em branco para usar o padrão de encerramento por tempo limite da tarefa",
    taskTimeoutSaved: "Configuração de encerramento por tempo limite salva (entra em vigor na próxima execução)",
    mcpDesc: "Selecione os servidores MCP visíveis para este Agente.",
    noMcp: "(Nenhum servidor MCP)",
    skillDesc: "Selecione as Skills visíveis para este Agente.",
    noSkills: "(Nenhuma Skill)",
    toolsDesc: "Selecione as ferramentas integradas vinculadas a este Agente.",
    noTools: "(Nenhuma ferramenta)",
    trafficBadge: "Tráfego",
    disabledBadge: "Desativado",
    needTrafficCapture: "Requer Captura de Tráfego",
    mcpVisibilityMsg: "Visibilidade do MCP '{name}' {status}",
    skillVisibilityMsg: "Visibilidade da Skill '{name}' {status}",
    toolBoundMsg: "Ferramenta '{name}' {status}",
    boundStatus: "vinculada",
    unboundStatus: "desvinculada",
    enabledStatus: "ativada",
    disabledStatus: "desativada",
    triggersIntro:
      "Os gatilhos automatizam este Agente personalizado: cada gatilho inicia uma nova sessão de conversa (visível no Chat). Várias condições podem ser selecionadas; dados contextuais são anexados automaticamente.",
    triggerStrategyTitle: "Estratégia de Execução de Gatilhos (fila e simultaneidade)",
    runModeLabel: "Modo de Execução",
    serialMode: "Serial (fila, um por vez)",
    parallelMode: "Paralelo (sessões simultâneas)",
    mergeModeLabel: "Modo de Mesclagem",
    mergeByTask: "Mesclar por Tarefa",
    mergeAll: "Mesclar Tudo em Uma",
    mergeNone: "Não Mesclar",
    maxParallelLabel: "Simultaneidade Máxima (0 = ilimitado)",
    parallelDesc:
      "Paralelo: cada disparo abre imediatamente uma nova sessão simultânea. Disparos além do limite aguardam na fila.",
    serialByTaskDesc:
      "Serial · Mesclar por Tarefa: uma sessão ativa por agente; disparos da mesma tarefa na fila mesclam-se em uma única sessão.",
    serialAllDesc:
      "Serial · Mesclar Tudo: uma sessão ativa por agente; ao desenfileirar, todos os disparos pendentes mesclam-se em uma única sessão.",
    serialNoneDesc:
      "Serial · Sem Mesclagem: uma sessão ativa por agente; cada disparo executa sequencialmente em sua própria sessão.",
    editTriggerTitle: "Editar Gatilho #{id} (clique em 'Salvar Alterações' para aplicar)",
    newTriggerTitle: "Novo Gatilho (cada condição pode ter mensagem personalizada)",
    checkInterval: "Disparo Periódico",
    every: "A cada",
    secondsUnit: "segundos",
    intervalPlaceholder: "Mensagem enviada no disparo periódico, ex: Inspecionar todas as tarefas",
    checkFinding: "Disparar ao Descobrir Finding",
    findingPlaceholder: "Mensagem enviada ao descobrir finding (o sistema anexa detalhes da tarefa e finding)",
    checkGoal: "Disparar ao Atingir Meta",
    goalPlaceholder: "Mensagem enviada ao atingir meta (o sistema anexa detalhes da tarefa e meta)",
    checkTimeout: "Disparar por Tempo Limite da Tarefa",
    timeoutPlaceholder: "Mensagem enviada no tempo limite da tarefa (o sistema anexa ID e objetivos da tarefa)",
    checkToolCall: "Disparar na Execução de Ferramenta",
    toolCallDesc: "Selecione as ferramentas para monitorar (ao menos uma). Dispara ao concluir. Selecionadas: {count}.",
    noToolsList: "(Lista de ferramentas vazia)",
    toolCallPlaceholder: "Mensagem enviada ao chamar ferramenta (o sistema anexa dados, entradas e saídas)",
    checkTaskCreate: "Disparar ao Criar Tarefa",
    taskCreatePlaceholder: "Mensagem enviada ao criar tarefa (o sistema anexa ID e objetivos da tarefa)",
    saveChanges: "Salvar Alterações",
    addTrigger: "Adicionar Gatilho",
    cancelEdit: "Cancelar Edição",
    existingTriggers: "Gatilhos Configurados",
    noExistingTriggers: "(Nenhum)",
    everySecFmt: "A cada {sec}s",
    findingCond: "Finding Descoberto",
    goalCond: "Meta Atingida",
    timeoutCond: "Tempo Limite",
    toolCallCond: "Chamada de Ferramenta ({count})",
    taskCreateCond: "Tarefa Criada",
    noConditions: "(Sem condições)",
    timedPrefix: "Periódico: ",
    findingPrefix: "Finding: ",
    goalPrefix: "Meta: ",
    timeoutPrefix: "Tempo Limite: ",
    taskCreatePrefix: "Tarefa Criada: ",
    toolPrefix: "Ferramenta: ",
    msgPrefix: "Mensagem: ",
    edit: "Editar",
    delete: "Excluir",
    delFailed: "Falha ao excluir: ",
    needConditionErr: "Selecione pelo menos uma condição de disparo",
    needToolErr: "Gatilho de ferramenta requer selecionar pelo menos uma ferramenta",
    triggerUpdated: "Gatilho atualizado com sucesso",
    triggerAdded: "Gatilho adicionado com sucesso",
  },
  zh: {
    agentNotFound: "未找到 Agent：",
    tabPrompt: "配置与提示词",
    tabWrapup: "收尾提示词",
    tabMcp: "MCP",
    tabSkill: "Skill",
    tabTools: "Tools",
    tabTriggers: "触发",
    defaultModelLabel: "默认模型（LLM 配置）",
    followGlobalActive: "跟随任务 / 全局激活配置",
    defaultSuffix: " · 默认",
    llmProfileHint:
      "为该 Agent 绑定固定 LLM 配置（点「保存配置」生效）。优先级：Agent 绑定 > 任务/会话指定 > 全局激活。",
    maxTurnsLabel: "最大循环次数（0=不限）",
    runSecsLabel: "运行时长（秒，0=不限）",
    saveConfig: "保存配置",
    configSaved: "已保存运行配置（立即生效）",
    webSearchLabel: "网络搜索",
    webSearchEnabledHint: "为该 Agent 开启后（点上方保存生效），可用 web_search 联网检索",
    webSearchDisabledHint: "需先在「系统配置」开启网络搜索并配置后端，才能在此启用",
    interactiveShellLabel: "交互式 Shell",
    interactiveShellHint:
      "为该 Agent 开启后（点上方保存生效），可用持久 PTY 会话工具（shell_open/send/read/close/list）驱动 msfconsole/ssh/REPL 等交互程序",
    variablesLabel: "变量（点击插入占位符，渲染时由运行时数据替换）",
    noVariables: "（无变量）",
    examplePrefix: "示例：",
    promptPlaceholder: "留空则使用内置默认提示词",
    previewRender: "预览渲染",
    renderPreviewTitle: "渲染预览",
    renderPreviewDesc: "所有 {{.Var}} 已由后端用示例值替换。",
    saveAsNewVer: "保存为新版本",
    resetDefault: "恢复默认",
    versionHistory: "版本历史",
    currentBadge: "当前",
    noSavedVersions: "（暂无保存的版本，使用内置默认）",
    noNote: "（无备注）",
    emptyTemplate: "（空）",
    compareWithCurrent: "与当前版本对比",
    loadIntoEditor: "加载到编辑器",
    loadedVerMsg: "已加载 v{ver} 到编辑器，确认后点「保存为新版本」",
    diffTitle: "版本对比：v{old} → v{new}（当前）",
    diffDeleted: "- 删除",
    diffAdded: "+ 新增",
    renderErr: "渲染错误：",
    previewErr: "预览失败：",
    savedAsVer: "已保存为版本 v{ver}",
    saveFailed: "保存失败：",
    resetToBuiltin: "已恢复为内置默认（v{ver}）",
    resetFailed: "恢复失败：",
    wrapupIntro:
      "当此 Agent 因超时或步数耗尽被终止时，系统会注入这段「收尾提示词」跑一轮收尾：先把已识别但未落库的内容写回，再输出一句总结（避免烂尾）。留空则使用内置默认。",
    wrapupTextLabel: "收尾提示词正文",
    customBadge: "自定义",
    useDefaultBadge: "使用内置默认",
    wrapupPlaceholder: "留空则使用内置默认收尾提示词",
    wrapupTurnsLabel: "收尾轮数（收尾阶段自身最多跑几轮；0=用内置默认 {default} 轮）",
    save: "保存",
    wrapupSaved: "收尾配置已保存（下次运行生效）",
    clearedToDefault: "已清空，将使用内置默认",
    builtinDefaultRef: "内置默认（只读，供参考）",
    taskTimeoutWrapupIntro:
      "任务超时收尾（与上面的 per-run 收尾是两套）：当整个任务到达超时上限、即将结束时注入。留空则用内置默认。",
    taskTimeoutWrapupLabel: "任务超时收尾提示词正文",
    taskTimeoutWrapupPlaceholder: "留空则使用内置默认任务超时收尾提示词",
    taskTimeoutSaved: "任务超时收尾配置已保存（下次运行生效）",
    mcpDesc: "勾选此 Agent 可见的 MCP 服务器。",
    noMcp: "（暂无 MCP）",
    skillDesc: "勾选此 Agent 可见的 Skill。",
    noSkills: "（暂无 Skill）",
    toolsDesc: "勾选绑定给此 Agent 的内置工具。",
    noTools: "（暂无工具）",
    trafficBadge: "流量",
    disabledBadge: "已停用",
    needTrafficCapture: "需开启流量捕获",
    mcpVisibilityMsg: "{status} MCP「{name}」可见",
    skillVisibilityMsg: "{status} Skill「{name}」可见",
    toolBoundMsg: "{status}工具「{name}」",
    boundStatus: "已绑定",
    unboundStatus: "已解绑",
    enabledStatus: "已开启",
    disabledStatus: "已取消",
    triggersIntro:
      "触发器让这个自定义 Agent 自动运行：每次触发都新建一个会话运行（在「对话」页可见）。可选多项触发条件；系统会自动附加触发原因与上下文。",
    triggerStrategyTitle: "触发后处理策略（决定触发如何排队/合并运行）",
    runModeLabel: "运行模式",
    serialMode: "串行（排队，一次一个）",
    parallelMode: "并行（各自并发会话）",
    mergeModeLabel: "合并模式",
    mergeByTask: "按任务合并",
    mergeAll: "全部合并成一条",
    mergeNone: "不合并",
    maxParallelLabel: "最大并发（0=不限）",
    parallelDesc: "并行：每次触发立即各开一个会话并发运行，不合并；超过最大并发的触发排队等空位。",
    serialByTaskDesc: "串行·按任务合并：同 agent 一次跑一个；排队中同一任务的事件触发合并成一条会话。",
    serialAllDesc: "串行·全部合并：同 agent 一次跑一个；取队列时把当前排队的所有触发合并成一条会话。",
    serialNoneDesc: "串行·不合并：同 agent 一次跑一个；每条触发各自一个会话。",
    editTriggerTitle: "编辑触发器 #{id}（改完点「保存修改」）",
    newTriggerTitle: "新增触发器（每种条件可填各自的用户消息）",
    checkInterval: "定时触发",
    every: "每",
    secondsUnit: "秒",
    intervalPlaceholder: "定时触发时发给 agent 的话，如：巡检所有任务",
    checkFinding: "发现 finding 时触发",
    findingPlaceholder: "发现 finding 时发给 agent 的话（系统会附带任务与 finding 详情）",
    checkGoal: "目标达成时触发",
    goalPlaceholder: "目标达成时发给 agent 的话（系统会附带任务与达成的目标）",
    checkTimeout: "任务超时时触发",
    timeoutPlaceholder: "任务超时时发给 agent 的话（系统会附带任务编号与目标）",
    checkToolCall: "工具调用时触发",
    toolCallDesc: "选择要监听的工具（至少一个）；任务执行中这些工具每次调用完成都会触发。已选 {count} 个。",
    noToolsList: "（工具列表为空）",
    toolCallPlaceholder: "工具被调用时发给 agent 的话（系统会附带任务信息、工具入参与返回内容）",
    checkTaskCreate: "任务创建时触发",
    taskCreatePlaceholder: "任务被创建时发给 agent 的话（系统会附带任务编号与目标）",
    saveChanges: "保存修改",
    addTrigger: "添加触发器",
    cancelEdit: "取消编辑",
    existingTriggers: "已有触发器",
    noExistingTriggers: "（暂无）",
    everySecFmt: "每 {sec}s",
    findingCond: "发现 finding",
    goalCond: "目标达成",
    timeoutCond: "任务超时",
    toolCallCond: "工具调用({count})",
    taskCreateCond: "任务创建",
    noConditions: "（无条件）",
    timedPrefix: "定时：",
    findingPrefix: "finding：",
    goalPrefix: "目标：",
    timeoutPrefix: "超时：",
    taskCreatePrefix: "任务创建：",
    toolPrefix: "工具：",
    msgPrefix: "消息：",
    edit: "编辑",
    delete: "删除",
    delFailed: "删除失败：",
    needConditionErr: "至少选择一种触发条件",
    needToolErr: "工具调用触发至少选择一个工具",
    triggerUpdated: "已保存修改",
    triggerAdded: "已添加触发器",
  },
};

const TRAFFIC_TOOL_KEYS = new Set(["traffic_search", "traffic_get"]);

export function AgentEditor({ agentKey, onSaved }: { agentKey: string; onSaved?: () => void }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [detail, setDetail] = React.useState<AgentDetail | null>(null);
  const [versions, setVersions] = React.useState<PromptVersion[]>([]);
  const [variables, setVariables] = React.useState<PromptVar[]>([]);
  const [mcp, setMcp] = React.useState<MCPServer[]>([]);
  const [skills, setSkills] = React.useState<SkillItem[]>([]);
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [viewVer, setViewVer] = React.useState<PromptVersion | null>(null);
  const [diffVer, setDiffVer] = React.useState<PromptVersion | null>(null);

  const [prompt, setPrompt] = React.useState("");
  const [mcpVisible, setMcpVisible] = React.useState<number[]>([]);
  const [skillVisible, setSkillVisible] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState("");
  const [maxTurns, setMaxTurns] = React.useState("0");
  const [runSecs, setRunSecs] = React.useState("600");
  const [llmProfileId, setLlmProfileId] = React.useState("");
  const [llmProfiles, setLlmProfiles] = React.useState<NonNullable<AgentDetail["llm_profiles"]>>([]);
  const [webSearch, setWebSearch] = React.useState(false);
  const [interactiveShell, setInteractiveShell] = React.useState(false);
  const [wrapup, setWrapup] = React.useState("");
  const [wrapupDefault, setWrapupDefault] = React.useState("");
  const [wrapupTurns, setWrapupTurns] = React.useState("0");
  const [wrapupTurnsDefault, setWrapupTurnsDefault] = React.useState(5);

  const [ttSupported, setTtSupported] = React.useState(false);
  const [ttWrapup, setTtWrapup] = React.useState("");
  const [ttWrapupDefault, setTtWrapupDefault] = React.useState("");
  const [ttTurns, setTtTurns] = React.useState("0");
  const [ttTurnsDefault, setTtTurnsDefault] = React.useState(5);
  const [settings, setSettings] = React.useState<Settings | null>(null);

  React.useEffect(() => {
    void api
      .mcpServers()
      .then(setMcp)
      .catch(() => {
        /* ignore */
      });
    void api
      .skills()
      .then(setSkills)
      .catch(() => {
        /* ignore */
      });
    void api
      .tools()
      .then(setTools)
      .catch(() => {
        /* ignore */
      });
    void api
      .settings()
      .then(setSettings)
      .catch(() => {
        /* ignore */
      });
  }, []);

  const captureOn = !!settings?.traffic_capture;
  const webSearchGlobalOn = !!settings?.web_search_enabled;

  const reload = React.useCallback(() => {
    api
      .getAgent(agentKey)
      .then((d) => {
        setDetail(d);
        setPrompt(d.prompt ?? "");
        setVariables(d.variables ?? []);
        setVersions(d.versions ?? []);
        setMcpVisible(d.visibility?.mcp ?? []);
        setSkillVisible(d.visibility?.skill ?? []);
        setMaxTurns(String(d.agent?.max_turns ?? 0));
        setRunSecs(String(d.agent?.run_seconds ?? 600));
        setLlmProfileId(d.agent?.llm_profile_id != null ? String(d.agent.llm_profile_id) : "");
        setLlmProfiles(d.llm_profiles ?? []);
        setWebSearch(!!d.agent?.web_search);
        setInteractiveShell(!!d.agent?.interactive_shell);
        setWrapup(d.wrapup_prompt ?? "");
        setWrapupDefault(d.wrapup_default ?? "");
        setWrapupTurns(String(d.wrapup_max_turns ?? 0));
        setWrapupTurnsDefault(d.wrapup_max_turns_default ?? 5);
        setTtSupported(!!d.task_timeout_wrapup_supported);
        setTtWrapup(d.task_timeout_wrapup_prompt ?? "");
        setTtWrapupDefault(d.task_timeout_wrapup_default ?? "");
        setTtTurns(String(d.task_timeout_wrapup_max_turns ?? 0));
        setTtTurnsDefault(d.task_timeout_wrapup_max_turns_default ?? 5);
      })
      .catch(() => setDetail(null))
      .finally(() => setLoaded(true));
  }, [agentKey]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  async function doPreview() {
    try {
      const r = await api.previewAgentPrompt(agentKey, prompt);
      setPreview(r.error ? t.renderErr + r.error : r.rendered);
    } catch (e) {
      setPreview(t.previewErr + (e as Error).message);
    }
  }

  async function savePrompt() {
    try {
      const r = await api.saveAgentPrompt(agentKey, prompt);
      toast.success(t.savedAsVer.replace("{ver}", String(r.version)));
      reload();
      onSaved?.();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    }
  }

  async function resetPrompt() {
    try {
      const r = await api.resetAgentPrompt(agentKey);
      toast.success(t.resetToBuiltin.replace("{ver}", String(r.version)));
      reload();
    } catch (e) {
      toast.error(t.resetFailed + (e as Error).message);
    }
  }

  async function saveWrapup() {
    try {
      const turns = Math.max(0, Math.floor(Number(wrapupTurns) || 0));
      await api.saveAgentWrapup(agentKey, wrapup, turns);
      toast.success(wrapup.trim() || turns > 0 ? t.wrapupSaved : t.clearedToDefault);
      reload();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    }
  }

  async function resetWrapup() {
    try {
      await api.resetAgentWrapup(agentKey);
      toast.success(t.clearedToDefault);
      reload();
    } catch (e) {
      toast.error(t.resetFailed + (e as Error).message);
    }
  }

  async function saveTaskTimeoutWrapup() {
    try {
      const turns = Math.max(0, Math.floor(Number(ttTurns) || 0));
      await api.saveAgentTaskTimeoutWrapup(agentKey, ttWrapup, turns);
      toast.success(t.taskTimeoutSaved);
      reload();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    }
  }

  async function resetTaskTimeoutWrapup() {
    try {
      await api.resetAgentTaskTimeoutWrapup(agentKey);
      toast.success(t.clearedToDefault);
      reload();
    } catch (e) {
      toast.error(t.resetFailed + (e as Error).message);
    }
  }

  async function saveConfig() {
    try {
      const patch: Parameters<typeof api.saveAgentConfig>[1] = {
        llm_profile_id: llmProfileId === "" ? null : Number(llmProfileId),
      };
      if (showConfig) {
        patch.max_turns = Math.max(0, Math.floor(Number(maxTurns) || 0));
        patch.run_seconds = Math.max(0, Math.floor(Number(runSecs) || 0));
      }
      if (showWebSearch) patch.web_search = webSearch;
      if (showInteractiveShell) patch.interactive_shell = interactiveShell;
      await api.saveAgentConfig(agentKey, patch);
      toast.success(t.configSaved);
      reload();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    }
  }

  async function applyVis(nextMcp: number[], nextSkill: string[], okMsg: string) {
    const prevMcp = mcpVisible;
    const prevSkill = skillVisible;
    setMcpVisible(nextMcp);
    setSkillVisible(nextSkill);
    try {
      await api.setAgentVisibility(agentKey, nextMcp, nextSkill);
      toast.success(okMsg);
      onSaved?.();
    } catch (e) {
      setMcpVisible(prevMcp);
      setSkillVisible(prevSkill);
      toast.error(t.saveFailed + (e as Error).message);
    }
  }

  function toggleMcp(id: number) {
    const on = mcpVisible.includes(id);
    const name = mcp.find((m) => m.id === id)?.name ?? String(id);
    const statusText = on ? t.disabledStatus : t.enabledStatus;
    void applyVis(
      on ? mcpVisible.filter((x) => x !== id) : [...mcpVisible, id],
      skillVisible,
      t.mcpVisibilityMsg.replace("{name}", name).replace("{status}", statusText),
    );
  }

  function toggleSkill(name: string) {
    const on = skillVisible.includes(name);
    const statusText = on ? t.disabledStatus : t.enabledStatus;
    void applyVis(
      mcpVisible,
      on ? skillVisible.filter((x) => x !== name) : [...skillVisible, name],
      t.skillVisibilityMsg.replace("{name}", name).replace("{status}", statusText),
    );
  }

  async function toggleTool(toolItem: Tool) {
    const on = toolItem.agents.includes(agentKey);
    const nextAgents = on ? toolItem.agents.filter((k) => k !== agentKey) : [...toolItem.agents, agentKey];
    setTools((ts) => ts.map((x) => (x.key === toolItem.key ? { ...x, agents: nextAgents } : x)));
    try {
      await api.saveTool(toolItem.key, {
        description: toolItem.description,
        schema: toolItem.schema,
        agents: nextAgents,
        enabled: toolItem.enabled,
      });
      const statusText = on ? t.unboundStatus : t.boundStatus;
      toast.success(t.toolBoundMsg.replace("{name}", toolItem.key).replace("{status}", statusText));
      onSaved?.();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
      reload();
      void api
        .tools()
        .then(setTools)
        .catch(() => {
          /* ignore */
        });
    }
  }

  if (loaded && !detail) {
    return (
      <div className="text-muted-foreground p-6 text-center text-sm">
        {t.agentNotFound}
        {agentKey}
      </div>
    );
  }

  const showConfig = agentKey !== "mainagent" && agentKey !== "goals";
  const showWebSearch = agentKey !== "goals";
  const showInteractiveShell = agentKey !== "goals";
  const showLLM = true;
  const isCustom = !!detail && !detail.agent?.builtin;

  const dateLocale = locale === "zh" ? "zh-CN" : locale === "pt" ? "pt-BR" : "en-US";

  return (
    <Tabs defaultValue="prompt" className="flex min-h-0 flex-1 flex-col">
      <TabsList className="mx-4 mt-2 w-fit">
        <TabsTrigger value="prompt">{t.tabPrompt}</TabsTrigger>
        <TabsTrigger value="wrapup">{t.tabWrapup}</TabsTrigger>
        <TabsTrigger value="mcp">{t.tabMcp}</TabsTrigger>
        <TabsTrigger value="skill">{t.tabSkill}</TabsTrigger>
        <TabsTrigger value="tools">{t.tabTools}</TabsTrigger>
        {isCustom && <TabsTrigger value="triggers">{t.tabTriggers}</TabsTrigger>}
      </TabsList>

      <TabsContent value="prompt" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid gap-4">
          {(showLLM || showConfig || showWebSearch || showInteractiveShell) && (
            <div className="grid gap-3 rounded-md border p-3">
              {showLLM && (
                <div className="grid gap-1.5">
                  <Label htmlFor="llm-profile" className="text-xs">
                    {t.defaultModelLabel}
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      value={llmProfileId || "__follow__"}
                      onValueChange={(v) => setLlmProfileId(v === "__follow__" ? "" : v)}
                    >
                      <SelectTrigger id="llm-profile" className="h-8 w-72">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__follow__">{t.followGlobalActive}</SelectItem>
                        {llmProfiles.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} ({p.model}){p.is_default ? t.defaultSuffix : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground max-w-md text-xs">{t.llmProfileHint}</span>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-end gap-3">
                {showConfig && (
                  <>
                    <div className="grid gap-1.5">
                      <Label htmlFor="max-turns" className="text-xs">
                        {t.maxTurnsLabel}
                      </Label>
                      <Input
                        id="max-turns"
                        type="number"
                        min={0}
                        className="h-8 w-32"
                        value={maxTurns}
                        onChange={(e) => setMaxTurns(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="run-seconds" className="text-xs">
                        {t.runSecsLabel}
                      </Label>
                      <Input
                        id="run-seconds"
                        type="number"
                        min={0}
                        className="h-8 w-32"
                        value={runSecs}
                        onChange={(e) => setRunSecs(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={saveConfig}>
                  <SaveIcon /> {t.saveConfig}
                </Button>
              </div>
              {showWebSearch && (
                <div className="flex items-center gap-3 border-t pt-3">
                  <Switch
                    id="web-search"
                    checked={webSearch}
                    disabled={!webSearchGlobalOn}
                    onCheckedChange={setWebSearch}
                  />
                  <div className="grid gap-0.5">
                    <Label htmlFor="web-search" className="text-sm">
                      {t.webSearchLabel}
                    </Label>
                    <span className="text-muted-foreground text-xs">
                      {webSearchGlobalOn ? t.webSearchEnabledHint : t.webSearchDisabledHint}
                    </span>
                  </div>
                </div>
              )}
              {showInteractiveShell && (
                <div className="flex items-center gap-3 border-t pt-3">
                  <Switch id="interactive-shell" checked={interactiveShell} onCheckedChange={setInteractiveShell} />
                  <div className="grid gap-0.5">
                    <Label htmlFor="interactive-shell" className="text-sm">
                      {t.interactiveShellLabel}
                    </Label>
                    <span className="text-muted-foreground text-xs">{t.interactiveShellHint}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label className="text-muted-foreground text-xs">{t.variablesLabel}</Label>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <Tooltip key={v.name}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setPrompt((p) => `${p}{{.${v.name}}}`)}
                      className="hover:bg-muted inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs"
                    >
                      {`{{.${v.name}}}`}
                      <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                        {v.source}
                      </Badge>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium">{v.description}</p>
                    <p className="text-muted-foreground mt-1">
                      {t.examplePrefix}
                      {v.example}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {variables.length === 0 && <span className="text-muted-foreground text-xs">{t.noVariables}</span>}
            </div>
          </div>

          <Textarea
            className="font-mono text-xs"
            rows={16}
            value={prompt}
            placeholder={t.promptPlaceholder}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={doPreview}>
                  <EyeIcon /> {t.previewRender}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t.renderPreviewTitle}</DialogTitle>
                  <DialogDescription>{t.renderPreviewDesc}</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-auto rounded-md border bg-muted/30 p-3">
                  <Markdown text={preview} />
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={savePrompt}>
              <SaveIcon /> {t.saveAsNewVer}
            </Button>
            <Button variant="outline" size="sm" onClick={resetPrompt}>
              <RotateCcwIcon /> {t.resetDefault}
            </Button>
          </div>

          <Separator />
          <div className="grid gap-2">
            <Label className="text-muted-foreground text-xs">{t.versionHistory}</Label>
            <ul className="grid gap-1">
              {versions.map((ver, i) => (
                <li
                  key={ver.version}
                  className="flex items-center gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-muted/50"
                >
                  <span className="font-mono shrink-0">v{ver.version}</span>
                  {i === 0 && (
                    <Badge variant="secondary" className="px-1.5 py-0 shrink-0">
                      {t.currentBadge}
                    </Badge>
                  )}
                  <span className="text-muted-foreground truncate flex-1">{ver.note}</span>
                  {ver.ts && (
                    <span className="text-muted-foreground/60 shrink-0 tabular-nums">
                      {new Date(ver.ts).toLocaleDateString(dateLocale, {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  <Button variant="ghost" size="icon-sm" className="size-6 shrink-0" onClick={() => setViewVer(ver)}>
                    <EyeIcon className="size-3" />
                  </Button>
                  {i > 0 && versions[0] && (
                    <Button variant="ghost" size="icon-sm" className="size-6 shrink-0" onClick={() => setDiffVer(ver)}>
                      <GitCompareIcon className="size-3" />
                    </Button>
                  )}
                </li>
              ))}
              {versions.length === 0 && <li className="text-muted-foreground text-xs">{t.noSavedVersions}</li>}
            </ul>
          </div>

          <Dialog
            open={!!viewVer}
            onOpenChange={(o) => {
              if (!o) setViewVer(null);
            }}
          >
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  v{viewVer?.version}
                  {viewVer?.version === versions[0]?.version && (
                    <Badge variant="secondary" className="ml-2 px-1.5 py-0 align-middle">
                      {t.currentBadge}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {viewVer?.note || t.noNote}
                  {viewVer?.ts && (
                    <span className="ml-2 text-muted-foreground/60">
                      {new Date(viewVer.ts).toLocaleString(dateLocale)}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <pre className="bg-muted max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-md p-3 font-mono text-xs">
                {viewVer?.template_text || t.emptyTemplate}
              </pre>
              <div className="flex gap-2 justify-end">
                {viewVer && viewVer.version !== versions[0]?.version && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (viewVer) {
                        setDiffVer(viewVer);
                        setViewVer(null);
                      }
                    }}
                  >
                    <GitCompareIcon className="mr-1 size-3.5" /> {t.compareWithCurrent}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    if (viewVer) {
                      setPrompt(viewVer.template_text);
                      setViewVer(null);
                      toast.success(t.loadedVerMsg.replace("{ver}", String(viewVer.version)));
                    }
                  }}
                >
                  {t.loadIntoEditor}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!diffVer}
            onOpenChange={(o) => {
              if (!o) setDiffVer(null);
            }}
          >
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {t.diffTitle
                    .replace("{old}", String(diffVer?.version))
                    .replace("{new}", String(versions[0]?.version))}
                </DialogTitle>
                <DialogDescription>
                  <span className="inline-flex items-center gap-3 text-xs">
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-600 dark:text-red-400">
                      {t.diffDeleted}
                    </span>
                    <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-green-600 dark:text-green-400">
                      {t.diffAdded}
                    </span>
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DiffView oldText={diffVer?.template_text ?? ""} newText={versions[0]?.template_text ?? ""} />
            </DialogContent>
          </Dialog>
        </div>
      </TabsContent>

      <TabsContent value="wrapup" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid gap-3">
          <p className="text-muted-foreground text-xs leading-relaxed">{t.wrapupIntro}</p>
          <div className="flex items-center gap-2">
            <Label className="text-xs">{t.wrapupTextLabel}</Label>
            {wrapup.trim() ? (
              <Badge variant="secondary" className="px-1.5 py-0">
                {t.customBadge}
              </Badge>
            ) : (
              <Badge variant="outline" className="px-1.5 py-0">
                {t.useDefaultBadge}
              </Badge>
            )}
          </div>
          <Textarea
            className="font-mono text-xs"
            rows={10}
            value={wrapup}
            placeholder={wrapupDefault || t.wrapupPlaceholder}
            onChange={(e) => setWrapup(e.target.value)}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="wrapup-turns" className="text-xs">
              {t.wrapupTurnsLabel.replace("{default}", String(wrapupTurnsDefault))}
            </Label>
            <Input
              id="wrapup-turns"
              type="number"
              min={0}
              className="h-8 w-32"
              value={wrapupTurns}
              onChange={(e) => setWrapupTurns(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveWrapup}>
              {t.save}
            </Button>
            <Button size="sm" variant="outline" onClick={resetWrapup}>
              {t.resetDefault}
            </Button>
          </div>
          {wrapupDefault && (
            <>
              <Separator />
              <div className="grid gap-1.5">
                <Label className="text-muted-foreground text-xs">{t.builtinDefaultRef}</Label>
                <pre className="text-muted-foreground max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs whitespace-pre-wrap">
                  {wrapupDefault}
                </pre>
              </div>
            </>
          )}

          {ttSupported && (
            <>
              <Separator className="my-2" />
              <p className="text-muted-foreground text-xs leading-relaxed">{t.taskTimeoutWrapupIntro}</p>
              <div className="flex items-center gap-2">
                <Label className="text-xs">{t.taskTimeoutWrapupLabel}</Label>
                {ttWrapup.trim() ? (
                  <Badge variant="secondary" className="px-1.5 py-0">
                    {t.customBadge}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="px-1.5 py-0">
                    {t.useDefaultBadge}
                  </Badge>
                )}
              </div>
              <Textarea
                className="font-mono text-xs"
                rows={10}
                value={ttWrapup}
                placeholder={ttWrapupDefault || t.taskTimeoutWrapupPlaceholder}
                onChange={(e) => setTtWrapup(e.target.value)}
              />
              <div className="grid gap-1.5">
                <Label htmlFor="tt-turns" className="text-xs">
                  {t.wrapupTurnsLabel.replace("{default}", String(ttTurnsDefault))}
                </Label>
                <Input
                  id="tt-turns"
                  type="number"
                  min={0}
                  className="h-8 w-32"
                  value={ttTurns}
                  onChange={(e) => setTtTurns(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveTaskTimeoutWrapup}>
                  {t.save}
                </Button>
                <Button size="sm" variant="outline" onClick={resetTaskTimeoutWrapup}>
                  {t.resetDefault}
                </Button>
              </div>
              {ttWrapupDefault && (
                <div className="grid gap-1.5">
                  <Label className="text-muted-foreground text-xs">{t.builtinDefaultRef}</Label>
                  <pre className="text-muted-foreground max-h-40 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs whitespace-pre-wrap">
                    {ttWrapupDefault}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="mcp" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="text-muted-foreground mb-3 text-xs">{t.mcpDesc}</p>
        <div className="grid gap-2">
          {mcp.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <Checkbox
                id={"mcp-" + String(m.id)}
                checked={mcpVisible.includes(m.id)}
                onCheckedChange={() => toggleMcp(m.id)}
              />
              <Label htmlFor={"mcp-" + String(m.id)} className="cursor-pointer font-normal">
                {m.name}
              </Label>
              <span className="text-muted-foreground ml-auto text-xs">{m.transport}</span>
            </div>
          ))}
          {mcp.length === 0 && <span className="text-muted-foreground text-xs">{t.noMcp}</span>}
        </div>
      </TabsContent>

      <TabsContent value="skill" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="text-muted-foreground mb-3 text-xs">{t.skillDesc}</p>
        <div className="grid gap-2">
          {skills.map((s) => (
            <div key={s.name} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <Checkbox
                id={"skill-" + s.name}
                checked={skillVisible.includes(s.name)}
                onCheckedChange={() => toggleSkill(s.name)}
              />
              <Label htmlFor={"skill-" + s.name} className="cursor-pointer font-mono text-xs">
                {s.name}
              </Label>
              {s.description && <span className="text-muted-foreground ml-auto truncate text-xs">{s.description}</span>}
            </div>
          ))}
          {skills.length === 0 && <span className="text-muted-foreground text-xs">{t.noSkills}</span>}
        </div>
      </TabsContent>

      <TabsContent value="tools" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="text-muted-foreground mb-3 text-xs">{t.toolsDesc}</p>
        <div className="grid gap-2">
          {tools.map((item) => {
            const isTraffic = TRAFFIC_TOOL_KEYS.has(item.key);
            const gated = isTraffic && !captureOn;
            return (
              <div
                key={item.key}
                className={cn("flex items-center gap-2 rounded-md border p-2 text-sm", gated && "opacity-60")}
              >
                <Checkbox
                  id={"tool-" + item.key}
                  checked={item.agents.includes(agentKey)}
                  disabled={gated}
                  onCheckedChange={() => toggleTool(item)}
                />
                <Label htmlFor={"tool-" + item.key} className="cursor-pointer font-mono text-xs">
                  {item.key}
                </Label>
                {isTraffic && (
                  <Badge variant="secondary" className="px-1 py-0 text-[9px]">
                    {t.trafficBadge}
                  </Badge>
                )}
                {!item.enabled && (
                  <Badge variant="outline" className="text-destructive px-1 py-0 text-[9px]">
                    {t.disabledBadge}
                  </Badge>
                )}
                {gated ? (
                  <span className="text-muted-foreground ml-auto text-xs">{t.needTrafficCapture}</span>
                ) : (
                  item.description && (
                    <span className="text-muted-foreground ml-auto line-clamp-1 max-w-[55%] text-xs">
                      {item.description}
                    </span>
                  )
                )}
              </div>
            );
          })}
          {tools.length === 0 && <span className="text-muted-foreground text-xs">{t.noTools}</span>}
        </div>
      </TabsContent>

      {isCustom && (
        <TabsContent value="triggers" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <AgentTriggersTab agentKey={agentKey} agent={detail?.agent} />
        </TabsContent>
      )}
    </Tabs>
  );
}

type DiffLine = { type: "same" | "add" | "del"; text: string };

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "same", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", text: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: "del", text: a[i - 1] });
      i--;
    }
  }
  return result;
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const lines = React.useMemo(() => computeDiff(oldText, newText), [oldText, newText]);
  return (
    <pre className="max-h-[60vh] overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs leading-5">
      {lines.map((l, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: diff line index is fine
        <div
          key={idx}
          className={cn(
            "whitespace-pre-wrap px-1",
            l.type === "del" && "bg-red-500/15 text-red-700 dark:text-red-400",
            l.type === "add" && "bg-green-500/15 text-green-700 dark:text-green-400",
            l.type === "same" && "text-muted-foreground",
          )}
        >
          <span className="select-none mr-1 opacity-50">{l.type === "del" ? "-" : l.type === "add" ? "+" : " "}</span>
          {l.text}
        </div>
      ))}
    </pre>
  );
}

function AgentTriggersTab({ agentKey, agent }: { agentKey: string; agent?: Agent }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [triggers, setTriggers] = React.useState<AgentTrigger[]>([]);
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [runMode, setRunMode] = React.useState<"serial" | "parallel">(agent?.trigger_run_mode ?? "serial");
  const [mergeMode, setMergeMode] = React.useState<"by_task" | "all" | "none">(agent?.trigger_merge_mode ?? "all");
  const [maxParallel, setMaxParallel] = React.useState(String(agent?.trigger_max_parallel ?? 5));

  React.useEffect(() => {
    setRunMode(agent?.trigger_run_mode ?? "serial");
    setMergeMode(agent?.trigger_merge_mode ?? "all");
    setMaxParallel(String(agent?.trigger_max_parallel ?? 5));
  }, [agent?.trigger_run_mode, agent?.trigger_merge_mode, agent?.trigger_max_parallel]);

  async function saveBehavior(patch: {
    trigger_run_mode?: "serial" | "parallel";
    trigger_merge_mode?: "by_task" | "all" | "none";
    trigger_max_parallel?: number;
  }) {
    try {
      await api.saveAgentConfig(agentKey, patch);
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    }
  }

  const [onInterval, setOnInterval] = React.useState(false);
  const [intervalSec, setIntervalSec] = React.useState("60");
  const [onFinding, setOnFinding] = React.useState(false);
  const [onGoalMet, setOnGoalMet] = React.useState(false);
  const [onTaskTimeout, setOnTaskTimeout] = React.useState(false);
  const [onToolCall, setOnToolCall] = React.useState(false);
  const [onTaskCreate, setOnTaskCreate] = React.useState(false);
  const [intervalMsg, setIntervalMsg] = React.useState("");
  const [findingMsg, setFindingMsg] = React.useState("");
  const [goalMsg, setGoalMsg] = React.useState("");
  const [taskTimeoutMsg, setTaskTimeoutMsg] = React.useState("");
  const [toolCallMsg, setToolCallMsg] = React.useState("");
  const [taskCreateMsg, setTaskCreateMsg] = React.useState("");
  const [toolNames, setToolNames] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const reload = React.useCallback(() => {
    api
      .agentTriggers(agentKey)
      .then(setTriggers)
      .catch(() => setTriggers([]));
  }, [agentKey]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    api
      .tools()
      .then(setTools)
      .catch(() => setTools([]));
  }, []);

  function toggleTool(key: string) {
    setToolNames((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function resetForm() {
    setEditingId(null);
    setOnInterval(false);
    setIntervalSec("60");
    setOnFinding(false);
    setOnGoalMet(false);
    setOnTaskTimeout(false);
    setOnToolCall(false);
    setOnTaskCreate(false);
    setIntervalMsg("");
    setFindingMsg("");
    setGoalMsg("");
    setTaskTimeoutMsg("");
    setToolCallMsg("");
    setTaskCreateMsg("");
    setToolNames([]);
  }

  function startEdit(triggerItem: AgentTrigger) {
    setEditingId(triggerItem.id);
    setOnInterval(triggerItem.interval_sec > 0);
    setIntervalSec(triggerItem.interval_sec > 0 ? String(triggerItem.interval_sec) : "60");
    setOnFinding(triggerItem.on_finding);
    setOnGoalMet(triggerItem.on_goal_met);
    setOnTaskTimeout(triggerItem.on_task_timeout);
    setOnToolCall(triggerItem.on_tool_call);
    setOnTaskCreate(triggerItem.on_task_create);
    setIntervalMsg(triggerItem.interval_message);
    setFindingMsg(triggerItem.finding_message);
    setGoalMsg(triggerItem.goal_message);
    setTaskTimeoutMsg(triggerItem.task_timeout_message);
    setToolCallMsg(triggerItem.tool_call_message);
    setTaskCreateMsg(triggerItem.task_create_message);
    setToolNames(triggerItem.tool_names ?? []);
  }

  async function submit() {
    const n = onInterval ? Math.max(1, Math.floor(Number(intervalSec) || 0)) : 0;
    if (n === 0 && !onFinding && !onGoalMet && !onTaskTimeout && !onToolCall && !onTaskCreate) {
      toast.error(t.needConditionErr);
      return;
    }
    if (onToolCall && toolNames.length === 0) {
      toast.error(t.needToolErr);
      return;
    }
    const body = {
      interval_sec: n,
      on_finding: onFinding,
      on_goal_met: onGoalMet,
      on_task_timeout: onTaskTimeout,
      on_tool_call: onToolCall,
      on_task_create: onTaskCreate,
      interval_message: intervalMsg.trim(),
      finding_message: findingMsg.trim(),
      goal_message: goalMsg.trim(),
      task_timeout_message: taskTimeoutMsg.trim(),
      tool_call_message: toolCallMsg.trim(),
      task_create_message: taskCreateMsg.trim(),
      tool_names: onToolCall ? toolNames : [],
    };
    setSaving(true);
    try {
      if (editingId != null) {
        const cur = triggers.find((x) => x.id === editingId);
        await api.updateTrigger(editingId, { ...body, enabled: cur?.enabled ?? true });
        toast.success(t.triggerUpdated);
      } else {
        await api.createTrigger(agentKey, { ...body, enabled: true });
        toast.success(t.triggerAdded);
      }
      resetForm();
      reload();
    } catch (e) {
      toast.error((editingId != null ? t.saveFailed : t.saveFailed) + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(triggerItem: AgentTrigger) {
    try {
      await api.updateTrigger(triggerItem.id, {
        enabled: !triggerItem.enabled,
        interval_sec: triggerItem.interval_sec,
        on_finding: triggerItem.on_finding,
        on_goal_met: triggerItem.on_goal_met,
        on_task_timeout: triggerItem.on_task_timeout,
        on_tool_call: triggerItem.on_tool_call,
        on_task_create: triggerItem.on_task_create,
        interval_message: triggerItem.interval_message,
        finding_message: triggerItem.finding_message,
        goal_message: triggerItem.goal_message,
        task_timeout_message: triggerItem.task_timeout_message,
        tool_call_message: triggerItem.tool_call_message,
        task_create_message: triggerItem.task_create_message,
        tool_names: triggerItem.tool_names,
      });
      reload();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    }
  }

  async function del(id: number) {
    try {
      await api.deleteTrigger(id);
      if (editingId === id) resetForm();
      reload();
    } catch (e) {
      toast.error(t.delFailed + (e as Error).message);
    }
  }

  function condLabel(triggerItem: AgentTrigger): string {
    const parts: string[] = [];
    if (triggerItem.interval_sec > 0) parts.push(t.everySecFmt.replace("{sec}", String(triggerItem.interval_sec)));
    if (triggerItem.on_finding) parts.push(t.findingCond);
    if (triggerItem.on_goal_met) parts.push(t.goalCond);
    if (triggerItem.on_task_timeout) parts.push(t.timeoutCond);
    if (triggerItem.on_tool_call) parts.push(t.toolCallCond.replace("{count}", String(triggerItem.tool_names.length)));
    if (triggerItem.on_task_create) parts.push(t.taskCreateCond);
    return parts.join(" · ") || t.noConditions;
  }

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-xs">{t.triggersIntro}</p>

      <div className="grid gap-3 rounded-md border p-3">
        <Label className="text-muted-foreground text-xs">{t.triggerStrategyTitle}</Label>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid gap-1">
            <Label className="text-xs">{t.runModeLabel}</Label>
            <Select
              value={runMode}
              onValueChange={(v) => {
                const rm = v as "serial" | "parallel";
                setRunMode(rm);
                void saveBehavior({ trigger_run_mode: rm });
              }}
            >
              <SelectTrigger size="sm" className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="serial">{t.serialMode}</SelectItem>
                <SelectItem value="parallel">{t.parallelMode}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs">{t.mergeModeLabel}</Label>
            <Select
              value={mergeMode}
              disabled={runMode === "parallel"}
              onValueChange={(v) => {
                const mm = v as "by_task" | "all" | "none";
                setMergeMode(mm);
                void saveBehavior({ trigger_merge_mode: mm });
              }}
            >
              <SelectTrigger size="sm" className="h-8 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="by_task">{t.mergeByTask}</SelectItem>
                <SelectItem value="all">{t.mergeAll}</SelectItem>
                <SelectItem value="none">{t.mergeNone}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {runMode === "parallel" && (
            <div className="grid gap-1">
              <Label htmlFor="tr-maxpar" className="text-xs">
                {t.maxParallelLabel}
              </Label>
              <Input
                id="tr-maxpar"
                type="number"
                min={0}
                className="h-8 w-28"
                value={maxParallel}
                onChange={(e) => setMaxParallel(e.target.value)}
                onBlur={() => {
                  const n = Math.max(0, Math.floor(Number(maxParallel) || 0));
                  setMaxParallel(String(n));
                  void saveBehavior({ trigger_max_parallel: n });
                }}
              />
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {runMode === "parallel"
            ? t.parallelDesc
            : mergeMode === "by_task"
              ? t.serialByTaskDesc
              : mergeMode === "all"
                ? t.serialAllDesc
                : t.serialNoneDesc}
        </p>
      </div>

      <div className="grid gap-3 rounded-md border p-3">
        <Label className="text-muted-foreground text-xs">
          {editingId != null ? t.editTriggerTitle.replace("{id}", String(editingId)) : t.newTriggerTitle}
        </Label>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox id="tr-check-interval" checked={onInterval} onCheckedChange={(v) => setOnInterval(!!v)} />
            <Label htmlFor="tr-check-interval" className="cursor-pointer">
              {t.checkInterval}
            </Label>
          </div>
          {onInterval && (
            <div className="grid gap-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="tr-interval" className="text-xs">
                  {t.every}
                </Label>
                <Input
                  id="tr-interval"
                  type="number"
                  min={1}
                  className="h-8 w-24"
                  value={intervalSec}
                  onChange={(e) => setIntervalSec(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">{t.secondsUnit}</span>
              </div>
              <Textarea
                className="text-xs"
                rows={2}
                value={intervalMsg}
                placeholder={t.intervalPlaceholder}
                onChange={(e) => setIntervalMsg(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox id="tr-check-finding" checked={onFinding} onCheckedChange={(v) => setOnFinding(!!v)} />
            <Label htmlFor="tr-check-finding" className="cursor-pointer">
              {t.checkFinding}
            </Label>
          </div>
          {onFinding && (
            <Textarea
              className="text-xs"
              rows={2}
              value={findingMsg}
              placeholder={t.findingPlaceholder}
              onChange={(e) => setFindingMsg(e.target.value)}
            />
          )}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox id="tr-check-goal" checked={onGoalMet} onCheckedChange={(v) => setOnGoalMet(!!v)} />
            <Label htmlFor="tr-check-goal" className="cursor-pointer">
              {t.checkGoal}
            </Label>
          </div>
          {onGoalMet && (
            <Textarea
              className="text-xs"
              rows={2}
              value={goalMsg}
              placeholder={t.goalPlaceholder}
              onChange={(e) => setGoalMsg(e.target.value)}
            />
          )}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox id="tr-check-timeout" checked={onTaskTimeout} onCheckedChange={(v) => setOnTaskTimeout(!!v)} />
            <Label htmlFor="tr-check-timeout" className="cursor-pointer">
              {t.checkTimeout}
            </Label>
          </div>
          {onTaskTimeout && (
            <Textarea
              className="text-xs"
              rows={2}
              value={taskTimeoutMsg}
              placeholder={t.timeoutPlaceholder}
              onChange={(e) => setTaskTimeoutMsg(e.target.value)}
            />
          )}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox id="tr-check-toolcall" checked={onToolCall} onCheckedChange={(v) => setOnToolCall(!!v)} />
            <Label htmlFor="tr-check-toolcall" className="cursor-pointer">
              {t.checkToolCall}
            </Label>
          </div>
          {onToolCall && (
            <div className="grid gap-1.5">
              <div className="text-muted-foreground text-xs">
                {t.toolCallDesc.replace("{count}", String(toolNames.length))}
              </div>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                {tools.length === 0 && <span className="text-muted-foreground text-xs">{t.noToolsList}</span>}
                <div className="grid gap-1">
                  {tools.map((item) => (
                    <div key={item.key} className="flex items-start gap-2 text-xs">
                      <Checkbox
                        id={"tr-tool-" + item.key}
                        className="mt-0.5"
                        checked={toolNames.includes(item.key)}
                        onCheckedChange={() => toggleTool(item.key)}
                      />
                      <Label htmlFor={"tr-tool-" + item.key} className="min-w-0 cursor-pointer font-normal">
                        <span className="font-medium">{item.key}</span>
                        {item.description && (
                          <span className="text-muted-foreground line-clamp-1"> {item.description}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <Textarea
                className="text-xs"
                rows={2}
                value={toolCallMsg}
                placeholder={t.toolCallPlaceholder}
                onChange={(e) => setToolCallMsg(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox id="tr-check-create" checked={onTaskCreate} onCheckedChange={(v) => setOnTaskCreate(!!v)} />
            <Label htmlFor="tr-check-create" className="cursor-pointer">
              {t.checkTaskCreate}
            </Label>
          </div>
          {onTaskCreate && (
            <Textarea
              className="text-xs"
              rows={2}
              value={taskCreateMsg}
              placeholder={t.taskCreatePlaceholder}
              onChange={(e) => setTaskCreateMsg(e.target.value)}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={submit} disabled={saving}>
            <SaveIcon /> {editingId != null ? t.saveChanges : t.addTrigger}
          </Button>
          {editingId != null && (
            <Button size="sm" variant="ghost" onClick={resetForm} disabled={saving}>
              <XIcon /> {t.cancelEdit}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="text-muted-foreground text-xs">{t.existingTriggers}</Label>
        {triggers.length === 0 && <span className="text-muted-foreground text-xs">{t.noExistingTriggers}</span>}
        {triggers.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-2 rounded-md border p-2 text-sm",
              editingId === item.id && "border-primary bg-primary/5",
            )}
          >
            <Switch checked={item.enabled} onCheckedChange={() => toggleEnabled(item)} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{condLabel(item)}</span>
                {!item.enabled && (
                  <Badge variant="outline" className="text-destructive px-1 py-0 text-[9px]">
                    {t.disabledBadge}
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground grid gap-0.5 text-xs">
                {item.interval_sec > 0 && item.interval_message && (
                  <div className="line-clamp-1">
                    {t.timedPrefix}
                    {item.interval_message}
                  </div>
                )}
                {item.on_finding && item.finding_message && (
                  <div className="line-clamp-1">
                    {t.findingPrefix}
                    {item.finding_message}
                  </div>
                )}
                {item.on_goal_met && item.goal_message && (
                  <div className="line-clamp-1">
                    {t.goalPrefix}
                    {item.goal_message}
                  </div>
                )}
                {item.on_task_timeout && item.task_timeout_message && (
                  <div className="line-clamp-1">
                    {t.timeoutPrefix}
                    {item.task_timeout_message}
                  </div>
                )}
                {item.on_task_create && item.task_create_message && (
                  <div className="line-clamp-1">
                    {t.taskCreatePrefix}
                    {item.task_create_message}
                  </div>
                )}
                {item.on_tool_call && (
                  <>
                    <div className="line-clamp-1">
                      {t.toolPrefix}
                      {item.tool_names.join(", ") || t.noConditions}
                    </div>
                    {item.tool_call_message && (
                      <div className="line-clamp-1">
                        {t.msgPrefix}
                        {item.tool_call_message}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => startEdit(item)}
              title={t.edit}
            >
              <PencilIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => del(item.id)}
              title={t.delete}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
