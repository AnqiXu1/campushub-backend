/**
 * Health service: pure logic, no knowledge of HTTP.
 */
import { getDatabaseState, type DatabaseState } from "../config/database.ts";

export interface HealthStatus {
  readonly status: "ok";
  readonly uptimeSeconds: number;
  readonly database: DatabaseState;
  readonly timestamp: string;
}

export const getHealthStatus = (): HealthStatus => {
  return {
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
    database: getDatabaseState(),
    timestamp: new Date().toISOString(),
  };
};
