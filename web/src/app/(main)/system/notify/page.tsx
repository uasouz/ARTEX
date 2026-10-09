"use client";

import * as React from "react";

import { BellIcon, PlusIcon, SendIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { NotificationChannel, NotificationFilter, NotificationMeta } from "@/lib/types";

import {
  type ChannelForm,
  emptyForm,
  getChannelFields,
  getKindLabel,
  getSeverityOptions,
  hasFields,
  parseIDs,
  parseKeywords,
  parseKV,
} from "./_components/channel-fields";
import { ConfigField, FilterSummary } from "./_components/channel-form";
import { DeliveryList } from "./_components/delivery-list";
import { formatBacklog, StatTile } from "./_components/stat-tile";

// 本页只负责编排：加载数据、维护表单状态、调用接口。
// 字段定义与解析在 _components/channel-fields.ts，控件与过滤摘要在
// _components/channel-form.tsx，投递记录在 _components/delivery-list.tsx——
// 拆开是因为它们各自能被单独读懂，而挤在一个文件里时这个页面接近 1100 行。

const NOTIFY_I18N = {
  en: {
    pageTitle: "Alerts & Notifications",
    pageSubtitle:
      "Dispatch alerts to DingTalk, Feishu, WeCom, Webhook, Telegram, Email, etc. · Configurable timing and filters per channel",
    masterSwitch: "Master Switch",
    masterSwitchAria: "Notification master switch",
    channelStat: "Channels",
    channelStatHint: "Active / Total",
    sentTodayStat: "Sent Today",
    pendingStat: "Pending",
    failedStat: "Failed",
    backlogStat: "Oldest Backlog",
    backlogStalledHint: "Notifications may be stalled",
    globalTitle: "Global Settings",
    callbackUrlLabel: "Base Callback URL",
    callbackUrlHelp: 'Target URL for "View Details" button in messages. Leave blank to omit.',
    digestPeriodLabel: "Digest Interval (minutes)",
    digestPeriodHelp: 'Only applies to channels in "digest" mode.',
    saveGlobalBtn: "Save Global Settings",
    saving: "Saving...",
    channelsTab: "Channels",
    deliveriesTab: "Delivery History",
    addChannelBtn: "Add Channel",
    realtimeMode: "Real-time",
    digestMode: "Digest",
    disabledBadge: "Disabled",
    enableAria: "Enable",
    deleteAria: "Delete",
    editSheetTitle: "Edit Notification Channel",
    addSheetTitle: "Add Notification Channel",
    rateLimitDefaultHint: (rate: number) => ` · Default limit ${rate} msg/min`,
    rateLimitNoneHint: " · No rate limit",
    typeLabel: "Channel Type",
    typeLockedHint: "Channel type cannot be changed — create a new channel instead.",
    nameLabel: "Channel Name",
    namePlaceholder: "Security Response Group / Daily Digest",
    timingLabel: "Delivery Timing",
    timingRealtime: "Real-time · Send each vulnerability individually",
    timingDigest: "Digest · Aggregate periodically into a single message",
    timingHelp: "To send critical alerts in real-time and others in a digest, create two channels.",
    rateLimitLabel: "Rate Limit (messages/min)",
    rateLimitPlaceholder: (defRate: number) => (defRate > 0 ? String(defRate) : "0 = Unlimited"),
    rateLimitHelp: "Leave blank for channel default; 0 means unlimited. Excess messages are delayed, not dropped.",
    filtersHeading: "Filtering Rules (Leave blank for no filter)",
    minSeverityLabel: "Minimum Severity",
    includeTypesLabel: "Include Vulnerability Types",
    includePlaceholder: "SQL Injection\nCommand Execution",
    includeHelp: "One keyword per line, case-insensitive substring match. Blank = all types.",
    excludeTypesLabel: "Exclude Vulnerability Types",
    excludePlaceholder: "Information Disclosure",
    excludeHelp: "Exclusions take precedence over inclusions.",
    limitTasksLabel: "Limit Task IDs",
    limitAssetsLabel: "Limit Asset IDs",
    tasksAssetsHelp: "Blank = unrestricted. Multiple IDs separated by commas.",
    statusChangeLabel: "Also notify when vulnerability status changes (real-time only)",
    enableChannelLabel: "Enable this channel",
    saveBtn: "Save",
    addBtn: "Add",
    testMsgBtn: "Send Test Message",
    testingBtn: "Testing...",
    testSuccess: (ms: number) => `Test message sent (${ms} ms). Please check your channel.`,
    testFailed: "Test failed: ",
    nameRequired: "Please enter a channel name",
    saved: "Saved",
    channelAdded: "Channel added successfully",
    saveFailed: "Failed to save: ",
    deleted: (name: string) => `Deleted: ${name}`,
    deleteFailed: "Failed to delete: ",
    actionFailed: "Operation failed: ",
    toggled: (on: boolean) => (on ? "Notifications enabled" : "Notifications paused"),
    loadConfigFailed: "Failed to load notification settings: ",
    loadChannelsFailed: "Failed to load channel list: ",
  },
  pt: {
    pageTitle: "Alertas e Notificações",
    pageSubtitle:
      "Envio de alertas para DingTalk, Feishu, WeCom, Webhooks, Telegram, E-mail · Horários e filtros configuráveis por canal",
    masterSwitch: "Chave Geral",
    masterSwitchAria: "Chave geral de notificações",
    channelStat: "Canais",
    channelStatHint: "Ativos / Total",
    sentTodayStat: "Enviados Hoje",
    pendingStat: "Pendentes",
    failedStat: "Falhas",
    backlogStat: "Maior Fila",
    backlogStalledHint: "Notificações podem estar travadas",
    globalTitle: "Configurações Globais",
    callbackUrlLabel: "URL Base de Retorno",
    callbackUrlHelp: 'Endereço para o botão "Ver Detalhes" nas mensagens. Deixe vazio para omitir.',
    digestPeriodLabel: "Intervalo de Resumo (minutos)",
    digestPeriodHelp: 'Aplica-se apenas aos canais no modo "resumo".',
    saveGlobalBtn: "Salvar Configurações Globais",
    saving: "Salvando...",
    channelsTab: "Canais",
    deliveriesTab: "Histórico de Entregas",
    addChannelBtn: "Adicionar Canal",
    realtimeMode: "Tempo real",
    digestMode: "Resumo",
    disabledBadge: "Desativado",
    enableAria: "Ativar",
    deleteAria: "Excluir",
    editSheetTitle: "Editar Canal de Notificação",
    addSheetTitle: "Adicionar Canal de Notificação",
    rateLimitDefaultHint: (rate: number) => ` · Limite padrão de ${rate} msg/min`,
    rateLimitNoneHint: " · Sem limite de taxa",
    typeLabel: "Tipo de Canal",
    typeLockedHint: "O tipo de canal não pode ser alterado — crie um novo canal.",
    nameLabel: "Nome do Canal",
    namePlaceholder: "Grupo de Resposta / Resumo Diário",
    timingLabel: "Momento de Envio",
    timingRealtime: "Tempo real · Notificação individual por vulnerabilidade",
    timingDigest: "Resumo · Agrupar periodicamente em uma única mensagem",
    timingHelp: "Para enviar alertas críticos em tempo real e outros em resumo, crie dois canais distintos.",
    rateLimitLabel: "Limite de Taxa (mensagens/min)",
    rateLimitPlaceholder: (defRate: number) => (defRate > 0 ? String(defRate) : "0 = Ilimitado"),
    rateLimitHelp:
      "Deixe em branco para o padrão; 0 para ilimitado. Mensagens excedentes são adiadas, não descartadas.",
    filtersHeading: "Regras de Filtragem (Deixe em branco para não filtrar)",
    minSeverityLabel: "Severidade Mínima",
    includeTypesLabel: "Incluir Tipos de Vulnerabilidade",
    includePlaceholder: "Injeção SQL\nExecução de Comandos",
    includeHelp: "Uma palavra-chave por linha, sem distinção de maiúsculas. Vazio = todos os tipos.",
    excludeTypesLabel: "Excluir Tipos de Vulnerabilidade",
    excludePlaceholder: "Exposição de Informações",
    excludeHelp: "A exclusão tem prioridade sobre a inclusão.",
    limitTasksLabel: "Limitar IDs de Tarefa",
    limitAssetsLabel: "Limitar IDs de Ativo",
    tasksAssetsHelp: "Vazio = irrestrito. Múltiplos IDs separados por vírgula.",
    statusChangeLabel: "Notificar também quando o status mudar (apenas tempo real)",
    enableChannelLabel: "Ativar este canal",
    saveBtn: "Salvar",
    addBtn: "Adicionar",
    testMsgBtn: "Enviar Mensagem de Teste",
    testingBtn: "Testando...",
    testSuccess: (ms: number) => `Mensagem de teste enviada (${ms} ms). Verifique o canal.`,
    testFailed: "Falha no teste: ",
    nameRequired: "Informe o nome do canal",
    saved: "Salvo com sucesso",
    channelAdded: "Canal adicionado com sucesso",
    saveFailed: "Falha ao salvar: ",
    deleted: (name: string) => `Excluído: ${name}`,
    deleteFailed: "Falha ao excluir: ",
    actionFailed: "Falha na operação: ",
    toggled: (on: boolean) => (on ? "Notificações ativadas" : "Notificações pausadas"),
    loadConfigFailed: "Falha ao carregar configurações: ",
    loadChannelsFailed: "Falha ao carregar canais: ",
  },
  zh: {
    pageTitle: "通知推送",
    pageSubtitle: "{t.pageSubtitle}",
    masterSwitch: "总开关",
    masterSwitchAria: "推送总开关",
    channelStat: "渠道",
    channelStatHint: "启用 / 总数",
    sentTodayStat: "今日送达",
    pendingStat: "待发送",
    failedStat: "失败",
    backlogStat: "最久积压",
    backlogStalledHint: "推送可能卡住了",
    globalTitle: "全局设置",
    callbackUrlLabel: "回链地址",
    callbackUrlHelp: "消息里「查看详情」按钮指向的地址。留空则不带按钮。",
    digestPeriodLabel: "汇总周期（分钟）",
    digestPeriodHelp: "仅对「汇总」模式的渠道生效。",
    saveGlobalBtn: "保存全局设置",
    saving: "保存中…",
    channelsTab: "渠道",
    deliveriesTab: "投递记录",
    addChannelBtn: "添加渠道",
    realtimeMode: "实时",
    digestMode: "汇总",
    disabledBadge: "已停用",
    enableAria: "启用",
    deleteAria: "删除",
    editSheetTitle: "编辑通知渠道",
    addSheetTitle: "添加通知渠道",
    rateLimitDefaultHint: (rate: number) => ` · 默认限流 ${rate} 条/分钟`,
    rateLimitNoneHint: " · 不限流",
    typeLabel: "渠道类型",
    typeLockedHint: "{t.typeLockedHint}",
    nameLabel: "渠道名称",
    namePlaceholder: "应急响应群 / 日常播报群",
    timingLabel: "推送时机",
    timingRealtime: "实时 · 每条漏洞单独发一条",
    timingDigest: "汇总 · 按周期合并成一条",
    timingHelp: "{t.timingHelp}",
    rateLimitLabel: "限流（条/分钟）",
    rateLimitPlaceholder: (defRate: number) => (defRate > 0 ? String(defRate) : "0 = 不限"),
    rateLimitHelp: "{t.rateLimitHelp}",
    filtersHeading: "过滤规则（留空即不过滤）",
    minSeverityLabel: "最低级别",
    includeTypesLabel: "只推这些漏洞类型",
    includePlaceholder: "SQL注入\n命令执行",
    includeHelp: "{t.includeHelp}",
    excludeTypesLabel: "排除这些漏洞类型",
    excludePlaceholder: "信息泄露",
    excludeHelp: "排除优先于包含：同时命中时会被排除。",
    limitTasksLabel: "限定任务 ID",
    limitAssetsLabel: "限定资产 ID",
    tasksAssetsHelp: "任务/资产留空=不限；填写后要求与漏洞有交集。",
    statusChangeLabel: "{t.statusChangeLabel}",
    enableChannelLabel: "{t.enableChannelLabel}",
    saveBtn: "保存",
    addBtn: "添加",
    testMsgBtn: "发送测试消息",
    testingBtn: "测试中…",
    testSuccess: (ms: number) => `已发出测试消息（${ms} ms），请到群里确认`,
    testFailed: "测试失败：",
    nameRequired: "请填写渠道名称",
    saved: "已保存",
    channelAdded: "已添加渠道",
    saveFailed: "保存失败：",
    deleted: (name: string) => `已删除：${name}`,
    deleteFailed: "删除失败：",
    actionFailed: "操作失败：",
    toggled: (on: boolean) => (on ? "推送已开启" : "推送已暂停"),
    loadConfigFailed: "读取推送配置失败：",
    loadChannelsFailed: "读取渠道列表失败：",
  },
};

export default function NotifyPage() {
  const { locale } = useI18n();
  const t = NOTIFY_I18N[locale] ?? NOTIFY_I18N.en;
  const severityOptions = getSeverityOptions(locale);
  const [meta, setMeta] = React.useState<NotificationMeta | null>(null);
  const [channels, setChannels] = React.useState<NotificationChannel[]>([]);
  const [tab, setTab] = React.useState<"channels" | "deliveries">("channels");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<NotificationChannel | null>(null);
  const [form, setForm] = React.useState<ChannelForm>(emptyForm("dingtalk"));
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  const [globalSaving, setGlobalSaving] = React.useState(false);
  const [baseURL, setBaseURL] = React.useState("");
  const [digestMin, setDigestMin] = React.useState("");

  const load = React.useCallback(() => {
    api
      .notifyMeta()
      .then((m) => {
        setMeta(m);
        setBaseURL(m.public_base_url);
        setDigestMin(m.digest_interval_min);
      })
      .catch((e) => toast.error(t.loadConfigFailed + (e as Error).message));
    // 渠道列表加载失败要报出来：静默失败会显示成「一个渠道都没有」，
    // 用户会以为配置丢了，比直接报错更让人慌。
    api
      .notifyChannels()
      .then(setChannels)
      .catch((e) => toast.error(t.loadChannelsFailed + (e as Error).message));
  }, [t.loadChannelsFailed, t.loadConfigFailed]);
  React.useEffect(() => {
    load();
  }, [load]);

  function setF(patch: Partial<ChannelForm>) {
    setForm((f) => ({ ...f, ...patch }));
  }
  function setCfg(key: string, value: unknown) {
    setForm((f) => ({ ...f, config: { ...f.config, [key]: value } }));
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm(meta?.kinds[0]?.kind ?? "dingtalk"));
    setOpen(true);
  }

  function openEdit(ch: NotificationChannel) {
    setEditing(ch);
    // filter 在后端是 Go 结构体，永远序列化成对象（不会是 null），所以不需要兜底。
    const f = ch.filter;
    setForm({
      name: ch.name,
      kind: ch.kind,
      mode: ch.mode,
      enabled: ch.enabled,
      ratePerMin: String(ch.rate_per_min),
      // 后端回显的 config 里凭据是掩码值；原样放进表单，提交时原样送回，
      // 后端据此保留库中原值。
      config: { ...ch.config },
      minSeverity: f.min_severity ?? "",
      includeText: (f.vulnclass_include ?? []).join("\n"),
      excludeText: (f.vulnclass_exclude ?? []).join("\n"),
      taskIDsText: (f.task_ids ?? []).join(","),
      assetIDsText: (f.asset_ids ?? []).join(","),
      onStatusChange: f.on_status_change ?? false,
    });
    setOpen(true);
  }

  // buildConfig 把表单状态转成渠道 config。
  //
  // 唯一的规则，两类值：
  //   - 掩码值（"__masked__..."）原样送回 → 后端解读为「这个字段没改，保留库中原值」
  //   - 其余一律按用户输入提交，空串即「清空该字段」
  //
  // 之所以不特殊照顾凭据字段（比如「凭据留空就跳过」），是因为那会让用户**无法清除**
  // 一个设错的密钥——界面上没有任何操作能表达「我要把它删掉」。现在的规则下，
  // 清空输入框就等于清空该字段，语义唯一且用户可控。
  // 掩码值不会出现在输入框里（见 ConfigField），所以「框里有字」永远等于
  // 「用户主动填的」。
  function buildConfig(): Record<string, unknown> {
    const defs = getChannelFields(form.kind, locale) ?? [];
    const out: Record<string, unknown> = {};
    for (const d of defs) {
      const raw = form.config[d.key];
      if (d.kind === "switch") {
        out[d.key] = raw === true;
        continue;
      }
      if (typeof raw === "string" && raw.startsWith("__masked__")) {
        out[d.key] = raw;
        continue;
      }
      if (d.kind === "number") {
        const n = Number(raw);
        out[d.key] = Number.isFinite(n) && n > 0 ? n : 0;
        continue;
      }
      if (d.kind === "kv") {
        out[d.key] = parseKV(String(raw ?? ""));
        continue;
      }
      if (d.kind === "list") {
        out[d.key] = String(raw ?? "")
          .split(/[\s,，]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        continue;
      }
      out[d.key] = String(raw ?? "").trim();
    }
    return out;
  }

  function buildFilter(): NotificationFilter {
    return {
      min_severity: form.minSeverity || undefined,
      vulnclass_include: parseKeywords(form.includeText),
      vulnclass_exclude: parseKeywords(form.excludeText),
      task_ids: parseIDs(form.taskIDsText),
      asset_ids: parseIDs(form.assetIDsText),
      on_status_change: form.onStatusChange,
    };
  }

  async function saveForm() {
    if (!form.name.trim()) {
      toast.error(t.nameRequired);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        kind: form.kind,
        mode: form.mode,
        enabled: form.enabled,
        config: buildConfig(),
        filter: buildFilter(),
        rate_per_min: form.ratePerMin.trim() === "" ? undefined : Number(form.ratePerMin),
      };
      if (editing) {
        await api.notifyUpdateChannel(editing.id, payload);
        toast.success(t.saved);
        setOpen(false);
      } else {
        await api.notifyCreateChannel(payload);
        toast.success(t.channelAdded);
        setOpen(false);
      }
      load();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function testChannel() {
    if (!editing) return;
    setTesting(true);
    try {
      const r = await api.notifyTestChannel(editing.id);
      toast.success(t.testSuccess(r.latency_ms));
    } catch (e) {
      // 后端把渠道返回的原始错误如实回传，这是排查配置的唯一线索，原样展示。
      toast.error(t.testFailed + (e as Error).message, { duration: 12000 });
    } finally {
      setTesting(false);
    }
  }

  async function removeChannel(ch: NotificationChannel) {
    try {
      await api.notifyDeleteChannel(ch.id);
      toast.success(t.deleted(ch.name));
      setOpen(false);
      load();
    } catch (e) {
      toast.error(t.deleteFailed + (e as Error).message);
    }
  }

  async function toggleEnabled(ch: NotificationChannel) {
    try {
      await api.notifyUpdateChannel(ch.id, { enabled: !ch.enabled });
      load();
    } catch (e) {
      toast.error(t.actionFailed + (e as Error).message);
    }
  }

  async function toggleGlobal(on: boolean) {
    setGlobalSaving(true);
    try {
      await api.setSettings({ notify_enabled: on });
      setMeta((m) => (m ? { ...m, enabled: on } : m));
      toast.success(t.toggled(on));
    } catch (e) {
      toast.error(t.actionFailed + (e as Error).message);
    } finally {
      setGlobalSaving(false);
    }
  }

  async function saveGlobal() {
    setGlobalSaving(true);
    try {
      const patch: Record<string, unknown> = { notify_public_base_url: baseURL.trim() };
      const n = Number(digestMin);
      if (Number.isFinite(n) && n > 0) patch.notify_digest_interval_min = n;
      await api.setSettings(patch);
      toast.success(t.saved);
      load();
    } catch (e) {
      toast.error(t.saveFailed + (e as Error).message);
    } finally {
      setGlobalSaving(false);
    }
  }

  const fields = getChannelFields(form.kind, locale) ?? [];
  const secretKeys = new Set(meta?.kinds.find((k) => k.kind === form.kind)?.secret_keys ?? []);
  const defaultRate = meta?.kinds.find((k) => k.kind === form.kind)?.default_rate_per_min ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">{t.pageSubtitle}</p>
        </div>
        {meta && (
          // 用 div 而不是 label：Switch 自带 aria-label，外面再套一层 label
          // 既关联不到任何原生控件，又会让点击文字看起来应该能切换。
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t.masterSwitch}</span>
            <Switch
              checked={meta.enabled}
              disabled={globalSaving}
              onCheckedChange={toggleGlobal}
              aria-label={t.masterSwitchAria}
            />
          </div>
        )}
      </div>

      {meta && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            label={t.channelStat}
            value={`${meta.stats.channels_on} / ${meta.stats.channels}`}
            hint={t.channelStatHint}
          />
          <StatTile label={t.sentTodayStat} value={String(meta.stats.sent_today)} />
          <StatTile label={t.pendingStat} value={String(meta.stats.pending)} />
          <StatTile
            label={t.failedStat}
            value={String(meta.stats.failed)}
            tone={meta.stats.failed > 0 ? "red" : undefined}
          />
          <StatTile
            label={t.backlogStat}
            value={formatBacklog(meta.stats.backlog_age_ms, locale)}
            // 积压年龄比积压条数有用得多：积压 3 条可以是从 3 秒到 3 小时。
            hint={meta.stats.backlog_age_ms > 5 * 60_000 ? t.backlogStalledHint : undefined}
            tone={meta.stats.backlog_age_ms > 5 * 60_000 ? "red" : undefined}
          />
        </div>
      )}

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="text-base">{t.globalTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="n-base">{t.callbackUrlLabel}</Label>
            <Input
              id="n-base"
              placeholder="https://artex.example.com"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t.callbackUrlHelp}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="n-digest">{t.digestPeriodLabel}</Label>
            <Input
              id="n-digest"
              type="number"
              min={1}
              max={1440}
              placeholder="30"
              value={digestMin}
              onChange={(e) => setDigestMin(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t.digestPeriodHelp}</p>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={saveGlobal} disabled={globalSaving}>
              保存全局设置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "channels" | "deliveries")} className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="channels">{t.channelsTab}</TabsTrigger>
          <TabsTrigger value="deliveries">{t.deliveriesTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="channels">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={openAdd}
              className="text-foreground/70 border-foreground/70 hover:bg-muted/60 hover:shadow-sm flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition"
            >
              <PlusIcon className="size-6" />
              <span className="text-sm">{t.addChannelBtn}</span>
            </button>

            {channels.map((ch) => (
              <Card
                key={ch.id}
                onClick={() => openEdit(ch)}
                className="hover:border-primary/60 cursor-pointer gap-3 transition hover:shadow-sm"
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BellIcon className="text-muted-foreground size-4 shrink-0" />
                    <CardTitle className="truncate text-base">{ch.name}</CardTitle>
                    {/* 卡片整体可点（进入编辑），所以这两个控件必须各自吞掉冒泡，
                        否则开关/删除会顺带触发编辑。把 stopPropagation 挂在控件自己
                        身上，而不是套一层 div：套 div 会造出一个「看起来可交互但没有
                        角色」的静态元素，既触发 a11y 告警，语义上也说不通。 */}
                    <div className="ml-auto flex items-center gap-2">
                      <Switch
                        checked={ch.enabled}
                        onCheckedChange={() => toggleEnabled(ch)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t.enableAria}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={t.deleteAria}
                        onClick={(e) => {
                          e.stopPropagation();
                          // void 显式丢弃 Promise：removeChannel 自己 catch 并 toast，
                          // 这里不需要 await（onClick 不是 async）。
                          void removeChannel(ch);
                        }}
                      >
                        <Trash2Icon className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getKindLabel(ch.kind, locale)}</Badge>
                    <Badge variant="outline">{ch.mode === "digest" ? t.digestMode : t.realtimeMode}</Badge>
                    {!ch.enabled && <Badge variant="outline">{t.disabledBadge}</Badge>}
                  </div>
                  <FilterSummary filter={ch.filter} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deliveries">
          <DeliveryList channels={channels} />
        </TabsContent>
      </Tabs>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? editing.name : t.addSheetTitle}</SheetTitle>
            <SheetDescription>
              {getKindLabel(form.kind, locale)}
              {defaultRate > 0 ? t.rateLimitDefaultHint(defaultRate) : t.rateLimitNoneHint}
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t.typeLabel}</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => {
                    // 换类型等于换一套凭据字段，不能把旧配置合并进来。
                    setF({ kind: v, config: {} });
                  }}
                  disabled={!!editing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(meta?.kinds ?? []).map((k) => (
                      <SelectItem key={k.kind} value={k.kind}>
                        {getKindLabel(k.kind, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editing && <p className="text-muted-foreground text-xs">{t.typeLockedHint}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="n-name">{t.nameLabel}</Label>
                <Input
                  id="n-name"
                  placeholder={t.namePlaceholder}
                  value={form.name}
                  onChange={(e) => setF({ name: e.target.value })}
                />
              </div>

              {fields.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  该渠道的表单尚未定义（前端缺 CHANNEL_FIELDS 条目），请补全后再试。
                </p>
              ) : (
                fields.map((d) => (
                  <ConfigField
                    key={d.key}
                    def={d}
                    value={form.config[d.key]}
                    isSecret={secretKeys.has(d.key)}
                    onChange={(v) => setCfg(d.key, v)}
                  />
                ))
              )}

              <div className="grid gap-2">
                <Label>{t.timingLabel}</Label>
                <Select value={form.mode} onValueChange={(v) => setF({ mode: v as "realtime" | "digest" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">{t.timingRealtime}</SelectItem>
                    <SelectItem value="digest">{t.timingDigest}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">{t.timingHelp}</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="n-rate">{t.rateLimitLabel}</Label>
                <Input
                  id="n-rate"
                  type="number"
                  min={0}
                  placeholder={t.rateLimitPlaceholder(defaultRate)}
                  value={form.ratePerMin}
                  onChange={(e) => setF({ ratePerMin: e.target.value })}
                />
                <p className="text-muted-foreground text-xs">{t.rateLimitHelp}</p>
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium">{t.filtersHeading}</p>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>{t.minSeverityLabel}</Label>
                    <Select
                      value={form.minSeverity || "all"}
                      onValueChange={(v) => setF({ minSeverity: v === "all" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {severityOptions.map((o) => (
                          <SelectItem key={o.value || "all"} value={o.value || "all"}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="n-inc">{t.includeTypesLabel}</Label>
                    <Textarea
                      id="n-inc"
                      placeholder={t.includePlaceholder}
                      value={form.includeText}
                      onChange={(e) => setF({ includeText: e.target.value })}
                    />
                    <p className="text-muted-foreground text-xs">{t.includeHelp}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="n-exc">{t.excludeTypesLabel}</Label>
                    <Textarea
                      id="n-exc"
                      placeholder={t.excludePlaceholder}
                      value={form.excludeText}
                      onChange={(e) => setF({ excludeText: e.target.value })}
                    />
                    <p className="text-muted-foreground text-xs">{t.excludeHelp}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="n-tasks">{t.limitTasksLabel}</Label>
                    <Input
                      id="n-tasks"
                      placeholder="1, 2, 3"
                      value={form.taskIDsText}
                      onChange={(e) => setF({ taskIDsText: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="n-assets">{t.limitAssetsLabel}</Label>
                    <Input
                      id="n-assets"
                      placeholder="10, 11"
                      value={form.assetIDsText}
                      onChange={(e) => setF({ assetIDsText: e.target.value })}
                    />
                    <p className="text-muted-foreground text-xs">{t.tasksAssetsHelp}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.onStatusChange}
                      onCheckedChange={(v) => setF({ onStatusChange: v })}
                      aria-label="接收状态变更"
                    />
                    {t.statusChangeLabel}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setF({ enabled: v })}
                  aria-label={t.enableAria}
                />
                {t.enableChannelLabel}
              </div>
            </div>

            <div className="flex gap-2 pt-2 pb-6">
              <Button onClick={saveForm} disabled={saving}>
                {editing ? t.saveBtn : t.addBtn}
              </Button>
              {editing && (
                <Button variant="outline" onClick={testChannel} disabled={testing}>
                  <SendIcon /> {testing ? t.testingBtn : t.testMsgBtn}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
