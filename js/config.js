// All the tunable numbers for Frozen Assets live here.
// Money is always in whole cents (100 = $1.00).

export const CONFIG = {
  seasonWeeks: 12,
  daysPerWeek: 7,
  dayStartMin: 10 * 60, // 10:00am
  dayEndMin: 20 * 60, // 8:00pm

  // Default loan and truck (used by the simulated players and old saves).
  loan: { principal: 1_000_000, truckCost: 990_000, dailyInterest: 300 },
  // Loans the bank offers. Bigger loans cost more interest per day, and more per extra dollar.
  loans: [
    { id: 'small', principal: 1_000_000, dailyInterest: 300 },
    { id: 'medium', principal: 1_100_000, dailyInterest: 450 },
    { id: 'large', principal: 1_200_000, dailyInterest: 650 },
  ],
  minStartCash: 10_000, // the truck must leave at least this much for supplies
  lateFee: { unpaidDays: 3, amount: 1000 },

  gas: { pricePerGal: 350, tankGal: 20, idleGalPerHour: 0.1, cruiseGalPerHour: 0.25, startGal: 20, autoFillBelow: 0.3 },

  // Arrival rate scale (bunches per hour at a "1.0" moment).
  demandScale: 4.9,
  seasonCurve: [0.55, 0.65, 0.8, 0.95, 1.05, 1.1, 1.1, 1.05, 0.95, 0.8, 0.65, 0.55],
  weekendBoost: 1.25,
  dayRandom: [0.9, 1.1],
  // A spot's crowd thins the longer you stay. Neighborhoods thin less: people keep coming home all day.
  // Time at other stops in the same area counts too (areaShare): it's the same families.
  saturation: { minutesToHalf: 240, floor: 0.45, homeFloor: 0.62, areaShare: 0.5 },

  // Drive time between neighborhoods in minutes: base + distance on the map.
  drive: { base: 5, perPx: 0.04 },
  // Driving around a neighborhood: a few minutes of streets between places. At a place, the truck parks
  // if parties come at least parkPerHour, and drives on after leaveIdle quiet minutes.
  cruise: { legMin: 6, legMax: 12, parkPerHour: 4, leaveIdle: 15, passMinutes: 1 },

  weather: {
    baseTemp: [76, 79, 83, 87, 90, 92, 92, 90, 87, 83, 79, 76],
    swing: 7,
    rainChance: 0.1,
    rainDemand: 0.4,
  },

  popularity: {
    start: 1.0,
    min: 0.4,
    max: 1.8,
    driftPerDay: 0.06, // pulls toward start each night
    // nightly change = (sum of the day's nudges) × moodScale ÷ max(moodMinCustomers, customers), capped
    moodScale: 12,
    moodMinCustomers: 40,
    moodCap: 0.1,
    greatDeal: 0.0015,
    tooExpensive: -0.0015,
    outOfStockMad: -0.008,
    noTopping: -0.001,
    noNapkin: -0.001,
    serviceSaved: 0.001,
    dropReplaced: 0.004,
    dropRefused: -0.006,
    giftCardFree: 0.003,
    promoCard: 0.003,
  },

  // Ads: target "buzz" each tier builds toward; buzz multiplies arrivals by (1 + buzz).
  ads: [
    { id: 'none', name: 'None', cost: 0, buzz: 0 },
    { id: 'flyers', name: 'Flyers', cost: 1500, buzz: 0.12 },
    { id: 'radio', name: 'Radio ad', cost: 5000, buzz: 0.22 },
    { id: 'billboard', name: 'Billboard', cost: 16000, buzz: 0.3 },
  ],
  buzzRisePerDay: 0.3,
  buzzFadePerDay: 0.12,

  rebrand: { paint: 15000, sign: 10000, paintPull: 0.25, signPull: 0.75 },

  credit: { surcharge: 0.05, limit: 15000, termDays: 7, lateFee: 500 },

  sales: { chanceEarly: 0.05, chanceLate: 0.18, minOff: 0.2, maxOff: 0.4 },

  sellBackRate: 0.5,

  // Penny the bookkeeper sends a bill every week: a flat fee, plus a fee for each paper she filed for you.
  // She'll only take over a kind of paper after `streak` first-try rights in a row, and every
  // `checkEvery`th one still comes back so you can check her work.
  filing: { streak: 3, checkEvery: 3, weeklyFee: 1000, perPaper: 300 },
  giftCard: { face: 500, buyChance: 0.025, discountBoost: 4, returnMinDays: 1, returnMaxDays: 14 },

  dropChance: 0.02,

  // What a typical customer thinks is fair (cents).
  fairPrice: { cake: 300, sugar: 350, waffle: 450, bowl: 300, rocketPop: 125, fudgePop: 150, freezePop: 60 },
  fairTopping: 50,
  wtpRange: [0.85, 1.6],
  // How often each kind of person wants a popsicle instead of ice cream (when pops are on the menu).
  popWant: { kid: 0.08, teen: 0.05, adult: 0.02 },

  // Kids out on their own sometimes only have pocket money. They buy only if something costs that much or less.
  pocket: { chance: 0.18, amounts: [[100, 6], [75, 2], [50, 1]] },

  // Driving: people on the sidewalk wave the truck down. Rate = share × the crowd at the nearer stop.
  curb: { share: 0.35, stopMinutes: 2 },
  // Families who already bought from you today come back by: a hint it's time to move on. Only once a
  // spot's crowd has thinned to `below` (well past a sensible stay), and at most `perArea` times a day per neighborhood.
  alreadyHad: { share: 0.5, below: 0.65, perArea: 2 },
};

// Starting menu prices (cents).
export const START_PRICES = { cake: 300, sugar: 350, waffle: 450, bowl: 300, chocSprinkles: 50, rainbowSprinkles: 50, rocketPop: 100, fudgePop: 125, freezePop: 50 };

// Supplies. "unit" is what one pack count means. Mix is tracked in half-servings internally.
export const SUPPLIES = [
  { id: 'vanilla', name: 'Vanilla soft serve mix', short: 'Vanilla mix', unit: 'servings', emoji: '🍦', use: 'Each scoop uses 1 serving. A swirl uses half vanilla, half chocolate. Mix spoils after 5 days!', shelfLife: 5, halfUnits: true,
    packs: [{ size: 50, price: 2000 }, { size: 200, price: 7000 }, { size: 1000, price: 30000 }] },
  { id: 'chocolate', name: 'Chocolate soft serve mix', short: 'Chocolate mix', unit: 'servings', emoji: '🍫', use: 'Each scoop uses 1 serving. A swirl uses half vanilla, half chocolate. Mix spoils after 5 days!', shelfLife: 5, halfUnits: true,
    packs: [{ size: 50, price: 2000 }, { size: 200, price: 7000 }, { size: 1000, price: 30000 }] },
  { id: 'cake', name: 'Cake cones', short: 'Cake cones', unit: 'cones', emoji: '🧇', use: 'One cone for every cake cone order.',
    packs: [{ size: 100, price: 800 }, { size: 500, price: 3000 }, { size: 5000, price: 25000 }] },
  { id: 'sugar', name: 'Sugar cones', short: 'Sugar cones', unit: 'cones', emoji: '🍨', use: 'One cone for every sugar cone order.',
    packs: [{ size: 100, price: 1500 }, { size: 500, price: 6000 }, { size: 5000, price: 50000 }] },
  { id: 'waffle', name: 'Waffle cones', short: 'Waffle cones', unit: 'cones', emoji: '🥞', use: 'One cone for every waffle cone order.',
    packs: [{ size: 100, price: 4000 }, { size: 500, price: 17500 }, { size: 5000, price: 150000 }] },
  { id: 'bowl', name: 'Bowls', short: 'Bowls', unit: 'bowls', emoji: '🥣', use: 'One bowl for every bowl order. Bowls also need a spoon!',
    packs: [{ size: 100, price: 600 }, { size: 500, price: 2500 }, { size: 5000, price: 20000 }] },
  { id: 'chocSprinkles', name: 'Chocolate sprinkles', short: 'Choc sprinkles', unit: 'servings', emoji: '🟫', use: 'One serving on each ice cream that gets chocolate sprinkles.',
    packs: [{ size: 100, price: 600 }, { size: 500, price: 2500 }, { size: 5000, price: 20000 }] },
  { id: 'rainbowSprinkles', name: 'Rainbow sprinkles', short: 'Rainbow sprinkles', unit: 'servings', emoji: '🌈', use: 'One serving on each ice cream that gets rainbow sprinkles.',
    packs: [{ size: 100, price: 600 }, { size: 500, price: 2500 }, { size: 5000, price: 20000 }] },
  { id: 'rocketPop', name: 'Rocket pops', short: 'Rocket pops', unit: 'pops', emoji: '🚀', use: 'Red, white and blue. Sold as is: 1 pop per sale. Pops stay frozen all summer.',
    packs: [{ size: 24, price: 720 }, { size: 100, price: 2500 }, { size: 500, price: 10000 }] },
  { id: 'fudgePop', name: 'Fudge pops', short: 'Fudge pops', unit: 'pops', emoji: '🍫', use: 'Chocolate on a stick. Sold as is: 1 pop per sale. Pops stay frozen all summer.',
    packs: [{ size: 24, price: 840 }, { size: 100, price: 3000 }, { size: 500, price: 12500 }] },
  { id: 'freezePop', name: 'Freeze pops', short: 'Freeze pops', unit: 'pops', emoji: '🧊', use: 'Little ice tubes. Cheap! Sold as is: 1 per sale. Pops stay frozen all summer.',
    packs: [{ size: 50, price: 400 }, { size: 250, price: 1500 }, { size: 1000, price: 5000 }] },
  { id: 'spoons', name: 'Spoons', short: 'Spoons', unit: 'spoons', emoji: '🥄', use: "Every bowl needs a spoon. No spoons = you can't sell bowls! (Dogs don't need one.)",
    packs: [{ size: 100, price: 200 }, { size: 1000, price: 1000 }] },
  { id: 'napkins', name: 'Napkins', short: 'Napkins', unit: 'napkins', emoji: '🧻', use: 'Each grown-up takes 1 napkin and each kid takes 1 to 3. No napkins = sticky, grumpy customers.',
    packs: [{ size: 100, price: 200 }, { size: 1000, price: 1000 }] },
];
export const SUPPLY = Object.fromEntries(SUPPLIES.map((s) => [s.id, s]));

export const FLAVORS = [
  { id: 'vanilla', name: 'Vanilla' },
  { id: 'chocolate', name: 'Chocolate' },
  { id: 'swirl', name: 'Swirl' },
];
export const CONTAINERS = [
  { id: 'cake', name: 'Cake cone' },
  { id: 'sugar', name: 'Sugar cone' },
  { id: 'waffle', name: 'Waffle cone' },
  { id: 'bowl', name: 'Bowl' },
];
// Popsicles: sold as is, one supply each. A cheap way to sell to kids with only a little money.
export const POPS = [
  { id: 'rocketPop', name: 'Rocket pop', want: 4 },
  { id: 'fudgePop', name: 'Fudge pop', want: 3 },
  { id: 'freezePop', name: 'Freeze pop', want: 3 },
];
export const POP = Object.fromEntries(POPS.map((p) => [p.id, p]));
export const isPop = (item) => !!item?.pop;
// Key used to count sales: "vanilla-cake", or a pop id like "rocketPop".
export const itemKey = (item) => (item.pop ? item.pop : `${item.flavor}-${item.container}`);
export const itemFromKey = (key) => {
  if (POP[key]) return { pop: key };
  const [flavor, container, topping] = key.split('-');
  return { flavor, container, topping: topping || null };
};

export const TOPPINGS = [
  { id: 'chocSprinkles', name: 'Chocolate sprinkles' },
  { id: 'rainbowSprinkles', name: 'Rainbow sprinkles' },
];

// The town: six neighborhoods to pick from when planning a route. In each one the truck drives
// around the streets and pulls over at a place when it's busy. pay scales what people will spend,
// pocket how many kids have only pocket money, streets how many people are out on the streets.
// density is how close together the homes are (never shown as a number; the map and street view show it):
// more people live near any corner, so more come out to the truck, and the drive between places is shorter.
// x/y place the neighborhood's pin on the map (0–1000 × 0–700); style picks the buildings you see.
export const SPOTS = [
  { id: 'maple', name: 'Maple Street', pay: 1.0, pocket: 1.0, streets: 1.0, density: 1.0, x: 185, y: 175, style: 'maple', tint: '#ffe8c2',
    about: 'Neat blocks of family houses' },
  { id: 'oak', name: 'Oak Hollow', pay: 0.95, pocket: 1.4, streets: 0.9, density: 0.85, x: 185, y: 515, style: 'oak', tint: '#e3f2c1',
    about: 'Curvy streets and cul-de-sacs full of kids' },
  { id: 'sunset', name: 'Sunset Ridge', pay: 1.25, pocket: 0.4, streets: 0.65, density: 0.6, x: 815, y: 175, style: 'sunset', tint: '#fde2e4',
    about: 'Big houses up on the hill' },
  { id: 'riverside', name: 'Riverside', pay: 0.92, pocket: 1.6, streets: 0.95, density: 0.95, x: 815, y: 515, style: 'riverside', tint: '#d7ecff',
    about: 'Houses along the river' },
  { id: 'downtown', name: 'Downtown', pay: 1.05, pocket: 0.8, streets: 0.6, density: 1.4, x: 500, y: 305, style: 'downtown', tint: '#e9e4f5',
    about: 'Offices, shops and the market' },
  { id: 'parkside', name: 'Parkside', pay: 1.05, pocket: 1.0, streets: 0.6, density: 0.8, x: 500, y: 570, style: 'parkside', tint: '#d8f3dc',
    about: 'The big park and the zoo' },
];
export const SPOT = Object.fromEntries(SPOTS.map((s) => [s.id, s]));

// The places in each neighborhood. kind sets who comes and when; size scales the crowd.
export const FEATURES = [
  { id: 'maplePlay', name: 'Maple Playground', kind: 'playground', area: 'maple', size: 0.7 },
  { id: 'school', name: 'Maple School', kind: 'school', area: 'maple' },
  { id: 'mapleLibrary', name: 'Maple Library', kind: 'library', area: 'maple', size: 0.8 },

  { id: 'oakPlay', name: 'Oak Tot Lot', kind: 'playground', area: 'oak', size: 0.6 },
  { id: 'fields', name: 'Oak Ball Fields', kind: 'fields', area: 'oak' },
  { id: 'oakPool', name: 'Oak Pool', kind: 'pool', area: 'oak', size: 0.75 },

  { id: 'sunsetPlay', name: 'Hilltop Playground', kind: 'playground', area: 'sunset', size: 0.5 },
  { id: 'sunsetPool', name: 'Sunset Pool', kind: 'pool', area: 'sunset', size: 0.85 },
  { id: 'sunsetSchool', name: 'Sunset School', kind: 'school', area: 'sunset', size: 0.8 },

  { id: 'riverPlay', name: 'River Playground', kind: 'playground', area: 'riverside', size: 0.7 },
  { id: 'pool', name: 'Riverside Pool', kind: 'pool', area: 'riverside' },
  { id: 'riverFields', name: 'River Ball Fields', kind: 'fields', area: 'riverside', size: 0.8 },
  { id: 'riverLibrary', name: 'Riverside Library', kind: 'library', area: 'riverside', size: 0.6 },

  { id: 'cityHall', name: 'City Hall', kind: 'office', area: 'downtown', size: 0.7, weekend: 0.1 },
  { id: 'techPark', name: 'Tech Park', kind: 'office', area: 'downtown', size: 1.1, weekend: 0.1, pay: 1.1 },
  { id: 'mainSt', name: 'Main St Offices', kind: 'office', area: 'downtown', size: 1.0, weekend: 0.7 },
  { id: 'market', name: 'Farmers Market', kind: 'market', area: 'downtown' },
  { id: 'downtownPlay', name: 'Pocket Park', kind: 'playground', area: 'downtown', size: 0.35 },

  { id: 'park', name: 'Central Park', kind: 'park', area: 'parkside' },
  { id: 'zoo', name: 'City Zoo', kind: 'zoo', area: 'parkside', pay: 1.1 },
  { id: 'parkPlay', name: 'Parkside Playground', kind: 'playground', area: 'parkside', size: 0.8 },
  { id: 'parkFields', name: 'Big League Fields', kind: 'fields', area: 'parkside', size: 0.7 },
];
export const FEATURE = Object.fromEntries(FEATURES.map((f) => [f.id, f]));

// Everywhere customers come from: a neighborhood's streets (same id as the neighborhood) and its places.
export const LOCS = {
  ...Object.fromEntries(SPOTS.map((s) => [s.id, { id: s.id, name: s.name, kind: 'home', area: s.id, size: s.streets * s.density }])),
  ...FEATURE,
};
// Saves from before the town had six neighborhoods named single places.
export const LEGACY_SPOT = {
  school: 'maple', maplePlay: 'maple', oakPlay: 'oak', fields: 'oak', oakPool: 'oak', sunsetPool: 'sunset', sunsetSchool: 'sunset',
  pool: 'riverside', riverPlay: 'riverside', riverFields: 'riverside', cityHall: 'downtown', techPark: 'downtown', market: 'downtown',
  zoo: 'parkside', park: 'parkside',
};
export const destOf = (id) => (SPOT[id] ? id : LEGACY_SPOT[id] || null);

// The farmers market is open these days (0 = Monday), 10am–2pm.
export const MARKET_DAYS = [2, 5];
// Office workers spend a bit more than other grown-ups.
export const OFFICE_ADULT_PAY = 1.08;

// Who shows up where. groups are weighted party types; "times" override them for part of the day
// (hours, 24h clock). dropMult scales how often cones hit the ground at that kind of spot.
export const CROWDS = {
  home: {
    dropMult: 1,
    groups: { family: 3, parentKid: 3, soloKid: 2, kids: 2, dog: 2, soloAdult: 1, adults: 1, teens: 1 },
    times: [
      { from: 10, to: 15, groups: { kids: 3, soloKid: 3, parentKid: 3, family: 2, dog: 1, teens: 1, soloAdult: 1 } },
      { from: 17, to: 20, groups: { family: 5, parentKid: 3, dog: 3, adults: 2, kids: 1, soloAdult: 1, teens: 1 } },
    ],
  },
  school: {
    dropMult: 3.5, // climbing around with a cone in one hand
    groups: { kids: 4, soloKid: 3, parentKid: 4, family: 2, teens: 0.5 },
    times: [{ from: 14.5, to: 16, groups: { kids: 6, soloKid: 4, parentKid: 4, family: 1, teens: 1 } }],
  },
  pool: {
    dropMult: 1.8, // wet, slippery hands
    groups: { family: 3, kids: 3, soloKid: 2, parentKid: 2, teens: 2 },
    times: [{ from: 13, to: 18, groups: { teens: 5, kids: 3, family: 2, soloKid: 2, parentKid: 1 } }],
  },
  playground: {
    dropMult: 3.5,
    groups: { parentKid: 5, kids: 4, soloKid: 3, family: 3, teens: 0.3 },
  },
  office: {
    dropMult: 0.5,
    hint: false, // grown-ups at work don't come by with kids
    groups: { soloAdult: 4, adults: 3, dog: 2, parentKid: 1, teens: 1 },
    times: [
      { from: 11.5, to: 13.5, groups: { soloAdult: 6, adults: 5, dog: 1 } },
      { from: 15, to: 20, groups: { soloAdult: 3, adults: 2, dog: 2, teens: 2, parentKid: 1, family: 1 } },
    ],
  },
  fields: {
    dropMult: 2,
    groups: { family: 3, kids: 3, adults: 2, parentKid: 2, teens: 2 },
    times: [{ from: 17, to: 20, groups: { family: 4, kids: 4, parentKid: 2, adults: 2, teens: 1 } }],
  },
  library: {
    dropMult: 1.2,
    groups: { parentKid: 5, family: 3, kids: 2, soloKid: 2, soloAdult: 2, teens: 1 },
  },
  market: {
    dropMult: 1,
    groups: { soloAdult: 3, adults: 3, family: 3, parentKid: 3, dog: 2, kids: 0.5 },
  },
  zoo: {
    dropMult: 2,
    groups: { family: 6, parentKid: 4, kids: 1, adults: 1, teens: 1 },
  },
  park: {
    dropMult: 1.5,
    groups: { parentKid: 3, dog: 3, family: 2, soloAdult: 2, adults: 2, kids: 2, soloKid: 1, teens: 2 },
    times: [{ from: 11.5, to: 13.5, groups: { soloAdult: 5, adults: 3, dog: 2, parentKid: 2, family: 1 } }],
  },
};
// Who's out on the streets: office workers downtown, park-goers in Parkside, families everywhere else.
export const STREET_CROWD = { downtown: 'office', parkside: 'park' };
// How likely each kind of person is to drop a cone, relative to a kid.
export const DROP_BY_PERSON = { kid: 1, teen: 0.5, adult: 0.1, dog: 0 };


// Trucks for sale. Every color costs the same; bling costs extra up front and is just for looks.
export const TRUCK_PRICE = 970_000;
export const TRUCK_COLORS = [
  { id: 'white', name: 'Vanilla', hex: '#fff7ea' },
  { id: 'sky', name: 'Sky', hex: '#7cc8ff' },
  { id: 'mint', name: 'Mint', hex: '#7fe3c4' },
  { id: 'pink', name: 'Bubblegum', hex: '#ff8fc7' },
  { id: 'lemon', name: 'Lemon', hex: '#ffe066' },
  { id: 'grape', name: 'Grape', hex: '#b69cff' },
  { id: 'cherry', name: 'Cherry', hex: '#ff6b6b' },
  { id: 'orange', name: 'Creamsicle', hex: '#ffab5e' },
];
// Each level includes everything from the levels before it.
export const BLING = [
  { level: 0, name: 'Plain', emoji: '🚚', price: 0, about: 'Just the truck.' },
  { level: 1, name: 'Sparkle stickers', emoji: '✨', price: 15_000, about: 'Stars and hearts all over.' },
  { level: 2, name: 'Chrome & lights', emoji: '💡', price: 30_000, about: 'Stickers, shiny chrome and a row of lights.' },
  { level: 3, name: 'Deluxe', emoji: '👑', price: 80_000, about: 'Everything, plus gold trim and party flags.' },
];

// ---------- The park cart (the first level) ----------
// Popsicles and Italian ice from a push cart cooler at the park. Money is counted bill by bill here,
// so every pile of money is a count of each bill and coin: { 2000: 1, 100: 3, 25: 2 } = $23.50.
export const CART = {
  denoms: [2000, 1000, 500, 100, 25], // $20, $10, $5, $1, quarters (prices go up by quarters)
  // Grandma gives $40 to start the cart (in the cash box); your wallet has $10 of your own.
  start: { box: { 2000: 2 }, wallet: { 500: 1, 100: 5 } },
  homeStart: 11 * 60, // the day starts at home at 11am
  parkOpen: 12 * 60, // four hours at the park, noon to 4pm
  parkClose: 16 * 60,
  // Minutes each errand takes. From the park, the corner store means closing the cart for a bit.
  errand: { restaurant: 45, corner: 15, cornerFromPark: 20 },
  coolerSpace: 40, // a pop takes 1 space, a tub of Italian ice takes tubSpace
  freezerSpace: 300, // the freezer at home, which holds everything that isn't in the cooler
  tubScoops: 20,
  tubSpace: 8,
  priceStep: 25,
  vendorMistake: 0.15, // how often a seller gets your change wrong
};

export const CART_ITEMS = [
  { id: 'rocketPop', name: 'Rocket pop', kind: 'pop', fair: 150, want: 4 },
  { id: 'fudgePop', name: 'Fudge pop', kind: 'pop', fair: 175, want: 3 },
  { id: 'freezePop', name: 'Freeze pop', kind: 'pop', fair: 50, want: 3 },
  { id: 'iceCherry', name: 'Cherry ice', kind: 'ice', fair: 200, want: 3, color: '#ff4d6d' },
  { id: 'iceLemon', name: 'Lemon ice', kind: 'ice', fair: 200, want: 2, color: '#ffe066' },
  { id: 'iceBlue', name: 'Blue ice', kind: 'ice', fair: 200, want: 3, color: '#4cc9f0' },
];
export const CART_ITEM = Object.fromEntries(CART_ITEMS.map((i) => [i.id, i]));

// What the shops sell. kind: stock (goes in the freezer), cups, gear (for the cart), decal, balloon,
// hat, glasses, shirt, snack (eaten right away), toy (yours to keep).
export const CART_SHOPS = {
  restaurant: {
    name: 'Restaurant store',
    icon: '🏬',
    items: [
      { id: 'rocketBox', name: 'Rocket pops', note: 'box of 24', kind: 'stock', item: 'rocketPop', qty: 24, price: 900 },
      { id: 'fudgeBox', name: 'Fudge pops', note: 'box of 24', kind: 'stock', item: 'fudgePop', qty: 24, price: 1100 },
      { id: 'freezeBox', name: 'Freeze pops', note: 'box of 50', kind: 'stock', item: 'freezePop', qty: 50, price: 450 },
      { id: 'cherryTub', name: 'Cherry ice', note: 'tub, 20 scoops', kind: 'stock', item: 'iceCherry', tubs: 1, price: 800 },
      { id: 'lemonTub', name: 'Lemon ice', note: 'tub, 20 scoops', kind: 'stock', item: 'iceLemon', tubs: 1, price: 800 },
      { id: 'blueTub', name: 'Blue ice', note: 'tub, 20 scoops', kind: 'stock', item: 'iceBlue', tubs: 1, price: 800 },
      { id: 'cups', name: 'Cups & spoons', note: 'pack of 50', kind: 'cups', qty: 50, price: 250 },
      { id: 'umbrella', name: 'Big umbrella', note: 'shade for the cart', kind: 'gear', price: 1500 },
      { id: 'fan', name: 'Little fan', note: 'whirrr', kind: 'gear', price: 800 },
      { id: 'bell', name: 'Bell', note: 'ding ding!', kind: 'gear', price: 500 },
    ],
  },
  corner: {
    name: 'Corner store',
    icon: '🏪',
    items: [
      { id: 'gum', name: 'Bubble gum', kind: 'snack', price: 100, emoji: '🫧' },
      { id: 'chips', name: 'Chips', kind: 'snack', price: 150, emoji: '🥔' },
      { id: 'juice', name: 'Juice box', kind: 'snack', price: 125, emoji: '🧃' },
      { id: 'ball', name: 'Bouncy ball', kind: 'toy', price: 100, emoji: '🔴' },
      { id: 'car', name: 'Toy car', kind: 'toy', price: 250, emoji: '🏎️' },
      { id: 'yoyo', name: 'Yo-yo', kind: 'toy', price: 300, emoji: '🪀' },
      { id: 'kite', name: 'Kite', kind: 'toy', price: 600, emoji: '🪁' },
      { id: 'shades', name: 'Sunglasses', kind: 'glasses', price: 500, emoji: '🕶️' },
      { id: 'cap', name: 'Ball cap', kind: 'hat', price: 600, emoji: '🧢' },
      { id: 'sunhat', name: 'Sun hat', kind: 'hat', price: 800, emoji: '👒' },
      { id: 'beanie', name: 'Propeller hat', kind: 'hat', price: 700, emoji: '🌀' },
      { id: 'crown', name: 'Crown', kind: 'hat', price: 1000, emoji: '👑' },
      { id: 'shirtMint', name: 'Mint shirt', kind: 'shirt', price: 800, color: '#3cc6a0' },
      { id: 'shirtGrape', name: 'Grape shirt', kind: 'shirt', price: 800, color: '#7d5ba6' },
      { id: 'shirtSun', name: 'Sunny shirt', kind: 'shirt', price: 800, color: '#ffd23f' },
      { id: 'shirtStars', name: 'Star shirt', kind: 'shirt', price: 1000, color: '#3a8ee6', stars: true },
    ],
  },
  hotdog: {
    name: 'Hot dog stand',
    icon: '🌭',
    items: [
      { id: 'hotdog', name: 'Hot dog', kind: 'snack', price: 250, emoji: '🌭' },
      { id: 'lemonade', name: 'Lemonade', kind: 'snack', price: 150, emoji: '🍋' },
      { id: 'pretzel', name: 'Pretzel', kind: 'snack', price: 200, emoji: '🥨' },
    ],
  },
  balloons: {
    name: 'Balloon seller',
    icon: '🎈',
    items: [
      { id: 'balloonRed', name: 'Red balloon', note: 'tied to your cart today', kind: 'balloon', price: 150, color: '#e5484d' },
      { id: 'balloonBlue', name: 'Blue balloon', note: 'tied to your cart today', kind: 'balloon', price: 150, color: '#3a8ee6' },
      { id: 'balloonPink', name: 'Pink balloon', note: 'tied to your cart today', kind: 'balloon', price: 150, color: '#ff6f91' },
    ],
  },
  decals: {
    name: 'Sticker stand',
    icon: '✨',
    items: [
      { id: 'decalStar', name: 'Star sticker', kind: 'decal', price: 200, emoji: '⭐' },
      { id: 'decalHeart', name: 'Heart sticker', kind: 'decal', price: 200, emoji: '💖' },
      { id: 'decalFlower', name: 'Flower sticker', kind: 'decal', price: 250, emoji: '🌼' },
      { id: 'decalRainbow', name: 'Rainbow sticker', kind: 'decal', price: 300, emoji: '🌈' },
      { id: 'decalRocket', name: 'Rocket sticker', kind: 'decal', price: 300, emoji: '🚀' },
      { id: 'decalCone', name: 'Ice cream sticker', kind: 'decal', price: 300, emoji: '🍦' },
    ],
  },
};
// Things that make the cart look nicer bring a few more people over.
export const CART_LOOKS = { perDecal: 0.02, umbrella: 0.05, bell: 0.04, balloon: 0.08, max: 0.3 };

// Who walks by the park and what they do.
export const CART_CROWD = {
  // people walking past per hour, noon to 4pm (about a dozen customers on a normal day)
  perHour: [6, 7, 7, 6],
  weekendBoost: 1.3,
  rain: 0.35,
  hotPerDegree: 0.03, // more people want something cold for every degree over 80°F
  baseTemp: 82,
  tempSwing: 9,
  rainChance: 0.12,
  join: 0.34, // chance someone walking by wants something
  lineJoin: [1, 0.85, 0.65, 0.45, 0.3, 0.15], // fewer people join a longer line
  patience: [8, 16], // game minutes someone waits in line before giving up
  kinds: { kid: 4, teen: 2, adult: 2.5, parentKid: 1.5 },
  wtp: { kid: [0.9, 1.4], teen: [1, 1.5], adult: [1.05, 1.7] }, // most they'll pay, times the fair price
  honest: 0.7, // gives back extra change
  exact: 0.3, // pays with exact money when they can
  fastSeconds: 20, // a sale this quick (real seconds) might get a tip
  tip: { fast: 0.25, slow: 0.06, amounts: [25, 25, 50, 100] },
  regular: { visit: 0.5, wtp: 1.4, missLimit: 3, awayDays: 5, friend: 0.3 },
};

// Regulars: the same people most days, each with a favorite.
export const REGULARS = [
  { id: 'maya', name: 'Maya', kind: 'kid', look: 1, fav: 'iceCherry' },
  { id: 'jayden', name: 'Jayden', kind: 'kid', look: 4, fav: 'rocketPop' },
  { id: 'ortiz', name: 'Mr. Ortiz', kind: 'adult', look: 10, fav: 'fudgePop' },
  { id: 'lou', name: 'Grandma Lou', kind: 'adult', look: 7, fav: 'iceLemon' },
  { id: 'priya', name: 'Priya', kind: 'teen', look: 3, fav: 'iceBlue' },
  { id: 'theo', name: 'Theo', kind: 'kid', look: 6, fav: 'freezePop' },
];

export const LEADERBOARD = {
  // Not secret: the token (pasted per device in Settings) is what grants access.
  baseId: 'appf6frKyQZNEKBep',
  tableName: 'Scores',
};
