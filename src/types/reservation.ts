/**
 * Contract types for the Reservation entity.
 * Mirrors components/schemas/Reservation and CreateReservationRequest in
 * docs/openapi.yaml field for field.
 * Type-only: no runtime values live in src/types.
 */

/** components/schemas/ReservationStatus */
export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

/** components/schemas/Reservation */
export interface Reservation {
  readonly id: string;
  readonly resourceId: string;
  readonly userId: string;
  /** Inclusive start of the block, ISO 8601 date-time string. */
  readonly startTime: string;
  /** Exclusive end of the block, ISO 8601 date-time string. */
  readonly endTime: string;
  readonly status: ReservationStatus;
}

/**
 * components/schemas/CreateReservationRequest - the validated body of
 * POST /reservations. `id` and `status` are assigned by the service.
 */
export interface CreateReservationDto {
  readonly resourceId: string;
  readonly userId: string;
  readonly startTime: string;
  readonly endTime: string;
}

/** Validated path parameters of GET /reservations/user/{userId}. */
export interface UserReservationsParams {
  readonly userId: string;
}
