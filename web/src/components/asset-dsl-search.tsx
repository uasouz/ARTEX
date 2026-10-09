"use client";

import * as React from "react";

import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";

// ── DSL autocomplete ──────────────────────────────────────────────────────────
// Shared by the global asset view (/function/assets) and the per-task asset
// search, so both search boxes behave and look identical.

interface DslOp {
  op: string;
  desc: string;
}

interface DslFieldDef {
  name: string;
  desc: string;
  ops: DslOp[];
}

function getDslFields(locale: string): DslFieldDef[] {
  if (locale === "pt") {
    const fuzzy = "Correspondência parcial";
    const exact = "Correspondência exata";
    const exclude = "Excluir";
    const eq = "Igual";
    const neq = "Diferente";
    const gt = "Maior que";
    const gte = "Maior ou igual";
    const lt = "Menor que";
    const lte = "Menor ou igual";

    return [
      {
        name: "domain",
        desc: "Domínio (raiz/subdomínio/serviço)",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "ip",
        desc: "Endereço IPv4/IPv6",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "url",
        desc: "URL Completa (serviço/endpoint)",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "root_domain",
        desc: "Domínio Raiz",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "page_title",
        desc: "Título da Página (serviço HTTP)",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "icp",
        desc: "Registro ICP",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "service_name",
        desc: "Nome do Serviço (não-HTTP)",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "app_name",
        desc: "Nome da Aplicação",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "bundle_id",
        desc: "Bundle ID do App",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "category",
        desc: "Categoria do App",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "app_icp",
        desc: "Registro ICP do App",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "method",
        desc: "Método HTTP (GET/POST/PUT/…)",
        ops: [
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "service_type",
        desc: "Tipo de Serviço: http | other",
        ops: [
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "record_type",
        desc: "Tipo de Registro DNS (A/CNAME/MX/…)",
        ops: [
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "technology",
        desc: "Fingerprint Tecnológico (array)",
        ops: [
          { op: "=", desc: fuzzy },
          { op: "==", desc: exact },
          { op: "!=", desc: exclude },
        ],
      },
      {
        name: "port",
        desc: "Número da Porta (inteiro)",
        ops: [
          { op: "==", desc: eq },
          { op: "!=", desc: neq },
          { op: ">", desc: gt },
          { op: ">=", desc: gte },
          { op: "<", desc: lt },
          { op: "<=", desc: lte },
        ],
      },
      {
        name: "status_code",
        desc: "Código de Status HTTP (inteiro)",
        ops: [
          { op: "==", desc: eq },
          { op: "!=", desc: neq },
          { op: ">", desc: gt },
          { op: ">=", desc: gte },
          { op: "<", desc: lt },
          { op: "<=", desc: lte },
        ],
      },
      { name: "company_id", desc: "ID da Empresa (inteiro)", ops: [{ op: "==", desc: eq }] },
      { name: "task_id", desc: "ID da Tarefa de Origem (inteiro)", ops: [{ op: "==", desc: eq }] },
    ];
  }

  if (locale === "zh") {
    return [
      {
        name: "domain",
        desc: "域名（根域名/子域名/服务域名）",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "ip",
        desc: "IPv4/IPv6 地址",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "url",
        desc: "完整 URL（服务/接口）",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "root_domain",
        desc: "根域名",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "page_title",
        desc: "页面标题（HTTP 服务）",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "icp",
        desc: "ICP 备案号",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "service_name",
        desc: "服务名称（非 HTTP 服务）",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "app_name",
        desc: "应用名称",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "bundle_id",
        desc: "应用 Bundle ID",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "category",
        desc: "应用分类",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "app_icp",
        desc: "应用 ICP 备案",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "method",
        desc: "HTTP 方法 GET/POST/PUT/…",
        ops: [
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "service_type",
        desc: "服务类型：http | other",
        ops: [
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "record_type",
        desc: "DNS 解析类型 A/CNAME/MX/…",
        ops: [
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "technology",
        desc: "技术指纹（数组字段）",
        ops: [
          { op: "=", desc: "模糊匹配" },
          { op: "==", desc: "精确匹配" },
          { op: "!=", desc: "排除" },
        ],
      },
      {
        name: "port",
        desc: "端口号（整数）",
        ops: [
          { op: "==", desc: "等于" },
          { op: "!=", desc: "不等于" },
          { op: ">", desc: "大于" },
          { op: ">=", desc: "大于等于" },
          { op: "<", desc: "小于" },
          { op: "<=", desc: "小于等于" },
        ],
      },
      {
        name: "status_code",
        desc: "HTTP 状态码（整数）",
        ops: [
          { op: "==", desc: "等于" },
          { op: "!=", desc: "不等于" },
          { op: ">", desc: "大于" },
          { op: ">=", desc: "大于等于" },
          { op: "<", desc: "小于" },
          { op: "<=", desc: "小于等于" },
        ],
      },
      { name: "company_id", desc: "归属企业 ID（整数）", ops: [{ op: "==", desc: "等于" }] },
      { name: "task_id", desc: "来源任务 ID（整数）", ops: [{ op: "==", desc: "等于" }] },
    ];
  }

  const fuzzy = "Fuzzy match";
  const exact = "Exact match";
  const exclude = "Exclude";
  const eq = "Equals";
  const neq = "Not equal";
  const gt = "Greater than";
  const gte = "Greater or equal";
  const lt = "Less than";
  const lte = "Less or equal";

  return [
    {
      name: "domain",
      desc: "Domain (root/subdomain/service)",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "ip",
      desc: "IPv4/IPv6 address",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "url",
      desc: "Full URL (service/endpoint)",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "root_domain",
      desc: "Root domain",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "page_title",
      desc: "Page title (HTTP service)",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "icp",
      desc: "ICP filing number",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "service_name",
      desc: "Service name (non-HTTP)",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "app_name",
      desc: "Application name",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "bundle_id",
      desc: "App Bundle ID",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "category",
      desc: "Application category",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "app_icp",
      desc: "App ICP filing",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "method",
      desc: "HTTP method (GET/POST/PUT/…)",
      ops: [
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "service_type",
      desc: "Service type: http | other",
      ops: [
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "record_type",
      desc: "DNS record type (A/CNAME/MX/…)",
      ops: [
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "technology",
      desc: "Technology fingerprint (array)",
      ops: [
        { op: "=", desc: fuzzy },
        { op: "==", desc: exact },
        { op: "!=", desc: exclude },
      ],
    },
    {
      name: "port",
      desc: "Port number (integer)",
      ops: [
        { op: "==", desc: eq },
        { op: "!=", desc: neq },
        { op: ">", desc: gt },
        { op: ">=", desc: gte },
        { op: "<", desc: lt },
        { op: "<=", desc: lte },
      ],
    },
    {
      name: "status_code",
      desc: "HTTP status code (integer)",
      ops: [
        { op: "==", desc: eq },
        { op: "!=", desc: neq },
        { op: ">", desc: gt },
        { op: ">=", desc: gte },
        { op: "<", desc: lt },
        { op: "<=", desc: lte },
      ],
    },
    { name: "company_id", desc: "Company ID (integer)", ops: [{ op: "==", desc: eq }] },
    { name: "task_id", desc: "Source task ID (integer)", ops: [{ op: "==", desc: eq }] },
  ];
}

function getLogicOps(locale: string): { label: string; desc: string }[] {
  if (locale === "pt") {
    return [
      { label: "AND", desc: "E (ambas as condições atendidas)" },
      { label: "OR", desc: "OU (qualquer uma das condições)" },
    ];
  }
  if (locale === "zh") {
    return [
      { label: "AND", desc: "且（两个条件都满足）" },
      { label: "OR", desc: "或（满足其中之一）" },
    ];
  }
  return [
    { label: "AND", desc: "AND (both conditions match)" },
    { label: "OR", desc: "OR (either condition matches)" },
  ];
}

interface DslSuggestion {
  kind: "field" | "operator" | "logic";
  label: string;
  desc: string;
  replaceStart: number;
  replaceEnd: number;
  insertText: string;
}

function getDslSuggestions(
  text: string,
  cursor: number,
  fields: DslFieldDef[],
  logicOps: { label: string; desc: string }[],
): DslSuggestion[] {
  const before = text.slice(0, cursor);
  // Current token: non-whitespace, non-paren run ending at cursor
  const tokenMatch = before.match(/([^\s()]*$)/);
  const currentToken = tokenMatch?.[1] ?? "";
  const tokenStart = cursor - currentToken.length;

  // Token already contains field+operator → typing a value, no suggestions
  if (/^[a-z_]+(==|!=|>=|<=|=|>|<)/.test(currentToken)) return [];

  // Complete known field name → suggest operators for that field
  const exactField = fields.find((f) => f.name === currentToken.toLowerCase());
  if (exactField) {
    return exactField.ops.map(({ op, desc }) => ({
      kind: "operator",
      label: `${exactField.name}${op}`,
      desc,
      replaceStart: tokenStart,
      replaceEnd: cursor,
      insertText: `${exactField.name}${op}`,
    }));
  }

  // Everything before the current token (trimmed)
  const beforeToken = before.slice(0, tokenStart).trimEnd();
  const afterExpression = beforeToken.length > 0 && !/\b(AND|OR)\s*$/i.test(beforeToken) && !beforeToken.endsWith("(");

  // Current token is a prefix of AND/OR and follows a complete expression
  if (/^(a|an|and|o|or)$/i.test(currentToken) && afterExpression) {
    return logicOps
      .filter((l) => l.label.startsWith(currentToken.toUpperCase()))
      .map(({ label, desc }) => ({
        kind: "logic",
        label,
        desc,
        replaceStart: tokenStart,
        replaceEnd: cursor,
        insertText: `${label} `,
      }));
  }

  // No current token, after a complete expression → suggest AND/OR
  if (!currentToken && afterExpression) {
    return logicOps.map(({ label, desc }) => ({
      kind: "logic",
      label,
      desc,
      replaceStart: cursor,
      replaceEnd: cursor,
      insertText: `${label} `,
    }));
  }

  // Default: suggest fields filtered by prefix
  const prefix = currentToken.toLowerCase();
  return fields
    .filter((f) => f.name.startsWith(prefix))
    .map((f) => ({
      kind: "field",
      label: f.name,
      desc: f.desc,
      replaceStart: tokenStart,
      replaceEnd: cursor,
      insertText: f.name,
    }));
}

function applyDslSuggestion(text: string, s: DslSuggestion): { text: string; cursor: number } {
  const newText = text.slice(0, s.replaceStart) + s.insertText + text.slice(s.replaceEnd);
  return { text: newText, cursor: s.replaceStart + s.insertText.length };
}

const KIND_STYLE: Record<string, string> = {
  field: "text-blue-500 dark:text-blue-400",
  operator: "text-amber-500 dark:text-amber-400",
  logic: "text-emerald-500 dark:text-emerald-400",
};

// AssetDslSearch is the shared DSL search box: a monospace input with a
// field/operator/logic autocomplete popover and a status line ("Found N" /
// error / loading). Used by both the global asset view and the per-task view.
export function AssetDslSearch({
  query,
  onChange,
  loading,
  error,
  count,
}: {
  query: string;
  onChange: (v: string) => void;
  loading: boolean;
  error: string;
  count?: number;
}) {
  const { locale } = useI18n();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = React.useState<DslSuggestion[]>([]);
  const [selIdx, setSelIdx] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const fields = React.useMemo(() => getDslFields(locale), [locale]);
  const logicOps = React.useMemo(() => getLogicOps(locale), [locale]);

  const labels = React.useMemo(() => {
    if (locale === "pt") {
      return {
        placeholder: "Busca DSL: domain=example AND status_code>=400",
        searching: "Buscando…",
        found: (n: number) => `${n} encontrado(s)`,
      };
    }
    if (locale === "zh") {
      return {
        placeholder: "DSL 搜索：domain=example AND status_code>=400",
        searching: "搜索中…",
        found: (n: number) => `找到 ${n} 条`,
      };
    }
    return {
      placeholder: "DSL search: domain=example AND status_code>=400",
      searching: "Searching…",
      found: (n: number) => `Found ${n}`,
    };
  }, [locale]);

  const refresh = React.useCallback(
    (val: string, pos: number) => {
      const suggs = getDslSuggestions(val, pos, fields, logicOps);
      setSuggestions(suggs);
      setSelIdx(0);
      setOpen(suggs.length > 0);
    },
    [fields, logicOps],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    refresh(val, e.target.selectionStart ?? val.length);
  };

  const apply = React.useCallback(
    (s: DslSuggestion) => {
      const cursor = inputRef.current?.selectionStart ?? query.length;
      // use cursor for logic-kind (insert at cursor), replaceStart/End for others
      const adjusted: DslSuggestion =
        s.kind === "logic" && !query.slice(s.replaceStart, s.replaceEnd)
          ? { ...s, replaceStart: cursor, replaceEnd: cursor }
          : s;
      const { text: newText, cursor: newCursor } = applyDslSuggestion(query, adjusted);
      onChange(newText);
      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        inputRef.current.setSelectionRange(newCursor, newCursor);
        inputRef.current.focus();
        refresh(newText, newCursor);
      });
    },
    [query, onChange, refresh],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Tab" || e.key === "Enter") {
      const s = suggestions[selIdx];
      if (s) {
        e.preventDefault();
        apply(s);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const cursorPos = () => inputRef.current?.selectionStart ?? query.length;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative max-w-lg">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={labels.placeholder}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => refresh(query, cursorPos())}
          onClick={() => refresh(query, cursorPos())}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className="h-8 pl-8 font-mono text-xs"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 w-max min-w-full max-w-sm rounded-md border bg-popover py-1 shadow-md">
            {suggestions.map((s, i) => (
              <button
                type="button"
                key={i}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 px-3 py-1.5 text-left",
                  i === selIdx ? "bg-accent" : "hover:bg-accent/50",
                )}
                onMouseEnter={() => setSelIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  apply(s);
                }}
              >
                <span className={cn("shrink-0 font-mono text-xs font-semibold", KIND_STYLE[s.kind])}>{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {query.trim() && !open && (
        <p className="pl-1 text-[11px] text-muted-foreground">
          {loading ? (
            labels.searching
          ) : error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            labels.found(count ?? 0)
          )}
        </p>
      )}
    </div>
  );
}
