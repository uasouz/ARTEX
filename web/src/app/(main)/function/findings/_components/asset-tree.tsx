"use client";

import * as React from "react";

import {
  BuildingIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  GlobeIcon,
  LayoutTemplateIcon,
  LinkIcon,
  type LucideIcon,
  NetworkIcon,
  RefreshCwIcon,
  SearchIcon,
  SmartphoneIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { FindingAssetKind, FindingAssetNode } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<FindingAssetKind, LucideIcon> = {
  company: BuildingIcon,
  root_domain: GlobeIcon,
  subdomain: GlobeIcon,
  ip: NetworkIcon,
  app: SmartphoneIcon,
  service: LayoutTemplateIcon,
  endpoint: LinkIcon,
  none: CircleDashedIcon,
};

const KIND_LABELS: Record<string, Record<FindingAssetKind, string>> = {
  pt: {
    company: "Empresa",
    root_domain: "Domínio Raiz",
    subdomain: "Subdomínio",
    ip: "IP",
    app: "Aplicação",
    service: "Serviço",
    endpoint: "Endpoint",
    none: "Não Associado",
  },
  zh: {
    company: "企业",
    root_domain: "根域名",
    subdomain: "子域名",
    ip: "IP",
    app: "应用",
    service: "服务",
    endpoint: "接口",
    none: "未关联",
  },
  en: {
    company: "Organization",
    root_domain: "Root Domain",
    subdomain: "Subdomain",
    ip: "IP",
    app: "Application",
    service: "Service",
    endpoint: "Endpoint",
    none: "Unassigned",
  },
};

interface TreeNode extends FindingAssetNode {
  children: TreeNode[];
  depth: number;
  display: string;
}

function stripBrackets(host: string) {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function parseAssetURL(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function hostOf(label: string): string {
  const url = parseAssetURL(label);
  if (url) return stripBrackets(url.hostname);
  const hostPort = label.match(/^(.+):(\d+)$/);
  return stripBrackets(hostPort ? hostPort[1] : label);
}

function shortLabel(node: FindingAssetNode, parent?: FindingAssetNode): string {
  const label = node.label;
  if (!parent) return label;
  if (node.kind === "service") {
    const parentHost = hostOf(parent.label);
    const url = parseAssetURL(label);
    if (url && stripBrackets(url.hostname) === parentHost) {
      const portPart = url.port ? `:${url.port}` : "";
      return `${portPart} (${url.protocol.replace(/:$/, "")})`;
    }
    const hostPort = label.match(/^(.+):(\d+)$/);
    if (hostPort && stripBrackets(hostPort[1]) === parentHost) {
      return `:${hostPort[2]}`;
    }
  }
  if (node.kind === "endpoint") {
    const url = parseAssetURL(label);
    if (url) {
      const pathWithQuery = `${url.pathname}${url.search}`;
      return pathWithQuery === "/" ? "/" : pathWithQuery;
    }
  }
  return label;
}

function buildAssetTree(nodes: FindingAssetNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const n of nodes) {
    map.set(n.key, { ...n, children: [], depth: 0, display: n.label });
  }
  const roots: TreeNode[] = [];
  for (const n of nodes) {
    const current = map.get(n.key);
    if (!current) continue;
    if (n.parent && map.has(n.parent)) {
      const parent = map.get(n.parent)!;
      current.display = shortLabel(n, parent);
      parent.children.push(current);
    } else {
      roots.push(current);
    }
  }
  const assignDepth = (list: TreeNode[], d: number) => {
    for (const item of list) {
      item.depth = d;
      assignDepth(item.children, d + 1);
    }
  };
  assignDepth(roots, 0);
  return roots;
}

function filterTree(nodes: TreeNode[], keyword: string): TreeNode[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return nodes;
  const filterList = (list: TreeNode[]): TreeNode[] => {
    const out: TreeNode[] = [];
    for (const n of list) {
      const children = filterList(n.children);
      const matchSelf = n.label.toLowerCase().includes(q) || n.display.toLowerCase().includes(q);
      if (matchSelf || children.length > 0) {
        out.push({ ...n, children });
      }
    }
    return out;
  };
  return filterList(nodes);
}

function collectKeys(nodes: TreeNode[]): Set<string> {
  const set = new Set<string>();
  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      set.add(n.key);
      walk(n.children);
    }
  };
  walk(nodes);
  return set;
}

export function assetPathOf(nodes: FindingAssetNode[], selectedKey: string | null): TreeNode[] {
  if (!selectedKey) return [];
  const map = new Map<string, FindingAssetNode>();
  for (const n of nodes) map.set(n.key, n);
  const path: TreeNode[] = [];
  let cur: FindingAssetNode | undefined = map.get(selectedKey);
  while (cur) {
    const parent: FindingAssetNode | undefined = cur.parent ? map.get(cur.parent) : undefined;
    path.unshift({
      ...cur,
      children: [],
      depth: 0,
      display: shortLabel(cur, parent),
    });
    cur = parent;
  }
  return path;
}

interface AssetTreeProps {
  nodes: FindingAssetNode[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  loading?: boolean;
  truncated?: boolean;
  droppedKinds?: string[];
  findingTotal: number;
  onRefresh?: () => void;
}

export function AssetTree({
  nodes,
  selected,
  onSelect,
  loading,
  truncated,
  droppedKinds,
  findingTotal,
  onRefresh,
}: AssetTreeProps) {
  const [keyword, setKeyword] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const { locale, d } = useI18n();

  const roots = React.useMemo(() => buildAssetTree(nodes), [nodes]);
  const visible = React.useMemo(() => filterTree(roots, keyword), [roots, keyword]);

  const searching = keyword.trim() !== "";
  const searchKeys = React.useMemo(() => (searching ? collectKeys(visible) : null), [searching, visible]);

  const isExpanded = React.useCallback(
    (node: TreeNode) => {
      if (searchKeys) return searchKeys.has(node.key);
      if (expanded.has(node.key)) return true;
      return node.depth === 0 && !collapsed.has(node.key);
    },
    [collapsed, expanded, searchKeys],
  );

  const toggle = React.useCallback(
    (node: TreeNode) => {
      const open = isExpanded(node);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (open) next.delete(node.key);
        else next.add(node.key);
        return next;
      });
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (open) next.add(node.key);
        else next.delete(node.key);
        return next;
      });
    },
    [isExpanded],
  );

  let emptyHint =
    locale === "pt"
      ? "Nenhuma vulnerabilidade associada a ativos."
      : locale === "zh"
        ? "当前筛选下没有关联到资产的发现。"
        : "No findings associated with assets under current filter.";
  if (loading) emptyHint = d.common.loading;
  else if (searching)
    emptyHint =
      locale === "pt"
        ? "Nenhum ativo correspondente."
        : locale === "zh"
          ? "没有匹配的资产。"
          : "No matching assets found.";

  const rows: React.ReactNode[] = [];
  const pushRows = (list: TreeNode[]) => {
    for (const node of list) {
      const open = isExpanded(node);
      rows.push(
        <AssetTreeRow
          key={node.key}
          node={node}
          open={open}
          selected={selected === node.key}
          onToggle={() => toggle(node)}
          onSelect={() => onSelect(selected === node.key ? null : node.key)}
          locale={locale}
        />,
      );
      if (open && node.children.length > 0) pushRows(node.children);
    }
  };
  pushRows(visible);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1">
        <InputGroup className="flex-1">
          <InputGroupInput
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={locale === "pt" ? "Filtrar ativos..." : locale === "zh" ? "过滤资产" : "Filter assets..."}
            aria-label="Filter assets"
          />
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
        {onRefresh && (
          <Button
            size="icon"
            variant="ghost"
            className="size-8 shrink-0 text-muted-foreground"
            onClick={onRefresh}
            disabled={loading}
            aria-label={
              locale === "pt" ? "Atualizar árvore de ativos" : locale === "zh" ? "刷新资产树" : "Refresh asset tree"
            }
            title={
              locale === "pt" ? "Atualizar árvore de ativos" : locale === "zh" ? "刷新资产树" : "Refresh asset tree"
            }
          >
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
          selected === null ? "bg-accent font-medium" : "hover:bg-accent/50",
        )}
      >
        <span>{locale === "pt" ? "Todos os Ativos" : locale === "zh" ? "全部资产" : "All Assets"}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{findingTotal}</span>
      </button>

      <div className="max-h-[24rem] min-h-0 flex-1 overflow-y-auto pr-2 lg:max-h-[calc(100vh-16rem)]">
        <div className="flex flex-col">
          {rows}
          {rows.length === 0 && <p className="px-2 py-8 text-center text-xs text-muted-foreground">{emptyHint}</p>}
        </div>
      </div>

      {truncated && (
        <p className="px-1 text-xs text-muted-foreground">
          {locale === "pt" ? (
            <>
              Muitos ativos; níveis inferiores foram condensados (
              {(droppedKinds ?? []).map((k) => KIND_LABELS[locale]?.[k as FindingAssetKind] ?? k).join(" / ")}
              ). Utilize a busca para navegar detalhadamente.
            </>
          ) : locale === "zh" ? (
            <>
              资产过多，已隐藏{(droppedKinds ?? []).map((k) => KIND_LABELS.zh[k as FindingAssetKind] ?? k).join(" / ")}
              层级（计数仍已计入上层）。用筛选或过滤框收窄可看到完整层级。
            </>
          ) : (
            <>
              High asset volume; condensed lower tiers (
              {(droppedKinds ?? []).map((k) => KIND_LABELS.en[k as FindingAssetKind] ?? k).join(" / ")}
              ). Refine filter to expand individual sub-nodes.
            </>
          )}
        </p>
      )}
    </div>
  );
}

function AssetTreeRow({
  node,
  open,
  selected,
  onToggle,
  onSelect,
  locale = "en",
}: {
  node: TreeNode;
  open: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  locale?: string;
}) {
  const Icon = KIND_ICON[node.kind] ?? GlobeIcon;
  const hasChildren = node.children.length > 0;
  const kindLabel = KIND_LABELS[locale]?.[node.kind] ?? KIND_LABELS.en[node.kind] ?? node.kind;

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md pr-1 text-sm",
        selected ? "bg-accent" : "hover:bg-accent/50",
      )}
      style={{ paddingLeft: `${node.depth * 10}px` }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={open}
        >
          <ChevronRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
      ) : (
        <span className="size-5 shrink-0" />
      )}

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1 text-left"
        title={`${kindLabel} · ${node.label}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{node.display}</span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{node.total}</span>
      </button>
    </div>
  );
}
