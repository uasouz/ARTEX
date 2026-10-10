#!/usr/bin/env bash
# CIRDAN ARTEX — Pro Tool Pack Installer
# Installs professional reconnaissance & security assessment CLI tools:
# subfinder, httpx, naabu, katana, nuclei, ffuf
set -euo pipefail

info() { printf '\033[36m[*]\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m[+]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[!]\033[0m %s\n' "$*" >&2; }

info "CIRDAN ARTEX — Installing Pro Tool Pack..."

command -v go >/dev/null 2>&1 || { echo "Go 1.22+ is required to install tools. Please install Go first." >&2; exit 1; }

GOPATH="$(go env GOPATH)"
GOBIN="${GOBIN:-$GOPATH/bin}"
mkdir -p "$GOBIN"
export PATH="$GOBIN:$PATH"

install_tool() {
  local name="$1" pkg="$2"
  if command -v "$name" >/dev/null 2>&1 && [ "$name" != "httpx" ]; then
    ok "$name is already installed at $(command -v "$name")"
    return 0
  fi
  # For httpx, ensure it is ProjectDiscovery's httpx, not Python's httpx client
  if [ "$name" = "httpx" ] && [ -x "$GOBIN/httpx" ]; then
    if "$GOBIN/httpx" -version 2>&1 | grep -iq "projectdiscovery"; then
      ok "httpx (ProjectDiscovery) is already installed at $GOBIN/httpx"
      return 0
    fi
  fi

  info "Installing $name ($pkg)..."
  go install "$pkg"
  ok "$name successfully installed to $GOBIN/$name"
}

install_tool subfinder "github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest"
install_tool httpx     "github.com/projectdiscovery/httpx/cmd/httpx@latest"
install_tool naabu     "github.com/projectdiscovery/naabu/v2/cmd/naabu@latest"
install_tool katana    "github.com/projectdiscovery/katana/cmd/katana@latest"
install_tool nuclei    "github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest"
install_tool ffuf      "github.com/ffuf/ffuf/v2@latest"

echo ""
ok "Pro Tool Pack installation complete!"
info "Binaries located in: $GOBIN"
info "Restart CIRDAN ARTEX to automatically register the tools with your agents."
