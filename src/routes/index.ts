/**
 * API router aggregator. Every resource router is mounted here under its path.
 */
import { Router } from "express";

import { healthRouter } from "./health.routes.ts";

export const apiRouter: Router = Router();

apiRouter.use("/health", healthRouter);
