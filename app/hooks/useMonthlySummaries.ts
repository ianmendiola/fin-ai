import { useQuery } from "@tanstack/react-query";
import type { MonthlySummary } from "@/app/lib/types";

async function fetchSummaries(): Promise<MonthlySummary[]> {
  const res = await fetch("/api/finance/summary");
  if (!res.ok) throw new Error("Failed to fetch summaries");
  return res.json();
}

export function useMonthlySummaries() {
  return useQuery({
    queryKey: ["summaries"],
    queryFn: fetchSummaries,
  });
}
