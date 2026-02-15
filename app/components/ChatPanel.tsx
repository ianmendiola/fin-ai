"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SquarePlus, Database, X, ChevronLeft, Send } from "lucide-react";
import type { ChatMessage } from "@/app/hooks/useChat";
import { useMemory } from "@/app/hooks/useMemory";

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
  onClear: () => void;
}

const SUGGESTIONS = [
  "How are my savings trending?",
  "Where do I spend the most?",
  "Compare last 3 months",
];

export default function ChatPanel({
  open,
  onClose,
  messages,
  isStreaming,
  onSend,
  onStop,
  onClear,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [memoryOpen, setMemoryOpen] = useState(false);
  const memory = useMemory();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setMemoryOpen(false);
      inputRef.current?.focus();
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    onSend(trimmed);
  }

  function handleSuggestion(text: string) {
    if (isStreaming) return;
    onSend(text);
  }

  function openMemoryPanel() {
    setMemoryOpen(true);
    memory.load();
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 sm:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 w-full sm:w-[400px] bg-background border-l border-border flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border">
          <h2 className="text-sm font-semibold">Chat</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onClear}
              className="p-1.5 text-muted hover:text-foreground transition-colors"
              title="New chat"
            >
              <SquarePlus className="w-4 h-4" />
            </button>
            <button
              onClick={openMemoryPanel}
              className="p-1.5 text-muted hover:text-foreground transition-colors"
              title="Memory"
            >
              <Database className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Memory Editor Overlay */}
        {memoryOpen ? (
          <div className="flex-1 flex flex-col px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setMemoryOpen(false)}
                className="p-1 text-muted hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-semibold">Memories</h3>
            </div>
            {memory.loading ? (
              <div className="flex-1 flex items-center justify-center text-muted text-sm">
                Loading...
              </div>
            ) : (
              <textarea
                value={memory.text}
                onChange={(e) => memory.update(e.target.value)}
                className="flex-1 w-full p-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-foreground/30 resize-none"
                placeholder="e.g. Brokerage transfers are investments, not expenses"
              />
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-muted text-sm">
                    Ask me anything about your finances.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSuggestion(s)}
                        className="px-3 py-1.5 text-xs bg-card border border-border rounded-full text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-foreground text-background whitespace-pre-wrap"
                          : "bg-card text-foreground"
                      }`}
                    >
                      {msg.content ? (
                        msg.role === "assistant" ? (
                          <div className="chat-markdown">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )
                      ) : isStreaming && i === messages.length - 1 ? (
                        <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border">
              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="w-full py-2 text-sm text-muted hover:text-foreground transition-colors"
                >
                  Stop generating
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your finances..."
                    className="flex-1 px-4 py-2 rounded-full bg-card border border-border text-[16px] sm:text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-foreground/30"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="w-9 h-9 flex items-center justify-center shrink-0 rounded-full bg-foreground text-background disabled:opacity-30 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
