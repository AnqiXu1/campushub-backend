/**
 * Resource controller: reads the request, calls the service, sets the status
 * code. No database access, no business rules.
 */
import type { NextFunction, Request, Response } from "express";

import { badRequest } from "../errors/http-error.ts";
import { listResources as listResourcesFromCatalogue } from "../services/resource.service.ts";
import type { SuccessResponse } from "../types/api.ts";
import type { ListResourcesQuery, Resource } from "../types/resource.ts";

/**
 * Accepts an absent parameter, rejects a present-but-empty one. This mirrors
 * `minLength: 1` on the optional `type` query parameter in docs/openapi.yaml.
 */
const parseOptionalStringParam = (value: unknown, field: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") {
    throw badRequest(`${field} must be a non-empty string when provided.`, "VALIDATION_ERROR");
  }
  return value.trim();
};

const parseListResourcesQuery = (query: Request["query"]): ListResourcesQuery => {
  return { type: parseOptionalStringParam(query["type"], "type") };
};

/** GET /api/v1/resources */
export const listResources = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const query: ListResourcesQuery = parseListResourcesQuery(req.query);
  const resources: readonly Resource[] = await listResourcesFromCatalogue(query);
  const body: SuccessResponse<readonly Resource[]> = { success: true, data: resources };
  res.status(200).json(body);
};
