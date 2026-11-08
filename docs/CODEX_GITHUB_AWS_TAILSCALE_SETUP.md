# Codex + GitHub + AWS Agent Toolkit + Tailscale setup

This guide is for the `bferreal94cc/robinhood-agent-skill` repository. It does not change broker execution permissions. **Never commit credentials, SSH private keys, AWS tokens, Tailscale auth keys, or brokerage passwords.**

## 1. Connect Codex Cloud to GitHub

1. Open [Codex](https://chatgpt.com/codex) on web/desktop and connect the GitHub account that owns this repository.
2. Authorize the repository `bferreal94cc/robinhood-agent-skill` for Codex (not just for ChatGPT's GitHub reader).
3. Create or update the Codex Cloud environment and choose this repository. Configure build tools and publish the environment.
4. Run a read-only first task: "Read AGENTS.md and summarize the repository; don't modify files." Verify Codex has access. For changes, use a new branch and PR.
5. For Codex CLI on a development computer, authenticate GitHub with `gh auth login`, clone the repository, run `codex login` if needed, and launch `codex` from its root.

References: https://help.openai.com/en/articles/20001545-using-codex-cloud and https://github.com/openai/codex

## 2. AWS Agent Toolkit (new AWS experience)

On your development computer, install AWS CLI v2 and `uv` according to https://github.com/aws/agent-toolkit-for-aws/blob/main/setup-instructions/setup.md.

```bash
aws configure set region us-east-2 --profile aws-project
aws login --region us-east-2 --profile aws-project
aws sts get-caller-identity --profile aws-project
aws configure agent-toolkit --yes --region us-east-1 --profile aws-project
aws agent-toolkit list-available-skills --region us-east-1 --profile aws-project
```

AWS Agent Toolkit service endpoint uses **us-east-1**; the AWS project stays in **us-east-2**. Add `AWS_MCP_PROXY_PROFILES=aws-project` to the `env` of each generated `aws-mcp` MCP entry without overwriting other values. For Codex plugin installation, see https://github.com/aws/agent-toolkit-for-aws and run `codex plugin marketplace add aws/agent-toolkit-for-aws`, then open `/plugins` and select `aws-core`. Preserve the existing AGENTS.md when incorporating the AWS starter rules.

## 3. Tailscale: private access between your own devices

- Install Tailscale on each device: https://tailscale.com/download
- Sign up/sign in with **the same GitHub identity** if convenient: https://tailscale.com/docs/integrations/identity/github
- On Linux, after installing the client, run `sudo tailscale up`; on macOS/Windows/iOS use the app's login and VPN prompts.
- Confirm each device in https://login.tailscale.com/admin/machines, then run `tailscale status` on a desktop/server.
- Enable MFA on your identity provider and restrict tailnet access. Don't expose a trading dashboard publicly; use private tailnet access and app authentication.
- Tailscale connects devices and internal services; it does **not** by itself grant Codex Cloud access to a laptop or connect Codex Cloud to an AWS VPC.

## 4. Optional GitHub Actions → private tailnet access

Only if a CI job needs a private service, use the official Tailscale GitHub Action with workload identity federation where supported: https://tailscale.com/docs/integrations/github/github-action.

Configure Tailscale identity and scoped tailnet ACL/grants first. Never commit keys or add an unconditional network path. Add a narrowly-scoped GitHub Actions job only after the destination, permissions, and authentication are known.

## 5. Verification checklist

- [ ] GitHub account authorizes this repository for Codex Cloud.
- [ ] Codex Cloud environment can read AGENTS.md.
- [ ] Codex CLI can open the cloned repo locally (if used).
- [ ] AWS CLI `sts get-caller-identity` succeeds under `aws-project`.
- [ ] AWS MCP server uses named profile `aws-project`.
- [ ] AWS Toolkit skill catalog is accessible.
- [ ] Tailscale devices appear online in tailnet.
- [ ] Private connectivity between intended devices is verified.
- [ ] No secrets have been committed.
- [ ] Broker execution remains disabled; notifications only.

**Status:** This file is a configuration guide, not evidence that browser authentication, device installation, CI access, or Codex Cloud authorization have completed.
