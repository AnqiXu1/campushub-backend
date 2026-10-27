import { useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";

import { useCreateReservation } from "../hooks/use-create-reservation.ts";
import type { Reservation, Resource } from "../types/api.ts";
import ErrorAlert from "./ErrorAlert.tsx";
import styles from "./BookingForm.module.css";

interface BookingFormProps {
  readonly resource: Resource | null;
  readonly userId: string;
  readonly onBooked: (reservation: Reservation) => void;
}

interface FormErrors {
  readonly startTime?: string | undefined;
  readonly endTime?: string | undefined;
}

/** Validates the raw datetime-local values; returns an empty object when valid. */
const validate = (startValue: string, endValue: string, now: number): FormErrors => {
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

const BookingForm = ({ resource, userId, onBooked }: BookingFormProps): ReactElement => {
  const [startValue, setStartValue] = useState<string>("");
  const [endValue, setEndValue] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const { isLoading, error, submit, clearError } = useCreateReservation();

  const resetFeedback = (): void => {
    setConfirmation(null);
    clearError();
  };

  const handleStartChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setStartValue(event.target.value);
    resetFeedback();
  };

  const handleEndChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setEndValue(event.target.value);
    resetFeedback();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (resource === null) {
      return;
    }
    resetFeedback();
    const errors: FormErrors = validate(startValue, endValue, Date.now());
    setFieldErrors(errors);
    if (errors.startTime !== undefined || errors.endTime !== undefined) {
      return;
    }
    const reservation: Reservation | null = await submit({
      resourceId: resource.id,
      userId,
      startTime: new Date(startValue).toISOString(),
      endTime: new Date(endValue).toISOString(),
    });
    if (reservation !== null) {
      setConfirmation(`Booked ${resource.name}.`);
      setStartValue("");
      setEndValue("");
      onBooked(reservation);
    }
  };

  return (
    <section className={styles["section"]}>
      <h2 className={styles["heading"]}>Book a resource</h2>
      {resource === null ? (
        <p className={styles["hint"]}>Choose a resource from the list to start booking.</p>
      ) : (
        <form
          className={styles["form"]}
          noValidate
          onSubmit={(event: FormEvent<HTMLFormElement>): void => {
            void handleSubmit(event);
          }}
        >
          <p className={styles["target"]}>
            <strong>{resource.name}</strong> - {resource.location}
          </p>

          <label className={styles["field"]}>
            Start time
            <input
              type="datetime-local"
              value={startValue}
              onChange={handleStartChange}
              aria-invalid={fieldErrors.startTime !== undefined}
              disabled={isLoading}
            />
            {fieldErrors.startTime !== undefined && (
              <span className={styles["fieldError"]}>{fieldErrors.startTime}</span>
            )}
          </label>

          <label className={styles["field"]}>
            End time
            <input
              type="datetime-local"
              value={endValue}
              onChange={handleEndChange}
              aria-invalid={fieldErrors.endTime !== undefined}
              disabled={isLoading}
            />
            {fieldErrors.endTime !== undefined && (
              <span className={styles["fieldError"]}>{fieldErrors.endTime}</span>
            )}
          </label>

          {error !== null && <ErrorAlert error={error} />}
          {confirmation !== null && (
            <p role="status" className={styles["success"]}>
              {confirmation}
            </p>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Booking..." : "Submit booking"}
          </button>
        </form>
      )}
    </section>
  );
};

export default BookingForm;
