/**
 * Process entry point: start the HTTP listener first, then connect to MongoDB
 * in the background, retrying until it succeeds, and shut down gracefully.
 * The listener does not wait for the database, so the API stays reachable
 * (and /api/v1/health reports the real connection state) while MongoDB is down.
 */
import type { Server } from "node:http";

import { createApp } from "./app.ts";
import { connectDatabase, disconnectDatabase } from "./config/database.ts";
import { loadConfig, type AppConfig } from "./config/env.ts";

const SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
const DATABASE_RETRY_DELAY_MS: number = 5000;

let isShuttingDown: boolean = false;
let databaseRetryTimer: NodeJS.Timeout | undefined = undefined;

const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const delay = (milliseconds: number): Promise<void> => {
  return new Promise<void>((resolve): void => {
    databaseRetryTimer = setTimeout((): void => {
      databaseRetryTimer = undefined;
      resolve();
    }, milliseconds);
  });
};

const connectDatabaseWithRetry = async (mongoUri: string): Promise<void> => {
  while (!isShuttingDown) {
    try {
      await connectDatabase(mongoUri);
      console.log("Connected to MongoDB.");
      return;
    } catch (error: unknown) {
      if (isShuttingDown) {
        return;
      }
      console.error(
        `MongoDB connection failed: ${describeError(error)}. Retrying in ${DATABASE_RETRY_DELAY_MS} ms.`,
      );
      await delay(DATABASE_RETRY_DELAY_MS);
    }
  }
};

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error: Error | undefined): void => {
      if (error === undefined) {
        resolve();
        return;
      }
      reject(error);
    });
  });
};

const shutdown = async (server: Server, signal: NodeJS.Signals): Promise<void> => {
  console.log(`Received ${signal}, shutting down gracefully.`);
  isShuttingDown = true;
  if (databaseRetryTimer !== undefined) {
    clearTimeout(databaseRetryTimer);
    databaseRetryTimer = undefined;
  }
  try {
    await closeServer(server);
    await disconnectDatabase();
    process.exit(0);
  } catch (error: unknown) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

const registerShutdownHandlers = (server: Server): void => {
  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal, (): void => {
      void shutdown(server, signal);
    });
  }
};

const startServer = async (): Promise<void> => {
  const config: AppConfig = loadConfig();

  const server: Server = createApp().listen(config.port, (): void => {
    console.log(`Server listening on port ${config.port} in ${config.nodeEnv} mode.`);
  });

  // A failed listen (for example a port already in use) is emitted as an event,
  // so it cannot be caught by the try/catch around startServer.
  server.on("error", (error: Error): void => {
    console.error(`HTTP server error: ${describeError(error)}`);
    process.exit(1);
  });

  registerShutdownHandlers(server);

  await connectDatabaseWithRetry(config.mongoUri);
};

try {
  await startServer();
} catch (error: unknown) {
  console.error("Failed to start the server:", error);
  process.exit(1);
}
