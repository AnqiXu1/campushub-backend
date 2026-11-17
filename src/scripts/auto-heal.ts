/**
 * Auto-heal agent runner, executed by the `auto-fix` job in .github/workflows/ci.yml.
 *
 * Reads the Jest failure log, gathers the implicated source files, asks a
 * GitHub Models chat model for a fix, and writes the patched files back to disk.
 * Uses only Node built-ins and the native fetch API authenticated with the workflow's built-in GITHUB_TOKEN (no SDK, no external secret).
 *
 * Usage: node src/scripts/auto-heal.ts <test-results.log> <summary-output.md>
 * Environment: GITHUB_TOKEN (required, needs models: read), AUTO_HEAL_MODEL (optional).
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

const DEFAULT_MODEL: string = "openai/gpt-4.1";
const API_URL: string = "https://models.github.ai/inference/chat/completions";
const API_VERSION: string = "2022-11-28";
// GitHub Models free tier caps input and output tokens, so keep the prompt compact.
const MAX_LOG_CHARS: number = 6000;
const MAX_TOKENS: number = 4000;

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
  if (isRecord(payload) && Array.isArray(payload["choices"])) {
    const first: unknown = payload["choices"][0];
    const message: unknown = isRecord(first) ? first["message"] : undefined;
    if (isRecord(message) && typeof message["content"] === "string") {
      return message["content"];
    }
  }
  throw new Error("The model response contained no message content.");
};

const askModel = async (token: string, model: string, prompt: string): Promise<AgentResponse> => {
  const response: Response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": API_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    throw new Error(`GitHub Models request failed with status ${response.status}.`);
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
  const token: string | undefined = process.env["GITHUB_TOKEN"];
  if (logPath === undefined || summaryPath === undefined) {
    throw new Error("Usage: auto-heal.ts <test-results.log> <summary-output.md>");
  }
  if (token === undefined || token === "") {
    throw new Error("GITHUB_TOKEN is not set.");
  }
  const model: string = process.env["AUTO_HEAL_MODEL"] || DEFAULT_MODEL;

  const fullLog: string = await readFile(logPath, "utf8");
  const log: string = fullLog.length > MAX_LOG_CHARS ? fullLog.slice(0, MAX_LOG_CHARS) : fullLog;
  const contexts: readonly FileContext[] = await readContext(findCandidatePaths(fullLog));
  if (contexts.length === 0) {
    throw new Error("No source files could be identified from the failure log.");
  }

  const result: AgentResponse = await askModel(token, model, buildPrompt(log, contexts));
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
