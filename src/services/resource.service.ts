/**
 * Resource business logic. No knowledge of HTTP.
 *
 * The catalogue is held in memory so the contract can be exercised locally
 * without a running MongoDB instance. src/models/resource.model.ts already
 * carries the persistent shape; swapping this store for ResourceModel queries
 * changes nothing outside this file, because the exported signatures are the
 * domain types rather than database documents.
 */
import type { ListResourcesQuery, Resource } from "../types/resource.ts";

const RESOURCE_CATALOGUE: readonly Resource[] = [
  {
    id: "res-101",
    name: "Study Room 302",
    type: "ROOM",
    location: "Snell Library, Floor 3",
    isAvailable: true,
  },
  {
    id: "res-102",
    name: "Study Room 415",
    type: "ROOM",
    location: "Snell Library, Floor 4",
    isAvailable: true,
  },
  {
    id: "res-201",
    name: "3D Printer A",
    type: "EQUIPMENT",
    location: "Makerspace, Room 110",
    isAvailable: true,
  },
  {
    id: "res-202",
    name: "DSLR Camera Kit",
    type: "EQUIPMENT",
    location: "Media Desk, Room 020",
    isAvailable: false,
  },
  {
    id: "res-301",
    name: "Robotics Lab",
    type: "LAB",
    location: "Richards Hall, Room 240",
    isAvailable: true,
  },
];

/**
 * Lists the catalogue, optionally narrowed by type. An unrecognised type is
 * not an error: it simply matches nothing, as the contract states.
 */
export const listResources = async (query: ListResourcesQuery): Promise<readonly Resource[]> => {
  const requestedType: string | undefined = query.type;
  if (requestedType === undefined) {
    return RESOURCE_CATALOGUE;
  }

  const normalizedType: string = requestedType.toUpperCase();
  return RESOURCE_CATALOGUE.filter(
    (resource: Resource): boolean => resource.type === normalizedType,
  );
};

/** Returns the resource with the given id, or undefined when none matches. */
export const findResourceById = async (resourceId: string): Promise<Resource | undefined> => {
  return RESOURCE_CATALOGUE.find((resource: Resource): boolean => resource.id === resourceId);
};
