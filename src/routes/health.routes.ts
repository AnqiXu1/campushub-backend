/**
 * Health routes: mapping only.
 */
import { Router } from "express";

import { getHealth } from "../controllers/health.controller.ts";
import { asyncHandler } from "../middlewares/async-handler.ts";

export const healthRouter: Router = Router();

healthRouter.get("/", asyncHandler(getHealth));
