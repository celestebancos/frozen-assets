# Spec: From one truck to a million

The next phase of Frozen Assets. The player starts the way the game starts today: one truck, one loan, one summer. Over many summers the business grows into a fleet with employees, then shops, more towns, factories and franchises. The goal is **$1,000,000 of owner's share**. The game keeps going after that, tycoon-style, until the player decides to sell the business and retire.

This is a design spec, not a build plan for one PR. It's meant to be built in playable slices (see [Build order](#build-order)). Decisions marked **Open** still need a call; most wait until their phase is built. Ideas in [IDEAS.md](IDEAS.md) that fit here are pulled in and noted.

## Contents

1. [Goals](#goals)
2. [Who it's for](#who-its-for)
3. [The shape of a career](#the-shape-of-a-career)
4. [The park cart (first level)](#the-park-cart-first-level)
5. [Zoom levels and time](#zoom-levels-and-time)
6. [Summer and winter](#summer-and-winter)
7. [Do it, get good, hand it off](#do-it-get-good-hand-it-off)
8. [Trucks: buying, aging, upkeep](#trucks-buying-aging-upkeep)
9. [Supplies, storage and ordering](#supplies-storage-and-ordering)
10. [Serving at the truck window](#serving-at-the-truck-window)
11. [Employees](#employees)
12. [Managers and the boss's day](#managers-and-the-bosss-day)
13. [Towns and the region map](#towns-and-the-region-map)
14. [Shops](#shops)
15. [Factories and farms (vertical integration)](#factories-and-farms-vertical-integration)
16. [Franchising](#franchising)
17. [Investors and selling the business](#investors-and-selling-the-business)
18. [Loans](#loans)
19. [Accidents and insurance](#accidents-and-insurance)
20. [Failure and bankruptcy](#failure-and-bankruptcy)
21. [The books at scale](#the-books-at-scale)
22. [Economy and balance targets](#economy-and-balance-targets)
23. [Screens](#screens)
24. [Engineering](#engineering)
25. [Leaderboard](#leaderboard)
26. [Build order](#build-order)
27. [Out of scope for now](#out-of-scope-for-now)
28. [Decided](#decided)

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
| **Park cart** | As long as they like | Pocket money | Sells popsicles and Italian ice from a cooler, makes change by hand | Prices, making change, cash vs. wallet |
| **Solo** | Summers 1–2 | $10k → $30k | Drives the truck, files every paper (today's game) | Income, expenses, assets, liabilities |
| **Small fleet** | Summers 2–4 | $30k → $120k | 2–5 trucks. Hires drivers, can still drive one, plays by day or by week | Wages, profit per truck, depreciation, maintenance, storage |
| **Boss** | Summers 4–6 | $120k → $400k | 6+ trucks, so no more driving. Sets policy, hires managers, opens a second town, maybe a first shop | Delegation, overhead, insurance, fixed costs |
| **CEO** | Summers 6+ | $400k → $1M and beyond | Many towns, shops, factories, franchises, investors. Plays by summer, with a few decisions along the way | Profit and cost centers, make vs. buy, equity, franchise fees, what a business is worth |

**Rule from the design discussion:** once the business has **many trucks** (6 or more), the player can no longer drive. They're the boss now. With fewer, driving one truck is always allowed.

## The park cart (first level)

Before the truck, a new player starts small: **selling popsicles and Italian ice from a push cart cooler at the park.** It's a tutorial and a calm, people-watching level. The main lesson is **the sale itself**: setting a price, being paid, and making change. (IDEAS.md had a push cart as an easier first summer.)

### Getting started
- **Make your character** at the start of the game: look, hair, clothes. The same character later drives the truck and, eventually, sits in the CEO's office.
- A small starting amount of money (proposed: a gift or a small loan from a relative, no bank yet). A cart and cooler, and a freezer at home.
- **Stock** (popsicles and Italian ice) is bought in bulk at the **restaurant store**, the same store the truck uses later, and kept in the home freezer.

### Each day
1. **Pack the cooler.** The cooler has limited space, and the home freezer holds more. Decide what to bring today and what to leave home. More kinds means less of each. On a hot day even a full cooler may sell out. The cooler has a battery that keeps it cold all day, and what's left stays in it overnight. *(Built hands-on: boxes on two freezer shelves, a kitchen counter where shopping melts if it isn't put away, a cooler of two 24-spot trays, and no count lists.)*
2. **Fill the cash box.** Start the day with change: $1 bills and coins. With no change, a customer paying with a $5 can't be served unless they have exact money.
3. **Set prices.** Too high, and people say "No thanks" and walk on. Low prices sell more but earn less on each one.
4. **Sell at the park.** Time can be sped up while waiting for customers. When someone walks up, time slows to normal, and **filling the order and making change are always done by hand, in real time**:
   - Pick the popsicle or cup of Italian ice (with a spoon).
   - Take their money, then count out change from the cash box by tapping bills and coins.
   - **Give too much change** and an honest customer says "You gave me too much!" and hands it back, but another just walks off with it. **Give too little** and they'll notice and wait for the rest.
5. **The corner store.** A little convenience store near the park has an **ATM** (deposit the day's cash, or take some out) and a **change machine** next to it that turns bills into $1s and coins for the cash box. It also sells snacks and toys.

### Customers
- **Regulars:** some customers come back day after day and have a **favorite**. When it's in the cooler, they're happy and sometimes bring a friend. When it isn't, they're sad ("No grape today? Aww."), and if it keeps happening, they stop coming.
- **The line:** serving quickly keeps the line short. A short line pulls in people walking by. A long line makes them keep walking.
- **Tip jar:** a quick, friendly sale sometimes gets a tip. (Proposed: tips are the player's own money, since it's their cart.)

### The park
- **Cute scenes in the background** to watch between customers: kids on the swings, a dog chasing a frisbee, a squirrel stealing a sandwich, ducks marching across the path, a balloon floating away, a toddler dancing.
- **Other vendors:** a hot dog stand for lunch, a balloon seller, a sticker and decal stand. The player pays from their **wallet**, and the vendor makes change, unless the player gives exact change. Proposed: a vendor sometimes gives the wrong change, so the player can practice checking it from the other side.
- **Wallet vs. cash box:** the player's own money and the cart's money are kept apart. Paying for lunch from the cash box is taking money out of the business. It's a gentle first look at "the business's money isn't your money."

### Fun stuff to buy
- **For the cart:** decals, an umbrella, a fan, balloons, a bell.
- **For your character:** hats, sunglasses, shirts.
- **Snacks and toys** from the corner store.
- These are mostly for fun. Spending on them vs. saving for a truck is the player's choice.

### Moving up
- **Play the cart as long as you like.** At any point, go to the bank for a truck loan, and the game continues as today's summer 1. The bank doesn't look at the cart's results.
- **Cart cash becomes the owner's share** of the new truck business: the first paper in the shoebox is "Owner put in $___". That's the first look at owner's share as money the owner put in, before any profit.
- The cart stays available as a **just-for-fun mini-game** from the title screen.
- Experienced players can skip straight to the truck.

## Zoom levels and time

The game has three speeds of play. Each one opens up as the business grows and stays available afterward (except driving, per the rule above).

| Zoom | Unit of play | Available | Player sees |
|---|---|---|---|
| **Street** | A day, minute by minute | Always (until 6+ trucks) | Today's street scene, for the truck the player drives or is watching |
| **Town** | A week | From 2 trucks | Town map with truck icons, a day ticker, and pop-ups for things needing a decision |
| **Region** | A month (or the whole summer) | From the second town | Region map with towns as units, monthly numbers, pop-ups |

- At Town and Region zoom, days still happen. They just run fast and show summaries. Events that need a decision (an employee quits, an accident, a big order) pause and pop up.
- **Zooming in is always allowed.** At any size, the player can pick any truck, shop or factory and watch it minute by minute at Street zoom. After 6 trucks they're watching, not driving. Zooming back out picks up where the fast play left off.

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

- **Everything pauses in winter.** Trucks, shops and factories don't sell or make anything. Winter costs still come due: storage, rent, and power for freezers (see [soft serve mix](#soft-serve-mix)).

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
| Counting supplies | Counting boxes in the truck view | Counts right a few weeks in a row | Penny, later a stock clerk |
| Thawing and filling the machine | Picking how much mix to thaw each night | A week or two with little waste and no running short | A rule the player sets, which drivers follow later |
| Loading trucks | Setting fill-to levels | A week or two with no trucks going out short | Stock clerk |
| Ordering supplies | Placing supplier orders | A few weeks with no sell-outs from late orders, and low spoilage | Purchasing manager, following the player's reorder rules (IDEAS.md: automatic reordering) |
| Prices and menu | Price panel | A week of no "too expensive" losses and decent margins | Driver or manager, within a price range the player sets |
| Routes | Map and week plan (today) | A week near the crowd-following bot's sales | Driver (skill decides how well) |
| Payroll | A weekly payroll paper per truck | Payroll papers filed right | Bookkeeper |
| Hiring | Picking from candidates | A few hires that last past their green period | Manager |
| Running a town | Boss handles every truck | Has hired and managed 6+ trucks | Town manager |
| Maintenance | Picking per truck each winter | A summer with no avoidable breakdowns | Fleet manager |

- The "good at it" checks should be visible but not preachy: a small badge on the job, plus one short line when something becomes available to hand off ("You're good at stocking now. A driver can do it for you.").
- **Open (decide when building phase 5):** each job's exact "good at it" test, tuned against the bots.

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

- **Space has a hard limit.** When a delivery doesn't all fit, the driver **takes back whatever doesn't fit** (refunded).
- Freezer, fridge and dry shelves are separate spaces (see [soft serve mix](#soft-serve-mix)).

### The restaurant store (starts in summer 1)

Today supplies appear the moment they're bought. Instead, the **restaurant store becomes a place on the town map**, and supplies can only be bought there.
- Going there takes driving time and gas, more from far away. A trip before opening means opening later. A trip mid-day means the truck is closed while it's away.
- It can be added to a route like any other stop, or visited from the map when the truck is about to run out.
- This makes "buy enough so you don't have to go back" vs. "don't buy too much" a real choice, even with one truck. That's a good lead-in to space limits.

### Inside the truck (starts in summer 1)

- A new **inside-the-truck view** shows the supplies as boxes and cartons: a freezer, a fridge, the soft serve machine, and shelves.
- **Space is limited from summer 1.** Boxes pile up as they're bought. When the shelves are full, boxes go **in front of** other boxes, so it gets harder to see what's there and how much. Opened boxes show how full they are.
- Buying more than fits isn't allowed. The store won't sell what can't be carried, and later a delivery takes back what doesn't fit.
- A garage shelf at home base can hold a little extra (rented with parking, or part of a garage). Moving boxes between the shelf and the truck happens on the morning drive out.

### Counting by hand (summer 1)

- The weekly "Inventory of supplies used" paper is **counted by hand** at first: the player opens the truck view, looks through the boxes (moving the ones in front), and writes down how much of each supply is left. Penny checks the count against the books.
- A tidy truck is easier to count. A crammed one hides things.
- Counting follows the same rule as everything else: count right a few weeks in a row, then it can be handed off (to Penny at first, later a stock clerk).
- **Shrinkage:** the books say how much should be there, and the count says what is. The gap is drops, waste, or a skimming employee. This gives bad apples another way to be caught.

### Soft serve mix

Mix spoiling gets closer to real life. It comes **frozen** and goes through three stages:

| Stage | Where | Keeps for (real life) | In the game (proposed) |
|---|---|---|---|
| **Frozen** | Freezer | 6 months to 2 years | All summer, and **through winter** if the freezer stays powered |
| **Thawed** | Fridge | 7–14 days | 10 days |
| **In the machine** | Soft serve machine | 2–3 days total. Overnight only in night mode | 3 days, then the machine must be cleaned out and what's left is thrown away |

- **Thawing takes planning.** Frozen mix has to thaw in the fridge overnight before it can go in the machine. Each evening the player decides how much to take out for tomorrow. Take out too little and you run short. Take out too much and it waits in the fridge (that's fine for a while).
- **The machine** holds a set amount. It's filled from thawed mix each morning. At night it's put in **night mode** (costs a little power) or emptied. Every few days it must be cleaned, and whatever is left in it is thrown away.
- **Freezer space is the tight one.** Dry boxes can go on shelves, but frozen mix needs freezer room. A bigger freezer is an upgrade for the truck, and later a reason to rent freezer space.
- **Winter:** frozen mix can be kept to next summer, but only if someone pays to keep the freezer on. Otherwise it's thrown out (today's rule).
- **Manual at first.** The player thaws by hand each evening. Once they do it well (little waste, no running short), they can set a rule instead ("thaw what I sold today", "thaw 2 cartons a night, 3 on weekends"), which a driver follows later.

### Morning load-out

- Each truck has **fill-to levels** for each supply ("start each day with 150 vanilla, 200 cake cones…"). Each morning, trucks are loaded from the supply room up to those levels.
- If the supply room runs short, trucks go out short and sell out early. The fleet screen shows which trucks went out short and of what.
- Loading takes a bit of time per truck, so a crowded supply room means a later start. Proposed: only matters at 6+ trucks, otherwise it's instant.
- At first the player sets fill-to levels per truck. Later, one rule can be set for all trucks, adjusted for each truck's sales.

### Ordering

| Way to buy | Size | Price | Wait | Notes |
|---|---|---|---|---|
| **Restaurant store** (today's shop) | A truck's worth | Full price | None | Someone has to drive there: time and gas, depending on distance (see [above](#the-restaurant-store-starts-in-summer-1)) |
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

## Serving at the truck window

An optional view **inside the truck at the window**, using the same serving and change-making as the [park cart](#the-park-cart-first-level): a customer orders, and the player picks the cone, pulls the soft serve, adds sprinkles, takes the money and **makes change** from the cash drawer. Always by hand and in real time.
- **Not required.** The truck serves on its own as it does today. The player can jump in for a few customers whenever they like.
- **The right size cone:** hold the lever to fill. Too small, and the customer is disappointed (a popularity hit). Too big uses extra mix, so each cone earns less. Just right gets a smile.
- **Doing it well matters a little:** a fast window keeps the line short, which pulls in people who would have walked by, and a tip jar collects tips.
- The truck needs a cash float too: start the day with change, and deposit at the ATM.

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
- **Firing:** any time, with no severance.
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
- **What do home-made supplies cost?** The **real cost to make**, so "Supplies used" simply gets cheaper. The per-unit report shows the factory as a cost center with "saved vs. store price". (The version where the factory "sells" to your own trucks is left out.)
- **How deep do chains go?** Factories first. Farms are a later, optional deeper step.

## Franchising

- Once the brand is strong (proposed: a profitable shop, or a town that's clearly working), other people can **buy a franchise**. They pay an **upfront fee** and a **royalty** (a share of their sales), and run a truck or shop under the player's name and colors.
- It's income without doing the work, but the player doesn't control quality. A bad franchisee can hurt the brand's popularity everywhere.
- **Works with vertical integration:** franchisees can be required to buy supplies from the player's factories, which is how many real franchises make their money.
- Franchise units sit on the region map but cost nothing to run.

## Investors and selling the business

### Investors (equity)
- From time to time a person offers cash for a slice of the company, for example **"Grandma Rose: $50,000 for 10% of the business."** Those IDEAS.md grandparents fit here.
- Once that happens, the company's owner's share is split between the player and the investors. **The goal counts only the player's part.** Selling slices lets the business grow faster, but each slice is profit given away forever. That's the lesson.
- Investors get no yearly payouts. They're paid their slice **when the business is sold**. **Open (decide when building phase 9):** whether the player can buy slices back.

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

- **Each new kind of paper** goes through the same rule: file it right a few times, then it can be handed to Penny.
- **Penny grows with the business.** She starts as the one bookkeeper and becomes **head of the accounting department**. As the papers grow, she hires bookkeepers under her (their pay shows up in her bill), and at CEO scale she hands the player yearly statements to review instead of papers to file.
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

- **Later summers go faster.** Real time per summer shrinks as play zooms out. Rough targets:

| Stage | Summers | Real time per summer | Total |
|---|---|---|---|
| Park cart | Before summer 1 | | ~30 minutes |
| Solo | 1–2 | ~1.5 hours | ~3 hours |
| Small fleet | 2–4 | ~1 hour | ~3 hours |
| Boss | 4–6 | ~40 minutes | ~2 hours |
| CEO | 6+ | ~20–30 minutes | ~2 hours to $1M |

  Measure in playtests and adjust zoom speeds (and how often things pop up) to hit these.

## Screens

Laptop first. The phone must work but can be cramped.

| Screen | When it matters | Contents |
|---|---|---|
| **Park** | Park cart | The cart, the line, the cash box, and the park behind |
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

Each phase is playable and merged on its own. Phases 3 and 4 can go in either order. [Serving at the truck window](#serving-at-the-truck-window) reuses the cart's serving and can go in any time after phase 0.

0. **The park cart.** *(Built.)* Character creation, buying stock in bulk at the restaurant store, packing the cooler, the corner store (ATM, change machine, snacks and toys), cash float, setting prices, selling and making change by hand, regulars with favorites, the line and tip jar, park scenes, other vendors, decals and clothes. Then a truck loan whenever the player wants, with cart cash as the owner's share. Also playable from the title screen.
1. **One truck, more real.** Restaurant store as a place on the map. Inside-the-truck view with space limits and boxes piling up. Counting by hand. Frozen, thawed and in-the-machine mix. Fits today's single-summer game, so it can ship before any fleet work.
2. **Fleet and crew.** Several trucks in the home town, with crowd splitting. Hire drivers from the bot pool, with wages, green period, call-offs, quits, bad apples and firing. The boss's day. Per-truck weekly papers and payroll. Profit by truck. Parking and storage. A supply room with fill-to levels and morning load-out (supplies still come from the restaurant store, now with a store run for each truck). Winter planning screen. Player-chosen end of summer. Town zoom (play by week).
3. **Ordering ahead.** Supplier deliveries with bulk prices and wait times, supplies on the way, supply room rent and space limits, freezer vs. dry space, supply counts and shrinkage, weather forecast.
4. **Aging fleet.** Depreciation, maintenance, breakdowns, used trucks, selling trucks, garage. Accidents and insurance. Bank offering growth loans. Cash crunch.
5. **Hand-offs and managers.** Generalize the do-it/get-good/hand-off rule to loading, ordering, prices, routes, payroll and hiring. Owned warehouses. Managers and span of control. Boss-only at 6+ trucks.
6. **More towns.** Region map, region zoom, fast model, town managers, per-town papers.
7. **Shops.** Rent or buy, equipment, shop staff.
8. **Factories.** Cone bakery first, then mix plant, candy and maybe farms. Selling extra output.
9. **Investors, franchising, selling out.** Equity slices, franchise fees and royalties, buyer offers, retirement, bankruptcy and new business. Leaderboard fields.

## Out of scope for now

- Rival ice cream companies (IDEAS.md: competitor truck). Saved for later.
- Hardcore mode.
- Overtime, hourly wages, taxes on wages.

## Decided

- Goal: $1M of the player's own owner's share. The game keeps going after that, until they sell.
- Driving ends at 6 trucks. Zooming in to watch is always allowed.
- Everything pauses in winter.
- Factory supplies are booked at the real cost to make. Factories come before farms.
- Investors are paid only when the business is sold.
- No severance.
- Penny becomes head of accounting.
- Space limits start in summer 1. Deliveries that don't fit go back.
- New players start with the park cart. Serving and making change are always by hand and in real time; waiting can be sped up.
- Serving well at the truck window helps a little: shorter line, tips, the right size cone.
- Thawing mix is by hand at first, then a rule once mastered.
- The park cart can be played as long as the player likes. A truck loan is available at any point, the bank ignores cart results, and cart cash becomes the owner's share of the truck business.
- The cart's cooler stays cold all day (battery). No melting.
- Change comes from a change machine next to the ATM at the corner store, which also sells snacks and toys.
- Cart stock is bought in bulk at the restaurant store.
