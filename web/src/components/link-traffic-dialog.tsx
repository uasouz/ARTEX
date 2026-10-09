"use client";

import * as React from "react";

import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Finding, FindingsPage } from "@/lib/types";

export function LinkTrafficDialog({
  trafficIds,
  onClose,
  onBound,
}: {
  trafficIds: string[];
  onClose: () => void;
  onBound: () => void;
}) {
  const { locale } = useI18n();
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<FindingsPage | null>(null);
  const [selected, setSelected] = React.useState<Finding | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        title: "Associar à Vulnerabilidade",
        description: `Salvar os ${trafficIds.length} fluxos de tráfego selecionados como evidência de uma vulnerabilidade existente.`,
        searchLabel: "Buscar vulnerabilidade",
        searchPlaceholder: "Nome / resumo / categoria de vulnerabilidade",
        loading: "Carregando…",
        noFindings: "Nenhuma vulnerabilidade correspondente. Registre uma vulnerabilidade primeiro.",
        prev: "Anterior",
        next: "Próxima",
        pagination: (cur: number, tot: number) => `Página ${cur} · Total de ${tot}`,
        selectedLabel: (id: number | string, name: string) => `Vulnerabilidade selecionada: #${id} ${name}`,
        selectPrompt: "Selecione uma vulnerabilidade",
        cancel: "Cancelar",
        confirm: "Confirmar Associação",
        saving: "Salvando…",
        success: (count: number, id: number | string) =>
          `Associados ${count} fluxos de tráfego à vulnerabilidade #${id}`,
      };
    }
    if (locale === "zh") {
      return {
        title: "关联到漏洞",
        description: `将所选 ${trafficIds.length} 条流量保存为已有漏洞的证据。`,
        searchLabel: "查找漏洞",
        searchPlaceholder: "名称 / 摘要 / 漏洞类别",
        loading: "加载中…",
        noFindings: "没有匹配的漏洞，请先登记漏洞",
        prev: "上一页",
        next: "下一页",
        pagination: (cur: number, tot: number) => `第 ${cur} 页 · 共 ${tot} 条`,
        selectedLabel: (id: number | string, name: string) => `已选漏洞：#${id} ${name}`,
        selectPrompt: "请选择一个漏洞",
        cancel: "取消",
        confirm: "确认关联",
        saving: "保存中…",
        success: (count: number, id: number | string) => `已关联 ${count} 条流量到漏洞 #${id}`,
      };
    }
    return {
      title: "Link to Finding",
      description: `Save the selected ${trafficIds.length} traffic flows as evidence for an existing finding.`,
      searchLabel: "Search Finding",
      searchPlaceholder: "Name / summary / vulnerability class",
      loading: "Loading…",
      noFindings: "No matching findings. Please report a finding first.",
      prev: "Previous",
      next: "Next",
      pagination: (cur: number, tot: number) => `Page ${cur} · Total ${tot}`,
      selectedLabel: (id: number | string, name: string) => `Selected finding: #${id} ${name}`,
      selectPrompt: "Please select a finding",
      cancel: "Cancel",
      confirm: "Confirm Link",
      saving: "Saving…",
      success: (count: number, id: number | string) => `Linked ${count} traffic flow(s) to finding #${id}`,
    };
  }, [locale, trafficIds.length]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      api
        .findingsPage({ page, pageSize: 20, query })
        .then((d) => {
          if (active) setData(d);
        })
        .catch((e: Error) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, page]);

  async function save() {
    if (!selected?.finding_id) return;
    setBusy(true);
    setError("");
    try {
      await api.bindFindingTraffic(
        selected.finding_id,
        trafficIds.map((traffic_id) => ({ traffic_id })),
      );
      toast.success(strings.success(trafficIds.length, selected.finding_id));
      onBound();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  let selectedText = strings.selectPrompt;
  if (selected?.finding_id) {
    selectedText = strings.selectedLabel(selected.finding_id, selected.name || selected.vulnclass || "");
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{strings.title}</DialogTitle>
          <DialogDescription>{strings.description}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="link-finding-query">{strings.searchLabel}</FieldLabel>
            <Input
              id="link-finding-query"
              placeholder={strings.searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        </FieldGroup>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex max-h-[40vh] flex-col gap-2 overflow-auto" aria-busy={loading}>
          {(data?.items ?? []).map((f) => (
            <Button
              key={f.finding_id ?? f.id}
              variant={selected?.finding_id === f.finding_id ? "secondary" : "outline"}
              className="h-auto justify-start p-3 text-left whitespace-normal"
              aria-pressed={selected?.finding_id === f.finding_id}
              disabled={busy || !f.finding_id || f.inherited}
              onClick={() => setSelected(f)}
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span>
                  #{f.finding_id ?? f.id} · {f.name || f.vulnclass}
                </span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{f.summary}</span>
              </span>
            </Button>
          ))}
          {!data?.items.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {loading ? strings.loading : strings.noFindings}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)}>
            {strings.prev}
          </Button>
          <span className="text-xs">{strings.pagination(page, data?.total ?? 0)}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page * 20 >= (data?.total ?? 0)}
            onClick={() => setPage((p) => p + 1)}
          >
            {strings.next}
          </Button>
        </div>
        <p className="text-sm">{selectedText}</p>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {strings.cancel}
          </Button>
          <Button disabled={busy || !selected} onClick={() => void save()}>
            {busy ? strings.saving : strings.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
