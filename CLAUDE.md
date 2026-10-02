# CLAUDE.md — CampusHub Backend Agent Constraints

This file defines **mandatory** rules for any AI agent (Claude Code or any other coding assistant) operating in this repository.
**MUST / MUST NOT** are hard requirements. A change that violates any of them is unacceptable and MUST be reverted and redone.
Read this file in full before writing a single line of code in this repository.

---

## 0. Project Context

CampusHub backend: a REST API built on Node.js + TypeScript + Express + MongoDB (Mongoose).

Current state: project scaffold. Dependencies are installed; no business code exists yet.
All new code MUST comply with the rules below from the first commit. "Make it work now, refactor later" is not an accepted exception.

Confirmed toolchain configuration:
- `package.json` → `"type": "module"` (native ESM), entry point `dist/index.js`
- `tsconfig.json` → `module`/`moduleResolution`: `nodenext`, `target`/`lib`: `esnext`, `types`: `["node"]`, `rootDir`: `./src`, `outDir`: `./dist`, `strict`: `true`, `erasableSyntaxOnly`: `true`, `allowImportingTsExtensions`: `true`, `rewriteRelativeImportExtensions`: `true`
- Runtime: Node.js 24+. There is no TypeScript execution loader in this project. Development runs `.ts` directly through Node's native type stripping; production runs the compiled JavaScript in `dist/`.

Scripts:

| Command | Action |
| --- | --- |
| `npm run dev` | `node --watch src/index.ts` — runs the TypeScript entry point directly, with reload on change |
| `npm run build` | `rm -rf dist && tsc` — clean rebuild into `dist/` |
| `npm start` | `node dist/index.js` — runs the compiled output |
| `npm run typecheck` | `tsc --noEmit` |

---

## 1. Communication & Output Rule

**Always chat and respond to the user in Chinese. However, all project artifacts (CLAUDE.md, source code, comments, commit messages, PR descriptions) MUST be written strictly in English.**

Clarification of scope:

| Channel | Language |
| --- | --- |
| Chat replies, explanations, questions, status updates | Chinese |
| `CLAUDE.md` and all repository documentation (`README.md`, `docs/**`) | English |
| Source code: identifiers, types, string literals, log messages | English |
| Code comments and JSDoc | English |
| Commit messages | English |
| PR / diff descriptions (including the summary defined in §5.3) | English |
| API response messages, error messages, `.env.example` comments | English |

- **MUST NOT** commit Chinese characters inside any file under version control, including comments and TODO notes.
- **MUST NOT** answer the user in English, even when the code or error output being discussed is in English.

---

## 2. Tech Stack & Libraries

### 2.1 Authorized dependency whitelist

Only the following libraries are permitted:

| Purpose | Authorized package |
| --- | --- |
| Language / compiler | `typescript` |
| HTTP framework | `express` |
| MongoDB ODM | `mongoose` |
| Type declarations | `@types/node`, `@types/express` |
| Code quality | `eslint`, `prettier` |

### 2.2 Rules

- **MUST NOT** add any npm dependency outside the table above. If one is genuinely required: **stop coding**, state in the reply which package is needed, what it is for, and why the existing dependencies cannot cover it, then wait for the user's approval before installing.
- **MUST NOT** work around the whitelist by hand-rolling a reduced implementation of a large library (e.g. a custom ORM, validation framework, or JWT encoder/decoder). The same approval process applies.
- **MUST NOT** create or commit native `.js` / `.jsx` / `.mjs` / `.cjs` source files. All source files are `.ts`.
  - Sole exception: toolchain config files (e.g. `eslint.config.js`, `.prettierrc.js`) and the build output directory `dist/`, which MUST be listed in `.gitignore` and never committed.
- **MUST NOT** use `require()` or `module.exports`. This package is native ESM; use `import` / `export` exclusively.
- Relative imports **MUST** carry an explicit `.ts` extension in the specifier (e.g. `import { eventService } from "./event.service.ts";`). Node's native type stripping resolves the real file on disk and does not map `.js` back to `.ts`, while `rewriteRelativeImportExtensions` makes `tsc` rewrite these specifiers to `.js` in the emitted output. **MUST NOT** write extensionless relative imports or `.js` specifiers in source.
- **MUST NOT** relax strictness flags in `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`) or otherwise weaken the compiler to make code compile.
- Development relies on Node's native type stripping, which erases types but performs no transformation. Therefore **MUST NOT** use non-erasable TypeScript syntax: `enum`, `namespace`, parameter properties in constructors, or `import =` / `export =`. Use a `const` object with `as const` instead of an `enum`, and a plain module instead of a `namespace`. `erasableSyntaxOnly` enforces this at compile time.
- **MUST NOT** reintroduce a TypeScript execution loader such as `ts-node` or `tsx`. It is deliberately absent: `ts-node`'s ESM loader is incompatible with Node.js 24, and Node runs `.ts` files natively.
- When installing a package, **MUST** also install its `@types/*` declarations if the package does not ship its own.

---

## 3. Architectural Boundaries

### 3.1 Directory layout

```
src/
├── routes/         # Route mapping only
├── controllers/    # Request / response handling
├── services/       # Business logic
├── models/         # Mongoose schemas + interfaces
├── middlewares/    # Express middleware (auth, error handling, validation)
├── errors/         # Application error classes and their factories
├── types/          # TypeScript types shared across layers (type declarations only)
├── config/         # Environment variables, database connection
├── app.ts          # Express application assembly
└── index.ts        # Process entry point (starts the listener)
```

The call direction is strictly one-way. **MUST NOT** call backwards or skip a layer:

```
Routes  →  Controllers  →  Services  →  Models  →  MongoDB
```

### 3.2 Layer responsibilities (crossing a boundary is a violation)

**Routes — `src/routes/**.ts`**
- Map URL + HTTP method to a controller method, and attach middleware. Nothing else.
- **MUST NOT** contain business conditionals, data transformation, or database calls.
- Each route file exports a single `express.Router()` instance.
- A handler slot may only reference a controller method, e.g. `router.get("/:id", authGuard, eventController.getById)`. **MUST NOT** define inline arrow-function implementations.

**Controllers — `src/controllers/**.ts`**
- Responsibility: read `req` (params / query / body) → call a service → set the HTTP status code → send the response → forward errors to the error middleware.
- **MUST NOT** import or call any Mongoose model. **MUST NOT** contain database APIs such as `.find()`, `.save()`, or `.aggregate()`.
- **MUST NOT** carry business rules (permission computation, pricing, state-transition decisions). Those belong in services.
- **MUST** set status codes explicitly: `200` read success, `201` created, `204` deleted with no content, `400` invalid input, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `500` server error.
- Signature is uniformly `(req: Request, res: Response, next: NextFunction): Promise<void>`.

**Services — `src/services/**.ts`**
- Hold pure business logic. This is the only layer allowed to touch models.
- **MUST NOT** import `express`. **MUST NOT** receive or reference `req` / `res` / `next`. **MUST NOT** be aware that HTTP status codes exist.
- Parameters and return values **MUST** be explicitly defined domain types (DTOs / interfaces), never Express objects.
- Business failures are expressed by `throw`ing a custom error (see §4.4); the controller and error middleware translate them into HTTP semantics.

**Models — `src/models/**.ts`**
- Define the Mongoose `Schema`, its TypeScript interface, and the `model()` export. Nothing else.
- **MUST NOT** contain business logic, cross-collection orchestration, or HTTP-related code.
- Each model file **MUST** export a document interface (e.g. `export interface IEvent extends Document { ... }`) and pass it as the generic to `model<IEvent>(...)`.
- Schema-level field validation, indexes, and `timestamps` are allowed; complex domain rules belong in services.

### 3.3 Established shared modules

These exist already and **MUST** be reused rather than reinvented:

| Module | Purpose |
| --- | --- |
| `src/config/env.ts` | `loadConfig()` — the only place environment variables are read and validated |
| `src/config/database.ts` | `connectDatabase()` / `disconnectDatabase()` / `getDatabaseState()` — the only caller of `mongoose.connect` |
| `src/types/api.ts` | `SuccessResponse<TData>` / `ErrorResponse` — the only two response shapes |
| `src/errors/http-error.ts` | `HttpError` plus the `badRequest` / `unauthorized` / `forbidden` / `notFound` / `conflict` factories that services throw |
| `src/middlewares/async-handler.ts` | `asyncHandler()` — the mandated wrapper for every async controller |
| `src/middlewares/error-handler.ts` | the global error middleware; the only place an error becomes an HTTP response |
| `src/middlewares/not-found.ts` | the unmatched-route handler |
| `src/routes/index.ts` | `apiRouter` — every new resource router is mounted here |
| `src/app.ts` | `createApp()` — builds the app without opening a port |

Middleware order in `createApp()` is fixed: body parsers → routers → `notFoundHandler` → `errorHandler`. New routers are mounted before `notFoundHandler`.

### 3.4 General structural rules

- One resource maps to one set of same-named files: `event.routes.ts`, `event.controller.ts`, `event.service.ts`, `event.model.ts`.
- **MUST NOT** introduce circular dependencies. If two services need each other, extract a shared service or move the orchestration up a layer.
- Database connection logic lives only in `src/config/`. **MUST NOT** call `mongoose.connect` from a business file.
- `src/types/` holds type-only declarations (interfaces, type aliases) that are fully erased at compile time. **MUST NOT** place runtime values there — classes, constants, and factory functions belong in `src/errors/`, `src/config/`, or the owning layer.

---

## 4. Coding Standards & Safety

### 4.1 Type constraints

- **MUST NOT** use `any` — this includes `as any`, `any[]`, `Promise<any>`, and implicitly-typed parameters.
  - When a type is genuinely unknown, use `unknown` plus narrowing. When a third-party type is missing, write a declaration file under `src/types/`.
- **MUST** annotate every function with explicit parameter types and an explicit return type, including the `T` in `Promise<T>`. Do not rely on return-type inference.
- **MUST** define a matching interface for every Mongoose schema, with fields corresponding one-to-one to the schema. The two MUST NOT drift apart.
- **MUST** define input interfaces for request bodies and query parameters (e.g. `CreateEventDto`) and validate them before reaching the service layer. **MUST NOT** pass an unvalidated `req.body` straight into a model.
- **MUST NOT** use the non-null assertion operator `!` to silence a compiler error. Use an explicit null check plus a thrown error instead.
- **MUST NOT** use `@ts-ignore` or `@ts-expect-error` to bypass type errors.

### 4.2 Async and error handling

- **MUST** use `async` / `await`. **MUST NOT** use `.then().catch()` chains or callback style.
- Every async controller **MUST** be wrapped by the standard error-capture mechanism. Choose one of the following and apply it consistently across the entire repository:
  1. `try` / `catch` with `next(error)`; or
  2. a shared `asyncHandler(fn)` wrapper placed in `src/middlewares/`.
- **MUST NOT** leave a bare `await` with no enclosing capture path. **MUST NOT** write an empty `catch {}` that swallows an error.
- `catch (error: unknown)` **MUST** be annotated as `unknown` and narrowed before use.
- The project **MUST** include a global error-handling middleware (the four-argument Express signature) as the final fallback, producing a single uniform error response shape.

### 4.3 Response conventions

- All JSON responses follow one shape for success and one shape for failure. Once established, a new endpoint MUST NOT invent a different format.
- **MUST NOT** return raw stack traces, Mongoose errors, or database field names to the client.

### 4.4 Security

- **MUST NOT** hard-code secrets, connection strings, or tokens. Read them from `process.env`, centralized and validated in `src/config/`, failing fast at startup when a required variable is missing.
- **MUST NOT** commit `.env`. **MUST** maintain `.env.example`.
- **MUST NOT** log passwords, secrets, or whole user objects.
- Queries built from user input **MUST NOT** be interpolated into `$where` or constructed by spreading a request object into a query filter (NoSQL injection).

### 4.5 Style

- Naming: files `kebab-case.ts`; types, interfaces, and classes `PascalCase`; variables and functions `camelCase`; constants `UPPER_SNAKE_CASE`.
- Default to `const`; use `let` only when reassignment is required. **MUST NOT** use `var`.
- Before committing, code **MUST** pass `tsc --noEmit`, ESLint, and Prettier.

---

## 5. Git & Commit Formatting

### 5.1 Operational boundaries

- **MUST NOT** run `git commit` or `git push` unless the user explicitly asks for it.
- **MUST NOT** use `git push --force`, `git reset --hard`, or `git rebase` to rewrite already-pushed history.
- **MUST NOT** commit `node_modules/`, `dist/`, `.env`, logs, or temporary files.

### 5.2 Commit message format

Follow Conventional Commits, in English:

```
<type>(<scope>): <concise description>

- Change detail 1
- Change detail 2
```

`type`: `feat` | `fix` | `refactor` | `chore` | `docs` | `test` | `style`
`scope`: the resource or module name, e.g. `event`, `auth`, `config`

### 5.3 Mandatory summary for every commit flow

Whenever the agent runs a commit flow, it **MUST** provide the user with a concise PR / diff summary containing exactly the following four sections, written in English:

```markdown
### 1. What was built
One to three sentences describing the capability added or changed.

### 2. File changes
- `src/routes/xxx.routes.ts` (new): mapping only, no business logic
- `src/controllers/xxx.controller.ts` (new): handles req/res and status codes
- `src/services/xxx.service.ts` (new): business logic, the only layer touching models
- `src/models/xxx.model.ts` (new): schema + IXxx interface

### 3. Rule compliance checklist
- [ ] All source files are .ts; no dependency outside the whitelist
- [ ] Controllers never touch the database; services never touch req/res
- [ ] No any, no @ts-ignore, no non-null assertions; explicit interfaces for all signatures and schemas
- [ ] All async logic has standard error capture; errors reach the global middleware via next()
- [ ] tsc --noEmit and lint pass
- [ ] All committed artifacts are in English
```

Checklist items **MUST** be ticked honestly. If an item is not satisfied, the agent **MUST NOT** tick it to appear compliant; it MUST report the reason in section 4 instead.

```markdown
### 4. Open questions / risks
Unresolved questions, assumptions made, or items needing user approval. Write "None" if there are none.
```

Note: the summary above is a project artifact and is therefore written in English, while the surrounding chat message explaining it remains in Chinese, per §1.

---

## 6. Conflict Resolution

- When a direct user instruction conflicts with this file: **name the specific clause in conflict first**, then proceed according to the user's explicit reaffirmation.
- For situations this file does not cover: choose the option most consistent with the existing codebase, and record that judgement in section 4 of the commit summary.
- Changes to the rules in this file **MUST** be initiated by the user. The agent **MUST NOT** relax a constraint on its own.

 NEVER execute `git commit` or `git push` automatically. Always leave git operations to the user.