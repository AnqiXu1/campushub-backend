/**
 * Resource controller: reads the request, calls the service, sets the status
 * code. No database access, no business rules.
 */
import type { NextFunction, Request, Response } from "express";

import { listResources as listResourcesFromCatalogue } from "../services/resource.service.ts";
import type { ListResourcesQuery, Resource } from "../types/resource.ts";
import { parseOptionalBooleanParam, parseOptionalStringParam } from "./request-parsers.ts";
import { sendSuccess } from "./send-success.ts";

const parseListResourcesQuery = (query: Request["query"]): ListResourcesQuery => {
  return {
    type: parseOptionalStringParam(query["type"], "type"),
    isAvailable: parseOptionalBooleanParam(query["isAvailable"], "isAvailable"),
  };
};

/** GET /api/v1/resources */
export const listResources = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const query: ListResourcesQuery = parseListResourcesQuery(req.query);
  const resources: readonly Resource[] = await listResourcesFromCatalogue(query);
  sendSuccess(res, 200, resources);
};
