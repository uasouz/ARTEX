"use client";

import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/i18n-context";

export function LanguageSwitcher() {
  const { locale, setLocale, locales } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Switch Language" className="relative">
          <Globe className="size-4" />
          <span className="sr-only">Switch Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {locales.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onClick={() => setLocale(item.code)}
            className={`flex items-center justify-between cursor-pointer ${
              locale === item.code ? "font-semibold bg-accent text-accent-foreground" : ""
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{item.flag}</span>
              <span>{item.label}</span>
            </span>
            {locale === item.code && <span className="text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
