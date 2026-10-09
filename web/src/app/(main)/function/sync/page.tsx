"use client";

import * as React from "react";

import { AlertCircleIcon, CheckCircle2Icon, DownloadIcon, PlugZapIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { SSProject, SSTask } from "@/lib/types";

type SSStatus = {
  exists: boolean;
  configured: boolean;
  enabled: boolean;
  reachable: boolean;
  url?: string;
  tools: string[];
};

type Dimension = "project" | "task";

function getAssetTypes(locale: string): { key: string; label: string }[] {
  if (locale === "pt") {
    return [
      { key: "subdomain", label: "Subdomínios" },
      { key: "service", label: "Serviços" },
      { key: "app", label: "Aplicações" },
    ];
  }
  if (locale === "zh") {
    return [
      { key: "subdomain", label: "子域名" },
      { key: "service", label: "服务" },
      { key: "app", label: "App" },
    ];
  }
  return [
    { key: "subdomain", label: "Subdomains" },
    { key: "service", label: "Services" },
    { key: "app", label: "Apps" },
  ];
}

export default function AssetSyncPage() {
  const { locale } = useI18n();

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        title: "Sincronização de Ativos",
        subtitle: "Sincronize ativos de fontes externas para o repositório local",
      };
    }
    if (locale === "zh") {
      return {
        title: "资产同步",
        subtitle: "从外部数据源同步资产入库",
      };
    }
    return {
      title: "Asset Synchronization",
      subtitle: "Synchronize assets from external data sources into the repository",
    };
  }, [locale]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="font-semibold text-xl">{strings.title}</h1>
        <p className="text-muted-foreground text-sm">{strings.subtitle}</p>
      </div>
      <Tabs defaultValue="scopesentry">
        <TabsList>
          <TabsTrigger value="scopesentry">ScopeSentry</TabsTrigger>
        </TabsList>
        <TabsContent value="scopesentry" className="mt-4">
          <ScopeSentryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScopeSentryPanel() {
  const { locale } = useI18n();
  const [status, setStatus] = React.useState<SSStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        readStatusError: (msg: string) => `Falha ao ler status da fonte de dados: ${msg}`,
        readyDesc:
          "Assim que a fonte de dados estiver pronta, selecione projetos ou tarefas para iniciar a sincronização.",
      };
    }
    if (locale === "zh") {
      return {
        readStatusError: (msg: string) => `读取数据源状态失败：${msg}`,
        readyDesc: "数据源就绪后即可选择项目 / 任务进行同步。",
      };
    }
    return {
      readStatusError: (msg: string) => `Failed to read data source status: ${msg}`,
      readyDesc: "Once the data source is ready, select projects or tasks to synchronize.",
    };
  }, [locale]);

  const loadStatus = React.useCallback(() => {
    setLoadingStatus(true);
    api
      .ssStatus()
      .then(setStatus)
      .catch((e) => toast.error(strings.readStatusError((e as Error).message)))
      .finally(() => setLoadingStatus(false));
  }, [strings]);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const ready = !!status && status.exists && status.configured && status.enabled;

  return (
    <div className="space-y-4">
      <DataSourceCard status={status} loading={loadingStatus} onChanged={loadStatus} />
      {ready ? (
        <SyncWorkbench />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">{strings.readyDesc}</CardContent>
        </Card>
      )}
    </div>
  );
}

function DataSourceCard({
  status,
  loading,
  onChanged,
}: {
  status: SSStatus | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const { locale } = useI18n();
  const [url, setUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        cardTitle: "Status da Fonte de Dados",
        refresh: "Atualizar",
        notExists:
          "Fonte de dados ScopeSentry ainda não criada. Ao criar, será adicionado um conector MCP reservado (endereço/chave vazios, desativado).",
        createBtn: "Criar Fonte de Dados",
        createdSuccess: "Fonte de dados ScopeSentry criada. Preencha o endereço e a chave de API.",
        createFailed: (msg: string) => `Falha na criação: ${msg}`,
        unconfiguredHint:
          "Fonte de dados criada, mas não configurada. Preencha o endereço MCP e a chave de API para ativá-la.",
        configuredDisabledHint:
          "Fonte de dados configurada, mas desativada. Ao salvar, ela será ativada automaticamente.",
        mcpUrlLabel: "Endereço MCP",
        mcpUrlPlaceholder: "http://<host>:8082/mcp",
        apiKeyLabel: "Chave de API (X-API-Key, deixe em branco para manter)",
        apiKeyPlaceholder: "ssk_...",
        saveBtn: "Salvar e Ativar",
        toolsDiscovered: (n: number) => `${n} ferramentas descobertas`,
        urlRequired: "Informe o endereço MCP",
        savedEnabled: "Fonte de dados salva e ativada",
        savedDisabled: "Salvo (condições de ativação ainda não atendidas)",
        saveFailed: (msg: string) => `Falha ao salvar: ${msg}`,
      };
    }
    if (locale === "zh") {
      return {
        cardTitle: "数据源状态",
        refresh: "刷新",
        notExists: "尚未创建 ScopeSentry 数据源。创建后会新增一个占位 MCP（地址/密钥为空、未启用）。",
        createBtn: "创建数据源",
        createdSuccess: "已创建 ScopeSentry 数据源，请填写地址与密钥",
        createFailed: (msg: string) => `创建失败：${msg}`,
        unconfiguredHint: "数据源已创建但未配置，请填写 MCP 地址与 API Key 后启用。",
        configuredDisabledHint: "数据源已配置但未启用，保存后将自动启用。",
        mcpUrlLabel: "MCP 地址",
        mcpUrlPlaceholder: "http://<主机>:8082/mcp",
        apiKeyLabel: "API Key（X-API-Key，留空保留原值）",
        apiKeyPlaceholder: "ssk_...",
        saveBtn: "保存并启用",
        toolsDiscovered: (n: number) => `已发现 ${n} 个工具`,
        urlRequired: "请填写 MCP 地址",
        savedEnabled: "已保存并启用数据源",
        savedDisabled: "已保存（尚未满足启用条件）",
        saveFailed: (msg: string) => `保存失败：${msg}`,
      };
    }
    return {
      cardTitle: "Data Source Status",
      refresh: "Refresh",
      notExists:
        "ScopeSentry data source not yet created. Creating it will add a placeholder MCP connector (empty address/key, disabled).",
      createBtn: "Create Data Source",
      createdSuccess: "ScopeSentry data source created. Please enter address and API key.",
      createFailed: (msg: string) => `Creation failed: ${msg}`,
      unconfiguredHint: "Data source created but unconfigured. Enter MCP URL and API key to enable it.",
      configuredDisabledHint: "Data source configured but disabled. Saving will enable it automatically.",
      mcpUrlLabel: "MCP Address",
      mcpUrlPlaceholder: "http://<host>:8082/mcp",
      apiKeyLabel: "API Key (X-API-Key, leave blank to keep current)",
      apiKeyPlaceholder: "ssk_...",
      saveBtn: "Save & Enable",
      toolsDiscovered: (n: number) => `${n} tools discovered`,
      urlRequired: "Please enter the MCP address",
      savedEnabled: "Data source saved and enabled",
      savedDisabled: "Saved (activation requirements not yet met)",
      saveFailed: (msg: string) => `Save failed: ${msg}`,
    };
  }, [locale]);

  React.useEffect(() => {
    if (status?.url) setUrl(status.url);
  }, [status?.url]);

  const create = async () => {
    setBusy(true);
    try {
      await api.ssDatasource({});
      toast.success(strings.createdSuccess);
      onChanged();
    } catch (e) {
      toast.error(strings.createFailed((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!url.trim()) return toast.error(strings.urlRequired);
    setBusy(true);
    try {
      const r = await api.ssDatasource({ url: url.trim(), api_key: apiKey.trim() });
      toast.success(r.enabled ? strings.savedEnabled : strings.savedDisabled);
      setApiKey("");
      onChanged();
    } catch (e) {
      toast.error(strings.saveFailed((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <PlugZapIcon className="size-4" /> {strings.cardTitle}
          <StatusBadge status={status} loading={loading} />
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onChanged} disabled={loading}>
          <RefreshCwIcon className={loading ? "size-4 animate-spin" : "size-4"} /> {strings.refresh}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!status?.exists ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">{strings.notExists}</p>
            <Button onClick={create} disabled={busy}>
              {strings.createBtn}
            </Button>
          </div>
        ) : (
          <>
            {!status.configured && (
              <p className="text-amber-600 text-sm dark:text-amber-500">{strings.unconfiguredHint}</p>
            )}
            {status.configured && !status.enabled && (
              <p className="text-amber-600 text-sm dark:text-amber-500">{strings.configuredDisabledHint}</p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{strings.mcpUrlLabel}</Label>
                <Input placeholder={strings.mcpUrlPlaceholder} value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{strings.apiKeyLabel}</Label>
                <Input
                  type="password"
                  placeholder={strings.apiKeyPlaceholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={save} disabled={busy}>
                {strings.saveBtn}
              </Button>
              {status.enabled && status.tools.length > 0 && (
                <span className="text-muted-foreground text-xs">{strings.toolsDiscovered(status.tools.length)}</span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, loading }: { status: SSStatus | null; loading: boolean }) {
  const { locale } = useI18n();

  const labels = React.useMemo(() => {
    if (locale === "pt") {
      return {
        checking: "Verificando…",
        notCreated: "Não Criado",
        unconfigured: "Não Configurado",
        disabled: "Desativado",
        connected: "Conectado",
        unreachable: "Inacessível",
      };
    }
    if (locale === "zh") {
      return {
        checking: "检测中…",
        notCreated: "未创建",
        unconfigured: "未配置",
        disabled: "未启用",
        connected: "已连接",
        unreachable: "不可达",
      };
    }
    return {
      checking: "Checking…",
      notCreated: "Not Created",
      unconfigured: "Unconfigured",
      disabled: "Disabled",
      connected: "Connected",
      unreachable: "Unreachable",
    };
  }, [locale]);

  if (loading || !status) return <Badge variant="secondary">{labels.checking}</Badge>;
  if (!status.exists) return <Badge variant="destructive">{labels.notCreated}</Badge>;
  if (!status.configured) return <Badge variant="outline">{labels.unconfigured}</Badge>;
  if (!status.enabled) return <Badge variant="outline">{labels.disabled}</Badge>;
  if (status.reachable)
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle2Icon className="mr-1 size-3" /> {labels.connected}
      </Badge>
    );
  return (
    <Badge variant="destructive">
      <AlertCircleIcon className="mr-1 size-3" /> {labels.unreachable}
    </Badge>
  );
}

function SyncWorkbench() {
  const { locale } = useI18n();
  const [dimension, setDimension] = React.useState<Dimension>("project");
  const [assetTypes, setAssetTypes] = React.useState<Record<string, boolean>>({
    subdomain: true,
    service: true,
    app: true,
  });
  const [createCompany, setCreateCompany] = React.useState(true);

  const [projects, setProjects] = React.useState<SSProject[]>([]);
  const [tasks, setTasks] = React.useState<SSTask[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [syncing, setSyncing] = React.useState(false);
  const [result, setResult] = React.useState<Awaited<ReturnType<typeof api.ssSync>> | null>(null);

  const assetTypesList = React.useMemo(() => getAssetTypes(locale), [locale]);

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        cardTitle: "Selecionar Dados para Sincronização",
        byProject: "Por Projeto",
        byTask: "Por Tarefa",
        syncAssetsLabel: "Tipos de Ativos:",
        createCompanyLabel: "Criar empresas por projeto e registrar escopos de ativos",
        searchProjectPlaceholder: "Buscar por nome do projeto",
        searchTaskPlaceholder: "Buscar por nome da tarefa",
        selectedCount: (n: number) => `Selecionados: ${n}`,
        syncSelectedBtn: "Sincronizar Selecionados",
        projectNameCol: "Nome do Projeto",
        taskNameCol: "Nome da Tarefa",
        tagCol: "Tag",
        assetsCol: "Total de Ativos",
        statusCol: "Status",
        timeCol: "Horário",
        prev: "Anterior",
        next: "Próxima",
        pageLabel: (p: number) => `Página ${p}`,
        loading: "Carregando…",
        noData: "Sem dados",
        loadListFailed: (msg: string) => `Falha ao carregar lista: ${msg}`,
        selectTargetRequired: (dim: Dimension) => `Selecione ao menos um ${dim === "project" ? "projeto" : "tarefa"}`,
        selectTypeRequired: "Selecione ao menos um tipo de ativo",
        syncCompleteSuccess: (n: number) => `Sincronização concluída. ${n} ativos adicionados`,
        syncFailed: (msg: string) => `Falha na sincronização: ${msg}`,
      };
    }
    if (locale === "zh") {
      return {
        cardTitle: "选择数据同步",
        byProject: "项目维度",
        byTask: "任务维度",
        syncAssetsLabel: "同步资产：",
        createCompanyLabel: "按项目建立企业并写入资产范围",
        searchProjectPlaceholder: "搜索项目名",
        searchTaskPlaceholder: "搜索任务名",
        selectedCount: (n: number) => `已选 ${n}`,
        syncSelectedBtn: "同步选中",
        projectNameCol: "项目名",
        taskNameCol: "任务名",
        tagCol: "标签",
        assetsCol: "资产数",
        statusCol: "状态",
        timeCol: "时间",
        prev: "上一页",
        next: "下一页",
        pageLabel: (p: number) => `第 ${p} 页`,
        loading: "加载中…",
        noData: "无数据",
        loadListFailed: (msg: string) => `加载列表失败：${msg}`,
        selectTargetRequired: (dim: Dimension) => `请至少选择一个${dim === "project" ? "项目" : "任务"}`,
        selectTypeRequired: "请至少选择一种资产类型",
        syncCompleteSuccess: (n: number) => `同步完成，共入库 ${n} 条资产`,
        syncFailed: (msg: string) => `同步失败：${msg}`,
      };
    }
    return {
      cardTitle: "Select Data to Synchronize",
      byProject: "By Project",
      byTask: "By Task",
      syncAssetsLabel: "Asset Types:",
      createCompanyLabel: "Create companies per project and populate asset scopes",
      searchProjectPlaceholder: "Search project name",
      searchTaskPlaceholder: "Search task name",
      selectedCount: (n: number) => `Selected: ${n}`,
      syncSelectedBtn: "Sync Selected",
      projectNameCol: "Project Name",
      taskNameCol: "Task Name",
      tagCol: "Tag",
      assetsCol: "Asset Count",
      statusCol: "Status",
      timeCol: "Time",
      prev: "Previous",
      next: "Next",
      pageLabel: (p: number) => `Page ${p}`,
      loading: "Loading…",
      noData: "No data",
      loadListFailed: (msg: string) => `Failed to load list: ${msg}`,
      selectTargetRequired: (dim: Dimension) => `Please select at least one ${dim === "project" ? "project" : "task"}`,
      selectTypeRequired: "Please select at least one asset type",
      syncCompleteSuccess: (n: number) => `Synchronization complete. Added ${n} assets`,
      syncFailed: (msg: string) => `Synchronization failed: ${msg}`,
    };
  }, [locale]);

  const load = React.useCallback(() => {
    setLoading(true);
    setSelected(new Set());
    const fn =
      dimension === "project"
        ? api.ssProjects(page, 50, search).then((r) => setProjects(r.projects))
        : api.ssTasks(page, 50, search).then(setTasks);
    fn.catch((e) => toast.error(strings.loadListFailed((e as Error).message))).finally(() => setLoading(false));
  }, [dimension, page, search, strings]);

  React.useEffect(() => {
    load();
  }, [load]);

  const rows = dimension === "project" ? projects : tasks;
  const idOf = (row: SSProject | SSTask) => (dimension === "project" ? (row as SSProject).id : (row as SSTask).name);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map(idOf))));
  };

  const chosenTypes = assetTypesList.filter((t) => assetTypes[t.key]).map((t) => t.key);

  const runSync = async () => {
    if (selected.size === 0) return toast.error(strings.selectTargetRequired(dimension));
    if (chosenTypes.length === 0) return toast.error(strings.selectTypeRequired);
    setSyncing(true);
    setResult(null);
    try {
      const r = await api.ssSync({
        dimension,
        targets: [...selected],
        asset_types: chosenTypes,
        create_company: dimension === "project" ? createCompany : false,
      });
      setResult(r);
      const total = Object.values(r.synced ?? {}).reduce((a, b) => a + b, 0);
      toast.success(strings.syncCompleteSuccess(total));
    } catch (e) {
      toast.error(strings.syncFailed((e as Error).message));
    } finally {
      setSyncing(false);
    }
  };

  const renderRows = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
            {strings.loading}
          </TableCell>
        </TableRow>
      );
    }
    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
            {strings.noData}
          </TableCell>
        </TableRow>
      );
    }
    if (dimension === "project") {
      return projects.map((p) => (
        <TableRow key={p.id} className="cursor-pointer" onClick={() => toggle(p.id)}>
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
          </TableCell>
          <TableCell className="font-medium">{p.name}</TableCell>
          <TableCell>{p.tag ? <Badge variant="secondary">{p.tag}</Badge> : "—"}</TableCell>
          <TableCell className="text-right">{p.AssetCount ?? 0}</TableCell>
        </TableRow>
      ));
    }
    return tasks.map((t) => (
      <TableRow key={t.id} className="cursor-pointer" onClick={() => toggle(t.name)}>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected.has(t.name)} onCheckedChange={() => toggle(t.name)} />
        </TableCell>
        <TableCell className="font-medium">{t.name}</TableCell>
        <TableCell>
          <Badge variant={t.progress === 100 ? "secondary" : "outline"}>
            {t.progress != null ? `${t.progress}%` : "—"}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">{t.endTime || t.creatTime || "—"}</TableCell>
      </TableRow>
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{strings.cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dimension Switcher */}
        <Tabs
          value={dimension}
          onValueChange={(v) => {
            setDimension(v as Dimension);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="project">{strings.byProject}</TabsTrigger>
            <TabsTrigger value="task">{strings.byTask}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Asset Types + Options */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-medium text-sm">{strings.syncAssetsLabel}</span>
          {assetTypesList.map((t) => (
            <label key={t.key} htmlFor={`at-${t.key}`} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                id={`at-${t.key}`}
                checked={!!assetTypes[t.key]}
                onCheckedChange={(c) => setAssetTypes((prev) => ({ ...prev, [t.key]: !!c }))}
              />
              {t.label}
            </label>
          ))}
          {dimension === "project" && (
            <label htmlFor="create-company" className="flex items-center gap-1.5 text-sm">
              <Checkbox id="create-company" checked={createCompany} onCheckedChange={(c) => setCreateCompany(!!c)} />
              {strings.createCompanyLabel}
            </label>
          )}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={dimension === "project" ? strings.searchProjectPlaceholder : strings.searchTaskPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  load();
                }
              }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCwIcon className={loading ? "size-4 animate-spin" : "size-4"} />
          </Button>
          <div className="flex-1" />
          <span className="text-muted-foreground text-xs">{strings.selectedCount(selected.size)}</span>
          <Button onClick={runSync} disabled={syncing || selected.size === 0}>
            <DownloadIcon className={syncing ? "size-4 animate-pulse" : "size-4"} /> {strings.syncSelectedBtn}
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={rows.length > 0 && selected.size === rows.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>{dimension === "project" ? strings.projectNameCol : strings.taskNameCol}</TableHead>
                {dimension === "project" ? (
                  <>
                    <TableHead>{strings.tagCol}</TableHead>
                    <TableHead className="text-right">{strings.assetsCol}</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>{strings.statusCol}</TableHead>
                    <TableHead>{strings.timeCol}</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>{renderRows()}</TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            {strings.prev}
          </Button>
          <span className="text-muted-foreground text-xs">{strings.pageLabel(page)}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length < 50 || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {strings.next}
          </Button>
        </div>

        {/* Result */}
        {result && <SyncResult result={result} />}
      </CardContent>
    </Card>
  );
}

function SyncResult({ result }: { result: Awaited<ReturnType<typeof api.ssSync>> }) {
  const { locale } = useI18n();
  const synced = result.synced ?? {};

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        labels: { subdomain: "Subdomínios", service: "Serviços", app: "Aplicações", ip: "IP" } as Record<
          string,
          string
        >,
        companies: (names: string) => `Empresas criadas/atualizadas: ${names}`,
        moreErrors: (count: number) => `… total de ${count} erros`,
      };
    }
    if (locale === "zh") {
      return {
        labels: { subdomain: "子域名", service: "服务", app: "App", ip: "IP" } as Record<string, string>,
        companies: (names: string) => `新建/更新企业：${names}`,
        moreErrors: (count: number) => `…共 ${count} 条错误`,
      };
    }
    return {
      labels: { subdomain: "Subdomains", service: "Services", app: "Apps", ip: "IP" } as Record<string, string>,
      companies: (names: string) => `Created/updated companies: ${names}`,
      moreErrors: (count: number) => `… total of ${count} errors`,
    };
  }, [locale]);

  return (
    <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="flex flex-wrap gap-3">
        {Object.entries(synced).map(([k, v]) => (
          <Badge key={k} variant="secondary">
            {strings.labels[k] ?? k}: {v}
          </Badge>
        ))}
      </div>
      {result.companies && result.companies.length > 0 && (
        <p className="text-muted-foreground">{strings.companies(result.companies.join(", "))}</p>
      )}
      {result.warnings && result.warnings.length > 0 && (
        <ul className="list-inside list-disc text-amber-600 dark:text-amber-500">
          {result.warnings.map((wm) => (
            <li key={wm}>{wm}</li>
          ))}
        </ul>
      )}
      {result.errors && result.errors.length > 0 && (
        <ul className="list-inside list-disc text-destructive">
          {result.errors.slice(0, 20).map((em) => (
            <li key={em}>{em}</li>
          ))}
          {result.errors.length > 20 && <li>{strings.moreErrors(result.errors.length)}</li>}
        </ul>
      )}
    </div>
  );
}
