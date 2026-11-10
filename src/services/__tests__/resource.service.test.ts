import { ResourceModel } from "../../models/resource.model.ts";
import {
  MISSING_ID,
  ROOM_ID,
  UNAVAILABLE_RESOURCE_ID,
  seedCatalogue,
} from "../../test/fixtures.ts";
import type { Resource } from "../../types/resource.ts";
import {
  SEED_RESOURCES,
  findResourceById,
  listResources,
  seedResources,
} from "../resource.service.ts";

beforeEach(async (): Promise<void> => {
  await seedCatalogue();
});

describe("seedResources", () => {
  it("inserts every starter resource", async () => {
    expect(await ResourceModel.countDocuments()).toBe(SEED_RESOURCES.length);
  });

  it("is idempotent and does not overwrite existing documents", async () => {
    await ResourceModel.updateOne({ _id: ROOM_ID }, { $set: { name: "Renamed" } });
    await seedResources();

    expect(await ResourceModel.countDocuments()).toBe(SEED_RESOURCES.length);
    expect((await findResourceById(ROOM_ID))?.name).toBe("Renamed");
  });
});

describe("listResources", () => {
  it("lists the whole catalogue ordered by id when no filter is given", async () => {
    const all: readonly Resource[] = await listResources({});
    const ids: string[] = all.map((resource) => resource.id);
    expect(ids).toHaveLength(SEED_RESOURCES.length);
    expect(ids).toEqual([...ids].sort());
  });

  it("filters by type", async () => {
    const rooms: readonly Resource[] = await listResources({ type: "ROOM" });
    expect(rooms).toHaveLength(2);
    expect(rooms.every((resource) => resource.type === "ROOM")).toBe(true);
  });

  it("matches the type case-insensitively", async () => {
    await expect(listResources({ type: "lab" })).resolves.toHaveLength(1);
  });

  it("returns an empty list for an unrecognised type", async () => {
    await expect(listResources({ type: "SPACESHIP" })).resolves.toEqual([]);
  });

  it("does not treat an operator-looking type as a query operator", async () => {
    await expect(listResources({ type: '{"$ne":null}' })).resolves.toEqual([]);
  });

  it("filters by availability", async () => {
    const unavailable: readonly Resource[] = await listResources({ isAvailable: false });
    expect(unavailable.map((resource) => resource.id)).toEqual([UNAVAILABLE_RESOURCE_ID]);
    await expect(listResources({ isAvailable: true })).resolves.toHaveLength(
      SEED_RESOURCES.length - 1,
    );
  });

  it("combines type and availability filters", async () => {
    await expect(listResources({ type: "EQUIPMENT", isAvailable: true })).resolves.toHaveLength(1);
    await expect(listResources({ type: "ROOM", isAvailable: false })).resolves.toEqual([]);
  });
});

describe("findResourceById", () => {
  it("returns the resource contract shape", async () => {
    await expect(findResourceById(ROOM_ID)).resolves.toEqual({
      id: ROOM_ID,
      name: "Study Room 302",
      type: "ROOM",
      location: "Snell Library, Floor 3",
      isAvailable: true,
    });
  });

  it("returns undefined for an unknown id", async () => {
    await expect(findResourceById(MISSING_ID)).resolves.toBeUndefined();
  });

  it("returns undefined for a malformed id", async () => {
    await expect(findResourceById("nope")).resolves.toBeUndefined();
  });
});
