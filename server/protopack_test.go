package server

import (
	"encoding/json"
	"strings"
	"testing"
)

// TestProToolPackDeclarations verifies that every tool spec in proToolPack
// has a valid key, non-empty description, properties in schema, and supported agents.
func TestProToolPackDeclarations(t *testing.T) {
	if len(proToolPack) != 6 {
		t.Fatalf("expected 6 pro tools, got %d", len(proToolPack))
	}

	keys := map[string]bool{}
	for _, spec := range proToolPack {
		if keys[spec.key] {
			t.Errorf("duplicate tool key: %s", spec.key)
		}
		keys[spec.key] = true

		if spec.binary == "" {
			t.Errorf("tool %s has empty binary", spec.key)
		}
		if spec.desc == "" {
			t.Errorf("tool %s has empty description", spec.key)
		}
		if spec.exec.Command == "" {
			t.Errorf("tool %s has empty command", spec.key)
		}
		if spec.exec.TimeoutMs <= 0 {
			t.Errorf("tool %s has non-positive timeout: %d", spec.key, spec.exec.TimeoutMs)
		}
		if len(spec.agents) == 0 {
			t.Errorf("tool %s has no agents bound", spec.key)
		}

		schemaBytes, err := json.Marshal(spec.schema)
		if err != nil {
			t.Errorf("tool %s invalid schema: %v", spec.key, err)
		}
		if !hasSchemaProps(schemaBytes) {
			t.Errorf("tool %s has empty schema properties", spec.key)
		}
	}
}

// TestProToolPackCommandRendering verifies that templates render safely without
// syntax errors or leaking unreplaced {placeholder} variables when optional parameters
// are omitted.
func TestProToolPackCommandRendering(t *testing.T) {
	for _, spec := range proToolPack {
		t.Run(spec.key+"_omitted_optional", func(t *testing.T) {
			// Supply only minimal/dummy parameters
			params := map[string]any{
				"domain":   "example.com",
				"hosts":    "example.com\napi.example.com",
				"host":     "10.0.0.1",
				"target":   "https://target.local",
				"url":      "https://target.local/FUZZ",
				"wordlist": "/usr/share/wordlists/common.txt",
			}
			rendered := renderTemplate(spec.exec.Command, params, shellQuote)

			// Ensure no curly braces or unreplaced placeholders remain
			if rePlaceholder.MatchString(rendered) {
				t.Fatalf("rendered command for %s leaked placeholder:\n%s", spec.key, rendered)
			}
		})

		t.Run(spec.key+"_with_all_params", func(t *testing.T) {
			params := map[string]any{
				"domain":   "example.com",
				"hosts":    "example.com\napi.example.com",
				"host":     "10.0.0.1",
				"target":   "https://target.local",
				"url":      "https://target.local/FUZZ",
				"wordlist": "/usr/share/wordlists/common.txt",
				"ports":    "80,443,8080",
				"top":      "100",
				"depth":    "3",
				"severity": "critical,high",
				"tags":     "cve,exposure",
				"match":    "200,302",
				"extra":    "-v",
			}
			rendered := renderTemplate(spec.exec.Command, params, shellQuote)

			if rePlaceholder.MatchString(rendered) {
				t.Fatalf("rendered command for %s leaked placeholder:\n%s", spec.key, rendered)
			}
			if !strings.Contains(rendered, "'-v'") {
				t.Fatalf("rendered command for %s missing extra flag:\n%s", spec.key, rendered)
			}
		})
	}
}

// TestSeedProToolPackSafety verifies that seedProToolPack gracefully handles nil managers.
func TestSeedProToolPackSafety(t *testing.T) {
	s := &Server{}
	// Should not panic when s.m is nil
	s.seedProToolPack()

	s.m = &Manager{}
	// Should not panic when s.m.pg is nil
	s.seedProToolPack()
}
