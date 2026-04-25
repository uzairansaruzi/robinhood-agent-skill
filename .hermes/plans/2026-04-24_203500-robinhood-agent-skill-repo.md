# Plan: Robinhood Agent Skill — GitHub Repo

## Goal

Create a publishable GitHub repo at `uzairansar/robinhood-agent-skill` that provides a ready-to-use Robinhood portfolio advisor skill for **Hermes Agent** and **OpenClaw (Claude Code)** agents. Users should be able to point their agent at the repo URL and have robinhood-mcp set up and running with best practices in one step.

---

## Current Context

### What We Have (Local)
- **robinhood skill** at `~/.hermes/skills/finance/robinhood/` — mature skill with deep Obsidian integration, cache strategy, entity page workflows, delta computation
- **portfolio-obsidian-bridge** skill — generic Obsidian schema for any brokerage
- **refresh_cache.py** script — Python script that refreshes Robinhood data and writes Obsidian markdown snapshots
- **robinhood-mcp** (third-party, `https://github.com/verygoodplugins/robinhood-mcp`) — the MCP server itself, installable via `uvx robinhood-mcp`
- Current MCP config in `~/.hermes/config.yaml` — working config with env vars for credentials

### What the Repo Needs to Provide
1. **SKILL.md** — the agent-readable skill document (instructions, best practices, tool reference)
2. **MCP setup instructions** — config snippet for `config.yaml`
3. **Environment variable setup** — `.env.template` or instructions for `ROBINHOOD_USERNAME`, `ROBINHOOD_PASSWORD`, `ROBINHOOD_TOTP_SECRET`
4. **Cache scripts** — `refresh_cache.py` adapted for portable use (not hardcoded to one user's vault)
5. **README.md** — human-facing documentation with install methods

### Skill Installation — How It Works
- **Hermes**: `hermes skills install uzairansar/robinhood-agent-skill` — the `_candidate_identifiers` search path tries `{repo}/`, `{repo}/skills/`, `{repo}/.agents/skills/`, `{repo}/.claude/skills/`. Having `SKILL.md` at repo root works immediately.
- **OpenClaw / Claude Code**: Agents look for `.claude/skills/` or `.agents/skills/` paths. We should mirror the SKILL.md there too.
- **Tap method**: `hermes skills tap add uzairansar/robinhood-agent-skill` then `hermes skills install robinhood-agent-skill`

---

## Proposed Repo Structure

```
robinhood-agent-skill/
├── SKILL.md                          # Primary skill document (Hermes format)
├── README.md                         # GitHub landing page — intro, install, usage
├── LICENSE                           # MIT
├── .agents/
│   └── skills/
│       └── robinhood/
│           └── SKILL.md              # Symlink or copy for OpenClaw/Hermes compat
├── .claude/
│   └── skills/
│       └── robinhood/
│           └── SKILL.md              # Claude Code compat path
├── scripts/
│   ├── refresh_cache.py              # Portable cache refresh (adapts to vault config)
│   └── install.sh                    # One-click setup script
├── templates/
│   ├── config-snippet.yaml           # MCP config for hermes config.yaml
│   └── claude-desktop-config.json   # MCP config for Claude Desktop
└── .github/
    └── FUNDING.yml                   # Optional: sponsor link
```

> **Note on `.agents/skills/` and `.claude/skills/`:** Rather than symlinks (which don't work well on Windows and aren't tracked by git well), we'll have the `install.sh` script create these copies during setup. The repo itself just has the canonical `SKILL.md` at root. This is simpler and works across platforms.

---

## Step-by-Step Plan

### Step 1: Create `SKILL.md` — The Core Skill Document

**Distilled from our local robinhood skill**, but made generic and portable:

- Remove all Obsidian-specific paths (they become optional/vault-agnostic)
- Remove user-specific credentials
- Keep the best practices: cache-first strategy, entity page patterns, delta computation, research workflow
- Add MCP tool reference table (all 13 tools from robinhood-mcp)
- Add setup prerequisites (Python deps, robinhood-mcp via uvx)
- Add configuration instructions for both Hermes and OpenClaw
- Mark Obsidian integration as **optional advanced feature**
- Include environment variable template

Key sections:
1. **Prerequisites & Setup** — install robinhood-mcp, set env vars, configure MCP
2. **Available MCP Tools** — full tool reference
3. **Cache Strategy** — cache-first, stale thresholds, manual refresh
4. **Portfolio Query Workflow** — how to answer portfolio questions
5. **Research-to-Entity Workflow** — persistent research pages (generic, not Obsidian-specific)
6. **Obsidian Integration** (optional) — vault snapshots and dataview frontmatter
7. **Security & Privacy** — no credentials in skill, local-only processing
8. **Troubleshooting** — common issues (TOTP, rate limits, session tokens)

### Step 2: Create `refresh_cache.py` — Portable Cache Script

Adapt from our local script:
- Remove hardcoded Obsidian vault path (make it configurable via env var or argument)
- Remove hardcoded cache path (use `~/.hermes/data/robinhood/` as default, configurable)
- Accept `--vault-path` and `--cache-dir` arguments
- Make Obsidian writing optional (skip if vault path not configured)
- Keep the full `refresh_from_mcp_data()` function for agent-driven refresh
- Keep `refresh_via_robin_stocks()` for standalone use
- Add `--json-only` flag for non-Obsidian users

### Step 3: Create `install.sh` — One-Click Setup

Script that:
1. Checks prerequisites (Python 3, pip/uvx, Node.js/npx)
2. Installs `robinhood-mcp` via `uvx` or `pip`
3. Installs `robin_stocks` and `pyotp` for the cache script
4. Prompts for `ROBINHOOD_USERNAME` and `ROBINHOOD_PASSWORD`
5. Writes `.env` template or prints config snippet
6. Appends MCP config to `~/.hermes/config.yaml` (if Hermes detected)
7. Creates `.agents/skills/robinhood/SKILL.md` and `.claude/skills/robinhood/SKILL.md` copies
8. Tests MCP connection (`hermes mcp test robinhood`)
9. Prints success message with next steps

### Step 4: Create `templates/config-snippet.yaml`

Hermes config.yaml snippet:

```yaml
mcp_servers:
  robinhood:
    command: uvx
    args:
      - robinhood-mcp
    env:
      ROBINHOOD_USERNAME: "${ROBINHOOD_USERNAME}"
      ROBINHOOD_PASSWORD: "${ROBINHOOD_PASSWORD}"
      # ROBINHOOD_TOTP_SECRET: "${ROBINHOOD_TOTP_SECRET}"  # Uncomment if using authenticator app
    timeout: 60
    connect_timeout: 30
```

### Step 5: Create `templates/claude-desktop-config.json`

For Claude Desktop users (their native MCP config format):

```json
{
  "mcpServers": {
    "robinhood": {
      "command": "uvx",
      "args": ["robinhood-mcp"],
      "env": {
        "ROBINHOOD_USERNAME": "your_email",
        "ROBINHOOD_PASSWORD": "your_password"
      }
    }
  }
}
```

### Step 6: Create `README.md`

Sections:
1. **Overview** — what this skill does, what robinhood-mcp provides
2. **Quick Start** — one-liner install for Hermes (`hermes skills install`)
3. **Manual Setup** — step-by-step for any agent
4. **Configuration** — env vars, MCP config, troubleshooting
5. **What You Get** — 13 MCP tools for portfolio, positions, quotes, fundamentals, etc.
6. **Advanced: Cache & Obsidian** — optional persistent cache and vault integration
7. **Security** — read-only, local credentials, no data leaves your machine
8. **License** — MIT

### Step 7: Create `LICENSE`

MIT License, copyright 2025 Uzair Ansar (matching robinhood-mcp's MIT license).

### Step 8: Create `.github/FUNDING.yml`

Optional — link to GitHub Sponsors or Ko-fi.

---

## Files Likely to Change (During Implementation)

| File | Created New? | Source |
|------|-------------|--------|
| `SKILL.md` | New | Distilled from `~/.hermes/skills/finance/robinhood/SKILL.md` |
| `README.md` | New | Fresh write |
| `LICENSE` | New | MIT template |
| `scripts/refresh_cache.py` | New (adapted) | Based on local `~/.hermes/skills/finance/robinhood/scripts/refresh_cache.py` |
| `scripts/install.sh` | New | Fresh write |
| `templates/config-snippet.yaml` | New | Based on current `config.yaml` entry |
| `templates/claude-desktop-config.json` | New | Based on robinhood-mcp README |
| `.github/FUNDING.yml` | New | Optional |

---

## Tests / Validation

1. **Hermes install flow**: `hermes skills install uzairansar/robinhood-agent-skill` should resolve the SKILL.md and install correctly
2. **Tap install flow**: `hermes skills tap add uzairansar/robinhood-agent-skill` + `hermes skills install robinhood-agent-skill`
3. **OpenClaw compat**: The `.agents/skills/robinhood/SKILL.md` path created by `install.sh` should be discoverable
4. **Claude Code compat**: The `.claude/skills/robinhood/SKILL.md` path should be discoverable
5. **MCP connection**: After config, `hermes mcp test robinhood` should connect successfully
6. **Cache script portability**: `python3 scripts/refresh_cache.py --json-only` should work without Obsidian vault path
7. **No credentials in repo**: Grep for any email/password/TOTP strings — should be zero hits

---

## Risks, Tradeoffs & Open Questions

### Risks
1. **Credential exposure**: The `.env.template` must be clearly marked as `.gitignore` material. Never commit real credentials.
2. **robinhood-mcp is unofficial**: It uses `robin_stocks` which may break. Our skill doc should clearly state this and link to the upstream repo.
3. **Rate limiting**: Robinhood may rate-limit heavy usage. The skill doc should include caching guidance.
4. **TOTP complexity**: The `ROBINHOOD_TOTP_SECRET` setup is non-trivial for most users. We should document both SMS and authenticator app flows.

### Tradeoffs
1. **Obsidian integration**: Including it makes the skill longer but is our biggest differentiator. Decision: Include it as a clearly marked **optional** section, not required.
2. **Cache script**: Including `refresh_cache.py` adds Python dependency (`robin_stocks`, `pyotp`). Decision: Include it but make it fully optional — the skill works fine with just MCP tools.
3. **Single SKILL.md vs multi-file**: A single comprehensive SKILL.md is simpler for installation but longer. Decision: Main SKILL.md + linked `references/` and `scripts/` files. The SKILL.md itself stays focused.

### Open Questions (for you to decide)
1. **Repo name**: `robinhood-agent-skill` or something else (e.g., `robinhood-mcp-skill`)?
2. **Should we also publish to skills.sh (the Hermes hub)?** This would make it discoverable via `hermes skills search robinhood`.
3. **Should install.sh be interactive or purely scriptable?** I'd suggest both — interactive by default, but support `--non-interactive` with env vars for CI.
4. **Should we include an `index.json` file** for the well-known skills protocol? This enables `hermes skills install` from a custom URL.
5. **Claude Desktop config vs just Hermes/OpenClaw?** The robinhood-mcp README already shows Claude Desktop config. We should include it as a template but focus on Hermes/OpenClaw agents.

---

## Additional Items to Consider

1. **Versioning**: Add `version: 1.0.0` to SKILL.md frontmatter. As robinhood-mcp updates, we can bump.
2. **Changelog**: Include a `CHANGELOG.md` to track skill updates separately from robinhood-mcp updates.
3. **Example workflows**: Add a `references/example-workflows.md` with sample prompts like "Give me a portfolio health check", "Should I add to my NVDA position?", etc.
4. **Skill self-update**: The SKILL.md should include a note about updating — `hermes skills update` for hub-installed skills, or `git pull` for manual installs.
5. **Docker alternative**: Some users may prefer running robinhood-mcp in Docker. We could add a `docker-compose.yml` template.
6. **Testing CI**: Add a GitHub Action that validates the SKILL.md frontmatter (YAML parsing, required fields) and runs shellcheck on `install.sh`.
7. **Badges in README**: shields.io badges for MIT license, Hermes compatibility, etc.
8. **Discord/Community link**: Link to relevant community channels for support.