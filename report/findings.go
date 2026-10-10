package report

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"path"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/Autumn-27/artex/db"
)

// sortFindingsForExport sorts findings by severity rank (desc) and creation time (desc).
func sortFindingsForExport(fs []*db.DBFinding) {
	sort.SliceStable(fs, func(i, j int) bool {
		ri, rj := sevRank[fs[i].Severity], sevRank[fs[j].Severity]
		if ri != rj {
			return ri < rj
		}
		return fs[i].CreatedAt.After(fs[j].CreatedAt)
	})
}

func getLocale(locales []string) string {
	if len(locales) == 0 {
		return "en"
	}
	l := strings.ToLower(strings.TrimSpace(locales[0]))
	if l == "pt" || l == "zh" {
		return l
	}
	return "en"
}

// findingTitle returns human readable title for the finding.
func findingTitle(f *db.DBFinding, locale string) string {
	fallback := "Uncategorized"
	if locale == "pt" {
		fallback = "Sem categoria"
	} else if locale == "zh" {
		fallback = "未分类"
	}
	return nz(f.Name, nz(f.VulnClass, fallback))
}

// findingScoreLines renders the CVSS / CWE metadata lines (empty when unscored).
func findingScoreLines(f *db.DBFinding, loc string) string {
	if f.CvssVector == "" && f.Cwe == "" {
		return ""
	}
	var b strings.Builder
	switch loc {
	case "pt":
		if f.CvssVector != "" {
			fmt.Fprintf(&b, "- **CVSS v3**: %.1f — `%s`\n", f.CvssScore, f.CvssVector)
		}
		if f.Cwe != "" {
			fmt.Fprintf(&b, "- **CWE**: %s\n", f.Cwe)
		}
	case "zh":
		if f.CvssVector != "" {
			fmt.Fprintf(&b, "- **CVSS v3**：%.1f — `%s`\n", f.CvssScore, f.CvssVector)
		}
		if f.Cwe != "" {
			fmt.Fprintf(&b, "- **CWE**：%s\n", f.Cwe)
		}
	default:
		if f.CvssVector != "" {
			fmt.Fprintf(&b, "- **CVSS v3**: %.1f — `%s`\n", f.CvssScore, f.CvssVector)
		}
		if f.Cwe != "" {
			fmt.Fprintf(&b, "- **CWE**: %s\n", f.Cwe)
		}
	}
	return b.String()
}

// remediationEffortLabel maps the S/M/L band to a localized phrase.
func remediationEffortLabel(effort, loc string) string {
	switch effort {
	case "S":
		if loc == "pt" {
			return "Esforço estimado: pequeno"
		}
		if loc == "zh" {
			return "预估工作量：小"
		}
		return "Estimated effort: small"
	case "M":
		if loc == "pt" {
			return "Esforço estimado: médio"
		}
		if loc == "zh" {
			return "预估工作量：中"
		}
		return "Estimated effort: medium"
	case "L":
		if loc == "pt" {
			return "Esforço estimado: grande"
		}
		if loc == "zh" {
			return "预估工作量：大"
		}
		return "Estimated effort: large"
	}
	return ""
}

// remediationMarkdown renders the structured fix-guidance block (empty when none).
func remediationMarkdown(f *db.DBFinding, loc string) string {
	r := strings.TrimSpace(f.Remediation)
	if r == "" {
		return ""
	}
	var b strings.Builder
	switch loc {
	case "pt":
		b.WriteString("## Recomendações de Correção\n\n")
	case "zh":
		b.WriteString("## 修复建议\n\n")
	default:
		b.WriteString("## Remediation Guidance\n\n")
	}
	if label := remediationEffortLabel(f.RemediationEffort, loc); label != "" {
		fmt.Fprintf(&b, "_%s_\n\n", label)
	}
	b.WriteString(r)
	b.WriteString("\n\n")
	return b.String()
}

// FindingsMarkdown renders a consolidated vulnerability report.
func FindingsMarkdown(fs []*db.DBFinding, generatedAt time.Time, locales ...string) string {
	loc := getLocale(locales)
	items := append([]*db.DBFinding(nil), fs...)
	sortFindingsForExport(items)

	var b strings.Builder

	counts := map[string]int{}
	for _, f := range items {
		counts[f.Severity]++
	}

	switch loc {
	case "pt":
		b.WriteString("# CIRDAN ARTEX — Relatório Consolidado de Vulnerabilidades\n\n")
		fmt.Fprintf(&b, "- **Gerado em**: %s\n", generatedAt.Format("2006-01-02 15:04:05"))
		fmt.Fprintf(&b, "- **Total de Vulnerabilidades**: %d\n\n", len(items))

		b.WriteString("## Resumo por Gravidade\n\n")
		b.WriteString("| Gravidade | Quantidade |\n| --- | --- |\n")
		for _, s := range []struct{ key, label string }{
			{"critical", "Crítica"}, {"high", "Alta"}, {"medium", "Média"}, {"low", "Baixa"},
		} {
			fmt.Fprintf(&b, "| %s | %d |\n", s.label, counts[s.key])
		}
		b.WriteString("\n")

		if len(items) == 0 {
			b.WriteString("_Nenhuma vulnerabilidade correspondente._\n")
			return b.String()
		}

		b.WriteString("## Detalhamento das Vulnerabilidades\n\n")
		for i, f := range items {
			fmt.Fprintf(&b, "### %d. [%s] %s\n\n", i+1, strings.ToUpper(nz(f.Severity, "INFO")), findingTitle(f, loc))
			if f.VulnClass != "" {
				fmt.Fprintf(&b, "- **Categoria**: %s\n", f.VulnClass)
			}
			fmt.Fprintf(&b, "- **Status**: %s\n", nz(f.Status, "pendente"))
			b.WriteString(findingScoreLines(f, loc))
			if desc := strings.TrimSpace(f.TaskDescription); desc != "" {
				fmt.Fprintf(&b, "- **Tarefa**: %s\n", desc)
			}
			fmt.Fprintf(&b, "- **Descoberto em**: %s\n\n", f.CreatedAt.Format("2006-01-02 15:04:05"))
			if s := strings.TrimSpace(f.Summary); s != "" {
				fmt.Fprintf(&b, "%s\n\n", s)
			}
			if e := strings.TrimSpace(f.Evidence); e != "" {
				fmt.Fprintf(&b, "**Evidência / Prova de Conceito:**\n\n```\n%s\n```\n\n", e)
			}
			if rep := strings.TrimSpace(f.Report); rep != "" {
				b.WriteString("**Relatório Detalhado:**\n\n")
				b.WriteString(rep)
				b.WriteString("\n\n")
			}
			b.WriteString(remediationMarkdown(f, loc))
			b.WriteString(findingTrafficMarkdown(f, false, loc))
			b.WriteString("---\n\n")
		}

	case "zh":
		b.WriteString("# 漏洞发现汇总报告\n\n")
		fmt.Fprintf(&b, "- **生成时间**：%s\n", generatedAt.Format("2006-01-02 15:04:05"))
		fmt.Fprintf(&b, "- **发现总数**：%d 个\n\n", len(items))

		b.WriteString("## 摘要\n\n")
		b.WriteString("| 严重等级 | 数量 |\n| --- | --- |\n")
		for _, s := range []struct{ key, label string }{
			{"critical", "严重"}, {"high", "高危"}, {"medium", "中危"}, {"low", "低危"},
		} {
			fmt.Fprintf(&b, "| %s | %d |\n", s.label, counts[s.key])
		}
		b.WriteString("\n")

		if len(items) == 0 {
			b.WriteString("_无匹配的漏洞。_\n")
			return b.String()
		}

		b.WriteString("## 漏洞明细\n\n")
		for i, f := range items {
			fmt.Fprintf(&b, "### %d. [%s] %s\n\n", i+1, strings.ToUpper(nz(f.Severity, "info")), findingTitle(f, loc))
			if f.VulnClass != "" {
				fmt.Fprintf(&b, "- **类别**：%s\n", f.VulnClass)
			}
			fmt.Fprintf(&b, "- **状态**：%s\n", nz(f.Status, "pending"))
			b.WriteString(findingScoreLines(f, loc))
			if desc := strings.TrimSpace(f.TaskDescription); desc != "" {
				fmt.Fprintf(&b, "- **所属任务**：%s\n", desc)
			}
			fmt.Fprintf(&b, "- **发现时间**：%s\n\n", f.CreatedAt.Format("2006-01-02 15:04:05"))
			if s := strings.TrimSpace(f.Summary); s != "" {
				fmt.Fprintf(&b, "%s\n\n", s)
			}
			if e := strings.TrimSpace(f.Evidence); e != "" {
				fmt.Fprintf(&b, "**证据：**\n\n```\n%s\n```\n\n", e)
			}
			if rep := strings.TrimSpace(f.Report); rep != "" {
				b.WriteString("**详细报告：**\n\n")
				b.WriteString(rep)
				b.WriteString("\n\n")
			}
			b.WriteString(remediationMarkdown(f, loc))
			b.WriteString(findingTrafficMarkdown(f, false, loc))
			b.WriteString("---\n\n")
		}

	default: // "en"
		b.WriteString("# CIRDAN ARTEX — Consolidated Vulnerability Findings Report\n\n")
		fmt.Fprintf(&b, "- **Generated At**: %s\n", generatedAt.Format("2006-01-02 15:04:05 UTC"))
		fmt.Fprintf(&b, "- **Total Findings**: %d\n\n", len(items))

		b.WriteString("## Executive Summary\n\n")
		b.WriteString("| Severity | Count |\n| --- | --- |\n")
		for _, s := range []struct{ key, label string }{
			{"critical", "Critical"}, {"high", "High"}, {"medium", "Medium"}, {"low", "Low"},
		} {
			fmt.Fprintf(&b, "| %s | %d |\n", s.label, counts[s.key])
		}
		b.WriteString("\n")

		if len(items) == 0 {
			b.WriteString("_No findings matched the criteria._\n")
			return b.String()
		}

		b.WriteString("## Vulnerability Details\n\n")
		for i, f := range items {
			fmt.Fprintf(&b, "### %d. [%s] %s\n\n", i+1, strings.ToUpper(nz(f.Severity, "INFO")), findingTitle(f, loc))
			if f.VulnClass != "" {
				fmt.Fprintf(&b, "- **Category**: %s\n", f.VulnClass)
			}
			fmt.Fprintf(&b, "- **Status**: %s\n", nz(f.Status, "pending"))
			b.WriteString(findingScoreLines(f, loc))
			if desc := strings.TrimSpace(f.TaskDescription); desc != "" {
				fmt.Fprintf(&b, "- **Assessment Task**: %s\n", desc)
			}
			fmt.Fprintf(&b, "- **Discovered At**: %s\n\n", f.CreatedAt.Format("2006-01-02 15:04:05"))
			if s := strings.TrimSpace(f.Summary); s != "" {
				fmt.Fprintf(&b, "%s\n\n", s)
			}
			if e := strings.TrimSpace(f.Evidence); e != "" {
				fmt.Fprintf(&b, "**Proof of Concept / Evidence:**\n\n```\n%s\n```\n\n", e)
			}
			if rep := strings.TrimSpace(f.Report); rep != "" {
				b.WriteString("**Detailed Report:**\n\n")
				b.WriteString(rep)
				b.WriteString("\n\n")
			}
			b.WriteString(remediationMarkdown(f, loc))
			b.WriteString(findingTrafficMarkdown(f, false, loc))
			b.WriteString("---\n\n")
		}
	}

	return b.String()
}

// SingleFindingMarkdown renders a single finding as standalone Markdown.
func SingleFindingMarkdown(f *db.DBFinding, generatedAt time.Time, locales ...string) string {
	loc := getLocale(locales)
	var b strings.Builder

	switch loc {
	case "pt":
		fmt.Fprintf(&b, "# [%s] %s\n\n", strings.ToUpper(nz(f.Severity, "INFO")), findingTitle(f, loc))
		if f.VulnClass != "" {
			fmt.Fprintf(&b, "- **Categoria**: %s\n", f.VulnClass)
		}
		fmt.Fprintf(&b, "- **Gravidade**: %s\n", nz(f.Severity, "info"))
		fmt.Fprintf(&b, "- **Status**: %s\n", nz(f.Status, "pendente"))
		b.WriteString(findingScoreLines(f, loc))
		if desc := strings.TrimSpace(f.TaskDescription); desc != "" {
			fmt.Fprintf(&b, "- **Tarefa**: %s\n", desc)
		}
		fmt.Fprintf(&b, "- **Descoberto em**: %s\n", f.CreatedAt.Format("2006-01-02 15:04:05"))
		fmt.Fprintf(&b, "- **Gerado em**: %s\n\n", generatedAt.Format("2006-01-02 15:04:05"))
		if s := strings.TrimSpace(f.Summary); s != "" {
			fmt.Fprintf(&b, "## Visão Geral\n\n%s\n\n", s)
		}
		if e := strings.TrimSpace(f.Evidence); e != "" {
			fmt.Fprintf(&b, "## Evidência / PoC\n\n```\n%s\n```\n\n", e)
		}
		if rep := strings.TrimSpace(f.Report); rep != "" {
			b.WriteString("## Relatório Detalhado\n\n")
			b.WriteString(rep)
			b.WriteString("\n")
		}
		b.WriteString(remediationMarkdown(f, loc))
		b.WriteString(findingTrafficMarkdown(f, true, loc))

	case "zh":
		fmt.Fprintf(&b, "# [%s] %s\n\n", strings.ToUpper(nz(f.Severity, "info")), findingTitle(f, loc))
		if f.VulnClass != "" {
			fmt.Fprintf(&b, "- **类别**：%s\n", f.VulnClass)
		}
		fmt.Fprintf(&b, "- **严重等级**：%s\n", nz(f.Severity, "info"))
		fmt.Fprintf(&b, "- **状态**：%s\n", nz(f.Status, "pending"))
		b.WriteString(findingScoreLines(f, loc))
		if desc := strings.TrimSpace(f.TaskDescription); desc != "" {
			fmt.Fprintf(&b, "- **所属任务**：%s\n", desc)
		}
		fmt.Fprintf(&b, "- **发现时间**：%s\n", f.CreatedAt.Format("2006-01-02 15:04:05"))
		fmt.Fprintf(&b, "- **生成时间**：%s\n\n", generatedAt.Format("2006-01-02 15:04:05"))
		if s := strings.TrimSpace(f.Summary); s != "" {
			fmt.Fprintf(&b, "## 概述\n\n%s\n\n", s)
		}
		if e := strings.TrimSpace(f.Evidence); e != "" {
			fmt.Fprintf(&b, "## 证据\n\n```\n%s\n```\n\n", e)
		}
		if rep := strings.TrimSpace(f.Report); rep != "" {
			b.WriteString("## 详细报告\n\n")
			b.WriteString(rep)
			b.WriteString("\n")
		}
		b.WriteString(remediationMarkdown(f, loc))
		b.WriteString(findingTrafficMarkdown(f, true, loc))

	default: // "en"
		fmt.Fprintf(&b, "# [%s] %s\n\n", strings.ToUpper(nz(f.Severity, "INFO")), findingTitle(f, loc))
		if f.VulnClass != "" {
			fmt.Fprintf(&b, "- **Category**: %s\n", f.VulnClass)
		}
		fmt.Fprintf(&b, "- **Severity**: %s\n", nz(f.Severity, "info"))
		fmt.Fprintf(&b, "- **Status**: %s\n", nz(f.Status, "pending"))
		b.WriteString(findingScoreLines(f, loc))
		if desc := strings.TrimSpace(f.TaskDescription); desc != "" {
			fmt.Fprintf(&b, "- **Assessment Task**: %s\n", desc)
		}
		fmt.Fprintf(&b, "- **Discovered At**: %s\n", f.CreatedAt.Format("2006-01-02 15:04:05"))
		fmt.Fprintf(&b, "- **Generated At**: %s\n\n", generatedAt.Format("2006-01-02 15:04:05 UTC"))
		if s := strings.TrimSpace(f.Summary); s != "" {
			fmt.Fprintf(&b, "## Summary\n\n%s\n\n", s)
		}
		if e := strings.TrimSpace(f.Evidence); e != "" {
			fmt.Fprintf(&b, "## Proof of Concept / Evidence\n\n```\n%s\n```\n\n", e)
		}
		if rep := strings.TrimSpace(f.Report); rep != "" {
			b.WriteString("## Detailed Security Report\n\n")
			b.WriteString(rep)
			b.WriteString("\n")
		}
		b.WriteString(remediationMarkdown(f, loc))
		b.WriteString(findingTrafficMarkdown(f, true, loc))
	}

	return b.String()
}

var unsafeFilenameChars = regexp.MustCompile(`[^\p{Han}\p{L}\p{N}._-]+`)

// FindingFilename creates a safe filename for single finding export.
func FindingFilename(f *db.DBFinding) string {
	sev := nz(f.Severity, "info")
	title := findingTitle(f, "en")
	name := fmt.Sprintf("%s_%s_#%d", sev, title, f.ID)
	name = unsafeFilenameChars.ReplaceAllString(name, "_")
	name = strings.Trim(name, "._")
	if name == "" {
		name = fmt.Sprintf("finding_%d", f.ID)
	}
	name = path.Base(name)
	if len(name) > 120 {
		name = name[:120]
	}
	return name + ".md"
}

// FindingsCSV renders findings as UTF-8 BOM CSV.
func FindingsCSV(fs []*db.DBFinding, locales ...string) []byte {
	loc := getLocale(locales)
	items := append([]*db.DBFinding(nil), fs...)
	sortFindingsForExport(items)

	var buf bytes.Buffer
	buf.WriteString("\xEF\xBB\xBF") // UTF-8 BOM
	w := csv.NewWriter(&buf)

	var headers []string
	switch loc {
	case "pt":
		headers = []string{"ID", "Título", "Categoria", "Gravidade", "CVSS", "Vetor CVSS", "CWE", "Status", "Esforço Correção", "Tarefa", "Data Descoberta", "Resumo", "Recomendação", "Qtd Evidências Tráfego", "IDs Evidências"}
	case "zh":
		headers = []string{"ID", "名称", "类别", "严重等级", "CVSS", "CVSS 向量", "CWE", "状态", "修复工作量", "所属任务", "发现时间", "概述", "修复建议", "流量证据数量", "流量证据ID"}
	default:
		headers = []string{"ID", "Title", "Category", "Severity", "CVSS", "CVSS Vector", "CWE", "Status", "Fix Effort", "Task", "Discovered At", "Summary", "Remediation", "Traffic Evidence Count", "Traffic Evidence IDs"}
	}
	_ = w.Write(headers)

	for _, f := range items {
		score := ""
		if f.CvssVector != "" {
			score = fmt.Sprintf("%.1f", f.CvssScore)
		}
		_ = w.Write([]string{
			fmt.Sprintf("%d", f.ID),
			findingTitle(f, loc),
			f.VulnClass,
			nz(f.Severity, "info"),
			score,
			f.CvssVector,
			f.Cwe,
			nz(f.Status, "pending"),
			f.RemediationEffort,
			f.TaskDescription,
			f.CreatedAt.Format("2006-01-02 15:04:05"),
			strings.TrimSpace(f.Summary),
			strings.TrimSpace(f.Remediation),
			fmt.Sprint(len(f.TrafficBindings)), findingTrafficIDs(f),
		})
	}
	w.Flush()
	return buf.Bytes()
}

func findingTrafficIDs(f *db.DBFinding) string {
	ids := make([]string, 0, len(f.TrafficBindings))
	for _, b := range f.TrafficBindings {
		ids = append(ids, fmt.Sprint(b.ID))
	}
	return strings.Join(ids, ",")
}

func findingTrafficMarkdown(f *db.DBFinding, attachments bool, locale string) string {
	stale := f.Report != "" && f.EvidenceVersion != f.ReportEvidenceVersion
	if len(f.TrafficBindings) == 0 && !stale {
		return ""
	}
	var out strings.Builder

	switch locale {
	case "pt":
		out.WriteString("\n## Evidências de Tráfego Associadas\n\n")
		fmt.Fprintf(&out, "Versão da evidência: %d; Ligações: %d.\n\n", f.EvidenceVersion, len(f.TrafficBindings))
		if stale {
			out.WriteString("⚠️ As evidências foram alteradas, relatório detalhado pendente de atualização.\n\n")
		}
		for i, b := range f.TrafficBindings {
			fmt.Fprintf(&out, "%d. **Evidência #%d · %s** — `%s %s`, Status %d\n", i+1, b.ID, b.Role, b.Snapshot.Method, strings.ReplaceAll(b.Snapshot.URL, "`", "%60"), b.Snapshot.Status)
			if b.Note != "" {
				fmt.Fprintf(&out, "   %s\n", strings.ReplaceAll(b.Note, "\n", "\n   "))
			}
			if attachments {
				fmt.Fprintf(&out, "   [Requisição HTTP](evidence/%d/%d/request.http) · [Resposta HTTP](evidence/%d/%d/response.http)\n", f.ID, b.ID, f.ID, b.ID)
			}
		}

	case "zh":
		out.WriteString("\n## 关联流量证据\n\n")
		fmt.Fprintf(&out, "证据版本：%d；绑定数量：%d。\n\n", f.EvidenceVersion, len(f.TrafficBindings))
		if stale {
			out.WriteString("证据已变更，详细报告待更新。\n\n")
		}
		for i, b := range f.TrafficBindings {
			fmt.Fprintf(&out, "%d. **证据 #%d · %s** — `%s %s`，状态码 %d\n", i+1, b.ID, b.Role, b.Snapshot.Method, strings.ReplaceAll(b.Snapshot.URL, "`", "%60"), b.Snapshot.Status)
			if b.Note != "" {
				fmt.Fprintf(&out, "   %s\n", strings.ReplaceAll(b.Note, "\n", "\n   "))
			}
			if attachments {
				fmt.Fprintf(&out, "   [请求报文](evidence/%d/%d/request.http) · [响应报文](evidence/%d/%d/response.http)\n", f.ID, b.ID, f.ID, b.ID)
			}
		}

	default: // "en"
		out.WriteString("\n## Associated Traffic Evidence\n\n")
		fmt.Fprintf(&out, "Evidence version: %d; Bindings: %d.\n\n", f.EvidenceVersion, len(f.TrafficBindings))
		if stale {
			out.WriteString("⚠️ Evidence updated; detailed report pending re-generation.\n\n")
		}
		for i, b := range f.TrafficBindings {
			fmt.Fprintf(&out, "%d. **Evidence #%d · %s** — `%s %s`, HTTP %d\n", i+1, b.ID, b.Role, b.Snapshot.Method, strings.ReplaceAll(b.Snapshot.URL, "`", "%60"), b.Snapshot.Status)
			if b.Note != "" {
				fmt.Fprintf(&out, "   %s\n", strings.ReplaceAll(b.Note, "\n", "\n   "))
			}
			if attachments {
				fmt.Fprintf(&out, "   [HTTP Request](evidence/%d/%d/request.http) · [HTTP Response](evidence/%d/%d/response.http)\n", f.ID, b.ID, f.ID, b.ID)
			}
		}
	}

	out.WriteString("\n")
	return out.String()
}
