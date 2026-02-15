import { authed } from "@/app/lib/auth";
import { parseCSV, extractAccountId, inferMonth } from "@/app/lib/csv-parser";
import { categorize, isInMonth } from "@/app/lib/categorize";
import { putSummary, putTransactions } from "@/app/lib/dynamodb";
import type {
  CheckingTransaction,
  CreditCardTransaction,
} from "@/app/lib/types";

export const POST = authed(async (request) => {
  try {
    const formData = await request.formData();

    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "files" && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return Response.json(
        { error: "No CSV files provided." },
        { status: 400 }
      );
    }

    let checkingTxns: CheckingTransaction[] | null = null;
    const ccSets = new Map<string, CreditCardTransaction[]>();
    const warnings: string[] = [];

    for (const file of files) {
      const content = await file.text();
      const accountId = extractAccountId(file.name);
      const parsed = parseCSV(content, accountId);

      if (parsed.format === "checking") {
        checkingTxns = parsed.transactions;
      } else {
        ccSets.set(parsed.accountId, parsed.transactions);
      }
    }

    if (!checkingTxns) {
      return Response.json(
        {
          error:
            "Checking account CSV (1969) is required. Make sure filename starts with Chase1969_",
        },
        { status: 400 }
      );
    }

    const month = inferMonth(checkingTxns);
    if (!month) {
      return Response.json(
        { error: "Could not determine month from checking transactions." },
        { status: 400 }
      );
    }

    const result = categorize(checkingTxns, ccSets, month);
    warnings.push(...result.warnings);

    await putSummary(result.summary);

    // Store raw transactions for the month
    const monthChecking = checkingTxns.filter((t) =>
      isInMonth(t.postingDate, month)
    );
    const monthCreditCards: Record<string, CreditCardTransaction[]> = {};
    for (const [accountId, transactions] of ccSets) {
      const filtered = transactions.filter((t) =>
        isInMonth(t.postDate, month)
      );
      if (filtered.length > 0) {
        monthCreditCards[accountId] = filtered;
      }
    }
    await putTransactions({ month, checking: monthChecking, creditCards: monthCreditCards });

    return Response.json({
      month,
      summary: result.summary,
      warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});
