"use client";

import * as React from "react";

import { PlusIcon, RefreshCwIcon, ServerIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Agent, MCPServer, MCPTool } from "@/lib/types";

interface FormState {
  name: string;
  transport: "stdio" | "http" | "sse";
  command: string;
  args: string;
  url: string;
  env: string;
  insecure: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  transport: "stdio",
  command: "",
  args: "",
  url: "",
  env: "",
  insecure: false,
};

const I18N = {
  en: {
    pageTitle: "MCP Servers",
    pageSubtitle: "Configure local/remote Model Context Protocol tool providers",
    addServerBtn: "Add Server",
    toolsCount: (n: number) => `${n} tools`,
    noToolsFound: "No tools discovered yet",
    visibilityLabel: "Visibility (Agent authorization)",
    enableLabel: "Enable",
    deleteLabel: "Delete",
    requireName: "Please provide a name",
    requireCommand: "Please provide a command",
    requireUrl: "Please provide a remote URL",
    savedServer: (name: string) => `Server "${name}" saved`,
    createdServer: "MCP server added",
    saveFailed: "Save failed: ",
    discoveredTools: (n: number) => `Discovered ${n} tools`,
    refreshFailed: "Refresh failed: ",
    deletedServer: (name: string) => `Deleted: ${name}`,
    deleteFailed: "Deletion failed: ",
    opFailed: "Operation failed: ",
    grantedVisibility: (name: string) => `Granted visibility to "${name}"`,
    revokedVisibility: (name: string) => `Revoked visibility from "${name}"`,
    transportLabel: "Transport Protocol",
    nameLabel: "Server Name",
    namePlaceholder: "e.g. filesystem-server",
    commandLabel: "Command (executable or script path)",
    argsLabel: "Arguments (whitespace separated)",
    remoteUrlLabel: "Remote URL",
    skipTlsLabel: "Skip TLS certificate verification (self-signed certs)",
    headersLabel: "HTTP Headers (one KEY=VALUE per line, e.g. Authorization=Bearer xxx)",
    envLabel: "Environment Variables (one KEY=VALUE per line)",
    saveBtn: "Save",
    refreshToolsBtn: "Refresh Tools",
    noToolsEmpty: "No tools discovered yet. Make sure the server is reachable and configuration is valid.",
    addTitle: "Add MCP Server",
    sheetDesc: "stdio (local process execution) or http / sse (remote Streamable HTTP)",
    tabConfig: "Configuration",
    tabTools: "Tools List",
  },
  pt: {
    pageTitle: "Servidores MCP",
    pageSubtitle: "Configure provedores de ferramentas do protocolo MCP locais ou remotos",
    addServerBtn: "Adicionar Servidor",
    toolsCount: (n: number) => `${n} ferramentas`,
    noToolsFound: "Nenhuma ferramenta descoberta ainda",
    visibilityLabel: "Visibilidade (Autorização por Agente)",
    enableLabel: "Ativar",
    deleteLabel: "Excluir",
    requireName: "Por favor, informe um nome",
    requireCommand: "Por favor, informe um comando",
    requireUrl: "Por favor, informe a URL remota",
    savedServer: (name: string) => `Servidor "${name}" salvo`,
    createdServer: "Servidor MCP adicionado",
    saveFailed: "Falha ao salvar: ",
    discoveredTools: (n: number) => `${n} ferramentas descobertas`,
    refreshFailed: "Falha ao atualizar: ",
    deletedServer: (name: string) => `Excluído: ${name}`,
    deleteFailed: "Falha ao excluir: ",
    opFailed: "Falha na operação: ",
    grantedVisibility: (name: string) => `Visibilidade concedida a "${name}"`,
    revokedVisibility: (name: string) => `Visibilidade revogada de "${name}"`,
    transportLabel: "Protocolo de Transporte",
    nameLabel: "Nome do Servidor",
    namePlaceholder: "ex: filesystem-server",
    commandLabel: "Comando (executável ou caminho)",
    argsLabel: "Argumentos (separados por espaço)",
    remoteUrlLabel: "URL Remota",
    skipTlsLabel: "Ignorar validação de certificados TLS (certificados autoassinados)",
    headersLabel: "Cabeçalhos HTTP (uma linha KEY=VALUE, ex: Authorization=Bearer xxx)",
    envLabel: "Variáveis de Ambiente (uma linha KEY=VALUE)",
    saveBtn: "Salvar",
    refreshToolsBtn: "Atualizar Ferramentas",
    noToolsEmpty: "Nenhuma ferramenta encontrada. Certifique-se de que o servidor está ativo e a configuração correta.",
    addTitle: "Adicionar Servidor MCP",
    sheetDesc: "stdio (execução de processo local) ou http / sse (HTTP Streamable remoto)",
    tabConfig: "Configuração",
    tabTools: "Lista de Ferramentas",
  },
  zh: {
    pageTitle: "MCP 服务器",
    pageSubtitle: "配置本地/远程 Model Context Protocol 工具源",
    addServerBtn: "添加服务器",
    toolsCount: (n: number) => `${n} 个工具`,
    noToolsFound: "尚未发现工具",
    visibilityLabel: "可见性（按 Agent 授权）",
    enableLabel: "启用",
    deleteLabel: "删除",
    requireName: "请填写名称",
    requireCommand: "请填写命令",
    requireUrl: "请填写远程 URL",
    savedServer: (name: string) => `已保存「${name}」`,
    createdServer: "已添加 MCP 服务器",
    saveFailed: "保存失败：",
    discoveredTools: (n: number) => `发现 ${n} 个工具`,
    refreshFailed: "刷新失败：",
    deletedServer: (name: string) => `已删除：${name}`,
    deleteFailed: "删除失败：",
    opFailed: "操作失败：",
    grantedVisibility: (name: string) => `授予「${name}」可见`,
    revokedVisibility: (name: string) => `取消「${name}」可见`,
    transportLabel: "传输方式",
    nameLabel: "名称",
    namePlaceholder: "如 filesystem-server",
    commandLabel: "命令（可执行文件路径或系统命令）",
    argsLabel: "参数（空格分隔）",
    remoteUrlLabel: "远程 URL",
    skipTlsLabel: "跳过 TLS 证书校验（自签证书）",
    headersLabel: "请求头（每行 KEY=VALUE，如 Authorization=Bearer xxx）",
    envLabel: "环境变量（每行 KEY=VALUE）",
    saveBtn: "保存",
    refreshToolsBtn: "刷新工具",
    noToolsEmpty: "尚未发现可用工具。请确认服务器已启动且配置有效。",
    addTitle: "添加 MCP 服务器",
    sheetDesc: "stdio（本地起进程）或 http（远程 Streamable HTTP）",
    tabConfig: "配置",
    tabTools: "工具列表",
  },
};

export default function McpPage() {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [servers, setServers] = React.useState<MCPServer[]>([]);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [visibility, setVisibility] = React.useState<Record<number, string[]>>({});
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MCPServer | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [tab, setTab] = React.useState<"config" | "tools">("config");
  const [tools, setTools] = React.useState<MCPTool[]>([]);
  const [toolsLoading, setToolsLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(() => {
    api
      .agents()
      .then(setAgents)
      .catch(() => {
        /* ignore */
      });
    api
      .mcpServers()
      .then((ss) => {
        setServers(ss);
        for (const s of ss) {
          void api
            .resourceVisibility("mcp", s.id)
            .then((ids) => setVisibility((v) => ({ ...v, [s.id]: ids })))
            .catch(() => {
              /* ignore */
            });
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function setF(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function parseEnv(text: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
    return out;
  }

  function envToText(env?: Record<string, string>): string {
    if (!env) return "";
    return Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTools([]);
    setTab("config");
    setOpen(true);
  }

  function openEdit(s: MCPServer) {
    setEditing(s);
    setForm({
      name: s.name,
      transport: s.transport,
      command: s.command ?? "",
      args: (s.args ?? []).join(" "),
      url: s.url ?? "",
      env: envToText(s.env),
      insecure: s.insecure ?? false,
    });
    setTab("config");
    setOpen(true);
    void loadTools(s.id);
  }

  async function loadTools(id: number) {
    setToolsLoading(true);
    try {
      setTools(await api.mcpTools(id));
    } catch {
      setTools([]);
    } finally {
      setToolsLoading(false);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error(t.requireName);
      return;
    }
    if (form.transport === "stdio" && !form.command.trim()) {
      toast.error(t.requireCommand);
      return;
    }
    if (form.transport !== "stdio" && !form.url.trim()) {
      toast.error(t.requireUrl);
      return;
    }
    setSaving(true);
    try {
      const base =
        form.transport !== "stdio"
          ? {
              transport: form.transport,
              url: form.url.trim(),
              command: "",
              args: [] as string[],
              env: parseEnv(form.env),
              insecure: form.insecure,
            }
          : {
              transport: "stdio" as const,
              command: form.command.trim(),
              args: form.args.trim() ? form.args.trim().split(/\s+/) : [],
              env: parseEnv(form.env),
              insecure: false,
            };
      await api.saveMcpServer({
        ...(editing ? { id: editing.id } : {}),
        name: form.name.trim(),
        enabled: editing ? editing.enabled : true,
        ...base,
      });
      toast.success(editing ? t.savedServer(form.name.trim()) : t.createdServer);
      if (!editing) setOpen(false);
      load();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function refreshTools() {
    if (!editing) return;
    setRefreshing(true);
    try {
      const toolList = await api.refreshMcpServer(editing.id);
      setTools(toolList);
      toast.success(t.discoveredTools(toolList.length));
      load();
    } catch (e) {
      toast.error(t.refreshFailed + (e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  async function removeServer(s: MCPServer) {
    try {
      await api.deleteMcpServer(s.id);
      toast.success(t.deletedServer(s.name));
      setOpen(false);
      load();
    } catch (e) {
      toast.error(t.deleteFailed + (e as Error).message);
    }
  }

  async function toggleEnabled(s: MCPServer) {
    try {
      await api.saveMcpServer({ ...s, enabled: !s.enabled });
      load();
    } catch (e) {
      toast.error(t.opFailed + (e as Error).message);
    }
  }

  async function toggleVisibility(serverId: number, agentId: string, agentName: string) {
    const on = (visibility[serverId] ?? []).includes(agentId);
    try {
      await api.toggleVisibility(agentId, "mcp", serverId, !on);
      toast.success(on ? t.revokedVisibility(agentName) : t.grantedVisibility(agentName));
      load();
    } catch (e) {
      toast.error(t.opFailed + (e as Error).message);
    }
  }

  function renderForm() {
    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label>{t.transportLabel}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={form.transport === "stdio" ? "default" : "outline"}
              onClick={() => setF({ transport: "stdio" })}
            >
              stdio
            </Button>
            <Button
              type="button"
              variant={form.transport === "http" ? "default" : "outline"}
              onClick={() => setF({ transport: "http" })}
            >
              http
            </Button>
            <Button
              type="button"
              variant={form.transport === "sse" ? "default" : "outline"}
              onClick={() => setF({ transport: "sse" })}
            >
              sse
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="m-name">{t.nameLabel}</Label>
          <Input
            id="m-name"
            placeholder={t.namePlaceholder}
            value={form.name}
            onChange={(e) => setF({ name: e.target.value })}
          />
        </div>
        {form.transport === "stdio" ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="m-cmd">{t.commandLabel}</Label>
              <Input
                id="m-cmd"
                className="font-mono"
                placeholder="npx / uvx / python / node ..."
                value={form.command}
                onChange={(e) => setF({ command: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-args">{t.argsLabel}</Label>
              <Input
                id="m-args"
                className="font-mono"
                placeholder="-y @modelcontextprotocol/server-filesystem /tmp"
                value={form.args}
                onChange={(e) => setF({ args: e.target.value })}
              />
            </div>
          </>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="m-url">{t.remoteUrlLabel}</Label>
            <Input
              id="m-url"
              className="font-mono"
              placeholder="https://mcp.example.com/mcp"
              value={form.url}
              onChange={(e) => setF({ url: e.target.value })}
            />
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                id="m-insecure"
                checked={form.insecure}
                onCheckedChange={(v) => setF({ insecure: v === true })}
              />
              <Label htmlFor="m-insecure" className="font-normal cursor-pointer">
                {t.skipTlsLabel}
              </Label>
            </div>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="m-env">{form.transport !== "stdio" ? t.headersLabel : t.envLabel}</Label>
          <Textarea
            id="m-env"
            className="font-mono"
            placeholder={form.transport !== "stdio" ? "Authorization=Bearer xxxx" : "API_KEY=xxxx\nFOO=bar"}
            value={form.env}
            onChange={(e) => setF({ env: e.target.value })}
            rows={3}
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {t.saveBtn}
        </Button>
      </div>
    );
  }

  function renderTools() {
    return (
      <div className="grid gap-3 py-4">
        {editing && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={refreshTools} disabled={refreshing}>
              <RefreshCwIcon className={refreshing ? "animate-spin" : ""} />
              {t.refreshToolsBtn}
            </Button>
          </div>
        )}
        {toolsLoading && <p className="text-muted-foreground text-sm">...</p>}
        {!toolsLoading && tools.length === 0 && <p className="text-muted-foreground text-sm">{t.noToolsEmpty}</p>}
        {!toolsLoading && tools.length > 0 && (
          <div className="grid gap-2">
            {tools.map((item) => (
              <div key={item.name} className="rounded border p-2">
                <code className="font-mono text-sm">{item.name}</code>
                {item.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">{t.pageSubtitle}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon /> {t.addServerBtn}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {servers.map((s) => (
          <Card
            key={s.id}
            className="cursor-pointer hover:border-foreground/30"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button, [role=switch], input, label")) return;
              openEdit(s);
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <ServerIcon className="text-muted-foreground size-4 shrink-0" />
                <CardTitle className="truncate text-base">{s.name}</CardTitle>
                <Badge variant="outline" className="uppercase">
                  {s.transport}
                </Badge>
                <div className="ml-auto flex items-center gap-2">
                  <Switch checked={s.enabled} onCheckedChange={() => toggleEnabled(s)} aria-label={t.enableLabel} />
                  <Button size="icon" variant="outline" aria-label={t.deleteLabel} onClick={() => removeServer(s)}>
                    <Trash2Icon className="text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-muted-foreground text-sm">
                {s.tools && s.tools.length > 0 ? t.toolsCount(s.tools.length) : t.noToolsFound}
              </p>
              <div className="grid gap-2">
                <span className="text-muted-foreground text-xs">{t.visibilityLabel}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {agents.map((a) => (
                    <div key={a.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`vis-${s.id}-${a.id}`}
                        checked={(visibility[s.id] ?? []).includes(a.id)}
                        onCheckedChange={() => toggleVisibility(s.id, a.id, a.name)}
                      />
                      <Label htmlFor={`vis-${s.id}-${a.id}`} className="font-normal cursor-pointer text-xs">
                        {a.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? editing.name : t.addTitle}</SheetTitle>
            <SheetDescription>{t.sheetDesc}</SheetDescription>
          </SheetHeader>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "config" | "tools")}
            className="mt-4 flex flex-col min-h-0 flex-1"
          >
            <TabsList>
              <TabsTrigger value="config">{t.tabConfig}</TabsTrigger>
              <TabsTrigger value="tools">
                {t.tabTools}
                {tools.length ? ` (${tools.length})` : ""}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="config" className="min-h-0 flex-1 overflow-y-auto">
              {renderForm()}
            </TabsContent>
            <TabsContent value="tools" className="min-h-0 flex-1 overflow-y-auto">
              {renderTools()}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
