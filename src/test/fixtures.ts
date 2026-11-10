/**
 * Shared constants and helpers for the test suites.
 */
import { seedResources } from "../services/resource.service.ts";

/** Seeded, available ROOM. */
export const ROOM_ID: string = "65f000000000000000000101";
/** Second seeded, available ROOM. */
export const OTHER_ROOM_ID: string = "65f000000000000000000102";
/** Seeded EQUIPMENT with isAvailable=false. */
export const UNAVAILABLE_RESOURCE_ID: string = "65f000000000000000000202";
/** Well-formed ObjectId that matches nothing. */
export const MISSING_ID: string = "65f0000000000000000009ff";

export const USER_ID: string = "user-1";

export const BASE_START: string = "2030-01-01T10:00:00.000Z";
export const BASE_END: string = "2030-01-01T11:00:00.000Z";

/** ISO string `offsetMs` milliseconds away from the base start. */
export const shiftFromStart = (offsetMs: number): string => {
  return new Date(Date.parse(BASE_START) + offsetMs).toISOString();
};

/** Inserts the starter catalogue; the global setup wipes it after each test. */
export const seedCatalogue = async (): Promise<void> => {
  await seedResources();
};
