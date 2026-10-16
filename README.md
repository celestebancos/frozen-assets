# 🍦 Frozen Assets

A browser game where you start out selling ice pops from a push cart at the park, then run an ice cream truck for a summer on a $10,000 loan. It's built to give kids hands-on practice with **income, expenses, assets and liabilities**. The game shows rather than tells: players buy supplies, set prices, drive a route, deal with customers, and file every receipt into the books themselves.

Play it at **https://celestebancos.github.io/frozen-assets/** once GitHub Pages is turned on (see below).

## The park cart (first level)

New players start small, at the park, with a push cart cooler of popsicles and Italian ice. The main lesson is the sale itself: setting a price, being paid, and making change. It's calm, with kids on the swings, ducks and a dog chasing a frisbee in the background.

1. **Make your character.** Grandma gives you the cart and $40 for the cash box. Your wallet has $10 of your own.
2. **Buy treats** in bulk at the 🏬 restaurant store. There are 14 treats: rocket pops, fudge pops, freeze pops (a box of mixed colors; each pop's color is random and just for looks), orange and grape push pops, orange cream pops, strawberry shortcake bars, ice cream sandwiches, cherry, strawberry, lemon and blue Italian ice, and two fancy ones that earn more per sale but that kids with pocket money usually can't afford: chocolate crunch bars and sundae cones (boxes of 12). There are also two drinks, water bottles and fruit punch: some people want a drink with their treat, more on a hot day (`CART_CROWD.drink`), and drinks take a cooler spot too. The freezer only holds 12 boxes and the cooler 64 treats, so you pick what to carry. The case has one box of each kind, except the two big sellers, which get two boxes as a hint: rocket pops, and the game's favorite treat, which changes from game to game (`CART.hotChoices`; never lemon ice, which few people pick). With everything in the cooler, each of the two is about 1 order in 5. The favorite stays the same on the truck. To buy, tap boxes in its freezer case to put them in your shopping cart, then check out. Three boxes of the same kind cost 20% less (`CART.bulk`), but each box still takes a freezer spot, so room in the freezer limits how much you can save. The cashier hints if it won't all fit at home, and if your money isn't enough, you pick what to put back. Spoons and napkins come in packs of 100. They sit on the kitchen shelf until you tap a pack to put it on the cart, one pack at a time and only once the cart is running low (`refillBelow` in `js/config.js`) (the game asks before you leave with Italian ice and no spoons).
3. **Put it away.** The shopping lands on the kitchen counter. Tap a box, then a spot in the freezer (two shelves of 6 boxes). Boxes can be moved around. Anything left on the counter melts when you leave for the park.
4. **Pack the cooler.** Open a box and tap treats: each goes in the first empty spot. The cooler has two trays of 32, 8 across and 4 down (🔄 Swap trays shows the other one). Tap a treat, then another spot, to swap them. An empty box stays open (a treat can still go back in) until you put it back in the freezer or in the ♻️ recycling bin. Boxes in the bin can be taken back out until you leave home; then the recycling is gone. What doesn't sell stays in the cooler overnight. There are no count lists: you look in the freezer and the cooler.
5. **Get change.** The 🏪 corner store sells small boxes of 6 rocket, fudge and orange push pops, which cost more per treat but are close to the park (bought at the park, they go right into the cooler). It has an ATM (the cart's bank account) and a change machine that breaks bills into smaller bills and quarters. It also sells snacks, toys, hats, sunglasses and shirts. At the park you play with your toys while nobody's at the cart (a bouncy ball, a toy car on the lid, a yo-yo, a kite on sunny days) and put them away when a customer walks up.
6. **Set prices** in quarters. Too high and people say "Too much for me" and walk on. Low prices draw a crowd: more people stop when the prices look cheap, and good deals get people talking, so more come by over the next few days (`priceJoin` and `word` in `CART_CROWD`). More customers means more serving and longer lines; people who see a long line keep walking, and people who wait too long give up (and grumble). In the cart bots, at about 3/4 of fair the crowd grows by half, a decent player serves about a fifth more people (and loses about 9 a day to the line) for a bit less money; at half price, twice the crowd, but the line can't keep up and the money is less than half. The night summary says when word is spreading.
7. **Sell** from noon to 4pm. Find what they asked for in the cooler; the cup of spoons and the stack of napkins sit on a shelf above the counter. Time can be sped up (or paused: ⏸ freezes everything in the park, the stories, rain and sounds included) while nobody is at the cart, but every sale is served by hand at a calm pace, and the game doesn't do the thinking. Put what they asked for on the counter (Italian ice needs a spoon) and press **Here you go!** They say so if something's missing. Anything extra, like a napkin or a free treat, makes them happy (and more likely to tip). Then they pay for what they ordered, and you work out the change: count it out of the cash box (each kind of bill and coin always has its own spot, so you learn where the $1s are), or press **No change needed**. Too little and they say so. Too much and an honest customer gives it back, but some just keep it. 🤔 Help shows the math. No change in the box? They pay exact if they can, or leave.
8. **People.** Families and groups of friends often order 3 or 4 things at once. A short line pulls in people walking by; a long one makes them keep walking. Quick sales sometimes get a tip: a coin drops into the tip jar on the cart (and now and then, after a quick sale that made someone happy, a $3 or $5 tip), which fills up during the day and goes in your wallet at night. Six regulars, each with a favorite, come by about every other day once you've sold them their favorite (never on the first day). If it's missing too often, they stay away for a while.
9. **Lunch.** The 🍎 bar at the top shows how full you are. You start the day full; with nothing to eat it runs out about 2:30 and you go home early (`CART.hunger`). A snack buys about an hour (chips 25, a pretzel 30, a juice box 15; the bar is 100), so one snack gets you home somewhat early and two get you to 4pm. A hot dog or a packed lunch (60) lasts the day. Hot dog stand food is eaten right away. Corner store snacks go in the cooler, where they take a spot, and you're asked whether to eat them now. Sandwich makings from the corner store ($5 for 5) let you pack a lunch at home, about $1 a day against $2.50 for a hot dog. Tap 🍎 to eat what's in the cooler. Your food can't be handed to customers. You can also eat what you sell, between customers, but it barely helps: a freeze pop fills 3, most treats 6, sandwiches, crunch bars and cones 10, a drink 3. From the second treat in a day there's a growing chance of a tummy ache (25%, 50%, 75%, then for sure by the fifth; drinks don't count), which gives no food and puts you on the bench for 15 minutes with the cart closed (`CART.ownTreats`). The end-of-day summary says what you ate and what you could have sold it for. Food comes out of your wallet.
9. **Grandma.** Some mornings she calls to ask you to lunch (`GRANDMA` in `js/config.js`). It's free and takes an hour, and it's a big lunch that lasts past 4pm. Over lunch she gives one piece of advice (the first that fits, and not the same kind as last time): a price that's way off the fair price ("$3.50 for a rocket pop? That's a lot, dear."), something you ran out of last time, spending a lot on snacks or toys (she says which), no stickers, an umbrella, a fan, a bell, or a sticker she likes (stickers marked `grandma: 'likes'` with a `grandmaHint`; ones marked `'dislikes'` get a tut-tut once, with no effect). Next time she checks whether you took it. She also chats about your stickers or the weather (a rainy day lately, a hot or cool day), and tells a story about the old days, often about playing in the park. She doesn't repeat a story until she's told them all. Lunch is at most 5 lines (`GRANDMA.lunch.lines`): hello, how you did with her last advice, new advice, then (as room allows) her favorite on your first lunch, a gift, chit-chat and a story. Her first call is on day 3. At your first lunch together she tells you her favorite (a treat not many people pick, different each game) and that she's a messy eater who always needs a stack of napkins. After that she comes by the cart now and then and asks for her favorite. She doesn't ask for napkins, but if you hand her fewer than 2 she complains. With her favorite and 2 napkins she tips $2 or $3. She keeps a hidden score of good feelings (0–10): lunches, taking her advice, her favorite and napkins raise it; ignoring advice, missing her favorite, too few napkins and saying no to lunch twice in a row lower it. When it's high she's sweeter and sometimes gives you $5, just because. (The regular who loves lemon ice is Miss Lou.)
9. **The park.** Tap the hot dog stand, the sticker stand or the balloon seller to buy things. You hand over money and they make change, but sometimes they get it wrong, so count it! Stickers, an umbrella, a bell and a balloon make the cart look nicer and bring a few more people over.
9. **Moving up.** Play the cart as long as you like. 🏦 *Get a truck loan* takes you to the bank any time. The cart's money (cash box and bank) goes into the new truck business as the owner's share, and the first paper in the shoebox is "Money you put in". The wallet stays yours, and the cart stays playable from the title screen.
10. **Grandma's offer.** Once your money (cash box, bank and wallet) reaches $500, Grandma calls the next morning. At lunch (or, if you say no to lunch, at the cart after she buys her treat) she offers to put money into a truck (`GRANDMA.offer` in `js/config.js`). She covers the truck plus $300 for supplies, up to $9,500, so the fanciest trucks are out of reach. In return she's a co-owner and takes a slice of the profit: $4, $3.50, $3, $2.50 or $2 of every $10. The more cart money you bring (a step for every $100 above $500) and the better she feels about you, the smaller her slice. She says how much more you'd need to save for a smaller slice, and if you come back later with more, the terms are new. You can say "not yet" and keep selling; the offer stays open from 👵 *Grandma's offer* at home. With Grandma there's no loan: the first paper is "Grandma's investment" (Cash up, Grandma's Share up), and the balance sheet has two shares. Each week at Calculate Profit her slice moves from your Share to hers. The summer is won if your own Share grew, and nothing gets towed. The leaderboard counts only your Share and puts 🤝 after the business name. After a won summer you can buy back a quarter, half, three quarters or all of her Share from the business's cash. Her slice shrinks by the same part (half of $3 of every $10 is $1.50 of every $10), and buying all of it makes the truck all yours. It's a new paper, "Buying back Grandma's share": Cash down, Grandma's Share down, and not an expense.

Experienced players can press **Buy a Truck** on the title screen to go straight to the bank.

## How a game goes

1. Pick a player, then a loan at the 🏦 bank: $10,000, $11,000 or $12,000. Bigger loans cost more interest every day, and the bank explains each one in plain words.
2. Pick one of eight trucks on the lot. Each is a different color with its own bling (none, stickers, chrome and lights, or deluxe gold), and every price shows up at least once. Bling costs extra up front and is just for looks. Whatever's left of the loan is the cash for supplies. Then name the business. There are also two used trucks at about half price ($4,850, `USED_TRUCK` in `js/config.js`): faded paint, rust, a dent and a taped-up window, and no bling. For now that's just the price and the look; breakdowns, gas and popularity can come later.
3. File the bank loan papers and the truck bill of sale in the 🗃️ shoebox. That's the first lesson: the loan is cash in *and* a debt.
4. Buy supplies, set prices, and pick a route on the 🗺️ map: which neighborhood to be in at what time of day. Then open for business. The 📍 Places page compares how many people came in each neighborhood (per hour, and by time of day) so different routes can be tried on different days. Routes can be saved and reused, and the 📅 week plan picks a saved route for each day of the week (or the same one every day).
5. Each day runs 10am–8pm. Speeds are ⏸ ▶ ▶▶ ▶▶▶ and ⏭ (skip to the end of the day). The street view is one long world: the truck drives around the neighborhood (its houses or buildings scroll by), stops when people wave it down, and pulls over at a busy place (pool, ball fields, the zoo…) for as long as customers keep coming. Crossing town, you see open road and a welcome sign as you reach the next neighborhood.
6. At the end of each week, file the shoebox. Each paper pops up over two pictures: the profit & loss (income is a pile of base-ten blocks, each expense digs a hole) and the balance sheet (bars on each side of a center line, with totals that tip like a scale). Penny the accountant checks every paper and explains any mistake with a "your books vs correct books" comparison. Penny sends a bill every week for keeping the books. After filing a kind of paper right on the first try 3 times in a row, you can pay her extra to file those for you (Books → 👩‍💼 Penny); every third one still comes back so you can check her work, and a miss takes the job back. After the last paper, **Calculate Profit** fills the holes with income, and the leftover profit (or loss) moves into the owner's Share. Then the screen turns into the weekly report with the profit graph. Advertising is picked under 📣 Promotion on the 🎁 Gift Cards tab.
7. After 12 weeks the loan comes due. If there's enough cash to pay the bank, you keep the truck and can play another summer. If not, the truck gets towed.

Games save automatically in the browser and continue on the same device.

## The town

Six neighborhoods. A route only says which neighborhood to be in and when; inside one, the truck drives around on its own. Driving around uses a little gas, so parking at a busy place saves some. Neighbors are 15–20 minutes apart; across town 25–35.

| Neighborhood | Places | Money to spend |
| --- | --- | --- |
| Maple Street (grid of family houses) | Maple Playground, Maple School, Maple Library | average |
| Oak Hollow (curvy streets, cul-de-sacs) | Oak Tot Lot, Oak Ball Fields, Oak Pool | a bit less; more pocket-money kids |
| Sunset Ridge (big houses on the hill) | Hilltop Playground, Sunset Pool, Sunset School | a bit more |
| Riverside (grid along the river) | River Playground, Riverside Pool, River Ball Fields, Riverside Library | less; the most pocket-money kids |
| Downtown (city blocks) | City Hall, Tech Park, Main St Offices (lunch rush, quiet weekends), Farmers Market (Wed & Sat, 10–2), Pocket Park | a bit more |
| Parkside (the big park) | Central Park, City Zoo (closes at 5), Parkside Playground, Big League Fields | a bit more |

A place is worth stopping at when it's busy: the pool on a hot afternoon, ball fields in the evening, offices at lunch, the library at story time or on a rainy day, the school when camp lets out. The truck parks if parties come at least `cruise.parkPerHour` an hour, and drives on after `cruise.leaveIdle` quiet minutes.

**Sounds.** A ca-ching every time someone pays, in the truck and at the park cart (and a ding-ding when someone walks up, if the cart has a bell). At the park you hear birds, kids on the swings, people chatting and the ducks, plus a bark, a quack or a giggle when something happens in the little stories on the lawn. In the truck, street sounds follow what's on screen: birds, dogs and kids on neighborhood streets; traffic, horns and chatter downtown; splashing and a lifeguard's whistle at the pool; the crack of the bat and cheering at the ball fields; animals at the zoo; ducks in the park; rain on rainy days. They can be turned off in 🚚 Truck & Music or ⚙️ Settings. 🎵 Music off stops just the truck's tune and keeps the street sounds and the ca-ching; 🔇 Mute silences everything. They are real recordings (free CC0 and public domain sounds) in `sounds/`, listed in `sounds/sounds.json`; `sounds/README.md` has the credits and how to add or rebalance one. After switching to another app on a phone, the first tap brings the sound back (a 🔈 Tap for sound button shows until then).

Things that teach a lesson without a lecture:

- **Moving on.** A place's crowd thins the longer the truck stays, and time anywhere else in the same neighborhood counts too. When it does, a parent and kids walk up and the parent says *"Sorry bud, we already got ice cream today, remember?"*
- **Super-low prices and lines.** The truck window serves about 2 people a minute (`service` in `CONFIG`). Normal and somewhat low prices never get close. Super-low prices (the menu under about 55% of fair, `dealCrowd`) draw a big crowd, the line backs up, and people say *"That line is too long!"* and walk away (a small hit to popularity). On the street, customers stand in a line of groups at the window (each group close together): the front group is served, walks off, and the line moves up. People who find the line too long walk up to the back, grumble and turn around. Bots at 40% of the usual prices lose about 7 people a day to the line; at 30%, about 13, and the money drops.
- **Pocket money.** Some kids out on their own only have $1 or less. If nothing costs that little, they say *"I can't buy anything. I only have $1!"* (no grumbling, no popularity hit). Popsicles are the cheap option for them. The truck sells everything the park cart does: rocket, fudge and freeze pops, orange and grape push pops, orange cream pops, strawberry shortcake bars, ice cream sandwiches, cherry, strawberry, lemon and blue Italian ice (each ice needs a spoon), and the fancy chocolate crunch bars and sundae cones. It also sells water and fruit punch: nobody comes for just a drink, but a few people add one to their order, more on a hot day (`drink` in `CONFIG`).

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

To get it, open **⚙️ Settings** on the title screen and press **📤 Export game data** next to a player's name. This works mid-summer too, because games autosave. It downloads one JSON file with the full save, the log, the game settings in use, and a `daysCsv` field you can paste into a spreadsheet. If the player has a park cart, it's in there too, with a `cartSummary` of each day (sales, tips, change kept by customers, people who left the line).

For a quick readout:

```sh
node tools/analyze.mjs frozen-assets-luke-2026-10-12.json
```

It shows week-by-week sales, price changes, supply buying and spoilage, customer service choices, and filing accuracy by paper type. It also shows how the simulated *decent* and *smart* players do with the same weather and customers.

## Turning on GitHub Pages

The workflow in `.github/workflows/pages.yml` runs the tests and publishes the site on every push to `main`. To set it up, one time: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Tweaking the numbers

All the balance numbers are in **`js/config.js`**: prices, demand, popularity, gas, interest, ads, gift cards, credit terms, sales, neighborhoods and their places, popsicles, pocket money (`pocket`), curb stops while driving (`curb`), gas for driving around neighborhoods (`gas.cruiseGalPerHour`), when the truck parks at a place (`cruise`) and the "already had ice cream" families (`alreadyHad`). After changing anything, check the balance with the simulated players:

```sh
node tools/simulate.mjs 150            # every bot, 150 summers each
node tools/simulate.mjs 50 decent smart  # just some bots
TRACE=1 node tools/simulate.mjs 1 decent # week-by-week trace
```

Tuning targets: a **decent** player (fair prices, keeps stocked, a simple 2-stop route from Maple Street to Riverside after lunch and back, flyers, gift card for upset customers) wins every time. A **smart** player (route follows the crowds) earns clearly more. **Poor** choices carry a real risk of losing: overpricing, overbuying mix that spoils, handing out piles of free gift cards, or parking all day in a quiet neighborhood. Staying all day in a dense one (Downtown) can work, but a good route still earns more. A **bargain** player (the decent one with every price at 70%) shows what low prices do on the truck.

The park cart's numbers are in the same file: `CART` (starting money, cooler trays and freezer shelves, errand times), `CART_ITEMS` (fair prices), `CART_SHOPS` (everything for sale), `CART_LOOKS`, `CART_CROWD` (people walking by, what they'll pay, honesty, tips, regulars) and `REGULARS`. Tuning target: serving well, a typical day (noon to 4pm) has about 15 customers (many of them families and friends ordering several things) and around $30–35 of sales, and a fair price rarely gets "too much". A *decent* player should reach $500 (cash box, bank and wallet) in about 3 weeks.

```sh
node tools/cartSimulate.mjs 30 60          # cart bots: 30 players, 60 days each
TRACE=1 node tools/cartSimulate.mjs 5 90 decent  # cart money every 5 days
```

The cart bots (`tools/cartBots.mjs`) are *decent* (fair prices, keeps stocked, right change), *smart* (also napkins, quick sales, umbrella and bell) and *slow* (only the cheap pops, slow sales). Serving takes them about as long as it takes a kid (finding each treat, counting change), and the clock keeps running meanwhile, so a busy day makes a line. They report how much the player earns a day (cash box, bank and wallet) and which day it reaches $200, $300, $500 and $1,000.

## Developing

No build step: it's plain HTML, CSS and JavaScript modules. Serve the folder with any static server, for example `python3 -m http.server`, and open `index.html`.

```sh
node --test test/*.test.mjs   # engine, accounting and leaderboard tests
```

| File | What it does |
| --- | --- |
| `js/ambience.js` | Street sounds and the cash register, played from the recordings in `sounds/`; each kind of place has its own mix |
| `js/engine.js` | The whole game simulation: customers, supplies, driving, money (no DOM) |
| `js/cart.js` | The park cart: money as bills and coins, the cooler, shops, the line, serving and change (no DOM) |
| `js/cartArt.js` | Art for the cart: the cart, bills and coins, Italian ice, the swings, critters, the other sellers |
| `js/icons.js` | Little drawings (coin, tip jar, wallet, fan, gum, tow truck) and Twemoji pictures used in text instead of emojis that are too new for older computers (`img/emoji/README.md`; `test/emoji.test.mjs` checks) |
| `js/ledger.js` | Accounts, P&L and balance sheet math |
| `js/documents.js` | Shoebox papers, their correct filing, and Penny's explanations |
| `js/config.js` | Every tunable number |
| `js/ui/statements.js` | Layout math for the P&L blocks and balance sheet bars (no DOM) |
| `js/ui/*` | Screens and panels |
| `tools/bots.mjs` | Simulated players used for tuning and tests |
| `tools/cartBots.mjs` | Simulated park cart players (`tools/cartSimulate.mjs` runs them) |
