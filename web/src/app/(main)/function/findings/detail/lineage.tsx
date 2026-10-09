"use client";

import * as React from "react";

import { ExplorationGraph } from "@/components/exploration-graph";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Edge, TaskNode } from "@/lib/types";

// FindingLineageView renders the exploration sub-graph from the task's initial
// node down to this finding's node — the attack lineage canvas scoped to this finding.
export function FindingLineageView({ findingId }: { findingId: string }) {
  const { locale } = useI18n();
  const [nodes, setNodes] = React.useState<TaskNode[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        emptyDescription:
          "Nenhuma linhagem disponível para exibição (esta vulnerabilidade não está associada a um nó de exploração ou a tarefa correspondente foi excluída).",
        emptyGraph: "Sem linhagem",
        loading: "Carregando…",
      };
    }
    if (locale === "zh") {
      return {
        emptyDescription: "无链路可展示（该漏洞未关联探索节点，或所属任务已删除）。",
        emptyGraph: "无链路",
        loading: "加载中…",
      };
    }
    return {
      emptyDescription:
        "No attack lineage to display (this finding is not associated with an exploration node, or the parent task has been deleted).",
      emptyGraph: "No lineage",
      loading: "Loading…",
    };
  }, [locale]);

  React.useEffect(() => {
    let alive = true;
    api
      .findingLineage(findingId)
      .then((g) => {
        if (!alive) return;
        setNodes(g.nodes ?? []);
        setEdges(g.edges ?? []);
      })
      .catch(() => {
        /* ignore lineage loading error */
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [findingId]);

  if (loaded && nodes.length === 0) {
    return <p className="text-muted-foreground p-6 text-sm">{strings.emptyDescription}</p>;
  }

  return (
    <ExplorationGraph
      nodes={nodes}
      edges={edges}
      className="h-[68vh]"
      emptyHint={loaded ? strings.emptyGraph : strings.loading}
    />
  );
}
