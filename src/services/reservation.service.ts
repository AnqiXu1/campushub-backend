/**
 * Reservation business logic: overlap detection, status assignment and
 * per-user listing. No knowledge of HTTP; failures are raised as HttpError
 * instances that the global error middleware translates.
 *
 * Reservations are held in memory so the contract can be exercised locally
 * without a running MongoDB instance. src/models/reservation.model.ts already
 * carries the persistent shape and the indexes that back the overlap lookup.
 */
import { randomUUID } from "node:crypto";

import { badRequest, conflict, notFound } from "../errors/http-error.ts";
import { findResourceById } from "./resource.service.ts";
import type { CreateReservationDto, Reservation, ReservationStatus } from "../types/reservation.ts";
import type { Resource } from "../types/resource.ts";

/** A reservation in one of these states still occupies its time block. */
const ACTIVE_STATUSES: readonly ReservationStatus[] = ["PENDING", "CONFIRMED"];

/** Status given to every newly created reservation. */
const INITIAL_STATUS: ReservationStatus = "PENDING";

const reservations: Reservation[] = [];

/** Half-open comparison: a block ending exactly when another starts is free. */
const overlaps = (existing: Reservation, startTime: Date, endTime: Date): boolean => {
  const existingStart: number = new Date(existing.startTime).getTime();
  const existingEnd: number = new Date(existing.endTime).getTime();
  return existingStart < endTime.getTime() && existingEnd > startTime.getTime();
};

const isActive = (reservation: Reservation): boolean => {
  return ACTIVE_STATUSES.includes(reservation.status);
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

  const isDoubleBooked: boolean = reservations.some((existing: Reservation): boolean => {
    return (
      existing.resourceId === input.resourceId &&
      isActive(existing) &&
      overlaps(existing, startTime, endTime)
    );
  });
  if (isDoubleBooked) {
    throw conflict("Resource is already reserved for this time slot.", "DOUBLE_BOOKING");
  }

  const created: Reservation = {
    id: randomUUID(),
    resourceId: input.resourceId,
    userId: input.userId,
    // Normalised to UTC so stored values always match the contract's
    // ISO 8601 date-time format regardless of the offset the client sent.
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    status: INITIAL_STATUS,
  };
  reservations.push(created);

  return created;
};

/** Active reservations belonging to a user, earliest block first. */
export const listActiveReservationsForUser = async (
  userId: string,
): Promise<readonly Reservation[]> => {
  return reservations
    .filter((reservation: Reservation): boolean => {
      return reservation.userId === userId && isActive(reservation);
    })
    .sort((left: Reservation, right: Reservation): number => {
      return new Date(left.startTime).getTime() - new Date(right.startTime).getTime();
    });
};
