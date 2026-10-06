/**
 * Centralized environment configuration.
 * Every environment variable is read and validated here, and nowhere else.
 * Missing or malformed values fail fast at startup.
 */

/**
 * Where the database comes from: a real MongoDB reached through MONGO_URI, or a
 * throwaway in-memory instance for local development and manual testing.
 */
export type DatabaseSource =
  { readonly kind: "uri"; readonly mongoUri: string } | { readonly kind: "memory" };

export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly database: DatabaseSource;
}

const readRequired = (key: string): string => {
  const value: string | undefined = process.env[key];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
};

const readOptional = (key: string, fallback: string): string => {
  const value: string | undefined = process.env[key];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value.trim();
};

const readPort = (key: string, fallback: number): number => {
  const value: string | undefined = process.env[key];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed: number = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid ${key}: expected an integer between 1 and 65535, received "${value}"`);
  }
  return parsed;
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  const value: string = readOptional(key, fallback ? "true" : "false").toLowerCase();
  if (value !== "true" && value !== "false") {
    throw new Error(`Invalid ${key}: expected "true" or "false", received "${value}"`);
  }
  return value === "true";
};

export const loadConfig = (): AppConfig => {
  const nodeEnv: string = readOptional("NODE_ENV", "development");
  const useInMemoryDb: boolean = readBoolean("USE_IN_MEMORY_DB", false);
  if (useInMemoryDb && nodeEnv === "production") {
    throw new Error("USE_IN_MEMORY_DB must not be enabled when NODE_ENV is production.");
  }

  return {
    nodeEnv,
    port: readPort("PORT", 3000),
    database: useInMemoryDb
      ? { kind: "memory" }
      : { kind: "uri", mongoUri: readRequired("MONGO_URI") },
  };
};
