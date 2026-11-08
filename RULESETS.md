# Agent Ruleset Bootstrap (Codex + Copilot)

This repository now includes the core files that GitHub Copilot and Codex read for agent behavior:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`

## Reuse this in all repositories

For every repository where you want consistent behavior:

1. Copy `AGENTS.md` to the repository root.
2. Copy `.github/copilot-instructions.md`.
3. Copy the `.github/instructions/` folder (or keep only the instruction files you need).
4. Commit those files to the default branch.

## Optional global Codex baseline

For cross-repository defaults on your machine:

- Create `~/.codex/AGENTS.md` (or `~/.codex/AGENTS.override.md` to supersede it).
- Keep global rules generic (security, validation, change scope).
- Keep repository-specific rules in each repository `AGENTS.md`.

## Worktree notes

- Worktrees are Git-based and may run in detached `HEAD`.
- A branch can only be checked out in one worktree at a time.
- Use handoff/switching rather than forcing branch reuse across Local and Worktree.
- If managed worktrees need ignored local files, add patterns to `.worktreeinclude`.
