---
applyTo: "**/*.sh,scripts/**"
---

# Shell script change rules

- Keep scripts `set -euo pipefail` compatible unless there is a documented reason not to.
- Quote variable expansions to avoid word-splitting and globbing issues.
- Prefer idempotent setup behavior; repeated runs should not corrupt config.
- Use explicit error messages and non-zero exits for failure paths.
- Do not echo credentials or secret values to logs/stdout.
- When editing installer/setup scripts, preserve existing non-interactive behavior and flag compatibility risks.
