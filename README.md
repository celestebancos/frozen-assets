# 🍦 Frozen Assets

A browser game where you run an ice cream truck for one summer on a $10,000 loan. It's built to give kids hands-on practice with **income, expenses, assets and liabilities**. The game shows rather than tells: players buy supplies, set prices, drive a route, deal with customers, and file every receipt into the books themselves.

Play it at **https://celestebancos.github.io/frozen-assets/** once GitHub Pages is turned on (see below).

## How a game goes

1. Pick a player, then a loan at the 🏦 bank: $10,000, $11,000 or $12,000. Bigger loans cost more interest every day, and the bank explains each one in plain words.
2. Pick one of eight trucks on the lot. Each is a different color with its own bling (none, stickers, chrome and lights, or deluxe gold), and every price shows up at least once. Bling costs extra up front and is just for looks. Whatever's left of the loan is the cash for supplies. Then name the business.
3. File the bank loan papers and the truck bill of sale in the 🗃️ shoebox. That's the first lesson: the loan is cash in *and* a debt.
4. Buy supplies, set prices, and pick a route on the 🗺️ map. Then open for business. The 📍 Places page compares how many people came to each spot (per hour, and by time of day) so different routes can be tried on different days.
5. Each day runs 10am–8pm. Speeds are ⏸ ▶ ▶▶ ▶▶▶ and ⏭ (skip to the end of the day).
6. At the end of each week, file the shoebox. Each paper pops up over two pictures: the profit & loss (income is a pile of base-ten blocks, each expense digs a hole) and the balance sheet (bars on each side of a center line, with totals that tip like a scale). Penny the accountant checks every paper and explains any mistake with a "your books vs correct books" comparison. After the last paper, **Calculate Profit** fills the holes with income, and the leftover profit (or loss) moves into the owner's Share. Then the screen turns into the weekly report with the profit graph. Advertising is picked under 📣 Promotion on the 🎁 Gift Cards tab.
7. After 12 weeks the loan comes due. If there's enough cash to pay the bank, you keep the truck and can play another summer. If not, the truck gets towed.

Games save automatically in the browser and continue on the same device.

## Shared leaderboard (Airtable)

The leaderboard lives in an Airtable base, so every device in the house sees the same scores. Setup takes a few minutes and is done once:

1. **Create the base.** In Airtable, create a base named `Frozen Assets Leaderboard` with a table named **`Scores`** and these fields. Names must match exactly.

   | Field | Type |
   | --- | --- |
   | Player | Single line text (primary field) |
   | Business | Single line text |
   | Season | Number (integer) |
   | Owner's Share | Currency ($, 2 decimals) |
   | Result | Single select: `Won`, `Lost` |
   | Truck Color | Single line text |
   | Finished | Date and time |

2. **Make a token.** Go to <https://airtable.com/create/tokens> and create a personal access token:
   - **Scopes:** `data.records:read` and `data.records:write`
   - **Access:** only the `Frozen Assets Leaderboard` base

3. **Connect each device once.** In the game, open ⚙️ Settings on the title screen. Paste the **Base ID** (starts with `app…`, shown in the base's URL) and the **token**, then press **Test**.

The token is stored only in that browser's local storage. It is never in this repository. Scores finished before a device was connected are saved and uploaded automatically once it is. The base ID is already set in `LEADERBOARD.baseId` in `js/config.js`, so on each device only the token is needed. The base ID isn't secret; the token is what grants access.

## Looking at a kid's game

The game keeps a play log alongside each save. The log has a summary of every day (where the truck went, prices, customers, what sold, sold-outs, drops, popularity, cash and stock) and every decision the player made (purchases, price and menu changes, routes, pop-up choices, policies, ads, and every shoebox filing, right or wrong).

To get it, open **⚙️ Settings** on the title screen and press **📤 Export game data** next to a player's name. This works mid-summer too, because games autosave. It downloads one JSON file with the full save, the log, the game settings in use, and a `daysCsv` field you can paste into a spreadsheet.

For a quick readout:

```sh
node tools/analyze.mjs frozen-assets-luke-2026-10-12.json
```

It shows week-by-week sales, price changes, supply buying and spoilage, customer service choices, and filing accuracy by paper type. It also shows how the simulated *decent* and *smart* players do with the same weather and customers.

## Turning on GitHub Pages

The workflow in `.github/workflows/pages.yml` runs the tests and publishes the site on every push to `main`. To set it up, one time: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Tweaking the numbers

All the balance numbers are in **`js/config.js`**: prices, demand, popularity, gas, interest, ads, gift cards, credit terms, sales and spots. After changing anything, check the balance with the simulated players:

```sh
node tools/simulate.mjs 150            # every bot, 150 summers each
node tools/simulate.mjs 50 decent smart  # just some bots
TRACE=1 node tools/simulate.mjs 1 decent # week-by-week trace
```

Tuning targets: a **decent** player (fair prices, keeps stocked, a simple 2-stop route, flyers, gift card for upset customers) wins every time. A **smart** player (route follows the crowds) earns clearly more. **Poor** choices carry a real risk of losing: overpricing, overbuying mix that spoils, handing out piles of free gift cards, or parking in one place all day.

## Developing

No build step: it's plain HTML, CSS and JavaScript modules. Serve the folder with any static server, for example `python3 -m http.server`, and open `index.html`.

```sh
node --test test/*.test.mjs   # engine, accounting and leaderboard tests
```

| File | What it does |
| --- | --- |
| `js/engine.js` | The whole game simulation: customers, supplies, driving, money (no DOM) |
| `js/ledger.js` | Accounts, P&L and balance sheet math |
| `js/documents.js` | Shoebox papers, their correct filing, and Penny's explanations |
| `js/config.js` | Every tunable number |
| `js/ui/statements.js` | Layout math for the P&L blocks and balance sheet bars (no DOM) |
| `js/ui/*` | Screens and panels |
| `tools/bots.mjs` | Simulated players used for tuning and tests |
