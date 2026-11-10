import { HttpError } from "../../errors/http-error.ts";
import { ReservationModel } from "../../models/reservation.model.ts";
import {
  BASE_END,
  BASE_START,
  MISSING_ID,
  OTHER_ROOM_ID,
  ROOM_ID,
  UNAVAILABLE_RESOURCE_ID,
  USER_ID,
  seedCatalogue,
  shiftFromStart,
} from "../../test/fixtures.ts";
import type { CreateReservationDto, Reservation } from "../../types/reservation.ts";
import {
  cancelReservation,
  createReservation,
  listActiveReservationsForUser,
} from "../reservation.service.ts";

const dto = (overrides: Partial<CreateReservationDto> = {}): CreateReservationDto => {
  return {
    resourceId: ROOM_ID,
    userId: USER_ID,
    startTime: BASE_START,
    endTime: BASE_END,
    ...overrides,
  };
};

const expectHttpError = async (
  promise: Promise<unknown>,
  statusCode: number,
  code: string,
): Promise<void> => {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown): unknown => reason,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect(error).toMatchObject({ statusCode, code });
};

beforeEach(async (): Promise<void> => {
  await seedCatalogue();
});

describe("createReservation - happy path", () => {
  it("creates a PENDING reservation with ISO timestamps", async () => {
    const reservation: Reservation = await createReservation(dto());

    expect(reservation).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{24}$/),
      resourceId: ROOM_ID,
      userId: USER_ID,
      startTime: BASE_START,
      endTime: BASE_END,
      status: "PENDING",
    });
    expect(await ReservationModel.countDocuments()).toBe(1);
  });

  it("allows back-to-back blocks (end of one equals start of the next)", async () => {
    await createReservation(dto());
    const next: Reservation = await createReservation(
      dto({ startTime: BASE_END, endTime: shiftFromStart(2 * 3_600_000) }),
    );
    expect(next.status).toBe("PENDING");
  });

  it("allows the same time block on a different resource", async () => {
    await createReservation(dto());
    const other: Reservation = await createReservation(dto({ resourceId: OTHER_ROOM_ID }));
    expect(other.resourceId).toBe(OTHER_ROOM_ID);
  });

  it("allows the same time block for a different user on a different resource", async () => {
    await createReservation(dto());
    await expect(
      createReservation(dto({ resourceId: OTHER_ROOM_ID, userId: "user-2" })),
    ).resolves.toMatchObject({ userId: "user-2" });
  });
});

describe("createReservation - time range validation", () => {
  it("rejects endTime before startTime", async () => {
    await expectHttpError(
      createReservation(dto({ startTime: BASE_END, endTime: BASE_START })),
      400,
      "VALIDATION_ERROR",
    );
  });

  it("rejects a zero-length block (endTime equals startTime)", async () => {
    await expectHttpError(createReservation(dto({ endTime: BASE_START })), 400, "VALIDATION_ERROR");
  });

  it("rejects endTime exactly 1 millisecond before startTime", async () => {
    await expectHttpError(
      createReservation(dto({ endTime: shiftFromStart(-1) })),
      400,
      "VALIDATION_ERROR",
    );
  });

  it("accepts the shortest possible block of 1 millisecond", async () => {
    const reservation: Reservation = await createReservation(dto({ endTime: shiftFromStart(1) }));
    expect(reservation.endTime).toBe(shiftFromStart(1));
  });

  it("does not touch the database when the range is invalid", async () => {
    await expectHttpError(
      createReservation(dto({ resourceId: MISSING_ID, endTime: shiftFromStart(-1) })),
      400,
      "VALIDATION_ERROR",
    );
  });
});

describe("createReservation - resource lookup", () => {
  it("returns 404 for a well-formed resourceId that does not exist", async () => {
    await expectHttpError(createReservation(dto({ resourceId: MISSING_ID })), 404, "NOT_FOUND");
  });

  it.each([
    "not-an-object-id",
    "123",
    "65f00000000000000000010",
    "65f0000000000000000001zz",
    "$ne",
  ])("returns 404 for the malformed resourceId %j", async (resourceId: string) => {
    await expectHttpError(createReservation(dto({ resourceId })), 404, "NOT_FOUND");
  });

  it("returns 409 RESOURCE_UNAVAILABLE for a resource that is not open for booking", async () => {
    await expectHttpError(
      createReservation(dto({ resourceId: UNAVAILABLE_RESOURCE_ID })),
      409,
      "RESOURCE_UNAVAILABLE",
    );
  });
});

describe("createReservation - double booking", () => {
  beforeEach(async (): Promise<void> => {
    await createReservation(dto());
  });

  it("rejects an exact start/end match", async () => {
    await expectHttpError(createReservation(dto({ userId: "user-2" })), 409, "DOUBLE_BOOKING");
  });

  it("rejects an overlap of exactly 1 millisecond at the end of the existing block", async () => {
    await expectHttpError(
      createReservation(
        dto({ startTime: shiftFromStart(3_600_000 - 1), endTime: shiftFromStart(2 * 3_600_000) }),
      ),
      409,
      "DOUBLE_BOOKING",
    );
  });

  it("rejects an overlap of exactly 1 millisecond at the start of the existing block", async () => {
    await expectHttpError(
      createReservation(dto({ startTime: shiftFromStart(-3_600_000), endTime: shiftFromStart(1) })),
      409,
      "DOUBLE_BOOKING",
    );
  });

  it("accepts a block ending exactly when the existing one starts", async () => {
    await expect(
      createReservation(dto({ startTime: shiftFromStart(-3_600_000), endTime: BASE_START })),
    ).resolves.toMatchObject({ status: "PENDING" });
  });

  it("accepts a block starting 1 millisecond after the existing one ends", async () => {
    await expect(
      createReservation(
        dto({ startTime: shiftFromStart(3_600_000 + 1), endTime: shiftFromStart(2 * 3_600_000) }),
      ),
    ).resolves.toMatchObject({ status: "PENDING" });
  });

  it("rejects a block fully contained in the existing one", async () => {
    await expectHttpError(
      createReservation(
        dto({ startTime: shiftFromStart(600_000), endTime: shiftFromStart(1_200_000) }),
      ),
      409,
      "DOUBLE_BOOKING",
    );
  });

  it("rejects a block that fully encloses the existing one", async () => {
    await expectHttpError(
      createReservation(
        dto({ startTime: shiftFromStart(-3_600_000), endTime: shiftFromStart(3 * 3_600_000) }),
      ),
      409,
      "DOUBLE_BOOKING",
    );
  });

  it("treats a CONFIRMED reservation as occupying the block", async () => {
    await ReservationModel.updateMany({}, { $set: { status: "CONFIRMED" } });
    await expectHttpError(createReservation(dto()), 409, "DOUBLE_BOOKING");
  });

  it("frees the block once the earlier reservation is cancelled", async () => {
    const [existing] = await listActiveReservationsForUser(USER_ID);
    if (existing === undefined) {
      throw new Error("Expected the arranged reservation to exist.");
    }
    await cancelReservation(existing.id);
    await expect(createReservation(dto())).resolves.toMatchObject({ status: "PENDING" });
  });

  // KNOWN DEFECT: createReservation checks for a clash and then inserts as two
  // separate steps, so concurrent identical requests can all pass the check.
  // `it.failing` keeps the suite green while the defect exists and starts
  // failing the moment it is fixed, which is the cue to switch this to `it`.
  it.failing("allows exactly one winner when identical bookings race", async () => {
    const attempts: readonly Promise<Reservation>[] = Array.from({ length: 8 }, (_, index) =>
      createReservation(
        dto({
          startTime: shiftFromStart(10 * 3_600_000),
          endTime: shiftFromStart(11 * 3_600_000),
          userId: `racer-${index}`,
        }),
      ),
    );
    const outcomes = await Promise.allSettled(attempts);
    const winners: number = outcomes.filter((outcome) => outcome.status === "fulfilled").length;

    expect(winners).toBe(1);
    expect(
      await ReservationModel.countDocuments({
        startTime: new Date(shiftFromStart(10 * 3_600_000)),
      }),
    ).toBe(1);
  });
});

describe("listActiveReservationsForUser", () => {
  it("returns an empty list for a user without reservations", async () => {
    await expect(listActiveReservationsForUser("nobody")).resolves.toEqual([]);
  });

  it("returns only the user's active reservations, earliest first", async () => {
    await createReservation(
      dto({ startTime: shiftFromStart(4 * 3_600_000), endTime: shiftFromStart(5 * 3_600_000) }),
    );
    await createReservation(dto());
    await createReservation(dto({ resourceId: OTHER_ROOM_ID, userId: "user-2" }));
    const cancelled: Reservation = await createReservation(
      dto({ startTime: shiftFromStart(8 * 3_600_000), endTime: shiftFromStart(9 * 3_600_000) }),
    );
    await cancelReservation(cancelled.id);

    const listed: readonly Reservation[] = await listActiveReservationsForUser(USER_ID);

    expect(listed.map((reservation) => reservation.startTime)).toEqual([
      BASE_START,
      shiftFromStart(4 * 3_600_000),
    ]);
  });
});

describe("cancelReservation", () => {
  it("moves an active reservation to CANCELLED", async () => {
    const created: Reservation = await createReservation(dto());
    const cancelled: Reservation = await cancelReservation(created.id);
    expect(cancelled).toEqual({ ...created, status: "CANCELLED" });
  });

  it("returns 404 for a well-formed id that does not exist", async () => {
    await expectHttpError(cancelReservation(MISSING_ID), 404, "NOT_FOUND");
  });

  it.each(["", "abc", "65f00000000000000000010", "{ $ne: null }"])(
    "returns 404 for the malformed id %j",
    async (id: string) => {
      await expectHttpError(cancelReservation(id), 404, "NOT_FOUND");
    },
  );

  it("returns 409 INVALID_STATE_TRANSITION when cancelled twice", async () => {
    const created: Reservation = await createReservation(dto());
    await cancelReservation(created.id);
    await expectHttpError(cancelReservation(created.id), 409, "INVALID_STATE_TRANSITION");
  });

  it("lets exactly one of two concurrent cancels succeed", async () => {
    const created: Reservation = await createReservation(dto());
    const outcomes = await Promise.allSettled([
      cancelReservation(created.id),
      cancelReservation(created.id),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
  });
});
