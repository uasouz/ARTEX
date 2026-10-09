import {
  Activity,
  Ban,
  BellRing,
  Bot,
  Brain,
  Bug,
  ClipboardList,
  FolderOpen,
  FolderSync,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Network,
  Plug,
  Radio,
  ScrollText,
  Settings2,
  ShieldAlert,
  Sparkles,
  Target,
  Terminal,
  Wrench,
} from "lucide-react";

import { en } from "@/lib/i18n/locales/en";
import type { TranslationDictionary } from "@/lib/i18n/types";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export function getSidebarItems(d: TranslationDictionary): NavGroup[] {
  return [
    {
      id: 1,
      label: d.nav.functionGroup,
      items: [
        { id: "dashboard", title: d.nav.dashboard, url: "/dashboard", icon: LayoutDashboard },
        { id: "chat", title: d.nav.chat, url: "/chat", icon: MessageSquare },
        { id: "tasks", title: d.nav.tasks, url: "/function/tasks", icon: Target },
        { id: "findings", title: d.nav.findings, url: "/function/findings", icon: Bug },
        { id: "traffic", title: d.nav.traffic, url: "/function/traffic", icon: Activity },
        { id: "commands", title: d.nav.commands, url: "/function/commands", icon: Terminal },
        { id: "llm-records", title: d.nav.llmRecords, url: "/function/llm-records", icon: Radio },
        { id: "assets", title: d.nav.assets, url: "/function/assets", icon: Network },
        { id: "sync", title: d.nav.sync, url: "/function/sync", icon: FolderSync },
        { id: "workspace", title: d.nav.workspace, url: "/function/workspace", icon: FolderOpen },
      ],
    },
    {
      id: 2,
      label: d.nav.systemGroup,
      items: [
        { id: "llm", title: d.nav.llm, url: "/system/llm", icon: Brain },
        { id: "agents", title: d.nav.agents, url: "/system/agents", icon: Bot },
        { id: "mcp", title: d.nav.mcp, url: "/system/mcp", icon: Plug },
        { id: "skills", title: d.nav.skills, url: "/system/skills", icon: Sparkles },
        { id: "tools", title: d.nav.tools, url: "/system/tools", icon: Wrench },
        { id: "notify", title: d.nav.notify, url: "/system/notify", icon: BellRing },
        { id: "intercept", title: d.nav.intercept, url: "/system/intercept", icon: ShieldAlert },
        { id: "asset-intercept", title: d.nav.assetIntercept, url: "/system/intercept/assets", icon: Ban },
        { id: "approvals", title: d.nav.approvals, url: "/system/intercept/approvals", icon: ClipboardList },
        { id: "logs", title: d.nav.logs, url: "/system/logs", icon: ScrollText },
        { id: "settings", title: d.nav.settings, url: "/system/settings", icon: Settings2 },
      ],
    },
  ];
}

// Backward-compatible default with English localized items
export const sidebarItems: NavGroup[] = getSidebarItems(en);
