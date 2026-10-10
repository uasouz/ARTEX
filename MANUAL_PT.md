# CIRDAN ARTEX — Manual Operacional e de Utilização

O **CIRDAN ARTEX** é uma plataforma corporativa para testes de intrusão autônomos (pentest), simulação de adversários, avaliação de vulnerabilidades e verificação de remediação impulsionada por inteligência artificial. Desenvolvido para equipes de segurança ofensiva (Red Teams), consultorias e operações DevSecOps, o sistema combina raciocínio multi-agente direcionado a objetivos com captura de tráfego de rede comprobatório, controle rigoroso de escopo, pontuação CVSS v3.1 e geração de relatórios executivos e técnicos em Português e Inglês com a marca da CIRDAN.

---

## 1. Arquitetura da Solução

```
                    ┌────────────────────────────────────────────────────────┐
                    │                  Navegador do Usuário                  │
                    │         http://localhost:3000 (Interface Next.js 16)   │
                    └───────────────────────────┬────────────────────────────┘
                                                │  Chamadas HTTP /api e WebSockets
                                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         Backend Central CIRDAN ARTEX                       │
│                                (Porta :8787)                               │
│                                                                            │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌───────────────┐ │
│  │   Motor Multi-Agente    │  │ Grafo de Conhecimento │  │ Motor de CVSS │ │
│  │ Planner / Worker / Auto │  │ Nós / Arestas / Escopo│  │ e Relatórios  │ │
│  └────────────┬────────────┘  └───────────┬───────────┘  └───────┬───────┘ │
│               │                           │                      │         │
│  ┌────────────┴────────────┐  ┌───────────┴───────────┐  ┌───────┴───────┐ │
│  │      Pro Tool Pack      │  │  Proxy de Interceptação│  │ Notificações  │ │
│  │ nuclei/subfinder/httpx  │  │   (Porta :8788 MITM)  │  │ Multi-Canal   │ │
│  └─────────────────────────┘  └───────────────────────┘  └───────────────┘ │
└───────────────────────┬───────────────────────────┬────────────────────────┘
                        │                           │
                        ▼                           ▼
       ┌─────────────────────────────────┐   ┌───────────────────────────────┐
       │     Banco de Dados PostgreSQL   │   │     Armazenamento Local       │
       │   (Tarefas, Vulnerabilidades)   │   │  (data/traffic, SQLite, CA)   │
       └─────────────────────────────────┘   └───────────────────────────────┘
```

### Componentes Principais

1. **Backend em Go (`cmd/artex`)**:
   - **API HTTP**: Porta `:8787` (Serviços REST e orquestração).
   - **Proxy de Tráfego**: `127.0.0.1:8788` (Proxy MITM com geração dinâmica de certificados CA para registrar evidências HTTPS).
   - **Orquestrador de Agentes**: Executa tarefas de exploração paralela respeitando regras estritas de escopo.

2. **Frontend Next.js 16 (`web/`)**:
   - **Acesso Web**: `http://localhost:3000` (com redirecionamento automático para a API).
   - **Suporte Tri-idioma**: Alternância instantânea entre **Português (PT)**, **Inglês (EN)** e **Chinês (ZH)**.
   - **Grafo em Tempo Real**: Visualização dinâmica da árvore de ataque e cobertura de ativos (`@antv/g6`).
   - **Calculadora Interativa de CVSS v3.1**: Cálculo imediato de severidade baseado nas métricas do FIRST.

3. **Camada de Dados**:
   - **PostgreSQL 16**: Armazena ativos, empresas, tarefas, vulnerabilidades, histórico de auditoria e configurações.
   - **Disco Local (`data/`)**: Armazena payloads brutos de requisição e resposta HTTP (`data/traffic`), certificados e artefatos.

---

## 2. Agentes de Inteligência Artificial

| Agente | Perfil | Atribuições |
| :--- | :--- | :--- |
| **Planner** | Estrategista | Avalia o objetivo da tarefa, mapeia vetores de ataque, cria o plano e delega submetas aos Workers. |
| **Worker** | Operador Técnico | Executa ferramentas (HTTP, CLI, scripts Python, navegador), valida exploração e registra falhas encontradas. |
| **Pentest** | Especialista Autônomo | Agente unificado para engajamentos diretos, unindo planejamento e execução prática. |
| **Reporter** | Redator Técnico | Sintetiza vulnerabilidades, vincula evidências de tráfego, calcula remediação e gera relatórios em PDF. |
| **Auto** | Orquestrador | Coordena automações contínuas, rotinas agendadas e adaptações da plataforma. |

---

## 3. Pro Tool Pack (Ferramentas Profissionais Integradas)

O sistema integra nativamente as principais ferramentas de segurança ofensiva de linha de comando:

* **`subfinder`**: Enumeração passiva de subdomínios via fontes públicas de inteligência (sem envio de pacotes ao alvo).
* **`httpx_probe`**: Sonda HTTP rápida para validação de hosts ativos, códigos de status, títulos e tecnologias.
* **`naabu`**: Varredura rápida de portas TCP em hosts individuais ou blocos CIDR.
* **`katana_crawl`**: Rastreamento profundo de aplicações web, links em JavaScript e rotas de API.
* **`nuclei_scan`**: Verificador baseado em templates para identificação de CVEs conhecidos e erros de configuração.
* **`ffuf`**: Fuzzing de alta velocidade para descoberta de diretórios ocultos, arquivos sensíveis e parâmetros.

### Instalação Automática
Para instalar as ferramentas profissionais em seu ambiente:
```bash
./scripts/install-pro-tools.sh
```

---

## 4. Gestão de Vulnerabilidades e Evidências

### Calculadora e Classificação CVSS v3.1
Cada falha registrada permite configurar o vetor completo de base do CVSS v3.1:
- **AV (Attack Vector)**, **AC (Attack Complexity)**, **PR (Privileges Required)**, **UI (User Interaction)**, **Scope (S)**, **Confidencialidade (C)**, **Integridade (I)** e **Disponibilidade (A)**.
- O sistema calcula automaticamente a nota de $0.0$ a $10.0$ e atribui a faixa correspondente (**Crítica**, **Alta**, **Média**, **Baixa**).

### Mapeamento CWE e Estimativa de Esforço
- Associação direta aos padrões do setor (ex.: `CWE-89` para SQL Injection, `CWE-79` para XSS).
- Estimativa do esforço de correção:
  - **S (Pequeno)**: Ajuste simples de configuração (< 1 dia).
  - **M (Médio)**: Alteração de código ou atualização de biblioteca (1 a 3 dias).
  - **L (Grande)**: Redesenho arquitetural ou mudança profunda (> 1 semana).

### Evidências de Tráfego Conectadas
Toda vulnerabilidade vincula requisições e respostas capturadas pelo proxy interno (`:8788`), categorizadas como:
- **Baseline**: Comportamento padrão antes do teste.
- **Proof**: Prova de conceito demonstrando a exploração bem-sucedida.
- **Verification**: Evidência do reteste confirmando se a falha ainda persiste ou foi corrigida.

### Deduplicação Automática (`dedup_key`)
Garante que falhas recorrentes em um mesmo cliente sejam agrupadas logicamente entre diferentes baterias de testes.

---

## 5. Como Iniciar e Operar Localmente

### 1. Iniciar Banco de Dados (PostgreSQL)
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

### 2. Iniciar Serviços
```bash
# Iniciar backend em segundo plano
nohup ./artex -addr :8787 -proxy 127.0.0.1:8788 > artex.log 2>&1 &

# Iniciar frontend em segundo plano
nohup npm run dev --prefix web > web/web.log 2>&1 &
```

### 3. Primeiro Acesso
1. Acesse **[http://localhost:3000](http://localhost:3000)** no navegador.
2. Defina sua senha inicial de administrador na tela de configuração.
3. Alterne o idioma para **Português** no ícone de globo no canto superior direito.

---

## 6. Procedimento para Limpeza / Reset do Banco de Dados

Quando desejar limpar todas as tarefas de teste, vulnerabilidades e registros para iniciar um novo engajamento limpo:

```bash
# 1. Parar o executável do backend
pkill -f "./artex" || true

# 2. Recriar o banco de dados no PostgreSQL
docker exec artex-postgres psql -U artex -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'artex' AND pid <> pg_backend_pid(); DROP DATABASE artex; CREATE DATABASE artex;"

# 3. Limpar índices de tráfego e chaves antigas
rm -rf data/traffic/_blobs data/traffic/_index jwt.key
mkdir -p data/traffic/_blobs data/traffic/_index

# 4. Relançar o backend
nohup ./artex -addr :8787 -proxy 127.0.0.1:8788 > artex.log 2>&1 &
```
Ao iniciar, o ARTEX recria todas as tabelas vazias automaticamente, e a tela inicial volta ao estado de configuração de nova senha.

---

## 7. Redefinição de Senha de Emergência

Caso a senha do administrador seja esquecida:
```bash
./reset-password.sh
```
O script interativo permite definir uma nova senha no banco de dados imediatamente.
