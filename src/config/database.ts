/**
 * MongoDB connection lifecycle.
 * This is the only module allowed to call mongoose.connect / mongoose.disconnect.
 */
import mongoose from "mongoose";

export type DatabaseState =
  "disconnected" | "connected" | "connecting" | "disconnecting" | "unknown";

const DATABASE_STATES: Readonly<Record<number, DatabaseState>> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/**
 * How long a single connection attempt may spend selecting a server before it
 * fails. Kept well below the driver default of 30s so the caller can retry
 * quickly instead of hanging when MongoDB is unreachable.
 */
const SERVER_SELECTION_TIMEOUT_MS: number = 5000;

export const connectDatabase = async (mongoUri: string): Promise<void> => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};

export const getDatabaseState = (): DatabaseState => {
  return DATABASE_STATES[mongoose.connection.readyState] ?? "unknown";
};
