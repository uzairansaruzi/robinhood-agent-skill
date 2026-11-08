# Repository custom instructions for GitHub Copilot

- Follow `AGENTS.md` as the primary agent policy for this repository.
- Prefer minimal, scoped changes that fully solve the request.
- Preserve existing architecture boundaries between data access, strategy logic, storage, and UI layers.
- Never commit secrets or credentials. If a value looks sensitive, replace with placeholders and flag it.
- Do not claim a fix, integration, or backtest result unless evidence is available in code, logs, or test output.
- Run the repository's existing validation steps relevant to changed files and summarize outcomes.
- If no suitable validation exists, explicitly state that gap.
- Keep financial-data behavior explicit: note data freshness/timezone and avoid speculative outputs when required inputs are stale or missing.
- Keep pull requests reviewable: include a concise summary, validation notes, and known limitations.
- For worktree-based sessions, avoid assumptions that the same branch can be checked out simultaneously in Local and Worktree.
