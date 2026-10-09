"use client";

import * as React from "react";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { TrafficEvidenceViewer } from "@/components/traffic-evidence-viewer";
import { TrafficPickerDialog } from "@/components/traffic-picker-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { FindingTraffic, FindingTrafficBinding, TrafficEvidenceRole } from "@/lib/types";

const I18N = {
  en: {
    roles: {
      baseline: "Normal Baseline",
      proof: "PoC Exploit / Proof",
      verification: "Supplementary Verification",
      supporting: "Supporting Evidence",
    },
    updated: "Traffic evidence updated",
    title: (count: number) => `Associated Traffic (${count})`,
    titleEmpty: "Associated Traffic",
    bindTraffic: "Bind Traffic",
    inheritedReadOnly: "Inherited Evidence · Read-only",
    description:
      "Organize requests and responses in reproduction order. Bound evidence is retained even after raw traffic is cleared.",
    retry: "Retry",
    emptyTitle: "No Associated Traffic",
    emptyDescription: "Bind normal baselines, vulnerability proofs, or verification requests.",
    evidenceHash: (id: string) => `Evidence #${id}`,
    viewPacket: "View Packet",
    editNote: "Edit Note",
    moveUpAria: (id: string) => `Move evidence #${id} up`,
    moveDownAria: (id: string) => `Move evidence #${id} down`,
    unbind: "Unbind",
    dialogTitle: "Edit Traffic Evidence",
    dialogDescription: "Explain how this request/response supports the vulnerability conclusion.",
    fieldRole: "Role",
    fieldNote: "Evidence Note",
    cancel: "Cancel",
    saveNote: "Save Note",
  },
  pt: {
    roles: {
      baseline: "Linha de Base Normal",
      proof: "Prova de Conceito (PoC)",
      verification: "Verificação Suplementar",
      supporting: "Evidência de Suporte",
    },
    updated: "Evidência de tráfego atualizada",
    title: (count: number) => `Tráfego Associado (${count})`,
    titleEmpty: "Tráfego Associado",
    bindTraffic: "Vincular Tráfego",
    inheritedReadOnly: "Evidência Herdada · Somente leitura",
    description:
      "Organize requisições e respostas na ordem de reprodução. As evidências vinculadas são mantidas mesmo após limpar o tráfego bruto.",
    retry: "Tentar novamente",
    emptyTitle: "Nenhum Tráfego Associado",
    emptyDescription: "Vincule referências de linha de base, provas de vulnerabilidade e requisições de validação.",
    evidenceHash: (id: string) => `Evidência #${id}`,
    viewPacket: "Ver Pacote",
    editNote: "Editar Nota",
    moveUpAria: (id: string) => `Mover evidência #${id} para cima`,
    moveDownAria: (id: string) => `Mover evidência #${id} para baixo`,
    unbind: "Desvincular",
    dialogTitle: "Editar Evidência de Tráfego",
    dialogDescription: "Explique como esta requisição/resposta sustenta a conclusão da vulnerabilidade.",
    fieldRole: "Função",
    fieldNote: "Nota da Evidência",
    cancel: "Cancelar",
    saveNote: "Salvar Nota",
  },
  zh: {
    roles: {
      baseline: "正常对照",
      proof: "漏洞证明",
      verification: "补充验证",
      supporting: "辅助证据",
    },
    updated: "流量证据已更新",
    title: (count: number) => `关联流量 (${count})`,
    titleEmpty: "关联流量",
    bindTraffic: "绑定流量",
    inheritedReadOnly: "继承证据 · 只读",
    description: "按复现顺序组织请求与响应。清理原始流量后，已绑定证据仍然保留。",
    retry: "重试",
    emptyTitle: "暂无关联流量",
    emptyDescription: "可绑定正常对照、漏洞证明和补充验证请求。",
    evidenceHash: (id: string) => `证据 #${id}`,
    viewPacket: "查看报文",
    editNote: "编辑说明",
    moveUpAria: (id: string) => `上移证据 ${id}`,
    moveDownAria: (id: string) => `下移证据 ${id}`,
    unbind: "解除绑定",
    dialogTitle: "编辑流量证据",
    dialogDescription: "说明这组请求/响应如何支持漏洞结论。",
    fieldRole: "用途",
    fieldNote: "证据说明",
    cancel: "取消",
    saveNote: "保存说明",
  },
};

const DATE_LOCALES: Record<string, string> = {
  zh: "zh-CN",
  pt: "pt-BR",
  en: "en-US",
};

export function FindingTrafficPanel({
  findingId,
  contextTask,
  readOnly,
  onChanged,
}: {
  findingId: string;
  contextTask?: string;
  readOnly?: boolean;
  onChanged: () => void;
}) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;
  const dateLocale = DATE_LOCALES[locale] ?? "en-US";

  const [data, setData] = React.useState<FindingTraffic | null>(null);
  const [error, setError] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<FindingTrafficBinding | null>(null);
  const [role, setRole] = React.useState<TrafficEvidenceRole>("supporting");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [reload, setReload] = React.useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retry token intentionally refreshes this request.
  React.useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api
      .findingTraffic(findingId, contextTask)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [findingId, contextTask, reload]);

  async function mutate(action: () => Promise<FindingTraffic>) {
    setBusy(true);
    try {
      setData(await action());
      setEditing(null);
      onChanged();
      toast.success(t.updated);
    } catch (e) {
      toast.error((e as Error).message);
      setReload((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: number) {
    if (!data) return;
    const ids = data.bindings.map((b) => b.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    void mutate(() => api.orderFindingTraffic(findingId, ids, data.version, contextTask));
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{data ? t.title(data.bindings.length) : t.titleEmpty}</CardTitle>
            {!readOnly ? (
              <Button variant="outline" size="sm" disabled={!data || busy} onClick={() => setAdding(true)}>
                <PlusIcon data-icon="inline-start" />
                {t.bindTraffic}
              </Button>
            ) : (
              <Badge variant="outline">{t.inheritedReadOnly}</Badge>
            )}
          </div>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
                <Button variant="link" onClick={() => setReload((n) => n + 1)}>
                  {t.retry}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {!data ? (
            <Skeleton className="h-28 w-full" />
          ) : data.bindings.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t.emptyTitle}</EmptyTitle>
                <EmptyDescription>{t.emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            data.bindings.map((b, index) => (
              <div key={b.id} className="flex min-w-0 flex-col gap-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {index + 1}. {t.roles[b.role] ?? b.role}
                  </Badge>
                  <Badge variant="secondary">
                    {b.snapshot.method} · {b.snapshot.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{t.evidenceHash(b.id)}</span>
                </div>
                <Button
                  variant="link"
                  className="h-auto justify-start p-0 text-left whitespace-normal"
                  onClick={() => setPreview(b.id)}
                >
                  <span className="break-all font-mono text-xs">{b.snapshot.url}</span>
                </Button>
                {b.note ? <p className="text-sm whitespace-pre-wrap">{b.note}</p> : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(b.snapshot.captured_at * 1000).toLocaleString(dateLocale)}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    <Button variant="outline" size="sm" onClick={() => setPreview(b.id)}>
                      {t.viewPacket}
                    </Button>
                    {!readOnly ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setEditing(b);
                            setRole(b.role);
                            setNote(b.note);
                          }}
                        >
                          {t.editNote}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t.moveUpAria(b.id)}
                          disabled={busy || index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUpIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t.moveDownAria(b.id)}
                          disabled={busy || index === data.bindings.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDownIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void mutate(() => api.removeFindingTraffic(findingId, b.id, data.version, contextTask))
                          }
                        >
                          {t.unbind}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {adding && data ? (
        <TrafficPickerDialog
          findingId={findingId}
          contextTask={contextTask}
          bound={data.bindings}
          onClose={() => setAdding(false)}
          onBound={() => {
            setReload((n) => n + 1);
            onChanged();
          }}
        />
      ) : null}
      <TrafficEvidenceViewer
        findingId={findingId}
        bindingId={preview}
        contextTask={contextTask}
        onClose={() => setPreview(null)}
      />
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>{t.dialogDescription}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="evidence-role">{t.fieldRole}</FieldLabel>
              <Select value={role} onValueChange={(v) => setRole(v as TrafficEvidenceRole)}>
                <SelectTrigger id="evidence-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(t.roles).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="evidence-note">{t.fieldNote}</FieldLabel>
              <Textarea id="evidence-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setEditing(null)}>
              {t.cancel}
            </Button>
            <Button
              disabled={busy || !editing || !data}
              onClick={() => {
                if (editing && data)
                  void mutate(() =>
                    api.editFindingTraffic(findingId, editing.id, data.version, { role, note }, contextTask),
                  );
              }}
            >
              {t.saveNote}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
