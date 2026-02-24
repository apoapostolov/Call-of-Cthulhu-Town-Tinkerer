# Call of Cthulhu Town Tinkerer

A retro‑styled population generator for 1920s Call of Cthulhu campaigns.

This tool creates a realistic town population complete with family units, professions, and full Call of Cthulhu character statistics. It is implemented as a lightweight [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) web application and can run entirely in the browser.

## Features

- Seed‑based RNG for reproducible towns
- Family generation with spouses, children, and age distributions
- Profession assignment respecting historical gender ratios
- Full Cthulhu 7th‑edition stat blocks including skills, luck, and damage bonus
- Search and filter by name or profession

## Getting Started

### Prerequisites

- Node.js 20 (or later) [download via nvm](https://github.com/nvm-sh/nvm)
- npm (bundled with Node)

### Install

```bash
git clone https://github.com/apoapostolov/Call-of-Cthulhu-Town-Tinkerer.git
cd Call-of-Cthulhu-Town-Tinkerer
npm install
```

### Development

Run the hot‑reload server on port **9091**:

```bash
npm run dev
```

Navigate to http://localhost:9091 to view the app. Save files to see immediate reloads.

### Building for Production

```bash
npm run build    # compile TypeScript and bundle with Vite
npm run serve    # preview the production build on a local server
```

The `dist/` directory will contain the static assets for deployment.

## Project Structure

- `src/` – TypeScript source code and data definitions
- `public/` – static assets and `index.html`
- `package.json` – project metadata and npm scripts
- `AGENTS.md`, `CHANGELOG.md`, `DEVELOPMENT_LOG.md` – project documentation

## Contributing

Feel free to open issues or pull requests on the GitHub repository. Follow the guidelines in `AGENTS.md` when using automated agents or editing documentation.

## License

This project is released under the MIT License. See `LICENSE` for details.
