import { authed } from "@/app/lib/auth";
import { getAllSummaries } from "@/app/lib/dynamodb";

export const GET = authed(async () => {
  try {
    const summaries = await getAllSummaries();
    summaries.sort((a, b) => b.month.localeCompare(a.month));
    return Response.json(summaries);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});
