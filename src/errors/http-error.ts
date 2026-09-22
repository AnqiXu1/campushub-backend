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

export const badRequest = (message: string): HttpError => new HttpError(400, "BAD_REQUEST", message);
export const unauthorized = (message: string): HttpError => new HttpError(401, "UNAUTHORIZED", message);
export const forbidden = (message: string): HttpError => new HttpError(403, "FORBIDDEN", message);
export const notFound = (message: string): HttpError => new HttpError(404, "NOT_FOUND", message);
export const conflict = (message: string): HttpError => new HttpError(409, "CONFLICT", message);
