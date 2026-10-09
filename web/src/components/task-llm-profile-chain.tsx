"use client";

import * as React from "react";

import { ArrowDownIcon, ArrowUpIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { LLMProfile } from "@/lib/types";

interface TaskLLMProfileChainProps {
  profiles: LLMProfile[];
  value: string[];
  onValueChange: (value: string[]) => void;
  activeProfileId?: string;
  onActiveProfileChange?: (value: string) => void;
  disabled?: boolean;
  inputId?: string;
  portalContainer?: React.RefObject<HTMLElement | null>;
}

const I18N = {
  en: {
    current: "Current",
    skipped: "Skipped",
    skippedHint: "Profiles prior to current cursor will not be selected by auto-failover",
    backupPrefix: "Backup ",
    profilePrefix: "Profile #",
    searchPlaceholder: "Search and add LLM profile",
    noProfilesPlaceholder: "No available LLM profiles",
    noMatchingProfiles: "No matching LLM profiles",
    activeSuffix: " (Active)",
    emptyChainHint: "When unassigned, task follows Agent profile or global active profile.",
    profileUnavailable: "Profile unavailable",
    moveUpAria: "Move profile up",
    moveDownAria: "Move profile down",
    removeAria: "Remove profile",
    currentProfileLabel: "Current Profile",
  },
  pt: {
    current: "Atual",
    skipped: "Ignorado",
    skippedHint: "Perfis anteriores ao cursor não serão selecionados pelo failover automático",
    backupPrefix: "Reserva ",
    profilePrefix: "Perfil #",
    searchPlaceholder: "Pesquisar e adicionar perfil LLM",
    noProfilesPlaceholder: "Nenhum perfil LLM disponível",
    noMatchingProfiles: "Nenhum perfil LLM correspondente",
    activeSuffix: " (Ativo)",
    emptyChainHint: "Quando não especificado, a tarefa segue o perfil do Agente ou o perfil ativo global.",
    profileUnavailable: "Perfil indisponível",
    moveUpAria: "Mover perfil para cima",
    moveDownAria: "Mover perfil para baixo",
    removeAria: "Remover perfil",
    currentProfileLabel: "Perfil Atual",
  },
  zh: {
    current: "当前",
    skipped: "已跳过",
    skippedHint: "当前游标之前的配置不会被自动故障转移选中",
    backupPrefix: "备用 ",
    profilePrefix: "配置 #",
    searchPlaceholder: "搜索并添加 LLM 配置",
    noProfilesPlaceholder: "暂无可用 LLM 配置",
    noMatchingProfiles: "没有匹配的 LLM 配置",
    activeSuffix: "（激活）",
    emptyChainHint: "未指定配置时，任务跟随 Agent 或全局激活配置。",
    profileUnavailable: "配置已不可用",
    moveUpAria: "上移配置",
    moveDownAria: "下移配置",
    removeAria: "移除配置",
    currentProfileLabel: "当前配置",
  },
};

function ProfileRoleBadge({
  index,
  currentIndex,
  locale,
}: {
  index: number;
  currentIndex: number;
  locale: "en" | "pt" | "zh";
}) {
  const t = I18N[locale] ?? I18N.en;
  if (index === currentIndex) return <Badge variant="default">{t.current}</Badge>;
  if (index < currentIndex) {
    return (
      <Badge variant="outline" title={t.skippedHint}>
        {t.skipped}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      {t.backupPrefix}
      {index - currentIndex}
    </Badge>
  );
}

export function TaskLLMProfileChain({
  profiles,
  value,
  onValueChange,
  activeProfileId,
  onActiveProfileChange,
  disabled = false,
  inputId,
  portalContainer,
}: TaskLLMProfileChainProps) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const profilesByID = React.useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const itemIDs = React.useMemo(() => profiles.map((profile) => profile.id), [profiles]);
  const profilesUnavailable = profiles.length === 0;
  const currentProfileID = activeProfileId && value.includes(activeProfileId) ? activeProfileId : value[0];
  const currentIndex = value.indexOf(currentProfileID);

  const profileLabel = React.useCallback(
    (id: string) => {
      const profile = profilesByID.get(id);
      return profile ? `${profile.name} ${profile.model}` : `${t.profilePrefix}${id}`;
    },
    [profilesByID, t.profilePrefix],
  );

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onValueChange(next);
  };

  const remove = (id: string) => {
    const next = value.filter((profileID) => profileID !== id);
    onValueChange(next);
    if (activeProfileId === id) onActiveProfileChange?.(next[0] ?? "");
  };

  const handleValueChange = (next: string[]) => {
    onValueChange(next);
    if (activeProfileId && !next.includes(activeProfileId)) {
      onActiveProfileChange?.(next[0] ?? "");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Combobox
        items={itemIDs}
        itemToStringValue={profileLabel}
        multiple
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <ComboboxChips>
          <ComboboxValue>
            {value.map((id) => (
              <ComboboxChip key={id}>{profilesByID.get(id)?.name ?? `#${id}`}</ComboboxChip>
            ))}
          </ComboboxValue>
          <ComboboxChipsInput
            id={inputId}
            placeholder={profiles.length > 0 ? t.searchPlaceholder : t.noProfilesPlaceholder}
            disabled={disabled ? true : profilesUnavailable}
          />
        </ComboboxChips>
        <ComboboxContent portalContainer={portalContainer}>
          <ComboboxEmpty>{t.noMatchingProfiles}</ComboboxEmpty>
          <ComboboxList>
            {(id) => {
              const profile = profilesByID.get(id);
              return (
                <ComboboxItem key={id} value={id} disabled={!profile}>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">
                        {profile?.name ?? `${t.profilePrefix}${id}`}
                        {profile?.is_default ? t.activeSuffix : ""}
                      </span>
                    </span>
                    {profile && <span className="truncate text-muted-foreground text-xs">{profile.model}</span>}
                  </div>
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {value.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t.emptyChainHint}</p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {value.map((id, index) => {
            const profile = profilesByID.get(id);
            return (
              <div
                key={id}
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-2 sm:flex"
              >
                <span className="w-5 shrink-0 text-center text-muted-foreground text-xs tabular-nums">{index + 1}</span>
                <div className="min-w-0 sm:flex-1">
                  <p className="truncate font-medium text-sm">{profile?.name ?? `${t.profilePrefix}${id}`}</p>
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-muted-foreground text-xs">{profile?.model ?? t.profileUnavailable}</p>
                  </div>
                </div>
                <ProfileRoleBadge index={index} currentIndex={currentIndex} locale={locale} />
                <div className="col-span-2 col-start-2 flex shrink-0 items-center gap-1 justify-self-end sm:col-auto sm:justify-self-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.moveUpAria}
                    onClick={() => move(index, -1)}
                    disabled={disabled ? true : index === 0}
                  >
                    <ArrowUpIcon data-icon="inline-start" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.moveDownAria}
                    onClick={() => move(index, 1)}
                    disabled={disabled ? true : index === value.length - 1}
                  >
                    <ArrowDownIcon data-icon="inline-start" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.removeAria}
                    onClick={() => remove(id)}
                    disabled={disabled}
                  >
                    <XIcon data-icon="inline-start" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onActiveProfileChange && value.length > 0 && (
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="font-medium text-sm">{t.currentProfileLabel}</span>
          <Select
            value={activeProfileId && value.includes(activeProfileId) ? activeProfileId : value[0]}
            onValueChange={onActiveProfileChange}
            disabled={disabled}
          >
            <SelectTrigger size="sm" className="w-full sm:min-w-48 sm:max-w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {value.map((id) => {
                  const profile = profilesByID.get(id);
                  return (
                    <SelectItem key={id} value={id} disabled={!profile}>
                      {profile?.name ?? `${t.profilePrefix}${id}`}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
