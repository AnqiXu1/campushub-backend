/**
 * Resource routes: mapping only.
 * Mounted under /api/v1/resources (see src/routes/index.ts).
 */
import { Router } from "express";

import { listResources } from "../controllers/resource.controller.ts";
import { asyncHandler } from "../middlewares/async-handler.ts";

export const resourceRouter: Router = Router();

resourceRouter.get("/", asyncHandler(listResources));
