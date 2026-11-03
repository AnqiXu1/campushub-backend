export interface BookingFormErrors {
  readonly startTime?: string | undefined;
  readonly endTime?: string | undefined;
}

/** Validates the raw datetime-local values; returns an empty object when valid. */
export const validateBooking = (
  startValue: string,
  endValue: string,
  now: number,
): BookingFormErrors => {
  const startMs: number = Date.parse(startValue);
  const endMs: number = Date.parse(endValue);
  const startError: string | undefined =
    startValue === "" || Number.isNaN(startMs)
      ? "Start time is required."
      : startMs < now
        ? "Start time must not be in the past."
        : undefined;
  const endError: string | undefined =
    endValue === "" || Number.isNaN(endMs)
      ? "End time is required."
      : startError === undefined && endMs <= startMs
        ? "End time must be after the start time."
        : undefined;
  return { startTime: startError, endTime: endError };
};
