# Call of Cthulhu - Town Tinkerer

## Project Overview

This project is a population and NPC generator for the "Call of Cthulhu - 1920s" tabletop role-playing game. It allows users to generate a town's population based on a random seed, distributing the population across various jobs, age groups, and family structures. It also generates detailed Cthulhu stats for each adult NPC.

## UI/CSS Style Guide

The application uses a dark, atmospheric theme suitable for a Call of Cthulhu setting, with glassmorphism effects and green accents.

### Color Palette

- **Background**: Dark gradient from `#1a1a2e` to `#16213e`.
- **Text**: Primary text is `#e0e0e0`.
- **Accents**: Green gradients (`#4a9c4a` to `#2ecc71`) for headers, buttons, and active states.
- **Panels/Cards**: Semi-transparent white (`rgba(255, 255, 255, 0.05)`) with a blur effect (`backdrop-filter: blur(10px)`).
- **Borders**: Subtle white borders (`rgba(255, 255, 255, 0.1)`).

### Typography

- **Font Family**: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif.
- **Headers**: Use the green gradient text effect (`background: linear-gradient(45deg, #4a9c4a, #2ecc71); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`).

### Layout & Components

- **Container**: Max-width of 1200px, centered, with padding.
- **Header**: Contains the title, language toggle (to be removed in the English-only version), and controls (population slider, regenerate button, random seed button).
- **Controls**:
  - **Range Slider**: Custom styled with a green track and a white thumb.
  - **Buttons**: Glassmorphism style with hover effects (transform: translateY(-2px), box-shadow).
- **Summary Bar**: Displays total population, children, adults, retirees, and total jobs in a flex row with glassmorphism cards.
- **Categories Grid**: CSS Grid (`grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`) displaying job categories.
- **Job Items**: Flex rows with hover effects, showing the job icon, name, threshold, and count. Inactive jobs are dimmed (`opacity: 0.4`).
- **Modal**: Full-screen overlay with a glassmorphism panel for displaying the list of people in a job or detailed person stats.
- **Person Cards**: Flex rows with an avatar, name, age, and relations.
- **Stats Sheet**: A grid layout for Cthulhu stats, styled to look like a character sheet.

## Generation Logic

- **Seed-based RNG**: Uses a Mulberry32 PRNG for reproducible results based on a seed.
- **Demographics**: Distributes population into children (<16), adults (16-64), and retirees (>=65).
- **Families**: Groups people into families (parents, children) with realistic age gaps and a small chance of same-sex couples.
- **Jobs**: Assigns jobs based on population thresholds and ratios. Uses gender ratios specific to each job (e.g., 1920s historical context).
- **Stats**: Generates STR, CON, SIZ, DEX, APP, INT, POW, EDU, SAN, HP, MP, Luck, Damage Bonus, Build, Move, and Skills based on the assigned job's profile.
  When exporting an individual’s sheet the tool now produces a strict text format (with a Combat section and comma‑separated skill list) that Foundry VTT can ingest verbatim. Examples are documented in the UI.

## Refactoring Plan (TS/Vite)

1. **Data Extraction**: Extract `cthulhuData`, `jobTranslations`, `skillTranslations`, `weaponTranslations`, `statTranslations`, `categoryTranslations`, `JOB_FEMALE_RATIO`, `skillsBase`, `weaponsList`, and `jobSkillProfiles` into separate TypeScript modules.
2. **Localization Removal**: Remove the French base. Hardcode all strings and data to English using the provided translations.
3. **Logic Porting**: Port the `generatePopulation` and `generateCthulhuStats` functions to TypeScript, ensuring type safety for the `Person` and `Stats` interfaces.
4. **UI Recreation**: Recreate the HTML structure and CSS styles exactly as they are in the original file.
5. **State Management**: Use simple vanilla TS state management to handle the current seed, population, and modal navigation.
