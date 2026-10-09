"use client";

import * as React from "react";

import { CpuIcon, FlaskConicalIcon, KeyboardIcon, RadioTowerIcon, SearchIcon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { type ChatSendMode, getChatSendModeOptions, setChatSendMode, useChatSendMode } from "@/lib/chat-send-mode";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Settings } from "@/lib/types";

import { UpdateCard } from "./_components/update-card";

const I18N = {
  en: {
    pageTitle: "System Settings",
    pageSubtitle: "Global Runtime Controls & Governance",
    errInvalidWorkers: "Concurrency worker count must be an integer greater than 0",
    savedWorkers: "Concurrent worker count saved (effective for newly launched tasks)",
    saveFailed: "Save failed: ",
    savedPython: "Python interpreter path saved",
    agentTrafficBindingOn: "Agent auto-traffic binding enabled",
    agentTrafficBindingOff: "Agent auto-traffic binding disabled",
    noaOn: "Context compaction enabled (effective for subsequent runs)",
    noaOff: "Context compaction disabled (restored built-in compaction)",
    savedWebSearch: "Web search configuration saved",
    savedBraveKey: "Brave Search API Key saved",
    savedTavilyKey: "Tavily Search API Key saved",
    proxySaved: (has: boolean) => (has ? "Egress proxy saved" : "Egress proxy cleared (direct connection)"),
    globalProxySaved: (has: boolean) => (has ? "Global proxy saved" : "Global proxy cleared (direct connection)"),
    testSuccess: (backend: string, count: number) => `Search test succeeded · ${backend} returned ${count} results`,
    testFailed: "Search test failed: ",
    unknownErr: "Unknown error",
    trafficCaptureTitle: "Traffic Capture",
    trafficCaptureDesc:
      "When enabled, all agent HTTP traffic is routed through the proxy recorder into the persistent store, injecting traffic_search / traffic_get tools into agents. When disabled (default), no proxy is assigned and no traffic recorded.",
    trafficCaptureOn: "Enabled · Recording traffic and injecting proxy",
    trafficCaptureOff: "Disabled · Direct connection, no proxy",
    agentBindingTitle: "Agent Auto-Traffic Binding",
    agentBindingDesc:
      "When enabled, reporting agents match HTTP request/response exchanges to findings before generating reports. Additional tool calls increase token usage. When disabled, manual traffic binding remains fully available.",
    agentBindingOn: "Enabled · Increases token consumption",
    agentBindingOff: "Disabled · Manual binding permitted",
    globalProxyTitle: "Global Egress Proxy",
    globalProxyDesc:
      "All target traffic routes through this egress proxy to conceal source IP or navigate jump hosts. Supports http, https, and socks5 protocols with optional credentials. Leave empty for direct network connection.",
    proxyAddressLabel: "Proxy Address",
    globalProxyPlaceholder: "socks5://user:pass@host:1080 or http://host:port (empty = direct)",
    saveBtn: "Save",
    globalProxyConfigured: "Configured · All target traffic routes through proxy",
    globalProxyDirect: "Not configured · Target traffic connects directly",
    constraintsTitle: "Operational Constraints Injection",
    constraintsDesc:
      "When enabled, operational constraints (allow/deny boundaries) from tasks are injected into agent system prompts (e.g. scope limits, test exclusions). You can selectively configure injection into Planner and Worker.",
    injectPlannerLabel: "Inject into Planner",
    injectWorkerLabel: "Inject into Worker",
    stateOn: " · Enabled",
    stateOff: " · Disabled",
    experimentalTitle: "Experimental Features",
    experimentalDesc:
      "Features under validation. May adjust agent behavior or impact stability. Context compaction delegates conversation compaction to dedicated model routines while archiving full context transcripts.",
    noaLabel: "Context Compaction Engine",
    webSearchTitle: "Web Search",
    webSearchDesc:
      "Master switch and provider configuration for web search. When enabled, agents can invoke web search tools for reconnaissance and external threat intelligence.",
    webSearchMasterOn: "Master switch enabled · Can be enabled individually per agent",
    webSearchMasterOff: "Disabled · Agents cannot use web search",
    searchBackendLabel: "Search Backend",
    selectBackendPlaceholder: "Select backend",
    deepseekTitle: "DeepSeek Official Online Search",
    deepseekNotice1:
      "Directly uses the currently active LLM profile. Requires official DeepSeek models with anthropic protocol endpoint.",
    deepseekNotice2:
      "Search requests are executed on DeepSeek server-side, consuming model tokens. Does not pass through local egress proxy.",
    deepseekNotice3: "Verify suitability using the test button below.",
    braveKeyLabel: "Brave Search API Key",
    configuredBadge: "Configured",
    bravePlaceholder: (set: boolean) => (set ? "Configured (leave empty to keep unchanged)" : "Enter Brave API Key"),
    braveNeedsKey: "Brave selected but API key missing — search tools remain inactive until saved.",
    braveFreeQuota: "Free quota ~2,000 requests/month. Obtain key at https://brave.com/search/api/.",
    tavilyKeyLabel: "Tavily Search API Key",
    tavilyPlaceholder: (set: boolean) =>
      set ? "Configured (leave empty to keep unchanged)" : "Enter Tavily API Key (tvly-...)",
    tavilyNeedsKey: "Tavily selected but API key missing — search tools remain inactive until saved.",
    tavilyQuota: "Register and obtain API key at https://tavily.com.",
    searchProxyLabel: "Egress Proxy (Optional)",
    searchProxyPlaceholder: "http://host:port or socks5://host:port (empty = direct)",
    searchProxyDesc: "Dedicated egress proxy for contacting search provider APIs.",
    testSearchDesc: "Tests current search settings with a sample query to verify connectivity.",
    testingBtn: "Testing...",
    testBtn: "Test Search",
    pythonTitle: "Custom Scripts · Python Interpreter",
    pythonDesc:
      "Custom script tools execute Python via this interpreter. Auto-detected on startup. You can specify a dedicated virtualenv or custom runtime binary path.",
    pythonPlaceholder: "/usr/bin/python3 (empty = auto-detect)",
    redetectBtn: "Re-detect",
    workersTitle: "Worker Concurrency · Agent Pool",
    workersDesc:
      "Number of concurrent worker agents executed per task (default 3). Higher numbers increase discovery speed and token throughput. Changes apply to newly launched tasks.",
    workersPlaceholder: "3",
    chatSendModeTitle: "Chat Input Send Shortcut",
    chatSendModeDesc:
      "Controls whether Enter sends messages or inserts newlines. Stored locally in browser preferences.",
    chatSendModeLabel: "Send Key Behavior",
  },
  pt: {
    pageTitle: "Configurações do Sistema",
    pageSubtitle: "Controles Globais de Execução e Governança",
    errInvalidWorkers: "O número de agentes concorrentes deve ser um inteiro maior que 0",
    savedWorkers: "Contagem de agentes simultâneos salva (válida para novas tarefas)",
    saveFailed: "Falha ao salvar: ",
    savedPython: "Caminho do interpretador Python salvo com sucesso",
    agentTrafficBindingOn: "Vinculação automática de tráfego de agentes ativada",
    agentTrafficBindingOff: "Vinculação automática de tráfego de agentes desativada",
    noaOn: "Compactação de contexto ativada (válida para próximas execuções)",
    noaOff: "Compactação de contexto desativada (compactação padrão restaurada)",
    savedWebSearch: "Configuração de busca web salva com sucesso",
    savedBraveKey: "Chave de API do Brave Search salva",
    savedTavilyKey: "Chave de API do Tavily Search salva",
    proxySaved: (has: boolean) => (has ? "Proxy de saída salvo" : "Proxy de saída removido (conexão direta)"),
    globalProxySaved: (has: boolean) => (has ? "Proxy global salvo" : "Proxy global removido (conexão direta)"),
    testSuccess: (backend: string, count: number) =>
      `Teste de busca bem-sucedido · ${backend} retornou ${count} resultados`,
    testFailed: "Falha no teste de busca: ",
    unknownErr: "Erro desconhecido",
    trafficCaptureTitle: "Captura de Tráfego",
    trafficCaptureDesc:
      "Quando ativado, todo o tráfego HTTP dos agentes passa pelo gravador proxy e é armazenado, injetando as ferramentas traffic_search e traffic_get. Quando desativado (padrão), nenhum proxy é configurado.",
    trafficCaptureOn: "Ativado · Registrando tráfego e injetando proxy",
    trafficCaptureOff: "Desativado · Sem gravação ou injeção de proxy",
    agentBindingTitle: "Vinculação Automática de Tráfego",
    agentBindingDesc:
      "Quando ativado, os agentes de relatório correlacionam pacotes HTTP a vulnerabilidades antes de redigir relatórios. Chamadas adicionais aumentam o consumo de tokens.",
    agentBindingOn: "Ativado · Aumenta consumo de tokens",
    agentBindingOff: "Desativado · Vinculação manual permitida",
    globalProxyTitle: "Proxy Global de Saída",
    globalProxyDesc:
      "Todo o tráfego direcionado a alvos passa por este proxy (oculta IP de origem / bastião). Suporta http, https e socks5 com autenticação opcional. Vazio = conexão direta.",
    proxyAddressLabel: "Endereço do Proxy",
    globalProxyPlaceholder: "socks5://user:pass@host:1080 ou http://host:port (vazio = direto)",
    saveBtn: "Salvar",
    globalProxyConfigured: "Configurado · Todo o tráfego de alvos passa por este proxy",
    globalProxyDirect: "Não configurado · Tráfego direto aos alvos",
    constraintsTitle: "Injeção de Restrições Operacionais",
    constraintsDesc:
      "Quando ativado, as regras de restrição operacional (allow/deny) são injetadas nas instruções de sistema dos agentes. Pode ser configurado individualmente para o Planejador (Planner) e Executor (Worker).",
    injectPlannerLabel: "Injetar no Planejador (Planner)",
    injectWorkerLabel: "Injetar no Executor (Worker)",
    stateOn: " · Ativado",
    stateOff: " · Desativado",
    experimentalTitle: "Recursos Experimentais",
    experimentalDesc:
      "Mecanismos em fase de validação. A compactação de contexto gerencia o histórico longo de mensagens através de modelos auxiliares, arquivando dados no diretório de trabalho.",
    noaLabel: "Motor de Compactação de Contexto",
    webSearchTitle: "Busca Web",
    webSearchDesc:
      "Chave geral e configuração de provedores para busca web. Quando ativado, os agentes podem invocar pesquisa externa para coleta de inteligência.",
    webSearchMasterOn: "Chave geral ativada · Pode ser habilitada em cada agente",
    webSearchMasterOff: "Desativado · Agentes não podem utilizar busca web",
    searchBackendLabel: "Provedor de Busca",
    selectBackendPlaceholder: "Selecione o provedor",
    deepseekTitle: "Busca Web Oficial DeepSeek",
    deepseekNotice1:
      "Utiliza o perfil LLM ativo no momento. Requer modelos oficiais da DeepSeek com protocolo anthropic.",
    deepseekNotice2:
      "A pesquisa é executada nos servidores da DeepSeek, consumindo tokens. Não passa pelo proxy de saída local.",
    deepseekNotice3: "Verifique a conectividade usando o botão de teste abaixo.",
    braveKeyLabel: "Chave de API Brave Search",
    configuredBadge: "Configurado",
    bravePlaceholder: (set: boolean) =>
      set ? "Configurado (deixe em branco para manter)" : "Informe a Chave API Brave",
    braveNeedsKey: "Brave selecionado sem chave de API — ferramenta desativada até que a chave seja salva.",
    braveFreeQuota: "Cota gratuita ~2.000 requisições/mês. Obtenha sua chave em https://brave.com/search/api/.",
    tavilyKeyLabel: "Chave de API Tavily Search",
    tavilyPlaceholder: (set: boolean) =>
      set ? "Configurado (deixe em branco para manter)" : "Informe a Chave API Tavily (tvly-...)",
    tavilyNeedsKey: "Tavily selecionado sem chave de API — ferramenta desativada até que a chave seja salva.",
    tavilyQuota: "Cadastre-se e obtenha sua chave em https://tavily.com.",
    searchProxyLabel: "Proxy de Saída (Opcional)",
    searchProxyPlaceholder: "http://host:port ou socks5://host:port (vazio = direto)",
    searchProxyDesc: "Proxy de saída isolado para chamadas às APIs de busca.",
    testSearchDesc: "Realiza uma consulta de teste para validar os parâmetros de conexão.",
    testingBtn: "Testando...",
    testBtn: "Testar Busca",
    pythonTitle: "Scripts Customizados · Interpretador Python",
    pythonDesc:
      "Ferramentas do tipo script utilizam este interpretador Python. Detectado automaticamente na inicialização.",
    pythonPlaceholder: "/usr/bin/python3 (vazio = autodetectar)",
    redetectBtn: "Redetectar",
    workersTitle: "Concorrência · Agentes de Execução",
    workersDesc:
      "Quantidade de agentes executores concorrentes por tarefa (padrão: 3). Valores maiores aceleram a descoberta. Aplica-se a novas tarefas.",
    workersPlaceholder: "3",
    chatSendModeTitle: "Atalho de Envio no Chat",
    chatSendModeDesc: "Define o comportamento da tecla Enter no editor de mensagens. Salvo no navegador local.",
    chatSendModeLabel: "Modo de Envio",
  },
  zh: {
    pageTitle: "系统配置",
    pageSubtitle: "全局运行时开关",
    errInvalidWorkers: "并发数必须是大于 0 的整数",
    savedWorkers: "已保存并发工作 agent 数（对之后启动的任务生效）",
    saveFailed: "保存失败：",
    savedPython: "已保存 Python 解释器配置",
    agentTrafficBindingOn: "已开启 Agent 自动绑定流量",
    agentTrafficBindingOff: "已关闭 Agent 自动绑定流量",
    noaOn: "已开启 noa 上下文压缩（对之后启动的运行生效）",
    noaOff: "已关闭 noa 上下文压缩（恢复内置压缩）",
    savedWebSearch: "已保存网络搜索配置",
    savedBraveKey: "已保存 Brave API Key",
    savedTavilyKey: "已保存 Tavily API Key",
    proxySaved: (has: boolean) => (has ? "已保存出口代理" : "已清除出口代理（改为直连）"),
    globalProxySaved: (has: boolean) => (has ? "已保存全局代理" : "已清除全局代理（改为直连）"),
    testSuccess: (backend: string, count: number) => `搜索测试成功 · ${backend} 返回 ${count} 条结果`,
    testFailed: "搜索测试失败：",
    unknownErr: "未知错误",
    trafficCaptureTitle: "流量捕获",
    trafficCaptureDesc:
      "开启后，所有 Agent 的 HTTP 流量经记录代理全量落库，并向 Agent 注入 traffic_search / traffic_get 工具与代理配置（提示词含代理说明）。关闭（默认）时不记录任何流量：Agent 不会拿到代理配置与流量工具，提示词也不含代理相关内容。切换后会即时重建 Agent 生效。",
    trafficCaptureOn: "已开启 · 正在记录流量并注入代理",
    trafficCaptureOff: "已关闭 · 不记录、不注入代理",
    agentBindingTitle: "Agent 自动绑定流量",
    agentBindingDesc:
      "默认关闭。开启后，漏洞入库时触发的报告 Agent 会核对应有 HTTP 请求/响应，关联对应流量后再编写报告。查阅数据包及额外的工具调用会增加 Token 消耗。此开关不影响流量捕获、人工绑定及已保存证据的查看。",
    agentBindingOn: "已开启 · 会增加 Token 消耗",
    agentBindingOff: "已关闭 · 可继续人工绑定",
    globalProxyTitle: "全局代理",
    globalProxyDesc:
      "所有 Agent 的目标流量经此代理出网（隐藏源 IP / 走跳板）。支持 http / https / socks5，可带 user:pass 认证。留空=直连。开启流量捕获时，它作为记录代理的上游；关闭捕获时，直接注入 Agent 环境变量出网。",
    proxyAddressLabel: "代理地址",
    globalProxyPlaceholder: "socks5://user:pass@host:1080 或 http://host:port（留空=直连）",
    saveBtn: "保存",
    globalProxyConfigured: "已配置 · 所有目标流量经此代理出网",
    globalProxyDirect: "未配置 · 目标流量直连出网",
    constraintsTitle: "操作约束注入",
    constraintsDesc:
      "开启后，把每个任务的操作约束拼进对应 Agent 的系统提示，用来框定探索边界。可分别控制注入到规划者（planner）与执行者（worker）；默认都开。切换即时生效，无需重建 Agent。",
    injectPlannerLabel: "注入规划者（planner）",
    injectWorkerLabel: "注入执行者（worker）",
    stateOn: " · 已开启",
    stateOff: " · 已关闭",
    experimentalTitle: "实验功能",
    experimentalDesc:
      "尚在验证中的机制，默认关闭。可能改变 Agent 行为或影响稳定性，请在了解影响后启用。noa 上下文压缩由模型主动压缩长对话历史，压缩原文会归档到任务工作目录下便于回溯。",
    noaLabel: "noa 上下文压缩",
    webSearchTitle: "网络搜索",
    webSearchDesc:
      "这是网络搜索的总开关 + 来源配置。开启后，才能在每个 Agent 的配置里单独选择是否启用 web_search。网络搜索不走记录代理，独立于流量捕获。",
    webSearchMasterOn: "总开关已开启 · 可在各 Agent 配置里单独启用",
    webSearchMasterOff: "已关闭 · 各 Agent 无法启用网络搜索",
    searchBackendLabel: "搜索来源",
    selectBackendPlaceholder: "选择来源",
    deepseekTitle: "DeepSeek 官方联网搜索",
    deepseekNotice1: "该来源直接复用当前激活的 LLM 配置。因此它仅支持 DeepSeek 官方模型，且必须使用 anthropic 协议。",
    deepseekNotice2: "搜索由 DeepSeek 服务端执行，消耗模型调用 Token。不经过出口代理，也不计入流量留痕。",
    deepseekNotice3: "是否满足上述条件由你自行确认，系统不做拦截；可用下方按钮验证。",
    braveKeyLabel: "Brave Search API Key",
    configuredBadge: "已配置",
    bravePlaceholder: (set: boolean) => (set ? "已配置（留空则不变）" : "输入 Brave API Key"),
    braveNeedsKey: "已选择 Brave 但尚未配置 Key —— 在保存 Key 之前，搜索工具不会启用。",
    braveFreeQuota: "免费版额度约 2,000 次/月。前往 https://brave.com/search/api/ 获取 Key。",
    tavilyKeyLabel: "Tavily Search API Key",
    tavilyPlaceholder: (set: boolean) => (set ? "已配置（留空则不变）" : "输入 Tavily API Key（tvly-…）"),
    tavilyNeedsKey: "已选择 Tavily 但尚未配置 Key —— 在保存 Key 之前，搜索工具不会启用。",
    tavilyQuota: "前往 https://tavily.com 注册并获取 API Key。",
    searchProxyLabel: "出口代理（可选）",
    searchProxyPlaceholder: "http://host:port 或 socks5://host:port（留空=直连）",
    searchProxyDesc: "独立出口代理，仅用于访问搜索端点（VPN/SOCKS 等）。与记录流量的 MITM 代理无关。",
    testSearchDesc: "用当前配置（来源 + 代理 + Key）实际搜索一次「test」，验证是否可用。",
    testingBtn: "测试中…",
    testBtn: "测试搜索",
    pythonTitle: "自定义脚本 · Python 解释器",
    pythonDesc: "自定义 script 类型工具用它跑 Python。开机会自动检测（python3 优先）；此处可手填 venv 或绝对路径。",
    pythonPlaceholder: "/usr/bin/python3（留空=自动检测）",
    redetectBtn: "重新检测",
    workersTitle: "工作并发 · Work Agent 数",
    workersDesc: "每个任务并发运行的工作 agent 数量（默认 3）。数值越大并发探测越多。修改后对之后启动的任务生效。",
    workersPlaceholder: "3",
    chatSendModeTitle: "会话输入框发送键位",
    chatSendModeDesc: "对话页与任务详情的主 Agent 会话输入框共用此设置，选择后立即生效。该偏好只存在本浏览器。",
    chatSendModeLabel: "发送方式",
  },
};

export default function SystemSettingsPage() {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [trafficCapture, setTrafficCapture] = React.useState(false);
  const [agentTrafficBinding, setAgentTrafficBinding] = React.useState(false);
  const [webSearch, setWebSearch] = React.useState(false);
  const [backend, setBackend] = React.useState("ddgs");
  const [braveKeySet, setBraveKeySet] = React.useState(false);
  const [braveKeyInput, setBraveKeyInput] = React.useState("");
  const [tavilyKeySet, setTavilyKeySet] = React.useState(false);
  const [tavilyKeyInput, setTavilyKeyInput] = React.useState("");
  const [savingTavilyKey, setSavingTavilyKey] = React.useState(false);
  const [proxyInput, setProxyInput] = React.useState("");
  const [savingProxy, setSavingProxy] = React.useState(false);
  const [globalProxyInput, setGlobalProxyInput] = React.useState("");
  const [savingGlobalProxy, setSavingGlobalProxy] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savingKey, setSavingKey] = React.useState(false);
  const [pyInterp, setPyInterp] = React.useState("");
  const [workers, setWorkers] = React.useState("3");
  const [savingWorkers, setSavingWorkers] = React.useState(false);
  const [injectPlanner, setInjectPlanner] = React.useState(true);
  const [injectWorker, setInjectWorker] = React.useState(true);
  const [noaCompaction, setNoaCompaction] = React.useState(false);

  const sendMode = useChatSendMode();

  const apply = React.useCallback((s: Settings) => {
    setTrafficCapture(!!s.traffic_capture);
    setAgentTrafficBinding(!!s.agent_traffic_binding);
    setWebSearch(!!s.web_search_enabled);
    setBackend(s.web_search_backend || "ddgs");
    setBraveKeySet(!!s.brave_key_set);
    setTavilyKeySet(!!s.tavily_key_set);
    setProxyInput(s.web_search_proxy ?? "");
    setGlobalProxyInput(s.global_proxy ?? "");
    setPyInterp(s.python_interpreter ?? "");
    setWorkers(String(s.workers ?? 3));
    setInjectPlanner(s.constraints_inject_planner !== false);
    setInjectWorker(s.constraints_inject_worker !== false);
    setNoaCompaction(!!s.noa_compaction);
  }, []);

  const saveWorkers = () => {
    const n = Number(workers);
    if (!Number.isInteger(n) || n <= 0) {
      toast.error(t.errInvalidWorkers);
      return;
    }
    setSavingWorkers(true);
    api
      .setSettings({ workers: n })
      .then((s) => {
        apply(s);
        toast.success(t.savedWorkers);
      })
      .catch((e) => toast.error(t.saveFailed + (e as Error).message))
      .finally(() => setSavingWorkers(false));
  };

  const savePython = () => {
    setSaving(true);
    api
      .setSettings({ python_interpreter: pyInterp.trim() })
      .then((s) => {
        apply(s);
        toast.success(t.savedPython);
      })
      .catch((e) => toast.error(t.saveFailed + (e as Error).message))
      .finally(() => setSaving(false));
  };

  const detectPython = () => {
    setSaving(true);
    api
      .detectPython()
      .then((r) => setPyInterp(r.python_interpreter))
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  React.useEffect(() => {
    api
      .settings()
      .then(apply)
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [apply]);

  const toggleTraffic = (v: boolean) => {
    setTrafficCapture(v);
    setSaving(true);
    api
      .setSettings({ traffic_capture: v })
      .then(apply)
      .catch(() => setTrafficCapture(!v))
      .finally(() => setSaving(false));
  };

  const toggleInjectPlanner = (v: boolean) => {
    setInjectPlanner(v);
    api
      .setSettings({ constraints_inject_planner: v })
      .then(apply)
      .catch(() => setInjectPlanner(!v));
  };

  const toggleAgentTrafficBinding = (v: boolean) => {
    setAgentTrafficBinding(v);
    setSaving(true);
    api
      .setSettings({ agent_traffic_binding: v })
      .then((s) => {
        apply(s);
        toast.success(v ? t.agentTrafficBindingOn : t.agentTrafficBindingOff);
      })
      .catch((e) => {
        setAgentTrafficBinding(!v);
        toast.error(t.saveFailed + (e as Error).message);
      })
      .finally(() => setSaving(false));
  };

  const toggleInjectWorker = (v: boolean) => {
    setInjectWorker(v);
    api
      .setSettings({ constraints_inject_worker: v })
      .then(apply)
      .catch(() => setInjectWorker(!v));
  };

  const toggleNoaCompaction = (v: boolean) => {
    setNoaCompaction(v);
    api
      .setSettings({ noa_compaction: v })
      .then((s) => {
        apply(s);
        toast.success(v ? t.noaOn : t.noaOff);
      })
      .catch((e) => {
        setNoaCompaction(!v);
        toast.error(t.saveFailed + (e as Error).message);
      });
  };

  const saveWebSearch = (patch: Partial<Settings>) => {
    setSaving(true);
    api
      .setSettings(patch)
      .then((s) => {
        apply(s);
        toast.success(t.savedWebSearch);
      })
      .catch((e) => {
        toast.error(t.saveFailed + (e as Error).message);
        api
          .settings()
          .then(apply)
          .catch(() => undefined);
      })
      .finally(() => setSaving(false));
  };

  const saveBraveKey = () => {
    setSavingKey(true);
    api
      .setSettings({ brave_search_api_key: braveKeyInput })
      .then((s) => {
        apply(s);
        setBraveKeyInput("");
        toast.success(t.savedBraveKey);
      })
      .catch((e) => toast.error(t.saveFailed + (e as Error).message))
      .finally(() => setSavingKey(false));
  };

  const saveTavilyKey = () => {
    setSavingTavilyKey(true);
    api
      .setSettings({ tavily_search_api_key: tavilyKeyInput })
      .then((s) => {
        apply(s);
        setTavilyKeyInput("");
        toast.success(t.savedTavilyKey);
      })
      .catch((e) => toast.error(t.saveFailed + (e as Error).message))
      .finally(() => setSavingKey(false));
  };

  const saveProxy = () => {
    setSavingProxy(true);
    api
      .setSettings({ web_search_proxy: proxyInput.trim() })
      .then((s) => {
        apply(s);
        toast.success(t.proxySaved(Boolean(proxyInput.trim())));
      })
      .catch((e) => toast.error(t.saveFailed + (e as Error).message))
      .finally(() => setSavingProxy(false));
  };

  const saveGlobalProxy = () => {
    setSavingGlobalProxy(true);
    api
      .setSettings({ global_proxy: globalProxyInput.trim() })
      .then((s) => {
        apply(s);
        toast.success(t.globalProxySaved(Boolean(globalProxyInput.trim())));
      })
      .catch((e) => toast.error(t.saveFailed + (e as Error).message))
      .finally(() => setSavingGlobalProxy(false));
  };

  const runTest = () => {
    setTesting(true);
    api
      .testWebSearch({
        web_search_backend: backend,
        web_search_proxy: proxyInput.trim(),
        brave_search_api_key: braveKeyInput,
        tavily_search_api_key: tavilyKeyInput,
      })
      .then((r) => {
        if (r.ok) toast.success(t.testSuccess(r.backend ?? backend, r.count ?? 0));
        else toast.error(t.testFailed + (r.error ?? t.unknownErr));
      })
      .catch((e) => toast.error(t.testFailed + (e as Error).message))
      .finally(() => setTesting(false));
  };

  const braveNeedsKey = webSearch && backend === "brave-free" && !braveKeySet;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t.pageTitle}</h1>
        <p className="text-muted-foreground text-sm">{t.pageSubtitle}</p>
      </div>

      <div className="columns-1 gap-4 md:gap-6 lg:columns-2">
        <UpdateCard />

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              {t.trafficCaptureTitle}
            </CardTitle>
            <CardDescription>{t.trafficCaptureDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="traffic-capture" className="text-sm font-normal text-muted-foreground">
              {trafficCapture ? t.trafficCaptureOn : t.trafficCaptureOff}
            </Label>
            <Switch
              id="traffic-capture"
              checked={trafficCapture}
              disabled={!loaded || saving}
              onCheckedChange={toggleTraffic}
            />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              {t.agentBindingTitle}
            </CardTitle>
            <CardDescription id="agent-traffic-binding-description">{t.agentBindingDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="agent-traffic-binding" className="text-sm font-normal text-muted-foreground">
              {agentTrafficBinding ? t.agentBindingOn : t.agentBindingOff}
            </Label>
            <Switch
              id="agent-traffic-binding"
              aria-describedby="agent-traffic-binding-description"
              checked={agentTrafficBinding}
              disabled={!loaded || saving}
              onCheckedChange={toggleAgentTrafficBinding}
            />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              {t.globalProxyTitle}
            </CardTitle>
            <CardDescription>{t.globalProxyDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Label htmlFor="global-proxy" className="text-sm font-normal text-muted-foreground">
              {t.proxyAddressLabel}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="global-proxy"
                autoComplete="off"
                placeholder={t.globalProxyPlaceholder}
                value={globalProxyInput}
                disabled={!loaded || savingGlobalProxy}
                onChange={(e) => setGlobalProxyInput(e.target.value)}
              />
              <Button type="button" onClick={saveGlobalProxy} disabled={!loaded || savingGlobalProxy}>
                {t.saveBtn}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {globalProxyInput.trim() ? t.globalProxyConfigured : t.globalProxyDirect}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlertIcon className="size-4" />
              {t.constraintsTitle}
            </CardTitle>
            <CardDescription>{t.constraintsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="inject-planner" className="text-sm font-normal text-muted-foreground">
                {t.injectPlannerLabel}
                {injectPlanner ? t.stateOn : t.stateOff}
              </Label>
              <Switch
                id="inject-planner"
                checked={injectPlanner}
                disabled={!loaded}
                onCheckedChange={toggleInjectPlanner}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="inject-worker" className="text-sm font-normal text-muted-foreground">
                {t.injectWorkerLabel}
                {injectWorker ? t.stateOn : t.stateOff}
              </Label>
              <Switch
                id="inject-worker"
                checked={injectWorker}
                disabled={!loaded}
                onCheckedChange={toggleInjectWorker}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConicalIcon className="size-4" />
              {t.experimentalTitle}
            </CardTitle>
            <CardDescription>{t.experimentalDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="noa-compaction" className="text-sm font-normal text-muted-foreground">
              {t.noaLabel}
              {noaCompaction ? t.stateOn : t.stateOff}
            </Label>
            <Switch
              id="noa-compaction"
              checked={noaCompaction}
              disabled={!loaded}
              onCheckedChange={toggleNoaCompaction}
            />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SearchIcon className="size-4" />
              {t.webSearchTitle}
            </CardTitle>
            <CardDescription>{t.webSearchDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="web-search" className="text-sm font-normal text-muted-foreground">
                {webSearch ? t.webSearchMasterOn : t.webSearchMasterOff}
              </Label>
              <Switch
                id="web-search"
                checked={webSearch}
                disabled={!loaded || saving}
                onCheckedChange={(v) => {
                  setWebSearch(v);
                  saveWebSearch({ web_search_enabled: v });
                }}
              />
            </div>

            {webSearch && (
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm font-normal text-muted-foreground">{t.searchBackendLabel}</Label>
                <Select
                  value={backend}
                  disabled={!loaded || saving}
                  onValueChange={(v) => {
                    setBackend(v);
                    saveWebSearch({ web_search_backend: v });
                  }}
                >
                  <SelectTrigger className="w-52 shrink-0">
                    <SelectValue placeholder={t.selectBackendPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ddgs">DuckDuckGo (ddgs)</SelectItem>
                    <SelectItem value="brave-free">Brave (API Key)</SelectItem>
                    <SelectItem value="tavily">Tavily (API Key)</SelectItem>
                    <SelectItem value="deepseek">DeepSeek (Online)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {webSearch && backend === "deepseek" && (
              <div className="border-border/60 bg-muted/30 flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-medium">{t.deepseekTitle}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{t.deepseekNotice1}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{t.deepseekNotice2}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{t.deepseekNotice3}</p>
              </div>
            )}

            {webSearch && backend === "brave-free" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="brave-key" className="text-sm font-normal text-muted-foreground">
                  {t.braveKeyLabel}
                  {braveKeySet && <span className="ml-2 text-xs text-emerald-500">{t.configuredBadge}</span>}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="brave-key"
                    type="password"
                    autoComplete="off"
                    placeholder={t.bravePlaceholder(braveKeySet)}
                    value={braveKeyInput}
                    disabled={!loaded || savingKey}
                    onChange={(e) => setBraveKeyInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={saveBraveKey}
                    disabled={!loaded || savingKey || braveKeyInput.trim() === ""}
                  >
                    {t.saveBtn}
                  </Button>
                </div>
                {braveNeedsKey && <p className="text-xs text-amber-500">{t.braveNeedsKey}</p>}
                <p className="text-muted-foreground text-xs">{t.braveFreeQuota}</p>
              </div>
            )}

            {webSearch && backend === "tavily" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="tavily-key" className="text-sm font-normal text-muted-foreground">
                  {t.tavilyKeyLabel}
                  {tavilyKeySet && <span className="ml-2 text-xs text-emerald-500">{t.configuredBadge}</span>}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tavily-key"
                    type="password"
                    autoComplete="off"
                    placeholder={t.tavilyPlaceholder(tavilyKeySet)}
                    value={tavilyKeyInput}
                    disabled={!loaded || savingTavilyKey}
                    onChange={(e) => setTavilyKeyInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={saveTavilyKey}
                    disabled={!loaded || savingTavilyKey || tavilyKeyInput.trim() === ""}
                  >
                    {t.saveBtn}
                  </Button>
                </div>
                {webSearch && backend === "tavily" && !tavilyKeySet && (
                  <p className="text-xs text-amber-500">{t.tavilyNeedsKey}</p>
                )}
                <p className="text-muted-foreground text-xs">{t.tavilyQuota}</p>
              </div>
            )}

            {webSearch && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-proxy" className="text-sm font-normal text-muted-foreground">
                  {t.searchProxyLabel}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ws-proxy"
                    autoComplete="off"
                    placeholder={t.searchProxyPlaceholder}
                    value={proxyInput}
                    disabled={!loaded || savingProxy}
                    onChange={(e) => setProxyInput(e.target.value)}
                  />
                  <Button type="button" onClick={saveProxy} disabled={!loaded || savingProxy}>
                    {t.saveBtn}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">{t.searchProxyDesc}</p>
              </div>
            )}

            {webSearch && (
              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <p className="text-muted-foreground text-xs">{t.testSearchDesc}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={runTest}
                  disabled={!loaded || testing}
                  className="shrink-0"
                >
                  {testing ? t.testingBtn : t.testBtn}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              {t.pythonTitle}
            </CardTitle>
            <CardDescription>{t.pythonDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                className="font-mono text-sm"
                placeholder={t.pythonPlaceholder}
                value={pyInterp}
                disabled={!loaded || saving}
                onChange={(e) => setPyInterp(e.target.value)}
              />
              <Button variant="outline" onClick={detectPython} disabled={!loaded || saving}>
                {t.redetectBtn}
              </Button>
              <Button onClick={savePython} disabled={!loaded || saving}>
                {t.saveBtn}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CpuIcon className="size-4" />
              {t.workersTitle}
            </CardTitle>
            <CardDescription>{t.workersDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                className="w-32 font-mono text-sm"
                placeholder={t.workersPlaceholder}
                value={workers}
                disabled={!loaded || savingWorkers}
                onChange={(e) => setWorkers(e.target.value)}
              />
              <Button onClick={saveWorkers} disabled={!loaded || savingWorkers}>
                {t.saveBtn}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyboardIcon className="size-4" />
              {t.chatSendModeTitle}
            </CardTitle>
            <CardDescription>{t.chatSendModeDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="chat-send-mode" className="text-sm font-normal text-muted-foreground">
              {t.chatSendModeLabel}
            </Label>
            <Select value={sendMode} onValueChange={(v) => setChatSendMode(v as ChatSendMode)}>
              <SelectTrigger id="chat-send-mode" className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getChatSendModeOptions(locale).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
