/**
 * Contract types for the Resource entity.
 * Mirrors components/schemas/Resource in docs/openapi.yaml field for field.
 * Type-only: no runtime values live in src/types.
 */

/** components/schemas/ResourceType */
export type ResourceType = "ROOM" | "EQUIPMENT" | "LAB";

/** components/schemas/Resource */
export interface Resource {
  readonly id: string;
  readonly name: string;
  readonly type: ResourceType;
  readonly location: string;
  readonly isAvailable: boolean;
}

/**
 * Validated query string of GET /resources.
 * `type` is a free-form non-empty string rather than a ResourceType: the
 * contract answers an unrecognised type with an empty list, not a 400.
 */
export interface ListResourcesQuery {
  readonly type?: string | undefined;
}
