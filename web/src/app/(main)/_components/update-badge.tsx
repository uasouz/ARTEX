"use client";

import * as React from "react";

import Link from "next/link";

import { ArrowUpCircleIcon } from "lucide-react";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";

const I18N = {
  en: {
    title: (ver: string) => `New version ${ver} available, click to update`,
    badgeFull: (ver: string) => `New: ${ver}`,
    badgeShort: "Update",
  },
  pt: {
    title: (ver: string) => `Nova versão ${ver} disponível, clique para atualizar`,
    badgeFull: (ver: string) => `Nova versão: ${ver}`,
    badgeShort: "Novo",
  },
  zh: {
    title: (ver: string) => `发现新版本 ${ver}，点击前往更新`,
    badgeFull: (ver: string) => `新版本 ${ver}`,
    badgeShort: "新版本",
  },
};

export function UpdateBadge() {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;
  const [latest, setLatest] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    api
      .checkUpdate()
      .then((r) => {
        if (alive && r.has_update && r.latest) setLatest(r.latest.replace(/^v(?=\d)/, ""));
      })
      .catch(() => {
        // Silently ignore GitHub rate limit / network error in top bar.
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!latest) return null;

  return (
    <Link
      href="/system/settings"
      title={t.title(latest)}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground text-xs transition-opacity hover:opacity-90"
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
      </span>
      <ArrowUpCircleIcon className="size-3.5" />
      <span className="hidden sm:inline">{t.badgeFull(latest)}</span>
      <span className="sm:hidden">{t.badgeShort}</span>
    </Link>
  );
}
