/**
 * The single place a controller writes a success response, so every endpoint
 * shares the `SuccessResponse` envelope.
 */
import type { Response } from "express";

import type { SuccessResponse } from "../types/api.ts";

export const sendSuccess = <TData>(res: Response, status: 200 | 201, data: TData): void => {
  const body: SuccessResponse<TData> = { success: true, data };
  res.status(status).json(body);
};
