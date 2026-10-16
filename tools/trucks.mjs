// Usage: node tools/trucks.mjs [seeds=30] [summers=3] [bot=smart]
// New truck vs used trucks (low and high miles), played carefully or carelessly, for a few summers each.
// Profit is each summer's income minus expenses; the truck itself doesn't show up there (no wear-down in the books),
// so a cheaper truck only helps through a smaller loan.
import { playSeason, playNextSummer } from './bots.mjs';
import { CONFIG, TRUCK_PRICE, usedTruckPrice } from '../js/config.js';
import { Game } from '../js/engine.js';

// count breakdowns
let broke = 0;
const breakDown = Game.prototype.breakDown;
Game.prototype.breakDown = function (...a) {
  broke++;
  return breakDown.apply(this, a);
};

const n = Number(process.argv[2] || 30);
const summers = Number(process.argv[3] || 3);
const bot = process.argv[4] || 'smart';
const loan = (id) => CONFIG.loans.find((l) => l.id === id);
const $ = (c) => '$' + Math.round(c / 100).toLocaleString();
const SETUPS = [
  { name: 'new, careful', truck: { used: false, miles: 35, cost: TRUCK_PRICE, loan: loan('l10') }, care: 'careful' },
  { name: 'new, careless', truck: { used: false, miles: 35, cost: TRUCK_PRICE, loan: loan('l10') }, care: 'careless' },
  { name: 'used 65k, careful', truck: { used: true, miles: 65000, cost: usedTruckPrice(65000), loan: loan('l7') }, care: 'careful' },
  { name: 'used 65k, careless', truck: { used: true, miles: 65000, cost: usedTruckPrice(65000), loan: loan('l7') }, care: 'careless' },
  { name: 'used 135k, careful', truck: { used: true, miles: 135000, cost: usedTruckPrice(135000), loan: loan('l5') }, care: 'careful' },
  { name: 'used 135k, careless', truck: { used: true, miles: 135000, cost: usedTruckPrice(135000), loan: loan('l5') }, care: 'careless' },
];

for (const st of SETUPS) {
  const per = Array.from({ length: summers }, () => ({ profit: 0, upkeep: 0, breakdowns: 0, wins: 0, played: 0 }));
  for (let i = 1; i <= n; i++) {
    let r = null;
    for (let k = 0; k < summers; k++) {
      if (k && !r.won) break;
      const upkeep = r ? r.game.state.truth.upkeep : 0;
      broke = 0;
      r = k ? playNextSummer(r.game, bot, { care: st.care }) : playSeason(bot, i * 7919, { truck: st.truck, care: st.care });
      per[k].played++;
      per[k].profit += r.profit;
      per[k].wins += r.won ? 1 : 0;
      per[k].breakdowns += broke;
      per[k].upkeep += r.game.state.truth.upkeep - upkeep;
    }
  }
  console.log(`${st.name.padEnd(20)} ${$(st.truck.cost).padStart(7)} ${st.truck.loan.id.padEnd(4)} ` + per.map((p, k) => `S${k + 1}: profit ${$(p.profit / (p.played || 1)).padStart(7)} upkeep ${$(p.upkeep / (p.played || 1)).padStart(6)} breakdowns ${(p.breakdowns / (p.played || 1)).toFixed(1)}`).join(' | '));
}
