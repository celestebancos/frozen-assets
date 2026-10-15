# Frozen Assets

A browser game (plain HTML/CSS/JS modules, no build step) that teaches kids income, expenses, assets and liabilities by running an ice cream truck. See README.md for how the game works and how to tune it.

## Workflow

- **Merging to `main` is pre-approved.** When a change is done and checked, open a PR and merge it without asking first. Pushing to `main` deploys the site to GitHub Pages.
- The deploy (`.github/workflows/pages.yml`) publishes only `index.html`, `styles.css`, `js/` and `sounds/`. A new file or folder the game loads must be added there too, or it 404s on the live site.
- Before merging, run `node --test test/*.test.mjs`. If you changed anything in `js/config.js` or the engine, also run `node tools/simulate.mjs 60` and compare the bots with the targets in README.md.
- For UI changes, play it in a headless browser at phone and laptop sizes. Serve the folder with `python3 -m http.server`; Playwright and Chromium are preinstalled in cloud sessions.

## Conventions

- Money is whole cents everywhere (`100` = $1.00).
- All balance numbers live in `js/config.js`.
- `js/engine.js` (the truck) and `js/cart.js` (the park cart) are pure logic with no DOM, so tests and bots run them in Node. Game state is plain JSON and is saved as-is, so new fields need a fallback for older saves.
- The players are kids: keep on-screen text short and plain.
