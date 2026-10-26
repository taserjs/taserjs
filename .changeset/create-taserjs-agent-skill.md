---
"create-taserjs": minor
---

feat: install the Taser.js agent skill after scaffolding

- Add `--skill` (alias `--install-skill`), enabled by default, and `--no-skill` to skip it. `--skip-install` only skips dependencies; the agent skill still installs.
- After printing next steps, interactive mode asks once, then hands the terminal to the `skills add` CLI. Headless mode runs the non-interactive equivalent, pinned to the `taserjs` skill.
- Run the installer through the detected package manager (`npx`, `pnpm dlx`, `yarn dlx`, `bun x`) instead of a hardcoded `npx`.
- Warn and continue when the skill install fails; the scaffold result is not affected. The `skills` CLI requires Node.js 22.20 or later.
