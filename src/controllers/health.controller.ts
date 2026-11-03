/**
 * Health controller: reads the request, calls the service, sets the status code.
 * No database access, no business rules.
 */
import type { NextFunction, Request, Response } from "express";

import { getHealthStatus, type HealthStatus } from "../services/health.service.ts";
import { sendSuccess } from "./send-success.ts";

export const getHealth = async (
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  sendSuccess(res, 200, getHealthStatus());
};
