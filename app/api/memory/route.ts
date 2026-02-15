import { authed } from "@/app/lib/auth";
import { getMemories, putMemories } from "@/app/lib/dynamodb";

export const GET = authed(async () => {
  try {
    const memories = await getMemories();
    return Response.json({ memories });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});

export const PUT = authed(async (req) => {
  try {
    const { memories } = (await req.json()) as { memories: string[] };
    await putMemories(memories);
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});

export const POST = authed(async (req) => {
  try {
    const { memory } = (await req.json()) as { memory: string };
    const existing = await getMemories();
    const isDuplicate = existing.some(m => m.toLowerCase() === memory.toLowerCase());
    if (!isDuplicate) {
      await putMemories([...existing, memory]);
    }
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});
