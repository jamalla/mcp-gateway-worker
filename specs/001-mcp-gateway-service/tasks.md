# Tasks: MCP Gateway Worker

**Input**: Design documents from `/specs/001-mcp-gateway-service/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Contract tests are REQUIRED for public endpoints. Validation, snapshot, and E2E tests are included per feature requirements.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`, `[US4]`) for story-phase tasks only
- Every task includes explicit acceptance criteria (`AC:`) and file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding and runtime/tooling baseline.

- [x] T001 Initialize Worker project scaffolding in package.json, tsconfig.json, wrangler.toml, and src/index.ts (AC: `pnpm install` succeeds and `pnpm wrangler dev` starts without config errors)
- [x] T002 Configure Wrangler local vars and secret references in wrangler.toml and README.md (AC: ENV vars `ENVIRONMENT`, `DOMAIN_A_URL`, `DOMAIN_B_URL`, `ALLOWED_ORIGINS` documented and secret `DOMAIN_SHARED_SECRET` setup instructions present)
- [x] T003 [P] Add test tooling and scripts in package.json for contract/validation/e2e/snapshot runs (AC: scripts `test`, `test:contract`, `test:validation`, `test:e2e`, `test:snapshots` are executable)
- [x] T004 [P] Create initial source/test directory structure under src/ and tests/ with placeholder files (AC: directories match plan structure and TypeScript project compiles)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schemas, registry model, security primitives, context, and error contracts required by all stories.

**⚠️ CRITICAL**: No user story implementation should start before this phase is complete.

- [x] T005 Implement env/header/request base schemas in src/types.ts using Zod (AC: invalid env/header payloads return parse failures with `VALIDATION_ERROR`-ready metadata)
- [x] T006 [P] Implement canonical error catalog and mapper in src/errors.ts for `TOOL_NOT_FOUND`, `SCOPE_MISSING`, `VALIDATION_ERROR`, `UPSTREAM_ERROR`, `FORBIDDEN` (AC: mapper emits stable JSON-RPC-compatible envelope fragments)
- [x] T007 [P] Implement request context extraction and request_id generation in src/context.ts (AC: each request yields context with `request_id`, `tenant_id`, `actor_id`, and parsed scopes array)
- [x] T008 [P] Implement scope and origin guard utilities in src/security.ts (AC: missing scope list and origin allowlist decisions are deterministic for provided headers)
- [x] T009 Implement explicit unified tool registry in src/registry.ts for `hello`, `list-top-customers`, `sum`, `normalize-text` with domain and scope metadata (AC: registry lookup and list APIs return all 4 tools across 2 domains)
- [x] T010 Implement upstream client skeleton with auth header + request_id propagation in src/upstream.ts (AC: outbound request builder always includes `Authorization: Bearer <DOMAIN_SHARED_SECRET>` and `x-request-id`)
- [x] T037 [P] Implement MCP/JSON-RPC envelope schemas and reusable response helpers in src/types.ts (or src/protocol.ts) (AC: invalid jsonrpc/id/method/params are deterministically rejected; success/error helpers return consistent JSON-RPC 2.0 envelopes; `/mcp` handlers reuse helpers instead of duplicating envelope logic)
- [x] T038 [P] Implement client auth config schema for static-token mode in src/types.ts (AC: env validation fails when `AUTH_MODE=static-token` and `CLIENT_AUTH_TOKEN` missing; auth mode is strongly typed for middleware/handlers; dev setup is documented in README.md and/or wrangler.toml comments)
- [x] T039 [P] Implement request-body and argument-size guardrail schemas/constants in src/types.ts (AC: max limits are centralized and configurable; oversized payloads/arguments map to `VALIDATION_ERROR`; limits are enforced consistently in MCP and REST call paths)
- [x] T040 Extend canonical error catalog/mapping in src/errors.ts with auth/protocol errors (AC: mapper supports `UNAUTHORIZED` or `FORBIDDEN` convention plus `METHOD_NOT_SUPPORTED`; payload includes stable `error_code` and `request_id`; `/mcp` uses JSON-RPC-compatible error envelope)
- [x] T041 [P] Implement scope normalization utility in src/context.ts (or src/security.ts) (AC: `read:greetings, math:execute, ,math:execute` normalizes to `["read:greetings","math:execute"]`; missing `x-scopes` becomes `[]`; behavior is deterministic and tested)
- [x] T042 Implement static client auth guard in src/auth.ts using `Authorization: Bearer <CLIENT_AUTH_TOKEN>` (AC: missing/invalid token returns canonical auth error; valid token returns auth result object; auth logic is isolated and not duplicated in handlers)
- [x] T043 Implement auth-derived scope policy for static-token mode in src/auth.ts using `CLIENT_ALLOWED_SCOPES` as trusted scope source (AC: scope source is explicit/documented and token-derived; handlers consume auth/context output consistently; endpoints do not trust raw scope headers directly)
- [x] T044 Implement upstream timeout/retry policy skeleton in src/upstream.ts using AbortController (AC: timeout duration is centralized constant/env; timed-out requests map to canonical `UPSTREAM_ERROR`; raw fetch exceptions do not leak to clients)
- [x] T054 Implement structured logging at gateway boundaries in src/index.ts and src/upstream.ts (AC: every request logs request_id, endpoint, tool_name when applicable, domain target, status/outcome, and error_code when present)

**Checkpoint**: Foundational primitives complete; user story implementation can proceed.

---

## Phase 3: User Story 1 - Discover Unified Tool Catalog (Priority: P1) 🎯 MVP

**Goal**: Return one unified tool catalog through MCP and REST interfaces.

**Independent Test**: `GET /tools` and MCP `tools/list` both return all four tools with consistent metadata.

### Tests for User Story 1

- [x] T011 [P] [US1] Add contract test for MCP `tools/list` in tests/contract/mcp-tools-list.contract.test.ts (AC: test asserts JSON-RPC success envelope and all 4 tool names)
- [x] T012 [P] [US1] Add contract test for REST `GET /tools` in tests/contract/rest-tools-list.contract.test.ts (AC: test asserts unified catalog parity with MCP list)

### Implementation for User Story 1

- [x] T013 [US1] Implement `GET /tools` handler in src/index.ts using src/registry.ts (AC: endpoint returns tools from both Domain A and Domain B)
- [x] T014 [US1] Implement MCP `tools/list` branch in POST /mcp handler in src/index.ts (AC: JSON-RPC `method=tools/list` returns unified tool catalog)
- [x] T015 [US1] Add list response schema guards in src/types.ts and apply in src/index.ts (AC: malformed internal tool entries produce `VALIDATION_ERROR` rather than silent success)

**Checkpoint**: Discovery works independently for both interfaces.

---

## Phase 4: User Story 2 - Call Tools with Enforced Access Scopes (Priority: P1)

**Goal**: Execute tool calls only when required scopes are present, with stable errors for missing scopes and unknown tools.

**Independent Test**: Valid scoped calls succeed; missing scope and invalid tool requests fail with canonical machine-readable errors.

### Tests for User Story 2

- [x] T016 [P] [US2] Add contract test for MCP `tools/call` success in tests/contract/mcp-tools-call.contract.test.ts (AC: valid scoped call returns JSON-RPC success with result and request_id)
- [x] T017 [P] [US2] Add validation test for missing scopes in tests/validation/scopes.validation.test.ts (AC: missing scope call returns `SCOPE_MISSING` with `missing_scopes` detail)
- [x] T018 [P] [US2] Add validation test for invalid tool names in tests/validation/invalid-tool.validation.test.ts (AC: invalid tool returns stable `TOOL_NOT_FOUND` payload)
- [x] T045 [P] [US2] Add validation test for unsupported MCP methods in tests/validation/mcp-method.validation.test.ts (AC: unsupported methods like `foo/bar` return canonical JSON-RPC protocol error with machine-readable code and `request_id`)
- [x] T046 [P] [US2] Add auth validation tests for static token in tests/validation/auth.validation.test.ts (AC: missing token rejected; invalid token rejected; valid token proceeds to next checks; auth failures use canonical error format for MCP and REST)
- [x] T047 [P] [US2] Add registry invariant tests in tests/validation/registry.validation.test.ts (AC: duplicate tool names fail; every tool has domain/required scopes/input schema metadata; registry list and lookup stay consistent)
- [x] T053 [P] [US2] Add contract test for REST `POST /tools/:name/call` in tests/contract/rest-tools-call.contract.test.ts (AC: success plus canonical error envelopes for `TOOL_NOT_FOUND`, `SCOPE_MISSING`, `VALIDATION_ERROR`, `UPSTREAM_ERROR`, and `FORBIDDEN` match documented contract)

### Implementation for User Story 2

- [x] T019 [US2] Implement `POST /tools/:name/call` handler in src/index.ts with tool lookup + scope check (AC: calls blocked when required scope absent)
- [x] T020 [US2] Implement MCP `tools/call` branch in src/index.ts with request schema validation (AC: invalid params map to `VALIDATION_ERROR`)
- [x] T021 [US2] Integrate scope validation helper from src/security.ts in both call handlers (AC: scope parsing uses `x-scopes` header consistently across MCP and REST)
- [x] T022 [US2] Integrate canonical error mapper from src/errors.ts for not found/scope/validation paths in src/index.ts (AC: error payloads include stable `error_code` and `request_id`)
- [x] T048 [US2] Integrate shared client auth guard in src/index.ts for `/mcp`, `/tools`, and `/tools/:name/call` (AC: all public endpoints except optional `/health` require valid token; auth runs before scope checks/upstream calls; handlers reuse shared auth utility)
- [x] T049 [US2] Refactor handler scope source to use auth/context output in src/index.ts (AC: one source of truth for scopes; MCP and REST behavior remain identical; raw header parsing is not duplicated in handlers)

**Checkpoint**: Call authorization and error determinism work independently.

---

## Phase 5: User Story 3 - Route Calls with Context Propagation and Normalized Upstream Errors (Priority: P2)

**Goal**: Route each tool call to correct domain worker, forward standard context, and normalize upstream failures.

**Independent Test**: Domain-routed calls include context and upstream failures map to `UPSTREAM_ERROR` consistently.

### Tests for User Story 3

- [x] T023 [P] [US3] Add integration test for domain routing in tests/contract/domain-routing.contract.test.ts (AC: `hello/list-top-customers` route to Domain A and `sum/normalize-text` to Domain B)
- [x] T024 [P] [US3] Add validation/integration test for context propagation in tests/validation/context-propagation.validation.test.ts (AC: forwarded payload contains tenant_id, actor_id, scopes, request_id)
- [x] T025 [P] [US3] Add snapshot test for normalized upstream errors in tests/contract/mcp-errors.snapshot.test.ts (AC: upstream variations collapse to stable `UPSTREAM_ERROR` shape)
- [x] T055 [P] [US3] Add logging validation tests in tests/validation/logging.validation.test.ts (AC: success and failure flows assert structured log fields and request_id correlation across gateway and upstream interactions)

### Implementation for User Story 3

- [x] T026 [US3] Implement domain URL resolution and forwarding logic in src/upstream.ts using `DOMAIN_A_URL` and `DOMAIN_B_URL` (AC: resolved endpoint is deterministic per tool domain)
- [x] T027 [US3] Implement outbound RPC payload builder with standard context in src/upstream.ts and src/context.ts (AC: outbound body includes tenant_id, actor_id, scopes, request_id)
- [x] T028 [US3] Integrate upstream client into MCP and REST call paths in src/index.ts (AC: successful upstream responses are mapped to interface-specific success contracts)
- [x] T029 [US3] Implement upstream exception/timeout/nonconforming payload normalization in src/errors.ts and src/index.ts (AC: all such failures return canonical `UPSTREAM_ERROR`)
- [x] T050 [US3] Add upstream payload shape validation in src/upstream.ts and src/types.ts (AC: nonconforming upstream payloads map to canonical `UPSTREAM_ERROR`; validation is schema-based; malformed upstream data is never passed through directly)

**Checkpoint**: Routing + context + upstream normalization function independently.

---

## Phase 6: User Story 4 - Origin Validation for Browser and Non-Browser Clients (Priority: P2)

**Goal**: Enforce allowlist only when Origin header is present; allow no-Origin clients.

**Independent Test**: Allowed Origin passes, disallowed Origin rejected with `FORBIDDEN`, no-Origin request continues normally.

### Tests for User Story 4

- [x] T030 [P] [US4] Add origin behavior tests in tests/validation/origin.validation.test.ts (AC: pass/fail/no-origin cases all asserted for MCP and REST)

### Implementation for User Story 4

- [x] T031 [US4] Implement ALLOWED_ORIGINS parser and origin allowlist enforcement in src/security.ts (AC: disallowed origin yields `FORBIDDEN` only when Origin header exists)
- [x] T032 [US4] Wire origin validation into `/mcp` and `/tools/:name/call` handlers in src/index.ts (AC: non-browser clients without Origin are not rejected by origin policy)

**Checkpoint**: Origin policy behavior works independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, documentation, and end-to-end verification.

- [x] T033 [P] Add `GET /health` endpoint implementation in src/index.ts and health contract test in tests/contract/health.contract.test.ts (AC: returns `{ status: "ok", environment }` with 200)
- [x] T034 Add end-to-end local integration test script and automated test in tests/e2e/local-gateway.e2e.test.ts and specs/001-mcp-gateway-service/quickstart.md (AC: scripted flow verifies list/call/errors against two running domain workers)
- [x] T035 [P] Update README.md with setup, env vars, secret config, endpoint usage, and curl examples aligned with quickstart (AC: fresh developer can run local gateway and execute all core scenarios)
- [x] T036 Run full verification and capture results in specs/001-mcp-gateway-service/quickstart.md (AC: `pnpm test` and targeted contract/validation/e2e suites pass with no contract regressions)
- [x] T051 [P] Update README.md with auth, guardrails, and trust-boundary documentation in README.md (AC: documents Client→Gateway static bearer auth, Gateway→Domain shared secret auth, trusted scope policy from `CLIENT_ALLOWED_SCOPES`, domain trust boundary, timeout/size guardrails, and curl examples using `Authorization: Bearer ...`)
- [x] T052 Extend quickstart negative-path verification in specs/001-mcp-gateway-service/quickstart.md (AC: includes missing token, invalid token, unsupported MCP method, oversized input, and timeout simulation where practical; expected canonical error codes/payloads are documented and match implementation)
- [x] T056 Add compatibility guard policy in README.md and contract checks in tests/contract/mcp-errors.snapshot.test.ts (AC: stable error code/payload assertions fail on breaking changes unless explicit versioning note is added)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all story work.
- **Phases 3–6 (User Stories)**: Depend on Phase 2; can be parallelized by team after foundation is complete.
- **Phase 7 (Polish)**: Depends on completion of all required user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no direct dependency on other stories.
- **US2 (P1)**: Starts after Phase 2; depends on handlers from US1 for shared MCP/REST wiring.
- **US3 (P2)**: Starts after Phase 2 and partially depends on US2 call-flow handlers.
- **US4 (P2)**: Starts after Phase 2 and can run in parallel with US3 once shared handlers exist.

### Within Each User Story

- Write tests first and ensure they fail before implementation.
- Implement schemas/helpers before endpoint wiring.
- Implement endpoint logic before integration and normalization concerns.
- Complete story checkpoint before moving to lower-priority polish work.

---

## Parallel Opportunities

- Setup tasks T003 and T004 can run in parallel.
- Foundational tasks T006, T007, T008 can run in parallel after T005.
- Foundational tasks T006, T007, T008, and T054 can run in parallel after T005.
- US1 tests T011 and T012 can run in parallel.
- US2 tests T016–T018, T045–T047, and T053 can run in parallel.
- US3 tests T023–T025 and T055 can run in parallel.
- US4 test T030 can run once security hooks are in place.
- Polish docs and health tasks T033 and T035 can run in parallel.

---

## Parallel Example: User Story 2

```text
Run together:
- T016 [US2] tests/contract/mcp-tools-call.contract.test.ts
- T017 [US2] tests/validation/scopes.validation.test.ts
- T018 [US2] tests/validation/invalid-tool.validation.test.ts
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Setup + Foundational.
2. Deliver US1 unified catalog.
3. Deliver US2 scoped tool calling and stable not-found/scope errors.
4. Validate MVP with contract and validation tests.

### Incremental Delivery

1. Add US3 routing/context/upstream normalization.
2. Add US4 origin behavior controls.
3. Complete Phase 7 E2E and documentation.

### Reviewability

- Each task is scoped to a small file set and explicit AC.
- PRs can be grouped by phase and user story checkpoints.
