/**
 * Jest setup: boots an isolated in-memory MongoDB for every test file, wipes
 * all collections between tests, and tears the server down afterwards.
 * Registered through `setupFilesAfterEnv` in jest.config.ts.
 */
import mongoose from "mongoose";

import { connectDatabase, disconnectDatabase } from "../config/database.ts";
import { startMemoryDatabase, stopMemoryDatabase } from "../config/memory-database.ts";

beforeAll(async (): Promise<void> => {
  const uri: string = await startMemoryDatabase();
  await connectDatabase(uri);
});

afterEach(async (): Promise<void> => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async (): Promise<void> => {
  await disconnectDatabase();
  await stopMemoryDatabase();
});
