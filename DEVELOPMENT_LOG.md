## 2026-02-24 - Initial project restructuring and documentation

- Moved Vite/TS project files from `cthulhu-town-tinkerer/` into root and removed now-empty folder
- Updated `package.json`:
  - bumped version to 1.0.0
  - modified `dev` script to run on port 9091
  - added `serve` script
- Created `AGENTS.md` with development rules, server run instructions, log/changelog/git protocol
- Expanded `README.md` with professional project overview, setup, and contribution guidelines
- Added `CHANGELOG.md` with Unreleased and 1.0.0 sections
- Initialized `DEVELOPMENT_LOG.md` with this entry
- Confirmed build still works (`npm run build`)

## 2026-02-24 - Strict UI Port

- Rewrote `index.html` to exactly match the original project's DOM structure.
- Rewrote `src/style.css` to exactly match the original project's CSS styling.
- Rewrote `src/main.ts` to exactly match the original project's vanilla DOM manipulation logic, including the category grid, pagination, modal overlays, and family tree rendering.
- Fixed TypeScript errors introduced during the manual TS port of the vanilla JS logic.
- Updated `CHANGELOG.md` to reflect the strict UI port.
