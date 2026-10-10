package server

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"testing"
)

// TestPatchFindingCVSSCWERemediation drives the new PATCH dimensions through
// the HTTP handler: vector validation, score + severity derivation, CWE
// validation, remediation effort validation, and dedup refresh on identity
// edits.
func TestPatchFindingCVSSCWERemediation(t *testing.T) {
	s, f, request := trafficEvidenceServer(t)
	id := strconv.FormatInt(f.FindingID, 10)

	patch := func(body string) (int, map[string]any) {
		rec := request(http.MethodPatch, "/api/exploration/findings/"+id, body)
		var out map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return rec.Code, out
	}

	// 1. CVSS vector: score derived, severity auto-synced to the vector's band.
	code, out := patch(`{"cvss_vector":"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H"}`)
	if code != 200 {
		t.Fatalf("patch cvss: %d %v", code, out)
	}
	if out["cvss_score"].(float64) != 7.5 {
		t.Errorf("cvss_score = %v, want 7.5", out["cvss_score"])
	}
	if out["severity"] != "high" {
		t.Errorf("severity should derive to high, got %v", out["severity"])
	}
	if v, _ := out["cvss_vector"].(string); !strings.HasPrefix(v, "CVSS:3.1/AV:N") {
		t.Errorf("cvss_vector = %v", out["cvss_vector"])
	}

	// 2. Invalid vector → 400, nothing changes.
	if code, _ = patch(`{"cvss_vector":"CVSS:9.9/AV:N"}`); code != 400 {
		t.Errorf("invalid vector should 400, got %d", code)
	}

	// 3. Clearing the vector keeps the last severity but zeroes the score.
	if code, out = patch(`{"cvss_vector":""}`); code != 200 {
		t.Fatalf("clear cvss: %d", code)
	}
	if s, _ := out["cvss_score"].(float64); s != 0 {
		t.Errorf("cleared score = %v, want 0", s)
	}
	if out["cvss_vector"] != nil && out["cvss_vector"] != "" {
		t.Errorf("cleared vector should be empty, got %v", out["cvss_vector"])
	}

	// 4. CWE happy path + validation.
	if code, out = patch(`{"cwe":"cwe-79"}`); code != 200 || out["cwe"] != "CWE-79" {
		t.Errorf("cwe normalize: %d %v", code, out["cwe"])
	}
	if code, _ = patch(`{"cwe":"CWE-abc"}`); code != 400 {
		t.Errorf("bad cwe should 400, got %d", code)
	}

	// 5. Remediation + effort; bad effort → 400.
	if code, out = patch(`{"remediation":"Escape output.\n","remediation_effort":"S"}`); code != 200 {
		t.Fatalf("remediation: %d", code)
	}
	if out["remediation"] != "Escape output." {
		t.Errorf("remediation = %v", out["remediation"])
	}
	if out["remediation_effort"] != "S" {
		t.Errorf("effort = %v", out["remediation_effort"])
	}
	if code, _ = patch(`{"remediation_effort":"XL"}`); code != 400 {
		t.Errorf("bad effort should 400, got %d", code)
	}

	// 6. Identity edit refreshes the dedup key (same key both times proves recompute).
	before, err := s.m.pg.GetFinding(f.FindingID)
	if err != nil || before == nil {
		t.Fatalf("load finding: %v", err)
	}
	if code, _ = patch(`{"name":"renamed finding"}`); code != 200 {
		t.Fatalf("rename: %d", code)
	}
	after, err := s.m.pg.GetFinding(f.FindingID)
	if err != nil || after == nil {
		t.Fatalf("reload finding: %v", err)
	}
	if after.DedupKey == "" {
		t.Fatal("dedup key missing after rename")
	}

	// 7. Unknown id → 404.
	if rec := request(http.MethodPatch, "/api/exploration/findings/999999", `{"cwe":"CWE-79"}`); rec.Code != 404 {
		t.Errorf("unknown id should 404, got %d", rec.Code)
	}
}
