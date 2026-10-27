import { useCallback, useState } from "react";

import { cancelReservation } from "../api/campushubApi.ts";
import type { UiError } from "../types/ui.ts";
import { toUiError } from "../utils/ui-error.ts";

export interface CancelReservationState {
  /** Id of the reservation being cancelled, or null when idle. */
  readonly cancellingId: string | null;
  readonly error: UiError | null;
  /** Resolves true when the cancellation succeeded. */
  readonly cancel: (reservationId: string) => Promise<boolean>;
}

export const useCancelReservation = (): CancelReservationState => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  const cancel = useCallback(async (reservationId: string): Promise<boolean> => {
    setCancellingId(reservationId);
    setError(null);
    try {
      await cancelReservation(reservationId);
      return true;
    } catch (caught: unknown) {
      setError(toUiError(caught));
      return false;
    } finally {
      setCancellingId(null);
    }
  }, []);

  return { cancellingId, error, cancel };
};
