/**
 * The project-wide async error capture mechanism (CLAUDE.md 4.2, option 2).
 * Every async controller MUST be wrapped with it so that a rejected promise
 * reaches the global error middleware through next().
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export const asyncHandler = (handler: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      try {
        await handler(req, res, next);
      } catch (error: unknown) {
        next(error);
      }
    })();
  };
};
