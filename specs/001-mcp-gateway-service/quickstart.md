# Quickstart: MCP Gateway Worker

## Prerequisites
- pnpm
- Wrangler CLI
- Two local domain worker services reachable by URL

## Environment
Use `wrangler.toml` vars for local development:
- `ENVIRONMENT`
- `DOMAIN_A_URL`
- `DOMAIN_B_URL`
- `ALLOWED_ORIGINS`

Set secret:
- `DOMAIN_SHARED_SECRET`

Set client auth vars (local defaults can live in `wrangler.toml`):
- `AUTH_MODE=static-token`
- `CLIENT_AUTH_TOKEN=replace-me`
- `CLIENT_ALLOWED_SCOPES=greetings:read,customers:read,math:sum,text:normalize`

Example local values:
```toml
[vars]
ENVIRONMENT = "local"
DOMAIN_A_URL = "http://127.0.0.1:8788"
DOMAIN_B_URL = "http://127.0.0.1:8789"
ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
```

## Run locally
```bash
pnpm install
pnpm wrangler dev
```

## Health check
```bash
curl -s http://127.0.0.1:8787/health
```

## REST tool discovery
```bash
curl -s http://127.0.0.1:8787/tools \
  -H "Authorization: Bearer replace-me"
```

## REST tool call (valid scope)
```bash
curl -s -X POST http://127.0.0.1:8787/tools/sum/call \
  -H "Authorization: Bearer replace-me" \
  -H "content-type: application/json" \
  -H "x-tenant-id: tenant-1" \
  -H "x-actor-id: user-1" \
  -d '{"arguments":{"a":5,"b":7}}'
```

## REST tool call (missing scope)
```bash
curl -s -X POST http://127.0.0.1:8787/tools/list-top-customers/call \
  -H "Authorization: Bearer replace-me" \
  -H "content-type: application/json" \
  -d '{"arguments":{"limit":3}}'
```
Expected: canonical `SCOPE_MISSING` error payload.

## MCP tools/list
```bash
curl -s -X POST http://127.0.0.1:8787/mcp \
  -H "Authorization: Bearer replace-me" \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

## MCP tools/call
```bash
curl -s -X POST http://127.0.0.1:8787/mcp \
  -H "Authorization: Bearer replace-me" \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"normalize-text","arguments":{"text":"  Hello   WORLD  "}}}'
```

## Origin validation checks
Allowed origin:
```bash
curl -s -X POST http://127.0.0.1:8787/mcp \
  -H "Authorization: Bearer replace-me" \
  -H "content-type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"jsonrpc":"2.0","id":"3","method":"tools/list","params":{}}'
```

Disallowed origin (expect `FORBIDDEN`):
```bash
curl -s -X POST http://127.0.0.1:8787/mcp \
  -H "Authorization: Bearer replace-me" \
  -H "content-type: application/json" \
  -H "Origin: http://evil.example" \
  -d '{"jsonrpc":"2.0","id":"4","method":"tools/list","params":{}}'
```

## Negative-path verification matrix

Missing token (expect `FORBIDDEN`):
```bash
curl -s http://127.0.0.1:8787/tools
```

Invalid token (expect `FORBIDDEN`):
```bash
curl -s http://127.0.0.1:8787/tools \
  -H "Authorization: Bearer wrong-token"
```

Unsupported MCP method (expect `METHOD_NOT_SUPPORTED`):
```bash
curl -s -X POST http://127.0.0.1:8787/mcp \
  -H "Authorization: Bearer replace-me" \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":"bad-method","method":"foo/bar","params":{}}'
```

Oversized input simulation (expect `VALIDATION_ERROR` when limit exceeded):
```bash
curl -s -X POST http://127.0.0.1:8787/tools/sum/call \
  -H "Authorization: Bearer replace-me" \
  -H "content-type: application/json" \
  -d '{"arguments":{"a":1,"b":2,"blob":"<very-large-string>"}}'
```

Upstream timeout/error simulation (expect `UPSTREAM_ERROR`):
```bash
curl -s -X POST http://127.0.0.1:8787/tools/sum/call \
  -H "Authorization: Bearer replace-me" \
  -H "content-type: application/json" \
  -d '{"arguments":{"a":1,"b":2,"simulate_upstream_error":true}}'
```

## E2E local run

Run e2e against live gateway + domain workers:

```bash
$env:E2E_GATEWAY_BASE_URL="http://127.0.0.1:8787"
$env:E2E_CLIENT_TOKEN="replace-me"
pnpm test:e2e
```

`tests/e2e/local-gateway.e2e.test.ts` validates:
- tool catalog includes all four tools
- routing can execute one Domain A call and one Domain B call
- unknown tool returns canonical `TOOL_NOT_FOUND`

## Test strategy entry points
- Contract tests: verify `tools/list` and `tools/call` envelopes and content.
- Validation tests: missing scopes, invalid input, invalid tool name, origin policy behavior.
- Snapshot tests: canonical MCP error payload format and stable `error_code` mapping.
- E2E: local script/curl sequence with gateway + two domain workers running.

## Verification status

Latest local verification:
- `pnpm test` -> pass
- `pnpm test:contract` -> pass
- `pnpm test:validation` -> pass
- `pnpm test:e2e` -> pass (local env-gated test is skipped unless E2E env vars are set)
