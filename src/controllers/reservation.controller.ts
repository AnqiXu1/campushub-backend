/**
 * Reservation controller: validates the incoming payload into a DTO, calls the
 * service, sets the status code. No database access, no business rules -
 * overlap detection and status assignment live in the service.
 */
import type { NextFunction, Request, Response } from "express";

import { badRequest } from "../errors/http-error.ts";
import {
  cancelReservation as cancelReservationRecord,
  createReservation as createReservationRecord,
  listActiveReservationsForUser,
} from "../services/reservation.service.ts";
import type { CreateReservationDto, Reservation } from "../types/reservation.ts";
import { parseIsoDateTime, parseRequiredString } from "./request-parsers.ts";
import { sendSuccess } from "./send-success.ts";

const parseCreateReservationBody = (body: unknown): CreateReservationDto => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object.", "VALIDATION_ERROR");
  }

  const payload: Record<string, unknown> = body as Record<string, unknown>;
  return {
    resourceId: parseRequiredString(payload["resourceId"], "resourceId"),
    userId: parseRequiredString(payload["userId"], "userId"),
    startTime: parseIsoDateTime(payload["startTime"], "startTime"),
    endTime: parseIsoDateTime(payload["endTime"], "endTime"),
  };
};

/** POST /api/v1/reservations */
export const createReservation = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const input: CreateReservationDto = parseCreateReservationBody(req.body);
  const reservation: Reservation = await createReservationRecord(input);
  sendSuccess(res, 201, reservation);
};

/** GET /api/v1/reservations/user/:userId */
export const getUserReservations = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const userId: string = parseRequiredString(req.params["userId"], "userId");
  const reservations: readonly Reservation[] = await listActiveReservationsForUser(userId);
  sendSuccess(res, 200, reservations);
};

/** PATCH /api/v1/reservations/:id/cancel */
export const cancelReservation = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const reservationId: string = parseRequiredString(req.params["id"], "id");
  const reservation: Reservation = await cancelReservationRecord(reservationId);
  sendSuccess(res, 200, reservation);
};
