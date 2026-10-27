/**
 * Typed client for the CampusHub REST API described in docs/openapi.yaml.
 * Every function resolves with the unwrapped `data` of the success envelope
 * or rejects with an ApiError carrying the HTTP status and the error code.
 */
import type {
  CreateReservationDTO,
  ErrorEnvelope,
  Reservation,
  Resource,
  SuccessEnvelope,
} from "../types/api.ts";

const API_BASE_URL: string = "/api/v1";
const NETWORK_ERROR_CODE: string = "NETWORK_ERROR";
const INVALID_RESPONSE_CODE: string = "INVALID_RESPONSE";

/** Optional cancellation handle so components can abort in-flight requests. */
export interface RequestOptions {
  readonly signal?: AbortSignal | undefined;
}

/** A failed API call. `status` is 0 when no HTTP response was received. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isErrorEnvelope = (value: unknown): value is ErrorEnvelope => {
  if (!isRecord(value) || value["success"] !== false) {
    return false;
  }
  const error: unknown = value["error"];
  return (
    isRecord(error) && typeof error["code"] === "string" && typeof error["message"] === "string"
  );
};

const isSuccessEnvelope = <TData>(value: unknown): value is SuccessEnvelope<TData> => {
  return isRecord(value) && value["success"] === true && "data" in value;
};

const parseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
};

const request = async <TData>(
  path: string,
  init: RequestInit,
  options: RequestOptions,
): Promise<TData> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: options.signal ?? null });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(0, NETWORK_ERROR_CODE, "Unable to reach the server. Please try again.");
  }

  const body: unknown = await parseBody(response);

  if (!response.ok) {
    if (isErrorEnvelope(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message);
    }
    throw new ApiError(
      response.status,
      INVALID_RESPONSE_CODE,
      `The server responded with status ${response.status}.`,
    );
  }
  if (!isSuccessEnvelope<TData>(body)) {
    throw new ApiError(
      response.status,
      INVALID_RESPONSE_CODE,
      "The server returned an unexpected response.",
    );
  }
  return body.data;
};

/** GET /resources - lists resources, optionally filtered by type. */
export const fetchResources = async (
  type?: string,
  options: RequestOptions = {},
): Promise<readonly Resource[]> => {
  const query: string =
    type === undefined || type === "" ? "" : `?${new URLSearchParams({ type }).toString()}`;
  return request<readonly Resource[]>(`/resources${query}`, { method: "GET" }, options);
};

/** POST /reservations - books a resource; rejects with status 409 on a conflict. */
export const createReservation = async (
  payload: CreateReservationDTO,
  options: RequestOptions = {},
): Promise<Reservation> => {
  return request<Reservation>(
    "/reservations",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    options,
  );
};

/** GET /reservations/user/{userId} - lists the user's PENDING and CONFIRMED reservations. */
export const fetchUserReservations = async (
  userId: string,
  options: RequestOptions = {},
): Promise<readonly Reservation[]> => {
  return request<readonly Reservation[]>(
    `/reservations/user/${encodeURIComponent(userId)}`,
    { method: "GET" },
    options,
  );
};

/** PATCH /reservations/{id}/cancel - cancels a reservation; rejects with 409 if already cancelled. */
export const cancelReservation = async (
  reservationId: string,
  options: RequestOptions = {},
): Promise<Reservation> => {
  return request<Reservation>(
    `/reservations/${encodeURIComponent(reservationId)}/cancel`,
    { method: "PATCH" },
    options,
  );
};
