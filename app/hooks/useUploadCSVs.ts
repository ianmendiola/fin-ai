import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UploadResponse } from "@/app/lib/types";

async function uploadCSVs(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await fetch("/api/finance/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || "Upload failed");
  }

  return res.json();
}

export function useUploadCSVs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadCSVs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summaries"] });
    },
  });
}
