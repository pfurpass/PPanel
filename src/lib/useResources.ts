"use client";

import useSWR from "swr";
import type { GuestSummary, PveNode, StorageSummary } from "@/lib/proxmox/types";

interface ResourcesResponse {
  nodes: PveNode[];
  guests: GuestSummary[];
  storages: StorageSummary[];
}

class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetcher(url: string): Promise<ResourcesResponse> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new FetchError(json.error ?? "Unbekannter Fehler", res.status);
  return json;
}

interface UseResourcesResult {
  data: ResourcesResponse | null;
  error: string | null;
  notConfigured: boolean;
  loading: boolean;
  refresh: () => void;
}

export function useResources(pollMs = 5000): UseResourcesResult {
  const { data, error, isLoading, mutate } = useSWR<ResourcesResponse>("/api/resources", fetcher, {
    refreshInterval: pollMs,
    revalidateOnFocus: false,
  });

  return {
    data: data ?? null,
    error: error ? error.message : null,
    notConfigured: error instanceof FetchError && error.status === 503,
    loading: isLoading,
    refresh: () => {
      mutate();
    },
  };
}
