// All the tunable numbers for Frozen Assets live here.
// Money is always in whole cents (100 = $1.00).

export const CONFIG = {
  seasonWeeks: 12,
  daysPerWeek: 7,
  dayStartMin: 10 * 60, // 10:00am
  dayEndMin: 20 * 60, // 8:00pm

  loan: { principal: 1_000_000, truckCost: 990_000, dailyInterest: 300 },
  lateFee: { unpaidDays: 3, amount: 1000 },

  gas: { pricePerGal: 350, tankGal: 20, idleGalPerHour: 0.1, startGal: 20, autoFillBelow: 0.3 },

  // Arrival rate scale (bunches per hour at a "1.0" moment).
  demandScale: 3.9,
  seasonCurve: [0.55, 0.65, 0.8, 0.95, 1.05, 1.1, 1.1, 1.05, 0.95, 0.8, 0.65, 0.55],
  weekendBoost: 1.25,
  dayRandom: [0.9, 1.1],
  // Spot crowd thins the longer you stay there today.
  // A spot's crowd thins the longer you stay. Neighborhoods thin less: people keep coming home all day.
  saturation: { minutesToHalf: 240, floor: 0.45, homeFloor: 0.7 },

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
    giftCardExact: 0.003,
    giftCardForfeit: -0.004,
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

  giftCard: { face: 500, buyChance: 0.025, discountBoost: 4, returnMinDays: 1, returnMaxDays: 14 },

  dropChance: 0.02,

  // What a typical customer thinks is fair (cents).
  fairPrice: { cake: 300, sugar: 350, waffle: 450, bowl: 300 },
  fairTopping: 50,
  wtpRange: [0.85, 1.6],
};

// Supplies. "unit" is what one pack count means. Mix is tracked in half-servings internally.
export const SUPPLIES = [
  { id: 'vanilla', name: 'Vanilla soft serve mix', short: 'Vanilla mix', unit: 'servings', emoji: '🍦', shelfLife: 5, halfUnits: true,
    packs: [{ size: 50, price: 2000 }, { size: 200, price: 7000 }, { size: 1000, price: 30000 }] },
  { id: 'chocolate', name: 'Chocolate soft serve mix', short: 'Chocolate mix', unit: 'servings', emoji: '🍫', shelfLife: 5, halfUnits: true,
    packs: [{ size: 50, price: 2000 }, { size: 200, price: 7000 }, { size: 1000, price: 30000 }] },
  { id: 'cake', name: 'Cake cones', short: 'Cake cones', unit: 'cones', emoji: '🧇',
    packs: [{ size: 100, price: 800 }, { size: 500, price: 3000 }, { size: 5000, price: 25000 }] },
  { id: 'sugar', name: 'Sugar cones', short: 'Sugar cones', unit: 'cones', emoji: '🍨',
    packs: [{ size: 100, price: 1500 }, { size: 500, price: 6000 }, { size: 5000, price: 50000 }] },
  { id: 'waffle', name: 'Waffle cones', short: 'Waffle cones', unit: 'cones', emoji: '🥞',
    packs: [{ size: 100, price: 4000 }, { size: 500, price: 17500 }, { size: 5000, price: 150000 }] },
  { id: 'bowl', name: 'Bowls', short: 'Bowls', unit: 'bowls', emoji: '🥣',
    packs: [{ size: 100, price: 600 }, { size: 500, price: 2500 }, { size: 5000, price: 20000 }] },
  { id: 'chocSprinkles', name: 'Chocolate sprinkles', short: 'Choc sprinkles', unit: 'servings', emoji: '🟫',
    packs: [{ size: 100, price: 600 }, { size: 500, price: 2500 }, { size: 5000, price: 20000 }] },
  { id: 'rainbowSprinkles', name: 'Rainbow sprinkles', short: 'Rainbow sprinkles', unit: 'servings', emoji: '🌈',
    packs: [{ size: 100, price: 600 }, { size: 500, price: 2500 }, { size: 5000, price: 20000 }] },
  { id: 'spoons', name: 'Spoons', short: 'Spoons', unit: 'spoons', emoji: '🥄',
    packs: [{ size: 100, price: 200 }, { size: 1000, price: 1000 }] },
  { id: 'napkins', name: 'Napkins', short: 'Napkins', unit: 'napkins', emoji: '🧻',
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
export const TOPPINGS = [
  { id: 'chocSprinkles', name: 'Chocolate sprinkles' },
  { id: 'rainbowSprinkles', name: 'Rainbow sprinkles' },
];

// Town map. x/y are 0–100 map coordinates; profile(hour, ctx) gives relative crowd.
export const SPOTS = [
  { id: 'maple', name: 'Maple Street', kind: 'home', x: 30, y: 35, size: 1.0 },
  { id: 'oak', name: 'Oak Hollow', kind: 'home', x: 15, y: 70, size: 0.8 },
  { id: 'sunset', name: 'Sunset Ridge', kind: 'home', x: 85, y: 15, size: 0.7, rich: true },
  { id: 'riverside', name: 'Riverside', kind: 'home', x: 70, y: 80, size: 0.9 },
  { id: 'school', name: 'School Playground', kind: 'school', x: 45, y: 60 },
  { id: 'pool', name: 'Town Pool', kind: 'pool', x: 80, y: 55 },
  { id: 'downtown', name: 'Downtown', kind: 'downtown', x: 50, y: 25 },
  { id: 'fields', name: 'Ball Fields', kind: 'fields', x: 25, y: 88 },
];
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
  downtown: {
    dropMult: 0.5,
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
};
// How likely each kind of person is to drop a cone, relative to a kid.
export const DROP_BY_PERSON = { kid: 1, teen: 0.5, adult: 0.1, dog: 0 };

export const SPOT = Object.fromEntries(SPOTS.map((s) => [s.id, s]));

export const TRUCK_COLORS = [
  { id: 'pink', name: 'Bubblegum', hex: '#ff8fc7' },
  { id: 'mint', name: 'Mint', hex: '#7fe3c4' },
  { id: 'sky', name: 'Sky', hex: '#7cc8ff' },
  { id: 'lemon', name: 'Lemon', hex: '#ffe066' },
  { id: 'grape', name: 'Grape', hex: '#b69cff' },
  { id: 'cherry', name: 'Cherry', hex: '#ff6b6b' },
  { id: 'white', name: 'Vanilla', hex: '#fff7ea' },
  { id: 'orange', name: 'Creamsicle', hex: '#ffab5e' },
];

export const TUNES = [
  { id: 'entertainer', name: 'The Entertainer' },
  { id: 'greensleeves', name: 'Greensleeves' },
  { id: 'weasel', name: 'Pop Goes the Weasel' },
  { id: 'turkey', name: 'Turkey in the Straw' },
];

export const LEADERBOARD = {
  // Not secret: the token (pasted per device in Settings) is what grants access.
  baseId: 'appf6frKyQZNEKBep',
  tableName: 'Scores',
};
