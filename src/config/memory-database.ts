/**
 * Optional in-memory MongoDB for local development and manual testing.
 * mongodb-memory-server is a devDependency, so it is imported lazily and only
 * when USE_IN_MEMORY_DB=true; production builds never load it.
 */
import type { MongoMemoryServer } from "mongodb-memory-server";

let memoryServer: MongoMemoryServer | undefined = undefined;

/** Starts the in-memory server (once) and returns its connection URI. */
export const startMemoryDatabase = async (): Promise<string> => {
  if (memoryServer === undefined) {
    const { MongoMemoryServer: MemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MemoryServer.create();
  }
  return memoryServer.getUri("campushub");
};

export const stopMemoryDatabase = async (): Promise<void> => {
  if (memoryServer !== undefined) {
    await memoryServer.stop();
    memoryServer = undefined;
  }
};
