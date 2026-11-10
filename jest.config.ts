/**
 * Jest configuration for native ESM TypeScript.
 * Run through `npm test`, which passes --experimental-vm-modules to Node.
 * ts-jest is not used: it requires the TypeScript JavaScript API, which the
 * TypeScript 7 native compiler does not expose. Types are erased by the
 * transformer in src/test/strip-types-transformer.ts instead.
 */
import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  // First start may download a MongoDB binary, and each file boots its own server.
  testTimeout: 30000,
  transform: {
    "^.+\\.ts$": "<rootDir>/src/test/strip-types-transformer.ts",
  },
  collectCoverageFrom: ["src/services/**/*.ts", "src/controllers/**/*.ts", "!**/__tests__/**"],
  coverageProvider: "v8",
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov"],
  coverageThreshold: {
    global: { statements: 80, branches: 80 },
  },
};

export default config;
