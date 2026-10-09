"use client";
import * as React from "react";

import { CheckIcon, CopyIcon, WrapTextIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn, copyText } from "@/lib/utils";

const I18N = {
  en: {
    empty: "(Empty)",
    disableWrap: "Disable line wrap",
    enableWrap: "Enable line wrap",
    copied: "Copied",
    copyPacket: "Copy packet",
    copiedPacketAria: "Packet copied",
    copyFailed: "Copy failed, please press Ctrl/Cmd+A to copy",
    textboxAria: "HTTP packet code",
  },
  pt: {
    empty: "(Vazio)",
    disableWrap: "Desativar quebra de linha",
    enableWrap: "Ativar quebra de linha",
    copied: "Copiado",
    copyPacket: "Copiar pacote",
    copiedPacketAria: "Pacote copiado",
    copyFailed: "Falha ao copiar, use Ctrl/Cmd+A para copiar",
    textboxAria: "Código do pacote HTTP",
  },
  zh: {
    empty: "（空）",
    disableWrap: "关闭自动换行",
    enableWrap: "开启自动换行",
    copied: "已复制",
    copyPacket: "复制报文",
    copiedPacketAria: "已复制报文",
    copyFailed: "复制失败，请使用 Ctrl/Cmd+A 后复制",
    textboxAria: "HTTP 报文代码",
  },
};

function statusTone(status: number) {
  if (status >= 500) return "text-red-500";
  if (status >= 400) return "text-amber-500";
  if (status >= 300) return "text-blue-500";
  if (status >= 200) return "text-emerald-500";
  return "text-muted-foreground";
}

function StartLine({ line }: { line: string }) {
  const response = /^(HTTP\/\S+)(\s+)(\d{3})(.*)$/.exec(line);
  if (response) {
    return (
      <>
        <span className="text-muted-foreground">{response[1]}</span>
        {response[2]}
        <span className={statusTone(Number(response[3]))}>{response[3]}</span>
        {response[4]}
      </>
    );
  }

  const request = /^([A-Z]+)(\s+)(\S+)(\s+)(HTTP\/\S+)$/.exec(line);
  if (request) {
    return (
      <>
        <span className="font-semibold text-primary">{request[1]}</span>
        {request[2]}
        <span className="text-chart-2">{request[3]}</span>
        {request[4]}
        <span className="text-muted-foreground">{request[5]}</span>
      </>
    );
  }

  return line;
}

function HeaderLine({ line }: { line: string }) {
  const separator = line.indexOf(":");
  if (separator <= 0) return line;
  return (
    <>
      <span className="text-primary">{line.slice(0, separator)}</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-chart-2">{line.slice(separator + 1)}</span>
    </>
  );
}

function JsonBody({ body }: { body: string }) {
  const tokens = React.useMemo(() => {
    const list: React.ReactNode[] = [];
    const pattern = /"([^"\\]|\\.)*"(?=\s*:)|"([^"\\]|\\.)*"|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
    let last = 0;
    let match = pattern.exec(body);
    let key = 0;
    while (match) {
      if (match.index > last) {
        list.push(body.slice(last, match.index));
      }
      const token = match[0];
      if (token.endsWith('"') && body[pattern.lastIndex] === ":") {
        list.push(
          <span key={key++} className="font-semibold text-primary">
            {token}
          </span>,
        );
      } else if (token.startsWith('"')) {
        list.push(
          <span key={key++} className="text-chart-2">
            {token}
          </span>,
        );
      } else if (token === "true" || token === "false" || token === "null") {
        list.push(
          <span key={key++} className="font-semibold text-amber-500">
            {token}
          </span>,
        );
      } else {
        list.push(
          <span key={key++} className="text-emerald-500">
            {token}
          </span>,
        );
      }
      last = pattern.lastIndex;
      match = pattern.exec(body);
    }
    if (last < body.length) {
      list.push(body.slice(last));
    }
    return list;
  }, [body]);

  return <>{tokens}</>;
}

function MarkupBody({ body }: { body: string }) {
  const tokens = React.useMemo(() => {
    const list: React.ReactNode[] = [];
    const pattern =
      /(<\/?[a-zA-Z0-9:-]+)|(\s+[a-zA-Z0-9:-]+(?==))|("([^"\\]|\\.)*"|'([^'\\]|\\.)*')|(&[a-zA-Z0-9#]+;)/g;
    let last = 0;
    let match = pattern.exec(body);
    let key = 0;
    while (match) {
      if (match.index > last) {
        list.push(body.slice(last, match.index));
      }
      const token = match[0];
      if (match[1]) {
        list.push(
          <span key={key++} className="font-semibold text-primary">
            {token}
          </span>,
        );
      } else if (match[2]) {
        list.push(
          <span key={key++} className="text-amber-500">
            {token}
          </span>,
        );
      } else if (match[3]) {
        list.push(
          <span key={key++} className="text-chart-2">
            {token}
          </span>,
        );
      } else if (match[6]) {
        list.push(
          <span key={key++} className="text-blue-500">
            {token}
          </span>,
        );
      }
      last = pattern.lastIndex;
      match = pattern.exec(body);
    }
    if (last < body.length) {
      list.push(body.slice(last));
    }
    return list;
  }, [body]);

  return <>{tokens}</>;
}

function detectBodyFormat(body: string): "json" | "markup" | "plain" {
  const trimmed = body.trim();
  if (!trimmed) return "plain";
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return "json";
  }
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return "markup";
  }
  return "plain";
}

function HighlightedBody({ body, format }: { body: string; format: "json" | "markup" | "plain" }) {
  if (format === "json") return <JsonBody body={body} />;
  if (format === "markup") return <MarkupBody body={body} />;
  return body;
}

export function HttpCodeBlock({ raw }: { raw: string }) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [wrapLines, setWrapLines] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const value = raw || t.empty;
  const lines = value.replaceAll("\r\n", "\n").split("\n");
  const separator = lines.indexOf("");
  const body = separator >= 0 ? lines.slice(separator + 1).join("\n") : "";
  const bodyFormat = detectBodyFormat(body);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyPacket = async () => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      return;
    }
    toast.error(t.copyFailed);
  };

  const renderLine = (line: string, index: number) => {
    if (index === 0) return <StartLine line={line} />;
    if (separator < 0 || index < separator) return <HeaderLine line={line} />;
    if (index === separator) return null;
    return <HighlightedBody body={line} format={bodyFormat} />;
  };

  return (
    <div className="relative mx-3 my-4 overflow-hidden rounded-md border bg-background shadow-xs">
      <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md border bg-background/95 p-0.5 shadow-xs">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={wrapLines ? t.disableWrap : t.enableWrap}
              aria-pressed={wrapLines}
              onClick={() => setWrapLines((current) => !current)}
            >
              <WrapTextIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{wrapLines ? t.disableWrap : t.enableWrap}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={copied ? t.copiedPacketAria : t.copyPacket}
              onClick={() => void copyPacket()}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{copied ? t.copied : t.copyPacket}</TooltipContent>
        </Tooltip>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: textarea cannot preserve line numbers and syntax-highlighting markup. */}
      <div
        role="textbox"
        aria-label={t.textboxAria}
        aria-multiline="true"
        aria-readonly="true"
        tabIndex={0}
        className="max-h-[calc(100vh-15rem)] min-w-0 overflow-auto bg-background py-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onKeyDown={(event) => {
          if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "a") return;
          event.preventDefault();
          const selection = window.getSelection();
          if (!selection) return;
          const range = document.createRange();
          range.selectNodeContents(event.currentTarget);
          selection.removeAllRanges();
          selection.addRange(range);
        }}
      >
        {lines.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are stable
          <div key={index} className="flex leading-5 hover:bg-muted/40">
            <span className="w-10 shrink-0 select-none pr-3 text-right text-[11px] text-muted-foreground/50 tabular-nums">
              {index + 1}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 pr-4 whitespace-pre",
                wrapLines ? "whitespace-pre-wrap break-all" : "overflow-x-auto",
              )}
            >
              {renderLine(line, index)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
