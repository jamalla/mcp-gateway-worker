# MCP Gateway Worker

Cloudflare Worker gateway that exposes MCP-compatible JSON-RPC (`/mcp`) and REST test endpoints (`/tools`, `/tools/:name/call`) over a single unified tool registry.

## Live deployment

- Worker URL: `https://mcp-gateway-worker.to-jamz.workers.dev`
- MCP endpoint: `https://mcp-gateway-worker.to-jamz.workers.dev/mcp`

## Setup

```bash
pnpm install
pnpm wrangler secret put DOMAIN_SHARED_SECRET
pnpm dev
```

## Build and verify

```bash
pnpm install
pnpm build
pnpm test
```

Targeted suites:

```bash
pnpm test:contract
pnpm test:validation
pnpm test:e2e
```

## Deploy to Cloudflare

```bash
pnpm wrangler login
pnpm wrangler secret put DOMAIN_SHARED_SECRET
pnpm wrangler deploy
```

Production checklist before deploy:

- Replace local values in `wrangler.toml` (`DOMAIN_A_URL`, `DOMAIN_B_URL`, `ALLOWED_ORIGINS`).
- Replace `CLIENT_AUTH_TOKEN` and set least-privilege `CLIENT_ALLOWED_SCOPES`.
- Confirm upstream domain workers are reachable from Cloudflare.

## Environment and secrets

`wrangler.toml` local vars:

- `ENVIRONMENT`
- `DOMAIN_A_URL`
- `DOMAIN_B_URL`
- `ALLOWED_ORIGINS`
- `AUTH_MODE`
- `CLIENT_AUTH_TOKEN`
- `CLIENT_ALLOWED_SCOPES`
- `UPSTREAM_TIMEOUT_MS`
- `REQUEST_BODY_MAX_BYTES`
- `TOOL_ARGUMENT_MAX_BYTES`

Required secret:

- `DOMAIN_SHARED_SECRET`

## Authentication model

- Client -> Gateway: `Authorization: Bearer <CLIENT_AUTH_TOKEN>` (static-token mode).
- Gateway -> Domain workers: `Authorization: Bearer <DOMAIN_SHARED_SECRET>`.
- Trusted scopes source: `CLIENT_ALLOWED_SCOPES` (gateway does not trust raw scope headers directly for authorization).

## Trust boundary

- Gateway is the policy enforcement boundary for auth, scope checks, origin checks, and canonical error mapping.
- Domain workers are upstream execution targets and are treated as untrusted for response shape (gateway validates upstream payloads).

## Guardrails

- Origin checks apply only when an `Origin` header is present.
- Request and argument size limits are centralized via env-backed limits.
- Upstream calls use timeout/retry handling and normalize exceptions to canonical `UPSTREAM_ERROR`.

## Endpoints

- `GET /health` -> `{ "status": "ok", "environment": "..." }`
- `GET /tools` -> unified tool catalog
- `POST /tools/:name/call` -> REST tool invocation
- `POST /mcp` -> MCP JSON-RPC (`tools/list`, `tools/call`)

## Use this MCP from any IDE

Any IDE/editor MCP client that supports HTTP/JSON-RPC can connect to this endpoint:

- URL: `https://mcp-gateway-worker.to-jamz.workers.dev/mcp`
- Method: `POST`
- Header: `Authorization: Bearer <CLIENT_AUTH_TOKEN>`
- Header: `Content-Type: application/json`

Generic MCP client config shape:

```json
{
	"mcpServers": {
		"mcp-gateway-worker": {
			"transport": "http",
			"url": "https://mcp-gateway-worker.to-jamz.workers.dev/mcp",
			"headers": {
				"Authorization": "Bearer <CLIENT_AUTH_TOKEN>"
			}
		}
	}
}
```

Quick connectivity test:

```bash
curl -s -X POST https://mcp-gateway-worker.to-jamz.workers.dev/mcp \
	-H "Authorization: Bearer <CLIENT_AUTH_TOKEN>" \
	-H "content-type: application/json" \
	-d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

If your IDE uses a different MCP schema (for example command-based wrappers), map it to the same HTTP endpoint and headers above.

### IDE-specific examples

The exact file path/key name can vary by IDE version, but these templates are the common setup patterns.

#### VS Code (MCP extension/client)

`settings.json` example:

```json
{
	"mcp.servers": {
		"mcp-gateway-worker": {
			"transport": "http",
			"url": "https://mcp-gateway-worker.to-jamz.workers.dev/mcp",
			"headers": {
				"Authorization": "Bearer <CLIENT_AUTH_TOKEN>"
			}
		}
	}
}
```

#### Cursor

`.cursor/mcp.json` example:

```json
{
	"mcpServers": {
		"mcp-gateway-worker": {
			"transport": "http",
			"url": "https://mcp-gateway-worker.to-jamz.workers.dev/mcp",
			"headers": {
				"Authorization": "Bearer <CLIENT_AUTH_TOKEN>"
			}
		}
	}
}
```

#### Windsurf

MCP config example:

```json
{
	"mcpServers": {
		"mcp-gateway-worker": {
			"transport": "http",
			"url": "https://mcp-gateway-worker.to-jamz.workers.dev/mcp",
			"headers": {
				"Authorization": "Bearer <CLIENT_AUTH_TOKEN>"
			}
		}
	}
}
```

#### JetBrains AI Assistant / IDE MCP client

MCP server entry example:

```json
{
	"name": "mcp-gateway-worker",
	"transport": "http",
	"url": "https://mcp-gateway-worker.to-jamz.workers.dev/mcp",
	"headers": {
		"Authorization": "Bearer <CLIENT_AUTH_TOKEN>"
	}
}
```

If your IDE only supports command-based MCP launchers, create a tiny local proxy/wrapper that forwards to this HTTP endpoint with the same `Authorization` header.

## Examples

```bash
curl -s http://127.0.0.1:8787/health
```

```bash
curl -s http://127.0.0.1:8787/tools \
	-H "Authorization: Bearer replace-me"
```

```bash
curl -s -X POST http://127.0.0.1:8787/tools/sum/call \
	-H "Authorization: Bearer replace-me" \
	-H "content-type: application/json" \
	-d '{"arguments":{"a":5,"b":7}}'
```

```bash
curl -s -X POST http://127.0.0.1:8787/mcp \
	-H "Authorization: Bearer replace-me" \
	-H "content-type: application/json" \
	-d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

## Compatibility guard policy

- Canonical MCP error payloads are treated as compatibility contracts.
- `tests/contract/mcp-errors.snapshot.test.ts` enforces stable `error.code`, `error.data.error_code`, and snapshot shape.
- Breaking payload changes require explicit contract/versioning updates and corresponding test updates.

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm test:contract`
- `pnpm test:validation`
- `pnpm test:e2e`
- `pnpm test:snapshots`
