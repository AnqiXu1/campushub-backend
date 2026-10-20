/**
 * Reservation routes: mapping only.
 * Mounted under /api/v1/reservations (see src/routes/index.ts), so the paths
 * declared here resolve to the endpoints named in docs/openapi.yaml.
 */
import { Router } from "express";

import {
  cancelReservation,
  createReservation,
  getUserReservations,
} from "../controllers/reservation.controller.ts";
import { asyncHandler } from "../middlewares/async-handler.ts";

export const reservationRouter: Router = Router();

reservationRouter.post("/", asyncHandler(createReservation));
reservationRouter.get("/user/:userId", asyncHandler(getUserReservations));
reservationRouter.patch("/:id/cancel", asyncHandler(cancelReservation));
