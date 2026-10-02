/**
 * Mongoose schema for the Resource entity.
 * Fields correspond one-to-one with components/schemas/Resource in
 * docs/openapi.yaml and with the Resource type in src/types/resource.ts.
 */
import { Schema, model, type Document, type Model } from "mongoose";

import type { ResourceType } from "../types/resource.ts";

/** Allowed values of `type`, kept in step with the ResourceType union. */
export const RESOURCE_TYPES = [
  "ROOM",
  "EQUIPMENT",
  "LAB",
] as const satisfies readonly ResourceType[];

export interface IResource extends Document {
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema: Schema<IResource> = new Schema<IResource>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: RESOURCE_TYPES },
    location: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

resourceSchema.index({ type: 1, isAvailable: 1 });

export const ResourceModel: Model<IResource> = model<IResource>("Resource", resourceSchema);
