/**
 * Contract types mirroring docs/openapi.yaml field for field.
 * Type-only: no runtime values live in src/types.
 */

/** components/schemas/ResourceType */
export type ResourceType = "ROOM" | "EQUIPMENT" | "LAB";

/** components/schemas/ReservationStatus */
export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

/** components/schemas/Resource */
export interface Resource {
  readonly id: string;
  readonly name: string;
  readonly type: ResourceType;
  readonly location: string;
  readonly isAvailable: boolean;
}

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

/** components/schemas/CreateReservationRequest */
export interface CreateReservationDTO {
  readonly resourceId: string;
  readonly userId: string;
  readonly startTime: string;
  readonly endTime: string;
}

/** components/schemas/SuccessResponse envelope shared by every endpoint. */
export interface SuccessEnvelope<TData> {
  readonly success: true;
  readonly data: TData;
}

/** components/schemas/ErrorResponse */
export interface ErrorEnvelope {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}
