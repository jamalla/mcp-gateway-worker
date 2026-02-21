<!--
Sync Impact Report
- Version change: uninitialized-template -> 1.0.0
- Modified principles:
	- Principle slot 1 -> I. TypeScript-First Contracts
	- Principle slot 2 -> II. Security-First Worker Boundaries
	- Principle slot 3 -> III. Stable Protocol and Error Semantics
	- Principle slot 4 -> IV. Explicit Modular Design
	- Principle slot 5 -> V. Observability and Verifiable Public Contracts
- Added sections:
	- Engineering Standards
	- Delivery Workflow and Quality Gates
- Removed sections:
	- None
- Templates requiring updates:
	- ✅ updated: .specify/templates/plan-template.md
	- ✅ updated: .specify/templates/spec-template.md
	- ✅ updated: .specify/templates/tasks-template.md
	- ⚠ pending: .specify/templates/commands/*.md (directory not present in repository)
-->

# MCP Gateway Worker Constitution

## Core Principles

### I. TypeScript-First Contracts
All production code MUST be TypeScript with strict typing enabled, and type safety MUST be
maintained across routing, registry, validation, upstream clients, and error mapping modules.
Every external input boundary (HTTP, JSON-RPC, MCP, headers, env vars, worker responses) MUST
use explicit runtime validation before business logic executes. This prevents implicit coercion,
guards against malformed payloads, and keeps failures deterministic.

### II. Security-First Worker Boundaries
Gateway-to-domain-worker communication MUST enforce token-based authentication, declared scope
validation, and origin allowlist checks for all externally reachable entry points. Security
controls MUST fail closed and MUST emit auditable structured logs for denied access. No feature
may bypass these checks for convenience, because cross-worker trust is the primary attack surface.

### III. Stable Protocol and Error Semantics
Public API behavior MUST remain backward compatible unless an explicit version change is
documented and released. JSON-RPC and MCP error payloads MUST follow a shared schema with stable
error codes and deterministic mappings from internal failures. Breaking protocol behavior without
versioning is prohibited because clients depend on consistent machine-readable contracts.

### IV. Explicit Modular Design
The codebase MUST remain decomposed into small, testable modules with clear boundaries at minimum
for routing, tool/handler registry, validation, upstream client, and error mapping. Tool
definitions MUST be explicit and traceable in a registry; hidden discovery, implicit side effects,
or magic wiring are prohibited. Maintainability and correctness MUST be prioritized over clever
abstractions.

### V. Observability and Verifiable Public Contracts
All request flows MUST propagate a request_id (or equivalent correlation id) end-to-end and emit
structured logs at gateway boundaries and upstream interactions. Every public endpoint MUST include
example request/response documentation and contract tests that verify payload shape, error schema,
and compatibility behavior. Features lacking observability or contract verification are incomplete.

## Engineering Standards

- TypeScript configuration MUST keep strict mode enabled; suppression directives require explicit
	justification in code review.
- Runtime validation schemas MUST be source-of-truth for external payload contracts and reused in
	tests where practical.
- Error code catalogs MUST be centralized and version-controlled; code reuse MUST not alter public
	codes unexpectedly.
- Configuration affecting security (allowlists, tokens, scopes) MUST be explicit, documented, and
	validated at startup.

## Delivery Workflow and Quality Gates

- Plans MUST include a Constitution Check that maps work to all five core principles.
- Specs for public behavior MUST define compatibility expectations, canonical error outcomes, and
	endpoint examples.
- Tasks MUST include module-level tests plus contract tests for each public endpoint before release.
- Pull requests MUST show evidence of request_id propagation, structured logs, and explicit registry
	updates when tools/endpoints are added.

## Governance

This constitution supersedes local conventions for gateway and worker-facing engineering decisions.
Amendments require: (1) a written proposal, (2) explicit impact assessment on compatibility and
security posture, and (3) updates to affected templates and guidance files in the same change.

Versioning policy for this constitution follows semantic versioning:
- MAJOR: Removal or incompatible redefinition of a principle or governance requirement.
- MINOR: New principle or materially expanded mandatory guidance.
- PATCH: Clarifications, wording improvements, and non-semantic refinements.

Compliance review is mandatory for every pull request. Reviewers MUST verify and record whether the
change satisfies security boundaries, protocol/error stability, explicit modularity, and
observability plus contract-test requirements before approval.

**Version**: 1.0.0 | **Ratified**: 2026-02-21 | **Last Amended**: 2026-02-21
