# AGENTS.md

## Scope
- These rules apply to all agent work in this repository.
- If a deeper directory contains another `AGENTS.md`, the nearest one takes precedence.

## General working rules
- Make the smallest safe change that fully solves the requested task.
- Do not change unrelated code, configuration, or tests.
- Do not invent behavior, data, APIs, test outcomes, or deployment status.
- Do not introduce or expose credentials, tokens, secrets, or private keys.
- Keep security boundaries intact: no trade execution, no brokerage credentials in source, and no hidden side effects.

## Validation rules
- Run only existing project checks and tests that are relevant to changed files.
- If no automated check exists for the touched area, state that clearly.
- Report what was validated and what could not be validated.

## Data and finance safety rules
- Distinguish live, delayed, historical, replay, paper, and mock data.
- Include timestamp context and timezone when presenting time-sensitive financial data.
- If required inputs are stale, missing, or inconsistent, prefer a blocked/needs-data response over speculation.

## Git and change management
- Keep commits focused and reversible.
- Do not rewrite history unless explicitly requested.
- When asked to create a PR, include a clear summary, verification notes, and limitations.

## Worktree rules (Codex / Git worktrees)
- Assume worktree chats may run in detached `HEAD`.
- Do not assume a branch is available in two checkouts at once.
- If branch checkout conflicts occur (`already used by worktree`), use handoff or switch branches instead of forcing.
- Keep ignored local-only files out of commits; use `.worktreeinclude` patterns when local managed worktrees need selected ignored files copied.

## Escalation rules
- If requirements conflict or are underspecified in a way that changes behavior materially, ask before proceeding.
- If a requested operation is unsafe or out of policy, refuse and provide the safest alternative.
