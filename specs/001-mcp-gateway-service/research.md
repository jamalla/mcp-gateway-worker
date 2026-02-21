# Research: MCP Gateway Worker

## Decision 1: Cloudflare Workers + Hono request handling
- Decision: Use Hono on Cloudflare Workers as the HTTP server layer for `/mcp`, `/tools`, `/tools/:name/call`, and `/health`.
- Rationale: Hono provides lightweight routing/middleware patterns that map cleanly to Worker fetch handlers and keeps endpoint behavior explicit.
- Alternatives considered:
  - Native Worker fetch switch-case: rejected due to lower maintainability and less structured middleware composition.
  - Full Node server frameworks: rejected because deployment target is Worker runtime.

## Decision 2: Zod as boundary validator
- Decision: Use Zod schemas for JSON-RPC envelope validation, REST payload validation, header parsing, and env variable validation.
- Rationale: Meets TypeScript-first and runtime validation requirements with single-source schema definitions.
- Alternatives considered:
  - Manual validation: rejected due to drift risk and inconsistent error reporting.
  - JSON Schema runtime only: rejected due to weaker TypeScript inference ergonomics for this codebase.

## Decision 3: Explicit static tool registry
- Decision: Define tools in `src/registry.ts` with explicit metadata (`name`, `domain`, `requiredScopes`, `inputSchema`, `outputSchema`).
- Rationale: Satisfies no-hidden-magic constitution rule and makes routing/scoping deterministic.
- Alternatives considered:
  - Dynamic discovery at startup: rejected due to traceability and failure-mode complexity.
  - Convention-based auto-registration: rejected due to implicit behavior.

## Decision 4: Upstream routing with shared secret auth
- Decision: Route by registry domain mapping to `DOMAIN_A_URL` and `DOMAIN_B_URL`, and attach `Authorization: Bearer <DOMAIN_SHARED_SECRET>` for gateway-to-domain calls.
- Rationale: Simple, auditable, and aligns with required token-based worker authentication.
- Alternatives considered:
  - Per-domain separate secrets at this stage: deferred as future hardening; current scope requires shared secret.
  - mTLS in local setup: rejected for local complexity and Worker runtime constraints.

## Decision 5: Error normalization contract
- Decision: Normalize all failures to MCP-compatible JSON-RPC error envelopes with stable `error.data.error_code` values:
  - `TOOL_NOT_FOUND`
  - `SCOPE_MISSING`
  - `VALIDATION_ERROR`
  - `UPSTREAM_ERROR`
  - `FORBIDDEN`
- Rationale: Predictable client behavior independent of upstream domain error shape.
- Alternatives considered:
  - Pass-through upstream error objects: rejected due to instability and leakage of domain-specific formats.

## Decision 6: Origin policy behavior
- Decision: Validate Origin only when request header exists. Reject non-allowlisted origins with `FORBIDDEN`; allow requests with no Origin.
- Rationale: Supports browser controls without blocking non-browser MCP clients.
- Alternatives considered:
  - Require Origin always: rejected because many MCP clients do not send Origin.
  - Ignore Origin entirely: rejected due to browser threat model gap.

## Decision 7: Testing approach for Worker runtime
- Decision: Use Vitest + Worker integration tests, contract tests for list/call, validation tests, and snapshot tests for MCP error payload shape.
- Rationale: Fast local loop with stable regression detection of contract output.
- Alternatives considered:
  - Unit-only tests: rejected since contract and route integration are core requirements.
  - E2E-only curl scripts: rejected due to weaker automation and regression detection.
