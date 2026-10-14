# Spec: From one truck to a million

The next phase of Frozen Assets. The player starts the way the game starts today: one truck, one loan, one summer. Over many summers the business grows into a fleet with employees, then shops, more towns, factories and franchises. The goal is **$1,000,000 of owner's share**. The game keeps going after that, tycoon-style, until the player decides to sell the business and retire.

This is a design spec, not a build plan for one PR. It's meant to be built in playable slices (see [Build order](#build-order)). Decisions marked **Open** still need a call. Ideas in [IDEAS.md](IDEAS.md) that fit here are pulled in and noted.

## Contents

1. [Goals](#goals)
2. [Who it's for](#who-its-for)
3. [The shape of a career](#the-shape-of-a-career)
4. [Zoom levels and time](#zoom-levels-and-time)
5. [Summer and winter](#summer-and-winter)
6. [Do it, get good, hand it off](#do-it-get-good-hand-it-off)
7. [Trucks: buying, aging, upkeep](#trucks-buying-aging-upkeep)
8. [Supplies, storage and ordering](#supplies-storage-and-ordering)
9. [Employees](#employees)
10. [Managers and the boss's day](#managers-and-the-bosss-day)
11. [Towns and the region map](#towns-and-the-region-map)
12. [Shops](#shops)
13. [Factories and farms (vertical integration)](#factories-and-farms-vertical-integration)
14. [Franchising](#franchising)
15. [Investors and selling the business](#investors-and-selling-the-business)
16. [Loans](#loans)
17. [Accidents and insurance](#accidents-and-insurance)
18. [Failure and bankruptcy](#failure-and-bankruptcy)
19. [The books at scale](#the-books-at-scale)
20. [Economy and balance targets](#economy-and-balance-targets)
21. [Screens](#screens)
22. [Engineering](#engineering)
23. [Leaderboard](#leaderboard)
24. [Build order](#build-order)
25. [Out of scope for now](#out-of-scope-for-now)
26. [Open questions](#open-questions)

---

## Goals

- **Reach $1M owner's share** in about **10 hours** of play (no more) for a player who knows what they're doing.
- **Sandbox, not a quest.** No achievement checklists or scripted missions. Options appear as the player can afford them, and the player decides what to do next.
- **Zoom out as the business grows**, cookie-clicker style. Things that need personal attention early on (driving, stocking, filing) get handed off as the player shows they've mastered them. By the end the player is a CEO making a few big decisions a year.
- **A new money idea at each step**, learned by doing: wages, depreciation, maintenance, fixed vs. variable costs, profit centers and cost centers, insurance, equity, and what a business is worth.
- **Forgiving.** Easy for someone who knows what they're doing, and mistakes knock you back a level rather than ending the game. Catastrophic failure is possible but takes real recklessness.
- **Every player** gets this path, not just one save.

## Who it's for

The main player right now is 7 and a fluent reader who skips text when he's eager to try things. His older brother plays too.

- On-screen text: short, plain, no padding. One idea per sentence. Let the game show it rather than explain it.
- Mostly played on **laptops**, so design for that first. The phone needs to work for playtesting, but it can be a bit cramped.

## The shape of a career

These are rough stages, not hard levels. Nothing is locked except by price (and by the hand-off rule below for delegating jobs). A player who wants to stay solo for years can.

| Stage | Roughly | Net worth | What the player does | New ideas |
|---|---|---|---|---|
| **Solo** | Summers 1–2 | $10k → $30k | Drives the truck, files every paper (today's game) | Income, expenses, assets, liabilities |
| **Small fleet** | Summers 2–4 | $30k → $120k | 2–5 trucks. Hires drivers, can still drive one, plays by day or by week | Wages, profit per truck, depreciation, maintenance, storage |
| **Boss** | Summers 4–6 | $120k → $400k | 6+ trucks, so no more driving. Sets policy, hires managers, opens a second town, maybe a first shop | Delegation, overhead, insurance, fixed costs |
| **CEO** | Summers 6+ | $400k → $1M and beyond | Many towns, shops, factories, franchises, investors. Plays by summer, with a few decisions along the way | Profit and cost centers, make vs. buy, equity, franchise fees, what a business is worth |

**Rule from the design discussion:** once the business has **many trucks** (proposed: 6 or more), the player can no longer drive. They're the boss now. With fewer, driving one truck is always allowed.

## Zoom levels and time

The game has three speeds of play. Each one opens up as the business grows and stays available afterward (except driving, per the rule above).

| Zoom | Unit of play | Available | Player sees |
|---|---|---|---|
| **Street** | A day, minute by minute | Always (until 6+ trucks) | Today's street scene, for the truck the player drives or is watching |
| **Town** | A week | From 2 trucks | Town map with truck icons, a day ticker, and pop-ups for things needing a decision |
| **Region** | A month (or the whole summer) | From the second town | Region map with towns as units, monthly numbers, pop-ups |

- At Town and Region zoom, days still happen. They just run fast and show summaries. Events that need a decision (an employee quits, an accident, a big order) pause and pop up.
- The player can zoom in to watch any truck for a day, even after they can't drive. They're watching, not driving.
- **Open:** whether to allow zooming back in to day-by-day play with a big fleet, or always force week steps once there are many trucks.

## Summer and winter

Each year has two halves. **Summer is for running the plan. Winter is for making it.**

### Summer
- Runs as today, but the calendar is longer: roughly **May to September**, with demand rising and then falling (an extended `seasonCurve`). The 12-week loan in summer 1 stays as it is.
- **The player decides when each truck or shop closes for the year**, based on whether it's still making money. Per-unit daily profit makes this visible. Shops can stay open later in the fall than trucks.
- Trucks need **overnight parking** in summer and **storage** all winter, either rented per truck or in a garage the player owns (the first property: rent vs. buy on a small scale).

### Winter (planning screen)
One screen, laid out in this order:
1. **Year in review:** profit by truck, shop and town; what went well; the net worth graph across summers.
2. **Papers:** depreciation, winter storage, maintenance bills (see [The books at scale](#the-books-at-scale)).
3. **Decisions:** buy and sell trucks, pick maintenance, renew insurance, hire and re-hire, sign leases, build things, take or repay loans, talk to investors and buyers.
4. **Start next summer.**

- **Open:** do factories and shops run during winter (with low demand), or does everything pause? Running them makes winter more than a menu, and it sharpens the fixed-cost lesson.

## Do it, get good, hand it off

This is the core pattern, generalized from Penny's filing (`CONFIG.filing`: file a kind of paper right 3 times in a row, then pay her to file it, with spot checks).

**Every job works the same way:**
1. The player does the job personally.
2. When they've shown they can do it well, someone can be hired for it. That person costs wages or fees.
3. The helper does the job at a quality level that depends on who was hired. A cheap helper is sloppier.
4. Spot checks or the per-unit reports show how the helper is doing. The player can take the job back at any time.

| Job | Done by hand | "Good at it" means (proposed) | Handed to |
|---|---|---|---|
| Filing papers | Shoebox (today) | 3 first-try rights per paper type (today) | Penny (today) |
| Loading trucks | Setting fill-to levels | A week or two with no trucks going out short | Stock clerk |
| Ordering supplies | Placing supplier orders | A few weeks with no sell-outs from late orders, and low spoilage | Purchasing manager, following the player's reorder rules (IDEAS.md: automatic reordering) |
| Prices and menu | Price panel | A week of no "too expensive" losses and decent margins | Driver or manager, within a price range the player sets |
| Routes | Map and week plan (today) | A week near the crowd-following bot's sales | Driver (skill decides how well) |
| Payroll | A weekly payroll paper per truck | Payroll papers filed right | Bookkeeper |
| Hiring | Picking from candidates | A few hires that last past their green period | Manager |
| Running a town | Boss handles every truck | Has hired and managed 6+ trucks | Town manager |
| Maintenance | Picking per truck each winter | A summer with no avoidable breakdowns | Fleet manager |

- The "good at it" checks should be visible but not preachy: a small badge on the job, plus one short line when something becomes available to hand off ("You're good at stocking now. A driver can do it for you.").
- **Open:** each job's exact "good at it" test. These will need tuning against the bots.

## Trucks: buying, aging, upkeep

- **Buying.** The existing truck lot, plus **used trucks** (IDEAS.md): cheaper, older, more breakdowns, and shabby looks sell less in fancy neighborhoods until repainted.
- **Depreciation.** Each truck loses value as it ages, straight-line over about **8 summers** down to a small scrap value. It's booked once a year at winter as a new expense line, "Trucks getting older". It's the first expense where no cash leaves, which is the lesson.
- **Selling a truck** gets about its fair used price. The gap from its book value is a gain or loss on sale, a new line on the books.
- **Maintenance.** Each winter, pick a level per truck (or one rule for the fleet):
  - **Skip:** free, with a high chance of breakdowns.
  - **Basic:** medium.
  - **Full:** costs the most, with the fewest breakdowns.
  
  Cost grows with the truck's age. Skimping shows up as **breakdowns during summer**: a lost day or more, a tow, and a repair bill.
- **Repair or upgrade** (IDEAS.md): a repair is an expense, but a new freezer is something you own.

## Supplies, storage and ordering

Today, supplies are bought instantly from the store in any amount, and there's no limit on how much can be kept. That's fine for one truck. With a fleet, **getting every truck what it needs every morning** becomes one of the main jobs, and storage and ordering start to cost money and time.

### Where supplies live

| Place | Holds | Cost |
|---|---|---|
| **Truck** | One or two days' worth. A small freezer for mix, shelves for cones, bowls, napkins | Comes with the truck |
| **Garage shelf** | A little extra for a solo player | Comes with parking, or the garage |
| **Supply room** (rented) | A few days' to weeks' worth for a fleet | Rent per week, by size. **Freezer space costs more than dry shelves** |
| **Warehouse** (owned, later) | Pallets, for a town or the region | Bought (an asset that depreciates), plus power and upkeep |
| **Shop back room** | The shop's own stock | Part of the shop |

- Space has a hard limit. A delivery bigger than the space is **refused**, or costs an overflow fee for a few days somewhere else. Proposed: the overflow fee, since it's gentler and still teaches the lesson.
- Mix still spoils (`shelfLife`) wherever it is. Storing more doesn't make it last longer.
- **Supply counts:** the books say how much should be there. A count says what is. The gap is **shrinkage**: drops, waste, or a skimming employee. This builds on the existing "Inventory of supplies used" paper and gives bad apples another way to be caught.

### Morning load-out

- Each truck has **fill-to levels** for each supply ("start each day with 150 vanilla, 200 cake cones…"). Each morning, trucks are loaded from the supply room up to those levels.
- If the supply room runs short, trucks go out short and sell out early. The fleet screen shows which trucks went out short and of what.
- Loading takes a bit of time per truck, so a crowded supply room means a later start. Proposed: only matters at 6+ trucks, otherwise it's instant.
- At first the player sets fill-to levels per truck. Later, one rule can be set for all trucks, adjusted for each truck's sales.

### Ordering

| Way to buy | Size | Price | Wait | Notes |
|---|---|---|---|---|
| **Restaurant store** (today's shop) | A truck's worth | Full price | None | Someone has to go get it. Proposed: about an hour of the boss's or a driver's morning |
| **Supplier delivery** | Cases to pallets | Cheaper per unit, the more you order | 2–7 days; **bigger orders take longer** | Minimum order. Pay extra for a rush |
| **Standing order** (later) | Same amount every week | Price locked for the summer | Fixed delivery day | IDEAS.md: suppliers raising prices mid-summer, unless you signed earlier |
| **Your own factory** | Its daily output | Cost to make | Arrives daily | See [Factories](#factories-and-farms-vertical-integration) |

- Paid-for orders that haven't arrived are a new asset: **"Supplies on the way"** (IDEAS.md: order ahead). The supplier invoice is a paper to file.
- **The balance to strike:** bulk orders are cheaper per unit. But they tie up cash, need storage (rent), can spoil, and take longer to arrive, so they must be planned ahead. The restaurant store is expensive but always there. A good player mixes both: big deliveries for cones, bowls and napkins, smaller and more frequent ones for mix.
- **Weather forecast** (IDEAS.md) helps plan mix orders, sometimes wrongly.
- Proposed rough sizes: bulk saves **20–35%** against the store, so it matters. Storage rent and spoilage should make big overbuying clearly worse than ordering well (the `overbuyer` bot is the check).

### Handing it off

The same do-it, get-good, hand-off rule applies:
- **Load-out:** the player sets fill-to levels. It's handed to a **stock clerk** after a week or two with no trucks going out short.
- **Ordering:** the player places supplier orders. It's handed to a **purchasing manager** after a few weeks with no sell-outs from late orders and low spoilage. They follow the player's rules: "When cake cones drop below 2,000, order 5,000."
- How well a helper follows the rules depends on who was hired. A sloppy clerk miscounts, and a sloppy buyer orders late.

## Employees

### Drivers are the bots
The simulated players in `tools/bots.mjs` become the hiring pool. Each candidate drives with a strategy:

| Bot | As an employee |
|---|---|
| `smart` | Follows the crowds. Asks a high wage |
| `decent` | Solid, middle wage |
| `cheapskate` | Under-stocks, and loses sales to sell-outs |
| `parker` | Parks in one place all day |
| `overbuyer` | Lets mix spoil |
| `overpricer` | Drives customers off |
| `promoSpammer` | Hands out free gift cards |

The player doesn't see the strategy name. They see a short card and learn the rest from the per-truck numbers:
- Name, wage asked, a one-line hint ("Loves dogs. Was a lifeguard."), and maybe a reference ("Shows up on time").

New bots can be added for more variety.

### Wages and the learning period
- **Wages are per day worked.** No overtime and no hourly rates.
- **Green period:** new drivers are slower, drop more cones and make worse choices for their first couple of weeks, then settle at their skill level. The boss can spend a day training one to shorten it (see [the boss's day](#managers-and-the-bosss-day)).

### People being people
- **Calling off:** sometimes a driver doesn't come in, so the truck sits idle unless the boss drives it. The excuses are a running joke, some silly ("My goldfish has the hiccups", "A raccoon took my shoes") and some ordinary ("Dentist appointment").
- **Quitting:** with notice that varies from two weeks to none ("I'm moving to Alaska. Bye!").
- **Ridiculous mishaps:** "Sam ate 40 cones." "Jo locked the keys in the truck." Small costs, big laughs.
- **Bad apples:** some hires quietly hurt the business until fired.
  - **Skimming:** cash comes in short. The clue is supplies used vs. sales on the register tape (IDEAS.md: fraud).
  - **Careless:** high spoilage, lots of drops, grumpy customers.
  - **Padded receipts:** gas bills higher than the miles driven.
  
  They're found from per-truck profit and the papers, never announced. Fire them, and things get better.
- **Firing:** any time. Proposed: no severance at first, to keep it simple.
- **Tip jar** (IDEAS.md): whose money is it? Maybe later.

## Managers and the boss's day

- **The player is the first manager.** With a few trucks, the player sets routes, stocking rules and prices for each truck.
- **Span of control:** one manager handles about **5 trucks** (proposed). Beyond that, without help, trucks start running on their drivers' instincts alone. A **manager** takes a group of trucks and applies the player's policies, at a quality set by the manager's skill.
- Later there are **town managers** (one per town), and at CEO scale possibly a **head of trucks**, **head of shops** and **head of factories**.

### The boss's day
Before 6 trucks, the player picks how to spend each day (or a default for the week):

| Choice | Effect |
|---|---|
| **Drive a truck** | The player runs that truck at Street zoom, so it's one fewer driver to pay |
| **Manage** | Every truck plays a bit better that day, as if a manager were on |
| **Train** | One green driver learns faster |
| **Do the books** | Penny's bill is smaller that week |

This is "where is my time most valuable?" as an actual choice, with no right answer posted. At 6+ trucks, *Drive* goes away.

## Towns and the region map

- The current town (six neighborhoods) stays as the **home town**, fully simulated.
- **More towns** appear on a region map. Each has a **size** (how much ice cream it can sell), a **wealth** level, a **distance** (setting the cost of opening there), and a flavor (beach town, college town, farm town).
- New towns are run **as a unit**, not street by street. The player sets the number of trucks, a manager, and town-wide policy, and sees town-level results. There's no street view for them, at least at first.
- **More trucks earn less each.** Each extra truck in a town adds less than the one before, so growth eventually means going somewhere new. The same applies to the home town once it fills up. This is the "market size" lesson.
- In the home town, **several of your own trucks** split the crowd when they work the same neighborhood. The engine needs this.

## Shops

- **Rent or buy** a storefront in a town. Renting means monthly rent (an expense). Buying means a building on the balance sheet (an asset, possibly with a mortgage), plus property costs.
- **Equipment** (counter, freezers, sign) is bought up front as an asset and depreciates.
- **Compared with a truck:** no gas and no driving, a fixed spot with steady walk-in traffic, a longer season, and rain hurts it less. In exchange it has fixed costs every month whether or not anyone comes.
- **Staff:** shop workers (per-day wage, same people mechanics as drivers) and a shop manager.
- A first shop that loses money can be closed or sold. That's the "knocked back a level" kind of failure.

## Factories and farms (vertical integration)

The player can make supplies instead of buying them. This is growing **down** (owning the supply chain), as opposed to **out** (more trucks, shops, towns). Both are optional, and they combine.

| Supply | Made by | Notes |
|---|---|---|
| Cones (cake, sugar, waffle) | Cone bakery | **First factory to build.** Cones don't spoil, so it's the simplest |
| Vanilla & chocolate mix | Mix plant, later a dairy farm | Milk spoils fast, so the dairy needs to be near the plant |
| Sprinkles, popsicles | Candy factory | Small and fun |
| Bowls, spoons, napkins | Paper goods plant | Possibly always bought |
| Cocoa | **Can't be grown here** | Must be imported. A faraway cocoa farm could be a late, expensive goal |

How factories work (proposed):
- A building has a **size** (output per day), a **build cost**, a **monthly fixed cost** (staff, upkeep) and a **cost per unit** for ingredients.
- It **runs on its own**: the player decides whether to build and how big, not daily output. A factory manager can be hired, following the same hand-off rule.
- **Make or buy:** a factory only beats store prices when the business uses enough of what it makes. One truck can't keep a cone bakery busy, but 30 trucks can. Building too early should *feel* wrong ("The cone bakery lost money: only 2 trucks to feed").
- **Extra output** goes into storage (mix spoils) or **is sold to other businesses** at wholesale prices: a new income line. Buyers are abstract (grocery stores, other shops), so rival companies aren't needed.
- **Too little output:** the purchasing manager (or the player) tops up from suppliers or the restaurant store.
- Output goes into the supply room or warehouse like any delivery, so a factory needs storage too.
- **Building takes time:** ordered in winter, it opens partway through the next summer.
- **Eggs in one basket:** if the only mix plant breaks down, every truck runs short.
- **What do home-made supplies cost?** Proposed default: the **real cost to make**, so "Supplies used" simply gets cheaper. The per-unit report shows the factory as a cost center with "saved vs. store price". The advanced version, where the factory "sells" to your own trucks and Penny explains why that isn't real income, is **Open**.
- **How deep do chains go?** Proposed: factories first. Farms are a later, optional deeper step.

## Franchising

- Once the brand is strong (proposed: a profitable shop, or a town that's clearly working), other people can **buy a franchise**. They pay an **upfront fee** and a **royalty** (a share of their sales), and run a truck or shop under the player's name and colors.
- It's income without doing the work, but the player doesn't control quality. A bad franchisee can hurt the brand's popularity everywhere.
- **Works with vertical integration:** franchisees can be required to buy supplies from the player's factories, which is how many real franchises make their money.
- Franchise units sit on the region map but cost nothing to run.

## Investors and selling the business

### Investors (equity)
- From time to time a person offers cash for a slice of the company, for example **"Grandma Rose: $50,000 for 10% of the business."** Those IDEAS.md grandparents fit here.
- Once that happens, the company's owner's share is split between the player and the investors. **The goal counts only the player's part.** Selling slices lets the business grow faster, but each slice is profit given away forever. That's the lesson.
- **Open:** whether investors get yearly payouts (dividends) or only gain when the business is sold. Proposed: only at the sale, for simplicity. Also open: whether the player can buy slices back.

### Selling the business (retiring)
- Once the business is big enough, buyers make an offer each winter, based on yearly profit plus what the business owns. The player sees that a business that **earns money** is worth more than its trucks and buildings.
- Selling ends the career: a retirement screen, the player's cash after the investors' slices, and a leaderboard entry. This is the closest thing to a "win" and it's the player's choice when to take it.
- Selling **one part** (a town, a shop, a factory) is also possible and doesn't end the game.

## Loans

Loans are available but not the focus.

- The summer 1 bank loan stays exactly as it is.
- After that the bank offers growth loans against what the player owns. **The bank pushes them.** A cheerful banker says "You're pre-approved for $200,000!", and some offers are honestly bad deals (high interest, short terms). There are no heavy warnings: the player learns from what happens.
- The bank reads the books (IDEAS.md): clean books and steady profit mean better offers.
- Interest, payments and missed payments use the existing loan plumbing.

## Accidents and insurance

- **Accidents hit one truck or shop**, not the whole business. They're rare per unit, but with 30 trucks something happens most weeks.
  - Realistic: fender-bender, freezer fire, flat tire, hailstorm, power outage at a shop.
  - Silly, SimCity-style: a giant seagull steals the cones, a dinosaur parade blocks Main Street, a UFO beams up a freezer, a blob monster sits on the truck.
- **Insurance:** a yearly premium per truck or shop, paid up front. It's an asset that turns into an expense week by week (IDEAS.md). It pays repairs above a deductible.
  - Without insurance, an accident costs the full repair, or the unit is lost.
  - Silly accidents are covered too ("Yes, it covers monsters.").
- Bad luck must not swing the game much: an uninsured accident should sting, not sink a sensible player.

## Failure and bankruptcy

Mistakes knock you back a level. Ruin is possible but rare.

- **Losing units:** a shop that loses money can be closed or sold at a loss. A truck can be sold. The rest of the business carries on.
- **Cash crunch:** if a bill comes due and there isn't enough cash, the bank **sells something** for the player (the least-needed asset, at a fire-sale price of about 60% of its value). That's painful and costs a level, but it isn't the end.
- **Bankruptcy:** when debts are more than everything the business owns **and** the bills can't be paid. In practice this mostly happens through heavy borrowing. The player then starts a **new business** from scratch: new loan, new truck. Their career stats (best net worth, businesses started) are kept.
- **Hardcore mode** (more bad luck, harsher failure) is a later idea, not part of this phase.

## The books at scale

The shoebox stays the heart of the game, but the papers change as the business grows.

| Stage | Papers |
|---|---|
| Solo | One paper per receipt (today) |
| Small fleet | **Per truck, per week:** sales, supplies used, gas, wages. Plus payroll, storage rent, repair bills, supplier invoices, and supply counts |
| Boss | **Per town, per month** summaries. New papers: insurance, rent, manager wages, equipment |
| CEO | **Quarterly or yearly** company papers: depreciation, factory costs, franchise fees received, investor shares |

- **Each new kind of paper** goes through the same rule: file it right a few times, then it can be handed to Penny, or later to a bookkeeper or accountant at a higher fee.
- **New accounts** (rough list):
  - Expenses: wages, repairs, depreciation, storage/rent, shrinkage, insurance, manager pay, factory costs.
  - Assets: trucks (book value), buildings, equipment, prepaid insurance, supplies on the way, supplies in each place.
  - Liabilities: wages owed, mortgage.
  - Income: wholesale supply sales, franchise fees, royalties, gain on sale.
  - Owner's share: split between the player and investors.
- **Profit by unit:** a report ranking every truck, shop and town by profit. "Which truck is losing money?" is probably the best new lesson in the phase, and it's how bad-apple employees get caught.
- **Profit centers and cost centers:** trucks, shops and towns *make* money. Garages, factories (at real cost), managers and the office *support* them. The report shows units' profit, then company costs underneath, then the true bottom line.

## Economy and balance targets

What the bots show now (10 summers each, current main):

| Bot | Owner's share after summer 1 | Profit (minus the $9.7k truck) |
|---|---|---|
| `smart` | ~$19k | ~$9k |
| `decent` | ~$13k | ~$3k |

The 10-hour arc needs the business to roughly **double each summer** from about summer 2 on: $15k → $1M in about 7–9 summers. That means:

| Asset | Target payback, run decently | Target payback, run well |
|---|---|---|
| Truck + hired driver | ~1.5 summers | ~1 summer |
| Shop | ~2–3 summers | ~2 summers |
| Factory, at enough volume | ~2–3 summers | ~2 summers |
| Franchise | Mostly free income once the brand is built | |

- Right now a decent truck clears about $3k in summer 1 (with loan interest and Penny's fees). A hired driver at a realistic daily wage would eat most of that, so **wages, summer length and demand need tuning together** to hit the targets. Driver wages should feel like teen summer-job money.
- Diminishing returns per town should push expansion to new towns at about 8–12 trucks per town.
- **Growth bots** for `tools/simulate.mjs`:

| Bot | Plays like | Target |
|---|---|---|
| `steady` | Reinvests cautiously, decent drivers | $1M around summer 10–12 |
| `grower` | Smart hires, expands well, builds a factory at the right size | $1M around summer 8 |
| `reckless` | Borrows heavily, skips maintenance and insurance | High risk of a cash crunch, real risk of bankruptcy |
| `soloGrinder` | Never hires | Never loses, but never gets near $1M |
| `earlyFactory` | Builds a factory with 2 trucks | Visibly slowed down |

- **Real-time check:** measure how long a summer takes at each zoom in playtests, so the stage targets add up to 10 hours or less.

## Screens

Laptop first. The phone must work but can be cramped.

| Screen | When it matters | Contents |
|---|---|---|
| **Street** | Solo and small fleet | Today's scene |
| **Fleet** | Small fleet | One row per truck: driver, today's sales, stock, mood, went out short. Tap a row to watch that truck |
| **Supply room** | Small fleet on | Stock by place, space used, orders on the way, fill-to levels, reorder rules |
| **Town map** | Small fleet | The existing map with truck icons moving around |
| **Region map** | Boss and CEO | Towns as tiles: trucks, shops, profit this month |
| **People** | Small fleet on | Staff list, candidates, hire/fire, call-offs and notices |
| **Winter planning** | Every winter | As described above |
| **Reports** | Always | Existing P&L and balance sheet, plus profit by unit and the net worth graph across summers |

## Engineering

- **State shape:** today's single truck becomes `trucks[]` (each with its own stock, cash box, driver, route, age and book value). Supply lots get a location (a truck, the supply room, a warehouse) and orders get an arrival day. Shops, towns, factories, staff, investors and franchises get their own lists. **Old saves** load with their truck as `trucks[0]`, an empty staff list, and the home town (per CLAUDE.md: new fields need a fallback).
- **Fast model:** at Town and Region zoom, simulating every customer for 50+ trucks is too slow. Add a **fast estimate** of one truck-day (or shop-day, or town-month) from the driver's strategy, weather, crowd size and the number of trucks. Calibrate it against the full engine using the bots, and keep the full engine for anything shown at Street zoom.
- **Engine stays pure** (no DOM), so bots and tests keep running in Node.
- **Save size:** many summers of play log won't fit in localStorage (about 5 MB). Roll each finished summer's log into a summary. If saves still get too big, **Airtable** is the backup (already used for the leaderboard).
- **Config:** all new numbers (wages, depreciation years, maintenance costs, insurance, accident rates, town sizes, factory costs, valuation multiples) go in `js/config.js`.
- **Tests:** engine tests for every new kind of entry, to check that the books balance and depreciation is right. A bot run per phase against the targets above.

## Leaderboard

New fields in the Airtable `Scores` table (README setup to be updated):

| Field | Meaning |
|---|---|
| Net worth (career best) | Highest owner's share the player has reached |
| Summers to $1M | Blank if not reached yet |
| Retired | Sale price when the business was sold, if it was |
| Businesses started | Goes up after a bankruptcy |

## Build order

Each phase is playable and merged on its own. Phases 2 and 3 can go in either order.

1. **Fleet and crew.** Several trucks in the home town, with crowd splitting. Hire drivers from the bot pool, with wages, green period, call-offs, quits, bad apples and firing. The boss's day. Per-truck weekly papers and payroll. Profit by truck. Parking and storage. A supply room with fill-to levels and morning load-out (supplies still come from the restaurant store). Winter planning screen. Player-chosen end of summer. Town zoom (play by week).
2. **Ordering ahead.** Supplier deliveries with bulk prices and wait times, supplies on the way, supply room rent and space limits, freezer vs. dry space, supply counts and shrinkage, weather forecast.
3. **Aging fleet.** Depreciation, maintenance, breakdowns, used trucks, selling trucks, garage. Accidents and insurance. Bank offering growth loans. Cash crunch.
4. **Hand-offs and managers.** Generalize the do-it/get-good/hand-off rule to loading, ordering, prices, routes, payroll and hiring. Owned warehouses. Managers and span of control. Boss-only at 6+ trucks.
5. **More towns.** Region map, region zoom, fast model, town managers, per-town papers.
6. **Shops.** Rent or buy, equipment, shop staff.
7. **Factories.** Cone bakery first, then mix plant, candy and maybe farms. Selling extra output.
8. **Investors, franchising, selling out.** Equity slices, franchise fees and royalties, buyer offers, retirement, bankruptcy and new business. Leaderboard fields.

## Out of scope for now

- Rival ice cream companies (IDEAS.md: competitor truck). Saved for later.
- Hardcore mode.
- Overtime, hourly wages, taxes on wages.

## Open questions

1. **Zooming back in:** with a big fleet, can the player still step a single day minute by minute (watching only), or are week steps forced?
2. **Winter:** do shops and factories run during winter with low demand, or does everything pause?
3. **"Good at it" tests** for each job: proposed above, to be tuned.
4. **Factory supplies:** booked at real cost to make (proposed), or "sold" to your own trucks with the "that's not real income" lesson?
5. **Depth of supply chains:** factories only, or farms too (wheat → flour → cones, cows → milk → mix)?
6. **Investors:** yearly payouts, or only at sale? Can the player buy slices back?
7. **Penny at scale:** does she stay the bookkeeper throughout, or does the player hire new bookkeepers and accountants as the business grows?
8. **Severance** when firing: none (proposed), or a small amount?
9. **The "many trucks" line** where driving ends: 6 is proposed.
10. **Space limits in summer 1:** should a solo player's truck and garage shelf have a limit (a small change to today's game, and an early taste of storage), or stay unlimited until there's a fleet?
11. **A full supply room:** refuse the delivery, or charge an overflow fee (proposed)?
