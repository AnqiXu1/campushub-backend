import request from "supertest";
import type { Express } from "express";

import { createApp } from "../../app.ts";
import {
  BASE_END,
  BASE_START,
  MISSING_ID,
  ROOM_ID,
  UNAVAILABLE_RESOURCE_ID,
  USER_ID,
  seedCatalogue,
  shiftFromStart,
} from "../../test/fixtures.ts";

const app: Express = createApp();
const RESERVATIONS_URL: string = "/api/v1/reservations";

const validBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  return {
    resourceId: ROOM_ID,
    userId: USER_ID,
    startTime: BASE_START,
    endTime: BASE_END,
    ...overrides,
  };
};

beforeEach(async (): Promise<void> => {
  await seedCatalogue();
});

describe("POST /api/v1/reservations", () => {
  it("returns 201 Created with the reservation envelope", async () => {
    const response = await request(app).post(RESERVATIONS_URL).send(validBody());

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: {
        id: expect.stringMatching(/^[0-9a-f]{24}$/),
        resourceId: ROOM_ID,
        userId: USER_ID,
        startTime: BASE_START,
        endTime: BASE_END,
        status: "PENDING",
      },
    });
  });

  it("accepts numeric UTC offsets and normalises them to UTC", async () => {
    const response = await request(app)
      .post(RESERVATIONS_URL)
      .send(
        validBody({ startTime: "2030-01-01T05:00:00-05:00", endTime: "2030-01-01T06:00:00-05:00" }),
      );

    expect(response.status).toBe(201);
    expect(response.body.data.startTime).toBe(BASE_START);
  });

  it("trims surrounding whitespace from string fields", async () => {
    const response = await request(app)
      .post(RESERVATIONS_URL)
      .send(validBody({ userId: `  ${USER_ID}  `, resourceId: ` ${ROOM_ID} ` }));

    expect(response.status).toBe(201);
    expect(response.body.data.userId).toBe(USER_ID);
  });

  it("returns 409 DOUBLE_BOOKING on an overlapping booking", async () => {
    await request(app).post(RESERVATIONS_URL).send(validBody());
    const response = await request(app)
      .post(RESERVATIONS_URL)
      .send(
        validBody({
          userId: "user-2",
          startTime: shiftFromStart(3_600_000 - 1),
          endTime: shiftFromStart(2 * 3_600_000),
        }),
      );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      error: { code: "DOUBLE_BOOKING", message: expect.any(String) },
    });
  });

  it("returns 409 on an exact duplicate booking", async () => {
    await request(app).post(RESERVATIONS_URL).send(validBody());
    const response = await request(app).post(RESERVATIONS_URL).send(validBody());
    expect(response.status).toBe(409);
  });

  it("returns 201 for a back-to-back booking", async () => {
    await request(app).post(RESERVATIONS_URL).send(validBody());
    const response = await request(app)
      .post(RESERVATIONS_URL)
      .send(validBody({ startTime: BASE_END, endTime: shiftFromStart(2 * 3_600_000) }));
    expect(response.status).toBe(201);
  });

  it("returns 404 for an unknown resource", async () => {
    const response = await request(app)
      .post(RESERVATIONS_URL)
      .send(validBody({ resourceId: MISSING_ID }));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 409 RESOURCE_UNAVAILABLE for a resource that is closed for booking", async () => {
    const response = await request(app)
      .post(RESERVATIONS_URL)
      .send(validBody({ resourceId: UNAVAILABLE_RESOURCE_ID }));
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("RESOURCE_UNAVAILABLE");
  });

  it("returns 400 when endTime is before startTime", async () => {
    const response = await request(app)
      .post(RESERVATIONS_URL)
      .send(validBody({ startTime: BASE_END, endTime: BASE_START }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  describe("payload fuzzing", () => {
    const missingFieldCases: readonly string[] = ["resourceId", "userId", "startTime", "endTime"];

    it.each(missingFieldCases)("returns 400 when %s is missing", async (field: string) => {
      const body: Record<string, unknown> = validBody();
      delete body[field];
      const response = await request(app).post(RESERVATIONS_URL).send(body);
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain(field);
    });

    const wrongTypeValues: readonly unknown[] = [null, 42, true, [], {}, "", "   "];

    it.each(missingFieldCases)(
      "returns 400 when %s has a non-string or blank value",
      async (field: string) => {
        for (const value of wrongTypeValues) {
          const response = await request(app)
            .post(RESERVATIONS_URL)
            .send(validBody({ [field]: value }));
          expect({ field, value, status: response.status }).toEqual({ field, value, status: 400 });
        }
      },
    );

    const badDates: readonly string[] = [
      "tomorrow",
      "2030-01-01",
      "2030-01-01T10:00:00",
      "2030-01-01 10:00:00Z",
      "2030-13-01T10:00:00Z",
      "2030-02-30T10:00:00Z",
      "2030-01-01T25:00:00Z",
      "1893492000000",
      "2030-01-01T10:00:00+0100",
      "Tue, 01 Jan 2030 10:00:00 GMT",
    ];

    it.each(badDates)("returns 400 for the malformed startTime %j", async (startTime: string) => {
      const response = await request(app).post(RESERVATIONS_URL).send(validBody({ startTime }));
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when the JSON body is an array", async () => {
      const response = await request(app)
        .post(RESERVATIONS_URL)
        .set("Content-Type", "application/json")
        .send("[]");
      expect(response.status).toBe(400);
    });

    // KNOWN DEFECT: express.json() in strict mode rejects top-level primitives
    // with a body-parser error that the global error handler does not map, so the
    // client gets 500 instead of 400. Switch to `it.each` once it is fixed.
    it.failing.each(['"text"', "null", "42"])(
      "returns 400 when the JSON body is the primitive %s",
      async (raw: string) => {
        const response = await request(app)
          .post(RESERVATIONS_URL)
          .set("Content-Type", "application/json")
          .send(raw);
        expect(response.status).toBe(400);
      },
    );

    it("returns 400 when no body is sent", async () => {
      const response = await request(app).post(RESERVATIONS_URL);
      expect(response.status).toBe(400);
    });

    it("returns 400 for a form-encoded body missing required fields", async () => {
      const response = await request(app)
        .post(RESERVATIONS_URL)
        .type("form")
        .send({ userId: USER_ID });
      expect(response.status).toBe(400);
    });

    it("ignores unknown and privileged fields such as status and id", async () => {
      const response = await request(app)
        .post(RESERVATIONS_URL)
        .send(validBody({ status: "CONFIRMED", id: MISSING_ID, $where: "1" }));
      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe("PENDING");
      expect(response.body.data.id).not.toBe(MISSING_ID);
    });

    it("does not let an operator object in resourceId reach the query", async () => {
      const response = await request(app)
        .post(RESERVATIONS_URL)
        .send(validBody({ resourceId: { $ne: null } }));
      expect(response.status).toBe(400);
    });

    // KNOWN DEFECT: body-parser raises a plain SyntaxError that the global error
    // handler does not recognise, so malformed JSON is reported as 500. It should
    // be 400. Switch to `it` once the handler maps it.
    it.failing("returns 400 for syntactically invalid JSON", async () => {
      const response = await request(app)
        .post(RESERVATIONS_URL)
        .set("Content-Type", "application/json")
        .send('{"resourceId": ');
      expect(response.status).toBe(400);
    });
  });
});

describe("GET /api/v1/reservations/user/:userId", () => {
  it("returns 200 with the user's active reservations only", async () => {
    await request(app).post(RESERVATIONS_URL).send(validBody());
    await request(app)
      .post(RESERVATIONS_URL)
      .send(
        validBody({
          userId: "user-2",
          startTime: BASE_END,
          endTime: shiftFromStart(2 * 3_600_000),
        }),
      );

    const response = await request(app).get(`${RESERVATIONS_URL}/user/${USER_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].userId).toBe(USER_ID);
  });

  it("returns 200 with an empty list for an unknown user", async () => {
    const response = await request(app).get(`${RESERVATIONS_URL}/user/ghost`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("returns 400 for a blank userId", async () => {
    const response = await request(app).get(`${RESERVATIONS_URL}/user/%20`);
    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/v1/reservations/:id/cancel", () => {
  it("returns 200 and frees the slot for a new booking", async () => {
    const created = await request(app).post(RESERVATIONS_URL).send(validBody());
    const id: string = created.body.data.id;

    const cancelled = await request(app).patch(`${RESERVATIONS_URL}/${id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("CANCELLED");

    const rebooked = await request(app).post(RESERVATIONS_URL).send(validBody());
    expect(rebooked.status).toBe(201);
  });

  it("returns 409 when the reservation is already cancelled", async () => {
    const created = await request(app).post(RESERVATIONS_URL).send(validBody());
    const id: string = created.body.data.id;
    await request(app).patch(`${RESERVATIONS_URL}/${id}/cancel`);

    const again = await request(app).patch(`${RESERVATIONS_URL}/${id}/cancel`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await request(app).patch(`${RESERVATIONS_URL}/${MISSING_ID}/cancel`);
    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed id", async () => {
    const response = await request(app).patch(`${RESERVATIONS_URL}/not-an-id/cancel`);
    expect(response.status).toBe(404);
  });
});

describe("unmatched routes", () => {
  it("returns the standard 404 envelope", async () => {
    const response = await request(app).get("/api/v1/nope");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: expect.stringContaining("/api/v1/nope") },
    });
  });

  it("rejects an unsupported method on a known path", async () => {
    const response = await request(app).delete(RESERVATIONS_URL);
    expect(response.status).toBe(404);
  });
});
