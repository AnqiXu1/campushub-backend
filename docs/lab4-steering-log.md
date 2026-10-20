# Lab 4 Steering Log

Both incidents below happened during Part 2 of Lab 4. Incident 1 is a risk that was caught before it produced a defect, so no broken code was ever generated. Incident 2 is a real misdiagnosis during manual testing. The log states plainly which is which.

### Incident 1: Unvalidated `isAvailable` Query Parameter (Caught Before It Broke)

- **Initial Agent Output:** No broken output was produced. The task was to add an `isAvailable` filter to `GET /api/v1/resources`. Express delivers every query-string value as a string (or an array or object for repeated or nested keys), never as a boolean. The existing controller only had a string parser for `type`, so the new parameter needed a boolean parser. The agent wrote `parseOptionalBooleanParam` in the first version of the change, so the unvalidated-string version never existed in the repository.
- **Root Cause:** The type of a query value differs from the type the filter needs. If the raw value reached the service and the Mongoose filter, the outcome would depend on Mongoose casting rules, and an invalid value could surface as a driver-level error instead of a clean 400. Handling this was already required by CLAUDE.md section 4.1 (validate input before it reaches the service layer) and by the error contract in `docs/openapi.yaml`. This was not an agent failure; the agent applied the existing rules.
- **Remediation Prompt:** None was needed. The user prompt that started the work was, translated from Chinese: "Follow the recommendations and start step 1." The recommendation it approved was that the controller accepts only `"true"` or `"false"` and returns 400 for anything else, and that the service builds its filter field by field.
- **Resolution:** Verified by manual requests against the in-memory database:
  - `?isAvailable=true` returned 4 resources and `?isAvailable=false` returned 1.
  - `?type=equipment&isAvailable=false` returned the DSLR Camera Kit.
  - `?type=ROOM&isAvailable=false` returned an empty list.
  - `?isAvailable=yes` and `?isAvailable=` each returned 400 `VALIDATION_ERROR`.

  `npm run typecheck` and Prettier also passed. The 409 double-booking check and the per-user listing were rerun as a regression check and behaved as before.

### Incident 2: Empty Resource Lists Misread as a Regression (Seed Race)

- **Initial Agent Output:** After the `isAvailable` change, every `GET /api/v1/resources` request in the first manual test run returned `{"success":true,"data":[]}`, including the request with no filters. That looked like the new filter code had broken the endpoint, even though a reservation created later in the same run correctly found resource `...0101`.
- **Root Cause:** The test script was wrong, not the code. `src/index.ts` starts the HTTP listener first and seeds the in-memory database afterwards, so `/api/v1/health` answers before the seed finishes. The script only waited for `/health` and queried the resources too early.
- **Remediation Prompt:** No user prompt was involved. The agent steered itself by checking the hypothesis against the unmodified code: it ran `git stash`, started the server from the baseline code, and queried `/api/v1/resources` the same way. That also returned an empty list, which showed the new code was not the cause.
- **Resolution:** The test procedure was changed to wait for the log line `Seeded the in-memory database with the starter resource catalogue.` before sending any request. After that change all filter combinations returned the expected results, as listed in Incident 1. No source code was modified in response to this incident.
