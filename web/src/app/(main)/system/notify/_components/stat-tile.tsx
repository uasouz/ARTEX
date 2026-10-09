import { Card, CardContent } from "@/components/ui/card";

export function StatTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <Card size="sm" className="gap-1">
      <CardContent>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={`text-lg font-semibold ${tone === "red" ? "text-rose-600" : ""}`}>{value}</p>
        {hint && <p className={`text-xs ${tone === "red" ? "text-rose-600" : "text-muted-foreground"}`}>{hint}</p>}
      </CardContent>
    </Card>
  );
}

// formatBacklog 把积压毫秒数渲染成人看得懂的量级。
export function formatBacklog(ms: number, locale: "en" | "pt" | "zh" = "en"): string {
  if (!ms) return "—";
  if (ms < 60_000) {
    const s = Math.round(ms / 1000);
    return locale === "pt" ? `${s} s` : locale === "zh" ? `${s} 秒` : `${s}s`;
  }
  if (ms < 3_600_000) {
    const m = Math.round(ms / 60_000);
    return locale === "pt" ? `${m} min` : locale === "zh" ? `${m} 分钟` : `${m}m`;
  }
  const h = (ms / 3_600_000).toFixed(1);
  return locale === "pt" ? `${h} h` : locale === "zh" ? `${h} 小时` : `${h}h`;
}
