import type {
  CheckingTransaction,
  CreditCardTransaction,
  MonthlySummary,
} from "./types";
import { ACCOUNT_CATEGORY_MAP } from "./types";

interface CCPaymentInfo {
  accountId: string;
  amount: number; // positive
}

/**
 * Filter transactions to only those within the selected month.
 * month format: "YYYY-MM", date format: "MM/DD/YYYY"
 */
export function isInMonth(dateStr: string, month: string): boolean {
  const [mm, , yyyy] = dateStr.split("/");
  const txMonth = `${yyyy}-${mm}`;
  return txMonth === month;
}

/**
 * Round to 2 decimal places to avoid floating point issues.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Transactions that are transfers between your own accounts — not real income or spending.
 * These are excluded from both income and direct expense calculations.
 */
function isTransferOrInvestment(t: CheckingTransaction): boolean {
  // Account transfers (savings ↔ checking)
  if (t.type === "ACCT_XFER") return true;
  // Brokerage transfers (Schwab → checking)
  if (t.description.includes("SCHWAB") || t.description.includes("MONEYLINK"))
    return true;
  // Investment purchases (checking → Vanguard, etc.)
  if (t.description.includes("VANGUARD")) return true;
  return false;
}

export function categorize(
  checking: CheckingTransaction[],
  ccSets: Map<string, CreditCardTransaction[]>,
  month: string
): { summary: MonthlySummary; warnings: string[] } {
  const warnings: string[] = [];

  // Filter checking to the selected month
  const monthTxns = checking.filter((t) => isInMonth(t.postingDate, month));

  // Step 1: Extract CC payment amounts from each CC CSV
  // Look for "AUTOMATIC PAYMENT - THANK" rows (Payment type) in the selected month
  const ccPayments: CCPaymentInfo[] = [];
  for (const [accountId, transactions] of ccSets) {
    for (const t of transactions) {
      if (
        t.description.includes("AUTOMATIC PAYMENT") &&
        t.type === "Payment" &&
        t.amount > 0 &&
        isInMonth(t.postDate, month)
      ) {
        ccPayments.push({ accountId, amount: round2(t.amount) });
      }
    }
  }

  // Step 2: Find all CHASE CREDIT CRD AUTOPAY in checking for this month
  const autopayTxns = monthTxns.filter((t) =>
    t.description.includes("CHASE CREDIT CRD AUTOPAY")
  );

  // Step 3: Match AUTOPAY → CC by exact amount
  const matchedAutopayIndices = new Set<number>();
  const matchedCCIndices = new Set<number>();
  const categoryTotals: Record<string, number> = {
    grocery: 0,
    general: 0,
    splurge: 0,
    amex: 0,
    appleCard: 0,
    wifeCC: 0,
    direct: 0,
  };

  for (let ai = 0; ai < autopayTxns.length; ai++) {
    const autopayAmount = round2(Math.abs(autopayTxns[ai].amount));
    let matched = false;

    for (let ci = 0; ci < ccPayments.length; ci++) {
      if (matchedCCIndices.has(ci)) continue;
      if (ccPayments[ci].amount === autopayAmount) {
        // Found a match
        const category = ACCOUNT_CATEGORY_MAP[ccPayments[ci].accountId];
        if (category) {
          categoryTotals[category] = round2(
            categoryTotals[category] + autopayAmount
          );
        } else {
          categoryTotals.wifeCC = round2(categoryTotals.wifeCC + autopayAmount);
          warnings.push(
            `Unknown CC account ${ccPayments[ci].accountId}, assigned to Wife CC: $${autopayAmount}`
          );
        }
        matchedAutopayIndices.add(ai);
        matchedCCIndices.add(ci);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Unmatched AUTOPAY → wife's CC
      categoryTotals.wifeCC = round2(categoryTotals.wifeCC + autopayAmount);
      matchedAutopayIndices.add(ai);
      warnings.push(
        `Unmatched AUTOPAY $${autopayAmount} assigned to Wife CC`
      );
    }
  }

  // Track which checking transactions are already categorized
  const categorizedDescriptions = new Set<number>();

  // Mark autopay transactions as categorized
  for (const t of autopayTxns) {
    const idx = monthTxns.indexOf(t);
    if (idx >= 0) categorizedDescriptions.add(idx);
  }

  // Step 4: Find LOAN_PMT entries (e.g., "Payment to Chase card ending in 4996")
  for (let i = 0; i < monthTxns.length; i++) {
    const t = monthTxns[i];
    if (t.type === "LOAN_PMT" && t.amount < 0) {
      categoryTotals.wifeCC = round2(
        categoryTotals.wifeCC + Math.abs(t.amount)
      );
      categorizedDescriptions.add(i);
    }
  }

  // Step 5: Find Amex payments in checking
  for (let i = 0; i < monthTxns.length; i++) {
    if (categorizedDescriptions.has(i)) continue;
    const t = monthTxns[i];
    if (t.description.includes("AMERICAN EXPRESS") && t.amount < 0) {
      categoryTotals.amex = round2(categoryTotals.amex + Math.abs(t.amount));
      categorizedDescriptions.add(i);
    }
  }

  // Step 6: Find AppleCard/GSBANK payments in checking
  for (let i = 0; i < monthTxns.length; i++) {
    if (categorizedDescriptions.has(i)) continue;
    const t = monthTxns[i];
    if (
      (t.description.includes("APPLE CARD") ||
        t.description.includes("GSBANK")) &&
      t.amount < 0
    ) {
      categoryTotals.appleCard = round2(
        categoryTotals.appleCard + Math.abs(t.amount)
      );
      categorizedDescriptions.add(i);
    }
  }

  // Step 7: Direct expenses — remaining checking debits, excluding transfers/investments
  for (let i = 0; i < monthTxns.length; i++) {
    if (categorizedDescriptions.has(i)) continue;
    const t = monthTxns[i];
    if (t.amount < 0 && !isTransferOrInvestment(t)) {
      categoryTotals.direct = round2(
        categoryTotals.direct + Math.abs(t.amount)
      );
    }
  }

  // Step 8: Income — direct deposits + net transfers
  // First, sum real income (payroll, check deposits, interest)
  let totalIncome = 0;
  for (const t of monthTxns) {
    if (t.amount > 0 && !isTransferOrInvestment(t)) {
      totalIncome = round2(totalIncome + t.amount);
    }
  }

  // Net transfers: inflows from savings/brokerage minus outflows to investments/brokerage.
  // Positive net = money drawn from savings beyond what was invested, counts as income.
  let transfersIn = 0;
  let transfersOut = 0;
  for (let i = 0; i < monthTxns.length; i++) {
    if (categorizedDescriptions.has(i)) continue;
    const t = monthTxns[i];
    if (!isTransferOrInvestment(t)) continue;
    if (t.amount > 0) {
      transfersIn = round2(transfersIn + t.amount);
    } else {
      transfersOut = round2(transfersOut + Math.abs(t.amount));
    }
  }
  const netTransfers = round2(transfersIn - transfersOut);
  if (netTransfers > 0) {
    totalIncome = round2(totalIncome + netTransfers);
  }

  // Step 9: Totals
  const totalSpent = round2(
    categoryTotals.grocery +
      categoryTotals.general +
      categoryTotals.splurge +
      categoryTotals.amex +
      categoryTotals.appleCard +
      categoryTotals.wifeCC +
      categoryTotals.direct
  );

  const savings = round2(totalIncome - totalSpent);

  const summary: MonthlySummary = {
    month,
    grocery: categoryTotals.grocery,
    general: categoryTotals.general,
    splurge: categoryTotals.splurge,
    amex: categoryTotals.amex,
    appleCard: categoryTotals.appleCard,
    wifeCC: categoryTotals.wifeCC,
    direct: categoryTotals.direct,
    totalSpent,
    totalIncome,
    savings,
    updatedAt: new Date().toISOString(),
  };

  return { summary, warnings };
}
