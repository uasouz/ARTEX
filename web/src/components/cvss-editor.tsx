"use client";

import * as React from "react";

import { Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { CVSS_METRIC_KEYS, cvssPreview, formatCvssVector, parseCvssVector } from "@/lib/cvss";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Finding } from "@/lib/types";
import { cn } from "@/lib/utils";

const METRIC_OPTIONS: Record<string, { value: string; short: string }[]> = {
  AV: [
    { value: "N", short: "N" },
    { value: "A", short: "A" },
    { value: "L", short: "L" },
    { value: "P", short: "P" },
  ],
  AC: [
    { value: "L", short: "L" },
    { value: "H", short: "H" },
  ],
  PR: [
    { value: "N", short: "N" },
    { value: "L", short: "L" },
    { value: "H", short: "H" },
  ],
  UI: [
    { value: "N", short: "N" },
    { value: "R", short: "R" },
  ],
  S: [
    { value: "U", short: "U" },
    { value: "C", short: "C" },
  ],
  C: [
    { value: "H", short: "H" },
    { value: "L", short: "L" },
    { value: "N", short: "N" },
  ],
  I: [
    { value: "H", short: "H" },
    { value: "L", short: "L" },
    { value: "N", short: "N" },
  ],
  A: [
    { value: "H", short: "H" },
    { value: "L", short: "L" },
    { value: "N", short: "N" },
  ],
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-600/60 text-red-600 dark:text-red-400",
  high: "border-orange-500/60 text-orange-600 dark:text-orange-400",
  medium: "border-yellow-500/60 text-yellow-700 dark:text-yellow-400",
  low: "border-emerald-500/60 text-emerald-600 dark:text-emerald-400",
  none: "border-muted-foreground/40 text-muted-foreground",
};

export function CvssEditor({
  finding,
  readOnly,
  onSaved,
}: {
  finding: Finding;
  readOnly?: boolean;
  onSaved: (f: Finding) => void;
}) {
  const { locale } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [metrics, setMetrics] = React.useState<Record<string, string>>({});
  const [raw, setRaw] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const t = React.useMemo(() => {
    if (locale === "pt") {
      return {
        title: "Pontuação CVSS",
        notScored: "Não pontuada",
        edit: "Pontuar",
        cancel: "Cancelar",
        save: "Salvar pontuação",
        clear: "Remover pontuação",
        pasteHint: "Ou cole um vetor existente:",
        invalid: "Vetor inválido — verifique as métricas",
        saved: "Pontuação CVSS salva",
        cleared: "Pontuação removida",
        failed: (e: string) => `Falha ao salvar: ${e}`,
        labels: {
          AV: "Vetor de ataque",
          AC: "Complexidade",
          PR: "Privilégios",
          UI: "Interação",
          S: "Escopo",
          C: "Confidencialidade",
          I: "Integridade",
          A: "Disponibilidade",
        } as Record<string, string>,
      };
    }
    if (locale === "zh") {
      return {
        title: "CVSS 评分",
        notScored: "未评分",
        edit: "评分",
        cancel: "取消",
        save: "保存评分",
        clear: "清除评分",
        pasteHint: "或粘贴现有向量：",
        invalid: "向量无效——请检查指标",
        saved: "CVSS 评分已保存",
        cleared: "已清除评分",
        failed: (e: string) => `保存失败：${e}`,
        labels: {
          AV: "攻击途径",
          AC: "复杂度",
          PR: "权限",
          UI: "交互",
          S: "范围",
          C: "机密性",
          I: "完整性",
          A: "可用性",
        } as Record<string, string>,
      };
    }
    return {
      title: "CVSS Score",
      notScored: "Not scored",
      edit: "Score",
      cancel: "Cancel",
      save: "Save score",
      clear: "Clear score",
      pasteHint: "Or paste an existing vector:",
      invalid: "Invalid vector — check the metrics",
      saved: "CVSS score saved",
      cleared: "Score cleared",
      failed: (e: string) => `Save failed: ${e}`,
      labels: {
        AV: "Attack vector",
        AC: "Complexity",
        PR: "Privileges",
        UI: "Interaction",
        S: "Scope",
        C: "Confidentiality",
        I: "Integrity",
        A: "Availability",
      } as Record<string, string>,
    };
  }, [locale]);

  React.useEffect(() => {
    const parsed = parseCvssVector(finding.cvss_vector ?? "");
    setMetrics(parsed ? { ...parsed } : {});
    setRaw(finding.cvss_vector ?? "");
  }, [finding.cvss_vector, finding.id]);

  const vectorFromMetrics = React.useMemo(() => {
    if (CVSS_METRIC_KEYS.some((k) => !metrics[k])) return "";
    return formatCvssVector(metrics as never);
  }, [metrics]);

  const effectiveVector = raw.trim() || vectorFromMetrics;
  const preview = cvssPreview(effectiveVector);

  async function save(clear: boolean) {
    if (saving) return;
    if (!clear && !preview) {
      toast.error(t.invalid);
      return;
    }
    setSaving(true);
    try {
      const updated = await api.setFindingCVSS(finding.finding_id ?? finding.id, clear ? "" : preview!.vector);
      onSaved(updated);
      toast.success(clear ? t.cleared : t.saved);
      setOpen(false);
    } catch (e) {
      toast.error(t.failed((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {open ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CVSS_METRIC_KEYS.map((key) => (
              <div key={key} className="grid gap-1">
                <Label htmlFor={`cvss-${key}`} className="text-muted-foreground text-[11px]">
                  {key} · {t.labels[key]}
                </Label>
                <Select
                  value={metrics[key] ?? ""}
                  onValueChange={(v) => {
                    setMetrics((cur) => ({ ...cur, [key]: v }));
                    setRaw("");
                  }}
                >
                  <SelectTrigger id={`cvss-${key}`} size="sm" className="font-mono">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_OPTIONS[key].map((o) => (
                      <SelectItem key={o.value} value={o.value} className="font-mono">
                        {o.short}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="grid gap-1">
            <Label className="text-muted-foreground text-[11px]">{t.pasteHint}</Label>
            <Input
              className="font-mono text-xs"
              placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </div>
          {effectiveVector && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{preview?.vector ?? effectiveVector}</code>
              {preview ? (
                <Badge variant="outline" className={cn("font-mono tabular-nums", SEVERITY_COLORS[preview.severity])}>
                  {preview.score.toFixed(1)} · {preview.severity}
                </Badge>
              ) : (
                <span className="text-destructive">{t.invalid}</span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void save(false)} disabled={saving || !preview}>
              {saving && <Loader2Icon className="animate-spin" />}
              {t.save}
            </Button>
            {(finding.cvss_vector ?? "") !== "" && (
              <Button size="sm" variant="outline" onClick={() => void save(true)} disabled={saving}>
                {t.clear}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {finding.cvss_vector ? (
            <>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono tabular-nums",
                  SEVERITY_COLORS[cvssPreview(finding.cvss_vector)?.severity ?? "none"],
                )}
              >
                {(finding.cvss_score ?? 0).toFixed(1)}
              </Badge>
              <code className="text-muted-foreground font-mono text-[11px]" title={finding.cvss_vector}>
                {finding.cvss_vector}
              </code>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">{t.notScored}</span>
          )}
          {!readOnly && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setOpen(true)}>
              {t.edit}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
