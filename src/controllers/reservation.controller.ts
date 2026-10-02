/**
 * Reservation controller: validates the incoming payload into a DTO, calls the
 * service, sets the status code. No database access, no business rules -
 * overlap detection and status assignment live in the service.
 */
import type { NextFunction, Request, Response } from "express";

import { badRequest } from "../errors/http-error.ts";
import {
  createReservation as createReservationRecord,
  listActiveReservationsForUser,
} from "../services/reservation.service.ts";
import type { SuccessResponse } from "../types/api.ts";
import type { CreateReservationDto, Reservation } from "../types/reservation.ts";

/**
 * ISO 8601 date-time with an explicit UTC designator or numeric offset, which
 * is what `format: date-time` requires in docs/openapi.yaml.
 */
const ISO_DATE_TIME_PATTERN: RegExp =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const parseRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw badRequest(`${field} is required and must be a non-empty string.`, "VALIDATION_ERROR");
  }
  return value.trim();
};

const parseIsoDateTime = (value: unknown, field: string): string => {
  const raw: string = parseRequiredString(value, field);
  if (!ISO_DATE_TIME_PATTERN.test(raw) || Number.isNaN(Date.parse(raw))) {
    throw badRequest(
      `${field} must be an ISO 8601 date-time string, for example 2026-10-01T10:00:00Z.`,
      "VALIDATION_ERROR",
    );
  }
  return raw;
};

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
  const body: SuccessResponse<Reservation> = { success: true, data: reservation };
  res.status(201).json(body);
};

/** GET /api/v1/reservations/user/:userId */
export const getUserReservations = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const userId: string = parseRequiredString(req.params["userId"], "userId");
  const reservations: readonly Reservation[] = await listActiveReservationsForUser(userId);
  const body: SuccessResponse<readonly Reservation[]> = { success: true, data: reservations };
  res.status(200).json(body);
};
