import { useState, useRef } from "react";

export function useMemory() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/memory");
      const data = await res.json();
      setText((data.memories ?? []).join("\n"));
    } catch {
      setText("");
    } finally {
      setLoading(false);
    }
  }

  function update(value: string) {
    setText(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const memories = value
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean);
      fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories }),
      });
    }, 500);
  }

  return { text, loading, load, update };
}
