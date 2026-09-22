/**
 * Global error handler: the final fallback for the whole application.
 * It is the only place that maps an error onto an HTTP status code and body.
 * Internal details (stack traces, driver errors) are never sent to the client.
 */
import type { NextFunction, Request, Response } from "express";

import type { ErrorResponse } from "../types/api.ts";
import { HttpError } from "../errors/http-error.ts";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof HttpError) {
    const body: ErrorResponse = {
      success: false,
      error: { code: error.code, message: error.message },
    };
    res.status(error.statusCode).json(body);
    return;
  }

  console.error("Unhandled error:", error);

  const body: ErrorResponse = {
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." },
  };
  res.status(500).json(body);
};
