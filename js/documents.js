// Shoebox documents: every transaction lands on a piece of paper that the player files.
// A document collects all transactions of one type in one week.

import { ACCOUNT, applyEntries, emptyTotals, sectionTotal, share } from './ledger.js';

// look: paper style for the UI. penny: what Penny says when it's filed wrong. caption: a note on the balance sheet after filing.
export const DOC_TYPES = {
  loanPapers: { title: 'Bank loan papers', look: 'bank', icon: '🏦',
    penny: "The bank put money in your account, so Cash went up. But that money isn't yours to keep — you have to pay it back. That's a Business loan, and owing it is a liability.",
    caption: "The bank's money is in the cash box, and the business owes it back." },
  truckBill: { title: 'Truck bill of sale', look: 'receipt', icon: '🚚',
    penny: "You paid cash for the truck, so Cash went down. But you didn't lose that money — you traded it for a truck you own. The truck is an asset.",
    caption: 'Cash turned into a truck. Only the left side moved.' },
  registerTape: { title: 'Cash register tape', look: 'tape', icon: '🧾',
    penny: "Customers paid you for ice cream. That's income — Ice cream sold for money went up. And the money went into the cash box, so Cash went up too." },
  giftSales: { title: 'Gift card sales log', look: 'log', icon: '🎁',
    penny: "Selling a gift card brings in cash, but you haven't given any ice cream yet. You owe the ice cream later — that's a liability (Gift cards not yet used), worth what the card sold for." },
  freeCards: { title: 'Free gift card log', look: 'log', icon: '🎟️',
    penny: "You gave away gift cards. No money came in, but now you owe ice cream to whoever brings the card back — Gift cards not yet used went up. Giving away $5 of value is an expense: Gift card discounts & giveaways." },
  redemptions: { title: 'Gift card redemption slips', look: 'slips', icon: '🎫',
    penny: "Someone used a gift card. You gave them ice cream, so you don't owe them anymore — Gift cards not yet used went down. And now you've earned it: Ice cream sold for gift cards (income) went up.",
    caption: '🍦 People got ice cream, but no money came in. Cash didn’t move!' },
  supplyReceipt: { title: 'Supply receipts (paid now)', look: 'receipt', icon: '📦',
    penny: "You paid cash for supplies, so Cash went down. But you still HAVE the supplies — Supplies on hand (an asset) went up. They only become an expense when they get used up." },
  supplyInvoice: { title: 'Supplier invoices (pay later)', look: 'invoice', icon: '📄',
    penny: "You got supplies but haven't paid yet. Supplies on hand (an asset) went up, and now you owe the supplier — Bills to pay (a liability) went up. Cash didn't change yet!" },
  billPayment: { title: 'Bill payment stubs', look: 'stub', icon: '✉️',
    penny: "You paid a bill you owed. Cash went down, and you don't owe it anymore, so Bills to pay went down. Nothing new was bought, so no expense here." },
  supplierLateFee: { title: 'Supplier late notice', look: 'notice', icon: '⚠️',
    penny: "You paid a bill late, so the supplier charged a fee. A late fee is an expense, and since you haven't paid it yet, Bills to pay went up." },
  countSheet: { title: 'Inventory of supplies used', look: 'count', icon: '📋',
    penny: "These supplies got used up making ice cream. They're gone, so Supplies on hand (asset) went down, and using them up is an expense: Supplies used up." },
  spoilSlip: { title: 'Spoiled mix slip', look: 'notice', icon: '🤢',
    penny: "Mix went bad and got thrown out. You don't have it anymore, so Supplies on hand went down, and losing it is an expense: Spoiled mix thrown out." },
  gasReceipt: { title: 'Gas station receipts', look: 'receipt', icon: '⛽',
    penny: "You paid cash for gas, so Cash went down. Gas gets burned up driving, so it's an expense, not something you keep." },
  adInvoice: { title: 'Advertising receipt', look: 'receipt', icon: '📣',
    penny: "You paid for advertising, so Cash went down. Ads don't give you anything you can hold onto, so it's an expense." },
  interestPaid: { title: 'Bank statement: interest paid', look: 'bank', icon: '🏦',
    penny: "The bank charges interest for lending you money. You paid it from Cash, so Cash went down, and interest is an expense: Loan interest." },
  interestUnpaid: { title: 'Bank notice: interest NOT paid', look: 'notice', icon: '🏦',
    penny: "Interest was due but there wasn't enough cash. It's still an expense (Loan interest), and since you didn't pay it you now owe it — Interest owed to the bank (a liability) went up.",
    caption: 'Interest is still an expense, and now the business owes it too.' },
  bankLateFee: { title: 'Bank late fee notice', look: 'notice', icon: '⚠️',
    penny: "You owed the bank interest for too long, so they added a late fee. That's an expense (Late fees), and you owe it — Interest owed to the bank went up." },
  interestPayoff: { title: 'Bank receipt: owed interest paid', look: 'bank', icon: '🏦',
    penny: "You paid back interest you owed. Cash went down and Interest owed to the bank went down. The expense was already counted when the interest was charged." },
  sellBack: { title: 'Sell-back receipt', look: 'receipt', icon: '🔁',
    penny: "You sold supplies back. Supplies on hand went down by what you paid for them, Cash went up by what you got back, and since you got back less, the difference is a loss — an expense." },
  rebrandReceipt: { title: 'Paint & sign receipt', look: 'receipt', icon: '🎨',
    penny: "You paid cash to repaint or re-sign the truck. Cash went down. The truck isn't worth more because of it, so it's an expense." },
  pennyBill: { title: "Penny's bookkeeping bill", look: 'invoice', icon: '👩‍💼',
    penny: "Penny charges for keeping the books. That's an expense: Bookkeeping. You haven't paid her yet, so Bills to pay (a liability) went up. Cash didn't change yet!" },
  loanRepay: { title: 'Loan payoff receipt', look: 'bank', icon: '🏦',
    penny: "You paid back the loan! Cash went down, and you don't owe the bank anymore — Business loan went down. Paying back a loan isn't an expense: you're just returning the bank's money." },
};

export const DOC_ORDER = Object.keys(DOC_TYPES);

// doc: { id, week, type, entries: {key: amt}, items: [{label, amt}] } — entries keyed acct or acct:detail
export function addToDoc(docs, week, type, entries, item) {
  let doc = null;
  for (let i = docs.length - 1; i >= 0; i--) {
    const d = docs[i];
    if (d.week === week && d.type === type && !d.filed) {
      doc = d;
      break;
    }
  }
  if (!doc) {
    doc = { id: `${week}-${type}-${docs.length}`, week, type, entries: {}, items: [], filed: false };
    docs.push(doc);
  }
  for (const e of entries) {
    const k = e.detail ? `${e.acct}:${e.detail}` : e.acct;
    doc.entries[k] = (doc.entries[k] || 0) + e.amt;
  }
  if (item) {
    const existing = item.key && doc.items.find((i) => i.key === item.key);
    if (existing) {
      existing.amt += item.amt;
      if (item.count) existing.count = (existing.count || 0) + item.count;
    } else doc.items.push({ ...item });
  }
  return doc;
}

export function docEntryList(doc) {
  return Object.entries(doc.entries)
    .filter(([, amt]) => amt !== 0)
    .map(([k, amt]) => {
      const [acct, detail] = k.split(':');
      return detail ? { acct, amt, detail } : { acct, amt };
    });
}

// Collapsed by account: what the player must pick. [{acct, amt, dir: 'up'|'down'}]
export function docLines(doc) {
  const by = {};
  for (const e of docEntryList(doc)) by[e.acct] = (by[e.acct] || 0) + e.amt;
  return Object.entries(by)
    .filter(([, amt]) => amt !== 0)
    .map(([acct, amt]) => ({ acct, amt, dir: amt > 0 ? 'up' : 'down' }));
}

export function docIsEmpty(doc) {
  return docLines(doc).length === 0;
}

// picks: { acct: 'up' | 'down' }
export function checkFiling(doc, picks) {
  const correct = docLines(doc);
  const pickList = Object.entries(picks).filter(([, d]) => d);
  const ok =
    pickList.length === correct.length && correct.every((c) => picks[c.acct] === c.dir);
  return { ok, correct };
}

// What the player's picks would do to the books, for Penny's side-by-side.
export function pickedEntries(doc, picks) {
  const correct = docLines(doc);
  const headline = Math.max(...correct.map((c) => Math.abs(c.amt)));
  return Object.entries(picks)
    .filter(([, d]) => d)
    .map(([acct, dir]) => {
      const match = correct.find((c) => c.acct === acct);
      const mag = match ? Math.abs(match.amt) : headline;
      return { acct, amt: dir === 'up' ? mag : -mag };
    });
}

// Side-by-side comparison rows of the books before → your version vs correct version.
export function pennyComparison(filedTotals, doc, picks) {
  const mine = applyEntries({ ...filedTotals }, pickedEntries(doc, picks));
  const right = applyEntries({ ...filedTotals }, docLines(doc));
  const touched = new Set([...Object.keys(picks).filter((k) => picks[k]), ...docLines(doc).map((l) => l.acct)]);
  const lines = [...touched].map((acct) => ({
    acct,
    name: ACCOUNT[acct].name,
    section: ACCOUNT[acct].section,
    mine: mine[acct] - filedTotals[acct],
    right: right[acct] - filedTotals[acct],
  }));
  const sum = (t) => ({
    income: sectionTotal(t, 'income'),
    expense: sectionTotal(t, 'expense'),
    asset: sectionTotal(t, 'asset'),
    liability: sectionTotal(t, 'liability'),
    profit: sectionTotal(t, 'income') - sectionTotal(t, 'expense'),
    share: share(t),
  });
  return { lines, mine: sum(mine), right: sum(right) };
}

export function emptyFiled() {
  return emptyTotals();
}
