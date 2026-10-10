# CIRDAN ARTEX — User & Operational Manual

**CIRDAN ARTEX** is an enterprise-grade autonomous penetration testing, adversary simulation, and security assessment platform. Engineered for red teams, cybersecurity consultancies, and DevSecOps practitioners, the platform combines goal-directed multi-agent reasoning with evidence-grade network traffic recording, strict scope enforcement, CVSS v3.1 vulnerability scoring, and client-ready reporting in Portuguese, English, and Chinese.

---

## 1. System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                   Browser Client                       │
                    │         http://localhost:3000 (Next.js 16 UI)          │
                    └───────────────────────────┬────────────────────────────┘
                                                │  HTTP /api rewrites & WebSocket
                                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         CIRDAN ARTEX Core Backend                          │
│                                (Port :8787)                                │
│                                                                            │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌───────────────┐ │
│  │   Multi-Agent Engine    │  │ Knowledge Graph & Tree│  │  CVSS & Report│ │
│  │ Planner / Worker / Auto │  │ Nodes / Edges / Scope │  │  Engine (PDF) │ │
│  └────────────┬────────────┘  └───────────┬───────────┘  └───────┬───────┘ │
│               │                           │                      │         │
│  ┌────────────┴────────────┐  ┌───────────┴───────────┐  ┌───────┴───────┐ │
│  │      Pro Tool Pack      │  │  Interception Proxy   │  │ Multi-Channel │ │
│  │ nuclei/subfinder/httpx  │  │   (Port :8788 MITM)   │  │ Notifications │ │
│  └─────────────────────────┘  └───────────────────────┘  └───────────────┘ │
└───────────────────────┬───────────────────────────┬────────────────────────┘
                        │                           │
                        ▼                           ▼
       ┌─────────────────────────────────┐   ┌───────────────────────────────┐
       │      PostgreSQL 16 Database     │   │      Local Disk Storage       │
       │    (Tasks, Findings, Graphs)    │   │  (data/traffic, SQLite, CA)   │
       └─────────────────────────────────┘   └───────────────────────────────┘
```

### Core Components

1. **Go Core Backend (`cmd/artex`)**:
   - **Listen Address**: `:8787` (Default HTTP API).
   - **Traffic Recording Proxy**: `127.0.0.1:8788` (Built-in MITM proxy with dynamic CA generation for HTTPS evidence capture).
   - **Engine Workers**: Manages concurrent autonomous agents running structured goal explorations.

2. **Next.js 16 Web Dashboard (`web/`)**:
   - **Listen Address**: `http://localhost:3000` (proxies `/api/*` to `:8787`).
   - **Tri-lingual Localization**: Seamless switching between **English (EN)**, **Português (PT)**, and **中文 (ZH)**.
   - **Real-Time Graphing**: Live force-directed attack graph and asset coverage map (`@antv/g6`).
   - **Interactive CVSS v3.1 Calculator**: Real-time vector builder with automatic severity banding.

3. **Data Storage & Persistence**:
   - **PostgreSQL 16**: Central database storing targets, assets, task graph states, findings, audit trails, and configuration.
   - **Local File Store (`data/`)**: Stores full raw HTTP request/response payloads (`data/traffic`), CA certificates, and file artifacts.

---

## 2. Multi-Agent System

CIRDAN ARTEX uses specialized AI agents that collaborate to conduct authorized security assessments:

| Agent | Role | Responsibilities |
| :--- | :--- | :--- |
| **Planner** | Strategic Director | Analyzes task goals, reads discovered assets/facts from the graph, generates test plans, and dispatches sub-goals to Worker agents. |
| **Worker** | Tactical Operator | Executes tools (HTTP requests, CLI scanners, custom scripts, browser actions), validates exploitability, and logs findings. |
| **Pentest** | Autonomous Lead | Standalone agent combining planning and execution for direct, single-target assessments. |
| **Reporter** | Assessment Synthesizer | Analyzes validated findings, deduplicates issues, links traffic evidence, derives remediation strategies, and formats client reports. |
| **Auto** | Platform Orchestrator | Handles cross-task workflows, schedule triggers, and automated environment adjustments. |

---

## 3. The Pro Tool Pack

The platform includes built-in integrations for industry-standard reconnaissance and exploitation CLI tools. When binaries are detected on `$PATH`, CIRDAN ARTEX automatically registers them into the agent tool catalog:

* **`subfinder`**: Passive subdomain discovery using dozens of external OSINT sources without sending packets to target infrastructure.
* **`httpx_probe`**: High-performance HTTP probing to identify live hosts, status codes, response titles, and technology stacks.
* **`naabu`**: Fast SYN and connect port scanning across individual hosts and CIDR ranges.
* **`katana_crawl`**: In-depth web crawling and endpoint discovery, including JavaScript-rendered links and API endpoints.
* **`nuclei_scan`**: Template-based vulnerability scanner for discovering CVEs, misconfigurations, exposed administrative interfaces, and security weaknesses.
* **`ffuf`**: High-speed fuzzing for hidden web paths, vhosts, and parameter brute-forcing.

### Installing the Pro Tool Pack
To install all required tools with one command:
```bash
./scripts/install-pro-tools.sh
```
The script compiles the tools via `go install` into `~/go/bin`. When the backend starts, it detects the installed binaries and exposes them to the agents.

---

## 4. Vulnerability & Evidence Management

### CVSS v3.1 Scoring Engine
Every finding in CIRDAN ARTEX supports complete CVSS v3.1 base metric evaluation:
* **Attack Vector (AV)**: Network (N), Adjacent (A), Local (L), Physical (P)
* **Attack Complexity (AC)**: Low (L), High (H)
* **Privileges Required (PR)**: None (N), Low (L), High (H)
* **User Interaction (UI)**: None (N), Required (R)
* **Scope (S)**: Unchanged (U), Changed (C)
* **Confidentiality Impact (C)**: High (H), Low (L), None (N)
* **Integrity Impact (I)**: High (H), Low (L), None (N)
* **Availability Impact (A)**: High (H), Low (L), None (N)

The platform derives the exact numerical score ($0.0 - 10.0$) and maps it to standardized severity bands:
- **Critical**: 9.0 – 10.0
- **High**: 7.0 – 8.9
- **Medium**: 4.0 – 6.9
- **Low**: 0.1 – 3.9
- **None**: 0.0

### CWE & Structured Remediation
Findings are tagged with standard CWE identifiers (e.g. `CWE-89` for SQL Injection, `CWE-79` for XSS) and assigned an estimated **Remediation Effort**:
- **S (Small)**: Quick configuration change or minor patch (< 1 day).
- **M (Medium)**: Code modification, architecture review, or component upgrade (1–3 days).
- **L (Large)**: Structural redesign, authorization overhaul, or extensive testing required (> 1 week).

### Traffic Evidence Linkage
Unlike generic scanners, every finding in CIRDAN ARTEX is backed by raw network traffic captured through the internal proxy (`:8788`).
Evidence is categorized by role:
- **Baseline**: Normal application behavior prior to testing.
- **Proof**: The exact exploit request/response showing the vulnerability triggering.
- **Verification**: Retest validation confirming whether the vulnerability remains active or has been resolved.

### Cross-Engagement Deduplication (`dedup_key`)
Findings automatically compute a deterministic deduplication hash based on target identity, vulnerability class, and endpoint path. If a vulnerability was already discovered in an earlier assessment, CIRDAN ARTEX detects the duplicate and tracks the resolution status over time.

---

## 5. Quickstart & Daily Operations

### Starting the Platform

#### 1. Start the PostgreSQL Container
```bash
docker run -d \
  --name artex-postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=artex \
  -e POSTGRES_PASSWORD=artex \
  -e POSTGRES_DB=artex \
  -v artex_pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

#### 2. Start the Backend & Frontend

**Background Daemons (Recommended)**:
```bash
# Start Go backend daemon
nohup ./artex -addr :8787 -proxy 127.0.0.1:8788 > artex.log 2>&1 &

# Start Next.js frontend dev server
nohup npm run dev --prefix web > web/web.log 2>&1 &
```

**Foreground Interactive Mode**:
```bash
./dev.sh
```

---

### Accessing the System
1. Open your browser at **[http://localhost:3000](http://localhost:3000)**.
2. **First-time Setup**: If the database was recently initialized, you will be redirected to the **Setup Screen** (`/setup`) to define your Administrator password (minimum 8 characters).
3. **Language Selection**: Toggle between English, Portuguese, and Chinese using the globe icon in the upper right navigation bar.

---

## 6. Step-by-Step Engagement Walkthrough

### Step 1: Configure LLM Providers
Navigate to **System Settings (`/system/settings`)** or **LLM Profiles (`/system/settings`)**:
- Add your API Key for **Anthropic** (Claude 3.5 Sonnet / Claude 3.7 Sonnet) or **OpenAI** (GPT-4o / o3-mini).
- Alternatively, connect local inference engines (Ollama, vLLM, LMStudio) using the OpenAI-compatible base URL setting.

### Step 2: Define Company & Scope
Navigate to **Assets / Targets (`/function/assets`)**:
1. Create a Company (e.g. *Cirdan Enterprise Client*).
2. Define the authorized in-scope assets:
   - Root Domains (e.g., `client.com.br`)
   - IP Addresses & CIDR ranges (e.g., `192.168.1.0/24`)
   - Web Endpoints
3. Set intercept and exclusion rules to guarantee that out-of-scope targets are strictly ignored by agents.

### Step 3: Launch an Assessment Task
Navigate to **Tasks (`/function/tasks`)** and click **New Task**:
- **Target / Goal**: Specify what you want tested (e.g., *"Perform passive and active recon on client.com.br, discover subdomains, probe web servers, and test for OWASP Top 10 vulnerabilities"*).
- **Agent Selection**: Choose `Planner + Worker` or the all-in-one `Pentest` agent.
- **Constraints**: Enable or disable safe-testing boundaries and approval requirements.

### Step 4: Live Monitoring & Human-in-the-Loop Steering
While the task is active:
- **Exploration Graph (`/function/tasks/detail?id=...&tab=graph`)**: Watch the attack tree expand in real-time as new subdomains, ports, and endpoints are discovered.
- **Transcript (`tab=sessions`)**: Review raw tool calls, command outputs, and agent reasoning.
- **Interactive Chat (`tab=chat`)**: Send steering messages directly to the running agent (e.g., *"Focus exclusively on the auth endpoint discovered at /api/v1/login"*).
- **Interceptions (`/system/intercept`)**: If an agent requests execution of an action requiring approval (e.g. submitting a destructive payload), review and approve/reject it from the dashboard.

### Step 5: Review Findings & Generate Reports
Navigate to **Findings (`/function/findings`)**:
1. Review reported vulnerabilities, verify CVSS scores, and inspect raw traffic proof.
2. Edit remediation recommendations and CWE classifications as needed.
3. Click **Export Report**:
   - Select **PDF (Branded Report)**, **CSV**, or **Markdown**.
   - Select the target language (**English** or **Português**).
   - Download the generated client-ready deliverable with full CIRDAN branding.

### Step 6: Fix Verification (Retesting)
When the client remediates a finding:
1. Open the finding detail page.
2. Click **Retest Finding**.
3. CIRDAN ARTEX dispatches a targeted verification worker to replay the test and verify whether the issue is resolved, updating the finding status to `Fixed` or `Retest Failed`.

---

## 7. Administrative & Maintenance Procedures

### Cleaning / Resetting the Database
To clear all tasks, findings, and traffic logs for a fresh engagement:

```bash
# 1. Stop the backend process
pkill -f "./artex" || true

# 2. Reset the PostgreSQL database
docker exec artex-postgres psql -U artex -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'artex' AND pid <> pg_backend_pid(); DROP DATABASE artex; CREATE DATABASE artex;"

# 3. Clear traffic index caches and stale JWT keys
rm -rf data/traffic/_blobs data/traffic/_index jwt.key
mkdir -p data/traffic/_blobs data/traffic/_index

# 4. Relaunch the backend
nohup ./artex -addr :8787 -proxy 127.0.0.1:8788 > artex.log 2>&1 &
```
Upon restart, CIRDAN ARTEX automatically runs database migrations (`schema.sql`), recreates all tables, seeds default tools/prompts, and prompts for admin password initialization.

### Emergency Password Reset
If the administrator password is forgotten, run:
```bash
./reset-password.sh
```
Follow the interactive prompt to set a new admin password directly in PostgreSQL without restarting the server.

---

## 8. Service Endpoints Summary

| Service | Address | Description |
| :--- | :--- | :--- |
| **Web Dashboard** | `http://localhost:3000` | CIRDAN ARTEX user interface |
| **Backend REST API** | `http://localhost:8787/api` | Core JSON HTTP API |
| **Health Check** | `http://localhost:8787/api/health` | Backend liveness and version status |
| **MITM Traffic Proxy** | `http://127.0.0.1:8788` | HTTP/HTTPS recording proxy |
| **PostgreSQL** | `localhost:5432` | Database (`artex` / `artex`) |
