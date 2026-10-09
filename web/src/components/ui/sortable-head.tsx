"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import type * as React from "react";

import { TableHead } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { SortDirection } from "@/lib/sort-preference";
import { cn } from "@/lib/utils";

export function SortableHead<Field extends string>({
  field,
  label,
  activeField,
  direction,
  align = "left",
  className,
  onSort,
}: {
  field: Field;
  label: string;
  activeField: Field | null;
  direction: SortDirection;
  align?: "left" | "right";
  className?: string;
  onSort: (field: Field) => void;
}) {
  const { locale } = useI18n();
  const active = activeField === field;
  let ariaSort: React.AriaAttributes["aria-sort"] = "none";
  if (active) ariaSort = direction === "asc" ? "ascending" : "descending";

  let actionLabel = "";
  if (locale === "zh") {
    actionLabel = `按${label}倒序排序`;
    if (active) actionLabel = `${label}当前${direction === "asc" ? "正序" : "倒序"}，点击切换排序方向`;
  } else if (locale === "pt") {
    actionLabel = `Ordenar por ${label} decrescente`;
    if (active) actionLabel = `${label} atualmente ${direction === "asc" ? "crescente" : "decrescente"}, clique para alternar`;
  } else {
    actionLabel = `Sort by ${label} descending`;
    if (active) actionLabel = `${label} currently ${direction === "asc" ? "ascending" : "descending"}, click to toggle sort direction`;
  }

  let icon = <ArrowUpDownIcon className="size-3.5 opacity-40 transition-opacity group-hover/sort:opacity-100" />;
  if (active) icon = direction === "asc" ? <ArrowUpIcon className="size-3.5" /> : <ArrowDownIcon className="size-3.5" />;

  return (
    <TableHead className={className} aria-sort={ariaSort}>
      <button
        type="button"
        className={cn(
          "group/sort inline-flex h-full w-full items-center gap-1 outline-none focus-visible:underline",
          align === "right" && "justify-end",
        )}
        aria-label={actionLabel}
        onClick={() => onSort(field)}
      >
        <span>{label}</span>
        {icon}
      </button>
    </TableHead>
  );
}
