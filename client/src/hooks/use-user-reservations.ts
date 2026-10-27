import { useCallback } from "react";

import { fetchUserReservations } from "../api/campushubApi.ts";
import type { Reservation } from "../types/api.ts";
import { useAsyncData, type AsyncData } from "./use-async-data.ts";

const NO_RESERVATIONS: readonly Reservation[] = [];

/**
 * Loads the user's active reservations. The list reloads when `refreshKey`
 * changes; call `reload` to refresh it manually.
 */
export const useUserReservations = (
  userId: string,
  refreshKey: number,
): AsyncData<readonly Reservation[]> => {
  const load = useCallback(
    (signal: AbortSignal): Promise<readonly Reservation[]> => {
      void refreshKey;
      return fetchUserReservations(userId, { signal });
    },
    [userId, refreshKey],
  );
  return useAsyncData<readonly Reservation[]>(load, NO_RESERVATIONS);
};
