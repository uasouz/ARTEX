"use client";

import * as React from "react";

import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Finding } from "@/lib/types";

const CWE_RE = /^CWE-\d{1,7}$/;

export function FindingRemediationEditor({
  finding,
  readOnly,
  onSaved,
}: {
  finding: Finding;
  readOnly?: boolean;
  onSaved: (f: Finding) => void;
}) {
  const { locale } = useI18n();
  const [cwe, setCwe] = React.useState(finding.cwe ?? "");
  const [remediation, setRemediation] = React.useState(finding.remediation ?? "");
  const [effort, setEffort] = React.useState(finding.remediation_effort || "");
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const t = React.useMemo(() => {
    if (locale === "pt") {
      return {
        cweLabel: "CWE",
        cwePlaceholder: "CWE-79",
        cweInvalid: "Formato esperado: CWE-<número>",
        effortLabel: "Esforço",
        effortNone: "— não definido —",
        effortS: "Pequeno",
        effortM: "Médio",
        effortL: "Grande",
        remediationLabel: "Recomendações de Correção",
        remediationPlaceholder: "Passos concretos para corrigir: o que mudar, onde, e como verificar a correção…",
        edit: "Editar",
        save: "Salvar",
        cancel: "Cancelar",
        saved: "Recomendações salvas",
        failed: (e: string) => `Falha ao salvar: ${e}`,
        none: "Nenhuma recomendação registrada.",
      };
    }
    if (locale === "zh") {
      return {
        cweLabel: "CWE",
        cwePlaceholder: "CWE-79",
        cweInvalid: "格式应为 CWE-<编号>",
        effortLabel: "工作量",
        effortNone: "— 未设置 —",
        effortS: "小",
        effortM: "中",
        effortL: "大",
        remediationLabel: "修复建议",
        remediationPlaceholder: "具体的修复步骤：改什么、在哪改、如何验证已修复…",
        edit: "编辑",
        save: "保存",
        cancel: "取消",
        saved: "修复建议已保存",
        failed: (e: string) => `保存失败：${e}`,
        none: "暂无修复建议。",
      };
    }
    return {
      cweLabel: "CWE",
      cwePlaceholder: "CWE-79",
      cweInvalid: "Expected format: CWE-<number>",
      effortLabel: "Effort",
      effortNone: "— unset —",
      effortS: "Small",
      effortM: "Medium",
      effortL: "Large",
      remediationLabel: "Remediation Guidance",
      remediationPlaceholder: "Concrete fix steps: what to change, where, and how to verify the fix…",
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
      saved: "Remediation saved",
      failed: (e: string) => `Save failed: ${e}`,
      none: "No remediation guidance recorded.",
    };
  }, [locale]);

  React.useEffect(() => {
    setCwe(finding.cwe ?? "");
    setRemediation(finding.remediation ?? "");
    setEffort(finding.remediation_effort || "");
    setEditing(false);
  }, [finding.id, finding.cwe, finding.remediation, finding.remediation_effort]);

  const effortLabel = effort === "S" ? t.effortS : effort === "M" ? t.effortM : effort === "L" ? t.effortL : "";

  async function save() {
    const cweTrim = cwe.trim().toUpperCase();
    if (saving) return;
    if (cweTrim !== "" && !CWE_RE.test(cweTrim)) {
      toast.error(t.cweInvalid);
      return;
    }
    setSaving(true);
    try {
      // CWE and remediation are independent PATCHes; run both, land on the
      // remediation response (which carries the full refreshed row).
      const id = finding.finding_id ?? finding.id;
      const [, updated] = await Promise.all([
        cweTrim !== (finding.cwe ?? "") ? api.setFindingCWE(id, cweTrim) : Promise.resolve(null),
        api.setFindingRemediation(id, remediation.trim(), effort),
      ]);
      onSaved(updated);
      toast.success(t.saved);
      setEditing(false);
    } catch (e) {
      toast.error(t.failed((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  if (readOnly && !editing) {
    return (
      <div className="space-y-2">
        {finding.cwe ? <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{finding.cwe}</code> : null}
        <p className="text-muted-foreground text-sm">{finding.remediation ? finding.remediation : t.none}</p>
        {effortLabel ? (
          <p className="text-muted-foreground text-xs">
            {t.effortLabel}: {effortLabel}
          </p>
        ) : null}
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        {finding.cwe ? <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{finding.cwe}</code> : null}
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">
          {finding.remediation ? finding.remediation : t.none}
        </p>
        {effortLabel ? (
          <p className="text-muted-foreground text-xs">
            {t.effortLabel}: {effortLabel}
          </p>
        ) : null}
        {!readOnly && (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
            {t.edit}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="f-cwe" className="text-muted-foreground text-xs">
            {t.cweLabel}
          </Label>
          <Input
            id="f-cwe"
            className="h-8 font-mono text-xs"
            placeholder={t.cwePlaceholder}
            value={cwe}
            onChange={(e) => setCwe(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-muted-foreground text-xs">{t.effortLabel}</Label>
          <Select value={effort} onValueChange={setEffort}>
            <SelectTrigger size="sm" className="h-8 w-full">
              <SelectValue placeholder={t.effortNone} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t.effortNone}</SelectItem>
              <SelectItem value="S">{t.effortS}</SelectItem>
              <SelectItem value="M">{t.effortM}</SelectItem>
              <SelectItem value="L">{t.effortL}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-remediation" className="text-muted-foreground text-xs">
          {t.remediationLabel}
        </Label>
        <Textarea
          id="f-remediation"
          rows={6}
          className="text-sm"
          placeholder={t.remediationPlaceholder}
          value={remediation}
          onChange={(e) => setRemediation(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {t.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}
