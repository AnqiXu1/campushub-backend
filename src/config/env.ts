/**
 * Centralized environment configuration.
 * Every environment variable is read and validated here, and nowhere else.
 * Missing or malformed values fail fast at startup.
 */

export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly mongoUri: string;
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

export const loadConfig = (): AppConfig => {
  return {
    nodeEnv: readOptional("NODE_ENV", "development"),
    port: readPort("PORT", 3000),
    mongoUri: readRequired("MONGO_URI"),
  };
};
