package report

import (
	"os"
	"testing"
	"time"

	"github.com/Autumn-27/artex/db"
)

// TestFindingsPDFRenderSmoke renders a representative report in both deliverable
// locales and checks the output is a non-trivial PDF.
func TestFindingsPDFRenderSmoke(t *testing.T) {
	now := time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC)
	task := int64(7)
	items := []*db.DBFinding{
		{
			ID: 1, TaskID: &task, VulnClass: "sql_injection", Name: "SQL Injection in login",
			Severity: "critical", Status: "confirmed", Summary: "Union-based SQLi in the login form.",
			Evidence: "' OR 1=1 --\nHTTP/1.1 200 OK",
			CvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", CvssScore: 9.8,
			Cwe: "CWE-89", Remediation: "Use parameterized queries (`prepared statements`) for every\nquery touching user input.", RemediationEffort: "M",
			TaskDescription: "Q4 external assessment",
		},
		{
			ID: 2, TaskID: &task, VulnClass: "missing_headers", Name: "Missing HSTS header",
			Severity: "low", Status: "fixed", Summary: " responses lack Strict-Transport-Security.",
			CvssVector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N", CvssScore: 4.2,
			Remediation: "Add `Strict-Transport-Security: max-age=63072000` at the edge proxy.", RemediationEffort: "S",
			TaskDescription: "Q4 external assessment",
		},
		{ID: 3, TaskID: &task, VulnClass: "info_leak", Severity: "medium", Status: "pending", Summary: "Verboe de versão exposto em cabeçalhos com acentuação: ção, ã, é."},
	}
	for _, loc := range []string{"en", "pt", "zh"} {
		out, err := FindingsPDF(items, now, loc)
		if err != nil {
			t.Fatalf("FindingsPDF(%q): %v", loc, err)
		}
		if len(out) < 2000 {
			t.Errorf("locale %q: suspiciously small PDF (%d bytes)", loc, len(out))
		}
		if string(out[:5]) != "%PDF-" {
			t.Errorf("locale %q: not a PDF: %q", loc, string(out[:5]))
		}
		t.Logf("locale %q rendered %d bytes", loc, len(out))
	}
	if os.Getenv("FINDINGS_PDF_DUMP") != "" {
		for _, loc := range []string{"en", "pt"} {
			out, _ := FindingsPDF(items, now, loc)
			_ = os.WriteFile("/tmp/findings-"+loc+".pdf", out, 0o644)
		}
	}
}
