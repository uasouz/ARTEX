"use client";

// Shared building blocks for LLM retry configuration: "attempts + interval" for
// each of the five retry layers.
//
// The five layers, innermost to outermost: connect (SDK) → empty response (SDK) →
// same-provider safe window → pool circuit breaker → intent re-run.
// The first three follow the endpoint, so every model profile can override the
// global defaults; the last two are process-wide, one global copy.
//
// All inputs follow the same "empty = not configured" semantics, matching the
// backend db.RetryRule:
//   attempts  empty/0 = built-in default | -1 = disable this layer | >0 = use this count
//   interval  empty/0 = this layer's original exponential backoff | >0 = use this fixed millisecond interval

import * as React from "react";

import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { LLMRetryOverride, LLMRetryPolicy, LLMRetryRule } from "@/lib/types";

export const ZERO_RULE: LLMRetryRule = { attempts: 0, interval_ms: 0 };
export const ZERO_OVERRIDE: LLMRetryOverride = {
  connect: ZERO_RULE,
  empty: ZERO_RULE,
  stream: ZERO_RULE,
};
const ZERO_POLICY: LLMRetryPolicy = {
  ...ZERO_OVERRIDE,
  breaker: ZERO_RULE,
  intent: ZERO_RULE,
};

const LAYER_KEYS = ["connect", "empty", "stream", "breaker", "intent"] as const;
type LayerKey = (typeof LAYER_KEYS)[number];

type LayerMeta = {
  title: string;
  /** Where this retry layer runs and who executes it */
  where: string;
  /** Which errors reach this layer — down to status codes, no guessing */
  trigger: string;
  /** Errors that look similar but do NOT hit this layer, so tuning knobs here seems like a bug */
  skips?: string;
  desc: string;
  attemptsLabel: string;
  /** Default attempts when left empty, used for the placeholder */
  defAttempts: number;
  /** Default interval strategy when left empty, used for the hint */
  defInterval: string;
  /** What attempts = -1 means */
  offHint: string;
};

const LAYER_META: Record<LayerKey, Record<Locale, LayerMeta>> = {
  connect: {
    en: {
      title: "Connection retry",
      where: "SDK · before a 200 response",
      trigger:
        "Cannot connect or no 200 yet: connection reset / read-write timeout / DNS failure and other network-layer errors, plus HTTP 408, 429, 500, 502, 503, 504.",
      skips:
        "Other status codes (400 / 401 / 403 / 404 / 413 / 422 etc.) are deterministic refusals — resending fails the same way, so they propagate up immediately.",
      desc: "Resends the same request unchanged. Once the stream starts (a 200 was received), mid-stream drops are not handled by this layer.",
      attemptsLabel: "Retry attempts",
      defAttempts: 3,
      defInterval: "0.5s→1s→2s exponential (capped at 8s)",
      offHint: "-1 = no retries at all, failures surface immediately",
    },
    pt: {
      title: "Retentativa de conexão",
      where: "SDK · antes de uma resposta 200",
      trigger:
        "Sem conexão ou ainda sem 200: conexão redefinida / tempo esgotado de leitura-escrita / falha de DNS e outros erros de rede, além de HTTP 408, 429, 500, 502, 503, 504.",
      skips:
        "Os demais códigos (400 / 401 / 403 / 404 / 413 / 422 etc.) são recusas determinísticas — reenviar falha igual, então sobem direto.",
      desc: "Reenvia a mesma requisição sem alterações. Depois que o stream começa (200 recebido), quedas no meio não são tratadas por esta camada.",
      attemptsLabel: "Tentativas",
      defAttempts: 3,
      defInterval: "0,5s→1s→2s exponencial (máx. 8s)",
      offHint: "-1 = nenhuma retentativa, falhas sobem imediatamente",
    },
    zh: {
      title: "建连重试",
      where: "SDK · 拿到 200 之前",
      trigger:
        "连不上或还没拿到 200：连接重置 / 读写超时 / DNS 失败等网络层错误，以及 HTTP 408、429、500、502、503、504。",
      skips: "其余状态码（400 / 401 / 403 / 404 / 413 / 422 等）都是确定性拒绝，重发也一样失败，直接上抛。",
      desc: "原样重发同一个请求。流一旦开始（已经拿到 200），中途断开就不归这层管了。",
      attemptsLabel: "重试次数",
      defAttempts: 3,
      defInterval: "0.5s→1s→2s 指数（封顶 8s）",
      offHint: "-1 = 一次都不重试，失败立刻上抛",
    },
  },
  empty: {
    en: {
      title: "Empty response retry",
      where: "SDK · openai format only",
      trigger:
        "HTTP 200 with a normal stop finish_reason but not a single content block in the response — gateway empty frames, dropped thinking fields, or sampling hiccups all look like this.",
      skips:
        "Truncation caused by max_tokens does not count (fix that by raising the output limit; resending just hits it again).",
      desc: "Resends the whole prompt, so it is expensive on long contexts — keep the count low.",
      attemptsLabel: "Retry attempts",
      defAttempts: 2,
      defInterval: "0.5s→1s→2s exponential (capped at 8s)",
      offHint: "-1 = empty responses are returned as-is",
    },
    pt: {
      title: "Retentativa de resposta vazia",
      where: "SDK · apenas formato openai",
      trigger:
        "HTTP 200 com finish_reason stop normal, mas nenhum bloco de conteúdo na resposta — quadros vazios de gateway, campos de raciocínio perdidos ou soluços de amostragem têm essa cara.",
      skips: "Truncação por max_tokens não conta (resolva aumentando o limite de saída; reenviar só bate no mesmo).",
      desc: "Reenvia o prompt inteiro, então é caro em contextos longos — mantenha a contagem baixa.",
      attemptsLabel: "Tentativas",
      defAttempts: 2,
      defInterval: "0,5s→1s→2s exponencial (máx. 8s)",
      offHint: "-1 = respostas vazias são entregues como estão",
    },
    zh: {
      title: "空响应重试",
      where: "SDK · 仅 openai 格式",
      trigger:
        "HTTP 200、finish_reason 是正常 stop，但整条响应一个内容块都没有——网关空帧、思考字段丢帧、采样打嗝都会长这样。",
      skips: "因 max_tokens 截断而没有内容的不算（那要靠调高输出上限解决，重发只会再撞一次）。",
      desc: "重发整个 prompt，所以在长上下文上比较贵，次数不宜给大。",
      attemptsLabel: "重试次数",
      defAttempts: 2,
      defInterval: "0.5s→1s→2s 指数（封顶 8s）",
      offHint: "-1 = 空响应直接原样交出",
    },
  },
  stream: {
    en: {
      title: "Same-provider safe-window retry",
      where: "This project · before any output is delivered",
      trigger:
        "Problems after the stream is established (200 received): mid-stream disconnects, provider overloaded, in-stream 429 / 5xx error events — and not a single token has been handed to the caller yet.",
      skips:
        "Out of quota (402 / insufficient_quota, handed to the pool to switch profiles), context too long (413 / context length, handed to compression), and deterministic 400 / 401 / 403 / 404 / 422 refusals are not retried.",
      desc: "Replays the same request on the same profile. Because no output has been delivered, replay never duplicates model output or tool executions.",
      attemptsLabel: "Retry attempts",
      defAttempts: 2,
      defInterval: "0.5s→1s exponential (capped at 4s)",
      offHint: "-1 = broken streams go straight to the outer intent re-run",
    },
    pt: {
      title: "Retentativa na janela segura do mesmo provedor",
      where: "Este projeto · antes de entregar qualquer saída",
      trigger:
        "Problemas após o stream ser estabelecido (200 recebido): desconexões no meio, provedor sobrecarregado, eventos de erro 429 / 5xx no stream — e nenhum token ainda entregue ao chamador.",
      skips:
        "Cota esgotada (402 / insufficient_quota, entregue ao pool para trocar de perfil), contexto longo demais (413 / context length, entregue à compressão) e recusas determinísticas 400 / 401 / 403 / 404 / 422 não são retentadas.",
      desc: "Reexecuta a mesma requisição no mesmo perfil. Como nenhuma saída foi entregue, a reexecução nunca duplica saídas do modelo nem execuções de ferramentas.",
      attemptsLabel: "Tentativas",
      defAttempts: 2,
      defInterval: "0,5s→1s exponencial (máx. 4s)",
      offHint: "-1 = streams interrompidos vão direto para a reexecução de intenção externa",
    },
    zh: {
      title: "同 provider 安全窗口重试",
      where: "本项目 · 未交付输出前",
      trigger:
        "流已经建立（拿到 200）之后才出问题：连接中途断开、供应商 overloaded、流内的 429 / 5xx 错误事件——且一个 token 都还没交给调用方。",
      skips:
        "额度耗尽（402 / insufficient_quota，交给轮询换配置）、上下文过长（413 / context length，交给压缩）、400 / 401 / 403 / 404 / 422 确定性拒绝，都不重试。",
      desc: "在同一个配置上重放同一个请求。因为还没交付任何输出，重放不会重复模型输出或工具执行。",
      attemptsLabel: "重试次数",
      defAttempts: 2,
      defInterval: "0.5s→1s 指数（封顶 4s）",
      offHint: "-1 = 断流直接交给外层的意图重跑",
    },
  },
  breaker: {
    en: {
      title: "Pool circuit breaker",
      where: "This project · process-wide, one global copy",
      trigger:
        "Trips when transient failures (429, 5xx, network errors) accumulate consecutively to the threshold; deterministic failures — out of quota (402), invalid key (401 / 403), model not found (404) — trip on the first occurrence regardless of the threshold.",
      skips: "A single success resets the counter, so an occasionally flaky profile never slowly grinds toward a trip.",
      desc: "While tripped the profile is in cooldown and the pool skips it. State is persisted, so restarts keep it.",
      attemptsLabel: "Consecutive failures to trip",
      defAttempts: 3,
      defInterval: "1min→5min→30min ladder",
      offHint: "-1 = transient failures never trip (deterministic failures still do)",
    },
    pt: {
      title: "Disjuntor do pool",
      where: "Este projeto · nível de processo, uma cópia global",
      trigger:
        "Abre quando falhas transitórias (429, 5xx, erros de rede) acumulam consecutivamente até o limiar; falhas determinísticas — cota esgotada (402), chave inválida (401 / 403), modelo inexistente (404) — abrem na primeira ocorrência, sem olhar o limiar.",
      skips:
        "Um único sucesso zera o contador, então um perfil instável de vez em quando nunca acumula até abrir o disjuntor.",
      desc: "Enquanto aberto, o perfil fica em cooldown e o pool o pula. O estado é persistido e sobrevive a reinícios.",
      attemptsLabel: "Falhas consecutivas para abrir",
      defAttempts: 3,
      defInterval: "Escada 1min→5min→30min",
      offHint: "-1 = falhas transitórias nunca abrem (determinísticas continuam abrindo)",
    },
    zh: {
      title: "轮询熔断",
      where: "本项目 · 进程级，全局一份",
      trigger:
        "瞬时失败（429、5xx、网络错误）连续累计到阈值时熔断；余额不足（402）、密钥失效（401 / 403）、模型不存在（404）这类确定性失败不看阈值，第一次就熔断。",
      skips: "成功一次即清零，所以偶尔抽风的配置不会被慢慢攒到熔断。",
      desc: "熔断后进入冷却，冷却期内轮询直接跳过这个配置。状态落库，重启不丢。",
      attemptsLabel: "连续失败几次熔断",
      defAttempts: 3,
      defInterval: "1min→5min→30min 梯度",
      offHint: "-1 = 瞬时失败永不熔断（确定性失败仍然熔断）",
    },
  },
  intent: {
    en: {
      title: "Intent re-run",
      where: "This project · process-wide, one global copy",
      trigger:
        "Everything above failed: the worker ends with model_error — inner retries exhausted, or the stream broke after output delivery had started (replay is unsafe then, only a full restart works).",
      skips:
        "Out-of-quota is already handled by the pool switching profiles, not re-run here; paused / terminated / finalizing tasks yield immediately and do not consume backoff time.",
      desc: "Re-runs the whole intent from scratch. It is the outermost layer, so each re-run multiplies the attempt counts of every inner layer again.",
      attemptsLabel: "Re-run count",
      defAttempts: 2,
      defInterval: "Fixed 3s",
      offHint: "-1 = no re-run; the intent is marked blocked",
    },
    pt: {
      title: "Reexecução de intenção",
      where: "Este projeto · nível de processo, uma cópia global",
      trigger:
        "Tudo acima falhou: o worker termina com model_error — retentativas internas esgotadas, ou o stream quebrou depois que a entrega de saída já tinha começado (reexecutar não é seguro então, só começar de novo).",
      skips:
        "Cota esgotada já é tratada pelo pool trocando de perfil, sem reexecutar aqui; tarefas pausadas / terminadas / em finalização cedem imediatamente e não consomem tempo de backoff.",
      desc: "Reexecuta a intenção inteira do zero. É a camada mais externa, então cada reexecução multiplica de novo as contagens de tentativas das camadas internas.",
      attemptsLabel: "Reexecuções",
      defAttempts: 2,
      defInterval: "Fixo 3s",
      offHint: "-1 = sem reexecução; a intenção é marcada como bloqueada",
    },
    zh: {
      title: "意图重跑",
      where: "本项目 · 进程级，全局一份",
      trigger:
        "前面几层都没兜住：worker 以 model_error 收场——内层重试全部用尽，或者流已经开始交付输出后才断掉（那时重放不安全，只能整条重来）。",
      skips: "额度耗尽已经由轮询换配置处理，不在这里重跑；任务被暂停 / 终止 / 进入收尾时立即让位，不占用退避时间。",
      desc: "整条意图从头再跑一遍。它是最外层，一次重跑意味着里面几层的次数会再乘一遍。",
      attemptsLabel: "重跑次数",
      defAttempts: 2,
      defInterval: "固定 3s",
      offHint: "-1 = 不重跑，该意图直接判为 blocked",
    },
  },
};

function layersFor(locale: Locale): Record<LayerKey, LayerMeta> {
  return Object.fromEntries(LAYER_KEYS.map((k) => [k, LAYER_META[k][locale]])) as Record<LayerKey, LayerMeta>;
}

/** Human-readable milliseconds, only echoed next to inputs so nobody counts zeros. */
function humanMs(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Number((ms / 1000).toFixed(2))}s`;
  return `${Number((ms / 60_000).toFixed(2))}min`;
}

/** Controlled numeric input: empty string ↔ 0, intermediate states ("-", "1e") stay local. */
function NumField({
  id,
  value,
  onChange,
  placeholder,
  min,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  placeholder: string;
  min: number;
}) {
  const [text, setText] = React.useState(value === 0 ? "" : String(value));
  // Follow along when the parent swaps in a whole new value (policy loaded,
  // profile switched); typing never lands here because value already equals
  // the parse of the local text by then.
  React.useEffect(() => {
    const incoming = value === 0 ? "" : String(value);
    setText((cur) => (Number(cur || 0) === value ? cur : incoming));
  }, [value]);
  return (
    <Input
      id={id}
      type="number"
      min={min}
      className="w-28 shrink-0"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        onChange(e.target.value.trim() === "" || !Number.isFinite(n) ? 0 : Math.trunc(n));
      }}
    />
  );
}

/** The two knobs of one retry layer. idPrefix keeps label htmlFor unique when rendered multiple times per page. */
export function RetryRuleFields({
  layer,
  idPrefix,
  value,
  onChange,
  compact,
}: {
  layer: LayerKey;
  idPrefix: string;
  value: LLMRetryRule;
  onChange: (r: LLMRetryRule) => void;
  /** true = compact version for the profile sheet: no expanded notes, just "which errors land here" */
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const t = React.useMemo(() => {
    if (locale === "pt") {
      return {
        trigger: "Dispara em",
        skips: "Não passa por aqui",
        intervalMs: "Intervalo ms",
        defAttempts: (n: number) => `Padrão ${n}`,
        defBackoff: "Backoff padrão",
        fixed: (h: string) => `Fixo ${h}`,
        emptyHint: (off: string) => `Vazio = usar padrão; ${off}.`,
      };
    }
    if (locale === "zh") {
      return {
        trigger: "触发",
        skips: "不走这层",
        intervalMs: "间隔 ms",
        defAttempts: (n: number) => `默认 ${n}`,
        defBackoff: "默认退避",
        fixed: (h: string) => `固定 ${h}`,
        emptyHint: (off: string) => `留空 = 用默认；${off}。`,
      };
    }
    return {
      trigger: "Triggers",
      skips: "Not handled here",
      intervalMs: "Interval ms",
      defAttempts: (n: number) => `Default ${n}`,
      defBackoff: "Default backoff",
      fixed: (h: string) => `Fixed ${h}`,
      emptyHint: (off: string) => `Empty = use default; ${off}.`,
    };
  }, [locale]);

  const meta = layersFor(locale)[layer];
  const human = humanMs(value.interval_ms);
  return (
    <div className={compact ? "grid gap-2" : "grid gap-3 rounded-lg border p-3"}>
      <div className="grid gap-0.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <Label className="text-sm">{meta.title}</Label>
          <span className="text-muted-foreground text-xs">{meta.where}</span>
        </div>
        {/* Which errors land on this layer, down to status codes — knobs with no visible effect usually mean the error never reaches this layer. */}
        <p className="text-muted-foreground text-xs">
          <span className="font-medium text-foreground">{t.trigger}</span>：{meta.trigger}
        </p>
        {!compact && meta.skips && (
          <p className="text-muted-foreground text-xs">
            <span className="font-medium text-foreground">{t.skips}</span>：{meta.skips}
          </p>
        )}
        {!compact && <p className="text-muted-foreground text-xs">{meta.desc}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-${layer}-n`} className="text-muted-foreground text-xs">
            {meta.attemptsLabel}
          </Label>
          <NumField
            id={`${idPrefix}-${layer}-n`}
            min={-1}
            value={value.attempts}
            placeholder={t.defAttempts(meta.defAttempts)}
            onChange={(n) => onChange({ ...value, attempts: n })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-${layer}-ms`} className="text-muted-foreground text-xs">
            {t.intervalMs}
          </Label>
          <NumField
            id={`${idPrefix}-${layer}-ms`}
            min={0}
            value={value.interval_ms}
            placeholder={t.defBackoff}
            onChange={(n) => onChange({ ...value, interval_ms: n })}
          />
          <span className="text-muted-foreground text-xs">{human ? t.fixed(human) : meta.defInterval}</span>
        </div>
      </div>
      {!compact && <p className="text-muted-foreground text-xs">{t.emptyHint(meta.offHint)}</p>}
    </div>
  );
}

/** The three per-endpoint override layers used inside the model profile sheet. */
export function ProfileRetryFields({
  value,
  onChange,
}: {
  value: LLMRetryOverride;
  onChange: (o: LLMRetryOverride) => void;
}) {
  const { locale } = useI18n();
  const t = React.useMemo(() => {
    if (locale === "pt") {
      return {
        title: "Substituições de retentativa",
        desc: "Vale apenas para este perfil, substituindo os padrões globais da aba Retentativa e backoff. Cada campo vazio = segue o global; tentativas -1 = desativa essa camada; um intervalo definido substitui o backoff exponencial por um fixo. O disjuntor e a reexecução de intenção são de nível de processo e só podem ser ajustados na aba global.",
      };
    }
    if (locale === "zh") {
      return {
        title: "重试覆盖",
        desc: "只对这个配置生效，覆盖「重试与退避」里的全局默认。每格留空 = 跟随全局；次数填 -1 = 关掉这层重试；间隔填了就用固定间隔取代指数退避。熔断与意图重跑是进程级的，只能在全局那页调。",
      };
    }
    return {
      title: "Retry overrides",
      desc: 'Applies only to this profile, overriding the global defaults from the "Retry & backoff" tab. Empty = follow the global value; attempts -1 = disable that layer; a set interval replaces exponential backoff with a fixed one. The breaker and intent re-run are process-wide and can only be tuned on the global tab.',
    };
  }, [locale]);

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-0.5">
        <Label className="text-sm">{t.title}</Label>
        <p className="text-muted-foreground text-xs">{t.desc}</p>
      </div>
      {(["connect", "empty", "stream"] as const).map((k) => (
        <div key={k} className="border-t pt-3 first:border-t-0 first:pt-0">
          <RetryRuleFields
            compact
            layer={k}
            idPrefix="pf"
            value={value[k]}
            onChange={(r) => onChange({ ...value, [k]: r })}
          />
        </div>
      ))}
    </div>
  );
}

/** The "Retry & backoff" tab: global defaults for all five layers. */
export function RetryPolicyPanel() {
  const { locale } = useI18n();
  const t = React.useMemo(() => {
    if (locale === "pt") {
      return {
        loadFailed: (e: string) => `Falha ao carregar a política de retentativa: ${e}`,
        saved: "Salvo, com efeito imediato (chamadas em andamento mantêm os parâmetros antigos)",
        saveFailed: (e: string) => `Falha ao salvar: ${e}`,
        loading: "Carregando política de retentativa…",
        save: "Salvar",
        reset: "Restaurar tudo ao padrão",
        intro:
          "Uma chamada de modelo que falha passa por cinco camadas de retentativa, da mais interna para a mais externa:",
        chain:
          "conexão → resposta vazia → janela segura do mesmo provedor → disjuntor do pool → reexecução de intenção",
        introTail:
          "As camadas externas só entram depois que as internas se esgotam, então as contagens se multiplicam — deixar tudo no máximo pode queimar dezenas de requisições num único soluço. Deixar tudo vazio mantém os padrões atuais, idêntico ao comportamento antes desta página existir. As três primeiras camadas podem ser substituídas por perfil de modelo.",
      };
    }
    if (locale === "zh") {
      return {
        loadFailed: (e: string) => `读取重试策略失败：${e}`,
        saved: "已保存，即时生效（正在跑的这一轮调用仍用旧参数）",
        saveFailed: (e: string) => `保存失败：${e}`,
        loading: "读取重试策略…",
        save: "保存",
        reset: "全部恢复默认",
        intro: "一次模型调用的失败会依次经过五层重试，由内到外：",
        chain: "建连 → 空响应 → 同 provider 安全窗口 → 轮询熔断 → 意图重跑",
        introTail:
          "内层用尽才轮到外层，所以次数是相乘的——把每层都拉满，一次抖动能烧掉几十次请求。全部留空即当前默认值，与没有这页时的行为完全一致。前三层可以在每个模型配置里单独覆盖。",
      };
    }
    return {
      loadFailed: (e: string) => `Failed to load retry policy: ${e}`,
      saved: "Saved, effective immediately (calls already in flight keep the old parameters)",
      saveFailed: (e: string) => `Save failed: ${e}`,
      loading: "Loading retry policy…",
      save: "Save",
      reset: "Reset all to defaults",
      intro: "A failed model call passes through five retry layers, innermost to outermost:",
      chain: "connection → empty response → same-provider safe window → pool circuit breaker → intent re-run",
      introTail:
        "Outer layers only engage after inner ones are exhausted, so attempt counts multiply — maxing out every layer can burn dozens of requests on a single hiccup. Leaving everything empty keeps the current defaults, exactly matching behavior before this page existed. The first three layers can be overridden per model profile.",
    };
  }, [locale]);

  const [policy, setPolicy] = React.useState<LLMRetryPolicy>(ZERO_POLICY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.llmRetryPolicy();
      setPolicy({ ...ZERO_POLICY, ...p });
    } catch (e) {
      toast.error(t.loadFailed((e as Error).message));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      // The backend clamps out-of-range values and echoes them back; refresh
      // from the response so what you see is what is stored.
      const saved = await api.saveLLMRetryPolicy(policy);
      setPolicy({ ...ZERO_POLICY, ...saved });
      toast.success(t.saved);
    } catch (e) {
      toast.error(t.saveFailed((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  const set = (k: LayerKey) => (r: LLMRetryRule) => setPolicy((p) => ({ ...p, [k]: r }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-10 text-muted-foreground text-sm">
        <Loader2Icon className="size-4 animate-spin" /> {t.loading}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/30 p-3 text-muted-foreground text-xs leading-relaxed">
        {t.intro}
        <span className="text-foreground"> {t.chain}</span>. {t.introTail}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {LAYER_KEYS.map((k) => (
          <RetryRuleFields key={k} layer={k} idPrefix="gl" value={policy[k]} onChange={set(k)} />
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {t.save}
        </Button>
        <Button variant="outline" onClick={() => setPolicy(ZERO_POLICY)} disabled={saving}>
          {t.reset}
        </Button>
      </div>
    </div>
  );
}
