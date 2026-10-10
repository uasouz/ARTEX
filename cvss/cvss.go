// Package cvss parses CVSS v3.0 / v3.1 base-metric vector strings and computes
// the base score and severity band. Only the eight base metrics are supported —
// temporal and environmental metrics are ignored when present.
//
// Reference: FIRST CVSS v3.1 Specification, Section 7.1 (Base Score equation).
package cvss

import (
	"fmt"
	"math"
	"strings"
)

// Severity bands returned by Vector.Severity.
const (
	SeverityNone     = "none"
	SeverityLow      = "low"
	SeverityMedium   = "medium"
	SeverityHigh     = "high"
	SeverityCritical = "critical"
)

// Vector is a parsed CVSS v3 base-metric vector.
type Vector struct {
	AV, AC, PR, UI, S, C, I, A string
}

var metricValues = map[string]map[string]bool{
	"AV": {"N": true, "A": true, "L": true, "P": true},
	"AC": {"L": true, "H": true},
	"PR": {"N": true, "L": true, "H": true},
	"UI": {"N": true, "R": true},
	"S":  {"U": true, "C": true},
	"C":  {"H": true, "L": true, "N": true},
	"I":  {"H": true, "L": true, "N": true},
	"A":  {"H": true, "L": true, "N": true},
}

// Parse accepts "CVSS:3.1/AV:.../..." or "CVSS:3.0/.../...". Temporal and
// environmental metric segments are skipped. Returns an error for unknown
// metrics, malformed pairs, or missing base metrics.
func Parse(vector string) (*Vector, error) {
	parts := strings.Split(strings.TrimSpace(vector), "/")
	if len(parts) < 2 {
		return nil, fmt.Errorf("cvss: not a vector string: %q", vector)
	}
	if prefix := parts[0]; prefix != "CVSS:3.0" && prefix != "CVSS:3.1" {
		return nil, fmt.Errorf("cvss: unsupported prefix %q (want CVSS:3.0 or CVSS:3.1)", prefix)
	}
	v := &Vector{}
	seen := map[string]string{}
	for _, part := range parts[1:] {
		if part == "" {
			continue
		}
		key, val, ok := strings.Cut(part, ":")
		if !ok {
			return nil, fmt.Errorf("cvss: malformed segment %q", part)
		}
		allowed, isBase := metricValues[key]
		if !isBase {
			continue // E/RL/RC/CR/IR/AR/MAV/… — ignored
		}
		if !allowed[val] {
			return nil, fmt.Errorf("cvss: bad value %q for metric %s", val, key)
		}
		if prev, dup := seen[key]; dup && prev != val {
			return nil, fmt.Errorf("cvss: duplicate metric %s", key)
		}
		seen[key] = val
	}
	for _, key := range []string{"AV", "AC", "PR", "UI", "S", "C", "I", "A"} {
		if _, ok := seen[key]; !ok {
			return nil, fmt.Errorf("cvss: missing base metric %s", key)
		}
	}
	v.AV, v.AC, v.PR, v.UI, v.S, v.C, v.I, v.A =
		seen["AV"], seen["AC"], seen["PR"], seen["UI"], seen["S"], seen["C"], seen["I"], seen["A"]
	return v, nil
}

var (
	avWeight = map[string]float64{"N": 0.85, "A": 0.62, "L": 0.55, "P": 0.2}
	acWeight = map[string]float64{"L": 0.77, "H": 0.44}
	prWeight = map[string][2]float64{ // [scope unchanged, scope changed]
		"N": {0.85, 0.85},
		"L": {0.62, 0.68},
		"H": {0.27, 0.5},
	}
	uiWeight  = map[string]float64{"N": 0.85, "R": 0.62}
	ciaWeight = map[string]float64{"H": 0.56, "L": 0.22, "N": 0}
)

// roundup returns the smallest number with one decimal place >= x, per the
// spec's definition (implemented with integer math to avoid float drift).
func roundup(x float64) float64 {
	i := int(math.Round(x * 100000))
	if i%10000 == 0 {
		return float64(i) / 100000
	}
	return float64(i/10000+1) / 10
}

// BaseScore computes the CVSS v3.1 base score (0.0 – 10.0).
func (v *Vector) BaseScore() float64 {
	scopeIdx := 0
	if v.S == "C" {
		scopeIdx = 1
	}
	exploitability := 8.22 * avWeight[v.AV] * acWeight[v.AC] * prWeight[v.PR][scopeIdx] * uiWeight[v.UI]
	iss := 1 - (1-ciaWeight[v.C])*(1-ciaWeight[v.I])*(1-ciaWeight[v.A])
	var impact float64
	if v.S == "U" {
		impact = 6.42 * iss
	} else {
		impact = 7.52*(iss-0.029) - 3.25*math.Pow(iss-0.02, 15)
	}
	if impact <= 0 {
		return 0
	}
	if v.S == "U" {
		return roundup(math.Min(impact+exploitability, 10))
	}
	return roundup(math.Min(1.08*(impact+exploitability), 10))
}

// Severity maps a base score onto the qualitative severity band.
func Severity(score float64) string {
	switch {
	case score <= 0:
		return SeverityNone
	case score < 4.0:
		return SeverityLow
	case score < 7.0:
		return SeverityMedium
	case score < 9.0:
		return SeverityHigh
	default:
		return SeverityCritical
	}
}

// SeverityString returns the qualitative band of this vector's base score.
func (v *Vector) SeverityString() string {
	return Severity(v.BaseScore())
}

// String renders the canonical vector form.
func (v *Vector) String() string {
	return "CVSS:3.1/AV:" + v.AV + "/AC:" + v.AC + "/PR:" + v.PR + "/UI:" + v.UI +
		"/S:" + v.S + "/C:" + v.C + "/I:" + v.I + "/A:" + v.A
}
