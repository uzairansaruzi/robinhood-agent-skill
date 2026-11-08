---
applyTo: "**/*.py"
---

# Python change rules

- Keep parsing, API handling, and output formatting deterministic and explicit.
- Validate external payloads defensively (missing keys, nulls, schema drift, ordering).
- Use timezone-aware timestamps for persisted or displayed time data.
- Keep retries bounded and avoid unbounded loops or silent fallback behavior.
- Avoid introducing heavy dependencies when stdlib or existing dependencies are sufficient.
- For portfolio or market logic, clearly separate data retrieval from calculations and output generation.
