import { useMutation, useQueryClient } from "@tanstack/react-query";

async function deleteMonth(month: string): Promise<{ deleted: string }> {
  const res = await fetch(`/api/finance/summary/${month}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || "Delete failed");
  }
  return res.json();
}

export function useDeleteMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMonth,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summaries"] });
    },
  });
}
