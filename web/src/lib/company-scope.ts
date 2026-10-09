import type { CompanyScopeKind, CompanyScopeRule } from "@/lib/types";

export const MAX_COMPANY_SCOPE_VALUE_LENGTH = 1024;

export type CompanyScopeTextIssue = {
  line: number;
  rule?: CompanyScopeRule;
  error?: string;
};

export type ParsedCompanyScopeText = {
  rules: CompanyScopeRule[];
  errors: Array<{ line: number; error: string }>;
};

export const COMPANY_SCOPE_KINDS = new Set<CompanyScopeKind>(["domain", "ip", "cidr", "icp", "keyword"]);

export function isCompanyScopeKind(value: unknown): value is CompanyScopeKind {
  return typeof value === "string" && COMPANY_SCOPE_KINDS.has(value as CompanyScopeKind);
}

function isIPv4(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 4 && parts.every((part) => (part === "0" || /^[1-9]\d{0,2}$/.test(part)) && Number(part) <= 255)
  );
}

function isIPv6(value: string): boolean {
  if (!value.includes(":") || /[^0-9a-f:.]/i.test(value) || value.includes(":::")) return false;
  const halves = value.split("::");
  if (halves.length > 2) return false;
  const countSegments = (half: string): number | null => {
    if (!half) return 0;
    const segments = half.split(":");
    let count = 0;
    for (const [index, segment] of segments.entries()) {
      if (segment.includes(".")) {
        if (index !== segments.length - 1 || !isIPv4(segment)) return null;
        count += 2;
      } else {
        if (!/^[0-9a-f]{1,4}$/i.test(segment)) return null;
        count++;
      }
    }
    return count;
  };
  const left = countSegments(halves[0]);
  const right = countSegments(halves[1] ?? "");
  if (left === null || right === null) return false;
  return halves.length === 2 ? left + right < 8 : left === 8;
}

function ipVersion(value: string): 4 | 6 | null {
  if (isIPv4(value)) return 4;
  if (isIPv6(value)) return 6;
  return null;
}

function looksLikeIPAddress(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.includes("://") || /\s/.test(trimmed)) return false;
  if ((trimmed.match(/:/g) ?? []).length >= 2) {
    const parts = trimmed.split(":");
    let validSegments = 0;
    for (const part of parts) {
      if (!part) {
        if (validSegments > 0 || trimmed.startsWith("::")) return true;
        continue;
      }
      if (part.length > 4 || !/^[0-9a-f]+$/i.test(part)) return false;
      validSegments++;
      if (validSegments >= 2) return true;
    }
    return false;
  }
  return trimmed.includes(".") && /^[0-9.]+$/.test(trimmed);
}

function domainHostname(value: string): string | null {
  try {
    let candidate = value;
    if (value.startsWith("//")) candidate = `http:${value}`;
    else if (!value.includes("://")) candidate = `http://${value}`;
    const url = new URL(candidate);
    return (
      url.hostname
        .replace(/^\[|\]$/g, "")
        .replace(/\.$/, "")
        .toLowerCase() || null
    );
  } catch {
    return null;
  }
}

// Scope validation returns stable machine-readable error codes (see
// companyScopeErrorText for the localized display strings). Callers treat any
// non-empty string as "invalid".
export function companyScopeRuleError(rule: CompanyScopeRule): string {
  const value = rule.value.trim();
  if (!value) return "empty";
  if (Array.from(value).length > MAX_COMPANY_SCOPE_VALUE_LENGTH) {
    return "too_long";
  }
  if (rule.kind === "domain") {
    if (/\s/.test(value)) return "domain_spaces";
    const hostname = domainHostname(value);
    if (!hostname || ipVersion(hostname) !== null) return "invalid_domain";
    const labels = hostname.split(".");
    if (
      hostname.length > 253 ||
      labels.length < 2 ||
      labels.some(
        (label) =>
          !label || label.length > 63 || label.startsWith("-") || label.endsWith("-") || !/^[a-z0-9-]+$/i.test(label),
      )
    ) {
      return "invalid_domain";
    }
  }
  if (rule.kind === "ip" && ipVersion(value) === null) return "invalid_ip";
  if (rule.kind === "cidr") {
    const separator = value.lastIndexOf("/");
    if (separator <= 0) return "invalid_cidr";
    const address = value.slice(0, separator);
    const prefixText = value.slice(separator + 1);
    const version = ipVersion(address);
    if (version === null || !/^\d+$/.test(prefixText)) return "invalid_cidr";
    const prefix = Number(prefixText);
    if (version === 4 && (prefix < 16 || prefix > 32)) return "invalid_cidr_prefix_v4";
    if (version === 6 && (prefix < 32 || prefix > 128)) return "invalid_cidr_prefix_v6";
  }
  return "";
}

/** Localized display text for a company-scope validation error code. */
export function companyScopeErrorText(code: string, locale: "en" | "pt" | "zh"): string {
  const table: Record<string, Record<"en" | "pt" | "zh", string>> = {
    empty: {
      en: "Enter a scope value",
      pt: "Informe um valor de escopo",
      zh: "请填写范围值",
    },
    too_long: {
      en: `At most ${MAX_COMPANY_SCOPE_VALUE_LENGTH} characters`,
      pt: `No máximo ${MAX_COMPANY_SCOPE_VALUE_LENGTH} caracteres`,
      zh: `最多 ${MAX_COMPANY_SCOPE_VALUE_LENGTH} 个字符`,
    },
    domain_spaces: {
      en: "Enter a valid domain or URL without spaces",
      pt: "Informe um domínio ou URL válido sem espaços",
      zh: "请输入不含空格的有效域名或 URL",
    },
    invalid_domain: {
      en: "Enter a valid domain or URL",
      pt: "Informe um domínio ou URL válido",
      zh: "请输入有效域名或 URL",
    },
    invalid_ip: {
      en: "Enter a valid IP address",
      pt: "Informe um IP válido",
      zh: "请输入有效 IP",
    },
    invalid_cidr: {
      en: "Enter a valid CIDR network",
      pt: "Informe uma rede CIDR válida",
      zh: "请输入 CIDR 网段",
    },
    invalid_cidr_prefix_v4: {
      en: "IPv4 prefix must be between /16 and /32",
      pt: "O prefixo IPv4 deve estar entre /16 e /32",
      zh: "IPv4 网段前缀需为 /16 至 /32",
    },
    invalid_cidr_prefix_v6: {
      en: "IPv6 prefix must be between /32 and /128",
      pt: "O prefixo IPv6 deve estar entre /32 e /128",
      zh: "IPv6 网段前缀需为 /32 至 /128",
    },
  };
  return table[code]?.[locale] ?? code;
}

export function classifyCompanyScopeLine(
  raw: string,
  line: number,
  preservedRule?: CompanyScopeRule,
): CompanyScopeTextIssue {
  const value = raw.trim();
  if (Array.from(value).length > MAX_COMPANY_SCOPE_VALUE_LENGTH) {
    return { line, error: "too_long" };
  }
  if (preservedRule) {
    const rule = { kind: preservedRule.kind, value };
    const error = companyScopeRuleError(rule);
    return error ? { line, error } : { line, rule };
  }

  const separator = value.lastIndexOf("/");
  if (
    separator > 0 &&
    (ipVersion(value.slice(0, separator)) !== null || looksLikeIPAddress(value.slice(0, separator)))
  ) {
    const rule: CompanyScopeRule = { kind: "cidr", value };
    const error = companyScopeRuleError(rule);
    return error ? { line, error } : { line, rule };
  }
  if (ipVersion(value) !== null) return { line, rule: { kind: "ip", value } };
  if (looksLikeIPAddress(value)) return { line, error: "invalid_ip" };

  const looksLikeDomain = value.includes("://") || (!/\s/.test(value) && value.includes("."));
  if (looksLikeDomain) {
    const hostname = domainHostname(value);
    if (hostname && ipVersion(hostname) !== null) return { line, rule: { kind: "ip", value: hostname } };
    const rule: CompanyScopeRule = { kind: "domain", value };
    const error = companyScopeRuleError(rule);
    return error ? { line, error } : { line, rule };
  }
  if (/icp|备案/i.test(value)) return { line, rule: { kind: "icp", value } };
  return { line, rule: { kind: "keyword", value } };
}

export function parseCompanyScopeText(
  value: string,
  options: { preservedRules?: CompanyScopeRule[] } = {},
): ParsedCompanyScopeText {
  const nonEmpty = value
    .split(/\r?\n/)
    .map((raw, index) => ({ raw, line: index + 1 }))
    .filter(({ raw }) => raw.trim());
  const preserved = new Map<string, CompanyScopeRule[]>();
  for (const rule of options.preservedRules ?? []) {
    const key = rule.value.trim();
    preserved.set(key, [...(preserved.get(key) ?? []), rule]);
  }
  const issues = nonEmpty.map(({ raw, line }) => {
    const key = raw.trim();
    const queue = preserved.get(key);
    const preservedRule = queue?.shift();
    return classifyCompanyScopeLine(raw, line, preservedRule);
  });
  return {
    rules: issues.flatMap((item) => (item.rule ? [item.rule] : [])),
    errors: issues.flatMap((item) => (item.error ? [{ line: item.line, error: item.error }] : [])),
  };
}

export function normalizeCompanyScopeValue(rule: CompanyScopeRule): string {
  const value = rule.value.trim();
  if (rule.kind === "domain") return domainHostname(value) ?? value.toLowerCase();
  if (rule.kind === "icp") return value.toLowerCase().replace(/\s/gu, "");
  if (rule.kind === "keyword") return value.toLowerCase().split(/\s+/u).filter(Boolean).join(" ");
  return value.toLowerCase();
}
