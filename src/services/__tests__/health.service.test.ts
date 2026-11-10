import { getHealthStatus, type HealthStatus } from "../health.service.ts";

describe("getHealthStatus", () => {
  it("reports ok with a connected database and a valid timestamp", () => {
    const health: HealthStatus = getHealthStatus();

    expect(health.status).toBe("ok");
    expect(health.database).toBe("connected");
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
  });
});
