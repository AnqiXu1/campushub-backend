/**
 * Mongoose schema for the Reservation entity.
 * Fields correspond one-to-one with components/schemas/Reservation in
 * docs/openapi.yaml and with the Reservation type in src/types/reservation.ts.
 */
import { Schema, model, type Document, type Model } from "mongoose";

import type { ReservationStatus } from "../types/reservation.ts";

/** Allowed values of `status`, kept in step with the ReservationStatus union. */
export const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
] as const satisfies readonly ReservationStatus[];

export interface IReservation extends Document {
  resourceId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema: Schema<IReservation> = new Schema<IReservation>(
  {
    resourceId: { type: String, required: true, trim: true },
    userId: { type: String, required: true, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, required: true, enum: RESERVATION_STATUSES, default: "PENDING" },
  },
  { timestamps: true },
);

// Supports the overlap lookup performed when a reservation is created,
// and the per-user listing.
reservationSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ userId: 1, status: 1, startTime: 1 });

export const ReservationModel: Model<IReservation> = model<IReservation>(
  "Reservation",
  reservationSchema,
);
