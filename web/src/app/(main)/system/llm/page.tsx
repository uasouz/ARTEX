"use client";

import * as React from "react";

import {
  Loader2Icon,
  PlugZapIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SaveIcon,
  StarIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { LLMPoolMember, LLMPoolStatus, LLMProfile, LLMRetryOverride } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ProfileRetryFields, RetryPolicyPanel, ZERO_OVERRIDE } from "./_components/retry";

// The thinking switch (thinking.type) and the reasoning effort (reasoning_effort)
// are two INDEPENDENT fields, set separately — some APIs have no thinking field
// and activate reasoning purely through the effort parameter, hence the decoupling.
// Empty string in storage = field NOT SENT; Radix Select rejects empty values, so
// the UI uses the "none" sentinel and converts to/from "" (NONE / fromStore / toStore).
const NONE = "none";
const fromStore = (v?: string) => (v ? v : NONE);
const toStore = (v: string) => (v === NONE ? "" : v);

function sentLabel(locale: Locale) {
  if (locale === "pt") return "Não enviar (padrão)";
  if (locale === "zh") return "不发送（默认）";
  return "Not sent (default)";
}

function thinkingTypes(locale: Locale): { value: string; label: string }[] {
  const off = locale === "pt" ? "Desativado" : locale === "zh" ? "关闭" : "Disabled";
  const on = locale === "pt" ? "Ativado" : locale === "zh" ? "开启" : "Enabled";
  return [
    { value: NONE, label: sentLabel(locale) },
    { value: "disabled", label: off },
    { value: "enabled", label: on },
  ];
}

// Which request field name carries the output limit (only meaningful for the
// openai format). NONE ↔ "" goes through the same sentinel conversion.
function maxTokensFields(locale: Locale): { value: string; label: string }[] {
  const def = locale === "pt" ? "max_tokens (padrão)" : locale === "zh" ? "max_tokens（默认）" : "max_tokens (default)";
  return [
    { value: NONE, label: def },
    { value: "max_completion_tokens", label: "max_completion_tokens" },
  ];
}

// The other two formats have fixed field names, so the option is meaningless for
// them — the hint text explains that directly.
function maxTokensFieldHints(locale: Locale): Record<string, string> {
  if (locale === "pt") {
    return {
      openai:
        "Qual chave carrega o limite. max_tokens é o padrão que a maioria dos gateways aceita; os modelos de raciocínio oficiais da OpenAI (série-o / GPT-5) só aceitam max_completion_tokens e rejeitam max_tokens com unsupported_parameter.",
      anthropic: "Só selecionável no formato openai. O nome do campo na Anthropic é fixo: max_tokens.",
      "openai-responses":
        "Só selecionável no formato openai. O nome do campo na Responses API é fixo: max_output_tokens.",
    };
  }
  if (locale === "zh") {
    return {
      openai:
        "上限发哪个键。max_tokens 是默认，绝大多数兼容网关只认它；OpenAI 官方推理模型（o 系列 / GPT-5）反过来只认 max_completion_tokens，收到 max_tokens 会直接报 unsupported_parameter。",
      anthropic: "仅 openai 格式可选。Anthropic 的字段名固定为 max_tokens。",
      "openai-responses": "仅 openai 格式可选。Responses API 的字段名固定为 max_output_tokens。",
    };
  }
  return {
    openai:
      "Which key carries the limit. max_tokens is the default most compatible gateways accept; official OpenAI reasoning models (o-series / GPT-5) accept only max_completion_tokens and reject max_tokens with unsupported_parameter.",
    anthropic: "Only selectable for the openai format. Anthropic's field name is fixed as max_tokens.",
    "openai-responses":
      "Only selectable for the openai format. The Responses API field name is fixed as max_output_tokens.",
  };
}

function effortLevels(locale: Locale): { value: string; label: string }[] {
  return [
    { value: NONE, label: sentLabel(locale) },
    { value: "low", label: "low" },
    { value: "medium", label: "medium" },
    { value: "high", label: "high" },
    { value: "xhigh", label: "xhigh" },
    { value: "max", label: "max" },
  ];
}

function cooldownText(secs: number) {
  if (secs <= 0) return "";
  if (secs < 60) return `${secs}s`;
  return `${Math.ceil(secs / 60)}min`;
}

// The "health" badge shown on a profile card. A profile without a key cannot
// send requests at all, so that outranks the breaker; the remaining states come
// from polled breaker records (with polling off there are no new records, so
// "healthy" = no known failures).
type Health = { label: string; cls: string; hint?: string };
function healthOf(p: LLMProfile, m: LLMPoolMember | undefined, locale: Locale): Health {
  if (!p.api_key_hint) {
    return {
      label: locale === "pt" ? "Sem chave" : locale === "zh" ? "未配置 Key" : "No key set",
      cls: "border-muted-foreground/40 text-muted-foreground",
      hint:
        locale === "pt"
          ? "Sem API Key configurada, não é possível chamar"
          : locale === "zh"
            ? "未填 API Key，无法调用"
            : "No API key configured, calls impossible",
    };
  }
  if (m?.state === "tripped") {
    const tripped = locale === "pt" ? "Aberto" : locale === "zh" ? "已熔断" : "Tripped";
    return {
      label: m.cooldown_secs > 0 ? `${tripped} · ${cooldownText(m.cooldown_secs)}` : tripped,
      cls: "border-destructive/50 text-destructive",
      hint: m.last_error,
    };
  }
  if (m?.state === "degraded") {
    const degraded = locale === "pt" ? "Degradado" : locale === "zh" ? "异常" : "Degraded";
    const fails =
      locale === "pt"
        ? `${degraded} · ${m.fails} falhas`
        : locale === "zh"
          ? `${degraded} · 失败 ${m.fails} 次`
          : `${degraded} · ${m.fails} failures`;
    return {
      label: fails,
      cls: "border-amber-500/50 text-amber-600 dark:text-amber-400",
      hint: m.last_error,
    };
  }
  return {
    label: locale === "pt" ? "Normal" : locale === "zh" ? "正常" : "Healthy",
    cls: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pool configuration sheet
// ─────────────────────────────────────────────────────────────────────────────

function PoolSheet({
  open,
  onOpenChange,
  pool,
  onReload,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pool: LLMPoolStatus | null;
  onReload: () => Promise<void>;
}) {
  const { locale } = useI18n();
  const [busy, setBusy] = React.useState(false);

  const t = React.useMemo(() => {
    if (locale === "pt") {
      return {
        poolOn: "Pool de LLM ativado",
        poolOff: "Pool de LLM desativado",
        fallbackUpdated: "Ajustes de fallback atualizados",
        setFailed: (e: string) => `Falha ao aplicar ajustes: ${e}`,
        recoveredOne: "Perfil recuperado",
        recoveredAll: "Todos os perfis recuperados",
        recoverFailed: (e: string) => `Falha ao recuperar: ${e}`,
        title: "Pool de LLM · failover",
        description: (
          <>
            Quando ativado, agents <b>sem modelo fixo</b> passam automaticamente para o próximo perfil quando o atual
            fica indisponível (sem crédito / chave inválida / limite de requisições / erro de serviço).
          </>
        ),
        enablePool: "Ativar pool",
        enablePoolHint: "Desativado por padrão. Desligado, só o perfil ativo é usado e falhas permanecem falhas.",
        poolToggleAria: "Alternador do pool de LLM",
        pinnedFallback: "Também usar fallback quando um modelo fixo falhar",
        pinnedFallbackHint:
          "Desativado por padrão: quando um agent ou tarefa fixa um perfil, só ele é usado e a falha permanece (sem troca silenciosa de modelo). Ativado, um perfil fixo que falha também cai para a cadeia do pool abaixo.",
        pinnedFallbackAria: "Alternador de fallback para perfil fixo",
        order: "Ordem do pool",
        recoverAll: "Recuperar todos",
        tooFew: (n: number) =>
          `Apenas ${n} perfil(is) utilizável(is) — o pool não tem efeito; são necessários pelo menos 2 perfis com API Key e participando do pool.`,
        active: "Ativo",
        excluded: "Fora do pool",
        cooldown: (x: string) => `Cooldown ${x}`,
        consecutiveFails: (n: number) => `${n} falhas consecutivas`,
        recoverNowAria: "Recuperar agora",
        recoverNowTitle: "Recuperar agora: limpa a abertura, a próxima chamada retenta este perfil",
        priority: (n: number) => `Prioridade ${n}`,
        noProfiles: "Nenhum perfil",
        footer:
          "O perfil ativo é sempre o primeiro; os demais seguem a prioridade (definida em cada perfil), da maior para a menor. Após uma falha, o perfil entra em cooldown (60s → 5min → 30min), é pulado durante o cooldown e volta automaticamente depois de recuperado. Perfis cuja janela de contexto não comporta a requisição atual são pulados. Agents e tarefas com modelo fixo não participam do pool por padrão.",
      };
    }
    if (locale === "zh") {
      return {
        poolOn: "已开启 LLM 轮询",
        poolOff: "已关闭 LLM 轮询",
        fallbackUpdated: "已更新兜底设置",
        setFailed: (e: string) => `设置失败：${e}`,
        recoveredOne: "已恢复该配置",
        recoveredAll: "已恢复全部配置",
        recoverFailed: (e: string) => `恢复失败：${e}`,
        title: "LLM 轮询 · 故障转移",
        description: (
          <>
            开启后，<b>未指定模型</b>的 Agent 在当前配置不可用（余额不足 / Key 失效 / 限流 /
            服务异常）时自动切到下一个配置。
          </>
        ),
        enablePool: "启用轮询",
        enablePoolHint: "默认关闭。关闭时始终只用激活配置，失败即失败。",
        poolToggleAria: "LLM 轮询开关",
        pinnedFallback: "指定模型失败时也兜底",
        pinnedFallbackHint:
          "默认关闭：Agent 或任务指定了某个配置就只用它，失败即失败（不会悄悄换成别的模型）。开启后，指定的配置失败时也会回落到下面的轮询链。",
        pinnedFallbackAria: "绑定配置失败兜底开关",
        order: "轮询顺序",
        recoverAll: "全部恢复",
        tooFew: (n: number) => `当前只有 ${n} 个可用配置，轮询不会生效——至少需要 2 个已填 API Key 且参与轮询的配置。`,
        active: "激活",
        excluded: "不参与轮询",
        cooldown: (x: string) => `冷却 ${x}`,
        consecutiveFails: (n: number) => `连续失败 ${n} 次`,
        recoverNowAria: "立即恢复",
        recoverNowTitle: "立即恢复：清除熔断，下次调用重试该配置",
        priority: (n: number) => `优先级 ${n}`,
        noProfiles: "暂无配置",
        footer:
          "激活配置恒为第 1 顺位，其余按优先级从高到低（在各配置里设置）。某个配置失败后进入冷却（60s → 5min → 30min），冷却期内被跳过，恢复后自动切回。上下文窗口装不下当前请求的配置会被跳过。指定了模型的 Agent 与任务默认不参与轮询。",
      };
    }
    return {
      poolOn: "LLM pool enabled",
      poolOff: "LLM pool disabled",
      fallbackUpdated: "Fallback settings updated",
      setFailed: (e: string) => `Settings update failed: ${e}`,
      recoveredOne: "Profile recovered",
      recoveredAll: "All profiles recovered",
      recoverFailed: (e: string) => `Recovery failed: ${e}`,
      title: "LLM pool · failover",
      description: (
        <>
          When enabled, agents <b>without a pinned model</b> automatically move to the next profile when the current one
          is unavailable (out of credit / dead key / rate limited / service errors).
        </>
      ),
      enablePool: "Enable pool",
      enablePoolHint: "Off by default. When off, only the active profile is ever used and failures stay failures.",
      poolToggleAria: "LLM pool toggle",
      pinnedFallback: "Also fall back when a pinned model fails",
      pinnedFallbackHint:
        "Off by default: when an agent or task pins a profile, only that profile is used and failures stay failures (no silent model swaps). When on, a failing pinned profile also falls back to the pool chain below.",
      pinnedFallbackAria: "Pinned-profile fallback toggle",
      order: "Pool order",
      recoverAll: "Recover all",
      tooFew: (n: number) =>
        `Only ${n} usable profile(s) — the pool has no effect; at least 2 profiles with API keys and pool participation are required.`,
      active: "Active",
      excluded: "Excluded from pool",
      cooldown: (x: string) => `Cooldown ${x}`,
      consecutiveFails: (n: number) => `${n} consecutive failures`,
      recoverNowAria: "Recover now",
      recoverNowTitle: "Recover now: clears the trip, next call retries this profile",
      priority: (n: number) => `Priority ${n}`,
      noProfiles: "No profiles",
      footer:
        "The active profile is always first; the rest follow priority (set per profile), high to low. After a failure a profile enters cooldown (60s → 5min → 30min), is skipped while cooling, and is switched back to automatically after recovery. Profiles whose context window cannot fit the current request are skipped. Agents and tasks with a pinned model do not use the pool by default.",
    };
  }, [locale]);

  // The cooldown countdown is the remaining seconds computed by the backend —
  // poll periodically only while the sheet is open and something is unhealthy.
  React.useEffect(() => {
    if (!open || !pool?.enabled || !pool.chain.some((m) => m.state !== "ok")) return;
    const timer = setInterval(() => void onReload(), 10_000);
    return () => clearInterval(timer);
  }, [open, pool, onReload]);

  async function toggle(patch: { llm_pool_enabled?: boolean; llm_pool_bind_fallback?: boolean }) {
    if (busy) return;
    setBusy(true);
    try {
      await api.setSettings(patch);
      await onReload();
      if (patch.llm_pool_enabled !== undefined) {
        toast.success(patch.llm_pool_enabled ? t.poolOn : t.poolOff);
      } else {
        toast.success(t.fallbackUpdated);
      }
    } catch (e) {
      toast.error(t.setFailed((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function recover(id?: string) {
    try {
      await api.resetLLMPool(id);
      await onReload();
      toast.success(id ? t.recoveredOne : t.recoveredAll);
    } catch (e) {
      toast.error(t.recoverFailed((e as Error).message));
    }
  }

  const enabled = pool?.enabled ?? false;
  const chain = pool?.chain ?? [];
  // Pool members (excluding those marked "excluded"), in the actual backend try order.
  const inChain = chain.filter((m) => m.active || !m.excluded);
  const tripped = chain.filter((m) => m.state === "tripped");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="px-4">
          <SheetTitle className="flex items-center gap-2">
            <ZapIcon className="size-4" /> {t.title}
          </SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="grid gap-0.5">
              <Label className="text-sm">{t.enablePool}</Label>
              <p className="text-muted-foreground text-xs">{t.enablePoolHint}</p>
            </div>
            <Switch
              checked={enabled}
              disabled={busy}
              onCheckedChange={(v) => void toggle({ llm_pool_enabled: v })}
              aria-label={t.poolToggleAria}
            />
          </div>

          {enabled && (
            <>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="grid gap-0.5">
                  <Label className="text-sm">{t.pinnedFallback}</Label>
                  <p className="text-muted-foreground text-xs">{t.pinnedFallbackHint}</p>
                </div>
                <Switch
                  checked={pool?.bind_fallback ?? false}
                  disabled={busy}
                  onCheckedChange={(v) => void toggle({ llm_pool_bind_fallback: v })}
                  aria-label={t.pinnedFallbackAria}
                />
              </div>

              <Separator />

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t.order}</Label>
                  {tripped.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => void recover()}>
                      <RotateCcwIcon /> {t.recoverAll}
                    </Button>
                  )}
                </div>
                {inChain.length < 2 && <p className="text-muted-foreground text-xs">{t.tooFew(inChain.length)}</p>}
                {chain.map((m) => {
                  const excluded = m.excluded && !m.active;
                  const order = excluded ? null : inChain.findIndex((x) => x.profile_id === m.profile_id) + 1;
                  return (
                    <div
                      key={m.profile_id}
                      className={cn(
                        "grid gap-1 rounded-lg border p-2.5 text-sm",
                        excluded && "opacity-55",
                        m.state === "tripped" && "border-destructive/40",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="w-5 shrink-0 text-center font-mono text-muted-foreground text-xs">
                          {order ?? "—"}
                        </span>
                        <span className="font-medium">{m.name}</span>
                        {m.active && (
                          <Badge variant="outline" className="border-amber-400/50 text-amber-500">
                            {t.active}
                          </Badge>
                        )}
                        {excluded && <Badge variant="outline">{t.excluded}</Badge>}
                        <div className="ml-auto flex items-center gap-2">
                          {m.state === "tripped" && m.cooldown_secs > 0 && (
                            <span className="text-muted-foreground text-xs">
                              {t.cooldown(cooldownText(m.cooldown_secs))}
                            </span>
                          )}
                          {m.state === "degraded" && (
                            <span className="text-muted-foreground text-xs">{t.consecutiveFails(m.fails)}</span>
                          )}
                          {m.state !== "ok" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              aria-label={t.recoverNowAria}
                              title={t.recoverNowTitle}
                              onClick={() => void recover(m.profile_id)}
                            >
                              <RotateCcwIcon className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 pl-7 text-muted-foreground text-xs">
                        <code className="truncate font-mono">{m.model}</code>
                        {!m.active && <span>{t.priority(m.priority)}</span>}
                      </div>
                      {m.last_error && (
                        <p className="truncate pl-7 font-mono text-muted-foreground text-xs" title={m.last_error}>
                          {m.last_error}
                        </p>
                      )}
                    </div>
                  );
                })}
                {chain.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
                    {t.noProfiles}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-dashed p-3 text-muted-foreground text-xs leading-relaxed">
                {t.footer}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Model profile sheet (create / edit share the same form)
// ─────────────────────────────────────────────────────────────────────────────

function ProfileSheet({
  profile,
  open,
  onOpenChange,
  onSaved,
}: {
  profile: LLMProfile | null; // null = create
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: (id: string) => void;
}) {
  const { locale } = useI18n();
  const isNew = !profile;
  const [name, setName] = React.useState("");
  const [format, setFormat] = React.useState<"anthropic" | "openai" | "openai-responses">("anthropic");
  const [model, setModel] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [proxy, setProxy] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [keyHint, setKeyHint] = React.useState("");
  const [rps, setRps] = React.useState("0");
  const [rpm, setRpm] = React.useState("0");
  const [cw, setCw] = React.useState("0"); // Context window (K tokens); 0 = default 200K
  const [thinkingType, setThinkingType] = React.useState(NONE);
  const [effort, setEffort] = React.useState(NONE);
  const [priority, setPriority] = React.useState("0"); // Pool order; higher = earlier
  const [poolExclude, setPoolExclude] = React.useState(false);
  const [streaming, setStreaming] = React.useState(true); // true = streaming (default)
  const [maxTokens, setMaxTokens] = React.useState("0"); // Per-reply output limit; 0 = not sent
  const [maxTokensField, setMaxTokensField] = React.useState(NONE); // Field name for the limit; NONE = max_tokens
  const [sessionHeaderKey, setSessionHeaderKey] = React.useState(""); // Custom session header; empty = not sent
  const [retry, setRetry] = React.useState<LLMRetryOverride>(ZERO_OVERRIDE); // Per-profile retry override; all 0 = follow global
  const [testing, setTesting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [models, setModels] = React.useState<string[]>([]);
  const [loadingModels, setLoadingModels] = React.useState(false);
  const [modelsOpen, setModelsOpen] = React.useState(false);

  const t = React.useMemo(() => {
    if (locale === "pt") {
      return {
        modelsLoaded: (n: number) => `${n} modelos carregados`,
        loadModelsFailed: (e: string) => `Falha ao carregar modelos: ${e}`,
        noModels: "nenhum modelo retornado",
        loadModelsError: (e: string) => `Erro ao carregar modelos: ${e}`,
        connected: (ms: unknown, m: string) => `Conectado · ${ms}ms · ${m}`,
        reply: (r: string) => `Resposta: ${r}`,
        connectFailed: (e: string) => `Falha de conexão: ${e}`,
        unknown: "desconhecido",
        testError: (e: string) => `Erro no teste: ${e}`,
        nameModelRequired: "Preencha nome e modelo",
        created: (n: string) => `Criado: ${n} (use "Ativar" no cartão para habilitar)`,
        savedActive: "Salvo. O perfil ativo tem efeito imediato, sem reiniciar",
        saved: "Salvo",
        saveFailed: (e: string) => `Falha ao salvar: ${e}`,
        newTitle: "Novo perfil de modelo",
        editTitle: (n: string) => `Editar: ${n}`,
        activeBadge: "Ativo",
        newDesc: 'Novos perfis não são ativados automaticamente; use "Ativar" no cartão para habilitar.',
        editDesc: "Clique em salvar após editar; salvar o perfil ativo aplica a todos os agents imediatamente.",
        nameLabel: "Nome",
        namePlaceholder: "ex.: OpenAI produção",
        formatLabel: "Formato",
        formatPlaceholder: "Selecionar formato",
        modelLabel: "Modelo",
        loadModelsTitle: "Carregar modelos disponíveis da API",
        baseUrlLabel: "Base URL (opcional)",
        proxyLabel: "Proxy (opcional)",
        proxyHelp:
          "Apenas requisições LLM de saída usam este proxy; http/https/socks5 suportados, com credenciais opcionais (ex.: socks5://user:pass@host:port, caracteres especiais da senha em URL-encode); vazio significa conexão direta.",
        sessionHeaderLabel: "Cabeçalho de sessão customizado (opcional)",
        sessionHeaderPlaceholder: "ex.: x-session-id (vazio = não enviar)",
        sessionHeaderHelp:
          "Com um nome definido, toda requisição leva este cabeçalho HTTP com o id da sessão atual como valor (chats como conv-12, workers como exp3-worker-i87). Útil para gateways que fazem cache de prompt / roteamento fixo por cabeçalho de session-id: estável na mesma sessão, distinto entre sessões. Vazio = não enviar.",
        keyPlaceholder: (h: string) => `Definida (${h}) — deixe vazio para manter`,
        rpsLabel: "Limite por segundo",
        rpmLabel: "Limite por minuto",
        cwLabel: "Janela de contexto (K)",
        limitsHelp:
          "Limite 0 = ilimitado, compartilhado entre todos os agents. A janela de contexto é em K (milhares de tokens), 0 = padrão 200K, máximo 1000 (ou seja, 1M); alto demais impede o gatilho de compressão.",
        priorityLabel: "Prioridade no pool",
        priorityHelp:
          "Números maiores são escolhidos primeiro; o perfil ativo é sempre o primeiro, independente deste valor. Perfis com a mesma prioridade se alternam na frente, distribuindo a cota naturalmente.",
        excludeLabel: "Fora do pool",
        excludeHelp:
          "Ativado, este perfil nunca é usado como destino de failover (ainda pode ser fixado explicitamente por um agent / tarefa). Ideal para perfis caros dedicados a um agent que não devem ser queimados por falhas alheias.",
        streamingLabel: "Saída em streaming",
        streamingHelp:
          "Ligado (padrão) usa SSE em streaming com progresso em tempo real e contagem de tokens ao vivo. Desligado usa não-streaming real (stream:false, uma resposta completa) — contorna gateways com SSE mal implementado (quadros vazios / campos de raciocínio perdidos), ao custo do progresso em tempo real.",
        maxTokensLabel: "Limite de saída · max tokens",
        maxTokensHelp:
          "Quantos tokens no máximo uma resposta pode gerar, enviado a cada requisição. 0 (padrão) = campo não enviado, o padrão do servidor decide. Isto é diferente da janela de contexto acima: aquela é a capacidade total do modelo, usada localmente para o limiar de compressão. Valor pequeno demais trunca modelos de raciocínio no meio do pensamento, sem nenhuma resposta.",
        fieldLabel: "Nome do campo do limite",
        thinkingLabel: "Interruptor de raciocínio · thinking.type",
        thinkingHelp:
          "Controla se o campo thinking é enviado. Não enviar = campo omitido (compatível com modelos como MiniMax que não o têm); desativado envia disabled; ativado envia enabled. Independente do nível abaixo.",
        effortLabel: "Esforço de raciocínio · reasoning_effort",
        effortHelp:
          "Um dial de esforço separado (OpenAI reasoning_effort / Anthropic output_config.effort). Algumas APIs não têm o campo thinking e ativam o raciocínio só pelo esforço; por isso pode ser definido isoladamente, sem o interruptor.",
        testing: "Testando…",
        testButton: "Testar conexão",
        createButton: "Criar",
        saveButton: "Salvar",
      };
    }
    if (locale === "zh") {
      return {
        modelsLoaded: (n: number) => `已加载 ${n} 个模型`,
        loadModelsFailed: (e: string) => `加载模型失败：${e}`,
        noModels: "未获取到模型",
        loadModelsError: (e: string) => `加载模型出错：${e}`,
        connected: (ms: unknown, m: string) => `连接成功 · ${ms}ms · ${m}`,
        reply: (r: string) => `回复：${r}`,
        connectFailed: (e: string) => `连接失败：${e}`,
        unknown: "未知",
        testError: (e: string) => `测试出错：${e}`,
        nameModelRequired: "请填写名称与模型",
        created: (n: string) => `已新建：${n}（在卡片上「设为激活」以启用）`,
        savedActive: "已保存，激活配置即时生效，无需重启",
        saved: "已保存",
        saveFailed: (e: string) => `保存失败：${e}`,
        newTitle: "新建模型配置",
        editTitle: (n: string) => `编辑：${n}`,
        activeBadge: "激活中",
        newDesc: "新建后不会自动激活，请在卡片上「设为激活」以启用。",
        editDesc: "修改后点击保存；激活配置保存后对全部 Agent 立即生效。",
        nameLabel: "名称",
        namePlaceholder: "例如：OpenAI 生产",
        formatLabel: "格式",
        formatPlaceholder: "选择格式",
        modelLabel: "模型",
        loadModelsTitle: "从 API 加载可用模型",
        baseUrlLabel: "Base URL（可选）",
        proxyLabel: "代理（可选）",
        proxyHelp:
          "仅 LLM 出站请求走此代理，支持 http/https/socks5，可带账号密码（如 socks5://user:pass@host:port，密码含特殊字符需 URL 编码）；留空表示不使用代理（直连）。",
        sessionHeaderLabel: "自定义会话头（可选）",
        sessionHeaderPlaceholder: "如 x-session-id（留空=不发送）",
        sessionHeaderHelp:
          "填写头名后，每次请求都会带上这个 HTTP 头，头值自动填为当前会话的 session id（chat 会话如 conv-12、worker 如 exp3-worker-i87）。用于按 session-id 头做提示缓存 / 粘性路由的网关；同一会话多轮稳定、不同会话互不相同。留空则不发送。",
        keyPlaceholder: (h: string) => `已设置（${h}），留空保持不变`,
        rpsLabel: "每秒限速",
        rpmLabel: "每分钟限速",
        cwLabel: "上下文窗口(K)",
        limitsHelp:
          "限速 0 = 不限，全 Agent 共享。上下文窗口单位 K（千 token），0 = 默认 200K，上限 1000（即 1M）；设太高会导致压缩不触发。",
        priorityLabel: "轮询优先级",
        priorityHelp:
          "数字越大越先被选中；激活配置恒为第 1 顺位，与本值无关。相同优先级的配置会轮流打头，天然分摊额度。",
        excludeLabel: "不参与轮询",
        excludeHelp:
          "开启后不会被当作故障转移目标（仍可被 Agent / 任务显式指定使用）。适合「只给某个 Agent 专用、不希望别人失败时烧掉」的昂贵配置。",
        streamingLabel: "流式输出 · streaming",
        streamingHelp:
          "开启（默认）走流式 SSE，有运行中实时进度与实时 token 计数。关闭则走真·非流式（stream:false，一次性返回完整响应）——可绕开部分网关糟糕的 SSE 实现（空帧 / 思考字段丢帧），代价是失去运行中的实时进度。",
        maxTokensLabel: "输出上限 · max tokens",
        maxTokensHelp:
          "单次回复最多生成多少 token，随每次请求发出。0（默认）= 不发送该字段，由服务端默认值决定。这与上面的「上下文窗口」是两回事：那是模型总容量，只在本地用来算压缩阈值。设太小会让推理模型在思考阶段就被截断，一个字答案都出不来。",
        fieldLabel: "上限字段名",
        thinkingLabel: "思考开关 · thinking.type",
        thinkingHelp:
          "控制是否发送 thinking 字段。不发送=不带该字段（兼容 MiniMax 等不支持的模型）；关闭=发 disabled；开启=发 enabled。与下面的强度互相独立。",
        effortLabel: "思考强度 · reasoning_effort",
        effortHelp:
          "独立的强度档位（OpenAI reasoning_effort / Anthropic output_config.effort）。有些接口没有 thinking 字段、只靠强度即可激活思考，故可单独设置、不发送思考开关。",
        testing: "测试中…",
        testButton: "测试连接",
        createButton: "新建",
        saveButton: "保存",
      };
    }
    return {
      modelsLoaded: (n: number) => `Loaded ${n} models`,
      loadModelsFailed: (e: string) => `Failed to load models: ${e}`,
      noModels: "no models returned",
      loadModelsError: (e: string) => `Error loading models: ${e}`,
      connected: (ms: unknown, m: string) => `Connected · ${ms}ms · ${m}`,
      reply: (r: string) => `Reply: ${r}`,
      connectFailed: (e: string) => `Connection failed: ${e}`,
      unknown: "unknown",
      testError: (e: string) => `Test error: ${e}`,
      nameModelRequired: "Name and model are required",
      created: (n: string) => `Created: ${n} (use "Set active" on its card to enable)`,
      savedActive: "Saved. The active profile takes effect immediately, no restart needed",
      saved: "Saved",
      saveFailed: (e: string) => `Save failed: ${e}`,
      newTitle: "New model profile",
      editTitle: (n: string) => `Edit: ${n}`,
      activeBadge: "Active",
      newDesc: 'New profiles are not activated automatically; use "Set active" on its card to enable.',
      editDesc: "Click save after editing; saving the active profile applies to all agents immediately.",
      nameLabel: "Name",
      namePlaceholder: "e.g. OpenAI production",
      formatLabel: "Format",
      formatPlaceholder: "Select format",
      modelLabel: "Model",
      loadModelsTitle: "Load available models from the API",
      baseUrlLabel: "Base URL (optional)",
      proxyLabel: "Proxy (optional)",
      proxyHelp:
        "Only outbound LLM requests use this proxy; http/https/socks5 supported, with optional credentials (e.g. socks5://user:pass@host:port, URL-encode special characters in the password); empty means direct connection.",
      sessionHeaderLabel: "Custom session header (optional)",
      sessionHeaderPlaceholder: "e.g. x-session-id (empty = not sent)",
      sessionHeaderHelp:
        "When a header name is set, every request carries this HTTP header with the current session id as the value (chat sessions like conv-12, workers like exp3-worker-i87). Useful for gateways that do prompt caching / sticky routing by a session-id header: stable within a session, distinct across sessions. Empty = not sent.",
      keyPlaceholder: (h: string) => `Set (${h}) — leave empty to keep`,
      rpsLabel: "Rate per second",
      rpmLabel: "Rate per minute",
      cwLabel: "Context window (K)",
      limitsHelp:
        "Rate 0 = unlimited, shared across all agents. Context window unit is K (thousand tokens), 0 = default 200K, max 1000 (i.e. 1M); setting it too high stops compression from triggering.",
      priorityLabel: "Pool priority",
      priorityHelp:
        "Higher numbers are picked first; the active profile is always first regardless of this value. Profiles with equal priority take turns leading, naturally spreading quota.",
      excludeLabel: "Excluded from pool",
      excludeHelp:
        "When on, this profile is never used as a failover target (it can still be explicitly pinned by an agent / task). Suited to expensive profiles dedicated to one agent that should not be burned by others' failures.",
      streamingLabel: "Streaming output",
      streamingHelp:
        "On (default) uses streaming SSE with live progress and live token counting during runs. Off uses true non-streaming (stream:false, one full response) — a workaround for gateways with broken SSE implementations (empty frames / dropped thinking fields), at the cost of live progress.",
      maxTokensLabel: "Output limit · max tokens",
      maxTokensHelp:
        "How many tokens a single reply may generate at most, sent with every request. 0 (default) = field not sent, the server default decides. This is separate from the context window above: that is total model capacity, only used locally to compute the compression threshold. Too small a value truncates reasoning models mid-thinking with no answer at all.",
      fieldLabel: "Limit field name",
      thinkingLabel: "Thinking switch · thinking.type",
      thinkingHelp:
        "Controls whether the thinking field is sent. Not sent = field omitted (compatible with models like MiniMax that lack it); disabled sends disabled; enabled sends enabled. Independent of the effort level below.",
      effortLabel: "Reasoning effort · reasoning_effort",
      effortHelp:
        "A separate effort dial (OpenAI reasoning_effort / Anthropic output_config.effort). Some APIs have no thinking field and activate reasoning purely by effort, hence it can be set alone without the thinking switch.",
      testing: "Testing…",
      testButton: "Test connection",
      createButton: "Create",
      saveButton: "Save",
    };
  }, [locale]);

  const THINKING_TYPES = React.useMemo(() => thinkingTypes(locale), [locale]);
  const MAX_TOKENS_FIELDS = React.useMemo(() => maxTokensFields(locale), [locale]);
  const MAX_TOKENS_FIELD_HINTS = React.useMemo(() => maxTokensFieldHints(locale), [locale]);
  const EFFORT_LEVELS = React.useMemo(() => effortLevels(locale), [locale]);

  // Refill the form from the profile every time the sheet opens (reset to
  // defaults when creating). Closing and reopening is always a clean start.
  React.useEffect(() => {
    if (!open) return;
    setName(profile?.name ?? "");
    setFormat(profile?.format === "openai" || profile?.format === "openai-responses" ? profile.format : "anthropic");
    setModel(profile?.model ?? "");
    setBaseUrl(profile?.base_url ?? "");
    setProxy(profile?.proxy ?? "");
    setRps(String(profile?.rate_per_second ?? 0));
    setRpm(String(profile?.rate_per_minute ?? 0));
    setCw(String(profile?.context_window_k ?? 0));
    setThinkingType(fromStore(profile?.thinking_type));
    setEffort(fromStore(profile?.reasoning_effort));
    setPriority(String(profile?.priority ?? 0));
    setPoolExclude(profile?.pool_exclude ?? false);
    setStreaming(profile?.streaming ?? true);
    setMaxTokens(String(profile?.max_tokens ?? 0));
    setMaxTokensField(fromStore(profile?.max_tokens_field));
    setSessionHeaderKey(profile?.session_header_key ?? "");
    setRetry(profile?.retry ?? ZERO_OVERRIDE);
    setApiKey("");
    setKeyHint(profile?.api_key_hint ?? "");
    setModels([]);
    setModelsOpen(false);
  }, [open, profile]);

  const profileId = profile ? Number(profile.id) : undefined;

  async function loadModels() {
    if (loadingModels) return;
    setLoadingModels(true);
    setModels([]);
    try {
      const r = await api.fetchLLMModels(format, baseUrl, apiKey, proxy, profileId);
      if (r.ok && r.models && r.models.length > 0) {
        setModels(r.models);
        setModelsOpen(true);
        toast.success(t.modelsLoaded(r.models.length));
      } else {
        toast.error(t.loadModelsFailed(r.error ?? t.noModels));
      }
    } catch (e) {
      toast.error(t.loadModelsError((e as Error).message));
    } finally {
      setLoadingModels(false);
    }
  }

  async function testConnection() {
    if (testing) return;
    setTesting(true);
    try {
      // Test with the thinking parameters the profile would actually use, so a
      // model that lacks the field fails here instead of mid-task. Passing the
      // profile id lets a blank key box reuse the stored key.
      const r = await api.testLLM(
        format,
        model,
        baseUrl,
        apiKey,
        proxy,
        toStore(thinkingType),
        toStore(effort),
        profileId,
        streaming,
        sessionHeaderKey.trim(),
      );
      // Show the reply too: seeing the model actually speak proves the path works.
      if (r.ok)
        toast.success(t.connected(r.latency_ms ?? "?", r.model ?? model), {
          description: r.reply ? t.reply(r.reply) : undefined,
        });
      else toast.error(t.connectFailed(r.error ?? t.unknown));
    } catch (e) {
      toast.error(t.testError((e as Error).message));
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    if (!name.trim() || !model.trim()) {
      toast.error(t.nameModelRequired);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const { id } = await api.saveLLMProfile({
        ...(profile ? { id: Number(profile.id) } : {}),
        name: name.trim(),
        format,
        model: model.trim(),
        base_url: baseUrl.trim(),
        proxy: proxy.trim(),
        api_key: apiKey,
        rate_per_second: Number(rps) || 0,
        rate_per_minute: Number(rpm) || 0,
        context_window_k: Number(cw) || 0,
        thinking_type: toStore(thinkingType),
        reasoning_effort: toStore(effort),
        priority: Number(priority) || 0,
        pool_exclude: poolExclude,
        streaming,
        max_tokens: Math.max(0, Number(maxTokens) || 0),
        // The field-name switch only matters for openai (Chat Completions); other
        // formats fall back to the default. The backend normalizes again — this
        // just keeps the UI from sending contradictory values.
        max_tokens_field: format === "openai" ? toStore(maxTokensField) : "",
        session_header_key: sessionHeaderKey.trim(),
        retry,
      });
      if (isNew) toast.success(t.created(name.trim()));
      else toast.success(profile?.is_default ? t.savedActive : t.saved);
      onSaved(String(id));
      onOpenChange(false);
    } catch (e) {
      toast.error(t.saveFailed((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:min-w-[420px] data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="px-4">
          <SheetTitle className="flex items-center gap-2">
            {isNew ? t.newTitle : t.editTitle(profile?.name ?? "")}
            {profile?.is_default && (
              <Badge variant="outline" className="border-amber-400/50 text-amber-500">
                {t.activeBadge}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>{isNew ? t.newDesc : t.editDesc}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="p-name">{t.nameLabel}</Label>
              <Input
                id="p-name"
                placeholder={t.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t.formatLabel}</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as "anthropic" | "openai" | "openai-responses")}>
                <SelectTrigger>
                  <SelectValue placeholder={t.formatPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="openai">OpenAI (Chat Completions)</SelectItem>
                  <SelectItem value="openai-responses">OpenAI (Responses API)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="p-model">{t.modelLabel}</Label>
            <div className="flex gap-2">
              <Input
                id="p-model"
                className="font-mono"
                placeholder="claude-opus-4-8"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
              {/* modal: this Popover's content is portaled to <body>, outside the
                  Sheet's scroll lock; without modal the list renders but cannot
                  scroll. modal lets it hold its own top-layer scroll lock. */}
              <Popover open={modelsOpen} onOpenChange={setModelsOpen} modal>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={loadingModels}
                    onClick={loadModels}
                    title={t.loadModelsTitle}
                  >
                    {loadingModels ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
                  </Button>
                </PopoverTrigger>
                {models.length > 0 && (
                  <PopoverContent className="max-h-72 w-72 gap-0 overflow-y-auto overscroll-contain p-1" align="end">
                    {models.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="w-full shrink-0 rounded-md px-2 py-1.5 text-left font-mono text-xs hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setModel(m);
                          setModelsOpen(false);
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </PopoverContent>
                )}
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="p-base-url">{t.baseUrlLabel}</Label>
            <Input
              id="p-base-url"
              className="font-mono"
              placeholder="https://api.openai.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="p-proxy">{t.proxyLabel}</Label>
            <Input
              id="p-proxy"
              className="font-mono"
              placeholder="socks5://user:pass@127.0.0.1:1080 · http://127.0.0.1:8080"
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t.proxyHelp}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="p-session-header">{t.sessionHeaderLabel}</Label>
            <Input
              id="p-session-header"
              className="font-mono"
              placeholder={t.sessionHeaderPlaceholder}
              value={sessionHeaderKey}
              onChange={(e) => setSessionHeaderKey(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t.sessionHeaderHelp}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="p-api-key">API Key</Label>
            <Input
              id="p-api-key"
              type="password"
              placeholder={keyHint ? t.keyPlaceholder(keyHint) : "sk-…"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="p-rps">{t.rpsLabel}</Label>
              <Input id="p-rps" type="number" min={0} value={rps} onChange={(e) => setRps(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-rpm">{t.rpmLabel}</Label>
              <Input id="p-rpm" type="number" min={0} value={rpm} onChange={(e) => setRpm(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-cw">{t.cwLabel}</Label>
              <Input
                id="p-cw"
                type="number"
                min={0}
                max={1000}
                value={cw}
                onChange={(e) => setCw(e.target.value)}
                placeholder="200"
              />
            </div>
          </div>
          <p className="-mt-2 text-muted-foreground text-xs">{t.limitsHelp}</p>

          <div className="grid gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-0.5">
                <Label htmlFor="p-priority" className="text-sm">
                  {t.priorityLabel}
                </Label>
                <p className="text-muted-foreground text-xs">{t.priorityHelp}</p>
              </div>
              <Input
                id="p-priority"
                type="number"
                className="w-24 shrink-0"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-3">
              <div className="grid gap-0.5">
                <Label className="text-sm">{t.excludeLabel}</Label>
                <p className="text-muted-foreground text-xs">{t.excludeHelp}</p>
              </div>
              <Switch checked={poolExclude} onCheckedChange={setPoolExclude} aria-label={t.excludeLabel} />
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-3">
              <div className="grid gap-0.5">
                <Label className="text-sm">{t.streamingLabel}</Label>
                <p className="text-muted-foreground text-xs">{t.streamingHelp}</p>
              </div>
              <Switch checked={streaming} onCheckedChange={setStreaming} aria-label={t.streamingLabel} />
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-0.5">
                <Label htmlFor="p-max-tokens" className="text-sm">
                  {t.maxTokensLabel}
                </Label>
                <p className="text-muted-foreground text-xs">{t.maxTokensHelp}</p>
              </div>
              <Input
                id="p-max-tokens"
                type="number"
                min={0}
                className="w-28 shrink-0"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-3">
              <div className="grid gap-0.5">
                <Label className="text-sm">{t.fieldLabel}</Label>
                <p className="text-muted-foreground text-xs">{MAX_TOKENS_FIELD_HINTS[format]}</p>
              </div>
              <Select
                value={format === "openai" ? maxTokensField : NONE}
                onValueChange={setMaxTokensField}
                disabled={format !== "openai"}
              >
                <SelectTrigger className="w-56 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_TOKENS_FIELDS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-0.5">
                <Label className="text-sm">{t.thinkingLabel}</Label>
                <p className="text-muted-foreground text-xs">{t.thinkingHelp}</p>
              </div>
              <Select value={thinkingType} onValueChange={setThinkingType}>
                <SelectTrigger className="w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THINKING_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-3">
              <div className="grid gap-0.5">
                <Label className="text-sm">{t.effortLabel}</Label>
                <p className="text-muted-foreground text-xs">{t.effortHelp}</p>
              </div>
              <Select value={effort} onValueChange={setEffort}>
                <SelectTrigger className="w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EFFORT_LEVELS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ProfileRetryFields value={retry} onChange={setRetry} />
        </div>

        <div className="flex gap-2 border-t px-4 py-3">
          <Button variant="outline" onClick={testConnection} disabled={testing}>
            {testing ? <Loader2Icon className="animate-spin" /> : <PlugZapIcon />}
            {testing ? t.testing : t.testButton}
          </Button>
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving && <Loader2Icon className="animate-spin" />}
            {!saving && (isNew ? <PlusIcon /> : <SaveIcon />)}
            {isNew ? t.createButton : t.saveButton}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LLMPage() {
  const { locale } = useI18n();
  const [profiles, setProfiles] = React.useState<LLMProfile[]>([]);
  const [pool, setPool] = React.useState<LLMPoolStatus | null>(null);
  const [poolOpen, setPoolOpen] = React.useState(false);
  // The sheet's open flag and content are stored separately: on close `editing`
  // stays put, otherwise the title flashes from "Edit X" to "New" during the
  // close animation. editing = null means create.
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LLMProfile | null>(null);
  const openEditor = React.useCallback((p: LLMProfile | null) => {
    setEditing(p);
    setEditOpen(true);
  }, []);

  const t = React.useMemo(() => {
    if (locale === "pt") {
      return {
        activated: (n: string) => `Ativado: ${n}`,
        activateFailed: (e: string) => `Falha ao ativar: ${e}`,
        cannotDeleteActive: "Não é possível excluir o perfil ativo",
        deleted: (n: string) => `Excluído: ${n}`,
        deleteFailed: (e: string) => `Falha ao excluir: ${e}`,
        headerDesc:
          "Perfis de formato / modelo / limite compartilhados por todos os agents. Clique num cartão para editar; a estrela marca o perfil ativo.",
        poolSettings: "Ajustes do pool",
        on: "Ativo",
        new: "Novo",
        profilesTab: "Perfis de modelo",
        retryTab: "Retentativa e backoff",
        proxy: (v: string) => `Proxy ${v}`,
        thinking: (v: string) => `Raciocínio ${v === "off" ? "desl." : v}`,
        excluded: "Fora do pool",
        priority: (n: number) => `Prioridade ${n}`,
        activeButton: "Ativo",
        setActiveButton: "Ativar",
        deleteAria: "Excluir perfil",
        empty: 'Ainda não há perfis de modelo — clique em "Novo" no canto superior direito para criar o primeiro.',
      };
    }
    if (locale === "zh") {
      return {
        activated: (n: string) => `已激活：${n}`,
        activateFailed: (e: string) => `激活失败：${e}`,
        cannotDeleteActive: "无法删除当前激活的配置",
        deleted: (n: string) => `已删除：${n}`,
        deleteFailed: (e: string) => `删除失败：${e}`,
        headerDesc: "全 Agent 共享的格式 / 模型 / 限速配置。点击卡片编辑，星标为当前激活配置。",
        poolSettings: "轮询配置",
        on: "已开启",
        new: "新建",
        profilesTab: "模型配置",
        retryTab: "重试与退避",
        proxy: (v: string) => `代理 ${v}`,
        thinking: (v: string) => `思考 ${v === "off" ? "关" : v}`,
        excluded: "不参与轮询",
        priority: (n: number) => `优先级 ${n}`,
        activeButton: "已激活",
        setActiveButton: "设为激活",
        deleteAria: "删除配置",
        empty: "还没有模型配置，点击右上角「新建」创建第一个。",
      };
    }
    return {
      activated: (n: string) => `Activated: ${n}`,
      activateFailed: (e: string) => `Activation failed: ${e}`,
      cannotDeleteActive: "The active profile cannot be deleted",
      deleted: (n: string) => `Deleted: ${n}`,
      deleteFailed: (e: string) => `Delete failed: ${e}`,
      headerDesc:
        "Format / model / rate-limit profiles shared by all agents. Click a card to edit; the star marks the active profile.",
      poolSettings: "Pool settings",
      on: "On",
      new: "New",
      profilesTab: "Model profiles",
      retryTab: "Retry & backoff",
      proxy: (v: string) => `Proxy ${v}`,
      thinking: (v: string) => `Thinking ${v === "off" ? "off" : v}`,
      excluded: "Excluded from pool",
      priority: (n: number) => `Priority ${n}`,
      activeButton: "Active",
      setActiveButton: "Set active",
      deleteAria: "Delete profile",
      empty: 'No model profiles yet — click "New" in the top right to create the first one.',
    };
  }, [locale]);

  const loadPool = React.useCallback(async () => {
    try {
      setPool(await api.llmPool());
    } catch {
      /* ignore */
    }
  }, []);

  const load = React.useCallback(async () => {
    try {
      setProfiles(await api.llmProfiles());
    } catch {
      /* ignore */
    }
    await loadPool();
  }, [loadPool]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // The health badge on each card reads pool state by profile id.
  const health = React.useMemo(() => {
    const m = new Map<string, LLMPoolMember>();
    for (const c of pool?.chain ?? []) m.set(c.profile_id, c);
    return m;
  }, [pool]);

  async function activate(id: string, name: string) {
    try {
      await api.activateLLMProfile(id);
      toast.success(t.activated(name));
      await load();
    } catch (e) {
      toast.error(t.activateFailed((e as Error).message));
    }
  }

  async function remove(p: LLMProfile) {
    if (p.is_default) {
      toast.error(t.cannotDeleteActive);
      return;
    }
    try {
      await api.deleteLLMProfile(p.id);
      toast.success(t.deleted(p.name));
      await load();
    } catch (e) {
      toast.error(t.deleteFailed((e as Error).message));
    }
  }

  const poolOn = pool?.enabled ?? false;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-semibold text-xl tracking-tight">LLM</h1>
          <p className="text-muted-foreground text-sm">{t.headerDesc}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPoolOpen(true)}>
            <ZapIcon /> {t.poolSettings}
            {poolOn && (
              <Badge variant="outline" className="ml-1 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                {t.on}
              </Badge>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openEditor(null)}>
            <PlusIcon /> {t.new}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profiles" className="flex-1">
        <TabsList>
          <TabsTrigger value="profiles">{t.profilesTab}</TabsTrigger>
          <TabsTrigger value="retry">{t.retryTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((p) => {
              const h = healthOf(p, health.get(p.id), locale);
              return (
                // biome-ignore lint/a11y/useSemanticElements: the card contains its own action buttons; a native <button> here would nest buttons (invalid HTML)
                <Card
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEditor(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openEditor(p);
                    }
                  }}
                  className={cn(
                    "cursor-pointer gap-0 py-4 outline-none transition-colors hover:border-foreground/30",
                    p.is_default && "border-amber-400/50 bg-amber-400/5",
                  )}
                >
                  <CardContent className="grid gap-2 px-4">
                    <div className="flex items-start gap-2">
                      <StarIcon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          p.is_default ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-sm">{p.name}</span>
                          <Badge variant="outline" className="uppercase">
                            {p.format}
                          </Badge>
                          <Badge variant="outline" className={cn("ml-auto", h.cls)} title={h.hint}>
                            {h.label}
                          </Badge>
                        </div>
                        <code className="mt-1 block truncate font-mono text-muted-foreground text-xs">{p.model}</code>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-6 text-muted-foreground text-xs">
                      {p.api_key_hint && <span>{p.api_key_hint}</span>}
                      <span>
                        {p.rate_per_second}/s · {p.rate_per_minute}/min
                      </span>
                      {p.proxy && <span className="truncate">{t.proxy(p.proxy)}</span>}
                      {p.reasoning_effort && <span>{t.thinking(p.reasoning_effort)}</span>}
                      {/* The two pool fields only matter while the pool is on; hidden otherwise */}
                      {poolOn &&
                        !p.is_default &&
                        (p.pool_exclude ? <span>{t.excluded}</span> : <span>{t.priority(p.priority ?? 0)}</span>)}
                    </div>

                    <div className="mt-1 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={p.is_default}
                        onClick={(e) => {
                          e.stopPropagation();
                          void activate(p.id, p.name);
                        }}
                      >
                        {p.is_default ? t.activeButton : t.setActiveButton}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={t.deleteAria}
                        onClick={(e) => {
                          e.stopPropagation();
                          void remove(p);
                        }}
                      >
                        <Trash2Icon className="text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {profiles.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
                {t.empty}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="retry" className="mt-4">
          <RetryPolicyPanel />
        </TabsContent>
      </Tabs>

      <ProfileSheet profile={editing} open={editOpen} onOpenChange={setEditOpen} onSaved={() => void load()} />
      <PoolSheet open={poolOpen} onOpenChange={setPoolOpen} pool={pool} onReload={loadPool} />
    </div>
  );
}
