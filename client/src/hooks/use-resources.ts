import { useCallback } from "react";

import { fetchResources } from "../api/campushubApi.ts";
import type { Resource } from "../types/api.ts";
import { useAsyncData, type AsyncData } from "./use-async-data.ts";

const NO_RESOURCES: readonly Resource[] = [];

/** Loads resources, optionally filtered by type; reloads when the filter changes. */
export const useResources = (type: string | undefined): AsyncData<readonly Resource[]> => {
  const load = useCallback(
    (signal: AbortSignal): Promise<readonly Resource[]> => fetchResources(type, { signal }),
    [type],
  );
  return useAsyncData<readonly Resource[]>(load, NO_RESOURCES);
};
