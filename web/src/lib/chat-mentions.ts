import type { Locale } from "@/lib/i18n";

// Mention kinds with per-locale display labels. The Chinese labels are the
// historical wire format (existing chat messages contain @[漏洞#123 …] tokens),
// so they remain valid for parsing forever; new tokens use the active locale.
const MENTION_KINDS = [
  { kind: "finding", alias: "finding" },
  { kind: "asset", alias: "asset" },
  { kind: "company", alias: "company" },
  { kind: "endpoint", alias: "api" },
  { kind: "ip", alias: "ip" },
  { kind: "app", alias: "app" },
  { kind: "root_domain", alias: "domain" },
  { kind: "subdomain", alias: "subdomain" },
  { kind: "service", alias: "service" },
] as const;

export type MentionKind = (typeof MENTION_KINDS)[number]["kind"];

const KIND_LABELS: Record<MentionKind, Record<Locale, string>> = {
  finding: { en: "finding", pt: "achado", zh: "漏洞" },
  asset: { en: "asset", pt: "ativo", zh: "资产" },
  company: { en: "company", pt: "empresa", zh: "企业" },
  endpoint: { en: "endpoint", pt: "endpoint", zh: "接口" },
  ip: { en: "IP", pt: "IP", zh: "IP" },
  app: { en: "app", pt: "app", zh: "应用" },
  root_domain: { en: "domain", pt: "domínio", zh: "域名" },
  subdomain: { en: "subdomain", pt: "subdomínio", zh: "子域名" },
  service: { en: "service", pt: "serviço", zh: "服务" },
};

export function mentionLabel(kind: MentionKind, locale: Locale): string {
  return KIND_LABELS[kind][locale];
}

export function mentionKindsFor(locale: Locale) {
  return MENTION_KINDS.map((k) => ({ kind: k.kind, label: KIND_LABELS[k.kind][locale], alias: k.alias }));
}

export interface ChatMention {
  kind: MentionKind;
  id: number;
  label: string;
  description: string;
}

export function activeMention(value: string, caret: number) {
  const before = value.slice(0, caret);
  const start = before.lastIndexOf("@");
  if (start < 0 || (start > 0 && /[\w.+/-]/.test(before[start - 1]))) return null;
  const query = before.slice(start + 1);
  if (/[[\]\r\n@]/.test(query) || query.length > 220) return null;
  return { start, end: caret, query };
}

export function mentionSearch(query: string, locale: Locale = "en") {
  const raw = query.trimStart();
  const kinds = mentionKindsFor(locale);
  for (const item of kinds) {
    // Also match the legacy Chinese label so historical typing habits keep working.
    const legacy = KIND_LABELS[item.kind].zh;
    for (const alias of [item.label, legacy, item.alias]) {
      if (!alias) continue;
      const consumed = matchAlias(raw, alias);
      if (consumed !== null) {
        return { kind: item.kind, query: raw.slice(consumed).trim(), categories: [] };
      }
    }
  }
  // Accent-insensitive prefix filter for the category picker (display only).
  const norm = normalize;
  const ntext = norm(raw.toLowerCase());
  const text = raw.toLowerCase();
  const categories = kinds.filter(
    (item) => norm(item.label.toLowerCase()).startsWith(ntext) || item.alias.startsWith(text),
  );
  return { kind: "" as const, query: raw.trim(), categories };
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** How many leading characters of `raw` the kind `alias` consumes, or null. */
function matchAlias(raw: string, alias: string): number | null {
  const text = raw.toLowerCase();
  const lower = alias.toLowerCase();
  if (text === lower || text.startsWith(`${lower} `)) return alias.length;
  // Non-ASCII aliases (Chinese labels, accented Portuguese) may be typed without
  // a trailing space or without accents — fall back to accent-insensitive forms
  // and cut at the first space, since no kind label contains a space.
  if (/[^a-z]/.test(lower) && normalize(text).startsWith(normalize(lower))) {
    if (text.startsWith(lower)) return alias.length;
    const sp = raw.indexOf(" ");
    return sp === -1 ? raw.length : sp;
  }
  return null;
}

export function mentionToken(item: ChatMention, locale: Locale = "en") {
  const kind = KIND_LABELS[item.kind][locale];
  const label = item.label
    .replace(/[[\]]/g, (char) => (char === "[" ? "（" : "）"))
    .replace(/\s+/g, " ")
    .slice(0, 100);
  return `@[${kind}#${item.id} ${label}]`;
}

// Tokens written in any locale (plus the legacy Chinese format) are recognized.
const TOKEN_KIND_ALTERNATION = [...new Set(Object.values(KIND_LABELS).flatMap((labels) => Object.values(labels)))].join(
  "|",
);
const MENTION_TOKEN_RE = new RegExp(`@\\[(${TOKEN_KIND_ALTERNATION})#([0-9]+)(?: ([^\\]\\r\\n]*))?\\]`, "g");

export function selectedMentions(value: string) {
  return [...value.matchAll(MENTION_TOKEN_RE)].map((match) => ({
    token: match[0],
    label: `${match[1]} #${match[2]}${match[3] ? ` · ${match[3]}` : ""}`,
    start: match.index,
  }));
}
