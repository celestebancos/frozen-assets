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
  cruise: { legMin: 4, legMax: 9, parkPerHour: 4, leaveIdle: 15, passMinutes: 1 },

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

  // Papers a kid keeps filing right: after `streak` first-try rights in a row, Penny files that kind
  // for them, except every `checkEvery`th one still comes to the kid to keep them sharp.
  filing: { streak: 3, checkEvery: 3 },
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
  // Families who already bought from you today come back by. Rate = share × the people a tired spot is missing.
  alreadyHad: { share: 0.5 },
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
// x/y place the neighborhood's pin on the map (0–1000 × 0–700); style picks the buildings you see.
export const SPOTS = [
  { id: 'maple', name: 'Maple Street', pay: 1.0, pocket: 1.0, streets: 1.0, x: 185, y: 175, style: 'maple', tint: '#ffe8c2',
    about: 'Neat blocks of family houses' },
  { id: 'oak', name: 'Oak Hollow', pay: 0.95, pocket: 1.4, streets: 0.9, x: 185, y: 515, style: 'oak', tint: '#e3f2c1',
    about: 'Curvy streets and cul-de-sacs full of kids' },
  { id: 'sunset', name: 'Sunset Ridge', pay: 1.25, pocket: 0.4, streets: 0.65, x: 815, y: 175, style: 'sunset', tint: '#fde2e4',
    about: 'Big houses up on the hill' },
  { id: 'riverside', name: 'Riverside', pay: 0.92, pocket: 1.6, streets: 0.95, x: 815, y: 515, style: 'riverside', tint: '#d7ecff',
    about: 'Houses along the river' },
  { id: 'downtown', name: 'Downtown', pay: 1.05, pocket: 0.8, streets: 0.6, x: 500, y: 305, style: 'downtown', tint: '#e9e4f5',
    about: 'Offices, shops and the market' },
  { id: 'parkside', name: 'Parkside', pay: 1.05, pocket: 1.0, streets: 0.6, x: 500, y: 570, style: 'parkside', tint: '#d8f3dc',
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
  ...Object.fromEntries(SPOTS.map((s) => [s.id, { id: s.id, name: s.name, kind: 'home', area: s.id, size: s.streets }])),
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

export const LEADERBOARD = {
  // Not secret: the token (pasted per device in Settings) is what grants access.
  baseId: 'appf6frKyQZNEKBep',
  tableName: 'Scores',
};
