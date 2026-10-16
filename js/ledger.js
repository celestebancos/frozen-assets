// Accounts, statement lines, and the math that turns entries into a P&L and a balance sheet.
// Every entry is { acct, amt, detail? } with amt in cents, signed in the account's natural direction:
// positive = that line goes UP (assets, liabilities, income and expenses alike).

import { SUPPLIES } from './config.js';

export const SECTIONS = [
  { id: 'income', name: 'Income' },
  { id: 'expense', name: 'Expenses' },
  { id: 'asset', name: 'Assets' },
  { id: 'liability', name: 'Liabilities' },
  { id: 'owner', name: "Owner's share" },
];

export const ACCOUNTS = [
  { id: 'salesCash', section: 'income', name: 'Ice cream sold for money' },
  { id: 'salesGift', section: 'income', name: 'Ice cream sold for gift cards' },

  { id: 'used', section: 'expense', name: 'Supplies used up' },
  { id: 'spoiled', section: 'expense', name: 'Spoiled mix thrown out' },
  { id: 'gas', section: 'expense', name: 'Gas' },
  { id: 'ads', section: 'expense', name: 'Advertising' },
  { id: 'interest', section: 'expense', name: 'Loan interest' },
  { id: 'lateFees', section: 'expense', name: 'Late fees' },
  { id: 'giftDiscounts', section: 'expense', name: 'Gift card discounts & giveaways' },
  { id: 'sellBackLoss', section: 'expense', name: 'Loss selling supplies back' },
  { id: 'rebrand', section: 'expense', name: 'Paint & signs' },
  { id: 'upkeep', section: 'expense', name: 'Truck repairs & upkeep' },
  { id: 'truckWear', section: 'expense', name: 'Truck wearing out' },
  { id: 'bookkeeping', section: 'expense', name: 'Bookkeeping' },

  { id: 'cash', section: 'asset', name: 'Cash' },
  { id: 'truck', section: 'asset', name: 'Ice cream truck' },
  { id: 'supplies', section: 'asset', name: 'Supplies on hand' },

  { id: 'loan', section: 'liability', name: 'Business loan' },
  { id: 'giftCards', section: 'liability', name: 'Gift cards not yet used' },
  { id: 'interestOwed', section: 'liability', name: 'Interest owed to the bank' },
  { id: 'billsToPay', section: 'liability', name: 'Bills to pay' },

  // Money the owner put into the business (from the park cart). It's part of the owner's Share.
  { id: 'ownerIn', section: 'owner', name: "Owner's Share" },
  // Grandma's part of the business, when she invested in the truck: what she put in, plus her slice of each week's
  // profit (moved over from the owner's Share at Calculate Profit).
  { id: 'grandmaIn', section: 'owner', name: "Grandma's Share" },
];
export const ACCOUNT = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a]));

// Effect of an entry on (assets − liabilities) − (income − expenses). Must total 0 per transaction.
export function balanceCheck(entries) {
  let s = 0;
  for (const e of entries) {
    const sec = ACCOUNT[e.acct].section;
    if (sec === 'asset' || sec === 'expense') s += e.amt;
    else s -= e.amt;
  }
  return s;
}

export function emptyTotals() {
  return Object.fromEntries(ACCOUNTS.map((a) => [a.id, 0]));
}

export function applyEntries(totals, entries, sign = 1) {
  for (const e of entries) totals[e.acct] += sign * e.amt;
  return totals;
}

export function sectionTotal(totals, section) {
  return ACCOUNTS.filter((a) => a.section === section).reduce((s, a) => s + totals[a.id], 0);
}

export function share(totals) {
  return sectionTotal(totals, 'asset') - sectionTotal(totals, 'liability');
}
// The player's own Share: everything the owners have, minus Grandma's part (if she's a co-owner).
export function ownShare(totals) {
  return share(totals) - (totals.grandmaIn || 0);
}

// P&L rows. "used" is itemized per supply (detail = supply id).
export function pnlRowsFor(entriesByWeek, weeks) {
  // entriesByWeek: Map week -> entries[]
  const incomeRows = [
    { key: 'salesCash', name: ACCOUNT.salesCash.name },
    { key: 'salesGift', name: ACCOUNT.salesGift.name },
  ];
  const expenseRows = [
    ...SUPPLIES.map((s) => ({ key: 'used:' + s.id, name: s.short })),
    ...['spoiled', 'gas', 'ads', 'interest', 'lateFees', 'giftDiscounts', 'sellBackLoss', 'rebrand', 'upkeep', 'truckWear', 'bookkeeping'].map((k) => ({
      key: k,
      name: ACCOUNT[k].name,
    })),
  ];
  const cell = (week, key) => {
    let sum = 0;
    for (const e of entriesByWeek.get(week) || []) {
      const k = e.acct === 'used' ? 'used:' + e.detail : e.acct;
      if (k === key) sum += e.amt;
    }
    return sum;
  };
  const build = (rows) =>
    rows.map((r) => {
      const vals = weeks.map((w) => cell(w, r.key));
      return { ...r, vals, total: vals.reduce((a, b) => a + b, 0) };
    });
  const income = build(incomeRows);
  const expense = build(expenseRows);
  const sumCols = (rows) => weeks.map((_, i) => rows.reduce((s, r) => s + r.vals[i], 0));
  const incomeTotals = sumCols(income);
  const expenseTotals = sumCols(expense);
  const profit = weeks.map((_, i) => incomeTotals[i] - expenseTotals[i]);
  return {
    weeks,
    income,
    expense,
    incomeTotals,
    expenseTotals,
    profit,
    totalIncome: incomeTotals.reduce((a, b) => a + b, 0),
    totalExpense: expenseTotals.reduce((a, b) => a + b, 0),
    totalProfit: profit.reduce((a, b) => a + b, 0),
  };
}

export function money(cents, { sign = false } = {}) {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const s = '$' + Math.floor(abs / 100).toLocaleString('en-US') + '.' + String(abs % 100).padStart(2, '0');
  if (neg) return '−' + s;
  return sign && cents > 0 ? '+' + s : s;
}
