import type { MonthlySummary } from "./types";

export function usd(n: number, decimals: number = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatMonth(
  month: string,
  style: "short" | "long" = "short"
): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: style, year: "numeric" });
}

export const SPENDING_CATEGORIES: {
  key: keyof MonthlySummary;
  label: string;
  color: string;
}[] = [
  { key: "grocery", label: "Grocery", color: "#16c784" },
  { key: "general", label: "General", color: "#3861fb" },
  { key: "splurge", label: "Splurge", color: "#f7931a" },
  { key: "amex", label: "Dining", color: "#8b5cf6" },
  { key: "appleCard", label: "Apple Card", color: "#6b7280" },
  { key: "wifeCC", label: "Wife CC", color: "#ec4899" },
  { key: "direct", label: "Direct", color: "#06b6d4" },
];
