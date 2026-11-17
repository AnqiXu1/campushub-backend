/**
 * Auto-heal agent runner, executed by the `auto-fix` job in .github/workflows/ci.yml.
 *
 * Reads the Jest failure log, gathers the implicated source files, asks the
 * Anthropic Messages API for a fix, and writes the patched files back to disk.
 * Uses only Node built-ins and the native fetch API (no SDK dependency).
 *
 * Usage: node src/scripts/auto-heal.ts <test-results.log> <summary-output.md>
 * Environment: ANTHROPIC_API_KEY (required), AUTO_HEAL_MODEL (optional).
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

const DEFAULT_MODEL: string = "claude-sonnet-5-5";
const API_URL: string = "https://api.anthropic.com/v1/messages";
const API_VERSION: string = "2023-06-01";
const MAX_LOG_CHARS: number = 30000;
const MAX_TOKENS: number = 16000;

const INSTRUCTION: string =
  "Parse the attached Jest failure log. Locate the source code causing the failure in src/ " +
  "and generate a patch that fixes the bug without breaking existing tests.";

const RULES: string = [
  "Fix the production code only. Never edit, delete or weaken tests, assertions, fixtures or test setup.",
  "Only modify files under src/ that are not test files.",
  "Return the complete new content of every file you change.",
  'Respond with a single JSON object and nothing else: {"explanation": string, "files": [{"path": string, "content": string}]}.',
].join("\n");

interface FileContext {
  readonly path: string;
  readonly content: string;
}

interface FilePatch {
  readonly path: string;
  readonly content: string;
}

interface AgentResponse {
  readonly explanation: string;
  readonly files: readonly FilePatch[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isFilePatch = (value: unknown): value is FilePatch => {
  return (
    isRecord(value) && typeof value["path"] === "string" && typeof value["content"] === "string"
  );
};

const isAgentResponse = (value: unknown): value is AgentResponse => {
  return (
    isRecord(value) &&
    typeof value["explanation"] === "string" &&
    Array.isArray(value["files"]) &&
    value["files"].every(isFilePatch)
  );
};

/** Test code and test infrastructure the agent is never allowed to change. */
const isProtectedPath = (path: string): boolean => {
  return path.includes("/__tests__/") || path.startsWith("src/test/") || path.includes(".test.");
};

const isPatchablePath = (path: string): boolean => {
  const absolute: string = resolve(path);
  const srcRoot: string = resolve("src") + sep;
  return absolute.startsWith(srcRoot) && path.endsWith(".ts") && !isProtectedPath(path);
};

/** Source files named in the failure log, plus the sibling source of each failing test file. */
const findCandidatePaths = (log: string): readonly string[] => {
  const mentioned: string[] = log.match(/src\/[A-Za-z0-9_./-]+\.ts/g) ?? [];
  const candidates: Set<string> = new Set<string>();
  for (const path of mentioned) {
    candidates.add(path);
    const sibling: string = path.replace("/__tests__/", "/").replace(".test.ts", ".ts");
    candidates.add(sibling);
  }
  return [...candidates].filter((path) => isPatchablePath(path) || isProtectedPath(path));
};

const readContext = async (paths: readonly string[]): Promise<readonly FileContext[]> => {
  const contexts: FileContext[] = [];
  for (const path of paths) {
    try {
      contexts.push({ path, content: await readFile(path, "utf8") });
    } catch (error: unknown) {
      const code: unknown = isRecord(error) ? error["code"] : undefined;
      if (code !== "ENOENT") {
        throw error;
      }
    }
  }
  return contexts;
};

const buildPrompt = (log: string, contexts: readonly FileContext[]): string => {
  const files: string = contexts
    .map(
      (file) =>
        `### ${file.path}${isProtectedPath(file.path) ? " (read-only)" : ""}\n${file.content}`,
    )
    .join("\n\n");
  return `${INSTRUCTION}\n\nRules:\n${RULES}\n\n## Jest failure log\n${log}\n\n## Relevant files\n${files}`;
};

const extractText = (payload: unknown): string => {
  if (isRecord(payload) && Array.isArray(payload["content"])) {
    for (const block of payload["content"]) {
      if (isRecord(block) && block["type"] === "text" && typeof block["text"] === "string") {
        return block["text"];
      }
    }
  }
  throw new Error("The model response contained no text block.");
};

const askModel = async (apiKey: string, model: string, prompt: string): Promise<AgentResponse> => {
  const response: Response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic API request failed with status ${response.status}.`);
  }
  const text: string = extractText(await response.json());
  const start: number = text.indexOf("{");
  const end: number = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("The model response did not contain a JSON object.");
  }
  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (!isAgentResponse(parsed)) {
    throw new Error("The model response did not match the expected shape.");
  }
  return parsed;
};

const main = async (): Promise<void> => {
  const [logPath, summaryPath] = process.argv.slice(2);
  const apiKey: string | undefined = process.env["ANTHROPIC_API_KEY"];
  if (logPath === undefined || summaryPath === undefined) {
    throw new Error("Usage: auto-heal.ts <test-results.log> <summary-output.md>");
  }
  if (apiKey === undefined || apiKey === "") {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  const model: string = process.env["AUTO_HEAL_MODEL"] || DEFAULT_MODEL;

  const fullLog: string = await readFile(logPath, "utf8");
  const log: string = fullLog.length > MAX_LOG_CHARS ? fullLog.slice(-MAX_LOG_CHARS) : fullLog;
  const contexts: readonly FileContext[] = await readContext(findCandidatePaths(fullLog));
  if (contexts.length === 0) {
    throw new Error("No source files could be identified from the failure log.");
  }

  const result: AgentResponse = await askModel(apiKey, model, buildPrompt(log, contexts));
  const rejected: readonly FilePatch[] = result.files.filter((file) => !isPatchablePath(file.path));
  if (rejected.length > 0) {
    throw new Error(
      `Refusing to modify protected paths: ${rejected.map((file) => file.path).join(", ")}`,
    );
  }
  if (result.files.length === 0) {
    throw new Error("The agent proposed no changes.");
  }

  for (const file of result.files) {
    await writeFile(file.path, file.content, "utf8");
  }
  await writeFile(summaryPath, result.explanation, "utf8");
  console.log(`Patched: ${result.files.map((file) => file.path).join(", ")}`);
};

main().catch((error: unknown): void => {
  console.error(error instanceof Error ? error.message : "Auto-heal failed.");
  process.exitCode = 1;
});
