"use client";

import * as React from "react";

import { Bot, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { AgentEditor } from "@/components/agent-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import { getAgentDisplayName, getAgentDisplayDescription } from "@/lib/agent-i18n";
import type { Agent } from "@/lib/types";

const I18N = {
  en: {
    deletedAgent: (name: string) => `Agent "${name}" deleted`,
    delFailed: "Deletion failed: ",
    builtin: "Builtin",
    custom: "Custom",
    disabled: "Disabled",
    noDesc: "(No description)",
    tools: "Tools",
    delPrompt: (name: string) => `Delete Agent "${name}"?`,
    delDesc:
      "Prompts, variables, resource visibility, and tool bindings will be removed. This action cannot be undone.",
    cancel: "Cancel",
    delete: "Delete",
    createdAgent: (name: string) => `Agent "${name}" created`,
    createFailed: "Creation failed: ",
    newAgentBtn: "New Agent",
    createTitle: "Create Custom Agent",
    createDesc:
      "Create a conversational assistant. Key is used for internal identification (immutable); name and description identify the agent.",
    keyLabel: "Key",
    keyPlaceholder: "e.g. research_helper",
    keyHint: "Must start with a lowercase letter, containing only lowercase letters, numbers, and underscores",
    nameLabel: "Name",
    namePlaceholder: "e.g. Research Helper",
    descLabel: "Description",
    descPlaceholder: "One sentence explaining what this agent does",
    createBtn: "Create",
    pageTitle: "Agents",
    pageSubtitle: "Builtin agent prompts/configurations and custom conversational agent management",
    listTitle: "Agent Directory",
    listCount: (n: number) => `${n} total`,
    noAgents: "(No agents found)",
    defaultEditorDesc: "Prompts, configurations, visibility, and tool bindings",
  },
  pt: {
    deletedAgent: (name: string) => `Agente "${name}" excluído`,
    delFailed: "Falha na exclusão: ",
    builtin: "Integrado",
    custom: "Personalizado",
    disabled: "Desativado",
    noDesc: "(Sem descrição)",
    tools: "Ferramentas",
    delPrompt: (name: string) => `Excluir Agente "${name}"?`,
    delDesc:
      "Instruções, variáveis, visibilidade de recursos e vínculos de ferramentas serão removidos permanentemente.",
    cancel: "Cancelar",
    delete: "Excluir",
    createdAgent: (name: string) => `Agente "${name}" criado`,
    createFailed: "Falha na criação: ",
    newAgentBtn: "Novo Agente",
    createTitle: "Criar Agente Personalizado",
    createDesc:
      "Crie um assistente de conversação. A chave é o identificador interno imutável; nome e descrição identificam o agente.",
    keyLabel: "Chave (Key)",
    keyPlaceholder: "ex: research_helper",
    keyHint: "Deve começar com letra minúscula, contendo apenas letras minúsculas, números e sublinhados",
    nameLabel: "Nome",
    namePlaceholder: "ex: Assistente de Pesquisa",
    descLabel: "Descrição",
    descPlaceholder: "Breve resumo do propósito deste agente",
    createBtn: "Criar",
    pageTitle: "Agentes",
    pageSubtitle: "Prompts e parâmetros dos agentes nativos e gestão de agentes conversacionais customizados",
    listTitle: "Lista de Agentes",
    listCount: (n: number) => `${n} no total`,
    noAgents: "(Nenhum agente encontrado)",
    defaultEditorDesc: "Prompts, parâmetros, visibilidade de recursos e ferramentas vinculadas",
  },
  zh: {
    deletedAgent: (name: string) => `已删除 Agent「${name}」`,
    delFailed: "删除失败：",
    builtin: "内置",
    custom: "自定义",
    disabled: "已停用",
    noDesc: "（无描述）",
    tools: "工具",
    delPrompt: (name: string) => `删除 Agent「${name}」？`,
    delDesc: "将一并删除它的提示词、变量、可见性与工具绑定。此操作不可撤销。",
    cancel: "取消",
    delete: "删除",
    createdAgent: (name: string) => `已创建 Agent「${name}」`,
    createFailed: "创建失败：",
    newAgentBtn: "新建 Agent",
    createTitle: "新建自定义 Agent",
    createDesc: "创建一个会话型助手。key 用于内部标识，创建后不可更改；名称与描述用于识别。",
    keyLabel: "Key",
    keyPlaceholder: "如 research_helper",
    keyHint: "小写字母开头，仅含小写字母/数字/下划线",
    nameLabel: "名称",
    namePlaceholder: "如 研究助手",
    descLabel: "描述",
    descPlaceholder: "一句话说明这个 Agent 是干什么的",
    createBtn: "创建",
    pageTitle: "Agent",
    pageSubtitle: "内置 Agent 的提示词/配置，以及自定义会话 Agent 的创建与管理",
    listTitle: "Agent 清单",
    listCount: (n: number) => `共 ${n} 个`,
    noAgents: "（暂无 Agent）",
    defaultEditorDesc: "提示词、配置、可见资源与工具绑定",
  },
};

function AgentGridCard({ agent, onOpen, onDeleted }: { agent: Agent; onOpen: () => void; onDeleted: () => void }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  async function del() {
    try {
      await api.deleteAgent(agent.key);
      toast.success(t.deletedAgent(agent.name));
      onDeleted();
    } catch (e) {
      toast.error(t.delFailed + (e as Error).message);
    }
  }

  return (
    <div className="hover:border-primary/50 group relative flex flex-col gap-2 rounded-lg border p-4 transition-colors">
      <button type="button" onClick={onOpen} className="flex flex-col gap-2 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <Bot className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">{getAgentDisplayName(agent.key, agent.name, locale)}</span>
          <span className="text-muted-foreground font-mono text-xs">{agent.key}</span>
          {agent.builtin ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {t.builtin}
            </Badge>
          ) : (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {t.custom}
            </Badge>
          )}
          {!agent.enabled && (
            <Badge variant="outline" className="text-destructive px-1.5 py-0 text-[10px]">
              {t.disabled}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground line-clamp-2 min-h-8 text-xs">
          {getAgentDisplayDescription(agent.key, agent.description, locale) || t.noDesc}
        </p>
        <div className="text-muted-foreground flex flex-wrap gap-1.5 text-[10px]">
          <span className="rounded border px-1.5 py-0.5">MCP {agent.mcp_count ?? 0}</span>
          <span className="rounded border px-1.5 py-0.5">Skill {agent.skill_count ?? 0}</span>
          <span className="rounded border px-1.5 py-0.5">
            {t.tools} {agent.tool_count ?? 0}
          </span>
        </div>
      </button>
      {!agent.builtin && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.delPrompt(agent.name)}</AlertDialogTitle>
              <AlertDialogDescription>{t.delDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={del}>{t.delete}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function CreateAgentDialog({ onCreated }: { onCreated: (key: string) => void }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [open, setOpen] = React.useState(false);
  const [key, setKey] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function create() {
    setBusy(true);
    try {
      const a = await api.createAgent(key.trim(), name.trim(), description.trim());
      toast.success(t.createdAgent(a.name));
      setOpen(false);
      setKey("");
      setName("");
      setDescription("");
      onCreated(a.key);
    } catch (e) {
      toast.error(t.createFailed + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const keyOk = /^[a-z][a-z0-9_]*$/.test(key.trim());
  const canCreate = keyOk && name.trim().length > 0 && !busy;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> {t.newAgentBtn}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.createTitle}</DialogTitle>
          <DialogDescription>{t.createDesc}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="agent-key">{t.keyLabel}</Label>
            <Input
              id="agent-key"
              placeholder={t.keyPlaceholder}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="font-mono"
            />
            {key.length > 0 && !keyOk && <span className="text-destructive text-xs">{t.keyHint}</span>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="agent-name">{t.nameLabel}</Label>
            <Input
              id="agent-name"
              placeholder={t.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="agent-desc">{t.descLabel}</Label>
            <Textarea
              id="agent-desc"
              placeholder={t.descPlaceholder}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={create} disabled={!canCreate}>
            {t.createBtn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentsPage() {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [editKey, setEditKey] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    api
      .agents()
      .then(setAgents)
      .catch(() => setAgents([]));
  }, []);
  React.useEffect(() => {
    reload();
  }, [reload]);

  const editing = agents.find((a) => a.key === editKey) ?? null;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">{t.pageSubtitle}</p>
        </div>
        <CreateAgentDialog
          onCreated={(key) => {
            reload();
            setEditKey(key);
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.listTitle}</CardTitle>
          <CardDescription>{t.listCount(agents.length)}</CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">{t.noAgents}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((a) => (
                <AgentGridCard key={a.key} agent={a} onOpen={() => setEditKey(a.key)} onDeleted={reload} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditKey(null)}>
        <SheetContent
          side="right"
          className="flex flex-col gap-0 p-0 data-[side=right]:w-[45vw] data-[side=right]:sm:max-w-[45vw]"
        >
          {editing && (
            <>
              <SheetHeader className="px-4">
                <SheetTitle className="flex items-center gap-2">
                  {editing.name}
                  <span className="text-muted-foreground font-mono text-xs">{editing.key}</span>
                  {!editing.builtin && (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      {t.custom}
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription>{editing.description ? editing.description : t.defaultEditorDesc}</SheetDescription>
              </SheetHeader>
              <AgentEditor agentKey={editing.key} onSaved={reload} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
