# Feature Specification: MCP Gateway Service

**Feature Branch**: `001-mcp-gateway-service`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "Build an MCP Gateway service that acts as a central entry point for AI clients to discover and call tools exposed by multiple backend domains."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Discover Unified Tool Catalog (Priority: P1)

As an AI client, I want a single gateway endpoint to list all available tools across domains so I can discover capabilities without integrating with each backend domain separately.

**Why this priority**: Discovery is the entry point for all tool usage; without a unified catalog, the gateway does not deliver core value.

**Independent Test**: Can be fully tested by calling tool listing endpoints and verifying one response contains all required tools from both domains.

**Acceptance Scenarios**:

1. **Given** the gateway is connected to at least two backend domains, **When** a client requests `tools/list`, **Then** the response includes tools from both domains in one unified catalog.
2. **Given** a client uses the REST testing interface for tool listing, **When** the request is made, **Then** the response returns the same unified tool catalog semantics as the MCP-compatible interface.

---

### User Story 2 - Call Tools with Enforced Access Scopes (Priority: P1)

As an AI client, I want tool calls to succeed only when required scopes are present so authorization is enforced consistently and safely.

**Why this priority**: Secure execution is mandatory; unauthorized tool invocation must be rejected deterministically.

**Independent Test**: Can be fully tested by calling tools with valid scopes and invalid/missing scopes and verifying acceptance and rejection behavior with machine-readable errors.

**Acceptance Scenarios**:

1. **Given** a tool call where client scopes satisfy the tool requirements, **When** `tools/call` is requested, **Then** the gateway routes the call and returns a successful result.
2. **Given** a tool call where one or more required scopes are missing, **When** `tools/call` is requested, **Then** the gateway rejects the call with a consistent MCP-compatible error that identifies missing scopes.
3. **Given** a tool call for an unknown tool name, **When** `tools/call` is requested, **Then** the gateway returns a stable tool-not-found error code and payload.

---

### User Story 3 - Route Calls with Standard Context and Predictable Errors (Priority: P2)

As a platform operator, I want each call routed to the correct domain with a standard context object and normalized error payloads so tracing and client behavior are predictable.

**Why this priority**: Consistent context propagation and error normalization are essential for observability, troubleshooting, and cross-domain consistency.

**Independent Test**: Can be fully tested by invoking tools in different domains and inducing upstream failures, then verifying routing, context forwarding fields, and normalized error shapes.

**Acceptance Scenarios**:

1. **Given** a valid tool call targeting a known domain tool, **When** the gateway forwards the request, **Then** the forwarded context includes tenant ID, actor ID, scopes, and generated request ID.
2. **Given** an upstream worker returns a domain-specific error, **When** the gateway returns the response to the client, **Then** the payload is normalized into a consistent gateway error format.

---

### User Story 4 - Support Browser and Non-Browser Clients (Priority: P2)

As a client integrator, I want origin validation only when an Origin header is present so browser requests are controlled while non-browser MCP clients remain supported.

**Why this priority**: This prevents unauthorized browser origins without breaking legitimate clients that do not send Origin headers.

**Independent Test**: Can be fully tested by sending requests with allowed origins, disallowed origins, and no Origin header, then verifying expected outcomes.

**Acceptance Scenarios**:

1. **Given** a request includes an allowed Origin header, **When** it reaches the gateway, **Then** the request is processed normally.
2. **Given** a request includes a disallowed Origin header, **When** it reaches the gateway, **Then** the gateway rejects it with a consistent machine-readable error.
3. **Given** a request has no Origin header, **When** it reaches the gateway, **Then** the request is not rejected solely for missing Origin.

---

### Edge Cases

- A domain worker is temporarily unavailable during `tools/call`.
- A tool appears in one domain registry but routing metadata is missing or invalid.
- Duplicate tool names are discovered across domains during aggregation.
- A client sends malformed scope data or empty scope set.
- Request contains Origin header with invalid format.
- Request omits tenant ID or actor ID in authorization context.
- Upstream returns non-standard error payload or an empty error body.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a single MCP-compatible endpoint for unified tool discovery and tool invocation.
- **FR-002**: System MUST expose REST endpoints for tool discovery and tool invocation for manual and UI testing.
- **FR-003**: System MUST aggregate and publish a unified tool registry from at least two backend domains.
- **FR-004**: System MUST include at least four tools across two domains in the unified registry: Greeting, Customer Listing, Math, and Text Normalization.
- **FR-005**: System MUST enforce scope-based access control per tool on every tool invocation request.
- **FR-006**: System MUST reject tool invocations with missing required scopes and return a machine-readable MCP-compatible error payload that identifies missing scopes.
- **FR-007**: System MUST validate request origin only when an Origin header is present.
- **FR-008**: System MUST allow requests without Origin headers when other authorization checks pass.
- **FR-009**: System MUST route each tool call to the correct backend domain worker based on tool-to-domain mapping.
- **FR-010**: System MUST forward a standard context object on routed calls containing tenant ID, actor ID, scopes, and generated request ID.
- **FR-011**: System MUST generate a unique request ID for each inbound request when one is not already provided.
- **FR-012**: System MUST normalize upstream domain errors into a consistent gateway error payload format.
- **FR-013**: System MUST return a stable tool-not-found error for unknown tool names.
- **FR-014**: System MUST keep error codes and payload structure stable for documented error cases.

### Public Contract Requirements *(mandatory for public endpoints)*

- **PCR-001**: Every public endpoint MUST define example request and example response payloads.
- **PCR-002**: Error behavior MUST define JSON-RPC/MCP error payload shape and stable error code
  mappings.
- **PCR-003**: Changes MUST preserve backward compatibility unless an explicit versioning decision
  is documented in this spec.
- **PCR-004**: External inputs MUST specify runtime validation rules and failure responses.
- **PCR-005**: Security expectations MUST define applicable origin allowlist, scope checks, and
  gateway↔worker token authentication behavior.

### Assumptions

- Backend domain workers expose discoverable tool metadata and tool invocation interfaces compatible with gateway integration requirements.
- Client identity, tenant, and scope claims are available to the gateway through an existing authentication layer.
- Unified tool names are globally unique; if collisions occur, gateway naming policy will resolve them deterministically.
- Local development environment can run one gateway process and two domain worker processes concurrently.

### Key Entities *(include if feature involves data)*

- **Tool Definition**: Represents a callable tool in the unified catalog, including tool name, domain ownership, required scopes, and human-readable description.
- **Domain Registry Entry**: Represents one backend domain source and its discovered tool set plus routing metadata.
- **Tool Call Request**: Represents a client invocation payload including tool name, input arguments, and client authorization context.
- **Gateway Context**: Represents forwarded tracing and auth context fields (tenant ID, actor ID, scopes, request ID).
- **Normalized Error Payload**: Represents standardized error response object returned by the gateway for authorization, routing, validation, and upstream failures.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of `tools/list` responses in acceptance tests contain all four required tools from both domains in one unified response.
- **SC-002**: 100% of authorized `tools/call` acceptance test cases complete successfully for the required tools.
- **SC-003**: 100% of missing-scope test cases return a consistent machine-readable error containing missing scope information.
- **SC-004**: 100% of invalid-tool-name test cases return the same stable tool-not-found error code and payload shape.
- **SC-005**: Both MCP-compatible and REST test interfaces pass the same core discovery and invocation acceptance scenarios.
- **SC-006**: End-to-end local development setup with one gateway and two domain workers can be started and used to execute all primary acceptance scenarios.
