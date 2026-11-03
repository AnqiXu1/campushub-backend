import type { ReactElement } from "react";

import { useReservations } from "../hooks/use-reservations.ts";
import type { Reservation } from "../types/api.ts";
import ErrorAlert from "./ErrorAlert.tsx";
import styles from "./UserReservations.module.css";

interface UserReservationsProps {
  readonly userId: string;
  /** Changing this value reloads the list, e.g. after a booking was created. */
  readonly refreshKey: number;
}

const formatDateTime = (isoValue: string): string => {
  return new Date(isoValue).toLocaleString();
};

const UserReservations = ({ userId, refreshKey }: UserReservationsProps): ReactElement => {
  const { reservations, isLoading, error, cancellingId, cancelError, reload, cancel } =
    useReservations(userId, refreshKey);

  return (
    <section className={styles["section"]} aria-busy={isLoading}>
      <h2 className={styles["heading"]}>My bookings</h2>

      {error !== null && (
        <div className={styles["feedback"]}>
          <ErrorAlert error={error} />
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {cancelError !== null && <ErrorAlert error={cancelError} />}
      {isLoading && <p className={styles["status"]}>Loading reservations...</p>}
      {!isLoading && error === null && reservations.length === 0 && (
        <p className={styles["status"]}>You have no active reservations.</p>
      )}

      <ul className={styles["list"]}>
        {reservations.map((reservation: Reservation): ReactElement => (
          <li key={reservation.id} className={styles["item"]}>
            <div className={styles["details"]}>
              <strong>{reservation.resourceId}</strong>
              <span>
                {formatDateTime(reservation.startTime)} - {formatDateTime(reservation.endTime)}
              </span>
            </div>
            <span className={styles["badge"]}>{reservation.status}</span>
            <button
              type="button"
              disabled={cancellingId !== null}
              onClick={(): void => {
                void cancel(reservation.id);
              }}
            >
              {cancellingId === reservation.id ? "Cancelling..." : "Cancel reservation"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default UserReservations;
