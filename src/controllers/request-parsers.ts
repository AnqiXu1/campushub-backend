/**
 * Shared request-input parsers for controllers. Each parser narrows an
 * `unknown` value and throws a 400 VALIDATION_ERROR on bad input, so the
 * global error handler produces the response.
 */
import { badRequest } from "../errors/http-error.ts";

/**
 * ISO 8601 date-time with an explicit UTC designator or numeric offset, which
 * is what `format: date-time` requires in docs/openapi.yaml.
 */
const ISO_DATE_TIME_PATTERN: RegExp =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const parseRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw badRequest(`${field} is required and must be a non-empty string.`, "VALIDATION_ERROR");
  }
  return value.trim();
};

/**
 * Accepts an absent parameter, rejects a present-but-empty one. This mirrors
 * `minLength: 1` on optional string query parameters in docs/openapi.yaml.
 */
export const parseOptionalStringParam = (value: unknown, field: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") {
    throw badRequest(`${field} must be a non-empty string when provided.`, "VALIDATION_ERROR");
  }
  return value.trim();
};

/**
 * Accepts an absent parameter, or the exact strings "true" / "false".
 * Anything else is rejected, matching the boolean schema in docs/openapi.yaml.
 */
export const parseOptionalBooleanParam = (value: unknown, field: string): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw badRequest(`${field} must be either "true" or "false" when provided.`, "VALIDATION_ERROR");
};

export const parseIsoDateTime = (value: unknown, field: string): string => {
  const raw: string = parseRequiredString(value, field);
  if (!ISO_DATE_TIME_PATTERN.test(raw) || Number.isNaN(Date.parse(raw))) {
    throw badRequest(
      `${field} must be an ISO 8601 date-time string, for example 2026-10-01T10:00:00Z.`,
      "VALIDATION_ERROR",
    );
  }
  return raw;
};
