"use client";

import * as React from "react";

import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn, copyText } from "@/lib/utils";

const I18N = {
  en: {
    label: "Copy",
    successMessage: "Copied",
    failureMessage: "Copy failed, please select and copy text manually",
  },
  pt: {
    label: "Copiar",
    successMessage: "Copiado",
    failureMessage: "Falha ao copiar, selecione e copie o texto manualmente",
  },
  zh: {
    label: "复制",
    successMessage: "已复制",
    failureMessage: "复制失败，请手动选择文本复制",
  },
};

type CopyButtonProps = {
  // Text to copy; button disabled if null/empty.
  text: string | null | undefined;
  // Custom toast message on copy success.
  successMessage?: string;
  label?: React.ReactNode;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
};

// CopyButton: uniform copy-to-clipboard button with success/error toasts.
export function CopyButton({
  text,
  successMessage,
  label,
  size = "sm",
  variant = "outline",
  className,
}: CopyButtonProps) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    if (!text) return;
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      toast.success(successMessage ?? t.successMessage);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error(t.failureMessage);
    }
  }

  return (
    <Button type="button" size={size} variant={variant} className={cn(className)} disabled={!text} onClick={handleCopy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {label ?? t.label}
    </Button>
  );
}
