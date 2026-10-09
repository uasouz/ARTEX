"use client";

import * as React from "react";

import { RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { FindingRetest } from "@/lib/types";

interface FindingRetestDialogProps {
  findingId: string;
  findingName?: string;
  onClose: () => void;
  onStarted?: (retest: FindingRetest) => void;
}

const I18N = {
  en: {
    dialogTitle: "Retest Finding #{id}",
    dialogDesc:
      "The retest Agent will inspect original evidence and testing constraints, performing targeted verification in an isolated conversation session. Once verified and confirmed fixed, the finding status automatically transitions to 'Fixed'; other outcomes retain existing status.",
    notesLabel: "Additional Notes (Optional)",
    notesPlaceholder: "e.g. Verify original endpoint using test credentials; patched in version v2.",
    notesDesc: "Add details on patch versions, test conditions, or specific constraints.",
    cancel: "Cancel",
    creating: "Creating...",
    startRetest: "Start Retest",
    toastCreated: "Retest started. Click 'Testing' to view session.",
    toastAlreadyRunning: "This finding is already undergoing retest; view existing session.",
    toastFailed: "Failed to start retest: ",
  },
  pt: {
    dialogTitle: "Retestar Vulnerabilidade #{id}",
    dialogDesc:
      "O Agente de reteste analisará as evidências originais e restrições de teste, realizando verificação direcionada em uma sessão isolada. Uma vez confirmado o reparo, o status da vulnerabilidade muda automaticamente para 'Corrigida'; outras conclusões retêm o status anterior.",
    notesLabel: "Observações Adicionais (Opcional)",
    notesPlaceholder: "ex: Verificar endpoint original usando credenciais de teste; corrigido na versão v2.",
    notesDesc: "Adicione detalhes da versão de correção, condições de teste ou restrições.",
    cancel: "Cancelar",
    creating: "Criando...",
    startRetest: "Iniciar Reteste",
    toastCreated: "Reteste iniciado. Clique em 'Em reteste' para ver a sessão.",
    toastAlreadyRunning: "Esta vulnerabilidade já está em reteste; veja a sessão existente.",
    toastFailed: "Falha ao iniciar reteste: ",
  },
  zh: {
    dialogTitle: "复测漏洞 #{id}",
    dialogDesc:
      "复测 Agent 将读取原证据和测试约束，在独立会话中执行针对性验证。复测成功完成且确认修复后，漏洞状态自动改为「已修复」，其他结论保留原状态。",
    notesLabel: "补充说明（可选）",
    notesPlaceholder: "例如：使用原测试账号验证原接口；修复版本为 v2。",
    notesDesc: "可补充修复版本、测试条件或本次限制。",
    cancel: "取消",
    creating: "正在创建…",
    startRetest: "开始复测",
    toastCreated: "复测已启动，可点击「复测中」查看会话",
    toastAlreadyRunning: "该漏洞正在复测，可查看已有会话",
    toastFailed: "发起复测失败：",
  },
};

export function FindingRetestDialog({ findingId, findingName, onClose, onStarted }: FindingRetestDialogProps) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const notesId = React.useId();
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const submitLock = React.useRef(false);

  async function start() {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const result = await api.startFindingRetest(findingId, notes.trim());
      onStarted?.(result.retest);
      onClose();
      toast.success(result.created ? t.toastCreated : t.toastAlreadyRunning);
    } catch (e) {
      toast.error(`${t.toastFailed}${(e as Error).message}`);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !submitLock.current && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dialogTitle.replace("{id}", findingId)}</DialogTitle>
          <DialogDescription className="break-words">
            {findingName ? <span className="mb-2 block">{findingName}</span> : null}
            {t.dialogDesc}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-disabled={submitting}>
            <FieldLabel htmlFor={notesId}>{t.notesLabel}</FieldLabel>
            <Textarea
              id={notesId}
              value={notes}
              maxLength={4000}
              rows={4}
              disabled={submitting}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
            />
            <FieldDescription>{t.notesDesc}</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={onClose}>
            {t.cancel}
          </Button>
          <Button disabled={submitting} onClick={() => void start()}>
            {submitting ? <Spinner data-icon="inline-start" /> : <RotateCcwIcon data-icon="inline-start" />}
            {submitting ? t.creating : t.startRetest}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
