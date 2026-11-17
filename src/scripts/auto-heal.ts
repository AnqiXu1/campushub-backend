/**
 * Auto-heal runner, executed by the `auto-fix` job in .github/workflows/ci.yml.
 *
 * This is a deterministic, rule-based patcher (it does not call any AI model and
 * needs no secret). Given a Jest failure log, it restores the half-open overlap
 * comparison in the reservation service when the comparison operators have been
 * inverted. Branch creation and the pull request are handled by the workflow.
 *
 * Usage: node src/scripts/auto-heal.ts <test-results.log> <summary-output.md>
 */
import { readFile, writeFile } from "node:fs/promises";

const TARGET_FILE: string = "src/services/reservation.service.ts";

interface Rule {
  readonly description: string;
  readonly broken: RegExp;
  readonly fixed: string;
}

/** Each rule is anchored on the field name, so applying it twice is a no-op. */
const RULES: readonly Rule[] = [
  {
    description: "startTime must be compared with $lt against the new endTime",
    broken: /startTime:\s*\{\s*\$gt:\s*endTime\s*\}/,
    fixed: "startTime: { $lt: endTime }",
  },
  {
    description: "endTime must be compared with $gt against the new startTime",
    broken: /endTime:\s*\{\s*\$lt:\s*startTime\s*\}/,
    fixed: "endTime: { $gt: startTime }",
  },
];

const main = async (): Promise<void> => {
  const [logPath, summaryPath] = process.argv.slice(2);
  if (logPath === undefined || summaryPath === undefined) {
    throw new Error("Usage: auto-heal.ts <test-results.log> <summary-output.md>");
  }

  const log: string = await readFile(logPath, "utf8");
  if (!log.includes("FAIL") && !log.includes("failed")) {
    throw new Error("The log does not contain a Jest failure; nothing to heal.");
  }

  const original: string = await readFile(TARGET_FILE, "utf8");
  let patched: string = original;
  const applied: string[] = [];
  for (const rule of RULES) {
    if (rule.broken.test(patched)) {
      patched = patched.replace(rule.broken, rule.fixed);
      applied.push(rule.description);
    }
  }

  if (applied.length === 0) {
    throw new Error(`No known inverted comparison found in ${TARGET_FILE}.`);
  }

  await writeFile(TARGET_FILE, patched, "utf8");
  const summary: string = [
    `Rule-based patch (no AI model involved) applied to \`${TARGET_FILE}\`:`,
    ...applied.map((line) => `- ${line}`),
  ].join("\n");
  await writeFile(summaryPath, summary, "utf8");
  console.log(summary);
};

main().catch((error: unknown): void => {
  console.error(error instanceof Error ? error.message : "Auto-heal failed.");
  process.exitCode = 1;
});
