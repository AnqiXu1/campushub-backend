/**
 * Jest transformer that erases TypeScript types with Node's built-in
 * `module.stripTypeScriptTypes`, the same mechanism `npm run dev` relies on.
 * Stripping replaces types with whitespace, so line and column positions (and
 * therefore coverage and stack traces) stay exact without source maps.
 * Type checking is done separately by `npm run typecheck:test`.
 */
import { stripTypeScriptTypes } from "node:module";

import type { SyncTransformer, TransformedSource } from "@jest/transform";

const transformer: SyncTransformer = {
  process(sourceText: string): TransformedSource {
    return { code: stripTypeScriptTypes(sourceText, { mode: "strip" }) };
  },
};

export default transformer;
