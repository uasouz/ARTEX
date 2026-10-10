package cvss

import (
	"strings"
	"testing"
)

// Reference scores from published CVSS v3.1 example vectors (FIRST).
func TestBaseScoreReferenceVectors(t *testing.T) {
	cases := []struct {
		vector string
		score  float64
		sev    string
	}{
		{"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", 9.8, SeverityCritical},
		{"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H", 10.0, SeverityCritical},
		{"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H", 7.5, SeverityHigh},
		{"CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", 6.1, SeverityMedium},
		{"CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N", 1.6, SeverityLow},
	}
	for _, c := range cases {
		v, err := Parse(c.vector)
		if err != nil {
			t.Fatalf("Parse(%q): %v", c.vector, err)
		}
		if got := v.BaseScore(); got != c.score {
			t.Errorf("BaseScore(%q) = %.1f, want %.1f", c.vector, got, c.score)
		}
		if got := v.SeverityString(); got != c.sev {
			t.Errorf("Severity(%q) = %s, want %s", c.vector, got, c.sev)
		}
	}
}

func TestParseTolerantAndStrict(t *testing.T) {
	// v3.0 prefix, temporal/environmental metrics ignored, order-insensitive.
	v, err := Parse("CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/E:H/RL:U/RC:C/CR:H/MAV:A")
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if got := v.BaseScore(); got != 9.8 {
		t.Errorf("BaseScore = %.1f, want 9.8", got)
	}
	// Missing base metric.
	if _, err = Parse("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H"); err == nil {
		t.Error("missing A metric should fail")
	}
	// Bad value.
	if _, err = Parse("CVSS:3.1/AV:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"); err == nil {
		t.Error("bad AV value should fail")
	}
	// Bad prefix.
	if _, err = Parse("CVSS:4.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"); err == nil {
		t.Error("CVSS:4.0 prefix should fail")
	}
	// Not a vector at all.
	if _, err = Parse("high"); err == nil {
		t.Error("plain word should fail")
	}
	if !strings.Contains(ParseMust(t, "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H").String(), "AV:N") {
		t.Error("String should include metrics")
	}
}

func ParseMust(t *testing.T, vector string) *Vector {
	t.Helper()
	v, err := Parse(vector)
	if err != nil {
		t.Fatalf("Parse(%q): %v", vector, err)
	}
	return v
}
