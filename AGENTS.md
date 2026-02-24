# AGENTS.md

This document provides guidelines for automated agents (including Copilot) working on the **Call‑of‑Cthulhu‑Town‑Tinkerer** repository. It combines project‑specific run instructions with general development/logging/changelog/git protocols adapted from the Dicefiles project.

---

## Runtime Environment

- This project is a simple Vite/TypeScript application; Node 20 is preferred but not strictly required. If using multiple Node versions, make sure to call the explicit Node 20 executable when running build/start commands:
  ```bash
  /home/apoapostolov/.nvm/versions/node/v20.20.0/bin/node
  ```
- Always verify the Node version with `node -v` at the start of any build or run script.

## Local Development Server

A hot–reloading development server is available on port **9091**.

- Start the dev server with:
  ```bash
  npm install             # first time only
  npm run dev             # runs vite --port 9091
  ```
- After building, you can preview the production bundle with `npm run serve` (which uses `vite preview`).

To confirm the server is running:

```bash
ss -ltnp | grep 9091
curl -I http://127.0.0.1:9091/ | head -1
```

If you rebuild and need to restart, stop any existing process on 9091 before relaunching.

## Documentation Workflows

### DEVELOPMENT_LOG.md

Every response that changes source code, UX, or behaviour **must** update `DEVELOPMENT_LOG.md` as the final step. See that file for full instructions; in brief:

1. Add a dated header (`## YYYY-MM-DD - Summary`) for each response.
2. List changed files with one-line summaries of what and why.
3. Record changelog updates under `CHANGELOG.md` if applicable.

Failure to keep the development log in sync is considered a bug.

### CHANGELOG.md

Maintain a professional changelog with an `Unreleased` section. When bumping versions, move entries into a new heading (e.g. `## 1.0.0`) and follow the [Changelog Update Procedure](#changelog-update-procedure) below.

_User-visible features, fixes, and other noteworthy changes belong here._

### Git Protocol

- Commit messages should follow conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.).
- Tag releases and create GitHub releases when a version is published.
- Keep the repository clean of build artefacts; commit only source, config, docs, and generated logs as needed.

## Professional README

The project README (**README.md**) should provide a polished overview, installation instructions, usage examples, and any relevant badges.
Ensure the README reflects the current `package.json` dependencies.

## General Agent Rules

- Do not introduce `PX`/`P0` comments in source code files. Use `DEVELOPMENT_LOG.md` and `TODO.md` for planning.
- Before running tests or builds, run `npm ci` or `npm install` to sync dependencies.
- When modifying dependencies, update `package.json`, `README.md` package table, and `DEVELOPMENT_LOG.md` in one response.

_(Most of the above sections are adapted from the Dicefiles AGENTS.md and streamlined for this smaller project.)_

---

For any questions about agent behaviour, consult the main workspace documentation or ask the human operator.
