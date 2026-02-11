import { Resource } from "sst";
import { getAllTransactions, getMemories, putMemories } from "@/app/lib/dynamodb";
import type { StoredTransactions } from "@/app/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  financialContext: string;
}

function formatTransactions(allTxns: StoredTransactions[]): string {
  if (allTxns.length === 0) return "";

  const sorted = [...allTxns].sort((a, b) => a.month.localeCompare(b.month));
  const sections: string[] = [];

  for (const { month, checking, creditCards } of sorted) {
    const lines: string[] = [`## ${month}`];

    if (checking.length > 0) {
      lines.push("Checking:");
      for (const t of checking) {
        lines.push(`  ${t.postingDate} | ${t.description} | $${t.amount.toFixed(2)} | ${t.type}`);
      }
    }

    for (const [accountId, txns] of Object.entries(creditCards)) {
      if (txns.length > 0) {
        lines.push(`Credit Card ${accountId}:`);
        for (const t of txns) {
          lines.push(`  ${t.transactionDate} | ${t.description} | $${t.amount.toFixed(2)} | ${t.category}`);
        }
      }
    }

    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
}

export async function POST(req: Request) {
  try {
    const { messages, financialContext } = (await req.json()) as ChatRequest;

    const [allTransactions, memories] = await Promise.all([
      getAllTransactions(),
      getMemories(),
    ]);
    const transactionDetail = formatTransactions(allTransactions);

    const memoriesSection = memories.length > 0
      ? `\n\n--- USER PREFERENCES ---\n${memories.join("\n")}\n--- END USER PREFERENCES ---`
      : "";

    const systemPrompt = `You are Fin AI, a helpful personal finance assistant. You have access to the user's monthly financial summaries and individual transactions below. Reference specific numbers when answering questions. Be concise and helpful.

When the user states a preference, correction, or classification rule about their finances (e.g. "brokerage transfers are investments, not expenses"), output a [MEMORY: <preference>] tag at the end of your response to save it. Only output this tag when the user is clearly stating a preference to remember. Do not include the tag in normal responses.

--- FINANCIAL DATA ---
${financialContext}
--- END FINANCIAL DATA ---

--- TRANSACTION DETAIL ---
${transactionDetail}
--- END TRANSACTION DETAIL ---${memoriesSection}`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(Resource as any).OpenRouterKey.value}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: text }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        let buffer = "";
        let fullResponse = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                // Parse and save any [MEMORY: ...] tags
                const memoryRegex = /\[MEMORY:\s*(.+?)\]/g;
                let match;
                const newMemories: string[] = [];
                while ((match = memoryRegex.exec(fullResponse)) !== null) {
                  newMemories.push(match[1].trim());
                }
                if (newMemories.length > 0) {
                  const existing = await getMemories();
                  const existingLower = new Set(existing.map(m => m.toLowerCase()));
                  const unique = newMemories.filter(m => !existingLower.has(m.toLowerCase()));
                  if (unique.length > 0) {
                    await putMemories([...existing, ...unique]);
                  }
                }

                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content;
                if (token) {
                  fullResponse += token;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ token })}\n\n`
                    )
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
