/**
 * Reservation business logic and persistence: overlap detection, status
 * assignment and per-user listing. No knowledge of HTTP; failures are raised
 * as HttpError instances that the global error middleware translates.
 * This is the only layer that touches ReservationModel.
 */
import { Types } from "mongoose";

import { badRequest, conflict, notFound } from "../errors/http-error.ts";
import { ReservationModel, type IReservation } from "../models/reservation.model.ts";
import { findResourceById } from "./resource.service.ts";
import type { CreateReservationDto, Reservation, ReservationStatus } from "../types/reservation.ts";
import type { Resource } from "../types/resource.ts";

/** A reservation in one of these states still occupies its time block. */
const ACTIVE_STATUSES: readonly ReservationStatus[] = ["PENDING", "CONFIRMED"];

/** Status given to every newly created reservation. */
const INITIAL_STATUS: ReservationStatus = "PENDING";

const toReservation = (document: IReservation): Reservation => {
  return {
    id: document._id.toHexString(),
    resourceId: document.resourceId.toHexString(),
    userId: document.userId,
    startTime: document.startTime.toISOString(),
    endTime: document.endTime.toISOString(),
    status: document.status,
  };
};

export const createReservation = async (input: CreateReservationDto): Promise<Reservation> => {
  const startTime: Date = new Date(input.startTime);
  const endTime: Date = new Date(input.endTime);

  if (endTime.getTime() <= startTime.getTime()) {
    throw badRequest("endTime must be later than startTime.", "VALIDATION_ERROR");
  }

  const resource: Resource | undefined = await findResourceById(input.resourceId);
  if (resource === undefined) {
    throw notFound(`Resource not found: ${input.resourceId}`);
  }
  if (!resource.isAvailable) {
    throw conflict(`Resource is not open for booking: ${input.resourceId}`, "RESOURCE_UNAVAILABLE");
  }

  const resourceObjectId: Types.ObjectId = new Types.ObjectId(resource.id);

  // Half-open comparison: a block ending exactly when another starts is free.
  const clashing: Pick<IReservation, "_id"> | null = await ReservationModel.exists({
    resourceId: resourceObjectId,
    status: { $in: ACTIVE_STATUSES },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (clashing !== null) {
    throw conflict("Resource is already reserved for this time slot.", "DOUBLE_BOOKING");
  }

  const created: IReservation = await ReservationModel.create({
    resourceId: resourceObjectId,
    userId: input.userId,
    startTime,
    endTime,
    status: INITIAL_STATUS,
  });

  return toReservation(created);
};

/** Active reservations belonging to a user, earliest block first. */
export const listActiveReservationsForUser = async (
  userId: string,
): Promise<readonly Reservation[]> => {
  const documents: IReservation[] = await ReservationModel.find({
    userId,
    status: { $in: ACTIVE_STATUSES },
  }).sort({ startTime: 1 });
  return documents.map(toReservation);
};
