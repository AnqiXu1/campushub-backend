import { useCallback, useState } from "react";

import { createReservation } from "../api/campushubApi.ts";
import type { CreateReservationDto, Reservation } from "../types/api.ts";
import type { UiError } from "../types/ui.ts";
import { toUiError } from "../utils/ui-error.ts";

export interface CreateReservationState {
  readonly isLoading: boolean;
  readonly error: UiError | null;
  /** Resolves with the created reservation, or null when the request failed. */
  readonly submit: (payload: CreateReservationDto) => Promise<Reservation | null>;
  readonly clearError: () => void;
}

export const useCreateReservation = (): CreateReservationState => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<UiError | null>(null);

  const submit = useCallback(async (payload: CreateReservationDto): Promise<Reservation | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await createReservation(payload);
    } catch (caught: unknown) {
      setError(toUiError(caught));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return { isLoading, error, submit, clearError };
};
