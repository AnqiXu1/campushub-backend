/**
 * Health controller: reads the request, calls the service, sets the status code.
 * No database access, no business rules.
 */
import type { NextFunction, Request, Response } from "express";

import { getHealthStatus, type HealthStatus } from "../services/health.service.ts";
import type { SuccessResponse } from "../types/api.ts";

export const getHealth = async (
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const health: HealthStatus = getHealthStatus();
  const body: SuccessResponse<HealthStatus> = { success: true, data: health };
  res.status(200).json(body);
};
