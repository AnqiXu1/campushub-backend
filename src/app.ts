/**
 * Express application assembly.
 * Creating the app is separate from starting the server so that the app
 * can be built without opening a port.
 */
import express, { type Express } from "express";

import { errorHandler } from "./middlewares/error-handler.ts";
import { notFoundHandler } from "./middlewares/not-found.ts";
import { apiRouter } from "./routes/index.ts";

/** Single source of truth for the versioned API prefix. */
export const API_PREFIX: string = "/api/v1";

export const createApp = (): Express => {
  const app: Express = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(API_PREFIX, apiRouter);

  // The 404 handler must come after all routes, and the error handler last of all.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
