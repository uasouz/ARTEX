// Channel fields schema and configuration parser

export const KIND_LABEL: Record<string, Record<string, string>> = {
  dingtalk: { en: "DingTalk", pt: "DingTalk", zh: "钉钉" },
  feishu: { en: "Lark / Feishu", pt: "Lark / Feishu", zh: "飞书" },
  wecom: { en: "WeCom", pt: "WeCom", zh: "企业微信" },
  webhook: { en: "Generic Webhook", pt: "Webhook Genérico", zh: "通用 Webhook" },
  telegram: { en: "Telegram", pt: "Telegram", zh: "Telegram" },
  email: { en: "Email", pt: "E-mail", zh: "邮件" },
};

export function getKindLabel(kind: string, locale = "en"): string {
  const item = KIND_LABEL[kind];
  if (!item) return kind;
  return item[locale] ?? item.en ?? kind;
}

export type FieldKind = "text" | "password" | "number" | "select" | "textarea" | "switch" | "kv" | "list";
export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}

function tr(locale: string, enStr: string, ptStr: string, zhStr: string): string {
  if (locale === "pt") return ptStr;
  if (locale === "zh") return zhStr;
  return enStr;
}

export function getChannelFields(kind: string, locale = "en"): FieldDef[] {
  switch (kind) {
    case "dingtalk":
      return [
        {
          key: "webhook",
          label: tr(locale, "Webhook URL", "URL do Webhook", "Webhook 地址"),
          kind: "text",
          placeholder: "https://oapi.dingtalk.com/robot/send?access_token=...",
        },
        {
          key: "secret",
          label: tr(locale, "Signing Secret", "Chave de Assinatura", "加签密钥"),
          kind: "password",
          help: tr(
            locale,
            "Required when robot security is set to signature; leave blank otherwise",
            "Preencha ao usar assinatura no robô; deixe em branco se não configurado",
            "机器人安全设置选「加签」时填写；选「自定义关键词」或未开启安全设置则留空",
          ),
        },
      ];
    case "feishu":
      return [
        {
          key: "webhook",
          label: tr(locale, "Webhook URL", "URL do Webhook", "Webhook 地址"),
          kind: "text",
          placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/...",
        },
        {
          key: "secret",
          label: tr(locale, "Signature Secret", "Chave de Verificação", "签名校验密钥"),
          kind: "password",
          help: tr(
            locale,
            "Required when signature verification is enabled on robot, leave blank otherwise",
            "Preencha ao habilitar verificação de assinatura no robô",
            "机器人开启「签名校验」时填写，否则留空",
          ),
        },
      ];
    case "wecom":
      return [
        {
          key: "webhook",
          label: tr(locale, "Webhook URL", "URL do Webhook", "Webhook 地址"),
          kind: "text",
          placeholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...",
        },
      ];
    case "webhook":
      return [
        {
          key: "url",
          label: tr(locale, "Target URL", "URL de Destino", "目标 URL"),
          kind: "text",
          placeholder: "https://your-endpoint.example.com/hook",
        },
        {
          key: "method",
          label: tr(locale, "HTTP Method", "Método HTTP", "请求方法"),
          kind: "select",
          options: [
            { value: "POST", label: tr(locale, "POST (with body)", "POST (com corpo)", "POST（带请求体）") },
            { value: "PUT", label: tr(locale, "PUT (with body)", "PUT (com corpo)", "PUT（带请求体）") },
            { value: "PATCH", label: tr(locale, "PATCH (with body)", "PATCH (com corpo)", "PATCH（带请求体）") },
            { value: "GET", label: tr(locale, "GET (no body)", "GET (sem corpo)", "GET（不带请求体）") },
          ],
        },
        {
          key: "headers",
          label: tr(locale, "Custom Headers", "Cabeçalhos Personalizados", "自定义请求头"),
          kind: "kv",
          help: tr(
            locale,
            "KEY=VALUE per line, e.g. Authorization=Bearer xxx",
            "CHAVE=VALOR por linha, ex: Authorization=Bearer xxx",
            "每行 KEY=VALUE，例如 Authorization=Bearer xxx",
          ),
        },
        {
          key: "body_template",
          label: tr(locale, "Body Template", "Modelo do Corpo", "请求体模板"),
          kind: "textarea",
          help: tr(
            locale,
            "Leave blank for built-in default template. Variables: {{.Title}} {{.Batch}} {{.Count}} {{.HomeURL}} {{.SentAt}}, and range .Items.",
            "Deixe em branco para usar o modelo padrão. Variáveis: {{.Title}} {{.Batch}} {{.Count}} {{.HomeURL}} {{.SentAt}}, range .Items.",
            "留空用内置默认模板。变量：{{.Title}} {{.Batch}} {{.Count}} {{.HomeURL}} {{.SentAt}}，以及 range .Items 下的字段。",
          ),
        },
      ];
    case "telegram":
      return [
        { key: "bot_token", label: "Bot Token", kind: "password", placeholder: "123456:ABC-DEF..." },
        { key: "chat_id", label: "Chat ID", kind: "text", placeholder: "-1001234567890" },
        {
          key: "base_url",
          label: tr(locale, "API Base URL", "URL Base da API", "API 地址"),
          kind: "text",
          placeholder: "https://api.telegram.org",
          help: tr(
            locale,
            "Leave blank for official endpoint",
            "Deixe em branco para usar API oficial",
            "留空用官方地址；自建 Bot API 反代时填写",
          ),
        },
      ];
    case "email":
      return [
        {
          key: "host",
          label: tr(locale, "SMTP Host", "Servidor SMTP", "SMTP 服务器"),
          kind: "text",
          placeholder: "smtp.example.com",
        },
        {
          key: "port",
          label: tr(locale, "Port", "Porta", "端口"),
          kind: "number",
          placeholder: "587",
          help: tr(
            locale,
            "587 uses STARTTLS; 465 requires implicit TLS",
            "587 usa STARTTLS; 465 habilita TLS implícito",
            "587 走 STARTTLS；465 请把「隐式 TLS」打开",
          ),
        },
        { key: "username", label: tr(locale, "Username", "Usuário", "账号"), kind: "text" },
        { key: "password", label: tr(locale, "Password", "Senha", "密码 / 授权码"), kind: "password" },
        {
          key: "from",
          label: tr(locale, "From", "Remetente", "发件人"),
          kind: "text",
          placeholder: "artex@example.com",
        },
        {
          key: "to",
          label: tr(locale, "To", "Destinatários", "收件人"),
          kind: "list",
          help: tr(
            locale,
            "Multiple addresses separated by comma",
            "Múltiplos endereços separados por vírgula",
            "多个地址用逗号分隔",
          ),
        },
        {
          key: "tls",
          label: tr(locale, "Implicit TLS", "TLS Implícito", "隐式 TLS"),
          kind: "switch",
          help: tr(
            locale,
            "Enable for port 465; keep off for 587",
            "Habilitar para porta 465; manter desativado para 587",
            "465 端口打开；587 保持关闭（会自动 STARTTLS）",
          ),
        },
      ];
    default:
      return [];
  }
}

export const CHANNEL_FIELDS: Record<string, FieldDef[]> = {
  dingtalk: getChannelFields("dingtalk", "en"),
  feishu: getChannelFields("feishu", "en"),
  wecom: getChannelFields("wecom", "en"),
  webhook: getChannelFields("webhook", "en"),
  telegram: getChannelFields("telegram", "en"),
  email: getChannelFields("email", "en"),
};

export function hasFields(kind: string): boolean {
  return getChannelFields(kind, "en").length > 0;
}

export const SEVERITY_OPTIONS = [
  { value: "", label: "Any" },
  { value: "low", label: "Low and above" },
  { value: "medium", label: "Medium and above" },
  { value: "high", label: "High and above" },
  { value: "critical", label: "Critical only" },
];

export function getSeverityOptions(locale = "en"): { value: string; label: string }[] {
  if (locale === "pt") {
    return [
      { value: "", label: "Qualquer" },
      { value: "low", label: "Baixa e superior" },
      { value: "medium", label: "Média e superior" },
      { value: "high", label: "Alta e superior" },
      { value: "critical", label: "Apenas Crítica" },
    ];
  }
  if (locale === "zh") {
    return [
      { value: "", label: "不限" },
      { value: "low", label: "低危及以上" },
      { value: "medium", label: "中危及以上" },
      { value: "high", label: "高危及以上" },
      { value: "critical", label: "仅严重" },
    ];
  }
  return SEVERITY_OPTIONS;
}

export type ChannelForm = {
  name: string;
  kind: string;
  mode: "realtime" | "digest";
  enabled: boolean;
  ratePerMin: string;
  config: Record<string, unknown>;
  minSeverity: string;
  includeText: string;
  excludeText: string;
  taskIDsText: string;
  assetIDsText: string;
  onStatusChange: boolean;
};

export const emptyForm = (kind: string): ChannelForm => ({
  name: "",
  kind,
  mode: "realtime",
  enabled: true,
  ratePerMin: "",
  config: {},
  minSeverity: "",
  includeText: "",
  excludeText: "",
  taskIDsText: "",
  assetIDsText: "",
  onStatusChange: false,
});

export function parseKV(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const i = t.indexOf("=");
    if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

export function parseIDs(text: string): number[] {
  return text
    .split(/[\n,，]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

export function parseKeywords(text: string): string[] {
  return text
    .split(/[\n,，]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
