/**
 * Contract types for the User entity.
 * Mirrors components/schemas/User in docs/openapi.yaml field for field.
 * Type-only: no runtime values live in src/types.
 */

/** components/schemas/UserRole */
export type UserRole = "STUDENT" | "STAFF" | "ADMIN";

/** components/schemas/User */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: UserRole;
}
