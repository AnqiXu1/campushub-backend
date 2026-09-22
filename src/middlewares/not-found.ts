/**
 * Catch-all for unmatched routes. Delegates to the global error handler
 * so that unknown routes share the standard error response shape.
 */
import type { NextFunction, Request, Response } from "express";

import { notFound } from "../errors/http-error.ts";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
