# Implementation Plan: MCP Gateway Worker

**Branch**: `001-mcp-gateway-service` | **Date**: 2026-02-21 | **Spec**: `/specs/001-mcp-gateway-service/spec.md`
**Input**: Feature specification from `/specs/001-mcp-gateway-service/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a Cloudflare Workers-based MCP gateway that exposes a single MCP-compatible JSON-RPC
endpoint and parallel REST testing endpoints, aggregates tools from Domain A and Domain B into one
registry, enforces per-tool scopes and origin allowlist policy, routes tool calls upstream with a
standard context envelope, and normalizes all upstream/domain failures into stable gateway error
payloads.

## Technical Context

**Language/Version**: TypeScript 5.x on Cloudflare Workers runtime  
**Primary Dependencies**: Hono, Zod, Wrangler, standard Fetch API, pnpm-compatible package setup  
**Storage**: N/A (stateless gateway; no persistence in scope)  
**Testing**: Vitest + Worker runtime integration tests + contract/snapshot tests  
**Target Platform**: Cloudflare Workers (local via Wrangler dev)  
**Project Type**: single  
**Performance Goals**: p95 tool dispatch overhead under 50ms in local dev; health endpoint under 100ms locally  
**Constraints**: strict JSON-RPC 2.0 compatibility on `/mcp`; stable error code map; no hidden registry magic; origin checks conditional on Origin header; token-authenticated upstream calls  
**Scale/Scope**: one gateway service routing four tools across two domain workers for local-first end-to-end operation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript & Validation Gate**: PASS — TypeScript-first modules with Zod runtime schemas for
  all external inputs (headers, params, JSON-RPC payloads, REST payloads, env vars).
- **Security Boundary Gate**: PASS — per-tool scope validation, conditional Origin allowlist,
  token-based auth to domain workers via shared secret.
- **Protocol Stability Gate**: PASS — `/mcp` conforms to JSON-RPC 2.0 request/response semantics;
  error contracts defined with stable codes.
- **Error Contract Gate**: PASS — canonical mapped errors: `TOOL_NOT_FOUND`, `SCOPE_MISSING`,
  `VALIDATION_ERROR`, `UPSTREAM_ERROR`, `FORBIDDEN` with deterministic payload shape.
- **Modularity Gate**: PASS — explicit module boundaries (`index`, `registry`, `types`, `errors`,
  `security`, `upstream`, `context`), explicit registry entries for all tools.
- **Observability & Contracts Gate**: PASS — request_id generation/propagation and contract tests
  for list/call plus snapshot checks for MCP error payloads.

### Post-Design Re-Check (after Phase 1 artifacts)

- **TypeScript & Validation Gate**: PASS — enforced by `research.md` decisions and `data-model.md`
  schema-boundary modeling.
- **Security Boundary Gate**: PASS — contracts and quickstart define scope checks, Origin allowlist
  behavior, and shared-secret upstream auth.
- **Protocol Stability Gate**: PASS — `contracts/openapi.yaml` and `contracts/mcp-jsonrpc.md`
  preserve fixed method and error contract behavior.
- **Error Contract Gate**: PASS — canonical error map and JSON-RPC error envelope examples documented
  and snapshot-targeted.
- **Modularity Gate**: PASS — explicit file/module decomposition captured in Source Code structure.
- **Observability & Contracts Gate**: PASS — request_id propagation, context forwarding, contract,
  validation, and e2e testing paths fully specified.

## Project Structure

### Documentation (this feature)

```text
specs/001-mcp-gateway-service/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── index.ts
├── registry.ts
├── types.ts
├── errors.ts
├── security.ts
├── upstream.ts
├── context.ts
└── auth.ts

tests/
├── contract/
│   ├── mcp-tools-list.contract.test.ts
│   ├── mcp-tools-call.contract.test.ts
│   ├── rest-tools-list.contract.test.ts
│   ├── rest-tools-call.contract.test.ts
│   ├── domain-routing.contract.test.ts
│   ├── health.contract.test.ts
│   └── mcp-errors.snapshot.test.ts
├── validation/
│   ├── scopes.validation.test.ts
│   ├── input.validation.test.ts
│   ├── invalid-tool.validation.test.ts
│   ├── mcp-method.validation.test.ts
│   ├── auth.validation.test.ts
│   ├── registry.validation.test.ts
│   ├── context-propagation.validation.test.ts
│   ├── origin.validation.test.ts
│   └── logging.validation.test.ts
└── e2e/
  └── local-gateway.e2e.test.ts

package.json
wrangler.toml
tsconfig.json
README.md
```

**Structure Decision**: Single Cloudflare Worker project with explicit boundary modules and
test folders separated by contract/validation/e2e concerns.

## Phased Implementation Tasks

### Phase 1: Foundation and Contracts
- Initialize Worker project configuration (`package.json`, `wrangler.toml`, `tsconfig.json`).
- Implement shared types and schemas in `src/types.ts`.
- Define explicit unified tool registry in `src/registry.ts`.
- Define canonical error model and mapping helpers in `src/errors.ts`.
- Publish contract artifacts and examples in `contracts/` and `quickstart.md`.

### Phase 2: Core Endpoint and Security Behavior
- Implement Hono server and endpoint wiring in `src/index.ts` for `/mcp`, `/tools`,
  `/tools/:name/call`, `/health`.
- Implement request context extraction and request_id generation in `src/context.ts`.
- Implement scope and origin policy validation in `src/security.ts`.
- Implement deterministic tool lookup and domain routing selection.

### Phase 3: Upstream Integration and Normalization
- Implement upstream RPC forwarding client in `src/upstream.ts` with token auth.
- Propagate gateway context and request_id upstream on each call.
- Normalize upstream and gateway validation/security errors into canonical MCP payloads.
- Add structured logs around request lifecycle and upstream interactions.

### Phase 4: Verification and Local E2E
- Add contract tests for `tools/list` and `tools/call` in `tests/contract/`.
- Add validation tests for missing scopes, invalid inputs, and invalid tool names.
- Add snapshot tests for canonical MCP error payload stability.
- Add local end-to-end test script/examples using gateway + Domain A + Domain B workers.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
