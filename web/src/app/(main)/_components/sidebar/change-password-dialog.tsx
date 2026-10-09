"use client";

import * as React from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const { locale, d } = useI18n();

  // reset fields whenever the dialog closes
  React.useEffect(() => {
    if (!open) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open]);

  const texts = React.useMemo(() => {
    if (locale === "pt") {
      return {
        title: "Alterar Senha",
        desc: "Digite sua senha atual e a nova senha desejada.",
        oldLabel: "Senha Atual",
        newLabel: "Nova Senha",
        confirmLabel: "Confirmar Nova Senha",
        fillAll: "Por favor, preencha a senha atual e a nova senha.",
        mismatch: "As senhas informadas não coincidem.",
        success: "Senha alterada com sucesso.",
        failed: "Falha ao alterar senha",
        saving: "Salvando...",
        confirmBtn: "Confirmar Alteração",
        cancel: "Cancelar",
      };
    }
    if (locale === "zh") {
      return {
        title: "修改密码",
        desc: "用户名固定为 ARTEX。需先输入当前密码验证；修改后已签发的登录 token 仍有效直至过期。",
        oldLabel: "当前密码",
        newLabel: "新密码",
        confirmLabel: "确认新密码",
        fillAll: "请填写当前密码和新密码",
        mismatch: "两次输入的新密码不一致",
        success: "密码已修改",
        failed: "修改失败",
        saving: "修改中…",
        confirmBtn: "确认修改",
        cancel: "取消",
      };
    }
    return {
      title: "Change Password",
      desc: "Enter your current password and your desired new password.",
      oldLabel: "Current Password",
      newLabel: "New Password",
      confirmLabel: "Confirm New Password",
      fillAll: "Please enter both your current password and new password.",
      mismatch: "The entered passwords do not match.",
      success: "Password updated successfully.",
      failed: "Failed to update password",
      saving: "Updating...",
      confirmBtn: "Update Password",
      cancel: "Cancel",
    };
  }, [locale]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error(texts.fillAll);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(texts.mismatch);
      return;
    }
    setSaving(true);
    api
      .changePassword(oldPassword, newPassword)
      .then(() => {
        toast.success(texts.success);
        onOpenChange(false);
      })
      .catch((err) => toast.error(`${texts.failed}: ${(err as Error).message}`))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{texts.title}</DialogTitle>
            <DialogDescription>{texts.desc}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cp-old">{texts.oldLabel}</Label>
              <Input
                id="cp-old"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                disabled={saving}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cp-new">{texts.newLabel}</Label>
              <Input
                id="cp-new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                disabled={saving}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cp-confirm">{texts.confirmLabel}</Label>
              <Input
                id="cp-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                disabled={saving}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {d.common.cancel || texts.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? texts.saving : texts.confirmBtn}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
