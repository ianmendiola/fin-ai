"use client";

import { useRef, useState } from "react";
import { useUploadCSVs } from "@/app/hooks/useUploadCSVs";
import { extractAccountId } from "@/app/lib/csv-parser";

export default function UploadForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useUploadCSVs();

  const hasChecking = files.some((f) => {
    const id = extractAccountId(f.name);
    return id === "1969";
  });

  function handleFiles(newFiles: File[]) {
    setFiles(newFiles);
    setWarnings([]);
    if (!showPanel) setShowPanel(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWarnings([]);
    upload.mutate(files, {
      onSuccess: (data) => {
        setWarnings(data.warnings);
        setFiles([]);
        setShowPanel(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        multiple
        onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
      >
        + Import
      </button>

      {showPanel && files.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="absolute right-0 top-12 z-10 w-80 bg-card border border-border rounded-2xl p-5 space-y-4 shadow-lg"
        >
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.name}
                className="text-sm text-foreground/80 truncate"
              >
                {f.name}
              </div>
            ))}
          </div>

          {!hasChecking && (
            <p className="text-negative text-xs">
              Checking CSV (1969) required.
            </p>
          )}

          {upload.isError && (
            <p className="text-negative text-xs">{upload.error.message}</p>
          )}

          {warnings.length > 0 && (
            <div className="text-xs text-yellow-500 space-y-1">
              {warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={upload.isPending || !hasChecking}
              className="flex-1 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {upload.isPending ? "Processing..." : "Process"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPanel(false);
                setFiles([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-4 py-2 rounded-full text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
