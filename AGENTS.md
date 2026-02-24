# AGENTS.md

Guidelines for automated agents (including Copilot) working on **Call‑of‑Cthulhu‑Town‑Tinkerer**.

---

## Runtime Environment

- This project is a Vite/TypeScript application. Node 20 is required.
  ```bash
  /home/apoapostolov/.nvm/versions/node/v20.20.0/bin/node
  ```
- Always verify the Node version with `node -v` at the start of any build or run script.
- Always use the explicit Node 20 binary path for build/start commands.

## Local Development Server

A hot-reloading development server runs on port **9091**.

```bash
npm install             # first time only
npm run dev             # runs vite --port 9091
```

After building, preview the production bundle with `npm run serve`.

**Verify the server is running:**

```bash
ss -ltnp | grep 9091
curl -I http://127.0.0.1:9091/ | head -1
```

If you rebuild and need to restart, stop any existing process on 9091 first:

```bash
fuser -k 9091/tcp 2>/dev/null; sleep 1 && npm run dev
```

Do not start a second instance: if `ss` shows port 9091 occupied and `curl` returns 200, skip the restart.

---

## Code Comment Standards (Mandatory)

Never reference `TODO.md` planning labels (`P0`, `P1`, `P2`, `P3`, or any `PX`/`PX-X` variant) in source code comments, CSS, or any file that is part of the compiled or served codebase.

### Why

`TODO.md` is a living planning document — it is regularly wiped and recreated. Its section headings carry no stable meaning across sessions.

### What to write instead

| ❌ Do not write             | ✅ Write instead                  |
| --------------------------- | --------------------------------- |
| `// P1 — Smart Collections` | `// Saved filters and sort state` |
| `// P2 AI Automation API`   | `// AI Automation API`            |

This rule applies to: `.ts`, `.css`, and any compiled/served file.
It does **not** apply to `DEVELOPMENT_LOG.md`, `CHANGELOG.md`, `README.md`, `AGENTS.md`, or `docs/`.

**Treat discovery of any `PX` label in a source file as a linting failure and fix it immediately.**

---

## Documentation Workflow (Mandatory)

**`DEVELOPMENT_LOG.md` must be updated as the final step of every response that changes any code, UX, or behaviour. No exceptions. If you skip this step, you have not completed the response.**

1. **Always update `DEVELOPMENT_LOG.md` as the last action in the same response.** One entry per response minimum.
2. Each entry must include: date header (`## YYYY-MM-DD - Title`), root cause if a bug fix, and a bullet list of every changed file with a one-line summary of what changed and why.
3. If the user approves implementation of a feature, add it to `CHANGELOG.md` under `Unreleased`.
4. Keep `Unreleased` entries user-facing and grouped by type (`Added`, `Changed`, `Fixed`, `Removed`).
5. Do not wait for final release to record approved feature work.

### Failure Mode: Log Debt

If `DEVELOPMENT_LOG.md` has fallen behind, backfill all missing entries immediately in the next response before doing any other work. Skipping log updates is the same class of failure as a broken build.

---

## Changelog Update Procedure (Mandatory)

When asked to update the changelog, follow this procedure exactly.

### Before writing a single line

1. Read `DEVELOPMENT_LOG.md` in full from the most recent entry backward until you reach an entry already represented in `CHANGELOG.md`.
2. Identify every entry that is **user-visible** — features the user can directly interact with, or bugs that would have been noticed during normal use.
3. Discard: internal refactors, build-system tweaks, CSS micro-polishes, code comments, and log/doc-only commits.
4. **Never add `Changed` or `Fixed` entries for features first introduced in the same version.** If a feature debuts in the current version under `Added`, every fix applied to it before release is already part of the base implementation.
5. Group surviving entries by type: `Added`, `Changed`, `Fixed`, `Removed`.
6. **Order entries within each type group by user impact — highest first.**

### Entry ordering within a version block

| Tier | Category                                  |
| ---- | ----------------------------------------- |
| 1    | Flagship / major new workflows            |
| 2    | Daily-use UX improvements                 |
| 3    | Security changes with user-visible effect |
| 4    | Performance wins users can feel           |
| 5    | Opt-in / operator-configured features     |
| 6    | Developer / operator tooling              |

### Writing style

- Write in plain English directed at the user. Lead with what the user can now _do_ or _see_.
- Keep individual bullet length to 2–4 sentences.
- Do **not** add entries for: alignment tweaks, log management, gitignore changes, AGENTS.md updates, README edits, or commits whose subject starts with `chore:`, `docs:`, or `ci:`.

### After updating the changelog

Record this event in `DEVELOPMENT_LOG.md` and commit `CHANGELOG.md` + `DEVELOPMENT_LOG.md` together:

```bash
git commit -m "docs: update changelog and log changelog-update event"
```

---

## GitHub Release Protocol (Mandatory)

Every version bump recorded in `CHANGELOG.md` under a dated heading **must** have a matching GitHub release created in the same response.

**Pre-flight checks:**

```bash
gh auth status
gh release list --repo apoapostolov/Call-of-Cthulhu-Town-Tinkerer
git tag -l | grep <version>
```

**Tag placement:** The annotated tag must point to the latest stable commit on `main` after all bug-fix follow-ups are merged. If a tag was placed too early, move it:

```bash
git tag -d <version>
git push origin :refs/tags/<version>
git tag -a <version> HEAD -m "vX.Y.Z — <summary>"
git push origin <version>
```

**Creating the release:**

```bash
gh release create <version> \
  --repo apoapostolov/Call-of-Cthulhu-Town-Tinkerer \
  --title "<version> — <short title>" \
  --notes-file /tmp/release-notes-<version>.md \
  --latest
```

Release notes must be written explicitly from `CHANGELOG.md` — never use `--generate-notes`.

---

## TODO.md Hygiene (Mandatory)

`TODO.md` is the single source of truth for remaining work. Every section must consist exclusively of actionable, trackable items.

1. **No design documents in TODO.md.** Spec text belongs in `docs/`.
2. Every section must contain at least one `- [ ]` checkbox.
3. Remove fully completed sections immediately — do not leave `- [x]` items.
4. Only assign `P0`/`P1`/`P2` labels to concrete engineering work, not aspirational brainstorming.

---

## Dependency & Documentation Sync (Mandatory)

Whenever an npm dependency is **added, removed, or replaced**, update all of the following in the same response:

1. **`package.json`** — reflects only packages actually imported.
2. **`README.md`** — package table must match `package.json`.
3. **`DEVELOPMENT_LOG.md`** — include the dependency change and reason.

---

## Professional README

**README.md** should provide a polished overview, installation instructions, usage examples, and relevant badges. Ensure it reflects the current `package.json` dependencies.

---

## General Agent Rules

- Do not introduce `PX`/`P0` comments in source code files.
- Before running tests or builds, run `npm ci` or `npm install` to sync dependencies.
- When modifying dependencies, update `package.json`, `README.md`, and `DEVELOPMENT_LOG.md` in one response.
- Keep the repository clean of build artefacts; commit only source, config, docs, and generated logs.
- Commit messages follow conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.).

---

For any questions about agent behaviour, consult the human operator.
