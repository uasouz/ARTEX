package report

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	gofpdf "github.com/phpdave11/gofpdf"

	"github.com/Autumn-27/artex/db"
)

// FindingsPDF renders a branded consolidated vulnerability report as PDF.
//
// The PDF is a client-facing deliverable: cover header, executive summary with
// severity and CVSS distribution, and one section per finding with score,
// CWE, status, remediation guidance, and trimmed PoC evidence. Full Markdown
// reports remain in the md exports; the PDF keeps the narrative tight.
//
// Core Helvetica covers Latin-1 (English/Portuguese). A "zh" locale request
// falls back to English — CJK needs an embedded TTF, which we deliberately
// avoid to keep the binary self-contained.
func FindingsPDF(fs []*db.DBFinding, generatedAt time.Time, locales ...string) ([]byte, error) {
	loc := getLocale(locales)
	if loc == "zh" {
		loc = "en"
	}
	items := append([]*db.DBFinding(nil), fs...)
	sortFindingsForExport(items)

	t := pdfStrings(loc)
	pdf := gofpdf.New("P", "mm", "A4", "")
	p := &pdfReport{
		f:   pdf,
		t:   t,
		loc: loc,
		now: generatedAt,
		tr:  pdf.UnicodeTranslatorFromDescriptor(""),
	}

	f := p.f
	f.SetMargins(18, 20, 18)
	f.SetAutoPageBreak(true, 22)
	f.AliasNbPages("")
	f.SetFooterFunc(func() {
		f.SetY(-15)
		f.SetFont("Helvetica", "", 8)
		r, g, b := rgb(pdfGray)
		f.SetTextColor(r, g, b)
		f.CellFormat(0, 10, p.tr(fmt.Sprintf("%s  ·  %s  ·  %s / {nb}", t.brand, t.footerConfidential, generatedAt.Format("2006-01-02 15:04"))), "", 0, "L", false, 0, "")
	})
	f.SetHeaderFunc(func() {
		if f.PageNo() <= 1 {
			return
		}
		f.SetFont("Helvetica", "B", 8)
		r, g, b := rgb(pdfGray)
		f.SetTextColor(r, g, b)
		f.CellFormat(0, 6, p.tr(t.brand+"  ·  "+t.title), "", 0, "R", false, 0, "")
		f.Ln(8)
	})

	// ---- Cover header ----
	f.AddPage()
	brandR, brandG, brandB := rgb(pdfBrand)
	f.SetFillColor(brandR, brandG, brandB)
	f.Rect(0, 0, 210, 42, "F")
	f.SetXY(18, 12)
	f.SetFont("Helvetica", "B", 24)
	f.SetTextColor(255, 255, 255)
	f.CellFormat(120, 10, p.tr(t.brand), "", 0, "L", false, 0, "")
	f.SetXY(18, 24)
	f.SetFont("Helvetica", "", 10)
	f.SetTextColor(200, 214, 226)
	f.CellFormat(120, 6, p.tr(t.brandSub), "", 0, "L", false, 0, "")

	f.SetY(54)
	f.SetFont("Helvetica", "B", 18)
	r, g, b := rgb(pdfInk)
	f.SetTextColor(r, g, b)
	f.MultiCell(0, 8, p.tr(t.title), "", "L", false)
	f.Ln(1)
	f.SetFont("Helvetica", "", 10)
	r, g, b = rgb(pdfGray)
	f.SetTextColor(r, g, b)
	f.MultiCell(0, 5, p.tr(fmt.Sprintf("%s: %s\n%s: %d", t.generatedAt, generatedAt.Format("2006-01-02 15:04 UTC"), t.totalFindings, len(items))), "", "L", false)
	f.Ln(4)

	// ---- Executive summary ----
	counts := map[string]int{}
	scored, sumScore := 0, 0.0
	for _, item := range items {
		counts[item.Severity]++
		if item.CvssVector != "" {
			scored++
			sumScore += item.CvssScore
		}
	}
	p.sectionTitle(t.execSummary)
	rows := []struct{ label, key string }{
		{t.sevCritical, "critical"}, {t.sevHigh, "high"}, {t.sevMedium, "medium"}, {t.sevLow, "low"},
	}
	colW := []float64{50, 22, 40, 60}
	p.tableHeader([]string{t.colSeverity, t.colCount, t.colPct, t.colCVSSBand}, colW)
	bands := map[string]string{
		"critical": "9.0 – 10.0", "high": "7.0 – 8.9", "medium": "4.0 – 6.9", "low": "0.1 – 3.9",
	}
	total := len(items)
	for i, row := range rows {
		pct := 0.0
		if total > 0 {
			pct = 100 * float64(counts[row.key]) / float64(total)
		}
		fill := i%2 == 0
		p.tableRow([]string{row.label, fmt.Sprintf("%d", counts[row.key]), fmt.Sprintf("%.0f%%", pct), bands[row.key]}, colW, fill, severityColor(row.key))
	}
	f.Ln(2)
	f.SetFont("Helvetica", "", 9)
	r, g, b = rgb(pdfGray)
	f.SetTextColor(r, g, b)
	avg := ""
	if scored > 0 {
		avg = fmt.Sprintf("  ·  %s: %.1f (%s %d)", t.avgCVSS, sumScore/float64(scored), t.scoredOf, scored)
	}
	f.MultiCell(0, 5, p.tr(fmt.Sprintf("%s: %d%s", t.riskPosture, total, avg)), "", "L", false)
	f.Ln(4)

	if len(items) == 0 {
		f.SetFont("Helvetica", "I", 11)
		f.MultiCell(0, 6, p.tr(t.noFindings), "", "L", false)
		return p.finish()
	}

	// ---- Findings ----
	p.sectionTitle(t.findingsTitle)
	for i, item := range items {
		if f.GetY() > 250 {
			f.AddPage()
		}
		p.renderFinding(i+1, item)
	}

	// ---- Remediation overview ----
	efforts := map[string]int{}
	for _, item := range items {
		if strings.TrimSpace(item.Remediation) != "" {
			efforts[item.RemediationEffort]++
		}
	}
	if efforts["S"]+efforts["M"]+efforts["L"] > 0 {
		f.AddPage()
		p.sectionTitle(t.remediationOverview)
		p.tableHeader([]string{t.colEffort, t.colCount, t.colTypical}, []float64{50, 22, 110})
		remRows := []struct {
			key, typ string
		}{
			{"S", t.effortSTypical}, {"M", t.effortMTypical}, {"L", t.effortLTypical},
		}
		for i, row := range remRows {
			if efforts[row.key] == 0 {
				continue
			}
			p.tableRow([]string{remediationEffortLabel(row.key, loc), fmt.Sprintf("%d", efforts[row.key]), row.typ}, []float64{50, 22, 110}, i%2 == 0, pdfGray)
		}
	}

	return p.finish()
}

// ---- rendering helpers ----

type pdfReport struct {
	f   *gofpdf.Fpdf
	t   pdfDict
	loc string
	now time.Time
	// tr maps UTF-8 text onto the cp1252 range understood by the core
	// Helvetica/Courier fonts, so Portuguese accents render correctly.
	tr func(string) string
}

func (p *pdfReport) finish() ([]byte, error) {
	var buf bytes.Buffer
	if err := p.f.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (p *pdfReport) sectionTitle(s string) {
	f := p.f
	f.Ln(2)
	f.SetFont("Helvetica", "B", 13)
	r, g, b := rgb(pdfBrand)
	f.SetTextColor(r, g, b)
	f.MultiCell(0, 7, p.tr(s), "", "L", false)
	f.SetDrawColor(r, g, b)
	f.SetLineWidth(0.4)
	y := f.GetY() + 1
	f.Line(18, y, 192, y)
	f.Ln(5)
	r, g, b = rgb(pdfInk)
	f.SetTextColor(r, g, b)
}

func (p *pdfReport) tableHeader(cols []string, widths []float64) {
	f := p.f
	r, g, b := rgb(pdfBrand)
	f.SetFillColor(r, g, b)
	f.SetTextColor(255, 255, 255)
	f.SetFont("Helvetica", "B", 9)
	for i, col := range cols {
		f.CellFormat(widths[i], 7, p.tr(col), "", 0, "L", true, 0, "")
	}
	f.Ln(-1)
	r, g, b = rgb(pdfInk)
	f.SetTextColor(r, g, b)
}

func (p *pdfReport) tableRow(cols []string, widths []float64, fill bool, accent [3]int) {
	f := p.f
	if fill {
		r, g, b := rgb(pdfFill)
		f.SetFillColor(r, g, b)
	}
	f.SetFont("Helvetica", "", 9)
	for i, col := range cols {
		if i == 0 && accent != pdfGray {
			f.SetFont("Helvetica", "B", 9)
			r, g, b := rgb(accent)
			f.SetTextColor(r, g, b)
			f.CellFormat(widths[i], 6.5, p.tr(col), "", 0, "L", fill, 0, "")
			f.SetFont("Helvetica", "", 9)
			r, g, b = rgb(pdfInk)
			f.SetTextColor(r, g, b)
			continue
		}
		f.CellFormat(widths[i], 6.5, p.tr(col), "", 0, "L", fill, 0, "")
	}
	f.Ln(-1)
}

func (p *pdfReport) metaRow(label, value string) {
	if value == "" {
		return
	}
	f := p.f
	f.SetFont("Helvetica", "B", 9)
	r, g, b := rgb(pdfGray)
	f.SetTextColor(r, g, b)
	f.CellFormat(42, 5.5, p.tr(label), "", 0, "L", false, 0, "")
	f.SetFont("Helvetica", "", 9)
	r, g, b = rgb(pdfInk)
	f.SetTextColor(r, g, b)
	f.MultiCell(0, 5.5, p.tr(value), "", "L", false)
}

func (p *pdfReport) para(label, text string) {
	text = strings.TrimSpace(text)
	if text == "" {
		return
	}
	f := p.f
	f.Ln(1)
	f.SetFont("Helvetica", "B", 9)
	r, g, b := rgb(pdfInk)
	f.SetTextColor(r, g, b)
	f.MultiCell(0, 5, p.tr(label), "", "L", false)
	f.SetFont("Helvetica", "", 9)
	r, g, b = rgb(pdfBody)
	f.SetTextColor(r, g, b)
	f.MultiCell(0, 5, p.tr(pdfPlainText(text)), "", "L", false)
	f.Ln(1)
}

func (p *pdfReport) codeBlock(text string, maxRunes int) {
	text = pdfPlainText(strings.TrimSpace(text))
	if text == "" {
		return
	}
	if len([]rune(text)) > maxRunes {
		text = string([]rune(text)[:maxRunes]) + "\n…"
	}
	f := p.f
	f.Ln(1)
	r, g, b := rgb(pdfCodeBg)
	f.SetFillColor(r, g, b)
	f.SetFont("Courier", "", 8)
	r, g, b = rgb(pdfCodeInk)
	f.SetTextColor(r, g, b)
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		f.SetX(20)
		f.CellFormat(170, 4.4, p.tr(line), "", 0, "L", true, 0, "")
	}
	f.Ln(2)
	r, g, b = rgb(pdfInk)
	f.SetTextColor(r, g, b)
}

func (p *pdfReport) renderFinding(num int, item *db.DBFinding) {
	f := p.f
	sev := nz(item.Severity, "info")
	sevLabel := severityLabelPDF(sev, p.loc)
	title := findingTitle(item, p.loc)

	// Severity color chip + heading.
	sevColor := severityColor(sev)
	r, g, b := rgb(sevColor)
	f.SetFillColor(r, g, b)
	f.Rect(18, f.GetY(), 3.4, 7, "F")
	f.SetX(24)
	f.SetFont("Helvetica", "B", 11)
	f.SetTextColor(r, g, b)
	f.CellFormat(0, 7, p.tr(fmt.Sprintf("%d. [%s] %s", num, strings.ToUpper(sev), pdfPlainText(title))), "", 0, "L", false, 0, "")
	f.Ln(8)
	r, g, b = rgb(pdfInk)
	f.SetTextColor(r, g, b)

	if item.CvssVector != "" {
		p.metaRow(p.t.metaCVSS, fmt.Sprintf("%.1f — %s", item.CvssScore, item.CvssVector))
	}
	if item.Cwe != "" {
		p.metaRow(p.t.metaCWE, item.Cwe)
	}
	p.metaRow(p.t.metaSeverity, sevLabel)
	p.metaRow(p.t.metaStatus, pdfStatus(item.Status, p.loc))
	p.metaRow(p.t.metaCategory, item.VulnClass)
	if effort := remediationEffortLabel(item.RemediationEffort, p.loc); effort != "" {
		p.metaRow(p.t.metaEffort, effort)
	}
	if desc := strings.TrimSpace(item.TaskDescription); desc != "" {
		p.metaRow(p.t.metaTask, pdfPlainText(desc))
	}
	p.metaRow(p.t.metaDiscovered, item.CreatedAt.Format("2006-01-02 15:04"))
	f.Ln(1)

	p.para(p.t.lblSummary, item.Summary)
	if strings.TrimSpace(item.Remediation) != "" {
		p.para(p.t.lblRemediation, item.Remediation)
	}
	p.codeBlock(item.Evidence, 1800)
	f.Ln(3)
	f.SetDrawColor(220, 224, 229)
	f.SetLineWidth(0.2)
	y := f.GetY()
	f.Line(18, y, 192, y)
	f.Ln(4)
}

// ---- locale dictionaries ----

type pdfDict struct {
	brand, brandSub, title, footerConfidential string

	generatedAt, totalFindings, execSummary        string
	sevCritical, sevHigh, sevMedium, sevLow        string
	colSeverity, colCount, colPct, colCVSSBand     string
	riskPosture, avgCVSS, scoredOf, noFindings     string
	findingsTitle                                  string
	metaCVSS, metaCWE, metaSeverity, metaStatus    string
	metaCategory, metaEffort, metaTask             string
	metaDiscovered, lblSummary, lblRemediation     string
	remediationOverview, colEffort, colTypical     string
	effortSTypical, effortMTypical, effortLTypical string
}

func pdfStrings(loc string) pdfDict {
	if loc == "pt" {
		return pdfDict{
			brand: "CIRDAN", brandSub: "Segurança Ofensiva & Engenharia de Confiabilidade",
			title:              "Relatório Consolidado de Avaliação de Vulnerabilidades",
			footerConfidential: "Confidencial",
			generatedAt:        "Gerado em",
			totalFindings:      "Total de vulnerabilidades",
			execSummary:        "Resumo Executivo",
			sevCritical:        "Crítica", sevHigh: "Alta", sevMedium: "Média", sevLow: "Baixa",
			colSeverity: "Gravidade", colCount: "Qtd", colPct: "%", colCVSSBand: "Faixa CVSS",
			riskPosture: "Postura de risco consolidada", avgCVSS: "CVSS médio", scoredOf: "de",
			noFindings:    "Nenhuma vulnerabilidade correspondeu aos critérios de exportação.",
			findingsTitle: "Vulnerabilidades Identificadas",
			metaCVSS:      "CVSS v3", metaCWE: "CWE", metaSeverity: "Gravidade", metaStatus: "Status",
			metaCategory: "Categoria", metaEffort: "Esforço de correção", metaTask: "Tarefa",
			metaDiscovered: "Descoberta em", lblSummary: "Resumo", lblRemediation: "Recomendações de Correção",
			remediationOverview: "Visão Geral de Correções",
			colEffort:           "Esforço", colTypical: "Escopo típico",
			effortSTypical: "Ajuste de configuração / cabeçalho / flag",
			effortMTypical: "Alteração de código localizada ou atualização de dependência",
			effortLTypical: "Refatoração de arquitetura ou ciclo de correção prolongado",
		}
	}
	return pdfDict{
		brand: "CIRDAN", brandSub: "Offensive Security & Reliability Engineering",
		title:              "Consolidated Vulnerability Assessment Report",
		footerConfidential: "Confidential",
		generatedAt:        "Generated At",
		totalFindings:      "Total Findings",
		execSummary:        "Executive Summary",
		sevCritical:        "Critical", sevHigh: "High", sevMedium: "Medium", sevLow: "Low",
		colSeverity: "Severity", colCount: "Count", colPct: "%", colCVSSBand: "CVSS Band",
		riskPosture: "Consolidated risk posture", avgCVSS: "Average CVSS", scoredOf: "of",
		noFindings:    "No findings matched the export criteria.",
		findingsTitle: "Identified Vulnerabilities",
		metaCVSS:      "CVSS v3", metaCWE: "CWE", metaSeverity: "Severity", metaStatus: "Status",
		metaCategory: "Category", metaEffort: "Fix effort", metaTask: "Assessment Task",
		metaDiscovered: "Discovered At", lblSummary: "Summary", lblRemediation: "Remediation Guidance",
		remediationOverview: "Remediation Overview",
		colEffort:           "Effort", colTypical: "Typical scope",
		effortSTypical: "Configuration / header / flag adjustment",
		effortMTypical: "Localized code change or dependency upgrade",
		effortLTypical: "Architectural rework or extended fix cycle",
	}
}

// ---- small utilities ----

var (
	pdfBrand   = [3]int{15, 42, 67}
	pdfInk     = [3]int{22, 28, 36}
	pdfBody    = [3]int{44, 52, 62}
	pdfGray    = [3]int{110, 119, 129}
	pdfFill    = [3]int{245, 247, 249}
	pdfCodeBg  = [3]int{243, 245, 248}
	pdfCodeInk = [3]int{55, 63, 74}
)

// rgb unpacks a color triple for gofpdf's Set*Color calls.
func rgb(c [3]int) (int, int, int) {
	return c[0], c[1], c[2]
}

func severityColor(sev string) [3]int {
	switch sev {
	case "critical":
		return [3]int{220, 38, 38}
	case "high":
		return [3]int{234, 88, 12}
	case "medium":
		return [3]int{202, 138, 4}
	case "low":
		return [3]int{22, 163, 74}
	}
	return pdfGray
}

func severityLabelPDF(sev, loc string) string {
	if loc == "pt" {
		switch sev {
		case "critical":
			return "Crítica"
		case "high":
			return "Alta"
		case "medium":
			return "Média"
		case "low":
			return "Baixa"
		}
		return sev
	}
	return sev
}

func pdfStatus(status, loc string) string {
	if loc == "pt" {
		switch status {
		case "pending":
			return "pendente"
		case "in_progress":
			return "em análise"
		case "confirmed":
			return "confirmada"
		case "resolved":
			return "resolvida"
		case "fixed":
			return "corrigida"
		case "false_positive":
			return "falso positivo"
		case "ignored":
			return "ignorada"
		case "duplicate":
			return "duplicada"
		case "risk_accepted":
			return "risco aceito"
		}
	}
	return nz(status, "pending")
}

// pdfPlainText strips the Markdown emphasis that a PDF renders as noise.
func pdfPlainText(s string) string {
	s = strings.ReplaceAll(s, "**", "")
	s = strings.ReplaceAll(s, "__", "")
	s = strings.ReplaceAll(s, "`", "")
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		line = strings.TrimLeft(line, " \t")
		if strings.HasPrefix(line, "###") || strings.HasPrefix(line, "##") || strings.HasPrefix(line, "#") {
			lines[i] = strings.TrimLeft(strings.TrimLeft(line, "#"), " ")
		}
	}
	return strings.Join(lines, "\n")
}
