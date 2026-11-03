import { useCallback } from "react";

import { fetchUserReservations } from "../api/campushubApi.ts";
import type { Reservation } from "../types/api.ts";
import type { UiError } from "../types/ui.ts";
import { useAsyncData } from "./use-async-data.ts";
import { useCancelReservation } from "./use-cancel-reservation.ts";

const NO_RESERVATIONS: readonly Reservation[] = [];

export interface ReservationsState {
  readonly reservations: readonly Reservation[];
  readonly isLoading: boolean;
  readonly error: UiError | null;
  /** Id of the reservation being cancelled, or null when idle. */
  readonly cancellingId: string | null;
  readonly cancelError: UiError | null;
  readonly reload: () => void;
  /** Cancels a reservation and reloads the list when it succeeded. */
  readonly cancel: (reservationId: string) => Promise<void>;
}

/**
 * Loads the user's active reservations and exposes cancellation. The list
 * reloads when `refreshKey` changes, e.g. after a booking was created.
 */
export const useReservations = (userId: string, refreshKey: number): ReservationsState => {
  const load = useCallback(
    (signal: AbortSignal): Promise<readonly Reservation[]> => {
      void refreshKey;
      return fetchUserReservations(userId, { signal });
    },
    [userId, refreshKey],
  );
  const { data, isLoading, error, reload } = useAsyncData<readonly Reservation[]>(
    load,
    NO_RESERVATIONS,
  );
  const { cancellingId, error: cancelError, cancel: cancelRecord } = useCancelReservation();

  const cancel = useCallback(
    async (reservationId: string): Promise<void> => {
      if (await cancelRecord(reservationId)) {
        reload();
      }
    },
    [cancelRecord, reload],
  );

  return { reservations: data, isLoading, error, cancellingId, cancelError, reload, cancel };
};
