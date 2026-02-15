import { authed } from "@/app/lib/auth";
import { deleteSummary, deleteTransactions } from "@/app/lib/dynamodb";

export const DELETE = authed(async (
  _request: Request,
  { params }: { params: Promise<{ month: string }> }
) => {
  try {
    const { month } = await params;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return Response.json(
        { error: "Invalid month format. Expected YYYY-MM." },
        { status: 400 }
      );
    }

    await Promise.all([deleteSummary(month), deleteTransactions(month)]);
    return Response.json({ deleted: month });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});
