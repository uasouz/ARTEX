import type { NewAssetType } from "@/lib/types";

const ASSET_TYPE_LABELS: Record<string, Record<NewAssetType, string>> = {
  en: {
    app: "Application",
    endpoint: "Endpoint",
    ip: "IP",
    root_domain: "Root Domain",
    service: "Service",
    subdomain: "Subdomain",
  },
  pt: {
    app: "Aplicação",
    endpoint: "Endpoint",
    ip: "IP",
    root_domain: "Domínio Raiz",
    service: "Serviço",
    subdomain: "Subdomínio",
  },
  zh: {
    app: "应用",
    endpoint: "接口",
    ip: "IP",
    root_domain: "根域名",
    service: "服务",
    subdomain: "子域名",
  },
};

const TASK_ASSET_SOURCE_LABELS: Record<string, Record<string, string>> = {
  en: {
    agent: "Agent Discovery",
    anchor: "Blackboard Anchor",
    api: "Asset API",
    company: "Company Association",
    legacy: "Legacy Association",
    manual: "Manual Addition",
    system: "System Association",
    task: "Task Initialization",
  },
  pt: {
    agent: "Descoberta do Agente",
    anchor: "Âncora do Quadro",
    api: "API de Ativos",
    company: "Vínculo da Empresa",
    legacy: "Vínculo Legado",
    manual: "Adição Manual",
    system: "Vínculo do Sistema",
    task: "Inicialização da Tarefa",
  },
  zh: {
    agent: "Agent 发现",
    anchor: "黑板锚点",
    api: "资产 API",
    company: "企业关联",
    legacy: "历史关联",
    manual: "人工加入",
    system: "系统关联",
    task: "任务初始化",
  },
};

export function taskAssetTypeLabel(type: NewAssetType, locale: "en" | "pt" | "zh" = "en"): string {
  const dict = ASSET_TYPE_LABELS[locale] ?? ASSET_TYPE_LABELS.en;
  return dict[type] ?? type;
}

export function taskAssetSourceLabel(source: string, locale: "en" | "pt" | "zh" = "en"): string {
  const dict = TASK_ASSET_SOURCE_LABELS[locale] ?? TASK_ASSET_SOURCE_LABELS.en;
  return dict[source] ?? source;
}
