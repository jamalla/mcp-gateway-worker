# Data Model: MCP Gateway Worker

## Entity: ToolDefinition
- Description: Canonical metadata for a callable tool exposed through the gateway.
- Fields:
  - `name` (string, unique, required) — tool identifier used in `tools/call`.
  - `domain` (enum: `domain-a` | `domain-b`, required) — routing target.
  - `requiredScopes` (string[], required) — scopes required for invocation.
  - `description` (string, required) — human-readable summary.
  - `inputSchemaRef` (string, required) — schema reference key for validation.
  - `outputSchemaRef` (string, required) — schema reference key for output contract docs.
- Validation rules:
  - Name must be non-empty and globally unique in registry.
  - `requiredScopes` may be empty only for publicly callable tools (none in current scope).
- Relationships:
  - Many `ToolDefinition` belong to one `DomainConfig`.

## Entity: DomainConfig
- Description: Runtime config for upstream domain workers.
- Fields:
  - `domain` (enum, primary key)
  - `baseUrl` (URL string, required; from env)
  - `sharedSecret` (string, secret, required)
- Validation rules:
  - `baseUrl` must parse as valid absolute URL.
  - `sharedSecret` must be present at startup.
- Relationships:
  - One `DomainConfig` has many `ToolDefinition`.

## Entity: GatewayRequestContext
- Description: Standard context propagated from gateway to upstream worker.
- Fields:
  - `request_id` (string, required)
  - `tenant_id` (string | null, optional via header)
  - `actor_id` (string | null, optional via header)
  - `scopes` (string[], required; parsed from `x-scopes`)
  - `origin` (string | null)
- Validation rules:
  - `request_id` must always exist (generated if absent).
  - `scopes` parsed from comma-separated header and trimmed; duplicates removed.

## Entity: ToolCallRequest
- Description: Canonical invocation request after endpoint normalization.
- Fields:
  - `toolName` (string, required)
  - `arguments` (object, required)
  - `context` (`GatewayRequestContext`, required)
- Validation rules:
  - `toolName` must map to existing `ToolDefinition`.
  - `arguments` must validate against tool-specific input schema.

## Entity: MCPErrorPayload
- Description: Stable error payload shape returned by gateway.
- Fields:
  - `jsonrpc` (literal `2.0`)
  - `id` (string | number | null)
  - `error.code` (number, required)
  - `error.message` (string, required)
  - `error.data.error_code` (enum: `TOOL_NOT_FOUND` | `SCOPE_MISSING` | `VALIDATION_ERROR` | `UPSTREAM_ERROR` | `FORBIDDEN`)
  - `error.data.request_id` (string, required)
  - `error.data.details` (object, optional; includes missing scopes, validation issues, or upstream info)
- Validation rules:
  - `error.data.error_code` must always be one of canonical values.
  - `request_id` required for all errors.

## State Transitions
1. Request received -> parse/validate protocol envelope.
2. Context extracted -> `request_id` created/resolved.
3. Security checks -> origin allowlist (if origin exists) and scope validation.
4. Route resolution -> tool/domain lookup.
5. Upstream invocation -> auth header + context forwarded.
6. Response normalization -> success payload or canonical error payload.
