import type { Locale } from "./i18n";

export interface AgentTranslation {
  name: string;
  description: string;
}

export const AGENT_TRANSLATIONS: Record<Locale, Record<string, AgentTranslation>> = {
  en: {
    auto: {
      name: "Auto",
      description: "Platform Assistant: Manage tasks and assets with tools, create/edit skills, custom tools, and MCP connectors.",
    },
    pentest: {
      name: "Penetration Testing",
      description: "Autonomous Pentest Agent: Full lifecycle from reconnaissance and attack surface discovery to deep exploitation, verification, and wrap-up.",
    },
    reporter: {
      name: "Report Generation",
      description: "Vulnerability Report Agent: Automatically triggered on finding discovery to compile detailed reproduction and remediation Markdown reports.",
    },
    retester: {
      name: "Vulnerability Retesting",
      description: "Vulnerability Retest Agent: Verifies findings in independent sessions using historical evidence and outputs conclusions.",
    },
    goals: {
      name: "Goal Decomposition",
      description: "Deconstructs pentest objectives into independent, verifiable sub-goals.",
    },
    planner: {
      name: "Planner",
      description: "Analyzes system posture and objectives, scheduling exploration intents for uncovered areas.",
    },
    mainagent: {
      name: "Main Agent",
      description: "Human-machine interface: observes progress and turns human intent into hints or high-priority intents.",
    },
    worker: {
      name: "Worker",
      description: "Executes an intent, writing discovered facts and vulnerabilities back to the graph before stopping.",
    },
  },
  pt: {
    auto: {
      name: "Auto",
      description: "Assistente da Plataforma: Gerencie tarefas e ativos com ferramentas, crie/edite skills, ferramentas customizadas e conectores MCP.",
    },
    pentest: {
      name: "Teste de Intrusão",
      description: "Agente de Pentest Autônomo: Ciclo completo desde reconhecimento e superfície de ataque até exploração profunda, verificação e encerramento.",
    },
    reporter: {
      name: "Geração de Relatórios",
      description: "Agente de Relatório: Disparado ao encontrar vulnerabilidades para compilar relatórios detalhados de reprodução e correção em Markdown.",
    },
    retester: {
      name: "Reteste de Vulnerabilidades",
      description: "Agente de Reteste: Verifica vulnerabilidades em sessões independentes com base em evidências anteriores.",
    },
    goals: {
      name: "Decomposição de Metas",
      description: "Decompõe os objetivos de pentest em submetas independentes e verificáveis.",
    },
    planner: {
      name: "Planejador",
      description: "Analisa a postura e objetivos, agendando intenções de exploração para áreas não cobertas.",
    },
    mainagent: {
      name: "Agente Principal",
      description: "Interface homem-máquina: observa o progresso e converte intenções humanas em dicas ou intenções prioritárias.",
    },
    worker: {
      name: "Executor",
      description: "Executa uma intenção, registrando fatos e vulnerabilidades descobertos no grafo antes de parar.",
    },
  },
  zh: {
    auto: {
      name: "Auto",
      description: "平台操作助手：用工具管理任务(建/看/暂停/给提示)与资产，并可创建/修改 skill、自定义工具、MCP。",
    },
    pentest: {
      name: "渗透测试",
      description: "独立渗透 agent：一人从侦察→找攻击面→深入利用→验证→收尾走完整条链，自己规划、自己执行、自己对抗式验证。",
    },
    reporter: {
      name: "报告撰写",
      description: "漏洞详细报告撰写：发现漏洞时自动触发，查取证据与执行过程后写 Markdown 报告并回写。",
    },
    retester: {
      name: "漏洞复测",
      description: "从漏洞详情手动启动，读取原证据并保存独立复测结论。",
    },
    goals: {
      name: "目标拆解",
      description: "把渗透任务目标拆解成若干独立、可验证的子目标。",
    },
    planner: {
      name: "规划",
      description: "读取态势、判定目标，只在确有未覆盖的新方向时补充探索意图（每任务一个规划循环）。",
    },
    mainagent: {
      name: "主",
      description: "人机接口：观察进展，把人的意图落成 hint 或高优先级意图。",
    },
    worker: {
      name: "执行",
      description: "领取一条意图执行，把发现的事实/漏洞写回知识图谱后停止。",
    },
  },
};

export function getAgentDisplayName(key: string, rawName: string, locale: Locale): string {
  const trans = AGENT_TRANSLATIONS[locale]?.[key];
  if (trans) return trans.name;
  return rawName;
}

export function getAgentDisplayDescription(key: string, rawDescription: string | undefined, locale: Locale): string {
  const trans = AGENT_TRANSLATIONS[locale]?.[key];
  if (trans) return trans.description;
  return rawDescription ?? "";
}
