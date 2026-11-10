import request from "supertest";
import type { Express } from "express";

import { createApp } from "../../app.ts";
import { UNAVAILABLE_RESOURCE_ID, seedCatalogue } from "../../test/fixtures.ts";
import type { Resource } from "../../types/resource.ts";

const app: Express = createApp();
const RESOURCES_URL: string = "/api/v1/resources";

beforeEach(async (): Promise<void> => {
  await seedCatalogue();
});

describe("GET /api/v1/resources", () => {
  it("returns 200 with the full catalogue when no filter is given", async () => {
    const response = await request(app).get(RESOURCES_URL);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(5);
  });

  it("filters by type", async () => {
    const response = await request(app).get(RESOURCES_URL).query({ type: "ROOM" });
    expect(response.status).toBe(200);
    const types: string[] = response.body.data.map((resource: Resource) => resource.type);
    expect(types).toEqual(["ROOM", "ROOM"]);
  });

  it("filters by isAvailable=false", async () => {
    const response = await request(app).get(RESOURCES_URL).query({ isAvailable: "false" });
    expect(response.status).toBe(200);
    expect(response.body.data.map((resource: Resource) => resource.id)).toEqual([
      UNAVAILABLE_RESOURCE_ID,
    ]);
  });

  it("combines type and isAvailable filters", async () => {
    const response = await request(app)
      .get(RESOURCES_URL)
      .query({ type: "equipment", isAvailable: "true" });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("3D Printer A");
  });

  it("returns 200 and an empty list for an unrecognised type", async () => {
    const response = await request(app).get(RESOURCES_URL).query({ type: "SPACESHIP" });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it.each(["yes", "1", "TRUE", "", "null"])(
    "returns 400 for isAvailable=%j",
    async (value: string) => {
      const response = await request(app).get(RESOURCES_URL).query({ isAvailable: value });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("returns 400 for an empty type parameter", async () => {
    const response = await request(app).get(`${RESOURCES_URL}?type=`);
    expect(response.status).toBe(400);
  });

  it("returns 400 for a repeated type parameter (array value)", async () => {
    const response = await request(app).get(`${RESOURCES_URL}?type=ROOM&type=LAB`);
    expect(response.status).toBe(400);
  });

  it("ignores an operator-style query key instead of passing it to the database", async () => {
    const response = await request(app).get(`${RESOURCES_URL}?type[$ne]=ROOM`);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(5);
  });
});

describe("GET /api/v1/health", () => {
  it("returns 200 with a connected database", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: "ok", database: "connected" });
  });
});
