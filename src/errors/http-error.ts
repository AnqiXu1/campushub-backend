/**
 * Transport-agnostic application error.
 * Services throw it to describe a business failure; the error middleware
 * is the only place that turns it into an HTTP response.
 */

export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Each factory fixes the status code and supplies a default machine-readable
 * code. A caller may override that code with a narrower one (for example
 * "VALIDATION_ERROR" or "DOUBLE_BOOKING") when the contract names it, without
 * inventing a new status mapping.
 */
export const badRequest = (message: string, code: string = "BAD_REQUEST"): HttpError =>
  new HttpError(400, code, message);
export const unauthorized = (message: string, code: string = "UNAUTHORIZED"): HttpError =>
  new HttpError(401, code, message);
export const forbidden = (message: string, code: string = "FORBIDDEN"): HttpError =>
  new HttpError(403, code, message);
export const notFound = (message: string, code: string = "NOT_FOUND"): HttpError =>
  new HttpError(404, code, message);
export const conflict = (message: string, code: string = "CONFLICT"): HttpError =>
  new HttpError(409, code, message);
