import { ApiError } from "../api/campushubApi.ts";
import type { UiError } from "../types/ui.ts";

const CONFLICT_STATUS: number = 409;
const DOUBLE_BOOKING_CODE: string = "DOUBLE_BOOKING";
const DOUBLE_BOOKING_MESSAGE: string =
  "This resource is already reserved for the selected time window.";
const UNEXPECTED_ERROR_MESSAGE: string = "An unexpected error occurred. Please try again.";

/** Narrows an unknown thrown value into a message that is safe to show to the user. */
export const toUiError = (error: unknown): UiError => {
  if (error instanceof ApiError) {
    const isConflict: boolean = error.status === CONFLICT_STATUS;
    if (isConflict && error.code === DOUBLE_BOOKING_CODE) {
      return { message: DOUBLE_BOOKING_MESSAGE, isConflict };
    }
    return { message: error.message, isConflict };
  }
  return { message: UNEXPECTED_ERROR_MESSAGE, isConflict: false };
};

/** True when the error comes from an AbortController cancelling a request. */
export const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};
