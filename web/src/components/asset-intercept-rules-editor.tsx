"use client";

import * as React from "react";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { AssetInterceptKind, AssetInterceptRuleInput } from "@/lib/types";

const I18N = {
  en: {
    block: "Block",
    allow: "Allow",
    exactDomain: "Domain (exact)",
    exactIp: "IP (exact)",
    exactUrl: "URL (exact)",
    fuzzyDomain: "Domain (wildcard)",
    fuzzyIp: "IP (wildcard)",
    fuzzyUrl: "URL (wildcard)",
    cidr: "CIDR Subnet",
    notePlaceholder: "Note (optional)",
    addRule: "Add Rule",
  },
  pt: {
    block: "Bloquear",
    allow: "Permitir",
    exactDomain: "Domínio (exato)",
    exactIp: "IP (exato)",
    exactUrl: "URL (exato)",
    fuzzyDomain: "Domínio (curinga)",
    fuzzyIp: "IP (curinga)",
    fuzzyUrl: "URL (curinga)",
    cidr: "Sub-rede CIDR",
    notePlaceholder: "Nota (opcional)",
    addRule: "Adicionar Regra",
  },
  zh: {
    block: "拦截",
    allow: "允许",
    exactDomain: "域名(全等)",
    exactIp: "IP(全等)",
    exactUrl: "URL(全等)",
    fuzzyDomain: "域名(模糊)",
    fuzzyIp: "IP(模糊)",
    fuzzyUrl: "URL(模糊)",
    cidr: "CIDR 网段",
    notePlaceholder: "备注(可选)",
    addRule: "添加一条",
  },
};

export function getAssetInterceptKindOptions(locale: "en" | "pt" | "zh") {
  const t = I18N[locale] ?? I18N.en;
  return [
    { value: "exact_domain" as const, label: t.exactDomain, placeholder: "example.gov.cn" },
    { value: "exact_ip" as const, label: t.exactIp, placeholder: "203.0.113.10" },
    { value: "exact_url" as const, label: t.exactUrl, placeholder: "https://example.com/login" },
    { value: "fuzzy_domain" as const, label: t.fuzzyDomain, placeholder: ".gov.cn" },
    { value: "fuzzy_ip" as const, label: t.fuzzyIp, placeholder: "203.0.113." },
    { value: "fuzzy_url" as const, label: t.fuzzyUrl, placeholder: "/admin" },
    { value: "cidr" as const, label: t.cidr, placeholder: "192.168.0.0/16" },
  ];
}

export const ASSET_INTERCEPT_KIND_OPTIONS = getAssetInterceptKindOptions("en");

export function AssetInterceptRulesEditor({
  value,
  onChange,
}: {
  value: AssetInterceptRuleInput[];
  onChange: (v: AssetInterceptRuleInput[]) => void;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;
  const options = React.useMemo(() => getAssetInterceptKindOptions(locale), [locale]);

  function update(i: number, patch: Partial<AssetInterceptRuleInput>) {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, { action: "block", kind: "fuzzy_domain", pattern: "", note: "", enabled: true }]);
  }

  return (
    <div className="grid gap-2">
      {value.map((r, i) => {
        const ph = options.find((o) => o.value === r.kind)?.placeholder ?? "";
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: indexed rows without unique IDs
          <div key={i} className="flex items-center gap-2">
            <NativeSelect
              size="sm"
              className="w-[84px] shrink-0"
              value={r.action}
              onChange={(e) => update(i, { action: e.target.value as "block" | "allow" })}
            >
              <NativeSelectOption value="block">{t.block}</NativeSelectOption>
              <NativeSelectOption value="allow">{t.allow}</NativeSelectOption>
            </NativeSelect>
            <NativeSelect
              size="sm"
              className="w-[120px] shrink-0"
              value={r.kind}
              onChange={(e) => update(i, { kind: e.target.value as AssetInterceptKind })}
            >
              {options.map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              className="flex-1"
              placeholder={ph}
              value={r.pattern}
              onChange={(e) => update(i, { pattern: e.target.value })}
            />
            <Input
              className="w-[120px] shrink-0"
              placeholder={t.notePlaceholder}
              value={r.note}
              onChange={(e) => update(i, { note: e.target.value })}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive size-8 shrink-0"
              onClick={() => remove(i)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        );
      })}
      <Button type="button" size="sm" variant="outline" className="w-fit" onClick={add}>
        <PlusIcon className="size-4" /> {t.addRule}
      </Button>
    </div>
  );
}
