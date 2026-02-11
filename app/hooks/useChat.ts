import { useState, useRef, useCallback } from "react";
import type { MonthlySummary } from "@/app/lib/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function formatFinancialContext(summaries: MonthlySummary[]): string {
  if (!summaries.length) return "No financial data available.";

  const sorted = [...summaries].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  const lines: string[] = [];

  for (const s of sorted) {
    lines.push(
      `${s.month}: Income $${s.totalIncome.toFixed(2)}, Spent $${s.totalSpent.toFixed(2)}, Savings $${s.savings.toFixed(2)} | Grocery $${s.grocery.toFixed(2)}, General $${s.general.toFixed(2)}, Splurge $${s.splurge.toFixed(2)}, Food $${s.amex.toFixed(2)}, Apple Card $${s.appleCard.toFixed(2)}, Wife CC $${s.wifeCC.toFixed(2)}, Direct $${s.direct.toFixed(2)}`
    );
  }

  const avgIncome =
    sorted.reduce((sum, s) => sum + s.totalIncome, 0) / sorted.length;
  const avgSpent =
    sorted.reduce((sum, s) => sum + s.totalSpent, 0) / sorted.length;
  const avgSavings =
    sorted.reduce((sum, s) => sum + s.savings, 0) / sorted.length;

  lines.push("");
  lines.push(
    `Averages (${sorted.length} months): Income $${avgIncome.toFixed(2)}, Spent $${avgSpent.toFixed(2)}, Savings $${avgSavings.toFixed(2)}`
  );

  return lines.join("\n");
}

export function useChat(summaries: MonthlySummary[] | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = { role: "user", content };
      const assistantMessage: ChatMessage = { role: "assistant", content: "" };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const allMessages = [
          ...messages,
          userMessage,
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages.map(({ role, content }) => ({
              role,
              content,
            })),
            financialContext: formatFinancialContext(summaries ?? []),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.text();
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: `Error: ${err}`,
            };
            return updated;
          });
          setIsStreaming(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.token,
                  };
                  return updated;
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // user stopped streaming
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: "Something went wrong. Please try again.",
            };
            return updated;
          });
        }
      } finally {
        // Strip [MEMORY: ...] tags from final assistant message
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content
                .replace(/\[MEMORY:\s*.+?\]/g, "")
                .trim(),
            };
          }
          return updated;
        });
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, summaries]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sendMessage, stopStreaming, clearMessages };
}
