import type {
  CheckingTransaction,
  CreditCardTransaction,
  ParsedCSV,
} from "./types";

/**
 * Parse a single CSV line respecting RFC 4180 quoted fields.
 * Handles fields with internal commas and whitespace wrapped in double quotes.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseCheckingRow(fields: string[]): CheckingTransaction {
  return {
    details: fields[0]?.trim() ?? "",
    postingDate: fields[1]?.trim() ?? "",
    description: fields[2]?.trim() ?? "",
    amount: parseFloat(fields[3]?.trim() ?? "0"),
    type: fields[4]?.trim() ?? "",
    balance: parseFloat(fields[5]?.trim() ?? "0"),
    checkOrSlip: fields[6]?.trim() ?? "",
  };
}

function parseCreditCardRow(fields: string[]): CreditCardTransaction {
  return {
    transactionDate: fields[0]?.trim() ?? "",
    postDate: fields[1]?.trim() ?? "",
    description: fields[2]?.trim() ?? "",
    category: fields[3]?.trim() ?? "",
    type: fields[4]?.trim() ?? "",
    amount: parseFloat(fields[5]?.trim() ?? "0"),
    memo: fields[6]?.trim() ?? "",
  };
}

/**
 * Extract account ID from filename prefix, e.g. "Chase0773_..." → "0773"
 */
export function extractAccountId(filename: string): string | null {
  const match = filename.match(/Chase(\d{4})_/i);
  return match ? match[1] : null;
}

/**
 * Infer the month (YYYY-MM) from checking transactions by finding the most common month.
 */
export function inferMonth(transactions: CheckingTransaction[]): string {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    const [mm, , yyyy] = t.postingDate.split("/");
    if (mm && yyyy) {
      const key = `${yyyy}-${mm}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let best = "";
  let bestCount = 0;
  for (const [month, count] of counts) {
    if (count > bestCount) {
      best = month;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Parse a CSV string. Auto-detects checking vs credit card format.
 * accountId is required for credit card CSVs (extracted from filename).
 */
export function parseCSV(content: string, accountId: string | null): ParsedCSV {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error("Empty CSV file");
  }

  const header = lines[0];
  const isChecking = header.startsWith("Details");
  const dataLines = lines.slice(1);

  if (isChecking) {
    const transactions = dataLines.map((line) => {
      const fields = parseCSVLine(line);
      return parseCheckingRow(fields);
    });
    return { format: "checking", transactions };
  }

  if (!accountId) {
    throw new Error(
      "Credit card CSV requires account ID from filename (e.g. Chase0773_...)"
    );
  }

  const transactions = dataLines.map((line) => {
    const fields = parseCSVLine(line);
    return parseCreditCardRow(fields);
  });
  return { format: "creditcard", accountId, transactions };
}
