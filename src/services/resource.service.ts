/**
 * Resource business logic and persistence. No knowledge of HTTP.
 * This is the only layer that touches ResourceModel; callers receive the
 * contract type from src/types/resource.ts, never a Mongoose document.
 */
import { Types } from "mongoose";

import { RESOURCE_TYPES, ResourceModel, type IResource } from "../models/resource.model.ts";
import type { ListResourcesQuery, Resource, ResourceType } from "../types/resource.ts";

/** Canonical 24-character hexadecimal form of a MongoDB ObjectId. */
const OBJECT_ID_PATTERN: RegExp = /^[0-9a-fA-F]{24}$/;

interface SeedResource {
  readonly id: string;
  readonly name: string;
  readonly type: ResourceType;
  readonly location: string;
  readonly isAvailable: boolean;
}

/**
 * Starter catalogue. Fixed ObjectIds keep ids stable across restarts so that
 * manual tests can reference them. The last digits mirror the Lab 2 ids
 * (res-101 -> ...0101).
 */
export const SEED_RESOURCES: readonly SeedResource[] = [
  {
    id: "65f000000000000000000101",
    name: "Study Room 302",
    type: "ROOM",
    location: "Snell Library, Floor 3",
    isAvailable: true,
  },
  {
    id: "65f000000000000000000102",
    name: "Study Room 415",
    type: "ROOM",
    location: "Snell Library, Floor 4",
    isAvailable: true,
  },
  {
    id: "65f000000000000000000201",
    name: "3D Printer A",
    type: "EQUIPMENT",
    location: "Makerspace, Room 110",
    isAvailable: true,
  },
  {
    id: "65f000000000000000000202",
    name: "DSLR Camera Kit",
    type: "EQUIPMENT",
    location: "Media Desk, Room 020",
    isAvailable: false,
  },
  {
    id: "65f000000000000000000301",
    name: "Robotics Lab",
    type: "LAB",
    location: "Richards Hall, Room 240",
    isAvailable: true,
  },
];

const toResource = (document: IResource): Resource => {
  return {
    id: document._id.toHexString(),
    name: document.name,
    type: document.type,
    location: document.location,
    isAvailable: document.isAvailable,
  };
};

const isResourceType = (value: string): value is ResourceType => {
  return (RESOURCE_TYPES as readonly string[]).includes(value);
};

/**
 * Lists the catalogue, optionally narrowed by type. An unrecognised type is
 * not an error: it simply matches nothing, as the contract states.
 */
export const listResources = async (query: ListResourcesQuery): Promise<readonly Resource[]> => {
  if (query.type === undefined) {
    const documents: IResource[] = await ResourceModel.find().sort({ _id: 1 });
    return documents.map(toResource);
  }

  const normalizedType: string = query.type.toUpperCase();
  if (!isResourceType(normalizedType)) {
    return [];
  }
  const documents: IResource[] = await ResourceModel.find({ type: normalizedType }).sort({
    _id: 1,
  });
  return documents.map(toResource);
};

/**
 * Returns the resource with the given id, or undefined when none matches.
 * A malformed id cannot match any document, so it is treated as not found.
 */
export const findResourceById = async (resourceId: string): Promise<Resource | undefined> => {
  if (!OBJECT_ID_PATTERN.test(resourceId)) {
    return undefined;
  }
  const document: IResource | null = await ResourceModel.findById(new Types.ObjectId(resourceId));
  if (document === null) {
    return undefined;
  }
  return toResource(document);
};

/** Inserts any starter resource that is missing. Safe to run on every boot. */
export const seedResources = async (): Promise<void> => {
  for (const seed of SEED_RESOURCES) {
    await ResourceModel.updateOne(
      { _id: new Types.ObjectId(seed.id) },
      {
        $setOnInsert: {
          name: seed.name,
          type: seed.type,
          location: seed.location,
          isAvailable: seed.isAvailable,
        },
      },
      { upsert: true },
    );
  }
};
