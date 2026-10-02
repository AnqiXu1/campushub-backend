/**
 * Mongoose schema for the User entity.
 * Fields correspond one-to-one with components/schemas/User in
 * docs/openapi.yaml and with the User type in src/types/user.ts.
 */
import { Schema, model, type Document, type Model } from "mongoose";

import type { UserRole } from "../types/user.ts";

/** Allowed values of `role`, kept in step with the UserRole union. */
export const USER_ROLES = ["STUDENT", "STAFF", "ADMIN"] as const satisfies readonly UserRole[];

export interface IUser extends Document {
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: Schema<IUser> = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    fullName: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: USER_ROLES, default: "STUDENT" },
  },
  { timestamps: true },
);

export const UserModel: Model<IUser> = model<IUser>("User", userSchema);
