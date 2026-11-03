/**
 * Contract types shared with the backend. The single source of truth is
 * src/types/ (which mirrors docs/openapi.yaml); the client re-exports it so
 * both sides of the HTTP boundary can never drift apart.
 * Type-only: everything here is erased at compile time.
 */
export type { ErrorResponse, SuccessResponse } from "../../../src/types/api.ts";
export type {
  CreateReservationDto,
  Reservation,
  ReservationStatus,
} from "../../../src/types/reservation.ts";
export type { Resource, ResourceType } from "../../../src/types/resource.ts";
