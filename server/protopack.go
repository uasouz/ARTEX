package server

import (
	"encoding/json"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/Autumn-27/artex/db"
)

// Ensure ~/go/bin is in PATH so tools installed via `go install` are immediately
// discoverable by the daemon and spawned worker agents.
func init() {
	if home, err := os.UserHomeDir(); err == nil {
		goBin := filepath.Join(home, "go", "bin")
		path := os.Getenv("PATH")
		if !strings.Contains(path, goBin) {
			_ = os.Setenv("PATH", goBin+string(os.PathListSeparator)+path)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Pro Tool Pack: professional recon/scanning CLI tools exposed to agents as
// custom command tools. Each entry declares the binary to detect on PATH; the
// tool row is seeded (once — an existing row is never touched) only while the
// binary is installed, so running scripts/install-pro-tools.sh and restarting
// is all it takes to light the pack up. Uninstalling a binary leaves the row;
// the command simply fails with the shell's "not found", which the worker can
// see and route around.
// ─────────────────────────────────────────────────────────────────────────────

type proToolSpec struct {
	key    string
	binary string
	desc   string
	schema map[string]any
	exec   commandExec
	agents []string
}

const proInstallPrefix = "github.com/projectdiscovery"

var proToolPack = []proToolSpec{
	{
		key:    "subfinder",
		binary: "subfinder",
		desc: "Passive subdomain enumeration for a root domain (no packets to the target; uses passive sources). " +
			"Use FIRST when expanding a root domain into subdomains before any active scanning. " +
			"Returns one subdomain per line. Install: go install " + proInstallPrefix + "/subfinder/v2/cmd/subfinder@latest",
		schema: objSchema(map[string]any{
			"domain": strParam("根域名，例如 example.com"),
			"extra":  strParam("可选：透传给 subfinder 的额外参数（已引号安全处理）"),
		}, "domain"),
		exec: commandExec{
			Command: `extra={extra}
cmd=(subfinder -d {domain} -silent)
if [ -n "$extra" ]; then "${cmd[@]}" $extra; else "${cmd[@]}"; fi`,
			TimeoutMs: 300000,
		},
		agents: []string{"worker", "pentest"},
	},
	{
		key:    "httpx_probe",
		binary: "httpx",
		desc: "Fast HTTP probe: which hosts are alive, status code, title, tech stack, redirects. " +
			"Feed it a list of hosts/subdomains (newline-separated in `hosts`) to separate live web surface from dead names " +
			"before deeper testing. Install: go install " + proInstallPrefix + "/httpx/cmd/httpx@latest",
		schema: objSchema(map[string]any{
			"hosts": strParam("主机列表，换行分隔（域名或 host:port）"),
			"extra": strParam("可选：额外参数"),
		}, "hosts"),
		exec: commandExec{
			Command: `extra={extra}
cmd=(httpx -silent -title -tech-detect -status-code -follow-redirects)
if [ -n "$extra" ]; then
  printf '%s\n' {hosts} | "${cmd[@]}" $extra
else
  printf '%s\n' {hosts} | "${cmd[@]}"
fi`,
			TimeoutMs: 300000,
		},
		agents: []string{"worker", "pentest"},
	},
	{
		key:    "naabu",
		binary: "naabu",
		desc: "TCP/port scanner for a host or CIDR. Use `ports` for an explicit list, or `top` for a top-N sweep. " +
			"SYN mode needs root/libpcap; connect mode (the default when unprivileged) just works. " +
			"Install: go install " + proInstallPrefix + "/naabu/v2/cmd/naabu@latest (SYN scan additionally requires libpcap)",
		schema: objSchema(map[string]any{
			"host":  strParam("主机或 CIDR"),
			"ports": strParam("可选：端口列表，如 80,443,8080-8090；留空用 top-ports"),
			"top":   strParam("可选：top-N 端口数，默认 100"),
			"extra": strParam("可选：额外参数"),
		}, "host"),
		exec: commandExec{
			Command: `cmd=(naabu -host {host} -silent)
ports={ports}
[ -n "$ports" ] && cmd+=(-p "$ports")
top={top}
[ -n "$top" ] && cmd+=(-top-ports "$top")
extra={extra}
if [ -n "$extra" ]; then "${cmd[@]}" $extra; else "${cmd[@]}"; fi`,
			TimeoutMs: 600000,
		},
		agents: []string{"worker", "pentest"},
	},
	{
		key:    "katana_crawl",
		binary: "katana",
		desc: "Web crawler: discovers endpoints, links, forms and JS-referenced URLs on a page or app. " +
			"Use after httpx confirms a live origin, to map the application's real endpoint list before API recon. " +
			"Install: go install " + proInstallPrefix + "/katana/cmd/katana@latest",
		schema: objSchema(map[string]any{
			"target": strParam("起始 URL，如 https://example.com"),
			"depth":  strParam("可选：爬取深度，默认 2"),
			"extra":  strParam("可选：额外参数"),
		}, "target"),
		exec: commandExec{
			Command: `cmd=(katana -u {target} -silent)
depth={depth}
[ -n "$depth" ] && cmd+=(-d "$depth")
extra={extra}
if [ -n "$extra" ]; then "${cmd[@]}" $extra; else "${cmd[@]}"; fi`,
			TimeoutMs: 300000,
		},
		agents: []string{"worker", "pentest"},
	},
	{
		key:    "nuclei_scan",
		binary: "nuclei",
		desc: "Template-based vulnerability scanner (CVEs, misconfigs, exposed panels, takeovers — thousands of community templates). " +
			"Run per live URL; keep `severity` empty for everything, or filter to critical,high. " +
			"Treat output as LEADS, not findings: confirm via real traffic evidence before report_finding. " +
			"Install: go install " + proInstallPrefix + "/nuclei/v3/cmd/nuclei@latest",
		schema: objSchema(map[string]any{
			"target":   strParam("URL、主机或列表文件路径"),
			"severity": strParam("可选：严重度过滤，如 critical,high"),
			"tags":     strParam("可选：标签过滤，如 cve,exposure"),
			"extra":    strParam("可选：额外参数"),
		}, "target"),
		exec: commandExec{
			Command: `cmd=(nuclei -u {target} -silent)
sev={severity}
[ -n "$sev" ] && cmd+=(-severity "$sev")
tags={tags}
[ -n "$tags" ] && cmd+=(-tags "$tags")
extra={extra}
if [ -n "$extra" ]; then "${cmd[@]}" $extra; else "${cmd[@]}"; fi`,
			TimeoutMs: 900000,
		},
		agents: []string{"worker", "pentest"},
	},
	{
		key:    "ffuf",
		binary: "ffuf",
		desc: "Web fuzzer for content/param discovery and brute force (dirs, vhosts, params). " +
			"Pass FUZZ in the URL where the candidate goes; wordlists are absolute server-side paths " +
			"(install common lists under /usr/share/wordlists or similar). " +
			"Install: go install github.com/ffuf/ffuf/v2@latest",
		schema: objSchema(map[string]any{
			"url":      strParam("含 FUZZ 关键字的 URL，如 https://example.com/FUZZ"),
			"wordlist": strParam("字典文件路径"),
			"match":    strParam("可选：状态码过滤，默认 200,204,301,302,307,401,403"),
			"extra":    strParam("可选：额外参数"),
		}, "url", "wordlist"),
		exec: commandExec{
			Command: `cmd=(ffuf -u {url} -w {wordlist} -s)
match={match}
[ -n "$match" ] && cmd+=(-mc "$match")
extra={extra}
if [ -n "$extra" ]; then "${cmd[@]}" $extra; else "${cmd[@]}"; fi`,
			TimeoutMs: 600000,
		},
		agents: []string{"worker", "pentest"},
	},
}

func isBinaryInstalled(name string) bool {
	if name == "httpx" {
		// Disambiguate ProjectDiscovery httpx from Python's httpx CLI.
		if home, err := os.UserHomeDir(); err == nil {
			goHttpx := filepath.Join(home, "go", "bin", "httpx")
			if isPDHttpx(goHttpx) {
				return true
			}
		}
		if p, err := exec.LookPath("httpx"); err == nil {
			if isPDHttpx(p) {
				return true
			}
		}
		return false
	}
	if _, err := exec.LookPath(name); err == nil {
		return true
	}
	if home, err := os.UserHomeDir(); err == nil {
		if _, err := os.Stat(filepath.Join(home, "go", "bin", name)); err == nil {
			return true
		}
	}
	return false
}

func isPDHttpx(p string) bool {
	if fi, err := os.Stat(p); err != nil || fi.IsDir() {
		return false
	}
	out, err := exec.Command(p, "-version").CombinedOutput()
	if err != nil {
		return false
	}
	s := strings.ToLower(string(out))
	return strings.Contains(s, "projectdiscovery") || strings.Contains(s, "httpx")
}

// seedProToolPack inserts a custom-tool row for every pack tool whose binary is
// on PATH and that has no row yet. Existing rows (user-edited or previously
// seeded) are never touched.
func (s *Server) seedProToolPack() {
	if s.m == nil || s.m.pg == nil {
		return
	}
	installed, missing := 0, 0
	for _, spec := range proToolPack {
		if !isBinaryInstalled(spec.binary) {
			missing++
			continue
		}
		existing, err := s.m.pg.GetTool(spec.key)
		if err != nil {
			log.Printf("[propack] check %s: %v", spec.key, err)
			continue
		}
		if existing != nil {
			continue
		}
		schema, _ := json.Marshal(spec.schema)
		execJSON, _ := json.Marshal(spec.exec)
		tool := &db.Tool{
			Key:         spec.key,
			Description: spec.desc,
			Schema:      schema,
			Agents:      spec.agents,
			Enabled:     true,
			Kind:        "command",
			Exec:        execJSON,
		}
		if err := s.m.pg.CreateCustomTool(tool); err != nil {
			if !strings.Contains(err.Error(), "duplicate key") {
				log.Printf("[propack] seed %s: %v", spec.key, err)
			}
			continue
		}
		installed++
	}
	if installed > 0 {
		log.Printf("[propack] seeded %d pro tool(s) for agents", installed)
	}
	if missing > 0 {
		log.Printf("[propack] %d pro tool(s) skipped — binaries not on PATH (run scripts/install-pro-tools.sh to install)", missing)
	}
}
