"use client";

import * as React from "react";

import { getLocalStorageValue, setLocalStorageValue } from "@/lib/local-storage.client";

export type ChatSendMode = "enter" | "ctrl-enter";

export const CHAT_SEND_MODE_KEY = "artex_chat_send_mode";
export const DEFAULT_CHAT_SEND_MODE: ChatSendMode = "enter";

const I18N = {
  en: {
    enter: "Enter to send, Shift+Enter for new line",
    ctrlEnter: "Ctrl+Enter to send, Enter for new line",
  },
  pt: {
    enter: "Enter para enviar, Shift+Enter para nova linha",
    ctrlEnter: "Ctrl+Enter para enviar, Enter para nova linha",
  },
  zh: {
    enter: "Enter 发送，Shift+Enter 换行",
    ctrlEnter: "Ctrl+Enter 发送，Enter 换行",
  },
};

export function getChatSendModeOptions(locale: "en" | "pt" | "zh") {
  const t = I18N[locale] ?? I18N.en;
  return [
    { value: "enter" as const, label: t.enter },
    { value: "ctrl-enter" as const, label: t.ctrlEnter },
  ];
}

export const CHAT_SEND_MODE_OPTIONS = getChatSendModeOptions("en");

function parseMode(raw: string | null): ChatSendMode {
  return raw === "ctrl-enter" || raw === "enter" ? raw : DEFAULT_CHAT_SEND_MODE;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): ChatSendMode {
  return parseMode(getLocalStorageValue(CHAT_SEND_MODE_KEY));
}

function getServerSnapshot(): ChatSendMode {
  return DEFAULT_CHAT_SEND_MODE;
}

export function useChatSendMode(): ChatSendMode {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setChatSendMode(mode: ChatSendMode) {
  setLocalStorageValue(CHAT_SEND_MODE_KEY, mode);
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore
    }
  }
}

export function shouldSubmitOnKey(e: React.KeyboardEvent, mode: ChatSendMode): boolean {
  if (e.key !== "Enter") return false;
  if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return false;
  if (mode === "ctrl-enter") return e.ctrlKey || e.metaKey;
  return !e.shiftKey;
}
