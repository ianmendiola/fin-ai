"use client";

import { useDeleteMonth } from "@/app/hooks/useDeleteMonth";
import type { MonthlySummary } from "@/app/lib/types";
import { usd, formatMonth, SPENDING_CATEGORIES } from "@/app/lib/format";

interface SummaryTableProps {
  summaries: MonthlySummary[];
  selectedMonth: string;
}

export default function SummaryTable({
  summaries,
  selectedMonth,
}: SummaryTableProps) {
  const deleteMonth = useDeleteMonth();
  const current = summaries.find((s) => s.month === selectedMonth);

  if (!current) {
    return <p className="text-muted">Month not found.</p>;
  }

  const savings = current.savings;

  return (
    <div className="space-y-10">
      {/* Hero section */}
      <div className="space-y-2">
        <p className="text-muted text-sm font-medium tracking-wide uppercase">
          {formatMonth(current.month, "long")}
        </p>
        <p
          className={`text-3xl sm:text-5xl font-bold tracking-tight ${
            savings >= 0 ? "text-positive" : "text-negative"
          }`}
        >
          {usd(savings, 2)}
        </p>
        <p className="text-muted text-sm">Net savings</p>
      </div>

      {/* Income / Spent */}
      <div className="flex gap-3 sm:gap-4">
        <div className="flex-1 rounded-2xl p-4 sm:p-5 bg-positive/[0.06] border border-positive/10">
          <p className="text-positive/70 text-xs font-medium uppercase tracking-wide mb-1">
            Income
          </p>
          <p className="text-lg sm:text-2xl font-semibold">{usd(current.totalIncome, 2)}</p>
        </div>
        <div className="flex-1 rounded-2xl p-4 sm:p-5 bg-negative/[0.06] border border-negative/10">
          <p className="text-negative/70 text-xs font-medium uppercase tracking-wide mb-1">
            Spent
          </p>
          <p className="text-lg sm:text-2xl font-semibold">{usd(current.totalSpent, 2)}</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Spending breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SPENDING_CATEGORIES.map((cat) => {
            const value = current[cat.key] as number;
            const pct =
              current.totalSpent > 0
                ? ((value / current.totalSpent) * 100).toFixed(1)
                : "0";
            return (
              <div key={cat.key} className="bg-card rounded-2xl p-4 space-y-1">
                <p className="text-muted text-xs font-medium flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.label}
                </p>
                <p className="text-lg font-semibold">{usd(value, 2)}</p>
                <p className="text-muted text-xs">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete */}
      <div>
        <button
          onClick={() => deleteMonth.mutate(current.month)}
          disabled={deleteMonth.isPending}
          className="text-muted hover:text-negative text-sm transition-colors"
        >
          {deleteMonth.isPending ? "Removing..." : "Remove this month"}
        </button>
      </div>
    </div>
  );
}
