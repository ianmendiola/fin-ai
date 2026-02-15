"use client";

import { useState } from "react";
import UploadForm from "@/app/components/UploadForm";
import SummaryTable from "@/app/components/SummaryTable";
import Overview from "@/app/components/Overview";
import ChatPanel from "@/app/components/ChatPanel";
import { useMonthlySummaries } from "@/app/hooks/useMonthlySummaries";
import { useChat } from "@/app/hooks/useChat";
import { signOut } from "next-auth/react";
import { Citrus, LogOut, ChevronLeft, MessageSquare } from "lucide-react";

export default function Home() {
  const { data: summaries, isLoading } = useMonthlySummaries();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const { messages, isStreaming, sendMessage, stopStreaming, clearMessages } =
    useChat(summaries);

  const hasData = summaries && summaries.length > 0;

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between mb-8 sm:mb-10">
        {selectedMonth ? (
          <button
            onClick={() => setSelectedMonth(null)}
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Overview
          </button>
        ) : (
          <Citrus className="w-6 h-6 text-positive" strokeWidth={1.5} />
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChatOpen(true)}
            className="p-2 rounded-full text-muted hover:text-foreground transition-colors"
            aria-label="Open chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-full text-muted hover:text-foreground transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <p className="text-muted text-lg">Loading...</p>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-2xl font-semibold">No data yet</p>
          <p className="text-muted">Import your bank CSVs to get started.</p>
          <UploadForm />
        </div>
      ) : selectedMonth ? (
        <SummaryTable
          summaries={summaries}
          selectedMonth={selectedMonth}
        />
      ) : (
        <Overview
          summaries={summaries}
          onSelectMonth={setSelectedMonth}
          action={<UploadForm />}
        />
      )}

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        isStreaming={isStreaming}
        onSend={sendMessage}
        onStop={stopStreaming}
        onClear={clearMessages}
      />
    </div>
  );
}
